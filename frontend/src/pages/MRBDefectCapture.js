import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Plus, Home, List, BarChart3,
  Search, Package, Layers, Hash, Users, Info, Eye,
  RefreshCw, Scissors, RotateCcw, Truck, PauseCircle, Trash2, Calendar
} from 'lucide-react';
import { useTheme, ThemeSelector } from '../context/ThemeContext';

/**
 * MRBDefectCapture - Plataforma de Inspección para Campañas MRB
 *
 * Flujo:
 * 1. Seleccionar campaña MRB activa → auto-puebla cliente/proyecto
 * 2. Seleccionar parte (filtrada al MRB, memoriza última)
 * 3. Seleccionar turno (requerido para reporte por turno)
 * 4. Modo individual: capturar defecto + disposición pieza por pieza
 * 5. Modo masivo: tally sheet con ACUM + CAP por defecto × disposición
 */

const API_URL = 'http://localhost:5000';

const DISPOSITION_CONFIG = {
  USE_AS_IS:       { label: 'Usar Como Está',    color: '#22c55e', bg: '#d1fae5', icon: '✓' },
  REWORK:          { label: 'Retrabajo',          color: '#f59e0b', bg: '#fef3c7', icon: '⟳' },
  SCRAP:           { label: 'Scrap',              color: '#ef4444', bg: '#fee2e2', icon: '✕' },
  RETURN_SUPPLIER: { label: 'Devolver Proveedor', color: '#8b5cf6', bg: '#ede9fe', icon: '↩' },
  HOLD:            { label: 'En Hold',            color: '#6b7280', bg: '#f3f4f6', icon: '⏸' },
};

const DISP_COLS = [
  { code: 'REWORK',          label: 'Rework',  color: '#f59e0b', bg: '#fef3c7' },
  { code: 'SCRAP',           label: 'Scrap',   color: '#ef4444', bg: '#fee2e2' },
  { code: 'HOLD',            label: 'Hold',    color: '#6b7280', bg: '#f3f4f6' },
  { code: 'RETURN_SUPPLIER', label: 'Return',  color: '#8b5cf6', bg: '#ede9fe' },
  { code: 'USE_AS_IS',       label: 'UAI',     color: '#22c55e', bg: '#d1fae5' },
];

const MRBDefectCapture = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  // ── MODE ──────────────────────────────────────────────────────────────────
  const [captureMode, setCaptureMode] = useState('individual'); // 'individual' | 'bulk'

  // ── CATALOG STATE ─────────────────────────────────────────────────────────
  const [campaigns, setCampaigns]             = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignParts, setCampaignParts]     = useState([]);
  const [selectedPart, setSelectedPart]       = useState(null);
  const [currentUser, setCurrentUser]         = useState(null);
  const [shifts, setShifts]                   = useState([]);
  const [selectedShift, setSelectedShift]     = useState(null);
  const [stages, setStages]                   = useState([]);
  const [dispositions, setDispositions]       = useState([]);
  const [severities, setSeverities]           = useState([]);
  const [partDefects, setPartDefects]         = useState([]);
  const [defectsByCategory, setDefectsByCategory] = useState([]);
  const [defectFilter, setDefectFilter]       = useState('');

  // ── INDIVIDUAL MODE STATE ─────────────────────────────────────────────────
  const [selectedStage, setSelectedStage]           = useState(null);
  const [selectedDisposition, setSelectedDisposition] = useState(null);
  const [selectedSeverity, setSelectedSeverity]     = useState(null);
  const [hasDowntime, setHasDowntime]               = useState(false);
  const [downtimeMinutes, setDowntimeMinutes]       = useState('');
  const [lotNumber, setLotNumber]                   = useState('');
  const [comment, setComment]                       = useState('');
  const [selectedDefect, setSelectedDefect]         = useState(null);
  const [stagedEvidence, setStagedEvidence]         = useState([]); // { file, previewUrl }
  const [uploadedEvidence, setUploadedEvidence]     = useState([]); // last submitted entry's attachments
  const serialCheckTimer                            = useRef(null);

  // ── BULK / TALLY MODE STATE ───────────────────────────────────────────────
  const [okQty, setOkQty]               = useState('');
  const [accumulatedOk, setAccumulatedOk] = useState(0);
  const [defectGrid, setDefectGrid]     = useState({});
  const [accumulated, setAccumulated]   = useState({});
  const [turnNotes, setTurnNotes]       = useState('');
  const [savedCount, setSavedCount]     = useState(0);
  const [lastSaved, setLastSaved]       = useState(null);

  // ── TALLY SHEETS ──────────────────────────────────────────────────────────
  const [tallySheets, setTallySheets]       = useState([]);
  const [uploadingTally, setUploadingTally] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // ── SCAN INPUT REF ────────────────────────────────────────────────────────
  const scanRef = useRef(null);
  const refocusScan = useCallback(() => {
    setTimeout(() => { if (scanRef.current) scanRef.current.focus(); }, 80);
  }, []);

  // ── UI STATE ──────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingShift, setClosingShift]   = useState(false);
  const [pendingShift, setPendingShift]   = useState(null); // { shiftId, shiftName, date, campaignId, campaignName }
  const [pendingShiftNote, setPendingShiftNote] = useState('');
  const [horasWorked, setHorasWorked]     = useState(8);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  const [showCriteria, setShowCriteria] = useState(false);
  const [shiftDuplicateWarning, setShiftDuplicateWarning] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // ── INITIAL LOAD ──────────────────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);

  // Auto-focus scan field when entering individual mode or on mount
  useEffect(() => {
    if (captureMode === 'individual') refocusScan();
  }, [captureMode]); // eslint-disable-line

  const loadInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [campRes, shiftsRes, stagesRes, dispRes, sevRes, userRes] = await Promise.all([
        fetch(`${API_URL}/mrb/active-campaigns`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/shifts`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/stages`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/dispositions`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/severities`, { headers: h }),
        fetch(`${API_URL}/auth/me`, { headers: h }),
      ]);
      const [campData, shiftsData, stagesData, dispData, sevData, userData] = await Promise.all([
        campRes.json(), shiftsRes.json(), stagesRes.json(),
        dispRes.json(), sevRes.json(), userRes.ok ? userRes.json() : null
      ]);
      const campList = campData.campaigns || [];
      setCampaigns(campList);
      setShifts(shiftsData.items || []);
      setStages(stagesData.items || []);
      setDispositions(dispData.items || []);
      setSeverities(sevData.items || []);
      if (userData?.user) setCurrentUser(userData.user);

      // MRB: restaurar turno solo si es el mismo día
      const lastShiftId   = localStorage.getItem('mrbLastShiftId');
      const lastShiftDate = localStorage.getItem('mrbLastShiftDate');
      const today         = new Date().toISOString().split('T')[0];
      if (lastShiftId && lastShiftDate === today) {
        const lastShift = (shiftsData.items || []).find(s => s.id === parseInt(lastShiftId));
        if (lastShift) setSelectedShift(lastShift);
      } else if (lastShiftId && lastShiftDate && lastShiftDate !== today) {
        // Día distinto — hay turno sin registrar formalmente
        const lastShift    = (shiftsData.items || []).find(s => s.id === parseInt(lastShiftId));
        const lastCampId   = localStorage.getItem('mrbCaptureCampaignId');
        const lastCamp     = lastCampId ? campList.find(c => c.id === parseInt(lastCampId)) : null;
        if (lastShift) {
          setPendingShift({
            shiftId:      parseInt(lastShiftId),
            shiftName:    lastShift.name || lastShift.code,
            date:         lastShiftDate,
            campaignId:   lastCampId ? parseInt(lastCampId) : null,
            campaignName: lastCamp?.folio || lastCamp?.campaignNumber || `Campaña #${lastCampId}`
          });
        }
        localStorage.removeItem('mrbLastShiftId');
        localStorage.removeItem('mrbLastShiftDate');
      }

      const savedId = localStorage.getItem('mrbCaptureCampaignId');
      if (savedId) {
        const saved = campList.find(c => c.id === parseInt(savedId));
        if (saved) await selectCampaign(saved);
      }
    } catch (e) {
      showMsg('Error cargando datos', true);
    } finally {
      setLoading(false);
    }
  };

  const detectCurrentShift = (list) => {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    for (const s of list) {
      if (s.startTime && s.endTime) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const start = sh * 60 + sm, end = eh * 60 + em;
        if (end > start ? (cur >= start && cur < end) : (cur >= start || cur < end)) return s;
      }
    }
    return list[0] || null;
  };

  // ── CAMPAIGN / PART SELECTION ─────────────────────────────────────────────
  const selectCampaign = async (campaign) => {
    setSelectedCampaign(campaign);
    setSelectedDefect(null);
    setPartDefects([]);
    setDefectsByCategory([]);
    setDefectGrid({});
    setTallySheets([]);
    setOkQty('');
    setAccumulatedOk(0);
    if (!campaign) { setCampaignParts([]); setSelectedPart(null); return; }
    localStorage.setItem('mrbCaptureCampaignId', campaign.id);

    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const res = await fetch(`${API_URL}/mrb/${campaign.id}/parts`, { headers: h });
      const data = await res.json();
      const parts = data.parts || [];
      setCampaignParts(parts);
      const lastPartId = localStorage.getItem(`mrbLastPart_${campaign.id}`);
      const lastPart = parts.find(p => p.id === parseInt(lastPartId)) || parts[0] || null;
      if (lastPart) selectPart(lastPart, campaign.id);
      else setSelectedPart(null);
    } catch (e) {
      setCampaignParts([]);
    }

    // Load tally sheets
    try {
      const tr = await fetch(`${API_URL}/mrb/${campaign.id}/campaign-progress`, { headers: h });
      const td = await tr.json();
      if (td.success) setTallySheets((td.rows || []).flatMap(r => r.tallies || []));
    } catch (e) { /* silent */ }
  };

  const selectPart = (part, campaignId) => {
    setSelectedPart(part);
    setSelectedDefect(null);
    if (!part?.id) return;
    localStorage.setItem(`mrbLastPart_${campaignId || selectedCampaign?.id}`, part.id);
    loadPartDefects(part.id);
  };

  const loadPartDefects = async (partId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/defects-v2/parts/${partId}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const defects = data.defects || [];
      setPartDefects(defects);
      const grouped = defects.reduce((acc, d) => {
        const catId = d.categoryId || 0;
        const ex = acc.find(g => g.categoryId === catId);
        if (ex) ex.defects.push(d);
        else acc.push({ categoryId: catId, categoryName: d.categoryName || 'Sin Categoría', categoryColor: d.categoryColor || '#6b7280', defects: [d] });
        return acc;
      }, []);
      grouped.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      setDefectsByCategory(grouped);
      const grid = {};
      defects.forEach(d => { grid[d.id] = { REWORK: '', SCRAP: '', HOLD: '', RETURN_SUPPLIER: '', USE_AS_IS: '' }; });
      setDefectGrid(grid);
    } catch (e) {
      setPartDefects([]); setDefectsByCategory([]); setDefectGrid({});
    }
  };

  const loadAccumulated = async (campaignId, shiftId, partId) => {
    if (!campaignId) return;
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({ date: today });
    if (shiftId) params.set('shiftId', shiftId);
    if (partId)  params.set('partId', partId);
    try {
      const res = await fetch(`${API_URL}/mrb/${campaignId}/shift-defects?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAccumulated(data.accumulated || {});
        if (data.totalOk > 0) setAccumulatedOk(data.totalOk);
      }
    } catch (e) { /* silent */ }
  };

  // Reload accumulated when part/shift/campaign changes
  useEffect(() => {
    setAccumulatedOk(0);
    setAccumulated({});
    if (selectedCampaign && selectedShift && selectedPart) {
      loadAccumulated(selectedCampaign.id, selectedShift.id, selectedPart.id);
    }
  }, [selectedShift?.id, selectedPart?.id, selectedCampaign?.id]); // eslint-disable-line

  // Check duplicate only when shift or campaign changes (not on part change)
  useEffect(() => {
    setShiftDuplicateWarning(false);
    if (selectedCampaign && selectedShift && currentUser?.id) {
      checkShiftDuplicate(selectedCampaign.id, selectedShift.id);
    }
  }, [selectedShift?.id, selectedCampaign?.id, currentUser?.id]); // eslint-disable-line

  const checkShiftDuplicate = async (campaignId, shiftId) => {
    if (!currentUser?.id) return;
    const today = new Date().toISOString().split('T')[0];
    // Primary check: was this shift formally registered by this user today?
    const regKey = `mrbRegistered_${campaignId}_${shiftId}_${today}_${currentUser.id}`;
    if (localStorage.getItem(regKey)) {
      setShowDuplicateModal(true);
      return;
    }
    // Fallback: check if there are inspection entries (covers data from other sessions/devices)
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${API_URL}/mrb/${campaignId}/shift-defects?date=${today}&shiftId=${shiftId}&inspectorId=${currentUser.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        const acc = data.accumulated || {};
        const hasNok = Object.values(acc).some(disp =>
          Object.values(disp).some(v => parseInt(v) > 0)
        );
        if (hasNok || data.totalOk > 0) setShowDuplicateModal(true);
      }
    } catch (e) { /* silent */ }
  };

  // ── GRID HELPERS (BULK MODE) ──────────────────────────────────────────────
  const setCell = (defectId, dispCode, val) =>
    setDefectGrid(prev => ({ ...prev, [defectId]: { ...prev[defectId], [dispCode]: val } }));

  const capCell  = (defectId, dispCode) => parseInt(defectGrid[defectId]?.[dispCode]) || 0;
  const acumCell = (defectId, dispCode) => parseInt(accumulated[defectId]?.[dispCode]) || 0;
  const rowCapTotal  = (defectId) => DISP_COLS.reduce((s, col) => s + capCell(defectId, col.code), 0);
  const rowAcumTotal = (defectId) => DISP_COLS.reduce((s, col) => s + acumCell(defectId, col.code), 0);
  const colCapTotal  = (dispCode) => partDefects.reduce((s, d) => s + capCell(d.id, dispCode), 0);
  const colAcumTotal = (dispCode) => partDefects.reduce((s, d) => s + acumCell(d.id, dispCode), 0);
  const totalNok = DISP_COLS.reduce((s, col) => s + colCapTotal(col.code), 0);
  const totalOk  = parseInt(okQty) || 0;

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 3500); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 2500); }
  };

  // ── SERIAL CHECK (debounce 300ms) ─────────────────────────────────────────
  const handleSerialChange = (val) => {
    setLotNumber(val);
    if (serialCheckTimer.current) clearTimeout(serialCheckTimer.current);
    if (!val || !selectedCampaign) return;
    serialCheckTimer.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(
          `${API_URL}/mrb/${selectedCampaign.id}/check-serial?lotNumber=${encodeURIComponent(val)}&date=${today}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.exists) {
          setComment(prev => prev.includes('[Reproceso]') ? prev : (prev ? `${prev} [Reproceso]` : '[Reproceso]'));
        }
      } catch (e) { /* silent */ }
    }, 300);
  };

  // ── INDIVIDUAL MODE HANDLERS ──────────────────────────────────────────────
  const handlePiezaOk = useCallback(async () => {
    if (!selectedCampaign) return showMsg('Selecciona una campaña MRB', true);
    if (!selectedShift) return showMsg('Selecciona el turno', true);
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-ok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: 1, shiftId: selectedShift.id, partId: selectedPart?.id, lotNumber: lotNumber.trim() || undefined, inspectionDate: new Date().toLocaleDateString('en-CA') })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setSelectedCampaign(prev => ({ ...prev, ...result.mrb }));
      setLotNumber('');
      showMsg('✓ Pieza OK');
      refocusScan();
    } catch (e) { showMsg(e.message || 'Error', true); refocusScan(); }
    finally { setSubmitting(false); }
  }, [selectedCampaign, selectedShift, selectedPart, lotNumber]); // eslint-disable-line

  const handleSubmitDefect = async () => {
    if (!selectedCampaign) return showMsg('Selecciona una campaña MRB', true);
    if (!selectedShift) return showMsg('Selecciona el turno', true);
    if (!selectedDefect) return showMsg('Selecciona un defecto', true);
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-nok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partId: selectedPart?.id,
          defectTypeId: selectedDefect.id,
          severityId: selectedSeverity?.id,
          stageId: selectedStage?.id,
          dispositionId: selectedDisposition?.id,
          shiftId: selectedShift.id,
          lotNumber: lotNumber || null,
          downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0,
          notes: comment || null,
          quantity: 1
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setSelectedCampaign(prev => ({ ...prev, ...result.mrb }));
      // Upload staged evidence linked by serial
      if (stagedEvidence.length > 0 && lotNumber) {
        const today = new Date().toISOString().split('T')[0];
        const uploaded = [];
        for (const item of stagedEvidence) {
          const fd = new FormData();
          fd.append('file', item.file);
          fd.append('attachmentType', 'defect_evidence');
          fd.append('lotNumber', lotNumber);
          fd.append('shiftId', selectedShift.id);
          fd.append('inspectionDate', today);
          const r = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/attachments`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
          });
          const d = await r.json();
          if (d.success) uploaded.push(d.attachment);
        }
        setStagedEvidence([]);
        setUploadedEvidence([]);
      } else {
        setStagedEvidence([]);
      }
      setSelectedDefect(null);
      setLotNumber('');
      setComment('');
      setHasDowntime(false);
      setDowntimeMinutes('');
      showMsg(!selectedDisposition
        ? `NOK registrado — Sin disposición, pieza puesta en On Hold`
        : `NOK registrado — ${result.defect?.entryNumber || ''}`);
      refocusScan();
    } catch (e) { showMsg(e.message || 'Error', true); refocusScan(); }
    finally { setSubmitting(false); }
  };

  // ── BULK MODE: GUARDAR AVANCE ─────────────────────────────────────────────
  const handleGuardarAvance = async () => {
    if (!selectedCampaign) return showMsg('Selecciona una campaña MRB', true);
    if (!selectedShift)    return showMsg('Selecciona el turno', true);
    if (totalOk === 0 && totalNok === 0) return showMsg('Ingresa al menos una cantidad', true);

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      if (totalOk > 0) {
        await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-ok`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ quantity: totalOk, shiftId: selectedShift.id, partId: selectedPart?.id, notes: turnNotes || null, inspectionDate: new Date().toLocaleDateString('en-CA') })
        });
      }

      const dispMap = {};
      dispositions.forEach(d => { dispMap[d.code] = d.id; });

      for (const defect of partDefects) {
        for (const col of DISP_COLS) {
          const qty = parseInt(defectGrid[defect.id]?.[col.code]) || 0;
          if (qty <= 0) continue;
          await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-nok`, {
            method: 'POST', headers: h,
            body: JSON.stringify({ partId: selectedPart?.id, defectTypeId: defect.id, dispositionId: dispMap[col.code] || null, shiftId: selectedShift.id, quantity: qty, notes: turnNotes || null })
          });
        }
      }

      const refreshRes = await fetch(`${API_URL}/mrb/active-campaigns`, { headers: { Authorization: `Bearer ${token}` } });
      const refreshData = await refreshRes.json();
      const updated = (refreshData.campaigns || []).find(c => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);

      const savedEntries = [];
      for (const defect of partDefects) {
        for (const col of DISP_COLS) {
          const qty = parseInt(defectGrid[defect.id]?.[col.code]) || 0;
          if (qty > 0) savedEntries.push({ defectName: defect.name, dispLabel: col.label, dispColor: col.color, qty });
        }
      }
      setLastSaved({ time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), ok: totalOk, entries: savedEntries });

      const cleanGrid = {};
      partDefects.forEach(d => { cleanGrid[d.id] = { REWORK: '', SCRAP: '', HOLD: '', RETURN_SUPPLIER: '', USE_AS_IS: '' }; });
      setOkQty('');
      setDefectGrid(cleanGrid);
      setTurnNotes('');
      setSavedCount(prev => prev + 1);
      if (totalOk > 0) setAccumulatedOk(prev => prev + totalOk);
      loadAccumulated(selectedCampaign.id, selectedShift.id, selectedPart?.id);
      showMsg(`Avance guardado: ${totalOk} OK · ${totalNok} NOK ✓`);
    } catch (e) {
      showMsg(e.message || 'Error al guardar', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegistrarTurno = async () => {
    if (totalOk > 0 || totalNok > 0) await handleGuardarAvance();
    setShowCloseModal(false);
    setClosingShift(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/campaign-progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const today = new Date().toLocaleDateString('en-CA');
      const shiftRow = (data.rows || []).find(r =>
        String(r.inspectionDate).substring(0, 10) === today && r.shiftId === selectedShift?.id
      );
      const nokTotal  = parseInt(shiftRow?.totalNok  || 0);
      const okTotal   = parseInt(shiftRow?.totalOk   || 0);
      const inspTotal = okTotal + nokTotal;
      // Log turno en historial de campaña
      try {
        await fetch(`${API_URL}/mrb/${selectedCampaign.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            comment: `📋 Turno registrado: ${selectedShift?.name || selectedShift?.code} — ${inspTotal} inspeccionadas (${okTotal} OK / ${nokTotal} NOK) por ${currentUser?.firstName || currentUser?.name || 'Inspector'}${turnNotes.trim() ? ` — Nota: ${turnNotes.trim()}` : ''}`,
            commentType: 'system'
          })
        });
      } catch (_) { /* silent */ }
      // Save shift hours for cost tracking
      try {
        await fetch(`${API_URL}/mrb/${selectedCampaign.id}/shift-hours`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            shiftId: selectedShift?.id,
            inspectionDate: today,
            inspectorCount: selectedCampaign.inspectorCount || 1,
            supervisorCount: selectedCampaign.supervisorCount || 0,
            hoursWorked: horasWorked,
            notes: turnNotes.trim() || null
          })
        });
      } catch (_) { /* silent */ }
      showMsg(`✓ Turno ${selectedShift?.code} cerrado — ${nokTotal} NOK`);
      // Mark this shift as registered so duplicate check can detect it
      const regKey = `mrbRegistered_${selectedCampaign.id}_${selectedShift.id}_${today}_${currentUser?.id}`;
      localStorage.setItem(regKey, '1');
      localStorage.removeItem('mrbLastShiftId');
      localStorage.removeItem('mrbLastShiftDate');
      setSavedCount(0);
      setAccumulatedOk(0);
      setAccumulated({});
      setTallySheets([]);
      setLastSaved(null);
      setTurnNotes('');
      setHorasWorked(8);
      setStagedEvidence([]);
      setUploadedEvidence([]);
      setSelectedShift(null);
    } catch (e) {
      showMsg('Turno registrado', false);
    } finally {
      setClosingShift(false);
    }
  };

  // ── FILE UPLOAD ───────────────────────────────────────────────────────────
  const handleUploadFile = async (files, attachmentType) => {
    if (!selectedCampaign) return showMsg('Selecciona una campaña MRB', true);
    if (!files?.length) return;
    const setter = attachmentType === 'tally_sheet' ? setUploadingTally : setUploadingEvidence;
    setter(true);
    const token = localStorage.getItem('token');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('attachmentType', attachmentType);
        if (attachmentType === 'tally_sheet' && selectedShift?.id) fd.append('shiftId', selectedShift.id);
        fd.append('inspectionDate', new Date().toISOString().split('T')[0]);
        const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/attachments`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (attachmentType === 'tally_sheet' && data.attachment) {
          setTallySheets(prev => [...prev, { ...data.attachment, shiftName: selectedShift?.name || null }]);
        }
      }
      showMsg(attachmentType === 'tally_sheet' ? 'Tally sheet subido ✓' : 'Evidencia subida ✓');
    } catch (e) {
      showMsg(e.message || 'Error al subir archivo', true);
    } finally {
      setter(false);
    }
  };

  const handleDeleteEvidence = async (attachId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/attachments/${attachId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUploadedEvidence(prev => prev.filter(e => e.id !== attachId));
      else showMsg(data.message || 'Error al eliminar', true);
    } catch (e) { showMsg('Error al eliminar', true); }
  };

  const handleDeleteTally = async (tallyId) => {
    if (!window.confirm('¿Eliminar este tally sheet?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/attachments/${tallyId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setTallySheets(prev => prev.filter(t => t.id !== tallyId));
      else showMsg(data.message || 'Error al eliminar', true);
    } catch (e) { showMsg('Error al eliminar', true); }
  };

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const isIndividualValid = selectedCampaign && selectedShift && selectedDefect && lotNumber.trim();
  const isOkValid         = selectedCampaign && selectedShift && lotNumber.trim();

  const filteredDefects = defectsByCategory.map(cat => ({
    ...cat,
    defects: cat.defects.filter(d =>
      !defectFilter ||
      d.name.toLowerCase().includes(defectFilter.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(defectFilter.toLowerCase()))
    )
  })).filter(cat => cat.defects.length > 0);

  // ── STYLES ────────────────────────────────────────────────────────────────
  const s = {
    container: { minHeight: '100vh', backgroundColor: t.bg, display: 'flex', flexDirection: 'column' },
    header: { backgroundColor: t.bgPanel, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `2px solid ${t.border}`, flexWrap: 'wrap' },
    select: { padding: '8px 12px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '14px' },
    badge: { padding: '8px 14px', backgroundColor: t.bgInput, borderRadius: '6px', fontSize: '13px', color: t.text, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' },
    counter: (color, bg) => ({ padding: '7px 14px', backgroundColor: bg, borderRadius: '8px', fontSize: '15px', fontWeight: '700', color, display: 'flex', alignItems: 'center', gap: '6px' }),
    piezaOkBtn: { padding: '10px 20px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    iconBtn: { padding: '8px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, cursor: 'pointer' },
    campaignRow: { backgroundColor: t.bgPanel, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1px solid ${t.border}`, flexWrap: 'wrap' },
    criteriaBar: { backgroundColor: `${t.accent}12`, borderLeft: `4px solid ${t.accent}`, padding: '10px 16px', fontSize: '13px', color: t.text, display: 'flex', gap: '24px', flexWrap: 'wrap' },
    mainContent: { flex: 1, display: 'flex', padding: '14px', gap: '14px' },
    leftPanel: { width: '240px', backgroundColor: t.bgPanel, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { color: t.textMuted, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' },
    fieldSelect: { padding: '9px 10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px' },
    fieldInput: { padding: '9px 10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px' },
    textarea: { padding: '9px 10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px', minHeight: '56px', resize: 'vertical' },
    rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' },
    defectsPanel: { flex: 1, backgroundColor: t.bgPanel, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column' },
    submitPanel: { backgroundColor: t.bgPanel, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
    submitBtn: (disabled) => ({ padding: '14px 24px', backgroundColor: disabled ? t.textDim : '#B00020', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }),
    alert: (isErr) => ({ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isErr ? '#fef2f2' : '#f0fdf4', color: isErr ? '#B00020' : '#16a34a', border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}` }),
  };

  if (loading) return <div style={{ ...s.container, justifyContent: 'center', alignItems: 'center' }}><div style={{ color: t.text, fontSize: '18px' }}>Cargando...</div></div>;

  const c = selectedCampaign;

  return (
    <div style={s.container}>
      {error   && <div style={s.alert(true)}><XCircle size={16} />{error}</div>}
      {success && <div style={s.alert(false)}><CheckCircle size={16} />{success}</div>}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={{ ...s.badge, backgroundColor: t.bgPanel, border: `1px solid ${t.border}` }}>
          <Users size={14} />
          {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '...'}
        </div>

        <select
          style={{ ...s.select, borderColor: selectedShift ? t.accent : '#ef4444', fontWeight: '600' }}
          value={selectedShift?.id || ''}
          onChange={e => {
            const sh = shifts.find(sh => sh.id === parseInt(e.target.value)) || null;
            setSelectedShift(sh);
            if (sh) {
              const today = new Date().toISOString().split('T')[0];
              localStorage.setItem('mrbLastShiftId', sh.id);
              localStorage.setItem('mrbLastShiftDate', today);
            } else {
              localStorage.removeItem('mrbLastShiftId');
              localStorage.removeItem('mrbLastShiftDate');
            }
          }}
        >
          <option value="">⚠ Turno...</option>
          {shifts.map(sh => <option key={sh.id} value={sh.id}>{sh.code} — {sh.name}</option>)}
        </select>

        {/* Counters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <div style={s.counter(t.accent, `${t.accent}20`)}><Package size={16} /> {c?.qtyInspected || 0} INSP</div>
          <div style={s.counter('#2E7D32', '#d1fae5')}><CheckCircle size={16} /> {c?.qtyOk || 0} OK</div>
          <div style={s.counter('#ef4444', '#fee2e2')}><XCircle size={16} /> {c?.qtyNok || 0} NOK</div>
          {(c?.qtyRework > 0) && <div style={s.counter('#f59e0b', '#fef3c7')}><RotateCcw size={14} /> {c.qtyRework} RW</div>}
          {(c?.qtyScrap  > 0) && <div style={s.counter('#ef4444', '#fee2e2')}><Scissors size={14} /> {c.qtyScrap} SC</div>}
          {captureMode === 'individual' && (
            <button style={{ ...s.piezaOkBtn, opacity: (submitting || !isOkValid) ? 0.5 : 1 }} onClick={handlePiezaOk} disabled={submitting || !isOkValid} title={!lotNumber.trim() ? 'Escanea el serial primero' : ''}>
              <CheckCircle size={18} /> PIEZA OK
            </button>
          )}
          {captureMode === 'individual' && c && selectedShift && (
            <button
              onClick={() => setShowCloseModal(true)}
              disabled={closingShift}
              style={{ padding: '8px 16px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={15} /> Registrar Turno
            </button>
          )}
          {captureMode === 'bulk' && c && selectedShift && (
            <button
              onClick={() => setShowCloseModal(true)}
              disabled={closingShift}
              style={{ padding: '8px 16px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={15} /> Registrar Turno
              {savedCount > 0 && <span style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>{savedCount}</span>}
            </button>
          )}
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', backgroundColor: t.bgInput, borderRadius: '8px', padding: '3px', gap: '3px' }}>
          {['individual', 'bulk'].map(mode => (
            <button key={mode} onClick={() => setCaptureMode(mode)} style={{ padding: '7px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', backgroundColor: captureMode === mode ? t.accent : 'transparent', color: captureMode === mode ? 'white' : t.textMuted }}>
              {mode === 'individual'
                ? <><Hash size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Uno a Uno</>
                : <><Layers size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Masivo</>}
            </button>
          ))}
        </div>

        <ThemeSelector />

        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={s.iconBtn} onClick={() => navigate('/mrb-campaigns')} title="Campañas"><List size={18} /></button>
          <button style={s.iconBtn} onClick={() => navigate('/mrb-dashboard')} title="Dashboard"><BarChart3 size={18} /></button>
          <button style={{ ...s.iconBtn, backgroundColor: t.accent, color: 'white', border: 'none' }} onClick={() => navigate('/')}><Home size={18} /></button>
        </div>
      </div>

      {/* ── CAMPAIGN ROW ───────────────────────────────────────────────────── */}
      <div style={s.campaignRow}>
        <select
          style={{ ...s.select, flex: 2, fontWeight: c ? '600' : '400', borderColor: c ? t.accent : t.border }}
          value={c?.id || ''}
          onChange={e => selectCampaign(campaigns.find(x => x.id === parseInt(e.target.value)) || null)}
        >
          <option value="">📋 Seleccionar Campaña MRB...</option>
          {campaigns.map(camp => (
            <option key={camp.id} value={camp.id}>{camp.folio} — {camp.title} [{camp.clientName}]</option>
          ))}
        </select>

        {c && <>
          <div style={{ ...s.badge, backgroundColor: `${t.accent}15`, color: t.accent }}><Users size={13} /> {c.clientName}</div>
          {c.projectNumber && <div style={s.badge}><Info size={13} /> {c.projectNumber}</div>}
        </>}

        {c && campaignParts.length > 0 && (
          <select
            style={{ ...s.select, flex: 1, fontWeight: '600' }}
            value={selectedPart?.id || ''}
            onChange={e => selectPart(campaignParts.find(x => x.id === parseInt(e.target.value)) || null)}
          >
            <option value="">Parte...</option>
            {campaignParts.map(p => (
              <option key={p.id} value={p.id}>{p.captureDisplayName || p.partNumber} — {p.partName}</option>
            ))}
          </select>
        )}

        {c?.inspectionCriteria && (
          <button
            style={{ ...s.iconBtn, backgroundColor: showCriteria ? `${t.accent}20` : 'transparent', color: showCriteria ? t.accent : t.textMuted }}
            onClick={() => setShowCriteria(v => !v)} title="Ver criterio"
          >
            <Eye size={18} />
          </button>
        )}

        {c && (
          <label style={{ ...s.iconBtn, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '13px', fontWeight: '600', color: uploadingTally ? t.textMuted : t.accent, borderColor: t.accent }} title="Subir Tally Sheet">
            <Plus size={16} />{uploadingTally ? 'Subiendo...' : 'Tally Sheet'}
            <input type="file" accept="image/*,.pdf" multiple onChange={e => { handleUploadFile(e.target.files, 'tally_sheet'); e.target.value = ''; }} style={{ display: 'none' }} disabled={uploadingTally} />
          </label>
        )}

        <button style={s.iconBtn} onClick={loadInitialData} title="Actualizar"><RefreshCw size={18} /></button>
      </div>

      {/* ── DATE + SHIFT BAR ──────────────────────────────────────────────── */}
      {c && (
        <div style={{ backgroundColor: t.bg, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: `1px solid ${t.border}`, fontSize: '13px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMuted }}>
            <Calendar size={13} />
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {selectedShift
            ? <span style={{ padding: '2px 10px', backgroundColor: `${t.accent}20`, color: t.accent, borderRadius: '10px', fontWeight: '700', fontSize: '12px' }}>{selectedShift.code} — {selectedShift.name}</span>
            : <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '12px' }}>⚠ Sin turno seleccionado</span>}
          {captureMode === 'bulk' && savedCount > 0 && (
            <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: '600', fontSize: '12px' }}>
              ✓ {savedCount} lote{savedCount > 1 ? 's' : ''} guardado{savedCount > 1 ? 's' : ''} este turno
            </span>
          )}
        </div>
      )}

      {/* ── CRITERIA BAR ───────────────────────────────────────────────────── */}
      {c && showCriteria && (
        <div style={s.criteriaBar}>
          {(c.photoNokPath || c.photoOkPath) && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {c.photoNokPath && <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#B00020', fontWeight: '700', marginBottom: '4px' }}>NOK</div><img src={`${API_URL}${c.photoNokPath}`} alt="NOK" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #B00020', cursor: 'zoom-in' }} onClick={() => window.open(`${API_URL}${c.photoNokPath}`, '_blank')} /></div>}
              {c.photoOkPath && <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '700', marginBottom: '4px' }}>OK</div><img src={`${API_URL}${c.photoOkPath}`} alt="OK" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #22c55e', cursor: 'zoom-in' }} onClick={() => window.open(`${API_URL}${c.photoOkPath}`, '_blank')} /></div>}
            </div>
          )}
          {c.inspectionCriteria && <div style={{ flex: 1 }}><div style={{ fontSize: '11px', fontWeight: '700', color: t.accent, marginBottom: '4px', textTransform: 'uppercase' }}>Criterio de Inspección</div><div style={{ fontSize: '13px' }}>{c.inspectionCriteria}</div></div>}
          {c.dispositionInstructions && <div style={{ flex: 1 }}><div style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase' }}>Instrucciones de Disposición</div><div style={{ fontSize: '13px' }}>{c.dispositionInstructions}</div></div>}
        </div>
      )}

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      {!c ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: t.textMuted }}>
          <Package size={56} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: '18px' }}>Selecciona una campaña MRB para comenzar</div>
        </div>

      ) : captureMode === 'individual' ? (

        /* ══ INDIVIDUAL MODE ══════════════════════════════════════════════ */
        <div style={s.mainContent}>
          {/* Left panel */}
          <div style={s.leftPanel}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Escanear / Serie</label>
              <input
                ref={scanRef}
                type="text"
                style={{ ...s.fieldInput, borderColor: lotNumber ? t.accent : t.border, fontSize: '15px', fontWeight: '600' }}
                placeholder="Escanear pieza..."
                value={lotNumber}
                onChange={e => { handleSerialChange(e.target.value); if (!e.target.value) setUploadedEvidence([]); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (selectedDefect && isIndividualValid) handleSubmitDefect();
                    else if (isOkValid) handlePiezaOk();
                  }
                }}
                autoComplete="off"
              />
              <span style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>
                Enter → {selectedDefect ? 'registrar NOK' : 'registrar OK'}
              </span>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Disposición {!selectedDisposition && <span style={{ color: '#f59e0b', fontSize: '10px', fontWeight: '600' }}>→ On Hold por defecto</span>}</label>
              <select style={s.fieldSelect} value={selectedDisposition?.id || ''} onChange={e => setSelectedDisposition(dispositions.find(d => d.id === parseInt(e.target.value)) || null)}>
                <option value="">Sin especificar (On Hold)</option>
                {dispositions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Tiempo de Paro</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" style={{ width: '18px', height: '18px', cursor: 'pointer' }} checked={hasDowntime} onChange={e => setHasDowntime(e.target.checked)} />
                <input type="number" style={{ ...s.fieldInput, flex: 1 }} placeholder="min" value={downtimeMinutes} onChange={e => setDowntimeMinutes(e.target.value)} disabled={!hasDowntime} />
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Severidad</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {severities.map(sev => (
                  <button key={sev.id} type="button" onClick={() => setSelectedSeverity(selectedSeverity?.id === sev.id ? null : sev)} style={{ flex: 1, padding: '8px 4px', border: `2px solid ${selectedSeverity?.id === sev.id ? (sev.color || t.accent) : t.border}`, borderRadius: '6px', backgroundColor: selectedSeverity?.id === sev.id ? (sev.color || t.accent) : t.bgInput, color: selectedSeverity?.id === sev.id ? 'white' : t.text, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    {sev.code || sev.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Comentario</label>
              <textarea style={s.textarea} placeholder="Observaciones..." value={comment} onChange={e => setComment(e.target.value)} />
            </div>

            {/* Evidencia fotográfica */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Evidencia</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', backgroundColor: lotNumber ? t.bgInput : t.bgPanel, border: `1px dashed ${lotNumber ? t.accent : t.border}`, borderRadius: '6px', cursor: lotNumber ? 'pointer' : 'not-allowed', opacity: lotNumber ? 1 : 0.5, fontSize: '12px', color: t.textMuted }}>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!lotNumber}
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const newItems = files.map(f => ({ file: f, previewUrl: URL.createObjectURL(f), id: Math.random() }));
                    setStagedEvidence(prev => [...prev, ...newItems]);
                    e.target.value = '';
                  }} />
                📷 {lotNumber ? 'Agregar fotos' : 'Requiere serial'}
              </label>
              {/* Staged photos */}
              {stagedEvidence.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {stagedEvidence.map(item => (
                    <div key={item.id} style={{ position: 'relative', width: '56px', height: '56px' }}>
                      <img src={item.previewUrl} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${t.border}` }} />
                      <button onClick={() => { URL.revokeObjectURL(item.previewUrl); setStagedEvidence(prev => prev.filter(i => i.id !== item.id)); }}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: 'white', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Uploaded photos (last submitted) */}
              {uploadedEvidence.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600', marginBottom: '4px' }}>✓ Subidas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {uploadedEvidence.map(att => (
                      <div key={att.id} style={{ position: 'relative', width: '56px', height: '56px' }}>
                        <a href={`${API_URL}${att.filePath}`} target="_blank" rel="noreferrer">
                          <img src={`${API_URL}${att.filePath}`} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #86efac' }} />
                        </a>
                        <button onClick={() => handleDeleteEvidence(att.id)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: 'white', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={s.rightPanel}>
            <div style={s.defectsPanel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: t.textMuted, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Defectos {selectedPart ? `— ${selectedPart.captureDisplayName || selectedPart.partNumber}` : ''} ({partDefects.length})
                </span>
                {partDefects.length > 6 && (
                  <input type="text" placeholder="Buscar..." value={defectFilter} onChange={e => setDefectFilter(e.target.value)} style={{ ...s.fieldInput, width: '160px', padding: '5px 10px', fontSize: '13px' }} />
                )}
              </div>
              {partDefects.length === 0 ? (
                <div style={{ color: t.textMuted, textAlign: 'center', padding: '40px', fontSize: '14px' }}>
                  {selectedPart ? 'No hay defectos configurados para esta parte.' : 'Selecciona una parte para ver los defectos.'}
                </div>
              ) : (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredDefects.map(cat => (
                    <div key={cat.categoryId} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '4px', borderBottom: `2px solid ${cat.categoryColor}` }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: cat.categoryColor }} />
                        <span style={{ color: t.text, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>{cat.categoryName}</span>
                        <span style={{ color: t.textMuted, fontSize: '11px' }}>({cat.defects.length})</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {cat.defects.map(d => (
                          <button key={d.id} type="button" onClick={() => setSelectedDefect(selectedDefect?.id === d.id ? null : d)} style={{ padding: '12px 16px', borderRadius: '8px', border: `2px solid ${selectedDefect?.id === d.id ? t.accent : (d.color || t.border)}`, backgroundColor: selectedDefect?.id === d.id ? t.accent : t.bgInput, color: selectedDefect?.id === d.id ? 'white' : t.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', minWidth: '90px' }}>
                            {d.code && <span style={{ display: 'block', fontSize: '10px', opacity: 0.7 }}>{d.code}</span>}
                            {d.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.submitPanel}>
              <div style={{ padding: '10px 14px', backgroundColor: t.bgInput, borderRadius: '8px', color: t.text, fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
                {selectedDefect
                  ? `${selectedPart?.captureDisplayName || selectedPart?.partNumber || 'Parte'} │ ${selectedDefect.name} │ ${selectedDisposition ? dispositions.find(d => d.id === selectedDisposition.id)?.name : 'Sin disposición'}`
                  : 'Selecciona un defecto para continuar'}
              </div>
              <button style={s.submitBtn(!isIndividualValid || submitting)} onClick={handleSubmitDefect} disabled={!isIndividualValid || submitting}>
                <Plus size={18} /> {submitting ? 'GUARDANDO...' : 'AGREGAR DEFECTO NOK'}
              </button>
            </div>
          </div>
        </div>

      ) : (

        /* ══ BULK / TALLY MODE ════════════════════════════════════════════ */
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>

          {/* OK row ACUM + CAP */}
          <div style={{ backgroundColor: t.bgPanel, borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '2px solid #2E7D32', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#2E7D32', fontSize: '13px', textTransform: 'uppercase', borderRight: '2px solid #2E7D32' }}>
                <CheckCircle size={15} /> OK
              </div>
              <div style={{ padding: '10px 18px', backgroundColor: accumulatedOk > 0 ? '#bbf7d0' : '#f0fdf4', textAlign: 'center', borderRight: '1px solid #86efac', minWidth: '80px' }}>
                <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Acum</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#15803d' }}>{accumulatedOk || '—'}</div>
              </div>
              <div style={{ padding: '6px 10px', backgroundColor: 'white', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Cap</div>
                <input type="number" min="0" value={okQty} onChange={e => setOkQty(e.target.value)} placeholder="0"
                  style={{ width: '80px', padding: '6px 8px', fontSize: '22px', fontWeight: '700', textAlign: 'center', border: `2px solid ${parseInt(okQty) > 0 ? '#2E7D32' : '#d1d5db'}`, borderRadius: '6px', backgroundColor: parseInt(okQty) > 0 ? '#d1fae5' : 'white', color: '#2E7D32', outline: 'none' }} />
              </div>
            </div>
            {(totalOk > 0 || totalNok > 0) && (
              <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: t.textMuted }}>Esta captura:</span>
                {totalOk > 0  && <span style={{ fontWeight: '700', color: '#2E7D32', fontSize: '15px' }}>{totalOk} OK</span>}
                {totalNok > 0 && <span style={{ fontWeight: '700', color: '#B00020', fontSize: '15px' }}>{totalNok} NOK</span>}
              </div>
            )}
            {selectedPart && (
              <button onClick={() => loadPartDefects(selectedPart.id)} style={{ ...s.iconBtn, padding: '6px 12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', color: t.accent, borderColor: t.accent, marginLeft: totalOk === 0 && totalNok === 0 ? 'auto' : '0' }}>
                <RefreshCw size={13} /> Sincronizar defectos
              </button>
            )}
          </div>

          {/* Last saved banner */}
          {lastSaved && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' }}>
                <CheckCircle size={15} /> Último guardado — {lastSaved.time}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                {lastSaved.ok > 0 && <span style={{ padding: '2px 8px', backgroundColor: '#d1fae5', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>{lastSaved.ok} OK</span>}
                {lastSaved.entries.map((e, i) => (
                  <span key={i} style={{ padding: '2px 8px', backgroundColor: `${e.dispColor}20`, borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: e.dispColor }}>{e.defectName} → {e.dispLabel}: {e.qty}</span>
                ))}
              </div>
              <button onClick={() => setLastSaved(null)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '16px', padding: '0' }}>×</button>
            </div>
          )}

          {/* Tally grid */}
          <div style={{ backgroundColor: t.bgPanel, borderRadius: '10px', overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {partDefects.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: t.textMuted }}>
                {selectedPart ? 'No hay defectos configurados para esta parte.' : 'Selecciona una parte para ver los defectos.'}
              </div>
            ) : (
              <div style={{ overflow: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: t.bgCard }}>
                      <th rowSpan={2} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '700', color: t.textMuted, fontSize: '11px', textTransform: 'uppercase', borderBottom: `2px solid ${t.border}`, minWidth: '200px', backgroundColor: t.bgCard, boxShadow: `0 2px 0 ${t.border}`, verticalAlign: 'bottom' }}>Defecto</th>
                      {DISP_COLS.map(col => (
                        <th key={col.code} colSpan={2} style={{ padding: '8px 4px 4px', textAlign: 'center', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: col.color, borderBottom: `1px solid ${col.color}40`, borderLeft: `2px solid ${col.color}30`, backgroundColor: col.bg, minWidth: '140px' }}>
                          {col.label}
                        </th>
                      ))}
                      <th rowSpan={2} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', color: t.textMuted, fontSize: '11px', textTransform: 'uppercase', borderBottom: `2px solid ${t.border}`, minWidth: '70px', backgroundColor: t.bgCard, boxShadow: `0 2px 0 ${t.border}`, verticalAlign: 'bottom' }}>Total</th>
                    </tr>
                    <tr style={{ backgroundColor: t.bgCard }}>
                      {DISP_COLS.map(col => (
                        <React.Fragment key={col.code}>
                          <th style={{ padding: '4px 4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: col.color, borderBottom: `2px solid ${t.border}`, borderLeft: `2px solid ${col.color}30`, backgroundColor: `${col.bg}80`, boxShadow: `0 2px 0 ${t.border}`, minWidth: '52px' }}>ACUM</th>
                          <th style={{ padding: '4px 4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: t.textMuted, borderBottom: `2px solid ${t.border}`, backgroundColor: t.bgCard, boxShadow: `0 2px 0 ${t.border}`, minWidth: '68px' }}>CAP</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {defectsByCategory.map(cat => (
                      <React.Fragment key={cat.categoryId}>
                        <tr>
                          <td colSpan={DISP_COLS.length * 2 + 2} style={{ padding: '6px 16px', backgroundColor: `${cat.categoryColor}18`, borderTop: `2px solid ${cat.categoryColor}`, borderBottom: `1px solid ${cat.categoryColor}40` }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: cat.categoryColor }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: cat.categoryColor, display: 'inline-block' }} />
                              {cat.categoryName}
                            </span>
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: t.bgCard }}>
                          <th style={{ padding: '4px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` }}>Defecto</th>
                          {DISP_COLS.map(col => (
                            <React.Fragment key={col.code}>
                              <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: col.color, borderBottom: `1px solid ${t.border}`, borderLeft: `2px solid ${col.color}30`, backgroundColor: `${col.bg}60` }}>{col.label} ACUM</th>
                              <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: t.textMuted, borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgCard }}>{col.label} CAP</th>
                            </React.Fragment>
                          ))}
                          <th style={{ padding: '4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` }}>Total</th>
                        </tr>
                        {cat.defects.map((defect, idx) => {
                          const acumRowTotal = rowAcumTotal(defect.id);
                          const capRowTotal  = rowCapTotal(defect.id);
                          return (
                            <tr key={defect.id} style={{ backgroundColor: idx % 2 === 0 ? t.bgPanel : t.bgInput }}>
                              <td style={{ padding: '10px 16px', color: t.text, borderBottom: `1px solid ${t.border}` }}>
                                <div style={{ fontWeight: '600' }}>{defect.name}</div>
                                {defect.code && <div style={{ fontSize: '10px', color: t.textMuted, fontFamily: 'monospace' }}>{defect.code}</div>}
                              </td>
                              {DISP_COLS.map(col => {
                                const cap  = defectGrid[defect.id]?.[col.code] || '';
                                const acum = acumCell(defect.id, col.code);
                                return (
                                  <React.Fragment key={col.code}>
                                    <td style={{ padding: '6px 4px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, borderLeft: `2px solid ${col.color}30`, backgroundColor: acum > 0 ? `${col.bg}80` : 'transparent' }}>
                                      {acum > 0 ? <span style={{ fontWeight: '700', fontSize: '16px', color: col.color }}>{acum}</span> : <span style={{ color: t.textDim, fontSize: '13px' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'center', borderBottom: `1px solid ${t.border}` }}>
                                      <input type="number" min="0" value={cap} onChange={e => setCell(defect.id, col.code, e.target.value)} placeholder="0"
                                        style={{ width: '60px', padding: '7px 4px', fontSize: '15px', fontWeight: '700', textAlign: 'center', border: `2px solid ${parseInt(cap) > 0 ? col.color : t.border}`, borderRadius: '6px', backgroundColor: parseInt(cap) > 0 ? col.bg : t.bgInput, color: parseInt(cap) > 0 ? col.color : t.textMuted, outline: 'none' }} />
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td style={{ padding: '8px', textAlign: 'center', borderBottom: `1px solid ${t.border}` }}>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: acumRowTotal > 0 ? t.accent : t.textDim }}>{acumRowTotal || '—'}</div>
                                {capRowTotal > 0 && <div style={{ fontSize: '11px', color: '#B00020', fontWeight: '600' }}>+{capRowTotal}</div>}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: t.bgCard, borderTop: `2px solid ${t.border}` }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', color: t.textMuted, backgroundColor: t.bgCard, boxShadow: `0 -2px 0 ${t.border}` }}>TOTAL NOK</td>
                      {DISP_COLS.map(col => {
                        const acumT = colAcumTotal(col.code);
                        const capT  = colCapTotal(col.code);
                        return (
                          <React.Fragment key={col.code}>
                            <td style={{ padding: '12px 4px', textAlign: 'center', fontWeight: '700', fontSize: '18px', color: acumT > 0 ? col.color : t.textDim, backgroundColor: acumT > 0 ? `${col.bg}80` : t.bgCard, boxShadow: `0 -2px 0 ${t.border}`, borderLeft: `2px solid ${col.color}30` }}>{acumT > 0 ? acumT : '—'}</td>
                            <td style={{ padding: '12px 4px', textAlign: 'center', fontWeight: '700', fontSize: '18px', backgroundColor: t.bgCard, boxShadow: `0 -2px 0 ${t.border}` }}>{capT > 0 ? <span style={{ color: '#B00020' }}>+{capT}</span> : '—'}</td>
                          </React.Fragment>
                        );
                      })}
                      <td style={{ padding: '12px 8px', textAlign: 'center', backgroundColor: t.bgCard, boxShadow: `0 -2px 0 ${t.border}` }}>
                        {DISP_COLS.reduce((s, col) => s + colAcumTotal(col.code), 0) > 0 && <div style={{ fontWeight: '700', fontSize: '16px', color: t.accent }}>{DISP_COLS.reduce((s, col) => s + colAcumTotal(col.code), 0)}</div>}
                        {totalNok > 0 && <div style={{ fontWeight: '700', fontSize: '14px', color: '#B00020' }}>+{totalNok}</div>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Tally sheets */}
          {(() => {
            const visibleTallies = selectedShift
              ? tallySheets.filter(ts => ts.shiftId === selectedShift.id)
              : tallySheets;
            if (!visibleTallies.length) return null;
            return (
            <div style={{ backgroundColor: t.bgPanel, borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Tally Sheets ({visibleTallies.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {visibleTallies.map((ts, i) => (
                  <div key={ts.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', overflow: 'hidden' }}>
                    <a href={`${API_URL}${ts.filePath}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', color: '#92400e', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                      📄 {ts.filename}
                      {ts.shiftName && <span style={{ fontSize: '10px', opacity: 0.7 }}>({ts.shiftName})</span>}
                      {ts.inspectionDate && <span style={{ fontSize: '10px', opacity: 0.7 }}>{String(ts.inspectionDate).substring(0, 10)}</span>}
                    </a>
                    {ts.id && <button onClick={() => handleDeleteTally(ts.id)} style={{ padding: '6px 8px', backgroundColor: '#fde68a', border: 'none', borderLeft: '1px solid #f59e0b', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>}
                  </div>
                ))}
              </div>
            </div>
            );
          })()}

          {/* Action row */}
          <div style={{ backgroundColor: t.bgPanel, borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <textarea style={{ flex: 1, minWidth: '200px', padding: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '13px', minHeight: '56px', resize: 'vertical' }} placeholder="Notas del turno (opcional)..." value={turnNotes} onChange={e => setTurnNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', backgroundColor: uploadingTally ? t.bgInput : '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', fontSize: '14px', fontWeight: '700', color: '#92400e', cursor: uploadingTally ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                📄 {uploadingTally ? 'Subiendo...' : 'Subir Tally Sheet'}
                <input type="file" multiple onChange={e => { handleUploadFile(e.target.files, 'tally_sheet'); e.target.value = ''; }} style={{ display: 'none' }} disabled={uploadingTally} />
              </label>
              <button onClick={handleGuardarAvance} disabled={submitting || (!totalOk && !totalNok)}
                style={{ padding: '14px 28px', backgroundColor: submitting || (!totalOk && !totalNok) ? t.textDim : '#B00020', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: submitting || (!totalOk && !totalNok) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                <CheckCircle size={18} /> {submitting ? 'GUARDANDO...' : 'GUARDAR AVANCE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DUPLICATE SHIFT MODAL ─────────────────────────────────────────── */}
      {showDuplicateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '28px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚠ Turno duplicado
            </div>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '20px', lineHeight: '1.6' }}>
              Ya tienes entradas registradas en el turno <strong style={{ color: t.text }}>{selectedShift?.code} — {selectedShift?.name}</strong> hoy.<br /><br />
              ¿Deseas continuar de todas formas y agregar más capturas a este turno?
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowDuplicateModal(false); setSelectedShift(null); }} style={{ flex: 1, padding: '12px', backgroundColor: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => setShowDuplicateModal(false)} style={{ flex: 2, padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Continuar de todas formas</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLOSE SHIFT MODAL ──────────────────────────────────────────────── */}
      {showCloseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '28px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: t.text, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={22} color="#7c3aed" /> Registrar Turno
            </div>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '16px', lineHeight: '1.6' }}>
              Cerrando <strong style={{ color: t.text }}>{selectedShift?.code} — {selectedShift?.name}</strong> de la campaña <strong style={{ color: t.text }}>{c?.folio}</strong>.
              <br /><br />
              {(totalOk > 0 || totalNok > 0)
                ? <span style={{ color: '#f59e0b' }}>⚠ Tienes <strong>{totalOk + totalNok}</strong> piezas sin guardar. Se guardarán automáticamente.</span>
                : (savedCount > 0 || accumulatedOk > 0 || Object.keys(accumulated).length > 0)
                  ? <span style={{ color: '#16a34a' }}>✓ Inspección registrada en este turno.</span>
                  : <span style={{ color: '#f59e0b' }}>⚠ Sin piezas inspeccionadas en este turno. Agrega una nota indicando el motivo.</span>
              }
            </div>

            {/* Horas trabajadas */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', flexShrink: 0 }}>Horas trabajadas en turno</label>
              <input
                type="number" min="0.5" max="24" step="0.5"
                value={horasWorked}
                onChange={e => setHorasWorked(parseFloat(e.target.value) || 8)}
                style={{ width: '80px', padding: '8px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.text, fontSize: '16px', fontWeight: '700', textAlign: 'center' }}
              />
              <span style={{ fontSize: '12px', color: t.textMuted }}>hrs</span>
            </div>

            {/* Nota de cierre de turno */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                {(() => { const noWork = savedCount === 0 && totalOk === 0 && totalNok === 0 && accumulatedOk === 0 && Object.keys(accumulated).length === 0; return noWork ? '*' : '(opcional)'; })()}
              </label>
              <textarea
                rows={3}
                placeholder={savedCount === 0 && totalOk === 0 && totalNok === 0 && accumulatedOk === 0 && Object.keys(accumulated).length === 0
                  ? 'Ej: Sin material disponible, línea parada, inspector reasignado...'
                  : 'Ej: Turno sin novedad, pausas por mantenimiento...'}
                value={turnNotes}
                onChange={e => setTurnNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.text, fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCloseModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              {(() => {
                const noWork = savedCount === 0 && totalOk === 0 && totalNok === 0 && accumulatedOk === 0 && Object.keys(accumulated).length === 0;
                return (
                <button
                  onClick={handleRegistrarTurno}
                  disabled={noWork && !turnNotes.trim()}
                  style={{ flex: 2, padding: '12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: (noWork && !turnNotes.trim()) ? 'not-allowed' : 'pointer', opacity: (noWork && !turnNotes.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle size={16} /> Confirmar y Cerrar Turno
                </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* ── PENDING SHIFT MODAL ────────────────────────────────────────────── */}
      {pendingShift && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '28px', maxWidth: '460px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚠ Turno sin registrar
            </div>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '16px', lineHeight: '1.6' }}>
              El <strong style={{ color: t.text }}>{pendingShift.shiftName}</strong> del <strong style={{ color: t.text }}>{pendingShift.date}</strong> de la campaña <strong style={{ color: t.text }}>{pendingShift.campaignName}</strong> nunca fue registrado formalmente.
              <br /><br />
              Agrega una nota y regístralo ahora para que quede en el historial.
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nota de cierre *</label>
              <textarea
                rows={3}
                placeholder="Ej: Turno completado sin novedad, inspector reasignado, sin material disponible..."
                value={pendingShiftNote}
                onChange={e => setPendingShiftNote(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.text, fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setPendingShift(null); setPendingShiftNote(''); }}
                style={{ flex: 1, padding: '12px', backgroundColor: t.bgInput, color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Omitir
              </button>
              <button
                disabled={!pendingShiftNote.trim()}
                onClick={async () => {
                  if (!pendingShift.campaignId || !pendingShiftNote.trim()) return;
                  const token = localStorage.getItem('token');
                  try {
                    await fetch(`${API_URL}/mrb/${pendingShift.campaignId}/comments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        comment: `📋 Turno registrado (retroactivo): ${pendingShift.shiftName} — ${pendingShift.date} — Nota: ${pendingShiftNote.trim()}`,
                        commentType: 'system'
                      })
                    });
                  } catch (_) { /* silent */ }
                  setPendingShift(null);
                  setPendingShiftNote('');
                }}
                style={{ flex: 2, padding: '12px', backgroundColor: !pendingShiftNote.trim() ? '#6b7280' : '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: !pendingShiftNote.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <CheckCircle size={16} /> Registrar Retroactivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRBDefectCapture;
