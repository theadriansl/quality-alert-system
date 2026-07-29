/**
 * SerialDefectsSummary - Resumen visual de defectos por serial
 * Muestra semáforo de estados y lista compacta con acciones según rol
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, ChevronRight } from 'lucide-react';

const SerialDefectsSummary = ({
  defects = [],
  counts = { open: 0, repaired: 0, released: 0, total: 0 },
  onDefectClick,
  onViewAll,
  maxVisible = 3,
  theme,
  permissions = {}
}) => {
  const t = theme || {
    bg: '#ffffff',
    bgCard: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb'
  };

  // Estados con colores semáforo
  const statusConfig = {
    OPEN: { color: '#ef4444', bgColor: '#fef2f2', label: 'Abierto', icon: AlertCircle },
    REPAIRED: { color: '#f59e0b', bgColor: '#fffbeb', label: 'Reparado', icon: Clock },
    RELEASED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle },
    CLOSED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle }
  };

  const getStatusConfig = (status) => {
    return statusConfig[status] || statusConfig.OPEN;
  };

  // Si no hay defectos
  if (counts.total === 0) {
    return (
      <div style={{
        padding: '12px',
        backgroundColor: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <CheckCircle size={18} color="#22c55e" />
        <span style={{ color: '#166534', fontWeight: '500', fontSize: '13px' }}>
          0 defectos
        </span>
      </div>
    );
  }

  // Defectos visibles (limitados)
  const visibleDefects = defects.slice(0, maxVisible);
  const hasMore = defects.length > maxVisible;

  return (
    <div style={{
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    }}>
      {/* Header con contadores semáforo */}
      <div style={{
        padding: '10px 12px',
        backgroundColor: t.bg,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>
          Defectos
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Contador rojo - Abiertos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>
              {counts.open}
            </span>
          </div>
          {/* Contador amarillo - Reparados */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b'
            }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b' }}>
              {counts.repaired}
            </span>
          </div>
          {/* Contador verde - Liberados */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#22c55e'
            }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e' }}>
              {counts.released}
            </span>
          </div>
          {/* Total */}
          <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '4px' }}>
            | {counts.total}
          </span>
        </div>
      </div>

      {/* Lista de defectos */}
      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
        {visibleDefects.map((defect, index) => {
          const config = getStatusConfig(defect.repairStatus);
          const StatusIcon = config.icon;

          return (
            <div
              key={defect.id || index}
              onClick={() => onDefectClick && onDefectClick(defect)}
              style={{
                padding: '10px 12px',
                borderBottom: index < visibleDefects.length - 1 ? `1px solid ${t.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: onDefectClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                if (onDefectClick) e.currentTarget.style.backgroundColor = t.bgCard;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Indicador de estado */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: config.color,
                flexShrink: 0
              }} />

              {/* Info del defecto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {defect.defectCode || defect.defectName || 'Defecto'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: t.textMuted,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {defect.captureStationName || 'Est. desconocida'}
                </div>
              </div>

              {/* Estado badge */}
              <div style={{
                fontSize: '10px',
                fontWeight: '500',
                color: config.color,
                backgroundColor: config.bgColor,
                padding: '2px 6px',
                borderRadius: '4px',
                flexShrink: 0
              }}>
                {config.label}
              </div>

              {/* Flecha si es clickeable */}
              {onDefectClick && (
                <ChevronRight size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Ver todos */}
      {hasMore && onViewAll && (
        <div
          onClick={onViewAll}
          style={{
            padding: '10px 12px',
            borderTop: `1px solid ${t.border}`,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: t.bg,
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgCard}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bg}
        >
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>
            Ver todos ({counts.total})
          </span>
        </div>
      )}
    </div>
  );
};

export default SerialDefectsSummary;
