import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditPrograms = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [programs, setPrograms] = useState([]);

  const L = {
    en: {
      draft: 'Draft', approved: 'Approved', inProgress: 'In Progress', completed: 'Completed',
      connectionError: 'Connection error', createError: 'Error creating program',
      loading: 'Loading audit programs...', title: 'Audit Programs', subtitle: 'Annual ISO audit program management',
      newProgram: '+ New Program', dashboard: 'Dashboard', home: 'Home',
      allStatuses: 'All statuses', noPrograms: 'No audit programs',
      createHint: 'Create a new program to start planning audits', noDescription: 'No description',
      year: 'Year', system: 'System', auditsCompleted: 'audits completed',
      newProgramTitle: 'New Audit Program', auditType: 'Audit Type',
      internal: 'Internal', supplier: 'Supplier', process: 'Process', product: 'Product',
      programName: 'Program Name', programNamePlaceholder: 'E.g.: Internal Audit Program 2026',
      description: 'Description', descriptionPlaceholder: 'Program description...',
      criteria: 'Criteria/Standard', internalProcedures: 'Internal Procedures',
      frequencyBasis: 'Frequency Basis', riskBased: 'Risk Based', quarterly: 'Quarterly',
      semiannual: 'Semiannual', annual: 'Annual',
      scope: 'Scope', scopePlaceholder: 'Processes, departments or included areas...',
      objectives: 'Objectives', objectivesPlaceholder: 'Audit program objectives...',
      cancel: 'Cancel', createProgram: 'Create Program'
    },
    es: {
      draft: 'Borrador', approved: 'Aprobado', inProgress: 'En Proceso', completed: 'Completado',
      connectionError: 'Error de conexión', createError: 'Error al crear programa',
      loading: 'Cargando programas de auditoría...', title: 'Programas de Auditoría', subtitle: 'Gestión de programas anuales de auditoría ISO',
      newProgram: '+ Nuevo Programa', dashboard: 'Dashboard', home: 'Inicio',
      allStatuses: 'Todos los estados', noPrograms: 'No hay programas de auditoría',
      createHint: 'Crea un nuevo programa para comenzar a planificar auditorías', noDescription: 'Sin descripción',
      year: 'Año', system: 'Sistema', auditsCompleted: 'auditorías completadas',
      newProgramTitle: 'Nuevo Programa de Auditoría', auditType: 'Tipo de Auditoría',
      internal: 'Interna', supplier: 'Proveedor', process: 'Proceso', product: 'Producto',
      programName: 'Nombre del Programa', programNamePlaceholder: 'Ej: Programa de Auditorías Internas 2026',
      description: 'Descripción', descriptionPlaceholder: 'Descripción del programa...',
      criteria: 'Criterios/Norma', internalProcedures: 'Procedimientos internos',
      frequencyBasis: 'Base de Frecuencia', riskBased: 'Basado en Riesgo', quarterly: 'Trimestral',
      semiannual: 'Semestral', annual: 'Anual',
      scope: 'Alcance', scopePlaceholder: 'Procesos, departamentos o áreas incluidas...',
      objectives: 'Objetivos', objectivesPlaceholder: 'Objetivos del programa de auditoría...',
      cancel: 'Cancelar', createProgram: 'Crear Programa'
    }
  }[language] || {};
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
    draft: { color: t.textMuted, label: L.draft },
    approved: { color: t.accent, label: L.approved },
    in_progress: { color: t.warning, label: L.inProgress },
    completed: { color: t.success, label: L.completed }
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
      setError(L.connectionError);
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
      alert(L.createError);
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
          {L.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{L.title}</h1>
          <p style={styles.subtitle}>{L.subtitle}</p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
            onClick={() => setShowCreateModal(true)}
          >
            {L.newProgram}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             {L.dashboard}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← {L.home}
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
          <option value="">{L.allStatuses}</option>
          <option value="draft">{L.draft}</option>
          <option value="approved">{L.approved}</option>
          <option value="in_progress">{L.inProgress}</option>
          <option value="completed">{L.completed}</option>
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
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>{L.noPrograms}</p>
          <p>{L.createHint}</p>
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
                    {program.description || L.noDescription}
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
                  <span>{L.year} {program.year}</span>
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
                  <span>{program.createdByName || L.system}</span>
                </div>
              </div>

              <div style={styles.progress}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                </div>
                <p style={styles.progressText}>
                  {program.completedAudits || 0} / {program.totalAudits || 0} {L.auditsCompleted} ({progress}%)
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
            <h2 style={styles.modalTitle}>{L.newProgramTitle}</h2>

            <div style={styles.grid2}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{L.year}</label>
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
                <label style={styles.label}>{L.auditType}</label>
                <select
                  value={newProgram.auditType}
                  onChange={(e) => setNewProgram({ ...newProgram, auditType: e.target.value })}
                  style={styles.input}
                >
                  <option value="interna">{L.internal}</option>
                  <option value="proveedor">{L.supplier}</option>
                  <option value="proceso">{L.process}</option>
                  <option value="producto">{L.product}</option>
                  <option value="sistema">{L.system}</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.programName} *</label>
              <input
                type="text"
                value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                placeholder={L.programNamePlaceholder}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.description}</label>
              <textarea
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                placeholder={L.descriptionPlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={styles.grid2}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{L.criteria}</label>
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
                  <option value="Procedimientos internos">{L.internalProcedures}</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{L.frequencyBasis}</label>
                <select
                  value={newProgram.frequencyBasis}
                  onChange={(e) => setNewProgram({ ...newProgram, frequencyBasis: e.target.value })}
                  style={styles.input}
                >
                  <option value="riesgo">{L.riskBased}</option>
                  <option value="trimestral">{L.quarterly}</option>
                  <option value="semestral">{L.semiannual}</option>
                  <option value="anual">{L.annual}</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.scope}</label>
              <textarea
                value={newProgram.scope}
                onChange={(e) => setNewProgram({ ...newProgram, scope: e.target.value })}
                placeholder={L.scopePlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.objectives}</label>
              <textarea
                value={newProgram.objectives}
                onChange={(e) => setNewProgram({ ...newProgram, objectives: e.target.value })}
                placeholder={L.objectivesPlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setShowCreateModal(false)}
              >
                {L.cancel}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
                onClick={createProgram}
                disabled={!newProgram.name}
              >
                {L.createProgram}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPrograms;
