import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const AuditProgramDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const [program, setProgram] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const STATUS_CONFIG = {
    draft: { color: t.textMuted, label: 'Borrador' },
    approved: { color: t.accent, label: 'Aprobado' },
    in_progress: { color: t.warning, label: 'En Proceso' },
    completed: { color: t.success, label: 'Completado' },
    planned: { color: t.accent, label: 'Planeada' },
    cancelled: { color: t.error, label: 'Cancelada' },
    postponed: { color: t.textMuted, label: 'Pospuesta' }
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
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      alert('Error al actualizar');
    }
  };

  const approveProgram = async () => {
    if (!window.confirm('¿Aprobar este programa de auditoría?')) return;

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
      alert('Error al aprobar');
    }
  };

  const deleteProgram = async () => {
    if (!window.confirm('¿Eliminar este programa? Esta acción no se puede deshacer.')) return;

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
      alert('Error al eliminar');
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
          Cargando programa...
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || 'Programa no encontrado'}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-programs')}
          >
            Volver a Programas
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
            Programa de Auditoría - Año {program.year}
          </p>
        </div>
        <div style={styles.buttons}>
          {program.status === 'draft' && !isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={approveProgram}
              >
                 Aprobar
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
                onClick={() => setIsEditing(true)}
              >
                 Editar
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={updateProgram}
              >
                 Guardar
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => {
                  setIsEditing(false);
                  setEditData(program);
                }}
              >
                Cancelar
              </button>
            </>
          )}
          <button
            style={{ ...styles.button, backgroundColor: '#8b5cf6', color: 'white' }}
            onClick={() => navigate('/audit-schedule-create', { state: { programId: program.id } })}
          >
            + Agregar Auditoría
          </button>
          {program.status === 'draft' && (
            <button
              style={{ ...styles.button, backgroundColor: t.error, color: 'white' }}
              onClick={deleteProgram}
            >
               Eliminar
            </button>
          )}
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-programs')}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Program Details */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           Información del Programa
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
                <label style={styles.fieldLabel}>Nombre</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  style={styles.input}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Nombre</div>
                <div style={styles.fieldValue}>{program.name}</div>
              </div>
            )}

            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Descripción</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  style={styles.textarea}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Descripción</div>
                <div style={styles.fieldValue}>{program.description || '-'}</div>
              </div>
            )}

            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Alcance</label>
                <textarea
                  value={editData.scope || ''}
                  onChange={(e) => setEditData({ ...editData, scope: e.target.value })}
                  style={styles.textarea}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Alcance</div>
                <div style={styles.fieldValue}>{program.scope || '-'}</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Año</div>
                <div style={styles.fieldValue}>{program.year}</div>
              </div>

              {isEditing ? (
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>Tipo</label>
                  <select
                    value={editData.auditType || ''}
                    onChange={(e) => setEditData({ ...editData, auditType: e.target.value })}
                    style={styles.select}
                  >
                    <option value="interna">Interna</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="proceso">Proceso</option>
                    <option value="producto">Producto</option>
                    <option value="sistema">Sistema</option>
                  </select>
                </div>
              ) : (
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Tipo</div>
                  <div style={styles.fieldValue}>{program.auditType || '-'}</div>
                </div>
              )}

              {isEditing ? (
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>Criterios/Norma</label>
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
                  <div style={styles.fieldLabel}>Criterios/Norma</div>
                  <div style={styles.fieldValue}>{program.criteria || '-'}</div>
                </div>
              )}

              {isEditing ? (
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>Frecuencia</label>
                  <select
                    value={editData.frequencyBasis || ''}
                    onChange={(e) => setEditData({ ...editData, frequencyBasis: e.target.value })}
                    style={styles.select}
                  >
                    <option value="riesgo">Basado en Riesgo</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              ) : (
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Frecuencia</div>
                  <div style={styles.fieldValue}>{program.frequencyBasis || '-'}</div>
                </div>
              )}
            </div>

            {isEditing ? (
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Objetivos</label>
                <textarea
                  value={editData.objectives || ''}
                  onChange={(e) => setEditData({ ...editData, objectives: e.target.value })}
                  style={styles.textarea}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Objetivos</div>
                <div style={styles.fieldValue}>{program.objectives || '-'}</div>
              </div>
            )}

            {program.approvedBy && (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Aprobado por</div>
                <div style={styles.fieldValue}>
                  {program.approvedByName} - {new Date(program.approvedAt).toLocaleDateString('es-MX')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scheduled Audits */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
           Auditorías Programadas
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: t.textMuted }}>
            {schedules.length} auditorías
          </span>
        </h2>

        {schedules.length === 0 ? (
          <div style={styles.empty}>
            <p>No hay auditorías programadas para este programa</p>
            <button
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white', marginTop: '12px' }}
              onClick={() => navigate('/audit-schedule-create', { state: { programId: program.id } })}
            >
              + Agregar Primera Auditoría
            </button>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Número</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Área/Proceso</th>
                <th style={styles.th}>Fecha Inicio</th>
                <th style={styles.th}>Fecha Fin</th>
                <th style={styles.th}>Auditor Líder</th>
                <th style={styles.th}>Estado</th>
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
                      {new Date(schedule.plannedStartDate).toLocaleDateString('es-MX')}
                    </td>
                    <td style={styles.td}>
                      {new Date(schedule.plannedEndDate).toLocaleDateString('es-MX')}
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
