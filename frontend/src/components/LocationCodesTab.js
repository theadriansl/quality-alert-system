import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LocationCodesTab = ({ theme: t }) => {
  const { t: tr, language, changeLanguage } = useLanguage();
  const [locations, setLocations] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    stationId: '',
    locationType: 'REPAIR',
    description: ''
  });

  // Filter state
  const [filterType, setFilterType] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);

      const response = await fetch(`${API_BASE_URL}/location-codes?${params}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (err) {
      setError('Error cargando ubicaciones');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const loadStations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/station-config/stations`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // Cargar todas las estaciones (REPAIR, RELEASE, MRB)
        const filtered = (data.stations || []).filter(s =>
          ['REPAIR', 'RELEASE', 'MRB'].includes(s.stationType)
        );
        setStations(filtered);
      }
    } catch (err) {
      console.error('Error loading stations:', err);
    }
  };

  // Filtrar estaciones según tipo de ubicación seleccionado
  const getFilteredStations = () => {
    if (formData.locationType === 'MRB') {
      return stations.filter(s => s.stationType === 'MRB');
    } else if (['REPAIR', 'RELEASE'].includes(formData.locationType)) {
      return stations.filter(s => ['REPAIR', 'RELEASE'].includes(s.stationType));
    }
    return [];
  };

  useEffect(() => {
    loadLocations();
    loadStations();
  }, [loadLocations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.code.trim()) {
      setError('El codigo es requerido');
      return;
    }

    try {
      const url = editingLocation
        ? `${API_BASE_URL}/location-codes/${editingLocation.id}`
        : `${API_BASE_URL}/location-codes`;

      const response = await fetch(url, {
        method: editingLocation ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          stationId: formData.stationId || null,
          locationType: formData.locationType,
          description: formData.description.trim() || null
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(editingLocation ? 'Ubicacion actualizada' : 'Ubicacion creada');
        setShowModal(false);
        resetForm();
        loadLocations();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Error guardando ubicacion');
      }
    } catch (err) {
      setError('Error de conexion');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar esta ubicacion?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/location-codes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Ubicacion eliminada');
        loadLocations();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error eliminando ubicacion');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      code: location.code,
      stationId: location.stationId || '',
      locationType: location.locationType,
      description: location.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      code: '',
      stationId: '',
      locationType: 'REPAIR',
      description: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const locationTypes = [
    { value: 'REPAIR', label: 'Reparacion', color: '#3B82F6', icon: '🔧' },
    { value: 'RELEASE', label: 'Liberacion', color: '#10B981', icon: '✅' },
    { value: 'BUFFER', label: 'Buffer', color: '#F59E0B', icon: '📦' },
    { value: 'MRB', label: 'MRB', color: '#EF4444', icon: '🔴' }
  ];

  const getTypeStyle = (type) => {
    const found = locationTypes.find(t => t.value === type);
    return found ? { backgroundColor: found.color + '20', color: found.color, border: `1px solid ${found.color}40` } : {};
  };

  const styles = {
    container: { padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { fontSize: '18px', fontWeight: '600', color: t.textPrimary },
    filterBar: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' },
    select: { padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.borderColor}`, backgroundColor: t.bgCard, color: t.textPrimary, fontSize: '14px' },
    btn: { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
    btnPrimary: { backgroundColor: t.accent, color: '#fff' },
    btnDanger: { backgroundColor: '#EF4444', color: '#fff' },
    btnSecondary: { backgroundColor: t.bgPanel, color: t.textPrimary, border: `1px solid ${t.borderColor}` },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: t.bgCard, borderRadius: '8px', overflow: 'hidden' },
    th: { padding: '12px', textAlign: 'left', backgroundColor: t.bgPanel, color: t.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
    td: { padding: '12px', borderTop: `1px solid ${t.borderColor}`, color: t.textPrimary },
    badge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' },
    wipBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: '#3B82F620', color: '#3B82F6' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalTitle: { fontSize: '18px', fontWeight: '600', color: t.textPrimary, marginBottom: '20px' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', color: t.textPrimary, marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${t.borderColor}`, backgroundColor: t.bgPanel, color: t.textPrimary, fontSize: '14px', boxSizing: 'border-box' },
    radioGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${t.borderColor}`, transition: 'all 0.2s' },
    radioSelected: { borderColor: t.accent, backgroundColor: t.accent + '10' },
    alert: { padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
    alertError: { backgroundColor: '#FEE2E2', color: '#DC2626' },
    alertSuccess: { backgroundColor: '#D1FAE5', color: '#059669' },
    actions: { display: 'flex', gap: '8px' },
    emptyState: { textAlign: 'center', padding: '40px', color: t.textMuted }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Codigos de Ubicacion</div>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={openNewModal}>
          + Nueva Ubicacion
        </button>
      </div>

      {/* Alerts */}
      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {success && <div style={{ ...styles.alert, ...styles.alertSuccess }}>{success}</div>}

      {/* Filters */}
      <div style={styles.filterBar}>
        <span style={{ color: t.textMuted, fontSize: '14px' }}>Filtrar por tipo:</span>
        <select
          style={styles.select}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Todos</option>
          {locationTypes.map(type => (
            <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.emptyState}>Cargando...</div>
      ) : locations.length === 0 ? (
        <div style={styles.emptyState}>
          No hay ubicaciones configuradas.
          <br />
          <button style={{ ...styles.btn, ...styles.btnPrimary, marginTop: '16px' }} onClick={openNewModal}>
            Crear primera ubicacion
          </button>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Codigo</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Estacion</th>
              <th style={styles.th}>Descripcion</th>
              <th style={styles.th}>WIP</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr key={loc.id}>
                <td style={styles.td}>
                  <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>{loc.code}</strong>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...getTypeStyle(loc.locationType) }}>
                    {locationTypes.find(t => t.value === loc.locationType)?.icon} {loc.locationType}
                  </span>
                </td>
                <td style={styles.td}>{loc.stationName || '-'}</td>
                <td style={styles.td}>{loc.description || '-'}</td>
                <td style={styles.td}>
                  {loc.wipCount > 0 ? (
                    <span style={styles.wipBadge}>{loc.wipCount} piezas</span>
                  ) : (
                    <span style={{ color: t.textMuted }}>0</span>
                  )}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: loc.isActive ? '#D1FAE5' : '#FEE2E2',
                    color: loc.isActive ? '#059669' : '#DC2626'
                  }}>
                    {loc.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.btn, ...styles.btnSecondary, padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleEdit(loc)}
                    >
                      Editar
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleDelete(loc.id)}
                      disabled={loc.wipCount > 0}
                      title={loc.wipCount > 0 ? 'No se puede eliminar con piezas asignadas' : ''}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              {editingLocation ? 'Editar Ubicacion' : 'Nueva Ubicacion'}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Codigo *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: HOSP-001, REL-A1"
                  autoFocus
                />
                <small style={{ color: t.textMuted, fontSize: '12px' }}>
                  Codigo unico para escaneo (se convierte a mayusculas)
                </small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Ubicacion *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {locationTypes.map(type => (
                    <label
                      key={type.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: formData.locationType === type.value ? t.accent + '15' : 'transparent',
                        border: `1px solid ${formData.locationType === type.value ? t.accent : t.borderColor}`,
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="locationType"
                        value={type.value}
                        checked={formData.locationType === type.value}
                        onChange={(e) => setFormData({ ...formData, locationType: e.target.value, stationId: '' })}
                        style={{ accentColor: t.accent }}
                      />
                      <span style={{ fontWeight: formData.locationType === type.value ? '600' : '400' }}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
                <small style={{ color: t.textMuted, fontSize: '12px', marginTop: '8px', display: 'block' }}>
                  Reparación/Liberación: Requieren estación de Hospital asociada
                </small>
              </div>

              {/* Estación Asociada - Solo para REPAIR, RELEASE y MRB */}
              {['REPAIR', 'RELEASE', 'MRB'].includes(formData.locationType) && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estacion Asociada *</label>
                  <select
                    style={styles.input}
                    value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar estacion...</option>
                    {getFilteredStations().map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: t.textMuted, fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {formData.locationType === 'MRB'
                      ? 'Estación MRB donde se realizará la inspección'
                      : `Estación de Hospital donde se realizará la ${formData.locationType === 'REPAIR' ? 'reparación' : 'liberación'}`
                    }
                  </small>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Descripcion</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Hospital Linea 1 - Reparacion"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary }}>
                  {editingLocation ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationCodesTab;
