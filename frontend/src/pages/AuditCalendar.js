import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GanttChart from '../components/8D/GanttChart';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditCalendar = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [schedules, setSchedules] = useState([]);

  const L = {
    en: {
      planned: 'Planned', inProgress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', postponed: 'Postponed',
      connectionError: 'Connection error', loading: 'Loading audit calendar...',
      title: 'Audit Calendar', subtitle: 'Scheduled audits visualization - Year',
      scheduleAudit: '+ Schedule Audit', readOnly: 'Read only', dashboard: 'Dashboard', home: 'Home',
      allPrograms: 'All programs', allStatuses: 'All statuses', gantt: 'Gantt', list: 'List', refresh: 'Refresh',
      noAudits: 'No scheduled audits',
      createAuditHint: 'Create a new audit to see it in the calendar',
      noPermissionHint: 'You do not have permission to create audits',
      scheduleFirst: '+ Schedule First Audit',
      number: 'Number', audit: 'Audit', areaProcess: 'Area/Process', startDate: 'Start Date', endDate: 'End Date',
      leadAuditor: 'Lead Auditor', coAuditors: 'Co-Auditors', status: 'Status', actions: 'Actions',
      edit: 'Edit', view: 'View', execute: 'Execute'
    },
    es: {
      planned: 'Planeada', inProgress: 'En Proceso', completed: 'Completada', cancelled: 'Cancelada', postponed: 'Pospuesta',
      connectionError: 'Error de conexión', loading: 'Cargando calendario de auditorías...',
      title: 'Calendario de Auditorías', subtitle: 'Visualización de auditorías programadas - Año',
      scheduleAudit: '+ Programar Auditoría', readOnly: 'Solo lectura', dashboard: 'Dashboard', home: 'Inicio',
      allPrograms: 'Todos los programas', allStatuses: 'Todos los estados', gantt: 'Gantt', list: 'Lista', refresh: 'Actualizar',
      noAudits: 'No hay auditorías programadas',
      createAuditHint: 'Crea una nueva auditoría para verla en el calendario',
      noPermissionHint: 'No tienes permisos para crear auditorías',
      scheduleFirst: '+ Programar Primera Auditoría',
      number: 'Número', audit: 'Auditoría', areaProcess: 'Área/Proceso', startDate: 'Fecha Inicio', endDate: 'Fecha Fin',
      leadAuditor: 'Auditor Líder', coAuditors: 'Co-Auditores', status: 'Estado', actions: 'Acciones',
      edit: 'Editar', view: 'Ver', execute: 'Ejecutar'
    }
  }[language] || {};
  const [auditors, setAuditors] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Permission check
  const canEdit = canUserEdit('audits');
  const readOnly = isReadOnly('audits');

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('audit_calendar_view') || 'gantt';
  });

  // Persistir vista seleccionada
  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('audit_calendar_view', mode);
  };

  const STATUS_CONFIG = {
    planned: { color: t.accent, label: L.planned },
    in_progress: { color: t.warning, label: L.inProgress },
    completed: { color: t.success, label: L.completed },
    cancelled: { color: t.error, label: L.cancelled },
    postponed: { color: t.textMuted, label: L.postponed }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load schedules for Gantt
      let url = `${API_URL}/audit/schedules/gantt?year=${selectedYear}`;
      if (selectedProgram) url += `&programId=${selectedProgram}`;

      const [schedulesRes, auditorsRes, programsRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit/auditors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit/programs?year=${selectedYear}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const schedulesData = await schedulesRes.json();
      const auditorsData = await auditorsRes.json();
      const programsData = await programsRes.json();

      if (schedulesData.success) {
        // Filter by status if selected
        let filteredTasks = schedulesData.tasks || [];
        if (selectedStatus) {
          filteredTasks = filteredTasks.filter(t => t.auditStatus === selectedStatus);
        }
        setSchedules(filteredTasks);
      }

      if (auditorsData.success) {
        setAuditors(auditorsData.auditors || []);
      }

      if (programsData.success) {
        setPrograms(programsData.programs || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedProgram, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform schedules to Gantt format
  const ganttTasks = schedules.map(s => ({
    id: s.id,
    action: s.action || s.auditNumber,
    result: s.result || s.responsibleName || '',
    area: s.area || 'General',
    responsible: s.responsible,
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status,
    actualProgress: calculateProgress(s),
    dailyProgress: s.dailyProgress || [],
    priority: 'media',
    isRecurring: s.isRecurring,
    frequency: s.frequency,
    frequencyDetails: s.frequencyDetails
  }));

  function calculateProgress(schedule) {
    // Primero: usar dailyProgress acumulado si existe
    if (schedule.dailyProgress && schedule.dailyProgress.length > 0) {
      // Ordenar por fecha y tomar el último accumulated
      const sorted = [...schedule.dailyProgress].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );
      const lastEntry = sorted[sorted.length - 1];
      if (lastEntry.accumulated !== undefined) {
        return Math.min(100, Math.round(lastEntry.accumulated));
      }
    }

    // Fallback: usar status si no hay dailyProgress
    if (schedule.auditStatus === 'completed') return 100;
    if (schedule.auditStatus === 'in_progress') return 50;
    if (schedule.auditStatus === 'cancelled') return 0;
    return 0;
  }

  // Handle task update from Gantt (if editable) - memoizado para evitar re-renders
  const handleTaskUpdate = useCallback(async (taskId, updates) => {
    // Extract schedule ID from task ID
    const scheduleId = typeof taskId === 'string' && taskId.startsWith('audit-')
      ? taskId.replace('audit-', '')
      : taskId;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plannedStartDate: updates.startDate,
          plannedEndDate: updates.endDate,
          dailyProgress: updates.dailyProgress
        })
      });
      const result = await res.json();

      if (result.success) {
        loadData();
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
    }
  }, [loadData]);

  // Users for Gantt
  const ganttUsers = auditors.map(a => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    name: `${a.firstName} ${a.lastName}`,
    department: a.department
  }));

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted,
      marginTop: '4px'
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    filters: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    select: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    ganttContainer: {
      minHeight: '500px',
      overflow: 'auto'
    },
    viewToggle: {
      display: 'flex',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      padding: '4px'
    },
    viewButton: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '13px',
      backgroundColor: 'transparent',
      color: t.textMuted
    },
    viewButtonActive: {
      backgroundColor: t.bgCard,
      color: t.text,
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      borderBottom: `1px solid ${t.border}`,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      fontSize: '14px',
      color: t.text,
      borderBottom: `1px solid ${t.border}`
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    empty: {
      textAlign: 'center',
      padding: '48px',
      color: t.textMuted
    },
    legend: {
      display: 'flex',
      gap: '16px',
      marginTop: '16px',
      flexWrap: 'wrap'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: t.textMuted
    },
    legendDot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%'
    }
  };

  if (loading && schedules.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          {L.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{L.title}</h1>
          <p style={styles.subtitle}>
            {L.subtitle} {selectedYear}
          </p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          {canEdit && (
            <button
              style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
              onClick={() => navigate('/audit-schedule-create')}
            >
              {L.scheduleAudit}
            </button>
          )}
          {readOnly && (
            <span style={{
              padding: '8px 16px',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
               {L.readOnly}
            </span>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             {L.dashboard}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← {L.home}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={styles.select}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          style={styles.select}
        >
          <option value="">{L.allPrograms}</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">{L.allStatuses}</option>
          <option value="planned">{L.planned}</option>
          <option value="in_progress">{L.inProgress}</option>
          <option value="completed">{L.completed}</option>
          <option value="postponed">{L.postponed}</option>
          <option value="cancelled">{L.cancelled}</option>
        </select>

        <div style={{ marginLeft: 'auto' }}>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'gantt' ? styles.viewButtonActive : {})
              }}
              onClick={() => handleViewChange('gantt')}
            >
               {L.gantt}
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'list' ? styles.viewButtonActive : {})
              }}
              onClick={() => handleViewChange('list')}
            >
               {L.list}
            </button>
          </div>
        </div>

        <button
          style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
          onClick={loadData}
        >
           {L.refresh}
        </button>
      </div>

      {error && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}`, marginBottom: '24px' }}>
          <p style={{ color: t.error, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Content */}
      <div style={styles.card}>
        {schedules.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>{L.noAudits}</p>
            <p>{canEdit ? L.createAuditHint : L.noPermissionHint}</p>
            {canEdit && (
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white', marginTop: '16px' }}
                onClick={() => navigate('/audit-schedule-create')}
              >
                {L.scheduleFirst}
              </button>
            )}
          </div>
        ) : viewMode === 'gantt' ? (
          <div style={styles.ganttContainer}>
            <GanttChart
              tasks={ganttTasks}
              users={ganttUsers}
              onTaskUpdate={handleTaskUpdate}
              viewScale="Week"
              disabled={false}
            />
            {/* Legend */}
            <div style={styles.legend}>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <div key={status} style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, backgroundColor: config.color }} />
                  <span>{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // List View
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{L.number}</th>
                <th style={styles.th}>{L.audit}</th>
                <th style={styles.th}>{L.areaProcess}</th>
                <th style={styles.th}>{L.startDate}</th>
                <th style={styles.th}>{L.endDate}</th>
                <th style={styles.th}>{L.leadAuditor}</th>
                <th style={styles.th}>{L.coAuditors}</th>
                <th style={styles.th}>{L.status}</th>
                <th style={styles.th}>{L.actions}</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => {
                const statusConfig = STATUS_CONFIG[schedule.auditStatus] || STATUS_CONFIG.planned;
                return (
                  <tr key={schedule.id}>
                    <td style={styles.td}>{schedule.auditNumber}</td>
                    <td style={styles.td}>{schedule.action}</td>
                    <td style={styles.td}>{schedule.result || '-'}</td>
                    <td style={styles.td}>
                      {new Date(schedule.startDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                    </td>
                    <td style={styles.td}>
                      {new Date(schedule.endDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                    </td>
                    <td style={styles.td}>{schedule.responsibleName || '-'}</td>
                    <td style={styles.td}>{schedule.coAuditorNames || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: `${statusConfig.color}20`,
                        color: statusConfig.color
                      }}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, display: 'flex', gap: '6px' }}>
                      {canEdit && (
                        <button
                          style={{
                            ...styles.button,
                            padding: '6px 12px',
                            backgroundColor: t.warning,
                            color: 'white'
                          }}
                          onClick={() => navigate(`/audit-schedule-edit/${schedule.scheduleId || schedule.id}`)}
                        >
                          {L.edit}
                        </button>
                      )}
                      <button
                        style={{
                          ...styles.button,
                          padding: '6px 12px',
                          backgroundColor: t.accent,
                          color: 'white'
                        }}
                        onClick={() => {
                          if (schedule.auditStatus === 'planned' || schedule.auditStatus === 'in_progress') {
                            navigate(`/audit-execute/${schedule.scheduleId}`);
                          } else {
                            navigate(`/audit/${schedule.scheduleId}`);
                          }
                        }}
                      >
                        {schedule.auditStatus === 'completed' ? L.view : L.execute}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditCalendar;
