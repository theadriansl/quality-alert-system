import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GanttChart from '../components/8D/GanttChart';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const AuditCalendar = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const [schedules, setSchedules] = useState([]);
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
  const [viewMode, setViewMode] = useState('gantt'); // 'gantt' or 'list'

  const STATUS_CONFIG = {
    planned: { color: t.accent, label: 'Planeada' },
    in_progress: { color: t.warning, label: 'En Proceso' },
    completed: { color: t.success, label: 'Completada' },
    cancelled: { color: t.error, label: 'Cancelada' },
    postponed: { color: t.textMuted, label: 'Pospuesta' }
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
      setError('Error de conexión');
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
    dailyProgress: [],
    priority: 'media',
    isRecurring: s.isRecurring,
    frequency: s.frequency,
    frequencyDetails: s.frequencyDetails
  }));

  function calculateProgress(schedule) {
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
          plannedEndDate: updates.endDate
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
      fontWeight: '700',
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
          Cargando calendario de auditorías...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Calendario de Auditorías</h1>
          <p style={styles.subtitle}>
            Visualización de auditorías programadas - Año {selectedYear}
          </p>
        </div>
        <div style={styles.buttons}>
          {canEdit && (
            <button
              style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
              onClick={() => navigate('/audit-schedule-create')}
            >
              + Programar Auditoría
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
               Solo lectura
            </span>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             Dashboard
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← Inicio
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
          <option value="">Todos los programas</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los estados</option>
          <option value="planned">Planeadas</option>
          <option value="in_progress">En Proceso</option>
          <option value="completed">Completadas</option>
          <option value="postponed">Pospuestas</option>
          <option value="cancelled">Canceladas</option>
        </select>

        <div style={{ marginLeft: 'auto' }}>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'gantt' ? styles.viewButtonActive : {})
              }}
              onClick={() => setViewMode('gantt')}
            >
               Gantt
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'list' ? styles.viewButtonActive : {})
              }}
              onClick={() => setViewMode('list')}
            >
               Lista
            </button>
          </div>
        </div>

        <button
          style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
          onClick={loadData}
        >
           Actualizar
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
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>No hay auditorías programadas</p>
            <p>{canEdit ? 'Crea una nueva auditoría para verla en el calendario' : 'No tienes permisos para crear auditorías'}</p>
            {canEdit && (
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white', marginTop: '16px' }}
                onClick={() => navigate('/audit-schedule-create')}
              >
                + Programar Primera Auditoría
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
                <th style={styles.th}>Número</th>
                <th style={styles.th}>Auditoría</th>
                <th style={styles.th}>Área/Proceso</th>
                <th style={styles.th}>Fecha Inicio</th>
                <th style={styles.th}>Fecha Fin</th>
                <th style={styles.th}>Auditor Líder</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
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
                      {new Date(schedule.startDate).toLocaleDateString('es-MX')}
                    </td>
                    <td style={styles.td}>
                      {new Date(schedule.endDate).toLocaleDateString('es-MX')}
                    </td>
                    <td style={styles.td}>{schedule.responsibleName || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: `${statusConfig.color}20`,
                        color: statusConfig.color
                      }}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td style={styles.td}>
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
                        {schedule.auditStatus === 'completed' ? 'Ver' : 'Ejecutar'}
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
