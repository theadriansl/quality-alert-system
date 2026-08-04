/**
 * InlineDefectDetailModal - Modal de detalle de defecto para reparación/liberación en línea
 * Muestra detalle del defecto y permite acciones según rol:
 * - REPAIR: puede marcar como REPAIRED si está OPEN
 * - INSPECTOR: puede LIBERAR o RECHAZAR si está REPAIRED
 */

import React, { useState } from 'react';
import { X, Wrench, CheckCircle, XCircle, AlertCircle, Clock, User, MapPin, Image, FileText, Tag, AlertTriangle } from 'lucide-react';

const API_URL = 'http://localhost:5000';

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
    QUARANTINE: { color: '#8b5cf6', bgColor: '#f5f3ff', label: 'Cuarentena', icon: AlertCircle },
    REPAIRED: { color: '#f59e0b', bgColor: '#fffbeb', label: 'Reparado', icon: Clock },
    RELEASED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle },
    CLOSED: { color: '#22c55e', bgColor: '#f0fdf4', label: 'Liberado', icon: CheckCircle }
  };

  const config = statusConfig[defect.repairStatus] || statusConfig.OPEN;
  const StatusIcon = config.icon;

  // Permisos - verificar si es admin desde localStorage como fallback
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = permissions.canRepair || permissions.canRelease || permissions.isHospitalAdmin ||
    user.systemRole === 'admin' || user.role === 'admin' || user.roleName === 'Administrador' ||
    user.clearanceLevel >= 100;

  const canRepair = (permissions.canRepair || isAdmin) && defect.repairStatus === 'OPEN';
  const canRelease = (permissions.canRelease || isAdmin) && defect.repairStatus === 'REPAIRED';

  const handleRepair = async () => {
    if (!onRepair) return;
    if (!stationId) {
      setError('Selecciona una estación en el encabezado antes de reparar');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onRepair(defect.id, {
        repairStationId: stationId,
        repairNotes: repairNotes.trim() || null
      });
      // Cerrar modal - DefectCapture recargará los datos
      onClose();
    } catch (err) {
      setError(err.message || 'Error al reparar');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!onRelease) return;
    if (!stationId) {
      setError('Selecciona una estación en el encabezado antes de liberar');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onRelease(defect.id, {
        releaseStationId: stationId,
        releaseNotes: repairNotes.trim() || null
      });
      // Cerrar modal - DefectCapture recargará los datos
      onClose();
    } catch (err) {
      // Mostrar mensaje más claro si ya está cerrado
      if (err.message && err.message.includes('CLOSED')) {
        setError('Este defecto ya fue liberado. Refresca la página para ver el estado actual.');
      } else {
        setError(err.message || 'Error al liberar');
      }
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

          {/* Detalles del defecto */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
              DETALLE DEL DEFECTO
            </div>
            <div style={{
              backgroundColor: t.bgCard,
              borderRadius: '8px',
              padding: '12px'
            }}>
              {/* Nombre completo del defecto */}
              <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {defect.defectCode && <span style={{ color: t.textMuted }}>[{defect.defectCode}]</span>} {defect.defectName || 'Sin nombre'}
              </div>

              {/* Categoría y Severidad */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {defect.categoryName && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: defect.categoryColor || '#e5e7eb',
                    color: '#fff',
                    fontWeight: '500'
                  }}>
                    {defect.categoryName}
                  </span>
                )}
                {defect.severityName && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: defect.severityColor || '#f59e0b',
                    color: '#fff',
                    fontWeight: '500'
                  }}>
                    {defect.severityName}
                  </span>
                )}
                {defect.quantity > 1 && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    fontWeight: '500'
                  }}>
                    Cantidad: {defect.quantity}
                  </span>
                )}
              </div>

              {/* Disposición */}
              {defect.dispositionName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Tag size={12} color={t.textMuted} />
                  <span style={{ fontSize: '12px', color: t.text }}>
                    Disposición: {defect.dispositionName}
                  </span>
                </div>
              )}

              {/* Tiempo de paro */}
              {defect.downtimeMinutes > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle size={12} color="#ef4444" />
                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                    Paro de línea: {defect.downtimeMinutes} min
                  </span>
                </div>
              )}

              {/* Notas originales */}
              {defect.notes && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: t.bg,
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`
                }}>
                  <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                    <FileText size={10} style={{ display: 'inline', marginRight: '4px' }} />
                    Notas de captura:
                  </div>
                  <div style={{ fontSize: '12px', color: t.text, whiteSpace: 'pre-wrap' }}>
                    {defect.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fotos/Attachments */}
          {defect.attachments && defect.attachments.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                <Image size={12} style={{ display: 'inline', marginRight: '4px' }} />
                EVIDENCIA ({defect.attachments.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '8px'
              }}>
                {defect.attachments.map((att, idx) => (
                  <a
                    key={att.id || idx}
                    href={`${API_URL}/uploads/defect-attachments/${att.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      aspectRatio: '1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgCard
                    }}
                  >
                    {att.mimetype?.startsWith('image/') ? (
                      <img
                        src={`${API_URL}/uploads/defect-attachments/${att.filename}`}
                        alt={att.originalName || 'Evidencia'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        padding: '8px'
                      }}>
                        <FileText size={24} color={t.textMuted} />
                        <span style={{ fontSize: '9px', color: t.textMuted, marginTop: '4px', textAlign: 'center', wordBreak: 'break-all' }}>
                          {att.originalName?.slice(0, 15) || 'Archivo'}
                        </span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si ya está cerrado */}
          {['CLOSED', 'RELEASED'].includes(defect.repairStatus) && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid #bbf7d0',
              textAlign: 'center'
            }}>
              <CheckCircle size={24} color="#22c55e" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                Defecto Cerrado
              </div>
              <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
                Este defecto ya fue reparado y liberado.
              </div>
            </div>
          )}

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
                <span style={{ fontSize: '13px', color: defect.captureStationName ? t.text : '#9ca3af' }}>
                  {defect.captureStationName || '(No registrada)'}
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

          {/* Detalles de reparación (solo si fue reparado) */}
          {['REPAIRED', 'RELEASED', 'CLOSED'].includes(defect.repairStatus) && (
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
                  <span style={{ fontSize: '13px', color: defect.repairStationName ? t.text : '#9ca3af' }}>
                    {defect.repairStationName || '(No registrada)'}
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
                {/* Notas de reparación */}
                {defect.repairNotes && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#92400e'
                  }}>
                    {defect.repairNotes}
                  </div>
                )}
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
                  <span style={{ fontSize: '13px', color: defect.releaseStationName ? t.text : '#9ca3af' }}>
                    {defect.releaseStationName || '(No registrada)'}
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
                {/* Notas de liberación */}
                {defect.resolutionNotes && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#166534'
                  }}>
                    {defect.resolutionNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas (para reparar/liberar) */}
          {(['OPEN', 'QUARANTINE'].includes(defect.repairStatus) || defect.repairStatus === 'REPAIRED') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px', display: 'block' }}>
                NOTAS DE REPARACIÓN
              </label>
              <textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder={['OPEN', 'QUARANTINE'].includes(defect.repairStatus) ? 'Describe la reparación realizada...' : 'Notas de liberación...'}
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

          {/* Estación donde se realizará la acción */}
          {(['OPEN', 'QUARANTINE', 'REPAIRED'].includes(defect.repairStatus)) && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: stationId ? '#eff6ff' : '#fef2f2',
              borderRadius: '8px',
              border: `1px solid ${stationId ? '#bfdbfe' : '#fecaca'}`,
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', color: stationId ? '#3b82f6' : '#dc2626', fontWeight: '500' }}>
                {stationId
                  ? `Estación seleccionada: ${stationName}`
                  : '⚠️ Selecciona una estación en el encabezado para continuar'}
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

          {/* Botón Reparar - mostrar si defecto está OPEN o QUARANTINE */}
          {['OPEN', 'QUARANTINE'].includes(defect.repairStatus) && onRepair && (
            <button
              onClick={handleRepair}
              disabled={loading || !stationId}
              title={!stationId ? 'Selecciona una estación primero' : ''}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !stationId ? '#9ca3af' : '#f59e0b',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (loading || !stationId) ? 'not-allowed' : 'pointer',
                opacity: (loading || !stationId) ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Wrench size={16} />
              {loading ? 'Guardando...' : !stationId ? 'Selecciona Estación' : 'Reparar'}
            </button>
          )}

          {/* Botón Liberar - mostrar si defecto está REPAIRED */}
          {defect.repairStatus === 'REPAIRED' && onRelease && (
            <button
              onClick={handleRelease}
              disabled={loading || !stationId}
              title={!stationId ? 'Selecciona una estación primero' : ''}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !stationId ? '#9ca3af' : '#22c55e',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (loading || !stationId) ? 'not-allowed' : 'pointer',
                opacity: (loading || !stationId) ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} />
              {loading ? 'Guardando...' : !stationId ? 'Selecciona Estación' : 'Liberar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineDefectDetailModal;
