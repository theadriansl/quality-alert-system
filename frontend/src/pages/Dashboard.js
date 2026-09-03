import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import EightDDashboard from '../components/EightDDashboard';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getPresets = (lang) => [
  { label: lang === 'es' ? 'Hoy' : 'Today',              days: 0   },
  { label: lang === 'es' ? 'Semana' : 'Week',            days: 7   },
  { label: lang === 'es' ? 'Mes actual' : 'This Month',  days: 30  },
  { label: lang === 'es' ? 'Trimestre' : 'Quarter',      days: 90  },
  { label: lang === 'es' ? 'Año' : 'Year',               days: 365 },
  { label: lang === 'es' ? 'Todo' : 'All',               days: null },
];

const initDateFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};
const initDateTo = () => new Date().toISOString().split('T')[0];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const PRESETS = getPresets(language);

  const [dashboardData, setDashboardData] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const hasDataRef = useRef(false);

  // Filter state
  const [preset, setPreset]         = useState(language === 'es' ? 'Mes actual' : 'This Month');
  const [dateFrom, setDateFrom]     = useState(initDateFrom);
  const [dateTo, setDateTo]         = useState(initDateTo);
  const [deptId, setDeptId]         = useState('');
  const [clientId, setClientId]     = useState('');
  const [severityId, setSeverityId] = useState('');

  // Catalogs
  const [depts, setDepts]           = useState([]);
  const [clients, setClients]       = useState([]);
  const [severities, setSeverities] = useState([]);

  const userName = user ? `${user.firstName} ${user.lastName}` : tr('common.user');

  const applyPreset = useCallback((name) => {
    const p = PRESETS.find(pr => pr.label === name);
    if (!p) return;
    setPreset(name);
    if (p.days === null) {
      setDateFrom('');
      setDateTo('');
    } else if (p.days === 0) {
      const today = new Date().toISOString().split('T')[0];
      setDateFrom(today);
      setDateTo(today);
    } else {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - p.days);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(to.toISOString().split('T')[0]);
    }
  }, [PRESETS]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      // Use isRefreshing for subsequent loads to keep old data visible
      if (hasDataRef.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const params = new URLSearchParams();
      if (dateFrom)   params.set('start_date', dateFrom);
      if (dateTo)     params.set('end_date', dateTo);
      if (deptId)     params.set('deptId', deptId);
      if (clientId)   params.set('clientId', clientId);
      if (severityId) params.set('severityId', severityId);

      const response = await fetch(`${API_BASE_URL}/8d/dashboard-data?${params}`);
      const result = await response.json();
      if (result.success && result.data) {
        setDashboardData(result.data);
        setAllReports(result.data.recent8Ds || []);
        hasDataRef.current = true;
      } else {
        setError(result.message || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateFrom, dateTo, deptId, clientId, severityId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load catalogs once
  useEffect(() => {
    const loadDropdowns = async () => {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [d, c] = await Promise.all([
        fetch(`${API_BASE_URL}/departments?flat=true`, { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/clients/list`, { headers: h }).then(r => r.json()).catch(() => ({})),
      ]);
      setDepts(d.departments || d.items || []);
      setClients(c.clients || c.items || c.data || []);
      // For 8D we use severity names directly (High, Medium, Low)
      setSeverities([
        { id: 'High', name: language === 'es' ? 'Alta' : 'High' },
        { id: 'Medium', name: language === 'es' ? 'Media' : 'Medium' },
        { id: 'Low', name: language === 'es' ? 'Baja' : 'Low' }
      ]);
    };
    loadDropdowns();
  }, [language]);

  const handleReset = () => {
    setDeptId('');
    setClientId('');
    setSeverityId('');
    applyPreset(language === 'es' ? 'Mes actual' : 'This Month');
  };

  const hasFilters = deptId || clientId || severityId || dateFrom || dateTo;
  const noResults = dashboardData && (dashboardData.total8Ds === 0);

  const renderFilters = () => (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      padding: 14,
      marginBottom: 16,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'center'
    }}>
      {/* Presets - segmented control */}
      <div style={{ display: 'flex', backgroundColor: t.bgPanel, borderRadius: 6, padding: 2, gap: 2 }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.label)}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: preset === p.label ? t.bgCard : 'transparent',
              color: preset === p.label ? t.text : t.textMuted,
              boxShadow: preset === p.label ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              whiteSpace: 'nowrap',
              flex: '0 0 auto',
              height: 30
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <input
        type="date"
        value={dateFrom}
        onChange={e => { setDateFrom(e.target.value); setPreset(''); }}
        style={{
          padding: '0 8px',
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          border: `1px solid ${t.border}`,
          borderRadius: 6,
          backgroundColor: t.bgCard,
          color: t.text,
          height: 30,
          flex: '0 0 auto'
        }}
      />
      <span style={{ fontSize: 12, color: t.textMuted }}>—</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => { setDateTo(e.target.value); setPreset(''); }}
        style={{
          padding: '0 8px',
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          border: `1px solid ${t.border}`,
          borderRadius: 6,
          backgroundColor: t.bgCard,
          color: t.text,
          height: 30,
          flex: '0 0 auto'
        }}
      />

      {/* Selects */}
      {[
        { val: deptId,     set: setDeptId,     items: depts,      label: language === 'es' ? 'Departamento' : 'Department' },
        { val: clientId,   set: setClientId,   items: clients,    label: language === 'es' ? 'Cliente' : 'Client' },
        { val: severityId, set: setSeverityId, items: severities, label: language === 'es' ? 'Severidad' : 'Severity' },
      ].map(f => (
        <select
          key={f.label}
          value={f.val}
          onChange={e => f.set(e.target.value)}
          style={{
            padding: '0 8px',
            fontSize: 12,
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            backgroundColor: t.bgCard,
            color: f.val ? t.text : t.textMuted,
            height: 30,
            flex: '0 0 auto',
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          <option value="">{f.label}</option>
          {f.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ))}

      {/* Reset link */}
      {hasFilters && (
        <button
          onClick={handleReset}
          style={{
            background: 'none',
            border: 'none',
            color: t.accent,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0 8px',
            height: 30,
            whiteSpace: 'nowrap',
            flex: '0 0 auto'
          }}
        >
          {language === 'es' ? 'Restablecer' : 'Reset'}
        </button>
      )}
    </div>
  );

  const renderNoResults = () => (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      padding: '40px 24px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>
        {language === 'es' ? 'No hay reportes para los filtros seleccionados.' : 'No reports match the selected filters.'}
      </div>
      <button
        onClick={handleReset}
        style={{
          background: 'none',
          border: 'none',
          color: t.accent,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          padding: 0
        }}
      >
        {language === 'es' ? 'Restablecer filtros' : 'Reset filters'}
      </button>
    </div>
  );

  const renderError = () => (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.errorBorder || t.border}`,
      borderRadius: 8,
      padding: '40px 24px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 14, color: t.error || '#ef4444', marginBottom: 8 }}>
        {language === 'es' ? 'Error al cargar el dashboard' : 'Error loading dashboard'}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>{error}</div>
      <button
        onClick={loadData}
        style={{
          background: 'none',
          border: 'none',
          color: t.accent,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          padding: 0
        }}
      >
        {language === 'es' ? 'Reintentar' : 'Retry'}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: `3px solid ${t.border}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: t.textMuted, fontSize: '14px' }}>{tr('common.loadingDashboard')}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={{
        backgroundColor: t.bgCard,
        borderBottom: `1px solid ${t.border}`,
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', backgroundColor: t.accent, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '14px' }}>8D</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>{tr('eightD.dashboard')}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr('eightD.problemSolvingAnalytics')}</div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeSelector />
            <div style={{ width: '1px', height: '24px', backgroundColor: t.border }} />
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <button onClick={() => navigate('/')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {tr('common.modules')}
            </button>
            <button onClick={() => navigate('/8d-workflow')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: 'white', backgroundColor: t.accent, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              + {tr('eightD.new8D')}
            </button>
            <button onClick={() => navigate('/8d-consultation')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {tr('eightD.consultation')}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '10px', borderLeft: `1px solid ${t.border}` }}>
              <div style={{ width: '30px', height: '30px', backgroundColor: t.accent, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '11px' }}>
                {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>{userName}</div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>{user?.role || 'Quality'}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px 24px 40px' }}>
        {renderFilters()}
        {error && !dashboardData ? (
          renderError()
        ) : noResults ? (
          renderNoResults()
        ) : dashboardData ? (
          <div style={{
            opacity: isRefreshing ? 0.6 : 1,
            pointerEvents: isRefreshing ? 'none' : 'auto',
            transition: 'opacity 0.2s ease'
          }}>
            <EightDDashboard data={dashboardData} allReports={allReports} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
            {tr('eightD.messages.couldNotLoad')}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
