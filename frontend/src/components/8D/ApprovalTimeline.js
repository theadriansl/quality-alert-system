/**
 * ApprovalTimeline Component (MEJORADO)
 * Enhanced timeline showing approval history with better visual design
 * Integrates with Framer Motion for smooth animations
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, MessageSquare, User, Calendar, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ApprovalTimeline = ({ approvalHistory, language = 'es' }) => {
  const { theme: t } = useTheme();

  const translations = {
    es: {
      noHistory: 'No hay historial de aprobaciones aún',
      title: 'Historial de Aprobaciones',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      level: 'Nivel',
      comment: 'Comentario'
    },
    en: {
      noHistory: 'No approval history yet',
      title: 'Approval History',
      approved: 'Approved',
      rejected: 'Rejected',
      level: 'Level',
      comment: 'Comment'
    }
  };

  const tr = translations[language] || translations.es;

  if (!approvalHistory || approvalHistory.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px 16px',
        color: t.textMuted,
        backgroundColor: t.bgPanel,
        borderRadius: '8px',
        border: `1px dashed ${t.border}`
      }}>
        <Clock size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <p style={{ margin: 0, fontSize: '14px' }}>{tr.noHistory}</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSectionName = (section) => {
    const names = {
      issue: 'Issue (D1-D2-D3)',
      countermeasure: 'Countermeasure (D4-D5-D6)',
      confirmation: 'Confirmation (D7-D8)'
    };
    return names[section] || section;
  };

  const styles = {
    container: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    header: {
      padding: '16px 20px',
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    headerIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: t.accent + '15',
      color: t.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    headerTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    timeline: {
      padding: '20px',
      position: 'relative'
    },
    timelineLine: {
      position: 'absolute',
      left: '39px',
      top: '20px',
      bottom: '20px',
      width: '2px',
      backgroundColor: t.border
    },
    item: {
      display: 'flex',
      gap: '16px',
      position: 'relative',
      paddingBottom: '20px'
    },
    itemLast: {
      paddingBottom: 0
    },
    iconWrapper: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      zIndex: 1,
      border: '3px solid'
    },
    content: {
      flex: 1,
      backgroundColor: t.bgPanel,
      borderRadius: '10px',
      padding: '14px 16px',
      border: `1px solid ${t.border}`
    },
    contentHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600'
    },
    sectionBadge: {
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '4px',
      backgroundColor: t.accent + '15',
      color: t.accent,
      fontWeight: '500'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: t.text
    },
    userAvatar: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: t.textMuted
    },
    position: {
      fontSize: '12px',
      color: t.textMuted,
      marginLeft: '4px'
    },
    comment: {
      marginTop: '10px',
      padding: '10px 12px',
      backgroundColor: t.bgCard,
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '13px',
      color: t.text,
      lineHeight: '1.5'
    },
    commentLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      color: t.textMuted,
      marginBottom: '6px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    timestamp: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: t.textMuted,
      marginTop: '10px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Clock size={16} />
        </div>
        <h3 style={styles.headerTitle}>{tr.title}</h3>
        <span style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: t.textMuted,
          backgroundColor: t.bgCard,
          padding: '4px 10px',
          borderRadius: '12px'
        }}>
          {approvalHistory.length} {approvalHistory.length === 1 ? 'entrada' : 'entradas'}
        </span>
      </div>

      <div style={styles.timeline}>
        {/* Timeline Line */}
        <div style={styles.timelineLine} />

        {/* Timeline Items */}
        {approvalHistory.map((approval, index) => {
          const isApproved = approval.action === 'approved';
          const isLast = index === approvalHistory.length - 1;

          return (
            <motion.div
              key={approval.id || index}
              style={{
                ...styles.item,
                ...(isLast ? styles.itemLast : {})
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Status Icon */}
              <div style={{
                ...styles.iconWrapper,
                backgroundColor: isApproved ? t.success + '15' : t.error + '15',
                borderColor: isApproved ? t.success : t.error,
                color: isApproved ? t.success : t.error
              }}>
                {isApproved ? <Check size={18} /> : <X size={18} />}
              </div>

              {/* Content */}
              <div style={styles.content}>
                <div style={styles.contentHeader}>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: isApproved ? t.success + '15' : t.error + '15',
                    color: isApproved ? t.success : t.error
                  }}>
                    {isApproved ? <Check size={12} /> : <X size={12} />}
                    <span>{isApproved ? tr.approved : tr.rejected}</span>
                    <span style={{ opacity: 0.7 }}>• {tr.level} {approval.approver_level}</span>
                  </div>
                  <span style={styles.sectionBadge}>
                    {getSectionName(approval.section)}
                  </span>
                </div>

                <div style={styles.userInfo}>
                  <div style={styles.userAvatar}>
                    <User size={12} />
                  </div>
                  <span style={{ fontWeight: '500' }}>
                    {approval.first_name} {approval.last_name}
                  </span>
                  {approval.position && (
                    <span style={styles.position}>• {approval.position}</span>
                  )}
                </div>

                {approval.comments && (
                  <div style={styles.comment}>
                    <div style={styles.commentLabel}>
                      <MessageSquare size={10} />
                      {tr.comment}
                    </div>
                    <p style={{ margin: 0 }}>{approval.comments}</p>
                  </div>
                )}

                <div style={styles.timestamp}>
                  <Calendar size={10} />
                  {formatDate(approval.created_at)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalTimeline;
