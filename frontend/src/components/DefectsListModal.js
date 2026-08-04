/**
 * DefectsListModal - Modal con lista de defectos del serial
 * Etapa 1 del flujo de 2 etapas: Lista → Detalle
 */

import React from 'react';
import { X, AlertCircle, Clock, CheckCircle, ChevronRight } from 'lucide-react';

const DefectsListModal = ({
  isOpen,
  onClose,
  defects = [],
  counts = { open: 0, repaired: 0, released: 0, total: 0 },
  serialNumber,
  onDefectClick,
  theme
}) => {
  const t = theme || {
    bg: '#ffffff',
    bgCard: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb'
  };

  if (!isOpen) return null;

  const statusConfig = {
    OPEN: { color: '#ef4444', bgColor: '#fef2f2', label: 'Abierto', icon: AlertCircle },
    QUARANTINE: { color: '#8b5cf6', bgColor: '#f5f3ff', label: 'Cuarentena', icon: AlertCircle },
    REPAIRED: { color: '#f59e0b', bgColor: '#fffbeb', label: 'Reparado', icon: Clock },
    RELEASED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle },
    CLOSED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle }
  };

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.OPEN;

  const handleDefectSelect = (defect) => {
    if (onDefectClick) {
      onDefectClick(defect);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: t.bg,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '420px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>
              Defectos del Serial
            </div>
            <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>
              {serialNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} color={t.textMuted} />
          </button>
        </div>

        {/* Semáforo resumen */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: t.bgCard,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'center',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>{counts.open}</span>
            <span style={{ fontSize: '12px', color: t.textMuted }}>Abiertos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>{counts.repaired}</span>
            <span style={{ fontSize: '12px', color: t.textMuted }}>Reparados</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>{counts.released}</span>
            <span style={{ fontSize: '12px', color: t.textMuted }}>Liberados</span>
          </div>
        </div>

        {/* Lista de defectos */}
        <div style={{ maxHeight: 'calc(80vh - 180px)', overflowY: 'auto' }}>
          {defects.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: t.textMuted
            }}>
              No hay defectos registrados
            </div>
          ) : (
            defects.map((defect, index) => {
              const config = getStatusConfig(defect.repairStatus);
              return (
                <div
                  key={defect.id || index}
                  onClick={() => handleDefectSelect(defect)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: index < defects.length - 1 ? `1px solid ${t.border}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgCard}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Indicador de estado */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: config.color,
                    flexShrink: 0
                  }} />

                  {/* Info del defecto */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: t.text,
                      marginBottom: '2px'
                    }}>
                      {defect.defectCode ? `[${defect.defectCode}] ` : ''}{defect.defectName || 'Defecto'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: t.textMuted,
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span>{defect.captureStationName || 'Sin estación'}</span>
                      {defect.categoryName && (
                        <>
                          <span>•</span>
                          <span>{defect.categoryName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge estado */}
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: config.color,
                    backgroundColor: config.bgColor,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}>
                    {config.label}
                  </div>

                  <ChevronRight size={18} color={t.textMuted} style={{ flexShrink: 0 }} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${t.border}`,
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: `1px solid ${t.border}`,
              backgroundColor: t.bg,
              color: t.text,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefectsListModal;
