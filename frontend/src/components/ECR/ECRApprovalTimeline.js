import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ECRApprovalTimeline = ({ approvalHistory, language = 'es' }) => {
  const { theme: t } = useTheme();
  const { t: tr, language: lang, changeLanguage } = useLanguage();

  if (!approvalHistory || approvalHistory.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '24px',
        fontSize: '13px',
        color: t.textMuted,
        backgroundColor: t.bgCard,
        borderRadius: '8px',
        border: `1px solid ${t.border}`
      }}>
        {language === 'es' ? 'No hay historial de aprobaciones aún' : 'No approval history yet'}
      </div>
    );
  }

  // Sort by timestamp descending (most recent first)
  const sortedHistory = [...approvalHistory].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.createdAt || a.created_at);
    const dateB = new Date(b.timestamp || b.createdAt || b.created_at);
    return dateB - dateA;
  });

  const actionStyles = language === 'es' ? {
    submitted: { bg: '#dbeafe', color: '#1e40af', label: '→ Enviado' },
    approved: { bg: '#d1fae5', color: '#166534', label: '✓ Aprobado' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: '↩ Devuelto' },
    resubmitted: { bg: '#fef3c7', color: '#92400e', label: '↻ Re-enviado' }
  } : {
    submitted: { bg: '#dbeafe', color: '#1e40af', label: '→ Submitted' },
    approved: { bg: '#d1fae5', color: '#166534', label: '✓ Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: '↩ Returned' },
    resubmitted: { bg: '#fef3c7', color: '#92400e', label: '↻ Re-submitted' }
  };

  return (
    <div style={{
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      padding: '16px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
        {language === 'es' ? 'Historial de Aprobaciones' : 'Approval History'}
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: t.bg }}>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Acción' : 'Action'}</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Nivel' : 'Level'}</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Usuario' : 'User'}</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Fecha' : 'Date'}</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Comentarios' : 'Comments'}</th>
          </tr>
        </thead>
        <tbody>
          {sortedHistory.map((entry, index) => {
            const style = actionStyles[entry.action] || actionStyles.submitted;
            const approverName = entry.userName || entry.approverName || (language === 'es' ? 'Usuario' : 'User');
            const timestamp = entry.timestamp || entry.createdAt || entry.created_at;

            return (
              <tr key={index} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: '8px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    backgroundColor: style.bg,
                    color: style.color,
                    fontWeight: '600'
                  }}>
                    {style.label}
                  </span>
                </td>
                <td style={{ padding: '8px', fontWeight: '600' }}>
                  {entry.level ? (language === 'es' ? `Nivel ${entry.level}` : `Level ${entry.level}`) : '-'}
                </td>
                <td style={{ padding: '8px' }}>{approverName}</td>
                <td style={{ padding: '8px', color: t.textMuted }}>
                  {timestamp ? new Date(timestamp).toLocaleString('es-MX', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </td>
                <td style={{ padding: '8px', color: t.textMuted, maxWidth: '200px' }}>
                  {entry.comments || entry.notes || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ECRApprovalTimeline;
