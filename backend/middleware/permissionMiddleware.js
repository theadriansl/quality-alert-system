/**
 * Permission Middleware - Validates write access per module
 * Blocks POST/PUT/DELETE for users with 'view' or 'none' access
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

  // Defects Module
  '/defects': 'defects',
  '/defect': 'defects',
  '/inspection': 'defects',

  // Workload Module
  '/workload': 'workload',

  // Quality Alert Module
  '/quality-alert': 'quality_alert',
  '/qar': 'quality_alert'
};

// Routes that should bypass permission check (auth, health, static, etc.)
const BYPASS_ROUTES = [
  '/auth',
  '/health',
  '/uploads',
  '/users/me',
  '/users/profile',
  '/roles',
  '/departments'
];

// Methods that require write permission
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Get the module name from a request path
 */
function getModuleFromPath(path) {
  // Normalize path
  const normalizedPath = path.toLowerCase();

  // Check each route prefix
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
 * Get user permissions from database
 */
async function getUserPermissions(userId) {
  try {
    const result = await query(`
      SELECT r.permissions, r.clearance_level, r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.is_active = true
      ORDER BY r.clearance_level DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return null;
  }
}

/**
 * Main permission middleware
 */
const checkWritePermission = async (req, res, next) => {
  // Skip for non-write methods
  if (!WRITE_METHODS.includes(req.method)) {
    return next();
  }

  // Use originalUrl to get the full path including router prefix
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
    return next(); // Let auth middleware handle this
  }

  // Get module from path
  const module = getModuleFromPath(fullPath);
  console.log(`📦 Module detected: ${module} for path: ${fullPath}`);

  if (!module) {
    // Unknown module, allow (will be handled by specific endpoint)
    return next();
  }

  // Get user permissions
  const userRole = await getUserPermissions(req.user.id);

  if (!userRole) {
    // No role assigned, deny write access
    console.log(`⛔ PERMISSION DENIED: User ${req.user.id} has no role assigned`);
    return res.status(403).json({
      success: false,
      message: 'No tienes un rol asignado. Contacta al administrador.',
      code: 'NO_ROLE_ASSIGNED'
    });
  }

  // Check for super admin (all_modules: full)
  if (userRole.permissions?.all_modules === 'full') {
    return next();
  }

  // Get access level for this module
  const moduleAccess = userRole.permissions?.[module]?.access || userRole.permissions?.[module];

  // If no specific permission for module, check clearance level
  if (!moduleAccess) {
    // High clearance (3+) can write, low clearance cannot
    if (userRole.clearance_level >= 3) {
      return next();
    }
    console.log(`⛔ PERMISSION DENIED: User ${req.user.id} (${userRole.role_name}) no permission for module '${module}'`);
    return res.status(403).json({
      success: false,
      message: `No tienes permisos para el módulo ${module}.`,
      code: 'NO_MODULE_PERMISSION'
    });
  }

  // Check if access allows writing
  if (moduleAccess === 'view' || moduleAccess === 'none') {
    console.log(`⛔ PERMISSION DENIED: User ${req.user.id} (${userRole.role_name}) has '${moduleAccess}' access to '${module}' - write blocked`);
    return res.status(403).json({
      success: false,
      message: 'Acceso de solo lectura. No puedes realizar modificaciones.',
      code: 'READ_ONLY_ACCESS'
    });
  }

  // Access is 'full' or 'partial' - allow
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

  if (userRole) {
    req.userPermissions = userRole.permissions;
    req.userClearanceLevel = userRole.clearance_level;
    req.userRoleName = userRole.role_name;
  }

  next();
};

module.exports = {
  checkWritePermission,
  attachUserPermissions,
  getUserPermissions,
  getModuleFromPath,
  ROUTE_TO_MODULE
};
