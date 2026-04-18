import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import GanttChart from '../8D/GanttChart';
import ECRApprovalPanel from './ECRApprovalPanel';
import impactAreasService from '../../services/impactAreasService';

const ECRValidationPlan = ({ data, onDataUpdate }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const { showSuccess, showError } = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [impactAreas, setImpactAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Initialize validation actions from saved data
  // Note: Auto-sync from ECR-2B is handled by useEffect below
  const initializeValidationActions = () => {
    if (data.validationActions && data.validationActions.length > 0) {
      // Normalize existing actions to include new fields
      return data.validationActions.map(action => ({
        ...action,
        result: action.result || '',
        recoveryPlan: action.recoveryPlan || '',
        evidenceFiles: action.evidenceFiles || [],
        dailyProgress: action.dailyProgress || [],
        subActions: action.subActions || [],
        isRiskValidation: action.isRiskValidation || false
      }));
    }
    // Return empty - useEffect will auto-populate from ECR-2B
    return [];
  };

  // Default validation evidence structure
  const defaultValidationEvidence = {
    requiresValidation: null, // null = not answered, true = yes, false = no (just signature)
    validationType: {
      functional: false,
      documents: false
    },
    criteria: [], // Array of { id, parameter, method, target, before, after, status }
    beforeEvidence: {
      description: '',
      files: []
    },
    afterEvidence: {
      description: '',
      files: []
    },
    summary: {
      status: '', // 'pass', 'fail', 'conditional'
      observations: ''
    },
    // For "No, just signature" flow
    noValidationReason: '', // 'backup_tool', 'cosmetic', 'other'
    noValidationReasonOther: '',
    noValidationObservations: '',
    noValidationFiles: [],
    // Signature fields
    signedBy: null,
    signedByName: '',
    signedAt: null,
    isLocked: false
  };

  const [formData, setFormData] = useState({
    validationActions: initializeValidationActions(),
    // New Validation Evidence structure - deep merge with defaults
    validationEvidence: {
      ...defaultValidationEvidence,
      ...(data.validationEvidence || {}),
      validationType: {
        ...defaultValidationEvidence.validationType,
        ...(data.validationEvidence?.validationType || {})
      },
      beforeEvidence: {
        ...defaultValidationEvidence.beforeEvidence,
        ...(data.validationEvidence?.beforeEvidence || {})
      },
      afterEvidence: {
        ...defaultValidationEvidence.afterEvidence,
        ...(data.validationEvidence?.afterEvidence || {})
      },
      summary: {
        ...defaultValidationEvidence.summary,
        ...(data.validationEvidence?.summary || {})
      }
    },
    selectedValidations: data.selectedValidations || [],
    communicationPlan: data.communicationPlan || {
      customer: { method: '', date: '', status: 'pending', notes: '', expanded: false },
      supplier: { method: '', date: '', status: 'pending', notes: '', expanded: false },
      plant: { method: '', date: '', status: 'pending', notes: '', expanded: false },
      warehouse: { method: '', date: '', status: 'pending', notes: '', expanded: false },
      logistics: { method: '', date: '', status: 'pending', notes: '', expanded: false }
    },
    customerApproval: data.customerApproval || {
      required: false,
      status: 'not_required',
      approvedBy: '',
      approvedAt: null,
      comments: '',
      evidence: []
    }
  });

  const [uploadingValidation, setUploadingValidation] = useState(null);
  const [expandedStakeholders, setExpandedStakeholders] = useState({
    customer: data.communicationPlan?.customer?.expanded || false,
    supplier: data.communicationPlan?.supplier?.expanded || false,
    plant: data.communicationPlan?.plant?.expanded || false,
    warehouse: data.communicationPlan?.warehouse?.expanded || false,
    logistics: data.communicationPlan?.logistics?.expanded || false
  });

  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem(`ecr3_view_mode_${data?.id || 'temp'}`);
    return saved || 'table';
  });

  const updateViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem(`ecr3_view_mode_${data?.id || 'temp'}`, mode);
  };
  const [expandedActions, setExpandedActions] = useState({});
  const [dailyEntries, setDailyEntries] = useState({});

  const [newAction, setNewAction] = useState({
    action: '',
    result: '',
    area: '',
    responsible: null,
    startDate: '',
    endDate: '',
    plannedProgress: 0,
    actualProgress: 0,
    dailyProgress: [],
    status: 'pending',
    recoveryPlan: '',
    evidenceFiles: [],
    checklist: []
  });

  // Collapsed history state with localStorage persistence
  const [collapsedHistory, setCollapsedHistory] = useState(() => {
    const saved = localStorage.getItem(`ecr3_collapsed_history_${data?.id || 'temp'}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Uploading state for action evidence
  const [uploadingActionEvidence, setUploadingActionEvidence] = useState(null);

  // Collapsed Master Plan actions state with localStorage persistence
  const [collapsedMasterActions, setCollapsedMasterActions] = useState(() => {
    const saved = localStorage.getItem(`ecr3_collapsed_master_actions_${data?.id || 'temp'}`);
    return saved ? JSON.parse(saved) : {};
  });

  const toggleMasterActionCollapse = (actionId) => {
    setCollapsedMasterActions(prev => {
      const newState = { ...prev, [actionId]: !prev[actionId] };
      localStorage.setItem(`ecr3_collapsed_master_actions_${data?.id || 'temp'}`, JSON.stringify(newState));
      return newState;
    });
  };

  // Collapsed state for Add New Action form
  const [addFormCollapsed, setAddFormCollapsed] = useState(() => {
    const saved = localStorage.getItem(`ecr3_add_form_collapsed_${data?.id || 'temp'}`);
    return saved === 'true';
  });

  const toggleAddFormCollapse = () => {
    setAddFormCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem(`ecr3_add_form_collapsed_${data?.id || 'temp'}`, newState.toString());
      return newState;
    });
  };

  // Editing state for existing actions
  const [editingAction, setEditingAction] = useState(null);

  // Get available areas from ECR-2B impact analysis (areas that had impact)
  // If no impact analysis, fall back to all areas from database
  const getAvailableAreas = () => {
    if (data.impactAnalysis && data.impactAnalysis.length > 0) {
      // Use areas from ECR-2B that have impact
      return data.impactAnalysis.map(impact => impact.areaName || impact.areaKey);
    }
    // Fallback to database areas
    return impactAreas.map(area => area.areaName);
  };

  const availableAreas = getAvailableAreas();

  // Load impact areas from database
  useEffect(() => {
    const fetchImpactAreas = async () => {
      try {
        setLoadingAreas(true);
        const response = await impactAreasService.getActiveAreas();
        if (response.success && response.areas) {
          setImpactAreas(response.areas);
        }
      } catch (error) {
        console.error('Error loading impact areas:', error);
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchImpactAreas();
  }, []);

  // Update subAction names when impactAreas loads (to get proper subsection labels)
  useEffect(() => {
    if (impactAreas.length === 0) return;

    setFormData(prev => ({
      ...prev,
      validationActions: prev.validationActions.map(action => {
        if (!action.subActions || action.subActions.length === 0) return action;

        // Find the area config to get subsection labels
        const areaConfig = impactAreas.find(a => a.areaKey === action.areaKey);
        if (!areaConfig) return action;

        // Get impact analysis for custom subsections
        const impactAnalysis = data.impactAnalysis || [];
        const areaAnalysis = impactAnalysis.find(a => a.areaKey === action.areaKey);
        const customSubsections = areaAnalysis?.customSubsections || [];

        return {
          ...action,
          subActions: action.subActions.map(sub => {
            // Try to find label from area config subsections
            const configSub = (areaConfig.subsections || []).find(s => s.key === sub.subsectionKey);
            if (configSub) {
              return { ...sub, name: configSub.label };
            }
            // Try custom subsections
            const customSub = customSubsections.find(cs => cs.key === sub.subsectionKey);
            if (customSub) {
              return { ...sub, name: customSub.label };
            }
            return sub;
          })
        };
      })
    }));
  }, [impactAreas, data.impactAnalysis]);

  // ============================================================================
  // AUTO-SYNC: Sincronizar automáticamente desde ECR-2B
  // - validationAreas (áreas a validar desde ECR-1)
  // - impactAnalysis.selectedSubsections (aspectos afectados desde ECR-2B)
  // - selectedValidations (validaciones por riesgo desde ECR-2B)
  // ============================================================================
  useEffect(() => {
    // Skip if areas haven't loaded yet
    if (loadingAreas || impactAreas.length === 0) return;

    const validationAreas = data.validationAreas || [];
    const validationTeams = data.validationTeams || {};
    const impactAnalysis = data.impactAnalysis || [];
    const selectedValidations = data.selectedValidations || [];

    // Skip if no validation areas defined
    if (validationAreas.length === 0 && selectedValidations.length === 0) return;

    setFormData(prev => {
      let updatedActions = [...prev.validationActions];
      let hasChanges = false;

      // ---- PART 1: Sync validation actions for each area ----
      validationAreas.forEach(areaKey => {
        const existingAction = updatedActions.find(a => a.areaKey === areaKey && !a.isRiskValidation);

        // Get area config
        const areaConfig = impactAreas.find(a => a.areaKey === areaKey);
        const areaFromAnalysis = impactAnalysis.find(a => a.areaKey === areaKey);
        const areaName = areaFromAnalysis?.areaName || areaConfig?.areaName || areaKey;

        // Get team members for default responsible
        const teamMembers = validationTeams[areaKey] || [];
        const defaultResponsible = teamMembers.length > 0 ? teamMembers[0] : null;

        // Build subActions from selectedSubsections
        const selectedSubsections = areaFromAnalysis?.selectedSubsections || [];
        const customSubsections = areaFromAnalysis?.customSubsections || [];

        const newSubActions = selectedSubsections.map((subKey, idx) => {
          // Find label from config or custom
          const configSub = (areaConfig?.subsections || []).find(s => s.key === subKey);
          const customSub = customSubsections.find(cs => cs.key === subKey);
          const label = configSub?.label || customSub?.label || subKey;

          return {
            id: `sub-${areaKey}-${subKey}`,
            name: label,
            subsectionKey: subKey,
            responsible: null,
            status: 'pending',
            notes: ''
          };
        });

        if (existingAction) {
          // Update existing action's subActions (preserve status/progress of existing ones)
          const mergedSubActions = newSubActions.map(newSub => {
            const existingSub = existingAction.subActions?.find(s => s.subsectionKey === newSub.subsectionKey);
            if (existingSub) {
              // Preserve existing progress
              return { ...newSub, ...existingSub, name: newSub.name };
            }
            return newSub;
          });

          // Check if subActions changed
          if (JSON.stringify(existingAction.subActions) !== JSON.stringify(mergedSubActions)) {
            updatedActions = updatedActions.map(a =>
              a.id === existingAction.id
                ? { ...a, subActions: mergedSubActions }
                : a
            );
            hasChanges = true;
          }
        } else {
          // Create new action for this area
          updatedActions.push({
            id: `validation-${areaKey}-${Date.now()}`,
            action: `Validación de ${areaName}`,
            result: '',
            area: areaName,
            areaKey: areaKey,
            responsible: defaultResponsible,
            startDate: '',
            endDate: '',
            plannedProgress: 0,
            actualProgress: 0,
            dailyProgress: [],
            status: 'pending',
            recoveryPlan: '',
            evidenceFiles: [],
            checklist: [],
            subActions: newSubActions,
            isRiskValidation: false
          });
          hasChanges = true;
        }
      });

      // ---- PART 2: Sync risk-based validations (selectedValidations) ----
      selectedValidations.forEach((validation, idx) => {
        const validationText = typeof validation === 'string' ? validation : validation.text;
        const validationId = `risk-validation-${validationText.replace(/\s+/g, '-').toLowerCase()}`;

        const existingAction = updatedActions.find(a => a.id === validationId ||
          (a.isRiskValidation && a.action === validationText));

        if (!existingAction) {
          // Create new action for this risk validation
          updatedActions.push({
            id: validationId,
            action: validationText,
            result: '',
            area: ' Validación por Riesgo',
            areaKey: 'risk-validation',
            responsible: null,
            startDate: '',
            endDate: '',
            plannedProgress: 0,
            actualProgress: 0,
            dailyProgress: [],
            status: 'pending',
            recoveryPlan: '',
            evidenceFiles: [],
            checklist: [],
            subActions: [],
            isRiskValidation: true
          });
          hasChanges = true;
        }
      });

      // ---- PART 3: Remove actions for areas no longer in validationAreas ----
      // (Only remove auto-generated ones, keep manually added ones)
      const areasToKeep = new Set(validationAreas);
      const riskValidationsToKeep = new Set(
        selectedValidations.map(v => typeof v === 'string' ? v : v.text)
      );

      updatedActions = updatedActions.filter(action => {
        // Keep manually added actions (no areaKey or not auto-generated)
        if (!action.areaKey) return true;

        // Keep risk validations that are still selected
        if (action.isRiskValidation) {
          return riskValidationsToKeep.has(action.action);
        }

        // Keep area validations that are still in validationAreas
        if (action.areaKey && action.areaKey !== 'risk-validation') {
          return areasToKeep.has(action.areaKey);
        }

        return true;
      });

      if (hasChanges || updatedActions.length !== prev.validationActions.length) {
        return { ...prev, validationActions: updatedActions };
      }

      // No changes needed
      return prev;
    });
  }, [
    loadingAreas,
    impactAreas,
    data.validationAreas,
    data.validationTeams,
    data.impactAnalysis,
    data.selectedValidations
  ]);

  // Load users
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

  // Update parent when data changes
  useEffect(() => {
    onDataUpdate(formData);
  }, [formData]);

  // Sync formData with server data when ECR ID changes (initial load)
  const [lastSyncedId, setLastSyncedId] = React.useState(null);

  useEffect(() => {
    // Only sync when ID changes (not on every data update)
    if (data.id && data.id !== lastSyncedId) {
      setLastSyncedId(data.id);

      if (data.validationEvidence && Object.keys(data.validationEvidence).length > 0) {
        setFormData(prev => ({
          ...prev,
          validationEvidence: {
            ...defaultValidationEvidence,
            ...data.validationEvidence,
            validationType: {
              ...defaultValidationEvidence.validationType,
              ...(data.validationEvidence.validationType || {})
            },
            beforeEvidence: {
              ...defaultValidationEvidence.beforeEvidence,
              ...(data.validationEvidence.beforeEvidence || {})
            },
            afterEvidence: {
              ...defaultValidationEvidence.afterEvidence,
              ...(data.validationEvidence.afterEvidence || {})
            },
            summary: {
              ...defaultValidationEvidence.summary,
              ...(data.validationEvidence.summary || {})
            }
          }
        }));
      }
    }
  }, [data.id]);

  // Calculate planned progress based on dates
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
    return Math.min(100, Math.round((daysPassed / totalDays) * 100));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewActionChange = (field, value) => {
    setNewAction(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAction = () => {
    if (!newAction.action.trim()) {
      showError('El campo Acción es requerido');
      return;
    }
    if (!newAction.area) {
      showError('Debes seleccionar un área');
      return;
    }
    if (!newAction.responsible) {
      showError('Debes asignar un responsable');
      return;
    }
    if (!newAction.startDate || !newAction.endDate) {
      showError('Debes especificar fechas de inicio y fin');
      return;
    }

    const actionWithId = {
      ...newAction,
      id: Date.now().toString(),
      plannedProgress: calcPlanned(newAction.startDate, newAction.endDate)
    };

    setFormData(prev => ({
      ...prev,
      validationActions: [...prev.validationActions, actionWithId]
    }));

    // Reset form
    setNewAction({
      action: '',
      result: '',
      area: '',
      responsible: null,
      startDate: '',
      endDate: '',
      plannedProgress: 0,
      actualProgress: 0,
      dailyProgress: [],
      status: 'pending',
      recoveryPlan: '',
      evidenceFiles: [],
      checklist: []
    });

    showSuccess('Acción agregada exitosamente');
  };

  const handleRemoveAction = (actionId) => {
    const action = formData.validationActions.find(a => a.id === actionId);
    if (!action) return;

    const hasActivities = action.dailyProgress && action.dailyProgress.length > 0;
    const hasEvidence = action.evidenceFiles && action.evidenceFiles.length > 0;

    let confirmMessage = `¿Estás seguro de eliminar esta acción?\n\n"${action.action}"\n\n`;

    if (hasActivities) {
      confirmMessage += ` Esta acción tiene ${action.dailyProgress.length} actividad(es) registrada(s).\n`;
    }
    if (hasEvidence) {
      confirmMessage += ` Esta acción tiene ${action.evidenceFiles.length} archivo(s) de evidencia.\n`;
    }

    confirmMessage += '\nEsta acción NO se puede deshacer.';

    if (window.confirm(confirmMessage)) {
      setFormData(prev => ({
        ...prev,
        validationActions: prev.validationActions.filter(a => a.id !== actionId)
      }));
      showSuccess('Acción eliminada');
    }
  };

  // Update action fields - memoizado para evitar re-renders del Gantt
  const handleUpdateAction = useCallback((actionId, updates) => {
    setFormData(prev => {
      const updated = prev.validationActions.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      );
      return { ...prev, validationActions: updated };
    });
  }, []);

  // Update sub-action fields
  const handleUpdateSubAction = (actionId, subActionId, updates) => {
    setFormData(prev => ({
      ...prev,
      validationActions: prev.validationActions.map(action => {
        if (action.id !== actionId) return action;
        return {
          ...action,
          subActions: (action.subActions || []).map(sub =>
            sub.id === subActionId ? { ...sub, ...updates } : sub
          )
        };
      })
    }));
  };

  // Get team members for an area (for sub-action responsible selection)
  const getTeamMembersForArea = (areaKey) => {
    const validationTeams = data.validationTeams || {};
    const teamMemberIds = validationTeams[areaKey] || [];
    if (teamMemberIds.length > 0) {
      return users.filter(u => teamMemberIds.includes(u.id));
    }
    return users; // Fallback to all users
  };

  // Handle evidence upload for actions
  const handleActionEvidenceUpload = async (actionId, files) => {
    if (!files || files.length === 0 || !data.id) return;

    try {
      setUploadingActionEvidence(actionId);
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();

      Array.from(files).forEach(file => {
        formDataUpload.append('evidence', file);
      });

      const response = await fetch(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formDataUpload
        }
      );

      const result = await response.json();

      if (result.success) {
        const uploadedFiles = result.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        setFormData(prev => ({
          ...prev,
          validationActions: prev.validationActions.map(action =>
            action.id === actionId
              ? { ...action, evidenceFiles: [...(action.evidenceFiles || []), ...uploadedFiles] }
              : action
          )
        }));

        showSuccess(`${uploadedFiles.length} archivo(s) subido(s) exitosamente`);
      }
    } catch (error) {
      console.error('Error uploading action evidence:', error);
      showError('Error al subir evidencia');
    } finally {
      setUploadingActionEvidence(null);
    }
  };

  // Remove evidence file from action
  const removeActionEvidenceFile = (actionId, fileIndex) => {
    setFormData(prev => ({
      ...prev,
      validationActions: prev.validationActions.map(action =>
        action.id === actionId
          ? { ...action, evidenceFiles: action.evidenceFiles.filter((_, idx) => idx !== fileIndex) }
          : action
      )
    }));
    showSuccess('Evidencia eliminada');
  };

  // Helper to parse local date
  const parseLocalDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // ========== Validation Evidence Helpers ==========
  const updateValidationEvidence = (field, value) => {
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        [field]: value
      }
    }));
  };

  const updateValidationType = (type, checked) => {
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        validationType: {
          ...prev.validationEvidence.validationType,
          [type]: checked
        }
      }
    }));
  };

  // Handle validation signature
  const handleSignValidation = () => {
    const confirmed = window.confirm(
      ' ATENCIÓN\n\n' +
      'Al firmar esta sección:\n' +
      '• Se bloqueará permanentemente y no podrá ser modificada\n' +
      '• Su firma quedará registrada como responsable de la validación\n' +
      '• Esta acción no se puede deshacer\n\n' +
      '¿Está seguro de que desea firmar la Validación?'
    );

    if (confirmed) {
      const now = new Date().toISOString();
      setFormData(prev => ({
        ...prev,
        validationEvidence: {
          ...prev.validationEvidence,
          signedBy: currentUser?.id,
          signedByName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
          signedAt: now,
          isLocked: true
        }
      }));
      showSuccess('Validación firmada exitosamente');
    }
  };

  const addValidationCriteria = () => {
    const newCriteria = {
      id: Date.now().toString(),
      parameter: '',
      method: '',
      target: '',
      before: '',
      after: '',
      status: ''
    };
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        criteria: [...prev.validationEvidence.criteria, newCriteria]
      }
    }));
  };

  const updateValidationCriteria = (criteriaId, field, value) => {
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        criteria: prev.validationEvidence.criteria.map(c =>
          c.id === criteriaId ? { ...c, [field]: value } : c
        )
      }
    }));
  };

  const removeValidationCriteria = (criteriaId) => {
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        criteria: prev.validationEvidence.criteria.filter(c => c.id !== criteriaId)
      }
    }));
  };

  const updateEvidenceSection = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        [section]: {
          ...prev.validationEvidence[section],
          [field]: value
        }
      }
    }));
  };

  const handleEvidenceFileUpload = async (section, files) => {
    if (!files || files.length === 0 || !data.id) return;

    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();

      Array.from(files).forEach(file => {
        formDataUpload.append('evidence', file);
      });

      const response = await fetch(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload
        }
      );

      const result = await response.json();

      if (result.success) {
        const uploadedFiles = result.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        setFormData(prev => ({
          ...prev,
          validationEvidence: {
            ...prev.validationEvidence,
            [section]: {
              ...prev.validationEvidence[section],
              files: [...(prev.validationEvidence[section].files || []), ...uploadedFiles]
            }
          }
        }));

        showSuccess(`${uploadedFiles.length} archivo(s) subido(s)`);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError('Error al subir evidencia');
    }
  };

  const removeEvidenceFile = (section, fileIndex) => {
    setFormData(prev => ({
      ...prev,
      validationEvidence: {
        ...prev.validationEvidence,
        [section]: {
          ...prev.validationEvidence[section],
          files: prev.validationEvidence[section].files.filter((_, idx) => idx !== fileIndex)
        }
      }
    }));
  };

  const handleNoValidationFileUpload = async (files) => {
    if (!files || files.length === 0 || !data.id) return;

    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();

      Array.from(files).forEach(file => {
        formDataUpload.append('evidence', file);
      });

      const response = await fetch(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload
        }
      );

      const result = await response.json();

      if (result.success) {
        const uploadedFiles = result.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        setFormData(prev => ({
          ...prev,
          validationEvidence: {
            ...prev.validationEvidence,
            noValidationFiles: [...(prev.validationEvidence.noValidationFiles || []), ...uploadedFiles]
          }
        }));

        showSuccess(`${uploadedFiles.length} archivo(s) subido(s)`);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError('Error al subir evidencia');
    }
  };
  // ========== End Validation Evidence Helpers ==========

  const toggleExpandAction = (actionId) => {
    setExpandedActions(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));

    if (!dailyEntries[actionId]) {
      const today = new Date().toISOString().split('T')[0];
      setDailyEntries(prev => ({
        ...prev,
        [actionId]: { date: today, progress: '', activities: '' }
      }));
    }
  };

  const handleAddDailyProgress = (actionId) => {
    const entry = dailyEntries[actionId];
    if (!entry || !entry.date || entry.progress === undefined || entry.progress === '') {
      showError('Debes ingresar una fecha y un progreso');
      return;
    }

    const progress = parseFloat(entry.progress);
    if (progress < 0 || progress > 100) {
      showError('El progreso debe estar entre 0 y 100');
      return;
    }

    // Check for duplicate date
    const action = formData.validationActions.find(a => a.id === actionId);
    const existingEntry = action?.dailyProgress?.find(d => d.date === entry.date);

    if (existingEntry) {
      const confirmUpdate = window.confirm(
        ` Ya existe una actividad para ${new Date(entry.date).toLocaleDateString('es-MX')}:\n\n` +
        `Progreso: ${existingEntry.progress}%\n` +
        `Actividades: ${existingEntry.activities || '(sin descripción)'}\n\n` +
        `¿Deseas reemplazarla con los nuevos datos?`
      );

      if (!confirmUpdate) return;
    }

    setFormData(prev => ({
      ...prev,
      validationActions: prev.validationActions.map(action => {
        if (action.id === actionId) {
          const dailyProgress = action.dailyProgress || [];

          // If date exists, replace it; otherwise add new
          let newDailyProgress;
          if (existingEntry) {
            newDailyProgress = dailyProgress.map(d =>
              d.date === entry.date
                ? { ...d, progress: progress, activities: entry.activities || '' }
                : d
            );
          } else {
            newDailyProgress = [...dailyProgress, {
              date: entry.date,
              progress: progress,
              accumulated: 0,
              activities: entry.activities || ''
            }];
          }

          // Sort by date
          newDailyProgress.sort((a, b) => new Date(a.date) - new Date(b.date));

          // Recalculate accumulated
          let accumulated = 0;
          const updatedProgress = newDailyProgress.map(d => {
            accumulated += d.progress;
            return { ...d, accumulated: Math.min(100, accumulated) };
          });

          const totalProgress = updatedProgress.length > 0
            ? updatedProgress[updatedProgress.length - 1].accumulated
            : 0;

          return {
            ...action,
            dailyProgress: updatedProgress,
            actualProgress: totalProgress,
            status: totalProgress >= 100 ? 'completed' : 'in_progress'
          };
        }
        return action;
      })
    }));

    setDailyEntries(prev => ({
      ...prev,
      [actionId]: { date: new Date().toISOString().split('T')[0], progress: '', activities: '' }
    }));
    setExpandedActions(prev => ({
      ...prev,
      [actionId]: false
    }));

    showSuccess('Progreso agregado correctamente');
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  const getProgressColor = (actual, planned) => {
    if (actual >= 100) return '#2E7D32'; // Green - completed
    if (actual >= planned) return t.accent; // Blue - on track
    if (actual >= planned - 10) return '#C77700'; // Orange - slight delay
    return '#ef4444'; // Red - delayed
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pendiente', color: t.textDim },
      in_progress: { text: 'En Progreso', color: t.accent },
      completed: { text: 'Completado', color: '#2E7D32' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span style={{
        padding: '4px 12px',
        backgroundColor: badge.color,
        color: 'white',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {badge.text}
      </span>
    );
  };

  // Handle communication plan changes
  const handleCommunicationPlanChange = (stakeholder, field, value) => {
    setFormData(prev => ({
      ...prev,
      communicationPlan: {
        ...prev.communicationPlan,
        [stakeholder]: {
          ...prev.communicationPlan[stakeholder],
          [field]: value
        }
      }
    }));
  };

  // Handle customer approval changes
  const handleCustomerApprovalChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      customerApproval: {
        ...prev.customerApproval,
        [field]: value
      }
    }));
  };

  // Handle customer approval evidence upload
  const handleCustomerApprovalEvidenceUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingValidation('customerApproval');
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();

      Array.from(files).forEach(file => {
        formDataUpload.append('evidence', file);
      });

      const response = await fetch(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formDataUpload
        }
      );

      const result = await response.json();

      if (result.success) {
        const uploadedFiles = result.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        setFormData(prev => ({
          ...prev,
          customerApproval: {
            ...prev.customerApproval,
            evidence: [...prev.customerApproval.evidence, ...uploadedFiles]
          }
        }));

        showSuccess(`${uploadedFiles.length} archivo(s) subido(s) exitosamente`);
      }
    } catch (error) {
      console.error('Error uploading customer approval evidence:', error);
      showError('Error al subir evidencia');
    } finally {
      setUploadingValidation(null);
    }
  };

  const removeCustomerApprovalEvidence = (fileIndex) => {
    setFormData(prev => ({
      ...prev,
      customerApproval: {
        ...prev.customerApproval,
        evidence: prev.customerApproval.evidence.filter((_, index) => index !== fileIndex)
      }
    }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-3: Validation & Implementation Plan</h2>
        <p style={styles.subtitle}>Plan de validaciones por área y plan de implementación</p>
      </div>

      {/* MASTER PLAN: Validation by Area, Trial & Evaluation and Production Implementation */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.badge}>MASTER PLAN: Validation by Area, Trial & Evaluation and Production Implementation</span>
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => updateViewMode('table')}
              style={{
                ...styles.viewButton,
                backgroundColor: viewMode === 'table' ? t.accent : t.bgPanel,
                color: viewMode === 'table' ? 'white' : t.text
              }}
            >
               Vista Tabla
            </button>
            <button
              onClick={() => updateViewMode('gantt')}
              style={{
                ...styles.viewButton,
                backgroundColor: viewMode === 'gantt' ? t.accent : t.bgPanel,
                color: viewMode === 'gantt' ? 'white' : t.text
              }}
            >
               Vista Gantt
            </button>
          </div>
        </div>

        {/* Legend about Gantt for progress */}
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}></span>
          <span style={{ fontSize: '13px', color: t.text }}>
            <strong>Tip:</strong> Para agregar avance de progreso, puede hacerlo desde la <strong>Vista Gantt</strong> haciendo clic en cada actividad.
          </span>
        </div>

        {/* Actions List FIRST (moved above add form) */}
        {viewMode === 'table' ? (
          <div style={{ marginBottom: '24px' }}>
            {formData.validationActions.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '14px', color: t.textMuted }}>
                  No hay acciones de validación agregadas. Agrega la primera acción abajo.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.validationActions.map(action => {
                  const currentPlanned = calcPlanned(action.startDate, action.endDate);
                  const isCollapsed = collapsedMasterActions[action.id];

                  return (
                    <div key={action.id} style={{
                      ...styles.actionCard,
                      transition: 'all 0.2s ease'
                    }}>
                      {/* Collapsible Header - Always visible */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => toggleMasterActionCollapse(action.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <span style={{
                            transition: 'transform 0.2s',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            display: 'inline-block',
                            fontSize: '12px',
                            color: t.textMuted
                          }}>▼</span>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: t.text, flex: 1 }}>
                            {action.action}
                          </h4>
                          {getStatusBadge(action.status)}
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {action.area}
                          </span>
                        </div>

                        {/* Always visible: Progress & Responsible */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '16px' }}>
                          <span style={{ fontSize: '12px', color: t.textMuted }}>
                             {getUserName(action.responsible)}
                          </span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 12px',
                            backgroundColor: getProgressColor(action.actualProgress, currentPlanned) === '#2E7D32' ? '#d1fae5' :
                                           getProgressColor(action.actualProgress, currentPlanned) === '#C77700' ? '#fef3c7' : '#fee2e2',
                            borderRadius: '16px'
                          }}>
                            <span style={{ fontSize: '11px', color: t.textMuted }}>Avance:</span>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: getProgressColor(action.actualProgress, currentPlanned)
                            }}>
                              {action.actualProgress || 0}%
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAction(editingAction === action.id ? null : action.id);
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: editingAction === action.id ? '#C77700' : t.accent,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            {editingAction === action.id ? ' Cancelar' : ' Editar'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAction(action.id);
                            }}
                            style={{
                              ...styles.removeButton,
                              padding: '4px 8px',
                              fontSize: '11px'
                            }}
                          >
                            
                          </button>
                        </div>
                      </div>

                      {/* Edit Mode */}
                      {editingAction === action.id && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `2px solid ${t.accent}`, backgroundColor: '#eff6ff', margin: '16px -16px -16px -16px', padding: '16px', borderRadius: '0 0 8px 8px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div style={styles.field}>
                              <label style={styles.label}>Acción de Validación *</label>
                              <textarea
                                style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                                value={action.action}
                                onChange={(e) => handleUpdateAction(action.id, { action: e.target.value })}
                                rows="2"
                              />
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Resultado Esperado</label>
                              <textarea
                                style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                                value={action.result || ''}
                                onChange={(e) => handleUpdateAction(action.id, { result: e.target.value })}
                                rows="2"
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div style={styles.field}>
                              <label style={styles.label}>Área *</label>
                              <select
                                style={styles.select}
                                value={action.area}
                                onChange={(e) => handleUpdateAction(action.id, { area: e.target.value })}
                              >
                                <option value="">Seleccionar área...</option>
                                {availableAreas.map(area => (
                                  <option key={area} value={area}>{area}</option>
                                ))}
                              </select>
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Responsable *</label>
                              <select
                                style={styles.select}
                                value={action.responsible || ''}
                                onChange={(e) => handleUpdateAction(action.id, { responsible: parseInt(e.target.value) })}
                              >
                                <option value="">Seleccionar responsable...</option>
                                {users.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName} - {user.position}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div style={styles.field}>
                              <label style={styles.label}>Fecha Inicio *</label>
                              <input
                                type="date"
                                style={styles.input}
                                value={action.startDate}
                                onChange={(e) => handleUpdateAction(action.id, { startDate: e.target.value })}
                              />
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Fecha Fin *</label>
                              <input
                                type="date"
                                style={styles.input}
                                value={action.endDate}
                                onChange={(e) => handleUpdateAction(action.id, { endDate: e.target.value })}
                              />
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Status</label>
                              <select
                                style={styles.select}
                                value={action.status}
                                onChange={(e) => handleUpdateAction(action.id, { status: e.target.value })}
                              >
                                <option value="pending">Pendiente</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="completed">Completado</option>
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingAction(null)}
                            style={{
                              padding: '8px 24px',
                              backgroundColor: '#2E7D32',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                             Listo
                          </button>
                        </div>
                      )}

                      {/* Expanded Content - Only show when not editing */}
                      {!isCollapsed && editingAction !== action.id && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
                          {/* Resultado esperado */}
                          {action.result && (
                            <div style={{ fontSize: '13px', color: '#2E7D32', marginBottom: '12px', fontStyle: 'italic' }}>
                               Resultado esperado: {action.result}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: t.textMuted, marginBottom: '12px' }}>
                            <span> {action.startDate} → {action.endDate}</span>
                          </div>

                          {/* Progress Bars - Dual */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              {/* Planned Progress */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                                  <span style={{ color: t.textMuted }}> Planeado</span>
                                  <span style={{ fontWeight: '600', color: t.textMuted }}>{currentPlanned}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${currentPlanned}%`, height: '100%', backgroundColor: t.textDim, transition: 'width 0.3s' }} />
                                </div>
                              </div>
                              {/* Actual Progress */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                                  <span style={{ color: t.textMuted }}> Real</span>
                                  <span style={{ fontWeight: '600', color: getProgressColor(action.actualProgress, currentPlanned) }}>
                                    {action.actualProgress || 0}%
                                  </span>
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${action.actualProgress || 0}%`,
                                    height: '100%',
                                    backgroundColor: getProgressColor(action.actualProgress, currentPlanned),
                                    transition: 'width 0.3s'
                                  }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sub-Actions Section - from ECR-2B Aspectos Afectados */}
                          {action.subActions && action.subActions.length > 0 && (
                            <div style={{
                              marginBottom: '16px',
                              padding: '12px',
                              backgroundColor: '#faf5ff',
                              borderRadius: '8px',
                              border: '1px solid #c4b5fd'
                            }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6d28d9', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 Aspectos a Validar ({action.subActions.length})
                                <span style={{ fontSize: '10px', fontWeight: '400', color: '#7c3aed' }}>
                                  (desde ECR-2B)
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {action.subActions.map((subAction, subIndex) => {
                                  const teamMembers = getTeamMembersForArea(action.areaKey);
                                  return (
                                    <div key={subAction.id} style={{
                                      padding: '10px 12px',
                                      backgroundColor: t.bgCard,
                                      borderRadius: '6px',
                                      border: subAction.status === 'completed' ? '1px solid #2E7D32' : `1px solid ${t.border}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px'
                                    }}>
                                      {/* Sub-action number */}
                                      <span style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: subAction.status === 'completed' ? '#2E7D32' : '#8b5cf6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        flexShrink: 0
                                      }}>
                                        {subAction.status === 'completed' ? '' : subIndex + 1}
                                      </span>

                                      {/* Sub-action name */}
                                      <div style={{ flex: 1, minWidth: '120px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: t.text }}>
                                          {subAction.name}
                                        </div>
                                      </div>

                                      {/* Responsible selector */}
                                      <div style={{ minWidth: '180px' }}>
                                        <select
                                          style={{
                                            width: '100%',
                                            padding: '6px 8px',
                                            fontSize: '12px',
                                            border: `1px solid ${t.border}`,
                                            borderRadius: '4px',
                                            backgroundColor: t.bgCard
                                          }}
                                          value={subAction.responsible || ''}
                                          onChange={(e) => handleUpdateSubAction(action.id, subAction.id, {
                                            responsible: e.target.value ? parseInt(e.target.value) : null
                                          })}
                                        >
                                          <option value="">Asignar responsable...</option>
                                          {teamMembers.map(user => (
                                            <option key={user.id} value={user.id}>
                                              {user.firstName} {user.lastName}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Status selector */}
                                      <select
                                        style={{
                                          padding: '6px 8px',
                                          fontSize: '11px',
                                          border: `1px solid ${t.border}`,
                                          borderRadius: '4px',
                                          backgroundColor: subAction.status === 'completed' ? '#d1fae5' :
                                                          subAction.status === 'in_progress' ? '#fef3c7' : t.bgCard,
                                          fontWeight: '500',
                                          color: subAction.status === 'completed' ? '#2E7D32' :
                                                 subAction.status === 'in_progress' ? '#C77700' : t.text
                                        }}
                                        value={subAction.status || 'pending'}
                                        onChange={(e) => handleUpdateSubAction(action.id, subAction.id, { status: e.target.value })}
                                      >
                                        <option value="pending">Pendiente</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="completed">Completado</option>
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Progress summary */}
                              <div style={{ marginTop: '12px', fontSize: '11px', color: t.textMuted, display: 'flex', gap: '16px' }}>
                                <span> Completados: {action.subActions.filter(s => s.status === 'completed').length}</span>
                                <span> En progreso: {action.subActions.filter(s => s.status === 'in_progress').length}</span>
                                <span> Pendientes: {action.subActions.filter(s => s.status === 'pending').length}</span>
                              </div>
                            </div>
                          )}

                          {/* Daily Progress Section - Collapsible History */}
                          <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: t.bg, borderRadius: '6px', border: `1px solid ${t.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsedHistory[action.id] ? '0' : '8px' }}>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsedHistory(prev => {
                                    const newState = { ...prev, [action.id]: !prev[action.id] };
                                    localStorage.setItem(`ecr3_collapsed_history_${data?.id || 'temp'}`, JSON.stringify(newState));
                                    return newState;
                                  });
                                }}
                                style={{ fontSize: '12px', fontWeight: '600', color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}
                              >
                                <span style={{ transition: 'transform 0.2s', transform: collapsedHistory[action.id] ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                                 Historial de Actividades {action.dailyProgress && action.dailyProgress.length > 0 && `(${action.dailyProgress.length})`}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandAction(action.id);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: expandedActions[action.id] ? t.textDim : t.accent,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                {expandedActions[action.id] ? ' Cancelar' : '+ Agregar'}
                              </button>
                            </div>

                            {/* Add Progress Form */}
                            {expandedActions[action.id] && (
                              <div style={{
                                padding: '12px',
                                backgroundColor: t.bgCard,
                                borderRadius: '6px',
                                border: `2px solid ${t.accent}`,
                                marginBottom: '12px'
                              }}
                              onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                  <div>
                                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Fecha</label>
                                    <input
                                      type="date"
                                      style={{ ...styles.input, padding: '6px 8px', fontSize: '12px' }}
                                      value={dailyEntries[action.id]?.date || ''}
                                      onChange={(e) => setDailyEntries(prev => ({
                                        ...prev,
                                        [action.id]: { ...prev[action.id], date: e.target.value }
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Progreso (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      style={{ ...styles.input, padding: '6px 8px', fontSize: '12px' }}
                                      value={dailyEntries[action.id]?.progress || ''}
                                      onChange={(e) => setDailyEntries(prev => ({
                                        ...prev,
                                        [action.id]: { ...prev[action.id], progress: e.target.value }
                                      }))}
                                      placeholder="0-100"
                                    />
                                  </div>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Actividades realizadas</label>
                                  <textarea
                                    style={{ ...styles.input, minHeight: '50px', fontSize: '12px', resize: 'vertical' }}
                                    value={dailyEntries[action.id]?.activities || ''}
                                    onChange={(e) => setDailyEntries(prev => ({
                                      ...prev,
                                      [action.id]: { ...prev[action.id], activities: e.target.value }
                                    }))}
                                    placeholder="Describe las actividades realizadas..."
                                  />
                                </div>
                                <button
                                  onClick={() => handleAddDailyProgress(action.id)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    backgroundColor: '#2E7D32',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                   Guardar Actividad
                                </button>
                              </div>
                            )}

                            {/* History List */}
                            {!collapsedHistory[action.id] && action.dailyProgress && action.dailyProgress.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                {[...action.dailyProgress]
                                  .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
                                  .map((entry, idx) => (
                                    <div key={idx} style={{
                                      padding: '8px',
                                      backgroundColor: t.bgCard,
                                      borderRadius: '4px',
                                      border: `1px solid ${t.border}`,
                                      fontSize: '12px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entry.activities ? '4px' : '0' }}>
                                        <span style={{ fontWeight: '600', color: t.text }}>
                                           {parseLocalDate(entry.date).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: t.accent,
                                          backgroundColor: '#dbeafe',
                                          padding: '2px 6px',
                                          borderRadius: '3px'
                                        }}>
                                          +{entry.progress}% → {entry.accumulated}%
                                        </span>
                                      </div>
                                      {entry.activities && (
                                        <div style={{ color: t.textMuted, lineHeight: '1.4' }}>{entry.activities}</div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}

                          </div>

                          {/* Evidence Upload Section */}
                          <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', marginBottom: '8px' }}>
                               Evidencia de Implementación
                            </div>

                            {action.evidenceFiles && action.evidenceFiles.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                {action.evidenceFiles.map((file, fileIndex) => (
                                  <div key={fileIndex} style={{
                                    padding: '8px',
                                    backgroundColor: t.bgCard,
                                    borderRadius: '4px',
                                    border: '1px solid #86efac',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}>
                                    <a
                                      href={`http://localhost:5000${file.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '12px', fontWeight: '500', color: '#15803d', textDecoration: 'none', flex: 1 }}
                                    >
                                       {file.name}
                                    </a>
                                    <button
                                      onClick={() => removeActionEvidenceFile(action.id, fileIndex)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#B00020',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '12px', fontStyle: 'italic' }}>
                                Sin evidencia adjunta
                              </div>
                            )}

                            <input
                              type="file"
                              id={`evidence-${action.id}`}
                              style={{ display: 'none' }}
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              onChange={(e) => handleActionEvidenceUpload(action.id, e.target.files)}
                            />
                            <label
                              htmlFor={`evidence-${action.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                backgroundColor: data.id ? '#2E7D32' : t.textDim,
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: data.id ? 'pointer' : 'not-allowed'
                              }}
                            >
                              {uploadingActionEvidence === action.id ? ' Subiendo...' : ' Subir Evidencia'}
                            </label>
                            {!data.id && (
                              <span style={{ fontSize: '10px', color: '#B00020', marginLeft: '8px' }}>
                                Guarda el ECR primero
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            {formData.validationActions.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No hay acciones para mostrar en el Gantt. Agrega acciones abajo.</p>
              </div>
            ) : (
              <GanttChart
                tasks={formData.validationActions}
                users={users}
                onTaskUpdate={handleUpdateAction}
                viewScale="Week"
              />
            )}
          </div>
        )}

        {/* Add New Action Form - Collapsible */}
        <div style={{
          ...styles.addActionForm,
          borderTop: `2px dashed ${t.border}`,
          marginTop: '8px',
          padding: addFormCollapsed ? '12px 16px' : '16px'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={toggleAddFormCollapse}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              marginBottom: addFormCollapsed ? '0' : '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                transition: 'transform 0.2s',
                transform: addFormCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                display: 'inline-block',
                fontSize: '12px',
                color: t.textMuted
              }}>▼</span>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: t.text }}>
                 Agregar Nueva Acción de Validación
              </h4>
            </div>
            <span style={{
              fontSize: '11px',
              color: t.textMuted,
              padding: '4px 8px',
              backgroundColor: t.bg,
              borderRadius: '4px'
            }}>
              {addFormCollapsed ? 'Clic para expandir' : 'Clic para colapsar'}
            </span>
          </div>

          {/* Form Content - Only visible when expanded */}
          {!addFormCollapsed && (
            <>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Acción de Validación *</label>
                  <textarea
                    style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                    value={newAction.action}
                    onChange={(e) => handleNewActionChange('action', e.target.value)}
                    placeholder="Ej: Validar factibilidad de diseño con simulación FEA"
                    rows="2"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Resultado Esperado</label>
                  <textarea
                    style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                    value={newAction.result}
                    onChange={(e) => handleNewActionChange('result', e.target.value)}
                    placeholder="Describe el resultado esperado de esta acción..."
                    rows="2"
                  />
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Área *</label>
                  <select
                    style={styles.select}
                    value={newAction.area}
                    onChange={(e) => handleNewActionChange('area', e.target.value)}
                  >
                    <option value="">Seleccionar área...</option>
                    {availableAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Responsable *</label>
                  <select
                    style={styles.select}
                    value={newAction.responsible || ''}
                    onChange={(e) => handleNewActionChange('responsible', parseInt(e.target.value))}
                  >
                    <option value="">Seleccionar responsable...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} - {user.position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={styles.field}>
                  <label style={styles.label}>Fecha Inicio *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={newAction.startDate}
                    onChange={(e) => handleNewActionChange('startDate', e.target.value)}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Fecha Fin *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={newAction.endDate}
                    onChange={(e) => handleNewActionChange('endDate', e.target.value)}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Status</label>
                  <select
                    style={styles.select}
                    value={newAction.status}
                    onChange={(e) => handleNewActionChange('status', e.target.value)}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>
                <div style={{ ...styles.field, justifyContent: 'flex-end' }}>
                  <label style={{ ...styles.label, visibility: 'hidden' }}>.</label>
                  <button onClick={handleAddAction} style={styles.addButton}>
                     Agregar Acción
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validation Evidence - New Flow */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>Validation Evidence</span>
        </h3>
        <p style={styles.sectionDescription}>
          Evidencia y resultados de la validación del cambio
        </p>

        {/* Initial Question - Show when null or undefined */}
        {(formData.validationEvidence?.requiresValidation === null || formData.validationEvidence?.requiresValidation === undefined) && (
          <div style={{
            padding: '24px',
            backgroundColor: '#f0f9ff',
            borderRadius: '12px',
            border: '2px solid #0ea5e9',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#0369a1', marginBottom: '20px' }}>
              ¿Este cambio requirió validación funcional o modificación de documentos?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => updateValidationEvidence('requiresValidation', true)}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                 Sí, requirió validación
              </button>
              <button
                onClick={() => updateValidationEvidence('requiresValidation', false)}
                style={{
                  padding: '12px 32px',
                  backgroundColor: t.textDim,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                 No, solo requiere firma
              </button>
            </div>
          </div>
        )}

        {/* YES - Requires Validation Flow */}
        {formData.validationEvidence?.requiresValidation === true && (
          <div>
            {/* Change answer button - hidden when locked */}
            {!formData.validationEvidence.isLocked && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => updateValidationEvidence('requiresValidation', null)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: t.textMuted,
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ← Cambiar respuesta
                </button>
              </div>
            )}

            {/* Validation Type Selection */}
            <div style={{
              padding: '16px',
              backgroundColor: t.bg,
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: t.text, display: 'block', marginBottom: '12px' }}>
                Tipo de validación requerida:
              </label>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: formData.validationEvidence.isLocked ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.validationEvidence.validationType.functional}
                    onChange={(e) => updateValidationType('functional', e.target.checked)}
                    disabled={formData.validationEvidence.isLocked}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>Prueba funcional / Dimensional</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: formData.validationEvidence.isLocked ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.validationEvidence.validationType.documents}
                    onChange={(e) => updateValidationType('documents', e.target.checked)}
                    disabled={formData.validationEvidence.isLocked}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>Modificación de documentos (AMEF, Plan de Control, etc.)</span>
                </label>
              </div>
            </div>

            {/* Criteria Table */}
            <div style={{
              padding: '16px',
              backgroundColor: t.bgCard,
              borderRadius: '8px',
              border: `1px solid ${t.border}`,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                   Criterios de Validación
                </label>
                {!formData.validationEvidence.isLocked && (
                  <button
                    onClick={addValidationCriteria}
                    style={{
                      padding: '6px 12px',
                    backgroundColor: t.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Agregar Criterio
                  </button>
                )}
              </div>

              {formData.validationEvidence.criteria.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: t.textDim, fontStyle: 'italic' }}>
                  No hay criterios agregados. Haz clic en "+ Agregar Criterio" para comenzar.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: t.bg }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, fontWeight: '600' }}>Parámetro</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, fontWeight: '600' }}>Método</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, fontWeight: '600' }}>Target</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, fontWeight: '600' }}>Before</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, fontWeight: '600' }}>After</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: `2px solid ${t.border}`, fontWeight: '600', width: '100px' }}>Status</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: `2px solid ${t.border}`, width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.validationEvidence.criteria.map((criteria) => (
                        <tr key={criteria.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={criteria.parameter}
                              onChange={(e) => updateValidationCriteria(criteria.id, 'parameter', e.target.value)}
                              placeholder="Ej: Dimensión X"
                              disabled={formData.validationEvidence.isLocked}
                              style={{ ...styles.input, width: '100%', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={criteria.method}
                              onChange={(e) => updateValidationCriteria(criteria.id, 'method', e.target.value)}
                              placeholder="Ej: CMM"
                              disabled={formData.validationEvidence.isLocked}
                              style={{ ...styles.input, width: '100%', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={criteria.target}
                              onChange={(e) => updateValidationCriteria(criteria.id, 'target', e.target.value)}
                              placeholder="Ej: 10±0.5mm"
                              disabled={formData.validationEvidence.isLocked}
                              style={{ ...styles.input, width: '100%', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={criteria.before}
                              onChange={(e) => updateValidationCriteria(criteria.id, 'before', e.target.value)}
                              placeholder="Valor antes"
                              disabled={formData.validationEvidence.isLocked}
                              style={{ ...styles.input, width: '100%', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={criteria.after}
                              onChange={(e) => updateValidationCriteria(criteria.id, 'after', e.target.value)}
                              placeholder="Valor después"
                              disabled={formData.validationEvidence.isLocked}
                              style={{ ...styles.input, width: '100%', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <select
                              value={criteria.status}
                              onChange={(e) => updateValidationCriteria(criteria.id, 'status', e.target.value)}
                              disabled={formData.validationEvidence.isLocked}
                              style={{
                                ...styles.select,
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                backgroundColor: criteria.status === 'pass' ? '#d1fae5' : criteria.status === 'fail' ? '#fee2e2' : t.bgCard,
                                color: criteria.status === 'pass' ? '#065f46' : criteria.status === 'fail' ? '#991b1b' : t.textMuted
                              }}
                            >
                              <option value="">Seleccionar</option>
                              <option value="pass"> Pass</option>
                              <option value="fail"> Fail</option>
                              <option value="na"> N/A</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {!formData.validationEvidence.isLocked && (
                              <button
                                onClick={() => removeValidationCriteria(criteria.id)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#fee2e2',
                                  color: '#B00020',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Before/After Evidence */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Before Evidence */}
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #C77700'
              }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', display: 'block', marginBottom: '12px' }}>
                   Evidencia ANTES
                </label>
                <textarea
                  value={formData.validationEvidence.beforeEvidence.description}
                  onChange={(e) => updateEvidenceSection('beforeEvidence', 'description', e.target.value)}
                  placeholder="Descripción de la condición antes del cambio..."
                  disabled={formData.validationEvidence.isLocked}
                  style={{ ...styles.input, width: '100%', minHeight: '80px', marginBottom: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                />
                {/* File list */}
                {formData.validationEvidence.beforeEvidence.files?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {formData.validationEvidence.beforeEvidence.files.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px' }}>
                        <a href={`http://localhost:5000${file.url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#92400e' }}>
                           {file.name}
                        </a>
                        {!formData.validationEvidence.isLocked && (
                          <button onClick={() => removeEvidenceFile('beforeEvidence', idx)} style={{ background: 'none', border: 'none', color: '#B00020', cursor: 'pointer' }}></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!formData.validationEvidence.isLocked && (
                  <>
                    <input
                      type="file"
                      id="before-evidence-upload"
                      style={{ display: 'none' }}
                      multiple
                      onChange={(e) => handleEvidenceFileUpload('beforeEvidence', e.target.files)}
                    />
                    <label
                      htmlFor="before-evidence-upload"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: data.id ? '#C77700' : t.border,
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: data.id ? 'pointer' : 'not-allowed'
                      }}
                    >
                       Subir archivos
                    </label>
                  </>
                )}
              </div>

              {/* After Evidence */}
              <div style={{
                padding: '16px',
                backgroundColor: '#d1fae5',
                borderRadius: '8px',
                border: '1px solid #2E7D32'
              }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#065f46', display: 'block', marginBottom: '12px' }}>
                   Evidencia DESPUÉS
                </label>
                <textarea
                  value={formData.validationEvidence.afterEvidence.description}
                  onChange={(e) => updateEvidenceSection('afterEvidence', 'description', e.target.value)}
                  placeholder="Descripción de la condición después del cambio..."
                  disabled={formData.validationEvidence.isLocked}
                  style={{ ...styles.input, width: '100%', minHeight: '80px', marginBottom: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                />
                {/* File list */}
                {formData.validationEvidence.afterEvidence.files?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {formData.validationEvidence.afterEvidence.files.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px' }}>
                        <a href={`http://localhost:5000${file.url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#065f46' }}>
                           {file.name}
                        </a>
                        {!formData.validationEvidence.isLocked && (
                          <button onClick={() => removeEvidenceFile('afterEvidence', idx)} style={{ background: 'none', border: 'none', color: '#B00020', cursor: 'pointer' }}></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!formData.validationEvidence.isLocked && (
                  <>
                    <input
                      type="file"
                      id="after-evidence-upload"
                      style={{ display: 'none' }}
                      multiple
                      onChange={(e) => handleEvidenceFileUpload('afterEvidence', e.target.files)}
                    />
                    <label
                      htmlFor="after-evidence-upload"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: data.id ? '#2E7D32' : t.border,
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: data.id ? 'pointer' : 'not-allowed'
                      }}
                    >
                       Subir archivos
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Validation Summary */}
            <div style={{
              padding: '16px',
              backgroundColor: t.bg,
              borderRadius: '8px',
              border: `1px solid ${t.border}`
            }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: t.text, display: 'block', marginBottom: '12px' }}>
                 Resumen de Validación
              </label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: formData.validationEvidence.isLocked ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    name="validationStatus"
                    checked={formData.validationEvidence.summary.status === 'pass'}
                    onChange={() => updateEvidenceSection('summary', 'status', 'pass')}
                    disabled={formData.validationEvidence.isLocked}
                  />
                  <span style={{ color: '#2E7D32', fontWeight: '600' }}> Aprobado</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: formData.validationEvidence.isLocked ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    name="validationStatus"
                    checked={formData.validationEvidence.summary.status === 'conditional'}
                    onChange={() => updateEvidenceSection('summary', 'status', 'conditional')}
                    disabled={formData.validationEvidence.isLocked}
                  />
                  <span style={{ color: '#C77700', fontWeight: '600' }}> Condicional</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: formData.validationEvidence.isLocked ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    name="validationStatus"
                    checked={formData.validationEvidence.summary.status === 'fail'}
                    onChange={() => updateEvidenceSection('summary', 'status', 'fail')}
                    disabled={formData.validationEvidence.isLocked}
                  />
                  <span style={{ color: '#B00020', fontWeight: '600' }}> Rechazado</span>
                </label>
              </div>
              <textarea
                value={formData.validationEvidence.summary.observations}
                onChange={(e) => updateEvidenceSection('summary', 'observations', e.target.value)}
                placeholder="Observaciones adicionales sobre la validación..."
                disabled={formData.validationEvidence.isLocked}
                style={{ ...styles.input, width: '100%', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Validation Signature Section */}
            <div style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: formData.validationEvidence.isLocked ? '#d1fae5' : '#fef3c7',
              borderRadius: '8px',
              border: `2px solid ${formData.validationEvidence.isLocked ? '#2E7D32' : '#C77700'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: formData.validationEvidence.isLocked ? '#065f46' : '#92400e' }}>
                    {formData.validationEvidence.isLocked ? ' Validación Firmada' : ' Firma de Validación'}
                  </h4>
                  {formData.validationEvidence.isLocked ? (
                    <div style={{ fontSize: '13px', color: '#065f46' }}>
                      <p style={{ margin: '0 0 4px 0' }}>
                        <strong>Firmado por:</strong> {formData.validationEvidence.signedByName}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Fecha:</strong> {new Date(formData.validationEvidence.signedAt).toLocaleString('es-MX')}
                      </p>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#92400e' }}>
                      <p style={{ margin: '0 0 4px 0' }}>
                        <strong>Usuario responsable:</strong> {currentUser?.firstName} {currentUser?.lastName}
                      </p>
                      <p style={{ margin: 0, fontStyle: 'italic' }}>
                        Solo el usuario que realizó la validación debe firmar esta sección.
                      </p>
                    </div>
                  )}
                </div>
                {!formData.validationEvidence.isLocked && (
                  <button
                    onClick={handleSignValidation}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#2E7D32',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                     Firmar Validación
                  </button>
                )}
              </div>
              {formData.validationEvidence.isLocked && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#2E7D32'
                }}>
                   Esta sección ha sido bloqueada y no puede ser modificada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* NO - Just Signature Flow */}
        {formData.validationEvidence?.requiresValidation === false && (
          <div>
            {/* Change answer button */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => updateValidationEvidence('requiresValidation', null)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: t.textMuted,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ← Cambiar respuesta
              </button>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: t.bg,
              borderRadius: '8px',
              border: `1px solid ${t.border}`
            }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: t.text, display: 'block', marginBottom: '12px' }}>
                 Motivo por el que no requiere validación:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="noValidationReason"
                    checked={formData.validationEvidence.noValidationReason === 'backup_tool'}
                    onChange={() => updateValidationEvidence('noValidationReason', 'backup_tool')}
                  />
                  <span>Reposición de herramienta backup</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="noValidationReason"
                    checked={formData.validationEvidence.noValidationReason === 'cosmetic'}
                    onChange={() => updateValidationEvidence('noValidationReason', 'cosmetic')}
                  />
                  <span>Cambio cosmético sin impacto funcional</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="noValidationReason"
                    checked={formData.validationEvidence.noValidationReason === 'like_for_like'}
                    onChange={() => updateValidationEvidence('noValidationReason', 'like_for_like')}
                  />
                  <span>Cambio like-for-like (mismo componente)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="noValidationReason"
                    checked={formData.validationEvidence.noValidationReason === 'other'}
                    onChange={() => updateValidationEvidence('noValidationReason', 'other')}
                  />
                  <span>Otro</span>
                </label>
              </div>

              {formData.validationEvidence.noValidationReason === 'other' && (
                <input
                  type="text"
                  value={formData.validationEvidence.noValidationReasonOther}
                  onChange={(e) => updateValidationEvidence('noValidationReasonOther', e.target.value)}
                  placeholder="Especifica el motivo..."
                  style={{ ...styles.input, marginBottom: '16px' }}
                />
              )}

              <label style={{ fontSize: '14px', fontWeight: '600', color: t.text, display: 'block', marginBottom: '8px' }}>
                Observaciones (opcional):
              </label>
              <textarea
                value={formData.validationEvidence.noValidationObservations}
                onChange={(e) => updateValidationEvidence('noValidationObservations', e.target.value)}
                placeholder="Observaciones adicionales..."
                style={{ ...styles.input, minHeight: '80px', marginBottom: '16px', resize: 'vertical' }}
              />

              <label style={{ fontSize: '14px', fontWeight: '600', color: t.text, display: 'block', marginBottom: '8px' }}>
                Evidencia de recepción/confirmación (opcional):
              </label>
              {formData.validationEvidence.noValidationFiles?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {formData.validationEvidence.noValidationFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px' }}>
                      <a href={`http://localhost:5000${file.url}`} target="_blank" rel="noopener noreferrer" style={{ color: t.accent }}>
                         {file.name}
                      </a>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            validationEvidence: {
                              ...prev.validationEvidence,
                              noValidationFiles: prev.validationEvidence.noValidationFiles.filter((_, i) => i !== idx)
                            }
                          }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#B00020', cursor: 'pointer' }}
                      >
                        
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                id="no-validation-upload"
                style={{ display: 'none' }}
                multiple
                onChange={(e) => handleNoValidationFileUpload(e.target.files)}
              />
              <label
                htmlFor="no-validation-upload"
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: data.id ? t.accent : t.border,
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: data.id ? 'pointer' : 'not-allowed'
                }}
              >
                 Subir archivo
              </label>
              {!data.id && (
                <span style={{ fontSize: '11px', color: '#B00020', marginLeft: '8px' }}>
                  Guarda el ECR primero
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Communication Plan (IATF 8.5.6.1.1) */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>Communication Plan (IATF 8.5.6.1.1)</span>
        </h3>
        <p style={styles.sectionDescription}>
          Plan de comunicación a partes interesadas sobre el cambio
        </p>

        {['customer', 'supplier', 'plant', 'warehouse', 'logistics'].map(stakeholder => {
          const labels = {
            customer: ' Cliente',
            supplier: ' Proveedor',
            plant: ' Planta',
            warehouse: ' Almacén',
            logistics: ' Logística'
          };

          const commData = formData.communicationPlan[stakeholder];
          const isExpanded = expandedStakeholders[stakeholder];

          return (
            <div key={stakeholder} style={styles.stakeholderCard}>
              <label style={styles.stakeholderCheckbox}>
                <input
                  type="checkbox"
                  checked={isExpanded}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setExpandedStakeholders(prev => ({
                      ...prev,
                      [stakeholder]: checked
                    }));
                    // Save expanded state in communication plan
                    setFormData(prev => ({
                      ...prev,
                      communicationPlan: {
                        ...prev.communicationPlan,
                        [stakeholder]: {
                          ...prev.communicationPlan[stakeholder],
                          expanded: checked
                        }
                      }
                    }));
                  }}
                  style={styles.checkbox}
                />
                <h4 style={styles.stakeholderTitle}>{labels[stakeholder]}</h4>
              </label>

              {isExpanded && (
                <>
                  <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Método de Comunicación</label>
                  <select
                    style={styles.select}
                    value={commData.method}
                    onChange={(e) => handleCommunicationPlanChange(stakeholder, 'method', e.target.value)}
                  >
                    <option value="">Seleccionar método...</option>
                    <option value="email"> Email</option>
                    <option value="formal_letter"> Carta Formal</option>
                    <option value="meeting"> Reunión</option>
                    <option value="portal"> Portal/Sistema</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Fecha Programada</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={commData.date}
                    onChange={(e) => handleCommunicationPlanChange(stakeholder, 'date', e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Estado</label>
                  <select
                    style={styles.select}
                    value={commData.status}
                    onChange={(e) => handleCommunicationPlanChange(stakeholder, 'status', e.target.value)}
                  >
                    <option value="pending"> Pendiente</option>
                    <option value="sent"> Enviado</option>
                    <option value="confirmed"> Confirmado</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Notas</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={commData.notes}
                    onChange={(e) => handleCommunicationPlanChange(stakeholder, 'notes', e.target.value)}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Customer Approval (IATF Requirement) */}
      <div style={{
        ...styles.section,
        backgroundColor: formData.customerApproval.required ? '#fef3c7' : t.bgPanel,
        border: formData.customerApproval.required ? '2px solid #C77700' : `1px solid ${t.border}`
      }}>
        <h3 style={styles.sectionTitle}>
          <span style={{
            ...styles.badge,
            backgroundColor: formData.customerApproval.required ? '#C77700' : '#8b5cf6'
          }}>
            Customer Approval (IATF)
          </span>
        </h3>
        <p style={styles.sectionDescription}>
          Aprobación del cliente antes de implementar el cambio
        </p>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.customerApproval.required}
              onChange={(e) => {
                handleCustomerApprovalChange('required', e.target.checked);
                if (e.target.checked) {
                  handleCustomerApprovalChange('status', 'pending');
                } else {
                  handleCustomerApprovalChange('status', 'not_required');
                }
              }}
              style={styles.checkbox}
            />
            <span style={{ marginLeft: '8px', fontWeight: '600' }}>
              Este cambio requiere aprobación del cliente
            </span>
          </label>
        </div>

        {formData.customerApproval.required && (
          <>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Estado de Aprobación *</label>
                <select
                  style={styles.select}
                  value={formData.customerApproval.status}
                  onChange={(e) => handleCustomerApprovalChange('status', e.target.value)}
                >
                  <option value="pending"> Pendiente</option>
                  <option value="approved"> Aprobado</option>
                  <option value="rejected"> Rechazado</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Aprobado Por</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.customerApproval.approvedBy}
                  onChange={(e) => handleCustomerApprovalChange('approvedBy', e.target.value)}
                  placeholder="Nombre del contacto del cliente"
                />
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Fecha de Aprobación</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.customerApproval.approvedAt || ''}
                  onChange={(e) => handleCustomerApprovalChange('approvedAt', e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Comentarios del Cliente</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.customerApproval.comments}
                  onChange={(e) => handleCustomerApprovalChange('comments', e.target.value)}
                  placeholder="Comentarios o condiciones..."
                />
              </div>
            </div>

            {/* Evidence Upload */}
            <div style={styles.evidenceSection}>
              <label style={styles.label}>Evidencia de Aprobación del Cliente</label>
              <p style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 8px 0' }}>
                Subir PSW, email de aprobación, carta formal, etc.
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleCustomerApprovalEvidenceUpload(e.target.files)}
                style={styles.fileInput}
                disabled={uploadingValidation === 'customerApproval' || !data.id}
              />
              {!data.id && (
                <p style={styles.hint}> Guarda el ECR primero para poder subir evidencia</p>
              )}
              {uploadingValidation === 'customerApproval' && (
                <p style={{ fontSize: '13px', color: t.accent, margin: '4px 0 0 0' }}>
                  Subiendo archivos...
                </p>
              )}

              {formData.customerApproval.evidence.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: t.text, margin: '0 0 8px 0' }}>
                    Archivos adjuntos:
                  </p>
                  {formData.customerApproval.evidence.map((file, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: t.bgCard,
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      marginBottom: '6px'
                    }}>
                      <a
                        href={`http://localhost:5000${file.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '14px', color: t.accent, textDecoration: 'none', flex: 1 }}
                      >
                         {file.name}
                      </a>
                      <button
                        onClick={() => removeCustomerApprovalEvidence(idx)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '4px',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          fontSize: '20px',
                          lineHeight: '1',
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formData.customerApproval.status === 'pending' && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #C77700',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0, fontWeight: '600' }}>
                   Este ECR requiere aprobación del cliente antes de implementar
                </p>
              </div>
            )}

            {formData.customerApproval.status === 'rejected' && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: '#991b1b', margin: 0, fontWeight: '600' }}>
                   El cliente rechazó este cambio. Revisar comentarios y replantear.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approval Section */}
      {data.id && (
        <ECRApprovalPanel
          ecrId={data.id}
          currentUser={currentUser}
          onStatusChange={() => {
            // Refresh data if needed
          }}
        />
      )}
    </div>
  );
};

function getStyles(t) { return ({
  container: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: t.text,
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: t.textMuted,
    margin: 0
  },
  section: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: t.bg,
    borderRadius: '8px',
    border: `1px solid ${t.border}`
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 8px 0'
  },
  sectionDescription: {
    fontSize: '13px',
    color: t.textMuted,
    margin: '0 0 16px 0'
  },
  badge: {
    padding: '4px 12px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: t.text,
    marginBottom: '8px'
  },
  input: {
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard
  },
  select: {
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard
  },
  addActionForm: {
    padding: '20px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '2px solid #86efac',
    marginBottom: '24px'
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#2E7D32',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '8px'
  },
  viewButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  actionCard: {
    backgroundColor: t.bgCard,
    padding: '20px',
    borderRadius: '8px',
    border: `1px solid ${t.border}`,
    marginBottom: '16px'
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  removeButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: t.bg,
    borderRadius: '8px',
    border: `2px dashed ${t.border}`
  },
  stakeholderCard: {
    backgroundColor: t.bgCard,
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${t.border}`,
    marginBottom: '16px'
  },
  stakeholderCheckbox: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginBottom: '16px'
  },
  stakeholderTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 0 8px'
  },
  evidenceSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    border: `1px solid ${t.border}`
  },
  fileInput: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px'
  },
  hint: {
    fontSize: '12px',
    color: t.textMuted,
    margin: '6px 0 0 0'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    cursor: 'pointer'
  }
}); }

export default ECRValidationPlan;
