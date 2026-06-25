import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { isUserAdmin } from '../utils/permissions';
import api from '../services/api';
import userService from '../services/userService';
import UserFormModal from '../components/UserFormModal';

const API_URL = 'http://localhost:5000';

// Standalone helpers used by sub-tabs (must be outside ConfigurationPage)

const FormField = ({ label, value, onChange, type = 'text', required, disabled, placeholder, multiline, autoComplete, styles: stylesProp }) => {
  const { theme: t } = useTheme();
  const s = stylesProp || getStyles(t);
  return (
    <div style={s.formGroup}>
      <label style={s.label}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          style={s.textarea}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          autoComplete="off"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={s.input}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete || (type === 'password' ? 'new-password' : 'off')}
        />
      )}
    </div>
  );
};

const FormSelect = ({ label, value, onChange, options, small, styles: stylesProp }) => {
  const { theme: t } = useTheme();
  const s = stylesProp || getStyles(t);
  return (
    <div style={s.formGroup}>
      <label style={s.label}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...s.select, ...(small ? { padding: '8px 12px', fontSize: '13px' } : {}) }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

const LoadingSpinner = ({ message, styles }) => {
  const { theme: t } = useTheme();
  return (
    <div style={styles?.loading || { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '16px' }}>
      <div style={styles?.spinner || { width: '32px', height: '32px', border: `3px solid ${t.border}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: t.textDim, margin: 0 }}>{message}</p>
    </div>
  );
};

const Modal = ({ title, onClose, children, wide, styles }) => {
  const { theme: t } = useTheme();
  return (
    <div style={styles?.modalOverlay || { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ ...(styles?.modal || { backgroundColor: t.bgCard, borderRadius: '12px', padding: 0, width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }), ...(wide ? { maxWidth: '900px' } : {}) }} onClick={e => e.stopPropagation()}>
        <div style={styles?.modalHeader || { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${t.border}` }}>
          <h2 style={styles?.modalTitle || { margin: 0, fontSize: '18px', fontWeight: '600' }}>{title}</h2>
          <button onClick={onClose} style={styles?.closeBtn || { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textDim }}>×</button>
        </div>
        <div style={styles?.modalBody || { padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

const ConfigurationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // Get initial tab from URL hash or default to 'users'
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    return ['users', 'roles', 'departments'].includes(hash) ? hash : 'users';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    setIsCurrentUserAdmin(isUserAdmin(currentUser));
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  };

  const tabs = [
    { id: 'users', label: 'Usuarios', icon: '', description: 'Gestionar usuarios del sistema' },
    { id: 'roles', label: 'Roles', icon: '', description: 'Configurar roles y permisos' },
    { id: 'departments', label: 'Departamentos', icon: '', description: 'Estructura organizacional' },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isCurrentUserAdmin);

  const styles = getStyles(t);

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>
              ← Volver
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
                {language === 'es' ? 'EN' : 'ES'}
              </button>
              <ThemeSelector />
            </div>
          </div>
          <h1 style={styles.sidebarTitle}>Configuración</h1>
          <p style={styles.sidebarSubtitle}>Administración del sistema</p>
        </div>

        <nav style={styles.nav}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                ...styles.navItem,
                ...(activeTab === tab.id ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>{tab.icon}</span>
              <div style={styles.navText}>
                <span style={styles.navLabel}>{tab.label}</span>
                <span style={styles.navDescription}>{tab.description}</span>
              </div>
              {activeTab === tab.id && <span style={styles.navIndicator}>›</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.firstName?.[0] || user?.email?.[0] || '?'}
            </div>
            <div>
              <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
              <div style={styles.userRole}>{isCurrentUserAdmin ? 'Administrador' : 'Usuario'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'users' && <UsersTab showSuccess={showSuccess} showError={showError} styles={styles} />}
        {activeTab === 'roles' && <RolesTab showSuccess={showSuccess} showError={showError} styles={styles} />}
        {activeTab === 'departments' && <DepartmentsTab showSuccess={showSuccess} showError={showError} styles={styles} />}
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        select option {
          background: ${t.bgCard};
          color: ${t.text};
          padding: 8px;
        }
        select option:hover {
          background: ${t.bgPanel};
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// USERS TAB
// ============================================================================
const UsersTab = ({ showSuccess, showError, styles }) => {
  const { theme: t } = useTheme();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, rolesRes] = await Promise.all([
        userService.getAllUsers(),
        api.get('/roles')
      ]);
      setUsers(usersData);
      setFilteredUsers(usersData);
      if (rolesRes.data.success) setAvailableRoles(rolesRes.data.roles || []);
    } catch (error) {
      showError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar usuario "${user.email}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showSuccess('Usuario eliminado');
      loadData();
    } catch (error) {
      showError('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  // Role management functions
  const openRolesModal = async (user) => {
    setSelectedUserForRoles(user);
    setShowRolesModal(true);
    setRolesLoading(true);
    try {
      const response = await api.get(`/users/${user.id}/roles`);
      if (response.data.success) {
        setUserRoles(response.data.roles || []);
      }
    } catch (error) {
      showError('Error al cargar roles del usuario');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleAssignRole = async (roleId) => {
    try {
      const response = await api.post(`/users/${selectedUserForRoles.id}/roles`, { roleId });
      if (response.data.success) {
        showSuccess(response.data.message);
        // Reload user roles
        const rolesRes = await api.get(`/users/${selectedUserForRoles.id}/roles`);
        if (rolesRes.data.success) {
          setUserRoles(rolesRes.data.roles || []);
        }
        loadData(); // Refresh user list to update assignedRoles
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Error al asignar rol');
    }
  };

  const handleRevokeRole = async (roleId) => {
    try {
      const response = await api.delete(`/users/${selectedUserForRoles.id}/roles/${roleId}`);
      if (response.data.success) {
        showSuccess('Rol revocado');
        // Reload user roles
        const rolesRes = await api.get(`/users/${selectedUserForRoles.id}/roles`);
        if (rolesRes.data.success) {
          setUserRoles(rolesRes.data.roles || []);
        }
        loadData(); // Refresh user list
      }
    } catch (error) {
      showError('Error al revocar rol');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando usuarios..." styles={styles} />;
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <div>
          <h2 style={styles.tabTitle}>Gestión de Usuarios</h2>
          <p style={styles.tabSubtitle}>{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} style={styles.primaryBtn}>
          + Nuevo Usuario
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar por nombre, email o departamento..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Users Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Usuario</th>
              <th style={styles.th}>Departamento</th>
              <th style={styles.th}>Jefe Directo</th>
              <th style={styles.th}>Roles</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.userCell}>
                    <div style={styles.avatar}>
                      {user.firstName?.[0] || user.email?.[0] || '?'}
                    </div>
                    <div>
                      <div style={styles.userName2}>{user.firstName} {user.lastName}</div>
                      <div style={styles.userPosition}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={styles.deptBadge}>
                      {user.departmentName || user.department || 'Sin asignar'}
                    </span>
                    {user.managedDepartments && user.managedDepartments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {user.managedDepartments.map((dept, idx) => (
                          <span key={idx} style={{
                            background: `${t.success}22`,
                            color: t.success,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}>
                            Gestiona: {dept.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{ color: user.manager ? t.accent : t.textDim, fontSize: '13px' }}>
                    {user.manager ? user.manager.name : '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.rolesContainer}>
                    {user.assignedRoles && user.assignedRoles.length > 0 ? (
                      user.assignedRoles.slice(0, 3).map((role, idx) => (
                        <span key={idx} style={{
                          ...styles.roleBadgeSmall,
                          background: role.isSystem ? `${t.warning}22` : `${t.accent}22`,
                          color: role.isSystem ? t.warning : t.accent
                        }}>
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <span style={styles.noRoles}>Sin roles</span>
                    )}
                    {user.assignedRoles && user.assignedRoles.length > 3 && (
                      <span style={styles.moreRoles}>+{user.assignedRoles.length - 3}</span>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.roleBadge,
                    background: user.systemRole === 'admin' ? `${t.error}22` : `${t.accent}22`,
                    color: user.systemRole === 'admin' ? t.error : t.accent
                  }}>
                    {user.systemRole === 'admin' ? 'Admin' : 'Usuario'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button onClick={() => openRolesModal(user)} style={{...styles.actionBtn, background: `${t.accent}22`, border: `1px solid ${t.accent}44`, color: t.accent}}>
                      Roles
                    </button>
                    <button onClick={() => openEditModal(user)} style={styles.actionBtn}>Editar</button>
                    <button onClick={() => handleDelete(user)} style={{...styles.actionBtn, ...styles.deleteBtn}}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal - Shared Component */}
      {showModal && (
        <UserFormModal
          user={editingUser}
          users={users}
          onClose={() => { setShowModal(false); resetForm(); }}
          onSave={async (data) => {
            try {
              const token = localStorage.getItem('token');
              const url = editingUser
                ? `${API_URL}/users/${editingUser.id}`
                : `${API_URL}/users`;
              const response = await fetch(url, {
                method: editingUser ? 'PUT' : 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
              });
              const result = await response.json();
              if (result.success || response.ok) {
                showSuccess(editingUser ? 'Usuario actualizado' : 'Usuario creado');
                setShowModal(false);
                resetForm();
                loadData();
              } else {
                showError(result.message || 'Error al guardar');
              }
            } catch (error) {
              showError('Error de conexión');
            }
          }}
          allowCreate={true}
          theme="dark"
        />
      )}

      {/* Roles Management Modal */}
      {showRolesModal && selectedUserForRoles && (
        <Modal title={`Roles de ${selectedUserForRoles.firstName} ${selectedUserForRoles.lastName}`} onClose={() => setShowRolesModal(false)} wide styles={styles}>
          {rolesLoading ? (
            <LoadingSpinner message="Cargando roles..." styles={styles} />
          ) : (
            <div>
              {/* Current roles */}
              <div style={styles.rolesSection}>
                <h4 style={styles.rolesSectionTitle}>Roles Asignados</h4>
                {userRoles.filter(r => r.isActive).length === 0 ? (
                  <p style={styles.noRolesText}>Este usuario no tiene roles asignados</p>
                ) : (
                  <div style={styles.assignedRolesList}>
                    {userRoles.filter(r => r.isActive).map(role => (
                      <div key={role.id} style={styles.assignedRoleItem}>
                        <div style={styles.assignedRoleInfo}>
                          <span style={styles.assignedRoleName}>{role.name}</span>
                          {role.isSystem && <span style={styles.systemBadgeSmall}>Sistema</span>}
                          <span style={styles.assignedRoleDate}>
                            Asignado: {new Date(role.assignedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRevokeRole(role.id)}
                          style={styles.revokeBtn}
                        >
                          Revocar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available roles to assign */}
              <div style={styles.rolesSection}>
                <h4 style={styles.rolesSectionTitle}>Asignar Nuevo Rol</h4>
                <div style={styles.availableRolesList}>
                  {availableRoles
                    .filter(role => !userRoles.some(ur => ur.id === role.id && ur.isActive))
                    .map(role => (
                      <div key={role.id} style={styles.availableRoleItem}>
                        <div style={styles.availableRoleInfo}>
                          <span style={styles.availableRoleName}>{role.name}</span>
                          {role.isSystem && <span style={styles.systemBadgeSmall}>Sistema</span>}
                          <span style={styles.availableRoleDesc}>{role.description || 'Sin descripción'}</span>
                        </div>
                        <button
                          onClick={() => handleAssignRole(role.id)}
                          style={styles.assignBtn}
                        >
                          Asignar
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button onClick={() => setShowRolesModal(false)} style={styles.submitBtn}>Cerrar</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ============================================================================
// ROLES TAB
// ============================================================================
const RolesTab = ({ showSuccess, showError, styles }) => {
  const { theme: t } = useTheme();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clearanceLevel: 2,
    permissions: {}
  });

  const modules = [
    // Calidad
    { id: '8d', name: '8D Problem Solving', icon: '🔧', category: 'Calidad' },
    { id: 'quality_alert', name: 'Quality Alert / Defectos', icon: '🚨', category: 'Calidad' },
    { id: 'qar', name: 'QAR (Quality Action Request)', icon: '📋', category: 'Calidad' },
    { id: 'mrb', name: 'MRB (Material Review Board)', icon: '🔍', category: 'Calidad' },
    { id: 'hospital', name: 'Hospital Dashboard', icon: '🏥', category: 'Calidad' },
    { id: 'lessons_learned', name: 'Lecciones Aprendidas', icon: '📚', category: 'Calidad' },
    // Ingeniería
    { id: 'ecr', name: 'ECR/ECO (Cambios de Ingeniería)', icon: '⚙️', category: 'Ingeniería' },
    { id: 'risk_matrix', name: 'Matriz de Riesgo', icon: '⚠️', category: 'Ingeniería' },
    { id: 'work_instructions', name: 'Instrucciones de Trabajo', icon: '📄', category: 'Ingeniería' },
    // Auditorías
    { id: 'audits', name: 'Auditorías ISO', icon: '✅', category: 'Auditorías' },
    // Operaciones
    { id: 'workload', name: 'Gestión de Carga de Trabajo', icon: '📅', category: 'Operaciones' },
    { id: 'management_review', name: 'Revisión Gerencial', icon: '🏢', category: 'Operaciones' },
    // Recursos Humanos
    { id: 'skills', name: 'Skills & Training', icon: '🎯', category: 'Recursos Humanos' },
    // Administración
    { id: 'clients', name: 'Clientes', icon: '🤝', category: 'Administración' },
    { id: 'users', name: 'Usuarios', icon: '👥', category: 'Administración' },
    { id: 'configuration', name: 'Configuración del Sistema', icon: '🔑', category: 'Administración' },
    { id: 'dashboard', name: 'Dashboard / Reportes', icon: '📈', category: 'Administración' },
  ];

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/roles');
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (error) {
      showError('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingRole ? `/roles/${editingRole.id}` : '/roles';
      const method = editingRole ? 'put' : 'post';
      const response = await api[method](url, formData);
      if (response.data.success) {
        showSuccess(editingRole ? 'Rol actualizado' : 'Rol creado');
        setShowModal(false);
        resetForm();
        loadRoles();
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (role) => {
    if (role.isSystemRole) {
      showError('No se pueden eliminar roles del sistema');
      return;
    }
    if (!window.confirm(`¿Eliminar rol "${role.name}"?`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      showSuccess('Rol eliminado');
      loadRoles();
    } catch (error) {
      showError('Error al eliminar');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', clearanceLevel: 2, permissions: {} });
    setEditingRole(null);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      clearanceLevel: role.clearanceLevel || 2,
      permissions: role.permissions || {}
    });
    setShowModal(true);
  };

  const updatePermission = (moduleId, field, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          ...prev.permissions[moduleId],
          [field]: value
        }
      }
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Cargando roles..." styles={styles} />;
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <div>
          <h2 style={styles.tabTitle}>Gestión de Roles</h2>
          <p style={styles.tabSubtitle}>{roles.length} roles configurados</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} style={styles.primaryBtn}>
          + Nuevo Rol
        </button>
      </div>

      {/* Roles Grid */}
      <div style={styles.rolesGrid}>
        {roles.map(role => (
          <div key={role.id} style={styles.roleCard}>
            <div style={styles.roleHeader}>
              <div style={styles.roleIcon}></div>
              <div>
                <h3 style={styles.roleName}>{role.name}</h3>
                {role.isSystemRole && <span style={styles.systemBadge}>Sistema</span>}
              </div>
            </div>
            <p style={styles.roleDescription}>{role.description || 'Sin descripción'}</p>
            <div style={styles.roleFooter}>
              <span style={styles.clearanceBadge}>Nivel {role.clearanceLevel || 1}</span>
              <div style={styles.roleActions}>
                <button onClick={() => openEditModal(role)} style={styles.actionBtn}>Editar</button>
                {!role.isSystem && (
                  <button onClick={() => handleDelete(role)} style={{...styles.actionBtn, ...styles.deleteBtn}}>Eliminar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editingRole ? 'Editar Rol' : 'Nuevo Rol'} onClose={() => setShowModal(false)} wide styles={styles}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <FormField
                label="Nombre *"
                value={formData.name}
                onChange={v => setFormData({...formData, name: v})}
                required
                disabled={editingRole?.isSystemRole}
              />
              <FormSelect
                label="Nivel de Acceso"
                value={formData.clearanceLevel}
                onChange={v => setFormData({...formData, clearanceLevel: parseInt(v)})}
                options={[
                  { value: 1, label: '1 - Público' },
                  { value: 2, label: '2 - Restringido' },
                  { value: 3, label: '3 - Confidencial' },
                  { value: 4, label: '4 - Alta Dirección' }
                ]}
              />
            </div>
            <FormField
              label="Descripción"
              value={formData.description}
              onChange={v => setFormData({...formData, description: v})}
              multiline
            />

            <h4 style={styles.permissionsTitle}>Permisos por Módulo</h4>
            {/* Group by category */}
            {[...new Set(modules.map(m => m.category))].map(category => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: t.textMuted,
                  marginBottom: '8px', paddingBottom: '4px',
                  borderBottom: `1px solid ${t.border}`
                }}>
                  {category}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                  {modules.filter(m => m.category === category).map(mod => {
                    const access = formData.permissions[mod.id]?.access || 'none';
                    const accessColor = access === 'full' ? t.success : access === 'partial' ? t.accent : access === 'view' ? t.warning : t.textDim;
                    return (
                      <div key={mod.id} style={{
                        ...styles.permissionCard,
                        borderLeft: `3px solid ${accessColor}`,
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px'
                      }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{mod.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mod.name}>
                            {mod.name}
                          </div>
                          <select
                            value={access}
                            onChange={e => updatePermission(mod.id, 'access', e.target.value)}
                            style={{
                              width: '100%', padding: '3px 6px', fontSize: '11px',
                              border: `1px solid ${t.border}`, borderRadius: '6px',
                              backgroundColor: t.bgCard, color: accessColor,
                              fontWeight: '600', cursor: 'pointer', outline: 'none'
                            }}
                          >
                            <option value="none">🚫 Sin acceso</option>
                            <option value="view">👁 Solo lectura</option>
                            <option value="partial">✏️ Parcial</option>
                            <option value="full">✅ Completo</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancelar</button>
              <button type="submit" style={styles.submitBtn}>{editingRole ? 'Guardar Cambios' : 'Crear Rol'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============================================================================
// DEPARTMENTS TAB
// ============================================================================
const DepartmentsTab = ({ showSuccess, showError, styles }) => {
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

      const [deptsRes, flatDeptsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/departments`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/departments?flat=true`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/users/list`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const deptsData = await deptsRes.json();
      const flatDeptsData = await flatDeptsRes.json();
      const usersData = await usersRes.json();

      if (deptsData.success) setDepartments(deptsData.departments || []);
      if (flatDeptsData.success) setFlatDepartments(flatDeptsData.departments || []);
      if (usersData.success) setUsers(usersData.users || []);
    } catch (error) {
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
    setFormData({ name: '', code: '', description: '', parentId: null, managerId: null });
    setEditingDept(null);
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

  const toggleExpand = (deptId) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const renderDepartment = (dept, level = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedDepts[dept.id];

    return (
      <div key={dept.id}>
        <div style={{ ...styles.deptCard, marginLeft: level * 24 }}>
          <div style={styles.deptHeader}>
            <div style={styles.deptInfo}>
              {hasChildren && (
                <button onClick={() => toggleExpand(dept.id)} style={styles.expandBtn}>
                  {isExpanded ? '▼' : ''}
                </button>
              )}
              <span style={styles.deptIcon}>{level === 0 ? '' : ''}</span>
              <div>
                <div style={styles.deptName}>{dept.name}</div>
                <div style={styles.deptCode}>{dept.code || 'Sin código'}</div>
              </div>
            </div>
            <div style={styles.deptStats}>
              <span style={styles.statBadge}>{dept.usersCount || 0}</span>
              {dept.subdepartmentsCount > 0 && (
                <span style={styles.statBadge}>{dept.subdepartmentsCount}</span>
              )}
            </div>
          </div>
          <div style={styles.deptFooter}>
            <div style={styles.managerInfo}>
              {dept.managerName ? (
                <><span style={styles.managerLabel}>Manager:</span> {dept.managerName}</>
              ) : (
                <span style={styles.noManager}>Sin manager</span>
              )}
            </div>
            <div style={styles.deptActions}>
              <button onClick={() => { resetForm(); setFormData(f => ({...f, parentId: dept.id})); setShowModal(true); }} style={styles.actionBtn}>+ Sub</button>
              <button onClick={() => openEditModal(dept)} style={styles.actionBtn}>Editar</button>
              <button onClick={() => handleDelete(dept)} style={{...styles.actionBtn, ...styles.deleteBtn}}>Eliminar</button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && dept.children.map(child => renderDepartment(child, level + 1))}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Cargando departamentos..." styles={styles} />;
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <div>
          <h2 style={styles.tabTitle}>Estructura Organizacional</h2>
          <p style={styles.tabSubtitle}>{flatDepartments.length} departamentos</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} style={styles.primaryBtn}>
          + Nuevo Departamento
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statIcon2}></div>
          <div style={styles.statValue}>{flatDepartments.length}</div>
          <div style={styles.statLabel}>Departamentos</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon2}></div>
          <div style={styles.statValue}>{flatDepartments.reduce((sum, d) => sum + (d.usersCount || 0), 0)}</div>
          <div style={styles.statLabel}>Usuarios Asignados</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon2}></div>
          <div style={styles.statValue}>{flatDepartments.filter(d => d.managerId).length}</div>
          <div style={styles.statLabel}>Con Manager</div>
        </div>
      </div>

      {/* Tree */}
      <div style={styles.treeContainer}>
        {departments.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}></div>
            <h3>No hay departamentos</h3>
            <p>Crea el primer departamento para empezar</p>
          </div>
        ) : (
          departments.map(dept => renderDepartment(dept))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editingDept ? 'Editar Departamento' : 'Nuevo Departamento'} onClose={() => setShowModal(false)} styles={styles}>
          <form onSubmit={handleSubmit}>
            <FormField label="Nombre *" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
            <FormField label="Código" value={formData.code} onChange={v => setFormData({...formData, code: v.toUpperCase()})} placeholder="Se genera automáticamente" />
            <FormField label="Descripción" value={formData.description} onChange={v => setFormData({...formData, description: v})} multiline />
            <FormSelect
              label="Departamento Padre"
              value={formData.parentId || ''}
              onChange={v => setFormData({...formData, parentId: v ? parseInt(v) : null})}
              options={[{ value: '', label: '-- Ninguno (Raíz) --' }, ...flatDepartments.filter(d => d.id !== editingDept?.id).map(d => ({ value: d.id, label: d.name }))]}
            />
            <FormSelect
              label="Manager"
              value={formData.managerId || ''}
              onChange={v => setFormData({...formData, managerId: v ? parseInt(v) : null})}
              options={[
                { value: '', label: '-- Sin asignar --' },
                ...users
                  .filter(u => (u.hierarchyLevel ?? 99) <= 1) // Solo Director (0) y Gerente (1)
                  .map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} - ${u.hierarchyLevel === 0 ? 'Director' : 'Gerente'}` }))
              ]}
            />
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancelar</button>
              <button type="submit" style={styles.submitBtn}>{editingDept ? 'Guardar Cambios' : 'Crear Departamento'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};


// ============================================================================
// STYLES FUNCTION - Returns styles based on theme
// ============================================================================
const getStyles = (t) => ({
  container: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: t.bg,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  // Sidebar
  sidebar: {
    width: '280px',
    backgroundColor: t.bgCard,
    borderRight: `1px solid ${t.border}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 100
  },
  sidebarHeader: {
    padding: '24px',
    borderBottom: `1px solid ${t.border}`
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: t.textMuted,
    cursor: 'pointer',
    padding: '8px 0',
    fontSize: '14px',
    marginBottom: '16px',
    display: 'block'
  },
  sidebarTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0',
    color: t.primary
  },
  sidebarSubtitle: {
    color: t.textDim,
    fontSize: '13px',
    margin: '4px 0 0'
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto'
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  },
  navItemActive: {
    backgroundColor: t.bgPanel,
    border: `1px solid ${t.accent}`
  },
  navIcon: {
    fontSize: '20px'
  },
  navText: {
    flex: 1
  },
  navLabel: {
    display: 'block',
    color: t.text,
    fontWeight: '500',
    fontSize: '14px'
  },
  navDescription: {
    display: 'block',
    color: t.textDim,
    fontSize: '11px',
    marginTop: '2px'
  },
  navIndicator: {
    color: t.accent,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: `1px solid ${t.border}`
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: t.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px'
  },
  userName: {
    color: t.text,
    fontWeight: '500',
    fontSize: '14px'
  },
  userRole: {
    color: t.textDim,
    fontSize: '12px'
  },
  // Main content
  main: {
    flex: 1,
    marginLeft: '280px',
    padding: '24px',
    minHeight: '100vh'
  },
  tabContent: {
    animation: 'slideIn 0.3s ease'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  tabTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0',
    color: t.text
  },
  tabSubtitle: {
    color: t.textDim,
    fontSize: '14px',
    margin: '4px 0 0'
  },
  primaryBtn: {
    background: t.primary,
    border: 'none',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: `0 4px 15px ${t.primary}66`
  },
  // Search
  searchBar: {
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '12px 16px',
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    color: t.text,
    fontSize: '14px',
    outline: 'none'
  },
  // Table
  tableContainer: {
    background: t.bgCard,
    borderRadius: '16px',
    border: `1px solid ${t.border}`,
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '16px',
    color: t.textMuted,
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${t.border}`,
    backgroundColor: t.bgPanel
  },
  tr: {
    transition: 'background 0.2s'
  },
  td: {
    padding: '16px',
    borderBottom: `1px solid ${t.border}`,
    color: t.text,
    fontSize: '14px'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: t.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px'
  },
  userName2: {
    fontWeight: '500',
    color: t.text
  },
  userPosition: {
    fontSize: '12px',
    color: t.textDim
  },
  deptBadge: {
    background: `${t.accent}22`,
    color: t.accent,
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px'
  },
  roleBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    background: t.bgPanel,
    border: `1px solid ${t.border}`,
    color: t.text,
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s'
  },
  deleteBtn: {
    background: `${t.error}22`,
    border: `1px solid ${t.error}44`,
    color: t.error
  },
  // Roles grid
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  roleCard: {
    background: t.bgCard,
    borderRadius: '16px',
    padding: '20px',
    border: `1px solid ${t.border}`
  },
  roleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  roleIcon: {
    fontSize: '24px'
  },
  roleName: {
    margin: 0,
    color: t.text,
    fontSize: '16px',
    fontWeight: '600'
  },
  systemBadge: {
    background: `${t.warning}22`,
    color: t.warning,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    marginLeft: '8px'
  },
  roleDescription: {
    color: t.textDim,
    fontSize: '13px',
    margin: '0 0 16px'
  },
  roleFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clearanceBadge: {
    background: `${t.accent}22`,
    color: t.accent,
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px'
  },
  roleActions: {
    display: 'flex',
    gap: '8px'
  },
  // Departments
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: t.bgCard,
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    border: `1px solid ${t.border}`
  },
  statIcon2: {
    fontSize: '28px',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: t.accent
  },
  statLabel: {
    fontSize: '12px',
    color: t.textDim,
    marginTop: '4px'
  },
  treeContainer: {
    background: t.bgCard,
    borderRadius: '16px',
    padding: '20px',
    border: `1px solid ${t.border}`
  },
  deptCard: {
    background: t.bgPanel,
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    border: `1px solid ${t.border}`
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
    fontSize: '20px'
  },
  deptName: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.text
  },
  deptCode: {
    fontSize: '11px',
    color: t.textDim,
    fontFamily: 'monospace'
  },
  deptStats: {
    display: 'flex',
    gap: '8px'
  },
  statBadge: {
    background: `${t.accent}22`,
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    color: t.accent
  },
  deptFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: `1px solid ${t.border}`
  },
  managerInfo: {
    fontSize: '12px',
    color: t.textDim
  },
  managerLabel: {
    color: t.textDim
  },
  noManager: {
    fontStyle: 'italic',
    color: t.textDim
  },
  deptActions: {
    display: 'flex',
    gap: '8px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: t.textDim
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: t.bgCard,
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
  modalTitle: {
    margin: 0,
    color: t.text,
    fontSize: '18px',
    fontWeight: '600'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: t.textDim,
    fontSize: '28px',
    cursor: 'pointer',
    lineHeight: 1
  },
  modalBody: {
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
    color: t.text,
    fontSize: '13px',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: t.bgCard,
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
    background: t.bgCard,
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
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    color: t.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: t.bgPanel,
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    color: t.text,
    cursor: 'pointer',
    fontSize: '14px'
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    background: t.primary,
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  // Permissions
  permissionsTitle: {
    color: t.text,
    fontSize: '14px',
    margin: '20px 0 12px',
    fontWeight: '600'
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  permissionCard: {
    background: t.bgPanel,
    borderRadius: '10px',
    padding: '12px',
    border: `1px solid ${t.border}`
  },
  permissionHeader: {
    marginBottom: '8px'
  },
  permissionName: {
    color: t.text,
    fontSize: '13px',
    fontWeight: '500'
  },
  // Loading
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: t.textDim
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
  // User Roles Management
  rolesContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center'
  },
  roleBadgeSmall: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  noRoles: {
    color: t.textDim,
    fontSize: '12px',
    fontStyle: 'italic'
  },
  moreRoles: {
    color: t.textDim,
    fontSize: '11px',
    padding: '2px 6px',
    background: t.bgPanel,
    borderRadius: '4px'
  },
  rolesSection: {
    marginBottom: '24px'
  },
  rolesSectionTitle: {
    color: t.text,
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${t.border}`
  },
  noRolesText: {
    color: t.textDim,
    fontSize: '13px',
    fontStyle: 'italic',
    padding: '16px',
    textAlign: 'center',
    background: t.bgPanel,
    borderRadius: '8px'
  },
  assignedRolesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  assignedRoleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: `${t.accent}15`,
    borderRadius: '10px',
    border: `1px solid ${t.accent}33`
  },
  assignedRoleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  assignedRoleName: {
    color: t.text,
    fontWeight: '500',
    fontSize: '14px'
  },
  assignedRoleDate: {
    color: t.textDim,
    fontSize: '11px'
  },
  systemBadgeSmall: {
    display: 'inline-block',
    background: `${t.warning}22`,
    color: t.warning,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    marginLeft: '8px'
  },
  revokeBtn: {
    background: `${t.error}22`,
    border: `1px solid ${t.error}44`,
    color: t.error,
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  availableRolesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '250px',
    overflowY: 'auto'
  },
  availableRoleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: t.bgPanel,
    borderRadius: '10px',
    border: `1px solid ${t.border}`
  },
  availableRoleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  availableRoleName: {
    color: t.text,
    fontWeight: '500',
    fontSize: '14px'
  },
  availableRoleDesc: {
    color: t.textDim,
    fontSize: '11px'
  },
  assignBtn: {
    background: `${t.success}22`,
    border: `1px solid ${t.success}44`,
    color: t.success,
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  }
});

export default ConfigurationPage;
