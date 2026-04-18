import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { AlertTriangle, Send, Users, FileText, Camera, X, Check, Clock, User, MapPin, Search, Plus, List, LayoutDashboard, ClipboardCheck, ArrowLeft } from 'lucide-react';

const QARCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: t } = useTheme();
  const API_URL = 'http://localhost:5000';

  // Permission check
  const canEdit = canUserEdit('quality_alert');
  const readOnly = isReadOnly('quality_alert');

  // Redirect if no edit permissions
  useEffect(() => {
    if (!canEdit) {
      alert('No tienes permisos para crear QARs');
      navigate('/qar-list');
    }
  }, [canEdit, navigate]);

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
    severityColor: prefillData.severityColor || '#B00020',
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
        // inspection-catalogs returns 'items' not specific names
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

  // Load projects when client changes (manual mode) - returns loaded projects
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

  // Load parts when project changes (manual mode) - returns loaded parts
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
      params.set('status', 'open'); // Only open defects
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

    // Auto-fill form fields from first defect (or most common values)
    const firstDefect = selected[0];
    console.log('First defect data:', firstDefect);

    // Set client and wait for projects to load before setting project
    if (firstDefect.clientId) {
      setClientId(String(firstDefect.clientId));
      const loadedProjects = await loadProjects(firstDefect.clientId);
      console.log('Loaded projects:', loadedProjects);

      // Now set project and wait for parts to load
      if (firstDefect.projectId) {
        setProjectId(String(firstDefect.projectId));
        const loadedParts = await loadParts(firstDefect.projectId);
        console.log('Loaded parts:', loadedParts);

        // Now set part
        if (firstDefect.partId) {
          setPartId(String(firstDefect.partId));
        }
      }
    }

    // Find the most severe severity among selected (prioritize by order: Crítico/ALTA > Mayor > Menor)
    const severityPriority = { 'Crítico': 4, 'ALTA': 4, 'Mayor': 3, 'Menor': 2, 'Crítica': 4 };
    const mostSevere = selected.reduce((max, d) => {
      const currentPriority = severityPriority[d.severityName] || 0;
      const maxPriority = severityPriority[max?.severityName] || 0;
      return currentPriority > maxPriority ? d : max;
    }, selected[0]);

    if (mostSevere?.severityId) setSeverityId(String(mostSevere.severityId));

    // Get department from first defect
    if (firstDefect.departmentId) setDepartmentId(String(firstDefect.departmentId));

    // Update trigger info with all relevant data
    setTriggerInfo({
      defectCount: allDefects.length,
      thresholdCount: null,
      thresholdHours: null,
      severityName: mostSevere?.severityName || '',
      severityColor: mostSevere?.severityColor || '#B00020',
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
      // Guardar el archivo para upload posterior
      if (type === 'nok') {
        setPhotoNokFile(file);
      } else {
        setPhotoOkFile(file);
      }
      // Crear preview
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

  // Función para subir foto al servidor
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

      // Subir fotos primero (si existen)
      let photoOkUrl = null;
      let photoNokUrl = null;

      if (photoOkFile) {
        photoOkUrl = await uploadPhoto(photoOkFile, token);
      }
      if (photoNokFile) {
        photoNokUrl = await uploadPhoto(photoNokFile, token);
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

      const mailtoLink = `mailto:${responseEmails.join(',')}?cc=${validationEmails.join(',')}&subject=${mailtoSubject}&body=${mailtoBody}`;

      // Open mail client
      window.open(mailtoLink, '_blank');

      alert(`QAR Emitido Exitosamente\n\nNúmero: ${result.qar.alertNumber}`);
      navigate(`/qar-detail/${result.qar.id}`);

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

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    // Header impactante
    header: {
      backgroundColor: triggerInfo.severityColor || t.error,
      color: 'white',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '24px'
    },
    qarNumber: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '8px',
      fontFamily: 'monospace',
      letterSpacing: '2px'
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerMeta: {
      fontSize: '14px',
      opacity: 0.9,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    card: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      color: t.text,
      marginBottom: '12px'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      color: t.text,
      minHeight: '120px',
      resize: 'vertical'
    },
    // Defects table
    defectsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      fontWeight: '600',
      borderBottom: `1px solid ${t.border}`
    },
    td: {
      padding: '10px 12px',
      color: t.text,
      borderBottom: `1px solid ${t.border}`
    },
    // Photos
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    },
    photoBox: {
      border: `2px dashed ${t.border}`,
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    photoBoxNok: {
      borderColor: t.error,
      backgroundColor: `${t.error}15`
    },
    photoBoxOk: {
      borderColor: t.success,
      backgroundColor: `${t.success}15`
    },
    photoPreview: {
      maxWidth: '100%',
      maxHeight: '180px',
      borderRadius: '8px'
    },
    // Recipients
    recipientSection: {
      marginBottom: '20px'
    },
    recipientLabel: {
      color: t.textMuted,
      fontSize: '13px',
      marginBottom: '8px',
      fontWeight: '600'
    },
    userGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '10px'
    },
    userCard: {
      padding: '10px 14px',
      backgroundColor: t.bgPanel,
      border: `2px solid ${t.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.15s'
    },
    userCardSelected: {
      borderColor: t.accent,
      backgroundColor: `${t.accent}20`
    },
    // Buttons
    submitButton: {
      width: '100%',
      padding: '16px 24px',
      backgroundColor: t.error,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    cancelButton: {
      width: '100%',
      padding: '16px 24px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '12px'
    },
    error: {
      backgroundColor: `${t.error}15`,
      color: t.error,
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    // Manual mode styles
    label: {
      display: 'block',
      fontSize: '12px',
      color: t.textMuted,
      marginBottom: '6px',
      fontWeight: '500'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px'
    },
    selectSmall: {
      padding: '8px 12px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '13px',
      minWidth: '150px'
    },
    // Modal styles
    modalOverlay: {
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
    },
    modal: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      width: '95%',
      maxWidth: '1400px',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column'
    },
    modalHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalFilters: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'flex-end'
    },
    modalBody: {
      flex: 1,
      overflow: 'auto',
      padding: '0'
    },
    modalFooter: {
      padding: '16px 20px',
      borderTop: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    thModal: {
      textAlign: 'left',
      padding: '10px 12px',
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      fontWeight: '600',
      fontSize: '12px',
      position: 'sticky',
      top: 0
    },
    tdModal: {
      padding: '10px 12px',
      color: t.text,
      fontSize: '13px',
      borderBottom: `1px solid ${t.border}`
    },
    columnFilterInput: {
      width: '100%',
      padding: '6px 8px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      color: t.text,
      fontSize: '12px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px', color: t.text }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ====== NAVIGATION BAR ====== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/qar-list')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          <ArrowLeft size={18} />
          Volver a Lista
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ThemeSelector />
          <button
            onClick={() => navigate('/qar-list')}
            style={{ padding: '8px 14px', backgroundColor: t.bgCard, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <List size={16} />
            Lista QAR
          </button>
          <button
            onClick={() => navigate('/defect-capture')}
            style={{ padding: '8px 14px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ClipboardCheck size={16} />
            Inspección
          </button>
          <button
            onClick={() => navigate('/defect-dashboard')}
            style={{ padding: '8px 14px', backgroundColor: t.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>
      </div>

      {/* ====== HEADER IMPACTANTE ====== */}
      <div style={styles.header}>
        <div style={styles.qarNumber}>{qarNumber}</div>
        <h1 style={styles.headerTitle}>
          <AlertTriangle size={28} />
          {triggerInfo.departmentName?.toUpperCase()} RESPONSABLE - Alerta de Calidad - {triggerInfo.partName} - {triggerInfo.severityName?.toUpperCase()}
        </h1>
        <div style={styles.headerMeta}>
          <User size={16} />
          Emitido por: {triggerInfo.emittedBy} | {new Date().toLocaleString('es-MX')}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* ====== SELECCIÓN MANUAL (solo en modo manual) ====== */}
      {isManualMode && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <FileText size={20} color={t.accent} />
            Información del QAR
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={styles.label}>Cliente *</label>
              <select
                style={styles.select}
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
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Proyecto</label>
              <select
                style={styles.select}
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setPartId('');
                  loadParts(e.target.value);
                }}
                disabled={!clientId}
              >
                <option value="">Seleccionar proyecto...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.projectNumber} - {p.projectName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Parte</label>
              <select
                style={styles.select}
                value={partId}
                onChange={(e) => {
                  setPartId(e.target.value);
                  const part = parts.find(p => p.id === parseInt(e.target.value));
                  setTriggerInfo(prev => ({ ...prev, partName: part?.partNumber || '' }));
                }}
                disabled={!projectId}
              >
                <option value="">Seleccionar parte...</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Severidad *</label>
              <select
                style={styles.select}
                value={severityId}
                onChange={(e) => {
                  setSeverityId(e.target.value);
                  const sev = severities.find(s => s.id === parseInt(e.target.value));
                  setTriggerInfo(prev => ({
                    ...prev,
                    severityName: sev?.name || '',
                    severityColor: sev?.color || '#B00020'
                  }));
                }}
              >
                <option value="">Seleccionar severidad...</option>
                {severities.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Departamento Responsable</label>
              <select
                style={styles.select}
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  const dept = departments.find(d => d.id === parseInt(e.target.value));
                  setTriggerInfo(prev => ({ ...prev, departmentName: dept?.name || '' }));
                }}
              >
                <option value="">Seleccionar departamento...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ====== DEFECTOS ASOCIADOS ====== */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={styles.cardTitle}>
            <AlertTriangle size={20} color="#C77700" />
            {isManualMode
              ? `Defectos Asociados al QAR (${selectedDefects.length})`
              : `Defectos que Activaron la Alerta (${triggerInfo.defectCount} en ${triggerInfo.thresholdHours}h)`
            }
          </div>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: t.accent,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
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
          <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>
            <AlertTriangle size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No hay defectos asociados</p>
            <p style={{ fontSize: '13px' }}>Haz clic en "Buscar Defectos" para agregar</p>
          </div>
        ) : (
          <table style={styles.defectsTable}>
            <thead>
              <tr>
                <th style={styles.th}>Folio</th>
                <th style={styles.th}>Defecto</th>
                <th style={styles.th}>Estación</th>
                <th style={styles.th}>Inspector</th>
                <th style={styles.th}>Fecha/Hora</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {selectedDefects.map((defect, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{defect.entryNumber}</td>
                  <td style={styles.td}>{defect.defectName}</td>
                  <td style={styles.td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color={t.textDim} />
                      {defect.stationCode || defect.stationName || '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={14} color={t.textDim} />
                      {defect.inspectorFirstName ? `${defect.inspectorFirstName} ${defect.inspectorLastName || ''}`.trim() : '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color={t.textDim} />
                      {formatDate(defect.createdAt)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => removeDefect(defect.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#B00020',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ====== DETALLES ====== */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <FileText size={20} />
          Detalles de la Alerta
        </div>
        <input
          type="text"
          style={styles.input}
          placeholder="Título de la alerta..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          style={styles.textarea}
          placeholder="Descripción detallada del problema..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* ====== FOTOS (NOK izquierda, OK derecha) ====== */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Camera size={20} />
          Evidencia Fotográfica
        </div>
        <div style={styles.photoGrid}>
          {/* Photo NOK - IZQUIERDA */}
          <label style={{ ...styles.photoBox, ...styles.photoBoxNok }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload('nok', e)}
              style={{ display: 'none' }}
            />
            {photoNokPreview ? (
              <img src={photoNokPreview} alt="NOK" style={styles.photoPreview} />
            ) : (
              <>
                <X size={40} color="#B00020" />
                <p style={{ margin: '8px 0 0', color: '#B00020', fontWeight: '600' }}>
                  Foto NOK (Defecto)
                </p>
                <p style={{ margin: '4px 0 0', color: t.textDim, fontSize: '12px' }}>
                  Clic para subir
                </p>
              </>
            )}
          </label>

          {/* Photo OK - DERECHA */}
          <label style={{ ...styles.photoBox, ...styles.photoBoxOk }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload('ok', e)}
              style={{ display: 'none' }}
            />
            {photoOkPreview ? (
              <img src={photoOkPreview} alt="OK" style={styles.photoPreview} />
            ) : (
              <>
                <Check size={40} color="#22c55e" />
                <p style={{ margin: '8px 0 0', color: '#22c55e', fontWeight: '600' }}>
                  Foto OK (Referencia)
                </p>
                <p style={{ margin: '4px 0 0', color: t.textDim, fontSize: '12px' }}>
                  Clic para subir
                </p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* ====== DESTINATARIOS ====== */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Users size={20} />
          Destinatarios
        </div>

        {/* Destinatarios de Respuesta */}
        <div style={styles.recipientSection}>
          <div style={styles.recipientLabel}>
            DESTINATARIOS DE RESPUESTA ({responseRecipients.length})
            <span style={{ fontWeight: '400', marginLeft: '8px' }}>- Quienes deben resolver el problema</span>
          </div>
          <div style={styles.userGrid}>
            {users.map(user => (
              <div
                key={`resp-${user.id}`}
                style={{
                  ...styles.userCard,
                  ...(responseRecipients.includes(user.id) ? styles.userCardSelected : {})
                }}
                onClick={() => toggleRecipient('response', user.id)}
              >
                <input
                  type="checkbox"
                  checked={responseRecipients.includes(user.id)}
                  onChange={() => {}}
                  style={{ width: '16px', height: '16px' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ fontSize: '11px', color: t.textDim }}>{user.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Destinatarios de Validación - Solo usuarios autorizados */}
        <div style={styles.recipientSection}>
          <div style={styles.recipientLabel}>
            DESTINATARIOS DE VALIDACIÓN ({validationRecipients.length})
            <span style={{ fontWeight: '400', marginLeft: '8px' }}>- Quienes aprueban el cierre</span>
          </div>
          <div style={styles.userGrid}>
            {users.filter(u => u.canValidateQar).map(user => (
              <div
                key={`val-${user.id}`}
                style={{
                  ...styles.userCard,
                  ...(validationRecipients.includes(user.id) ? styles.userCardSelected : {})
                }}
                onClick={() => toggleRecipient('validation', user.id)}
              >
                <input
                  type="checkbox"
                  checked={validationRecipients.includes(user.id)}
                  onChange={() => {}}
                  style={{ width: '16px', height: '16px' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ fontSize: '11px', color: t.textDim }}>{user.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== BOTONES ====== */}
      <div style={styles.card}>
        <button
          style={{
            ...styles.submitButton,
            opacity: submitting ? 0.7 : 1
          }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Send size={20} />
          {submitting ? 'EMITIENDO QAR...' : 'EMITIR QAR'}
        </button>
        <button
          style={styles.cancelButton}
          onClick={() => navigate(-1)}
        >
          Cancelar
        </button>
      </div>

      {/* ====== MODAL BUSCAR DEFECTOS ====== */}
      {showDefectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={20} />
                Buscar y Seleccionar Defectos
              </h3>
              <button
                onClick={() => setShowDefectModal(false)}
                style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Filtros */}
            <div style={styles.modalFilters}>
              <div>
                <label style={styles.label}>Cliente</label>
                <select
                  style={styles.selectSmall}
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
                <label style={styles.label}>Desde</label>
                <input
                  type="date"
                  style={styles.selectSmall}
                  value={searchFilters.startDate}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label style={styles.label}>Hasta</label>
                <input
                  type="date"
                  style={styles.selectSmall}
                  value={searchFilters.endDate}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <button
                onClick={searchDefectsAPI}
                style={{
                  padding: '8px 16px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  alignSelf: 'flex-end',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Search size={16} />
                Buscar
              </button>
            </div>

            {/* Lista de defectos */}
            <div style={styles.modalBody}>
              {searchLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>
                  Buscando defectos...
                </div>
              ) : searchDefects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>
                  No se encontraron defectos con los filtros seleccionados
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    {/* Header row */}
                    <tr>
                      <th style={styles.thModal}>
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
                        />
                      </th>
                      <th style={styles.thModal}>Folio</th>
                      <th style={styles.thModal}>Fecha</th>
                      <th style={styles.thModal}>Parte</th>
                      <th style={styles.thModal}>Defecto</th>
                      <th style={styles.thModal}>Sev</th>
                      <th style={styles.thModal}>Estación</th>
                      <th style={styles.thModal}>Turno</th>
                      <th style={styles.thModal}>Depto</th>
                      <th style={styles.thModal}>Disp</th>
                      <th style={styles.thModal}>Inspector</th>
                      <th style={styles.thModal}>QAR</th>
                    </tr>
                    {/* Filter row */}
                    <tr style={{ backgroundColor: t.bg }}>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.entryNumber}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, entryNumber: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.partNumber}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, partNumber: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.defectName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, defectName: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.severityName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, severityName: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.stationName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, stationName: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.shiftName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, shiftName: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <select value={columnFilters.departmentId}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                          style={styles.columnFilterInput}>
                          <option value="">-</option>
                          <option value="1">Prod</option>
                          <option value="2">Cal</option>
                          <option value="3">Ing</option>
                          <option value="4">Mant</option>
                          <option value="5">Log</option>
                          <option value="6">Prov</option>
                        </select>
                      </th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.dispositionName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, dispositionName: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <input type="text" placeholder="..." value={columnFilters.inspectorName}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, inspectorName: e.target.value }))}
                          style={styles.columnFilterInput} />
                      </th>
                      <th style={{ padding: '4px' }}>
                        <select value={columnFilters.hasQar}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, hasQar: e.target.value }))}
                          style={styles.columnFilterInput}>
                          <option value="">-</option>
                          <option value="no">No</option>
                          <option value="yes">Sí</option>
                        </select>
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
                          backgroundColor: tempSelectedIds.includes(defect.id) ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                      >
                        <td style={styles.tdModal}>
                          <input
                            type="checkbox"
                            checked={tempSelectedIds.includes(defect.id)}
                            onChange={() => {}}
                          />
                        </td>
                        <td style={{ ...styles.tdModal, fontWeight: '600', color: '#60a5fa' }}>{defect.entryNumber}</td>
                        <td style={styles.tdModal}>{formatDate(defect.capturedAt || defect.createdAt)}</td>
                        <td style={styles.tdModal}>{defect.partNumber || '-'}</td>
                        <td style={styles.tdModal}>{defect.defectName || '-'}</td>
                        <td style={styles.tdModal}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            backgroundColor: defect.severityColor || '#6b7280',
                            color: 'white'
                          }}>
                            {defect.severityCode || defect.severityName || '-'}
                          </span>
                        </td>
                        <td style={styles.tdModal}>{defect.stationName || '-'}</td>
                        <td style={styles.tdModal}>{defect.shiftCode || defect.shiftName || '-'}</td>
                        <td style={styles.tdModal}>{defect.departmentId ? getDepartmentName(defect.departmentId) : '-'}</td>
                        <td style={styles.tdModal}>{defect.dispositionCode || defect.dispositionName || '-'}</td>
                        <td style={styles.tdModal}>
                          {defect.inspectorFirstName ? `${defect.inspectorFirstName} ${defect.inspectorLastName || ''}`.trim() : '-'}
                        </td>
                        <td style={styles.tdModal}>
                          {defect.hasQar ? (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600', backgroundColor: '#22c55e', color: 'white' }}>
                              {defect.qarNumber || 'Sí'}
                            </span>
                          ) : (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600', backgroundColor: '#C77700', color: 'white' }}>
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <span style={{ color: t.textDim }}>
                {tempSelectedIds.length} seleccionado(s) de {filteredSearchDefects.length} mostrados ({searchDefects.length} total)
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDefectModal(false)}
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
                  onClick={confirmDefectSelection}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  Agregar Seleccionados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QARCreate;
