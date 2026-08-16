import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import GanttChart from './GanttChart';
import D7Validation from './D7Validation';
import { getCurrentUser, isUserAdmin } from '../../utils/permissions';
// UX Improvements (MEJORAS)
import CollapsibleSection from './CollapsibleSection';
import ApprovalStepper from './ApprovalStepper';
import SectionProgressIndicator from './SectionProgressIndicator';

const D5D6D7Countermeasures = ({ data, onDataUpdate, language = 'es', isBlocked = false, activeSection, isReadOnly = false }) => {
  const { theme: themeColors } = useTheme();
  const { t: tr, language: ctxLanguage, changeLanguage } = useLanguage();
  const { showSuccess, showError, showWarning } = useToast();

  // Get current user from centralized utility
  const currentUser = getCurrentUser();
  const isAdmin = isUserAdmin(currentUser);

  const [formData, setFormData] = useState({
    // D6 - Contramedida Definitiva
    d6CountermeasureDescription: '', // Descripción general de la contramedida
    d6DefinitiveActions: [], // Plan de implementación (acciones pequeñas)
    d6ImplementationPlan: null,
    d6ValidationPlan: null,
    d6Completed: false,

    // D6 - Evidencia Antes/Después (movido desde D7)
    beforeCondition: '',
    afterCondition: '',
    beforePhotos: [],
    afterPhotos: [],

    // D6 - Validación de Contramedidas (movido desde D7)
    d3Implemented: null,
    d3Effective: null,
    d3SpcJudgment: '',
    d3ClientJudgment: '',
    d3Comments: '',
    d5Implemented: null,
    d5Effective: null,
    d5SpcJudgment: '',
    d5ClientJudgment: '',
    d5Comments: '',

    // D7 - Confirmación de Contramedidas
    d7TemporaryValidation: '',
    d7DefinitiveValidation: '',
    d7ValidationEvidence: '',
    d7IsEffective: null,
    d7ValidationDate: '',
    d7Completed: false
  });

  const [users, setUsers] = useState([]);
  const [d6ApprovalHistory, setD6ApprovalHistory] = useState([]);
  const [d7ApprovalHistory, setD7ApprovalHistory] = useState([]);

  // Revert to draft modal state (Admin only) - D6
  const [showRevertModalD6, setShowRevertModalD6] = useState(false);
  const [revertCommentsD6, setRevertCommentsD6] = useState('');
  const [isRevertingD6, setIsRevertingD6] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingD6, setIsSendingD6] = useState(false);
  const [isSendingD7, setIsSendingD7] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'gantt'
  const [expandedActions, setExpandedActions] = useState({}); // Control de expansión de progreso diario
  const [collapsedHistory, setCollapsedHistory] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem(`d6_collapsed_history_${data?.id || 'temp'}`);
    return saved ? JSON.parse(saved) : {};
  }); // Control de colapso del historial {actionId: boolean}
  const [dailyEntries, setDailyEntries] = useState({}); // Formularios de entrada diaria {actionId: {date, progress}}
  const [newDefinitiveAction, setNewDefinitiveAction] = useState({
    action: '',
    result: '',
    responsible: null,
    priority: 'media', // alta, media, baja
    startDate: '',
    endDate: '',
    plannedProgress: 0, // Calculado automáticamente según fechas
    actualProgress: 0,  // Progreso acumulado total
    dailyProgress: [],  // Array de {date, progress, accumulated}
    evidenceFiles: []   // Archivos de evidencia de implementación
  });
  const [showAddActionForm, setShowAddActionForm] = useState(false); // Mostrar/ocultar formulario de agregar acción

  // Helper to convert legacy C/NC values to OK/NOK
  const normalizeJudgment = (value) => {
    if (value === 'C') return 'OK';
    if (value === 'NC') return 'NOK';
    return value || '';
  };

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

  // Load approval history from audit log
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      if (!data?.id) return;

      try {
        const token = localStorage.getItem('token');

        // Fetch D6 approval history
        const d6Response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/audit-log?actionCategory=approval&sectionName=d6`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const d6Result = await d6Response.json();
        if (d6Result.success) {
          setD6ApprovalHistory(d6Result.auditLog || []);
        }

        // Fetch D7 approval history
        const d7Response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/audit-log?actionCategory=approval&sectionName=d7`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const d7Result = await d7Response.json();
        if (d7Result.success) {
          setD7ApprovalHistory(d7Result.auditLog || []);
        }
      } catch (error) {
        console.error('Error fetching approval history:', error);
      }
    };

    fetchApprovalHistory();
  }, [data?.id]);

  // Calcular progreso planeado basado en fechas (función helper)
  const calcPlanned = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < start) return 0;
    if (today > end) return 100;
    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const daysPassed = (today - start) / (1000 * 60 * 60 * 24);
    return Math.round((daysPassed / totalDays) * 100);
  };

  // Sync action from Workload - fetch latest data from workload if linked
  const syncActionFromWorkload = async (action, reportId) => {
    if (!action.workloadActivityId) return action;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/workload/activities/${action.workloadActivityId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const result = await response.json();

      if (result.success && result.activity) {
        const wa = result.activity;
        // Merge workload data into action (workload takes priority for progress and evidence)
        // Combine evidence from both sources, avoiding duplicates
        const existingEvidence = action.evidenceFiles || [];
        const workloadEvidence = wa.evidence_files || [];
        const combinedEvidence = [...existingEvidence];

        // Add workload evidence that doesn't exist in D6
        // Workload files have: { id, serverName, originalName, mimeType, size, uploadedAt, uploadedBy }
        workloadEvidence.forEach(wFile => {
          const wFilename = wFile.serverName || wFile.filename;
          const exists = existingEvidence.some(eFile =>
            eFile.filename === wFilename ||
            eFile.serverName === wFilename ||
            (eFile.workloadFileId && eFile.workloadFileId === wFile.id)
          );
          if (!exists) {
            // Build URL for workload evidence - use the download endpoint
            const downloadUrl = `/workload/activities/${action.workloadActivityId}/evidence/${wFile.id}/download`;
            combinedEvidence.push({
              name: wFile.originalName || wFile.file_name || wFile.name || 'Archivo',
              filename: wFilename,
              serverName: wFile.serverName,
              url: downloadUrl,
              type: wFile.mimeType || wFile.file_type || wFile.type,
              size: wFile.size || wFile.file_size,
              uploadedAt: wFile.uploadedAt || wFile.uploaded_at,
              uploadedBy: wFile.uploadedBy,
              workloadFileId: wFile.id,
              source: 'workload'
            });
          }
        });

        return {
          ...action,
          actualProgress: wa.progress || action.actualProgress,
          dailyProgress: wa.daily_progress || action.dailyProgress,
          actualHours: wa.actual_hours || action.actualHours,
          evidenceFiles: combinedEvidence
        };
      }
    } catch (error) {
      console.error('Error syncing from workload:', error);
    }
    return action;
  };

  // Load data from props, sync with workload, and load photos from d7-validation
  useEffect(() => {
    const loadAndSync = async () => {
      // Always load D6/D7 data when data exists, not just when there are actions
      if (data) {
        // Normalize actions if they exist
        let syncedActions = [];
        if (data.d6DefinitiveActions && data.d6DefinitiveActions.length > 0) {
          const normalizedActions = data.d6DefinitiveActions.map(action => ({
            ...action,
            dailyProgress: action.dailyProgress || [],
            actualProgress: action.actualProgress || 0,
            workloadActivityId: action.workloadActivityId || null
          }));

          // Sync each action from workload if it has a workloadActivityId
          const reportId = data?.reportId || data?.report_id || data?.id;
          syncedActions = await Promise.all(
            normalizedActions.map(action => syncActionFromWorkload(action, reportId))
          );
        }

        // Load before/after photos, conditions, and countermeasure validation from d7-validation endpoint
        let loadedBeforePhotos = [];
        let loadedAfterPhotos = [];
        let loadedBeforeCondition = '';
        let loadedAfterCondition = '';
        // Countermeasure validation fields
        let loadedD3Implemented = null;
        let loadedD3Effective = null;
        let loadedD3SpcJudgment = '';
        let loadedD3ClientJudgment = '';
        let loadedD3Comments = '';
        let loadedD5Implemented = null;
        let loadedD5Effective = null;
        let loadedD5SpcJudgment = '';
        let loadedD5ClientJudgment = '';
        let loadedD5Comments = '';
        if (data.id) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(
              `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const result = await response.json();
            if (result.success && result.data) {
              // Load validation text fields
              if (result.data.validation) {
                const v = result.data.validation;
                console.log('📥 D6 Countermeasure Validation loaded from d7-validation:', {
                  d3Implemented: v.d3_implemented,
                  d3Effective: v.d3_effective,
                  d3SpcJudgment: v.d3_spc_judgment,
                  d5Implemented: v.d5_implemented,
                  d5SpcJudgment: v.d5_spc_judgment
                });
                loadedBeforeCondition = v.before_condition || '';
                loadedAfterCondition = v.after_condition || '';
                // Load countermeasure validation fields
                loadedD3Implemented = v.d3_implemented;
                loadedD3Effective = v.d3_effective;
                loadedD3SpcJudgment = normalizeJudgment(v.d3_spc_judgment);
                loadedD3ClientJudgment = normalizeJudgment(v.d3_client_judgment);
                loadedD3Comments = v.d3_comments || '';
                loadedD5Implemented = v.d5_implemented;
                loadedD5Effective = v.d5_effective;
                loadedD5SpcJudgment = normalizeJudgment(v.d5_spc_judgment);
                loadedD5ClientJudgment = normalizeJudgment(v.d5_client_judgment);
                loadedD5Comments = v.d5_comments || '';
              }
              // Load photos
              if (result.data.validationFiles) {
                const files = result.data.validationFiles;
                loadedBeforePhotos = files.filter(f => f.file_type === 'before_photo');
                loadedAfterPhotos = files.filter(f => f.file_type === 'after_photo');
              }
            }
          } catch (error) {
            console.error('Error loading D7 validation data:', error);
          }
        }

        setFormData({
          // D6
          d6CountermeasureDescription: data.d6CountermeasureDescription || '',
          d6DefinitiveActions: syncedActions,
          d6ImplementationPlan: data.d6ImplementationPlan || null,
          d6ValidationPlan: data.d6ValidationPlan || null,
          d6Completed: data.d6Completed || false,

          // D6 - Evidencia Antes/Después (loaded from d7-validation)
          beforeCondition: loadedBeforeCondition,
          afterCondition: loadedAfterCondition,
          beforePhotos: loadedBeforePhotos,
          afterPhotos: loadedAfterPhotos,

          // D6 - Validación de Contramedidas (loaded from d7-validation)
          d3Implemented: loadedD3Implemented,
          d3Effective: loadedD3Effective,
          d3SpcJudgment: loadedD3SpcJudgment,
          d3ClientJudgment: loadedD3ClientJudgment,
          d3Comments: loadedD3Comments,
          d5Implemented: loadedD5Implemented,
          d5Effective: loadedD5Effective,
          d5SpcJudgment: loadedD5SpcJudgment,
          d5ClientJudgment: loadedD5ClientJudgment,
          d5Comments: loadedD5Comments,

          // D7
          d7TemporaryValidation: data.d7TemporaryValidation || '',
          d7DefinitiveValidation: data.d7DefinitiveValidation || '',
          d7ValidationEvidence: data.d7ValidationEvidence || '',
          d7IsEffective: data.d7IsEffective || null,
          d7ValidationDate: data.d7ValidationDate || '',
          d7Completed: data.d7Completed || false
        });
      }
    };

    loadAndSync();
  }, [data, users]);

  const translations = {
    es: {
      title: 'D6-D7 - Contramedidas y Confirmación',

      // D6
      d6Title: 'D6 - Contramedida Definitiva',
      d6Subtitle: 'Solución permanente para eliminar la causa raíz',
      countermeasureDescription: 'Contramedida Definitiva',
      countermeasureDescriptionPlaceholder: 'Describe la solución permanente que eliminará la causa raíz del problema...',
      implementationPlanTitle: 'Plan de Implementación',
      definitiveActions: 'Acciones Definitivas',
      addAction: 'Agregar',
      action: 'Acción',
      actionPlaceholder: 'Describe la acción...',
      result: 'Resultado',
      resultPlaceholder: 'Describe el resultado esperado...',
      responsible: 'Responsable',
      priority: 'Prioridad',
      priorityHigh: 'Alta',
      priorityMedium: 'Media',
      priorityLow: 'Baja',
      startDate: 'Fecha Inicio',
      endDate: 'Fecha Fin',
      plannedProgress: 'Planeado (%)',
      actualProgress: 'Real (%)',
      updateProgress: 'Actualizar Avance',
      dailyProgressTitle: 'Progreso Diario',
      showDailyProgress: 'Ver Progreso Diario',
      hideDailyProgress: 'Ocultar Progreso Diario',
      addDailyEntry: 'Agregar Progreso',
      date: 'Fecha',
      progressAmount: 'Avance (%)',
      accumulated: 'Acumulado',
      noDailyProgress: 'No hay progreso registrado',
      compliance: 'Cumplimiento',
      noActions: 'No hay acciones definitivas registradas',
      implementationPlan: 'Plan de Implementación',
      implementationPlanPlaceholder: 'Describe el plan detallado de implementación...',
      validationPlan: 'Plan de Validación',
      validationPlanPlaceholder: 'Describe cómo se validará la efectividad...',
      viewTable: 'Vista Lista',
      viewGantt: 'Vista Gantt',
      ganttDay: 'Día',
      ganttWeek: 'Semana',
      ganttMonth: 'Mes',

      // D7
      d7Title: 'D7 - Confirmación de Contramedidas',
      d7Subtitle: 'Validación de la efectividad de las contramedidas',
      temporaryValidation: 'Validación de Contramedida Temporal',
      temporaryValidationPlaceholder: 'Describe los resultados de la validación temporal...',
      definitiveValidation: 'Validación de Contramedida Definitiva',
      definitiveValidationPlaceholder: 'Describe los resultados de la validación definitiva...',
      validationEvidence: 'Evidencia de Validación',
      validationEvidencePlaceholder: 'Adjunta o describe la evidencia de validación...',
      isEffective: '¿Las contramedidas fueron efectivas?',
      yes: 'Sí',
      no: 'No',
      validationDate: 'Fecha de Validación',

      markD6Complete: 'Marcar D6 como Completada',
      markD7Complete: 'Marcar D7 como Completada',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      blocked: 'Esta sección está bloqueada hasta que D5 esté completada',
      required: 'Campo requerido',
      remove: 'Eliminar'
    },
    en: {
      title: 'D6-D7 - Countermeasures and Confirmation',

      d6Title: 'D6 - Definitive Countermeasure',
      d6Subtitle: 'Permanent solution to eliminate root cause',
      countermeasureDescription: 'Definitive Countermeasure',
      countermeasureDescriptionPlaceholder: 'Describe the permanent solution that will eliminate the root cause of the problem...',
      implementationPlanTitle: 'Implementation Plan',
      definitiveActions: 'Definitive Actions',
      addAction: 'Add',
      action: 'Action',
      actionPlaceholder: 'Describe the action...',
      result: 'Result',
      resultPlaceholder: 'Describe the expected result...',
      responsible: 'Responsible',
      priority: 'Priority',
      priorityHigh: 'High',
      priorityMedium: 'Medium',
      priorityLow: 'Low',
      startDate: 'Start Date',
      endDate: 'End Date',
      plannedProgress: 'Planned (%)',
      actualProgress: 'Actual (%)',
      updateProgress: 'Update Progress',
      dailyProgressTitle: 'Daily Progress',
      showDailyProgress: 'Show Daily Progress',
      hideDailyProgress: 'Hide Daily Progress',
      addDailyEntry: 'Add Progress',
      date: 'Date',
      progressAmount: 'Progress (%)',
      accumulated: 'Accumulated',
      noDailyProgress: 'No progress recorded',
      compliance: 'Compliance',
      noActions: 'No definitive actions recorded',
      implementationPlan: 'Implementation Plan',
      implementationPlanPlaceholder: 'Describe the detailed implementation plan...',
      validationPlan: 'Validation Plan',
      validationPlanPlaceholder: 'Describe how effectiveness will be validated...',
      viewTable: 'Table View',
      viewGantt: 'Gantt View',
      ganttDay: 'Day',
      ganttWeek: 'Week',
      ganttMonth: 'Month',

      d7Title: 'D7 - Countermeasures Confirmation',
      d7Subtitle: 'Validation of countermeasures effectiveness',
      temporaryValidation: 'Temporary Countermeasure Validation',
      temporaryValidationPlaceholder: 'Describe temporary validation results...',
      definitiveValidation: 'Definitive Countermeasure Validation',
      definitiveValidationPlaceholder: 'Describe definitive validation results...',
      validationEvidence: 'Validation Evidence',
      validationEvidencePlaceholder: 'Attach or describe validation evidence...',
      isEffective: 'Were the countermeasures effective?',
      yes: 'Yes',
      no: 'No',
      validationDate: 'Validation Date',

      markD6Complete: 'Mark D6 as Complete',
      markD7Complete: 'Mark D7 as Complete',
      save: 'Save Changes',
      saving: 'Saving...',
      blocked: 'This section is blocked until D5 is completed',
      required: 'Required field',
      remove: 'Remove'
    }
  };

  const t = translations[language] || translations.es;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calcular progreso planeado basado en fechas
  const calculatePlannedProgress = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < start) return 0;
    if (today > end) return 100;

    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const daysPassed = (today - start) / (1000 * 60 * 60 * 24);
    return Math.round((daysPassed / totalDays) * 100);
  };

  const handleAddDefinitiveAction = () => {
    if (!newDefinitiveAction.action.trim()) {
      showError(' Debes describir la acción');
      return;
    }

    const action = {
      id: Date.now(),
      action: newDefinitiveAction.action,
      result: newDefinitiveAction.result,
      responsible: newDefinitiveAction.responsible,
      priority: newDefinitiveAction.priority,
      startDate: newDefinitiveAction.startDate || '',
      endDate: newDefinitiveAction.endDate || '',
      plannedProgress: calculatePlannedProgress(newDefinitiveAction.startDate, newDefinitiveAction.endDate),
      actualProgress: 0, // Inicia en 0, el usuario lo actualiza
      dailyProgress: [], // Historial de progreso diario
      evidenceFiles: []  // Archivos de evidencia
    };

    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: [...prev.d6DefinitiveActions, action]
    }));

    setNewDefinitiveAction({
      action: '',
      result: '',
      responsible: null,
      priority: 'media',
      startDate: '',
      endDate: '',
      plannedProgress: 0,
      actualProgress: 0,
      dailyProgress: [],
      evidenceFiles: []
    });

    // Ocultar el formulario después de agregar
    setShowAddActionForm(false);
  };

  const handleRemoveDefinitiveAction = async (id) => {
    const action = formData.d6DefinitiveActions.find(a => a.id === id);
    if (!action) return;

    const hasActivities = action.dailyProgress && action.dailyProgress.length > 0;

    let confirmMessage = ` ¿Estás seguro de eliminar esta acción?\n\n"${action.action || action.description}"\n\n`;

    if (hasActivities) {
      confirmMessage += ` ATENCIÓN: Esta acción tiene ${action.dailyProgress.length} actividad${action.dailyProgress.length === 1 ? '' : 'es'} registrada${action.dailyProgress.length === 1 ? '' : 's'}.\n\n`;
    }

    if (action.workloadActivityId) {
      confirmMessage += ' Esta acción está vinculada a Workload y quedará marcada como cancelada.\n\n';
    }

    confirmMessage += 'Esta acción NO se puede deshacer.';

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) return;

    // Cancelar en Workload si está vinculada
    if (action.workloadActivityId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/workload/activities/${action.workloadActivityId}/cancel`,
          {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
      } catch (error) {
        console.error('Error cancelando actividad en Workload:', error);
      }
    }

    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: prev.d6DefinitiveActions.filter(a => a.id !== id)
    }));

    showSuccess(' Acción eliminada');
  };

  const handleUpdateDefinitiveAction = useCallback((id, updates) => {
    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: prev.d6DefinitiveActions.map(action =>
        action.id === id ? { ...action, ...updates } : action
      )
    }));
  }, []);

  // Handle file upload for evidence
  const handleFileUploadD6 = async (actionId, files) => {
    if (!files || files.length === 0) return;

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d6-evidence/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error uploading files');
      }

      const result = await response.json();

      if (result.success && result.files) {
        // Add uploaded files to the action
        setFormData(prev => ({
          ...prev,
          d6DefinitiveActions: prev.d6DefinitiveActions.map(action =>
            action.id === actionId
              ? {
                  ...action,
                  evidenceFiles: [...(action.evidenceFiles || []), ...result.files]
                }
              : action
          )
        }));

        showSuccess(` ${result.files.length} archivo(s) subido(s) correctamente`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      showError(' Error al subir archivos');
    }
  };

  // Remove evidence file from D6 action
  const removeEvidenceFileD6 = async (actionId, fileIndex) => {
    const action = formData.d6DefinitiveActions.find(a => a.id === actionId);
    const file = action?.evidenceFiles?.[fileIndex];

    if (!file || !file.filename) {
      // If no filename (old format), just remove from state
      setFormData(prev => ({
        ...prev,
        d6DefinitiveActions: prev.d6DefinitiveActions.map(action =>
          action.id === actionId
            ? {
                ...action,
                evidenceFiles: action.evidenceFiles.filter((_, index) => index !== fileIndex)
              }
            : action
        )
      }));
      showSuccess(' Evidencia eliminada');
      return;
    }

    try {
      // Delete file from server
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d6-evidence/${file.filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error deleting file from server');
      }

      // Remove from state
      setFormData(prev => ({
        ...prev,
        d6DefinitiveActions: prev.d6DefinitiveActions.map(action =>
          action.id === actionId
            ? {
                ...action,
                evidenceFiles: action.evidenceFiles.filter((_, index) => index !== fileIndex)
              }
            : action
        )
      }));

      showSuccess(' Evidencia eliminada');
    } catch (error) {
      console.error('Error deleting file:', error);
      showError(' Error al eliminar archivo');
    }
  };

  // Helper: Convertir string YYYY-MM-DD a Date en zona horaria local (evita problemas de UTC)
  const parseLocalDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Agregar progreso diario
  const handleAddDailyProgress = (actionId) => {
    const entry = dailyEntries[actionId];
    if (!entry || !entry.date || entry.progress === undefined || entry.progress === '') {
      showError(' Debes ingresar una fecha y un progreso');
      return;
    }

    const progress = parseFloat(entry.progress);
    if (progress < 0 || progress > 100) {
      showError(' El progreso debe estar entre 0 y 100');
      return;
    }

    // Buscar la acción para verificar si ya existe la fecha
    const action = formData.d6DefinitiveActions.find(a => a.id === actionId);
    const dailyProgress = action?.dailyProgress || [];
    const existingIndex = dailyProgress.findIndex(d => d.date === entry.date);

    // Si ya existe una entrada para esta fecha, mostrar alerta
    if (existingIndex >= 0) {
      const existingEntry = dailyProgress[existingIndex];
      const confirm = window.confirm(
        ` Ya existe una actividad registrada para ${parseLocalDate(entry.date).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}:\n\n` +
        `Progreso actual: ${existingEntry.progress}%\n` +
        `Actividades: ${existingEntry.activities || 'Sin descripción'}\n\n` +
        `¿Deseas ACTUALIZAR esta actividad con los nuevos datos?\n\n` +
        `Si quieres mantener la actividad original, presiona "Cancelar" y elige otra fecha.`
      );

      if (!confirm) {
        return; // Usuario canceló, no hacer nada
      }
    }

    setFormData(prev => ({
      ...prev,
      d6DefinitiveActions: prev.d6DefinitiveActions.map(action => {
        if (action.id === actionId) {
          const dailyProgress = action.dailyProgress || [];

          // Verificar si ya existe una entrada para esta fecha
          const existingIndex = dailyProgress.findIndex(d => d.date === entry.date);
          let newDailyProgress;

          if (existingIndex >= 0) {
            // Actualizar entrada existente
            newDailyProgress = [...dailyProgress];
            newDailyProgress[existingIndex] = {
              ...newDailyProgress[existingIndex],
              progress: progress,
              activities: entry.activities || ''
            };
          } else {
            // Agregar nueva entrada
            newDailyProgress = [...dailyProgress, {
              date: entry.date,
              progress: progress,
              accumulated: 0, // Se calculará después
              activities: entry.activities || ''
            }];
          }

          // Ordenar por fecha
          newDailyProgress.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

          // Recalcular acumulados
          let accumulated = 0;
          newDailyProgress = newDailyProgress.map(d => {
            accumulated += d.progress;
            return { ...d, accumulated: Math.min(100, accumulated) };
          });

          // Actualizar progreso total
          const totalProgress = newDailyProgress.length > 0
            ? newDailyProgress[newDailyProgress.length - 1].accumulated
            : 0;

          return {
            ...action,
            dailyProgress: newDailyProgress,
            actualProgress: totalProgress
          };
        }
        return action;
      })
    }));

    // Limpiar formulario y cerrar el panel
    setDailyEntries(prev => ({
      ...prev,
      [actionId]: { date: new Date().toISOString().split('T')[0], progress: '', activities: '' }
    }));
    setExpandedActions(prev => ({
      ...prev,
      [actionId]: false
    }));

    showSuccess(' Actividad agregada correctamente');
  };

  // Toggle expansión del panel de progreso diario
  const toggleExpandAction = (actionId) => {
    setExpandedActions(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));

    // Inicializar entrada diaria si no existe
    if (!dailyEntries[actionId]) {
      const today = new Date().toISOString().split('T')[0];
      setDailyEntries(prev => ({
        ...prev,
        [actionId]: { date: today, progress: '' }
      }));
    }
  };

  // Check if current user is the approver for D6
  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
  const isCurrentApproverD6 = () => {
    if (!data) return false;

    // Try both camelCase and snake_case
    const escalationPath = data.escalationPath || data.escalation_path;
    if (!escalationPath) return false;

    const countermeasureUsers = escalationPath.countermeasure_users || escalationPath.countermeasureUsers;
    if (!countermeasureUsers || !Array.isArray(countermeasureUsers)) return false;

    const currentStep = data.d6CurrentApprovalStep || data.d6_current_approval_step || 0;

    // Effective step: if status is under_review but step is 0, assume step 1
    const d6Status = data.d6Status || data.d6_status || 'draft';
    const effectiveStep = (d6Status === 'under_review' && currentStep === 0)
      ? 1
      : currentStep;

    if (effectiveStep < 1 || effectiveStep > 3) return false;

    const expectedApprover = countermeasureUsers[effectiveStep];
    const expectedApproverId = typeof expectedApprover === 'object' ? expectedApprover.id : expectedApprover;
    return currentUser.id === expectedApproverId;
  };

  // Check if current user is the primary responsible for D6
  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
  const isPrimaryUserD6 = () => {
    if (!data) return false;

    // Try both camelCase and snake_case
    const escalationPath = data.escalationPath || data.escalation_path;
    if (!escalationPath) return false;

    const countermeasureUsers = escalationPath.countermeasure_users || escalationPath.countermeasureUsers;
    if (!countermeasureUsers || !Array.isArray(countermeasureUsers)) return false;

    const primaryUser = countermeasureUsers[0];
    const primaryUserId = typeof primaryUser === 'object' ? primaryUser.id : primaryUser;
    return currentUser.id === primaryUserId;
  };

  // Determine if D6 form should be blocked for editing
  // Admins can ALWAYS edit regardless of status
  const isD6FormBlocked = isAdmin ? false : (
    data?.d6Status === 'under_review' ||
    data?.d6Status === 'approved' ||
    !isPrimaryUserD6()
  );

  // Photos upload is less restricted - only block if approved (admins can always upload)
  const isD6PhotoUploadBlocked = isAdmin ? false : data?.d6Status === 'approved';

  // Check if current user is authorized for D7 (Calidad/Confirmation users)
  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
  const isAuthorizedForD7 = () => {
    if (!data) return false;

    // Try both camelCase and snake_case
    const escalationPath = data.escalationPath || data.escalation_path;
    if (!escalationPath) return false;

    const confirmationUsers = escalationPath.confirmation_users || escalationPath.confirmationUsers;
    if (!confirmationUsers || !Array.isArray(confirmationUsers)) return false;

    // Check if current user is in confirmation_users array (any of the 4 positions: primary + 3 approvers)
    return confirmationUsers.some(user =>
      typeof user === 'object' ? user.id === currentUser.id : user === currentUser.id
    );
  };

  // Determine if D7 form should be blocked for editing
  const isD7FormBlocked = !isAuthorizedForD7();

  // Upload before/after photos
  const uploadBeforePhoto = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'before_photo');

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation/upload-file`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Error uploading file');

      const result = await response.json();

      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          beforePhotos: [...(prev.beforePhotos || []), result.data]
        }));
        showSuccess(' Foto ANTES subida correctamente');
      }
    } catch (error) {
      console.error('Error uploading before photo:', error);
      showError(' Error al subir foto ANTES');
    }
  };

  const uploadAfterPhoto = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'after_photo');

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation/upload-file`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Error uploading file');

      const result = await response.json();

      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          afterPhotos: [...(prev.afterPhotos || []), result.data]
        }));
        showSuccess(' Foto DESPUÉS subida correctamente');
      }
    } catch (error) {
      console.error('Error uploading after photo:', error);
      showError(' Error al subir foto DESPUÉS');
    }
  };

  const deleteBeforePhoto = async (fileId) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation/files/${fileId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Error deleting file');

      setFormData(prev => ({
        ...prev,
        beforePhotos: prev.beforePhotos.filter(f => f.id !== fileId)
      }));
      showSuccess(' Foto eliminada');
    } catch (error) {
      console.error('Error deleting before photo:', error);
      showError(' Error al eliminar foto');
    }
  };

  const deleteAfterPhoto = async (fileId) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation/files/${fileId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Error deleting file');

      setFormData(prev => ({
        ...prev,
        afterPhotos: prev.afterPhotos.filter(f => f.id !== fileId)
      }));
      showSuccess(' Foto eliminada');
    } catch (error) {
      console.error('Error deleting after photo:', error);
      showError(' Error al eliminar foto');
    }
  };

  const handleSave = async () => {
    if (isBlocked) {
      showError(' Esta sección está bloqueada hasta que D5 esté completada');
      return;
    }

    setIsSaving(true);
    try {
      // Save D6/D7 data via onDataUpdate
      await onDataUpdate(formData);

      // Also save beforeCondition/afterCondition and countermeasure validation to d7-validation endpoint
      if (data?.id) {
        const token = localStorage.getItem('token');
        await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              beforeCondition: formData.beforeCondition,
              afterCondition: formData.afterCondition,
              // Countermeasure validation fields
              d3Implemented: formData.d3Implemented,
              d3Effective: formData.d3Effective,
              d3SpcJudgment: formData.d3SpcJudgment,
              d3ClientJudgment: formData.d3ClientJudgment,
              d3Comments: formData.d3Comments,
              d5Implemented: formData.d5Implemented,
              d5Effective: formData.d5Effective,
              d5SpcJudgment: formData.d5SpcJudgment,
              d5ClientJudgment: formData.d5ClientJudgment,
              d5Comments: formData.d5Comments
            })
          }
        );
      }

      showSuccess(' D6-D7 guardadas exitosamente');
    } catch (error) {
      console.error('Error saving D6-D7:', error);
      showError(' Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Sync a single D6 action to Workload
  const syncActionToWorkload = async (action, reportId) => {
    try {
      const token = localStorage.getItem('token');

      // Transform D6 evidence files to workload format
      // IMPORTANT: Only send files that were uploaded in D6, not files that came from Workload
      const evidenceForWorkload = (action.evidenceFiles || [])
        .filter(file => file.source !== 'workload' && !file.workloadFileId)
        .map(file => ({
          file_name: file.name,
          filename: file.filename,
          file_url: file.url,
          file_type: file.type,
          file_size: file.size,
          uploaded_at: file.uploadedAt,
          source: '8D'
        }));

      const response = await fetch('http://localhost:5000/workload/activities/sync-8d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workload_activity_id: action.workloadActivityId || null,
          report_id: reportId,
          discipline: 'D6',
          action_id: action.id,
          title: `[8D-${reportId}] ${action.action}`,
          description: action.result || action.action,
          assigned_to: action.responsible,
          start_date: action.startDate,
          end_date: action.endDate,
          priority: action.priority,
          progress: action.actualProgress || 0,
          daily_progress: action.dailyProgress || [],
          estimated_hours: action.estimatedHours || null,
          actual_hours: action.actualHours || null,
          evidence_files: evidenceForWorkload
        })
      });

      const result = await response.json();
      if (result.success) {
        return result.workload_activity_id;
      }
      return null;
    } catch (error) {
      console.error('Error syncing action to workload:', error);
      return null;
    }
  };

  // Save D6 draft with workload sync
  const handleSaveDraftD6 = async () => {
    if (isD6FormBlocked) {
      showError(' Esta sección está bloqueada. Solo el responsable principal puede editar.');
      return;
    }

    setIsSaving(true);
    try {
      // Sync each action to workload and get workload IDs
      const reportId = data?.reportId || data?.report_id || data?.id;
      console.log(' D6 Save - Report ID:', reportId);
      console.log(' D6 Save - Actions count:', formData.d6DefinitiveActions?.length || 0);

      let syncedActions = formData.d6DefinitiveActions || [];

      // Only sync if there are actions
      if (syncedActions.length > 0 && reportId) {
        console.log(' Syncing actions to Workload...');
        syncedActions = await Promise.all(
          syncedActions.map(async (action) => {
            console.log(' Syncing action:', action.id, action.action);
            const workloadId = await syncActionToWorkload(action, reportId);
            console.log(' Got workload ID:', workloadId);
            return {
              ...action,
              workloadActivityId: workloadId || action.workloadActivityId
            };
          })
        );
      } else {
        console.log(' No actions to sync or no reportId');
      }

      // Update formData with synced actions
      const updatedFormData = {
        ...formData,
        d6DefinitiveActions: syncedActions,
        d6Completed: false
      };

      setFormData(updatedFormData);
      await onDataUpdate(updatedFormData);

      // Also save beforeCondition/afterCondition and countermeasure validation to d7-validation endpoint
      if (data?.id) {
        const token = localStorage.getItem('token');
        const validationPayload = {
          beforeCondition: formData.beforeCondition,
          afterCondition: formData.afterCondition,
          // Countermeasure validation fields
          d3Implemented: formData.d3Implemented,
          d3Effective: formData.d3Effective,
          d3SpcJudgment: formData.d3SpcJudgment,
          d3ClientJudgment: formData.d3ClientJudgment,
          d3Comments: formData.d3Comments,
          d5Implemented: formData.d5Implemented,
          d5Effective: formData.d5Effective,
          d5SpcJudgment: formData.d5SpcJudgment,
          d5ClientJudgment: formData.d5ClientJudgment,
          d5Comments: formData.d5Comments
        };
        console.log('📤 D6 Saving countermeasure validation to d7-validation:', validationPayload);
        await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(validationPayload)
          }
        );
      }

      showSuccess(' Borrador D6 guardado y sincronizado con Workload');
    } catch (error) {
      console.error('Error saving D6 draft:', error);
      showError(' Error al guardar borrador D6');
    } finally {
      setIsSaving(false);
    }
  };

  // Save D7 countermeasure validation only
  const handleSaveD7Validation = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const validationPayload = {
        d3Implemented: formData.d3Implemented,
        d3Effective: formData.d3Effective,
        d3SpcJudgment: formData.d3SpcJudgment,
        d3ClientJudgment: formData.d3ClientJudgment,
        d3Comments: formData.d3Comments,
        d5Implemented: formData.d5Implemented,
        d5Effective: formData.d5Effective,
        d5SpcJudgment: formData.d5SpcJudgment,
        d5ClientJudgment: formData.d5ClientJudgment,
        d5Comments: formData.d5Comments
      };
      console.log('📤 D7 Saving countermeasure validation:', validationPayload);

      await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validationPayload)
        }
      );

      showSuccess(' Validación D7 guardada exitosamente');
    } catch (error) {
      console.error('Error saving D7 validation:', error);
      showError(' Error al guardar validación D7');
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

  // Helper function to collect all unique responsibles from D6 definitive actions
  const getResponsiblesFromD6Actions = () => {
    const responsibles = [];
    const seenIds = new Set();

    (formData.d6DefinitiveActions || []).forEach(action => {
      if (action.responsible && !seenIds.has(action.responsible)) {
        seenIds.add(action.responsible);
        const user = users.find(u => u.id === action.responsible);
        if (user && user.email) {
          responsibles.push({
            id: user.id,
            name: user.name || user.email,
            email: user.email
          });
        }
      }
    });

    return responsibles;
  };

  // Function to send mailto notification to all D6 responsibles
  const notifyD6Responsibles = () => {
    const responsibles = getResponsiblesFromD6Actions();

    if (responsibles.length === 0) {
      showWarning('No hay responsables asignados en las acciones definitivas de D6.');
      return;
    }

    const emailList = responsibles.map(r => r.email).join(';');
    const subject = `Asignacion de Actividad D6 - Reporte 8D ${data?.reportId || data?.id || ''}`;

    const bodyText = `Estimado(a),\n\n` +
      `Se le ha asignado una actividad en la seccion D6 (Contramedida Definitiva) del siguiente reporte 8D:\n\n` +
      `Reporte: ${data?.reportId || data?.id || 'N/A'}\n` +
      `Titulo: ${data?.title || 'N/A'}\n` +
      `Proveedor/Cliente: ${data?.supplier || data?.customer || 'N/A'}\n\n` +
      `Por favor consulte el detalle de su actividad asignada en el sistema:\n` +
      `http://localhost:3000/8d-workflow?reportId=${data?.id}&mode=edit\n\n` +
      `Saludos,\nSistema de Calidad`;

    const mailtoUrl = `mailto:${emailList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
  };

  // Send D6 to approval
  const handleSendToApprovalD6 = async () => {
    if (isD6FormBlocked) {
      showError(' Esta sección está bloqueada. Solo el responsable principal puede enviar a aprobación.');
      return;
    }

    // Check if D6 is marked as complete
    if (!formData.d6Completed) {
      showError(' Debes marcar D6 como completada antes de enviar a aprobación');
      return;
    }

    if (!window.confirm('¿Estás seguro de enviar D6 a aprobación? Una vez enviada, no podrás editar hasta que sea aprobada o rechazada.')) {
      return;
    }

    setIsSendingD6(true);
    try {
      // Step 1: Save form data
      await onDataUpdate({
        ...formData,
        d6Completed: true
      });

      // Also save beforeCondition/afterCondition and countermeasure validation to d7-validation endpoint
      const token = localStorage.getItem('token');
      if (data?.id) {
        await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/8d/reports/${data.id}/d7-validation`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              beforeCondition: formData.beforeCondition,
              afterCondition: formData.afterCondition,
              // Countermeasure validation fields
              d3Implemented: formData.d3Implemented,
              d3Effective: formData.d3Effective,
              d3SpcJudgment: formData.d3SpcJudgment,
              d3ClientJudgment: formData.d3ClientJudgment,
              d3Comments: formData.d3Comments,
              d5Implemented: formData.d5Implemented,
              d5Effective: formData.d5Effective,
              d5SpcJudgment: formData.d5SpcJudgment,
              d5ClientJudgment: formData.d5ClientJudgment,
              d5Comments: formData.d5Comments
            })
          }
        );
      }

      // Step 2: Send to approval via dedicated endpoint
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d6/send-to-approval`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al aprobador
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D6 enviada a aprobación exitosamente');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al enviar a aprobación');
      }
    } catch (error) {
      console.error('Error sending D6 to approval:', error);
      showError(' Error al enviar D6 a aprobación');
    } finally {
      setIsSendingD6(false);
    }
  };

  // Approve D6
  const handleApproveD6 = async () => {
    if (!window.confirm('¿Confirmas que deseas APROBAR esta sección D6?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d6/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'approve', comments: '' })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Abrir mailto si hay notificación
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D6 aprobada exitosamente');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al aprobar');
      }
    } catch (error) {
      console.error('Error approving D6:', error);
      showError(' Error al aprobar D6');
    }
  };

  // Reject D6
  const handleRejectD6 = async () => {
    const comments = prompt('RECHAZO - Por favor ingrese el motivo (obligatorio):');

    if (!comments || comments.trim() === '') {
      showError(' El comentario es obligatorio para rechazar');
      return;
    }

    if (!window.confirm('¿Confirmas que deseas RECHAZAR esta sección D6 y devolverla al responsable principal?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d6/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'reject', comments })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al responsable del rechazo
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D6 rechazada. Devuelta al responsable principal.');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al rechazar');
      }
    } catch (error) {
      console.error('Error rejecting D6:', error);
      showError(' Error al rechazar D6');
    }
  };

  // Handle revert to draft D6 (Admin only)
  // Handle revert to draft (Admin only) - Creates new revision
  const handleRevertToDraftD6 = async () => {
    if (!revertCommentsD6 || revertCommentsD6.trim() === '') {
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

    setIsRevertingD6(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/revert-to-draft`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ comments: revertCommentsD6 })
        }
      );

      const result = await response.json();

      if (result.success) {
        const newRevisionId = result.data.newRevision.reportId;
        const newDbId = result.data.newRevision.id;
        showSuccess(language === 'es'
          ? `Documento archivado. Nueva revisión ${newRevisionId} creada.`
          : `Document archived. New revision ${newRevisionId} created.`);
        setShowRevertModalD6(false);
        setRevertCommentsD6('');
        window.location.href = `/8d-workflow?reportId=${newDbId}`;
      } else {
        showError('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showError(language === 'es' ? 'Error al revertir a borrador' : 'Error reverting to draft');
    } finally {
      setIsRevertingD6(false);
    }
  };

  // ===================== D7 APPROVAL FUNCTIONS =====================

  // Send D7 to approval
  const handleSendToApprovalD7 = async () => {
    if (isD7FormBlocked) {
      showError(' No tienes permisos para enviar D7 a aprobación');
      return;
    }

    if (!window.confirm('¿Estás seguro de enviar D7 a aprobación? Una vez enviada, no podrás editar hasta que sea aprobada o rechazada.')) {
      return;
    }

    setIsSendingD7(true);
    try {
      const token = localStorage.getItem('token');

      // Step 1: Save d7_completed directly to backend
      const saveResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ d7_completed: true })
        }
      );

      if (!saveResponse.ok) {
        throw new Error('Error al guardar D7 como completada');
      }

      // Step 2: Update local state
      await onDataUpdate({
        ...formData,
        d7Completed: true
      });

      // Step 3: Send to approval via dedicated endpoint
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d7/send-to-approval`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al aprobador
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D7 enviada a aprobación exitosamente');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al enviar a aprobación');
      }
    } catch (error) {
      console.error('Error sending D7 to approval:', error);
      showError(' Error al enviar D7 a aprobación');
    } finally {
      setIsSendingD7(false);
    }
  };

  // Approve D7
  const handleApproveD7 = async () => {
    if (!window.confirm('¿Confirmas que deseas APROBAR esta sección D7?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d7/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'approve', comments: '' })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Abrir mailto si hay notificación
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D7 aprobada exitosamente');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al aprobar');
      }
    } catch (error) {
      console.error('Error approving D7:', error);
      showError(' Error al aprobar D7');
    }
  };

  // Reject D7
  const handleRejectD7 = async () => {
    const comments = prompt('RECHAZO - Por favor ingrese el motivo (obligatorio):');

    if (!comments || comments.trim() === '') {
      showError(' El comentario es obligatorio para rechazar');
      return;
    }

    if (!window.confirm('¿Confirmas que deseas RECHAZAR esta sección D7 y devolverla a Calidad?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/d7/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'reject', comments })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al responsable del rechazo
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D7 rechazada. Devuelta a Calidad.');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al rechazar');
      }
    } catch (error) {
      console.error('Error rejecting D7:', error);
      showError(' Error al rechazar D7');
    }
  };

  const styles = {
    container: {
      padding: '16px 24px',
      width: '100%',
      maxWidth: 'none'
    },
    header: {
      marginBottom: '24px',
      borderBottom: '2px solid #0072CE',
      paddingBottom: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: themeColors.text
    },
    disciplineHeader: {
      backgroundColor: themeColors.primary,
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
      border: `1px solid ${themeColors.border}`
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: themeColors.text,
      marginBottom: '8px'
    },
    required: {
      color: '#ef4444',
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
      minHeight: '100px',
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
      border: `1px solid ${themeColors.border}`,
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
    statusBadge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '500'
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
      color: themeColors.text,
      cursor: 'pointer'
    },
    radioGroup: {
      display: 'flex',
      gap: '20px'
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: themeColors.text,
      cursor: 'pointer'
    },
    radio: {
      marginRight: '6px',
      cursor: 'pointer'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
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
      backgroundColor: themeColors.bgPanel,
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: '#B00020',
      fontSize: '14px',
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            Este 8D está cerrado y es de solo lectura
          </span>
        </div>
      )}

      <div style={{ pointerEvents: isReadOnly ? 'none' : 'auto', opacity: isReadOnly ? 0.7 : 1 }}>
      <div style={styles.header}>
        <div style={styles.title}> {activeSection === 'd7' ? t.d7Title : t.d6Title}</div>
      </div>

      {isBlocked && (
        <div style={styles.blockedMessage}>
           {t.blocked}
        </div>
      )}

      <div style={isBlocked ? styles.blockedOverlay : {}}>
        {/* ================== D6 - CONTRAMEDIDA DEFINITIVA ================== */}
        {(!activeSection || activeSection === 'd6') && (
        <>
        <div id="d6-definitiva" style={{ ...styles.disciplineHeader, scrollMarginTop: '20px' }}>
          <span></span>
          <span>{t.d6Title}</span>
        </div>

        {/* Notify D6 Responsibles Button */}
        {getResponsiblesFromD6Actions().length > 0 && (
          <div style={{
            backgroundColor: themeColors.bgPanel,
            border: '2px solid #0072CE',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F3B5F', marginBottom: '4px' }}>
                 Notificar a Responsables de D6
              </h3>
              <div style={{ fontSize: '13px', color: '#0F3B5F' }}>
                {getResponsiblesFromD6Actions().length} responsable(s): {getResponsiblesFromD6Actions().map(r => r.name).join(', ')}
              </div>
            </div>
            <button
              onClick={notifyD6Responsibles}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: themeColors.accent,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
               Enviar Notificacion
            </button>
          </div>
        )}

        {/* Root Cause Reminder from D4 */}
        {data?.d4RootCause && (
          <div style={{
            backgroundColor: themeColors.bgPanel,
            border: '2px solid #fb923c',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            marginTop: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '20px' }}></span>
              <h4 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: '600',
                color: '#9a3412'
              }}>
                Causa Raíz Identificada en D4 (Referencia)
              </h4>
            </div>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#7c2d12',
              lineHeight: '1.6',
              fontStyle: 'italic'
            }}>
              "{data.d4RootCause}"
            </p>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: '#9a3412'
            }}>
               La contramedida definitiva debe eliminar esta causa raíz.
            </p>
          </div>
        )}

        <div style={styles.section}>
          {/* Descripción de la Contramedida Definitiva */}
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <label style={{ ...styles.label, fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              {t.countermeasureDescription}
              <span style={styles.required}>*</span>
            </label>
            <textarea
              style={{ ...styles.textarea, minHeight: '120px', fontSize: '14px' }}
              value={formData.d6CountermeasureDescription}
              onChange={(e) => handleInputChange('d6CountermeasureDescription', e.target.value)}
              placeholder={t.countermeasureDescriptionPlaceholder}
              disabled={isBlocked}
              rows="5"
            />
          </div>

          {/* Plan de Implementación */}
          <div style={{
            borderTop: '2px solid #E6EAEE',
            paddingTop: '24px',
            marginTop: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: themeColors.text }}>
                 {t.implementationPlanTitle}
              </h3>

              {/* Toggle View Buttons */}
              <div style={{ display: 'flex', gap: '8px', background: '#F4F6F8', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: viewMode === 'table' ? '#2E7D32' : 'transparent',
                    color: viewMode === 'table' ? 'white' : '#6b7280',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                   {t.viewTable}
                </button>
                <button
                  onClick={() => setViewMode('gantt')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: viewMode === 'gantt' ? '#2E7D32' : 'transparent',
                    color: viewMode === 'gantt' ? 'white' : '#6b7280',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                   {t.viewGantt}
                </button>
              </div>
            </div>

            {/* Botón o Formulario para agregar nueva acción */}
            {!showAddActionForm ? (
              <button
                onClick={() => setShowAddActionForm(true)}
                disabled={isD6FormBlocked}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px 20px',
                  marginBottom: '16px',
                  backgroundColor: isD6FormBlocked ? '#E6EAEE' : '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isD6FormBlocked ? 'not-allowed' : 'pointer',
                  opacity: isD6FormBlocked ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                 Agregar Nueva Acción
              </button>
            ) : (
              <div style={{
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: themeColors.bgPanel,
                border: '2px solid #2E7D32',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#2E7D32' }}> Nueva Acción</span>
                  <button
                    onClick={() => setShowAddActionForm(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      color: themeColors.textMuted,
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title={language === 'es' ? 'Cancelar' : 'Cancel'}
                  >

                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      {t.action}
                      <span style={styles.required}>*</span>
                    </label>
                    <textarea
                      style={styles.textarea}
                      value={newDefinitiveAction.action}
                      onChange={(e) => setNewDefinitiveAction(prev => ({ ...prev, action: e.target.value }))}
                      placeholder={t.actionPlaceholder}
                      disabled={isD6FormBlocked}
                      rows="2"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t.result}</label>
                    <textarea
                      style={styles.textarea}
                      value={newDefinitiveAction.result}
                      onChange={(e) => setNewDefinitiveAction(prev => ({ ...prev, result: e.target.value }))}
                      placeholder={t.resultPlaceholder}
                      disabled={isD6FormBlocked}
                      rows="2"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t.responsible}</label>
                    <select
                      style={styles.select}
                      value={newDefinitiveAction.responsible || ''}
                      onChange={(e) => setNewDefinitiveAction(prev => ({ ...prev, responsible: parseInt(e.target.value) || null }))}
                      disabled={isD6FormBlocked}
                    >
                      <option value="">Seleccionar...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t.priority}</label>
                    <select
                      style={styles.select}
                      value={newDefinitiveAction.priority}
                      onChange={(e) => setNewDefinitiveAction(prev => ({ ...prev, priority: e.target.value }))}
                      disabled={isD6FormBlocked}
                    >
                      <option value="alta">{t.priorityHigh}</option>
                      <option value="media">{t.priorityMedium}</option>
                      <option value="baja">{t.priorityLow}</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t.startDate}</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={newDefinitiveAction.startDate}
                      onChange={(e) => setNewDefinitiveAction(prev => ({ ...prev, startDate: e.target.value }))}
                      disabled={isD6FormBlocked}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t.endDate}</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={newDefinitiveAction.endDate}
                      onChange={(e) => setNewDefinitiveAction(prev => ({ ...prev, endDate: e.target.value }))}
                      disabled={isD6FormBlocked}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => setShowAddActionForm(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: themeColors.bg,
                      color: themeColors.text,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddDefinitiveAction}
                    disabled={isD6FormBlocked}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: themeColors.success,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: isD6FormBlocked ? 'not-allowed' : 'pointer',
                      opacity: isD6FormBlocked ? 0.5 : 1
                    }}
                  >
                     Agregar Acción
                  </button>
                </div>
              </div>
            )}

          {/* Lista de Acciones o Vista Gantt */}
          <div style={{ marginBottom: '20px' }}>
            {formData.d6DefinitiveActions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: themeColors.textMuted, background: '#FAFBFC', borderRadius: '8px', border: '2px dashed #E6EAEE' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>{t.noActions}</div>
                <div style={{ fontSize: '14px', color: themeColors.textDim }}>Agrega acciones definitivas para ver el Gantt</div>
              </div>
            ) : viewMode === 'gantt' ? (
              <GanttChart
                tasks={formData.d6DefinitiveActions}
                users={users}
                onTaskUpdate={handleUpdateDefinitiveAction}
                viewScale="Week"
                disabled={isD6FormBlocked}
              />
            ) : (
              formData.d6DefinitiveActions.map(action => {
                const user = users.find(u => u.id === action.responsible);
                const responsibleName = user ? `${user.firstName} ${user.lastName}` : 'Sin asignar';

                const getPriorityColor = (priority) => {
                  switch (priority) {
                    case 'alta': return '#ef4444';
                    case 'media': return '#C77700';
                    case 'baja': return '#0072CE';
                    default: return '#6b7280';
                  }
                };

                const getPriorityBadge = (priority) => {
                  const colors = {
                    alta: { bg: '#fee2e2', color: '#991b1b', text: t.priorityHigh },
                    media: { bg: '#fef3c7', color: '#92400e', text: t.priorityMedium },
                    baja: { bg: '#dbeafe', color: '#0F3B5F', text: t.priorityLow }
                  };
                  const style = colors[priority] || colors.media;
                  return (
                    <span style={{
                      background: style.bg,
                      color: style.color,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {style.text}
                    </span>
                  );
                };

                // Recalcular progreso planeado
                const currentPlannedProgress = calculatePlannedProgress(action.startDate, action.endDate);

                return (
                  <div key={action.id} id={`d6-action-${action.id}`} style={styles.actionItem}>
                    <div style={styles.actionContent}>
                      <div style={styles.actionHeader}>{action.action || action.description}</div>
                      {action.result && (
                        <div style={{ fontSize: '13px', color: '#2E7D32', marginTop: '4px', fontStyle: 'italic' }}>
                           {action.result}
                        </div>
                      )}
                      <div style={styles.actionMeta}>
                        <span> {responsibleName}</span>
                        {getPriorityBadge(action.priority)}
                        {action.startDate && <span> Inicio: {action.startDate}</span>}
                        {action.endDate && <span> Fin: {action.endDate}</span>}
                      </div>

                      {/* Progreso Planeado vs Real */}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: themeColors.textMuted, marginBottom: '4px' }}>
                             {t.plannedProgress}: {currentPlannedProgress}%
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#E6EAEE',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${currentPlannedProgress}%`,
                              height: '100%',
                              background: '#9ca3af',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: themeColors.textMuted, marginBottom: '4px' }}>
                             {t.actualProgress}: {action.actualProgress || 0}%
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#E6EAEE',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${action.actualProgress || 0}%`,
                              height: '100%',
                              background: (action.actualProgress || 0) >= 100 ? '#2E7D32' : getPriorityColor(action.priority),
                              transition: 'width 0.3s, background 0.3s'
                            }} />
                          </div>
                        </div>

                        {/* Campo para actualizar progreso real */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={action.actualProgress || 0}
                            onChange={(e) => {
                              const newProgress = parseInt(e.target.value) || 0;
                              handleUpdateDefinitiveAction(action.id, { actualProgress: Math.min(100, Math.max(0, newProgress)) });
                            }}
                            disabled={isBlocked}
                            style={{
                              width: '60px',
                              padding: '4px 8px',
                              border: `1px solid ${themeColors.border}`,
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                          <span style={{ fontSize: '12px', color: themeColors.textMuted }}>%</span>
                        </div>
                      </div>

                      {/* Historial de Actividades Diarias */}
                      <div style={{ marginTop: '12px', padding: '12px', background: '#FAFBFC', borderRadius: '6px', border: `1px solid ${themeColors.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsedHistory[action.id] ? '0px' : '8px' }}>
                          <div
                            onClick={() => {
                              setCollapsedHistory(prev => {
                                const newState = {
                                  ...prev,
                                  [action.id]: !prev[action.id]
                                };
                                // Save to localStorage
                                localStorage.setItem(`d6_collapsed_history_${data?.id || 'temp'}`, JSON.stringify(newState));
                                return newState;
                              });
                            }}
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: themeColors.text,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              userSelect: 'none'
                            }}
                          >
                            <span style={{
                              transition: 'transform 0.2s',
                              transform: collapsedHistory[action.id] ? 'rotate(-90deg)' : 'rotate(0deg)',
                              display: 'inline-block'
                            }}>
                              ▼
                            </span>
                             Historial de Actividades {action.dailyProgress && action.dailyProgress.length > 0 && `(${action.dailyProgress.length} ${action.dailyProgress.length === 1 ? 'registro' : 'registros'})`}
                          </div>
                          <button
                            onClick={() => {
                              const isExpanded = expandedActions[action.id];
                              setExpandedActions(prev => ({
                                ...prev,
                                [action.id]: !isExpanded
                              }));
                              if (!isExpanded) {
                                // Inicializar con fecha de hoy
                                setDailyEntries(prev => ({
                                  ...prev,
                                  [action.id]: {
                                    date: new Date().toISOString().split('T')[0],
                                    progress: '',
                                    activities: ''
                                  }
                                }));
                              }
                            }}
                            disabled={isBlocked}
                            style={{
                              padding: '4px 8px',
                              background: expandedActions[action.id] ? '#6b7280' : getPriorityColor(action.priority),
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: isBlocked ? 'not-allowed' : 'pointer',
                              opacity: isBlocked ? 0.5 : 1
                            }}
                          >
                            {expandedActions[action.id] ? ' Cancelar' : '+ Agregar'}
                          </button>
                        </div>

                        {/* Formulario de entrada (expandible) */}
                        {expandedActions[action.id] && (
                          <div style={{
                            padding: '12px',
                            background: 'white',
                            borderRadius: '6px',
                            border: '2px solid ' + getPriorityColor(action.priority),
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: themeColors.textMuted, display: 'block', marginBottom: '4px' }}>
                                  Fecha
                                </label>
                                <input
                                  type="date"
                                  value={dailyEntries[action.id]?.date || ''}
                                  onChange={(e) => setDailyEntries(prev => ({
                                    ...prev,
                                    [action.id]: { ...prev[action.id], date: e.target.value }
                                  }))}
                                  disabled={isBlocked}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: `1px solid ${themeColors.border}`,
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: themeColors.textMuted, display: 'block', marginBottom: '4px' }}>
                                  Progreso (%)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={dailyEntries[action.id]?.progress || ''}
                                  onChange={(e) => setDailyEntries(prev => ({
                                    ...prev,
                                    [action.id]: { ...prev[action.id], progress: e.target.value }
                                  }))}
                                  disabled={isBlocked}
                                  placeholder="0-100"
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: `1px solid ${themeColors.border}`,
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11px', color: themeColors.textMuted, display: 'block', marginBottom: '4px' }}>
                                Actividades realizadas
                              </label>
                              <textarea
                                value={dailyEntries[action.id]?.activities || ''}
                                onChange={(e) => setDailyEntries(prev => ({
                                  ...prev,
                                  [action.id]: { ...prev[action.id], activities: e.target.value }
                                }))}
                                disabled={isD6FormBlocked}
                                placeholder="Describe las actividades realizadas..."
                                rows="3"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: `1px solid ${themeColors.border}`,
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontFamily: 'inherit',
                                  resize: 'vertical'
                                }}
                              />
                            </div>
                            <button
                              onClick={() => handleAddDailyProgress(action.id)}
                              disabled={isD6FormBlocked}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: getPriorityColor(action.priority),
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: isD6FormBlocked ? 'not-allowed' : 'pointer',
                                opacity: isD6FormBlocked ? 0.5 : 1
                              }}
                            >
                               Guardar Actividad
                            </button>
                          </div>
                        )}

                        {/* Lista de actividades */}
                        {!collapsedHistory[action.id] && action.dailyProgress && action.dailyProgress.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {action.dailyProgress
                              .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date)) // Más recientes primero
                              .map((entry, idx) => (
                                <div key={idx} style={{
                                  padding: '8px',
                                  background: 'white',
                                  borderRadius: '4px',
                                  border: `1px solid ${themeColors.border}`,
                                  fontSize: '12px'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '600', color: themeColors.text }}>
                                       {parseLocalDate(entry.date).toLocaleDateString('es-ES', {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </span>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: getPriorityColor(action.priority),
                                      background: `${getPriorityColor(action.priority)}15`,
                                      padding: '2px 6px',
                                      borderRadius: '3px'
                                    }}>
                                      +{entry.progress}% → {entry.accumulated}%
                                    </span>
                                  </div>
                                  {entry.activities && (
                                    <div style={{ color: themeColors.textMuted, lineHeight: '1.4' }}>
                                      {entry.activities}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Sección de Evidencia */}
                      <div style={{ marginTop: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', marginBottom: '8px' }}>
                           Evidencia de Implementación
                        </div>

                        {action.evidenceFiles && action.evidenceFiles.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            {/* Filter duplicates: prefer D6 files over Workload files with same name */}
                            {action.evidenceFiles
                              .reduce((unique, file) => {
                                const fileName = file.name || file.filename || '';
                                const existingIndex = unique.findIndex(f =>
                                  (f.name || f.filename || '') === fileName
                                );
                                if (existingIndex === -1) {
                                  unique.push(file);
                                } else {
                                  // If duplicate, prefer D6 file (no workloadFileId)
                                  const existing = unique[existingIndex];
                                  if (existing.workloadFileId && !file.workloadFileId) {
                                    unique[existingIndex] = file;
                                  }
                                }
                                return unique;
                              }, [])
                              .map((file, fileIndex) => {
                              const isFromWorkload = file.source === 'workload';
                              const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                              // For workload files, we need to use fetch with auth token
                              const fileUrl = file.url ? (file.url.startsWith('http') ? file.url : `${baseUrl}${file.url}`) : null;

                              const handleWorkloadDownload = async (e) => {
                                e.preventDefault();
                                if (!file.workloadFileId || !action.workloadActivityId) return;
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(
                                    `${baseUrl}/workload/activities/${action.workloadActivityId}/evidence/${file.workloadFileId}/download`,
                                    { headers: { 'Authorization': `Bearer ${token}` } }
                                  );
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = file.name || 'archivo';
                                  link.click();
                                  window.URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error('Error downloading file:', err);
                                }
                              };

                              return (
                              <div key={fileIndex} style={{
                                padding: '8px',
                                background: isFromWorkload ? '#fef3c7' : 'white',
                                borderRadius: '4px',
                                border: isFromWorkload ? '1px solid #C77700' : '1px solid #86efac',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <div style={{ flex: 1 }}>
                                  {isFromWorkload ? (
                                    <button
                                      onClick={handleWorkloadDownload}
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: '#C77700',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        textAlign: 'left'
                                      }}
                                    >
                                       {file.name} <span style={{ fontSize: '10px', fontWeight: '600' }}>(Workload)</span>
                                    </button>
                                  ) : (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: '#15803d',
                                        textDecoration: 'none',
                                        display: 'block'
                                      }}
                                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                    >
                                       {file.name}
                                    </a>
                                  )}
                                  <div style={{ fontSize: '10px', color: themeColors.textMuted, marginTop: '2px' }}>
                                    {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('es-MX') : ''}
                                  </div>
                                </div>
                                {!isFromWorkload && (
                                  <button
                                    onClick={() => removeEvidenceFileD6(action.id, fileIndex)}
                                    disabled={isBlocked}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#B00020',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                                      opacity: isBlocked ? 0.5 : 1
                                    }}
                                  >
                                    
                                  </button>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: themeColors.textMuted, marginBottom: '12px', fontStyle: 'italic' }}>
                            Sin evidencia adjunta
                          </div>
                        )}

                        {!isD6FormBlocked && (
                          <>
                            <input
                              type="file"
                              id={`evidence-${action.id}`}
                              style={{ display: 'none' }}
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              onChange={(e) => handleFileUploadD6(action.id, Array.from(e.target.files))}
                            />
                            <label
                              htmlFor={`evidence-${action.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                background: '#2E7D32',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#2E7D32'}
                              onMouseLeave={(e) => e.target.style.background = '#2E7D32'}
                            >
                               Subir Evidencia
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDefinitiveAction(action.id)}
                      disabled={isD6FormBlocked}
                      style={{
                        ...styles.removeButton,
                        opacity: isD6FormBlocked ? 0.5 : 1,
                        cursor: isD6FormBlocked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {t.remove}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          </div>

          {/* Notify D6 Responsibles Button - Bottom of section */}
          {getResponsiblesFromD6Actions().length > 0 && (
            <div style={{
              backgroundColor: themeColors.bgPanel,
              border: '2px solid #0072CE',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F3B5F', marginBottom: '4px' }}>
                   Notificar a Responsables de D6
                </h3>
                <div style={{ fontSize: '13px', color: '#0F3B5F' }}>
                  {getResponsiblesFromD6Actions().length} responsable(s): {getResponsiblesFromD6Actions().map(r => r.name).join(', ')}
                </div>
              </div>
              <button
                onClick={notifyD6Responsibles}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: themeColors.accent,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                 Enviar Notificacion
              </button>
            </div>
          )}
        </div>

        {/* ================== D6 - EVIDENCIA ANTES/DESPUÉS ================== */}
        <div style={{
          marginTop: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: themeColors.text, marginBottom: '16px' }}>
             Evidencia Antes/Después
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* ========== SECCIÓN ANTES ========== */}
            <div style={{
              backgroundColor: themeColors.bgPanel,
              border: '2px solid #ef4444',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#991b1b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span></span>
                <span>ANTES de la Contramedida</span>
              </h4>

              {/* Descripción del Problema de D1 - ANTES */}
              {data?.d1ProblemDescription && (
                <div style={{
                  backgroundColor: themeColors.bgPanel,
                  border: '2px solid #C77700',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}></span>
                    <h5 style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      Descripción del Problema (D1)
                    </h5>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#78350f',
                    lineHeight: '1.5',
                    fontStyle: 'italic'
                  }}>
                    "{data.d1ProblemDescription}"
                  </p>
                </div>
              )}

              {/* Condición ANTERIOR */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ ...styles.label, fontSize: '13px' }}>
                   Condición Anterior
                </label>
                <textarea
                  style={{ ...styles.textarea, fontSize: '13px' }}
                  value={formData.beforeCondition || ''}
                  onChange={(e) => handleInputChange('beforeCondition', e.target.value)}
                  placeholder="Describe la condición anterior..."
                  disabled={isD6FormBlocked}
                  rows="4"
                />
              </div>

              {/* Fotos ANTES */}
              <div>
                <label style={{ ...styles.label, fontSize: '13px' }}> Fotos Condición Anterior</label>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isD6PhotoUploadBlocked) return;
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    files.forEach(file => uploadBeforePhoto(file));
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '20px',
                    border: '2px dashed #ef4444',
                    borderRadius: '8px',
                    backgroundColor: isD6PhotoUploadBlocked ? '#FAFBFC' : '#fef2f2',
                    textAlign: 'center',
                    cursor: isD6PhotoUploadBlocked ? 'not-allowed' : 'pointer',
                    opacity: isD6PhotoUploadBlocked ? 0.5 : 1
                  }}
                >
                  <label style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: themeColors.error,
                    color: 'white',
                    borderRadius: '6px',
                    cursor: isD6PhotoUploadBlocked ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        Array.from(e.target.files).forEach(file => uploadBeforePhoto(file));
                        e.target.value = ''; // Reset input
                      }}
                      disabled={isD6PhotoUploadBlocked}
                      style={{ display: 'none' }}
                    />
                     Subir Fotos
                  </label>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: themeColors.textMuted }}>
                    o arrastra las fotos aquí
                  </div>
                </div>

                {/* Display uploaded before photos */}
                {formData.beforePhotos && formData.beforePhotos.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px'
                  }}>
                    {formData.beforePhotos.map((photo) => (
                      <div key={photo.id} style={{
                        position: 'relative',
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={`http://localhost:5000${photo.file_url}`}
                          alt={photo.file_name}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover'
                          }}
                        />
                        {!isD6PhotoUploadBlocked && (
                          <button
                            onClick={() => deleteBeforePhoto(photo.id)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              backgroundColor: themeColors.error,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}
                          >
                            
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(!formData.beforePhotos || formData.beforePhotos.length === 0) && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: themeColors.textDim, fontStyle: 'italic' }}>
                    Sin fotos
                  </div>
                )}
              </div>
            </div>

            {/* ========== SECCIÓN DESPUÉS ========== */}
            <div style={{
              backgroundColor: themeColors.bgPanel,
              border: '2px solid #2E7D32',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span></span>
                <span>DESPUÉS de la Contramedida</span>
              </h4>

              {/* Descripción del Problema de D1 - DESPUÉS */}
              {data?.d1ProblemDescription && (
                <div style={{
                  backgroundColor: themeColors.bgPanel,
                  border: '2px solid #C77700',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}></span>
                    <h5 style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      Descripción del Problema (D1)
                    </h5>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#78350f',
                    lineHeight: '1.5',
                    fontStyle: 'italic'
                  }}>
                    "{data.d1ProblemDescription}"
                  </p>
                </div>
              )}

              {/* Condición ACTUAL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ ...styles.label, fontSize: '13px' }}>
                   Condición Actual
                </label>
                <textarea
                  style={{ ...styles.textarea, fontSize: '13px' }}
                  value={formData.afterCondition || ''}
                  onChange={(e) => handleInputChange('afterCondition', e.target.value)}
                  placeholder="Describe la condición actual..."
                  disabled={isD6FormBlocked}
                  rows="4"
                />
              </div>

              {/* Fotos DESPUÉS */}
              <div>
                <label style={{ ...styles.label, fontSize: '13px' }}> Fotos Condición Actual</label>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isD6PhotoUploadBlocked) return;
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    files.forEach(file => uploadAfterPhoto(file));
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '20px',
                    border: '2px dashed #2E7D32',
                    borderRadius: '8px',
                    backgroundColor: isD6PhotoUploadBlocked ? '#FAFBFC' : '#f0fdf4',
                    textAlign: 'center',
                    cursor: isD6PhotoUploadBlocked ? 'not-allowed' : 'pointer',
                    opacity: isD6PhotoUploadBlocked ? 0.5 : 1
                  }}
                >
                  <label style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: themeColors.success,
                    color: 'white',
                    borderRadius: '6px',
                    cursor: isD6PhotoUploadBlocked ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        Array.from(e.target.files).forEach(file => uploadAfterPhoto(file));
                        e.target.value = ''; // Reset input
                      }}
                      disabled={isD6PhotoUploadBlocked}
                      style={{ display: 'none' }}
                    />
                     Subir Fotos
                  </label>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: themeColors.textMuted }}>
                    o arrastra las fotos aquí
                  </div>
                </div>

                {/* Display uploaded after photos */}
                {formData.afterPhotos && formData.afterPhotos.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px'
                  }}>
                    {formData.afterPhotos.map((photo) => (
                      <div key={photo.id} style={{
                        position: 'relative',
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={`http://localhost:5000${photo.file_url}`}
                          alt={photo.file_name}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover'
                          }}
                        />
                        {!isD6PhotoUploadBlocked && (
                          <button
                            onClick={() => deleteAfterPhoto(photo.id)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              backgroundColor: themeColors.success,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}
                          >
                            
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(!formData.afterPhotos || formData.afterPhotos.length === 0) && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: themeColors.textDim, fontStyle: 'italic' }}>
                    Sin fotos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================== D6 - MARCAR COMPLETADO Y APROBACIÓN ================== */}
        <div style={{
          backgroundColor: themeColors.bgPanel,
          border: '2px solid #C77700',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '24px'
        }}>
          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d6Completed}
                onChange={(e) => handleInputChange('d6Completed', e.target.checked)}
                disabled={isD6FormBlocked}
              />
              {t.markD6Complete}
            </label>
          </div>

          {/* D6 Approval Status Bar */}
          {data && (data.escalationPath || data.escalation_path) && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>
                 Estado de Aprobación - D6
              </h3>

              {/* Multi-level Approval Steps - Dynamic with names */}
              {(() => {
                const countermeasureUsers = data?.escalationPath?.countermeasure_users || data?.escalation_path?.countermeasure_users || [];
                const configuredApprovers = [1, 2, 3].filter(step => {
                  const approver = countermeasureUsers[step];
                  return approver !== undefined && approver !== null;
                });

                if (configuredApprovers.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '12px', color: themeColors.textMuted, fontSize: '13px' }}>
                      No hay aprobadores configurados para D6
                    </div>
                  );
                }

                const d6CurrentStep = data?.d6CurrentApprovalStep || 0;
                const approvalData = {
                  1: { status: data?.d6Approval1Status, at: data?.d6Approval1At, comments: data?.d6Approval1Comments },
                  2: { status: data?.d6Approval2Status, at: data?.d6Approval2At, comments: data?.d6Approval2Comments },
                  3: { status: data?.d6Approval3Status, at: data?.d6Approval3At, comments: data?.d6Approval3Comments }
                };

                return (
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px',
                    justifyContent: 'center'
                  }}>
                    {configuredApprovers.map(step => {
                      const isPast = step < d6CurrentStep;
                      const isCurrent = step === d6CurrentStep && data?.d6Status === 'under_review';
                      const approval = approvalData[step];
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
                              ? approval?.status === 'approved' ? '#dcfce7' : approval?.status === 'rejected' ? '#fee2e2' : '#FAFBFC'
                              : isCurrent ? '#dbeafe' : '#FAFBFC',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>
                            {isPast && approval?.status === 'approved' && ' '}
                            {isPast && approval?.status === 'rejected' && ' '}
                            {isCurrent && ' '}
                            {approverName}
                          </div>
                          {approverEmail && (
                            <div style={{ fontSize: '11px', color: '#0072CE', marginBottom: '4px' }}>
                              {approverEmail}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: themeColors.textMuted }}>
                            {isPast && approval?.status === 'approved' && (
                              <>Aprobado {approval?.at && `el ${new Date(approval.at).toLocaleDateString()}`}</>
                            )}
                            {isPast && approval?.status === 'rejected' && (
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
              {d6ApprovalHistory.length > 0 && (
                <div style={{
                  backgroundColor: themeColors.bgCard,
                  padding: '15px',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    Historial de Aprobaciones D6 ({d6ApprovalHistory.length} registros):
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {d6ApprovalHistory.map((entry, index) => {
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
                              <span style={{ marginLeft: '8px', color: themeColors.textSecondary }}>
                                - {entry.description}
                              </span>
                            )}
                          </div>
                          {entry.newValue && typeof entry.newValue === 'object' && entry.newValue.comments && (
                            <div style={{
                              marginTop: '6px',
                              padding: '6px',
                              backgroundColor: themeColors.bgPanel,
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
            </div>
          )}

          {/* D6 Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
            {/* Mensaje cuando está completamente aprobado */}
            {data?.d6Status === 'approved' && (
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
                  D6 COMPLETAMENTE APROBADO. Puede continuar con D7.
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowRevertModalD6(true)}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                  >
                    {language === 'es' ? 'Regresar a Borrador' : 'Revert to Draft'}
                  </button>
                )}
              </div>
            )}

            {/* Show APPROVE/REJECT buttons ONLY for current approver */}
            {isCurrentApproverD6() && data?.d6Status === 'under_review' && (
              <>
                <button
                  onClick={handleApproveD6}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: themeColors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Aprobar
                </button>

                <button
                  onClick={handleRejectD6}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: themeColors.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Rechazar
                </button>
              </>
            )}

            {/* Show DRAFT/SEND buttons ONLY when NOT approved AND NOT under_review */}
            {(() => {
              const d6Status = data?.d6Status || data?.d6_status;
              if (d6Status === 'approved' || d6Status === 'under_review') return null;
              if (!isPrimaryUserD6() && !isAdmin) return null;

              return (
                <>
                  <button
                    onClick={handleSaveDraftD6}
                    disabled={isSaving}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: themeColors.textMuted,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Borrador'}
                  </button>

                  <button
                    onClick={handleSendToApprovalD6}
                    disabled={isSendingD6}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: themeColors.success,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isSendingD6 ? 'not-allowed' : 'pointer',
                      opacity: isSendingD6 ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSendingD6 ? 'Enviando...' : 'Enviar a Aprobación'}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
        </>
        )}

        {/* ================== D7 - VALIDACIÓN DE CONTRAMEDIDAS ================== */}
        {(!activeSection || activeSection === 'd7') && (
        <>
        <div style={{
          backgroundColor: themeColors.bgPanel,
          border: '2px solid #2E7D32',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#15803d', marginBottom: '16px' }}>
             Validación de Contramedidas
          </h3>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: `1px solid ${themeColors.border}`,
            fontSize: '14px'
          }}>
            <thead>
              <tr>
                <th style={{
                  backgroundColor: themeColors.bg,
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderBottom: '2px solid #E6EAEE',
                  width: '25%'
                }}>
                  Contramedida
                </th>
                <th style={{
                  backgroundColor: themeColors.bg,
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderBottom: '2px solid #E6EAEE',
                  width: '15%'
                }}>
                  Implementada
                </th>
                <th style={{
                  backgroundColor: themeColors.bg,
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderBottom: '2px solid #E6EAEE',
                  width: '15%'
                }}>
                  Efectiva
                </th>
                <th style={{
                  backgroundColor: themeColors.bg,
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderBottom: '2px solid #E6EAEE',
                  width: '12%'
                }}>
                  Juicio SPC
                </th>
                <th style={{
                  backgroundColor: themeColors.bg,
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderBottom: '2px solid #E6EAEE',
                  width: '12%'
                }}>
                  Juicio Cliente
                </th>
                <th style={{
                  backgroundColor: themeColors.bg,
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderBottom: '2px solid #E6EAEE',
                  width: '25%'
                }}>
                  Comentarios
                </th>
              </tr>
            </thead>
            <tbody>
              {/* D3 - Contramedida Temporal */}
              <tr style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                  D3 - Contramedida Temporal
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={formData.d3Implemented === null ? '' : formData.d3Implemented ? 'si' : 'no'}
                    onChange={(e) => handleInputChange('d3Implemented', e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="si"> Sí</option>
                    <option value="no"> No</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={formData.d3Effective === null ? '' : formData.d3Effective ? 'si' : 'no'}
                    onChange={(e) => handleInputChange('d3Effective', e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="si"> Sí</option>
                    <option value="no"> No</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={normalizeJudgment(formData.d3SpcJudgment)}
                    onChange={(e) => handleInputChange('d3SpcJudgment', e.target.value)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="OK"> OK</option>
                    <option value="NOK"> NOK</option>
                    <option value="NA">- NA</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={normalizeJudgment(formData.d3ClientJudgment)}
                    onChange={(e) => handleInputChange('d3ClientJudgment', e.target.value)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="OK"> OK</option>
                    <option value="NOK"> NOK</option>
                    <option value="NA">- NA</option>
                  </select>
                </td>
                <td style={{ padding: '12px' }}>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                      minHeight: '80px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    value={formData.d3Comments || ''}
                    onChange={(e) => handleInputChange('d3Comments', e.target.value)}
                    placeholder="Comentarios sobre la validación de D3..."
                    disabled={isD6FormBlocked}
                    rows="3"
                  />
                </td>
              </tr>

              {/* D5 - Contramedida Definitiva */}
              <tr style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                  D5 - Contramedida Definitiva
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={formData.d5Implemented === null ? '' : formData.d5Implemented ? 'si' : 'no'}
                    onChange={(e) => handleInputChange('d5Implemented', e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="si"> Sí</option>
                    <option value="no"> No</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={formData.d5Effective === null ? '' : formData.d5Effective ? 'si' : 'no'}
                    onChange={(e) => handleInputChange('d5Effective', e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="si"> Sí</option>
                    <option value="no"> No</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={normalizeJudgment(formData.d5SpcJudgment)}
                    onChange={(e) => handleInputChange('d5SpcJudgment', e.target.value)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="OK"> OK</option>
                    <option value="NOK"> NOK</option>
                    <option value="NA">- NA</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    style={{
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '100%'
                    }}
                    value={normalizeJudgment(formData.d5ClientJudgment)}
                    onChange={(e) => handleInputChange('d5ClientJudgment', e.target.value)}
                    disabled={isD6FormBlocked}
                  >
                    <option value="">--</option>
                    <option value="OK"> OK</option>
                    <option value="NOK"> NOK</option>
                    <option value="NA">- NA</option>
                  </select>
                </td>
                <td style={{ padding: '12px' }}>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                      minHeight: '80px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    value={formData.d5Comments || ''}
                    onChange={(e) => handleInputChange('d5Comments', e.target.value)}
                    placeholder="Comentarios sobre la validación de D5..."
                    disabled={isD6FormBlocked}
                    rows="3"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Save button for D7 validation */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveD7Validation}
              disabled={isSaving}
              style={{
                padding: '10px 24px',
                backgroundColor: isSaving ? '#9ca3af' : '#2E7D32',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isSaving ? 'Guardando...' : 'Guardar Validación'}
            </button>
          </div>
        </div>

        {/* D7 - CONFIRMACIÓN (Audit Checklist) */}
        <div id="d7-confirmacion" style={{ scrollMarginTop: '20px', marginTop: '24px' }}>
          <D7Validation
            reportId={data?.id}
            data={data}
            onSave={handleSave}
            isBlocked={isD7FormBlocked}
            currentUser={currentUser}
            onSendToApproval={handleSendToApprovalD7}
            onApprove={handleApproveD7}
            onReject={handleRejectD7}
            isSending={isSendingD7}
          />
        </div>
        </>
        )}

        {/* ================== ESCALATION PATH ================== */}
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
            Escalation Path - D6/D7 (Countermeasure Section)
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

            const getUserInfo = (userIdOrObj, role) => {
              if (!userIdOrObj) return null;
              // Si ya es un objeto con name, usarlo directamente
              if (typeof userIdOrObj === 'object' && userIdOrObj.name) {
                return { name: userIdOrObj.name, email: '', position: '', role };
              }
              // Extraer ID si es objeto
              const actualId = typeof userIdOrObj === 'object' ? userIdOrObj.id : userIdOrObj;
              const user = users.find(u => u.id === actualId);
              const name = user
                ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                : `ID: ${actualId}`;
              const email = user?.email || '';
              const position = user?.position || user?.cargo || '';
              return { name, email, position, role };
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
      </div>

      {/* Modal: Revert D6 to Draft (Admin only) */}
      {showRevertModalD6 && (
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
              {language === 'es' ? 'Regresar D6 a Borrador' : 'Revert D6 to Draft'}
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
                value={revertCommentsD6}
                onChange={(e) => setRevertCommentsD6(e.target.value)}
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
                  setShowRevertModalD6(false);
                  setRevertCommentsD6('');
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
                onClick={handleRevertToDraftD6}
                disabled={isRevertingD6 || !revertCommentsD6.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isRevertingD6 || !revertCommentsD6.trim() ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  cursor: isRevertingD6 || !revertCommentsD6.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isRevertingD6
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

export default D5D6D7Countermeasures;
