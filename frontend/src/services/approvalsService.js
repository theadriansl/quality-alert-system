import api from './api';

/**
 * Servicio de aprobaciones para reportes 8D
 */

/**
 * Enviar reporte a aprobación
 */
export const submitForApproval = async (reportId) => {
  try {
    const response = await api.post(`/8d/reports/${reportId}/submit`);
    return response.data;
  } catch (error) {
    console.error('Error al enviar a aprobación:', error);
    throw error.response?.data || { error: 'Error al enviar a aprobación' };
  }
};

/**
 * Aprobar una sección del reporte
 */
export const approveSection = async (reportId, section, level, comments = '') => {
  try {
    const response = await api.post(`/8d/reports/${reportId}/approve`, {
      section,
      level,
      comments
    });
    return response.data;
  } catch (error) {
    console.error('Error al aprobar:', error);
    throw error.response?.data || { error: 'Error al aprobar' };
  }
};

/**
 * Rechazar una sección del reporte
 */
export const rejectSection = async (reportId, section, level, comments) => {
  try {
    const response = await api.post(`/8d/reports/${reportId}/reject`, {
      section,
      level,
      comments
    });
    return response.data;
  } catch (error) {
    console.error('Error al rechazar:', error);
    throw error.response?.data || { error: 'Error al rechazar' };
  }
};

/**
 * Obtener estado de aprobación de un reporte
 */
export const getApprovalStatus = async (reportId) => {
  try {
    const response = await api.get(`/8d/reports/${reportId}/approval-status`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estado de aprobación:', error);
    throw error.response?.data || { error: 'Error al obtener estado de aprobación' };
  }
};

/**
 * Obtener descripción legible del estado
 */
export const getStatusDescription = (status) => {
  const descriptions = {
    draft: 'Borrador',
    issue_approval_1: 'Esperando Aprobación Issue - Nivel 1',
    issue_approval_2: 'Esperando Aprobación Issue - Nivel 2',
    issue_approval_3: 'Esperando Aprobación Issue - Nivel 3',
    issue_approved: 'Issue Aprobado',
    countermeasure_in_progress: 'Countermeasure en Progreso',
    countermeasure_approval_1: 'Esperando Aprobación Countermeasure - Nivel 1',
    countermeasure_approval_2: 'Esperando Aprobación Countermeasure - Nivel 2',
    countermeasure_approval_3: 'Esperando Aprobación Countermeasure - Nivel 3',
    countermeasure_approved: 'Countermeasure Aprobado',
    confirmation_in_progress: 'Confirmation en Progreso',
    confirmation_approval_1: 'Esperando Aprobación Confirmation - Nivel 1',
    confirmation_approval_2: 'Esperando Aprobación Confirmation - Nivel 2',
    confirmation_approval_3: 'Esperando Aprobación Confirmation - Nivel 3',
    closed: 'Cerrado'
  };

  return descriptions[status] || status;
};

/**
 * Obtener color del badge según el estado
 */
export const getStatusBadgeColor = (status) => {
  if (status === 'draft') return 'bg-gray-500';
  if (status.includes('approval')) return 'bg-yellow-500';
  if (status.includes('approved') || status === 'closed') return 'bg-green-500';
  if (status.includes('in_progress')) return 'bg-blue-500';
  return 'bg-gray-500';
};

/**
 * Verificar si el usuario actual puede aprobar/rechazar
 */
export const canUserApprove = (currentUser, pendingApprover) => {
  if (!pendingApprover || !pendingApprover.users) return false;

  return pendingApprover.users.some(user => user.id === currentUser.id);
};

export default {
  submitForApproval,
  approveSection,
  rejectSection,
  getApprovalStatus,
  getStatusDescription,
  getStatusBadgeColor,
  canUserApprove
};
