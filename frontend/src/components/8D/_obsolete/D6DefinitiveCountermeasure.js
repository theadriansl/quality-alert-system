import React, { useState, useEffect } from 'react';

const D6DefinitiveCountermeasure = ({ data, onDataUpdate, language = 'es', isBlocked = false }) => {
  const [formData, setFormData] = useState({
    d6DefinitiveActions: [],
    d6ImplementationPlan: {
      timeline: '',
      resources: '',
      milestones: []
    },
    d6ValidationResults: '',
    d6Completed: false
  });

  const [newAction, setNewAction] = useState({
    description: '',
    responsible: null,
    targetDate: '',
    status: 'pending'
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
        d6DefinitiveActions: data.d6DefinitiveActions || [],
        d6ImplementationPlan: data.d6ImplementationPlan || formData.d6ImplementationPlan,
        d6ValidationResults: data.d6ValidationResults || '',
        d6Completed: data.d6Completed || false
      });
    }
  }, [data]);

  const translations = {
    es: {
      title: 'D6 - Contramedida Definitiva',
      subtitle: 'Acciones permanentes para eliminar la causa raíz',
      definitiveActions: 'Acciones Correctivas Definitivas',
      actionDescription: 'Descripción de la Acción',
      actionPlaceholder: 'Describe la acción correctiva permanente...',
      responsible: 'Responsable',
      targetDate: 'Fecha Objetivo',
      status: 'Estado',
      addAction: 'Agregar Acción',
      removeAction: 'Eliminar',
      noActions: 'No hay acciones definidas. Agrega al menos una acción correctiva definitiva.',
      implementationPlan: 'Plan de Implementación',
      timeline: 'Cronograma General',
      timelinePlaceholder: 'Describe el cronograma general de implementación...',
      resources: 'Recursos Necesarios',
      resourcesPlaceholder: 'Lista los recursos necesarios (personal, materiales, presupuesto)...',
      validationResults: 'Resultados de Validación Inicial',
      validationPlaceholder: 'Describe los resultados de la validación inicial de las acciones...',
      markComplete: 'Marcar D6 como Completada',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      blocked: 'Esta sección está bloqueada',
      required: 'Campo requerido',
      statuses: {
        pending: 'Pendiente',
        in_progress: 'En Progreso',
        completed: 'Completada',
        cancelled: 'Cancelada'
      }
    },
    en: {
      title: 'D6 - Definitive Countermeasure',
      subtitle: 'Permanent actions to eliminate root cause',
      definitiveActions: 'Definitive Corrective Actions',
      actionDescription: 'Action Description',
      actionPlaceholder: 'Describe the permanent corrective action...',
      responsible: 'Responsible',
      targetDate: 'Target Date',
      status: 'Status',
      addAction: 'Add Action',
      removeAction: 'Remove',
      noActions: 'No actions defined. Add at least one definitive corrective action.',
      implementationPlan: 'Implementation Plan',
      timeline: 'General Timeline',
      timelinePlaceholder: 'Describe the general implementation timeline...',
      resources: 'Required Resources',
      resourcesPlaceholder: 'List required resources (personnel, materials, budget)...',
      validationResults: 'Initial Validation Results',
      validationPlaceholder: 'Describe initial validation results of the actions...',
      markComplete: 'Mark D6 as Complete',
      save: 'Save Changes',
      saving: 'Saving...',
      blocked: 'This section is blocked',
      required: 'Required field',
      statuses: {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled'
      }
    }
  };

  const t = translations[language] || translations.es;

  const handleAddAction = () => {
    if (!newAction.description.trim()) {
      alert(' Debes describir la acción');
      return;
    }

    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: [
        ...prev.d6DefinitiveActions,
        {
          id: Date.now(),
          description: newAction.description,
          responsible: newAction.responsible,
          targetDate: newAction.targetDate,
          status: newAction.status
        }
      ]
    }));

    setNewAction({
      description: '',
      responsible: null,
      targetDate: '',
      status: 'pending'
    });
  };

  const handleRemoveAction = (actionId) => {
    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: prev.d6DefinitiveActions.filter(action => action.id !== actionId)
    }));
  };

  const handleUpdateAction = (actionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: prev.d6DefinitiveActions.map(action =>
        action.id === actionId ? { ...action, [field]: value } : action
      )
    }));
  };

  const handleSave = async () => {
    if (isBlocked) {
      alert(' Esta sección está bloqueada');
      return;
    }

    if (formData.d6DefinitiveActions.length === 0) {
      alert(' Debes agregar al menos una acción correctiva definitiva');
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate(formData);
      alert(' D6 - Contramedida Definitiva guardada exitosamente');
    } catch (error) {
      console.error('Error saving D6:', error);
      alert(' Error al guardar D6');
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
      minHeight: '100px',
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
    actionCard: {
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #E6EAEE',
      marginBottom: '12px'
    },
    actionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    actionNumber: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0072CE'
    },
    removeButton: {
      padding: '6px 12px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    addActionCard: {
      backgroundColor: '#f0f9ff',
      padding: '16px',
      borderRadius: '8px',
      border: '1px dashed #0072CE',
      marginBottom: '16px'
    },
    addButton: {
      padding: '10px 20px',
      backgroundColor: '#2E7D32',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      marginTop: '12px'
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
    },
    emptyState: {
      textAlign: 'center',
      padding: '32px',
      color: '#6b7280',
      fontSize: '14px'
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
        {/* Definitive Actions List */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t.definitiveActions}</div>

          {formData.d6DefinitiveActions.length === 0 && (
            <div style={styles.emptyState}>
              {t.noActions}
            </div>
          )}

          {formData.d6DefinitiveActions.map((action, index) => (
            <div key={action.id} style={styles.actionCard}>
              <div style={styles.actionHeader}>
                <div style={styles.actionNumber}>
                  Acción #{index + 1}
                </div>
                <button
                  onClick={() => handleRemoveAction(action.id)}
                  style={styles.removeButton}
                  disabled={isBlocked}
                >
                  {t.removeAction}
                </button>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{t.actionDescription}</label>
                <textarea
                  style={styles.textarea}
                  value={action.description}
                  onChange={(e) => handleUpdateAction(action.id, 'description', e.target.value)}
                  placeholder={t.actionPlaceholder}
                  disabled={isBlocked}
                  rows="3"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.responsible}</label>
                  <select
                    style={styles.select}
                    value={action.responsible || ''}
                    onChange={(e) => handleUpdateAction(action.id, 'responsible', parseInt(e.target.value) || null)}
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
                  <label style={styles.label}>{t.targetDate}</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={action.targetDate}
                    onChange={(e) => handleUpdateAction(action.id, 'targetDate', e.target.value)}
                    disabled={isBlocked}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.status}</label>
                  <select
                    style={styles.select}
                    value={action.status}
                    onChange={(e) => handleUpdateAction(action.id, 'status', e.target.value)}
                    disabled={isBlocked}
                  >
                    <option value="pending">{t.statuses.pending}</option>
                    <option value="in_progress">{t.statuses.in_progress}</option>
                    <option value="completed">{t.statuses.completed}</option>
                    <option value="cancelled">{t.statuses.cancelled}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Action */}
          <div style={styles.addActionCard}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                {t.actionDescription}
                <span style={styles.required}>*</span>
              </label>
              <textarea
                style={styles.textarea}
                value={newAction.description}
                onChange={(e) => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t.actionPlaceholder}
                disabled={isBlocked}
                rows="3"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.responsible}</label>
                <select
                  style={styles.select}
                  value={newAction.responsible || ''}
                  onChange={(e) => setNewAction(prev => ({ ...prev, responsible: parseInt(e.target.value) || null }))}
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
                <label style={styles.label}>{t.targetDate}</label>
                <input
                  type="date"
                  style={styles.input}
                  value={newAction.targetDate}
                  onChange={(e) => setNewAction(prev => ({ ...prev, targetDate: e.target.value }))}
                  disabled={isBlocked}
                />
              </div>
            </div>

            <button
              onClick={handleAddAction}
              style={styles.addButton}
              disabled={isBlocked}
            >
              + {t.addAction}
            </button>
          </div>
        </div>

        {/* Implementation Plan */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t.implementationPlan}</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t.timeline}</label>
            <textarea
              style={styles.textarea}
              value={formData.d6ImplementationPlan.timeline}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                d6ImplementationPlan: { ...prev.d6ImplementationPlan, timeline: e.target.value }
              }))}
              placeholder={t.timelinePlaceholder}
              disabled={isBlocked}
              rows="3"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t.resources}</label>
            <textarea
              style={styles.textarea}
              value={formData.d6ImplementationPlan.resources}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                d6ImplementationPlan: { ...prev.d6ImplementationPlan, resources: e.target.value }
              }))}
              placeholder={t.resourcesPlaceholder}
              disabled={isBlocked}
              rows="3"
            />
          </div>
        </div>

        {/* Validation Results */}
        <div style={styles.section}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.validationResults}</label>
            <textarea
              style={styles.textarea}
              value={formData.d6ValidationResults}
              onChange={(e) => setFormData(prev => ({ ...prev, d6ValidationResults: e.target.value }))}
              placeholder={t.validationPlaceholder}
              disabled={isBlocked}
              rows="4"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d6Completed}
                onChange={(e) => setFormData(prev => ({ ...prev, d6Completed: e.target.checked }))}
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

export default D6DefinitiveCountermeasure;
