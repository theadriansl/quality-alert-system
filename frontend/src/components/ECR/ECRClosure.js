import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import { isUserAdmin } from '../../utils/permissions';
import ECRApprovalModal from './ECRApprovalModal';

// Default closure audit items (same as D7)
const DEFAULT_CLOSURE_AUDIT_ITEMS = [
  { id: -1, name: 'SPC', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 },
  { id: -2, name: 'AMEF', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 },
  { id: -3, name: 'Control Plan', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 },
  { id: -4, name: 'Work Instructions', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 },
  { id: -5, name: 'Procedures', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 },
  { id: -6, name: 'Specifications', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 },
  { id: -7, name: 'Training', icon: '', checkItem: '', comments: '', leaderJudgment: '', auditorJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditRound: 1 }
];

// Helper to format ISO date to yyyy-MM-dd for date inputs
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  // If already in correct format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  // Convert ISO string to yyyy-MM-dd
  try {
    return dateString.split('T')[0];
  } catch {
    return '';
  }
};

// Closure Approval Modal - Same 2-step flow as ECR-3 (ECRApprovalModal)
const ClosureApprovalModalContent = ({ t, closureApprovalLevel, closureType, rejectionReason, onApprove, onReject, onClose, language = 'es' }) => {
  const [action, setAction] = React.useState(null); // 'approve' or 'reject'
  const [comments, setComments] = React.useState('');
  const [error, setError] = React.useState(null);

  const isClosingAsRejected = closureType === 'rejected';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (action === 'reject' && !comments.trim()) {
      setError(language === 'es' ? 'Los comentarios son obligatorios al rechazar' : 'Comments are required when rejecting');
      return;
    }
    if (action === 'approve') {
      onApprove(comments);
    } else {
      onReject(comments);
    }
  };

  const levelNumber = closureApprovalLevel.replace('level', '');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: t.bgCard,
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: isClosingAsRejected ? t.errorFg : t.text, marginBottom: '20px' }}>
          {isClosingAsRejected
            ? (language === 'es' ? ' Cierre como NO ADOPTABLE' : ' Closure as NOT ADOPTABLE')
            : (language === 'es' ? 'Revisar Firma de Cierre' : 'Review Closure Signature')}
        </h2>

        {/* Warning for closing as rejected */}
        {isClosingAsRejected && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: t.errorBg,
            border: `2px solid ${t.error}`,
            borderRadius: '8px'
          }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: t.errorFg }}>
              Este ECR será cerrado como NO ADOPTABLE
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: t.errorFg }}>
              El cambio no será implementado. Al firmar, confirmas que el ECR debe cerrarse sin adoptar.
            </p>
            {rejectionReason && (
              <div style={{ marginTop: '12px', padding: '10px', backgroundColor: t.bgCard, borderRadius: '6px', border: `1px solid ${t.errorBorder}` }}>
                <p style={{ margin: 0, fontSize: '12px', color: t.textMuted }}>Motivo del rechazo:</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: t.errorFg }}>{rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '4px' }}>{language === 'es' ? 'Nivel de Aprobador' : 'Approver Level'}</p>
          <p style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>{language === 'es' ? 'Aprobador' : 'Approver'} {levelNumber}</p>
        </div>

        {!action && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setAction('approve')}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: isClosingAsRejected ? t.error : t.success,
                color: 'white'
              }}
            >
              {isClosingAsRejected ? (language === 'es' ? ' Confirmar Cierre como No Adoptable' : ' Confirm Closure as Not Adoptable') : (language === 'es' ? ' Aprobar Cierre' : ' Approve Closure')}
            </button>
            <button
              onClick={() => setAction('reject')}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: isClosingAsRejected ? t.warning : t.error,
                color: 'white'
              }}
            >
              {isClosingAsRejected ? (language === 'es' ? '↩ Devolver - Considerar Adoptar' : '↩ Return - Consider Adopting') : (language === 'es' ? ' Rechazar' : ' Reject')}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: t.bgPanel,
                color: t.text
              }}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        )}

        {action && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? 'Comentarios' : 'Comments'} {action === 'reject' && <span style={{ color: t.error }}>*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows="4"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  backgroundColor: t.bgCard,
                  color: t.text
                }}
                placeholder={action === 'reject' ? (language === 'es' ? 'Explica la razón del rechazo...' : 'Explain the rejection reason...') : (language === 'es' ? 'Comentarios adicionales (opcional)' : 'Additional comments (optional)')}
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p style={{ fontSize: '12px', color: t.error, marginTop: '6px' }}>
                  {language === 'es' ? 'Debes proporcionar una razón para rechazar' : 'You must provide a reason for rejection'}
                </p>
              )}
            </div>

            {error && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: t.errorBg,
                border: `1px solid ${t.errorBorder}`,
                borderRadius: '6px',
                color: t.errorFg,
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  backgroundColor: action === 'approve'
                    ? (isClosingAsRejected ? '#991b1b' : '#2E7D32')
                    : (isClosingAsRejected ? '#C77700' : '#ef4444')
                }}
              >
                {action === 'approve'
                  ? (isClosingAsRejected ? (language === 'es' ? 'Confirmar Cierre No Adoptable' : 'Confirm Not Adoptable Closure') : (language === 'es' ? 'Confirmar Aprobación' : 'Confirm Approval'))
                  : (isClosingAsRejected ? (language === 'es' ? 'Devolver para Reconsideración' : 'Return for Reconsideration') : (language === 'es' ? 'Confirmar Rechazo' : 'Confirm Rejection'))}
              </button>
              <button
                type="button"
                onClick={() => setAction(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Atrás' : 'Back'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ECRClosure = ({ data, onDataUpdate, isLocked = false, isAdmin = false, onSaveDraft, isReadOnly = false, language = 'es', t: translate }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const { showSuccess, showError } = useToast();

  // Translation helper with fallback
  const tr = (key) => translate ? translate(key) : key;

  // Computed: Check if ECR needs corrections (allows editing previously locked sections)
  // Unlock when: status='rejected' OR approvalStatus='rejected'
  // Once user re-submits, approvalStatus changes to 'pending_approval' and it locks again
  const isEcrRejected = data.status === 'rejected' || data.approvalStatus === 'rejected';
  const [users, setUsers] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(null);
  const [qualityTargets, setQualityTargets] = useState({ cpTarget: 1.33, cpkTarget: 1.33, processStabilityTarget: 95, initialScrapTarget: 5 });

  // Audit states
  // TFT members: reviewBoard stores IDs → resolve to user objects from users list
  const tftMemberIds = [
    ...(data.reviewBoard?.primary ? [data.reviewBoard.primary] : []),
    ...(data.reviewBoard?.members || [])
  ].filter(Boolean);
  const tftMembers = tftMemberIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  const [auditItems, setAuditItems] = useState([]);
  const [auditRequests, setAuditRequests] = useState([]);
  // Closure audit states (D7-style)
  const [closureAuditItems, setClosureAuditItems] = useState([]);
  const [nextClosureAuditId, setNextClosureAuditId] = useState(-8); // Start after default items
  const [uploadingAuditFile, setUploadingAuditFile] = useState(null);
  const [auditSelectionMode, setAuditSelectionMode] = useState(false);
  const [selectedAuditItems, setSelectedAuditItems] = useState(new Set());

  // Refs to prevent infinite loops between parent sync and local state
  const closureItemsLoadedRef = useRef(false);
  const lastDataItemsJsonRef = useRef('');

  // Scroll sync refs
  const topScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState({ history: [], currentRound: 1, itemName: '' });
  const [currentImpactArea, setCurrentImpactArea] = useState(null); // For modal context
  const [expandedAreas, setExpandedAreas] = useState({}); // Track which areas are expanded
  // Closure approval modal state
  const [showClosureApprovalModal, setShowClosureApprovalModal] = useState(false);
  const [closureApprovalLevel, setClosureApprovalLevel] = useState(null);

  // Get impact analysis from ECR-2B
  const impactAnalysis = data.impactAnalysis || [];

  // Default verification structure
  const defaultVerification = {
    verdict: '', // 'approved', 'conditional', 'rejected'
    observations: '',
    evidence: [],
    signedBy: null,
    signedByName: '',
    signedAt: null,
    isLocked: false
  };

  // Initialize verification state for each impacted area/subsection
  const initializeVerifications = () => {
    const verifications = {};
    const existingVerifications = data.impactVerifications || {};

    impactAnalysis.forEach(area => {
      if (area.selectedSubsections && area.selectedSubsections.length > 0) {
        verifications[area.areaKey] = {};
        area.selectedSubsections.forEach(subsectionKey => {
          // Merge existing data with defaults
          const existing = existingVerifications[area.areaKey]?.[subsectionKey] || {};
          verifications[area.areaKey][subsectionKey] = {
            ...defaultVerification,
            ...existing,
            // Convert old 'verified' field to new 'verdict' if needed
            verdict: existing.verdict || (existing.verified ? 'approved' : ''),
            evidence: existing.evidence || []
          };
        });
      }
    });

    return verifications;
  };

  // Get current user from context or localStorage
  const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  };

  const [formData, setFormData] = useState({
    // Impact verifications (dynamic from ECR-2B)
    impactVerifications: initializeVerifications(),

    // Production results
    isirFirstArticle: data.isirFirstArticle || '',
    initialScrap: data.initialScrap || '',
    processStability: data.processStability || '',
    cpPostChange: data.cpPostChange || '',
    cpkPostChange: data.cpkPostChange || '',
    productionEvidence: data.productionEvidence || [],
    productionJudgment: data.productionJudgment || '',
    productionComments: data.productionComments || '',

    // PPAP Status
    ppapStatus: data.ppapStatus ? {
      ...data.ppapStatus,
      submittedDate: formatDateForInput(data.ppapStatus.submittedDate),
      approvedDate: formatDateForInput(data.ppapStatus.approvedDate)
    } : { level: '', submittedDate: '', approvedDate: '', evidence: [] },

    // Lessons learned
    detectedRisks: data.detectedRisks || '',
    appliedImprovements: data.appliedImprovements || '',

    // Formal closure - signatures from ECR-2B approvers
    closureSignatures: data.closureSignatures || {
      level1: { signedBy: null, signedByName: '', signedAt: null },
      level2: { signedBy: null, signedByName: '', signedAt: null },
      level3: { signedBy: null, signedByName: '', signedAt: null }
    },
    // Rejection closure - same 3 levels but for rejection
    rejectionSignatures: data.rejectionSignatures || {
      level1: { signedBy: null, signedByName: '', signedAt: null },
      level2: { signedBy: null, signedByName: '', signedAt: null },
      level3: { signedBy: null, signedByName: '', signedAt: null }
    },
    rejectionReason: data.rejectionReason || '',
    closureApprovalHistory: data.closureApprovalHistory || [],
    closureApprovalStatus: data.closureApprovalStatus || 'draft',
    closureNotes: data.closureNotes || '',
    effectiveDate: formatDateForInput(data.effectiveDate),
    adoptionLotNumber: data.adoptionLotNumber || '',
    // Closure Audit
    requiresClosureAudit: data.requiresClosureAudit || false,
    // Note: closureAuditItems managed in separate state to prevent loops
    // Financial Impact
    financialImpact: data.financialImpact || {
      items: [], // { type: 'scrap'|'investment'|'savings'|'overtime'|'other', description: '', amount: 0 }
      totalCost: 0,
      totalSavings: 0,
      netImpact: 0
    },
    isCompleted: data.isCompleted || false
  });

  // Get approvers from ECR-2B
  const approvers = data.approvers || {};
  const approverLevels = [
    { key: 'level1', label: language === 'es' ? 'Nivel 1' : 'Level 1', icon: '' },
    { key: 'level2', label: language === 'es' ? 'Nivel 2' : 'Level 2', icon: '' },
    { key: 'level3', label: language === 'es' ? 'Nivel 3' : 'Level 3', icon: '' }
  ].filter(level => approvers[level.key]);

  // Load users
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

    const fetchTargets = async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await axios.get('http://localhost:5000/ecr/quality-targets', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r.data.success && r.data.targets) {
          const d = r.data.targets;
          setQualityTargets({
            cpTarget: parseFloat(d.cp_target),
            cpkTarget: parseFloat(d.cpk_target),
            processStabilityTarget: parseFloat(d.process_stability_target),
            initialScrapTarget: parseFloat(d.initial_scrap_target)
          });
        }
      } catch (e) { /* use defaults */ }
    };
    fetchTargets();
  }, []);

  // No external audit system — auditors are TFT members from reviewBoard

  // Initialize audit items from impact areas
  useEffect(() => {
    if (impactAnalysis.length > 0 && auditItems.length === 0) {
      const items = [];
      impactAnalysis.forEach(area => {
        if (area.selectedSubsections && area.selectedSubsections.length > 0) {
          area.selectedSubsections.forEach(subsectionKey => {
            // Check if already sent to audit
            const existingRequest = auditRequests.find(r =>
              r.itemName === `${area.areaName} - ${subsectionKey}`
            );
            items.push({
              id: `${area.areaKey}-${subsectionKey}`,
              areaKey: area.areaKey,
              areaName: area.areaName,
              areaIcon: area.icon,
              subsectionKey,
              name: `${area.areaName} - ${subsectionKey}`,
              checkItem: `Verificar implementación de ${subsectionKey} en TFT ${area.areaName}`,
              assignedAuditors: existingRequest?.assignedAuditors || [],
              dueDate: existingRequest?.dueDate || '',
              sentToAudit: !!existingRequest,
              auditRequestId: existingRequest?.id || null,
              status: existingRequest?.status || 'pending'
            });
          });
        }
      });
      setAuditItems(items);
    }
  }, [impactAnalysis, auditRequests]);


  // Update audit item
  const updateAuditItem = (itemId, field, value) => {
    setAuditItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // ============================================
  // CLOSURE AUDIT ITEMS HANDLERS (D7-style)
  // ============================================

  // Initialize closure audit items from saved data (only on initial load or when backend data changes)
  useEffect(() => {
    if (data.closureAuditItems && data.closureAuditItems.length > 0) {
      // Create a JSON string to compare with previous data
      const newDataJson = JSON.stringify(data.closureAuditItems.map(i => i.id).sort());

      // Only update if the data from parent is actually different (prevents loops)
      if (newDataJson !== lastDataItemsJsonRef.current) {
        lastDataItemsJsonRef.current = newDataJson;
        closureItemsLoadedRef.current = true;

        // Merge with audit request status
        const itemsWithStatus = data.closureAuditItems.map(item => {
          const itemName = item.itemName || item.name || '';
          const request = auditRequests.find(r => r.itemName === itemName);
          return {
            ...item,
            name: itemName,
            dueDate: formatDateForInput(item.dueDate),
            sentToAudit: item.sentToAudit || !!request,
            auditRequestId: request?.id || null,
            auditorCompleted: item.auditorCompleted || request?.status === 'completed',
            auditorJudgment: request?.judgment || item.auditorJudgment || '',
            auditorComments: request?.comments || item.auditorComments || ''
          };
        });
        setClosureAuditItems(itemsWithStatus);
        // Set next temp ID based on existing items
        const minId = Math.min(...data.closureAuditItems.map(i => i.id), 0);
        setNextClosureAuditId(minId - 1);

        // Reset flag after a short delay to allow future local updates to sync
        setTimeout(() => {
          closureItemsLoadedRef.current = false;
        }, 100);
      }
    }
  }, [data.closureAuditItems, auditRequests]);

  // Re-hydrate assignedAuditorsInfo from IDs when users list is available or items change
  useEffect(() => {
    if (users.length === 0) return;
    if (!closureAuditItems.length) return;

    // Check if any item needs hydration
    const needsHydration = closureAuditItems.some(item =>
      item.assignedAuditors?.length > 0 && !item.assignedAuditorsInfo?.length
    );
    if (!needsHydration) return;

    setClosureAuditItems(prev => prev.map(item => {
      if (item.assignedAuditorsInfo?.length > 0) return item;
      if (!item.assignedAuditors?.length) return item;
      const hydrated = item.assignedAuditors.map(id => {
        const u = users.find(u => u.id === id);
        return u ? { id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), firstName: u.firstName, email: u.email } : null;
      }).filter(Boolean);
      return hydrated.length > 0 ? { ...item, assignedAuditorsInfo: hydrated } : item;
    }));
  }, [users, data.closureAuditItems]);

  // Add a closure audit item to a specific impact area
  const addClosureAuditItem = (impactArea, itemTemplate = null) => {
    const newItem = {
      id: nextClosureAuditId,
      // Impact area info
      impactAreaKey: impactArea?.areaKey || 'general',
      impactAreaName: impactArea?.areaName || 'General',
      impactSubsection: impactArea?.subsection || '',
      // Item info
      name: itemTemplate?.name || '',
      icon: itemTemplate?.icon || '',
      isDefault: itemTemplate?.isDefault || false,
      checkItem: '',
      comments: '',
      leaderJudgment: '',
      dueDate: '',
      assignedAuditors: [],
      assignedAuditorsInfo: [],
      sentToAudit: false,
      auditorCompleted: false,
      auditorComments: '',
      auditorJudgment: '',
      files: [],
      auditRound: 1
    };
    setClosureAuditItems(prev => [...prev, newItem]);
    setNextClosureAuditId(prev => prev - 1);
    setShowAddCategoryModal(false);
  };

  // Open modal to add item to a specific area
  const openAddItemModal = (impactArea) => {
    setCurrentImpactArea(impactArea);
    setShowAddCategoryModal(true);
  };

  // Toggle area expansion
  const toggleAreaExpansion = (areaKey) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaKey]: !prev[areaKey]
    }));
  };

  // Get items for a specific impact area
  const getItemsForArea = (areaKey, subsection) => {
    return closureAuditItems.filter(item =>
      item.impactAreaKey === areaKey &&
      item.impactSubsection === subsection
    );
  };

  // Update a closure audit item
  const updateClosureAuditItem = (itemId, field, value) => {
    setClosureAuditItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // Update multiple fields at once
  const updateClosureAuditItemMultiple = (itemId, updates) => {
    setClosureAuditItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  // Delete a closure audit item
  const deleteClosureAuditItem = (itemId) => {
    if (window.confirm(language === 'es' ? '¿Eliminar este item del checklist de auditoría?' : 'Delete this item from the audit checklist?')) {
      setClosureAuditItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // Toggle selection of an audit item
  const toggleAuditItemSelection = (itemId) => {
    setSelectedAuditItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select/deselect all audit items
  const toggleSelectAllAuditItems = () => {
    if (selectedAuditItems.size === closureAuditItems.length) {
      setSelectedAuditItems(new Set());
    } else {
      setSelectedAuditItems(new Set(closureAuditItems.map(item => item.id)));
    }
  };

  // Delete selected audit items
  const deleteSelectedAuditItems = () => {
    if (selectedAuditItems.size === 0) return;
    if (window.confirm(language === 'es' ? `¿Eliminar ${selectedAuditItems.size} item(s) seleccionados?` : `Delete ${selectedAuditItems.size} selected item(s)?`)) {
      setClosureAuditItems(prev => prev.filter(item => !selectedAuditItems.has(item.id)));
      setSelectedAuditItems(new Set());
      setAuditSelectionMode(false);
    }
  };

  // Exit selection mode
  const exitAuditSelectionMode = () => {
    setAuditSelectionMode(false);
    setSelectedAuditItems(new Set());
  };

  // Duplicate a closure audit item (add another row of same category in same area)
  const duplicateClosureAuditItem = (item) => {
    const newItem = {
      ...item,
      id: nextClosureAuditId,
      // Keep area info
      impactAreaKey: item.impactAreaKey,
      impactAreaName: item.impactAreaName,
      impactSubsection: item.impactSubsection,
      // Reset other fields
      checkItem: '',
      comments: '',
      leaderJudgment: '',
      dueDate: '',
      assignedAuditors: [],
      assignedAuditorsInfo: [],
      sentToAudit: false,
      auditorCompleted: false,
      auditorComments: '',
      auditorJudgment: '',
      files: [],
      auditRound: 1
    };
    setClosureAuditItems(prev => [...prev, newItem]);
    setNextClosureAuditId(prev => prev - 1);
  };

  // Upload file to audit item
  const uploadClosureAuditItemFile = async (itemId, file) => {
    let realItemId = itemId;

    // Items with negative IDs haven't been saved to DB yet - save them first
    if (itemId < 0) {
      if (!data.id) {
        showError(language === 'es' ? 'Guarda el ECR primero antes de subir archivos' : 'Save the ECR first before uploading files');
        return;
      }

      // Find the item to save
      const itemToSave = closureAuditItems.find(item => item.id === itemId);
      if (!itemToSave) {
        showError(language === 'es' ? 'Item no encontrado' : 'Item not found');
        return;
      }

      setUploadingAuditFile(itemId);

      try {
        const token = localStorage.getItem('token');
        // Save all items first (PUT endpoint saves all items)
        const saveResponse = await axios.put(
          `http://localhost:5000/ecr/${data.id}/closure-audit-items`,
          { items: closureAuditItems },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (saveResponse.data.success && saveResponse.data.items?.length > 0) {
          // Find the saved item that matches our item (by matching properties since ID changed)
          const savedItem = saveResponse.data.items.find(saved =>
            saved.impactAreaKey === itemToSave.impactAreaKey &&
            saved.impactSubsection === itemToSave.impactSubsection &&
            saved.name === itemToSave.name
          );

          if (savedItem) {
            realItemId = savedItem.id;
          } else {
            // Fallback: use the last item if we can't match
            realItemId = saveResponse.data.items[saveResponse.data.items.length - 1].id;
          }

          // Update all local items with their real IDs from the server
          setClosureAuditItems(saveResponse.data.items);
        } else {
          showError(language === 'es' ? 'Error al guardar el ítem' : 'Error saving item');
          setUploadingAuditFile(null);
          return;
        }
      } catch (err) {
        console.error('Error saving item before upload:', err);
        showError(language === 'es' ? 'Error al guardar el ítem antes de subir archivo' : 'Error saving item before uploading file');
        setUploadingAuditFile(null);
        return;
      }
    } else {
      setUploadingAuditFile(itemId);
    }

    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/closure-audit-items/${realItemId}/files`,
        uploadFormData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setClosureAuditItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, files: [...(item.files || []), response.data.file] }
            : item
        ));
        showSuccess(language === 'es' ? 'Archivo subido' : 'File uploaded');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showError(language === 'es' ? 'Error al subir archivo' : 'Error uploading file');
    } finally {
      setUploadingAuditFile(null);
    }
  };

  // Re-send item to audit (after NOK/OBS)
  const resendClosureAuditItem = async (item) => {
    const currentJudgment = item.leaderJudgment || item.auditorJudgment || '';
    const defaultReason = item.auditorComments || item.comments || `Hallazgo ${currentJudgment}: requiere corrección`;
    const reason = window.prompt(
      `Re-enviar "${item.name}" a Ronda ${(item.auditRound || 1) + 1}\n\nRazón del ${currentJudgment} (se mostrará en el historial):`,
      defaultReason
    );
    if (reason === null) return; // cancelled

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/closure-audit-items/${item.id}/resend`,
        { closureNotes: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newRound = response.data.newRound;
        setClosureAuditItems(prev => prev.map(i =>
          i.id === item.id ? {
            ...i,
            auditRound: newRound,
            sentToAudit: true,
            auditorCompleted: false,
            auditorJudgment: '',
            auditorComments: '',
            auditedByName: null,
            verificationDate: null
          } : i
        ));

        // Abrir mailto a auditores asignados
        const auditorEmails = (item.assignedAuditorsInfo || []).map(a => a.email).filter(Boolean).join(';');
        if (auditorEmails) {
          const ecrNumber = data.ecrNumber || `ECR-${data.id}`;
          const subject = encodeURIComponent(`[RE-ENVÍO] Auditoría ECR ${ecrNumber} — ${item.name} (Ronda ${newRound})`);
          const body = encodeURIComponent(
            `Estimado Auditor,\n\n` +
            `Se ha re-enviado un ítem de auditoría de cierre.\n\n` +
            `📋 ECR: ${ecrNumber}\n` +
            `📎 Ítem: ${item.name}\n` +
            `🔄 Ronda: ${newRound}\n` +
            `📝 Razón: ${reason}\n\n` +
            `Acceso directo: http://localhost:3000/ecr-workflow/${data.id}\n\n` +
            `Por favor ingrese al sistema y registre su juicio en ECR-4.\n\n` +
            `Sistema de Calidad`
          );
          window.open(`mailto:${auditorEmails}?subject=${subject}&body=${body}`, '_blank');
        }

        showSuccess(language === 'es' ? `Ítem re-enviado a Ronda ${newRound}. Historial guardado.` : `Item re-sent to Round ${newRound}. History saved.`);
      }
    } catch (error) {
      console.error('Error resending audit item:', error);
      showError(language === 'es' ? 'Error al re-enviar el ítem' : 'Error re-sending item');
    }
  };

  // Open history modal for an item
  const openHistoryModal = async (item) => {
    setShowHistoryModal(true);
    setHistoryData({ history: [], currentRound: item.auditRound || 1, itemName: item.name });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:5000/ecr/${data.id}/closure-audit-items/${item.id}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setHistoryData({
          history: res.data.history || [],
          currentRound: res.data.currentRound || 1,
          itemName: item.name
        });
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Get deleted default items that can be re-added
  const getDeletedDefaultItems = () => {
    const currentNames = closureAuditItems.map(item => item.name);
    return DEFAULT_CLOSURE_AUDIT_ITEMS.filter(def => !currentNames.includes(def.name));
  };

  // Scroll sync handlers
  const handleTopScroll = (e) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleTableScroll = (e) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scrollTableRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Check scroll on mount
  useEffect(() => {
    if (tableContainerRef.current) {
      const { scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollRight(scrollWidth > clientWidth);
    }
  }, [closureAuditItems]);

  // Notify assigned TFT auditors via mailto and lock item assignments
  const notifyAuditors = async () => {
    // Track indices of items to notify (before any ID changes from save)
    const indicesToNotify = new Set();
    closureAuditItems.forEach((item, idx) => {
      if (item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0) {
        indicesToNotify.add(idx);
      }
    });

    if (indicesToNotify.size === 0) {
      showError(language === 'es' ? 'No hay ítems con auditor asignado para notificar' : 'No items with assigned auditor to notify');
      return;
    }

    // Auto-save entire draft first to persist all form changes
    if (onSaveDraft) {
      try {
        await onSaveDraft();
      } catch (err) {
        showError(language === 'es' ? 'Error al guardar borrador antes de notificar' : 'Error saving draft before notifying');
        return;
      }
    }

    // Save audit items specifically to get updated IDs
    let currentItems = [...closureAuditItems];

    if (data.id) {
      try {
        const token = localStorage.getItem('token');
        const saveResponse = await axios.put(
          `http://localhost:5000/ecr/${data.id}/closure-audit-items`,
          { items: closureAuditItems },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (saveResponse.data?.items) {
          currentItems = saveResponse.data.items;
        }
      } catch (err) {
        console.error('Error auto-saving audit items before notify:', err);
        showError(language === 'es' ? 'Error guardando ítems antes de notificar' : 'Error saving items before notifying');
        return;
      }
    }

    const ecrNumber = data.ecrNumber || `ECR-${data.id}`;
    const itemsToNotify = currentItems.filter((_, idx) => indicesToNotify.has(idx));

    // Collect all unique auditor emails from assigned TFT members
    const auditorEmailSet = new Set();
    itemsToNotify.forEach(item => {
      (item.assignedAuditors || []).forEach(auditorId => {
        const member = tftMembers.find(m => m.id === auditorId);
        if (member?.email) auditorEmailSet.add(member.email);
      });
    });

    const toEmails = [...auditorEmailSet].join(';');
    if (!toEmails) {
      showError(language === 'es' ? 'Los auditores asignados no tienen correo registrado' : 'Assigned auditors do not have registered email');
      return;
    }

    const subject = `Auditoría de Cierre Pendiente — ${ecrNumber}`;
    const body = [
      `Equipo TFT,`,
      ``,
      `Tienen ${itemsToNotify.length} ítem(s) pendientes de auditoría de cierre en ${ecrNumber}:`,
      ``,
      ...itemsToNotify.map((i, idx) => {
        const itemLabel = i.name || i.itemName || `Ítem ${idx + 1}`;
        const auditorNames = (i.assignedAuditors || [])
          .map(id => { const m = tftMembers.find(m => m.id === id); return m ? `${m.firstName} ${m.lastName}` : null; })
          .filter(Boolean).join(', ');
        return `${idx + 1}. ${itemLabel}${i.checkItem ? ': ' + i.checkItem : ''}${auditorNames ? ' — Auditor(es): ' + auditorNames : ''}${i.dueDate ? ' (Vence: ' + i.dueDate + ')' : ''}`;
      }),
      ``,
      `Acceso directo: http://localhost:3000/ecr-workflow/${data.id}`,
      ``,
      `Por favor ingresen al sistema y registren su juicio de auditoría en ECR-4.`,
      ``,
      `Sistema de Calidad`
    ].join('\n');

    window.open(`mailto:${toEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

    // Mark items as notified using indices (works with new IDs after save)
    const finalItems = currentItems.map((item, idx) =>
      indicesToNotify.has(idx) ? { ...item, sentToAudit: true } : item
    );

    // Save again to persist sentToAudit flag
    if (data.id) {
      try {
        const token = localStorage.getItem('token');
        const saveResponse = await axios.put(
          `http://localhost:5000/ecr/${data.id}/closure-audit-items`,
          { items: finalItems },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (saveResponse.data?.items) {
          setClosureAuditItems(saveResponse.data.items);
        } else {
          setClosureAuditItems(finalItems);
        }
      } catch (err) {
        console.error('Error saving sentToAudit flag:', err);
        setClosureAuditItems(finalItems);
      }
    } else {
      setClosureAuditItems(finalItems);
    }

    showSuccess(`${itemsToNotify.length} ítem(s) notificados y guardados.`);
  };

  // Track if we already initialized defaults to prevent loops
  const defaultsInitializedRef = useRef(false);

  // Initialize default items when requiresClosureAudit is enabled (only once)
  useEffect(() => {
    if (
      formData.requiresClosureAudit &&
      closureAuditItems.length === 0 &&
      !data.closureAuditItems?.length &&
      !defaultsInitializedRef.current
    ) {
      defaultsInitializedRef.current = true;

      const areas = (data.impactAnalysis || []).filter(
        area => area.selectedSubsections && area.selectedSubsections.length > 0
      );

      if (areas.length === 0) {
        // No areas yet — add unkeyed defaults (visible once areas are added)
        setClosureAuditItems([...DEFAULT_CLOSURE_AUDIT_ITEMS]);
        return;
      }

      // Generate one copy of each default item per area/subsection
      let tempId = -1;
      const allItems = [];
      for (const area of areas) {
        for (const sub of area.selectedSubsections) {
          for (const template of DEFAULT_CLOSURE_AUDIT_ITEMS) {
            allItems.push({
              ...template,
              id: tempId--,
              impactAreaKey: area.areaKey,
              impactAreaName: area.areaName,
              impactSubsection: sub
            });
          }
        }
      }
      setNextClosureAuditId(tempId);
      setClosureAuditItems(allItems);
    }
  }, [formData.requiresClosureAudit, data.closureAuditItems?.length, data.impactAnalysis]);

  // Reset ref when requiresClosureAudit is disabled
  useEffect(() => {
    if (!formData.requiresClosureAudit) {
      defaultsInitializedRef.current = false;
    }
  }, [formData.requiresClosureAudit]);

  // Sync data from backend changes - ONLY on ECR load (data.id change)
  const lastSyncedIdRef = useRef(null);

  useEffect(() => {
    if (!data.id) return;

    // Only sync when loading a different ECR
    if (lastSyncedIdRef.current === data.id) return;
    lastSyncedIdRef.current = data.id;

    setFormData(prev => ({
      ...prev,
      impactVerifications: initializeVerifications(),
      ppapStatus: data.ppapStatus ? { ...data.ppapStatus, submittedDate: formatDateForInput(data.ppapStatus.submittedDate), approvedDate: formatDateForInput(data.ppapStatus.approvedDate) } : prev.ppapStatus,
      detectedRisks: data.detectedRisks || prev.detectedRisks,
      appliedImprovements: data.appliedImprovements || prev.appliedImprovements,
      closureSignatures: data.closureSignatures || prev.closureSignatures,
      closureApprovalHistory: data.closureApprovalHistory || prev.closureApprovalHistory,
      closureApprovalStatus: data.closureApprovalStatus || prev.closureApprovalStatus,
      rejectionSignatures: data.rejectionSignatures || prev.rejectionSignatures,
      rejectionReason: data.rejectionReason || prev.rejectionReason,
      effectiveDate: formatDateForInput(data.effectiveDate) || prev.effectiveDate,
      adoptionLotNumber: data.adoptionLotNumber || prev.adoptionLotNumber,
      closureNotes: data.closureNotes || prev.closureNotes,
      financialImpact: data.financialImpact || prev.financialImpact,
      requiresClosureAudit: data.requiresClosureAudit ?? prev.requiresClosureAudit,
      productionJudgment: data.productionJudgment || prev.productionJudgment,
      productionComments: data.productionComments || prev.productionComments
    }));
  }, [data.id]);

  // Update parent when data changes - include closureAuditItems
  // Skip if we just loaded items from parent to prevent loop
  // Also skip if local items are empty but parent has items (prevents overwriting on mount)
  useEffect(() => {
    if (closureItemsLoadedRef.current) {
      // Data was just loaded from parent, don't sync back yet
      return;
    }
    // Don't overwrite parent's items with empty array (race condition on mount)
    if (closureAuditItems.length === 0 && data.closureAuditItems?.length > 0) {
      return;
    }
    onDataUpdate({
      ...formData,
      closureAuditItems: closureAuditItems
    });
  }, [formData, closureAuditItems, data.closureAuditItems?.length]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVerificationChange = (areaKey, subsectionKey, field, value) => {
    setFormData(prev => {
      const currentData = prev.impactVerifications[areaKey]?.[subsectionKey] || {};

      // If changing verdict, clear the signature so it requires re-signing
      const shouldClearSignature = field === 'verdict' && currentData.verdict !== value;

      return {
        ...prev,
        impactVerifications: {
          ...prev.impactVerifications,
          [areaKey]: {
            ...prev.impactVerifications[areaKey],
            [subsectionKey]: {
              ...currentData,
              [field]: value,
              // Clear signature when verdict changes
              ...(shouldClearSignature ? {
                signedBy: null,
                signedByName: null,
                signedAt: null
              } : {})
            }
          }
        }
      };
    });
  };

  // Sign a specific area verification
  const handleSignVerification = async (areaKey, subsectionKey) => {
    const verificationData = formData.impactVerifications[areaKey]?.[subsectionKey];

    if (!verificationData?.verdict) {
      showError(language === 'es' ? 'Selecciona un juicio (Aprobado/Condicional/No Adoptable) antes de firmar' : 'Select a verdict (Approved/Conditional/Not Adoptable) before signing');
      return;
    }

    const isApproval = verificationData.verdict === 'approved';

    // Require observations for conditional or rejected verdicts
    if (!isApproval && !verificationData.observations?.trim()) {
      showError(language === 'es' ? 'Las observaciones son obligatorias para veredictos Condicional o No Adoptable' : 'Observations are required for Conditional or Not Adoptable verdicts');
      return;
    }
    const verdictLabel = verificationData.verdict === 'approved' ? 'APROBADO' :
                         verificationData.verdict === 'conditional' ? 'CONDICIONAL' : 'NO ADOPTABLE';

    const confirmMessage = isApproval
      ? ' ATENCIÓN\n\n' +
        'Al firmar esta verificación como APROBADA:\n' +
        '• Se bloqueará permanentemente y no podrá ser modificada\n' +
        '• Su firma quedará registrada como responsable de la verificación\n' +
        '• Esta acción no se puede deshacer\n\n' +
        '¿Está seguro de que desea firmar?'
      : ` ATENCIÓN\n\n` +
        `Al firmar esta verificación como ${verdictLabel}:\n` +
        '• Se guardará en el historial de revisiones\n' +
        '• El TFT quedará disponible para correcciones\n' +
        '• Podrá volver a revisar después de las correcciones\n\n' +
        '¿Está seguro de que desea firmar?';

    const confirmed = window.confirm(confirmMessage);

    if (confirmed) {
      const currentUser = getCurrentUser();
      const now = new Date().toISOString();

      // Create history entry
      const historyEntry = {
        verdict: verificationData.verdict,
        comments: verificationData.comments || '',
        observations: verificationData.observations || '',
        signedBy: currentUser.id,
        signedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        signedAt: now
      };

      // Get existing history or create new array
      const existingHistory = verificationData.history || [];

      // Build the new verification data with signature
      const newVerificationData = {
        ...verificationData,
        signedBy: currentUser.id,
        signedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        signedAt: now,
        isLocked: isApproval, // Lock only if approved
        history: [...existingHistory, historyEntry]
      };

      // Build the new impactVerifications
      const newImpactVerifications = {
        ...formData.impactVerifications,
        [areaKey]: {
          ...formData.impactVerifications[areaKey],
          [subsectionKey]: newVerificationData
        }
      };

      // Update local state
      setFormData(prev => ({
        ...prev,
        impactVerifications: newImpactVerifications
      }));

      // Save to database with the signature data
      if (onSaveDraft) {
        try {
          await onSaveDraft({ impactVerifications: newImpactVerifications });
        } catch (err) {
          console.error('Error saving signature:', err);
          showError(language === 'es' ? 'Error al guardar la firma' : 'Error saving signature');
          return;
        }
      }

      if (isApproval) {
        showSuccess(language === 'es' ? 'Verificación aprobada y bloqueada' : 'Verification approved and locked');
      } else {
        showSuccess(language === 'es' ? `Verificación marcada como ${verdictLabel.toLowerCase()} - disponible para corrección` : `Verification marked as ${verdictLabel.toLowerCase()} - available for correction`);
      }
    }
  };

  const handleEvidenceUpload = async (section, files, areaKey = null, subsectionKey = null) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingEvidence(section);
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();

      Array.from(files).forEach(file => {
        formDataUpload.append('evidence', file);
      });

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const uploadedFiles = response.data.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        if (areaKey && subsectionKey) {
          // For impact verification evidence
          handleVerificationChange(
            areaKey,
            subsectionKey,
            'evidence',
            [...formData.impactVerifications[areaKey][subsectionKey].evidence, ...uploadedFiles]
          );
        } else {
          // For other sections
          setFormData(prev => ({
            ...prev,
            [section]: [...prev[section], ...uploadedFiles]
          }));
        }

        showSuccess(language === 'es' ? `${uploadedFiles.length} archivo(s) subido(s) exitosamente` : `${uploadedFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError(language === 'es' ? 'Error al subir evidencia' : 'Error uploading evidence');
    } finally {
      setUploadingEvidence(null);
    }
  };

  const removeEvidenceFile = (section, fileIndex, areaKey = null, subsectionKey = null) => {
    if (areaKey && subsectionKey) {
      const currentEvidence = formData.impactVerifications[areaKey][subsectionKey].evidence;
      handleVerificationChange(
        areaKey,
        subsectionKey,
        'evidence',
        currentEvidence.filter((_, index) => index !== fileIndex)
      );
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: prev[section].filter((_, index) => index !== fileIndex)
      }));
    }
  };

  // Generate mailto when "No Adoptable" closure is cancelled/rejected
  const generateRejectionCancelledMailto = (rejectionNotes = '') => {
    const currentUser = getCurrentUser();
    const ecrNumber = data.ecrNumber || data.ecr_number || `ECR-${data.id}`;
    const changeTitle = data.changeTitle || '';

    // Get creator info
    const creator = users.find(u => u.id === data.createdBy);
    const creatorEmail = creator?.email;
    const creatorName = creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : '';

    // Get Review Board emails
    const reviewBoardIds = data.reviewBoard?.members || [];
    const reviewBoardEmails = reviewBoardIds
      .map(id => users.find(u => u.id === id)?.email)
      .filter(Boolean);

    // Get all approver emails
    const approverEmails = approverLevels
      .map(l => users.find(u => u.id === approvers[l.key])?.email)
      .filter(Boolean);

    // Notify creator + Review Board + approvers
    let toEmails = creatorEmail ? [creatorEmail] : [];
    let ccEmails = [...new Set([...reviewBoardEmails, ...approverEmails])];

    const subject = encodeURIComponent(`ECR ${ecrNumber} - Cierre "No Adoptable" RECHAZADO - Requiere Revisión`);
    const body = encodeURIComponent(
      `Equipo,\n\n` +
      `El cierre como "No Adoptable" del ECR "${ecrNumber} - ${changeTitle}" ha sido RECHAZADO y devuelto a borrador.\n\n` +
      `Motivo del rechazo:\n${rejectionNotes || 'Sin comentarios'}\n\n` +
      `El ECR ahora está disponible para continuar con el flujo de aprobación normal o volver a enviar como "No Adoptable".\n\n` +
      `Rechazado por: ${currentUser.firstName || ''} ${currentUser.lastName || ''}\n\n` +
      `Acceso directo: http://localhost:3000/ecr-workflow/${data.id}\n\n` +
      `Saludos`
    );

    if (toEmails.length > 0 || ccEmails.length > 0) {
      const allEmails = [...new Set([...toEmails, ...ccEmails])];
      window.open(`mailto:${allEmails.join(';')}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  // Generate mailto for closure approvals (same logic as ECR-3)
  const generateClosureMailto = (actionType, levelKey, rejectionNotes = '') => {
    const currentUser = getCurrentUser();
    const ecrNumber = data.ecrNumber || data.ecr_number || `ECR-${data.id}`;
    const changeTitle = data.changeTitle || '';

    // Get creator info
    const creator = users.find(u => u.id === data.createdBy);
    const creatorEmail = creator?.email;
    const creatorName = creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : '';

    // Get Review Board emails
    const reviewBoardIds = data.reviewBoard?.members || [];
    const reviewBoardEmails = reviewBoardIds
      .map(id => users.find(u => u.id === id)?.email)
      .filter(Boolean);

    // Get all approver emails
    const approverEmails = approverLevels
      .map(l => users.find(u => u.id === approvers[l.key])?.email)
      .filter(Boolean);

    let toEmails = [];
    let ccEmails = [];
    let subject = '';
    let body = '';

    if (actionType === 'approved') {
      // Find next approver
      const levelIndex = approverLevels.findIndex(l => l.key === levelKey);
      const nextLevel = approverLevels[levelIndex + 1];

      if (nextLevel) {
        // Next approver exists
        const nextApprover = users.find(u => u.id === approvers[nextLevel.key]);
        if (nextApprover?.email) {
          toEmails = [nextApprover.email];
          subject = encodeURIComponent(`ECR ${ecrNumber} - Pendiente de tu Firma de Cierre`);
          body = encodeURIComponent(
            `Hola ${nextApprover.firstName || ''},\n\n` +
            `El ECR "${ecrNumber} - ${changeTitle}" ha sido firmado en el nivel anterior y ahora está pendiente de tu firma de cierre.\n\n` +
            `Por favor revisa y firma en el sistema.\n\n` +
            `Saludos`
          );
        }
      } else {
        // Last approval - notify everyone
        toEmails = [...new Set([...approverEmails, ...reviewBoardEmails])];
        if (creatorEmail) toEmails.push(creatorEmail);
        toEmails = [...new Set(toEmails)];

        subject = encodeURIComponent(`ECR ${ecrNumber} - CERRADO Completamente`);
        body = encodeURIComponent(
          `Equipo,\n\n` +
          `El ECR "${ecrNumber} - ${changeTitle}" ha sido CERRADO completamente con todas las firmas requeridas.\n\n` +
          `El cambio ha sido formalmente adoptado.\n\n` +
          `Saludos`
        );
      }
    } else {
      // Rejected - notify creator + Review Board
      toEmails = creatorEmail ? [creatorEmail] : [];
      ccEmails = [...new Set([...reviewBoardEmails, ...approverEmails])];

      subject = encodeURIComponent(`ECR ${ecrNumber} - Cierre Devuelto para Correcciones`);
      body = encodeURIComponent(
        `Hola ${creatorName || ''},\n\n` +
        `El cierre del ECR "${ecrNumber} - ${changeTitle}" ha sido devuelto para correcciones.\n\n` +
        `Motivo:\n${rejectionNotes}\n\n` +
        `Por favor realiza las correcciones necesarias.\n\n` +
        `Saludos`
      );
    }

    if (toEmails.length > 0) {
      let mailtoLink = `mailto:${toEmails.join(';')}?subject=${subject}&body=${body}`;
      if (ccEmails.length > 0) {
        mailtoLink = `mailto:${toEmails.join(';')}?cc=${ccEmails.join(';')}&subject=${subject}&body=${body}`;
      }
      window.open(mailtoLink, '_blank');
    }
  };

  // Send closure for approval - changes status from draft to pending
  const handleSendForClosureApproval = async () => {
    const isClosingAsRejected = data.closureType === 'rejected';

    // Check stage completion first
    if (!data.stageCompletionStatus?.ecr4?.completed) {
      showError(language === 'es' ? 'Debes marcar la etapa ECR-4 como completada antes de enviar a aprobación' : 'You must mark ECR-4 stage as complete before submitting for approval');
      return;
    }

    // If closing as rejected, require rejection reason
    if (isClosingAsRejected && !formData.rejectionReason?.trim()) {
      showError(language === 'es' ? 'Debes proporcionar un motivo para cerrar como No Adoptable' : 'You must provide a reason to close as Not Adoptable');
      return;
    }

    // Validate before sending - SKIP validations if closing as rejected
    if (!isClosingAsRejected) {
      const validationStatus = getClosureValidationStatus();
      if (!validationStatus.canApprove) {
        showError(`No se puede enviar a aprobación:\n${validationStatus.errors.slice(0, 5).join('\n')}${validationStatus.errors.length > 5 ? `\n...y ${validationStatus.errors.length - 5} más` : ''}`);
        return;
      }
    }

    const confirmMessage = isClosingAsRejected
      ? '¿Estás seguro de que quieres enviar el ECR para CIERRE COMO NO ADOPTABLE?\n\nLos aprobadores deberán confirmar la decisión.'
      : '¿Estás seguro de que quieres enviar el cierre a aprobación?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const currentUser = getCurrentUser();
    const ecrNumber = data.ecrNumber || data.ecr_number || `ECR-${data.id}`;
    const changeTitle = data.changeTitle || '';

    // Call backend endpoint to submit for closure approval
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/closure-submit`,
        {
          closureType: isClosingAsRejected ? 'rejected' : 'approved',
          rejectionReason: isClosingAsRejected ? formData.rejectionReason : ''
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update local state with backend response (including signatures which may be cleared if type changed)
        const updatedSignatures = response.data.closureSignatures || formData.closureSignatures;
        setFormData(prev => ({
          ...prev,
          closureApprovalStatus: response.data.closureApprovalStatus,
          closureApprovalHistory: response.data.closureApprovalHistory,
          closureSignatures: updatedSignatures
        }));

        showSuccess(isClosingAsRejected ? 'ECR enviado para cierre como No Adoptable' : 'Cierre enviado a aprobación');

        // Generate mailto to first UNSIGNED approver (supports re-send after rejection)
        // Use updated signatures from response to determine first unsigned level
        const firstUnsignedLevel = approverLevels.find(level =>
          !updatedSignatures[level.key]?.signedBy
        );

        if (firstUnsignedLevel) {
          const targetApprover = users.find(u => u.id === approvers[firstUnsignedLevel.key]);
          const levelNumber = firstUnsignedLevel.key.replace('level', '');

          if (targetApprover?.email) {
            const isResubmit = approverLevels.some(l => formData.closureSignatures[l.key]?.signedBy);
            const subjectType = isClosingAsRejected ? 'CIERRE COMO NO ADOPTABLE' : 'Cierre';
            const subject = encodeURIComponent(
              `ECR ${ecrNumber} - ${subjectType} Pendiente de Firma (Nivel ${levelNumber})` +
              (isResubmit ? ' [RE-ENVÍO]' : '')
            );
            const body = encodeURIComponent(
              `Hola ${targetApprover.firstName || ''},\n\n` +
              `El ECR "${ecrNumber} - ${changeTitle}" ${isResubmit ? 'ha sido corregido y re-enviado' : 'ha sido enviado'} para ${isClosingAsRejected ? 'CIERRE COMO NO ADOPTABLE' : 'cierre'} y está pendiente de tu firma.\n\n` +
              (isClosingAsRejected ? `Motivo: ${formData.rejectionReason}\n\n` : '') +
              `Por favor revisa y firma en el sistema.\n\n` +
              `Enviado por: ${currentUser.firstName || ''} ${currentUser.lastName || ''}\n\n` +
              `Saludos`
            );
            window.open(`mailto:${targetApprover.email}?subject=${subject}&body=${body}`, '_blank');
          }
        }

        // Reload to show new status
        window.location.reload();
      }
    } catch (error) {
      console.error('Error submitting closure for approval:', error);
      const errorMsg = error.response?.data?.message || 'Error al enviar a aprobación';
      showError(errorMsg);
    }
  };

  const handleSignClosure = async (levelKey, action = 'approved', comments = '') => {
    const isRejection = action === 'rejected';
    const levelNumber = levelKey.replace('level', '');

    try {
      const token = localStorage.getItem('token');
      const endpoint = isRejection ? 'closure-reject' : 'closure-approve';

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/${endpoint}`,
        { level: levelKey, comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update local state with backend response
        setFormData(prev => ({
          ...prev,
          closureSignatures: response.data.closureSignatures,
          closureApprovalHistory: response.data.closureApprovalHistory,
          closureApprovalStatus: response.data.closureApprovalStatus
        }));

        if (isRejection) {
          showSuccess(language === 'es' ? `Cierre devuelto por Nivel ${levelNumber}. Hacer correcciones y re-enviar.` : `Closure returned by Level ${levelNumber}. Make corrections and re-submit.`);
          generateClosureMailto('rejected', levelKey, comments);
          window.location.reload();
        } else {
          const allSigned = response.data.allSigned;
          showSuccess(allSigned ? (language === 'es' ? 'ECR completamente cerrado' : 'ECR fully closed') : (language === 'es' ? 'Nivel aprobado exitosamente' : 'Level approved successfully'));
          generateClosureMailto('approved', levelKey, comments);
          if (allSigned) {
            window.location.reload();
          }
        }
      }
    } catch (error) {
      console.error(`Error ${isRejection ? 'rejecting' : 'approving'} closure:`, error);
      const errorMsg = error.response?.data?.message || (language === 'es' ? `Error al ${isRejection ? 'rechazar' : 'aprobar'} el cierre` : `Error ${isRejection ? 'rejecting' : 'approving'} closure`);
      showError(errorMsg);
    }
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
  };

  const canSignClosure = (levelKey) => {
    const currentUser = getCurrentUser();
    const assignedApproverId = approvers[levelKey];

    // Check if already signed
    if (formData.closureSignatures[levelKey]?.signedBy) return false;

    // Admins can sign for any approver
    const userIsAdmin = isAdmin || isUserAdmin(currentUser);

    // Check if current user is the assigned approver OR is admin
    if (currentUser.id !== assignedApproverId && !userIsAdmin) return false;

    // Check if previous levels are signed (if applicable)
    const levelIndex = approverLevels.findIndex(l => l.key === levelKey);
    for (let i = 0; i < levelIndex; i++) {
      const prevLevelKey = approverLevels[i].key;
      if (!formData.closureSignatures[prevLevelKey]?.signedBy) return false;
    }

    return true;
  };

  // Validation function to check if all sections are ready for closure approval
  const getClosureValidationStatus = () => {
    const errors = [];

    // 0. Check required fields for closure (check both formData and saved data)
    const savedEffectiveDate = data.effectiveDate;
    const savedAdoptionLot = data.adoptionLotNumber;

    if (!savedEffectiveDate && !formData.effectiveDate) {
      errors.push('Falta: Fecha Efectiva de Adopción');
    } else if (!savedEffectiveDate && formData.effectiveDate) {
      errors.push('Fecha Efectiva de Adopción: Guarda los cambios primero');
    }

    if (!savedAdoptionLot && !formData.adoptionLotNumber) {
      errors.push('Falta: No. de Lote/Unidad de Adopción');
    } else if (!savedAdoptionLot && formData.adoptionLotNumber) {
      errors.push('No. de Lote/Unidad: Guarda los cambios primero');
    }

    // 0b. Check stage completion
    if (!data.stageCompletionStatus?.ecr4?.completed) {
      errors.push('Etapa ECR-4 no está marcada como completada');
    }

    // 1. Check Impact Verifications (TFT) - all must be 'approved' or 'conditional' and signed
    const impactAreas = data.impactAnalysis || [];
    for (const area of impactAreas) {
      const areaKey = area.areaKey || area.id;
      const areaName = area.areaName || area.name || areaKey;
      // Use selectedSubsections which contains the actual selected items
      const selectedSubs = area.selectedSubsections || [];

      for (const subKey of selectedSubs) {
        const verification = formData.impactVerifications?.[areaKey]?.[subKey];

        if (!verification?.verdict) {
          errors.push(`TFT "${areaName} - ${subKey}": Sin veredicto`);
        } else if (verification.verdict === 'rejected') {
          errors.push(`TFT "${areaName} - ${subKey}": No Adoptable — Debe cerrar ECR como "No Adoptable"`);
        } else if (verification.verdict !== 'approved' && verification.verdict !== 'conditional') {
          errors.push(`TFT "${areaName} - ${subKey}": No aprobada`);
        } else if (!verification?.signedBy) {
          errors.push(`TFT "${areaName} - ${subKey}": No firmada`);
        } else if (verification.verdict === 'conditional' && !verification?.observations?.trim()) {
          errors.push(`TFT "${areaName} - ${subKey}": Condicional requiere observaciones`);
        }
      }
    }

    // 2. Check Production Results - requires judgment
    if (!formData.productionJudgment || formData.productionJudgment === '') {
      errors.push('Producción: Falta Juicio de Resultados');
    } else if (formData.productionJudgment.toUpperCase() === 'NOK') {
      errors.push('Producción: Juicio es NOK — Debe cerrar como "No Adoptable"');
    } else if (formData.productionJudgment.toUpperCase() === 'CONDITIONAL' || formData.productionJudgment.toUpperCase() === 'CONDICIONAL') {
      if (!formData.productionComments || formData.productionComments.trim() === '') {
        errors.push('Producción: Juicio Condicional requiere comentarios explicativos');
      }
    }

    // 3. Check Audit Items (always check if there are items, regardless of requiresClosureAudit flag)
    if (closureAuditItems && closureAuditItems.length > 0) {
      const pendingAudits = closureAuditItems.filter(item => !item.auditorCompleted);
      // Check both leaderJudgment and auditorJudgment for NOK
      const nokAudits = closureAuditItems.filter(item =>
        (item.leaderJudgment && item.leaderJudgment.toUpperCase() === 'NOK') ||
        (item.auditorJudgment && item.auditorJudgment.toUpperCase() === 'NOK')
      );

      if (pendingAudits.length > 0) {
        errors.push(`Auditoría: ${pendingAudits.length} item(s) pendiente(s)`);
      }
      if (nokAudits.length > 0) {
        errors.push(`Auditoría: ${nokAudits.length} item(s) con NOK`);
      }
    }

    // Note: Closure signatures are NOT validated here because they come AFTER
    // sending to approval, not before. The approval flow handles signature validation.

    return {
      canApprove: errors.length === 0,
      errors
    };
  };

  const isFullyCompleted = approverLevels.length > 0 && approverLevels.every(
    level => formData.closureSignatures[level.key]?.signedBy
  );

  // UNIFIED: Use closureSignatures for both flows (matching backend behavior)
  const isFullyRejected = approverLevels.length > 0 && approverLevels.every(
    level => formData.closureSignatures[level.key]?.signedBy
  ) && data.closureType === 'rejected';

  // Check if user can sign rejection - UNIFIED to use closureSignatures
  const canSignRejection = (levelKey) => {
    const currentUser = getCurrentUser();
    const assignedApproverId = approvers[levelKey];

    // Check if already signed - use closureSignatures
    if (formData.closureSignatures[levelKey]?.signedBy) return false;

    // Admins can sign for any approver
    const userIsAdmin = isAdmin || isUserAdmin(currentUser);

    // Check if current user is the assigned approver OR is admin
    if (currentUser.id !== assignedApproverId && !userIsAdmin) return false;

    // Check if previous levels are signed (if applicable) - use closureSignatures
    const levelIndex = approverLevels.findIndex(l => l.key === levelKey);
    for (let i = 0; i < levelIndex; i++) {
      const prevLevelKey = approverLevels[i].key;
      if (!formData.closureSignatures[prevLevelKey]?.signedBy) return false;
    }

    return true;
  };

  // Handle signing rejection (approve the rejection or reject it)
  const handleSignRejection = async (levelKey, action = 'approved') => {
    const currentUser = getCurrentUser();
    const assignedApproverId = approvers[levelKey];
    const userIsAdmin = isAdmin || isUserAdmin(currentUser);

    if (!currentUser) {
      showError(language === 'es' ? 'No se pudo obtener información del usuario' : 'Could not get user information');
      return;
    }

    const isRejectingRejection = action === 'rejected';
    let rejectionNotes = '';

    if (isRejectingRejection) {
      rejectionNotes = window.prompt(language === 'es' ? 'Ingrese el motivo por el cual este ECR SÍ puede ser adoptado (ej: hay presupuesto disponible, se encontró solución técnica, etc.):' : 'Enter the reason why this ECR CAN be adopted (e.g.: budget available, technical solution found, etc.):');
      if (!rejectionNotes) {
        showError(language === 'es' ? 'Debe ingresar un motivo' : 'You must enter a reason');
        return;
      }
    }

    const confirmMessage = isRejectingRejection
      ? (language === 'es'
        ? ' ATENCIÓN\n\n' +
          'Al devolver a revisión:\n' +
          '• El ECR volverá a estado borrador\n' +
          '• Se guardará su comentario sobre por qué SÍ se puede adoptar\n' +
          '• El flujo de aprobación normal podrá continuar\n\n' +
          '¿Está seguro de que desea devolver este ECR a revisión?'
        : ' WARNING\n\n' +
          'By returning to review:\n' +
          '• The ECR will return to draft status\n' +
          '• Your comment on why it CAN be adopted will be saved\n' +
          '• The normal approval flow can continue\n\n' +
          'Are you sure you want to return this ECR to review?')
      : (language === 'es'
        ? ' ATENCIÓN\n\n' +
          'Al confirmar el rechazo:\n' +
          '• Su firma quedará registrada permanentemente\n' +
          '• Esta acción confirma que el ECR debe cerrarse como NO ADOPTABLE\n\n' +
          '¿Está seguro de que desea confirmar el RECHAZO de este ECR?'
        : ' WARNING\n\n' +
          'By confirming the rejection:\n' +
          '• Your signature will be permanently recorded\n' +
          '• This action confirms that the ECR must be closed as NOT ADOPTABLE\n\n' +
          'Are you sure you want to confirm the REJECTION of this ECR?');

    const confirmed = window.confirm(confirmMessage);

    if (confirmed) {
      const now = new Date().toISOString();
      const assignedUser = users.find(u => u.id === assignedApproverId);

      // Add to approval history
      const historyEntry = {
        action: isRejectingRejection ? 'rejection_cancelled' : 'rejection_approved',
        userId: currentUser.id,
        userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        timestamp: now,
        level: levelKey,
        notes: isRejectingRejection ? rejectionNotes : `Rechazo ${levelKey} confirmado`,
        onBehalfOf: userIsAdmin && currentUser.id !== assignedApproverId
          ? `${assignedUser?.firstName || ''} ${assignedUser?.lastName || ''}`.trim()
          : null
      };

      const newHistory = [...(data.closureApprovalHistory || []), historyEntry];

      if (isRejectingRejection) {
        // Cancel rejection: clear signatures, closureType, rejectionReason and set status back to draft
        // UNIFIED: Use closureSignatures (matching backend)
        const cancelData = {
          closureSignatures: {},
          closureApprovalHistory: newHistory,
          status: 'draft',
          closureType: null,
          closureApprovalStatus: 'draft',
          rejectionReason: ''
        };

        setFormData(prev => ({
          ...prev,
          ...cancelData
        }));

        try {
          const token = localStorage.getItem('token');
          await axios.put(`http://localhost:5000/ecr/reports/${data.id}`, cancelData, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Generate mailto to notify team about rejection cancellation
          generateRejectionCancelledMailto(rejectionNotes);

          showSuccess(language === 'es' ? 'ECR devuelto a borrador - Se puede continuar con el flujo de aprobación' : 'ECR returned to draft - Approval flow can continue');
          window.location.reload();
        } catch (error) {
          console.error('Error cancelling rejection:', error);
          showError(language === 'es' ? 'Error al cancelar el rechazo' : 'Error cancelling rejection');
        }
      } else {
        // Sign the rejection - Use the same /closure-approve endpoint as normal flow
        // The backend handles both flows correctly based on closure_type
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `http://localhost:5000/ecr/${data.id}/closure-approve`,
            {
              level: levelKey,
              comments: `Confirmado No Adoptable - ${levelKey}`
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success) {
            // Update local state with backend response
            setFormData(prev => ({
              ...prev,
              closureSignatures: response.data.closureSignatures,
              closureApprovalHistory: response.data.closureApprovalHistory,
              closureApprovalStatus: response.data.closureApprovalStatus
            }));

            // Check if all levels are now signed
            const allSigned = approverLevels.every(
              level => response.data.closureSignatures[level.key]?.signedBy
            );

            if (allSigned) {
              showSuccess(language === 'es' ? 'ECR cerrado como NO ADOPTABLE definitivamente' : 'ECR closed as NOT ADOPTABLE permanently');
              window.location.reload();
            } else {
              showSuccess(language === 'es' ? 'Nivel confirmado - No Adoptable' : 'Level confirmed - Not Adoptable');
              // Notify next approver
              generateClosureMailto('approved', levelKey);
            }
          }
        } catch (error) {
          console.error('Error signing rejection:', error);
          showError(language === 'es' ? 'Error al firmar: ' + (error.response?.data?.message || 'Error desconocido') : 'Error signing: ' + (error.response?.data?.message || 'Unknown error'));
        }
      }
    }
  };

  // Legacy function - keeping for backwards compatibility
  const handleCloseAsRejected = async () => {
    const reason = window.prompt(
      ' CERRAR ECR COMO NO ADOPTABLE\n\n' +
      'Esta acción cerrará definitivamente el ECR como NO ADOPTABLE.\n' +
      'El ECR no podrá ser modificado después de esta acción.\n\n' +
      'Ingrese el motivo del rechazo definitivo:'
    );

    if (!reason) {
      return; // User cancelled or empty reason
    }

    const confirmed = window.confirm(
      ' CONFIRMAR CIERRE DEFINITIVO\n\n' +
      `Motivo: "${reason}"\n\n` +
      'Una vez cerrado como No Adoptable, el ECR NO podrá ser reabierto.\n' +
      '¿Está seguro de que desea CERRAR DEFINITIVAMENTE este ECR como NO ADOPTABLE?'
    );

    if (confirmed) {
      const currentUser = getCurrentUser();
      const now = new Date().toISOString();

      const historyEntry = {
        action: 'closed_rejected',
        userId: currentUser.id,
        userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        timestamp: now,
        level: null,
        notes: reason
      };

      const closeData = {
        status: 'closed_rejected',
        closureApprovalHistory: [...(data.closureApprovalHistory || []), historyEntry],
        closedAt: now,
        closedBy: currentUser.id,
        closedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        closureReason: reason
      };

      try {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:5000/ecr/reports/${data.id}`, closeData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccess(language === 'es' ? 'ECR cerrado definitivamente como No Adoptable' : 'ECR closed permanently as Not Adoptable');
        window.location.reload();
      } catch (error) {
        console.error('Error closing ECR as rejected:', error);
        showError(language === 'es' ? 'Error al cerrar el ECR' : 'Error closing the ECR');
      }
    }
  };

  // Handle PPAP status changes
  const handlePPAPStatusChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ppapStatus: {
        ...prev.ppapStatus,
        [field]: value
      }
    }));
  };

  // Handle PPAP evidence upload
  const handlePPAPEvidenceUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingEvidence('ppapEvidence');
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();

      Array.from(files).forEach(file => {
        formDataUpload.append('evidence', file);
      });

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const uploadedFiles = response.data.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        setFormData(prev => ({
          ...prev,
          ppapStatus: {
            ...prev.ppapStatus,
            evidence: [...prev.ppapStatus.evidence, ...uploadedFiles]
          }
        }));

        showSuccess(language === 'es' ? `${uploadedFiles.length} archivo(s) subido(s) exitosamente` : `${uploadedFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading PPAP evidence:', error);
      showError(language === 'es' ? 'Error al subir evidencia de PPAP' : 'Error uploading PPAP evidence');
    } finally {
      setUploadingEvidence(null);
    }
  };

  const removePPAPEvidence = (fileIndex) => {
    setFormData(prev => ({
      ...prev,
      ppapStatus: {
        ...prev.ppapStatus,
        evidence: prev.ppapStatus.evidence.filter((_, index) => index !== fileIndex)
      }
    }));
  };

  // Financial Impact handlers
  const financialImpactTypes = language === 'es' ? [
    { value: 'scrap', label: 'Scrap', icon: '', isExpense: true },
    { value: 'investment', label: 'Inversión', icon: '', isExpense: true },
    { value: 'overtime', label: 'Tiempo Extra', icon: '', isExpense: true },
    { value: 'rework', label: 'Retrabajo', icon: '', isExpense: true },
    { value: 'logistics', label: 'Logística/Flete', icon: '', isExpense: true },
    { value: 'other_expense', label: 'Otros Gastos', icon: '', isExpense: true },
    { value: 'savings', label: 'Ahorro', icon: '', isExpense: false }
  ] : [
    { value: 'scrap', label: 'Scrap', icon: '', isExpense: true },
    { value: 'investment', label: 'Investment', icon: '', isExpense: true },
    { value: 'overtime', label: 'Overtime', icon: '', isExpense: true },
    { value: 'rework', label: 'Rework', icon: '', isExpense: true },
    { value: 'logistics', label: 'Logistics/Freight', icon: '', isExpense: true },
    { value: 'other_expense', label: 'Other Expenses', icon: '', isExpense: true },
    { value: 'savings', label: 'Savings', icon: '', isExpense: false }
  ];

  const addFinancialItem = () => {
    setFormData(prev => {
      const newItems = [...(prev.financialImpact?.items || []), {
        id: Date.now(),
        type: 'scrap',
        description: '',
        amount: 0
      }];
      return {
        ...prev,
        financialImpact: {
          ...prev.financialImpact,
          items: newItems,
          ...calculateFinancialTotals(newItems)
        }
      };
    });
  };

  const updateFinancialItem = (itemId, field, value) => {
    setFormData(prev => {
      const newItems = (prev.financialImpact?.items || []).map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
      return {
        ...prev,
        financialImpact: {
          ...prev.financialImpact,
          items: newItems,
          ...calculateFinancialTotals(newItems)
        }
      };
    });
  };

  const removeFinancialItem = (itemId) => {
    setFormData(prev => {
      const newItems = (prev.financialImpact?.items || []).filter(item => item.id !== itemId);
      return {
        ...prev,
        financialImpact: {
          ...prev.financialImpact,
          items: newItems,
          ...calculateFinancialTotals(newItems)
        }
      };
    });
  };

  const calculateFinancialTotals = (items) => {
    let totalCost = 0;
    let totalSavings = 0;

    items.forEach(item => {
      const typeInfo = financialImpactTypes.find(t => t.value === item.type);
      const amount = parseFloat(item.amount) || 0;
      if (typeInfo?.isExpense) {
        totalCost += amount;
      } else {
        totalSavings += amount;
      }
    });

    return {
      totalCost,
      totalSavings,
      netImpact: totalCost - totalSavings
    };
  };

  // Get subsection label from area data
  const getSubsectionLabel = (areaKey, subsectionKey) => {
    const area = impactAnalysis.find(a => a.areaKey === areaKey);
    if (!area) return subsectionKey;

    const subsection = area.customSubsections?.find(s => s.key === subsectionKey);
    if (subsection) return subsection.label;

    // Check in predefined subsections (if area has them)
    // This assumes the area might have subsections array
    return subsectionKey;
  };

  // Filter areas that have selected subsections
  const impactedAreas = impactAnalysis.filter(area =>
    area.selectedSubsections && area.selectedSubsections.length > 0
  );

  // Permission helpers
  const currentUser = getCurrentUser();
  const isTFTLeader = isAdmin || currentUser?.id === data.reviewBoard?.primary?.id;
  const isAssignedToItem = (item) =>
    isAdmin || (item.assignedAuditors || []).includes(currentUser?.id);

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: t.warningBg,
          border: `1px solid ${t.warningBorder}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ color: t.warningFg, fontWeight: '500' }}>
            {tr('ecr.messages.readOnlyMode')}
          </span>
        </div>
      )}

      <div style={{
        pointerEvents: isReadOnly ? 'none' : 'auto',
        opacity: isReadOnly ? 0.7 : 1
      }}>
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-4: {tr('ecr.closure.title')}</h2>
        <p style={styles.subtitle}>
          {language === 'es' ? 'Verificación de que las TFT de impacto identificadas no presentaron afectaciones' : 'Verification that the identified impact TFTs did not present any affectations'}
        </p>
      </div>

      {/* 1. Verificación de TFT de Impacto (Dynamic from ECR-2B) */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{language === 'es' ? '1. Verificación de TFT de Impacto' : '1. Impact TFT Verification'}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Verifica cada TFT y subsección identificada en ECR-2B. Confirma que no hubo afectación y proporciona evidencia.' : 'Verify each TFT and subsection identified in ECR-2B. Confirm there was no impact and provide evidence.'}
        </p>

        {impactedAreas.length === 0 ? (
          <div style={styles.emptyState}>
            <p>{language === 'es' ? 'No hay TFT de impacto seleccionadas en ECR-2B' : 'No impact TFTs selected in ECR-2B'}</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: t.textMuted }}>
              {language === 'es' ? 'Regresa a ECR-2B y selecciona las TFT afectadas' : 'Go back to ECR-2B and select the affected TFTs'}
            </p>
          </div>
        ) : (
          impactedAreas.map(area => (
            <div key={area.areaKey} style={styles.areaCard}>
              <h4 style={{ ...styles.areaTitle, color: area.color || t.accent }}>
                <span style={{ fontSize: '20px', marginRight: '8px' }}>{area.icon}</span>
                {area.areaName}
              </h4>

              {area.selectedSubsections.map(subsectionKey => {
                const verificationData = formData.impactVerifications[area.areaKey]?.[subsectionKey] || {
                  verdict: '',
                  observations: '',
                  evidence: [],
                  signedBy: null,
                  signedByName: '',
                  signedAt: null,
                  isLocked: false
                };

                // Only lock if verdict is 'approved' AND signed - rejected/conditional stay editable
                // Also unlock if ECR was rejected (allows corrections)
                const isSubsectionLocked = verificationData.verdict === 'approved' && verificationData.signedBy && !isEcrRejected;

                return (
                  <div key={subsectionKey} style={{
                    ...styles.subsectionCard,
                    backgroundColor: isSubsectionLocked ? t.successBg : t.bg,
                    border: isSubsectionLocked ? `1px solid ${t.successBorder}` : `1px solid ${t.border}`
                  }}>
                    {/* Subsection Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h5 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>
                        {getSubsectionLabel(area.areaKey, subsectionKey)}
                      </h5>
                      {isSubsectionLocked && (
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: t.successBg,
                          color: t.successFg,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                           {language === 'es' ? 'Firmado' : 'Signed'}
                        </span>
                      )}
                    </div>

                    {/* Verdict Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={styles.label}>{language === 'es' ? 'Juicio de Verificación' : 'Verification Judgment'} *</label>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: verificationData.verdict === 'approved' ? t.successBg : t.bgCard,
                          border: `2px solid ${verificationData.verdict === 'approved' ? t.successBorder : t.border}`,
                          borderRadius: '8px',
                          cursor: isSubsectionLocked ? 'default' : 'pointer',
                          opacity: isSubsectionLocked ? 0.8 : 1
                        }}>
                          <input
                            type="radio"
                            name={`verdict-${area.areaKey}-${subsectionKey}`}
                            checked={verificationData.verdict === 'approved'}
                            onChange={() => handleVerificationChange(area.areaKey, subsectionKey, 'verdict', 'approved')}
                            disabled={isSubsectionLocked}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: t.successFg, fontWeight: '600' }}> {language === 'es' ? 'Aprobado' : 'Approved'}</span>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: verificationData.verdict === 'conditional' ? t.warningBg : t.bgCard,
                          border: `2px solid ${verificationData.verdict === 'conditional' ? t.warningBorder : t.border}`,
                          borderRadius: '8px',
                          cursor: isSubsectionLocked ? 'default' : 'pointer',
                          opacity: isSubsectionLocked ? 0.8 : 1
                        }}>
                          <input
                            type="radio"
                            name={`verdict-${area.areaKey}-${subsectionKey}`}
                            checked={verificationData.verdict === 'conditional'}
                            onChange={() => handleVerificationChange(area.areaKey, subsectionKey, 'verdict', 'conditional')}
                            disabled={isSubsectionLocked}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: t.warningFg, fontWeight: '600' }}> {language === 'es' ? 'Condicional' : 'Conditional'}</span>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: verificationData.verdict === 'rejected' ? t.errorBg : t.bgCard,
                          border: `2px solid ${verificationData.verdict === 'rejected' ? t.errorBorder : t.border}`,
                          borderRadius: '8px',
                          cursor: isSubsectionLocked ? 'default' : 'pointer',
                          opacity: isSubsectionLocked ? 0.8 : 1
                        }}>
                          <input
                            type="radio"
                            name={`verdict-${area.areaKey}-${subsectionKey}`}
                            checked={verificationData.verdict === 'rejected'}
                            onChange={() => handleVerificationChange(area.areaKey, subsectionKey, 'verdict', 'rejected')}
                            disabled={isSubsectionLocked}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: t.errorFg, fontWeight: '600' }}> {language === 'es' ? 'No Adoptable' : 'Not Adoptable'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Observations */}
                    <div style={styles.field}>
                      <label style={styles.label}>{language === 'es' ? 'Observaciones / Resultados' : 'Observations / Results'}</label>
                      <textarea
                        style={{ ...styles.textarea, backgroundColor: isSubsectionLocked ? t.bg : t.bgCard }}
                        value={verificationData.observations}
                        onChange={(e) => handleVerificationChange(area.areaKey, subsectionKey, 'observations', e.target.value)}
                        placeholder={language === 'es' ? 'Describe los resultados de la verificación...' : 'Describe the verification results...'}
                        rows={3}
                        disabled={isSubsectionLocked}
                      />
                    </div>

                    {/* Evidence */}
                    <div style={styles.evidenceSection}>
                      <label style={styles.label}>{language === 'es' ? 'Evidencia de Verificación' : 'Verification Evidence'}</label>
                      {!isSubsectionLocked && (
                        <>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleEvidenceUpload('verification', e.target.files, area.areaKey, subsectionKey)}
                            style={styles.fileInput}
                            disabled={uploadingEvidence === 'verification' || !data.id}
                          />
                          {!data.id && (
                            <p style={styles.hint}> {language === 'es' ? 'Guarda el ECR primero para poder subir evidencia' : 'Save the ECR first to upload evidence'}</p>
                          )}
                        </>
                      )}
                      {verificationData.evidence?.length > 0 && (
                        <div style={styles.fileList}>
                          {verificationData.evidence.map((file, idx) => (
                            <div key={idx} style={styles.fileItem}>
                              <a href={`http://localhost:5000${file.url}`} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
                                 {file.name}
                              </a>
                              {!isSubsectionLocked && (
                                <button onClick={() => removeEvidenceFile('verification', idx, area.areaKey, subsectionKey)} style={styles.removeFileButton}>
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Verification History */}
                    {verificationData.history && verificationData.history.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '8px',
                        border: '2px solid #C77700'
                      }}>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                          {language === 'es' ? 'Historial de Revisiones' : 'Revision History'} ({verificationData.history.length})
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {verificationData.history.map((entry, idx) => (
                            <div key={idx} style={{
                              padding: '10px',
                              backgroundColor: entry.verdict === 'rejected' ? '#fee2e2' :
                                               entry.verdict === 'conditional' ? '#fef9c3' : '#d1fae5',
                              borderRadius: '6px',
                              border: `1px solid ${entry.verdict === 'rejected' ? '#fca5a5' :
                                                   entry.verdict === 'conditional' ? '#fcd34d' : '#86efac'}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: entry.verdict === 'rejected' ? '#B00020' :
                                         entry.verdict === 'conditional' ? '#ca8a04' : '#16a34a'
                                }}>
                                  {entry.verdict === 'rejected' ? (language === 'es' ? 'No Adoptable' : 'Not Adoptable') :
                                   entry.verdict === 'conditional' ? (language === 'es' ? 'Condicional' : 'Conditional') : (language === 'es' ? 'Aprobado' : 'Approved')}
                                </span>
                                <span style={{ fontSize: '11px', color: t.textMuted }}>
                                  {new Date(entry.signedAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}
                                </span>
                              </div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: t.text }}>
                                <strong>{language === 'es' ? 'Por:' : 'By:'}</strong> {entry.signedByName}
                              </p>
                              {entry.observations && (
                                <p style={{ margin: '4px 0', fontSize: '12px', color: t.textMuted }}>
                                  <strong>{language === 'es' ? 'Observaciones:' : 'Observations:'}</strong> {entry.observations}
                                </p>
                              )}
                              {entry.comments && (
                                <p style={{ margin: 0, fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                                  <strong>{language === 'es' ? 'Comentarios:' : 'Comments:'}</strong> "{entry.comments}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signature Section */}
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      backgroundColor: isSubsectionLocked ? '#d1fae5' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${isSubsectionLocked ? '#2E7D32' : '#C77700'}`
                    }}>
                      {isSubsectionLocked ? (
                        <div>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
                             Verificación Firmada
                          </h5>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#065f46' }}>
                            <strong>{language === 'es' ? 'Firmado por:' : 'Signed by:'}</strong> {verificationData.signedByName}
                          </p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#065f46' }}>
                            <strong>{language === 'es' ? 'Fecha:' : 'Date:'}</strong> {new Date(verificationData.signedAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}
                          </p>
                        </div>
                      ) : (() => {
                        const needsComment = verificationData.verdict && verificationData.verdict !== 'approved' && !verificationData.observations?.trim();
                        const canSign = verificationData.verdict && !needsComment;
                        return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                                 Firma del Responsable
                              </h5>
                              <p style={{ margin: 0, fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>
                                Solo el dueño del proceso debe firmar esta verificación
                              </p>
                            </div>
                            <button
                              onClick={() => handleSignVerification(area.areaKey, subsectionKey)}
                              disabled={!canSign}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: canSign ? '#2E7D32' : t.border,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: canSign ? 'pointer' : 'not-allowed'
                              }}
                            >
                               {language === 'es' ? 'Firmar Verificación' : 'Sign Verification'}
                            </button>
                          </div>
                          {needsComment && (
                            <p style={{ margin: 0, fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                              {language === 'es' ? 'Las observaciones son obligatorias para veredictos Condicional o No Adoptable' : 'Observations are required for Conditional or Not Adoptable verdicts'}
                            </p>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* 2. Lecciones Aprendidas */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>2. {tr('ecr.closure.lessonsLearned')}</span>
        </h3>

        <div style={styles.field}>
          <label style={styles.label}>{language === 'es' ? 'Riesgos Detectados' : 'Detected Risks'}</label>
          <textarea
            style={styles.textarea}
            value={formData.detectedRisks}
            onChange={(e) => handleInputChange('detectedRisks', e.target.value)}
            placeholder={language === 'es' ? 'Riesgos que se detectaron durante la implementación y que no fueron anticipados...' : 'Risks detected during implementation that were not anticipated...'}
            rows={4}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>{language === 'es' ? 'Mejoras Aplicadas' : 'Applied Improvements'}</label>
          <textarea
            style={styles.textarea}
            value={formData.appliedImprovements}
            onChange={(e) => handleInputChange('appliedImprovements', e.target.value)}
            placeholder={language === 'es' ? 'Mejoras implementadas durante el proceso que pueden replicarse en futuros ECRs...' : 'Improvements implemented during the process that can be replicated in future ECRs...'}
            rows={4}
          />
        </div>
      </div>

      {/* 3B. Estado PPAP */}
      <div style={{
        ...styles.section,
        backgroundColor: formData.ppapStatus.level === 'full' || formData.ppapStatus.level === 'partial' ? '#fef3c7' : t.bg,
        border: formData.ppapStatus.level === 'full' || formData.ppapStatus.level === 'partial' ? '2px solid #C77700' : `1px solid ${t.border}`
      }}>
        <h3 style={styles.sectionTitle}>
          <span style={{
            ...styles.badge,
            backgroundColor: formData.ppapStatus.level ? '#C77700' : t.accent
          }}>
            3. {language === 'es' ? 'Estado PPAP' : 'PPAP Status'}
          </span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Estado del Production Part Approval Process requerido por el cliente' : 'Production Part Approval Process status required by the customer'}
        </p>

        <div style={styles.field}>
          <label style={styles.label}>{language === 'es' ? 'Nivel de PPAP Requerido' : 'Required PPAP Level'} *</label>
          <select
            style={styles.select}
            value={formData.ppapStatus.level}
            onChange={(e) => handlePPAPStatusChange('level', e.target.value)}
          >
            <option value="">{language === 'es' ? 'Seleccionar nivel...' : 'Select level...'}</option>
            <option value="not_required"> {language === 'es' ? 'No Requerido' : 'Not Required'}</option>
            <option value="partial"> {language === 'es' ? 'PPAP Parcial (Documentos selectos)' : 'Partial PPAP (Selected documents)'}</option>
            <option value="full"> {language === 'es' ? 'PPAP Completo (Todos los elementos)' : 'Full PPAP (All elements)'}</option>
          </select>
        </div>

        {(formData.ppapStatus.level === 'partial' || formData.ppapStatus.level === 'full') && (
          <>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>{language === 'es' ? 'Fecha de Envío al Cliente' : 'Customer Submission Date'}</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.ppapStatus.submittedDate}
                  onChange={(e) => handlePPAPStatusChange('submittedDate', e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{language === 'es' ? 'Fecha de Aprobación del Cliente' : 'Customer Approval Date'}</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.ppapStatus.approvedDate}
                  onChange={(e) => handlePPAPStatusChange('approvedDate', e.target.value)}
                />
              </div>
            </div>

            {/* PPAP Evidence Upload */}
            <div style={styles.evidenceSection}>
              <label style={styles.label}>{language === 'es' ? 'Evidencia de PPAP' : 'PPAP Evidence'}</label>
              <p style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 8px 0' }}>
                {language === 'es' ? 'Subir documentos PPAP: PSW firmado, documentación de cliente, etc.' : 'Upload PPAP documents: signed PSW, customer documentation, etc.'}
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handlePPAPEvidenceUpload(e.target.files)}
                style={styles.fileInput}
                disabled={uploadingEvidence === 'ppapEvidence' || !data.id}
              />
              {!data.id && (
                <p style={styles.hint}>{language === 'es' ? ' Guarda el ECR primero para poder subir evidencia' : ' Save the ECR first to upload evidence'}</p>
              )}
              {uploadingEvidence === 'ppapEvidence' && (
                <p style={{ fontSize: '13px', color: t.accent, margin: '4px 0 0 0' }}>
                  {language === 'es' ? 'Subiendo archivos...' : 'Uploading files...'}
                </p>
              )}

              {formData.ppapStatus.evidence.length > 0 && (
                <div style={styles.fileList}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: t.text, margin: '0 0 8px 0' }}>
                    {language === 'es' ? 'Archivos adjuntos:' : 'Attached files:'}
                  </p>
                  {formData.ppapStatus.evidence.map((file, idx) => (
                    <div key={idx} style={styles.fileItem}>
                      <a
                        href={`http://localhost:5000${file.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.fileLink}
                      >
                         {file.name}
                      </a>
                      <button
                        onClick={() => removePPAPEvidence(idx)}
                        style={styles.removeFileButton}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formData.ppapStatus.level === 'full' && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #C77700',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0, fontWeight: '600' }}>
                   {language === 'es' ? 'Full PPAP requerido - Asegurar que todos los elementos PPAP estén completos' : 'Full PPAP required - Ensure all PPAP elements are complete'}
                </p>
              </div>
            )}

            {!formData.ppapStatus.approvedDate && formData.ppapStatus.submittedDate && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#dbeafe',
                border: `1px solid ${t.accent}`,
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: t.text, margin: 0, fontWeight: '600' }}>
                  {language === 'es' ? 'ℹ PPAP enviado - Esperando aprobación del cliente' : 'ℹ PPAP submitted - Awaiting customer approval'}
                </p>
              </div>
            )}

            {formData.ppapStatus.approvedDate && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#d1fae5',
                border: '1px solid #2E7D32',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: '#065f46', margin: 0, fontWeight: '600' }}>
                   {language === 'es' ? 'PPAP aprobado por el cliente' : 'PPAP approved by customer'}
                </p>
              </div>
            )}
          </>
        )}

        {formData.ppapStatus.level === 'not_required' && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: '6px'
          }}>
            <p style={{ fontSize: '14px', color: t.text, margin: 0 }}>
              {language === 'es' ? 'ℹ Este cambio no requiere PPAP según los requerimientos del cliente' : 'ℹ This change does not require PPAP per customer requirements'}
            </p>
          </div>
        )}
      </div>

      {/* 3C. Resultados de Producción */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={{ ...styles.badge, backgroundColor: t.accent }}>{language === 'es' ? '3C. Resultados de Producción' : '3C. Production Results'}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Métricas de calidad del proceso post-cambio' : 'Post-change process quality metrics'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>

          {/* ISIR / First Article */}
          <div>
            <label style={styles.label}>ISIR / First Article</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              {(language === 'es' ? ['Aprobado', 'No Adoptable', 'Pendiente', 'N/A'] : ['Approved', 'Not Adoptable', 'Pending', 'N/A']).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="isirFirstArticle"
                    value={opt}
                    checked={formData.isirFirstArticle === opt}
                    onChange={e => setFormData(prev => ({ ...prev, isirFirstArticle: e.target.value }))}
                    disabled={isLocked}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Scrap Inicial */}
          <div>
            <label style={styles.label}>{language === 'es' ? 'Scrap Inicial (%)' : 'Initial Scrap (%)'}</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.initialScrap}
              onChange={e => setFormData(prev => ({ ...prev, initialScrap: e.target.value }))}
              disabled={isLocked}
              placeholder={language === 'es' ? 'Ej: 2.5' : 'Ex: 2.5'}
              style={{ ...styles.input, width: '100%' }}
            />
          </div>

          {/* Estabilidad de Proceso */}
          <div>
            <label style={styles.label}>{language === 'es' ? 'Estabilidad de Proceso (%)' : 'Process Stability (%)'}</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.processStability}
              onChange={e => setFormData(prev => ({ ...prev, processStability: e.target.value }))}
              disabled={isLocked}
              placeholder={language === 'es' ? 'Ej: 95.0' : 'Ex: 95.0'}
              style={{ ...styles.input, width: '100%' }}
            />
          </div>

          {/* CP Post-Cambio */}
          <div>
            <label style={styles.label}>
              {language === 'es' ? 'CP Post-Cambio' : 'Post-Change CP'}
              {formData.cpPostChange !== '' && (() => {
                const val = parseFloat(formData.cpPostChange);
                const target = qualityTargets.cpTarget;
                const color = val >= target ? '#166534' : val >= 1.0 ? '#92400e' : '#991b1b';
                const label = val >= target ? (language === 'es' ? '✓ Capaz' : '✓ Capable') : val >= 1.0 ? (language === 'es' ? '⚠ Marginal' : '⚠ Marginal') : (language === 'es' ? '✗ No capaz' : '✗ Not capable');
                return <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color }}>{label}</span>;
              })()}
            </label>
            <input
              type="number" min="0" step="0.001"
              value={formData.cpPostChange}
              onChange={e => setFormData(prev => ({ ...prev, cpPostChange: e.target.value }))}
              disabled={isLocked}
              placeholder={language === 'es' ? 'Ej: 1.45' : 'Ex: 1.45'}
              style={{
                ...styles.input, width: '100%',
                borderColor: formData.cpPostChange !== '' ? (parseFloat(formData.cpPostChange) >= qualityTargets.cpTarget ? '#166534' : parseFloat(formData.cpPostChange) >= 1.0 ? '#C77700' : '#991b1b') : t.border
              }}
            />
            <p style={{ fontSize: '10px', color: t.textDim, margin: '4px 0 0' }}>{language === 'es' ? 'Meta' : 'Target'}: ≥ {qualityTargets.cpTarget}</p>
          </div>

          {/* CPK Post-Cambio */}
          <div>
            <label style={styles.label}>
              {language === 'es' ? 'CPK Post-Cambio' : 'Post-Change CPK'}
              {formData.cpkPostChange !== '' && (() => {
                const val = parseFloat(formData.cpkPostChange);
                const target = qualityTargets.cpkTarget;
                const color = val >= target ? '#166534' : val >= 1.0 ? '#92400e' : '#991b1b';
                const label = val >= target ? (language === 'es' ? '✓ Capaz' : '✓ Capable') : val >= 1.0 ? (language === 'es' ? '⚠ Marginal' : '⚠ Marginal') : (language === 'es' ? '✗ No capaz' : '✗ Not capable');
                return <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color }}>{label}</span>;
              })()}
            </label>
            <input
              type="number" min="0" step="0.001"
              value={formData.cpkPostChange}
              onChange={e => setFormData(prev => ({ ...prev, cpkPostChange: e.target.value }))}
              disabled={isLocked}
              placeholder={language === 'es' ? 'Ej: 1.45' : 'Ex: 1.45'}
              style={{
                ...styles.input, width: '100%',
                borderColor: formData.cpkPostChange !== '' ? (parseFloat(formData.cpkPostChange) >= qualityTargets.cpkTarget ? '#166534' : parseFloat(formData.cpkPostChange) >= 1.0 ? '#C77700' : '#991b1b') : t.border
              }}
            />
            <p style={{ fontSize: '10px', color: t.textDim, margin: '4px 0 0' }}>{language === 'es' ? 'Meta' : 'Target'}: ≥ {qualityTargets.cpkTarget}</p>
          </div>

        </div>

        {/* Juicio de Producción */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: formData.productionJudgment === 'OK' ? t.successBg :
                          formData.productionJudgment === 'Condicional' ? t.warningBg :
                          formData.productionJudgment === 'NOK' ? t.errorBg : t.bgPanel,
          border: `2px solid ${formData.productionJudgment === 'OK' ? t.successBorder :
                              formData.productionJudgment === 'Condicional' ? t.warningBorder :
                              formData.productionJudgment === 'NOK' ? t.errorBorder : t.border}`,
          borderRadius: '8px'
        }}>
          <label style={{ ...styles.label, fontWeight: '600', marginBottom: '12px', display: 'block' }}>
            {language === 'es' ? 'Juicio de Resultados de Producción *' : 'Production Results Judgment *'}
          </label>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            {['OK', 'Condicional', 'NOK'].map(opt => (
              <label key={opt} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: formData.productionJudgment === opt ? (
                  opt === 'OK' ? t.success : opt === 'Condicional' ? t.warning : t.error
                ) : t.bgCard,
                color: formData.productionJudgment === opt ? 'white' : t.text,
                borderRadius: '6px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                border: `1px solid ${opt === 'OK' ? t.successBorder : opt === 'Condicional' ? t.warningBorder : t.errorBorder}`,
                fontWeight: '600',
                fontSize: '14px'
              }}>
                <input
                  type="radio"
                  name="productionJudgment"
                  value={opt}
                  checked={formData.productionJudgment === opt}
                  onChange={e => setFormData(prev => ({ ...prev, productionJudgment: e.target.value }))}
                  disabled={isLocked}
                  style={{ display: 'none' }}
                />
                {opt === 'OK' ? '✓ ' : opt === 'Condicional' ? '⚠ ' : '✗ '}{opt === 'Condicional' ? (language === 'es' ? 'Condicional' : 'Conditional') : opt}
              </label>
            ))}
          </div>

          {/* Comentarios - obligatorio si es Condicional */}
          <div>
            <label style={styles.label}>
              {language === 'es' ? 'Comentarios' : 'Comments'} {formData.productionJudgment === 'Condicional' && <span style={{ color: t.errorFg }}>*</span>}
            </label>
            <textarea
              value={formData.productionComments}
              onChange={e => setFormData(prev => ({ ...prev, productionComments: e.target.value }))}
              disabled={isLocked}
              placeholder={formData.productionJudgment === 'Condicional' ?
                (language === 'es' ? 'Obligatorio: Justifica las condiciones bajo las cuales se acepta...' : 'Required: Justify the conditions under which it is accepted...') :
                (language === 'es' ? 'Observaciones adicionales sobre los resultados de producción...' : 'Additional observations about production results...')}
              rows={3}
              style={{
                ...styles.input,
                width: '100%',
                resize: 'vertical',
                borderColor: formData.productionJudgment === 'Condicional' && !formData.productionComments?.trim() ? t.errorBorder : t.border
              }}
            />
          </div>

          {/* Evidencia de Resultados de Producción */}
          <div style={{ marginTop: '16px' }}>
            <label style={styles.label}>
               Evidencia de Resultados (Archivos de Soporte)
            </label>
            <div style={{
              padding: '12px',
              backgroundColor: t.successBg,
              border: `1px solid ${t.successBorder}`,
              borderRadius: '8px'
            }}>
              {/* Upload Button */}
              {!isLocked && data.id && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#166534',
                    fontWeight: '500'
                  }}>
                    {language === 'es' ? '+ Agregar Archivo' : '+ Add File'}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.csv"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;

                        for (const file of files) {
                          try {
                            const token = localStorage.getItem('token');
                            const uploadFormData = new FormData();
                            uploadFormData.append('evidence', file);

                            const response = await axios.post(
                              `http://localhost:5000/ecr/${data.id}/upload-evidence`,
                              uploadFormData,
                              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
                            );

                            if (response.data.success && response.data.files) {
                              const uploadedFile = response.data.files[0];
                              setFormData(prev => ({
                                ...prev,
                                productionEvidence: [...(prev.productionEvidence || []), {
                                  name: uploadedFile.originalName,
                                  url: uploadedFile.url,
                                  uploadedAt: new Date().toISOString()
                                }]
                              }));
                              showSuccess(`Archivo "${uploadedFile.originalName}" subido correctamente`);
                            }
                          } catch (err) {
                            console.error('Error uploading file:', err);
                            showError(language === 'es' ? 'Error al subir archivo' : 'Error uploading file');
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {!data.id && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                      Guarda el ECR primero para poder subir archivos
                    </p>
                  )}
                </div>
              )}

              {/* File List */}
              {formData.productionEvidence && formData.productionEvidence.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {formData.productionEvidence.map((file, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}>
                      <a
                        href={`http://localhost:5000${file.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', fontSize: '13px', textDecoration: 'none' }}
                      >
                         {file.name}
                      </a>
                      {!isLocked && (
                        <button
                          onClick={() => {
                            if (window.confirm(language === 'es' ? `¿Eliminar "${file.name}"?` : `Delete "${file.name}"?`)) {
                              setFormData(prev => ({
                                ...prev,
                                productionEvidence: prev.productionEvidence.filter((_, i) => i !== idx)
                              }));
                            }
                          }}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                  {language === 'es' ? 'Sin archivos de evidencia adjuntos' : 'No evidence files attached'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Cierre Formal */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>4. {language === 'es' ? 'Cierre Formal' : 'Formal Closure'}</span>
        </h3>

        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #C77700',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
            <strong>{language === 'es' ? 'Campos obligatorios:' : 'Required fields:'}</strong> {language === 'es' ? 'Estos datos son requeridos para enviar el ECR a aprobación.' : 'This data is required to submit the ECR for approval.'}
          </p>
        </div>

        {/* Closure Audit Toggle */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: t.text
            }}>
              <input
                type="checkbox"
                checked={formData.requiresClosureAudit || false}
                onChange={(e) => handleInputChange('requiresClosureAudit', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
               {language === 'es' ? '¿Requiere auditoría para cerrar?' : 'Requires audit to close?'}
            </label>
            <span style={{ fontSize: '12px', color: t.textDim }}>
              {language === 'es' ? '(Si activas esta opción, podrás definir items a auditar antes del cierre)' : '(If you enable this option, you can define items to audit before closing)'}
            </span>
          </div>
        </div>

        {/* Closure Audit - Grouped by Impact Areas */}
        {formData.requiresClosureAudit && (
          <div style={{
            padding: '16px',
            backgroundColor: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: t.text }}>
                 {language === 'es' ? 'Checklist de Auditoría por TFT de Impacto' : 'Audit Checklist by Impact TFT'}
              </h4>

              {/* Selection Mode Controls */}
              {closureAuditItems.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {auditSelectionMode ? (
                    <>
                      <button
                        onClick={toggleSelectAllAuditItems}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          border: '1px solid #a5b4fc',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedAuditItems.size === closureAuditItems.length
                          ? (language === 'es' ? '☐ Deseleccionar Todo' : '☐ Deselect All')
                          : (language === 'es' ? '☑ Seleccionar Todo' : '☑ Select All')}
                      </button>
                      <button
                        onClick={deleteSelectedAuditItems}
                        disabled={selectedAuditItems.size === 0}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: selectedAuditItems.size > 0 ? '#fee2e2' : '#f3f4f6',
                          color: selectedAuditItems.size > 0 ? '#991b1b' : '#9ca3af',
                          border: `1px solid ${selectedAuditItems.size > 0 ? '#fca5a5' : '#d1d5db'}`,
                          borderRadius: '4px',
                          cursor: selectedAuditItems.size > 0 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        🗑 {language === 'es' ? 'Eliminar' : 'Delete'} ({selectedAuditItems.size})
                      </button>
                      <button
                        onClick={exitAuditSelectionMode}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ {language === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setAuditSelectionMode(true)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fcd34d',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✎ Modo Edición
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Impact Areas from ECR-2B */}
            {impactedAreas.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: t.textDim,
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #C77700',
                marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                   No hay TFT de impacto definidas en ECR-2B. Define las TFT de impacto primero.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {/* Flatten areas with their subsections */}
                {impactedAreas.flatMap(area =>
                  (area.selectedSubsections || []).map(subsection => ({
                    ...area,
                    subsection: subsection
                  }))
                ).map(areaWithSub => {
                  const areaKey = `${areaWithSub.areaKey}_${areaWithSub.subsection}`;
                  const areaItems = closureAuditItems.filter(item =>
                    item.impactAreaKey === areaWithSub.areaKey && item.impactSubsection === areaWithSub.subsection
                  );
                  const isExpanded = expandedAreas[areaKey] !== false; // Default expanded

                  return (
                    <div key={areaKey} style={{
                      marginBottom: '12px',
                      backgroundColor: t.bgCard,
                      borderRadius: '8px',
                      border: `1px solid ${t.border}`,
                      overflow: 'hidden'
                    }}>
                      {/* Area Header */}
                      <div
                        style={{
                          padding: '12px 16px',
                          backgroundColor: t.bg,
                          borderBottom: isExpanded ? `1px solid ${t.border}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleAreaExpansion(areaKey)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{areaWithSub.icon}</span>
                          <div>
                            <strong style={{ fontSize: '14px', color: t.text }}>{areaWithSub.areaName}</strong>
                            <span style={{ fontSize: '13px', color: t.textMuted, marginLeft: '8px' }}>- {areaWithSub.subsection}</span>
                          </div>
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: areaItems.length > 0 ? '#dbeafe' : '#f1f5f9',
                            color: areaItems.length > 0 ? t.text : t.textDim,
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {areaItems.length} items
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddItemModal({ areaKey: areaWithSub.areaKey, areaName: areaWithSub.areaName, subsection: areaWithSub.subsection });
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: t.accent,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {language === 'es' ? '+ Agregar Item' : '+ Add Item'}
                          </button>
                          <span style={{ fontSize: '16px', color: t.textDim }}>
                            {isExpanded ? '▼' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Area Items - Full D7-style table */}
                      {isExpanded && areaItems.length > 0 && (
                        <div style={{ padding: '12px', overflowX: 'auto' }}>
                          <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f1f5f9' }}>
                                {auditSelectionMode && (
                                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '40px' }}>
                                    <input
                                      type="checkbox"
                                      checked={areaItems.every(item => selectedAuditItems.has(item.id))}
                                      onChange={() => {
                                        const allSelected = areaItems.every(item => selectedAuditItems.has(item.id));
                                        setSelectedAuditItems(prev => {
                                          const newSet = new Set(prev);
                                          areaItems.forEach(item => {
                                            if (allSelected) {
                                              newSet.delete(item.id);
                                            } else {
                                              newSet.add(item.id);
                                            }
                                          });
                                          return newSet;
                                        });
                                      }}
                                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                  </th>
                                )}
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', width: '120px', whiteSpace: 'nowrap' }}>Item</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '150px' }}>{language === 'es' ? '¿Qué verificar?' : 'What to verify?'}</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>{language === 'es' ? 'Archivos' : 'Files'}</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '120px' }}>{language === 'es' ? 'Comentarios' : 'Comments'}</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>{language === 'es' ? 'Fecha Límite' : 'Deadline'}</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', width: '130px' }}>{language === 'es' ? 'Auditores' : 'Auditors'}</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>{language === 'es' ? 'Verificado por' : 'Verified by'}</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '70px' }}>{language === 'es' ? 'Estado' : 'Status'}</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '80px', backgroundColor: '#dbeafe' }}>{language === 'es' ? 'Juicio Líder' : 'Leader Judgment'}</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '120px', backgroundColor: '#fef3c7' }}>{language === 'es' ? 'Hallazgos Auditor' : 'Auditor Findings'}</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>{language === 'es' ? 'Acciones' : 'Actions'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {areaItems.map((item, idx) => (
                                <tr key={`${item.id}-${idx}`} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: auditSelectionMode && selectedAuditItems.has(item.id) ? '#fef3c7' : (item.sentToAudit ? '#fffbeb' : t.bgCard) }}>
                                  {/* Selection Checkbox */}
                                  {auditSelectionMode && (
                                    <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={selectedAuditItems.has(item.id)}
                                        onChange={() => toggleAuditItemSelection(item.id)}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                      />
                                    </td>
                                  )}
                                  {/* Item Name with Round Badge */}
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <strong>{item.icon} {item.name}</strong>
                                      {item.auditRound > 1 && (
                                        <span style={{ padding: '1px 5px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '9px', fontWeight: '600', color: '#92400e' }}>
                                          R{item.auditRound}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Check Item */}
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <textarea
                                      value={item.checkItem || ''}
                                      onChange={(e) => updateClosureAuditItem(item.id, 'checkItem', e.target.value)}
                                      placeholder="¿Qué debe verificar el auditor?"
                                      disabled={!isTFTLeader || (item.sentToAudit && item.auditorCompleted)}
                                      rows={2}
                                      style={{ width: '100%', padding: '6px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', resize: 'vertical' }}
                                    />
                                  </td>

                                  {/* Files */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                      {(item.files || []).map((file, idx) => (
                                        <a key={idx} href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#2563eb' }}>
                                           {file.fileName?.substring(0, 15)}...
                                        </a>
                                      ))}
                                      {!item.auditorCompleted && data.id && (
                                        <label style={{ cursor: 'pointer', padding: '4px 8px', backgroundColor: '#e0e7ff', borderRadius: '4px', fontSize: '10px', color: '#4338ca' }}>
                                          + Archivo
                                          <input type="file" style={{ display: 'none' }} onChange={(e) => {
                                            if (e.target.files[0]) uploadClosureAuditItemFile(item.id, e.target.files[0]);
                                          }} />
                                        </label>
                                      )}
                                      {!data.id && <span style={{ fontSize: '9px', color: t.textDim }}>Guarda ECR primero</span>}
                                    </div>
                                  </td>

                                  {/* Leader Comments */}
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <textarea
                                      value={item.comments || ''}
                                      onChange={(e) => updateClosureAuditItem(item.id, 'comments', e.target.value)}
                                      placeholder={language === 'es' ? 'Comentarios del líder' : 'Leader comments'}
                                      disabled={!isTFTLeader || item.auditorCompleted}
                                      rows={2}
                                      style={{ width: '100%', padding: '6px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', resize: 'vertical' }}
                                    />
                                  </td>

                                  {/* Due Date */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    <input
                                      type="date"
                                      value={item.dueDate || ''}
                                      onChange={(e) => updateClosureAuditItem(item.id, 'dueDate', e.target.value)}
                                      disabled={!isTFTLeader || (item.sentToAudit && item.auditorCompleted)}
                                      style={{ padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', width: '100%' }}
                                    />
                                    {item.dueDate && item.dueDate < new Date().toISOString().split('T')[0] && !item.auditorCompleted && (
                                      <span style={{ fontSize: '9px', color: '#B00020', display: 'block', marginTop: '2px' }}> {language === 'es' ? 'Vencido' : 'Overdue'}</span>
                                    )}
                                  </td>

                                  {/* Auditors — TFT members only, leader/admin can always reassign */}
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    {isTFTLeader ? (
                                      // Leader can assign from TFT members
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {(item.assignedAuditorsInfo || []).map(a => (
                                          <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 6px', backgroundColor: '#dbeafe', borderRadius: '10px', fontSize: '10px' }}>
                                            {a.firstName || a.name?.split(' ')[0]}
                                            <button type="button" onClick={() => {
                                              const newIds = (item.assignedAuditors || []).filter(id => id !== a.id);
                                              const newInfo = (item.assignedAuditorsInfo || []).filter(info => info.id !== a.id);
                                              updateClosureAuditItemMultiple(item.id, { assignedAuditors: newIds, assignedAuditorsInfo: newInfo });
                                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '10px', color: '#B00020' }}>×</button>
                                          </span>
                                        ))}
                                        {tftMembers.length > 0 && (
                                          <select
                                            value=""
                                            onChange={(e) => {
                                              if (!e.target.value) return;
                                              const memberId = parseInt(e.target.value);
                                              const member = tftMembers.find(m => m.id === memberId);
                                              if (member && !(item.assignedAuditors || []).includes(memberId)) {
                                                updateClosureAuditItemMultiple(item.id, {
                                                  assignedAuditors: [...(item.assignedAuditors || []), memberId],
                                                  assignedAuditorsInfo: [...(item.assignedAuditorsInfo || []), {
                                                    id: member.id,
                                                    name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
                                                    firstName: member.firstName,
                                                    email: member.email
                                                  }]
                                                });
                                              }
                                            }}
                                            style={{ padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '10px' }}
                                          >
                                            <option value="">+ Auditor TFT</option>
                                            {tftMembers.filter(m => !(item.assignedAuditors || []).includes(m.id)).map((m, mIdx) => (
                                              <option key={`${m.id}-${mIdx}`} value={m.id}>{m.firstName} {m.lastName?.charAt(0)}.</option>
                                            ))}
                                          </select>
                                        )}
                                        {tftMembers.length === 0 && (
                                          <span style={{ fontSize: '10px', color: t.textDim }}>Sin miembros TFT</span>
                                        )}
                                      </div>
                                    ) : (
                                      // Non-leader: read-only
                                      <span style={{ fontSize: '11px', color: t.textDim }}>
                                        {(item.assignedAuditorsInfo || []).map(a => a.firstName || a.name?.split(' ')[0]).join(', ') || '-'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Verified By (Auditor who completed the audit) */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    {item.auditorCompleted && item.auditedByName ? (
                                      <div style={{ fontSize: '10px' }}>
                                        <div style={{ fontWeight: '600' }}>{item.auditedByName}</div>
                                        {item.verificationDate && (
                                          <div style={{ color: t.textDim, fontSize: '9px' }}>
                                            {new Date(item.verificationDate).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    ) : item.sentToAudit ? (
                                      <span style={{ fontSize: '10px', color: t.textDim }}>{language === 'es' ? 'Pendiente' : 'Pending'}</span>
                                    ) : (
                                      <span style={{ fontSize: '10px', color: t.textDim }}>-</span>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '10px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      backgroundColor: item.auditorCompleted ? '#dcfce7' : item.sentToAudit ? '#fef3c7' : '#f1f5f9',
                                      color: item.auditorCompleted ? '#166534' : item.sentToAudit ? '#92400e' : t.textDim
                                    }}>
                                      {item.auditorCompleted ? (language === 'es' ? ' Auditado' : ' Audited') : item.sentToAudit ? (language === 'es' ? ' Enviado' : ' Sent') : (language === 'es' ? ' Pendiente' : ' Pending')}
                                    </span>
                                  </td>

                                  {/* Leader Judgment */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                                    <select
                                      value={item.leaderJudgment || ''}
                                      onChange={(e) => {
                                        const currentUser = getCurrentUser();
                                        const judgment = e.target.value;
                                        updateClosureAuditItemMultiple(item.id, {
                                          leaderJudgment: judgment,
                                          leaderJudgmentBy: judgment ? currentUser.id : null,
                                          leaderJudgmentByName: judgment ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : null,
                                          leaderJudgmentAt: judgment ? new Date().toISOString() : null
                                        });
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        border: `1px solid ${t.border}`,
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        backgroundColor: item.leaderJudgment === 'OK' ? '#dcfce7' : item.leaderJudgment === 'NOK' ? '#fee2e2' : item.leaderJudgment === 'OBS' ? '#fef3c7' : item.leaderJudgment === 'NA' ? t.bgPanel : t.bgCard,
                                        color: item.leaderJudgment === 'OK' ? '#166534' : item.leaderJudgment === 'NOK' ? '#991b1b' : item.leaderJudgment === 'OBS' ? '#92400e' : t.textMuted
                                      }}
                                    >
                                      <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                                      <option value="OK"> OK</option>
                                      <option value="NOK"> NOK</option>
                                      <option value="OBS"> OBS</option>
                                      <option value="NA">— N/A</option>
                                    </select>
                                    {item.leaderJudgmentByName && (
                                      <div style={{ fontSize: '9px', color: t.textDim, marginTop: '4px' }}>
                                        {item.leaderJudgmentByName}
                                      </div>
                                    )}
                                  </td>

                                  {/* Auditor Findings — editable only by assigned auditor */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', backgroundColor: '#fffbeb' }}>
                                    {item.sentToAudit && isAssignedToItem(item) && !item.auditorCompleted ? (
                                      // Assigned auditor can fill judgment + comments
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <select
                                          value={item.auditorJudgment || ''}
                                          onChange={(e) => updateClosureAuditItem(item.id, 'auditorJudgment', e.target.value)}
                                          style={{
                                            padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                                            backgroundColor: item.auditorJudgment === 'OK' ? '#dcfce7' : item.auditorJudgment === 'NOK' ? '#fee2e2' : item.auditorJudgment === 'OBS' ? '#fef3c7' : t.bgCard,
                                            color: item.auditorJudgment === 'OK' ? '#166534' : item.auditorJudgment === 'NOK' ? '#991b1b' : item.auditorJudgment === 'OBS' ? '#92400e' : t.text
                                          }}
                                        >
                                          <option value="">Juicio...</option>
                                          <option value="OK"> OK</option>
                                          <option value="NOK"> NOK</option>
                                          <option value="OBS"> OBS</option>
                                          <option value="NA">— N/A</option>
                                        </select>
                                        <textarea
                                          value={item.auditorComments || ''}
                                          onChange={(e) => updateClosureAuditItem(item.id, 'auditorComments', e.target.value)}
                                          placeholder={language === 'es' ? 'Hallazgos del auditor...' : 'Auditor findings...'}
                                          rows={2}
                                          style={{ width: '100%', padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '10px', resize: 'vertical' }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
                                          <input
                                            type="checkbox"
                                            checked={item.auditorCompleted || false}
                                            onChange={(e) => {
                                              const currentUser = getCurrentUser();
                                              const isCompleted = e.target.checked;
                                              updateClosureAuditItemMultiple(item.id, {
                                                auditorCompleted: isCompleted,
                                                auditedById: isCompleted ? currentUser.id : null,
                                                auditedByName: isCompleted ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '',
                                                verificationDate: isCompleted ? new Date().toISOString() : null
                                              });
                                            }}
                                          />
                                          {language === 'es' ? 'Marcar completado' : 'Mark completed'}
                                        </label>
                                      </div>
                                    ) : item.auditorCompleted ? (
                                      <div>
                                        {item.auditorJudgment && (
                                          <span style={{
                                            display: 'inline-block', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', marginBottom: '4px',
                                            backgroundColor: item.auditorJudgment === 'OK' ? t.successBg : item.auditorJudgment === 'NOK' ? t.errorBg : t.warningBg,
                                            color: item.auditorJudgment === 'OK' ? t.successFg : item.auditorJudgment === 'NOK' ? t.errorFg : t.warningFg
                                          }}>
                                            {item.auditorJudgment}
                                          </span>
                                        )}
                                        <div style={{ fontSize: '10px', color: t.textDim, marginTop: '4px' }}>
                                          {item.auditorComments || 'Sin comentarios'}
                                        </div>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '10px', color: t.textDim, fontStyle: 'italic' }}>
                                        {item.sentToAudit ? (language === 'es' ? 'Esperando auditor...' : 'Waiting for auditor...') : (language === 'es' ? 'Notificar para habilitar' : 'Notify to enable')}
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                      {/* Historial - siempre visible si hay rondas */}
                                      {item.auditRound > 1 && (
                                        <button
                                          onClick={() => openHistoryModal(item)}
                                          style={{ padding: '3px 8px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title={language === 'es' ? 'Ver historial de rondas' : 'View round history'}
                                        >
                                          {language === 'es' ? 'Historial' : 'History'}
                                        </button>
                                      )}
                                      {/* Re-enviar: TFT líder, enviado, con NOK/OBS en cualquier juicio */}
                                      {isTFTLeader && item.sentToAudit && !item.auditorCompleted &&
                                        (['NOK', 'OBS'].includes(item.leaderJudgment) || ['NOK', 'OBS'].includes(item.auditorJudgment)) && (
                                        <button
                                          onClick={() => resendClosureAuditItem(item)}
                                          style={{ padding: '3px 8px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title={language === 'es' ? `Re-enviar a ronda ${(item.auditRound || 1) + 1}` : `Re-send to round ${(item.auditRound || 1) + 1}`}
                                        >
                                          ↻ {language === 'es' ? 'Ronda' : 'Round'} {(item.auditRound || 1) + 1}
                                        </button>
                                      )}
                                      {/* Revertir completado: solo admin */}
                                      {isAdmin && item.auditorCompleted && (
                                        <button
                                          onClick={async () => {
                                            const reason = window.prompt(language === 'es' ? 'Motivo del revert (requerido):' : 'Revert reason (required):');
                                            if (!reason?.trim()) return;
                                            try {
                                              const token = localStorage.getItem('token');
                                              const response = await axios.post(
                                                `http://localhost:5000/ecr/${data.id}/closure-audit-items/${item.id}/revert`,
                                                { reason: reason.trim() },
                                                { headers: { Authorization: `Bearer ${token}` } }
                                              );
                                              if (response.data.success) {
                                                updateClosureAuditItem(item.id, 'auditorCompleted', false);
                                              }
                                            } catch (err) {
                                              showError(language === 'es' ? 'Error al revertir el ítem' : 'Error reverting item');
                                            }
                                          }}
                                          style={{ padding: '3px 8px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title={language === 'es' ? 'Revertir a pendiente (admin)' : 'Revert to pending (admin)'}
                                        >
                                          ↩ {language === 'es' ? 'Revertir' : 'Revert'}
                                        </button>
                                      )}
                                      {/* Duplicar / Eliminar: solo si no enviado y es líder */}
                                      {isTFTLeader && !item.sentToAudit && (
                                        <button
                                          onClick={() => duplicateClosureAuditItem(item)}
                                          style={{ padding: '3px 8px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title={language === 'es' ? 'Duplicar ítem' : 'Duplicate item'}
                                        >
                                          + {language === 'es' ? 'Fila' : 'Row'}
                                        </button>
                                      )}
                                      {isTFTLeader && !item.sentToAudit && (
                                        <button
                                          onClick={() => deleteClosureAuditItem(item.id)}
                                          style={{ padding: '3px 8px', backgroundColor: t.error, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title={language === 'es' ? 'Eliminar ítem' : 'Delete item'}
                                        >
                                          {language === 'es' ? 'Eliminar' : 'Delete'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Empty state for area */}
                      {isExpanded && areaItems.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: t.textDim, fontSize: '13px' }}>
                          {language === 'es' ? 'Sin items. Click en "+ Agregar Item" para definir qué auditar.' : 'No items. Click "+ Add Item" to define what to audit.'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Audit Summary */}
            {closureAuditItems.length > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: t.accentBg,
                borderRadius: '6px',
                display: 'flex',
                gap: '24px',
                fontSize: '13px'
              }}>
                <span> <strong>{language === 'es' ? 'Total items:' : 'Total items:'}</strong> {closureAuditItems.length}</span>
                <span> <strong>{language === 'es' ? 'Notificados:' : 'Notified:'}</strong> {closureAuditItems.filter(i => i.sentToAudit).length}</span>
                <span> <strong>{language === 'es' ? 'Completados:' : 'Completed:'}</strong> {closureAuditItems.filter(i => i.auditorCompleted).length}</span>
                <span style={{ color: closureAuditItems.filter(i => i.auditorJudgment === 'NOK').length > 0 ? t.errorFg : t.textDim }}>
                   <strong>NOK:</strong> {closureAuditItems.filter(i => i.auditorJudgment === 'NOK').length}
                </span>
              </div>
            )}

            {/* Action Buttons - Bottom */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAddCategoryModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                 {language === 'es' ? 'Agregar Categoría' : 'Add Category'}
              </button>
              {isTFTLeader && (
                <button
                  onClick={notifyAuditors}
                  disabled={!closureAuditItems.some(item => item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: closureAuditItems.some(item => item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0) ? t.accent : t.border,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: closureAuditItems.some(item => item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0) ? 'pointer' : 'not-allowed'
                  }}
                >
                   {language === 'es' ? 'Notificar Auditores' : 'Notify Auditors'}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={styles.field}>
            <label style={styles.label}>{language === 'es' ? 'Fecha Efectiva de Adopción *' : 'Effective Adoption Date *'}</label>
            <input
              type="date"
              style={{
                ...styles.input,
                border: !formData.effectiveDate ? `1px solid ${t.warningBorder}` : `1px solid ${t.border}`
              }}
              value={formData.effectiveDate}
              onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{language === 'es' ? 'No. de Lote/Unidad de Adopción *' : 'Adoption Lot/Unit No. *'}</label>
            <input
              type="text"
              style={{
                ...styles.input,
                border: !formData.adoptionLotNumber ? `1px solid ${t.warningBorder}` : `1px solid ${t.border}`
              }}
              value={formData.adoptionLotNumber || ''}
              onChange={(e) => handleInputChange('adoptionLotNumber', e.target.value)}
              placeholder={language === 'es' ? 'Ej: LOT-2026-001, UNIT-12345' : 'Ex: LOT-2026-001, UNIT-12345'}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>{language === 'es' ? 'Notas de Cierre' : 'Closure Notes'} *</label>
          <textarea
            style={{
              ...styles.textarea,
              border: !formData.closureNotes ? `1px solid ${t.warningBorder}` : `1px solid ${t.border}`
            }}
            value={formData.closureNotes}
            onChange={(e) => handleInputChange('closureNotes', e.target.value)}
            placeholder={language === 'es' ? 'Comentarios finales sobre el cierre del ECR (resumen de la adopción, observaciones importantes, etc.)' : 'Final comments about the ECR closure (adoption summary, important observations, etc.)'}
            rows={4}
          />
        </div>

        {/* Financial Impact Section */}
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: t.text }}>
               {language === 'es' ? 'Impacto Financiero del ECR' : 'ECR Financial Impact'}
            </h4>
            <button
              onClick={addFinancialItem}
              style={{
                padding: '6px 12px',
                backgroundColor: t.accent,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              + {language === 'es' ? 'Agregar Item' : 'Add Item'}
            </button>
          </div>

          {(!formData.financialImpact?.items || formData.financialImpact.items.length === 0) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: t.textDim, fontSize: '13px' }}>
              {language === 'es' ? 'No hay items de impacto financiero. Haz clic en "+ Agregar Item" para registrar costos o ahorros.' : 'No financial impact items. Click "+ Add Item" to record costs or savings.'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {formData.financialImpact.items.map((item, index) => {
                  const typeInfo = financialImpactTypes.find(t => t.value === item.type);
                  return (
                    <div key={item.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '180px 1fr 140px 40px',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: t.bgCard,
                      borderRadius: '6px',
                      border: `1px solid ${typeInfo?.isExpense ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      <select
                        value={item.type}
                        onChange={(e) => updateFinancialItem(item.id, 'type', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '4px',
                          backgroundColor: typeInfo?.isExpense ? '#fef2f2' : '#f0fdf4'
                        }}
                      >
                        {financialImpactTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder={language === 'es' ? 'Descripción...' : 'Description...'}
                        value={item.description}
                        onChange={(e) => updateFinancialItem(item.id, 'description', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '4px'
                        }}
                      />
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: t.textMuted,
                          fontSize: '13px'
                        }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.amount || ''}
                          onChange={(e) => updateFinancialItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '6px 8px 6px 24px',
                            fontSize: '13px',
                            border: `1px solid ${t.border}`,
                            borderRadius: '4px',
                            textAlign: 'right'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => removeFinancialItem(item.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: t.errorBg,
                          color: t.errorFg,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        title={language === 'es' ? 'Eliminar' : 'Delete'}
                      >

                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                padding: '12px',
                backgroundColor: t.text,
                borderRadius: '6px',
                color: 'white'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>{language === 'es' ? 'Total Gastos' : 'Total Expenses'}</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#fca5a5' }}>
                    ${(formData.financialImpact?.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>{language === 'es' ? 'Total Ahorros' : 'Total Savings'}</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#86efac' }}>
                    -${(formData.financialImpact?.totalSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>{language === 'es' ? 'Impacto Neto' : 'Net Impact'}</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: (formData.financialImpact?.netImpact || 0) > 0 ? '#fca5a5' : '#86efac'
                  }}>
                    {(formData.financialImpact?.netImpact || 0) >= 0 ? '$' : '-$'}
                    {Math.abs(formData.financialImpact?.netImpact || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Closure Status Panel - Same style as ECR-3 */}
        <div style={{ marginTop: '24px', padding: '20px', backgroundColor: t.bgCard, borderRadius: '8px', border: `1px solid ${t.border}` }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: t.text, marginBottom: '16px' }}>
            Estado de Aprobación de Cierre
          </h4>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '6px' }}>Estado de Cierre:</p>
            <span style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '20px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor:
                data.status === 'closed' ? t.success :
                data.status === 'closed_rejected' ? t.error :
                data.status === 'pending_rejected_closure' ? t.error :
                data.status === 'pending_approval' ? t.warning :
                t.textMuted
            }}>
              {data.status === 'closed' ? (language === 'es' ? ' Cerrado' : ' Closed') :
               data.status === 'closed_rejected' ? (language === 'es' ? ' Cerrado como No Adoptable' : ' Closed as Not Adoptable') :
               data.status === 'pending_rejected_closure' ? (language === 'es' ? ' Pendiente - NO ADOPTABLE' : ' Pending - NOT ADOPTABLE') :
               data.status === 'pending_approval' ? (language === 'es' ? ' Pendiente de Firmas' : ' Pending Signatures') :
               (language === 'es' ? ' Borrador' : ' Draft')}
            </span>
          </div>

          {/* Rejected status box */}
          {data.status === 'rejected' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fee2e2',
              border: '2px solid #fca5a5',
              borderRadius: '8px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                 {language === 'es' ? 'Cierre Devuelto' : 'Closure Returned'}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
                El cierre fue devuelto para correcciones. Revisa los comentarios en el historial y realiza los ajustes necesarios.
                Puedes re-enviar a aprobación usando el botón en el footer.
              </p>
            </div>
          )}

          {/* Pending approval info */}
          {data.status === 'pending_approval' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                 El ECR está pendiente de firmas de cierre. Los aprobadores pueden firmar en secuencia a continuación.
              </p>
            </div>
          )}

          {/* Pending rejected closure info */}
          {data.status === 'pending_rejected_closure' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              border: '2px solid #dc2626',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                 {language === 'es' ? 'CIERRE COMO NO ADOPTABLE - Pendiente de Firmas' : 'CLOSURE AS NOT ADOPTABLE - Pending Signatures'}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                {language === 'es' ? 'Este ECR será cerrado como NO ADOPTABLE. Los aprobadores deben confirmar el rechazo del cambio.' : 'This ECR will be closed as NOT ADOPTABLE. Approvers must confirm the rejection of the change.'}
              </p>
              {data.rejectionReason && (
                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{language === 'es' ? 'Motivo:' : 'Reason:'}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b' }}>{data.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Draft status info */}
          {data.status === 'draft' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f3f4f6',
              border: '2px dashed #d1d5db',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                 Completa la información de cierre y envía a aprobación usando el botón en el footer.
              </p>
            </div>
          )}

          {/* Fully closed info - only show if ALL closure signatures are complete */}
          {data.status === 'closed' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#d1fae5',
              border: '2px solid #22c55e',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                 ECR Completamente Cerrado
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#166534' }}>
                Todas las firmas de cierre han sido completadas exitosamente
              </p>
            </div>
          )}

          {/* Closed as rejected info */}
          {data.status === 'closed_rejected' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              border: '2px solid #991b1b',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                 ECR Cerrado como NO ADOPTABLE
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                {language === 'es' ? 'Este ECR ha sido cerrado como No Adoptable. Todas las firmas han sido completadas.' : 'This ECR has been closed as Not Adoptable. All signatures have been completed.'}
              </p>
              {data.rejectionReason && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{language === 'es' ? 'Motivo:' : 'Reason:'}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b' }}>{data.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Pending closure - draft (not yet sent for approval) */}
          {(data.status === 'pending_closure' || data.status === 'draft') && (() => {
            const validationStatus = getClosureValidationStatus();
            // Check if there was a recent rejection
            const lastHistoryEntry = formData.closureApprovalHistory?.[formData.closureApprovalHistory.length - 1];
            const wasRejected = lastHistoryEntry?.action === 'rejected';
            const isClosingAsRejected = data.closureType === 'rejected';

            return (
              <div style={{
                padding: '16px',
                backgroundColor: isClosingAsRejected ? '#fef2f2' : (wasRejected ? '#fee2e2' : '#f3f4f6'),
                border: isClosingAsRejected ? '2px solid #dc2626' : (wasRejected ? '2px solid #ef4444' : '2px dashed #9ca3af'),
                borderRadius: '8px'
              }}>
                {/* Header based on state */}
                {isClosingAsRejected ? (
                  <>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                       CIERRE COMO NO ADOPTABLE
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                      Este ECR será cerrado como NO ADOPTABLE. Los aprobadores deberán confirmar la decisión.
                    </p>
                    {/* Rejection Reason Field */}
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '6px' }}>
                        Motivo *
                      </label>
                      <textarea
                        value={formData.rejectionReason}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, rejectionReason: e.target.value }));
                          onDataUpdate({ rejectionReason: e.target.value });
                        }}
                        placeholder={language === 'es' ? 'Explique por qué este ECR no será adoptado (ej: no hay presupuesto, prioridad baja, el cliente no lo requiere, cambió el alcance, etc.)' : 'Explain why this ECR will not be adopted (e.g.: no budget, low priority, client does not require it, scope changed, etc.)'}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          backgroundColor: '#fff'
                        }}
                      />
                    </div>
                  </>
                ) : wasRejected ? (
                  <>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                       Cierre Devuelto
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#991b1b' }}>
                      {language === 'es' ? 'Devuelto por' : 'Returned by'} <strong>{lastHistoryEntry.userName}</strong> {language === 'es' ? 'en' : 'at'} {lastHistoryEntry.level?.replace('level', language === 'es' ? 'Nivel ' : 'Level ')}.
                    </p>
                    {lastHistoryEntry.notes && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#fff',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px'
                      }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{language === 'es' ? 'Motivo:' : 'Reason:'}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b' }}>{lastHistoryEntry.notes}</p>
                      </div>
                    )}
                    <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      {language === 'es' ? 'Realiza las correcciones necesarias y re-envía a aprobación. El cierre irá directamente al nivel que rechazó.' : 'Make the necessary corrections and re-submit for approval. The closure will go directly to the level that rejected.'}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                     Borrador de Cierre
                  </p>
                )}

                {/* Validation errors - skip if closing as rejected */}
                {!isClosingAsRejected && !validationStatus.canApprove ? (
                  <>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Completa los siguientes pendientes antes de {wasRejected ? 're-enviar' : 'enviar'} a aprobación:
                    </p>
                    <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#dc2626' }}>
                      {validationStatus.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{error}</li>
                      ))}
                      {validationStatus.errors.length > 5 && (
                        <li style={{ color: '#6b7280' }}>...y {validationStatus.errors.length - 5} más</li>
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    {!isClosingAsRejected && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Todas las validaciones están completas.
                      </p>
                    )}
                    {/* Show button if: normal flow with validations complete, OR closing as rejected with reason */}
                    {(validationStatus.canApprove || (isClosingAsRejected && formData.rejectionReason?.trim())) && (
                      <button
                        onClick={handleSendForClosureApproval}
                        disabled={isClosingAsRejected && !formData.rejectionReason?.trim()}
                        style={{
                          marginTop: '16px',
                          padding: '10px 20px',
                          backgroundColor: isClosingAsRejected ? '#dc2626' : (wasRejected ? '#C77700' : '#2563eb'),
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: (isClosingAsRejected && !formData.rejectionReason?.trim()) ? 'not-allowed' : 'pointer',
                          opacity: (isClosingAsRejected && !formData.rejectionReason?.trim()) ? 0.5 : 1
                        }}
                      >
                        {isClosingAsRejected
                          ? (language === 'es' ? ' Enviar para Cierre como No Adoptable' : ' Submit for Closure as Not Adoptable')
                          : (wasRejected
                            ? (language === 'es' ? ' Re-enviar a Aprobación de Cierre' : ' Re-submit for Closure Approval')
                            : (language === 'es' ? ' Enviar a Aprobación de Cierre' : ' Submit for Closure Approval'))}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })()}

        </div>

        {/* Approval Flow - Visual Chain (always visible like ECR-3) */}
        {(() => {
          // Determine if we're in rejection flow
          const isRejectionFlow = data.status === 'pending_rejected_closure' || data.closureType === 'rejected';
          // UNIFIED: Always use closureSignatures - backend stores both flows in same field
          const signatures = formData.closureSignatures;
          const canSignFn = isRejectionFlow ? canSignRejection : canSignClosure;
          const handleSignFn = isRejectionFlow ? handleSignRejection : (levelKey) => {
            setClosureApprovalLevel(levelKey);
            setShowClosureApprovalModal(true);
          };

          return (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '600', color: isRejectionFlow ? t.errorFg : t.text, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isRejectionFlow
              ? (language === 'es' ? 'Flujo de Confirmación - No Adoptable' : 'Confirmation Flow - Not Adoptable')
              : (language === 'es' ? 'Flujo de Aprobación de Cierre' : 'Closure Approval Flow')}
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: t.border,
                color: t.textMuted,
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'help'
              }}
              className="approval-flow-help"
            >
              ?
              <div className="approval-flow-tooltip" style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                padding: '12px 14px',
                backgroundColor: '#1f2937',
                color: '#f9fafb',
                borderRadius: '8px',
                fontSize: '12px',
                lineHeight: '1.5',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                opacity: 0,
                visibility: 'hidden',
                transition: 'opacity 0.2s, visibility 0.2s',
                zIndex: 1000,
                pointerEvents: 'none'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#60a5fa' }}>{language === 'es' ? '¿Cómo funciona?' : 'How does it work?'}</div>
                <div>• {language === 'es' ? 'Firmas en secuencia: Nivel 1 → 2 → 3' : 'Signatures in sequence: Level 1 → 2 → 3'}</div>
                <div>• {language === 'es' ? 'Rechazo preserva firmas anteriores' : 'Rejection preserves previous signatures'}</div>
                <div>• {language === 'es' ? 'Re-envío continúa desde nivel que rechazó' : 'Re-submit continues from rejecting level'}</div>
                <div>• {language === 'es' ? 'Cambio OK ↔ No Adoptable reinicia firmas' : 'OK ↔ Not Adoptable change resets signatures'}</div>
              </div>
              <style>{`
                .approval-flow-help:hover .approval-flow-tooltip {
                  opacity: 1 !important;
                  visibility: visible !important;
                }
              `}</style>
            </span>
          </h4>

          {approverLevels.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: t.warningBg,
              border: `2px dashed ${t.warningBorder}`,
              borderRadius: '8px',
              color: t.warningFg
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}> {language === 'es' ? 'No hay aprobadores definidos' : 'No approvers defined'}</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                {language === 'es' ? 'Regresa a ECR-2B y asigna los aprobadores' : 'Go back to ECR-2B and assign approvers'}
              </p>
            </div>
          ) : (
            <>
              {/* Horizontal Flow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {approverLevels.map((level, index) => {
                  const approverUser = getUserById(approvers[level.key]);
                  const signature = signatures[level.key];
                  const isSigned = signature?.signedBy;
                  const previousLevelPending = index > 0 && !signatures[approverLevels[index - 1].key]?.signedBy;

                  // Determine status - if closure not sent for approval yet, all show 'not_started'
                  let status = 'not_started';
                  const isPending = isRejectionFlow ? data.status === 'pending_rejected_closure' : formData.closureApprovalStatus === 'pending';
                  if (isSigned) status = 'approved';
                  else if (isPending && (index === 0 || !previousLevelPending)) status = 'pending';

                  const statusStyle = {
                    approved: { bg: '#dcfce7', border: '#22c55e', color: '#166534', text: language === 'es' ? 'Firmado' : 'Signed' },
                    pending: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e', text: language === 'es' ? 'Pendiente' : 'Pending' },
                    not_started: { bg: '#f3f4f6', border: '#d1d5db', color: '#6b7280', text: language === 'es' ? 'Esperando' : 'Waiting' }
                  }[status];

                  return (
                    <React.Fragment key={level.key}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: statusStyle.bg,
                        border: `2px solid ${statusStyle.border}`,
                        borderRadius: '8px',
                        minWidth: '200px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: statusStyle.border,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                            {approverUser?.firstName} {approverUser?.lastName}
                          </div>
                          <div style={{ fontSize: '11px', color: t.textMuted }}>
                            {level.label}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: statusStyle.color,
                            marginTop: '2px'
                          }}>
                            {isSigned ? `✓ ${statusStyle.text}` : statusStyle.text}
                          </div>
                          {isSigned && signature.signedAt && (
                            <div style={{ fontSize: '10px', color: t.textDim }}>
                              {new Date(signature.signedAt).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US')}
                            </div>
                          )}
                        </div>
                      </div>
                      {index < approverLevels.length - 1 && (
                        <span style={{ fontSize: '20px', color: t.textMuted }}>→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Action Buttons for Current User */}
              {(() => {
                // Find the current pending level that the user can sign
                const currentPendingLevel = approverLevels.find((level, index) => {
                  const signature = signatures[level.key];
                  const isSigned = signature?.signedBy;
                  const previousLevelPending = index > 0 && !signatures[approverLevels[index - 1].key]?.signedBy;
                  return !isSigned && !previousLevelPending && canSignFn(level.key);
                });

                if (!currentPendingLevel) return null;

                const approverUser = getUserById(approvers[currentPendingLevel.key]);

                const validationStatus = getClosureValidationStatus();

                return (
                  <div style={{
                    padding: '16px',
                    backgroundColor: validationStatus.canApprove ? t.accentBg : t.warningBg,
                    border: `2px solid ${validationStatus.canApprove ? t.accent : t.warningBorder}`,
                    borderRadius: '8px'
                  }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: isRejectionFlow ? t.errorFg : t.text }}>
                      <strong>{approverUser?.firstName} {approverUser?.lastName}</strong> - Es tu turno de {isRejectionFlow ? 'confirmar el cierre como No Adoptable' : 'firmar el cierre'}
                    </p>

                    {/* Show validation errors if any - skip for rejection flow */}
                    {!isRejectionFlow && !validationStatus.canApprove && (
                      <div style={{
                        marginBottom: '12px',
                        padding: '12px',
                        backgroundColor: t.errorBg,
                        border: `1px solid ${t.errorBorder}`,
                        borderRadius: '6px'
                      }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: t.errorFg }}>
                           No se puede aprobar el cierre. Pendientes:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: t.errorFg }}>
                          {validationStatus.errors.slice(0, 5).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {validationStatus.errors.length > 5 && (
                            <li>...y {validationStatus.errors.length - 5} más</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {(isRejectionFlow ? data.status === 'pending_rejected_closure' : formData.closureApprovalStatus === 'pending') ? (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {isRejectionFlow ? (
                          <>
                            <button
                              onClick={() => handleSignRejection(currentPendingLevel.key, 'approved')}
                              style={{
                                padding: '10px 24px',
                                backgroundColor: t.error,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                               {language === 'es' ? 'Confirmar No Adoptable' : 'Confirm Not Adoptable'}
                            </button>
                            <button
                              onClick={() => handleSignRejection(currentPendingLevel.key, 'rejected')}
                              style={{
                                padding: '10px 24px',
                                backgroundColor: t.warning,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              ↩ {language === 'es' ? 'Devolver - Reconsiderar Adopción' : 'Return - Reconsider Adoption'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setClosureApprovalLevel(currentPendingLevel.key);
                              setShowClosureApprovalModal(true);
                            }}
                            disabled={!validationStatus.canApprove}
                            style={{
                              padding: '10px 24px',
                              backgroundColor: validationStatus.canApprove ? t.success : t.textMuted,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: validationStatus.canApprove ? 'pointer' : 'not-allowed',
                              opacity: validationStatus.canApprove ? 1 : 0.7
                            }}
                          >
                             {language === 'es' ? 'Revisar y Aprobar/Devolver' : 'Review and Approve/Return'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#C77700', fontStyle: 'italic' }}>
                         {language === 'es' ? 'El cierre debe ser enviado a aprobación primero' : 'Closure must be submitted for approval first'}
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
          );
        })()}

        {/* Completion Status */}
        {isFullyCompleted && (
          <div style={styles.completionBanner}>
            <h3 style={styles.completionTitle}> ECR Completado</h3>
            <p style={styles.completionText}>
              Este ECR ha sido formalmente cerrado con todas las firmas requeridas
            </p>
          </div>
        )}

      </div>

      {/* Show closed as rejected banner */}
      {data.status === 'closed_rejected' && (
        <div style={{
          marginTop: '32px',
          padding: '24px',
          backgroundColor: '#7f1d1d',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '18px' }}>
             ECR Cerrado como No Adoptable
          </h3>
          <p style={{ margin: '0 0 8px 0', color: '#fecaca', fontSize: '14px' }}>
            Este ECR fue cerrado definitivamente y no puede ser modificado.
          </p>
          {data.closedByName && (
            <p style={{ margin: 0, color: '#fecaca', fontSize: '13px' }}>
              {language === 'es' ? 'Cerrado por:' : 'Closed by:'} {data.closedByName} - {data.closedAt ? new Date(data.closedAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US') : ''}
            </p>
          )}
          {data.closureReason && (
            <p style={{ margin: '8px 0 0 0', color: 'white', fontSize: '14px', fontStyle: 'italic' }}>
              {language === 'es' ? 'Motivo:' : 'Reason:'} "{data.closureReason}"
            </p>
          )}
        </div>
      )}

      {/* Add Item Modal - Now with impact area context */}
      {showAddCategoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px',
            width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
               {language === 'es' ? 'Agregar Item de Auditoría' : 'Add Audit Item'}
            </h3>
            {currentImpactArea && (
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: t.textMuted, padding: '8px 12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                 TFT: <strong>{currentImpactArea.areaName}</strong> - {currentImpactArea.subsection}
              </p>
            )}

            {/* Default items */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '8px' }}>
                Items estándar:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DEFAULT_CLOSURE_AUDIT_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addClosureAuditItem(currentImpactArea, item)}
                    style={{
                      padding: '8px 14px', backgroundColor: '#dbeafe', color: t.text,
                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: '500'
                    }}
                  >
                    {item.icon} {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom item input */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '16px' }}>
              <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '8px' }}>
                {language === 'es' ? 'O crea un item personalizado:' : 'Or create a custom item:'}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Nombre del item...' : 'Item name...'}
                  id="customCategoryInput"
                  style={{
                    flex: 1, padding: '10px', border: `1px solid ${t.border}`,
                    borderRadius: '6px', fontSize: '14px'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addClosureAuditItem(currentImpactArea, { name: e.target.value.trim(), icon: '', isDefault: false });
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('customCategoryInput');
                    if (input?.value.trim()) {
                      addClosureAuditItem(currentImpactArea, { name: input.value.trim(), icon: '', isDefault: false });
                      input.value = '';
                    }
                  }}
                  style={{
                    padding: '10px 16px', backgroundColor: t.accent, color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  {language === 'es' ? 'Agregar' : 'Add'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => { setShowAddCategoryModal(false); setCurrentImpactArea(null); }}
                style={{
                  padding: '10px 20px', backgroundColor: t.textDim, color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                }}
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px',
            width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
               {language === 'es' ? 'Historial de Auditoría' : 'Audit History'} - {historyData.itemName}
            </h3>
            <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>
              Ronda actual: <strong>{historyData.currentRound}</strong>
            </p>

            {historyData.history.length === 0 ? (
              <p style={{ color: t.textDim, textAlign: 'center', padding: '20px' }}>
                No hay historial de rondas anteriores.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyData.history.map((h, idx) => (
                  <div key={idx} style={{
                    padding: '12px', backgroundColor: t.bg,
                    borderRadius: '8px', border: `1px solid ${t.border}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{language === 'es' ? 'Ronda' : 'Round'} {h.auditRound}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: h.auditorJudgment === 'OK' ? '#dcfce7' :
                                        h.auditorJudgment === 'NOK' ? '#fee2e2' : '#fef3c7',
                        color: h.auditorJudgment === 'OK' ? '#166534' :
                               h.auditorJudgment === 'NOK' ? '#991b1b' : '#92400e'
                      }}>
                        {h.auditorJudgment || 'N/A'}
                      </span>
                    </div>
                    {h.auditorComments && (
                      <p style={{ fontSize: '13px', color: t.text, margin: '0 0 6px 0' }}>
                        <strong>Hallazgos:</strong> {h.auditorComments}
                      </p>
                    )}
                    {h.closureNotes && (
                      <p style={{ fontSize: '12px', color: '#92400e', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px', margin: '0 0 6px 0' }}>
                        <strong>Razón de re-envío:</strong> {h.closureNotes}
                      </p>
                    )}
                    <div style={{ fontSize: '11px', color: t.textDim, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {h.auditedByName && (
                        <span> {language === 'es' ? 'Auditado por:' : 'Audited by:'} <strong>{h.auditedByName}</strong></span>
                      )}
                      {h.verificationDate && (
                        <span>{new Date(h.verificationDate).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US')}</span>
                      )}
                      {h.closedByName && (
                        <span>{language === 'es' ? 'Cerrado por:' : 'Closed by:'} {h.closedByName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: '10px 20px', backgroundColor: t.textDim, color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* End of read-only wrapper */}

      {/* Closure Approval Modal - Same style as ECR-3 */}
      {showClosureApprovalModal && closureApprovalLevel && (
        <ClosureApprovalModalContent
          t={t}
          language={language}
          closureApprovalLevel={closureApprovalLevel}
          closureType={data.closureType}
          rejectionReason={data.rejectionReason}
          onApprove={(comments) => {
            handleSignClosure(closureApprovalLevel, 'approved', comments);
            setShowClosureApprovalModal(false);
          }}
          onReject={(comments) => {
            handleSignClosure(closureApprovalLevel, 'rejected', comments);
            setShowClosureApprovalModal(false);
          }}
          onClose={() => setShowClosureApprovalModal(false)}
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
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: `2px solid ${t.border}`
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
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
    fontSize: '18px',
    fontWeight: '600',
    color: t.text,
    marginBottom: '12px'
  },
  sectionDescription: {
    fontSize: '14px',
    color: t.textMuted,
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  badge: {
    backgroundColor: t.accent,
    color: 'white',
    padding: '6px 16px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600'
  },
  areaCard: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: `2px solid ${t.border}`
  },
  areaTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center'
  },
  subsectionCard: {
    backgroundColor: t.bg,
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
    border: `1px solid ${t.border}`
  },
  subsectionHeader: {
    marginBottom: '12px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  verifiedBadge: {
    marginLeft: '12px',
    padding: '2px 8px',
    backgroundColor: t.successBg,
    color: t.successFg,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  field: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: t.text,
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: t.bgCard
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  evidenceSection: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: t.bgCard,
    borderRadius: '6px',
    border: `1px solid ${t.border}`
  },
  fileInput: {
    width: '100%',
    padding: '10px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px'
  },
  hint: {
    fontSize: '12px',
    color: t.textMuted,
    marginTop: '6px'
  },
  fileList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    backgroundColor: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: '6px'
  },
  fileLink: {
    fontSize: '14px',
    color: t.accent,
    textDecoration: 'none',
    flex: 1
  },
  removeFileButton: {
    backgroundColor: t.errorBg,
    color: t.errorFg,
    border: 'none',
    borderRadius: '4px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '1',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: t.textMuted,
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    border: `2px dashed ${t.border}`
  },
  signaturesSection: {
    marginTop: '24px'
  },
  signaturesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text,
    marginBottom: '16px'
  },
  signatureCard: {
    padding: '16px',
    backgroundColor: t.bgCard,
    borderRadius: '6px',
    border: `2px solid ${t.border}`,
    marginBottom: '16px'
  },
  signatureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  signatureRole: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.text,
    margin: 0
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600'
  },
  signatureInfo: {
    fontSize: '14px',
    color: t.text
  },
  signedBy: {
    margin: '0 0 6px 0'
  },
  signedAt: {
    margin: 0,
    color: t.textMuted
  },
  signatureDescription: {
    fontSize: '13px',
    color: t.textMuted,
    marginBottom: '12px'
  },
  signButton: {
    backgroundColor: t.success,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  warningText: {
    fontSize: '13px',
    color: t.warningFg,
    margin: '8px 0'
  },
  completionBanner: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: t.successBg,
    border: `2px solid ${t.successBorder}`,
    borderRadius: '8px',
    textAlign: 'center'
  },
  completionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: t.successFg,
    margin: '0 0 8px 0'
  },
  completionText: {
    fontSize: '14px',
    color: t.success,
    margin: 0
  }
}); }

export default ECRClosure;
