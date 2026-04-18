/**
 * BOM Field Configuration Service
 * Manages custom field definitions for BOM Global
 * ADMIN ONLY for create/update/delete operations
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Cache for field configurations
let fieldConfigCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Get all active field configurations (cached)
 * @param {boolean} forceRefresh - Force refresh from server
 * @returns {Promise<Array>} List of field configurations
 */
export const getFieldConfigs = async (forceRefresh = false) => {
  // Return cached data if valid
  if (!forceRefresh && fieldConfigCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      return fieldConfigCache;
    }
  }

  const response = await fetch(`${API_URL}/api/bom-field-config`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Error al obtener configuracion de campos');
  }

  const data = await response.json();
  fieldConfigCache = data;
  cacheTimestamp = Date.now();
  return data;
};

/**
 * Get all field configurations including inactive (admin only)
 * @returns {Promise<Array>} List of all field configurations
 */
export const getAllFieldConfigs = async () => {
  const response = await fetch(`${API_URL}/api/bom-field-config/all`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener configuracion de campos');
  }

  return response.json();
};

/**
 * Create a new field configuration (admin only)
 * @param {Object} fieldData - Field configuration data
 * @returns {Promise<Object>} Created field configuration
 */
export const createFieldConfig = async (fieldData) => {
  const response = await fetch(`${API_URL}/api/bom-field-config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(fieldData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear campo');
  }

  // Invalidate cache
  fieldConfigCache = null;
  cacheTimestamp = null;

  return response.json();
};

/**
 * Update a field configuration (admin only)
 * @param {number} id - Field configuration ID
 * @param {Object} fieldData - Field configuration data to update
 * @returns {Promise<Object>} Updated field configuration
 */
export const updateFieldConfig = async (id, fieldData) => {
  const response = await fetch(`${API_URL}/api/bom-field-config/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(fieldData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar campo');
  }

  // Invalidate cache
  fieldConfigCache = null;
  cacheTimestamp = null;

  return response.json();
};

/**
 * Delete (deactivate) a field configuration (admin only)
 * @param {number} id - Field configuration ID
 * @returns {Promise<Object>} Success message
 */
export const deleteFieldConfig = async (id) => {
  const response = await fetch(`${API_URL}/api/bom-field-config/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar campo');
  }

  // Invalidate cache
  fieldConfigCache = null;
  cacheTimestamp = null;

  return response.json();
};

/**
 * Reorder field configurations (admin only)
 * @param {Array} fieldOrders - Array of { id, displayOrder }
 * @returns {Promise<Object>} Success message
 */
export const reorderFieldConfigs = async (fieldOrders) => {
  const response = await fetch(`${API_URL}/api/bom-field-config/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fieldOrders })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al reordenar campos');
  }

  // Invalidate cache
  fieldConfigCache = null;
  cacheTimestamp = null;

  return response.json();
};

/**
 * Clear the field config cache
 * Call this when you know fields have changed
 */
export const clearCache = () => {
  fieldConfigCache = null;
  cacheTimestamp = null;
};

/**
 * Get fields for form (showInForm = true)
 * @returns {Promise<Array>} List of fields to show in forms
 */
export const getFormFields = async () => {
  const fields = await getFieldConfigs();
  return fields.filter(f => f.showInForm);
};

/**
 * Get fields for table (showInTable = true)
 * @returns {Promise<Array>} List of fields to show in table
 */
export const getTableFields = async () => {
  const fields = await getFieldConfigs();
  return fields.filter(f => f.showInTable);
};

/**
 * Get fields for Excel template (showInTemplate = true)
 * @returns {Promise<Array>} List of fields to include in Excel template
 */
export const getTemplateFields = async () => {
  const fields = await getFieldConfigs();
  return fields.filter(f => f.showInTemplate);
};

export default {
  getFieldConfigs,
  getAllFieldConfigs,
  createFieldConfig,
  updateFieldConfig,
  deleteFieldConfig,
  reorderFieldConfigs,
  clearCache,
  getFormFields,
  getTableFields,
  getTemplateFields
};
