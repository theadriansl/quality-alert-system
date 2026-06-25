import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditProgramDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  const L = {
    en: {
      draft: 'Draft', approved: 'Approved', inProgress: 'In Progress', completed: 'Completed',
      planned: 'Planned', cancelled: 'Cancelled', postponed: 'Postponed',
      connectionError: 'Connection error', updateError: 'Error updating',
      confirmApprove: 'Approve this audit program?', approveError: 'Error approving',
      confirmDelete: 'Delete this program? This action cannot be undone.',
      deleteError: 'Error deleting',
      loading: 'Loading program...', notFound: 'Program not found', backToPrograms: 'Back to Programs',
      auditProgram: 'Audit Program', year: 'Year',
      approve: 'Approve', edit: 'Edit', save: 'Save', cancel: 'Cancel',
      addAudit: '+ Add Audit', delete: 'Delete', back: 'Back',
      programInfo: 'Program Information', name: 'Name', description: 'Description',
      scope: 'Scope', type: 'Type', criteria: 'Criteria/Standard', frequency: 'Frequency',
      objectives: 'Objectives', approvedBy: 'Approved by',
      internal: 'Internal', supplier: 'Supplier', process: 'Process', product: 'Product', system: 'System',
      riskBased: 'Risk-Based', quarterly: 'Quarterly', semiannual: 'Semi-annual', annual: 'Annual',
      scheduledAudits: 'Scheduled Audits', audits: 'audits',
      noAuditsScheduled: 'No audits scheduled for this program', addFirstAudit: '+ Add First Audit',
      number: 'Number', areaProcess: 'Area/Process', startDate: 'Start Date', endDate: 'End Date',
      leadAuditor: 'Lead Auditor', status: 'Status'
    },
    es: {
      draft: 'Borrador', approved: 'Aprobado', inProgress: 'En Proceso', completed: 'Completado',
      planned: 'Planeada', cancelled: 'Cancelada', postponed: 'Pospuesta',
      connectionError: 'Error de conexión', updateError: 'Error al actualizar',
      confirmApprove: '¿Aprobar este programa de auditoría?', approveError: 'Error al aprobar',
      confirmDelete: '¿Eliminar este programa? Esta acción no se puede deshacer.',
      deleteError: 'Error al eliminar',
      loading: 'Cargando programa...', notFound: 'Programa no encontrado', backToPrograms: 'Volver a Programas',
      auditProgram: 'Programa de Auditoría', year: 'Año',
      approve: 'Aprobar', edit: 'Editar', save: 'Guardar', cancel: 'Cancelar',
      addAudit: '+ Agregar Auditoría', delete: 'Eliminar', back: 'Volver',
      programInfo: 'Información del Programa', name: 'Nombre', description: 'Descripción',
      scope: 'Alcance', type: 'Tipo', criteria: 'Criterios/Norma', frequency: 'Frecuencia',
      objectives: 'Objetivos', approvedBy: 'Aprobado por',
      internal: 'Interna', supplier: 'Proveedor', process: 'Proceso', product: 'Producto', system: 'Sistema',
      riskBased: 'Basado en Riesgo', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual',
      scheduledAudits: 'Auditorías Programadas', audits: 'auditorías',
      noAuditsScheduled: 'No hay auditorías programadas para este programa', addFirstAudit: '+ Agregar Primera Auditoría',
      number: 'Número', areaProcess: 'Área/Proceso', startDate: 'Fecha Inicio', endDate: 'Fecha Fin',
      leadAuditor: 'Auditor Líder', status: 'Estado'
    }
  }[language] || {};

  const [program, setProgram] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const STATUS_CONFIG = {
    draft: { color: t.textMuted, label: L.draft },
    approved: { color: t.accent, label: L.approved },
    in_progress: { color: t.warning, label: L.inProgress },
    completed: { color: t.success, label: L.completed },
    planned: { color: t.accent, label: L.planned },
    cancelled: { color: t.error, label: L.cancelled },
    postponed: { color: t.textMuted, label: L.postponed }
  };

  const loadProgram = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/programs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setProgram(result.program);
        setSchedules(result.schedules || []);
        setEditData(result.program);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [id, L.connectionError]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const updateProgram = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/programs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      const result = await res.json();

      if (result.success) {
        setProgram(result.program);
        setIsEditing(false);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.updateError);
    }
  };

  const approveProgram = async () => {
    if (!window.confirm(L.confirmApprove)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/programs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...editData, status: 'approved' })
      });
      const result = await res.json();

      if (result.success) {
        setProgram(result.program);
        setEditData(result.program);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.approveError);
    }
  };

  const deleteProgram = async () => {
    if (!window.confirm(L.confirmDelete)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/programs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        navigate('/audit-programs');
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.deleteError);
    }
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
      fontWeight: '500',
      color: t.textMuted,
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    fieldValue: {
      fontSize: '14px',
      color: t.text
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
      minHeight: '80px',
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
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      borderBottom: `1px solid ${t.border}`,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      fontSize: '14px',
      color: t.text,
      borderBottom: `1px solid ${t.border}`
    },
    empty: {
      textAlign: 'center',
      padding: '32px',
      color: t.textMuted
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

  if (error || !program) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || L.notFound}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-programs')}
          >
            {L.backToPrograms}
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[program.status] || STATUS_CONFIG.draft;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{program.name}</h1>
          <p style={{ fontSize: '14px', color: t.textMuted, marginTop: '4px' }}>
            {L.auditProgram} - {L.year} {program.year}
          </p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          {program.status === 'draft' && !isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={approveProgram}
              >
                 {L.approve}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
                onClick={() => setIsEditing(true)}
              >
                 {L.edit}
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={updateProgram}
              >
                 {L.save}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => {
                  setIsEditing(false);
                  setEditData(program);
                }}
              >
                {L.cancel}
              </button>
            </>
          )}
          <button
            style={{ ...styles.button, backgroundColor: '#8b5cf6', color: 'white' }}
            onClick={() => navigate('/audit-schedule-create', { state: { programId: program.id } })}
          >
            {L.addAudit}
          </button>
          {program.status === 'draft' && (
            <button
              style={{ ...styles.button, backgroundColor: t.error, color: 'white' }}
              onClick={deleteProgram}
            >
               {L.delete}
            </button>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-programs')}
          >
            ← {L.back}
          </button>
        </div>
      </div>

      {/* Program Details */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           {L.programInfo}
          <span style={{
            ...styles.badge,
            backgroundColor: `${statusConfig.color}20`,
            color: statusConfig.color,
            marginLeft: 'auto'
          }}>
            {statusConfig.label}
          </span>
        </h2>

        <div style={styles.grid2}>
          <div>
            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>{L.name}</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  style={styles.input}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>{L.name}</div>
                <div style={styles.fieldValue}>{program.name}</div>
              </div>
            )}

            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>{L.description}</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  style={styles.textarea}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>{L.description}</div>
                <div style={styles.fieldValue}>{program.description || '-'}</div>
              </div>
            )}

            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>{L.scope}</label>
                <textarea
                  value={editData.scope || ''}
                  onChange={(e) => setEditData({ ...editData, scope: e.target.value })}
                  style={styles.textarea}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>{L.scope}</div>
                <div style={styles.fieldValue}>{program.scope || '-'}</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.field}>
                <div style={styles.fieldLabel}>{L.year}</div>
                <div style={styles.fieldValue}>{program.year}</div>
              </div>

              {isEditing ? (
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>{L.type}</label>
                  <select
                    value={editData.auditType || ''}
                    onChange={(e) => setEditData({ ...editData, auditType: e.target.value })}
                    style={styles.select}
                  >
                    <option value="interna">{L.internal}</option>
                    <option value="proveedor">{L.supplier}</option>
                    <option value="proceso">{L.process}</option>
                    <option value="producto">{L.product}</option>
                    <option value="sistema">{L.system}</option>
                  </select>
                </div>
              ) : (
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>{L.type}</div>
                  <div style={styles.fieldValue}>{program.auditType || '-'}</div>
                </div>
              )}

              {isEditing ? (
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>{L.criteria}</label>
                  <select
                    value={editData.criteria || ''}
                    onChange={(e) => setEditData({ ...editData, criteria: e.target.value })}
                    style={styles.select}
                  >
                    <option value="ISO 9001:2015">ISO 9001:2015</option>
                    <option value="IATF 16949:2016">IATF 16949:2016</option>
                    <option value="VDA 6.3">VDA 6.3</option>
                    <option value="ISO 14001:2015">ISO 14001:2015</option>
                    <option value="ISO 45001:2018">ISO 45001:2018</option>
                  </select>
                </div>
              ) : (
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>{L.criteria}</div>
                  <div style={styles.fieldValue}>{program.criteria || '-'}</div>
                </div>
              )}

              {isEditing ? (
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>{L.frequency}</label>
                  <select
                    value={editData.frequencyBasis || ''}
                    onChange={(e) => setEditData({ ...editData, frequencyBasis: e.target.value })}
                    style={styles.select}
                  >
                    <option value="riesgo">{L.riskBased}</option>
                    <option value="trimestral">{L.quarterly}</option>
                    <option value="semestral">{L.semiannual}</option>
                    <option value="anual">{L.annual}</option>
                  </select>
                </div>
              ) : (
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>{L.frequency}</div>
                  <div style={styles.fieldValue}>{program.frequencyBasis || '-'}</div>
                </div>
              )}
            </div>

            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>{L.objectives}</label>
                <textarea
                  value={editData.objectives || ''}
                  onChange={(e) => setEditData({ ...editData, objectives: e.target.value })}
                  style={styles.textarea}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>{L.objectives}</div>
                <div style={styles.fieldValue}>{program.objectives || '-'}</div>
              </div>
            )}

            {program.approvedBy && (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>{L.approvedBy}</div>
                <div style={styles.fieldValue}>
                  {program.approvedByName} - {new Date(program.approvedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scheduled Audits */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           {L.scheduledAudits}
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: t.textMuted }}>
            {schedules.length} {L.audits}
          </span>
        </h2>

        {schedules.length === 0 ? (
          <div style={styles.empty}>
            <p>{L.noAuditsScheduled}</p>
            <button
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white', marginTop: '12px' }}
              onClick={() => navigate('/audit-schedule-create', { state: { programId: program.id } })}
            >
              {L.addFirstAudit}
            </button>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{L.number}</th>
                <th style={styles.th}>{L.name}</th>
                <th style={styles.th}>{L.areaProcess}</th>
                <th style={styles.th}>{L.startDate}</th>
                <th style={styles.th}>{L.endDate}</th>
                <th style={styles.th}>{L.leadAuditor}</th>
                <th style={styles.th}>{L.status}</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => {
                const scheduleStatus = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.planned;
                return (
                  <tr
                    key={schedule.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/audit-execute/${schedule.id}`)}
                  >
                    <td style={styles.td}>{schedule.auditNumber}</td>
                    <td style={styles.td}>{schedule.auditName}</td>
                    <td style={styles.td}>{schedule.areaProcess || '-'}</td>
                    <td style={styles.td}>
                      {new Date(schedule.plannedStartDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                    </td>
                    <td style={styles.td}>
                      {new Date(schedule.plannedEndDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                    </td>
                    <td style={styles.td}>{schedule.leadAuditorName || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: `${scheduleStatus.color}20`,
                        color: scheduleStatus.color
                      }}>
                        {scheduleStatus.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditProgramDetail;
