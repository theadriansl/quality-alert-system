// =====================================================
// ARCHIVO: backend/middleware/roleAuth.js
// Sistema de autorización por roles jerárquicos APQP
// =====================================================

const roleHierarchy = {
  'Champion': 4,      // Nivel más alto - acceso total
  'Manager': 3,       // Gestión de equipos y proyectos
  'Engineer': 2,      // Ejecución técnica
  'Technician': 1     // Nivel operativo
};

const rolePermissions = {
  'Champion': [
    'view_all_projects',
    'create_projects',
    'assign_teams',
    'approve_phases',
    'manage_users',
    'view_reports',
    'escalate_issues',
    'override_decisions'
  ],
  'Manager': [
    'view_team_projects',
    'assign_tasks',
    'approve_deliverables',
    'view_team_reports',
    'manage_team_members',
    'escalate_to_champion'
  ],
  'Engineer': [
    'view_assigned_projects',
    'submit_deliverables',
    'update_task_status',
    'collaborate_with_team',
    'escalate_to_manager'
  ],
  'Technician': [
    'view_assigned_tasks',
    'update_task_progress',
    'submit_reports',
    'request_support'
  ]
};

// Middleware de autorización por rol
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userLevel = roleHierarchy[userRole];
      const requiredLevel = roleHierarchy[requiredRole];

      if (!userLevel || !requiredLevel) {
        return res.status(400).json({
          error: 'Invalid role specified',
          userRole,
          requiredRole
        });
      }

      // El usuario debe tener el nivel requerido o superior
      if (userLevel >= requiredLevel) {
        req.userPermissions = rolePermissions[userRole];
        next();
      } else {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Role ${userRole} (level ${userLevel}) cannot access ${requiredRole} (level ${requiredLevel}) resources`,
          userRole,
          requiredRole,
          hierarchy: roleHierarchy
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Role authorization error',
        details: error.message
      });
    }
  };
};

// Middleware para verificar permisos específicos
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userPermissions = rolePermissions[userRole];

      if (userPermissions && userPermissions.includes(permission)) {
        next();
      } else {
        res.status(403).json({
          error: 'Permission denied',
          message: `Role ${userRole} does not have permission: ${permission}`,
          userPermissions,
          requiredPermission: permission
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Permission check error',
        details: error.message
      });
    }
  };
};

// Función para obtener subordinados en la jerarquía
const getSubordinateRoles = (userRole) => {
  const userLevel = roleHierarchy[userRole];
  return Object.keys(roleHierarchy).filter(role => 
    roleHierarchy[role] < userLevel
  );
};

// Función para verificar si puede gestionar a otro usuario
const canManageUser = (managerRole, targetRole) => {
  const managerLevel = roleHierarchy[managerRole];
  const targetLevel = roleHierarchy[targetRole];
  return managerLevel > targetLevel;
};

module.exports = {
  roleHierarchy,
  rolePermissions,
  requireRole,
  requirePermission,
  getSubordinateRoles,
  canManageUser
};