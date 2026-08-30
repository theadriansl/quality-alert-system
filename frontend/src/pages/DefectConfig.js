import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DefectConfig = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Active tab - read from URL hash if present
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['severities', 'shifts', 'dispositions', 'validators', 'hospitalUsers'];
    return validTabs.includes(hash) ? hash : 'severities';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Catalog data
  const [severities, setSeverities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [dispositions, setDispositions] = useState([]);
  const [qarValidators, setQarValidators] = useState([]);
  const [hospitalUsers, setHospitalUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userFilter, setUserFilter] = useState('');

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Helper para headers con token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  // Load catalog data (GLOBAL - no client needed)
  const loadCatalogData = useCallback(async () => {
    try {
      setLoading(true);
      const [sevRes, shfRes, disRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inspection-catalogs/severities?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/inspection-catalogs/shifts?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/inspection-catalogs/dispositions?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/auth/me`, { headers: getAuthHeaders() })
      ]);

      const [sevData, shfData, disData, userData] = await Promise.all([
        sevRes.json(), shfRes.json(), disRes.json(), userRes.json()
      ]);

      setSeverities(sevData.items || []);
      setShifts(shfData.items || []);
      setDispositions(disData.items || []);
      setCurrentUser(userData.user || null);

      // Load QAR validators and Hospital users if admin
      if (isUserAdmin(userData.user)) {
        const [valRes, usersRes, hospRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/qar-validators`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/users/list`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/defects-v2/authorized-users`, { headers: getAuthHeaders() })
        ]);
        const [valData, usersData, hospData] = await Promise.all([
          valRes.json(), usersRes.json(), hospRes.json()
        ]);
        setQarValidators(valData.users || []);
        setAllUsers(usersData.users || []);
        setHospitalUsers(hospData.users || []);
      }
    } catch (err) {
      setError('Error cargando catálogos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  // Get current items based on active tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case 'severities': return severities;
      case 'shifts': return shifts;
      case 'dispositions': return dispositions;
      case 'qarValidators': return qarValidators;
      case 'hospitalUsers': return hospitalUsers;
      default: return [];
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'severities', label: 'Severidades' },
    { id: 'shifts', label: 'Turnos' },
    { id: 'dispositions', label: 'Disposiciones' },
    ...(isUserAdmin(currentUser) ? [
      { id: 'qarValidators', label: 'Validadores QAR', admin: true },
      { id: 'hospitalUsers', label: 'Usuarios Hospital', admin: true }
    ] : [])
  ];

  // Handle add new item
  const handleAddNew = () => {
    const defaultData = { code: '', name: '', displayOrder: getCurrentItems().length + 1, isActive: true };

    switch (activeTab) {
      case 'severities':
        setFormData({ ...defaultData, color: '#6b7280', qarThresholdCount: 5, qarThresholdHours: 8 });
        break;
      case 'shifts':
        setFormData({ ...defaultData, startTime: '06:00', endTime: '14:00' });
        break;
      case 'dispositions':
        setFormData({ ...defaultData, description: '', color: '#6b7280', requiresDowntime: false });
        break;
      default:
        setFormData(defaultData);
    }
    setEditingItem(null);
    setShowModal(true);
  };

  // Handle edit item
  const handleEdit = (item) => {
    setFormData({ ...item });
    setEditingItem(item);
    setShowModal(true);
  };

  // Handle save item
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const url = editingItem
        ? `${API_BASE_URL}/inspection-catalogs/${activeTab}/${editingItem.id}`
        : `${API_BASE_URL}/inspection-catalogs/${activeTab}`;

      const method = editingItem ? 'PUT' : 'POST';

      const dataToSend = { ...formData };

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error guardando');
      }

      setSuccess(editingItem ? 'Item actualizado' : 'Item creado');
      setShowModal(false);
      loadCatalogData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (item) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/inspection-catalogs/${activeTab}/${item.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...item, isActive: !item.isActive })
        }
      );

      if (!response.ok) {
        throw new Error('Error actualizando');
      }

      loadCatalogData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle QAR validator status
  const handleToggleValidator = async (user) => {
    try {
      setSaving(true);
      const response = await fetch(
        `${API_BASE_URL}/users/${user.id}/qar-validator`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ canValidateQar: !user.canValidateQar })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error actualizando validador');
      }

      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);

      const [valRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/qar-validators`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/users/list`, { headers: getAuthHeaders() })
      ]);
      const [valData, usersData] = await Promise.all([valRes.json(), usersRes.json()]);
      setQarValidators(valData.users || []);
      setAllUsers(usersData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Load hospital users
  const loadHospitalUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/defects-v2/authorized-users`, { headers: getAuthHeaders() });
      const data = await res.json();
      setHospitalUsers(data.users || []);
    } catch (err) {
      console.error('Error loading hospital users:', err);
      setHospitalUsers([]);
    }
  };

  // Toggle hospital user permission
  const handleToggleHospitalPermission = async (userId, permission) => {
    const existingUser = hospitalUsers.find(u => u.userId === userId) || {};
    const currentPerms = {
      canRepair: existingUser.canRepair || false,
      canRelease: existingUser.canRelease || false,
      canApproveRepair: existingUser.canApproveRepair || false,
      canApproveRelease: existingUser.canApproveRelease || false
    };
    currentPerms[permission] = !currentPerms[permission];

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/defects-v2/authorized-users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId,
          ...currentPerms
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error actualizando permisos');
      }

      setSuccess('Permisos actualizados');
      setTimeout(() => setSuccess(null), 2000);
      loadHospitalUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Table row height
  const ROW_HEIGHT = 44;
  const HEADER_HEIGHT = 34;
  const ACTION_COL_WIDTH = 100;

  // Render table based on active tab
  const renderTable = () => {
    const items = getCurrentItems();

    if (items.length === 0 && activeTab !== 'qarValidators' && activeTab !== 'hospitalUsers') {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
          <p>No hay items configurados.</p>
          <button
            onClick={handleAddNew}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              backgroundColor: t.accent,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            + Agregar primer item
          </button>
        </div>
      );
    }

    const thStyle = {
      padding: '0 16px',
      height: HEADER_HEIGHT,
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 600,
      color: t.textMuted,
      textTransform: 'uppercase',
      backgroundColor: t.field,
      borderBottom: `1px solid ${t.line}`
    };

    const tdStyle = {
      padding: '0 16px',
      height: ROW_HEIGHT,
      borderBottom: `1px solid ${t.line}`,
      fontSize: 13,
      color: t.text
    };

    const StatusChip = ({ active }) => (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
        backgroundColor: active ? t.successBg : t.bgPanel,
        color: active ? t.successFg : t.textMuted,
        border: `1px solid ${active ? t.successBorder : t.border}`
      }}>
        {active ? 'Activo' : 'Inactivo'}
      </span>
    );

    const ActionCell = ({ onEdit, onToggle, isActive }) => (
      <td style={{ ...tdStyle, width: ACTION_COL_WIDTH }}>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{
            background: 'none',
            border: 'none',
            color: t.accent,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            marginRight: 12
          }}
        >
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            background: 'none',
            border: 'none',
            color: t.error,
            fontSize: 14,
            cursor: 'pointer',
            padding: 0,
            opacity: 0.7
          }}
          title={isActive ? 'Desactivar' : 'Activar'}
        >
          {isActive ? '×' : '✓'}
        </button>
      </td>
    );

    switch (activeTab) {
      case 'severities':
        return (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Color</th>
                  <th style={thStyle}>Emite QAR</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, width: ACTION_COL_WIDTH }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                    <td style={tdStyle}>
                      <strong>{item.name}</strong>
                      <span style={{ color: t.textMuted, marginLeft: 8, fontSize: 12 }}>({item.code})</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: item.color
                        }} />
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          color: t.textMuted
                        }}>
                          {item.color}
                        </span>
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {item.qarThresholdHours === 0 ? (
                        <span style={{ color: t.error, fontWeight: 500, fontSize: 12 }}>
                          {item.qarThresholdCount} caso(s) = Inmediato
                        </span>
                      ) : (
                        <span style={{ fontSize: 12 }}>
                          {item.qarThresholdCount} casos en {item.qarThresholdHours} hrs
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <StatusChip active={item.isActive} />
                    </td>
                    <ActionCell
                      onEdit={() => handleEdit(item)}
                      onToggle={() => handleToggleActive(item)}
                      isActive={item.isActive}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', fontSize: 12, color: t.textMuted, borderTop: `1px solid ${t.line}` }}>
              {items.length} severidades configuradas. El umbral de QAR determina cuándo una inspección genera alerta automática.
            </div>
          </>
        );

      case 'shifts':
        return (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Horario</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, width: ACTION_COL_WIDTH }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                    <td style={tdStyle}><strong>{item.name}</strong></td>
                    <td style={{ ...tdStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{item.code}</td>
                    <td style={tdStyle}>
                      {item.startTime && item.endTime
                        ? `${item.startTime.substring(0,5)} - ${item.endTime.substring(0,5)}`
                        : '-'}
                    </td>
                    <td style={tdStyle}>
                      <StatusChip active={item.isActive} />
                    </td>
                    <ActionCell
                      onEdit={() => handleEdit(item)}
                      onToggle={() => handleToggleActive(item)}
                      isActive={item.isActive}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', fontSize: 12, color: t.textMuted, borderTop: `1px solid ${t.line}` }}>
              {items.length} turnos configurados.
            </div>
          </>
        );

      case 'dispositions':
        return (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Color</th>
                  <th style={thStyle}>Genera Paro</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, width: ACTION_COL_WIDTH }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                    <td style={tdStyle}><strong>{item.name}</strong></td>
                    <td style={{ ...tdStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{item.code}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: item.color
                        }} />
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          color: t.textMuted
                        }}>
                          {item.color}
                        </span>
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {item.requiresDowntime ? (
                        <span style={{ color: t.error, fontSize: 12 }}>Sí</span>
                      ) : (
                        <span style={{ color: t.textMuted, fontSize: 12 }}>No</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <StatusChip active={item.isActive} />
                    </td>
                    <ActionCell
                      onEdit={() => handleEdit(item)}
                      onToggle={() => handleToggleActive(item)}
                      isActive={item.isActive}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', fontSize: 12, color: t.textMuted, borderTop: `1px solid ${t.line}` }}>
              {items.length} disposiciones configuradas.
            </div>
          </>
        );

      case 'qarValidators':
        if (allUsers.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: 40, color: t.textMuted }}>
              No hay usuarios en el sistema.
            </div>
          );
        }

        const qarUsersWithStatus = allUsers.map(user => {
          const validator = qarValidators.find(v => v.id === user.id);
          return {
            ...user,
            canValidateQar: validator ? validator.canValidateQar : false
          };
        });

        const filteredQarUsers = qarUsersWithStatus.filter(item => {
          if (!userFilter) return true;
          const search = userFilter.toLowerCase();
          const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
          return fullName.includes(search) ||
                 (item.email || '').toLowerCase().includes(search) ||
                 (item.department || '').toLowerCase().includes(search);
        });

        return (
          <div>
            <div style={{ padding: 16, borderBottom: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  minWidth: 300,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: 13
                }}
                placeholder="Filtrar por nombre, email o departamento..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              {userFilter && (
                <button
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgPanel,
                    cursor: 'pointer',
                    color: t.text,
                    fontSize: 12
                  }}
                  onClick={() => setUserFilter('')}
                >
                  Limpiar
                </button>
              )}
              <span style={{ color: t.textMuted, fontSize: 12 }}>
                {filteredQarUsers.length} de {qarUsersWithStatus.length} usuarios
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Departamento</th>
                  <th style={thStyle}>Rol</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Puede Validar QAR</th>
                </tr>
              </thead>
              <tbody>
                {filteredQarUsers.map(item => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <strong>{item.firstName} {item.lastName}</strong>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{item.email}</div>
                    </td>
                    <td style={tdStyle}>{item.department || '-'}</td>
                    <td style={tdStyle}>{item.role || '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        style={{
                          padding: '4px 12px',
                          borderRadius: 4,
                          border: `1px solid ${item.canValidateQar ? t.successBorder : t.border}`,
                          backgroundColor: item.canValidateQar ? t.successBg : t.bgPanel,
                          color: item.canValidateQar ? t.successFg : t.textMuted,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 500
                        }}
                        onClick={() => handleToggleValidator(item)}
                      >
                        {item.canValidateQar ? 'Sí' : 'No'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'hospitalUsers':
        if (allUsers.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: 40, color: t.textMuted }}>
              No hay usuarios en el sistema.
            </div>
          );
        }

        const usersWithPermissions = allUsers.map(user => {
          const perms = hospitalUsers.find(h => h.userId === user.id) || {};
          return {
            ...user,
            canRepair: perms.canRepair || false,
            canRelease: perms.canRelease || false,
            canApproveRepair: perms.canApproveRepair || false,
            canApproveRelease: perms.canApproveRelease || false
          };
        });

        const filteredHospitalUsers = usersWithPermissions.filter(user => {
          if (!userFilter) return true;
          const search = userFilter.toLowerCase();
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
          return fullName.includes(search) ||
                 (user.email || '').toLowerCase().includes(search) ||
                 (user.department || '').toLowerCase().includes(search);
        });

        const PermButton = ({ value, onClick, disabled }) => (
          <button
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: `1px solid ${value ? t.successBorder : t.border}`,
              backgroundColor: value ? t.successBg : t.bgPanel,
              color: value ? t.successFg : t.textMuted,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              fontSize: 12
            }}
            onClick={onClick}
            disabled={disabled}
          >
            {value ? '✓' : '—'}
          </button>
        );

        return (
          <div>
            <div style={{ padding: 16, borderBottom: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  minWidth: 300,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: 13
                }}
                placeholder="Filtrar por nombre, email o departamento..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              {userFilter && (
                <button
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgPanel,
                    cursor: 'pointer',
                    color: t.text,
                    fontSize: 12
                  }}
                  onClick={() => setUserFilter('')}
                >
                  Limpiar
                </button>
              )}
              <span style={{ color: t.textMuted, fontSize: 12 }}>
                {filteredHospitalUsers.length} de {usersWithPermissions.length} usuarios
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Departamento</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Reparar</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Liberar</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Aprobar Rep.</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Aprobar Lib.</th>
                </tr>
              </thead>
              <tbody>
                {filteredHospitalUsers.map(user => (
                  <tr key={user.id}>
                    <td style={tdStyle}>
                      <strong>{user.firstName} {user.lastName}</strong>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{user.email}</div>
                    </td>
                    <td style={tdStyle}>{user.department || '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <PermButton
                        value={user.canRepair}
                        onClick={() => handleToggleHospitalPermission(user.id, 'canRepair')}
                        disabled={saving}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <PermButton
                        value={user.canRelease}
                        onClick={() => handleToggleHospitalPermission(user.id, 'canRelease')}
                        disabled={saving}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <PermButton
                        value={user.canApproveRepair}
                        onClick={() => handleToggleHospitalPermission(user.id, 'canApproveRepair')}
                        disabled={saving}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <PermButton
                        value={user.canApproveRelease}
                        onClick={() => handleToggleHospitalPermission(user.id, 'canApproveRelease')}
                        disabled={saving}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, width: ACTION_COL_WIDTH }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <td style={{ ...tdStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{item.code}</td>
                  <td style={tdStyle}><strong>{item.name}</strong></td>
                  <td style={tdStyle}>{item.description || '-'}</td>
                  <td style={tdStyle}>
                    <StatusChip active={item.isActive} />
                  </td>
                  <ActionCell
                    onEdit={() => handleEdit(item)}
                    onToggle={() => handleToggleActive(item)}
                    isActive={item.isActive}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  // Render form fields based on active tab
  const renderFormFields = () => {
    const inputStyle = {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: 6,
      fontSize: 14,
      boxSizing: 'border-box',
      backgroundColor: t.bgPanel,
      color: t.text
    };

    const commonFields = (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Código *</label>
          <input
            type="text"
            style={inputStyle}
            value={formData.code || ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="ej: CRITICAL"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Nombre *</label>
          <input
            type="text"
            style={inputStyle}
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ej: Crítico"
          />
        </div>
      </div>
    );

    switch (activeTab) {
      case 'severities':
        return (
          <>
            {commonFields}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Color</label>
                <input
                  type="color"
                  style={{ width: 60, height: 38, padding: 2, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer' }}
                  value={formData.color || '#6b7280'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Orden</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={formData.displayOrder || 0}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div style={{ padding: 16, marginBottom: 16, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 12px 0', color: t.text, fontSize: 14 }}>Regla de Emisión de QAR</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 13 }}>Emitir QAR a los</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={formData.qarThresholdCount || 1}
                    onChange={(e) => setFormData({ ...formData, qarThresholdCount: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>caso(s) de este nivel</p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 13 }}>En un período de</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={formData.qarThresholdHours || 0}
                    onChange={(e) => setFormData({ ...formData, qarThresholdHours: parseInt(e.target.value) })}
                    min="0"
                  />
                  <p style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>horas (0 = inmediato)</p>
                </div>
              </div>
            </div>
          </>
        );

      case 'shifts':
        return (
          <>
            {commonFields}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Hora Inicio</label>
                <input
                  type="time"
                  style={inputStyle}
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Hora Fin</label>
                <input
                  type="time"
                  style={inputStyle}
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Orden</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.displayOrder || 0}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
            </div>
          </>
        );

      case 'dispositions':
        return (
          <>
            {commonFields}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Descripción</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Color</label>
                <input
                  type="color"
                  style={{ width: 60, height: 38, padding: 2, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer' }}
                  value={formData.color || '#6b7280'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Orden</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={formData.displayOrder || 0}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.requiresDowntime || false}
                  onChange={(e) => setFormData({ ...formData, requiresDowntime: e.target.checked })}
                />
                <span style={{ color: t.text, fontSize: 14 }}>Esta disposición típicamente genera tiempo de paro</span>
              </label>
            </div>
          </>
        );

      default:
        return (
          <>
            {commonFields}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Descripción</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: t.text, fontSize: 14 }}>Orden</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.displayOrder || 0}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
            </div>
          </>
        );
    }
  };

  const getTabLabel = () => {
    const tab = tabs.find(tab => tab.id === activeTab);
    return tab ? tab.label : '';
  };

  if (loading) {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', backgroundColor: t.bg, minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: 60, color: t.textMuted }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', backgroundColor: t.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: t.text, margin: 0 }}>Configuración de Inspección</h1>
          <p style={{ fontSize: 14, color: t.textMuted, marginTop: 4 }}>Catálogos globales de la compañía</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => navigate('/defect-admin')}
            style={{
              padding: '8px 16px',
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Volver a Admin
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 16,
          backgroundColor: t.errorBg,
          border: `1px solid ${t.errorBorder}`,
          color: t.error,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
        </div>
      )}
      {success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 16,
          backgroundColor: t.successBg,
          border: `1px solid ${t.successBorder}`,
          color: t.successFg
        }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${t.border}` }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? t.text : t.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${t.primary}` : '2px solid transparent',
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={() => { setActiveTab(tab.id); setShowModal(false); setUserFilter(''); }}
          >
            {tab.label}
            {tab.admin && (
              <span style={{
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 500,
                borderRadius: 4,
                border: `1px solid ${t.border}`,
                color: t.textMuted
              }}>
                Admin
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        backgroundColor: t.bgCard,
        borderRadius: 8,
        border: `1px solid ${t.border}`,
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${t.border}`,
          backgroundColor: t.bgPanel
        }}>
          <span style={{ fontWeight: 500, color: t.text, fontSize: 14 }}>
            {getTabLabel()} ({getCurrentItems().length})
          </span>
          {activeTab !== 'qarValidators' && activeTab !== 'hospitalUsers' && (
            <button
              onClick={handleAddNew}
              style={{
                padding: '6px 14px',
                backgroundColor: t.accent,
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 12
              }}
            >
              + Agregar
            </button>
          )}
        </div>

        {renderTable()}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
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
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: t.bgCard,
              borderRadius: 8,
              padding: 24,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: `1px solid ${t.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: t.text }}>
              {editingItem ? `Editar ${getTabLabel().slice(0, -1)}` : `Nueva ${getTabLabel().slice(0, -1)}`}
            </h3>

            {renderFormFields()}

            {editingItem && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span style={{ color: t.text, fontSize: 14 }}>Activo</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.code || !formData.name}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectConfig;
