import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import usePermissions from '../hooks/usePermissions';
import { isUserAdmin } from '../utils/permissions';
import HomeReminders from '../components/HomeReminders';
import HomeNotifications from '../components/HomeNotifications';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { hasAccess, loading: permissionsLoading, getAccessibleModules } = usePermissions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = isUserAdmin(user);

  // Módulos de acceso rápido (flujo principal)
  const quickAccessModules = [
    { id: 'quick_ins', moduleId: 'quality_alert', code: 'INS', name: { es: 'Inspección', en: 'Inspection' }, path: '/defect-capture' },
    { id: 'quick_est', moduleId: 'quality_alert', code: 'EST', name: { es: 'Estación Reparación', en: 'Repair Station' }, path: '/repair-station' },
    { id: 'quick_rel', moduleId: 'quality_alert', code: 'REL', name: { es: 'Release', en: 'Release' }, path: '/release-ok' },
    { id: 'quick_mrb', moduleId: 'mrb', code: 'MRB', name: { es: 'Material Review', en: 'Material Review' }, path: '/mrb-dashboard' }
  ];

  // Módulos organizados en 4 grupos principales
  const moduleCategories = [
    {
      id: 'proceso',
      name: { es: 'PROCESO', en: 'PROCESS' },
      modules: [
        { id: 'quality_alert', moduleId: 'quality_alert', code: 'QAR', name: { es: 'Alerta de Calidad', en: 'Quality Alert' }, desc: { es: 'Gestión de alertas', en: 'Alert management' }, path: '/defect-dashboard' },
        { id: 'defect_hospital', moduleId: 'quality_alert', code: 'HOS', name: { es: 'Hospital Defectos', en: 'Defect Hospital' }, desc: { es: 'Piezas retenidas', en: 'Retained parts' }, path: '/hospital-dashboard' },
        { id: 'calibration', moduleId: 'quality_alert', code: 'CAL', name: { es: 'Calibración', en: 'Calibration' }, desc: { es: 'Instrumentos', en: 'Instruments' }, path: '/calibration' },
        { id: '8d', moduleId: '8d', code: '8D', name: { es: '8D Reports', en: '8D Reports' }, desc: { es: 'Abiertos / revisión', en: 'Open / review' }, path: '/dashboard' },
        { id: 'ecr', moduleId: 'ecr', code: 'ECR', name: { es: 'Cambios Ing.', en: 'Eng. Changes' }, desc: { es: 'ECR en trámite', en: 'ECR in process' }, path: '/ecr-dashboard' }
      ]
    },
    {
      id: 'documentacion',
      name: { es: 'DOCUMENTACIÓN', en: 'DOCUMENTATION' },
      modules: [
        { id: 'work_instructions', moduleId: 'work_instructions', code: 'WI', name: { es: 'Work Instructions', en: 'Work Instructions' }, desc: { es: 'Instrucciones versionadas', en: 'Versioned instructions' }, path: '/work-instructions' },
        { id: 'iluo', moduleId: 'work_instructions', code: 'ILU', name: { es: 'Certificaciones ILUO', en: 'ILUO Certifications' }, desc: { es: 'Matriz de cobertura', en: 'Coverage matrix' }, path: '/work-instructions-dashboard' },
        { id: 'skills', moduleId: 'skills', code: 'SKL', name: { es: 'Skills & Training', en: 'Skills & Training' }, desc: { es: 'Capacitación', en: 'Training' }, path: '/skills/dashboard' }
      ]
    },
    {
      id: 'administracion',
      name: { es: 'ADMINISTRACIÓN', en: 'ADMINISTRATION' },
      modules: [
        { id: 'audits', moduleId: 'audits', code: 'AUD', name: { es: 'Auditorías', en: 'Audits' }, desc: { es: 'Programadas', en: 'Scheduled' }, path: '/audit-dashboard' },
        { id: 'clients', moduleId: 'clients', code: 'CLT', name: { es: 'Clientes', en: 'Clients' }, desc: { es: 'Requisitos', en: 'Requirements' }, path: '/clients' },
        { id: 'management_review', moduleId: 'management_review', code: 'MGT', name: { es: 'Revisión Directiva', en: 'Management Review' }, desc: { es: 'Management review', en: 'Management review' }, path: '/management-review' }
      ]
    },
    {
      id: 'sistema',
      name: { es: 'SISTEMA', en: 'SYSTEM' },
      modules: [
        { id: 'reports', moduleId: 'reports', code: 'RPT', name: { es: 'Centro Reportes', en: 'Report Center' }, desc: { es: 'Reportes y export', en: 'Reports & export' }, path: '/report-center' },
        { id: 'configuration', moduleId: 'admin', code: 'CFG', name: { es: 'Configuración', en: 'Configuration' }, desc: { es: 'Parámetros', en: 'Parameters' }, path: '/configuration', adminOnly: true },
        { id: 'user_manual', moduleId: 'help', code: '?', name: { es: 'Manual', en: 'Manual' }, desc: { es: 'Ayuda', en: 'Help' }, path: '/manual' }
      ]
    }
  ];

  // Filtrar categorías y módulos según permisos
  const getVisibleCategories = () => {
    const accessibleModules = getAccessibleModules();

    return moduleCategories.map(cat => ({
      ...cat,
      modules: cat.modules.filter(mod => {
        if (mod.adminOnly && !isAdmin) return false;
        if (isAdmin) return true;
        return accessibleModules.includes(mod.moduleId) || hasAccess(mod.moduleId, 'view');
      })
    })).filter(cat => cat.modules.length > 0);
  };

  const visibleCategories = getVisibleCategories();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatClock = () => {
    return currentTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  if (permissionsLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${t.border}`, borderTopColor: t.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Estilo badges con color primario (igual que QMS)
  const badgeStyle = (isHovered) => ({
    width: 44, height: 44, borderRadius: 10,
    background: t.primary,
    opacity: isHovered ? 1 : 0.85,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 11, fontWeight: 800,
    fontFamily: "'IBM Plex Mono', monospace",
    transition: 'opacity 0.15s ease'
  });

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: t.bg, fontFamily: "'Public Sans', 'Inter', sans-serif", color: t.text }}>

      {/* Header */}
      <div style={{ height: 64, background: t.bgCard, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 6, background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>QMS</span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: t.text, letterSpacing: -0.1 }}>Quality Management System</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{formatClock()}</div>
          <div style={{ width: 1, height: 22, background: t.border }} />

          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, color: t.text, background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: 4, cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>

          <ThemeSelector />

          <div style={{ width: 1, height: 22, background: t.border }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11.5 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ lineHeight: 1.25, whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize: 10.5, color: t.textMuted }}>{user?.position || user?.role}</div>
            </div>
          </div>

          <button onClick={handleLogout} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, color: t.textMuted, background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: 4, cursor: 'pointer' }}>
            {language === 'es' ? 'Salir' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px 28px 48px 28px', display: 'flex', gap: 24 }}>

        {/* Columna izquierda: Mi Workload + Notificaciones */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <HomeReminders />
          <HomeNotifications />
        </div>

        {/* Columna derecha: Grid de 4 grupos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {visibleCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 32px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
                {language === 'es' ? 'Sin acceso a módulos' : 'No module access'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Accesos Directos - 4 módulos */}
              <div style={{
                background: t.bgCard,
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                padding: '28px 16px 16px 16px',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute',
                  top: 8,
                  left: 16,
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.text,
                  letterSpacing: 0.5,
                  opacity: 0.5
                }}>
                  {language === 'es' ? 'ACCESOS DIRECTOS' : 'QUICK ACCESS'}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {quickAccessModules.map(mod => (
                    <div
                      key={mod.id}
                      onClick={() => navigate(mod.path)}
                      onMouseEnter={() => setHoveredCard(mod.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: hoveredCard === mod.id ? t.bgPanel : 'transparent',
                        borderRadius: 8,
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        border: `1px solid ${hoveredCard === mod.id ? t.border : 'transparent'}`
                      }}
                    >
                      <div style={badgeStyle(hoveredCard === mod.id)}>{mod.code}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{mod.name[language]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PROCESO - 5 módulos */}
              {visibleCategories.find(c => c.id === 'proceso') && (
                <div style={{
                  background: t.bgCard,
                  borderRadius: 10,
                  border: `1px solid ${t.border}`,
                  padding: 16
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 16, letterSpacing: 0.5, opacity: 0.5 }}>
                    {visibleCategories.find(c => c.id === 'proceso')?.name[language]}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {visibleCategories.find(c => c.id === 'proceso')?.modules.map(mod => (
                      <div
                        key={mod.id}
                        onClick={() => navigate(mod.path)}
                        onMouseEnter={() => setHoveredCard(mod.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{
                          background: hoveredCard === mod.id ? t.bgPanel : 'transparent',
                          borderRadius: 8,
                          padding: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          border: `1px solid ${hoveredCard === mod.id ? t.border : 'transparent'}`
                        }}
                      >
                        <div style={badgeStyle(hoveredCard === mod.id)}>{mod.code}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginTop: 10, lineHeight: 1.3 }}>{mod.name[language]}</div>
                        <div style={{ fontSize: 9, color: t.textMuted, marginTop: 4 }}>{mod.desc[language]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fila inferior: DOCUMENTACIÓN, ADMINISTRACIÓN, SISTEMA */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, alignItems: 'start' }}>

                {/* DOCUMENTACIÓN */}
                {visibleCategories.find(c => c.id === 'documentacion') && (
                  <div style={{
                    background: t.bgCard,
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    padding: 16
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 14, letterSpacing: 0.5, opacity: 0.5 }}>
                      {visibleCategories.find(c => c.id === 'documentacion')?.name[language]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleCategories.find(c => c.id === 'documentacion')?.modules.map(mod => (
                        <div
                          key={mod.id}
                          onClick={() => navigate(mod.path)}
                          onMouseEnter={() => setHoveredCard(mod.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            background: hoveredCard === mod.id ? t.bgPanel : 'transparent',
                            borderRadius: 8,
                            padding: 10,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            border: `1px solid ${hoveredCard === mod.id ? t.border : 'transparent'}`
                          }}
                        >
                          <div style={{ ...badgeStyle(hoveredCard === mod.id), width: 36, height: 36, fontSize: 10 }}>{mod.code}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{mod.name[language]}</div>
                            <div style={{ fontSize: 10, color: t.textMuted }}>{mod.desc[language]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ADMINISTRACIÓN */}
                {visibleCategories.find(c => c.id === 'administracion') && (
                  <div style={{
                    background: t.bgCard,
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    padding: 16
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 14, letterSpacing: 0.5, opacity: 0.5 }}>
                      {visibleCategories.find(c => c.id === 'administracion')?.name[language]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleCategories.find(c => c.id === 'administracion')?.modules.map(mod => (
                        <div
                          key={mod.id}
                          onClick={() => navigate(mod.path)}
                          onMouseEnter={() => setHoveredCard(mod.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            background: hoveredCard === mod.id ? t.bgPanel : 'transparent',
                            borderRadius: 8,
                            padding: 10,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            border: `1px solid ${hoveredCard === mod.id ? t.border : 'transparent'}`
                          }}
                        >
                          <div style={{ ...badgeStyle(hoveredCard === mod.id), width: 36, height: 36, fontSize: 10 }}>{mod.code}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{mod.name[language]}</div>
                            <div style={{ fontSize: 10, color: t.textMuted }}>{mod.desc[language]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SISTEMA */}
                {visibleCategories.find(c => c.id === 'sistema') && (
                  <div style={{
                    background: t.bgCard,
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    padding: 16
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 14, letterSpacing: 0.5, opacity: 0.5 }}>
                      {visibleCategories.find(c => c.id === 'sistema')?.name[language]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleCategories.find(c => c.id === 'sistema')?.modules.map(mod => (
                        <div
                          key={mod.id}
                          onClick={() => navigate(mod.path)}
                          onMouseEnter={() => setHoveredCard(mod.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            background: hoveredCard === mod.id ? t.bgPanel : 'transparent',
                            borderRadius: 8,
                            padding: 10,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            border: `1px solid ${hoveredCard === mod.id ? t.border : 'transparent'}`
                          }}
                        >
                          <div style={{ ...badgeStyle(hoveredCard === mod.id), width: 36, height: 36, fontSize: 10 }}>{mod.code}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{mod.name[language]}</div>
                            <div style={{ fontSize: 10, color: t.textMuted }}>{mod.desc[language]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
