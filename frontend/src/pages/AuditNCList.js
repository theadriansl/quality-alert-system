import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditNCList = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [ncs, setNcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Traducciones locales
  const L = {
    en: {
      open: 'Open', inProgress: 'In Progress', pendingVerification: 'Pending Verification', closed: 'Closed',
      major: 'Major', minor: 'Minor', overdue: 'Overdue', connectionError: 'Connection error',
      loading: 'Loading non-conformities...', title: 'Audit Non-Conformities', subtitle: 'Management and tracking of audit findings',
      dashboard: 'Dashboard', home: 'Home', refresh: 'Refresh',
      allStatuses: 'All statuses', allTypes: 'All types', majors: 'Majors', minors: 'Minors',
      noNCs: 'No non-conformities registered', noNCsDesc: 'Non-conformities are generated during audit execution',
      audit: 'Audit', clause: 'Clause', noArea: 'No area', unassigned: 'Unassigned', dueDate: 'Due',
    },
    es: {
      open: 'Abierta', inProgress: 'En Proceso', pendingVerification: 'Pend. Verificación', closed: 'Cerrada',
      major: 'Mayor', minor: 'Menor', overdue: 'Vencida', connectionError: 'Error de conexión',
      loading: 'Cargando no conformidades...', title: 'No Conformidades de Auditoría', subtitle: 'Gestión y seguimiento de hallazgos de auditoría',
      dashboard: 'Dashboard', home: 'Inicio', refresh: 'Actualizar',
      allStatuses: 'Todos los estados', allTypes: 'Todos los tipos', majors: 'Mayores', minors: 'Menores',
      noNCs: 'No hay no conformidades registradas', noNCsDesc: 'Las no conformidades se generan durante la ejecución de auditorías',
      audit: 'Auditoría', clause: 'Cláusula', noArea: 'Sin área', unassigned: 'Sin asignar', dueDate: 'Vence',
    }
  }[language] || {};

  const STATUS_CONFIG = {
    open: { label: L.open, color: t.error },
    in_progress: { label: L.inProgress, color: t.warning },
    pending_verification: { label: L.pendingVerification, color: t.accent },
    closed: { label: L.closed, color: t.success }
  };

  const TYPE_CONFIG = {
    major: { label: L.major, color: t.error },
    minor: { label: L.minor, color: t.warning }
  };

  const loadNCs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API_URL}/audit/ncs?`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterType) url += `ncType=${filterType}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setNcs(result.nonConformities);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => {
    loadNCs();
  }, [loadNCs]);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    filters: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    select: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid transparent'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    cardDescription: {
      fontSize: '14px',
      color: t.text,
      marginBottom: '12px',
      lineHeight: '1.5'
    },
    cardMeta: {
      display: 'flex',
      gap: '24px',
      fontSize: '13px',
      color: t.textMuted,
      flexWrap: 'wrap'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    summary: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    summaryCard: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    summaryValue: {
      fontSize: '32px',
      fontWeight: '600'
    },
    summaryLabel: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '4px'
    },
    empty: {
      textAlign: 'center',
      padding: '48px',
      color: t.textMuted
    },
    overdue: {
      backgroundColor: `${t.error}10`,
      borderLeft: `4px solid ${t.error}`
    }
  };

  // Calculate summary
  const summary = {
    total: ncs.length,
    open: ncs.filter(nc => nc.status === 'open').length,
    inProgress: ncs.filter(nc => nc.status === 'in_progress').length,
    pendingVerification: ncs.filter(nc => nc.status === 'pending_verification').length,
    closed: ncs.filter(nc => nc.status === 'closed').length,
    major: ncs.filter(nc => nc.ncType === 'major').length,
    minor: ncs.filter(nc => nc.ncType === 'minor').length,
    overdue: ncs.filter(nc => nc.dueDate && new Date(nc.dueDate) < new Date() && nc.status !== 'closed').length
  };

  if (loading && ncs.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          {L.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{L.title}</h1>
          <p style={styles.subtitle}>{L.subtitle}</p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             {L.dashboard}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← Inicio
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: t.error }}>{summary.open}</div>
          <div style={styles.summaryLabel}>{L.open}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: t.warning }}>{summary.inProgress}</div>
          <div style={styles.summaryLabel}>{L.inProgress}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: t.accent }}>{summary.pendingVerification}</div>
          <div style={styles.summaryLabel}>{L.pendingVerification}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: t.success }}>{summary.closed}</div>
          <div style={styles.summaryLabel}>{L.closed}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: t.error }}>{summary.overdue}</div>
          <div style={styles.summaryLabel}>{L.overdue}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">{L.allStatuses}</option>
          <option value="open">{L.open}</option>
          <option value="in_progress">{L.inProgress}</option>
          <option value="pending_verification">{L.pendingVerification}</option>
          <option value="closed">{L.closed}</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.select}
        >
          <option value="">{L.allTypes}</option>
          <option value="major">{L.majors}</option>
          <option value="minor">{L.minors}</option>
        </select>
        <button
          style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
          onClick={loadNCs}
        >
           {L.refresh}
        </button>
      </div>

      {error && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* NC List */}
      {ncs.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>{L.noNCs}</p>
          <p>{L.noNCsDesc}</p>
        </div>
      ) : (
        ncs.map(nc => {
          const statusConfig = STATUS_CONFIG[nc.status] || STATUS_CONFIG.open;
          const typeConfig = TYPE_CONFIG[nc.ncType] || TYPE_CONFIG.minor;
          const isOverdue = nc.dueDate && new Date(nc.dueDate) < new Date() && nc.status !== 'closed';

          return (
            <div
              key={nc.id}
              style={{
                ...styles.card,
                ...(isOverdue ? styles.overdue : {})
              }}
              onClick={() => navigate(`/audit-nc/${nc.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = t.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    {nc.ncNumber}
                    {isOverdue && <span style={{ marginLeft: '8px', color: t.error, fontSize: '12px' }}> {L.overdue.toUpperCase()}</span>}
                  </h3>
                  <span style={{ fontSize: '13px', color: t.textMuted }}>
                    {L.audit}: {nc.auditNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: `${typeConfig.color}20`,
                    color: typeConfig.color
                  }}>
                    {typeConfig.label}
                  </span>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: `${statusConfig.color}20`,
                    color: statusConfig.color
                  }}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <p style={styles.cardDescription}>
                {nc.description?.substring(0, 200)}
                {nc.description?.length > 200 ? '...' : ''}
              </p>

              <div style={styles.cardMeta}>
                {nc.clause && (
                  <div style={styles.metaItem}>
                    <span></span>
                    <span>{L.clause}: {nc.clause}</span>
                  </div>
                )}
                <div style={styles.metaItem}>
                  <span></span>
                  <span>{nc.areaProcess || L.noArea}</span>
                </div>
                <div style={styles.metaItem}>
                  <span></span>
                  <span>{nc.responsibleName || L.unassigned}</span>
                </div>
                {nc.dueDate && (
                  <div style={styles.metaItem}>
                    <span></span>
                    <span style={{ color: isOverdue ? t.error : 'inherit' }}>
                      {L.dueDate}: {new Date(nc.dueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AuditNCList;
