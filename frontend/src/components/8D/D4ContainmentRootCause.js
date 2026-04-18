import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, isUserAdmin } from '../../utils/permissions';
// UX Improvements (MEJORAS)
import CollapsibleSection from './CollapsibleSection';
import ApprovalStepper from './ApprovalStepper';
import SectionProgressIndicator from './SectionProgressIndicator';

const D4ContainmentRootCause = ({ data, onDataUpdate, language = 'es', isBlocked = false }) => {
  const { theme: themeColors } = useTheme();
  const { showSuccess, showError, showWarning } = useToast();
  // Get current user from centralized utility
  const currentUser = getCurrentUser();
  const isAdmin = isUserAdmin(currentUser);

  // Check if current user is the approver for the current step
  const isCurrentApprover = () => {
    // Admins can approve anything
    if (isAdmin) return true;

    if (!data) return false;

    // Try both camelCase and snake_case
    const escalationPath = data.escalationPath || data.escalation_path;
    if (!escalationPath) return false;

    const countermeasureUsers = escalationPath.countermeasure_users || escalationPath.countermeasureUsers;
    if (!countermeasureUsers || !Array.isArray(countermeasureUsers)) return false;

    const currentStep = data.d4CurrentApprovalStep || data.d4_current_approval_step || 0;

    // Effective step: if status is under_review but step is 0, assume step 1
    const d4Status = data.d4Status || data.d4_status || 'draft';
    const effectiveStep = (d4Status === 'under_review' && currentStep === 0) ? 1 : currentStep;

    if (effectiveStep < 1 || effectiveStep > 3) return false;

    const expectedApproverId = countermeasureUsers[effectiveStep];
    return currentUser.id === expectedApproverId;
  };

  // Check if current user is the primary responsible
  const isPrimaryUser = () => {
    if (!data) return false;

    // Try both camelCase and snake_case
    const escalationPath = data.escalationPath || data.escalation_path;
    if (!escalationPath) return false;

    const countermeasureUsers = escalationPath.countermeasure_users || escalationPath.countermeasureUsers;
    if (!countermeasureUsers || !Array.isArray(countermeasureUsers)) return false;

    const primaryUserId = countermeasureUsers[0];
    return currentUser.id === primaryUserId;
  };

  // Determine if form should be blocked for editing
  // Block when:
  // 1. Status is 'under_review' or 'approved'
  // 2. OR current user is NOT the primary responsible (only primary can edit in draft mode)
  const d4Status = data?.d4Status || data?.d4_status;
  const d4CurrentStep = data?.d4CurrentApprovalStep || data?.d4_current_approval_step || 0;
  // Admins can ALWAYS edit
  const isFormBlocked = isAdmin ? false : (
    d4Status === 'under_review' ||
    d4Status === 'approved' ||
    (d4CurrentStep >= 1 && d4CurrentStep <= 3) ||
    d4CurrentStep === 4 ||
    !isPrimaryUser() // Block if user is not primary responsible
  );

  // State for users list
  const [users, setUsers] = useState([]);
  // Full approval history from audit log
  const [d4ApprovalHistory, setD4ApprovalHistory] = useState([]);

  // Revert to draft modal state (Admin only)
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertComments, setRevertComments] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  // Approval history state (similar to D1-D2-D3)
  const [approvalHistory, setApprovalHistory] = useState({
    approval1: {
      status: data?.d4Approval1Status || data?.d4_approval_1_status,
      by: data?.d4Approval1By || data?.d4_approval_1_by,
      at: data?.d4Approval1At || data?.d4_approval_1_at,
      comments: data?.d4Approval1Comments || data?.d4_approval_1_comments
    },
    approval2: {
      status: data?.d4Approval2Status || data?.d4_approval_2_status,
      by: data?.d4Approval2By || data?.d4_approval_2_by,
      at: data?.d4Approval2At || data?.d4_approval_2_at,
      comments: data?.d4Approval2Comments || data?.d4_approval_2_comments
    },
    approval3: {
      status: data?.d4Approval3Status || data?.d4_approval_3_status,
      by: data?.d4Approval3By || data?.d4_approval_3_by,
      at: data?.d4Approval3At || data?.d4_approval_3_at,
      comments: data?.d4Approval3Comments || data?.d4_approval_3_comments
    }
  });

  // Update approval history when data changes
  useEffect(() => {
    if (data) {
      setApprovalHistory({
        approval1: {
          status: data?.d4Approval1Status || data?.d4_approval_1_status,
          by: data?.d4Approval1By || data?.d4_approval_1_by,
          at: data?.d4Approval1At || data?.d4_approval_1_at,
          comments: data?.d4Approval1Comments || data?.d4_approval_1_comments
        },
        approval2: {
          status: data?.d4Approval2Status || data?.d4_approval_2_status,
          by: data?.d4Approval2By || data?.d4_approval_2_by,
          at: data?.d4Approval2At || data?.d4_approval_2_at,
          comments: data?.d4Approval2Comments || data?.d4_approval_2_comments
        },
        approval3: {
          status: data?.d4Approval3Status || data?.d4_approval_3_status,
          by: data?.d4Approval3By || data?.d4_approval_3_by,
          at: data?.d4Approval3At || data?.d4_approval_3_at,
          comments: data?.d4Approval3Comments || data?.d4_approval_3_comments
        }
      });
    }
  }, [data]);

  // Load users list for displaying names
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/users/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  // Load D4 approval history from audit log
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      if (!data?.id) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/audit-log?actionCategory=approval&sectionName=d4`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setD4ApprovalHistory(response.data.auditLog || []);
        }
      } catch (error) {
        console.error('Error loading D4 approval history:', error);
      }
    };
    fetchApprovalHistory();
  }, [data?.id]);

  // Get current user in process (for approval status display) - memoized to update when users load
  const currentUserInProcess = useMemo(() => {
    if (!data) return null;

    // Try both camelCase and snake_case
    const escalationPath = data.escalationPath || data.escalation_path;
    if (!escalationPath) return null;

    const countermeasureUsers = escalationPath.countermeasure_users || escalationPath.countermeasureUsers;
    if (!countermeasureUsers) return null;

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const status = data.d4Status || data.d4_status || 'draft';
    const currentStep = data.d4CurrentApprovalStep || data.d4_current_approval_step || 0;
    const effectiveStep = (status === 'under_review' && currentStep === 0) ? 1 : currentStep;

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

  const [formData, setFormData] = useState({
    // Análisis de Causa Raíz
    d4RootCause: '',
    d4RootCauses: [],
    d4PotentialCauses: [],
    d4FiveWhysAnalysis: null,
    d4FishboneAnalysis: null,
    d4AnalysisTechnique: '',
    d4Completed: false,
    // 4M Analysis & 5 Whys
    d4_4mEvaluation: [],
    d4_5whysAnalysis: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timeStatus, setTimeStatus] = useState('ok'); // 'ok', 'warning', 'critical', 'overdue'
  const [delayHistory, setDelayHistory] = useState([]);
  const [currentDelayReason, setCurrentDelayReason] = useState('');
  const [currentCommitmentDate, setCurrentCommitmentDate] = useState('');

  // Load data from props
  // Use a ref to track if we've initialized the form data
  const isInitialized = React.useRef(false);

  useEffect(() => {
    if (data) {
      // Only update on first load OR if incoming data has more or equal items
      const incomingCount = data.d4_4mEvaluation?.length || 0;
      const currentCount = formData.d4_4mEvaluation?.length || 0;

      if (!isInitialized.current || incomingCount >= currentCount) {
        setFormData({
          d4RootCause: data.d4RootCause || '',
          d4RootCauses: data.d4RootCauses || [],
          d4PotentialCauses: data.d4PotentialCauses || [],
          d4FiveWhysAnalysis: data.d4FiveWhysAnalysis || null,
          d4FishboneAnalysis: data.d4FishboneAnalysis || null,
          d4AnalysisTechnique: data.d4AnalysisTechnique || '',
          d4Completed: data.d4Completed || false,
          d4_4mEvaluation: (data.d4_4mEvaluation || []).map(item => ({
            ...item,
            evidence: (item.evidence || []).map(ev => ({
              ...ev,
              fileUrl: ev.fileUrl && !ev.fileUrl.startsWith('http') ? `http://localhost:5000${ev.fileUrl}` : (ev.fileUrl || '')
            }))
          })),
          d4_5whysAnalysis: data.d4_5whysAnalysis || []
        });
        setDelayHistory(data.d4DelayHistory || []);
        isInitialized.current = true;
      }
    }
  }, [data]);

  // Timer countdown for D4 SLA
  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!data || !data.createdAt) return;

      const createdDate = new Date(data.createdAt);
      const now = new Date();
      const slaHours = data.d4ResponseTimeHours || 24;
      const deadlineDate = new Date(createdDate.getTime() + slaHours * 60 * 60 * 1000);

      const timeLeft = deadlineDate.getTime() - now.getTime();
      const totalSlaTime = slaHours * 60 * 60 * 1000;
      const percentRemaining = (timeLeft / totalSlaTime) * 100;

      // Calculate time components including days
      const absTimeLeft = Math.abs(timeLeft);
      const daysLeft = Math.floor(absTimeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((absTimeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((absTimeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((absTimeLeft % (1000 * 60)) / 1000);

      setTimeRemaining({
        days: daysLeft,
        hours: hoursLeft,
        minutes: minutesLeft,
        seconds: secondsLeft,
        isOverdue: timeLeft < 0,
        percentRemaining: Math.max(0, percentRemaining)
      });

      // Determine status
      if (timeLeft < 0) {
        setTimeStatus('overdue');
      } else if (percentRemaining < 25) {
        setTimeStatus('critical');
      } else if (percentRemaining < 50) {
        setTimeStatus('warning');
      } else {
        setTimeStatus('ok');
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const translations = {
    es: {
      title: 'D4 - Análisis de Causa Raíz',
      subtitle: 'Etapa 2 - Identificación de la causa raíz del problema',

      // Timer
      slaTimer: 'Tiempo SLA D4',
      timeRemaining: 'Tiempo Restante',
      overdue: 'FUERA DE TIEMPO',
      slaTarget: 'Meta SLA',
      hours: 'horas',

      // Root Cause
      rootCause: 'Causa Raíz Principal',
      rootCausePlaceholder: 'Describe la causa raíz identificada del problema...',
      analysisTechnique: 'Técnica de Análisis',
      techniqueNone: 'Ninguna',
      technique5Whys: '5 Porqués',
      techniqueFishbone: 'Diagrama de Ishikawa',
      techniqueBoth: 'Ambas',
      potentialCauses: 'Causas Potenciales Identificadas',
      addCause: 'Agregar Causa',

      markComplete: 'Marcar D4 como Completada',
      mustMarkComplete: 'Debes marcar D4 como completada antes de enviar a aprobación',
      saveDraft: 'Guardar Borrador',
      sendToApproval: 'Enviar a Aprobación',
      saving: 'Guardando...',
      sending: 'Enviando...',
      blocked: 'Esta sección está bloqueada. Solo el responsable principal puede editar cuando está bajo contestación.',
      required: 'Campo requerido',
      confirmSendToApproval: '¿Estás seguro de enviar D4 a aprobación? Una vez enviada, no podrás editar hasta que sea aprobada o rechazada.'
    },
    en: {
      title: 'D4 - Root Cause Analysis',
      subtitle: 'Stage 2 - Identification of the root cause of the problem',

      // Timer
      slaTimer: 'D4 SLA Timer',
      timeRemaining: 'Time Remaining',
      overdue: 'OVERDUE',
      slaTarget: 'SLA Target',
      hours: 'hours',

      rootCause: 'Root Cause',
      rootCausePlaceholder: 'Describe the identified root cause of the problem...',
      analysisTechnique: 'Analysis Technique',
      techniqueNone: 'None',
      technique5Whys: '5 Whys',
      techniqueFishbone: 'Fishbone Diagram',
      techniqueBoth: 'Both',
      potentialCauses: 'Identified Potential Causes',
      addCause: 'Add Cause',

      markComplete: 'Mark D4 as Complete',
      mustMarkComplete: 'You must mark D4 as complete before sending to approval',
      saveDraft: 'Save Draft',
      sendToApproval: 'Send to Approval',
      saving: 'Saving...',
      sending: 'Sending...',
      blocked: 'This section is blocked. Only the primary responsible can edit when under review.',
      required: 'Required field',
      confirmSendToApproval: 'Are you sure you want to send D4 for approval? Once sent, you will not be able to edit until it is approved or rejected.'
    }
  };

  const t = translations[language] || translations.es;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ========== 4M EVALUATION TABLE HANDLERS ==========

  const add4MEvaluation = () => {
    const newEval = {
      id: Date.now().toString(),
      category: 'Mano de obra',
      controlPoint: '',
      standard: '',
      documentControl: '',
      reality: '',
      standardJudgment: 'OK',
      qualityJudgment: 'OK',
      comment: '',
      evidence: []
    };
    setFormData(prev => ({
      ...prev,
      d4_4mEvaluation: [...prev.d4_4mEvaluation, newEval]
    }));
  };

  const update4MEvaluation = (id, field, value) => {
    setFormData(prev => {
      const updated = prev.d4_4mEvaluation.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Auto-sync with 5 Whys table
          const hasNG = updatedItem.standardJudgment === 'NG' || updatedItem.qualityJudgment === 'NG';
          const existsIn5Whys = prev.d4_5whysAnalysis.some(w => w.evaluationId === id);

          if (hasNG && !existsIn5Whys) {
            // Add to 5 Whys
            const new5Why = {
              evaluationId: id,
              factorNG: `${updatedItem.category} - ${updatedItem.controlPoint}`,
              why1: '',
              why2: '',
              why3: '',
              why4: '',
              why5: '',
              rootCause: ''
            };
            prev.d4_5whysAnalysis.push(new5Why);
          } else if (!hasNG && existsIn5Whys) {
            // Remove from 5 Whys if changed back to OK
            prev.d4_5whysAnalysis = prev.d4_5whysAnalysis.filter(w => w.evaluationId !== id);
          } else if (hasNG && existsIn5Whys) {
            // Update factorNG text if control point changed
            prev.d4_5whysAnalysis = prev.d4_5whysAnalysis.map(w =>
              w.evaluationId === id
                ? { ...w, factorNG: `${updatedItem.category} - ${updatedItem.controlPoint}` }
                : w
            );
          }

          return updatedItem;
        }
        return item;
      });

      return { ...prev, d4_4mEvaluation: updated };
    });
  };

  const remove4MEvaluation = (id) => {
    setFormData(prev => ({
      ...prev,
      d4_4mEvaluation: prev.d4_4mEvaluation.filter(item => item.id !== id),
      d4_5whysAnalysis: prev.d4_5whysAnalysis.filter(item => item.evaluationId !== id)
    }));
  };

  const handle4MEvidence = async (id, files) => {
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('token');
    const uploadedFiles = [];

    for (const file of files) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      try {
        const response = await axios.post('http://localhost:5000/upload/evidence', formDataUpload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.url) {
          uploadedFiles.push({
            fileName: response.data.name || file.name,
            fileUrl: response.data.url,
            uploadedBy: currentUser?.name || currentUser?.email || 'Usuario',
            uploadedAt: response.data.uploadedAt || new Date().toISOString()
          });

          // Log to audit
          try {
            const reportId = data?.id;
            if (reportId) {
              await axios.post(`http://localhost:5000/8d/reports/${reportId}/audit-log`, {
                actionType: 'file_uploaded',
                actionCategory: 'section',
                sectionName: 'd4',
                userName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Sistema',
                description: `Archivo subido en D4: ${file.name}`,
                newValue: { fileName: file.name, fileType: file.type }
              }, { headers: { 'Authorization': `Bearer ${token}` } });
            }
          } catch (logError) {
            console.error('Error logging file upload:', logError);
          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        showError(` Error al subir ${file.name}`);
      }
    }

    if (uploadedFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        d4_4mEvaluation: prev.d4_4mEvaluation.map(item => {
          if (item.id === id) {
            return {
              ...item,
              evidence: [...(item.evidence || []), ...uploadedFiles]
            };
          }
          return item;
        })
      }));
      showSuccess(` ${uploadedFiles.length} archivo(s) subido(s) correctamente`);
    }
  };

  const remove4MEvidence = (evaluationId, fileIndex) => {
    setFormData(prev => ({
      ...prev,
      d4_4mEvaluation: prev.d4_4mEvaluation.map(item => {
        if (item.id === evaluationId) {
          const newEvidence = [...(item.evidence || [])];
          newEvidence.splice(fileIndex, 1);
          return { ...item, evidence: newEvidence };
        }
        return item;
      })
    }));
  };

  // ========== 5 WHYS TABLE HANDLERS ==========

  const update5Whys = (evaluationId, field, value) => {
    setFormData(prev => ({
      ...prev,
      d4_5whysAnalysis: prev.d4_5whysAnalysis.map(item =>
        item.evaluationId === evaluationId
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  // Save as draft (without strict validations) - for 4M and 5 Why sections
  const handleSaveDraft = async () => {
    if (isFormBlocked) {
      showError(' Esta sección está bloqueada. Solo el responsable principal puede editar cuando está bajo contestación.');
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate({
        ...formData,
        d4Completed: false, // Keep as draft
        d4DelayHistory: delayHistory
      });
      showSuccess('Borrador guardado ');
    } catch (error) {
      console.error('Error saving draft:', error);
      showError(' Error al guardar borrador');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isFormBlocked) {
      showError(' Esta sección está bloqueada. Solo el responsable principal puede editar cuando está bajo contestación.');
      return;
    }

    // Validation
    if (!formData.d4RootCause.trim()) {
      showError(' Debes describir la causa raíz del problema');
      return;
    }

    // Validation for delay reason when overdue
    if (timeRemaining && timeRemaining.isOverdue && delayHistory.length === 0) {
      showError(' Debes proporcionar una razón del atraso ya que se excedió el tiempo SLA');
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate({
        ...formData,
        d4Completed: formData.d4Completed,
        d4DelayHistory: delayHistory
      });
      showSuccess(' D4 guardada exitosamente');
    } catch (error) {
      console.error('Error saving D4:', error);
      showError(' Error al guardar D4');
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
      showError(' Esta sección está bloqueada. Solo el responsable principal puede editar cuando está bajo contestación.');
      return;
    }

    // Validation
    if (!formData.d4RootCause.trim()) {
      showError(' Debes describir la causa raíz del problema antes de enviar a aprobación');
      return;
    }

    // Validation for delay reason when overdue
    if (timeRemaining && timeRemaining.isOverdue && delayHistory.length === 0) {
      showError(' Debes proporcionar una razón del atraso ya que se excedió el tiempo SLA');
      return;
    }

    // Check if D4 is marked as complete
    if (!formData.d4Completed) {
      showError(` ${t.mustMarkComplete}`);
      return;
    }

    // Confirm before sending to approval
    if (!window.confirm(t.confirmSendToApproval)) {
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Save form data (without approval fields)
      await onDataUpdate({
        ...formData,
        d4Completed: true,
        d4DelayHistory: delayHistory
        // DO NOT include d4Status or d4CurrentApprovalStep
      });

      // Step 2: Send to approval via dedicated endpoint
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/8d/reports/${data.id}/d4/send-to-approval`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Abrir mailto para notificar al aprobador
        if (response.data.emailNotification) {
          openMailtoFromNotification(response.data.emailNotification);
        }
        showSuccess(' D4 enviada a aprobación exitosamente');
        // Reload page while preserving reportId parameter
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('t', Date.now());
        window.location.href = window.location.pathname + '?' + searchParams.toString();
      }
    } catch (error) {
      console.error('Error sending D4 to approval:', error);
      showError(' Error al enviar D4 a aprobación');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Approve action (for approvers only)
  const handleApprove = async () => {
    if (!window.confirm(
      language === 'es'
        ? '¿Confirmas que deseas APROBAR esta sección D4?'
        : 'Do you confirm that you want to APPROVE this D4 section?'
    )) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/8d/reports/${data.id}/d4/approve`,
        { action: 'approve', comments: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Abrir mailto si hay notificación de email
        if (response.data.emailNotification) {
          openMailtoFromNotification(response.data.emailNotification);
        }
        showSuccess(language === 'es' ? ' D4 aprobada exitosamente' : ' D4 approved successfully');
        // Reload page while preserving reportId parameter
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('t', Date.now());
        window.location.href = window.location.pathname + '?' + searchParams.toString();
      }
    } catch (error) {
      console.error('Error approving D4:', error);
      showError(language === 'es' ? ' Error al aprobar D4' : ' Error approving D4');
    }
  };

  // Handle Reject action (for approvers only - MANDATORY comments)
  const handleReject = async () => {
    const comments = prompt(
      language === 'es'
        ? 'RECHAZO - Por favor ingrese el motivo (obligatorio):'
        : 'REJECT - Please enter the reason (required):'
    );

    if (!comments || comments.trim() === '') {
      showError(language === 'es' ? ' El comentario es obligatorio para rechazar' : ' Comments are required to reject');
      return;
    }

    if (!window.confirm(
      language === 'es'
        ? '¿Confirmas que deseas RECHAZAR esta sección D4 y devolverla al responsable principal?'
        : 'Do you confirm that you want to REJECT this D4 section and return it to the primary responsible?'
    )) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/8d/reports/${data.id}/d4/approve`,
        { action: 'reject', comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Abrir mailto para notificar al responsable del rechazo
        if (response.data.emailNotification) {
          openMailtoFromNotification(response.data.emailNotification);
        }
        showSuccess(language === 'es' ? ' D4 rechazada. Devuelta al responsable principal.' : ' D4 rejected. Returned to primary responsible.');
        // Reload page while preserving reportId parameter
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('t', Date.now());
        window.location.href = window.location.pathname + '?' + searchParams.toString();
      }
    } catch (error) {
      console.error('Error rejecting D4:', error);
      showError(language === 'es' ? ' Error al rechazar D4' : ' Error rejecting D4');
    }
  };

  // Handle revert to draft (Admin only)
  // Handle revert to draft (Admin only) - Creates new revision
  const handleRevertToDraft = async () => {
    if (!revertComments || revertComments.trim() === '') {
      showWarning(language === 'es' ? 'El comentario es obligatorio' : 'Comments are required');
      return;
    }

    // Confirm action
    const confirmMsg = language === 'es'
      ? '⚠️ ATENCIÓN: Esta acción archivará el documento actual y creará una NUEVA REVISIÓN editable.\n\nEl documento actual quedará bloqueado como referencia histórica.\n\n¿Desea continuar?'
      : '⚠️ WARNING: This action will archive the current document and create a NEW REVISION.\n\nThe current document will be locked as historical reference.\n\nDo you want to continue?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsReverting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/8d/reports/${data.id}/revert-to-draft`,
        { comments: revertComments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newRevisionId = response.data.data.newRevision.reportId;
        const newDbId = response.data.data.newRevision.id;
        showSuccess(language === 'es'
          ? `Documento archivado. Nueva revisión ${newRevisionId} creada.`
          : `Document archived. New revision ${newRevisionId} created.`);
        setShowRevertModal(false);
        setRevertComments('');
        // Redirect to new revision
        window.location.href = `/8d-workflow?reportId=${newDbId}`;
      } else {
        showError('Error: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showError(language === 'es' ? 'Error al revertir a borrador' : 'Error reverting to draft');
    } finally {
      setIsReverting(false);
    }
  };

  const styles = {
    container: {
      padding: '24px',
      width: '100%',
      margin: '0 auto'
    },
    header: {
      marginBottom: '24px',
      borderBottom: `2px solid ${themeColors.accent}`,
      paddingBottom: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: '8px'
    },
    disciplineHeader: {
      backgroundColor: '#0F3B5F',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      marginTop: '30px',
      fontSize: '18px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    section: {
      backgroundColor: themeColors.bg,
      padding: '24px',
      borderRadius: '8px',
      marginBottom: '24px',
      border: `1px solid ${themeColors.bgPanel}`
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: themeColors.textMuted,
      marginBottom: '8px'
    },
    required: {
      color: themeColors.error,
      marginLeft: '4px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      backgroundColor: themeColors.bgCard,
      boxSizing: 'border-box'
    },
    addButton: {
      padding: '10px 20px',
      backgroundColor: themeColors.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    actionItem: {
      backgroundColor: themeColors.bgCard,
      padding: '16px',
      borderRadius: '6px',
      marginBottom: '12px',
      border: `1px solid ${themeColors.bgPanel}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    actionContent: {
      flex: 1
    },
    actionHeader: {
      fontWeight: '500',
      color: themeColors.text,
      marginBottom: '8px'
    },
    actionMeta: {
      fontSize: '12px',
      color: themeColors.textMuted,
      display: 'flex',
      gap: '16px'
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
    checkbox: {
      marginRight: '8px',
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: themeColors.textMuted,
      cursor: 'pointer'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '32px',
      marginBottom: '32px'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: themeColors.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    blockedOverlay: {
      position: 'relative',
      opacity: 0.6,
      pointerEvents: 'none'
    },
    blockedMessage: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: '#B00020',
      fontSize: '14px',
      fontWeight: '500'
    },
    tableHeader: {
      padding: '12px 8px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '12px',
      color: themeColors.textMuted,
      borderBottom: `2px solid ${themeColors.border}`
    },
    tableCell: {
      padding: '8px',
      verticalAlign: 'top',
      borderBottom: `1px solid ${themeColors.bgPanel}`
    }
  };

  // Timer colors based on status
  const getTimerColors = () => {
    switch (timeStatus) {
      case 'ok':
        return { bg: '#d1fae5', border: '#2E7D32', text: '#065f46', icon: '' };
      case 'warning':
        return { bg: '#fef3c7', border: '#C77700', text: '#92400e', icon: '' };
      case 'critical':
        return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '' };
      case 'overdue':
        return { bg: '#1f2937', border: '#B00020', text: '#ffffff', icon: '' };
      default:
        return { bg: '#F4F6F8', border: '#9ca3af', text: '#374151', icon: '' };
    }
  };

  const timerColors = getTimerColors();

  return (
    <div style={styles.container}>
      {/* Auto-save runs silently in background - no visual indicator */}

      <div style={styles.header}>
        <div style={styles.title}> {t.title}</div>
        <div style={{ fontSize: '14px', color: themeColors.textMuted, marginTop: '8px' }}>{t.subtitle}</div>
      </div>


      {/* SLA Timer - Shows countdown when pending, or completion status when approved */}
      {data && (data.d4Status === 'approved' ? (
        // APPROVED STATE - Show completion status
        (() => {
          const createdDate = new Date(data.createdAt);
          const slaHours = data.d4ResponseTimeHours || 24;
          const deadlineDate = new Date(createdDate.getTime() + slaHours * 60 * 60 * 1000);

          // Find the last approval timestamp
          const lastApprovalAt = approvalHistory.approval3?.at || approvalHistory.approval2?.at || approvalHistory.approval1?.at;
          const completedDate = lastApprovalAt ? new Date(lastApprovalAt) : new Date();

          // Calculate elapsed time from creation to completion
          const elapsedMs = completedDate.getTime() - createdDate.getTime();
          const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
          const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

          // Was it on time?
          const wasOnTime = completedDate <= deadlineDate;

          // Calculate overdue time if late
          const overdueMs = Math.max(0, completedDate.getTime() - deadlineDate.getTime());
          const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
          const overdueMinutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));

          return (
            <div style={{
              backgroundColor: wasOnTime ? '#d1fae5' : '#fef3c7',
              border: `3px solid ${wasOnTime ? '#2E7D32' : '#C77700'}`,
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: wasOnTime ? '#065f46' : '#92400e',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {wasOnTime ? '' : ''} {t.slaTimer} - CERRADO
                </div>
                <div style={{
                  fontSize: '12px',
                  color: wasOnTime ? '#065f46' : '#92400e',
                  opacity: 0.8
                }}>
                  {t.slaTarget}: {slaHours} {t.hours}
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: wasOnTime ? '#065f46' : '#92400e',
                  marginBottom: '4px'
                }}>
                  {wasOnTime ? ' CERRADO A TIEMPO' : ' CERRADO FUERA DE TIEMPO'}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: wasOnTime ? '#2E7D32' : '#C77700',
                  fontFamily: 'monospace'
                }}>
                  {wasOnTime
                    ? `Completado en ${elapsedHours}h ${elapsedMinutes}min`
                    : `Retraso: +${overdueHours}h ${overdueMinutes}min`
                  }
                </div>
                {lastApprovalAt && (
                  <div style={{ fontSize: '11px', color: themeColors.textMuted, marginTop: '4px' }}>
                    Aprobado: {new Date(lastApprovalAt).toLocaleString('es-MX')}
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : timeRemaining && (
        // PENDING STATE - Show countdown
        <div style={{
          backgroundColor: timerColors.bg,
          border: `3px solid ${timerColors.border}`,
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: timeStatus === 'overdue' ? 'pulse 2s infinite' : 'none'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: timerColors.text,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {timerColors.icon} {t.slaTimer}
            </div>
            <div style={{
              fontSize: '12px',
              color: timerColors.text,
              opacity: 0.8
            }}>
              {t.slaTarget}: {data.d4ResponseTimeHours || 24} {t.hours}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            {timeRemaining.isOverdue ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: timerColors.text,
                  fontFamily: 'monospace'
                }}>
                  {t.overdue}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: timerColors.text,
                  marginTop: '4px',
                  fontFamily: 'monospace'
                }}>
                  +{timeRemaining.days} días : {String(timeRemaining.hours).padStart(2, '0')} Hr : {String(timeRemaining.minutes).padStart(2, '0')} min : {String(timeRemaining.seconds).padStart(2, '0')} seg
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: timerColors.text,
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}>
                  {t.timeRemaining}
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: timerColors.text,
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}>
                  {timeRemaining.days} días : {String(timeRemaining.hours).padStart(2, '0')} Hr : {String(timeRemaining.minutes).padStart(2, '0')} min : {String(timeRemaining.seconds).padStart(2, '0')} seg
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div style={{
              width: '120px',
              height: '12px',
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1px solid ${timerColors.border}`
            }}>
              <div style={{
                width: `${timeRemaining.isOverdue ? 0 : timeRemaining.percentRemaining}%`,
                height: '100%',
                backgroundColor: timerColors.border,
                transition: 'width 1s linear'
              }}></div>
            </div>
          </div>
        </div>
      ))}

      {/* Sistema de razones de atraso con historial y fechas compromiso */}
      {timeRemaining && timeRemaining.isOverdue && (
        <div style={{
          marginTop: '16px',
          padding: '20px',
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '8px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#B00020',
            marginBottom: '16px',
            marginTop: 0
          }}>
             Razones de Atraso y Fechas Compromiso
          </h4>

          {/* Historial de atrasos anteriores */}
          {delayHistory.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7f1d1d', marginBottom: '10px' }}>
                 Historial de Atrasos:
              </h5>
              {delayHistory.map((entry, index) => {
                const isExpired = new Date(entry.commitmentDate) < new Date();
                const isLastEntry = index === delayHistory.length - 1;

                return (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: isLastEntry && isExpired ? '#fff7ed' : '#fff',
                      border: `1px solid ${isLastEntry && isExpired ? '#fb923c' : '#fca5a5'}`,
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7f1d1d' }}>
                        Atraso #{index + 1}
                      </span>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {new Date(entry.createdAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {entry.userName && (
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                         <span style={{ fontWeight: '600' }}>{entry.userName}</span>
                        {entry.userEmail && <span style={{ color: '#999' }}> ({entry.userEmail})</span>}
                      </div>
                    )}
                    <p style={{ fontSize: '13px', color: '#333', margin: '0 0 8px 0' }}>
                      {entry.reason}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      <span style={{ color: isExpired ? '#ea580c' : '#2E7D32' }}>
                         Fecha compromiso: {new Date(entry.commitmentDate).toLocaleDateString('es-MX')}
                        {isExpired && isLastEntry && '  VENCIDA'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario para nueva razón de atraso */}
          {(() => {
            const canAddNew = delayHistory.length === 0 ||
              new Date(delayHistory[delayHistory.length - 1].commitmentDate) < new Date();

            return canAddNew ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fff',
                border: '2px dashed #fca5a5',
                borderRadius: '6px'
              }}>
                <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: '#B00020', marginTop: 0, marginBottom: '12px' }}>
                  {delayHistory.length === 0 ? ' Nueva Razón de Atraso' : ' Actualizar Razón de Atraso (Fecha compromiso vencida)'}
                </h5>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#7f1d1d',
                    marginBottom: '6px'
                  }}>
                    Razón del Atraso <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={currentDelayReason}
                    onChange={(e) => setCurrentDelayReason(e.target.value)}
                    placeholder="Ejemplo: Esperando análisis de laboratorio externo. El proveedor ha confirmado entrega para el día..."
                    style={{
                      width: '100%',
                      minHeight: '70px',
                      padding: '10px',
                      fontSize: '13px',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#7f1d1d',
                    marginBottom: '6px'
                  }}>
                     Fecha Compromiso <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={currentCommitmentDate}
                    onChange={(e) => setCurrentCommitmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '4px', marginBottom: 0 }}>
                    * Fecha en la que se compromete a resolver el atraso
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (!currentDelayReason.trim()) {
                      showError(' Debes proporcionar una razón del atraso');
                      return;
                    }
                    if (!currentCommitmentDate) {
                      showError(' Debes establecer una fecha compromiso');
                      return;
                    }

                    const newEntry = {
                      reason: currentDelayReason,
                      commitmentDate: currentCommitmentDate,
                      createdAt: new Date().toISOString(),
                      isResolved: false,
                      userId: currentUser.id,
                      userName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
                      userEmail: currentUser.email
                    };

                    const updatedHistory = [...delayHistory, newEntry];

                    setIsSaving(true);
                    try {
                      await onDataUpdate({
                        ...formData,
                        d4DelayHistory: updatedHistory
                      });
                      setDelayHistory(updatedHistory);
                      setCurrentDelayReason('');
                      setCurrentCommitmentDate('');
                      showSuccess(' Razón de atraso guardada exitosamente');
                    } catch (error) {
                      console.error('Error saving delay reason:', error);
                      showError(' Error al guardar el comentario');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#B00020',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.6 : 1,
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => !isSaving && (e.target.style.backgroundColor = '#B00020')}
                  onMouseLeave={(e) => !isSaving && (e.target.style.backgroundColor = '#B00020')}
                >
                  {isSaving ? ' Guardando...' : ' Guardar Razón de Atraso'}
                </button>
              </div>
            ) : (
              <div style={{
                padding: '12px',
                backgroundColor: '#d1fae5',
                border: '1px solid #34d399',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '13px', color: '#065f46', margin: 0 }}>
                   Esperando fecha compromiso ({new Date(delayHistory[delayHistory.length - 1].commitmentDate).toLocaleDateString('es-MX')})
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {isBlocked && (
        <div style={styles.blockedMessage}>
           {t.blocked}
        </div>
      )}

      <div style={isBlocked ? styles.blockedOverlay : {}}>

        {/* ============================================================ */}
        {/* 4M EVALUATION TABLE */}
        {/* ============================================================ */}
        <div id="d4-4m" style={{...styles.section, marginTop: '32px', scrollMarginTop: '20px'}}>
          <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: themeColors.text}}>
             Evaluación 4M - Análisis de Factores
          </h3>
          <p style={{fontSize: '13px', color: themeColors.textMuted, marginBottom: '20px'}}>
            Evalúa los puntos de control por categoría (Mano de obra, Máquina, Material, Método, Medición, Medio Ambiente)
          </p>

          {/* Table */}
          <div style={{overflowX: 'auto', marginBottom: '16px'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{backgroundColor: themeColors.bg}}>
                  <th style={{...styles.tableHeader, width: '120px'}}>Categoría</th>
                  <th style={{...styles.tableHeader, width: '150px'}}>Punto de Control</th>
                  <th style={{...styles.tableHeader, width: '100px'}}>Norma</th>
                  <th style={{...styles.tableHeader, width: '120px'}}>Documento</th>
                  <th style={{...styles.tableHeader, width: '100px'}}>Real</th>
                  <th style={{...styles.tableHeader, width: '90px'}}>Juicio STD</th>
                  <th style={{...styles.tableHeader, width: '90px'}}>Juicio CAL</th>
                  <th style={{...styles.tableHeader, width: '150px'}}>Comentario</th>
                  <th style={{...styles.tableHeader, width: '100px'}}>Evidencia</th>
                  <th style={{...styles.tableHeader, width: '60px'}}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {formData.d4_4mEvaluation.map((item, index) => (
                  <tr key={item.id} style={{borderBottom: '1px solid #E6EAEE'}}>
                    <td style={styles.tableCell}>
                      <select
                        style={{...styles.select, padding: '6px', fontSize: '12px'}}
                        value={item.category}
                        onChange={(e) => update4MEvaluation(item.id, 'category', e.target.value)}
                        disabled={isFormBlocked}
                      >
                        <option value="Mano de obra">Mano de obra</option>
                        <option value="Máquina">Máquina</option>
                        <option value="Material">Material</option>
                        <option value="Método">Método</option>
                        <option value="Medición">Medición</option>
                        <option value="Medio Ambiente">Medio Ambiente</option>
                      </select>
                    </td>
                    <td style={styles.tableCell}>
                      <input
                        type="text"
                        style={{...styles.input, padding: '6px', fontSize: '12px'}}
                        value={item.controlPoint}
                        onChange={(e) => update4MEvaluation(item.id, 'controlPoint', e.target.value)}
                        placeholder="Punto de control"
                        disabled={isFormBlocked}
                      />
                    </td>
                    <td style={styles.tableCell}>
                      <input
                        type="text"
                        style={{...styles.input, padding: '6px', fontSize: '12px'}}
                        value={item.standard}
                        onChange={(e) => update4MEvaluation(item.id, 'standard', e.target.value)}
                        placeholder="Norma"
                        disabled={isFormBlocked}
                      />
                    </td>
                    <td style={styles.tableCell}>
                      <input
                        type="text"
                        style={{...styles.input, padding: '6px', fontSize: '12px'}}
                        value={item.documentControl}
                        onChange={(e) => update4MEvaluation(item.id, 'documentControl', e.target.value)}
                        placeholder="Documento"
                        disabled={isFormBlocked}
                      />
                    </td>
                    <td style={styles.tableCell}>
                      <input
                        type="text"
                        style={{...styles.input, padding: '6px', fontSize: '12px'}}
                        value={item.reality}
                        onChange={(e) => update4MEvaluation(item.id, 'reality', e.target.value)}
                        placeholder="Real"
                        disabled={isFormBlocked}
                      />
                    </td>
                    <td style={styles.tableCell}>
                      <select
                        style={{
                          ...styles.select,
                          padding: '6px',
                          fontSize: '12px',
                          backgroundColor: item.standardJudgment === 'NG' ? '#fee2e2' : '#f0fdf4',
                          color: item.standardJudgment === 'NG' ? '#B00020' : '#16a34a',
                          fontWeight: '600'
                        }}
                        value={item.standardJudgment}
                        onChange={(e) => update4MEvaluation(item.id, 'standardJudgment', e.target.value)}
                        disabled={isFormBlocked}
                      >
                        <option value="OK"> OK</option>
                        <option value="NG"> NG</option>
                      </select>
                    </td>
                    <td style={styles.tableCell}>
                      <select
                        style={{
                          ...styles.select,
                          padding: '6px',
                          fontSize: '12px',
                          backgroundColor: item.qualityJudgment === 'NG' ? '#fee2e2' : '#f0fdf4',
                          color: item.qualityJudgment === 'NG' ? '#B00020' : '#16a34a',
                          fontWeight: '600'
                        }}
                        value={item.qualityJudgment}
                        onChange={(e) => update4MEvaluation(item.id, 'qualityJudgment', e.target.value)}
                        disabled={isFormBlocked}
                      >
                        <option value="OK"> OK</option>
                        <option value="NG"> NG</option>
                      </select>
                    </td>
                    <td style={styles.tableCell}>
                      <input
                        type="text"
                        style={{...styles.input, padding: '6px', fontSize: '12px'}}
                        value={item.comment}
                        onChange={(e) => update4MEvaluation(item.id, 'comment', e.target.value)}
                        placeholder="Comentario"
                        disabled={isFormBlocked}
                      />
                    </td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {/* Lista de archivos subidos */}
                        {item.evidence && item.evidence.length > 0 && (
                          <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                            {item.evidence.map((file, fileIndex) => (
                              <div key={fileIndex} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0072CE', textDecoration: 'underline', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={file.fileName}
                                >
                                  {file.fileName}
                                </a>
                                {!isFormBlocked && (
                                  <button
                                    onClick={() => remove4MEvidence(item.id, fileIndex)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0' }}
                                    title="Eliminar"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Input file oculto */}
                        <input
                          type="file"
                          id={`evidence-4m-${item.id}`}
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            handle4MEvidence(item.id, Array.from(e.target.files));
                            e.target.value = '';
                          }}
                          disabled={isFormBlocked}
                        />
                        {/* Label como botón */}
                        {!isFormBlocked && (
                          <label
                            htmlFor={`evidence-4m-${item.id}`}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              backgroundColor: '#0072CE',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-block'
                            }}
                          >
                             Subir
                          </label>
                        )}
                      </div>
                    </td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>
                      <button
                        onClick={() => remove4MEvaluation(item.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '18px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        disabled={isFormBlocked}
                      >
                        
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={add4MEvaluation}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2E7D32',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              disabled={isFormBlocked}
            >
              + Agregar Punto de Control
            </button>

            <button
              style={{
                ...styles.saveButton,
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving || isFormBlocked ? 'not-allowed' : 'pointer'
              }}
              onClick={handleSaveDraft}
              disabled={isSaving || isFormBlocked}
            >
              {isSaving ? ' Guardando...' : ' Guardar Evaluación 4M'}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5 WHYS ANALYSIS TABLE (Only NG items) */}
        {/* ============================================================ */}
        {formData.d4_5whysAnalysis.length > 0 && (
          <div id="d4-5whys" style={{...styles.section, marginTop: '32px', backgroundColor: '#fef2f2', border: '2px solid #fca5a5', scrollMarginTop: '20px'}}>
            <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#B00020'}}>
               Análisis 5 Whys - No Conformidades
            </h3>
            <p style={{fontSize: '13px', color: '#991b1b', marginBottom: '20px'}}>
              Análisis de causa raíz para los factores marcados como NG
            </p>

            {/* Table */}
            <div style={{overflowX: 'auto', marginBottom: '16px'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: themeColors.bgCard}}>
                <thead>
                  <tr style={{backgroundColor: '#fee2e2'}}>
                    <th style={{...styles.tableHeader, minWidth: '150px'}}>Factor NG</th>
                    <th style={{...styles.tableHeader, minWidth: '140px'}}>1. ¿Por qué?</th>
                    <th style={{...styles.tableHeader, minWidth: '140px'}}>2. ¿Por qué?</th>
                    <th style={{...styles.tableHeader, minWidth: '140px'}}>3. ¿Por qué?</th>
                    <th style={{...styles.tableHeader, minWidth: '140px'}}>4. ¿Por qué?</th>
                    <th style={{...styles.tableHeader, minWidth: '140px'}}>5. ¿Por qué?</th>
                    <th style={{...styles.tableHeader, minWidth: '160px'}}>Causa Raíz</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.d4_5whysAnalysis.map((item, index) => (
                    <tr key={item.evaluationId} style={{borderBottom: '1px solid #E6EAEE'}}>
                      <td style={{...styles.tableCell, fontWeight: '600', color: '#B00020'}}>
                         {item.factorNG}
                      </td>
                      <td style={styles.tableCell}>
                        <textarea
                          style={{...styles.textarea, padding: '6px', fontSize: '12px', minHeight: '60px'}}
                          value={item.why1}
                          onChange={(e) => update5Whys(item.evaluationId, 'why1', e.target.value)}
                          placeholder="¿Por qué ocurrió?"
                          disabled={isFormBlocked}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <textarea
                          style={{...styles.textarea, padding: '6px', fontSize: '12px', minHeight: '60px'}}
                          value={item.why2}
                          onChange={(e) => update5Whys(item.evaluationId, 'why2', e.target.value)}
                          placeholder="¿Por qué?"
                          disabled={isFormBlocked}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <textarea
                          style={{...styles.textarea, padding: '6px', fontSize: '12px', minHeight: '60px'}}
                          value={item.why3}
                          onChange={(e) => update5Whys(item.evaluationId, 'why3', e.target.value)}
                          placeholder="¿Por qué?"
                          disabled={isFormBlocked}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <textarea
                          style={{...styles.textarea, padding: '6px', fontSize: '12px', minHeight: '60px'}}
                          value={item.why4}
                          onChange={(e) => update5Whys(item.evaluationId, 'why4', e.target.value)}
                          placeholder="¿Por qué?"
                          disabled={isFormBlocked}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <textarea
                          style={{...styles.textarea, padding: '6px', fontSize: '12px', minHeight: '60px'}}
                          value={item.why5}
                          onChange={(e) => update5Whys(item.evaluationId, 'why5', e.target.value)}
                          placeholder="¿Por qué?"
                          disabled={isFormBlocked}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <textarea
                          style={{...styles.textarea, padding: '6px', fontSize: '12px', minHeight: '60px', backgroundColor: '#fef3c7', fontWeight: '600'}}
                          value={item.rootCause}
                          onChange={(e) => update5Whys(item.evaluationId, 'rootCause', e.target.value)}
                          placeholder="Causa raíz identificada"
                          disabled={isFormBlocked}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button for 5 Whys */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{
                  ...styles.saveButton,
                  opacity: isSaving ? 0.6 : 1,
                  cursor: isSaving || isFormBlocked ? 'not-allowed' : 'pointer'
                }}
                onClick={handleSaveDraft}
                disabled={isSaving || isFormBlocked}
              >
                {isSaving ? ' Guardando...' : ' Guardar Análisis 5 Whys'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROOT CAUSE SUMMARY - FINAL CONCLUSION */}
        {/* ============================================================ */}
        <div id="d4-resumen" style={{...styles.section, marginTop: '32px', backgroundColor: '#f0fdf4', border: '2px solid #86efac', scrollMarginTop: '20px'}}>
          <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#166534'}}>
             Resumen de Análisis de Causa Raíz
          </h3>
          <p style={{fontSize: '13px', color: '#15803d', marginBottom: '20px'}}>
            Conclusión final del análisis. Resume la causa raíz principal identificada.
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              {t.rootCause}
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={styles.textarea}
              value={formData.d4RootCause}
              onChange={(e) => handleInputChange('d4RootCause', e.target.value)}
              placeholder={t.rootCausePlaceholder}
              disabled={isFormBlocked}
              rows="4"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d4Completed}
                onChange={(e) => handleInputChange('d4Completed', e.target.checked)}
                disabled={isFormBlocked}
              />
              {t.markComplete}
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          {/* Mensaje cuando está completamente aprobado */}
          {data?.d4Status === 'approved' ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{
                padding: '12px 24px',
                backgroundColor: '#dcfce7',
                border: '2px solid #22c55e',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#166534',
                textAlign: 'center',
                fontWeight: 'bold',
                flex: 1
              }}>
                D4 COMPLETAMENTE APROBADO. Puede continuar con D5.
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowRevertModal(true)}
                  style={{
                    ...styles.saveButton,
                    backgroundColor: '#dc2626',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                  {language === 'es' ? 'Regresar a Borrador' : 'Revert to Draft'}
                </button>
              )}
            </div>
          ) : null}

          {/* Show SAVE/SEND buttons for primary user OR admin when NOT approved and NOT under review */}
          {data?.d4Status !== 'approved' && data?.d4Status !== 'under_review' && (isPrimaryUser() || isAdmin) && (
            <>
              {/* Save Draft Button */}
              <button
                onClick={handleSave}
                disabled={isFormBlocked || isSaving || isSending}
                style={{
                  ...styles.saveButton,
                  backgroundColor: '#6b7280',
                  opacity: isFormBlocked || isSaving || isSending ? 0.5 : 1,
                  cursor: isFormBlocked || isSaving || isSending ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isFormBlocked && !isSaving && !isSending) {
                    e.target.style.backgroundColor = '#4b5563';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFormBlocked && !isSaving && !isSending) {
                    e.target.style.backgroundColor = '#6b7280';
                  }
                }}
              >
                {isSaving ? t.saving : t.saveDraft}
              </button>

              {/* Send to Approval Button */}
              <button
                onClick={handleSendToApproval}
                disabled={isFormBlocked || isSaving || isSending}
                style={{
                  ...styles.saveButton,
                  backgroundColor: '#2E7D32',
                  opacity: isFormBlocked || isSaving || isSending ? 0.5 : 1,
                  cursor: isFormBlocked || isSaving || isSending ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isFormBlocked && !isSaving && !isSending) {
                    e.target.style.backgroundColor = '#2E7D32';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFormBlocked && !isSaving && !isSending) {
                    e.target.style.backgroundColor = '#2E7D32';
                  }
                }}
              >
                {isSending ? t.sending : t.sendToApproval}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Approval Status Section - D4 (Based on D1-D2-D3 Component) */}
      {data && data.escalationPath && (
        <div id="d4-aprobacion" style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #C77700',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          scrollMarginTop: '20px'
        }}>
          <h3 style={{
            fontSize: '17px',
            fontWeight: 'bold',
            color: '#92400e',
            marginTop: 0,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
             Estado de Aprobación D4 - Análisis de Causa Raíz
          </h3>

          {/* Current Step Indicator */}
          {/* Current Step Indicator - Only show configured approvers */}
          {(() => {
            const countermeasureUsers = data?.escalationPath?.countermeasure_users || data?.escalation_path?.countermeasure_users || [];
            // Get configured approvers (indices 1, 2, 3 that have values)
            const configuredApprovers = [1, 2, 3].filter(step => {
              const approver = countermeasureUsers[step];
              // Handle both formats: direct ID or object with user_id
              return approver !== undefined && approver !== null;
            });

            // If no approvers configured, show message
            if (configuredApprovers.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '12px', color: themeColors.textMuted, fontSize: '13px' }}>
                  No hay aprobadores configurados para D4
                </div>
              );
            }

            return (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                {configuredApprovers.map(step => {
                  const isPast = step < d4CurrentStep;
                  const isCurrent = step === d4CurrentStep;
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
                        border: isCurrent ? '3px solid #0072CE' : `1px solid ${themeColors.border}`,
                        backgroundColor: isPast
                          ? approvalData?.status === 'approved' ? '#dcfce7' : '#fee2e2'
                          : isCurrent ? '#dbeafe' : '#FAFBFC',
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
                        <div style={{ fontSize: '11px', color: '#0072CE', marginBottom: '4px' }}>
                          {approverEmail}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: themeColors.textMuted }}>
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

          {/* Approval History - Only show configured approvers */}
          {/* Approval History - Full Audit Trail */}
          {d4ApprovalHistory.length > 0 && (
            <div style={{
              backgroundColor: themeColors.bgCard,
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '15px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Historial de Aprobaciones D4 ({d4ApprovalHistory.length} registros):
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {d4ApprovalHistory.map((entry, index) => {
                  const isApproved = entry.actionType === 'approved';
                  const isRejected = entry.actionType === 'rejected';
                  const isSubmitted = entry.actionType === 'submitted_for_approval';

                  return (
                    <div key={entry.id || index} style={{
                      marginBottom: '10px',
                      padding: '10px',
                      backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fef2f2' : '#f0f9ff',
                      borderLeft: `4px solid ${isApproved ? '#22c55e' : isRejected ? '#ef4444' : '#3b82f6'}`,
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#1e40af' }}>
                          {entry.userName || 'Usuario'}
                        </strong>
                        <span style={{ fontSize: '11px', color: themeColors.textMuted }}>
                          {entry.createdAt && new Date(entry.createdAt).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {isApproved && <span style={{ color: '#166534' }}>Aprobado</span>}
                        {isRejected && <span style={{ color: '#991b1b' }}>Rechazado</span>}
                        {isSubmitted && <span style={{ color: '#1e40af' }}>Enviado a Aprobacion</span>}
                        {entry.description && (
                          <span style={{ marginLeft: '8px', color: themeColors.textMuted }}>
                            - {entry.description}
                          </span>
                        )}
                      </div>
                      {entry.newValue && typeof entry.newValue === 'object' && entry.newValue.comments && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px',
                          backgroundColor: '#fef3c7',
                          borderLeft: '3px solid #C77700',
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

          {/* Approve/Reject Buttons - Only visible to current approver when under review */}
          {data?.d4Status === 'under_review' && isCurrentApprover() && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleApprove}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#16a34a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#22c55e';
                }}
              >
                 Aprobar
              </button>
              <button
                onClick={handleReject}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#B00020';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                 Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================== ESCALATION PATH - D4 ================== */}
      {data && (
        <div style={{
          marginTop: '30px',
          backgroundColor: '#f0f9ff',
          border: '2px solid #0072CE',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#0F3B5F',
            marginTop: 0,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Escalation Path - D4 (Countermeasure Section)
          </h3>
          {(() => {
            const countermeasureUsers = data?.escalationPath?.countermeasure_users || data?.escalation_path?.countermeasure_users || [];

            if (countermeasureUsers.length === 0) {
              return (
                <div style={{ color: '#ef4444', fontSize: '13px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                  No hay usuarios asignados. Configure el Escalation Path en la sección "Countermeasure (D4-D5-D6)" del tab D1-D2-D3.
                </div>
              );
            }

            const getUserInfo = (userId) => {
              if (!userId) return null;
              const user = users.find(u => u.id === userId);
              const name = user
                ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                : `ID: ${userId}`;
              const email = user?.email || '';
              const position = user?.position || user?.cargo || '';
              return { name, email, position };
            };

            const roles = [
              { index: 0, label: 'Responsable', color: '#7c3aed', bgColor: '#f5f3ff', borderColor: '#c4b5fd' },
              { index: 1, label: 'Aprobador 1', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' },
              { index: 2, label: 'Aprobador 2', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' },
              { index: 3, label: 'Aprobador 3', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' }
            ];

            return (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {roles.map(({ index, label, color, bgColor, borderColor }) => {
                  const userId = countermeasureUsers[index];
                  if (!userId) return null;
                  const info = getUserInfo(userId);
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
                      <div style={{ fontSize: '11px', color: themeColors.textMuted, marginBottom: '4px', fontWeight: '600' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color }}>
                        {info.name}
                      </div>
                      {info.email && (
                        <div style={{ fontSize: '12px', color: '#0072CE', marginTop: '2px' }}>
                          {info.email}
                        </div>
                      )}
                      {info.position && (
                        <div style={{ fontSize: '11px', color: themeColors.textMuted, marginTop: '2px' }}>
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              {language === 'es' ? 'Regresar D4 a Borrador' : 'Revert D4 to Draft'}
            </h3>

            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
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
                  backgroundColor: isReverting || !revertComments.trim() ? '#9ca3af' : '#dc2626',
                  color: 'white',
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
    </div>
  );
};

export default D4ContainmentRootCause;
