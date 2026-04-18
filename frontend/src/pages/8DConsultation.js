import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eightDService } from '../services/eightDService';
import { isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';

const EightDConsultation = () => {
  const navigate = useNavigate();
  const { theme: themeColors } = useTheme();
  const [language, setLanguage] = useState('es');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [eightDReports, setEightDReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si el usuario es admin
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isUserAdmin(currentUser);

  // Cargar reportes 8D desde la API
  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);

        // Intentar obtener datos de la API primero
        const openReports = await eightDService.getOpenReports();

        if (openReports && openReports.length > 0) {
          // Convertir los datos de la API al formato esperado por la UI
          const formattedReports = openReports.map(report => ({
            id: report.report_id || report.id,
            title: report.title,
            supplierName: report.customer || 'N/A', // customer se mapea a supplier
            partNumber: report.part_number || 'N/A',
            partName: report.part_name || 'N/A',
            status: mapBackendStatusToFrontend(report.status),
            currentStep: mapStatusToStep(report.status),
            severity: report.severity || 'Minor',
            createdAt: report.created_at || new Date().toISOString(),
            lastModified: report.updated_at || new Date().toISOString(),
            assignedTeam: [
              report.issue_assignee,
              report.countermeasure_assignee,
              report.confirmation_assignee
            ].filter(assignee => assignee && assignee !== '-')
          }));

          setEightDReports(formattedReports);
        } else {
          // Fallback a datos de muestra si no hay datos de la API
          setEightDReports([]);
        }
      } catch (err) {
        console.error('Error loading 8D reports:', err);
        setError('Error al cargar los reportes 8D');
        setEightDReports([]); // Usar array vacío en caso de error
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  // Función para mapear el estado del backend al frontend
  const mapBackendStatusToFrontend = (backendStatus) => {
    if (!backendStatus) return 'pending';

    if (backendStatus.includes('D8') || backendStatus.includes('Closed')) {
      return 'completed';
    } else if (backendStatus.includes('D1') || backendStatus.includes('Team Formation')) {
      return 'pending';
    } else {
      return 'in_progress';
    }
  };

  // Función para mapear estado a paso actual
  const mapStatusToStep = (status) => {
    if (!status) return 'escalation';

    if (status.includes('D1')) return 'team_formation';
    if (status.includes('D2')) return 'problem_definition';
    if (status.includes('D3')) return 'containment';
    if (status.includes('D4')) return 'analysis';
    if (status.includes('D5')) return 'corrective_actions';
    if (status.includes('D6')) return 'implementation';
    if (status.includes('D7')) return 'preventive_actions';
    if (status.includes('D8')) return 'closed';

    return 'analysis';
  };

  const translations = {
    en: {
      title: '8D Reports Consultation',
      search: 'Search reports...',
      status: 'Status',
      sortBy: 'Sort by',
      all: 'All',
      inProgress: 'In Progress',
      completed: 'Completed',
      pending: 'Pending',
      recent: 'Most Recent',
      oldest: 'Oldest',
      alphabetical: 'Alphabetical',
      loading: 'Loading reports...',
      error: 'Error loading reports',
      noResults: 'No reports found',
      reportId: 'Report ID',
      supplier: 'Supplier',
      part: 'Part',
      severity: 'Severity',
      created: 'Created',
      modified: 'Last Modified',
      team: 'Assigned Team',
      actions: 'Actions',
      view: 'View',
      edit: 'Edit',
      backToDashboard: 'Back to Dashboard',
      step: 'Step',
      critical: 'Critical',
      major: 'Major',
      minor: 'Minor'
    },
    es: {
      title: 'Consulta de Reportes 8D',
      search: 'Buscar reportes...',
      status: 'Estado',
      sortBy: 'Ordenar por',
      all: 'Todos',
      inProgress: 'En Progreso',
      completed: 'Completado',
      pending: 'Pendiente',
      recent: 'Más Reciente',
      oldest: 'Más Antiguo',
      alphabetical: 'Alfabético',
      loading: 'Cargando reportes...',
      error: 'Error al cargar reportes',
      noResults: 'No se encontraron reportes',
      reportId: 'ID Reporte',
      supplier: 'Proveedor',
      part: 'Parte',
      severity: 'Severidad',
      created: 'Creado',
      modified: 'Última Modificación',
      team: 'Equipo Asignado',
      actions: 'Acciones',
      view: 'Ver',
      edit: 'Editar',
      backToDashboard: 'Volver al Dashboard',
      step: 'Paso',
      critical: 'Crítico',
      major: 'Mayor',
      minor: 'Menor'
    }
  };

  const t = (key) => translations[language][key] || key;

  const getStatusBadge = (status) => {
    const statusConfig = {
      'in_progress': { color: themeColors.accent, bg: '#dbeafe', label: t('inProgress') },
      'completed': { color: '#22c55e', bg: '#dcfce7', label: t('completed') },
      'pending': { color: '#C77700', bg: '#fef3c7', label: t('pending') }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {config.label}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      'Critical': { color: '#B00020', bg: '#fee2e2' },
      'Major': { color: '#C77700', bg: '#fef3c7' },
      'Minor': { color: '#2E7D32', bg: '#d1fae5' }
    };
    
    const config = severityConfig[severity] || severityConfig['Minor'];
    
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {t(severity.toLowerCase())}
      </span>
    );
  };

  const filteredAndSortedReports = () => {
    let filtered = eightDReports;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.partName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return new Date(b.lastModified) - new Date(a.lastModified);
      }
    });

    return filtered;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewReport = (reportId) => {
    // Navegar al workflow con el reporte seleccionado
    navigate(`/8d-workflow?reportId=${reportId}`);
  };

  const handleEditReport = (reportId) => {
    // Navegar al workflow en modo edición
    navigate(`/8d-workflow?reportId=${reportId}&mode=edit`);
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm(`¿Estás seguro de eliminar el reporte ${reportId}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setEightDReports(prev => prev.filter(r => r.id !== reportId));
        alert(' Reporte eliminado exitosamente');
      } else {
        const data = await response.json();
        alert(` Error: ${data.message || 'No se pudo eliminar'}`);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert(' Error al eliminar el reporte');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: themeColors.bg,
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      backgroundColor: themeColors.primary,
      color: 'white',
      padding: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0
    },
    headerControls: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: themeColors.bgPanel,
      color: themeColors.text,
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    languageSelector: {
      padding: '8px 12px',
      fontSize: '14px',
      backgroundColor: themeColors.bgPanel,
      color: themeColors.text,
      border: `1px solid ${themeColors.border}`,
      borderRadius: '4px',
      cursor: 'pointer'
    },
    filtersSection: {
      backgroundColor: themeColors.bgCard,
      padding: '20px',
      borderBottom: `1px solid ${themeColors.border}`
    },
    filtersContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      gap: '16px',
      alignItems: 'center'
    },
    searchInput: {
      padding: '12px 16px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '8px',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text
    },
    filterSelect: {
      padding: '12px 16px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '8px',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text,
      cursor: 'pointer',
      outline: 'none'
    },
    contentContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    },
    tableContainer: {
      backgroundColor: themeColors.bgCard,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: themeColors.bgPanel,
      borderBottom: `1px solid ${themeColors.border}`
    },
    th: {
      padding: '16px',
      textAlign: 'left',
      fontSize: '14px',
      fontWeight: 'bold',
      color: themeColors.text
    },
    tr: {
      borderBottom: `1px solid ${themeColors.border}`,
      transition: 'background-color 0.2s ease'
    },
    td: {
      padding: '16px',
      fontSize: '14px',
      color: themeColors.text
    },
    actionButton: {
      padding: '6px 12px',
      margin: '0 4px',
      fontSize: '12px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    viewButton: {
      backgroundColor: themeColors.accent,
      color: 'white'
    },
    editButton: {
      backgroundColor: themeColors.success,
      color: 'white'
    },
    noResults: {
      textAlign: 'center',
      padding: '40px',
      color: themeColors.textMuted,
      fontSize: '16px'
    },
    teamList: {
      fontSize: '12px',
      color: themeColors.textMuted
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>{t('title')}</h1>
          
          <div style={styles.headerControls}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={styles.backButton}
            >
              ← {t('backToDashboard')}
            </button>
            
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.languageSelector}
            >
              <option value="es"> Español</option>
              <option value="en"> English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div style={styles.filtersSection}>
        <div style={styles.filtersContent}>
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">{t('status')}: {t('all')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="in_progress">{t('inProgress')}</option>
            <option value="completed">{t('completed')}</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="recent">{t('sortBy')}: {t('recent')}</option>
            <option value="oldest">{t('oldest')}</option>
            <option value="alphabetical">{t('alphabetical')}</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.noResults}>
              {t('loading')}
            </div>
          ) : error ? (
            <div style={{...styles.noResults, color: themeColors.error}}>
              {t('error')}: {error}
            </div>
          ) : filteredAndSortedReports().length === 0 ? (
            <div style={styles.noResults}>
              {t('noResults')}
            </div>
          ) : (
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>{t('reportId')}</th>
                  <th style={styles.th}>{t('supplier')}</th>
                  <th style={styles.th}>{t('part')}</th>
                  <th style={styles.th}>{t('severity')}</th>
                  <th style={styles.th}>{t('status')}</th>
                  <th style={styles.th}>{t('modified')}</th>
                  <th style={styles.th}>{t('team')}</th>
                  <th style={styles.th}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedReports().map((report) => (
                  <tr key={report.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <strong>{report.id}</strong>
                        <div style={{ fontSize: '12px', color: themeColors.textMuted, marginTop: '2px' }}>
                          {report.title}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>
                        <strong>{report.supplierName}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>
                        <strong>{report.partNumber}</strong>
                        <div style={{ fontSize: '12px', color: themeColors.textMuted }}>
                          {report.partName}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {getSeverityBadge(report.severity)}
                    </td>
                    <td style={styles.td}>
                      {getStatusBadge(report.status)}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '12px' }}>
                        {formatDate(report.lastModified)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.teamList}>
                        {report.assignedTeam.slice(0, 2).join(', ')}
                        {report.assignedTeam.length > 2 && ` +${report.assignedTeam.length - 2}`}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleViewReport(report.id)}
                        style={{...styles.actionButton, ...styles.viewButton}}
                      >
                        {t('view')}
                      </button>
                      <button
                        onClick={() => handleEditReport(report.id)}
                        style={{...styles.actionButton, ...styles.editButton}}
                      >
                        {t('edit')}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          style={{...styles.actionButton, backgroundColor: '#B00020', color: 'white'}}
                        >
                          
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default EightDConsultation;