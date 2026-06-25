import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { isUserAdmin } from '../utils/permissions';
import QARDashboardComponent from '../components/QARDashboardComponent';

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

const QARDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const PRESETS = getPresets(language);
  const [dashData, setDashData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [preset, setPreset]         = useState('Mes actual');
  const [dateFrom, setDateFrom]     = useState(initDateFrom);
  const [dateTo, setDateTo]         = useState(initDateTo);
  const [deptId, setDeptId]         = useState('');
  const [clientId, setClientId]     = useState('');
  const [severityId, setSeverityId] = useState('');
  const [depts, setDepts]           = useState([]);
  const [clients, setClients]       = useState([]);
  const [severities, setSeverities] = useState([]);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';

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
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (dateFrom)   params.set('start_date', dateFrom);
      if (dateTo)     params.set('end_date', dateTo);
      if (deptId)     params.set('deptId', deptId);
      if (clientId)   params.set('clientId', clientId);
      if (severityId) params.set('severityId', severityId);
      const res = await fetch(`${API_BASE_URL}/qar/dashboard?${params}`);
      const result = await res.json();
      if (result.success && result.data) {
        setDashData(result.data);
      } else {
        setError(result.message || 'Error al cargar datos');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading QAR dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, deptId, clientId, severityId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadDropdowns = async () => {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [d, c, s] = await Promise.all([
        fetch(`${API_BASE_URL}/departments?flat=true`, { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/clients/list`, { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/inspection-catalogs/severities`, { headers: h }).then(r => r.json()).catch(() => ({})),
      ]);
      setDepts(d.departments || d.items || []);
      setClients(c.clients || c.items || c.data || []);
      setSeverities(s.severities || s.items || s.data || []);
    };
    loadDropdowns();
  }, []);

  const renderFilters = () => (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.label)} style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: `1px solid ${t.border}`, cursor: 'pointer', backgroundColor: preset === p.label ? '#0072CE' : t.bgPanel, color: preset === p.label ? '#fff' : t.text }}>
            {p.label}
          </button>
        ))}
      </div>
      <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }} />
      <span style={{ fontSize: '12px', color: t.textMuted }}>—</span>
      <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }} />
      {[
        { val: deptId,     set: setDeptId,     items: depts,      label: 'Departamento' },
        { val: clientId,   set: setClientId,   items: clients,    label: 'Cliente'      },
        { val: severityId, set: setSeverityId, items: severities, label: 'Severidad'    },
      ].map(f => (
        <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}>
          <option value="">{f.label}</option>
          {f.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ))}
      <button onClick={() => { setDeptId(''); setClientId(''); setSeverityId(''); applyPreset('Mes actual'); }} style={{ padding: '5px 10px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>↺ Reset</button>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: `3px solid ${t.border}`, borderTopColor: '#0072CE', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: t.textMuted, fontSize: '14px' }}>Cargando QAR Dashboard…</div>
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
        zIndex: 50,
      }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', backgroundColor: '#0072CE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '12px' }}>QAR</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>QAR Dashboard</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>Quality Alert Reports — Análisis & Seguimiento</div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeSelector />
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <div style={{ width: '1px', height: '24px', backgroundColor: t.border }} />
            <button onClick={() => navigate('/')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              Módulos
            </button>
            <button onClick={() => navigate('/defect-capture')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              🔍 Inspección
            </button>
            <button onClick={() => navigate('/qar-list')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              Lista QARs
            </button>
            {isUserAdmin(user) && <>
              <button onClick={() => navigate('/defect-admin')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
                Admin Defectos
              </button>
              <button onClick={() => navigate('/defect-config')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '500', color: t.text, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
                ⚙ Config QAR
              </button>
            </>}
            <button onClick={() => navigate('/qar-create')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: 'white', backgroundColor: '#0072CE', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              + Nueva QAR
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '10px', borderLeft: `1px solid ${t.border}` }}>
              <div style={{ width: '30px', height: '30px', backgroundColor: '#0072CE', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '11px' }}>
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
        {error ? (
          <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
            <div style={{ fontSize: '16px', color: '#ef4444', marginBottom: '8px' }}>⚠️ Error al cargar dashboard</div>
            <div style={{ fontSize: '13px' }}>{error}</div>
          </div>
        ) : dashData ? (
          <QARDashboardComponent data={dashData} onRefresh={load} />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
            No se pudo cargar la información del dashboard.
          </div>
        )}
      </main>
    </div>
  );
};

export default QARDashboard;
