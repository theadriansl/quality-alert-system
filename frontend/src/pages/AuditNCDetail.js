import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditNCDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  const L = {
    en: {
      open: 'Open', inProgress: 'In Progress', pendingVerification: 'Pend. Verification', closed: 'Closed',
      connectionError: 'Connection error', updateError: 'Error updating', verifyError: 'Error verifying',
      ncClosed: 'NC closed successfully', ncReopened: 'NC reopened for new actions',
      loading: 'Loading non-conformity...', notFound: 'NC not found', backToNCs: 'Back to NCs',
      overdue: 'OVERDUE', ncMajor: 'Major', ncMinor: 'Minor', auditNC: 'Non-Conformity', audit: 'Audit',
      edit: 'Edit', verify: 'Verify', saving: 'Saving...', save: 'Save', cancel: 'Cancel', back: 'Back',
      ncInfo: 'Non-Conformity Information', type: 'Type', clause: 'Clause', areaProcess: 'Area/Process',
      auditDate: 'Audit Date', responsible: 'Responsible', selectResponsible: 'Select responsible...',
      noDept: 'No dept', dueDate: 'Due Date', notDefined: 'Not defined', unassigned: 'Unassigned',
      status: 'Status', findingDesc: 'Finding Description', description: 'Description',
      objectiveEvidence: 'Objective Evidence',
      actions: 'Actions', immediateAction: 'Immediate Action / Containment',
      immediateActionPlaceholder: 'Immediate actions taken to contain the problem...',
      rootCauseAnalysis: 'Root Cause Analysis', rootCausePlaceholder: '5 Whys, Ishikawa, etc...',
      correctiveAction: 'Corrective Action', correctivePlaceholder: 'Actions to eliminate root cause...',
      preventiveAction: 'Preventive Action', preventivePlaceholder: 'Actions to prevent recurrence...',
      pending: 'Pending',
      verification: 'Verification', verificationDate: 'Verification Date', result: 'Result',
      effective: 'Effective', notEffective: 'Not Effective', verifiedBy: 'Verified by',
      verificationEvidence: 'Verification Evidence',
      link8D: '8D Linkage', view8D: 'View 8D', ncNotLinked: 'This NC is not linked to an 8D report',
      create8DFromNC: '+ Create 8D from this NC',
      verifyEffectiveness: 'Verify Effectiveness', verificationResult: 'Verification Result',
      effectiveCloseNC: 'Effective - Close NC', notEffectiveReopen: 'Not Effective - Reopen',
      evidencePlaceholder: 'Evidence supporting the verification...',
      confirmVerification: 'Confirm Verification'
    },
    es: {
      open: 'Abierta', inProgress: 'En Proceso', pendingVerification: 'Pend. Verificación', closed: 'Cerrada',
      connectionError: 'Error de conexión', updateError: 'Error al actualizar', verifyError: 'Error al verificar',
      ncClosed: 'NC cerrada exitosamente', ncReopened: 'NC reabierta para nuevas acciones',
      loading: 'Cargando no conformidad...', notFound: 'NC no encontrada', backToNCs: 'Volver a NCs',
      overdue: 'VENCIDA', ncMajor: 'Mayor', ncMinor: 'Menor', auditNC: 'No Conformidad', audit: 'Auditoría',
      edit: 'Editar', verify: 'Verificar', saving: 'Guardando...', save: 'Guardar', cancel: 'Cancelar', back: 'Volver',
      ncInfo: 'Información de la No Conformidad', type: 'Tipo', clause: 'Cláusula', areaProcess: 'Área/Proceso',
      auditDate: 'Fecha de Auditoría', responsible: 'Responsable', selectResponsible: 'Seleccionar responsable...',
      noDept: 'Sin depto', dueDate: 'Fecha Límite', notDefined: 'No definida', unassigned: 'Sin asignar',
      status: 'Estado', findingDesc: 'Descripción del Hallazgo', description: 'Descripción',
      objectiveEvidence: 'Evidencia Objetiva',
      actions: 'Acciones', immediateAction: 'Acción Inmediata / Contención',
      immediateActionPlaceholder: 'Acciones inmediatas tomadas para contener el problema...',
      rootCauseAnalysis: 'Análisis de Causa Raíz', rootCausePlaceholder: '5 Por qué, Ishikawa, etc...',
      correctiveAction: 'Acción Correctiva', correctivePlaceholder: 'Acciones para eliminar la causa raíz...',
      preventiveAction: 'Acción Preventiva', preventivePlaceholder: 'Acciones para prevenir recurrencia...',
      pending: 'Pendiente',
      verification: 'Verificación', verificationDate: 'Fecha de Verificación', result: 'Resultado',
      effective: 'Efectiva', notEffective: 'No Efectiva', verifiedBy: 'Verificado por',
      verificationEvidence: 'Evidencia de Verificación',
      link8D: 'Vinculación a 8D', view8D: 'Ver 8D', ncNotLinked: 'Esta NC no está vinculada a un reporte 8D',
      create8DFromNC: '+ Crear 8D desde esta NC',
      verifyEffectiveness: 'Verificar Efectividad', verificationResult: 'Resultado de Verificación',
      effectiveCloseNC: 'Efectiva - Cerrar NC', notEffectiveReopen: 'No Efectiva - Reabrir',
      evidencePlaceholder: 'Evidencia que sustenta la verificación...',
      confirmVerification: 'Confirmar Verificación'
    }
  }[language] || {};

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
    open: { label: L.open, color: t.error },
    in_progress: { label: L.inProgress, color: t.warning },
    pending_verification: { label: L.pendingVerification, color: '#8b5cf6' },
    closed: { label: L.closed, color: t.success }
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
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [id, L.connectionError]);

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
      alert(L.updateError);
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
        alert(verifyData.verificationResult === 'effective' ? L.ncClosed : L.ncReopened);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.verifyError);
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
      fontWeight: '600',
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
          {L.loading}
        </div>
      </div>
    );
  }

  if (error || !nc) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || L.notFound}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-ncs')}
          >
            {L.backToNCs}
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
            {isOverdue && <span style={{ marginLeft: '12px', color: t.error, fontSize: '16px' }}> {L.overdue}</span>}
          </h1>
          <p style={styles.subtitle}>
            {L.auditNC} {nc.ncType === 'major' ? L.ncMajor : L.ncMinor} - {L.audit} {nc.auditNumber}
          </p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          {nc.status !== 'closed' && !isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
                onClick={() => setIsEditing(true)}
              >
                 {L.edit}
              </button>
              {nc.status === 'pending_verification' && (
                <button
                  style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                  onClick={() => setShowVerifyModal(true)}
                >
                   {L.verify}
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
                {saving ? L.saving : ` ${L.save}`}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => {
                  setIsEditing(false);
                  setEditData(nc);
                }}
              >
                {L.cancel}
              </button>
            </>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-ncs')}
          >
            ← {L.back}
          </button>
        </div>
      </div>

      {/* NC Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           {L.ncInfo}
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
              <div style={styles.fieldLabel}>{L.type}</div>
              <div style={styles.fieldValue}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: nc.ncType === 'major' ? `${t.error}20` : `${t.warning}20`,
                  color: nc.ncType === 'major' ? t.error : t.warning
                }}>
                  {nc.ncType === 'major' ? L.ncMajor : L.ncMinor}
                </span>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.clause}</div>
              <div style={styles.fieldValue}>{nc.clause || '-'}</div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.areaProcess}</div>
              <div style={styles.fieldValue}>{nc.areaProcess || '-'}</div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.auditDate}</div>
              <div style={styles.fieldValue}>
                {nc.auditDate ? new Date(nc.auditDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX') : '-'}
              </div>
            </div>
          </div>

          <div>
            {isEditing ? (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{L.responsible}</label>
                  <select
                    value={editData.responsibleId || ''}
                    onChange={(e) => setEditData({ ...editData, responsibleId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">{L.selectResponsible}</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} - {u.department || L.noDept}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>{L.dueDate}</label>
                  <input
                    type="date"
                    value={editData.dueDate?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>{L.status}</label>
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    style={styles.select}
                  >
                    <option value="open">{L.open}</option>
                    <option value="in_progress">{L.inProgress}</option>
                    <option value="pending_verification">{L.pendingVerification}</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>{L.responsible}</div>
                  <div style={styles.fieldValue}>{nc.responsibleName || L.unassigned}</div>
                </div>

                <div style={styles.field}>
                  <div style={styles.fieldLabel}>{L.dueDate}</div>
                  <div style={{
                    ...styles.fieldValue,
                    color: isOverdue ? t.error : 'inherit'
                  }}>
                    {nc.dueDate ? new Date(nc.dueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX') : L.notDefined}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> {L.findingDesc}</h2>

        <div style={styles.field}>
          <div style={styles.fieldLabel}>{L.description}</div>
          <div style={styles.fieldValue}>{nc.description}</div>
        </div>

        {nc.objectiveEvidence && (
          <div style={styles.field}>
            <div style={styles.fieldLabel}>{L.objectiveEvidence}</div>
            <div style={styles.fieldValue}>{nc.objectiveEvidence}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> {L.actions}</h2>

        {isEditing ? (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>{L.immediateAction}</label>
              <textarea
                value={editData.immediateAction || ''}
                onChange={(e) => setEditData({ ...editData, immediateAction: e.target.value })}
                placeholder={L.immediateActionPlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.rootCauseAnalysis}</label>
              <textarea
                value={editData.rootCauseAnalysis || ''}
                onChange={(e) => setEditData({ ...editData, rootCauseAnalysis: e.target.value })}
                placeholder={L.rootCausePlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.correctiveAction}</label>
              <textarea
                value={editData.correctiveAction || ''}
                onChange={(e) => setEditData({ ...editData, correctiveAction: e.target.value })}
                placeholder={L.correctivePlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.preventiveAction}</label>
              <textarea
                value={editData.preventiveAction || ''}
                onChange={(e) => setEditData({ ...editData, preventiveAction: e.target.value })}
                placeholder={L.preventivePlaceholder}
                style={styles.textarea}
              />
            </div>
          </>
        ) : (
          <div style={styles.timeline}>
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.immediateAction ? t.success : t.border }} />
              <div style={styles.fieldLabel}>{L.immediateAction}</div>
              <div style={styles.fieldValue}>{nc.immediateAction || L.pending}</div>
            </div>

            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.rootCauseAnalysis ? t.success : t.border }} />
              <div style={styles.fieldLabel}>{L.rootCauseAnalysis}</div>
              <div style={styles.fieldValue}>{nc.rootCauseAnalysis || L.pending}</div>
            </div>

            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.correctiveAction ? t.success : t.border }} />
              <div style={styles.fieldLabel}>{L.correctiveAction}</div>
              <div style={styles.fieldValue}>{nc.correctiveAction || L.pending}</div>
            </div>

            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: nc.preventiveAction ? t.success : t.border }} />
              <div style={styles.fieldLabel}>{L.preventiveAction}</div>
              <div style={styles.fieldValue}>{nc.preventiveAction || L.pending}</div>
            </div>
          </div>
        )}
      </div>

      {/* Verification */}
      {(nc.verificationDate || nc.status === 'closed') && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> {L.verification}</h2>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.verificationDate}</div>
              <div style={styles.fieldValue}>
                {nc.verificationDate ? new Date(nc.verificationDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX') : '-'}
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.result}</div>
              <div style={styles.fieldValue}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: nc.verificationResult === 'effective' ? `${t.success}20` : `${t.error}20`,
                  color: nc.verificationResult === 'effective' ? t.success : t.error
                }}>
                  {nc.verificationResult === 'effective' ? L.effective : L.notEffective}
                </span>
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.verifiedBy}</div>
              <div style={styles.fieldValue}>{nc.verifiedByName || '-'}</div>
            </div>
          </div>

          {nc.verificationEvidence && (
            <div style={styles.field}>
              <div style={styles.fieldLabel}>{L.verificationEvidence}</div>
              <div style={styles.fieldValue}>{nc.verificationEvidence}</div>
            </div>
          )}
        </div>
      )}

      {/* Linked 8D */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}> {L.link8D}</h2>

        {linked8D ? (
          <div style={styles.linked8D}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: t.text }}>{linked8D.reportId}</div>
            <div style={{ fontSize: '14px', color: t.text, marginBottom: '8px' }}>{linked8D.title}</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '12px' }}>{L.status}: {linked8D.status}</div>
            <button
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
              onClick={() => navigate(`/8d-workflow/${linked8D.id}`)}
            >
              {L.view8D}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: t.textMuted, marginBottom: '16px' }}>
              {L.ncNotLinked}
            </p>
            {nc.status !== 'closed' && (
              <button
                style={{ ...styles.button, backgroundColor: '#8b5cf6', color: 'white' }}
                onClick={create8D}
              >
                {L.create8DFromNC}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div style={styles.modal} onClick={() => setShowVerifyModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{L.verifyEffectiveness}</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.verificationResult}</label>
              <select
                value={verifyData.verificationResult}
                onChange={(e) => setVerifyData({ ...verifyData, verificationResult: e.target.value })}
                style={styles.select}
              >
                <option value="effective">{L.effectiveCloseNC}</option>
                <option value="not_effective">{L.notEffectiveReopen}</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.verificationEvidence}</label>
              <textarea
                value={verifyData.verificationEvidence}
                onChange={(e) => setVerifyData({ ...verifyData, verificationEvidence: e.target.value })}
                placeholder={L.evidencePlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setShowVerifyModal(false)}
              >
                {L.cancel}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={verifyNC}
                disabled={saving}
              >
                {saving ? L.saving : L.confirmVerification}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditNCDetail;
