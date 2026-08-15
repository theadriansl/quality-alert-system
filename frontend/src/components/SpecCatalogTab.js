import React, { useState, useEffect } from 'react';
import specCatalogService from '../services/specCatalogService';
import { useLanguage } from '../context/LanguageContext';

const SpecCatalogTab = ({ theme: t }) => {
  const { t: tr, language, changeLanguage } = useLanguage();
  // State
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [specsByType, setSpecsByType] = useState({ dimensional: [], qualitative: [], bomComponent: [] });
  const [counts, setCounts] = useState({ total: 0, dimensional: 0, qualitative: 0, bomComponent: 0, critical: 0 });
  const [units, setUnits] = useState([]);
  const [unitsByCategory, setUnitsByCategory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingSpec, setEditingSpec] = useState(null);

  // BOM Modal state
  const [showBomModal, setShowBomModal] = useState(false);
  const [bomComponents, setBomComponents] = useState([]);
  const [bomPhotoUrl, setBomPhotoUrl] = useState('');
  const [bomNotes, setBomNotes] = useState('');

  // Stations state
  const [allStations, setAllStations] = useState([]);
  const [selectedStationIds, setSelectedStationIds] = useState([]);

  // Departments state
  const [departments, setDepartments] = useState([]);

  // Calibration equipment state
  const [calibrationEquipment, setCalibrationEquipment] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    specNumber: '',
    specName: '',
    specType: 'DIMENSIONAL',
    lowerLimit: '',
    nominalValue: '',
    upperLimit: '',
    unitId: '',
    acceptableValues: '',
    isCritical: false,
    requiresMeasurement: true,
    inspectionMethod: '',
    referencePhotoUrl: '',
    drawingRef: '',
    notes: '',
    defaultDepartmentId: '',
    measurementInstrument: '',
    instrumentCode: '',
    requiresCalibration: false
  });

  // Load data on mount
  useEffect(() => {
    loadParts();
    loadUnits();
    loadClients();
    loadStations();
    loadDepartments();
    loadCalibrationEquipment();
  }, []);

  const loadStations = async () => {
    try {
      const stations = await specCatalogService.getAllStations();
      setAllStations(stations);
    } catch (err) {
      console.error('Error loading stations:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadCalibrationEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/calibration/search/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCalibrationEquipment(data.equipment || []);
      }
    } catch (err) {
      console.error('Error loading calibration equipment:', err);
    }
  };

  // Load specs when part changes
  useEffect(() => {
    if (selectedPart) {
      loadSpecs(selectedPart.id);
    }
  }, [selectedPart]);

  // Reset project when client changes
  useEffect(() => {
    setSelectedProjectId('');
    setSelectedPart(null);
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/clients/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadParts = async () => {
    try {
      const data = await specCatalogService.getAllParts();
      setParts(data);
    } catch (err) {
      setError('Error cargando partes: ' + err.message);
    }
  };

  // Filtered parts based on client/project selection
  const filteredParts = parts.filter(part => {
    if (selectedClientId && part.clientId !== parseInt(selectedClientId)) return false;
    if (selectedProjectId && part.projectId !== parseInt(selectedProjectId)) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return part.partNumber?.toLowerCase().includes(search) ||
             part.partName?.toLowerCase().includes(search);
    }
    return true;
  });

  // Get unique projects from filtered parts (for project dropdown)
  const availableProjects = [...new Map(
    parts
      .filter(p => !selectedClientId || p.clientId === parseInt(selectedClientId))
      .filter(p => p.projectId && p.projectNumber)
      .map(p => [p.projectId, { id: p.projectId, number: p.projectNumber, name: p.projectName }])
  ).values()];

  const loadUnits = async () => {
    try {
      const data = await specCatalogService.getUnits();
      setUnits(data.units);
      setUnitsByCategory(data.unitsByCategory);
    } catch (err) {
      console.error('Error loading units:', err);
    }
  };

  const loadSpecs = async (partId) => {
    try {
      setLoading(true);
      const data = await specCatalogService.getPartSpecsWithStations(partId);
      setSpecs(data.specs);
      setSpecsByType(data.specsByType);
      setCounts(data.counts);
    } catch (err) {
      setError('Error cargando especificaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (type = 'DIMENSIONAL') => {
    setModalMode('create');
    setFormData({
      specNumber: '',
      specName: '',
      specType: type,
      lowerLimit: '',
      nominalValue: '',
      upperLimit: '',
      unitId: '',
      acceptableValues: '',
      isCritical: false,
      requiresMeasurement: type === 'DIMENSIONAL',
      inspectionMethod: '',
      referencePhotoUrl: '',
      drawingRef: '',
      notes: '',
      defaultDepartmentId: '',
      measurementInstrument: '',
      instrumentCode: '',
      requiresCalibration: false
    });
    setSelectedStationIds([]);
    setSelectedEquipmentId('');
    setEditingSpec(null);
    setShowModal(true);
  };

  const openEditModal = (spec) => {
    setModalMode('edit');
    setFormData({
      specNumber: spec.specNumber,
      specName: spec.specName,
      specType: spec.specType,
      lowerLimit: spec.lowerLimit || '',
      nominalValue: spec.nominalValue || '',
      upperLimit: spec.upperLimit || '',
      unitId: spec.unitId || '',
      acceptableValues: spec.acceptableValues || '',
      isCritical: spec.isCritical || false,
      requiresMeasurement: spec.requiresMeasurement || false,
      inspectionMethod: spec.inspectionMethod || '',
      referencePhotoUrl: spec.referencePhotoUrl || '',
      drawingRef: spec.drawingRef || '',
      notes: spec.notes || '',
      defaultDepartmentId: spec.defaultDepartmentId || '',
      measurementInstrument: spec.measurementInstrument || '',
      instrumentCode: spec.instrumentCode || '',
      requiresCalibration: spec.requiresCalibration || false
    });
    // Load current stations from spec data
    setSelectedStationIds(spec.stations ? spec.stations.map(s => s.id) : []);
    // Find equipment by code if exists
    const matchingEquip = calibrationEquipment.find(e => e.code === spec.instrumentCode);
    setSelectedEquipmentId(matchingEquip ? matchingEquip.id : '');
    setEditingSpec(spec);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        ...formData,
        lowerLimit: formData.lowerLimit ? parseFloat(formData.lowerLimit) : null,
        nominalValue: formData.nominalValue ? parseFloat(formData.nominalValue) : null,
        upperLimit: formData.upperLimit ? parseFloat(formData.upperLimit) : null,
        unitId: formData.unitId ? parseInt(formData.unitId) : null,
        defaultDepartmentId: formData.defaultDepartmentId ? parseInt(formData.defaultDepartmentId) : null
      };

      let specId;
      if (modalMode === 'create') {
        const newSpec = await specCatalogService.createSpec(selectedPart.id, payload);
        specId = newSpec.id;
      } else {
        await specCatalogService.updateSpec(editingSpec.id, payload);
        specId = editingSpec.id;
      }

      // Save station assignments
      if (specId) {
        await specCatalogService.updateSpecStations(specId, selectedStationIds);
      }

      setShowModal(false);
      loadSpecs(selectedPart.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (spec) => {
    if (!window.confirm(`¿Eliminar especificación "${spec.specName}"?`)) return;
    try {
      setLoading(true);
      await specCatalogService.deleteSpec(spec.id);
      loadSpecs(selectedPart.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const url = await specCatalogService.uploadPhoto(file);
      setFormData({ ...formData, referencePhotoUrl: url });
    } catch (err) {
      setError('Error subiendo foto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // BOM Functions
  const openBomModal = async () => {
    try {
      setLoading(true);
      const components = await specCatalogService.getBomComponents(selectedPart.id);
      setBomComponents(components);
      setBomPhotoUrl('');
      setBomNotes('');
      setShowBomModal(true);
    } catch (err) {
      setError('Error cargando componentes BOM: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBomComponent = async (component) => {
    try {
      setLoading(true);
      await specCatalogService.addBomComponent(
        selectedPart.id,
        component.id,
        bomPhotoUrl,
        bomNotes
      );
      // Reload components and specs
      const components = await specCatalogService.getBomComponents(selectedPart.id);
      setBomComponents(components);
      loadSpecs(selectedPart.id);
      setBomPhotoUrl('');
      setBomNotes('');
    } catch (err) {
      setError('Error agregando componente BOM: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBomPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const url = await specCatalogService.uploadPhoto(file);
      setBomPhotoUrl(url);
    } catch (err) {
      setError('Error subiendo foto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unit symbol
  const getUnitSymbol = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit ? unit.symbol : '';
  };

  // Styles
  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '20px',
      minHeight: 'calc(100vh - 200px)'
    },
    sidebar: {
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      padding: '16px',
      border: `1px solid ${t.border}`,
      maxHeight: 'calc(100vh - 200px)',
      overflow: 'auto'
    },
    sidebarTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.textMuted,
      marginBottom: '12px',
      textTransform: 'uppercase'
    },
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      marginBottom: '12px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text,
      boxSizing: 'border-box'
    },
    partButton: {
      width: '100%',
      padding: '10px 12px',
      marginBottom: '6px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      textAlign: 'left',
      color: t.text,
      transition: 'all 0.2s'
    },
    partButtonSelected: {
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
    badges: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '16px',
      fontSize: '12px',
      fontWeight: '500'
    },
    addButtons: {
      display: 'flex',
      gap: '8px'
    },
    addButton: {
      padding: '8px 14px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '13px'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.textMuted,
      marginBottom: '12px',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    specTable: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      backgroundColor: t.bgPanel,
      borderBottom: `2px solid ${t.border}`,
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    td: {
      padding: '10px 12px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    criticalBadge: {
      backgroundColor: '#fecaca',
      color: '#991b1b',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600'
    },
    actionButton: {
      padding: '4px 10px',
      marginRight: '6px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
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
    formGroup: {
      marginBottom: '16px'
    },
    formGroupFull: {
      gridColumn: '1 / -1',
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
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    limitsGroup: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px',
      padding: '16px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      border: `1px solid ${t.border}`
    },
    limitBox: {
      textAlign: 'center'
    },
    limitLabel: {
      fontSize: '11px',
      color: t.textMuted,
      marginBottom: '6px',
      textTransform: 'uppercase'
    },
    limitInput: {
      width: '100%',
      padding: '10px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '16px',
      textAlign: 'center',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    photoPreview: {
      width: '100px',
      height: '100px',
      objectFit: 'cover',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      marginTop: '8px'
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

  const renderSpecTable = (specList, type) => {
    if (specList.length === 0) return null;

    return (
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          {type === 'dimensional' && 'Dimensionales'}
          {type === 'qualitative' && 'Cualitativas'}
          {type === 'bomComponent' && 'Componentes BOM'}
          <span style={{ ...styles.badge, backgroundColor: t.bgPanel, color: t.text }}>
            {specList.length}
          </span>
        </div>
        <table style={styles.specTable}>
          <thead>
            <tr>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Nombre</th>
              {type === 'dimensional' && (
                <>
                  <th style={styles.th}>LI</th>
                  <th style={styles.th}>Nominal</th>
                  <th style={styles.th}>LS</th>
                  <th style={styles.th}>Unidad</th>
                </>
              )}
              {type === 'qualitative' && <th style={styles.th}>Valores Aceptables</th>}
              {type === 'bomComponent' && <th style={styles.th}>Componente</th>}
              <th style={styles.th}>Estaciones</th>
              <th style={styles.th}>Responsable</th>
              <th style={styles.th}>Crítico</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {specList.map(spec => (
              <tr key={spec.id}>
                <td style={styles.td}>
                  <code style={{ backgroundColor: t.bgPanel, padding: '2px 6px', borderRadius: '4px' }}>
                    {spec.specNumber}
                  </code>
                </td>
                <td style={styles.td}>{spec.specName}</td>
                {type === 'dimensional' && (
                  <>
                    <td style={styles.td}>{spec.lowerLimit ?? '-'}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{spec.nominalValue ?? '-'}</td>
                    <td style={styles.td}>{spec.upperLimit ?? '-'}</td>
                    <td style={styles.td}>{spec.unitSymbol || '-'}</td>
                  </>
                )}
                {type === 'qualitative' && (
                  <td style={styles.td}>{spec.acceptableValues || '-'}</td>
                )}
                {type === 'bomComponent' && (
                  <td style={styles.td}>
                    {spec.bomPartNumber ? (
                      <span>
                        <code style={{ backgroundColor: t.bgPanel, padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>
                          {spec.bomPartNumber}
                        </code>
                        {spec.bomPartName}
                      </span>
                    ) : '-'}
                  </td>
                )}
                <td style={styles.td}>
                  {spec.stations && spec.stations.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {spec.stations.map(st => (
                        <span
                          key={st.id}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {st.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      Sin estación
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {spec.defaultDepartmentName ? (
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {spec.defaultDepartmentName}
                    </span>
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: '11px' }}>—</span>
                  )}
                </td>
                <td style={styles.td}>
                  {spec.isCritical && <span style={styles.criticalBadge}>CTQ</span>}
                </td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.actionButton, backgroundColor: t.accent, color: 'white' }}
                    onClick={() => openEditModal(spec)}
                  >
                    Editar
                  </button>
                  <button
                    style={{ ...styles.actionButton, backgroundColor: t.error, color: 'white' }}
                    onClick={() => handleDelete(spec)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      <div style={styles.container}>
        {/* Sidebar - Parts List */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Seleccionar Parte</div>

          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={{ ...styles.searchInput, marginBottom: '8px', cursor: 'pointer' }}
          >
            <option value="">Todos los clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ ...styles.searchInput, marginBottom: '8px', cursor: 'pointer' }}
            disabled={!selectedClientId}
          >
            <option value="">Todos los proyectos</option>
            {availableProjects.map(p => (
              <option key={p.id} value={p.id}>{p.number} - {p.name}</option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar parte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />

          {/* Parts count */}
          <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '8px', textAlign: 'center' }}>
            {filteredParts.length} parte(s) encontrada(s)
          </div>

          {filteredParts.map(part => (
            <button
              key={part.id}
              style={{
                ...styles.partButton,
                ...(selectedPart?.id === part.id ? styles.partButtonSelected : {})
              }}
              onClick={() => setSelectedPart(part)}
            >
              <div style={{ fontWeight: '500', fontSize: '13px' }}>{part.partNumber}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                {part.partName || part.captureDisplayName}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>{part.clientName}</div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={styles.main}>
          {selectedPart ? (
            <>
              <div style={styles.header}>
                <div>
                  <h2 style={styles.title}>
                    {selectedPart.partNumber} - Especificaciones
                  </h2>
                  <div style={styles.badges}>
                    <span style={{ ...styles.badge, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                      {counts.dimensional} Dimensionales
                    </span>
                    <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' }}>
                      {counts.qualitative} Cualitativas
                    </span>
                    <span style={{ ...styles.badge, backgroundColor: '#d1fae5', color: '#065f46' }}>
                      {counts.bomComponent} BOM
                    </span>
                    {counts.critical > 0 && (
                      <span style={{ ...styles.badge, backgroundColor: '#fecaca', color: '#991b1b' }}>
                        {counts.critical} Críticas
                      </span>
                    )}
                    {counts.withoutStation > 0 && (
                      <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' }}>
                        {counts.withoutStation} Sin estación
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.addButtons}>
                  <button style={styles.addButton} onClick={() => openCreateModal('DIMENSIONAL')}>
                    + Dimensional
                  </button>
                  <button style={{ ...styles.addButton, backgroundColor: '#f59e0b' }} onClick={() => openCreateModal('QUALITATIVE')}>
                    + Cualitativa
                  </button>
                  <button style={{ ...styles.addButton, backgroundColor: '#10b981' }} onClick={openBomModal}>
                    + BOM
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={styles.emptyState}>Cargando...</div>
              ) : counts.total === 0 ? (
                <div style={styles.emptyState}>
                  <p>No hay especificaciones para esta parte.</p>
                  <div style={{ ...styles.addButtons, justifyContent: 'center', marginTop: '16px' }}>
                    <button style={styles.addButton} onClick={() => openCreateModal('DIMENSIONAL')}>
                      + Crear Dimensional
                    </button>
                    <button style={{ ...styles.addButton, backgroundColor: '#f59e0b' }} onClick={() => openCreateModal('QUALITATIVE')}>
                      + Crear Cualitativa
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {renderSpecTable(specsByType.dimensional, 'dimensional')}
                  {renderSpecTable(specsByType.qualitative, 'qualitative')}
                  {renderSpecTable(specsByType.bomComponent, 'bomComponent')}
                </>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              Selecciona una parte para ver sus especificaciones
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {modalMode === 'create' ? 'Nueva Especificación' : 'Editar Especificación'}
              {formData.specType === 'DIMENSIONAL' && ' - Dimensional'}
              {formData.specType === 'QUALITATIVE' && ' - Cualitativa'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                {/* Spec Number */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Código *</label>
                  <input
                    type="text"
                    value={formData.specNumber}
                    onChange={(e) => setFormData({ ...formData, specNumber: e.target.value.toUpperCase() })}
                    style={styles.input}
                    placeholder="SPEC-001"
                    required
                  />
                </div>

                {/* Spec Name */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre *</label>
                  <input
                    type="text"
                    value={formData.specName}
                    onChange={(e) => setFormData({ ...formData, specName: e.target.value })}
                    style={styles.input}
                    placeholder={formData.specType === 'DIMENSIONAL' ? 'Diámetro exterior, Longitud, Espesor...' : 'Apariencia, Reclamo de Cliente, Color...'}
                    required
                  />
                </div>
              </div>

              {/* Dimensional: Limits */}
              {formData.specType === 'DIMENSIONAL' && (
                <div style={styles.formGroupFull}>
                  <label style={styles.label}>Límites de Especificación</label>
                  <div style={styles.limitsGroup}>
                    <div style={styles.limitBox}>
                      <div style={styles.limitLabel}>Límite Inferior (LI)</div>
                      <input
                        type="number"
                        step="any"
                        value={formData.lowerLimit}
                        onChange={(e) => setFormData({ ...formData, lowerLimit: e.target.value })}
                        style={styles.limitInput}
                        placeholder="10.45"
                      />
                    </div>
                    <div style={styles.limitBox}>
                      <div style={{ ...styles.limitLabel, color: t.accent, fontWeight: '600' }}>Nominal (Media)</div>
                      <input
                        type="number"
                        step="any"
                        value={formData.nominalValue}
                        onChange={(e) => setFormData({ ...formData, nominalValue: e.target.value })}
                        style={{ ...styles.limitInput, borderColor: t.accent, borderWidth: '2px' }}
                        placeholder="10.50"
                      />
                    </div>
                    <div style={styles.limitBox}>
                      <div style={styles.limitLabel}>Límite Superior (LS)</div>
                      <input
                        type="number"
                        step="any"
                        value={formData.upperLimit}
                        onChange={(e) => setFormData({ ...formData, upperLimit: e.target.value })}
                        style={styles.limitInput}
                        placeholder="10.55"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Unit (for Dimensional) */}
              {formData.specType === 'DIMENSIONAL' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Unidad de Medida</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Seleccionar unidad...</option>
                    {unitsByCategory.map(cat => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.units.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.symbol})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {/* Qualitative: Acceptable Values */}
              {formData.specType === 'QUALITATIVE' && (
                <div style={styles.formGroupFull}>
                  <label style={styles.label}>Valores Aceptables</label>
                  <input
                    type="text"
                    value={formData.acceptableValues}
                    onChange={(e) => setFormData({ ...formData, acceptableValues: e.target.value })}
                    style={styles.input}
                    placeholder="RAL7035, Sin rayones, Superficie lisa"
                  />
                </div>
              )}

              <div style={styles.formGrid}>
                {/* Critical */}
                <div style={styles.formGroup}>
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.isCritical}
                      onChange={(e) => setFormData({ ...formData, isCritical: e.target.checked })}
                    />
                    <span style={{ fontWeight: '500', color: t.text }}>Característica Crítica (CTQ)</span>
                  </label>
                </div>

                {/* Requires Measurement - Only for DIMENSIONAL */}
                {formData.specType === 'DIMENSIONAL' && (
                  <div style={styles.formGroup}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.requiresMeasurement}
                        onChange={(e) => setFormData({ ...formData, requiresMeasurement: e.target.checked })}
                      />
                      <span style={{ fontWeight: '500', color: t.text }}>Requiere Medición</span>
                    </label>
                  </div>
                )}

                {/* Inspection Method */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {formData.specType === 'DIMENSIONAL' ? 'Método de Medición' : 'Método de Inspección'}
                  </label>
                  <input
                    type="text"
                    value={formData.inspectionMethod}
                    onChange={(e) => setFormData({ ...formData, inspectionMethod: e.target.value })}
                    style={styles.input}
                    placeholder={formData.specType === 'DIMENSIONAL' ? 'Calibrador digital, Micrómetro, etc.' : 'Visual, Tacto, Comparación, etc.'}
                  />
                </div>

                {/* Drawing Reference */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Referencia de Dibujo</label>
                  <input
                    type="text"
                    value={formData.drawingRef}
                    onChange={(e) => setFormData({ ...formData, drawingRef: e.target.value })}
                    style={styles.input}
                    placeholder="DWG-001 Det. A"
                  />
                </div>
              </div>

              {/* Instrumento de Medición - ISO/IATF */}
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: t.bgPanel,
                borderRadius: '8px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: t.textMuted,
                  marginBottom: '12px',
                  textTransform: 'uppercase'
                }}>
                  Instrumento de Medición (ISO/IATF)
                </div>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Seleccionar Equipo de Calibración</label>
                    <select
                      value={selectedEquipmentId}
                      onChange={(e) => {
                        const equipId = e.target.value;
                        setSelectedEquipmentId(equipId);
                        if (equipId) {
                          const equip = calibrationEquipment.find(eq => eq.id === parseInt(equipId));
                          if (equip) {
                            setFormData({
                              ...formData,
                              measurementInstrument: equip.name,
                              instrumentCode: equip.code,
                              requiresCalibration: true
                            });
                          }
                        } else {
                          setFormData({
                            ...formData,
                            measurementInstrument: '',
                            instrumentCode: '',
                            requiresCalibration: false
                          });
                        }
                      }}
                      style={styles.input}
                    >
                      <option value="">-- Seleccionar equipo o ingresar manual --</option>
                      {calibrationEquipment.map(equip => (
                        <option key={equip.id} value={equip.id}>
                          {equip.code} - {equip.name} {equip.calibrationStatus === 'WARNING' ? '⚠️' : equip.calibrationStatus === 'EXPIRED' ? '❌' : '✓'}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: t.textMuted, fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Selecciona un equipo del catálogo o déjalo vacío para ingresar manualmente
                    </small>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Instrumento</label>
                    <input
                      type="text"
                      value={formData.measurementInstrument}
                      onChange={(e) => setFormData({ ...formData, measurementInstrument: e.target.value })}
                      style={{
                        ...styles.input,
                        backgroundColor: selectedEquipmentId ? t.bgPanel : t.bgCard
                      }}
                      placeholder="Calibrador Vernier, Gage Go/NoGo, CMM..."
                      readOnly={!!selectedEquipmentId}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Código Instrumento</label>
                    <input
                      type="text"
                      value={formData.instrumentCode}
                      onChange={(e) => setFormData({ ...formData, instrumentCode: e.target.value.toUpperCase() })}
                      style={{
                        ...styles.input,
                        backgroundColor: selectedEquipmentId ? t.bgPanel : t.bgCard
                      }}
                      placeholder="CAL-001, GAGE-015..."
                      readOnly={!!selectedEquipmentId}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.requiresCalibration}
                        onChange={(e) => setFormData({ ...formData, requiresCalibration: e.target.checked })}
                        disabled={!!selectedEquipmentId}
                      />
                      <span style={{ fontWeight: '500', color: t.text }}>Requiere Calibración Vigente</span>
                    </label>
                    <small style={{ color: t.textMuted, fontSize: '11px', marginLeft: '24px' }}>
                      {selectedEquipmentId
                        ? 'Vinculado al sistema de calibración'
                        : 'El instrumento debe tener certificado de calibración activo'}
                    </small>
                  </div>
                </div>
              </div>

              {/* Reference Photo */}
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Foto de Referencia</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ marginBottom: '8px' }}
                />
                {formData.referencePhotoUrl && (
                  <img
                    src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${formData.referencePhotoUrl}`}
                    alt="Referencia"
                    style={styles.photoPreview}
                  />
                )}
              </div>

              {/* Default Department */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Departamento Responsable (Default)</label>
                <select
                  value={formData.defaultDepartmentId}
                  onChange={(e) => setFormData({ ...formData, defaultDepartmentId: e.target.value ? parseInt(e.target.value) : '' })}
                  style={styles.input}
                >
                  <option value="">Sin asignar</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Estaciones donde aplica esta spec */}
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Estaciones de Inspección</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {allStations.length === 0 ? (
                    <span style={{ color: t.textMuted, fontSize: '13px' }}>No hay estaciones configuradas</span>
                  ) : (
                    allStations.map(station => (
                      <label
                        key={station.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          backgroundColor: selectedStationIds.includes(station.id) ? t.accent + '20' : 'transparent',
                          border: `1px solid ${selectedStationIds.includes(station.id) ? t.accent : 'transparent'}`,
                          fontSize: '13px'
                        }}
                      >
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
                          style={{ accentColor: t.accent }}
                        />
                        {station.name}
                      </label>
                    ))
                  )}
                </div>
                <small style={{ color: t.textMuted, fontSize: '12px', marginTop: '6px', display: 'block' }}>
                  El checklist solo mostrará esta spec en las estaciones seleccionadas
                </small>
              </div>

              {/* Notes */}
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div style={styles.modalButtons}>
                <button type="button" style={styles.cancelButton} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" style={styles.saveButton} disabled={loading}>
                  {loading ? 'Guardando...' : (modalMode === 'create' ? 'Crear Especificación' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOM Modal */}
      {showBomModal && (
        <div style={styles.modal} onClick={() => setShowBomModal(false)}>
          <div style={{ ...styles.modalContent, width: '700px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Componentes BOM - {selectedPart?.partNumber}
            </h3>

            <p style={{ color: t.textMuted, marginBottom: '20px' }}>
              Selecciona los componentes hijos que forman parte del ensamble para crear un checklist de verificación.
            </p>

            {/* Photo upload for BOM */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <label style={styles.label}>Foto de referencia (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBomPhotoUpload}
                style={{ marginBottom: '8px' }}
              />
              {bomPhotoUrl && (
                <img
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${bomPhotoUrl}`}
                  alt="Referencia BOM"
                  style={styles.photoPreview}
                />
              )}
              <div style={{ marginTop: '12px' }}>
                <label style={styles.label}>Notas</label>
                <input
                  type="text"
                  value={bomNotes}
                  onChange={(e) => setBomNotes(e.target.value)}
                  style={styles.input}
                  placeholder="Notas para el checklist..."
                />
              </div>
            </div>

            {/* Components list */}
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {bomComponents.length === 0 ? (
                <div style={{ ...styles.emptyState, padding: '30px' }}>
                  <p>No hay componentes hijos para esta parte.</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Los componentes BOM se obtienen de las partes que tienen a esta parte como "parent_part_id" en el catálogo de partes.
                  </p>
                </div>
              ) : (
                <table style={styles.specTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Número de Parte</th>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomComponents.map(comp => (
                      <tr key={comp.id}>
                        <td style={styles.td}>
                          <code style={{ backgroundColor: t.bgPanel, padding: '2px 6px', borderRadius: '4px' }}>
                            {comp.partNumber}
                          </code>
                        </td>
                        <td style={styles.td}>{comp.partName || comp.captureDisplayName}</td>
                        <td style={styles.td}>
                          {comp.specId ? (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: '#d1fae5',
                              color: '#065f46'
                            }}>
                              Agregado
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: t.bgPanel,
                              color: t.textMuted
                            }}>
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {!comp.specId && (
                            <button
                              style={{ ...styles.actionButton, backgroundColor: t.success, color: 'white' }}
                              onClick={() => handleAddBomComponent(comp)}
                              disabled={loading}
                            >
                              {loading ? '...' : 'Agregar al Checklist'}
                            </button>
                          )}
                          {comp.specId && (
                            <button
                              style={{ ...styles.actionButton, backgroundColor: t.error, color: 'white' }}
                              onClick={() => handleDelete({ id: comp.specId, specName: comp.partNumber })}
                            >
                              Quitar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowBomModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecCatalogTab;
