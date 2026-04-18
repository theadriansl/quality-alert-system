import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const impactAreasService = {
  // Get all active impact areas
  getActiveAreas: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/impact-areas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get all areas (including inactive)
  getAllAreas: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/impact-areas?includeInactive=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get single area by ID
  getAreaById: async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/impact-areas/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create new area
  createArea: async (areaData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/impact-areas`, areaData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update area
  updateArea: async (id, areaData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_BASE_URL}/impact-areas/${id}`, areaData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Delete area (soft delete)
  deleteArea: async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_BASE_URL}/impact-areas/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Reorder areas
  reorderAreas: async (orderedIds) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/impact-areas/reorder`,
      { orderedIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default impactAreasService;
