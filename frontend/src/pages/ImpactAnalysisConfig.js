import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const ImpactAnalysisConfig = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { theme: t } = useTheme();

  // Dynamic styles based on theme
  const styles = useMemo(() => ({
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: t.bg,
      minHeight: '100vh'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '400px',
      gap: '16px'
    },
    spinner: {
      border: `4px solid ${t.border}`,
      borderTop: `4px solid ${t.accent}`,
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      animation: 'spin 1s linear infinite'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px'
    },
    backButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: t.accent,
      cursor: 'pointer',
      fontSize: '14px',
      padding: '4px 0',
      marginBottom: '12px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: t.text,
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted,
      margin: 0
    },
    addButton: {
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    disclaimer: {
      backgroundColor: '#fef3c7',
      border: `2px solid ${t.warning}`,
      borderRadius: '8px',
      padding: '16px 20px',
      marginBottom: '24px',
      fontSize: '14px',
      lineHeight: '1.6'
    },
    areasList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      border: `2px dashed ${t.border}`
    },
    areaCard: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      padding: '20px',
      border: `1px solid ${t.border}`
    },
    areaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    areaInfo: {
      display: 'flex',
      alignItems: 'flex-start',
      flex: 1
    },
    areaName: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      margin: '0 0 4px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    inactiveBadge: {
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: '#fee2e2',
      color: t.error,
      padding: '2px 8px',
      borderRadius: '4px'
    },
    areaDescription: {
      fontSize: '14px',
      color: t.textMuted,
      margin: '0 0 4px 0'
    },
    areaKey: {
      fontSize: '12px',
      color: t.textMuted,
      fontFamily: 'monospace',
      margin: 0
    },
    areaActions: {
      display: 'flex',
      gap: '8px'
    },
    editButton: {
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    deleteButton: {
      backgroundColor: '#fee2e2',
      color: t.error,
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    subsectionsContainer: {
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${t.border}`
    },
    subsectionsTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.text,
      margin: '0 0 12px 0'
    },
    subsectionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '8px'
    },
    subsectionChip: {
      backgroundColor: t.bgPanel,
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      color: t.text
    },
    validatorsContainer: {
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: `1px solid ${t.border}`
    },
    validatorsGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    },
    validatorChip: {
      backgroundColor: '#d1fae5',
      padding: '6px 12px',
      borderRadius: '16px',
      fontSize: '13px',
      color: '#065f46',
      fontWeight: '500'
    },
    modalOverlay: {
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
    modal: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '90vh',
      overflow: 'auto',
      border: `1px solid ${t.border}`
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: `1px solid ${t.border}`
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '28px',
      color: t.textMuted,
      cursor: 'pointer',
      lineHeight: '1',
      padding: 0,
      width: '32px',
      height: '32px'
    },
    modalBody: {
      padding: '24px'
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '16px 24px',
      borderTop: `1px solid ${t.border}`
    },
    field: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
      backgroundColor: t.bgPanel,
      color: t.text
    },
    colorInput: {
      width: '100%',
      height: '42px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
      resize: 'vertical',
      backgroundColor: t.bgPanel,
      color: t.text
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: t.text,
      cursor: 'pointer'
    },
    addSubButton: {
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '6px 12px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    subsectionsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    subsectionRow: {
      display: 'flex',
      gap: '8px'
    },
    subsectionInput: {
      flex: 1,
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: t.bgPanel,
      color: t.text
    },
    removeSubButton: {
      backgroundColor: '#fee2e2',
      color: t.error,
      border: 'none',
      borderRadius: '6px',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      fontSize: '20px',
      lineHeight: '1',
      fontWeight: 'bold'
    },
    hint: {
      fontSize: '13px',
      color: t.textMuted,
      fontStyle: 'italic'
    },
    cancelButton: {
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    saveButton: {
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      opacity: 1
    }
  }), [t]);

  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingArea, setEditingArea] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadAreas();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/users/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAreas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/impact-areas?includeInactive=true', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAreas(response.data.areas);
      }
    } catch (error) {
      console.error('Error loading impact areas:', error);
      showError('Error al cargar áreas de impacto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = () => {
    setEditingArea({
      areaKey: '',
      areaName: '',
      icon: '',
      color: '#6b7280',
      description: '',
      subsections: [],
      defaultValidators: [],
      isActive: true,
      displayOrder: areas.length + 1
    });
    setIsModalOpen(true);
  };

  // Get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Usuario desconocido';
  };

  // Toggle validator selection
  const handleValidatorToggle = (userId) => {
    if (!editingArea) return;
    const currentValidators = editingArea.defaultValidators || [];
    const isSelected = currentValidators.includes(userId);

    setEditingArea({
      ...editingArea,
      defaultValidators: isSelected
        ? currentValidators.filter(id => id !== userId)
        : [...currentValidators, userId]
    });
  };

  const handleEditArea = (area) => {
    setEditingArea({ ...area });
    setIsModalOpen(true);
  };

  const handleSaveArea = async () => {
    try {
      const token = localStorage.getItem('token');

      if (editingArea.id) {
        // Update existing
        await axios.put(
          `http://localhost:5000/impact-areas/${editingArea.id}`,
          editingArea,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSuccess('Área actualizada exitosamente');
      } else {
        // Create new
        await axios.post(
          'http://localhost:5000/impact-areas',
          editingArea,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSuccess('Área creada exitosamente');
      }

      setIsModalOpen(false);
      setEditingArea(null);
      loadAreas();
    } catch (error) {
      console.error('Error saving area:', error);
      showError(error.response?.data?.message || 'Error al guardar área');
    }
  };

  const handleDeleteArea = async (areaId) => {
    if (!window.confirm('¿Está seguro de desactivar esta área?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/impact-areas/${areaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Área desactivada exitosamente');
      loadAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
      showError('Error al desactivar área');
    }
  };

  const handleAddSubsection = () => {
    if (!editingArea) return;

    const newSubsection = {
      key: `subsection_${Date.now()}`,
      label: ''
    };

    setEditingArea({
      ...editingArea,
      subsections: [...(editingArea.subsections || []), newSubsection]
    });
  };

  const handleUpdateSubsection = (index, field, value) => {
    const updatedSubsections = [...editingArea.subsections];
    updatedSubsections[index][field] = value;
    setEditingArea({
      ...editingArea,
      subsections: updatedSubsections
    });
  };

  const handleRemoveSubsection = (index) => {
    setEditingArea({
      ...editingArea,
      subsections: editingArea.subsections.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/ecr-dashboard')} style={styles.backButton}>
            ← Volver a ECR Dashboard
          </button>
          <h1 style={styles.title}>Áreas y Equipos de Validación</h1>
          <p style={styles.subtitle}>Configuración de áreas de impacto y equipos por defecto para ECR</p>
        </div>
        <button onClick={handleAddArea} style={styles.addButton}>
          + Agregar Área
        </button>
      </div>

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        <strong> RESPONSABILIDAD DEL USUARIO:</strong>
        <p>
          Esta configuración es responsabilidad del usuario final. Los administradores deben
          ajustar las áreas de impacto y sus subsecciones según los requisitos específicos de
          su organización, procesos, y normativas aplicables (IATF 16949, AIAG-VDA FMEA, etc.).
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
          La configuración inicial es una propuesta de referencia que debe ser validada y
          adaptada por personal calificado de la organización.
        </p>
      </div>

      {/* Areas List */}
      <div style={styles.areasList}>
        {areas.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No hay áreas configuradas</p>
            <button onClick={handleAddArea} style={styles.addButton}>
              + Agregar Primera Área
            </button>
          </div>
        ) : (
          areas.map((area) => (
            <div key={area.id} style={{
              ...styles.areaCard,
              opacity: area.isActive ? 1 : 0.5
            }}>
              <div style={styles.areaHeader}>
                <div style={styles.areaInfo}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>
                    {area.icon}
                  </span>
                  <div>
                    <h3 style={styles.areaName}>
                      {area.areaName}
                      {!area.isActive && (
                        <span style={styles.inactiveBadge}>Inactiva</span>
                      )}
                    </h3>
                    <p style={styles.areaDescription}>{area.description}</p>
                    <p style={styles.areaKey}>Key: {area.areaKey}</p>
                  </div>
                </div>
                <div style={styles.areaActions}>
                  <button
                    onClick={() => handleEditArea(area)}
                    style={styles.editButton}
                  >
                     Editar
                  </button>
                  {area.isActive && (
                    <button
                      onClick={() => handleDeleteArea(area.id)}
                      style={styles.deleteButton}
                    >
                       Desactivar
                    </button>
                  )}
                </div>
              </div>

              {/* Subsections */}
              {area.subsections && area.subsections.length > 0 && (
                <div style={styles.subsectionsContainer}>
                  <h4 style={styles.subsectionsTitle}>
                    Subsecciones ({area.subsections.length})
                  </h4>
                  <div style={styles.subsectionsGrid}>
                    {area.subsections.map((sub, idx) => (
                      <div key={sub.key} style={styles.subsectionChip}>
                         {sub.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div style={styles.validatorsContainer}>
                <h4 style={styles.subsectionsTitle}>
                  Team Members {area.defaultValidators?.length > 0 && `(${area.defaultValidators.length})`}
                </h4>
                {area.defaultValidators && area.defaultValidators.length > 0 ? (
                  <div style={styles.validatorsGrid}>
                    {area.defaultValidators.map((userId) => (
                      <div key={userId} style={styles.validatorChip}>
                        {getUserName(userId)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: t.textDim, fontStyle: 'italic' }}>
                    Sin miembros asignados
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && editingArea && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingArea.id ? 'Editar Área' : 'Nueva Área'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Area Key */}
              <div style={styles.field}>
                <label style={styles.label}>
                  Key (identificador único) *
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={editingArea.areaKey}
                  onChange={(e) => setEditingArea({
                    ...editingArea,
                    areaKey: e.target.value.toLowerCase().replace(/\s/g, '_')
                  })}
                  placeholder="ej: customer, production, quality"
                  disabled={!!editingArea.id}
                />
              </div>

              {/* Area Name */}
              <div style={styles.field}>
                <label style={styles.label}>Nombre del Área *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={editingArea.areaName}
                  onChange={(e) => setEditingArea({
                    ...editingArea,
                    areaName: e.target.value
                  })}
                  placeholder="ej: Cliente, Producción, Calidad"
                />
              </div>

              {/* Icon and Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.field}>
                  <label style={styles.label}>Ícono</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editingArea.icon}
                    onChange={(e) => setEditingArea({
                      ...editingArea,
                      icon: e.target.value
                    })}
                    placeholder=""
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Color</label>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={editingArea.color}
                    onChange={(e) => setEditingArea({
                      ...editingArea,
                      color: e.target.value
                    })}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={styles.field}>
                <label style={styles.label}>Descripción</label>
                <textarea
                  style={styles.textarea}
                  value={editingArea.description}
                  onChange={(e) => setEditingArea({
                    ...editingArea,
                    description: e.target.value
                  })}
                  placeholder="Descripción breve del área de impacto..."
                  rows={3}
                />
              </div>

              {/* Subsections */}
              <div style={styles.field}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={styles.label}>Subsecciones (Checkboxes)</label>
                  <button
                    onClick={handleAddSubsection}
                    style={styles.addSubButton}
                  >
                    + Agregar Subsección
                  </button>
                </div>

                {editingArea.subsections && editingArea.subsections.length > 0 ? (
                  <div style={styles.subsectionsList}>
                    {editingArea.subsections.map((sub, index) => (
                      <div key={sub.key} style={styles.subsectionRow}>
                        <input
                          type="text"
                          style={styles.subsectionInput}
                          value={sub.label}
                          onChange={(e) => handleUpdateSubsection(index, 'label', e.target.value)}
                          placeholder="Nombre de la subsección"
                        />
                        <button
                          onClick={() => handleRemoveSubsection(index)}
                          style={styles.removeSubButton}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.hint}>
                    No hay subsecciones. Las subsecciones aparecen como checkboxes en ECR-2B.
                  </p>
                )}
              </div>

              {/* Team Members */}
              <div style={styles.field}>
                <label style={styles.label}>
                  Team Members
                  {editingArea.defaultValidators?.length > 0 && (
                    <span style={{ marginLeft: '8px', color: '#2E7D32', fontWeight: '600' }}>
                      ({editingArea.defaultValidators.length} asignados)
                    </span>
                  )}
                </label>
                <p style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 12px 0' }}>
                  Miembros del equipo responsables de validar esta área
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  padding: '10px',
                  backgroundColor: t.bg
                }}>
                  {users.map(user => (
                    <label
                      key={user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: (editingArea.defaultValidators || []).includes(user.id) ? '#d1fae5' : 'white',
                        border: (editingArea.defaultValidators || []).includes(user.id) ? '1px solid #2E7D32' : '1px solid #E6EAEE',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(editingArea.defaultValidators || []).includes(user.id)}
                        onChange={() => handleValidatorToggle(user.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: (editingArea.defaultValidators || []).includes(user.id) ? '600' : '400'
                      }}>
                        {user.firstName} {user.lastName}
                        {user.department && (
                          <span style={{ color: t.textMuted, fontWeight: '400' }}> - {user.department}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Is Active */}
              <div style={styles.field}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editingArea.isActive}
                    onChange={(e) => setEditingArea({
                      ...editingArea,
                      isActive: e.target.checked
                    })}
                  />
                  <span style={{ marginLeft: '8px' }}>Área activa</span>
                </label>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveArea}
                style={styles.saveButton}
                disabled={!editingArea.areaKey || !editingArea.areaName}
              >
                {editingArea.id ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactAnalysisConfig;
