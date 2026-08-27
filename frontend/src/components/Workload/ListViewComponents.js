import React, { memo } from 'react';

// ============================================================================
// CONSTANTES DE LAYOUT
// ============================================================================
const LAYOUT = {
  ROW_HEIGHT: 44,
  HEADER_HEIGHT: 40,
  PRIORITY_BAR_WIDTH: 3,
  PROGRESS_RAIL_HEIGHT: 6,
  STATUS_DOT_SIZE: 5
};

// Anchos de columnas (flexibles con min-width)
const COL = {
  chevron: 28,
  priority: 3,
  activity: 'minmax(200px, 1fr)',
  dates: 120,
  progress: 140,
  realEsp: 90,
  status: 100,
  actions: 100
};

// ============================================================================
// HELPERS
// ============================================================================

const formatShortDate = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatDateMono = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (fileName) => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : '';
};

// ============================================================================
// StatusChip - Chip de estado discreto (punto 5px + texto)
// ============================================================================
export const StatusChip = memo(({ status, compliance, t }) => {
  // Determinar estado visual basado en compliance y status
  let label, color;

  if (status === 'completed' || compliance?.real >= 100) {
    label = 'Completado';
    color = t.success;
  } else if (status === 'cancelled') {
    label = 'Cancelada';
    color = t.textMuted;
  } else if (compliance && compliance.real < compliance.expected - 20) {
    label = 'Atrasado';
    color = t.error;
  } else if (compliance && compliance.real < compliance.expected) {
    label = 'En riesgo';
    color = t.warning;
  } else {
    label = 'En curso';
    color = t.accent;
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      backgroundColor: `${color}12`,
      border: `1px solid ${color}30`,
      color: color,
      whiteSpace: 'nowrap'
    }}>
      <span style={{
        width: `${LAYOUT.STATUS_DOT_SIZE}px`,
        height: `${LAYOUT.STATUS_DOT_SIZE}px`,
        borderRadius: '50%',
        backgroundColor: color
      }} />
      {label}
    </span>
  );
});

// ============================================================================
// ProgressBar - Barra de avance con marca de esperado
// ============================================================================
export const ProgressBar = memo(({ progress, expectedProg, color, t }) => {
  return (
    <div style={{
      position: 'relative',
      height: `${LAYOUT.PROGRESS_RAIL_HEIGHT}px`,
      backgroundColor: t.bgPanel,
      borderRadius: '3px',
      overflow: 'visible',
      flex: 1
    }}>
      {/* Marca vertical en expectedProg */}
      {expectedProg > 0 && (
        <div style={{
          position: 'absolute',
          left: `${Math.min(expectedProg, 100)}%`,
          top: '-1px',
          bottom: '-1px',
          width: '1px',
          backgroundColor: t.textDim,
          zIndex: 2
        }} />
      )}
      {/* Barra de progreso real */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: `${Math.min(progress || 0, 100)}%`,
        backgroundColor: color,
        borderRadius: '3px',
        transition: 'width 0.2s ease'
      }} />
    </div>
  );
});

// ============================================================================
// HistoryList - Lista plana de daily_progress
// ============================================================================
export const HistoryList = memo(({
  dailyProgress,
  actualProgress,
  totalHours,
  t
}) => {
  if (!dailyProgress || dailyProgress.length === 0) {
    return (
      <div style={{
        padding: '12px',
        textAlign: 'center',
        color: t.textMuted,
        fontSize: '12px'
      }}>
        Sin actividades registradas
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {[...dailyProgress].reverse().map((entry, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '70px 1fr auto',
            gap: '12px',
            padding: '8px 0',
            borderBottom: idx < dailyProgress.length - 1 ? `1px solid ${t.border}` : 'none',
            fontSize: '12px',
            alignItems: 'baseline'
          }}
        >
          {/* Fecha (mono) */}
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: t.textMuted
          }}>
            {formatDateMono(entry.date)}
          </span>

          {/* Actividades */}
          <span style={{ color: t.text }}>
            {entry.activities || <span style={{ color: t.textDim, fontStyle: 'italic' }}>Sin descripción</span>}
          </span>

          {/* Hours + Progress (mono) */}
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: t.textMuted,
            whiteSpace: 'nowrap',
            textAlign: 'right'
          }}>
            {entry.hours > 0 && <span>{entry.hours}h · </span>}
            <span style={{ color: t.accent }}>+{entry.progress}%</span>
            <span style={{ color: t.textDim }}> → {entry.accumulated || entry.progress}%</span>
          </span>
        </div>
      ))}

      {/* Fila Acumulado */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '70px 1fr auto',
        gap: '12px',
        padding: '10px 0 4px',
        borderTop: `1px solid ${t.border}`,
        marginTop: '4px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        <span style={{ color: t.textMuted }}>Acumulado</span>
        <span />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: t.text,
          textAlign: 'right'
        }}>
          {totalHours > 0 && <span>{totalHours}h · </span>}
          <span style={{ color: t.success }}>{actualProgress || 0}%</span>
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// EvidenceList - Lista de archivos de evidencia (una línea cada uno)
// ============================================================================
export const EvidenceList = memo(({
  files,
  requiresEvidence,
  onDownload,
  onDelete,
  onOpen8D,
  t
}) => {
  if (!files || files.length === 0) {
    if (requiresEvidence) {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: `${t.warning}08`,
          borderRadius: '4px',
          color: t.warning,
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Esta actividad requiere evidencia obligatoria
        </div>
      );
    }
    return null;
  }

  // Deduplicar archivos
  const uniqueFiles = files.reduce((unique, file) => {
    const fileName = file.originalName || file.file_name || file.name || '';
    const existingIndex = unique.findIndex(f =>
      (f.originalName || f.file_name || f.name || '') === fileName
    );
    if (existingIndex === -1) {
      unique.push(file);
    } else if (!unique[existingIndex].id && file.id) {
      unique[existingIndex] = file;
    }
    return unique;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {uniqueFiles.map((file, idx) => {
        const fileUrl = file.file_url || file.url;
        const isFrom8D = file.source === '8D' || (fileUrl && fileUrl.startsWith('/uploads/'));
        const fileName = file.originalName || file.file_name || file.name || 'Archivo';
        const fileSize = file.size || file.file_size || 0;
        const uploadedAt = file.uploadedAt || file.uploaded_at;
        const ext = getFileExtension(fileName);

        return (
          <div
            key={file.id || `file-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 0',
              borderBottom: idx < uniqueFiles.length - 1 ? `1px solid ${t.border}` : 'none',
              fontSize: '12px'
            }}
          >
            {/* Extension chip (mono) */}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '9px',
              fontWeight: '600',
              padding: '2px 4px',
              borderRadius: '2px',
              backgroundColor: isFrom8D ? `${t.warning}15` : t.bgPanel,
              color: isFrom8D ? t.warning : t.textMuted,
              minWidth: '32px',
              textAlign: 'center'
            }}>
              {ext || 'FILE'}
            </span>

            {/* Nombre con ellipsis */}
            <span style={{
              flex: 1,
              color: t.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {fileName}
              {isFrom8D && (
                <span style={{
                  marginLeft: '6px',
                  fontSize: '10px',
                  color: t.warning,
                  fontWeight: '500'
                }}>(8D)</span>
              )}
            </span>

            {/* Meta: peso · fecha (mono) - sin uploadedByName si no existe */}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: t.textDim,
              whiteSpace: 'nowrap'
            }}>
              {fileSize > 0 && formatFileSize(fileSize)}
              {fileSize > 0 && uploadedAt && ' · '}
              {uploadedAt && formatDateMono(uploadedAt)}
            </span>

            {/* Acciones como enlaces */}
            {isFrom8D && fileUrl ? (
              <a
                href={`http://localhost:5000${fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); onOpen8D && onOpen8D(file); }}
                style={{
                  color: t.warning,
                  fontSize: '11px',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                Abrir
              </a>
            ) : (
              <>
                <a
                  onClick={(e) => { e.preventDefault(); onDownload && onDownload(file); }}
                  style={{
                    color: t.accent,
                    fontSize: '11px',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Descargar
                </a>
                {onDelete && (
                  <a
                    onClick={(e) => { e.preventDefault(); onDelete(file); }}
                    style={{
                      color: t.error,
                      fontSize: '11px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      marginLeft: '8px'
                    }}
                  >
                    Eliminar
                  </a>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
});

// ============================================================================
// ListHeader - Encabezado de la tabla
// ============================================================================
export const ListHeader = memo(({ t }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${COL.chevron}px ${COL.priority}px ${COL.activity} ${COL.dates}px ${COL.progress}px ${COL.realEsp}px ${COL.status}px ${COL.actions}px`,
      height: `${LAYOUT.HEADER_HEIGHT}px`,
      alignItems: 'center',
      padding: '0 8px',
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`,
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap'
    }}>
      <span />
      <span />
      <span style={{ paddingLeft: '8px' }}>Actividad</span>
      <span style={{ textAlign: 'center' }}>Inicio · Fin</span>
      <span style={{ textAlign: 'center' }}>Avance</span>
      <span style={{ textAlign: 'center' }}>Real/Esp</span>
      <span style={{ textAlign: 'center' }}>Estado</span>
      <span />
    </div>
  );
});

// ============================================================================
// ActivityRowCollapsed - Fila colapsada (44px)
// ============================================================================
export const ActivityRowCollapsed = memo(({
  activity,
  compliance,
  isCollapsed,
  onToggleCollapse,
  onEdit,
  onFeedback,
  onDelete,
  canEdit,
  t
}) => {
  const isCancelled = activity.status === 'cancelled';
  const isPending = activity.status === 'pending';

  // Color de prioridad
  const priorityColor = {
    alta: t.error,
    media: t.warning,
    baja: t.border
  }[activity.priority] || t.border;

  // Color de estado para barra de progreso
  const progressColor = compliance?.real >= compliance?.expected ? t.success :
                        compliance?.real < compliance?.expected - 20 ? t.error :
                        t.warning;

  // Chip de tipo (8D, SEM, etc)
  const typeChip = activity.source_type === '8D' ? '8D' :
                   activity.is_recurring ? (
                     activity.frequency === 'weekly' ? 'SEM' :
                     activity.frequency === 'biweekly' ? 'QUI' :
                     activity.frequency === 'monthly' ? 'MEN' : 'REC'
                   ) : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${COL.chevron}px ${COL.priority}px ${COL.activity} ${COL.dates}px ${COL.progress}px ${COL.realEsp}px ${COL.status}px ${COL.actions}px`,
      height: `${LAYOUT.ROW_HEIGHT}px`,
      alignItems: 'center',
      padding: '0 8px',
      backgroundColor: isCancelled ? t.bgPanel : t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      opacity: isCancelled ? 0.55 : 1,
      cursor: 'pointer'
    }}
    onClick={onToggleCollapse}
    >
      {/* Chevron */}
      <span style={{
        fontSize: '10px',
        color: t.textMuted,
        transition: 'transform 0.15s',
        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        ▼
      </span>

      {/* Priority bar */}
      <div style={{
        width: `${LAYOUT.PRIORITY_BAR_WIDTH}px`,
        height: '24px',
        backgroundColor: priorityColor,
        borderRadius: '1px'
      }} />

      {/* Actividad: título + chip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflow: 'hidden',
        paddingLeft: '8px',
        paddingRight: '12px'
      }}>
        {typeChip && (
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            fontWeight: '600',
            padding: '2px 4px',
            borderRadius: '2px',
            backgroundColor: activity.source_type === '8D' ? t.error : t.accent,
            color: 'white',
            flexShrink: 0
          }}>
            {typeChip}
          </span>
        )}
        <span style={{
          fontSize: '13px',
          fontWeight: '500',
          color: isCancelled ? t.textMuted : t.text,
          textDecoration: isCancelled ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {activity.title}
        </span>
        {activity.assigned_to_name && (
          <span style={{
            fontSize: '11px',
            color: t.textDim,
            flexShrink: 0
          }}>
            — {activity.assigned_to_name}
          </span>
        )}
      </div>

      {/* Fechas (mono) */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        color: t.textMuted,
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}>
        {formatShortDate(activity.start_date)} → {formatShortDate(activity.end_date)}
      </div>

      {/* Barra de progreso */}
      <div style={{ padding: '0 8px' }}>
        {!isPending ? (
          <ProgressBar
            progress={activity.progress || 0}
            expectedProg={compliance?.expected || 0}
            color={progressColor}
            t={t}
          />
        ) : (
          <div style={{
            height: `${LAYOUT.PROGRESS_RAIL_HEIGHT}px`,
            backgroundColor: t.bgPanel,
            borderRadius: '3px'
          }} />
        )}
      </div>

      {/* Real/Esp (mono) */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        fontWeight: '600',
        color: compliance?.real >= compliance?.expected ? t.success : t.error,
        textAlign: 'center'
      }}>
        {compliance?.real || 0}/{compliance?.expected || 0}%
      </div>

      {/* Estado chip */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <StatusChip
          status={activity.status}
          compliance={compliance}
          t={t}
        />
      </div>

      {/* Acciones como enlaces */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          paddingRight: '4px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {canEdit && (
          <a
            onClick={(e) => { e.preventDefault(); onEdit(); }}
            style={{ color: t.accent, fontSize: '11px', cursor: 'pointer', textDecoration: 'none' }}
          >
            Editar
          </a>
        )}
        <a
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          style={{ color: t.error, fontSize: '11px', cursor: 'pointer', textDecoration: 'none' }}
        >
          Eliminar
        </a>
      </div>
    </div>
  );
});

// ============================================================================
// ActivityRowExpanded - Contenido expandido (dos columnas)
// ============================================================================
export const ActivityRowExpanded = memo(({
  activity,
  compliance,
  dailyEntries,
  expandedActivityLog,
  collapsedHistory,
  uploadingEvidence,
  feedbackList,
  getDailyProgressLimit,
  onToggleActivityLog,
  onDailyEntryChange,
  onAddDailyProgress,
  onToggleHistory,
  onUploadEvidence,
  onDownloadEvidence,
  onDeleteEvidence,
  t
}) => {
  const isCancelled = activity.status === 'cancelled';
  const dailyLimit = getDailyProgressLimit ? getDailyProgressLimit(activity) : null;
  const totalHours = activity.daily_progress?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0;

  return (
    <div style={{
      backgroundColor: isCancelled ? t.bgPanel : t.bg,
      borderBottom: `1px solid ${t.border}`,
      padding: '16px 20px',
      opacity: isCancelled ? 0.55 : 1
    }}>
      {/* Grid de dos columnas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '24px'
      }}>
        {/* COLUMNA IZQUIERDA: Meta + Recovery Plan */}
        <div>
          {/* Meta grid etiqueta/valor */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: '8px 12px',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            <span style={{ color: t.textMuted }}>Responsable</span>
            <span style={{ color: t.text }}>{activity.assigned_to_name || 'Sin asignar'}</span>

            {activity.phase && (
              <>
                <span style={{ color: t.textMuted }}>Fase</span>
                <span style={{ color: t.text }}>{activity.phase}</span>
              </>
            )}

            {(activity.kpi_name || activity.area_name) && (
              <>
                <span style={{ color: t.textMuted }}>Área/KPI</span>
                <span style={{ color: t.text }}>
                  {activity.kpi_icon} {activity.kpi_name || activity.area_name}
                </span>
              </>
            )}

            {(activity.actual_hours > 0 || activity.estimated_hours > 0) && (
              <>
                <span style={{ color: t.textMuted }}>Horas</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: activity.actual_hours > activity.estimated_hours ? t.error : t.text
                }}>
                  {activity.actual_hours || 0} / {activity.estimated_hours || '?'}
                </span>
              </>
            )}

            <span style={{ color: t.textMuted }}>Prioridad</span>
            <span style={{
              color: activity.priority === 'alta' ? t.error :
                     activity.priority === 'media' ? t.warning : t.text
            }}>
              {activity.priority ? activity.priority.charAt(0).toUpperCase() + activity.priority.slice(1) : 'Normal'}
            </span>
          </div>

          {/* Recovery Plan */}
          {activity.recovery_plan && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: t.textMuted,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Plan de Recuperación
              </div>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: t.text,
                lineHeight: 1.5
              }}>
                {activity.recovery_plan}
              </p>
            </div>
          )}

          {/* Feedback Section (preserved as-is) */}
          {feedbackList && feedbackList.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: t.textMuted,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Feedback ({feedbackList.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {feedbackList.map(fb => {
                  const typeConfig = {
                    recognition: { color: t.success, label: 'Felicitación' },
                    warning: { color: t.warning, label: 'Llamada de atención' },
                    coaching: { color: t.accent, label: 'Retroalimentación' },
                    achievement: { color: t.accent, label: 'Logro' },
                    improvement_needed: { color: t.error, label: 'Área de mejora' },
                    note: { color: t.textMuted, label: 'Nota' }
                  }[fb.feedbackType] || { color: t.textMuted, label: 'Nota' };

                  return (
                    <div key={fb.id} style={{
                      padding: '8px 12px',
                      backgroundColor: t.bgCard,
                      borderRadius: '4px',
                      borderLeft: `3px solid ${typeConfig.color}`,
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: typeConfig.color }}>
                          {typeConfig.label}{fb.title && `: ${fb.title}`}
                        </span>
                        <span style={{ color: t.textDim, fontSize: '11px' }}>
                          {formatDateMono(fb.createdAt)}
                        </span>
                      </div>
                      <div style={{ color: t.textMuted }}>{fb.comment}</div>
                      <div style={{ fontSize: '11px', color: t.textDim, marginTop: '4px' }}>
                        — {fb.supervisor?.firstName} {fb.supervisor?.lastName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Historial + Evidencia */}
        <div>
          {/* Historial de Actividades */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div
                onClick={onToggleHistory}
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: t.textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                <span style={{
                  transition: 'transform 0.15s',
                  transform: collapsedHistory ? 'rotate(-90deg)' : 'rotate(0deg)',
                  fontSize: '10px'
                }}>▼</span>
                Historial de Actividades
                {activity.daily_progress?.length > 0 && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: '500',
                    color: t.textDim
                  }}>
                    ({activity.daily_progress.length})
                  </span>
                )}
              </div>
              <a
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleActivityLog(); }}
                style={{
                  color: t.accent,
                  fontSize: '11px',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                {expandedActivityLog ? 'Cancelar' : 'Registrar actividad'}
              </a>
            </div>

            {/* Formulario inline para registrar actividad */}
            {expandedActivityLog && (
              <div style={{
                padding: '12px',
                backgroundColor: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div>
                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                      Fecha
                    </label>
                    <input
                      type="date"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        border: `1px solid ${t.border}`,
                        borderRadius: '4px',
                        backgroundColor: t.bgCard,
                        color: t.text
                      }}
                      value={dailyEntries?.date || ''}
                      onChange={(e) => onDailyEntryChange({ ...dailyEntries, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                      Progreso (%)
                      {dailyLimit && (
                        <span style={{ color: t.warning, marginLeft: '4px' }}>
                          (máx: {dailyLimit}%)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        border: `1px solid ${dailyLimit && parseFloat(dailyEntries?.progress) > dailyLimit ? t.warning : t.border}`,
                        borderRadius: '4px',
                        backgroundColor: dailyLimit && parseFloat(dailyEntries?.progress) > dailyLimit ? `${t.warning}10` : t.bgCard,
                        color: t.text
                      }}
                      value={dailyEntries?.progress || ''}
                      onChange={(e) => onDailyEntryChange({ ...dailyEntries, progress: e.target.value })}
                      placeholder={dailyLimit ? `0-${dailyLimit}` : '0-100'}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                    Actividades realizadas
                  </label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '4px',
                      minHeight: '50px',
                      resize: 'vertical',
                      backgroundColor: t.bgCard,
                      color: t.text
                    }}
                    value={dailyEntries?.activities || ''}
                    onChange={(e) => onDailyEntryChange({ ...dailyEntries, activities: e.target.value })}
                    placeholder="Describe las actividades realizadas..."
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                    Horas invertidas
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '4px',
                      backgroundColor: t.bgCard,
                      color: t.text
                    }}
                    value={dailyEntries?.hours || ''}
                    onChange={(e) => onDailyEntryChange({ ...dailyEntries, hours: e.target.value })}
                    placeholder="Ej: 2.5"
                  />
                </div>
                <button
                  onClick={onAddDailyProgress}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: t.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Guardar Actividad
                </button>
              </div>
            )}

            {/* Lista de historial */}
            {!collapsedHistory && (
              <HistoryList
                dailyProgress={activity.daily_progress}
                actualProgress={activity.progress}
                totalHours={totalHours}
                t={t}
              />
            )}
          </div>

          {/* Evidencia */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: activity.requires_evidence ? t.warning : t.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {activity.requires_evidence ? 'Evidencia requerida' : 'Evidencia (opcional)'}
              </span>
              <label style={{
                color: t.accent,
                fontSize: '11px',
                cursor: uploadingEvidence ? 'not-allowed' : 'pointer',
                opacity: uploadingEvidence ? 0.6 : 1,
                textDecoration: 'none'
              }}>
                {uploadingEvidence ? 'Subiendo...' : 'Subir archivo'}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  disabled={uploadingEvidence}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      onUploadEvidence(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                />
              </label>
            </div>

            <EvidenceList
              files={activity.evidence_files}
              requiresEvidence={activity.requires_evidence}
              onDownload={onDownloadEvidence}
              onDelete={onDeleteEvidence}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// ListTabs - Tabs Pendientes/Completadas con subrayado
// ============================================================================
export const ListTabs = memo(({
  activeTab,
  pendingCount,
  completedCount,
  onTabChange,
  onCollapseAll,
  allCollapsed,
  t
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${t.border}`,
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Tab Pendientes */}
        <button
          onClick={() => onTabChange('pending')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 0',
            fontSize: '13px',
            fontWeight: activeTab === 'pending' ? '600' : '400',
            color: activeTab === 'pending' ? t.primary : t.textMuted,
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          Pendientes
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            marginLeft: '6px',
            color: t.textDim
          }}>
            {pendingCount}
          </span>
          {activeTab === 'pending' && (
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: t.primary
            }} />
          )}
        </button>

        {/* Tab Completadas */}
        <button
          onClick={() => onTabChange('completed')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 0',
            fontSize: '13px',
            fontWeight: activeTab === 'completed' ? '600' : '400',
            color: activeTab === 'completed' ? t.primary : t.textMuted,
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          Completadas
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            marginLeft: '6px',
            color: t.textDim
          }}>
            {completedCount}
          </span>
          {activeTab === 'completed' && (
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: t.primary
            }} />
          )}
        </button>
      </div>

      {/* Colapsar todo */}
      <a
        onClick={(e) => { e.preventDefault(); onCollapseAll(); }}
        style={{
          color: t.accent,
          fontSize: '12px',
          textDecoration: 'none',
          cursor: 'pointer'
        }}
      >
        {allCollapsed ? 'Expandir todo' : 'Colapsar todo'}
      </a>
    </div>
  );
});

export default {
  StatusChip,
  ProgressBar,
  HistoryList,
  EvidenceList,
  ListHeader,
  ActivityRowCollapsed,
  ActivityRowExpanded,
  ListTabs
};
