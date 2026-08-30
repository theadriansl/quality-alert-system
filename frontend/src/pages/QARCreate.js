import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Send, Users, FileText, Camera, X, Check, Clock, User, MapPin, Search, Plus, List, LayoutDashboard, ClipboardCheck, ArrowLeft } from 'lucide-react';

const QARCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const API_URL = 'http://localhost:5000';

  // Permission check
  const canEdit = canUserEdit('quality_alert');

  // Redirect if no edit permissions
  useEffect(() => {
    if (!canEdit) {
      setPermissionModalOpen(true);
    }
  }, [canEdit]);

  // Get pre-filled data from navigation state
  const prefillData = location.state || {};
  const isManualMode = !prefillData.defects || prefillData.defects.length === 0;

  // QAR Info
  const [qarNumber, setQarNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Photos
  const [photoNokPreview, setPhotoNokPreview] = useState(null);
  const [photoOkPreview, setPhotoOkPreview] = useState(null);
  const [photoNokFile, setPhotoNokFile] = useState(null);
  const [photoOkFile, setPhotoOkFile] = useState(null);
  const [photoNokFromDefect, setPhotoNokFromDefect] = useState(null);

  // Precargar foto NOK desde defecto si existe
  useEffect(() => {
    if (prefillData.firstDefectImagePath) {
      const imgUrl = `${API_URL}/uploads/${prefillData.firstDefectImagePath}`;
      setPhotoNokPreview(imgUrl);
      setPhotoNokFromDefect(imgUrl);
    }
  }, [prefillData.firstDefectImagePath]);

  // Recipients
  const [responseRecipients, setResponseRecipients] = useState([]);
  const [validationRecipients, setValidationRecipients] = useState([]);

  // Data from prefill OR manual selection
  const [clientId, setClientId] = useState(prefillData.clientId || '');
  const [projectId, setProjectId] = useState(prefillData.projectId || '');
  const [partId, setPartId] = useState(prefillData.partId || '');
  const [severityId, setSeverityId] = useState(prefillData.severityId || '');
  const [departmentId, setDepartmentId] = useState(prefillData.departmentId || '');
  const [selectedDefects, setSelectedDefects] = useState(prefillData.defects || []);
  const [defectIds, setDefectIds] = useState(prefillData.defectIds || []);

  const [triggerInfo, setTriggerInfo] = useState({
    defectCount: prefillData.defectCount || 0,
    thresholdCount: prefillData.thresholdCount,
    thresholdHours: prefillData.thresholdHours,
    severityName: prefillData.severityName || '',
    severityColor: prefillData.severityColor || t.error,
    departmentName: prefillData.departmentName || '',
    partName: prefillData.partName || '',
    clientName: prefillData.clientName || '',
    emittedBy: prefillData.emittedBy || 'Usuario'
  });

  // Manual mode: catalogs
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Defect search modal
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [searchDefects, setSearchDefects] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    clientId: '',
    projectId: '',
    partId: '',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [tempSelectedIds, setTempSelectedIds] = useState([]);

  // Column filters for modal table (Excel-like)
  const [columnFilters, setColumnFilters] = useState({
    entryNumber: '',
    partNumber: '',
    defectName: '',
    severityName: '',
    stationName: '',
    shiftName: '',
    departmentId: '',
    dispositionName: '',
    inspectorName: '',
    hasQar: ''
  });

  // Department names helper
  const getDepartmentName = (deptId) => {
    const names = { 1: 'Producción', 2: 'Calidad', 3: 'Ingeniería', 4: 'Mantenimiento', 5: 'Logística', 6: 'Proveedor' };
    return names[deptId] || '-';
  };

  // Filtered defects based on column filters
  const filteredSearchDefects = searchDefects.filter(defect => {
    const inspectorFullName = `${defect.inspectorFirstName || ''} ${defect.inspectorLastName || ''}`.toLowerCase();
    if (columnFilters.entryNumber && !defect.entryNumber?.toLowerCase().includes(columnFilters.entryNumber.toLowerCase())) return false;
    if (columnFilters.partNumber && !defect.partNumber?.toLowerCase().includes(columnFilters.partNumber.toLowerCase())) return false;
    if (columnFilters.defectName && !defect.defectName?.toLowerCase().includes(columnFilters.defectName.toLowerCase())) return false;
    if (columnFilters.severityName && !defect.severityName?.toLowerCase().includes(columnFilters.severityName.toLowerCase())) return false;
    if (columnFilters.stationName && !defect.stationName?.toLowerCase().includes(columnFilters.stationName.toLowerCase())) return false;
    if (columnFilters.shiftName && !(defect.shiftCode || defect.shiftName || '').toLowerCase().includes(columnFilters.shiftName.toLowerCase())) return false;
    if (columnFilters.departmentId && defect.departmentId !== parseInt(columnFilters.departmentId)) return false;
    if (columnFilters.dispositionName && !(defect.dispositionCode || defect.dispositionName || '').toLowerCase().includes(columnFilters.dispositionName.toLowerCase())) return false;
    if (columnFilters.inspectorName && !inspectorFullName.includes(columnFilters.inspectorName.toLowerCase())) return false;
    if (columnFilters.hasQar === 'yes' && !defect.hasQar) return false;
    if (columnFilters.hasQar === 'no' && defect.hasQar) return false;
    return true;
  });

  // Users for recipient selection
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    generateQarNumber();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const promises = [
        fetch(`${API_URL}/users/list`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers })
      ];

      // Load catalogs for manual mode
      if (isManualMode) {
        promises.push(
          fetch(`${API_URL}/clients/list`, { headers }),
          fetch(`${API_URL}/inspection-catalogs/severities`, { headers }),
          fetch(`${API_URL}/inspection-catalogs/departments`, { headers })
        );
      }

      const responses = await Promise.all(promises);
      const usersData = await responses[0].json();
      const meData = await responses[1].json();

      setUsers(usersData.users || usersData || []);

      if (meData.user) {
        setCurrentUser(meData.user);
        setValidationRecipients([meData.user.id]);
        setTriggerInfo(prev => ({ ...prev, emittedBy: `${meData.user.firstName} ${meData.user.lastName}` }));
      }

      // Load catalogs for manual mode
      if (isManualMode) {
        const clientsData = await responses[2].json();
        const severitiesData = await responses[3].json();
        const departmentsData = await responses[4].json();

        setClients(clientsData.clients || []);
        setSeverities(severitiesData.items || []);
        setDepartments(departmentsData.items || []);
      } else {
        // Generate title and description from prefill
        setTitle(`${triggerInfo.departmentName} Responsable - ${triggerInfo.partName} - ${triggerInfo.severityName}`);
        setDescription(
          `Se detectaron ${triggerInfo.defectCount} defectos de severidad ${triggerInfo.severityName} ` +
          `del área ${triggerInfo.departmentName} en las últimas ${triggerInfo.thresholdHours} horas.\n\n` +
          `Umbral configurado: ${triggerInfo.thresholdCount} defectos.\n` +
          `Parte afectada: ${triggerInfo.partName}\n` +
          `Cliente: ${triggerInfo.clientName}`
        );
      }

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load projects when client changes (manual mode)
  const loadProjects = async (clientIdValue) => {
    if (!clientIdValue) {
      setProjects([]);
      return [];
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/${clientIdValue}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const loadedProjects = data.projects || [];
      setProjects(loadedProjects);
      return loadedProjects;
    } catch (err) {
      console.error('Error loading projects:', err);
      return [];
    }
  };

  // Load parts when project changes (manual mode)
  const loadParts = async (projectIdValue) => {
    if (!projectIdValue) {
      setParts([]);
      return [];
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/projects/${projectIdValue}/parts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const loadedParts = data.parts || [];
      setParts(loadedParts);
      return loadedParts;
    } catch (err) {
      console.error('Error loading parts:', err);
      return [];
    }
  };

  // Search defects for modal
  const searchDefectsAPI = async () => {
    try {
      setSearchLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (searchFilters.clientId) params.set('clientId', searchFilters.clientId);
      if (searchFilters.projectId) params.set('projectId', searchFilters.projectId);
      if (searchFilters.partId) params.set('partId', searchFilters.partId);
      if (searchFilters.startDate) params.set('startDate', searchFilters.startDate);
      if (searchFilters.endDate) params.set('endDate', searchFilters.endDate);
      params.set('status', 'open');
      params.set('limit', '100');

      const res = await fetch(`${API_URL}/defects-v2/entries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSearchDefects(data.entries || []);
    } catch (err) {
      console.error('Error searching defects:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Toggle defect selection in modal
  const toggleDefectSelection = (defect) => {
    setTempSelectedIds(prev => {
      if (prev.includes(defect.id)) {
        return prev.filter(id => id !== defect.id);
      } else {
        return [...prev, defect.id];
      }
    });
  };

  // Confirm defect selection from modal
  const confirmDefectSelection = async () => {
    const selected = searchDefects.filter(d => tempSelectedIds.includes(d.id));
    if (selected.length === 0) {
      setShowDefectModal(false);
      return;
    }

    // Merge defects without duplicates
    const existingIds = selectedDefects.map(d => d.id);
    const newDefects = selected.filter(d => !existingIds.includes(d.id));
    const allDefects = [...selectedDefects, ...newDefects];

    setSelectedDefects(allDefects);
    setDefectIds(allDefects.map(d => d.id));

    // Auto-fill form fields from first defect
    const firstDefect = selected[0];

    // Set client and wait for projects to load
    if (firstDefect.clientId) {
      setClientId(String(firstDefect.clientId));
      const loadedProjects = await loadProjects(firstDefect.clientId);

      if (firstDefect.projectId) {
        setProjectId(String(firstDefect.projectId));
        const loadedParts = await loadParts(firstDefect.projectId);

        if (firstDefect.partId) {
          setPartId(String(firstDefect.partId));
        }
      }
    }

    // Find the most severe severity among selected
    const severityPriority = { 'Crítico': 4, 'ALTA': 4, 'Mayor': 3, 'Menor': 2, 'Crítica': 4 };
    const mostSevere = selected.reduce((max, d) => {
      const currentPriority = severityPriority[d.severityName] || 0;
      const maxPriority = severityPriority[max?.severityName] || 0;
      return currentPriority > maxPriority ? d : max;
    }, selected[0]);

    if (mostSevere?.severityId) setSeverityId(String(mostSevere.severityId));

    // Get department from first defect
    if (firstDefect.departmentId) setDepartmentId(String(firstDefect.departmentId));

    // Update trigger info
    setTriggerInfo({
      defectCount: allDefects.length,
      thresholdCount: null,
      thresholdHours: null,
      severityName: mostSevere?.severityName || '',
      severityColor: mostSevere?.severityColor || t.error,
      departmentName: getDepartmentName(firstDefect.departmentId),
      partName: firstDefect.partNumber || '',
      clientName: firstDefect.clientName || '',
      emittedBy: triggerInfo.emittedBy
    });

    // Auto-generate title and description
    const deptName = getDepartmentName(firstDefect.departmentId);
    setTitle(`${deptName} Responsable - ${firstDefect.partNumber || 'Parte'} - ${mostSevere?.severityName || 'Alerta'}`);
    setDescription(
      `Se seleccionaron ${allDefects.length} defecto(s) manualmente para emitir QAR.\n\n` +
      `Severidad máxima: ${mostSevere?.severityName || '-'}\n` +
      `Departamento responsable: ${deptName}\n` +
      `Parte afectada: ${firstDefect.partNumber || '-'}\n` +
      `Cliente: ${firstDefect.clientName || '-'}`
    );

    setShowDefectModal(false);
    setTempSelectedIds([]);
  };

  // Remove defect from selection
  const removeDefect = (defectId) => {
    setSelectedDefects(prev => prev.filter(d => d.id !== defectId));
    setDefectIds(prev => prev.filter(id => id !== defectId));
    setTriggerInfo(prev => ({ ...prev, defectCount: prev.defectCount - 1 }));
  };

  const generateQarNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    setQarNumber(`QAR-${year}-${random}`);
  };

  const handlePhotoUpload = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'nok') {
        setPhotoNokFile(file);
      } else {
        setPhotoOkFile(file);
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'nok') {
          setPhotoNokPreview(reader.result);
        } else {
          setPhotoOkPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file, token) => {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(`${API_URL}/qar/upload-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      throw new Error('Error al subir imagen');
    }

    const data = await res.json();
    return data.url;
  };

  const toggleRecipient = (type, userId) => {
    if (type === 'response') {
      setResponseRecipients(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      setValidationRecipients(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }
    if (responseRecipients.length === 0) {
      setError('Selecciona al menos un destinatario de respuesta');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');

      // Upload photos first (if exist)
      let photoOkUrl = null;
      let photoNokUrl = null;

      if (photoOkFile) {
        photoOkUrl = await uploadPhoto(photoOkFile, token);
      }
      if (photoNokFile) {
        photoNokUrl = await uploadPhoto(photoNokFile, token);
      } else if (photoNokFromDefect && photoNokPreview) {
        photoNokUrl = `/uploads/${prefillData.firstDefectImagePath}`;
      }

      const qarData = {
        clientId,
        projectId,
        partId,
        title,
        description,
        severityId,
        departmentId,
        triggerType: 'threshold',
        triggerDefectCount: triggerInfo.defectCount,
        triggerPeriodHours: triggerInfo.thresholdHours,
        defectIds,
        responseRecipientIds: responseRecipients,
        validationRecipientIds: validationRecipients,
        assignedTo: responseRecipients[0],
        photoOkPath: photoOkUrl,
        photoNokPath: photoNokUrl,
        status: 'EMITIDO'
      };

      const res = await fetch(`${API_URL}/qar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(qarData)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Error al crear QAR');
      }

      // Generate mailto: link
      const responseEmails = users
        .filter(u => responseRecipients.includes(u.id) && u.email)
        .map(u => u.email);
      const validationEmails = users
        .filter(u => validationRecipients.includes(u.id) && u.email)
        .map(u => u.email);

      const mailtoSubject = encodeURIComponent(`${result.qar.alertNumber} - ${title}`);
      const mailtoBody = encodeURIComponent(
        `Se ha emitido un nuevo QAR que requiere tu atención.\n\n` +
        `Número: ${result.qar.alertNumber}\n` +
        `Título: ${title}\n` +
        `Severidad: ${triggerInfo.severityName}\n` +
        `Departamento Responsable: ${triggerInfo.departmentName}\n` +
        `Parte: ${triggerInfo.partName}\n` +
        `Cliente: ${triggerInfo.clientName}\n\n` +
        `Defectos asociados: ${defectIds.length}\n\n` +
        `Por favor ingresa al sistema para ver los detalles y responder:\n` +
        `${window.location.origin}/qar-detail/${result.qar.id}\n\n` +
        `---\n` +
        `Este correo fue generado automáticamente por el Sistema de Alertas de Calidad.`
      );

      // Open mailto
      if (responseEmails.length > 0 || validationEmails.length > 0) {
        const toEmails = responseEmails.length > 0 ? responseEmails.join('; ') : validationEmails.join('; ');
        const ccEmails = responseEmails.length > 0 && validationEmails.length > 0 ? validationEmails.join('; ') : '';

        let mailtoLink = `mailto:${toEmails}?subject=${mailtoSubject}&body=${mailtoBody}`;
        if (ccEmails) {
          mailtoLink = `mailto:${toEmails}?cc=${ccEmails}&subject=${mailtoSubject}&body=${mailtoBody}`;
        }

        window.open(mailtoLink, '_blank');
      }

      // Show success modal
      setSuccessData({
        alertNumber: result.qar.alertNumber,
        qarId: result.qar.id,
        recipientCount: responseRecipients.length + validationRecipients.length
      });
      setSuccessModalOpen(true);

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Checklist items for verification panel
  const checklistItems = [
    { key: 'title', label: 'Título', met: !!title.trim() },
    { key: 'defects', label: 'Al menos 1 defecto', met: selectedDefects.length > 0 },
    { key: 'severity', label: 'Severidad', met: !!severityId },
    { key: 'response', label: 'Destinatario de respuesta', met: responseRecipients.length > 0 },
    { key: 'validation', label: 'Destinatario de validación', met: validationRecipients.length > 0 }
  ];
  const allChecksPassed = checklistItems.every(i => i.met);

  // ─── Modal styles ──────────────────────────────────────────────────────────
  const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalCard = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
    maxWidth: 1040,
    width: '95%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  const modalHeader = {
    height: 48,
    padding: '0 16px',
    borderBottom: `1px solid ${t.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  };

  const modalFooter = {
    height: 56,
    padding: '0 16px',
    backgroundColor: t.field,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: 24 }}>
        <div style={{ textAlign: 'center', padding: 60, color: t.text }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: 24 }}>
      {/* ====== NAVIGATION BAR ====== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/qar-list')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
        >
          <ArrowLeft size={18} />
          Volver a Lista
        </button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ThemeSelector />
          <button
            onClick={() => navigate('/qar-list')}
            style={{ padding: '8px 14px', backgroundColor: t.bgCard, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <List size={16} />
            Lista QAR
          </button>
          <button
            onClick={() => navigate('/defect-capture')}
            style={{ padding: '8px 14px', backgroundColor: t.bgCard, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <ClipboardCheck size={16} />
            Inspección
          </button>
          <button
            onClick={() => navigate('/defect-dashboard')}
            style={{ padding: '8px 14px', backgroundColor: t.bgCard, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>
      </div>

      {/* ====== HEADER ====== */}
      <div style={{
        backgroundColor: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              color: t.textMuted,
              marginBottom: 6,
              letterSpacing: 1
            }}>
              {qarNumber}
            </div>
            <h1 style={{ fontSize: 19, fontWeight: 600, color: t.text, margin: 0 }}>
              Nueva Quality Alert Report
            </h1>
          </div>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: t.textMuted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} />
            Emitido por: {triggerInfo.emittedBy}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} />
            {new Date().toLocaleString('es-MX')}
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: t.errorBg,
          color: t.error,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          border: `1px solid ${t.errorBorder}`,
          fontSize: 13
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* ====== LEFT COLUMN ====== */}
        <div>
          {/* General Info Form */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <FileText size={18} />
              Información General
            </div>

            {/* Grid layout for form */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Cliente *</label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: t.field,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 13
                  }}
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setProjectId('');
                    setPartId('');
                    loadProjects(e.target.value);
                    const client = clients.find(c => c.id === parseInt(e.target.value));
                    setTriggerInfo(prev => ({ ...prev, clientName: client?.name || '' }));
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Proyecto</label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: t.field,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 13
                  }}
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setPartId('');
                    loadParts(e.target.value);
                  }}
                  disabled={!clientId}
                >
                  <option value="">Seleccionar...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} - {p.projectName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Parte</label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: t.field,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 13
                  }}
                  value={partId}
                  onChange={(e) => {
                    setPartId(e.target.value);
                    const part = parts.find(p => p.id === parseInt(e.target.value));
                    setTriggerInfo(prev => ({ ...prev, partName: part?.partNumber || '' }));
                  }}
                  disabled={!projectId}
                >
                  <option value="">Seleccionar...</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Severidad *</label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: t.field,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 13
                  }}
                  value={severityId}
                  onChange={(e) => {
                    setSeverityId(e.target.value);
                    const sev = severities.find(s => s.id === parseInt(e.target.value));
                    setTriggerInfo(prev => ({
                      ...prev,
                      severityName: sev?.name || '',
                      severityColor: sev?.color || t.error
                    }));
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {severities.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Departamento</label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: t.field,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 13
                  }}
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    const dept = departments.find(d => d.id === parseInt(e.target.value));
                    setTriggerInfo(prev => ({ ...prev, departmentName: dept?.name || '' }));
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Título *</label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: t.field,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  color: t.text
                }}
                placeholder="Título de la alerta..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description with character counter */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>
                Descripción
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400 }}>
                  {description.length}/1000
                </span>
              </label>
              <textarea
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: t.field,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  color: t.text,
                  minHeight: 100,
                  resize: 'vertical'
                }}
                placeholder="Descripción detallada..."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              />
            </div>
          </div>

          {/* ====== DEFECTS TABLE ====== */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: t.warning }} />
                Defectos Asociados ({selectedDefects.length})
                {triggerInfo.thresholdCount && (
                  <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 400 }}>
                    — umbral: {triggerInfo.thresholdCount} en {triggerInfo.thresholdHours}h
                  </span>
                )}
              </div>
              <button
                style={{
                  padding: '8px 14px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500
                }}
                onClick={() => {
                  setTempSelectedIds(defectIds);
                  setColumnFilters({ entryNumber: '', partNumber: '', defectName: '', severityName: '', stationName: '', shiftName: '', departmentId: '', dispositionName: '', inspectorName: '', hasQar: '' });
                  setShowDefectModal(true);
                  searchDefectsAPI();
                }}
              >
                <Search size={16} />
                Buscar Defectos
              </button>
            </div>

            {selectedDefects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: t.textMuted }}>
                <p style={{ fontSize: 13 }}>No hay defectos asociados</p>
                <p style={{ fontSize: 12 }}>Haz clic en "Buscar Defectos" para agregar</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Folio</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Estación</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Fecha</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDefects.map((defect, idx) => (
                    <tr key={idx} style={{ height: 44 }}>
                      <td style={{ padding: '0 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: t.accent, fontWeight: 600, borderBottom: `1px solid ${t.line}` }}>{defect.entryNumber}</td>
                      <td style={{ padding: '0 12px', color: t.text, borderBottom: `1px solid ${t.line}` }}>{defect.stationCode || defect.stationName || '-'}</td>
                      <td style={{ padding: '0 12px', color: t.textMuted, borderBottom: `1px solid ${t.line}`, fontSize: 12 }}>{formatDate(defect.createdAt)}</td>
                      <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}`, textAlign: 'right' }}>
                        <button
                          onClick={() => removeDefect(defect.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.accent, fontSize: 12, fontWeight: 500 }}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ====== PHOTOS ====== */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Camera size={18} />
              Evidencia Fotográfica
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Photo NOK */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.error }} />
                  NOK (Defecto)
                </div>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px dashed ${t.border}`,
                  borderRadius: 4,
                  minHeight: 180,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: t.bgPanel
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('nok', e)}
                    style={{ display: 'none' }}
                  />
                  {photoNokPreview ? (
                    <>
                      <img src={photoNokPreview} alt="NOK" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 4, border: `1px solid ${t.border}` }} />
                      {photoNokFromDefect && !photoNokFile && (
                        <div style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          padding: '4px 8px',
                          fontSize: 10,
                          backgroundColor: t.field,
                          border: `1px solid ${t.border}`,
                          borderRadius: 4,
                          color: t.textMuted
                        }}>
                          Desde defecto
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <X size={28} color={t.textMuted} style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: 12, color: t.textMuted }}>Clic para subir</div>
                    </div>
                  )}
                </label>
                {photoNokPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoNokPreview(null);
                      setPhotoNokFile(null);
                      setPhotoNokFromDefect(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: 30,
                      right: 8,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: t.error,
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Photo OK */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.success }} />
                  OK (Referencia)
                </div>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px dashed ${t.border}`,
                  borderRadius: 4,
                  minHeight: 180,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  backgroundColor: t.bgPanel
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('ok', e)}
                    style={{ display: 'none' }}
                  />
                  {photoOkPreview ? (
                    <img src={photoOkPreview} alt="OK" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 4, border: `1px solid ${t.border}` }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Check size={28} color={t.textMuted} style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: 12, color: t.textMuted }}>Clic para subir</div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* ====== RECIPIENTS ====== */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Users size={18} />
              Destinatarios
            </div>

            {/* Response Recipients */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                Respuesta ({responseRecipients.length}) — Quienes deben resolver
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {users.map(user => (
                  <div
                    key={`resp-${user.id}`}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: responseRecipients.includes(user.id) ? t.accentBg : t.bgPanel,
                      border: `1px solid ${responseRecipients.includes(user.id) ? t.accentBorder : t.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                    onClick={() => toggleRecipient('response', user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={responseRecipients.includes(user.id)}
                      onChange={() => {}}
                      style={{ width: 14, height: 14, accentColor: t.primary }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, color: t.text, fontSize: 13 }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ fontSize: 10, color: t.textDim }}>{user.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Recipients */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                Validación ({validationRecipients.length}) — Quienes aprueban el cierre
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {users.filter(u => u.canValidateQar).map(user => (
                  <div
                    key={`val-${user.id}`}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: validationRecipients.includes(user.id) ? t.accentBg : t.bgPanel,
                      border: `1px solid ${validationRecipients.includes(user.id) ? t.accentBorder : t.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                    onClick={() => toggleRecipient('validation', user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={validationRecipients.includes(user.id)}
                      onChange={() => {}}
                      style={{ width: 14, height: 14, accentColor: t.primary }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, color: t.text, fontSize: 13 }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ fontSize: 10, color: t.textDim }}>{user.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ====== RIGHT COLUMN - VERIFICATION PANEL ====== */}
        <div>
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            position: 'sticky',
            top: 24
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16
            }}>
              Lista de Verificación
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {checklistItems.map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: item.met ? t.successFg : 'transparent',
                    border: `2px solid ${item.met ? t.successFg : t.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.met && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: item.met ? t.text : t.textMuted }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              style={{
                width: '100%',
                padding: 14,
                backgroundColor: allChecksPassed ? t.primary : t.bgPanel,
                color: allChecksPassed ? 'white' : t.textMuted,
                border: allChecksPassed ? 'none' : `1px solid ${t.border}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: allChecksPassed && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
                opacity: submitting ? 0.7 : 1
              }}
              onClick={handleSubmit}
              disabled={!allChecksPassed || submitting}
            >
              <Send size={18} />
              {submitting ? 'Emitiendo...' : 'Emitir QAR'}
            </button>

            <button
              style={{
                width: '100%',
                padding: 12,
                backgroundColor: t.bgPanel,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onClick={() => navigate(-1)}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* ====== MODAL: Defect Search ====== */}
      {showDefectModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.accent }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Buscar y Seleccionar Defectos</span>
              </div>
              <button
                onClick={() => setShowDefectModal(false)}
                style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'flex-end'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: t.textMuted, marginBottom: 4, fontWeight: 500 }}>Cliente</label>
                <select
                  style={{ padding: '6px 10px', fontSize: 12, border: `1px solid ${t.border}`, borderRadius: 6, backgroundColor: t.bgCard, color: t.text, minWidth: 130 }}
                  value={searchFilters.clientId}
                  onChange={(e) => {
                    setSearchFilters(prev => ({ ...prev, clientId: e.target.value, projectId: '', partId: '' }));
                    if (e.target.value) loadProjects(e.target.value);
                  }}
                >
                  <option value="">Todos</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: t.textMuted, marginBottom: 4, fontWeight: 500 }}>Desde</label>
                <input
                  type="date"
                  style={{ padding: '6px 10px', fontSize: 12, border: `1px solid ${t.border}`, borderRadius: 6, backgroundColor: t.bgCard, color: t.text, fontFamily: "'IBM Plex Mono', monospace" }}
                  value={searchFilters.startDate}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: t.textMuted, marginBottom: 4, fontWeight: 500 }}>Hasta</label>
                <input
                  type="date"
                  style={{ padding: '6px 10px', fontSize: 12, border: `1px solid ${t.border}`, borderRadius: 6, backgroundColor: t.bgCard, color: t.text, fontFamily: "'IBM Plex Mono', monospace" }}
                  value={searchFilters.endDate}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <button
                onClick={searchDefectsAPI}
                style={{
                  padding: '6px 14px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                <Search size={14} />
                Buscar
              </button>
            </div>

            {/* Table body with scroll */}
            <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
              {searchLoading ? (
                <div style={{ textAlign: 'center', padding: 60, color: t.textMuted }}>
                  Buscando defectos...
                </div>
              ) : searchDefects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: t.textMuted, fontSize: 13 }}>
                  No se encontraron defectos con los filtros seleccionados
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    {/* Header row */}
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>
                        <input
                          type="checkbox"
                          checked={filteredSearchDefects.length > 0 && tempSelectedIds.length === filteredSearchDefects.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempSelectedIds(filteredSearchDefects.map(d => d.id));
                            } else {
                              setTempSelectedIds([]);
                            }
                          }}
                          style={{ accentColor: t.primary }}
                        />
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>Folio</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>Fecha</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>Parte</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>Defecto</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>Sev</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, fontSize: 11, height: 34 }}>Estación</th>
                    </tr>
                    {/* Filter row */}
                    <tr style={{ backgroundColor: t.bg }}>
                      <th style={{ padding: 4 }}></th>
                      <th style={{ padding: 4 }}>
                        <input type="text" placeholder="..." value={columnFilters.entryNumber}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, entryNumber: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 11 }} />
                      </th>
                      <th style={{ padding: 4 }}></th>
                      <th style={{ padding: 4 }}>
                        <input type="text" placeholder="..." value={columnFilters.partNumber}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, partNumber: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 11 }} />
                      </th>
                      <th style={{ padding: 4 }}>
                        <input type="text" placeholder="..." value={columnFilters.defectName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, defectName: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 11 }} />
                      </th>
                      <th style={{ padding: 4 }}>
                        <input type="text" placeholder="..." value={columnFilters.severityName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, severityName: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 11 }} />
                      </th>
                      <th style={{ padding: 4 }}>
                        <input type="text" placeholder="..." value={columnFilters.stationName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, stationName: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 11 }} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSearchDefects.map(defect => (
                      <tr
                        key={defect.id}
                        onClick={() => toggleDefectSelection(defect)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: tempSelectedIds.includes(defect.id) ? t.accentBg : 'transparent',
                          height: 44
                        }}
                      >
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}` }}>
                          <input
                            type="checkbox"
                            checked={tempSelectedIds.includes(defect.id)}
                            onChange={() => {}}
                            style={{ accentColor: t.primary }}
                          />
                        </td>
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}`, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: t.accent, fontSize: 11 }}>{defect.entryNumber}</td>
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}`, color: t.textMuted, fontSize: 11 }}>{formatDate(defect.capturedAt || defect.createdAt)}</td>
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}`, color: t.text }}>{defect.partNumber || '-'}</td>
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}`, color: t.text }}>{defect.defectName || '-'}</td>
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}` }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: 1,
                              backgroundColor: defect.severityColor || t.textMuted
                            }} />
                            <span style={{ color: t.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{defect.severityCode || defect.severityName || '-'}</span>
                          </span>
                        </td>
                        <td style={{ padding: '0 12px', borderBottom: `1px solid ${t.line}`, color: t.text }}>{defect.stationName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={modalFooter}>
              <span style={{ color: t.textMuted, fontSize: 12 }}>
                {tempSelectedIds.length} seleccionado(s)
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDefectModal(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: t.bgPanel,
                    color: t.text,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDefectSelection}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: t.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  <Plus size={14} />
                  Agregar a la QAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Success ====== */}
      {successModalOpen && successData && (
        <div style={modalOverlay}>
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
            maxWidth: 420,
            width: '90%',
            overflow: 'hidden'
          }}>
            <div style={{
              height: 48,
              padding: '0 16px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.success }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>QAR Emitido Exitosamente</span>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>Número de Alerta</div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 24,
                  fontWeight: 700,
                  color: t.text,
                  padding: '12px 20px',
                  backgroundColor: t.bgPanel,
                  borderRadius: 8,
                  display: 'inline-block'
                }}>
                  {successData.alertNumber}
                </div>
              </div>
              <div style={{ fontSize: 13, color: t.textMuted, textAlign: 'center' }}>
                Notificación enviada a {successData.recipientCount} destinatario(s)
              </div>
            </div>
            <div style={{
              height: 56,
              padding: '0 16px',
              backgroundColor: t.field,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setSuccessModalOpen(false);
                  navigate(`/qar-detail/${successData.qarId}`);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Ver Detalles del QAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Permission Denied ====== */}
      {permissionModalOpen && (
        <div style={modalOverlay}>
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
            maxWidth: 400,
            width: '90%',
            overflow: 'hidden'
          }}>
            <div style={{
              height: 48,
              padding: '0 16px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.error }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Acceso Denegado</span>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ color: t.textMuted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                No tienes permisos para crear QARs. Contacta al administrador si necesitas acceso.
              </p>
            </div>
            <div style={{
              height: 56,
              padding: '0 16px',
              backgroundColor: t.field,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setPermissionModalOpen(false);
                  navigate('/qar-list');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Volver a la Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QARCreate;
