import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { useTheme, ThemeSelector } from '../context/ThemeContext';

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

const DISPOSITION_COLORS = {
  use_as_is: DEFAULT_COLORS.success,
  rework: DEFAULT_COLORS.warning,
  scrap: DEFAULT_COLORS.error,
  return: DEFAULT_COLORS.info,
  pending: DEFAULT_COLORS.gray[400]
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
      <div style={{ fontSize: '24px', fontWeight: '700', color: color || t.text }}>{value}</div>
      {subtitle && <div style={{ fontSize: '11px', color: t.textDim, marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
};

// Status Badge
const StatusBadge = ({ status }) => {
  const config = {
    ABIERTA: { color: DEFAULT_COLORS.warning, label: 'Abierta' },
    EN_PROCESO: { color: DEFAULT_COLORS.accent, label: 'En Proceso' },
    CERRADA: { color: DEFAULT_COLORS.success, label: 'Cerrada' },
    CANCELADA: { color: DEFAULT_COLORS.error, label: 'Cancelada' }
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

const MRBDashboard = () => {
  const navigate = useNavigate();

  // Global Theme
  const { theme: t } = useTheme();

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
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, campaignsRes] = await Promise.all([
        fetch(`${API_URL}/mrb/dashboard-stats`, { headers }),
        fetch(`${API_URL}/mrb`, { headers })
      ]);

      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (campaignsData.success) setCampaigns(campaignsData.mrbs || campaignsData.campaigns || []);
    } catch (error) {
      console.error('Error loading MRB data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dispositionData = stats?.byDisposition?.map(d => ({
    name: d.disposition?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending',
    value: parseInt(d.count) || 0,
    disposition: d.disposition
  })) || [];

  const styles = {
    page: { minHeight: '100vh', backgroundColor: t.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    header: { backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 },
    headerContent: { maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
    themeSelector: { display: 'flex', gap: '6px', alignItems: 'center', marginRight: '12px', paddingRight: '12px', borderRight: `1px solid ${t.border}` },
    themeButton: { width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s ease' },
    logo: { width: '40px', height: '40px', backgroundColor: t.primary, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '12px' },
    main: { maxWidth: '1600px', margin: '0 auto', padding: '24px' },
    btnPrimary: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', color: 'white', backgroundColor: t.primary, border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnSecondary: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer' },
    tabs: { display: 'flex', borderBottom: `1px solid ${COLORS.gray[200]}`, marginBottom: '24px' },
    tab: { padding: '12px 24px', fontSize: '13px', fontWeight: '500', color: COLORS.gray[500], backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', marginBottom: '-1px' },
    tabActive: { color: COLORS.primary, borderBottomColor: COLORS.primary },
    card: { backgroundColor: t.bgCard, border: `1px solid ${COLORS.gray[200]}`, borderRadius: '4px', padding: '20px', marginBottom: '16px' },
    cardTitle: { fontSize: '13px', fontWeight: '600', color: COLORS.gray[900], marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    chartIndicator: { width: '3px', height: '14px', borderRadius: '2px' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' },
    chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { backgroundColor: COLORS.gray[50], padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em', color: COLORS.gray[600], borderBottom: `2px solid ${COLORS.gray[200]}` },
    td: { padding: '10px 12px', borderBottom: `1px solid ${COLORS.gray[100]}`, color: COLORS.gray[900] },
    spinner: { width: '32px', height: '32px', border: `3px solid ${COLORS.gray[200]}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }
  };

  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${COLORS.gray[200]}`, borderRadius: '4px', fontSize: '12px' };

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
            <div style={styles.logo}>MRB</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>MRB Dashboard</div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>Material Review Board</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            {/* Theme Selector */}
            <div style={styles.themeSelector}>
              <ThemeSelector />
            </div>
            <button style={styles.btnSecondary} onClick={() => navigate('/')}>Modules</button>
            <button style={styles.btnPrimary} onClick={() => navigate('/mrb-create')}>+ New Campaign</button>
            <button style={styles.btnSecondary} onClick={() => navigate('/mrb-campaigns')}>Campaigns</button>
            <button style={styles.btnPrimary} onClick={() => navigate('/mrb-capture')}>Inspección MRB</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.tabs}>
          {[{ id: 'overview', label: 'Overview' }, { id: 'campaigns', label: 'Campaigns' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div style={styles.kpiGrid}>
              <KPICard title="Total Campaigns" value={stats?.totalCampaigns || 0} color={COLORS.primary} />
              <KPICard title="Active" value={stats?.activeCampaigns || 0} color={COLORS.warning} />
              <KPICard title="Total Items" value={stats?.totalItems || 0} color={COLORS.gray[600]} />
              <KPICard title="Items Reviewed" value={stats?.reviewedItems || 0} color={COLORS.success} />
              <KPICard title="Pending Review" value={stats?.pendingItems || 0} color={COLORS.danger} />
            </div>

            <div style={styles.chartsRow}>
              <div style={styles.card}>
                <div style={styles.cardTitle}>
                  <div style={{ ...styles.chartIndicator, backgroundColor: COLORS.primary }}></div>
                  Disposition Distribution
                </div>
                <div style={{ height: '280px' }}>
                  {dispositionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dispositionData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: COLORS.gray[400], strokeWidth: 1 }}>
                          {dispositionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DISPOSITION_COLORS[entry.disposition] || COLORS.gray[400]} />
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
                  <div style={{ ...styles.chartIndicator, backgroundColor: COLORS.success }}></div>
                  Review Progress
                </div>
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Total', value: stats?.totalItems || 0 },
                      { name: 'Reviewed', value: stats?.reviewedItems || 0 },
                      { name: 'Pending', value: stats?.pendingItems || 0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[200]} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={COLORS.gray[400]} />
                      <YAxis tick={{ fontSize: 11 }} stroke={COLORS.gray[400]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill={COLORS.primary} />
                        <Cell fill={COLORS.success} />
                        <Cell fill={COLORS.warning} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'campaigns' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Campaign List</div>
            {campaigns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: COLORS.gray[500] }}>
                <p>No campaigns found</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>Create your first campaign by clicking "+ New Campaign"</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Campaign ID</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Client</th>
                      <th style={styles.th}>Items</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(campaign => (
                      <tr
                        key={campaign.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/mrb-campaign/${campaign.id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray[50]}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={styles.td}>
                          <span style={{ fontFamily: 'monospace', color: COLORS.primary, fontWeight: '500' }}>{campaign.campaignId}</span>
                        </td>
                        <td style={styles.td}>{campaign.name || 'No name'}</td>
                        <td style={styles.td}>{campaign.clientName || 'N/A'}</td>
                        <td style={styles.td}>{campaign.totalItems || 0}</td>
                        <td style={styles.td}><StatusBadge status={campaign.status} /></td>
                        <td style={styles.td}>{new Date(campaign.createdAt).toLocaleDateString()}</td>
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

export default MRBDashboard;
