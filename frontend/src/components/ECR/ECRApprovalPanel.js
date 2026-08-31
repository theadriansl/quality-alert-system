import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ECRApprovalModal from './ECRApprovalModal';
import ECRApprovalTimeline from './ECRApprovalTimeline';

const ECRApprovalPanel = ({ ecrId, currentUser, onStatusChange, validationData, language = 'es' }) => {
  const { theme: t } = useTheme();
  const { t: tr, language: lang, changeLanguage } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const styles = getStyles(t);

  // Validation function to check if ECR can be submitted for approval (like ECR-4 pattern)
  const getApprovalValidationStatus = () => {
    const errors = [];

    // 1. Check that at least level1 approver is assigned
    // Use validationData.approvers first (from ECRValidationPlan), fallback to approvalStatus
    const approvers = validationData?.approvers;
    const hasLevel1Approver = approvers?.level1 || (approvalStatus?.approvalChain && approvalStatus.approvalChain.length > 0);
    if (!hasLevel1Approver) {
      errors.push(language === 'es' ? 'Aprobadores: Debe asignar al menos un aprobador de nivel 1' : 'Approvers: Must assign at least one level 1 approver');
    }

    // 2. Check validation actions (Master Plan) - all must be at 100%
    if (validationData?.validationActions && validationData.validationActions.length > 0) {
      const incompleteActions = validationData.validationActions.filter(action =>
        (action.actualProgress || 0) < 100
      );
      incompleteActions.forEach(action => {
        errors.push(`Master Plan: "${action.action}" (${action.actualProgress || 0}%)`);
      });
    }

    // 3. Check validation evidence - must be signed if required
    if (validationData?.validationEvidence) {
      const evidence = validationData.validationEvidence;
      if (evidence.requiresValidation === true && !evidence.isLocked) {
        errors.push(language === 'es' ? 'Evidencia de Validación: No está firmada' : 'Validation Evidence: Not signed');
      }
    }

    return {
      canSubmit: errors.length === 0,
      errors
    };
  };

  // Calculate validation status (re-calculates when dependencies change)
  const validationStatus = getApprovalValidationStatus();

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

  const generateSubmitMailto = (mailtoData) => {
    if (!mailtoData?.approverEmail) return;

    const subject = encodeURIComponent(`ECR ${mailtoData.ecrNumber} - Pendiente de tu Aprobación (Nivel ${mailtoData.level})`);
    const body = encodeURIComponent(
      `Hola ${mailtoData.approverName || ''},\n\n` +
      `Se ha enviado el ECR "${mailtoData.ecrNumber} - ${mailtoData.changeTitle}" para tu aprobación.\n\n` +
      `Por favor revisa y toma acción en el sistema.\n\n` +
      `Enviado por: ${mailtoData.submitterName}\n\n` +
      `Saludos`
    );

    const mailtoLink = `mailto:${mailtoData.approverEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleSubmitForApproval = () => {
    setShowConfirmSubmitModal(true);
  };

  const confirmSubmitForApproval = async () => {
    setShowConfirmSubmitModal(false);
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/ecr/${ecrId}/submit-for-approval`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(language === 'es' ? ' ECR enviado a aprobación exitosamente' : ' ECR submitted for approval successfully');

      // Generate mailto link
      if (response.data?.mailtoData) {
        generateSubmitMailto(response.data.mailtoData);
      }

      await loadApprovalStatus();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      showError(language === 'es' ? ` Error: ${error.response?.data?.message || 'No se pudo enviar a aprobación'}` : ` Error: ${error.response?.data?.message || 'Could not submit for approval'}`);
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
    // Admin can approve any pending level
    const isAdmin = user.role === 'admin' || user.systemRole === 'admin';
    if (isAdmin) return true;
    return pendingApprover.approverId === user.id;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>{language === 'es' ? 'Cargando estado de aprobación...' : 'Loading approval status...'}</p>
      </div>
    );
  }

  if (!approvalStatus) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{language === 'es' ? 'No se pudo cargar el estado de aprobación' : 'Could not load approval status'}</p>
      </div>
    );
  }

  const { currentStatus, pendingApprover, approvalHistory, createdBy, approvalChain, fullApprovalHistory } = approvalStatus;
  const canApprove = canUserApprove(currentUser, pendingApprover);

  const getChainStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { bg: t.successBg, border: t.success, color: t.successFg, icon: '✓', text: language === 'es' ? 'Aprobado' : 'Approved' };
      case 'rejected': return { bg: t.errorBg, border: t.error, color: t.errorFg, icon: '↩', text: language === 'es' ? 'Devuelto' : 'Returned' };
      case 'pending': return { bg: t.warningBg, border: t.warning, color: t.warningFg, icon: '⏳', text: language === 'es' ? 'Pendiente' : 'Pending' };
      default: return { bg: t.bgPanel, border: t.border, color: t.textMuted, icon: '○', text: language === 'es' ? 'No iniciado' : 'Not started' };
    }
  };

  const getStatusBadge = (status) => {
    const badges = language === 'es' ? {
      draft: { text: 'Borrador', color: t.textMuted },
      pending_approval: { text: 'Esperando Aprobación', color: t.warning },
      approved: { text: 'Aprobado', color: t.success },
      rejected: { text: 'Devuelto', color: t.error }
    } : {
      draft: { text: 'Draft', color: t.textMuted },
      pending_approval: { text: 'Pending Approval', color: t.warning },
      approved: { text: 'Approved', color: t.success },
      rejected: { text: 'Returned', color: t.error }
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

  return (
    <div style={styles.container}>
      {/* Current Status */}
      <div style={styles.statusCard}>
        <h3 style={styles.cardTitle}>{language === 'es' ? 'Estado de Aprobación del ECR' : 'ECR Approval Status'}</h3>

        <div style={styles.statusSection}>
          <p style={styles.statusLabel}>{language === 'es' ? 'Estado Actual:' : 'Current Status:'}</p>
          {getStatusBadge(currentStatus)}
        </div>

        {/* Submit for approval button (only if draft and user is creator) */}
        {currentStatus === 'draft' && createdBy === currentUser?.id && (
          <div style={{
            ...styles.submitSection,
            backgroundColor: validationStatus.canSubmit ? t.successBg : t.warningBg,
            border: `2px solid ${validationStatus.canSubmit ? t.success : t.warning}`,
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px'
          }}>
            {/* Show validation errors if any */}
            {!validationStatus.canSubmit && (
              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: t.errorBg,
                border: `1px solid ${t.errorBorder}`,
                borderRadius: '6px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: t.errorFg }}>
                  {language === 'es' ? 'No se puede enviar a aprobación. Pendientes:' : 'Cannot submit for approval. Pending:'}
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: t.errorFg }}>
                  {validationStatus.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {validationStatus.errors.length > 5 && (
                    <li style={{ color: t.textMuted }}>{language === 'es' ? `...y ${validationStatus.errors.length - 5} más` : `...and ${validationStatus.errors.length - 5} more`}</li>
                  )}
                </ul>
              </div>
            )}

            <button
              onClick={handleSubmitForApproval}
              disabled={submitting || !validationStatus.canSubmit}
              style={{
                ...styles.submitButton,
                backgroundColor: validationStatus.canSubmit ? t.accent : '#9ca3af',
                cursor: validationStatus.canSubmit ? 'pointer' : 'not-allowed',
                opacity: validationStatus.canSubmit ? 1 : 0.7
              }}
            >
              {submitting
                ? (language === 'es' ? 'Enviando...' : 'Submitting...')
                : (language === 'es' ? ' Enviar a Aprobación' : ' Submit for Approval')}
            </button>
            <p style={styles.submitHint}>
              {validationStatus.canSubmit
                ? (language === 'es' ? 'Al enviar a aprobación, comenzará el flujo de aprobaciones secuenciales' : 'Upon submission, the sequential approval flow will begin')
                : (language === 'es' ? 'Complete los pendientes arriba para poder enviar a aprobación' : 'Complete pending items above to submit for approval')}
            </p>
          </div>
        )}

        {/* Pending Approver Information */}
        {pendingApprover && (
          <div style={styles.pendingBox}>
            <p style={styles.pendingTitle}>
               {language === 'es' ? 'Esperando Aprobación' : 'Awaiting Approval'}
            </p>
            <p style={styles.pendingInfo}>
              <span style={styles.infoLabel}>{language === 'es' ? 'Nivel:' : 'Level:'}</span> {language === 'es' ? 'Aprobador' : 'Approver'} {pendingApprover.level}
            </p>
            <p style={styles.pendingInfo}>
              <span style={styles.infoLabel}>{language === 'es' ? 'Aprobador:' : 'Approver:'}</span> {pendingApprover.approverName}
            </p>
            <p style={styles.pendingInfo}>
              <span style={styles.infoLabel}>{language === 'es' ? 'Puesto:' : 'Position:'}</span> {pendingApprover.approverPosition}
            </p>

            {/* Approve/Reject button (only if current user can approve) */}
            {canApprove && (
              <div style={styles.approveSection}>
                <button
                  onClick={() => setShowModal(true)}
                  style={styles.approveButton}
                >
                   {language === 'es' ? 'Revisar y Aprobar/Rechazar' : 'Review and Approve/Reject'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Completed Status */}
        {currentStatus === 'approved' && (
          <div style={styles.completedBox}>
            <p style={styles.completedTitle}>
               {language === 'es' ? 'ECR Completamente Aprobado' : 'ECR Fully Approved'}
            </p>
            <p style={styles.completedText}>
              {language === 'es' ? 'Todas las aprobaciones han sido completadas exitosamente' : 'All approvals have been successfully completed'}
            </p>
          </div>
        )}

        {/* Rejected Status */}
        {currentStatus === 'rejected' && (
          <div style={styles.rejectedBox}>
            <p style={styles.rejectedTitle}>
              {language === 'es' ? 'ECR Devuelto' : 'ECR Returned'}
            </p>
            <p style={styles.rejectedText}>
              {language === 'es' ? 'El ECR fue devuelto para correcciones. Revisa los comentarios en el historial y realiza los ajustes necesarios.' : 'The ECR was returned for corrections. Review the comments in the history and make the necessary adjustments.'}
            </p>
            {createdBy === currentUser?.id && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={handleSubmitForApproval}
                  disabled={submitting}
                  style={{
                    ...styles.submitButton,
                    backgroundColor: t.warning
                  }}
                >
                  {submitting ? (language === 'es' ? 'Enviando...' : 'Submitting...') : (language === 'es' ? 'Re-enviar a Aprobación' : 'Re-submit for Approval')}
                </button>
                <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '8px' }}>
                  {language === 'es' ? 'El ECR será enviado directamente al aprobador que lo rechazó' : 'The ECR will be sent directly to the approver who rejected it'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Chain - Visual flow of all approvers (ECR-2B style) */}
      {approvalChain && approvalChain.length > 0 && (
        <div style={{ ...styles.statusCard, marginTop: '16px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '600', color: t.text, marginBottom: '16px' }}>
            {language === 'es' ? 'Flujo de Aprobación' : 'Approval Flow'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {approvalChain.map((approver, index) => {
              const statusStyle = getChainStatusStyle(approver.status);
              return (
                <React.Fragment key={approver.level}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: statusStyle.bg,
                    border: `1px solid ${statusStyle.border}`,
                    borderRadius: '8px',
                    minWidth: '180px'
                  }}>
                    {/* Step number */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: statusStyle.border,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {approver.level}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>
                        {approver.approverName}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textMuted }}>
                        {language === 'es' ? 'Aprobador' : 'Approver'} {approver.level}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        color: statusStyle.color,
                        marginTop: '2px'
                      }}>
                        {statusStyle.text}
                      </div>
                    </div>
                  </div>
                  {/* Arrow between steps */}
                  {index < approvalChain.length - 1 && (
                    <span style={{ fontSize: '18px', color: t.textMuted, fontWeight: '300' }}>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval Timeline - Use fullApprovalHistory if available (shows ALL actions including old rejections) */}
      {(fullApprovalHistory?.length > 0 || approvalHistory?.length > 0) && (
        <ECRApprovalTimeline
          approvalHistory={fullApprovalHistory?.length > 0 ? fullApprovalHistory : approvalHistory}
          language={language}
        />
      )}

      {/* Approval Modal */}
      {canApprove && (
        <ECRApprovalModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          ecrId={ecrId}
          level={pendingApprover.level}
          onSuccess={handleApprovalSuccess}
          language={language}
        />
      )}

      {/* Confirm Submit Modal (centered) */}
      {showConfirmSubmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '12px'
            }}>
              {language === 'es' ? 'Confirmar Envío a Aprobación' : 'Confirm Submit for Approval'}
            </h3>
            <p style={{
              fontSize: '14px',
              color: t.textMuted,
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              {language === 'es'
                ? '¿Estás seguro de que quieres enviar este ECR a aprobación? Una vez enviado, comenzará el flujo de aprobaciones.'
                : 'Are you sure you want to submit this ECR for approval? Once submitted, the approval flow will begin.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirmSubmitModal(false)}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: t.bgSecondary,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={confirmSubmitForApproval}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Sí, Enviar' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
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
    fontWeight: '600',
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
