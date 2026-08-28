/**
 * D6 Visual Components - Pure presentation components
 * Receives data, callbacks and theme via props. No state or fetch.
 */
import React from 'react';

// ─────────────────────────────────────────────────────────────
// Status Chip - Dot + text with tinted background
// ─────────────────────────────────────────────────────────────
export const StatusChip = ({ status, t, language = 'es' }) => {
  const statusConfig = {
    completed: {
      label: language === 'es' ? 'Completado' : 'Completed',
      bg: t.successBg, border: t.successBorder, fg: t.successFg, dot: t.success
    },
    on_track: {
      label: language === 'es' ? 'En curso' : 'On track',
      bg: t.accentBg, border: t.accentBorder, fg: t.accentFg, dot: t.accent
    },
    at_risk: {
      label: language === 'es' ? 'En riesgo' : 'At risk',
      bg: t.warningBg, border: t.warningBorder, fg: t.warningFg, dot: t.warning
    },
    delayed: {
      label: language === 'es' ? 'Atrasado' : 'Delayed',
      bg: t.errorBg, border: t.errorBorder, fg: t.errorFg, dot: t.error
    },
    pending: {
      label: language === 'es' ? 'Pendiente' : 'Pending',
      bg: t.bgPanel, border: t.border, fg: t.textMuted, dot: t.textMuted
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      backgroundColor: config.bg,
      border: `1px solid ${config.border}`,
      color: config.fg,
      whiteSpace: 'nowrap'
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: config.dot
      }} />
      {config.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Progress Bar - Single bar with expected marker
// ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ actual, expected, status, t, width = 120 }) => {
  const statusColors = {
    completed: t.success,
    on_track: t.accent,
    at_risk: t.warning,
    delayed: t.error,
    pending: t.textMuted
  };

  const fillColor = statusColors[status] || t.textMuted;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width,
        height: 6,
        backgroundColor: t.bgPanel,
        borderRadius: 3,
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Actual progress fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${Math.min(100, actual)}%`,
          backgroundColor: fillColor,
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
        {/* Expected marker */}
        {expected > 0 && expected < 100 && (
          <div style={{
            position: 'absolute',
            left: `${expected}%`,
            top: -2,
            width: 1,
            height: 10,
            backgroundColor: t.textMuted
          }} />
        )}
      </div>
      {/* Percentage text */}
      <span style={{
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        color: t.textMuted,
        minWidth: 70,
        whiteSpace: 'nowrap'
      }}>
        {actual}% / {expected}%
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Priority Indicator - Vertical bar 3px
// ─────────────────────────────────────────────────────────────
export const PriorityBar = ({ priority, t }) => {
  const p = String(priority || '').toLowerCase();
  const colors = {
    alta: t.error, high: t.error,
    media: t.warning, medium: t.warning,
    baja: t.border, low: t.border
  };
  return (
    <div style={{
      width: 3,
      height: 28,
      borderRadius: 2,
      backgroundColor: colors[p] || t.border
    }} />
  );
};

// ─────────────────────────────────────────────────────────────
// Workload Badge - Small chip indicating linked to Workload
// ─────────────────────────────────────────────────────────────
export const WorkloadBadge = ({ t }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    backgroundColor: t.accentBg,
    border: `1px solid ${t.accentBorder}`,
    color: t.accentFg
  }}>
    WL
  </span>
);

// ─────────────────────────────────────────────────────────────
// Action Table Header
// ─────────────────────────────────────────────────────────────
export const ActionTableHeader = ({ t, language = 'es' }) => {
  const headers = [
    { key: 'action', label: language === 'es' ? 'Accion' : 'Action', flex: 3 },
    { key: 'responsible', label: language === 'es' ? 'Responsable' : 'Responsible', flex: 1.5 },
    { key: 'dates', label: language === 'es' ? 'Inicio/Fin' : 'Start/End', flex: 1.2 },
    { key: 'progress', label: language === 'es' ? 'Avance' : 'Progress', flex: 1.8 },
    { key: 'status', label: language === 'es' ? 'Estado' : 'Status', flex: 1 }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 30,
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`,
      paddingLeft: 43,
      paddingRight: 16
    }}>
      {headers.map(h => (
        <div key={h.key} style={{
          flex: h.flex,
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: t.textDim,
          paddingRight: 12,
          whiteSpace: 'nowrap'
        }}>
          {h.label}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Action Table Row
// ─────────────────────────────────────────────────────────────
export const ActionTableRow = ({
  action,
  isExpanded,
  onToggle,
  users,
  calcPlanned,
  t,
  language = 'es'
}) => {
  const responsible = users.find(u => u.id === action.responsible);
  const responsibleName = responsible
    ? `${responsible.firstName || responsible.first_name} ${responsible.lastName || responsible.last_name}`
    : (language === 'es' ? 'Sin asignar' : 'Unassigned');

  const actual = action.actualProgress || 0;
  const expected = calcPlanned(action.startDate, action.endDate);

  // Determine status - evaluate pending first
  let status = 'pending';
  if (actual >= 100) {
    status = 'completed';
  } else if (actual === 0 && expected === 0) {
    status = 'pending';
  } else if (actual >= expected - 5) {
    status = 'on_track';
  } else if (actual >= expected - 20) {
    status = 'at_risk';
  } else if (expected > 0 && actual < expected - 20) {
    status = 'delayed';
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  return (
    <div style={{
      borderBottom: `1px solid ${t.line}`,
      backgroundColor: isExpanded ? t.hover : 'transparent',
      transition: 'background-color 0.15s ease'
    }}>
      {/* Main Row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 44,
          paddingLeft: 8,
          paddingRight: 16,
          cursor: 'pointer'
        }}
      >
        {/* Chevron */}
        <div style={{
          width: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: t.textMuted,
          fontSize: 12,
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
        }}>
          ▶
        </div>

        {/* Priority bar */}
        <div style={{ marginRight: 8 }}>
          <PriorityBar priority={action.priority} t={t} />
        </div>

        {/* Action text */}
        <div style={{
          flex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingRight: 12,
          overflow: 'hidden'
        }}>
          <span style={{
            fontSize: 13,
            color: t.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {action.action}
          </span>
          {action.workloadActivityId && <WorkloadBadge t={t} />}
        </div>

        {/* Responsible */}
        <div style={{
          flex: 1.5,
          fontSize: 12,
          color: responsible ? t.text : t.textMuted,
          paddingRight: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {responsibleName}
        </div>

        {/* Dates */}
        <div style={{
          flex: 1.2,
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: t.textMuted,
          paddingRight: 12,
          whiteSpace: 'nowrap'
        }}>
          {formatDate(action.startDate)} - {formatDate(action.endDate)}
        </div>

        {/* Progress */}
        <div style={{ flex: 1.8, paddingRight: 12 }}>
          <ProgressBar actual={actual} expected={expected} status={status} t={t} />
        </div>

        {/* Status */}
        <div style={{ flex: 1 }}>
          <StatusChip status={status} t={t} language={language} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Expanded Row Content - Two column grid
// ─────────────────────────────────────────────────────────────
export const ExpandedRowContent = ({
  action,
  dailyEntry,
  onDailyEntryChange,
  onAddDailyProgress,
  onProgressChange,
  onRemoveAction,
  onFileUpload,
  onFileRemove,
  onWorkloadDownload,
  isReadOnly,
  t,
  language = 'es',
  collapsedHistory,
  onToggleHistory
}) => {
  const isHistoryCollapsed = collapsedHistory[action.id] ?? false;
  const dailyProgress = action.dailyProgress || [];

  // Calculate accumulated progress
  const getAccumulated = (index) => {
    let acc = 0;
    for (let i = 0; i <= index; i++) {
      acc += (dailyProgress[i]?.progress || 0);
    }
    return Math.min(100, acc);
  };

  const formatDateMono = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: '2-digit'
    });
  };

  return (
    <div style={{
      padding: '16px 16px 16px 40px',
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 24
      }}>
        {/* Left Column: Goal + Expected Result + Progress Input */}
        <div>
          {/* Goal */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: t.textDim,
              marginBottom: 6
            }}>
              {language === 'es' ? 'META' : 'GOAL'}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr',
              gap: '4px 12px',
              fontSize: 13,
              color: t.text
            }}>
              <span style={{ color: t.textMuted }}>{language === 'es' ? 'Accion:' : 'Action:'}</span>
              <span>{action.action || '-'}</span>
              <span style={{ color: t.textMuted }}>{language === 'es' ? 'Resultado:' : 'Result:'}</span>
              <span>{action.result || '-'}</span>
            </div>
          </div>

          {/* Progress Input */}
          {!isReadOnly && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px',
              backgroundColor: t.bgPanel,
              borderRadius: 6,
              border: `1px solid ${t.border}`
            }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>
                {language === 'es' ? 'Avance actual:' : 'Current progress:'}
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={action.actualProgress || 0}
                onChange={(e) => onProgressChange(action.id, parseInt(e.target.value) || 0)}
                style={{
                  width: 60,
                  padding: '6px 8px',
                  fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace",
                  border: `1px solid ${t.border}`,
                  borderRadius: 4,
                  backgroundColor: t.field,
                  color: t.text,
                  textAlign: 'center'
                }}
              />
              <span style={{ fontSize: 12, color: t.textMuted }}>%</span>
            </div>
          )}

          {/* Evidence Files */}
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: t.textDim,
              marginBottom: 8
            }}>
              {language === 'es' ? 'EVIDENCIA' : 'EVIDENCE'} ({(action.evidenceFiles || []).length})
            </div>

            {(action.evidenceFiles || []).map((file, idx) => {
              const fileName = file.name || file.originalName || 'Archivo';
              const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : '';
              const isWorkload = file.workloadFileId || file.source === 'workload';
              const fileSize = file.size ? (file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`) : '';
              const fileDate = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '';

              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  marginBottom: 4,
                  backgroundColor: t.bgPanel,
                  borderRadius: 4,
                  border: `1px solid ${t.line}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
                    {/* Chip WL para Workload - usa WorkloadBadge para consistencia */}
                    {isWorkload && <WorkloadBadge t={t} />}
                    {/* Extension chip */}
                    {ext && (
                      <span style={{
                        fontSize: 9,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: t.textMuted,
                        backgroundColor: t.field,
                        padding: '2px 4px',
                        borderRadius: 2,
                        flexShrink: 0
                      }}>{ext}</span>
                    )}
                    <span style={{ fontSize: 12, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileName}
                    </span>
                    {/* Size and date */}
                    <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: t.textDim, flexShrink: 0 }}>
                      {fileSize}{fileSize && fileDate ? ' · ' : ''}{fileDate}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {isWorkload && (
                      <button
                        onClick={() => onWorkloadDownload(file)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11,
                          backgroundColor: 'transparent',
                          border: `1px solid ${t.border}`,
                          borderRadius: 3,
                          color: t.accent,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'es' ? 'Descargar' : 'Download'}
                      </button>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={() => onFileRemove(action.id, idx)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11,
                          backgroundColor: 'transparent',
                          border: `1px solid ${t.errorBorder}`,
                          borderRadius: 3,
                          color: t.errorFg,
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {!isReadOnly && (
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                color: t.accent,
                cursor: 'pointer',
                marginTop: 4
              }}>
                <input
                  type="file"
                  multiple
                  onChange={(e) => onFileUpload(action.id, Array.from(e.target.files))}
                  style={{ display: 'none' }}
                />
                + {language === 'es' ? 'Agregar archivo' : 'Add file'}
              </label>
            )}
          </div>
        </div>

        {/* Right Column: Activity History */}
        <div>
          <div
            onClick={() => onToggleHistory(action.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginBottom: 8
            }}
          >
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: t.textDim
            }}>
              {language === 'es' ? 'HISTORIAL DE ACTIVIDADES' : 'ACTIVITY HISTORY'} ({dailyProgress.length})
            </div>
            <span style={{ fontSize: 12, color: t.textMuted }}>
              {isHistoryCollapsed ? '▼' : '▲'}
            </span>
          </div>

          {!isHistoryCollapsed && (
            <>
              {dailyProgress.length === 0 ? (
                <div style={{ fontSize: 12, color: t.textMuted, fontStyle: 'italic' }}>
                  {language === 'es' ? 'Sin actividades registradas' : 'No activities recorded'}
                </div>
              ) : (
                <div style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: `1px solid ${t.line}`,
                  borderRadius: 4
                }}>
                  {dailyProgress.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '8px 10px',
                      borderBottom: idx < dailyProgress.length - 1 ? `1px solid ${t.line}` : 'none',
                      fontSize: 12
                    }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: t.textMuted,
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDateMono(entry.date)}
                      </span>
                      <span style={{ flex: 1, color: t.text }}>
                        {entry.activities || '-'}
                      </span>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: t.accent,
                        whiteSpace: 'nowrap'
                      }}>
                        +{entry.progress}% → {getAccumulated(idx)}%
                      </span>
                    </div>
                  ))}
                  {/* Accumulated total */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: t.bgPanel,
                    fontWeight: 500,
                    fontSize: 12
                  }}>
                    <span style={{ color: t.textMuted }}>
                      {language === 'es' ? 'Acumulado' : 'Accumulated'}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: t.text
                    }}>
                      {action.actualProgress || 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Add activity link */}
              {!isReadOnly && (
                <div style={{ marginTop: 12 }}>
                  {dailyEntry ? (
                    <div style={{
                      padding: 12,
                      backgroundColor: t.bgPanel,
                      borderRadius: 6,
                      border: `1px solid ${t.border}`
                    }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                        <input
                          type="date"
                          value={dailyEntry.date || ''}
                          onChange={(e) => onDailyEntryChange(action.id, 'date', e.target.value)}
                          style={{
                            padding: '6px 8px',
                            fontSize: 12,
                            border: `1px solid ${t.border}`,
                            borderRadius: 4,
                            backgroundColor: t.field,
                            color: t.text
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={dailyEntry.progress || ''}
                          onChange={(e) => onDailyEntryChange(action.id, 'progress', parseInt(e.target.value) || 0)}
                          style={{
                            width: 60,
                            padding: '6px 8px',
                            fontSize: 12,
                            fontFamily: "'IBM Plex Mono', monospace",
                            border: `1px solid ${t.border}`,
                            borderRadius: 4,
                            backgroundColor: t.field,
                            color: t.text,
                            textAlign: 'center'
                          }}
                        />
                      </div>
                      <textarea
                        placeholder={language === 'es' ? 'Actividades realizadas...' : 'Activities performed...'}
                        value={dailyEntry.activities || ''}
                        onChange={(e) => onDailyEntryChange(action.id, 'activities', e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: 12,
                          border: `1px solid ${t.border}`,
                          borderRadius: 4,
                          backgroundColor: t.field,
                          color: t.text,
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        onClick={() => onAddDailyProgress(action.id)}
                        style={{
                          marginTop: 8,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 500,
                          backgroundColor: t.primary,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'es' ? 'Registrar' : 'Record'}
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => onDailyEntryChange(action.id, 'init', true)}
                      style={{
                        fontSize: 12,
                        color: t.accent,
                        cursor: 'pointer'
                      }}
                    >
                      + {language === 'es' ? 'Registrar actividad' : 'Record activity'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Delete action button */}
          {!isReadOnly && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button
                onClick={() => onRemoveAction(action.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  backgroundColor: 'transparent',
                  border: `1px solid ${t.errorBorder}`,
                  borderRadius: 4,
                  color: t.errorFg,
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Eliminar accion' : 'Delete action'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Root Cause Quote - Left border style
// ─────────────────────────────────────────────────────────────
export const RootCauseCard = ({ text, t, language = 'es' }) => (
  <div style={{
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: 16
  }}>
    <div style={{
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: t.textDim,
      marginBottom: 10
    }}>
      {language === 'es' ? 'CAUSA RAIZ (D4)' : 'ROOT CAUSE (D4)'}
    </div>
    <div style={{
      borderLeft: `2px solid ${t.warning}`,
      paddingLeft: 12,
      fontSize: 13,
      color: t.text,
      lineHeight: 1.5
    }}>
      {text || (language === 'es' ? 'Sin definir' : 'Not defined')}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Countermeasure Description Card
// ─────────────────────────────────────────────────────────────
export const CountermeasureCard = ({ text, onChange, isReadOnly, t, language = 'es' }) => (
  <div style={{
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: 16
  }}>
    <div style={{
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: t.textDim,
      marginBottom: 10
    }}>
      {language === 'es' ? 'CONTRAMEDIDA DEFINITIVA' : 'DEFINITIVE COUNTERMEASURE'}
    </div>
    <textarea
      value={text || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isReadOnly}
      placeholder={language === 'es' ? 'Describe la contramedida definitiva...' : 'Describe the definitive countermeasure...'}
      rows={3}
      style={{
        width: '100%',
        padding: 12,
        fontSize: 13,
        border: `1px solid ${t.border}`,
        borderRadius: 6,
        backgroundColor: isReadOnly ? t.bgPanel : t.field,
        color: t.text,
        resize: 'vertical',
        boxSizing: 'border-box',
        lineHeight: 1.5
      }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────
// Section Title - Micro title style
// ─────────────────────────────────────────────────────────────
export const SectionTitle = ({ children, t }) => (
  <div style={{
    fontSize: 10.5,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: t.textDim,
    marginBottom: 12,
    whiteSpace: 'nowrap'
  }}>
    {children}
  </div>
);

export default {
  StatusChip,
  ProgressBar,
  PriorityBar,
  WorkloadBadge,
  ActionTableHeader,
  ActionTableRow,
  ExpandedRowContent,
  RootCauseCard,
  CountermeasureCard,
  SectionTitle
};
