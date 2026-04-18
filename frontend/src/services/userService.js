// Servicio para manejar operaciones de usuarios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const userService = {
  // Obtener todos los usuarios
  getAllUsers: async () => {
    try {
      console.log(' Fetching users from backend...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.users) {
        console.log(' Users loaded from backend:', data.users.length);
        return data.users;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(' Error fetching users from backend:', error);
      console.log(' Using mock data as fallback...');
      // Fallback a datos mock en caso de error
      return userService.getMockUsers();
    }
  },

  // Buscar usuarios por término de búsqueda
  searchUsers: async (searchTerm) => {
    try {
      const users = await userService.getAllUsers();
      
      if (!searchTerm || searchTerm.trim() === '') {
        return users;
      }

      const term = searchTerm.toLowerCase();
      return users.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.department.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||
        (user.location && user.location.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Filtrar usuarios por rol
  getUsersByRole: async (roles) => {
    try {
      const users = await userService.getAllUsers();
      const roleArray = Array.isArray(roles) ? roles : [roles];
      
      return users.filter(user => roleArray.includes(user.role));
    } catch (error) {
      console.error('Error filtering users by role:', error);
      return [];
    }
  },

  // Obtener usuarios que pueden asignar tareas
  getAssignableUsers: async () => {
    try {
      const users = await userService.getAllUsers();
      return users.filter(user => user.canAssign);
    } catch (error) {
      console.error('Error fetching assignable users:', error);
      return [];
    }
  },

  // Obtener usuario por ID
  getUserById: async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  },

  // Crear nuevo usuario
  createUser: async (userData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creating user');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Actualizar usuario
  updateUser: async (userId, userData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error updating user');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Datos mock como fallback
  getMockUsers: () => {
    return [
      {
        id: 1,
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        role: 'champion',
        department: 'Quality Management',
        phone: '+52-555-0001',
        extension: '1001',
        location: 'Planta Norte - Oficina 201',
        availability: 'available',
        canAssign: true,
        isActive: true
      },
      {
        id: 2,
        email: 'maria.garcia@company.com',
        firstName: 'María',
        lastName: 'García',
        name: 'María García',
        role: 'manager',
        department: 'Quality Engineering',
        phone: '+52-555-0002',
        extension: '1002',
        location: 'Planta Sur - Lab A',
        availability: 'available',
        canAssign: true,
        isActive: true
      },
      {
        id: 3,
        email: 'carlos.lopez@company.com',
        firstName: 'Carlos',
        lastName: 'López',
        name: 'Carlos López',
        role: 'engineer',
        department: 'Quality Engineering',
        phone: '+52-555-0003',
        extension: '1003',
        location: 'Planta Norte - Lab B',
        availability: 'available',
        canAssign: false,
        isActive: true
      },
      {
        id: 4,
        email: 'ana.martinez@company.com',
        firstName: 'Ana',
        lastName: 'Martínez',
        name: 'Ana Martínez',
        role: 'technician',
        department: 'Quality Control',
        phone: '+52-555-0004',
        extension: '1004',
        location: 'Planta Sur - Línea 1',
        availability: 'available',
        canAssign: false,
        isActive: true
      },
      {
        id: 5,
        email: 'luis.rodriguez@company.com',
        firstName: 'Luis',
        lastName: 'Rodríguez',
        name: 'Luis Rodríguez',
        role: 'engineer',
        department: 'Quality Engineering',
        phone: '+52-555-0005',
        extension: '1005',
        location: 'Planta Norte - Lab C',
        availability: 'available',
        canAssign: false,
        isActive: true
      },
      {
        id: 6,
        email: 'sofia.hernandez@company.com',
        firstName: 'Sofía',
        lastName: 'Hernández',
        name: 'Sofía Hernández',
        role: 'manager',
        department: 'Quality Control',
        phone: '+52-555-0006',
        extension: '1006',
        location: 'Planta Sur - Oficina 101',
        availability: 'available',
        canAssign: true,
        isActive: true
      },
      {
        id: 7,
        email: 'pedro.sanchez@company.com',
        firstName: 'Pedro',
        lastName: 'Sánchez',
        name: 'Pedro Sánchez',
        role: 'technician',
        department: 'Production',
        phone: '+52-555-0007',
        extension: '1007',
        location: 'Planta Norte - Línea 2',
        availability: 'busy',
        canAssign: false,
        isActive: true
      },
      {
        id: 8,
        email: 'carmen.flores@company.com',
        firstName: 'Carmen',
        lastName: 'Flores',
        name: 'Carmen Flores',
        role: 'engineer',
        department: 'Engineering',
        phone: '+52-555-0008',
        extension: '1008',
        location: 'Planta Sur - Oficina 202',
        availability: 'available',
        canAssign: false,
        isActive: true
      }
    ];
  },

  // Utilidades
  formatUserDisplay: (user) => {
    if (!user) return '';
    
    return {
      display: `${user.name} (${user.role})`,
      subtitle: `${user.department} - ${user.location || 'Sin ubicación'}`,
      contact: `${user.phone || 'Sin teléfono'} ${user.extension ? `Ext. ${user.extension}` : ''}`.trim(),
      availability: user.availability
    };
  },

  // Verificar disponibilidad de usuario
  isUserAvailable: (user) => {
    return user && user.availability === 'available' && user.isActive;
  },

  // Obtener roles de usuario en español
  getRoleLabel: (role, language = 'es') => {
    const roleLabels = {
      es: {
        champion: 'Champion',
        manager: 'Gerente',
        engineer: 'Ingeniero',
        technician: 'Técnico'
      },
      en: {
        champion: 'Champion',
        manager: 'Manager',
        engineer: 'Engineer',
        technician: 'Technician'
      }
    };
    
    return roleLabels[language][role] || role;
  }
};

export default userService;