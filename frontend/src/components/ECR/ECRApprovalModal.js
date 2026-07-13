import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ECRApprovalModal = ({
  isOpen,
  onClose,
  ecrId,
  level,
  onSuccess,
  language = 'es'
}) => {
  const { theme: t } = useTheme();
  const { t: tr, language: lang, changeLanguage } = useLanguage();
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

  const generateMailto = (mailtoData, actionType) => {
    if (!mailtoData) return;

    let toEmails = [];
    let ccEmails = [];
    let subject = '';
    let body = '';

    if (actionType === 'approve') {
      // If there's a next approver, notify them; otherwise notify all (creator + board + approvers)
      if (mailtoData.nextApproverEmail) {
        toEmails = [mailtoData.nextApproverEmail];
        subject = encodeURIComponent(`ECR ${mailtoData.ecrNumber} - Pendiente de tu Aprobación`);
        body = encodeURIComponent(
          `Hola ${mailtoData.nextApproverName || ''},\n\n` +
          `El ECR "${mailtoData.ecrNumber} - ${mailtoData.changeTitle}" ha sido aprobado en el nivel anterior y ahora está pendiente de tu aprobación.\n\n` +
          `Por favor revisa y toma acción en el sistema.\n\n` +
          `Saludos`
        );
      } else {
        // Fully approved - notify creator + Review Board + all approvers
        toEmails = mailtoData.allRecipientsEmails || [];
        if (mailtoData.creatorEmail && !toEmails.includes(mailtoData.creatorEmail)) {
          toEmails.push(mailtoData.creatorEmail);
        }
        subject = encodeURIComponent(`ECR ${mailtoData.ecrNumber} - Aprobado Completamente`);
        body = encodeURIComponent(
          `Equipo,\n\n` +
          `El ECR "${mailtoData.ecrNumber} - ${mailtoData.changeTitle}" ha sido APROBADO completamente.\n\n` +
          `Se puede proceder con la implementación del cambio.\n\n` +
          `Saludos`
        );
      }
    } else {
      // Rejected - notify creator AND Review Board
      toEmails = mailtoData.creatorEmail ? [mailtoData.creatorEmail] : [];
      ccEmails = mailtoData.reviewBoardEmails || [];
      subject = encodeURIComponent(`ECR ${mailtoData.ecrNumber} - Devuelto para Correcciones`);
      body = encodeURIComponent(
        `Hola ${mailtoData.creatorName || ''},\n\n` +
        `El ECR "${mailtoData.ecrNumber} - ${mailtoData.changeTitle}" ha sido devuelto para correcciones.\n\n` +
        `Motivo:\n${mailtoData.rejectionComments || comments}\n\n` +
        `Por favor realiza las correcciones necesarias y vuelve a enviar a aprobación.\n\n` +
        `Saludos`
      );
    }

    if (toEmails.length > 0) {
      let mailtoLink = `mailto:${toEmails.join(',')}?subject=${subject}&body=${body}`;
      if (ccEmails.length > 0) {
        mailtoLink = `mailto:${toEmails.join(',')}?cc=${ccEmails.join(',')}&subject=${subject}&body=${body}`;
      }
      window.open(mailtoLink, '_blank');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    if (action === 'reject' && !comments.trim()) {
      setError(language === 'es' ? 'Los comentarios son obligatorios al rechazar' : 'Comments are required when rejecting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'approve' ? 'approve' : 'reject';

      const response = await axios.post(
        `http://localhost:5000/ecr/${ecrId}/${endpoint}`,
        { level, comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess(language === 'es' ? ` ${action === 'approve' ? 'Aprobado' : 'Devuelto'} exitosamente` : ` ${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);

      // Generate mailto link
      if (response.data?.mailtoData) {
        generateMailto(response.data.mailtoData, action);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error(' Error en aprobación/rechazo:', err);
      setError(err.response?.data?.message || (language === 'es' ? 'Error al procesar la acción' : 'Error processing action'));
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
        <h2 style={styles.title}>{language === 'es' ? 'Revisar Aprobación de ECR' : 'Review ECR Approval'}</h2>

        <div style={styles.infoSection}>
          <p style={styles.infoLabel}>{language === 'es' ? 'Nivel de Aprobador' : 'Approver Level'}</p>
          <p style={styles.infoValue}>{language === 'es' ? 'Aprobador' : 'Approver'} {level}</p>
        </div>

        {!action && (
          <div style={styles.actionsContainer}>
            <button
              onClick={handleApprove}
              style={{...styles.actionButton, ...styles.approveButton}}
            >
               {language === 'es' ? 'Aprobar' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              style={{...styles.actionButton, ...styles.rejectButton}}
            >
               {language === 'es' ? 'Rechazar' : 'Reject'}
            </button>
            <button
              onClick={handleClose}
              style={{...styles.actionButton, ...styles.cancelButton}}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        )}

        {action && (
          <form onSubmit={handleSubmit}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>
                {language === 'es' ? 'Comentarios' : 'Comments'} {action === 'reject' && <span style={styles.required}>*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows="4"
                style={styles.textarea}
                placeholder={action === 'reject'
                  ? (language === 'es' ? 'Explica la razón del rechazo...' : 'Explain the reason for rejection...')
                  : (language === 'es' ? 'Comentarios adicionales (opcional)' : 'Additional comments (optional)')}
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p style={styles.requirementText}>
                  {language === 'es' ? 'Debes proporcionar una razón para rechazar' : 'You must provide a reason for rejection'}
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
                {loading
                  ? (language === 'es' ? 'Procesando...' : 'Processing...')
                  : (language === 'es' ? `Confirmar ${action === 'approve' ? 'Aprobación' : 'Rechazo'}` : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`)}
              </button>
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={loading}
                style={styles.backButton}
              >
                {language === 'es' ? 'Atrás' : 'Back'}
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
