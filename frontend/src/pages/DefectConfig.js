import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DefectConfig = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('severities');

  // Catalog data
  const [severities, setSeverities] = useState([]);
  const [stations, setStations] = useState([]);
  const [stages, setStages] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [dispositions, setDispositions] = useState([]);
  const [qarValidators, setQarValidators] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
      const [sevRes, staRes, stgRes, shfRes, disRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inspection-catalogs/severities?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/inspection-catalogs/stations?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/inspection-catalogs/stages?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/inspection-catalogs/shifts?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/inspection-catalogs/dispositions?includeInactive=true`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/auth/me`, { headers: getAuthHeaders() })
      ]);

      const [sevData, staData, stgData, shfData, disData, userData] = await Promise.all([
        sevRes.json(), staRes.json(), stgRes.json(), shfRes.json(), disRes.json(), userRes.json()
      ]);

      setSeverities(sevData.items || []);
      setStations(staData.items || []);
      setStages(stgData.items || []);
      setShifts(shfData.items || []);
      setDispositions(disData.items || []);
      setCurrentUser(userData.user || null);

      // Load QAR validators if admin
      if (isUserAdmin(userData.user)) {
        const valRes = await fetch(`${API_BASE_URL}/users/qar-validators`, { headers: getAuthHeaders() });
        const valData = await valRes.json();
        setQarValidators(valData.users || []);
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
      case 'stations': return stations;
      case 'stages': return stages;
      case 'shifts': return shifts;
      case 'dispositions': return dispositions;
      case 'qarValidators': return qarValidators;
      default: return [];
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'severities', label: 'Severidades', icon: '' },
    { id: 'stations', label: 'Estaciones', icon: '' },
    { id: 'stages', label: 'Etapas', icon: '' },
    { id: 'shifts', label: 'Turnos', icon: '' },
    { id: 'dispositions', label: 'Disposiciones', icon: '' },
    ...(isUserAdmin(currentUser) ? [{ id: 'qarValidators', label: 'Validadores QAR', icon: '' }] : [])
  ];

  // Handle add new item
  const handleAddNew = () => {
    const defaultData = { code: '', name: '', displayOrder: getCurrentItems().length + 1, isActive: true };

    switch (activeTab) {
      case 'severities':
        setFormData({ ...defaultData, color: '#6b7280', qarThresholdCount: 5, qarThresholdHours: 8 });
        break;
      case 'stations':
      case 'stages':
        setFormData({ ...defaultData, description: '' });
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

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
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

      // Reload validators
      const valRes = await fetch(`${API_BASE_URL}/users/qar-validators`, { headers: getAuthHeaders() });
      const valData = await valRes.json();
      setQarValidators(valData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: t.bg,
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted,
      marginTop: '4px'
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer'
    },
    alert: {
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px'
    },
    alertError: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#B00020'
    },
    alertSuccess: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#16a34a'
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      marginBottom: '20px',
      borderBottom: `2px solid ${t.border}`,
      paddingBottom: '0',
      flexWrap: 'wrap'
    },
    tab: {
      padding: '12px 20px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: t.textMuted,
      borderBottom: '2px solid transparent',
      marginBottom: '-2px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    tabActive: {
      color: t.accent,
      borderBottomColor: t.accent
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      backgroundColor: t.bgPanel
    },
    addButton: {
      padding: '8px 16px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase',
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`
    },
    td: {
      padding: '12px 16px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    colorDot: {
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      marginRight: '8px'
    },
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '500'
    },
    badgeActive: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    badgeInactive: {
      backgroundColor: t.bgPanel,
      color: t.textMuted
    },
    actionButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      marginRight: '4px'
    },
    editButton: {
      backgroundColor: '#dbeafe',
      color: '#1d4ed8'
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
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      border: `1px solid ${t.border}`
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
      color: t.text,
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgPanel,
      color: t.text
    },
    inputRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px'
    },
    colorInput: {
      width: '60px',
      height: '38px',
      padding: '2px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    hint: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '4px'
    },
    modalButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    saveButton: {
      padding: '10px 20px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    emptyState: {
      padding: '40px',
      textAlign: 'center',
      color: t.textMuted
    },
    loading: {
      textAlign: 'center',
      padding: '60px',
      color: t.textMuted
    }
  };

  // Render table based on active tab
  const renderTable = () => {
    const items = getCurrentItems();

    if (items.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p>{activeTab === 'qarValidators' ? 'No hay usuarios en el sistema.' : 'No hay items configurados.'}</p>
          {activeTab !== 'qarValidators' && (
            <button style={styles.addButton} onClick={handleAddNew}>
              + Agregar primer item
            </button>
          )}
        </div>
      );
    }

    switch (activeTab) {
      case 'severities':
        return (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Color</th>
                <th style={styles.th}>Emite QAR</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <td style={styles.td}>
                    <span style={{ ...styles.colorDot, backgroundColor: item.color }} />
                    <strong>{item.name}</strong>
                    <span style={{ color: t.textMuted, marginLeft: '8px' }}>({item.code})</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.colorDot, backgroundColor: item.color }} />
                    {item.color}
                  </td>
                  <td style={styles.td}>
                    {item.qarThresholdHours === 0 ? (
                      <span style={{ color: '#B00020', fontWeight: '600' }}>
                        {item.qarThresholdCount} caso(s) = Inmediato
                      </span>
                    ) : (
                      <span>
                        {item.qarThresholdCount} casos en {item.qarThresholdHours} hrs
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(item.isActive ? styles.badgeActive : styles.badgeInactive) }}>
                      {item.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={{ ...styles.actionButton, ...styles.editButton }} onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button
                      style={{ ...styles.actionButton, backgroundColor: item.isActive ? '#fee2e2' : '#dcfce7', color: item.isActive ? '#B00020' : '#166534' }}
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'shifts':
        return (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Horario</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <td style={styles.td}><strong>{item.name}</strong></td>
                  <td style={styles.td}>{item.code}</td>
                  <td style={styles.td}>
                    {item.startTime && item.endTime
                      ? `${item.startTime.substring(0,5)} - ${item.endTime.substring(0,5)}`
                      : '-'}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(item.isActive ? styles.badgeActive : styles.badgeInactive) }}>
                      {item.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={{ ...styles.actionButton, ...styles.editButton }} onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button
                      style={{ ...styles.actionButton, backgroundColor: item.isActive ? '#fee2e2' : '#dcfce7', color: item.isActive ? '#B00020' : '#166534' }}
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'dispositions':
        return (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Color</th>
                <th style={styles.th}>Genera Paro</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <td style={styles.td}>
                    <span style={{ ...styles.colorDot, backgroundColor: item.color }} />
                    <strong>{item.name}</strong>
                  </td>
                  <td style={styles.td}>{item.code}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.colorDot, backgroundColor: item.color }} />
                    {item.color}
                  </td>
                  <td style={styles.td}>
                    {item.requiresDowntime ? (
                      <span style={{ color: '#B00020' }}>Sí</span>
                    ) : (
                      <span style={{ color: t.textMuted }}>No</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(item.isActive ? styles.badgeActive : styles.badgeInactive) }}>
                      {item.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={{ ...styles.actionButton, ...styles.editButton }} onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button
                      style={{ ...styles.actionButton, backgroundColor: item.isActive ? '#fee2e2' : '#dcfce7', color: item.isActive ? '#B00020' : '#166534' }}
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'qarValidators':
        return (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Usuario</th>
                <th style={styles.th}>Departamento</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Puede Validar QAR</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={styles.td}>
                    <strong>{item.firstName} {item.lastName}</strong>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{item.email}</div>
                  </td>
                  <td style={styles.td}>{item.department || '-'}</td>
                  <td style={styles.td}>{item.role || '-'}</td>
                  <td style={styles.td}>
                    <button
                      style={{
                        ...styles.actionButton,
                        backgroundColor: item.canValidateQar ? '#dcfce7' : '#fee2e2',
                        color: item.canValidateQar ? '#166534' : '#B00020',
                        minWidth: '80px'
                      }}
                      onClick={() => handleToggleValidator(item)}
                    >
                      {item.canValidateQar ? ' Sí' : ' No'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default: // stations, stages
        return (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Descripción</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <td style={styles.td}><strong>{item.name}</strong></td>
                  <td style={styles.td}>{item.code}</td>
                  <td style={styles.td}>{item.description || '-'}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(item.isActive ? styles.badgeActive : styles.badgeInactive) }}>
                      {item.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={{ ...styles.actionButton, ...styles.editButton }} onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button
                      style={{ ...styles.actionButton, backgroundColor: item.isActive ? '#fee2e2' : '#dcfce7', color: item.isActive ? '#B00020' : '#166534' }}
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  // Render form fields based on active tab
  const renderFormFields = () => {
    const commonFields = (
      <>
        <div style={styles.inputRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Código *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="ej: CRITICAL"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ej: Crítico"
            />
          </div>
        </div>
      </>
    );

    switch (activeTab) {
      case 'severities':
        return (
          <>
            {commonFields}
            <div style={styles.inputRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={formData.color || '#6b7280'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Orden</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.displayOrder || 0}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div style={{ padding: '16px', marginBottom: '16px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#0369a1' }}>Regla de Emisión de QAR</h4>
              <div style={styles.inputRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Emitir QAR a los</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={formData.qarThresholdCount || 1}
                    onChange={(e) => setFormData({ ...formData, qarThresholdCount: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p style={styles.hint}>caso(s) de este nivel</p>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>En un período de</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={formData.qarThresholdHours || 0}
                    onChange={(e) => setFormData({ ...formData, qarThresholdHours: parseInt(e.target.value) })}
                    min="0"
                  />
                  <p style={styles.hint}>horas (0 = inmediato)</p>
                </div>
              </div>
            </div>
          </>
        );

      case 'shifts':
        return (
          <>
            {commonFields}
            <div style={styles.inputRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hora Inicio</label>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hora Fin</label>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Orden</label>
              <input
                type="number"
                style={styles.input}
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
            <div style={styles.formGroup}>
              <label style={styles.label}>Descripción</label>
              <input
                type="text"
                style={styles.input}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div style={styles.inputRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={formData.color || '#6b7280'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Orden</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.displayOrder || 0}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.requiresDowntime || false}
                  onChange={(e) => setFormData({ ...formData, requiresDowntime: e.target.checked })}
                />
                <span>Esta disposición típicamente genera tiempo de paro</span>
              </label>
            </div>
          </>
        );

      default: // stations, stages
        return (
          <>
            {commonFields}
            <div style={styles.formGroup}>
              <label style={styles.label}>Descripción</label>
              <input
                type="text"
                style={styles.input}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Orden</label>
              <input
                type="number"
                style={styles.input}
                value={formData.displayOrder || 0}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
            </div>
          </>
        );
    }
  };

  const getTabLabel = () => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab ? tab.label : '';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuración de Inspección</h1>
          <p style={styles.subtitle}>Catálogos globales de la compañía</p>
        </div>
        <button style={styles.backButton} onClick={() => navigate('/defect-capture')}>
          Volver
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>x</button>
        </div>
      )}
      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab(tab.id); setShowModal(false); }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={{ fontWeight: '500' }}>
            {getTabLabel()} ({getCurrentItems().length})
          </span>
          {activeTab !== 'qarValidators' && (
            <button style={styles.addButton} onClick={handleAddNew}>
              + Agregar
            </button>
          )}
        </div>

        {renderTable()}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingItem ? `Editar ${getTabLabel().slice(0, -1)}` : `Nueva ${getTabLabel().slice(0, -1)}`}
            </h3>

            {renderFormFields()}

            {editingItem && (
              <div style={styles.formGroup}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Activo</span>
                </label>
              </div>
            )}

            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                style={{ ...styles.saveButton, opacity: saving ? 0.7 : 1 }}
                onClick={handleSave}
                disabled={saving || !formData.code || !formData.name}
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
