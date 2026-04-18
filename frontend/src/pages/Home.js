import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import usePermissions from '../hooks/usePermissions';
import { isUserAdmin } from '../utils/permissions';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme: t } = useTheme();
  const { hasAccess, loading: permissionsLoading, getAccessibleModules } = usePermissions();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = isUserAdmin(user);

  const allApps = [
    {
      id: '8d',
      moduleId: '8d',
      name: '8D Problem Solving',
      description: 'Gestión de reportes 8D con flujo de aprobación multinivel',
      path: '/dashboard',
      code: '8D'
    },
    {
      id: 'quality_alert',
      moduleId: 'quality_alert',
      name: 'Quality Alert',
      description: 'Captura de defectos y generación automática de alertas',
      path: '/defect-dashboard',
      code: 'QAR'
    },
    {
      id: 'mrb',
      moduleId: 'mrb',
      name: 'Material Review Board',
      description: 'Campañas de calidad para gestión de material no conforme',
      path: '/mrb-dashboard',
      code: 'MRB'
    },
    {
      id: 'ecr',
      moduleId: 'ecr',
      name: 'Engineering Changes',
      description: 'Gestión de cambios de ingeniería con análisis de impacto',
      path: '/ecr-dashboard',
      code: 'ECR'
    },
    {
      id: 'audits',
      moduleId: 'audits',
      name: 'Internal Audits',
      description: 'Programa de auditorías internas con checklists dinámicos',
      path: '/audit-dashboard',
      code: 'AUD'
    },
    {
      id: 'workload',
      moduleId: 'workload',
      name: 'Workload Manager',
      description: 'Asignación de actividades y tracking de tiempo del equipo',
      path: '/workload',
      code: 'WKL'
    },
    {
      id: 'clients',
      moduleId: 'clients',
      name: 'Client Management',
      description: 'Administración de clientes, proyectos y BOM global',
      path: '/clients',
      code: 'CLT'
    },
    {
      id: 'work_instructions',
      moduleId: 'work_instructions',
      name: 'Work Instructions',
      description: 'Creación y gestión de instrucciones de trabajo con versionamiento',
      path: '/work-instructions',
      code: 'WI'
    },
    {
      id: 'statistical_tools',
      moduleId: 'statistical_tools',
      name: 'Statistical Tools',
      description: 'Análisis estadístico: Cp/Cpk, Gage R&R, Pareto, SPC, Taguchi DOE',
      path: '/statistical-tools',
      code: 'STAT'
    },
    {
      id: 'inspeccion',
      moduleId: 'quality_alert',
      name: 'Inspección de Defectos',
      description: 'Captura directa de defectos en línea para generación de QARs',
      path: '/defect-capture',
      code: 'INS'
    }
  ];

  const adminApps = [
    {
      id: 'configuration',
      name: 'System Configuration',
      description: 'Usuarios, roles, departamentos y configuración del sistema',
      path: '/configuration',
      code: 'CFG'
    }
  ];

  const getVisibleApps = () => {
    if (isAdmin) {
      return [...allApps, ...adminApps];
    }
    const accessibleModules = getAccessibleModules();
    return allApps.filter(app => {
      if (app.adminOnly) return false;
      return accessibleModules.includes(app.moduleId) || hasAccess(app.moduleId, 'view');
    });
  };

  const visibleApps = getVisibleApps();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    },
    header: {
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      padding: '16px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    logo: {
      width: '40px',
      height: '40px',
      backgroundColor: t.primary,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '700',
      fontSize: '14px',
      letterSpacing: '-0.5px'
    },
    brandText: {
      display: 'flex',
      flexDirection: 'column'
    },
    brandName: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      letterSpacing: '-0.01em'
    },
    brandSubtitle: {
      fontSize: '12px',
      color: t.textMuted
    },
    themeSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      paddingRight: '16px',
      borderRight: `1px solid ${t.border}`
    },
    themeLabel: {
      fontSize: '11px',
      color: t.textDim,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    dateTime: {
      textAlign: 'right'
    },
    dateText: {
      fontSize: '13px',
      color: t.textMuted,
      textTransform: 'capitalize'
    },
    timeText: {
      fontSize: '12px',
      color: t.textDim
    },
    userSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      paddingLeft: '24px',
      borderLeft: `1px solid ${t.border}`
    },
    avatar: {
      width: '36px',
      height: '36px',
      borderRadius: '4px',
      backgroundColor: t.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '600',
      fontSize: '13px'
    },
    userInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    userName: {
      fontSize: '13px',
      fontWeight: '500',
      color: t.text
    },
    userRole: {
      fontSize: '12px',
      color: t.textMuted,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    adminBadge: {
      fontSize: '10px',
      fontWeight: '600',
      color: t.error,
      backgroundColor: `${t.error}15`,
      padding: '1px 6px',
      borderRadius: '2px',
      textTransform: 'uppercase',
      letterSpacing: '0.03em'
    },
    logoutBtn: {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '500',
      color: t.textMuted,
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '32px'
    },
    pageTitle: {
      marginBottom: '32px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '4px'
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '16px'
    },
    card: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    cardHover: {
      borderColor: t.primary,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)'
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    },
    cardCode: {
      fontSize: '11px',
      fontWeight: '600',
      color: '#ffffff',
      backgroundColor: t.primary,
      padding: '4px 8px',
      borderRadius: '2px',
      letterSpacing: '0.05em'
    },
    cardArrow: {
      fontSize: '18px',
      color: t.border,
      transition: 'all 0.15s ease'
    },
    cardArrowHover: {
      color: t.primary,
      transform: 'translateX(4px)'
    },
    cardName: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      lineHeight: '1.3'
    },
    cardDesc: {
      fontSize: '13px',
      color: t.textMuted,
      lineHeight: '1.5'
    },
    noAccess: {
      textAlign: 'center',
      padding: '80px 32px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px'
    },
    noAccessTitle: {
      fontSize: '16px',
      fontWeight: '500',
      color: t.textMuted,
      marginBottom: '8px'
    },
    noAccessText: {
      fontSize: '14px',
      color: t.textMuted
    },
    loading: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bg
    },
    spinner: {
      width: '32px',
      height: '32px',
      border: `3px solid ${t.border}`,
      borderTopColor: t.primary,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  if (permissionsLoading) {
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

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>QMS</div>
          <div style={styles.brandText}>
            <div style={styles.brandName}>Quality Management System</div>
            <div style={styles.brandSubtitle}>Industrial Quality Control Platform</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.themeSection}>
            <span style={styles.themeLabel}>Tema</span>
            <ThemeSelector />
          </div>

          <div style={styles.dateTime}>
            <div style={styles.dateText}>{formatDate()}</div>
            <div style={styles.timeText}>
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={styles.userSection}>
            <div style={styles.avatar}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={styles.userRole}>
                {user?.position || user?.role}
                {isAdmin && <span style={styles.adminBadge}>Admin</span>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={styles.logoutBtn}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = t.bgPanel;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = t.bg;
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.pageTitle}>
          <h1 style={styles.title}>Modules</h1>
          <p style={styles.subtitle}>{visibleApps.length} modules available</p>
        </div>

        {visibleApps.length === 0 ? (
          <div style={styles.noAccess}>
            <div style={styles.noAccessTitle}>No module access</div>
            <div style={styles.noAccessText}>Contact your administrator to request permissions</div>
          </div>
        ) : (
          <div style={styles.grid}>
            {visibleApps.map((app) => (
              <div
                key={app.id}
                onClick={() => navigate(app.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = t.primary;
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
                  e.currentTarget.querySelector('.card-arrow').style.color = t.primary;
                  e.currentTarget.querySelector('.card-arrow').style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.querySelector('.card-arrow').style.color = t.border;
                  e.currentTarget.querySelector('.card-arrow').style.transform = 'translateX(0)';
                }}
                style={styles.card}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardCode}>{app.code}</span>
                  <span className="card-arrow" style={styles.cardArrow}>→</span>
                </div>
                <div style={styles.cardName}>{app.name}</div>
                <div style={styles.cardDesc}>{app.description}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
