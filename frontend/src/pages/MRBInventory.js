/**
 * MRBInventory.js
 * Vista de inventario MRB con tabs por disposición final + paquetes pendientes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import MRBTransferPackages from './MRBTransferPackages';
import { getPendingTransferPackages } from '../services/repairService';

const API_URL = 'http://localhost:5000';

const COLORS = {
  green: '#16a34a',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#0072CE',
  gray: '#6b7280',
  orange: '#ea580c',
  purple: '#7c3aed'
};

// Colores por código de disposición
const DISPOSITION_COLORS = {
  'OK': { bg: '#d1fae5', color: '#16a34a' },
  'USE_AS_IS': { bg: '#d1fae5', color: '#16a34a' },
  'REWORK': { bg: '#fef3c7', color: '#f59e0b' },
  'SCRAP': { bg: '#fee2e2', color: '#ef4444' },
  'HOLD': { bg: '#e0e7ff', color: '#6366f1' },
  'RETURN_SUPPLIER': { bg: '#fae8ff', color: '#a855f7' }
};

const DISPOSITION_LABELS = {
  'OK': 'OK',
  'USE_AS_IS': 'Usar',
  'REWORK': 'Retrabajo OK',
  'SCRAP': 'Scrap',
  'HOLD': 'Hold',
  'RETURN_SUPPLIER': 'Dev. Prov.'
};

const MRBInventory = () => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState({ tabPaquetes: 0, tabCuarentena: 0, tabOk: 0, tabScrap: 0 });

  // Tab activo: PAQUETES, CUARENTENA, OK, SCRAP
  const [activeTab, setActiveTab] = useState('PAQUETES');
  const [filterCampaign, setFilterCampaign] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selección para paquete de salida
  const [selectedSerials, setSelectedSerials] = useState(new Set());
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [exitNotes, setExitNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');

      // Cargar inventario y paquetes pendientes en paralelo
      const [inventoryRes, packagesRes] = await Promise.all([
        fetch(`${API_URL}/mrb/inventory`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        getPendingTransferPackages('MRB')
      ]);

      if (inventoryRes.success) {
        setInventory(inventoryRes.inventory || []);
        setCampaigns(inventoryRes.campaigns || []);

        // Conteo de paquetes desde el endpoint real
        const pkgCount = packagesRes.packages?.length || 0;

        // Combinar summary con conteo real de paquetes
        setSummary({
          ...inventoryRes.summary,
          tabPaquetes: pkgCount
        });

        // Si no hay paquetes y hay items en otros tabs, cambiar
        if (pkgCount === 0 && (inventoryRes.summary?.tabCuarentena || 0) > 0) {
          setActiveTab('CUARENTENA');
        }
      } else {
        setError(inventoryRes.message || 'Error al cargar inventario');
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cargar ubicaciones de buffer para modal de salida
  const loadLocations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/location-codes?type=BUFFER`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  }, []);

  // Toggle selección de serial
  const toggleSerial = (serialNumber) => {
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (next.has(serialNumber)) {
        next.delete(serialNumber);
      } else {
        next.add(serialNumber);
      }
      return next;
    });
  };

  // Seleccionar/deseleccionar todos los visibles
  const toggleAll = () => {
    if (selectedSerials.size === filteredInventory.length) {
      setSelectedSerials(new Set());
    } else {
      setSelectedSerials(new Set(filteredInventory.map(i => i.serialNumber)));
    }
  };

  // Abrir modal de salida
  const openExitModal = () => {
    loadLocations();
    setShowExitModal(true);
  };

  // Procesar salida de MRB
  const handleExit = async () => {
    if (selectedSerials.size === 0) return;
    if (!selectedLocation) {
      setError('Selecciona una ubicación de destino');
      return;
    }

    setExitLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/exit-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          serialNumbers: Array.from(selectedSerials),
          destinationLocationId: parseInt(selectedLocation),
          notes: exitNotes,
          exitType: activeTab // OK o SCRAP
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowExitModal(false);
        setSelectedSerials(new Set());
        setSelectedLocation('');
        setExitNotes('');
        loadData();
      } else {
        setError(data.message || 'Error al procesar salida');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setExitLoading(false);
    }
  };

  // Limpiar selección al cambiar de tab
  useEffect(() => {
    setSelectedSerials(new Set());
  }, [activeTab]);

  // Filtrar inventario por tab y otros filtros
  const filteredInventory = inventory.filter(item => {
    // Filtro por tab (disposición final)
    if (item.finalTab !== activeTab) return false;

    // Filtro por campaña
    if (filterCampaign !== 'ALL') {
      const campId = parseInt(filterCampaign);
      if (!item.campaignStatus[campId]?.affected) return false;
    }

    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match =
        (item.serialNumber || '').toLowerCase().includes(term) ||
        (item.partNumber || '').toLowerCase().includes(term) ||
        (item.lotNumber || '').toLowerCase().includes(term);
      if (!match) return false;
    }

    return true;
  });

  // Renderizar celda de estado de campaña con colores según disposición
  const renderCampaignCell = (item, campaignId) => {
    const status = item.campaignStatus[campaignId];

    if (!status?.affected) {
      return <span style={{ color: t.textMuted, fontSize: '11px' }}>—</span>;
    }

    if (status.inspected) {
      const dispColor = DISPOSITION_COLORS[status.result] || { bg: '#f3f4f6', color: '#6b7280' };
      const label = DISPOSITION_LABELS[status.result] || status.result;
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          backgroundColor: dispColor.bg,
          color: dispColor.color
        }}>
          {label}
        </span>
      );
    }

    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: COLORS.yellow + '20',
        color: COLORS.yellow
      }}>
        PEND
      </span>
    );
  };

  // Formatear horas
  const formatHours = (hours) => {
    if (!hours) return '—';
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const h = Math.round(hours % 24);
    return `${days}d ${h}h`;
  };

  // Color por antigüedad
  const getAgingColor = (hours) => {
    if (!hours) return COLORS.gray;
    if (hours < 24) return COLORS.green;
    if (hours < 72) return COLORS.yellow;
    return COLORS.red;
  };

  // Tab style helper
  const getTabStyle = (tab, color) => ({
    flex: 1,
    backgroundColor: t.bgCard,
    border: `2px solid ${activeTab === tab ? color : t.border}`,
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    transform: activeTab === tab ? 'scale(1.02)' : 'scale(1)',
    boxShadow: activeTab === tab ? `0 4px 12px ${color}30` : 'none'
  });

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: t.text }}>
            Inventario MRB
          </h1>
          <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
            Disposición por resultado de inspección de campañas
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/mrb-dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              color: t.text,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            MRB Dashboard
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: COLORS.blue,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px'
            }}
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: COLORS.red + '20', border: `1px solid ${COLORS.red}`, borderRadius: '8px', color: COLORS.red, marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tabs - Disposición Final */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div onClick={() => setActiveTab('PAQUETES')} style={getTabStyle('PAQUETES', COLORS.blue)}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Paquetes
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: COLORS.blue }}>{summary.tabPaquetes || 0}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>Pendientes de recibir</div>
        </div>
        <div onClick={() => setActiveTab('CUARENTENA')} style={getTabStyle('CUARENTENA', COLORS.yellow)}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Cuarentena
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: COLORS.yellow }}>{summary.tabCuarentena || 0}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>Pendientes / Hold</div>
        </div>
        <div onClick={() => setActiveTab('OK')} style={getTabStyle('OK', COLORS.green)}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
            OK
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: COLORS.green }}>{summary.tabOk || 0}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>OK / Retrabajo OK / Usar</div>
        </div>
        <div onClick={() => setActiveTab('SCRAP')} style={getTabStyle('SCRAP', COLORS.red)}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Scrap
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: COLORS.red }}>{summary.tabScrap || 0}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>Disposición Scrap</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar serial, parte, lote..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: '6px',
            color: t.text,
            fontSize: '13px',
            minWidth: '250px'
          }}
        />
        {activeTab !== 'PAQUETES' && (
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              color: t.text,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Todas las campañas</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.campaignNumber}</option>
            ))}
          </select>
        )}
        {/* Botón de salida para tabs OK y SCRAP */}
        {(activeTab === 'OK' || activeTab === 'SCRAP') && selectedSerials.size > 0 && (
          <button
            onClick={openExitModal}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'OK' ? COLORS.green : COLORS.red,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Crear Paquete Salida ({selectedSerials.size})
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: t.textMuted, alignSelf: 'center' }}>
          {activeTab === 'PAQUETES'
            ? `${summary.tabPaquetes || 0} paquetes pendientes`
            : `Mostrando ${filteredInventory.length} de ${inventory.filter(i => i.finalTab === activeTab).length} en ${activeTab}`
          }
        </div>
      </div>

      {/* Tab PAQUETES - Usa componente existente */}
      {activeTab === 'PAQUETES' && (
        <MRBTransferPackages embedded={true} onPackageReceived={loadData} />
      )}

      {/* Tabla de inventario para otros tabs */}
      {activeTab !== 'PAQUETES' && (
        <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: t.bgPanel }}>
                {/* Checkbox para selección - solo en tabs OK y SCRAP */}
                {(activeTab === 'OK' || activeTab === 'SCRAP') && (
                  <th style={{ padding: '12px 8px', textAlign: 'center', backgroundColor: t.bgPanel, zIndex: 2, minWidth: '40px', borderBottom: `2px solid ${t.border}` }}>
                    <input
                      type="checkbox"
                      checked={filteredInventory.length > 0 && selectedSerials.size === filteredInventory.length}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', position: 'sticky', left: (activeTab === 'OK' || activeTab === 'SCRAP') ? '40px' : 0, backgroundColor: t.bgPanel, zIndex: 2, minWidth: '180px', borderBottom: `2px solid ${t.border}` }}>Serial</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', position: 'sticky', left: '180px', backgroundColor: t.bgPanel, zIndex: 2, minWidth: '200px', borderBottom: `2px solid ${t.border}` }}>Parte</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', position: 'sticky', left: '380px', backgroundColor: t.bgPanel, zIndex: 2, minWidth: '120px', borderBottom: `2px solid ${t.border}` }}>Defecto</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', position: 'sticky', left: '500px', backgroundColor: t.bgPanel, zIndex: 2, minWidth: '90px', borderBottom: `2px solid ${t.border}` }}>Ubicación</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', position: 'sticky', left: '590px', backgroundColor: t.bgPanel, zIndex: 2, minWidth: '70px', borderBottom: `2px solid ${t.border}`, boxShadow: '2px 0 4px rgba(0,0,0,0.1)' }}>Tiempo</th>
                {campaigns.map(c => (
                  <th key={c.id} style={{ padding: '12px 16px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', minWidth: '100px', borderBottom: `2px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                    {c.campaignNumber}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={(activeTab === 'OK' || activeTab === 'SCRAP' ? 6 : 5) + campaigns.length} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                    Cargando...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={(activeTab === 'OK' || activeTab === 'SCRAP' ? 6 : 5) + campaigns.length} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                    No hay material en {activeTab === 'CUARENTENA' ? 'cuarentena' : activeTab === 'OK' ? 'OK' : 'scrap'}
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item, i) => {
                  const rowBg = i % 2 === 0 ? t.bgCard : t.bgPanel;
                  const isSelected = selectedSerials.has(item.serialNumber);
                  return (
                    <tr key={item.serialNumber || item.defectId} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: isSelected ? (activeTab === 'OK' ? '#d1fae520' : '#fee2e220') : rowBg }}>
                      {/* Checkbox de selección */}
                      {(activeTab === 'OK' || activeTab === 'SCRAP') && (
                        <td style={{ padding: '12px 8px', textAlign: 'center', backgroundColor: isSelected ? (activeTab === 'OK' ? '#d1fae520' : '#fee2e220') : rowBg, minWidth: '40px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSerial(item.serialNumber)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: t.text, position: 'sticky', left: (activeTab === 'OK' || activeTab === 'SCRAP') ? '40px' : 0, backgroundColor: isSelected ? (activeTab === 'OK' ? '#d1fae520' : '#fee2e220') : rowBg, zIndex: 1, minWidth: '180px' }}>
                        {item.serialNumber || item.entryNumber}
                        {item.lotNumber && (
                          <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '400', marginTop: '2px' }}>
                            Lote: {item.lotNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: t.text, position: 'sticky', left: '180px', backgroundColor: rowBg, zIndex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: '500' }}>{item.partNumber}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{item.partName}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: t.text, position: 'sticky', left: '380px', backgroundColor: rowBg, zIndex: 1, minWidth: '120px' }}>
                        <span style={{
                          padding: '3px 10px',
                          backgroundColor: t.bgPanel,
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {item.defectTypeCode || item.defectTypeName || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: t.textMuted, fontSize: '12px', position: 'sticky', left: '500px', backgroundColor: rowBg, zIndex: 1, minWidth: '90px' }}>
                        {item.locationCode || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', position: 'sticky', left: '590px', backgroundColor: rowBg, zIndex: 1, minWidth: '70px', boxShadow: '2px 0 4px rgba(0,0,0,0.1)' }}>
                        <span style={{ color: getAgingColor(item.hoursInMrb), fontWeight: '600' }}>
                          {formatHours(item.hoursInMrb)}
                        </span>
                      </td>
                      {campaigns.map(c => (
                        <td key={c.id} style={{ padding: '12px 16px', textAlign: 'center', minWidth: '100px' }}>
                          {renderCampaignCell(item, c.id)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda - Solo para tabs de inventario */}
      {activeTab !== 'PAQUETES' && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '20px', fontSize: '12px', color: t.textMuted, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', ...DISPOSITION_COLORS['OK'], fontWeight: '600', fontSize: '11px' }}>OK</span>
            <span>Inspeccionado OK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', ...DISPOSITION_COLORS['REWORK'], fontWeight: '600', fontSize: '11px' }}>Retrabajo OK</span>
            <span>Retrabajado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', ...DISPOSITION_COLORS['USE_AS_IS'], fontWeight: '600', fontSize: '11px' }}>Usar</span>
            <span>Usar como está</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', ...DISPOSITION_COLORS['SCRAP'], fontWeight: '600', fontSize: '11px' }}>Scrap</span>
            <span>Scrap</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', ...DISPOSITION_COLORS['HOLD'], fontWeight: '600', fontSize: '11px' }}>Hold</span>
            <span>En espera</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', ...DISPOSITION_COLORS['RETURN_SUPPLIER'], fontWeight: '600', fontSize: '11px' }}>Dev. Prov.</span>
            <span>Devolver a proveedor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: COLORS.yellow + '20', color: COLORS.yellow, fontWeight: '600', fontSize: '11px' }}>PEND</span>
            <span>Pendiente de inspección</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: t.textMuted }}>—</span>
            <span>No aplica a campaña</span>
          </div>
        </div>
      )}

      {/* Modal de Paquete de Salida */}
      {showExitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px',
            width: '500px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: t.text }}>
              Paquete de Salida MRB - {activeTab}
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '8px' }}>
                Seriales seleccionados: <strong style={{ color: t.text }}>{selectedSerials.size}</strong>
              </div>
              <div style={{
                maxHeight: '120px', overflowY: 'auto', padding: '8px',
                backgroundColor: t.bgPanel, borderRadius: '6px', fontSize: '12px'
              }}>
                {Array.from(selectedSerials).map(s => (
                  <span key={s} style={{
                    display: 'inline-block', padding: '2px 8px', margin: '2px',
                    backgroundColor: activeTab === 'OK' ? '#d1fae5' : '#fee2e2',
                    color: activeTab === 'OK' ? '#16a34a' : '#ef4444',
                    borderRadius: '4px', fontSize: '11px', fontWeight: '600'
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>
                Ubicación de destino *
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  backgroundColor: t.bgInput || t.bgPanel, border: `1px solid ${t.border}`,
                  borderRadius: '6px', color: t.text, fontSize: '14px'
                }}
              >
                <option value="">Seleccionar ubicación...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code} - {loc.description}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>
                Notas (opcional)
              </label>
              <textarea
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                placeholder="Notas adicionales del paquete..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px',
                  backgroundColor: t.bgInput || t.bgPanel, border: `1px solid ${t.border}`,
                  borderRadius: '6px', color: t.text, fontSize: '14px', resize: 'vertical'
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px', marginBottom: '16px',
                backgroundColor: '#fee2e2', border: '1px solid #ef4444',
                borderRadius: '6px', color: '#ef4444', fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowExitModal(false); setError(null); }}
                style={{
                  padding: '10px 20px', backgroundColor: t.bgPanel,
                  border: `1px solid ${t.border}`, borderRadius: '6px',
                  color: t.text, cursor: 'pointer', fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExit}
                disabled={exitLoading || !selectedLocation}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeTab === 'OK' ? COLORS.green : COLORS.red,
                  border: 'none', borderRadius: '6px',
                  color: '#fff', cursor: exitLoading || !selectedLocation ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '600',
                  opacity: exitLoading || !selectedLocation ? 0.6 : 1
                }}
              >
                {exitLoading ? 'Procesando...' : `Crear Paquete (${selectedSerials.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRBInventory;
