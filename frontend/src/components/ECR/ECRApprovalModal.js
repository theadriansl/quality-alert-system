import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

const ECRApprovalModal = ({
  isOpen,
  onClose,
  ecrId,
  level,
  onSuccess
}) => {
  const { theme: t } = useTheme();
  const { showSuccess, showError } = useToast();
  const [action, setAction] = useState(null); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleApprove = () => {
    setAction('approve');
  };

  const handleReject = () => {
    setAction('reject');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    if (action === 'reject' && !comments.trim()) {
      setError('Los comentarios son obligatorios al rechazar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'approve' ? 'approve' : 'reject';

      await axios.post(
        `http://localhost:5000/ecr/${ecrId}/${endpoint}`,
        { level, comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess(` ${action === 'approve' ? 'Aprobado' : 'Rechazado'} exitosamente`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error(' Error en aprobación/rechazo:', err);
      setError(err.response?.data?.message || 'Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAction(null);
    setComments('');
    setError(null);
    onClose();
  };

  const styles = getStyles(t);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Revisar Aprobación de ECR</h2>

        <div style={styles.infoSection}>
          <p style={styles.infoLabel}>Nivel de Aprobador</p>
          <p style={styles.infoValue}>Aprobador {level}</p>
        </div>

        {!action && (
          <div style={styles.actionsContainer}>
            <button
              onClick={handleApprove}
              style={{...styles.actionButton, ...styles.approveButton}}
            >
               Aprobar
            </button>
            <button
              onClick={handleReject}
              style={{...styles.actionButton, ...styles.rejectButton}}
            >
               Rechazar
            </button>
            <button
              onClick={handleClose}
              style={{...styles.actionButton, ...styles.cancelButton}}
            >
              Cancelar
            </button>
          </div>
        )}

        {action && (
          <form onSubmit={handleSubmit}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>
                Comentarios {action === 'reject' && <span style={styles.required}>*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows="4"
                style={styles.textarea}
                placeholder={action === 'reject' ? 'Explica la razón del rechazo...' : 'Comentarios adicionales (opcional)'}
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p style={styles.requirementText}>
                  Debes proporcionar una razón para rechazar
                </p>
              )}
            </div>

            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            <div style={styles.submitActions}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  backgroundColor: action === 'approve' ? '#2E7D32' : '#ef4444',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'Procesando...' : `Confirmar ${action === 'approve' ? 'Aprobación' : 'Rechazo'}`}
              </button>
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={loading}
                style={styles.backButton}
              >
                Atrás
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const getStyles = (t) => ({
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    padding: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: t.text,
    marginBottom: '20px'
  },
  infoSection: {
    marginBottom: '20px'
  },
  infoLabel: {
    fontSize: '13px',
    color: t.textMuted,
    marginBottom: '4px'
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  actionButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  approveButton: {
    backgroundColor: t.success,
    color: 'white'
  },
  rejectButton: {
    backgroundColor: t.error,
    color: 'white'
  },
  cancelButton: {
    backgroundColor: t.bgPanel,
    color: t.text
  },
  formField: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: t.text,
    marginBottom: '8px'
  },
  required: {
    color: t.error
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: t.bgCard,
    color: t.text
  },
  requirementText: {
    fontSize: '12px',
    color: t.error,
    marginTop: '6px'
  },
  errorBox: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: `${t.error}10`,
    border: `1px solid ${t.error}50`,
    borderRadius: '6px',
    color: t.error,
    fontSize: '14px'
  },
  submitActions: {
    display: 'flex',
    gap: '12px'
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  backButton: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: t.bgPanel,
    color: t.text,
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
});

export default ECRApprovalModal;
