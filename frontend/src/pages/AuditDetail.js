import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [findings, setFindings] = useState([]);
  const [nonConformities, setNonConformities] = useState([]);
  const [error, setError] = useState(null);

  const L = {
    en: {
      conformity: 'Conformity', ncMajor: 'Major NC', ncMinor: 'Minor NC', observation: 'Observation',
      opportunity: 'Opportunity', na: 'N/A', inProgress: 'In Progress', pendingActions: 'Pending Actions', closed: 'Closed',
      connectionError: 'Connection error', loading: 'Loading audit...', notFound: 'Audit not found',
      backToCalendar: 'Back to Calendar', continueAudit: 'Continue Audit', viewNCs: 'View NCs', back: 'Back',
      auditInfo: 'Audit Information', auditDate: 'Audit Date', areaProcess: 'Area/Process',
      leadAuditor: 'Lead Auditor', auditeesPresent: 'Auditees Present', closedBy: 'Closed by',
      auditScore: 'Audit Score', findingsSummary: 'Findings Summary',
      conformities: 'Conformities', observations: 'Observations', opportunities: 'Opportunities',
      detailedFindings: 'Detailed Findings', noFindings: 'No findings recorded',
      clause: 'Clause', question: 'Question', result: 'Result', description: 'Description',
      nonConformities: 'Non-Conformities', number: 'Number', type: 'Type', responsible: 'Responsible',
      status: 'Status', actions: 'Actions', unassigned: 'Unassigned', major: 'Major', minor: 'Minor',
      open: 'Open', view: 'View'
    },
    es: {
      conformity: 'Conformidad', ncMajor: 'NC Mayor', ncMinor: 'NC Menor', observation: 'Observación',
      opportunity: 'Oportunidad', na: 'N/A', inProgress: 'En Proceso', pendingActions: 'Pendiente Acciones', closed: 'Cerrada',
      connectionError: 'Error de conexión', loading: 'Cargando auditoría...', notFound: 'Auditoría no encontrada',
      backToCalendar: 'Volver al Calendario', continueAudit: 'Continuar Auditoría', viewNCs: 'Ver NCs', back: 'Volver',
      auditInfo: 'Información de la Auditoría', auditDate: 'Fecha de Auditoría', areaProcess: 'Área/Proceso',
      leadAuditor: 'Auditor Líder', auditeesPresent: 'Auditados Presentes', closedBy: 'Cerrada por',
      auditScore: 'Score de Auditoría', findingsSummary: 'Resumen de Hallazgos',
      conformities: 'Conformidades', observations: 'Observaciones', opportunities: 'Oportunidades',
      detailedFindings: 'Hallazgos Detallados', noFindings: 'No hay hallazgos registrados',
      clause: 'Cláusula', question: 'Pregunta', result: 'Resultado', description: 'Descripción',
      nonConformities: 'No Conformidades', number: 'Número', type: 'Tipo', responsible: 'Responsable',
      status: 'Estado', actions: 'Acciones', unassigned: 'Sin asignar', major: 'Mayor', minor: 'Menor',
      open: 'Abierta', view: 'Ver'
    }
  }[language] || {};

  const RESULT_CONFIG = {
    conformity: { label: L.conformity, color: t.success, icon: '' },
    nc_major: { label: L.ncMajor, color: t.error, icon: '' },
    nc_minor: { label: L.ncMinor, color: t.warning, icon: '!' },
    observation: { label: L.observation, color: t.accent, icon: '?' },
    opportunity: { label: L.opportunity, color: t.accent, icon: '+' },
    na: { label: L.na, color: t.textMuted, icon: '-' }
  };

  const STATUS_CONFIG = {
    in_progress: { label: L.inProgress, color: t.warning },
    pending_actions: { label: L.pendingActions, color: t.error },
    closed: { label: L.closed, color: t.success }
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
      setError(L.connectionError);
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
      fontWeight: '600',
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
      fontWeight: '600'
    },
    summaryLabel: {
      fontSize: '11px',
      color: t.textMuted,
      marginTop: '4px'
    },
    score: {
      fontSize: '48px',
      fontWeight: '600',
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
          {L.loading}
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || L.notFound}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-calendar')}
          >
            {L.backToCalendar}
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
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          {audit.status !== 'closed' && (
            <button
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
              onClick={() => navigate(`/audit-execute/${audit.scheduleId}`)}
            >
               {L.continueAudit}
            </button>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-ncs')}
          >
             {L.viewNCs}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-calendar')}
          >
            ← {L.back}
          </button>
        </div>
      </div>

      {/* Audit Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           {L.auditInfo}
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
            <div style={styles.fieldLabel}>{L.auditDate}</div>
            <div style={styles.fieldValue}>
              {new Date(audit.auditDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>{L.areaProcess}</div>
            <div style={styles.fieldValue}>{audit.areaProcess || '-'}</div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>{L.leadAuditor}</div>
            <div style={styles.fieldValue}>{audit.leadAuditorName || '-'}</div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>{L.auditeesPresent}</div>
            <div style={styles.fieldValue}>
              {audit.auditeesPresent?.join(', ') || '-'}
            </div>
          </div>
          {audit.closedAt && (
            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.closedBy}</div>
              <div style={styles.fieldValue}>
                {audit.closedByName} - {new Date(audit.closedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Score */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> {L.auditScore}</h2>
          <div style={{ ...styles.score, color: scoreColor }}>
            {parseFloat(audit.scorePercentage || 0).toFixed(1)}%
          </div>
        </div>

        {/* Results Summary */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> {L.findingsSummary}</h2>
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.success }}>{audit.conformities || 0}</div>
              <div style={styles.summaryLabel}>{L.conformities}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.error }}>{audit.nonConformitiesMajor || 0}</div>
              <div style={styles.summaryLabel}>{L.ncMajor}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.warning }}>{audit.nonConformitiesMinor || 0}</div>
              <div style={styles.summaryLabel}>{L.ncMinor}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.accent }}>{audit.observations || 0}</div>
              <div style={styles.summaryLabel}>{L.observations}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryValue, color: t.accent }}>{audit.opportunities || 0}</div>
              <div style={styles.summaryLabel}>{L.opportunities}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> {L.detailedFindings}</h2>

        {findings.length === 0 ? (
          <div style={styles.empty}>{L.noFindings}</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{L.clause}</th>
                <th style={styles.th}>{L.question}</th>
                <th style={styles.th}>{L.result}</th>
                <th style={styles.th}>{L.description}</th>
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
          <h2 style={styles.cardTitle}> {L.nonConformities}</h2>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{L.number}</th>
                <th style={styles.th}>{L.type}</th>
                <th style={styles.th}>{L.description}</th>
                <th style={styles.th}>{L.responsible}</th>
                <th style={styles.th}>{L.status}</th>
                <th style={styles.th}>{L.actions}</th>
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
                      {nc.ncType === 'major' ? L.major : L.minor}
                    </span>
                  </td>
                  <td style={styles.td}>{nc.description}</td>
                  <td style={styles.td}>{nc.responsibleName || L.unassigned}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: nc.status === 'closed' ? `${t.success}20` : `${t.warning}20`,
                      color: nc.status === 'closed' ? t.success : t.warning
                    }}>
                      {nc.status === 'closed' ? L.closed : nc.status === 'open' ? L.open : L.inProgress}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{ ...styles.button, padding: '6px 12px', backgroundColor: t.accent, color: 'white' }}
                      onClick={() => navigate(`/audit-nc/${nc.id}`)}
                    >
                      {L.view}
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
