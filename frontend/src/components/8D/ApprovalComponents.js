/**
 * ApprovalComponents.js
 * Shared approval UI components for D3, D4, D5 tabs
 * Design Labs Contract: Presentation-only, theme tokens, no handler changes
 */
import React from 'react';

/**
 * ApprovalSteps - Visual step indicators for approval workflow
 * Shows configured approvers with status (approved/rejected/current/pending)
 */
export const ApprovalSteps = ({
  configuredApprovers,
  currentStep,
  approvalHistory,
  users,
  getUserIds,
  themeColors
}) => {
  const t = themeColors;

  if (!configuredApprovers || configuredApprovers.length === 0) return null;

  const userIds = getUserIds();

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      justifyContent: 'center'
    }}>
      {configuredApprovers.map(step => {
        const isPast = step < currentStep;
        const isCurrent = step === currentStep;
        const approvalData = approvalHistory[`approval${step}`];
        const approverId = userIds[step];
        const approverUser = users.find(u => u.id === approverId);
        const approverName = approverUser
          ? `${approverUser.firstName || approverUser.first_name || ''} ${approverUser.lastName || approverUser.last_name || ''}`.trim() || approverUser.email
          : `ID: ${approverId}`;
        const approverEmail = approverUser?.email || '';

        // Theme-based status colors
        let bgColor = t.bgPanel;
        let borderStyle = `1px solid ${t.border}`;

        if (isPast) {
          bgColor = approvalData?.status === 'approved' ? t.successBg : t.errorBg;
        } else if (isCurrent) {
          bgColor = t.accentBg;
          borderStyle = `3px solid ${t.primary}`;
        }

        return (
          <div
            key={step}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '6px',
              border: borderStyle,
              backgroundColor: bgColor,
              textAlign: 'center'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '5px', fontSize: '13px', color: t.text }}>
              {isPast && approvalData?.status === 'approved' && ' '}
              {isPast && approvalData?.status === 'rejected' && ' '}
              {isCurrent && ' '}
              {approverName}
            </div>
            {approverEmail && (
              <div style={{ fontSize: '11px', color: t.primary, marginBottom: '4px' }}>
                {approverEmail}
              </div>
            )}
            <div style={{ fontSize: '11px', color: t.textMuted }}>
              {isPast && approvalData?.status === 'approved' && (
                <>Aprobado {approvalData?.at && `el ${new Date(approvalData.at).toLocaleDateString()}`}</>
              )}
              {isPast && approvalData?.status === 'rejected' && (
                <>Rechazado</>
              )}
              {isCurrent && 'Pendiente de aprobación'}
              {!isPast && !isCurrent && 'En espera'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * ApprovalHistory - Full audit trail of approval actions
 * Shows approved/rejected/submitted entries with borderLeft indicator
 */
export const ApprovalHistory = ({
  historyEntries,
  sectionLabel,
  themeColors
}) => {
  const t = themeColors;

  if (!historyEntries || historyEntries.length === 0) return null;

  return (
    <div style={{
      backgroundColor: t.bgCard,
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '15px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '10px', color: t.text }}>
        Historial de Aprobaciones {sectionLabel} ({historyEntries.length} registros):
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {historyEntries.map((entry, index) => {
          const isApproved = entry.actionType === 'approved';
          const isRejected = entry.actionType === 'rejected';
          const isSubmitted = entry.actionType === 'submitted_for_approval';

          // Theme-based status colors
          let bgColor = t.infoBg;
          let borderColor = t.primary;
          let textColor = t.primary;

          if (isApproved) {
            bgColor = t.successBg;
            borderColor = t.successFg;
            textColor = t.successFg;
          } else if (isRejected) {
            bgColor = t.errorBg;
            borderColor = t.errorFg;
            textColor = t.errorFg;
          }

          return (
            <div key={entry.id || index} style={{
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: bgColor,
              borderLeft: `4px solid ${borderColor}`,
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: textColor }}>
                  {entry.userName || 'Usuario'}
                </strong>
                <span style={{ fontSize: '11px', color: t.textMuted }}>
                  {entry.createdAt && new Date(entry.createdAt).toLocaleString('es-MX')}
                </span>
              </div>
              <div style={{ marginTop: '4px' }}>
                {isApproved && <span style={{ color: t.successFg }}>Aprobado</span>}
                {isRejected && <span style={{ color: t.errorFg }}>Rechazado</span>}
                {isSubmitted && <span style={{ color: t.primary }}>Enviado a Aprobacion</span>}
                {entry.description && (
                  <span style={{ marginLeft: '8px', color: t.textMuted }}>
                    - {entry.description}
                  </span>
                )}
              </div>
              {entry.newValue && typeof entry.newValue === 'object' && entry.newValue.comments && (
                <div style={{
                  marginTop: '6px',
                  padding: '6px',
                  backgroundColor: t.warningBg,
                  borderLeft: `3px solid ${t.warningFg}`,
                  fontSize: '12px',
                  fontStyle: 'italic',
                  color: t.text
                }}>
                  Comentarios: {entry.newValue.comments}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * EscalationPathDisplay - Shows role cards for escalation path
 * Responsable + up to 3 approvers with semantic colors
 */
export const EscalationPathDisplay = ({
  escalationUsers,
  users,
  sectionLabel,
  emptyMessage,
  themeColors
}) => {
  const t = themeColors;

  if (!escalationUsers || escalationUsers.length === 0) {
    return (
      <div style={{
        color: t.errorFg,
        fontSize: '13px',
        padding: '12px',
        backgroundColor: t.errorBg,
        borderRadius: '6px'
      }}>
        {emptyMessage || 'No hay usuarios asignados.'}
      </div>
    );
  }

  // Role definitions with semantic theme tokens
  const roles = [
    { index: 0, label: 'Responsable', colorToken: 'accent' },
    { index: 1, label: 'Aprobador 1', colorToken: 'success' },
    { index: 2, label: 'Aprobador 2', colorToken: 'success' },
    { index: 3, label: 'Aprobador 3', colorToken: 'success' }
  ];

  // Get role colors based on token
  const getRoleColors = (colorToken) => {
    if (colorToken === 'accent') {
      return { color: t.accentFg, bgColor: t.accentBg, borderColor: t.accentBorder };
    }
    return { color: t.successFg, bgColor: t.successBg, borderColor: t.successBorder };
  };

  // Compatible with new format (object {id, name}) and old format (just ID)
  const getUserInfo = (userIdOrObject) => {
    if (!userIdOrObject) return null;

    // If already object with frozen name
    if (typeof userIdOrObject === 'object' && userIdOrObject.name) {
      const userId = userIdOrObject.id;
      const user = users.find(u => u.id === userId);
      return {
        name: userIdOrObject.name,
        email: user?.email || '',
        position: user?.position || user?.cargo || ''
      };
    }

    // Old format: just ID
    const userId = typeof userIdOrObject === 'object' ? userIdOrObject.id : userIdOrObject;
    const user = users.find(u => u.id === userId);
    const name = user
      ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
      : `ID: ${userId}`;
    const email = user?.email || '';
    const position = user?.position || user?.cargo || '';
    return { name, email, position };
  };

  return (
    <div style={{
      marginTop: '30px',
      backgroundColor: t.infoBg,
      border: `2px solid ${t.primary}`,
      borderRadius: '8px',
      padding: '20px'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: t.text,
        marginTop: 0,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        Escalation Path - {sectionLabel}
      </h3>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {roles.map(({ index, label, colorToken }) => {
          const userId = escalationUsers[index];
          if (!userId) return null;
          const info = getUserInfo(userId);
          if (!info) return null;
          const { color, bgColor, borderColor } = getRoleColors(colorToken);

          return (
            <div key={index} style={{
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '12px 16px',
              minWidth: '200px',
              flex: '1 1 200px'
            }}>
              <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px', fontWeight: '600' }}>
                {label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color }}>
                {info.name}
              </div>
              {info.email && (
                <div style={{ fontSize: '12px', color: t.primary, marginTop: '2px' }}>
                  {info.email}
                </div>
              )}
              {info.position && (
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                  {info.position}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * RevertToDraftModal - Admin modal to revert section to draft
 * Warning box with reason textarea
 */
export const RevertToDraftModal = ({
  show,
  onClose,
  onConfirm,
  comments,
  onCommentsChange,
  isReverting,
  sectionLabel,
  language,
  themeColors
}) => {
  const t = themeColors;

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: t.bgCard,
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          color: t.text,
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {language === 'es' ? `Regresar ${sectionLabel} a Borrador` : `Revert ${sectionLabel} to Draft`}
        </h3>

        <div style={{
          backgroundColor: t.errorBg,
          border: `1px solid ${t.errorBorder}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, color: t.errorFg, fontSize: '14px' }}>
            {language === 'es'
              ? 'Esta acción revertirá la sección a estado de borrador, permitiendo editar nuevamente. Se eliminará el estado de aprobación actual.'
              : 'This action will revert the section to draft status, allowing edits. Current approval status will be cleared.'}
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: t.text
          }}>
            {language === 'es' ? 'Razón (obligatorio):' : 'Reason (required):'}
          </label>
          <textarea
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder={language === 'es' ? 'Ingrese el motivo de la reversión...' : 'Enter reason for reverting...'}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${t.border}`,
              backgroundColor: t.bgInput || t.bgCard,
              color: t.text,
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: `1px solid ${t.border}`,
              backgroundColor: 'transparent',
              color: t.text,
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isReverting || !comments.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isReverting || !comments.trim() ? t.textMuted : t.errorFg,
              color: t.bgCard,
              cursor: isReverting || !comments.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {isReverting
              ? (language === 'es' ? 'Procesando...' : 'Processing...')
              : (language === 'es' ? 'Confirmar' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ApproveRejectButtons - Approve/Reject action buttons
 * Visible only to current approver when under review
 */
export const ApproveRejectButtons = ({
  onApprove,
  onReject,
  themeColors
}) => {
  const t = themeColors;

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    }}>
      <button
        onClick={onApprove}
        style={{
          padding: '12px 24px',
          backgroundColor: t.successFg,
          color: t.bgCard,
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => { e.target.style.opacity = '0.85'; }}
        onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
      >
         Aprobar
      </button>
      <button
        onClick={onReject}
        style={{
          padding: '12px 24px',
          backgroundColor: t.errorFg,
          color: t.bgCard,
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => { e.target.style.opacity = '0.85'; }}
        onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
      >
         Rechazar
      </button>
    </div>
  );
};

export default {
  ApprovalSteps,
  ApprovalHistory,
  EscalationPathDisplay,
  RevertToDraftModal,
  ApproveRejectButtons
};
