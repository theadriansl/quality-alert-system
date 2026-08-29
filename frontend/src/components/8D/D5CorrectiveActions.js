import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCurrentUser, isUserAdmin } from '../../utils/permissions';

const D5CorrectiveActions = ({ data, onDataUpdate, language = 'es', isBlocked = false, isReadOnly = false }) => {
  const { theme: themeColors } = useTheme();
  useLanguage(); // mantener hook activo
  const { showSuccess, showError, showWarning } = useToast();

  // Get current user from centralized utility
  const currentUser = getCurrentUser();
  const isAdmin = isUserAdmin(currentUser);

  // Check if current user is the approver for the current step
  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
  const isCurrentApprover = () => {
    // Admins can approve anything
    if (isAdmin) return true;

    if (!data || !data.escalationPath || !data.escalationPath.countermeasure_users) {
      return false;
    }
    const currentStep = data.d5CurrentApprovalStep || 0;

    // Effective step: if status is under_review but step is 0, assume step 1
    const effectiveStep = (data.d5Status === 'under_review' && currentStep === 0)
      ? 1
      : currentStep;

    if (effectiveStep < 1 || effectiveStep > 3) return false;

    const countermeasureUsers = data.escalationPath.countermeasure_users;
    const expectedApprover = countermeasureUsers[effectiveStep];
    const expectedApproverId = typeof expectedApprover === 'object' ? expectedApprover.id : expectedApprover;
    return currentUser.id === expectedApproverId;
  };

  // Check if current user is the primary responsible
  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
  const isPrimaryUser = () => {
    if (!data || !data.escalationPath || !data.escalationPath.countermeasure_users) {
      return false;
    }
    const countermeasureUsers = data.escalationPath.countermeasure_users;
    const primaryUser = countermeasureUsers[0];
    const primaryUserId = typeof primaryUser === 'object' ? primaryUser.id : primaryUser;
    return currentUser.id === primaryUserId;
  };

  // Determine if form should be blocked for editing
  // Admins can ALWAYS edit
  const isFormBlocked = isAdmin ? false : (
    data?.d5Status === 'under_review' ||
    data?.d5Status === 'approved' ||
    !isPrimaryUser()
  );

  // State for users list
  const [users, setUsers] = useState([]);

  // Revert to draft modal state (Admin only)
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertComments, setRevertComments] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  // Load users list
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

  // Get current user in process
  // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
  const currentUserInProcess = useMemo(() => {
    if (!data || !data.escalationPath || !data.escalationPath.countermeasure_users) {
      return null;
    }

    const effectiveStep = (data.d5Status === 'under_review' && data.d5CurrentApprovalStep === 0)
      ? 1
      : (data.d5CurrentApprovalStep || 0);

    const countermeasureUsers = data.escalationPath.countermeasure_users;

    // Helper para obtener nombre del usuario (compatible con ambos formatos)
    const getUserName = (userData) => {
      if (!userData) return null;
      // Si es objeto con nombre congelado, usarlo
      if (typeof userData === 'object' && userData.name) {
        return userData.name;
      }
      // Formato antiguo: buscar en lista de usuarios
      const userId = typeof userData === 'object' ? userData.id : userData;
      const user = users.find(u => u.id === userId);
      return user ? (user.name || user.email || `Usuario ID: ${userId}`) : `Usuario ID: ${userId}`;
    };

    if (effectiveStep === 0) {
      return getUserName(countermeasureUsers[0]);
    } else if (effectiveStep >= 1 && effectiveStep <= 3) {
      return getUserName(countermeasureUsers[effectiveStep]);
    } else if (effectiveStep === 4) {
      return 'Completado';
    }

    return null;
  }, [users, data]);

  // Form state
  const [formData, setFormData] = useState({
    d5CorrectiveActions: [],
    d5Completed: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Track activities sent to workload (key: actionId-planId-rowIndex)
  const [sentToWorkload, setSentToWorkload] = useState({});
  const [sendingToWorkload, setSendingToWorkload] = useState({});

  // Approval history state (similar to D4)
  const [approvalHistory, setApprovalHistory] = useState({
    approval1: {
      status: data?.d5Approval1Status || data?.d5_approval_1_status,
      by: data?.d5Approval1By || data?.d5_approval_1_by,
      at: data?.d5Approval1At || data?.d5_approval_1_at,
      comments: data?.d5Approval1Comments || data?.d5_approval_1_comments
    },
    approval2: {
      status: data?.d5Approval2Status || data?.d5_approval_2_status,
      by: data?.d5Approval2By || data?.d5_approval_2_by,
      at: data?.d5Approval2At || data?.d5_approval_2_at,
      comments: data?.d5Approval2Comments || data?.d5_approval_2_comments
    },
    approval3: {
      status: data?.d5Approval3Status || data?.d5_approval_3_status,
      by: data?.d5Approval3By || data?.d5_approval_3_by,
      at: data?.d5Approval3At || data?.d5_approval_3_at,
      comments: data?.d5Approval3Comments || data?.d5_approval_3_comments
    }
  });

  // Update approval history when data changes
  useEffect(() => {
    if (data) {
      setApprovalHistory({
        approval1: {
          status: data?.d5Approval1Status || data?.d5_approval_1_status,
          by: data?.d5Approval1By || data?.d5_approval_1_by,
          at: data?.d5Approval1At || data?.d5_approval_1_at,
          comments: data?.d5Approval1Comments || data?.d5_approval_1_comments
        },
        approval2: {
          status: data?.d5Approval2Status || data?.d5_approval_2_status,
          by: data?.d5Approval2By || data?.d5_approval_2_by,
          at: data?.d5Approval2At || data?.d5_approval_2_at,
          comments: data?.d5Approval2Comments || data?.d5_approval_2_comments
        },
        approval3: {
          status: data?.d5Approval3Status || data?.d5_approval_3_status,
          by: data?.d5Approval3By || data?.d5_approval_3_by,
          at: data?.d5Approval3At || data?.d5_approval_3_at,
          comments: data?.d5Approval3Comments || data?.d5_approval_3_comments
        }
      });
    }
  }, [data]);

  // Accordion state - track which action plans are expanded (by planId)
  const [expandedPlans, setExpandedPlans] = useState({});

  // Toggle plan expansion
  const togglePlan = (planId) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  // Expand/Collapse all plans
  const expandAllPlans = () => {
    const allPlans = {};
    formData.d5CorrectiveActions.forEach(action => {
      action.actionPlans?.forEach(plan => {
        allPlans[plan.planId] = true;
      });
    });
    setExpandedPlans(allPlans);
  };

  const collapseAllPlans = () => {
    setExpandedPlans({});
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalRootCauses = formData.d5CorrectiveActions.length;
    const totalPlans = formData.d5CorrectiveActions.reduce((sum, action) =>
      sum + (action.actionPlans?.length || 0), 0
    );
    const completedPlans = formData.d5CorrectiveActions.reduce((sum, action) => {
      return sum + (action.actionPlans?.filter(plan => {
        // Consider plan complete if planName exists and all activities have all required fields
        return plan.planName &&
               plan.activities?.every(activity =>
                 activity.detailedDescription &&
                 activity.responsible &&
                 activity.deadline &&
                 activity.expectedEffect
               );
      }).length || 0);
    }, 0);
    return { totalRootCauses, totalPlans, completedPlans };
  }, [formData.d5CorrectiveActions]);

  // Initialize form data from props
  const isInitialized = React.useRef(false);
  const lastReportId = React.useRef(null);

  useEffect(() => {
    if (data) {
      // Only re-initialize if it's a different report or first time
      if (!isInitialized.current || data.id !== lastReportId.current) {
        // Auto-generate corrective actions from D4 5 Whys if they don't exist
        const d4_5whys = data.d4_5whysAnalysis || [];
        const existingActions = data.d5CorrectiveActions || [];

        let actionsToSet = [...existingActions];

        // Default action plan rows (AMEF style)
        const createDefaultActivities = () => [
          { activity: 'Acción Correctiva', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
          { activity: 'Método de Evaluación', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
          { activity: 'Garantía de Fuga', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
          { activity: 'Método de Aprobación', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' }
        ];

        // For each 5 Why in D4, check if there's a linked action in D5
        d4_5whys.forEach(why => {
          const linkedAction = existingActions.find(action => action.linkedTo5WhyId === why.evaluationId);

          if (!linkedAction && why.rootCause) {
            // Auto-generate action plan for this root cause with one default plan
            actionsToSet.push({
              id: `auto-${why.evaluationId}`,
              linkedTo5WhyId: why.evaluationId,
              linkedFactorNG: why.factorNG,
              linkedRootCause: why.rootCause,
              actionPlans: [
                {
                  planId: `plan-${Date.now()}-0`,
                  planName: 'Plan de Acción 1',
                  activities: createDefaultActivities(),
                  evidenceFiles: []
                }
              ]
            });
          } else if (linkedAction && linkedAction.actionPlan && !linkedAction.actionPlans) {
            // Migration: Convert old single actionPlan to new actionPlans array
            const index = actionsToSet.indexOf(linkedAction);
            actionsToSet[index] = {
              ...linkedAction,
              actionPlans: [
                {
                  planId: `plan-${Date.now()}-0`,
                  planName: 'Plan de Acción 1',
                  activities: linkedAction.actionPlan,
                  evidenceFiles: []
                }
              ]
            };
            delete actionsToSet[index].actionPlan;
          }
        });

        const normalizeFileUrl = (url) =>
          url && !url.startsWith('http') ? `http://localhost:5000${url}` : (url || '');

        setFormData({
          d5CorrectiveActions: actionsToSet.map(action => ({
            ...action,
            actionPlans: (action.actionPlans || []).map(plan => ({
              ...plan,
              evidenceFiles: (plan.evidenceFiles || []).map(f => ({
                ...f,
                fileUrl: normalizeFileUrl(f.fileUrl)
              }))
            }))
          })),
          d5Completed: data.d5Completed || false
        });

        isInitialized.current = true;
        lastReportId.current = data.id;
      }
    }
  }, [data]);

  const translations = {
    es: {
      title: 'D5 - Estudio de Propuestas de Acciones Correctivas',
      subtitle: 'Analiza y propone acciones para eliminar las causas raíz identificadas en D4',

      // Status ribbon
      approvalStatus: 'Estado de Aprobación - D5',
      statusLabel: 'Estado:',
      stepLabel: 'Paso:',
      currentUserLabel: 'Usuario Actual:',
      statusDraft: ' Borrador',
      statusUnderReview: ' En Revisión',
      statusApproved: ' Aprobado',
      stepPrimary: 'Responsable Principal',
      stepApprover: 'Aprobador',
      stepCompleted: 'Completado',

      // Table headers
      linkedRootCause: 'Causa Raíz Vinculada',
      factorNG: 'Factor NG',
      taskActivity: 'Tarea/Actividad en D5',
      detailedDescription: 'Descripción Detallada',
      responsible: 'Responsable',
      deadline: 'Fecha Límite',
      expectedEffect: 'Efecto Esperado',
      actions: 'Acciones',

      // Action types
      corrective: 'Correctiva',
      preventive: 'Preventiva',

      // Status options
      planned: ' Planeada',
      inProgress: ' En Progreso',
      completed: ' Completada',

      // Buttons
      addManualAction: '+ Agregar Acción Manual',
      addAnotherPlan: '+ Agregar otro plan de acción',
      removePlan: ' Eliminar plan',
      saveDraft: 'Guardar Borrador',
      sendToApproval: 'Enviar a Aprobación',
      approve: 'Aprobar ',
      reject: 'Rechazar ',
      saving: 'Guardando...',
      sending: 'Enviando...',
      planNamePlaceholder: 'Ej: Modificar HOE, Capacitar, etc.',

      // Summary
      summaryTitle: ' Resumen de D5',
      totalRootCauses: 'Causas Raíz',
      totalPlans: 'Planes de Acción',
      completedPlans: 'Planes Completos',
      expandAll: ' Expandir Todo',
      collapseAll: ' Colapsar Todo',

      // Navigation
      navigationTitle: ' Navegación',
      rootCause: 'Causa Raíz',

      // Evidence
      evidenceTitle: ' Evidencia de Validación de Efectividad',
      uploadEvidence: ' Subir Evidencia',
      noEvidence: 'Sin evidencia adjunta',
      uploadedBy: 'Subido por:',
      uploadedAt: 'Fecha:',
      removeFile: '',

      // Messages
      blocked: 'Esta sección está bloqueada. Solo el responsable principal puede editar.',
      noRootCauses: 'No hay causas raíz identificadas en D4. Complete D4 primero.',
      confirmSendToApproval: '¿Estás seguro de enviar D5 a aprobación? Una vez enviada, no podrás editar hasta que sea aprobada o rechazada.',
      confirmApprove: '¿Confirmas que deseas APROBAR esta sección D5?',
      confirmReject: '¿Confirmas que deseas RECHAZAR esta sección D5 y devolverla al responsable principal?',
      rejectReason: 'RECHAZO - Por favor ingrese el motivo (obligatorio):',
      rejectRequired: 'El comentario es obligatorio para rechazar',

      // Validation
      atLeastOneAction: 'Debes definir al menos una acción correctiva',
      allActionsNeedDescription: 'Todas las acciones deben tener una descripción',
      allActionsNeedResponsible: 'Todas las acciones deben tener un responsable asignado',
      allActionsNeedTargetDate: 'Todas las acciones deben tener una fecha objetivo',
      mustMarkComplete: 'Debes marcar D5 como completada antes de enviar a aprobación',

      markComplete: 'Marcar D5 como Completada'
    },
    en: {
      title: 'D5 - Permanent Corrective Actions',
      subtitle: 'Define actions to eliminate root causes identified in D4',

      approvalStatus: 'Approval Status - D5',
      statusLabel: 'Status:',
      stepLabel: 'Step:',
      currentUserLabel: 'Current User:',
      statusDraft: ' Draft',
      statusUnderReview: ' Under Review',
      statusApproved: ' Approved',
      stepPrimary: 'Primary Responsible',
      stepApprover: 'Approver',
      stepCompleted: 'Completed',

      linkedRootCause: 'Linked Root Cause',
      factorNG: 'NG Factor',
      taskActivity: 'Task/Activity in D5',
      detailedDescription: 'Detailed Description',
      responsible: 'Responsible',
      deadline: 'Deadline',
      expectedEffect: 'Expected Effect',
      actions: 'Actions',

      corrective: 'Corrective',
      preventive: 'Preventive',

      planned: ' Planned',
      inProgress: ' In Progress',
      completed: ' Completed',

      addManualAction: '+ Add Manual Action',
      addAnotherPlan: '+ Add another action plan',
      removePlan: ' Remove plan',
      saveDraft: 'Save Draft',
      sendToApproval: 'Send to Approval',
      approve: 'Approve ',
      reject: 'Reject ',
      saving: 'Saving...',
      sending: 'Sending...',
      planNamePlaceholder: 'Ex: Update SOP, Training, etc.',

      // Summary
      summaryTitle: ' D5 Summary',
      totalRootCauses: 'Root Causes',
      totalPlans: 'Action Plans',
      completedPlans: 'Completed Plans',
      expandAll: ' Expand All',
      collapseAll: ' Collapse All',

      // Navigation
      navigationTitle: ' Navigation',
      rootCause: 'Root Cause',

      // Evidence
      evidenceTitle: ' Effectiveness Validation Evidence',
      uploadEvidence: ' Upload Evidence',
      noEvidence: 'No evidence attached',
      uploadedBy: 'Uploaded by:',
      uploadedAt: 'Date:',
      removeFile: '',

      blocked: 'This section is blocked. Only the primary responsible can edit.',
      noRootCauses: 'No root causes identified in D4. Complete D4 first.',
      confirmSendToApproval: 'Are you sure you want to send D5 for approval? Once sent, you will not be able to edit until it is approved or rejected.',
      confirmApprove: 'Do you confirm that you want to APPROVE this D5 section?',
      confirmReject: 'Do you confirm that you want to REJECT this D5 section and return it to the primary responsible?',
      rejectReason: 'REJECT - Please enter the reason (required):',
      rejectRequired: 'Comments are required to reject',

      atLeastOneAction: 'You must define at least one corrective action',
      allActionsNeedDescription: 'All actions must have a description',
      allActionsNeedResponsible: 'All actions must have an assigned responsible',
      allActionsNeedTargetDate: 'All actions must have a target date',
      mustMarkComplete: 'You must mark D5 as complete before sending to approval',

      markComplete: 'Mark D5 as Complete'
    }
  };

  const t = translations[language] || translations.es;

  // Update action plan row
  const updateActionPlanRow = (actionId, planId, rowIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      d5CorrectiveActions: prev.d5CorrectiveActions.map(action => {
        if (action.id === actionId) {
          const updatedPlans = action.actionPlans.map(plan => {
            if (plan.planId === planId) {
              const updatedActivities = [...plan.activities];
              updatedActivities[rowIndex] = { ...updatedActivities[rowIndex], [field]: value };
              return { ...plan, activities: updatedActivities };
            }
            return plan;
          });
          return { ...action, actionPlans: updatedPlans };
        }
        return action;
      })
    }));
  };

  // Update plan name
  const updatePlanName = (actionId, planId, newName) => {
    setFormData(prev => ({
      ...prev,
      d5CorrectiveActions: prev.d5CorrectiveActions.map(action => {
        if (action.id === actionId) {
          const updatedPlans = action.actionPlans.map(plan => {
            if (plan.planId === planId) {
              return { ...plan, planName: newName };
            }
            return plan;
          });
          return { ...action, actionPlans: updatedPlans };
        }
        return action;
      })
    }));
  };

  // Add another plan to existing action
  const addPlanToAction = (actionId) => {
    const createDefaultActivities = () => [
      { activity: 'Acción Correctiva', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
      { activity: 'Método de Evaluación', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
      { activity: 'Garantía de Fuga', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
      { activity: 'Método de Aprobación', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' }
    ];

    setFormData(prev => {
      const newData = {
        ...prev,
        d5CorrectiveActions: prev.d5CorrectiveActions.map(action => {
          if (action.id === actionId) {
            const newPlanNumber = action.actionPlans.length + 1;
            return {
              ...action,
              actionPlans: [
                ...action.actionPlans,
                {
                  planId: `plan-${Date.now()}`,
                  planName: `Plan de Acción ${newPlanNumber}`,
                  activities: createDefaultActivities(),
                  evidenceFiles: []
                }
              ]
            };
          }
          return action;
        })
      };

      // Sync to parent for navigation
      if (onDataUpdate) {
        setTimeout(() => {
          onDataUpdate({
            d5CorrectiveActions: newData.d5CorrectiveActions
          });
        }, 0);
      }

      return newData;
    });
  };

  // Remove plan from action
  const removePlanFromAction = (actionId, planId) => {
    setFormData(prev => ({
      ...prev,
      d5CorrectiveActions: prev.d5CorrectiveActions.map(action => {
        if (action.id === actionId) {
          // Don't allow removing if it's the last plan
          if (action.actionPlans.length === 1) {
            showWarning(' Debe haber al menos un plan de acción por causa raíz.');
            return action;
          }
          return {
            ...action,
            actionPlans: action.actionPlans.filter(plan => plan.planId !== planId)
          };
        }
        return action;
      })
    }));
  };

  // Handle file upload for evidence
  const handleFileUpload = async (actionId, planId, files) => {
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('token');
    const uploadedFiles = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('http://localhost:5000/upload/evidence', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        // El backend devuelve url en lugar de fileUrl, y no tiene success flag
        if (response.data.url) {
          uploadedFiles.push({
            fileName: response.data.name || file.name,
            fileUrl: response.data.url,
            uploadedBy: currentUser.name || currentUser.email,
            uploadedAt: response.data.uploadedAt || new Date().toISOString()
          });

          // Log to audit
          try {
            const reportId = data?.id;
            if (reportId) {
              await axios.post(`http://localhost:5000/8d/reports/${reportId}/audit-log`, {
                actionType: 'file_uploaded',
                actionCategory: 'section',
                sectionName: 'd5',
                userName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Sistema',
                description: `Archivo subido en D5: ${file.name}`,
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
        d5CorrectiveActions: prev.d5CorrectiveActions.map(action => {
          if (action.id === actionId) {
            const updatedPlans = action.actionPlans.map(plan => {
              if (plan.planId === planId) {
                return {
                  ...plan,
                  evidenceFiles: [...(plan.evidenceFiles || []), ...uploadedFiles]
                };
              }
              return plan;
            });
            return { ...action, actionPlans: updatedPlans };
          }
          return action;
        })
      }));
      showSuccess(` ${uploadedFiles.length} archivo(s) subido(s) correctamente`);
    }
  };

  // Remove evidence file
  const removeEvidenceFile = (actionId, planId, fileIndex) => {
    setFormData(prev => ({
      ...prev,
      d5CorrectiveActions: prev.d5CorrectiveActions.map(action => {
        if (action.id === actionId) {
          const updatedPlans = action.actionPlans.map(plan => {
            if (plan.planId === planId) {
              return {
                ...plan,
                evidenceFiles: plan.evidenceFiles.filter((_, index) => index !== fileIndex)
              };
            }
            return plan;
          });
          return { ...action, actionPlans: updatedPlans };
        }
        return action;
      })
    }));
    showSuccess(' Archivo eliminado');
  };

  // Add manual action (not linked to 5 Why)
  const addManualAction = () => {
    const createDefaultActivities = () => [
      { activity: 'Acción Correctiva', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
      { activity: 'Método de Evaluación', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
      { activity: 'Garantía de Fuga', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' },
      { activity: 'Método de Aprobación', detailedDescription: '', responsible: null, deadline: '', expectedEffect: '' }
    ];

    const newAction = {
      id: `manual-${Date.now()}`,
      linkedTo5WhyId: null,
      linkedFactorNG: 'Acción Manual',
      linkedRootCause: '',
      actionPlans: [
        {
          planId: `plan-${Date.now()}-0`,
          planName: 'Plan de Acción 1',
          activities: createDefaultActivities(),
          evidenceFiles: []
        }
      ]
    };

    setFormData(prev => {
      const newData = {
        ...prev,
        d5CorrectiveActions: [...prev.d5CorrectiveActions, newAction]
      };

      // Sync to parent for navigation
      if (onDataUpdate) {
        setTimeout(() => {
          onDataUpdate({
            d5CorrectiveActions: newData.d5CorrectiveActions
          });
        }, 0);
      }

      return newData;
    });
  };

  // Remove action
  const removeAction = (id) => {
    // Don't allow removing auto-generated actions, only manual ones
    const action = formData.d5CorrectiveActions.find(a => a.id === id);
    if (action && action.id.startsWith('auto-')) {
      showWarning(' No puedes eliminar acciones generadas automáticamente. Déjalas vacías si no son necesarias.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      d5CorrectiveActions: prev.d5CorrectiveActions.filter(action => action.id !== id)
    }));
  };

  // Validation
  const validateActions = () => {
    const actions = formData.d5CorrectiveActions;

    if (actions.length === 0) {
      showError(` ${t.atLeastOneAction}`);
      return false;
    }

    // Check if at least one action has content
    let hasContent = false;
    for (const action of actions) {
      if (action.actionPlans) {
        for (const plan of action.actionPlans) {
          if (plan.activities && plan.activities.some(row => row.detailedDescription || row.responsible || row.deadline)) {
            hasContent = true;
            break;
          }
        }
      }
      if (hasContent) break;
    }

    if (!hasContent) {
      showError(` ${t.atLeastOneAction}`);
      return false;
    }

    // Validate filled rows
    for (const action of actions) {
      if (!action.actionPlans) continue;

      for (const plan of action.actionPlans) {
        if (!plan.activities) continue;

        for (const row of plan.activities) {
          // If any field is filled, all required fields must be filled
          if (row.detailedDescription || row.responsible || row.deadline) {
            if (!row.detailedDescription || row.detailedDescription.trim() === '') {
              showError(` ${t.allActionsNeedDescription} (${action.linkedFactorNG} - ${plan.planName} - ${row.activity})`);
              return false;
            }
            if (!row.responsible) {
              showError(` ${t.allActionsNeedResponsible} (${action.linkedFactorNG} - ${plan.planName} - ${row.activity})`);
              return false;
            }
            if (!row.deadline) {
              showError(` ${t.allActionsNeedTargetDate} (${action.linkedFactorNG} - ${plan.planName} - ${row.activity})`);
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (isFormBlocked) {
      showError(` ${t.blocked}`);
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate({
        ...formData,
        d5Completed: false
      });
      showSuccess(' Borrador guardado exitosamente');
    } catch (error) {
      console.error('Error saving draft:', error);
      showError(' Error al guardar borrador');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to collect all unique responsibles from action plans
  const getResponsiblesFromPlans = () => {
    const responsibles = [];
    const seenIds = new Set();

    formData.d5CorrectiveActions.forEach(action => {
      if (action.actionPlans) {
        action.actionPlans.forEach(plan => {
          if (plan.activities) {
            plan.activities.forEach(activity => {
              if (activity.responsible && !seenIds.has(activity.responsible)) {
                seenIds.add(activity.responsible);
                const user = users.find(u => u.id === activity.responsible);
                if (user && user.email) {
                  responsibles.push({
                    id: user.id,
                    name: user.name || user.email,
                    email: user.email
                  });
                }
              }
            });
          }
        });
      }
    });

    return responsibles;
  };

  // Function to send mailto notification to all responsibles
  const notifyResponsibles = () => {
    const responsibles = getResponsiblesFromPlans();

    if (responsibles.length === 0) {
      showWarning('No hay responsables asignados en los planes de accion.');
      return;
    }

    const emailList = responsibles.map(r => r.email).join(';');
    const subject = `Asignacion de Actividad - Reporte 8D ${data?.reportId || data?.id || ''}`;

    const bodyText = `Estimado(a),\n\n` +
      `Se le ha asignado una actividad en el siguiente reporte 8D:\n\n` +
      `Reporte: ${data?.reportId || data?.id || 'N/A'}\n` +
      `Titulo: ${data?.title || 'N/A'}\n` +
      `Proveedor/Cliente: ${data?.supplier || data?.customer || 'N/A'}\n\n` +
      `Por favor consulte el detalle de su actividad asignada en el sistema:\n` +
      `http://localhost:3000/8d-workflow?reportId=${data?.id}&mode=edit\n\n` +
      `Saludos,\nSistema de Calidad`;

    const mailtoUrl = `mailto:${emailList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
  };

  // Function to send a single activity to Workload
  const sendActivityToWorkload = async (action, plan, row, rowIndex) => {
    const activityKey = `${action.id}-${plan.planId}-${rowIndex}`;

    // Validate required fields
    if (!row.detailedDescription || !row.responsible || !row.deadline) {
      showWarning('La actividad debe tener descripcion, responsable y fecha limite para enviar a Workload.');
      return;
    }

    setSendingToWorkload(prev => ({ ...prev, [activityKey]: true }));

    try {
      const token = localStorage.getItem('token');
      const reportId = data?.reportId || data?.id || '';

      // Build notes with 8D reference
      const notesText = `[8D-Report: ${reportId}]\n` +
        `Disciplina: D5 - Accion Correctiva Permanente\n` +
        `Factor NG: ${action.linkedFactorNG || 'N/A'}\n` +
        `Causa Raiz: ${action.linkedRootCause || 'N/A'}\n` +
        `Plan: ${plan.planName || 'N/A'}\n` +
        `Link: http://localhost:3000/8d-workflow?reportId=${data?.id}&mode=edit\n\n` +
        `Efecto esperado: ${row.expectedEffect || 'N/A'}`;

      const response = await axios.post('http://localhost:5000/workload/activities', {
        title: `[8D] ${row.activity} - ${reportId}`,
        description: row.detailedDescription,
        activity_type: 'assigned',
        assigned_to: row.responsible,
        start_date: new Date().toISOString().split('T')[0],
        end_date: row.deadline,
        due_date: row.deadline,
        priority: 'high',
        notes: notesText,
        // Source tracking fields
        source_type: '8D',
        source_id: reportId,
        source_discipline: 'D5'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSentToWorkload(prev => ({ ...prev, [activityKey]: true }));
        showSuccess(`Actividad "${row.activity}" enviada a Workload`);
      }
    } catch (error) {
      console.error('Error sending to workload:', error);
      showError('Error al enviar actividad a Workload');
    } finally {
      setSendingToWorkload(prev => ({ ...prev, [activityKey]: false }));
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

  // Send to approval
  const handleSendToApproval = async () => {
    if (isFormBlocked) {
      showError(` ${t.blocked}`);
      return;
    }

    // Validation
    if (!validateActions()) {
      return;
    }

    // Check if D5 is marked as complete
    if (!formData.d5Completed) {
      showError(` ${t.mustMarkComplete}`);
      return;
    }

    if (!window.confirm(t.confirmSendToApproval)) {
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Save form data (without approval fields)
      await onDataUpdate({
        ...formData,
        d5Completed: true
      });

      // Step 2: Send to approval via dedicated endpoint
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/8d/reports/${data.id}/d5/send-to-approval`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Abrir mailto para notificar al aprobador
        if (response.data.emailNotification) {
          openMailtoFromNotification(response.data.emailNotification);
        }
        showSuccess(' D5 enviada a aprobación exitosamente');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error sending D5 to approval:', error);
      showError(' Error al enviar D5 a aprobación');
    } finally {
      setIsSending(false);
    }
  };

  // Approve
  const handleApprove = async () => {
    if (!window.confirm(t.confirmApprove)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/8d/reports/${data.id}/d5/approve`,
        { action: 'approve', comments: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Abrir mailto si hay notificación
        if (response.data.emailNotification) {
          openMailtoFromNotification(response.data.emailNotification);
        }
        showSuccess(language === 'es' ? ' D5 aprobada exitosamente' : ' D5 approved successfully');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error approving D5:', error);
      showError(language === 'es' ? ' Error al aprobar D5' : ' Error approving D5');
    }
  };

  // Reject
  const handleReject = async () => {
    const comments = prompt(t.rejectReason);

    if (!comments || comments.trim() === '') {
      showError(` ${t.rejectRequired}`);
      return;
    }

    if (!window.confirm(t.confirmReject)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/8d/reports/${data.id}/d5/approve`,
        { action: 'reject', comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Abrir mailto para notificar al responsable del rechazo
        if (response.data.emailNotification) {
          openMailtoFromNotification(response.data.emailNotification);
        }
        showSuccess(language === 'es' ? ' D5 rechazada. Devuelta al responsable principal.' : ' D5 rejected. Returned to primary responsible.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error rejecting D5:', error);
      showError(language === 'es' ? ' Error al rechazar D5' : ' Error rejecting D5');
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
      borderBottom: '2px solid #0072CE',
      paddingBottom: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: themeColors.textMuted
    },
    section: {
      backgroundColor: themeColors.bg,
      padding: '24px',
      borderRadius: '8px',
      marginBottom: '24px',
      border: '1px solid #E6EAEE'
    },
    tableHeader: {
      padding: '12px 8px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '13px',
      color: themeColors.text,
      borderBottom: '2px solid #d1d5db',
      backgroundColor: themeColors.bg
    },
    tableCell: {
      padding: '12px 8px',
      verticalAlign: 'top',
      borderBottom: '1px solid #E6EAEE'
    },
    input: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '4px',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '4px',
      minHeight: '60px',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '4px',
      backgroundColor: themeColors.bgCard,
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    button: {
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }
  };

  // Check if we have root causes from D4 (removed - user can work on D5 as draft without D4 approval)
  // const hasD4RootCauses = data?.d4_5whysAnalysis && data.d4_5whysAnalysis.length > 0;

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
        <div style={styles.title}> {t.title}</div>
        <div style={styles.subtitle}>{t.subtitle}</div>
      </div>

      {/* Notify Responsibles Button - Prominent like D3-MFG */}
      {getResponsiblesFromPlans().length > 0 && (
        <div style={{
          backgroundColor: '#dbeafe',
          border: '2px solid #0072CE',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F3B5F', marginBottom: '4px' }}>
               Notificar a Responsables de Actividades
            </h3>
            <div style={{ fontSize: '13px', color: '#0F3B5F' }}>
              {getResponsiblesFromPlans().length} responsable(s) asignado(s): {getResponsiblesFromPlans().map(r => r.name).join(', ')}
            </div>
          </div>
          <button
            onClick={notifyResponsibles}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#2563eb',
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

      {/* Approval Status Bar */}
      {data && data.escalationPath && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #C77700',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
               {t.approvalStatus}
            </h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#78350f', fontWeight: '500' }}>{t.statusLabel} </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: data.d5Status === 'approved' ? '#16a34a' : data.d5Status === 'under_review' ? '#C77700' : '#6b7280'
                }}>
                  {data.d5Status === 'approved' ? t.statusApproved :
                   data.d5Status === 'under_review' ? t.statusUnderReview :
                   t.statusDraft}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: '#78350f', fontWeight: '500' }}>{t.stepLabel} </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                  {(() => {
                    const effectiveStep = (data.d5Status === 'under_review' && data.d5CurrentApprovalStep === 0)
                      ? 1
                      : data.d5CurrentApprovalStep;

                    if (effectiveStep === 0) return t.stepPrimary;
                    if (effectiveStep === 4) return t.stepCompleted;
                    return `${t.stepApprover} ${effectiveStep}`;
                  })()}
                </span>
              </div>
              {currentUserInProcess && (
                <div>
                  <span style={{ fontSize: '13px', color: '#78350f', fontWeight: '500' }}>{t.currentUserLabel} </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed' }}>
                     {currentUserInProcess}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No root causes warning - REMOVED: User can work on D5 as draft */}

      {/* Corrective Action Plans (AMEF Style) */}
      <div style={styles.section}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: themeColors.text }}>
               Propuestas de Acciones Correctivas (Vinculadas a Causas Raíz de D4)
            </h3>

            {/* Summary Section */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '2px solid #0072CE',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#0F3B5F', fontWeight: '500', marginBottom: '4px' }}>
                  {t.totalRootCauses}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F3B5F' }}>
                  {summaryStats.totalRootCauses}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#0F3B5F', fontWeight: '500', marginBottom: '4px' }}>
                  {t.totalPlans}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F3B5F' }}>
                  {summaryStats.totalPlans}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#0F3B5F', fontWeight: '500', marginBottom: '4px' }}>
                  {t.completedPlans}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: summaryStats.completedPlans === summaryStats.totalPlans ? '#16a34a' : '#C77700' }}>
                  {summaryStats.completedPlans}/{summaryStats.totalPlans}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={expandAllPlans}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: '#0072CE',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0072CE'}
              >
                {t.expandAll}
              </button>
              <button
                onClick={collapseAllPlans}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                {t.collapseAll}
              </button>
            </div>
          </div>

          {formData.d5CorrectiveActions.map((action, actionIndex) => (
            <div
              key={action.id}
              id={`causa-${actionIndex}`}
              style={{
                marginBottom: '32px',
                padding: '20px',
                backgroundColor: action.id.startsWith('auto-') ? '#fefce8' : '#FAFBFC',
                border: '2px solid',
                borderColor: action.id.startsWith('auto-') ? '#fbbf24' : '#E6EAEE',
                borderRadius: '8px',
                scrollMarginTop: '20px'
              }}>
              {/* Header: Factor NG and Root Cause */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {action.id.startsWith('auto-') && <span style={{ fontSize: '20px' }}></span>}
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#B00020', margin: 0 }}>
                    {action.linkedFactorNG}
                  </h4>
                  {!action.id.startsWith('auto-') && (
                    <button
                      onClick={() => removeAction(action.id)}
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 12px',
                        fontSize: '14px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      disabled={isFormBlocked}
                    >
                       Eliminar
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '14px', color: themeColors.textMuted, margin: '0 0 0 28px', fontStyle: 'italic' }}>
                  {action.linkedRootCause || 'Sin causa raíz vinculada'}
                </p>
              </div>

              {/* Multiple Action Plans */}
              {action.actionPlans && action.actionPlans.map((plan, planIndex) => {
                const isExpanded = expandedPlans[plan.planId];
                const planComplete = plan.planName &&
                                     plan.activities?.every(activity =>
                                       activity.detailedDescription &&
                                       activity.responsible &&
                                       activity.deadline &&
                                       activity.expectedEffect
                                     );

                return (
                  <div
                    key={plan.planId}
                    id={`plan-${actionIndex}-${planIndex}`}
                    style={{
                      marginBottom: planIndex < action.actionPlans.length - 1 ? '24px' : '0',
                      backgroundColor: themeColors.bgCard,
                      border: '2px solid',
                      borderColor: isExpanded ? '#0072CE' : '#E6EAEE',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      scrollMarginTop: '20px'
                    }}>
                    {/* Collapsible Plan Header */}
                    <div
                      onClick={() => togglePlan(plan.planId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        backgroundColor: isExpanded ? '#eff6ff' : '#FAFBFC',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        borderBottom: isExpanded ? '1px solid #E6EAEE' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#F4F6F8';
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#FAFBFC';
                      }}
                    >
                      {/* Expand/Collapse Icon */}
                      <span style={{
                        fontSize: '18px',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block'
                      }}>
                        
                      </span>

                      {/* Plan Name */}
                      <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: themeColors.text }}>
                        {plan.planName || t.planNamePlaceholder}
                      </div>

                      {/* Completion Badge */}
                      {planComplete ? (
                        <span style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#dcfce7',
                          color: '#16a34a',
                          borderRadius: '4px'
                        }}>
                           Completo
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#fef3c7',
                          color: '#C77700',
                          borderRadius: '4px'
                        }}>
                           Incompleto
                        </span>
                      )}

                      {/* Evidence Count */}
                      {plan.evidenceFiles && plan.evidenceFiles.length > 0 && (
                        <span style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#dbeafe',
                          color: '#0F3B5F',
                          borderRadius: '4px'
                        }}>
                           {plan.evidenceFiles.length}
                        </span>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{ padding: '16px' }}>
                        {/* Editable Plan Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <input
                            type="text"
                            value={plan.planName}
                            onChange={(e) => updatePlanName(action.id, plan.planId, e.target.value)}
                            placeholder={t.planNamePlaceholder}
                            disabled={isFormBlocked}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: `1px solid ${themeColors.border}`,
                              borderRadius: '4px',
                              backgroundColor: isFormBlocked ? '#F4F6F8' : 'white'
                            }}
                          />
                          {action.actionPlans.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePlanFromAction(action.id, plan.planId);
                              }}
                              disabled={isFormBlocked}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isFormBlocked ? 'not-allowed' : 'pointer',
                                opacity: isFormBlocked ? 0.5 : 1
                              }}
                            >
                              {t.removePlan}
                            </button>
                          )}
                        </div>

                        {/* Action Plan Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.tableHeader, width: '180px' }}>{t.taskActivity}</th>
                          <th style={{ ...styles.tableHeader, minWidth: '250px' }}>{t.detailedDescription}</th>
                          <th style={{ ...styles.tableHeader, width: '150px' }}>{t.responsible}</th>
                          <th style={{ ...styles.tableHeader, width: '130px' }}>{t.deadline}</th>
                          <th style={{ ...styles.tableHeader, minWidth: '200px' }}>{t.expectedEffect}</th>
                          <th style={{ ...styles.tableHeader, width: '100px', textAlign: 'center' }}>Workload</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.activities && plan.activities.map((row, rowIndex) => (
                          <tr key={rowIndex} style={{ borderBottom: '1px solid #E6EAEE' }}>
                            {/* Task/Activity */}
                            <td style={{ ...styles.tableCell, fontWeight: '600', color: themeColors.text, backgroundColor: themeColors.bg }}>
                              {row.activity}
                            </td>

                            {/* Detailed Description */}
                            <td style={styles.tableCell}>
                              <textarea
                                style={{ ...styles.textarea, minHeight: '60px' }}
                                value={row.detailedDescription}
                                onChange={(e) => updateActionPlanRow(action.id, plan.planId, rowIndex, 'detailedDescription', e.target.value)}
                                placeholder="Describe detalladamente..."
                                disabled={isFormBlocked}
                              />
                            </td>

                            {/* Responsible */}
                            <td style={styles.tableCell}>
                              <select
                                style={styles.select}
                                value={row.responsible || ''}
                                onChange={(e) => updateActionPlanRow(action.id, plan.planId, rowIndex, 'responsible', parseInt(e.target.value))}
                                disabled={isFormBlocked}
                              >
                                <option value="">Seleccionar...</option>
                                {users.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.name || user.email}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Deadline */}
                            <td style={styles.tableCell}>
                              <input
                                type="date"
                                style={styles.input}
                                value={row.deadline}
                                onChange={(e) => updateActionPlanRow(action.id, plan.planId, rowIndex, 'deadline', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                disabled={isFormBlocked}
                              />
                            </td>

                            {/* Expected Effect */}
                            <td style={styles.tableCell}>
                              <textarea
                                style={{ ...styles.textarea, minHeight: '60px' }}
                                value={row.expectedEffect}
                                onChange={(e) => updateActionPlanRow(action.id, plan.planId, rowIndex, 'expectedEffect', e.target.value)}
                                placeholder="Efecto esperado..."
                                disabled={isFormBlocked}
                              />
                            </td>

                            {/* Send to Workload */}
                            <td style={{ ...styles.tableCell, textAlign: 'center', verticalAlign: 'middle' }}>
                              {(() => {
                                const activityKey = `${action.id}-${plan.planId}-${rowIndex}`;
                                const isSent = sentToWorkload[activityKey];
                                const isSendingThis = sendingToWorkload[activityKey];
                                const canSend = row.detailedDescription && row.responsible && row.deadline;

                                if (isSent) {
                                  return (
                                    <span style={{
                                      color: '#16a34a',
                                      fontSize: '12px',
                                      fontWeight: '600'
                                    }}>
                                       Enviado
                                    </span>
                                  );
                                }

                                return (
                                  <button
                                    onClick={() => sendActivityToWorkload(action, plan, row, rowIndex)}
                                    disabled={isSendingThis || !canSend}
                                    title={!canSend ? 'Complete descripcion, responsable y fecha' : 'Enviar a Workload'}
                                    style={{
                                      padding: '6px 10px',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      backgroundColor: canSend ? '#7c3aed' : '#d1d5db',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: canSend && !isSendingThis ? 'pointer' : 'not-allowed',
                                      opacity: isSendingThis ? 0.6 : 1,
                                      transition: 'all 0.2s',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {isSendingThis ? '...' : ' Asignar'}
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Evidence Section */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: themeColors.bg,
                    borderRadius: '4px',
                    border: '1px solid #E6EAEE'
                  }}>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '12px',
                      color: themeColors.text
                    }}>
                      {t.evidenceTitle}
                    </h5>

                    {/* File list */}
                    {plan.evidenceFiles && plan.evidenceFiles.length > 0 ? (
                      <div style={{ marginBottom: '12px' }}>
                        {plan.evidenceFiles.map((file, fileIndex) => (
                          <div
                            key={fileIndex}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              backgroundColor: themeColors.bgCard,
                              borderRadius: '4px',
                              marginBottom: '6px',
                              border: '1px solid #E6EAEE'
                            }}
                          >
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                color: '#0072CE',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: '500'
                              }}
                            >
                               {file.fileName}
                            </a>
                            <span style={{
                              fontSize: '12px',
                              color: themeColors.textMuted,
                              whiteSpace: 'nowrap'
                            }}>
                              {t.uploadedBy} {file.uploadedBy} | {t.uploadedAt} {new Date(file.uploadedAt).toLocaleDateString('es-MX')}
                            </span>
                            {!isFormBlocked && (
                              <button
                                onClick={() => removeEvidenceFile(action.id, plan.planId, fileIndex)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#B00020'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                              >
                                {t.removeFile}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{
                        fontSize: '13px',
                        color: themeColors.textDim,
                        marginBottom: '12px',
                        fontStyle: 'italic'
                      }}>
                        {t.noEvidence}
                      </p>
                    )}

                    {/* Upload button */}
                    {!isFormBlocked && (
                      <div>
                        <input
                          type="file"
                          id={`evidence-${action.id}-${plan.planId}`}
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(action.id, plan.planId, Array.from(e.target.files))}
                        />
                        <label
                          htmlFor={`evidence-${action.id}-${plan.planId}`}
                          style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            backgroundColor: '#2E7D32',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#2E7D32'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#2E7D32'}
                        >
                          {t.uploadEvidence}
                        </label>
                      </div>
                    )}
                  </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Another Plan Button */}
              <button
                onClick={() => addPlanToAction(action.id)}
                disabled={isFormBlocked}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#0072CE',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isFormBlocked ? 'not-allowed' : 'pointer',
                  opacity: isFormBlocked ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {t.addAnotherPlan}
              </button>
            </div>
          ))}

          {/* Add Manual Action Button */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={addManualAction}
              style={{
                ...styles.button,
                backgroundColor: '#2E7D32',
                color: 'white'
              }}
              disabled={isFormBlocked}
            >
              {t.addManualAction}
            </button>

            <button
              onClick={handleSaveDraft}
              style={{
                ...styles.button,
                backgroundColor: '#6b7280',
                color: 'white',
                opacity: isSaving || isFormBlocked ? 0.5 : 1
              }}
              disabled={isSaving || isFormBlocked}
            >
              {isSaving ? t.saving : t.saveDraft}
            </button>
          </div>

          {/* Notify Responsibles Button - Bottom of section */}
          {getResponsiblesFromPlans().length > 0 && (
            <div style={{
              backgroundColor: '#dbeafe',
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
                   Notificar a Responsables de Actividades
                </h3>
                <div style={{ fontSize: '13px', color: '#0F3B5F' }}>
                  {getResponsiblesFromPlans().length} responsable(s) asignado(s): {getResponsiblesFromPlans().map(r => r.name).join(', ')}
                </div>
              </div>
              <button
                onClick={notifyResponsibles}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#2563eb',
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

          {/* Mark as Complete */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E6EAEE' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.d5Completed}
                onChange={(e) => setFormData(prev => ({ ...prev, d5Completed: e.target.checked }))}
                disabled={isFormBlocked}
                style={{ width: '18px', height: '18px', marginRight: '8px' }}
              />
              <span style={{ fontWeight: '500' }}>{t.markComplete}</span>
            </label>
          </div>
        </div>

      {/* Action Buttons */}
      <div style={styles.buttonGroup}>
        {/* Mensaje cuando está completamente aprobado */}
        {data?.d5Status === 'approved' && (
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
              D5 COMPLETAMENTE APROBADO. Puede continuar con D6.
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowRevertModal(true)}
                style={{
                  ...styles.button,
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
        )}

        {/* Show APPROVE/REJECT buttons ONLY for current approver */}
        {isCurrentApprover() && data?.d5Status === 'under_review' && (
          <>
            <button
              onClick={handleApprove}
              style={{
                ...styles.button,
                backgroundColor: '#2E7D32',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {t.approve}
            </button>

            <button
              onClick={handleReject}
              style={{
                ...styles.button,
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {t.reject}
            </button>
          </>
        )}

        {/* Show SEND button for primary user OR admin when NOT in approval */}
        {(isPrimaryUser() || isAdmin) && data?.d5Status !== 'approved' && data?.d5Status !== 'under_review' && (
          <button
            onClick={handleSendToApproval}
            style={{
              ...styles.button,
              backgroundColor: '#2E7D32',
              color: 'white',
              opacity: isSending || isFormBlocked ? 0.5 : 1
            }}
            disabled={isSending || isFormBlocked}
          >
            {isSending ? t.sending : t.sendToApproval}
          </button>
        )}
      </div>

      {/* Approval Status Section - D5 (Based on D4 Component) */}
      {data && data.escalationPath && (
        <div id="d5-aprobacion" style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #C77700',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '32px',
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
             Estado de Aprobación D5 - Acciones Correctivas
          </h3>

          {/* Current Step Indicator */}
          {(() => {
            const countermeasureUsers = data?.escalationPath?.countermeasure_users || [];
            const configuredApprovers = [1, 2, 3].filter(step => countermeasureUsers[step] !== undefined && countermeasureUsers[step] !== null);

            if (configuredApprovers.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '12px', color: themeColors.textMuted, fontSize: '13px' }}>
                  No hay aprobadores configurados para D5
                </div>
              );
            }

            const d5CurrentStep = data?.d5CurrentApprovalStep || 0;

            return (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                {configuredApprovers.map(step => {
                  const isPast = step < d5CurrentStep;
                  const isCurrent = step === d5CurrentStep;
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
                        border: isCurrent ? `3px solid ${themeColors.primary}` : `1px solid ${themeColors.border}`,
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
                        <div style={{ fontSize: '11px', color: themeColors.primary, marginBottom: '4px' }}>
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

          {/* Approval History */}
          {Object.entries(approvalHistory).some(([_, v]) => v?.status) && (
            <div style={{
              backgroundColor: themeColors.bgCard,
              padding: '15px',
              borderRadius: '6px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Historial de Aprobaciones:</div>
              {[1, 2, 3].map(step => {
                const approval = approvalHistory[`approval${step}`];
                const countermeasureUsers = data?.escalationPath?.countermeasure_users || [];
                const approverId = countermeasureUsers[step];
                const approverExists = approverId !== undefined && approverId !== null;
                if (!approverExists || !approval?.status) return null;

                const approverUser = users.find(u => u.id === approverId);
                const approverName = approverUser
                  ? `${approverUser.firstName || approverUser.first_name || ''} ${approverUser.lastName || approverUser.last_name || ''}`.trim() || approverUser.email
                  : `ID: ${approverId}`;

                return (
                  <div key={step} style={{ marginBottom: '8px', fontSize: '13px' }}>
                    <strong>{approverName}:</strong>{' '}
                    {approval.status === 'approved' && ' Aprobado'}
                    {approval.status === 'rejected' && ' Rechazado'}
                    {approval.status === 'pending' && ' Pendiente'}
                    {approval.at && ` - ${new Date(approval.at).toLocaleString('es-ES')}`}
                    {approval.comments && (
                      <div style={{
                        marginTop: '4px',
                        padding: '6px',
                        backgroundColor: themeColors.warningBg,
                        borderLeft: `3px solid ${themeColors.warningFg}`,
                        fontSize: '12px',
                        fontStyle: 'italic'
                      }}>
                         {approval.comments}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================== ESCALATION PATH - D5 ================== */}
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
            Escalation Path - D5 (Countermeasure Section)
          </h3>
          {(() => {
            const countermeasureUsers = data?.escalationPath?.countermeasure_users || [];

            if (countermeasureUsers.length === 0) {
              return (
                <div style={{ color: themeColors.errorFg, fontSize: '13px', padding: '12px', backgroundColor: themeColors.errorBg, borderRadius: '6px' }}>
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
                        <div style={{ fontSize: '12px', color: themeColors.primary, marginTop: '2px' }}>
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
              {language === 'es' ? 'Regresar D5 a Borrador' : 'Revert D5 to Draft'}
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

export default D5CorrectiveActions;
