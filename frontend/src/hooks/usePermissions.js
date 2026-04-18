import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

/**
 * Hook para manejar permisos del usuario actual
 * Carga los permisos efectivos y provee funciones de verificación
 */
export const usePermissions = () => {
  const [permissions, setPermissions] = useState({});
  const [clearanceLevel, setClearanceLevel] = useState(1);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener usuario del localStorage (memoizado)
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Verificar si es admin (systemRole o userType)
  const isAdmin = useMemo(() => {
    return user.systemRole === 'admin' ||
           user.userType === 'super_admin' ||
           user.role === 'admin' ||
           user.role === 'Admin' ||
           user.role === 'Administrador';
  }, [user]);

  // Verificar si es super admin
  const isSuperAdmin = useMemo(() => {
    return user.userType === 'super_admin';
  }, [user]);

  // Cargar permisos al montar
  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      if (!user.id) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/users/${user.id}/permissions`);

      if (response.data.success) {
        setPermissions(response.data.permissions || {});
        setClearanceLevel(response.data.clearanceLevel || 1);
      }

      // También cargar los roles del usuario
      const rolesResponse = await api.get(`/users/${user.id}/roles`);
      if (rolesResponse.data.success) {
        setRoles(rolesResponse.data.roles || []);
      }

    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err.message);

      // Fallback: si es admin, dar acceso completo
      if (isAdmin) {
        setPermissions({ all_modules: { access: 'full' } });
        setClearanceLevel(4);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica si el usuario tiene acceso a un módulo
   * @param {string} module - ID del módulo (8d, quality_alert, mrb, etc.)
   * @param {string} accessLevel - Nivel requerido: 'view', 'partial', 'full'
   * @returns {boolean}
   */
  const hasAccess = useCallback((module, accessLevel = 'view') => {
    // Admin siempre tiene acceso
    if (isAdmin) return true;

    // Verificar acceso global
    if (permissions.all_modules?.access === 'full') return true;

    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    const accessOrder = { none: 0, view: 1, partial: 2, full: 3 };
    const userLevel = accessOrder[modulePerms.access] || 0;
    const requiredLevel = accessOrder[accessLevel] || 1;

    return userLevel >= requiredLevel;
  }, [permissions, isAdmin]);

  /**
   * Verifica si el usuario puede realizar una acción específica
   * @param {string} module - ID del módulo
   * @param {string} action - Acción: 'create', 'edit', 'delete', 'approve', etc.
   * @returns {boolean}
   */
  const canPerform = useCallback((module, action) => {
    if (isAdmin) return true;

    if (permissions.all_modules?.access === 'full') return true;

    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    // Si tiene acceso full, puede todo
    if (modulePerms.access === 'full') return true;

    // Verificar en lista de acciones
    if (modulePerms.actions && Array.isArray(modulePerms.actions)) {
      return modulePerms.actions.includes(action);
    }

    return false;
  }, [permissions, isAdmin]);

  /**
   * Verifica si el usuario tiene acceso a una sección específica de un módulo
   * @param {string} module - ID del módulo
   * @param {string} section - ID de la sección (creation, analysis, closure)
   * @returns {boolean}
   */
  const hasSection = useCallback((module, section) => {
    if (isAdmin) return true;

    if (permissions.all_modules?.access === 'full') return true;

    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    if (modulePerms.access === 'full') return true;

    if (modulePerms.sections) {
      return modulePerms.sections[section] === true;
    }

    return false;
  }, [permissions, isAdmin]);

  /**
   * Verifica el nivel de clearance
   * @param {number} requiredLevel - Nivel requerido (1-4)
   * @returns {boolean}
   */
  const hasClearance = useCallback((requiredLevel) => {
    if (isAdmin) return true;
    return clearanceLevel >= requiredLevel;
  }, [clearanceLevel, isAdmin]);

  /**
   * Obtiene los módulos a los que el usuario tiene acceso
   * @returns {string[]} - Array de IDs de módulos
   */
  const getAccessibleModules = useCallback(() => {
    const allModules = ['8d', 'quality_alert', 'mrb', 'ecr', 'audits', 'defects', 'clients', 'workload', 'users'];

    if (isAdmin) {
      return allModules;
    }

    if (permissions.all_modules?.access === 'full') {
      return allModules;
    }

    return Object.keys(permissions).filter(module => {
      const perms = permissions[module];
      return perms && perms.access && perms.access !== 'none';
    });
  }, [permissions, isAdmin]);

  /**
   * Verifica si tiene un rol específico
   * @param {string} roleName - Nombre del rol
   * @returns {boolean}
   */
  const hasRole = useCallback((roleName) => {
    return roles.some(r =>
      r.name?.toLowerCase() === roleName.toLowerCase() && r.isActive
    );
  }, [roles]);

  /**
   * Verifica si el usuario puede aprobar (no es el creador del registro)
   * @param {number} createdById - ID del usuario que creó el registro
   * @returns {boolean}
   */
  const canApprove = useCallback((createdById) => {
    // No puede aprobar lo que creó
    if (user.id === createdById) return false;
    // Debe tener permiso de aprobar
    return true; // El módulo específico debe verificar el permiso
  }, [user.id]);

  return {
    // Estado
    permissions,
    clearanceLevel,
    roles,
    loading,
    error,
    user,

    // Flags rápidos
    isAdmin,
    isSuperAdmin,

    // Funciones de verificación
    hasAccess,
    canPerform,
    hasSection,
    hasClearance,
    hasRole,
    canApprove,
    getAccessibleModules,

    // Utilidades
    reload: loadPermissions
  };
};

export default usePermissions;
