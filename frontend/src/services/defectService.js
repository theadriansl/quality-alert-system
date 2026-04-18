// Servicio para manejar operaciones del módulo de defectos
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper para obtener headers con token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const defectService = {
  // ============================================================================
  // CATALOG TYPES
  // ============================================================================

  // Obtener todos los tipos de catálogo
  getCatalogTypes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/catalog-types`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.catalogTypes;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching catalog types:', error);
      throw error;
    }
  },

  // ============================================================================
  // CATALOG ITEMS
  // ============================================================================

  // Obtener items de catálogo por tipo
  getCatalogItemsByType: async (typeCode, parentId = null, includeInactive = false) => {
    try {
      const params = new URLSearchParams();
      if (parentId) params.append('parentId', parentId);
      if (includeInactive) params.append('includeInactive', 'true');

      const queryString = params.toString();
      const url = `${API_BASE_URL}/defects/catalog-items/${typeCode}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.items;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`Error fetching catalog items for ${typeCode}:`, error);
      throw error;
    }
  },

  // Obtener todos los items de catálogo (para admin)
  getAllCatalogItems: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/catalog-items`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.items;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching all catalog items:', error);
      throw error;
    }
  },

  // Crear item de catálogo
  createCatalogItem: async (itemData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/catalog-items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.item;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error creating catalog item:', error);
      throw error;
    }
  },

  // Actualizar item de catálogo
  updateCatalogItem: async (itemId, itemData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/catalog-items/${itemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.item;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error updating catalog item:', error);
      throw error;
    }
  },

  // Eliminar item de catálogo
  deleteCatalogItem: async (itemId, hard = false) => {
    try {
      const url = `${API_BASE_URL}/defects/catalog-items/${itemId}${hard ? '?hard=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      throw error;
    }
  },

  // Importar items de catálogo (bulk)
  importCatalogItems: async (items) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/catalog-items/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.results;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error importing catalog items:', error);
      throw error;
    }
  },

  // ============================================================================
  // DEFECT ENTRIES
  // ============================================================================

  // Obtener defectos con filtros
  getDefects: async (filters = {}) => {
    try {
      const params = new URLSearchParams();

      // Agregar filtros si existen
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.partId) params.append('partId', filters.partId);
      if (filters.mainItemId) params.append('mainItemId', filters.mainItemId);
      if (filters.subPartId) params.append('subPartId', filters.subPartId);
      if (filters.location1Id) params.append('location1Id', filters.location1Id);
      if (filters.location2Id) params.append('location2Id', filters.location2Id);
      if (filters.rankId) params.append('rankId', filters.rankId);
      if (filters.defectTypeId) params.append('defectTypeId', filters.defectTypeId);
      if (filters.priorityId) params.append('priorityId', filters.priorityId);
      if (filters.captureStationId) params.append('captureStationId', filters.captureStationId);
      if (filters.feedbackToUserId) params.append('feedbackToUserId', filters.feedbackToUserId);
      if (filters.capturedByUserId) params.append('capturedByUserId', filters.capturedByUserId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/defects/entries${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return {
          entries: data.entries,
          total: data.total,
          limit: data.limit,
          offset: data.offset
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching defects:', error);
      throw error;
    }
  },

  // Obtener un defecto por ID
  getDefectById: async (defectId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Defecto no encontrado');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.entry;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`Error fetching defect ${defectId}:`, error);
      throw error;
    }
  },

  // Crear defecto
  createDefect: async (defectData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(defectData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.entry;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error creating defect:', error);
      throw error;
    }
  },

  // Actualizar defecto
  updateDefect: async (defectId, defectData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(defectData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.entry;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error updating defect:', error);
      throw error;
    }
  },

  // Eliminar defecto
  deleteDefect: async (defectId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting defect:', error);
      throw error;
    }
  },

  // ============================================================================
  // PHOTOS
  // ============================================================================

  // Subir foto a un defecto
  uploadPhoto: async (defectId, file) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}/photos`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return {
          photo: data.photo,
          allPhotos: data.allPhotos
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  },

  // Obtener URL de foto
  getPhotoUrl: (defectId, photoId) => {
    return `${API_BASE_URL}/defects/entries/${defectId}/photos/${photoId}`;
  },

  // Eliminar foto
  deletePhoto: async (defectId, photoId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.remainingPhotos;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  },

  // ============================================================================
  // DASHBOARD / STATISTICS
  // ============================================================================

  // Obtener estadísticas del dashboard
  getDashboardStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/defects/dashboard/stats${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.stats;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // ============================================================================
  // CONFIG
  // ============================================================================

  // Obtener configuración
  getConfig: async (key) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/config/${key}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Configuración no encontrada');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.config;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`Error fetching config ${key}:`, error);
      throw error;
    }
  },

  // Actualizar configuración
  updateConfig: async (key, value) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/config/${key}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ value })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.config;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`Error updating config ${key}:`, error);
      throw error;
    }
  },

  // Obtener todas las configuraciones
  getAllConfigs: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/config`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.configs;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching all configs:', error);
      throw error;
    }
  },

  // ============================================================================
  // QUALITY ALERT LINKING
  // ============================================================================

  // Obtener defectos por Quality Alert
  getDefectsByQA: async (qaId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/by-qa/${qaId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return {
          entries: data.entries,
          count: data.count
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`Error fetching defects for QA ${qaId}:`, error);
      throw error;
    }
  },

  // Vincular defecto a Quality Alert
  linkDefectToQA: async (defectId, qualityAlertId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}/link-qa`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ qualityAlertId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.entry;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error linking defect to QA:', error);
      throw error;
    }
  },

  // Desvincular defecto de Quality Alert
  unlinkDefectFromQA: async (defectId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defects/entries/${defectId}/unlink-qa`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.entry;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error unlinking defect from QA:', error);
      throw error;
    }
  }
};

export default defectService;
