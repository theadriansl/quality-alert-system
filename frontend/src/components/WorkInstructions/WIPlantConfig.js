import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import wiPlantConfigService from '../../services/wiPlantConfigService';
import { useTheme } from '../../context/ThemeContext';

const WIPlantConfig = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const [plants, setPlants] = useState([]);
  const [expandedPlant, setExpandedPlant] = useState(null);
  const [expandedArea, setExpandedArea] = useState(null);
  const [expandedLine, setExpandedLine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stationTypes, setStationTypes] = useState([]);

  // Modal states
  const [modal, setModal] = useState({ type: null, data: null, parentId: null });

  // Form states
  const [formData, setFormData] = useState({});

  const loadPlants = useCallback(async () => {
    try {
      const response = await wiPlantConfigService.getPlants();
      if (response.success) {
        setPlants(response.plants);
      }
    } catch (error) {
      console.error('Error loading plants:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStationTypes = useCallback(async () => {
    try {
      const response = await wiPlantConfigService.getStationTypes();
      if (response.success) {
        setStationTypes(response.types);
      }
    } catch (error) {
      console.error('Error loading station types:', error);
    }
  }, []);

  useEffect(() => {
    loadPlants();
    loadStationTypes();
  }, [loadPlants, loadStationTypes]);

  const loadPlantDetails = async (plantId) => {
    try {
      const response = await wiPlantConfigService.getPlant(plantId);
      if (response.success) {
        setPlants(prev => prev.map(p =>
          p.id === plantId ? { ...p, ...response.plant, loaded: true } : p
        ));
      }
    } catch (error) {
      console.error('Error loading plant details:', error);
    }
  };

  const togglePlant = async (plantId) => {
    if (expandedPlant === plantId) {
      setExpandedPlant(null);
      setExpandedArea(null);
      setExpandedLine(null);
    } else {
      setExpandedPlant(plantId);
      setExpandedArea(null);
      setExpandedLine(null);
      const plant = plants.find(p => p.id === plantId);
      if (!plant?.loaded) {
        await loadPlantDetails(plantId);
      }
    }
  };

  const toggleArea = (areaId) => {
    if (expandedArea === areaId) {
      setExpandedArea(null);
      setExpandedLine(null);
    } else {
      setExpandedArea(areaId);
      setExpandedLine(null);
    }
  };

  const toggleLine = (lineId) => {
    setExpandedLine(expandedLine === lineId ? null : lineId);
  };

  // Modal handlers
  const openModal = (type, data = null, parentId = null) => {
    let initialData = {};

    switch (type) {
      case 'plant':
        initialData = data || { name: '', code: '', description: '', address: '' };
        break;
      case 'area':
        initialData = data || { name: '', code: '', description: '' };
        break;
      case 'line':
        initialData = data || { name: '', code: '', description: '', capacityPerHour: '' };
        break;
      case 'station':
        initialData = data || { name: '', code: '', description: '', stationType: 'assembly', cycleTimeSeconds: '' };
        break;
      default:
        break;
    }

    setFormData(initialData);
    setModal({ type, data, parentId });
  };

  const closeModal = () => {
    setModal({ type: null, data: null, parentId: null });
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { type, data, parentId } = modal;

    try {
      let response;

      switch (type) {
        case 'plant':
          if (data?.id) {
            response = await wiPlantConfigService.updatePlant(data.id, formData);
          } else {
            response = await wiPlantConfigService.createPlant(formData);
          }
          break;
        case 'area':
          if (data?.id) {
            response = await wiPlantConfigService.updateArea(data.id, formData);
          } else {
            response = await wiPlantConfigService.createArea(parentId, formData);
          }
          break;
        case 'line':
          if (data?.id) {
            response = await wiPlantConfigService.updateLine(data.id, formData);
          } else {
            response = await wiPlantConfigService.createLine(parentId, formData);
          }
          break;
        case 'station':
          if (data?.id) {
            response = await wiPlantConfigService.updateStation(data.id, formData);
          } else {
            response = await wiPlantConfigService.createStation(parentId, formData);
          }
          break;
        default:
          return;
      }

      if (response?.success) {
        closeModal();
        // Reload data
        if (type === 'plant') {
          loadPlants();
        } else if (expandedPlant) {
          loadPlantDetails(expandedPlant);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar: ' + error.message);
    }
  };

  const handleDelete = async (type, id, name) => {
    if (!window.confirm(`Eliminar ${name}? Esta accion no se puede deshacer.`)) {
      return;
    }

    try {
      let response;

      switch (type) {
        case 'plant':
          response = await wiPlantConfigService.deletePlant(id);
          break;
        case 'area':
          response = await wiPlantConfigService.deleteArea(id);
          break;
        case 'line':
          response = await wiPlantConfigService.deleteLine(id);
          break;
        case 'station':
          response = await wiPlantConfigService.deleteStation(id);
          break;
        default:
          return;
      }

      if (response?.success) {
        if (type === 'plant') {
          loadPlants();
        } else if (expandedPlant) {
          loadPlantDetails(expandedPlant);
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar: ' + error.message);
    }
  };

  const getStationTypeLabel = (value) => {
    const type = stationTypes.find(st => st.value === value);
    return type?.label || value;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '32px', color: t.textMuted }}>Cargando configuracion...</div>
      </div>
    );
  }

  const plant = expandedPlant ? plants.find(p => p.id === expandedPlant) : null;
  const area = expandedArea && plant?.areas ? plant.areas.find(a => a.id === expandedArea) : null;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/work-instructions')}
            style={{
              background: 'none',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px 8px'
            }}
          >
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: t.text }}>Configuracion de Plantas</h1>
        </div>
        <button
          onClick={() => openModal('plant')}
          style={{
            backgroundColor: t.primary,
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Nueva Planta
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: t.textMuted, marginBottom: '16px' }}>
        <span style={{ fontWeight: '500' }}>Jerarquia:</span>
        <span style={{ backgroundColor: t.bgPanel, color: t.primary, padding: '4px 8px', borderRadius: '4px' }}>Planta</span>
        <span>→</span>
        <span style={{ backgroundColor: t.bgPanel, color: t.accent, padding: '4px 8px', borderRadius: '4px' }}>Area</span>
        <span>→</span>
        <span style={{ backgroundColor: t.bgPanel, color: t.success, padding: '4px 8px', borderRadius: '4px' }}>Linea</span>
        <span>→</span>
        <span style={{ backgroundColor: t.bgPanel, color: t.warning, padding: '4px 8px', borderRadius: '4px' }}>Estacion</span>
      </div>

      {/* Plants List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', backgroundColor: t.bgCard, borderRadius: '8px', border: `2px dashed ${t.border}` }}>
            <p style={{ color: t.textMuted }}>No hay plantas configuradas</p>
            <button
              onClick={() => openModal('plant')}
              style={{ marginTop: '8px', color: t.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              + Crear primera planta
            </button>
          </div>
        ) : (
          plants.map(p => (
            <div key={p.id} style={{ border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
              {/* Plant Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  cursor: 'pointer',
                  backgroundColor: expandedPlant === p.id ? t.bgPanel : t.bgCard
                }}
                onClick={() => togglePlant(p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ transform: expandedPlant === p.id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    ▶
                  </span>
                  <div>
                    <div style={{ fontWeight: '600', color: t.text }}>{p.name}</div>
                    <div style={{ fontSize: '14px', color: t.textMuted }}>
                      {p.code && <span style={{ marginRight: '12px' }}>Codigo: {p.code}</span>}
                      <span style={{ color: t.primary }}>{p.areaCount || 0} areas</span>
                      <span style={{ margin: '0 8px' }}>|</span>
                      <span style={{ color: t.success }}>{p.lineCount || 0} lineas</span>
                      <span style={{ margin: '0 8px' }}>|</span>
                      <span style={{ color: t.warning }}>{p.stationCount || 0} estaciones</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openModal('plant', p)}
                    style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete('plant', p.id, p.name)}
                    style={{ color: t.error, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Plant Content - Areas */}
              {expandedPlant === p.id && plant && (
                <div style={{ borderTop: `1px solid ${t.border}`, padding: '16px', backgroundColor: t.bgCard }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontWeight: '500', color: t.accent }}>Areas</h3>
                    <button
                      onClick={() => openModal('area', null, p.id)}
                      style={{
                        fontSize: '14px',
                        backgroundColor: t.bgPanel,
                        color: t.accent,
                        border: `1px solid ${t.border}`,
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      + Agregar Area
                    </button>
                  </div>

                  {(!plant.areas || plant.areas.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: t.textMuted, fontSize: '14px' }}>
                      No hay areas en esta planta
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                      {plant.areas.map(a => (
                        <div key={a.id} style={{ border: `1px solid ${t.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                          {/* Area Header */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px',
                              cursor: 'pointer',
                              backgroundColor: expandedArea === a.id ? t.bgPanel : t.bgCard
                            }}
                            onClick={() => toggleArea(a.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', transform: expandedArea === a.id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                                ▶
                              </span>
                              <span style={{ fontWeight: '500', color: t.text }}>{a.name}</span>
                              {a.code && <span style={{ fontSize: '12px', color: t.textMuted }}>({a.code})</span>}
                              <span style={{ fontSize: '12px', color: t.textDim, marginLeft: '8px' }}>
                                {a.lines?.length || 0} lineas
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => openModal('area', a, p.id)}
                                style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete('area', a.id, a.name)}
                                style={{ color: t.error, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>

                          {/* Area Content - Lines */}
                          {expandedArea === a.id && (
                            <div style={{ borderTop: `1px solid ${t.border}`, padding: '12px', backgroundColor: t.bgCard }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: t.success }}>Lineas</h4>
                                <button
                                  onClick={() => openModal('line', null, a.id)}
                                  style={{
                                    fontSize: '12px',
                                    backgroundColor: t.bgPanel,
                                    color: t.success,
                                    border: `1px solid ${t.border}`,
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  + Agregar Linea
                                </button>
                              </div>

                              {(!a.lines || a.lines.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '12px', color: t.textMuted, fontSize: '12px' }}>
                                  No hay lineas en esta area
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                                  {a.lines.map(l => (
                                    <div key={l.id} style={{ border: `1px solid ${t.border}`, borderRadius: '4px', overflow: 'hidden' }}>
                                      {/* Line Header */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '8px',
                                          cursor: 'pointer',
                                          backgroundColor: expandedLine === l.id ? t.bgPanel : t.bgCard
                                        }}
                                        onClick={() => toggleLine(l.id)}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontSize: '10px', transform: expandedLine === l.id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                                            ▶
                                          </span>
                                          <span style={{ fontWeight: '500', fontSize: '14px', color: t.text }}>{l.name}</span>
                                          {l.code && <span style={{ fontSize: '12px', color: t.textMuted }}>({l.code})</span>}
                                          {l.capacityPerHour && (
                                            <span style={{ fontSize: '12px', backgroundColor: t.bgPanel, color: t.success, padding: '2px 4px', borderRadius: '4px' }}>
                                              {l.capacityPerHour}/hr
                                            </span>
                                          )}
                                          <span style={{ fontSize: '12px', color: t.textDim }}>
                                            {l.stations?.length || 0} estaciones
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                          <button
                                            onClick={() => openModal('line', l, a.id)}
                                            style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px' }}
                                          >
                                            Editar
                                          </button>
                                          <button
                                            onClick={() => handleDelete('line', l.id, l.name)}
                                            style={{ color: t.error, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px' }}
                                          >
                                            Eliminar
                                          </button>
                                        </div>
                                      </div>

                                      {/* Line Content - Stations */}
                                      {expandedLine === l.id && (
                                        <div style={{ borderTop: `1px solid ${t.border}`, padding: '8px', backgroundColor: t.bgCard }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <h5 style={{ margin: 0, fontSize: '12px', fontWeight: '500', color: t.warning }}>Estaciones</h5>
                                            <button
                                              onClick={() => openModal('station', null, l.id)}
                                              style={{
                                                fontSize: '12px',
                                                backgroundColor: t.bgPanel,
                                                color: t.warning,
                                                border: `1px solid ${t.border}`,
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              + Agregar Estacion
                                            </button>
                                          </div>

                                          {(!l.stations || l.stations.length === 0) ? (
                                            <div style={{ textAlign: 'center', padding: '8px', color: t.textMuted, fontSize: '12px' }}>
                                              No hay estaciones en esta linea
                                            </div>
                                          ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', marginLeft: '16px' }}>
                                              {l.stations.map(s => (
                                                <div
                                                  key={s.id}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px',
                                                    backgroundColor: t.bgPanel,
                                                    border: `1px solid ${t.border}`,
                                                    borderRadius: '4px'
                                                  }}
                                                >
                                                  <div>
                                                    <div style={{ fontWeight: '500', fontSize: '14px', color: t.text }}>{s.name}</div>
                                                    <div style={{ fontSize: '12px', color: t.textMuted }}>
                                                      {s.code && <span style={{ marginRight: '8px' }}>{s.code}</span>}
                                                      <span style={{ backgroundColor: t.bgCard, padding: '2px 4px', borderRadius: '2px' }}>
                                                        {getStationTypeLabel(s.stationType)}
                                                      </span>
                                                      {s.cycleTimeSeconds && (
                                                        <span style={{ marginLeft: '8px' }}>{s.cycleTimeSeconds}s</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button
                                                      onClick={() => openModal('station', s, l.id)}
                                                      style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px' }}
                                                    >
                                                      Editar
                                                    </button>
                                                    <button
                                                      onClick={() => handleDelete('station', s.id, s.name)}
                                                      style={{ color: t.error, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px' }}
                                                    >
                                                      Eliminar
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modal.type && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '8px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '700', color: t.text }}>
              {modal.data?.id ? 'Editar' : 'Nueva'}{' '}
              {modal.type === 'plant' && 'Planta'}
              {modal.type === 'area' && 'Area'}
              {modal.type === 'line' && 'Linea'}
              {modal.type === 'station' && 'Estacion'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Nombre *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgCard,
                    color: t.text,
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Codigo</label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgCard,
                    color: t.text,
                    fontSize: '14px'
                  }}
                  placeholder="Ej: PLT-001"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Descripcion</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgCard,
                    color: t.text,
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  rows="2"
                />
              </div>

              {modal.type === 'plant' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Direccion</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgCard,
                      color: t.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}

              {modal.type === 'line' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Capacidad por Hora</label>
                  <input
                    type="number"
                    value={formData.capacityPerHour || ''}
                    onChange={e => setFormData(prev => ({ ...prev, capacityPerHour: e.target.value ? parseInt(e.target.value) : null }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgCard,
                      color: t.text,
                      fontSize: '14px'
                    }}
                    placeholder="Ej: 100"
                  />
                </div>
              )}

              {modal.type === 'station' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Tipo de Estacion</label>
                    <select
                      value={formData.stationType || 'assembly'}
                      onChange={e => setFormData(prev => ({ ...prev, stationType: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${t.border}`,
                        backgroundColor: t.bgCard,
                        color: t.text,
                        fontSize: '14px'
                      }}
                    >
                      {stationTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: t.text, marginBottom: '4px' }}>Tiempo de Ciclo (segundos)</label>
                    <input
                      type="number"
                      value={formData.cycleTimeSeconds || ''}
                      onChange={e => setFormData(prev => ({ ...prev, cycleTimeSeconds: e.target.value ? parseInt(e.target.value) : null }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${t.border}`,
                        backgroundColor: t.bgCard,
                        color: t.text,
                        fontSize: '14px'
                      }}
                      placeholder="Ej: 60"
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgCard,
                    color: t.text,
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: t.primary,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {modal.data?.id ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WIPlantConfig;
