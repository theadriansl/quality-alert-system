import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const AuditDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [findings, setFindings] = useState([]);
  const [nonConformities, setNonConformities] = useState([]);
  const [error, setError] = useState(null);

  const RESULT_CONFIG = {
    conformity: { label: 'Conformidad', color: t.success, icon: '' },
    nc_major: { label: 'NC Mayor', color: t.error, icon: '' },
    nc_minor: { label: 'NC Menor', color: t.warning, icon: '!' },
    observation: { label: 'Observación', color: '#8b5cf6', icon: '?' },
    opportunity: { label: 'Oportunidad', color: t.accent, icon: '+' },
    na: { label: 'N/A', color: t.textMuted, icon: '-' }
  };

  const STATUS_CONFIG = {
    in_progress: { label: 'En Proceso', color: t.warning },
    pending_actions: { label: 'Pendiente Acciones', color: t.error },
    closed: { label: 'Cerrada', color: t.success }
  };

  const loadAudit = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/audits/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setAudit(result.audit);
        setFindings(result.findings || []);
        setNonConformities(result.nonConformities || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted,
      marginTop: '4px'
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    },
    field: {
      marginBottom: '12px'
    },
    fieldLabel: {
      fontSize: '12px',
      color: t.textMuted,
      marginBottom: '4px'
    },
    fieldValue: {
      fontSize: '14px',
      fontWeight: '500',
      color: t.text
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    summary: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    },
    summaryItem: {
      textAlign: 'center',
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: t.bgPanel
    },
    summaryValue: {
      fontSize: '28px',
      fontWeight: '700'
    },
    summaryLabel: {
      fontSize: '11px',
      color: t.textMuted,
      marginTop: '4px'
    },
    score: {
      fontSize: '48px',
      fontWeight: '700',
      textAlign: 'center',
      padding: '24px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      borderBottom: `1px solid ${t.border}`,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      fontSize: '14px',
      color: t.text,
      borderBottom: `1px solid ${t.border}`
    },
    empty: {
      textAlign: 'center',
      padding: '24px',
      color: t.textMuted
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          Cargando auditoría...
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || 'Auditoría no encontrada'}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-calendar')}
          >
            Volver al Calendario
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[audit.status] || STATUS_CONFIG.in_progress;
  const scoreColor = audit.scorePercentage >= 90 ? t.success :
                     audit.scorePercentage >= 70 ? t.warning : t.error;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{audit.auditNumber}</h1>
          <p style={styles.subtitle}>{audit.scheduleAuditName || audit.areaProcess}</p>
        </div>
        <div style={styles.buttons}>
          {audit.status !== 'closed' && (
            <button
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
              onClick={() => navigate(`/audit-execute/${audit.scheduleId}`)}
            >
               Continuar Auditoría
            </button>
          )}
          <button
            style={{ ...styles.button, backgroundColor: '#8b5cf6', color: 'white' }}
            onClick={() => navigate('/audit-ncs')}
          >
             Ver NCs
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-calendar')}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Audit Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           Información de la Auditoría
          <span style={{
            ...styles.badge,
            marginLeft: 'auto',
            backgroundColor: `${statusConfig.color}20`,
            color: statusConfig.color
          }}>
            {statusConfig.label}
          </span>
        </h2>

        <div style={styles.grid2}>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Fecha de Auditoría</div>
            <div style={styles.fieldValue}>
              {new Date(audit.auditDate).toLocaleDateString('es-MX', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Área/Proceso</div>
            <div style={styles.fieldValue}>{audit.areaProcess || '-'}</div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Auditor Líder</div>
            <div style={styles.fieldValue}>{audit.leadAuditorName || '-'}</div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Auditados Presentes</div>
            <div style={styles.fieldValue}>
              {audit.auditeesPresent?.join(', ') || '-'}
            </div>
          </div>
          {audit.closedAt && (
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Cerrada por</div>
              <div style={styles.fieldValue}>
                {audit.closedByName} - {new Date(audit.closedAt).toLocaleDateString('es-MX')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Score */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> Score de Auditoría</h2>
          <div style={{ ...styles.score, color: scoreColor }}>
            {audit.scorePercentage?.toFixed(1) || 0}%
          </div>
        </div>

        {/* Results Summary */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> Resumen de Hallazgos</h2>
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.success }}>{audit.conformities || 0}</div>
              <div style={styles.summaryLabel}>Conformidades</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.error }}>{audit.nonConformitiesMajor || 0}</div>
              <div style={styles.summaryLabel}>NC Mayor</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.warning }}>{audit.nonConformitiesMinor || 0}</div>
              <div style={styles.summaryLabel}>NC Menor</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: '#8b5cf6' }}>{audit.observations || 0}</div>
              <div style={styles.summaryLabel}>Observaciones</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.accent }}>{audit.opportunities || 0}</div>
              <div style={styles.summaryLabel}>Oportunidades</div>
            </div>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> Hallazgos Detallados</h2>

        {findings.length === 0 ? (
          <div style={styles.empty}>No hay hallazgos registrados</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cláusula</th>
                <th style={styles.th}>Pregunta</th>
                <th style={styles.th}>Resultado</th>
                <th style={styles.th}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {findings.map(finding => {
                const resultConfig = RESULT_CONFIG[finding.result] || RESULT_CONFIG.na;
                return (
                  <tr key={finding.id}>
                    <td style={styles.td}>{finding.clause || finding.itemClause || '-'}</td>
                    <td style={styles.td}>{finding.itemQuestion || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: `${resultConfig.color}20`,
                        color: resultConfig.color
                      }}>
                        {resultConfig.icon} {resultConfig.label}
                      </span>
                    </td>
                    <td style={styles.td}>{finding.findingDescription || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Non-Conformities */}
      {nonConformities.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> No Conformidades</h2>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Número</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Descripción</th>
                <th style={styles.th}>Responsable</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {nonConformities.map(nc => (
                <tr key={nc.id}>
                  <td style={styles.td}>{nc.ncNumber}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: nc.ncType === 'major' ? `${t.error}20` : `${t.warning}20`,
                      color: nc.ncType === 'major' ? t.error : t.warning
                    }}>
                      {nc.ncType === 'major' ? 'Mayor' : 'Menor'}
                    </span>
                  </td>
                  <td style={styles.td}>{nc.description}</td>
                  <td style={styles.td}>{nc.responsibleName || 'Sin asignar'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: nc.status === 'closed' ? `${t.success}20` : `${t.warning}20`,
                      color: nc.status === 'closed' ? t.success : t.warning
                    }}>
                      {nc.status === 'closed' ? 'Cerrada' : nc.status === 'open' ? 'Abierta' : 'En Proceso'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{ ...styles.button, padding: '6px 12px', backgroundColor: t.accent, color: 'white' }}
                      onClick={() => navigate(`/audit-nc/${nc.id}`)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditDetail;
