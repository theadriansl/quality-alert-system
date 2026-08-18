/**
 * HospitalTransferPackages.js
 * Gestión de paquetes de transferencia Hospital <-> MRB
 * - Envío de paquetes a MRB (Quarantine)
 * - Estado de paquetes enviados
 * - Recepción de paquetes desde MRB (REWORK)
 * - Alertas de paquetes con tiempo excedido
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Package,
  Send,
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  MapPin,
  User,
  FileText,
  Search
} from 'lucide-react';
import {
  getPendingTransferPackages,
  getTransferPackageDetails,
  receiveTransferPackage,
  createTransferPackage
} from '../services/repairService';

const API_URL = 'http://localhost:5000';

const HospitalTransferPackages = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  // Tabs: 'send' | 'sent' | 'receive' | 'alerts'
  const [activeTab, setActiveTab] = useState('sent');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ========== SEND MODE STATE (Enviar a MRB) ==========
  const [quarantineDefects, setQuarantineDefects] = useState([]);
  const [selectedDefects, setSelectedDefects] = useState(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendNotes, setSendNotes] = useState('');
  const [sendAlertMinutes, setSendAlertMinutes] = useState(60);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Catálogos para envío
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [availableQars, setAvailableQars] = useState([]);
  const [sendCampaignId, setSendCampaignId] = useState(null);
  const [sendQarId, setSendQarId] = useState(null);
  const [mrbLocations, setMrbLocations] = useState([]);
  const [sendDestinationLocationId, setSendDestinationLocationId] = useState(null);

  // ========== SENT MODE STATE (Paquetes enviados) ==========
  const [sentPackages, setSentPackages] = useState([]);
  const [selectedSentPackage, setSelectedSentPackage] = useState(null);
  const [sentPackageDetails, setSentPackageDetails] = useState(null);

  // ========== RECEIVE MODE STATE (Recibir de MRB) ==========
  const [incomingPackages, setIncomingPackages] = useState([]);
  const [selectedIncomingPackage, setSelectedIncomingPackage] = useState(null);
  const [incomingPackageDetails, setIncomingPackageDetails] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [hospitalLocations, setHospitalLocations] = useState([]);
  const [receiveLocationId, setReceiveLocationId] = useState(null);

  // ========== ALERTS STATE ==========
  const [alertPackages, setAlertPackages] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  // ========== LOAD FUNCTIONS ==========

  // Cargar defectos para enviar a MRB (quarantine)
  const loadSendData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [defectsRes, campaignsRes, qarsRes, locsRes] = await Promise.all([
        // Defectos en quarantine listos para enviar (endpoint ya filtra pending_transfer)
        fetch(`${API_URL}/defects-v2/quarantine`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        // Campañas MRB activas
        fetch(`${API_URL}/mrb?status=ABIERTA&status=EN_PROCESO&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        // QARs abiertos
        fetch(`${API_URL}/qar?status=open&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        // Ubicaciones MRB (destino para envíos)
        fetch(`${API_URL}/location-codes?activeOnly=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(data => ({
          locations: (data.locations || []).filter(loc =>
            ['MRB', 'QUARANTINE'].includes(loc.locationType || loc.location_type)
          )
        }))
      ]);

      setQuarantineDefects(defectsRes.defects || []);
      setAvailableCampaigns(campaignsRes.campaigns || []);
      setAvailableQars(qarsRes.qars || qarsRes.alerts || []);
      setMrbLocations(locsRes.locations || []);

      if (locsRes.locations?.length > 0) {
        setSendDestinationLocationId(locsRes.locations[0].id);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar paquetes enviados (Hospital -> MRB)
  const loadSentData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const result = await fetch(`${API_URL}/transfer-packages?originType=HOSPITAL`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      if (result.success) {
        // Separar pendientes y recibidos
        const all = result.packages || [];
        setSentPackages(all);

        // Contar alertas
        const alerts = all.filter(p => p.status === 'PENDING' && p.alertTriggered);
        setAlertCount(alerts.length);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar paquetes entrantes (MRB -> Hospital)
  const loadReceiveData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [packagesRes, locsRes] = await Promise.all([
        getPendingTransferPackages('HOSPITAL'),
        fetch(`${API_URL}/location-codes?activeOnly=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(data => ({
          // Filtrar solo ubicaciones de Hospital (REPAIR, RELEASE)
          locations: (data.locations || []).filter(loc =>
            ['REPAIR', 'RELEASE'].includes(loc.locationType || loc.location_type)
          )
        }))
      ]);

      setIncomingPackages(packagesRes.packages || []);
      setHospitalLocations(locsRes.locations || []);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar alertas (paquetes con tiempo excedido)
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Paquetes enviados que excedieron tiempo
      const sentRes = await fetch(`${API_URL}/transfer-packages?originType=HOSPITAL&status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      // Paquetes entrantes que excedieron tiempo
      const incomingRes = await getPendingTransferPackages('HOSPITAL');

      const sentAlerts = (sentRes.packages || []).filter(p => p.alertTriggered);
      const incomingAlerts = (incomingRes.packages || []).filter(p => p.alertTriggered);

      setAlertPackages([
        ...sentAlerts.map(p => ({ ...p, direction: 'sent' })),
        ...incomingAlerts.map(p => ({ ...p, direction: 'incoming' }))
      ]);
      setAlertCount(sentAlerts.length + incomingAlerts.length);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos según tab activo
  useEffect(() => {
    if (activeTab === 'send') {
      loadSendData();
    } else if (activeTab === 'sent') {
      loadSentData();
    } else if (activeTab === 'receive') {
      loadReceiveData();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    }
  }, [activeTab, loadSendData, loadSentData, loadReceiveData, loadAlerts]);

  // Cargar conteos al montar
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const sentRes = await fetch(`${API_URL}/transfer-packages?originType=HOSPITAL&status=PENDING`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        const alerts = (sentRes.packages || []).filter(p => p.alertTriggered);
        setAlertCount(alerts.length);
      } catch (err) {
        console.error('Error loading counts:', err);
      }
    };
    loadCounts();
  }, []);

  // ========== SEND FUNCTIONS ==========

  const handleSendPackage = async () => {
    if (selectedDefects.size === 0) {
      setError(language === 'es' ? 'Selecciona al menos un defecto' : 'Select at least one defect');
      return;
    }

    setSending(true);
    setError('');

    try {
      const defectIds = Array.from(selectedDefects);
      const result = await createTransferPackage(
        'HOSPITAL',
        'MRB',
        defectIds,
        {
          mrbCampaignId: sendCampaignId,
          qarId: sendQarId,
          destinationLocationId: sendDestinationLocationId,
          notes: sendNotes,
          alertMinutes: sendAlertMinutes
        }
      );

      if (result.success) {
        setSuccess(language === 'es'
          ? `Paquete ${result.package.packageNumber} creado con ${result.itemsAdded} item(s)`
          : `Package ${result.package.packageNumber} created with ${result.itemsAdded} item(s)`);
        setShowSendModal(false);
        setSelectedDefects(new Set());
        setSendNotes('');
        loadSendData();
        loadSentData();
      } else {
        setError(result.message || 'Error al crear paquete');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // ========== RECEIVE FUNCTIONS ==========

  const loadPackageDetails = async (pkg, type) => {
    try {
      const result = await getTransferPackageDetails(pkg.id);
      if (result.success) {
        if (type === 'sent') {
          setSentPackageDetails(result);
          setSelectedSentPackage(pkg);
        } else {
          setIncomingPackageDetails(result);
          setSelectedIncomingPackage(pkg);
          // Usar ubicación destino del paquete como default
          setReceiveLocationId(pkg.destinationLocationId || null);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReceivePackage = async () => {
    if (!selectedIncomingPackage) return;

    setReceiving(true);
    setError('');

    try {
      const result = await receiveTransferPackage(
        selectedIncomingPackage.id,
        receiveNotes,
        null,
        receiveLocationId
      );

      if (result.success) {
        setSuccess(language === 'es'
          ? `Paquete ${selectedIncomingPackage.packageNumber} recibido (${result.transferMinutes}min)`
          : `Package ${selectedIncomingPackage.packageNumber} received (${result.transferMinutes}min)`);
        setShowReceiveModal(false);
        setSelectedIncomingPackage(null);
        setReceiveNotes('');
        loadReceiveData();
      } else {
        setError(result.message || 'Error al recibir paquete');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReceiving(false);
    }
  };

  // ========== HELPERS ==========

  const formatMinutes = (minutes) => {
    if (!minutes && minutes !== 0) return '-';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const toggleDefectSelection = (defectId) => {
    const newSelected = new Set(selectedDefects);
    if (newSelected.has(defectId)) {
      newSelected.delete(defectId);
    } else {
      newSelected.add(defectId);
    }
    setSelectedDefects(newSelected);
  };

  const selectAllDefects = () => {
    const filtered = filteredQuarantineDefects;
    if (selectedDefects.size === filtered.length) {
      setSelectedDefects(new Set());
    } else {
      setSelectedDefects(new Set(filtered.map(d => d.id)));
    }
  };

  const filteredQuarantineDefects = quarantineDefects.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.serialNumber || '').toLowerCase().includes(term) ||
      (d.partNumber || '').toLowerCase().includes(term) ||
      (d.entryNumber || '').toLowerCase().includes(term)
    );
  });

  // ========== RENDER ==========

  const tabStyle = (isActive) => ({
    padding: '12px 20px',
    backgroundColor: isActive ? t.primary : 'transparent',
    color: isActive ? '#fff' : t.text,
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontWeight: isActive ? '600' : '400',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  });

  const badgeStyle = (color) => ({
    backgroundColor: color,
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    minWidth: '20px',
    textAlign: 'center'
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/defect-hospital')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: t.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={18} />
            {language === 'es' ? 'Volver a Hospital' : 'Back to Hospital'}
          </button>
          <h1 style={{ margin: 0, color: t.text, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={28} />
            {language === 'es' ? 'Transferencias Hospital' : 'Hospital Transfers'}
          </h1>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'send') loadSendData();
            else if (activeTab === 'sent') loadSentData();
            else if (activeTab === 'receive') loadReceiveData();
            else if (activeTab === 'alerts') loadAlerts();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: t.bgHover,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px'
          }}
        >
          <RefreshCw size={14} />
          {language === 'es' ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#dc262620', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={18} />
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#16a34a20', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {success}
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: `2px solid ${t.border}`, marginBottom: '20px' }}>
        <button style={tabStyle(activeTab === 'send')} onClick={() => setActiveTab('send')}>
          <Send size={16} />
          {language === 'es' ? 'Enviar a MRB' : 'Send to MRB'}
          {quarantineDefects.length > 0 && <span style={badgeStyle('#3b82f6')}>{quarantineDefects.length}</span>}
        </button>
        <button style={tabStyle(activeTab === 'sent')} onClick={() => setActiveTab('sent')}>
          <Package size={16} />
          {language === 'es' ? 'Paquetes Enviados' : 'Sent Packages'}
          {sentPackages.filter(p => p.status === 'PENDING').length > 0 && (
            <span style={badgeStyle('#f59e0b')}>{sentPackages.filter(p => p.status === 'PENDING').length}</span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'receive')} onClick={() => setActiveTab('receive')}>
          <Inbox size={16} />
          {language === 'es' ? 'Recibir de MRB' : 'Receive from MRB'}
          {incomingPackages.length > 0 && <span style={badgeStyle('#8b5cf6')}>{incomingPackages.length}</span>}
        </button>
        <button style={tabStyle(activeTab === 'alerts')} onClick={() => setActiveTab('alerts')}>
          <AlertTriangle size={16} />
          {language === 'es' ? 'Alertas' : 'Alerts'}
          {alertCount > 0 && <span style={badgeStyle('#dc2626')}>{alertCount}</span>}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p>{language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      )}

      {/* ========== TAB: SEND TO MRB ========== */}
      {!loading && activeTab === 'send' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} />
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Buscar serial, parte...' : 'Search serial, part...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 32px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    backgroundColor: t.bg,
                    color: t.text,
                    width: '250px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <span style={{ color: t.textMuted, fontSize: '13px' }}>
                {selectedDefects.size} {language === 'es' ? 'seleccionados' : 'selected'}
              </span>
            </div>
            <button
              onClick={() => setShowSendModal(true)}
              disabled={selectedDefects.size === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedDefects.size > 0 ? t.primary : t.bgHover,
                color: selectedDefects.size > 0 ? '#fff' : t.textMuted,
                border: 'none',
                borderRadius: '6px',
                cursor: selectedDefects.size > 0 ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Send size={16} />
              {language === 'es' ? 'Crear Paquete' : 'Create Package'}
            </button>
          </div>

          {/* Lista de defectos */}
          <div style={{ backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgHover }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>
                    <input
                      type="checkbox"
                      checked={selectedDefects.size === filteredQuarantineDefects.length && filteredQuarantineDefects.length > 0}
                      onChange={selectAllDefects}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontSize: '12px', fontWeight: '600' }}>
                    {language === 'es' ? 'ENTRADA' : 'ENTRY'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontSize: '12px', fontWeight: '600' }}>
                    {language === 'es' ? 'SERIAL' : 'SERIAL'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontSize: '12px', fontWeight: '600' }}>
                    {language === 'es' ? 'PARTE' : 'PART'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontSize: '12px', fontWeight: '600' }}>
                    {language === 'es' ? 'DEFECTO' : 'DEFECT'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontSize: '12px', fontWeight: '600' }}>
                    {language === 'es' ? 'CAPTURADO' : 'CAPTURED'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredQuarantineDefects.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                      {language === 'es' ? 'No hay defectos en cuarentena listos para enviar' : 'No quarantine defects ready to send'}
                    </td>
                  </tr>
                ) : (
                  filteredQuarantineDefects.map(d => (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: `1px solid ${t.border}`,
                        backgroundColor: selectedDefects.has(d.id) ? `${t.primary}10` : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleDefectSelection(d.id)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedDefects.has(d.id)}
                          onChange={() => toggleDefectSelection(d.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: t.primary, fontWeight: '600' }}>
                        {d.entryNumber || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '500' }}>
                        {d.serialNumber || d.lotNumber || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '500' }}>{d.partNumber || '-'}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted }}>{d.partName || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {d.defectTypeName || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: t.textMuted }}>
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString('es-MX') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== TAB: SENT PACKAGES ========== */}
      {!loading && activeTab === 'sent' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSentPackage ? '1fr 1fr' : '1fr', gap: '20px' }}>
          {/* Lista de paquetes */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.textMuted }}>
              {language === 'es' ? 'Paquetes enviados a MRB' : 'Packages sent to MRB'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sentPackages.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}` }}>
                  {language === 'es' ? 'No hay paquetes enviados' : 'No sent packages'}
                </div>
              ) : (
                sentPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => loadPackageDetails(pkg, 'sent')}
                    style={{
                      padding: '16px',
                      backgroundColor: selectedSentPackage?.id === pkg.id ? `${t.primary}10` : t.bg,
                      borderRadius: '8px',
                      border: `1px solid ${selectedSentPackage?.id === pkg.id ? t.primary : t.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={16} />
                          {pkg.packageNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                          {pkg.itemCount} item(s) • {pkg.createdByName}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: pkg.status === 'RECEIVED' ? '#16a34a20' : pkg.alertTriggered ? '#dc262620' : '#f59e0b20',
                          color: pkg.status === 'RECEIVED' ? '#16a34a' : pkg.alertTriggered ? '#dc2626' : '#f59e0b'
                        }}>
                          {pkg.status === 'RECEIVED'
                            ? (language === 'es' ? 'RECIBIDO' : 'RECEIVED')
                            : pkg.alertTriggered
                              ? (language === 'es' ? 'EXCEDIDO' : 'EXCEEDED')
                              : (language === 'es' ? 'PENDIENTE' : 'PENDING')}
                        </span>
                        {pkg.status === 'PENDING' && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: pkg.alertTriggered ? '#dc262620' : '#3b82f620',
                            color: pkg.alertTriggered ? '#dc2626' : '#3b82f6'
                          }}>
                            <Clock size={10} style={{ marginRight: '4px' }} />
                            {formatMinutes(pkg.minutesElapsed)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px' }}>
                      {new Date(pkg.createdAt).toLocaleString('es-MX')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detalle del paquete seleccionado */}
          {selectedSentPackage && sentPackageDetails && (
            <div style={{ backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}`, padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                {language === 'es' ? 'Detalle del Paquete' : 'Package Details'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'Número' : 'Number'}</div>
                  <div style={{ fontWeight: '600' }}>{sentPackageDetails.package?.packageNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'Estado' : 'Status'}</div>
                  <div style={{ fontWeight: '600' }}>{sentPackageDetails.package?.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'Campaña' : 'Campaign'}</div>
                  <div style={{ fontWeight: '600' }}>{sentPackageDetails.package?.campaignNumber || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'Items' : 'Items'}</div>
                  <div style={{ fontWeight: '600' }}>{sentPackageDetails.items?.length || 0}</div>
                </div>
              </div>

              <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: t.textMuted }}>
                {language === 'es' ? 'Items en el paquete' : 'Items in package'}
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: t.bgHover }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Serial</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Parte</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Defecto</th>
                  </tr>
                </thead>
                <tbody>
                  {sentPackageDetails.items?.map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.serialNumber || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.partNumber || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.defectSummary || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: RECEIVE FROM MRB ========== */}
      {!loading && activeTab === 'receive' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedIncomingPackage ? '1fr 1fr' : '1fr', gap: '20px' }}>
          {/* Lista de paquetes entrantes */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.textMuted }}>
              {language === 'es' ? 'Paquetes REWORK desde MRB' : 'REWORK packages from MRB'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {incomingPackages.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}` }}>
                  {language === 'es' ? 'No hay paquetes pendientes de MRB' : 'No pending packages from MRB'}
                </div>
              ) : (
                incomingPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => loadPackageDetails(pkg, 'incoming')}
                    style={{
                      padding: '16px',
                      backgroundColor: selectedIncomingPackage?.id === pkg.id ? `${t.primary}10` : t.bg,
                      borderRadius: '8px',
                      border: `1px solid ${selectedIncomingPackage?.id === pkg.id ? t.primary : pkg.alertTriggered ? '#dc2626' : t.border}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Inbox size={16} />
                          {pkg.packageNumber}
                          {pkg.alertTriggered && <AlertTriangle size={14} color="#dc2626" />}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                          {pkg.itemCount} item(s) • {pkg.createdByName}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: pkg.alertTriggered ? '#dc262620' : '#8b5cf620',
                        color: pkg.alertTriggered ? '#dc2626' : '#8b5cf6'
                      }}>
                        {formatMinutes(pkg.minutesElapsed)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal Recibir Paquete (hover) */}
          {selectedIncomingPackage && incomingPackageDetails && (
            <div
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000
              }}
              onClick={() => { setSelectedIncomingPackage(null); setIncomingPackageDetails(null); }}
            >
              <div
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: '12px',
                  padding: '24px',
                  minWidth: '450px',
                  maxWidth: '550px',
                  maxHeight: '85vh',
                  overflow: 'auto'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: t.primary }}>
                    {language === 'es' ? 'Recibir Paquete' : 'Receive Package'}
                  </h3>
                  <button
                    onClick={() => { setSelectedIncomingPackage(null); setIncomingPackageDetails(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted, padding: '0 8px' }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: t.textMuted }}>
                  {selectedIncomingPackage.packageNumber} — {incomingPackageDetails.items?.length || 0} item(s)
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                    {language === 'es' ? 'Ubicación de recepción' : 'Reception Location'}
                  </label>
                  <select
                    value={receiveLocationId || ''}
                    onChange={(e) => setReceiveLocationId(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      backgroundColor: t.bgPanel,
                      color: t.text,
                      fontSize: '13px'
                    }}
                  >
                    <option value="">{language === 'es' ? '-- Seleccionar ubicación --' : '-- Select location --'}</option>
                    {hospitalLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        [{loc.locationType || loc.location_type}] {loc.code} - {loc.description || loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                    {language === 'es' ? 'Notas de recepción (opcional)' : 'Reception notes (optional)'}
                  </label>
                  <textarea
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    rows={3}
                    placeholder={language === 'es' ? 'Observaciones...' : 'Observations...'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      backgroundColor: t.bgPanel,
                      color: t.text,
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Items en el paquete */}
                <div style={{ marginBottom: '20px', maxHeight: '200px', overflow: 'auto' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textMuted, textTransform: 'uppercase' }}>
                    {language === 'es' ? 'Items en el paquete' : 'Items in package'}
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: t.bgPanel }}>
                        <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>Serial</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>Parte</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>Defecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomingPackageDetails.items?.map(item => (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                          <td style={{ padding: '8px', fontFamily: 'monospace', color: t.primary }}>{item.serialNumber || '-'}</td>
                          <td style={{ padding: '8px', color: t.text }}>{item.partNumber || '-'}</td>
                          <td style={{ padding: '8px', color: t.text }}>{item.defectSummary || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setSelectedIncomingPackage(null); setIncomingPackageDetails(null); }}
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
                    onClick={handleReceivePackage}
                    disabled={receiving}
                    style={{
                      padding: '10px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: t.primary,
                      color: '#fff',
                      cursor: receiving ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: receiving ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle size={18} />
                    {receiving
                      ? (language === 'es' ? 'Recibiendo...' : 'Receiving...')
                      : (language === 'es' ? 'Confirmar Recepción' : 'Confirm Reception')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: ALERTS ========== */}
      {!loading && activeTab === 'alerts' && (
        <div>
          <div style={{
            padding: '16px 20px',
            backgroundColor: alertPackages.length > 0 ? '#dc262610' : t.bg,
            borderRadius: '8px',
            border: `1px solid ${alertPackages.length > 0 ? '#dc2626' : t.border}`,
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, color: alertPackages.length > 0 ? '#dc2626' : t.text }}>
              {alertPackages.length > 0
                ? (language === 'es' ? `${alertPackages.length} paquete(s) con alerta` : `${alertPackages.length} package(s) with alerts`)
                : (language === 'es' ? 'Sin alertas' : 'No alerts')}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: t.textMuted, fontSize: '13px' }}>
              {language === 'es'
                ? 'Paquetes que excedieron el tiempo límite de transferencia'
                : 'Packages that exceeded the transfer time limit'}
            </p>
          </div>

          {alertPackages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alertPackages.map(pkg => {
                const targetMinutes = pkg.alertHours || 60;
                const elapsed = pkg.minutesElapsed || 0;
                const exceeded = Math.max(0, elapsed - targetMinutes);

                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      if (pkg.direction === 'sent') {
                        setActiveTab('sent');
                        loadPackageDetails(pkg, 'sent');
                      } else {
                        setActiveTab('receive');
                        loadPackageDetails(pkg, 'incoming');
                      }
                    }}
                    style={{
                      padding: '16px',
                      backgroundColor: t.bg,
                      borderRadius: '8px',
                      border: '1px solid #dc2626',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: pkg.direction === 'incoming' ? '#dc262620' : '#3b82f620',
                        color: pkg.direction === 'incoming' ? '#dc2626' : '#3b82f6',
                        border: `1px solid ${pkg.direction === 'incoming' ? '#dc2626' : '#3b82f6'}`
                      }}>
                        {pkg.direction === 'incoming'
                          ? (language === 'es' ? 'Entrante' : 'Incoming')
                          : (language === 'es' ? 'Saliente' : 'Outgoing')}
                      </span>
                      <div>
                        <div style={{ fontWeight: '600', color: t.text, fontSize: '15px' }}>
                          {pkg.packageNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted }}>
                          {pkg.direction === 'sent'
                            ? (language === 'es' ? 'Enviado a MRB' : 'Sent to MRB')
                            : (language === 'es' ? 'Desde MRB → Recibir' : 'From MRB → Receive')}
                          {' • '}{pkg.itemCount} item(s)
                        </div>
                      </div>
                    </div>

                    {/* Tiempos: Target / Transcurrido / Excedido */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', padding: '8px 12px', backgroundColor: t.bgHover, borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>
                          {language === 'es' ? 'Target' : 'Target'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>
                          {formatMinutes(targetMinutes)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 12px', backgroundColor: '#f59e0b20', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#f59e0b', textTransform: 'uppercase' }}>
                          {language === 'es' ? 'Transcurrido' : 'Elapsed'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                          {formatMinutes(elapsed)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 12px', backgroundColor: '#dc262620', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#dc2626', textTransform: 'uppercase' }}>
                          {language === 'es' ? 'Excedido' : 'Exceeded'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>
                          +{formatMinutes(exceeded)}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: t.textMuted }}>
                        {language === 'es' ? 'Creado por' : 'Created by'}: {pkg.createdByName}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textMuted }}>
                        {new Date(pkg.createdAt).toLocaleString('es-MX')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== MODAL: SEND PACKAGE ========== */}
      {showSendModal && (
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
            backgroundColor: t.bg,
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={24} />
              {language === 'es' ? 'Enviar Paquete a MRB' : 'Send Package to MRB'}
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>
                {language === 'es' ? 'Campaña MRB (opcional)' : 'MRB Campaign (optional)'}
              </label>
              <select
                value={sendCampaignId || ''}
                onChange={(e) => setSendCampaignId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bg,
                  color: t.text
                }}
              >
                <option value="">{language === 'es' ? 'Sin campaña específica' : 'No specific campaign'}</option>
                {availableCampaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.campaignNumber} - {c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>
                {language === 'es' ? 'Ubicación MRB destino' : 'MRB Destination Location'}
              </label>
              <select
                value={sendDestinationLocationId || ''}
                onChange={(e) => setSendDestinationLocationId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bg,
                  color: t.text
                }}
              >
                <option value="">{language === 'es' ? 'Seleccionar ubicación...' : 'Select location...'}</option>
                {mrbLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code} - {loc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>
                {language === 'es' ? 'Tiempo de alerta (minutos)' : 'Alert time (minutes)'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  value={sendAlertMinutes}
                  onChange={(e) => setSendAlertMinutes(parseInt(e.target.value) || 60)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    backgroundColor: t.bg,
                    color: t.text
                  }}
                />
                <span style={{ fontSize: '12px', color: t.textMuted }}>
                  ({sendAlertMinutes >= 60 ? `${Math.floor(sendAlertMinutes / 60)}h ${sendAlertMinutes % 60}m` : `${sendAlertMinutes}m`})
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>
                {language === 'es' ? 'Notas' : 'Notes'}
              </label>
              <textarea
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
                placeholder={language === 'es' ? 'Notas opcionales...' : 'Optional notes...'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bg,
                  color: t.text,
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: t.bgHover,
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '13px', color: t.text }}>
                <strong>{selectedDefects.size}</strong> {language === 'es' ? 'defectos seleccionados' : 'defects selected'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSendPackage}
                disabled={sending}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sending ? 'wait' : 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Send size={16} />
                {sending
                  ? (language === 'es' ? 'Enviando...' : 'Sending...')
                  : (language === 'es' ? 'Crear Paquete' : 'Create Package')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HospitalTransferPackages;
