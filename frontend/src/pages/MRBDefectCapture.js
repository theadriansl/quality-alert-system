import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, XCircle, Plus, Home, List, BarChart3,
  Search, Package, Layers, Hash, Users, Info, Eye,
  RefreshCw, Scissors, RotateCcw, Truck, PauseCircle, Trash2, Calendar,
  Download, Upload, ChevronLeft, ChevronRight, ChevronUp, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DefectConsultTab, { DefectCounter } from '../components/DefectConsultTab';

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

const DISPOSITION_SEVERITY = {
  SCRAP:           'CRITICAL',
  REWORK:          'MAJOR',
  RETURN_SUPPLIER: 'MAJOR',
  HOLD:            'MINOR',
  USE_AS_IS:       'MINOR',
};

const MRBDefectCapture = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCampaignId = searchParams.get('campaignId');
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // Traducciones locales
  const L = {
    en: {
      selectShift: 'Select the shift', selectCampaign: 'Select at least one campaign', selectMRB: 'Select an MRB campaign', selectMrbLocation: 'Select MRB location', selectMrbStation: 'Select MRB station',
      selectDefect: 'Select a defect', errorSave: 'Error saving', errorUpload: 'Error uploading file', errorDelete: 'Error deleting',
      selectCampaignPlaceholder: 'Select MRB Campaign...', selectCampaignStart: 'Select an MRB campaign to start',
      noActiveCampaigns: 'No active campaigns for this part',
      noDefectsConfigured: 'No defects configured for this part.', selectPartDefects: 'Select a part to see defects.',
      selectDefectContinue: 'Select a defect to continue',
    },
    es: {
      selectShift: 'Selecciona el turno', selectCampaign: 'Selecciona al menos una campaña', selectMRB: 'Selecciona una campaña MRB', selectMrbLocation: 'Selecciona ubicación MRB', selectMrbStation: 'Selecciona estación MRB',
      selectDefect: 'Selecciona un defecto', errorSave: 'Error guardando', errorUpload: 'Error subiendo archivo', errorDelete: 'Error eliminando',
      selectCampaignPlaceholder: 'Seleccionar Campaña MRB...', selectCampaignStart: 'Selecciona una campaña MRB para comenzar',
      noActiveCampaigns: 'No hay campañas activas para esta parte',
      noDefectsConfigured: 'No hay defectos configurados para esta parte.', selectPartDefects: 'Selecciona una parte para ver los defectos.',
      selectDefectContinue: 'Selecciona un defecto para continuar',
    }
  }[language] || {};

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
  // Ubicación MRB (seleccionada en modal al entrar)
  const [mrbLocations, setMrbLocations]       = useState([]);
  const [selectedMrbLocation, setSelectedMrbLocation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mrbSelectedLocation');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Estaciones MRB (para inspección)
  const [mrbStations, setMrbStations]         = useState([]);
  const [selectedMrbStation, setSelectedMrbStation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mrbSelectedStation');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [stages, setStages]                   = useState([]);
  const [dispositions, setDispositions]       = useState([]);
  const [severities, setSeverities]           = useState([]);
  const [partDefects, setPartDefects]         = useState([]);
  const [defectsByCategory, setDefectsByCategory] = useState([]);
  const [defectFilter, setDefectFilter]       = useState('');

  // ── CATEGORY & PAGINATION STATE (UX improvements) ─────────────────────────
  const [selectedCategory, setSelectedCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('mrbCapture_selectedCategory');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [defectsPage, setDefectsPage] = useState(1);
  const DEFECTS_PER_PAGE = 15; // 3 rows × 5 columns grid

  const handleCategorySelect = useCallback((categoryId) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    setDefectsPage(1);
    localStorage.setItem('mrbCapture_selectedCategory', JSON.stringify(newCategory));
  }, [selectedCategory]);

  const selectedCategoryDefects = selectedCategory
    ? defectsByCategory.find(c => c.categoryId === selectedCategory)?.defects || []
    : [];

  const getPaginatedDefects = useCallback((defects) => {
    const startIndex = (defectsPage - 1) * DEFECTS_PER_PAGE;
    return defects.slice(startIndex, startIndex + DEFECTS_PER_PAGE);
  }, [defectsPage]);

  // Reset page when category changes
  useEffect(() => { setDefectsPage(1); }, [selectedCategory]);

  // ── INDIVIDUAL MODE STATE ─────────────────────────────────────────────────
  const [selectedStage, setSelectedStage]           = useState(null);
  const [selectedDisposition, setSelectedDisposition] = useState(null);
  const [selectedSeverity, setSelectedSeverity]     = useState(null);
  const [hasDowntime, setHasDowntime]               = useState(false);
  const [downtimeMinutes, setDowntimeMinutes]       = useState('');
  const [downtimeTodayMin, setDowntimeTodayMin]     = useState(0);
  const [lotNumber, setLotNumber]                   = useState('');
  const lotNumberRef                                = useRef('');
  const [comment, setComment]                       = useState('');
  const [defectConsultOpen, setDefectConsultOpen] = useState(false);
  const [selectedDefects, setSelectedDefects]       = useState([]); // Array de defectos seleccionados con campaignIds
  const [stagedEvidence, setStagedEvidence]         = useState([]); // { file, previewUrl }
  const [uploadedEvidence, setUploadedEvidence]     = useState([]); // last submitted entry's attachments
  const serialCheckTimer                            = useRef(null);

  // ── MULTI-CAMPAIGN MODE STATE ───────────────────────────────────────────────
  const [detectedPart, setDetectedPart]             = useState(null);  // { id, partNumber, partName, clientName }
  const [availableCampaigns, setAvailableCampaigns] = useState([]);    // Campañas activas para la parte detectada
  const [selectedCampaigns, setSelectedCampaigns]   = useState([]);    // Campañas seleccionadas (multi-select)
  const [campaignResults, setCampaignResults]       = useState({});    // { campaignId: 'OK' | 'NOK' | null }
  const lastDetectedPartId                          = useRef(null);    // Para mantener selección por lote

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
  const [tallyPreview, setTallyPreview] = useState({ open: false, file: null, preview: null });

  // ── IMPORT MASIVO STATE ─────────────────────────────────────────────────────
  const [importType, setImportType] = useState('OK'); // 'OK' | 'DEFECT'
  const [importDefectId, setImportDefectId] = useState(null);
  const [importDisposition, setImportDisposition] = useState('REWORK');
  const [importFile, setImportFile] = useState(null);
  const [importDragOver, setImportDragOver] = useState(false);
  const [campaignDefects, setCampaignDefects] = useState([]); // Defectos de la campaña
  const [importConflicts, setImportConflicts] = useState(null); // { conflicts: [], preview: {} }
  const [pendingImportData, setPendingImportData] = useState(null); // FormData guardado para re-submit
  const reprocessCommentRef = useRef(null); // Comentario para reprocesos (ref para evitar re-renders)

  // ── SCRAP VALIDATION STATE ─────────────────────────────────────────────────
  const [serialScrapped, setSerialScrapped] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [scrapInfo, setScrapInfo] = useState(null);

  // ── PRODUCTION INFO & VALIDATION STATE ─────────────────────────────────────
  const [productionInfo, setProductionInfo] = useState(null); // Info from production_entries
  const [hasRegisteredDefect, setHasRegisteredDefect] = useState(false); // Prevent duplicate registration
  const [lastEntryNumber, setLastEntryNumber] = useState(null); // Last registered defect entry number
  const [serialPartMismatch, setSerialPartMismatch] = useState(null); // { expected, found } if serial belongs to different part
  const [serialValidated, setSerialValidated] = useState(false); // True after serial lookup completes (blocks OK until validated)
  const [affectedStatus, setAffectedStatus] = useState({}); // { campaignId: 'IN_LIST' | 'OUT_OF_LIST' | 'NO_LIST_DEFINED' }
  const [priorInspectionResults, setPriorInspectionResults] = useState({}); // { campaignId: { inspected: bool, result: 'OK'|'NOK'|null } }

  // ── MULTI-CAMPAIGN INSPECTION MODAL STATE ────────────────────────────────
  const [multiCampaignModalOpen, setMultiCampaignModalOpen] = useState(false);
  const [multiCampaignDefectsData, setMultiCampaignDefectsData] = useState({}); // { campaignId: { defects: [], campaignNumber, title } }
  const [defectInspectionResults, setDefectInspectionResults] = useState({}); // { `${campaignId}-${defectId}`: 'OK' | 'NOK' | null }
  const [loadingMultiCampaignDefects, setLoadingMultiCampaignDefects] = useState(false);
  const [modalDispositionId, setModalDispositionId] = useState(null); // Disposición para NOKs en modal

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
  const [pendingShiftHours, setPendingShiftHours] = useState(8);
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

  // Recargar defectos cuando cambian las campañas seleccionadas
  useEffect(() => {
    if (detectedPart?.id && selectedCampaigns.length > 0) {
      const campaignIds = selectedCampaigns.map(c => c.campaignId);
      loadPartDefects(detectedPart.id, campaignIds);
    }
  }, [selectedCampaigns.length]); // eslint-disable-line

  const loadInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [campRes, shiftsRes, stagesRes, dispRes, sevRes, userRes, locationsRes, stationsRes] = await Promise.all([
        fetch(`${API_URL}/mrb/active-campaigns`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/shifts`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/stages`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/dispositions`, { headers: h }),
        fetch(`${API_URL}/inspection-catalogs/severities`, { headers: h }),
        fetch(`${API_URL}/auth/me`, { headers: h }),
        fetch(`${API_URL}/location-codes?type=MRB`, { headers: h }),
        fetch(`${API_URL}/station-config/stations?type=MRB`, { headers: h }),
      ]);
      const [campData, shiftsData, stagesData, dispData, sevData, userData, locationsData, stationsData] = await Promise.all([
        campRes.json(), shiftsRes.json(), stagesRes.json(),
        dispRes.json(), sevRes.json(), userRes.ok ? userRes.json() : null, locationsRes.json(), stationsRes.json()
      ]);
      const campList = campData.campaigns || [];
      setCampaigns(campList);
      setShifts(shiftsData.items || []);
      setStages(stagesData.items || []);
      setDispositions(dispData.items || []);
      setSeverities(sevData.items || []);
      if (userData?.user) setCurrentUser(userData.user);

      // Cargar ubicaciones MRB y restaurar selección de sesión
      const mrbLocationsList = locationsData.locations || [];
      setMrbLocations(mrbLocationsList);
      let hasLocation = false;
      const savedLocation = sessionStorage.getItem('mrbSelectedLocation');
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          const found = mrbLocationsList.find(l => l.id === parsed.id);
          if (found) {
            setSelectedMrbLocation(found);
            hasLocation = true;
          }
        } catch { /* ignore */ }
      }
      // Mostrar modal si no hay ubicación seleccionada
      if (!hasLocation && mrbLocationsList.length > 0) {
        setShowLocationModal(true);
      }

      // Cargar estaciones MRB y restaurar selección
      const mrbStationsList = stationsData.stations || [];
      setMrbStations(mrbStationsList);
      const savedStation = sessionStorage.getItem('mrbSelectedStation');
      if (savedStation) {
        try {
          const parsed = JSON.parse(savedStation);
          const found = mrbStationsList.find(s => s.id === parsed.id);
          if (found) setSelectedMrbStation(found);
        } catch { /* ignore */ }
      }

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

      // Prioridad: URL param > localStorage
      const targetId = urlCampaignId || localStorage.getItem('mrbCaptureCampaignId');
      if (targetId) {
        const target = campList.find(c => c.id === parseInt(targetId));
        if (target) await selectCampaign(target);
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
    setSelectedDefects([]);
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

    // Load campaign defects (for import masivo)
    try {
      const dr = await fetch(`${API_URL}/mrb/${campaign.id}/defects`, { headers: h });
      const dd = await dr.json();
      setCampaignDefects(dd.defects || []);
      // Default select first defect if any
      if ((dd.defects || []).length > 0) {
        setImportDefectId(dd.defects[0].defectTypeId);
      }
    } catch (e) { setCampaignDefects([]); }
  };

  const selectPart = (part, campaignId) => {
    setSelectedPart(part);
    setSelectedDefects([]);
    if (!part?.id) return;
    localStorage.setItem(`mrbLastPart_${campaignId || selectedCampaign?.id}`, part.id);
    // Pasar todas las campañas seleccionadas o la campaña individual
    const campaignIds = selectedCampaigns.length > 0
      ? selectedCampaigns.map(c => c.campaignId)
      : (campaignId ? [campaignId] : (selectedCampaign?.id ? [selectedCampaign.id] : []));
    loadPartDefects(part.id, campaignIds);
  };

  const loadPartDefects = async (partId, campaignIds = []) => {
    const token = localStorage.getItem('token');
    try {
      const defectsMap = new Map(); // defectTypeId -> { ...defect, campaignIds: [] }
      const campaignsWithoutDefects = []; // Campañas que no tienen defectos configurados

      // Cargar defectos de TODAS las campañas seleccionadas
      for (const campaignId of campaignIds) {
        try {
          const campRes = await fetch(`${API_URL}/mrb/${campaignId}/campaign-defects`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const campData = await campRes.json();
          if (campData.success && campData.defects && campData.defects.length > 0) {
            // Esta campaña tiene defectos configurados
            campData.defects.forEach(d => {
              if (defectsMap.has(d.defectTypeId)) {
                // Agregar esta campaña al defecto existente
                defectsMap.get(d.defectTypeId).campaignIds.push(campaignId);
              } else {
                defectsMap.set(d.defectTypeId, {
                  id: d.defectTypeId,
                  defectTypeId: d.defectTypeId,
                  name: d.name,
                  code: d.code,
                  categoryId: d.categoryId || 0,
                  categoryName: d.categoryName || 'Sin Categoría',
                  categoryColor: d.categoryColor || '#6b7280',
                  campaignIds: [campaignId]
                });
              }
            });
          } else {
            // Esta campaña NO tiene defectos configurados
            campaignsWithoutDefects.push(campaignId);
          }
        } catch (e) {
          campaignsWithoutDefects.push(campaignId);
        }
      }

      // Cargar defectos de la parte para campañas sin configuración
      if (campaignsWithoutDefects.length > 0 || campaignIds.length === 0) {
        const res = await fetch(`${API_URL}/defects-v2/parts/${partId}/config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const targetCampaigns = campaignsWithoutDefects.length > 0 ? campaignsWithoutDefects : campaignIds;
        (data.defects || []).forEach(d => {
          if (defectsMap.has(d.id)) {
            // Agregar campañas sin config a este defecto
            targetCampaigns.forEach(cid => {
              if (!defectsMap.get(d.id).campaignIds.includes(cid)) {
                defectsMap.get(d.id).campaignIds.push(cid);
              }
            });
          } else {
            defectsMap.set(d.id, {
              ...d,
              campaignIds: [...targetCampaigns]
            });
          }
        });
      }

      let defects = Array.from(defectsMap.values());

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

  // Load today's downtime total when campaign+shift change
  useEffect(() => {
    setDowntimeTodayMin(0);
    if (!selectedCampaign || !selectedShift) return;
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    fetch(`${API_URL}/mrb/${selectedCampaign.id}/shift-report?date=${today}&shiftId=${selectedShift.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      if (d.success) setDowntimeTodayMin(d.kpis?.downtimeMin || 0);
    }).catch(() => {});
  }, [selectedShift?.id, selectedCampaign?.id]); // eslint-disable-line

  // Check duplicate only when shift or campaign changes (not on part change)
  useEffect(() => {
    setShiftDuplicateWarning(false);
    if (selectedCampaign && selectedShift && currentUser?.id) {
      checkShiftDuplicate(selectedCampaign.id, selectedShift.id);
    }
  }, [selectedShift?.id, selectedCampaign?.id, currentUser?.id]); // eslint-disable-line

  // Auto-fill severity from disposition in individual mode
  useEffect(() => {
    if (!selectedDisposition || !severities.length) return;
    const sevCode = DISPOSITION_SEVERITY[selectedDisposition.code];
    if (!sevCode) return;
    const sev = severities.find(s => s.code === sevCode);
    if (sev) setSelectedSeverity(sev);
  }, [selectedDisposition?.id]); // eslint-disable-line

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

  // ── SERIAL CHECK (debounce 300ms) + PART DETECTION + SCRAP VALIDATION ─────
  const handleSerialChange = (val) => {
    setLotNumber(val);
    lotNumberRef.current = val;
    // Reset all validation states on serial change
    setSerialScrapped(false);
    setHasRegisteredDefect(false);
    setLastEntryNumber(null);
    setProductionInfo(null);
    setSerialPartMismatch(null);
    setAffectedStatus(null);
    setPriorInspectionResults({});
    if (serialCheckTimer.current) clearTimeout(serialCheckTimer.current);
    if (!val) {
      return;
    }

    serialCheckTimer.current = setTimeout(async () => {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];

      try {
        // 1. Buscar parte por serial + verificar SCRAP + info producción
        const lookupRes = await fetch(
          `${API_URL}/defects-v2/serial-lookup/${encodeURIComponent(val)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();

          // Capturar info de producción si existe
          if (lookupData.productionInfo) {
            setProductionInfo(lookupData.productionInfo);
          }

          // Verificar si está en SCRAP - advertir pero NO bloquear
          if (lookupData.isScrapped) {
            setSerialScrapped(true);
            setScrapInfo({
              serial: val,
              partNumber: lookupData.unit?.partNumber,
              partName: lookupData.unit?.partName,
              scrappedBy: lookupData.scrapInfo?.scrappedBy,
              scrappedAt: lookupData.scrapInfo?.scrappedAt,
              scrapNotes: lookupData.scrapInfo?.scrapNotes
            });
            setScrapModalOpen(true);
            // NO return - continuar para permitir registro de defecto (no OK)
          }

          if (lookupData.success && lookupData.unit) {
            const unit = lookupData.unit;
            const newPartId = unit.partId;

            // Verificar si el serial pertenece a una parte diferente a la seleccionada
            if (selectedPart && newPartId && selectedPart.id !== newPartId) {
              // Verificar si la parte del serial está en la campaña
              const matchingPart = campaignParts.find(p => p.id === newPartId);
              if (matchingPart) {
                // Auto-cambiar a la parte correcta
                selectPart(matchingPart, selectedCampaign?.id);
                setSerialPartMismatch(null);
              } else {
                // Parte no está en la campaña - advertir
                setSerialPartMismatch({
                  expected: selectedPart.partNumber,
                  found: unit.partNumber
                });
              }
            } else if (selectedCampaign && campaignParts.length > 0 && !selectedPart) {
              // No hay parte seleccionada, auto-seleccionar si está en campaña
              const matchingPart = campaignParts.find(p => p.id === newPartId);
              if (matchingPart) {
                selectPart(matchingPart, selectedCampaign.id);
              }
            }

            // Actualizar detectedPart y campañas disponibles (modo multi-campaña)
            if (newPartId !== lastDetectedPartId.current) {
              setDetectedPart({
                id: unit.partId,
                partNumber: unit.partNumber,
                partName: unit.partName,
                clientName: unit.clientName
              });
              lastDetectedPartId.current = newPartId;

              const campRes = await fetch(
                `${API_URL}/mrb/campaigns-by-part/${newPartId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (campRes.ok) {
                const campData = await campRes.json();
                setAvailableCampaigns(campData.campaigns || []);
                if ((campData.campaigns || []).length <= 3) {
                  setSelectedCampaigns(campData.campaigns || []);
                } else {
                  setSelectedCampaigns([]);
                }
                setCampaignResults({});
              }
            }
          }
        }

        // 2. Check si es reproceso en campaña seleccionada
        if (selectedCampaign) {
          const res = await fetch(
            `${API_URL}/mrb/${selectedCampaign.id}/check-serial?lotNumber=${encodeURIComponent(val)}&date=${today}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await res.json();
          if (data.exists) {
            setComment(prev => prev.includes('[Reproceso]') ? prev : (prev ? `${prev} [Reproceso]` : '[Reproceso]'));
          }
        }

        // 3. Check si serial está en lista de afectados (para todas las campañas seleccionadas)
        const campaignsToCheck = selectedCampaigns.length > 0
          ? selectedCampaigns
          : (selectedCampaign ? [{ campaignId: selectedCampaign.id }] : []);

        if (campaignsToCheck.length > 0) {
          const newAffectedStatus = {};
          const newPriorResults = {};
          for (const camp of campaignsToCheck) {
            const campId = camp.campaignId || camp.id;
            try {
              const affectedRes = await fetch(
                `${API_URL}/mrb/${campId}/check-affected/${encodeURIComponent(val)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (affectedRes.ok) {
                const affectedData = await affectedRes.json();
                newAffectedStatus[campId] = affectedData.affectedStatus;
                // Capturar resultado de inspección previa si existe
                if (affectedData.affectedSerial) {
                  newPriorResults[campId] = {
                    inspected: affectedData.affectedSerial.inspected || false,
                    result: affectedData.affectedSerial.inspectionResult || null
                  };
                }
              }
            } catch (e) { /* silent */ }
          }
          setAffectedStatus(newAffectedStatus);
          setPriorInspectionResults(newPriorResults);
        } else {
          setAffectedStatus({});
          setPriorInspectionResults({});
        }
      } catch (e) { /* silent */ }
    }, 300);
  };

  const isClosed = selectedCampaign?.status === 'CERRADA';

  // ── MULTI-CAMPAIGN SUBMIT HANDLER ───────────────────────────────────────────
  // Lógica automática: defectos → NOK a sus campañas, resto → OK automático
  const handleMultiCampaignSubmit = useCallback(async () => {
    if (!selectedMrbLocation) return showMsg(L.selectMrbLocation, true);
    if (!selectedMrbStation) return showMsg(L.selectMrbStation, true);
    if (!selectedShift) return showMsg(L.selectShift, true);
    if (selectedCampaigns.length === 0) return showMsg(L.selectCampaign, true);

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const today = new Date().toLocaleDateString('en-CA');
    let okCount = 0;
    let nokCount = 0;
    let errorCount = 0;

    // Tracking: qué campañas reciben al menos un defecto
    const campaignsWithDefects = new Set();

    try {
      // 1. Enviar defectos seleccionados a sus campañas correspondientes
      for (const defect of selectedDefects) {
        for (const campaignId of (defect.campaignIds || [])) {
          // Verificar que la campaña esté seleccionada
          if (!selectedCampaigns.find(c => c.campaignId === campaignId)) continue;

          campaignsWithDefects.add(campaignId);

          const body = {
            quantity: 1,
            shiftId: selectedShift.id,
            partId: detectedPart?.id,
            defectTypeId: defect.id,
            lotNumber: lotNumberRef.current.trim() || undefined,
            inspectionDate: today,
            downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0,
            notes: comment || null,
            severityId: selectedSeverity?.id || null,
            dispositionId: selectedDisposition?.id || null
          };

          try {
            const res = await fetch(`${API_URL}/mrb/${campaignId}/capture-nok`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(body)
            });
            if (res.ok) nokCount++;
            else errorCount++;
          } catch (e) {
            errorCount++;
          }
        }
      }

      // 2. Enviar OK automático a campañas que NO recibieron defectos
      for (const camp of selectedCampaigns) {
        if (campaignsWithDefects.has(camp.campaignId)) continue; // Ya tiene defecto(s)

        const body = {
          quantity: 1,
          shiftId: selectedShift.id,
          partId: detectedPart?.id,
          lotNumber: lotNumberRef.current.trim() || undefined,
          inspectionDate: today,
          downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0,
          notes: comment || null
        };

        try {
          const res = await fetch(`${API_URL}/mrb/${camp.campaignId}/capture-ok`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
          });
          if (res.ok) okCount++;
          else errorCount++;
        } catch (e) {
          errorCount++;
        }
      }

      // Upload staged evidence to the first campaign with defects (or first selected)
      if (stagedEvidence.length > 0 && lotNumberRef.current.trim()) {
        const targetCampaignId = campaignsWithDefects.size > 0
          ? Array.from(campaignsWithDefects)[0]
          : selectedCampaigns[0]?.campaignId;
        if (targetCampaignId) {
          for (const item of stagedEvidence) {
            const fd = new FormData();
            fd.append('file', item.file);
            fd.append('attachmentType', 'defect_evidence');
            fd.append('lotNumber', lotNumberRef.current.trim());
            fd.append('shiftId', selectedShift.id);
            fd.append('inspectionDate', today);
            try {
              await fetch(`${API_URL}/mrb/${targetCampaignId}/attachments`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
              });
            } catch (e) { /* ignore upload errors */ }
          }
        }
      }
      setStagedEvidence([]);
      setUploadedEvidence([]);

      // Reset para siguiente pieza
      setLotNumber('');
      lotNumberRef.current = '';
      setCampaignResults({});
      setSelectedDefects([]);
      setHasDowntime(false);
      setDowntimeMinutes('');
      setComment('');

      if (errorCount === 0) {
        const msg = nokCount > 0
          ? `✓ ${nokCount} NOK + ${okCount} OK registrados`
          : `✓ ${okCount} OK registrado(s)`;
        showMsg(msg);
      } else {
        showMsg(`${okCount + nokCount} OK, ${errorCount} errores`, true);
      }
      refocusScan();
    } catch (e) {
      showMsg(e.message || 'Error', true);
      refocusScan();
    } finally {
      setSubmitting(false);
    }
  }, [selectedShift, selectedCampaigns, selectedDefects, detectedPart, hasDowntime, downtimeMinutes, comment, selectedDisposition, selectedSeverity, stagedEvidence]); // eslint-disable-line

  // ── MULTI-CAMPAIGN INSPECTION MODAL FUNCTIONS ─────────────────────────────
  const openMultiCampaignInspectionModal = useCallback(async () => {
    if (!selectedMrbLocation) return showMsg(L.selectMrbLocation, true);
    if (!selectedMrbStation) return showMsg(L.selectMrbStation, true);
    if (!selectedShift) return showMsg(L.selectShift, true);
    if (selectedCampaigns.length === 0) return showMsg(L.selectCampaign, true);

    setLoadingMultiCampaignDefects(true);
    setMultiCampaignModalOpen(true);
    const token = localStorage.getItem('token');

    try {
      const defectsData = {};

      for (const camp of selectedCampaigns) {
        const priorResult = priorInspectionResults[camp.campaignId];
        try {
          const res = await fetch(`${API_URL}/mrb/${camp.campaignId}/campaign-defects`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          defectsData[camp.campaignId] = {
            campaignNumber: camp.campaignNumber,
            title: camp.title,
            defects: data.success && data.defects ? data.defects : [],
            priorInspected: priorResult?.inspected || false,
            priorResult: priorResult?.result || null
          };
        } catch (e) {
          defectsData[camp.campaignId] = {
            campaignNumber: camp.campaignNumber,
            title: camp.title,
            defects: [],
            priorInspected: priorResult?.inspected || false,
            priorResult: priorResult?.result || null
          };
        }
      }

      // Si alguna campaña no tiene defectos configurados, cargar defectos de la parte
      const campaignsWithoutDefects = Object.entries(defectsData)
        .filter(([_, v]) => v.defects.length === 0)
        .map(([k]) => parseInt(k));

      if (campaignsWithoutDefects.length > 0 && detectedPart?.id) {
        try {
          const res = await fetch(`${API_URL}/defects-v2/parts/${detectedPart.id}/config`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          const partDefects = (data.defects || []).map(d => ({
            defectTypeId: d.id,
            name: d.name,
            code: d.code,
            categoryName: d.categoryName || 'Sin Categoría'
          }));
          campaignsWithoutDefects.forEach(campId => {
            if (defectsData[campId]) {
              defectsData[campId].defects = partDefects;
            }
          });
        } catch (e) { /* silent */ }
      }

      setMultiCampaignDefectsData(defectsData);
      // Inicializar defectos: pre-cargar resultado anterior si existe
      // - Si campaña fue OK → todos los defectos pre-marcados como 'OK'
      // - Si campaña fue NOK o no inspeccionada → todos null (sin marcar)
      const initialResults = {};
      Object.entries(defectsData).forEach(([campId, campData]) => {
        const preloadAsOk = campData.priorInspected && campData.priorResult === 'OK';
        campData.defects.forEach(d => {
          initialResults[`${campId}-${d.defectTypeId}`] = preloadAsOk ? 'OK' : null;
        });
      });
      setDefectInspectionResults(initialResults);
    } catch (e) {
      showMsg('Error cargando defectos de campañas', true);
    } finally {
      setLoadingMultiCampaignDefects(false);
    }
  }, [selectedMrbLocation, selectedMrbStation, selectedShift, selectedCampaigns, detectedPart, priorInspectionResults]); // eslint-disable-line

  const handleMultiCampaignInspectionSubmit = useCallback(async () => {
    // Verificar que todos los defectos estén marcados
    const allDefectsMarked = Object.values(defectInspectionResults).every(v => v !== null);
    if (!allDefectsMarked) {
      showMsg('Debe marcar OK o NOK en todos los defectos', true);
      return;
    }

    // Verificar si hay NOKs y si hay disposición seleccionada
    const hasNoks = Object.values(defectInspectionResults).some(v => v === 'NOK');
    if (hasNoks && !modalDispositionId) {
      showMsg('Seleccione una disposición para los defectos NOK', true);
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const today = new Date().toLocaleDateString('en-CA');
    let okCount = 0;
    let nokCount = 0;
    let errorCount = 0;

    try {
      // Procesar cada campaña
      for (const [campaignId, campData] of Object.entries(multiCampaignDefectsData)) {
        const nokDefects = campData.defects.filter(d =>
          defectInspectionResults[`${campaignId}-${d.defectTypeId}`] === 'NOK'
        );

        if (nokDefects.length > 0) {
          // Registrar cada defecto NOK
          for (const defect of nokDefects) {
            const serialValue = lotNumberRef.current.trim() || lotNumber.trim();
            const body = {
              quantity: 1,
              shiftId: selectedShift.id,
              partId: detectedPart?.id,
              defectTypeId: defect.defectTypeId,
              serialNumber: serialValue || undefined,
              lotNumber: serialValue || undefined,
              inspectionDate: today,
              downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0,
              notes: comment || null,
              severityId: selectedSeverity?.id || null,
              dispositionId: modalDispositionId
            };

            try {
              const res = await fetch(`${API_URL}/mrb/${campaignId}/capture-nok`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
              });
              if (res.ok) nokCount++;
              else errorCount++;
            } catch (e) {
              errorCount++;
            }
          }
        } else {
          // Todos los defectos de esta campaña son OK → registrar OK
          const serialValue = lotNumberRef.current.trim() || lotNumber.trim();
          const body = {
            quantity: 1,
            shiftId: selectedShift.id,
            partId: detectedPart?.id,
            serialNumber: serialValue || undefined,
            lotNumber: serialValue || undefined,
            inspectionDate: today,
            downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0,
            notes: comment || null
          };

          try {
            const res = await fetch(`${API_URL}/mrb/${campaignId}/capture-ok`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(body)
            });
            if (res.ok) okCount++;
            else errorCount++;
          } catch (e) {
            errorCount++;
          }
        }
      }

      // Upload staged evidence
      if (stagedEvidence.length > 0 && lotNumberRef.current.trim()) {
        const targetCampaignId = Object.keys(multiCampaignDefectsData)[0];
        if (targetCampaignId) {
          for (const item of stagedEvidence) {
            const fd = new FormData();
            fd.append('file', item.file);
            fd.append('attachmentType', 'defect_evidence');
            fd.append('lotNumber', lotNumberRef.current.trim());
            fd.append('shiftId', selectedShift.id);
            fd.append('inspectionDate', today);
            try {
              await fetch(`${API_URL}/mrb/${targetCampaignId}/attachments`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
              });
            } catch (e) { /* ignore */ }
          }
        }
      }
      setStagedEvidence([]);
      setUploadedEvidence([]);

      // Reset
      setLotNumber('');
      lotNumberRef.current = '';
      setCampaignResults({});
      setSelectedDefects([]);
      setHasDowntime(false);
      setDowntimeMinutes('');
      setComment('');
      setMultiCampaignModalOpen(false);
      setMultiCampaignDefectsData({});
      setDefectInspectionResults({});
      setModalDispositionId(null);

      if (errorCount === 0) {
        const msg = nokCount > 0
          ? `✓ ${nokCount} NOK + ${okCount} OK registrados`
          : `✓ ${okCount} OK registrado(s)`;
        showMsg(msg);
      } else {
        showMsg(`${okCount + nokCount} OK, ${errorCount} errores`, true);
      }
      refocusScan();
    } catch (e) {
      showMsg(e.message || 'Error', true);
    } finally {
      setSubmitting(false);
    }
  }, [defectInspectionResults, multiCampaignDefectsData, selectedShift, detectedPart, hasDowntime, downtimeMinutes, comment, selectedSeverity, modalDispositionId, stagedEvidence, lotNumber]); // eslint-disable-line

  // ── INDIVIDUAL MODE HANDLERS ──────────────────────────────────────────────
  const handlePiezaOk = useCallback(async () => {
    if (!selectedCampaign) return showMsg(L.selectMRB, true);
    if (!selectedMrbLocation) return showMsg(L.selectMrbLocation, true);
    if (!selectedMrbStation) return showMsg(L.selectMrbStation, true);
    if (!selectedShift) return showMsg(L.selectShift, true);
    if (!selectedPart && campaignParts.length > 0) return showMsg('Seleccione una parte', true);
    // Validaciones de seguridad
    if (serialScrapped) return showMsg('Serial en SCRAP. No se puede registrar como OK.', true);
    if (serialPartMismatch) return showMsg(`Serial pertenece a ${serialPartMismatch.found}, no a la parte seleccionada.`, true);
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-ok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: 1, shiftId: selectedShift.id, partId: selectedPart?.id, lotNumber: lotNumberRef.current.trim() || undefined, inspectionDate: new Date().toLocaleDateString('en-CA'), downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0, notes: comment || null })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setSelectedCampaign(prev => ({ ...prev, ...result.mrb }));
      if (result.downtimeTodayMin !== undefined) setDowntimeTodayMin(result.downtimeTodayMin);
      setLotNumber('');
      lotNumberRef.current = '';
      setHasDowntime(false);
      setDowntimeMinutes('');
      setComment('');
      showMsg('✓ Pieza OK');
      refocusScan();
    } catch (e) { showMsg(e.message || 'Error', true); refocusScan(); }
    finally { setSubmitting(false); }
  }, [selectedCampaign, selectedShift, selectedPart, lotNumber, hasDowntime, downtimeMinutes, comment]); // eslint-disable-line

  const handleSubmitDefect = async () => {
    if (!selectedCampaign) return showMsg(L.selectMRB, true);
    if (!selectedMrbLocation) return showMsg(L.selectMrbLocation, true);
    if (!selectedMrbStation) return showMsg(L.selectMrbStation, true);
    if (!selectedShift) return showMsg(L.selectShift, true);
    if (!selectedPart && campaignParts.length > 0) return showMsg('Seleccione una parte', true);
    if (selectedDefects.length === 0) return showMsg(L.selectDefect, true);
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      // Enviar cada defecto seleccionado
      let lastResult = null;
      for (const defect of selectedDefects) {
        const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-nok`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            partId: selectedPart?.id,
            defectTypeId: defect.id,
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
        lastResult = result;
      }
      const result = lastResult;
      setSelectedCampaign(prev => ({ ...prev, ...result.mrb }));
      if (result.downtimeTodayMin !== undefined) setDowntimeTodayMin(result.downtimeTodayMin);
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
      // Guardar entry number y marcar defecto registrado
      const entryNum = result.defect?.entryNumber || '';
      setLastEntryNumber(entryNum);
      setHasRegisteredDefect(true);

      setSelectedDefects([]);
      setLotNumber('');
      lotNumberRef.current = '';
      setComment('');
      setHasDowntime(false);
      setDowntimeMinutes('');
      showMsg(entryNum
        ? `✓ NOK ${entryNum} registrado`
        : `✓ NOK registrado — Sin disposición, pieza en Hold`);
      refocusScan();
    } catch (e) { showMsg(e.message || 'Error', true); refocusScan(); }
    finally { setSubmitting(false); }
  };

  // ── BULK MODE: GUARDAR AVANCE ─────────────────────────────────────────────
  const handleGuardarAvance = async () => {
    if (!selectedCampaign) return showMsg(L.selectMRB, true);
    if (!selectedMrbLocation) return showMsg(L.selectMrbLocation, true);
    if (!selectedMrbStation) return showMsg(L.selectMrbStation, true);
    if (!selectedShift)    return showMsg(L.selectShift, true);
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
          const sevCode = DISPOSITION_SEVERITY[col.code];
          const sevId   = severities.find(s => s.code === sevCode)?.id || null;
          await fetch(`${API_URL}/mrb/${selectedCampaign.id}/capture-nok`, {
            method: 'POST', headers: h,
            body: JSON.stringify({ partId: selectedPart?.id, defectTypeId: defect.id, dispositionId: dispMap[col.code] || null, shiftId: selectedShift.id, quantity: qty, notes: turnNotes || null, severityId: sevId })
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
      showMsg(e.message || L.errorSave, true);
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
    if (!selectedCampaign) return showMsg(L.selectMRB, true);
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
      showMsg(e.message || L.errorUpload, true);
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
      else showMsg(data.message || L.errorDelete, true);
    } catch (e) { showMsg(L.errorDelete, true); }
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
      else showMsg(data.message || L.errorDelete, true);
    } catch (e) { showMsg(L.errorDelete, true); }
  };

  // ── IMPORT TALLY EXCEL ───────────────────────────────────────────────────
  const handleImportTally = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!selectedCampaign) return showMsg('Selecciona una campaña primero', true);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/import-tally/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setTallyPreview({ open: true, file, preview: data.preview });
      } else {
        showMsg(data.message || 'Error analizando archivo', true);
      }
    } catch (err) {
      showMsg('Error analizando tally', true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── CONFIRMAR IMPORT TALLY ─────────────────────────────────────────────────
  const handleConfirmTallyImport = async () => {
    if (!tallyPreview.file || !selectedCampaign) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', tallyPreview.file);
    if (selectedShift?.id) formData.append('shiftId', selectedShift.id);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/import-tally`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        const { totalOk, totalNok } = data.summary;
        showMsg(`✓ Importado: ${totalOk} OK, ${totalNok} NOK`);
        setTallyPreview({ open: false, file: null, preview: null });

        // Refresh campaign data
        const refreshRes = await fetch(`${API_URL}/mrb/active-campaigns`, { headers: { Authorization: `Bearer ${token}` } });
        const refreshData = await refreshRes.json();
        const updated = (refreshData.campaigns || []).find(c => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      } else {
        showMsg(data.message || 'Error importando', true);
      }
    } catch (err) {
      showMsg('Error importando tally', true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── IMPORT MASIVO SIMPLIFICADO ──────────────────────────────────────────────
  const handleMassImport = async (confirmedSerials = null, reprocessCommentText = null) => {
    if (!importFile || !selectedCampaign) return showMsg('Selecciona un archivo', true);
    if (!selectedMrbLocation) return showMsg(L.selectMrbLocation, true);
    if (!selectedMrbStation) return showMsg(L.selectMrbStation, true);
    if (!selectedShift) return showMsg('Selecciona un turno primero', true);
    if (importType === 'DEFECT' && !importDefectId) return showMsg('Selecciona un defecto', true);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('importType', importType);
    formData.append('shiftId', selectedShift.id);
    if (importType === 'DEFECT') {
      formData.append('defectTypeId', importDefectId);
      formData.append('disposition', importDisposition);
    }
    // Agregar seriales confirmados si vienen de re-submit
    if (confirmedSerials && confirmedSerials.length > 0) {
      formData.append('confirmedSerials', JSON.stringify(confirmedSerials));
    }
    // Agregar comentario de reproceso
    if (reprocessCommentText) {
      formData.append('reprocessComment', reprocessCommentText);
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/import-mass`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        let msg = importType === 'OK'
          ? `✓ Importados ${data.imported} registros OK`
          : `✓ Importados ${data.imported} registros con defecto ${data.defectName} → ${data.disposition}`;

        if (data.skipped > 0) {
          msg += ` | ${data.skipped} omitidos (parte no en campaña)`;
        }
        if (data.wrongPartCount > 0) {
          msg += ` | ⚠️ ${data.wrongPartCount} rechazados (serial no corresponde a la parte)`;
          // Mostrar ejemplos en consola para debug
          if (data.wrongPartSerials?.length > 0) {
            console.warn('Seriales rechazados por parte incorrecta:', data.wrongPartSerials);
          }
        }
        showMsg(msg, data.wrongPartCount > 0); // Mostrar como warning si hay rechazados
        setImportFile(null);
        setImportConflicts(null);
        setPendingImportData(null);
        if (reprocessCommentRef.current) reprocessCommentRef.current.value = '';

        // Refresh campaign data - fetch directo de la campaña específica
        try {
          const refreshRes = await fetch(`${API_URL}/mrb/${selectedCampaign.id}`, { headers: { Authorization: `Bearer ${token}` } });
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.mrb) {
            setSelectedCampaign(refreshData.mrb);
          } else {
            // Fallback: actualizar desde lista de campañas activas
            const listRes = await fetch(`${API_URL}/mrb/active-campaigns`, { headers: { Authorization: `Bearer ${token}` } });
            const listData = await listRes.json();
            const updated = (listData.campaigns || []).find(c => c.id === selectedCampaign.id);
            if (updated) setSelectedCampaign(updated);
          }
        } catch (refreshErr) {
          console.error('Error refreshing campaign:', refreshErr);
        }
      } else if (data.needsConfirmation) {
        // Mostrar modal de confirmación con preview
        setImportConflicts({
          conflicts: data.conflicts || [],
          preview: data.preview,
          wrongPartCount: data.wrongPartCount || 0,
          wrongPartSerials: data.wrongPartSerials || [],
          extendedCount: data.extendedCount || 0,
          extendedSerials: data.extendedSerials || [],
          skippedCount: data.skippedCount || 0,
          skippedSerials: data.skippedSerials || []
        });
        setPendingImportData({ file: importFile }); // Guardar referencia
      } else {
        showMsg(data.message || 'Error importando', true);
      }
    } catch (err) {
      showMsg('Error importando archivo', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar reproceso en conflictos
  const handleConfirmConflicts = async (selectedSerials, comment) => {
    if (selectedSerials.length === 0) {
      setImportConflicts(null);
      if (reprocessCommentRef.current) reprocessCommentRef.current.value = '';
      showMsg('Importación cancelada');
      return;
    }
    // Re-ejecutar import con los seriales confirmados y comentario
    await handleMassImport(selectedSerials, comment);
    if (reprocessCommentRef.current) reprocessCommentRef.current.value = '';
  };

  const handleImportDrop = (e) => {
    e.preventDefault();
    setImportDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      setImportFile(file);
    } else {
      showMsg('Solo archivos Excel (.xlsx, .xls) o CSV', true);
    }
  };

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const downtimeRequiresComment = hasDowntime && parseInt(downtimeMinutes) > 0 && !comment.trim();
  const isIndividualValid = selectedCampaign && selectedShift && selectedDefects.length > 0 && lotNumber.trim() && !downtimeRequiresComment;
  const isOkValid         = selectedCampaign && selectedShift && lotNumber.trim() && !downtimeRequiresComment;

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

        {/* Indicador Ubicación MRB (click para cambiar) */}
        <div
          style={{
            ...s.badge,
            backgroundColor: selectedMrbLocation ? t.accent + '20' : '#fee2e2',
            border: `1px solid ${selectedMrbLocation ? t.accent : '#ef4444'}`,
            cursor: 'pointer',
            padding: '6px 12px'
          }}
          onClick={() => setShowLocationModal(true)}
          title="Click para cambiar ubicación MRB"
        >
          📍 {selectedMrbLocation ? selectedMrbLocation.code : '⚠ Sin ubicación'}
        </div>

        {/* Selector Estación MRB (inspección) */}
        <select
          style={{ ...s.select, borderColor: selectedMrbStation ? t.accent : '#ef4444', fontWeight: '600', minWidth: '140px' }}
          value={selectedMrbStation?.id || ''}
          onChange={e => {
            const st = mrbStations.find(s => s.id === parseInt(e.target.value)) || null;
            setSelectedMrbStation(st);
            if (st) {
              sessionStorage.setItem('mrbSelectedStation', JSON.stringify(st));
            } else {
              sessionStorage.removeItem('mrbSelectedStation');
            }
          }}
        >
          <option value="">⚠ Estación...</option>
          {mrbStations.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
        </select>

        {/* Selector Turno */}
        <select
          style={{ ...s.select, borderColor: selectedShift ? t.accent : '#ef4444', fontWeight: '600' }}
          value={selectedShift?.id || ''}
          onChange={e => {
            const sh = shifts.find(sh => sh.id === parseInt(e.target.value)) || null;
            setSelectedShift(sh);
            setDowntimeTodayMin(0);
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
          {downtimeTodayMin > 0 && <div style={s.counter('#f59e0b', '#fef3c7')} title="Downtime total del turno hoy">⏱ {downtimeTodayMin} min</div>}
          {captureMode === 'individual' && (
            <button
              style={{ ...s.piezaOkBtn, opacity: (submitting || !isOkValid || isClosed || serialScrapped || serialPartMismatch) ? 0.5 : 1 }}
              onClick={handlePiezaOk}
              disabled={submitting || !isOkValid || isClosed || serialScrapped || serialPartMismatch}
              title={isClosed ? 'Campaña cerrada' : serialScrapped ? 'Serial en SCRAP' : serialPartMismatch ? 'Parte incorrecta' : !lotNumber.trim() ? 'Escanea el serial primero' : ''}
            >
              <CheckCircle size={18} /> PIEZA OK
            </button>
          )}
          {captureMode === 'individual' && c && selectedShift && (
            <button
              onClick={() => setShowCloseModal(true)}
              disabled={closingShift || isClosed}
              style={{ padding: '8px 16px', backgroundColor: isClosed ? '#9ca3af' : '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: isClosed ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={isClosed ? 'Campaña cerrada' : ''}
            >
              <CheckCircle size={15} /> Registrar Turno
            </button>
          )}
          {captureMode === 'bulk' && c && selectedShift && (
            <button
              onClick={() => setShowCloseModal(true)}
              disabled={closingShift || isClosed}
              style={{ padding: '8px 16px', backgroundColor: isClosed ? '#9ca3af' : '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: isClosed ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={isClosed ? 'Campaña cerrada' : ''}
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
          <option value="">📋 {L.selectCampaignPlaceholder}</option>
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

        {/* Botones de template/import movidos a la sección de Import Masivo */}
        {c && (
          <label style={{ ...s.iconBtn, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '13px', fontWeight: '600', color: uploadingTally ? t.textMuted : t.accent, borderColor: t.accent }} title="Subir Tally Sheet (imagen/PDF)">
            <Plus size={16} />{uploadingTally ? 'Subiendo...' : 'Foto Tally'}
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
          <div style={{ fontSize: '18px' }}>{L.selectCampaignStart}</div>
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
                    // Enter SOLO busca serial - NO registra nada
                    // OK y NOK se registran con click en botones
                  }
                }}
                autoComplete="off"
              />
              <span style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>
                Enter → buscar serial • OK/NOK con botones
              </span>

              {/* ── ALERTAS Y VALIDACIONES ─────────────────────────────────── */}
              {serialScrapped && !scrapModalOpen && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={14} /> SERIAL EN SCRAP
                  </div>
                  <div style={{ fontSize: '10px', color: '#991b1b', marginTop: '2px' }}>
                    No se puede registrar OK. Selecciona un defecto para registrar NOK.
                  </div>
                </div>
              )}

              {serialPartMismatch && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={14} /> PARTE INCORRECTA
                  </div>
                  <div style={{ fontSize: '10px', color: '#78350f', marginTop: '2px' }}>
                    Serial pertenece a <strong>{serialPartMismatch.found}</strong>, no a {serialPartMismatch.expected}
                  </div>
                </div>
              )}

              {/* ── AFFECTED STATUS - indica si serial está en lista de afectados (multi-campaña) ─────────── */}
              {affectedStatus && Object.keys(affectedStatus).length > 0 && Object.values(affectedStatus).some(s => s === 'OUT_OF_LIST') && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ FUERA DE CAMPAÑA
                  </div>
                  <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px' }}>
                    {(() => {
                      const outCampaigns = Object.entries(affectedStatus || {})
                        .filter(([, s]) => s === 'OUT_OF_LIST')
                        .map(([cid]) => {
                          const camp = [...availableCampaigns, ...selectedCampaigns, ...(selectedCampaign ? [selectedCampaign] : [])]
                            .find(c => (c.campaignId || c.id) === parseInt(cid));
                          return camp?.campaignNumber || camp?.campaignName || `#${cid}`;
                        });
                      return outCampaigns.length === 1
                        ? `Serial no está en lista de afectados de ${outCampaigns[0]}.`
                        : `Serial no está en lista de afectados de: ${outCampaigns.join(', ')}.`;
                    })()}
                  </div>
                </div>
              )}

              {affectedStatus && Object.keys(affectedStatus).length > 0 && Object.values(affectedStatus).every(s => s === 'IN_LIST') && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#dcfce7', borderRadius: '6px', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✅ EN TODAS LAS CAMPAÑAS
                  </div>
                  <div style={{ fontSize: '10px', color: '#14532d', marginTop: '2px' }}>
                    Serial está en la lista de afectados de todas las campañas seleccionadas.
                  </div>
                </div>
              )}

              {/* ── INFO PRODUCCIÓN - usa unit_registry.current_status ─────────── */}
              {productionInfo && (
                <div style={{
                  marginTop: '8px', padding: '8px 10px', borderRadius: '6px',
                  backgroundColor:
                    productionInfo.inspectionStatus === 'OK' ? '#dcfce7' :
                    productionInfo.inspectionStatus === 'DEFECTIVE' ? '#fee2e2' :
                    productionInfo.inspectionStatus === 'SCRAPPED' ? '#f3f4f6' :
                    '#fef3c7',
                  border: `1px solid ${
                    productionInfo.inspectionStatus === 'OK' ? '#86efac' :
                    productionInfo.inspectionStatus === 'DEFECTIVE' ? '#fca5a5' :
                    productionInfo.inspectionStatus === 'SCRAPPED' ? '#d1d5db' :
                    '#fcd34d'
                  }`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>
                      {productionInfo.inspectionStatus === 'OK' ? '✅' :
                       productionInfo.inspectionStatus === 'DEFECTIVE' ? '⚠️' :
                       productionInfo.inspectionStatus === 'SCRAPPED' ? '🗑️' : '📋'}
                    </span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color:
                        productionInfo.inspectionStatus === 'OK' ? '#166534' :
                        productionInfo.inspectionStatus === 'DEFECTIVE' ? '#991b1b' :
                        productionInfo.inspectionStatus === 'SCRAPPED' ? '#6b7280' : '#92400e'
                      }}>
                        {productionInfo.inspectionStatus === 'OK' ? 'Inspeccionado OK' :
                         productionInfo.inspectionStatus === 'DEFECTIVE' ? 'Con defectos' :
                         productionInfo.inspectionStatus === 'SCRAPPED' ? 'SCRAP' :
                         productionInfo.inspectionStatus === 'REGISTERED' ? 'Registrado' :
                         'Pendiente de inspección'}
                      </div>
                      {productionInfo.workOrder && (
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>OT: {productionInfo.workOrder}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ÚLTIMO ENTRY NUMBER ─────────────────────────────────────── */}
              {lastEntryNumber && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#dbeafe', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                  <div style={{ fontSize: '10px', color: '#1e40af', marginBottom: '2px' }}>ÚLTIMO DEFECTO REGISTRADO</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1d4ed8', fontFamily: 'monospace' }}>{lastEntryNumber}</div>
                </div>
              )}

              {/* ── PARTE DETECTADA ─────────────────────────────────────────── */}
              {detectedPart && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: `${t.accent}10`, borderRadius: '6px', border: `1px solid ${t.accent}30` }}>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '2px' }}>PARTE DETECTADA</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: t.accent }}>{detectedPart.partNumber}</div>
                  <div style={{ fontSize: '11px', color: t.text }}>{detectedPart.partName}</div>
                </div>
              )}

              {availableCampaigns.length === 0 && detectedPart && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '11px', color: '#92400e' }}>
                  ⚠ {L.noActiveCampaigns}
                </div>
              )}

              {/* Contador de defectos clickeable */}
              {lotNumber && selectedCampaign && (
                <div style={{ marginTop: '6px' }}>
                  <DefectCounter
                    serial={lotNumber}
                    clientId={selectedCampaign?.clientId}
                    onClick={() => setDefectConsultOpen(true)}
                    theme={t}
                  />
                </div>
              )}
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Disposición {!selectedDisposition && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '600' }}>* Requerida</span>}</label>
              <select style={s.fieldSelect} value={selectedDisposition?.id || ''} onChange={e => setSelectedDisposition(dispositions.find(d => d.id === parseInt(e.target.value)) || null)}>
                <option value="">-- Seleccionar disposición --</option>
                {dispositions.map(d => <option key={d.id} value={d.id}>{d.code === 'REWORK' ? 'Retrabajo OK' : d.name}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Tiempo de Paro / Downtime</label>
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
              <label style={{ ...s.label, color: downtimeRequiresComment ? '#ef4444' : undefined }}>
                Comentario {downtimeRequiresComment ? '* — requerido con downtime' : ''}
              </label>
              <textarea style={{ ...s.textarea, borderColor: downtimeRequiresComment ? '#ef4444' : undefined }} placeholder="Observaciones..." value={comment} onChange={e => setComment(e.target.value)} />
            </div>

          </div>

          {/* Right panel */}
          <div style={s.rightPanel}>
            <div style={s.defectsPanel}>
              {/* Header with search */}
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
                  {selectedPart ? L.noDefectsConfigured : L.selectPartDefects}
                </div>
              ) : (
                <>
                  {/* Category Buttons Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${t.border}` }}>
                    {defectsByCategory.map(cat => {
                      const isSelected = selectedCategory === cat.categoryId;
                      const count = cat.defects.filter(d => !defectFilter || d.name.toLowerCase().includes(defectFilter.toLowerCase()) || (d.code && d.code.toLowerCase().includes(defectFilter.toLowerCase()))).length;
                      if (count === 0 && defectFilter) return null;
                      return (
                        <button key={cat.categoryId} type="button" onClick={() => handleCategorySelect(cat.categoryId)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', backgroundColor: isSelected ? (cat.categoryColor || t.accent) : t.bgInput, border: `2px solid ${cat.categoryColor || t.border}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: isSelected ? 'white' : (cat.categoryColor || '#6b7280') }} />
                          <span style={{ color: isSelected ? 'white' : t.text, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{cat.categoryName}</span>
                          <span style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : t.textMuted, fontSize: '10px', backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : t.bgCard, padding: '1px 5px', borderRadius: '6px' }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Defects Grid */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {!selectedCategory ? (
                      <div style={{ color: t.textMuted, textAlign: 'center', padding: '30px', fontSize: '13px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronUp size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        Selecciona una categoría
                      </div>
                    ) : (() => {
                      const filtered = selectedCategoryDefects.filter(d => !defectFilter || d.name.toLowerCase().includes(defectFilter.toLowerCase()) || (d.code && d.code.toLowerCase().includes(defectFilter.toLowerCase())));
                      const totalPages = Math.ceil(filtered.length / DEFECTS_PER_PAGE);
                      const paginated = getPaginatedDefects(filtered);
                      return (
                        <>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gridTemplateRows: 'repeat(3, 1fr)',
                            gap: '8px',
                            flex: 1,
                            padding: '4px'
                          }}>
                            {paginated.map(d => (
                              <button
                                key={d.id}
                                type="button"
                                style={{
                                  padding: '10px 8px',
                                  borderRadius: '8px',
                                  border: `2px solid ${selectedDefects.some(sd => sd.id === d.id) ? t.accent : (d.color || t.border)}`,
                                  backgroundColor: selectedDefects.some(sd => sd.id === d.id) ? t.accent : t.bgInput,
                                  color: selectedDefects.some(sd => sd.id === d.id) ? 'white' : t.text,
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  transition: 'all 0.15s',
                                  minHeight: '60px'
                                }}
                                onClick={() => setSelectedDefects(prev =>
                                  prev.some(sd => sd.id === d.id)
                                    ? prev.filter(sd => sd.id !== d.id)
                                    : [...prev, d]
                                )}
                                title={`${d.code || ''} ${d.name}${d.campaignIds?.length ? ` (${d.campaignIds.length} campaña${d.campaignIds.length > 1 ? 's' : ''})` : ''}`}
                              >
                                {d.code && <span style={{ fontSize: '10px', opacity: 0.7 }}>{d.code}</span>}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.name}</span>
                              </button>
                            ))}
                          </div>
                          {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 0', borderTop: `1px solid ${t.border}`, marginTop: '8px' }}>
                              <button type="button" onClick={() => setDefectsPage(p => Math.max(1, p - 1))} disabled={defectsPage === 1}
                                style={{ padding: '6px 10px', backgroundColor: defectsPage === 1 ? t.bgInput : t.accent, color: defectsPage === 1 ? t.textMuted : 'white', border: 'none', borderRadius: '5px', cursor: defectsPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '600' }}>
                                <ChevronLeft size={14} /> Ant
                              </button>
                              <span style={{ color: t.text, fontSize: '12px', fontWeight: '500' }}>{defectsPage} / {totalPages}</span>
                              <button type="button" onClick={() => setDefectsPage(p => Math.min(totalPages, p + 1))} disabled={defectsPage === totalPages}
                                style={{ padding: '6px 10px', backgroundColor: defectsPage === totalPages ? t.bgInput : t.accent, color: defectsPage === totalPages ? t.textMuted : 'white', border: 'none', borderRadius: '5px', cursor: defectsPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '600' }}>
                                Sig <ChevronRight size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* ══ SECCIÓN MULTI-CAMPAÑA ══ */}
            {availableCampaigns.length > 0 && (
              <div style={{ padding: '10px', backgroundColor: t.bgCard, borderRadius: '8px', marginBottom: '8px', border: `1px solid ${t.border}` }}>
                {/* LÍNEA 1: Campañas (checkboxes) + Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {/* Campañas con checkbox */}
                  {availableCampaigns.map(camp => {
                    const isSelected = selectedCampaigns.some(sc => sc.campaignId === camp.campaignId);
                    const defectsForCampaign = selectedDefects.filter(d => (d.campaignIds || []).includes(camp.campaignId));
                    const hasDefects = defectsForCampaign.length > 0;
                    const campAffectedStatus = affectedStatus?.[camp.campaignId];
                    const isOutOfList = campAffectedStatus === 'OUT_OF_LIST';
                    return (
                      <label
                        key={camp.campaignId}
                        title={`${camp.title}${isOutOfList ? ' ⚠️ Serial no está en lista de afectados' : ''}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px',
                          backgroundColor: isSelected ? (hasDefects ? '#fee2e2' : '#d1fae5') : t.bgInput,
                          border: `1px solid ${isOutOfList ? '#f59e0b' : (isSelected ? (hasDefects ? '#ef4444' : '#22c55e') : t.border)}`,
                          borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedCampaigns(prev => prev.filter(sc => sc.campaignId !== camp.campaignId));
                            } else {
                              setSelectedCampaigns(prev => [...prev, camp]);
                            }
                          }}
                          style={{ width: '14px', height: '14px', accentColor: hasDefects ? '#ef4444' : '#22c55e' }}
                        />
                        <span style={{ color: t.text }}>{camp.campaignNumber}</span>
                        {isOutOfList && <span style={{ fontSize: '10px' }}>⚠️</span>}
                        {isSelected && (
                          <span style={{
                            width: '14px', height: '14px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: hasDefects ? '#ef4444' : '#22c55e', color: 'white', fontSize: '9px', fontWeight: '700'
                          }}>
                            {hasDefects ? '✕' : '✓'}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* LÍNEA 2: Fotos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', padding: '5px 10px',
                    backgroundColor: lotNumber ? t.bgInput : t.bgPanel,
                    border: `1px dashed ${lotNumber ? t.accent : t.border}`, borderRadius: '5px',
                    cursor: lotNumber ? 'pointer' : 'not-allowed', opacity: lotNumber ? 1 : 0.5,
                    fontSize: '11px', color: t.textMuted
                  }}>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!lotNumber}
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        const newItems = files.map(f => ({ file: f, previewUrl: URL.createObjectURL(f), id: Math.random() }));
                        setStagedEvidence(prev => [...prev, ...newItems]);
                        e.target.value = '';
                      }} />
                    Agregar Fotos
                  </label>
                  {stagedEvidence.map(item => (
                    <div key={item.id} style={{ position: 'relative', width: '36px', height: '36px' }}>
                      <img src={item.previewUrl} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${t.border}` }} />
                      <button onClick={() => { URL.revokeObjectURL(item.previewUrl); setStagedEvidence(prev => prev.filter(i => i.id !== item.id)); }}
                        style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: 'white', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>

                {/* BOTÓN: Abrir Modal Inspección Multi-Campaña */}
                <button
                  onClick={openMultiCampaignInspectionModal}
                  disabled={submitting || selectedCampaigns.length === 0}
                  style={{
                    width: '100%', padding: '10px 16px', border: 'none', borderRadius: '6px',
                    backgroundColor: (submitting || selectedCampaigns.length === 0) ? t.textDim : '#3b82f6', color: 'white',
                    cursor: (submitting || selectedCampaigns.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700' }}>
                    <Eye size={16} />
                    INSPECCIONAR {selectedCampaigns.length} CAMPAÑA{selectedCampaigns.length > 1 ? 'S' : ''}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>
                    {detectedPart?.partNumber || ''} • Revisar defectos uno por uno
                  </span>
                </button>
              </div>
            )}

            {/* Submit Panel - Single Campaign Mode (sin multi-campaña) */}
            {availableCampaigns.length === 0 && (
              <div style={s.submitPanel}>
                <button style={{ ...s.submitBtn(!isIndividualValid || submitting || isClosed), flexDirection: 'column', padding: '12px 20px' }} onClick={handleSubmitDefect} disabled={!isIndividualValid || submitting || isClosed} title={isClosed ? 'Campaña cerrada' : ''}>
                  {selectedDefects.length > 0 && (
                    <span style={{ fontSize: '11px', opacity: 0.85, marginBottom: '4px' }}>
                      {selectedPart?.captureDisplayName || selectedPart?.partNumber || 'Parte'} │ {selectedDefects.map(d => d.name).join(', ')} │ {selectedDisposition ? dispositions.find(d => d.id === selectedDisposition.id)?.name : 'Disposición'}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700' }}>
                    <Plus size={18} /> {submitting ? 'GUARDANDO...' : `AGREGAR ${selectedDefects.length > 1 ? selectedDefects.length + ' DEFECTOS' : 'DEFECTO'} NOK`}
                  </span>
                </button>
              </div>
            )}
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
              <button onClick={() => {
                const campaignIds = selectedCampaigns.length > 0
                  ? selectedCampaigns.map(c => c.campaignId)
                  : (selectedCampaign?.id ? [selectedCampaign.id] : []);
                loadPartDefects(selectedPart.id, campaignIds);
              }} style={{ ...s.iconBtn, padding: '6px 12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', color: t.accent, borderColor: t.accent, marginLeft: totalOk === 0 && totalNok === 0 ? 'auto' : '0' }}>
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
                {selectedPart ? L.noDefectsConfigured : L.selectPartDefects}
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
                      {severities.length > 0 && (
                        <th colSpan={severities.length} style={{ padding: '8px 4px 4px', textAlign: 'center', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: '#7c3aed', borderBottom: `1px solid #7c3aed40`, borderLeft: `2px solid #7c3aed30`, backgroundColor: '#ede9fe', minWidth: `${severities.length * 56}px` }}>
                          Severidad
                        </th>
                      )}
                    </tr>
                    <tr style={{ backgroundColor: t.bgCard }}>
                      {DISP_COLS.map(col => (
                        <React.Fragment key={col.code}>
                          <th style={{ padding: '4px 4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: col.color, borderBottom: `2px solid ${t.border}`, borderLeft: `2px solid ${col.color}30`, backgroundColor: `${col.bg}80`, boxShadow: `0 2px 0 ${t.border}`, minWidth: '52px' }}>ACUM</th>
                          <th style={{ padding: '4px 4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: t.textMuted, borderBottom: `2px solid ${t.border}`, backgroundColor: t.bgCard, boxShadow: `0 2px 0 ${t.border}`, minWidth: '68px' }}>CAP</th>
                        </React.Fragment>
                      ))}
                      {severities.map(sev => (
                        <th key={sev.id} style={{ padding: '4px 4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: sev.color || '#7c3aed', borderBottom: `2px solid ${t.border}`, borderLeft: `2px solid #7c3aed30`, backgroundColor: '#f5f3ff', boxShadow: `0 2px 0 ${t.border}`, minWidth: '52px' }}>
                          {sev.code || sev.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {defectsByCategory.map(cat => (
                      <React.Fragment key={cat.categoryId}>
                        <tr>
                          <td colSpan={DISP_COLS.length * 2 + 2 + severities.length} style={{ padding: '6px 16px', backgroundColor: `${cat.categoryColor}18`, borderTop: `2px solid ${cat.categoryColor}`, borderBottom: `1px solid ${cat.categoryColor}40` }}>
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
                          {severities.map(sev => (
                            <th key={sev.id} style={{ padding: '4px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: sev.color || '#7c3aed', borderBottom: `1px solid ${t.border}`, borderLeft: `2px solid #7c3aed30`, backgroundColor: '#f5f3ff' }}>
                              {sev.code || sev.name}
                            </th>
                          ))}
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
                              {severities.map(sev => {
                                const qty = DISP_COLS.filter(col => DISPOSITION_SEVERITY[col.code] === sev.code)
                                  .reduce((s, col) => s + (parseInt(defectGrid[defect.id]?.[col.code]) || 0), 0);
                                return (
                                  <td key={sev.id} style={{ padding: '8px 4px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, borderLeft: `2px solid #7c3aed30`, backgroundColor: qty > 0 ? `${sev.color || '#7c3aed'}18` : 'transparent' }}>
                                    {qty > 0
                                      ? <span style={{ fontWeight: '700', fontSize: '15px', color: sev.color || '#7c3aed' }}>{qty}</span>
                                      : <span style={{ color: t.textDim, fontSize: '13px' }}>—</span>}
                                  </td>
                                );
                              })}
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
                      {severities.map(sev => {
                        const capTotal = partDefects.reduce((s, d) =>
                          s + DISP_COLS.filter(col => DISPOSITION_SEVERITY[col.code] === sev.code)
                            .reduce((s2, col) => s2 + (parseInt(defectGrid[d.id]?.[col.code]) || 0), 0), 0);
                        return (
                          <td key={sev.id} style={{ padding: '12px 4px', textAlign: 'center', fontWeight: '700', fontSize: '16px', color: capTotal > 0 ? (sev.color || '#7c3aed') : t.textDim, backgroundColor: capTotal > 0 ? `${sev.color || '#7c3aed'}18` : t.bgCard, boxShadow: `0 -2px 0 ${t.border}`, borderLeft: `2px solid #7c3aed30` }}>
                            {capTotal > 0 ? capTotal : '—'}
                          </td>
                        );
                      })}
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

          {/* ══ IMPORT MASIVO ══════════════════════════════════════════════ */}
          <div style={{ backgroundColor: t.bgPanel, borderRadius: '10px', padding: '16px 20px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: t.accent, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} /> Import Masivo
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {/* Tipo de registro */}
              <div>
                <label style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tipo de Registro</label>
                <select
                  value={importType}
                  onChange={e => setImportType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '14px', fontWeight: '600', border: `2px solid ${importType === 'OK' ? '#22c55e' : '#ef4444'}`, borderRadius: '8px', backgroundColor: importType === 'OK' ? '#d1fae5' : '#fee2e2', color: importType === 'OK' ? '#16a34a' : '#dc2626', cursor: 'pointer' }}
                >
                  <option value="OK">✓ OK (Sin defecto)</option>
                  <option value="DEFECT">✕ Con Defecto</option>
                </select>
              </div>

              {/* Defecto (si aplica) */}
              {importType === 'DEFECT' && (
                <div>
                  <label style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', display: 'block', marginBottom: '4px' }}>Defecto</label>
                  <select
                    value={importDefectId || ''}
                    onChange={e => setImportDefectId(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontWeight: '600', border: `2px solid ${t.border}`, borderRadius: '8px', backgroundColor: t.bgInput, color: t.text, cursor: 'pointer' }}
                  >
                    <option value="">— Seleccionar defecto —</option>
                    {campaignDefects.map(d => (
                      <option key={d.defectTypeId} value={d.defectTypeId}>{d.code} - {d.displayName || d.name}</option>
                    ))}
                  </select>
                  {campaignDefects.length === 0 && (
                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>⚠ No hay defectos configurados para esta campaña</div>
                  )}
                </div>
              )}

              {/* Disposición (si aplica) */}
              {importType === 'DEFECT' && (
                <div>
                  <label style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', display: 'block', marginBottom: '4px' }}>Disposición</label>
                  <select
                    value={importDisposition}
                    onChange={e => setImportDisposition(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontWeight: '600', border: `2px solid ${DISPOSITION_CONFIG[importDisposition]?.color || t.border}`, borderRadius: '8px', backgroundColor: DISPOSITION_CONFIG[importDisposition]?.bg || t.bgInput, color: DISPOSITION_CONFIG[importDisposition]?.color || t.text, cursor: 'pointer' }}
                  >
                    <option value="REWORK">⟳ Rework</option>
                    <option value="SCRAP">✕ Scrap</option>
                    <option value="HOLD">⏸ Hold</option>
                    <option value="RETURN_SUPPLIER">↩ Return Supplier</option>
                    <option value="USE_AS_IS">✓ Use As Is</option>
                  </select>
                </div>
              )}
            </div>

            {/* Drag & Drop area */}
            <div
              onDragOver={e => { e.preventDefault(); setImportDragOver(true); }}
              onDragLeave={() => setImportDragOver(false)}
              onDrop={handleImportDrop}
              style={{
                border: `2px dashed ${importDragOver ? t.accent : importFile ? '#22c55e' : t.border}`,
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: importDragOver ? `${t.accent}10` : importFile ? '#d1fae520' : t.bgInput,
                marginBottom: '12px',
                transition: 'all 0.2s'
              }}
            >
              {importFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>📄 {importFile.name}</span>
                  <button onClick={() => setImportFile(null)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>✕ Quitar</button>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '4px' }}>
                    Arrastra un archivo Excel/CSV aquí o <span style={{ color: t.accent, fontWeight: '600' }}>haz clic para seleccionar</span>
                  </div>
                  <div style={{ fontSize: '11px', color: t.textDim }}>Solo columnas: SERIAL | PARTE</div>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/mrb/${selectedCampaign.id}/tally-template`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) throw new Error('Error');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `Template_${selectedCampaign.campaign_number || selectedCampaign.id}.xlsx`;
                    document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                  } catch (err) { showMsg('Error descargando template', true); }
                }}
                style={{ padding: '10px 16px', backgroundColor: '#d1fae5', border: '2px solid #22c55e', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> Descargar Template
              </button>
              <button
                onClick={handleMassImport}
                disabled={submitting || !importFile || (importType === 'DEFECT' && !importDefectId)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: submitting || !importFile ? t.textDim : t.accent,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'white',
                  cursor: submitting || !importFile ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Upload size={16} /> {submitting ? 'Importando...' : 'Importar Archivo'}
              </button>
            </div>
          </div>

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
              <button onClick={async () => {
                setShowDuplicateModal(false);
                try {
                  const token = localStorage.getItem('token');
                  await fetch(`${API_URL}/mrb/${selectedCampaign.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      commentType: 'system',
                      comment: `Inspector continuó capturando en turno ${selectedShift?.code} — ${selectedShift?.name} después de haberlo registrado formalmente.`
                    })
                  });
                } catch (_) { /* silent */ }
              }} style={{ flex: 2, padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Continuar de todas formas</button>
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
                onChange={e => setHorasWorked(Math.min(24, Math.max(0.5, parseFloat(e.target.value) || 8)))}
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
              Agrega las horas trabajadas y una nota para que quede en el historial.
            </div>

            {/* Horas trabajadas */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', flexShrink: 0 }}>Horas trabajadas</label>
              <input
                type="number" min="0.5" max="24" step="0.5"
                value={pendingShiftHours}
                onChange={e => setPendingShiftHours(Math.min(24, Math.max(0.5, parseFloat(e.target.value) || 8)))}
                style={{ width: '80px', padding: '8px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.text, fontSize: '16px', fontWeight: '700', textAlign: 'center' }}
              />
              <span style={{ fontSize: '12px', color: t.textMuted }}>hrs</span>
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
                onClick={() => { setPendingShift(null); setPendingShiftNote(''); setPendingShiftHours(8); }}
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
                        comment: `📋 Turno registrado (retroactivo): ${pendingShift.shiftName} — ${pendingShift.date} — ${pendingShiftHours}h — Nota: ${pendingShiftNote.trim()}`,
                        commentType: 'system'
                      })
                    });
                  } catch (_) { /* silent */ }
                  setPendingShift(null);
                  setPendingShiftNote('');
                  setPendingShiftHours(8);
                }}
                style={{ flex: 2, padding: '12px', backgroundColor: !pendingShiftNote.trim() ? '#6b7280' : '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: !pendingShiftNote.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <CheckCircle size={16} /> Registrar Retroactivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PREVIEW TALLY IMPORT ─────────────────────────────────────── */}
      {tallyPreview.open && tallyPreview.preview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '28px', maxWidth: '560px', width: '95%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: t.text, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 Preview de Importación
            </div>

            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: t.bgInput, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>{tallyPreview.preview.total}</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>Total en archivo</div>
              </div>
              <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{tallyPreview.preview.validTotal}</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>Válidos ({tallyPreview.preview.validOk} OK, {tallyPreview.preview.validNok} NOK)</div>
              </div>
              <div style={{ backgroundColor: tallyPreview.preview.duplicatesCount > 0 ? 'rgba(234, 179, 8, 0.1)' : t.bgInput, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: tallyPreview.preview.duplicatesCount > 0 ? '#eab308' : t.textMuted }}>{tallyPreview.preview.duplicatesCount}</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>Duplicados</div>
              </div>
            </div>

            {/* Partes de la campaña */}
            {tallyPreview.preview.campaignParts?.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: t.bgInput, borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '6px' }}>Partes válidas en esta campaña:</div>
                <div style={{ fontSize: '13px', color: t.text }}>{tallyPreview.preview.campaignParts.join(', ')}</div>
              </div>
            )}

            {/* Partes inválidas */}
            {tallyPreview.preview.invalidParts?.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', marginBottom: '8px' }}>
                  ⚠ Partes que NO corresponden a la campaña ({tallyPreview.preview.invalidPartsTotal} seriales):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {tallyPreview.preview.invalidParts.map((p, i) => (
                    <span key={i} style={{ padding: '4px 10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '4px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                      {p.partNumber} ({p.count})
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px' }}>
                  Estos seriales serán ignorados en la importación.
                </div>
              </div>
            )}

            {/* Duplicados */}
            {tallyPreview.preview.duplicatesCount > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#eab308', marginBottom: '4px' }}>
                  ⚠ {tallyPreview.preview.duplicatesCount} seriales ya registrados (serán ignorados)
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>
                  {tallyPreview.preview.duplicates.slice(0, 5).map(d => d.serial).join(', ')}
                  {tallyPreview.preview.duplicates.length > 5 && ` ... y ${tallyPreview.preview.duplicates.length - 5} más`}
                </div>
              </div>
            )}

            {/* Resumen de defectos */}
            {tallyPreview.preview.defectCounts?.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', marginBottom: '8px' }}>
                  Defectos detectados ({tallyPreview.preview.totalDefects} total):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {tallyPreview.preview.defectCounts.map((d, i) => (
                    <span key={i} style={{ padding: '4px 10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '4px', fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                      {d.code}: {d.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setTallyPreview({ open: false, file: null, preview: null })}
                style={{ flex: 1, padding: '12px', backgroundColor: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTallyImport}
                disabled={submitting || tallyPreview.preview.validTotal === 0}
                style={{ flex: 2, padding: '12px', backgroundColor: tallyPreview.preview.validTotal > 0 ? '#7c3aed' : '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: tallyPreview.preview.validTotal > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {submitting ? 'Importando...' : `Importar ${tallyPreview.preview.validTotal} registros`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consulta de Defectos */}
      <DefectConsultTab
        isOpen={defectConsultOpen}
        onClose={() => setDefectConsultOpen(false)}
        serial={lotNumber}
        clientId={selectedCampaign?.clientId}
        theme={t}
      />

      {/* Modal de Serial en SCRAP */}
      {scrapModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={24} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>SERIAL EN SCRAP</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>No se puede registrar como OK</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#fef2f2', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px', fontWeight: '600' }}>SERIAL</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626', fontFamily: 'monospace' }}>{scrapInfo?.serial}</div>
              {scrapInfo?.partNumber && (
                <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '8px' }}>
                  <strong>Parte:</strong> {scrapInfo.partNumber} {scrapInfo.partName ? `— ${scrapInfo.partName}` : ''}
                </div>
              )}
              {scrapInfo?.scrappedAt && (
                <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '6px' }}>
                  Scrapeado: {new Date(scrapInfo.scrappedAt).toLocaleString('es-MX')}
                </div>
              )}
              {scrapInfo?.scrapNotes && (
                <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px', fontStyle: 'italic' }}>
                  "{scrapInfo.scrapNotes}"
                </div>
              )}
            </div>
            <div style={{ backgroundColor: '#fef3c7', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#92400e' }}>
              <strong>Puedes registrar un defecto (NOK)</strong> para documentar hallazgos adicionales en esta pieza.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setScrapModalOpen(false);
                  // Mantener serial para permitir registrar NOK
                  refocusScan();
                }}
                style={{ flex: 1, padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                Registrar NOK
              </button>
              <button
                onClick={() => {
                  setScrapModalOpen(false);
                  setLotNumber('');
                  lotNumberRef.current = '';
                  setSerialScrapped(false);
                  setScrapInfo(null);
                  refocusScan();
                }}
                style={{ flex: 1, padding: '12px', backgroundColor: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Importación */}
      {importConflicts && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Header dinámico */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: importConflicts.wrongPartCount > 0 ? '#fef3c7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {importConflicts.wrongPartCount > 0 ? <AlertTriangle size={24} color="#f59e0b" /> : <FileSpreadsheet size={24} color="#3b82f6" />}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: importConflicts.wrongPartCount > 0 ? '#f59e0b' : '#3b82f6' }}>
                  {importConflicts.wrongPartCount > 0 ? 'Atención: Seriales con Parte Incorrecta' : 'Confirmar Importación'}
                </div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>
                  {importConflicts.preview?.toImport || 0} serial(es) listos para importar
                  {importConflicts.conflicts?.length > 0 && ` (${importConflicts.conflicts.length} reprocesos)`}
                </div>
              </div>
            </div>

            {/* Alertas compactas expandibles */}
            <div style={{ fontSize: '12px', marginBottom: '12px' }}>
              {/* Discrepancias de parte */}
              {importConflicts.wrongPartCount > 0 && (
                <details style={{ marginBottom: '6px' }}>
                  <summary style={{ cursor: 'pointer', color: '#dc2626', fontWeight: '600' }}>
                    {importConflicts.wrongPartCount} discrepancia(s) de parte - Excel vs Inventario
                  </summary>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', marginTop: '4px', marginLeft: '16px', maxHeight: '120px', overflowY: 'auto', backgroundColor: '#fef2f2', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontWeight: '600', borderBottom: '1px solid #fca5a5', paddingBottom: '2px', marginBottom: '2px' }}>
                      <span>Serial</span><span>Excel</span><span>Inventario</span>
                    </div>
                    {importConflicts.wrongPartSerials?.map((w, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                        <span>{w.serial}</span>
                        <span style={{ color: '#dc2626' }}>{w.partNumberExcel || w.partNumberGiven || '-'}</span>
                        <span style={{ color: '#059669' }}>{w.partNumberReal || '-'}</span>
                      </div>
                    ))}
                    {importConflicts.wrongPartCount > (importConflicts.wrongPartSerials?.length || 0) && (
                      <div style={{ fontStyle: 'italic', marginTop: '2px' }}>... y {importConflicts.wrongPartCount - importConflicts.wrongPartSerials.length} más</div>
                    )}
                  </div>
                </details>
              )}

              {/* Omitidos */}
              {(importConflicts.skippedCount || 0) > 0 && (
                <details style={{ marginBottom: '6px' }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontWeight: '600' }}>
                    {importConflicts.skippedCount} omitido(s) - parte no existe en sistema
                  </summary>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', marginTop: '4px', marginLeft: '16px', maxHeight: '120px', overflowY: 'auto', backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontWeight: '600', borderBottom: '1px solid #d1d5db', paddingBottom: '2px', marginBottom: '2px' }}>
                      <span>Serial</span><span>Parte</span>
                    </div>
                    {importConflicts.skippedSerials?.map((s, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <span>{s.serial}</span>
                        <span style={{ color: '#dc2626' }}>{s.partNumber || '-'}</span>
                      </div>
                    ))}
                    {importConflicts.skippedCount > (importConflicts.skippedSerials?.length || 0) && (
                      <div style={{ fontStyle: 'italic', marginTop: '2px' }}>... y {importConflicts.skippedCount - importConflicts.skippedSerials.length} más</div>
                    )}
                  </div>
                </details>
              )}

              {/* Adicionales */}
              {(importConflicts.extendedCount || 0) > 0 && (
                <details style={{ marginBottom: '6px' }}>
                  <summary style={{ cursor: 'pointer', color: '#7c3aed', fontWeight: '600' }}>
                    {importConflicts.extendedCount} adicional(es) - se agregarán a campaña
                  </summary>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', marginTop: '4px', marginLeft: '16px', maxHeight: '120px', overflowY: 'auto', backgroundColor: '#f5f3ff', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontWeight: '600', borderBottom: '1px solid #c4b5fd', paddingBottom: '2px', marginBottom: '2px' }}>
                      <span>Serial</span><span>Parte</span>
                    </div>
                    {importConflicts.extendedSerials?.map((e, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <span>{e.serial}</span>
                        <span>{e.partNumber || '-'}</span>
                      </div>
                    ))}
                    {importConflicts.extendedCount > (importConflicts.extendedSerials?.length || 0) && (
                      <div style={{ fontStyle: 'italic', marginTop: '2px' }}>... y {importConflicts.extendedCount - importConflicts.extendedSerials.length} más</div>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Preview de importación */}
            {(() => {
              const toImport = importConflicts.preview?.toImport || 0;
              const reprocessCount = importConflicts.preview?.reprocessCount || 0;
              const extendedCount = importConflicts.preview?.extendedCount || 0;
              const skipped = importConflicts.preview?.skippedInvalidPart || 0;
              const wrongPart = importConflicts.preview?.wrongPartCount || 0;
              // Si hay adicionales y todos son reprocesos (toImport=0), restar del conteo de reprocesos
              const extendedInReprocess = toImport === 0 && extendedCount > 0 ? extendedCount : 0;
              const normalReprocess = reprocessCount - extendedInReprocess;
              return (
                <div style={{ backgroundColor: t.bgInput, borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {toImport > 0 && <span><strong style={{ color: '#22c55e' }}>{toImport}</strong> nuevos</span>}
                    {normalReprocess > 0 && <span><strong style={{ color: '#3b82f6' }}>{normalReprocess}</strong> reprocesos</span>}
                    {extendedCount > 0 && <span><strong style={{ color: '#8b5cf6' }}>{extendedCount}</strong> adicionales{extendedInReprocess > 0 ? ' (reproceso)' : ''}</span>}
                    {skipped > 0 && <span><strong style={{ color: '#6b7280' }}>{skipped}</strong> omitidos</span>}
                    {wrongPart > 0 && <span><strong style={{ color: '#ef4444' }}>{wrongPart}</strong> rechazados</span>}
                  </div>
                </div>
              );
            })()}

            {/* Lista de seriales a importar (expandible) */}
            {importConflicts.preview?.serialsList?.length > 0 && (() => {
              const allSerials = importConflicts.preview.serialsList;
              const initialLimit = 20;
              return (
                <details style={{ marginBottom: '16px', backgroundColor: t.bgInput, borderRadius: '8px', padding: '8px 12px' }}>
                  <summary style={{ fontSize: '12px', fontWeight: '600', color: t.text, cursor: 'pointer', userSelect: 'none' }}>
                    Ver {allSerials.length} serial(es) a importar
                  </summary>
                  <div style={{ marginTop: '8px', maxHeight: '250px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: t.textMuted, position: 'sticky', top: 0, backgroundColor: t.bgInput }}>
                          <th style={{ textAlign: 'left', padding: '4px', borderBottom: `1px solid ${t.border}` }}>Serial</th>
                          <th style={{ textAlign: 'left', padding: '4px', borderBottom: `1px solid ${t.border}` }}>Parte</th>
                          <th style={{ textAlign: 'center', padding: '4px', borderBottom: `1px solid ${t.border}` }}>Ronda</th>
                          <th style={{ textAlign: 'center', padding: '4px', borderBottom: `1px solid ${t.border}` }}>Status</th>
                          <th style={{ textAlign: 'center', padding: '4px', borderBottom: `1px solid ${t.border}` }}>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSerials.map((s, i) => (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgCard }}>
                            <td style={{ padding: '3px 4px' }}>{s.serial}</td>
                            <td style={{ padding: '3px 4px', color: t.textMuted }}>{s.partNumber || '—'}</td>
                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>R{s.round}</td>
                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                              <span style={{
                                padding: '1px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '700',
                                backgroundColor: s.status === 'OK' ? '#d1fae5' : '#fee2e2',
                                color: s.status === 'OK' ? '#16a34a' : '#dc2626'
                              }}>{s.status}</span>
                            </td>
                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                              {s.isExtended && (
                                <span style={{ color: '#8b5cf6', fontSize: '9px', fontWeight: '600' }} title={s.extendedReason === 'parte' ? 'Parte fuera de campaña' : 'Serial no estaba en inventario'}>
                                  +ADIC
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })()}

            {/* Lista de reprocesos (solo si hay) */}
            {importConflicts.conflicts?.length > 0 && (
              <details style={{ marginBottom: '16px', backgroundColor: t.bgInput, borderRadius: '8px', padding: '8px 12px' }}>
                <summary style={{ fontSize: '12px', fontWeight: '600', color: '#f59e0b', cursor: 'pointer', userSelect: 'none' }}>
                  ⟳ {importConflicts.conflicts.length} reproceso(s) detectado(s)
                </summary>
                <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, backgroundColor: t.bgInput, color: t.textMuted }}>
                        <th style={{ padding: '6px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Serial</th>
                        <th style={{ padding: '6px', textAlign: 'center', borderBottom: `1px solid ${t.border}` }}>Anterior</th>
                        <th style={{ padding: '6px', textAlign: 'center', borderBottom: `1px solid ${t.border}` }}>Nueva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importConflicts.conflicts.map((c, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : t.bgCard }}>
                          <td style={{ padding: '4px 6px', fontFamily: 'monospace', fontWeight: '600' }}>{c.serial}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '700', backgroundColor: c.currentStatus === 'OK' ? '#d1fae5' : '#fee2e2', color: c.currentStatus === 'OK' ? '#16a34a' : '#dc2626' }}>R{c.currentRound}: {c.currentStatus}</span>
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '700', backgroundColor: c.newStatus === 'OK' ? '#d1fae5' : '#fee2e2', color: c.newStatus === 'OK' ? '#16a34a' : '#dc2626' }}>R{c.newRound}: {c.newStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {/* Input de comentario (solo si hay reprocesos) */}
            {importConflicts.conflicts?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '6px' }}>
                  Comentario de reproceso (opcional)
                </label>
                <input
                  type="text"
                  ref={reprocessCommentRef}
                  defaultValue=""
                  placeholder="Ej: Verificación adicional solicitada"
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: `1px solid ${t.border}`, borderRadius: '8px', backgroundColor: t.bgInput, color: t.text }}
                />
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  handleConfirmConflicts(importConflicts.conflicts?.map(c => c.serial) || [], reprocessCommentRef.current?.value || '');
                }}
                disabled={submitting || ((importConflicts.preview?.toImport || 0) === 0 && (importConflicts.conflicts?.length || 0) === 0)}
                style={{
                  flex: 1, padding: '12px',
                  backgroundColor: ((importConflicts.preview?.toImport || 0) === 0 && (importConflicts.conflicts?.length || 0) === 0) ? '#9ca3af' : '#22c55e',
                  color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                  cursor: submitting || ((importConflicts.preview?.toImport || 0) === 0 && (importConflicts.conflicts?.length || 0) === 0) ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Procesando...' : ((importConflicts.preview?.toImport || 0) + (importConflicts.conflicts?.length || 0)) === 0 ? 'Nada que importar' : `Confirmar ${(importConflicts.preview?.toImport || 0) + (importConflicts.conflicts?.length || 0)} registro(s)`}
              </button>
              <button
                onClick={() => { setImportConflicts(null); if (reprocessCommentRef.current) reprocessCommentRef.current.value = ''; }}
                disabled={submitting}
                style={{ flex: 1, padding: '12px', backgroundColor: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selección de Ubicación MRB (obligatorio al entrar) */}
      {showLocationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard, borderRadius: '16px', padding: '32px',
            maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
              <h2 style={{ color: t.text, fontSize: '20px', fontWeight: '700', margin: 0 }}>
                Selecciona Ubicación MRB
              </h2>
              <p style={{ color: t.textMuted, fontSize: '14px', marginTop: '8px' }}>
                ¿En qué ubicación MRB estás trabajando?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {mrbLocations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: t.textMuted }}>
                  No hay ubicaciones MRB configuradas.<br/>
                  <small>Ve a Defect Admin → Ubicaciones para crear una.</small>
                </div>
              ) : (
                mrbLocations.map(loc => (
                  <button
                    key={loc.id}
                    style={{
                      padding: '16px 20px', borderRadius: '10px', border: `2px solid ${t.border}`,
                      backgroundColor: t.bgPanel, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.backgroundColor = t.accent + '10'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.backgroundColor = t.bgPanel; }}
                    onClick={() => {
                      setSelectedMrbLocation(loc);
                      sessionStorage.setItem('mrbSelectedLocation', JSON.stringify(loc));
                      setShowLocationModal(false);
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '16px', color: t.text }}>{loc.code}</div>
                    <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
                      {loc.description || loc.stationName || 'Sin descripción'}
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedMrbLocation && (
              <button
                style={{
                  marginTop: '20px', width: '100%', padding: '12px',
                  backgroundColor: t.bgPanel, border: `1px solid ${t.border}`,
                  borderRadius: '8px', cursor: 'pointer', color: t.textMuted, fontSize: '14px'
                }}
                onClick={() => setShowLocationModal(false)}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: INSPECCIÓN MULTI-CAMPAÑA DEFECTO POR DEFECTO
          ═══════════════════════════════════════════════════════════════════════ */}
      {multiCampaignModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard, borderRadius: '12px', width: '90%', maxWidth: '600px',
            maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
              backgroundColor: '#3b82f6', color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px' }}>Inspección Multi-Campaña</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Serial: {lotNumber || '—'} • Parte: {detectedPart?.partNumber || '—'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMultiCampaignModalOpen(false);
                    setMultiCampaignDefectsData({});
                    setDefectInspectionResults({});
                    setModalDispositionId(null);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                    width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                  }}
                >✕</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {loadingMultiCampaignDefects ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <div style={{ marginTop: '8px' }}>Cargando defectos...</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(multiCampaignDefectsData).map(([campaignId, campData]) => {
                    const allMarked = campData.defects.every(d =>
                      defectInspectionResults[`${campaignId}-${d.defectTypeId}`] !== null
                    );
                    const hasNok = campData.defects.some(d =>
                      defectInspectionResults[`${campaignId}-${d.defectTypeId}`] === 'NOK'
                    );

                    return (
                      <div
                        key={campaignId}
                        style={{
                          border: `2px solid ${allMarked ? (hasNok ? '#ef4444' : '#22c55e') : t.border}`,
                          borderRadius: '10px', overflow: 'hidden',
                          backgroundColor: allMarked ? (hasNok ? '#fef2f2' : '#f0fdf4') : t.bgPanel
                        }}
                      >
                        {/* Campaign Header */}
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: allMarked ? (hasNok ? '#fee2e2' : '#dcfce7') : t.bgInput,
                          borderBottom: `1px solid ${t.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                          <div>
                            <span style={{ fontWeight: '700', color: t.text, fontSize: '14px' }}>
                              📋 {campData.campaignNumber}
                            </span>
                            <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '8px' }}>
                              {campData.title}
                            </span>
                            {/* Indicador de inspección previa */}
                            {campData.priorInspected && (
                              <span style={{
                                marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                                backgroundColor: campData.priorResult === 'OK' ? '#dbeafe' : '#fef3c7',
                                color: campData.priorResult === 'OK' ? '#1e40af' : '#92400e',
                                fontWeight: '600'
                              }}>
                                ↻ Previo: {campData.priorResult || '?'}
                              </span>
                            )}
                          </div>
                          {allMarked && (
                            <span style={{
                              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                              backgroundColor: hasNok ? '#ef4444' : '#22c55e', color: 'white'
                            }}>
                              {hasNok ? 'NOK' : 'OK'}
                            </span>
                          )}
                        </div>

                        {/* Defects List */}
                        <div style={{ padding: '8px' }}>
                          {campData.defects.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
                              Sin defectos configurados para esta campaña
                            </div>
                          ) : (
                            campData.defects.map(defect => {
                              const key = `${campaignId}-${defect.defectTypeId}`;
                              const result = defectInspectionResults[key];

                              return (
                                <div
                                  key={key}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 12px', marginBottom: '4px',
                                    backgroundColor: result === 'OK' ? '#d1fae5' : result === 'NOK' ? '#fee2e2' : t.bgCard,
                                    borderRadius: '6px', border: `1px solid ${result === 'OK' ? '#22c55e' : result === 'NOK' ? '#ef4444' : t.border}`
                                  }}
                                >
                                  <div>
                                    <span style={{ fontWeight: '600', color: t.text, fontSize: '13px' }}>
                                      {defect.code || defect.name}
                                    </span>
                                    {defect.code && defect.name !== defect.code && (
                                      <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '8px' }}>
                                        {defect.name}
                                      </span>
                                    )}
                                  </div>

                                  {/* OK / NOK Buttons */}
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      onClick={() => setDefectInspectionResults(prev => ({ ...prev, [key]: 'OK' }))}
                                      style={{
                                        padding: '6px 14px', borderRadius: '5px', cursor: 'pointer',
                                        border: result === 'OK' ? '2px solid #15803d' : `1px solid ${t.border}`,
                                        backgroundColor: result === 'OK' ? '#22c55e' : t.bgInput,
                                        color: result === 'OK' ? 'white' : t.text,
                                        fontWeight: result === 'OK' ? '700' : '500', fontSize: '12px'
                                      }}
                                    >
                                      ✓ OK
                                    </button>
                                    <button
                                      onClick={() => setDefectInspectionResults(prev => ({ ...prev, [key]: 'NOK' }))}
                                      style={{
                                        padding: '6px 14px', borderRadius: '5px', cursor: 'pointer',
                                        border: result === 'NOK' ? '2px solid #b91c1c' : `1px solid ${t.border}`,
                                        backgroundColor: result === 'NOK' ? '#ef4444' : t.bgInput,
                                        color: result === 'NOK' ? 'white' : t.text,
                                        fontWeight: result === 'NOK' ? '700' : '500', fontSize: '12px'
                                      }}
                                    >
                                      ✕ NOK
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px', borderTop: `1px solid ${t.border}`,
              backgroundColor: t.bgPanel, display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              {(() => {
                const totalDefects = Object.values(multiCampaignDefectsData).reduce((sum, c) => sum + c.defects.length, 0);
                const markedCount = Object.values(defectInspectionResults).filter(v => v !== null).length;
                const allMarked = markedCount === totalDefects && totalDefects > 0;
                const nokCount = Object.values(defectInspectionResults).filter(v => v === 'NOK').length;
                const canSubmit = allMarked && (nokCount === 0 || modalDispositionId);

                return (
                  <>
                    {/* Selector de disposición - solo aparece si hay NOKs */}
                    {nokCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                        <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                          Disposición para {nokCount} NOK:
                        </span>
                        <select
                          value={modalDispositionId || ''}
                          onChange={e => setModalDispositionId(e.target.value ? parseInt(e.target.value) : null)}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                            border: modalDispositionId ? '2px solid #ef4444' : `1px solid ${t.border}`,
                            backgroundColor: modalDispositionId ? '#fee2e2' : t.bgInput,
                            color: t.text, fontWeight: modalDispositionId ? '600' : '400'
                          }}
                        >
                          <option value="">-- Seleccionar disposición --</option>
                          {dispositions.map(d => (
                            <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Botones */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: t.textMuted }}>
                        <span>Revisados: <strong style={{ color: t.text }}>{markedCount}/{totalDefects}</strong></span>
                        {nokCount > 0 && (
                          <span style={{ color: '#ef4444', fontWeight: '600' }}>{nokCount} NOK</span>
                        )}
                        {nokCount > 0 && !modalDispositionId && (
                          <span style={{ color: '#f59e0b', fontSize: '11px' }}>⚠️ Falta disposición</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setMultiCampaignModalOpen(false);
                          setMultiCampaignDefectsData({});
                          setDefectInspectionResults({});
                          setModalDispositionId(null);
                        }}
                        style={{
                          padding: '10px 20px', borderRadius: '6px', cursor: 'pointer',
                          border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.text, fontSize: '13px'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleMultiCampaignInspectionSubmit}
                        disabled={!canSubmit || submitting}
                        style={{
                          padding: '10px 24px', borderRadius: '6px', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                          border: 'none', backgroundColor: canSubmit && !submitting ? '#22c55e' : t.textDim,
                          color: 'white', fontWeight: '700', fontSize: '13px',
                          opacity: canSubmit && !submitting ? 1 : 0.6
                        }}
                      >
                        {submitting ? 'Guardando...' : !allMarked ? `Faltan ${totalDefects - markedCount} defectos` : (nokCount > 0 && !modalDispositionId) ? 'Falta disposición' : '✓ Guardar Inspección'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRBDefectCapture;
