import axios from 'axios';

const API_URL = 'http://localhost:5000/work-instructions';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const workInstructionsService = {
  // ============================================================================
  // WORK INSTRUCTIONS CRUD
  // ============================================================================

  // Get all work instructions
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.status) params.append('status', filters.status);

      const url = params.toString() ? `${API_URL}/list?${params}` : `${API_URL}/list`;
      const response = await axios.get(url, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching work instructions:', error);
      throw error;
    }
  },

  // Get single work instruction with all relations
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error fetching work instruction ${id}:`, error);
      throw error;
    }
  },

  // Create new work instruction
  create: async (data) => {
    try {
      const response = await axios.post(API_URL, data, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error creating work instruction:', error);
      throw error;
    }
  },

  // Update work instruction
  update: async (id, data) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error updating work instruction ${id}:`, error);
      throw error;
    }
  },

  // Delete work instruction
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error deleting work instruction ${id}:`, error);
      throw error;
    }
  },

  // ============================================================================
  // PROJECTS
  // ============================================================================

  getAvailableProjects: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/available-projects`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching available projects:', error);
      throw error;
    }
  },

  linkProject: async (wiId, projectId) => {
    try {
      const response = await axios.post(`${API_URL}/${wiId}/projects`, { projectId }, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error linking project:', error);
      throw error;
    }
  },

  unlinkProject: async (wiId, projectId) => {
    try {
      const response = await axios.delete(`${API_URL}/${wiId}/projects/${projectId}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error unlinking project:', error);
      throw error;
    }
  },

  // ============================================================================
  // PARTS
  // ============================================================================

  getAvailableParts: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/available-parts`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching available parts:', error);
      throw error;
    }
  },

  linkPart: async (wiId, partId) => {
    try {
      const response = await axios.post(`${API_URL}/${wiId}/parts`, { partId }, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error linking part:', error);
      throw error;
    }
  },

  unlinkPart: async (wiId, partId) => {
    try {
      const response = await axios.delete(`${API_URL}/${wiId}/parts/${partId}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error unlinking part:', error);
      throw error;
    }
  },

  // ============================================================================
  // USERS
  // ============================================================================

  getAvailableUsers: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/available-users`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching available users:', error);
      throw error;
    }
  },

  assignUser: async (wiId, userId, accessType, assignedBy) => {
    try {
      const response = await axios.post(`${API_URL}/${wiId}/users`, { userId, accessType, assignedBy }, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error assigning user:', error);
      throw error;
    }
  },

  updateUserAccess: async (wiId, userId, accessType) => {
    try {
      const response = await axios.put(`${API_URL}/${wiId}/users/${userId}`, { accessType }, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error updating user access:', error);
      throw error;
    }
  },

  removeUser: async (wiId, userId) => {
    try {
      const response = await axios.delete(`${API_URL}/${wiId}/users/${userId}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  },

  // ============================================================================
  // STEPS
  // ============================================================================

  getSteps: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/steps`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching steps:', error);
      throw error;
    }
  },

  addStep: async (wiId, stepData) => {
    try {
      const response = await axios.post(`${API_URL}/${wiId}/steps`, stepData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error adding step:', error);
      throw error;
    }
  },

  updateStep: async (wiId, stepId, stepData) => {
    try {
      const response = await axios.put(`${API_URL}/${wiId}/steps/${stepId}`, stepData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error updating step:', error);
      throw error;
    }
  },

  reorderSteps: async (wiId, stepOrders, updatedBy) => {
    try {
      const response = await axios.put(`${API_URL}/${wiId}/steps/reorder`, { stepOrders, updatedBy }, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error reordering steps:', error);
      throw error;
    }
  },

  deleteStep: async (wiId, stepId, deletedBy) => {
    try {
      const response = await axios.delete(`${API_URL}/${wiId}/steps/${stepId}?deletedBy=${deletedBy}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error deleting step:', error);
      throw error;
    }
  },

  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================

  getRiskAssessment: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/risk-assessment`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      throw error;
    }
  },

  updateRiskAssessment: async (wiId, data) => {
    try {
      const response = await axios.put(`${API_URL}/${wiId}/risk-assessment`, data, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error updating risk assessment:', error);
      throw error;
    }
  },

  // ============================================================================
  // REVISIONS
  // ============================================================================

  getRevisions: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/revisions`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching revisions:', error);
      throw error;
    }
  },

  getRevisionSnapshot: async (wiId, revisionNumber) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/revisions/${revisionNumber}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching revision snapshot:', error);
      throw error;
    }
  }
};

export default workInstructionsService;
