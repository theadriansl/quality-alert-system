import React, { useState, useEffect } from 'react';

const D4TemporaryCountermeasure = ({ data, onDataUpdate, language = 'es', isBlocked = false }) => {
  const [formData, setFormData] = useState({
    d4TemporaryCountermeasure: '',
    d4ResponsibleUserId: null,
    d4ImplementationDate: '',
    d4EffectivenessEvaluation: '',
    d4Completed: false
  });

  const [users, setUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load users list
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
        d4TemporaryCountermeasure: data.d4TemporaryCountermeasure || '',
        d4ResponsibleUserId: data.d4ResponsibleUserId || null,
        d4ImplementationDate: data.d4ImplementationDate || '',
        d4EffectivenessEvaluation: data.d4EffectivenessEvaluation || '',
        d4Completed: data.d4Completed || false
      });
    }
  }, [data]);

  const translations = {
    es: {
      title: 'D4 - Contramedida Temporal',
      subtitle: 'Acción inmediata para contener el problema',
      description: 'Descripción de la Contramedida Temporal',
      descriptionPlaceholder: 'Describe la acción inmediata implementada para contener el problema mientras se analiza la causa raíz...',
      responsible: 'Responsable',
      responsiblePlaceholder: 'Selecciona el responsable',
      implementationDate: 'Fecha de Implementación',
      effectiveness: 'Evaluación de Efectividad',
      effectivenessPlaceholder: 'Describe qué tan efectiva fue la contramedida temporal...',
      markComplete: 'Marcar D4 como Completada',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      blocked: 'Esta sección está bloqueada hasta que D1-D2-D3 sean aprobadas',
      required: 'Campo requerido'
    },
    en: {
      title: 'D4 - Temporary Countermeasure',
      subtitle: 'Immediate action to contain the problem',
      description: 'Temporary Countermeasure Description',
      descriptionPlaceholder: 'Describe the immediate action taken to contain the problem while root cause is analyzed...',
      responsible: 'Responsible',
      responsiblePlaceholder: 'Select responsible person',
      implementationDate: 'Implementation Date',
      effectiveness: 'Effectiveness Evaluation',
      effectivenessPlaceholder: 'Describe how effective the temporary countermeasure was...',
      markComplete: 'Mark D4 as Complete',
      save: 'Save Changes',
      saving: 'Saving...',
      blocked: 'This section is blocked until D1-D2-D3 are approved',
      required: 'Required field'
    }
  };

  const t = translations[language] || translations.es;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (isBlocked) {
      alert(' Esta sección está bloqueada hasta que D1-D2-D3 sean aprobadas');
      return;
    }

    // Validation
    if (!formData.d4TemporaryCountermeasure.trim()) {
      alert(' Debes describir la contramedida temporal');
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate({
        ...formData,
        d4Completed: formData.d4Completed
      });
      alert(' D4 - Contramedida Temporal guardada exitosamente');
    } catch (error) {
      console.error('Error saving D4:', error);
      alert(' Error al guardar D4');
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
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
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
        {/* Contramedida Temporal */}
        <div style={styles.section}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              {t.description}
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={styles.textarea}
              value={formData.d4TemporaryCountermeasure}
              onChange={(e) => handleInputChange('d4TemporaryCountermeasure', e.target.value)}
              placeholder={t.descriptionPlaceholder}
              disabled={isBlocked}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.responsible}</label>
              <select
                style={styles.select}
                value={formData.d4ResponsibleUserId || ''}
                onChange={(e) => handleInputChange('d4ResponsibleUserId', parseInt(e.target.value) || null)}
                disabled={isBlocked}
              >
                <option value="">{t.responsiblePlaceholder}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.position}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.implementationDate}</label>
              <input
                type="date"
                style={styles.input}
                value={formData.d4ImplementationDate}
                onChange={(e) => handleInputChange('d4ImplementationDate', e.target.value)}
                disabled={isBlocked}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t.effectiveness}</label>
            <textarea
              style={styles.textarea}
              value={formData.d4EffectivenessEvaluation}
              onChange={(e) => handleInputChange('d4EffectivenessEvaluation', e.target.value)}
              placeholder={t.effectivenessPlaceholder}
              disabled={isBlocked}
              rows="4"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d4Completed}
                onChange={(e) => handleInputChange('d4Completed', e.target.checked)}
                disabled={isBlocked}
              />
              {t.markComplete}
            </label>
          </div>
        </div>

        {/* Action Buttons */}
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

export default D4TemporaryCountermeasure;
