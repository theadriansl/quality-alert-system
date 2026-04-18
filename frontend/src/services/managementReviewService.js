import axios from 'axios';

const API_URL = 'http://localhost:5000/management-review';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const managementReviewService = {
  // ============================================================================
  // CHECKLIST TEMPLATE
  // ============================================================================

  getChecklistTemplate: async () => {
    const response = await axios.get(`${API_URL}/checklist-template`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // KPIs
  // ============================================================================

  getKPIs: async (periodStart, periodEnd) => {
    const params = new URLSearchParams();
    if (periodStart) params.append('periodStart', periodStart);
    if (periodEnd) params.append('periodEnd', periodEnd);
    const response = await axios.get(`${API_URL}/kpis?${params}`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // ACTAS
  // ============================================================================

  getActas: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.status) params.append('status', filters.status);
    const response = await axios.get(`${API_URL}/actas?${params}`, getAuthHeader());
    return response.data;
  },

  getActa: async (id) => {
    const response = await axios.get(`${API_URL}/actas/${id}`, getAuthHeader());
    return response.data;
  },

  createActa: async (data) => {
    const response = await axios.post(`${API_URL}/actas`, data, getAuthHeader());
    return response.data;
  },

  updateActa: async (id, data) => {
    const response = await axios.put(`${API_URL}/actas/${id}`, data, getAuthHeader());
    return response.data;
  },

  signActa: async (id, userId, signature) => {
    const response = await axios.post(`${API_URL}/actas/${id}/sign`, { userId, signature }, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  addAction: async (actaId, data) => {
    const response = await axios.post(`${API_URL}/actas/${actaId}/actions`, data, getAuthHeader());
    return response.data;
  },

  updateAction: async (actionId, data) => {
    const response = await axios.put(`${API_URL}/actions/${actionId}`, data, getAuthHeader());
    return response.data;
  },

  getPreviousActions: async () => {
    const response = await axios.get(`${API_URL}/previous-actions`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // WORKLOAD INTEGRATION
  // ============================================================================

  scheduleReview: async (data) => {
    const response = await axios.post(`${API_URL}/schedule`, data, getAuthHeader());
    return response.data;
  }
};

export default managementReviewService;
