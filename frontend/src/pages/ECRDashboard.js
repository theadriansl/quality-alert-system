import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ecrService from '../services/ecrService';
import { isUserAdmin } from '../utils/permissions';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

// Default colors for subcomponents (outside main component)
const DEFAULT_COLORS = {
  primary: '#0F3B5F',
  accent: '#0072CE',
  success: '#2E7D32',
  warning: '#C77700',
  error: '#B00020',
  info: '#1565C0',
  gray: {
    50: '#FAFBFC', 100: '#F4F6F8', 200: '#E6EAEE', 400: '#9CA3AF',
    500: '#6B7280', 700: '#4B5563', 900: '#1C1F23'
  }
};

const PRIORITY_COLORS = {
  critical: DEFAULT_COLORS.error,
  high: DEFAULT_COLORS.warning,
  medium: DEFAULT_COLORS.info,
  low: DEFAULT_COLORS.success
};

const STATUS_COLORS = {
  draft: DEFAULT_COLORS.gray[500],
  submitted: DEFAULT_COLORS.accent,
  approved: DEFAULT_COLORS.success,
  rejected: DEFAULT_COLORS.error,
  closed: DEFAULT_COLORS.gray[700]
};

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mes' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'year', label: 'Este Año' },
  { value: 'all', label: 'Todo el Tiempo' }
];

const STAGES = [
  { id: 'ecr1', label: 'ECR-1', name: 'Junta de Cambio' },
  { id: 'ecr2', label: 'ECR-2', name: 'Descripción del Cambio' },
  { id: 'ecr2b', label: 'ECR-2B', name: 'Análisis de Impacto' },
  { id: 'ecr3', label: 'ECR-3', name: 'Validación e Implementación' },
  { id: 'ecr4', label: 'ECR-4', name: 'Cierre y Confirmación' }
];

const getPeriodDates = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { startDate: today.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { startDate: weekStart.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: monthStart.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'quarter': {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      const quarterStart = new Date(today.getFullYear(), quarterMonth, 1);
      return { startDate: quarterStart.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { startDate: yearStart.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    default:
      return { startDate: null, endDate: null };
  }
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
      {subtitle && (
        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '4px' }}>{subtitle}</div>
      )}
    </div>
  );
};

// Top Ranking List Component
const TopRankingList = ({ title, data, theme }) => {
  const t = theme || { bgCard: 'white', border: DEFAULT_COLORS.gray[200], bgPanel: DEFAULT_COLORS.gray[100], text: DEFAULT_COLORS.gray[900], textMuted: DEFAULT_COLORS.gray[700], textDim: DEFAULT_COLORS.gray[400], primary: DEFAULT_COLORS.primary };
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      padding: '16px'
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{title}</h3>
      {data && data.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.slice(0, 5).map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: index < 4 ? `1px solid ${t.bgPanel}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: t.textDim, width: '16px' }}>{index + 1}</span>
                <span style={{ fontSize: '12px', color: t.textMuted }}>{item.name || 'N/A'}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: t.primary }}>{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: t.textDim, fontSize: '12px', padding: '16px' }}>No data</div>
      )}
    </div>
  );
};

// Adoption Progress Component
const AdoptionProgressBar = ({ stage, stats, theme }) => {
  const t = theme || { bg: DEFAULT_COLORS.gray[50], border: DEFAULT_COLORS.gray[200], text: DEFAULT_COLORS.gray[900], textMuted: DEFAULT_COLORS.gray[500], textDim: DEFAULT_COLORS.gray[400], primary: DEFAULT_COLORS.primary };
  const percentage = stats?.percentage || 0;
  return (
    <div style={{
      backgroundColor: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      padding: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>{stage.label}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: t.primary }}>{percentage}%</span>
      </div>
      <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '8px' }}>{stage.name}</div>
      <div style={{ height: '4px', backgroundColor: t.border, borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: t.primary, borderRadius: '2px' }} />
      </div>
      <div style={{ fontSize: '10px', color: t.textDim, textAlign: 'right', marginTop: '4px' }}>
        {stats?.completed || 0} of {stats?.total || 0}
      </div>
    </div>
  );
};

const ECRDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isUserAdmin(user);

  // Global Theme
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const { subscribe } = useSocket();

  // Dynamic colors based on theme
  const COLORS = {
    primary: t.primary,
    accent: t.accent,
    success: t.success || DEFAULT_COLORS.success,
    warning: t.warning || DEFAULT_COLORS.warning,
    error: t.error || DEFAULT_COLORS.error,
    info: t.info || DEFAULT_COLORS.info,
    gray: {
      50: '#FAFBFC',
      100: t.bg,
      200: t.border,
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: t.textMuted,
      600: '#5C6770',
      700: '#4B5563',
      800: '#374151',
      900: t.text
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [ecrs, setEcrs] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [deleting, setDeleting] = useState(null);
  const [period, setPeriod] = useState(() => localStorage.getItem('ecr_dashboard_period') || 'month');
  const [clientId, setClientId] = useState('');
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    localStorage.setItem('ecr_dashboard_period', period);
  }, [period]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = getPeriodDates(period);
      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (clientId) filters.clientId = clientId;
      if (department) filters.department = department;
      const response = await ecrService.getDashboardStats(filters);
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError('Error loading statistics');
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Server connection error');
    } finally {
      setLoading(false);
    }
  }, [period, clientId, department]);

  const loadECRs = useCallback(async () => {
    try {
      const response = await ecrService.getAllECRs();
      if (response.success) {
        setEcrs(response.ecrs || []);
      }
    } catch (err) {
      console.error('Error loading ECRs:', err);
    }
  }, []);

  const filteredECRs = React.useMemo(() => {
    let filtered = [...ecrs];
    if (clientId) filtered = filtered.filter(ecr => String(ecr.clientId) === String(clientId));
    if (department) filtered = filtered.filter(ecr => ecr.requestorDepartment === department);
    if (statusFilter) filtered = filtered.filter(ecr => ecr.status === statusFilter);
    if (period !== 'all') {
      const { startDate, endDate } = getPeriodDates(period);
      if (startDate && endDate) {
        filtered = filtered.filter(ecr => {
          // Compare dates as strings (YYYY-MM-DD) to avoid timezone issues
          const ecrDateStr = ecr.createdAt ? ecr.createdAt.split('T')[0] : '';
          return ecrDateStr >= startDate && ecrDateStr <= endDate;
        });
      }
    }
    return filtered;
  }, [ecrs, clientId, department, statusFilter, period]);

  const loadClients = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/clients/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setClients(data.clients || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadECRs();
    loadClients();
  }, [loadDashboardData, loadECRs, loadClients]);

  // WebSocket: Escuchar eventos de ECR para actualización en tiempo real
  useEffect(() => {
    const events = ['ecr:created', 'ecr:approved'];
    const unsubscribes = events.map(event =>
      subscribe(event, (data) => {
        console.log(`🔄 WebSocket [${event}]:`, data);
        loadDashboardData();
        loadECRs();
      })
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, loadDashboardData, loadECRs]);

  const handleDeleteECR = async (ecrId, ecrNumber) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete ${ecrNumber}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      setDeleting(ecrId);
      await ecrService.deleteECR(ecrId);
      loadECRs();
      loadDashboardData();
    } catch (err) {
      console.error('Error deleting ECR:', err);
      alert('Error deleting ECR');
    } finally {
      setDeleting(null);
    }
  };

  const kpis = dashboardData?.kpis || {};
  const trends = (dashboardData?.trends || []).map(t => ({
    ...t,
    created: parseInt(t.created) || 0,
    approved: parseInt(t.approved) || 0,
    rejected: parseInt(t.rejected) || 0
  }));
  const byType = (dashboardData?.byType || []).map(t => ({ ...t, value: parseInt(t.value) || 0 }));
  const byPriority = (dashboardData?.byPriority || []).map(t => ({ ...t, value: parseInt(t.value) || 0 }));
  const adoption = dashboardData?.adoption || {};
  const topClients = (dashboardData?.topClients || []).map(t => ({ ...t, count: parseInt(t.count) || 0 }));
  const topAreas = (dashboardData?.topAreas || []).map(t => ({ ...t, count: parseInt(t.count) || 0 }));
  const departments = dashboardData?.filters?.departments || [];

  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${COLORS.gray[200]}`, borderRadius: '4px', fontSize: '12px' };

  const styles = {
    page: { minHeight: '100vh', backgroundColor: t.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    header: { backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 },
    headerContent: { maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    logo: { width: '40px', height: '40px', backgroundColor: t.primary, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '12px' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
    themeSelector: { display: 'flex', gap: '6px', alignItems: 'center', marginRight: '12px', paddingRight: '12px', borderRight: `1px solid ${t.border}` },
    themeButton: { width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s ease' },
    btnSecondary: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer' },
    btnPrimary: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', color: 'white', backgroundColor: t.primary, border: 'none', borderRadius: '4px', cursor: 'pointer' },
    main: { maxWidth: '1600px', margin: '0 auto', padding: '24px' },
    filtersRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' },
    filterSelect: { padding: '8px 12px', fontSize: '13px', border: `1px solid ${COLORS.gray[300]}`, borderRadius: '4px', backgroundColor: t.bgCard, color: COLORS.gray[700] },
    tabs: { display: 'flex', borderBottom: `1px solid ${COLORS.gray[200]}`, marginBottom: '24px', gap: '0' },
    tab: { padding: '12px 24px', fontSize: '13px', fontWeight: '500', color: COLORS.gray[500], backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', marginBottom: '-1px' },
    tabActive: { color: COLORS.primary, borderBottomColor: COLORS.primary },
    card: { backgroundColor: t.bgCard, border: `1px solid ${COLORS.gray[200]}`, borderRadius: '4px', padding: '20px', marginBottom: '16px' },
    cardTitle: { fontSize: '13px', fontWeight: '600', color: COLORS.gray[900], marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    chartIndicator: { width: '3px', height: '14px', borderRadius: '2px' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' },
    chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },
    chartsRow3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
    stagesGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { backgroundColor: COLORS.gray[50], padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em', color: COLORS.gray[600], borderBottom: `2px solid ${COLORS.gray[200]}` },
    td: { padding: '10px 12px', borderBottom: `1px solid ${COLORS.gray[100]}`, color: COLORS.gray[900] },
    statusBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '11px', fontWeight: '500', borderRadius: '2px' },
    loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray[100] },
    spinner: { width: '32px', height: '32px', border: `3px solid ${COLORS.gray[200]}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }
  };

  if (loading && !dashboardData) {
    return (
      <div style={styles.loading}>
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
          <div style={styles.headerLeft}>
            <div style={styles.logo}>ECR</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.gray[900] }}>ECR Dashboard</div>
              <div style={{ fontSize: '12px', color: COLORS.gray[500] }}>Engineering Change Requests</div>
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
            <button style={styles.btnSecondary} onClick={() => navigate('/ecr-dashboard')}>Dashboard</button>
            <button style={styles.btnPrimary} onClick={() => navigate('/ecr-workflow')}>+ New ECR</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Filters */}
        <div style={styles.filtersRow}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={styles.filterSelect}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={styles.filterSelect}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} style={styles.filterSelect}>
            <option value="">Todos los Departamentos</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}>
            <option value="">Todos los Estados</option>
            <option value="draft">📝 Borrador</option>
            <option value="submitted">📤 Enviado</option>
            <option value="pending_approval">⏳ Pend. Aprobación</option>
            <option value="approved">✅ Aprobado</option>
            <option value="pending_closure">📋 Pend. Cierre</option>
            <option value="closed">🔒 Cerrado</option>
            <option value="closed_rejected">❌ No Adoptable</option>
          </select>
          {loading && <span style={{ fontSize: '12px', color: COLORS.gray[400], alignSelf: 'center' }}>Cargando...</span>}
        </div>

        {error && (
          <div style={{ ...styles.card, borderLeft: `3px solid ${COLORS.danger}`, marginBottom: '24px' }}>
            <span style={{ color: COLORS.danger, fontSize: '13px' }}>{error}</span>
          </div>
        )}


        {/* List Tab */}
        {activeTab === 'list' && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={styles.cardTitle}>Lista de ECRs</div>
              <span style={{ fontSize: '12px', color: COLORS.gray[500] }}>{filteredECRs.length} de {ecrs.length} ECRs</span>
            </div>
            {filteredECRs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: COLORS.gray[500] }}>
                <p>No se encontraron ECRs</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>Crea tu primer ECR haciendo clic en "+ New ECR"</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Número ECR</th>
                      <th style={styles.th}>Título</th>
                      <th style={styles.th}>Cliente</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Prioridad</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Creado</th>
                      {isAdmin && <th style={styles.th}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredECRs.map(ecr => (
                      <tr
                        key={ecr.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/ecr-workflow/${ecr.id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray[50]}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={styles.td}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.primary, fontWeight: '500' }}>{ecr.ecrNumber}</span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ecr.changeTitle || 'Sin título'}</div>
                        </td>
                        <td style={styles.td}>{ecr.clientName || 'N/A'}</td>
                        <td style={styles.td}>{ecr.changeType || 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.statusBadge, backgroundColor: (PRIORITY_COLORS[ecr.priority] || COLORS.gray[500]) + '20', color: PRIORITY_COLORS[ecr.priority] || COLORS.gray[500] }}>
                            {ecr.priority || 'N/A'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.statusBadge, backgroundColor: (STATUS_COLORS[ecr.status] || COLORS.gray[500]) + '20', color: STATUS_COLORS[ecr.status] || COLORS.gray[500] }}>
                            {ecr.status}
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(ecr.createdAt).toLocaleDateString()}</td>
                        {isAdmin && (
                          <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteECR(ecr.id, ecr.ecrNumber)}
                              disabled={deleting === ecr.id}
                              style={{ padding: '4px 8px', fontSize: '11px', color: COLORS.danger, backgroundColor: 'transparent', border: `1px solid ${COLORS.danger}`, borderRadius: '2px', cursor: 'pointer' }}
                            >
                              {deleting === ecr.id ? '...' : 'Eliminar'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
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

export default ECRDashboard;
