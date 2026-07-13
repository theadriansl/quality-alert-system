/**
 * Permission Middleware - Two-Layer Permission System
 *
 * LAYER 1: System Permission (view/full per module)
 * LAYER 2: Specific Role (inspector/repairer/releaser for hospital)
 *
 * Both layers must pass for write access
 */

const { query } = require('../config/database');

// Map routes to module names (as defined in roles.permissions)
const ROUTE_TO_MODULE = {
  // 8D Module
  '/8d': '8d',
  '/eightd': '8d',
  '/api/8d': '8d',
  '/d7': '8d',
  '/lessons': '8d',
  '/approvals': '8d',
  '/approval': '8d',
  '/distribution': '8d',
  '/team': '8d',
  '/bom': '8d',

  // ECR Module
  '/ecr': 'ecr',
  '/api/ecr': 'ecr',

  // MRB Module
  '/mrb': 'mrb',

  // Audit Module
  '/audit': 'audits',
  '/api/audit': 'audits',

  // Clients Module
  '/clients': 'clients',
  '/client-parts': 'clients',
  '/client-contacts': 'clients',
  '/client-documents': 'clients',
  '/projects': 'clients',

  // Defects Module (includes defects-v2)
  '/defects': 'defects',
  '/defect': 'defects',
  '/defects-v2': 'defects',
  '/inspection': 'defects',

  // Workload Module
  '/workload': 'workload',

  // Quality Alert Module
  '/quality-alert': 'quality_alert',
  '/qar': 'quality_alert',

  // Hospital Module (mapped to defects for system permission)
  '/hospital': 'defects'
};

// Routes that require specific hospital roles (Layer 2)
// Format: route pattern -> required role(s)
const HOSPITAL_ROLE_ROUTES = {
  // Defect capture requires inspector role
  '/defects-v2/entries': ['inspector', 'admin'],
  '/defects-v2/capture': ['inspector', 'admin'],
  '/defects-v2/from-spec': ['inspector', 'admin'],

  // Repair operations require repairer role
  '/defects-v2/entries/*/repair': ['repairer', 'admin'],
  '/defects-v2/entries/*/start-repair': ['repairer', 'admin'],
  '/defects-v2/entries/*/complete-repair': ['repairer', 'admin'],
  '/defects-v2/repair': ['repairer', 'admin'],

  // Release operations require releaser/admin role
  '/defects-v2/entries/*/release': ['releaser', 'admin'],
  '/defects-v2/entries/*/approve': ['releaser', 'admin'],
  '/defects-v2/release': ['releaser', 'admin'],

  // Quarantine/Scrap require admin
  '/defects-v2/entries/*/quarantine': ['repairer', 'admin'],
  '/defects-v2/entries/*/scrap': ['repairer', 'admin'],
  '/defects-v2/quarantine': ['admin'],
  '/defects-v2/scrap': ['admin'],

  // Handoff requires repairer or admin
  '/defects-v2/handoff': ['repairer', 'admin']
};

// Routes that should bypass permission check (auth, health, static, etc.)
const BYPASS_ROUTES = [
  '/auth',
  '/health',
  '/uploads',
  '/users/me',
  '/users/profile',
  '/roles',
  '/departments',
  '/hospital-roles/check',  // Allow checking own permissions
  '/inspection-catalogs',   // Allow reading catalogs
  '/qar/check-threshold',   // Internal system check after defect capture
  '/qar/decline'            // Internal system operation
];

// Methods that require write permission
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Get the module name from a request path
 */
function getModuleFromPath(path) {
  const normalizedPath = path.toLowerCase();

  for (const [routePrefix, moduleName] of Object.entries(ROUTE_TO_MODULE)) {
    if (normalizedPath.startsWith(routePrefix)) {
      return moduleName;
    }
  }

  return null;
}

/**
 * Check if route should bypass permission check
 */
function shouldBypass(path) {
  const normalizedPath = path.toLowerCase();
  return BYPASS_ROUTES.some(route => normalizedPath.startsWith(route));
}

/**
 * Check if route requires a specific hospital role
 * Returns: { required: boolean, roles: string[] | null }
 */
function getRequiredHospitalRole(path) {
  const normalizedPath = path.toLowerCase();

  for (const [routePattern, roles] of Object.entries(HOSPITAL_ROLE_ROUTES)) {
    // Convert pattern to regex (replace * with wildcard)
    const regexPattern = routePattern.replace(/\*/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}`, 'i');

    if (regex.test(normalizedPath)) {
      return { required: true, roles };
    }
  }

  return { required: false, roles: null };
}

/**
 * Access level hierarchy (higher index = more permissive)
 */
const ACCESS_HIERARCHY = ['none', 'view', 'partial', 'full'];

/**
 * Get most permissive access level
 */
function getMostPermissiveAccess(access1, access2) {
  const idx1 = ACCESS_HIERARCHY.indexOf(access1 || 'none');
  const idx2 = ACCESS_HIERARCHY.indexOf(access2 || 'none');
  return ACCESS_HIERARCHY[Math.max(idx1, idx2)];
}

/**
 * Merge sections - true wins over false
 */
function mergeSections(sections1, sections2) {
  const merged = { ...sections1 };
  for (const key in sections2) {
    if (sections2[key] === true || merged[key] !== true) {
      merged[key] = sections2[key] === true ? true : (merged[key] || sections2[key]);
    }
  }
  return merged;
}

/**
 * Combine permissions from multiple roles (most permissive wins)
 */
function combinePermissions(rolesArray) {
  const combined = {};

  for (const role of rolesArray) {
    const perms = role.permissions || {};

    for (const module in perms) {
      const modulePerms = perms[module];

      if (!combined[module]) {
        combined[module] = { ...modulePerms };
      } else {
        // Get access levels
        const currentAccess = combined[module].access || combined[module];
        const newAccess = modulePerms.access || modulePerms;

        // If it's a simple string value
        if (typeof modulePerms === 'string') {
          combined[module] = getMostPermissiveAccess(
            typeof combined[module] === 'string' ? combined[module] : combined[module].access,
            modulePerms
          );
        } else {
          // It's an object with access and possibly sections
          combined[module].access = getMostPermissiveAccess(currentAccess, newAccess);

          // Merge sections if present
          if (modulePerms.sections) {
            combined[module].sections = mergeSections(
              combined[module].sections || {},
              modulePerms.sections
            );
          }
        }
      }
    }
  }

  return combined;
}

/**
 * Get user's system permissions from database
 * Combines permissions from ALL active roles (most permissive wins)
 */
async function getUserPermissions(userId) {
  try {
    const result = await query(`
      SELECT r.permissions, r.clearance_level, r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.is_active = true
      ORDER BY r.clearance_level DESC
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    // Get max clearance level
    const maxClearance = Math.max(...result.rows.map(r => r.clearance_level || 0));

    // Get role names
    const roleNames = result.rows.map(r => r.role_name).join(', ');

    // Combine permissions from all roles
    const combinedPermissions = combinePermissions(result.rows);

    return {
      permissions: combinedPermissions,
      clearance_level: maxClearance,
      role_name: roleNames
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return null;
  }
}

/**
 * Get user's hospital roles from database
 */
async function getUserHospitalRoles(userId) {
  try {
    const result = await query(`
      SELECT hospital_role
      FROM hospital_user_roles
      WHERE user_id = $1 AND is_active = true
    `, [userId]);

    return result.rows.map(r => r.hospital_role);
  } catch (error) {
    console.error('Error fetching hospital roles:', error);
    return [];
  }
}

/**
 * Check if user is a system admin
 */
async function isSystemAdmin(userId) {
  try {
    const result = await query(`
      SELECT system_role, user_type FROM users WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) return false;

    const user = result.rows[0];
    return user.system_role === 'admin' || user.user_type === 'super_admin';
  } catch (error) {
    return false;
  }
}

/**
 * Main permission middleware - Two Layer System
 */
const checkWritePermission = async (req, res, next) => {
  // Skip for non-write methods
  if (!WRITE_METHODS.includes(req.method)) {
    return next();
  }

  const fullPath = req.originalUrl || req.path;
  console.log(`🔐 Permission check: ${req.method} ${fullPath} - User: ${req.user?.id}`);

  // Skip bypass routes
  if (shouldBypass(fullPath)) {
    console.log(`🔓 Bypassed route: ${fullPath}`);
    return next();
  }

  // Must have authenticated user
  if (!req.user || !req.user.id) {
    console.log(`⚠️ No user in request, skipping permission check`);
    return next();
  }

  const userId = req.user.id;

  // Check if system admin (bypasses all)
  if (await isSystemAdmin(userId)) {
    console.log(`👑 System admin bypass for user ${userId}`);
    return next();
  }

  // Get module from path
  const module = getModuleFromPath(fullPath);
  console.log(`📦 Module detected: ${module} for path: ${fullPath}`);

  if (!module) {
    return next();
  }

  // =========================================================================
  // LAYER 1: System Permission Check
  // =========================================================================
  const userRole = await getUserPermissions(userId);

  if (!userRole) {
    console.log(`⛔ LAYER 1 DENIED: User ${userId} has no system role assigned`);
    return res.status(403).json({
      success: false,
      message: 'No tienes un rol de sistema asignado. Contacta al administrador.',
      code: 'NO_SYSTEM_ROLE'
    });
  }

  // Check for super admin permission
  if (userRole.permissions?.all_modules === 'full') {
    return next();
  }

  // Get access level for this module
  const moduleAccess = userRole.permissions?.[module]?.access || userRole.permissions?.[module];

  // Check system permission for module
  if (!moduleAccess) {
    if (userRole.clearance_level >= 3) {
      // High clearance passes Layer 1
    } else {
      console.log(`⛔ LAYER 1 DENIED: User ${userId} (${userRole.role_name}) no permission for module '${module}'`);
      return res.status(403).json({
        success: false,
        message: `No tienes acceso al módulo ${module}. Contacta al administrador.`,
        code: 'NO_MODULE_ACCESS'
      });
    }
  } else if (moduleAccess === 'view' || moduleAccess === 'none') {
    console.log(`⛔ LAYER 1 DENIED: User ${userId} (${userRole.role_name}) has '${moduleAccess}' access - write blocked`);
    return res.status(403).json({
      success: false,
      message: 'Solo tienes acceso de consulta. No puedes realizar modificaciones en este módulo.',
      code: 'READ_ONLY_ACCESS'
    });
  } else if (moduleAccess === 'partial') {
    // Check granular section permissions for partial access
    const sections = userRole.permissions?.[module]?.sections || {};

    // For defects module, check capture permission for write operations
    if (module === 'defects') {
      const isCaptureOperation = fullPath.includes('/entries') && req.method === 'POST' && !fullPath.includes('/attachments');

      if (isCaptureOperation && !sections.capture) {
        console.log(`⛔ LAYER 1 DENIED: User ${userId} (${userRole.role_name}) has partial access but capture=false`);
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para capturar defectos. Solo puedes consultar.',
          code: 'NO_CAPTURE_PERMISSION'
        });
      }
    }
  }

  console.log(`✅ LAYER 1 PASSED: System permission OK for module '${module}'`);

  // =========================================================================
  // LAYER 2: Hospital/Inspection Role Check (if required)
  // =========================================================================
  const hospitalRoleReq = getRequiredHospitalRole(fullPath);

  if (hospitalRoleReq.required) {
    console.log(`🏥 LAYER 2: Route requires hospital role: ${hospitalRoleReq.roles.join(' or ')}`);

    const userHospitalRoles = await getUserHospitalRoles(userId);
    console.log(`👤 User hospital roles: ${userHospitalRoles.join(', ') || 'none'}`);

    // Check if user has any of the required roles
    const hasRequiredRole = hospitalRoleReq.roles.some(role =>
      userHospitalRoles.includes(role)
    );

    if (!hasRequiredRole) {
      const roleNames = {
        'inspector': 'Inspector',
        'repairer': 'Reparador',
        'releaser': 'Liberador',
        'admin': 'Administrador de Hospital'
      };

      const requiredRoleNames = hospitalRoleReq.roles
        .map(r => roleNames[r] || r)
        .join(' o ');

      console.log(`⛔ LAYER 2 DENIED: User ${userId} missing hospital role. Required: ${hospitalRoleReq.roles.join(' or ')}, Has: ${userHospitalRoles.join(', ') || 'none'}`);

      return res.status(403).json({
        success: false,
        message: `No tienes el rol de ${requiredRoleNames} asignado. Solicita el rol en Hospital de Defectos > Configuración.`,
        code: 'NO_HOSPITAL_ROLE',
        requiredRoles: hospitalRoleReq.roles,
        userRoles: userHospitalRoles
      });
    }

    console.log(`✅ LAYER 2 PASSED: Hospital role OK`);
  }

  // Both layers passed
  next();
};

/**
 * Middleware to attach user permissions to request (for frontend use)
 */
const attachUserPermissions = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next();
  }

  const userRole = await getUserPermissions(req.user.id);
  const hospitalRoles = await getUserHospitalRoles(req.user.id);

  if (userRole) {
    req.userPermissions = userRole.permissions;
    req.userClearanceLevel = userRole.clearance_level;
    req.userRoleName = userRole.role_name;
  }

  req.userHospitalRoles = hospitalRoles;

  next();
};

module.exports = {
  checkWritePermission,
  attachUserPermissions,
  getUserPermissions,
  getUserHospitalRoles,
  getModuleFromPath,
  getRequiredHospitalRole,
  ROUTE_TO_MODULE,
  HOSPITAL_ROLE_ROUTES
};
