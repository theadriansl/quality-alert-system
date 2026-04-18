import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const AuditNCDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const [nc, setNc] = useState(null);
  const [linked8D, setLinked8D] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyData, setVerifyData] = useState({
    verificationResult: 'effective',
    verificationEvidence: ''
  });

  const STATUS_CONFIG = {
    open: { label: 'Abierta', color: t.error },
    in_progress: { label: 'En Proceso', color: t.warning },
    pending_verification: { label: 'Pend. Verificación', color: '#8b5cf6' },
    closed: { label: 'Cerrada', color: t.success }
  };

  const loadNC = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [ncRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/audit/ncs/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/users/list`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const ncData = await ncRes.json();
      const usersData = await usersRes.json();

      if (ncData.success) {
        setNc(ncData.nonConformity);
        setLinked8D(ncData.linked8D);
        setEditData(ncData.nonConformity);
      } else {
        setError(ncData.message);
      }

      if (usersData) {
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNC();
  }, [loadNC]);

  const updateNC = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/ncs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      const result = await res.json();

      if (result.success) {
        setNc(result.nonConformity);
        setIsEditing(false);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const verifyNC = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/ncs/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(verifyData)
      });
      const result = await res.json();

      if (result.success) {
        setNc(result.nonConformity);
        setShowVerifyModal(false);
        alert(verifyData.verificationResult === 'effective' ? 'NC cerrada exitosamente' : 'NC reabierta para nuevas acciones');
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Error al verificar');
    } finally {
      setSaving(false);
    }
  };

  const create8D = () => {
    // Navigate to 8D creation with NC data
    navigate('/8d-workflow', { state: { fromAuditNC: nc } });
  };

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
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px'
    },
    field: {
      marginBottom: '16px'
    },
    fieldLabel: {
      fontSize: '12px',
      color: t.textMuted,
      marginBottom: '4px',
      textTransform: 'uppercase',
      fontWeight: '500'
    },
    fieldValue: {
      fontSize: '14px',
      color: t.text
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '500',
      color: t.text,
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      minHeight: '100px',
      resize: 'vertical',
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    timeline: {
      borderLeft: `2px solid ${t.border}`,
      paddingLeft: '20px',
      marginLeft: '10px'
    },
    timelineItem: {
      position: 'relative',
      marginBottom: '20px'
    },
    timelineDot: {
      position: 'absolute',
      left: '-27px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: t.accent
    },
    modal: {
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
    },
    modalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '100%',
      maxWidth: '500px'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
    },
    linked8D: {
      padding: '16px',
      backgroundColor: `${t.success}10`,
      borderRadius: '8px',
      border: `1px solid ${t.success}`
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          Cargando no conformidad...
        </div>
      </div>
    );
  }

  if (error || !nc) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || 'NC no encontrada'}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-ncs')}
          >
            Volver a NCs
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[nc.status] || STATUS_CONFIG.open;
  const isOverdue = nc.dueDate && new Date(nc.dueDate) < new Date() && nc.status !== 'closed';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {nc.ncNumber}
            {isOverdue && <span style={{ marginLeft: '12px', color: t.error, fontSize: '16px' }}> VENCIDA</span>}
          </h1>
          <p style={styles.subtitle}>
            No Conformidad {nc.ncType === 'major' ? 'Mayor' : 'Menor'} - Auditoría {nc.auditNumber}
          </p>
        </div>
        <div style={styles.buttons}>
          {nc.status !== 'closed' && !isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
                onClick={() => setIsEditing(true)}
              >
                 Editar
              </button>
              {nc.status === 'pending_verification' && (
                <button
                  style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                  onClick={() => setShowVerifyModal(true)}
                >
                   Verificar
                </button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={updateNC}
                disabled={saving}
              >
                {saving ? 'Guardando...' : ' Guardar'}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => {
                  setIsEditing(false);
                  setEditData(nc);
                }}
              >
                Cancelar
              </button>
            </>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-ncs')}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* NC Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           Información de la No Conformidad
          <span style={{
            ...styles.badge,
            marginLeft: 'auto',
            backgroundColor: `${statusConfig.color}20`,
            color: statusConfig.color
          }}>
            {statusConfig.label}
          </span>
        </h2>

        <div style={styles.grid2}>
          <div>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Tipo</div>
              <div style={styles.fieldValue}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: nc.ncType === 'major' ? `${t.error}20` : `${t.warning}20`,
                  color: nc.ncType === 'major' ? t.error : t.warning
                }}>
                  {nc.ncType === 'major' ? 'Mayor' : 'Menor'}
                </span>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Cláusula</div>
              <div style={styles.fieldValue}>{nc.clause || '-'}</div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Área/Proceso</div>
              <div style={styles.fieldValue}>{nc.areaProcess || '-'}</div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Fecha de Auditoría</div>
              <div style={styles.fieldValue}>
                {nc.auditDate ? new Date(nc.auditDate).toLocaleDateString('es-MX') : '-'}
              </div>
            </div>
          </div>

          <div>
            {isEditing ? (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Responsable</label>
                  <select
                    value={editData.responsibleId || ''}
                    onChange={(e) => setEditData({ ...editData, responsibleId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Seleccionar responsable...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} - {u.department || 'Sin depto'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha Límite</label>
                  <input
                    type="date"
                    value={editData.dueDate?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    style={styles.select}
                  >
                    <option value="open">Abierta</option>
                    <option value="in_progress">En Proceso</option>
                    <option value="pending_verification">Pendiente Verificación</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Responsable</div>
                  <div style={styles.fieldValue}>{nc.responsibleName || 'Sin asignar'}</div>
                </div>

                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Fecha Límite</div>
                  <div style={{
                    ...styles.fieldValue,
                    color: isOverdue ? t.error : 'inherit'
                  }}>
                    {nc.dueDate ? new Date(nc.dueDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> Descripción del Hallazgo</h2>

        <div style={styles.field}>
          <div style={styles.fieldLabel}>Descripción</div>
          <div style={styles.fieldValue}>{nc.description}</div>
        </div>

        {nc.objectiveEvidence && (
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Evidencia Objetiva</div>
            <div style={styles.fieldValue}>{nc.objectiveEvidence}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> Acciones</h2>

        {isEditing ? (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Acción Inmediata / Contención</label>
              <textarea
                value={editData.immediateAction || ''}
                onChange={(e) => setEditData({ ...editData, immediateAction: e.target.value })}
                placeholder="Acciones inmediatas tomadas para contener el problema..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Análisis de Causa Raíz</label>
              <textarea
                value={editData.rootCauseAnalysis || ''}
                onChange={(e) => setEditData({ ...editData, rootCauseAnalysis: e.target.value })}
                placeholder="5 Por qué, Ishikawa, etc..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Acción Correctiva</label>
              <textarea
                value={editData.correctiveAction || ''}
                onChange={(e) => setEditData({ ...editData, correctiveAction: e.target.value })}
                placeholder="Acciones para eliminar la causa raíz..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Acción Preventiva</label>
              <textarea
                value={editData.preventiveAction || ''}
                onChange={(e) => setEditData({ ...editData, preventiveAction: e.target.value })}
                placeholder="Acciones para prevenir recurrencia..."
                style={styles.textarea}
              />
            </div>
          </>
        ) : (
          <div style={styles.timeline}>
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.immediateAction ? t.success : t.border }} />
              <div style={styles.fieldLabel}>Acción Inmediata</div>
              <div style={styles.fieldValue}>{nc.immediateAction || 'Pendiente'}</div>
            </div>

            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.rootCauseAnalysis ? t.success : t.border }} />
              <div style={styles.fieldLabel}>Análisis de Causa Raíz</div>
              <div style={styles.fieldValue}>{nc.rootCauseAnalysis || 'Pendiente'}</div>
            </div>

            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.correctiveAction ? t.success : t.border }} />
              <div style={styles.fieldLabel}>Acción Correctiva</div>
              <div style={styles.fieldValue}>{nc.correctiveAction || 'Pendiente'}</div>
            </div>

            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.preventiveAction ? t.success : t.border }} />
              <div style={styles.fieldLabel}>Acción Preventiva</div>
              <div style={styles.fieldValue}>{nc.preventiveAction || 'Pendiente'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Verification */}
      {(nc.verificationDate || nc.status === 'closed') && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> Verificación</h2>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Fecha de Verificación</div>
              <div style={styles.fieldValue}>
                {nc.verificationDate ? new Date(nc.verificationDate).toLocaleDateString('es-MX') : '-'}
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Resultado</div>
              <div style={styles.fieldValue}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: nc.verificationResult === 'effective' ? `${t.success}20` : `${t.error}20`,
                  color: nc.verificationResult === 'effective' ? t.success : t.error
                }}>
                  {nc.verificationResult === 'effective' ? 'Efectiva' : 'No Efectiva'}
                </span>
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Verificado por</div>
              <div style={styles.fieldValue}>{nc.verifiedByName || '-'}</div>
            </div>
          </div>

          {nc.verificationEvidence && (
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Evidencia de Verificación</div>
              <div style={styles.fieldValue}>{nc.verificationEvidence}</div>
            </div>
          )}
        </div>
      )}

      {/* Linked 8D */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> Vinculación a 8D</h2>

        {linked8D ? (
          <div style={styles.linked8D}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: t.text }}>{linked8D.reportId}</div>
            <div style={{ fontSize: '14px', color: t.text, marginBottom: '8px' }}>{linked8D.title}</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '12px' }}>Estado: {linked8D.status}</div>
            <button
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
              onClick={() => navigate(`/8d-workflow/${linked8D.id}`)}
            >
              Ver 8D
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: t.textMuted, marginBottom: '16px' }}>
              Esta NC no está vinculada a un reporte 8D
            </p>
            {nc.status !== 'closed' && (
              <button
                style={{ ...styles.button, backgroundColor: '#8b5cf6', color: 'white' }}
                onClick={create8D}
              >
                + Crear 8D desde esta NC
              </button>
            )}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div style={styles.modal} onClick={() => setShowVerifyModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Verificar Efectividad</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Resultado de Verificación</label>
              <select
                value={verifyData.verificationResult}
                onChange={(e) => setVerifyData({ ...verifyData, verificationResult: e.target.value })}
                style={styles.select}
              >
                <option value="effective">Efectiva - Cerrar NC</option>
                <option value="not_effective">No Efectiva - Reabrir</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Evidencia de Verificación</label>
              <textarea
                value={verifyData.verificationEvidence}
                onChange={(e) => setVerifyData({ ...verifyData, verificationEvidence: e.target.value })}
                placeholder="Evidencia que sustenta la verificación..."
                style={styles.textarea}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setShowVerifyModal(false)}
              >
                Cancelar
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={verifyNC}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Confirmar Verificación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditNCDetail;
