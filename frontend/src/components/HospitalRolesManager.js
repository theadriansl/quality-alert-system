/**
 * HospitalRolesManager.js
 * Componente para gestionar roles secundarios del Hospital de Defectos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  getHospitalUsers,
  assignHospitalRole,
  removeUserHospitalRole
} from '../services/hospitalRolesService';

const HospitalRolesManager = () => {
  const { theme: t } = useTheme();

  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'with_roles', 'without_roles'
  const [search, setSearch] = useState('');

  // Modal para asignar rol
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleForm, setRoleForm] = useState({
    hospitalRole: 'repairer',
    canManageRoles: false,
    canManageDeviations: false,
    canScrap: false,
    canUploadProduction: false,
    notes: ''
  });

  // Cargar usuarios
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar usuarios con roles de hospital
      const response = await getHospitalUsers();
      if (response.success) {
        setAllUsers(response.data);
        setUsers(response.data);
      } else {
        setError(response.message || 'Error al cargar usuarios');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtrar usuarios
  useEffect(() => {
    let filtered = [...allUsers];

    // Filtro por roles
    if (filter === 'with_roles') {
      filtered = filtered.filter(u => u.hospitalRoles && u.hospitalRoles.length > 0);
    } else if (filter === 'without_roles') {
      filtered = filtered.filter(u => !u.hospitalRoles || u.hospitalRoles.length === 0);
    }

    // Filtro por búsqueda
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(u =>
        u.fullName?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.department?.toLowerCase().includes(s)
      );
    }

    setUsers(filtered);
  }, [allUsers, filter, search]);

  // Abrir modal para asignar rol
  const openAssignModal = (user) => {
    setSelectedUser(user);
    setRoleForm({
      hospitalRole: 'repairer',
      canManageRoles: false,
      canManageDeviations: false,
      canScrap: false,
      canUploadProduction: false,
      notes: ''
    });
    setShowModal(true);
  };

  // Asignar rol
  const handleAssignRole = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await assignHospitalRole(
        selectedUser.userId,
        roleForm.hospitalRole,
        null, // assignedStations
        roleForm.canManageRoles,
        roleForm.canManageDeviations,
        roleForm.canScrap,
        roleForm.canUploadProduction,
        roleForm.notes
      );

      if (response.success) {
        setSuccess(`Rol asignado a ${selectedUser.fullName}`);
        setShowModal(false);
        loadUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Error al asignar rol');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Quitar rol
  const handleRemoveRole = async (user, role) => {
    if (!window.confirm(`¿Quitar rol "${role}" a ${user.fullName}?`)) return;

    try {
      setLoading(true);
      const response = await removeUserHospitalRole(user.userId, role);

      if (response.success) {
        setSuccess(`Rol removido de ${user.fullName}`);
        loadUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Error al remover rol');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Estilos
  const styles = {
    container: {
      padding: '20px',
      backgroundColor: t.bg,
      minHeight: '100%'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    filters: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    searchInput: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard,
      color: t.text,
      fontSize: '13px',
      width: '200px'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard,
      color: t.text,
      fontSize: '13px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      overflow: 'hidden'
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      backgroundColor: t.bgPanel,
      color: t.text,
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      borderBottom: `1px solid ${t.border}`
    },
    td: {
      padding: '12px 16px',
      borderBottom: `1px solid ${t.border}`,
      color: t.text,
      fontSize: '13px'
    },
    badge: {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      marginRight: '4px',
      marginBottom: '4px'
    },
    badgeRepairer: {
      backgroundColor: t.warning + '20',
      color: t.warning,
      border: `1px solid ${t.warning}`
    },
    badgeInspector: {
      backgroundColor: t.success + '20',
      color: t.success,
      border: `1px solid ${t.success}`
    },
    badgeAdmin: {
      backgroundColor: t.primary + '20',
      color: t.primary,
      border: `1px solid ${t.primary}`
    },
    badgeManager: {
      backgroundColor: t.accent + '20',
      color: t.accent,
      border: `1px solid ${t.accent}`
    },
    badgeDeviation: {
      backgroundColor: (t.info || '#8b5cf6') + '20',
      color: t.info || '#8b5cf6',
      border: `1px solid ${t.info || '#8b5cf6'}`
    },
    btnSmall: {
      padding: '4px 8px',
      fontSize: '11px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      marginRight: '4px'
    },
    btnPrimary: {
      backgroundColor: t.primary,
      color: 'white'
    },
    btnDanger: {
      backgroundColor: t.error,
      color: 'white'
    },
    btnSuccess: {
      backgroundColor: t.success,
      color: 'white'
    },
    alert: {
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '13px'
    },
    alertError: {
      backgroundColor: t.error + '20',
      color: t.error,
      border: `1px solid ${t.error}`
    },
    alertSuccess: {
      backgroundColor: t.success + '20',
      color: t.success,
      border: `1px solid ${t.success}`
    },
    modal: {
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
    modalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '400px',
      maxWidth: '90%'
    },
    modalTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '20px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '500',
      color: t.textMuted,
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bg,
      color: t.text,
      fontSize: '14px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: t.text
    },
    modalActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px'
    },
    btn: {
      padding: '10px 20px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer'
    },
    btnCancel: {
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`
    },
    noData: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    },
    legend: {
      display: 'flex',
      gap: '16px',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: t.textMuted
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'repairer': return styles.badgeRepairer;
      case 'inspector': return styles.badgeInspector;
      case 'admin': return styles.badgeAdmin;
      default: return {};
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'repairer': return 'Reparador';
      case 'inspector': return 'Inspector';
      case 'admin': return 'Admin Hospital';
      default: return role;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Roles de Hospital de Defectos</h2>
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">Todos los usuarios</option>
            <option value="with_roles">Con roles asignados</option>
            <option value="without_roles">Sin roles</option>
          </select>
          <button
            onClick={loadUsers}
            disabled={loading}
            style={{ ...styles.btnSmall, ...styles.btnPrimary, padding: '8px 16px' }}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.badge, ...styles.badgeRepairer }}>Reparador</span>
          <span>Puede reparar defectos</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.badge, ...styles.badgeInspector }}>Inspector</span>
          <span>Puede liberar defectos</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.badge, ...styles.badgeAdmin }}>Admin</span>
          <span>Acceso completo</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.badge, ...styles.badgeManager }}>Gestor</span>
          <span>Puede asignar roles</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.badge, ...styles.badgeDeviation }}>Desviaciones</span>
          <span>Puede gestionar SAE/Waivers</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}
      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>
          {success}
        </div>
      )}

      {/* Tabla de usuarios */}
      {loading && users.length === 0 ? (
        <div style={styles.noData}>Cargando usuarios...</div>
      ) : users.length === 0 ? (
        <div style={styles.noData}>No se encontraron usuarios</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Usuario</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Departamento</th>
              <th style={styles.th}>Roles Hospital</th>
              <th style={styles.th}>Permisos</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.userId}>
                <td style={styles.td}>
                  <strong>{user.fullName}</strong>
                  <div style={{ fontSize: '11px', color: t.textMuted }}>{user.systemRole}</div>
                </td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.department || '-'}</td>
                <td style={styles.td}>
                  {user.hospitalRoles && user.hospitalRoles.length > 0 ? (
                    user.hospitalRoles.map((roleItem, idx) => {
                      // Soportar tanto string como objeto {role: 'repairer', ...}
                      const roleName = typeof roleItem === 'string' ? roleItem : roleItem.role;
                      return (
                        <span
                          key={roleName || idx}
                          style={{ ...styles.badge, ...getRoleBadgeStyle(roleName) }}
                        >
                          {getRoleLabel(roleName)}
                          <button
                            onClick={() => handleRemoveRole(user, roleName)}
                            style={{
                              marginLeft: '4px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'inherit',
                              fontSize: '12px',
                              padding: 0
                            }}
                            title="Quitar rol"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>Sin roles</span>
                  )}
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {user.canRepair && <span style={{ color: t.warning, fontSize: '11px' }}>Reparar</span>}
                    {user.canRelease && <span style={{ color: t.success, fontSize: '11px' }}>Liberar</span>}
                    {user.canManageHospitalRoles && (
                      <span style={{ ...styles.badge, ...styles.badgeManager }}>Gestor</span>
                    )}
                    {user.canManageDeviations && (
                      <span style={{ ...styles.badge, ...styles.badgeDeviation }}>Desviaciones</span>
                    )}
                    {user.canScrap && (
                      <span style={{ ...styles.badge, backgroundColor: (t.error || '#ef4444') + '20', color: t.error || '#ef4444', border: `1px solid ${t.error || '#ef4444'}` }}>SCRAP</span>
                    )}
                    {user.canUploadProduction && (
                      <span style={{ ...styles.badge, backgroundColor: (t.info || '#8b5cf6') + '20', color: t.info || '#8b5cf6', border: `1px solid ${t.info || '#8b5cf6'}` }}>Producción</span>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => openAssignModal(user)}
                    style={{ ...styles.btnSmall, ...styles.btnSuccess }}
                  >
                    + Rol
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal para asignar rol */}
      {showModal && selectedUser && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Asignar Rol a {selectedUser.fullName}
            </h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Rol de Hospital</label>
              <select
                value={roleForm.hospitalRole}
                onChange={(e) => setRoleForm({ ...roleForm, hospitalRole: e.target.value })}
                style={styles.input}
              >
                <option value="repairer">Reparador - Puede reparar defectos</option>
                <option value="inspector">Inspector - Puede liberar defectos</option>
                <option value="admin">Admin Hospital - Acceso completo</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={roleForm.canManageRoles}
                  onChange={(e) => setRoleForm({ ...roleForm, canManageRoles: e.target.checked })}
                />
                Puede gestionar roles de otros usuarios
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={roleForm.canManageDeviations}
                  onChange={(e) => setRoleForm({ ...roleForm, canManageDeviations: e.target.checked })}
                />
                Puede gestionar desviaciones (SAE, Waivers)
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={roleForm.canScrap}
                  onChange={(e) => setRoleForm({ ...roleForm, canScrap: e.target.checked })}
                />
                Puede marcar partes como SCRAP
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={roleForm.canUploadProduction}
                  onChange={(e) => setRoleForm({ ...roleForm, canUploadProduction: e.target.checked })}
                />
                Puede subir datos de producción
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notas (opcional)</label>
              <input
                type="text"
                value={roleForm.notes}
                onChange={(e) => setRoleForm({ ...roleForm, notes: e.target.value })}
                style={styles.input}
                placeholder="Ej: Asignado temporalmente..."
              />
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowModal(false)}
                style={{ ...styles.btn, ...styles.btnCancel }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignRole}
                disabled={loading}
                style={{ ...styles.btn, ...styles.btnPrimary, backgroundColor: t.success }}
              >
                {loading ? 'Guardando...' : 'Asignar Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalRolesManager;
