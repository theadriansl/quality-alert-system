import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import api from '../services/api';
import { isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';

const UserManagement = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const [currentView, setCurrentView] = useState('list'); // 'list', 'form', 'roles'
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Roles management
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    position: '',
    role: 'engineer',
    systemRole: 'user',
    department: '',
    phone: '',
    extension: '',
    location: '',
    availability: 'available',
    emergencyContact: '',
    managerId: '',
    hierarchyLevel: 3,
    canAssign: false
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUsers();
    loadAvailableRoles();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    setIsCurrentUserAdmin(isUserAdmin(currentUser));
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, departmentFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getAllUsers();
      const normalizedUsers = usersData.map(user => ({
        ...user,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }));
      setUsers(normalizedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const response = await api.get('/roles');
      if (response.data.success) {
        setAvailableRoles(response.data.roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUserRoles = async (userId) => {
    try {
      setRolesLoading(true);
      const response = await api.get(`/users/${userId}/roles`);
      if (response.data.success) {
        setUserRoles(response.data.roles);
      }
    } catch (error) {
      console.error('Error loading user roles:', error);
      setUserRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(user => user.department === departmentFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleOpenRolesModal = async (user) => {
    setSelectedUserForRoles(user);
    setShowRolesModal(true);
    await loadUserRoles(user.id);
  };

  const handleAssignRole = async (roleId) => {
    try {
      const response = await api.post(`/users/${selectedUserForRoles.id}/roles`, { roleId });
      if (response.data.success) {
        showNotification(response.data.message, 'success');
        await loadUserRoles(selectedUserForRoles.id);
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Error al asignar rol', 'error');
    }
  };

  const handleRevokeRole = async (roleId) => {
    try {
      const response = await api.delete(`/users/${selectedUserForRoles.id}/roles/${roleId}`);
      if (response.data.success) {
        showNotification('Rol revocado exitosamente', 'success');
        await loadUserRoles(selectedUserForRoles.id);
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Error al revocar rol', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Requerido';
    if (!formData.firstName.trim()) newErrors.firstName = 'Requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Requerido';
    if (!formData.department.trim()) newErrors.department = 'Requerido';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingUser) {
        const updatedUserData = {
          ...formData,
          name: `${formData.firstName} ${formData.lastName}`
        };
        await userService.updateUser(editingUser.id, updatedUserData);
        setUsers(prev => prev.map(user =>
          user.id === editingUser.id ? { ...user, ...updatedUserData } : user
        ));
        showNotification('Usuario actualizado exitosamente');
      } else {
        const newUserData = {
          email: formData.email,
          password: 'temporal123',
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          department: formData.department,
          phone: formData.phone
        };
        const result = await userService.createUser(newUserData);
        if (result.success) {
          await loadUsers();
          showNotification('Usuario creado exitosamente');
        }
      }
      resetForm();
      setCurrentView('list');
    } catch (error) {
      showNotification(error.message || 'Error al guardar', 'error');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      position: user.position || '',
      role: user.role?.toLowerCase() || 'engineer',
      systemRole: user.systemRole || 'user',
      department: user.department || '',
      phone: user.phone || '',
      extension: user.extension || '',
      location: user.location || '',
      availability: user.availability || 'available',
      emergencyContact: user.emergencyContact || '',
      managerId: user.managerId || '',
      hierarchyLevel: user.hierarchyLevel || 3,
      canAssign: user.canAssign || false
    });
    setCurrentView('form');
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Usuario eliminado');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      position: '',
      role: 'engineer',
      systemRole: 'user',
      department: '',
      phone: '',
      extension: '',
      location: '',
      availability: 'available',
      emergencyContact: '',
      managerId: '',
      hierarchyLevel: 3,
      canAssign: false
    });
    setEditingUser(null);
    setErrors({});
  };

  const getUniqueDepartments = () => {
    return [...new Set(users.map(user => user.department).filter(Boolean))].sort();
  };

  const getRoleBadgeStyle = (role) => {
    const config = {
      champion: { bg: 'linear-gradient(135deg, #ef4444 0%, #B00020 100%)', color: 'white' },
      manager: { bg: 'linear-gradient(135deg, #C77700 0%, #C77700 100%)', color: 'white' },
      engineer: { bg: 'linear-gradient(135deg, #2E7D32 0%, #2E7D32 100%)', color: 'white' },
      technician: { bg: `linear-gradient(135deg, ${t.accent} 0%, ${t.accent} 100%)`, color: 'white' }
    };
    return config[role] || config.engineer;
  };

  const getAvailabilityStyle = (availability) => {
    const config = {
      available: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', label: 'Disponible' },
      busy: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', label: 'Ocupado' },
      unavailable: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', label: 'No disponible' }
    };
    return config[availability] || config.available;
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
      maxWidth: '1400px',
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
      transition: 'all 0.2s'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '13px',
      color: t.textMuted
    },
    headerActions: {
      display: 'flex',
      gap: '12px'
    },
    primaryButton: {
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
      transition: 'all 0.2s'
    },
    secondaryButton: {
      padding: '12px 24px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.textMuted,
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px 32px'
    },
    filtersBar: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    searchInput: {
      flex: 1,
      minWidth: '300px',
      padding: '14px 20px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s'
    },
    filterSelect: {
      padding: '14px 20px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      minWidth: '180px'
    },
    usersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '20px'
    },
    userCard: {
      backgroundColor: t.bgCard,
      borderRadius: '20px',
      border: `1px solid ${t.border}`,
      padding: '24px',
      transition: 'all 0.3s ease'
    },
    userCardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    userInfo: {
      display: 'flex',
      gap: '16px'
    },
    avatar: {
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      backgroundColor: t.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '600',
      color: 'white'
    },
    userName: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '4px'
    },
    userEmail: {
      fontSize: '13px',
      color: t.textMuted,
      marginBottom: '8px'
    },
    userMeta: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600'
    },
    userDetails: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: t.bgPanel,
      borderRadius: '12px'
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    detailLabel: {
      fontSize: '11px',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    detailValue: {
      fontSize: '13px',
      color: t.text
    },
    userRolesSection: {
      marginBottom: '16px'
    },
    rolesLabel: {
      fontSize: '11px',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px'
    },
    rolesList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px'
    },
    roleTag: {
      padding: '6px 12px',
      borderRadius: '8px',
      background: 'rgba(139, 92, 246, 0.2)',
      color: '#a78bfa',
      fontSize: '12px',
      fontWeight: '500'
    },
    noRoles: {
      fontSize: '12px',
      color: t.textMuted,
      fontStyle: 'italic'
    },
    userActions: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end'
    },
    actionButton: {
      padding: '10px 16px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s'
    },
    editBtn: {
      background: 'rgba(59, 130, 246, 0.2)',
      color: '#60a5fa'
    },
    rolesBtn: {
      background: 'rgba(139, 92, 246, 0.2)',
      color: '#a78bfa'
    },
    deleteBtn: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#f87171'
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '24px',
      border: `1px solid ${t.border}`,
      width: '90%',
      maxWidth: '600px',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
    },
    modalHeader: {
      padding: '24px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: t.text
    },
    closeButton: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    modalBody: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1
    },
    rolesSection: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: t.textMuted,
      marginBottom: '12px'
    },
    roleItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      marginBottom: '8px',
      border: `1px solid ${t.border}`
    },
    roleItemInfo: {
      flex: 1
    },
    roleItemName: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    roleItemDesc: {
      fontSize: '12px',
      color: t.textMuted
    },
    systemBadge: {
      padding: '2px 8px',
      borderRadius: '6px',
      background: 'rgba(139, 92, 246, 0.2)',
      color: '#a78bfa',
      fontSize: '10px',
      fontWeight: '600'
    },
    assignButton: {
      padding: '10px 20px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    assignBtn: {
      background: 'linear-gradient(135deg, #2E7D32 0%, #2E7D32 100%)',
      color: 'white'
    },
    revokeBtn: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#f87171'
    },
    // Form styles
    formContainer: {
      backgroundColor: t.bgCard,
      borderRadius: '24px',
      border: `1px solid ${t.border}`,
      padding: '32px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    formLabel: {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: t.textMuted
    },
    formInput: {
      padding: '14px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s'
    },
    formSelect: {
      padding: '14px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      color: t.text,
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer'
    },
    formError: {
      fontSize: '12px',
      color: '#f87171'
    },
    formActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: `1px solid ${t.border}`
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
      zIndex: 1000,
      animation: 'slideIn 0.3s ease'
    },
    notificationSuccess: {
      background: 'linear-gradient(135deg, #2E7D32 0%, #2E7D32 100%)'
    },
    notificationError: {
      background: 'linear-gradient(135deg, #ef4444 0%, #B00020 100%)'
    },
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px'
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

  // Render user card
  const renderUserCard = (user) => {
    const roleStyle = getRoleBadgeStyle(user.role);
    const availStyle = getAvailabilityStyle(user.availability);

    return (
      <div
        key={user.id}
        style={styles.userCard}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={styles.userCardHeader}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userEmail}>{user.email}</div>
              <div style={styles.userMeta}>
                <span style={{
                  ...styles.badge,
                  background: roleStyle.bg,
                  color: roleStyle.color
                }}>
                  {user.role}
                </span>
                <span style={{
                  ...styles.badge,
                  background: availStyle.bg,
                  color: availStyle.color
                }}>
                  {availStyle.label}
                </span>
                {user.systemRole === 'admin' && (
                  <span style={{
                    ...styles.badge,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171'
                  }}>
                    ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.userDetails}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Departamento</span>
            <span style={styles.detailValue}>{user.department || '-'}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Posición</span>
            <span style={styles.detailValue}>{user.position || '-'}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Teléfono</span>
            <span style={styles.detailValue}>{user.phone || '-'}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Ubicación</span>
            <span style={styles.detailValue}>{user.location || '-'}</span>
          </div>
        </div>

        {isCurrentUserAdmin && (
          <div style={styles.userActions}>
            <button
              onClick={() => handleOpenRolesModal(user)}
              style={{ ...styles.actionButton, ...styles.rolesBtn }}
            >
              Roles
            </button>
            <button
              onClick={() => handleEdit(user)}
              style={{ ...styles.actionButton, ...styles.editBtn }}
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(user.id)}
              style={{ ...styles.actionButton, ...styles.deleteBtn }}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render roles modal
  const renderRolesModal = () => {
    if (!showRolesModal || !selectedUserForRoles) return null;

    const assignedRoleIds = userRoles.filter(r => r.isActive).map(r => r.id);
    const unassignedRoles = availableRoles.filter(r => !assignedRoleIds.includes(r.id));
    const assignedRoles = userRoles.filter(r => r.isActive);

    return (
      <div style={styles.modalOverlay} onClick={() => setShowRolesModal(false)}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>
              <div style={styles.modalTitle}>
                Roles de {selectedUserForRoles.firstName} {selectedUserForRoles.lastName}
              </div>
              <div style={{ fontSize: '13px', color: t.textDim, marginTop: '4px' }}>
                {selectedUserForRoles.email}
              </div>
            </div>
            <button
              onClick={() => setShowRolesModal(false)}
              style={styles.closeButton}
            >
              
            </button>
          </div>

          <div style={styles.modalBody}>
            {rolesLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
              </div>
            ) : (
              <>
                {/* Assigned Roles */}
                <div style={styles.rolesSection}>
                  <div style={styles.sectionTitle}>
                    Roles Asignados ({assignedRoles.length})
                  </div>
                  {assignedRoles.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: t.textDim }}>
                      Este usuario no tiene roles asignados
                    </div>
                  ) : (
                    assignedRoles.map(role => (
                      <div key={role.id} style={styles.roleItem}>
                        <div style={styles.roleItemInfo}>
                          <div style={styles.roleItemName}>
                            {role.name}
                            {role.isSystem && <span style={styles.systemBadge}>SISTEMA</span>}
                          </div>
                          <div style={styles.roleItemDesc}>{role.description}</div>
                        </div>
                        <button
                          onClick={() => handleRevokeRole(role.id)}
                          style={{ ...styles.assignButton, ...styles.revokeBtn }}
                        >
                          Revocar
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Available Roles */}
                <div style={styles.rolesSection}>
                  <div style={styles.sectionTitle}>
                    Roles Disponibles ({unassignedRoles.length})
                  </div>
                  {unassignedRoles.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: t.textDim }}>
                      Todos los roles están asignados
                    </div>
                  ) : (
                    unassignedRoles.map(role => (
                      <div key={role.id} style={styles.roleItem}>
                        <div style={styles.roleItemInfo}>
                          <div style={styles.roleItemName}>
                            {role.name}
                            {role.isSystem && <span style={styles.systemBadge}>SISTEMA</span>}
                          </div>
                          <div style={styles.roleItemDesc}>{role.description}</div>
                        </div>
                        <button
                          onClick={() => handleAssignRole(role.id)}
                          style={{ ...styles.assignButton, ...styles.assignBtn }}
                        >
                          + Asignar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render form view
  const renderForm = () => (
    <div style={styles.formContainer}>
      <form onSubmit={handleSubmit}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              style={{
                ...styles.formInput,
                borderColor: errors.email ? '#f87171' : 'rgba(255,255,255,0.1)'
              }}
              placeholder="usuario@empresa.com"
            />
            {errors.email && <span style={styles.formError}>{errors.email}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Rol del Sistema</label>
            <select
              name="systemRole"
              value={formData.systemRole}
              onChange={handleInputChange}
              style={styles.formSelect}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Nombre *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              style={{
                ...styles.formInput,
                borderColor: errors.firstName ? '#f87171' : 'rgba(255,255,255,0.1)'
              }}
            />
            {errors.firstName && <span style={styles.formError}>{errors.firstName}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Apellido *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              style={{
                ...styles.formInput,
                borderColor: errors.lastName ? '#f87171' : 'rgba(255,255,255,0.1)'
              }}
            />
            {errors.lastName && <span style={styles.formError}>{errors.lastName}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Posición</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              style={styles.formInput}
              placeholder="Ej: Ingeniero de Calidad Senior"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Rol Organizacional</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={styles.formSelect}
            >
              <option value="champion">Champion</option>
              <option value="manager">Manager</option>
              <option value="engineer">Engineer</option>
              <option value="technician">Technician</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Departamento *</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              list="departments"
              style={{
                ...styles.formInput,
                borderColor: errors.department ? '#f87171' : 'rgba(255,255,255,0.1)'
              }}
            />
            <datalist id="departments">
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
            {errors.department && <span style={styles.formError}>{errors.department}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              style={styles.formInput}
              placeholder="+52-555-0000"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Ubicación</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              style={styles.formInput}
              placeholder="Planta Norte - Oficina 201"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Disponibilidad</label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleInputChange}
              style={styles.formSelect}
            >
              <option value="available">Disponible</option>
              <option value="busy">Ocupado</option>
              <option value="unavailable">No Disponible</option>
            </select>
          </div>
        </div>

        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => { resetForm(); setCurrentView('list'); }}
            style={styles.secondaryButton}
          >
            Cancelar
          </button>
          <button type="submit" style={styles.primaryButton}>
            {editingUser ? 'Actualizar' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, select::placeholder { color: #475569; }
        option { background: ${t.text}; color: white; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => currentView === 'list' ? navigate('/') : setCurrentView('list')}
              style={styles.backButton}
            >
              ←
            </button>
            <div>
              <h1 style={styles.title}>
                {currentView === 'list' ? 'Gestión de Usuarios' : editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h1>
              <p style={styles.subtitle}>
                {currentView === 'list' ? `${filteredUsers.length} usuarios` : 'Complete la información'}
              </p>
            </div>
          </div>

          {currentView === 'list' && isCurrentUserAdmin && (
            <div style={styles.headerActions}>
              <button
                onClick={() => navigate('/roles-management')}
                style={styles.secondaryButton}
              >
                Gestionar Roles
              </button>
              <button
                onClick={() => { resetForm(); setCurrentView('form'); }}
                style={styles.primaryButton}
              >
                + Nuevo Usuario
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {currentView === 'list' ? (
          <>
            {/* Filters */}
            <div style={styles.filtersBar}>
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">Todos los roles</option>
                <option value="champion">Champion</option>
                <option value="manager">Manager</option>
                <option value="engineer">Engineer</option>
                <option value="technician">Technician</option>
              </select>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">Todos los departamentos</option>
                {getUniqueDepartments().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Users Grid */}
            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
              </div>
            ) : (
              <div style={styles.usersGrid}>
                {filteredUsers.map(user => renderUserCard(user))}
              </div>
            )}
          </>
        ) : (
          renderForm()
        )}
      </div>

      {/* Roles Modal */}
      {renderRolesModal()}

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
    </div>
  );
};

export default UserManagement;
