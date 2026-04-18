import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

/**
 * Shared User Form Modal
 * Used by ConfigurationPage (create + edit) and WorkloadManager (edit only)
 *
 * @param {Object} user - User to edit (null for create mode)
 * @param {Array} users - All users (for manager selection)
 * @param {Function} onClose - Close callback
 * @param {Function} onSave - Save callback (receives formData)
 * @param {boolean} allowCreate - Show email/password/systemRole fields (admin only)
 * @param {string} theme - 'dark' (ConfigurationPage) or 'light' (WorkloadManager)
 */
const UserFormModal = ({
  user = null,
  users = [],
  onClose,
  onSave,
  allowCreate = false,
  theme = 'dark'
}) => {
  const { theme: t } = useTheme();
  const isEditing = !!user;
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    position: user?.position || '',
    department: user?.department || '',
    departmentId: user?.departmentId || null,
    managerId: user?.managerId || null,
    hierarchyLevel: user?.hierarchyLevel ?? 3,
    phone: user?.phone || '',
    extension: user?.extension || '',
    location: user?.location || '',
    systemRole: user?.systemRole || 'user',
    hoursPerWeek: ''
  });

  // Load workload config (hours_per_week) for existing user
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/workload/user-config/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.config?.hours_per_week) {
          setFormData(prev => ({ ...prev, hoursPerWeek: data.config.hours_per_week }));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // Load departments on mount
  const loadDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/departments?flat=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Filter potential managers (higher level than current user)
  const potentialManagers = users.filter(u =>
    u.id !== user?.id && (u.hierarchyLevel ?? 99) < formData.hierarchyLevel
  );

  const hierarchyLevels = [
    { value: 0, label: 'Director' },
    { value: 1, label: 'Gerente' },
    { value: 2, label: 'Supervisor' },
    { value: 3, label: 'Ingeniero' },
    { value: 4, label: 'Técnico/Staff' }
  ];

  const handleDepartmentChange = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    // Auto-assign department manager (unless user IS the manager)
    const newManagerId = (dept && dept.managerId && dept.managerId !== user?.id)
      ? dept.managerId
      : formData.managerId;
    setFormData({
      ...formData,
      departmentId: deptId,
      department: dept ? dept.name : '',
      managerId: newManagerId
    });
  };

  const handleManagerChange = (newManagerId) => {
    // If new manager is a department manager, also move user to that department
    const managerDept = departments.find(d => d.managerId === newManagerId);
    if (managerDept && managerDept.id !== formData.departmentId) {
      setFormData({
        ...formData,
        managerId: newManagerId,
        departmentId: managerDept.id,
        department: managerDept.name
      });
    } else {
      setFormData({ ...formData, managerId: newManagerId });
    }
  };

  const handleHierarchyChange = (level) => {
    setFormData({
      ...formData,
      hierarchyLevel: level,
      managerId: null // Reset manager when level changes
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Theme-based styles - now using global theme context
  const isDark = t.id === 'dark';

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      backgroundColor: t.bgCard,
      background: isDark ? `linear-gradient(135deg, ${t.bgCard} 0%, ${t.bg} 100%)` : t.bgCard,
      borderRadius: '12px',
      padding: '0',
      width: '100%',
      maxWidth: '550px',
      maxHeight: '90vh',
      overflowY: 'auto',
      border: `1px solid ${t.border}`,
      boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: `1px solid ${t.border}`
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: t.text
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '28px',
      cursor: 'pointer',
      color: t.textMuted,
      lineHeight: 1
    },
    body: {
      padding: '24px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '13px',
      fontWeight: '500',
      color: t.text
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: isDark ? `${t.bgCard}80` : t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      cursor: 'pointer'
    },
    actions: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: `1px solid ${t.border}`
    },
    cancelBtn: {
      flex: 1,
      padding: '12px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    submitBtn: {
      flex: 2,
      padding: '12px',
      background: `linear-gradient(135deg, ${t.accent}, #8b5cf6)`,
      border: 'none',
      borderRadius: '10px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    },
    hint: {
      fontSize: '11px',
      color: t.warning,
      margin: '4px 0 0'
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: t.textMuted
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.loading}>Cargando...</div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Email & Password - Only for create mode */}
              {allowCreate && (
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email *</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required={!isEditing}
                      placeholder="usuario@empresa.com"
                      autoComplete="off"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      {isEditing ? 'Nueva Contraseña' : 'Contraseña *'}
                    </label>
                    <input
                      type="password"
                      style={styles.input}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!isEditing}
                      placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {/* Name fields */}
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre *</label>
                  <input
                    style={styles.input}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    placeholder="Juan"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Apellido *</label>
                  <input
                    style={styles.input}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    placeholder="Pérez"
                  />
                </div>
              </div>

              {/* Position */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Puesto / Posición</label>
                <input
                  style={styles.input}
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Ej: Ingeniero de Calidad, Plant Manager"
                />
              </div>

              {/* Hierarchy & Department */}
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nivel Jerárquico</label>
                  <select
                    style={styles.select}
                    value={formData.hierarchyLevel}
                    onChange={(e) => handleHierarchyChange(parseInt(e.target.value))}
                  >
                    {hierarchyLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Departamento</label>
                  <select
                    style={styles.select}
                    value={formData.departmentId || ''}
                    onChange={(e) => handleDepartmentChange(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- Seleccionar --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manager */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Reporta a (Jefe Directo)</label>
                <select
                  style={styles.select}
                  value={formData.managerId || ''}
                  onChange={(e) => handleManagerChange(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">-- Sin asignar --</option>
                  {potentialManagers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} ({manager.position || manager.email})
                    </option>
                  ))}
                </select>
                {potentialManagers.length === 0 && formData.hierarchyLevel > 0 && (
                  <p style={styles.hint}>
                    No hay usuarios de nivel superior disponibles
                  </p>
                )}
              </div>

              {/* Contact info */}
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    style={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+52 555 123 4567"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Extensión</label>
                  <input
                    style={styles.input}
                    value={formData.extension}
                    onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                    placeholder="1001"
                  />
                </div>
              </div>

              {/* Location */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Ubicación</label>
                <input
                  style={styles.input}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej: Planta Norte - Oficina 201"
                />
              </div>

              {/* Horas disponibles por semana */}
              {isEditing && (
                <div style={styles.formGroup}>
                  <label style={styles.label}> Horas disponibles / semana</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="1"
                    max="80"
                    value={formData.hoursPerWeek}
                    onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
                    placeholder="Ej: 45"
                  />
                </div>
              )}

              {/* System Role - Only for admins in create mode */}
              {allowCreate && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Sistema</label>
                  <select
                    style={styles.select}
                    value={formData.systemRole}
                    onChange={(e) => setFormData({ ...formData, systemRole: e.target.value })}
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              )}

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
