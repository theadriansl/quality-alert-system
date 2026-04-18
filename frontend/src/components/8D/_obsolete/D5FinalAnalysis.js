import React, { useState, useEffect } from 'react';

const D5FinalAnalysis = ({ data, onDataUpdate, language = 'es', isBlocked = false }) => {
  const [formData, setFormData] = useState({
    d5RootCauseAnalysis: '',
    d5CauseVerification: '',
    d5AnalysisTools: '',
    d5ResponsibleUserId: null,
    d5CompletionDate: '',
    d5Completed: false
  });

  const [users, setUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const translations = {
    es: {
      title: 'D5 - Análisis Final de Causa Raíz',
      subtitle: 'Identificación y verificación de la causa raíz del problema',
      rootCauseAnalysis: 'Análisis de Causa Raíz',
      rootCausePlaceholder: 'Describe el análisis de la causa raíz identificada...',
      causeVerification: 'Verificación de la Causa',
      causeVerificationPlaceholder: 'Describe cómo se verificó que esta es la causa raíz real...',
      analysisTools: 'Herramientas de Análisis Utilizadas',
      analysisToolsPlaceholder: '5 Porqués, Ishikawa, Pareto, etc...',
      responsible: 'Responsable del Análisis',
      completionDate: 'Fecha de Completación',
      markComplete: 'Marcar D5 como Completada',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      blocked: 'Esta sección está bloqueada hasta que D4 esté completada',
      required: 'Campo requerido'
    },
    en: {
      title: 'D5 - Root Cause Final Analysis',
      subtitle: 'Identification and verification of the problem root cause',
      rootCauseAnalysis: 'Root Cause Analysis',
      rootCausePlaceholder: 'Describe the analysis of the identified root cause...',
      causeVerification: 'Cause Verification',
      causeVerificationPlaceholder: 'Describe how it was verified that this is the real root cause...',
      analysisTools: 'Analysis Tools Used',
      analysisToolsPlaceholder: '5 Whys, Ishikawa, Pareto, etc...',
      responsible: 'Analysis Responsible',
      completionDate: 'Completion Date',
      markComplete: 'Mark D5 as Complete',
      save: 'Save Changes',
      saving: 'Saving...',
      blocked: 'This section is blocked until D4 is completed',
      required: 'Required field'
    }
  };

  const t = translations[language] || translations.es;

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/users/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        setUsers(result.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Load data from props
  useEffect(() => {
    if (data) {
      setFormData({
        d5RootCauseAnalysis: data.d5RootCauseAnalysis || '',
        d5CauseVerification: data.d5CauseVerification || '',
        d5AnalysisTools: data.d5AnalysisTools || '',
        d5ResponsibleUserId: data.d5ResponsibleUserId || null,
        d5CompletionDate: data.d5CompletionDate || '',
        d5Completed: data.d5Completed || false
      });
    }
  }, [data]);

  const handleSave = async () => {
    if (isBlocked) {
      alert(' Esta sección está bloqueada');
      return;
    }

    if (!formData.d5RootCauseAnalysis.trim()) {
      alert(' Debes describir el análisis de causa raíz');
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate(formData);
      alert(' D5 - Análisis Final guardado exitosamente');
    } catch (error) {
      console.error('Error saving D5:', error);
      alert(' Error al guardar D5');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '24px',
      borderBottom: '2px solid #0072CE',
      paddingBottom: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280'
    },
    section: {
      backgroundColor: '#FAFBFC',
      padding: '24px',
      borderRadius: '8px',
      marginBottom: '24px',
      border: '1px solid #E6EAEE'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    required: {
      color: '#ef4444',
      marginLeft: '4px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    checkbox: {
      marginRight: '8px',
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: '#374151',
      cursor: 'pointer'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: '#0072CE',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    blockedOverlay: {
      position: 'relative',
      opacity: 0.6,
      pointerEvents: 'none'
    },
    blockedMessage: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: '#B00020',
      fontSize: '14px',
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}> {t.title}</div>
        <div style={styles.subtitle}>{t.subtitle}</div>
      </div>

      {isBlocked && (
        <div style={styles.blockedMessage}>
           {t.blocked}
        </div>
      )}

      <div style={isBlocked ? styles.blockedOverlay : {}}>
        <div style={styles.section}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              {t.rootCauseAnalysis}
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={styles.textarea}
              value={formData.d5RootCauseAnalysis}
              onChange={(e) => setFormData(prev => ({ ...prev, d5RootCauseAnalysis: e.target.value }))}
              placeholder={t.rootCausePlaceholder}
              disabled={isBlocked}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t.causeVerification}</label>
            <textarea
              style={styles.textarea}
              value={formData.d5CauseVerification}
              onChange={(e) => setFormData(prev => ({ ...prev, d5CauseVerification: e.target.value }))}
              placeholder={t.causeVerificationPlaceholder}
              disabled={isBlocked}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t.analysisTools}</label>
            <input
              type="text"
              style={styles.input}
              value={formData.d5AnalysisTools}
              onChange={(e) => setFormData(prev => ({ ...prev, d5AnalysisTools: e.target.value }))}
              placeholder={t.analysisToolsPlaceholder}
              disabled={isBlocked}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.responsible}</label>
              <select
                style={styles.select}
                value={formData.d5ResponsibleUserId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, d5ResponsibleUserId: parseInt(e.target.value) || null }))}
                disabled={isBlocked}
              >
                <option value="">Seleccionar...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.completionDate}</label>
              <input
                type="date"
                style={styles.input}
                value={formData.d5CompletionDate}
                onChange={(e) => setFormData(prev => ({ ...prev, d5CompletionDate: e.target.value }))}
                disabled={isBlocked}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d5Completed}
                onChange={(e) => setFormData(prev => ({ ...prev, d5Completed: e.target.checked }))}
                disabled={isBlocked}
              />
              {t.markComplete}
            </label>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button
            onClick={handleSave}
            disabled={isBlocked || isSaving}
            style={{
              ...styles.saveButton,
              opacity: isBlocked || isSaving ? 0.5 : 1,
              cursor: isBlocked || isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default D5FinalAnalysis;
