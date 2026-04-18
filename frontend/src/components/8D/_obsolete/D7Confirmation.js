import React, { useState, useEffect } from 'react';

const D7Confirmation = ({ data, onDataUpdate, language = 'es', isBlocked = false }) => {
  const [formData, setFormData] = useState({
    d7TemporaryValidation: '',
    d7DefinitiveValidation: '',
    d7ValidationDate: '',
    d7IsEffective: null, // true, false, or null
    d7ValidationEvidence: '',
    d7ApprovedBy: null,
    d7ApprovedAt: '',
    d7Completed: false
  });

  const [users, setUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/users/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        setUsers(result.filter(u => u.role === 'quality_manager' || u.role === 'admin') || []);
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
        d7TemporaryValidation: data.d7TemporaryValidation || '',
        d7DefinitiveValidation: data.d7DefinitiveValidation || '',
        d7ValidationDate: data.d7ValidationDate || '',
        d7IsEffective: data.d7IsEffective ?? null,
        d7ValidationEvidence: data.d7ValidationEvidence || '',
        d7ApprovedBy: data.d7ApprovedBy || null,
        d7ApprovedAt: data.d7ApprovedAt || '',
        d7Completed: data.d7Completed || false
      });
    }
  }, [data]);

  const translations = {
    es: {
      title: 'D7 - Confirmación de Contramedidas',
      subtitle: 'Validación de la efectividad de contramedidas temporales y definitivas',
      temporaryValidation: 'Validación de Contramedida Temporal (D4)',
      temporaryPlaceholder: 'Describe los resultados de la validación de la contramedida temporal...',
      definitiveValidation: 'Validación de Contramedida Definitiva (D6)',
      definitivePlaceholder: 'Describe los resultados de la validación de la contramedida definitiva...',
      validationDate: 'Fecha de Validación',
      effectiveness: 'Efectividad Confirmada',
      effectiveYes: 'Sí - Las contramedidas son efectivas',
      effectiveNo: 'No - Se requieren ajustes',
      effectivePending: 'Pendiente de validación',
      validationEvidence: 'Evidencia de Validación',
      evidencePlaceholder: 'Describe la evidencia que demuestra la efectividad (datos, mediciones, pruebas)...',
      approvedBy: 'Aprobado por (Quality Manager)',
      approvalDate: 'Fecha de Aprobación',
      markComplete: 'Marcar D7 como Completada',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      blocked: 'Esta sección está bloqueada hasta que D4, D5 y D6 estén completadas',
      required: 'Campo requerido'
    },
    en: {
      title: 'D7 - Countermeasure Confirmation',
      subtitle: 'Validation of temporary and definitive countermeasures effectiveness',
      temporaryValidation: 'Temporary Countermeasure Validation (D4)',
      temporaryPlaceholder: 'Describe the validation results of the temporary countermeasure...',
      definitiveValidation: 'Definitive Countermeasure Validation (D6)',
      definitivePlaceholder: 'Describe the validation results of the definitive countermeasure...',
      validationDate: 'Validation Date',
      effectiveness: 'Confirmed Effectiveness',
      effectiveYes: 'Yes - Countermeasures are effective',
      effectiveNo: 'No - Adjustments required',
      effectivePending: 'Pending validation',
      validationEvidence: 'Validation Evidence',
      evidencePlaceholder: 'Describe evidence demonstrating effectiveness (data, measurements, tests)...',
      approvedBy: 'Approved by (Quality Manager)',
      approvalDate: 'Approval Date',
      markComplete: 'Mark D7 as Complete',
      save: 'Save Changes',
      saving: 'Saving...',
      blocked: 'This section is blocked until D4, D5, and D6 are completed',
      required: 'Required field'
    }
  };

  const t = translations[language] || translations.es;

  const handleSave = async () => {
    if (isBlocked) {
      alert(' Esta sección está bloqueada hasta que D4, D5 y D6 estén completadas');
      return;
    }

    // Validation
    if (!formData.d7TemporaryValidation.trim() || !formData.d7DefinitiveValidation.trim()) {
      alert(' Debes validar ambas contramedidas (temporal y definitiva)');
      return;
    }

    if (formData.d7IsEffective === null) {
      alert(' Debes confirmar si las contramedidas son efectivas');
      return;
    }

    setIsSaving(true);
    try {
      // If marking as complete and effective, auto-set approval date
      const dataToSave = { ...formData };
      if (formData.d7Completed && formData.d7IsEffective && !formData.d7ApprovedAt) {
        dataToSave.d7ApprovedAt = new Date().toISOString();
      }

      await onDataUpdate(dataToSave);
      alert(' D7 - Confirmación guardada exitosamente');
    } catch (error) {
      console.error('Error saving D7:', error);
      alert(' Error al guardar D7');
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
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '16px'
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
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: '#374151',
      cursor: 'pointer',
      padding: '12px',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #E6EAEE'
    },
    radioLabelSelected: {
      borderColor: '#0072CE',
      backgroundColor: '#eff6ff'
    },
    radio: {
      marginRight: '12px',
      width: '18px',
      height: '18px',
      cursor: 'pointer'
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
        {/* Temporary Countermeasure Validation */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}> {t.temporaryValidation}</div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Resultados de Validación
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={styles.textarea}
              value={formData.d7TemporaryValidation}
              onChange={(e) => setFormData(prev => ({ ...prev, d7TemporaryValidation: e.target.value }))}
              placeholder={t.temporaryPlaceholder}
              disabled={isBlocked}
            />
          </div>
        </div>

        {/* Definitive Countermeasure Validation */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}> {t.definitiveValidation}</div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Resultados de Validación
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={styles.textarea}
              value={formData.d7DefinitiveValidation}
              onChange={(e) => setFormData(prev => ({ ...prev, d7DefinitiveValidation: e.target.value }))}
              placeholder={t.definitivePlaceholder}
              disabled={isBlocked}
            />
          </div>
        </div>

        {/* Validation Results */}
        <div style={styles.section}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.validationDate}</label>
            <input
              type="date"
              style={styles.input}
              value={formData.d7ValidationDate}
              onChange={(e) => setFormData(prev => ({ ...prev, d7ValidationDate: e.target.value }))}
              disabled={isBlocked}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              {t.effectiveness}
              <span style={styles.required}>*</span>
            </label>
            <div style={styles.radioGroup}>
              <label
                style={{
                  ...styles.radioLabel,
                  ...(formData.d7IsEffective === true ? styles.radioLabelSelected : {})
                }}
              >
                <input
                  type="radio"
                  style={styles.radio}
                  checked={formData.d7IsEffective === true}
                  onChange={() => setFormData(prev => ({ ...prev, d7IsEffective: true }))}
                  disabled={isBlocked}
                />
                 {t.effectiveYes}
              </label>

              <label
                style={{
                  ...styles.radioLabel,
                  ...(formData.d7IsEffective === false ? styles.radioLabelSelected : {})
                }}
              >
                <input
                  type="radio"
                  style={styles.radio}
                  checked={formData.d7IsEffective === false}
                  onChange={() => setFormData(prev => ({ ...prev, d7IsEffective: false }))}
                  disabled={isBlocked}
                />
                 {t.effectiveNo}
              </label>

              <label
                style={{
                  ...styles.radioLabel,
                  ...(formData.d7IsEffective === null ? styles.radioLabelSelected : {})
                }}
              >
                <input
                  type="radio"
                  style={styles.radio}
                  checked={formData.d7IsEffective === null}
                  onChange={() => setFormData(prev => ({ ...prev, d7IsEffective: null }))}
                  disabled={isBlocked}
                />
                 {t.effectivePending}
              </label>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              {t.validationEvidence}
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={styles.textarea}
              value={formData.d7ValidationEvidence}
              onChange={(e) => setFormData(prev => ({ ...prev, d7ValidationEvidence: e.target.value }))}
              placeholder={t.evidencePlaceholder}
              disabled={isBlocked}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.approvedBy}</label>
              <select
                style={styles.select}
                value={formData.d7ApprovedBy || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, d7ApprovedBy: parseInt(e.target.value) || null }))}
                disabled={isBlocked}
              >
                <option value="">Seleccionar Quality Manager...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.position}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.approvalDate}</label>
              <input
                type="date"
                style={styles.input}
                value={formData.d7ApprovedAt ? formData.d7ApprovedAt.split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, d7ApprovedAt: e.target.value ? `${e.target.value}T00:00:00` : '' }))}
                disabled={isBlocked}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d7Completed}
                onChange={(e) => setFormData(prev => ({ ...prev, d7Completed: e.target.checked }))}
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

export default D7Confirmation;
