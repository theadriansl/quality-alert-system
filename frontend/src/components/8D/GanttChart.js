import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Helper para calcular días hábiles entre dos fechas
const countBusinessDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  // Parse en zona horaria local (evita UTC offset que cambia el día)
  const toLocal = (d) => {
    const s = typeof d === 'string' ? d : new Date(d).toISOString();
    const [y, m, day] = s.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, day);
  };
  const start = toLocal(startDate);
  const end = toLocal(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// ============================================================================
// HELPERS PUROS DE PRESENTACIÓN
// ============================================================================

/**
 * Determina el grupo de una tarea para agrupamiento visual
 * Orden de precedencia: Recurrentes > 8D/CAPA > Proyecto > Actividades
 */
const getTaskGroup = (task) => {
  if (task.isRecurring) return 'Recurrentes';
  if (task.source_type === '8D') return '8D / CAPA';
  if (task.project_name) return task.project_name;
  return 'Actividades';
};

/**
 * Calcula el estado de cumplimiento de una tarea
 * @param {Object} task - tarea con startDate, endDate, actualProgress
 * @param {Object} t - tema con colores (success, error, warning, accent)
 * @returns {{ expectedProg: number, actualProg: number, status: string, color: string }}
 */
const calcCompliance = (task, t) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(task.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(task.endDate);
  end.setHours(0, 0, 0, 0);

  let expectedProg = 0;
  if (today >= end) {
    expectedProg = 100;
  } else if (today > start) {
    const total = (end - start) / 86400000;
    const passed = (today - start) / 86400000;
    expectedProg = Math.round((passed / total) * 100);
  }

  const actualProg = Math.round(task.actualProgress || 0);
  let status, color;

  if (today > end && actualProg < 100) {
    // Pasó la fecha y no está completo → Atrasado (rojo)
    status = 'Atrasado';
    color = t.error;
  } else if (expectedProg > 0 && actualProg < expectedProg - 20) {
    // Más de 20% por debajo de lo esperado → En riesgo (ámbar)
    status = 'En riesgo';
    color = t.warning;
  } else if (actualProg >= 100) {
    // Completado → verde
    status = 'Completado';
    color = t.success;
  } else {
    // En curso (incluye "a tiempo" y "atrás" menores) → acento primario
    status = 'En curso';
    color = t.accent;
  }

  return { expectedProg, actualProg, status, color };
};

// ============================================================================
// CONSTANTES DE LAYOUT
// ============================================================================
const LAYOUT = {
  ROW_HEIGHT: 40,           // Filas compactas
  GROUP_BAND_HEIGHT: 30,    // Banda de grupo
  HEADER_HEIGHT: 56,        // Header principal
  TOOLBAR_HEIGHT: 48,       // Barra de herramientas
  PRIORITY_BAR_WIDTH: 3,    // Barra de prioridad
  PLAN_BAR_HEIGHT: 7,       // Barra planeada
  REAL_BAR_HEIGHT: 9,       // Barra real
  DAILY_MARKER_HEIGHT: 5,   // Marcadores diarios
  BAR_GAP: 2,               // Separación entre bandas
  BAR_RADIUS: 2             // Radio de barras
};

// Anchos de columnas del panel izquierdo
const COL_WIDTHS = {
  priority: 3,
  activity: 200,
  dates: 140,      // Inicio + Fin
  progress: 80,    // Real/Esp
  status: 47       // Estado chip
};

// Breakpoints para responsive
const BREAKPOINTS = {
  FULL: 1280,    // Todas las columnas
  MEDIUM: 1024   // Solo actividad + %
};

// Calcular ancho del panel según breakpoint
const getLeftPanelWidth = (windowWidth) => {
  if (windowWidth >= BREAKPOINTS.FULL) {
    // Todas las columnas: priority + activity + dates + progress + status
    return COL_WIDTHS.priority + COL_WIDTHS.activity + COL_WIDTHS.dates + COL_WIDTHS.progress + COL_WIDTHS.status;
  } else if (windowWidth >= BREAKPOINTS.MEDIUM) {
    // Sin dates y status: priority + activity + progress
    return COL_WIDTHS.priority + COL_WIDTHS.activity + COL_WIDTHS.progress;
  } else {
    // Solo actividad: priority + activity
    return COL_WIDTHS.priority + COL_WIDTHS.activity;
  }
};

// Determinar qué columnas mostrar
const getVisibleColumns = (windowWidth) => ({
  dates: windowWidth >= BREAKPOINTS.FULL,
  progress: windowWidth >= BREAKPOINTS.MEDIUM,
  status: windowWidth >= BREAKPOINTS.FULL
});

// Hook para detectar tamaño de ventana
const useWindowWidth = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
};

// Estilos del componente (panelWidth es dinámico según breakpoint)
const getStyles = (t, panelWidth = 470) => ({
  // Contenedor principal
  container: {
    width: '100%',
    background: t.bgCard,
    borderRadius: '8px',
    border: `1px solid ${t.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    position: 'relative'
  },
  // Toolbar superior
  toolbar: {
    height: `${LAYOUT.TOOLBAR_HEIGHT}px`,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: t.bg,
    borderBottom: `1px solid ${t.border}`,
    gap: '16px'
  },
  // Contenedor scrolleable
  scrollContainer: {
    maxHeight: '600px',
    overflow: 'auto'
  },
  // Header con dos niveles (mes + día)
  header: {
    display: 'flex',
    borderBottom: `1px solid ${t.border}`,
    background: t.bgPanel,
    position: 'sticky',
    top: 0,
    zIndex: 20,
    minHeight: `${LAYOUT.HEADER_HEIGHT}px`
  },
  // Panel izquierdo del header (ancho dinámico)
  headerLeftPanel: {
    width: `${panelWidth}px`,
    minWidth: `${panelWidth}px`,
    display: 'flex',
    alignItems: 'center',
    borderRight: `1px solid ${t.border}`,
    background: t.bgPanel,
    padding: '0 12px',
    gap: '8px',
    fontSize: '11px',
    fontWeight: '600',
    color: t.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  // Timeline header (meses + días)
  timelineHeader: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  // Banda de mes
  monthBand: {
    height: '24px',
    display: 'flex',
    borderBottom: `1px solid ${t.border}`
  },
  monthLabel: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '600',
    color: t.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderRight: `1px solid ${t.border}`,
    display: 'flex',
    alignItems: 'center'
  },
  // Banda de días
  dayBand: {
    height: '32px',
    display: 'flex',
    position: 'relative'
  },
  dayLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: t.textMuted,
    borderRight: `1px solid ${t.border}`
  },
  dayLetter: {
    fontSize: '9px',
    fontWeight: '600',
    lineHeight: 1
  },
  dayNumber: {
    fontSize: '11px',
    fontWeight: '500',
    lineHeight: 1
  },
  // Línea de HOY (detrás de las barras)
  todayLine: {
    position: 'absolute',
    top: `${LAYOUT.HEADER_HEIGHT}px`,  // Empieza debajo del header
    bottom: 0,
    width: '1px',
    background: t.textMuted,
    opacity: 0.5,
    zIndex: 1,  // Detrás de las barras
    pointerEvents: 'none'
  },
  // Etiqueta HOY (solo en el header)
  todayLabel: {
    position: 'absolute',
    top: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: t.error,
    color: 'white',
    padding: '2px 6px',
    borderRadius: '2px',
    fontSize: '9px',
    fontWeight: '700',
    fontFamily: "'IBM Plex Mono', monospace",
    whiteSpace: 'nowrap'
  },
  // Contenedor de etiqueta HOY en el header
  todayLabelContainer: {
    position: 'absolute',
    top: 0,
    height: `${LAYOUT.HEADER_HEIGHT}px`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 25,
    pointerEvents: 'none'
  },
  // Grid de tareas (encima de la línea de HOY)
  grid: {
    background: t.bgCard,
    position: 'relative',
    zIndex: 2
  },
  // Banda de grupo
  groupBand: {
    height: `${LAYOUT.GROUP_BAND_HEIGHT}px`,
    background: t.bgPanel,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontSize: '10.5px',
    fontWeight: '600',
    color: t.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${t.border}`,
    position: 'sticky',
    left: 0
  },
  // Fila de tarea
  row: {
    display: 'flex',
    borderBottom: `1px solid ${t.border}`,
    height: `${LAYOUT.ROW_HEIGHT}px`,
    boxSizing: 'border-box',
    position: 'relative',
    background: t.bgCard
  },
  rowCancelled: {
    opacity: 0.5
  },
  // Panel izquierdo de la fila (tabla de info - ancho dinámico)
  rowLeftPanel: {
    width: `${panelWidth}px`,
    minWidth: `${panelWidth}px`,
    display: 'flex',
    alignItems: 'center',
    borderRight: `1px solid ${t.border}`,
    background: t.bgCard,
    position: 'sticky',
    left: 0,
    zIndex: 10
  },
  // Barra de prioridad
  priorityBar: {
    width: `${LAYOUT.PRIORITY_BAR_WIDTH}px`,
    height: '100%',
    flexShrink: 0
  },
  // Celda de actividad
  cellActivity: {
    width: `${COL_WIDTHS.activity}px`,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflow: 'hidden'
  },
  activityTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: t.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  activityTitleCancelled: {
    textDecoration: 'line-through',
    color: t.textMuted
  },
  recurringChip: {
    fontSize: '9px',
    fontWeight: '700',
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '1px 4px',
    borderRadius: '2px',
    background: t.accent,
    color: 'white',
    flexShrink: 0
  },
  // Celda de fechas
  cellDates: {
    width: `${COL_WIDTHS.dates}px`,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: t.textMuted
  },
  // Celda de progreso
  cellProgress: {
    width: `${COL_WIDTHS.progress}px`,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace"
  },
  // Celda de estado (chip)
  cellStatus: {
    width: `${COL_WIDTHS.status}px`,
    padding: '0 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusChip: {
    fontSize: '9px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '2px',
    whiteSpace: 'nowrap'
  },
  // Timeline de la fila
  timeline: {
    flex: 1,
    position: 'relative',
    display: 'flex'
  },
  // Celda del grid (día)
  gridCell: {
    borderRight: `1px solid ${t.border}`,
    cursor: 'pointer',
    position: 'relative'
  },
  gridCellWeekend: {
    background: `${t.bgPanel}`
  },
  // Contenedor de barras (plan arriba, real abajo)
  barsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
    padding: '4px 0',
    pointerEvents: 'none'
  },
  // Barra planeada (arriba, gris)
  barPlan: {
    height: `${LAYOUT.PLAN_BAR_HEIGHT}px`,
    background: t.border,
    border: `1px solid ${t.textDim}`,
    borderRadius: `${LAYOUT.BAR_RADIUS}px`,
    position: 'absolute'
  },
  // Barra real (abajo, color)
  barReal: {
    height: `${LAYOUT.REAL_BAR_HEIGHT}px`,
    borderRadius: `${LAYOUT.BAR_RADIUS}px`,
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '4px'
  },
  // Label de porcentaje FUERA de la barra (a la derecha)
  barRealLabel: {
    position: 'absolute',
    left: '100%',
    marginLeft: '6px',
    fontSize: '10.5px',
    fontWeight: '500',
    fontFamily: "'IBM Plex Mono', monospace",
    color: t.textMuted,
    whiteSpace: 'nowrap'
  },
  // Marcador de progreso diario
  dailyMarker: {
    position: 'absolute',
    height: `${LAYOUT.DAILY_MARKER_HEIGHT}px`,
    borderRadius: '1px',
    cursor: 'default'
  },
  // Contenedor de marcadores diarios
  dailyMarkersContainer: {
    position: 'relative',
    height: `${LAYOUT.DAILY_MARKER_HEIGHT}px`,
    width: '100%',
    marginTop: `${LAYOUT.BAR_GAP}px`
  },
  // Leyenda al pie
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderTop: `1px solid ${t.border}`,
    background: t.bg,
    fontSize: '10px',
    color: t.textMuted
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  legendSwatch: {
    width: '16px',
    height: '6px',
    borderRadius: '1px'
  },
  // Para mantener compatibilidad con ComplianceCell mientras se migra
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

// Contar ocurrencias REALES de una tarea recurrente según frequencyDetails
const countRealOccurrences = (startDate, endDate, frequency, frequencyDetails) => {
  if (!startDate || !endDate) return 0;

  const toLocal = (d) => {
    const s = typeof d === 'string' ? d : new Date(d).toISOString();
    const [y, m, day] = s.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, day);
  };

  const start = toLocal(startDate);
  const end = toLocal(endDate);

  // Parsear frequencyDetails si es string
  let details = frequencyDetails || {};
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch (e) { details = {}; }
  }

  const recurringDays = details.recurring_days || [];

  // Si no hay días seleccionados, usar el día de inicio
  const daysToUse = recurringDays.length > 0 ? recurringDays : [start.getDay()];

  // Intervalo de semanas según frecuencia
  const weekInterval = {
    'weekly': 1,
    'biweekly': 2,
    'monthly': 4,
    'quarterly': 13
  }[frequency] || 1;

  // Contar ocurrencias reales
  let count = 0;
  let currentWeekStart = new Date(start);
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Ir al domingo

  let weekCount = 0;

  while (currentWeekStart <= end) {
    if (weekCount % weekInterval === 0) {
      for (const dayOfWeek of daysToUse) {
        const occurrenceDate = new Date(currentWeekStart);
        occurrenceDate.setDate(occurrenceDate.getDate() + dayOfWeek);

        if (occurrenceDate >= start && occurrenceDate <= end) {
          count++;
        }
      }
    }
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekCount++;
  }

  return Math.max(1, count);
};

// Componente separado para el popup de edición - evita re-renders del grid completo
const EditDayPopup = memo(({ date, existingEntry, onSave, onCancel, formatDate, priorityColor, isRecurring, frequency, frequencyDetails, taskStartDate, taskEndDate }) => {
  const { theme: t } = useTheme();
  const [progressInput, setProgressInput] = useState(existingEntry?.progress?.toString() || '');
  const [activitiesInput, setActivitiesInput] = useState(existingEntry?.activities || '');
  const [hoursInput, setHoursInput] = useState(existingEntry?.hours?.toString() || '');

  // Calcular límite por ocurrencia para actividades recurrentes (usando ocurrencias REALES)
  const dailyLimit = useMemo(() => {
    if (!isRecurring || !frequency) return null;
    const occurrences = countRealOccurrences(taskStartDate, taskEndDate, frequency, frequencyDetails);
    if (occurrences <= 0) return null;
    return Math.round((100 / occurrences) * 100) / 100;
  }, [isRecurring, frequency, frequencyDetails, taskStartDate, taskEndDate]);

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
      const realOccurrences = countRealOccurrences(taskStartDate, taskEndDate, frequency, frequencyDetails);
      const confirmExceed = window.confirm(
        ` ACTIVIDAD RECURRENTE\n\n` +
        `El progreso ingresado (${progress}%) excede el límite sugerido (${dailyLimit}%).\n\n` +
        `Esta actividad tiene ${realOccurrences} ocurrencias programadas, ` +
        `por lo que el avance máximo recomendado por ocurrencia es ${dailyLimit}%.\n\n` +
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
            <span style={{ color: t.warningFg, marginLeft: '4px' }}>
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
            border: `1px solid ${dailyLimit && parseFloat(progressInput) > dailyLimit ? t.warningFg : t.border}`,
            borderRadius: '4px',
            fontSize: '12px',
            boxSizing: 'border-box',
            backgroundColor: dailyLimit && parseFloat(progressInput) > dailyLimit ? t.warningBg : t.bgCard,
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
            background: t.textMuted,
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

// Subcomponente memoizado para cada fila del Gantt (REDISEÑO V2 - Responsive)
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
  generateRecurrenceOccurrences,
  visibleColumns,
  panelWidth
}) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t, panelWidth);

  // Calcular cumplimiento usando helper puro
  const compliance = calcCompliance(task, t);
  const position = calculateBarPosition(task, columns, cellWidth);
  const isCancelled = task.status === 'cancelled';
  const isPending = task.status === 'pending';

  // Color de prioridad para barra lateral
  const priorityColors = {
    alta: t.error,
    media: t.warning,
    baja: t.accent
  };
  const priorityColor = priorityColors[task.priority] || t.textMuted;

  // Chip de frecuencia para recurrentes
  const freqLabel = task.isRecurring ? (
    task.frequency === 'weekly' ? 'SEM' :
    task.frequency === 'biweekly' ? 'QUI' :
    task.frequency === 'monthly' ? 'MEN' : 'REC'
  ) : null;

  // Formatear fechas cortas
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div style={{
      ...styles.row,
      ...(isCancelled ? styles.rowCancelled : {})
    }}>
      {/* Panel izquierdo - Tabla de info (sticky) */}
      <div style={{
        ...styles.rowLeftPanel,
        boxShadow: '2px 0 4px rgba(0,0,0,0.04)'
      }}>
        {/* Barra de prioridad (3px) */}
        <div style={{
          ...styles.priorityBar,
          background: priorityColor
        }} title={`Prioridad: ${task.priority || 'normal'}`} />

        {/* Columna: Actividad (siempre visible) */}
        <div style={styles.cellActivity}>
          {freqLabel && (
            <span style={styles.recurringChip}>{freqLabel}</span>
          )}
          <span
            style={{
              ...styles.activityTitle,
              ...(isCancelled ? styles.activityTitleCancelled : {})
            }}
            title={task.action || task.description}
          >
            {task.action || task.description || `Tarea ${index + 1}`}
          </span>
        </div>

        {/* Columna: Inicio - Fin (responsive) */}
        {visibleColumns.dates && (
          <div style={styles.cellDates}>
            <span>{formatShortDate(task.startDate)}</span>
            <span style={{ color: t.textDim }}>→</span>
            <span>{formatShortDate(task.endDate)}</span>
          </div>
        )}

        {/* Columna: Real / Esperado (responsive) */}
        {visibleColumns.progress && (
          <div style={{
            ...styles.cellProgress,
            color: compliance.color
          }}>
            {compliance.actualProg}/{compliance.expectedProg}%
          </div>
        )}

        {/* Columna: Estado (chip) (responsive) */}
        {visibleColumns.status && (
          <div style={styles.cellStatus}>
            <span style={{
              ...styles.statusChip,
              background: `${compliance.color}18`,
              color: compliance.color
            }}>
              {compliance.status}
            </span>
          </div>
        )}
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
          const isWeekend = col.getDay() === 0 || col.getDay() === 6;

          // Tooltip dinámico
          let tooltip = `Click para agregar progreso: ${formatDate(col)}`;
          if (progressEntry) {
            tooltip = `${formatDate(col)}: +${progressEntry.progress}% (Acum: ${progressEntry.accumulated}%)`;
            if (progressEntry.hours) tooltip += `\n${progressEntry.hours} hrs`;
            if (progressEntry.activities) tooltip += `\n${progressEntry.activities}`;
            tooltip += '\n\nClick para editar';
          }
          if (disabled) tooltip = 'Bloqueado';

          return (
            <div
              key={colIndex}
              onClick={() => !disabled && onDayClick(task.id, col)}
              style={{
                ...styles.gridCell,
                width: `${cellWidth}px`,
                minWidth: `${cellWidth}px`,
                ...(isWeekend ? styles.gridCellWeekend : {}),
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                outline: isEditing ? `2px solid ${t.accent}` : 'none',
                outlineOffset: '-2px'
              }}
              title={tooltip}
            >
              {isEditing && (
                <EditDayPopup
                  date={col}
                  existingEntry={editingDay?.existingEntry}
                  onSave={(data) => onSaveProgress(task.id, col, data)}
                  onCancel={onCancelEdit}
                  formatDate={formatDate}
                  priorityColor={priorityColor}
                  isRecurring={task.isRecurring}
                  frequency={task.frequency}
                  frequencyDetails={task.frequencyDetails}
                  taskStartDate={task.startDate}
                  taskEndDate={task.endDate}
                />
              )}
            </div>
          );
        })}

        {/* Contenedor de barras (plan arriba, real abajo) */}
        <div style={styles.barsContainer}>
          {/* BARRA PLAN (arriba, gris) - siempre visible */}
          <div style={{ position: 'relative', height: `${LAYOUT.PLAN_BAR_HEIGHT}px`, width: '100%' }}>
            <div
              style={{
                ...styles.barPlan,
                ...position
              }}
              title={`Plan: ${task.startDate} → ${task.endDate}`}
            />
          </div>

          {/* BARRA REAL (medio, color) - solo si no es pending y tiene progreso */}
          <div style={{ position: 'relative', height: `${LAYOUT.REAL_BAR_HEIGHT}px`, width: '100%', marginTop: `${LAYOUT.BAR_GAP}px` }}>
            {!isPending && task.dailyProgress && task.dailyProgress.length > 0 ? (
              (() => {
                // Calcular rango de barras reales (desde primer progreso hasta último)
                const sortedProgress = [...task.dailyProgress].sort(
                  (a, b) => new Date(a.date) - new Date(b.date)
                );
                const firstDate = parseLocalDate(sortedProgress[0].date);
                const lastDate = parseLocalDate(sortedProgress[sortedProgress.length - 1].date);

                const firstIndex = columns.findIndex(col => col.toDateString() === firstDate.toDateString());
                const lastIndex = columns.findIndex(col => col.toDateString() === lastDate.toDateString());

                if (firstIndex < 0 || lastIndex < 0) return null;

                const leftPx = firstIndex * cellWidth;
                const widthPx = (lastIndex - firstIndex + 1) * cellWidth;

                // Color basado en estado de cumplimiento
                const barColor = isCancelled ? t.textMuted : compliance.color;

                return (
                  <div
                    style={{
                      ...styles.barReal,
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                      background: barColor,
                      position: 'relative'
                    }}
                    title={`Real: ${compliance.actualProg}%`}
                  >
                    {/* Label de porcentaje FUERA de la barra */}
                    <span style={styles.barRealLabel}>
                      {compliance.actualProg}%
                    </span>
                  </div>
                );
              })()
            ) : null}
          </div>

          {/* MARCADORES DIARIOS (abajo) - solo si tiene daily_progress */}
          {task.dailyProgress && task.dailyProgress.length > 0 && (
            <div style={styles.dailyMarkersContainer}>
              {task.dailyProgress.map((entry, idx) => {
                const entryDate = parseLocalDate(entry.date);
                const colIndex = columns.findIndex(col => col.toDateString() === entryDate.toDateString());

                if (colIndex < 0) return null;

                // Verificar si es el día de hoy
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isToday = entryDate.toDateString() === today.toDateString();

                // Formatear fecha para el tooltip
                const dateStr = entryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                const tooltipText = `${dateStr} · ${entry.activities || 'Sin descripción'} · ${entry.hours || 0}h · +${entry.progress}% → ${entry.accumulated || entry.progress}%`;

                return (
                  <div
                    key={idx}
                    style={{
                      ...styles.dailyMarker,
                      left: `${colIndex * cellWidth}px`,
                      width: `${cellWidth - 1}px`,
                      background: isToday ? t.primary : t.accent
                    }}
                    title={tooltipText}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparador personalizado - solo re-renderiza si cambian datos relevantes
  if (prevProps.task.id !== nextProps.task.id) return false;
  if (prevProps.task.actualProgress !== nextProps.task.actualProgress) return false;
  if (prevProps.task.status !== nextProps.task.status) return false;
  if (prevProps.cellWidth !== nextProps.cellWidth) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  const prevEditing = prevProps.editingDay?.taskId === prevProps.task.id;
  const nextEditing = nextProps.editingDay?.taskId === nextProps.task.id;
  if (prevEditing !== nextEditing) return false;
  const prevLen = prevProps.task.dailyProgress?.length || 0;
  const nextLen = nextProps.task.dailyProgress?.length || 0;
  if (prevLen !== nextLen) return false;
  return true;
});

// Subcomponente memoizado para columna de cumplimiento
const ComplianceCell = memo(({ task, index }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);

  // Usar helper puro de cumplimiento
  const { expectedProg, actualProg, status, color } = calcCompliance(task, t);

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
        color: color,
        marginBottom: '2px',
        fontFamily: "'IBM Plex Mono', monospace"
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
        color: color,
        fontWeight: '600'
      }}>
        {status}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderiza si cambia el progreso de esta tarea
  return prevProps.task.id === nextProps.task.id &&
         prevProps.task.actualProgress === nextProps.task.actualProgress;
});

// ============================================================================
// COMPONENTE: Leyenda del Gantt
// ============================================================================
const GanttLegend = memo(() => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);

  const legendItems = [
    { label: 'Planeado', color: t.border, border: t.textDim },
    { label: 'Completado', color: t.success },
    { label: 'En curso', color: t.accent },
    { label: 'En riesgo', color: t.warning },
    { label: 'Atrasado', color: t.error }
  ];

  return (
    <div style={styles.legend}>
      <div style={{ display: 'flex', gap: '16px' }}>
        {legendItems.map(item => (
          <div key={item.label} style={styles.legendItem}>
            <div style={{
              ...styles.legendSwatch,
              background: item.color,
              border: item.border ? `1px solid ${item.border}` : 'none'
            }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '9px', color: t.textDim }}>
        Barra superior: Plan | Barra inferior: Real
      </div>
    </div>
  );
});

// ============================================================================
// COMPONENTE: Header de Timeline con dos niveles (mes + día)
// ============================================================================
const TimelineHeader = memo(({ columns, cellWidth, t }) => {
  const styles = getStyles(t);

  // Agrupar columnas por mes
  const monthGroups = useMemo(() => {
    const groups = [];
    let currentMonth = null;
    let startIdx = 0;

    columns.forEach((col, idx) => {
      const monthKey = `${col.getFullYear()}-${col.getMonth()}`;
      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          groups.push({ month: currentMonth, start: startIdx, end: idx - 1 });
        }
        currentMonth = monthKey;
        startIdx = idx;
      }
    });
    // Último grupo
    if (currentMonth !== null) {
      groups.push({ month: currentMonth, start: startIdx, end: columns.length - 1 });
    }
    return groups;
  }, [columns]);

  // Nombres de meses en español
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <div style={styles.timelineHeader}>
      {/* Banda de meses */}
      <div style={styles.monthBand}>
        {monthGroups.map((group, idx) => {
          const [year, month] = group.month.split('-').map(Number);
          const width = (group.end - group.start + 1) * cellWidth;
          return (
            <div key={idx} style={{ ...styles.monthLabel, width: `${width}px` }}>
              {monthNames[month]} {year}
            </div>
          );
        })}
      </div>

      {/* Banda de días */}
      <div style={styles.dayBand}>
        {columns.map((col, idx) => {
          const isWeekend = col.getDay() === 0 || col.getDay() === 6;
          return (
            <div
              key={idx}
              style={{
                ...styles.dayLabel,
                width: `${cellWidth}px`,
                minWidth: `${cellWidth}px`,
                background: isWeekend ? t.bgPanel : 'transparent',
                opacity: isWeekend ? 0.7 : 1
              }}
            >
              <span style={styles.dayLetter}>{dayLetters[col.getDay()]}</span>
              <span style={styles.dayNumber}>{col.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// COMPONENTE: Banda de grupo
// ============================================================================
const GroupBand = memo(({ groupName, taskCount, t }) => {
  const styles = getStyles(t);
  return (
    <div style={styles.groupBand}>
      <span>{groupName}</span>
      <span style={{ marginLeft: '8px', opacity: 0.6 }}>({taskCount})</span>
    </div>
  );
});

const GanttChart = memo(({ tasks, users, onTaskUpdate, viewScale = 'Week', disabled = false }) => {
  const { theme: t } = useTheme();

  // Responsive: detectar ancho de ventana
  const windowWidth = useWindowWidth();
  const panelWidth = useMemo(() => getLeftPanelWidth(windowWidth), [windowWidth]);
  const visibleColumns = useMemo(() => getVisibleColumns(windowWidth), [windowWidth]);

  const styles = getStyles(t, panelWidth);
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
      // Fechas planificadas (parse local para evitar UTC offset)
      if (t.startDate) dates.push(parseLocalDate(t.startDate.split('T')[0]));
      if (t.endDate) dates.push(parseLocalDate(t.endDate.split('T')[0]));

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

    // Limitar a máximo 400 días para soportar actividades de un año
    const maxDays = 400;
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
    const startDate = task.startDate ? parseLocalDate(task.startDate.split('T')[0]) : new Date();
    const endDate = task.endDate ? parseLocalDate(task.endDate.split('T')[0]) : new Date();

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

  // Obtener color según prioridad (coincide con PriorityBar)
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return t.error;
      case 'media': return t.warning;
      case 'baja': return t.border;
      default: return t.border;
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

  // Agrupar tareas usando getTaskGroup
  const groupedTasks = useMemo(() => {
    const groups = {};
    const order = ['Recurrentes', '8D / CAPA']; // Prioridad de orden

    tasks.forEach(task => {
      const groupName = getTaskGroup(task);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(task);
    });

    // Ordenar grupos: primero los de orden fijo, luego proyectos alfabéticamente, luego "Actividades"
    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);

      // Ambos están en orden predefinido
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      // Solo a está en orden
      if (aIdx >= 0) return -1;
      // Solo b está en orden
      if (bIdx >= 0) return 1;
      // "Actividades" siempre al final
      if (a === 'Actividades') return 1;
      if (b === 'Actividades') return -1;
      // Otros (proyectos) alfabéticamente
      return a.localeCompare(b);
    });

    return sortedGroupNames.map(name => ({
      name,
      tasks: groups[name]
    }));
  }, [tasks]);

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
              backgroundColor: todayIndex >= 0 ? t.primary : t.bgPanel,
              border: `1px solid ${todayIndex >= 0 ? t.primary : t.border}`,
              borderRadius: '6px',
              cursor: todayIndex >= 0 ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: '600',
              color: todayIndex >= 0 ? 'white' : t.textDim
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

      {/* Gantt Content - Scroll Container */}
      <div ref={timelineRef} style={styles.scrollContainer}>
        <div style={{
          width: `${panelWidth + columns.length * cellWidth}px`,
          minWidth: '100%',
          position: 'relative'
        }}>
          {/* Header de dos niveles */}
          <div style={styles.header}>
            {/* Header del panel izquierdo (columnas de info) */}
            <div style={{
              ...styles.headerLeftPanel,
              boxShadow: '2px 0 4px rgba(0,0,0,0.04)'
            }}>
              <div style={{ width: `${COL_WIDTHS.priority}px` }} />
              <div style={{ width: `${COL_WIDTHS.activity}px` }}>Actividad</div>
              {visibleColumns.dates && (
                <div style={{ width: `${COL_WIDTHS.dates}px`, textAlign: 'center' }}>Inicio - Fin</div>
              )}
              {visibleColumns.progress && (
                <div style={{ width: `${COL_WIDTHS.progress}px`, textAlign: 'center' }}>%</div>
              )}
              {visibleColumns.status && (
                <div style={{ width: `${COL_WIDTHS.status}px`, textAlign: 'center' }}>Estado</div>
              )}
            </div>

            {/* Timeline Header (mes + día) */}
            <TimelineHeader columns={columns} cellWidth={cellWidth} t={t} />
          </div>

          {/* Etiqueta HOY (solo en el header) */}
          {todayIndex >= 0 && (
            <div
              style={{
                ...styles.todayLabelContainer,
                left: `${panelWidth + todayIndex * cellWidth + cellWidth / 2}px`
              }}
            >
              <div style={styles.todayLabel}>HOY</div>
            </div>
          )}

          {/* Línea de HOY (detrás de las barras) */}
          {todayIndex >= 0 && (
            <div
              style={{
                ...styles.todayLine,
                left: `${panelWidth + todayIndex * cellWidth + cellWidth / 2}px`
              }}
            />
          )}

          {/* Grid con tareas agrupadas */}
          <div style={styles.grid}>
            {groupedTasks.map((group, groupIndex) => (
              <React.Fragment key={group.name}>
                {/* Banda de grupo */}
                <GroupBand
                  groupName={group.name}
                  taskCount={group.tasks.length}
                  t={t}
                />

                {/* Tareas del grupo */}
                {group.tasks.map((task, taskIndex) => (
                  <GanttRow
                    key={task.id || `${groupIndex}-${taskIndex}`}
                    task={task}
                    index={taskIndex}
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
                    visibleColumns={visibleColumns}
                    panelWidth={panelWidth}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda al pie */}
      <GanttLegend />
    </div>
  );
});

export default GanttChart;
