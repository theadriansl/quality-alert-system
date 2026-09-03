import React, { useState, useEffect } from 'react';
import stationConfigService from '../services/stationConfigService';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const StationConfigTab = ({ theme: t }) => {
  const { t: tr, language, changeLanguage } = useLanguage();
  // Sub-tab state
  const [subTab, setSubTab] = useState('assignment'); // 'assignment' | 'stationsCatalog' | 'stagesCatalog'

  // State for assignment tab
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationConfig, setStationConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  // Available items
  const [allParts, setAllParts] = useState([]);
  const [availableItems, setAvailableItems] = useState({ availableDefects: [], availableSpecs: [] });
  const [selectedDefects, setSelectedDefects] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState([]);

  // State for catalog tabs
  const [stages, setStages] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState(null);
  const [catalogFormData, setCatalogFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Helper for auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  // Load stations on mount
  useEffect(() => {
    loadStations();
    loadAllParts();
    loadStages();
    loadDepartments();
  }, []);

  // Load station config when station changes
  useEffect(() => {
    if (selectedStation) {
      loadStationConfig(selectedStation.id);
    }
  }, [selectedStation]);

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await stationConfigService.getStations();
      setStations(data);
      if (data.length > 0 && !selectedStation) {
        setSelectedStation(data[0]);
      }
    } catch (err) {
      setError('Error cargando estaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    try {
      const data = await stationConfigService.getAllParts();
      setAllParts(data);
    } catch (err) {
      console.error('Error loading parts:', err);
    }
  };

  const loadStages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inspection-catalogs/stages?includeInactive=true`, { headers: getAuthHeaders() });
      const data = await res.json();
      setStages(data.items || []);
    } catch (err) {
      console.error('Error loading stages:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/departments?flat=true`, { headers: getAuthHeaders() });
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  // Station types for Hospital module
  const stationTypes = [
    { value: 'INSPECTION', label: 'Inspección (Proceso)', description: 'Estación de inspección en línea de producción' },
    { value: 'REPAIR', label: 'Reparación (Hospital)', description: 'Estación de reparación de defectos' },
    { value: 'RELEASE', label: 'Liberación (Hospital)', description: 'Estación de liberación/aprobación QA' },
    { value: 'MRB', label: 'MRB (Rework)', description: 'Estación de Material Review Board' }
  ];

  // CRUD for catalogs
  const openCatalogModal = (type, item = null) => {
    setEditingCatalogItem(item ? { ...item, type } : { type });
    if (item) {
      setCatalogFormData({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        departmentId: item.departmentId || '',
        stationType: item.stationType || 'INSPECTION',
        displayOrder: item.displayOrder || 0,
        isActive: item.isActive !== false
      });
    } else {
      setCatalogFormData({
        code: '',
        name: '',
        description: '',
        departmentId: '',
        stationType: 'INSPECTION',
        displayOrder: type === 'station' ? stations.length + 1 : stages.length + 1,
        isActive: true
      });
    }
    setShowCatalogModal(true);
  };

  const handleSaveCatalog = async () => {
    const type = editingCatalogItem.type;
    const isEditing = editingCatalogItem.id;
    const endpoint = type === 'station' ? 'stations' : 'stages';

    if ((type === 'station' && !catalogFormData.code) || !catalogFormData.name) {
      setError(type === 'station' ? 'Código y nombre son requeridos' : 'Nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      const url = isEditing
        ? `${API_BASE_URL}/inspection-catalogs/${endpoint}/${editingCatalogItem.id}`
        : `${API_BASE_URL}/inspection-catalogs/${endpoint}`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(catalogFormData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error guardando');

      setSuccess(isEditing ? 'Actualizado correctamente' : 'Creado correctamente');
      setTimeout(() => setSuccess(null), 2000);
      setShowCatalogModal(false);

      if (type === 'station') {
        loadStations();
      } else {
        loadStages();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCatalogActive = async (type, item) => {
    const endpoint = type === 'station' ? 'stations' : 'stages';
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/inspection-catalogs/${endpoint}/${item.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...item, isActive: !item.isActive })
      });

      if (!res.ok) throw new Error('Error actualizando estado');

      setSuccess(item.isActive ? 'Desactivado' : 'Activado');
      setTimeout(() => setSuccess(null), 2000);

      if (type === 'station') {
        loadStations();
      } else {
        loadStages();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadStationConfig = async (stationId) => {
    try {
      setLoading(true);
      const data = await stationConfigService.getStationConfig(stationId);
      setStationConfig(data);
    } catch (err) {
      setError('Error cargando configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = async (partId) => {
    try {
      setLoading(true);
      await stationConfigService.addPartToStation(selectedStation.id, partId);
      setShowAddPartModal(false);
      loadStationConfig(selectedStation.id);
      loadStations();
    } catch (err) {
      setError('Error agregando parte: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePart = async (partId) => {
    if (!window.confirm('¿Remover esta parte de la estación?')) return;
    try {
      setLoading(true);
      await stationConfigService.removePartFromStation(selectedStation.id, partId);
      loadStationConfig(selectedStation.id);
      loadStations();
    } catch (err) {
      setError('Error removiendo parte: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openItemsModal = async (part) => {
    setSelectedPart(part);
    try {
      setLoading(true);
      const data = await stationConfigService.getAvailableItems(selectedStation.id, part.partId);
      setAvailableItems(data);
      // Pre-select currently assigned items
      const currentDefects = part.items?.filter(i => i.itemType === 'DEFECT').map(i => i.defectTypeId) || [];
      const currentSpecs = part.items?.filter(i => i.itemType === 'SPEC').map(i => i.specId) || [];
      setSelectedDefects(currentDefects);
      setSelectedSpecs(currentSpecs);
      setShowItemsModal(true);
    } catch (err) {
      setError('Error cargando items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItems = async () => {
    try {
      setLoading(true);
      await stationConfigService.addItemsToStationPart(
        selectedStation.id,
        selectedPart.partId,
        selectedDefects,
        selectedSpecs
      );
      setShowItemsModal(false);
      loadStationConfig(selectedStation.id);
    } catch (err) {
      setError('Error guardando items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      setLoading(true);
      await stationConfigService.removeItem(selectedStation.id, itemId);
      loadStationConfig(selectedStation.id);
    } catch (err) {
      setError('Error removiendo item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDefect = (defectId) => {
    setSelectedDefects(prev =>
      prev.includes(defectId)
        ? prev.filter(id => id !== defectId)
        : [...prev, defectId]
    );
  };

  const toggleSpec = (specId) => {
    setSelectedSpecs(prev =>
      prev.includes(specId)
        ? prev.filter(id => id !== specId)
        : [...prev, specId]
    );
  };

  // Get parts not yet assigned to this station
  const getUnassignedParts = () => {
    if (!stationConfig) return allParts;
    const assignedIds = stationConfig.parts.map(p => p.partId);
    return allParts.filter(p => !assignedIds.includes(p.id));
  };

  // Styles
  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: '20px',
      minHeight: 'calc(100vh - 200px)'
    },
    sidebar: {
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      padding: '16px',
      border: `1px solid ${t.border}`
    },
    sidebarTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.textMuted,
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    stationButton: {
      width: '100%',
      padding: '12px 16px',
      marginBottom: '8px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s',
      color: t.text
    },
    stationButtonSelected: {
      backgroundColor: t.accent,
      color: 'white',
      border: `1px solid ${t.accent}`
    },
    main: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      padding: '20px',
      border: `1px solid ${t.border}`
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      color: t.text,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    addButton: {
      padding: '8px 16px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px'
    },
    partCard: {
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px'
    },
    partHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    partInfo: {
      flex: 1
    },
    partNumber: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text
    },
    partName: {
      fontSize: '14px',
      color: t.textMuted,
      marginTop: '4px'
    },
    clientName: {
      fontSize: '12px',
      color: t.accent,
      marginTop: '2px'
    },
    partActions: {
      display: 'flex',
      gap: '8px'
    },
    iconButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500'
    },
    configButton: {
      backgroundColor: t.accent,
      color: 'white'
    },
    removeButton: {
      backgroundColor: t.error,
      color: 'white'
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginTop: '12px'
    },
    itemSection: {
      backgroundColor: t.bgCard,
      padding: '12px',
      borderRadius: '6px'
    },
    itemSectionTitle: {
      fontSize: '13px',
      fontWeight: '600',
      color: t.textMuted,
      marginBottom: '8px',
      textTransform: 'uppercase'
    },
    itemChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      backgroundColor: t.bgPanel,
      borderRadius: '16px',
      fontSize: '12px',
      margin: '2px',
      color: t.text
    },
    removeChip: {
      cursor: 'pointer',
      color: t.error,
      fontWeight: '600'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    },
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      marginLeft: '8px'
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
      width: '600px',
      maxWidth: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
    },
    partList: {
      maxHeight: '400px',
      overflow: 'auto'
    },
    partListItem: {
      padding: '12px',
      borderBottom: `1px solid ${t.border}`,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '20px'
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
    checkboxGroup: {
      maxHeight: '200px',
      overflow: 'auto',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      padding: '8px'
    },
    checkboxItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 8px',
      cursor: 'pointer',
      borderRadius: '4px'
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

  // Sub-tab styles
  const subTabStyles = {
    container: { display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: t.bgPanel, padding: '4px', borderRadius: '8px' },
    tab: { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', backgroundColor: 'transparent', color: t.textMuted },
    tabActive: { backgroundColor: t.bgCard, color: t.accent, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: t.bgCard, borderRadius: '8px', overflow: 'hidden' },
    th: { padding: '12px 16px', textAlign: 'left', backgroundColor: t.bgPanel, fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` },
    td: { padding: '12px 16px', borderBottom: `1px solid ${t.border}`, fontSize: '14px', color: t.text },
    actionBtn: { padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', marginRight: '6px' },
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }
  };

  // Render catalog table for stations or stages
  const renderCatalogTable = (type) => {
    const items = type === 'station' ? stations : stages;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: t.text }}>
            {type === 'station' ? 'Estaciones de Inspección' : 'Etapas de Manufactura'}
          </h3>
          <button
            style={{ ...subTabStyles.actionBtn, backgroundColor: t.accent, color: 'white' }}
            onClick={() => openCatalogModal(type)}
          >
            + {type === 'station' ? 'Nueva Estación' : 'Nueva Etapa'}
          </button>
        </div>

        <table style={subTabStyles.table}>
          <thead>
            <tr>
              {type === 'station' && <th style={subTabStyles.th}>Código</th>}
              <th style={subTabStyles.th}>Nombre</th>
              {type === 'station' && <th style={subTabStyles.th}>Tipo</th>}
              {type === 'stage' && <th style={subTabStyles.th}>Departamento Responsable</th>}
              <th style={subTabStyles.th}>Descripción</th>
              <th style={subTabStyles.th}>Estado</th>
              <th style={subTabStyles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const dept = type === 'stage' ? departments.find(d => d.id === item.departmentId) : null;
              return (
                <tr key={item.id} style={{ opacity: item.isActive !== false ? 1 : 0.5 }}>
                  {type === 'station' && <td style={subTabStyles.td}>{item.code}</td>}
                  <td style={subTabStyles.td}><strong>{item.name}</strong></td>
                  {type === 'station' && (
                    <td style={subTabStyles.td}>
                      <span style={{
                        ...subTabStyles.badge,
                        backgroundColor: {
                          'INSPECTION': '#dbeafe',
                          'REPAIR': '#fef3c7',
                          'RELEASE': '#d1fae5',
                          'MRB': '#fce7f3'
                        }[item.stationType] || '#f3f4f6',
                        color: {
                          'INSPECTION': '#1e40af',
                          'REPAIR': '#92400e',
                          'RELEASE': '#065f46',
                          'MRB': '#9d174d'
                        }[item.stationType] || '#374151'
                      }}>
                        {stationTypes.find(st => st.value === item.stationType)?.label || item.stationType || 'Inspección'}
                      </span>
                    </td>
                  )}
                  {type === 'stage' && (
                    <td style={subTabStyles.td}>
                      {dept ? dept.name : <span style={{ color: t.textMuted, fontStyle: 'italic' }}>Sin asignar</span>}
                    </td>
                  )}
                  <td style={subTabStyles.td}>{item.description || '-'}</td>
                  <td style={subTabStyles.td}>
                    <span style={{
                      ...subTabStyles.badge,
                      backgroundColor: item.isActive !== false ? '#dcfce7' : '#fee2e2',
                      color: item.isActive !== false ? '#166534' : '#991b1b'
                    }}>
                      {item.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={subTabStyles.td}>
                    <button
                      style={{ ...subTabStyles.actionBtn, backgroundColor: t.bgPanel, color: t.text }}
                      onClick={() => openCatalogModal(type, item)}
                    >
                      Editar
                    </button>
                    <button
                      style={{
                        ...subTabStyles.actionBtn,
                        backgroundColor: item.isActive !== false ? '#fee2e2' : '#dcfce7',
                        color: item.isActive !== false ? '#991b1b' : '#166534'
                      }}
                      onClick={() => handleToggleCatalogActive(type, item)}
                      disabled={saving}
                    >
                      {item.isActive !== false ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={type === 'station' ? 6 : 5} style={{ ...subTabStyles.td, textAlign: 'center', color: t.textMuted }}>
                  No hay {type === 'station' ? 'estaciones' : 'etapas'} configuradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ ...styles.errorBanner, backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
          {success}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={subTabStyles.container}>
        <button
          style={{ ...subTabStyles.tab, ...(subTab === 'assignment' ? subTabStyles.tabActive : {}) }}
          onClick={() => setSubTab('assignment')}
        >
          Asignación
        </button>
        <button
          style={{ ...subTabStyles.tab, ...(subTab === 'stationsCatalog' ? subTabStyles.tabActive : {}) }}
          onClick={() => setSubTab('stationsCatalog')}
        >
          Catálogo Estaciones
        </button>
        <button
          style={{ ...subTabStyles.tab, ...(subTab === 'stagesCatalog' ? subTabStyles.tabActive : {}) }}
          onClick={() => setSubTab('stagesCatalog')}
        >
          Catálogo Etapas
        </button>
      </div>

      {/* Catalog Modal */}
      {showCatalogModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
              {editingCatalogItem?.id ? 'Editar' : 'Nueva'} {editingCatalogItem?.type === 'station' ? 'Estación' : 'Etapa'}
            </h3>

            {editingCatalogItem?.type === 'station' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Código *</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                    value={catalogFormData.code || ''}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Tipo de Estación *</label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '6px' }}
                    value={catalogFormData.stationType || 'INSPECTION'}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, stationType: e.target.value })}
                  >
                    {stationTypes.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {stationTypes.find(st => st.value === catalogFormData.stationType)?.description}
                  </p>
                  {catalogFormData.stationType && catalogFormData.stationType !== 'INSPECTION' && (
                    <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px', backgroundColor: '#fffbeb', padding: '6px 8px', borderRadius: '4px' }}>
                      Recomendación: Para métricas precisas, usa estaciones separadas por tipo (ej: Hospital1-Repair, Hospital1-Release)
                    </p>
                  )}
                </div>
              </>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Nombre *</label>
              <input
                type="text"
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                value={catalogFormData.name || ''}
                onChange={(e) => setCatalogFormData({ ...catalogFormData, name: e.target.value })}
              />
            </div>

            {editingCatalogItem?.type === 'stage' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Departamento Responsable</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '6px' }}
                  value={catalogFormData.departmentId || ''}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">-- Seleccionar --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Descripción</label>
              <input
                type="text"
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                value={catalogFormData.description || ''}
                onChange={(e) => setCatalogFormData({ ...catalogFormData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                style={{ ...subTabStyles.actionBtn, backgroundColor: t.bgPanel, color: t.text, padding: '8px 16px' }}
                onClick={() => setShowCatalogModal(false)}
              >
                Cancelar
              </button>
              <button
                style={{ ...subTabStyles.actionBtn, backgroundColor: t.accent, color: 'white', padding: '8px 16px' }}
                onClick={handleSaveCatalog}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stations Catalog Tab */}
      {subTab === 'stationsCatalog' && renderCatalogTable('station')}

      {/* Stages Catalog Tab */}
      {subTab === 'stagesCatalog' && renderCatalogTable('stage')}

      {/* Assignment Tab - Original content */}
      {subTab === 'assignment' && (
      <div style={styles.container}>
        {/* Sidebar - Stations List */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Estaciones de Inspección</div>
          {stations.map(station => (
            <button
              key={station.id}
              style={{
                ...styles.stationButton,
                ...(selectedStation?.id === station.id ? styles.stationButtonSelected : {})
              }}
              onClick={() => setSelectedStation(station)}
            >
              <div style={{ fontWeight: '500' }}>{station.name}</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                {station.assignedPartsCount || 0} partes · {station.totalItemsCount || 0} items
              </div>
            </button>
          ))}
          {stations.length === 0 && !loading && (
            <div style={{ color: t.textMuted, fontSize: '14px', padding: '12px' }}>
              No hay estaciones configuradas
            </div>
          )}
        </div>

        {/* Main Content */}
        <div style={styles.main}>
          {selectedStation && stationConfig ? (
            <>
              <div style={styles.sectionTitle}>
                <span>
                  {stationConfig.station.name}
                  <span style={{ ...styles.badge, backgroundColor: t.accent, color: 'white' }}>
                    {stationConfig.parts.length} partes
                  </span>
                </span>
                <button style={styles.addButton} onClick={() => setShowAddPartModal(true)}>
                  + Agregar Parte
                </button>
              </div>

              {stationConfig.station.description && (
                <p style={{ color: t.textMuted, marginBottom: '20px', marginTop: '-8px' }}>
                  {stationConfig.station.description}
                </p>
              )}

              {/* Parts List */}
              {stationConfig.parts.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No hay partes asignadas a esta estación.</p>
                  <button style={styles.addButton} onClick={() => setShowAddPartModal(true)}>
                    + Agregar Primera Parte
                  </button>
                </div>
              ) : (
                stationConfig.parts.map(part => (
                  <div key={part.configId} style={styles.partCard}>
                    <div style={styles.partHeader}>
                      <div style={styles.partInfo}>
                        <div style={styles.partNumber}>{part.partNumber}</div>
                        <div style={styles.partName}>{part.partName || part.captureDisplayName}</div>
                        <div style={styles.clientName}>{part.clientName}</div>
                      </div>
                      <div style={styles.partActions}>
                        <button
                          style={{ ...styles.iconButton, ...styles.configButton }}
                          onClick={() => openItemsModal(part)}
                        >
                          Configurar Items
                        </button>
                        <button
                          style={{ ...styles.iconButton, ...styles.removeButton }}
                          onClick={() => handleRemovePart(part.partId)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div style={styles.itemsGrid}>
                      <div style={styles.itemSection}>
                        <div style={styles.itemSectionTitle}>
                          Defectos ({part.defectsCount || 0})
                        </div>
                        {part.items?.filter(i => i.itemType === 'DEFECT').map(item => (
                          <span key={item.id} style={styles.itemChip}>
                            {item.itemCode}: {item.itemName}
                            <span style={styles.removeChip} onClick={() => handleRemoveItem(item.id)}>×</span>
                          </span>
                        ))}
                        {(!part.items || part.items.filter(i => i.itemType === 'DEFECT').length === 0) && (
                          <span style={{ fontSize: '12px', color: t.textMuted }}>Sin defectos asignados</span>
                        )}
                      </div>
                      <div style={styles.itemSection}>
                        <div style={styles.itemSectionTitle}>
                          Especificaciones ({part.specsCount || 0})
                        </div>
                        {part.items?.filter(i => i.itemType === 'SPEC').map(item => (
                          <span key={item.id} style={{
                            ...styles.itemChip,
                            backgroundColor: item.isCritical ? '#fef2f2' : t.bgPanel,
                            borderLeft: item.isCritical ? '3px solid #dc2626' : 'none'
                          }}>
                            {item.itemCode}: {item.itemName}
                            {item.specType === 'DIMENSIONAL' && ' (Dim)'}
                            <span style={styles.removeChip} onClick={() => handleRemoveItem(item.id)}>×</span>
                          </span>
                        ))}
                        {(!part.items || part.items.filter(i => i.itemType === 'SPEC').length === 0) && (
                          <span style={{ fontSize: '12px', color: t.textMuted }}>Sin specs asignadas</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              {loading ? 'Cargando...' : 'Selecciona una estación'}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Add Part Modal - only for assignment tab */}
      {subTab === 'assignment' && (
      <>
      {showAddPartModal && (
        <div style={styles.modal} onClick={() => setShowAddPartModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Agregar Parte a {selectedStation?.name}</h3>

            <div style={styles.partList}>
              {getUnassignedParts().map(part => (
                <div
                  key={part.id}
                  style={styles.partListItem}
                  onClick={() => handleAddPart(part.id)}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: t.text }}>{part.partNumber}</div>
                    <div style={{ fontSize: '13px', color: t.textMuted }}>
                      {part.partName || part.captureDisplayName} - {part.clientName}
                    </div>
                  </div>
                  <button style={{ ...styles.iconButton, ...styles.configButton }}>
                    Agregar
                  </button>
                </div>
              ))}
              {getUnassignedParts().length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: t.textMuted }}>
                  Todas las partes ya están asignadas a esta estación
                </div>
              )}
            </div>

            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowAddPartModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Items Modal */}
      {showItemsModal && selectedPart && (
        <div style={styles.modal} onClick={() => setShowItemsModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Configurar Items: {selectedPart.partNumber}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: t.text }}>
                Defectos a Inspeccionar
              </h4>
              <div style={styles.checkboxGroup}>
                {[...availableItems.availableDefects,
                  ...(selectedPart.items?.filter(i => i.itemType === 'DEFECT').map(i => ({
                    id: i.defectTypeId,
                    code: i.itemCode,
                    name: i.itemName,
                    categoryName: '',
                    assigned: true
                  })) || [])
                ].map(defect => (
                  <label key={defect.id} style={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={selectedDefects.includes(defect.id)}
                      onChange={() => toggleDefect(defect.id)}
                    />
                    <span style={{ color: t.text }}>
                      <strong>{defect.code}</strong>: {defect.name}
                      {defect.categoryName && <span style={{ color: t.textMuted }}> ({defect.categoryName})</span>}
                    </span>
                  </label>
                ))}
                {availableItems.availableDefects.length === 0 &&
                 (!selectedPart.items || selectedPart.items.filter(i => i.itemType === 'DEFECT').length === 0) && (
                  <div style={{ padding: '12px', color: t.textMuted, textAlign: 'center' }}>
                    No hay defectos configurados para esta parte
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: t.text }}>
                Especificaciones a Verificar
              </h4>
              <div style={styles.checkboxGroup}>
                {[...availableItems.availableSpecs,
                  ...(selectedPart.items?.filter(i => i.itemType === 'SPEC').map(i => ({
                    id: i.specId,
                    code: i.itemCode,
                    name: i.itemName,
                    specType: i.specType,
                    isCritical: i.isCritical,
                    assigned: true
                  })) || [])
                ].map(spec => (
                  <label key={spec.id} style={{
                    ...styles.checkboxItem,
                    backgroundColor: spec.isCritical ? '#fef2f2' : 'transparent'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedSpecs.includes(spec.id)}
                      onChange={() => toggleSpec(spec.id)}
                    />
                    <span style={{ color: t.text }}>
                      <strong>{spec.code}</strong>: {spec.name}
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginLeft: '6px',
                        backgroundColor: spec.specType === 'DIMENSIONAL' ? '#dbeafe' : '#f3f4f6',
                        color: spec.specType === 'DIMENSIONAL' ? '#1d4ed8' : '#6b7280'
                      }}>
                        {spec.specType}
                      </span>
                      {spec.isCritical && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginLeft: '4px',
                          backgroundColor: '#fecaca',
                          color: '#991b1b'
                        }}>
                          CRÍTICO
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {availableItems.availableSpecs.length === 0 &&
                 (!selectedPart.items || selectedPart.items.filter(i => i.itemType === 'SPEC').length === 0) && (
                  <div style={{ padding: '12px', color: t.textMuted, textAlign: 'center' }}>
                    No hay especificaciones configuradas para esta parte
                  </div>
                )}
              </div>
            </div>

            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowItemsModal(false)}>
                Cancelar
              </button>
              <button style={styles.saveButton} onClick={handleSaveItems} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default StationConfigTab;
