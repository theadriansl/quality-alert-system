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
  },

  // ============================================================================
  // ILUO CERTIFICATIONS
  // ============================================================================

  // Get certifications for a specific WI
  getCertifications: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/certifications`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching certifications:', error);
      throw error;
    }
  },

  // Get available operators for certification
  getAvailableOperators: async (wiId) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/certifications/available-operators`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching available operators:', error);
      throw error;
    }
  },

  // Create or update certification
  saveCertification: async (wiId, certData) => {
    try {
      const response = await axios.post(`${API_URL}/${wiId}/certifications`, certData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error saving certification:', error);
      throw error;
    }
  },

  // Update certification
  updateCertification: async (wiId, certId, certData) => {
    try {
      const response = await axios.put(`${API_URL}/${wiId}/certifications/${certId}`, certData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error updating certification:', error);
      throw error;
    }
  },

  // Revoke certification
  revokeCertification: async (wiId, certId, revokedBy, reason) => {
    try {
      const params = new URLSearchParams();
      if (revokedBy) params.append('revokedBy', revokedBy);
      if (reason) params.append('reason', reason);
      const response = await axios.delete(`${API_URL}/${wiId}/certifications/${certId}?${params}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error revoking certification:', error);
      throw error;
    }
  },

  // Get certification history for a WI
  getCertificationHistory: async (wiId, limit = 50) => {
    try {
      const response = await axios.get(`${API_URL}/${wiId}/certifications/history?limit=${limit}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching certification history:', error);
      throw error;
    }
  },

  // ============================================================================
  // ILUO MATRIX & REPORTS (using base API URL)
  // ============================================================================

  // Get ILUO matrix data
  getILUOMatrix: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.lineId) params.append('lineId', filters.lineId);
      const url = params.toString()
        ? `http://localhost:5000/wi-certifications/matrix?${params}`
        : 'http://localhost:5000/wi-certifications/matrix';
      const response = await axios.get(url, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching ILUO matrix:', error);
      throw error;
    }
  },

  // Get expiring certifications
  getExpiringCertifications: async (days = 30) => {
    try {
      const response = await axios.get(`http://localhost:5000/wi-certifications/expiring?days=${days}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching expiring certifications:', error);
      throw error;
    }
  },

  // Get certification summary for dashboard
  getCertificationSummary: async () => {
    try {
      const response = await axios.get('http://localhost:5000/wi-certifications/summary', getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching certification summary:', error);
      throw error;
    }
  },

  // Get operator WI certifications
  getOperatorCertifications: async (operatorId, includeExpired = false) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/operators/${operatorId}/wi-certifications?includeExpired=${includeExpired}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching operator certifications:', error);
      throw error;
    }
  },

  // Get operator certification history
  getOperatorCertificationHistory: async (operatorId, limit = 50) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/operators/${operatorId}/wi-certifications/history?limit=${limit}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching operator certification history:', error);
      throw error;
    }
  },

  // Get operator certification pivot (for historical table)
  getOperatorCertificationsPivot: async (operatorId, limit = 20) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/operators/${operatorId}/wi-certifications/pivot?limit=${limit}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching operator certification pivot:', error);
      throw error;
    }
  },

  // ============================================================================
  // CERTIFICATION EVIDENCE
  // ============================================================================

  // Upload evidence to a certification
  uploadCertificationEvidence: async (wiId, certId, file) => {
    try {
      const formData = new FormData();
      formData.append('evidence', file);
      const response = await axios.post(
        `${API_URL}/${wiId}/certifications/${certId}/evidence`,
        formData,
        {
          headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading certification evidence:', error);
      throw error;
    }
  },

  // Get evidence download URL
  getCertificationEvidenceUrl: (wiId, certId) => {
    return `${API_URL}/${wiId}/certifications/${certId}/evidence`;
  },

  // Delete evidence from a certification
  deleteCertificationEvidence: async (wiId, certId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/${wiId}/certifications/${certId}/evidence`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting certification evidence:', error);
      throw error;
    }
  },

  // ============================================================================
  // CERTIFICATION SCALES
  // ============================================================================

  // Get all certification scales
  getCertificationScales: async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/wi-certification-scales',
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching certification scales:', error);
      throw error;
    }
  },

  // Get scale by ID
  getCertificationScale: async (scaleId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/wi-certification-scales/${scaleId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching certification scale:', error);
      throw error;
    }
  }
};

export default workInstructionsService;
