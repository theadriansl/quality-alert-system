import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import StationConfigTab from '../components/StationConfigTab';
import SpecCatalogTab from '../components/SpecCatalogTab';
import LocationCodesTab from '../components/LocationCodesTab';
import HospitalRolesManager from '../components/HospitalRolesManager';
import ProductionTab from '../components/ProductionTab';
import CalibrationEquipmentTab from '../components/CalibrationEquipmentTab';

const API_URL = 'http://localhost:5000';

const DefectAdminV2 = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
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
  const [departments, setDepartments] = useState([]);

  // Selection
  const [selectedPartIds, setSelectedPartIds] = useState([]);
  const [selectedDefectIds, setSelectedDefectIds] = useState([]);
  const [partDisplayNames, setPartDisplayNames] = useState({});
  const [partDefectConfig, setPartDefectConfig] = useState({}); // Original config from DB
  const [gridConfig, setGridConfig] = useState({}); // Editable grid config (partId -> [defectIds])
  const [hasGridChanges, setHasGridChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sorting for parts list
  const [partSortField, setPartSortField] = useState('partNumber'); // partNumber, partName, defectCount
  const [partSortDir, setPartSortDir] = useState('asc'); // asc, desc

  // Modal states
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form states
  const [defectForm, setDefectForm] = useState({ code: '', name: '', description: '', color: '#0072CE', categoryId: '', defaultDepartmentId: '' });
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '', color: '#6b7280' });

  // Tab state (with localStorage persistence)
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('defectAdminActiveTab') || 'defects';
  });

  // Persist tab to localStorage
  useEffect(() => {
    localStorage.setItem('defectAdminActiveTab', activeTab);
  }, [activeTab]);

  // Fetch on mount
  useEffect(() => {
    fetchClients();
    fetchDefectTypes();
    fetchCategories();
    fetchDepartments();
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

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Handlers
  const handlePartToggle = (partId) => {
    if (selectedPartIds.includes(partId)) {
      // Deselecting a part - remove from grid
      const newSelectedPartIds = selectedPartIds.filter(id => id !== partId);
      setSelectedPartIds(newSelectedPartIds);

      // Remove from grid config
      setGridConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[partId];
        return newConfig;
      });

      if (newSelectedPartIds.length === 0) {
        setSelectedDefectIds([]);
        setHasGridChanges(false);
      }
    } else {
      // Selecting a part - add to grid with its current config
      const part = parts.find(p => p.id === partId);
      if (part) {
        const displayName = part.captureDisplayName || part.partName;
        setPartDisplayNames(names => ({ ...names, [partId]: displayName }));
      }

      // Initialize grid config for this part with its current defects
      const currentDefects = partDefectConfig[partId] || [];
      setGridConfig(prev => ({
        ...prev,
        [partId]: [...currentDefects]
      }));

      setSelectedPartIds(prev => [...prev, partId]);
    }
  };

  // Toggle a single cell in the grid (part + defect combination)
  const handleGridToggle = (partId, defectId) => {
    setGridConfig(prev => {
      const currentDefects = prev[partId] || [];
      let newDefects;
      if (currentDefects.includes(defectId)) {
        newDefects = currentDefects.filter(id => id !== defectId);
      } else {
        newDefects = [...currentDefects, defectId];
      }
      return { ...prev, [partId]: newDefects };
    });
    setHasGridChanges(true);
  };

  // Toggle entire row (all parts for a defect)
  const handleRowToggle = (defectId) => {
    const allHave = selectedPartIds.every(partId =>
      (gridConfig[partId] || []).includes(defectId)
    );

    setGridConfig(prev => {
      const newConfig = { ...prev };
      selectedPartIds.forEach(partId => {
        const currentDefects = newConfig[partId] || [];
        if (allHave) {
          // Remove from all
          newConfig[partId] = currentDefects.filter(id => id !== defectId);
        } else {
          // Add to all that don't have it
          if (!currentDefects.includes(defectId)) {
            newConfig[partId] = [...currentDefects, defectId];
          }
        }
      });
      return newConfig;
    });
    setHasGridChanges(true);
  };

  // Save all grid changes
  const handleSaveGrid = async () => {
    if (!hasGridChanges) return;

    try {
      setLoading(true);
      let successCount = 0;

      for (const partId of selectedPartIds) {
        const defectIds = gridConfig[partId] || [];
        const res = await fetch(`${API_URL}/defects-v2/parts/${partId}/defects-bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            defectTypeIds: defectIds,
            captureDisplayName: partDisplayNames[partId] || null
          })
        });

        if (res.ok) {
          successCount++;
          // Update local partDefectConfig
          setPartDefectConfig(prev => ({
            ...prev,
            [partId]: [...defectIds]
          }));
        }
      }

      setSuccess(`Configuración guardada para ${successCount} partes`);
      setTimeout(() => setSuccess(null), 3000);
      setHasGridChanges(false);

    } catch (err) {
      setError('Error guardando configuración');
    } finally {
      setLoading(false);
    }
  };

  // Discard grid changes
  const handleDiscardChanges = () => {
    // Reset grid config to original
    const resetConfig = {};
    selectedPartIds.forEach(partId => {
      resetConfig[partId] = [...(partDefectConfig[partId] || [])];
    });
    setGridConfig(resetConfig);
    setHasGridChanges(false);
  };

  const handleSelectAllParts = () => {
    if (selectedPartIds.length === parts.length) {
      // Deselect all - clear everything
      setSelectedPartIds([]);
      setPartDisplayNames({});
      setSelectedDefectIds([]);
    } else {
      // Select all - DON'T auto-load defects
      const allIds = parts.map(p => p.id);
      const names = {};
      parts.forEach(p => { names[p.id] = p.partName; });
      setSelectedPartIds(allIds);
      setPartDisplayNames(names);
      // Keep current defect selection or clear if none
      // User selects defects manually
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
        categoryId: defect.categoryId,
        defaultDepartmentId: defect.defaultDepartmentId || ''
      });
    } else {
      setEditingDefect(null);
      setDefectForm({ code: '', name: '', description: '', color: '#0072CE', categoryId: categories[0]?.id || '', defaultDepartmentId: '' });
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
        setDefectForm({ code: '', name: '', description: '', color: '#0072CE', categoryId: '', defaultDepartmentId: '' });
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

    // Always confirm for "Establecer" since it replaces all defects
    const partNames = selectedPartIds.map(id => {
      const part = parts.find(p => p.id === id);
      return part ? part.partNumber : id;
    }).join(', ');

    const confirmed = window.confirm(
      `⚠️ ESTABLECER reemplazará TODOS los defectos existentes.\n\n` +
      `Las ${selectedPartIds.length} parte(s) quedarán con SOLO estos ${selectedDefectIds.length} defecto(s).\n\n` +
      `Partes afectadas:\n${partNames}\n\n` +
      `Si solo quieres AGREGAR defectos sin perder los existentes, usa el botón "+ Agregar".`
    );

    if (!confirmed) return;

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

      setSuccess(`${selectedDefectIds.length} defectos establecidos en ${successCount} partes`);
      setTimeout(() => setSuccess(null), 5000);

      setSelectedPartIds([]);
      setSelectedDefectIds([]);
      setPartDisplayNames({});

      // Refetch to ensure UI shows real data from database
      if (parts.length > 0) {
        fetchAllPartsConfig(parts.map(p => p.id));
      }

    } catch (err) {
      setError('Error asignando defectos');
    } finally {
      setLoading(false);
    }
  };

  // ADD defects without removing existing ones
  const handleAddDefects = async () => {
    if (selectedPartIds.length === 0) {
      setError('Selecciona al menos una parte');
      return;
    }
    if (selectedDefectIds.length === 0) {
      setError('Selecciona al menos un defecto para agregar');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;

      for (const partId of selectedPartIds) {
        const res = await fetch(`${API_URL}/defects-v2/parts/${partId}/defects-add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            defectTypeIds: selectedDefectIds
          })
        });

        if (res.ok) {
          const data = await res.json();
          successCount++;
          // Update local state with new total
          setPartDefectConfig(prev => ({
            ...prev,
            [partId]: data.assignedDefects.map(d => d.id)
          }));
        }
      }

      setSuccess(`${selectedDefectIds.length} defectos agregados a ${successCount} partes (sin perder los existentes)`);
      setTimeout(() => setSuccess(null), 5000);

      setSelectedPartIds([]);
      setSelectedDefectIds([]);
      setPartDisplayNames({});

      // Refetch to ensure UI shows real data from database
      if (parts.length > 0) {
        fetchAllPartsConfig(parts.map(p => p.id));
      }

    } catch (err) {
      setError('Error agregando defectos');
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

  // Sort parts
  const handlePartSort = (field) => {
    if (partSortField === field) {
      setPartSortDir(partSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setPartSortField(field);
      setPartSortDir('asc');
    }
  };

  const sortedParts = [...parts].sort((a, b) => {
    let valA, valB;
    if (partSortField === 'partNumber') {
      valA = (a.partNumber || '').toLowerCase();
      valB = (b.partNumber || '').toLowerCase();
    } else if (partSortField === 'partName') {
      valA = (a.partName || '').toLowerCase();
      valB = (b.partName || '').toLowerCase();
    } else if (partSortField === 'defectCount') {
      valA = partDefectConfig[a.id]?.length || 0;
      valB = partDefectConfig[b.id]?.length || 0;
    } else if (partSortField === 'project') {
      valA = (a.projectName || '').toLowerCase();
      valB = (b.projectName || '').toLowerCase();
    }
    if (valA < valB) return partSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return partSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Styles
  const styles = {
    container: { minHeight: '100vh', backgroundColor: t.bg, padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { fontSize: '24px', fontWeight: '600', color: t.text, margin: 0 },
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
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 },
    tabs: { display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: t.bgPanel, padding: '4px', borderRadius: '8px' },
    tab: { padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', backgroundColor: 'transparent', color: t.textMuted },
    tabActive: { backgroundColor: t.bgCard, color: t.accent, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>{language === 'es' ? 'Administración de Defectos' : 'Defect Administration'}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
            style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}
          >
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: t.border }} />
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => navigate('/defect-config')}>
            Config
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => navigate('/defect-capture')}>
            {language === 'es' ? 'Volver a Inspección' : 'Back to Inspection'}
          </button>
          <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={() => navigate('/hospital-dashboard')}>
            {language === 'es' ? 'Volver a Hospital' : 'Back to Hospital'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'defects' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('defects')}
        >
          Defectos por Parte
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'stations' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('stations')}
        >
          Estaciones
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'specs' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('specs')}
        >
          Especificaciones
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'locations' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('locations')}
        >
          Ubicaciones
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'hospital-roles' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('hospital-roles')}
        >
          Roles Hospital
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'production' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('production')}
        >
          Producción
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'calibration' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('calibration')}
        >
          Calibración
        </button>
      </div>

      {/* Production Tab */}
      {activeTab === 'production' && <ProductionTab theme={t} />}

      {/* Calibration Tab */}
      {activeTab === 'calibration' && <CalibrationEquipmentTab theme={t} />}

      {/* Stations Tab */}
      {activeTab === 'stations' && <StationConfigTab theme={t} />}

      {/* Specs Tab */}
      {activeTab === 'specs' && <SpecCatalogTab theme={t} />}

      {/* Locations Tab */}
      {activeTab === 'locations' && <LocationCodesTab theme={t} />}

      {/* Hospital Roles Tab */}
      {activeTab === 'hospital-roles' && <HospitalRolesManager />}

      {/* Defects Tab - Alerts */}
      {activeTab === 'defects' && (
      <>
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
      </div>

      {/* Three Columns */}
      {selectedClientId ? (
        <div style={styles.columns}>
          {/* Column 1: Parts */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <span>Partes ({parts.length})</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedPartIds.length === parts.length && parts.length > 0}
                  onChange={handleSelectAllParts}
                />
                Todas
              </label>
            </div>
            {/* Sort buttons */}
            <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bg, flexWrap: 'wrap' }}>
              {[
                { field: 'partNumber', label: '# Parte' },
                { field: 'partName', label: 'Nombre' },
                { field: 'defectCount', label: 'Defectos' }
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handlePartSort(field)}
                  style={{
                    padding: '4px 8px', fontSize: '11px', border: `1px solid ${t.border}`,
                    borderRadius: '4px', cursor: 'pointer',
                    backgroundColor: partSortField === field ? t.accent : t.bgCard,
                    color: partSortField === field ? 'white' : t.text,
                    fontWeight: partSortField === field ? '600' : '400'
                  }}
                >
                  {label} {partSortField === field && (partSortDir === 'asc' ? '↑' : '↓')}
                </button>
              ))}
            </div>
            <div style={styles.columnContent}>
              {loading && <div style={styles.emptyState}>Cargando...</div>}
              {!loading && parts.length === 0 && (
                <div style={styles.emptyState}>No hay partes para este cliente</div>
              )}
              {sortedParts.map(part => {
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
                      {selectedProjectIds.length === 0 && part.projectName && (
                        <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>
                          {part.projectName}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2+3: Configuration Grid */}
          <div style={{ ...styles.column, flex: 2 }}>
            <div style={styles.columnHeader}>
              <span>Configuración de Defectos</span>
              {selectedParts.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hasGridChanges && (
                    <>
                      <button
                        onClick={handleDiscardChanges}
                        style={{
                          padding: '4px 12px', fontSize: '12px', border: `1px solid ${t.border}`,
                          borderRadius: '4px', backgroundColor: 'transparent', color: t.text, cursor: 'pointer'
                        }}
                      >
                        Descartar
                      </button>
                      <button
                        onClick={handleSaveGrid}
                        disabled={loading}
                        style={{
                          padding: '4px 12px', fontSize: '12px', border: 'none',
                          borderRadius: '4px', backgroundColor: '#2E7D32', color: 'white',
                          cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600'
                        }}
                      >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </>
                  )}
                  <span style={styles.badge}>{selectedParts.length} partes</span>
                </div>
              )}
            </div>
            <div style={{ ...styles.columnContent, padding: 0, overflow: 'auto' }}>
              {selectedParts.length === 0 ? (
                <div style={{ ...styles.emptyState, padding: '40px' }}>
                  Selecciona partes en la columna izquierda para configurar sus defectos
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bgCard, position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{
                        padding: '10px 8px', textAlign: 'left', borderBottom: `2px solid ${t.border}`,
                        minWidth: '180px', color: t.text, fontWeight: '600'
                      }}>
                        Defecto
                      </th>
                      {selectedParts.map(part => (
                        <th key={part.id} style={{
                          padding: '10px 4px', textAlign: 'center', borderBottom: `2px solid ${t.border}`,
                          minWidth: '80px', maxWidth: '120px', color: t.text, fontWeight: '600'
                        }}>
                          <div style={{ fontSize: '11px', lineHeight: '1.2' }}>{part.partNumber}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {defectsByCategory.map(category => (
                      <React.Fragment key={category.id}>
                        {/* Category row */}
                        <tr style={{ backgroundColor: t.bg }}>
                          <td colSpan={selectedParts.length + 1} style={{
                            padding: '8px', fontWeight: '600', color: t.text,
                            borderBottom: `1px solid ${t.border}`, cursor: 'pointer'
                          }} onClick={() => toggleCategoryExpand(category.id)}>
                            <span style={{ marginRight: '8px' }}>{expandedCategories[category.id] ? '▼' : '▶'}</span>
                            <span style={{
                              display: 'inline-block', width: '12px', height: '12px',
                              backgroundColor: category.color, borderRadius: '3px', marginRight: '8px', verticalAlign: 'middle'
                            }} />
                            {category.name}
                            <span style={{ color: t.textMuted, fontWeight: 'normal', marginLeft: '8px' }}>
                              ({category.defects.length})
                            </span>
                          </td>
                        </tr>
                        {/* Defect rows */}
                        {expandedCategories[category.id] && category.defects.map(defect => {
                          const allHave = selectedParts.every(p => (gridConfig[p.id] || []).includes(defect.id));
                          const someHave = selectedParts.some(p => (gridConfig[p.id] || []).includes(defect.id));
                          return (
                            <tr key={defect.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                              <td style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={allHave}
                                  ref={el => { if (el) el.indeterminate = someHave && !allHave; }}
                                  onChange={() => handleRowToggle(defect.id)}
                                  style={{ cursor: 'pointer' }}
                                  title="Toggle para todas las partes"
                                />
                                <span style={{
                                  display: 'inline-block', width: '10px', height: '10px',
                                  backgroundColor: defect.color, borderRadius: '2px'
                                }} />
                                <span style={{ color: t.text }}>{defect.name}</span>
                              </td>
                              {selectedParts.map(part => {
                                const isChecked = (gridConfig[part.id] || []).includes(defect.id);
                                const wasOriginal = (partDefectConfig[part.id] || []).includes(defect.id);
                                const changed = isChecked !== wasOriginal;
                                return (
                                  <td key={part.id} style={{
                                    padding: '6px 4px', textAlign: 'center',
                                    backgroundColor: changed ? (isChecked ? '#dcfce7' : '#fee2e2') : 'transparent'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleGridToggle(part.id, defect.id)}
                                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.column, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '16px', color: t.textMuted }}>Selecciona un cliente para comenzar</div>
        </div>
      )}

      {/* Hidden section for category/defect management - shown via buttons */}
      {selectedClientId && (
        <div style={{
          marginTop: '20px', padding: '16px', backgroundColor: t.bgCard,
          borderRadius: '12px', border: `1px solid ${t.border}`
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              style={{ ...styles.btn, backgroundColor: '#374151', color: 'white' }}
              onClick={() => openCategoryModal()}
            >
              + Categoria
            </button>
            <button
              style={{ ...styles.btn, backgroundColor: '#0072CE', color: 'white' }}
              onClick={() => openDefectModal()}
            >
              + Defecto
            </button>
          </div>
        </div>
      )}
      </>
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Departamento Responsable (Default)
              </label>
              <select
                value={defectForm.defaultDepartmentId}
                onChange={(e) => setDefectForm({ ...defectForm, defaultDepartmentId: e.target.value ? parseInt(e.target.value) : '' })}
                style={{ ...styles.input, marginTop: 0 }}
              >
                <option value="">Sin asignar</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
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
