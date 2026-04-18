const { query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// Crear nuevo reporte 8D con partes seleccionadas
async function createEightDReport(req, res) {
  const client = await require('../config/database').pool.connect();

  try {
    console.log('🔄 Creating new 8D report...');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    await client.query('BEGIN');

    const {
      title,
      description,
      supplier_name,
      supplier_account,
      part_number,
      part_name,
      problem_type,
      severity,
      tipo_issue,
      tipo_resp,
      timing_occurrence,
      estimated_cost,
      issue_date,
      target_closure_date,
      issue_assigned_to,
      countermeasure_assigned_to,
      confirmation_assigned_to,
      customer_impact,

      // Nuevos campos para partes
      client_id,
      client_name,
      project_id,
      project_number,
      project_name,
      selected_parts = [], // Array de partes seleccionadas

      // Process flow diagram
      process_flow = [], // Array de pasos del diagrama de flujo

      // Escalation path with user arrays for each section
      escalation_path = {}, // { issue_users: [], countermeasure_users: [], confirmation_users: [] }

      // Status field (draft, in_progress, completed, cancelled)
      status = 'draft', // Default to draft if not provided

      // Responsible department
      department_id = null
    } = req.body;

    // Validación de campos requeridos
    if (!title || !severity || !issue_date) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, severity, and issue_date are required'
      });
    }

    // Validar que haya al menos una parte seleccionada (opcional para reportes antiguos)
    // Si no hay partes seleccionadas, se permite pero se registra un warning
    if (!selected_parts || selected_parts.length === 0) {
      console.log('⚠️ Warning: Creating 8D report without selected parts. This is allowed for backward compatibility.');
    }

    // Get user ID from authenticated user
    const created_by = req.user ? req.user.id : 1; // Fallback to user 1 if no auth

    // Generate unique report_id
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const report_id = `8D-${year}-${randomNum}`;

    // Calcular costo estimado total basado en partes seleccionadas
    const total_estimated_cost = selected_parts.reduce((sum, part) => {
      return sum + (parseFloat(part.unitCost) || 0);
    }, 0);

    // Insert main 8D report
    const insertReportQuery = `
      INSERT INTO eightd_reports (
        report_id,
        title,
        description,
        supplier_name,
        supplier_account,
        part_number,
        part_name,
        problem_type,
        severity,
        tipo_issue,
        tipo_resp,
        timing_occurrence,
        estimated_cost,
        issue_date,
        target_closure_date,
        issue_assigned_to,
        countermeasure_assigned_to,
        confirmation_assigned_to,
        customer_impact,
        created_by,
        process_flow,
        escalation_path,
        status,
        current_step,
        progress_percentage,
        department_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22,
        $23, 'escalation', 0, $24
      ) RETURNING id
    `;

    const reportResult = await client.query(insertReportQuery, [
      report_id,
      title,
      description || null,
      supplier_name || client_name,
      supplier_account || null,
      part_number || 'Multiple Parts',
      part_name || 'See parts list',
      problem_type || null,
      severity,
      tipo_issue || null,
      tipo_resp || null,
      timing_occurrence || null,
      total_estimated_cost,
      issue_date,
      target_closure_date || null,
      issue_assigned_to || null,
      countermeasure_assigned_to || null,
      confirmation_assigned_to || null,
      customer_impact || null,
      created_by,
      JSON.stringify(process_flow), // Convert array to JSON string
      JSON.stringify(escalation_path), // Escalation path with user arrays
      status, // Draft or in_progress
      department_id || null
    ]);

    const newReportId = reportResult.rows[0].id;
    console.log(`✅ 8D report created with ID: ${newReportId}`);

    // Insert selected parts (only if parts are provided)
    if (selected_parts && selected_parts.length > 0) {
      const insertPartQuery = `
        INSERT INTO eightd_parts (
          report_id,
          client_id,
          client_name,
          project_id,
          project_number,
          project_name,
          part_id,
          part_number,
          part_name,
          client_part_number,
          revision,
          description,
          unit_cost,
          currency,
          specifications,
          qty_warehouse,
          qty_in_process,
          qty_in_transit,
          qty_with_customer,
          total_affected_qty,
          total_cost_impact
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
      `;

      for (const part of selected_parts) {
        // Preparar especificaciones adicionales como JSON
        const specifications = {
          weight: part.weight || null,
          snpQuantity: part.snpQuantity || null,
          snpVolume: part.snpVolume || null,
          specifications: part.specifications || null
        };

        // Calcular cantidades y costos de inventario
        const qtyWarehouse = parseInt(part.qtyWarehouse) || 0;
        const qtyInProcess = parseInt(part.qtyInProcess) || 0;
        const qtyInTransit = parseInt(part.qtyInTransit) || 0;
        const qtyWithCustomer = parseInt(part.qtyWithCustomer) || 0;
        const totalAffectedQty = qtyWarehouse + qtyInProcess + qtyInTransit + qtyWithCustomer;
        const totalCostImpact = totalAffectedQty * (parseFloat(part.unitCost) || 0);

        await client.query(insertPartQuery, [
          newReportId,
          client_id,
          client_name,
          project_id,
          project_number,
          project_name,
          part.id,
          part.partNumber,
          part.partName,
          part.clientPartNumber || null,
          part.revision || null,
          part.description || null,
          part.unitCost,
          part.currency || 'USD',
          JSON.stringify(specifications),
          qtyWarehouse,
          qtyInProcess,
          qtyInTransit,
          qtyWithCustomer,
          totalAffectedQty,
          totalCostImpact
        ]);
      }

      console.log(`✅ Inserted ${selected_parts.length} parts for report ${newReportId}`);
    } else {
      console.log(`ℹ️ No parts to insert for report ${newReportId}`);
    }

    // Create initial status history entry
    const insertStatusQuery = `
      INSERT INTO eightd_status_history (
        report_id,
        previous_status,
        new_status,
        previous_step,
        new_step,
        changed_by,
        change_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(insertStatusQuery, [
      newReportId,
      null,
      'in_progress',
      null,
      'escalation',
      created_by,
      'Initial report creation'
    ]);

    await client.query('COMMIT');

    // Return complete report data
    res.json({
      success: true,
      message: '8D report created successfully',
      report: transformToCamelCase({
        id: newReportId,
        report_id,
        title,
        severity,
        status, // Use actual status (draft or in_progress)
        current_step: 'escalation',
        total_parts: selected_parts.length,
        total_estimated_cost,
        created_at: new Date().toISOString()
      })
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating 8D report',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Obtener reporte 8D por ID con sus partes
async function getEightDReportById(req, res) {
  try {
    const { reportId } = req.params;
    console.log(`🔄 Fetching 8D report: ${reportId}`);

    // Get main report data
    // Try to parse reportId as integer for ID column, otherwise use as string for report_id column
    const isNumericId = !isNaN(parseInt(reportId)) && reportId === parseInt(reportId).toString();

    const reportQuery = isNumericId
      ? `
        SELECT
          r.*,
          u1.first_name || ' ' || u1.last_name as issue_assignee_name,
          u2.first_name || ' ' || u2.last_name as countermeasure_assignee_name,
          u3.first_name || ' ' || u3.last_name as confirmation_assignee_name,
          creator.first_name || ' ' || creator.last_name as created_by_name
        FROM eightd_reports r
        LEFT JOIN users u1 ON r.issue_assigned_to = u1.id
        LEFT JOIN users u2 ON r.countermeasure_assigned_to = u2.id
        LEFT JOIN users u3 ON r.confirmation_assigned_to = u3.id
        LEFT JOIN users creator ON r.created_by = creator.id
        WHERE r.id = $1::integer
      `
      : `
        SELECT
          r.*,
          u1.first_name || ' ' || u1.last_name as issue_assignee_name,
          u2.first_name || ' ' || u2.last_name as countermeasure_assignee_name,
          u3.first_name || ' ' || u3.last_name as confirmation_assignee_name,
          creator.first_name || ' ' || creator.last_name as created_by_name
        FROM eightd_reports r
        LEFT JOIN users u1 ON r.issue_assigned_to = u1.id
        LEFT JOIN users u2 ON r.countermeasure_assigned_to = u2.id
        LEFT JOIN users u3 ON r.confirmation_assigned_to = u3.id
        LEFT JOIN users creator ON r.created_by = creator.id
        WHERE r.report_id = $1::text
      `;

    const reportResult = await query(reportQuery, [reportId]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];

    // Get associated parts with client SLA information
    const partsQuery = `
      SELECT
        p.*,
        c.d4_response_time_hours,
        c.d5_response_time_hours
      FROM eightd_parts p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.report_id = $1
      ORDER BY p.created_at
    `;

    const partsResult = await query(partsQuery, [report.id]);

    // Use first part's client SLA for the report (if exists)
    const clientSLA = partsResult.rows.length > 0 ? {
      d4ResponseTimeHours: partsResult.rows[0].d4_response_time_hours || 24,
      d5ResponseTimeHours: partsResult.rows[0].d5_response_time_hours || 48
    } : {
      d4ResponseTimeHours: 24,
      d5ResponseTimeHours: 48
    };

    const dataToTransform = {
      ...report,
      ...clientSLA,
      parts: partsResult.rows,
      total_parts: partsResult.rows.length
    };

    const transformed = transformToCamelCase(dataToTransform);

    // Manual mapping for problematic fields with numbers after underscore
    // transformToCamelCase can't handle d4_4m_evaluation correctly
    transformed.d44mEvaluation = report.d4_4m_evaluation;
    transformed.d45whysAnalysis = report.d4_5whys_analysis;

    // Manual mapping for D4 approval fields (transformToCamelCase creates d4Approval_1Status instead of d4Approval1Status)
    // Approval Step 1
    transformed.d4Approval1Status = report.d4_approval_1_status;
    transformed.d4Approval1By = report.d4_approval_1_by;
    transformed.d4Approval1At = report.d4_approval_1_at;
    transformed.d4Approval1Comments = report.d4_approval_1_comments;
    // Approval Step 2
    transformed.d4Approval2Status = report.d4_approval_2_status;
    transformed.d4Approval2By = report.d4_approval_2_by;
    transformed.d4Approval2At = report.d4_approval_2_at;
    transformed.d4Approval2Comments = report.d4_approval_2_comments;
    // Approval Step 3
    transformed.d4Approval3Status = report.d4_approval_3_status;
    transformed.d4Approval3By = report.d4_approval_3_by;
    transformed.d4Approval3At = report.d4_approval_3_at;
    transformed.d4Approval3Comments = report.d4_approval_3_comments;

    // D4 status and current step
    transformed.d4Status = report.d4_status;
    transformed.d4CurrentApprovalStep = report.d4_current_approval_step;

    // Manual mapping for D5 approval fields (transformToCamelCase creates d5Approval_1Status instead of d5Approval1Status)
    // Approval Step 1
    transformed.d5Approval1Status = report.d5_approval_1_status;
    transformed.d5Approval1By = report.d5_approval_1_by;
    transformed.d5Approval1At = report.d5_approval_1_at;
    transformed.d5Approval1Comments = report.d5_approval_1_comments;
    // Approval Step 2
    transformed.d5Approval2Status = report.d5_approval_2_status;
    transformed.d5Approval2By = report.d5_approval_2_by;
    transformed.d5Approval2At = report.d5_approval_2_at;
    transformed.d5Approval2Comments = report.d5_approval_2_comments;
    // Approval Step 3
    transformed.d5Approval3Status = report.d5_approval_3_status;
    transformed.d5Approval3By = report.d5_approval_3_by;
    transformed.d5Approval3At = report.d5_approval_3_at;
    transformed.d5Approval3Comments = report.d5_approval_3_comments;

    // D5 status and current step
    transformed.d5Status = report.d5_status;
    transformed.d5CurrentApprovalStep = report.d5_current_approval_step;

    // Manual mapping for D3-MFG approval fields (transformToCamelCase creates d3MfgApproval_1Status instead of d3MfgApproval1Status)
    // Approval Step 1
    transformed.d3MfgApproval1Status = report.d3_mfg_approval_1_status;
    transformed.d3MfgApproval1By = report.d3_mfg_approval_1_by;
    transformed.d3MfgApproval1At = report.d3_mfg_approval_1_at;
    transformed.d3MfgApproval1Comments = report.d3_mfg_approval_1_comments;
    // Approval Step 2
    transformed.d3MfgApproval2Status = report.d3_mfg_approval_2_status;
    transformed.d3MfgApproval2By = report.d3_mfg_approval_2_by;
    transformed.d3MfgApproval2At = report.d3_mfg_approval_2_at;
    transformed.d3MfgApproval2Comments = report.d3_mfg_approval_2_comments;
    // Approval Step 3
    transformed.d3MfgApproval3Status = report.d3_mfg_approval_3_status;
    transformed.d3MfgApproval3By = report.d3_mfg_approval_3_by;
    transformed.d3MfgApproval3At = report.d3_mfg_approval_3_at;
    transformed.d3MfgApproval3Comments = report.d3_mfg_approval_3_comments;

    // D3-MFG status and current step
    transformed.d3MfgStatus = report.d3_mfg_status;
    transformed.d3MfgCurrentApprovalStep = report.d3_mfg_current_approval_step;

    // Manual mapping for D6 approval fields
    // Approval Step 1
    transformed.d6Approval1Status = report.d6_approval_1_status;
    transformed.d6Approval1By = report.d6_approval_1_by;
    transformed.d6Approval1At = report.d6_approval_1_at;
    transformed.d6Approval1Comments = report.d6_approval_1_comments;
    // Approval Step 2
    transformed.d6Approval2Status = report.d6_approval_2_status;
    transformed.d6Approval2By = report.d6_approval_2_by;
    transformed.d6Approval2At = report.d6_approval_2_at;
    transformed.d6Approval2Comments = report.d6_approval_2_comments;
    // Approval Step 3
    transformed.d6Approval3Status = report.d6_approval_3_status;
    transformed.d6Approval3By = report.d6_approval_3_by;
    transformed.d6Approval3At = report.d6_approval_3_at;
    transformed.d6Approval3Comments = report.d6_approval_3_comments;

    // D6 status and current step
    transformed.d6Status = report.d6_status;
    transformed.d6CurrentApprovalStep = report.d6_current_approval_step;

    // Manual mapping for D7 approval fields
    // Approval Step 1
    transformed.d7Approval1Status = report.d7_approval_1_status;
    transformed.d7Approval1By = report.d7_approval_1_by;
    transformed.d7Approval1At = report.d7_approval_1_at;
    transformed.d7Approval1Comments = report.d7_approval_1_comments;
    // Approval Step 2
    transformed.d7Approval2Status = report.d7_approval_2_status;
    transformed.d7Approval2By = report.d7_approval_2_by;
    transformed.d7Approval2At = report.d7_approval_2_at;
    transformed.d7Approval2Comments = report.d7_approval_2_comments;
    // Approval Step 3
    transformed.d7Approval3Status = report.d7_approval_3_status;
    transformed.d7Approval3By = report.d7_approval_3_by;
    transformed.d7Approval3At = report.d7_approval_3_at;
    transformed.d7Approval3Comments = report.d7_approval_3_comments;

    // D7 status and current step
    transformed.d7Status = report.d7_status;
    transformed.d7CurrentApprovalStep = report.d7_current_approval_step;

    // Parse JSONB fields from strings to objects/arrays
    // PostgreSQL returns JSONB columns as JSON strings, we need to parse them
    if (transformed.d8FollowupActions && typeof transformed.d8FollowupActions === 'string') {
      try {
        transformed.d8FollowupActions = JSON.parse(transformed.d8FollowupActions);
      } catch (e) {
        transformed.d8FollowupActions = [];
      }
    }

    if (transformed.d8EvidenceDocumentation && typeof transformed.d8EvidenceDocumentation === 'string') {
      try {
        transformed.d8EvidenceDocumentation = JSON.parse(transformed.d8EvidenceDocumentation);
      } catch (e) {
        transformed.d8EvidenceDocumentation = [];
      }
    }

    if (transformed.d1TeamMembers && typeof transformed.d1TeamMembers === 'string') {
      try {
        transformed.d1TeamMembers = JSON.parse(transformed.d1TeamMembers);
      } catch (e) {
        transformed.d1TeamMembers = [];
      }
    }

    if (transformed.d3ContainmentActions && typeof transformed.d3ContainmentActions === 'string') {
      try {
        transformed.d3ContainmentActions = JSON.parse(transformed.d3ContainmentActions);
      } catch (e) {
        transformed.d3ContainmentActions = [];
      }
    }

    if (transformed.d4RootCauses && typeof transformed.d4RootCauses === 'string') {
      try {
        transformed.d4RootCauses = JSON.parse(transformed.d4RootCauses);
      } catch (e) {
        transformed.d4RootCauses = [];
      }
    }

    if (transformed.escalationPath && typeof transformed.escalationPath === 'string') {
      try {
        transformed.escalationPath = JSON.parse(transformed.escalationPath);
      } catch (e) {
        transformed.escalationPath = [];
      }
    }

    res.json({
      success: true,
      report: transformed
    });

  } catch (error) {
    console.error('❌ Error fetching 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching 8D report',
      error: error.message
    });
  }
}

// Update 8D report (including D3 data)
async function updateEightDReport(req, res) {
  const client = await require('../config/database').pool.connect();

  try {
    const { reportId } = req.params;
    console.log(`🔄 Updating 8D report: ${reportId}`);
    console.log('📦 Update data:', JSON.stringify(req.body, null, 2));

    await client.query('BEGIN');

    // Check if report exists - determine if reportId is numeric or string
    const isNumericId = !isNaN(parseInt(reportId)) && reportId === parseInt(reportId).toString();
    const reportCheck = await client.query(
      isNumericId
        ? 'SELECT id FROM eightd_reports WHERE id = $1'
        : 'SELECT id FROM eightd_reports WHERE report_id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const actualReportId = reportCheck.rows[0].id;

    // Extract all possible fields from request body
    const {
      // Basic info
      title,
      description,
      severity,
      problem_type,
      supplier_name,
      supplier_account,
      part_number,
      part_name,
      tipo_issue,
      tipo_resp,
      timing_occurrence,
      issue_date,
      target_closure_date,
      customer_impact,

      // D3 fields
      d3Data,

      // D1-D2-D3 approval status
      d1_d2_d3_approval_status,

      // D1-D2-D3 sequential approval fields
      current_approval_step,
      approval_1_status,
      approval_1_by,
      approval_1_at,
      approval_1_comments,
      approval_2_status,
      approval_2_by,
      approval_2_at,
      approval_2_comments,
      approval_3_status,
      approval_3_by,
      approval_3_at,
      approval_3_comments,

      // D3-MFG fields (Manufacturing Containment)
      d3_mfg_temporary_controls,
      d3_mfg_inspection_points,
      d3_mfg_parameters_adjusted,
      d3_mfg_poka_yoke_devices,
      d3_mfg_line_modifications,
      d3_mfg_operator_training,
      d3_mfg_effectiveness_validation,
      d3_mfg_others,
      d3_mfg_responsible_user_id,
      d3_mfg_responsible_user_ids,
      d3_mfg_implementation_date,
      d3_mfg_completed,
      d3_mfg_completed_at,
      d3_mfg_status,
      d3_mfg_current_approval_step,

      // D4-D5-D6 fields
      // D4 fields
      d4_root_cause,
      d4_4m_evaluation,
      d4_5whys_analysis,
      d4_delay_history,
      d4_temporary_countermeasure,
      d4_responsible_user_id,
      d4_implementation_date,
      d4_effectiveness_evaluation,
      d4_five_whys_analysis,
      d4_fishbone_analysis,
      d4_analysis_technique,
      d4_verification_method,
      d4_verification_evidence,
      d4_verification_responsible_user_id,
      d4_completed,
      d4_completed_at,
      d4_status,
      d4_current_approval_step,
      // D5 fields
      d5_final_root_cause,
      d5_analysis_responsible_user_id,
      d5_corrective_actions,
      d5_completed,
      d5_completed_at,
      // D6 fields
      d6_definitive_actions,
      d6_countermeasure_description,
      d6_implementation_plan,
      d6_validation_results,
      d6_quality_approval_status,
      d6_quality_approved_by,
      d6_quality_approved_at,
      d6_quality_approval_comments,
      d6_completed,
      d6_completed_at,

      // D7 fields
      d7_completed,
      d7_completed_at,

      // D8 fields
      d8_followup_actions,
      d8_evidence_documentation,
      d8_closure_notes,
      d8_lessons_learned,
      d8_closed_by,
      d8_closed_at,
      d8_completed,
      d8_completed_at,

      // Process flow
      process_flow,

      // Escalation path with user arrays
      escalation_path,

      // Status
      status,
      current_step,
      progress_percentage,

      // Responsible department
      department_id
    } = req.body;

    // Debug D8 fields
    console.log('🔍 D8 Debug - d8_followup_actions:', d8_followup_actions);
    console.log('🔍 D8 Debug - typeof:', typeof d8_followup_actions);

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Add basic fields if provided
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (severity !== undefined) {
      updates.push(`severity = $${paramIndex++}`);
      values.push(severity);
    }
    if (problem_type !== undefined) {
      updates.push(`problem_type = $${paramIndex++}`);
      values.push(problem_type);
    }
    if (supplier_name !== undefined) {
      updates.push(`supplier_name = $${paramIndex++}`);
      values.push(supplier_name);
    }
    if (supplier_account !== undefined) {
      updates.push(`supplier_account = $${paramIndex++}`);
      values.push(supplier_account);
    }
    if (part_number !== undefined) {
      updates.push(`part_number = $${paramIndex++}`);
      values.push(part_number);
    }
    if (part_name !== undefined) {
      updates.push(`part_name = $${paramIndex++}`);
      values.push(part_name);
    }
    if (tipo_issue !== undefined) {
      updates.push(`tipo_issue = $${paramIndex++}`);
      values.push(tipo_issue);
    }
    if (tipo_resp !== undefined) {
      updates.push(`tipo_resp = $${paramIndex++}`);
      values.push(tipo_resp);
    }
    if (timing_occurrence !== undefined) {
      updates.push(`timing_occurrence = $${paramIndex++}`);
      values.push(timing_occurrence);
    }
    if (issue_date !== undefined) {
      updates.push(`issue_date = $${paramIndex++}`);
      values.push(issue_date);
    }
    if (target_closure_date !== undefined) {
      updates.push(`target_closure_date = $${paramIndex++}`);
      values.push(target_closure_date);
    }
    if (customer_impact !== undefined) {
      updates.push(`customer_impact = $${paramIndex++}`);
      values.push(customer_impact);
    }
    if (department_id !== undefined) {
      updates.push(`department_id = $${paramIndex++}`);
      values.push(department_id || null);
    }

    // Add D3 fields if provided
    if (d3Data) {
      if (d3Data.detectionPoints !== undefined) {
        updates.push(`d3_detection_points = $${paramIndex++}`);
        values.push(JSON.stringify(d3Data.detectionPoints));
      }
      if (d3Data.nonDetectionReasons !== undefined) {
        updates.push(`d3_non_detection_reasons = $${paramIndex++}`);
        values.push(JSON.stringify(d3Data.nonDetectionReasons));
      }
      if (d3Data.suspectMaterialDisposal !== undefined) {
        updates.push(`d3_suspect_material_disposal = $${paramIndex++}`);
        values.push(d3Data.suspectMaterialDisposal);
      }
      if (d3Data.conformanceMaterialGuarantee !== undefined) {
        updates.push(`d3_conformance_guarantee = $${paramIndex++}`);
        values.push(d3Data.conformanceMaterialGuarantee);
      }
      if (d3Data.requiresRework !== undefined) {
        updates.push(`d3_requires_rework = $${paramIndex++}`);
        values.push(d3Data.requiresRework);
      }
      if (d3Data.reworkUnitCost !== undefined) {
        updates.push(`d3_rework_unit_cost = $${paramIndex++}`);
        values.push(parseFloat(d3Data.reworkUnitCost) || 0);
      }
      if (d3Data.realImpactCost !== undefined) {
        updates.push(`d3_real_impact_cost = $${paramIndex++}`);
        values.push(parseFloat(d3Data.realImpactCost) || 0);
      }
    }

    // Add D1-D2-D3 approval status if provided
    if (d1_d2_d3_approval_status !== undefined) {
      updates.push(`d1_d2_d3_approval_status = $${paramIndex++}`);
      values.push(d1_d2_d3_approval_status);
    }

    // Add D1-D2-D3 sequential approval fields if provided
    if (current_approval_step !== undefined) {
      updates.push(`current_approval_step = $${paramIndex++}`);
      values.push(current_approval_step);
    }

    // Approval 1 fields
    if (approval_1_status !== undefined) {
      updates.push(`approval_1_status = $${paramIndex++}`);
      values.push(approval_1_status);
    }
    if (approval_1_by !== undefined) {
      updates.push(`approval_1_by = $${paramIndex++}`);
      values.push(approval_1_by);
    }
    if (approval_1_at !== undefined) {
      updates.push(`approval_1_at = $${paramIndex++}`);
      values.push(approval_1_at);
    }
    if (approval_1_comments !== undefined) {
      updates.push(`approval_1_comments = $${paramIndex++}`);
      values.push(approval_1_comments);
    }

    // Approval 2 fields
    if (approval_2_status !== undefined) {
      updates.push(`approval_2_status = $${paramIndex++}`);
      values.push(approval_2_status);
    }
    if (approval_2_by !== undefined) {
      updates.push(`approval_2_by = $${paramIndex++}`);
      values.push(approval_2_by);
    }
    if (approval_2_at !== undefined) {
      updates.push(`approval_2_at = $${paramIndex++}`);
      values.push(approval_2_at);
    }
    if (approval_2_comments !== undefined) {
      updates.push(`approval_2_comments = $${paramIndex++}`);
      values.push(approval_2_comments);
    }

    // Approval 3 fields
    if (approval_3_status !== undefined) {
      updates.push(`approval_3_status = $${paramIndex++}`);
      values.push(approval_3_status);
    }
    if (approval_3_by !== undefined) {
      updates.push(`approval_3_by = $${paramIndex++}`);
      values.push(approval_3_by);
    }
    if (approval_3_at !== undefined) {
      updates.push(`approval_3_at = $${paramIndex++}`);
      values.push(approval_3_at);
    }
    if (approval_3_comments !== undefined) {
      updates.push(`approval_3_comments = $${paramIndex++}`);
      values.push(approval_3_comments);
    }

    // Add D3-MFG fields if provided
    if (d3_mfg_temporary_controls !== undefined) {
      updates.push(`d3_mfg_temporary_controls = $${paramIndex++}`);
      // Only stringify if it's not already a string
      values.push(typeof d3_mfg_temporary_controls === 'string' ? d3_mfg_temporary_controls : JSON.stringify(d3_mfg_temporary_controls));
    }
    if (d3_mfg_inspection_points !== undefined) {
      updates.push(`d3_mfg_inspection_points = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_inspection_points));
    }
    if (d3_mfg_parameters_adjusted !== undefined) {
      updates.push(`d3_mfg_parameters_adjusted = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_parameters_adjusted));
    }
    if (d3_mfg_poka_yoke_devices !== undefined) {
      updates.push(`d3_mfg_poka_yoke_devices = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_poka_yoke_devices));
    }
    if (d3_mfg_line_modifications !== undefined) {
      updates.push(`d3_mfg_line_modifications = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_line_modifications));
    }
    if (d3_mfg_operator_training !== undefined) {
      updates.push(`d3_mfg_operator_training = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_operator_training));
    }
    if (d3_mfg_effectiveness_validation !== undefined) {
      updates.push(`d3_mfg_effectiveness_validation = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_effectiveness_validation));
    }
    if (d3_mfg_others !== undefined) {
      updates.push(`d3_mfg_others = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_others));
    }
    if (d3_mfg_responsible_user_id !== undefined) {
      updates.push(`d3_mfg_responsible_user_id = $${paramIndex++}`);
      values.push(d3_mfg_responsible_user_id);
    }
    if (d3_mfg_responsible_user_ids !== undefined) {
      updates.push(`d3_mfg_responsible_user_ids = $${paramIndex++}`);
      values.push(JSON.stringify(d3_mfg_responsible_user_ids));
    }
    if (d3_mfg_implementation_date !== undefined) {
      updates.push(`d3_mfg_implementation_date = $${paramIndex++}`);
      // Convert empty string to null to avoid PostgreSQL date validation error
      values.push(d3_mfg_implementation_date === '' ? null : d3_mfg_implementation_date);
    }
    if (d3_mfg_completed !== undefined) {
      updates.push(`d3_mfg_completed = $${paramIndex++}`);
      values.push(d3_mfg_completed);
    }
    if (d3_mfg_completed_at !== undefined) {
      updates.push(`d3_mfg_completed_at = $${paramIndex++}`);
      values.push(d3_mfg_completed_at);
    }
    if (d3_mfg_status !== undefined) {
      updates.push(`d3_mfg_status = $${paramIndex++}`);
      values.push(d3_mfg_status);
    }
    if (d3_mfg_current_approval_step !== undefined) {
      updates.push(`d3_mfg_current_approval_step = $${paramIndex++}`);
      values.push(d3_mfg_current_approval_step);
    }

    // Add D4-D5-D6 fields if provided
    // D4 fields
    if (d4_root_cause !== undefined) {
      updates.push(`d4_root_cause = $${paramIndex++}`);
      values.push(d4_root_cause);
    }
    if (d4_4m_evaluation !== undefined) {
      updates.push(`d4_4m_evaluation = $${paramIndex++}`);
      values.push(JSON.stringify(d4_4m_evaluation));
    }
    if (d4_5whys_analysis !== undefined) {
      updates.push(`d4_5whys_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(d4_5whys_analysis));
    }
    if (d4_delay_history !== undefined) {
      updates.push(`d4_delay_history = $${paramIndex++}`);
      values.push(JSON.stringify(d4_delay_history));
    }
    if (d4_temporary_countermeasure !== undefined) {
      updates.push(`d4_temporary_countermeasure = $${paramIndex++}`);
      values.push(d4_temporary_countermeasure);
    }
    if (d4_responsible_user_id !== undefined) {
      updates.push(`d4_responsible_user_id = $${paramIndex++}`);
      values.push(d4_responsible_user_id);
    }
    if (d4_implementation_date !== undefined) {
      updates.push(`d4_implementation_date = $${paramIndex++}`);
      values.push(d4_implementation_date);
    }
    if (d4_effectiveness_evaluation !== undefined) {
      updates.push(`d4_effectiveness_evaluation = $${paramIndex++}`);
      values.push(d4_effectiveness_evaluation);
    }
    if (d4_five_whys_analysis !== undefined) {
      updates.push(`d4_five_whys_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(d4_five_whys_analysis));
    }
    if (d4_fishbone_analysis !== undefined) {
      updates.push(`d4_fishbone_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(d4_fishbone_analysis));
    }
    if (d4_analysis_technique !== undefined) {
      updates.push(`d4_analysis_technique = $${paramIndex++}`);
      values.push(d4_analysis_technique);
    }
    if (d4_verification_method !== undefined) {
      updates.push(`d4_verification_method = $${paramIndex++}`);
      values.push(d4_verification_method);
    }
    if (d4_verification_evidence !== undefined) {
      updates.push(`d4_verification_evidence = $${paramIndex++}`);
      values.push(d4_verification_evidence);
    }
    if (d4_verification_responsible_user_id !== undefined) {
      updates.push(`d4_verification_responsible_user_id = $${paramIndex++}`);
      values.push(d4_verification_responsible_user_id);
    }
    if (d4_completed !== undefined) {
      updates.push(`d4_completed = $${paramIndex++}`);
      values.push(d4_completed);
    }
    if (d4_completed_at !== undefined) {
      updates.push(`d4_completed_at = $${paramIndex++}`);
      values.push(d4_completed_at);
    }
    if (d4_status !== undefined) {
      updates.push(`d4_status = $${paramIndex++}`);
      values.push(d4_status);
    }
    if (d4_current_approval_step !== undefined) {
      updates.push(`d4_current_approval_step = $${paramIndex++}`);
      values.push(d4_current_approval_step);
    }

    // D5 fields
    if (d5_final_root_cause !== undefined) {
      updates.push(`d5_final_root_cause = $${paramIndex++}`);
      values.push(d5_final_root_cause);
    }
    if (d5_analysis_responsible_user_id !== undefined) {
      updates.push(`d5_analysis_responsible_user_id = $${paramIndex++}`);
      values.push(d5_analysis_responsible_user_id);
    }
    if (d5_corrective_actions !== undefined) {
      updates.push(`d5_corrective_actions = $${paramIndex++}`);
      values.push(JSON.stringify(d5_corrective_actions));
    }
    if (d5_completed !== undefined) {
      updates.push(`d5_completed = $${paramIndex++}`);
      values.push(d5_completed);
    }
    if (d5_completed_at !== undefined) {
      updates.push(`d5_completed_at = $${paramIndex++}`);
      values.push(d5_completed_at);
    }

    // D6 fields
    if (d6_definitive_actions !== undefined) {
      updates.push(`d6_definitive_actions = $${paramIndex++}`);
      values.push(JSON.stringify(d6_definitive_actions));
    }
    if (d6_countermeasure_description !== undefined) {
      updates.push(`d6_countermeasure_description = $${paramIndex++}`);
      values.push(d6_countermeasure_description);
    }
    if (d6_implementation_plan !== undefined) {
      updates.push(`d6_implementation_plan = $${paramIndex++}`);
      values.push(JSON.stringify(d6_implementation_plan));
    }
    if (d6_validation_results !== undefined) {
      updates.push(`d6_validation_results = $${paramIndex++}`);
      values.push(JSON.stringify(d6_validation_results));
    }
    if (d6_quality_approval_status !== undefined) {
      updates.push(`d6_quality_approval_status = $${paramIndex++}`);
      values.push(d6_quality_approval_status);
    }
    if (d6_quality_approved_by !== undefined) {
      updates.push(`d6_quality_approved_by = $${paramIndex++}`);
      values.push(d6_quality_approved_by);
    }
    if (d6_quality_approved_at !== undefined) {
      updates.push(`d6_quality_approved_at = $${paramIndex++}`);
      values.push(d6_quality_approved_at);
    }
    if (d6_quality_approval_comments !== undefined) {
      updates.push(`d6_quality_approval_comments = $${paramIndex++}`);
      values.push(d6_quality_approval_comments);
    }
    if (d6_completed !== undefined) {
      updates.push(`d6_completed = $${paramIndex++}`);
      values.push(d6_completed);
    }
    if (d6_completed_at !== undefined) {
      updates.push(`d6_completed_at = $${paramIndex++}`);
      values.push(d6_completed_at);
    }

    // Add D7 fields if provided
    if (d7_completed !== undefined) {
      updates.push(`d7_completed = $${paramIndex++}`);
      values.push(d7_completed);
    }
    if (d7_completed_at !== undefined) {
      updates.push(`d7_completed_at = $${paramIndex++}`);
      values.push(d7_completed_at);
    }

    // Add D8 fields if provided
    // D8 fields
    if (d8_followup_actions !== undefined) {
      updates.push(`d8_followup_actions = $${paramIndex++}`);
      values.push(JSON.stringify(d8_followup_actions));
    }
    if (d8_evidence_documentation !== undefined) {
      updates.push(`d8_evidence_documentation = $${paramIndex++}`);
      values.push(JSON.stringify(d8_evidence_documentation));
    }
    if (d8_closure_notes !== undefined) {
      updates.push(`d8_closure_notes = $${paramIndex++}`);
      values.push(d8_closure_notes);
    }
    if (d8_lessons_learned !== undefined) {
      updates.push(`d8_lessons_learned = $${paramIndex++}`);
      values.push(d8_lessons_learned);
    }
    if (d8_closed_by !== undefined) {
      updates.push(`d8_closed_by = $${paramIndex++}`);
      values.push(d8_closed_by);
    }
    if (d8_closed_at !== undefined) {
      updates.push(`d8_closed_at = $${paramIndex++}`);
      values.push(d8_closed_at);
    }
    if (d8_completed !== undefined) {
      updates.push(`d8_completed = $${paramIndex++}`);
      values.push(d8_completed);
    }
    if (d8_completed_at !== undefined) {
      updates.push(`d8_completed_at = $${paramIndex++}`);
      values.push(d8_completed_at);
    }

    // Add process flow if provided
    if (process_flow !== undefined) {
      updates.push(`process_flow = $${paramIndex++}`);
      values.push(JSON.stringify(process_flow));
    }

    // Add escalation path if provided
    if (escalation_path !== undefined) {
      updates.push(`escalation_path = $${paramIndex++}`);
      values.push(JSON.stringify(escalation_path));
    }

    // Add status fields if provided
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (current_step !== undefined) {
      updates.push(`current_step = $${paramIndex++}`);
      values.push(current_step);
    }
    if (progress_percentage !== undefined) {
      updates.push(`progress_percentage = $${paramIndex++}`);
      values.push(progress_percentage);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add report ID to values
    values.push(actualReportId);

    // Execute update
    const updateQuery = `
      UPDATE eightd_reports
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');

    console.log(`✅ 8D report ${reportId} updated successfully`);

    // Log audit trail
    try {
      const { logAction } = require('../utils/auditLog');
      const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Usuario';

      // Detectar qué sección se modificó basado en los campos del body
      let sectionName = null;
      if (d3Data) sectionName = 'd3';
      else if (d3_mfg_temporary_controls !== undefined || d3_mfg_inspection_points !== undefined) sectionName = 'd3_mfg';
      else if (d4_root_cause_analysis !== undefined || d4_why_analysis !== undefined) sectionName = 'd4';
      else if (d5_corrective_actions !== undefined) sectionName = 'd5';
      else if (d6_definitive_actions !== undefined || d6_implementation_plan !== undefined) sectionName = 'd6';
      else if (d7_preventive_actions !== undefined || d7_audit_items !== undefined) sectionName = 'd7';
      else if (d8_followup_actions !== undefined || d8_closure_notes !== undefined) sectionName = 'd8';
      else if (title !== undefined || description !== undefined || severity !== undefined) sectionName = 'd1_d2';

      // Log envío a aprobación D3
      if (d1_d2_d3_approval_status && d1_d2_d3_approval_status.startsWith('pending_approval_')) {
        const step = d1_d2_d3_approval_status.replace('pending_approval_', '');
        await logAction({
          reportId: actualReportId,
          userId: req.user?.id,
          userName,
          actionType: 'submitted_for_approval',
          actionCategory: 'approval',
          sectionName: 'd3',
          description: `D3 enviado a aprobación (Paso ${step})`,
          newValue: { status: d1_d2_d3_approval_status, step: parseInt(step) }
        });
      }
      // Log guardado de borrador (solo si hay sección detectada y NO es envío a aprobación)
      else if (sectionName) {
        await logAction({
          reportId: actualReportId,
          userId: req.user?.id,
          userName,
          actionType: 'draft_saved',
          actionCategory: 'section',
          sectionName,
          description: `Borrador guardado en ${sectionName.toUpperCase().replace('_', '-')}`
        });
      }
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
    }

    res.json({
      success: true,
      message: '8D report updated successfully',
      report: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating 8D report',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Get reports assigned to current user
async function getMyAssignedReports(req, res) {
  try {
    const userId = req.user.id;
    console.log(`🔄 Fetching assigned reports for user: ${userId}`);

    const myReportsQuery = `
      SELECT
        r.id,
        r.report_id,
        r.title,
        r.supplier_name,
        r.severity,
        r.status,
        r.created_at,
        r.updated_at,
        r.d1_d2_d3_approval_status,
        r.current_approval_step,
        r.escalation_path,
        r.estimated_cost,
        creator.first_name || ' ' || creator.last_name as created_by_name
      FROM eightd_reports r
      LEFT JOIN users creator ON r.created_by = creator.id
      WHERE
        r.created_by = $1
        OR r.escalation_path::text LIKE '%' || $1 || '%'
      ORDER BY r.updated_at DESC
    `;

    const result = await query(myReportsQuery, [userId]);

    // Determine detailed status for each report
    const reportsWithStatus = result.rows.map(report => {
      let detailedStatus = 'draft';
      let phase = 'D1-D2-D3';

      // Determine phase and status based on d1_d2_d3_approval_status
      if (report.d1_d2_d3_approval_status) {
        const approvalStatus = report.d1_d2_d3_approval_status;

        if (approvalStatus === 'draft') {
          detailedStatus = 'Draft';
          phase = 'D1-D2-D3';
        } else if (approvalStatus.startsWith('pending_approval')) {
          detailedStatus = 'Under Approval';
          phase = 'D1-D2-D3';
        } else if (approvalStatus.startsWith('rejected_by')) {
          detailedStatus = 'Rejected - Needs Revision';
          phase = 'D1-D2-D3';
        } else if (approvalStatus === 'approved') {
          // D1-D2-D3 approved, now in D4-D5
          detailedStatus = 'Under Countermeasure';
          phase = 'D4-D5';
        }
      }

      // If general status is 'closed', override
      if (report.status === 'closed') {
        detailedStatus = 'Closed';
        phase = 'D8';
      }

      return {
        ...report,
        detailedStatus,
        phase
      };
    });

    console.log(`✅ Found ${reportsWithStatus.length} assigned reports`);

    res.json({
      success: true,
      reports: transformToCamelCase(reportsWithStatus)
    });
  } catch (error) {
    console.error('❌ Error fetching assigned reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned reports',
      error: error.message
    });
  }
}

// ============================================================================
// D6 APPROVAL ENDPOINTS
// ============================================================================

/**
 * Approve D6 (Definitive Countermeasure)
 * POST /8d/reports/:reportId/d6/approve
 * Body: { comments: string (optional) }
 */
async function approveD6(req, res) {
  const client = await require('../config/database').pool.connect();

  try {
    const { reportId } = req.params;
    const { comments } = req.body;
    const userId = req.user ? req.user.id : null;

    console.log(`✅ Quality approving D6 for report ${reportId}`);

    await client.query('BEGIN');

    // Verify report exists
    const isNumericId = !isNaN(parseInt(reportId)) && reportId === parseInt(reportId).toString();
    const reportCheck = await client.query(
      isNumericId
        ? 'SELECT id, d6_quality_approval_status, d6_completed FROM eightd_reports WHERE id = $1'
        : 'SELECT id, d6_quality_approval_status, d6_completed FROM eightd_reports WHERE report_id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportCheck.rows[0];
    const actualReportId = report.id;

    // Validate D6 is completed before approving
    if (!report.d6_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D6 must be completed before approval'
      });
    }

    // Update D6 approval status
    await client.query(
      `UPDATE eightd_reports
       SET d6_quality_approval_status = 'approved',
           d6_quality_approved_by = $1,
           d6_quality_approved_at = NOW(),
           d6_quality_approval_comments = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [userId, comments || null, actualReportId]
    );

    await client.query('COMMIT');

    console.log(`✅ D6 approved for report ${reportId}`);

    res.json({
      success: true,
      message: '🎉 D6 Contramedida Definitiva aprobada. El reporte puede continuar.',
      approvalStatus: 'approved'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D6:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar D6',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Reject D6 (Definitive Countermeasure)
 * POST /8d/reports/:reportId/d6/reject
 * Body: { comments: string (required) }
 */
async function rejectD6(req, res) {
  const client = await require('../config/database').pool.connect();

  try {
    const { reportId } = req.params;
    const { comments } = req.body;
    const userId = req.user ? req.user.id : null;

    // Validate comments are required for rejection
    if (!comments || comments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Los comentarios son obligatorios para rechazar D6'
      });
    }

    console.log(`❌ Quality rejecting D6 for report ${reportId}`);

    await client.query('BEGIN');

    // Verify report exists
    const isNumericId = !isNaN(parseInt(reportId)) && reportId === parseInt(reportId).toString();
    const reportCheck = await client.query(
      isNumericId
        ? 'SELECT id, d6_quality_approval_status FROM eightd_reports WHERE id = $1'
        : 'SELECT id, d6_quality_approval_status FROM eightd_reports WHERE report_id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportCheck.rows[0];
    const actualReportId = report.id;

    // Update D6 approval status to rejected
    await client.query(
      `UPDATE eightd_reports
       SET d6_quality_approval_status = 'rejected',
           d6_quality_approved_by = $1,
           d6_quality_approved_at = NOW(),
           d6_quality_approval_comments = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [userId, comments.trim(), actualReportId]
    );

    await client.query('COMMIT');

    console.log(`❌ D6 rejected for report ${reportId}`);

    res.json({
      success: true,
      message: 'D6 rechazada. Se requieren correcciones según los comentarios.',
      approvalStatus: 'rejected',
      rejectedBy: 'quality'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error rejecting D6:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar D6',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Update only the parts section (Client, Project, Parts)
 * PUT /8d/reports/:reportId/update-parts
 * Body: { selectedClient, selectedProject, selectedParts }
 */
async function updatePartsOnly(req, res) {
  const client = await require('../config/database').pool.connect();

  try {
    const { reportId } = req.params;
    const { selectedClient, selectedProject, selectedParts } = req.body;

    console.log(`🔄 Updating parts for report ${reportId}`);

    await client.query('BEGIN');

    // Check if report exists
    const isNumericId = !isNaN(parseInt(reportId)) && reportId === parseInt(reportId).toString();
    const reportCheck = await client.query(
      isNumericId
        ? 'SELECT id FROM eightd_reports WHERE id = $1'
        : 'SELECT id FROM eightd_reports WHERE report_id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const actualReportId = reportCheck.rows[0].id;

    // Delete existing parts for this report
    await client.query(
      'DELETE FROM eightd_parts WHERE report_id = $1',
      [actualReportId]
    );

    console.log(`🗑️ Deleted existing parts for report ${actualReportId}`);

    // Insert new parts
    if (selectedParts && selectedParts.length > 0) {
      const insertPartQuery = `
        INSERT INTO eightd_parts (
          report_id,
          client_id,
          client_name,
          project_id,
          project_number,
          project_name,
          part_id,
          part_number,
          part_name,
          client_part_number,
          revision,
          description,
          unit_cost,
          currency,
          specifications,
          qty_warehouse,
          qty_in_process,
          qty_in_transit,
          qty_with_customer,
          total_affected_qty,
          total_cost_impact
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
      `;

      for (const part of selectedParts) {
        // Prepare specifications as JSON
        const specifications = {
          weight: part.weight || null,
          snpQuantity: part.snpQuantity || null,
          snpVolume: part.snpVolume || null
        };

        await client.query(insertPartQuery, [
          actualReportId,
          selectedClient?.id || null,
          selectedClient?.name || selectedClient?.client_name || null,
          selectedProject?.id || null,
          selectedProject?.projectNumber || selectedProject?.project_number || null,
          selectedProject?.projectName || selectedProject?.project_name || null,
          part.id || null,
          part.partNumber || part.part_number || null,
          part.partName || part.part_name || null,
          part.clientPartNumber || part.client_part_number || null,
          part.revision || null,
          part.description || null,
          part.unitCost || part.unit_cost || 0,
          part.currency || 'USD',
          JSON.stringify(specifications),
          part.qtyWarehouse || part.qty_warehouse || 0,
          part.qtyInProcess || part.qty_in_process || 0,
          part.qtyInTransit || part.qty_in_transit || 0,
          part.qtyWithCustomer || part.qty_with_customer || 0,
          part.totalAffectedQty || part.total_affected_qty || 0,
          part.totalCostImpact || part.total_cost_impact || 0
        ]);
      }

      console.log(`✅ Inserted ${selectedParts.length} parts for report ${actualReportId}`);
    }

    // Calculate total cost impact from all parts
    let totalEstimatedCost = 0;
    if (selectedParts && selectedParts.length > 0) {
      totalEstimatedCost = selectedParts.reduce((sum, part) => {
        return sum + (parseFloat(part.totalCostImpact) || parseFloat(part.total_cost_impact) || 0);
      }, 0);
    }

    // Update timestamp and estimated_cost on main report
    await client.query(
      'UPDATE eightd_reports SET updated_at = NOW(), estimated_cost = $1 WHERE id = $2',
      [totalEstimatedCost, actualReportId]
    );
    console.log(`💰 estimated_cost actualizado a ${totalEstimatedCost} para reporte ${actualReportId}`);

    await client.query('COMMIT');

    // Get updated report
    const updatedReport = await client.query(
      'SELECT * FROM eightd_reports WHERE id = $1',
      [actualReportId]
    );

    // Get updated parts
    const updatedParts = await client.query(
      'SELECT * FROM eightd_parts WHERE report_id = $1 ORDER BY created_at',
      [actualReportId]
    );

    console.log(`✅ Parts updated for report ${reportId}`);

    // Combine report with parts
    const reportWithParts = {
      ...updatedReport.rows[0],
      parts: updatedParts.rows,
      total_parts: updatedParts.rows.length
    };

    res.json({
      success: true,
      message: 'Partes afectadas actualizadas correctamente',
      report: transformToCamelCase(reportWithParts)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar partes',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Update only the D3 section (Containment)
 * PUT /8d/reports/:reportId/update-d3
 * Body: { d3Data }
 */
async function updateD3Only(req, res) {
  const client = await require('../config/database').pool.connect();

  try {
    const { reportId } = req.params;
    const { d3Data } = req.body;

    console.log(`🔄 Updating D3 for report ${reportId}`);

    await client.query('BEGIN');

    // Check if report exists
    const isNumericId = !isNaN(parseInt(reportId)) && reportId === parseInt(reportId).toString();
    const reportCheck = await client.query(
      isNumericId
        ? 'SELECT id FROM eightd_reports WHERE id = $1'
        : 'SELECT id FROM eightd_reports WHERE report_id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const actualReportId = reportCheck.rows[0].id;

    // Update only D3 fields (individual columns)
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (d3Data) {
      if (d3Data.detectionPoints !== undefined) {
        updates.push(`d3_detection_points = $${paramIndex++}`);
        values.push(JSON.stringify(d3Data.detectionPoints));
      }
      if (d3Data.nonDetectionReasons !== undefined) {
        updates.push(`d3_non_detection_reasons = $${paramIndex++}`);
        values.push(JSON.stringify(d3Data.nonDetectionReasons));
      }
      if (d3Data.suspectMaterialDisposal !== undefined) {
        updates.push(`d3_suspect_material_disposal = $${paramIndex++}`);
        values.push(d3Data.suspectMaterialDisposal);
      }
      if (d3Data.conformanceMaterialGuarantee !== undefined) {
        updates.push(`d3_conformance_guarantee = $${paramIndex++}`);
        values.push(d3Data.conformanceMaterialGuarantee);
      }
      if (d3Data.requiresRework !== undefined) {
        updates.push(`d3_requires_rework = $${paramIndex++}`);
        values.push(d3Data.requiresRework);
      }
      if (d3Data.reworkUnitCost !== undefined) {
        updates.push(`d3_rework_unit_cost = $${paramIndex++}`);
        values.push(parseFloat(d3Data.reworkUnitCost) || 0);
      }
      if (d3Data.realImpactCost !== undefined) {
        updates.push(`d3_real_impact_cost = $${paramIndex++}`);
        values.push(parseFloat(d3Data.realImpactCost) || 0);
      }
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, nothing to update
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No D3 data provided to update'
      });
    }

    // Execute update
    values.push(actualReportId);
    const updateQuery = `UPDATE eightd_reports SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

    await client.query(updateQuery, values);

    // Actualizar estimated_cost basado en d3Data
    if (d3Data && (d3Data.requiresRework !== undefined || d3Data.reworkUnitCost !== undefined || d3Data.realImpactCost !== undefined)) {
      // Obtener datos actuales del reporte y partes
      const reportData = await client.query('SELECT d3_requires_rework, d3_rework_unit_cost FROM eightd_reports WHERE id = $1', [actualReportId]);
      const partsData = await client.query('SELECT total_affected_qty, total_cost_impact FROM eightd_parts WHERE report_id = $1', [actualReportId]);

      const requiresRework = d3Data.requiresRework !== undefined ? d3Data.requiresRework : reportData.rows[0]?.d3_requires_rework;
      const reworkUnitCost = d3Data.reworkUnitCost !== undefined ? parseFloat(d3Data.reworkUnitCost) : parseFloat(reportData.rows[0]?.d3_rework_unit_cost) || 0;

      let estimatedCost = 0;

      if (requiresRework === true) {
        // Costo = reworkUnitCost * totalAffectedQty
        const totalAffectedQty = partsData.rows.reduce((sum, part) => sum + (parseInt(part.total_affected_qty) || 0), 0);
        estimatedCost = reworkUnitCost * totalAffectedQty;
      } else if (requiresRework === false) {
        // Costo = suma de totalCostImpact de las partes
        estimatedCost = partsData.rows.reduce((sum, part) => sum + (parseFloat(part.total_cost_impact) || 0), 0);
      }

      await client.query('UPDATE eightd_reports SET estimated_cost = $1 WHERE id = $2', [estimatedCost, actualReportId]);
      console.log(`💰 estimated_cost actualizado a ${estimatedCost} para reporte ${reportId}`);
    }

    await client.query('COMMIT');

    // Get updated report
    const updatedReport = await client.query(
      'SELECT * FROM eightd_reports WHERE id = $1',
      [actualReportId]
    );

    // Get parts (needed for frontend to display correctly)
    const updatedParts = await client.query(
      'SELECT * FROM eightd_parts WHERE report_id = $1 ORDER BY created_at',
      [actualReportId]
    );

    console.log(`✅ D3 updated for report ${reportId}`);

    // Combine report with parts
    const reportWithParts = {
      ...updatedReport.rows[0],
      parts: updatedParts.rows,
      total_parts: updatedParts.rows.length
    };

    res.json({
      success: true,
      message: 'D3 (Contención) actualizada correctamente',
      report: transformToCamelCase(reportWithParts)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating D3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar D3',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Upload D6 evidence files
 * POST /8d/reports/:reportId/d6-evidence/upload
 */
async function uploadD6Evidence(req, res) {
  try {
    const { reportId } = req.params;
    const uploadedBy = req.user ? req.user.id : null;

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Verify report exists
    const reportCheck = await query(
      'SELECT id FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Build response with file information
    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      filename: file.filename,
      size: file.size,
      type: file.mimetype,
      url: `/uploads/${file.filename}`,
      uploadedBy: uploadedBy,
      uploadedAt: new Date().toISOString()
    }));

    console.log(`✅ Uploaded ${uploadedFiles.length} D6 evidence file(s)`);

    try {
      const { logAction } = require('../utils/auditLog');
      const userQuery = await query('SELECT first_name, last_name FROM users WHERE id = $1', [uploadedBy]);
      const userRow = userQuery.rows[0];
      const userName = userRow ? `${userRow.first_name} ${userRow.last_name}`.trim() : 'Sistema';
      for (const file of uploadedFiles) {
        await logAction({
          reportId: parseInt(reportId),
          actionType: 'file_uploaded',
          actionCategory: 'section',
          sectionName: 'd6',
          userId: uploadedBy,
          userName,
          description: `Archivo subido en D6: ${file.name}`,
          newValue: { fileName: file.name, fileType: file.type }
        });
      }
    } catch (auditError) {
      console.error('Error logging D6 file upload:', auditError);
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('❌ Error uploading D6 evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
}

/**
 * Delete D6 evidence file
 * DELETE /8d/reports/:reportId/d6-evidence/:filename
 */
async function deleteD6Evidence(req, res) {
  try {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');

    const filePath = path.join(__dirname, '..', 'uploads', filename);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted D6 evidence file: ${filename}`);
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting D6 evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
}

// DELETE 8D Report (admin only)
async function deleteEightDReport(req, res) {
  try {
    const { reportId } = req.params;
    const user = req.user;

    // Verificar que el usuario sea admin
    if (user.systemRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden eliminar reportes 8D'
      });
    }

    const result = await db.query(
      'DELETE FROM eightd_reports WHERE report_id = $1 OR id::text = $1 RETURNING id, report_id',
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    console.log(`🗑️ Reporte 8D eliminado: ${reportId} por usuario ${user.email}`);

    res.json({
      success: true,
      message: 'Reporte eliminado exitosamente',
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar reporte',
      error: error.message
    });
  }
}

module.exports = {
  createEightDReport,
  getEightDReportById,
  updateEightDReport,
  updatePartsOnly,
  updateD3Only,
  getMyAssignedReports,
  approveD6,
  rejectD6,
  uploadD6Evidence,
  deleteD6Evidence,
  deleteEightDReport
};
