/**
 * deviationService.js
 * Servicio para gestión de desviaciones (SAE, Waivers, etc.)
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Tipos de desviación disponibles
export const DEVIATION_TYPES = [
  { value: 'SAE', label: 'SAE', color: '#3b82f6' },
  { value: 'WAIVER', label: 'Waiver', color: '#8b5cf6' },
  { value: 'CLIENT', label: 'Cliente', color: '#10b981' },
  { value: 'ENGINEERING', label: 'Ingeniería', color: '#f59e0b' },
  { value: 'OTHER', label: 'Otro', color: '#6b7280' }
];

// Status de desviación
export const DEVIATION_STATUS = [
  { value: 'ACTIVE', label: 'Activa', color: '#10b981' },
  { value: 'EXPIRED', label: 'Vencida', color: '#f59e0b' },
  { value: 'CANCELLED', label: 'Cancelada', color: '#ef4444' }
];

/**
 * Obtener lista de desviaciones con filtros
 */
export const getDeviations = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.clientId) params.append('clientId', filters.clientId);
  if (filters.status) params.append('status', filters.status);
  if (filters.type) params.append('type', filters.type);
  if (filters.search) params.append('search', filters.search);
  if (filters.projectId) params.append('projectId', filters.projectId);
  if (filters.partId) params.append('partId', filters.partId);

  const response = await fetch(`${API_URL}/deviations?${params}`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

/**
 * Obtener una desviación por ID con attachments y defectos vinculados
 */
export const getDeviationById = async (id) => {
  const response = await fetch(`${API_URL}/deviations/${id}`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

/**
 * Crear nueva desviación
 */
export const createDeviation = async (data) => {
  const response = await fetch(`${API_URL}/deviations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
};

/**
 * Actualizar desviación
 */
export const updateDeviation = async (id, data) => {
  const response = await fetch(`${API_URL}/deviations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
};

/**
 * Subir archivos a una desviación
 */
export const uploadDeviationAttachments = async (deviationId, files) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch(`${API_URL}/deviations/${deviationId}/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return response.json();
};

/**
 * Eliminar archivo de una desviación
 */
export const deleteDeviationAttachment = async (deviationId, attachmentId) => {
  const response = await fetch(`${API_URL}/deviations/${deviationId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};

/**
 * Vincular desviación a un defecto
 */
export const linkDeviationToDefect = async (deviationId, defectId, notes = '') => {
  const response = await fetch(`${API_URL}/deviations/${deviationId}/link-defect`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ defectId, notes })
  });
  return response.json();
};

/**
 * Desvincular desviación de un defecto
 */
export const unlinkDeviationFromDefect = async (deviationId, defectId) => {
  const response = await fetch(`${API_URL}/deviations/${deviationId}/unlink-defect/${defectId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};

/**
 * Obtener desviaciones vinculadas a un defecto
 */
export const getDeviationsByDefect = async (defectId) => {
  const response = await fetch(`${API_URL}/deviations/by-defect/${defectId}`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

/**
 * Obtener color del tipo de desviación
 */
export const getDeviationTypeColor = (type) => {
  const found = DEVIATION_TYPES.find(t => t.value === type);
  return found ? found.color : '#6b7280';
};

/**
 * Obtener label del tipo de desviación
 */
export const getDeviationTypeLabel = (type) => {
  const found = DEVIATION_TYPES.find(t => t.value === type);
  return found ? found.label : type;
};

/**
 * Obtener color del status
 */
export const getDeviationStatusColor = (status) => {
  const found = DEVIATION_STATUS.find(s => s.value === status);
  return found ? found.color : '#6b7280';
};

/**
 * Obtener label del status
 */
export const getDeviationStatusLabel = (status) => {
  const found = DEVIATION_STATUS.find(s => s.value === status);
  return found ? found.label : status;
};
