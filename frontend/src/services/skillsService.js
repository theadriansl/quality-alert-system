/**
 * Skills & Training Service
 * API calls for Skills module
 */

const API_URL = 'http://localhost:5000';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

// ============================================================================
// ESCALAS
// ============================================================================

export const getScales = async () => {
  const res = await fetch(`${API_URL}/skills/scales`, { headers: getHeaders() });
  return res.json();
};

export const createScale = async (data) => {
  const res = await fetch(`${API_URL}/skills/scales`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

// ============================================================================
// CATEGORÍAS
// ============================================================================

export const getCategories = async () => {
  const res = await fetch(`${API_URL}/skills/categories`, { headers: getHeaders() });
  return res.json();
};

export const createCategory = async (data) => {
  const res = await fetch(`${API_URL}/skills/categories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateCategory = async (id, data) => {
  const res = await fetch(`${API_URL}/skills/categories/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteCategory = async (id) => {
  const res = await fetch(`${API_URL}/skills/categories/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// HABILIDADES (DEFINITIONS)
// ============================================================================

export const getDefinitions = async (categoryId = null) => {
  const params = categoryId ? `?categoryId=${categoryId}` : '';
  const res = await fetch(`${API_URL}/skills/definitions${params}`, { headers: getHeaders() });
  return res.json();
};

export const createDefinition = async (data) => {
  const res = await fetch(`${API_URL}/skills/definitions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateDefinition = async (id, data) => {
  const res = await fetch(`${API_URL}/skills/definitions/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteDefinition = async (id) => {
  const res = await fetch(`${API_URL}/skills/definitions/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// PERFILES
// ============================================================================

export const getProfiles = async () => {
  const res = await fetch(`${API_URL}/skills/profiles`, { headers: getHeaders() });
  return res.json();
};

export const getProfile = async (id) => {
  const res = await fetch(`${API_URL}/skills/profiles/${id}`, { headers: getHeaders() });
  return res.json();
};

export const createProfile = async (data) => {
  const res = await fetch(`${API_URL}/skills/profiles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateProfileSkills = async (id, skills) => {
  const res = await fetch(`${API_URL}/skills/profiles/${id}/skills`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ skills })
  });
  return res.json();
};

// ============================================================================
// EQUIPO
// ============================================================================

export const getTeam = async () => {
  const res = await fetch(`${API_URL}/skills/team`, { headers: getHeaders() });
  return res.json();
};

// ============================================================================
// ASIGNACIONES DE USUARIO
// ============================================================================

export const getUserAssignments = async (userId) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/assignments`, { headers: getHeaders() });
  return res.json();
};

export const assignUserProfile = async (userId, profileId) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ profileId })
  });
  return res.json();
};

// Multi-perfil
export const getUserProfiles = async (userId) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/profiles`, { headers: getHeaders() });
  return res.json();
};

export const addUserProfile = async (userId, profileId, notes = '') => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/profiles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ profileId, notes })
  });
  return res.json();
};

export const removeUserProfile = async (userId, profileId) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/profiles/${profileId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

// Historial para gráfica
export const getUserHistoryChart = async (userId) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/history-chart`, { headers: getHeaders() });
  return res.json();
};

// Historial completo de capacitaciones (CV)
export const getUserTrainingHistory = async (userId) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/training-history`, { headers: getHeaders() });
  return res.json();
};

export const assignUserSkill = async (userId, data) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/assignments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const uploadUserPhoto = async (userId, file) => {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_URL}/skills/users/${userId}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData
  });
  return res.json();
};

// ============================================================================
// EVALUACIONES
// ============================================================================

export const getEvaluations = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_URL}/skills/evaluations?${params}`, { headers: getHeaders() });
  return res.json();
};

export const getEvaluation = async (id) => {
  const res = await fetch(`${API_URL}/skills/evaluations/${id}`, { headers: getHeaders() });
  return res.json();
};

export const createEvaluation = async (data) => {
  const res = await fetch(`${API_URL}/skills/evaluations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const completeEvaluation = async (id) => {
  const res = await fetch(`${API_URL}/skills/evaluations/${id}/complete`, {
    method: 'PUT',
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// PERFIL PÚBLICO
// ============================================================================

export const getUserProfile = async (userId) => {
  const res = await fetch(`${API_URL}/skills/profile/${userId}`, { headers: getHeaders() });
  return res.json();
};

// ============================================================================
// EVIDENCIAS Y TABLA HISTÓRICA
// ============================================================================

// Historial pivote para tabla (fechas como columnas)
// showAll=true muestra todas las habilidades evaluadas (curriculum), false solo del perfil actual
export const getHistoryPivot = async (userId, limit = 20, showAll = false) => {
  const res = await fetch(`${API_URL}/skills/users/${userId}/history-pivot?limit=${limit}&showAll=${showAll}`, { headers: getHeaders() });
  return res.json();
};

// Detalle de un score específico
export const getScoreDetail = async (scoreId) => {
  const res = await fetch(`${API_URL}/skills/scores/${scoreId}`, { headers: getHeaders() });
  return res.json();
};

// Subir evidencia a un score
export const uploadEvidence = async (scoreId, file) => {
  const formData = new FormData();
  formData.append('evidence', file);

  const res = await fetch(`${API_URL}/skills/scores/${scoreId}/evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData
  });
  return res.json();
};

// URL para descargar evidencia
export const getEvidenceDownloadUrl = (scoreId) => {
  return `${API_URL}/skills/scores/${scoreId}/evidence`;
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const getDashboard = async () => {
  const res = await fetch(`${API_URL}/skills/dashboard`, { headers: getHeaders() });
  return res.json();
};
