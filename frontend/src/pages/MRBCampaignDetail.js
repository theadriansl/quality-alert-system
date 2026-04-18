import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import MRBShiftReport from './MRBShiftReport';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import {
  AlertTriangle, ArrowLeft, Send, Check, Clock, User, MapPin,
  FileText, Camera, MessageSquare, CheckCircle, XCircle, Users,
  List, PlusCircle, LayoutDashboard, ClipboardCheck, Link, ExternalLink,
  RefreshCw, Search, X, Package, Paperclip, Trash2, Info,
  Eye, ZoomIn, Hash, AlignLeft, Edit3, UserPlus, Save
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
              style={{ width: '64px', padding: '4px', textAlign: 'center', border: `1px solid ${t.accent}`, borderRadius: '4px', backgroundColor: t.bgInput, color: t.text, fontSize: '13px', fontWeight: '700' }} />
          : <span style={{ fontWeight: hrs > 0 ? '700' : '400', color: hrs > 0 ? t.text : '#f59e0b' }}>{hrs > 0 ? `${hrs} hrs` : '— sin registrar'}</span>
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
      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', color: hrs > 0 ? '#C77700' : t.textMuted }}>{hrs > 0 ? `$${cost.toFixed(2)}` : '—'}</td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing
          ? <button onClick={handleSave} disabled={savingPersonnel} style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>✓ Guardar</button>
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
  const API_URL = 'http://localhost:5000';

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
  const [isLinking8d, setIsLinking8d] = useState(false); // true = link-8d endpoint, false = change-source endpoint

  useEffect(() => {
    loadMrb();
    loadCurrentUser();
  }, [id]);

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
        // Load cost summary in parallel
        fetch(`${API_URL}/mrb/${id}/cost-summary`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          .then(r => r.json()).then(cs => { if (cs.success) setCostSummary(cs); }).catch(() => {});

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
        alert(syncFrom8D ? 'Cuarentena sincronizada desde 8D ✓' : 'Cuarentena actualizada ✓');
      } else {
        alert(data.message || 'Error al actualizar cuarentena');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSavingQuarantine(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!rootCause.trim() || !correctiveAction.trim()) {
      alert('Causa raíz y acción correctiva son requeridas');
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
        alert(data.message);
        loadMrb();
      } else {
        alert(data.message || 'Error al enviar respuesta');
      }
    } catch (err) {
      alert('Error al enviar respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidation = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      alert('Por favor indica el motivo del rechazo');
      return;
    }
    if (approved && requiresEarlyCloseReason && !earlyCloseReason.trim()) {
      alert('Debes proporcionar el motivo de cierre anticipado');
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
          window.location.href = `mailto:${data.responsibleEmails.join(',')}?subject=${subject}&body=${body}`;
        } else {
          alert(data.message);
        }
      } else if (data.requiresReason) {
        setRequiresEarlyCloseReason(true);
        alert(data.message);
      } else {
        alert(data.message || 'Error en validación');
      }
    } catch (err) {
      alert('Error en validación');
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
      alert('Error al agregar comentario');
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
    setSourceType(mrbCase?.sourceType || null);
    setSelectedNewSource(null);
    setSearchTerm('');
    setShowSourceModal(true);
    if (mrbCase?.sourceType) {
      loadSources(mrbCase.sourceType);
    }
  };

  // Open modal to link a 8D to an INCOMING campaign
  const openLink8dModal = () => {
    setIsLinking8d(true);
    setSourceType('8D');
    setSelectedNewSource(null);
    setSearchTerm('');
    setShowSourceModal(true);
    loadSources('8D');
  };

  // Change source
  const handleChangeSource = async () => {
    if (!selectedNewSource) {
      alert('Selecciona un nuevo origen');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      let res;
      if (isLinking8d) {
        // Only link the 8D without changing source_type
        res = await fetch(`${API_URL}/mrb/${id}/link-8d`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ source8dId: selectedNewSource.id })
        });
      } else {
        res = await fetch(`${API_URL}/mrb/${id}/source`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sourceType: sourceType,
            sourceQarId: sourceType === 'QAR' ? selectedNewSource.id : null,
            source8dId: sourceType === '8D' ? selectedNewSource.id : null
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowSourceModal(false);
        setIsLinking8d(false);
        loadMrb();
      } else {
        alert(data.message || 'Error al cambiar origen');
      }
    } catch (err) {
      alert('Error al cambiar origen');
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
        alert(data.message || 'Error al sincronizar');
      }
    } catch (e) { alert('Error al sincronizar'); }
    finally { setSubmitting(false); }
  };

  const handleSaveDraft = async (publish = false) => {
    if (!draftTitle.trim()) { alert('El título es requerido'); return; }
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
          partDescription: draftPartDescription,
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
            `Parte: ${mrb.partNumber || '—'}\n` +
            `Lote: ${mrb.lotNumber || '—'}\n\n` +
            `Criterio de Inspección:\n${mrb.inspectionCriteria || '—'}\n\n` +
            `Instrucción de Disposición:\n${mrb.dispositionInstructions || '—'}\n\n` +
            `Accede aquí: ${link}\n\n` +
            `Destinatarios: ${names}`
          );
          window.location.href = `mailto:${toEmails}?subject=${subject}&body=${body}`;
        } else if (publish) {
          alert('Campaña MRB publicada exitosamente');
        } else {
          alert('Cambios guardados correctamente');
        }
        loadMrb();
      } else {
        alert(data.message || 'Error al guardar');
      }
    } catch (e) { alert('Error al guardar'); }
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
          alert('El 8D vinculado aún no tiene D5/D6 completados.');
        }
      } else {
        alert(data.message || 'Error al sincronizar D5/D6');
      }
    } catch (e) { alert('Error al sincronizar'); }
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
        if (data.success) setAttachments(prev => [...prev, data.attachment]);
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
      if ((await res.json()).success) {
        setAttachments(prev => prev.filter(a => a.id !== attachId));
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
      'BORRADOR': { color: '#6b7280', label: 'Borrador', icon: FileText },
      'ABIERTA': { color: '#C77700', label: 'Pendiente de Disposición', icon: AlertTriangle },
      'EN_PROCESO': { color: '#0072CE', label: 'En Proceso - Pendiente Validación', icon: Clock },
      'CERRADA': { color: '#22c55e', label: 'Cerrado', icon: CheckCircle },
      'CANCELADA': { color: '#B00020', label: 'Cancelado', icon: XCircle }
    };
    return configs[status] || { color: '#6b7280', label: status, icon: AlertTriangle };
  };

  const responseRecipients = recipients.filter(r => r.recipientType === 'response');
  const validationRecipients = recipients.filter(r => r.recipientType === 'validation');

  const canRespond = mrbCase?.status === 'ABIERTA';
  const canValidate = mrbCase?.status === 'EN_PROCESO';
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
      fontFamily: 'monospace',
      letterSpacing: '1px'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '700',
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
            Casos MRB
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
                  else alert(data.message || 'Error al eliminar');
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
            onClick={() => navigate('/mrb-capture')}
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
              <span style={{ fontFamily: 'monospace', fontWeight: '700', color: t.accent, fontSize: '14px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={styles.label}>No. de Lote / Batch</label>
                <input type="text" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                  value={draftLotNumber} onChange={e => setDraftLotNumber(e.target.value)} placeholder="LOT-2026-001" />
              </div>
              <div>
                <label style={styles.label}>Descripción de Parte</label>
                <input type="text" style={{ ...styles.infoValue, width: '100%', padding: '10px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '14px' }}
                  value={draftPartDescription} onChange={e => setDraftPartDescription(e.target.value)} />
              </div>
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
                Costo estimado por turno: <strong style={{ color: t.text }}>${((draftInspectorCount * draftInspectorUnitCost) + (draftSupervisorCount * draftSupervisorUnitCost)).toFixed(2)}</strong>
              </div>
            )}
          </div>

          {/* Photos & Attachments */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Camera size={18} color="#7c3aed" />
              Estándar Visual
              <label style={{ marginLeft: 'auto', padding: '5px 10px', backgroundColor: t.accent, color: 'white', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Paperclip size={12} />{uploadingAttach ? 'Subiendo...' : 'Agregar archivo'}
                <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleUploadAttachment} style={{ display: 'none' }} />
              </label>
            </div>
            {(mrbCase.photoNokPath || mrbCase.photoOkPath) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: attachments.length > 0 ? '14px' : 0 }}>
                <div>
                  <div style={{ backgroundColor: '#B00020', padding: '4px 10px', borderRadius: '6px 6px 0 0' }}>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '11px' }}>NOK — Defecto</span>
                  </div>
                  <img src={`${API_URL}${mrbCase.photoNokPath}`} alt="NOK" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '0 0 6px 6px', display: 'block' }} onClick={() => window.open(`${API_URL}${mrbCase.photoNokPath}`, '_blank')} />
                </div>
                <div>
                  <div style={{ backgroundColor: '#22c55e', padding: '4px 10px', borderRadius: '6px 6px 0 0' }}>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '11px' }}>OK — Aceptable</span>
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
                style={{ flex: 2, padding: '14px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submitting ? 0.7 : 1 }}
              >
                <Send size={18} />
                {submitting ? 'Publicando...' : 'Publicar Campaña MRB'}
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
            { id: 'detail', label: 'Detalle del Caso' },
            { id: 'progress', label: '📊 Avance de Campaña' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'progress') loadProgress();
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
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
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
                          <div style={styles.cardTitle}>⚠ Material en Cuarentena</div>
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
                            <Edit3 size={13} /> {showQuarantineEdit ? 'Cancelar' : 'Editar'}
                          </button>
                        </div>
                      </div>

                      {/* Main numbers */}
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: qTotal > 0 ? '14px' : '0' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>{qTotal || '—'}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>En Planta</div>
                        </div>
                        {qTotal > 0 && <>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e' }}>{qInsp}</div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Inspeccionado</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: qRest > 0 ? '#B00020' : '#22c55e' }}>{qRest}</div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Restante</div>
                          </div>
                          <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
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
                                  { label: 'Almacén', value: dispWarehouse, color: '#f59e0b', info: false },
                                  { label: 'Proceso',  value: dispProcess,  color: '#f59e0b', info: false },
                                  { label: 'Tránsito', value: dispTransit,  color: '#9ca3af', info: true },
                                  { label: 'Cliente',  value: dispCustomer, color: '#9ca3af', info: true },
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
                            {has8D ? 'Haz clic en "Sync desde 8D" para cargar las cantidades del D2, o edita manualmente.' : 'Captura las cantidades en cuarentena con el botón "Editar".'}
                          </div>
                        )}
                      </div>

                      {/* Edit form */}
                      {showQuarantineEdit && (
                        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          {[
                            { label: 'Almacén',  val: qWarehouse, set: setQWarehouse },
                            { label: 'Proceso',  val: qProcess,   set: setQProcess   },
                            { label: 'Tránsito', val: qTransit,   set: setQTransit   },
                            { label: 'Cliente',  val: qCustomer,  set: setQCustomer  },
                          ].map(f => (
                            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>{f.label}</label>
                              <input
                                type="number" min="0"
                                value={f.val}
                                onChange={e => f.set(parseInt(e.target.value) || 0)}
                                style={{ width: '90px', padding: '8px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '15px', fontWeight: '700', textAlign: 'center' }}
                              />
                            </div>
                          ))}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase' }}>Total</label>
                            <div style={{ width: '90px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '15px', fontWeight: '700', textAlign: 'center', color: '#92400e' }}>
                              {qWarehouse + qProcess + qTransit + qCustomer}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSaveQuarantine(false)}
                            disabled={savingQuarantine}
                            style={{ padding: '8px 16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end' }}
                          >
                            <Save size={14} /> {savingQuarantine ? 'Guardando...' : 'Guardar'}
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
                      { label: 'INSP', value: mrbCase.qtyInspected || 0, color: t.accent },
                      { label: 'OK',   value: mrbCase.qtyOk || 0, color: '#22c55e' },
                      { label: 'NOK',  value: mrbCase.qtyNok || 0, color: '#B00020' },
                      { label: 'Rework',      value: mrbCase.qtyRework || 0,    color: '#f59e0b' },
                      { label: 'Scrap',       value: mrbCase.qtyScrap || 0,     color: '#ef4444' },
                      { label: 'Return',      value: mrbCase.qtyReturn || 0,    color: '#8b5cf6' },
                      { label: 'Hold',        value: mrbCase.qtyHold || 0,      color: '#6b7280' },
                      ...(mrbCase.qtyUseAsIs > 0 ? [{ label: 'Usar c/es', value: mrbCase.qtyUseAsIs, color: '#065f46' }] : []),
                      { label: 'Yield',  value: mrbCase.qtyInspected > 0 ? `${((mrbCase.qtyOk / mrbCase.qtyInspected) * 100).toFixed(1)}%` : '—', color: t.text },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', minWidth: '60px' }}>
                        <div style={{ fontSize: '26px', fontWeight: '700', color }}>{value}</div>
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
                    : 'Fecha desconocida';
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
                          <span style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>{dateLabel}</span>
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
                          {totalNok > 0 && <span style={{ fontSize: '13px', color: '#B00020', fontWeight: '700' }}>{totalNok} NOK</span>}
                          {rework > 0 && <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>⟳ {rework} Rework</span>}
                          {scrap > 0 && <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>✕ {scrap} Scrap</span>}
                          {ret > 0 && <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '600' }}>↩ {ret} Dev.</span>}
                          {hold > 0 && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>⏸ {hold} Hold</span>}
                          {useAsIs > 0 && <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>✓ {useAsIs} UAI</span>}
                          <button
                            onClick={() => setShiftReport({ shiftId: row.shiftId, date: rawDate, shiftLabel: shiftLabel })}
                            style={{ marginLeft: 'auto', padding: '5px 12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            📋 Ver Reporte
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
                                📄 {tally.filename}
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
                <div style={styles.infoLabel}>Cliente</div>
                <div style={styles.infoValue}>{mrbCase.clientName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Proyecto</div>
                <div style={styles.infoValue}>{mrbCase.projectName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>No. de Parte</div>
                <div style={styles.infoValue}>
                  {Array.isArray(mrbCase.partsList) && mrbCase.partsList.length > 0
                    ? mrbCase.partsList.map(p => p.partNumber).join(', ')
                    : (mrbCase.partNumber || mrbCase.partName || '-')}
                </div>
              </div>
              {mrbCase.lotNumber && (
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>No. de Lote / Batch</div>
                  <div style={{ ...styles.infoValue, fontFamily: 'monospace', letterSpacing: '1px' }}>{mrbCase.lotNumber}</div>
                </div>
              )}
              {mrbCase.partDescription && (
                <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                  <div style={styles.infoLabel}>Descripción de Parte</div>
                  <div style={styles.infoValue}>{mrbCase.partDescription}</div>
                </div>
              )}
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Severidad</div>
                <div style={styles.infoValue}>
                  <span style={{ backgroundColor: mrbCase.severityColor || '#6b7280', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                    {mrbCase.severityName}
                  </span>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Departamento Responsable</div>
                <div style={styles.infoValue}>{mrbCase.departmentName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Qty Inspeccionada</div>
                <div style={styles.infoValue}>{mrbCase.qtyInspected || <span style={{ color: t.textDim, fontSize: '12px' }}>Pendiente inspección</span>}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Qty OK / NOK</div>
                <div style={{ ...styles.infoValue, display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#22c55e', fontWeight: '700' }}>{mrbCase.qtyOk ?? 0} OK</span>
                  <span style={{ color: '#B00020', fontWeight: '700' }}>{mrbCase.qtyNok ?? 0} NOK</span>
                </div>
              </div>
              {/* Cost summary tables */}
              {costSummary && (
                <div style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Scrap cost by part */}
                  {costSummary.scrap?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#B00020', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Costo de Scrap — ${costSummary.totals.scrap.toFixed(2)} total
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                            {['Parte', 'Qty Scrap', 'Costo Unit.', 'Total'].map(h => (
                              <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Parte' ? 'left' : 'center', color: t.textMuted, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {costSummary.scrap.map((r, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                              <td style={{ padding: '5px 8px', color: t.text, fontWeight: '500' }}>{r.partNumber}{r.partName ? ` — ${r.partName}` : ''}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', color: '#B00020', fontWeight: '700' }}>{r.qtyScrap}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', color: t.textMuted }}>${r.unitCost.toFixed(2)}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', color: '#B00020' }}>${r.totalCost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Personnel cost by shift/day */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#C77700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Costo de Personal — ${costSummary.totals.personnel.toFixed(2)} total
                      <span style={{ fontSize: '10px', fontWeight: '400', color: t.textMuted, marginLeft: '8px' }}>
                        Insp. ${parseFloat(mrbCase.inspectorUnitCost || 0).toFixed(2)}/hr · Sup. ${parseFloat(mrbCase.supervisorUnitCost || 0).toFixed(2)}/hr
                      </span>
                    </div>
                    {costSummary.personnel?.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                            {['Fecha', 'Turno', 'Horas Trabajadas', 'Recursos', 'Costo', ''].map(h => (
                              <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Fecha' || h === 'Turno' ? 'left' : 'center', color: t.textMuted, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
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
                    <span style={{ fontSize: '14px', fontWeight: '700', color: t.text }}>
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
                      fontWeight: '700',
                      color: mrbCase.sourceType === 'QAR' ? '#C77700' : t.accent,
                      fontFamily: 'monospace'
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
                    - Haz clic en "Cambiar Origen" para vincular a un QAR o 8D
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
                        <td style={{ ...styles.td, fontWeight: i === 0 ? '700' : '400' }}>{row.defectName}</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', color: '#B00020' }}>{row.qty}</td>
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
                  style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                      else alert(data.message || 'Error al publicar');
                    } catch (e) { alert('Error al publicar'); }
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
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#C77700', marginBottom: '8px' }}>
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
              <div>
                {responseRecipients.map((r, idx) => (
                  <span key={idx} style={{
                    ...styles.recipientChip,
                    backgroundColor: r.acknowledgedAt ? '#22c55e33' : '#C7770033',
                    color: r.acknowledgedAt ? '#22c55e' : '#C77700'
                  }}>
                    {r.firstName} {r.lastName}
                    {r.acknowledgedAt && <Check size={12} />}
                  </span>
                ))}
                {responseRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: '13px' }}>Ninguno</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={styles.label}>Validación ({validationRecipients.length})</div>
              <div>
                {validationRecipients.map((r, idx) => (
                  <span key={idx} style={{
                    ...styles.recipientChip,
                    backgroundColor: `${t.accent}33`,
                    color: t.accent
                  }}>
                    {r.firstName} {r.lastName}
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
                    `Parte: ${mrbCase.partNumber || '—'}\n` +
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
                        comment: `📧 Recordatorio enviado a ${recipients.length} destinatario(s): ${names}`,
                        commentType: 'system'
                      })
                    });
                    loadMrb();
                  } catch (_) { /* silent */ }
                  window.location.href = `mailto:${allEmails}?subject=${subject}&body=${body}`;
                }}
                style={{ width: '100%', padding: '7px 12px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                📧 Enviar recordatorio a todos ({recipients.length})
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
                        <span style={{ color: 'white', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>NOK — Condición de Defecto</span>
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
                        <span style={{ color: 'white', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>OK — Condición Aceptable</span>
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

            <div style={styles.timeline}>
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
      </>}       {/* closes !isDraft && <> */}

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

            {/* Source Type Selection — hidden when linking 8D (already pre-selected) */}
            {!isLinking8d && <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ color: t.textDim, fontSize: '12px', marginBottom: '10px' }}>
                TIPO DE ORIGEN
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setSourceType('QAR');
                    setSelectedNewSource(null);
                    loadSources('QAR');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: sourceType === 'QAR' ? '#C7770022' : t.bg,
                    border: `2px solid ${sourceType === 'QAR' ? '#C77700' : t.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertTriangle size={20} color={sourceType === 'QAR' ? '#C77700' : t.textDim} />
                  <span style={{ color: sourceType === 'QAR' ? '#C77700' : t.textDim, fontWeight: '600' }}>QAR</span>
                </button>
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
                  Selecciona un tipo de origen (QAR o 8D)
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
                      <div>
                        <div style={{ fontWeight: '700', color: t.accent, fontFamily: 'monospace', marginBottom: '4px' }}>
                          {source.folio}
                        </div>
                        <div style={{ color: t.text, fontSize: '13px' }}>
                          {source.title || source.partNumber || '-'}
                        </div>
                        <div style={{ color: t.textDim, fontSize: '12px' }}>
                          {source.clientName} • {source.partNumber}
                        </div>
                      </div>
                      <div style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        backgroundColor: source.status === 'CERRADA' || source.status === 'completed' ? '#22c55e33' : '#C7770033',
                        color: source.status === 'CERRADA' || source.status === 'completed' ? '#22c55e' : '#C77700'
                      }}>
                        {source.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: t.textDim, fontSize: '13px' }}>
                {selectedNewSource ? `Seleccionado: ${selectedNewSource.folio}` : 'Ninguno seleccionado'}
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowSourceModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: t.textMuted,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangeSource}
                  disabled={!selectedNewSource || submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: selectedNewSource ? '#2E7D32' : t.textMuted,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: selectedNewSource ? 'pointer' : 'not-allowed',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Guardando...' : isLinking8d ? 'Vincular 8D' : 'Guardar Cambio'}
                </button>
              </div>
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
