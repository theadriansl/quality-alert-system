import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import eightDService from '../services/eightDService';
import { useAuth } from '../context/AuthContext';

// Simulación de los contexts
const useLanguage = () => {
  const [language, setLanguage] = useState('es');
  
  const translations = {
    en: {
      systemName: '8D Problem Solving System',
      dashboard: 'Executive Dashboard',
      welcome: 'Welcome',
      language: 'Language',
      totalReports: 'Total Reports',
      openReports: 'Open Reports',
      closedReports: 'Closed Reports',
      overdueReports: 'Overdue',
      totalCost: 'Total Cost',
      severity: { High: 'High', Medium: 'Medium', Low: 'Low' },
      roles: {
        Champion: 'Quality Director',
        Manager: 'Quality Manager',
        Engineer: 'Quality Engineer',
        Technician: 'Quality Technician'
      },
      severityDistribution: 'Severity Distribution',
      myAssignedReports: 'My Assigned 8D Reports',
      openReportsList: 'Open 8D Reports',
      delayReason: 'Delay Reason',
      phase: 'Phase',
      detailedStatus: 'Status',
      customer: 'Supplier/Customer',
      daysOpen: 'Days Open',
      progress: 'Progress',
      cost: 'Cost',
      actions: 'Actions',
      newReport: 'New 8D',
      logout: 'Logout'
    },
    es: {
      systemName: 'Sistema 8D de Solución de Problemas',
      dashboard: 'Tablero Ejecutivo',
      welcome: 'Bienvenido',
      language: 'Idioma',
      logout: 'Cerrar Sesión',
      totalReports: 'Total Reportes',
      openReports: 'Reportes Abiertos',
      closedReports: 'Reportes Cerrados',
      overdueReports: 'Fuera de Tiempo',
      totalCost: 'Costo Total',
      severity: { High: 'Alta', Medium: 'Media', Low: 'Baja' },
      roles: {
        Champion: 'Director de Calidad',
        Manager: 'Gerente de Calidad',
        Engineer: 'Ingeniero de Calidad',
        Technician: 'Técnico de Calidad'
      },
      severityDistribution: 'Distribución por Severidad',
      myAssignedReports: 'Mis 8D Asignados',
      openReportsList: 'Reportes 8D Abiertos',
      delayReason: 'Razón de Atraso',
      phase: 'Fase',
      detailedStatus: 'Estado',
      customer: 'Proveedor/Cliente',
      daysOpen: 'Días Abierto',
      progress: 'Progreso',
      cost: 'Costo',
      actions: 'Acciones',
      newReport: 'Nuevo 8D'
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('8d-system-language', newLang);
  };

  const formatCurrency = (amount) => {
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return { language, changeLanguage, t, formatCurrency };
};

const Dashboard = () => {
  const { language, changeLanguage, t, formatCurrency } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();  //  Usar el usuario REAL del contexto de autenticación

  // REMOVIDO: const [user] = useState({ ... hardcoded data ...
  // Ahora usamos el usuario real del AuthContext que tiene:
  // { id, email, firstName, lastName, role, position, department, etc. }

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';

  const [active8D, setActive8D] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Cargar 8D activo desde localStorage
  useEffect(() => {
    const data = eightDService.getBasicData();
    if (data) {
      setActive8D(data);
      console.log(' Dashboard: 8D activo encontrado:', data);
    }
  }, []);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Generar lista de reportes que incluye el 8D activo
  const getOpenReportsList = () => {
    const staticReports = dashboardData.openReportsList || [];
    
    if (active8D) {
      const activeReport = {
        id: active8D.reportId,
        title: active8D.title,
        customer: active8D.supplierName,
        severity: active8D.severidad || 'Medium',
        status: getNextStepInfo(active8D.currentStep).step,
        progress: getProgressPercentage(active8D.currentStep),
        daysOpen: Math.floor((new Date() - new Date(active8D.createdAt)) / (1000 * 60 * 60 * 24)) || 0,
        estimatedCost: 0,
        delayReason: 'En progreso',
        isOverdue: false,
        isActive: true
      };
      
      return [activeReport, ...staticReports];
    }
    
    return staticReports;
  };

  const getProgressPercentage = (currentStep) => {
    const progressMap = {
      'escalation': 25,
      'analysis': 50,
      'create8d': 75,
      'validation': 100
    };
    return progressMap[currentStep] || 25;
  };

  // Función para navegar al siguiente paso del 8D (ahora usando el nuevo workflow)
  const getNextStepInfo = (currentStep) => {
    const stepMap = {
      'escalation': { next: '/8d-workflow', step: 'D2: Análisis', description: 'Describir el problema' },
      'analysis': { next: '/8d-workflow', step: 'D3-D5: Desarrollo', description: 'Crear plan 8D completo' },
      'create8d': { next: '/8d-workflow', step: 'D6-D8: Validación', description: 'Validar e implementar' },
      'validation': { next: null, step: 'Completado', description: '8D finalizado' }
    };
    return stepMap[currentStep] || stepMap['escalation'];
  };

  const handleContinue8D = () => {
    if (active8D) {
      const nextStep = getNextStepInfo(active8D.currentStep);
      if (nextStep.next) {
        navigate(nextStep.next);
      }
    }
  };

  // Función para crear un nuevo 8D
  const handleCreateNew8D = () => {
    // Limpiar cualquier 8D existente
    eightDService.clearData();
    // Navegar al nuevo workflow
    navigate('/8d-workflow');
  };

  // Función para ver un reporte existente (solo lectura)
  const handleViewReport = (reportId) => {
    navigate(`/8d-workflow?reportId=${reportId}&mode=view`);
  };

  // Función para editar un reporte existente
  const handleEditReport = (reportId) => {
    navigate(`/8d-workflow?reportId=${reportId}&mode=edit`);
  };

  const [dashboardData, setDashboardData] = useState({
    totalReports: 0,
    openReports: 0,
    closedReports: 0,
    overdueReports: 0,
    totalCost: 0,
    severityData: [
      { severity: 'High', count: 0, percentage: 0 },
      { severity: 'Medium', count: 0, percentage: 0 },
      { severity: 'Low', count: 0, percentage: 0 }
    ],
    openReportsList: []
  });

  const [myAssignedReports, setMyAssignedReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Load metrics, open reports, and assigned reports in parallel
        const [metrics, openReports, assignedReports] = await Promise.all([
          eightDService.getDashboardMetrics(),
          eightDService.getOpenReports(),
          eightDService.getMyAssignedReports()
        ]);

        // Set assigned reports
        setMyAssignedReports(assignedReports || []);

        if (metrics) {
          // Calculate severity percentages
          const totalSeverity = parseInt(metrics.high_severity) + parseInt(metrics.medium_severity) + parseInt(metrics.low_severity);
          const severityData = [
            { 
              severity: 'High', 
              count: parseInt(metrics.high_severity), 
              percentage: totalSeverity > 0 ? Math.round((parseInt(metrics.high_severity) / totalSeverity) * 100) : 0 
            },
            { 
              severity: 'Medium', 
              count: parseInt(metrics.medium_severity), 
              percentage: totalSeverity > 0 ? Math.round((parseInt(metrics.medium_severity) / totalSeverity) * 100) : 0 
            },
            { 
              severity: 'Low', 
              count: parseInt(metrics.low_severity), 
              percentage: totalSeverity > 0 ? Math.round((parseInt(metrics.low_severity) / totalSeverity) * 100) : 0 
            }
          ];

          setDashboardData(prevData => ({
            ...prevData,
            totalReports: parseInt(metrics.total_reports) || 0,
            openReports: parseInt(metrics.open_reports) || 0,
            closedReports: parseInt(metrics.closed_reports) || 0,
            overdueReports: parseInt(metrics.overdue_reports) || 0,
            totalCost: parseFloat(metrics.total_estimated_cost) || 0,
            severityData,
            openReportsList: openReports || []
          }));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Estilos CSS inline para garantizar funcionamiento
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    logo: {
      width: '32px',
      height: '32px',
      background: 'linear-gradient(135deg, #0072CE, #8b5cf6)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginLeft: '16px'
    },
    content: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    kpiContainer: {
      display: 'flex',
      gap: '24px',
      marginBottom: '32px'
    },
    kpiCard: {
      flex: '1',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '32px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      transition: 'box-shadow 0.2s ease',
      cursor: 'pointer'
    },
    kpiIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      color: 'white',
      marginBottom: '24px'
    },
    kpiValue: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '8px'
    },
    kpiTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '8px'
    },
    kpiSubtitle: {
      fontSize: '12px',
      color: '#9ca3af'
    },
    trend: {
      fontSize: '14px',
      fontWeight: '600',
      marginLeft: 'auto'
    },
    chartContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginBottom: '32px'
    },
    chartCard: {
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    chartHeader: {
      padding: '24px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937'
    },
    chartContent: {
      padding: '24px'
    },
    tableCard: {
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '32px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '16px',
      fontWeight: '600',
      color: '#374151',
      borderBottom: '1px solid #E6EAEE'
    },
    td: {
      padding: '20px 16px',
      borderBottom: '1px solid #F4F6F8'
    },
    progressBar: {
      width: '100px',
      height: '6px',
      backgroundColor: '#E6EAEE',
      borderRadius: '3px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s ease'
    }
  };

  const TileCard = ({ title, value, subtitle, icon, color, trend }) => (
    <div 
      style={{
        ...styles.kpiCard,
        ':hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
      }}
      onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
      onMouseLeave={(e) => e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ ...styles.kpiIcon, backgroundColor: color }}>
          {icon}
        </div>
        {trend && (
          <div style={{ 
            ...styles.trend, 
            color: trend > 0 ? '#2E7D32' : '#ef4444' 
          }}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiTitle}>{title}</div>
      <div style={styles.kpiSubtitle}>{subtitle}</div>
    </div>
  );

  const ProgressBar = ({ value, color = '#0072CE' }) => (
    <div style={styles.progressBar}>
      <div 
        style={{
          ...styles.progressFill,
          width: `${value}%`,
          backgroundColor: color
        }}
      />
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <nav style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={styles.logo}>8D</div>
          <h1 style={styles.title}>{t('systemName')}</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleCreateNew8D}
            style={{
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
          >
            <span style={{ fontSize: '16px' }}></span>
            {t('newReport')}
          </button>
          
          <button
            onClick={() => navigate('/8d-consultation')}
            style={{
              backgroundColor: '#0072CE',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#0072CE'}
          >
            <span style={{ fontSize: '16px' }}></span>
            Consultar 8D
          </button>

          <button
            onClick={() => navigate('/clients')}
            style={{
              backgroundColor: '#2E7D32',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2E7D32'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2E7D32'}
          >
            <span style={{ fontSize: '16px' }}></span>
            Clientes / Proveedores
          </button>

          <button
            onClick={() => navigate('/user-management')}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
          >
            <span style={{ fontSize: '16px' }}></span>
            Usuarios
          </button>
          
          <select 
            value={language} 
            onChange={(e) => changeLanguage(e.target.value)}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="es"> Español</option>
            <option value="en"> English</option>
          </select>
          
          <div style={{ position: 'relative' }} data-user-menu>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F4F6F8'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#0072CE',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                QD
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{userName}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{user?.position || t(`roles.${user?.role}`)}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>▼</div>
            </div>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E6EAEE',
                minWidth: '180px',
                zIndex: 1000
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#F4F6F8'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                   {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={styles.content}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            {t('dashboard')}
          </h2>
          <p style={{ color: '#6b7280' }}>
            {t('welcome')}, {user.name} • {new Date().toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Loading Indicator */}
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            fontSize: '18px',
            color: '#6b7280'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #E6EAEE',
                borderTop: '3px solid #0072CE',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Cargando datos del dashboard...
            </div>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        ) : (
          <>

        {/* KPI Tiles */}
        <div style={styles.kpiContainer}>
          <TileCard 
            title={t('totalReports')}
            value={dashboardData.totalReports}
            subtitle="Total histórico"
            icon=""
            color="#0072CE"
            trend={8}
          />
          <TileCard 
            title={t('openReports')}
            value={dashboardData.openReports}
            subtitle="En progreso activo"
            icon=""
            color="#ea580c"
            trend={-3}
          />
          <TileCard 
            title={t('closedReports')}
            value={dashboardData.closedReports}
            subtitle="Completados exitosamente"
            icon=""
            color="#2E7D32"
            trend={12}
          />
          <TileCard 
            title={t('overdueReports')}
            value={dashboardData.overdueReports}
            subtitle="Requieren atención"
            icon=""
            color="#ef4444"
            trend={-15}
          />
          <TileCard 
            title={t('totalCost')}
            value={formatCurrency(dashboardData.totalCost)}
            subtitle="Impacto financiero"
            icon=""
            color="#8b5cf6"
            trend={5}
          />
        </div>

        {/* Charts Section */}
        <div style={styles.chartContainer}>
          {/* Severity Distribution */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>{t('severityDistribution')}</div>
            <div style={styles.chartContent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Severity circles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  {dashboardData.severityData.map((item, index) => (
                    <div key={item.severity} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: item.severity === 'High' ? '#ef4444' :
                                       item.severity === 'Medium' ? '#C77700' : '#2E7D32',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        margin: '0 auto 8px'
                      }}>
                        {item.count}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>
                        {t(`severity.${item.severity}`)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        {item.percentage}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Critical Alerts - Hall of Shame */}
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#B00020',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                     ALERTAS CRÍTICAS
                  </div>

                  {/* Critical overdue items */}
                  <div style={{ marginBottom: '16px' }}>
                    {(() => {
                      const criticalItems = [
                        {
                          responsible: 'J. García',
                          task: 'D4 - Análisis Causa',
                          daysLate: 7,
                          reportId: '8D-2024-015',
                          severity: 'High'
                        },
                        {
                          responsible: 'M. López',
                          task: 'D6 - Implementar',
                          daysLate: 4,
                          reportId: '8D-2024-012',
                          severity: 'High'
                        },
                        {
                          responsible: 'A. Rodríguez',
                          task: 'D2 - Definir Problema',
                          daysLate: 12,
                          reportId: '8D-2024-008',
                          severity: 'Medium'
                        }
                      ];

                      return criticalItems.map((item, index) => (
                        <div key={index} style={{
                          backgroundColor: index === 0 ? '#fef2f2' : index === 1 ? '#fefbeb' : '#FAFBFC',
                          border: `1px solid ${index === 0 ? '#fecaca' : index === 1 ? '#fed7aa' : '#E6EAEE'}`,
                          borderRadius: '6px',
                          padding: '8px',
                          marginBottom: '6px',
                          fontSize: '10px'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              fontWeight: '700',
                              color: index === 0 ? '#B00020' : index === 1 ? '#C77700' : '#374151'
                            }}>
                              {item.responsible}
                            </span>
                            <span style={{
                              backgroundColor: index === 0 ? '#B00020' : index === 1 ? '#C77700' : '#6b7280',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: '600'
                            }}>
                              +{item.daysLate} DÍAS
                            </span>
                          </div>
                          <div style={{ color: '#6b7280', marginBottom: '2px' }}>
                            {item.task} - {item.reportId}
                          </div>
                          <div style={{
                            color: index === 0 ? '#B00020' : index === 1 ? '#C77700' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '9px'
                          }}>
                            {index === 0 ? ' CRÍTICO - ESCALADO A DIRECCIÓN' :
                             index === 1 ? ' URGENTE - NOTIFICAR GERENCIA' :
                             ' PENDIENTE - SEGUIMIENTO REQUERIDO'}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Performance ranking */}
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '8px'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#B00020',
                      marginBottom: '6px',
                      textAlign: 'center'
                    }}>
                       RANKING DE INCUMPLIMIENTO
                    </div>
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>1. A. Rodríguez</span>
                        <span style={{ color: '#B00020', fontWeight: '600' }}>12 días promedio</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>2. J. García</span>
                        <span style={{ color: '#C77700', fontWeight: '600' }}>8 días promedio</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>3. M. López</span>
                        <span style={{ color: '#C77700', fontWeight: '600' }}>6 días promedio</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 8D Disciplines Progress Chart */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>Progreso de Disciplinas 8D</div>
            <div style={styles.chartContent}>
              <div style={{
                display: 'flex',
                alignItems: 'end',
                justifyContent: 'space-around',
                height: '160px',
                borderBottom: '1px solid #E6EAEE',
                marginBottom: '16px',
                padding: '0 8px'
              }}>
                {(() => {
                  const totalReports = getOpenReportsList().length || 1;
                  return [
                    { discipline: 'D1', completed: Math.floor(totalReports * 0.95), color: '#2E7D32' },
                    { discipline: 'D2', completed: Math.floor(totalReports * 0.85), color: '#06b6d4' },
                    { discipline: 'D3', completed: Math.floor(totalReports * 0.75), color: '#0072CE' },
                    { discipline: 'D4', completed: Math.floor(totalReports * 0.65), color: '#8b5cf6' },
                    { discipline: 'D5', completed: Math.floor(totalReports * 0.45), color: '#C77700' },
                    { discipline: 'D6', completed: Math.floor(totalReports * 0.35), color: '#ef4444' },
                    { discipline: 'D7', completed: Math.floor(totalReports * 0.25), color: '#84cc16' },
                    { discipline: 'D8', completed: Math.floor(totalReports * 0.15), color: '#6b7280' }
                  ];
                })().map((item, index) => {
                  const percentage = getOpenReportsList().length > 0 ? (item.completed / getOpenReportsList().length) * 100 : 0;
                  const barHeight = Math.max(percentage * 1.2, 6);

                  return (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '28px'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '4px'
                      }}>
                        {item.completed}
                      </div>
                      <div style={{
                        width: '20px',
                        height: `${barHeight}px`,
                        backgroundColor: item.color,
                        borderRadius: '2px 2px 0 0'
                      }} />
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#374151',
                        marginTop: '6px'
                      }}>
                        {item.discipline}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {getOpenReportsList().length} 8Ds Activos
              </div>
            </div>
          </div>
        </div>

        {/* My Assigned Reports Table */}
        {myAssignedReports.length > 0 && (
          <div style={styles.tableCard}>
            <div style={styles.chartHeader}>
               {t('myAssignedReports')} ({myAssignedReports.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Título</th>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>{t('phase')}</th>
                    <th style={styles.th}>{t('detailedStatus')}</th>
                    <th style={styles.th}>Severidad</th>
                    <th style={styles.th}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssignedReports.map((report) => (
                    <tr key={report.id} style={{
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s'
                    }}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '500', color: '#0072CE' }}>
                          {report.reportId || report.report_id}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {report.title}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#6b7280' }}>
                          {report.supplierName || report.supplier_name || 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#f0f9ff',
                          color: '#0369a1'
                        }}>
                          {report.phase}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor:
                            report.detailedStatus === 'Draft' ? '#F4F6F8' :
                            report.detailedStatus === 'Under Approval' ? '#fef3c7' :
                            report.detailedStatus === 'Rejected - Needs Revision' ? '#fee2e2' :
                            report.detailedStatus === 'Under Countermeasure' ? '#dbeafe' :
                            report.detailedStatus === 'Closed' ? '#d1fae5' : '#F4F6F8',
                          color:
                            report.detailedStatus === 'Draft' ? '#6b7280' :
                            report.detailedStatus === 'Under Approval' ? '#92400e' :
                            report.detailedStatus === 'Rejected - Needs Revision' ? '#B00020' :
                            report.detailedStatus === 'Under Countermeasure' ? '#0F3B5F' :
                            report.detailedStatus === 'Closed' ? '#065f46' : '#6b7280'
                        }}>
                          {report.detailedStatus}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: report.severity === 'High' ? '#fef2f2' :
                                         report.severity === 'Medium' ? '#fefbeb' : '#f0fdf4',
                          color: report.severity === 'High' ? '#B00020' :
                                 report.severity === 'Medium' ? '#C77700' : '#16a34a'
                        }}>
                          {t(`severity.${report.severity}`)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleEditReport(report.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0072CE',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Open Reports Table */}
        <div style={styles.tableCard}>
          <div style={styles.chartHeader}>{t('openReportsList')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Problema</th>
                  <th style={styles.th}>{t('customer')}</th>
                  <th style={styles.th}>Severidad</th>
                  <th style={styles.th}>{t('progress')}</th>
                  <th style={styles.th}>{t('daysOpen')}</th>
                  <th style={styles.th}>{t('cost')}</th>
                  <th style={styles.th}>{t('delayReason')}</th>
                  <th style={styles.th}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {getOpenReportsList().map((report) => (
                  <tr key={report.id} style={{
                    backgroundColor: report.isOverdue ? '#fef2f2' : report.isActive ? '#f0f9ff' : 'transparent',
                    borderLeft: report.isActive ? '4px solid #0ea5e9' : 'none'
                  }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500', color: '#0072CE' }}>{report.id}</div>
                      {report.isOverdue && (
                        <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>
                          VENCIDO
                        </div>
                      )}
                      {report.isActive && (
                        <div style={{ fontSize: '10px', color: '#0ea5e9', fontWeight: '600' }}>
                           ACTIVO
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>{report.title}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: '#6b7280' }}>{report.customer}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: report.severity === 'High' ? '#fef2f2' : 
                                       report.severity === 'Medium' ? '#fefbeb' : '#f0fdf4',
                        color: report.severity === 'High' ? '#B00020' : 
                               report.severity === 'Medium' ? '#C77700' : '#16a34a'
                      }}>
                        {t(`severity.${report.severity}`)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ width: '100px' }}>
                        <div style={{ fontSize: '12px', marginBottom: '4px', textAlign: 'center' }}>
                          {report.progress}%
                        </div>
                        <ProgressBar 
                          value={report.progress} 
                          color={report.progress > 70 ? '#2E7D32' : 
                                 report.progress > 40 ? '#C77700' : '#ef4444'} 
                        />
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        fontWeight: '500',
                        color: report.isOverdue ? '#ef4444' : 
                               report.daysOpen > 15 ? '#C77700' : '#6b7280'
                      }}>
                        {report.daysOpen}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500', color: '#1f2937' }}>
                        {formatCurrency(report.estimatedCost)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        color: report.delayReason !== '-' ? '#ef4444' : '#9ca3af',
                        fontWeight: report.delayReason !== '-' ? '500' : 'normal'
                      }}>
                        {report.delayReason}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {report.isActive ? (
                          <button 
                            onClick={handleContinue8D}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: '#0ea5e9',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                             Continuar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleViewReport(report.id)}
                              style={{
                                padding: '8px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#dbeafe',
                                color: '#2563eb',
                                cursor: 'pointer'
                              }}
                              title="Ver reporte"
                            ></button>
                            <button
                              onClick={() => handleEditReport(report.id)}
                              style={{
                                padding: '8px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                cursor: 'pointer'
                              }}
                              title="Editar reporte"
                            ></button>
                          </>
                        )}
                        <button style={{
                          padding: '8px',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: '#f3e8ff',
                          color: '#9333ea',
                          cursor: 'pointer'
                        }}></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;