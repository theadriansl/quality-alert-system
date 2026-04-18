import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Helper para calcular días hábiles entre dos fechas
const countBusinessDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No sábado ni domingo
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// Estilos del componente (definidos antes de los componentes para evitar hoisting issues)
const getStyles = (t) => ({
  container: {
    width: '100%',
    background: t.bgCard,
    borderRadius: '8px',
    border: `1px solid ${t.border}`,
    overflow: 'auto',
    position: 'relative',
    maxHeight: '600px'
  },
  header: {
    display: 'flex',
    borderBottom: `2px solid ${t.border}`,
    background: t.bgPanel,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    height: '42px',
    boxSizing: 'border-box'
  },
  taskHeader: {
    width: '200px',
    padding: '12px 16px',
    fontWeight: '600',
    fontSize: '14px',
    borderRight: `2px solid ${t.border}`,
    background: t.bgPanel,
    height: '42px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center'
  },
  timelineHeader: {
    flex: 1,
    position: 'relative',
    height: '40px',
    background: t.bgPanel
  },
  dateLabel: {
    position: 'absolute',
    top: '12px',
    fontSize: '11px',
    color: t.textMuted,
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  todayLine: {
    position: 'absolute',
    top: '40px',
    bottom: 0,
    width: '2px',
    background: '#ef4444',
    zIndex: 5,
    pointerEvents: 'none'
  },
  todayLabel: {
    position: 'absolute',
    top: '-25px',
    left: '-15px',
    background: '#ef4444',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  grid: {
    background: t.bgCard
  },
  row: {
    display: 'flex',
    borderBottom: `1px solid ${t.border}`,
    height: '80px',
    boxSizing: 'border-box',
    position: 'relative'
  },
  taskName: {
    width: '200px',
    padding: '12px 16px',
    borderRight: `2px solid ${t.border}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: t.bgCard
  },
  timeline: {
    flex: 1,
    position: 'relative',
    display: 'flex'
  },
  gridCell: {
    flex: 1,
    borderRight: `1px solid ${t.bgPanel}`,
    minWidth: '1px'
  },
  bar: {
    position: 'absolute',
    height: '32px',
    top: '50%',
    transform: 'translateY(-50%)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(255,255,255,0.3)',
    borderRadius: '6px 0 0 6px',
      },
  barLabel: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    position: 'relative',
    zIndex: 1,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  complianceColumn: {
    width: '100px',
    padding: '12px 16px',
    borderLeft: `2px solid ${t.border}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: t.bgCard
  }
});

// Componente separado para el popup de edición - evita re-renders del grid completo
const EditDayPopup = memo(({ date, existingEntry, onSave, onCancel, formatDate, priorityColor, isRecurring, taskStartDate, taskEndDate }) => {
  const { theme: t } = useTheme();
  const [progressInput, setProgressInput] = useState(existingEntry?.progress?.toString() || '');
  const [activitiesInput, setActivitiesInput] = useState(existingEntry?.activities || '');
  const [hoursInput, setHoursInput] = useState(existingEntry?.hours?.toString() || '');

  // Calcular límite diario para actividades recurrentes
  const dailyLimit = useMemo(() => {
    if (!isRecurring) return null;
    const businessDays = countBusinessDays(taskStartDate, taskEndDate);
    if (businessDays <= 0) return null;
    return Math.round((100 / businessDays) * 100) / 100; // Redondear a 2 decimales
  }, [isRecurring, taskStartDate, taskEndDate]);

  // Sincronizar estado cuando cambia existingEntry (al abrir diferente día)
  useEffect(() => {
    setProgressInput(existingEntry?.progress?.toString() || '');
    setActivitiesInput(existingEntry?.activities || '');
    setHoursInput(existingEntry?.hours?.toString() || '');
  }, [existingEntry]);

  const handleSave = () => {
    const progress = parseFloat(progressInput);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      alert('Por favor ingresa un progreso válido entre 0 y 100');
      return;
    }

    // Verificar límite diario en actividades recurrentes
    if (dailyLimit && progress > dailyLimit) {
      const confirmExceed = window.confirm(
        ` ACTIVIDAD RECURRENTE\n\n` +
        `El progreso ingresado (${progress}%) excede el límite diario sugerido (${dailyLimit}%).\n\n` +
        `Esta actividad tiene ${countBusinessDays(taskStartDate, taskEndDate)} días hábiles, ` +
        `por lo que el avance máximo recomendado por día es ${dailyLimit}%.\n\n` +
        `¿Deseas continuar de todos modos?`
      );
      if (!confirmExceed) return;
    }

    // Verificar si hay cambios cuando existe entrada previa
    if (existingEntry) {
      const dataChanged = existingEntry.progress !== progress ||
                          existingEntry.activities !== activitiesInput ||
                          existingEntry.hours !== (hoursInput ? parseFloat(hoursInput) : null);

      if (dataChanged) {
        const confirm = window.confirm(
          ` Ya existe una captura para ${formatDate(date)}:\n\n` +
          `Progreso actual: ${existingEntry.progress}%\n` +
          `Actividades: ${existingEntry.activities || 'Sin descripción'}\n` +
          `Horas: ${existingEntry.hours || 0}\n\n` +
          `¿Deseas ACTUALIZAR con los nuevos datos?`
        );
        if (!confirm) return;
      }
    }

    onSave({
      progress,
      activities: activitiesInput,
      hours: hoursInput ? parseFloat(hoursInput) : null
    });
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998
        }}
      />
      {/* Modal content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: t.bgCard,
          border: `2px solid ${t.accent}`,
          borderRadius: '8px',
          padding: '16px',
          zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          minWidth: '280px',
          maxWidth: '400px'
        }}
      >
      <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: t.text }}>
         {formatDate(date)}
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px', display: 'block' }}>
          Progreso (%)
          {dailyLimit && (
            <span style={{ color: '#C77700', marginLeft: '4px' }}>
              (máx. sugerido: {dailyLimit}%)
            </span>
          )}
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={progressInput}
          onChange={(e) => setProgressInput(e.target.value)}
          placeholder={dailyLimit ? `0-${dailyLimit}%` : '0-100%'}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            else if (e.key === 'Escape') onCancel();
          }}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: `1px solid ${dailyLimit && parseFloat(progressInput) > dailyLimit ? '#C77700' : t.border}`,
            borderRadius: '4px',
            fontSize: '12px',
            boxSizing: 'border-box',
            backgroundColor: dailyLimit && parseFloat(progressInput) > dailyLimit ? '#fffbeb' : t.bgCard,
            color: t.text
          }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px', display: 'block' }}>
          Actividades realizadas
        </label>
        <textarea
          value={activitiesInput}
          onChange={(e) => setActivitiesInput(e.target.value)}
          placeholder="Actividades realizadas..."
          rows="3"
          style={{
            width: '100%',
            padding: '6px 8px',
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            backgroundColor: t.bgCard,
            color: t.text
          }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px', display: 'block' }}>
           Horas invertidas
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={hoursInput}
          onChange={(e) => setHoursInput(e.target.value)}
          placeholder="Ej: 2.5"
          style={{
            width: '100%',
            padding: '6px 8px',
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            fontSize: '12px',
            boxSizing: 'border-box',
            backgroundColor: t.bgCard,
            color: t.text
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: priorityColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
           Guardar
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
           Cancelar
        </button>
      </div>
    </div>
    </>
  );
});

// Subcomponente memoizado para cada fila del Gantt
const GanttRow = memo(({
  task,
  index,
  columns,
  cellWidth,
  users,
  disabled,
  editingDay,
  onDayClick,
  onSaveProgress,
  onCancelEdit,
  parseLocalDate,
  formatDateToString,
  formatDate,
  getPriorityColor,
  calculateBarPosition,
  generateRecurrenceOccurrences
}) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const user = users.find(u => u.id === task.responsible);
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Sin asignar';
  const position = calculateBarPosition(task, columns, cellWidth);

  // Memoizar ocurrencias para tareas recurrentes
  const occurrences = useMemo(() => {
    if (!task.isRecurring) return null;
    return generateRecurrenceOccurrences(task);
  }, [task, generateRecurrenceOccurrences]);

  return (
    <div style={styles.row}>
      {/* Nombre de la tarea - Sticky */}
      <div style={{
        ...styles.taskName,
        position: 'sticky',
        left: 0,
        zIndex: 10,
        background: t.bgCard,
        boxShadow: '4px 0 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {task.isRecurring && (
            <span style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600'
            }}>
               {task.frequency === 'weekly' ? 'SEM' : task.frequency === 'biweekly' ? 'QUIN' : task.frequency === 'monthly' ? 'MEN' : 'REC'}
            </span>
          )}
          {task.status === 'cancelled' && (
            <span style={{
              backgroundColor: t.bgPanel,
              color: t.textMuted,
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              border: `1px solid ${t.border}`
            }}>
              🚫 Cancelada
            </span>
          )}
          <span style={{
            textDecoration: task.status === 'cancelled' ? 'line-through' : 'none',
            color: task.status === 'cancelled' ? '#9ca3af' : 'inherit'
          }}>{task.action || task.description || `Tarea ${index + 1}`}</span>
        </div>
        <div style={{ fontSize: '12px', color: t.textMuted }}>
           {userName}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ ...styles.timeline, width: `${columns.length * cellWidth}px` }}>
        {/* Grid de fondo (clickeable) */}
        {columns.map((col, colIndex) => {
          const isEditing = editingDay?.taskId === task.id &&
                           editingDay?.date.toDateString() === col.toDateString();
          const progressEntry = task.dailyProgress?.find(
            d => parseLocalDate(d.date).toDateString() === col.toDateString()
          );
          const hasProgress = !!progressEntry;

          // Crear tooltip dinámico
          let tooltip = `Click para agregar progreso: ${formatDate(col)}`;
          if (progressEntry) {
            tooltip = `${formatDate(col)}: +${progressEntry.progress}% (Acum: ${progressEntry.accumulated}%)`;
            if (progressEntry.hours) {
              tooltip += `\n ${progressEntry.hours} hrs`;
            }
            if (progressEntry.activities) {
              tooltip += `\n ${progressEntry.activities}`;
            }
            tooltip += '\n\nClick para editar';
          }

          if (disabled) {
            tooltip = ' Bloqueado - No se pueden realizar cambios';
          }

          return (
            <div
              key={colIndex}
              onClick={() => onDayClick(task.id, col)}
              className="gantt-cell"
              style={{
                ...styles.gridCell,
                width: `${cellWidth}px`,
                minWidth: `${cellWidth}px`,
                maxWidth: `${cellWidth}px`,
                background: colIndex % 7 === 0 ? t.bgPanel : t.bgCard,
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative',
                border: isEditing ? `2px solid ${t.accent}` : hasProgress ? `1px solid ${t.border}` : 'none',
                opacity: disabled ? 0.6 : 1
              }}
              title={tooltip}
            >
              {/* Popup de edición */}
              {isEditing && (
                <EditDayPopup
                  date={col}
                  existingEntry={editingDay?.existingEntry}
                  onSave={(data) => onSaveProgress(task.id, col, data)}
                  onCancel={onCancelEdit}
                  formatDate={formatDate}
                  priorityColor={getPriorityColor(task.priority)}
                  isRecurring={task.isRecurring}
                  taskStartDate={task.startDate}
                  taskEndDate={task.endDate}
                />
              )}
            </div>
          );
        })}

        {/* Contenedor de barras (dos filas) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          padding: '8px 0',
          pointerEvents: 'none',
          zIndex: 1
        }}>
          {/* BARRA SUPERIOR - PLANEADO */}
          <div style={{
            position: 'relative',
            height: '20px',
            width: '100%'
          }}>
            {task.isRecurring && occurrences ? (
              occurrences.map((occDate, occIdx) => {
                const occIndex = columns.findIndex(col =>
                  col.toDateString() === occDate.toDateString()
                );
                if (occIndex < 0) return null;

                const occLeft = occIndex * cellWidth;
                const dayName = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][occDate.getDay()];

                return (
                  <div
                    key={occIdx}
                    style={{
                      position: 'absolute',
                      left: `${occLeft}px`,
                      width: `${cellWidth}px`,
                      height: '100%',
                      background: '#8b5cf6',
                      borderRadius: '4px',
                      border: '2px solid #7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={` ${dayName} ${formatDate(occDate)} - ${task.frequency === 'weekly' ? 'Semanal' : task.frequency === 'biweekly' ? 'Quincenal' : task.frequency === 'monthly' ? 'Mensual' : task.frequency}`}
                  >
                    <span style={{ fontSize: '10px', color: 'white', fontWeight: '600' }}></span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  position: 'absolute',
                  ...position,
                  height: '100%',
                  background: '#d1d5db',
                  borderRadius: '4px',
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={`Plan: ${task.startDate} - ${task.endDate}`}
              >
                <span style={{
                  fontSize: '10px',
                  color: t.textMuted,
                  fontWeight: '600'
                }}>
                  PLAN
                </span>
              </div>
            )}
          </div>

          {/* BARRA INFERIOR - REAL */}
          <div style={{
            position: 'relative',
            height: '20px',
            width: '100%'
          }}>
            {task.dailyProgress && task.dailyProgress.length > 0 ? (
              task.dailyProgress.map((entry, entryIdx) => {
                const entryDate = parseLocalDate(entry.date);
                const entryIndex = columns.findIndex(col =>
                  col.toDateString() === entryDate.toDateString()
                );

                if (entryIndex < 0) return null;

                // Usar píxeles basados en cellWidth (igual que las celdas del grid)
                const entryLeftPx = entryIndex * cellWidth;
                const entryWidthPx = cellWidth;

                return (
                  <div
                    key={entryIdx}
                    style={{
                      position: 'absolute',
                      left: `${entryLeftPx}px`,
                      width: `${entryWidthPx}px`,
                      height: '100%',
                      background: task.status === 'cancelled' ? '#d1d5db' : (task.actualProgress >= 100) ? '#2E7D32' : getPriorityColor(task.priority),
                      borderRadius: '2px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      boxSizing: 'border-box'
                    }}
                    title={`${entry.date}: +${entry.progress}% (Acum: ${entry.accumulated}%)${entry.hours ? '\n ' + entry.hours + ' hrs' : ''}${entry.activities ? '\n ' + entry.activities : ''}`}
                  />
                );
              })
            ) : (
              <div style={{
                position: 'absolute',
                left: 0,
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '8px'
              }}>
                <span style={{
                  fontSize: '9px',
                  color: t.textDim,
                  fontStyle: 'italic'
                }}>
                  Sin progreso registrado
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparador personalizado - solo re-renderiza si cambian datos relevantes
  if (prevProps.task.id !== nextProps.task.id) return false;
  if (prevProps.task.actualProgress !== nextProps.task.actualProgress) return false;
  if (prevProps.cellWidth !== nextProps.cellWidth) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  // Comparar editingDay solo para esta tarea
  const prevEditing = prevProps.editingDay?.taskId === prevProps.task.id;
  const nextEditing = nextProps.editingDay?.taskId === nextProps.task.id;
  if (prevEditing !== nextEditing) return false;
  // Comparar dailyProgress por longitud (optimización)
  const prevLen = prevProps.task.dailyProgress?.length || 0;
  const nextLen = nextProps.task.dailyProgress?.length || 0;
  if (prevLen !== nextLen) return false;
  return true; // No re-renderizar
});

// Subcomponente memoizado para columna de cumplimiento
const ComplianceCell = memo(({ task, index }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(task.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(task.endDate);
  endDate.setHours(0, 0, 0, 0);

  let currentPlannedProgress = 0;
  if (today < startDate) {
    currentPlannedProgress = 0;
  } else if (today > endDate) {
    currentPlannedProgress = 100;
  } else {
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const daysPassed = (today - startDate) / (1000 * 60 * 60 * 24);
    currentPlannedProgress = Math.round((daysPassed / totalDays) * 100);
  }

  const actualProg = Math.round(task.actualProgress || 0);
  const expectedProg = Math.round(currentPlannedProgress);
  const isOnTrack = actualProg >= expectedProg;
  let complianceColor, complianceStatus;

  if (today > endDate && actualProg < 100) {
    complianceColor = '#ef4444';
    complianceStatus = 'Atrasado';
  } else if (expectedProg > 0 && actualProg < expectedProg - 20) {
    complianceColor = '#C77700';
    complianceStatus = 'En riesgo';
  } else if (actualProg >= 100) {
    complianceColor = '#2E7D32';
    complianceStatus = 'Completado';
  } else if (isOnTrack) {
    complianceColor = '#2E7D32';
    complianceStatus = 'A tiempo';
  } else {
    complianceColor = '#C77700';
    complianceStatus = 'Atrás';
  }

  return (
    <div style={{
      ...styles.complianceColumn,
      height: '80px',
      boxSizing: 'border-box',
      borderBottom: `1px solid ${t.border}`
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: complianceColor,
        marginBottom: '2px'
      }}>
        {actualProg}% / {expectedProg}%
      </div>
      <div style={{
        fontSize: '9px',
        color: t.textDim,
        marginBottom: '2px'
      }}>
        Real / Esperado
      </div>
      <div style={{
        fontSize: '10px',
        color: complianceStatus === 'Atrasado' ? '#ef4444' : complianceStatus === 'En riesgo' || complianceStatus === 'Atrás' ? '#C77700' : '#2E7D32',
        fontWeight: '600'
      }}>
        {complianceStatus}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderiza si cambia el progreso de esta tarea
  return prevProps.task.id === nextProps.task.id &&
         prevProps.task.actualProgress === nextProps.task.actualProgress;
});

const GanttChart = memo(({ tasks, users, onTaskUpdate, viewScale = 'Week', disabled = false }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const [editingDay, setEditingDay] = useState(null); // { taskId, date, existingEntry }

  // Ref for the scrollable timeline container
  const timelineRef = useRef(null);

  // Persist zoom level in localStorage (0-500, where 0 = most compact)
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('gantt_zoom_level');
    return saved ? parseInt(saved, 10) : 100; // Default 100%
  });

  // Update zoom with persistence
  const updateZoomLevel = useCallback((newLevel) => {
    setZoomLevel(newLevel);
    localStorage.setItem('gantt_zoom_level', newLevel.toString());
  }, []);

  // Calculate cell width based on zoom (0% = 15px, 100% = 30px, 200% = 45px, etc.)
  const baseCellWidth = 15;
  const cellWidth = baseCellWidth + (zoomLevel / 100) * 15;

  // Helper: Convertir string YYYY-MM-DD a Date en zona horaria local (evita problemas de UTC)
  const parseLocalDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper: Convertir Date a string YYYY-MM-DD en hora local (NO usar toISOString que es UTC)
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calcular rango de fechas (incluyendo fechas de progreso real)
  const calculateDateRange = () => {
    if (!tasks || tasks.length === 0) return { start: new Date(), end: new Date() };

    // Recopilar todas las fechas: planificadas Y de progreso real
    const dates = [];

    tasks.forEach(t => {
      // Fechas planificadas
      if (t.startDate) dates.push(new Date(t.startDate));
      if (t.endDate) dates.push(new Date(t.endDate));

      // Fechas de progreso real (dailyProgress)
      if (t.dailyProgress && Array.isArray(t.dailyProgress)) {
        t.dailyProgress.forEach(dp => {
          if (dp.date) dates.push(new Date(dp.date));
        });
      }
    });

    if (dates.length === 0) {
      return { start: new Date(), end: new Date() };
    }

    // Always include today so the current date is visible
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dates.push(today);

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Agregar margen: 7 días antes y 14 días después
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    return { start: minDate, end: maxDate };
  };

  // Generar columnas de fechas (memoizado para evitar recálculos)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => {
    const { start, end } = calculateDateRange();
    const cols = [];
    const current = new Date(start);

    // Limitar a máximo 180 días para evitar render de miles de celdas
    const maxDays = 180;
    let dayCount = 0;

    while (current <= end && dayCount < maxDays) {
      cols.push(new Date(current));
      current.setDate(current.getDate() + 1);
      dayCount++;
    }

    return cols;
  }, [tasks]);

  // Calcular posición de la barra (en píxeles basado en cellWidth)
  const calculateBarPosition = (task, columns, cw) => {
    const startDate = new Date(task.startDate || Date.now());
    const endDate = new Date(task.endDate || Date.now());

    const startIndex = columns.findIndex(col =>
      col.toDateString() === startDate.toDateString()
    );
    const endIndex = columns.findIndex(col =>
      col.toDateString() === endDate.toDateString()
    );

    const leftPx = startIndex >= 0 ? startIndex * cw : 0;
    const widthPx = endIndex >= 0 && startIndex >= 0
      ? (endIndex - startIndex + 1) * cw
      : cw;

    return { left: `${leftPx}px`, width: `${widthPx}px` };
  };

  // Encontrar el índice de hoy
  const getTodayIndex = (columns) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return columns.findIndex(col => {
      const colDate = new Date(col);
      colDate.setHours(0, 0, 0, 0);
      return colDate.toDateString() === today.toDateString();
    });
  };

  // Formatear fecha
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Obtener color según prioridad
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return '#ef4444'; // Rojo
      case 'media': return '#C77700'; // Amarillo
      case 'baja': return '#0072CE'; // Azul
      default: return '#6b7280'; // Gris
    }
  };

  // Generar fechas de ocurrencia para actividades recurrentes
  const generateRecurrenceOccurrences = (task) => {
    if (!task.isRecurring) return null;

    const occurrences = [];
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    const frequency = task.frequency || 'weekly';

    // Obtener los días seleccionados del frequencyDetails
    let frequencyDetails = task.frequencyDetails || task.frequency_details || {};
    if (typeof frequencyDetails === 'string') {
      try {
        frequencyDetails = JSON.parse(frequencyDetails);
      } catch (e) {
        frequencyDetails = {};
      }
    }

    const recurringDays = frequencyDetails.recurring_days || [];

    // Si no hay días seleccionados, usar el día de inicio por defecto
    const daysToUse = recurringDays.length > 0 ? recurringDays : [startDate.getDay()];

    // Calcular intervalo de semanas según frecuencia
    const weekInterval = {
      'weekly': 1,
      'biweekly': 2,
      'monthly': 4,
      'quarterly': 13
    }[frequency] || 1;

    // Empezar desde el inicio de la semana que contiene startDate
    let currentWeekStart = new Date(startDate);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Ir al domingo

    let weekCount = 0;

    while (currentWeekStart <= endDate) {
      // Solo procesar cada N semanas según el intervalo
      if (weekCount % weekInterval === 0) {
        // Para cada día seleccionado de la semana
        for (const dayOfWeek of daysToUse) {
          const occurrenceDate = new Date(currentWeekStart);
          occurrenceDate.setDate(occurrenceDate.getDate() + dayOfWeek);

          // Solo agregar si está dentro del rango
          if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
            occurrences.push(new Date(occurrenceDate));
          }
        }
      }

      // Avanzar una semana
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekCount++;
    }

    // Ordenar por fecha
    occurrences.sort((a, b) => a - b);

    return occurrences;
  };

  // Manejar click en un día para agregar progreso
  const handleDayClick = (taskId, date) => {
    if (disabled) return;
    const task = tasks.find(t => t.id === taskId);
    const dateStr = formatDateToString(date);
    const existingEntry = task?.dailyProgress?.find(d => d.date === dateStr);
    setEditingDay({ taskId, date, existingEntry, task });
  };

  // Guardar progreso del día - recibe datos del popup
  const handleSaveDayProgress = (taskId, date, data) => {
    const { progress, activities, hours } = data;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const dateStr = formatDateToString(date);
    const dailyProgress = task.dailyProgress || [];
    const existingIndex = dailyProgress.findIndex(d => d.date === dateStr);

    let newDailyProgress;

    if (existingIndex >= 0) {
      // Actualizar existente
      newDailyProgress = [...dailyProgress];
      newDailyProgress[existingIndex] = {
        ...newDailyProgress[existingIndex],
        progress,
        activities,
        hours
      };
    } else {
      // Agregar nueva
      newDailyProgress = [...dailyProgress, {
        date: dateStr,
        progress,
        accumulated: 0,
        activities,
        hours
      }];
    }

    // Ordenar y recalcular acumulados
    newDailyProgress.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    let accumulated = 0;
    newDailyProgress = newDailyProgress.map(d => {
      accumulated += d.progress;
      return { ...d, accumulated: Math.min(100, Math.round(accumulated)) }; // Round to integer
    });

    // Actualizar tarea
    const totalProgress = newDailyProgress.length > 0
      ? Math.round(newDailyProgress[newDailyProgress.length - 1].accumulated)
      : 0;


    if (typeof onTaskUpdate === 'function') {
      onTaskUpdate(taskId, {
        dailyProgress: newDailyProgress,
        actualProgress: totalProgress
      });
    } else {
      console.error(' onTaskUpdate is not a function!', onTaskUpdate);
    }

    // Cerrar editor
    setEditingDay(null);
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingDay(null);
  };

  // Manejar zoom (con persistencia en localStorage)
  const handleZoomIn = () => {
    updateZoomLevel(Math.min(zoomLevel + 50, 500)); // Máximo 500%
  };

  const handleZoomOut = () => {
    updateZoomLevel(Math.max(zoomLevel - 50, 0)); // Mínimo 0%
  };

  const handleResetZoom = () => {
    updateZoomLevel(100); // Reset a 100%
  };

  // Memoizar todayIndex
  const todayIndex = useMemo(() => getTodayIndex(columns), [columns]);

  // Navigation functions
  const scrollToStart = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = 0;
    }
  };

  const scrollToToday = () => {
    if (timelineRef.current && todayIndex >= 0) {
      const targetScroll = todayIndex * cellWidth - (timelineRef.current.clientWidth / 2) + 100;
      timelineRef.current.scrollLeft = Math.max(0, targetScroll);
    }
  };

  const scrollToEnd = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
    }
  };

  // Auto-scroll to TODAY on mount (or to start if TODAY is not visible)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayIndex >= 0) {
        scrollToToday();
      } else {
        scrollToStart();
      }
    }, 100); // Small delay to ensure DOM is ready
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
        No hay tareas para mostrar en el Gantt
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Controls Bar: Navigation + Zoom */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px',
        padding: '8px 12px',
        backgroundColor: t.bg,
        borderRadius: '8px',
        border: `1px solid ${t.border}`
      }}>
        {/* Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: t.textMuted, marginRight: '4px' }}>
            Ir a:
          </span>
          <button
            onClick={scrollToStart}
            style={{
              padding: '6px 12px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: t.text,
                          }}
            title="Ir al inicio del timeline">
             Inicio
          </button>
          <button
            onClick={scrollToToday}
            disabled={todayIndex < 0}
            style={{
              padding: '6px 12px',
              backgroundColor: todayIndex >= 0 ? t.accent : t.bgPanel,
              border: '1px solid',
              borderColor: todayIndex >= 0 ? t.accent : t.border,
              borderRadius: '6px',
              cursor: todayIndex >= 0 ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: '600',
              color: todayIndex >= 0 ? 'white' : '#9ca3af',
                          }}
            title="Ir a HOY">
             Hoy
          </button>
          <button
            onClick={scrollToEnd}
            style={{
              padding: '6px 12px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: t.text,
                          }}
            title="Ir al final del timeline">
            Fin 
          </button>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: t.textMuted, marginRight: '4px' }}>
            Zoom:
          </span>
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0}
            style={{
              padding: '6px 12px',
              backgroundColor: zoomLevel <= 0 ? t.bgPanel : t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: zoomLevel <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              color: zoomLevel <= 0 ? t.textDim : t.text,
                          }}
            title="Zoom Out (-)">
            −
          </button>
          <span style={{
            minWidth: '60px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: t.text
          }}>
            {zoomLevel}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 500}
            style={{
              padding: '6px 12px',
              backgroundColor: zoomLevel >= 500 ? t.bgPanel : t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: zoomLevel >= 500 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              color: zoomLevel >= 500 ? t.textDim : t.text,
                          }}
            title="Zoom In (+)">
            +
          </button>
          <button
            onClick={handleResetZoom}
            style={{
              padding: '6px 12px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              color: t.text,
              marginLeft: '4px',
                          }}
            title="Reset Zoom (100%)">
            Reset
          </button>
        </div>
      </div>

      {/* Gantt Content with Zoom - usando ancho fijo por celda */}
      <div style={{ display: 'flex', position: 'relative' }}>
        {/* Área scrolleable (Tarea sticky + Timeline) */}
        <div ref={timelineRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'visible' }}>
          <div style={{ width: `${200 + columns.length * cellWidth}px`, minWidth: '100%', position: 'relative' }}>
            {/* Header con fechas */}
            <div style={{ ...styles.header, paddingRight: 0 }}>
              {/* Header Tarea - Sticky */}
              <div style={{
                ...styles.taskHeader,
                position: 'sticky',
                left: 0,
                zIndex: 15,
                background: t.bgPanel,
                boxShadow: '4px 0 8px rgba(0,0,0,0.1)'
              }}>Tarea</div>
              <div style={{ ...styles.timelineHeader, width: `${columns.length * cellWidth}px` }}>
          {columns.map((col, index) => {
            // Ajustar frecuencia de fechas según nivel de zoom
            let showFrequency;
            let dateFormat;
            if (zoomLevel >= 500) {
              showFrequency = 1; // Cada día
              dateFormat = 'day';
            } else if (zoomLevel >= 400) {
              showFrequency = 2; // Cada 2 días
              dateFormat = 'day';
            } else if (zoomLevel >= 300) {
              showFrequency = 2; // Cada 2 días
              dateFormat = 'day';
            } else if (zoomLevel >= 200) {
              showFrequency = 3; // Cada 3 días
              dateFormat = 'day';
            } else if (zoomLevel >= 150) {
              showFrequency = 5; // Cada 5 días
              dateFormat = 'day';
            } else if (zoomLevel >= 100) {
              showFrequency = 7; // Cada 7 días (semana)
              dateFormat = 'week';
            } else if (zoomLevel >= 50) {
              showFrequency = 14; // Cada 14 días
              dateFormat = 'biweek';
            } else {
              showFrequency = 30; // Cada mes aprox
              dateFormat = 'month';
            }

            // Días de la semana en formato corto español
            const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

            // Formatear según el tipo
            const formatLabel = (date) => {
              const dayLetter = dayLetters[date.getDay()];
              if (dateFormat === 'month') {
                return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
              } else if (dateFormat === 'biweek' || dateFormat === 'week') {
                return `${dayLetter} ${date.getDate()}/${date.getMonth() + 1}`;
              }
              // Para vista diaria, mostrar letra del día + número
              return `${dayLetter} ${date.getDate()}`;
            };

            if (index % showFrequency === 0) {
              return (
                <div
                  key={index}
                  style={{
                    ...styles.dateLabel,
                    left: `${index * cellWidth}px`,
                    width: `${cellWidth * showFrequency}px`
                  }}
                >
                  {formatLabel(col)}
                </div>
              );
            }
            return null;
          })}
            </div>
          </div>

          {/* Línea de HOY */}
          {todayIndex >= 0 && (
            <div
              style={{
                ...styles.todayLine,
                left: `${200 + todayIndex * cellWidth + cellWidth / 2}px`
              }}
            >
              <div style={styles.todayLabel}>HOY</div>
            </div>
          )}

          {/* Grid con tareas - usando subcomponente memoizado */}
          <div style={styles.grid}>
            {tasks.map((task, index) => (
              <GanttRow
                key={task.id || index}
                task={task}
                index={index}
                columns={columns}
                cellWidth={cellWidth}
                users={users}
                disabled={disabled}
                editingDay={editingDay}
                onDayClick={handleDayClick}
                onSaveProgress={handleSaveDayProgress}
                onCancelEdit={handleCancelEdit}
                parseLocalDate={parseLocalDate}
                formatDateToString={formatDateToString}
                formatDate={formatDate}
                getPriorityColor={getPriorityColor}
                calculateBarPosition={calculateBarPosition}
                generateRecurrenceOccurrences={generateRecurrenceOccurrences}
              />
            ))}
          </div>
        </div>
      </div>

        {/* Columna de Cumplimiento - Sticky a la derecha */}
        <div style={{
          position: 'sticky',
          right: 0,
          top: 0,
          zIndex: 15,
          background: t.bgCard,
          boxShadow: '-4px 0 8px rgba(0,0,0,0.1)'
        }}>
          {/* Header de Cumplimiento */}
          <div style={{
            width: '100px',
            padding: '12px 16px',
            fontWeight: '600',
            fontSize: '14px',
            borderLeft: `2px solid ${t.border}`,
            borderBottom: `2px solid ${t.border}`,
            background: t.bgPanel,
            textAlign: 'center',
            height: '42px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            Cumplimiento
          </div>

          {/* Valores de Cumplimiento por tarea - usando subcomponente memoizado */}
          {tasks.map((task, index) => (
            <ComplianceCell key={task.id || index} task={task} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
});

export default GanttChart;
