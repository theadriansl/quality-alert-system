import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { pdf } from '@react-pdf/renderer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import EightDPDF from '../components/8D/EightDPDF';
import eightDService from '../services/eightDService';
import { useToast } from '../context/ToastContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { isUserAdmin, canUserEdit, isReadOnly } from '../utils/permissions';

// Importar componentes de cada pestaña
import TeamAssignmentTab from '../components/8D/TeamAssignmentTab';
import D3MFG from '../components/8D/D3MFG';
import D4ContainmentRootCause from '../components/8D/D4ContainmentRootCause';
import D5CorrectiveActions from '../components/8D/D5CorrectiveActions';
import D5D6D7Countermeasures from '../components/8D/D5D6D7Countermeasures';
import D8FollowUpEvidence from '../components/8D/D8FollowUpEvidence';
import HistoryTab from '../components/8D/HistoryTab';

// Importar componentes de aprobaciones
import StatusBadge from '../components/8D/StatusBadge';
import ApprovalStepper from '../components/8D/ApprovalStepper';


const EightDWorkflow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showWarning } = useToast();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [languageLocal, setLanguageLocal] = useState('es');

  // Permission check
  const canEdit = canUserEdit('8d');
  const readOnly = isReadOnly('8d');

  // Initialize currentTab from URL param or localStorage
  const [currentTab, setCurrentTab] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    // If tab param exists in URL, use it
    if (tabParam !== null) {
      return parseInt(tabParam, 10);
    }
    // Otherwise check localStorage
    const reportId = searchParams.get('reportId');
    if (reportId) {
      const savedTab = localStorage.getItem(`8d_current_tab_${reportId}`);
      return savedTab ? parseInt(savedTab, 10) : 0;
    }
    return 0;
  });

  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tabCompletionStatus, setTabCompletionStatus] = useState({
    d1d2d3: false,
    d4: false,
    d5: false,
    d6: false,
    d7: false,
    d8: false
  });
  const [users, setUsers] = useState([]);

  // Ref for content container to manage scroll
  const contentRef = useRef(null);

  // Store scroll positions for each tab
  const scrollPositions = useRef({});

  // Save current tab to localStorage whenever it changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const reportId = searchParams.get('reportId');
    if (reportId) {
      localStorage.setItem(`8d_current_tab_${reportId}`, currentTab.toString());
    }
  }, [currentTab, location.search]);

  // Restore scroll position when tab changes
  useEffect(() => {
    const savedPosition = scrollPositions.current[currentTab] || 0;
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    });
  }, [currentTab]);

  // Cargar datos del reporte 8D
  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener parámetros de la URL
        const searchParams = new URLSearchParams(location.search);
        const reportId = searchParams.get('reportId');

        let reportData = null;

        if (reportId) {
          // Cargar reporte existente por ID
          reportData = await eightDService.getEightdReportById(reportId);

          if (!reportData) {
            setError(`Reporte ${reportId} no encontrado`);
            return;
          }
        } else {
          // Buscar datos en localStorage (nuevo reporte en proceso)
          reportData = eightDService.getBasicData();
        }

        if (reportData) {
          setWorkflowData(reportData);

          // Establecer el estado de completado de las pestañas basado en los datos del reporte
          if (reportData.escalationComplete || reportData.d1D2D3ApprovalStatus === 'approved') {
            setTabCompletionStatus(prev => ({ ...prev, d1d2d3: true }));
          }
          if (reportData.d4Completed) {
            setTabCompletionStatus(prev => ({ ...prev, d4: true }));
          }
          if (reportData.d5Completed) {
            setTabCompletionStatus(prev => ({ ...prev, d5: true }));
          }
          if (reportData.d6Completed) {
            setTabCompletionStatus(prev => ({ ...prev, d6: true }));
          }
          if (reportData.d7Completed || reportData.d7Status === 'under_review') {
            setTabCompletionStatus(prev => ({ ...prev, d7: true }));
          }
          if (reportData.d8Completed) {
            setTabCompletionStatus(prev => ({ ...prev, d8: true }));
          }
        } else {
          // No hay datos - nuevo workflow
          // Inicializar con objeto vacío para que el sidebar se muestre
          setWorkflowData({});
          setCurrentTab(0);
        }
      } catch (err) {
        console.error('Error loading report data:', err);
        setError('Error al cargar los datos del reporte');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [location.search]);

  // Cargar usuario actual
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
  }, []);

  // Cargar lista de usuarios
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

  // IMPORTANTE: D4-D8 solo se habilitan cuando D1-D2-D3 están APROBADAS
  const isD123Approved = workflowData?.d1D2D3ApprovalStatus === 'approved';

  // Get current user in process for D1-D2-D3 approval status display
  // Compatible con formato antiguo (solo IDs) y nuevo (objetos {id, name})
  const d123CurrentUserInProcess = useMemo(() => {
    if (!workflowData || !workflowData.escalationPath || !workflowData.escalationPath.issue_users) {
      return null;
    }

    const approvalStatus = workflowData.d1D2D3ApprovalStatus || 'draft';
    const issueUsers = workflowData.escalationPath.issue_users;

    // Parse status to determine current step
    // draft -> created_by is working
    // pending_approval_1 -> approver 1 is working
    // pending_approval_2 -> approver 2 is working
    // pending_approval_3 -> approver 3 is working
    // approved -> completed
    // rejected_by_aX -> rejected by approver X

    let userData = null;

    if (approvalStatus === 'draft') {
      // Creator (Calidad) is working
      userData = issueUsers[0];
    } else if (approvalStatus === 'pending_approval_1') {
      userData = issueUsers[1];
    } else if (approvalStatus === 'pending_approval_2') {
      userData = issueUsers[2];
    } else if (approvalStatus === 'pending_approval_3') {
      userData = issueUsers[3];
    } else if (approvalStatus === 'approved') {
      return 'Completado';
    } else if (approvalStatus.startsWith('rejected_by_')) {
      return 'Rechazado';
    }

    if (!userData) return null;

    // Si ya es objeto con nombre congelado, usarlo directamente
    if (typeof userData === 'object' && userData.name) {
      return userData.name;
    }

    // Formato antiguo: buscar usuario por ID
    const userId = typeof userData === 'object' ? userData.id : userData;
    const user = users.find(u => u.id === userId);
    return user ? (user.name || user.email || `Usuario ID: ${userId}`) : `Usuario ID: ${userId}`;
  }, [users, workflowData]);

  // Helper function to get D1-D2-D3 approval status display info
  const getD123ApprovalStatusInfo = () => {
    if (!workflowData) return { status: 'Borrador', step: 'Calidad' };

    const approvalStatus = workflowData.d1D2D3ApprovalStatus || 'draft';

    const statusMap = {
      'draft': { status: 'Borrador', step: 'Calidad' },
      'pending_approval_1': { status: 'En Aprobación', step: 'Aprobador 1' },
      'pending_approval_2': { status: 'En Aprobación', step: 'Aprobador 2' },
      'pending_approval_3': { status: 'En Aprobación', step: 'Aprobador 3' },
      'approved': { status: 'Aprobado', step: 'Completado' },
      'rejected_by_a1': { status: 'Rechazado', step: 'Rechazado por Aprobador 1' },
      'rejected_by_a2': { status: 'Rechazado', step: 'Rechazado por Aprobador 2' },
      'rejected_by_a3': { status: 'Rechazado', step: 'Rechazado por Aprobador 3' }
    };

    return statusMap[approvalStatus] || { status: 'Borrador', step: 'Calidad' };
  };

  // ============================================================================
  // BLOCKING LOGIC FOR D4-D5-D6 (Controls edit permissions within components)
  // ============================================================================

  /**
   * Check if user is an administrator
   */
  const isAdmin = isUserAdmin(currentUser);

  /**
   * Check if current user is responsible for Countermeasure section
   * Countermeasure users are stored in escalationPath.countermeasure_users array (snake_case dentro de JSONB)
   * Compatible con formato antiguo (solo IDs) y nuevo (objetos {id, name})
   */
  const isCountermeasureResponsible = () => {
    if (!currentUser?.id || !workflowData?.escalationPath) {
      return false;
    }

    const countermeasureUsers = workflowData.escalationPath.countermeasure_users || [];
    return countermeasureUsers.some(user =>
      typeof user === 'object' ? user.id === currentUser.id : user === currentUser.id
    );
  };

  /**
   * D4 Stage 1 (Immediate Containment Actions) Blocking Logic
   * D4 Stage 1 is BLOCKED if:
   * - D1-D2-D3 are NOT approved, OR
   * - Current user is NOT responsible for Countermeasure section (AND NOT admin), OR
   * - D3-MFG is under review/approval (status = 'under_review')
   */
  const isD3MFGBlocked =
    !isD123Approved ||
    (!isCountermeasureResponsible() && !isAdmin) ||
    (workflowData?.d3MfgStatus === 'under_review');

  /**
   * D4 Blocking Logic (Root Cause Analysis)
   * D4 is BLOCKED if:
   * - D1-D2-D3 are NOT approved, OR
   * - Current user is NOT responsible for Countermeasure section (AND NOT admin)
   *
   * NOTE: D4 NO depende de D3-MFG porque puede no haber acciones inmediatas
   */
  const isD4Blocked =
    !isD123Approved ||
    (!isCountermeasureResponsible() && !isAdmin);

  /**
   * D5 Blocking Logic
   * D5 is BLOCKED if:
   * - D1-D2-D3 is NOT approved, OR
   * - Current user is NOT responsible for Countermeasure section, OR
   * - Current user is NOT an administrator
   * Note: D4 completion is NOT required to work on D5 (user can work as draft)
   */
  const isD5Blocked = !isD123Approved || (!isCountermeasureResponsible() && !isAdmin);

  /**
   * D6 Blocking Logic
   * D6 is BLOCKED if:
   * - D5 is NOT completed, OR
   * - Current user is NOT responsible for Countermeasure section, OR
   * - Current user is NOT an administrator
   */
  const isD6Blocked = !workflowData?.d5Completed || (!isCountermeasureResponsible() && !isAdmin);

  // Helper function to get blocked reason for tabs tooltip (MEJORA 6)
  const getBlockedReason = (tabId) => {
    const reasons = {
      es: {
        d4: !isD123Approved ? 'Completa y aprueba D1-D2-D3 primero' : 'No tienes permisos para esta sección',
        d5: !isD123Approved ? 'Completa y aprueba D1-D2-D3 primero' : 'No tienes permisos para esta sección',
        d6: !workflowData?.d5Completed ? 'Completa D5 para habilitar D6' : 'No tienes permisos para esta sección',
        d7: !workflowData?.d6Completed ? 'Completa D6 para habilitar D7' : 'No tienes permisos para esta sección',
        d8: !workflowData?.d7Completed && workflowData?.d7Status !== 'under_review'
          ? 'Completa D7 para habilitar D8'
          : 'No tienes permisos para esta sección'
      },
      en: {
        d4: !isD123Approved ? 'Complete and approve D1-D2-D3 first' : 'You don\'t have permissions for this section',
        d5: !isD123Approved ? 'Complete and approve D1-D2-D3 first' : 'You don\'t have permissions for this section',
        d6: !workflowData?.d5Completed ? 'Complete D5 to enable D6' : 'You don\'t have permissions for this section',
        d7: !workflowData?.d6Completed ? 'Complete D6 to enable D7' : 'You don\'t have permissions for this section',
        d8: !workflowData?.d7Completed && workflowData?.d7Status !== 'under_review'
          ? 'Complete D7 to enable D8'
          : 'You don\'t have permissions for this section'
      }
    };
    return reasons[language]?.[tabId] || reasons.es[tabId] || 'Tab bloqueado';
  };

  // Nueva estructura de tabs - cada D por separado
  const tabs = [
    {
      id: 'd1',
      label: 'D1',
      subtitle: 'Establecer Equipo',
      icon: null,
      section: 'd1',
      component: TeamAssignmentTab,
      enabled: true
    },
    {
      id: 'd2',
      label: 'D2',
      subtitle: 'Describir Problema',
      icon: null,
      section: 'd2',
      component: TeamAssignmentTab,
      enabled: true // TODO: habilitar cuando D1 esté completo
    },
    {
      id: 'd3',
      label: 'D3',
      subtitle: 'Acciones de Contención',
      icon: null,
      section: 'd3',
      component: TeamAssignmentTab,
      enabled: true // TODO: habilitar cuando D2 esté completo
    },
    {
      id: 'd3mfg',
      label: 'D3-MFG',
      subtitle: 'Acciones de Manufactura',
      icon: null,
      component: D3MFG,
      enabled: true // TODO: habilitar cuando D3 esté completo
    },
    {
      id: 'd4',
      label: 'D4',
      subtitle: 'Causa Raíz',
      icon: null,
      component: D4ContainmentRootCause,
      enabled: isD123Approved
    },
    {
      id: 'd5',
      label: 'D5',
      subtitle: 'Acciones Correctivas',
      icon: null,
      component: D5CorrectiveActions,
      enabled: isD123Approved
    },
    {
      id: 'd6',
      label: 'D6',
      subtitle: 'Implementar Acciones',
      icon: null,
      section: 'd6',
      component: D5D6D7Countermeasures,
      enabled: isD123Approved && workflowData?.d5Completed
    },
    {
      id: 'd7',
      label: 'D7',
      subtitle: 'Prevenir Recurrencia',
      icon: null,
      section: 'd7',
      component: D5D6D7Countermeasures,
      enabled: isD123Approved && workflowData?.d6Completed
    },
    {
      id: 'd8',
      label: 'D8',
      subtitle: 'Cierre',
      icon: null,
      component: D8FollowUpEvidence,
      enabled: workflowData?.d7Completed || workflowData?.d7Status === 'under_review'
    },
    {
      id: 'history',
      label: 'Historial',
      subtitle: 'Auditoría',
      icon: null,
      component: HistoryTab,
      enabled: true
    }
  ];

  const translations = {
    en: {
      title: '8D Problem Solving Workflow',
      progress: 'Progress',
      step: 'Step',
      of: 'of',
      save: 'Save Progress',
      next: 'Next Step',
      previous: 'Previous Step',
      complete: 'Complete 8D',
      backToDashboard: 'Back to Dashboard',
      loading: 'Loading report...',
      error: 'Error loading report'
    },
    es: {
      title: 'Flujo de Trabajo 8D',
      progress: 'Progreso',
      step: 'Paso',
      of: 'de',
      save: 'Guardar Progreso',
      next: 'Siguiente Paso',
      previous: 'Paso Anterior',
      complete: 'Completar 8D',
      backToDashboard: 'Volver al Dashboard',
      loading: 'Cargando reporte...',
      error: 'Error al cargar reporte'
    }
  };

  const tr = (key) => translations[language][key] || key;

  const handleTabChange = useCallback((tabIndex) => {
    // Allow free navigation when 8D is closed (read-only mode)
    const isClosed = workflowData?.status === 'closed';
    if (isClosed || tabs[tabIndex].enabled) {
      // Save current scroll position before changing tab
      scrollPositions.current[currentTab] = window.scrollY;
      setCurrentTab(tabIndex);
    }
  }, [currentTab, tabs, workflowData?.status]);

  const handleDataUpdate = async (tabId, data) => {
    console.log('📥 handleDataUpdate called - tabId:', tabId, 'data:', data);
    const updatedData = { ...workflowData, ...data };
    setWorkflowData(updatedData);

    // Actualizar en localStorage
    eightDService.updateData(updatedData);

    // Marcar pestaña como completada si corresponde
    // D1, D2, D3 ahora son tabs separados - guardar borrador en cualquiera de ellos
    const isD123Tab = ['d1', 'd2', 'd3'].includes(tabId);
    const shouldSaveToBackend = isD123Tab && (data.escalationComplete || data.saveDraft);
    const shouldSaveD3Mfg = tabId === 'd3mfg';
    const shouldSaveD5D6D7 = ['d6', 'd7'].includes(tabId);

    if (isD123Tab && data.escalationComplete) {
      setTabCompletionStatus(prev => ({ ...prev, d1d2d3: true }));
    }

    // Guardar D5/D6/D7 en el backend
    if (shouldSaveD5D6D7 && updatedData.id) {
      try {
        // Map D6-D7 data to backend format
        const d6d7BackendData = eightDService.mapD456ToBackend(data);

        // Update report with D6-D7 data
        await eightDService.updateEightdReport(updatedData.id, d6d7BackendData);

      } catch (error) {
        console.error('Error guardando D6-D7:', error);
        throw error;
      }
    }

    // Guardar D8 en el backend
    const shouldSaveD8 = tabId === 'd8';
    console.log('🔍 D8 Save Check - tabId:', tabId, 'shouldSaveD8:', shouldSaveD8, 'updatedData.id:', updatedData.id);
    if (shouldSaveD8 && updatedData.id) {
      try {
        // Clean isEditing field from followup actions before saving (UI-only field)
        const cleanedFollowupActions = (data.d8FollowupActions || []).map(action => {
          const { isEditing, ...rest } = action;
          return rest;
        });

        // Map D8 data to backend format (camelCase to snake_case)
        // Convert empty strings to null for timestamp fields
        const d8BackendData = {
          d8_followup_actions: cleanedFollowupActions,
          d8_evidence_documentation: data.d8EvidenceDocumentation,
          d8_closure_notes: data.d8ClosureNotes || null,
          d8_lessons_learned: data.d8LessonsLearned || null,
          d8_closed_by: data.d8ClosedBy || null,
          d8_closed_at: data.d8ClosedAt || null,
          d8_completed: data.d8Completed || false,
          d8_completed_at: data.d8CompletedAt || null
        };

        console.log('Saving D8 data:', d8BackendData);

        // Update report with D8 data
        await eightDService.updateEightdReport(updatedData.id, d8BackendData);

      } catch (error) {
        console.error('Error guardando D8:', error);
        throw error;
      }
    }

    // Guardar D3-MFG en el backend cuando se llame handleSave desde D3MFG
    if (shouldSaveD3Mfg && updatedData.id) {
      try {


        // Map D3-MFG data from camelCase to snake_case
        const d3MfgBackendData = eightDService.mapD3MfgToBackend(data);



        // Update report with D3-MFG data
        await eightDService.updateEightdReport(updatedData.id, d3MfgBackendData);


      } catch (error) {
        console.error('Error guardando D3-MFG:', error);
        throw error;
      }
    }

    // Guardar en el backend cuando se complete O se guarde como borrador
    if (shouldSaveToBackend) {
      try {
        const isDraft = data.saveDraft && !data.escalationComplete;

        // Preparar datos para el backend
        const reportData = eightDService.mapEscalationToReport(updatedData);

        // Establecer status según si es draft o completo
        reportData.status = isDraft ? 'draft' : 'in_progress';

        // Agregar información de escalación con múltiples usuarios
        // Estructura: primary (1 responsable) + approvers (hasta 3 aprobadores)
        // CONGELAMIENTO DE USUARIOS: Guardar {id, name} para preservar datos históricos
        const getSectionUserData = (section) => {
          const userData = [];
          if (section?.primary?.id) {
            const name = section.primary.name ||
              `${section.primary.firstName || ''} ${section.primary.lastName || ''}`.trim() ||
              `Usuario ${section.primary.id}`;
            userData.push({ id: section.primary.id, name });
          }
          if (section?.approvers) {
            section.approvers.forEach(approver => {
              if (approver?.id) {
                const name = approver.name ||
                  `${approver.firstName || ''} ${approver.lastName || ''}`.trim() ||
                  `Usuario ${approver.id}`;
                userData.push({ id: approver.id, name });
              }
            });
          }
          return userData;
        };

        //  IMPORTANTE: Para Issue Section, el primer usuario SIEMPRE debe ser el creador del reporte
        // CONGELAMIENTO: Guardar {id, name} para preservar datos históricos
        const issueUserData = [];
        const creatorId = workflowData?.createdBy || currentUser?.id;
        if (creatorId) {
          // Buscar nombre del creador
          const creatorUser = users.find(u => u.id === creatorId);
          const creatorName = creatorUser
            ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim() || creatorUser.name || `Usuario ${creatorId}`
            : `Usuario ${creatorId}`;
          issueUserData.push({ id: creatorId, name: creatorName });
        }
        // Agregar los aprobadores (NO el primary, que podría ser incorrecto)
        if (updatedData.issueSection?.approvers) {
          updatedData.issueSection.approvers.forEach(approver => {
            if (approver?.id) {
              const name = approver.name ||
                `${approver.firstName || ''} ${approver.lastName || ''}`.trim() ||
                `Usuario ${approver.id}`;
              issueUserData.push({ id: approver.id, name });
            }
          });
        }

        // Obtener usuarios de countermeasure y confirmation con nombres congelados
        const countermeasureUserData = getSectionUserData(updatedData.countermeasureSection);
        const confirmationUserData = getSectionUserData(updatedData.confirmationSection);

        //  PRESERVAR usuarios existentes si los nuevos están vacíos
        // Esto evita borrar usuarios cuando el componente no los tiene cargados
        const existingEscalationPath = workflowData?.escalation_path || workflowData?.escalationPath || {};

        reportData.escalation_path = {
          issue_users: issueUserData.length > 0 ? issueUserData : (existingEscalationPath.issue_users || []),
          countermeasure_users: countermeasureUserData.length > 0 ? countermeasureUserData : (existingEscalationPath.countermeasure_users || []),
          confirmation_users: confirmationUserData.length > 0 ? confirmationUserData : (existingEscalationPath.confirmation_users || [])
        };

        // Agregar información de cliente, proyecto y partes seleccionadas
        if (updatedData.selectedClient) {
          reportData.client_id = updatedData.selectedClient.id;
          reportData.client_name = updatedData.selectedClient.name;
        }

        if (updatedData.selectedProject) {
          reportData.project_id = updatedData.selectedProject.id;
          reportData.project_number = updatedData.selectedProject.projectNumber;
          reportData.project_name = updatedData.selectedProject.projectName;
        }

        if (updatedData.selectedParts && updatedData.selectedParts.length > 0) {
          reportData.selected_parts = updatedData.selectedParts;
        }

        // Agregar diagrama de flujo del proceso si existe
        if (updatedData.processFlow && updatedData.processFlow.length > 0) {
          reportData.process_flow = updatedData.processFlow;
        }

        let savedReport;
        let reportId;
        const isExistingReport = updatedData.id && !isNaN(updatedData.id);

        if (isExistingReport) {
          // ACTUALIZAR reporte existente (no crear uno nuevo)

          reportId = updatedData.id;
          await eightDService.updateEightdReport(reportId, reportData);
          savedReport = { id: reportId };

          // También actualizar partes si hay partes seleccionadas (updateEightdReport no las guarda)
          if (updatedData.selectedParts && updatedData.selectedParts.length > 0) {
            await eightDService.updatePartsOnly(
              reportId,
              updatedData.selectedClient,
              updatedData.selectedProject,
              updatedData.selectedParts
            );
          }

        } else {
          // CREAR nuevo reporte

          savedReport = await eightDService.createEightdReport(reportData);
          reportId = savedReport?.id;
        }

        if (savedReport) {


          // Actualizar URL para incluir el ID del reporte guardado (solo para nuevos reportes)
          if (!isExistingReport && savedReport.id) {
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('reportId', savedReport.id);
            searchParams.set('mode', 'edit');
            window.history.replaceState(null, '', `${window.location.pathname}?${searchParams.toString()}`);
          }

          // Upload files ONLY if they are new File objects (not already uploaded)
          // Check if photoNoGood is a File object (not a URL string from existing attachment)
          if (updatedData.photoNoGood && updatedData.photoNoGood instanceof File) {
            try {

              await eightDService.uploadAttachment(
                reportId,
                updatedData.photoNoGood,
                'photo_no_good',
                'Photo showing the problem'
              );

            } catch (error) {
              console.error('Error uploading No Good photo:', error);
            }
          }

          // Upload photoOK if it's a new File
          if (updatedData.photoOK && updatedData.photoOK instanceof File) {
            try {

              await eightDService.uploadAttachment(
                reportId,
                updatedData.photoOK,
                'photo_ok',
                'Photo showing reference/OK condition'
              );

            } catch (error) {
              console.error('Error uploading OK photo:', error);
            }
          }

          // Upload attached documents if they are new Files
          if (updatedData.attachedDocuments && updatedData.attachedDocuments.length > 0) {
            const newDocs = updatedData.attachedDocuments.filter(doc => doc instanceof File);
            if (newDocs.length > 0) {

              for (const doc of newDocs) {
                try {
                  await eightDService.uploadAttachment(
                    reportId,
                    doc,
                    'document',
                    `Supporting document: ${doc.name}`
                  );

                } catch (error) {
                  console.error(`Error uploading document ${doc.name}:`, error);
                }
              }
            }
          }

          // Update report with D3 data if exists
          if (updatedData.d3Data) {
            try {

              await eightDService.updateEightdReport(reportId, {
                d3Data: updatedData.d3Data
              });

            } catch (error) {
              console.error('Error saving D3 data:', error);
            }
          }

          // Recargar los datos del reporte desde el backend para tener toda la información
          const fullReport = await eightDService.getEightdReportById(reportId);
          if (fullReport) {

            setWorkflowData(fullReport);
            // Limpiar localStorage solo después de tener los datos completos del backend
            eightDService.clearData();
          }

          // Mostrar confirmación exitosa con resumen
          const uploadSummary = [];
          if (updatedData.photoNoGood instanceof File) uploadSummary.push('Foto No Good');
          if (updatedData.photoOK instanceof File) uploadSummary.push('Foto OK');
          const newDocsCount = updatedData.attachedDocuments?.filter(d => d instanceof File).length || 0;
          if (newDocsCount > 0) {
            uploadSummary.push(`${newDocsCount} documento(s)`);
          }
          if (updatedData.d3Data) uploadSummary.push('Datos D3');

          const uploadText = uploadSummary.length > 0
            ? `\n\nArchivos nuevos subidos: ${uploadSummary.join(', ')}`
            : '';

          const actionText = isExistingReport ? 'actualizado' : 'guardado';

          if (isDraft) {
            showSuccess(`Borrador guardado `);
          } else {
            showSuccess(`D1-D2-D3 ${actionText} `);
          }
        }
      } catch (error) {
        console.error('Error guardando en el backend:', error);
        showError('Error al guardar: ' + error.message);
      }
    }

    // Handle D3-MFG save
    if (tabId === 'd3mfg') {
      if (!updatedData.id) {
        console.error('D3-MFG Save Failed: No report ID found. Please save D1-D2-D3 first to create the report.');
        showWarning('Por favor guarda D1-D2-D3 primero');
        return;
      }

      try {
        await eightDService.updateEightdReport(updatedData.id, {
          d3_mfg_temporary_controls: data.d3MfgTemporaryControls,
          d3_mfg_inspection_points: data.d3MfgInspectionPoints,
          d3_mfg_parameters_adjusted: data.d3MfgParametersAdjusted,
          d3_mfg_poka_yoke_devices: data.d3MfgPokaYokeDevices,
          d3_mfg_line_modifications: data.d3MfgLineModifications,
          d3_mfg_operator_training: data.d3MfgOperatorTraining,
          d3_mfg_effectiveness_validation: data.d3MfgEffectivenessValidation,
          d3_mfg_responsible_user_ids: data.d3MfgResponsibleUserIds || [], // Save as JSONB array
          // Send null if empty/whitespace string to avoid PostgreSQL date validation error
          d3_mfg_implementation_date: (data.d3MfgImplementationDate && data.d3MfgImplementationDate.trim() !== '')
                                        ? data.d3MfgImplementationDate
                                        : null,
          d3_mfg_completed: data.d3MfgCompleted,
          d3_mfg_status: data.d3MfgStatus,
          d3_mfg_current_approval_step: data.d3MfgCurrentApprovalStep || 0
        });

      } catch (error) {
        console.error('Error saving D3-MFG:', error);
        showError('Error al guardar Acciones Inmediatas: ' + (error.message || 'Error desconocido'));
      }
    }

    // Handle D4 save
    if (tabId === 'd4' && updatedData.id) {
      try {
        const d4Payload = {
          d4_root_cause: data.d4RootCause,
          d4_4m_evaluation: Array.isArray(data.d4_4mEvaluation) ? data.d4_4mEvaluation : [],
          d4_5whys_analysis: Array.isArray(data.d4_5whysAnalysis) ? data.d4_5whysAnalysis : [],
          d4_completed: data.d4Completed,
          d4_status: data.d4Status,
          d4_current_approval_step: data.d4CurrentApprovalStep || 0,
          d4_delay_history: data.d4DelayHistory
        };
        await eightDService.updateEightdReport(updatedData.id, d4Payload);

        // Update workflowData with the saved data to keep it in sync
        setWorkflowData(prev => ({
          ...prev,
          d4RootCause: data.d4RootCause,
          d4_4mEvaluation: data.d4_4mEvaluation,
          d4_5whysAnalysis: data.d4_5whysAnalysis,
          d4Completed: data.d4Completed,
          d4Status: data.d4Status,
          d4CurrentApprovalStep: data.d4CurrentApprovalStep,
          d4DelayHistory: data.d4DelayHistory
        }));
        if (data.d4Completed) {
          setTabCompletionStatus(prev => ({ ...prev, d4: true }));
        }
      } catch (error) {
        console.error('Error saving D4:', error);
      }
    }

    // Handle D5 save (Corrective Actions with 5 Whys linkage)
    if (tabId === 'd5' && updatedData.id) {
      try {
        const d5Payload = {
          d5_corrective_actions: data.d5CorrectiveActions || [],
          d5_completed: data.d5Completed || false
          // Note: d5_status and d5_current_approval_step are handled by approval endpoints only
        };



        await eightDService.updateEightdReport(updatedData.id, d5Payload);

        setWorkflowData(prev => ({
          ...prev,
          d5CorrectiveActions: data.d5CorrectiveActions,
          d5Completed: data.d5Completed
        }));



        if (data.d5Completed) {
          setTabCompletionStatus(prev => ({ ...prev, d5: true }));
        }
      } catch (error) {
        console.error('Error saving D5:', error);
      }
    }

    // Handle D6 save
    if (tabId === 'd6' && updatedData.id) {
      try {
        await eightDService.updateEightdReport(updatedData.id, {
          d6DefinitiveCountermeasure: data.d6DefinitiveCountermeasure,
          d6ResponsibleUserId: data.d6ResponsibleUserId,
          d6ImplementationDate: data.d6ImplementationDate,
          d6VerificationMethod: data.d6VerificationMethod,
          d6VerificationResults: data.d6VerificationResults,
          d6ApprovedBy: data.d6ApprovedBy,
          d6ApprovedAt: data.d6ApprovedAt,
          d6Completed: data.d6Completed
        });
        if (data.d6Completed) {
          setTabCompletionStatus(prev => ({ ...prev, d6: true }));
        }
      } catch (error) {
        console.error('Error saving D6:', error);
      }
    }

    // Handle D7 save
    if (tabId === 'd7' && updatedData.id) {
      try {
        await eightDService.updateEightdReport(updatedData.id, {
          d7TemporaryValidation: data.d7TemporaryValidation,
          d7DefinitiveValidation: data.d7DefinitiveValidation,
          d7ValidationDate: data.d7ValidationDate,
          d7IsEffective: data.d7IsEffective,
          d7ValidationEvidence: data.d7ValidationEvidence,
          d7ApprovedBy: data.d7ApprovedBy,
          d7ApprovedAt: data.d7ApprovedAt,
          d7Completed: data.d7Completed
        });
        if (data.d7Completed) {
          setTabCompletionStatus(prev => ({ ...prev, d7: true }));
        }
      } catch (error) {
        console.error('Error saving D7:', error);
      }
    }

    // D8 completion status update (moved from duplicate code below)
    if (tabId === 'd8' && data.d8Completed) {
      setTabCompletionStatus(prev => ({ ...prev, d8: true }));
    }

    // Handle D8 save - REMOVED DUPLICATE CODE
    // D8 saving logic is now handled above with proper snake_case conversion
    if (false) { // Disabled duplicate code
      try {
        await eightDService.updateEightdReport(updatedData.id, {
          d8FollowupActions: data.d8FollowupActions,
          d8EvidenceDocumentation: data.d8EvidenceDocumentation,
          d8ClosureNotes: data.d8ClosureNotes,
          d8LessonsLearned: data.d8LessonsLearned,
          d8ClosedBy: data.d8ClosedBy,
          d8ClosedAt: data.d8ClosedAt,
          d8Completed: data.d8Completed
        });
        if (data.d8Completed) {
          setTabCompletionStatus(prev => ({ ...prev, d8: true }));
        }
      } catch (error) {
        console.error('Error saving D8:', error);
      }
    }
  };

  // ===================== PDF EXPORT FUNCTION =====================
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportPDF = async () => {
    if (!workflowData || !workflowData.id) {
      showWarning('Guarda el reporte primero antes de exportar');
      return;
    }

    setIsExportingPDF(true);

    try {
      // Prepare images as base64 (to avoid CORS issues)
      const images = {};

      // Convert photo URLs to base64 if they exist
      const convertToBase64 = async (url) => {
        if (!url) return null;
        try {
          // If it's already base64, return as is
          if (url.startsWith('data:')) return url;

          // Handle relative URLs - add backend prefix
          let fullUrl = url;
          if (url.startsWith('/uploads') || url.startsWith('uploads')) {
            const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            fullUrl = url.startsWith('/') ? `${backendUrl}${url}` : `${backendUrl}/${url}`;
          } else if (!url.startsWith('http')) {
            const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            fullUrl = `${backendUrl}/${url}`;
          }

          // For local URLs, fetch and convert
          const response = await fetch(fullUrl);
          if (!response.ok) throw new Error('Failed to fetch image');
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn('Could not convert image:', url, err);
          return null;
        }
      };

      // Get image URL (can be string, object with .url, .path, .file_path, .filePath, or .file_url)
      const getImageUrl = (img) => {
        if (!img) return null;
        if (typeof img === 'string') return img;
        if (img.url) return img.url;
        if (img.file_url) return img.file_url;
        if (img.path) return img.path;
        if (img.file_path) return img.file_path;
        if (img.filePath) return img.filePath;
        return null;
      };

      const photoNoGoodUrl = getImageUrl(workflowData.photoNoGood);
      // photoOK can be stored as photoOK or photoOk depending on source
      const photoOkUrl = getImageUrl(workflowData.photoOK || workflowData.photoOk);

      if (photoNoGoodUrl) {
        images.photo_no_good = await convertToBase64(photoNoGoodUrl);
      }
      if (photoOkUrl) {
        images.photo_ok = await convertToBase64(photoOkUrl);
      }

      // Load D6 before/after photos and conditions from d7-validation endpoint
      let d6ValidationData = {};
      if (workflowData.id) {
        try {
          const token = localStorage.getItem('token');
          const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const response = await fetch(
            `${backendUrl}/api/8d/reports/${workflowData.id}/d7-validation`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const result = await response.json();
          if (result.success && result.data) {
            // Load beforeCondition/afterCondition from validation
            if (result.data.validation) {
              d6ValidationData.beforeCondition = result.data.validation.before_condition || result.data.validation.beforeCondition;
              d6ValidationData.afterCondition = result.data.validation.after_condition || result.data.validation.afterCondition;
            }

            // Load photos
            if (result.data.validationFiles) {
              const files = result.data.validationFiles;
              const beforePhotos = files.filter(f => f.file_type === 'before_photo');
              const afterPhotos = files.filter(f => f.file_type === 'after_photo');

              // Convert first before photo
              if (beforePhotos.length > 0) {
                const beforeUrl = getImageUrl(beforePhotos[0]);
                if (beforeUrl) {
                  images.d6_before = await convertToBase64(beforeUrl);
                }
              }
              // Convert first after photo
              if (afterPhotos.length > 0) {
                const afterUrl = getImageUrl(afterPhotos[0]);
                if (afterUrl) {
                  images.d6_after = await convertToBase64(afterUrl);
                }
              }
            }
          }
        } catch (err) {
          console.warn('Could not load D6 validation data:', err);
        }
      }

      // Merge D6 validation data into workflowData for PDF
      const pdfData = {
        ...workflowData,
        beforeCondition: d6ValidationData.beforeCondition || workflowData.beforeCondition,
        afterCondition: d6ValidationData.afterCondition || workflowData.afterCondition
      };

      // Generate PDF using @react-pdf/renderer
      const pdfBlob = await pdf(
        <EightDPDF
          data={pdfData}
          users={users}
          images={images}
        />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');

      const sanitizedTitle = (workflowData.title || 'Report')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      link.href = url;
      link.download = `${workflowData.reportId || '8D-Report'}_${sanitizedTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('PDF exportado exitosamente');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Error al exportar PDF: ' + error.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // ===================== PDF CAPTURE FUNCTION (Captura cada tab) =====================
  const [isCapturingPDF, setIsCapturingPDF] = useState(false);
  const [captureProgress, setCaptureProgress] = useState('');

  const handleExportPDFCapture = async () => {
    if (!workflowData || !workflowData.id) {
      showWarning('Guarda el reporte primero antes de exportar');
      return;
    }

    if (!contentRef.current) {
      showError('No se encontró el área de contenido');
      return;
    }

    setIsCapturingPDF(true);
    const originalTab = currentTab;

    try {
      // Usar landscape para más espacio horizontal
      const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' = landscape
      const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
      const margin = 5; // Margen mínimo
      let isFirstPage = true;

      // Recorrer todos los tabs
      for (let i = 0; i < tabs.length; i++) {
        setCaptureProgress(`Capturando ${tabs[i].label} (${i + 1}/${tabs.length})...`);

        // Cambiar al tab
        setCurrentTab(i);

        // Esperar a que se renderice
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Capturar el contenido a escala 1:1
        const canvas = await html2canvas(contentRef.current, {
          scale: 1.5, // Buena calidad sin ser excesivo
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png', 1.0);

        // Calcular dimensiones para llenar la página (casi sin márgenes)
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - 20 - margin; // 20mm para header

        // Escalar para llenar el ancho disponible
        const imgWidth = availableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Header de la página
        if (!isFirstPage) {
          pdf.addPage('l'); // landscape
        }
        isFirstPage = false;

        // Header
        pdf.setFillColor(44, 82, 130);
        pdf.rect(0, 0, pageWidth, 12, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${workflowData.reportId || '8D Report'} - ${tabs[i].label}`, margin, 8);
        pdf.setFontSize(9);
        pdf.text(tabs[i].subtitle || '', pageWidth - margin, 8, { align: 'right' });

        const startY = 15;

        // Si la imagen cabe en una página
        if (imgHeight <= availableHeight) {
          pdf.addImage(imgData, 'PNG', margin, startY, imgWidth, imgHeight);
        } else {
          // Dividir en múltiples páginas
          let yPosition = 0;
          let pagesNeeded = Math.ceil(imgHeight / availableHeight);

          for (let p = 0; p < pagesNeeded; p++) {
            if (p > 0) {
              pdf.addPage('l');
              // Mini header en páginas de continuación
              pdf.setFillColor(44, 82, 130);
              pdf.rect(0, 0, pageWidth, 8, 'F');
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(9);
              pdf.text(`${tabs[i].label} (cont.)`, margin, 5);
            }

            const clipY = p * availableHeight;
            const clipHeight = Math.min(availableHeight, imgHeight - clipY);
            const headerOffset = p === 0 ? startY : 10;

            // Crear canvas recortado para esta porción
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = (clipHeight / imgHeight) * canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(
              canvas,
              0, (clipY / imgHeight) * canvas.height,
              canvas.width, tempCanvas.height,
              0, 0,
              tempCanvas.width, tempCanvas.height
            );

            const portionData = tempCanvas.toDataURL('image/png', 1.0);
            pdf.addImage(portionData, 'PNG', margin, headerOffset, imgWidth, clipHeight);
          }
        }
      }

      // Footer en todas las páginas
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Quality Alert System - Generado: ${new Date().toLocaleString('es-MX')}`, margin, pageHeight - 5);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      }

      // Descargar
      const sanitizedTitle = (workflowData.title || 'Report')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      pdf.save(`${workflowData.reportId || '8D-Report'}_${sanitizedTitle}_COMPLETO.pdf`);

      showSuccess('PDF completo exportado exitosamente');

    } catch (error) {
      console.error('Error capturing PDF:', error);
      showError('Error al capturar PDF: ' + error.message);
    } finally {
      // Restaurar tab original
      setCurrentTab(originalTab);
      setIsCapturingPDF(false);
      setCaptureProgress('');
    }
  };

  // ===================== EXCEL EXPORT FUNCTION =====================
  const handleExportExcel = async () => {
    if (!workflowData || !workflowData.id) {
      showWarning('Guarda el reporte primero antes de exportar');
      return;
    }

    setIsExportingExcel(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QMS System';
      workbook.created = new Date();

      // Helper to add image to worksheet
      const addImageToSheet = async (worksheet, imageUrl, startRow, startCol) => {
        if (!imageUrl) return;
        try {
          let fullUrl = imageUrl;
          if (imageUrl.startsWith('/uploads') || imageUrl.startsWith('uploads')) {
            const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            fullUrl = imageUrl.startsWith('/') ? `${backendUrl}${imageUrl}` : `${backendUrl}/${imageUrl}`;
          }
          const response = await fetch(fullUrl);
          if (!response.ok) return;
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
          const extension = blob.type.includes('png') ? 'png' : 'jpeg';
          const imageId = workbook.addImage({ base64, extension });
          worksheet.addImage(imageId, {
            tl: { col: startCol, row: startRow },
            ext: { width: 200, height: 150 }
          });
        } catch (err) {
          console.warn('Could not add image:', err);
        }
      };

      // Style helpers
      const headerStyle = { font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }, alignment: { horizontal: 'center' } };
      const subHeaderStyle = { font: { bold: true, size: 11 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } } };
      const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-MX') : '-';
      const getUserName = (userId) => {
        if (!userId) return '-';
        const user = users.find(u => u.id === userId);
        return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : `ID: ${userId}`;
      };

      // ============= SHEET 1: Info General =============
      const ws1 = workbook.addWorksheet('Info General');
      ws1.columns = [{ width: 25 }, { width: 40 }, { width: 25 }, { width: 40 }];
      ws1.addRow(['REPORTE 8D - INFORMACIÓN GENERAL']).font = { bold: true, size: 16 };
      ws1.mergeCells('A1:D1');
      ws1.addRow([]);
      ws1.addRow(['Número de Reporte:', workflowData.reportId || workflowData.id, 'Estado:', workflowData.status || '-']);
      ws1.addRow(['Título:', workflowData.title || '-', 'Severidad:', workflowData.severity || '-']);
      ws1.addRow(['Cliente:', workflowData.supplierName || '-', 'Cuenta:', workflowData.supplierAccount || '-']);
      ws1.addRow(['Número de Parte:', workflowData.partNumber || '-', 'Nombre de Parte:', workflowData.partName || '-']);
      ws1.addRow(['Fecha de Issue:', formatDate(workflowData.issueDate), 'Fecha Objetivo:', formatDate(workflowData.targetCloseDate)]);
      ws1.addRow(['Tipo de Issue:', workflowData.tipoIssue || '-', 'Tipo Resp:', workflowData.tipoResp || '-']);
      ws1.addRow(['Creado Por:', getUserName(workflowData.createdBy), 'Fecha Creación:', formatDate(workflowData.createdAt)]);
      ws1.addRow([]);
      ws1.addRow(['PARTES AFECTADAS']).font = { bold: true, size: 12 };
      ws1.addRow(['Número', 'Nombre', 'Cantidad Afectada', 'Costo Impacto']);
      (workflowData.selectedParts || []).forEach(p => {
        ws1.addRow([p.partNumber, p.partName, p.totalAffectedQty || 0, p.totalCostImpact || 0]);
      });

      // ============= SHEET 2: D1 - Equipo =============
      const ws2 = workbook.addWorksheet('D1 - Equipo');
      ws2.columns = [{ width: 30 }, { width: 40 }, { width: 20 }];
      ws2.addRow(['D1 - FORMACIÓN DEL EQUIPO']).font = { bold: true, size: 14 };
      ws2.mergeCells('A1:C1');
      ws2.addRow([]);
      ws2.addRow(['Rol', 'Nombre', 'Departamento']);
      const escalation = workflowData.escalationPath || {};
      const issueUsers = escalation.issue_users || [];
      issueUsers.forEach((u, i) => {
        const userName = typeof u === 'object' ? u.name : getUserName(u);
        ws2.addRow([i === 0 ? 'Champion / Líder' : `Aprobador ${i}`, userName, '-']);
      });
      ws2.addRow([]);
      ws2.addRow(['Estado D1:', workflowData.d1Completed ? 'Completado' : 'Pendiente']);
      ws2.addRow(['Fecha Completado:', formatDate(workflowData.d1CompletedAt)]);

      // ============= SHEET 3: D2 - Descripción =============
      const ws3 = workbook.addWorksheet('D2 - Descripción');
      ws3.columns = [{ width: 25 }, { width: 60 }];
      ws3.addRow(['D2 - DESCRIPCIÓN DEL PROBLEMA']).font = { bold: true, size: 14 };
      ws3.mergeCells('A1:B1');
      ws3.addRow([]);
      ws3.addRow(['Descripción:', workflowData.description || workflowData.d2ProblemDescription || '-']);
      ws3.getRow(3).height = 60;
      ws3.addRow([]);
      ws3.addRow(['Estado D2:', workflowData.d2Completed ? 'Completado' : 'Pendiente']);
      ws3.addRow(['Fecha Completado:', formatDate(workflowData.d2CompletedAt)]);
      ws3.addRow([]);
      ws3.addRow(['EVIDENCIA FOTOGRÁFICA']).font = { bold: true };
      ws3.addRow(['Foto NO GOOD:', '(ver imagen abajo)']);
      const photoNoGoodUrl = workflowData.photoNoGood?.url || workflowData.photoNoGood;
      if (photoNoGoodUrl) await addImageToSheet(ws3, photoNoGoodUrl, 10, 0);
      ws3.addRow([]); ws3.addRow([]); ws3.addRow([]); ws3.addRow([]); ws3.addRow([]);
      ws3.addRow(['Foto OK (Referencia):', '(ver imagen abajo)']);
      const photoOkUrl = workflowData.photoOK?.url || workflowData.photoOK;
      if (photoOkUrl) await addImageToSheet(ws3, photoOkUrl, 18, 0);

      // ============= SHEET 4: D3 - Contención =============
      const ws4 = workbook.addWorksheet('D3 - Contención');
      ws4.columns = [{ width: 30 }, { width: 50 }];
      ws4.addRow(['D3 - ACCIONES DE CONTENCIÓN']).font = { bold: true, size: 14 };
      ws4.mergeCells('A1:B1');
      ws4.addRow([]);
      const d3 = workflowData.d3Data || {};
      ws4.addRow(['Disposición Material Sospechoso:', d3.suspectMaterialDisposal || '-']);
      ws4.addRow(['Garantía de Conformidad:', d3.conformanceMaterialGuarantee || '-']);
      ws4.addRow(['Requiere Retrabajo:', d3.requiresRework === true ? 'Sí' : d3.requiresRework === false ? 'No' : '-']);
      ws4.addRow(['Costo Unitario Retrabajo:', d3.reworkUnitCost || 0]);
      ws4.addRow(['Costo Real Impacto:', d3.realImpactCost || 0]);
      ws4.addRow([]);
      ws4.addRow(['PUNTOS DE DETECCIÓN']).font = { bold: true };
      const dp = d3.detectionPoints || {};
      ws4.addRow(['Durante Proceso:', dp.duringProcess?.yes ? 'Sí' : dp.duringProcess?.no ? 'No' : '-']);
      ws4.addRow(['Después de Manufactura:', dp.afterManufacture?.yes ? 'Sí' : dp.afterManufacture?.no ? 'No' : '-']);
      ws4.addRow(['Antes de Envío:', dp.priorDespatch?.yes ? 'Sí' : dp.priorDespatch?.no ? 'No' : '-']);
      ws4.addRow([]);
      ws4.addRow(['Estado D3:', workflowData.d3Completed ? 'Completado' : 'Pendiente']);

      // ============= SHEET 5: D4 - Causa Raíz =============
      const ws5 = workbook.addWorksheet('D4 - Causa Raíz');
      ws5.columns = [{ width: 20 }, { width: 60 }];
      ws5.addRow(['D4 - ANÁLISIS DE CAUSA RAÍZ']).font = { bold: true, size: 14 };
      ws5.mergeCells('A1:B1');
      ws5.addRow([]);
      ws5.addRow(['Técnica de Análisis:', workflowData.d4AnalysisTechnique || '-']);
      ws5.addRow(['Causa Raíz:', workflowData.d4RootCause || '-']);
      ws5.addRow([]);
      ws5.addRow(['ANÁLISIS 5 PORQUÉS']).font = { bold: true };
      const fiveWhys = workflowData.d4FiveWhysAnalysis || workflowData.d45whysAnalysis || [];
      fiveWhys.forEach((why, i) => {
        ws5.addRow([`Por qué ${i + 1}:`, why || '-']);
      });
      ws5.addRow([]);
      ws5.addRow(['Estado D4:', workflowData.d4Completed ? 'Completado' : 'Pendiente']);
      ws5.addRow(['Fecha Completado:', formatDate(workflowData.d4CompletedAt)]);

      // ============= SHEET 6: D5 - Acciones Correctivas =============
      const ws6 = workbook.addWorksheet('D5 - Correctivas');
      ws6.columns = [{ width: 40 }, { width: 20 }, { width: 20 }, { width: 15 }];
      ws6.addRow(['D5 - ACCIONES CORRECTIVAS PERMANENTES']).font = { bold: true, size: 14 };
      ws6.mergeCells('A1:D1');
      ws6.addRow([]);
      ws6.addRow(['Causa Raíz Final:', workflowData.d5FinalRootCause || '-']);
      ws6.addRow([]);
      ws6.addRow(['Acción', 'Responsable', 'Fecha', 'Estado']);
      const d5Actions = workflowData.d5CorrectiveActions || [];
      d5Actions.forEach(a => {
        ws6.addRow([a.action || a.description, getUserName(a.responsible), formatDate(a.dueDate), a.status || '-']);
      });
      ws6.addRow([]);
      ws6.addRow(['Estado D5:', workflowData.d5Completed ? 'Completado' : 'Pendiente']);

      // ============= SHEET 7: D6 - Implementación =============
      const ws7 = workbook.addWorksheet('D6 - Implementación');
      ws7.columns = [{ width: 30 }, { width: 50 }];
      ws7.addRow(['D6 - IMPLEMENTACIÓN Y VALIDACIÓN']).font = { bold: true, size: 14 };
      ws7.mergeCells('A1:B1');
      ws7.addRow([]);
      ws7.addRow(['Descripción Contramedida:', workflowData.d6CountermeasureDescription || '-']);
      ws7.addRow(['Plan de Implementación:', workflowData.d6ImplementationPlan || '-']);
      ws7.addRow(['Plan de Validación:', workflowData.d6ValidationPlan || '-']);
      ws7.addRow([]);
      ws7.addRow(['EVIDENCIA ANTES/DESPUÉS']).font = { bold: true };
      ws7.addRow(['Condición Antes:', workflowData.beforeCondition || '-']);
      // Load D7 validation data for before/after photos
      let d7ValidationFiles = [];
      try {
        const token = localStorage.getItem('token');
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const resp = await fetch(`${backendUrl}/api/8d/reports/${workflowData.id}/d7-validation`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await resp.json();
        if (result.success && result.data?.validationFiles) {
          d7ValidationFiles = result.data.validationFiles;
        }
      } catch (e) { console.warn('Could not load D7 files'); }
      const beforePhoto = d7ValidationFiles.find(f => f.file_type === 'before_photo');
      if (beforePhoto) await addImageToSheet(ws7, beforePhoto.url || beforePhoto.file_url, 9, 0);
      ws7.addRow([]); ws7.addRow([]); ws7.addRow([]); ws7.addRow([]); ws7.addRow([]);
      ws7.addRow(['Condición Después:', workflowData.afterCondition || '-']);
      const afterPhoto = d7ValidationFiles.find(f => f.file_type === 'after_photo');
      if (afterPhoto) await addImageToSheet(ws7, afterPhoto.url || afterPhoto.file_url, 17, 0);
      ws7.addRow([]);
      ws7.addRow(['Estado D6:', workflowData.d6Completed ? 'Completado' : 'Pendiente']);

      // ============= SHEET 8: D7 - Preventivas =============
      const ws8 = workbook.addWorksheet('D7 - Preventivas');
      ws8.columns = [{ width: 40 }, { width: 20 }, { width: 20 }, { width: 15 }];
      ws8.addRow(['D7 - ACCIONES PREVENTIVAS']).font = { bold: true, size: 14 };
      ws8.mergeCells('A1:D1');
      ws8.addRow([]);
      ws8.addRow(['Acción', 'Responsable', 'Fecha', 'Estado']);
      const d7Actions = workflowData.d7PreventiveActions || [];
      d7Actions.forEach(a => {
        ws8.addRow([a.action || a.description, getUserName(a.responsible), formatDate(a.dueDate), a.status || '-']);
      });
      ws8.addRow([]);
      ws8.addRow(['Lecciones Aprendidas:', workflowData.d7LessonsLearned || '-']);
      ws8.addRow([]);
      ws8.addRow(['Estado D7:', workflowData.d7Completed ? 'Completado' : 'Pendiente']);

      // ============= SHEET 9: D8 - Cierre =============
      const ws9 = workbook.addWorksheet('D8 - Cierre');
      ws9.columns = [{ width: 30 }, { width: 50 }];
      ws9.addRow(['D8 - CIERRE Y RECONOCIMIENTO']).font = { bold: true, size: 14 };
      ws9.mergeCells('A1:B1');
      ws9.addRow([]);
      ws9.addRow(['Reconocimiento del Equipo:', workflowData.d8TeamRecognition || '-']);
      ws9.addRow(['Lecciones Aprendidas:', workflowData.d8LessonsLearned || '-']);
      ws9.addRow(['Notas de Cierre:', workflowData.d8ClosureNotes || '-']);
      ws9.addRow([]);
      ws9.addRow(['Cerrado Por:', getUserName(workflowData.d8ClosedBy)]);
      ws9.addRow(['Fecha de Cierre:', formatDate(workflowData.d8ClosedAt)]);
      ws9.addRow([]);
      ws9.addRow(['Estado D8:', workflowData.d8Completed ? 'Completado' : 'Pendiente']);

      // ============= SHEET 10: Historial =============
      const ws10 = workbook.addWorksheet('Historial');
      ws10.columns = [{ width: 20 }, { width: 15 }, { width: 25 }, { width: 50 }];
      ws10.addRow(['HISTORIAL DE CAMBIOS Y APROBACIONES']).font = { bold: true, size: 14 };
      ws10.mergeCells('A1:D1');
      ws10.addRow([]);
      ws10.addRow(['Fecha', 'Etapa', 'Usuario', 'Acción/Comentarios']);
      // Load audit log
      try {
        const token = localStorage.getItem('token');
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const resp = await fetch(`${backendUrl}/api/8d/reports/${workflowData.id}/audit-log`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await resp.json();
        if (result.success && result.data) {
          result.data.forEach(log => {
            ws10.addRow([formatDate(log.createdAt), log.step || '-', log.userName || getUserName(log.userId), log.action || log.changes || '-']);
          });
        }
      } catch (e) {
        ws10.addRow(['-', '-', '-', 'No se pudo cargar el historial']);
      }
      // Add approval history
      ws10.addRow([]);
      ws10.addRow(['APROBACIONES D1-D2-D3']).font = { bold: true };
      if (workflowData.approval_1At) ws10.addRow([formatDate(workflowData.approval_1At), 'Aprobación 1', getUserName(workflowData.approval_1By), workflowData.approval_1Comments || 'Aprobado']);
      if (workflowData.approval_2At) ws10.addRow([formatDate(workflowData.approval_2At), 'Aprobación 2', getUserName(workflowData.approval_2By), workflowData.approval_2Comments || 'Aprobado']);
      if (workflowData.approval_3At) ws10.addRow([formatDate(workflowData.approval_3At), 'Aprobación 3', getUserName(workflowData.approval_3By), workflowData.approval_3Comments || 'Aprobado']);

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const sanitizedTitle = (workflowData.title || 'Report').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
      link.href = url;
      link.download = `${workflowData.reportId || '8D-Report'}_${sanitizedTitle}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Excel exportado exitosamente');

    } catch (error) {
      console.error('Error exporting Excel:', error);
      showError('Error al exportar Excel: ' + error.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ===================== D8 APPROVAL FUNCTIONS =====================
  const [isSendingD8, setIsSendingD8] = useState(false);

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

  // Send D8 to approval
  const handleSendToApprovalD8 = async () => {
    // ============================================================================
    // VALIDATION: All previous sections must be approved before sending D8
    // ============================================================================
    const getStatusLabel = (status) => {
      if (!status || status === 'draft') return ' No enviado';
      if (status === 'approved') return ' Completo';
      if (status === 'rejected') return ' Rechazado';
      if (status === 'under_review') return ' Pendiente';
      return ' Desconocido';
    };

    const tableRows = [];
    let hasPending = false;

    // D1-D2-D3
    const d1Status = workflowData.d1D2D3ApprovalStatus;
    tableRows.push(` D1-D2-D3: ${getStatusLabel(d1Status)}`);
    if (d1Status !== 'approved') hasPending = true;

    // D3-MFG (if applicable)
    if (workflowData.d3MfgStatus && workflowData.d3MfgStatus !== 'draft') {
      const d3MfgStatus = workflowData.d3MfgStatus;
      tableRows.push(` D3-MFG: ${getStatusLabel(d3MfgStatus)}`);
      if (d3MfgStatus !== 'approved') hasPending = true;
    }

    // D4
    const d4Status = workflowData.d4Status;
    tableRows.push(` D4: ${getStatusLabel(d4Status)}`);
    if (d4Status !== 'approved') hasPending = true;

    // D5
    const d5Status = workflowData.d5Status;
    tableRows.push(` D5: ${getStatusLabel(d5Status)}`);
    if (d5Status !== 'approved') hasPending = true;

    // D6
    const d6Status = workflowData.d6Status;
    tableRows.push(` D6: ${getStatusLabel(d6Status)}`);
    if (d6Status !== 'approved') hasPending = true;

    // D7
    const d7Status = workflowData.d7Status;
    tableRows.push(` D7: ${getStatusLabel(d7Status)}`);
    if (d7Status !== 'approved') hasPending = true;

    // If any section is pending, show error and block submission
    if (hasPending) {
      const message = ` NO PUEDES ENVIAR D8 A APROBACIÓN\n` +
        `ESTADO DE APROBACIONES:\n` +
        `${tableRows.join('\n')}\n` +
        `Todas las secciones deben estar COMPLETAS () antes de cerrar el 8D.`;

      alert(message);
      return;
    }

    if (!window.confirm('¿Estás seguro de enviar D8 a aprobación? Una vez enviada, no podrás editar hasta que sea aprobada o rechazada.')) {
      return;
    }

    setIsSendingD8(true);
    try {
      const token = localStorage.getItem('token');

      // Step 1: Save d8_completed directly to backend
      const saveResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${workflowData.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ d8_completed: true })
        }
      );

      if (!saveResponse.ok) {
        throw new Error('Error al guardar D8 como completada');
      }

      // Step 2: Send to approval via dedicated endpoint
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${workflowData.id}/d8/send-to-approval`,
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
        // Open mailto if email notification data is present
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D8 enviada a aprobación exitosamente');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al enviar a aprobación');
      }
    } catch (error) {
      console.error('Error sending D8 to approval:', error);
      showError(' Error al enviar D8 a aprobación');
    } finally {
      setIsSendingD8(false);
    }
  };

  // Approve D8
  const handleApproveD8 = async () => {
    if (!window.confirm('¿Confirmas que deseas APROBAR esta sección D8?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${workflowData.id}/d8/approve`,
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
        // Open mailto if email notification data is present
        if (result.emailNotification) {
          openMailtoFromNotification(result.emailNotification);
        }
        showSuccess(' D8 aprobada exitosamente');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al aprobar');
      }
    } catch (error) {
      console.error('Error approving D8:', error);
      showError(' Error al aprobar D8');
    }
  };

  // Reject D8
  const handleRejectD8 = async () => {
    const comments = prompt('RECHAZO - Por favor ingrese el motivo (obligatorio):');

    if (!comments || comments.trim() === '') {
      showError(' El comentario es obligatorio para rechazar');
      return;
    }

    if (!window.confirm('¿Confirmas que deseas RECHAZAR esta sección D8 y devolverla a Calidad?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${workflowData.id}/d8/approve`,
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
        showSuccess(' D8 rechazada. Devuelta a Calidad.');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Error al rechazar');
      }
    } catch (error) {
      console.error('Error rejecting D8:', error);
      showError(' Error al rechazar D8');
    }
  };

  // Helper function to calculate days open
  const calculateDaysOpen = () => {
    if (!workflowData) return 0;

    const createdDate = workflowData.createdAt
      ? new Date(workflowData.createdAt)
      : workflowData.issueDate
        ? new Date(workflowData.issueDate)
        : new Date();

    const today = new Date();
    const diffTime = Math.abs(today - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Helper function to get status color for each D section
  const getDStatus = (section) => {
    if (!workflowData) return 'gray';

    switch(section) {
      case 'D1-D2-D3':
        const d123Status = workflowData.d1D2D3ApprovalStatus || 'draft';
        if (d123Status === 'approved') return 'green';
        if (d123Status === 'under_review' || d123Status.includes('pending_approval')) return 'yellow';
        return 'red';

      case 'D4':
        if (workflowData.d4Completed) return 'green';
        const d4Status = workflowData.d4Status || 'draft';
        if (d4Status === 'under_review' || d4Status.includes('pending')) return 'yellow';
        if (d4Status === 'draft' || !workflowData.d45whysAnalysis || workflowData.d45whysAnalysis.length === 0) return 'red';
        return 'yellow';

      case 'D5':
        if (workflowData.d5Completed) return 'green';
        const d5Status = workflowData.d5Status || 'draft';
        if (d5Status === 'under_review' || d5Status.includes('pending')) return 'yellow';
        if (d5Status === 'draft' || !workflowData.d5CorrectiveActions || workflowData.d5CorrectiveActions.length === 0) return 'red';
        return 'yellow';

      case 'D6':
        if (workflowData.d6Completed) return 'green';
        const d6Status = workflowData.d6Status || 'draft';
        if (d6Status === 'under_review' || d6Status.includes('pending')) return 'yellow';
        if (d6Status === 'draft') return 'red';
        return 'yellow';

      case 'D7':
        if (workflowData.d7Completed) return 'green';
        const d7Status = workflowData.d7Status || 'draft';
        if (d7Status === 'under_review' || d7Status.includes('pending')) return 'yellow';
        if (d7Status === 'draft') return 'red';
        return 'yellow';

      case 'D8':
        if (workflowData.d8Completed) return 'green';
        const d8Status = workflowData.d8Status || 'draft';
        if (d8Status === 'under_review' || d8Status.includes('pending')) return 'yellow';
        if (d8Status === 'draft') return 'red';
        return 'yellow';

      default:
        return 'gray';
    }
  };

  // Helper function to render progress circles for all D sections
  const renderProgressSummary = () => {
    const sections = ['D1-D2-D3', 'D4', 'D5', 'D6', 'D7', 'D8'];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sections.map(section => {
          const status = getDStatus(section);
          const color = status === 'green' ? t.success :
                       status === 'yellow' ? t.warning : t.error;

          return (
            <div key={section} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
              }} />
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: t.textMuted
              }}>
                {section}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const CurrentTabComponent = tabs[currentTab]?.component;

  const styles = useMemo(() => ({
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      backgroundColor: t.bgCard,
      color: t.text,
      padding: '8px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: `1px solid ${t.border}`
    },
    headerContent: {
      width: '100%',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px'
    },
    titleSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      margin: 0,
      color: t.text,
      whiteSpace: 'nowrap'
    },
    subtitle: {
      fontSize: '13px',
      margin: 0,
      color: t.textMuted,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    languageSelector: {
      padding: '8px 12px',
      fontSize: '13px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      cursor: 'pointer'
    },
    problemInfoSection: {
      backgroundColor: t.bgPanel,
      padding: '16px 20px',
      borderBottom: `2px solid ${t.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    problemInfoContent: {
      width: '100%',
      margin: '0 auto'
    },
    problemInfoMain: {
      marginBottom: '12px'
    },
    problemInfoTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    },
    problemInfoLabel: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.primary
    },
    problemInfoSeparator: {
      fontSize: '18px',
      color: t.textMuted,
      fontWeight: '600'
    },
    problemInfoText: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      flex: 1
    },
    problemInfoDetails: {
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    problemInfoItem: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    problemInfoItemLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.textMuted
    },
    problemInfoItemValue: {
      fontSize: '14px',
      color: t.text,
      fontWeight: '500'
    },
    contentContainer: {
      width: '100%',
      margin: '0 auto',
      padding: '0'
    },
    navigationFooter: {
      backgroundColor: t.bgCard,
      padding: '20px',
      borderTop: `1px solid ${t.border}`,
      position: 'sticky',
      bottom: 0
    },
    navigationContent: {
      width: '100%',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    button: {
      padding: '12px 24px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    primaryButton: {
      backgroundColor: t.primary,
      color: t.bgCard
    },
    secondaryButton: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      color: t.text
    },
    successButton: {
      backgroundColor: t.success,
      color: t.bgCard
    },
    headerNavigation: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      width: '100%'
    },
    headerButton: {
      height: '32px',
      padding: '0 12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'opacity 0.2s ease',
      flex: '0 0 auto',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    headerButtonSecondary: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      color: t.text
    },
    headerButtonPrimary: {
      backgroundColor: t.primary,
      color: t.bgCard
    },
    // Navegación de tabs horizontal
    tabsContainer: {
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      padding: '0 24px',
      position: 'sticky',
      top: '0',
      zIndex: 99,
      overflowX: 'auto'
    },
    tabsRow: {
      display: 'flex',
      gap: '0',
      minWidth: 'max-content'
    },
    tab: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      transition: 'all 0.2s',
      flex: '0 0 auto'
    },
    tabContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start'
    },
    tabLabel: {
      fontSize: '13px',
      fontWeight: '400',
      color: t.textMuted,
      lineHeight: '1.2'
    },
    tabSubtitle: {
      fontSize: '11px',
      color: t.textDim,
      lineHeight: '1.2',
      marginTop: '2px'
    },
    tabActive: {
      boxShadow: `inset 0 -2px 0 ${t.primary}`
    },
    tabActiveLabel: {
      fontWeight: '600',
      color: t.text
    },
    tabDisabled: {
      opacity: 0.45,
      cursor: 'not-allowed'
    },
    tabIndicator: {
      width: '15px',
      height: '15px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      flexShrink: 0
    },
    tabIndicatorCompleted: {
      backgroundColor: t.success,
      color: t.bgCard
    },
    tabIndicatorActive: {
      backgroundColor: t.primary
    },
    tabIndicatorPending: {
      backgroundColor: 'transparent',
      border: `1px solid ${t.border}`
    },
    tabIndicatorBlocked: {
      backgroundColor: 'transparent',
      border: `1px solid ${t.border}`
    },
    oldTabIndicator: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      flexShrink: 0
    },
    progressHeader: {
      backgroundColor: t.bgPanel,
      padding: '12px 24px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px'
    },
    progressBar: {
      flex: 1,
      height: '8px',
      backgroundColor: t.border,
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: t.accent,
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    },
    contentArea: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto'
    }
  }), [t]);

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
          <span style={{ fontSize: '20px' }}></span>
          <span style={{ color: t.warning, fontWeight: '600' }}>
            Modo Solo Lectura - No tienes permisos para modificar este reporte
          </span>
        </div>
      )}

      {/* Header - Compact single row */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          {/* Title + Status + ID */}
          <div style={styles.titleSection}>
            <h1 style={styles.title}>{workflowData?.reportId || 'Nuevo 8D'}</h1>
            {workflowData?.status && <StatusBadge status={workflowData.status} />}
            <span style={styles.subtitle}>{tabs[currentTab]?.subtitle}</span>
          </div>

          {/* Actions: Back + PDF */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{...styles.headerButton, ...styles.headerButtonSecondary, padding: '6px 10px', fontSize: '12px'}}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              ← Dashboard
            </button>

            {workflowData?.id && (
              <button
                onClick={handleExportPDFCapture}
                disabled={isCapturingPDF}
                style={{
                  ...styles.headerButton,
                  ...styles.headerButtonSecondary,
                  padding: '6px 10px',
                  fontSize: '12px',
                  opacity: isCapturingPDF ? 0.6 : 1
                }}
                onMouseEnter={(e) => !isCapturingPDF && (e.target.style.opacity = '0.8')}
                onMouseLeave={(e) => !isCapturingPDF && (e.target.style.opacity = '1')}
                title="Exportar PDF completo"
              >
                {isCapturingPDF ? `${captureProgress}` : 'PDF'}
              </button>
            )}
          </div>

          {/* Navigation: Prev/Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentTab > 0 && (
              <button
                onClick={() => handleTabChange(currentTab - 1)}
                style={{...styles.headerButton, ...styles.headerButtonSecondary, padding: '6px 10px', fontSize: '12px'}}
                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                ← Anterior
              </button>
            )}

            {currentTab < tabs.length - 1 ? (
              <button
                onClick={() => handleTabChange(currentTab + 1)}
                style={{
                  ...styles.headerButton,
                  ...styles.headerButtonPrimary,
                  padding: '6px 10px',
                  fontSize: '12px',
                  opacity: !tabs[currentTab + 1]?.enabled ? 0.5 : 1,
                  cursor: !tabs[currentTab + 1]?.enabled ? 'not-allowed' : 'pointer'
                }}
                disabled={!tabs[currentTab + 1]?.enabled}
                onMouseEnter={(e) => tabs[currentTab + 1]?.enabled && (e.target.style.opacity = '0.85')}
                onMouseLeave={(e) => tabs[currentTab + 1]?.enabled && (e.target.style.opacity = '1')}
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={() => {
                  showSuccess('Proceso 8D completado ');
                  navigate('/dashboard');
                }}
                style={{
                  ...styles.headerButton,
                  ...styles.successButton,
                  padding: '6px 10px',
                  fontSize: '12px',
                  opacity: !tabCompletionStatus.d8 ? 0.5 : 1,
                  cursor: !tabCompletionStatus.d8 ? 'not-allowed' : 'pointer'
                }}
                disabled={!tabCompletionStatus.d8}
                onMouseEnter={(e) => tabCompletionStatus.d8 && (e.target.style.opacity = '0.85')}
                onMouseLeave={(e) => tabCompletionStatus.d8 && (e.target.style.opacity = '1')}
              >
                Completar
              </button>
            )}
          </div>

          {/* Theme + Language */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeSelector />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              style={{...styles.languageSelector, padding: '4px 8px', fontSize: '12px'}}
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Progress Header Bar */}
      <div style={styles.progressHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
            Paso {currentTab + 1} de {tabs.length}
          </span>
          <span style={{ fontSize: '14px', color: t.textMuted }}>
            {tabs[currentTab]?.label} - {tabs[currentTab]?.subtitle}
          </span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${Math.min(((currentTab + 1) / (tabs.length - 1)) * 100, 100)}%` }} />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '600', color: t.accent }}>
          {Math.min(Math.round(((currentTab + 1) / (tabs.length - 1)) * 100), 100)}%
        </span>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabsRow}>
          {tabs.map((tab, index) => {
            // Allow all tabs when closed (read-only mode)
            const isClosed = workflowData?.status === 'closed';
            const isEnabled = isClosed || tab.enabled;

            // Determine tab status for visual indicator
            const getTabStatus = () => {
              if (!isEnabled) return 'blocked';
              if (index < currentTab) return 'completed';
              if (index === currentTab) return 'active';
              return 'pending';
            };
            const tabStatus = getTabStatus();

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(index)}
                disabled={!isEnabled}
                style={{
                  ...styles.tab,
                  ...(index === currentTab ? styles.tabActive : {}),
                  ...(tabStatus === 'blocked' ? styles.tabDisabled : {}),
                  cursor: isEnabled ? 'pointer' : 'not-allowed'
                }}
                title={!isEnabled ? getBlockedReason(tab.id) : tab.subtitle}
              >
                {/* Status Indicator Circle */}
                <span style={{
                  ...styles.tabIndicator,
                  ...(tabStatus === 'completed' ? styles.tabIndicatorCompleted :
                     tabStatus === 'active' ? styles.tabIndicatorActive :
                     tabStatus === 'blocked' ? styles.tabIndicatorBlocked :
                     styles.tabIndicatorPending)
                }}>
                  {tabStatus === 'completed' && '✓'}
                </span>
                {/* Tab Content: Label + Subtitle */}
                <div style={styles.tabContent}>
                  <span style={{
                    ...styles.tabLabel,
                    ...(index === currentTab ? styles.tabActiveLabel : {})
                  }}>
                    {tab.label}
                  </span>
                  <span style={styles.tabSubtitle}>
                    {tab.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Archived Document Warning Banner */}
      {workflowData?.isArchived && (
        <div style={{
          backgroundColor: t.warningBg,
          borderBottom: `2px solid ${t.warningBorder}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: t.warningFg }}>DOCUMENTO ARCHIVADO (Solo Lectura)</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: t.warningFg }}>
              Este documento ha sido archivado y no puede ser modificado.
              {workflowData.archivedReason && ` Motivo: ${workflowData.archivedReason}`}
            </p>
          </div>
        </div>
      )}

      {/* Revision History Link */}
      {workflowData?.parentReportId && (
        <div style={{
          backgroundColor: t.bgPanel,
          borderBottom: `1px solid ${t.accent}`,
          padding: '8px 24px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: t.text }}>
            Esta es una revisión. Ver documento anterior:{' '}
            <a
              href={`/8d/${workflowData.parentReportId}`}
              style={{ color: t.accent, fontWeight: '600', textDecoration: 'underline' }}
            >
              {workflowData.reportId?.replace(/-R\d+$/, '') || 'Ver original'}
            </a>
          </span>
        </div>
      )}

      {/* Problem Information Header */}
      {workflowData && (
        <div style={{
          backgroundColor: t.bgCard,
          borderBottom: `1px solid ${t.border}`,
          padding: '12px 24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600', color: t.primary }}>
                {workflowData.reportId || 'Nuevo Reporte'}
              </span>
              {workflowData.isArchived && (
                <span style={{
                  backgroundColor: t.warning,
                  color: t.bgCard,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  ARCHIVADO
                </span>
              )}
              {workflowData.revisionNumber > 0 && (
                <span style={{
                  backgroundColor: t.accent,
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  REV {workflowData.revisionNumber}
                </span>
              )}
              <span style={{ color: t.border }}>|</span>
              <span style={{ fontSize: '14px', color: t.text }}>
                {workflowData.title || 'Sin título'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
              {workflowData.selectedClient && (
                <span style={{ color: t.textMuted }}>
                  Cliente: <strong style={{ color: t.text }}>{workflowData.selectedClient.name}</strong>
                </span>
              )}
              <span style={{ color: t.textMuted }}>
                Severidad: <strong style={{
                  color: workflowData.severity === 'High' ? t.error :
                         workflowData.severity === 'Medium' ? t.warning : t.success
                }}>{workflowData.severity || 'N/A'}</strong>
              </span>
              <span style={{
                color: calculateDaysOpen() > 30 ? t.error :
                       calculateDaysOpen() > 15 ? t.warning : t.success,
                fontWeight: '600'
              }}>
                {calculateDaysOpen()} días abierto
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div ref={contentRef} style={styles.contentArea} data-tab-content="true">
        {/* D1-D2-D3 Approval Stepper (MEJORA 2) */}
        {workflowData?.id && !loading && ['d1', 'd2', 'd3'].includes(tabs[currentTab]?.id) && workflowData?.escalationPath && (
          <ApprovalStepper
            section="issue"
            status={workflowData.d1D2D3ApprovalStatus || 'draft'}
            approvers={workflowData.escalationPath.issue_users || []}
            users={users}
            language={language}
          />
        )}

        {/* Loading/Error/Content States */}
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            fontSize: '18px',
            color: t.textMuted
          }}>
            {tr('loading')}
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            fontSize: '18px',
            color: t.error
          }}>
            {tr('error')}: {error}
          </div>
        ) : CurrentTabComponent ? (
          <CurrentTabComponent
            data={workflowData}
            onDataUpdate={(data) => handleDataUpdate(tabs[currentTab].id, data)}
            language={language}
            activeSection={tabs[currentTab].section}
            isReadOnly={workflowData?.status === 'closed'}
            {...(tabs[currentTab].id === 'd4' && { isBlocked: isD4Blocked })}
            {...(tabs[currentTab].id === 'd5' && { isBlocked: isD5Blocked })}
            {...(tabs[currentTab].id === 'd6' && { isBlocked: isD6Blocked })}
            {...(tabs[currentTab].id === 'd8' && {
              onSendToApproval: handleSendToApprovalD8,
              onApprove: handleApproveD8,
              onReject: handleRejectD8,
              isSending: isSendingD8,
              currentUser: JSON.parse(localStorage.getItem('user') || '{}')
            })}
          />
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            fontSize: '18px',
            color: t.textMuted
          }}>
            No hay componente disponible para esta pestaña
          </div>
        )}
      </div>

    </div>
  );
};

export default EightDWorkflow;
