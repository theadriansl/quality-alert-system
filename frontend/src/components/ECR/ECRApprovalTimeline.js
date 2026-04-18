import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ECRApprovalTimeline = ({ approvalHistory }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);

  if (!approvalHistory || approvalHistory.length === 0) {
    return (
      <div style={styles.emptyState}>
        No hay historial de aprobaciones aún
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}> Historial de Aprobaciones</h3>

      <div style={styles.timeline}>
        {approvalHistory.map((approval, index) => (
          <div
            key={approval.id || index}
            style={{
              ...styles.timelineItem,
              borderLeftColor: approval.action === 'approved' ? '#2E7D32' : '#ef4444'
            }}
          >
            <div style={styles.itemContent}>
              <div style={styles.itemHeader}>
                <span style={{
                  fontSize: '20px',
                  color: approval.action === 'approved' ? '#2E7D32' : '#ef4444'
                }}>
                  {approval.action === 'approved' ? '' : ''}
                </span>
                <span style={styles.actionText}>
                  {approval.action === 'approved' ? 'Aprobado' : 'Rechazado'}
                </span>
                <span style={styles.levelText}>
                  - Nivel {approval.level}
                </span>
              </div>

              <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {approval.approverName}
                </span>
                <span style={styles.userPosition}>
                  • {approval.approverPosition}
                </span>
              </div>

              {approval.comments && (
                <div style={styles.commentsBox}>
                  <p style={styles.commentsText}>{approval.comments}</p>
                </div>
              )}

              <div style={styles.timestamp}>
                {formatDate(approval.createdAt || approval.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getStyles = (t) => ({
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    fontSize: '14px',
    color: t.textMuted,
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  container: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: t.text,
    marginBottom: '20px'
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  timelineItem: {
    borderLeft: '4px solid',
    paddingLeft: '16px',
    paddingTop: '8px',
    paddingBottom: '8px'
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  actionText: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text
  },
  levelText: {
    fontSize: '14px',
    color: t.textMuted
  },
  userInfo: {
    fontSize: '14px',
    color: t.text,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  userName: {
    fontWeight: '600'
  },
  userPosition: {
    color: t.textMuted
  },
  commentsBox: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: t.bgPanel,
    border: `1px solid ${t.border}`,
    borderRadius: '6px'
  },
  commentsText: {
    fontSize: '14px',
    color: t.text,
    margin: 0,
    lineHeight: '1.5'
  },
  timestamp: {
    fontSize: '12px',
    color: t.textMuted,
    marginTop: '4px'
  }
});

export default ECRApprovalTimeline;
