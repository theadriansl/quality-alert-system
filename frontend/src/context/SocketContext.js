/**
 * Socket.IO Context for React
 * Provides real-time WebSocket connection across the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);

      // Join user room if logged in
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        newSocket.emit('join:user', user.id);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.log('🔌 WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    // Handle incoming notifications
    newSocket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title || 'Nueva Notificación', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });

    // Handle user permission/role changes
    const userChangeEvents = [
      'user:updated',
      'user:role-assigned',
      'user:role-revoked',
      'user:hospital-role-assigned',
      'user:hospital-role-updated',
      'user:hospital-role-revoked'
    ];

    userChangeEvents.forEach(event => {
      newSocket.on(event, (data) => {
        console.log(`🔐 WebSocket [${event}]:`, data);

        if (data.requiresRefresh) {
          // Clear cached permissions
          localStorage.removeItem('hospitalPermissionsCache');
          sessionStorage.removeItem('hospitalPermissionsCache');

          // Show notification to user
          const message = event.includes('revoked')
            ? 'Tus permisos han sido modificados. Por favor recarga la página.'
            : 'Tus permisos han sido actualizados. Por favor recarga la página para aplicar los cambios.';

          setNotifications(prev => [{
            id: Date.now(),
            type: 'warning',
            title: 'Permisos Actualizados',
            message,
            requiresAction: true
          }, ...prev].slice(0, 50));

          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification('Permisos Actualizados', {
              body: message,
              icon: '/favicon.ico',
              requireInteraction: true
            });
          }
        }
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Join user room (call after login)
  const joinUserRoom = useCallback((userId) => {
    if (socket && userId) {
      socket.emit('join:user', userId);
    }
  }, [socket]);

  // Join station room
  const joinStation = useCallback((stationId) => {
    if (socket && stationId) {
      socket.emit('join:station', stationId);
    }
  }, [socket]);

  // Leave station room
  const leaveStation = useCallback((stationId) => {
    if (socket && stationId) {
      socket.emit('leave:station', stationId);
    }
  }, [socket]);

  // Join dashboard room
  const joinDashboard = useCallback((dashboardType) => {
    if (socket && dashboardType) {
      socket.emit('join:dashboard', dashboardType);
    }
  }, [socket]);

  // Clear a notification
  const clearNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Subscribe to an event
  const subscribe = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  }, [socket]);

  const value = {
    socket,
    isConnected,
    notifications,
    joinUserRoom,
    joinStation,
    leaveStation,
    joinDashboard,
    clearNotification,
    clearAllNotifications,
    subscribe
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to use socket context
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Hook to subscribe to a specific event
export function useSocketEvent(event, callback) {
  const { subscribe } = useSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, subscribe]);
}

export default SocketContext;
