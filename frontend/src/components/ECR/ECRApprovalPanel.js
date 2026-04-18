import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import ECRApprovalModal from './ECRApprovalModal';
import ECRApprovalTimeline from './ECRApprovalTimeline';

const ECRApprovalPanel = ({ ecrId, currentUser, onStatusChange }) => {
  const { theme: t } = useTheme();
  const { showSuccess, showError } = useToast();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ecrId) {
      loadApprovalStatus();
    }
  }, [ecrId]);

  const loadApprovalStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/ecr/${ecrId}/approval-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApprovalStatus(response.data);
    } catch (error) {
      console.error('Error loading approval status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!window.confirm('¿Estás seguro de que quieres enviar este ECR a aprobación?')) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/ecr/${ecrId}/submit-for-approval`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(' ECR enviado a aprobación exitosamente');
      await loadApprovalStatus();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      showError(` Error: ${error.response?.data?.message || 'No se pudo enviar a aprobación'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalSuccess = async () => {
    await loadApprovalStatus();
    if (onStatusChange) onStatusChange();
  };

  const canUserApprove = (user, pendingApprover) => {
    if (!pendingApprover || !user) return false;
    return pendingApprover.approverId === user.id;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Cargando estado de aprobación...</p>
      </div>
    );
  }

  if (!approvalStatus) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>No se pudo cargar el estado de aprobación</p>
      </div>
    );
  }

  const { currentStatus, pendingApprover, approvalHistory, createdBy } = approvalStatus;
  const canApprove = canUserApprove(currentUser, pendingApprover);

  const getStatusBadge = (status) => {
    const badges = {
      draft: { text: 'Borrador', color: '#6b7280' },
      pending_approval: { text: 'Esperando Aprobación', color: '#C77700' },
      approved: { text: 'Aprobado', color: '#2E7D32' },
      rejected: { text: 'Rechazado', color: '#ef4444' }
    };
    const badge = badges[status] || badges.draft;

    return (
      <span style={{
        ...styles.badge,
        backgroundColor: badge.color
      }}>
        {badge.text}
      </span>
    );
  };

  const styles = getStyles(t);

  return (
    <div style={styles.container}>
      {/* Current Status */}
      <div style={styles.statusCard}>
        <h3 style={styles.cardTitle}> Estado de Aprobación del ECR</h3>

        <div style={styles.statusSection}>
          <p style={styles.statusLabel}>Estado Actual:</p>
          {getStatusBadge(currentStatus)}
        </div>

        {/* Submit for approval button (only if draft and user is creator) */}
        {currentStatus === 'draft' && createdBy === currentUser?.id && (
          <div style={styles.submitSection}>
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Enviando...' : ' Enviar a Aprobación'}
            </button>
            <p style={styles.submitHint}>
              Al enviar a aprobación, comenzará el flujo de aprobaciones secuenciales
            </p>
          </div>
        )}

        {/* Pending Approver Information */}
        {pendingApprover && (
          <div style={styles.pendingBox}>
            <p style={styles.pendingTitle}>
               Esperando Aprobación
            </p>
            <p style={styles.pendingInfo}>
              <span style={styles.infoLabel}>Nivel:</span> Aprobador {pendingApprover.level}
            </p>
            <p style={styles.pendingInfo}>
              <span style={styles.infoLabel}>Aprobador:</span> {pendingApprover.approverName}
            </p>
            <p style={styles.pendingInfo}>
              <span style={styles.infoLabel}>Puesto:</span> {pendingApprover.approverPosition}
            </p>

            {/* Approve/Reject button (only if current user can approve) */}
            {canApprove && (
              <div style={styles.approveSection}>
                <button
                  onClick={() => setShowModal(true)}
                  style={styles.approveButton}
                >
                   Revisar y Aprobar/Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Completed Status */}
        {currentStatus === 'approved' && (
          <div style={styles.completedBox}>
            <p style={styles.completedTitle}>
               ECR Completamente Aprobado
            </p>
            <p style={styles.completedText}>
              Todas las aprobaciones han sido completadas exitosamente
            </p>
          </div>
        )}

        {/* Rejected Status */}
        {currentStatus === 'rejected' && (
          <div style={styles.rejectedBox}>
            <p style={styles.rejectedTitle}>
               ECR Rechazado
            </p>
            <p style={styles.rejectedText}>
              El ECR fue rechazado. Revisa los comentarios en el historial y realiza las correcciones necesarias.
            </p>
          </div>
        )}
      </div>

      {/* Approval Timeline */}
      {approvalHistory && approvalHistory.length > 0 && (
        <ECRApprovalTimeline approvalHistory={approvalHistory} />
      )}

      {/* Approval Modal */}
      {canApprove && (
        <ECRApprovalModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          ecrId={ecrId}
          level={pendingApprover.level}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  );
};

const getStyles = (t) => ({
  container: {
    marginTop: '24px'
  },
  loadingContainer: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px'
  },
  loadingText: {
    fontSize: '14px',
    color: t.textMuted
  },
  errorContainer: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px'
  },
  errorText: {
    fontSize: '14px',
    color: t.error
  },
  statusCard: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '16px'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: t.text,
    marginBottom: '20px'
  },
  statusSection: {
    marginBottom: '20px'
  },
  statusLabel: {
    fontSize: '13px',
    color: t.textMuted,
    marginBottom: '8px'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600'
  },
  submitSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: `1px solid ${t.border}`
  },
  submitButton: {
    backgroundColor: t.accent,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  submitHint: {
    fontSize: '12px',
    color: t.textMuted,
    marginTop: '8px'
  },
  pendingBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: `${t.warning}10`,
    border: `2px solid ${t.warning}`,
    borderRadius: '8px'
  },
  pendingTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.warning,
    marginBottom: '12px'
  },
  pendingInfo: {
    fontSize: '14px',
    color: t.text,
    marginBottom: '6px'
  },
  infoLabel: {
    fontWeight: '600'
  },
  approveSection: {
    marginTop: '16px'
  },
  approveButton: {
    backgroundColor: t.success,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  completedBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: `${t.success}10`,
    border: `2px solid ${t.success}50`,
    borderRadius: '8px'
  },
  completedTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.success,
    marginBottom: '8px'
  },
  completedText: {
    fontSize: '14px',
    color: t.success
  },
  rejectedBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: `${t.error}10`,
    border: `2px solid ${t.error}50`,
    borderRadius: '8px'
  },
  rejectedTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.error,
    marginBottom: '8px'
  },
  rejectedText: {
    fontSize: '14px',
    color: t.error
  }
});

export default ECRApprovalPanel;
