/**
 * InlineDefectDetailModal - Modal de detalle de defecto para reparación/liberación en línea
 * Muestra detalle del defecto y permite acciones según rol:
 * - REPAIR: puede marcar como REPAIRED si está OPEN
 * - INSPECTOR: puede LIBERAR o RECHAZAR si está REPAIRED
 */

import React, { useState } from 'react';
import { X, Wrench, CheckCircle, XCircle, AlertCircle, Clock, User, MapPin } from 'lucide-react';

const InlineDefectDetailModal = ({
  isOpen,
  onClose,
  defect,
  permissions = {},
  stationId,
  stationName,
  onRepair,
  onRelease,
  onReject,
  theme
}) => {
  const [loading, setLoading] = useState(false);
  const [repairNotes, setRepairNotes] = useState('');
  const [error, setError] = useState(null);

  const t = theme || {
    bg: '#ffffff',
    bgCard: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb'
  };

  if (!isOpen || !defect) return null;

  const statusConfig = {
    OPEN: { color: '#ef4444', bgColor: '#fef2f2', label: 'Abierto', icon: AlertCircle },
    REPAIRED: { color: '#f59e0b', bgColor: '#fffbeb', label: 'Reparado', icon: Clock },
    RELEASED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle },
    CLOSED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle }
  };

  const config = statusConfig[defect.repairStatus] || statusConfig.OPEN;
  const StatusIcon = config.icon;

  // Permisos
  const canRepair = permissions.canRepair && defect.repairStatus === 'OPEN';
  const canRelease = permissions.canRelease && defect.repairStatus === 'REPAIRED';

  const handleRepair = async () => {
    if (!onRepair) return;
    setLoading(true);
    setError(null);
    try {
      await onRepair(defect.id, {
        repairStationId: stationId,
        repairNotes: repairNotes.trim() || null
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al reparar');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!onRelease) return;
    setLoading(true);
    setError(null);
    try {
      await onRelease(defect.id, {
        releaseStationId: stationId,
        releaseNotes: repairNotes.trim() || null
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al liberar');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setLoading(true);
    setError(null);
    try {
      await onReject(defect.id, {
        rejectNotes: repairNotes.trim() || 'Rechazado en inspección'
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al rechazar');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        maxWidth: '480px',
        maxHeight: '90vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusIcon size={24} color={config.color} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>
                {defect.defectCode || defect.defectName || 'Defecto'}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '500',
                color: config.color,
                backgroundColor: config.bgColor,
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                marginTop: '4px'
              }}>
                {config.label}
              </div>
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

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
          {/* Detalles de captura */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
              CAPTURA
            </div>
            <div style={{
              backgroundColor: t.bgCard,
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <MapPin size={14} color={t.textMuted} />
                <span style={{ fontSize: '13px', color: t.text }}>
                  {defect.captureStationName || 'Estación desconocida'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={14} color={t.textMuted} />
                <span style={{ fontSize: '13px', color: t.text }}>
                  {defect.capturedByName || 'Inspector desconocido'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>
                {formatDate(defect.createdAt)}
              </div>
            </div>
          </div>

          {/* Detalles de reparación (si existe) */}
          {defect.repairStatus !== 'OPEN' && defect.repairedByName && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                REPARACION
              </div>
              <div style={{
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={14} color="#f59e0b" />
                  <span style={{ fontSize: '13px', color: t.text }}>
                    {defect.repairStationName || 'Estación desconocida'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={14} color="#f59e0b" />
                  <span style={{ fontSize: '13px', color: t.text }}>
                    {defect.repairedByName || 'Reparador desconocido'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>
                  {formatDate(defect.repairedAt)}
                </div>
              </div>
            </div>
          )}

          {/* Detalles de liberación (si existe) */}
          {['RELEASED', 'CLOSED'].includes(defect.repairStatus) && defect.releasedByName && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                LIBERACION
              </div>
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={14} color="#22c55e" />
                  <span style={{ fontSize: '13px', color: t.text }}>
                    {defect.releaseStationName || 'Estación desconocida'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={14} color="#22c55e" />
                  <span style={{ fontSize: '13px', color: t.text }}>
                    {defect.releasedByName || 'Liberador desconocido'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>
                  {formatDate(defect.releasedAt)}
                </div>
              </div>
            </div>
          )}

          {/* Notas (para reparar/liberar) */}
          {(canRepair || canRelease) && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px', display: 'block' }}>
                NOTAS (opcional)
              </label>
              <textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder={canRepair ? 'Notas de reparación...' : 'Notas de liberación...'}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  fontSize: '13px',
                  resize: 'none',
                  minHeight: '60px',
                  backgroundColor: t.bg
                }}
              />
            </div>
          )}

          {/* Estación actual */}
          {stationName && (canRepair || canRelease) && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '500' }}>
                Estación actual: {stationName}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#dc2626' }}>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
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

          {/* Botón Rechazar (solo si puede liberar) */}
          {canRelease && onReject && (
            <button
              onClick={handleReject}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <XCircle size={16} />
              Rechazar
            </button>
          )}

          {/* Botón Reparar */}
          {canRepair && onRepair && (
            <button
              onClick={handleRepair}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f59e0b',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Wrench size={16} />
              {loading ? 'Guardando...' : 'Reparar'}
            </button>
          )}

          {/* Botón Liberar */}
          {canRelease && onRelease && (
            <button
              onClick={handleRelease}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} />
              {loading ? 'Guardando...' : 'Liberar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineDefectDetailModal;
