/**
 * SerialDefectsSummary - Semáforo compacto de defectos por serial
 * Solo muestra contadores, clic abre modal con lista completa
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

const SerialDefectsSummary = ({
  counts = { open: 0, repaired: 0, released: 0, total: 0 },
  onClick,
  theme
}) => {
  const t = theme || {
    bg: '#ffffff',
    bgCard: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb'
  };

  // Sin defectos - no mostrar nada
  if (counts.total === 0) {
    return null;
  }

  // Determinar color de fondo según estado
  const hasPending = counts.open > 0;
  const hasRepaired = counts.repaired > 0 && counts.open === 0;

  let bgColor = '#f0fdf4'; // verde por defecto
  let borderColor = '#bbf7d0';

  if (hasPending) {
    bgColor = '#fef2f2';
    borderColor = '#fecaca';
  } else if (hasRepaired) {
    bgColor = '#fffbeb';
    borderColor = '#fde68a';
  }

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        backgroundColor: bgColor,
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.15s'
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
    >
      {/* Semáforo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Abiertos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ef4444'
          }} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
            {counts.open}
          </span>
        </div>

        {/* Reparados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#f59e0b'
          }} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>
            {counts.repaired}
          </span>
        </div>

        {/* Liberados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#22c55e'
          }} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>
            {counts.released}
          </span>
        </div>

        {/* Total */}
        <span style={{ fontSize: '12px', color: t.textMuted }}>
          ({counts.total} total)
        </span>
      </div>

      {/* Indicador clickeable */}
      {onClick && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>
            Ver
          </span>
          <ChevronRight size={16} color="#3b82f6" />
        </div>
      )}
    </div>
  );
};

export default SerialDefectsSummary;
