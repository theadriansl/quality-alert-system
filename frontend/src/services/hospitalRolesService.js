/**
 * Hospital Roles Service
 * Maneja los roles secundarios para el módulo Hospital de Defectos
 */

const API_URL = 'http://localhost:5000';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

/**
 * Obtener todos los usuarios con sus roles de hospital
 */
export const getHospitalUsers = async () => {
  const res = await fetch(`${API_URL}/hospital-roles`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Obtener roles de hospital de un usuario específico
 */
export const getUserHospitalRoles = async (userId) => {
  const res = await fetch(`${API_URL}/hospital-roles/user/${userId}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Verificar permisos de hospital del usuario actual
 * Retorna: { canRepair, canRelease, isHospitalAdmin, hospitalRoles }
 */
export const checkMyHospitalPermissions = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      return {
        success: false,
        data: { canRepair: false, canRelease: false, isHospitalAdmin: false, hospitalRoles: [] }
      };
    }
    const res = await fetch(`${API_URL}/hospital-roles/check/${user.id}`, {
      headers: getHeaders()
    });
    return res.json();
  } catch (error) {
    console.error('Error checking hospital permissions:', error);
    return {
      success: false,
      data: { canRepair: false, canRelease: false, isHospitalAdmin: false, hospitalRoles: [] }
    };
  }
};

/**
 * Verificar permisos de hospital de un usuario específico
 */
export const checkUserHospitalPermissions = async (userId) => {
  const res = await fetch(`${API_URL}/hospital-roles/check/${userId}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Asignar rol de hospital a un usuario
 * @param {number} userId - ID del usuario
 * @param {string} hospitalRole - 'repairer', 'inspector', o 'admin'
 * @param {number[]} assignedStations - IDs de estaciones (opcional)
 * @param {boolean} canManageRoles - Si puede gestionar roles de otros usuarios
 * @param {boolean} canManageDeviations - Si puede gestionar desviaciones
 * @param {boolean} canScrap - Si puede marcar partes como SCRAP
 * @param {boolean} canUploadProduction - Si puede subir datos de producción
 * @param {string} notes - Notas (opcional)
 */
export const assignHospitalRole = async (userId, hospitalRole, assignedStations = null, canManageRoles = false, canManageDeviations = false, canScrap = false, canUploadProduction = false, notes = null) => {
  const res = await fetch(`${API_URL}/hospital-roles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, hospitalRole, assignedStations, canManageRoles, canManageDeviations, canScrap, canUploadProduction, notes })
  });
  return res.json();
};

/**
 * Actualizar rol de hospital
 */
export const updateHospitalRole = async (id, data) => {
  const res = await fetch(`${API_URL}/hospital-roles/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

/**
 * Eliminar rol de hospital por ID
 */
export const deleteHospitalRole = async (id) => {
  const res = await fetch(`${API_URL}/hospital-roles/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Quitar rol específico de un usuario
 */
export const removeUserHospitalRole = async (userId, role) => {
  const res = await fetch(`${API_URL}/hospital-roles/user/${userId}/role/${role}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Helper: Obtener permisos desde localStorage (cache)
 * Usar cuando no se necesita consultar el servidor
 * Cache es por usuario para evitar conflictos entre sesiones
 */
export const getCachedHospitalPermissions = () => {
  try {
    // Limpiar cache viejo (sin userId) si existe
    const oldCache = localStorage.getItem('hospitalPermissions');
    if (oldCache) {
      localStorage.removeItem('hospitalPermissions');
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return null;

    const cacheKey = `hospitalPermissions_${user.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Verificar que no tenga más de 5 minutos y sea del mismo usuario
      if (data.timestamp && data.userId === user.id && Date.now() - data.timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Helper: Guardar permisos en localStorage (cache)
 * Incluye el userId para evitar conflictos entre usuarios
 */
export const cacheHospitalPermissions = (permissions) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;

    const cacheKey = `hospitalPermissions_${user.id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      ...permissions,
      userId: user.id,
      timestamp: Date.now()
    }));
  } catch {
    // Ignorar errores de localStorage
  }
};

/**
 * Helper: Limpiar cache de permisos del usuario actual
 */
export const clearHospitalPermissionsCache = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      localStorage.removeItem(`hospitalPermissions_${user.id}`);
    }
    // También limpiar cache viejo por si existe
    localStorage.removeItem('hospitalPermissions');
  } catch {
    // Ignorar errores
  }
};
