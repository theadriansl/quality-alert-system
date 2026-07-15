import React, { useState, useEffect } from 'react';
import eightDService from '../../services/eightDService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import PartsInventoryTable from './PartsInventoryTable';
import { isUserAdmin } from '../../utils/permissions';
// UX Improvements (MEJORAS)
import CollapsibleSection from './CollapsibleSection';
import ApprovalStepper from './ApprovalStepper';
import SectionProgressIndicator from './SectionProgressIndicator';

const TeamAssignmentTab = ({ data, onDataUpdate, language, activeSection, isReadOnly = false }) => {
  const { theme: themeColors } = useTheme();
  const { t: tr, language: ctxLanguage, changeLanguage } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);

  const [escalationData, setEscalationData] = useState(() => {
    // Inicialización con datos del reporte si existen
    return {
      // Header Info
      reportId: data?.reportId || data?.id || `8D-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      title: data?.title || '',
      severidad: data?.severity || data?.severidad || 'Medium',
      fechaEmission: data?.issueDate || data?.fechaEmission || data?.createdAt || new Date().toISOString().split('T')[0],

      // Basic 8D Info
      supplierName: data?.supplierName || data?.customer || '',
      supplierAccount: data?.supplierAccount || '',
      partNumber: data?.partNumber || '',
      partName: data?.partName || '',
      description: data?.description || '',
      problemType: data?.problemType || 'Nuevo',

      tipoIssue: data?.tipoIssue || 'Supplier',
      tipoResp: data?.tipoResp || 'R&D',
      timingOccurrence: data?.timingOccurrence || '',
      requerimientoCM: data?.requerimientoCM || {
        temp: false,
        sorteo: false,
        cuarentena: false
      },

      // Sección 1: ISSUE - 1 responsable principal (Emisor) + hasta 3 aprobadores
      issueSection: {
        primary: null,  // Emisor (responsable principal)
        approvers: [null, null, null],  // Hasta 3 aprobadores
        description: data?.description || '',
        status: 'PENDING'
      },

      // Sección 2: COUNTERMEASURE - 1 responsable principal + hasta 3 aprobadores
      countermeasureSection: {
        primary: null,  // Responsable (quien implementa)
        approvers: [null, null, null],  // Hasta 3 aprobadores
        status: 'PENDING'
      },

      // Sección 3: CONFIRMATION - 1 responsable principal (Auditor) + hasta 3 aprobadores
      confirmationSection: {
        primary: null,  // Auditor (quien audita)
        approvers: [null, null, null],  // Hasta 3 aprobadores
        status: 'PENDING'
      }
    };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [teamPresets, setTeamPresets] = useState([]);
  const [hasManualAssignments, setHasManualAssignments] = useState(false);

  // Estados para búsqueda de usuarios en tabla
  const [activeCell, setActiveCell] = useState(null); // {section, role, index}
  const [cellSearchTerm, setCellSearchTerm] = useState('');

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeCell && !event.target.closest('.user-search-cell')) {
        setActiveCell(null);
        setCellSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCell]);

  // Estado para departamentos
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(data?.departmentId || null);

  // Estados para Client-Project-Parts
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedParts, setSelectedParts] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);

  // Estados para fotos y documentos
  const [photoNoGood, setPhotoNoGood] = useState(null);
  const [photoOK, setPhotoOK] = useState(null);
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [imageModal, setImageModal] = useState({ isOpen: false, imageUrl: null, imageName: '' });

  // Estados para D3 - Acciones de Contención
  const [d3Data, setD3Data] = useState({
    detectionPoints: {
      duringProcess: { yes: false, no: false },
      afterManufacture: { yes: false, no: false },
      priorDespatch: { yes: false, no: false }
    },
    nonDetectionReasons: ['', '', '', '', ''], // 5 Why's
    suspectMaterialDisposal: '',
    conformanceMaterialGuarantee: '',
    requiresRework: null, // null, true, or false
    reworkUnitCost: 0
  });

  // Estado de aprobación D1-D2-D3
  const [d123ApprovalStatus, setD123ApprovalStatus] = useState(data?.d1D2D3ApprovalStatus || 'draft');
  const [currentApprovalStep, setCurrentApprovalStep] = useState(data?.currentApprovalStep || 0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [approvalHistory, setApprovalHistory] = useState({
    approval1: { status: data?.approval_1Status, by: data?.approval_1By, at: data?.approval_1At, comments: data?.approval_1Comments },
    approval2: { status: data?.approval_2Status, by: data?.approval_2By, at: data?.approval_2At, comments: data?.approval_2Comments },
    approval3: { status: data?.approval_3Status, by: data?.approval_3By, at: data?.approval_3At, comments: data?.approval_3Comments }
  });

  // Full approval history from audit log (D3)
  const [d3ApprovalHistory, setD3ApprovalHistory] = useState([]);

  // Estados para edición de secciones aprobadas
  const [isEditingParts, setIsEditingParts] = useState(false);
  const [isEditingD3, setIsEditingD3] = useState(false);
  const [isSavingPartialChanges, setIsSavingPartialChanges] = useState(false);

  // Estado para notificaciones toast
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Estado para revertir a draft (Admin only)
  const [showRevertD3Modal, setShowRevertD3Modal] = useState(false);
  const [revertD3Comments, setRevertD3Comments] = useState('');
  const [isRevertingD3, setIsRevertingD3] = useState(false);

  // Función para mostrar toast
  const showToast = (type, message) => {
    setToast({ type, message });

    // Auto-ocultar solo si es success
    if (type === 'success') {
      setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  };

  // Helper function to open mailto with email notification data
  const openMailtoFromNotification = (emailNotification) => {
    if (!emailNotification || !emailNotification.recipients || emailNotification.recipients.length === 0) {
      return;
    }

    // Usar punto y coma para compatibilidad con Outlook
    const emailList = emailNotification.recipients.map(r => r.email).join(';');

    let bodyText = '';
    if (emailNotification.type === 'rejection') {
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
    } else if (emailNotification.type === 'approval_request') {
      bodyText = `Estimado(a),\n\n` +
        `Se requiere su aprobación para el siguiente reporte 8D:\n\n` +
        `Reporte: ${emailNotification.reportId || 'N/A'}\n` +
        `Titulo: ${emailNotification.reportTitle || 'N/A'}\n` +
        `Proveedor/Cliente: ${emailNotification.supplierName || 'N/A'}\n\n` +
        `Por favor revise y apruebe en:\n` +
        `http://localhost:3000/8d-workflow?reportId=${emailNotification.reportId}\n\n` +
        `Saludos,\nSistema de Calidad`;
    } else if (emailNotification.type === 'fully_approved') {
      bodyText = `Estimado(a),\n\n` +
        `El siguiente reporte 8D ha sido APROBADO completamente (D1-D2-D3):\n\n` +
        `Reporte: ${emailNotification.reportId || 'N/A'}\n` +
        `Titulo: ${emailNotification.reportTitle || 'N/A'}\n` +
        `Proveedor/Cliente: ${emailNotification.supplierName || 'N/A'}\n\n` +
        `Ahora puede continuar con las etapas D4-D8.\n\n` +
        `Acceder al reporte:\n` +
        `http://localhost:3000/8d-workflow?reportId=${emailNotification.reportId}\n\n` +
        `Saludos,\nSistema de Calidad`;
    }

    if (bodyText) {
      const mailtoUrl = `mailto:${emailList}?subject=${encodeURIComponent(emailNotification.subject)}&body=${encodeURIComponent(bodyText)}`;
      window.location.href = mailtoUrl;
    }
  };

  // Función para determinar si los campos deben estar bloqueados
  const isD123Locked = () => {
    // Si no hay datos del reporte aún (nuevo reporte), no bloquear
    if (!data || !data.id) return false;

    // EXCEPCIÓN: Administradores del sistema SIEMPRE pueden editar todo
    const isSystemAdmin = isUserAdmin(currentUser);
    if (isSystemAdmin) {
      return false; // Admins nunca están bloqueados
    }

    const approvalStatus = data.d1D2D3ApprovalStatus || d123ApprovalStatus;
    const reportCreatorId = data.createdBy;
    const currentUserId = currentUser?.id;


    // Estados y lógica de bloqueo para flujo secuencial:
    // - 'draft': Solo el creador puede editar
    // - 'pending_approval_1/2/3': Solo el aprobador actual puede aprobar/rechazar, todos los demás solo visualizan
    // - 'rejected_by_a1/a2/a3': Solo el creador puede editar para corregir y reenviar
    // - 'approved': Completamente bloqueado para todos
    // - EXCEPCIÓN: Los administradores SIEMPRE pueden editar (verificado arriba)

    // ESTADO: Borrador - solo el creador puede editar
    if (approvalStatus === 'draft') {
      return currentUserId !== reportCreatorId;
    }

    // ESTADOS: Aprobación secuencial en progreso
    // Cuando está en pending_approval_X, NADIE puede editar los campos D1-D2-D3
    // Solo pueden aprobar/rechazar usando los botones de aprobación
    if (approvalStatus === 'pending_approval_1' ||
        approvalStatus === 'pending_approval_2' ||
        approvalStatus === 'pending_approval_3') {
        return true; // Bloqueado para todos durante aprobación
    }

    // ESTADOS: Rechazado - solo el creador puede editar para corregir
    if (approvalStatus === 'rejected_by_a1' ||
        approvalStatus === 'rejected_by_a2' ||
        approvalStatus === 'rejected_by_a3') {
      const isCreator = currentUserId === reportCreatorId;
        return !isCreator; // Bloquear si NO es el creador
    }

    // ESTADO: Aprobado - bloqueado para todos
    if (approvalStatus === 'approved') {
        return true;
    }

    // Estados legacy (para compatibilidad con reportes antiguos)
    if (approvalStatus === 'pending_approval') {
      return true; // Bloqueado durante aprobación
    }

    if (approvalStatus === 'rejected') {
      return currentUserId !== reportCreatorId;
    }

    // Por defecto, no bloquear
    return false;
  };

  const fieldsLocked = isD123Locked();

  // Función para determinar si un campo de aprobador específico debe estar bloqueado
  // Los aprobadores que ya aprobaron o están aprobando actualmente no pueden ser removidos/cambiados
  const isApproverFieldLocked = (approverIndex) => {
    // Si los campos están bloqueados en general, este también lo está
    if (fieldsLocked) return true;

    // Si no estamos en proceso de aprobación, no bloquear
    if (!currentApprovalStep || currentApprovalStep === 0) return false;

    // Bloquear si este aprobador ya aprobó o está aprobando actualmente
    // approverIndex: 0 = Aprobador 1, 1 = Aprobador 2, 2 = Aprobador 3
    // currentApprovalStep: 1 = Aprobador 1, 2 = Aprobador 2, 3 = Aprobador 3
    // Bloqueamos si currentApprovalStep > approverIndex (ya aprobó) o === approverIndex + 1 (está aprobando)
    return currentApprovalStep >= (approverIndex + 1);
  };

  // Cargar departamentos
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/departments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success && result.departments) {
          setDepartments(result.departments);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    loadDepartments();
  }, []);

  // Cargar usuarios desde el backend
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/users/list');
        const data = await response.json();

        if (data.success && data.users) {
          setUsers(data.users);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error loading users:', error);
        // Fallback a datos estáticos
        const fallbackUsers = [
          { id: 1, email: 'admin@8dsystem.com', firstName: 'John', lastName: 'Director', position: 'Quality Director', role: 'Champion', department: 'Quality Management', phone: '+52-442-123-4567' },
          { id: 2, email: 'manager@8dsystem.com', firstName: 'Maria', lastName: 'Manager', position: 'Quality Manager', role: 'Manager', department: 'Quality Engineering', phone: '+52-442-234-5678' },
          { id: 3, email: 'engineer@8dsystem.com', firstName: 'Carlos', lastName: 'Engineer', position: 'Senior Quality Engineer', role: 'Engineer', department: 'Product Engineering', phone: '+52-442-345-6789' },
          { id: 4, email: 'technician@8dsystem.com', firstName: 'Ana', lastName: 'Technician', position: 'Quality Technician', role: 'Technician', department: 'Quality Control', phone: '+52-442-456-7890' },
          { id: 5, email: 'supervisor@8dsystem.com', firstName: 'Luis', lastName: 'Supervisor', position: 'Production Supervisor', role: 'Supervisor', department: 'Production', phone: '+52-442-567-8901' },
          { id: 6, email: 'analyst@8dsystem.com', firstName: 'Sofia', lastName: 'Analyst', position: 'Quality Analyst', role: 'Analyst', department: 'Quality Engineering', phone: '+52-442-678-9012' }
        ];
        setUsers(fallbackUsers);
      }
    };
    loadUsers();
  }, []);

  // Cargar clientes
  useEffect(() => {
    const loadClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/clients/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.clients) {
          setClients(data.clients.filter(c => c.isActive));
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    loadClients();
  }, []);

  // Actualizar campos básicos cuando los datos del reporte cambien
  useEffect(() => {
    if (data) {
  
      // Convertir issueDate a formato YYYY-MM-DD para el input type="date"
      let formattedDate = null;
      if (data.issueDate) {
        try {
          const dateObj = new Date(data.issueDate);
          formattedDate = dateObj.toISOString().split('T')[0];
        } catch (e) {
          console.error('Error formatting date:', e);
        }
      } else if (data.fechaEmission) {
        formattedDate = data.fechaEmission;
      } else if (data.createdAt) {
        try {
          const dateObj = new Date(data.createdAt);
          formattedDate = dateObj.toISOString().split('T')[0];
        } catch (e) {
          console.error('Error formatting createdAt:', e);
        }
      }

      setEscalationData(prev => ({
        ...prev,
        reportId: data.reportId || data.id || prev.reportId,
        title: data.title || prev.title,
        severidad: data.severity || data.severidad || prev.severidad,
        fechaEmission: formattedDate || prev.fechaEmission,
        supplierName: data.supplierName || data.customer || prev.supplierName,
        supplierAccount: data.supplierAccount || prev.supplierAccount,
        partNumber: data.partNumber || prev.partNumber,
        partName: data.partName || prev.partName,
        description: data.description || prev.description,
        problemType: data.problemType || prev.problemType,
        tipoIssue: data.tipoIssue || prev.tipoIssue,
        tipoResp: data.tipoResp || prev.tipoResp,
        timingOccurrence: data.timingOccurrence || prev.timingOccurrence
      }));

      // Sincronizar department_id del reporte
      if (data.departmentId) {
        setDepartmentId(data.departmentId);
      }
    }
  }, [data]);

  // Sincronizar estados de aprobación con los datos del reporte
  useEffect(() => {
    if (data) {
      setD123ApprovalStatus(data.d1D2D3ApprovalStatus || 'draft');
      setCurrentApprovalStep(data.currentApprovalStep || 0);
      setApprovalHistory({
        approval1: {
          status: data.approval_1Status,
          by: data.approval_1By,
          at: data.approval_1At,
          comments: data.approval_1Comments
        },
        approval2: {
          status: data.approval_2Status,
          by: data.approval_2By,
          at: data.approval_2At,
          comments: data.approval_2Comments
        },
        approval3: {
          status: data.approval_3Status,
          by: data.approval_3By,
          at: data.approval_3At,
          comments: data.approval_3Comments
        }
      });
    }
  }, [data]);

  // Load D3 approval history from audit log
  useEffect(() => {
    const fetchD3ApprovalHistory = async () => {
      if (!data?.id) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/audit-log?actionCategory=approval&sectionName=d3`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const result = await response.json();
        if (result.success) {
          setD3ApprovalHistory(result.auditLog || []);
        }
      } catch (error) {
        console.error('Error loading D3 approval history:', error);
      }
    };
    fetchD3ApprovalHistory();
  }, [data?.id, d123ApprovalStatus]);

  // Cargar datos guardados de cliente, proyecto y partes desde el backend
  useEffect(() => {
    if (data) {

      // Cargar cliente y sus proyectos
      if (data.selectedClient) {
        setSelectedClient(data.selectedClient);

        // Cargar proyectos del cliente
        const loadProjectsForClient = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/clients/${data.selectedClient.id}/projects`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success && result.projects) {
              setProjects(result.projects);
            }
          } catch (error) {
            console.error('Error loading projects for saved client:', error);
          }
        };
        loadProjectsForClient();
      }

      if (data.selectedProject) {
        setSelectedProject(data.selectedProject);

        // Cargar partes del proyecto si hay proyecto seleccionado
        if (data.selectedProject.id) {
          const loadPartsForProject = async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`http://localhost:5000/projects/${data.selectedProject.id}/parts`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const result = await response.json();

              if (result.success && result.parts) {
                setAvailableParts(result.parts);
              }
            } catch (error) {
              console.error('Error loading parts for saved project:', error);
            }
          };
          loadPartsForProject();
        }
      }

      if (data.selectedParts && data.selectedParts.length > 0) {
        setSelectedParts(data.selectedParts);
      }

      // Cargar fotos si existen
      const normalizeUrl = (obj) => {
        if (!obj || obj instanceof File) return obj;
        const url = obj.url || obj;
        const normalized = url && !String(url).startsWith('http') ? `http://localhost:5000${url}` : url;
        return typeof obj === 'object' ? { ...obj, url: normalized } : normalized;
      };

      if (data.photoNoGood) {
        setPhotoNoGood(normalizeUrl(data.photoNoGood));
      }
      if (data.photoOK) {
        setPhotoOK(normalizeUrl(data.photoOK));
      }
      if (data.attachedDocuments) {
        setAttachedDocuments(data.attachedDocuments.map(normalizeUrl));
      }

      // Cargar D3 data si existe
      if (data.d3Data) {
        setD3Data(data.d3Data);
      }
    }
  }, [data]);

  // Cargar team presets del usuario actual
  useEffect(() => {
    const loadTeamPresets = async () => {
      if (!currentUser || !currentUser.id) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/users/${currentUser.id}/team-presets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
          setTeamPresets(data.presets);
        }
      } catch (error) {
        console.error('Error loading team presets:', error);
      }
    };
    loadTeamPresets();
  }, [currentUser]);

  // Efecto para asignar usuarios del reporte después de cargar la lista de usuarios
  useEffect(() => {
    //  Si el usuario ya hizo asignaciones manuales, NO sobrescribir
    if (hasManualAssignments) {
      return;
    }

    // Función para encontrar usuario por ID o datos congelados
    // Compatible con formato antiguo (solo ID) y nuevo (objeto {id, name})
    const findUserById = (userData) => {
      if (!userData) return null;

      // Si es un objeto con id y name (datos congelados)
      if (typeof userData === 'object' && userData.id) {
        const userId = userData.id;
        const foundUser = users.find(user => user.id === userId);
        // Si encontramos el usuario en la lista, usarlo (puede tener datos más completos)
        // Si no, usar los datos congelados
        return foundUser || {
          id: userId,
          name: userData.name,
          firstName: userData.name?.split(' ')[0] || '',
          lastName: userData.name?.split(' ').slice(1).join(' ') || ''
        };
      }

      // Formato antiguo: solo ID numérico
      return users.find(user => user.id === userData);
    };

    // Verificar si hay escalation_path del backend con arrays de user IDs
    // También verificar escalationPath (camelCase) por si acaso
    const escalationPath = data?.escalation_path || data?.escalationPath;
    const useBackendEscalationPath = escalationPath &&
      (escalationPath.issue_users?.length > 0 ||
       escalationPath.countermeasure_users?.length > 0 ||
       escalationPath.confirmation_users?.length > 0);


    // Solo cargar usuarios si vienen del backend (reporte existente)
    if (users.length > 0 && useBackendEscalationPath) {
  
      // Mapear usuarios desde escalation_path del backend (nueva estructura 1+3)
      const getIssueSection = () => {

        if (escalationPath.issue_users) {
          const userObjects = escalationPath.issue_users
            .map(userId => findUserById(userId))
            .filter(u => u !== null);

          //  IMPORTANTE: Para Issue Section, el Primary SIEMPRE debe ser el CREADOR del reporte
          // NO usamos userObjects[0] porque podría haber sido asignado manualmente a otra persona
          const creatorUser = findUserById(data.createdBy);

          return {
            primary: creatorUser || null,  // Siempre usar el creador como Emisor
            approvers: [
              userObjects[1] || null,  // Los aprobadores siguen siendo del escalation_path
              userObjects[2] || null,
              userObjects[3] || null
            ]
          };
        }

        // Si no hay escalation_path, intentar usar el creador como primary
        const creatorUser = findUserById(data.createdBy);
        return {
          primary: creatorUser || null,
          approvers: [null, null, null]
        };
      };

      const getCountermeasureSection = () => {
        if (escalationPath.countermeasure_users) {
          const userObjects = escalationPath.countermeasure_users
            .map(userId => findUserById(userId))
            .filter(u => u !== null);

          return {
            primary: userObjects[0] || null,
            approvers: [
              userObjects[1] || null,
              userObjects[2] || null,
              userObjects[3] || null
            ]
          };
        }
        return { primary: null, approvers: [null, null, null] };
      };

      const getConfirmationSection = () => {
        if (escalationPath.confirmation_users) {
          const userObjects = escalationPath.confirmation_users
            .map(userId => findUserById(userId))
            .filter(u => u !== null);

          return {
            primary: userObjects[0] || null,
            approvers: [
              userObjects[1] || null,
              userObjects[2] || null,
              userObjects[3] || null
            ]
          };
        }
        return { primary: null, approvers: [null, null, null] };
      };

      // Actualizar escalationData solo con datos del backend
      const issueData = getIssueSection();
      const countermeasureData = getCountermeasureSection();
      const confirmationData = getConfirmationSection();

      setEscalationData(prev => {
        const newState = {
          ...prev,
          issueSection: {
            ...prev.issueSection,
            primary: issueData.primary,
            approvers: issueData.approvers
          },
          countermeasureSection: {
            ...prev.countermeasureSection,
            primary: countermeasureData.primary,
            approvers: countermeasureData.approvers
          },
          confirmationSection: {
            ...prev.confirmationSection,
            primary: confirmationData.primary,
            approvers: confirmationData.approvers
          }
        };
        // Auto-llenar tipoResp con el departamento del usuario de countermeasure
        if (countermeasureData.primary?.department) {
          newState.tipoResp = countermeasureData.primary.department;
        }
        return newState;
      });
    }
    // Para reportes NUEVOS (sin ID): Solo asignar el usuario actual como Emisor
    //  NO ejecutar si el reporte ya existe (tiene ID) - esto evita borrar usuarios existentes
    else if (users.length > 0 && currentUser && !useBackendEscalationPath && !data?.id) {
      // Buscar el usuario actual en la lista de usuarios
      const currentUserObj = users.find(u => u.id === currentUser.id || u.email === currentUser.email);

      if (currentUserObj) {
        setEscalationData(prev => {
          // Solo actualizar si el primary de issue está vacío
          if (prev.issueSection?.primary) {
            return prev; // No sobrescribir si ya hay datos
          }
          return {
            ...prev,
            issueSection: {
              ...prev.issueSection,
              primary: currentUserObj,  // Solo asignar usuario actual como Emisor
              approvers: prev.issueSection?.approvers || [null, null, null]
            }
            // NO tocar countermeasure ni confirmation - dejarlos como están
          };
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, data, currentUser, hasManualAssignments]);

  const translations = {
    en: {
      title: 'D1-D2-D3 - Quality',
      subtitle: 'Team, Problem and Containment',
      d1Title: 'D1 - Establish the Team',
      d2Title: 'D2 - Describe the Problem',
      d3Title: 'D3 - Implement Interim Containment Actions',
      problemBasics: 'Problem Basics',
      reportId: 'Report ID',
      problemTitle: 'Problem Title',
      severity: 'Severity',
      issueDate: 'Issue Date',
      supplierInfo: 'Supplier Information',
      supplierName: 'Supplier Name',
      supplierAccount: 'Supplier Account',
      partInfo: 'Part Information',
      partNumber: 'Part Number',
      partName: 'Part Name',
      problemType: 'Problem Type',
      problemDescription: 'Problem Description',
      escalationPath: 'Escalation Path Assignment',
      issueCard: 'ISSUE CARD',
      countermeasureCard: 'COUNTERMEASURE CARD',
      confirmationCard: 'CONFIRMATION CARD',
      searchUser: 'Search user...',
      noUser: 'No user assigned',
      assignUser: 'Assign User',
      completeAssignment: 'Send to Approval / Assign Responsible',
      saveDraft: 'Save Draft',
      save: 'Save Progress',
      issuer: 'Issuer',
      responsible: 'Responsible',
      auditor: 'Auditor',
      approver: 'Approver',
      optional: 'Optional',
      notAssigned: 'Not assigned'
    },
    es: {
      title: 'D1-D2-D3 - Calidad',
      subtitle: 'Equipo, Problema y Contención',
      d1Title: 'D1 - Establecer el Equipo',
      d2Title: 'D2 - Describir el Problema',
      d3Title: 'D3 - Implementar Acciones de Contención Inmediata',
      problemBasics: 'Información Básica del Problema',
      reportId: 'ID del Reporte',
      problemTitle: 'Título del Problema',
      severity: 'Severidad',
      issueDate: 'Fecha del Issue',
      supplierInfo: 'Información del Proveedor',
      supplierName: 'Nombre del Proveedor',
      supplierAccount: 'Cuenta del Proveedor',
      partInfo: 'Información de la Parte',
      partNumber: 'Número de Parte',
      partName: 'Nombre de la Parte',
      problemType: 'Tipo de Problema',
      problemDescription: 'Descripción del Problema',
      escalationPath: 'Asignación de Ruta de Escalación',
      issueCard: 'ISSUE CARD',
      countermeasureCard: 'COUNTERMEASURE CARD',
      confirmationCard: 'CONFIRMATION CARD',
      searchUser: 'Buscar usuario...',
      noUser: 'Sin usuario asignado',
      assignUser: 'Asignar Usuario',
      completeAssignment: 'Mandar a Aprobación / Asignar Responsable',
      saveDraft: 'Guardar Borrador',
      save: 'Guardar Progreso',
      issuer: 'Emisor',
      responsible: 'Responsable',
      auditor: 'Auditor',
      approver: 'Aprobador',
      optional: 'Opcional',
      notAssigned: 'No asignado'
    }
  };

  const t = (key) => translations[language][key] || key;

  const handleBasicInfoChange = (field, value) => {
    const updatedData = {
      ...escalationData,
      [field]: value
    };
    setEscalationData(updatedData);

    // Notificar cambios al componente padre inmediatamente
    onDataUpdate({
      ...updatedData,
      escalationComplete: false,
      currentStep: 'escalation'
    });
  };

  // Handler para cambio de cliente
  const handleClientChange = async (clientId) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    setSelectedClient(client);
    setSelectedProject(null);
    setSelectedParts([]);
    setProjects([]);
    setAvailableParts([]);
    const token = localStorage.getItem('token');

    if (client) {
      handleBasicInfoChange('supplierName', client.name);
      handleBasicInfoChange('supplierAccount', client.vendorNumber || client.alias);

      // Cargar proyectos del cliente
      try {
        const response = await fetch(`http://localhost:5000/clients/${clientId}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
          setProjects(data.projects);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }

      // Cargar partes ACTIVAS del cliente (BOM)
      try {
        const response = await fetch(`http://localhost:5000/clients/${clientId}/parts?activeOnly=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.parts) {
          console.log(` Loaded ${data.parts.length} active parts for client ${client.name}`);
          setAvailableParts(data.parts);
        }
      } catch (error) {
        console.error('Error loading client parts:', error);
      }
    }
  };

  // Handler para cambio de proyecto
  const handleProjectChange = async (projectId) => {
    const project = projects.find(p => p.id === parseInt(projectId));
    setSelectedProject(project);
    setSelectedParts([]);
    setAvailableParts([]);
    const token = localStorage.getItem('token');

    if (project) {
      // Cargar partes del proyecto
      try {
        const response = await fetch(`http://localhost:5000/projects/${projectId}/parts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
          setAvailableParts(data.parts);
        }
      } catch (error) {
        console.error('Error loading parts:', error);
      }
    }
  };

  // Handler para agregar/quitar parte
  const handlePartToggle = (part) => {
    setSelectedParts(prev => {
      const isSelected = prev.some(p => p.id === part.id);
      if (isSelected) {
        return prev.filter(p => p.id !== part.id);
      } else {
        // Verificar si ya existe una versión con datos de inventario
        const existingPart = prev.find(p => p.id === part.id);
        if (existingPart) {
          return prev; // Ya existe, no agregar de nuevo
        }
        // Agregar parte con campos de inventario inicializados
        return [...prev, {
          ...part,
          qtyWarehouse: part.qtyWarehouse || 0,
          qtyInProcess: part.qtyInProcess || 0,
          qtyInTransit: part.qtyInTransit || 0,
          qtyWithCustomer: part.qtyWithCustomer || 0,
          totalAffectedQty: part.totalAffectedQty || 0,
          totalCostImpact: part.totalCostImpact || 0
        }];
      }
    });
  };

  // Handler para guardar cambios de partes (cuando está aprobado)
  const handleSavePartsChanges = async () => {
    setIsSavingPartialChanges(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/update-parts`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedClient,
          selectedProject,
          selectedParts
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('success', ' Partes afectadas actualizadas correctamente');
        setIsEditingParts(false);

        // Preparar datos con el formato correcto para evitar que useEffect resetee
        if (result.report && result.report.parts) {
          const parts = result.report.parts;

          // Extraer cliente y proyecto de la primera parte
          const clientData = parts.length > 0 && parts[0].clientId ? {
            id: parts[0].clientId,
            name: parts[0].clientName
          } : null;

          const projectData = parts.length > 0 && parts[0].projectId ? {
            id: parts[0].projectId,
            projectNumber: parts[0].projectNumber,
            projectName: parts[0].projectName
          } : null;

          // Actualizar estados locales
          if (clientData) setSelectedClient(clientData);
          if (projectData) setSelectedProject(projectData);
          setSelectedParts(parts);

          // Actualizar componente padre SOLO con los campos que cambiaron
          if (onDataUpdate) {
            onDataUpdate({
              selectedClient: clientData,
              selectedProject: projectData,
              selectedParts: parts
            });
          }
        } else if (onDataUpdate) {
          onDataUpdate({
            selectedClient: null,
            selectedProject: null,
            selectedParts: []
          });
        }
      } else {
        showToast('error', ' Error al guardar cambios: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving parts changes:', error);
      showToast('error', ' Error al guardar cambios de partes');
    } finally {
      setIsSavingPartialChanges(false);
    }
  };

  // Handler para guardar cambios de D3 (cuando está aprobado)
  const handleSaveD3Changes = async () => {
    setIsSavingPartialChanges(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/update-d3`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          d3Data
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('success', ' D3 (Contención) actualizada correctamente');
        setIsEditingD3(false);

        // Construir objeto d3Data desde los campos individuales del reporte
        if (result.report) {
          const d3DataFromReport = {
            detectionPoints: result.report.d3DetectionPoints || {},
            nonDetectionReasons: result.report.d3NonDetectionReasons || [],
            suspectMaterialDisposal: result.report.d3SuspectMaterialDisposal || '',
            conformanceMaterialGuarantee: result.report.d3ConformanceGuarantee || '',
            requiresRework: result.report.d3RequiresRework,
            reworkUnitCost: result.report.d3ReworkUnitCost || 0,
            realImpactCost: result.report.d3RealImpactCost || 0
          };

          // Actualizar estado local
          setD3Data(d3DataFromReport);

          // Actualizar componente padre SOLO con los campos que cambiaron
          if (onDataUpdate) {
            onDataUpdate({
              d3Data: d3DataFromReport
            });
          }
        } else if (onDataUpdate) {
          onDataUpdate({
            d3Data: {}
          });
        }
      } else {
        showToast('error', ' Error al guardar cambios: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving D3 changes:', error);
      showToast('error', ' Error al guardar cambios de D3');
    } finally {
      setIsSavingPartialChanges(false);
    }
  };

  // Handlers para fotos y documentos
  const handlePhotoNoGoodChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoNoGood(file);
    } else {
      alert('Por favor selecciona un archivo de imagen válido');
    }
  };

  const handlePhotoOKChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoOK(file);
    } else {
      alert('Por favor selecciona un archivo de imagen válido');
    }
  };

  const handleDocumentsChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachedDocuments(prev => [...prev, ...files]);
  };

  const removeDocument = (index) => {
    setAttachedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removePhotoNoGood = () => {
    setPhotoNoGood(null);
  };

  const removePhotoOK = () => {
    setPhotoOK(null);
  };

  // Handlers para D3
  const handleDetectionPointChange = (point, option) => {
    setD3Data(prev => ({
      ...prev,
      detectionPoints: {
        ...prev.detectionPoints,
        [point]: {
          yes: option === 'yes',
          no: option === 'no'
        }
      }
    }));
  };

  const handleWhyChange = (index, value) => {
    setD3Data(prev => ({
      ...prev,
      nonDetectionReasons: prev.nonDetectionReasons.map((why, i) =>
        i === index ? value : why
      )
    }));
  };

  const handleD3TextChange = (field, value) => {
    setD3Data(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReworkChange = (value) => {
    setD3Data(prev => ({
      ...prev,
      requiresRework: value
    }));
  };

  const handleReworkCostChange = (value) => {
    setD3Data(prev => ({
      ...prev,
      reworkUnitCost: parseFloat(value) || 0
    }));
  };

  const handleUserAssignment = (section, role, index, user) => {

    // Marcar que hay asignaciones manuales para prevenir sobrescritura automática
    setHasManualAssignments(true);

    // Auto-llenar departmentId cuando se asigna el responsable principal de issue
    if (section === 'issueSection' && role === 'primary' && user && !departmentId) {
      const matchedDept = departments.find(d =>
        d.name && user.department && d.name.toLowerCase() === user.department.toLowerCase()
      );
      if (matchedDept) setDepartmentId(matchedDept.id);
    }

    setEscalationData(prev => {
      let updatedSection = { ...prev[section] };

      if (role === 'primary') {
        updatedSection.primary = user;
      } else if (role === 'approver') {
        const newApprovers = [...updatedSection.approvers];
        newApprovers[index] = user;
        updatedSection.approvers = newApprovers;
      }

      const updatedData = {
        ...prev,
        [section]: updatedSection
      };

      // Notificar cambios al componente padre inmediatamente
      onDataUpdate({
        ...updatedData,
        escalationComplete: false,
        currentStep: 'escalation'
      });

      return updatedData;
    });
    setShowDropdown(false);
    setEditingField(null);
  };

  const handleUserRemoval = (section, role, index) => {
    setEscalationData(prev => {
      let updatedSection = { ...prev[section] };

      if (role === 'primary') {
        updatedSection.primary = null;
      } else if (role === 'approver') {
        const newApprovers = [...updatedSection.approvers];
        newApprovers[index] = null;
        updatedSection.approvers = newApprovers;
      }

      const updatedData = {
        ...prev,
        [section]: updatedSection
      };

      // Notificar cambios al componente padre inmediatamente
      onDataUpdate({
        ...updatedData,
        escalationComplete: false,
        currentStep: 'escalation'
      });

      return updatedData;
    });
  };

  const getFilteredUsers = () => {
    // Mostrar todos los usuarios si no hay término de búsqueda
    if (!searchTerm.trim()) {
      return users; // Sin límite, mostrar todos los usuarios
    }

    // Filtrado local - sin límite de resultados
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Estado para usuarios filtrados
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // Efecto para actualizar usuarios filtrados cuando cambia el término de búsqueda
  useEffect(() => {
    if (showDropdown) {
      const filtered = getFilteredUsers();
      setFilteredUsers(filtered);
    }
  }, [searchTerm, showDropdown, users]);

  // Componente de celda con búsqueda mejorada
  const UserSearchCell = ({ section, role, index, value, disabled = false }) => {
    const cellId = `${section}-${role}-${index}`;
    const isActive = activeCell === cellId;

    const filteredUsers = users.filter(user => {
      if (!cellSearchTerm) return true;
      const searchLower = cellSearchTerm.toLowerCase();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return (
        fullName.toLowerCase().includes(searchLower) ||
        user.position?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower)
      );
    });

    const handleSelect = (user) => {
      // Marcar que el usuario hizo cambios manuales para evitar que el useEffect sobrescriba
      setHasManualAssignments(true);

      if (role === 'primary') {
        // Auto-llenar tipoResp con el departamento del usuario de countermeasure
        const shouldUpdateTipoResp = section === 'countermeasureSection' && user?.department;

        setEscalationData(prev => {
          const newState = {
            ...prev,
            [section]: {
              ...prev[section],
              primary: user
            }
          };
          if (shouldUpdateTipoResp) {
            newState.tipoResp = user.department;
          }
          return newState;
        });

        // Notificar al padre para que actualice workflowData.tipoResp
        if (shouldUpdateTipoResp && onDataUpdate) {
          onDataUpdate({ tipoResp: user.department });
        }
      } else {
        const newApprovers = [...escalationData[section].approvers];
        newApprovers[index] = user;
        setEscalationData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            approvers: newApprovers
          }
        }));
      }
      setActiveCell(null);
      setCellSearchTerm('');
    };

    const handleClear = () => {
      if (role === 'primary') {
        if (!disabled) {
          setEscalationData(prev => ({
            ...prev,
            [section]: {
              ...prev[section],
              primary: null
            }
          }));
        }
      } else {
        const newApprovers = [...escalationData[section].approvers];
        newApprovers[index] = null;
        setEscalationData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            approvers: newApprovers
          }
        }));
      }
    };

    return (
      <div className="user-search-cell" style={{ position: 'relative', width: '100%' }}>
        {/* Display del usuario seleccionado o botón para buscar */}
        {value ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            backgroundColor: disabled ? '#f1f5f9' : 'white',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !disabled && setActiveCell(cellId)}
          >
            <div style={{ flex: 1, fontSize: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                {value.firstName} {value.lastName}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {value.position} • {value.department}
              </div>
            </div>
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#B00020',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px'
                }}
                title={language === 'es' ? 'Eliminar' : 'Delete'}
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '8px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: disabled ? '#f1f5f9' : 'white',
              color: '#94a3b8',
              fontSize: '12px',
              textAlign: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
            onClick={() => !disabled && setActiveCell(cellId)}
          >
            {disabled ? ' Bloqueado' : '+ Seleccionar usuario'}
          </div>
        )}

        {/* Dropdown de búsqueda */}
        {isActive && !disabled && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: themeColors.bgCard,
            border: '2px solid #0072CE',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            marginTop: '4px',
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Campo de búsqueda */}
            <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="Buscar por nombre, puesto o correo..."
                value={cellSearchTerm}
                onChange={(e) => setCellSearchTerm(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginTop: '6px'
              }}>
                {filteredUsers.length} usuario(s) encontrado(s)
              </div>
            </div>

            {/* Lista de usuarios */}
            <div style={{
              overflowY: 'auto',
              maxHeight: '300px'
            }}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                       {user.position} • {user.department}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                       {user.email}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '12px'
                }}>
                  No se encontraron usuarios
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{
              padding: '8px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={() => {
                  setActiveCell(null);
                  setCellSearchTerm('');
                }}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {disabled && (
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
             Bloqueado (trazabilidad)
          </div>
        )}
      </div>
    );
  };

  // Save current team configuration as a preset (nueva estructura 1+3)
  const handleSaveAsPreset = async () => {
    // Convertir estructura 1+3 a array de IDs para guardar en backend
    const getSectionUserIds = (section) => {
      const ids = [];
      if (section.primary) ids.push(section.primary.id);
      section.approvers.forEach(approver => {
        if (approver) ids.push(approver.id);
      });
      return ids;
    };

    const issueUserIds = getSectionUserIds(escalationData.issueSection);
    const countermeasureUserIds = getSectionUserIds(escalationData.countermeasureSection);
    const confirmationUserIds = getSectionUserIds(escalationData.confirmationSection);

    if (issueUserIds.length === 0 && countermeasureUserIds.length === 0 && confirmationUserIds.length === 0) {
      alert(' No hay miembros asignados para guardar.');
      return;
    }

    // Check if user has reached the limit
    if (teamPresets.length >= 12) {
      alert(' Has alcanzado el límite de 12 atajos. Por favor elimina alguno antes de guardar uno nuevo.');
      return;
    }

    const presetName = prompt('Nombre para el atajo:', `Atajo ${new Date().toLocaleDateString()}`);
    if (!presetName || presetName.trim() === '') return;

    if (!currentUser || !currentUser.id) {
      alert(' Debes estar autenticado para guardar atajos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Create new preset
      const response = await fetch(`http://localhost:5000/users/${currentUser.id}/team-presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: presetName.trim(),
          issueUserIds,
          countermeasureUserIds,
          confirmationUserIds
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(` Atajo "${presetName}" guardado exitosamente.`);
        // Reload presets
        const presetsResponse = await fetch(`http://localhost:5000/users/${currentUser.id}/team-presets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const presetsData = await presetsResponse.json();
        if (presetsData.success) {
          setTeamPresets(presetsData.presets);
        }
      } else {
        alert(` Error: ${data.message}`);
      }
    } catch (error) {
      console.error(' Error saving preset:', error);
      alert(' Error al guardar el atajo.');
    }
  };

  const handleLoadPreset = (presetId) => {
    const preset = teamPresets.find(p => p.id === parseInt(presetId));
    if (!preset) return;

    // Marcar que hay asignaciones manuales
    setHasManualAssignments(true);

    // Get users for each section from preset (estructura 1+3)
    const issueUsers = users.filter(u => preset.issueUserIds?.includes(u.id)) || [];
    const countermeasureUsers = users.filter(u => preset.countermeasureUserIds?.includes(u.id)) || [];
    const confirmationUsers = users.filter(u => preset.confirmationUserIds?.includes(u.id)) || [];

    // Convert to nueva estructura: [0] = primary, [1-3] = approvers
    const convertToNewStructure = (userArray) => ({
      primary: userArray[0] || null,
      approvers: [
        userArray[1] || null,
        userArray[2] || null,
        userArray[3] || null
      ]
    });

    const issueData = convertToNewStructure(issueUsers);
    const countermeasureData = convertToNewStructure(countermeasureUsers);
    const confirmationData = convertToNewStructure(confirmationUsers);

    // Load all three sections
    setEscalationData(prev => ({
      ...prev,
      issueSection: {
        ...prev.issueSection,
        primary: issueData.primary,
        approvers: issueData.approvers
      },
      countermeasureSection: {
        ...prev.countermeasureSection,
        primary: countermeasureData.primary,
        approvers: countermeasureData.approvers
      },
      confirmationSection: {
        ...prev.confirmationSection,
        primary: confirmationData.primary,
        approvers: confirmationData.approvers
      }
    }));

    alert(` Atajo "${preset.name}" cargado:\n\n Issue: ${issueUsers.length} miembros\n Countermeasure: ${countermeasureUsers.length} miembros\n Confirmation: ${confirmationUsers.length} miembros\n\n Puedes editar los miembros libremente.`);
  };

  const handleDeletePreset = async (presetId, presetName) => {
    if (!window.confirm(`¿Estás seguro de eliminar el atajo "${presetName}"?`)) {
      return;
    }

    if (!currentUser || !currentUser.id) {
      alert(' Debes estar autenticado para eliminar atajos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/users/${currentUser.id}/team-presets/${presetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        alert(` Atajo "${presetName}" eliminado exitosamente.`);
        // Reload presets
        const presetsResponse = await fetch(`http://localhost:5000/users/${currentUser.id}/team-presets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const presetsData = await presetsResponse.json();
        if (presetsData.success) {
          setTeamPresets(presetsData.presets);
        }
      } else {
        alert(` Error: ${data.message}`);
      }
    } catch (error) {
      console.error(' Error deleting preset:', error);
      alert(' Error al eliminar el atajo.');
    }
  };

  // Funciones de aprobación secuencial
  const handleApprove = async (step) => {
    if (!data || !data.id) {
      alert(' No hay reporte para aprobar');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/approve-step-${step}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al siguiente aprobador o al equipo
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }

        alert(` ${result.message}`);

        // Recargar datos del reporte
        if (onDataUpdate) {
          const updatedReport = await eightDService.getEightdReportById(data.id);
          onDataUpdate(updatedReport);

          // Actualizar estados locales
          setD123ApprovalStatus(updatedReport.d1D2D3ApprovalStatus);
          setCurrentApprovalStep(updatedReport.currentApprovalStep);
          setApprovalHistory({
            approval1: {
              status: updatedReport.approval_1Status,
              by: updatedReport.approval_1By,
              at: updatedReport.approval_1At,
              comments: updatedReport.approval_1Comments
            },
            approval2: {
              status: updatedReport.approval_2Status,
              by: updatedReport.approval_2By,
              at: updatedReport.approval_2At,
              comments: updatedReport.approval_2Comments
            },
            approval3: {
              status: updatedReport.approval_3Status,
              by: updatedReport.approval_3By,
              at: updatedReport.approval_3At,
              comments: updatedReport.approval_3Comments
            }
          });
        }
      } else {
        alert(` Error: ${result.message}`);
      }
    } catch (error) {
      console.error(' Error al aprobar:', error);
      alert(' Error al aprobar. Por favor intenta de nuevo.');
    }
  };

  const handleReject = async (step) => {
    if (!rejectComments.trim()) {
      alert(' Los comentarios son obligatorios para rechazar');
      return;
    }

    if (!data || !data.id) {
      alert(' No hay reporte para rechazar');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/reject-step-${step}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comments: rejectComments.trim() })
      });

      const result = await response.json();

      if (result.success) {
        // Abrir mailto para notificar al responsable del rechazo
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        alert(` ${result.message}`);

        // Cerrar modal y limpiar comentarios
        setShowRejectModal(false);
        setRejectComments('');

        // Recargar datos del reporte
        if (onDataUpdate) {
          const updatedReport = await eightDService.getEightdReportById(data.id);
          onDataUpdate(updatedReport);

          // Actualizar estados locales
          setD123ApprovalStatus(updatedReport.d1D2D3ApprovalStatus);
          setCurrentApprovalStep(updatedReport.currentApprovalStep);
          setApprovalHistory({
            approval1: {
              status: updatedReport.approval_1Status,
              by: updatedReport.approval_1By,
              at: updatedReport.approval_1At,
              comments: updatedReport.approval_1Comments
            },
            approval2: {
              status: updatedReport.approval_2Status,
              by: updatedReport.approval_2By,
              at: updatedReport.approval_2At,
              comments: updatedReport.approval_2Comments
            },
            approval3: {
              status: updatedReport.approval_3Status,
              by: updatedReport.approval_3By,
              at: updatedReport.approval_3At,
              comments: updatedReport.approval_3Comments
            }
          });
        }
      } else {
        alert(` Error: ${result.message}`);
      }
    } catch (error) {
      console.error(' Error al rechazar:', error);
      alert(' Error al rechazar. Por favor intenta de nuevo.');
    }
  };

  // Handle revert to draft (Admin only) - Creates new revision
  const handleRevertToDraftD3 = async () => {
    if (!revertD3Comments || revertD3Comments.trim() === '') {
      alert('Debe ingresar un comentario explicando el motivo de la reversión');
      return;
    }

    if (!data || !data.id) {
      alert('No hay reporte para revertir');
      return;
    }

    // Confirm action
    if (!window.confirm('⚠️ ATENCIÓN: Esta acción archivará el documento actual y creará una NUEVA REVISIÓN editable.\n\nEl documento actual quedará bloqueado como referencia histórica.\n\n¿Desea continuar?')) {
      return;
    }

    setIsRevertingD3(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/revert-to-draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comments: revertD3Comments.trim() })
      });

      const result = await response.json();

      if (result.success) {
        const newRevisionId = result.data.newRevision.reportId;
        const newDbId = result.data.newRevision.id;
        showToast('success', `Documento archivado. Nueva revisión ${newRevisionId} creada.`);
        setShowRevertD3Modal(false);
        setRevertD3Comments('');

        // Redirect to new revision
        window.location.href = `/8d-workflow?reportId=${newDbId}`;
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error reverting to draft:', error);
      alert('Error al revertir a borrador');
    } finally {
      setIsRevertingD3(false);
    }
  };

  // Función para determinar si el usuario actual es el aprobador para el step actual
  const isCurrentApprover = () => {
    if (!currentApprovalStep || currentApprovalStep === 0 || currentApprovalStep > 3) {
        return false;
    }

    //  EXCEPCIÓN: Administradores SIEMPRE pueden aprobar
    const isAdmin = isUserAdmin(currentUser);
    if (isAdmin) {
      return true;
    }

    const issueApprovers = escalationData.issueSection?.approvers || [];

    // Los aprobadores son los miembros del equipo (approvers), NO el Primary
    // Step 1 → approvers[0] = Aprobador 1
    // Step 2 → approvers[1] = Aprobador 2
    // Step 3 → approvers[2] = Aprobador 3
    const currentApproverUser = issueApprovers[currentApprovalStep - 1];

    // Si no hay aprobador asignado para este paso, nadie puede aprobar (excepto admin)
    if (!currentApproverUser) {
      return false;
    }

    return currentApproverUser?.id === currentUser?.id;
  };

  const handleSave = async () => {
    // Enviar datos actualizados al componente padre

    // If report exists, update approval status to pending_approval_1 when appropriate
    if (data && data.id) {
      try {
        const currentStatus = d123ApprovalStatus || data.d1D2D3ApprovalStatus || 'draft';

        // Enviar a pending_approval_1 solo si está en draft o rechazado (para reenviar)
        // NO sobrescribir si ya está en proceso de aprobación o aprobado
        const shouldSendToApproval = currentStatus === 'draft' ||
                                      currentStatus === 'rejected_by_a1' ||
                                      currentStatus === 'rejected_by_a2' ||
                                      currentStatus === 'rejected_by_a3' ||
                                      currentStatus === 'rejected'; // legacy

        if (shouldSendToApproval) {
          const token = localStorage.getItem('token');

          // Calcular el primer paso de aprobación disponible basado en usuarios asignados
          // escalationData tiene: issueSection, countermeasureSection, confirmationSection
          // Cada sección tiene: primary, approvers[] (array de 3 aprobadores)
          const issueApprover1 = escalationData.issueSection?.approvers?.[0];
          const issueApprover2 = escalationData.issueSection?.approvers?.[1];
          const issueApprover3 = escalationData.issueSection?.approvers?.[2];

          let initialStatus = 'approved'; // Default: si no hay aprobadores, va directo a aprobado
          let initialStep = 4;

          if (issueApprover1) {
            initialStatus = 'pending_approval_1';
            initialStep = 1;
          } else if (issueApprover2) {
            initialStatus = 'pending_approval_2';
            initialStep = 2;
          } else if (issueApprover3) {
            initialStatus = 'pending_approval_3';
            initialStep = 3;
          }

          console.log(` Enviando a aprobación: ${initialStatus} (step ${initialStep})`);

          const response = await fetch(`http://localhost:5000/8d/reports/${data.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              d1_d2_d3_approval_status: initialStatus,
              current_approval_step: initialStep,
              ...(initialStep === 1 && { approval_1_status: 'pending' }),
              ...(initialStep === 2 && { approval_2_status: 'pending' }),
              ...(initialStep === 3 && { approval_3_status: 'pending' })
            })
          });

          const result = await response.json();
          if (result.success) {

            // Actualizar estado local para que los bloqueos se apliquen inmediatamente
            setD123ApprovalStatus(initialStatus);
            setCurrentApprovalStep(initialStep);

            // También notificar al componente padre para que actualice sus datos
            if (onDataUpdate) {
              onDataUpdate({
                ...data,
                d1D2D3ApprovalStatus: initialStatus,
                currentApprovalStep: initialStep
              });
            }

            if (initialStatus === 'approved') {
              alert(' D1-D2-D3 Aprobado automáticamente (no hay aprobadores asignados). Puede continuar con D4-D5-D6.');
            } else {
              // Obtener información del aprobador para mailto
              const approverUser = escalationData.issueSection?.approvers?.[initialStep - 1];
              if (approverUser && approverUser.email) {
                const subject = `[8D] ${data.reportId} - Aprobación D3 Requerida (Paso ${initialStep})`;
                const body = `Se requiere su aprobación para la etapa D3 (Acciones de Contención) del siguiente reporte 8D:\n\n` +
                  `Reporte: ${data.reportId}\n` +
                  `Título: ${data.title || 'Sin título'}\n` +
                  `Proveedor/Cliente: ${data.supplierName || 'N/A'}\n\n` +
                  `Por favor revise y apruebe en:\n` +
                  `http://localhost:3000/8d-workflow?reportId=${data.reportId}\n\n` +
                  `Saludos,\nSistema 8D`;

                const mailtoUrl = `mailto:${approverUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailtoUrl;
              }
              alert(` Reporte enviado a Aprobador ${initialStep}. Las secciones D1-D2-D3 están bloqueadas para edición.`);
            }
            return; //  IMPORTANTE: Detener aquí para evitar el alert duplicado
          } else {
            console.error(' Error updating approval status:', result.message);
            alert(' Error al enviar a aprobación: ' + result.message);
            return;
          }
        } else {
          // Si ya está en proceso de aprobación o aprobado, solo actualizar sin cambiar el estado
          console.log('ℹ Reporte ya está en proceso de aprobación o aprobado. No se modifica el estado.');
        }
      } catch (error) {
        console.error(' Error updating approval status:', error);
        alert(' Error al enviar a aprobación. Por favor intenta de nuevo.');
        return;
      }
    }

    //  SOLO ejecutar esto si NO es un reporte existente (nuevo reporte)
    // Si el reporte ya existe, el bloque anterior ya manejó el envío a aprobación
    onDataUpdate({
      ...escalationData,
      escalationComplete: true,
      currentStep: 'create8d',
      d1D2D3ApprovalStatus: 'pending_approval',
      // Include client, project and parts information
      selectedClient,
      selectedProject,
      selectedParts,
      // Include D3 data and files
      photoNoGood,
      photoOK,
      attachedDocuments,
      d3Data,
      // Responsible department
      department_id: departmentId
    });
  };

  const handleSaveDraft = () => {
    // Guardar como borrador sin marcar como completo
    onDataUpdate({
      ...escalationData,
      escalationComplete: false, // NO marcar como completo
      currentStep: 'escalation', // Mantener en paso actual
      saveDraft: true, // Flag para indicar que se debe guardar como borrador
      // Include client, project and parts information
      selectedClient,
      selectedProject,
      selectedParts,
      // Include D3 data and files
      photoNoGood,
      photoOK,
      attachedDocuments,
      d3Data,
      // Responsible department
      department_id: departmentId
    });
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: themeColors.bgCard
    },
    disciplineHeader: {
      backgroundColor: '#0F3B5F',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      marginTop: '10px',
      fontSize: '20px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    section: {
      marginBottom: '30px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#fafafa'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '15px',
      borderBottom: '2px solid #0072CE',
      paddingBottom: '8px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px'
    },
    field: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '12px',
      fontWeight: 'bold',
      marginBottom: '5px',
      color: '#333'
    },
    input: {
      padding: '8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '14px'
    },
    select: {
      padding: '8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: themeColors.bgCard
    },
    escalationGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr auto 1fr',
      gap: '15px',
      alignItems: 'center',
      marginTop: '20px'
    },
    arrow: {
      fontSize: '24px',
      color: '#666',
      textAlign: 'center'
    },
    saveButton: {
      backgroundColor: '#22c55e',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '16px 32px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      width: '100%',
      marginTop: '30px',
      marginBottom: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#16a34a'
      }
    },
    buttonContainer: {
      padding: '20px',
      borderTop: '2px solid #e2e8f0',
      backgroundColor: themeColors.bg,
      marginTop: '30px'
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

      <div style={{
        pointerEvents: isReadOnly ? 'none' : 'auto',
        opacity: isReadOnly ? 0.7 : 1
      }}>
      {/* ================== D1 - INFORMACIÓN BÁSICA + EQUIPO ================== */}
      {(!activeSection || activeSection === 'd1') && (
      <>
      {/* Problem Basics Section */}
      <div id="info-basica" style={{ ...styles.section, scrollMarginTop: '20px' }}>
        <h3 style={styles.sectionTitle}>Información Básica del Problema</h3>
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>{t('reportId')} *</label>
            <input
              style={styles.input}
              value={escalationData.reportId}
              onChange={(e) => handleBasicInfoChange('reportId', e.target.value)}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('problemTitle')} *</label>
            <input
              style={styles.input}
              value={escalationData.title}
              onChange={(e) => handleBasicInfoChange('title', e.target.value)}
              placeholder="Brief problem description"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('severity')} *</label>
            <select
              style={styles.select}
              value={escalationData.severidad}
              onChange={(e) => handleBasicInfoChange('severidad', e.target.value)}
            >
              <option value="High">High / Alta</option>
              <option value="Medium">Medium / Media</option>
              <option value="Low">Low / Baja</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('issueDate')} *</label>
            <input
              type="date"
              style={styles.input}
              value={escalationData.fechaEmission}
              onChange={(e) => handleBasicInfoChange('fechaEmission', e.target.value)}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Departamento Responsable</label>
            <select
              style={styles.select}
              value={departmentId || ''}
              onChange={(e) => setDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">— Seleccionar departamento —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ================== D1 - ESTABLISH THE TEAM ================== */}
      {/* D1 Header */}
      <div id="d1-equipo" style={{ ...styles.disciplineHeader, scrollMarginTop: '20px' }}>
        <span></span>
        <span>{t('d1Title')}</span>
      </div>

      {/* D1 Content: Escalation Path - Team Assignment */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('escalationPath')}</h3>

        {/* Team Presets Section - Always visible */}
        <div style={{
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: '8px',
            padding: '15px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '10px',
              color: '#166534'
            }}>
               Cargar Atajo Guardado
            </div>

            {teamPresets.length > 0 ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  {teamPresets.map(preset => {
                    // Check if current user can delete this preset
                    const isAdmin = isUserAdmin(currentUser);
                    const isOwner = preset.userId === currentUser?.id;
                    const canDelete = isAdmin || isOwner;

                    return (
                      <div
                        key={preset.id}
                        style={{
                          border: `1px solid ${themeColors.border}`,
                          borderRadius: '6px',
                          padding: '8px',
                          backgroundColor: themeColors.bgCard,
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0fdf4';
                          e.currentTarget.style.borderColor = '#22c55e';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = themeColors.bgCard;
                          e.currentTarget.style.borderColor = themeColors.border;
                        }}
                      >
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: themeColors.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          title: preset.name
                        }}>
                          {preset.name}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: themeColors.textDim
                        }}>
                          {new Date(preset.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => !fieldsLocked && handleLoadPreset(preset.id)}
                            disabled={fieldsLocked}
                            style={{
                              flex: 1,
                              padding: '4px',
                              backgroundColor: fieldsLocked ? '#d1d5db' : '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              cursor: fieldsLocked ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s',
                              opacity: fieldsLocked ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#16a34a')}
                            onMouseLeave={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#22c55e')}
                            title={fieldsLocked ? "No disponible - Campos bloqueados" : "Cargar atajo"}
                          >
                            
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDeletePreset(preset.id, preset.name)}
                              style={{
                                flex: 1,
                                padding: '4px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#B00020'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                              title="Eliminar atajo"
                            >
                              
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: themeColors.textMuted,
                  textAlign: 'center'
                }}>
                  {teamPresets.length} de 12 atajos guardados
                </div>
              </>
            ) : (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#92400e',
                textAlign: 'center'
              }}>
                 No tienes atajos guardados aún. Asigna tu equipo y guárdalo abajo usando el botón " Guardar Atajo"
              </div>
            )}
          </div>
        </div>

        {/* Info message */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          fontSize: '12px',
          color: '#92400e'
        }}>
          <strong> Nota:</strong> Los atajos cargan las 3 secciones (Issue, Countermeasure, Confirmation) con tus configuraciones guardadas. Los miembros son siempre editables.
        </div>

        {/* Tabla de Asignación de Equipo - Estilo Excel */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: themeColors.bgCard,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '20px'
        }}>
          <thead>
            <tr style={{ backgroundColor: themeColors.bg }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#475569'
              }}>Etapa</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#475569'
              }}> Responsable Principal *</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#475569'
              }}> Aprobador 1</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#475569'
              }}> Aprobador 2</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#475569'
              }}> Aprobador 3</th>
            </tr>
          </thead>
          <tbody>
            {/* ISSUE - Fila Roja */}
            <tr style={{ backgroundColor: '#fef2f2' }}>
              <td style={{
                padding: '12px',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 'bold',
                color: '#B00020',
                fontSize: '12px'
              }}>
                 ISSUE<br/>
                <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b' }}>
                  (Emisor del problema)
                </span>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="issueSection"
                  role="primary"
                  index={0}
                  value={escalationData.issueSection.primary}
                  disabled={true}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="issueSection"
                  role="approver"
                  index={0}
                  value={escalationData.issueSection.approvers[0]}
                  disabled={isApproverFieldLocked(0)}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="issueSection"
                  role="approver"
                  index={1}
                  value={escalationData.issueSection.approvers[1]}
                  disabled={isApproverFieldLocked(1)}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="issueSection"
                  role="approver"
                  index={2}
                  value={escalationData.issueSection.approvers[2]}
                  disabled={isApproverFieldLocked(2)}
                />
              </td>
            </tr>

            {/* COUNTERMEASURE - Fila Amarilla */}
            <tr style={{ backgroundColor: '#fefce8' }}>
              <td style={{
                padding: '12px',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 'bold',
                color: '#ca8a04',
                fontSize: '12px'
              }}>
                 COUNTERMEASURE<br/>
                <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b' }}>
                  (Responsable de contramedidas)
                </span>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="countermeasureSection"
                  role="primary"
                  index={0}
                  value={escalationData.countermeasureSection.primary}
                  disabled={fieldsLocked}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="countermeasureSection"
                  role="approver"
                  index={0}
                  value={escalationData.countermeasureSection.approvers[0]}
                  disabled={fieldsLocked}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="countermeasureSection"
                  role="approver"
                  index={1}
                  value={escalationData.countermeasureSection.approvers[1]}
                  disabled={fieldsLocked}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="countermeasureSection"
                  role="approver"
                  index={2}
                  value={escalationData.countermeasureSection.approvers[2]}
                  disabled={fieldsLocked}
                />
              </td>
            </tr>

            {/* CONFIRMATION - Fila Verde */}
            <tr style={{ backgroundColor: '#f0fdf4' }}>
              <td style={{
                padding: '12px',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 'bold',
                color: '#16a34a',
                fontSize: '12px'
              }}>
                 CONFIRMATION<br/>
                <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b' }}>
                  (Auditor de confirmación)
                </span>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="confirmationSection"
                  role="primary"
                  index={0}
                  value={escalationData.confirmationSection.primary}
                  disabled={fieldsLocked}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="confirmationSection"
                  role="approver"
                  index={0}
                  value={escalationData.confirmationSection.approvers[0]}
                  disabled={fieldsLocked}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="confirmationSection"
                  role="approver"
                  index={1}
                  value={escalationData.confirmationSection.approvers[1]}
                  disabled={fieldsLocked}
                />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <UserSearchCell
                  section="confirmationSection"
                  role="approver"
                  index={2}
                  value={escalationData.confirmationSection.approvers[2]}
                  disabled={fieldsLocked}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Save Preset Buttons - Below Cards */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '8px',
          padding: '15px',
          marginTop: '20px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#0c4a6e' }}>
             Guardar Como Atajo
          </div>
          <button
            onClick={handleSaveAsPreset}
            disabled={teamPresets.length >= 12 || fieldsLocked}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: (teamPresets.length >= 12 || fieldsLocked) ? '#9ca3af' : '#0072CE',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (teamPresets.length >= 12 || fieldsLocked) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              marginBottom: '10px',
              opacity: fieldsLocked ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (teamPresets.length < 12 && !fieldsLocked) {
                e.target.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (teamPresets.length < 12 && !fieldsLocked) {
                e.target.style.backgroundColor = '#0072CE';
              }
            }}
          >
            {fieldsLocked ? ' Campos Bloqueados' : (teamPresets.length >= 12 ? ' Límite alcanzado (12/12)' : ' Guardar Nuevo Atajo')}
          </button>
          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
            Guarda los miembros asignados en las 3 secciones (Issue, Countermeasure y Confirmation)
          </div>
        </div>
      </div>

      {/* Save Draft Button for D1 */}
      <div style={{ textAlign: 'right', marginBottom: '10px', marginTop: '-10px' }}>
        <button
          onClick={handleSaveDraft}
          disabled={fieldsLocked}
          style={{
            padding: '6px 12px',
            backgroundColor: fieldsLocked ? '#9ca3af' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: fieldsLocked ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            opacity: fieldsLocked ? 0.5 : 1
          }}
          onMouseEnter={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#4b5563')}
          onMouseLeave={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#6b7280')}
          title={fieldsLocked ? 'No disponible - Campos bloqueados' : ''}
        >
           {t('saveDraft')}
        </button>
      </div>
      </>
      )}

      {/* ================== D2 - DESCRIBE THE PROBLEM ================== */}
      {(!activeSection || activeSection === 'd2') && (
      <>
      {/* D2 Header */}
      <div id="d2-problema" style={{ ...styles.disciplineHeader, scrollMarginTop: '20px' }}>
        <span></span>
        <span>{t('d2Title')}</span>
      </div>

      {/* D2 Content Part 1: Client, Project and Parts */}
      <div id="d2-partes" style={{ ...styles.section, scrollMarginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>Cliente, Proyecto y Números de Parte</h3>

          {fieldsLocked && (
            <button
              onClick={() => {
                if (isEditingParts) {
                  handleSavePartsChanges();
                } else {
                  setIsEditingParts(true);
                }
              }}
              disabled={isSavingPartialChanges}
              style={{
                padding: '8px 16px',
                backgroundColor: isEditingParts ? '#2E7D32' : '#0072CE',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSavingPartialChanges ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSavingPartialChanges ? (
                <> Guardando...</>
              ) : isEditingParts ? (
                <> Guardar Cambios en Partes</>
              ) : (
                <> Editar Partes Afectadas</>
              )}
            </button>
          )}
        </div>

        {/* Client and Project Selection */}
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>Cliente / Proveedor *</label>
            <select
              style={styles.input}
              value={selectedClient?.id || ''}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={fieldsLocked && !isEditingParts}
            >
              <option value="">Selecciona un cliente...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.alias})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Proyecto *</label>
            <select
              style={styles.input}
              value={selectedProject?.id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={!selectedClient || (fieldsLocked && !isEditingParts)}
            >
              <option value="">Selecciona un proyecto...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber} - {project.projectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parts Multi-Select */}
        {selectedProject && availableParts.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <label style={styles.label}>Números de Parte Afectados (Selección Múltiple) *</label>
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: '#fafafa'
            }}>
              {/* Grid de 6 columnas compactas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '8px'
              }}>
                {availableParts.map(part => (
                  <label
                    key={part.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '8px',
                      backgroundColor: selectedParts.some(p => p.id === part.id) ? '#e3f2fd' : 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: selectedParts.some(p => p.id === part.id) ? '2px solid #2196f3' : '1px solid #e0e0e0',
                      transition: 'all 0.2s',
                      minHeight: '90px',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedParts.some(p => p.id === part.id)}
                        onChange={() => handlePartToggle(part)}
                        style={{ marginRight: '4px', transform: 'scale(0.9)' }}
                        disabled={fieldsLocked && !isEditingParts}
                      />
                      <div style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {part.partNumber}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#333', marginBottom: '3px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {part.partName}
                    </div>
                    <div style={{ fontSize: '9px', color: '#666', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {part.clientPartNumber}
                    </div>
                    <div style={{ fontSize: '11px', color: '#d32f2f', fontWeight: '600', marginTop: 'auto' }}>
                      ${part.unitCost}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Selected Parts Summary */}
            {selectedParts.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fff3e0',
                borderRadius: '6px',
                border: '1px solid #ffb74d'
              }}>
                <strong>Partes Seleccionadas ({selectedParts.length}):</strong>
                <div style={{ marginTop: '8px' }}>
                  {selectedParts.map(part => (
                    <span
                      key={part.id}
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        margin: '4px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {part.partNumber}
                    </span>
                  ))}
                </div>

                {/* Total Estimated Cost */}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '6px',
                  border: '2px solid #4caf50'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '15px', color: '#2e7d32' }}>
                      Costo Estimado Total:
                    </strong>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b5e20' }}>
                      ${(selectedParts?.reduce((total, part) => {
                        const totalCostImpact = parseFloat(part.totalCostImpact) || 0;
                        return total + totalCostImpact;
                      }, 0) || 0).toFixed(2)} USD
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#558b2f', marginTop: '6px' }}>
                    Basado en {selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) || 0} {selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) === 1 ? 'pieza' : 'piezas'} afectada{selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Tabla de Inventario de Partes Afectadas */}
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#1976d2',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span></span>
                    Inventario de Partes Afectadas
                  </h3>
                  <PartsInventoryTable
                    parts={selectedParts}
                    onPartsUpdate={setSelectedParts}
                    customColumns={customColumns}
                    onCustomColumnsUpdate={setCustomColumns}
                  />
                </div>
              </div>
            )}

            {/* Botón duplicado al final de la sección */}
            {fieldsLocked && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => {
                    if (isEditingParts) {
                      handleSavePartsChanges();
                    } else {
                      setIsEditingParts(true);
                    }
                  }}
                  disabled={isSavingPartialChanges}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isEditingParts ? '#2E7D32' : '#0072CE',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSavingPartialChanges ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSavingPartialChanges ? (
                    <> Guardando...</>
                  ) : isEditingParts ? (
                    <> Guardar Cambios en Partes</>
                  ) : (
                    <> Editar Partes Afectadas</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* D2 Content Part 3: Problem Description */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('problemDescription')}</h3>
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>{t('problemDescription')} *</label>
            <textarea
              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              value={escalationData.description}
              onChange={(e) => handleBasicInfoChange('description', e.target.value)}
              disabled={fieldsLocked}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('problemType')} *</label>
            <select
              style={styles.select}
              value={escalationData.problemType}
              onChange={(e) => handleBasicInfoChange('problemType', e.target.value)}
              disabled={fieldsLocked}
            >
              <option value="Nuevo">Nuevo</option>
              <option value="Repetitivo">Repetitivo</option>
            </select>
          </div>
        </div>

        {/* Sección de Fotos: No Good y OK */}
        <div id="d2-fotos" style={{ marginTop: '20px', scrollMarginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
             Evidencia Visual
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Foto No Good */}
            <div style={{
              border: '2px dashed #ef4444',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#fef2f2'
            }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#B00020',
                marginBottom: '8px'
              }}>
                 Foto No Good (Problema)
              </label>

              {!photoNoGood ? (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  cursor: fieldsLocked ? 'not-allowed' : 'pointer',
                  border: '2px dashed #fca5a5',
                  borderRadius: '6px',
                  backgroundColor: fieldsLocked ? '#f1f5f9' : '#fff',
                  transition: 'all 0.2s',
                  opacity: fieldsLocked ? 0.6 : 1
                }}>
                  <span style={{ fontSize: '32px', marginBottom: '8px' }}>{fieldsLocked ? '' : ''}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>{fieldsLocked ? 'Bloqueado' : 'Click para seleccionar imagen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoNoGoodChange}
                    style={{ display: 'none' }}
                    disabled={fieldsLocked}
                  />
                </label>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img
                    src={photoNoGood instanceof File ? URL.createObjectURL(photoNoGood) : photoNoGood.url}
                    alt="No Good"
                    onClick={() => setImageModal({
                      isOpen: true,
                      imageUrl: photoNoGood instanceof File ? URL.createObjectURL(photoNoGood) : photoNoGood.url,
                      imageName: photoNoGood.name || 'Foto No Good'
                    })}
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                  {!fieldsLocked && (
                    <button
                      onClick={removePhotoNoGood}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#B00020',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  )}
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '6px', textAlign: 'center' }}>
                    {photoNoGood.name} {fieldsLocked && ' Click para ver'}
                  </p>
                </div>
              )}
            </div>

            {/* Foto OK */}
            <div style={{
              border: '2px dashed #22c55e',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f0fdf4'
            }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#16a34a',
                marginBottom: '8px'
              }}>
                 Foto OK (Referencia)
              </label>

              {!photoOK ? (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  cursor: fieldsLocked ? 'not-allowed' : 'pointer',
                  border: '2px dashed #86efac',
                  borderRadius: '6px',
                  backgroundColor: fieldsLocked ? '#f1f5f9' : '#fff',
                  transition: 'all 0.2s',
                  opacity: fieldsLocked ? 0.6 : 1
                }}>
                  <span style={{ fontSize: '32px', marginBottom: '8px' }}>{fieldsLocked ? '' : ''}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>{fieldsLocked ? 'Bloqueado' : 'Click para seleccionar imagen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoOKChange}
                    style={{ display: 'none' }}
                    disabled={fieldsLocked}
                  />
                </label>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img
                    src={photoOK instanceof File ? URL.createObjectURL(photoOK) : photoOK.url}
                    alt="OK"
                    onClick={() => setImageModal({
                      isOpen: true,
                      imageUrl: photoOK instanceof File ? URL.createObjectURL(photoOK) : photoOK.url,
                      imageName: photoOK.name || 'Foto OK'
                    })}
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                  {!fieldsLocked && (
                    <button
                      onClick={removePhotoOK}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  )}
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '6px', textAlign: 'center' }}>
                    {photoOK.name} {fieldsLocked && ' Click para ver'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección de Documentos Adjuntos */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
             Documentos Adjuntos
          </h4>
          <div style={{
            border: '2px dashed #0072CE',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#eff6ff'
          }}>
            <label style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: fieldsLocked ? '#9ca3af' : '#0072CE',
              color: 'white',
              borderRadius: '6px',
              cursor: fieldsLocked ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              opacity: fieldsLocked ? 0.6 : 1
            }}
            onMouseEnter={(e) => { if (!fieldsLocked) e.target.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { if (!fieldsLocked) e.target.style.backgroundColor = '#0072CE'; }}
            >
              {fieldsLocked ? ' Bloqueado' : ' Adjuntar Archivos'}
              <input
                type="file"
                multiple
                onChange={handleDocumentsChange}
                style={{ display: 'none' }}
                disabled={fieldsLocked}
              />
            </label>

            {/* Lista de documentos adjuntos */}
            {attachedDocuments.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#0F3B5F', marginBottom: '8px' }}>
                  Archivos adjuntos ({attachedDocuments.length}):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attachedDocuments.map((doc, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: themeColors.bgCard,
                        borderRadius: '6px',
                        border: '1px solid #dbeafe'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '16px' }}></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#0F3B5F',
                                textDecoration: 'none',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                              {doc.name} 
                            </a>
                          ) : (
                            <p style={{ fontSize: '12px', fontWeight: '500', color: '#0F3B5F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.name}
                            </p>
                          )}
                          <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      {!fieldsLocked && (
                        <button
                          onClick={() => removeDocument(index)}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Draft Button for D2 */}
      <div style={{ textAlign: 'right', marginBottom: '10px', marginTop: '-10px' }}>
        <button
          onClick={handleSaveDraft}
          disabled={fieldsLocked}
          style={{
            padding: '6px 12px',
            backgroundColor: fieldsLocked ? '#9ca3af' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: fieldsLocked ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            opacity: fieldsLocked ? 0.5 : 1
          }}
          onMouseEnter={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#4b5563')}
          onMouseLeave={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#6b7280')}
          title={fieldsLocked ? 'No disponible - Campos bloqueados' : ''}
        >
           {t('saveDraft')}
        </button>
      </div>
      </>
      )}

      {/* ================== D3 - CONTAINMENT ACTIONS ================== */}
      {(!activeSection || activeSection === 'd3') && (
      <>
      {/* D3 Header */}
      <div id="d3-contencion" style={{ ...styles.disciplineHeader, scrollMarginTop: '20px' }}>
        <span></span>
        <span>{t('d3Title')}</span>
      </div>

      {/* D3 Content */}
      <div style={styles.section}>
        {/* Edit D3 Button */}
        {fieldsLocked && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => {
                if (isEditingD3) {
                  handleSaveD3Changes();
                } else {
                  setIsEditingD3(true);
                }
              }}
              disabled={isSavingPartialChanges}
              style={{
                padding: '8px 16px',
                backgroundColor: isEditingD3 ? '#2E7D32' : '#0072CE',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSavingPartialChanges ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSavingPartialChanges ? (
                <> Guardando...</>
              ) : isEditingD3 ? (
                <> Guardar Cambios en D3</>
              ) : (
                <> Editar D3 (Contención)</>
              )}
            </button>
          </div>
        )}

        {/* ¿Dónde deberían haberse detectado las partes no conformes? */}
        <div id="d3-deteccion" style={{ marginBottom: '24px', scrollMarginTop: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1976d2', marginBottom: '16px' }}>
            ¿Dónde deberían haberse detectado las partes no conformes?
          </h4>
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fff'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid #ddd',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    width: '60%'
                  }}>
                    Punto de Detección
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid #ddd',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    width: '20%'
                  }}>
                    Sí
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid #ddd',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    width: '20%'
                  }}>
                    No
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                    Durante el proceso/manufactura
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={d3Data.detectionPoints.duringProcess.yes}
                      onChange={() => handleDetectionPointChange('duringProcess', 'yes')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={fieldsLocked && !isEditingD3}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={d3Data.detectionPoints.duringProcess.no}
                      onChange={() => handleDetectionPointChange('duringProcess', 'no')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={fieldsLocked && !isEditingD3}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                    Después de manufactura (ej. Inspección Final)
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={d3Data.detectionPoints.afterManufacture.yes}
                      onChange={() => handleDetectionPointChange('afterManufacture', 'yes')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={fieldsLocked && !isEditingD3}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={d3Data.detectionPoints.afterManufacture.no}
                      onChange={() => handleDetectionPointChange('afterManufacture', 'no')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={fieldsLocked && !isEditingD3}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    Antes del despacho
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={d3Data.detectionPoints.priorDespatch.yes}
                      onChange={() => handleDetectionPointChange('priorDespatch', 'yes')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={fieldsLocked && !isEditingD3}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={d3Data.detectionPoints.priorDespatch.no}
                      onChange={() => handleDetectionPointChange('priorDespatch', 'no')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={fieldsLocked && !isEditingD3}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Razón de no-detección: 5 Por qués */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1976d2', marginBottom: '16px' }}>
            Razón de no-detección (5 Por qués):
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map((num, index) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{
                  minWidth: '80px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#555'
                }}>
                  {num}. ¿Por qué?
                </label>
                <input
                  type="text"
                  value={d3Data.nonDetectionReasons[index]}
                  onChange={(e) => handleWhyChange(index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  placeholder={`Ingrese la razón ${num}...`}
                  disabled={fieldsLocked && !isEditingD3}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Como se va a disponer del material sospechoso */}
        <div style={styles.field}>
          <label style={styles.label}>¿Cómo se va a disponer del material sospechoso? *</label>
          <textarea
            style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            value={d3Data.suspectMaterialDisposal}
            onChange={(e) => handleD3TextChange('suspectMaterialDisposal', e.target.value)}
            placeholder="Describa el plan de disposición del material no conforme..."
            disabled={fieldsLocked && !isEditingD3}
          />
        </div>

        {/* Como se va a estar garantizando el material conforme */}
        <div style={styles.field}>
          <label style={styles.label}>¿Cómo se va a estar garantizando que el material esté conforme? *</label>
          <textarea
            style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            value={d3Data.conformanceMaterialGuarantee}
            onChange={(e) => handleD3TextChange('conformanceMaterialGuarantee', e.target.value)}
            placeholder="Describa las acciones para garantizar conformidad del material..."
            disabled={fieldsLocked && !isEditingD3}
          />
        </div>

        {/* Implica retrabajo */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '12px'
          }}>
            ¿Implica retrabajo? *
          </label>
          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: (fieldsLocked && !isEditingD3) ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}>
              <input
                type="radio"
                name="requiresRework"
                checked={d3Data.requiresRework === true}
                onChange={() => handleReworkChange(true)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                disabled={fieldsLocked && !isEditingD3}
              />
              <span style={{ fontWeight: d3Data.requiresRework === true ? 'bold' : 'normal' }}>SÍ</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: (fieldsLocked && !isEditingD3) ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}>
              <input
                type="radio"
                name="requiresRework"
                checked={d3Data.requiresRework === false}
                onChange={() => handleReworkChange(false)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                disabled={fieldsLocked && !isEditingD3}
              />
              <span style={{ fontWeight: d3Data.requiresRework === false ? 'bold' : 'normal' }}>NO</span>
            </label>
          </div>
        </div>

        {/* Costos de retrabajo (solo si implica retrabajo) */}
        {d3Data.requiresRework === true && (
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            border: '2px solid #ffc107'
          }}>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#856404', marginBottom: '16px' }}>
               Costos de Retrabajo
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.field}>
                <label style={{ ...styles.label, color: '#856404' }}>
                  Costo Unitario de Retrabajo (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={d3Data.reworkUnitCost}
                  onChange={(e) => handleReworkCostChange(e.target.value)}
                  style={styles.input}
                  placeholder="0.00"
                  disabled={fieldsLocked && !isEditingD3}
                />
              </div>

              <div style={styles.field}>
                <label style={{ ...styles.label, color: '#856404' }}>
                  Costo Total de Retrabajo (USD)
                </label>
                <div style={{
                  ...styles.input,
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: '#856404'
                }}>
                  ${((d3Data.reworkUnitCost || 0) * (selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) || 0)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Costo Real de Afectación */}
        <div id="d3-costos" style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: d3Data.requiresRework === true ? '#d1ecf1' : '#f8d7da',
          borderRadius: '8px',
          border: d3Data.requiresRework === true ? '2px solid #17a2b8' : '2px solid #dc3545',
          scrollMarginTop: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: d3Data.requiresRework === true ? '#0c5460' : '#721c24',
                marginBottom: '4px'
              }}>
                 Costo Real de Afectación
              </h4>
              <p style={{
                fontSize: '12px',
                color: d3Data.requiresRework === true ? '#0c5460' : '#721c24',
                margin: 0
              }}>
                {d3Data.requiresRework === true
                  ? 'Basado en costo de retrabajo'
                  : d3Data.requiresRework === false
                    ? 'Basado en costo total de partes (sin retrabajo)'
                    : 'Seleccione si implica retrabajo'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: d3Data.requiresRework === true ? '#0c5460' : '#721c24',
                margin: 0
              }}>
                ${(() => {
                  if (d3Data.requiresRework === true) {
                    // Costo de retrabajo
                    const totalAffectedQty = selectedParts?.reduce((total, part) =>
                      total + (parseInt(part.totalAffectedQty) || 0), 0) || 0;
                    return ((d3Data.reworkUnitCost || 0) * totalAffectedQty).toFixed(2);
                  } else if (d3Data.requiresRework === false) {
                    // Costo total de partes
                    return (selectedParts?.reduce((total, part) =>
                      total + (parseFloat(part.totalCostImpact) || 0), 0) || 0).toFixed(2);
                  } else {
                    return '0.00';
                  }
                })()}
              </p>
              <p style={{
                fontSize: '12px',
                color: d3Data.requiresRework === true ? '#0c5460' : '#721c24',
                margin: 0
              }}>
                USD
              </p>
            </div>
          </div>
        </div>

        {/* Botón duplicado al final de D3 */}
        {fieldsLocked && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={() => {
                if (isEditingD3) {
                  handleSaveD3Changes();
                } else {
                  setIsEditingD3(true);
                }
              }}
              disabled={isSavingPartialChanges}
              style={{
                padding: '8px 16px',
                backgroundColor: isEditingD3 ? '#2E7D32' : '#0072CE',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSavingPartialChanges ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSavingPartialChanges ? (
                <> Guardando...</>
              ) : isEditingD3 ? (
                <> Guardar Cambios en D3</>
              ) : (
                <> Editar D3 (Contención)</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ================== SISTEMA DE APROBACIÓN SECUENCIAL ================== */}
      {data && data.id && currentApprovalStep > 0 && (
        <div style={{
          marginTop: '30px',
          border: '2px solid #0072CE',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#eff6ff'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#0F3B5F'
          }}>
             Estado de Aprobación D1-D2-D3
          </h3>

          {/* Current Step Indicator */}
          {(() => {
            const issueUsers = data?.escalationPath?.issue_users || data?.escalation_path?.issue_users || [];
            const configuredApprovers = [1, 2, 3].filter(step => issueUsers[step] !== undefined && issueUsers[step] !== null);

            if (configuredApprovers.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '12px', color: themeColors.textMuted, fontSize: '13px' }}>
                  No hay aprobadores configurados para D1-D2-D3
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
                  const isPast = step < currentApprovalStep;
                  const isCurrent = step === currentApprovalStep;
                  const approvalData = approvalHistory[`approval${step}`];
                  const approverId = issueUsers[step];
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
                        border: isCurrent ? '3px solid #0072CE' : '1px solid #d1d5db',
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

          {/* Approval History */}
          {Object.entries(approvalHistory).some(([_, v]) => v?.status) && (
            <div style={{
              backgroundColor: themeColors.bgCard,
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '15px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Historial de Aprobaciones:</div>
              {[1, 2, 3].map(step => {
                const approval = approvalHistory[`approval${step}`];
                const issueUsers = data?.escalationPath?.issue_users || data?.escalation_path?.issue_users || [];
                const approverId = issueUsers[step];
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
                        backgroundColor: '#fef3c7',
                        borderLeft: '3px solid #C77700',
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

          {/* Approval History - Full Audit Trail */}
          {d3ApprovalHistory.length > 0 && (
            <div style={{
              backgroundColor: themeColors.bgCard,
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '15px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Historial de Aprobaciones D3 ({d3ApprovalHistory.length} registros):
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {d3ApprovalHistory.map((entry, index) => {
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
                          <span style={{ marginLeft: '8px', color: '#4b5563' }}>
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

          {/* Approve/Reject Buttons - Only visible to current approver */}
          {isCurrentApprover() && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => handleApprove(currentApprovalStep)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
              >
                 Aprobar
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#B00020'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
              >
                 Rechazar
              </button>
            </div>
          )}

          {/* Mensaje si el usuario NO es el aprobador actual */}
          {currentApprovalStep > 0 && currentApprovalStep <= 3 && !isCurrentApprover() && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e',
              textAlign: 'center'
            }}>
              ℹ Este reporte está esperando la aprobación del Aprobador {currentApprovalStep}
            </div>
          )}

          {/* Mensaje si ya está completamente aprobado */}
          {currentApprovalStep === 4 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#dcfce7',
              border: '2px solid #22c55e',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#166534',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
               D1-D2-D3 COMPLETAMENTE APROBADO. Puede continuar con D4-D5-D6.

              {/* Admin Revert Button */}
              {isUserAdmin(currentUser) && (
                <button
                  onClick={() => setShowRevertD3Modal(true)}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                   Revertir a Borrador (Admin)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
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
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '15px',
              color: '#B00020'
            }}>
               Rechazar Aprobación
            </h3>
            <p style={{
              fontSize: '13px',
              marginBottom: '15px',
              color: themeColors.textMuted
            }}>
              Los comentarios son obligatorios para rechazar. Por favor explique el motivo del rechazo:
            </p>
            <textarea
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Escriba aquí los motivos del rechazo..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '10px',
                border: `1px solid ${themeColors.border}`,
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                marginBottom: '15px'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComments('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(currentApprovalStep)}
                disabled={!rejectComments.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: rejectComments.trim() ? '#ef4444' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: rejectComments.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  if (rejectComments.trim()) e.target.style.backgroundColor = '#B00020';
                }}
                onMouseLeave={(e) => {
                  if (rejectComments.trim()) e.target.style.backgroundColor = '#ef4444';
                }}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert to Draft Modal (Admin Only) */}
      {showRevertD3Modal && (
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
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '15px',
              color: '#dc2626'
            }}>
               Revertir D1-D2-D3 a Borrador
            </h3>
            <p style={{
              fontSize: '13px',
              marginBottom: '15px',
              color: themeColors.textMuted
            }}>
              Esta acción revertirá la sección D1-D2-D3 a estado de borrador, permitiendo editar nuevamente.
              Se eliminará el estado de aprobación actual. Los comentarios son obligatorios.
            </p>
            <textarea
              value={revertD3Comments}
              onChange={(e) => setRevertD3Comments(e.target.value)}
              placeholder="Ingrese el motivo de la reversión..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '10px',
                border: `1px solid ${themeColors.border}`,
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                marginBottom: '15px'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowRevertD3Modal(false);
                  setRevertD3Comments('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Cancelar
              </button>
              <button
                onClick={handleRevertToDraftD3}
                disabled={isRevertingD3 || !revertD3Comments.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isRevertingD3 || !revertD3Comments.trim() ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isRevertingD3 || !revertD3Comments.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                {isRevertingD3 ? 'Revirtiendo...' : 'Confirmar Reversión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Buttons - Draft and Complete */}
      <div style={{ ...styles.buttonContainer, display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleSaveDraft}
          disabled={fieldsLocked}
          style={{
            padding: '8px 16px',
            backgroundColor: fieldsLocked ? '#9ca3af' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: fieldsLocked ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            opacity: fieldsLocked ? 0.5 : 1
          }}
          onMouseEnter={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#4b5563')}
          onMouseLeave={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#6b7280')}
          title={fieldsLocked ? 'No disponible - Campos bloqueados' : ''}
        >
           {t('saveDraft')}
        </button>
        <button
          onClick={handleSave}
          disabled={fieldsLocked}
          style={{
            ...styles.saveButton,
            backgroundColor: fieldsLocked ? '#9ca3af' : '#22c55e',
            cursor: fieldsLocked ? 'not-allowed' : 'pointer',
            opacity: fieldsLocked ? 0.5 : 1
          }}
          onMouseEnter={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#16a34a')}
          onMouseLeave={(e) => !fieldsLocked && (e.target.style.backgroundColor = '#22c55e')}
          title={fieldsLocked ? 'No disponible - Campos bloqueados' : ''}
        >
          {t('completeAssignment')}
        </button>
      </div>
      </>
      )}

      {/* Modal para ver imagen completa */}
      {imageModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setImageModal({ isOpen: false, imageUrl: null, imageName: '' })}
        >
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <img
              src={imageModal.imageUrl}
              alt={imageModal.imageName}
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <p style={{
              color: 'white',
              textAlign: 'center',
              marginTop: '12px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {imageModal.imageName}
            </p>
            <button
              onClick={() => setImageModal({ isOpen: false, imageUrl: null, imageName: '' })}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                backgroundColor: '#B00020',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          <p style={{ color: '#ccc', marginTop: '20px', fontSize: '13px' }}>
            Click fuera de la imagen o presiona × para cerrar
          </p>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: toast.type === 'success' ? '#2E7D32' : '#ef4444',
            color: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 10001,
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            maxWidth: '500px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <span>{toast.message}</span>
          {toast.type === 'error' && (
            <button
              onClick={() => setToast(null)}
              style={{
                marginLeft: 'auto',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* ================== ESCALATION PATH COMPLETO - D1-D2-D3 ================== */}
      {data && data.id && (
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
            marginBottom: '20px'
          }}>
            Escalation Path Completo
          </h3>

          {/* Issue Section (D1-D2-D3) */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0F3B5F', marginBottom: '12px' }}>
              Issue (D1-D2-D3)
            </h4>
            {(() => {
              const issueUsers = data?.escalationPath?.issue_users || data?.escalation_path?.issue_users || [];
              if (issueUsers.length === 0) {
                return <div style={{ color: themeColors.textMuted, fontSize: '13px' }}>No hay usuarios asignados</div>;
              }

              const getUserInfo = (userIdOrObj) => {
                if (!userIdOrObj) return null;
                // Handle both number ID and object {id, name}
                const userId = typeof userIdOrObj === 'object' ? userIdOrObj.id : userIdOrObj;
                const user = users.find(u => u.id === userId);
                const name = user
                  ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                  : (typeof userIdOrObj === 'object' && userIdOrObj.name) ? userIdOrObj.name : `ID: ${userId}`;
                const email = user?.email || '';
                const position = user?.position || user?.cargo || '';
                return { name, email, position };
              };

              const roles = [
                { index: 0, label: 'Emisor', color: '#7c3aed', bgColor: '#f5f3ff', borderColor: '#c4b5fd' },
                { index: 1, label: 'Aprobador 1', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' },
                { index: 2, label: 'Aprobador 2', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' },
                { index: 3, label: 'Aprobador 3', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' }
              ];

              return (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {roles.map(({ index, label, color, bgColor, borderColor }) => {
                    const userId = issueUsers[index];
                    if (!userId) return null;
                    const info = getUserInfo(userId);
                    if (!info) return null;
                    return (
                      <div key={index} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px 14px', minWidth: '180px', flex: '1 1 180px' }}>
                        <div style={{ fontSize: '10px', color: themeColors.textMuted, marginBottom: '2px', fontWeight: '600' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color }}>{info.name}</div>
                        {info.email && <div style={{ fontSize: '11px', color: '#0072CE' }}>{info.email}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Countermeasure Section (D4-D5-D6) */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>
              Countermeasure (D4-D5-D6)
            </h4>
            {(() => {
              const countermeasureUsers = data?.escalationPath?.countermeasure_users || data?.escalation_path?.countermeasure_users || [];
              if (countermeasureUsers.length === 0) {
                return <div style={{ color: themeColors.textMuted, fontSize: '13px' }}>No hay usuarios asignados</div>;
              }

              const getUserInfo = (userIdOrObj) => {
                if (!userIdOrObj) return null;
                // Handle both number ID and object {id, name}
                const userId = typeof userIdOrObj === 'object' ? userIdOrObj.id : userIdOrObj;
                const user = users.find(u => u.id === userId);
                const name = user
                  ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                  : (typeof userIdOrObj === 'object' && userIdOrObj.name) ? userIdOrObj.name : `ID: ${userId}`;
                const email = user?.email || '';
                return { name, email };
              };

              const roles = [
                { index: 0, label: 'Responsable', color: '#7c3aed', bgColor: '#fef3c7', borderColor: '#fcd34d' },
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
                      <div key={index} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px 14px', minWidth: '180px', flex: '1 1 180px' }}>
                        <div style={{ fontSize: '10px', color: themeColors.textMuted, marginBottom: '2px', fontWeight: '600' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color }}>{info.name}</div>
                        {info.email && <div style={{ fontSize: '11px', color: '#0072CE' }}>{info.email}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Confirmation Section (D7-D8) */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#047857', marginBottom: '12px' }}>
              Confirmation (D7-D8)
            </h4>
            {(() => {
              const confirmationUsers = data?.escalationPath?.confirmation_users || data?.escalation_path?.confirmation_users || [];
              if (confirmationUsers.length === 0) {
                return <div style={{ color: themeColors.textMuted, fontSize: '13px' }}>No hay usuarios asignados</div>;
              }

              const getUserInfo = (userIdOrObj) => {
                if (!userIdOrObj) return null;
                // Handle both number ID and object {id, name}
                const userId = typeof userIdOrObj === 'object' ? userIdOrObj.id : userIdOrObj;
                const user = users.find(u => u.id === userId);
                const name = user
                  ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                  : (typeof userIdOrObj === 'object' && userIdOrObj.name) ? userIdOrObj.name : `ID: ${userId}`;
                const email = user?.email || '';
                return { name, email };
              };

              const roles = [
                { index: 0, label: 'Responsable', color: '#7c3aed', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
                { index: 1, label: 'Aprobador 1', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' },
                { index: 2, label: 'Aprobador 2', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' },
                { index: 3, label: 'Aprobador 3', color: '#166534', bgColor: '#f0fdf4', borderColor: '#86efac' }
              ];

              return (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {roles.map(({ index, label, color, bgColor, borderColor }) => {
                    const userId = confirmationUsers[index];
                    if (!userId) return null;
                    const info = getUserInfo(userId);
                    if (!info) return null;
                    return (
                      <div key={index} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px 14px', minWidth: '180px', flex: '1 1 180px' }}>
                        <div style={{ fontSize: '10px', color: themeColors.textMuted, marginBottom: '2px', fontWeight: '600' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color }}>{info.name}</div>
                        {info.email && <div style={{ fontSize: '11px', color: '#0072CE' }}>{info.email}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>{/* End of read-only wrapper */}
    </div>
  );
};

export default TeamAssignmentTab;