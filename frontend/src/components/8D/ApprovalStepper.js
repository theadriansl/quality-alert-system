/**
 * ApprovalStepper Component
 * Horizontal stepper showing approval workflow progress with visual states
 * Displays current step, completed steps, and pending steps in approval chain
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, X, User, AlertCircle, FileText } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ApprovalStepper = ({
  section = 'issue', // 'issue', 'countermeasure', 'confirmation'
  status, // 'draft', 'pending_approval_1', 'pending_approval_2', 'pending_approval_3', 'approved', 'rejected_by_a1', etc.
  currentStep = 0, // 0 = draft, 1-3 = approval steps, 4 = completed
  approvers = [], // Array of user objects [{id, name, position}, ...]
  approvalHistory = {}, // {approval1: {status, by, at}, approval2: {...}, approval3: {...}}
  users = [], // All users for resolving IDs
  compact = false,
  showLabels = true,
  language = 'es'
}) => {
  const { theme: t } = useTheme();

  const translations = {
    es: {
      draft: 'Borrador',
      creating: 'Creando',
      pendingReview: 'Pendiente de revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      approver: 'Aprobador',
      primary: 'Responsable Principal',
      completed: 'Completado',
      waitingFor: 'Esperando a',
      rejectedBy: 'Rechazado por',
      level: 'Nivel'
    },
    en: {
      draft: 'Draft',
      creating: 'Creating',
      pendingReview: 'Pending review',
      approved: 'Approved',
      rejected: 'Rejected',
      approver: 'Approver',
      primary: 'Primary Responsible',
      completed: 'Completed',
      waitingFor: 'Waiting for',
      rejectedBy: 'Rejected by',
      level: 'Level'
    }
  };

  const tr = translations[language] || translations.es;

  // Get section display name
  const getSectionName = () => {
    const names = {
      issue: { es: 'Issue (D1-D2-D3)', en: 'Issue (D1-D2-D3)' },
      countermeasure: { es: 'Countermeasure (D4-D5-D6)', en: 'Countermeasure (D4-D5-D6)' },
      confirmation: { es: 'Confirmation (D7-D8)', en: 'Confirmation (D7-D8)' }
    };
    return names[section]?.[language] || section;
  };

  // Parse status to determine step states
  const stepStates = useMemo(() => {
    const states = [
      { id: 0, label: tr.primary, status: 'pending' },
      { id: 1, label: `${tr.approver} 1`, status: 'pending' },
      { id: 2, label: `${tr.approver} 2`, status: 'pending' },
      { id: 3, label: `${tr.approver} 3`, status: 'pending' }
    ];

    // Update based on approval history
    if (approvalHistory.approval1?.status === 'approved') {
      states[1].status = 'approved';
    } else if (approvalHistory.approval1?.status === 'rejected') {
      states[1].status = 'rejected';
    }

    if (approvalHistory.approval2?.status === 'approved') {
      states[2].status = 'approved';
    } else if (approvalHistory.approval2?.status === 'rejected') {
      states[2].status = 'rejected';
    }

    if (approvalHistory.approval3?.status === 'approved') {
      states[3].status = 'approved';
    } else if (approvalHistory.approval3?.status === 'rejected') {
      states[3].status = 'rejected';
    }

    // Parse overall status
    if (status === 'draft') {
      states[0].status = 'current';
    } else if (status === 'pending_approval_1' || status === 'under_review') {
      states[0].status = 'approved';
      states[1].status = states[1].status === 'pending' ? 'current' : states[1].status;
    } else if (status === 'pending_approval_2') {
      states[0].status = 'approved';
      states[1].status = 'approved';
      states[2].status = states[2].status === 'pending' ? 'current' : states[2].status;
    } else if (status === 'pending_approval_3') {
      states[0].status = 'approved';
      states[1].status = 'approved';
      states[2].status = 'approved';
      states[3].status = states[3].status === 'pending' ? 'current' : states[3].status;
    } else if (status === 'approved') {
      states.forEach(s => { if (s.status === 'pending') s.status = 'approved'; });
    } else if (status?.startsWith('rejected_by_a')) {
      const rejectorLevel = parseInt(status.replace('rejected_by_a', ''));
      states[0].status = 'approved';
      for (let i = 1; i < rejectorLevel; i++) {
        states[i].status = 'approved';
      }
      states[rejectorLevel].status = 'rejected';
    }

    // Add user info to each step
    states.forEach((state, index) => {
      if (approvers[index]) {
        const user = typeof approvers[index] === 'object'
          ? approvers[index]
          : users.find(u => u.id === approvers[index]);
        state.user = user;
        state.userName = user?.name || user?.first_name
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
          : `Usuario ID: ${approvers[index]}`;
        state.userPosition = user?.position || '';
      }
    });

    return states;
  }, [status, approvalHistory, approvers, users, tr]);

  // Get overall progress percentage
  const getProgress = () => {
    const completedSteps = stepStates.filter(s => s.status === 'approved').length;
    return (completedSteps / stepStates.length) * 100;
  };

  // Get status icon
  const getStepIcon = (stepStatus) => {
    switch (stepStatus) {
      case 'approved':
        return <Check size={compact ? 14 : 16} />;
      case 'current':
        return <Clock size={compact ? 14 : 16} />;
      case 'rejected':
        return <X size={compact ? 14 : 16} />;
      default:
        return <User size={compact ? 14 : 16} />;
    }
  };

  // Get status color
  const getStepColor = (stepStatus) => {
    switch (stepStatus) {
      case 'approved':
        return t.success;
      case 'current':
        return t.accent;
      case 'rejected':
        return t.error;
      default:
        return t.textMuted;
    }
  };

  // Get background color for step circle
  const getStepBgColor = (stepStatus) => {
    switch (stepStatus) {
      case 'approved':
        return t.success + '20';
      case 'current':
        return t.accent + '20';
      case 'rejected':
        return t.error + '20';
      default:
        return t.bgPanel;
    }
  };

  const styles = {
    container: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: compact ? '12px 16px' : '16px 24px',
      marginBottom: '16px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: compact ? '12px' : '16px'
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: compact ? '13px' : '14px',
      fontWeight: '600',
      color: t.text
    },
    progressWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    progressBar: {
      width: '80px',
      height: '4px',
      backgroundColor: t.border,
      borderRadius: '2px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      borderRadius: '2px',
      transition: 'width 0.3s ease'
    },
    progressText: {
      fontSize: '12px',
      fontWeight: '500',
      color: t.textMuted
    },
    stepsContainer: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      position: 'relative'
    },
    connector: {
      position: 'absolute',
      top: compact ? '16px' : '20px',
      left: compact ? '32px' : '40px',
      right: compact ? '32px' : '40px',
      height: '2px',
      backgroundColor: t.border,
      zIndex: 0
    },
    connectorFill: {
      height: '100%',
      backgroundColor: t.success,
      transition: 'width 0.3s ease'
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 1,
      flex: 1,
      maxWidth: compact ? '80px' : '120px'
    },
    stepCircle: {
      width: compact ? '32px' : '40px',
      height: compact ? '32px' : '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid',
      transition: 'all 0.2s ease',
      position: 'relative'
    },
    stepLabel: {
      marginTop: '8px',
      fontSize: compact ? '10px' : '11px',
      fontWeight: '500',
      color: t.textMuted,
      textAlign: 'center'
    },
    stepUserName: {
      fontSize: compact ? '10px' : '12px',
      fontWeight: '600',
      color: t.text,
      textAlign: 'center',
      maxWidth: compact ? '70px' : '100px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    stepUserPosition: {
      fontSize: '9px',
      color: t.textMuted,
      textAlign: 'center'
    },
    currentBadge: {
      position: 'absolute',
      bottom: '-6px',
      right: '-6px',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      backgroundColor: t.accent,
      border: `2px solid ${t.bgCard}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    statusSummary: {
      marginTop: '12px',
      padding: '8px 12px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      fontWeight: '500'
    }
  };

  // Get current step user for status summary
  const getCurrentStepInfo = () => {
    const currentStepData = stepStates.find(s => s.status === 'current');
    if (currentStepData) {
      return {
        isWaiting: true,
        userName: currentStepData.userName,
        stepLabel: currentStepData.label
      };
    }

    const rejectedStep = stepStates.find(s => s.status === 'rejected');
    if (rejectedStep) {
      return {
        isRejected: true,
        userName: rejectedStep.userName,
        stepLabel: rejectedStep.label
      };
    }

    if (status === 'approved') {
      return { isCompleted: true };
    }

    return null;
  };

  const currentInfo = getCurrentStepInfo();
  const progress = getProgress();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          <FileText size={16} color={t.accent} />
          <span>{getSectionName()}</span>
        </div>
        <div style={styles.progressWrapper}>
          <div style={styles.progressBar}>
            <motion.div
              style={{
                ...styles.progressFill,
                backgroundColor: progress === 100 ? t.success : t.accent
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span style={styles.progressText}>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Steps */}
      <div style={styles.stepsContainer}>
        {/* Connector Line */}
        <div style={styles.connector}>
          <motion.div
            style={styles.connectorFill}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Step Circles */}
        {stepStates.map((step, index) => (
          <div key={step.id} style={styles.step}>
            <motion.div
              style={{
                ...styles.stepCircle,
                backgroundColor: getStepBgColor(step.status),
                borderColor: getStepColor(step.status),
                color: getStepColor(step.status)
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              title={step.userName}
            >
              {getStepIcon(step.status)}

              {/* Current step indicator */}
              {step.status === 'current' && (
                <motion.div
                  style={styles.currentBadge}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <Clock size={8} color="white" />
                </motion.div>
              )}
            </motion.div>

            {showLabels && (
              <>
                <span style={styles.stepLabel}>{step.label}</span>
                {step.userName && (
                  <span style={styles.stepUserName} title={step.userName}>
                    {step.userName}
                  </span>
                )}
                {step.userPosition && !compact && (
                  <span style={styles.stepUserPosition}>{step.userPosition}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Status Summary */}
      {currentInfo && !compact && (
        <div style={{
          ...styles.statusSummary,
          backgroundColor: currentInfo.isCompleted ? t.success + '15' :
                          currentInfo.isRejected ? t.error + '15' :
                          t.accent + '15',
          color: currentInfo.isCompleted ? t.success :
                 currentInfo.isRejected ? t.error :
                 t.accent
        }}>
          {currentInfo.isCompleted ? (
            <>
              <Check size={14} />
              <span>{tr.completed}</span>
            </>
          ) : currentInfo.isRejected ? (
            <>
              <AlertCircle size={14} />
              <span>{tr.rejectedBy}: {currentInfo.userName}</span>
            </>
          ) : (
            <>
              <Clock size={14} />
              <span>{tr.waitingFor}: {currentInfo.userName}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalStepper;
