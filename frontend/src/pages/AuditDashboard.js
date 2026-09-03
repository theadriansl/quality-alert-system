import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

// Default colors for subcomponents (outside main component)
const DEFAULT_COLORS = {
  primary: '#0F3B5F',
  accent: '#0072CE',
  success: '#2E7D32',
  warning: '#C77700',
  error: '#B00020',
  info: '#1565C0',
  gray: {
    200: '#E6EAEE', 400: '#9CA3AF', 500: '#6B7280', 900: '#1C1F23'
  }
};

const AUDIT_STATUS_COLORS = {
  planned: DEFAULT_COLORS.gray[500],
  in_progress: DEFAULT_COLORS.accent,
  completed: DEFAULT_COLORS.success,
  cancelled: DEFAULT_COLORS.error,
  postponed: DEFAULT_COLORS.gray[400]
};

const NC_TYPE_COLORS = {
  major: DEFAULT_COLORS.error,
  minor: DEFAULT_COLORS.warning,
  observation: DEFAULT_COLORS.info
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, color, theme }) => {
  const t = theme || { bgCard: 'white', border: DEFAULT_COLORS.gray[200], text: DEFAULT_COLORS.gray[900], textMuted: DEFAULT_COLORS.gray[500], textDim: DEFAULT_COLORS.gray[400], primary: DEFAULT_COLORS.primary };
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      padding: '16px',
      borderLeft: `3px solid ${color || t.primary}`
    }}>
      <div style={{ fontSize: '11px', fontWeight: '500', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '600', color: color || t.text }}>{value}</div>
      {subtitle && <div style={{ fontSize: '11px', color: t.textDim, marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
};

// Status Badge
const StatusBadge = ({ status, language = 'en' }) => {
  const labels = {
    en: {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      postponed: 'Postponed',
      open: 'Open',
      pending_verification: 'Pending Verification',
      closed: 'Closed'
    },
    es: {
      planned: 'Planificado',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      postponed: 'Pospuesto',
      open: 'Abierto',
      pending_verification: 'Verificación Pendiente',
      closed: 'Cerrado'
    }
  };
  const tr = labels[language] || labels.en;

  const config = {
    planned: { color: DEFAULT_COLORS.gray[500], label: tr.planned },
    in_progress: { color: DEFAULT_COLORS.warning, label: tr.in_progress },
    completed: { color: DEFAULT_COLORS.success, label: tr.completed },
    cancelled: { color: DEFAULT_COLORS.error, label: tr.cancelled },
    postponed: { color: DEFAULT_COLORS.gray[400], label: tr.postponed },
    open: { color: DEFAULT_COLORS.error, label: tr.open },
    pending_verification: { color: DEFAULT_COLORS.warning, label: tr.pending_verification },
    closed: { color: DEFAULT_COLORS.success, label: tr.closed }
  };
  const { color, label } = config[status] || { color: DEFAULT_COLORS.gray[400], label: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: '11px',
      fontWeight: '500',
      borderRadius: '2px',
      backgroundColor: `${color}20`,
      color: color
    }}>
      {label}
    </span>
  );
};

const AuditDashboard = () => {
  const navigate = useNavigate();

  // Global Theme
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // Dynamic colors based on theme
  const COLORS = {
    primary: t.primary,
    accent: t.accent,
    success: t.success || DEFAULT_COLORS.success,
    warning: t.warning || DEFAULT_COLORS.warning,
    error: t.error || DEFAULT_COLORS.error,
    info: t.info || DEFAULT_COLORS.info,
    gray: {
      50: '#FAFBFC', 100: t.bg, 200: t.border, 300: '#D1D5DB',
      400: '#9CA3AF', 500: t.textMuted, 600: '#5C6770',
      700: '#4B5563', 800: '#374151', 900: t.text
    }
  };

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [openNCs, setOpenNCs] = useState([]);
  const [auditRequests, setAuditRequests] = useState([]);
  const [requestFilter, setRequestFilter] = useState('all'); // all, 8D, ECR
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, auditsRes, ncsRes, requestsRes] = await Promise.all([
        fetch(`${API_URL}/audit/dashboard-stats`, { headers }),
        fetch(`${API_URL}/audit/recent?limit=10`, { headers }),
        fetch(`${API_URL}/audit/ncs?status=open&limit=10`, { headers }),
        fetch(`${API_URL}/audit/requests`, { headers })
      ]);

      const statsData = await statsRes.json();
      const auditsData = await auditsRes.json();
      const ncsData = await ncsRes.json();
      const requestsData = await requestsRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (auditsData.success) setRecentAudits(auditsData.audits || []);
      if (ncsData.success) setOpenNCs(ncsData.ncs || []);
      if (requestsData.success) setAuditRequests(requestsData.requests || []);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusData = stats?.byStatus?.map(s => ({
    name: s.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    value: parseInt(s.count) || 0,
    status: s.status
  })) || [];

  const ncTypeData = stats?.ncsByType?.map(nc => ({
    name: nc.type?.replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    value: parseInt(nc.count) || 0,
    type: nc.type
  })) || [];

  const styles = {
    page: { minHeight: '100vh', backgroundColor: t.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    header: { backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 },
    headerContent: { maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
    themeSelector: { display: 'flex', gap: '6px', alignItems: 'center', marginRight: '12px', paddingRight: '12px', borderRight: `1px solid ${t.border}` },
    themeButton: { width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s ease' },
    logo: { width: '40px', height: '40px', backgroundColor: t.primary, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '12px' },
    main: { maxWidth: '1600px', margin: '0 auto', padding: '24px' },
    btnPrimary: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', color: 'white', backgroundColor: t.primary, border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnSecondary: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer' },
    tabs: { display: 'flex', gap: '4px', backgroundColor: COLORS.gray[100], padding: '4px', borderRadius: '8px', marginBottom: '24px' },
    tab: { padding: '12px 24px', fontSize: '14px', fontWeight: '600', color: COLORS.gray[600], backgroundColor: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease' },
    tabActive: { color: 'white', backgroundColor: COLORS.primary, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    card: { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '20px', marginBottom: '16px' },
    cardTitle: { fontSize: '13px', fontWeight: '600', color: COLORS.gray[900], marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    chartIndicator: { width: '3px', height: '14px', borderRadius: '2px' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' },
    chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { backgroundColor: COLORS.gray[50], padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em', color: COLORS.gray[600], borderBottom: `2px solid ${COLORS.gray[200]}` },
    td: { padding: '10px 12px', borderBottom: `1px solid ${COLORS.gray[100]}`, color: COLORS.gray[900] },
    spinner: { width: '32px', height: '32px', border: `3px solid ${COLORS.gray[200]}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }
  };

  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '12px' };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={styles.logo}>AUD</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>Audit Dashboard</div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>Internal Audit Program</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            {/* Theme Selector */}
            <div style={styles.themeSelector}>
              <ThemeSelector />
            </div>
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <button style={styles.btnSecondary} onClick={() => navigate('/')}>{language === 'es' ? 'Módulos' : 'Modules'}</button>
            <button style={styles.btnPrimary} onClick={() => navigate('/audit-schedule-create')}>+ Schedule Audit</button>
            <button style={styles.btnSecondary} onClick={() => navigate('/audit-programs')}>Programs</button>
            <button style={styles.btnSecondary} onClick={() => navigate('/audit-calendar')}>Calendar</button>
            <button style={styles.btnSecondary} onClick={() => navigate('/audit-ncs')}>NCs</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.tabs}>
          {[{ id: 'overview', label: 'Overview' }, { id: 'audits', label: 'Recent Audits' }, { id: 'ncs', label: 'Open NCs' }, { id: 'requests', label: 'Auditorías 8D' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div style={styles.kpiGrid}>
              <KPICard title="Total Audits" value={stats?.totalAudits || 0} color={COLORS.primary} />
              <KPICard title="Completed" value={stats?.completedAudits || 0} color={COLORS.success} />
              <KPICard title="In Progress" value={stats?.inProgressAudits || 0} color={COLORS.warning} />
              <KPICard title="Open NCs" value={stats?.openNCs || 0} color={COLORS.danger} />
              <KPICard title="Compliance %" value={`${stats?.complianceRate || 0}%`} color={stats?.complianceRate >= 80 ? COLORS.success : COLORS.warning} />
            </div>

            <div style={styles.chartsRow}>
              <div style={styles.card}>
                <div style={styles.cardTitle}>
                  <div style={{ ...styles.chartIndicator, backgroundColor: COLORS.primary }}></div>
                  Audits by Status
                </div>
                <div style={{ height: '280px' }}>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: COLORS.gray[400], strokeWidth: 1 }}>
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={AUDIT_STATUS_COLORS[entry.status] || COLORS.gray[400]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', color: COLORS.gray[400], paddingTop: '100px' }}>No data</div>
                  )}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.cardTitle}>
                  <div style={{ ...styles.chartIndicator, backgroundColor: COLORS.danger }}></div>
                  Non-Conformities by Type
                </div>
                <div style={{ height: '280px' }}>
                  {ncTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ncTypeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[200]} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={COLORS.gray[400]} />
                        <YAxis tick={{ fontSize: 11 }} stroke={COLORS.gray[400]} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {ncTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={NC_TYPE_COLORS[entry.type] || COLORS.gray[400]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', color: COLORS.gray[400], paddingTop: '100px' }}>No data</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'audits' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Recent Audits</div>
            {recentAudits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: COLORS.gray[500] }}>No audits found</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Audit ID</th>
                      <th style={styles.th}>Program</th>
                      <th style={styles.th}>Area</th>
                      <th style={styles.th}>Lead Auditor</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudits.map(audit => (
                      <tr
                        key={audit.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/audit/${audit.id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray[50]}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={styles.td}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.primary, fontWeight: '500' }}>{audit.auditId || audit.id}</span>
                        </td>
                        <td style={styles.td}>{audit.programName || 'N/A'}</td>
                        <td style={styles.td}>{audit.area || 'N/A'}</td>
                        <td style={styles.td}>{audit.leadAuditorName || 'N/A'}</td>
                        <td style={styles.td}><StatusBadge status={audit.status} language={language} /></td>
                        <td style={styles.td}>{audit.scheduledDate ? new Date(audit.scheduledDate).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ncs' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Open Non-Conformities</div>
            {openNCs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: COLORS.gray[500] }}>No open NCs</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>NC ID</th>
                      <th style={styles.th}>Description</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Area</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openNCs.map(nc => (
                      <tr
                        key={nc.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/audit-nc/${nc.id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray[50]}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={styles.td}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.primary, fontWeight: '500' }}>{nc.ncId || nc.id}</span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: '250px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.description || (language === 'es' ? 'Sin descripción' : 'No description')}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.td, padding: '2px 8px', fontSize: '11px', fontWeight: '500', borderRadius: '2px', backgroundColor: `${NC_TYPE_COLORS[nc.type] || COLORS.gray[400]}20`, color: NC_TYPE_COLORS[nc.type] || COLORS.gray[400] }}>
                            {nc.type?.replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                          </span>
                        </td>
                        <td style={styles.td}>{nc.area || 'N/A'}</td>
                        <td style={styles.td}><StatusBadge status={nc.status} language={language} /></td>
                        <td style={styles.td}>{nc.dueDate ? new Date(nc.dueDate).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={styles.cardTitle}>Auditorías desde 8D</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['all', '8D'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setRequestFilter(filter)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: `1px solid ${requestFilter === filter ? COLORS.primary : COLORS.gray[300]}`,
                      borderRadius: '4px',
                      backgroundColor: requestFilter === filter ? COLORS.primary : t.bgCard,
                      color: requestFilter === filter ? 'white' : COLORS.gray[700],
                      cursor: 'pointer'
                    }}
                  >
                    {filter === 'all' ? 'Todos' : filter}
                  </button>
                ))}
              </div>
            </div>
            {auditRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: COLORS.gray[500] }}>No hay solicitudes de auditoría</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Documento</th>
                      <th style={styles.th}>Título</th>
                      <th style={styles.th}>Items</th>
                      <th style={styles.th}>Progreso</th>
                      <th style={styles.th}>Auditores</th>
                      <th style={styles.th}>Próx. Vencimiento</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRequests
                      .filter(req => requestFilter === 'all' || req.sourceType === requestFilter)
                      .map(req => {
                        const progress = req.totalItems > 0 ? Math.round((req.completedItems / req.totalItems) * 100) : 0;
                        const hasOverdue = req.overdueItems > 0;
                        return (
                          <tr
                            key={`${req.sourceType}-${req.sourceId}`}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray[50]}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={styles.td}>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: '600',
                                borderRadius: '4px',
                                backgroundColor: req.sourceType === '8D' ? t.infoBg : t.warningBg,
                                color: req.sourceType === '8D' ? t.info : t.warning
                              }}>
                                {req.sourceType}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: '500', color: COLORS.primary }}>
                                {req.reportId || req.sourceNumber}
                              </span>
                            </td>
                            <td style={{ ...styles.td, maxWidth: '200px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {req.reportTitle || '-'}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={{ color: hasOverdue ? COLORS.error : COLORS.gray[700] }}>
                                {req.completedItems}/{req.totalItems}
                                {hasOverdue && <span style={{ color: COLORS.error, marginLeft: '4px' }}>({req.overdueItems} vencidos)</span>}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '60px',
                                  height: '6px',
                                  backgroundColor: COLORS.gray[200],
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    backgroundColor: progress === 100 ? COLORS.success : progress > 50 ? COLORS.warning : COLORS.error,
                                    borderRadius: '3px'
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', color: COLORS.gray[600] }}>{progress}%</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={{ fontSize: '12px', color: COLORS.gray[600] }}>
                                {req.assignedAuditors?.length > 0
                                  ? req.assignedAuditors.slice(0, 2).map(a => a.name?.split(' ')[0]).join(', ') + (req.assignedAuditors.length > 2 ? ` +${req.assignedAuditors.length - 2}` : '')
                                  : (language === 'es' ? 'Sin asignar' : 'Not assigned')}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {req.nextDueDate ? (
                                <span style={{
                                  color: new Date(req.nextDueDate) < new Date() ? COLORS.error : COLORS.gray[700],
                                  fontWeight: new Date(req.nextDueDate) < new Date() ? '600' : '400'
                                }}>
                                  {new Date(req.nextDueDate).toLocaleDateString()}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => navigate(`/audit-requests?sourceType=${req.sourceType}&sourceId=${req.sourceId}&autoOpen=true`)}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: COLORS.primary,
                                    color: 'white',
                                    cursor: 'pointer'
                                  }}
                                  title="Ir al checklist de auditoría"
                                >
                                  Auditar
                                </button>
                                <button
                                  onClick={() => navigate(req.sourceType === '8D' ? `/8d-workflow?reportId=${req.sourceId}` : `/ecr-workflow/${req.sourceId}`)}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    border: `1px solid ${COLORS.gray[300]}`,
                                    borderRadius: '4px',
                                    backgroundColor: t.bgCard,
                                    color: COLORS.gray[700],
                                    cursor: 'pointer'
                                  }}
                                  title={`Consultar ${req.sourceType}`}
                                >
                                  Ver {req.sourceType}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditDashboard;
