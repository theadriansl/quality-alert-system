// Servicio para manejar operaciones de proyectos
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const projectService = {
  // Obtener todos los proyectos
  getAllProjects: async (filters = {}) => {
    try {
      console.log(' Fetching projects from backend...');

      // Construir query string con filtros
      const queryParams = new URLSearchParams();
      if (filters.clientId) queryParams.append('clientId', filters.clientId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/projects/list${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.projects) {
        console.log(' Projects loaded from backend:', data.projects.length);
        return {
          projects: data.projects,
          stats: data.stats
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(' Error fetching projects from backend:', error);
      throw error;
    }
  },

  // Obtener un proyecto por ID
  getProjectById: async (projectId) => {
    try {
      console.log(` Fetching project ${projectId} from backend...`);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Proyecto no encontrado');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.project) {
        console.log(' Project loaded:', data.project.projectName);
        return data.project;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(` Error fetching project ${projectId}:`, error);
      throw error;
    }
  },

  // Crear un nuevo proyecto
  createProject: async (projectData) => {
    try {
      console.log(' Creating new project...');
      const response = await fetch(`${API_BASE_URL}/projects/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.project) {
        console.log(' Project created:', data.project.projectName);
        return data.project;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(' Error creating project:', error);
      throw error;
    }
  },

  // Actualizar un proyecto
  updateProject: async (projectId, projectData) => {
    try {
      console.log(` Updating project ${projectId}...`);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Proyecto no encontrado');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.project) {
        console.log(' Project updated:', data.project.projectName);
        return data.project;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(` Error updating project ${projectId}:`, error);
      throw error;
    }
  },

  // Eliminar un proyecto
  deleteProject: async (projectId) => {
    try {
      console.log(` Deleting project ${projectId}...`);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Proyecto no encontrado');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log(' Project deleted');
        return data.project;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(` Error deleting project ${projectId}:`, error);
      throw error;
    }
  },

  // Obtener partes de un proyecto (para selección en 8D)
  getProjectParts: async (projectId) => {
    try {
      console.log(` Fetching parts for project ${projectId}...`);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/parts`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Proyecto no encontrado');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.parts) {
        console.log(' Parts loaded:', data.parts.length);
        return data;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(` Error fetching parts for project ${projectId}:`, error);
      throw error;
    }
  },

  // Agregar una parte a un proyecto
  addPartToProject: async (projectId, partData) => {
    try {
      console.log(` Adding part to project ${projectId}...`);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/parts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(partData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.part) {
        console.log(' Part added to project');
        return data;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(` Error adding part to project ${projectId}:`, error);
      throw error;
    }
  },

  // Eliminar una parte de un proyecto
  removePartFromProject: async (projectId, partId) => {
    try {
      console.log(` Removing part ${partId} from project ${projectId}...`);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/parts/${partId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log(' Part removed from project');
        return data;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(` Error removing part from project ${projectId}:`, error);
      throw error;
    }
  }
};

export default projectService;
