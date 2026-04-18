// Service para manejar datos 8D en localStorage (temporal hasta implementar BD) y API

const STORAGE_KEY = '8d_current_data';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const eightDService = {
  // Guardar datos básicos del 8D (desde EscalationForm)
  saveBasicData: (data) => {
    const basicData = {
      reportId: data.reportId,
      supplierName: data.supplierName,
      supplierAccount: data.supplierAccount,
      partNumber: data.partNumber,
      partName: data.partName,
      title: data.title,
      severidad: data.severidad,
      fechaEmission: data.fechaEmission,
      problemType: data.problemType,
      tipoIssue: data.tipoIssue,
      tipoResp: data.tipoResp,
      timingOccurrence: data.timingOccurrence,
      requerimientoCM: data.requerimientoCM,
      
      // Escalation Path - usuarios asignados (tomando el usuario principal de cada sección)
      issueCard: data.issueSection?.aprobacion || data.issueSection?.preAnalisis || null,
      countermeasureCard: data.countermeasureSection?.responsable || data.countermeasureSection?.analisis || null,
      confirmationCard: data.confirmationSection?.aprobacion || data.confirmationSection?.confirmacionIssue || null,
      
      // Metadatos
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      currentStep: 'escalation',
      status: 'in_progress'
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(basicData));
    return basicData;
  },

  // Obtener datos básicos del 8D
  getBasicData: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error al obtener datos 8D:', error);
      return null;
    }
  },

  // Actualizar datos específicos
  updateData: (updates) => {
    const currentData = eightDService.getBasicData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        ...updates,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      return updatedData;
    }
    return null;
  },

  // Actualizar paso actual del proceso 8D
  updateCurrentStep: (step) => {
    return eightDService.updateData({ currentStep: step });
  },

  // Verificar si hay datos 8D activos
  hasActiveData: () => {
    const data = eightDService.getBasicData();
    return data !== null;
  },

  // Limpiar datos (cuando se complete o cancele el 8D)
  clearData: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Obtener solo los datos del header para otros formularios
  getHeaderData: () => {
    const data = eightDService.getBasicData();
    if (!data) return null;
    
    return {
      reportId: data.reportId,
      supplierName: data.supplierName,
      supplierAccount: data.supplierAccount,
      partNumber: data.partNumber,
      partName: data.partName,
      title: data.title
    };
  },

  // Generar Report ID único
  generateReportId: () => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    return `8D-${year}-${timestamp}`;
  },

  // Obtener información de estado del proceso
  getProcessStatus: () => {
    const data = eightDService.getBasicData();
    if (!data) return null;
    
    return {
      reportId: data.reportId,
      currentStep: data.currentStep,
      status: data.status,
      createdAt: data.createdAt,
      lastModified: data.lastModified
    };
  },

  // === NEW API FUNCTIONS ===
  
  // Get dashboard metrics from API
  getDashboardMetrics: async () => {
    try {
      // Try to get real data from API first
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/8d/dashboard-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        // Map the existing data structure to the expected format
        const data = result.data;
        return {
          total_reports: data.total8Ds || 0,
          open_reports: data.active8Ds || 0,
          closed_reports: data.closed8Ds || 0,
          overdue_reports: data.overdue || 0,
          total_estimated_cost: data.totalEstimatedCost || 0,
          total_actual_cost: data.totalActualCost || 0,
          avg_progress: data.avgProgress || 0,
          high_severity: data.highSeverity || 0,
          medium_severity: data.mediumSeverity || 0,
          low_severity: data.lowSeverity || 0,
          recent_8ds: data.recent8Ds || []
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return mock data as fallback
      return eightDService.getMockMetrics();
    }
  },

  // Get all 8D reports with pagination
  getEightdReports: async (page = 1, limit = 10, filters = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await fetch(`${API_BASE_URL}/8d/reports?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data : null;
    } catch (error) {
      console.error('Error fetching 8D reports:', error);
      return eightDService.getMockReports();
    }
  },

  // Get single 8D report by ID
  getEightdReportById: async (reportId) => {
    try {
      const token = localStorage.getItem('token');

      // Use the specific endpoint for getting a report with parts
      const response = await fetch(`${API_BASE_URL}/8d/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If the specific endpoint fails, fallback to dashboard-data
        const fallbackResponse = await fetch(`${API_BASE_URL}/8d/dashboard-data`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!fallbackResponse.ok) {
          throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
        }

        const result = await fallbackResponse.json();
        if (result.success && result.data && result.data.recent8Ds) {
          const report = result.data.recent8Ds.find(r => r.id === reportId);
          if (report) {
            return {
              id: report.id,
              reportId: report.id,
              title: report.title,
              supplierName: report.customer || 'N/A',
              supplierAccount: '',
              partNumber: report.partNumber || 'N/A',
              partName: report.partName || 'N/A',
              severity: report.severity || 'Minor',
              status: eightDService.mapBackendStatusToFrontend(report.status),
              currentStep: eightDService.mapStatusToCurrentStep(report.status),
              createdAt: report.dateOpened || new Date().toISOString(),
              lastModified: new Date().toISOString(),
              assignedTeam: report.assignedTo || [],
              teamLeader: report.teamLeader || '',
              estimatedCost: report.estimatedCost || 0,
              targetCloseDate: report.targetClose || null,
              customer: report.customer || '',
              escalationComplete: report.currentStep > 1,
              problemAnalysisComplete: report.currentStep > 4,
              actionsValidationComplete: report.currentStep >= 8
            };
          }
        }
        return null;
      }

      const result = await response.json();
      if (result.success && result.report) {
        const report = result.report;

        // Map parts from database to selectedParts format
        const selectedParts = report.parts ? report.parts.map(part => {
          const qtyWarehouse = parseInt(part.qtyWarehouse) || 0;
          const qtyInProcess = parseInt(part.qtyInProcess) || 0;
          const qtyInTransit = parseInt(part.qtyInTransit) || 0;
          const qtyWithCustomer = parseInt(part.qtyWithCustomer) || 0;
          const totalAffectedQty = qtyWarehouse + qtyInProcess + qtyInTransit + qtyWithCustomer;
          const unitCost = parseFloat(part.unitCost) || 0;
          const totalCostImpact = totalAffectedQty * unitCost;

          return {
            id: part.partId,
            partNumber: part.partNumber,
            partName: part.partName,
            clientPartNumber: part.clientPartNumber,
            revision: part.revision,
            description: part.description,
            unitCost,
            currency: part.currency || 'USD',
            weight: part.specifications?.weight || null,
            snpQuantity: part.specifications?.snpQuantity || null,
            snpVolume: part.specifications?.snpVolume || null,
            specifications: part.specifications?.specifications || null,
            // Inventory quantities
            qtyWarehouse,
            qtyInProcess,
            qtyInTransit,
            qtyWithCustomer,
            // Calculated fields
            totalAffectedQty,
            totalCostImpact
          };
        }) : [];

        // Build selectedClient from first part (client info is in parts table)
        const firstPart = report.parts && report.parts.length > 0 ? report.parts[0] : null;

        const selectedClient = firstPart && firstPart.clientId ? {
          id: firstPart.clientId,
          name: firstPart.clientName || report.supplierName
        } : null;

        // Build selectedProject from first part (project info is in parts table)
        const selectedProject = firstPart && firstPart.projectId ? {
          id: firstPart.projectId,
          projectNumber: firstPart.projectNumber,
          projectName: firstPart.projectName
        } : null;

        // Map escalation_path from backend format (arrays of user IDs) to frontend format
        // Backend JSONB almacena en snake_case: { issue_users: [...], countermeasure_users: [...] }
        // transformToCamelCase NO transforma contenido de JSONB recursivamente
        // Por eso mantenemos snake_case en frontend para escalationPath
        // IMPORTANTE: NUNCA devolver null - siempre devolver objeto con arrays vacíos
        // para que la UI de aprobación siempre se muestre en D3+
        const escalationPath = {
          issue_users: report.escalationPath?.issue_users || report.escalationPath?.issueUsers || [],
          countermeasure_users: report.escalationPath?.countermeasure_users || report.escalationPath?.countermeasureUsers || [],
          confirmation_users: report.escalationPath?.confirmation_users || report.escalationPath?.confirmationUsers || []
        };

        // Load attachments (photos and documents) directly from API
        let photoNoGood = null;
        let photoOK = null;
        let attachedDocuments = [];

        try {
          const token = localStorage.getItem('token');
          const attachmentsResponse = await fetch(`${API_BASE_URL}/8d/reports/${reportId}/attachments`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (attachmentsResponse.ok) {
            const attachmentsResult = await attachmentsResponse.json();
            const attachments = attachmentsResult.attachments || [];

            if (attachments.length > 0) {
              // Find photo_no_good (first one)
              const photoNoGoodAttachment = attachments.find(att => att.attachmentType === 'photo_no_good');
              if (photoNoGoodAttachment) {
                photoNoGood = {
                  name: photoNoGoodAttachment.originalFilename,
                  url: `${API_BASE_URL}${photoNoGoodAttachment.url}`,
                  id: photoNoGoodAttachment.id
                };
              }

              // Find photo_ok (first one)
              const photoOKAttachment = attachments.find(att => att.attachmentType === 'photo_ok');
              if (photoOKAttachment) {
                photoOK = {
                  name: photoOKAttachment.originalFilename,
                  url: `${API_BASE_URL}${photoOKAttachment.url}`,
                  id: photoOKAttachment.id
                };
              }

              // Get all documents
              attachedDocuments = attachments
                .filter(att => att.attachmentType === 'document')
                .map(att => ({
                  name: att.originalFilename,
                  url: `${API_BASE_URL}${att.url}`,
                  id: att.id,
                  description: att.description
                }));
            }
          }
        } catch (error) {
          console.error(' Error loading attachments:', error);
        }

        // Map D3 data from database format to frontend format
        // Ensure nonDetectionReasons has exactly 5 elements (for 5 Why's)
        const rawNonDetectionReasons = report.d3NonDetectionReasons || [];
        const normalizedNonDetectionReasons = Array.isArray(rawNonDetectionReasons) && rawNonDetectionReasons.length > 0
          ? [...rawNonDetectionReasons, '', '', '', '', ''].slice(0, 5)  // Ensure 5 elements
          : ['', '', '', '', ''];

        // Ensure detectionPoints has proper structure
        const rawDetectionPoints = report.d3DetectionPoints || {};
        const normalizedDetectionPoints = {
          duringProcess: rawDetectionPoints.duringProcess || { yes: false, no: false },
          afterManufacture: rawDetectionPoints.afterManufacture || { yes: false, no: false },
          priorDespatch: rawDetectionPoints.priorDespatch || { yes: false, no: false }
        };

        const d3Data = {
          detectionPoints: normalizedDetectionPoints,
          nonDetectionReasons: normalizedNonDetectionReasons,
          suspectMaterialDisposal: report.d3SuspectMaterialDisposal || '',
          conformanceMaterialGuarantee: report.d3ConformanceGuarantee || '',
          requiresRework: report.d3RequiresRework !== null ? report.d3RequiresRework : null,
          reworkUnitCost: report.d3ReworkUnitCost || 0,
          realImpactCost: report.d3RealImpactCost || 0
        };

        return {
          id: report.id,
          reportId: report.reportId || report.report_id || report.id,
          title: report.title,
          description: report.description || '',
          supplierName: report.supplierName || report.supplier_name || 'N/A',
          supplierAccount: report.supplierAccount || report.supplier_account || '',
          partNumber: report.partNumber || report.part_number || 'N/A',
          partName: report.partName || report.part_name || 'N/A',
          severity: report.severity || 'Medium',
          status: report.status || 'in_progress',
          currentStep: report.currentStep || report.current_step || 'escalation',
          createdAt: report.createdAt || report.created_at || new Date().toISOString(),
          lastModified: report.updatedAt || report.updated_at || new Date().toISOString(),
          createdBy: report.createdBy || report.created_by,  //  IMPORTANTE: ID del usuario que creó el reporte

          // Approval status fields for D1-D2-D3 sequential approval
          d1D2D3ApprovalStatus: report.d1D2D3ApprovalStatus || report.d1_d2_d3_approval_status || 'draft',
          currentApprovalStep: report.currentApprovalStep || report.current_approval_step || 0,
          approval_1Status: report.approval_1Status || report.approval_1_status,
          approval_1By: report.approval_1By || report.approval_1_by,
          approval_1At: report.approval_1At || report.approval_1_at,
          approval_1Comments: report.approval_1Comments || report.approval_1_comments,
          approval_2Status: report.approval_2Status || report.approval_2_status,
          approval_2By: report.approval_2By || report.approval_2_by,
          approval_2At: report.approval_2At || report.approval_2_at,
          approval_2Comments: report.approval_2Comments || report.approval_2_comments,
          approval_3Status: report.approval_3Status || report.approval_3_status,
          approval_3By: report.approval_3By || report.approval_3_by,
          approval_3At: report.approval_3At || report.approval_3_at,
          approval_3Comments: report.approval_3Comments || report.approval_3_comments,

          // Issue information
          issueDate: report.issueDate || report.issue_date || null,
          problemType: report.problemType || report.problem_type || null,
          tipoIssue: report.tipoIssue || report.tipo_issue || null,
          tipoResp: report.tipoResp || report.tipo_resp || null,
          timingOccurrence: report.timingOccurrence || report.timing_occurrence || null,
          customerImpact: report.customerImpact || report.customer_impact || null,

          // Cost and dates
          estimatedCost: parseFloat(report.estimatedCost || report.estimated_cost) || 0,
          targetCloseDate: report.targetClosureDate || report.target_closure_date || null,
          customer: report.supplierName || report.supplier_name || '',

          // Team assignment information with escalation hierarchy
          issue_assigned_to: report.issueAssignedTo || report.issue_assigned_to,
          countermeasure_assigned_to: report.countermeasureAssignedTo || report.countermeasure_assigned_to,
          confirmation_assigned_to: report.confirmationAssignedTo || report.confirmation_assigned_to,
          team_leader: report.teamLeader || report.team_leader,
          escalation_path: escalationPath,  // Para compatibilidad con TeamAssignmentTab
          escalationPath: escalationPath,   // Para 8DWorkflow blocking logic

          // Client, Project and Parts information
          selectedClient,
          selectedProject,
          selectedParts,

          // Photos and Documents
          photoNoGood,
          photoOK,
          attachedDocuments,

          // D3 Containment Data
          d3Data,

          // D4, D5, D6 Data
          ...eightDService.mapD456FromBackend(report),

          // D8 - Follow-up Actions and Closure
          d8FollowupActions: report.d8FollowupActions || [],
          d8EvidenceDocumentation: report.d8EvidenceDocumentation || [],
          d8ClosureNotes: report.d8ClosureNotes || '',
          d8LessonsLearned: report.d8LessonsLearned || '',
          d8ClosedBy: report.d8ClosedBy || null,
          d8ClosedAt: report.d8ClosedAt || null,
          d8Completed: report.d8Completed || false,
          d8CompletedAt: report.d8CompletedAt || null,

          // D8 Approval Fields
          d8Status: report.d8Status || 'draft',
          d8CurrentApprovalStep: report.d8CurrentApprovalStep || 0,
          d8Approval1Status: report.d8Approval1Status || null,
          d8Approval1By: report.d8Approval1By || null,
          d8Approval1At: report.d8Approval1At || null,
          d8Approval1Comments: report.d8Approval1Comments || null,
          d8Approval2Status: report.d8Approval2Status || null,
          d8Approval2By: report.d8Approval2By || null,
          d8Approval2At: report.d8Approval2At || null,
          d8Approval2Comments: report.d8Approval2Comments || null,
          d8Approval3Status: report.d8Approval3Status || null,
          d8Approval3By: report.d8Approval3By || null,
          d8Approval3At: report.d8Approval3At || null,
          d8Approval3Comments: report.d8Approval3Comments || null,

          // Responsible department
          departmentId: report.departmentId || null,

          // Additional fields for workflow
          escalationComplete: true, // If report exists in DB, team assignment is complete
          problemAnalysisComplete: report.currentStep && report.currentStep !== 'escalation',
          actionsValidationComplete: report.status === 'closed'
        };
      }

      return null;
    } catch (error) {
      console.error(' Error fetching 8D report by ID:', error);
      return null;
    }
  },

  // Helper function to map backend status to current step
  mapStatusToCurrentStep: (status) => {
    if (!status) return 'escalation';

    if (status.includes('D1')) return 'escalation';
    if (status.includes('D2')) return 'create8d';
    if (status.includes('D3') || status.includes('D4')) return 'analysis';
    if (status.includes('D5') || status.includes('D6') || status.includes('D7') || status.includes('D8')) return 'analysis';

    return 'escalation';
  },

  // Helper function to map backend status to frontend status
  mapBackendStatusToFrontend: (backendStatus) => {
    if (!backendStatus) return 'pending';

    if (backendStatus.includes('D8') || backendStatus.includes('Closed')) {
      return 'completed';
    } else if (backendStatus.includes('D1') || backendStatus.includes('Team Formation')) {
      return 'pending';
    } else {
      return 'in_progress';
    }
  },

  // Get open reports detail
  getOpenReports: async () => {
    try {
      // Try to get real data from API first
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/8d/dashboard-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && result.data && result.data.recent8Ds) {
        // Map the recent8Ds to the expected format
        // Helper to convert currentStep string to progress number
        const stepToProgress = (step) => {
          const steps = {
            'escalation': 12.5,
            'team_assignment': 25,
            'problem_description': 37.5,
            'containment': 50,
            'root_cause': 62.5,
            'corrective_actions': 75,
            'preventive_actions': 87.5,
            'closure': 100
          };
          return steps[step] || 12.5;
        };

        return result.data.recent8Ds.filter(report => report.status !== 'closed').map(report => ({
          id: report.id,
          report_id: report.reportId || report.id,
          title: report.title,
          customer: report.supplierName || 'N/A',
          severity: report.severity,
          status: report.status,
          progress: stepToProgress(report.currentStep),
          days_open: Math.floor((new Date() - new Date(report.issueDate)) / (1000 * 60 * 60 * 24)),
          estimated_cost: parseFloat(report.estimatedCost) || 0,
          delay_reason: '-',
          is_overdue: report.targetClosureDate ? new Date(report.targetClosureDate) < new Date() : false,
          issue_assignee: '-',
          countermeasure_assignee: '-',
          confirmation_assignee: '-'
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching open reports:', error);
      return eightDService.getMockOpenReports();
    }
  },

  // Get reports assigned to current user
  getMyAssignedReports: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/8d/reports/my-assigned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.reports) {
        return result.reports;
      }
      return [];
    } catch (error) {
      console.error('Error fetching my assigned reports:', error);
      return [];
    }
  },

  // Mock data fallback functions
  getMockMetrics: () => ({
    total_reports: 18,
    open_reports: 12,
    closed_reports: 6,
    overdue_reports: 8,
    total_estimated_cost: 383100,
    total_actual_cost: 285000,
    avg_progress: 65.5,
    high_severity: 6,
    medium_severity: 6,
    low_severity: 6
  }),

  getMockReports: () => ({
    reports: [
      {
        id: 1,
        report_id: '8D-2024-0001',
        title: 'Brake Pad Quality Issue',
        severity: 'High',
        status: 'in_progress',
        current_step: 'analysis',
        progress_percentage: 75,
        supplier_name: 'ABC Brake Components',
        created_at: '2024-01-15T10:00:00Z'
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      pages: 1
    }
  }),

  // Create new 8D report
  createEightdReport: async (reportData) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/8d/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
            return result.report;
      }

      throw new Error(result.message || 'Failed to create 8D report');
    } catch (error) {
      console.error(' Error creating 8D report:', error);
      throw error;
    }
  },

  // Map escalation form data to backend report format
  mapEscalationToReport: (escalationData) => {
    // Helper function to get primary user ID from assigned users array
    const getPrimaryUserId = (assignedUsers) => {
      return assignedUsers && assignedUsers.length > 0 ? assignedUsers[0].id : null;
    };

    return {
      title: escalationData.title,
      description: escalationData.description || escalationData.issueSection?.description || '',
      supplier_name: escalationData.supplierName,
      supplier_account: escalationData.supplierAccount,
      part_number: escalationData.partNumber,
      part_name: escalationData.partName,
      problem_type: escalationData.problemType || 'Nuevo',
      severity: escalationData.severidad,
      tipo_issue: escalationData.tipoIssue,
      tipo_resp: escalationData.tipoResp,
      timing_occurrence: escalationData.timingOccurrence,
      estimated_cost: 0, // Will be calculated later
      issue_date: escalationData.fechaEmission,
      target_closure_date: null, // Will be calculated based on severity

      // Multi-user support: use primary user for backward compatibility
      issue_assigned_to: getPrimaryUserId(escalationData.issueSection?.assignedUsers) ||
                         escalationData.issueSection?.preAnalisis?.id ||
                         escalationData.issueSection?.aprobacion?.id,
      countermeasure_assigned_to: getPrimaryUserId(escalationData.countermeasureSection?.assignedUsers) ||
                                  escalationData.countermeasureSection?.responsable?.id ||
                                  escalationData.countermeasureSection?.analisis?.id,
      confirmation_assigned_to: getPrimaryUserId(escalationData.confirmationSection?.assignedUsers) ||
                                escalationData.confirmationSection?.confirmacionIssue?.id ||
                                escalationData.confirmationSection?.aprobacion?.id,

      // Team leader assignment (from the current user or first issue user)
      team_leader: escalationData.issueSection?.emisor?.id || getPrimaryUserId(escalationData.issueSection?.assignedUsers),

      customer_impact: eightDService.calculateCustomerImpact(escalationData.severidad, escalationData.tipoIssue),

      // Responsible department
      department_id: escalationData.department_id || null
    };
  },

  // Helper function to calculate customer impact
  calculateCustomerImpact: (severity, issueType) => {
    const severityWeight = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1
    };

    const typeWeight = {
      'Supplier': 1.2,
      'Interno': 1.0,
      'Externo': 1.1
    };

    const impact = (severityWeight[severity] || 2) * (typeWeight[issueType] || 1.0);

    if (impact >= 4) return 'Critical';
    if (impact >= 3) return 'High';
    if (impact >= 2) return 'Medium';
    return 'Low';
  },

  // Update existing 8D report (including D3 data)
  updateEightdReport: async (reportId, updateData) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/8d/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
            return result.report;
      }

      throw new Error(result.message || 'Failed to update 8D report');
    } catch (error) {
      console.error(' Error updating 8D report:', error);
      throw error;
    }
  },

  // Upload attachment (photo or document) for an 8D report
  uploadAttachment: async (reportId, file, attachmentType, description = '') => {
    try {
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('attachmentType', attachmentType);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`${API_BASE_URL}/8d/reports/${reportId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
            return result.attachment;
      }

      throw new Error(result.message || 'Failed to upload file');
    } catch (error) {
      console.error(' Error uploading file:', error);
      throw error;
    }
  },

  // Get all attachments for an 8D report
  getAttachments: async (reportId, type = null) => {
    try {
      const token = localStorage.getItem('token');

      const url = type
        ? `${API_BASE_URL}/8d/reports/${reportId}/attachments?type=${type}`
        : `${API_BASE_URL}/8d/reports/${reportId}/attachments`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
            return result.attachments;
      }

      return [];
    } catch (error) {
      console.error(' Error fetching attachments:', error);
      return [];
    }
  },

  // Update parts only (for draft saves or when parts change)
  updatePartsOnly: async (reportId, selectedClient, selectedProject, selectedParts) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/8d/reports/${reportId}/update-parts`, {
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log(' Parts updated successfully');
        return result;
      }

      throw new Error(result.message || 'Failed to update parts');
    } catch (error) {
      console.error(' Error updating parts:', error);
      throw error;
    }
  },

  // Delete an attachment
  deleteAttachment: async (reportId, attachmentId) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/8d/reports/${reportId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
            return true;
      }

      return false;
    } catch (error) {
      console.error(' Error deleting attachment:', error);
      return false;
    }
  },

  // ============================================================================
  // D3-MFG, D4, D5, D6 DATA MAPPING FUNCTIONS
  // ============================================================================

  // Map D3-MFG frontend data to backend format (snake_case)
  mapD3MfgToBackend: (formData) => {
    const backendData = {};

    // D3-MFG - Immediate Containment Actions (Manufacturing)
    if (formData.d3MfgTemporaryControls !== undefined) {
      backendData.d3_mfg_temporary_controls = formData.d3MfgTemporaryControls;
    }
    if (formData.d3MfgInspectionPoints !== undefined) {
      backendData.d3_mfg_inspection_points = formData.d3MfgInspectionPoints;
    }
    if (formData.d3MfgParametersAdjusted !== undefined) {
      backendData.d3_mfg_parameters_adjusted = formData.d3MfgParametersAdjusted;
    }
    if (formData.d3MfgPokaYokeDevices !== undefined) {
      backendData.d3_mfg_poka_yoke_devices = formData.d3MfgPokaYokeDevices;
    }
    if (formData.d3MfgLineModifications !== undefined) {
      backendData.d3_mfg_line_modifications = formData.d3MfgLineModifications;
    }
    if (formData.d3MfgOperatorTraining !== undefined) {
      backendData.d3_mfg_operator_training = formData.d3MfgOperatorTraining;
    }
    if (formData.d3MfgEffectivenessValidation !== undefined) {
      backendData.d3_mfg_effectiveness_validation = formData.d3MfgEffectivenessValidation;
    }
    if (formData.d3MfgOthers !== undefined) {
      backendData.d3_mfg_others = formData.d3MfgOthers;
    }
    if (formData.d3MfgResponsibleUserIds !== undefined) {
      backendData.d3_mfg_responsible_user_ids = formData.d3MfgResponsibleUserIds;
    }
    if (formData.d3MfgImplementationDate !== undefined) {
      backendData.d3_mfg_implementation_date = formData.d3MfgImplementationDate;
    }
    if (formData.d3MfgCompleted !== undefined) {
      backendData.d3_mfg_completed = formData.d3MfgCompleted;
    }
    // NOTE: d3MfgStatus and d3MfgCurrentApprovalStep should NOT be sent during normal save
    // They are managed exclusively by approval endpoints (send to approval, approve, reject)

    return backendData;
  },

  // Map D4-D5-D6 frontend data to backend format (snake_case)
  mapD456ToBackend: (formData) => {
    const backendData = {};

    // D4 - Root Cause Analysis
    if (formData.d4Data) {
      backendData.d4_five_whys_analysis = formData.d4Data.fiveWhys;
      backendData.d4_fishbone_analysis = formData.d4Data.fishboneData;
      backendData.d4_verification_method = formData.d4Data.verificationMethod;
      backendData.d4_verification_evidence = formData.d4Data.verificationEvidence;
      backendData.d4_completed = formData.d4Data.completed || false;
      if (formData.d4Data.completed) {
        backendData.d4_completed_at = new Date().toISOString();
      }
    }

    // D5 - Corrective Actions (with linked 5 Whys)
    if (formData.d5CorrectiveActions) {
      backendData.d5_corrective_actions = formData.d5CorrectiveActions;
      backendData.d5_completed = formData.d5Completed || false;
      // Don't send d5_status or d5_current_approval_step here - handled by approval endpoints only
    }

    // D6 - Definitive Actions (Plan de Implementación)
    if (formData.d6DefinitiveActions !== undefined) {
      backendData.d6_definitive_actions = formData.d6DefinitiveActions;
    }
    if (formData.d6CountermeasureDescription !== undefined) {
      backendData.d6_countermeasure_description = formData.d6CountermeasureDescription;
    }
    if (formData.d6Completed !== undefined) {
      backendData.d6_completed = formData.d6Completed;
      if (formData.d6Completed) {
        backendData.d6_completed_at = new Date().toISOString();
      }
    }
    // NOTE: d6_status and d6_current_approval_step should NOT be sent during normal save
    // They are managed exclusively by approval endpoints

    // D6 - Validación de Contramedidas (movido desde D7)
    if (formData.d3Implemented !== undefined) {
      backendData.d3_implemented = formData.d3Implemented;
    }
    if (formData.d3Effective !== undefined) {
      backendData.d3_effective = formData.d3Effective;
    }
    if (formData.d3SpcJudgment !== undefined) {
      backendData.d3_spc_judgment = formData.d3SpcJudgment;
    }
    if (formData.d3ClientJudgment !== undefined) {
      backendData.d3_client_judgment = formData.d3ClientJudgment;
    }
    if (formData.d3Comments !== undefined) {
      backendData.d3_comments = formData.d3Comments;
    }
    if (formData.d5Implemented !== undefined) {
      backendData.d5_implemented = formData.d5Implemented;
    }
    if (formData.d5Effective !== undefined) {
      backendData.d5_effective = formData.d5Effective;
    }
    if (formData.d5SpcJudgment !== undefined) {
      backendData.d5_spc_judgment = formData.d5SpcJudgment;
    }
    if (formData.d5ClientJudgment !== undefined) {
      backendData.d5_client_judgment = formData.d5ClientJudgment;
    }
    if (formData.d5Comments !== undefined) {
      backendData.d5_comments = formData.d5Comments;
    }

    // D7 - Prevention / Confirmation
    if (formData.d7TemporaryValidation !== undefined) {
      backendData.d7_temporary_validation = formData.d7TemporaryValidation;
    }
    if (formData.d7DefinitiveValidation !== undefined) {
      backendData.d7_definitive_validation = formData.d7DefinitiveValidation;
    }
    if (formData.d7ValidationEvidence !== undefined) {
      backendData.d7_validation_evidence = formData.d7ValidationEvidence;
    }
    if (formData.d7IsEffective !== undefined) {
      backendData.d7_is_effective = formData.d7IsEffective;
    }
    if (formData.d7ValidationDate !== undefined) {
      backendData.d7_validation_date = formData.d7ValidationDate;
    }
    if (formData.d7Completed !== undefined) {
      backendData.d7_completed = formData.d7Completed;
      if (formData.d7Completed) {
        backendData.d7_completed_at = new Date().toISOString();
      }
    }

    return backendData;
  },

  // Map D4-D5-D6 backend data to frontend format (camelCase)
  mapD456FromBackend: (report) => {
    const frontendData = {};

    // D3-MFG - Immediate Actions (Manufacturing)
    // Backend already transforms to camelCase, use camelCase field names
    frontendData.d3MfgTemporaryControls = Array.isArray(report.d3MfgTemporaryControls) ? report.d3MfgTemporaryControls : [];
    frontendData.d3MfgInspectionPoints = Array.isArray(report.d3MfgInspectionPoints) ? report.d3MfgInspectionPoints : [];
    frontendData.d3MfgParametersAdjusted = Array.isArray(report.d3MfgParametersAdjusted) ? report.d3MfgParametersAdjusted : [];
    frontendData.d3MfgPokaYokeDevices = Array.isArray(report.d3MfgPokaYokeDevices) ? report.d3MfgPokaYokeDevices : [];
    frontendData.d3MfgLineModifications = Array.isArray(report.d3MfgLineModifications) ? report.d3MfgLineModifications : [];
    frontendData.d3MfgOperatorTraining = Array.isArray(report.d3MfgOperatorTraining) ? report.d3MfgOperatorTraining : [];
    frontendData.d3MfgEffectivenessValidation = Array.isArray(report.d3MfgEffectivenessValidation) ? report.d3MfgEffectivenessValidation : [];
    frontendData.d3MfgOthers = Array.isArray(report.d3MfgOthers) ? report.d3MfgOthers : [];
    // Read from JSONB array field (d3MfgResponsibleUserIds)
    frontendData.d3MfgResponsibleUserIds = Array.isArray(report.d3MfgResponsibleUserIds)
                                            ? report.d3MfgResponsibleUserIds
                                            : [];
    // Convert date to YYYY-MM-DD format for date input
    if (report.d3MfgImplementationDate) {
      const date = new Date(report.d3MfgImplementationDate);
      frontendData.d3MfgImplementationDate = date.toISOString().split('T')[0];
    } else {
      frontendData.d3MfgImplementationDate = null;
    }
    frontendData.d3MfgCompleted = report.d3MfgCompleted || false;
    frontendData.d3MfgStatus = report.d3MfgStatus || 'draft';
    frontendData.d3MfgCurrentApprovalStep = report.d3MfgCurrentApprovalStep || 0;

    // D3-MFG Approval Step 1
    frontendData.d3MfgApproval1Status = report.d3MfgApproval1Status || report.d3_mfg_approval_1_status || null;
    frontendData.d3MfgApproval1By = report.d3MfgApproval1By || report.d3_mfg_approval_1_by || null;
    frontendData.d3MfgApproval1At = report.d3MfgApproval1At || report.d3_mfg_approval_1_at || null;
    frontendData.d3MfgApproval1Comments = report.d3MfgApproval1Comments || report.d3_mfg_approval_1_comments || null;

    // D3-MFG Approval Step 2
    frontendData.d3MfgApproval2Status = report.d3MfgApproval2Status || report.d3_mfg_approval_2_status || null;
    frontendData.d3MfgApproval2By = report.d3MfgApproval2By || report.d3_mfg_approval_2_by || null;
    frontendData.d3MfgApproval2At = report.d3MfgApproval2At || report.d3_mfg_approval_2_at || null;
    frontendData.d3MfgApproval2Comments = report.d3MfgApproval2Comments || report.d3_mfg_approval_2_comments || null;

    // D3-MFG Approval Step 3
    frontendData.d3MfgApproval3Status = report.d3MfgApproval3Status || report.d3_mfg_approval_3_status || null;
    frontendData.d3MfgApproval3By = report.d3MfgApproval3By || report.d3_mfg_approval_3_by || null;
    frontendData.d3MfgApproval3At = report.d3MfgApproval3At || report.d3_mfg_approval_3_at || null;
    frontendData.d3MfgApproval3Comments = report.d3MfgApproval3Comments || report.d3_mfg_approval_3_comments || null;

    // D4 - Root Cause Analysis
    frontendData.d4Data = {
      fiveWhys: report.d4FiveWhysAnalysis || {
        problemStatement: '',
        why1: { question: 'Why did this problem occur?', answer: '' },
        why2: { question: 'Why?', answer: '' },
        why3: { question: 'Why?', answer: '' },
        why4: { question: 'Why?', answer: '' },
        why5: { question: 'Why?', answer: '' },
        rootCause: ''
      },
      fishboneData: report.d4FishboneAnalysis || {
        problemStatement: '',
        categories: {
          man: [],
          machine: [],
          method: [],
          material: [],
          measurement: [],
          environment: []
        },
        identifiedRootCause: ''
      },
      verificationMethod: report.d4VerificationMethod || '',
      verificationEvidence: report.d4VerificationEvidence || '',
      completed: report.d4Completed || false
    };

    // D4 Approval fields
    frontendData.d4Status = report.d4Status || report.d4_status || 'draft';
    frontendData.d4CurrentApprovalStep = report.d4CurrentApprovalStep || report.d4_current_approval_step || 0;

    // D4 Approval Step 1
    frontendData.d4Approval1Status = report.d4Approval1Status || report.d4_approval_1_status || null;
    frontendData.d4Approval1By = report.d4Approval1By || report.d4_approval_1_by || null;
    frontendData.d4Approval1At = report.d4Approval1At || report.d4_approval_1_at || null;
    frontendData.d4Approval1Comments = report.d4Approval1Comments || report.d4_approval_1_comments || null;

    // D4 Approval Step 2
    frontendData.d4Approval2Status = report.d4Approval2Status || report.d4_approval_2_status || null;
    frontendData.d4Approval2By = report.d4Approval2By || report.d4_approval_2_by || null;
    frontendData.d4Approval2At = report.d4Approval2At || report.d4_approval_2_at || null;
    frontendData.d4Approval2Comments = report.d4Approval2Comments || report.d4_approval_2_comments || null;

    // D4 Approval Step 3
    frontendData.d4Approval3Status = report.d4Approval3Status || report.d4_approval_3_status || null;
    frontendData.d4Approval3By = report.d4Approval3By || report.d4_approval_3_by || null;
    frontendData.d4Approval3At = report.d4Approval3At || report.d4_approval_3_at || null;
    frontendData.d4Approval3Comments = report.d4Approval3Comments || report.d4_approval_3_comments || null;

    // D4 - 4M Analysis & 5 Whys (new structure)
    // Note: Backend converts d4_4m_evaluation to d44mEvaluation (removes underscore before number)
    frontendData.d4_4mEvaluation = Array.isArray(report.d44mEvaluation)
      ? report.d44mEvaluation
      : (Array.isArray(report.d4_4m_evaluation) ? report.d4_4m_evaluation : []);

    // Note: Backend converts d4_5whys_analysis to d45whysAnalysis (removes underscore before number)
    frontendData.d4_5whysAnalysis = Array.isArray(report.d45whysAnalysis)
      ? report.d45whysAnalysis
      : (Array.isArray(report.d4_5whys_analysis) ? report.d4_5whys_analysis : []);
    frontendData.d4RootCause = report.d4RootCause || report.d4_root_cause || '';
    frontendData.d4Completed = report.d4Completed || report.d4_completed || false;
    frontendData.d4DelayHistory = Array.isArray(report.d4DelayHistory) ? report.d4DelayHistory : (Array.isArray(report.d4_delay_history) ? report.d4_delay_history : []);

    // D5 - Corrective Actions (with approval status)
    frontendData.d5CorrectiveActions = Array.isArray(report.d5CorrectiveActions)
      ? report.d5CorrectiveActions
      : (Array.isArray(report.d5_corrective_actions) ? report.d5_corrective_actions : []);
    frontendData.d5Completed = report.d5Completed || report.d5_completed || false;
    frontendData.d5Status = report.d5Status || report.d5_status || 'draft';
    frontendData.d5CurrentApprovalStep = report.d5CurrentApprovalStep || report.d5_current_approval_step || 0;

    // D5 Approval Step 1
    frontendData.d5Approval1Status = report.d5Approval1Status || report.d5_approval_1_status || null;
    frontendData.d5Approval1By = report.d5Approval1By || report.d5_approval_1_by || null;
    frontendData.d5Approval1At = report.d5Approval1At || report.d5_approval_1_at || null;
    frontendData.d5Approval1Comments = report.d5Approval1Comments || report.d5_approval_1_comments || null;

    // D5 Approval Step 2
    frontendData.d5Approval2Status = report.d5Approval2Status || report.d5_approval_2_status || null;
    frontendData.d5Approval2By = report.d5Approval2By || report.d5_approval_2_by || null;
    frontendData.d5Approval2At = report.d5Approval2At || report.d5_approval_2_at || null;
    frontendData.d5Approval2Comments = report.d5Approval2Comments || report.d5_approval_2_comments || null;

    // D5 Approval Step 3
    frontendData.d5Approval3Status = report.d5Approval3Status || report.d5_approval_3_status || null;
    frontendData.d5Approval3By = report.d5Approval3By || report.d5_approval_3_by || null;
    frontendData.d5Approval3At = report.d5Approval3At || report.d5_approval_3_at || null;
    frontendData.d5Approval3Comments = report.d5Approval3Comments || report.d5_approval_3_comments || null;

    // D6 - Implementation & Validation
    const validationResults = report.d6ValidationResults || {};
    frontendData.d6Data = {
      implementedActions: validationResults.actions || report.d6ImplementationPlan || [],
      qualityApproval: {
        status: report.d6QualityApprovalStatus || 'pending',
        approvedBy: report.d6QualityApprovedBy || null,
        approvedAt: report.d6QualityApprovedAt || null,
        comments: report.d6QualityApprovalComments || ''
      },
      completed: report.d6Completed || false
    };

    // D6 - Definitive Actions (Plan de Implementación)
    frontendData.d6DefinitiveActions = Array.isArray(report.d6DefinitiveActions)
      ? report.d6DefinitiveActions
      : (Array.isArray(report.d6_definitive_actions) ? report.d6_definitive_actions : []);

    // D6 - Additional fields
    frontendData.d6CountermeasureDescription = report.d6CountermeasureDescription || report.d6_countermeasure_description || '';
    frontendData.d6Completed = report.d6Completed || report.d6_completed || false;

    // D6 Approval Fields
    frontendData.d6Status = report.d6Status || report.d6_status || 'draft';
    frontendData.d6CurrentApprovalStep = report.d6CurrentApprovalStep || report.d6_current_approval_step || 0;

    // D6 Approval Step 1
    frontendData.d6Approval1Status = report.d6Approval1Status || report.d6_approval_1_status || null;
    frontendData.d6Approval1By = report.d6Approval1By || report.d6_approval_1_by || null;
    frontendData.d6Approval1At = report.d6Approval1At || report.d6_approval_1_at || null;
    frontendData.d6Approval1Comments = report.d6Approval1Comments || report.d6_approval_1_comments || null;

    // D6 Approval Step 2
    frontendData.d6Approval2Status = report.d6Approval2Status || report.d6_approval_2_status || null;
    frontendData.d6Approval2By = report.d6Approval2By || report.d6_approval_2_by || null;
    frontendData.d6Approval2At = report.d6Approval2At || report.d6_approval_2_at || null;
    frontendData.d6Approval2Comments = report.d6Approval2Comments || report.d6_approval_2_comments || null;

    // D6 Approval Step 3
    frontendData.d6Approval3Status = report.d6Approval3Status || report.d6_approval_3_status || null;
    frontendData.d6Approval3By = report.d6Approval3By || report.d6_approval_3_by || null;
    frontendData.d6Approval3At = report.d6Approval3At || report.d6_approval_3_at || null;
    frontendData.d6Approval3Comments = report.d6Approval3Comments || report.d6_approval_3_comments || null;

    // D6 - Validación de Contramedidas (tabla en D7)
    frontendData.d3Implemented = report.d3Implemented ?? report.d3_implemented ?? null;
    frontendData.d3Effective = report.d3Effective ?? report.d3_effective ?? null;
    frontendData.d3SpcJudgment = report.d3SpcJudgment || report.d3_spc_judgment || '';
    frontendData.d3ClientJudgment = report.d3ClientJudgment || report.d3_client_judgment || '';
    frontendData.d3Comments = report.d3Comments || report.d3_comments || '';
    frontendData.d5Implemented = report.d5Implemented ?? report.d5_implemented ?? null;
    frontendData.d5Effective = report.d5Effective ?? report.d5_effective ?? null;
    frontendData.d5SpcJudgment = report.d5SpcJudgment || report.d5_spc_judgment || '';
    frontendData.d5ClientJudgment = report.d5ClientJudgment || report.d5_client_judgment || '';
    frontendData.d5Comments = report.d5Comments || report.d5_comments || '';

    // D7 - Prevention fields
    frontendData.d7PreventiveActions = Array.isArray(report.d7PreventiveActions)
      ? report.d7PreventiveActions
      : (Array.isArray(report.d7_preventive_actions) ? report.d7_preventive_actions : []);
    frontendData.d7Completed = report.d7Completed || report.d7_completed || false;

    // D7 Approval Fields
    frontendData.d7Status = report.d7Status || report.d7_status || 'draft';
    frontendData.d7CurrentApprovalStep = report.d7CurrentApprovalStep || report.d7_current_approval_step || 0;

    // D7 Approval Step 1
    frontendData.d7Approval1Status = report.d7Approval1Status || report.d7_approval_1_status || null;
    frontendData.d7Approval1By = report.d7Approval1By || report.d7_approval_1_by || null;
    frontendData.d7Approval1At = report.d7Approval1At || report.d7_approval_1_at || null;
    frontendData.d7Approval1Comments = report.d7Approval1Comments || report.d7_approval_1_comments || null;

    // D7 Approval Step 2
    frontendData.d7Approval2Status = report.d7Approval2Status || report.d7_approval_2_status || null;
    frontendData.d7Approval2By = report.d7Approval2By || report.d7_approval_2_by || null;
    frontendData.d7Approval2At = report.d7Approval2At || report.d7_approval_2_at || null;
    frontendData.d7Approval2Comments = report.d7Approval2Comments || report.d7_approval_2_comments || null;

    // D7 Approval Step 3
    frontendData.d7Approval3Status = report.d7Approval3Status || report.d7_approval_3_status || null;
    frontendData.d7Approval3By = report.d7Approval3By || report.d7_approval_3_by || null;
    frontendData.d7Approval3At = report.d7Approval3At || report.d7_approval_3_at || null;
    frontendData.d7Approval3Comments = report.d7Approval3Comments || report.d7_approval_3_comments || null;

    return frontendData;
  },

  getMockOpenReports: () => [
    {
      id: 1,
      report_id: '8D-2025-001',
      title: 'Engine Block Porosity Issue',
      customer: 'Ford Motor Company',
      severity: 'High',
      status: 'D4 - Root Cause Analysis',
      progress: 50,
      days_open: 19,
      estimated_cost: 25000,
      delay_reason: '-',
      is_overdue: false,
      issue_assignee: 'Quality Engineer',
      countermeasure_assignee: 'Manufacturing Tech',
      confirmation_assignee: '-'
    },
    {
      id: 2,
      report_id: '8D-2025-002',
      title: 'Paint Adhesion Failure',
      customer: 'GM',
      severity: 'Medium',
      status: 'D6 - Implementation',
      progress: 75,
      days_open: 35,
      estimated_cost: 8500,
      delay_reason: '-',
      is_overdue: true,
      issue_assignee: 'Quality Engineer',
      countermeasure_assignee: 'Manager',
      confirmation_assignee: 'Quality Engineer'
    },
    {
      id: 3,
      report_id: '8D-2025-004',
      title: 'Brake Pad Material Contamination',
      customer: 'Toyota Motor Manufacturing',
      severity: 'High',
      status: 'D3 - Interim Containment Action',
      progress: 37,
      days_open: 30,
      estimated_cost: 35000,
      delay_reason: 'Waiting for supplier data',
      is_overdue: false,
      issue_assignee: 'Quality Manager',
      countermeasure_assignee: 'Manufacturing Tech',
      confirmation_assignee: '-'
    },
    {
      id: 4,
      report_id: '8D-2025-005',
      title: 'Transmission Gear Noise',
      customer: 'Honda Manufacturing',
      severity: 'Medium',
      status: 'D5 - Corrective Actions',
      progress: 62,
      days_open: 25,
      estimated_cost: 18500,
      delay_reason: '-',
      is_overdue: false,
      issue_assignee: 'Quality Engineer',
      countermeasure_assignee: 'Manufacturing Tech',
      confirmation_assignee: '-'
    },
    {
      id: 5,
      report_id: '8D-2025-006',
      title: 'ECU Software Bug - Airbag System',
      customer: 'BMW Group',
      severity: 'High',
      status: 'D2 - Define Problem',
      progress: 25,
      days_open: 14,
      estimated_cost: 45000,
      delay_reason: 'Critical safety review',
      is_overdue: false,
      issue_assignee: 'Quality Director',
      countermeasure_assignee: 'Quality Engineer',
      confirmation_assignee: '-'
    },
    {
      id: 6,
      report_id: '8D-2025-007',
      title: 'Plastic Housing Crack Under Heat',
      customer: 'Volkswagen Group',
      severity: 'Low',
      status: 'D4 - Root Cause Analysis',
      progress: 50,
      days_open: 20,
      estimated_cost: 12000,
      delay_reason: '-',
      is_overdue: false,
      issue_assignee: 'Manufacturing Tech',
      countermeasure_assignee: 'Quality Engineer',
      confirmation_assignee: '-'
    },
    {
      id: 7,
      report_id: '8D-2025-008',
      title: 'Seat Belt Buckle Malfunction',
      customer: 'Nissan Motor Company',
      severity: 'High',
      status: 'D1 - Team Formation',
      progress: 12,
      days_open: 9,
      estimated_cost: 28000,
      delay_reason: 'Team assembly pending',
      is_overdue: false,
      issue_assignee: 'Quality Manager',
      countermeasure_assignee: '-',
      confirmation_assignee: '-'
    },
    {
      id: 8,
      report_id: '8D-2025-009',
      title: 'Dashboard Display Flickering',
      customer: 'Audi AG',
      severity: 'Medium',
      status: 'D3 - Interim Containment Action',
      progress: 37,
      days_open: 11,
      estimated_cost: 15500,
      delay_reason: '-',
      is_overdue: false,
      issue_assignee: 'Quality Engineer',
      countermeasure_assignee: 'Manufacturing Tech',
      confirmation_assignee: '-'
    },
    {
      id: 9,
      report_id: '8D-2025-010',
      title: 'Fuel Injector Clogging',
      customer: 'Hyundai Motor Group',
      severity: 'Medium',
      status: 'D5 - Corrective Actions',
      progress: 62,
      days_open: 22,
      estimated_cost: 22000,
      delay_reason: '-',
      is_overdue: false,
      issue_assignee: 'Quality Engineer',
      countermeasure_assignee: 'Quality Manager',
      confirmation_assignee: '-'
    },
    {
      id: 10,
      report_id: '8D-2025-011',
      title: 'Door Handle Spring Tension Issue',
      customer: 'Kia Corporation',
      severity: 'Low',
      status: 'D6 - Implementation',
      progress: 75,
      days_open: 28,
      estimated_cost: 9500,
      delay_reason: '-',
      is_overdue: true,
      issue_assignee: 'Manufacturing Tech',
      countermeasure_assignee: 'Quality Engineer',
      confirmation_assignee: '-'
    },
    {
      id: 11,
      report_id: '8D-2025-012',
      title: 'Air Conditioning Compressor Noise',
      customer: 'Mazda Motor Corporation',
      severity: 'Medium',
      status: 'D4 - Root Cause Analysis',
      progress: 50,
      days_open: 16,
      estimated_cost: 16800,
      delay_reason: '-',
      is_overdue: false,
      issue_assignee: 'Quality Manager',
      countermeasure_assignee: 'Manufacturing Tech',
      confirmation_assignee: '-'
    },
    {
      id: 12,
      report_id: '8D-2025-013',
      title: 'Mirror Housing Vibration',
      customer: 'Subaru Corporation',
      severity: 'Low',
      status: 'D7 - Preventive Actions',
      progress: 87,
      days_open: 32,
      estimated_cost: 11200,
      delay_reason: '-',
      is_overdue: true,
      issue_assignee: 'Quality Engineer',
      countermeasure_assignee: 'Manufacturing Tech',
      confirmation_assignee: 'Quality Engineer'
    }
  ]
};

export default eightDService;