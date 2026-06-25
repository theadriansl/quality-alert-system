import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const RolesManagement = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  // Form state para crear/editar
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clearanceLevel: 1,
    permissions: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, modulesRes] = await Promise.all([
        api.get('/roles'),
        api.get('/modules')
      ]);

      if (rolesRes.data.success) {
        setRoles(rolesRes.data.roles);
      }
      if (modulesRes.data.success) {
        setModules(modulesRes.data.modules);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedRole(null);
    setIsCreating(true);
    setIsEditing(false);
    setFormData({
      name: '',
      description: '',
      clearanceLevel: 1,
      permissions: {}
    });
  };

  const handleEditRole = () => {
    if (!selectedRole) return;
    setIsEditing(true);
    setIsCreating(false);
    setFormData({
      name: selectedRole.name,
      description: selectedRole.description || '',
      clearanceLevel: selectedRole.clearanceLevel || 1,
      permissions: selectedRole.permissions || {}
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        showNotification('El nombre del rol es requerido', 'error');
        return;
      }

      if (isCreating) {
        const response = await api.post('/roles', formData);
        if (response.data.success) {
          showNotification(`Rol "${formData.name}" creado exitosamente`, 'success');
          await loadData();
          setIsCreating(false);
          setSelectedRole(response.data.role);
        }
      } else if (isEditing && selectedRole) {
        const response = await api.put(`/roles/${selectedRole.id}`, formData);
        if (response.data.success) {
          showNotification(`Rol "${formData.name}" actualizado`, 'success');
          await loadData();
          setIsEditing(false);
          setSelectedRole(response.data.role);
        }
      }
    } catch (error) {
      console.error('Error saving role:', error);
      showNotification(error.response?.data?.message || 'Error al guardar', 'error');
    }
  };

  const handleDelete = async (roleId) => {
    try {
      const response = await api.delete(`/roles/${roleId}`);
      if (response.data.success) {
        showNotification('Rol eliminado exitosamente', 'success');
        await loadData();
        setSelectedRole(null);
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Error al eliminar', 'error');
      setShowDeleteConfirm(null);
    }
  };

  const handlePermissionChange = (moduleId, field, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          ...(prev.permissions[moduleId] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSectionToggle = (moduleId, sectionId, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          ...(prev.permissions[moduleId] || {}),
          sections: {
            ...(prev.permissions[moduleId]?.sections || {}),
            [sectionId]: value
          }
        }
      }
    }));
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const systemRoles = filteredRoles.filter(r => r.isSystem);
  const customRoles = filteredRoles.filter(r => !r.isSystem);

  const getAccessBadge = (access) => {
    const config = {
      full: { bg: 'linear-gradient(135deg, #2E7D32 0%, #2E7D32 100%)', label: 'Completo', icon: '' },
      partial: { bg: 'linear-gradient(135deg, #C77700 0%, #C77700 100%)', label: 'Parcial', icon: '◐' },
      view: { bg: 'linear-gradient(135deg, #0072CE 0%, #2563eb 100%)', label: 'Consulta', icon: '◉' },
      none: { bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', label: 'Sin acceso', icon: '' }
    };
    return config[access] || config.none;
  };

  const getClearanceBadge = (level) => {
    const config = {
      1: { color: '#2E7D32', label: 'Público' },
      2: { color: '#0072CE', label: 'Restringido' },
      3: { color: '#C77700', label: 'Confidencial' },
      4: { color: '#ef4444', label: 'Alta Dirección' }
    };
    return config[level] || config[1];
  };

  const moduleIcons = {
    '8d': '',
    'quality_alert': '',
    'mrb': '',
    'ecr': '',
    'audits': '',
    'defects': '',
    'clients': '',
    'workload': '',
    'users': ''
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: t.bgCard,
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${t.border}`,
      padding: '16px 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerContent: {
      maxWidth: '1600px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    backButton: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgPanel,
      color: t.text,
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
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
      marginTop: '2px'
    },
    createButton: {
      padding: '12px 24px',
      backgroundColor: t.accent,
      border: 'none',
      borderRadius: '12px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease'
    },
    mainContent: {
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '24px 32px',
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: '24px',
      minHeight: 'calc(100vh - 80px)'
    },
    sidebar: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    searchBox: {
      backgroundColor: t.bgCard,
      borderRadius: '16px',
      padding: '4px',
      border: `1px solid ${t.border}`
    },
    searchInput: {
      width: '100%',
      padding: '14px 16px',
      background: 'transparent',
      border: 'none',
      color: t.text,
      fontSize: '14px',
      outline: 'none'
    },
    rolesSection: {
      backgroundColor: t.bgCard,
      borderRadius: '20px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    sectionHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      color: t.textMuted
    },
    rolesList: {
      padding: '8px'
    },
    roleCard: {
      padding: '16px',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginBottom: '4px',
      border: '1px solid transparent'
    },
    roleCardSelected: {
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.accent}`
    },
    roleCardHover: {
      backgroundColor: t.bgPanel
    },
    roleName: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    roleDescription: {
      fontSize: '13px',
      color: t.textMuted,
      lineHeight: '1.4'
    },
    systemBadge: {
      fontSize: '10px',
      padding: '2px 8px',
      borderRadius: '6px',
      background: 'rgba(139, 92, 246, 0.2)',
      color: '#a78bfa',
      fontWeight: '600'
    },
    usersCount: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    detailPanel: {
      backgroundColor: t.bgCard,
      borderRadius: '20px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    detailHeader: {
      padding: '24px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    detailTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: t.text,
      marginBottom: '8px'
    },
    detailActions: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: {
      padding: '10px 20px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s ease'
    },
    editButton: {
      background: 'rgba(59, 130, 246, 0.2)',
      color: '#60a5fa'
    },
    deleteButton: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#f87171'
    },
    saveButton: {
      background: 'linear-gradient(135deg, #2E7D32 0%, #2E7D32 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
    },
    cancelButton: {
      background: 'rgba(100, 116, 139, 0.2)',
      color: '#94a3b8'
    },
    detailBody: {
      padding: '24px',
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 220px)'
    },
    formGroup: {
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: t.textMuted,
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.text,
      fontSize: '15px',
      outline: 'none',
      transition: 'all 0.2s ease'
    },
    textarea: {
      width: '100%',
      padding: '14px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.text,
      fontSize: '15px',
      outline: 'none',
      resize: 'vertical',
      minHeight: '80px'
    },
    clearanceSelector: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px'
    },
    clearanceOption: {
      padding: '12px',
      borderRadius: '10px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      backgroundColor: t.bgPanel,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease'
    },
    clearanceOptionSelected: {
      backgroundColor: t.bgPanel
    },
    clearanceLabel: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '4px'
    },
    permissionsGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    moduleCard: {
      backgroundColor: t.bgPanel,
      borderRadius: '16px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    moduleHeader: {
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${t.border}`
    },
    moduleInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    moduleIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: t.bgCard,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px'
    },
    moduleName: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text
    },
    moduleDesc: {
      fontSize: '12px',
      color: t.textMuted
    },
    accessSelector: {
      display: 'flex',
      gap: '4px',
      backgroundColor: t.bg,
      borderRadius: '10px',
      padding: '4px'
    },
    accessOption: {
      padding: '8px 14px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: 'transparent',
      color: t.textMuted
    },
    accessOptionSelected: {
      color: 'white'
    },
    sectionsContainer: {
      padding: '16px 20px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '8px'
    },
    sectionToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '8px',
      backgroundColor: t.bgCard,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent'
    },
    sectionToggleActive: {
      background: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      borderRadius: '5px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: t.border,
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    checkboxChecked: {
      background: '#2E7D32',
      borderColor: '#2E7D32'
    },
    sectionName: {
      fontSize: '13px',
      color: t.textMuted
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '60px',
      textAlign: 'center'
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '24px',
      opacity: 0.5
    },
    emptyText: {
      fontSize: '18px',
      color: t.textMuted,
      marginBottom: '8px'
    },
    emptySubtext: {
      fontSize: '14px',
      color: t.textMuted
    },
    notification: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '16px 24px',
      borderRadius: '12px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease',
      zIndex: 1000
    },
    notificationSuccess: {
      background: 'linear-gradient(135deg, #2E7D32 0%, #2E7D32 100%)'
    },
    notificationError: {
      background: 'linear-gradient(135deg, #ef4444 0%, #B00020 100%)'
    },
    deleteModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    },
    deleteModalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '400px',
      width: '90%',
      border: `1px solid ${t.border}`,
      textAlign: 'center'
    },
    deleteModalIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      background: 'rgba(239, 68, 68, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      margin: '0 auto 20px'
    },
    deleteModalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '8px'
    },
    deleteModalText: {
      fontSize: '14px',
      color: t.textMuted,
      marginBottom: '24px'
    },
    deleteModalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    },
    loadingSpinner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: t.bg
    },
    spinner: {
      width: '48px',
      height: '48px',
      border: `3px solid ${t.border}`,
      borderTopColor: t.accent,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  // Render permission view (read-only)
  const renderPermissionView = (permissions) => {
    return (
      <div style={styles.permissionsGrid}>
        {modules.map(module => {
          const perm = permissions[module.id] || { access: 'none' };
          const badge = getAccessBadge(perm.access);

          return (
            <div key={module.id} style={styles.moduleCard}>
              <div style={styles.moduleHeader}>
                <div style={styles.moduleInfo}>
                  <div style={styles.moduleIcon}>{moduleIcons[module.id] || ''}</div>
                  <div>
                    <div style={styles.moduleName}>{module.name}</div>
                    <div style={styles.moduleDesc}>{module.description}</div>
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: badge.bg,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{badge.icon}</span>
                  {badge.label}
                </div>
              </div>

              {perm.sections && module.sections && (
                <div style={styles.sectionsContainer}>
                  {module.sections.map(section => (
                    <div
                      key={section.id}
                      style={{
                        ...styles.sectionToggle,
                        ...(perm.sections[section.id] ? styles.sectionToggleActive : {})
                      }}
                    >
                      <div style={{
                        ...styles.checkbox,
                        ...(perm.sections[section.id] ? styles.checkboxChecked : {})
                      }}>
                        {perm.sections[section.id] && <span style={{ color: 'white', fontSize: '12px' }}></span>}
                      </div>
                      <span style={styles.sectionName}>{section.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render permission editor
  const renderPermissionEditor = () => {
    return (
      <div style={styles.permissionsGrid}>
        {modules.map(module => {
          const perm = formData.permissions[module.id] || { access: 'none' };

          return (
            <div key={module.id} style={styles.moduleCard}>
              <div style={styles.moduleHeader}>
                <div style={styles.moduleInfo}>
                  <div style={styles.moduleIcon}>{moduleIcons[module.id] || ''}</div>
                  <div>
                    <div style={styles.moduleName}>{module.name}</div>
                    <div style={styles.moduleDesc}>{module.description}</div>
                  </div>
                </div>
                <div style={styles.accessSelector}>
                  {['none', 'view', 'partial', 'full'].map(access => {
                    const badge = getAccessBadge(access);
                    const isSelected = perm.access === access;
                    return (
                      <button
                        key={access}
                        onClick={() => handlePermissionChange(module.id, 'access', access)}
                        style={{
                          ...styles.accessOption,
                          ...(isSelected ? {
                            ...styles.accessOptionSelected,
                            background: badge.bg
                          } : {})
                        }}
                      >
                        {badge.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {module.sections && perm.access !== 'none' && perm.access !== 'full' && (
                <div style={styles.sectionsContainer}>
                  {module.sections.map(section => {
                    const isActive = perm.sections?.[section.id] || false;
                    return (
                      <div
                        key={section.id}
                        onClick={() => handleSectionToggle(module.id, section.id, !isActive)}
                        style={{
                          ...styles.sectionToggle,
                          ...(isActive ? styles.sectionToggleActive : {})
                        }}
                      >
                        <div style={{
                          ...styles.checkbox,
                          ...(isActive ? styles.checkboxChecked : {})
                        }}>
                          {isActive && <span style={{ color: 'white', fontSize: '12px' }}></span>}
                        </div>
                        <span style={styles.sectionName}>{section.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingSpinner}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #475569; }
        textarea::placeholder { color: #475569; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => navigate('/')}
              style={styles.backButton}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
            >
              ←
            </button>
            <div>
              <h1 style={styles.title}>Gestión de Roles</h1>
              <p style={styles.subtitle}>{roles.length} roles configurados</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <button
              onClick={handleCreateNew}
              style={styles.createButton}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              Crear Rol
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar - Roles List */}
        <div style={styles.sidebar}>
          {/* Search */}
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* System Roles */}
          <div style={styles.rolesSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>Roles del Sistema</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{systemRoles.length}</span>
            </div>
            <div style={styles.rolesList}>
              {systemRoles.map(role => (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  style={{
                    ...styles.roleCard,
                    ...(selectedRole?.id === role.id ? styles.roleCardSelected : {})
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRole?.id !== role.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRole?.id !== role.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={styles.roleName}>
                    {role.name}
                    <span style={styles.systemBadge}>SISTEMA</span>
                  </div>
                  <div style={styles.roleDescription}>{role.description}</div>
                  <div style={styles.usersCount}>
                    <span></span>
                    {role.usersCount || 0} usuarios
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Roles */}
          <div style={styles.rolesSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>Roles Personalizados</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{customRoles.length}</span>
            </div>
            <div style={styles.rolesList}>
              {customRoles.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}></div>
                  <div style={{ fontSize: '13px' }}>No hay roles personalizados</div>
                </div>
              ) : (
                customRoles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    style={{
                      ...styles.roleCard,
                      ...(selectedRole?.id === role.id ? styles.roleCardSelected : {})
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRole?.id !== role.id) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRole?.id !== role.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={styles.roleName}>{role.name}</div>
                    <div style={styles.roleDescription}>{role.description}</div>
                    <div style={styles.usersCount}>
                      <span></span>
                      {role.usersCount || 0} usuarios
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div style={styles.detailPanel}>
          {!selectedRole && !isCreating ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}></div>
              <div style={styles.emptyText}>Selecciona un rol para ver sus detalles</div>
              <div style={styles.emptySubtext}>O crea un nuevo rol personalizado</div>
            </div>
          ) : (
            <>
              <div style={styles.detailHeader}>
                <div>
                  {isCreating || isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del rol"
                      style={{ ...styles.input, fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}
                    />
                  ) : (
                    <div style={styles.detailTitle}>
                      {selectedRole?.name}
                      {selectedRole?.isSystem && <span style={{ ...styles.systemBadge, marginLeft: '12px' }}>SISTEMA</span>}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: `${getClearanceBadge(isCreating || isEditing ? formData.clearanceLevel : selectedRole?.clearanceLevel).color}20`,
                      color: getClearanceBadge(isCreating || isEditing ? formData.clearanceLevel : selectedRole?.clearanceLevel).color,
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      Nivel {isCreating || isEditing ? formData.clearanceLevel : selectedRole?.clearanceLevel}: {getClearanceBadge(isCreating || isEditing ? formData.clearanceLevel : selectedRole?.clearanceLevel).label}
                    </div>
                  </div>
                </div>

                <div style={styles.detailActions}>
                  {isCreating || isEditing ? (
                    <>
                      <button
                        onClick={() => { setIsCreating(false); setIsEditing(false); }}
                        style={{ ...styles.actionButton, ...styles.cancelButton }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        style={{ ...styles.actionButton, ...styles.saveButton }}
                      >
                         Guardar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditRole}
                        style={{ ...styles.actionButton, ...styles.editButton }}
                      >
                         Editar
                      </button>
                      {!selectedRole?.isSystem && (
                        <button
                          onClick={() => setShowDeleteConfirm(selectedRole?.id)}
                          style={{ ...styles.actionButton, ...styles.deleteButton }}
                        >
                           Eliminar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div style={styles.detailBody}>
                {/* Description */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Descripción</label>
                  {isCreating || isEditing ? (
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe el propósito de este rol..."
                      style={styles.textarea}
                    />
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                      {selectedRole?.description || 'Sin descripción'}
                    </p>
                  )}
                </div>

                {/* Clearance Level */}
                {(isCreating || isEditing) && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nivel de Confidencialidad</label>
                    <div style={styles.clearanceSelector}>
                      {[1, 2, 3, 4].map(level => {
                        const badge = getClearanceBadge(level);
                        const isSelected = formData.clearanceLevel === level;
                        return (
                          <div
                            key={level}
                            onClick={() => setFormData({ ...formData, clearanceLevel: level })}
                            style={{
                              ...styles.clearanceOption,
                              ...(isSelected ? { ...styles.clearanceOptionSelected, borderColor: badge.color } : {})
                            }}
                          >
                            <div style={{ fontSize: '20px', color: badge.color }}>{level}</div>
                            <div style={styles.clearanceLabel}>{badge.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Permissions */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Permisos por Módulo</label>
                  {isCreating || isEditing
                    ? renderPermissionEditor()
                    : renderPermissionView(selectedRole?.permissions || {})
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          ...styles.notification,
          ...(notification.type === 'success' ? styles.notificationSuccess : styles.notificationError)
        }}>
          <span>{notification.type === 'success' ? '' : ''}</span>
          {notification.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.deleteModal}>
          <div style={styles.deleteModalContent}>
            <div style={styles.deleteModalIcon}></div>
            <div style={styles.deleteModalTitle}>¿Eliminar este rol?</div>
            <div style={styles.deleteModalText}>
              Esta acción no se puede deshacer. Los usuarios con este rol perderán sus permisos.
            </div>
            <div style={styles.deleteModalButtons}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{ ...styles.actionButton, ...styles.cancelButton }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                style={{
                  ...styles.actionButton,
                  background: 'linear-gradient(135deg, #ef4444 0%, #B00020 100%)',
                  color: 'white'
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesManagement;
