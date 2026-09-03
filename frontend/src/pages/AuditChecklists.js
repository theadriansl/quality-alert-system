import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditChecklists = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [checklists, setChecklists] = useState([]);

  const L = {
    en: {
      connectionError: 'Connection error', createError: 'Error creating checklist', cloneError: 'Error cloning checklist',
      loading: 'Loading checklists...', title: 'Audit Checklists', subtitle: 'Verification templates for ISO audits',
      newChecklist: '+ New Checklist', dashboard: 'Dashboard', home: 'Home',
      allStandards: 'All standards', noChecklists: 'No checklists available', createHint: 'Create a new checklist to start',
      noDescription: 'No description', questions: 'questions', edit: 'Edit', clone: 'Clone',
      newChecklistTitle: 'New Checklist', name: 'Name', namePlaceholder: 'E.g.: ISO 9001 Production Audit',
      description: 'Description', descriptionPlaceholder: 'Checklist description...',
      standard: 'Standard', internalProcedures: 'Internal Procedures', version: 'Version',
      process: 'Process', processPlaceholder: 'E.g.: Production, Warehouse, Purchasing...',
      cancel: 'Cancel', createChecklist: 'Create Checklist',
      clonePrompt: 'Name for the new checklist:'
    },
    es: {
      connectionError: 'Error de conexión', createError: 'Error al crear checklist', cloneError: 'Error al clonar checklist',
      loading: 'Cargando checklists...', title: 'Checklists de Auditoría', subtitle: 'Plantillas de verificación para auditorías ISO',
      newChecklist: '+ Nuevo Checklist', dashboard: 'Dashboard', home: 'Inicio',
      allStandards: 'Todas las normas', noChecklists: 'No hay checklists disponibles', createHint: 'Crea un nuevo checklist para comenzar',
      noDescription: 'Sin descripción', questions: 'preguntas', edit: 'Editar', clone: 'Clonar',
      newChecklistTitle: 'Nuevo Checklist', name: 'Nombre', namePlaceholder: 'Ej: Auditoría de Producción ISO 9001',
      description: 'Descripción', descriptionPlaceholder: 'Descripción del checklist...',
      standard: 'Norma/Estándar', internalProcedures: 'Procedimientos internos', version: 'Versión',
      process: 'Proceso', processPlaceholder: 'Ej: Producción, Almacén, Compras...',
      cancel: 'Cancelar', createChecklist: 'Crear Checklist',
      clonePrompt: 'Nombre del nuevo checklist:'
    }
  }[language] || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStandard, setFilterStandard] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    name: '',
    description: '',
    standard: 'ISO 9001:2015',
    process: '',
    version: '1.0'
  });

  const loadChecklists = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API_URL}/audit/checklists?active=true`;
      if (filterStandard) url += `&standard=${encodeURIComponent(filterStandard)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setChecklists(result.checklists);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [filterStandard]);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  const createChecklist = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newChecklist)
      });
      const result = await res.json();

      if (result.success) {
        setShowCreateModal(false);
        setNewChecklist({ name: '', description: '', standard: 'ISO 9001:2015', process: '', version: '1.0' });
        navigate(`/audit-checklist/${result.checklist.id}`);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.createError);
    }
  };

  const cloneChecklist = async (id, name) => {
    const newName = prompt(L.clonePrompt, `${name} (Copy)`);
    if (!newName) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/checklists/${id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newName })
      });
      const result = await res.json();

      if (result.success) {
        navigate(`/audit-checklist/${result.checklist.id}`);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.cloneError);
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
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid transparent'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: `${t.accent}20`,
      color: t.accent
    },
    cardDescription: {
      fontSize: '13px',
      color: t.textMuted,
      marginBottom: '12px'
    },
    cardMeta: {
      display: 'flex',
      gap: '16px',
      fontSize: '12px',
      color: t.textDim,
      flexWrap: 'wrap'
    },
    cardActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${t.border}`
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
      maxWidth: '500px',
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
    empty: {
      textAlign: 'center',
      padding: '48px',
      color: t.textMuted
    }
  };

  if (loading && checklists.length === 0) {
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
            {L.newChecklist}
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
          value={filterStandard}
          onChange={(e) => setFilterStandard(e.target.value)}
          style={styles.select}
        >
          <option value="">{L.allStandards}</option>
          <option value="ISO 9001">ISO 9001</option>
          <option value="IATF 16949">IATF 16949</option>
          <option value="VDA 6.3">VDA 6.3</option>
          <option value="ISO 14001">ISO 14001</option>
          <option value="ISO 45001">ISO 45001</option>
        </select>
      </div>

      {error && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}`, marginBottom: '24px' }}>
          <p style={{ color: t.error, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Checklists Grid */}
      {checklists.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>{L.noChecklists}</p>
          <p>{L.createHint}</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {checklists.map(checklist => (
            <div
              key={checklist.id}
              style={styles.card}
              onClick={() => navigate(`/audit-checklist/${checklist.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = t.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{checklist.name}</h3>
                <span style={styles.badge}>{checklist.standard || 'General'}</span>
              </div>

              <p style={styles.cardDescription}>
                {checklist.description || L.noDescription}
              </p>

              <div style={styles.cardMeta}>
                <span> {checklist.itemCount || 0} {L.questions}</span>
                <span> v{checklist.version || '1.0'}</span>
                {checklist.process && <span> {checklist.process}</span>}
              </div>

              <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  style={{ ...styles.button, backgroundColor: t.accent, color: 'white', flex: 1 }}
                  onClick={() => navigate(`/audit-checklist/${checklist.id}`)}
                >
                  {L.edit}
                </button>
                <button
                  style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text, flex: 1 }}
                  onClick={() => cloneChecklist(checklist.id, checklist.name)}
                >
                  {L.clone}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{L.newChecklistTitle}</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.name} *</label>
              <input
                type="text"
                value={newChecklist.name}
                onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                placeholder={L.namePlaceholder}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.description}</label>
              <textarea
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                placeholder={L.descriptionPlaceholder}
                style={styles.textarea}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{L.standard}</label>
                <select
                  value={newChecklist.standard}
                  onChange={(e) => setNewChecklist({ ...newChecklist, standard: e.target.value })}
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
                <label style={styles.label}>{L.version}</label>
                <input
                  type="text"
                  value={newChecklist.version}
                  onChange={(e) => setNewChecklist({ ...newChecklist, version: e.target.value })}
                  placeholder="1.0"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.process}</label>
              <input
                type="text"
                value={newChecklist.process}
                onChange={(e) => setNewChecklist({ ...newChecklist, process: e.target.value })}
                placeholder={L.processPlaceholder}
                style={styles.input}
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
                onClick={createChecklist}
                disabled={!newChecklist.name}
              >
                {L.createChecklist}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditChecklists;
