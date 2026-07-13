import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import EightDDashboard from '../components/EightDDashboard';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const userName = user ? `${user.firstName} ${user.lastName}` : tr('common.user');
  const isDark = t.id === 'dark';

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/8d/dashboard-data`);
        const result = await response.json();
        if (result.success && result.data) {
          setDashboardData(result.data);
          setAllReports(result.data.recent8Ds || []);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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
              <div style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>{tr('eightD.dashboard')}</div>
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
              <div style={{ width: '30px', height: '30px', backgroundColor: t.accent, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '11px' }}>
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
        {dashboardData ? (
          <EightDDashboard data={dashboardData} allReports={allReports} />
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
