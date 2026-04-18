import axios from 'axios';

const API_URL = 'http://localhost:5000/risk-matrix';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No token found in localStorage');
  }
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

const riskMatrixService = {
  // Get active risk matrix configuration
  getActiveConfig: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token available');
      }
      const response = await axios.get(`${API_URL}/config`, getAuthHeader());
      return response.data.config;
    } catch (error) {
      console.error('Error fetching risk matrix config:', error);
      if (error.response?.status === 403) {
        console.error('Token validation failed - you may need to log in again');
      }
      throw error;
    }
  },

  // Calculate risk level based on category + type
  calculateRisk: async (category, type) => {
    try {
      const response = await axios.post(
        `${API_URL}/calculate`,
        { category, type },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error calculating risk:', error);
      throw error;
    }
  },

  // Update risk matrix config (admin only)
  updateConfig: async (configData) => {
    try {
      const response = await axios.put(`${API_URL}/config`, configData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error updating risk matrix config:', error);
      throw error;
    }
  }
};

export default riskMatrixService;
