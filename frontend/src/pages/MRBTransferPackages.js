/**
 * MRBTransferPackages.js
 * Gestión bidireccional de paquetes de transferencia MRB <-> Hospital
 * - Recepción de paquetes desde Hospital (destino MRB)
 * - Envío de paquetes a Hospital (REWORK)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getPendingTransferPackages,
  getTransferPackageDetails,
  receiveTransferPackage,
  getNoCampaignSummary,
  getReworkPendingTransfer,
  createTransferPackage,
  getCampaignAssignmentMatrix,
  assignCampaignsBulk
} from '../services/repairService';

const API_URL = 'http://localhost:5000';

const MRBTransferPackages = ({ embedded = false, onPackageReceived = null }) => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  // Main mode: 'receive' (from Hospital) | 'send' (to Hospital)
  const [mode, setMode] = useState('receive');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ========== RECEIVE MODE STATE ==========
  const [pendingPackages, setPendingPackages] = useState([]);
  const [withCampaign, setWithCampaign] = useState([]);
  const [withoutCampaign, setWithoutCampaign] = useState([]);
  const [noCampaignSummary, setNoCampaignSummary] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageDetails, setPackageDetails] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveCampaignId, setReceiveCampaignId] = useState(null);
  const [receiveMode, setReceiveMode] = useState('campaign'); // 'campaign' | 'investigation'
  const [receiving, setReceiving] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [mrbLocations, setMrbLocations] = useState([]);
  const [receiveLocationId, setReceiveLocationId] = useState(null);
  const [subTab, setSubTab] = useState('withCampaign');

  // ========== CAMPAIGN ASSIGNMENT MATRIX STATE ==========
  const [campaignMatrix, setCampaignMatrix] = useState({ parts: [], campaigns: [] });
  const [expandedParts, setExpandedParts] = useState(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState(new Map()); // key: `${serialNumber}-${campaignId}`, value: { serialNumber, campaignId, defectId, partId }
  const [assigning, setAssigning] = useState(false);

  // ========== SEND MODE STATE ==========
  const [reworkDefects, setReworkDefects] = useState([]);
  const [reworkByCampaign, setReworkByCampaign] = useState([]);
  const [selectedRework, setSelectedRework] = useState(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendNotes, setSendNotes] = useState('');
  const [sendAlertHours, setSendAlertHours] = useState(24);
  const [sending, setSending] = useState(false);

  // Catálogos para modal de envío
  const [availableQars, setAvailableQars] = useState([]);
  const [available8Ds, setAvailable8Ds] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [hospitalLocations, setHospitalLocations] = useState([]); // Ubicaciones REPAIR/RELEASE
  const [sendQarId, setSendQarId] = useState(null);
  const [send8dId, setSend8dId] = useState(null);
  const [sendAlertUserId, setSendAlertUserId] = useState(null);
  const [sendDestinationLocationId, setSendDestinationLocationId] = useState(null); // Ubicación destino Hospital

  // ========== LOAD RECEIVE DATA ==========
  const loadReceiveData = useCallback(async () => {
    setLoading(true);
    try {
      const [packagesRes, summaryRes, campaignsRes, locationsRes, matrixRes] = await Promise.all([
        getPendingTransferPackages('MRB'),
        getNoCampaignSummary(),
        fetch(`${API_URL}/mrb?status=ABIERTA&status=EN_PROCESO&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()),
        fetch(`${API_URL}/location-codes?type=MRB`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()),
        getCampaignAssignmentMatrix()
      ]);

      setPendingPackages(packagesRes.packages || []);
      setWithCampaign(packagesRes.withCampaign || []);
      setWithoutCampaign(packagesRes.withoutCampaign || []);
      setAlertCount(packagesRes.alertCount || 0);
      setNoCampaignSummary(summaryRes.summary || []);
      setAvailableCampaigns(campaignsRes.campaigns || []);
      setMrbLocations(locationsRes.locations || []);

      // Campaign assignment matrix
      if (matrixRes.success) {
        setCampaignMatrix({ parts: matrixRes.parts || [], campaigns: matrixRes.campaigns || [] });
        // Pre-select IN_SCOPE assignments
        const preSelected = new Map();
        (matrixRes.parts || []).forEach(part => {
          (part.serials || []).forEach(serial => {
            Object.entries(serial.campaignStatus || {}).forEach(([campId, status]) => {
              if (status === 'IN_SCOPE') {
                const key = `${serial.serialNumber}-${campId}`;
                preSelected.set(key, {
                  serialNumber: serial.serialNumber,
                  campaignId: parseInt(campId),
                  defectId: serial.defectId,
                  partId: part.partId
                });
              }
            });
          });
        });
        setSelectedAssignments(preSelected);
      }

      // Pre-seleccionar primera ubicación si existe
      if (locationsRes.locations?.length > 0) {
        setReceiveLocationId(locationsRes.locations[0].id);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== LOAD SEND DATA ==========
  const loadSendData = useCallback(async () => {
    setLoading(true);
    try {
      const [reworkRes, qarsRes, eightdRes, usersRes] = await Promise.all([
        getReworkPendingTransfer(),
        fetch(`${API_URL}/qar?status=open&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()),
        fetch(`${API_URL}/8d/reports?status=open&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()),
        fetch(`${API_URL}/mrb/users/list`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json())
      ]);

      if (reworkRes.success) {
        setReworkDefects(reworkRes.defects || []);
        setReworkByCampaign(reworkRes.byCampaign || []);
      }
      setAvailableQars(qarsRes.alerts || qarsRes.items || []);
      setAvailable8Ds(eightdRes.reports || eightdRes.items || []);
      setAvailableUsers(usersRes.users || usersRes.items || []);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on mode
  useEffect(() => {
    if (mode === 'receive') {
      loadReceiveData();
    } else {
      loadSendData();
    }
  }, [mode, loadReceiveData, loadSendData]);

  // ========== RECEIVE FUNCTIONS ==========
  const loadPackageDetails = async (pkg) => {
    try {
      const result = await getTransferPackageDetails(pkg.id);
      if (result.success) {
        setPackageDetails(result);
        setSelectedPackage(pkg);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

  const openReceiveModal = (pkg) => {
    setSelectedPackage(pkg);
    setReceiveNotes('');
    setReceiveCampaignId(pkg.mrbCampaignId || null);
    setReceiveMode(pkg.mrbCampaignId ? 'campaign' : 'investigation'); // Default según si ya tiene campaña
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!selectedPackage) return;

    // Si modo es campaña, validar que haya campaña seleccionada
    if (receiveMode === 'campaign' && !selectedPackage.mrbCampaignId && !receiveCampaignId) {
      setError(language === 'es' ? 'Selecciona una campaña o elige "Bajo Investigación"' : 'Select a campaign or choose "Under Investigation"');
      return;
    }

    // Si modo es investigation, limpiar campaña
    const campaignToUse = receiveMode === 'investigation' ? null : receiveCampaignId;

    setReceiving(true);
    try {
      const result = await receiveTransferPackage(selectedPackage.id, receiveNotes, campaignToUse, receiveLocationId);
      if (result.success) {
        setSuccess(
          language === 'es'
            ? `Paquete ${selectedPackage.packageNumber} recibido (${result.transferHours}h de transferencia)`
            : `Package ${selectedPackage.packageNumber} received (${result.transferHours}h transfer time)`
        );
        setShowReceiveModal(false);
        loadReceiveData();
        // Callback para modo embebido
        if (onPackageReceived) onPackageReceived();
      } else {
        setError(result.message || 'Error al recibir paquete');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setReceiving(false);
    }
  };

  // ========== SEND FUNCTIONS ==========
  const toggleReworkSelection = (defectId) => {
    const newSet = new Set(selectedRework);
    if (newSet.has(defectId)) {
      newSet.delete(defectId);
    } else {
      newSet.add(defectId);
    }
    setSelectedRework(newSet);
  };

  const selectAllFromCampaign = (campaignDefects) => {
    const newSet = new Set(selectedRework);
    const allSelected = campaignDefects.every(d => newSet.has(d.id));
    campaignDefects.forEach(d => {
      if (allSelected) {
        newSet.delete(d.id);
      } else {
        newSet.add(d.id);
      }
    });
    setSelectedRework(newSet);
  };

  const openSendModal = async () => {
    if (selectedRework.size === 0) {
      setError(language === 'es' ? 'Selecciona al menos un defecto' : 'Select at least one defect');
      return;
    }
    setSendNotes('');
    setSendAlertHours(24);
    setSendQarId(null);
    setSend8dId(null);
    setSendAlertUserId(null);
    setSendDestinationLocationId(null);

    // Cargar ubicaciones de Hospital (REPAIR/RELEASE)
    try {
      const locRes = await fetch(`${API_URL}/location-codes?activeOnly=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const locData = await locRes.json();
      // Filtrar solo REPAIR y RELEASE (destinos válidos para Hospital)
      const hospitalLocs = (locData.locations || []).filter(l =>
        l.locationType === 'REPAIR' || l.locationType === 'RELEASE' ||
        l.location_type === 'REPAIR' || l.location_type === 'RELEASE'
      );
      setHospitalLocations(hospitalLocs);
      // Pre-seleccionar si solo hay una
      if (hospitalLocs.length === 1) {
        setSendDestinationLocationId(hospitalLocs[0].id);
      }
    } catch (err) {
      console.error('Error loading hospital locations:', err);
    }

    setShowSendModal(true);
  };

  const handleSend = async () => {
    if (selectedRework.size === 0) return;

    // Validar ubicación destino (obligatorio para control 360°)
    if (!sendDestinationLocationId) {
      setError(language === 'es' ? 'Selecciona la ubicación destino en Hospital' : 'Select destination location in Hospital');
      return;
    }

    // Validar que se seleccione un usuario para alertas
    if (!sendAlertUserId) {
      setError(language === 'es' ? 'Selecciona un usuario para recibir alertas' : 'Select a user to receive alerts');
      return;
    }

    setSending(true);
    try {
      const defectIds = Array.from(selectedRework);
      const result = await createTransferPackage(
        'MRB',           // originType
        'HOSPITAL',      // destinationType
        defectIds,
        {
          qarId: sendQarId,
          source8dId: send8dId,
          alertUserId: sendAlertUserId,
          destinationLocationId: sendDestinationLocationId,
          notes: sendNotes,
          alertHours: sendAlertHours
        }
      );

      if (result.success) {
        setSuccess(
          language === 'es'
            ? `Paquete ${result.package.packageNumber} creado con ${result.itemsAdded} item(s) hacia Hospital`
            : `Package ${result.package.packageNumber} created with ${result.itemsAdded} item(s) to Hospital`
        );
        setShowSendModal(false);
        setSelectedRework(new Set());
        loadSendData();
      } else {
        setError(result.message || 'Error al crear paquete');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ========== HELPERS ==========
  const formatHours = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  // ========== CAMPAIGN MATRIX HELPERS ==========
  const togglePartExpand = (partId) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partId)) {
      newExpanded.delete(partId);
    } else {
      newExpanded.add(partId);
    }
    setExpandedParts(newExpanded);
  };

  const toggleAssignment = (serial, campaignId, status) => {
    // Solo permitir toggle si es IN_SCOPE (la campaña aplica a este número de parte)
    // Bloquear OUT_OF_SCOPE (seriales limitados) y NOT_APPLICABLE (campaña de otra parte)
    if (status === 'OUT_OF_SCOPE' || status === 'NOT_APPLICABLE') return;

    const key = `${serial.serialNumber}-${campaignId}`;
    const newAssignments = new Map(selectedAssignments);

    if (newAssignments.has(key)) {
      newAssignments.delete(key);
    } else {
      newAssignments.set(key, {
        serialNumber: serial.serialNumber,
        campaignId: campaignId,
        defectId: serial.defectId,
        partId: serial.partId
      });
    }
    setSelectedAssignments(newAssignments);
  };

  const toggleAllForCampaign = (campaignId, parts) => {
    const newAssignments = new Map(selectedAssignments);
    const allSerials = [];

    parts.forEach(part => {
      part.serials.forEach(serial => {
        const status = serial.campaignStatus[campaignId];
        // Solo incluir seriales con IN_SCOPE (la campaña aplica a su parte)
        if (status === 'IN_SCOPE') {
          allSerials.push({ serial, key: `${serial.serialNumber}-${campaignId}` });
        }
      });
    });

    const allSelected = allSerials.every(({ key }) => newAssignments.has(key));

    allSerials.forEach(({ serial, key }) => {
      if (allSelected) {
        newAssignments.delete(key);
      } else {
        newAssignments.set(key, {
          serialNumber: serial.serialNumber,
          campaignId: campaignId,
          defectId: serial.defectId,
          partId: serial.partId
        });
      }
    });

    setSelectedAssignments(newAssignments);
  };

  const handleBulkAssign = async () => {
    if (selectedAssignments.size === 0) {
      setError(language === 'es' ? 'No hay asignaciones seleccionadas' : 'No assignments selected');
      return;
    }

    setAssigning(true);
    try {
      const assignments = Array.from(selectedAssignments.values());
      const result = await assignCampaignsBulk(assignments);

      if (result.success) {
        setSuccess(
          language === 'es'
            ? `${result.assigned} serial(es) asignados a campañas exitosamente`
            : `${result.assigned} serial(s) assigned to campaigns successfully`
        );
        setSelectedAssignments(new Map());
        loadReceiveData();
      } else {
        setError(result.message || 'Error al asignar campañas');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'IN_SCOPE':
        return { label: '', color: '#16a34a', bg: '#16a34a20', canSelect: true };
      case 'OUT_OF_SCOPE':
        return { label: 'FUERA', color: '#6b7280', bg: '#6b728020', canSelect: false };
      case 'NOT_APPLICABLE':
        return { label: '—', color: '#9ca3af', bg: 'transparent', canSelect: true };
      default:
        return { label: '?', color: '#9ca3af', bg: 'transparent', canSelect: false };
    }
  };

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', backgroundColor: embedded ? 'transparent' : t.bg, padding: embedded ? '0' : '20px' }}>
      {/* Header - oculto en modo embebido */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: t.text }}>
              {language === 'es' ? 'Transferencias MRB' : 'MRB Transfers'}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: t.textMuted }}>
              {language === 'es' ? 'Gestión de paquetes Hospital ↔ MRB' : 'Hospital ↔ MRB package management'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => mode === 'receive' ? loadReceiveData() : loadSendData()}
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
              {language === 'es' ? 'Actualizar' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/mrb')}
              style={{
                padding: '8px 16px',
                backgroundColor: t.primary,
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {language === 'es' ? 'Volver a MRB' : 'Back to MRB'}
            </button>
          </div>
        </div>
      )}

      {/* Mode Toggle - oculto en modo embebido */}
      {!embedded && (
        <div style={{ display: 'flex', gap: '0', marginBottom: '20px' }}>
          <button
            onClick={() => setMode('receive')}
            style={{
              padding: '12px 24px',
              backgroundColor: mode === 'receive' ? '#16a34a' : t.bgCard,
              color: mode === 'receive' ? '#fff' : t.text,
              border: `1px solid ${mode === 'receive' ? '#16a34a' : t.border}`,
              borderRadius: '8px 0 0 8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {language === 'es' ? 'Recibir desde Hospital' : 'Receive from Hospital'}
            {pendingPackages.length > 0 && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: mode === 'receive' ? 'rgba(255,255,255,0.3)' : '#16a34a',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '11px'
              }}>
                {pendingPackages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMode('send')}
            style={{
              padding: '12px 24px',
              backgroundColor: mode === 'send' ? '#f59e0b' : t.bgCard,
              color: mode === 'send' ? '#fff' : t.text,
              border: `1px solid ${mode === 'send' ? '#f59e0b' : t.border}`,
              borderRadius: '0 8px 8px 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {language === 'es' ? 'Enviar a Hospital (REWORK)' : 'Send to Hospital (REWORK)'}
            {reworkDefects.length > 0 && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: mode === 'send' ? 'rgba(255,255,255,0.3)' : '#f59e0b',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '11px'
              }}>
                {reworkDefects.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', color: '#dc2626' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px', color: '#16a34a' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
          {language === 'es' ? 'Cargando...' : 'Loading...'}
        </div>
      ) : mode === 'receive' ? (
        /* ==================== RECEIVE MODE ==================== */
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Total Pendientes' : 'Total Pending'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: t.text }}>{pendingPackages.length}</div>
            </div>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Con Campaña' : 'With Campaign'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{withCampaign.length}</div>
            </div>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Sin Campaña' : 'No Campaign'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{withoutCampaign.length}</div>
            </div>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #dc2626' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Con Alerta' : 'With Alert'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{alertCount}</div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setSubTab('withCampaign')}
              style={{
                padding: '10px 20px',
                backgroundColor: subTab === 'withCampaign' ? t.primary : t.bgCard,
                color: subTab === 'withCampaign' ? '#fff' : t.text,
                border: `1px solid ${subTab === 'withCampaign' ? t.primary : t.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {language === 'es' ? 'Con Campaña' : 'With Campaign'} ({withCampaign.length})
            </button>
            <button
              onClick={() => setSubTab('withoutCampaign')}
              style={{
                padding: '10px 20px',
                backgroundColor: subTab === 'withoutCampaign' ? '#f59e0b' : t.bgCard,
                color: subTab === 'withoutCampaign' ? '#fff' : t.text,
                border: `1px solid ${subTab === 'withoutCampaign' ? '#f59e0b' : t.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {language === 'es' ? 'Sin Campaña' : 'No Campaign'} ({withoutCampaign.length})
            </button>
          </div>

          {/* Package list */}
          <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                    {language === 'es' ? 'Paquete' : 'Package'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                    {language === 'es' ? 'Contenido' : 'Content'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                    {language === 'es' ? 'Campaña' : 'Campaign'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: t.textMuted, fontWeight: '600' }}>
                    {language === 'es' ? 'Tiempo' : 'Time'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                    {language === 'es' ? 'Enviado por' : 'Sent by'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: t.textMuted, fontWeight: '600' }}>
                    {language === 'es' ? 'Acciones' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(subTab === 'withCampaign' ? withCampaign : withoutCampaign).map(pkg => (
                  <tr key={pkg.id} style={{ borderTop: `1px solid ${t.border}`, backgroundColor: pkg.alertTriggered ? '#fef2f220' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '700', color: t.primary }}>{pkg.packageNumber}</div>
                      <div style={{ fontSize: '11px', color: t.textMuted }}>
                        {new Date(pkg.createdAt).toLocaleString('es-MX')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: t.text }}>{pkg.itemCount} item(s)</div>
                      <div style={{ fontSize: '11px', color: t.textMuted, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pkg.partsSummary || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {pkg.campaignNumber ? (
                        <span style={{ padding: '4px 8px', backgroundColor: '#16a34a20', color: '#16a34a', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {pkg.campaignNumber}
                        </span>
                      ) : (
                        <span style={{ padding: '4px 8px', backgroundColor: '#f59e0b20', color: '#f59e0b', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {language === 'es' ? 'Sin asignar' : 'Unassigned'}
                        </span>
                      )}
                      {pkg.alertNumber && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: t.textMuted }}>
                          QAR: {pkg.alertNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: pkg.alertTriggered ? '#dc262620' : '#3b82f620',
                        color: pkg.alertTriggered ? '#dc2626' : '#3b82f6'
                      }}>
                        {formatHours(pkg.hoursElapsed)}
                      </span>
                      {pkg.alertTriggered && (
                        <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }}>
                          {language === 'es' ? '¡Excedido!' : 'Exceeded!'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: t.text }}>{pkg.createdByName}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => loadPackageDetails(pkg)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: t.bgPanel,
                            border: `1px solid ${t.border}`,
                            borderRadius: '4px',
                            color: t.text,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          👁️ {language === 'es' ? 'Ver' : 'View'}
                        </button>
                        <button
                          onClick={() => openReceiveModal(pkg)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#16a34a',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {language === 'es' ? 'Recibir' : 'Receive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(subTab === 'withCampaign' ? withCampaign : withoutCampaign).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                      {language === 'es' ? 'No hay paquetes pendientes' : 'No pending packages'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Campaign Assignment Matrix */}
          {subTab === 'withoutCampaign' && campaignMatrix.parts.length > 0 && campaignMatrix.campaigns.length > 0 && (
            <div style={{ marginTop: '24px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: t.text }}>
                  {language === 'es' ? 'Asignación de Campañas' : 'Campaign Assignment'}
                </h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>
                    {selectedAssignments.size} {language === 'es' ? 'seleccionados' : 'selected'}
                  </span>
                  <button
                    onClick={handleBulkAssign}
                    disabled={assigning || selectedAssignments.size === 0}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: selectedAssignments.size > 0 ? '#16a34a' : t.bgPanel,
                      border: 'none',
                      borderRadius: '6px',
                      color: selectedAssignments.size > 0 ? '#fff' : t.textMuted,
                      cursor: selectedAssignments.size > 0 && !assigning ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {assigning
                      ? (language === 'es' ? 'Asignando...' : 'Assigning...')
                      : (language === 'es' ? 'Asignar Seleccionados' : 'Assign Selected')}
                  </button>
                  <button
                    onClick={() => navigate('/mrb/new')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: t.accent,
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    + {language === 'es' ? 'Nueva Campaña' : 'New Campaign'}
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '16px', height: '16px', backgroundColor: '#16a34a', borderRadius: '3px' }}></span>
                  {language === 'es' ? 'Aplica' : 'In Scope'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '16px', height: '16px', backgroundColor: '#6b7280', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px' }}>F</span>
                  {language === 'es' ? 'Fuera (seriales limitados)' : 'Out (limited serials)'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '16px', height: '16px', border: `1px dashed ${t.border}`, borderRadius: '3px' }}></span>
                  {language === 'es' ? 'No aplica a parte' : 'N/A to part'}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: `${200 + campaignMatrix.campaigns.length * 80}px` }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bgPanel }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: t.textMuted, fontWeight: '600', minWidth: '180px', position: 'sticky', left: 0, backgroundColor: t.bgPanel, zIndex: 1 }}>
                        {language === 'es' ? 'Parte / Serial' : 'Part / Serial'}
                      </th>
                      {campaignMatrix.campaigns.map(camp => (
                        <th
                          key={camp.id}
                          style={{ padding: '8px 6px', textAlign: 'center', color: t.primary, fontWeight: '600', minWidth: '75px', cursor: 'pointer' }}
                          onClick={() => toggleAllForCampaign(camp.id, campaignMatrix.parts)}
                          title={camp.title}
                        >
                          <div style={{ fontSize: '11px', fontWeight: '700' }}>{camp.campaignNumber}</div>
                          <div style={{ fontSize: '9px', color: t.textMuted, maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {camp.partNumber || 'General'}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaignMatrix.parts.map(part => (
                      <React.Fragment key={part.partId}>
                        {/* Part row (collapsible header) */}
                        <tr
                          style={{ backgroundColor: t.bg, cursor: 'pointer' }}
                          onClick={() => togglePartExpand(part.partId)}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: t.text, position: 'sticky', left: 0, backgroundColor: t.bg, zIndex: 1 }}>
                            <span style={{ marginRight: '8px' }}>{expandedParts.has(part.partId) ? '▼' : '▶'}</span>
                            {part.partNumber}
                            <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: t.primary + '20', color: t.primary, borderRadius: '10px', fontSize: '10px' }}>
                              {part.quantity}
                            </span>
                          </td>
                          {campaignMatrix.campaigns.map(camp => {
                            // Determine aggregate status for part
                            const serials = part.serials || [];
                            const statuses = serials.map(s => s.campaignStatus[camp.id]).filter(Boolean);
                            const inScope = statuses.filter(s => s === 'IN_SCOPE').length;
                            const outScope = statuses.filter(s => s === 'OUT_OF_SCOPE').length;
                            const notApplicable = statuses.filter(s => s === 'NOT_APPLICABLE').length;

                            let aggregateStatus;
                            if (statuses.length === 0 || notApplicable === statuses.length) {
                              aggregateStatus = 'NOT_APPLICABLE';
                            } else if (outScope === statuses.length) {
                              aggregateStatus = 'OUT_OF_SCOPE';
                            } else if (inScope > 0) {
                              aggregateStatus = 'PARTIAL';
                            } else {
                              aggregateStatus = 'IN_SCOPE';
                            }

                            const display = aggregateStatus === 'PARTIAL'
                              ? { label: `${inScope}/${serials.length}`, color: '#f59e0b', bg: '#f59e0b20' }
                              : getStatusDisplay(aggregateStatus);

                            return (
                              <td key={camp.id} style={{ padding: '8px 6px', textAlign: 'center' }}>
                                {aggregateStatus === 'NOT_APPLICABLE' ? (
                                  <span style={{ color: '#9ca3af' }}>—</span>
                                ) : aggregateStatus === 'OUT_OF_SCOPE' ? (
                                  <span style={{ padding: '2px 6px', backgroundColor: display.bg, color: display.color, borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>
                                    FUERA
                                  </span>
                                ) : (
                                  <span style={{ padding: '2px 6px', backgroundColor: display.bg, color: display.color, borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>
                                    {display.label}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Expanded serials */}
                        {expandedParts.has(part.partId) && part.serials.map(serial => (
                          <tr key={serial.serialNumber} style={{ borderTop: `1px solid ${t.border}` }}>
                            <td style={{ padding: '8px 12px 8px 32px', color: t.textMuted, fontFamily: 'monospace', fontSize: '11px', position: 'sticky', left: 0, backgroundColor: t.bgCard, zIndex: 1 }}>
                              {serial.serialNumber}
                            </td>
                            {campaignMatrix.campaigns.map(camp => {
                              const status = serial.campaignStatus[camp.id] || 'NOT_APPLICABLE';
                              const display = getStatusDisplay(status);
                              const key = `${serial.serialNumber}-${camp.id}`;
                              const isSelected = selectedAssignments.has(key);

                              return (
                                <td key={camp.id} style={{ padding: '6px', textAlign: 'center' }}>
                                  {status === 'OUT_OF_SCOPE' ? (
                                    <span style={{ padding: '2px 6px', backgroundColor: display.bg, color: display.color, borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>
                                      FUERA
                                    </span>
                                  ) : status === 'NOT_APPLICABLE' ? (
                                    // No aplica a esta parte - solo mostrar guión, sin interacción
                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                                  ) : (
                                    // IN_SCOPE - checkbox activo
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleAssignment(serial, camp.id, status)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fallback: Show summary if no campaigns available */}
          {subTab === 'withoutCampaign' && campaignMatrix.campaigns.length === 0 && noCampaignSummary.length > 0 && (
            <div style={{ marginTop: '24px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: t.text }}>
                  {language === 'es' ? 'Material sin campaña disponible' : 'Material without available campaign'}
                </h3>
                <button
                  onClick={() => navigate('/mrb/new')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: t.accent,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  + {language === 'es' ? 'Crear Campaña' : 'Create Campaign'}
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>{language === 'es' ? 'Parte' : 'Part'}</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: t.textMuted }}>{language === 'es' ? 'Cantidad' : 'Qty'}</th>
                  </tr>
                </thead>
                <tbody>
                  {noCampaignSummary.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: '600', color: t.text }}>{item.partNumber}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted }}>{item.partName}</div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', color: t.primary }}>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* ==================== SEND MODE ==================== */
        <>
          {/* Action bar */}
          {selectedRework.size > 0 && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#f59e0b',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#fff', fontWeight: '600' }}>
                {selectedRework.size} {language === 'es' ? 'defecto(s) seleccionado(s)' : 'defect(s) selected'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setSelectedRework(new Set())}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {language === 'es' ? 'Limpiar' : 'Clear'}
                </button>
                <button
                  onClick={openSendModal}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  📤 {language === 'es' ? 'Crear Paquete a Hospital' : 'Create Package to Hospital'}
                </button>
              </div>
            </div>
          )}

          {/* KPIs for send mode */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Total REWORK Pendientes' : 'Total REWORK Pending'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{reworkDefects.length}</div>
            </div>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Campañas con REWORK' : 'Campaigns with REWORK'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>{reworkByCampaign.length}</div>
            </div>
            <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                {language === 'es' ? 'Seleccionados' : 'Selected'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{selectedRework.size}</div>
            </div>
          </div>

          {/* REWORK defects by campaign */}
          {reworkByCampaign.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: t.bgCard, borderRadius: '10px', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '24px', marginBottom: '16px', color: t.success, fontWeight: '600' }}>OK</div>
              <div style={{ fontSize: '16px', color: t.text, fontWeight: '600' }}>
                {language === 'es' ? 'No hay material REWORK pendiente de envío' : 'No REWORK material pending shipment'}
              </div>
              <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '8px' }}>
                {language === 'es' ? 'Los defectos con disposición REWORK aparecerán aquí' : 'Defects with REWORK disposition will appear here'}
              </div>
            </div>
          ) : (
            reworkByCampaign.map(campaign => (
              <div key={campaign.campaignId || 'none'} style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                {/* Campaign header */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: t.bgPanel,
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontWeight: '700', color: '#7c3aed', marginRight: '8px' }}>
                      {campaign.campaignNumber || 'Sin Campaña'}
                    </span>
                    <span style={{ fontSize: '13px', color: t.textMuted }}>
                      {campaign.campaignTitle}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: t.textMuted }}>
                      {campaign.defects.length} item(s)
                    </span>
                    <button
                      onClick={() => selectAllFromCampaign(campaign.defects)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: campaign.defects.every(d => selectedRework.has(d.id)) ? '#f59e0b' : t.bgCard,
                        color: campaign.defects.every(d => selectedRework.has(d.id)) ? '#fff' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {campaign.defects.every(d => selectedRework.has(d.id))
                        ? (language === 'es' ? 'Deseleccionar' : 'Deselect')
                        : (language === 'es' ? 'Seleccionar todos' : 'Select all')}
                    </button>
                  </div>
                </div>

                {/* Defects table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bg }}>
                      <th style={{ padding: '10px 16px', width: '40px' }}></th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                        {language === 'es' ? 'Serial/Lote' : 'Serial/Lot'}
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                        {language === 'es' ? 'Parte' : 'Part'}
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                        {language === 'es' ? 'Defecto' : 'Defect'}
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: t.textMuted, fontWeight: '600' }}>
                        {language === 'es' ? 'Severidad' : 'Severity'}
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>
                        {language === 'es' ? 'Capturado' : 'Captured'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.defects.map(defect => (
                      <tr
                        key={defect.id}
                        onClick={() => toggleReworkSelection(defect.id)}
                        style={{
                          borderTop: `1px solid ${t.border}`,
                          backgroundColor: selectedRework.has(defect.id) ? '#f59e0b15' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedRework.has(defect.id)}
                            onChange={() => toggleReworkSelection(defect.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '600', color: t.primary }}>
                            {defect.serialNumber || defect.lotNumber || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: '500', color: t.text }}>{defect.partNumber}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted }}>{defect.partName}</div>
                        </td>
                        <td style={{ padding: '10px 16px', color: t.text }}>
                          {defect.defectTypeName || '-'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: defect.severityCode === 'CRITICAL' ? '#dc262620' : defect.severityCode === 'MAJOR' ? '#f59e0b20' : '#16a34a20',
                            color: defect.severityCode === 'CRITICAL' ? '#dc2626' : defect.severityCode === 'MAJOR' ? '#f59e0b' : '#16a34a'
                          }}>
                            {defect.severityCode || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontSize: '12px', color: t.text }}>{defect.capturedByName}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted }}>
                            {new Date(defect.createdAt).toLocaleDateString('es-MX')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Modal Ver Detalle Paquete */}
      {packageDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setPackageDetails(null)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '600px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: t.text }}>
              📦 {packageDetails.package?.packageNumber}
            </h3>

            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div><strong>{language === 'es' ? 'Estado:' : 'Status:'}</strong> {packageDetails.package?.status}</div>
                <div><strong>{language === 'es' ? 'Creado:' : 'Created:'}</strong> {new Date(packageDetails.package?.createdAt).toLocaleString('es-MX')}</div>
                <div><strong>{language === 'es' ? 'Por:' : 'By:'}</strong> {packageDetails.package?.createdByName}</div>
                <div><strong>{language === 'es' ? 'Campaña:' : 'Campaign:'}</strong> {packageDetails.package?.campaignNumber || 'Sin asignar'}</div>
              </div>
              {packageDetails.package?.notes && (
                <div style={{ marginTop: '10px', padding: '8px', backgroundColor: t.bgCard, borderRadius: '4px' }}>
                  <strong>{language === 'es' ? 'Notas:' : 'Notes:'}</strong> {packageDetails.package.notes}
                </div>
              )}
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.text }}>
              {language === 'es' ? 'Items en el paquete' : 'Items in package'} ({packageDetails.items?.length || 0})
            </h4>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>{language === 'es' ? 'Serial' : 'Serial'}</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>{language === 'es' ? 'Parte' : 'Part'}</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>{language === 'es' ? 'Defecto' : 'Defect'}</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>{language === 'es' ? 'Severidad' : 'Severity'}</th>
                </tr>
              </thead>
              <tbody>
                {packageDetails.items?.map(item => (
                  <tr key={item.id} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: t.primary }}>{item.serialNumber || '-'}</td>
                    <td style={{ padding: '8px' }}>{item.partNumber}</td>
                    <td style={{ padding: '8px' }}>{item.defectSummary || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backgroundColor: item.severityCode === 'ALTA' ? '#dc262620' : item.severityCode === 'MEDIA' ? '#f59e0b20' : '#16a34a20',
                        color: item.severityCode === 'ALTA' ? '#dc2626' : item.severityCode === 'MEDIA' ? '#f59e0b' : '#16a34a'
                      }}>
                        {item.severityCode || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setPackageDetails(null)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: t.bgPanel,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recibir Paquete */}
      {showReceiveModal && selectedPackage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowReceiveModal(false)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '450px',
            maxWidth: '500px'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#16a34a' }}>
              {language === 'es' ? 'Recibir Paquete' : 'Receive Package'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: t.textMuted }}>
              {language === 'es'
                ? `Confirmar recepción de ${selectedPackage.packageNumber} con ${selectedPackage.itemCount} item(s)`
                : `Confirm reception of ${selectedPackage.packageNumber} with ${selectedPackage.itemCount} item(s)`}
            </p>

            {/* Selector de modo: Asignar a Campaña vs Bajo Investigación */}
            {!selectedPackage.mrbCampaignId && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>
                  {language === 'es' ? '¿Cómo recibir este material?' : 'How to receive this material?'}
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setReceiveMode('campaign')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${receiveMode === 'campaign' ? '#16a34a' : t.border}`,
                      backgroundColor: receiveMode === 'campaign' ? '#16a34a15' : t.bgPanel,
                      color: receiveMode === 'campaign' ? '#16a34a' : t.text,
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                  >
                    {language === 'es' ? 'Asignar a Campaña' : 'Assign to Campaign'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiveMode('investigation')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${receiveMode === 'investigation' ? '#f59e0b' : t.border}`,
                      backgroundColor: receiveMode === 'investigation' ? '#f59e0b15' : t.bgPanel,
                      color: receiveMode === 'investigation' ? '#f59e0b' : t.text,
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                  >
                    {language === 'es' ? 'Bajo Investigación' : 'Under Investigation'}
                  </button>
                </div>

                {/* Selector de campaña solo si modo es 'campaign' */}
                {receiveMode === 'campaign' && (
                  <select
                    value={receiveCampaignId || ''}
                    onChange={(e) => setReceiveCampaignId(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgPanel,
                      color: t.text,
                      fontSize: '13px'
                    }}
                  >
                    <option value="">{language === 'es' ? '-- Seleccionar campaña --' : '-- Select campaign --'}</option>
                    {availableCampaigns.map(camp => (
                      <option key={camp.id} value={camp.id}>
                        {camp.campaignNumber || camp.campaign_number} - {camp.title || camp.description}
                      </option>
                    ))}
                  </select>
                )}

                {/* Info si es investigación */}
                {receiveMode === 'investigation' && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#f59e0b15',
                    border: '1px solid #f59e0b30',
                    fontSize: '12px',
                    color: '#b45309'
                  }}>
                    {language === 'es'
                      ? 'El material quedará en MRB sin campaña asignada. Aparecerá en la lista de "Pendientes de Asignar".'
                      : 'Material will stay in MRB without assigned campaign. It will appear in "Pending Assignment" list.'}
                  </div>
                )}
              </div>
            )}

            {/* Selector de ubicación MRB */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? 'Ubicación de recepción' : 'Reception location'}
              </label>
              <select
                value={receiveLocationId || ''}
                onChange={(e) => setReceiveLocationId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="">{language === 'es' ? '-- Sin ubicación --' : '-- No location --'}</option>
                {mrbLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.description}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? 'Notas de recepción (opcional)' : 'Reception notes (optional)'}
              </label>
              <textarea
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowReceiveModal(false)}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleReceive}
                disabled={receiving}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  cursor: receiving ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: receiving ? 0.7 : 1
                }}
              >
                {receiving
                  ? (language === 'es' ? 'Recibiendo...' : 'Receiving...')
                  : (language === 'es' ? 'Confirmar Recepción' : 'Confirm Reception')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar a Hospital */}
      {showSendModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowSendModal(false)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '550px',
            maxWidth: '650px',
            maxHeight: '85vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f59e0b' }}>
              📤 {language === 'es' ? 'Crear Paquete a Hospital' : 'Create Package to Hospital'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: t.textMuted }}>
              {language === 'es'
                ? `Enviar ${selectedRework.size} defecto(s) REWORK a Hospital para retrabajo`
                : `Send ${selectedRework.size} REWORK defect(s) to Hospital for rework`}
            </p>

            {/* Ubicación destino Hospital (REQUERIDO) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                📍 {language === 'es' ? 'Ubicación destino en Hospital *' : 'Destination location in Hospital *'}
              </label>
              <select
                value={sendDestinationLocationId || ''}
                onChange={(e) => setSendDestinationLocationId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${sendDestinationLocationId ? t.border : '#dc2626'}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
              >
                <option value="">{language === 'es' ? '-- Seleccionar ubicación --' : '-- Select location --'}</option>
                {hospitalLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.description} ({loc.locationType || loc.location_type})
                  </option>
                ))}
              </select>
              {!sendDestinationLocationId && (
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#dc2626' }}>
                  {language === 'es' ? 'Requerido para control de inventario' : 'Required for inventory control'}
                </p>
              )}
            </div>

            {/* Usuario para alertas (REQUERIDO) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                👤 {language === 'es' ? 'Usuario a notificar si no se recibe *' : 'User to notify if not received *'}
              </label>
              <select
                value={sendAlertUserId || ''}
                onChange={(e) => setSendAlertUserId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${sendAlertUserId ? t.border : '#dc2626'}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
              >
                <option value="">{language === 'es' ? '-- Seleccionar usuario --' : '-- Select user --'}</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName || user.first_name} {user.lastName || user.last_name} ({user.email})
                  </option>
                ))}
              </select>
              {!sendAlertUserId && (
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#dc2626' }}>
                  {language === 'es' ? 'Requerido' : 'Required'}
                </p>
              )}
            </div>

            {/* QAR asociado (opcional) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                🔔 {language === 'es' ? 'QAR asociado (opcional)' : 'Associated QAR (optional)'}
              </label>
              <select
                value={sendQarId || ''}
                onChange={(e) => setSendQarId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
              >
                <option value="">{language === 'es' ? '-- Sin QAR --' : '-- No QAR --'}</option>
                {availableQars.map(qar => (
                  <option key={qar.id} value={qar.id}>
                    {qar.alertNumber || qar.alert_number} - {qar.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 8D asociado (opcional) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                📋 {language === 'es' ? '8D asociado (opcional)' : 'Associated 8D (optional)'}
              </label>
              <select
                value={send8dId || ''}
                onChange={(e) => setSend8dId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
              >
                <option value="">{language === 'es' ? '-- Sin 8D --' : '-- No 8D --'}</option>
                {available8Ds.map(report => (
                  <option key={report.id} value={report.id}>
                    {report.reportId || report.report_id} - {report.title || report.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Horas de alerta */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? '⏱️ Horas de alerta' : '⏱️ Alert hours'}
              </label>
              <input
                type="number"
                value={sendAlertHours}
                onChange={(e) => setSendAlertHours(parseInt(e.target.value) || 24)}
                min={1}
                max={168}
                style={{
                  width: '100px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
              />
              <span style={{ marginLeft: '10px', fontSize: '12px', color: t.textMuted }}>
                {language === 'es' ? '(Alerta si no se recibe en este tiempo)' : '(Alert if not received within this time)'}
              </span>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? '📝 Notas (opcional)' : '📝 Notes (optional)'}
              </label>
              <textarea
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
                rows={3}
                placeholder={language === 'es' ? 'Instrucciones de retrabajo, observaciones...' : 'Rework instructions, observations...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendDestinationLocationId || !sendAlertUserId}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: (!sendDestinationLocationId || !sendAlertUserId) ? t.border : '#f59e0b',
                  color: '#fff',
                  cursor: (sending || !sendDestinationLocationId || !sendAlertUserId) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: (sending || !sendDestinationLocationId || !sendAlertUserId) ? 0.7 : 1
                }}
              >
                {sending
                  ? (language === 'es' ? 'Creando...' : 'Creating...')
                  : (language === 'es' ? '📤 Crear Paquete' : '📤 Create Package')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRBTransferPackages;
