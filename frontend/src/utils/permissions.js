/**
 * Utilidades centralizadas para verificación de permisos
 * Uso: import { isUserAdmin, canUserEdit } from '../utils/permissions';
 */

/**
 * Obtiene el usuario actual del localStorage
 * @returns {Object} Usuario actual o objeto vacío
 */
export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

/**
 * Verifica si el usuario actual es administrador
 * Unifica todas las formas de verificar admin en el sistema
 * @param {Object} user - Usuario opcional, si no se pasa usa getCurrentUser()
 * @returns {boolean}
 */
export const isUserAdmin = (user = null) => {
  const u = user || getCurrentUser();
  return (
    u.systemRole === 'admin' ||
    u.userType === 'super_admin' ||
    u.role === 'admin' ||
    u.role === 'Admin' ||
    u.role === 'Administrador' ||
    u.role === 'superadmin'
  );
};

/**
 * Verifica si el usuario es Super Admin
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const isSuperAdmin = (user = null) => {
  const u = user || getCurrentUser();
  return u.userType === 'super_admin';
};

/**
 * Verifica si el usuario puede editar un módulo
 * @param {string} module - ID del módulo (8d, ecr, mrb, audits, clients, defects, workload, quality_alert)
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const canUserEdit = (module, user = null) => {
  const u = user || getCurrentUser();

  // Admin siempre puede editar
  if (isUserAdmin(u)) return true;

  // Super admin (all_modules: full)
  if (u.permissions?.all_modules === 'full') return true;

  // Get module access
  const moduleAccess = u.permissions?.[module]?.access || u.permissions?.[module];

  // If no permissions object, fallback to clearance level
  if (!u.permissions) {
    return (u.clearanceLevel || 0) >= 2;
  }

  // view or none = cannot edit
  if (moduleAccess === 'view' || moduleAccess === 'none') {
    return false;
  }

  // full or partial = can edit
  if (moduleAccess === 'full' || moduleAccess === 'partial') {
    return true;
  }

  // No specific permission, check clearance level
  return (u.clearanceLevel || 0) >= 3;
};

/**
 * Verifica si el usuario puede aprobar (no puede aprobar lo que creó)
 * @param {number} createdById - ID del creador del registro
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const canUserApprove = (createdById, user = null) => {
  const u = user || getCurrentUser();

  // No puede aprobar lo que creó
  if (u.id === createdById) return false;

  return true;
};

/**
 * Verifica si el usuario tiene acceso a un módulo
 * @param {string} module - ID del módulo
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const hasModuleAccess = (module, user = null) => {
  const u = user || getCurrentUser();

  // Admin tiene acceso a todo
  if (isUserAdmin(u)) return true;

  // Super admin
  if (u.permissions?.all_modules === 'full') return true;

  // Get module access
  const moduleAccess = u.permissions?.[module]?.access || u.permissions?.[module];

  // none = no access
  if (moduleAccess === 'none') {
    return false;
  }

  // view, partial, full = has access
  if (moduleAccess) {
    return true;
  }

  // No permissions defined, allow by default
  return !!u.id;
};

/**
 * Verifica si el usuario tiene acceso de solo lectura a un módulo
 * @param {string} module - ID del módulo
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const isReadOnly = (module, user = null) => {
  const u = user || getCurrentUser();

  // Admin nunca es read-only
  if (isUserAdmin(u)) return false;

  // Super admin nunca es read-only
  if (u.permissions?.all_modules === 'full') return false;

  // Get module access
  const moduleAccess = u.permissions?.[module]?.access || u.permissions?.[module];

  // view = read only
  return moduleAccess === 'view';
};

/**
 * Verifica si el usuario está en una lista de usuarios autorizados
 * @param {Array} authorizedUsers - Array de IDs de usuarios autorizados
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const isUserInList = (authorizedUsers, user = null) => {
  const u = user || getCurrentUser();

  if (!authorizedUsers || !Array.isArray(authorizedUsers)) return false;

  return authorizedUsers.includes(u.id);
};

/**
 * Verifica si el usuario es el aprobador actual en un flujo de aprobación
 * @param {Object} data - Datos del registro con escalationPath
 * @param {string} userListKey - Clave del array de usuarios (ej: 'countermeasure_users')
 * @param {string} stepKey - Clave del paso actual (ej: 'd4CurrentApprovalStep')
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const isCurrentApprover = (data, userListKey, stepKey, user = null) => {
  const u = user || getCurrentUser();

  // Admin puede aprobar cualquier cosa
  if (isUserAdmin(u)) return true;

  if (!data) return false;

  const escalationPath = data.escalationPath || data.escalation_path;
  if (!escalationPath) return false;

  const userList = escalationPath[userListKey] ||
                   escalationPath[toCamelCase(userListKey)] ||
                   escalationPath[toSnakeCase(userListKey)];

  if (!userList || !Array.isArray(userList)) return false;

  const currentStep = data[stepKey] ||
                      data[toCamelCase(stepKey)] ||
                      data[toSnakeCase(stepKey)] || 0;

  if (currentStep < 1 || currentStep > userList.length) return false;

  const expectedApproverId = userList[currentStep - 1]; // Arrays are 0-indexed
  return u.id === expectedApproverId;
};

/**
 * Verifica si el usuario es el responsable primario
 * @param {Object} data - Datos del registro
 * @param {string} userListKey - Clave del array de usuarios
 * @param {Object} user - Usuario opcional
 * @returns {boolean}
 */
export const isPrimaryResponsible = (data, userListKey, user = null) => {
  const u = user || getCurrentUser();

  if (!data) return false;

  const escalationPath = data.escalationPath || data.escalation_path;
  if (!escalationPath) return false;

  const userList = escalationPath[userListKey] ||
                   escalationPath[toCamelCase(userListKey)] ||
                   escalationPath[toSnakeCase(userListKey)];

  if (!userList || !Array.isArray(userList)) return false;

  const primaryUserId = userList[0];
  return u.id === primaryUserId;
};

// Helpers para conversión de case
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export default {
  getCurrentUser,
  isUserAdmin,
  isSuperAdmin,
  canUserEdit,
  canUserApprove,
  hasModuleAccess,
  isReadOnly,
  isUserInList,
  isCurrentApprover,
  isPrimaryResponsible
};
