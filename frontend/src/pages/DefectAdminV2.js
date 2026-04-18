import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const DefectAdminV2 = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const token = localStorage.getItem('token');

  // Filters
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  // Data
  const [parts, setParts] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);
  const [categories, setCategories] = useState([]);

  // Selection
  const [selectedPartIds, setSelectedPartIds] = useState([]);
  const [selectedDefectIds, setSelectedDefectIds] = useState([]);
  const [partDisplayNames, setPartDisplayNames] = useState({});
  const [partDefectConfig, setPartDefectConfig] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form states
  const [defectForm, setDefectForm] = useState({ code: '', name: '', description: '', color: '#0072CE', categoryId: '' });
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '', color: '#6b7280' });

  // Fetch on mount
  useEffect(() => {
    fetchClients();
    fetchDefectTypes();
    fetchCategories();
  }, []);

  // Fetch projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchProjects(selectedClientId);
      setSelectedProjectIds([]);
    } else {
      setProjects([]);
      setParts([]);
    }
  }, [selectedClientId]);

  // Fetch parts when client or projects change
  useEffect(() => {
    if (selectedClientId) {
      fetchParts();
    }
  }, [selectedClientId, selectedProjectIds]);

  // Expand all categories by default when loaded
  useEffect(() => {
    if (categories.length > 0) {
      const expanded = {};
      categories.forEach(c => { expanded[c.id] = true; });
      setExpandedCategories(expanded);
    }
  }, [categories]);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchProjects = async (clientId) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/clients/${selectedClientId}/parts?activeOnly=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      let allParts = [];
      const projectGroups = data.projectGroups || [];
      projectGroups.forEach(group => {
        const groupParts = (group.parts || []).map(part => ({
          ...part,
          projectId: group.projectId,
          projectName: group.projectName
        }));

        if (selectedProjectIds.length === 0 || selectedProjectIds.includes(group.projectId)) {
          allParts = [...allParts, ...groupParts];
        }
      });

      setParts(allParts);
      setSelectedPartIds([]);
      setPartDisplayNames({});
      fetchAllPartsConfig(allParts.map(p => p.id));
    } catch (err) {
      console.error('Error fetching parts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPartsConfig = async (partIds) => {
    if (partIds.length === 0) return;
    try {
      const res = await fetch(`${API_URL}/defects-v2/parts-defects-bulk?partIds=${partIds.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const configByPart = {};
        (data.config || []).forEach(c => {
          if (!configByPart[c.partId]) configByPart[c.partId] = [];
          configByPart[c.partId].push(c.defectTypeId);
        });
        setPartDefectConfig(configByPart);
      }
    } catch (err) {
      console.error('Error fetching parts config:', err);
    }
  };

  const fetchDefectTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/defects-v2/types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDefectTypes(data.defectTypes || []);
    } catch (err) {
      console.error('Error fetching defect types:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/defects-v2/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Handlers
  const handlePartToggle = (partId) => {
    if (selectedPartIds.includes(partId)) {
      setSelectedPartIds(prev => prev.filter(id => id !== partId));
    } else {
      const part = parts.find(p => p.id === partId);
      if (part) {
        const displayName = part.captureDisplayName || part.partName;
        setPartDisplayNames(names => ({ ...names, [partId]: displayName }));
      }

      const partDefects = partDefectConfig[partId] || [];
      if (partDefects.length > 0) {
        setSelectedDefectIds(prev => {
          const newIds = partDefects.filter(id => !prev.includes(id));
          return [...prev, ...newIds];
        });
      }

      setSelectedPartIds(prev => [...prev, partId]);
    }
  };

  const handleSelectAllParts = () => {
    if (selectedPartIds.length === parts.length) {
      setSelectedPartIds([]);
      setPartDisplayNames({});
    } else {
      const allIds = parts.map(p => p.id);
      const names = {};
      parts.forEach(p => { names[p.id] = p.partName; });
      setSelectedPartIds(allIds);
      setPartDisplayNames(names);
    }
  };

  const handleDefectToggle = (defectId) => {
    setSelectedDefectIds(prev => {
      if (prev.includes(defectId)) {
        return prev.filter(id => id !== defectId);
      } else {
        return [...prev, defectId];
      }
    });
  };

  const handleSelectAllDefects = () => {
    if (selectedDefectIds.length === defectTypes.length) {
      setSelectedDefectIds([]);
    } else {
      setSelectedDefectIds(defectTypes.map(d => d.id));
    }
  };

  const handleCategoryToggle = (categoryId) => {
    const categoryDefects = defectTypes.filter(d => d.categoryId === categoryId);
    const categoryDefectIds = categoryDefects.map(d => d.id);
    const allSelected = categoryDefectIds.every(id => selectedDefectIds.includes(id));

    if (allSelected) {
      setSelectedDefectIds(prev => prev.filter(id => !categoryDefectIds.includes(id)));
    } else {
      setSelectedDefectIds(prev => {
        const newIds = categoryDefectIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  };

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleDisplayNameChange = (partId, value) => {
    setPartDisplayNames(prev => ({ ...prev, [partId]: value }));
  };

  // CRUD Defects
  const openDefectModal = (defect = null) => {
    if (defect) {
      setEditingDefect(defect);
      setDefectForm({
        code: defect.code,
        name: defect.name,
        description: defect.description || '',
        color: defect.color || '#0072CE',
        categoryId: defect.categoryId
      });
    } else {
      setEditingDefect(null);
      setDefectForm({ code: '', name: '', description: '', color: '#0072CE', categoryId: categories[0]?.id || '' });
    }
    setShowDefectModal(true);
  };

  const handleSaveDefect = async () => {
    if (!defectForm.code.trim() || !defectForm.name.trim() || !defectForm.categoryId) {
      setError('Código, nombre y categoría son requeridos');
      return;
    }

    try {
      const url = editingDefect
        ? `${API_URL}/defects-v2/types/${editingDefect.id}`
        : `${API_URL}/defects-v2/types`;
      const method = editingDefect ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(defectForm)
      });

      const data = await res.json();
      if (data.success) {
        setShowDefectModal(false);
        setDefectForm({ code: '', name: '', description: '', color: '#0072CE', categoryId: '' });
        setEditingDefect(null);
        fetchDefectTypes();
        setSuccess(editingDefect ? 'Defecto actualizado' : 'Defecto creado');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(data.message || 'Error guardando defecto');
      }
    } catch (err) {
      setError('Error guardando defecto');
    }
  };

  const handleDeleteDefect = async (defect) => {
    setDeleteTarget({ type: 'defect', item: defect });
    setShowDeleteModal(true);
  };

  // CRUD Categories
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        code: category.code,
        name: category.name,
        description: category.description || '',
        color: category.color || '#6b7280'
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ code: '', name: '', description: '', color: '#6b7280' });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
      setError('Código y nombre son requeridos');
      return;
    }

    try {
      const url = editingCategory
        ? `${API_URL}/defects-v2/categories/${editingCategory.id}`
        : `${API_URL}/defects-v2/categories`;
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(categoryForm)
      });

      const data = await res.json();
      if (data.success) {
        setShowCategoryModal(false);
        setCategoryForm({ code: '', name: '', description: '', color: '#6b7280' });
        setEditingCategory(null);
        fetchCategories();
        fetchDefectTypes();
        setSuccess(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(data.message || 'Error guardando categoría');
      }
    } catch (err) {
      setError('Error guardando categoría');
    }
  };

  const handleDeleteCategory = async (category) => {
    const categoryDefects = defectTypes.filter(d => d.categoryId === category.id);
    if (categoryDefects.length > 0) {
      setError(`No se puede eliminar: la categoría tiene ${categoryDefects.length} defectos asignados`);
      return;
    }
    setDeleteTarget({ type: 'category', item: category });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const url = deleteTarget.type === 'defect'
        ? `${API_URL}/defects-v2/types/${deleteTarget.item.id}?hard=true`
        : `${API_URL}/defects-v2/categories/${deleteTarget.item.id}?hard=true`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        if (deleteTarget.type === 'defect') {
          fetchDefectTypes();
        } else {
          fetchCategories();
        }
        setSuccess('Eliminado correctamente');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(data.message || 'Error eliminando');
      }
    } catch (err) {
      setError('Error eliminando');
    }
  };

  const handleAssignDefects = async () => {
    if (selectedPartIds.length === 0) {
      setError('Selecciona al menos una parte');
      return;
    }
    if (selectedDefectIds.length === 0) {
      setError('Selecciona al menos un defecto');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      const assignedParts = [];

      for (const partId of selectedPartIds) {
        const res = await fetch(`${API_URL}/defects-v2/parts/${partId}/defects-bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            defectTypeIds: selectedDefectIds,
            captureDisplayName: partDisplayNames[partId] || null
          })
        });

        if (res.ok) {
          successCount++;
          const part = parts.find(p => p.id === partId);
          if (part) assignedParts.push(part.partNumber);
          setPartDefectConfig(prev => ({
            ...prev,
            [partId]: [...selectedDefectIds]
          }));
        }
      }

      setSuccess(`${selectedDefectIds.length} defectos asignados a ${successCount} partes`);
      setTimeout(() => setSuccess(null), 5000);

      setSelectedPartIds([]);
      setSelectedDefectIds([]);
      setPartDisplayNames({});

    } catch (err) {
      setError('Error asignando defectos');
    } finally {
      setLoading(false);
    }
  };

  // Group defects by category
  const defectsByCategory = categories.map(cat => ({
    ...cat,
    defects: defectTypes.filter(d => d.categoryId === cat.id)
  }));

  const selectedParts = parts.filter(p => selectedPartIds.includes(p.id));

  // Styles
  const styles = {
    container: { minHeight: '100vh', backgroundColor: t.bg, padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 },
    filterBar: {
      display: 'flex', gap: '16px', marginBottom: '20px', padding: '16px',
      backgroundColor: t.bgCard, borderRadius: '12px', border: `1px solid ${t.border}`,
      alignItems: 'flex-end', flexWrap: 'wrap'
    },
    filterGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    filterLabel: { fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' },
    select: { padding: '10px 14px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', minWidth: '200px', backgroundColor: t.bgCard, color: t.text },
    columns: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '20px' },
    column: { backgroundColor: t.bgCard, borderRadius: '12px', border: `1px solid ${t.border}`, overflow: 'hidden' },
    columnHeader: {
      padding: '16px', backgroundColor: t.bgPanel, borderBottom: `1px solid ${t.border}`,
      fontWeight: '600', fontSize: '14px', color: t.text,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    columnContent: { padding: '12px', maxHeight: '600px', overflowY: 'auto' },
    checkboxItem: {
      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px',
      borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.15s', marginBottom: '4px'
    },
    checkboxItemSelected: { backgroundColor: t.bgPanel },
    checkbox: { width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' },
    partInfo: { flex: 1 },
    partNumber: { fontWeight: '600', fontSize: '13px', color: t.text },
    partName: { fontSize: '12px', color: t.textMuted },
    selectedPartItem: { padding: '12px', marginBottom: '8px', backgroundColor: t.bgPanel, borderRadius: '8px', border: `1px solid ${t.border}` },
    input: { width: '100%', padding: '8px 10px', border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px', marginTop: '6px', backgroundColor: t.bgCard, color: t.text },
    categoryHeader: {
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
      borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`
    },
    defectItem: {
      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px 8px 32px',
      borderRadius: '6px', cursor: 'pointer', marginBottom: '2px'
    },
    defectColor: { width: '12px', height: '12px', borderRadius: '3px' },
    btn: { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px' },
    btnPrimary: { backgroundColor: t.accent, color: 'white' },
    btnSuccess: { backgroundColor: t.success, color: 'white' },
    btnSecondary: { backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}` },
    btnDanger: { backgroundColor: t.error, color: 'white' },
    btnSmall: { padding: '4px 8px', fontSize: '11px' },
    alert: { padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' },
    alertError: { backgroundColor: '#fef2f2', color: t.error, border: '1px solid #fecaca' },
    alertSuccess: { backgroundColor: '#f0fdf4', color: t.success, border: '1px solid #bbf7d0' },
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modalContent: { backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', width: '450px', maxWidth: '90%', border: `1px solid ${t.border}` },
    emptyState: { textAlign: 'center', padding: '40px 20px', color: t.textMuted },
    badge: { padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Configuracion de Defectos por Parte</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => navigate('/defect-capture')}>
            Ir a Captura
          </button>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>x</button>
        </div>
      )}
      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{success}</div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Cliente</span>
          <select style={styles.select} value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            <option value="">Seleccionar cliente...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Proyectos (opcional)</span>
          <select
            style={styles.select}
            multiple
            value={selectedProjectIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, opt => parseInt(opt.value));
              setSelectedProjectIds(values);
            }}
            disabled={!selectedClientId}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectNumber} - {p.projectName}</option>
            ))}
          </select>
        </div>

        {/* Assign Button */}
        <button
          style={{
            padding: '16px 24px',
            backgroundColor: (selectedPartIds.length === 0 || selectedDefectIds.length === 0) ? '#9ca3af' : '#2E7D32',
            color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600',
            cursor: (selectedPartIds.length === 0 || selectedDefectIds.length === 0 || loading) ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, minWidth: '200px'
          }}
          onClick={handleAssignDefects}
          disabled={selectedPartIds.length === 0 || selectedDefectIds.length === 0 || loading}
        >
          {loading ? 'Asignando...' : `Asignar ${selectedDefectIds.length} -> ${selectedPartIds.length} partes`}
        </button>

        {/* Action buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            style={{ ...styles.btn, backgroundColor: '#374151', color: 'white' }}
            onClick={() => openCategoryModal()}
          >
            + Categoria
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={() => openDefectModal()}
          >
            + Defecto
          </button>
        </div>
      </div>

      {/* Three Columns */}
      {selectedClientId ? (
        <div style={styles.columns}>
          {/* Column 1: Parts */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <span>Partes</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedPartIds.length === parts.length && parts.length > 0}
                  onChange={handleSelectAllParts}
                />
                Todas
              </label>
            </div>
            <div style={styles.columnContent}>
              {loading && <div style={styles.emptyState}>Cargando...</div>}
              {!loading && parts.length === 0 && (
                <div style={styles.emptyState}>No hay partes para este cliente</div>
              )}
              {parts.map(part => {
                const configCount = partDefectConfig[part.id]?.length || 0;
                return (
                  <div
                    key={part.id}
                    style={{
                      ...styles.checkboxItem,
                      ...(selectedPartIds.includes(part.id) ? styles.checkboxItemSelected : {})
                    }}
                    onClick={() => handlePartToggle(part.id)}
                  >
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={selectedPartIds.includes(part.id)}
                      onChange={() => {}}
                    />
                    <div style={styles.partInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={styles.partNumber}>{part.partNumber}</span>
                        {configCount > 0 && (
                          <span style={{
                            fontSize: '10px', padding: '2px 6px', borderRadius: '10px',
                            backgroundColor: '#2E7D32', color: 'white', fontWeight: '600'
                          }}>
                            {configCount}
                          </span>
                        )}
                      </div>
                      <div style={styles.partName}>{part.partName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Selected Parts with editable names */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <span>Nombre para Captura</span>
              <span style={styles.badge}>{selectedParts.length} seleccionadas</span>
            </div>
            <div style={styles.columnContent}>
              {selectedParts.length === 0 ? (
                <div style={styles.emptyState}>Selecciona partes en la columna izquierda</div>
              ) : (
                selectedParts.map(part => (
                  <div key={part.id} style={styles.selectedPartItem}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>
                      {part.partNumber}
                    </div>
                    <input
                      type="text"
                      style={styles.input}
                      value={partDisplayNames[part.id] || part.partName}
                      onChange={(e) => handleDisplayNameChange(part.id, e.target.value)}
                      placeholder="Nombre para mostrar en captura"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Defects by Category */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <span>Defectos por Categoria</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedDefectIds.length === defectTypes.length && defectTypes.length > 0}
                  onChange={handleSelectAllDefects}
                />
                Todos
              </label>
            </div>
            <div style={styles.columnContent}>
              {defectsByCategory.map(category => {
                const categoryDefectIds = category.defects.map(d => d.id);
                const allSelected = categoryDefectIds.length > 0 && categoryDefectIds.every(id => selectedDefectIds.includes(id));
                const someSelected = categoryDefectIds.some(id => selectedDefectIds.includes(id));
                const isExpanded = expandedCategories[category.id];

                return (
                  <div key={category.id} style={{ marginBottom: '8px' }}>
                    {/* Category Header */}
                    <div style={styles.categoryHeader}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={() => handleCategoryToggle(category.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                      />
                      <div
                        style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: category.color }}
                      />
                      <span
                        style={{ fontWeight: '600', fontSize: '13px', color: t.text, flex: 1, cursor: 'pointer' }}
                        onClick={() => toggleCategoryExpand(category.id)}
                      >
                        {category.name}
                      </span>
                      <span style={{ fontSize: '11px', color: t.textMuted }}>{category.defects.length}</span>
                      <button
                        style={styles.iconBtn}
                        onClick={(e) => { e.stopPropagation(); openCategoryModal(category); }}
                        title="Editar categoria"
                      >
                        &#9998;
                      </button>
                      <button
                        style={styles.iconBtn}
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                        title="Eliminar categoria"
                      >
                        &#128465;
                      </button>
                      <span
                        style={{ cursor: 'pointer', fontSize: '12px', color: t.textMuted }}
                        onClick={() => toggleCategoryExpand(category.id)}
                      >
                        {isExpanded ? '▼' : ''}
                      </span>
                    </div>

                    {/* Defects in Category */}
                    {isExpanded && category.defects.map(defect => {
                      const partsWithDefect = selectedPartIds.filter(
                        partId => partDefectConfig[partId]?.includes(defect.id)
                      ).length;
                      const allPartsHave = partsWithDefect === selectedPartIds.length && selectedPartIds.length > 0;
                      const somePartsHave = partsWithDefect > 0 && partsWithDefect < selectedPartIds.length;

                      return (
                        <div
                          key={defect.id}
                          style={{
                            ...styles.defectItem,
                            backgroundColor: selectedDefectIds.includes(defect.id) ? '#ecfdf5' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDefectIds.includes(defect.id)}
                            onChange={() => handleDefectToggle(defect.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ ...styles.defectColor, backgroundColor: defect.color }} />
                          <span
                            style={{ fontSize: '13px', color: t.text, flex: 1, cursor: 'pointer' }}
                            onClick={() => handleDefectToggle(defect.id)}
                          >
                            {defect.name}
                          </span>
                          {allPartsHave && (
                            <span style={{ color: '#2E7D32', fontSize: '12px' }} title="Asignado a todas">●</span>
                          )}
                          {somePartsHave && (
                            <span style={{ color: '#C77700', fontSize: '12px' }} title={`Asignado a ${partsWithDefect}/${selectedPartIds.length}`}>◐</span>
                          )}
                          <button
                            style={styles.iconBtn}
                            onClick={(e) => { e.stopPropagation(); openDefectModal(defect); }}
                            title="Editar defecto"
                          >
                            &#9998;
                          </button>
                          <button
                            style={styles.iconBtn}
                            onClick={(e) => { e.stopPropagation(); handleDeleteDefect(defect); }}
                            title="Eliminar defecto"
                          >
                            &#128465;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.column, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
          <div style={{ fontSize: '16px', color: t.textMuted }}>Selecciona un cliente para comenzar</div>
        </div>
      )}

      {/* Defect Modal */}
      {showDefectModal && (
        <div style={styles.modal} onClick={() => setShowDefectModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>
              {editingDefect ? 'Editar Defecto' : 'Nuevo Defecto'}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Categoria *
              </label>
              <select
                value={defectForm.categoryId}
                onChange={(e) => setDefectForm({ ...defectForm, categoryId: parseInt(e.target.value) })}
                style={{ ...styles.input, marginTop: 0 }}
              >
                <option value="">Seleccionar categoria...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Codigo *
              </label>
              <input
                type="text"
                value={defectForm.code}
                onChange={(e) => setDefectForm({ ...defectForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                style={{ ...styles.input, marginTop: 0 }}
                placeholder="Ej: TORNILLO_FALTANTE"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={defectForm.name}
                onChange={(e) => setDefectForm({ ...defectForm, name: e.target.value })}
                style={{ ...styles.input, marginTop: 0 }}
                placeholder="Ej: Tornillo Faltante"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Descripcion
              </label>
              <input
                type="text"
                value={defectForm.description}
                onChange={(e) => setDefectForm({ ...defectForm, description: e.target.value })}
                style={{ ...styles.input, marginTop: 0 }}
                placeholder="Descripcion opcional"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Color
              </label>
              <input
                type="color"
                value={defectForm.color}
                onChange={(e) => setDefectForm({ ...defectForm, color: e.target.value })}
                style={{ width: '50px', height: '36px', border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowDefectModal(false)}>
                Cancelar
              </button>
              <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={handleSaveDefect}>
                {editingDefect ? 'Guardar Cambios' : 'Crear Defecto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={styles.modal} onClick={() => setShowCategoryModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>
              {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Codigo *
              </label>
              <input
                type="text"
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                style={{ ...styles.input, marginTop: 0 }}
                placeholder="Ej: ELECTRICO"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                style={{ ...styles.input, marginTop: 0 }}
                placeholder="Ej: Electrico"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Descripcion
              </label>
              <input
                type="text"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                style={{ ...styles.input, marginTop: 0 }}
                placeholder="Descripcion opcional"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Color
              </label>
              <input
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                style={{ width: '50px', height: '36px', border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowCategoryModal(false)}>
                Cancelar
              </button>
              <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={handleSaveCategory}>
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div style={styles.modal} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#B00020' }}>
              Confirmar Eliminacion
            </h3>
            <p style={{ marginBottom: '20px', color: t.text }}>
              ¿Estas seguro de eliminar {deleteTarget.type === 'defect' ? 'el defecto' : 'la categoria'}{' '}
              <strong>"{deleteTarget.item.name}"</strong>?
            </p>
            {deleteTarget.type === 'defect' && (
              <p style={{ marginBottom: '20px', color: t.textMuted, fontSize: '13px' }}>
                Si el defecto esta siendo usado en registros, no se podra eliminar.
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectAdminV2;
