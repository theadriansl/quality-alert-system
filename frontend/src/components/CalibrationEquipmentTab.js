import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const CalibrationEquipmentTab = ({ theme: t }) => {
  // State
  const [equipment, setEquipment] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({});

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingEquip, setEditingEquip] = useState(null);
  const [selectedStationIds, setSelectedStationIds] = useState([]);

  // Calibration modal
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibratingEquip, setCalibratingEquip] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    brand: '',
    model: '',
    serialNumber: '',
    equipmentType: '',
    lastCalibrationDate: '',
    calibrationDueDate: '',
    calibrationIntervalDays: 365,
    calibrationProvider: '',
    certificateNumber: '',
    status: 'ACTIVE',
    location: '',
    assignedDepartmentId: '',
    measurementRange: '',
    resolution: '',
    accuracy: '',
    notes: ''
  });

  // Calibration form
  const [calibrationForm, setCalibrationForm] = useState({
    calibrationDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    provider: '',
    certificateNumber: '',
    result: 'PASS',
    deviationFound: '',
    adjustmentMade: '',
    cost: '',
    notes: ''
  });

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEquip, setHistoryEquip] = useState(null);
  const [calibrationHistory, setCalibrationHistory] = useState([]);
  const [linkedSpecs, setLinkedSpecs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadEquipment();
    loadEquipmentTypes();
    loadDepartments();
    loadStations();
  }, [filterStatus, filterType, searchTerm]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/calibration?`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterType) url += `type=${filterType}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setEquipment(data.equipment);
        setCounts(data.counts);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipmentTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/calibration/types`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setEquipmentTypes(data.types);
    } catch (err) {
      console.error('Error loading types:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/departments`, { headers: getAuthHeaders() });
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadStations = async () => {
    try {
      const res = await fetch(`${API_BASE}/station-config/stations`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setStations(data.stations);
    } catch (err) {
      console.error('Error loading stations:', err);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      description: '',
      brand: '',
      model: '',
      serialNumber: '',
      equipmentType: '',
      lastCalibrationDate: '',
      calibrationDueDate: '',
      calibrationIntervalDays: 365,
      calibrationProvider: '',
      certificateNumber: '',
      status: 'ACTIVE',
      location: '',
      assignedDepartmentId: '',
      measurementRange: '',
      resolution: '',
      accuracy: '',
      notes: ''
    });
    setSelectedStationIds([]);
    setShowModal(true);
  };

  const openEditModal = (equip) => {
    setModalMode('edit');
    setEditingEquip(equip);
    setFormData({
      code: equip.code || '',
      name: equip.name || '',
      description: equip.description || '',
      brand: equip.brand || '',
      model: equip.model || '',
      serialNumber: equip.serialNumber || '',
      equipmentType: equip.equipmentType || '',
      lastCalibrationDate: equip.lastCalibrationDate?.split('T')[0] || '',
      calibrationDueDate: equip.calibrationDueDate?.split('T')[0] || '',
      calibrationIntervalDays: equip.calibrationIntervalDays || 365,
      calibrationProvider: equip.calibrationProvider || '',
      certificateNumber: equip.certificateNumber || '',
      status: equip.status || 'ACTIVE',
      location: equip.location || '',
      assignedDepartmentId: equip.assignedDepartmentId || '',
      measurementRange: equip.measurementRange || '',
      resolution: equip.resolution || '',
      accuracy: equip.accuracy || '',
      notes: equip.notes || ''
    });
    setSelectedStationIds(equip.stations ? equip.stations.map(s => s.id) : []);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData, stationIds: selectedStationIds };

      const url = modalMode === 'create'
        ? `${API_BASE}/calibration`
        : `${API_BASE}/calibration/${editingEquip.id}`;

      const res = await fetch(url, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setShowModal(false);
      loadEquipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (equip) => {
    if (!window.confirm(`¿Eliminar equipo "${equip.code}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/calibration/${equip.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  };

  const openCalibrationModal = (equip) => {
    setCalibratingEquip(equip);
    const interval = equip.calibrationIntervalDays || 365;
    const today = new Date();
    const dueDate = new Date(today.getTime() + interval * 24 * 60 * 60 * 1000);

    setCalibrationForm({
      calibrationDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      provider: equip.calibrationProvider || '',
      certificateNumber: '',
      result: 'PASS',
      deviationFound: '',
      adjustmentMade: '',
      cost: '',
      notes: ''
    });
    setShowCalibrationModal(true);
  };

  const openHistoryModal = async (equip) => {
    setHistoryEquip(equip);
    setShowHistoryModal(true);
    setLoadingHistory(true);

    try {
      // Cargar historial y specs vinculadas
      const res = await fetch(`${API_BASE}/calibration/${equip.id}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setCalibrationHistory(data.history || []);
        setLinkedSpecs(data.linkedSpecs || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCalibrationSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/calibration/${calibratingEquip.id}/calibration`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(calibrationForm)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setShowCalibrationModal(false);
      loadEquipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, daysUntilDue) => {
    const styles = {
      OK: { bg: '#d1fae5', color: '#065f46' },
      WARNING: { bg: '#fef3c7', color: '#92400e' },
      EXPIRED: { bg: '#fecaca', color: '#991b1b' },
      CALIBRATING: { bg: '#dbeafe', color: '#1e40af' },
      OUT_OF_SERVICE: { bg: '#e5e7eb', color: '#374151' },
      NO_DATE: { bg: '#f3f4f6', color: '#6b7280' }
    };
    const style = styles[status] || styles.NO_DATE;

    const labels = {
      OK: 'Vigente',
      WARNING: `Vence en ${daysUntilDue}d`,
      EXPIRED: 'Vencido',
      CALIBRATING: 'En Calibración',
      OUT_OF_SERVICE: 'Fuera de Servicio',
      NO_DATE: 'Sin Fecha'
    };

    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {labels[status] || status}
      </span>
    );
  };

  // Styles
  const styles = {
    container: { padding: '0' },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    title: { fontSize: '20px', fontWeight: '600', color: t.text, margin: 0 },
    statsRow: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    statCard: {
      padding: '12px 20px',
      borderRadius: '8px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      textAlign: 'center',
      minWidth: '100px'
    },
    statValue: { fontSize: '24px', fontWeight: '600', color: t.text },
    statLabel: { fontSize: '12px', color: t.textMuted, marginTop: '4px' },
    filters: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    filterSelect: {
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      color: t.text,
      fontSize: '14px',
      minWidth: '150px'
    },
    searchInput: {
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      color: t.text,
      fontSize: '14px',
      minWidth: '200px'
    },
    addButton: {
      padding: '10px 20px',
      backgroundColor: t.success || '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      overflow: 'hidden'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      backgroundColor: t.bgPanel,
      borderBottom: `2px solid ${t.border}`,
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    actionBtn: {
      padding: '6px 12px',
      marginRight: '6px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500'
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
      width: '700px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    formGroup: { marginBottom: '16px' },
    formGroupFull: { gridColumn: '1 / -1', marginBottom: '16px' },
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
      backgroundColor: t.bgCard,
      color: t.text
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
      cursor: 'pointer'
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
    errorBanner: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  };

  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Equipos de Calibración</h2>
        <button style={styles.addButton} onClick={openCreateModal}>+ Nuevo Equipo</button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{counts.total || 0}</div>
          <div style={styles.statLabel}>Total</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #10b981' }}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{counts.ok || 0}</div>
          <div style={styles.statLabel}>Vigentes</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{counts.warning || 0}</div>
          <div style={styles.statLabel}>Por Vencer</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #ef4444' }}>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{counts.expired || 0}</div>
          <div style={styles.statLabel}>Vencidos</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Buscar por código, nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
          <option value="">Todos los estados</option>
          <option value="OK">Vigentes</option>
          <option value="WARNING">Por Vencer (30d)</option>
          <option value="EXPIRED">Vencidos</option>
          <option value="CALIBRATING">En Calibración</option>
          <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
          <option value="">Todos los tipos</option>
          {equipmentTypes.map(t => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>Cargando...</div>
      ) : equipment.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
          No hay equipos registrados. Haz clic en "+ Nuevo Equipo" para agregar uno.
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Marca/Modelo</th>
              <th style={styles.th}>Estaciones</th>
              <th style={styles.th}>Última Cal.</th>
              <th style={styles.th}>Vencimiento</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map(eq => (
              <tr key={eq.id}>
                <td style={styles.td}>
                  <code style={{ backgroundColor: t.bgPanel, padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    {eq.code}
                  </code>
                </td>
                <td style={styles.td}>{eq.name}</td>
                <td style={styles.td}>{eq.equipmentTypeName || eq.equipmentType}</td>
                <td style={styles.td}>
                  {eq.brand && eq.model ? `${eq.brand} ${eq.model}` : eq.brand || eq.model || '-'}
                </td>
                <td style={styles.td}>
                  {eq.stations && eq.stations.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {eq.stations.slice(0, 2).map((st, idx) => (
                        <span key={idx} style={{
                          padding: '2px 8px',
                          backgroundColor: t.bgPanel,
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: t.text,
                          border: `1px solid ${t.border}`
                        }}>
                          {st.code || st.name}
                        </span>
                      ))}
                      {eq.stations.length > 2 && (
                        <span style={{
                          padding: '2px 6px',
                          backgroundColor: t.accent + '20',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: t.accent,
                          fontWeight: '600'
                        }}>
                          +{eq.stations.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>-</span>
                  )}
                </td>
                <td style={styles.td}>
                  {eq.lastCalibrationDate ? new Date(eq.lastCalibrationDate).toLocaleDateString() : '-'}
                </td>
                <td style={styles.td}>
                  {eq.calibrationDueDate ? new Date(eq.calibrationDueDate).toLocaleDateString() : '-'}
                </td>
                <td style={styles.td}>
                  {getStatusBadge(eq.calibrationStatus, eq.daysUntilDue)}
                </td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.actionBtn, backgroundColor: '#6366f1', color: 'white' }}
                    onClick={() => openHistoryModal(eq)}
                    title="Ver Historial"
                  >
                    Historial
                  </button>
                  <button
                    style={{ ...styles.actionBtn, backgroundColor: '#10b981', color: 'white' }}
                    onClick={() => openCalibrationModal(eq)}
                    title="Registrar Calibración"
                  >
                    Calibrar
                  </button>
                  <button
                    style={{ ...styles.actionBtn, backgroundColor: t.accent, color: 'white' }}
                    onClick={() => openEditModal(eq)}
                  >
                    Editar
                  </button>
                  <button
                    style={{ ...styles.actionBtn, backgroundColor: '#ef4444', color: 'white' }}
                    onClick={() => handleDelete(eq)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {modalMode === 'create' ? 'Nuevo Equipo' : 'Editar Equipo'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={styles.input}
                    placeholder="CAL-001"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={styles.input}
                    placeholder="Calibrador Digital 150mm"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Equipo</label>
                  <select
                    value={formData.equipmentType}
                    onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                    style={styles.input}
                  >
                    <option value="">Seleccionar...</option>
                    {equipmentTypes.map(t => (
                      <option key={t.code} value={t.code}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={styles.input}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="CALIBRATING">En Calibración</option>
                    <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
                    <option value="SCRAPPED">Dado de Baja</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Marca</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    style={styles.input}
                    placeholder="Mitutoyo"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    style={styles.input}
                    placeholder="500-196-30"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de Serie</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ubicación</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={styles.input}
                    placeholder="Área de Inspección"
                  />
                </div>
              </div>

              {/* Calibration Section */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: t.bgPanel,
                borderRadius: '8px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: t.textMuted, marginBottom: '12px' }}>
                  CALIBRACIÓN
                </div>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Última Calibración</label>
                    <input
                      type="date"
                      value={formData.lastCalibrationDate}
                      onChange={(e) => setFormData({ ...formData, lastCalibrationDate: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fecha Vencimiento</label>
                    <input
                      type="date"
                      value={formData.calibrationDueDate}
                      onChange={(e) => setFormData({ ...formData, calibrationDueDate: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Intervalo (días)</label>
                    <input
                      type="number"
                      value={formData.calibrationIntervalDays}
                      onChange={(e) => setFormData({ ...formData, calibrationIntervalDays: parseInt(e.target.value) || 365 })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Proveedor</label>
                    <input
                      type="text"
                      value={formData.calibrationProvider}
                      onChange={(e) => setFormData({ ...formData, calibrationProvider: e.target.value })}
                      style={styles.input}
                      placeholder="Lab de Calibración XYZ"
                    />
                  </div>
                </div>
              </div>

              {/* Specs Section */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: t.bgPanel,
                borderRadius: '8px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: t.textMuted, marginBottom: '12px' }}>
                  ESPECIFICACIONES TÉCNICAS
                </div>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rango de Medición</label>
                    <input
                      type="text"
                      value={formData.measurementRange}
                      onChange={(e) => setFormData({ ...formData, measurementRange: e.target.value })}
                      style={styles.input}
                      placeholder="0-150mm"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Resolución</label>
                    <input
                      type="text"
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      style={styles.input}
                      placeholder="0.01mm"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Exactitud</label>
                    <input
                      type="text"
                      value={formData.accuracy}
                      onChange={(e) => setFormData({ ...formData, accuracy: e.target.value })}
                      style={styles.input}
                      placeholder="±0.02mm"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Departamento</label>
                    <select
                      value={formData.assignedDepartmentId}
                      onChange={(e) => setFormData({ ...formData, assignedDepartmentId: e.target.value })}
                      style={styles.input}
                    >
                      <option value="">Sin asignar</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stations */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: t.bgPanel,
                borderRadius: '8px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: t.textMuted, marginBottom: '12px' }}>
                  ESTACIONES ASIGNADAS
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {stations.map(station => (
                    <label key={station.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: selectedStationIds.includes(station.id) ? t.accent + '20' : 'transparent',
                      border: `1px solid ${selectedStationIds.includes(station.id) ? t.accent : 'transparent'}`
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedStationIds.includes(station.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStationIds([...selectedStationIds, station.id]);
                          } else {
                            setSelectedStationIds(selectedStationIds.filter(id => id !== station.id));
                          }
                        }}
                      />
                      <span style={{ fontSize: '13px' }}>{station.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ ...styles.formGroupFull, marginTop: '20px' }}>
                <label style={styles.label}>Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={styles.modalButtons}>
                <button type="button" style={styles.cancelButton} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" style={styles.saveButton} disabled={loading}>
                  {loading ? 'Guardando...' : (modalMode === 'create' ? 'Crear Equipo' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calibration Modal */}
      {showCalibrationModal && calibratingEquip && (
        <div style={styles.modal} onClick={() => setShowCalibrationModal(false)}>
          <div style={{ ...styles.modalContent, width: '500px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Registrar Calibración - {calibratingEquip.code}
            </h3>
            <form onSubmit={handleCalibrationSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha Calibración *</label>
                  <input
                    type="date"
                    value={calibrationForm.calibrationDate}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, calibrationDate: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Próximo Vencimiento *</label>
                  <input
                    type="date"
                    value={calibrationForm.dueDate}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, dueDate: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Proveedor</label>
                  <input
                    type="text"
                    value={calibrationForm.provider}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, provider: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>No. Certificado</label>
                  <input
                    type="text"
                    value={calibrationForm.certificateNumber}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, certificateNumber: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Resultado *</label>
                  <select
                    value={calibrationForm.result}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, result: e.target.value })}
                    style={styles.input}
                    required
                  >
                    <option value="PASS">Aprobado</option>
                    <option value="ADJUSTED">Ajustado</option>
                    <option value="FAIL">Rechazado</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calibrationForm.cost}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, cost: e.target.value })}
                    style={styles.input}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>Desviación Encontrada</label>
                <input
                  type="text"
                  value={calibrationForm.deviationFound}
                  onChange={(e) => setCalibrationForm({ ...calibrationForm, deviationFound: e.target.value })}
                  style={styles.input}
                  placeholder="Opcional"
                />
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>Notas</label>
                <textarea
                  value={calibrationForm.notes}
                  onChange={(e) => setCalibrationForm({ ...calibrationForm, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={styles.modalButtons}>
                <button type="button" style={styles.cancelButton} onClick={() => setShowCalibrationModal(false)}>
                  Cancelar
                </button>
                <button type="submit" style={{ ...styles.saveButton, backgroundColor: '#10b981' }} disabled={loading}>
                  {loading ? 'Guardando...' : 'Registrar Calibración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyEquip && (
        <div style={styles.modal} onClick={() => setShowHistoryModal(false)}>
          <div style={{ ...styles.modalContent, width: '700px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Historial - {historyEquip.code}
            </h3>

            {/* Equipment Info */}
            <div style={{
              backgroundColor: t.bgPanel,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: `1px solid ${t.border}`
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Equipo</div>
                  <div style={{ fontWeight: '600', color: t.text }}>{historyEquip.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Tipo</div>
                  <div style={{ color: t.text }}>{historyEquip.equipmentTypeName || historyEquip.equipmentType}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Marca / Modelo</div>
                  <div style={{ color: t.text }}>{historyEquip.brand} {historyEquip.model}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>No. Serie</div>
                  <div style={{ color: t.text }}>{historyEquip.serialNumber || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Última Calibración</div>
                  <div style={{ color: t.text }}>
                    {historyEquip.lastCalibrationDate
                      ? new Date(historyEquip.lastCalibrationDate).toLocaleDateString()
                      : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Vencimiento</div>
                  <div style={{
                    color: historyEquip.calibrationStatus === 'EXPIRED' ? '#dc2626'
                         : historyEquip.calibrationStatus === 'WARNING' ? '#d97706'
                         : '#059669',
                    fontWeight: '600'
                  }}>
                    {historyEquip.calibrationDueDate
                      ? new Date(historyEquip.calibrationDueDate).toLocaleDateString()
                      : '-'}
                    {historyEquip.daysUntilDue !== null && (
                      <span style={{ fontWeight: 'normal', marginLeft: '8px' }}>
                        ({historyEquip.daysUntilDue > 0 ? `${historyEquip.daysUntilDue} días` : 'Vencido'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Calibration History */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
                Historial de Calibraciones
              </h4>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: t.textMuted }}>Cargando...</div>
              ) : calibrationHistory.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: t.textMuted,
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px'
                }}>
                  No hay registros de calibración anteriores
                </div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: t.bgPanel }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Fecha</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Certificado</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Proveedor</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Resultado</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calibrationHistory.map((hist, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${t.border}` }}>
                          <td style={{ padding: '8px 12px', color: t.text }}>
                            {new Date(hist.calibrationDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <code style={{
                              backgroundColor: t.bgPanel,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {hist.certificateNumber || '-'}
                            </code>
                          </td>
                          <td style={{ padding: '8px 12px', color: t.text }}>{hist.provider || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: hist.result === 'PASS' ? '#d1fae5'
                                            : hist.result === 'ADJUSTED' ? '#fef3c7'
                                            : '#fecaca',
                              color: hist.result === 'PASS' ? '#065f46'
                                   : hist.result === 'ADJUSTED' ? '#92400e'
                                   : '#991b1b'
                            }}>
                              {hist.result === 'PASS' ? 'Aprobado'
                               : hist.result === 'ADJUSTED' ? 'Ajustado'
                               : 'Rechazado'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: t.textMuted, fontSize: '12px' }}>
                            {hist.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assigned Stations */}
            {historyEquip.stations && historyEquip.stations.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
                  Estaciones Asignadas ({historyEquip.stations.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {historyEquip.stations.map((st, idx) => (
                    <span key={idx} style={{
                      padding: '6px 12px',
                      backgroundColor: t.bgPanel,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: t.text,
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: t.accent
                      }}></span>
                      {st.name}
                      {st.code && <span style={{ color: t.textMuted, fontSize: '11px' }}>({st.code})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Specs */}
            {linkedSpecs.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
                  Especificaciones Vinculadas ({linkedSpecs.length})
                </h4>
                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px',
                  padding: '8px'
                }}>
                  {linkedSpecs.map((spec, idx) => (
                    <div key={idx} style={{
                      padding: '8px 12px',
                      borderBottom: idx < linkedSpecs.length - 1 ? `1px solid ${t.border}` : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600', color: t.text }}>{spec.specNumber}</span>
                        <span style={{ color: t.textMuted, marginLeft: '8px' }}>{spec.specName}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: t.textMuted }}>
                        {spec.partNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowHistoryModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationEquipmentTab;
