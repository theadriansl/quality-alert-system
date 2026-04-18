import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import ecrService from '../services/ecrService';
import { getCurrentUser, isUserAdmin, canUserEdit, isReadOnly } from '../utils/permissions';
import useScrollMemory from '../hooks/useScrollMemory';

// Importar componentes ECR
import ECRTeamTab from '../components/ECR/ECRTeamTab';
import ECRChangeRequest from '../components/ECR/ECRChangeRequest';
import ECRImpactAnalysis from '../components/ECR/ECRImpactAnalysis';
import ECRValidationPlan from '../components/ECR/ECRValidationPlan';
import ECRClosure from '../components/ECR/ECRClosure';

// Stages definition - color keys reference theme colors (resolved in component)
const STAGES_CONFIG = [
  {
    id: 'ecr1',
    label: 'ECR-1',
    title: 'Change Request Board',
    subtitle: 'Asignación de equipos y áreas',
    icon: '1',
    component: ECRTeamTab,
    colorKey: 'primary'
  },
  {
    id: 'ecr2',
    label: 'ECR-2',
    title: 'Change Description',
    subtitle: 'Descripción del cambio',
    icon: '2',
    component: ECRChangeRequest,
    colorKey: 'primary'
  },
  {
    id: 'ecr2b',
    label: 'ECR-2B',
    title: 'Impact Analysis',
    subtitle: 'Análisis de Impacto (IATF 8.5.6.1)',
    icon: '3',
    component: ECRImpactAnalysis,
    colorKey: 'warning'
  },
  {
    id: 'ecr3',
    label: 'ECR-3',
    title: 'Validation & Implementation',
    subtitle: 'Plan de validaciones',
    icon: '4',
    component: ECRValidationPlan,
    colorKey: 'primary'
  },
  {
    id: 'ecr4',
    label: 'ECR-4',
    title: 'Closure & Confirmation',
    subtitle: 'Cierre formal',
    icon: '5',
    component: ECRClosure,
    colorKey: 'success'
  }
];

const ECRWorkflow = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showSuccess, showError } = useToast();
  const { theme: t } = useTheme();

  // Permission check
  const canEdit = canUserEdit('ecr');
  const readOnly = isReadOnly('ecr');

  const [currentStage, setCurrentStage] = useState(() => {
    const saved = localStorage.getItem(`ecr-current-stage-${id}`);
    return saved ? parseInt(saved) : 0;
  });
  const [workflowData, setWorkflowData] = useState({
    id: null,
    ecrNumber: '',
    status: 'draft',

    // ECR-1 data
    changeCategory: '',
    riskAssessment: null,
    reviewBoard: { primary: null, members: [] },
    validationTeams: {},
    involvedAreas: [],
    validationAreas: [],

    // ECR-2 data - Requestor Information
    requestorUserId: null,
    requestorName: '',
    requestorDepartment: '',
    requestorEmail: '',
    requestorPhone: '',
    requestorExtension: '',

    // ECR-2 data - Change Information
    selectedClient: null,
    selectedProjects: [], // Changed to array for multiple projects
    selectedParts: [],
    changeTitle: '',
    changeDescription: '',
    changeType: '',
    priority: 'medium',
    plannedAdoptionDate: '',
    beforePhotos: [],
    afterPhotos: [],
    affectedDocuments: [],

    // Impact Analysis data (NEW)
    impactAnalysis: [],

    // ECR-3 data
    validationActions: [],
    trialPlan: '',
    implementationPlan: '',
    beforeCondition: '',
    afterCondition: '',
    beforeEvidence: '',
    afterEvidence: '',
    communicationPlan: {
      customer: { method: '', date: '', status: 'pending', notes: '' },
      supplier: { method: '', date: '', status: 'pending', notes: '' },
      plant: { method: '', date: '', status: 'pending', notes: '' },
      warehouse: { method: '', date: '', status: 'pending', notes: '' },
      logistics: { method: '', date: '', status: 'pending', notes: '' }
    },
    customerApproval: {
      required: false,
      status: 'not_required',
      approvedBy: '',
      approvedAt: null,
      comments: '',
      evidence: []
    },

    // ECR-4 data - Closure & Verification
    impactVerifications: {},  // Dynamic from ECR-2B
    ppapStatus: {
      level: '',
      submittedDate: '',
      approvedDate: '',
      evidence: []
    },
    isirFirstArticle: '',
    initialScrap: '',
    processStability: '',
    cpkPostChange: '',
    productionEvidence: [],
    detectedRisks: '',
    appliedImprovements: '',
    processOwnerSignature: null,
    processOwnerSignedAt: null,
    managementSignature: null,
    managementSignedAt: null,
    closureNotes: '',
    effectiveDate: '',
    isCompleted: false,
    financialImpact: {
      items: [],
      totalCost: 0,
      totalSavings: 0,
      netImpact: 0
    },
    // Stage completion tracking
    stageCompletionStatus: {
      ecr1: { completed: false },
      ecr2: { completed: false },
      ecr2b: { completed: false },
      ecr3: { completed: false },
      ecr4: { completed: false }
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Resolve STAGES colors from theme
  const STAGES = useMemo(() => STAGES_CONFIG.map(stage => ({
    ...stage,
    color: t[stage.colorKey]
  })), [t]);

  // Load ECR data if ID exists
  useEffect(() => {
    if (id) {
      loadECRData();
    }
  }, [id]);

  const loadECRData = async () => {
    try {
      setLoading(true);
      const data = await ecrService.getECRById(id);

      // Reconstruct selectedClient object from clientId
      if (data.clientId && !data.selectedClient) {
        try {
          const clientsResponse = await axios.get('http://localhost:5000/clients/list', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const clients = clientsResponse.data.clients || [];
          const client = clients.find(c => c.id === data.clientId);
          if (client) {
            data.selectedClient = client;

            // Also reconstruct selectedProjects if we have the data
            if (data.selectedProjects && Array.isArray(data.selectedProjects) && data.selectedProjects.length > 0) {
              // selectedProjects should already be in correct format from backend
              // Just ensure they have the correct structure
              data.selectedProjects = data.selectedProjects.map(proj => ({
                id: proj.id || proj.projectId,
                projectNumber: proj.projectNumber,
                projectName: proj.projectName
              }));
            }
          }
        } catch (err) {
          console.error('Error loading client:', err);
        }
      }

      setWorkflowData(data);
    } catch (error) {
      console.error('Error loading ECR:', error);
      showError('Error al cargar el ECR');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isDraft = true) => {
    try {
      // Validate risk assessment if in ECR-2B and not saving as draft
      if (!isDraft && STAGES[currentStage].id === 'ecr2b') {
        const impactAnalysis = workflowData.impactAnalysis || [];

        if (impactAnalysis.length > 0) {
          const areasWithoutRisk = impactAnalysis.filter(area =>
            !area.severity || !area.occurrence
          );

          if (areasWithoutRisk.length > 0) {
            showError('Por favor completa la evaluación de riesgo para todas las áreas de impacto seleccionadas antes de guardar');
            return; // Don't save
          }
        }
      }

      setSaving(true);

      const payload = {
        changeTitle: workflowData.changeTitle,
        changeDescription: workflowData.changeDescription,
        changeAttachments: workflowData.changeAttachments,
        beforeConditionDescription: workflowData.beforeConditionDescription,
        afterConditionDescription: workflowData.afterConditionDescription,
        changeCategories: workflowData.changeCategories,
        changeType: workflowData.changeType,
        priority: workflowData.priority,
        plannedAdoptionDate: workflowData.plannedAdoptionDate,
        riskAssessment: workflowData.riskAssessment,
        impactAnalysis: workflowData.impactAnalysis,
        selectedParts: workflowData.selectedParts,
        affectedDocuments: workflowData.affectedDocuments,
        beforePhotos: workflowData.beforePhotos,
        afterPhotos: workflowData.afterPhotos,
        reviewBoard: workflowData.reviewBoard,
        validationTeams: workflowData.validationTeams,
        involvedAreas: workflowData.involvedAreas,
        validationAreas: workflowData.validationAreas,
        clientId: workflowData.selectedClient?.id || null,
        selectedProjects: workflowData.selectedProjects || [], // Array of selected projects

        // Requestor Information
        requestorUserId: workflowData.requestorUserId,
        requestorName: workflowData.requestorName,
        requestorDepartment: workflowData.requestorDepartment,
        requestorEmail: workflowData.requestorEmail,
        requestorPhone: workflowData.requestorPhone,
        requestorExtension: workflowData.requestorExtension,

        // ECR-3 fields
        validationActions: workflowData.validationActions,
        trialPlan: workflowData.trialPlan,
        implementationPlan: workflowData.implementationPlan,
        beforeCondition: workflowData.beforeCondition,
        afterCondition: workflowData.afterCondition,
        beforeEvidence: workflowData.beforeEvidence,
        afterEvidence: workflowData.afterEvidence,
        selectedValidations: workflowData.selectedValidations,
        communicationPlan: workflowData.communicationPlan,
        customerApproval: workflowData.customerApproval,
        validationEvidence: workflowData.validationEvidence,

        // ECR-2B Approvers
        approvers: workflowData.approvers,

        // ECR-4 Closure fields
        impactVerifications: workflowData.impactVerifications,
        ppapStatus: workflowData.ppapStatus,
        detectedRisks: workflowData.detectedRisks,
        appliedImprovements: workflowData.appliedImprovements,
        closureSignatures: workflowData.closureSignatures,
        rejectionSignatures: workflowData.rejectionSignatures,
        rejectionReason: workflowData.rejectionReason,
        closureNotes: workflowData.closureNotes,
        effectiveDate: workflowData.effectiveDate,
        adoptionLotNumber: workflowData.adoptionLotNumber,
        isCompleted: workflowData.isCompleted,
        financialImpact: workflowData.financialImpact,

        // Closure Audit
        requiresClosureAudit: workflowData.requiresClosureAudit,
        closureAuditItems: workflowData.closureAuditItems,

        // Stage completion status
        stageCompletionStatus: workflowData.stageCompletionStatus
      };

      let result;
      if (workflowData.id) {
        // Update existing ECR
        result = await ecrService.updateECR(workflowData.id, payload);
      } else {
        // Create new ECR
        result = await ecrService.createECR(payload);
      }

      if (result.success) {
        // Preserve local state for fields that may not return correctly from backend
        const updatedEcr = {
          ...result.ecr,
          stageCompletionStatus: workflowData.stageCompletionStatus,
          affectedDocuments: workflowData.affectedDocuments || result.ecr.affectedDocuments,
          changeAttachments: workflowData.changeAttachments || result.ecr.changeAttachments
        };
        setWorkflowData(updatedEcr);
        showSuccess(isDraft ? 'Borrador guardado' : 'ECR guardado exitosamente');

        // Navigate to the ECR if it's new
        if (!workflowData.id && result.ecr.id) {
          navigate(`/ecr-workflow/${result.ecr.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving ECR:', error);
      showError('Error al guardar el ECR');
    } finally {
      setSaving(false);
    }
  };

  // Check if current user is admin (using centralized utility)
  const isAdmin = () => {
    return isUserAdmin();
  };

  // Submit ECR for approval - locks editing
  const handleSubmitForApproval = async () => {
    try {
      // Don't allow submitting if already approved or pending
      if (workflowData.status === 'approved' || workflowData.status === 'completed') {
        showError('Este ECR ya está aprobado');
        return;
      }

      if (workflowData.status === 'pending_approval') {
        showError('Este ECR ya está pendiente de aprobación');
        return;
      }

      // Validate approvers are assigned
      const approvers = workflowData.approvers || {};
      if (!approvers.level1 && !approvers.level2 && !approvers.level3) {
        showError('Debes asignar al menos un aprobador en ECR-2B antes de enviar a aprobación');
        return;
      }

      // Validate ECR-4 stage is marked as completed
      if (!workflowData.stageCompletionStatus?.ecr4?.completed) {
        showError('Debes marcar la etapa ECR-4 como completada antes de enviar a aprobación');
        return;
      }

      // Validate all impact areas have been verified (approved or conditional)
      const impactAnalysis = workflowData.impactAnalysis || [];
      const impactVerifications = workflowData.impactVerifications || {};
      const pendingAreas = [];

      impactAnalysis.forEach(area => {
        if (area.selectedSubsections && area.selectedSubsections.length > 0) {
          area.selectedSubsections.forEach(subsectionKey => {
            const verification = impactVerifications[area.areaKey]?.[subsectionKey];
            if (!verification?.verdict || verification.verdict === 'rejected') {
              pendingAreas.push(`${area.areaName || area.areaKey} - ${subsectionKey}`);
            }
          });
        }
      });

      if (pendingAreas.length > 0) {
        showError(
          `Las siguientes áreas de impacto deben ser verificadas (Aprobado o Condicional) antes de enviar a aprobación:\n\n` +
          `• ${pendingAreas.slice(0, 5).join('\n• ')}` +
          (pendingAreas.length > 5 ? `\n... y ${pendingAreas.length - 5} más` : '')
        );
        return;
      }

      // Validate formal closure fields (ECR-4)
      const missingClosureFields = [];
      if (!workflowData.effectiveDate) {
        missingClosureFields.push('Fecha Efectiva de Adopción');
      }
      if (!workflowData.adoptionLotNumber || !workflowData.adoptionLotNumber.trim()) {
        missingClosureFields.push('No. de Lote/Unidad de Adopción');
      }
      if (!workflowData.closureNotes || !workflowData.closureNotes.trim()) {
        missingClosureFields.push('Notas de Cierre');
      }

      if (missingClosureFields.length > 0) {
        showError(
          `Faltan campos obligatorios en "Cierre Formal" (ECR-4):\n\n` +
          `• ${missingClosureFields.join('\n• ')}\n\n` +
          `Completa estos campos antes de enviar a aprobación.`
        );
        return;
      }

      // Confirm action
      if (!window.confirm('¿Estás seguro de enviar este ECR a aprobación?\n\nUna vez enviado, no podrás editar hasta que sea aprobado o rechazado.')) {
        return;
      }

      setSaving(true);

      const currentUser = getCurrentUser();
      const now = new Date().toISOString();

      // Add to approval history
      const newHistoryEntry = {
        action: 'submitted',
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        timestamp: now,
        notes: 'ECR enviado a aprobación'
      };

      const approvalHistory = [...(workflowData.approvalHistory || []), newHistoryEntry];

      // Save current data and change status to pending_approval
      const payload = {
        ...workflowData,
        status: 'pending_approval',
        submittedAt: now,
        submittedBy: currentUser.id,
        approvalHistory
      };

      const result = await ecrService.updateECR(workflowData.id, payload);

      if (result.success) {
        setWorkflowData(result.ecr);
        showSuccess('ECR enviado a aprobación. Los aprobadores serán notificados.');
      }
    } catch (error) {
      console.error('Error submitting ECR for approval:', error);
      showError('Error al enviar ECR a aprobación');
    } finally {
      setSaving(false);
    }
  };

  // Check if ECR is locked (pending approval or approved)
  // Admins can always edit
  const isECRLocked = () => {
    if (isAdmin()) return false; // Admins bypass lock
    const status = workflowData.status;
    return status === 'pending_approval' || status === 'approved' || status === 'completed';
  };

  // Check if all closure signatures are complete
  const isFullyApproved = () => {
    const approvers = workflowData.approvers || {};
    const closureSignatures = workflowData.closureSignatures || {};

    // Get which levels have approvers assigned
    const assignedLevels = ['level1', 'level2', 'level3'].filter(level => approvers[level]);

    // If no approvers assigned, not fully approved
    if (assignedLevels.length === 0) return false;

    // Check if all assigned levels have signatures
    return assignedLevels.every(level => closureSignatures[level]?.signedBy);
  };

  const handleDataUpdate = (updatedData) => {
    setWorkflowData(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  // Handle stage completion toggle
  const handleStageCompletion = async (stageId, completed) => {
    const currentUser = getCurrentUser();
    const now = new Date().toISOString();

    const newCompletionStatus = {
      ...workflowData.stageCompletionStatus,
      [stageId]: completed
        ? {
            completed: true,
            completedAt: now,
            completedBy: currentUser.id,
            completedByName: `${currentUser.firstName} ${currentUser.lastName}`
          }
        : { completed: false }
    };

    setWorkflowData(prev => ({
      ...prev,
      stageCompletionStatus: newCompletionStatus
    }));

    // Auto-save completion status if ECR exists
    if (workflowData.id) {
      try {
        await ecrService.updateECR(workflowData.id, {
          stageCompletionStatus: newCompletionStatus
        });
        showSuccess(completed ? `Etapa ${stageId.toUpperCase()} marcada como completada` : `Etapa ${stageId.toUpperCase()} desmarcada`);
      } catch (error) {
        console.error('Error saving stage completion:', error);
        showError('Error al guardar el estado de la etapa');
      }
    }
  };

  // Check if stage is completed
  const isStageCompleted = (stageId) => {
    return workflowData.stageCompletionStatus?.[stageId]?.completed || false;
  };

  const handleNextStage = () => {
    // Validate ECR-2B before advancing
    if (STAGES[currentStage].id === 'ecr2b') {
      // Check if risk assessment is complete
      const impactAnalysis = workflowData.impactAnalysis || [];

      if (impactAnalysis.length > 0) {
        const areasWithoutRisk = impactAnalysis.filter(area =>
          !area.severity || !area.occurrence
        );

        if (areasWithoutRisk.length > 0) {
          showError('Por favor completa la evaluación de riesgo para todas las áreas de impacto seleccionadas');
          return; // Don't advance
        }
      }
    }

    // If validation passes or not ECR-2B, advance to next stage
    setCurrentStage(prev => prev + 1);
  };

  const handleGoBack = () => {
    localStorage.removeItem(`ecr-current-stage-${id}`);
    navigate('/ecr-dashboard');
  };

  // Save current stage to localStorage
  useEffect(() => {
    if (id) {
      localStorage.setItem(`ecr-current-stage-${id}`, currentStage);
    }
  }, [currentStage, id]);

  // Use scroll memory hook - saves/restores scroll position per stage
  const { containerRef, clearPosition } = useScrollMemory(`ecr-${id}-stage-${currentStage}`, {
    debounce: 150,
    useSession: true
  });

  // Clear all scroll positions when leaving the ECR
  useEffect(() => {
    return () => {
      if (id) {
        STAGES.forEach((_, index) => {
          sessionStorage.removeItem(`scroll-ecr-${id}-stage-${index}`);
        });
      }
    };
  }, [id]);

  // Generate styles based on theme
  const styles = useMemo(() => getStyles(t), [t]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: t.text }}>Cargando ECR...</p>
      </div>
    );
  }

  const CurrentStageComponent = STAGES[currentStage].component;

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {readOnly && (
        <div style={{
          backgroundColor: t.bgPanel,
          borderBottom: `2px solid ${t.warning}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: t.warning }}>BLOQUEADO</span>
          <span style={{ color: t.warning, fontWeight: '600' }}>
            Modo Solo Lectura - No tienes permisos para modificar este ECR
          </span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={handleGoBack} style={styles.backButton}>
            ← Volver
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={styles.title}>
                {workflowData.ecrNumber || 'Nuevo ECR'}
              </h1>
              {/* Priority Badge */}
              {workflowData.priority && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: workflowData.priority === 'critical' ? '#fecaca' :
                                   workflowData.priority === 'high' ? '#fed7aa' :
                                   workflowData.priority === 'medium' ? '#fef08a' : '#d1fae5',
                  color: workflowData.priority === 'critical' ? '#991b1b' :
                         workflowData.priority === 'high' ? '#9a3412' :
                         workflowData.priority === 'medium' ? '#854d0e' : '#166534'
                }}>
                  {workflowData.priority === 'critical' ? ' Crítica' :
                   workflowData.priority === 'high' ? ' Alta' :
                   workflowData.priority === 'medium' ? ' Media' : ' Baja'}
                </span>
              )}
            </div>
            <p style={styles.subtitle}>
              {workflowData.changeTitle || 'Sin título'}
            </p>
            {/* Info Badges Row */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {workflowData.changeType && (
                <span style={styles.infoBadge}>
                   {workflowData.changeType === 'permanent' ? 'Permanente' :
                      workflowData.changeType === 'temporary' ? 'Temporal' :
                      workflowData.changeType === 'emergency' ? 'Emergencia' : workflowData.changeType}
                </span>
              )}
              {workflowData.requestorDepartment && (
                <span style={styles.infoBadge}>
                   {workflowData.requestorDepartment}
                </span>
              )}
              {workflowData.changeCategory && (
                <span style={styles.infoBadge}>
                   {workflowData.changeCategory}
                </span>
              )}
              {workflowData.selectedClient?.name && (
                <span style={styles.infoBadge}>
                   {workflowData.selectedClient.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: isFullyApproved() || workflowData.status === 'approved' ? t.success :
                           workflowData.status === 'draft' ? t.textMuted :
                           workflowData.status === 'pending_approval' ? t.warning : t.success
          }}>
            {isFullyApproved() || workflowData.status === 'approved' ? 'Aprobado' :
             workflowData.status === 'draft' ? 'Borrador' :
             workflowData.status === 'pending_approval' ? 'Pendiente Aprobación' :
             workflowData.status === 'rejected' ? 'Rechazado' : workflowData.status}
          </span>
          {workflowData.status === 'draft' && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{...styles.button, ...styles.draftButton}}
            >
              {saving ? 'Guardando...' : ' Guardar Borrador'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Header Bar */}
      <div style={{
        backgroundColor: t.bgPanel,
        padding: '12px 24px',
        borderBottom: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
            Etapa {currentStage + 1} de {STAGES.length}
          </span>
          <span style={{ fontSize: '14px', color: t.textMuted }}>
            {STAGES[currentStage]?.label} - {STAGES[currentStage]?.title}
          </span>
        </div>
        <div style={{ flex: 1, height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            backgroundColor: t.accent,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
            width: `${((currentStage + 1) / STAGES.length) * 100}%`
          }} />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '600', color: t.accent }}>
          {Math.round(((currentStage + 1) / STAGES.length) * 100)}%
        </span>
      </div>

      {/* Stage Navigation */}
      <div style={styles.stagesNav}>
        {STAGES.map((stage, index) => (
          <div key={stage.id} style={styles.stageContainer}>
            <button
              onClick={() => setCurrentStage(index)}
              style={{
                ...styles.stageButton,
                ...(currentStage === index ? styles.stageButtonActive : {}),
                borderColor: isStageCompleted(stage.id) ? t.success : stage.color,
                backgroundColor: isStageCompleted(stage.id) && currentStage !== index ? t.bgPanel : (currentStage === index ? t.bgPanel : t.bgCard)
              }}
            >
              <span style={styles.stageIcon}>
                {isStageCompleted(stage.id) ? '' : stage.icon}
              </span>
              <div style={styles.stageInfo}>
                <div style={styles.stageLabel}>{stage.label}</div>
                <div style={styles.stageTitle}>{stage.title}</div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Locked Banner */}
      {isECRLocked() && (
        <div style={{
          padding: '12px 24px',
          backgroundColor: t.bgPanel,
          borderBottom: `2px solid ${workflowData.status === 'pending_approval' ? t.warning : t.success}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {workflowData.status === 'pending_approval' ? '' : ''}
          </span>
          <span style={{ fontWeight: '600', color: workflowData.status === 'pending_approval' ? t.warning : t.success }}>
            {workflowData.status === 'pending_approval'
              ? 'Este ECR está pendiente de aprobación. La edición está bloqueada.'
              : 'Este ECR ha sido aprobado.'}
          </span>
        </div>
      )}

      {/* Content Area */}
      <div ref={containerRef} style={styles.content}>
        <CurrentStageComponent
          data={workflowData}
          onDataUpdate={isECRLocked() ? () => {} : handleDataUpdate}
          isLocked={isECRLocked()}
          isAdmin={isAdmin()}
        />
      </div>

      {/* Footer Actions */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          {currentStage > 0 && (
            <button
              onClick={() => setCurrentStage(prev => prev - 1)}
              style={{...styles.button, ...styles.secondaryButton}}
            >
              ← Anterior
            </button>
          )}
        </div>
        <div style={styles.footerRight}>
          {/* Stage Completion Checkbox */}
          {workflowData.id && !isECRLocked() && (
            <label style={styles.footerCompletionCheckbox}>
              <input
                type="checkbox"
                checked={isStageCompleted(STAGES[currentStage].id)}
                onChange={(e) => handleStageCompletion(STAGES[currentStage].id, e.target.checked)}
                style={styles.footerCheckbox}
              />
              <span style={styles.footerCheckboxLabel}>
                MARCAR ETAPA COMPLETADA
              </span>
            </label>
          )}
          {currentStage < STAGES.length - 1 ? (
            <button
              onClick={handleNextStage}
              style={{...styles.button, ...styles.primaryButton}}
            >
              Siguiente →
            </button>
          ) : (
            // Show submit button only if: not locked AND not fully approved AND status is draft
            (!isECRLocked() && !isFullyApproved() && workflowData.status === 'draft') ? (
              <button
                onClick={handleSubmitForApproval}
                disabled={saving || !workflowData.id}
                style={{...styles.button, ...styles.submitButton}}
              >
                {saving ? 'Enviando...' : ' Enviar a Aprobación'}
              </button>
            ) : (
              <span style={{
                padding: '10px 20px',
                backgroundColor: isFullyApproved() || workflowData.status === 'approved' ? t.success : t.warning,
                color: 'white',
                borderRadius: '8px',
                fontWeight: '600'
              }}>
                {isFullyApproved() || workflowData.status === 'approved' ? ' Aprobado' :
                 workflowData.status === 'pending_approval' ? ' Pendiente de Aprobación' : ' Completado'}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// Function to generate styles based on theme
const getStyles = (t) => ({
  container: {
    minHeight: '100vh',
    backgroundColor: t.bg,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: t.bgCard,
    borderBottom: `1px solid ${t.border}`,
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: t.bgPanel,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: t.text
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: t.text,
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: t.textMuted,
    margin: '4px 0 0 0'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  infoBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: t.bgPanel,
    color: t.textMuted,
    border: `1px solid ${t.border}`
  },
  stagesNav: {
    backgroundColor: t.bgCard,
    borderBottom: `1px solid ${t.border}`,
    padding: '16px 24px',
    display: 'flex',
    gap: '12px',
    overflowX: 'auto'
  },
  stageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  stageButton: {
    padding: '12px 16px',
    backgroundColor: t.bgCard,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: t.border,
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '200px',
    transition: 'all 0.2s'
  },
  stageButtonActive: {
    borderColor: t.accent,
    backgroundColor: t.bgPanel
  },
  stageIcon: {
    fontSize: '24px'
  },
  stageInfo: {
    textAlign: 'left'
  },
  stageLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: t.textMuted
  },
  stageTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: t.text
  },
  completionCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    padding: '4px 8px',
    backgroundColor: t.bgPanel,
    borderRadius: '4px',
    border: `1px solid ${t.success}`,
    fontSize: '11px',
    marginTop: '4px'
  },
  checkbox: {
    width: '14px',
    height: '14px',
    cursor: 'pointer',
    accentColor: t.success
  },
  checkboxLabel: {
    color: t.success,
    fontWeight: '500'
  },
  completionInfo: {
    fontSize: '10px',
    color: t.textMuted,
    textAlign: 'center',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  footerCompletionCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '10px 16px',
    backgroundColor: t.bgPanel,
    borderRadius: '6px',
    border: `2px solid ${t.success}`,
    marginRight: '12px'
  },
  footerCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: t.success
  },
  footerCheckboxLabel: {
    color: t.success,
    fontWeight: '600',
    fontSize: '13px',
    letterSpacing: '0.5px'
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  },
  footer: {
    backgroundColor: t.bgCard,
    borderTop: `1px solid ${t.border}`,
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between'
  },
  footerLeft: {},
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  draftButton: {
    backgroundColor: t.textMuted,
    color: 'white'
  },
  primaryButton: {
    backgroundColor: t.accent,
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: t.bgPanel,
    color: t.text,
    border: `1px solid ${t.border}`
  },
  submitButton: {
    backgroundColor: t.success,
    color: 'white'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.bg
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${t.border}`,
    borderTop: `4px solid ${t.accent}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
});

export default ECRWorkflow;
