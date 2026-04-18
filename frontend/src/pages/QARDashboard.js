import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import QARDashboardComponent from '../components/QARDashboardComponent';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const QARDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const [dashData, setDashData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/qar/dashboard`);
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
  }, []);

  useEffect(() => { load(); }, [load]);

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
