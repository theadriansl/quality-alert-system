/**
 * DisabledFieldWrapper Component
 * Wraps form fields with a tooltip explaining why they are disabled
 * Shows contextual messages based on approval status, permissions, etc.
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Clock, User, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DisabledFieldWrapper = ({
  children,
  isDisabled = false,
  reason, // 'approval_pending', 'not_primary', 'section_approved', 'requires_previous', 'admin_only', 'custom'
  customMessage,
  waitingForUser,
  requiredStep,
  primaryUser,
  position = 'top', // 'top', 'bottom', 'left', 'right'
  showIcon = true,
  language = 'es'
}) => {
  const { theme: t } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);

  const translations = {
    es: {
      approval_pending: 'Esperando aprobación de:',
      not_primary: 'Solo el responsable principal puede editar:',
      section_approved: 'Sección ya aprobada - Solo lectura',
      requires_previous: 'Requiere completar primero:',
      admin_only: 'Solo administradores pueden modificar',
      under_review: 'En revisión - No se puede editar',
      locked: 'Campo bloqueado'
    },
    en: {
      approval_pending: 'Waiting for approval from:',
      not_primary: 'Only primary responsible can edit:',
      section_approved: 'Section already approved - Read only',
      requires_previous: 'Requires completing first:',
      admin_only: 'Only administrators can modify',
      under_review: 'Under review - Cannot edit',
      locked: 'Field locked'
    }
  };

  const tr = translations[language] || translations.es;

  // Get reason configuration
  const getReasonConfig = () => {
    switch (reason) {
      case 'approval_pending':
        return {
          icon: Clock,
          color: t.warning,
          message: `${tr.approval_pending} ${waitingForUser || 'Usuario'}`
        };
      case 'not_primary':
        return {
          icon: User,
          color: t.accent,
          message: `${tr.not_primary} ${primaryUser || 'Usuario asignado'}`
        };
      case 'section_approved':
        return {
          icon: CheckCircle,
          color: t.success,
          message: tr.section_approved
        };
      case 'requires_previous':
        return {
          icon: AlertCircle,
          color: t.warning,
          message: `${tr.requires_previous} ${requiredStep || 'paso anterior'}`
        };
      case 'admin_only':
        return {
          icon: Shield,
          color: t.error,
          message: tr.admin_only
        };
      case 'under_review':
        return {
          icon: Clock,
          color: t.warning,
          message: tr.under_review
        };
      case 'custom':
        return {
          icon: Lock,
          color: t.textMuted,
          message: customMessage || tr.locked
        };
      default:
        return {
          icon: Lock,
          color: t.textMuted,
          message: customMessage || tr.locked
        };
    }
  };

  const config = getReasonConfig();
  const Icon = config.icon;

  // Position calculations
  const getTooltipPosition = () => {
    const positions = {
      top: {
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '8px'
      },
      bottom: {
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px'
      },
      left: {
        right: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginRight: '8px'
      },
      right: {
        left: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginLeft: '8px'
      }
    };
    return positions[position] || positions.top;
  };

  const getArrowPosition = () => {
    const arrows = {
      top: {
        bottom: '-6px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)'
      },
      bottom: {
        top: '-6px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)'
      },
      left: {
        right: '-6px',
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)'
      },
      right: {
        left: '-6px',
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)'
      }
    };
    return arrows[position] || arrows.top;
  };

  const styles = {
    wrapper: {
      position: 'relative',
      display: 'inline-block',
      width: '100%'
    },
    disabledOverlay: {
      position: 'relative',
      cursor: 'not-allowed'
    },
    iconBadge: {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: config.color,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
    },
    tooltip: {
      position: 'absolute',
      ...getTooltipPosition(),
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '200px',
      maxWidth: '280px'
    },
    tooltipArrow: {
      position: 'absolute',
      ...getArrowPosition(),
      width: '12px',
      height: '12px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderTop: position === 'bottom' ? `1px solid ${t.border}` : 'none',
      borderLeft: position === 'right' ? `1px solid ${t.border}` : 'none',
      borderBottom: position === 'top' ? 'none' : undefined,
      borderRight: position === 'left' ? 'none' : undefined
    },
    tooltipContent: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    },
    tooltipIcon: {
      flexShrink: 0,
      width: '28px',
      height: '28px',
      borderRadius: '6px',
      backgroundColor: config.color + '15',
      color: config.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    tooltipText: {
      fontSize: '13px',
      lineHeight: '1.4',
      color: t.text,
      fontWeight: '500'
    },
    childWrapper: {
      opacity: isDisabled ? 0.6 : 1,
      pointerEvents: isDisabled ? 'none' : 'auto',
      filter: isDisabled ? 'grayscale(30%)' : 'none'
    }
  };

  // If not disabled, just render children
  if (!isDisabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      style={styles.wrapper}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <div style={styles.disabledOverlay}>
        {/* Icon Badge */}
        {showIcon && (
          <div style={styles.iconBadge}>
            <Lock size={10} />
          </div>
        )}

        {/* Disabled Children */}
        <div style={styles.childWrapper}>
          {children}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            ref={tooltipRef}
            style={styles.tooltip}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div style={styles.tooltipArrow} />
            <div style={styles.tooltipContent}>
              <div style={styles.tooltipIcon}>
                <Icon size={14} />
              </div>
              <span style={styles.tooltipText}>{config.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function to determine the reason based on common 8D workflow states
export const getDisabledReason = ({
  status,
  currentApprovalStep,
  isPrimaryUser,
  isApprover,
  isAdmin,
  currentUserInProcess,
  requiredPreviousStep
}) => {
  if (isAdmin) {
    return null; // Admins can always edit
  }

  if (status === 'approved') {
    return { reason: 'section_approved' };
  }

  if (status === 'under_review' || (currentApprovalStep >= 1 && currentApprovalStep <= 3)) {
    if (!isApprover) {
      return {
        reason: 'approval_pending',
        waitingForUser: currentUserInProcess
      };
    }
  }

  if (!isPrimaryUser && status === 'draft') {
    return {
      reason: 'not_primary',
      primaryUser: currentUserInProcess
    };
  }

  if (requiredPreviousStep) {
    return {
      reason: 'requires_previous',
      requiredStep: requiredPreviousStep
    };
  }

  return null;
};

export default DisabledFieldWrapper;
