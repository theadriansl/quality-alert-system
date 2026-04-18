import axios from 'axios';

const API_URL = 'http://localhost:5000/ecr';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const ecrService = {
  // Get all ECR reports
  getAllECRs: async () => {
    try {
      const response = await axios.get(`${API_URL}/reports`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching ECRs:', error);
      throw error;
    }
  },

  // Get ECR report by ID
  getECRById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/reports/${id}`, getAuthHeader());
      return response.data.ecr;
    } catch (error) {
      console.error(`Error fetching ECR ${id}:`, error);
      throw error;
    }
  },

  // Create new ECR report
  createECR: async (ecrData) => {
    try {
      const response = await axios.post(`${API_URL}/reports`, ecrData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error creating ECR:', error);
      throw error;
    }
  },

  // Update ECR report
  updateECR: async (id, ecrData) => {
    try {
      const response = await axios.put(`${API_URL}/reports/${id}`, ecrData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error updating ECR ${id}:`, error);
      throw error;
    }
  },

  // Submit ECR for validation
  submitECR: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/reports/${id}/submit`, {}, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error submitting ECR ${id}:`, error);
      throw error;
    }
  },

  // Close ECR
  closeECR: async (id, closureData) => {
    try {
      const response = await axios.post(`${API_URL}/reports/${id}/close`, closureData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error closing ECR ${id}:`, error);
      throw error;
    }
  },

  // Delete ECR (optional)
  deleteECR: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/reports/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error deleting ECR ${id}:`, error);
      throw error;
    }
  },

  // ============================================================================
  // DASHBOARD ENDPOINTS
  // ============================================================================

  // Get dashboard statistics
  getDashboardStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.department) params.append('department', filters.department);
      if (filters.changeType) params.append('changeType', filters.changeType);

      const url = `${API_URL}/dashboard-stats${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get user's dashboard configuration
  getDashboardConfig: async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard-config`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard config:', error);
      throw error;
    }
  },

  // Save user's dashboard configuration
  saveDashboardConfig: async (config, configName = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/dashboard-config`,
        { config, configName },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      throw error;
    }
  },

  // Reset dashboard to default
  resetDashboardConfig: async () => {
    try {
      const response = await axios.delete(`${API_URL}/dashboard-config`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error resetting dashboard config:', error);
      throw error;
    }
  },

  // Get widget catalog
  getWidgetCatalog: async () => {
    try {
      const response = await axios.get(`${API_URL}/widget-catalog`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching widget catalog:', error);
      throw error;
    }
  }
};

export default ecrService;
