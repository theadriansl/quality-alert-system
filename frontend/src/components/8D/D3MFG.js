import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCurrentUser, isUserAdmin } from '../../utils/permissions';

const D3MFG = ({ data, onDataUpdate, language = 'es', isBlocked = false, isReadOnly = false }) => {
  const { theme: themeColors } = useTheme();
  useLanguage(); // mantener hook activo
  const { showSuccess, showError, showWarning } = useToast();
  const [formData, setFormData] = useState({
    d3MfgTemporaryControls: [],
    d3MfgInspectionPoints: [],
    d3MfgParametersAdjusted: [],
    d3MfgPokaYokeDevices: [],
    d3MfgLineModifications: [],      // Changed from string to array
    d3MfgOperatorTraining: [],       // Changed from string to array
    d3MfgEffectivenessValidation: [], // Changed from string to array
    d3MfgOthers: [],                 // New section for other containment actions
    d3MfgResponsibleUserIds: [], // Changed to array to support multiple people
    d3MfgImplementationDate: new Date().toISOString().split('T')[0], // Default to today (immediate actions)
    d3MfgCompleted: false
  });

  const [expandedSections, setExpandedSections] = useState({
    controls: true,
    inspections: true,
    parameters: true,
    pokaYoke: true
  });

  const [users, setUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(null); // {type, index}
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Flag to prevent auto-save on initial load

  // Distribution lists states
  const [distributionLists, setDistributionLists] = useState([]);
  const [showSaveListModal, setShowSaveListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  // Full approval history from audit log
  const [d3MfgApprovalHistory, setD3MfgApprovalHistory] = useState([]);

  // Revert to draft modal state (Admin only)
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertComments, setRevertComments] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  // Approval history state (similar to D5)
  const [approvalHistory, setApprovalHistory] = useState({
    approval1: {
      status: data?.d3MfgApproval1Status || data?.d3_mfg_approval_1_status,
      by: data?.d3MfgApproval1By || data?.d3_mfg_approval_1_by,
      at: data?.d3MfgApproval1At || data?.d3_mfg_approval_1_at,
      comments: data?.d3MfgApproval1Comments || data?.d3_mfg_approval_1_comments
    },
    approval2: {
      status: data?.d3MfgApproval2Status || data?.d3_mfg_approval_2_status,
      by: data?.d3MfgApproval2By || data?.d3_mfg_approval_2_by,
      at: data?.d3MfgApproval2At || data?.d3_mfg_approval_2_at,
      comments: data?.d3MfgApproval2Comments || data?.d3_mfg_approval_2_comments
    },
    approval3: {
      status: data?.d3MfgApproval3Status || data?.d3_mfg_approval_3_status,
      by: data?.d3MfgApproval3By || data?.d3_mfg_approval_3_by,
      at: data?.d3MfgApproval3At || data?.d3_mfg_approval_3_at,
      comments: data?.d3MfgApproval3Comments || data?.d3_mfg_approval_3_comments
    }
  });

  // Get current user from centralized utility
  const currentUser = getCurrentUser();
  const isAdmin = isUserAdmin(currentUser);

  // Determine if current user is the approver for current step
  const isCurrentApprover = () => {
    // Admins can approve anything
    if (isAdmin) return true;
    if (!data || !data.escalationPath || !data.escalationPath.countermeasure_users) {
      return false;
    }

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const effectiveStep = (data.d3MfgStatus === 'under_review' && data.d3MfgCurrentApprovalStep === 0)
      ? 1
      : (data.d3MfgCurrentApprovalStep || 0);

    if (effectiveStep < 1 || effectiveStep > 3) {
      return false; // Not in approval stage
    }

    const countermeasureUsers = data.escalationPath.countermeasure_users;
    const expectedApproverId = countermeasureUsers[effectiveStep];

    return currentUser.id === expectedApproverId;
  };

  // Determine if in approval state (waiting for approvers)
  const isInApprovalState = () => {
    const currentStep = data?.d3MfgCurrentApprovalStep || 0;
    return currentStep >= 1 && currentStep <= 3;
  };

  // Check if current user is the primary responsible
  const isPrimaryUser = () => {
    if (!data || !data.escalationPath || !data.escalationPath.countermeasure_users) {
      return false;
    }
    const countermeasureUsers = data.escalationPath.countermeasure_users;
    const primaryUserId = countermeasureUsers[0];
    return currentUser.id === primaryUserId;
  };

  // Determine if form should be blocked for editing
  // Block when:
  // 1. Status is 'under_review' or 'approved'
  // 2. OR current user is NOT the primary responsible (only primary can edit in draft mode)
  // Admins can ALWAYS edit
  const isFormBlocked = isAdmin ? false : (
    data?.d3MfgStatus === 'under_review' ||
    data?.d3MfgStatus === 'approved' ||
    (data?.d3MfgCurrentApprovalStep >= 1 && data?.d3MfgCurrentApprovalStep <= 3) ||
    data?.d3MfgCurrentApprovalStep === 4 ||
    !isPrimaryUser() // Block if user is not primary responsible
  );

  // Get current user in process (for approval status display) - memoized to update when users load
  const currentUserInProcess = useMemo(() => {
    if (!data || !data.escalationPath || !data.escalationPath.countermeasure_users) {
      return null;
    }

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const effectiveStep = (data.d3MfgStatus === 'under_review' && data.d3MfgCurrentApprovalStep === 0)
      ? 1
      : (data.d3MfgCurrentApprovalStep || 0);

    const countermeasureUsers = data.escalationPath.countermeasure_users;

    if (effectiveStep === 0) {
      // Primary is working
      const primaryUserId = countermeasureUsers[0];
      const user = users.find(u => u.id === primaryUserId);
      return user ? (user.name || user.email || `Usuario ID: ${primaryUserId}`) : `Usuario ID: ${primaryUserId}`;
    } else if (effectiveStep >= 1 && effectiveStep <= 3) {
      // Approver is working
      const approverId = countermeasureUsers[effectiveStep];
      const user = users.find(u => u.id === approverId);
      return user ? (user.name || user.email || `Usuario ID: ${approverId}`) : `Usuario ID: ${approverId}`;
    } else if (effectiveStep === 4) {
      return 'Completado';
    }

    return null;
  }, [users, data]);

  // Load users list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/users/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        setUsers(result.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Load D3-MFG approval history from audit log
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      if (!data?.id) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/audit-log?actionCategory=approval&sectionName=d3_mfg`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const result = await response.json();
        if (result.success) {
          setD3MfgApprovalHistory(result.auditLog || []);
        }
      } catch (error) {
        console.error('Error loading D3-MFG approval history:', error);
      }
    };
    fetchApprovalHistory();
  }, [data?.id]);

  // Load distribution lists
  useEffect(() => {
    const fetchDistributionLists = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/distribution-lists', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        setDistributionLists(result || []);
      } catch (error) {
        console.error('Error fetching distribution lists:', error);
      }
    };
    fetchDistributionLists();
  }, []);

  // Load existing data
  // Normalize evidence URLs from relative to absolute (for legacy data)
  const normalizeEvidenceUrls = (items) => {
    if (!Array.isArray(items)) return items || [];
    return items.map(item => ({
      ...item,
      evidence: (item.evidence || []).map(ev => ({
        ...ev,
        url: ev.url && !ev.url.startsWith('http') ? `http://localhost:5000${ev.url}` : (ev.url || '')
      }))
    }));
  };

  useEffect(() => {
    if (data && isInitialLoad) {
      setFormData({
        d3MfgTemporaryControls: normalizeEvidenceUrls(data.d3MfgTemporaryControls),
        d3MfgInspectionPoints: normalizeEvidenceUrls(data.d3MfgInspectionPoints),
        d3MfgParametersAdjusted: normalizeEvidenceUrls(data.d3MfgParametersAdjusted),
        d3MfgPokaYokeDevices: normalizeEvidenceUrls(data.d3MfgPokaYokeDevices),
        d3MfgLineModifications: normalizeEvidenceUrls(data.d3MfgLineModifications),
        d3MfgOperatorTraining: normalizeEvidenceUrls(data.d3MfgOperatorTraining),
        d3MfgEffectivenessValidation: normalizeEvidenceUrls(data.d3MfgEffectivenessValidation),
        d3MfgOthers: normalizeEvidenceUrls(data.d3MfgOthers),                           // New section
        // Support both new array format and old single user format for backward compatibility
        d3MfgResponsibleUserIds: data.d3MfgResponsibleUserIds ||
                                  (data.d3MfgResponsibleUserId ? [data.d3MfgResponsibleUserId] : []),
        // Default to today's date if not set (handle null, undefined, or empty string)
        d3MfgImplementationDate: (data.d3MfgImplementationDate && data.d3MfgImplementationDate.trim() !== '')
                                  ? data.d3MfgImplementationDate
                                  : new Date().toISOString().split('T')[0],
        d3MfgCompleted: data.d3MfgCompleted || false
      });

      // Mark initial load as complete after data is loaded
      setIsInitialLoad(false);
    }
  }, [data]);

  // Update approval history when data changes
  useEffect(() => {
    if (data) {
      setApprovalHistory({
        approval1: {
          status: data?.d3MfgApproval1Status || data?.d3_mfg_approval_1_status,
          by: data?.d3MfgApproval1By || data?.d3_mfg_approval_1_by,
          at: data?.d3MfgApproval1At || data?.d3_mfg_approval_1_at,
          comments: data?.d3MfgApproval1Comments || data?.d3_mfg_approval_1_comments
        },
        approval2: {
          status: data?.d3MfgApproval2Status || data?.d3_mfg_approval_2_status,
          by: data?.d3MfgApproval2By || data?.d3_mfg_approval_2_by,
          at: data?.d3MfgApproval2At || data?.d3_mfg_approval_2_at,
          comments: data?.d3MfgApproval2Comments || data?.d3_mfg_approval_2_comments
        },
        approval3: {
          status: data?.d3MfgApproval3Status || data?.d3_mfg_approval_3_status,
          by: data?.d3MfgApproval3By || data?.d3_mfg_approval_3_by,
          at: data?.d3MfgApproval3At || data?.d3_mfg_approval_3_at,
          comments: data?.d3MfgApproval3Comments || data?.d3_mfg_approval_3_comments
        }
      });
    }
  }, [data]);

  const translations = {
    en: {
      title: 'D3-MFG (Immediate Actions)',
      subtitle: 'Stage 1 - Temporary actions implemented to contain the problem immediately',
      involvedPeople: 'People Involved in the Event',
      involvedPeopleDesc: 'Group leaders, shift supervisors, and other personnel involved',
      selectUser: 'Select person...',
      addPerson: 'Add Person',
      implementationDate: 'Implementation Date',
      temporaryControls: 'Temporary Process Controls',
      temporaryControlsDesc: 'What controls were added to the production line?',
      addControl: 'Add Control',
      controlDescription: 'Control description',
      inspectionPoints: 'Inspection Points Added',
      inspectionPointsDesc: 'Where were inspection points added?',
      addInspection: 'Add Inspection Point',
      location: 'Location',
      whatToCheck: 'What to Check',
      frequency: 'Frequency',
      parametersAdjusted: 'Process Parameters Adjusted',
      parametersDesc: 'What parameters were changed temporarily?',
      addParameter: 'Add Parameter',
      parameterName: 'Parameter Name',
      fromValue: 'From',
      toValue: 'To',
      reason: 'Reason',
      pokaYokeDevices: 'Poka-Yoke Devices',
      pokaYokeDesc: 'Error-proofing devices installed temporarily',
      addDevice: 'Add Device',
      deviceName: 'Device Name',
      purpose: 'Purpose',
      lineModifications: 'Line Modifications',
      lineModificationsDesc: 'Physical changes to production line (layout, stations, etc.)',
      operatorTraining: 'Operator Training',
      operatorTrainingDesc: 'Training provided to operators',
      effectivenessValidation: 'Effectiveness Validation',
      effectivenessValidationDesc: 'Evidence that controls are working (e.g., "0 defects in 100 pieces")',
      others: 'Others',
      othersDesc: 'Other containment actions not covered in previous categories',
      markCompleted: 'Mark Immediate Actions as Completed',
      mustMarkComplete: 'You must mark Immediate Actions as complete before sending to approval',
      saveDraft: 'Save Draft',
      sendToApproval: 'Send to Approval',
      save: 'Save Immediate Actions',
      saving: 'Saving...',
      sending: 'Sending...',
      remove: 'Remove',
      blocked: ' Blocked',
      blockedMessage: 'Immediate Actions can only be edited by Countermeasure responsible users or Administrators.',
      confirmSendToApproval: 'Are you sure you want to send Immediate Actions for approval? Once sent, you will not be able to edit until it is approved or rejected.',
      comments: 'Comments',
      addEvidence: 'Add Evidence / Visual Aid',
      collapse: 'Collapse',
      expand: 'Expand',
      loadList: 'Load Distribution List',
      saveList: 'Save as List',
      selectList: 'Select a list...',
      listName: 'List Name',
      listDescription: 'Description (optional)',
      saveListButton: 'Save List',
      cancel: 'Cancel'
    },
    es: {
      title: 'D3-MFG (Acciones Inmediatas)',
      subtitle: 'Etapa 1 - Acciones temporales implementadas para contener el problema de forma inmediata',
      involvedPeople: 'Personas Involucradas en el Evento',
      involvedPeopleDesc: 'Jefes de grupo, líderes de turno y demás personal involucrado',
      selectUser: 'Seleccionar persona...',
      addPerson: 'Agregar Persona',
      implementationDate: 'Fecha de Implementación',
      temporaryControls: 'Controles Temporales del Proceso',
      temporaryControlsDesc: '¿Qué controles se agregaron a la línea de producción?',
      addControl: 'Agregar Control',
      controlDescription: 'Descripción del control',
      inspectionPoints: 'Puntos de Inspección Agregados',
      inspectionPointsDesc: '¿Dónde se agregaron puntos de inspección?',
      addInspection: 'Agregar Punto de Inspección',
      location: 'Ubicación',
      whatToCheck: 'Qué Verificar',
      frequency: 'Frecuencia',
      parametersAdjusted: 'Parámetros del Proceso Ajustados',
      parametersDesc: '¿Qué parámetros se cambiaron temporalmente?',
      addParameter: 'Agregar Parámetro',
      parameterName: 'Nombre del Parámetro',
      fromValue: 'Valor Anterior',
      toValue: 'Valor Nuevo',
      reason: 'Razón',
      pokaYokeDevices: 'Dispositivos Poka-Yoke',
      pokaYokeDesc: 'Dispositivos a prueba de errores instalados temporalmente',
      addDevice: 'Agregar Dispositivo',
      deviceName: 'Nombre del Dispositivo',
      purpose: 'Propósito',
      lineModifications: 'Modificaciones a la Línea',
      lineModificationsDesc: 'Cambios físicos a la línea de producción (layout, estaciones, etc.)',
      operatorTraining: 'Entrenamiento de Operadores',
      operatorTrainingDesc: 'Entrenamiento proporcionado a los operadores',
      effectivenessValidation: 'Validación de Efectividad',
      effectivenessValidationDesc: 'Evidencia de que los controles funcionan (ej: "0 defectos en 100 piezas")',
      others: 'Otros',
      othersDesc: 'Otras acciones de contención no cubiertas en las categorías anteriores',
      markCompleted: 'Marcar Acciones Inmediatas como Completadas',
      mustMarkComplete: 'Debes marcar Acciones Inmediatas como completadas antes de enviar a aprobación',
      saveDraft: 'Guardar Borrador',
      sendToApproval: 'Enviar a Aprobación',
      save: 'Guardar Acciones Inmediatas',
      saving: 'Guardando...',
      sending: 'Enviando...',
      remove: 'Eliminar',
      blocked: ' Bloqueado',
      blockedMessage: 'Acciones Inmediatas solo pueden ser editadas por usuarios responsables de Contramedidas o Administradores.',
      confirmSendToApproval: '¿Estás seguro de enviar Acciones Inmediatas a aprobación? Una vez enviada, no podrás editar hasta que sea aprobada o rechazada.',
      comments: 'Comentarios',
      addEvidence: 'Agregar Evidencia / Ayuda Visual',
      collapse: 'Contraer',
      expand: 'Expandir',
      loadList: 'Cargar Lista de Distribución',
      saveList: 'Guardar como Lista',
      selectList: 'Seleccionar una lista...',
      listName: 'Nombre de la Lista',
      listDescription: 'Descripción (opcional)',
      saveListButton: 'Guardar Lista',
      cancel: 'Cancelar'
    }
  };

  const t = (key) => translations[language][key] || key;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onDataUpdate(formData);
      showSuccess(t('save') + ' ');
    } catch (error) {
      console.error('Error saving D3-MFG:', error);
      showError('Error al guardar D3-MFG');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to open mailto with email notification data
  const openMailtoFromNotification = (emailNotification) => {
    if (!emailNotification || !emailNotification.recipients || emailNotification.recipients.length === 0) {
      return;
    }

    // Usar punto y coma para compatibilidad con Outlook
    const emailList = emailNotification.recipients.map(r => r.email).join(';');
    const isApprovalRequest = emailNotification.type === 'approval_request';
    const isStageApproved = emailNotification.type === 'stage_approved';
    const isRejection = emailNotification.type === 'rejection';

    let bodyText = '';
    if (isApprovalRequest) {
      bodyText = `Estimado(a),\n\n` +
        `Se requiere su aprobacion para la etapa ${emailNotification.stage} del siguiente reporte 8D:\n\n` +
        `Reporte: ${emailNotification.reportId}\n` +
        `Titulo: ${emailNotification.title}\n` +
        `Proveedor/Cliente: ${emailNotification.supplier || 'N/A'}\n` +
        `Paso de aprobacion: ${emailNotification.approvalStep}\n\n` +
        `Por favor ingrese al sistema para revisar y aprobar:\n` +
        `http://localhost:3000/8d-workflow?reportId=${emailNotification.reportId}&mode=edit\n\n` +
        `Saludos,\nSistema de Calidad`;
    } else if (isStageApproved) {
      bodyText = `Estimados,\n\n` +
        `${emailNotification.message}\n\n` +
        `Reporte: ${emailNotification.reportId}\n` +
        `Titulo: ${emailNotification.title}\n` +
        `Proveedor/Cliente: ${emailNotification.supplier || 'N/A'}\n\n` +
        `Pueden consultar los detalles en el sistema:\n` +
        `http://localhost:3000/8d-workflow?reportId=${emailNotification.reportId}&mode=edit\n\n` +
        `Saludos,\nSistema de Calidad`;
    } else if (isRejection) {
      bodyText = `Estimado(a),\n\n` +
        `La etapa ${emailNotification.stage} del siguiente reporte 8D ha sido RECHAZADA:\n\n` +
        `Reporte: ${emailNotification.reportId}\n` +
        `Titulo: ${emailNotification.title}\n` +
        `Proveedor/Cliente: ${emailNotification.supplier || 'N/A'}\n\n` +
        `MOTIVO DEL RECHAZO:\n` +
        `${emailNotification.rejectionComments || 'Sin comentarios'}\n\n` +
        `Por favor realice las correcciones necesarias y vuelva a enviar a aprobacion:\n` +
        `http://localhost:3000/8d-workflow?reportId=${emailNotification.reportId}&mode=edit\n\n` +
        `Saludos,\nSistema de Calidad`;
    }

    const mailtoUrl = `mailto:${emailList}?subject=${encodeURIComponent(emailNotification.subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
  };

  const handleSendToApproval = async () => {
    if (isFormBlocked) {
      showWarning(' No tienes autorización para enviar a aprobación');
      return;
    }

    // Validate required fields
    if (!formData.d3MfgImplementationDate || formData.d3MfgImplementationDate.trim() === '') {
      showWarning(' La Fecha de Implementación es obligatoria');
      return;
    }

    if (formData.d3MfgResponsibleUserIds.length === 0) {
      showWarning(' Debes seleccionar al menos una persona involucrada');
      return;
    }

    // Check if D3-MFG is marked as complete
    if (!formData.d3MfgCompleted) {
      showWarning(` ${t('mustMarkComplete')}`);
      return;
    }

    // Confirm before sending to approval
    if (!window.confirm(t('confirmSendToApproval'))) {
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Save form data (without approval fields)
      await onDataUpdate(formData);

      // Step 2: Send to approval via dedicated endpoint
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/d3-mfg/send-to-approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Abrir mailto: para notificar al aprobador
      if (result.emailNotification) {
        openMailtoFromNotification(result.emailNotification);
      }

      showSuccess(' Acciones Inmediatas enviadas a aprobación exitosamente');
      // Reload page to reflect new approval state
      window.location.reload();
    } catch (error) {
      console.error('Error sending to approval:', error);
      showError(' Error al enviar a aprobación');
    } finally {
      setIsSending(false);
    }
  };
  // Handle approval/rejection
  const handleApprove = async () => {
    const confirmMessage = language === 'es'
      ? '¿Está seguro que desea APROBAR esta sección?'
      : 'Are you sure you want to APPROVE this section?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/d3-mfg/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'approve', comments: '' })
      });

      const result = await response.json();

      if (result.success) {
        // Abrir mailto si hay notificación de email
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' Sección aprobada exitosamente');
        window.location.reload();
      } else {
        showError(' Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error approving:', error);
      showError(' Error al aprobar');
    }
  };

  const handleReject = async () => {
    const comments = prompt(
      language === 'es'
        ? 'RECHAZO - Por favor ingrese el motivo (obligatorio):'
        : 'REJECT - Please enter the reason (required):'
    );

    if (!comments || comments.trim() === '') {
      showWarning(language === 'es' ? ' El comentario es obligatorio para rechazar' : ' Comments are required to reject');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/d3-mfg/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reject', comments })
      });

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al responsable del rechazo
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' Sección rechazada. El responsable deberá corregir.');
        window.location.reload();
      } else {
        showError(' Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      showError(' Error al rechazar');
    }
  };

  // Handle revert to draft (Admin only) - Creates new revision
  const handleRevertToDraft = async () => {
    if (!revertComments || revertComments.trim() === '') {
      showWarning(language === 'es' ? 'El comentario es obligatorio' : 'Comments are required');
      return;
    }

    // Confirm action - this will archive current document and create new revision
    const confirmMsg = language === 'es'
      ? '⚠️ ATENCIÓN: Esta acción archivará el documento actual y creará una NUEVA REVISIÓN editable.\n\nEl documento actual quedará bloqueado como referencia histórica.\n\n¿Desea continuar?'
      : '⚠️ WARNING: This action will archive the current document and create a NEW REVISION.\n\nThe current document will be locked as historical reference.\n\nDo you want to continue?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsReverting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/revert-to-draft`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments: revertComments })
      });

      const result = await response.json();

      if (result.success) {
        const newRevisionId = result.data.newRevision.reportId;
        const newDbId = result.data.newRevision.id;
        showSuccess(language === 'es'
          ? `Documento archivado. Nueva revisión ${newRevisionId} creada.`
          : `Document archived. New revision ${newRevisionId} created.`);
        setShowRevertModal(false);
        setRevertComments('');
        // Redirect to new revision
        window.location.href = `/8d-workflow?reportId=${newDbId}`;
      } else {
        showError('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showError(language === 'es' ? 'Error al revertir a borrador' : 'Error reverting to draft');
    } finally {
      setIsReverting(false);
    }
  };

  // Handlers for array fields
  const addTemporaryControl = () => {
    setFormData({
      ...formData,
      d3MfgTemporaryControls: [
        ...formData.d3MfgTemporaryControls,
        { description: '', comments: '', evidence: [] }
      ]
    });
  };

  const updateTemporaryControl = (index, field, value) => {
    const updated = [...formData.d3MfgTemporaryControls];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgTemporaryControls: updated });
  };

  const removeTemporaryControl = (index) => {
    const updated = formData.d3MfgTemporaryControls.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgTemporaryControls: updated });
  };

  const addInspectionPoint = () => {
    setFormData({
      ...formData,
      d3MfgInspectionPoints: [
        ...formData.d3MfgInspectionPoints,
        { location: '', what: '', frequency: '', comments: '', evidence: [] }
      ]
    });
  };

  const updateInspectionPoint = (index, field, value) => {
    const updated = [...formData.d3MfgInspectionPoints];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgInspectionPoints: updated });
  };

  const removeInspectionPoint = (index) => {
    const updated = formData.d3MfgInspectionPoints.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgInspectionPoints: updated });
  };

  const addParameter = () => {
    setFormData({
      ...formData,
      d3MfgParametersAdjusted: [
        ...formData.d3MfgParametersAdjusted,
        { parameter: '', from: '', to: '', reason: '', comments: '', evidence: [] }
      ]
    });
  };

  const updateParameter = (index, field, value) => {
    const updated = [...formData.d3MfgParametersAdjusted];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgParametersAdjusted: updated });
  };

  const removeParameter = (index) => {
    const updated = formData.d3MfgParametersAdjusted.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgParametersAdjusted: updated });
  };

  const addPokaYokeDevice = () => {
    setFormData({
      ...formData,
      d3MfgPokaYokeDevices: [
        ...formData.d3MfgPokaYokeDevices,
        { device: '', location: '', purpose: '', comments: '', evidence: [] }
      ]
    });
  };

  const updatePokaYokeDevice = (index, field, value) => {
    const updated = [...formData.d3MfgPokaYokeDevices];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgPokaYokeDevices: updated });
  };

  const removePokaYokeDevice = (index) => {
    const updated = formData.d3MfgPokaYokeDevices.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgPokaYokeDevices: updated });
  };

  // Handlers for Line Modifications
  const addLineModification = () => {
    setFormData({
      ...formData,
      d3MfgLineModifications: [
        ...formData.d3MfgLineModifications,
        {
          lineName: '',              // Nombre de Línea
          location: '',              // Ubicación
          modificationType: '',      // Tipo de Modificación
          previousCondition: '',     // Condición Anterior
          newCondition: '',          // Condición Nueva
          comments: '',              // Comentarios
          evidence: []               // Evidencias
        }
      ]
    });
  };

  const updateLineModification = (index, field, value) => {
    const updated = [...formData.d3MfgLineModifications];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgLineModifications: updated });
  };

  const removeLineModification = (index) => {
    const updated = formData.d3MfgLineModifications.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgLineModifications: updated });
  };

  // Handlers for Operator Training
  const addOperatorTraining = () => {
    setFormData({
      ...formData,
      d3MfgOperatorTraining: [
        ...formData.d3MfgOperatorTraining,
        { description: '', comments: '', evidence: [] }
      ]
    });
  };

  const updateOperatorTraining = (index, field, value) => {
    const updated = [...formData.d3MfgOperatorTraining];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgOperatorTraining: updated });
  };

  const removeOperatorTraining = (index) => {
    const updated = formData.d3MfgOperatorTraining.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgOperatorTraining: updated });
  };

  // Handlers for Effectiveness Validation
  const addEffectivenessValidation = () => {
    setFormData({
      ...formData,
      d3MfgEffectivenessValidation: [
        ...formData.d3MfgEffectivenessValidation,
        { description: '', comments: '', evidence: [] }
      ]
    });
  };

  const updateEffectivenessValidation = (index, field, value) => {
    const updated = [...formData.d3MfgEffectivenessValidation];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgEffectivenessValidation: updated });
  };

  const removeEffectivenessValidation = (index) => {
    const updated = formData.d3MfgEffectivenessValidation.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgEffectivenessValidation: updated });
  };

  // Handlers for Others
  const addOther = () => {
    setFormData({
      ...formData,
      d3MfgOthers: [...formData.d3MfgOthers, { description: '', comments: '', evidence: [] }]
    });
  };

  const updateOther = (index, field, value) => {
    const updated = [...formData.d3MfgOthers];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, d3MfgOthers: updated });
  };

  const removeOther = (index) => {
    const updated = formData.d3MfgOthers.filter((_, i) => i !== index);
    setFormData({ ...formData, d3MfgOthers: updated });
  };

  // Handlers for responsible users
  // CONGELAMIENTO DE USUARIOS: Guardar {id, name} para preservar datos históricos
  const addResponsibleUser = (userId) => {
    const userIdInt = parseInt(userId);
    if (!userId) return;

    // Verificar si ya existe (compatible con formato antiguo y nuevo)
    const alreadyExists = formData.d3MfgResponsibleUserIds.some(item =>
      typeof item === 'object' ? item.id === userIdInt : item === userIdInt
    );
    if (alreadyExists) return;

    const user = users.find(u => u.id === userIdInt);
    const userData = user
      ? { id: userIdInt, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Usuario ${userIdInt}` }
      : { id: userIdInt, name: `Usuario ${userIdInt}` };

    setFormData({
      ...formData,
      d3MfgResponsibleUserIds: [...formData.d3MfgResponsibleUserIds, userData]
    });
  };

  const removeResponsibleUser = (userIdOrItem) => {
    const userId = typeof userIdOrItem === 'object' ? userIdOrItem.id : userIdOrItem;
    setFormData({
      ...formData,
      d3MfgResponsibleUserIds: formData.d3MfgResponsibleUserIds.filter(item =>
        typeof item === 'object' ? item.id !== userId : item !== userId
      )
    });
  };

  // Helper para obtener ID de usuario (compatible con ambos formatos)
  const getUserIdFromItem = (item) => typeof item === 'object' ? item.id : item;

  // Handlers for distribution lists
  // CONGELAMIENTO: Convertir IDs a objetos {id, name} al cargar lista
  const loadDistributionList = (listId) => {
    const list = distributionLists.find(l => l.id === parseInt(listId));
    if (list && list.user_ids) {
      const usersWithNames = list.user_ids.map(userId => {
        const user = users.find(u => u.id === userId);
        return user
          ? { id: userId, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Usuario ${userId}` }
          : { id: userId, name: `Usuario ${userId}` };
      });
      setFormData({
        ...formData,
        d3MfgResponsibleUserIds: usersWithNames
      });
    }
  };

  const saveAsDistributionList = async () => {
    if (!newListName.trim()) {
      showWarning('Por favor ingresa un nombre para la lista');
      return;
    }

    if (formData.d3MfgResponsibleUserIds.length === 0) {
      showWarning('Por favor selecciona al menos un usuario antes de guardar la lista');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/distribution-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || null,
          // Extraer solo IDs para guardar en lista de distribución
          user_ids: formData.d3MfgResponsibleUserIds.map(item =>
            typeof item === 'object' ? item.id : item
          )
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar la lista');
      }

      const newList = await response.json();
      setDistributionLists([...distributionLists, newList]);
      setShowSaveListModal(false);
      setNewListName('');
      setNewListDescription('');
      showSuccess(' Lista de distribución guardada exitosamente');
    } catch (error) {
      console.error('Error saving distribution list:', error);
      showError(` Error: ${error.message}`);
    }
  };

  // Generate mailto link for email notification
  const generateEmailNotification = () => {
    if (formData.d3MfgResponsibleUserIds.length === 0) {
      showWarning('No hay usuarios seleccionados en la lista de distribución');
      return;
    }

    // Get emails from selected users (compatible con formato nuevo y antiguo)
    const emails = formData.d3MfgResponsibleUserIds
      .map(item => {
        const userId = typeof item === 'object' ? item.id : item;
        const user = users.find(u => u.id === userId);
        return user?.email;
      })
      .filter(Boolean)
      .join(';');

    if (!emails) {
      showWarning('Los usuarios seleccionados no tienen emails configurados');
      return;
    }

    // Build email content
    const reportId = data?.id || 'N/A';
    const reportUrl = `${window.location.origin}/8d-workflow?reportId=${reportId}`;

    const subject = ` Alerta de Calidad - Acción Inmediata Requerida (Reporte #${reportId})`;

    const body = `Estimado equipo,

Se ha aprobado una Acción Inmediata de Contención (D3-MFG) que requiere su atención.

 INFORMACIÓN DEL REPORTE:
- Reporte 8D: #${reportId}
- Cliente: ${data?.clientName || 'N/A'}
- Parte: ${data?.partNumber || 'N/A'}
- Descripción: ${data?.problemDescription || 'N/A'}

 ACCIÓN REQUERIDA:
Por favor revise las acciones inmediatas implementadas y tome las medidas necesarias.

 VER REPORTE COMPLETO:
${reportUrl}

---
Este es un mensaje automático del Sistema de Alertas de Calidad.
Por favor no responda a este correo.`;

    // Create mailto link
    const mailtoLink = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open email client
    window.location.href = mailtoLink;
  };

  // Handlers for evidence upload
  const handleEvidenceUpload = async (file, type, index) => {
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      setUploadingEvidence({ type, index });

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/upload/evidence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      const rawUrl = result.url || result.path || '';
      const fileInfo = {
        name: file.name,
        url: rawUrl.startsWith('http') ? rawUrl : `http://localhost:5000${rawUrl}`,
        uploadedAt: new Date().toISOString()
      };

      // Add evidence to the appropriate item
      let updated;
      switch (type) {
        case 'control':
          updated = [...formData.d3MfgTemporaryControls];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgTemporaryControls: updated });
          break;
        case 'inspection':
          updated = [...formData.d3MfgInspectionPoints];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgInspectionPoints: updated });
          break;
        case 'parameter':
          updated = [...formData.d3MfgParametersAdjusted];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgParametersAdjusted: updated });
          break;
        case 'pokaYoke':
          updated = [...formData.d3MfgPokaYokeDevices];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgPokaYokeDevices: updated });
          break;
        case 'lineModification':
          updated = [...formData.d3MfgLineModifications];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgLineModifications: updated });
          break;
        case 'operatorTraining':
          updated = [...formData.d3MfgOperatorTraining];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgOperatorTraining: updated });
          break;
        case 'effectivenessValidation':
          updated = [...formData.d3MfgEffectivenessValidation];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgEffectivenessValidation: updated });
          break;
        case 'others':
          updated = [...formData.d3MfgOthers];
          updated[index].evidence = [...(updated[index].evidence || []), fileInfo];
          setFormData({ ...formData, d3MfgOthers: updated });
          break;
        default:
          break;
      }

      // Log file upload to audit log
      try {
        const token = localStorage.getItem('token');
        const reportId = data?.id;
        if (reportId) {
          await fetch(`http://localhost:5000/8d/reports/${reportId}/audit-log`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              actionType: 'file_uploaded',
              actionCategory: 'section',
              sectionName: 'd3_mfg',
              userName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'Sistema',
              description: `Archivo subido en D3-MFG: ${file.name}`,
              newValue: { fileName: file.name, fileType: file.type }
            })
          });
        }
      } catch (logError) {
        console.error('Error logging file upload:', logError);
      }

      showSuccess(' Evidencia subida exitosamente');
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError(' Error al subir evidencia');
    } finally {
      setUploadingEvidence(null);
    }
  };

  const removeEvidence = (type, itemIndex, evidenceIndex) => {
    let updated;
    switch (type) {
      case 'control':
        updated = [...formData.d3MfgTemporaryControls];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgTemporaryControls: updated });
        break;
      case 'inspection':
        updated = [...formData.d3MfgInspectionPoints];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgInspectionPoints: updated });
        break;
      case 'parameter':
        updated = [...formData.d3MfgParametersAdjusted];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgParametersAdjusted: updated });
        break;
      case 'pokaYoke':
        updated = [...formData.d3MfgPokaYokeDevices];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgPokaYokeDevices: updated });
        break;
      case 'lineModification':
        updated = [...formData.d3MfgLineModifications];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgLineModifications: updated });
        break;
      case 'operatorTraining':
        updated = [...formData.d3MfgOperatorTraining];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgOperatorTraining: updated });
        break;
      case 'effectivenessValidation':
        updated = [...formData.d3MfgEffectivenessValidation];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgEffectivenessValidation: updated });
        break;
      case 'others':
        updated = [...formData.d3MfgOthers];
        updated[itemIndex].evidence = updated[itemIndex].evidence.filter((_, i) => i !== evidenceIndex);
        setFormData({ ...formData, d3MfgOthers: updated });
        break;
      default:
        break;
    }
  };

  const styles = {
    container: {
      padding: '24px',
      backgroundColor: themeColors.bg,
      borderRadius: '8px',
      marginBottom: '24px',
      border: `2px solid ${themeColors.accent}`
    },
    header: {
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: `2px solid ${themeColors.accent}`
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: themeColors.accent,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    subtitle: {
      fontSize: '14px',
      color: themeColors.textMuted,
      fontStyle: 'italic'
    },
    section: {
      marginBottom: '32px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: '8px'
    },
    sectionDesc: {
      fontSize: '14px',
      color: themeColors.textMuted,
      marginBottom: '16px',
      fontStyle: 'italic'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: themeColors.text,
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      boxSizing: 'border-box',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text
    },
    select: {
      width: '100%',
      padding: '12px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text
    },
    button: {
      padding: '12px 24px',
      backgroundColor: themeColors.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginRight: '12px'
    },
    addButton: {
      padding: '8px 16px',
      backgroundColor: themeColors.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      marginTop: '12px'
    },
    removeButton: {
      padding: '6px 12px',
      backgroundColor: themeColors.error,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    arrayItem: {
      backgroundColor: themeColors.bgCard,
      padding: '16px',
      borderRadius: '6px',
      marginBottom: '12px',
      border: `1px solid ${themeColors.border}`
    },
    arrayItemGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '12px',
      alignItems: 'start'
    },
    inputGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '8px'
    },
    checkbox: {
      marginRight: '8px'
    },
    blockedOverlay: {
      backgroundColor: themeColors.isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
      padding: '20px',
      borderRadius: '8px',
      border: `2px solid ${themeColors.errorFg}`,
      textAlign: 'center',
      marginBottom: '24px'
    },
    blockedTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: themeColors.errorFg,
      marginBottom: '8px'
    },
    blockedMessage: {
      fontSize: '14px',
      color: themeColors.textMuted
    }
  };

  // NOTE: We no longer block the entire view.
  // Instead, fields are disabled via isFormBlocked when user is not authorized to edit.
  // This allows approvers and other users to VIEW the content even during approval.

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: themeColors.warningBg,
          border: `1px solid ${themeColors.warningBorder}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ color: themeColors.warningFg, fontWeight: '500' }}>
            Este 8D está cerrado y es de solo lectura
          </span>
        </div>
      )}

      <div style={{ pointerEvents: isReadOnly ? 'none' : 'auto', opacity: isReadOnly ? 0.7 : 1 }}>
      {/* Auto-save runs silently in background - no visual indicator */}

      <div style={styles.header}>
        <h2 style={styles.title}>
           {t('title')}
        </h2>
        <p style={styles.subtitle}>{t('subtitle')}</p>
      </div>

      {/* Approval Status Bar */}
      {data && data.escalationPath && (
        <div style={{
          backgroundColor: themeColors.bgPanel,
          border: `2px solid ${themeColors.accent}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: themeColors.text, marginBottom: '4px' }}>
               Estado de Aprobación - D3-MFG (Acciones Inmediatas)
            </h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '13px', color: themeColors.textDim, fontWeight: '500' }}>Estado: </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: data.d3MfgStatus === 'approved' ? themeColors.successFg : data.d3MfgStatus === 'under_review' ? themeColors.warningFg : themeColors.textDim
                }}>
                  {data.d3MfgStatus === 'approved' ? ' Aprobado' :
                   data.d3MfgStatus === 'under_review' ? ' En Revisión' :
                   ' Borrador'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: themeColors.textDim, fontWeight: '500' }}>Paso: </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: themeColors.text }}>
                  {(() => {
                    // If status is 'under_review' but step is 0 (corrupted), assume step 1
                    const effectiveStep = (data.d3MfgStatus === 'under_review' && data.d3MfgCurrentApprovalStep === 0)
                      ? 1
                      : data.d3MfgCurrentApprovalStep;

                    if (effectiveStep === 0) return 'Responsable Principal';
                    if (effectiveStep === 4) return 'Completado';
                    return `Aprobador ${effectiveStep}`;
                  })()}
                </span>
              </div>
              {currentUserInProcess && (
                <div>
                  <span style={{ fontSize: '13px', color: themeColors.textDim, fontWeight: '500' }}>Usuario Actual: </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: themeColors.primary }}>
                     {currentUserInProcess}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Email Notification Button - Only show when approved and has distribution list */}
          {data.d3MfgStatus === 'approved' && formData.d3MfgResponsibleUserIds.length > 0 && (
            <button
              onClick={generateEmailNotification}
              style={{
                backgroundColor: themeColors.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
              title="Notificar a la lista de distribución"
            >
               Enviar Notificación
            </button>
          )}
        </div>
      )}

      {/* People Involved & Implementation Date */}
      <div style={styles.formGroup}>
        <label style={styles.label}> {t('involvedPeople')} *</label>
        <p style={styles.sectionDesc}>{t('involvedPeopleDesc')}</p>

        {/* Top Section: People Grid & Implementation Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '16px' }}>
          {/* List of selected users - 3 column grid */}
          <div>
            {formData.d3MfgResponsibleUserIds.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}>
                {formData.d3MfgResponsibleUserIds.map((item) => {
                  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
                  const userId = typeof item === 'object' ? item.id : item;
                  const user = users.find(u => u.id === userId);

                  // Si es formato nuevo con nombre congelado, usar ese nombre
                  // Si no, buscar en la lista de usuarios actual
                  const displayName = typeof item === 'object' && item.name
                    ? item.name
                    : user
                      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                      : `Usuario ${userId}`;
                  const displayPosition = user?.position || user?.role || '';

                  return (
                    <div key={userId} style={{
                      backgroundColor: themeColors.bgCard,
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${themeColors.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontSize: '13px' }}>
                        <strong>{displayName}</strong>
                        {displayPosition && (
                          <div style={{ color: themeColors.textMuted, fontSize: '12px' }}>
                            {displayPosition}
                          </div>
                        )}
                      </div>
                      <button
                        style={{ ...styles.removeButton, fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => removeResponsibleUser(userId)}
                        disabled={isFormBlocked}
                      >
                        {t('remove')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Implementation Date */}
          <div>
            <label style={styles.label}>{t('implementationDate')} <span style={{ color: themeColors.errorFg }}>*</span></label>
            <input
              type="date"
              style={styles.input}
              value={formData.d3MfgImplementationDate}
              onChange={(e) => setFormData({ ...formData, d3MfgImplementationDate: e.target.value })}
              disabled={isFormBlocked}
              required
            />
          </div>
        </div>

        {/* Bottom Section: All Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Add new user */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              id="newUserSelect"
              style={{ ...styles.select, flex: 1 }}
              defaultValue=""
              disabled={isFormBlocked}
            >
              <option value="">{t('selectUser')}</option>
              {users
                .filter(user => !formData.d3MfgResponsibleUserIds.some(item =>
                  typeof item === 'object' ? item.id === user.id : item === user.id
                ))
                .map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.position || user.role}
                  </option>
                ))}
            </select>
            <button
              style={styles.addButton}
              onClick={() => {
                const select = document.getElementById('newUserSelect');
                if (select.value) {
                  addResponsibleUser(select.value);
                  select.value = '';
                }
              }}
              disabled={isFormBlocked}
            >
              + {t('addPerson')}
            </button>
          </div>

          {/* Distribution Lists Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              id="distributionListSelect"
              style={{ ...styles.select, flex: 1 }}
              defaultValue=""
              disabled={isFormBlocked}
              onChange={(e) => {
                if (e.target.value) {
                  loadDistributionList(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">{t('loadList')}</option>
              {distributionLists.map(list => (
                <option key={list.id} value={list.id}>
                   {list.name} ({list.user_ids?.length || 0} personas)
                </option>
              ))}
            </select>
            <button
              style={{...styles.addButton, backgroundColor: themeColors.success}}
              onClick={() => setShowSaveListModal(true)}
              disabled={isFormBlocked || formData.d3MfgResponsibleUserIds.length === 0}
              title={t('saveList')}
            >
               {t('saveList')}
            </button>
          </div>
        </div>

        {/* Save Button for People Involved */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={{
              ...styles.saveButton,
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving || isFormBlocked ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSave}
            disabled={isSaving || isFormBlocked}
          >
            {isSaving ? ' Guardando...' : ' Guardar Personas Involucradas'}
          </button>
        </div>
      </div>

      {/* Main Content in Two Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Temporary Controls */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('temporaryControls')}</h3>
            <p style={styles.sectionDesc}>{t('temporaryControlsDesc')}</p>
            {formData.d3MfgTemporaryControls.map((control, index) => (
              <div key={index} style={styles.arrayItem}>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('controlDescription')}
                    value={control.description || ''}
                    onChange={(e) => updateTemporaryControl(index, 'description', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                    {t('comments')}
                  </label>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '60px' }}
                    placeholder={t('comments')}
                    value={control.comments || ''}
                    onChange={(e) => updateTemporaryControl(index, 'comments', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                {/* Evidence Section */}
                {control.evidence && control.evidence.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                      Evidencias ({control.evidence.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {control.evidence.map((ev, evIndex) => (
                        <div key={evIndex} style={{
                          padding: '4px 8px',
                          backgroundColor: themeColors.bgPanel,
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                             {ev.name}
                          </a>
                          <button
                            onClick={() => removeEvidence('control', index, evIndex)}
                            disabled={isFormBlocked}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: themeColors.errorFg,
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <input
                      type="file"
                      id={`evidence-control-${index}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleEvidenceUpload(e.target.files[0], 'control', index);
                          e.target.value = '';
                        }
                      }}
                      disabled={isFormBlocked}
                    />
                    <button
                      style={{ ...styles.addButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={() => document.getElementById(`evidence-control-${index}`).click()}
                      disabled={isBlocked || uploadingEvidence?.type === 'control' && uploadingEvidence?.index === index}
                    >
                      {uploadingEvidence?.type === 'control' && uploadingEvidence?.index === index ?
                        ' Subiendo...' : ` ${t('addEvidence')}`}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={handleSave}
                      disabled={isSaving || isFormBlocked}
                    >
                      
                    </button>
                    <button
                      style={styles.removeButton}
                      onClick={() => removeTemporaryControl(index)}
                      disabled={isFormBlocked}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button style={styles.addButton} onClick={addTemporaryControl} disabled={isFormBlocked}>
              + {t('addControl')}
            </button>
          </div>

          {/* Parameters Adjusted */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('parametersAdjusted')}</h3>
            <p style={styles.sectionDesc}>{t('parametersDesc')}</p>
            {formData.d3MfgParametersAdjusted.map((param, index) => (
              <div key={index} style={styles.arrayItem}>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('parameterName')}
                    value={param.parameter || ''}
                    onChange={(e) => updateParameter(index, 'parameter', e.target.value)}
                    disabled={isFormBlocked}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('fromValue')}
                    value={param.from || ''}
                    onChange={(e) => updateParameter(index, 'from', e.target.value)}
                    disabled={isFormBlocked}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('toValue')}
                    value={param.to || ''}
                    onChange={(e) => updateParameter(index, 'to', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                <div style={{ marginBottom: '12px', marginTop: '8px' }}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('reason')}
                    value={param.reason || ''}
                    onChange={(e) => updateParameter(index, 'reason', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                    {t('comments')}
                  </label>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '60px' }}
                    placeholder={t('comments')}
                    value={param.comments || ''}
                    onChange={(e) => updateParameter(index, 'comments', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                {/* Evidence Section */}
                {param.evidence && param.evidence.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                      Evidencias ({param.evidence.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {param.evidence.map((ev, evIndex) => (
                        <div key={evIndex} style={{
                          padding: '4px 8px',
                          backgroundColor: themeColors.bgPanel,
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                             {ev.name}
                          </a>
                          <button
                            onClick={() => removeEvidence('parameter', index, evIndex)}
                            disabled={isFormBlocked}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: themeColors.errorFg,
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <input
                      type="file"
                      id={`evidence-parameter-${index}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleEvidenceUpload(e.target.files[0], 'parameter', index);
                          e.target.value = '';
                        }
                      }}
                      disabled={isFormBlocked}
                    />
                    <button
                      style={{ ...styles.addButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={() => document.getElementById(`evidence-parameter-${index}`).click()}
                      disabled={isBlocked || uploadingEvidence?.type === 'parameter' && uploadingEvidence?.index === index}
                    >
                      {uploadingEvidence?.type === 'parameter' && uploadingEvidence?.index === index ?
                        ' Subiendo...' : ` ${t('addEvidence')}`}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={handleSave}
                      disabled={isSaving || isFormBlocked}
                    >
                      
                    </button>
                    <button
                      style={styles.removeButton}
                      onClick={() => removeParameter(index)}
                      disabled={isFormBlocked}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button style={styles.addButton} onClick={addParameter} disabled={isFormBlocked}>
              + {t('addParameter')}
            </button>
          </div>

          {/* Inspection Points */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('inspectionPoints')}</h3>
            <p style={styles.sectionDesc}>{t('inspectionPointsDesc')}</p>
            {formData.d3MfgInspectionPoints.map((point, index) => (
              <div key={index} style={styles.arrayItem}>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('location')}
                    value={point.location || ''}
                    onChange={(e) => updateInspectionPoint(index, 'location', e.target.value)}
                    disabled={isFormBlocked}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('whatToCheck')}
                    value={point.what || ''}
                    onChange={(e) => updateInspectionPoint(index, 'what', e.target.value)}
                    disabled={isFormBlocked}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('frequency')}
                    value={point.frequency || ''}
                    onChange={(e) => updateInspectionPoint(index, 'frequency', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                <div style={{ marginBottom: '12px', marginTop: '8px' }}>
                  <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                    {t('comments')}
                  </label>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '60px' }}
                    placeholder={t('comments')}
                    value={point.comments || ''}
                    onChange={(e) => updateInspectionPoint(index, 'comments', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                {/* Evidence Section */}
                {point.evidence && point.evidence.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                      Evidencias ({point.evidence.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {point.evidence.map((ev, evIndex) => (
                        <div key={evIndex} style={{
                          padding: '4px 8px',
                          backgroundColor: themeColors.bgPanel,
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                             {ev.name}
                          </a>
                          <button
                            onClick={() => removeEvidence('inspection', index, evIndex)}
                            disabled={isFormBlocked}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: themeColors.errorFg,
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <input
                      type="file"
                      id={`evidence-inspection-${index}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleEvidenceUpload(e.target.files[0], 'inspection', index);
                          e.target.value = '';
                        }
                      }}
                      disabled={isFormBlocked}
                    />
                    <button
                      style={{ ...styles.addButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={() => document.getElementById(`evidence-inspection-${index}`).click()}
                      disabled={isBlocked || uploadingEvidence?.type === 'inspection' && uploadingEvidence?.index === index}
                    >
                      {uploadingEvidence?.type === 'inspection' && uploadingEvidence?.index === index ?
                        ' Subiendo...' : ` ${t('addEvidence')}`}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={handleSave}
                      disabled={isSaving || isFormBlocked}
                    >
                      
                    </button>
                    <button
                      style={styles.removeButton}
                      onClick={() => removeInspectionPoint(index)}
                      disabled={isFormBlocked}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button style={styles.addButton} onClick={addInspectionPoint} disabled={isFormBlocked}>
              + {t('addInspection')}
            </button>
          </div>

          {/* Poka-Yoke Devices */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('pokaYokeDevices')}</h3>
            <p style={styles.sectionDesc}>{t('pokaYokeDesc')}</p>
            {formData.d3MfgPokaYokeDevices.map((device, index) => (
              <div key={index} style={styles.arrayItem}>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('deviceName')}
                    value={device.device || ''}
                    onChange={(e) => updatePokaYokeDevice(index, 'device', e.target.value)}
                    disabled={isFormBlocked}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('location')}
                    value={device.location || ''}
                    onChange={(e) => updatePokaYokeDevice(index, 'location', e.target.value)}
                    disabled={isFormBlocked}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder={t('purpose')}
                    value={device.purpose || ''}
                    onChange={(e) => updatePokaYokeDevice(index, 'purpose', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                <div style={{ marginBottom: '12px', marginTop: '8px' }}>
                  <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                    {t('comments')}
                  </label>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '60px' }}
                    placeholder={t('comments')}
                    value={device.comments || ''}
                    onChange={(e) => updatePokaYokeDevice(index, 'comments', e.target.value)}
                    disabled={isFormBlocked}
                  />
                </div>

                {/* Evidence Section */}
                {device.evidence && device.evidence.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                      Evidencias ({device.evidence.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {device.evidence.map((ev, evIndex) => (
                        <div key={evIndex} style={{
                          padding: '4px 8px',
                          backgroundColor: themeColors.bgPanel,
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                             {ev.name}
                          </a>
                          <button
                            onClick={() => removeEvidence('pokaYoke', index, evIndex)}
                            disabled={isFormBlocked}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: themeColors.errorFg,
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <input
                      type="file"
                      id={`evidence-pokaYoke-${index}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleEvidenceUpload(e.target.files[0], 'pokaYoke', index);
                          e.target.value = '';
                        }
                      }}
                      disabled={isFormBlocked}
                    />
                    <button
                      style={{ ...styles.addButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={() => document.getElementById(`evidence-pokaYoke-${index}`).click()}
                      disabled={isBlocked || uploadingEvidence?.type === 'pokaYoke' && uploadingEvidence?.index === index}
                    >
                      {uploadingEvidence?.type === 'pokaYoke' && uploadingEvidence?.index === index ?
                        ' Subiendo...' : ` ${t('addEvidence')}`}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                      onClick={handleSave}
                      disabled={isSaving || isFormBlocked}
                    >
                      
                    </button>
                    <button
                      style={styles.removeButton}
                      onClick={() => removePokaYokeDevice(index)}
                      disabled={isFormBlocked}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button style={styles.addButton} onClick={addPokaYokeDevice} disabled={isFormBlocked}>
              + {t('addDevice')}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Line Modifications */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('lineModifications')}</h3>
            <p style={styles.sectionDesc}>{t('lineModificationsDesc')}</p>
            {formData.d3MfgLineModifications.map((modification, index) => (
              <div key={index} style={styles.arrayItem}>
            {/* Grid layout for 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                  Nombre de Línea *
                </label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Nombre de la línea de producción"
                  value={modification.lineName || ''}
                  onChange={(e) => updateLineModification(index, 'lineName', e.target.value)}
                  disabled={isFormBlocked}
                />
              </div>

              <div>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                  Ubicación *
                </label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Ubicación de la modificación"
                  value={modification.location || ''}
                  onChange={(e) => updateLineModification(index, 'location', e.target.value)}
                  disabled={isFormBlocked}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                Tipo de Modificación *
              </label>
              <input
                type="text"
                style={styles.input}
                placeholder="Ej: Mecánica, Eléctrica, Layout, Proceso"
                value={modification.modificationType || ''}
                onChange={(e) => updateLineModification(index, 'modificationType', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                Condición Anterior *
              </label>
              <textarea
                style={{ ...styles.textarea, minHeight: '60px' }}
                placeholder="Describe la condición antes de la modificación"
                value={modification.previousCondition || ''}
                onChange={(e) => updateLineModification(index, 'previousCondition', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                Condición Nueva *
              </label>
              <textarea
                style={{ ...styles.textarea, minHeight: '60px' }}
                placeholder="Describe la condición después de la modificación"
                value={modification.newCondition || ''}
                onChange={(e) => updateLineModification(index, 'newCondition', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                Comentarios Adicionales
              </label>
              <textarea
                style={{ ...styles.textarea, minHeight: '60px' }}
                placeholder="Comentarios adicionales sobre la modificación"
                value={modification.comments || ''}
                onChange={(e) => updateLineModification(index, 'comments', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            {/* Evidence Section */}
            {modification.evidence && modification.evidence.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                  Evidencias ({modification.evidence.length})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {modification.evidence.map((ev, evIndex) => (
                    <div key={evIndex} style={{
                      padding: '4px 8px',
                      backgroundColor: themeColors.bgPanel,
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                         {ev.name}
                      </a>
                      <button
                        onClick={() => removeEvidence('lineModification', index, evIndex)}
                        disabled={isFormBlocked}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: themeColors.errorFg,
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '14px'
                        }}
                      >
                            ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <input
                  type="file"
                  id={`evidence-lineModification-${index}`}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleEvidenceUpload(e.target.files[0], 'lineModification', index);
                      e.target.value = '';
                    }
                  }}
                  disabled={isFormBlocked}
                />
                <button
                  style={styles.addButton}
                  onClick={() => document.getElementById(`evidence-lineModification-${index}`).click()}
                  disabled={isBlocked || uploadingEvidence?.type === 'lineModification' && uploadingEvidence?.index === index}
                >
                  {uploadingEvidence?.type === 'lineModification' && uploadingEvidence?.index === index ? ' Subiendo...' : ` ${t('addEvidence')}`}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                  onClick={handleSave}
                  disabled={isSaving || isFormBlocked}
                >
                  
                </button>
                <button
                  style={styles.removeButton}
                  onClick={() => removeLineModification(index)}
                  disabled={isFormBlocked}
                >
                  {t('remove')}
                </button>
              </div>
              </div>
            </div>
            ))}
            <button style={styles.addButton} onClick={addLineModification} disabled={isFormBlocked}>
              + Agregar Modificación
            </button>
          </div>

          {/* Operator Training */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('operatorTraining')}</h3>
            <p style={styles.sectionDesc}>{t('operatorTrainingDesc')}</p>
            {formData.d3MfgOperatorTraining.map((training, index) => (
              <div key={index} style={styles.arrayItem}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                style={styles.input}
                placeholder={t('operatorTraining')}
                value={training.description || ''}
                onChange={(e) => updateOperatorTraining(index, 'description', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                {t('comments')}
              </label>
              <textarea
                style={{ ...styles.textarea, minHeight: '60px' }}
                placeholder={t('comments')}
                value={training.comments || ''}
                onChange={(e) => updateOperatorTraining(index, 'comments', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            {/* Evidence Section */}
            {training.evidence && training.evidence.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                  Evidencias ({training.evidence.length})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {training.evidence.map((ev, evIndex) => (
                    <div key={evIndex} style={{
                      padding: '4px 8px',
                      backgroundColor: themeColors.bgPanel,
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                         {ev.name}
                      </a>
                      <button
                        onClick={() => removeEvidence('operatorTraining', index, evIndex)}
                        disabled={isFormBlocked}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: themeColors.errorFg,
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '14px'
                        }}
                      >
                            ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <input
                  type="file"
                  id={`evidence-operatorTraining-${index}`}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleEvidenceUpload(e.target.files[0], 'operatorTraining', index);
                      e.target.value = '';
                    }
                  }}
                  disabled={isFormBlocked}
                />
                <button
                  style={styles.addButton}
                  onClick={() => document.getElementById(`evidence-operatorTraining-${index}`).click()}
                  disabled={isBlocked || uploadingEvidence?.type === 'operatorTraining' && uploadingEvidence?.index === index}
                >
                  {uploadingEvidence?.type === 'operatorTraining' && uploadingEvidence?.index === index ? ' Subiendo...' : ` ${t('addEvidence')}`}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                  onClick={handleSave}
                  disabled={isSaving || isFormBlocked}
                >
                  
                </button>
                <button
                  style={styles.removeButton}
                  onClick={() => removeOperatorTraining(index)}
                  disabled={isFormBlocked}
                >
                  {t('remove')}
                </button>
              </div>
              </div>
            </div>
            ))}
            <button style={styles.addButton} onClick={addOperatorTraining} disabled={isFormBlocked}>
              + Agregar Entrenamiento
            </button>
          </div>

          {/* Effectiveness Validation */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('effectivenessValidation')}</h3>
            <p style={styles.sectionDesc}>{t('effectivenessValidationDesc')}</p>
            {formData.d3MfgEffectivenessValidation.map((validation, index) => (
              <div key={index} style={styles.arrayItem}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                style={styles.input}
                placeholder={t('effectivenessValidation')}
                value={validation.description || ''}
                onChange={(e) => updateEffectivenessValidation(index, 'description', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                {t('comments')}
              </label>
              <textarea
                style={{ ...styles.textarea, minHeight: '60px' }}
                placeholder={t('comments')}
                value={validation.comments || ''}
                onChange={(e) => updateEffectivenessValidation(index, 'comments', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            {/* Evidence Section */}
            {validation.evidence && validation.evidence.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                  Evidencias ({validation.evidence.length})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {validation.evidence.map((ev, evIndex) => (
                    <div key={evIndex} style={{
                      padding: '4px 8px',
                      backgroundColor: themeColors.bgPanel,
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                         {ev.name}
                      </a>
                      <button
                        onClick={() => removeEvidence('effectivenessValidation', index, evIndex)}
                        disabled={isFormBlocked}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: themeColors.errorFg,
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '14px'
                        }}
                      >
                            ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <input
                  type="file"
                  id={`evidence-effectivenessValidation-${index}`}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleEvidenceUpload(e.target.files[0], 'effectivenessValidation', index);
                      e.target.value = '';
                    }
                  }}
                  disabled={isFormBlocked}
                />
                <button
                  style={styles.addButton}
                  onClick={() => document.getElementById(`evidence-effectivenessValidation-${index}`).click()}
                  disabled={isBlocked || uploadingEvidence?.type === 'effectivenessValidation' && uploadingEvidence?.index === index}
                >
                  {uploadingEvidence?.type === 'effectivenessValidation' && uploadingEvidence?.index === index ? ' Subiendo...' : ` ${t('addEvidence')}`}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                  onClick={handleSave}
                  disabled={isSaving || isFormBlocked}
                >
                  
                </button>
                <button
                  style={styles.removeButton}
                  onClick={() => removeEffectivenessValidation(index)}
                  disabled={isFormBlocked}
                >
                  {t('remove')}
                </button>
              </div>
              </div>
            </div>
            ))}
            <button style={styles.addButton} onClick={addEffectivenessValidation} disabled={isFormBlocked}>
              + Agregar Validación
            </button>
          </div>

          {/* Others */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}> {t('others')}</h3>
            <p style={styles.sectionDesc}>{t('othersDesc')}</p>
            {(formData.d3MfgOthers || []).map((other, index) => (
              <div key={index} style={styles.arrayItem}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                style={styles.input}
                placeholder={t('others')}
                value={other.description || ''}
                onChange={(e) => updateOther(index, 'description', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                {t('comments')}
              </label>
              <textarea
                style={{ ...styles.textarea, minHeight: '60px' }}
                placeholder={t('comments')}
                value={other.comments || ''}
                onChange={(e) => updateOther(index, 'comments', e.target.value)}
                disabled={isFormBlocked}
              />
            </div>

            {/* Evidence Section */}
            {other.evidence && other.evidence.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
                  Evidencias ({other.evidence.length})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {other.evidence.map((ev, evIndex) => (
                    <div key={evIndex} style={{
                      padding: '4px 8px',
                      backgroundColor: themeColors.bgPanel,
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: themeColors.accent }}>
                         {ev.name}
                      </a>
                      <button
                        onClick={() => removeEvidence('others', index, evIndex)}
                        disabled={isFormBlocked}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: themeColors.errorFg,
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '14px'
                        }}
                      >
                            ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <input
                  type="file"
                  id={`evidence-others-${index}`}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleEvidenceUpload(e.target.files[0], 'others', index);
                      e.target.value = '';
                    }
                  }}
                  disabled={isFormBlocked}
                />
                <button
                  style={styles.addButton}
                  onClick={() => document.getElementById(`evidence-others-${index}`).click()}
                  disabled={isBlocked || uploadingEvidence?.type === 'others' && uploadingEvidence?.index === index}
                >
                  {uploadingEvidence?.type === 'others' && uploadingEvidence?.index === index ? ' Subiendo...' : ` ${t('addEvidence')}`}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...styles.saveButton, padding: '6px 12px', fontSize: '12px', margin: 0 }}
                  onClick={handleSave}
                  disabled={isSaving || isFormBlocked}
                >
                  
                </button>
                <button
                  style={styles.removeButton}
                  onClick={() => removeOther(index)}
                  disabled={isFormBlocked}
                >
                  {t('remove')}
                </button>
              </div>
              </div>
            </div>
            ))}
            <button style={styles.addButton} onClick={addOther} disabled={isFormBlocked}>
              + Agregar Otro
            </button>
          </div>
        </div>
      </div>

      {/* Completed Checkbox */}
      <div style={styles.formGroup}>
        <label>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={formData.d3MfgCompleted}
            onChange={(e) => setFormData({ ...formData, d3MfgCompleted: e.target.checked })}
            disabled={isFormBlocked}
          />
          {t('markCompleted')}
        </label>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', flexWrap: 'wrap' }}>
        {/* Mensaje cuando está completamente aprobado */}
        {data?.d3MfgStatus === 'approved' ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <div style={{
              padding: '12px 24px',
              backgroundColor: themeColors.bgPanel,
              border: `2px solid ${themeColors.successBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              color: themeColors.successFg,
              textAlign: 'center',
              fontWeight: 'bold',
              flex: 1
            }}>
              D3-MFG COMPLETAMENTE APROBADO. Puede continuar con D4.
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowRevertModal(true)}
                style={{
                  ...styles.button,
                  backgroundColor: themeColors.errorFg,
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {language === 'es' ? 'Regresar a Borrador' : 'Revert to Draft'}
              </button>
            )}
          </div>
        ) : data?.d3MfgStatus === 'under_review' && isCurrentApprover() ? (
          <>
            {/* Reject Button */}
            <button
              onClick={handleReject}
              style={{
                ...styles.button,
                backgroundColor: themeColors.error,
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
               {language === 'es' ? 'Rechazar' : 'Reject'}
            </button>

            {/* Approve Button */}
            <button
              onClick={handleApprove}
              style={{
                ...styles.button,
                backgroundColor: themeColors.success,
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
               {language === 'es' ? 'Aprobar' : 'Approve'}
            </button>
          </>
        ) : !isFormBlocked && (!isBlocked || isAdmin) ? (
          /* Show Save/Send buttons when NOT blocked (admin can always see) */
          <>
            {/* Save Draft Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || isSending}
              style={{
                ...styles.button,
                backgroundColor: themeColors.textMuted,
                opacity: isSaving || isSending ? 0.5 : 1,
                cursor: isSaving || isSending ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isSaving && !isSending) {
                  e.target.style.backgroundColor = themeColors.textMuted;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving && !isSending) {
                  e.target.style.backgroundColor = themeColors.textMuted;
                }
              }}
            >
              {isSaving ? t('saving') : t('saveDraft')}
            </button>

            {/* Send to Approval Button */}
            <button
              onClick={handleSendToApproval}
              disabled={isSaving || isSending}
              style={{
                ...styles.button,
                backgroundColor: themeColors.success,
                opacity: isSaving || isSending ? 0.5 : 1,
                cursor: isSaving || isSending ? 'not-allowed' : 'pointer'
              }}
            >
              {isSending ? t('sending') : t('sendToApproval')}
            </button>
          </>
        ) : null}
      </div>

      {/* Detailed Approval History */}
      {data && data.d3MfgStatus && data.d3MfgStatus !== 'draft' && (
        <div style={{
          backgroundColor: themeColors.bgPanel,
          border: `2px solid ${themeColors.warningFg}`,
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '17px',
            fontWeight: 'bold',
            color: themeColors.text,
            marginTop: 0,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
             Historial de Aprobaciones D3-MFG (Acciones Inmediatas)
          </h3>

          {/* Current Step Indicator - Only show configured approvers */}
          {(() => {
            const countermeasureUsers = data?.escalationPath?.countermeasure_users || data?.escalation_path?.countermeasure_users || [];
            // Get configured approvers (indices 1, 2, 3 that have values)
            const configuredApprovers = [1, 2, 3].filter(step => {
              const approver = countermeasureUsers[step];
              return approver !== undefined && approver !== null;
            });

            if (configuredApprovers.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '12px', color: themeColors.textDim, fontSize: '13px' }}>
                  No hay aprobadores configurados para D3-MFG
                </div>
              );
            }

            const d3MfgCurrentStep = data?.d3MfgCurrentApprovalStep || 0;

            return (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                {configuredApprovers.map(step => {
                  const isPast = step < d3MfgCurrentStep;
                  const isCurrent = step === d3MfgCurrentStep;
                  const approvalData = approvalHistory[`approval${step}`];
                  const approverId = countermeasureUsers[step];
                  const approverUser = users.find(u => u.id === approverId);
                  const approverName = approverUser
                    ? `${approverUser.firstName || approverUser.first_name || ''} ${approverUser.lastName || approverUser.last_name || ''}`.trim() || approverUser.email
                    : `ID: ${approverId}`;
                  const approverEmail = approverUser?.email || '';

                  return (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '6px',
                        border: isCurrent ? `3px solid ${themeColors.accent}` : `1px solid ${themeColors.border}`,
                        backgroundColor: isPast
                          ? approvalData?.status === 'approved' ? themeColors.successBg : themeColors.errorBg
                          : isCurrent ? themeColors.accentBg : themeColors.bgPanel,
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>
                        {isPast && approvalData?.status === 'approved' && ' '}
                        {isPast && approvalData?.status === 'rejected' && ' '}
                        {isCurrent && ' '}
                        {approverName}
                      </div>
                      {approverEmail && (
                        <div style={{ fontSize: '11px', color: themeColors.accent, marginBottom: '4px' }}>
                          {approverEmail}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: themeColors.textDim }}>
                        {isPast && approvalData?.status === 'approved' && (
                          <>Aprobado {approvalData?.at && `el ${new Date(approvalData.at).toLocaleDateString()}`}</>
                        )}
                        {isPast && approvalData?.status === 'rejected' && (
                          <>Rechazado</>
                        )}
                        {isCurrent && 'Pendiente de aprobación'}
                        {!isPast && !isCurrent && 'En espera'}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Approval History - Full Audit Trail */}
          {d3MfgApprovalHistory.length > 0 && (
            <div style={{
              backgroundColor: themeColors.bgCard,
              padding: '15px',
              borderRadius: '6px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Historial de Aprobaciones D3-MFG ({d3MfgApprovalHistory.length} registros):
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {d3MfgApprovalHistory.map((entry, index) => {
                  const isApproved = entry.actionType === 'approved';
                  const isRejected = entry.actionType === 'rejected';
                  const isSubmitted = entry.actionType === 'submitted_for_approval';

                  return (
                    <div key={entry.id || index} style={{
                      marginBottom: '10px',
                      padding: '10px',
                      backgroundColor: isApproved ? themeColors.successBg : isRejected ? themeColors.errorBg : themeColors.infoBg,
                      borderLeft: `4px solid ${isApproved ? themeColors.successFg : isRejected ? themeColors.errorFg : themeColors.primary}`,
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: isApproved ? themeColors.successFg : isRejected ? themeColors.errorFg : themeColors.primary }}>
                          {entry.userName || 'Usuario'}
                        </strong>
                        <span style={{ fontSize: '11px', color: themeColors.textMuted }}>
                          {entry.createdAt && new Date(entry.createdAt).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {isApproved && <span style={{ color: themeColors.successFg }}>Aprobado</span>}
                        {isRejected && <span style={{ color: themeColors.errorFg }}>Rechazado</span>}
                        {isSubmitted && <span style={{ color: themeColors.primary }}>Enviado a Aprobacion</span>}
                        {entry.description && (
                          <span style={{ marginLeft: '8px', color: themeColors.textSecondary }}>
                            - {entry.description}
                          </span>
                        )}
                      </div>
                      {entry.newValue && typeof entry.newValue === 'object' && entry.newValue.comments && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px',
                          backgroundColor: themeColors.warningBg,
                          borderLeft: `3px solid ${themeColors.warningFg}`,
                          fontSize: '12px',
                          fontStyle: 'italic'
                        }}>
                          Comentarios: {entry.newValue.comments}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para guardar lista de distribución */}
      {showSaveListModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: themeColors.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: themeColors.bgCard,
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
               {t('saveList')}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                {t('listName')} *
              </label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ej: Jefes de Turno A"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                {t('listDescription')}
              </label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Ej: Lista para notificaciones de turno A"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              backgroundColor: themeColors.bg,
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: themeColors.textDim }}>
                Usuarios seleccionados: {formData.d3MfgResponsibleUserIds.length}
              </p>
              <div style={{ fontSize: '12px', color: themeColors.textDim }}>
                {formData.d3MfgResponsibleUserIds.map(item => {
                  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
                  if (typeof item === 'object' && item.name) {
                    return item.name;
                  }
                  const userId = typeof item === 'object' ? item.id : item;
                  const user = users.find(u => u.id === userId);
                  return user ? `${user.firstName} ${user.lastName}` : '';
                }).filter(Boolean).join(', ')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSaveListModal(false);
                  setNewListName('');
                  setNewListDescription('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.bgCard,
                  color: themeColors.text,
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={saveAsDistributionList}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: themeColors.success,
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {t('saveListButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== ESCALATION PATH - D3-MFG ================== */}
      {data && (
        <div style={{
          marginTop: '30px',
          backgroundColor: themeColors.infoBg,
          border: `2px solid ${themeColors.primary}`,
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: themeColors.text,
            marginTop: 0,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Escalation Path - D3-MFG (Countermeasure Section)
          </h3>
          {(() => {
            const countermeasureUsers = data?.escalationPath?.countermeasure_users || data?.escalation_path?.countermeasure_users || [];

            if (countermeasureUsers.length === 0) {
              return (
                <div style={{ color: themeColors.errorFg, fontSize: '13px', padding: '12px', backgroundColor: themeColors.errorBg, borderRadius: '6px' }}>
                  No hay usuarios asignados. Configure el Escalation Path en la sección "Countermeasure (D4-D5-D6)" del tab D1-D2-D3.
                </div>
              );
            }

            const getUserInfo = (userId, role) => {
              if (!userId) return null;
              const user = users.find(u => u.id === userId);
              const name = user
                ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                : `ID: ${userId}`;
              const email = user?.email || '';
              const position = user?.position || user?.cargo || '';
              return { name, email, position, role };
            };

            // Semantic role colors using theme tokens
            const roles = [
              { index: 0, label: 'Responsable', color: themeColors.accentFg, bgColor: themeColors.accentBg, borderColor: themeColors.accentBorder },
              { index: 1, label: 'Aprobador 1', color: themeColors.successFg, bgColor: themeColors.successBg, borderColor: themeColors.successBorder },
              { index: 2, label: 'Aprobador 2', color: themeColors.successFg, bgColor: themeColors.successBg, borderColor: themeColors.successBorder },
              { index: 3, label: 'Aprobador 3', color: themeColors.successFg, bgColor: themeColors.successBg, borderColor: themeColors.successBorder }
            ];

            return (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {roles.map(({ index, label, color, bgColor, borderColor }) => {
                  const userId = countermeasureUsers[index];
                  if (!userId) return null;
                  const info = getUserInfo(userId, label);
                  if (!info) return null;

                  return (
                    <div key={index} style={{
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      minWidth: '200px',
                      flex: '1 1 200px'
                    }}>
                      <div style={{ fontSize: '11px', color: themeColors.textDim, marginBottom: '4px', fontWeight: '600' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color }}>
                        {info.name}
                      </div>
                      {info.email && (
                        <div style={{ fontSize: '12px', color: themeColors.accent, marginTop: '2px' }}>
                          {info.email}
                        </div>
                      )}
                      {info.position && (
                        <div style={{ fontSize: '11px', color: themeColors.textDim, marginTop: '2px' }}>
                          {info.position}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal: Revert to Draft (Admin only) */}
      {showRevertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: themeColors.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: themeColors.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: themeColors.text,
              fontSize: '18px',
              fontWeight: '600'
            }}>
              {language === 'es' ? 'Regresar D3-MFG a Borrador' : 'Revert D3-MFG to Draft'}
            </h3>

            <div style={{
              backgroundColor: themeColors.errorBg,
              border: `1px solid ${themeColors.errorBorder}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, color: themeColors.errorFg, fontSize: '14px' }}>
                {language === 'es'
                  ? 'Esta acción revertirá la sección a estado de borrador, permitiendo editar nuevamente. Se eliminará el estado de aprobación actual.'
                  : 'This action will revert the section to draft status, allowing edits. Current approval status will be cleared.'}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: themeColors.text
              }}>
                {language === 'es' ? 'Razón (obligatorio):' : 'Reason (required):'}
              </label>
              <textarea
                value={revertComments}
                onChange={(e) => setRevertComments(e.target.value)}
                placeholder={language === 'es' ? 'Ingrese el motivo de la reversión...' : 'Enter reason for reverting...'}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.bgInput,
                  color: themeColors.text,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRevertModal(false);
                  setRevertComments('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: 'transparent',
                  color: themeColors.text,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleRevertToDraft}
                disabled={isReverting || !revertComments.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isReverting || !revertComments.trim() ? themeColors.textMuted : themeColors.errorFg,
                  color: themeColors.bgCard,
                  cursor: isReverting || !revertComments.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isReverting
                  ? (language === 'es' ? 'Procesando...' : 'Processing...')
                  : (language === 'es' ? 'Confirmar' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* End of read-only wrapper */}
    </div>
  );
};

export default D3MFG;
