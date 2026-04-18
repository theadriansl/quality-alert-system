import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import defectService from '../services/defectService';
import { getCurrentUser, isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';

const DefectAdmin = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  // Check if user is admin (using centralized utility)
  const currentUser = getCurrentUser();
  const isAdmin = isUserAdmin(currentUser);

  // State
  const [catalogTypes, setCatalogTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: '',
    icon: '',
    parentItemId: null,
    displayOrder: 0
  });

  // Parent items for SUB_PART
  const [parentItems, setParentItems] = useState([]);

  // Filter
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load catalog types on mount
  useEffect(() => {
    loadCatalogTypes();
  }, []);

  // Load items when type changes
  useEffect(() => {
    if (selectedType) {
      loadCatalogItems(selectedType.code);

      // Load parent items for SUB_PART type
      if (selectedType.code === 'SUB_PART') {
        loadParentItems();
      }
    }
  }, [selectedType, showInactive]);

  const loadCatalogTypes = async () => {
    try {
      setLoading(true);
      const types = await defectService.getCatalogTypes();
      setCatalogTypes(types);

      // Select first type by default
      if (types.length > 0 && !selectedType) {
        setSelectedType(types[0]);
      }
    } catch (err) {
      setError('Error cargando tipos de catálogo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogItems = async (typeCode) => {
    try {
      setLoading(true);
      const items = await defectService.getCatalogItemsByType(typeCode, null, showInactive);
      setCatalogItems(items);
    } catch (err) {
      setError('Error cargando items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadParentItems = async () => {
    try {
      const items = await defectService.getCatalogItemsByType('MAIN_ITEM');
      setParentItems(items);
    } catch (err) {
      console.error('Error loading parent items:', err);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSearchTerm('');
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      description: '',
      color: selectedType?.code === 'PRIORITY' || selectedType?.code === 'RANK' ? '#0072CE' : '',
      icon: '',
      parentItemId: null,
      displayOrder: catalogItems.length
    });
    setEditingItem(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      color: item.color || '',
      icon: item.icon || '',
      parentItemId: item.parentItemId || null,
      displayOrder: item.displayOrder || 0
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (modalMode === 'create') {
        await defectService.createCatalogItem({
          catalogTypeCode: selectedType.code,
          ...formData
        });
      } else {
        await defectService.updateCatalogItem(editingItem.id, formData);
      }

      setShowModal(false);
      loadCatalogItems(selectedType.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Desactivar "${item.name}"?`)) return;

    try {
      setLoading(true);
      await defectService.deleteCatalogItem(item.id, false); // Soft delete
      loadCatalogItems(selectedType.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (item) => {
    try {
      setLoading(true);
      await defectService.updateCatalogItem(item.id, { isActive: true });
      loadCatalogItems(selectedType.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHardDelete = async (item) => {
    if (!isAdmin) {
      setError('Solo administradores pueden eliminar permanentemente');
      return;
    }

    if (!window.confirm(`¿ELIMINAR PERMANENTEMENTE "${item.name}"?\n\nEsta acción NO se puede deshacer.`)) return;

    try {
      setLoading(true);
      await defectService.deleteCatalogItem(item.id, true); // Hard delete
      loadCatalogItems(selectedType.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by search term
  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Styles
  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: t.bg,
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '10px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    layout: {
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: '20px',
      minHeight: 'calc(100vh - 150px)'
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
    typeButton: {
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
    typeButtonSelected: {
      backgroundColor: t.accent,
      color: 'white',
      borderColor: t.accent
    },
    main: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      padding: '20px',
      border: `1px solid ${t.border}`
    },
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      flexWrap: 'wrap',
      gap: '10px'
    },
    searchInput: {
      padding: '10px 14px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      width: '300px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    addButton: {
      padding: '10px 20px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: t.textMuted
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      backgroundColor: t.bgPanel,
      borderBottom: `2px solid ${t.border}`,
      fontWeight: '600',
      color: t.text,
      fontSize: '13px',
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    colorBadge: {
      display: 'inline-block',
      width: '24px',
      height: '24px',
      borderRadius: '4px',
      border: `1px solid ${t.border}`
    },
    actionButton: {
      padding: '6px 12px',
      marginRight: '8px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px'
    },
    editButton: {
      backgroundColor: t.accent,
      color: 'white'
    },
    deleteButton: {
      backgroundColor: t.error,
      color: 'white'
    },
    reactivateButton: {
      backgroundColor: t.success,
      color: 'white'
    },
    inactiveRow: {
      backgroundColor: '#fef2f2',
      opacity: 0.7
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
      width: '500px',
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
    colorInput: {
      width: '60px',
      height: '40px',
      padding: '4px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer'
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
    submitButton: {
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
      color: t.error,
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Administrar Catálogos de Defectos</h1>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Main Layout */}
      <div style={styles.layout}>
        {/* Sidebar - Catalog Types */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Tipos de Catálogo</div>
          {catalogTypes.map(type => (
            <button
              key={type.id}
              style={{
                ...styles.typeButton,
                ...(selectedType?.id === type.id ? styles.typeButtonSelected : {})
              }}
              onClick={() => handleTypeSelect(type)}
            >
              <div style={{ fontWeight: '500' }}>{type.name}</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{type.code}</div>
            </button>
          ))}
        </div>

        {/* Main Content - Items */}
        <div style={styles.main}>
          {selectedType && (
            <>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
                {selectedType.name}
                <span style={{ fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                  ({filteredItems.length} items)
                </span>
              </h2>

              {/* Toolbar */}
              <div style={styles.toolbar}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    Mostrar inactivos
                  </label>
                </div>
                <button style={styles.addButton} onClick={openCreateModal}>
                  + Agregar Item
                </button>
              </div>

              {/* Table */}
              {loading ? (
                <div style={styles.emptyState}>Cargando...</div>
              ) : filteredItems.length === 0 ? (
                <div style={styles.emptyState}>
                  No hay items en este catálogo.
                  <br />
                  <button style={{ ...styles.addButton, marginTop: '16px' }} onClick={openCreateModal}>
                    + Crear primer item
                  </button>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Nombre</th>
                      {selectedType.code === 'SUB_PART' && <th style={styles.th}>Parent</th>}
                      {(selectedType.code === 'PRIORITY' || selectedType.code === 'RANK') && (
                        <th style={styles.th}>Color</th>
                      )}
                      <th style={styles.th}>Orden</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id} style={!item.isActive ? styles.inactiveRow : {}}>
                        <td style={styles.td}>
                          <code style={{ backgroundColor: '#F4F6F8', padding: '2px 6px', borderRadius: '4px' }}>
                            {item.code}
                          </code>
                        </td>
                        <td style={styles.td}>{item.name}</td>
                        {selectedType.code === 'SUB_PART' && (
                          <td style={styles.td}>{item.parentName || '-'}</td>
                        )}
                        {(selectedType.code === 'PRIORITY' || selectedType.code === 'RANK') && (
                          <td style={styles.td}>
                            {item.color ? (
                              <div style={{ ...styles.colorBadge, backgroundColor: item.color }} title={item.color} />
                            ) : '-'}
                          </td>
                        )}
                        <td style={styles.td}>{item.displayOrder}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2',
                            color: item.isActive ? '#166534' : '#991b1b'
                          }}>
                            {item.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.actionButton, ...styles.editButton }}
                            onClick={() => openEditModal(item)}
                          >
                            Editar
                          </button>
                          {item.isActive ? (
                            <button
                              style={{ ...styles.actionButton, ...styles.deleteButton }}
                              onClick={() => handleDelete(item)}
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              style={{ ...styles.actionButton, ...styles.reactivateButton }}
                              onClick={() => handleReactivate(item)}
                            >
                              Reactivar
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              style={{ ...styles.actionButton, backgroundColor: '#7f1d1d', color: 'white' }}
                              onClick={() => handleHardDelete(item)}
                              title="Eliminar permanentemente (solo admin)"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {modalMode === 'create' ? 'Nuevo Item' : 'Editar Item'} - {selectedType?.name}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Código * {modalMode === 'edit' && !isAdmin && <span style={{ fontSize: '11px', color: '#9ca3af' }}>(solo admin puede editar)</span>}</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  style={styles.input}
                  required
                  disabled={modalMode === 'edit' && !isAdmin}
                  placeholder="Ej: CLIP_MISSING"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  required
                  placeholder="Ej: Clip Missing"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.input}
                  placeholder="Descripción opcional"
                />
              </div>

              {selectedType?.code === 'SUB_PART' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Parent (MAIN ITEM)</label>
                  <select
                    value={formData.parentItemId || ''}
                    onChange={(e) => setFormData({ ...formData, parentItemId: e.target.value ? parseInt(e.target.value) : null })}
                    style={styles.select}
                  >
                    <option value="">Sin parent (general)</option>
                    {parentItems.map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedType?.code === 'PRIORITY' || selectedType?.code === 'RANK') && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="color"
                      value={formData.color || '#0072CE'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={{ ...styles.input, width: '120px' }}
                      placeholder="#hex"
                    />
                  </div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Orden de Visualización</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  style={{ ...styles.input, width: '100px' }}
                  min="0"
                />
              </div>

              <div style={styles.modalButtons}>
                <button type="button" style={styles.cancelButton} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitButton} disabled={loading}>
                  {loading ? 'Guardando...' : (modalMode === 'create' ? 'Crear' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectAdmin;
