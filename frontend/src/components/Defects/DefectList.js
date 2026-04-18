import React, { useState, useEffect } from 'react';
import defectService from '../../services/defectService';
import { useTheme } from '../../context/ThemeContext';

/**
 * Lista de defectos capturados con filtros y acciones
 */
const DefectList = ({ onEdit, onView, filters = {}, compact = false }) => {
  const { theme: t } = useTheme();
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = compact ? 5 : 20;

  useEffect(() => {
    loadDefects();
  }, [filters, page]);

  const loadDefects = async () => {
    try {
      setLoading(true);
      const result = await defectService.getDefects({
        ...filters,
        limit,
        offset: page * limit
      });
      setDefects(result.entries || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError('Error cargando defectos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (defectId, newStatus) => {
    try {
      await defectService.updateDefect(defectId, { status: newStatus });
      loadDefects();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { label: 'Abierto', bg: t.id === 'dark' ? 'rgba(199, 119, 0, 0.2)' : '#fef3c7', color: t.warning },
      acknowledged: { label: 'Reconocido', bg: t.id === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe', color: t.primary },
      resolved: { label: 'Resuelto', bg: t.id === 'dark' ? 'rgba(46, 125, 50, 0.2)' : '#d1fae5', color: t.success },
      closed: { label: 'Cerrado', bg: t.bgPanel, color: t.textMuted }
    };
    const config = statusConfig[status] || statusConfig.open;

    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority, color) => {
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: color || '#6b7280',
        color: 'white'
      }}>
        {priority}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    header: {
      padding: '16px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    count: {
      fontSize: '14px',
      color: t.textMuted
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`,
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px 16px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    entryNumber: {
      fontWeight: '600',
      color: t.accent,
      cursor: 'pointer'
    },
    description: {
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    actions: {
      display: 'flex',
      gap: '8px'
    },
    actionBtn: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    viewBtn: {
      backgroundColor: t.id === 'dark' ? 'rgba(0, 114, 206, 0.2)' : '#eff6ff',
      color: t.accent
    },
    editBtn: {
      backgroundColor: t.id === 'dark' ? 'rgba(199, 119, 0, 0.2)' : '#fef3c7',
      color: t.warning
    },
    pagination: {
      padding: '16px',
      borderTop: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    pageBtn: {
      padding: '8px 16px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      color: t.text,
      cursor: 'pointer',
      fontSize: '14px'
    },
    pageBtnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    },
    empty: {
      textAlign: 'center',
      padding: '40px',
      color: t.textDim
    },
    error: {
      textAlign: 'center',
      padding: '20px',
      color: t.error,
      backgroundColor: t.id === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'
    }
  };

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Defectos Registrados</h3>
        <span style={styles.count}>{total} registros</span>
      </div>

      {loading ? (
        <div style={styles.loading}>Cargando...</div>
      ) : defects.length === 0 ? (
        <div style={styles.empty}>No hay defectos registrados</div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>No.</th>
                <th style={styles.th}>Descripción</th>
                <th style={styles.th}>Cliente</th>
                {!compact && <th style={styles.th}>Main Item</th>}
                <th style={styles.th}>Defecto</th>
                <th style={styles.th}>Prio</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Fecha</th>
                {!compact && <th style={styles.th}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {defects.map(defect => (
                <tr key={defect.id}>
                  <td style={styles.td}>
                    <span
                      style={styles.entryNumber}
                      onClick={() => onView && onView(defect)}
                    >
                      {defect.entryNumber}
                    </span>
                  </td>
                  <td style={{ ...styles.td, ...styles.description }} title={defect.autoDescription}>
                    {defect.autoDescription || '-'}
                  </td>
                  <td style={styles.td}>{defect.clientName || '-'}</td>
                  {!compact && <td style={styles.td}>{defect.mainItemName || '-'}</td>}
                  <td style={styles.td}>{defect.defectTypeName || '-'}</td>
                  <td style={styles.td}>
                    {getPriorityBadge(defect.priorityCode || '-', defect.priorityColor)}
                  </td>
                  <td style={styles.td}>{getStatusBadge(defect.status)}</td>
                  <td style={styles.td}>{formatDate(defect.capturedAt)}</td>
                  {!compact && (
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={{ ...styles.actionBtn, ...styles.viewBtn }}
                          onClick={() => onView && onView(defect)}
                        >
                          Ver
                        </button>
                        {defect.status === 'open' && (
                          <button
                            style={{ ...styles.actionBtn, ...styles.editBtn }}
                            onClick={() => onEdit && onEdit(defect)}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={{ ...styles.pageBtn, ...(page === 0 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ← Anterior
              </button>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Página {page + 1} de {totalPages}
              </span>
              <button
                style={{ ...styles.pageBtn, ...(page >= totalPages - 1 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DefectList;
