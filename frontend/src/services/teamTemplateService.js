import axios from 'axios';

const API_URL = 'http://localhost:5000/team-templates';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const teamTemplateService = {
  // Get all templates for current user
  getAllTemplates: async () => {
    try {
      const response = await axios.get(API_URL, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching team templates:', error);
      throw error;
    }
  },

  // Get template by ID
  getTemplateById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error fetching template ${id}:`, error);
      throw error;
    }
  },

  // Create new template
  createTemplate: async (templateData) => {
    try {
      const response = await axios.post(API_URL, templateData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  // Update template
  updateTemplate: async (id, templateData) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, templateData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error updating template ${id}:`, error);
      throw error;
    }
  },

  // Delete template
  deleteTemplate: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      throw error;
    }
  }
};

export default teamTemplateService;
