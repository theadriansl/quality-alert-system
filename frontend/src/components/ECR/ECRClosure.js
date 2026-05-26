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
const ClosureApprovalModalContent = ({ t, closureApprovalLevel, closureType, rejectionReason, onApprove, onReject, onClose }) => {
  const [action, setAction] = React.useState(null); // 'approve' or 'reject'
  const [comments, setComments] = React.useState('');
  const [error, setError] = React.useState(null);

  const isClosingAsRejected = closureType === 'rejected';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (action === 'reject' && !comments.trim()) {
      setError('Los comentarios son obligatorios al rechazar');
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
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: isClosingAsRejected ? '#991b1b' : t.text, marginBottom: '20px' }}>
          {isClosingAsRejected ? ' Cierre como NO ADOPTABLE' : 'Revisar Firma de Cierre'}
        </h2>

        {/* Warning for closing as rejected */}
        {isClosingAsRejected && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '2px solid #dc2626',
            borderRadius: '8px'
          }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              Este ECR será cerrado como NO ADOPTABLE
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
              El cambio no será implementado. Al firmar, confirmas que el ECR debe cerrarse sin adoptar.
            </p>
            {rejectionReason && (
              <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Motivo del rechazo:</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b' }}>{rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '4px' }}>Nivel de Aprobador</p>
          <p style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>Aprobador {levelNumber}</p>
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
                backgroundColor: isClosingAsRejected ? '#991b1b' : '#2E7D32',
                color: 'white'
              }}
            >
              {isClosingAsRejected ? ' Confirmar Cierre como No Adoptable' : ' Aprobar Cierre'}
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
                backgroundColor: isClosingAsRejected ? '#C77700' : '#ef4444',
                color: 'white'
              }}
            >
              {isClosingAsRejected ? '↩ Devolver - Considerar Adoptar' : ' Rechazar'}
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
              Cancelar
            </button>
          </div>
        )}

        {action && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                Comentarios {action === 'reject' && <span style={{ color: '#ef4444' }}>*</span>}
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
                placeholder={action === 'reject' ? 'Explica la razón del rechazo...' : 'Comentarios adicionales (opcional)'}
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  Debes proporcionar una razón para rechazar
                </p>
              )}
            </div>

            {error && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                color: '#ef4444',
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
                  ? (isClosingAsRejected ? 'Confirmar Cierre No Adoptable' : 'Confirmar Aprobación')
                  : (isClosingAsRejected ? 'Devolver para Reconsideración' : 'Confirmar Rechazo')}
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
                Atrás
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ECRClosure = ({ data, onDataUpdate, isLocked = false, isAdmin = false }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const { showSuccess, showError } = useToast();
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
    { key: 'level1', label: 'Nivel 1', icon: '' },
    { key: 'level2', label: 'Nivel 2', icon: '' },
    { key: 'level3', label: 'Nivel 3', icon: '' }
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

  // Re-hydrate assignedAuditorsInfo from IDs when users list is available
  useEffect(() => {
    if (users.length === 0) return;
    setClosureAuditItems(prev => prev.map(item => {
      if (item.assignedAuditorsInfo?.length > 0) return item;
      if (!item.assignedAuditors?.length) return item;
      const hydrated = item.assignedAuditors.map(id => {
        const u = users.find(u => u.id === id);
        return u ? { id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), firstName: u.firstName, email: u.email } : null;
      }).filter(Boolean);
      return hydrated.length > 0 ? { ...item, assignedAuditorsInfo: hydrated } : item;
    }));
  }, [users]);

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
    if (window.confirm('¿Eliminar este item del checklist de auditoría?')) {
      setClosureAuditItems(prev => prev.filter(item => item.id !== itemId));
    }
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
    // Items with negative IDs haven't been saved to DB yet
    if (itemId < 0) {
      showError('Guarda el ECR primero antes de subir archivos');
      return;
    }

    setUploadingAuditFile(itemId);
    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/closure-audit-items/${itemId}/files`,
        uploadFormData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setClosureAuditItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, files: [...(item.files || []), response.data.file] }
            : item
        ));
        showSuccess('Archivo subido');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Error al subir archivo');
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
        const auditorEmails = (item.assignedAuditorsInfo || []).map(a => a.email).filter(Boolean).join(',');
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

        showSuccess(`Ítem re-enviado a Ronda ${newRound}. Historial guardado.`);
      }
    } catch (error) {
      console.error('Error resending audit item:', error);
      showError('Error al re-enviar el ítem');
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
  const notifyAuditors = () => {
    const itemsToNotify = closureAuditItems.filter(item =>
      item.checkItem &&
      !item.auditorCompleted &&
      item.assignedAuditors?.length > 0
    );

    if (itemsToNotify.length === 0) {
      showError('No hay ítems con auditor asignado para notificar');
      return;
    }

    const ecrNumber = data.ecrNumber || `ECR-${data.id}`;

    // Collect all unique auditor emails from assigned TFT members
    const auditorEmailSet = new Set();
    itemsToNotify.forEach(item => {
      (item.assignedAuditors || []).forEach(auditorId => {
        const member = tftMembers.find(m => m.id === auditorId);
        if (member?.email) auditorEmailSet.add(member.email);
      });
    });

    const toEmails = [...auditorEmailSet].join(',');
    if (!toEmails) {
      showError('Los auditores asignados no tienen correo registrado');
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

    // Lock assignments: mark items as notified
    const notifiedIds = new Set(itemsToNotify.map(i => i.id));
    setClosureAuditItems(prev => prev.map(item =>
      notifiedIds.has(item.id) ? { ...item, sentToAudit: true } : item
    ));

    showSuccess(`${itemsToNotify.length} ítem(s) notificados. Guarda el ECR para persistir.`);
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
  const handleSignVerification = (areaKey, subsectionKey) => {
    const verificationData = formData.impactVerifications[areaKey]?.[subsectionKey];

    if (!verificationData?.verdict) {
      showError('Selecciona un juicio (Aprobado/Condicional/Rechazado) antes de firmar');
      return;
    }

    const isApproval = verificationData.verdict === 'approved';
    const verdictLabel = verificationData.verdict === 'approved' ? 'APROBADO' :
                         verificationData.verdict === 'conditional' ? 'CONDICIONAL' : 'RECHAZADO';

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

      if (isApproval) {
        // APPROVED: Lock the verification
        setFormData(prev => ({
          ...prev,
          impactVerifications: {
            ...prev.impactVerifications,
            [areaKey]: {
              ...prev.impactVerifications[areaKey],
              [subsectionKey]: {
                ...prev.impactVerifications[areaKey][subsectionKey],
                signedBy: currentUser.id,
                signedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
                signedAt: now,
                isLocked: true,
                history: [...existingHistory, historyEntry]
              }
            }
          }
        }));
        showSuccess('Verificación aprobada y bloqueada');
      } else {
        // REJECTED or CONDITIONAL: Save to history, keep verdict and comments visible, don't lock
        setFormData(prev => ({
          ...prev,
          impactVerifications: {
            ...prev.impactVerifications,
            [areaKey]: {
              ...prev.impactVerifications[areaKey],
              [subsectionKey]: {
                ...prev.impactVerifications[areaKey][subsectionKey],
                signedBy: currentUser.id,
                signedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
                signedAt: now,
                isLocked: false, // NOT locked - can be edited for corrections
                history: [...existingHistory, historyEntry]
              }
            }
          }
        }));
        showSuccess(`Verificación marcada como ${verdictLabel.toLowerCase()} - disponible para corrección`);
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

        showSuccess(`${uploadedFiles.length} archivo(s) subido(s) exitosamente`);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError('Error al subir evidencia');
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

      subject = encodeURIComponent(`ECR ${ecrNumber} - Cierre Rechazado`);
      body = encodeURIComponent(
        `Hola ${creatorName || ''},\n\n` +
        `El cierre del ECR "${ecrNumber} - ${changeTitle}" ha sido RECHAZADO.\n\n` +
        `Motivo:\n${rejectionNotes}\n\n` +
        `Por favor realiza las correcciones necesarias.\n\n` +
        `Saludos`
      );
    }

    if (toEmails.length > 0) {
      let mailtoLink = `mailto:${toEmails.join(',')}?subject=${subject}&body=${body}`;
      if (ccEmails.length > 0) {
        mailtoLink = `mailto:${toEmails.join(',')}?cc=${ccEmails.join(',')}&subject=${subject}&body=${body}`;
      }
      window.open(mailtoLink, '_blank');
    }
  };

  // Send closure for approval - changes status from draft to pending
  const handleSendForClosureApproval = async () => {
    const isClosingAsRejected = data.closureType === 'rejected';

    // Check stage completion first
    if (!data.stageCompletionStatus?.ecr4?.completed) {
      showError('Debes marcar la etapa ECR-4 como completada antes de enviar a aprobación');
      return;
    }

    // If closing as rejected, require rejection reason
    if (isClosingAsRejected && !formData.rejectionReason?.trim()) {
      showError('Debes proporcionar un motivo de rechazo para cerrar como rechazado');
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
      ? '¿Estás seguro de que quieres enviar el ECR para CIERRE COMO RECHAZADO?\n\nLos aprobadores deberán firmar el rechazo.'
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
        // Update local state with backend response
        setFormData(prev => ({
          ...prev,
          closureApprovalStatus: response.data.closureApprovalStatus,
          closureApprovalHistory: response.data.closureApprovalHistory
        }));

        showSuccess(isClosingAsRejected ? 'ECR enviado para cierre como rechazado' : 'Cierre enviado a aprobación');

        // Generate mailto to first approver
        const firstApprover = users.find(u => u.id === approvers.level1);
        if (firstApprover?.email) {
          const subjectType = isClosingAsRejected ? 'CIERRE COMO RECHAZADO' : 'Cierre';
          const subject = encodeURIComponent(`ECR ${ecrNumber} - ${subjectType} Pendiente de Firma (Nivel 1)`);
          const body = encodeURIComponent(
            `Hola ${firstApprover.firstName || ''},\n\n` +
            `El ECR "${ecrNumber} - ${changeTitle}" ha sido enviado para ${isClosingAsRejected ? 'CIERRE COMO RECHAZADO' : 'cierre'} y está pendiente de tu firma.\n\n` +
            (isClosingAsRejected ? `Motivo del rechazo: ${formData.rejectionReason}\n\n` : '') +
            `Por favor revisa y firma en el sistema.\n\n` +
            `Enviado por: ${currentUser.firstName || ''} ${currentUser.lastName || ''}\n\n` +
            `Saludos`
          );
          window.open(`mailto:${firstApprover.email}?subject=${subject}&body=${body}`, '_blank');
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
          showSuccess(`Cierre rechazado por Nivel ${levelNumber}. Hacer correcciones y re-enviar.`);
          generateClosureMailto('rejected', levelKey, comments);
          window.location.reload();
        } else {
          const allSigned = response.data.allSigned;
          showSuccess(allSigned ? 'ECR completamente cerrado' : 'Nivel aprobado exitosamente');
          generateClosureMailto('approved', levelKey, comments);
          if (allSigned) {
            window.location.reload();
          }
        }
      }
    } catch (error) {
      console.error(`Error ${isRejection ? 'rejecting' : 'approving'} closure:`, error);
      const errorMsg = error.response?.data?.message || `Error al ${isRejection ? 'rechazar' : 'aprobar'} el cierre`;
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

    // 0. Check stage completion
    if (!data.stageCompletionStatus?.ecr4?.completed) {
      errors.push('Etapa ECR-4 no está marcada como completada');
    }

    // 1. Check Impact Verifications (TFT) - all must be 'approved' or 'conditional' and signed
    const impactAreas = data.impactAnalysis || [];
    for (const area of impactAreas) {
      const areaKey = area.areaKey || area.id;
      const areaName = area.areaName || area.name || areaKey;
      const subsections = area.subsections || [];

      for (const subsection of subsections) {
        const subKey = subsection.key || subsection.id;
        const subName = subsection.name || subKey;
        const verification = formData.impactVerifications?.[areaKey]?.[subKey];

        if (!verification?.verdict) {
          errors.push(`TFT "${areaName} - ${subName}": Sin veredicto`);
        } else if (verification.verdict === 'rejected') {
          errors.push(`TFT "${areaName} - ${subName}": Rechazado`);
        } else if (verification.verdict !== 'approved' && verification.verdict !== 'conditional') {
          errors.push(`TFT "${areaName} - ${subName}": No aprobada`);
        } else if (!verification?.signedBy) {
          errors.push(`TFT "${areaName} - ${subName}": No firmada`);
        }
      }
    }

    // 2. Check Production Results - requires judgment
    if (!formData.productionJudgment || formData.productionJudgment === '') {
      errors.push('Producción: Falta Juicio de Resultados');
    } else if (formData.productionJudgment.toUpperCase() === 'NOK') {
      errors.push('Producción: Juicio es NOK');
    } else if (formData.productionJudgment.toUpperCase() === 'CONDITIONAL' || formData.productionJudgment.toUpperCase() === 'CONDICIONAL') {
      if (!formData.productionComments || formData.productionComments.trim() === '') {
        errors.push('Producción: Juicio Condicional requiere comentarios');
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

    return {
      canApprove: errors.length === 0,
      errors
    };
  };

  const isFullyCompleted = approverLevels.length > 0 && approverLevels.every(
    level => formData.closureSignatures[level.key]?.signedBy
  );

  const isFullyRejected = approverLevels.length > 0 && approverLevels.every(
    level => formData.rejectionSignatures[level.key]?.signedBy
  );

  // Check if user can sign rejection
  const canSignRejection = (levelKey) => {
    const currentUser = getCurrentUser();
    const assignedApproverId = approvers[levelKey];

    // Check if already signed
    if (formData.rejectionSignatures[levelKey]?.signedBy) return false;

    // Admins can sign for any approver
    const userIsAdmin = isAdmin || isUserAdmin(currentUser);

    // Check if current user is the assigned approver OR is admin
    if (currentUser.id !== assignedApproverId && !userIsAdmin) return false;

    // Check if previous levels are signed (if applicable)
    const levelIndex = approverLevels.findIndex(l => l.key === levelKey);
    for (let i = 0; i < levelIndex; i++) {
      const prevLevelKey = approverLevels[i].key;
      if (!formData.rejectionSignatures[prevLevelKey]?.signedBy) return false;
    }

    return true;
  };

  // Handle signing rejection (approve the rejection or reject it)
  const handleSignRejection = async (levelKey, action = 'approved') => {
    const currentUser = getCurrentUser();
    const assignedApproverId = approvers[levelKey];
    const userIsAdmin = isAdmin || isUserAdmin(currentUser);

    if (!currentUser) {
      showError('No se pudo obtener información del usuario');
      return;
    }

    const isRejectingRejection = action === 'rejected';
    let rejectionNotes = '';

    if (isRejectingRejection) {
      rejectionNotes = window.prompt('Ingrese el motivo por el cual este ECR SÍ puede ser adoptado (ej: hay presupuesto disponible, se encontró solución técnica, etc.):');
      if (!rejectionNotes) {
        showError('Debe ingresar un motivo');
        return;
      }
    }

    const confirmMessage = isRejectingRejection
      ? ' ATENCIÓN\n\n' +
        'Al devolver a revisión:\n' +
        '• El ECR volverá a estado borrador\n' +
        '• Se guardará su comentario sobre por qué SÍ se puede adoptar\n' +
        '• El flujo de aprobación normal podrá continuar\n\n' +
        '¿Está seguro de que desea devolver este ECR a revisión?'
      : ' ATENCIÓN\n\n' +
        'Al confirmar el rechazo:\n' +
        '• Su firma quedará registrada permanentemente\n' +
        '• Esta acción confirma que el ECR debe cerrarse como RECHAZADO\n\n' +
        '¿Está seguro de que desea confirmar el RECHAZO de este ECR?';

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
        // Cancel rejection: clear signatures and set status back to draft
        const cancelData = {
          rejectionSignatures: {},
          closureApprovalHistory: newHistory,
          status: 'draft'
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
          showSuccess('ECR devuelto a borrador - Se puede continuar con el flujo de aprobación');
          window.location.reload();
        } catch (error) {
          console.error('Error cancelling rejection:', error);
          showError('Error al cancelar el rechazo');
        }
      } else {
        // Sign the rejection
        const newSignatures = {
          ...formData.rejectionSignatures,
          [levelKey]: {
            signedBy: currentUser.id,
            signedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
            signedAt: now,
            onBehalfOf: userIsAdmin && currentUser.id !== assignedApproverId
              ? `${assignedUser?.firstName || ''} ${assignedUser?.lastName || ''}`.trim()
              : null
          }
        };

        // Check if all levels are now signed
        const allSigned = approverLevels.every(
          level => newSignatures[level.key]?.signedBy
        );

        const updateData = {
          rejectionSignatures: newSignatures,
          closureApprovalHistory: newHistory,
          ...(allSigned ? { status: 'closed_rejected' } : {})
        };

        setFormData(prev => ({
          ...prev,
          rejectionSignatures: newSignatures
        }));

        try {
          const token = localStorage.getItem('token');
          await axios.put(`http://localhost:5000/ecr/reports/${data.id}`, updateData, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (allSigned) {
            showSuccess('ECR cerrado como RECHAZADO definitivamente');
            window.location.reload();
          } else {
            showSuccess('Rechazo firmado exitosamente');
          }
        } catch (error) {
          console.error('Error signing rejection:', error);
          showError('Error al firmar el rechazo');
        }
      }
    }
  };

  // Legacy function - keeping for backwards compatibility
  const handleCloseAsRejected = async () => {
    const reason = window.prompt(
      ' CERRAR ECR COMO RECHAZADO\n\n' +
      'Esta acción cerrará definitivamente el ECR como RECHAZADO.\n' +
      'El ECR no podrá ser modificado después de esta acción.\n\n' +
      'Ingrese el motivo del rechazo definitivo:'
    );

    if (!reason) {
      return; // User cancelled or empty reason
    }

    const confirmed = window.confirm(
      ' CONFIRMAR CIERRE DEFINITIVO\n\n' +
      `Motivo: "${reason}"\n\n` +
      'Una vez cerrado como rechazado, el ECR NO podrá ser reabierto.\n' +
      '¿Está seguro de que desea CERRAR DEFINITIVAMENTE este ECR como RECHAZADO?'
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
        showSuccess('ECR cerrado definitivamente como rechazado');
        window.location.reload();
      } catch (error) {
        console.error('Error closing ECR as rejected:', error);
        showError('Error al cerrar el ECR');
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

        showSuccess(`${uploadedFiles.length} archivo(s) subido(s) exitosamente`);
      }
    } catch (error) {
      console.error('Error uploading PPAP evidence:', error);
      showError('Error al subir evidencia de PPAP');
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
  const financialImpactTypes = [
    { value: 'scrap', label: 'Scrap', icon: '', isExpense: true },
    { value: 'investment', label: 'Inversión', icon: '', isExpense: true },
    { value: 'overtime', label: 'Tiempo Extra', icon: '', isExpense: true },
    { value: 'rework', label: 'Retrabajo', icon: '', isExpense: true },
    { value: 'logistics', label: 'Logística/Flete', icon: '', isExpense: true },
    { value: 'other_expense', label: 'Otros Gastos', icon: '', isExpense: true },
    { value: 'savings', label: 'Ahorro', icon: '', isExpense: false }
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
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-4: Cierre y Verificación</h2>
        <p style={styles.subtitle}>
          Verificación de que las TFT de impacto identificadas no presentaron afectaciones
        </p>
      </div>

      {/* 1. Verificación de TFT de Impacto (Dynamic from ECR-2B) */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>1. Verificación de TFT de Impacto</span>
        </h3>
        <p style={styles.sectionDescription}>
          Verifica cada TFT y subsección identificada en ECR-2B. Confirma que no hubo afectación y proporciona evidencia.
        </p>

        {impactedAreas.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No hay TFT de impacto seleccionadas en ECR-2B</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: t.textMuted }}>
              Regresa a ECR-2B y selecciona las TFT afectadas
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
                const isLocked = verificationData.verdict === 'approved' && verificationData.signedBy;

                return (
                  <div key={subsectionKey} style={{
                    ...styles.subsectionCard,
                    backgroundColor: isLocked ? '#f0fdf4' : t.bg,
                    border: isLocked ? '1px solid #2E7D32' : `1px solid ${t.border}`
                  }}>
                    {/* Subsection Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h5 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>
                        {getSubsectionLabel(area.areaKey, subsectionKey)}
                      </h5>
                      {isLocked && (
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                           Firmado
                        </span>
                      )}
                    </div>

                    {/* Verdict Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={styles.label}>Juicio de Verificación *</label>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: verificationData.verdict === 'approved' ? '#d1fae5' : t.bgCard,
                          border: `2px solid ${verificationData.verdict === 'approved' ? '#2E7D32' : t.border}`,
                          borderRadius: '8px',
                          cursor: isLocked ? 'default' : 'pointer',
                          opacity: isLocked ? 0.8 : 1
                        }}>
                          <input
                            type="radio"
                            name={`verdict-${area.areaKey}-${subsectionKey}`}
                            checked={verificationData.verdict === 'approved'}
                            onChange={() => handleVerificationChange(area.areaKey, subsectionKey, 'verdict', 'approved')}
                            disabled={isLocked}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: '#065f46', fontWeight: '600' }}> Aprobado</span>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: verificationData.verdict === 'conditional' ? '#fef3c7' : t.bgCard,
                          border: `2px solid ${verificationData.verdict === 'conditional' ? '#C77700' : t.border}`,
                          borderRadius: '8px',
                          cursor: isLocked ? 'default' : 'pointer',
                          opacity: isLocked ? 0.8 : 1
                        }}>
                          <input
                            type="radio"
                            name={`verdict-${area.areaKey}-${subsectionKey}`}
                            checked={verificationData.verdict === 'conditional'}
                            onChange={() => handleVerificationChange(area.areaKey, subsectionKey, 'verdict', 'conditional')}
                            disabled={isLocked}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: '#92400e', fontWeight: '600' }}> Condicional</span>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: verificationData.verdict === 'rejected' ? '#fee2e2' : t.bgCard,
                          border: `2px solid ${verificationData.verdict === 'rejected' ? '#ef4444' : t.border}`,
                          borderRadius: '8px',
                          cursor: isLocked ? 'default' : 'pointer',
                          opacity: isLocked ? 0.8 : 1
                        }}>
                          <input
                            type="radio"
                            name={`verdict-${area.areaKey}-${subsectionKey}`}
                            checked={verificationData.verdict === 'rejected'}
                            onChange={() => handleVerificationChange(area.areaKey, subsectionKey, 'verdict', 'rejected')}
                            disabled={isLocked}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: '#B00020', fontWeight: '600' }}> Rechazado</span>
                        </label>
                      </div>
                    </div>

                    {/* Observations */}
                    <div style={styles.field}>
                      <label style={styles.label}>Observaciones / Resultados</label>
                      <textarea
                        style={{ ...styles.textarea, backgroundColor: isLocked ? t.bg : t.bgCard }}
                        value={verificationData.observations}
                        onChange={(e) => handleVerificationChange(area.areaKey, subsectionKey, 'observations', e.target.value)}
                        placeholder="Describe los resultados de la verificación..."
                        rows={3}
                        disabled={isLocked}
                      />
                    </div>

                    {/* Evidence */}
                    <div style={styles.evidenceSection}>
                      <label style={styles.label}>Evidencia de Verificación</label>
                      {!isLocked && (
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
                            <p style={styles.hint}> Guarda el ECR primero para poder subir evidencia</p>
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
                              {!isLocked && (
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
                          Historial de Revisiones ({verificationData.history.length})
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
                                  {entry.verdict === 'rejected' ? 'Rechazado' :
                                   entry.verdict === 'conditional' ? 'Condicional' : 'Aprobado'}
                                </span>
                                <span style={{ fontSize: '11px', color: t.textMuted }}>
                                  {new Date(entry.signedAt).toLocaleString('es-MX')}
                                </span>
                              </div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: t.text }}>
                                <strong>Por:</strong> {entry.signedByName}
                              </p>
                              {entry.observations && (
                                <p style={{ margin: '4px 0', fontSize: '12px', color: t.textMuted }}>
                                  <strong>Observaciones:</strong> {entry.observations}
                                </p>
                              )}
                              {entry.comments && (
                                <p style={{ margin: 0, fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                                  <strong>Comentarios:</strong> "{entry.comments}"
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
                      backgroundColor: isLocked ? '#d1fae5' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${isLocked ? '#2E7D32' : '#C77700'}`
                    }}>
                      {isLocked ? (
                        <div>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
                             Verificación Firmada
                          </h5>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#065f46' }}>
                            <strong>Firmado por:</strong> {verificationData.signedByName}
                          </p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#065f46' }}>
                            <strong>Fecha:</strong> {new Date(verificationData.signedAt).toLocaleString('es-MX')}
                          </p>
                        </div>
                      ) : (
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
                            disabled={!verificationData.verdict}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: verificationData.verdict ? '#2E7D32' : t.border,
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: verificationData.verdict ? 'pointer' : 'not-allowed'
                            }}
                          >
                             Firmar Verificación
                          </button>
                        </div>
                      )}
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
          <span style={styles.badge}>2. Lecciones Aprendidas</span>
        </h3>

        <div style={styles.field}>
          <label style={styles.label}>Riesgos Detectados</label>
          <textarea
            style={styles.textarea}
            value={formData.detectedRisks}
            onChange={(e) => handleInputChange('detectedRisks', e.target.value)}
            placeholder="Riesgos que se detectaron durante la implementación y que no fueron anticipados..."
            rows={4}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Mejoras Aplicadas</label>
          <textarea
            style={styles.textarea}
            value={formData.appliedImprovements}
            onChange={(e) => handleInputChange('appliedImprovements', e.target.value)}
            placeholder="Mejoras implementadas durante el proceso que pueden replicarse en futuros ECRs..."
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
            3. Estado PPAP
          </span>
        </h3>
        <p style={styles.sectionDescription}>
          Estado del Production Part Approval Process requerido por el cliente
        </p>

        <div style={styles.field}>
          <label style={styles.label}>Nivel de PPAP Requerido *</label>
          <select
            style={styles.select}
            value={formData.ppapStatus.level}
            onChange={(e) => handlePPAPStatusChange('level', e.target.value)}
          >
            <option value="">Seleccionar nivel...</option>
            <option value="not_required"> No Requerido</option>
            <option value="partial"> Partial PPAP (Documentos selectos)</option>
            <option value="full"> Full PPAP (Todos los elementos)</option>
          </select>
        </div>

        {(formData.ppapStatus.level === 'partial' || formData.ppapStatus.level === 'full') && (
          <>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Fecha de Envío al Cliente</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.ppapStatus.submittedDate}
                  onChange={(e) => handlePPAPStatusChange('submittedDate', e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Fecha de Aprobación del Cliente</label>
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
              <label style={styles.label}>Evidencia de PPAP</label>
              <p style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 8px 0' }}>
                Subir documentos PPAP: PSW firmado, documentación de cliente, etc.
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
                <p style={styles.hint}> Guarda el ECR primero para poder subir evidencia</p>
              )}
              {uploadingEvidence === 'ppapEvidence' && (
                <p style={{ fontSize: '13px', color: t.accent, margin: '4px 0 0 0' }}>
                  Subiendo archivos...
                </p>
              )}

              {formData.ppapStatus.evidence.length > 0 && (
                <div style={styles.fileList}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: t.text, margin: '0 0 8px 0' }}>
                    Archivos adjuntos:
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
                   Full PPAP requerido - Asegurar que todos los elementos PPAP estén completos
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
                  ℹ PPAP enviado - Esperando aprobación del cliente
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
                   PPAP aprobado por el cliente
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
              ℹ Este cambio no requiere PPAP según los requerimientos del cliente
            </p>
          </div>
        )}
      </div>

      {/* 3C. Resultados de Producción */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={{ ...styles.badge, backgroundColor: t.accent }}>3C. Resultados de Producción</span>
        </h3>
        <p style={styles.sectionDescription}>
          Métricas de calidad del proceso post-cambio
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>

          {/* ISIR / First Article */}
          <div>
            <label style={styles.label}>ISIR / First Article</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              {['Aprobado', 'Rechazado', 'Pendiente', 'N/A'].map(opt => (
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
            <label style={styles.label}>Scrap Inicial (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.initialScrap}
              onChange={e => setFormData(prev => ({ ...prev, initialScrap: e.target.value }))}
              disabled={isLocked}
              placeholder="Ej: 2.5"
              style={{ ...styles.input, width: '100%' }}
            />
          </div>

          {/* Estabilidad de Proceso */}
          <div>
            <label style={styles.label}>Estabilidad de Proceso (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.processStability}
              onChange={e => setFormData(prev => ({ ...prev, processStability: e.target.value }))}
              disabled={isLocked}
              placeholder="Ej: 95.0"
              style={{ ...styles.input, width: '100%' }}
            />
          </div>

          {/* CP Post-Cambio */}
          <div>
            <label style={styles.label}>
              CP Post-Cambio
              {formData.cpPostChange !== '' && (() => {
                const val = parseFloat(formData.cpPostChange);
                const target = qualityTargets.cpTarget;
                const color = val >= target ? '#166534' : val >= 1.0 ? '#92400e' : '#991b1b';
                const label = val >= target ? '✓ Capaz' : val >= 1.0 ? '⚠ Marginal' : '✗ No capaz';
                return <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '700', color }}>{label}</span>;
              })()}
            </label>
            <input
              type="number" min="0" step="0.001"
              value={formData.cpPostChange}
              onChange={e => setFormData(prev => ({ ...prev, cpPostChange: e.target.value }))}
              disabled={isLocked}
              placeholder="Ej: 1.45"
              style={{
                ...styles.input, width: '100%',
                borderColor: formData.cpPostChange !== '' ? (parseFloat(formData.cpPostChange) >= qualityTargets.cpTarget ? '#166534' : parseFloat(formData.cpPostChange) >= 1.0 ? '#C77700' : '#991b1b') : t.border
              }}
            />
            <p style={{ fontSize: '10px', color: t.textDim, margin: '4px 0 0' }}>Meta: ≥ {qualityTargets.cpTarget}</p>
          </div>

          {/* CPK Post-Cambio */}
          <div>
            <label style={styles.label}>
              CPK Post-Cambio
              {formData.cpkPostChange !== '' && (() => {
                const val = parseFloat(formData.cpkPostChange);
                const target = qualityTargets.cpkTarget;
                const color = val >= target ? '#166534' : val >= 1.0 ? '#92400e' : '#991b1b';
                const label = val >= target ? '✓ Capaz' : val >= 1.0 ? '⚠ Marginal' : '✗ No capaz';
                return <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '700', color }}>{label}</span>;
              })()}
            </label>
            <input
              type="number" min="0" step="0.001"
              value={formData.cpkPostChange}
              onChange={e => setFormData(prev => ({ ...prev, cpkPostChange: e.target.value }))}
              disabled={isLocked}
              placeholder="Ej: 1.45"
              style={{
                ...styles.input, width: '100%',
                borderColor: formData.cpkPostChange !== '' ? (parseFloat(formData.cpkPostChange) >= qualityTargets.cpkTarget ? '#166534' : parseFloat(formData.cpkPostChange) >= 1.0 ? '#C77700' : '#991b1b') : t.border
              }}
            />
            <p style={{ fontSize: '10px', color: t.textDim, margin: '4px 0 0' }}>Meta: ≥ {qualityTargets.cpkTarget}</p>
          </div>

        </div>

        {/* Juicio de Producción */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: formData.productionJudgment === 'OK' ? '#dcfce7' :
                          formData.productionJudgment === 'Condicional' ? '#fef3c7' :
                          formData.productionJudgment === 'NOK' ? '#fee2e2' : '#f9fafb',
          border: `2px solid ${formData.productionJudgment === 'OK' ? '#22c55e' :
                              formData.productionJudgment === 'Condicional' ? '#f59e0b' :
                              formData.productionJudgment === 'NOK' ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '8px'
        }}>
          <label style={{ ...styles.label, fontWeight: '700', marginBottom: '12px', display: 'block' }}>
            Juicio de Resultados de Producción *
          </label>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            {['OK', 'Condicional', 'NOK'].map(opt => (
              <label key={opt} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: formData.productionJudgment === opt ? (
                  opt === 'OK' ? '#166534' : opt === 'Condicional' ? '#92400e' : '#991b1b'
                ) : t.bgCard,
                color: formData.productionJudgment === opt ? 'white' : t.text,
                borderRadius: '6px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                border: `1px solid ${opt === 'OK' ? '#22c55e' : opt === 'Condicional' ? '#f59e0b' : '#ef4444'}`,
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
                {opt === 'OK' ? '✓ ' : opt === 'Condicional' ? '⚠ ' : '✗ '}{opt}
              </label>
            ))}
          </div>

          {/* Comentarios - obligatorio si es Condicional */}
          <div>
            <label style={styles.label}>
              Comentarios {formData.productionJudgment === 'Condicional' && <span style={{ color: '#dc2626' }}>*</span>}
            </label>
            <textarea
              value={formData.productionComments}
              onChange={e => setFormData(prev => ({ ...prev, productionComments: e.target.value }))}
              disabled={isLocked}
              placeholder={formData.productionJudgment === 'Condicional' ?
                'Obligatorio: Justifica las condiciones bajo las cuales se acepta...' :
                'Observaciones adicionales sobre los resultados de producción...'}
              rows={3}
              style={{
                ...styles.input,
                width: '100%',
                resize: 'vertical',
                borderColor: formData.productionJudgment === 'Condicional' && !formData.productionComments?.trim() ? '#dc2626' : t.border
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Cierre Formal */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>4. Cierre Formal</span>
        </h3>

        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #C77700',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
            <strong>Campos obligatorios:</strong> Estos datos son requeridos para enviar el ECR a aprobación.
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
               ¿Requiere auditoría para cerrar?
            </label>
            <span style={{ fontSize: '12px', color: t.textDim }}>
              (Si activas esta opción, podrás definir items a auditar antes del cierre)
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
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600', color: t.text }}>
               Checklist de Auditoría por TFT de Impacto
            </h4>

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
                            + Agregar Item
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
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', width: '120px', whiteSpace: 'nowrap' }}>Item</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '150px' }}>¿Qué verificar?</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>Archivos</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '120px' }}>Comentarios</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>Fecha Límite</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', width: '130px' }}>Auditores</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>Verificado por</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '70px' }}>Estado</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '80px', backgroundColor: '#dbeafe' }}>Juicio Líder</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '120px', backgroundColor: '#fef3c7' }}>Hallazgos Auditor</th>
                                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', width: '100px' }}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {areaItems.map((item, idx) => (
                                <tr key={`${item.id}-${idx}`} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: item.sentToAudit ? '#fffbeb' : t.bgCard }}>
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
                                      {item.id > 0 && !item.auditorCompleted && (
                                        <label style={{ cursor: 'pointer', padding: '4px 8px', backgroundColor: '#e0e7ff', borderRadius: '4px', fontSize: '10px', color: '#4338ca' }}>
                                          + Archivo
                                          <input type="file" style={{ display: 'none' }} onChange={(e) => {
                                            if (e.target.files[0]) uploadClosureAuditItemFile(item.id, e.target.files[0]);
                                          }} />
                                        </label>
                                      )}
                                      {item.id < 0 && <span style={{ fontSize: '9px', color: t.textDim }}>Guarda primero</span>}
                                    </div>
                                  </td>

                                  {/* Leader Comments */}
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <textarea
                                      value={item.comments || ''}
                                      onChange={(e) => updateClosureAuditItem(item.id, 'comments', e.target.value)}
                                      placeholder="Comentarios del líder"
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
                                    {item.dueDate && new Date(item.dueDate) < new Date() && !item.auditorCompleted && (
                                      <span style={{ fontSize: '9px', color: '#B00020', display: 'block', marginTop: '2px' }}> Vencido</span>
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

                                  {/* Verified By */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    {item.auditorCompleted && item.auditedByName ? (
                                      <div style={{ fontSize: '10px' }}>
                                        <div style={{ fontWeight: '600' }}>{item.auditedByName?.split(' ')[0]}</div>
                                        {item.verificationDate && (
                                          <div style={{ color: t.textDim, fontSize: '9px' }}>
                                            {new Date(item.verificationDate).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    ) : item.leaderJudgmentByName ? (
                                      <div style={{ fontSize: '10px' }}>
                                        <div style={{ fontWeight: '600' }}>{item.leaderJudgmentByName?.split(' ')[0]}</div>
                                        {item.leaderJudgmentAt && (
                                          <div style={{ color: t.textDim, fontSize: '9px' }}>
                                            {new Date(item.leaderJudgmentAt).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
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
                                      {item.auditorCompleted ? ' Auditado' : item.sentToAudit ? ' Enviado' : ' Pendiente'}
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
                                      <option value="">Seleccionar</option>
                                      <option value="OK"> OK</option>
                                      <option value="NOK"> NOK</option>
                                      <option value="OBS"> OBS</option>
                                      <option value="NA">— N/A</option>
                                    </select>
                                    {item.leaderJudgmentByName && (
                                      <div style={{ fontSize: '9px', color: t.textDim, marginTop: '4px' }}>
                                        {item.leaderJudgmentByName?.split(' ')[0]}
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
                                          placeholder="Hallazgos del auditor..."
                                          rows={2}
                                          style={{ width: '100%', padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '10px', resize: 'vertical' }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
                                          <input
                                            type="checkbox"
                                            checked={item.auditorCompleted || false}
                                            onChange={(e) => updateClosureAuditItem(item.id, 'auditorCompleted', e.target.checked)}
                                          />
                                          Marcar completado
                                        </label>
                                      </div>
                                    ) : item.auditorCompleted ? (
                                      <div>
                                        {item.auditorJudgment && (
                                          <span style={{
                                            display: 'inline-block', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '700', marginBottom: '4px',
                                            backgroundColor: item.auditorJudgment === 'OK' ? '#dcfce7' : item.auditorJudgment === 'NOK' ? '#fee2e2' : '#fef3c7',
                                            color: item.auditorJudgment === 'OK' ? '#166534' : item.auditorJudgment === 'NOK' ? '#991b1b' : '#92400e'
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
                                        {item.sentToAudit ? 'Esperando auditor...' : 'Notificar para habilitar'}
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
                                          style={{ padding: '3px 8px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title="Ver historial de rondas"
                                        >
                                          Historial
                                        </button>
                                      )}
                                      {/* Re-enviar: TFT líder, enviado, con NOK/OBS en cualquier juicio */}
                                      {isTFTLeader && item.sentToAudit && !item.auditorCompleted &&
                                        (['NOK', 'OBS'].includes(item.leaderJudgment) || ['NOK', 'OBS'].includes(item.auditorJudgment)) && (
                                        <button
                                          onClick={() => resendClosureAuditItem(item)}
                                          style={{ padding: '3px 8px', backgroundColor: '#0369a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title={`Re-enviar a ronda ${(item.auditRound || 1) + 1}`}
                                        >
                                          ↻ Ronda {(item.auditRound || 1) + 1}
                                        </button>
                                      )}
                                      {/* Revertir completado: solo admin */}
                                      {isAdmin && item.auditorCompleted && (
                                        <button
                                          onClick={async () => {
                                            const reason = window.prompt('Motivo del revert (requerido):');
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
                                              showError('Error al revertir el ítem');
                                            }
                                          }}
                                          style={{ padding: '3px 8px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title="Revertir a pendiente (admin)"
                                        >
                                          ↩ Revertir
                                        </button>
                                      )}
                                      {/* Duplicar / Eliminar: solo si no enviado y es líder */}
                                      {isTFTLeader && !item.sentToAudit && (
                                        <button
                                          onClick={() => duplicateClosureAuditItem(item)}
                                          style={{ padding: '3px 8px', backgroundColor: '#0369a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title="Duplicar ítem"
                                        >
                                          + Fila
                                        </button>
                                      )}
                                      {isTFTLeader && !item.sentToAudit && (
                                        <button
                                          onClick={() => deleteClosureAuditItem(item.id)}
                                          style={{ padding: '3px 8px', backgroundColor: '#B00020', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', width: '80px' }}
                                          title="Eliminar ítem"
                                        >
                                          Eliminar
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
                          Sin items. Click en "+ Agregar Item" para definir qué auditar.
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
                backgroundColor: '#e0f2fe',
                borderRadius: '6px',
                display: 'flex',
                gap: '24px',
                fontSize: '13px'
              }}>
                <span> <strong>Total items:</strong> {closureAuditItems.length}</span>
                <span> <strong>Notificados:</strong> {closureAuditItems.filter(i => i.sentToAudit).length}</span>
                <span> <strong>Completados:</strong> {closureAuditItems.filter(i => i.auditorCompleted).length}</span>
                <span style={{ color: closureAuditItems.filter(i => i.auditorJudgment === 'NOK').length > 0 ? '#B00020' : t.textDim }}>
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
                  backgroundColor: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                 Agregar Categoría
              </button>
              {isTFTLeader && (
                <button
                  onClick={notifyAuditors}
                  disabled={!closureAuditItems.some(item => item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: closureAuditItems.some(item => item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0) ? '#0369a1' : t.border,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: closureAuditItems.some(item => item.checkItem && !item.auditorCompleted && item.assignedAuditors?.length > 0) ? 'pointer' : 'not-allowed'
                  }}
                >
                   Notificar Auditores
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Fecha Efectiva de Adopción *</label>
            <input
              type="date"
              style={{
                ...styles.input,
                border: !formData.effectiveDate ? '1px solid #C77700' : `1px solid ${t.border}`
              }}
              value={formData.effectiveDate}
              onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>No. de Lote/Unidad de Adopción *</label>
            <input
              type="text"
              style={{
                ...styles.input,
                border: !formData.adoptionLotNumber ? '1px solid #C77700' : `1px solid ${t.border}`
              }}
              value={formData.adoptionLotNumber || ''}
              onChange={(e) => handleInputChange('adoptionLotNumber', e.target.value)}
              placeholder="Ej: LOT-2026-001, UNIT-12345"
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Notas de Cierre *</label>
          <textarea
            style={{
              ...styles.textarea,
              border: !formData.closureNotes ? '1px solid #C77700' : `1px solid ${t.border}`
            }}
            value={formData.closureNotes}
            onChange={(e) => handleInputChange('closureNotes', e.target.value)}
            placeholder="Comentarios finales sobre el cierre del ECR (resumen de la adopción, observaciones importantes, etc.)"
            rows={4}
          />
        </div>

        {/* Financial Impact Section */}
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: t.text }}>
               Impacto Financiero del ECR
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
              + Agregar Item
            </button>
          </div>

          {(!formData.financialImpact?.items || formData.financialImpact.items.length === 0) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: t.textDim, fontSize: '13px' }}>
              No hay items de impacto financiero. Haz clic en "+ Agregar Item" para registrar costos o ahorros.
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
                        placeholder="Descripción..."
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
                          backgroundColor: '#fee2e2',
                          color: '#B00020',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        title="Eliminar"
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
                  <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>Total Gastos</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#fca5a5' }}>
                    ${(formData.financialImpact?.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>Total Ahorros</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#86efac' }}>
                    -${(formData.financialImpact?.totalSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: t.textDim, marginBottom: '4px' }}>Impacto Neto</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
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
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: t.text, marginBottom: '16px' }}>
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
                data.status === 'closed' ? '#2E7D32' :
                data.status === 'closed_rejected' ? '#7f1d1d' :
                data.status === 'pending_rejected_closure' ? '#dc2626' :
                data.status === 'pending_approval' ? '#C77700' :
                '#6b7280'
            }}>
              {data.status === 'closed' ? ' Cerrado' :
               data.status === 'closed_rejected' ? ' Cerrado como Rechazado' :
               data.status === 'pending_rejected_closure' ? ' Pendiente - NO ADOPTABLE' :
               data.status === 'pending_approval' ? ' Pendiente de Firmas' :
               ' Borrador'}
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
                 ECR Rechazado
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
                El ECR fue rechazado. Revisa los comentarios en el historial y realiza las correcciones necesarias.
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
                 CIERRE COMO NO ADOPTABLE - Pendiente de Firmas
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                Este ECR será cerrado como NO ADOPTABLE. Los aprobadores deben confirmar el rechazo del cambio.
              </p>
              {data.rejectionReason && (
                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Motivo:</p>
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
                 ECR Cerrado como RECHAZADO
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                Este ECR ha sido cerrado como rechazado. Todas las firmas de rechazo han sido completadas.
              </p>
              {data.rejectionReason && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Motivo del rechazo:</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b' }}>{data.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Pending closure - draft (not yet sent for approval) */}
          {(data.status === 'pending_closure' || data.status === 'draft') && formData.closureApprovalStatus === 'draft' && (() => {
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
                       CIERRE COMO RECHAZADO
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                      Este ECR será cerrado como RECHAZADO. Los aprobadores deberán firmar el rechazo.
                    </p>
                    {/* Rejection Reason Field */}
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '6px' }}>
                        Motivo del Rechazo *
                      </label>
                      <textarea
                        value={formData.rejectionReason}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, rejectionReason: e.target.value }));
                          onDataUpdate({ rejectionReason: e.target.value });
                        }}
                        placeholder="Explique por qué este ECR debe cerrarse como rechazado (ej: no hay presupuesto, no es viable técnicamente, el cliente no lo aprobó, etc.)"
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
                       Cierre Rechazado
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#991b1b' }}>
                      Rechazado por <strong>{lastHistoryEntry.userName}</strong> en {lastHistoryEntry.level?.replace('level', 'Nivel ')}.
                    </p>
                    {lastHistoryEntry.notes && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#fff',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px'
                      }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Motivo:</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b' }}>{lastHistoryEntry.notes}</p>
                      </div>
                    )}
                    <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Realiza las correcciones necesarias y re-envía a aprobación. El cierre irá directamente al nivel que rechazó.
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
                        {isClosingAsRejected ? ' Enviar para Cierre como Rechazado' : (wasRejected ? ' Re-enviar a Aprobación de Cierre' : ' Enviar a Aprobación de Cierre')}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })()}

        </div>

        {/* Approval Flow - Visual Chain (always visible like ECR-3) */}
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '600', color: t.text, marginBottom: '16px' }}>
            Flujo de Aprobación de Cierre
          </h4>

          {approverLevels.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#fef3c7',
              border: '2px dashed #C77700',
              borderRadius: '8px',
              color: '#92400e'
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}> No hay aprobadores definidos</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                Regresa a ECR-2B y asigna los aprobadores
              </p>
            </div>
          ) : (
            <>
              {/* Horizontal Flow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {approverLevels.map((level, index) => {
                  const approverUser = getUserById(approvers[level.key]);
                  const signature = formData.closureSignatures[level.key];
                  const isSigned = signature?.signedBy;
                  const previousLevelPending = index > 0 && !formData.closureSignatures[approverLevels[index - 1].key]?.signedBy;

                  // Determine status - if closure not sent for approval yet, all show 'not_started'
                  let status = 'not_started';
                  if (isSigned) status = 'approved';
                  else if (formData.closureApprovalStatus === 'pending' && (index === 0 || !previousLevelPending)) status = 'pending';

                  const statusStyle = {
                    approved: { bg: '#dcfce7', border: '#22c55e', color: '#166534', text: 'Firmado' },
                    pending: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e', text: 'Pendiente' },
                    not_started: { bg: '#f3f4f6', border: '#d1d5db', color: '#6b7280', text: 'Esperando' }
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
                          fontWeight: '700',
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
                              {new Date(signature.signedAt).toLocaleDateString('es-MX')}
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
                  const signature = formData.closureSignatures[level.key];
                  const isSigned = signature?.signedBy;
                  const previousLevelPending = index > 0 && !formData.closureSignatures[approverLevels[index - 1].key]?.signedBy;
                  return !isSigned && !previousLevelPending && canSignClosure(level.key);
                });

                if (!currentPendingLevel) return null;

                const approverUser = getUserById(approvers[currentPendingLevel.key]);

                const validationStatus = getClosureValidationStatus();

                return (
                  <div style={{
                    padding: '16px',
                    backgroundColor: validationStatus.canApprove ? '#eff6ff' : '#fef3c7',
                    border: `2px solid ${validationStatus.canApprove ? '#3b82f6' : '#C77700'}`,
                    borderRadius: '8px'
                  }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.text }}>
                      <strong>{approverUser?.firstName} {approverUser?.lastName}</strong> - Es tu turno de firmar el cierre
                    </p>

                    {/* Show validation errors if any */}
                    {!validationStatus.canApprove && (
                      <div style={{
                        marginBottom: '12px',
                        padding: '12px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px'
                      }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#991b1b' }}>
                           No se puede aprobar el cierre. Pendientes:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#7f1d1d' }}>
                          {validationStatus.errors.slice(0, 5).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {validationStatus.errors.length > 5 && (
                            <li>...y {validationStatus.errors.length - 5} más</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {formData.closureApprovalStatus === 'pending' ? (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => {
                            setClosureApprovalLevel(currentPendingLevel.key);
                            setShowClosureApprovalModal(true);
                          }}
                          disabled={!validationStatus.canApprove}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: validationStatus.canApprove ? '#2E7D32' : '#9ca3af',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: validationStatus.canApprove ? 'pointer' : 'not-allowed',
                            opacity: validationStatus.canApprove ? 1 : 0.7
                          }}
                        >
                           Revisar y Aprobar/Rechazar
                        </button>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#C77700', fontStyle: 'italic' }}>
                         El cierre debe ser enviado a aprobación primero
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

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
             ECR Cerrado como Rechazado
          </h3>
          <p style={{ margin: '0 0 8px 0', color: '#fecaca', fontSize: '14px' }}>
            Este ECR fue cerrado definitivamente y no puede ser modificado.
          </p>
          {data.closedByName && (
            <p style={{ margin: 0, color: '#fecaca', fontSize: '13px' }}>
              Cerrado por: {data.closedByName} - {data.closedAt ? new Date(data.closedAt).toLocaleString('es-MX') : ''}
            </p>
          )}
          {data.closureReason && (
            <p style={{ margin: '8px 0 0 0', color: 'white', fontSize: '14px', fontStyle: 'italic' }}>
              Motivo: "{data.closureReason}"
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
               Agregar Item de Auditoría
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
                O crea un item personalizado:
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Nombre del item..."
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
                  Agregar
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
                Cerrar
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
               Historial de Auditoría - {historyData.itemName}
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
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>Ronda {h.auditRound}</span>
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
                        <span> Auditado por: <strong>{h.auditedByName}</strong></span>
                      )}
                      {h.verificationDate && (
                        <span>{new Date(h.verificationDate).toLocaleDateString('es-MX')}</span>
                      )}
                      {h.closedByName && (
                        <span>Cerrado por: {h.closedByName}</span>
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

      {/* Closure Approval Modal - Same style as ECR-3 */}
      {showClosureApprovalModal && closureApprovalLevel && (
        <ClosureApprovalModalContent
          t={t}
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
    backgroundColor: '#d1fae5',
    color: '#065f46',
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
    backgroundColor: '#2E7D32',
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
    color: '#C77700',
    margin: '8px 0'
  },
  completionBanner: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#d1fae5',
    border: '2px solid #2E7D32',
    borderRadius: '8px',
    textAlign: 'center'
  },
  completionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#065f46',
    margin: '0 0 8px 0'
  },
  completionText: {
    fontSize: '14px',
    color: '#2E7D32',
    margin: 0
  }
}); }

export default ECRClosure;
