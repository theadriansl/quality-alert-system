import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validar token al cargar la app
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verificar token y obtener datos del usuario
      api.get('/auth/me')
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Sincronización entre pestañas - detecta cambios en localStorage
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'token') {
        if (!event.newValue) {
          // Token removido en otra pestaña → logout aquí
          setUser(null);
          window.location.href = '/login';
        } else if (event.newValue !== event.oldValue) {
          // Token cambió (otro usuario logueado) → recargar
          window.location.reload();
        }
      }

      if (event.key === 'user') {
        if (!event.newValue) {
          // User removido → logout
          setUser(null);
          window.location.href = '/login';
        } else if (event.newValue !== event.oldValue) {
          // Usuario cambió → recargar para permisos correctos
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email, password) => {
    try {
      console.log(' Intentando login con:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log(' Login exitoso:', response.data);
      
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));  // ← GUARDAR USUARIO EN LOCALSTORAGE
      setUser(user);

      return response.data;
    } catch (error) {
      console.error(' Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error(' Error en registro:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};