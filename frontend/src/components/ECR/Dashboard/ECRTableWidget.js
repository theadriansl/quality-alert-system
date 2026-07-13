import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

/**
 * ECR Table Widget
 * Shows a list of ECRs with key information
 * Admin users can delete ECRs
 */
const ECRTableWidget = ({ ecrs = [], loading = false, isAdmin = false, onDelete, language = 'es' }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);

  const styles = {
    container: {
      width: '100%',
      overflowX: 'auto'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      padding: '10px 12px',
      textAlign: 'left',
      backgroundColor: t.bgPanel,
      borderBottom: `2px solid ${t.border}`,
      fontWeight: '600',
      color: t.textMuted,
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '10px 12px',
      borderBottom: `1px solid ${t.border}`,
      color: t.text
    },
    row: {
      cursor: 'pointer',
      transition: 'background-color 0.15s'
    },
    ecrNumber: {
      fontWeight: '600',
      color: t.accent
    },
    title: {
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600'
    },
    stageDots: {
      display: 'flex',
      gap: '4px'
    },
    stageDot: {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '700'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    },
    loadingState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    },
    deleteButton: {
      backgroundColor: `${t.error}15`,
      color: t.error,
      border: 'none',
      borderRadius: '6px',
      padding: '6px 10px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      transition: 'all 0.2s'
    },
    deleteButtonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    actionsCell: {
      textAlign: 'center',
      width: '80px'
    }
  };

  const getStatusStyle = (status) => {
    const statusColors = {
      draft: { bg: '#f1f5f9', color: '#475569' },
      submitted: { bg: '#dbeafe', color: '#1d4ed8' },
      pending_approval: { bg: '#fef3c7', color: '#92400e' },
      approved: { bg: '#dcfce7', color: '#166534' },
      rejected: { bg: '#fee2e2', color: '#991b1b' },
      closed: { bg: '#e0e7ff', color: '#4338ca' }
    };
    return statusColors[status] || statusColors.draft;
  };

  const getStatusLabel = (status) => {
    const labels = language === 'es' ? {
      draft: 'Borrador',
      submitted: 'Enviado',
      pending_approval: 'En Aprobacion',
      approved: 'Aprobado',
      rejected: 'Devuelto',
      closed: 'Cerrado'
    } : {
      draft: 'Draft',
      submitted: 'Submitted',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Returned',
      closed: 'Closed'
    };
    return labels[status] || status;
  };

  const getCategoryLabel = (category) => {
    const labels = language === 'es' ? {
      emergency: 'Emergencia',
      planned: 'Planeado',
      continuous_improvement: 'Mejora Continua'
    } : {
      emergency: 'Emergency',
      planned: 'Planned',
      continuous_improvement: 'Continuous Improvement'
    };
    return labels[category] || category || '-';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const handleDelete = async (e, ecr) => {
    e.stopPropagation(); // Prevent row click navigation

    const confirmed = window.confirm(
      language === 'es'
        ? `¿Eliminar ${ecr.ecrNumber}?\n\n"${ecr.changeTitle || 'Sin titulo'}"\n\nEsta accion no se puede deshacer.`
        : `Delete ${ecr.ecrNumber}?\n\n"${ecr.changeTitle || 'No title'}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(ecr.id);
      if (onDelete) {
        await onDelete(ecr.id);
      }
    } catch (error) {
      console.error('Error deleting ECR:', error);
      alert(language === 'es' ? 'Error al eliminar el ECR' : 'Error deleting ECR');
    } finally {
      setDeleting(null);
    }
  };

  // Render stage completion dots
  const renderStageDots = (stageCompletionStatus) => {
    const stages = [
      { id: 'ecr1', label: '1', color: '#0072CE' },
      { id: 'ecr2', label: '2', color: '#2E7D32' },
      { id: 'ecr2b', label: '2B', color: '#C77700' },
      { id: 'ecr3', label: '3', color: '#8b5cf6' },
      { id: 'ecr4', label: '4', color: '#ec4899' }
    ];

    return (
      <div style={styles.stageDots}>
        {stages.map(stage => {
          const isComplete = stageCompletionStatus?.[stage.id]?.completed;
          return (
            <div
              key={stage.id}
              style={{
                ...styles.stageDot,
                backgroundColor: isComplete ? stage.color : t.bgPanel,
                color: isComplete ? 'white' : t.textDim
              }}
              title={`ECR-${stage.label}: ${isComplete ? (language === 'es' ? 'Completada' : 'Completed') : (language === 'es' ? 'Pendiente' : 'Pending')}`}
            >
              {isComplete ? '' : stage.label}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div style={styles.loadingState}>{language === 'es' ? 'Cargando ECRs...' : 'Loading ECRs...'}</div>;
  }

  if (!ecrs || ecrs.length === 0) {
    return <div style={styles.emptyState}>{language === 'es' ? 'No hay ECRs registrados' : 'No ECRs registered'}</div>;
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ECR #</th>
            <th style={styles.th}>{language === 'es' ? 'Titulo' : 'Title'}</th>
            <th style={styles.th}>{language === 'es' ? 'Solicitante' : 'Requestor'}</th>
            <th style={styles.th}>{language === 'es' ? 'Categoria' : 'Category'}</th>
            <th style={styles.th}>{language === 'es' ? 'F. Planeada' : 'Planned Date'}</th>
            <th style={styles.th}>{language === 'es' ? 'F. Efectiva' : 'Effective Date'}</th>
            <th style={styles.th}>{language === 'es' ? 'Etapas' : 'Stages'}</th>
            <th style={styles.th}>Status</th>
            {isAdmin && <th style={{ ...styles.th, ...styles.actionsCell }}>{language === 'es' ? 'Acciones' : 'Actions'}</th>}
          </tr>
        </thead>
        <tbody>
          {ecrs.map((ecr) => {
            const statusStyle = getStatusStyle(ecr.status);
            const isDeleting = deleting === ecr.id;

            return (
              <tr
                key={ecr.id}
                style={styles.row}
                onClick={() => navigate(`/ecr-workflow/${ecr.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ ...styles.td, ...styles.ecrNumber }}>
                  {ecr.ecrNumber}
                </td>
                <td style={{ ...styles.td, ...styles.title }} title={ecr.changeTitle}>
                  {ecr.changeTitle || (language === 'es' ? 'Sin titulo' : 'No title')}
                </td>
                <td style={styles.td}>
                  {ecr.requestorDepartment || ecr.requestorName || '-'}
                </td>
                <td style={styles.td}>
                  {getCategoryLabel(ecr.changeCategory)}
                </td>
                <td style={styles.td}>
                  {formatDate(ecr.plannedAdoptionDate)}
                </td>
                <td style={styles.td}>
                  {formatDate(ecr.effectiveDate)}
                </td>
                <td style={styles.td}>
                  {renderStageDots(ecr.stageCompletionStatus)}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color
                  }}>
                    {getStatusLabel(ecr.status)}
                  </span>
                </td>
                {isAdmin && (
                  <td style={{ ...styles.td, ...styles.actionsCell }}>
                    <button
                      onClick={(e) => handleDelete(e, ecr)}
                      disabled={isDeleting}
                      style={{
                        ...styles.deleteButton,
                        ...(isDeleting ? styles.deleteButtonDisabled : {})
                      }}
                      onMouseEnter={(e) => {
                        if (!isDeleting) {
                          e.currentTarget.style.backgroundColor = '#fca5a5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDeleting) {
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                        }
                      }}
                      title={language === 'es' ? 'Eliminar ECR' : 'Delete ECR'}
                    >
                      <Trash2 size={14} />
                      {isDeleting ? '...' : ''}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ECRTableWidget;
