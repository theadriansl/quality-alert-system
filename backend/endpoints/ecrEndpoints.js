const { query, pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const { logECRAction, getECRAuditLog: fetchECRAuditLog } = require('../utils/ecrAuditLog');
const { socketEvents } = require('../config/socket');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// MULTER CONFIGURATION FOR ECR EVIDENCE
// ============================================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const ecrId = req.params.id;
    const uploadDir = path.join(__dirname, `../uploads/ecr/${ecrId}/evidence`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo imágenes y documentos.'));
    }
  }
});

// ============================================================================
// ECR ENDPOINTS
// ============================================================================

// Get all ECR reports
async function getAllECRReports(req, res) {
  try {
    console.log('🔄 Fetching all ECR reports...');

    const result = await query(`
      SELECT
        e.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        c.name as client_name
      FROM ecr_reports e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN clients c ON e.client_id = c.id
      ORDER BY e.created_at DESC
    `);

    const ecrs = result.rows.map(row => {
      // Preserve stageCompletionStatus before transform
      const stageCompletionStatus = row.stage_completion_status || {
        ecr1: { completed: false },
        ecr2: { completed: false },
        ecr2b: { completed: false },
        ecr3: { completed: false },
        ecr4: { completed: false }
      };

      const ecr = transformToCamelCase(row);

      // Restore stageCompletionStatus
      ecr.stageCompletionStatus = stageCompletionStatus;

      // Convert change_category (string) to changeCategories (array) for frontend
      if (ecr.changeCategory) {
        ecr.changeCategories = [ecr.changeCategory];
      } else {
        ecr.changeCategories = [];
      }
      // Convert level1_approver, level2_approver, level3_approver to approvers object
      ecr.approvers = {
        level1: ecr.level1Approver || null,
        level2: ecr.level2Approver || null,
        level3: ecr.level3Approver || null
      };
      return ecr;
    });

    res.json({
      success: true,
      ecrs,
      total: ecrs.length
    });
  } catch (error) {
    console.error('❌ Error fetching ECR reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ECR reports',
      error: error.message
    });
  }
}

// Get ECR report by ID
async function getECRById(req, res) {
  try {
    const { id } = req.params;
    console.log(`🔄 Fetching ECR report ID: ${id}`);

    const result = await query(`
      SELECT
        e.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        c.name as client_name
      FROM ecr_reports e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `ECR report with ID ${id} not found`
      });
    }

    // Preserve JSONB fields that should NOT have internal keys transformed
    // These contain user-defined keys (area IDs, subsection IDs) not DB column names
    const rawRow = result.rows[0];
    const preservedFields = {
      impactVerifications: rawRow.impact_verifications,
      impactAnalysis: rawRow.impact_analysis,
      validationEvidence: rawRow.validation_evidence,
      validationTeams: rawRow.validation_teams || {},
      reviewBoard: rawRow.review_board || { members: [], primary: null },
      closureSignatures: rawRow.closure_signatures,
      closureApprovalHistory: rawRow.closure_approval_history || [],
      closureApprovalStatus: rawRow.closure_approval_status || 'draft',
      closureType: rawRow.closure_type || null,
      rejectionSignatures: rawRow.rejection_signatures || {},
      ppapStatus: rawRow.ppap_status_detail,
      approvalHistory: rawRow.approval_history || [],
      rejectionReason: rawRow.rejection_reason || '',
      stageCompletionStatus: rawRow.stage_completion_status || {
        ecr1: { completed: false },
        ecr2: { completed: false },
        ecr2b: { completed: false },
        ecr3: { completed: false },
        ecr4: { completed: false }
      },
      financialImpact: rawRow.financial_impact || {
        items: [],
        totalCost: 0,
        totalSavings: 0,
        netImpact: 0
      },
      // ECR-2 Parts selection fields - preserve as-is
      selectedParts: rawRow.selected_parts || [],
      selectedProjects: rawRow.selected_projects || [],
      // Date fields - ensure correct format for HTML date input (YYYY-MM-DD)
      plannedAdoptionDate: rawRow.planned_adoption_date
        ? (typeof rawRow.planned_adoption_date === 'string'
            ? rawRow.planned_adoption_date.split('T')[0]
            : new Date(rawRow.planned_adoption_date).toISOString().split('T')[0])
        : ''
    };

    const ecr = transformToCamelCase(rawRow);

    // Restore preserved JSONB fields (override the transformed ones)
    Object.assign(ecr, preservedFields);

    // Build selectedClient object for frontend (ECR-2 needs {id, name} not just clientId)
    if (rawRow.client_id) {
      ecr.selectedClient = {
        id: rawRow.client_id,
        name: rawRow.client_name || ''
      };
    }

    // Convert change_category (string) to changeCategories (array) for frontend
    if (ecr.changeCategory) {
      ecr.changeCategories = [ecr.changeCategory];
    } else {
      ecr.changeCategories = [];
    }

    // Convert level1_approver, level2_approver, level3_approver to approvers object
    ecr.approvers = {
      level1: ecr.level1Approver || null,
      level2: ecr.level2Approver || null,
      level3: ecr.level3Approver || null
    };

    // Load closureAuditItems from separate table
    const auditItemsResult = await query(`
      SELECT * FROM ecr_closure_audit_items
      WHERE ecr_id = $1
      ORDER BY display_order, id
    `, [id]);

    // Get files for all audit items
    const itemIds = auditItemsResult.rows.map(i => i.id);
    let auditFiles = [];
    if (itemIds.length > 0) {
      const filesResult = await query(`
        SELECT * FROM ecr_closure_audit_item_files
        WHERE ecr_closure_audit_item_id = ANY($1)
        ORDER BY uploaded_at DESC
      `, [itemIds]);
      auditFiles = filesResult.rows;
    }

    // Map files to items
    ecr.closureAuditItems = auditItemsResult.rows.map(item => {
      const itemFiles = auditFiles
        .filter(f => f.ecr_closure_audit_item_id === item.id)
        .map(f => transformToCamelCase(f));
      return {
        ...transformToCamelCase(item),
        files: itemFiles
      };
    });

    res.json({
      success: true,
      ecr
    });
  } catch (error) {
    console.error(`❌ Error fetching ECR report ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ECR report',
      error: error.message
    });
  }
}

// Create new ECR report
async function createECRReport(req, res) {
  const client = await pool.connect();

  try {
    console.log('🔄 Creating new ECR report...');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    await client.query('BEGIN');

    const {
      changeTitle,
      changeDescription,
      changeAttachments = [],
      beforeConditionDescription,
      afterConditionDescription,
      changeCategories,
      changeType,
      priority,
      riskAssessment,
      impactAnalysis = [],
      customerImpact = {},
      selectedParts = [],
      affectedDocuments = [],
      beforePhotos = [],
      afterPhotos = [],
      reviewBoard = {},
      validationTeams = {},
      involvedAreas = [],
      validationAreas = [],
      clientId,
      selectedProjects = [], // Array of selected projects
      approvers = {},
      // Requestor Information
      requestorUserId,
      requestorName,
      requestorDepartment,
      requestorEmail,
      requestorPhone,
      requestorExtension,
      // Stage completion status
      stageCompletionStatus = {
        ecr1: { completed: false },
        ecr2: { completed: false },
        ecr2b: { completed: false },
        ecr3: { completed: false },
        ecr4: { completed: false }
      }
    } = req.body;

    // Validation
    if (!changeTitle) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Change title is required'
      });
    }

    // Get user ID from authenticated user
    const createdBy = req.user ? req.user.id : null;

    // Generate unique ECR number: ECR-YYYY-XXX
    const year = new Date().getFullYear();
    const countResult = await client.query(
      'SELECT COUNT(*) FROM ecr_reports WHERE EXTRACT(YEAR FROM created_at) = $1',
      [year]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const ecrNumber = `ECR-${year}-${String(count).padStart(3, '0')}`;

    // For backwards compatibility, use first project as project_id
    const firstProject = selectedProjects && selectedProjects.length > 0 ? selectedProjects[0] : null;
    const projectId = firstProject?.id || null;
    const projectNumber = firstProject?.projectNumber || null;
    const projectName = firstProject?.projectName || null;

    // Insert ECR report
    const insertQuery = `
      INSERT INTO ecr_reports (
        ecr_number,
        client_id,
        project_id,
        project_number,
        project_name,
        selected_projects,
        change_title,
        change_description,
        change_attachments,
        before_condition_description,
        after_condition_description,
        change_category,
        change_type,
        priority,
        risk_assessment,
        impact_analysis,
        customer_impact,
        selected_parts,
        affected_documents,
        before_photos,
        after_photos,
        review_board,
        validation_teams,
        involved_areas,
        validation_areas,
        level1_approver,
        level2_approver,
        level3_approver,
        requestor_user_id,
        requestor_name,
        requestor_department,
        requestor_email,
        requestor_phone,
        requestor_extension,
        created_by,
        status,
        current_stage,
        stage_completion_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, 'draft', 'change_request', $36
      ) RETURNING *
    `;

    const result = await client.query(insertQuery, [
      ecrNumber,
      clientId || null,
      projectId || null,
      projectNumber || null,
      projectName || null,
      JSON.stringify(selectedProjects || []),
      changeTitle,
      changeDescription || null,
      JSON.stringify(changeAttachments),
      beforeConditionDescription || null,
      afterConditionDescription || null,
      Array.isArray(changeCategories) ? (changeCategories[0] || null) : (changeCategories || null),
      changeType || null,
      priority || 'medium',
      riskAssessment ? JSON.stringify(riskAssessment) : null,
      JSON.stringify(impactAnalysis),
      JSON.stringify(customerImpact),
      JSON.stringify(selectedParts),
      JSON.stringify(affectedDocuments),
      JSON.stringify(beforePhotos),
      JSON.stringify(afterPhotos),
      JSON.stringify(reviewBoard),
      JSON.stringify(validationTeams),
      JSON.stringify(involvedAreas),
      JSON.stringify(validationAreas),
      approvers?.level1 || null,
      approvers?.level2 || null,
      approvers?.level3 || null,
      requestorUserId || null,
      requestorName || null,
      requestorDepartment || null,
      requestorEmail || null,
      requestorPhone || null,
      requestorExtension || null,
      createdBy,
      JSON.stringify(stageCompletionStatus)
    ]);

    await client.query('COMMIT');

    // Preserve stageCompletionStatus before transform
    const rawRow = result.rows[0];
    const preservedStageStatus = rawRow.stage_completion_status || stageCompletionStatus;

    const newECR = transformToCamelCase(rawRow);
    newECR.stageCompletionStatus = preservedStageStatus;

    console.log(`✅ ECR report created: ${ecrNumber} (ID: ${newECR.id})`);

    const creatorName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    logECRAction({ ecrId: newECR.id, actionType: 'created', actionCategory: 'report', userId: req.user?.id, userName: creatorName, description: `ECR creado: ${ecrNumber}` });

    // Emit WebSocket event
    socketEvents.ecrCreated({
      id: newECR.id,
      ecrNumber,
      title: changeTitle,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'ECR report created successfully',
      ecr: newECR
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating ECR report:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ECR report',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Update ECR report
async function updateECRReport(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    console.log(`🔄 Updating ECR report ID: ${id}`);

    await client.query('BEGIN');

    // Fetch current values for change detection
    const prevResult = await client.query(
      `SELECT change_title, change_description, change_type, priority, status,
              trial_plan, implementation_plan, closure_notes, lessons_learned,
              before_condition_description, after_condition_description,
              isir_first_article, initial_scrap, process_stability, cpk_post_change,
              released_revisions, dms_update, traceability_evidence, affected_parts,
              ppap_status, detected_risks, applied_improvements,
              requestor_name, requestor_department, requestor_email, requestor_phone,
              adoption_lot_number, rejection_reason, planned_adoption_date, effective_date,
              requires_closure_audit,
              selected_parts, affected_documents, review_board, validation_teams,
              involved_areas, validation_areas, impact_analysis, risk_assessment,
              financial_impact, change_attachments, validation_actions,
              approval_status, stage_completion_status
       FROM ecr_reports WHERE id = $1`, [id]
    );
    const prev = prevResult.rows[0] || {};

    const {
      changeTitle,
      changeDescription,
      changeAttachments,
      beforeConditionDescription,
      afterConditionDescription,
      changeCategories,
      changeType,
      priority,
      riskAssessment,
      impactAnalysis,
      customerImpact,
      selectedParts,
      affectedDocuments,
      beforePhotos,
      afterPhotos,
      reviewBoard,
      validationTeams,
      involvedAreas,
      validationAreas,
      validationActions,
      trialPlan,
      implementationPlan,
      validationEvidence,
      closureNotes,
      lessonsLearned,
      followUpActions,
      evidenceDocumentation,
      status,
      currentStage,
      clientId,
      selectedProjects,
      approvers,
      // Requestor Information
      requestorUserId,
      requestorName,
      requestorDepartment,
      requestorEmail,
      requestorPhone,
      requestorExtension
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (changeTitle !== undefined) {
      updates.push(`change_title = $${paramIndex++}`);
      values.push(changeTitle);
    }
    if (changeDescription !== undefined) {
      updates.push(`change_description = $${paramIndex++}`);
      values.push(changeDescription);
    }
    if (changeAttachments !== undefined) {
      updates.push(`change_attachments = $${paramIndex++}`);
      values.push(JSON.stringify(changeAttachments));
    }
    if (beforeConditionDescription !== undefined) {
      updates.push(`before_condition_description = $${paramIndex++}`);
      values.push(beforeConditionDescription);
    }
    if (afterConditionDescription !== undefined) {
      updates.push(`after_condition_description = $${paramIndex++}`);
      values.push(afterConditionDescription);
    }
    if (changeCategories !== undefined) {
      updates.push(`change_category = $${paramIndex++}`);
      values.push(Array.isArray(changeCategories) ? (changeCategories[0] || null) : (changeCategories || null));
    }
    if (changeType !== undefined) {
      updates.push(`change_type = $${paramIndex++}`);
      values.push(changeType);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (req.body.plannedAdoptionDate !== undefined) {
      updates.push(`planned_adoption_date = $${paramIndex++}`);
      values.push(req.body.plannedAdoptionDate || null);
    }
    if (riskAssessment !== undefined) {
      updates.push(`risk_assessment = $${paramIndex++}`);
      values.push(riskAssessment ? JSON.stringify(riskAssessment) : null);
    }
    if (impactAnalysis !== undefined) {
      updates.push(`impact_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(impactAnalysis));
    }
    if (customerImpact !== undefined) {
      updates.push(`customer_impact = $${paramIndex++}`);
      values.push(JSON.stringify(customerImpact));
    }
    if (selectedParts !== undefined) {
      updates.push(`selected_parts = $${paramIndex++}`);
      values.push(JSON.stringify(selectedParts));
    }
    if (affectedDocuments !== undefined) {
      updates.push(`affected_documents = $${paramIndex++}`);
      values.push(JSON.stringify(affectedDocuments));
    }
    if (beforePhotos !== undefined) {
      updates.push(`before_photos = $${paramIndex++}`);
      values.push(JSON.stringify(beforePhotos));
    }
    if (afterPhotos !== undefined) {
      updates.push(`after_photos = $${paramIndex++}`);
      values.push(JSON.stringify(afterPhotos));
    }
    if (reviewBoard !== undefined) {
      updates.push(`review_board = $${paramIndex++}`);
      values.push(JSON.stringify(reviewBoard));
    }
    if (validationTeams !== undefined) {
      updates.push(`validation_teams = $${paramIndex++}`);
      values.push(JSON.stringify(validationTeams));
    }
    if (involvedAreas !== undefined) {
      updates.push(`involved_areas = $${paramIndex++}`);
      values.push(JSON.stringify(involvedAreas));
    }
    if (validationAreas !== undefined) {
      updates.push(`validation_areas = $${paramIndex++}`);
      values.push(JSON.stringify(validationAreas));
    }
    if (approvers !== undefined) {
      if (approvers.level1 !== undefined) {
        updates.push(`level1_approver = $${paramIndex++}`);
        values.push(approvers.level1 || null);
      }
      if (approvers.level2 !== undefined) {
        updates.push(`level2_approver = $${paramIndex++}`);
        values.push(approvers.level2 || null);
      }
      if (approvers.level3 !== undefined) {
        updates.push(`level3_approver = $${paramIndex++}`);
        values.push(approvers.level3 || null);
      }
    }
    if (validationActions !== undefined) {
      updates.push(`validation_actions = $${paramIndex++}`);
      values.push(JSON.stringify(validationActions));
    }
    if (trialPlan !== undefined) {
      updates.push(`trial_plan = $${paramIndex++}`);
      values.push(trialPlan);
    }
    if (implementationPlan !== undefined) {
      updates.push(`implementation_plan = $${paramIndex++}`);
      values.push(implementationPlan);
    }
    if (req.body.selectedValidations !== undefined) {
      updates.push(`selected_validations = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.selectedValidations));
    }
    if (validationEvidence !== undefined) {
      updates.push(`validation_evidence = $${paramIndex++}`);
      values.push(JSON.stringify(validationEvidence));
    }
    if (closureNotes !== undefined) {
      updates.push(`closure_notes = $${paramIndex++}`);
      values.push(closureNotes);
    }
    if (req.body.adoptionLotNumber !== undefined) {
      updates.push(`adoption_lot_number = $${paramIndex++}`);
      values.push(req.body.adoptionLotNumber);
    }
    if (lessonsLearned !== undefined) {
      updates.push(`lessons_learned = $${paramIndex++}`);
      values.push(lessonsLearned);
    }
    if (followUpActions !== undefined) {
      updates.push(`follow_up_actions = $${paramIndex++}`);
      values.push(JSON.stringify(followUpActions));
    }
    if (evidenceDocumentation !== undefined) {
      updates.push(`evidence_documentation = $${paramIndex++}`);
      values.push(JSON.stringify(evidenceDocumentation));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (req.body.submittedBy !== undefined) {
      updates.push(`submitted_by = $${paramIndex++}`);
      values.push(req.body.submittedBy);
    }
    if (req.body.submittedAt !== undefined) {
      updates.push(`submitted_at = $${paramIndex++}`);
      values.push(req.body.submittedAt || null);
    }
    if (req.body.approvalHistory !== undefined) {
      updates.push(`approval_history = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.approvalHistory));
    }
    // Closure rejection fields
    if (req.body.closedAt !== undefined) {
      updates.push(`closed_at = $${paramIndex++}`);
      values.push(req.body.closedAt || null);
    }
    if (req.body.closedBy !== undefined) {
      updates.push(`closed_by = $${paramIndex++}`);
      values.push(req.body.closedBy || null);
    }
    if (req.body.closedByName !== undefined) {
      updates.push(`closed_by_name = $${paramIndex++}`);
      values.push(req.body.closedByName || null);
    }
    if (req.body.closureReason !== undefined) {
      updates.push(`closure_reason = $${paramIndex++}`);
      values.push(req.body.closureReason || null);
    }
    // Closure type fields (for close as rejected flow)
    if (req.body.closureType !== undefined) {
      updates.push(`closure_type = $${paramIndex++}`);
      values.push(req.body.closureType || null);
    }
    if (req.body.rejectionReason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      values.push(req.body.rejectionReason || null);
    }
    if (currentStage !== undefined) {
      updates.push(`current_stage = $${paramIndex++}`);
      values.push(currentStage);
    }
    // Only update client_id if explicitly provided (not null from failed frontend state)
    if (clientId !== undefined && clientId !== null) {
      updates.push(`client_id = $${paramIndex++}`);
      values.push(clientId);
    }
    if (selectedProjects !== undefined) {
      updates.push(`selected_projects = $${paramIndex++}`);
      values.push(JSON.stringify(selectedProjects || []));

      // Update project_id, project_number, project_name from first project for backwards compatibility
      const firstProject = selectedProjects && selectedProjects.length > 0 ? selectedProjects[0] : null;
      if (firstProject) {
        updates.push(`project_id = $${paramIndex++}`);
        values.push(firstProject.id || null);
        updates.push(`project_number = $${paramIndex++}`);
        values.push(firstProject.projectNumber || null);
        updates.push(`project_name = $${paramIndex++}`);
        values.push(firstProject.projectName || null);
      }
    }

    // Requestor Information fields
    if (requestorUserId !== undefined) {
      updates.push(`requestor_user_id = $${paramIndex++}`);
      values.push(requestorUserId);
    }
    if (requestorName !== undefined) {
      updates.push(`requestor_name = $${paramIndex++}`);
      values.push(requestorName);
    }
    if (requestorDepartment !== undefined) {
      updates.push(`requestor_department = $${paramIndex++}`);
      values.push(requestorDepartment);
    }
    if (requestorEmail !== undefined) {
      updates.push(`requestor_email = $${paramIndex++}`);
      values.push(requestorEmail);
    }
    if (requestorPhone !== undefined) {
      updates.push(`requestor_phone = $${paramIndex++}`);
      values.push(requestorPhone);
    }
    if (requestorExtension !== undefined) {
      updates.push(`requestor_extension = $${paramIndex++}`);
      values.push(requestorExtension);
    }

    // ECR-4 Closure fields
    if (req.body.dimensionalResults !== undefined) {
      updates.push(`dimensional_results = $${paramIndex++}`);
      values.push(req.body.dimensionalResults);
    }
    if (req.body.functionalTests !== undefined) {
      updates.push(`functional_tests = $${paramIndex++}`);
      values.push(req.body.functionalTests);
    }
    if (req.body.materialValidations !== undefined) {
      updates.push(`material_validations = $${paramIndex++}`);
      values.push(req.body.materialValidations);
    }
    if (req.body.finalValidations !== undefined) {
      updates.push(`final_validations = $${paramIndex++}`);
      values.push(req.body.finalValidations);
    }
    if (req.body.verificationEvidence !== undefined) {
      updates.push(`verification_evidence = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.verificationEvidence));
    }
    if (req.body.isirFirstArticle !== undefined) {
      updates.push(`isir_first_article = $${paramIndex++}`);
      values.push(req.body.isirFirstArticle);
    }
    if (req.body.initialScrap !== undefined) {
      updates.push(`initial_scrap = $${paramIndex++}`);
      values.push(req.body.initialScrap !== '' ? parseFloat(req.body.initialScrap) : null);
    }
    if (req.body.processStability !== undefined) {
      updates.push(`process_stability = $${paramIndex++}`);
      values.push(req.body.processStability !== '' ? parseFloat(req.body.processStability) : null);
    }
    if (req.body.cpPostChange !== undefined) {
      updates.push(`cp_post_change = $${paramIndex++}`);
      values.push(req.body.cpPostChange !== '' ? parseFloat(req.body.cpPostChange) : null);
    }
    if (req.body.cpkPostChange !== undefined) {
      updates.push(`cpk_post_change = $${paramIndex++}`);
      values.push(req.body.cpkPostChange !== '' ? parseFloat(req.body.cpkPostChange) : null);
    }
    if (req.body.productionEvidence !== undefined) {
      updates.push(`production_evidence = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.productionEvidence));
    }
    if (req.body.productionJudgment !== undefined) {
      updates.push(`production_judgment = $${paramIndex++}`);
      values.push(req.body.productionJudgment);
    }
    if (req.body.productionComments !== undefined) {
      updates.push(`production_comments = $${paramIndex++}`);
      values.push(req.body.productionComments);
    }
    if (req.body.releasedRevisions !== undefined) {
      updates.push(`released_revisions = $${paramIndex++}`);
      values.push(req.body.releasedRevisions);
    }
    if (req.body.dmsUpdate !== undefined) {
      updates.push(`dms_update = $${paramIndex++}`);
      values.push(req.body.dmsUpdate);
    }
    if (req.body.traceabilityEvidence !== undefined) {
      updates.push(`traceability_evidence = $${paramIndex++}`);
      values.push(req.body.traceabilityEvidence);
    }
    if (req.body.documentationEvidence !== undefined) {
      updates.push(`documentation_evidence = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.documentationEvidence));
    }
    if (req.body.effectiveDate !== undefined) {
      updates.push(`effective_date = $${paramIndex++}`);
      values.push(req.body.effectiveDate || null);
    }
    if (req.body.affectedParts !== undefined) {
      updates.push(`affected_parts = $${paramIndex++}`);
      values.push(req.body.affectedParts);
    }
    if (req.body.ppapStatus !== undefined) {
      updates.push(`ppap_status = $${paramIndex++}`);
      // Solo guardar el nivel en ppap_status (VARCHAR(50)), el objeto completo va en ppap_status_detail
      values.push(req.body.ppapStatus?.level || null);
    }
    if (req.body.detectedRisks !== undefined) {
      updates.push(`detected_risks = $${paramIndex++}`);
      values.push(req.body.detectedRisks);
    }
    if (req.body.appliedImprovements !== undefined) {
      updates.push(`applied_improvements = $${paramIndex++}`);
      values.push(req.body.appliedImprovements);
    }
    if (req.body.processOwnerSignature !== undefined) {
      updates.push(`process_owner_signature = $${paramIndex++}`);
      values.push(req.body.processOwnerSignature);
    }
    if (req.body.processOwnerSignedAt !== undefined) {
      updates.push(`process_owner_signed_at = $${paramIndex++}`);
      values.push(req.body.processOwnerSignedAt || null);
    }
    if (req.body.managementSignature !== undefined) {
      updates.push(`management_signature = $${paramIndex++}`);
      values.push(req.body.managementSignature);
    }
    if (req.body.managementSignedAt !== undefined) {
      updates.push(`management_signed_at = $${paramIndex++}`);
      values.push(req.body.managementSignedAt || null);
    }
    if (req.body.isCompleted !== undefined) {
      updates.push(`is_completed = $${paramIndex++}`);
      values.push(req.body.isCompleted);
    }
    if (req.body.impactVerifications !== undefined) {
      updates.push(`impact_verifications = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.impactVerifications));
    }
    if (req.body.communicationPlan !== undefined) {
      updates.push(`communication_plan = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.communicationPlan));
    }
    if (req.body.customerApproval !== undefined) {
      updates.push(`customer_approval = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.customerApproval));
    }
    if (req.body.ppapStatus !== undefined) {
      updates.push(`ppap_status_detail = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.ppapStatus));
    }
    if (req.body.closureSignatures !== undefined) {
      updates.push(`closure_signatures = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.closureSignatures));
    }
    if (req.body.rejectionSignatures !== undefined) {
      updates.push(`rejection_signatures = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.rejectionSignatures));
    }
    // rejection_reason already handled above (line ~704)
    if (req.body.stageCompletionStatus !== undefined) {
      const newStageStatus = req.body.stageCompletionStatus;
      const prevStageStatus = prev.stage_completion_status || {};

      // VALIDATION: ECR-3 cannot be marked as completed without approval process
      const wasEcr3Completed = prevStageStatus.ecr3?.completed === true;
      const isEcr3BeingCompleted = newStageStatus.ecr3?.completed === true;

      if (!wasEcr3Completed && isEcr3BeingCompleted) {
        // Check if approval_status is 'approved'
        if (prev.approval_status !== 'approved') {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'ECR-3 no puede marcarse como completado sin pasar por el proceso de aprobación. El ECR debe estar aprobado por todos los niveles requeridos.'
          });
        }
      }

      // ECR-4 completion validation: Check required fields
      // ECR-4 represents the "Formal Closure" stage which includes closure audit.
      // Flow: Complete audit → Fill required fields → Mark ECR-4 complete → Submit for approval → Approve → status='closed'
      const wasEcr4Completed = prevStageStatus.ecr4?.completed === true;
      const isEcr4BeingCompleted = newStageStatus.ecr4?.completed === true;

      if (!wasEcr4Completed && isEcr4BeingCompleted) {
        // Check required fields for ECR-4 completion
        const missingFields = [];

        // Check effectiveDate (from request or existing)
        const effectiveDate = req.body.effectiveDate !== undefined ? req.body.effectiveDate : prev.effective_date;
        if (!effectiveDate) {
          missingFields.push('Fecha Efectiva de Adopción');
        }

        // Check adoptionLotNumber (from request or existing)
        const adoptionLotNumber = req.body.adoptionLotNumber !== undefined ? req.body.adoptionLotNumber : prev.adoption_lot_number;
        if (!adoptionLotNumber) {
          missingFields.push('No. de Lote/Unidad de Adopción');
        }

        if (missingFields.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `ECR-4 no puede marcarse como completado. Campos obligatorios faltantes: ${missingFields.join(', ')}. Asegúrese de guardar los cambios antes de marcar como completado.`
          });
        }
      }

      updates.push(`stage_completion_status = $${paramIndex++}`);
      values.push(JSON.stringify(newStageStatus));
    }
    if (req.body.financialImpact !== undefined) {
      updates.push(`financial_impact = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.financialImpact));
    }
    if (req.body.requiresClosureAudit !== undefined) {
      updates.push(`requires_closure_audit = $${paramIndex++}`);
      values.push(req.body.requiresClosureAudit);
    }
    if (req.body.closureApprovalHistory !== undefined) {
      updates.push(`closure_approval_history = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.closureApprovalHistory));
    }
    if (req.body.closureApprovalStatus !== undefined) {
      updates.push(`closure_approval_status = $${paramIndex++}`);
      values.push(req.body.closureApprovalStatus);
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    values.push(id);

    const updateQuery = `
      UPDATE ecr_reports
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: `ECR report with ID ${id} not found`
      });
    }

    await client.query('COMMIT');

    // Save closureAuditItems to separate table if provided
    if (req.body.closureAuditItems && Array.isArray(req.body.closureAuditItems)) {
      for (const item of req.body.closureAuditItems) {
        if (item.id && item.id > 0) {
          // Update existing item
          await query(`
            UPDATE ecr_closure_audit_items SET
              item_name = $1, item_icon = $2, check_item = $3, comments = $4,
              due_date = $5, assigned_auditors = $6, sent_to_audit = $7,
              auditor_comments = $8, auditor_judgment = $9, auditor_completed = $10,
              audited_by = $11, audited_by_name = $12, verification_date = $13,
              audit_round = $14, display_order = $15,
              impact_area_key = $16, impact_area_name = $17, impact_subsection = $18,
              leader_judgment = $19, leader_judgment_by = $20, leader_judgment_by_name = $21,
              leader_judgment_at = $22,
              updated_at = NOW()
            WHERE id = $23 AND ecr_id = $24
          `, [
            item.name || item.itemName,
            item.icon || item.itemIcon || '📎',
            item.checkItem || '',
            item.comments || '',
            item.dueDate || null,
            item.assignedAuditors || [],
            item.sentToAudit || false,
            item.auditorComments || '',
            item.auditorJudgment || '',
            item.auditorCompleted || false,
            item.auditedById || null,
            item.auditedByName || '',
            item.verificationDate || null,
            item.auditRound || 1,
            item.displayOrder || 0,
            item.impactAreaKey || null,
            item.impactAreaName || null,
            item.impactSubsection || null,
            item.leaderJudgment || '',
            item.leaderJudgmentBy || null,
            item.leaderJudgmentByName || '',
            item.leaderJudgmentAt || null,
            item.id,
            id
          ]);
        } else if (item.id && item.id < 0) {
          // Insert new item (negative ID means new)
          await query(`
            INSERT INTO ecr_closure_audit_items (
              ecr_id, item_name, item_icon, is_default, check_item, comments,
              due_date, assigned_auditors, sent_to_audit, auditor_judgment,
              auditor_completed, audit_round, display_order,
              impact_area_key, impact_area_name, impact_subsection, leader_judgment,
              leader_judgment_by, leader_judgment_by_name, leader_judgment_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          `, [
            id,
            item.name || item.itemName,
            item.icon || item.itemIcon || '📎',
            item.isDefault || false,
            item.checkItem || '',
            item.comments || '',
            item.dueDate || null,
            item.assignedAuditors || [],
            item.sentToAudit || false,
            item.auditorJudgment || '',
            item.auditorCompleted || false,
            item.auditRound || 1,
            item.displayOrder || 0,
            item.impactAreaKey || null,
            item.impactAreaName || null,
            item.impactSubsection || null,
            item.leaderJudgment || '',
            item.leaderJudgmentBy || null,
            item.leaderJudgmentByName || '',
            item.leaderJudgmentAt || null
          ]);
        }
      }
    }

    // Preserve JSONB fields that should NOT have internal keys transformed
    const rawRow = result.rows[0];
    const preservedFields = {
      impactVerifications: rawRow.impact_verifications,
      impactAnalysis: rawRow.impact_analysis,
      validationEvidence: rawRow.validation_evidence,
      closureSignatures: rawRow.closure_signatures,
      closureApprovalHistory: rawRow.closure_approval_history || [],
      closureApprovalStatus: rawRow.closure_approval_status || 'draft',
      rejectionSignatures: rawRow.rejection_signatures || {},
      ppapStatus: rawRow.ppap_status_detail,
      approvalHistory: rawRow.approval_history || [],
      rejectionReason: rawRow.rejection_reason || '',
      stageCompletionStatus: rawRow.stage_completion_status || {
        ecr1: { completed: false },
        ecr2: { completed: false },
        ecr2b: { completed: false },
        ecr3: { completed: false },
        ecr4: { completed: false }
      },
      financialImpact: rawRow.financial_impact || {
        items: [],
        totalCost: 0,
        totalSavings: 0,
        netImpact: 0
      }
    };

    const updatedECR = transformToCamelCase(rawRow);

    // Restore preserved JSONB fields
    Object.assign(updatedECR, preservedFields);

    // Build approvers object (same as GET)
    updatedECR.approvers = {
      level1: updatedECR.level1Approver || null,
      level2: updatedECR.level2Approver || null,
      level3: updatedECR.level3Approver || null
    };

    console.log(`✅ ECR report updated: ${updatedECR.ecrNumber}`);

    const updaterName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    const stageLabel = req.body._auditStageLabel || updatedECR.currentStage || null;

    // Detect field-level changes
    const normalize = (v) => {
      if (v === null || v === undefined || v === '') return '';
      if (typeof v === 'object') return JSON.stringify(v);
      if (typeof v === 'number' && isNaN(v)) return '';
      const str = String(v).trim();
      // Treat "NaN" string as empty (comes from parseFloat(''))
      if (str === 'NaN' || str === 'null' || str === 'undefined') return '';
      return str;
    };

    const scalarFields = {
      change_title:                  ['Título',                   changeTitle],
      change_description:            ['Descripción del cambio',   changeDescription],
      change_type:                   ['Tipo de cambio',           changeType],
      priority:                      ['Prioridad',                priority],
      trial_plan:                    ['Plan de prueba',           trialPlan],
      implementation_plan:           ['Plan de implementación',   implementationPlan],
      closure_notes:                 ['Notas de cierre',          closureNotes],
      lessons_learned:               ['Lecciones aprendidas',     lessonsLearned],
      before_condition_description:  ['Condición antes',          beforeConditionDescription],
      after_condition_description:   ['Condición después',        afterConditionDescription],
      isir_first_article:            ['ISIR / First Article',     req.body.isirFirstArticle],
      initial_scrap:                 ['Scrap inicial',            req.body.initialScrap],
      process_stability:             ['Estabilidad del proceso',  req.body.processStability],
      cp_post_change:                ['CP post-cambio',           req.body.cpPostChange],
      cpk_post_change:               ['CPK post-cambio',          req.body.cpkPostChange],
      released_revisions:            ['Revisiones liberadas',     req.body.releasedRevisions],
      dms_update:                    ['Actualización DMS',        req.body.dmsUpdate],
      traceability_evidence:         ['Evidencia de trazabilidad',req.body.traceabilityEvidence],
      affected_parts:                ['Partes afectadas',         req.body.affectedParts],
      detected_risks:                ['Riesgos detectados',       req.body.detectedRisks],
      applied_improvements:          ['Mejoras aplicadas',        req.body.appliedImprovements],
      requestor_name:                ['Solicitante',              requestorName],
      requestor_department:          ['Departamento',             requestorDepartment],
      requestor_email:               ['Email solicitante',        requestorEmail],
      requestor_phone:               ['Teléfono solicitante',     requestorPhone],
      adoption_lot_number:           ['Núm. lote adopción',       req.body.adoptionLotNumber],
      rejection_reason:              ['Motivo de rechazo',        req.body.rejectionReason],
      planned_adoption_date:         ['Fecha adopción planeada',  req.body.plannedAdoptionDate],
      effective_date:                ['Fecha efectiva',           req.body.effectiveDate],
      requires_closure_audit:        ['Requiere auditoría cierre',req.body.requiresClosureAudit],
    };

    const jsonbFields = {
      selected_parts:     ['Partes seleccionadas',       selectedParts],
      affected_documents: ['Documentos afectados',       affectedDocuments],
      review_board:       ['Review Board',               reviewBoard],
      validation_teams:   ['Equipos de validación',      validationTeams],
      involved_areas:     ['TFT involucradas',           involvedAreas],
      validation_areas:   ['TFT de validación',          validationAreas],
      impact_analysis:    ['Análisis de impacto',        impactAnalysis],
      risk_assessment:    ['Evaluación de riesgo',       riskAssessment],
      financial_impact:   ['Impacto financiero',         req.body.financialImpact],
      change_attachments: ['Archivos adjuntos',          changeAttachments],
      validation_actions: ['Acciones de validación',     validationActions],
      ppap_status_detail: ['Estatus PPAP',               req.body.ppapStatus],
    };

    const changedFields = [];

    for (const [col, [label, newVal]] of Object.entries(scalarFields)) {
      if (newVal === undefined) continue;
      if (normalize(newVal) !== normalize(prev[col])) {
        const oldDisplay = normalize(prev[col]) || '—';
        const newDisplay = normalize(newVal) || '—';
        changedFields.push(`${label}: "${oldDisplay}" → "${newDisplay.substring(0, 80)}"`);
      }
    }

    // Deep compare for JSONB fields - sort keys to ignore order differences
    // Also treat empty objects/arrays as null
    const isEmptyValue = (v) => {
      if (v === null || v === undefined || v === '') return true;
      if (Array.isArray(v) && v.length === 0) return true;
      if (typeof v === 'object' && Object.keys(v).every(k => isEmptyValue(v[k]))) return true;
      return false;
    };

    const sortedStringify = (obj) => {
      if (isEmptyValue(obj)) return 'null';
      if (typeof obj !== 'object') return JSON.stringify(obj);
      if (Array.isArray(obj)) {
        const filtered = obj.filter(item => !isEmptyValue(item));
        if (filtered.length === 0) return 'null';
        return '[' + filtered.map(sortedStringify).join(',') + ']';
      }
      const sortedKeys = Object.keys(obj).sort();
      const pairs = sortedKeys
        .filter(k => !isEmptyValue(obj[k]))
        .map(k => `"${k}":${sortedStringify(obj[k])}`);
      if (pairs.length === 0) return 'null';
      return '{' + pairs.join(',') + '}';
    };

    for (const [col, [label, newVal]] of Object.entries(jsonbFields)) {
      if (newVal === undefined) continue;
      const oldJson = sortedStringify(prev[col]);
      const newJson = sortedStringify(newVal);
      if (oldJson !== newJson) {
        console.log(`🔍 JSONB diff [${col}]:`);
        console.log('   OLD:', oldJson.substring(0, 200));
        console.log('   NEW:', newJson.substring(0, 200));
        changedFields.push(`${label} actualizado`);
      }
    }

    // Log validation signature events specifically
    if (validationEvidence !== undefined) {
      const prevEvidence = prev.validation_evidence || {};
      const wasLocked = prevEvidence.isLocked === true;
      const isNowLocked = validationEvidence.isLocked === true;

      if (!wasLocked && isNowLocked && validationEvidence.signedBy) {
        // Validation was just signed
        logECRAction({
          ecrId: updatedECR.id,
          actionType: 'validation_signed',
          actionCategory: 'signature',
          sectionName: 'ECR-3 Validation',
          userId: validationEvidence.signedBy,
          userName: validationEvidence.signedByName || updaterName,
          description: `Validación firmada por ${validationEvidence.signedByName || updaterName}`,
          newValue: { signedAt: validationEvidence.signedAt }
        });
      } else if (wasLocked && !isNowLocked) {
        // Validation signature was cleared (e.g., due to rejection)
        logECRAction({
          ecrId: updatedECR.id,
          actionType: 'validation_unsigned',
          actionCategory: 'signature',
          sectionName: 'ECR-3 Validation',
          userId: req.user?.id,
          userName: updaterName,
          description: `Firma de validación removida`,
          previousValue: { signedBy: prevEvidence.signedByName, signedAt: prevEvidence.signedAt }
        });
      }
    }

    if (changedFields.length > 0) {
      for (const change of changedFields) {
        logECRAction({ ecrId: updatedECR.id, actionType: 'field_changed', actionCategory: 'report', sectionName: stageLabel, userId: req.user?.id, userName: updaterName, description: `Campo modificado — ${change}` });
      }
    } else {
      const stageDesc = stageLabel ? ` — ${stageLabel}` : '';
      logECRAction({ ecrId: updatedECR.id, actionType: 'saved', actionCategory: 'report', sectionName: stageLabel, userId: req.user?.id, userName: updaterName, description: `ECR guardado${stageDesc}` });
    }

    res.json({
      success: true,
      message: 'ECR report updated successfully',
      ecr: updatedECR
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error updating ECR report ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error updating ECR report',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Submit ECR for validation
async function submitECRForValidation(req, res) {
  try {
    const { id } = req.params;
    console.log(`🔄 Submitting ECR ${id} for validation...`);

    const result = await query(`
      UPDATE ecr_reports
      SET
        status = 'submitted',
        current_stage = 'validation',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `ECR report with ID ${id} not found`
      });
    }

    const updatedECR = transformToCamelCase(result.rows[0]);

    console.log(`✅ ECR ${updatedECR.ecrNumber} submitted for validation`);

    const submitterName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    logECRAction({ ecrId: updatedECR.id, actionType: 'submitted_validation', actionCategory: 'report', userId: req.user?.id, userName: submitterName, description: 'ECR enviado a validación' });

    res.json({
      success: true,
      message: 'ECR submitted for validation successfully',
      ecr: updatedECR
    });

  } catch (error) {
    console.error(`❌ Error submitting ECR ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error submitting ECR for validation',
      error: error.message
    });
  }
}

// Close ECR
async function closeECR(req, res) {
  try {
    const { id } = req.params;
    const { closureNotes, lessonsLearned } = req.body;
    const closedBy = req.user ? req.user.id : null;

    console.log(`🔄 Closing ECR ${id}...`);

    const result = await query(`
      UPDATE ecr_reports
      SET
        status = 'closed',
        current_stage = 'closure',
        closure_notes = $1,
        lessons_learned = $2,
        closed_by = $3,
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [closureNotes, lessonsLearned, closedBy, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `ECR report with ID ${id} not found`
      });
    }

    const closedECR = transformToCamelCase(result.rows[0]);

    console.log(`✅ ECR ${closedECR.ecrNumber} closed successfully`);

    const closerName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    logECRAction({ ecrId: closedECR.id, actionType: 'closed', actionCategory: 'report', userId: req.user?.id, userName: closerName, description: 'ECR cerrado' });

    res.json({
      success: true,
      message: 'ECR closed successfully',
      ecr: closedECR
    });

  } catch (error) {
    console.error(`❌ Error closing ECR ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error closing ECR',
      error: error.message
    });
  }
}

// Delete ECR report (optional - for cleanup)
async function deleteECRReport(req, res) {
  try {
    const { id } = req.params;
    console.log(`🔄 Deleting ECR report ID: ${id}`);

    const result = await query(`
      DELETE FROM ecr_reports
      WHERE id = $1
      RETURNING ecr_number
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `ECR report with ID ${id} not found`
      });
    }

    console.log(`✅ ECR ${result.rows[0].ecr_number} deleted`);

    res.json({
      success: true,
      message: 'ECR report deleted successfully'
    });

  } catch (error) {
    console.error(`❌ Error deleting ECR ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ECR report',
      error: error.message
    });
  }
}

// Get custom areas history
async function getCustomAreasHistory(req, res) {
  try {
    console.log('🔄 Fetching custom areas history...');

    const result = await query(`
      SELECT DISTINCT
        elem->>'areaName' as area_name,
        elem->>'areaKey' as area_key,
        elem->>'icon' as icon,
        elem->>'color' as color,
        elem->>'description' as description,
        COUNT(*) as usage_count
      FROM ecr_reports,
           jsonb_array_elements(impact_analysis) elem
      WHERE elem->>'isCustom' = 'true'
      GROUP BY area_name, area_key, icon, color, description
      ORDER BY usage_count DESC, area_name ASC
    `);

    const areas = result.rows.map(row => ({
      areaName: row.area_name,
      areaKey: row.area_key,
      icon: row.icon,
      color: row.color,
      description: row.description,
      usageCount: parseInt(row.usage_count)
    }));

    console.log(`✅ Found ${areas.length} custom areas in history`);

    res.json({
      success: true,
      areas
    });

  } catch (error) {
    console.error('❌ Error fetching custom areas history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom areas history',
      error: error.message
    });
  }
}

// Upload ECR evidence files
async function uploadECREvidence(req, res) {
  try {
    const { id } = req.params;
    console.log(`🔄 Uploading evidence for ECR ${id}...`);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    // Map uploaded files to response format
    const files = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      url: `/uploads/ecr/${id}/evidence/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString()
    }));

    console.log(`✅ Uploaded ${files.length} file(s) for ECR ${id}`);

    const uploaderName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    const fileNames = files.map(f => f.originalName).join(', ');
    logECRAction({ ecrId: parseInt(id), actionType: 'file_uploaded', actionCategory: 'file', userId: req.user?.id, userName: uploaderName, description: `Archivo(s) subido(s): ${fileNames}`, newValue: { files: files.map(f => f.originalName) } });

    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      files
    });

  } catch (error) {
    console.error(`❌ Error uploading ECR evidence:`, error);
    res.status(500).json({
      success: false,
      message: 'Error uploading evidence files',
      error: error.message
    });
  }
}

// ============================================================================
// ECR CLOSURE AUDIT ITEMS ENDPOINTS
// ============================================================================

// Storage for closure audit item files
const closureAuditStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const ecrId = req.params.id;
    const itemId = req.params.itemId;
    const uploadDir = path.join(__dirname, `../uploads/ecr/${ecrId}/closure-audit/${itemId}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

const closureAuditUpload = multer({
  storage: closureAuditStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// GET /ecr/:id/closure-audit-items
async function getClosureAuditItems(req, res) {
  const { id } = req.params;

  try {
    // Get items
    const itemsResult = await query(`
      SELECT * FROM ecr_closure_audit_items
      WHERE ecr_id = $1
      ORDER BY display_order, id
    `, [id]);

    // Get files for all items
    const itemIds = itemsResult.rows.map(i => i.id);
    let files = [];
    if (itemIds.length > 0) {
      const filesResult = await query(`
        SELECT * FROM ecr_closure_audit_item_files
        WHERE ecr_closure_audit_item_id = ANY($1)
        ORDER BY uploaded_at DESC
      `, [itemIds]);
      files = filesResult.rows;
    }

    // Get requires_closure_audit flag
    const ecrResult = await query(`
      SELECT requires_closure_audit FROM ecr_reports WHERE id = $1
    `, [id]);

    // Map files to items
    const items = itemsResult.rows.map(item => {
      const itemFiles = files
        .filter(f => f.ecr_closure_audit_item_id === item.id)
        .map(f => transformToCamelCase(f));

      return {
        ...transformToCamelCase(item),
        files: itemFiles
      };
    });

    res.json({
      success: true,
      requiresClosureAudit: ecrResult.rows[0]?.requires_closure_audit || false,
      items
    });
  } catch (error) {
    console.error('Error fetching closure audit items:', error);
    res.status(500).json({ success: false, message: 'Error fetching items' });
  }
}

// PUT /ecr/:id/closure-audit-items
async function saveClosureAuditItems(req, res) {
  const { id } = req.params;
  const { requiresClosureAudit, items } = req.body;

  try {
    // Update requires_closure_audit flag
    if (requiresClosureAudit !== undefined) {
      await query(`
        UPDATE ecr_reports SET requires_closure_audit = $1, updated_at = NOW()
        WHERE id = $2
      `, [requiresClosureAudit, id]);
    }

    // Process items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.id > 0) {
          // Update existing item
          await query(`
            UPDATE ecr_closure_audit_items SET
              item_name = $1,
              item_icon = $2,
              check_item = $3,
              comments = $4,
              due_date = $5,
              assigned_auditors = $6,
              sent_to_audit = $7,
              audit_request_id = $8,
              auditor_comments = $9,
              auditor_judgment = $10,
              auditor_completed = $11,
              audited_by = $12,
              audited_by_name = $13,
              verification_date = $14,
              audit_round = $15,
              display_order = $16,
              impact_area_key = $17,
              impact_area_name = $18,
              impact_subsection = $19,
              leader_judgment = $20,
              leader_judgment_by = $21,
              leader_judgment_by_name = $22,
              leader_judgment_at = $23,
              updated_at = NOW()
            WHERE id = $24 AND ecr_id = $25
          `, [
            item.name || item.itemName,
            item.icon || item.itemIcon || '📎',
            item.checkItem || '',
            item.comments || '',
            item.dueDate || null,
            item.assignedAuditors || [],
            item.sentToAudit || false,
            item.auditRequestId || null,
            item.auditorComments || '',
            item.auditorJudgment || '',
            item.auditorCompleted || false,
            item.auditedById || null,
            item.auditedByName || '',
            item.verificationDate || null,
            item.auditRound || 1,
            item.displayOrder || 0,
            item.impactAreaKey || null,
            item.impactAreaName || null,
            item.impactSubsection || null,
            item.leaderJudgment || '',
            item.leaderJudgmentBy || null,
            item.leaderJudgmentByName || '',
            item.leaderJudgmentAt || null,
            item.id,
            id
          ]);
        } else if (item.id && item.id < 0) {
          // Insert new item (negative ID means new)
          // Check for duplicates first (same check_item and impact_area_key)
          const checkItem = item.checkItem || '';
          const impactKey = item.impactAreaKey || null;
          const existingCheck = await query(`
            SELECT id FROM ecr_closure_audit_items
            WHERE ecr_id = $1 AND check_item = $2 AND (impact_area_key = $3 OR (impact_area_key IS NULL AND $3 IS NULL))
            LIMIT 1
          `, [id, checkItem, impactKey]);

          if (existingCheck.rows.length === 0) {
            await query(`
              INSERT INTO ecr_closure_audit_items (
                ecr_id, item_name, item_icon, is_default, check_item, comments,
                due_date, assigned_auditors, sent_to_audit, auditor_judgment,
                auditor_completed, audit_round, display_order,
                impact_area_key, impact_area_name, impact_subsection, leader_judgment,
                leader_judgment_by, leader_judgment_by_name, leader_judgment_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            `, [
              id,
              item.name || item.itemName,
              item.icon || item.itemIcon || '📎',
              item.isDefault || false,
              checkItem,
              item.comments || '',
              item.dueDate || null,
              item.assignedAuditors || [],
              item.sentToAudit || false,
              item.auditorJudgment || '',
              item.auditorCompleted || false,
              item.auditRound || 1,
              item.displayOrder || 0,
              impactKey,
              item.impactAreaName || null,
              item.impactSubsection || null,
              item.leaderJudgment || '',
              item.leaderJudgmentBy || null,
              item.leaderJudgmentByName || '',
              item.leaderJudgmentAt || null
            ]);
          } else {
            console.log(`[closure-audit-items] Skipping duplicate: "${checkItem}" for ECR ${id}`);
          }
        }
      }
    }

    const saverName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    logECRAction({ ecrId: parseInt(id), actionType: 'closure_items_saved', actionCategory: 'closure', sectionName: 'ecr-4', userId: req.user?.id, userName: saverName, description: `Items de auditoría ECR-4 guardados (${items?.length || 0} items)` });

    // Fetch and return the updated items with real IDs
    const itemsResult = await query(`
      SELECT * FROM ecr_closure_audit_items
      WHERE ecr_id = $1
      ORDER BY display_order, id
    `, [id]);

    const itemIds = itemsResult.rows.map(i => i.id);
    let files = [];
    if (itemIds.length > 0) {
      const filesResult = await query(`
        SELECT * FROM ecr_closure_audit_item_files
        WHERE ecr_closure_audit_item_id = ANY($1)
        ORDER BY uploaded_at DESC
      `, [itemIds]);
      files = filesResult.rows;
    }

    const savedItems = itemsResult.rows.map(item => {
      const itemFiles = files
        .filter(f => f.ecr_closure_audit_item_id === item.id)
        .map(f => transformToCamelCase(f));
      return {
        ...transformToCamelCase(item),
        files: itemFiles
      };
    });

    res.json({ success: true, message: 'Closure audit items saved', items: savedItems });
  } catch (error) {
    console.error('Error saving closure audit items:', error);
    res.status(500).json({ success: false, message: 'Error saving items' });
  }
}

// DELETE /ecr/:id/closure-audit-items/:itemId
async function deleteClosureAuditItem(req, res) {
  const { id, itemId } = req.params;

  try {
    await query(`
      DELETE FROM ecr_closure_audit_items
      WHERE id = $1 AND ecr_id = $2 AND sent_to_audit = false
    `, [itemId, id]);

    const deleterName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    logECRAction({ ecrId: parseInt(id), actionType: 'closure_item_deleted', actionCategory: 'closure', sectionName: 'ecr-4', userId: req.user?.id, userName: deleterName, description: `Item de auditoría eliminado (ID: ${itemId})` });

    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting closure audit item:', error);
    res.status(500).json({ success: false, message: 'Error deleting item' });
  }
}

// POST /ecr/:id/closure-audit-items/:itemId/files
async function uploadClosureAuditItemFile(req, res) {
  const { id, itemId } = req.params;
  const userId = req.user?.id;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/ecr/${id}/closure-audit/${itemId}/${req.file.filename}`;

    const result = await query(`
      INSERT INTO ecr_closure_audit_item_files (
        ecr_closure_audit_item_id, file_name, file_url, file_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [itemId, req.file.originalname, fileUrl, req.file.mimetype, userId]);

    const uploaderName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    logECRAction({ ecrId: parseInt(id), actionType: 'closure_file_uploaded', actionCategory: 'file', sectionName: 'ecr-4', userId: req.user?.id, userName: uploaderName, description: `Archivo subido en item ECR-4: ${req.file.originalname}` });

    res.json({
      success: true,
      file: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error uploading closure audit file:', error);
    res.status(500).json({ success: false, message: 'Error uploading file' });
  }
}

// DELETE /ecr/:id/closure-audit-items/:itemId/files/:fileId
async function deleteClosureAuditItemFile(req, res) {
  const { fileId } = req.params;

  try {
    // Get file info before deleting
    const fileResult = await query(`
      SELECT file_url FROM ecr_closure_audit_item_files WHERE id = $1
    `, [fileId]);

    if (fileResult.rows.length > 0) {
      // Delete from filesystem
      const filePath = path.join(__dirname, '..', fileResult.rows[0].file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await query('DELETE FROM ecr_closure_audit_item_files WHERE id = $1', [fileId]);

    const delName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    const deletedFileName = fileResult.rows[0]?.file_url?.split('/').pop() || fileId;
    logECRAction({ ecrId: parseInt(req.params.id), actionType: 'closure_file_deleted', actionCategory: 'file', sectionName: 'ecr-4', userId: req.user?.id, userName: delName, description: `Archivo eliminado de item ECR-4: ${deletedFileName}` });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting closure audit file:', error);
    res.status(500).json({ success: false, message: 'Error deleting file' });
  }
}

// POST /ecr/:id/closure-audit-items/:itemId/resend
async function resendClosureAuditItem(req, res) {
  const { itemId } = req.params;
  const { closureNotes } = req.body;
  const userId = req.user?.id;
  const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : '';

  try {
    // Get current item state
    const itemResult = await query(`
      SELECT * FROM ecr_closure_audit_items WHERE id = $1
    `, [itemId]);

    if (!itemResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = itemResult.rows[0];
    const currentRound = item.audit_round || 1;

    // Save current state to history
    const savedJudgment = item.auditor_judgment || item.leader_judgment || '';
    await query(`
      INSERT INTO ecr_closure_audit_history (
        ecr_closure_audit_item_id, audit_round,
        auditor_judgment, auditor_comments,
        audited_by, audited_by_name, verification_date,
        check_item, leader_comments, due_date,
        closed_at, closed_by, closure_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12)
    `, [
      itemId, currentRound,
      savedJudgment, item.auditor_comments || '',
      item.audited_by || userId, item.audited_by_name || userName,
      item.verification_date || new Date(),
      item.check_item || '', item.comments || '', item.due_date || null,
      userId, closureNotes || `Re-enviado por juicio ${savedJudgment}`
    ]);

    // Increment round, reset auditor fields
    const newRound = currentRound + 1;
    await query(`
      UPDATE ecr_closure_audit_items SET
        audit_round = $1,
        auditor_judgment = '', auditor_comments = '',
        auditor_completed = false,
        audited_by = NULL, audited_by_name = NULL, verification_date = NULL,
        sent_to_audit = true,
        updated_at = NOW()
      WHERE id = $2
    `, [newRound, itemId]);

    logECRAction({ ecrId: parseInt(req.params.id), actionType: 'closure_item_resent', actionCategory: 'closure', sectionName: 'ecr-4', userId, userName, description: `Item re-enviado a auditoría (ronda ${newRound})` });

    res.json({ success: true, newRound });
  } catch (error) {
    console.error('Error resending closure audit item:', error);
    res.status(500).json({ success: false, message: 'Error resending item' });
  }
}

// GET /ecr/:id/closure-audit-items/:itemId/history
async function revertClosureAuditItem(req, res) {
  const { itemId } = req.params;
  const { reason } = req.body;
  const userId = req.user?.id;
  const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : '';

  try {
    const itemResult = await query(`SELECT * FROM ecr_closure_audit_items WHERE id = $1`, [itemId]);
    if (!itemResult.rows.length) return res.status(404).json({ success: false, message: 'Item not found' });

    const item = itemResult.rows[0];
    const savedJudgment = item.auditor_judgment || item.leader_judgment || '';

    await query(`
      INSERT INTO ecr_closure_audit_history (
        ecr_closure_audit_item_id, audit_round,
        auditor_judgment, auditor_comments,
        audited_by, audited_by_name, verification_date,
        check_item, leader_comments, due_date,
        closed_at, closed_by, closure_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12)
    `, [
      itemId, item.audit_round || 1,
      savedJudgment, item.auditor_comments || '',
      item.audited_by || userId, item.audited_by_name || userName,
      item.verification_date || new Date(),
      item.check_item || '', item.comments || '', item.due_date || null,
      userId, reason || 'Revertido por administrador'
    ]);

    await query(`
      UPDATE ecr_closure_audit_items SET
        auditor_completed = false,
        updated_at = NOW()
      WHERE id = $1
    `, [itemId]);

    logECRAction({ ecrId: parseInt(req.params.id), actionType: 'closure_item_reverted', actionCategory: 'closure', sectionName: 'ecr-4', userId, userName, description: `Item revertido por admin. Motivo: ${reason || 'Sin motivo'}` });

    res.json({ success: true });
  } catch (error) {
    console.error('Error reverting closure audit item:', error);
    res.status(500).json({ success: false, message: 'Error reverting item' });
  }
}

async function getClosureAuditItemHistory(req, res) {
  const { itemId } = req.params;

  try {
    const result = await query(`
      SELECT h.*,
        closer.first_name || ' ' || closer.last_name AS closed_by_name
      FROM ecr_closure_audit_history h
      LEFT JOIN users closer ON h.closed_by = closer.id
      WHERE h.ecr_closure_audit_item_id = $1
      ORDER BY h.audit_round DESC
    `, [itemId]);

    // Get current round from item
    const itemResult = await query(`
      SELECT audit_round FROM ecr_closure_audit_items WHERE id = $1
    `, [itemId]);

    res.json({
      success: true,
      history: result.rows.map(r => transformToCamelCase(r)),
      currentRound: itemResult.rows[0]?.audit_round || 1
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ success: false, message: 'Error fetching history' });
  }
}

async function getECRAuditLog(req, res) {
  const { id } = req.params;
  try {
    const entries = await fetchECRAuditLog(id);
    res.json({ success: true, auditLog: entries.map(e => transformToCamelCase(e)) });
  } catch (error) {
    console.error('Error fetching ECR audit log:', error);
    res.status(500).json({ success: false, message: 'Error fetching audit log' });
  }
}

module.exports = {
  getAllECRReports,
  getECRById,
  createECRReport,
  updateECRReport,
  submitECRForValidation,
  closeECR,
  deleteECRReport,
  getCustomAreasHistory,
  uploadECREvidence,
  upload,
  // Closure Audit Items
  getClosureAuditItems,
  saveClosureAuditItems,
  deleteClosureAuditItem,
  uploadClosureAuditItemFile,
  deleteClosureAuditItemFile,
  resendClosureAuditItem,
  revertClosureAuditItem,
  getClosureAuditItemHistory,
  closureAuditUpload,
  getECRAuditLog
};
