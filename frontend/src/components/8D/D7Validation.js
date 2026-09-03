import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { isUserAdmin } from '../../utils/permissions';

const D7Validation = ({
  reportId,
  data,
  onSave,
  isBlocked,
  currentUser,
  onSendToApproval,
  onApprove,
  onReject,
  isSending
}) => {
  const { theme: t } = useTheme();
  useLanguage(); // mantener hook activo
  const { showSuccess, showError } = useToast();
  const styles = getStyles(t);

  // Check if current user is admin - admins can ALWAYS edit
  const isAdmin = isUserAdmin(currentUser);
  const actuallyBlocked = isAdmin ? false : isBlocked;

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [validationData, setValidationData] = useState({
    // Before/After Evidence
    beforeCondition: '',
    afterCondition: '',
    beforePhotos: [],
    afterPhotos: [],

    // Countermeasures Validation
    d3Implemented: null,
    d3Effective: null,
    d3SpcJudgment: '',
    d3ClientJudgment: '',
    d3Comments: '',
    d3Lesson: '',
    d5Implemented: null,
    d5Effective: null,
    d5SpcJudgment: '',
    d5ClientJudgment: '',
    d5Comments: '',
    d5Lesson: '',

    // SPC Validation
    spcValidated: null,
    spcComments: '',
    spcAuditJudgment: '',
    spcFiles: [],

    // Training
    trainingCompleted: false,
    trainingAuditJudgment: '',
    trainingDates: [],
    trainingInstructor: '',
    trainingTopics: '',
    trainingMethod: '',
    competencyVerified: null,
    competencyMethod: [],
    trainingEmployees: [],
    trainingFiles: [],

    // D7 Completion
    d7Completed: false
  });

  // Default audit items template
  const DEFAULT_AUDIT_ITEMS = [
    { name: 'SPC', icon: '' },
    { name: 'AMEF', icon: '' },
    { name: 'Control Plan', icon: '' },
    { name: 'Work Instructions', icon: '' },
    { name: 'Procedures', icon: '' },
    { name: 'Specifications', icon: '' },
    { name: 'Training', icon: '' }
  ];

  // Unified audit items - dynamic list with new fields
  // NOTE: Initial items have NEGATIVE temp IDs - they get real positive IDs after first save to DB
  const [auditItems, setAuditItems] = useState([
    { id: -1, name: 'SPC', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' },
    { id: -2, name: 'AMEF', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' },
    { id: -3, name: 'Control Plan', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' },
    { id: -4, name: 'Work Instructions', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' },
    { id: -5, name: 'Procedures', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' },
    { id: -6, name: 'Specifications', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' },
    { id: -7, name: 'Training', icon: '', checkItem: '', comments: '', auditJudgment: '', files: [], isDefault: true, dueDate: '', assignedAuditors: [], assignedAuditorsInfo: [], sentToAudit: false, auditorCompleted: false, auditorComments: '', auditorJudgment: '' }
  ]);

  const [nextTempId, setNextTempId] = useState(-8); // Negative IDs for unsaved items (start after defaults)
  const [availableAuditors, setAvailableAuditors] = useState([]);
  const [users, setUsers] = useState([]);
  const [d7ApprovalHistory, setD7ApprovalHistory] = useState([]);

  // Revert to draft modal state (Admin only)
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertComments, setRevertComments] = useState('');
  const [isReverting, setIsReverting] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  const [newEmployee, setNewEmployee] = useState({
    employeeName: '',
    position: '',
    area: '',
    trainingDate: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [expandedFiles, setExpandedFiles] = useState({
    spc: false,
    doc0: false,
    doc1: false,
    doc2: false,
    doc3: false,
    doc4: false,
    training: false
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [sendingToAudit, setSendingToAudit] = useState(false);

  // Scroll sync refs and state for audit table
  const tableContainerRef = useRef(null);
  const topScrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check if table can scroll and sync scrollbars
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const canScroll = container.scrollWidth > container.clientWidth;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      setCanScrollRight(canScroll && !atEnd);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    // Hide hint after 5 seconds
    const timer = setTimeout(() => setShowScrollHint(false), 5000);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [auditItems]);

  // Sync top scrollbar with table
  const handleTopScroll = (e) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleTableScroll = (e) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
    // Show hint briefly when user scrolls
    if (e.target.scrollLeft === 0) {
      setShowScrollHint(true);
      setTimeout(() => setShowScrollHint(false), 3000);
    }
  };

  const scrollTableRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // ============================================
  // LOAD D7 DATA AND AUDITORS
  // ============================================
  useEffect(() => {
    if (reportId) {
      loadD7Data();
      loadAvailableAuditors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // Load users list for approver names
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/users/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.users) {
          setUsers(response.data.users);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Load D7 approval history from audit log
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      if (!reportId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${reportId}/audit-log?actionCategory=approval&sectionName=d7`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setD7ApprovalHistory(response.data.auditLog || []);
        }
      } catch (error) {
        console.error('Error loading D7 approval history:', error);
      }
    };
    fetchApprovalHistory();
  }, [reportId]);

  const loadAvailableAuditors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/audit/auditors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAvailableAuditors(response.data.auditors || []);
      }
    } catch (error) {
      console.error('Error loading auditors:', error);
    }
  };

  const loadD7Data = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data.validation) {
        const { validation, validationFiles, documentsUpdated: docs, trainingEmployees, trainingFiles, auditItems: loadedAuditItems } = response.data.data;

        // Separate files by type
        const beforePhotos = validationFiles.filter(f => f.file_type === 'before_photo');
        const afterPhotos = validationFiles.filter(f => f.file_type === 'after_photo');
        const validationEvFiles = validationFiles.filter(f => f.file_type === 'validation_evidence');
        const spcCharts = validationFiles.filter(f => f.file_type === 'spc_chart');

        setValidationData({
          beforeCondition: validation.before_condition || '',
          afterCondition: validation.after_condition || '',
          beforePhotos: beforePhotos,
          afterPhotos: afterPhotos,
          d3Implemented: validation.d3_implemented,
          d3Effective: validation.d3_effective,
          d3SpcJudgment: validation.d3_spc_judgment || '',
          d3ClientJudgment: validation.d3_client_judgment || '',
          d3Comments: validation.d3_comments || '',
          d3Lesson: validation.d3_lesson || '',
          d5Implemented: validation.d5_implemented,
          d5Effective: validation.d5_effective,
          d5SpcJudgment: validation.d5_spc_judgment || '',
          d5ClientJudgment: validation.d5_client_judgment || '',
          d5Comments: validation.d5_comments || '',
          d5Lesson: validation.d5_lesson || '',
          spcValidated: validation.spc_validated,
          spcComments: validation.spc_comments || '',
          spcAuditJudgment: validation.spc_audit_judgment || '',
          spcFiles: spcCharts,
          trainingCompleted: validation.training_completed || false,
          trainingAuditJudgment: validation.training_audit_judgment || '',
          trainingDates: validation.training_dates || [],
          trainingInstructor: validation.training_instructor || '',
          trainingTopics: validation.training_topics || '',
          trainingMethod: validation.training_method || '',
          competencyVerified: validation.competency_verified,
          competencyMethod: validation.competency_method || [],
          trainingEmployees: trainingEmployees,
          trainingFiles: trainingFiles,
          d7Completed: data?.d7Completed || false
        });

        // Load audit items from database
        if (loadedAuditItems && loadedAuditItems.length > 0) {
          // Map database format to frontend format
          const mappedItems = loadedAuditItems.map((item, index) => ({
            id: item.id,
            name: item.item_name,
            icon: item.item_icon || '',
            checkItem: item.check_item || '',
            comments: item.comments || '',
            auditJudgment: item.audit_judgment || '',
            files: item.files || [],
            isDefault: item.is_default || false,
            dueDate: item.due_date ? item.due_date.split('T')[0] : '',
            assignedAuditors: item.assigned_auditors || [],
            assignedAuditorsInfo: item.assigned_auditors_info || [],
            sentToAudit: item.sent_to_audit || false,
            auditRequestId: item.audit_request_id,
            auditorComments: item.auditor_comments || '',
            auditorJudgment: item.auditor_judgment || '',
            auditorCompleted: item.auditor_completed || false,
            verificationDate: item.verification_date,
            auditedByName: item.audited_by_name || '',
            auditRound: item.audit_round || 1
          }));
          console.log(' D7 Audit Items loaded:', mappedItems.map(i => ({
            id: i.id,
            name: i.name,
            assignedAuditors: i.assignedAuditors,
            auditorJudgment: i.auditorJudgment,
            auditorCompleted: i.auditorCompleted,
            sentToAudit: i.sentToAudit
          })));
          setAuditItems(mappedItems);
          // No need to update nextTempId - it stays negative for new items
        }
      }
    } catch (error) {
      console.error('Error loading D7 data:', error);
    }
  };

  // ============================================
  // SAVE MAIN VALIDATION DATA
  // ============================================
  const saveValidationData = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Save main validation data + audit items
      // NOTE: d3/d5 countermeasure validation fields are managed by D5D6D7Countermeasures component
      // Only save D7-specific fields here to avoid overwriting
      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation`,
        {
          // D7 Audit-specific fields only (not countermeasure validation)
          spcValidated: validationData.spcValidated,
          spcComments: validationData.spcComments,
          spcAuditJudgment: validationData.spcAuditJudgment,
          trainingCompleted: validationData.trainingCompleted,
          trainingAuditJudgment: validationData.trainingAuditJudgment,
          trainingDates: validationData.trainingDates,
          trainingInstructor: validationData.trainingInstructor,
          trainingTopics: validationData.trainingTopics,
          trainingMethod: validationData.trainingMethod,
          competencyVerified: validationData.competencyVerified,
          competencyMethod: validationData.competencyMethod,
          auditItems: auditItems // Include audit items in save
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save d7_completed to report
      await axios.put(
        `http://localhost:5000/8d/reports/${reportId}`,
        { d7_completed: validationData.d7Completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('D7 guardado exitosamente');
      loadD7Data();
    } catch (error) {
      console.error('Error saving D7:', error);
      showError('Error al guardar D7');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle revert to draft (Admin only)
  // Handle revert to draft (Admin only) - Creates new revision
  const handleRevertToDraft = async () => {
    if (!revertComments || revertComments.trim() === '') {
      showError('El comentario es obligatorio');
      return;
    }

    // Confirm action
    if (!window.confirm('⚠️ ATENCIÓN: Esta acción archivará el documento actual y creará una NUEVA REVISIÓN editable.\n\nEl documento actual quedará bloqueado como referencia histórica.\n\n¿Desea continuar?')) {
      return;
    }

    setIsReverting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/8d/reports/${reportId}/revert-to-draft`,
        { comments: revertComments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newRevisionId = response.data.data.newRevision.reportId;
        const newDbId = response.data.data.newRevision.id;
        showSuccess(`Documento archivado. Nueva revisión ${newRevisionId} creada.`);
        setShowRevertModal(false);
        setRevertComments('');
        window.location.href = `/8d-workflow?reportId=${newDbId}`;
      } else {
        showError('Error: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showError('Error al revertir a borrador');
    } finally {
      setIsReverting(false);
    }
  };

  // ============================================
  // FILE UPLOAD HANDLERS
  // ============================================
  const uploadFile = async (file, fileType) => {
    setUploadingFile(fileType);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/upload-file`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      loadD7Data();
    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Error al subir archivo');
    } finally {
      setUploadingFile(null);
    }
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/files/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadD7Data();
    } catch (error) {
      console.error('Error deleting file:', error);
      showError('Error al eliminar archivo');
    }
  };

  // ============================================
  // AUDIT ITEMS HANDLERS
  // ============================================

  // Get list of default items that have been deleted (not in current auditItems)
  const getDeletedDefaultItems = () => {
    const currentNames = auditItems.map(item => item.name);
    return DEFAULT_AUDIT_ITEMS.filter(def => !currentNames.includes(def.name));
  };

  const openAddCategoryModal = () => {
    setCustomCategoryName('');
    setShowAddCategoryModal(true);
  };

  const addAuditItemFromModal = (name, icon, isDefault = false) => {
    const newItem = {
      id: nextTempId, // Negative ID = not saved to DB yet
      name: name,
      icon: icon,
      checkItem: '',
      comments: '',
      auditJudgment: '',
      files: [],
      isDefault: isDefault,
      dueDate: '',
      assignedAuditors: [],
      assignedAuditorsInfo: [],
      sentToAudit: false,
      auditorComments: '',
      auditorJudgment: '',
      auditorCompleted: false
    };

    setAuditItems([...auditItems, newItem]);
    setNextTempId(nextTempId - 1);
    setShowAddCategoryModal(false);
    setCustomCategoryName('');
  };

  const addCustomCategory = () => {
    if (!customCategoryName.trim()) return;
    addAuditItemFromModal(customCategoryName.trim(), '', false);
  };

  // Add duplicate row for same category (e.g., multiple SPC checks)
  const duplicateAuditItem = (item) => {
    const newItem = {
      id: nextTempId, // Negative ID = not saved to DB yet
      name: item.name,
      icon: item.icon,
      checkItem: '',
      comments: '',
      auditJudgment: '',
      files: [],
      isDefault: false,
      dueDate: '',
      assignedAuditors: [],
      assignedAuditorsInfo: [],
      sentToAudit: false,
      auditorComments: '',
      auditorJudgment: '',
      auditorCompleted: false
    };

    // Insert after current item
    const index = auditItems.findIndex(i => i.id === item.id);
    const newItems = [...auditItems];
    newItems.splice(index + 1, 0, newItem);
    setAuditItems(newItems);
    setNextTempId(nextTempId - 1);
  };

  const deleteAuditItem = (itemId) => {
    const item = auditItems.find(i => i.id === itemId);
    setDeleteConfirmModal({
      message: `¿Eliminar "${item?.name}" del checklist?`,
      onConfirm: () => {
        setAuditItems(auditItems.filter(item => item.id !== itemId));
        setDeleteConfirmModal(null);
      }
    });
  };

  // Update audit request with modified data (no new round)
  const updateAuditRequest = async (item) => {
    if (!window.confirm(`¿Actualizar "${item.name}" en la solicitud de auditoría?\n\nLos cambios se enviarán al auditor asignado.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // First save the item to DB
      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation`,
        { auditItems: [item] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clear needsResend flag
      setAuditItems(prevItems =>
        prevItems.map(i =>
          i.id === item.id ? { ...i, needsResend: false } : i
        )
      );

      // Open mailto for auditors
      if (item.assignedAuditorsInfo && item.assignedAuditorsInfo.length > 0) {
        const emails = item.assignedAuditorsInfo.map(a => a.email).join(';');
        const subject = encodeURIComponent(`[ACTUALIZACIÓN] Auditoría D7 - ${reportId} - ${item.name}`);
        const body = encodeURIComponent(
          `Estimado Auditor,\n\n` +
          `Se ha actualizado un item de auditoría D7.\n\n` +
          `📋 Reporte: ${reportId}\n` +
          `📎 Categoría: ${item.name}\n` +
          `📝 Qué verificar: ${item.checkItem || 'Ver sistema'}\n` +
          `💬 Notas: ${item.comments || 'Sin notas'}\n` +
          `📅 Fecha límite: ${item.dueDate || 'Sin fecha'}\n\n` +
          `Por favor revise los cambios en el sistema:\n` +
          `${window.location.origin}/audit-requests\n\n` +
          `Saludos,\n` +
          `Sistema de Gestión de Calidad`
        );
        window.open(`mailto:${emails}?subject=${subject}&body=${body}`, '_blank');
      }

      showSuccess(`"${item.name}" actualizado en solicitud de auditoría`);
    } catch (error) {
      console.error('Error updating audit request:', error);
      showError('Error al actualizar solicitud de auditoría');
    }
  };

  // Re-send item to audit (ISO re-audit workflow)
  const resendToAudit = async (item) => {
    if (!window.confirm(`¿Re-enviar "${item.name}" a auditoría?\n\nEl hallazgo actual se guardará en historial y se iniciará Ronda ${(item.auditRound || 1) + 1}.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/audit/d7-item/${item.id}/resend`,
        { closureNotes: item.auditorComments || `Re-enviado por corrección de hallazgo ${item.auditorJudgment}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newRound = response.data.newRound;

        // Update local state
        setAuditItems(prevItems =>
          prevItems.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  auditRound: newRound,
                  auditorJudgment: null,
                  auditorComments: null,
                  auditorCompleted: false,
                  auditedByName: null,
                  verificationDate: null
                }
              : i
          )
        );

        // Open mailto for auditors
        if (item.assignedAuditorsInfo && item.assignedAuditorsInfo.length > 0) {
          const emails = item.assignedAuditorsInfo.map(a => a.email).join(';');
          const subject = encodeURIComponent(`[RE-ENVÍO] Auditoría D7 - ${reportId} - ${item.name} (Ronda ${newRound})`);
          const body = encodeURIComponent(
            `Estimado Auditor,\n\n` +
            `Se ha re-enviado un item para auditoría D7.\n\n` +
            `📋 Reporte: ${reportId}\n` +
            `📎 Categoría: ${item.name}\n` +
            `🔄 Ronda: ${newRound}\n` +
            `📝 Qué verificar: ${item.checkItem || 'Ver sistema'}\n` +
            `📅 Fecha límite: ${item.dueDate || 'Sin fecha'}\n\n` +
            `Por favor ingrese al sistema para completar la auditoría:\n` +
            `${window.location.origin}/audit-requests\n\n` +
            `Saludos,\n` +
            `Sistema de Gestión de Calidad`
          );
          window.open(`mailto:${emails}?subject=${subject}&body=${body}`, '_blank');
        }

        showSuccess(`Item re-enviado a auditoría (Ronda ${newRound})`);
      }
    } catch (error) {
      console.error('Error re-sending to audit:', error);
      showError('Error al re-enviar a auditoría');
    }
  };

  // Open history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState({ history: [], currentRound: null, itemName: '' });
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openHistoryModal = async (item) => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setHistoryData({ history: [], currentRound: null, itemName: item.name });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/audit/d7-item/${item.id}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setHistoryData({
          history: response.data.history,
          currentRound: response.data.currentRound,
          itemName: item.name
        });
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      showError('Error al cargar historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  const updateAuditItem = (itemId, field, value) => {
    setAuditItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        // If item was already sent to audit and is being modified, mark as needs resend
        const needsResend = item.sentToAudit && !item.needsResend ? true : item.needsResend;
        return { ...item, [field]: value, needsResend };
      }
      return item;
    }));
  };

  // Update multiple fields at once to avoid state race conditions
  const updateAuditItemMultiple = (itemId, updates) => {
    setAuditItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        // If item was already sent to audit and is being modified, mark as needs resend
        const needsResend = item.sentToAudit && !item.needsResend ? true : item.needsResend;
        return { ...item, ...updates, needsResend };
      }
      return item;
    }));
  };

  const uploadAuditItemFile = async (itemId, file) => {
    try {
      const token = localStorage.getItem('token');
      const item = auditItems.find(i => i.id === itemId);

      if (!item) {
        showError('Item no encontrado');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('itemId', item.id);
      formData.append('itemName', item.name);
      formData.append('itemIcon', item.icon || '');
      formData.append('comments', item.comments || '');
      formData.append('auditJudgment', item.auditJudgment || '');
      formData.append('isDefault', item.isDefault || false);

      const response = await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/audit-item-file`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Update item ID if it was newly created in the database
      const { auditItemId, file: newFile } = response.data.data;

      // If the item got a new ID from the database, update it
      if (auditItemId && auditItemId !== itemId) {
        setAuditItems(prevItems =>
          prevItems.map(i =>
            i.id === itemId
              ? { ...i, id: auditItemId, files: [...(i.files || []), newFile] }
              : i
          )
        );
      } else {
        // Just add the file
        updateAuditItem(itemId, 'files', [...(item.files || []), newFile]);
      }
    } catch (error) {
      console.error('Error uploading audit item file:', error);
      showError('Error al subir archivo');
    }
  };

  const deleteAuditItemFile = async (itemId, fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/files/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove file from item
      const item = auditItems.find(i => i.id === itemId);
      if (item) {
        updateAuditItem(itemId, 'files', item.files.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showError('Error al eliminar archivo');
    }
  };

  // ============================================
  // SEND TO AUDIT REQUEST
  // ============================================
  const sendToAuditRequest = async () => {
    // Auto-save first to persist any unsaved items (negative IDs), then reload to get real IDs
    const token = localStorage.getItem('token');
    let currentItems = auditItems;
    const hasUnsavedItems = auditItems.some(item => item.id < 0);
    if (hasUnsavedItems) {
      try {
        await axios.post(
          `http://localhost:5000/api/8d/reports/${reportId}/d7-validation`,
          {
            spcValidated: validationData.spcValidated,
            spcComments: validationData.spcComments,
            spcAuditJudgment: validationData.spcAuditJudgment,
            trainingCompleted: validationData.trainingCompleted,
            trainingAuditJudgment: validationData.trainingAuditJudgment,
            trainingDates: validationData.trainingDates,
            trainingInstructor: validationData.trainingInstructor,
            trainingTopics: validationData.trainingTopics,
            trainingMethod: validationData.trainingMethod,
            competencyVerified: validationData.competencyVerified,
            competencyMethod: validationData.competencyMethod,
            auditItems: auditItems
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Fetch updated items with real IDs from DB
        const reloadRes = await axios.get(
          `http://localhost:5000/api/8d/reports/${reportId}/d7-validation`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (reloadRes.data.success && reloadRes.data.data.auditItems) {
          currentItems = reloadRes.data.data.auditItems.map(item => ({
            id: item.id,
            name: item.item_name,
            checkItem: item.check_item || '',
            comments: item.comments || '',
            auditJudgment: item.audit_judgment || '',
            assignedAuditors: item.assigned_auditors || [],
            assignedAuditorsInfo: item.assigned_auditors_info || [],
            sentToAudit: item.sent_to_audit || false,
            auditorJudgment: item.auditor_judgment || '',
            auditorComments: item.auditor_comments || '',
            auditorCompleted: item.auditor_completed || false,
            files: item.files || [],
            isDefault: item.is_default || false,
            dueDate: item.due_date ? item.due_date.split('T')[0] : '',
            auditRound: item.audit_round || 1
          }));
          setAuditItems(currentItems);
        }
      } catch (err) {
        console.error('Error auto-saving before audit send:', err);
        showError('Error al guardar items antes de enviar a auditoría');
        return;
      }
    }

    // Filter items that have check_item filled and are not already sent
    // Items that need to be sent to audit: have checkItem, not sent yet, AND have auditors assigned
    const itemsToSend = currentItems.filter(item =>
      item.checkItem &&
      !item.sentToAudit &&
      item.assignedAuditors &&
      item.assignedAuditors.length > 0
    );

    // Items that are self-verified by leader (no auditors but have judgment)
    const selfVerifiedItems = currentItems.filter(item =>
      item.checkItem &&
      !item.sentToAudit &&
      (!item.assignedAuditors || item.assignedAuditors.length === 0) &&
      item.auditorJudgment
    );

    // Items that need attention (no auditors and no judgment)
    const incompleteItems = currentItems.filter(item =>
      item.checkItem &&
      !item.sentToAudit &&
      (!item.assignedAuditors || item.assignedAuditors.length === 0) &&
      !item.auditorJudgment
    );

    if (itemsToSend.length === 0 && selfVerifiedItems.length === 0) {
      if (incompleteItems.length > 0) {
        showError(`${incompleteItems.length} item(s) no tienen auditores ni juicio de líder. Asigna auditores o da juicio como líder.`);
      } else {
        showError('No hay items pendientes de enviar a auditoría');
      }
      return;
    }

    // If there are self-verified items, just inform the user
    let confirmMessage = '';
    if (itemsToSend.length > 0 && selfVerifiedItems.length > 0) {
      confirmMessage = `¿Enviar ${itemsToSend.length} item(s) a auditoría?\n\n(${selfVerifiedItems.length} item(s) ya están auto-verificados por el líder)`;
    } else if (itemsToSend.length > 0) {
      confirmMessage = `¿Enviar ${itemsToSend.length} item(s) a solicitud de auditoría?`;
    } else {
      showSuccess(`${selfVerifiedItems.length} item(s) ya están auto-verificados. No hay items para enviar a auditoría externa.`);
      return;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSendingToAudit(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/audit/requests',
        {
          sourceType: '8D',
          sourceId: reportId,
          sourceNumber: data?.reportNumber || `8D-${reportId}`,
          items: itemsToSend.map(item => ({
            name: item.name,
            checkItem: item.checkItem,
            comments: item.comments,
            judgment: item.auditJudgment,
            dueDate: item.dueDate || null,
            assignedAuditors: item.assignedAuditors,
            d7AuditItemId: item.id
          }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showSuccess(`${itemsToSend.length} item(s) enviados a auditoría`);

        // Collect all auditor emails for mailto
        const allAuditorEmails = [];
        const allAuditorIds = new Set();

        itemsToSend.forEach(item => {
          if (item.assignedAuditorsInfo) {
            item.assignedAuditorsInfo.forEach(auditor => {
              if (auditor.email && !allAuditorIds.has(auditor.id)) {
                allAuditorIds.add(auditor.id);
                allAuditorEmails.push(auditor.email);
              }
            });
          }
        });

        // If we have auditor emails, open mailto
        if (allAuditorEmails.length > 0) {
          const reportNumber = data?.reportNumber || `8D-${reportId}`;
          const reportTitle = data?.title || 'Sin título';
          const severity = data?.severityLevel || data?.severity || 'N/A';
          const clientSupplier = data?.customer || data?.supplier || 'N/A';
          const project = data?.project || data?.projectName || '';
          const itemsList = itemsToSend.map(item => `• ${item.name}: ${item.checkItem}`).join('\n');
          const reportUrl = `${window.location.origin}/8d/${reportId}`;

          const subject = encodeURIComponent(`Solicitud de Auditoría D7 - ${reportNumber} | ${reportTitle}`);
          const body = encodeURIComponent(
`Estimado(a) Auditor(a),

Tiene una nueva solicitud de auditoría D7 pendiente de verificación.

═══════════════════════════════════════
 INFORMACIÓN DEL REPORTE
═══════════════════════════════════════
 DOCUMENTO: ${reportNumber}
 TÍTULO: ${reportTitle}
 SEVERIDAD: ${severity}
 CLIENTE/PROVEEDOR: ${clientSupplier}${project ? `\n PROYECTO: ${project}` : ''}
 ENLACE: ${reportUrl}

═══════════════════════════════════════
 ITEMS A VERIFICAR
═══════════════════════════════════════
${itemsList}

Por favor ingrese al sistema para completar la verificación.

Saludos,
Sistema de Gestión de Calidad`
          );

          window.open(`mailto:${allAuditorEmails.join(';')}?subject=${subject}&body=${body}`, '_blank');
        }

        // Reload to get updated sent_to_audit flags
        loadD7Data();
      }
    } catch (error) {
      console.error('Error sending to audit:', error);
      showError('Error al enviar a auditoría');
    } finally {
      setSendingToAudit(false);
    }
  };

  // ============================================
  // DOCUMENT UPDATE HANDLERS (DEPRECATED - now using audit items)
  // ============================================
  /* DEPRECATED - Replaced by audit items
  const updateDocument = async (docIndex) => {
    const doc = documentsUpdated[docIndex];
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/documents`,
        {
          documentType: doc.type,
          updated: doc.updated,
          revisionNumber: doc.revisionNumber,
          notes: doc.notes,
          modifiedItems: doc.modifiedItems,
          auditJudgment: doc.auditJudgment
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Don't reload data here - it causes loss of user input in other fields
      // The local state already has the correct data
    } catch (error) {
      console.error('Error updating document:', error);
      showError('Error al actualizar documento');
    }
  };
  */

  /* DEPRECATED - Replaced by audit items
  const uploadDocumentFile = async (docIndex, file) => {
    try {
      const token = localStorage.getItem('token');
      const doc = documentsUpdated[docIndex];

      // Always save/update the document first to preserve any changes (checkbox, comments)
      let documentId = doc?.id;

      const documentData = {
        documentType: doc.type,
        updated: doc.updated || false,
        revisionNumber: doc.revisionNumber || '',
        notes: doc.notes || '',
        modifiedItems: doc.modifiedItems || '',
        auditJudgment: doc.auditJudgment || ''
      };

      if (!documentId) {
        // Create new document
        const createResponse = await axios.post(
          `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/documents`,
          documentData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Get the newly created document ID
        const reloadResponse = await axios.get(
          `http://localhost:5000/api/8d/reports/${reportId}/d7-validation`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (reloadResponse.data.success && reloadResponse.data.data.documentsUpdated) {
          const docs = reloadResponse.data.data.documentsUpdated;
          const matchingDoc = docs.find(d => d.document_type === doc.type);
          documentId = matchingDoc?.id;
        }
      } else {
        // Update existing document to preserve changes
        await axios.post(
          `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/documents`,
          documentData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (!documentId) {
        showError('No se pudo crear el registro del documento');
        return;
      }

      // Now upload the file
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/documents/${documentId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Reload data to show the new file
      await loadD7Data();
    } catch (error) {
      console.error('Error uploading document file:', error);
      showError('Error al subir archivo');
    }
  };
  */

  const deleteDocumentFile = async (documentId, fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/documents/${documentId}/files/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadD7Data();
    } catch (error) {
      console.error('Error deleting document file:', error);
      showError('Error al eliminar archivo');
    }
  };

  const toggleFileExpansion = (key) => {
    setExpandedFiles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================================
  // TRAINING EMPLOYEE HANDLERS
  // ============================================
  const addTrainingEmployee = async () => {
    if (!newEmployee.employeeName.trim()) {
      showError('Debes ingresar el nombre del empleado');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/training-employees`,
        newEmployee,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewEmployee({ employeeName: '', position: '', area: '', trainingDate: '' });
      loadD7Data();
    } catch (error) {
      console.error('Error adding employee:', error);
      showError('Error al agregar empleado');
    }
  };

  const deleteTrainingEmployee = async (employeeId) => {
    if (!window.confirm('¿Eliminar este empleado?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/training-employees/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadD7Data();
    } catch (error) {
      console.error('Error deleting employee:', error);
      showError('Error al eliminar empleado');
    }
  };

  // ============================================
  // TRAINING FILE HANDLERS
  // ============================================
  const uploadTrainingFile = async (file, fileType) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      await axios.post(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/training-files`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      loadD7Data();
    } catch (error) {
      console.error('Error uploading training file:', error);
      showError('Error al subir archivo');
    }
  };

  const deleteTrainingFile = async (fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/8d/reports/${reportId}/d7-validation/training-files/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadD7Data();
    } catch (error) {
      console.error('Error deleting training file:', error);
      showError('Error al eliminar archivo');
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span></span>
        <span>D7 - Aseguramiento de No Reincidencia</span>
      </div>

      {actuallyBlocked && (
        <div style={styles.blockedMessage}>
          <span style={{ fontSize: '24px' }}></span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: t.warningFg, marginBottom: '4px' }}>
              Sección Restringida - Solo Calidad
            </div>
            <div style={{ fontSize: '13px', color: t.textMuted }}>
              Esta sección D7 está disponible únicamente para usuarios del equipo de Calidad (Confirmation).
            </div>
          </div>
        </div>
      )}

      {/* NOTA: Las secciones "Evidencia Antes/Después" y "Validación de Contramedidas"
          fueron movidas a D6 para seguir el estándar 8D correctamente */}

      {/* ==================== AUDIT CHECKLIST ==================== */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}> Checklist de Auditoría D7</h3>

        {/* Top scrollbar - synced with table */}
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            height: '20px',
            marginBottom: '0',
            backgroundColor: t.bgPanel,
            borderRadius: '6px 6px 0 0',
            border: `1px solid ${t.border}`,
            borderBottom: 'none'
          }}
        >
          <div style={{ width: '1600px', height: '1px' }}></div>
        </div>

        {/* Scroll hint banner */}
        {showScrollHint && canScrollRight && (
          <div style={{
            backgroundColor: t.accentBg,
            color: t.text,
            padding: '8px 16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            animation: 'fadeIn 0.3s ease-in',
            border: `1px solid ${t.accentBorder}`
          }}>
            <span></span>
            <span>Desliza horizontalmente para ver: <strong>Juicio, Hallazgos, Verificado Por, Ronda, Acciones</strong></span>
            <span></span>
            <button
              onClick={() => setShowScrollHint(false)}
              style={{ marginLeft: '12px', background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '16px' }}
            ></button>
          </div>
        )}

        {/* Table container with scroll indicator */}
        <div style={{ position: 'relative' }}>
          <div
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            style={{ overflowX: 'auto', overflowY: 'visible' }}
          >
            <table style={{ ...styles.checklistTable, width: '100%', minWidth: '1600px', fontSize: '14px' }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '120px', padding: '10px 8px', fontSize: '14px' }}>Categoría</th>
                  <th style={{ ...styles.th, width: '220px', padding: '10px 8px', fontSize: '14px' }}>Check Item</th>
                  <th style={{ ...styles.th, width: '120px', padding: '10px 8px', fontSize: '14px' }}>Fecha Límite</th>
                  <th style={{ ...styles.th, width: '140px', padding: '10px 8px', fontSize: '14px' }}>Auditores</th>
                  <th style={{ ...styles.th, width: '180px', padding: '10px 8px', fontSize: '14px' }}>Comentarios Líder</th>
                  <th style={{ ...styles.th, width: '90px', padding: '10px 8px', fontSize: '14px' }}> Archivos</th>
                  <th style={{ ...styles.th, width: '100px', padding: '10px 8px', fontSize: '14px' }}>Estado</th>
                  <th style={{ ...styles.th, width: '100px', padding: '10px 8px', fontSize: '14px', backgroundColor: t.accentBg }}>Juicio</th>
                  <th style={{ ...styles.th, width: '200px', padding: '10px 8px', fontSize: '14px', backgroundColor: t.accentBg }}>Hallazgos Auditor</th>
                  <th style={{ ...styles.th, width: '140px', padding: '10px 8px', fontSize: '14px', backgroundColor: t.accentBg }}>Verificado Por</th>
                  <th style={{ ...styles.th, width: '80px', padding: '10px 8px', fontSize: '14px', backgroundColor: t.warningBg }}>Ronda</th>
                  <th style={{ ...styles.th, width: '140px', padding: '10px 8px', fontSize: '14px' }}>Acciones</th>
                </tr>
              </thead>
            <tbody>
              {auditItems.map((item) => {
                const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !item.auditorCompleted;
                const isDueSoon = item.dueDate && !isOverdue && (new Date(item.dueDate) - new Date()) / (1000 * 60 * 60 * 24) <= 3;

                return (
                  <tr key={item.id} style={{
                    ...styles.tr,
                    backgroundColor: item.needsResend ? t.infoBg : item.sentToAudit ? (item.auditorCompleted ? t.successBg : t.warningBg) : t.bgCard
                  }}>
                    {/* Category Name */}
                    <td style={styles.td}>
                      <strong style={{ fontSize: '14px' }}>{item.icon} {item.name}</strong>
                      {item.needsResend && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: t.infoFg,
                          backgroundColor: t.infoBg,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          ⚠️ Modificado - Reenviar
                        </div>
                      )}
                    </td>

                    {/* Check Item - What to verify */}
                    <td style={styles.td}>
                      <textarea
                        style={{ width: '100%', fontSize: '14px', padding: '8px', minHeight: '60px', border: `1px solid ${t.border}`, borderRadius: '4px', resize: 'vertical', backgroundColor: t.bgCard, color: t.text }}
                        value={item.checkItem || ''}
                        onChange={(e) => updateAuditItem(item.id, 'checkItem', e.target.value)}
                        placeholder="¿Qué verificar?"
                        disabled={actuallyBlocked}
                        rows="2"
                      />
                    </td>

                    {/* Due Date */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input
                        type="date"
                        style={{
                          width: '100%',
                          fontSize: '14px',
                          padding: '8px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '4px',
                          backgroundColor: isOverdue ? t.errorBg : isDueSoon ? t.warningBg : t.bgCard,
                          color: t.text
                        }}
                        value={item.dueDate || ''}
                        onChange={(e) => updateAuditItem(item.id, 'dueDate', e.target.value)}
                        disabled={actuallyBlocked}
                      />
                      {isOverdue && <div style={{ fontSize: '12px', color: t.errorFg, marginTop: '4px' }}> Vencido</div>}
                      {isDueSoon && <div style={{ fontSize: '12px', color: t.warningFg, marginTop: '4px' }}> Próximo</div>}
                    </td>

                    {/* Assigned Auditors - Always editable to add/modify auditors and resend */}
                    <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Selected auditors as removable chips */}
                          {item.assignedAuditorsInfo?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {item.assignedAuditorsInfo.map(a => (
                                <span
                                  key={a.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    backgroundColor: t.accentBg,
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    color: t.primary
                                  }}
                                >
                                   {a.name?.split(' ')[0]}
                                  {!actuallyBlocked && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newIds = (item.assignedAuditors || []).filter(id => id !== a.id);
                                        const newInfo = (item.assignedAuditorsInfo || []).filter(info => info.id !== a.id);
                                        updateAuditItemMultiple(item.id, {
                                          assignedAuditors: newIds,
                                          assignedAuditorsInfo: newInfo
                                        });
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '12px',
                                        color: t.error,
                                        lineHeight: 1
                                      }}
                                      title="Quitar auditor"
                                    >
                                      ×
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Dropdown to add more auditors */}
                          <select
                            style={{ width: '100%', fontSize: '13px', padding: '6px', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgCard, color: t.text }}
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const auditorId = parseInt(e.target.value);
                              if ((item.assignedAuditors || []).includes(auditorId)) return;
                              const auditor = availableAuditors.find(a => a.id === auditorId);
                              if (auditor) {
                                updateAuditItemMultiple(item.id, {
                                  assignedAuditors: [...(item.assignedAuditors || []), auditorId],
                                  assignedAuditorsInfo: [...(item.assignedAuditorsInfo || []), {
                                    id: auditor.id,
                                    name: `${auditor.firstName} ${auditor.lastName}`,
                                    email: auditor.email
                                  }]
                                });
                              }
                            }}
                            disabled={actuallyBlocked}
                          >
                            <option value="">+ Agregar auditor</option>
                            {availableAuditors
                              .filter(a => !(item.assignedAuditors || []).includes(a.id))
                              .map(auditor => (
                                <option key={auditor.id} value={auditor.id}>
                                  {auditor.firstName} {auditor.lastName?.charAt(0)}.
                                </option>
                              ))}
                          </select>
                        </div>
                    </td>

                    {/* Comments */}
                    <td style={styles.td}>
                      <textarea
                        style={{ width: '100%', fontSize: '14px', padding: '8px', minHeight: '60px', border: `1px solid ${t.border}`, borderRadius: '4px', resize: 'vertical', backgroundColor: t.bgCard, color: t.text }}
                        value={item.comments || ''}
                        onChange={(e) => updateAuditItem(item.id, 'comments', e.target.value)}
                        placeholder="Comentarios del líder..."
                        disabled={actuallyBlocked}
                        rows="2"
                      />
                    </td>

                    {/* Files */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <label style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer', backgroundColor: t.bgPanel, borderRadius: '4px', display: 'inline-block' }}>
                        <input
                          type="file"
                          accept="image/*,application/pdf,.xlsx,.xls,.docx,.doc"
                          multiple
                          onChange={(e) => {
                            Array.from(e.target.files).forEach(file => uploadAuditItemFile(item.id, file));
                          }}
                          disabled={actuallyBlocked}
                          style={{ display: 'none' }}
                        />
                         {item.files?.length || 0}
                      </label>
                      {item.files && item.files.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '12px' }}>
                          {item.files.slice(0, 2).map(file => (
                            <a key={file.id} href={`http://localhost:5000${file.file_url || file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: t.primary, display: 'block' }}>
                               {(file.file_name || file.fileName)?.substring(0, 12)}...
                            </a>
                          ))}
                          {item.files.length > 2 && <span>+{item.files.length - 2} más</span>}
                        </div>
                      )}
                    </td>

                    {/* Audit Status */}
                    <td style={{ ...styles.td, textAlign: 'center', fontSize: '14px' }}>
                      {!item.sentToAudit ? (
                        <span style={{ color: t.textMuted }}>Sin enviar</span>
                      ) : item.auditorCompleted ? (
                        <span style={{ color: t.success, fontWeight: '600' }}> Listo</span>
                      ) : (
                        <span style={{ color: t.warning }}> Pendiente</span>
                      )}
                    </td>

                    {/* Judgment - Editable by leader if no auditors assigned */}
                    <td style={{ ...styles.td, textAlign: 'center', backgroundColor: t.accentBg }}>
                      {(!item.assignedAuditors || item.assignedAuditors.length === 0) ? (
                        // No auditors - Leader can give judgment
                        <div>
                          <select
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: `2px solid ${t.primary}`,
                              fontSize: '14px',
                              fontWeight: '600',
                              backgroundColor: item.auditorJudgment === 'OK' ? t.successBg :
                                              item.auditorJudgment === 'NOK' ? t.errorBg :
                                              item.auditorJudgment === 'OBS' ? t.warningBg : t.bgCard,
                              color: item.auditorJudgment === 'OK' ? t.successFg :
                                     item.auditorJudgment === 'NOK' ? t.errorFg :
                                     item.auditorJudgment === 'OBS' ? t.warningFg : t.text,
                              cursor: actuallyBlocked ? 'not-allowed' : 'pointer'
                            }}
                            value={item.auditorJudgment || ''}
                            onChange={(e) => {
                              const judgment = e.target.value;
                              // Get user name (try firstName+lastName first, fallback to name)
                              const userName = currentUser?.firstName
                                ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
                                : currentUser?.name || 'Líder';
                              // When leader gives judgment, also mark as completed and set verifier info
                              updateAuditItemMultiple(item.id, {
                                auditorJudgment: judgment,
                                auditorCompleted: judgment ? true : false,
                                auditedByName: judgment ? userName : '',
                                auditedById: judgment ? currentUser?.id : null,
                                verificationDate: judgment ? new Date().toISOString() : null
                              });
                            }}
                            disabled={actuallyBlocked}
                          >
                            <option value="">--</option>
                            <option value="OK"> OK</option>
                            <option value="NOK"> NOK</option>
                            <option value="OBS"> OBS</option>
                            <option value="NA">- N/A</option>
                          </select>
                          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>(Líder)</div>
                        </div>
                      ) : item.auditorJudgment ? (
                        // Has auditors and has judgment - show as badge
                        <span style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '14px',
                          backgroundColor: item.auditorJudgment === 'OK' ? t.successBg :
                                          item.auditorJudgment === 'NOK' ? t.errorBg :
                                          item.auditorJudgment === 'OBS' ? t.warningBg : t.bgPanel,
                          color: item.auditorJudgment === 'OK' ? t.successFg :
                                 item.auditorJudgment === 'NOK' ? t.errorFg :
                                 item.auditorJudgment === 'OBS' ? t.warningFg : t.text
                        }}>
                          {item.auditorJudgment === 'OK' ? ' OK' :
                           item.auditorJudgment === 'NOK' ? ' NOK' :
                           item.auditorJudgment === 'OBS' ? ' OBS' :
                           item.auditorJudgment === 'NA' ? '- N/A' : item.auditorJudgment}
                        </span>
                      ) : (
                        // Has auditors but no judgment yet - pending
                        <span style={{ color: t.textDim, fontSize: '14px' }}> Pendiente</span>
                      )}
                    </td>

                    {/* Hallazgos - Editable by leader if no auditors */}
                    <td style={{ ...styles.td, fontSize: '14px', backgroundColor: t.accentBg }}>
                      {(!item.assignedAuditors || item.assignedAuditors.length === 0) ? (
                        // No auditors - Leader can add comments
                        <textarea
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${t.primary}`,
                            borderRadius: '4px',
                            fontSize: '14px',
                            minHeight: '60px',
                            resize: 'vertical',
                            backgroundColor: t.bgCard,
                            color: t.text
                          }}
                          value={item.auditorComments || ''}
                          onChange={(e) => updateAuditItem(item.id, 'auditorComments', e.target.value)}
                          placeholder="Hallazgos de verificación..."
                          disabled={actuallyBlocked}
                        />
                      ) : item.auditorComments ? (
                        // Has auditors and has comments
                        <div style={{
                          padding: '8px',
                          backgroundColor: t.bgCard,
                          borderRadius: '4px',
                          border: `1px solid ${t.border}`,
                          maxHeight: '100px',
                          overflowY: 'auto',
                          fontSize: '14px'
                        }}>
                          {item.auditorComments}
                        </div>
                      ) : (
                        <span style={{ color: t.textDim, fontStyle: 'italic', fontSize: '14px' }}>Sin hallazgos</span>
                      )}
                    </td>

                    {/* Verified By */}
                    <td style={{ ...styles.td, textAlign: 'center', fontSize: '14px', backgroundColor: t.accentBg }}>
                      {item.auditedByName ? (
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}> {item.auditedByName}</div>
                          {item.verificationDate && (
                            <div style={{ color: t.textMuted, fontSize: '12px', marginTop: '4px' }}>
                              {new Date(item.verificationDate).toLocaleDateString('es-MX')}
                            </div>
                          )}
                        </div>
                      ) : (!item.assignedAuditors || item.assignedAuditors.length === 0) && item.auditorJudgment ? (
                        <span style={{ padding: '6px 10px', backgroundColor: t.accentBg, borderRadius: '4px', fontSize: '13px', fontWeight: '600', color: t.accentFg }}>
                           Auto-verif.
                        </span>
                      ) : (
                        <span style={{ color: t.textDim, fontSize: '14px' }}>--</span>
                      )}
                    </td>

                    {/* Audit Round */}
                    <td style={{ ...styles.td, textAlign: 'center', backgroundColor: t.warningBg }}>
                      <span style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '16px',
                        backgroundColor: (item.auditRound || 1) > 1 ? t.warningBg : t.bgPanel,
                        color: (item.auditRound || 1) > 1 ? t.warningFg : t.text
                      }}>
                        {item.auditRound || 1}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{
                      ...styles.td,
                      textAlign: 'center',
                      backgroundColor: item.sentToAudit ? (item.auditorCompleted ? t.successBg : t.warningBg) : t.bgCard
                    }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Re-send button - only show for NOK items */}
                        {item.auditorCompleted && (item.auditorJudgment === 'NOK' || item.auditorJudgment === 'OBS') && (
                          <button
                            onClick={() => resendToAudit(item)}
                            style={{ padding: '8px 12px', backgroundColor: t.warning, color: t.bgCard, border: 'none', borderRadius: '4px', cursor: actuallyBlocked ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: actuallyBlocked ? 0.5 : 1 }}
                            disabled={actuallyBlocked}
                            title="Re-enviar a auditoría"
                          >↻ Re-enviar</button>
                        )}
                        {/* Update audit request button - show when item was modified after being sent */}
                        {item.needsResend && (
                          <button
                            onClick={() => updateAuditRequest(item)}
                            style={{ padding: '8px 12px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: actuallyBlocked ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: actuallyBlocked ? 0.5 : 1 }}
                            disabled={actuallyBlocked}
                            title="Actualizar solicitud de auditoría"
                          >📤 Actualizar</button>
                        )}
                        {/* History button - show if sent to audit OR self-verified by leader OR has audit rounds */}
                        {(item.sentToAudit || item.auditorJudgment || (item.auditRound || 1) > 1) && (
                          <button
                            onClick={() => openHistoryModal(item)}
                            style={{ padding: '8px 12px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                            title="Ver historial de auditoría"
                          > Historial</button>
                        )}
                        <button
                          onClick={() => duplicateAuditItem(item)}
                          style={{ padding: '8px 12px', backgroundColor: t.primary, color: t.bgCard, border: 'none', borderRadius: '4px', cursor: actuallyBlocked ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: actuallyBlocked ? 0.5 : 1 }}
                          disabled={actuallyBlocked}
                          title={`Agregar otra fila de ${item.name}`}
                        >+ Fila</button>
                        <button
                          onClick={() => deleteAuditItem(item.id)}
                          style={{ padding: '8px 12px', backgroundColor: t.error, color: t.bgCard, border: 'none', borderRadius: '4px', cursor: (actuallyBlocked || item.sentToAudit) ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: (actuallyBlocked || item.sentToAudit) ? 0.5 : 1 }}
                          disabled={actuallyBlocked}
                          title="Eliminar item"
                        ></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Scroll indicator arrow */}
          {canScrollRight && (
            <div
              onClick={scrollTableRight}
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: t.accent,
                color: t.bgCard,
                padding: '20px 8px',
                borderRadius: '8px 0 0 8px',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: `0 2px 8px ${t.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
                animation: showScrollHint ? 'pulseArrow 1.5s infinite' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Desplazar para ver más columnas"
            >
              <span style={{ fontSize: '18px' }}>→</span>
              <span style={{ fontSize: '9px', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Más</span>
            </div>
          )}
        </div>


        {/* CSS Animations */}
        <style>{`
          @keyframes pulseArrow {
            0%, 100% { transform: translateY(-50%) translateX(0); opacity: 0.9; }
            50% { transform: translateY(-50%) translateX(-5px); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Add Item Button */}
        <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={openAddCategoryModal}
            style={{
              ...styles.fileLabel,
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: actuallyBlocked ? 'not-allowed' : 'pointer',
              opacity: actuallyBlocked ? 0.5 : 1
            }}
            disabled={actuallyBlocked}
          >
             Agregar Categoría
          </button>
          <button
            onClick={sendToAuditRequest}
            disabled={sendingToAudit || actuallyBlocked}
            style={{
              ...styles.fileLabel,
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: t.primary,
              color: t.bgCard,
              border: 'none',
              borderRadius: '6px',
              cursor: (sendingToAudit || actuallyBlocked) ? 'not-allowed' : 'pointer',
              opacity: (sendingToAudit || actuallyBlocked) ? 0.5 : 1
            }}
          >
            {sendingToAudit ? ' Enviando...' : ' Enviar a Solicitud de Auditoría'}
          </button>
        </div>

        {/* Mark as Complete */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${t.border}` }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={validationData.d7Completed}
              onChange={(e) => setValidationData(prev => ({ ...prev, d7Completed: e.target.checked }))}
              disabled={actuallyBlocked}
              style={{ width: '18px', height: '18px', marginRight: '8px' }}
            />
            <span style={{ fontWeight: '500' }}> Marcar D7 como completado</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '20px 0', flexWrap: 'wrap' }}>
        {/* Mensaje cuando está completamente aprobado */}
        {data?.d7Status === 'approved' ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <div style={{
              padding: '12px 24px',
              backgroundColor: t.successBg,
              border: `1px solid ${t.successBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              color: t.successFg,
              textAlign: 'center',
              fontWeight: '600',
              flex: 1
            }}>
              D7 COMPLETAMENTE APROBADO. Puede continuar con D8.
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowRevertModal(true)}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: t.error,
                  color: t.bgCard,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = t.error}
                onMouseLeave={(e) => e.target.style.backgroundColor = t.error}
              >
                Regresar a Borrador
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Guardar Borrador - Always visible */}
            <button
              onClick={saveValidationData}
              disabled={isBlocked || isSaving}
              style={{
                padding: '12px 24px',
                backgroundColor: t.bgPanel,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isBlocked || isSaving ? 'not-allowed' : 'pointer',
                opacity: isBlocked || isSaving ? 0.5 : 1
              }}
            >
              {isSaving ? 'Guardando...' : 'Guardar Borrador'}
            </button>

        {onSendToApproval && (
          <>
            {/* Show APPROVE/REJECT buttons ONLY for Calidad users when under review */}
            {data?.d7Status === 'under_review' && onApprove && onReject && (
              <>
                <button
                  onClick={onApprove}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: t.success,
                    color: t.bgCard,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Aprobar
                </button>
                <button
                  onClick={onReject}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: t.error,
                    color: t.bgCard,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Rechazar
                </button>
              </>
            )}

            {/* Show SEND button when NOT in approval (admin can always see) */}
            {data?.d7Status !== 'under_review' && data?.d7Status !== 'approved' && !actuallyBlocked && (
              <button
                onClick={() => {
                  if (!validationData.d7Completed) {
                    showError(' Debes marcar D7 como completada antes de enviar a aprobación');
                    return;
                  }
                  onSendToApproval();
                }}
                disabled={isSending}
                style={{
                  padding: '12px 24px',
                  backgroundColor: t.success,
                  color: t.bgCard,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.6 : 1
                }}
              >
                {isSending ? 'Enviando...' : 'Enviar a Aprobación'}
              </button>
            )}
          </>
        )}
          </>
        )}
      </div>

      {/* Approval Status Section - D7 (Multi-level) */}
      {data && data.escalationPath && (
        <div id="d7-aprobacion" style={{
          backgroundColor: t.warningBg,
          border: `1px solid ${t.warningBorder}`,
          borderRadius: '8px',
          padding: '20px',
          marginTop: '32px',
          marginBottom: '24px',
          scrollMarginTop: '20px'
        }}>
          <h3 style={{
            fontSize: '17px',
            fontWeight: '600',
            color: t.warningFg,
            marginTop: 0,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
             Estado de Aprobación D7 - Aseguramiento de No Reincidencia (Calidad)
          </h3>

          {/* Multi-level Approval Steps - Dynamic based on confirmation_users (D7 uses Confirmation section) */}
          {(() => {
            const confirmationUsers = data?.escalationPath?.confirmation_users || data?.escalation_path?.confirmation_users || [];
            const configuredApprovers = [1, 2, 3].filter(step => {
              const approver = confirmationUsers[step];
              return approver !== undefined && approver !== null;
            });

            if (configuredApprovers.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '12px', color: t.textMuted, fontSize: '13px' }}>
                  No hay aprobadores configurados para D7
                </div>
              );
            }

            const d7CurrentStep = data?.d7CurrentApprovalStep || 0;
            const approvalData = {
              1: { status: data?.d7Approval1Status, at: data?.d7Approval1At, comments: data?.d7Approval1Comments },
              2: { status: data?.d7Approval2Status, at: data?.d7Approval2At, comments: data?.d7Approval2Comments },
              3: { status: data?.d7Approval3Status, at: data?.d7Approval3At, comments: data?.d7Approval3Comments }
            };

            return (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                {configuredApprovers.map(step => {
                  const isPast = step < d7CurrentStep;
                  const isCurrent = step === d7CurrentStep && data?.d7Status === 'under_review';
                  const approval = approvalData[step];
                  const approverData = confirmationUsers[step];
                  const approverId = typeof approverData === 'object' ? (approverData?.id || approverData) : approverData;
                  const approverUser = users.find(u => u.id === approverId);
                  const approverName = approverUser
                    ? `${approverUser.firstName || approverUser.first_name || ''} ${approverUser.lastName || approverUser.last_name || ''}`.trim() || approverUser.email
                    : (typeof approverData === 'object' && approverData?.name) ? approverData.name : `ID: ${approverId}`;
                  const approverEmail = approverUser?.email || '';

                  return (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '6px',
                        border: isCurrent ? `2px solid ${t.primary}` : `1px solid ${t.border}`,
                        backgroundColor: isPast
                          ? approval?.status === 'approved' ? t.successBg : approval?.status === 'rejected' ? t.errorBg : t.bg
                          : isCurrent ? t.accentBg : t.bg,
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '5px', fontSize: '13px' }}>
                        {isPast && approval?.status === 'approved' && ' '}
                        {isPast && approval?.status === 'rejected' && ' '}
                        {isCurrent && ' '}
                        {approverName}
                      </div>
                      {approverEmail && (
                        <div style={{ fontSize: '11px', color: t.primary, marginBottom: '4px' }}>
                          {approverEmail}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: t.textMuted }}>
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
          {d7ApprovalHistory.length > 0 && (
            <div style={{
              backgroundColor: t.bgCard,
              padding: '15px',
              borderRadius: '6px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>
                Historial de Aprobaciones D7 ({d7ApprovalHistory.length} registros):
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {d7ApprovalHistory.map((entry, index) => {
                  const isApproved = entry.actionType === 'approved';
                  const isRejected = entry.actionType === 'rejected';
                  const isSubmitted = entry.actionType === 'submitted_for_approval';

                  return (
                    <div key={entry.id || index} style={{
                      marginBottom: '10px',
                      padding: '10px',
                      backgroundColor: isApproved ? t.successBg : isRejected ? t.errorBg : t.accentBg,
                      borderLeft: `3px solid ${isApproved ? t.success : isRejected ? t.error : t.accent}`,
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: isApproved ? t.successFg : isRejected ? t.errorFg : t.accentFg }}>
                          {entry.userName || 'Usuario'}
                        </strong>
                        <span style={{ fontSize: '11px', color: t.textMuted }}>
                          {entry.createdAt && new Date(entry.createdAt).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {isApproved && <span style={{ color: t.successFg }}>Aprobado</span>}
                        {isRejected && <span style={{ color: t.errorFg }}>Rechazado</span>}
                        {isSubmitted && <span style={{ color: t.accentFg }}>Enviado a Aprobación</span>}
                        {entry.description && (
                          <span style={{ marginLeft: '8px', color: t.textMuted }}>
                            - {entry.description}
                          </span>
                        )}
                      </div>
                      {entry.newValue && typeof entry.newValue === 'object' && entry.newValue.comments && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px',
                          backgroundColor: t.warningBg,
                          borderLeft: `2px solid ${t.warning}`,
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

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: t.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: t.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginTop: 0,
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
               Agregar Categoría de Auditoría
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: t.textMuted
                }}
              >

              </button>
            </h3>

            {/* Deleted Default Items */}
            {getDeletedDefaultItems().length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: t.text,
                  marginBottom: '12px'
                }}>
                   Categorías Estándar (restaurar):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getDeletedDefaultItems().map(item => (
                    <button
                      key={item.name}
                      onClick={() => addAuditItemFromModal(item.name, item.icon, true)}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: t.accentBg,
                        border: `1px solid ${t.accentBorder}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: t.accentFg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = t.hover}
                      onMouseOut={(e) => e.target.style.backgroundColor = t.accentBg}
                    >
                      {item.icon} {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Category */}
            <div style={{
              borderTop: getDeletedDefaultItems().length > 0 ? `1px solid ${t.border}` : 'none',
              paddingTop: getDeletedDefaultItems().length > 0 ? '20px' : '0'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: t.text,
                marginBottom: '12px'
              }}>
                 Crear Categoría Personalizada:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Ej: Reporte Dimensional, Pruebas de Laboratorio..."
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: t.bgCard,
                    color: t.text
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                />
                <button
                  onClick={addCustomCategory}
                  disabled={!customCategoryName.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: customCategoryName.trim() ? t.success : t.bgPanel,
                    color: customCategoryName.trim() ? t.bgCard : t.textMuted,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: customCategoryName.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Cancel Button */}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal (ISO Compliance) */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: t.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '95%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: t.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginTop: 0,
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span> Historial de Auditoría - {historyData.itemName}</span>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: t.textMuted
                }}
              >

              </button>
            </h3>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                Cargando historial...
              </div>
            ) : (historyData.history.length === 0 && !historyData.currentRound) ? (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                No hay historial de rondas anteriores
              </div>
            ) : (
              <div>
                {/* Current Round - Complete Info */}
                {historyData.currentRound && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: t.bg,
                    borderRadius: '8px',
                    border: `1px solid ${t.border}`,
                    marginBottom: '16px'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '600', fontSize: '16px', color: t.text }}>
                          {historyData.currentRound.itemIcon} {historyData.currentRound.itemName}
                        </span>
                        <span style={{ padding: '2px 8px', backgroundColor: t.bgPanel, color: t.text, borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          Ronda {historyData.currentRound.auditRound || 1}
                        </span>
                        {(!historyData.currentRound.assignedAuditors || historyData.currentRound.assignedAuditors.length === 0) && historyData.currentRound.auditorJudgment && (
                          <span style={{ padding: '2px 8px', backgroundColor: t.accentBg, color: t.accentFg, borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                            Auto-verificación
                          </span>
                        )}
                      </div>
                      {historyData.currentRound.auditorJudgment && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          backgroundColor: historyData.currentRound.auditorJudgment === 'OK' ? t.successBg :
                                          historyData.currentRound.auditorJudgment === 'NOK' ? t.errorBg : t.warningBg,
                          color: historyData.currentRound.auditorJudgment === 'OK' ? t.successFg :
                                 historyData.currentRound.auditorJudgment === 'NOK' ? t.errorFg : t.warningFg
                        }}>
                          {historyData.currentRound.auditorJudgment}
                        </span>
                      )}
                    </div>

                    {/* Check Item - What to verify */}
                    {historyData.currentRound.checkItem && (
                      <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: t.bgCard, borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px', fontWeight: '600' }}>QUÉ VERIFICAR:</div>
                        <div style={{ fontSize: '14px', color: t.text }}>{historyData.currentRound.checkItem}</div>
                      </div>
                    )}

                    {/* Leader Comments/Notes */}
                    {historyData.currentRound.comments && (
                      <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: t.accentBg, borderRadius: '6px', border: `1px solid ${t.accentBorder}` }}>
                        <div style={{ fontSize: '11px', color: t.accentFg, marginBottom: '4px', fontWeight: '600' }}>NOTAS DEL LÍDER:</div>
                        <div style={{ fontSize: '14px', color: t.text }}>{historyData.currentRound.comments}</div>
                      </div>
                    )}

                    {/* Due Date */}
                    {historyData.currentRound.dueDate && (
                      <div style={{ marginBottom: '10px', fontSize: '13px', color: t.textMuted }}>
                        <strong>Fecha límite:</strong> {new Date(historyData.currentRound.dueDate).toLocaleDateString('es-MX')}
                      </div>
                    )}

                    {/* Auditor Response Section */}
                    {(historyData.currentRound.auditorJudgment || historyData.currentRound.auditorComments) && (
                      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: historyData.currentRound.auditorJudgment === 'OK' ? t.successBg : historyData.currentRound.auditorJudgment === 'NOK' ? t.errorBg : t.warningBg, borderRadius: '6px', border: `1px solid ${historyData.currentRound.auditorJudgment === 'OK' ? t.successBorder : historyData.currentRound.auditorJudgment === 'NOK' ? t.errorBorder : t.warningBorder}` }}>
                        <div style={{ fontSize: '11px', color: t.text, marginBottom: '4px', fontWeight: '600' }}>RESPUESTA DEL AUDITOR:</div>
                        {historyData.currentRound.auditorComments && (
                          <div style={{ fontSize: '14px', color: t.text, marginBottom: '8px' }}>{historyData.currentRound.auditorComments}</div>
                        )}
                        {historyData.currentRound.auditorName && (
                          <div style={{ fontSize: '12px', color: t.textMuted }}>
                            Verificado por: {historyData.currentRound.auditorName}
                            {historyData.currentRound.verificationDate && (
                              <span> - {new Date(historyData.currentRound.verificationDate).toLocaleDateString('es-MX')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status if not yet audited */}
                    {!historyData.currentRound.auditorJudgment && historyData.currentRound.sentToAudit && (
                      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: t.warningBg, borderRadius: '6px', border: `1px solid ${t.warningBorder}` }}>
                        <span style={{ fontSize: '13px', color: t.warningFg, fontWeight: '500' }}>
                          ⏳ Pendiente de respuesta del auditor
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Historical Rounds */}
                {historyData.history.length > 0 && (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
                      Rondas Anteriores (Hallazgos Cerrados):
                    </div>
                    {historyData.history.map((round, idx) => (
                  <div key={idx} style={{
                    padding: '14px',
                    backgroundColor: t.bg,
                    borderRadius: '8px',
                    border: `1px solid ${t.border}`,
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', color: t.textMuted }}>
                        Ronda {round.auditRound}
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: round.auditorJudgment === 'OK' ? t.successBg :
                                        round.auditorJudgment === 'NOK' ? t.errorBg : t.warningBg,
                        color: round.auditorJudgment === 'OK' ? t.successFg :
                               round.auditorJudgment === 'NOK' ? t.errorFg : t.warningFg
                      }}>
                        {round.auditorJudgment || 'Sin juicio'}
                      </span>
                    </div>
                    {round.leaderComments && (
                      <div style={{ fontSize: '13px', color: t.text, marginBottom: '6px' }}>
                        <strong>Comentarios líder:</strong> {round.leaderComments}
                      </div>
                    )}
                    {round.auditorComments && (
                      <div style={{ fontSize: '13px', color: t.text, marginBottom: '6px' }}>
                        <strong>Hallazgo auditor:</strong> {round.auditorComments}
                      </div>
                    )}
                    {round.closureNotes && (
                      <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '6px', fontStyle: 'italic' }}>
                        <strong>Razón re-envío:</strong> {round.closureNotes}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: t.textDim, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {round.auditorName && <span> Auditor: {round.auditorName}</span>}
                      {round.verificationDate && <span> {new Date(round.verificationDate).toLocaleDateString('es-MX')}</span>}
                      {round.closedByName && <span> Cerrado por: {round.closedByName}</span>}
                    </div>
                  </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.primary,
                  color: t.bgCard,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: t.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: t.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginTop: 0,
              marginBottom: '16px'
            }}>
               Confirmar Eliminación
            </h3>
            <p style={{
              fontSize: '14px',
              color: t.textMuted,
              marginBottom: '24px'
            }}>
              {deleteConfirmModal.message}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={deleteConfirmModal.onConfirm}
                style={{
                  padding: '8px 16px',
                  backgroundColor: t.error,
                  color: t.bgCard,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
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
          backgroundColor: t.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: t.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: t.text,
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Regresar D7 a Borrador
            </h3>

            <div style={{
              backgroundColor: t.errorBg,
              border: `1px solid ${t.errorBorder}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, color: t.errorFg, fontSize: '14px' }}>
                Esta acción revertirá la sección a estado de borrador, permitiendo editar nuevamente. Se eliminará el estado de aprobación actual.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: t.text
              }}>
                Razón (obligatorio):
              </label>
              <textarea
                value={revertComments}
                onChange={(e) => setRevertComments(e.target.value)}
                placeholder="Ingrese el motivo de la reversión..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgInput,
                  color: t.text,
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
                  border: `1px solid ${t.border}`,
                  backgroundColor: 'transparent',
                  color: t.text,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRevertToDraft}
                disabled={isReverting || !revertComments.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isReverting || !revertComments.trim() ? t.bgPanel : t.error,
                  color: isReverting || !revertComments.trim() ? t.textMuted : t.bgCard,
                  cursor: isReverting || !revertComments.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isReverting ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const getStyles = (t) => ({
  container: {
    padding: '16px 24px',
    width: '100%',
    maxWidth: 'none'
  },
  header: {
    backgroundColor: t.accent,
    color: t.bgCard,
    padding: '16px',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  blockedMessage: {
    backgroundColor: t.warningBg,
    border: `2px solid ${t.warningBorder}`,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  section: {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: t.text
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '6px',
    color: t.text
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard,
    color: t.text
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    backgroundColor: t.bgCard,
    color: t.text
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  fileLabel: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: t.accent,
    color: t.bgCard,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  fileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
    marginTop: '12px'
  },
  fileCard: {
    position: 'relative',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    overflow: 'hidden'
  },
  thumbnail: {
    width: '100%',
    height: '120px',
    objectFit: 'cover'
  },
  deleteBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: t.error,
    color: t.bgCard,
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  fileList: {
    marginTop: '12px'
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    marginBottom: '8px'
  },
  saveButton: {
    padding: '12px 32px',
    backgroundColor: t.success,
    color: t.bgCard,
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  documentCard: {
    backgroundColor: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  documentHeader: {
    borderBottom: `1px solid ${t.border}`,
    paddingBottom: '8px'
  },
  trainingAddForm: {
    backgroundColor: t.accentBg,
    border: `1px solid ${t.accentBorder}`,
    borderRadius: '8px',
    padding: '16px',
    marginTop: '20px'
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: t.success,
    color: t.bgCard,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: `1px solid ${t.border}`
  },
  checklistTable: {
    width: '100%',
    borderCollapse: 'collapse',
    border: `1px solid ${t.border}`,
    fontSize: '14px'
  },
  th: {
    backgroundColor: t.bgPanel,
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    borderBottom: `2px solid ${t.border}`
  },
  thCompact: {
    backgroundColor: t.bgPanel,
    padding: '6px 4px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '600',
    borderBottom: `2px solid ${t.border}`,
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: `1px solid ${t.border}`
  },
  td: {
    padding: '12px',
    fontSize: '14px'
  },
  tdCompact: {
    padding: '6px 4px',
    fontSize: '11px',
    verticalAlign: 'middle'
  }
});

export default D7Validation;
