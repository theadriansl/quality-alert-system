/**
 * Socket.IO Configuration
 * Real-time WebSocket communication for Quality Alert System
 */

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO with HTTP server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`   User ${userId} joined personal room`);
      }
    });

    // Join role-based rooms
    socket.on('join:role', (role) => {
      if (role) {
        socket.join(`role:${role}`);
        console.log(`   Socket joined role room: ${role}`);
      }
    });

    // Join station room (for station-specific updates)
    socket.on('join:station', (stationId) => {
      if (stationId) {
        socket.join(`station:${stationId}`);
        console.log(`   Socket joined station room: ${stationId}`);
      }
    });

    // Join dashboard room (for dashboard updates)
    socket.on('join:dashboard', (dashboardType) => {
      if (dashboardType) {
        socket.join(`dashboard:${dashboardType}`);
        console.log(`   Socket joined dashboard: ${dashboardType}`);
      }
    });

    // Leave rooms
    socket.on('leave:user', (userId) => {
      socket.leave(`user:${userId}`);
    });

    socket.on('leave:station', (stationId) => {
      socket.leave(`station:${stationId}`);
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

/**
 * Get Socket.IO instance
 * @returns {Server|null} Socket.IO server instance
 */
function getIO() {
  return io;
}

// ============================================================================
// EVENT EMITTERS - Use these functions to emit events from endpoints
// ============================================================================

/**
 * Emit event to all connected clients
 */
function emitToAll(event, data) {
  if (io) {
    console.log(`📡 Broadcasting: ${event} to all clients`);
    io.emit(event, { ...data, timestamp: new Date().toISOString() });
  } else {
    console.log(`⚠️ Socket.IO not initialized, cannot emit: ${event}`);
  }
}

/**
 * Emit event to specific user
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
  }
}

/**
 * Emit event to users with specific role
 */
function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, { ...data, timestamp: new Date().toISOString() });
  }
}

/**
 * Emit event to specific station
 */
function emitToStation(stationId, event, data) {
  if (io) {
    io.to(`station:${stationId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
  }
}

/**
 * Emit event to dashboard subscribers
 */
function emitToDashboard(dashboardType, event, data) {
  if (io) {
    io.to(`dashboard:${dashboardType}`).emit(event, { ...data, timestamp: new Date().toISOString() });
  }
}

// ============================================================================
// CONVENIENCE METHODS FOR COMMON EVENTS
// ============================================================================

const socketEvents = {
  // Defect events
  defectCreated: (defect) => {
    emitToAll('defect:created', defect);
    emitToDashboard('hospital', 'defect:created', defect);
    if (defect.stationId) {
      emitToStation(defect.stationId, 'defect:created', defect);
    }
  },

  defectUpdated: (defect) => {
    emitToAll('defect:updated', defect);
    emitToDashboard('hospital', 'defect:updated', defect);
  },

  defectRepaired: (defect) => {
    emitToAll('defect:repaired', defect);
    emitToDashboard('hospital', 'defect:repaired', defect);
  },

  defectReleased: (defect) => {
    emitToAll('defect:released', defect);
    emitToDashboard('hospital', 'defect:released', defect);
  },

  // QAR events
  qarCreated: (qar) => {
    emitToAll('qar:created', qar);
    if (qar.assignedTo) {
      emitToUser(qar.assignedTo, 'notification:new', {
        type: 'QAR_ASSIGNED',
        title: 'Nueva QAR Asignada',
        message: `Se te asignó la alerta ${qar.alertNumber}`,
        link: `/qar-detail/${qar.id}`
      });
    }
  },

  qarUpdated: (qar) => {
    emitToAll('qar:updated', qar);
  },

  // 8D events
  eightDCreated: (eightD) => {
    emitToAll('8d:created', eightD);
  },

  eightDStageChanged: (eightD) => {
    emitToAll('8d:stage-changed', eightD);
    if (eightD.responsibleId) {
      emitToUser(eightD.responsibleId, 'notification:new', {
        type: '8D_STAGE_CHANGED',
        title: '8D Cambio de Etapa',
        message: `El 8D ${eightD.reportNumber} avanzó a etapa ${eightD.currentStage}`,
        link: `/8d-workflow/${eightD.id}`
      });
    }
  },

  // ECR events
  ecrCreated: (ecr) => {
    emitToAll('ecr:created', ecr);
  },

  ecrApprovalRequired: (ecr, approverId) => {
    emitToUser(approverId, 'notification:new', {
      type: 'ECR_APPROVAL',
      title: 'ECR Requiere Aprobación',
      message: `ECR ${ecr.ecrNumber} espera tu aprobación`,
      link: `/ecr-workflow/${ecr.id}`
    });
  },

  ecrApproved: (ecr) => {
    emitToAll('ecr:approved', ecr);
    if (ecr.createdBy) {
      emitToUser(ecr.createdBy, 'notification:new', {
        type: 'ECR_APPROVED',
        title: 'ECR Aprobado',
        message: `Tu ECR ${ecr.ecrNumber} fue aprobado`,
        link: `/ecr-workflow/${ecr.id}`
      });
    }
  },

  // MRB events
  mrbInspection: (inspection) => {
    emitToAll('mrb:inspection', inspection);
    emitToDashboard('mrb', 'mrb:inspection', inspection);
  },

  mrbCampaignUpdated: (campaign) => {
    emitToAll('mrb:campaign-updated', campaign);
    emitToDashboard('mrb', 'mrb:campaign-updated', campaign);
  },

  // Transfer package events
  packageCreated: (pkg) => {
    emitToAll('package:created', pkg);
  },

  packageReceived: (pkg) => {
    emitToAll('package:received', pkg);
  },

  // Generic notification
  sendNotification: (userId, notification) => {
    emitToUser(userId, 'notification:new', notification);
  },

  // Broadcast to all
  broadcast: (event, data) => {
    emitToAll(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToAll,
  emitToUser,
  emitToRole,
  emitToStation,
  emitToDashboard,
  socketEvents
};
