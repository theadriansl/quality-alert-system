import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const DepartmentsManagement = () => {
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated
  const { showSuccess, showError } = useToast();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // Dynamic styles based on theme
  const styles = useMemo(() => ({
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px',
      color: t.text
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    backBtn: {
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      color: t.text,
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      margin: '0',
      color: t.text
    },
    subtitle: {
      margin: '4px 0 0',
      color: t.textMuted,
      fontSize: '14px'
    },
    createBtn: {
      backgroundColor: t.accent,
      border: 'none',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      backgroundColor: t.bgCard,
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center',
      border: `1px solid ${t.border}`
    },
    statIcon: {
      fontSize: '32px',
      marginBottom: '8px'
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '600',
      color: t.accent
    },
    statLabel: {
      fontSize: '13px',
      color: t.textMuted,
      marginTop: '4px'
    },
    treeContainer: {
      backgroundColor: t.bgCard,
      borderRadius: '16px',
      padding: '24px',
      border: `1px solid ${t.border}`
    },
    deptCard: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: `1px solid ${t.border}`,
      animation: 'fadeIn 0.3s ease'
    },
    deptHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    deptInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    expandBtn: {
      background: 'none',
      border: 'none',
      color: t.accent,
      cursor: 'pointer',
      fontSize: '12px',
      padding: '4px'
    },
    deptIcon: {
      fontSize: '24px'
    },
    deptName: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text
    },
    deptCode: {
      fontSize: '12px',
      color: t.textMuted,
      fontFamily: 'monospace'
    },
    deptStats: {
      display: 'flex',
      gap: '8px'
    },
    statBadge: {
      backgroundColor: t.bgCard,
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      color: t.accent,
      border: `1px solid ${t.border}`
    },
    deptDescription: {
      fontSize: '13px',
      color: t.textMuted,
      marginBottom: '12px',
      paddingLeft: '48px'
    },
    deptFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '12px',
      borderTop: `1px solid ${t.border}`
    },
    managerInfo: {
      fontSize: '13px'
    },
    managerLabel: {
      color: t.textMuted,
      marginRight: '8px'
    },
    managerName: {
      color: t.accent,
      fontWeight: '500'
    },
    noManager: {
      color: t.textMuted,
      fontStyle: 'italic'
    },
    deptActions: {
      display: 'flex',
      gap: '8px'
    },
    actionBtn: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      color: t.text,
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    deleteBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      color: t.error
    },
    childrenContainer: {
      marginTop: '8px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px'
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: t.textMuted
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: `3px solid ${t.border}`,
      borderTop: `3px solid ${t.accent}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      backgroundColor: t.bgCard,
      borderRadius: '20px',
      width: '100%',
      maxWidth: '500px',
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
    closeBtn: {
      background: 'none',
      border: 'none',
      color: t.textMuted,
      fontSize: '28px',
      cursor: 'pointer',
      lineHeight: 1
    },
    form: {
      padding: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: t.text,
      fontSize: '14px',
      fontWeight: '500'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    hint: {
      display: 'block',
      marginTop: '6px',
      color: t.textMuted,
      fontSize: '12px'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px'
    },
    cancelBtn: {
      flex: 1,
      padding: '12px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      color: t.text,
      cursor: 'pointer',
      fontSize: '14px'
    },
    submitBtn: {
      flex: 2,
      padding: '12px',
      backgroundColor: t.accent,
      border: 'none',
      borderRadius: '10px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    }
  }), [t]);

  const [departments, setDepartments] = useState([]);
  const [flatDepartments, setFlatDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parentId: null,
    managerId: null
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Cargar departamentos (árbol) y usuarios en paralelo
      const [deptsRes, flatDeptsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/departments?flat=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/users/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const deptsData = await deptsRes.json();
      const flatDeptsData = await flatDeptsRes.json();
      const usersData = await usersRes.json();

      if (deptsData.success) {
        setDepartments(deptsData.departments || []);
      }
      if (flatDeptsData.success) {
        setFlatDepartments(flatDeptsData.departments || []);
      }
      if (usersData.success) {
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingDept
        ? `${API_URL}/departments/${editingDept.id}`
        : `${API_URL}/departments`;

      const response = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(data.message);
        setShowModal(false);
        setEditingDept(null);
        resetForm();
        loadData();
      } else {
        showError(data.message || 'Error al guardar');
      }
    } catch (error) {
      showError('Error de conexión');
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`¿Eliminar departamento "${dept.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/departments/${dept.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(data.message);
        loadData();
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError('Error al eliminar');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      parentId: null,
      managerId: null
    });
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      parentId: dept.parentId || null,
      managerId: dept.managerId || null
    });
    setShowModal(true);
  };

  const openCreateModal = (parentDept = null) => {
    setEditingDept(null);
    resetForm();
    if (parentDept) {
      setFormData(prev => ({ ...prev, parentId: parentDept.id }));
    }
    setShowModal(true);
  };

  const toggleExpand = (deptId) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };

  // Renderizar departamento con hijos (recursivo)
  const renderDepartment = (dept, level = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedDepts[dept.id];

    return (
      <div key={dept.id}>
        <div
          style={{
            ...styles.deptCard,
            marginLeft: level * 24,
            borderLeft: level > 0 ? `3px solid ${t.accent}` : 'none'
          }}
        >
          <div style={styles.deptHeader}>
            <div style={styles.deptInfo}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(dept.id)}
                  style={styles.expandBtn}
                >
                  {isExpanded ? '▼' : ''}
                </button>
              )}
              <div style={styles.deptIcon}>
                {level === 0 ? '' : ''}
              </div>
              <div>
                <div style={styles.deptName}>{dept.name}</div>
                <div style={styles.deptCode}>{dept.code}</div>
              </div>
            </div>

            <div style={styles.deptStats}>
              <span style={styles.statBadge}>
                 {dept.usersCount || 0}
              </span>
              {dept.subdepartmentsCount > 0 && (
                <span style={styles.statBadge}>
                   {dept.subdepartmentsCount}
                </span>
              )}
            </div>
          </div>

          {dept.description && (
            <div style={styles.deptDescription}>{dept.description}</div>
          )}

          <div style={styles.deptFooter}>
            <div style={styles.managerInfo}>
              {dept.managerName ? (
                <>
                  <span style={styles.managerLabel}>Manager:</span>
                  <span style={styles.managerName}>{dept.managerName}</span>
                </>
              ) : (
                <span style={styles.noManager}>Sin manager asignado</span>
              )}
            </div>

            <div style={styles.deptActions}>
              <button
                onClick={() => openCreateModal(dept)}
                style={styles.actionBtn}
                title="Agregar subdepartamento"
              >
                + Sub
              </button>
              <button
                onClick={() => openEditModal(dept)}
                style={styles.actionBtn}
                title="Editar"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(dept)}
                style={{...styles.actionBtn, ...styles.deleteBtn}}
                title="Eliminar"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div style={styles.childrenContainer}>
            {dept.children.map(child => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Cargando departamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>
            ← Volver
          </button>
          <div>
            <h1 style={styles.title}>Gestión de Departamentos</h1>
            <p style={styles.subtitle}>
              Organiza la estructura jerárquica de tu organización
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button onClick={() => openCreateModal()} style={styles.createBtn}>
            + Nuevo Departamento
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}></div>
          <div style={styles.statValue}>{flatDepartments.length}</div>
          <div style={styles.statLabel}>Departamentos</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}></div>
          <div style={styles.statValue}>
            {flatDepartments.reduce((sum, d) => sum + (d.usersCount || 0), 0)}
          </div>
          <div style={styles.statLabel}>Usuarios Asignados</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}></div>
          <div style={styles.statValue}>
            {flatDepartments.filter(d => d.managerId).length}
          </div>
          <div style={styles.statLabel}>Con Manager</div>
        </div>
      </div>

      {/* Departments Tree */}
      <div style={styles.treeContainer}>
        {departments.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}></div>
            <h3>No hay departamentos</h3>
            <p>Crea el primer departamento para empezar</p>
            <button onClick={() => openCreateModal()} style={styles.createBtn}>
              + Crear Departamento
            </button>
          </div>
        ) : (
          departments.map(dept => renderDepartment(dept))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>{editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}</h2>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                  placeholder="Ej: Ingeniería de Calidad"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Código</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  style={styles.input}
                  placeholder="Ej: ING_CALIDAD"
                  maxLength={45}
                />
                <small style={styles.hint}>Se genera automáticamente si no se especifica</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  style={styles.textarea}
                  placeholder="Descripción del departamento..."
                  rows={3}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Departamento Padre</label>
                <select
                  value={formData.parentId || ''}
                  onChange={e => setFormData({...formData, parentId: e.target.value ? parseInt(e.target.value) : null})}
                  style={styles.select}
                >
                  <option value="">-- Ninguno (Raíz) --</option>
                  {flatDepartments
                    .filter(d => d.id !== editingDept?.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  }
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Manager (Admin Gerencia)</label>
                <select
                  value={formData.managerId || ''}
                  onChange={e => setFormData({...formData, managerId: e.target.value ? parseInt(e.target.value) : null})}
                  style={styles.select}
                >
                  <option value="">-- Sin asignar --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
                <small style={styles.hint}>
                  El manager podrá ver y gestionar este departamento y sus subdepartamentos
                </small>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingDept ? 'Guardar Cambios' : 'Crear Departamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DepartmentsManagement;
