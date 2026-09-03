import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import MRBShiftReport from './MRBShiftReport';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import {
  AlertTriangle, ArrowLeft, Send, Check, Clock, User, MapPin,
  FileText, Camera, MessageSquare, CheckCircle, XCircle, Users,
  List, PlusCircle, LayoutDashboard, ClipboardCheck, Link, ExternalLink,
  RefreshCw, Search, X, Package, Paperclip, Trash2, Info,
  Eye, ZoomIn, Hash, AlignLeft, Edit3, UserPlus, Save, Settings
} from 'lucide-react';

const API_URL_DETAIL = 'http://localhost:5000';

const PersonnelRow = ({ row, campaignId, token, theme: t, onSaved, savingPersonnel, setSavingPersonnel }) => {
  const [editing, setEditing] = React.useState(false);
  const [hrs, setHrs]   = React.useState(row.hoursWorked);
  const [insp, setInsp] = React.useState(row.inspectorCount);
  const [sup, setSup]   = React.useState(row.supervisorCount);

  const handleSave = async () => {
    setSavingPersonnel(true);
    try {
      await fetch(`${API_URL_DETAIL}/mrb/${campaignId}/shift-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shiftId: row.shiftId, inspectionDate: row.inspectionDate, inspectorCount: insp, supervisorCount: sup, hoursWorked: hrs })
      });
      setEditing(false);
      onSaved();
    } catch (_) {}
    finally { setSavingPersonnel(false); }
  };

  const fmtDate = d => { const s = typeof d === 'string' ? d.substring(0, 10) : d; return new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }); };
  const cost = (parseFloat(insp) * parseFloat(hrs) * row.inspectorRate) + (parseFloat(sup) * parseFloat(hrs) * row.supervisorRate);

  return (
    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
      <td style={{ padding: '5px 8px', color: t.text, fontSize: '12px' }}>{fmtDate(row.inspectionDate)}</td>
      <td style={{ padding: '5px 8px', color: t.text }}>{row.shiftCode || '—'} <span style={{ color: t.textMuted, fontSize: '11px' }}>{row.shiftName}</span></td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing
          ? <input type="number" min="0.5" max="24" step="0.5" value={hrs} onChange={e => setHrs(parseFloat(e.target.value) || 0)} autoFocus
              style={{ width: '64px', padding: '4px', textAlign: 'center', border: `1px solid ${t.accent}`, borderRadius: '4px', backgroundColor: t.bgInput, color: t.text, fontSize: '13px', fontWeight: '600' }} />
          : <span style={{ fontWeight: hrs > 0 ? '600' : '400', color: hrs > 0 ? t.text : '#f59e0b' }}>{hrs > 0 ? `${hrs} hrs` : '— sin registrar'}</span>
        }
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: '12px' }}>
        {editing ? (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
            <input type="number" min="0" step="1" value={insp} onChange={e => setInsp(parseFloat(e.target.value) || 0)}
              style={{ width: '44px', padding: '3px', textAlign: 'center', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgInput, color: t.text, fontSize: '12px' }} />
            <span style={{ color: t.textMuted }}>insp</span>
            <input type="number" min="0" step="1" value={sup} onChange={e => setSup(parseFloat(e.target.value) || 0)}
              style={{ width: '44px', padding: '3px', textAlign: 'center', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgInput, color: t.text, fontSize: '12px' }} />
            <span style={{ color: t.textMuted }}>sup</span>
          </div>
        ) : <span style={{ color: t.textMuted }}>{insp} insp · {sup} sup</span>}
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '600', color: hrs > 0 ? '#C77700' : t.textMuted }}>{hrs > 0 ? `$${cost.toFixed(2)}` : '—'}</td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing
          ? <button onClick={handleSave} disabled={savingPersonnel} style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>✓ Guardar</button>
          : <button onClick={() => setEditing(true)} style={{ padding: '4px 8px', backgroundColor: t.bgInput, color: t.accent, border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>✎ Hrs</button>
        }
      </td>
    </tr>
  );
};

const MRBCampaignDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const { subscribe } = useSocket();
  const API_URL = 'http://localhost:5000';

  // Traducciones locales
  const L = {
    en: {
      // Status
      draft: 'Draft', pendingDisposition: 'Pending Disposition', inProcessValidation: 'In Process - Pending Validation',
      closed: 'Closed', cancelled: 'Cancelled',
      // Tabs
      caseDetail: 'Case Detail', campaignProgress: 'Campaign Progress',
      // Quarantine
      quarantineMaterial: 'Material in Quarantine', warehouse: 'Warehouse', process: 'Process', transit: 'Transit', customer: 'Customer',
      quarantineSynced: 'Quarantine synced from 8D', quarantineUpdated: 'Quarantine updated',
      syncFrom8D: 'Sync from 8D', edit: 'Edit', cancel: 'Cancel', save: 'Save', saving: 'Saving...',
      quarantineHelp8D: 'Click "Sync from 8D" to load quantities from D2, or edit manually.',
      quarantineHelpManual: 'Enter quarantine quantities using the "Edit" button.',
      // Results
      inspected: 'INSP', ok: 'OK', nok: 'NOK', rework: 'Rework', scrap: 'Scrap', return: 'Return', hold: 'Hold', useAsIs: 'Use as is', yield: 'Yield',
      // Cost table
      part: 'Part', qtyScrap: 'Qty Scrap', unitCost: 'Unit Cost', total: 'Total',
      // Personnel table
      date: 'Date', shift: 'Shift', hoursWorked: 'Hours Worked', resources: 'Resources', cost: 'Cost',
      noRecord: '— no record', hrs: 'hrs', insp: 'insp', sup: 'sup',
      // Alerts
      errorConnection: 'Connection error', errorUpdateQuarantine: 'Error updating quarantine',
      rootCauseRequired: 'Root cause and corrective action are required', errorSendResponse: 'Error sending response',
      indicateRejectionReason: 'Please indicate the rejection reason', provideEarlyCloseReason: 'You must provide the early close reason',
      errorValidation: 'Error in validation', errorAddComment: 'Error adding comment',
      selectNewSource: 'Select a new source', errorChangeSource: 'Error changing source', errorSync: 'Error syncing',
      titleRequired: 'Title is required', campaignPublished: 'MRB Campaign published successfully', changesSaved: 'Changes saved successfully',
      errorSave: 'Error saving', d5d6NotCompleted: 'The linked 8D does not have D5/D6 completed yet.', errorSyncD5D6: 'Error syncing D5/D6',
      errorDelete: 'Error deleting', errorPublish: 'Error publishing',
      // Buttons
      uploading: 'Uploading...', addFile: 'Add file', publishCampaign: 'Publish MRB Campaign', publishing: 'Publishing...',
      saveChange: 'Save Change',
      // Labels
      client: 'Client', responsibleDept: 'Responsible Department', validator: 'Validator', responsible: 'Responsible',
      unknownDate: 'Unknown date',
      // Adopt fields
      campaignTitle: 'Campaign Title', clientProject: 'Client / Project', partNumbers: 'Part Number(s)', problemDescription: 'Problem Description',
      quarantineQty: 'Quarantine Quantities', photosNokOk: 'NOK / OK Photos', inspectionCriteria: 'Inspection Criteria (D3)', dispositionInstructions: 'Disposition Instructions (D3)',
    },
    es: {
      // Status
      draft: 'Borrador', pendingDisposition: 'Pendiente de Disposición', inProcessValidation: 'En Proceso - Pendiente Validación',
      closed: 'Cerrado', cancelled: 'Cancelado',
      // Tabs
      caseDetail: 'Detalle del Caso', campaignProgress: 'Avance de Campaña',
      // Quarantine
      quarantineMaterial: 'Material en Cuarentena', warehouse: 'Almacén', process: 'Proceso', transit: 'Tránsito', customer: 'Cliente',
      quarantineSynced: 'Cuarentena sincronizada desde 8D', quarantineUpdated: 'Cuarentena actualizada',
      syncFrom8D: 'Sync desde 8D', edit: 'Editar', cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando...',
      quarantineHelp8D: 'Haz clic en "Sync desde 8D" para cargar las cantidades del D2, o edita manualmente.',
      quarantineHelpManual: 'Captura las cantidades en cuarentena con el botón "Editar".',
      // Results
      inspected: 'INSP', ok: 'OK', nok: 'NOK', rework: 'Rework', scrap: 'Scrap', return: 'Return', hold: 'Hold', useAsIs: 'Usar c/es', yield: 'Yield',
      // Cost table
      part: 'Parte', qtyScrap: 'Qty Scrap', unitCost: 'Costo Unit.', total: 'Total',
      // Personnel table
      date: 'Fecha', shift: 'Turno', hoursWorked: 'Horas Trabajadas', resources: 'Recursos', cost: 'Costo',
      noRecord: '— sin registrar', hrs: 'hrs', insp: 'insp', sup: 'sup',
      // Alerts
      errorConnection: 'Error de conexión', errorUpdateQuarantine: 'Error al actualizar cuarentena',
      rootCauseRequired: 'Causa raíz y acción correctiva son requeridas', errorSendResponse: 'Error al enviar respuesta',
      indicateRejectionReason: 'Por favor indica el motivo del rechazo', provideEarlyCloseReason: 'Debes proporcionar el motivo de cierre anticipado',
      errorValidation: 'Error en validación', errorAddComment: 'Error al agregar comentario',
      selectNewSource: 'Selecciona un nuevo origen', errorChangeSource: 'Error al cambiar origen', errorSync: 'Error al sincronizar',
      titleRequired: 'El título es requerido', campaignPublished: 'Campaña MRB publicada exitosamente', changesSaved: 'Cambios guardados correctamente',
      errorSave: 'Error al guardar', d5d6NotCompleted: 'El 8D vinculado aún no tiene D5/D6 completados.', errorSyncD5D6: 'Error al sincronizar D5/D6',
      errorDelete: 'Error al eliminar', errorPublish: 'Error al publicar',
      // Buttons
      uploading: 'Subiendo...', addFile: 'Agregar archivo', publishCampaign: 'Publicar Campaña MRB', publishing: 'Publicando...',
      saveChange: 'Guardar Cambio',
      // Labels
      client: 'Cliente', responsibleDept: 'Departamento Responsable', validator: 'Validador', responsible: 'Responsable',
      unknownDate: 'Fecha desconocida',
      // Adopt fields
      campaignTitle: 'Título de la Campaña', clientProject: 'Cliente / Proyecto', partNumbers: 'Número(s) de Parte', problemDescription: 'Descripción del Problema',
      quarantineQty: 'Cantidades de Cuarentena', photosNokOk: 'Fotos NOK / OK', inspectionCriteria: 'Criterio de Inspección (D3)', dispositionInstructions: 'Instrucciones de Disposición (D3)',
    }
  }[language] || {};

  const [mrbCase, setMrbCase] = useState(null);
  const [defects, setDefects] = useState([]);
  const [costSummary, setCostSummary] = useState(null);
  const [savingPersonnel, setSavingPersonnel] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [uploadingAttach, setUploadingAttach] = useState(false);

  // Response form
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Draft edit fields
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftLotNumber, setDraftLotNumber] = useState('');
  const [draftPartDescription, setDraftPartDescription] = useState('');
  const [draftInspectionCriteria, setDraftInspectionCriteria] = useState('');
  const [draftDispositionInstructions, setDraftDispositionInstructions] = useState('');
  const [draftInspectorCount, setDraftInspectorCount] = useState(0);
  const [draftSupervisorCount, setDraftSupervisorCount] = useState(0);
  const [draftInspectorUnitCost, setDraftInspectorUnitCost] = useState(0);
  const [draftSupervisorUnitCost, setDraftSupervisorUnitCost] = useState(0);

  // Validation form
  const [rejectionReason, setRejectionReason] = useState('');
  const [earlyCloseReason, setEarlyCloseReason] = useState('');
  const [requiresEarlyCloseReason, setRequiresEarlyCloseReason] = useState(false);

  // New comment
  const [newComment, setNewComment] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Campaign progress tab
  const [activeTab, setActiveTab] = useState('detail');
  const [progressData, setProgressData] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [shiftReport, setShiftReport] = useState(null); // { shiftId, date, shiftLabel }

  // Quarantine quantities
  const [showQuarantineEdit, setShowQuarantineEdit] = useState(false);
  const [qWarehouse, setQWarehouse] = useState(0);
  const [qProcess, setQProcess]     = useState(0);
  const [qTransit, setQTransit]     = useState(0);
  const [qCustomer, setQCustomer]   = useState(0);
  const [savingQuarantine, setSavingQuarantine] = useState(false);

  // Source change modal
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceType, setSourceType] = useState(null);
  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNewSource, setSelectedNewSource] = useState(null);
  const [isLinking8d, setIsLinking8d] = useState(false);
  const [adoptFields, setAdoptFields] = useState({
    title: true, client: true, parts: true, defectDescription: true,
    quarantine: true, photos: true, criteria: true, disposition: true
  }); // true = link-8d endpoint, false = change-source endpoint

  // Add Part modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedPartToAdd, setSelectedPartToAdd] = useState(null);
  const [addingPart, setAddingPart] = useState(false);

  // Affected Serials modal
  const [showAffectedSerialsModal, setShowAffectedSerialsModal] = useState(false);
  const [affectedSerials, setAffectedSerials] = useState([]);
  const [affectedSerialsSummary, setAffectedSerialsSummary] = useState({ total: 0, inspected: 0, pending: 0 });
  const [maxInspectionRound, setMaxInspectionRound] = useState(0);
  const [roundComments, setRoundComments] = useState({});
  const scrollTopRef = useRef(null);
  const scrollBottomRef = useRef(null);
  const [loadingSerials, setLoadingSerials] = useState(false);
  const [savingSerials, setSavingSerials] = useState(false);
  // Tab control for serial modal
  const [serialModalTab, setSerialModalTab] = useState('search'); // 'search' | 'manual'
  // Search mode states
  const [searchMode, setSearchMode] = useState('date'); // 'date' | 'serial'
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchSerialFrom, setSearchSerialFrom] = useState('');
  const [searchSerialTo, setSearchSerialTo] = useState('');
  const [campaignParts, setCampaignParts] = useState([]);
  const [selectedSearchParts, setSelectedSearchParts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchSerials, setSelectedSearchSerials] = useState(new Set()); // Selected serial indices
  const [searchLoading, setSearchLoading] = useState(false);
  // Manual entry states
  const [manualSerials, setManualSerials] = useState([{ serial: '', partId: '' }]);

  // Campaign Defects modal
  const [showDefectsModal, setShowDefectsModal] = useState(false);
  const [campaignDefects, setCampaignDefects] = useState([]); // Currently configured defects
  const [availableDefects, setAvailableDefects] = useState([]); // All defects for campaign parts
  const [selectedDefectIds, setSelectedDefectIds] = useState([]); // Selected defect IDs for editing
  const [loadingDefects, setLoadingDefects] = useState(false);
  const [savingDefects, setSavingDefects] = useState(false);

  useEffect(() => {
    loadMrb();
    loadCurrentUser();
  }, [id]);

  // WebSocket: actualizar en tiempo real
  useEffect(() => {
    const events = ['mrb:updated', 'mrb:inspection', 'mrb:closed', 'package:created', 'package:received'];
    const unsubscribes = events.map(event => subscribe(event, (data) => {
      if (!data.campaignId || data.campaignId === parseInt(id)) {
        loadMrb();
      }
    }));
    return () => unsubscribes.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, id]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadMrb = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setMrbCase(data.mrb || data.campaign);
        setDefects(data.defects || []);
        setRecipients(data.recipients || []);
        setComments(data.comments || []);
        setAttachments(data.attachments || []);
        // Load cost summary and affected serials in parallel
        fetch(`${API_URL}/mrb/${id}/cost-summary`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          .then(r => r.json()).then(cs => { if (cs.success) setCostSummary(cs); }).catch(() => {});
        fetch(`${API_URL}/mrb/${id}/affected-serials`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          .then(r => r.json()).then(as => { if (as.success) { setAffectedSerials(as.serials || []); setAffectedSerialsSummary(as.summary || { total: 0, inspected: 0, pending: 0 }); setMaxInspectionRound(as.maxRound || 0); setRoundComments(as.roundComments || {}); } }).catch(() => {});
        fetch(`${API_URL}/mrb/${id}/campaign-defects`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          .then(r => r.json()).then(cd => { if (cd.success) setCampaignDefects(cd.defects || []); }).catch(() => {});

        // Pre-fill response if exists
        const mrb = data.mrb || data.campaign;
        if (mrb.rootCause) setRootCause(mrb.rootCause);
        if (mrb.correctiveAction) setCorrectiveAction(mrb.correctiveAction);
        if (mrb.resolutionNotes) setResolutionNotes(mrb.resolutionNotes);

        // Pre-fill quarantine quantities
        setQWarehouse(mrb.qtyQuarantineWarehouse || 0);
        setQProcess(mrb.qtyQuarantineProcess || 0);
        setQTransit(mrb.qtyQuarantineTransit || 0);
        setQCustomer(mrb.qtyQuarantineCustomer || 0);

        // Pre-fill draft edit fields
        setDraftTitle(mrb.title || '');
        setDraftDescription(mrb.description || '');
        setDraftLotNumber(mrb.lotNumber || '');
        setDraftPartDescription(mrb.partDescription || '');
        setDraftInspectionCriteria(mrb.inspectionCriteria || '');
        setDraftDispositionInstructions(mrb.dispositionInstructions || '');
        setDraftInspectorCount(mrb.inspectorCount || 0);
        setDraftSupervisorCount(mrb.supervisorCount || 0);
        setDraftInspectorUnitCost(mrb.inspectorUnitCost || 0);
        setDraftSupervisorUnitCost(mrb.supervisorUnitCost || 0);
      }
      // Load shifts catalog (for tally reassignment)
      if (!shifts.length) {
        try {
          const token = localStorage.getItem('token');
          const sr = await fetch(`${API_URL}/inspection-catalogs/shifts`, { headers: { Authorization: `Bearer ${token}` } });
          const sd = await sr.json();
          setShifts(sd.items || []);
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error loading MRB:', err);
    } finally {
      setLoading(false);
    }
  };

  const logHistory = async (comment, commentType = 'audit') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment, commentType })
      });
      const data = await res.json();
      if (data.success && data.comment) setComments(prev => [...prev, data.comment]);
    } catch (_) {}
  };

  // ===== ADD PART FUNCTIONS =====
  const loadAvailableParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/available-parts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvailableParts(data.parts || []);
      }
    } catch (err) {
      console.error('Error loading available parts:', err);
    }
  };

  const handleOpenAddPartModal = async () => {
    await loadAvailableParts();
    setSelectedPartToAdd(null);
    setShowAddPartModal(true);
  };

  const handleAddPart = async () => {
    if (!selectedPartToAdd) return;
    setAddingPart(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/add-part`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ partId: selectedPartToAdd.id })
      });
      const data = await res.json();
      if (data.success) {
        await logHistory(`Parte agregada: ${selectedPartToAdd.partNumber}`, 'audit');
        setShowAddPartModal(false);
        loadMrb(); // Reload to get updated parts list
      } else {
        alert(data.message || 'Error al agregar parte');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setAddingPart(false);
    }
  };

  // ===== CAMPAIGN DEFECTS FUNCTIONS =====
  const loadCampaignDefects = async () => {
    setLoadingDefects(true);
    try {
      const token = localStorage.getItem('token');
      const [configuredRes, availableRes] = await Promise.all([
        fetch(`${API_URL}/mrb/${id}/campaign-defects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/mrb/${id}/available-defects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const [configuredData, availableData] = await Promise.all([configuredRes.json(), availableRes.json()]);

      if (configuredData.success) {
        setCampaignDefects(configuredData.defects || []);
        setSelectedDefectIds((configuredData.defects || []).map(d => d.defectTypeId));
      }
      if (availableData.success) {
        setAvailableDefects(availableData.defects || []);
      }
    } catch (err) {
      console.error('Error loading campaign defects:', err);
    } finally {
      setLoadingDefects(false);
    }
  };

  const handleOpenDefectsModal = async () => {
    setShowDefectsModal(true);
    await loadCampaignDefects();
  };

  const toggleDefectSelection = (defectTypeId) => {
    setSelectedDefectIds(prev => {
      if (prev.includes(defectTypeId)) {
        return prev.filter(id => id !== defectTypeId);
      } else {
        return [...prev, defectTypeId];
      }
    });
  };

  const handleSaveDefects = async () => {
    setSavingDefects(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/campaign-defects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ defectTypeIds: selectedDefectIds })
      });
      const data = await res.json();
      if (data.success) {
        setShowDefectsModal(false);
        // Reload to update UI
        await loadCampaignDefects();
      }
    } catch (err) {
      console.error('Error saving defects:', err);
    } finally {
      setSavingDefects(false);
    }
  };

  // ===== AFFECTED SERIALS FUNCTIONS =====
  const loadAffectedSerials = async () => {
    setLoadingSerials(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/affected-serials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAffectedSerials(data.serials || []);
        setAffectedSerialsSummary(data.summary || { total: 0, inspected: 0, pending: 0 });
        setMaxInspectionRound(data.maxRound || 0);
        setRoundComments(data.roundComments || {});
      }
    } catch (err) {
      console.error('Error loading affected serials:', err);
    } finally {
      setLoadingSerials(false);
    }
  };

  const loadCampaignParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/campaign-parts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCampaignParts(data.parts || []);
        setSelectedSearchParts(data.parts.map(p => p.id)); // Select all by default
      }
    } catch (err) {
      console.error('Error loading campaign parts:', err);
    }
  };

  const handleOpenAffectedSerialsModal = async () => {
    await loadAffectedSerials();
    await loadCampaignParts();
    setSerialModalTab('search');
    setSearchMode('date');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchSerialFrom('');
    setSearchSerialTo('');
    setSearchResults([]);
    setManualSerials([{ serial: '', partId: '' }]);
    setShowAffectedSerialsModal(true);
  };

  const handleSearchSerials = async () => {
    if (selectedSearchParts.length === 0) {
      alert('Selecciona al menos una parte');
      return;
    }
    if (searchMode === 'date' && (!searchDateFrom || !searchDateTo)) {
      alert('Selecciona el rango de fechas');
      return;
    }
    if (searchMode === 'serial' && (!searchSerialFrom || !searchSerialTo)) {
      alert('Ingresa el rango de seriales');
      return;
    }

    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        mode: searchMode,
        partIds: selectedSearchParts.join(',')
      });
      if (searchMode === 'date') {
        params.append('dateFrom', searchDateFrom);
        params.append('dateTo', searchDateTo);
      } else {
        params.append('serialFrom', searchSerialFrom);
        params.append('serialTo', searchSerialTo);
      }

      const res = await fetch(`${API_URL}/mrb/${id}/search-serials?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const serials = data.serials || [];
        setSearchResults(serials);
        // Seleccionar todos por defecto
        setSelectedSearchSerials(new Set(serials.map((_, i) => i)));
        if (data.truncated) {
          alert('Se encontraron más de 5000 seriales. Mostrando los primeros 5000.');
        }
      } else {
        alert(data.message || 'Error en la búsqueda');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSearchResults = async () => {
    const selectedSerials = searchResults.filter((_, i) => selectedSearchSerials.has(i));
    if (selectedSerials.length === 0) return;
    setSavingSerials(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/affected-serials/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          serials: selectedSerials.map(s => ({ serialNumber: s.serialNumber, partId: s.partId }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults([]);
        setSelectedSearchSerials(new Set());
        await loadAffectedSerials();
        await logHistory(`Seriales cargados desde sistema: ${data.inserted} nuevos${data.duplicates > 0 ? `, ${data.duplicates} duplicados omitidos` : ''}`, 'audit');
        alert(data.message);
      } else {
        alert(data.message || 'Error al agregar seriales');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSavingSerials(false);
    }
  };

  const handleAddManualRow = () => {
    setManualSerials(prev => [...prev, { serial: '', partId: '' }]);
  };

  const handleRemoveManualRow = (index) => {
    setManualSerials(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualSerialChange = (index, field, value) => {
    setManualSerials(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleAddManualSerials = async () => {
    const validSerials = manualSerials.filter(s => s.serial.trim() && s.partId);
    if (validSerials.length === 0) {
      alert('Ingresa al menos un serial con su parte');
      return;
    }

    setSavingSerials(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/affected-serials/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          serials: validSerials.map(s => ({ serialNumber: s.serial.trim(), partId: parseInt(s.partId) }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setManualSerials([{ serial: '', partId: '' }]);
        await loadAffectedSerials();
        await logHistory(`Seriales manuales agregados: ${data.inserted} nuevos${data.duplicates > 0 ? `, ${data.duplicates} duplicados omitidos` : ''}`, 'audit');
        alert(data.message);
      } else {
        alert(data.message || 'Error al agregar seriales');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSavingSerials(false);
    }
  };

  const handleDeleteSerial = async (serialId) => {
    if (!window.confirm('¿Eliminar este serial de la lista?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/mrb/${id}/affected-serials/${serialId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadAffectedSerials();
    } catch (err) {
      alert('Error al eliminar serial');
    }
  };

  const handleClearAllSerials = async () => {
    if (!window.confirm('¿Eliminar TODOS los seriales afectados de esta campaña?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/affected-serials`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        await loadAffectedSerials();
        await logHistory(`Seriales afectados eliminados: ${data.deleted}`, 'audit');
      }
    } catch (err) {
      alert('Error al limpiar seriales');
    }
  };

  const handleSaveQuarantine = async (syncFrom8D = false) => {
    setSavingQuarantine(true);
    const token = localStorage.getItem('token');
    try {
      const body = syncFrom8D
        ? { syncFrom8D: true }
        : { warehouse: qWarehouse, process: qProcess, transit: qTransit, customer: qCustomer };
      const res = await fetch(`${API_URL}/mrb/${id}/quarantine`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        const q = data.quarantine;
        setMrbCase(prev => ({ ...prev,
          qtyQuarantineTotal:     q.qtyQuarantineTotal,
          qtyQuarantineWarehouse: q.qtyQuarantineWarehouse,
          qtyQuarantineProcess:   q.qtyQuarantineProcess,
          qtyQuarantineTransit:   q.qtyQuarantineTransit,
          qtyQuarantineCustomer:  q.qtyQuarantineCustomer,
          qtyQuarantineUpdatedAt: q.qtyQuarantineUpdatedAt,
        }));
        setQWarehouse(q.qtyQuarantineWarehouse || 0);
        setQProcess(q.qtyQuarantineProcess     || 0);
        setQTransit(q.qtyQuarantineTransit     || 0);
        setQCustomer(q.qtyQuarantineCustomer   || 0);
        setShowQuarantineEdit(false);
        await logHistory(
          syncFrom8D
            ? 'Cuarentena sincronizada desde 8D'
            : `Cuarentena actualizada — Almacén: ${qWarehouse}, Proceso: ${qProcess}, Tránsito: ${qTransit}, Cliente: ${qCustomer}`,
          'audit'
        );
        alert(syncFrom8D ? `${L.quarantineSynced} ✓` : `${L.quarantineUpdated} ✓`);
      } else {
        alert(data.message || L.errorUpdateQuarantine);
      }
    } catch (e) {
      alert(L.errorConnection);
    } finally {
      setSavingQuarantine(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!rootCause.trim() || !correctiveAction.trim()) {
      alert(L.rootCauseRequired);
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/mrb/${id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rootCause,
          correctiveAction,
          resolutionNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.validationEmails?.length > 0) {
          const subject = encodeURIComponent(`[MRB ${mrbCase.campaignNumber}] Disposición registrada — Pendiente de validación`);
          const body = encodeURIComponent(
            `${data.validationNames?.join(', ') || 'Validador'},\n\n` +
            `Se ha registrado una disposición en la campaña MRB ${mrbCase.campaignNumber} y está pendiente de tu validación.\n\n` +
            `Por favor accede al sistema para revisar y aprobar o rechazar:\n` +
            `${window.location.origin}/mrb-campaign/${id}\n\n` +
            `— ${mrbCase.respondedByName || 'Responsable'}`
          );
          window.location.href = `mailto:${data.validationEmails.join(';')}?subject=${subject}&body=${body}`;
        } else {
          alert(data.message);
        }
        setTimeout(() => window.location.reload(), 800);
      } else {
        alert(data.message || L.errorSendResponse);
      }
    } catch (err) {
      alert(L.errorSendResponse);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidation = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      alert(L.indicateRejectionReason);
      return;
    }
    if (approved && requiresEarlyCloseReason && !earlyCloseReason.trim()) {
      alert(L.provideEarlyCloseReason);
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/mrb/${id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approved, rejectionReason, earlyCloseReason: earlyCloseReason.trim() || undefined })
      });

      const data = await res.json();
      if (data.success) {
        setRejectionReason('');
        setEarlyCloseReason('');
        setRequiresEarlyCloseReason(false);
        loadMrb();
        // If rejection and we have responsible email, open mailto
        if (!approved && data.responsibleEmails?.length > 0) {
          const subject = encodeURIComponent(`[MRB ${mrbCase.campaignNumber}] Respuesta rechazada — Se requiere corrección`);
          const body = encodeURIComponent(
            `${data.responsibleNames?.join(', ') || 'Responsable'},\n\n` +
            `La respuesta enviada en la campaña MRB ${mrbCase.campaignNumber} fue rechazada.\n\n` +
            `Motivo: ${rejectionReason}\n\n` +
            `Por favor accede al sistema y corrige la respuesta:\n` +
            `${window.location.origin}/mrb-campaign/${id}\n\n` +
            `— Adrian Salazar`
          );
          window.location.href = `mailto:${data.responsibleEmails.join(';')}?subject=${subject}&body=${body}`;
        } else {
          alert(data.message);
        }
      } else if (data.requiresReason) {
        setRequiresEarlyCloseReason(true);
        alert(data.message);
      } else {
        alert(data.message || L.errorValidation);
      }
    } catch (err) {
      alert(L.errorValidation);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comment: newComment, commentType: 'note' })
      });

      const data = await res.json();
      if (data.success) {
        setNewComment('');
        loadMrb();
      }
    } catch (err) {
      alert(L.errorAddComment);
    }
  };

  // Load sources for the change source modal
  const loadSources = async (type) => {
    try {
      setSourcesLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`${API_URL}/mrb/sources?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error('Error loading sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  };

  // Open source change modal
  const openSourceModal = () => {
    setIsLinking8d(false);
    setSourceType('8D');
    setSelectedNewSource(null);
    setSearchTerm('');
    setShowSourceModal(true);
    loadSources('8D');
  };

  // Open modal to link a 8D to an INCOMING campaign
  const openLink8dModal = () => {
    setIsLinking8d(true);
    setSourceType('8D');
    setSelectedNewSource(null);
    setAdoptFields({ title: true, client: true, parts: true, defectDescription: true, quarantine: true, photos: true, criteria: true, disposition: true });
    setSearchTerm('');
    setShowSourceModal(true);
    loadSources('8D');
  };

  // Change source
  const handleChangeSource = async () => {
    if (!selectedNewSource) {
      alert(L.selectNewSource);
      return;
    }

    // Warn about empty fields before proceeding (only for 8D sources)
    const src = selectedNewSource;
    if (src.sourceType === '8D' || isLinking8d) {
      const partsList = src.partsList?.filter(p => p && p.partNumber) || [];
      const emptyFields = [];
      if (adoptFields.title             && !src.title)                                          emptyFields.push('Título de la Campaña');
      if (adoptFields.client            && !src.clientId)                                       emptyFields.push('Cliente / Proyecto');
      if (adoptFields.parts             && partsList.length === 0 && !src.partNumber)           emptyFields.push('Número(s) de Parte');
      if (adoptFields.defectDescription && !src.defectDescription)                             emptyFields.push('Descripción del Problema');
      if (adoptFields.quarantine        && !src.qtyWarehouse && !src.qtyInProcess && !src.qtyInTransit && !src.qtyWithCustomer) emptyFields.push('Cantidades de Cuarentena');
      if (adoptFields.photos            && !src.photoNokPath && !src.photoOkPath)              emptyFields.push('Fotos NOK / OK');
      if (adoptFields.criteria          && !src.inspectionCriteria)                            emptyFields.push('Criterio de Inspección (D3)');
      if (adoptFields.disposition       && !src.dispositionInstructions)                       emptyFields.push('Instrucciones de Disposición (D3)');

      if (emptyFields.length > 0) {
        const proceed = window.confirm(
          `Los siguientes campos no tienen datos en el 8D ${src.folio}:\n\n${emptyFields.map(f => `• ${f}`).join('\n')}\n\n¿Deseas continuar de todos modos? Se limpiarán esos campos.\n\nSí = continuar  /  No = revisar selección`
        );
        if (!proceed) return;
      }
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      let res;
      if (isLinking8d) {
        res = await fetch(`${API_URL}/mrb/${id}/link-8d`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ source8dId: selectedNewSource.id, adoptFields, source: selectedNewSource })
        });
      } else {
        const effectiveType = selectedNewSource?.sourceType || sourceType;
        res = await fetch(`${API_URL}/mrb/${id}/source`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sourceType: effectiveType,
            sourceQarId: effectiveType === 'QAR' ? selectedNewSource.id : null,
            source8dId: effectiveType === '8D' ? selectedNewSource.id : null
          })
        });
        // If changing to 8D source, also apply adopted fields
        if (effectiveType === '8D' && (await res.json()).success) {
          await fetch(`${API_URL}/mrb/${id}/link-8d`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ source8dId: selectedNewSource.id, adoptFields, source: selectedNewSource })
          });
          setShowSourceModal(false);
          setIsLinking8d(false);
          loadMrb();
          return;
        }
      }

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowSourceModal(false);
        setIsLinking8d(false);
        loadMrb();
      } else {
        alert(data.message || L.errorChangeSource);
      }
    } catch (err) {
      alert(L.errorChangeSource);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncFromSource = async () => {
    if (!window.confirm('¿Sincronizar Descripción de Parte, Criterio de Inspección e Instrucciones de Disposición desde el 8D vinculado? Esto sobreescribirá los valores actuales.')) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${id}/sync-from-source`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const { synced } = data;
        if (synced.partDescription) setDraftPartDescription(synced.partDescription);
        if (synced.inspectionCriteria) setDraftInspectionCriteria(synced.inspectionCriteria);
        if (synced.dispositionInstructions) setDraftDispositionInstructions(synced.dispositionInstructions);
      } else {
        alert(data.message || L.errorSync);
      }
    } catch (e) { alert(L.errorSync); }
    finally { setSubmitting(false); }
  };

  const handleSaveDraft = async (publish = false) => {
    if (!draftTitle.trim()) { alert(L.titleRequired); return; }
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: draftTitle,
          description: draftDescription,
          lotNumber: draftLotNumber,
          partDescription: Array.isArray(mrbCase.partsList) && mrbCase.partsList.length > 0
            ? mrbCase.partsList.map(p => `${p.partNumber}${p.partName ? ' — ' + p.partName : ''}`).join('\n')
            : draftPartDescription,
          inspectionCriteria: draftInspectionCriteria,
          dispositionInstructions: draftDispositionInstructions,
          inspectorCount: draftInspectorCount,
          supervisorCount: draftSupervisorCount,
          inspectorUnitCost: draftInspectorUnitCost,
          supervisorUnitCost: draftSupervisorUnitCost,
          ...(publish ? { status: 'ABIERTA' } : {})
        })
      });
      const data = await res.json();
      if (data.success) {
        if (publish && data.published && data.notifyRecipients?.length > 0) {
          const mrb = data.mrb;
          const toEmails = data.notifyRecipients.map(r => r.email).join(';');
          const names    = data.notifyRecipients.map(r => r.name).join(', ');
          const link     = `${window.location.origin}/mrb-campaign/${mrb.id}`;
          const subject  = encodeURIComponent(`[MRB] ${mrb.campaignNumber} — ${mrb.title}`);
          const body     = encodeURIComponent(
            `Se ha generado una nueva Campaña MRB que requiere tu atención.\n\n` +
            `Campaña: ${mrb.campaignNumber}\n` +
            `Título: ${mrb.title}\n` +
            `Cliente: ${mrb.clientName || '—'}\n` +
            `Parte: ${(Array.isArray(mrb.partsList) && mrb.partsList.length > 0 ? mrb.partsList.map(p => p.partNumber).join(', ') : mrb.partNumber) || '—'}\n` +
            `Lote: ${mrb.lotNumber || '—'}\n\n` +
            `Criterio de Inspección:\n${mrb.inspectionCriteria || '—'}\n\n` +
            `Instrucción de Disposición:\n${mrb.dispositionInstructions || '—'}\n\n` +
            `Accede aquí: ${link}\n\n` +
            `Destinatarios: ${names}`
          );
          window.location.href = `mailto:${toEmails}?subject=${subject}&body=${body}`;
        } else if (publish) {
          alert(L.campaignPublished);
        } else {
          alert(L.changesSaved);
        }
        loadMrb();
      } else {
        alert(data.message || L.errorSave);
      }
    } catch (e) { alert(L.errorSave); }
    finally { setSubmitting(false); }
  };

  const handleSyncD5D6 = async () => {
    if (!window.confirm('¿Importar Causa Raíz (D5) y Acción Correctiva (D6) desde el 8D vinculado? Sobreescribirá los valores actuales si están vacíos.')) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${id}/sync-d5d6`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const { synced } = data;
        if (synced.rootCause) setRootCause(synced.rootCause);
        if (synced.correctiveAction) setCorrectiveAction(synced.correctiveAction);
        if (!synced.rootCause && !synced.correctiveAction) {
          alert(L.d5d6NotCompleted);
        }
      } else {
        alert(data.message || L.errorSyncD5D6);
      }
    } catch (e) { alert(L.errorSync); }
    finally { setSubmitting(false); }
  };

  const handleUploadAttachment = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingAttach(true);
    const token = localStorage.getItem('token');
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('attachmentType', 'additional');
      try {
        const res = await fetch(`${API_URL}/mrb/${id}/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        const data = await res.json();
        if (data.success) {
          setAttachments(prev => [...prev, data.attachment]);
          await logHistory(`Archivo adjuntado: ${file.name}`, 'audit');
        }
      } catch (err) {
        console.error('Error uploading attachment:', err);
      }
    }
    setUploadingAttach(false);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${id}/attachments/${attachId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const att = attachments.find(a => a.id === attachId);
      if ((await res.json()).success) {
        setAttachments(prev => prev.filter(a => a.id !== attachId));
        await logHistory(`Archivo eliminado: ${att?.filename || attachId}`, 'audit');
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const loadProgress = async () => {
    setProgressLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${id}/campaign-progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProgressData(data.rows || []);
    } catch (err) {
      console.error('Error loading progress:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      'BORRADOR': { color: '#6b7280', label: L.draft, icon: FileText },
      'ABIERTA': { color: '#C77700', label: L.pendingDisposition, icon: AlertTriangle },
      'EN_PROCESO': { color: '#0072CE', label: L.inProcessValidation, icon: Clock },
      'CERRADA': { color: '#22c55e', label: L.closed, icon: CheckCircle },
      'CANCELADA': { color: '#B00020', label: L.cancelled, icon: XCircle }
    };
    return configs[status] || { color: '#6b7280', label: status, icon: AlertTriangle };
  };

  const responseRecipients = recipients.filter(r => r.recipientType === 'response');
  const validationRecipients = recipients.filter(r => r.recipientType === 'validation');

  const canRespond = mrbCase?.status === 'ABIERTA' || (mrbCase?.status === 'EN_PROCESO' && !mrbCase?.respondedBy);
  const canValidate = mrbCase?.status === 'EN_PROCESO' && !!mrbCase?.respondedBy;
  const isDraft = mrbCase?.status === 'BORRADOR';

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: t.textDim,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      marginBottom: '16px',
      fontSize: '14px'
    },
    header: {
      backgroundColor: '#7c3aed',
      color: 'white',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '24px'
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    qarNumber: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '8px',
      fontFamily: "'IBM Plex Mono', monospace",
      letterSpacing: '1px'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '600',
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600'
    },
    headerMeta: {
      display: 'flex',
      gap: '20px',
      fontSize: '13px',
      opacity: 0.9,
      flexWrap: 'wrap'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '24px'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    infoItem: {
      marginBottom: '8px'
    },
    infoLabel: {
      color: t.textDim,
      fontSize: '11px',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    infoValue: {
      color: t.text,
      fontSize: '14px',
      fontWeight: '500'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      backgroundColor: t.bg,
      color: t.textDim,
      fontWeight: '600',
      borderBottom: `1px solid ${t.border}`
    },
    td: {
      padding: '10px 12px',
      color: t.text,
      borderBottom: `1px solid ${t.border}`
    },
    textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      marginBottom: '12px'
    },
    textareaSmall: {
      width: '100%',
      padding: '10px',
      backgroundColor: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '13px',
      minHeight: '60px',
      resize: 'vertical'
    },
    responseDisplay: {
      backgroundColor: t.bg,
      padding: '14px',
      borderRadius: '8px',
      marginBottom: '12px'
    },
    label: {
      display: 'block',
      color: t.textDim,
      fontSize: '12px',
      marginBottom: '6px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    buttonRow: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px'
    },
    buttonPrimary: {
      flex: 1,
      padding: '14px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonSuccess: {
      flex: 1,
      padding: '14px',
      backgroundColor: '#22c55e',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonDanger: {
      flex: 1,
      padding: '14px',
      backgroundColor: '#B00020',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonSecondary: {
      padding: '10px 16px',
      backgroundColor: t.textMuted,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    filterSelect: {
      padding: '8px 12px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '13px'
    },
    recipientChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      margin: '4px'
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    photoBox: {
      backgroundColor: t.bg,
      borderRadius: '8px',
      padding: '12px',
      textAlign: 'center'
    },
    photo: {
      maxWidth: '100%',
      maxHeight: '180px',
      borderRadius: '8px'
    },
    timeline: {
      position: 'relative'
    },
    timelineItem: {
      position: 'relative',
      paddingLeft: '28px',
      paddingBottom: '16px',
      borderLeft: `2px solid ${t.border}`,
      marginLeft: '8px'
    },
    timelineDot: {
      position: 'absolute',
      left: '-9px',
      top: '0',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      border: `2px solid ${t.bgCard}`
    },
    closedBanner: {
      backgroundColor: '#22c55e20',
      border: '1px solid #22c55e',
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center'
    },
    rejectedBanner: {
      backgroundColor: '#B0002020',
      border: '1px solid #B00020',
      borderRadius: '8px',
      padding: '16px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ color: t.text, textAlign: 'center', padding: '60px' }}>Cargando...</div>
      </div>
    );
  }

  if (!mrbCase) {
    return (
      <div style={styles.container}>
        <div style={{ color: t.text, textAlign: 'center', padding: '60px' }}>Caso MRB no encontrado</div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(mrbCase.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div style={styles.container}>
      {/* Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button style={styles.backButton} onClick={() => navigate('/mrb-campaigns')}>
          <ArrowLeft size={18} />
          Volver a Lista
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/mrb-campaigns')}
            style={{ padding: '8px 14px', backgroundColor: t.bgCard, color: t.text, border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <List size={16} />
            Campaigns
          </button>
          {isDraft && (
            <>
              <button
                onClick={() => navigate('/mrb-create', { state: { draftId: mrbCase.id } })}
                style={{ padding: '8px 14px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <RefreshCw size={16} />
                Editar Borrador
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`¿Eliminar el borrador ${mrbCase.campaignNumber}? Esta acción no se puede deshacer.`)) return;
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${API_URL}/mrb/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                  const data = await res.json();
                  if (data.success) navigate('/mrb-campaigns');
                  else alert(data.message || L.errorDelete);
                }}
                style={{ padding: '8px 14px', backgroundColor: '#B00020', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Trash2 size={16} />
                Eliminar Borrador
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/mrb-create')}
            style={{ padding: '8px 14px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <PlusCircle size={16} />
            Nuevo MRB
          </button>
          <button
            onClick={() => navigate(`/mrb-capture?campaignId=${mrbCase.id}`)}
            style={{ padding: '8px 14px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ClipboardCheck size={16} />
            Inspección MRB
          </button>
          <button
            onClick={() => navigate('/mrb-dashboard')}
            style={{ padding: '8px 14px', backgroundColor: t.bgPanel, color: t.text, border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ ...styles.header, backgroundColor: mrbCase?.severityColor || '#7c3aed' }}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.qarNumber}>{mrbCase.campaignNumber}</div>
            <h1 style={styles.headerTitle}>
              <AlertTriangle size={24} />
              {mrbCase.title}
            </h1>
          </div>
          <div style={{ ...styles.statusBadge, backgroundColor: statusConfig.color }}>
            <StatusIcon size={16} />
            {statusConfig.label}
          </div>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.metaItem}>
            <User size={14} />
            Abierto por: {mrbCase.reportedByName || '-'}
          </span>
          <span style={styles.metaItem}>
            <Clock size={14} />
            {formatDate(mrbCase.createdAt)}
          </span>
          <span style={styles.metaItem}>
            <MapPin size={14} />
            {mrbCase.departmentName || 'N/A'}
          </span>
        </div>
      </div>

      {/* ====== DRAFT EDIT MODE ====== */}
      {isDraft && (
        <div style={{ maxWidth: '800px' }}>
          {/* Origin (read-only) */}
          {mrbCase.sourceType && (
            <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: t.textDim, textTransform: 'uppercase', fontWeight: '600' }}>Origen:</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600', color: t.accent, fontSize: '14px' }}>
                {mrbCase.sourceQarFolio || mrbCase.source8dFolio || '-'}
              </span>
              <span style={{ fontSize: '12px', color: t.textDim }}>({mrbCase.sourceType})</span>
            </div>
          )}

          {/* Title & Description */}
          <div style={styles.card}>
            <div style={styles.cardTitle}><FileText size={18} color="#7c3aed" />Datos Generales</div>
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>Título *</label>
              <input type="text" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>Descripción del Defecto</label>
              <textarea style={{ ...styles.textarea }} value={draftDescription} onChange={e => setDraftDescription(e.target.value)}
                placeholder="Descripción del problema..." />
            </div>
            {Array.isArray(mrbCase.partsList) && mrbCase.partsList.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.label}>No. de Parte</label>
                <div style={{ padding: '10px', backgroundColor: t.bgAlt || t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', color: t.text, lineHeight: '1.7' }}>
                  {mrbCase.partsList.map((p, i) => (
                    <div key={i}><strong>{p.partNumber}</strong>{p.partName ? ` — ${p.partName}` : ''}</div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={styles.label}>No. de Lote / Batch</label>
              <input type="text" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                value={draftLotNumber} onChange={e => setDraftLotNumber(e.target.value)} placeholder="LOT-2026-001" />
            </div>
          </div>

          {/* Inspector instructions */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Info size={18} color="#0072CE" />
              Instrucciones para el Inspector
              {mrbCase.sourceType === '8D' && (
                <button
                  onClick={handleSyncFromSource}
                  disabled={submitting}
                  title="Actualizar desde D3 del 8D vinculado"
                  style={{ marginLeft: 'auto', padding: '4px 10px', backgroundColor: '#0072CE20', color: '#0072CE', border: '1px solid #0072CE60', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} />
                  Sincronizar del 8D
                </button>
              )}
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>Criterio de Inspección — ¿Cómo se garantiza que el material esté conforme?</label>
              <textarea style={styles.textarea} value={draftInspectionCriteria} onChange={e => setDraftInspectionCriteria(e.target.value)}
                placeholder="Heredado de D3 del 8D..." />
            </div>
            <div>
              <label style={styles.label}>Instrucciones de Disposición — ¿Cómo se dispondrá el material sospechoso?</label>
              <textarea style={styles.textarea} value={draftDispositionInstructions} onChange={e => setDraftDispositionInstructions(e.target.value)}
                placeholder="Heredado de D3 del 8D..." />
            </div>
          </div>

          {/* Resources */}
          <div style={styles.card}>
            <div style={styles.cardTitle}><ClipboardCheck size={18} color="#2E7D32" />Recursos de Inspección</div>
            <p style={{ color: t.textDim, fontSize: '12px', margin: '0 0 14px' }}>
              Las cantidades y costo de scrap se registran desde la app de inspección una vez iniciada la campaña.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={styles.label}># Inspectores por Turno</label>
                <input type="number" min="0" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                  value={draftInspectorCount} onChange={e => setDraftInspectorCount(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={styles.label}># Supervisores por Turno</label>
                <input type="number" min="0" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                  value={draftSupervisorCount} onChange={e => setDraftSupervisorCount(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={styles.label}>Costo Unitario — Inspector ($/hr)</label>
                <input type="number" min="0" step="0.01" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                  value={draftInspectorUnitCost} onChange={e => setDraftInspectorUnitCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label style={styles.label}>Costo Unitario — Supervisor ($/hr)</label>
                <input type="number" min="0" step="0.01" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                  value={draftSupervisorUnitCost} onChange={e => setDraftSupervisorUnitCost(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            {(draftInspectorUnitCost > 0 || draftSupervisorUnitCost > 0) && (
              <div style={{ padding: '8px 12px', backgroundColor: t.bg, borderRadius: '6px', fontSize: '12px', color: t.textDim }}>
                Costo estimado por hora: <strong style={{ color: t.text }}>${((draftInspectorCount * draftInspectorUnitCost) + (draftSupervisorCount * draftSupervisorUnitCost)).toFixed(2)}</strong>
              </div>
            )}
          </div>

          {/* Photos & Attachments */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Camera size={18} color="#7c3aed" />
              Estándar Visual
              <label style={{ marginLeft: 'auto', padding: '5px 10px', backgroundColor: t.accent, color: 'white', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Paperclip size={12} />{uploadingAttach ? L.uploading : L.addFile}
                <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleUploadAttachment} style={{ display: 'none' }} />
              </label>
            </div>
            {(mrbCase.photoNokPath || mrbCase.photoOkPath) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: attachments.length > 0 ? '14px' : 0 }}>
                <div>
                  <div style={{ backgroundColor: '#B00020', padding: '4px 10px', borderRadius: '6px 6px 0 0' }}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '11px' }}>NOK — Defecto</span>
                  </div>
                  <img src={`${API_URL}${mrbCase.photoNokPath}`} alt="NOK" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '0 0 6px 6px', display: 'block' }} onClick={() => window.open(`${API_URL}${mrbCase.photoNokPath}`, '_blank')} />
                </div>
                <div>
                  <div style={{ backgroundColor: '#22c55e', padding: '4px 10px', borderRadius: '6px 6px 0 0' }}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '11px' }}>OK — Aceptable</span>
                  </div>
                  <img src={`${API_URL}${mrbCase.photoOkPath}`} alt="OK" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '0 0 6px 6px', display: 'block' }} onClick={() => window.open(`${API_URL}${mrbCase.photoOkPath}`, '_blank')} />
                </div>
              </div>
            )}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {attachments.map(att => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filePath || '');
                  return (
                    <div key={att.id} style={{ position: 'relative' }}>
                      {isImage
                        ? <img src={`${API_URL}${att.filePath}`} alt={att.filename} style={{ width: '80px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${t.border}`, cursor: 'zoom-in' }} onClick={() => window.open(`${API_URL}${att.filePath}`, '_blank')} />
                        : <a href={`${API_URL}${att.filePath}`} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '80px', height: '64px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', textDecoration: 'none' }}>
                            <Paperclip size={18} color={t.textDim} />
                            <span style={{ fontSize: '9px', color: t.textDim, maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                          </a>
                      }
                      <button onClick={() => handleDeleteAttachment(att.id)} style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#B00020', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        <X size={9} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={styles.card}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleSaveDraft(false)}
                disabled={submitting}
                style={{ flex: 1, padding: '14px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submitting ? 0.7 : 1 }}
              >
                <FileText size={18} />
                Guardar Borrador
              </button>
              <button
                onClick={() => { if (window.confirm('¿Publicar esta campaña MRB? Se notificará a los destinatarios.')) handleSaveDraft(true); }}
                disabled={submitting}
                style={{ flex: 2, padding: '14px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submitting ? 0.7 : 1 }}
              >
                <Send size={18} />
                {submitting ? L.publishing : L.publishCampaign}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== PUBLISHED DETAIL VIEW ====== */}
      {!isDraft && <>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `2px solid ${t.border}`, marginBottom: '24px', gap: '0' }}>
          {[
            { id: 'detail', label: L.caseDetail },
            { id: 'progress', label: L.campaignProgress },
            { id: 'inventory', label: `Inventario (${affectedSerialsSummary.total})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'progress') loadProgress();
                if (tab.id === 'inventory') loadAffectedSerials();
              }}
              style={{
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid #7c3aed` : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#7c3aed' : t.textMuted,
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PROGRESS TAB ─────────────────────────────────────────── */}
        {activeTab === 'progress' && (
          <div>
            {progressLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>Cargando avance...</div>
            ) : progressData.length === 0 ? (
              <div style={{ ...styles.card, textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}></div>
                <div style={{ color: t.text, fontWeight: '600', marginBottom: '8px' }}>Sin registros de inspección aún</div>
                <div style={{ color: t.textMuted, fontSize: '13px' }}>Los registros aparecerán aquí conforme los inspectores capturen piezas desde la app de inspección MRB.</div>
              </div>
            ) : (
              <div>
                {/* ── QUARANTINE PANEL ───────────────────────────────────── */}
                {(() => {
                  const dispWarehouse = mrbCase.qtyQuarantineWarehouse || 0;
                  const dispProcess   = mrbCase.qtyQuarantineProcess   || 0;
                  const dispTransit   = mrbCase.qtyQuarantineTransit   || 0;
                  const dispCustomer  = mrbCase.qtyQuarantineCustomer  || 0;
                  const qTotal   = dispWarehouse + dispProcess;   // En planta = inspectable
                  const qInsp    = mrbCase.qtyInspected || 0;
                  const qRest    = Math.max(0, qTotal - qInsp);
                  const qPct     = qTotal > 0 ? Math.min(100, (qInsp / qTotal) * 100) : 0;
                  const has8D    = !!mrbCase.source8dId;
                  const updatedAt = mrbCase.qtyQuarantineUpdatedAt
                    ? new Date(mrbCase.qtyQuarantineUpdatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : null;

                  return (
                    <div style={{ ...styles.card, marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={styles.cardTitle}>⚠ {L.quarantineMaterial}</div>
                          {updatedAt && <div style={{ fontSize: '11px', color: t.textDim, marginTop: '-10px' }}>Actualizado: {updatedAt}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {has8D && (
                            <button
                              onClick={() => handleSaveQuarantine(true)}
                              disabled={savingQuarantine}
                              style={{ padding: '6px 12px', backgroundColor: '#1565C0', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <RefreshCw size={13} /> Sync desde 8D
                            </button>
                          )}
                          <button
                            onClick={() => setShowQuarantineEdit(v => !v)}
                            style={{ padding: '6px 12px', backgroundColor: showQuarantineEdit ? '#f59e0b' : t.bgInput, color: showQuarantineEdit ? 'white' : t.text, border: `1px solid ${showQuarantineEdit ? '#f59e0b' : t.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Edit3 size={13} /> {showQuarantineEdit ? L.cancel : L.edit}
                          </button>
                        </div>
                      </div>

                      {/* Main numbers */}
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: qTotal > 0 ? '14px' : '0' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '32px', fontWeight: '600', color: '#f59e0b' }}>{qTotal || '—'}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>En Planta</div>
                        </div>
                        {qTotal > 0 && <>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: '600', color: '#22c55e' }}>{qInsp}</div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Inspeccionado</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: '600', color: qRest > 0 ? '#B00020' : '#22c55e' }}>{qRest}</div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Restante</div>
                          </div>
                          <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                              <span style={{ color: t.textMuted }}>% Avance</span>
                              <span style={{ color: qPct >= 100 ? '#22c55e' : t.accent }}>{qPct.toFixed(1)}%</span>
                            </div>
                            <div style={{ height: '10px', backgroundColor: t.border, borderRadius: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${qPct}%`, height: '100%', backgroundColor: qPct >= 100 ? '#22c55e' : '#f59e0b', borderRadius: '6px', transition: 'width 0.4s ease' }} />
                            </div>
                            {/* Location breakdown */}
                            {(dispWarehouse > 0 || dispProcess > 0 || dispTransit > 0 || dispCustomer > 0) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {[
                                  { label: L.warehouse, value: dispWarehouse, color: '#f59e0b', info: false },
                                  { label: L.process,  value: dispProcess,  color: '#f59e0b', info: false },
                                  { label: L.transit, value: dispTransit,  color: '#9ca3af', info: true },
                                  { label: L.customer,  value: dispCustomer, color: '#9ca3af', info: true },
                                ].filter(l => l.value > 0).map(loc => (
                                  <span key={loc.label} style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: loc.info ? '#f3f4f6' : `${loc.color}18`, color: loc.color, borderRadius: '10px', fontWeight: loc.info ? '400' : '600', opacity: loc.info ? 0.7 : 1 }}>
                                    {loc.label}: {loc.value}{loc.info ? ' ℹ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </>}
                        {qTotal === 0 && (
                          <div style={{ color: t.textDim, fontSize: '13px', alignSelf: 'center' }}>
                            {has8D ? L.quarantineHelp8D : L.quarantineHelpManual}
                          </div>
                        )}
                      </div>

                      {/* Edit form */}
                      {showQuarantineEdit && (
                        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          {[
                            { label: L.warehouse,  val: qWarehouse, set: setQWarehouse },
                            { label: L.process,  val: qProcess,   set: setQProcess   },
                            { label: L.transit, val: qTransit,   set: setQTransit   },
                            { label: L.customer,  val: qCustomer,  set: setQCustomer  },
                          ].map(f => (
                            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>{f.label}</label>
                              <input
                                type="number" min="0"
                                value={f.val}
                                onChange={e => f.set(parseInt(e.target.value) || 0)}
                                style={{ width: '90px', padding: '8px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '15px', fontWeight: '600', textAlign: 'center' }}
                              />
                            </div>
                          ))}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', textTransform: 'uppercase' }}>Total</label>
                            <div style={{ width: '90px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '15px', fontWeight: '600', textAlign: 'center', color: '#92400e' }}>
                              {qWarehouse + qProcess + qTransit + qCustomer}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSaveQuarantine(false)}
                            disabled={savingQuarantine}
                            style={{ padding: '8px 16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end' }}
                          >
                            <Save size={14} /> {savingQuarantine ? L.saving : L.save}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Campaign totals banner */}
                <div style={{ ...styles.card, marginBottom: '16px' }}>
                  <div style={styles.cardTitle}>Totales Acumulados de la Campaña</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {[
                      { label: L.inspected, value: mrbCase.qtyInspected || 0, color: t.accent },
                      { label: L.ok,   value: mrbCase.qtyOk || 0, color: '#22c55e' },
                      { label: L.nok,  value: mrbCase.qtyNok || 0, color: '#B00020' },
                      { label: L.rework,      value: mrbCase.qtyRework || 0,    color: '#f59e0b' },
                      { label: L.scrap,       value: mrbCase.qtyScrap || 0,     color: '#ef4444' },
                      { label: L.return,      value: mrbCase.qtyReturn || 0,    color: '#8b5cf6' },
                      { label: L.hold,        value: mrbCase.qtyHold || 0,      color: '#6b7280' },
                      ...(mrbCase.qtyUseAsIs > 0 ? [{ label: L.useAsIs, value: mrbCase.qtyUseAsIs, color: '#065f46' }] : []),
                      { label: L.yield,  value: mrbCase.qtyInspected > 0 ? `${((mrbCase.qtyOk / mrbCase.qtyInspected) * 100).toFixed(1)}%` : '—', color: t.text },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', minWidth: '60px' }}>
                        <div style={{ fontSize: '26px', fontWeight: '600', color }}>{value}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-shift rows */}
                {progressData.map((row, idx) => {
                  // inspectionDate may arrive as "2026-04-15T06:00:00.000Z" (PostgreSQL DATE via pg driver)
                  const rawDate = row.inspectionDate
                    ? String(row.inspectionDate).substring(0, 10)  // take only "YYYY-MM-DD"
                    : null;
                  const dateLabel = rawDate
                    ? new Date(rawDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                    : L.unknownDate;
                  const shiftLabel = row.shiftName ? `${row.shiftCode} — ${row.shiftName}` : '⚠ Sin turno asignado';
                  const totalNok = parseInt(row.totalNok) || 0;
                  const rework = parseInt(row.rework) || 0;
                  const scrap = parseInt(row.scrap) || 0;
                  const ret = parseInt(row.returnSupplier) || 0;
                  const hold = parseInt(row.hold) || 0;
                  const useAsIs = parseInt(row.useAsIs) || 0;

                  return (
                    <div key={idx} style={{ ...styles.card, marginBottom: '12px' }}>
                      {/* Shift header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{dateLabel}</span>
                          {!row.shiftId ? (
                            // Sin turno — selector obligatorio
                            <select
                              defaultValue=""
                              onChange={async e => {
                                const newShiftId = e.target.value;
                                if (!newShiftId) return;
                                const token = localStorage.getItem('token');
                                await fetch(`${API_URL}/mrb/${mrbCase.id}/reassign-shift`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ date: rawDate, oldShiftId: null, newShiftId: parseInt(newShiftId) })
                                });
                                loadProgress();
                              }}
                              style={{ padding: '3px 8px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              <option value="">⚠ Asignar turno...</option>
                              {shifts.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                            </select>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ padding: '3px 10px', backgroundColor: `${t.accent}20`, color: t.accent, borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                                {shiftLabel}
                              </span>
                              {/* Botón para reasignar turno */}
                              <select
                                value={row.shiftId}
                                title="Reasignar turno"
                                onChange={async e => {
                                  const newShiftId = parseInt(e.target.value);
                                  if (newShiftId === row.shiftId) return;
                                  if (!window.confirm(`¿Reasignar todos los registros de ${dateLabel} al turno seleccionado?`)) return;
                                  const token = localStorage.getItem('token');
                                  await fetch(`${API_URL}/mrb/${mrbCase.id}/reassign-shift`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ date: rawDate, oldShiftId: row.shiftId, newShiftId })
                                  });
                                  loadProgress();
                                }}
                                style={{ padding: '2px 4px', backgroundColor: t.bgInput, color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                              >
                                {shifts.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {totalNok > 0 && <span style={{ fontSize: '13px', color: '#B00020', fontWeight: '600' }}>{totalNok} NOK</span>}
                          {rework > 0 && <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>⟳ {rework} Rework</span>}
                          {scrap > 0 && <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>✕ {scrap} Scrap</span>}
                          {ret > 0 && <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '600' }}>↩ {ret} Dev.</span>}
                          {hold > 0 && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>⏸ {hold} Hold</span>}
                          {useAsIs > 0 && <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>✓ {useAsIs} UAI</span>}
                          <button
                            onClick={() => setShiftReport({ shiftId: row.shiftId, date: rawDate, shiftLabel: shiftLabel })}
                            style={{ marginLeft: 'auto', padding: '5px 12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            Ver Reporte
                          </button>
                        </div>
                      </div>

                      {/* Tally sheets for this shift */}
                      {row.tallies?.length > 0 && (
                        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '10px' }}>
                          <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Tally Sheets ({row.tallies.length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {row.tallies.map(tally => (
                              <a
                                key={tally.id}
                                href={`${API_URL}${tally.filePath}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', color: '#92400e', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
                              >
                                {tally.filename}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <button
                    onClick={loadProgress}
                    style={{ padding: '8px 20px', backgroundColor: t.bgCard, color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ↻ Actualizar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DETAIL TAB ───────────────────────────────────────────── */}
        {activeTab === 'detail' && <div style={styles.grid}>
        {/* ====== LEFT COLUMN ====== */}
        <div>
          {/* Info Card */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <FileText size={18} />
              Identificación del Material
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>{L.client}</div>
                <div style={styles.infoValue}>{mrbCase.clientName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Proyecto</div>
                <div style={styles.infoValue}>{mrbCase.projectName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={styles.infoLabel}>No. de Parte</div>
                  {['ABIERTA', 'EN_PROCESO'].includes(mrbCase.status) && (
                    <button
                      onClick={handleOpenAddPartModal}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: t.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <PlusCircle size={12} />
                      Agregar
                    </button>
                  )}
                </div>
                <div style={styles.infoValue}>
                  {Array.isArray(mrbCase.partsList) && mrbCase.partsList.length > 0
                    ? mrbCase.partsList.map(p => p.partNumber).join(', ')
                    : (mrbCase.partNumber || mrbCase.partName || '-')}
                </div>
              </div>
              {mrbCase.lotNumber && (
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>No. de Lote / Batch</div>
                  <div style={{ ...styles.infoValue, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '1px' }}>{mrbCase.lotNumber}</div>
                </div>
              )}
              {(() => {
                const hasParts = Array.isArray(mrbCase.partsList) && mrbCase.partsList.length > 0;
                const partsText = hasParts
                  ? mrbCase.partsList.map(p => `${p.partNumber}${p.partName ? ' — ' + p.partName : ''}`).join('\n')
                  : (mrbCase.partDescription && mrbCase.partDescription !== 'See parts list' ? mrbCase.partDescription : null);
                return partsText ? (
                  <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                    <div style={styles.infoLabel}>Descripción de Parte</div>
                    <div style={{ ...styles.infoValue, whiteSpace: 'pre-line' }}>{partsText}</div>
                  </div>
                ) : null;
              })()}
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Severidad</div>
                <div style={styles.infoValue}>
                  <span style={{ backgroundColor: mrbCase.severityColor || '#6b7280', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                    {mrbCase.severityName}
                  </span>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>{L.responsibleDept}</div>
                <div style={styles.infoValue}>{mrbCase.departmentName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Qty Inspeccionada</div>
                <div style={styles.infoValue}>{mrbCase.qtyInspected || <span style={{ color: t.textDim, fontSize: '12px' }}>Pendiente inspección</span>}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Qty OK / NOK</div>
                <div style={{ ...styles.infoValue, display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#22c55e', fontWeight: '600' }}>{mrbCase.qtyOk ?? 0} OK</span>
                  <span style={{ color: '#B00020', fontWeight: '600' }}>{mrbCase.qtyNok ?? 0} NOK</span>
                </div>
              </div>
              {/* Affected Serials Section */}
              {['ABIERTA', 'EN_PROCESO'].includes(mrbCase.status) && (
                <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={styles.infoLabel}>Seriales Afectados</div>
                    <button
                      onClick={handleOpenAffectedSerialsModal}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <List size={14} />
                      Gestionar Seriales
                    </button>
                  </div>
                  {affectedSerialsSummary.total > 0 ? (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <span style={{ color: t.text }}>Total: <strong>{affectedSerialsSummary.total}</strong></span>
                      <span style={{ color: '#22c55e' }}>Inspeccionados: <strong>{affectedSerialsSummary.inspected}</strong></span>
                      <span style={{ color: '#f59e0b' }}>Pendientes: <strong>{affectedSerialsSummary.pending}</strong></span>
                    </div>
                  ) : (
                    <div style={{ color: t.textMuted, fontSize: '12px', fontStyle: 'italic' }}>
                      Sin seriales cargados — clic en "Gestionar Seriales" para agregar
                    </div>
                  )}
                </div>
              )}
              {/* Campaign Defects Section */}
              {['ABIERTA', 'EN_PROCESO'].includes(mrbCase.status) && (
                <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={styles.infoLabel}>Defectos Configurados</div>
                    <button
                      onClick={handleOpenDefectsModal}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Settings size={14} />
                      Editar Defectos
                    </button>
                  </div>
                  {campaignDefects.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {campaignDefects.slice(0, 8).map(d => (
                        <span key={d.defectTypeId} style={{
                          padding: '3px 8px',
                          backgroundColor: d.categoryColor ? `${d.categoryColor}20` : '#f3f4f6',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: d.categoryColor || t.text
                        }}>
                          {d.name}
                        </span>
                      ))}
                      {campaignDefects.length > 8 && (
                        <span style={{ padding: '3px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '11px', color: t.textMuted }}>
                          +{campaignDefects.length - 8} más
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: t.textMuted, fontSize: '12px', fontStyle: 'italic' }}>
                      Sin defectos configurados — clic en "Editar Defectos" para agregar
                    </div>
                  )}
                </div>
              )}
              {/* Cost summary tables */}
              {costSummary && (
                <div style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Scrap cost by part */}
                  {costSummary.scrap?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#B00020', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Costo de Scrap — ${costSummary.totals.scrap.toFixed(2)} total
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                            {[L.part, L.qtyScrap, L.unitCost, L.total].map(h => (
                              <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Parte' ? 'left' : 'center', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {costSummary.scrap.map((r, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                              <td style={{ padding: '5px 8px', color: t.text, fontWeight: '500' }}>{r.partNumber}{r.partName ? ` — ${r.partName}` : ''}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', color: '#B00020', fontWeight: '600' }}>{r.qtyScrap}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', color: t.textMuted }}>${r.unitCost.toFixed(2)}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '600', color: '#B00020' }}>${r.totalCost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Personnel cost by shift/day */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#C77700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Costo de Personal — ${costSummary.totals.personnel.toFixed(2)} total
                      <span style={{ fontSize: '10px', fontWeight: '400', color: t.textMuted, marginLeft: '8px' }}>
                        Insp. ${parseFloat(mrbCase.inspectorUnitCost || 0).toFixed(2)}/hr · Sup. ${parseFloat(mrbCase.supervisorUnitCost || 0).toFixed(2)}/hr
                      </span>
                    </div>
                    {costSummary.personnel?.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                            {[L.date, L.shift, L.hoursWorked, L.resources, L.cost, ''].map(h => (
                              <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Fecha' || h === 'Turno' ? 'left' : 'center', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {costSummary.personnel.map((r, i) => (
                            <PersonnelRow key={`${r.inspectionDate}-${r.shiftId}`} row={r} campaignId={id} token={localStorage.getItem('token')} theme={t}
                              onSaved={() => fetch(`${API_URL}/mrb/${id}/cost-summary`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(cs => { if (cs.success) setCostSummary(cs); })}
                              savingPersonnel={savingPersonnel} setSavingPersonnel={setSavingPersonnel}
                            />
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>Sin turnos registrados con horas aún. Se registran al cerrar el turno en la plataforma de inspección.</div>
                    )}
                  </div>

                  {/* Grand total */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: `2px solid ${t.border}` }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                      Costo Total Campaña: <span style={{ color: '#B00020', fontSize: '18px' }}>${costSummary.totals.grand.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
            {mrbCase.description && (
              <div style={{ marginTop: '16px' }}>
                <div style={styles.infoLabel}>Descripción del Defecto</div>
                <div style={{ color: t.text, fontSize: '14px', whiteSpace: 'pre-wrap', backgroundColor: t.bg, padding: '10px', borderRadius: '6px', borderLeft: '3px solid #C77700' }}>
                  {mrbCase.description}
                </div>
              </div>
            )}
          </div>

          {/* Inspection Criteria */}
          {(mrbCase.inspectionCriteria || mrbCase.dispositionInstructions) && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <Info size={18} color="#0072CE" />
                Instrucciones para el Inspector
              </div>
              {mrbCase.inspectionCriteria && (
                <div style={{ marginBottom: mrbCase.dispositionInstructions ? '16px' : 0 }}>
                  <div style={styles.infoLabel}>Criterio de Inspección</div>
                  <div style={{ backgroundColor: '#0072CE12', border: '1px solid #0072CE40', borderRadius: '8px', padding: '12px', color: t.text, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {mrbCase.inspectionCriteria}
                  </div>
                </div>
              )}
              {mrbCase.dispositionInstructions && (
                <div>
                  <div style={styles.infoLabel}>Instrucciones de Disposición</div>
                  <div style={{ backgroundColor: '#7c3aed12', border: '1px solid #7c3aed40', borderRadius: '8px', padding: '12px', color: t.text, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {mrbCase.dispositionInstructions}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== SOURCE/ORIGIN CARD ====== */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Link size={18} color={t.accent} />
              Origen del MRB
              {/* "Vincular 8D" for INCOMING campaigns without a 8D linked */}
              {mrbCase.sourceType === 'INCOMING' && !mrbCase.source8dId && ['ABIERTA', 'BORRADOR'].includes(mrbCase.status) && (
                <button
                  onClick={openLink8dModal}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 12px',
                    backgroundColor: t.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Link size={14} />
                  Vincular 8D
                </button>
              )}
              {/* "Cambiar Origen" for non-INCOMING or INCOMING that already has 8D */}
              {(mrbCase.sourceType !== 'INCOMING' || mrbCase.source8dId) && mrbCase.status === 'ABIERTA' && (
                <button
                  onClick={openSourceModal}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 12px',
                    backgroundColor: t.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={14} />
                  Cambiar Origen
                </button>
              )}
            </div>

            {mrbCase.sourceType === 'INCOMING' && !mrbCase.source8dId ? (
              /* INCOMING without 8D — show pending badge */
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                backgroundColor: '#F59E0B22',
                border: '2px dashed #F59E0B',
                borderRadius: '8px'
              }}>
                <Package size={24} color="#F59E0B" />
                <div>
                  <div style={{ fontSize: '11px', color: t.textDim, textTransform: 'uppercase' }}>Incoming Inspection</div>
                  <div style={{ fontSize: '14px', color: '#F59E0B', fontWeight: '600' }}>Sin 8D vinculado — pendiente de emisión</div>
                </div>
              </div>
            ) : mrbCase.sourceType ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: mrbCase.sourceType === 'QAR' ? '#C7770022' : '#0072CE22',
                  border: `2px solid ${mrbCase.sourceType === 'QAR' ? '#C77700' : t.accent}`,
                  borderRadius: '8px',
                  cursor: (mrbCase.sourceType === 'QAR' && mrbCase.sourceQarId) || (mrbCase.sourceType !== 'QAR' && mrbCase.source8dId) ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (mrbCase.sourceType === 'QAR' && mrbCase.sourceQarId) {
                    navigate(`/qar/${mrbCase.sourceQarId}`);
                  } else if (mrbCase.source8dId) {
                    navigate(`/8d-workflow?reportId=${mrbCase.source8dId}`);
                  }
                }}
                >
                  {mrbCase.sourceType === 'QAR' ? (
                    <AlertTriangle size={24} color="#C77700" />
                  ) : (
                    <Package size={24} color={t.accent} />
                  )}
                  <div>
                    <div style={{ fontSize: '11px', color: t.textDim, textTransform: 'uppercase' }}>
                      {mrbCase.sourceType === 'QAR' ? 'Quality Alert Report' : mrbCase.sourceType === 'INCOMING' ? 'Incoming Inspection → 8D' : 'Eight Disciplines Report'}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: mrbCase.sourceType === 'QAR' ? '#C77700' : t.accent,
                      fontFamily: "'IBM Plex Mono', monospace"
                    }}>
                      {mrbCase.sourceQarFolio || mrbCase.source8dFolio || '-'}
                    </div>
                  </div>
                  <ExternalLink size={16} color={t.textDim} />
                </div>

                {/* Alert if QAR has escalated to 8D */}
                {mrbCase.sourceType === 'QAR' && mrbCase.qarLinked8dId && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    backgroundColor: '#0072CE22',
                    border: '1px solid #0072CE',
                    borderRadius: '8px'
                  }}>
                    <AlertTriangle size={18} color="#0072CE" />
                    <div>
                      <div style={{ color: t.text, fontSize: '13px', fontWeight: '500' }}>
                        Este QAR escaló a 8D
                      </div>
                      <div style={{ color: t.textDim, fontSize: '12px' }}>
                        Folio 8D: {mrbCase.qarLinked8dFolio}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Desea actualizar el origen de este MRB al 8D vinculado?')) {
                          // Change source to 8D
                          setSourceType('8D');
                          setSelectedNewSource({ id: mrbCase.qarLinked8dId, folio: mrbCase.qarLinked8dFolio });
                          handleChangeSource();
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: t.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Actualizar a 8D
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: t.textMuted, fontSize: '14px' }}>
                Sin origen vinculado
                {mrbCase.status === 'ABIERTA' && (
                  <span style={{ marginLeft: '8px', color: '#C77700' }}>
                    - Haz clic en "Cambiar Origen" para vincular a un 8D
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Defects Table */}
          {defects.length > 0 && (() => {
            // Build pareto
            const paretoMap = {};
            let totalQty = 0;
            defects.forEach(d => {
              const qty = d.quantity || 1;
              if (!paretoMap[d.defectName]) paretoMap[d.defectName] = { defectName: d.defectName, qty: 0 };
              paretoMap[d.defectName].qty += qty;
              totalQty += qty;
            });
            const paretoRows = Object.values(paretoMap).sort((a, b) => b.qty - a.qty);
            const paretoMax = paretoRows[0]?.qty || 1;

            const handleExcelExport = () => {
              const wb = XLSX.utils.book_new();
              const fmt = iso => iso ? new Date(iso).toLocaleString('es-MX') : '';

              // Sheet 1 — Individual (con serial)
              const individual = defects.filter(d => d.lotNumber);
              const ws1 = XLSX.utils.json_to_sheet(individual.map(d => ({
                'Fecha/Hora':    fmt(d.createdAt),
                'Serial/Lote':   d.lotNumber || '',
                'Número Parte':  d.partNumber || '',
                'Nombre Parte':  d.partName || '',
                'Defecto':       d.defectName || '',
                'Disposición':   d.dispositionName || d.dispositionCode || '',
                'Turno':         d.shiftCode ? `${d.shiftCode} — ${d.shiftName}` : '',
                'Inspector':     d.inspectorName || '',
                'Cantidad':      d.quantity || 1,
                'Notas':         d.notes || '',
              })));
              XLSX.utils.book_append_sheet(wb, ws1, 'Individual');

              // Sheet 2 — Masivo (sin serial)
              const masivo = defects.filter(d => !d.lotNumber);
              const ws2 = XLSX.utils.json_to_sheet(masivo.map(d => ({
                'Fecha/Hora':   fmt(d.createdAt),
                'Número Parte': d.partNumber || '',
                'Nombre Parte': d.partName || '',
                'Defecto':      d.defectName || '',
                'Disposición':  d.dispositionName || d.dispositionCode || '',
                'Turno':        d.shiftCode ? `${d.shiftCode} — ${d.shiftName}` : '',
                'Inspector':    d.inspectorName || '',
                'Cantidad':     d.quantity || 1,
                'Notas':        d.notes || '',
              })));
              XLSX.utils.book_append_sheet(wb, ws2, 'Masivo');

              XLSX.writeFile(wb, `MRB_${mrbCase.campaignNumber}_defectos.xlsx`);
            };

            return (
              <div style={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={styles.cardTitle}>
                    <AlertTriangle size={18} color="#C77700" />
                    Resumen de Defectos — Campaña Completa
                    <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: '400', marginLeft: '8px' }}>
                      {defects.length} registros · {totalQty} piezas NOK
                    </span>
                  </div>
                  <button
                    onClick={handleExcelExport}
                    style={{ padding: '6px 14px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    ↓ Exportar Excel
                  </button>
                </div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Defecto', 'Piezas NOK', '% del Total', 'Barra'].map(h => (
                        <th key={h} style={{ ...styles.th, textAlign: h === 'Defecto' ? 'left' : 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paretoRows.map((row, i) => (
                      <tr key={row.defectName} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: i % 2 === 0 ? t.bgCard : t.bgPanel }}>
                        <td style={{ ...styles.td, fontWeight: i === 0 ? '600' : '400' }}>{row.defectName}</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: '600', color: '#B00020' }}>{row.qty}</td>
                        <td style={{ ...styles.td, textAlign: 'center', color: t.textMuted }}>
                          {totalQty > 0 ? ((row.qty / totalQty) * 100).toFixed(1) : 0}%
                        </td>
                        <td style={{ ...styles.td, width: '140px' }}>
                          <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${(row.qty / paretoMax) * 100}%`, height: '100%', backgroundColor: i === 0 ? '#B00020' : '#f59e0b', borderRadius: '4px' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* ====== DISPOSITION SECTION ====== */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Send size={18} color="#7c3aed" />
              Disposición del Material
              {mrbCase.status === 'ABIERTA' && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#C77700', fontWeight: '500' }}>
                  PENDIENTE
                </span>
              )}
              {(mrbCase.status === 'EN_PROCESO' || mrbCase.status === 'CERRADA') && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#22c55e', fontWeight: '500' }}>
                  COMPLETADO
                </span>
              )}
              {mrbCase.status === 'CANCELADA' && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#B00020', fontWeight: '500' }}>
                  CANCELADO
                </span>
              )}
            </div>

            {/* BORRADOR banner */}
            {isDraft && (
              <div style={{ backgroundColor: '#6b728015', border: '1px solid #6b7280', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <FileText size={24} color="#6b7280" />
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.text, fontWeight: '600', fontSize: '14px' }}>Este MRB está en Borrador</div>
                  <div style={{ color: t.textDim, fontSize: '12px', marginTop: '2px' }}>No ha sido notificado a los destinatarios. Publica la campaña cuando estés listo.</div>
                </div>
                <button
                  style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={submitting}
                  onClick={async () => {
                    if (!window.confirm('¿Publicar esta campaña MRB? Se notificará a los destinatarios.')) return;
                    setSubmitting(true);
                    const token = localStorage.getItem('token');
                    try {
                      const res = await fetch(`${API_URL}/mrb/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: 'ABIERTA' })
                      });
                      const data = await res.json();
                      if (data.success) loadMrb();
                      else alert(data.message || L.errorPublish);
                    } catch (e) { alert(L.errorPublish); }
                    finally { setSubmitting(false); }
                  }}
                >
                  <Send size={14} />
                  Publicar Campaña
                </button>
              </div>
            )}

            {/* Show existing disposition or form */}
            {(mrbCase.rootCause || mrbCase.correctiveAction) && !canRespond ? (
              <>
                <div style={styles.responseDisplay}>
                  <div style={styles.label}>Causa Raíz</div>
                  <div style={{ color: t.text, fontSize: '14px' }}>{mrbCase.rootCause || '-'}</div>
                </div>
                <div style={styles.responseDisplay}>
                  <div style={styles.label}>Acción Correctiva / Disposición</div>
                  <div style={{ color: t.text, fontSize: '14px' }}>{mrbCase.correctiveAction || '-'}</div>
                </div>
                {mrbCase.resolutionNotes && (
                  <div style={styles.responseDisplay}>
                    <div style={styles.label}>Notas Adicionales</div>
                    <div style={{ color: t.text, fontSize: '14px' }}>{mrbCase.resolutionNotes}</div>
                  </div>
                )}
                {mrbCase.respondedByName && (
                  <div style={{ fontSize: '12px', color: t.textDim, marginTop: '8px' }}>
                    Disposición por: {mrbCase.respondedByName} el {formatDate(mrbCase.responseDate)}
                  </div>
                )}
              </>
            ) : canRespond ? (
              <>
                {mrbCase.source8dId && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: `${t.accent}15`, borderRadius: '8px', border: `1px solid ${t.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: t.textDim }}>Importar Causa Raíz (D4) y Contramedida Definitiva (D6) desde el 8D vinculado</span>
                    <button
                      style={{ ...styles.buttonSecondary, padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', marginLeft: '12px', opacity: submitting ? 0.7 : 1 }}
                      onClick={handleSyncD5D6}
                      disabled={submitting}
                    >
                      <RefreshCw size={13} />
                      Importar de D4/D6
                    </button>
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Causa Raíz *</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Describe la causa raíz del problema..."
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Acción Correctiva *</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Describe la acción correctiva implementada..."
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Notas Adicionales</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Notas o comentarios adicionales (opcional)..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>
                <button
                  style={{ ...styles.buttonPrimary, opacity: submitting ? 0.7 : 1, backgroundColor: '#7c3aed' }}
                  onClick={handleSubmitResponse}
                  disabled={submitting}
                >
                  <Send size={18} />
                  {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                </button>
              </>
            ) : (
              <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin respuesta aún</p>
            )}
          </div>

          {/* ====== VALIDATION SECTION ====== */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <CheckCircle size={18} color="#22c55e" />
              Validación
            </div>

            {mrbCase.status === 'CERRADA' ? (
              <div style={styles.closedBanner}>
                <CheckCircle size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
                <div style={{ color: '#22c55e', fontWeight: '600', fontSize: '16px', marginBottom: '8px' }}>
                  Caso MRB Cerrado y Validado
                </div>
                {mrbCase.validatedByName && (
                  <div style={{ color: t.textDim, fontSize: '13px' }}>
                    Validado por: {mrbCase.validatedByName} el {formatDate(mrbCase.validationDate)}
                  </div>
                )}
              </div>
            ) : canValidate ? (
              <>
                <p style={{ color: t.textDim, fontSize: '13px', marginBottom: '16px' }}>
                  Revisa la respuesta proporcionada y decide si aprobar el cierre o rechazar para corrección.
                </p>
                {requiresEarlyCloseReason && (
                  <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#C7770015', border: '1px solid #C77700', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#C77700', marginBottom: '8px' }}>
                      ⚠ Inventario incompleto — se requiere motivo de cierre anticipado
                    </div>
                    <textarea
                      style={styles.textareaSmall}
                      placeholder="Ej: Material devuelto al proveedor antes de concluir inspección..."
                      value={earlyCloseReason}
                      onChange={(e) => setEarlyCloseReason(e.target.value)}
                    />
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Motivo de Rechazo (si aplica)</label>
                  <textarea
                    style={styles.textareaSmall}
                    placeholder="Indica el motivo si vas a rechazar..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <div style={styles.buttonRow}>
                  <button
                    style={{ ...styles.buttonSuccess, opacity: submitting ? 0.7 : 1 }}
                    onClick={() => handleValidation(true)}
                    disabled={submitting}
                  >
                    <CheckCircle size={18} />
                    Aprobar y Cerrar
                  </button>
                  <button
                    style={{ ...styles.buttonDanger, opacity: submitting ? 0.7 : 1 }}
                    onClick={() => handleValidation(false)}
                    disabled={submitting}
                  >
                    <XCircle size={18} />
                    Rechazar
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: t.textMuted, fontSize: '13px' }}>
                {mrbCase.status === 'BORRADOR' && 'Publica la campaña antes de poder agregar disposición.'}
                {mrbCase.status === 'ABIERTA' && 'Esperando disposición antes de poder validar.'}
                {mrbCase.status === 'CANCELADA' && 'Este caso ha sido cancelado.'}
              </p>
            )}
          </div>
        </div>

        {/* ====== RIGHT COLUMN ====== */}
        <div>
          {/* Recipients */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Users size={18} />
              Destinatarios
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={styles.label}>Respuesta ({responseRecipients.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {responseRecipients.map((r) => (
                  <span key={r.id} style={{
                    ...styles.recipientChip,
                    backgroundColor: r.acknowledgedAt ? '#22c55e33' : '#C7770033',
                    color: r.acknowledgedAt ? '#22c55e' : '#C77700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {r.firstName} {r.lastName}
                    {r.acknowledgedAt && <Check size={12} />}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`¿Eliminar a ${r.firstName} ${r.lastName} de destinatarios?`)) return;
                        try {
                          const res = await fetch(`${API_URL}/mrb/${mrbCase.id}/recipients/${r.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                          });
                          const data = await res.json();
                          if (data.success) setRecipients(data.recipients);
                        } catch (_) {}
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'inherit', opacity: 0.7, fontSize: '14px', lineHeight: 1 }}
                      title="Eliminar destinatario"
                    >×</button>
                  </span>
                ))}
                {responseRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: '13px' }}>Ninguno</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={styles.label}>Validación ({validationRecipients.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {validationRecipients.map((r) => (
                  <span key={r.id} style={{
                    ...styles.recipientChip,
                    backgroundColor: `${t.accent}33`,
                    color: t.accent,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {r.firstName} {r.lastName}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`¿Eliminar a ${r.firstName} ${r.lastName} de destinatarios?`)) return;
                        try {
                          const res = await fetch(`${API_URL}/mrb/${mrbCase.id}/recipients/${r.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                          });
                          const data = await res.json();
                          if (data.success) setRecipients(data.recipients);
                        } catch (_) {}
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'inherit', opacity: 0.7, fontSize: '14px', lineHeight: 1 }}
                      title="Eliminar destinatario"
                    >×</button>
                  </span>
                ))}
                {validationRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: '13px' }}>Ninguno</span>
                )}
              </div>
            </div>

            {/* Botón recordatorio a todos */}
            {recipients.length > 0 && (
              <button
                onClick={async () => {
                  const allEmails = recipients.filter(r => r.email).map(r => r.email).join(';');
                  const names     = recipients.map(r => `${r.firstName} ${r.lastName}`).join(', ');
                  const link      = `${window.location.origin}/mrb-campaign/${mrbCase.id}`;
                  const subject   = encodeURIComponent(`[Recordatorio MRB] ${mrbCase.campaignNumber} — ${mrbCase.title}`);
                  const body      = encodeURIComponent(
                    `Este es un recordatorio sobre la Campaña MRB ${mrbCase.campaignNumber}.\n\n` +
                    `Campaña: ${mrbCase.campaignNumber}\n` +
                    `Título: ${mrbCase.title}\n` +
                    `Cliente: ${mrbCase.clientName || '—'}\n` +
                    `Parte: ${(Array.isArray(mrbCase.partsList) && mrbCase.partsList.length > 0 ? mrbCase.partsList.map(p => `${p.partNumber}${p.partName ? ' — ' + p.partName : ''}`).join(', ') : mrbCase.partNumber ? `${mrbCase.partNumber}${mrbCase.partName ? ' — ' + mrbCase.partName : ''}` : '') || mrbCase.partDescription || '—'}\n` +
                    `Lote: ${mrbCase.lotNumber || '—'}\n` +
                    `Estado: ${mrbCase.status}\n\n` +
                    `Criterio de Inspección:\n${mrbCase.inspectionCriteria || '—'}\n\n` +
                    `Instrucción de Disposición:\n${mrbCase.dispositionInstructions || '—'}\n\n` +
                    `Accede aquí: ${link}`
                  );
                  // Log en historial
                  try {
                    await fetch(`${API_URL}/mrb/${mrbCase.id}/comments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                      body: JSON.stringify({
                        comment: `Recordatorio enviado a ${recipients.length} destinatario(s): ${names}`,
                        commentType: 'system'
                      })
                    });
                    loadMrb();
                  } catch (_) { /* silent */ }
                  window.location.href = `mailto:${allEmails}?subject=${subject}&body=${body}`;
                }}
                style={{ width: '100%', padding: '7px 12px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                Enviar recordatorio a todos ({recipients.length})
              </button>
            )}
          </div>

          {/* Inline edit panel — published campaigns only */}
          {(mrbCase.status === 'ABIERTA' || mrbCase.status === 'EN_PROCESO') && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <Edit3 size={18} color={t.accent} />
                Editar Método de Inspección
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Criterio de Inspección</label>
                <textarea
                  style={styles.textareaSmall}
                  value={draftInspectionCriteria}
                  onChange={(e) => setDraftInspectionCriteria(e.target.value)}
                  placeholder="¿Cómo se garantiza que el material está conforme?"
                  rows={3}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Instrucciones de Disposición</label>
                <textarea
                  style={styles.textareaSmall}
                  value={draftDispositionInstructions}
                  onChange={(e) => setDraftDispositionInstructions(e.target.value)}
                  placeholder="¿Cómo se dispondrá del material sospechoso?"
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...styles.buttonSecondary, opacity: submitting ? 0.7 : 1 }}
                  onClick={handleSyncFromSource}
                  disabled={submitting || !mrbCase.source8dId}
                  title={!mrbCase.source8dId ? 'No tiene 8D vinculado' : 'Actualizar desde D3 del 8D'}
                >
                  <RefreshCw size={14} />
                  Sincronizar del 8D
                </button>
                <button
                  style={{ ...styles.buttonSuccess, opacity: submitting ? 0.7 : 1 }}
                  onClick={() => handleSaveDraft(false)}
                  disabled={submitting}
                >
                  <Save size={14} />
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* Add recipients panel — published campaigns only */}
          {(mrbCase.status === 'ABIERTA' || mrbCase.status === 'EN_PROCESO') && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <UserPlus size={18} color={t.accent} />
                Agregar Destinatario
              </div>

              <AddRecipientPanel mrbId={mrbCase.id} token={localStorage.getItem('token')} apiUrl={API_URL} onAdded={loadMrb} theme={t} styles={styles} mrbData={mrbCase} />
            </div>
          )}

          {/* Visual Standard — always show if at least one photo exists */}
          {(mrbCase.photoNokPath || mrbCase.photoOkPath || attachments.length > 0) && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <Camera size={18} color="#7c3aed" />
                Estándar Visual
                <label style={{
                  marginLeft: 'auto',
                  padding: '5px 10px',
                  backgroundColor: t.accent,
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Paperclip size={12} />
                  {uploadingAttach ? 'Subiendo...' : 'Agregar'}
                  <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleUploadAttachment} style={{ display: 'none' }} />
                </label>
              </div>

              {/* NOK / OK side-by-side */}
              {(mrbCase.photoNokPath || mrbCase.photoOkPath) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: attachments.length > 0 ? '16px' : 0 }}>
                  <div>
                    <div style={{
                      backgroundColor: '#B0002015',
                      border: '2px solid #B00020',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ backgroundColor: '#B00020', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <X size={14} color="white" />
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>NOK — Condición de Defecto</span>
                      </div>
                      {mrbCase.photoNokPath ? (
                        <img
                          src={`${API_URL}${mrbCase.photoNokPath}`}
                          alt="NOK"
                          style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', backgroundColor: '#000', cursor: 'zoom-in', display: 'block' }}
                          onClick={() => window.open(`${API_URL}${mrbCase.photoNokPath}`, '_blank')}
                        />
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#B00020' }}>Sin foto NOK</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      backgroundColor: '#22c55e15',
                      border: '2px solid #22c55e',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ backgroundColor: '#22c55e', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={14} color="white" />
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>OK — Condición Aceptable</span>
                      </div>
                      {mrbCase.photoOkPath ? (
                        <img
                          src={`${API_URL}${mrbCase.photoOkPath}`}
                          alt="OK"
                          style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', backgroundColor: '#000', cursor: 'zoom-in', display: 'block' }}
                          onClick={() => window.open(`${API_URL}${mrbCase.photoOkPath}`, '_blank')}
                        />
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#22c55e' }}>Sin foto OK</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional attachments gallery */}
              {attachments.length > 0 && (
                <div style={{ paddingTop: mrbCase.photoNokPath || mrbCase.photoOkPath ? '12px' : 0, borderTop: (mrbCase.photoNokPath || mrbCase.photoOkPath) ? `1px solid ${t.border}` : 'none' }}>
                  <div style={{ fontSize: '11px', color: t.textDim, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Archivos Adicionales ({attachments.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {attachments.map(att => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filePath || '');
                      return (
                        <div key={att.id} style={{ position: 'relative', flexShrink: 0 }}>
                          {isImage ? (
                            <img
                              src={`${API_URL}${att.filePath}`}
                              alt={att.filename}
                              title={att.filename}
                              style={{ width: '90px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${t.border}`, cursor: 'zoom-in' }}
                              onClick={() => window.open(`${API_URL}${att.filePath}`, '_blank')}
                            />
                          ) : (
                            <a
                              href={`${API_URL}${att.filePath}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '90px', height: '72px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', gap: '4px', textDecoration: 'none' }}
                            >
                              <Paperclip size={20} color={t.textDim} />
                              <span style={{ fontSize: '9px', color: t.textDim, textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#B00020', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '10px' }}
                          >
                            <X size={9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Timeline */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <MessageSquare size={18} />
              Historial ({comments.length})
            </div>

            <div style={{ ...styles.timeline, maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
              {comments.map((c, idx) => {
                const dotColor =
                  c.commentType === 'status_change' ? t.accent :
                  c.commentType === 'response' ? '#2E7D32' :
                  c.commentType === 'validation' ? '#22c55e' :
                  c.commentType === 'rejection' ? '#B00020' : t.textDim;

                return (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={{ ...styles.timelineDot, backgroundColor: dotColor }} />
                    <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>
                      {c.userName} - {formatDate(c.createdAt)}
                    </div>
                    <div style={{ fontSize: '13px', color: t.text }}>
                      {c.comment}
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin comentarios aún</p>
              )}
            </div>

            {/* Add comment */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
              <textarea
                style={{ ...styles.textareaSmall, marginBottom: '8px' }}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar comentario..."
              />
              <button
                style={styles.buttonSecondary}
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
        </div>}   {/* closes activeTab === 'detail' && <div style={styles.grid}> */}

        {/* ── INVENTORY TAB ─────────────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ ...styles.card, borderLeft: '4px solid #0072CE', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Total Seriales</div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#0072CE' }}>{affectedSerialsSummary.total}</div>
              </div>
              <div style={{ ...styles.card, borderLeft: '4px solid #16a34a', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Inspeccionados</div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#16a34a' }}>{affectedSerialsSummary.inspected}</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>{affectedSerialsSummary.total > 0 ? ((affectedSerialsSummary.inspected / affectedSerialsSummary.total) * 100).toFixed(1) : 0}%</div>
              </div>
              <div style={{ ...styles.card, borderLeft: '4px solid #f59e0b', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Pendientes</div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#f59e0b' }}>{affectedSerialsSummary.pending}</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>{affectedSerialsSummary.total > 0 ? ((affectedSerialsSummary.pending / affectedSerialsSummary.total) * 100).toFixed(1) : 0}%</div>
              </div>
              <div style={{ ...styles.card, borderLeft: '4px solid #8b5cf6', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>OK</div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#8b5cf6' }}>{affectedSerials.filter(s => s.inspectionResult === 'OK').length}</div>
              </div>
            </div>

            {/* Serials Table */}
            <div style={styles.card}>
              {loadingSerials ? (
                <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>Cargando inventario...</div>
              ) : affectedSerials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}></div>
                  <div style={{ color: t.text, fontWeight: '600', marginBottom: '8px' }}>Sin seriales registrados</div>
                  <div style={{ color: t.textMuted, fontSize: '13px' }}>Use el botón "Seriales Afectados" en la pestaña Detalle para agregar seriales a esta campaña.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Scrollbar ARRIBA sincronizado */}
                  <div
                    ref={scrollTopRef}
                    style={{ overflowX: 'auto', overflowY: 'hidden', borderBottom: `1px solid ${t.border}` }}
                    onScroll={(e) => { if (scrollBottomRef.current) scrollBottomRef.current.scrollLeft = e.target.scrollLeft; }}
                  >
                    <div style={{ height: '10px', width: `${275 + (maxInspectionRound > 0 ? maxInspectionRound * 140 : 100)}px` }} />
                  </div>
                  {/* Tabla única con columnas sticky */}
                  <div
                    ref={scrollBottomRef}
                    style={{ overflowX: 'auto', maxHeight: '60vh' }}
                    onScroll={(e) => { if (scrollTopRef.current) scrollTopRef.current.scrollLeft = e.target.scrollLeft; }}
                  >
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', width: 'max-content', minWidth: '100%' }}>
                      <thead>
                        <tr>
                          {/* Columnas STICKY: Serial, Parte, Fecha */}
                          <th style={{ position: 'sticky', left: 0, zIndex: 20, padding: '8px 10px', textAlign: 'left', fontWeight: '600', color: t.textMuted, fontSize: '10px', textTransform: 'uppercase', borderBottom: `2px solid ${t.border}`, borderRight: `1px solid ${t.border}`, backgroundColor: t.bgCard, minWidth: '130px' }}>Serial</th>
                          <th style={{ position: 'sticky', left: '130px', zIndex: 20, padding: '8px 10px', textAlign: 'left', fontWeight: '600', color: t.textMuted, fontSize: '10px', textTransform: 'uppercase', borderBottom: `2px solid ${t.border}`, borderRight: `1px solid ${t.border}`, backgroundColor: t.bgCard, minWidth: '80px' }}>Parte</th>
                          <th style={{ position: 'sticky', left: '210px', zIndex: 20, padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: t.textMuted, fontSize: '10px', textTransform: 'uppercase', borderBottom: `2px solid ${t.border}`, borderRight: `2px solid ${t.border}`, backgroundColor: t.bgCard, minWidth: '65px' }}>Fecha</th>
                          {/* Columnas de rondas (scroll horizontal) */}
                          {Array.from({ length: maxInspectionRound }, (_, i) => {
                            const roundNum = i + 1;
                            const comment = roundComments[roundNum] || '';
                            const shortComment = comment.length > 15 ? comment.substring(0, 15) + '…' : comment;
                            return (
                              <th key={`round-${roundNum}`} style={{ padding: '4px 6px', textAlign: 'center', fontWeight: '600', color: '#2563eb', fontSize: '10px', backgroundColor: '#eff6ff', minWidth: '140px', borderBottom: `2px solid ${t.border}` }} title={comment}>
                                <div>R{roundNum}</div>
                                <div style={{ fontSize: '8px', color: '#666', fontWeight: '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px', margin: '0 auto' }}>{shortComment || '—'}</div>
                              </th>
                            );
                          })}
                          {maxInspectionRound === 0 && (
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: t.textMuted, fontSize: '10px', borderBottom: `2px solid ${t.border}` }}>Sin inspecciones</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const normales = affectedSerials.filter(s => !s.notes?.includes('[ADICIONAL]'));
                          const adicionales = affectedSerials.filter(s => s.notes?.includes('[ADICIONAL]'));
                          const renderRow = (serial, idx, isAdicional = false) => {
                            const roundsMap = {};
                            (serial.rounds || []).forEach(r => { roundsMap[r.round] = r; });
                            const rowBg = idx % 2 === 0 ? t.bgCard : t.bgPanel;
                            return (
                              <tr key={serial.id}>
                                <td style={{ position: 'sticky', left: 0, zIndex: 10, padding: '6px 10px', fontWeight: '600', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', borderBottom: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`, backgroundColor: rowBg }}>
                                  {serial.serialNumber}
                                  {serial.inspected
                                    ? <span style={{ color: '#16a34a', marginLeft: '4px' }}>✓</span>
                                    : <span style={{ color: '#f59e0b', marginLeft: '4px' }}>⏳</span>}
                                </td>
                                <td style={{ position: 'sticky', left: '130px', zIndex: 10, padding: '6px 10px', color: t.textMuted, fontSize: '10px', borderBottom: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`, backgroundColor: rowBg }}>{serial.partNumber || '—'}</td>
                                <td style={{ position: 'sticky', left: '210px', zIndex: 10, padding: '6px 10px', color: t.textMuted, fontSize: '10px', borderBottom: `1px solid ${t.border}`, borderRight: `2px solid ${t.border}`, textAlign: 'center', backgroundColor: rowBg }}>
                                  {new Date(serial.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                </td>
                                {Array.from({ length: maxInspectionRound }, (_, i) => {
                                  const roundNum = i + 1;
                                  const roundData = roundsMap[roundNum];
                                  if (!roundData) {
                                    return <td key={`r-${roundNum}`} style={{ padding: '6px', textAlign: 'center', color: t.textMuted, fontSize: '10px', borderBottom: `1px solid ${t.border}`, backgroundColor: rowBg }}>—</td>;
                                  }
                                  const isOk = roundData.result === 'OK';
                                  const bgColor = isOk ? '#dcfce7' : '#fee2e2';
                                  const textColor = isOk ? '#16a34a' : '#ef4444';
                                  const dateStr = roundData.inspectedAt ? new Date(roundData.inspectedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '';
                                  const inspectorShort = roundData.inspectorName ? roundData.inspectorName.split(' ')[0].substring(0, 6) : '';
                                  return (
                                    <td key={`r-${roundNum}`} style={{ padding: '4px', textAlign: 'center', backgroundColor: bgColor, borderBottom: `1px solid ${t.border}` }}>
                                      <span style={{ color: textColor, fontSize: '10px', fontWeight: '600' }}>{roundData.result}</span>
                                      <span style={{ fontSize: '9px', color: '#555', marginLeft: '3px' }}>{inspectorShort}</span>
                                      <span style={{ fontSize: '8px', color: '#888', marginLeft: '2px' }}>{dateStr}</span>
                                    </td>
                                  );
                                })}
                                {maxInspectionRound === 0 && (
                                  <td style={{ padding: '6px 10px', textAlign: 'center', color: t.textMuted, borderBottom: `1px solid ${t.border}`, backgroundColor: rowBg }}>—</td>
                                )}
                              </tr>
                            );
                          };
                          return (
                            <>
                              {normales.map((s, i) => renderRow(s, i))}
                              {adicionales.length > 0 && (
                                <tr>
                                  <td colSpan={3 + Math.max(maxInspectionRound, 1)} style={{ padding: '8px 10px', backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: '600', textAlign: 'center', borderBottom: `2px solid #3b82f6` }}>
                                    — Adicionales ({adicionales.length}) —
                                  </td>
                                </tr>
                              )}
                              {adicionales.map((s, i) => renderRow(s, i))}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </>}       {/* closes !isDraft && <> */}

      {/* ====== MODAL: Campaign Defects ====== */}
      {showDefectsModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: t.text }}>
                Configurar Defectos de Campaña
              </h3>
              <button
                onClick={() => setShowDefectsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {loadingDefects ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>Cargando defectos...</div>
              ) : availableDefects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  No hay defectos configurados para las partes de esta campaña.
                  <br />
                  Configura defectos en el módulo de Partes primero.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '12px', fontSize: '12px', color: t.textMuted }}>
                    Selecciona los defectos que estarán disponibles durante la inspección:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button
                      onClick={() => setSelectedDefectIds(availableDefects.map(d => d.defectTypeId))}
                      style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', color: t.text }}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      onClick={() => setSelectedDefectIds([])}
                      style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', color: t.text }}
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {availableDefects.map(defect => {
                      const isSelected = selectedDefectIds.includes(defect.defectTypeId);
                      return (
                        <div
                          key={defect.defectTypeId}
                          onClick={() => toggleDefectSelection(defect.defectTypeId)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: `2px solid ${isSelected ? '#7c3aed' : t.border}`,
                            backgroundColor: isSelected ? '#7c3aed15' : t.bgInput,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '18px', height: '18px',
                              borderRadius: '4px',
                              border: `2px solid ${isSelected ? '#7c3aed' : t.border}`,
                              backgroundColor: isSelected ? '#7c3aed' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSelected && <Check size={12} color="white" />}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{defect.name}</div>
                              {defect.categoryName && (
                                <div style={{ fontSize: '10px', color: defect.categoryColor || t.textMuted }}>{defect.categoryName}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '12px', color: t.textMuted }}>
                {selectedDefectIds.length} de {availableDefects.length} seleccionados
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowDefectsModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', color: t.text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveDefects}
                  disabled={savingDefects}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingDefects ? 'not-allowed' : 'pointer',
                    opacity: savingDefects ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {savingDefects ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Change Source ====== */}
      {showSourceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isLinking8d ? <Link size={20} /> : <RefreshCw size={20} />}
                {isLinking8d ? 'Vincular 8D a campaña INCOMING' : 'Cambiar Origen del MRB'}
              </h3>
              <button
                onClick={() => setShowSourceModal(false)}
                style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Source Type Selection — only 8D allowed, hidden when linking 8D (already pre-selected) */}
            {!isLinking8d && <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ color: t.textDim, fontSize: '12px', marginBottom: '10px' }}>
                TIPO DE ORIGEN
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setSourceType('8D');
                    setSelectedNewSource(null);
                    loadSources('8D');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: sourceType === '8D' ? '#0072CE22' : t.bg,
                    border: `2px solid ${sourceType === '8D' ? t.accent : t.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Package size={20} color={sourceType === '8D' ? t.accent : t.textDim} />
                  <span style={{ color: sourceType === '8D' ? t.accent : t.textDim, fontWeight: '600' }}>8D</span>
                </button>
              </div>
            </div>}

            {/* Search */}
            {sourceType && (
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder={`Buscar ${sourceType}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      backgroundColor: t.bg,
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      color: t.text,
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={() => loadSources(sourceType)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: t.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Search size={16} />
                    Buscar
                  </button>
                </div>
              </div>
            )}

            {/* Sources List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {!sourceType ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  Selecciona un 8D para vincular como origen
                </div>
              ) : sourcesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>
                  Buscando...
                </div>
              ) : sources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  No se encontraron {sourceType}s
                </div>
              ) : (
                sources.map(source => (
                  <div
                    key={source.id}
                    onClick={() => setSelectedNewSource(source)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: selectedNewSource?.id === source.id ? '#0072CE22' : t.bg,
                      border: `2px solid ${selectedNewSource?.id === source.id ? t.accent : 'transparent'}`,
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '600', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}>{source.folio}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: source.status === 'completed' ? '#22c55e33' : '#C7770033', color: source.status === 'completed' ? '#22c55e' : '#C77700' }}>{source.status}</span>
                          {source.mrbCampaigns && source.mrbCampaigns.map((mc, mi) => {
                            const mrbColor = mc.status === 'CERRADA' ? { bg: '#22c55e22', color: '#16a34a' } : mc.status === 'BORRADOR' ? { bg: '#6b728022', color: '#6b7280' } : { bg: '#f59e0b22', color: '#b45309' };
                            return <span key={mi} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: mrbColor.bg, color: mrbColor.color }}>MRB {mc.campaignNumber} · {mc.status}</span>;
                          })}
                        </div>
                        <div style={{ color: t.text, fontSize: '13px', marginBottom: '4px' }}>{source.title || source.partNumber || '-'}</div>
                        <div style={{ color: t.textDim, fontSize: '12px' }}>{source.clientName} • {Array.isArray(source.partsList) && source.partsList.length > 1 ? 'Multiple Parts' : source.partNumber || '-'}</div>
                      </div>
                      <div style={{ textAlign: 'right', color: t.textDim, fontSize: '11px', flexShrink: 0, marginLeft: '12px' }}>{source.createdAt ? new Date(source.createdAt).toLocaleDateString('es-MX') : ''}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Adopt panel — when selecting a 8D source (linking or changing) */}
            {selectedNewSource && (selectedNewSource.sourceType === '8D' || isLinking8d) && (
              <div style={{ borderTop: `2px solid ${t.accent}40`, padding: '16px 20px', backgroundColor: `${t.accent}06` }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: t.text, marginBottom: '10px' }}>
                  Adoptar datos de <span style={{ color: t.accent }}>{selectedNewSource.folio}</span>:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: '14px' }}>
                  {[
                    { key: 'title',             label: L.campaignTitle },
                    { key: 'client',            label: L.clientProject },
                    { key: 'parts',             label: L.partNumbers },
                    { key: 'defectDescription', label: L.problemDescription },
                    { key: 'quarantine',        label: L.quarantineQty },
                    { key: 'photos',            label: L.photosNokOk },
                    { key: 'criteria',          label: L.inspectionCriteria },
                    { key: 'disposition',       label: L.dispositionInstructions },
                  ].map(f => (
                    <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: t.text }}>
                      <input type="checkbox" checked={adoptFields[f.key] ?? true} onChange={() => setAdoptFields(prev => ({ ...prev, [f.key]: !prev[f.key] }))} style={{ width: '15px', height: '15px' }} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowSourceModal(false)} style={{ padding: '10px 16px', backgroundColor: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleChangeSource} disabled={submitting} style={{ padding: '10px 20px', backgroundColor: '#0072CE', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: submitting ? 0.7 : 1 }}>
                    ✓ {submitting ? 'Vinculando...' : 'Adoptar seleccionados'}
                  </button>
                </div>
              </div>
            )}

            {/* Footer — only when no 8D source selected */}
            {!(selectedNewSource && (selectedNewSource.sourceType === '8D' || isLinking8d)) && (
              <div style={{ padding: '16px 20px', borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: t.textDim, fontSize: '13px' }}>{selectedNewSource ? `Seleccionado: ${selectedNewSource.folio}` : 'Ninguno seleccionado'}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowSourceModal(false)} style={{ padding: '10px 20px', backgroundColor: t.textMuted, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleChangeSource} disabled={!selectedNewSource || submitting} style={{ padding: '10px 20px', backgroundColor: selectedNewSource ? '#2E7D32' : t.textMuted, color: 'white', border: 'none', borderRadius: '6px', cursor: selectedNewSource ? 'pointer' : 'not-allowed', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? L.saving : L.saveChange}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== MODAL: Add Part ====== */}
      {showAddPartModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} />
                Agregar Parte a la Campaña
              </h3>
              <button
                onClick={() => setShowAddPartModal(false)}
                style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {availableParts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  No hay partes adicionales disponibles en este proyecto
                </div>
              ) : (
                availableParts.map(part => (
                  <div
                    key={part.id}
                    onClick={() => setSelectedPartToAdd(part)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: selectedPartToAdd?.id === part.id ? '#0072CE22' : t.bg,
                      border: `2px solid ${selectedPartToAdd?.id === part.id ? t.accent : 'transparent'}`,
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: t.text, fontFamily: "'IBM Plex Mono', monospace" }}>{part.partNumber}</div>
                    {part.partName && <div style={{ fontSize: '12px', color: t.textDim }}>{part.partName}</div>}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowAddPartModal(false)} style={{ padding: '10px 20px', backgroundColor: t.textMuted, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddPart} disabled={!selectedPartToAdd || addingPart} style={{ padding: '10px 20px', backgroundColor: selectedPartToAdd ? '#2E7D32' : t.textMuted, color: 'white', border: 'none', borderRadius: '6px', cursor: selectedPartToAdd ? 'pointer' : 'not-allowed', opacity: addingPart ? 0.7 : 1 }}>
                {addingPart ? 'Agregando...' : 'Agregar Parte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Affected Serials ====== */}
      {showAffectedSerialsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            width: '95%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <List size={20} color="#7c3aed" />
                Seriales Afectados
                {affectedSerialsSummary.total > 0 && (
                  <span style={{ fontSize: '12px', color: t.textDim, fontWeight: '400' }}>
                    ({affectedSerialsSummary.total} total — {affectedSerialsSummary.pending} pendientes)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowAffectedSerialsModal(false)}
                style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}` }}>
              <button
                onClick={() => setSerialModalTab('search')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: serialModalTab === 'search' ? t.accent + '15' : 'transparent',
                  border: 'none',
                  borderBottom: serialModalTab === 'search' ? `3px solid ${t.accent}` : '3px solid transparent',
                  color: serialModalTab === 'search' ? t.accent : t.textDim,
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Search size={16} />
                Buscar en Sistema
              </button>
              <button
                onClick={() => setSerialModalTab('manual')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: serialModalTab === 'manual' ? t.accent + '15' : 'transparent',
                  border: 'none',
                  borderBottom: serialModalTab === 'manual' ? `3px solid ${t.accent}` : '3px solid transparent',
                  color: serialModalTab === 'manual' ? t.accent : t.textDim,
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Edit3 size={16} />
                Entrada Manual
              </button>
              <button
                onClick={() => setSerialModalTab('list')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: serialModalTab === 'list' ? t.accent + '15' : 'transparent',
                  border: 'none',
                  borderBottom: serialModalTab === 'list' ? `3px solid ${t.accent}` : '3px solid transparent',
                  color: serialModalTab === 'list' ? t.accent : t.textDim,
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <List size={16} />
                Ver Cargados ({affectedSerialsSummary.total})
              </button>
            </div>

            {/* Tab: Buscar en Sistema */}
            {serialModalTab === 'search' && (
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
                  {/* Search Mode */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: t.text }}>
                      <input type="radio" name="searchMode" checked={searchMode === 'date'} onChange={() => setSearchMode('date')} />
                      Por Fecha/Hora
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: t.text }}>
                      <input type="radio" name="searchMode" checked={searchMode === 'serial'} onChange={() => setSearchMode('serial')} />
                      Por Rango de Serial
                    </label>
                  </div>

                  {/* Date Range */}
                  {searchMode === 'date' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: t.textDim, display: 'block', marginBottom: '4px' }}>DESDE</label>
                        <input
                          type="datetime-local"
                          value={searchDateFrom}
                          onChange={(e) => setSearchDateFrom(e.target.value)}
                          style={{ padding: '8px 12px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px' }}
                        />
                      </div>
                      <span style={{ color: t.textDim, marginTop: '16px' }}>→</span>
                      <div>
                        <label style={{ fontSize: '11px', color: t.textDim, display: 'block', marginBottom: '4px' }}>HASTA</label>
                        <input
                          type="datetime-local"
                          value={searchDateTo}
                          onChange={(e) => setSearchDateTo(e.target.value)}
                          style={{ padding: '8px 12px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Serial Range */}
                  {searchMode === 'serial' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: t.textDim, display: 'block', marginBottom: '4px' }}>SERIAL DESDE</label>
                        <input
                          type="text"
                          value={searchSerialFrom}
                          onChange={(e) => setSearchSerialFrom(e.target.value)}
                          placeholder="SN-001000"
                          style={{ padding: '8px 12px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace", width: '150px' }}
                        />
                      </div>
                      <span style={{ color: t.textDim, marginTop: '16px' }}>→</span>
                      <div>
                        <label style={{ fontSize: '11px', color: t.textDim, display: 'block', marginBottom: '4px' }}>SERIAL HASTA</label>
                        <input
                          type="text"
                          value={searchSerialTo}
                          onChange={(e) => setSearchSerialTo(e.target.value)}
                          placeholder="SN-001500"
                          style={{ padding: '8px 12px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace", width: '150px' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Parts Selection */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: t.textDim, display: 'block', marginBottom: '8px' }}>PARTES AFECTADAS</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {campaignParts.map(part => (
                        <label
                          key={part.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: selectedSearchParts.includes(part.id) ? t.accent + '22' : t.bg,
                            border: `1px solid ${selectedSearchParts.includes(part.id) ? t.accent : t.border}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: t.text,
                            fontSize: '12px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSearchParts.includes(part.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSearchParts(prev => [...prev, part.id]);
                              } else {
                                setSelectedSearchParts(prev => prev.filter(p => p !== part.id));
                              }
                            }}
                          />
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600' }}>{part.partNumber}</span>
                          {part.partName && <span style={{ color: t.textDim }}>— {part.partName}</span>}
                        </label>
                      ))}
                      {campaignParts.length === 0 && (
                        <span style={{ color: t.textMuted, fontStyle: 'italic' }}>No hay partes asignadas a esta campaña</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSearchSerials}
                    disabled={searchLoading || campaignParts.length === 0}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: campaignParts.length > 0 ? t.accent : t.textMuted,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: campaignParts.length > 0 ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Search size={16} />
                    {searchLoading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>

                {/* Search Results */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                  {searchResults.length > 0 ? (
                    <>
                      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: t.text, fontWeight: '600' }}>
                          {selectedSearchSerials.size} de {searchResults.length} seleccionados
                        </span>
                        <button
                          onClick={handleAddSearchResults}
                          disabled={savingSerials || selectedSearchSerials.size === 0}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: selectedSearchSerials.size === 0 ? t.textDim : '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: selectedSearchSerials.size === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}
                        >
                          {savingSerials ? 'Agregando...' : `Agregar ${selectedSearchSerials.size} seriales`}
                        </button>
                      </div>
                      <div style={{ maxHeight: '300px', overflow: 'auto', border: `1px solid ${t.border}`, borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: t.bg, position: 'sticky', top: 0 }}>
                              <th style={{ padding: '8px', width: '40px' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedSearchSerials.size === searchResults.length && searchResults.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSearchSerials(new Set(searchResults.map((_, i) => i)));
                                    } else {
                                      setSelectedSearchSerials(new Set());
                                    }
                                  }}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </th>
                              <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Serial</th>
                              <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Parte</th>
                              <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Fecha Registro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchResults.slice(0, 200).map((s, i) => (
                              <tr
                                key={i}
                                style={{
                                  borderBottom: `1px solid ${t.border}`,
                                  backgroundColor: selectedSearchSerials.has(i) ? `${t.accent}10` : 'transparent'
                                }}
                              >
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedSearchSerials.has(i)}
                                    onChange={() => {
                                      setSelectedSearchSerials(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(i)) {
                                          newSet.delete(i);
                                        } else {
                                          newSet.add(i);
                                        }
                                        return newSet;
                                      });
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600', color: t.text }}>{s.serialNumber}</td>
                                <td style={{ padding: '6px 8px', color: t.textDim }}>{s.partNumber}</td>
                                <td style={{ padding: '6px 8px', color: t.textDim }}>{s.registeredAt ? new Date(s.registeredAt).toLocaleString('es-MX') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {searchResults.length > 200 && (
                          <div style={{ padding: '12px', textAlign: 'center', color: t.textDim, backgroundColor: t.bg }}>
                            ...y {searchResults.length - 200} más (solo se muestran los primeros 200)
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                      Usa los filtros para buscar seriales en producción
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Entrada Manual */}
            {serialModalTab === 'manual' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                <div style={{ marginBottom: '16px', color: t.textDim, fontSize: '12px' }}>
                  Ingresa seriales con su número de parte correspondiente:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {manualSerials.map((row, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Serial"
                        value={row.serial}
                        onChange={(e) => handleManualSerialChange(index, 'serial', e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          backgroundColor: t.bg,
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          color: t.text,
                          fontSize: '13px',
                          fontFamily: "'IBM Plex Mono', monospace"
                        }}
                      />
                      <select
                        value={row.partId}
                        onChange={(e) => handleManualSerialChange(index, 'partId', e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          backgroundColor: t.bg,
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          color: t.text,
                          fontSize: '13px'
                        }}
                      >
                        <option value="">-- Seleccionar Parte --</option>
                        {campaignParts.map(p => (
                          <option key={p.id} value={p.id}>{p.partNumber} — {p.partName || ''}</option>
                        ))}
                      </select>
                      {manualSerials.length > 1 && (
                        <button
                          onClick={() => handleRemoveManualRow(index)}
                          style={{ background: 'none', border: 'none', color: '#B00020', cursor: 'pointer', padding: '4px' }}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleAddManualRow}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: t.bg,
                      color: t.text,
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <PlusCircle size={14} />
                    Agregar fila
                  </button>
                  <button
                    onClick={handleAddManualSerials}
                    disabled={savingSerials || manualSerials.every(s => !s.serial.trim() || !s.partId)}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      opacity: savingSerials ? 0.7 : 1
                    }}
                  >
                    {savingSerials ? 'Guardando...' : 'Guardar Seriales'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Ver Cargados */}
            {serialModalTab === 'list' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                {loadingSerials ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>Cargando...</div>
                ) : affectedSerials.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                    Sin seriales afectados registrados
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ color: t.text }}>
                        <strong>{affectedSerialsSummary.total}</strong> seriales —
                        <span style={{ color: '#22c55e' }}> {affectedSerialsSummary.inspected} inspeccionados</span>,
                        <span style={{ color: '#f59e0b' }}> {affectedSerialsSummary.pending} pendientes</span>
                      </span>
                      {affectedSerials.length > 0 && (
                        <button
                          onClick={handleClearAllSerials}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#B0002022',
                            color: '#B00020',
                            border: '1px solid #B00020',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}
                        >
                          Limpiar todo
                        </button>
                      )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                          <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Serial</th>
                          <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Parte</th>
                          <th style={{ padding: '8px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Estado</th>
                          <th style={{ padding: '8px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {affectedSerials.map(serial => (
                          <tr key={serial.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                            <td style={{ padding: '8px', color: t.text, fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600' }}>{serial.serialNumber}</td>
                            <td style={{ padding: '8px', color: t.textDim }}>{serial.partNumber || '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {serial.inspected ? (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  backgroundColor: serial.inspectionResult === 'OK' ? '#22c55e22' : serial.inspectionResult === 'NOK' ? '#B0002022' : '#f59e0b22',
                                  color: serial.inspectionResult === 'OK' ? '#16a34a' : serial.inspectionResult === 'NOK' ? '#B00020' : '#b45309'
                                }}>
                                  {serial.inspectionResult}
                                </span>
                              ) : (
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: '#6b728022', color: '#6b7280' }}>
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {!serial.inspected && (
                                <button
                                  onClick={() => handleDeleteSerial(serial.id)}
                                  style={{ background: 'none', border: 'none', color: '#B00020', cursor: 'pointer', padding: '4px' }}
                                  title="Eliminar"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAffectedSerialsModal(false)} style={{ padding: '10px 24px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {shiftReport && (
        <MRBShiftReport
          campaignId={id}
          shiftId={shiftReport.shiftId}
          date={shiftReport.date}
          shiftLabel={shiftReport.shiftLabel}
          onClose={() => setShiftReport(null)}
        />
      )}
    </div>
  );
};

// Sub-component for adding recipients to a published MRB
const AddRecipientPanel = ({ mrbId, token, apiUrl, onAdded, theme: t, styles, mrbData }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [recipientType, setRecipientType] = useState('response');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/users/list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await fetch(`${apiUrl}/mrb/${mrbId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUser, recipientType })
      });

      // Abrir mailto de notificación al nuevo destinatario
      const user = users.find(u => String(u.id) === String(selectedUser));
      if (user?.email && mrbData) {
        const link    = `${window.location.origin}/mrb-campaign/${mrbId}`;
        const subject = encodeURIComponent(`[MRB] ${mrbData.campaignNumber} — ${mrbData.title}`);
        const body    = encodeURIComponent(
          `Hola ${user.firstName || user.first_name || user.name},\n\n` +
          `Has sido agregado como destinatario en la Campaña MRB ${mrbData.campaignNumber}.\n\n` +
          `Campaña: ${mrbData.campaignNumber}\n` +
          `Título: ${mrbData.title}\n` +
          `Cliente: ${mrbData.clientName || '—'}\n` +
          `Parte: ${mrbData.partNumber || '—'}\n` +
          `Lote: ${mrbData.lotNumber || '—'}\n\n` +
          `Criterio de Inspección:\n${mrbData.inspectionCriteria || '—'}\n\n` +
          `Instrucción de Disposición:\n${mrbData.dispositionInstructions || '—'}\n\n` +
          `Accede aquí: ${link}`
        );
        window.location.href = `mailto:${user.email}?subject=${subject}&body=${body}`;
      }

      setSelectedUser('');
      onAdded();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <select
        style={{ ...styles.filterSelect, minWidth: 0 }}
        value={recipientType}
        onChange={e => setRecipientType(e.target.value)}
      >
        <option value="response">Tipo: Respuesta</option>
        <option value="validation">Tipo: Validación</option>
        <option value="info">Tipo: Información</option>
      </select>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          style={{ ...styles.filterSelect, minWidth: 0, flex: 1 }}
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
        >
          <option value="">Seleccionar usuario...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
        <button
          style={{ ...styles.buttonSuccess, opacity: saving || !selectedUser ? 0.7 : 1, whiteSpace: 'nowrap' }}
          onClick={handleAdd}
          disabled={saving || !selectedUser}
        >
          <UserPlus size={14} />
          Agregar
        </button>
      </div>

    </div>
  );
};

export default MRBCampaignDetail;
