import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const AuditPrograms = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProgram, setNewProgram] = useState({
    year: new Date().getFullYear(),
    name: '',
    description: '',
    auditType: 'interna',
    scope: '',
    objectives: '',
    criteria: 'ISO 9001:2015',
    frequencyBasis: 'riesgo'
  });

  const STATUS_CONFIG = {
    draft: { color: t.textMuted, label: 'Borrador' },
    approved: { color: t.accent, label: 'Aprobado' },
    in_progress: { color: t.warning, label: 'En Proceso' },
    completed: { color: t.success, label: 'Completado' }
  };

  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API_URL}/audit/programs?`;
      if (filterYear) url += `year=${filterYear}&`;
      if (filterStatus) url += `status=${filterStatus}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setPrograms(result.programs);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterStatus]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const createProgram = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProgram)
      });
      const result = await res.json();

      if (result.success) {
        setShowCreateModal(false);
        loadPrograms();
        navigate(`/audit-program/${result.program.id}`);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Error al crear programa');
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
      alignItems: 'center',
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
    filters: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    select: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '16px',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s',
      border: '1px solid transparent'
    },
    programHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    programTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    meta: {
      display: 'flex',
      gap: '24px',
      fontSize: '13px',
      color: t.textMuted,
      flexWrap: 'wrap'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    progress: {
      marginTop: '16px'
    },
    progressBar: {
      height: '8px',
      backgroundColor: t.bgPanel,
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: t.success,
      transition: 'width 0.3s'
    },
    progressText: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '6px'
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
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
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
      minHeight: '80px',
      resize: 'vertical',
      backgroundColor: t.bgCard,
      color: t.text
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    empty: {
      textAlign: 'center',
      padding: '48px',
      color: t.textMuted
    }
  };

  if (loading && programs.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          Cargando programas de auditoría...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Programas de Auditoría</h1>
          <p style={styles.subtitle}>Gestión de programas anuales de auditoría ISO</p>
        </div>
        <div style={styles.buttons}>
          <button
            style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
            onClick={() => setShowCreateModal(true)}
          >
            + Nuevo Programa
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             Dashboard
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← Inicio
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          style={styles.select}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="approved">Aprobado</option>
          <option value="in_progress">En Proceso</option>
          <option value="completed">Completado</option>
        </select>
      </div>

      {/* Programs List */}
      {error && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error, margin: 0 }}>{error}</p>
        </div>
      )}

      {programs.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>No hay programas de auditoría</p>
          <p>Crea un nuevo programa para comenzar a planificar auditorías</p>
        </div>
      ) : (
        programs.map(program => {
          const statusConfig = STATUS_CONFIG[program.status] || STATUS_CONFIG.draft;
          const progress = program.totalAudits > 0
            ? Math.round((program.completedAudits / program.totalAudits) * 100)
            : 0;

          return (
            <div
              key={program.id}
              style={styles.card}
              onClick={() => navigate(`/audit-program/${program.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = t.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={styles.programHeader}>
                <div>
                  <h3 style={styles.programTitle}>{program.name}</h3>
                  <p style={{ fontSize: '14px', color: t.textMuted, marginTop: '4px' }}>
                    {program.description || 'Sin descripción'}
                  </p>
                </div>
                <span style={{
                  ...styles.badge,
                  backgroundColor: `${statusConfig.color}20`,
                  color: statusConfig.color
                }}>
                  {statusConfig.label}
                </span>
              </div>

              <div style={styles.meta}>
                <div style={styles.metaItem}>
                  <span></span>
                  <span>Año {program.year}</span>
                </div>
                <div style={styles.metaItem}>
                  <span></span>
                  <span>{program.auditType || 'General'}</span>
                </div>
                <div style={styles.metaItem}>
                  <span></span>
                  <span>{program.criteria || 'ISO 9001'}</span>
                </div>
                <div style={styles.metaItem}>
                  <span></span>
                  <span>{program.createdByName || 'Sistema'}</span>
                </div>
              </div>

              <div style={styles.progress}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                </div>
                <p style={styles.progressText}>
                  {program.completedAudits || 0} de {program.totalAudits || 0} auditorías completadas ({progress}%)
                </p>
              </div>
            </div>
          );
        })
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Nuevo Programa de Auditoría</h2>

            <div style={styles.grid2}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Año</label>
                <select
                  value={newProgram.year}
                  onChange={(e) => setNewProgram({ ...newProgram, year: parseInt(e.target.value) })}
                  style={styles.input}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Auditoría</label>
                <select
                  value={newProgram.auditType}
                  onChange={(e) => setNewProgram({ ...newProgram, auditType: e.target.value })}
                  style={styles.input}
                >
                  <option value="interna">Interna</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="proceso">Proceso</option>
                  <option value="producto">Producto</option>
                  <option value="sistema">Sistema</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre del Programa *</label>
              <input
                type="text"
                value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                placeholder="Ej: Programa de Auditorías Internas 2026"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Descripción</label>
              <textarea
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                placeholder="Descripción del programa..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.grid2}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Criterios/Norma</label>
                <select
                  value={newProgram.criteria}
                  onChange={(e) => setNewProgram({ ...newProgram, criteria: e.target.value })}
                  style={styles.input}
                >
                  <option value="ISO 9001:2015">ISO 9001:2015</option>
                  <option value="IATF 16949:2016">IATF 16949:2016</option>
                  <option value="VDA 6.3">VDA 6.3</option>
                  <option value="ISO 14001:2015">ISO 14001:2015</option>
                  <option value="ISO 45001:2018">ISO 45001:2018</option>
                  <option value="Procedimientos internos">Procedimientos internos</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Base de Frecuencia</label>
                <select
                  value={newProgram.frequencyBasis}
                  onChange={(e) => setNewProgram({ ...newProgram, frequencyBasis: e.target.value })}
                  style={styles.input}
                >
                  <option value="riesgo">Basado en Riesgo</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Alcance</label>
              <textarea
                value={newProgram.scope}
                onChange={(e) => setNewProgram({ ...newProgram, scope: e.target.value })}
                placeholder="Procesos, departamentos o áreas incluidas..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Objetivos</label>
              <textarea
                value={newProgram.objectives}
                onChange={(e) => setNewProgram({ ...newProgram, objectives: e.target.value })}
                placeholder="Objetivos del programa de auditoría..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
                onClick={createProgram}
                disabled={!newProgram.name}
              >
                Crear Programa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPrograms;
