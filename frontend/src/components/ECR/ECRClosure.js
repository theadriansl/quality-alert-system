import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import { isUserAdmin } from '../../utils/permissions';

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

const ECRClosure = ({ data, onDataUpdate, isLocked = false, isAdmin = false }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(null);

  // Audit states
  const [auditors, setAuditors] = useState([]);
  const [auditItems, setAuditItems] = useState([]);
  const [sendingToAudit, setSendingToAudit] = useState(false);
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
    cpkPostChange: data.cpkPostChange || '',
    productionEvidence: data.productionEvidence || [],

    // PPAP Status (IATF 8.3.5.2)
    ppapStatus: data.ppapStatus || {
      level: '',
      submittedDate: '',
      approvedDate: '',
      evidence: []
    },

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
  }, []);

  // Load auditors and existing audit requests
  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const token = localStorage.getItem('token');
        // Get auditors
        const auditorsRes = await axios.get('http://localhost:5000/audit/auditors', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuditors(auditorsRes.data.auditors || []);

        // Get existing audit requests for this ECR
        if (data.id) {
          const requestsRes = await axios.get(`http://localhost:5000/audit/requests?sourceType=ECR&sourceId=${data.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAuditRequests(requestsRes.data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching audit data:', error);
      }
    };
    fetchAuditData();
  }, [data.id]);

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
              checkItem: `Verificar implementación de ${subsectionKey} en área ${area.areaName}`,
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

  // Send to audit function
  const sendToAuditRequest = async () => {
    const itemsToSend = auditItems.filter(item =>
      !item.sentToAudit &&
      item.assignedAuditors &&
      item.assignedAuditors.length > 0
    );

    if (itemsToSend.length === 0) {
      showError('No hay items con auditores asignados para enviar');
      return;
    }

    if (!window.confirm(`¿Enviar ${itemsToSend.length} item(s) a solicitud de auditoría?`)) {
      return;
    }

    setSendingToAudit(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/audit/requests',
        {
          sourceType: 'ECR',
          sourceId: data.id,
          sourceNumber: data.ecrNumber || `ECR-${data.id}`,
          items: itemsToSend.map(item => ({
            name: item.name,
            checkItem: item.checkItem,
            comments: `Área: ${item.areaName}, Subsección: ${item.subsectionKey}`,
            dueDate: item.dueDate || null,
            assignedAuditors: item.assignedAuditors
          }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showSuccess(`${itemsToSend.length} item(s) enviados a auditoría`);
        // Update local state
        setAuditItems(prev => prev.map(item =>
          itemsToSend.find(i => i.id === item.id)
            ? { ...item, sentToAudit: true }
            : item
        ));
        // Reload audit requests
        const requestsRes = await axios.get(`http://localhost:5000/audit/requests?sourceType=ECR&sourceId=${data.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuditRequests(requestsRes.data.requests || []);
      }
    } catch (error) {
      console.error('Error sending to audit:', error);
      showError('Error al enviar a auditoría');
    } finally {
      setSendingToAudit(false);
    }
  };

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
          const request = auditRequests.find(r => r.itemName === item.name);
          return {
            ...item,
            sentToAudit: !!request,
            auditRequestId: request?.id || null,
            auditorCompleted: request?.status === 'completed',
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
    if (!window.confirm(`¿Re-enviar "${item.name}" a auditoría? Se incrementará la ronda.`)) return;

    const newRound = (item.auditRound || 1) + 1;

    // Save current state to history before resending
    setSendingToAudit(true);
    try {
      const token = localStorage.getItem('token');

      // Update item with new round and reset audit status
      const updatedItem = {
        ...item,
        auditRound: newRound,
        sentToAudit: false,
        auditorCompleted: false,
        auditorJudgment: '',
        auditorComments: ''
      };

      setClosureAuditItems(prev => prev.map(i =>
        i.id === item.id ? updatedItem : i
      ));

      showSuccess(`Item preparado para ronda ${newRound}. Asigna auditores y envía.`);
    } catch (error) {
      console.error('Error resending item:', error);
      showError('Error al preparar re-envío');
    } finally {
      setSendingToAudit(false);
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

  // Send closure audit items to audit request
  const sendClosureAuditToRequest = async () => {
    const itemsToSend = closureAuditItems.filter(item =>
      item.checkItem &&
      !item.sentToAudit &&
      item.assignedAuditors &&
      item.assignedAuditors.length > 0
    );

    if (itemsToSend.length === 0) {
      showError('No hay items con auditores asignados para enviar');
      return;
    }

    if (!window.confirm(`¿Enviar ${itemsToSend.length} item(s) a solicitud de auditoría?`)) {
      return;
    }

    setSendingToAudit(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/audit/requests',
        {
          sourceType: 'ECR',
          sourceId: data.id,
          sourceNumber: data.ecrNumber || `ECR-${data.id}`,
          items: itemsToSend.map(item => ({
            name: item.name || `Item ${Math.abs(item.id)}`,
            checkItem: item.checkItem,
            comments: item.comments || '',
            dueDate: item.dueDate || null,
            assignedAuditors: item.assignedAuditors,
            ecrClosureAuditItemId: item.id > 0 ? item.id : null // Only send if saved in DB
          }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showSuccess(`${itemsToSend.length} item(s) enviados a auditoría`);
        // Update local state
        setClosureAuditItems(prev => prev.map(item =>
          itemsToSend.find(i => i.id === item.id)
            ? { ...item, sentToAudit: true }
            : item
        ));
        // Reload audit requests
        const requestsRes = await axios.get(`http://localhost:5000/audit/requests?sourceType=ECR&sourceId=${data.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuditRequests(requestsRes.data.requests || []);
      }
    } catch (error) {
      console.error('Error sending to audit:', error);
      showError('Error al enviar a auditoría');
    } finally {
      setSendingToAudit(false);
    }
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
      setClosureAuditItems([...DEFAULT_CLOSURE_AUDIT_ITEMS]);
    }
  }, [formData.requiresClosureAudit, data.closureAuditItems?.length]);

  // Reset ref when requiresClosureAudit is disabled
  useEffect(() => {
    if (!formData.requiresClosureAudit) {
      defaultsInitializedRef.current = false;
    }
  }, [formData.requiresClosureAudit]);

  // Sync data from backend changes
  // Track what we've synced to prevent overwriting user edits
  const lastSyncedDataRef = useRef({ id: null, effectiveDate: null, adoptionLotNumber: null });

  useEffect(() => {
    if (!data.id) return;

    // Check if this is new data from backend (not user edits)
    const isNewECR = lastSyncedDataRef.current.id !== data.id;
    const hasNewEffectiveDate = data.effectiveDate && lastSyncedDataRef.current.effectiveDate !== data.effectiveDate;
    const hasNewLotNumber = data.adoptionLotNumber && lastSyncedDataRef.current.adoptionLotNumber !== data.adoptionLotNumber;

    if (isNewECR || hasNewEffectiveDate || hasNewLotNumber) {
      // Update ref with current backend values
      lastSyncedDataRef.current = {
        id: data.id,
        effectiveDate: data.effectiveDate,
        adoptionLotNumber: data.adoptionLotNumber
      };

      setFormData(prev => ({
        ...prev,
        impactVerifications: initializeVerifications(),
        ppapStatus: data.ppapStatus || prev.ppapStatus,
        detectedRisks: data.detectedRisks || prev.detectedRisks,
        appliedImprovements: data.appliedImprovements || prev.appliedImprovements,
        closureSignatures: data.closureSignatures || prev.closureSignatures,
        rejectionSignatures: data.rejectionSignatures || prev.rejectionSignatures,
        rejectionReason: data.rejectionReason || prev.rejectionReason,
        effectiveDate: formatDateForInput(data.effectiveDate) || prev.effectiveDate,
        adoptionLotNumber: data.adoptionLotNumber || prev.adoptionLotNumber,
        closureNotes: data.closureNotes || prev.closureNotes,
        financialImpact: data.financialImpact || prev.financialImpact,
        requiresClosureAudit: data.requiresClosureAudit ?? prev.requiresClosureAudit
      }));
    }
  }, [data.id, data.effectiveDate, data.adoptionLotNumber, data.closureNotes, data.financialImpact, data.requiresClosureAudit]);

  // Update parent when data changes - include closureAuditItems
  // Skip if we just loaded items from parent to prevent loop
  useEffect(() => {
    if (closureItemsLoadedRef.current) {
      // Data was just loaded from parent, don't sync back yet
      return;
    }
    onDataUpdate({
      ...formData,
      closureAuditItems: closureAuditItems
    });
  }, [formData, closureAuditItems]);

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
        '• El área quedará disponible para correcciones\n' +
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

  const handleSignClosure = async (levelKey, action = 'approved') => {
    const currentUser = getCurrentUser();
    const assignedApproverId = approvers[levelKey];
    const userIsAdmin = isAdmin || isUserAdmin(currentUser);

    // Check if current user is the assigned approver or admin
    if (currentUser.id !== assignedApproverId && !userIsAdmin) {
      showError('Solo el aprobador asignado puede firmar este nivel');
      return;
    }

    const isRejection = action === 'rejected';
    let rejectionNotes = '';

    if (isRejection) {
      rejectionNotes = window.prompt(
        ' RECHAZO DE ECR\n\n' +
        'Por favor, ingrese el motivo del rechazo:\n' +
        '(Este motivo será registrado en el historial)'
      );
      if (!rejectionNotes) {
        showError('Debe ingresar un motivo para rechazar');
        return;
      }
    }

    const confirmMessage = isRejection
      ? ' ATENCIÓN\n\n' +
        'Al rechazar:\n' +
        '• El ECR volverá a estado editable\n' +
        '• Se registrará el motivo del rechazo\n\n' +
        '¿Está seguro de que desea RECHAZAR este ECR?'
      : ' ATENCIÓN\n\n' +
        'Al aprobar:\n' +
        '• Su firma quedará registrada permanentemente\n' +
        '• Esta acción no se puede deshacer\n\n' +
        '¿Está seguro de que desea APROBAR este nivel?';

    const confirmed = window.confirm(confirmMessage);

    if (confirmed) {
      const now = new Date().toISOString();
      const assignedUser = users.find(u => u.id === assignedApproverId);

      // Add to approval history
      const historyEntry = {
        action: action,
        userId: currentUser.id,
        userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        timestamp: now,
        level: levelKey,
        notes: isRejection ? rejectionNotes : `Nivel ${levelKey} aprobado`,
        onBehalfOf: userIsAdmin && currentUser.id !== assignedApproverId
          ? `${assignedUser?.firstName || ''} ${assignedUser?.lastName || ''}`.trim()
          : null
      };

      const newHistory = [...(data.approvalHistory || []), historyEntry];

      if (isRejection) {
        // Rejection: clear signatures and set status back to draft
        const rejectionData = {
          closureSignatures: {},
          approvalHistory: newHistory,
          status: 'draft'
        };

        setFormData(prev => ({
          ...prev,
          ...rejectionData
        }));

        // Save rejection to backend immediately
        try {
          const token = localStorage.getItem('token');
          await axios.put(`http://localhost:5000/ecr/reports/${data.id}`, rejectionData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          showSuccess('ECR rechazado y devuelto a borrador. El solicitante podrá hacer correcciones.');
          // Reload page to reflect changes
          window.location.reload();
        } catch (error) {
          console.error('Error saving rejection:', error);
          showError('Error al guardar el rechazo');
        }
      } else {
        // Approval: add signature
        setFormData(prev => ({
          ...prev,
          closureSignatures: {
            ...prev.closureSignatures,
            [levelKey]: {
              signedBy: currentUser.id,
              signedByName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
              signedAt: now,
              action: 'approved'
            }
          },
          approvalHistory: newHistory
        }));
        showSuccess('Nivel aprobado exitosamente');
      }
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

      const newHistory = [...(data.approvalHistory || []), historyEntry];

      if (isRejectingRejection) {
        // Cancel rejection: clear signatures and set status back to draft
        const cancelData = {
          rejectionSignatures: {},
          approvalHistory: newHistory,
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
          approvalHistory: newHistory,
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
        approvalHistory: [...(data.approvalHistory || []), historyEntry],
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-4: Cierre y Verificación</h2>
        <p style={styles.subtitle}>
          Verificación de que las áreas de impacto identificadas no presentaron afectaciones
        </p>
      </div>

      {/* 1. Verificación de Áreas de Impacto (Dynamic from ECR-2B) */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>1. Verificación de Áreas de Impacto</span>
        </h3>
        <p style={styles.sectionDescription}>
          Verifica cada área y subsección identificada en ECR-2B. Confirma que no hubo afectación y proporciona evidencia.
        </p>

        {impactedAreas.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No hay áreas de impacto seleccionadas en ECR-2B</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: t.textMuted }}>
              Regresa a ECR-2B y selecciona las áreas afectadas
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

      {/* 3B. Estado PPAP (IATF 8.3.5.2) */}
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
            3. Estado PPAP (IATF 8.3.5.2)
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
               Checklist de Auditoría por Área de Impacto
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
                   No hay áreas de impacto definidas en ECR-2B. Define las áreas de impacto primero.
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
                              {areaItems.map(item => (
                                <tr key={item.id} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: item.sentToAudit ? '#fffbeb' : t.bgCard }}>
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
                                      disabled={item.sentToAudit && item.auditorCompleted}
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
                                      disabled={item.auditorCompleted}
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
                                      disabled={item.sentToAudit && item.auditorCompleted}
                                      style={{ padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', width: '100%' }}
                                    />
                                    {item.dueDate && new Date(item.dueDate) < new Date() && !item.auditorCompleted && (
                                      <span style={{ fontSize: '9px', color: '#B00020', display: 'block', marginTop: '2px' }}> Vencido</span>
                                    )}
                                  </td>

                                  {/* Auditors */}
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    {!item.auditorCompleted ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {item.assignedAuditorsInfo?.map(a => (
                                          <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 6px', backgroundColor: '#dbeafe', borderRadius: '10px', fontSize: '10px' }}>
                                            {a.name?.split(' ')[0]}
                                            <button type="button" onClick={() => {
                                              const newIds = (item.assignedAuditors || []).filter(id => id !== a.id);
                                              const newInfo = (item.assignedAuditorsInfo || []).filter(info => info.id !== a.id);
                                              updateClosureAuditItemMultiple(item.id, { assignedAuditors: newIds, assignedAuditorsInfo: newInfo });
                                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '10px', color: '#B00020' }}>×</button>
                                          </span>
                                        ))}
                                        <select
                                          value=""
                                          onChange={(e) => {
                                            if (!e.target.value) return;
                                            const auditorId = parseInt(e.target.value);
                                            const auditor = auditors.find(a => a.id === auditorId);
                                            if (auditor && !(item.assignedAuditors || []).includes(auditorId)) {
                                              updateClosureAuditItemMultiple(item.id, {
                                                assignedAuditors: [...(item.assignedAuditors || []), auditorId],
                                                assignedAuditorsInfo: [...(item.assignedAuditorsInfo || []), { id: auditor.id, name: `${auditor.firstName} ${auditor.lastName}`, email: auditor.email }]
                                              });
                                            }
                                          }}
                                          style={{ padding: '4px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '10px' }}
                                        >
                                          <option value="">+ Auditor</option>
                                          {auditors.filter(a => !(item.assignedAuditors || []).includes(a.id)).map(a => (
                                            <option key={a.id} value={a.id}>{a.firstName} {a.lastName?.charAt(0)}.</option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: t.textDim }}>
                                        {item.assignedAuditorsInfo?.map(a => a.name?.split(' ')[0]).join(', ')}
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
                                      onChange={(e) => updateClosureAuditItem(item.id, 'leaderJudgment', e.target.value)}
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
                                  </td>

                                  {/* Auditor Findings */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', backgroundColor: '#fffbeb' }}>
                                    {item.auditorCompleted ? (
                                      <div>
                                        {item.auditorJudgment && (
                                          <span style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            marginBottom: '4px',
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
                                        Pendiente de auditoría
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                      {/* Re-send button - show if completed with NOK/OBS */}
                                      {item.auditorCompleted && (item.auditorJudgment === 'NOK' || item.auditorJudgment === 'OBS') && (
                                        <button
                                          onClick={() => resendClosureAuditItem(item)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                          title="Re-enviar a auditoría"
                                        >
                                          ↻
                                        </button>
                                      )}
                                      {/* History button - show if has rounds > 1 */}
                                      {item.auditRound > 1 && (
                                        <button
                                          onClick={() => openHistoryModal(item)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                          title="Ver historial"
                                        >
                                          
                                        </button>
                                      )}
                                      {/* Duplicate button */}
                                      {!item.sentToAudit && (
                                        <button
                                          onClick={() => duplicateClosureAuditItem(item)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                          title="Duplicar item"
                                        >
                                          
                                        </button>
                                      )}
                                      {/* Delete button */}
                                      {!item.sentToAudit && (
                                        <button
                                          onClick={() => deleteClosureAuditItem(item.id)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px', color: '#B00020' }}
                                          title="Eliminar"
                                        >
                                          
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
                <span> <strong>Enviados:</strong> {closureAuditItems.filter(i => i.sentToAudit).length}</span>
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
              <button
                onClick={sendClosureAuditToRequest}
                disabled={sendingToAudit || !closureAuditItems.some(item => item.checkItem && !item.sentToAudit && item.assignedAuditors?.length > 0)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: closureAuditItems.some(item => item.checkItem && !item.sentToAudit && item.assignedAuditors?.length > 0) ? '#ef4444' : t.border,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: closureAuditItems.some(item => item.checkItem && !item.sentToAudit && item.assignedAuditors?.length > 0) ? 'pointer' : 'not-allowed'
                }}
              >
                {sendingToAudit ? ' Enviando...' : ' Enviar a Solicitud de Auditoría'}
              </button>
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

        {/* Signatures Section - Based on ECR-2B Approvers */}
        <div style={styles.signaturesSection}>
          <h4 style={styles.signaturesTitle}>Firmas de Cierre (Aprobadores de ECR-2B)</h4>

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
                Regresa a ECR-2B y asigna los aprobadores en el Resumen del Flujo de Aprobación
              </p>
            </div>
          ) : (
            approverLevels.map((level, index) => {
              const approverUser = getUserById(approvers[level.key]);
              const signature = formData.closureSignatures[level.key];
              const isSigned = signature?.signedBy;
              const canSign = canSignClosure(level.key);

              // Check if previous level is pending
              const previousLevelPending = index > 0 && !formData.closureSignatures[approverLevels[index - 1].key]?.signedBy;

              return (
                <div key={level.key} style={{
                  ...styles.signatureCard,
                  backgroundColor: isSigned ? '#f0fdf4' : t.bgCard,
                  border: isSigned ? '2px solid #2E7D32' : `2px solid ${t.border}`
                }}>
                  <div style={styles.signatureHeader}>
                    <h5 style={styles.signatureRole}>
                      {level.icon} {level.label}: {approverUser?.firstName} {approverUser?.lastName}
                    </h5>
                    {isSigned ? (
                      <span style={{...styles.statusBadge, backgroundColor: '#2E7D32'}}>
                         Firmado
                      </span>
                    ) : (
                      <span style={{...styles.statusBadge, backgroundColor: t.textDim}}>
                        Pendiente
                      </span>
                    )}
                  </div>

                  {isSigned ? (
                    <div style={styles.signatureInfo}>
                      <p style={styles.signedBy}>
                        <strong>Firmado por:</strong> {signature.signedByName}
                      </p>
                      <p style={styles.signedAt}>
                        <strong>Fecha:</strong> {new Date(signature.signedAt).toLocaleString('es-MX')}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={styles.signatureDescription}>
                        El aprobador debe confirmar el cierre formal del ECR
                      </p>
                      {previousLevelPending && (
                        <p style={styles.warningText}>
                           El nivel anterior debe firmar primero
                        </p>
                      )}
                      {canSign && data.status === 'pending_approval' && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                          <button
                            onClick={() => handleSignClosure(level.key, 'approved')}
                            style={{...styles.signButton, backgroundColor: '#2E7D32'}}
                          >
                             Aprobar
                          </button>
                          <button
                            onClick={() => handleSignClosure(level.key, 'rejected')}
                            style={{...styles.signButton, backgroundColor: '#ef4444'}}
                          >
                             Rechazar
                          </button>
                        </div>
                      )}
                      {canSign && data.status === 'draft' && (
                        <p style={{ fontSize: '12px', color: '#C77700', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                           El ECR debe ser enviado a aprobación primero
                        </p>
                      )}
                      {!canSign && !previousLevelPending && (
                        <p style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic', margin: '8px 0 0 0' }}>
                          Solo {approverUser?.firstName} {approverUser?.lastName} puede firmar este nivel
                          {isAdmin && ' (o un administrador)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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

      {/* 5. Cierre como Rechazado (Alternative flow) */}
      {!isFullyCompleted && data.status !== 'closed_rejected' && data.status !== 'approved' && data.status !== 'completed' && (
        <div style={{...styles.section, backgroundColor: '#fef2f2', border: '2px solid #fecaca'}}>
          <h3 style={{...styles.sectionTitle, color: '#991b1b'}}>
            <span style={{...styles.badge, backgroundColor: '#B00020', color: 'white'}}>Opción: Cierre como Rechazado</span>
          </h3>
          <p style={{ fontSize: '14px', color: '#7f1d1d', marginBottom: '16px' }}>
            Si este ECR no puede ser adoptado (falta de presupuesto, no viable técnicamente, etc.),
            los aprobadores pueden firmar el cierre como RECHAZADO. Cualquier nivel puede rechazar el rechazo
            si considera que el ECR sí debe aprobarse.
          </p>

          {/* Rejection Reason */}
          <div style={styles.field}>
            <label style={{...styles.label, color: '#991b1b'}}>Motivo del Rechazo *</label>
            <textarea
              style={{...styles.textarea, border: '1px solid #fca5a5'}}
              value={formData.rejectionReason}
              onChange={(e) => handleInputChange('rejectionReason', e.target.value)}
              placeholder="Explique por qué este ECR debe cerrarse como rechazado (ej: no hay presupuesto, no es viable técnicamente, el cliente no lo aprobó, etc.)"
              rows={3}
            />
          </div>

          {/* Rejection Signatures */}
          {formData.rejectionReason && formData.rejectionReason.trim() && (
            <div style={{...styles.signaturesSection, backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px'}}>
              <h4 style={{...styles.signaturesTitle, color: '#991b1b'}}>Firmas de Rechazo</h4>
              <p style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '16px' }}>
                Los mismos aprobadores deben confirmar el rechazo. Cualquier nivel puede "Rechazar el Rechazo"
                si considera que el ECR sí debe aprobarse.
              </p>

              {approverLevels.map((level, index) => {
                const approverUser = getUserById(approvers[level.key]);
                const signature = formData.rejectionSignatures[level.key];
                const isSigned = signature?.signedBy;
                const canSign = canSignRejection(level.key);

                // Check if previous level is pending
                const previousLevelPending = index > 0 && !formData.rejectionSignatures[approverLevels[index - 1].key]?.signedBy;

                return (
                  <div key={level.key} style={{
                    ...styles.signatureCard,
                    backgroundColor: isSigned ? '#fecaca' : t.bgCard,
                    border: isSigned ? '2px solid #B00020' : `2px solid ${t.border}`
                  }}>
                    <div style={styles.signatureHeader}>
                      <h5 style={styles.signatureRole}>
                        {level.icon} {level.label}: {approverUser?.firstName} {approverUser?.lastName}
                      </h5>
                      {isSigned ? (
                        <span style={{...styles.statusBadge, backgroundColor: '#B00020'}}>
                           Rechazo Firmado
                        </span>
                      ) : (
                        <span style={{...styles.statusBadge, backgroundColor: t.textDim}}>
                          Pendiente
                        </span>
                      )}
                    </div>

                    {isSigned ? (
                      <div style={styles.signatureInfo}>
                        <p style={styles.signedBy}>
                          <strong>Firmado por:</strong> {signature.signedByName}
                        </p>
                        <p style={styles.signedAt}>
                          <strong>Fecha:</strong> {new Date(signature.signedAt).toLocaleString('es-MX')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={styles.signatureDescription}>
                          El aprobador debe confirmar el rechazo del ECR o rechazar el rechazo si considera que debe aprobarse
                        </p>
                        {previousLevelPending && (
                          <p style={styles.warningText}>
                             El nivel anterior debe firmar primero
                          </p>
                        )}
                        {canSign && data.status === 'pending_approval' && (
                          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button
                              onClick={() => handleSignRejection(level.key, 'approved')}
                              style={{...styles.signButton, backgroundColor: '#B00020'}}
                            >
                               Confirmar Rechazo
                            </button>
                            <button
                              onClick={() => handleSignRejection(level.key, 'rejected')}
                              style={{...styles.signButton, backgroundColor: '#C77700'}}
                            >
                              ↩ No Rechazar - Devolver a Revisión
                            </button>
                          </div>
                        )}
                        {canSign && data.status === 'draft' && (
                          <p style={{ fontSize: '12px', color: '#C77700', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                             El ECR debe ser enviado a aprobación primero
                          </p>
                        )}
                        {!canSign && !previousLevelPending && (
                          <p style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic', margin: '8px 0 0 0' }}>
                            Solo {approverUser?.firstName} {approverUser?.lastName} puede firmar este nivel
                            {isAdmin && ' (o un administrador)'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rejection Completion Status */}
          {isFullyRejected && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: '#7f1d1d',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '18px' }}>
                 ECR Cerrado como Rechazado
              </h3>
              <p style={{ margin: 0, color: '#fecaca', fontSize: '14px' }}>
                Todos los niveles han confirmado el rechazo de este ECR
              </p>
            </div>
          )}
        </div>
      )}

      {/* Approval History Section */}
      {(data.approvalHistory && data.approvalHistory.length > 0) && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}> Historial de Aprobaciones</h3>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '8px',
            border: `1px solid ${t.border}`,
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: t.bg }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, fontWeight: '600' }}>Acción</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, fontWeight: '600' }}>Usuario</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, fontWeight: '600' }}>Fecha y Hora</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, fontWeight: '600' }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {data.approvalHistory.map((entry, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: entry.action === 'submitted' ? '#dbeafe' :
                                       entry.action === 'approved' ? '#d1fae5' :
                                       entry.action === 'rejected' ? '#fee2e2' :
                                       entry.action === 'closed_rejected' ? '#7f1d1d' :
                                       entry.action === 'rejection_approved' ? '#fecaca' :
                                       entry.action === 'rejection_cancelled' ? '#bbf7d0' : t.bgPanel,
                        color: entry.action === 'submitted' ? t.accent :
                               entry.action === 'approved' ? '#2E7D32' :
                               entry.action === 'rejected' ? '#B00020' :
                               entry.action === 'closed_rejected' ? t.bgCard :
                               entry.action === 'rejection_approved' ? '#991b1b' :
                               entry.action === 'rejection_cancelled' ? '#166534' : t.textMuted
                      }}>
                        {entry.action === 'submitted' && ' Enviado'}
                        {entry.action === 'approved' && ' Aprobado'}
                        {entry.action === 'rejected' && ' Rechazado'}
                        {entry.action === 'closed_rejected' && ' Cerrado Rechazado'}
                        {entry.action === 'rejection_approved' && ' Rechazo Confirmado'}
                        {entry.action === 'rejection_cancelled' && '↩ Devuelto a Revisión'}
                        {!['submitted', 'approved', 'rejected', 'closed_rejected', 'rejection_approved', 'rejection_cancelled'].includes(entry.action) && entry.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{entry.userName}</td>
                    <td style={{ padding: '12px', color: t.textMuted }}>
                      {new Date(entry.timestamp).toLocaleString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px', color: t.textMuted, maxWidth: '300px' }}>{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                 Área: <strong>{currentImpactArea.areaName}</strong> - {currentImpactArea.subsection}
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
                      <p style={{ fontSize: '13px', color: t.text, margin: '0 0 8px 0' }}>
                        {h.auditorComments}
                      </p>
                    )}
                    <p style={{ fontSize: '11px', color: t.textDim, margin: 0 }}>
                      {h.auditedByName && `Por: ${h.auditedByName} • `}
                      {h.verificationDate && new Date(h.verificationDate).toLocaleDateString('es-MX')}
                    </p>
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
