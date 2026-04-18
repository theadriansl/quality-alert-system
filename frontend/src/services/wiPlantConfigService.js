import axios from 'axios';

const API_URL = 'http://localhost:5000/wi-config';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const wiPlantConfigService = {
  // ============================================================================
  // PLANTS
  // ============================================================================

  getPlants: async () => {
    const response = await axios.get(`${API_URL}/plants`, getAuthHeader());
    return response.data;
  },

  getPlant: async (id) => {
    const response = await axios.get(`${API_URL}/plants/${id}`, getAuthHeader());
    return response.data;
  },

  createPlant: async (data) => {
    const response = await axios.post(`${API_URL}/plants`, data, getAuthHeader());
    return response.data;
  },

  updatePlant: async (id, data) => {
    const response = await axios.put(`${API_URL}/plants/${id}`, data, getAuthHeader());
    return response.data;
  },

  deletePlant: async (id) => {
    const response = await axios.delete(`${API_URL}/plants/${id}`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // AREAS
  // ============================================================================

  createArea: async (plantId, data) => {
    const response = await axios.post(`${API_URL}/plants/${plantId}/areas`, data, getAuthHeader());
    return response.data;
  },

  updateArea: async (id, data) => {
    const response = await axios.put(`${API_URL}/areas/${id}`, data, getAuthHeader());
    return response.data;
  },

  deleteArea: async (id) => {
    const response = await axios.delete(`${API_URL}/areas/${id}`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // LINES
  // ============================================================================

  createLine: async (areaId, data) => {
    const response = await axios.post(`${API_URL}/areas/${areaId}/lines`, data, getAuthHeader());
    return response.data;
  },

  updateLine: async (id, data) => {
    const response = await axios.put(`${API_URL}/lines/${id}`, data, getAuthHeader());
    return response.data;
  },

  deleteLine: async (id) => {
    const response = await axios.delete(`${API_URL}/lines/${id}`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // STATIONS
  // ============================================================================

  createStation: async (lineId, data) => {
    const response = await axios.post(`${API_URL}/lines/${lineId}/stations`, data, getAuthHeader());
    return response.data;
  },

  updateStation: async (id, data) => {
    const response = await axios.put(`${API_URL}/stations/${id}`, data, getAuthHeader());
    return response.data;
  },

  deleteStation: async (id) => {
    const response = await axios.delete(`${API_URL}/stations/${id}`, getAuthHeader());
    return response.data;
  },

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getStationHierarchy: async () => {
    const response = await axios.get(`${API_URL}/stations/hierarchy`, getAuthHeader());
    return response.data;
  },

  getStationTypes: async () => {
    const response = await axios.get(`${API_URL}/station-types`, getAuthHeader());
    return response.data;
  }
};

export default wiPlantConfigService;
