const { query, pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const { logApproval, logRejection } = require('../utils/auditLog');

/**
 * Approve Step 1 (Approver 1 approves)
 * POST /8d/reports/:reportId/approve-step-1
 */
async function approveStep1(req, res) {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const userId = req.user ? req.user.id : null;

    console.log(`✅ Approver 1 approving report ${reportId}`);

    await client.query('BEGIN');

    // Verify report exists and is in correct state
    const reportCheck = await client.query(
      'SELECT id, current_approval_step, d1_d2_d3_approval_status FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    // Validate current step
    if (report.current_approval_step !== 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Report is not in step 1. Current step: ${report.current_approval_step}`
      });
    }

    // Check if next approvers exist
    const escalationCheck = await client.query(
      'SELECT escalation_path FROM eightd_reports WHERE id = $1',
      [reportId]
    );
    const escalationPath = escalationCheck.rows[0]?.escalation_path || {};
    const issueUsers = escalationPath.issue_users || [];

    // Determine next step based on available approvers
    // Index 0 = primary, Index 2 = approver2, Index 3 = approver3
    let nextStep = 4; // Default to approved
    let nextStatus = 'approved';

    if (issueUsers[2]) {
      nextStep = 2;
      nextStatus = 'pending_approval_2';
    } else if (issueUsers[3]) {
      nextStep = 3;
      nextStatus = 'pending_approval_3';
    }

    // Update to next step (skipping missing approvers)
    await client.query(
      `UPDATE eightd_reports
       SET current_approval_step = $1,
           d1_d2_d3_approval_status = $2,
           approval_1_status = 'approved',
           approval_1_by = $3,
           approval_1_at = NOW()
           ${nextStep === 2 ? ", approval_2_status = 'pending'" : ''}
           ${nextStep === 3 ? ", approval_3_status = 'pending'" : ''}
       WHERE id = $4`,
      [nextStep, nextStatus, userId, reportId]
    );

    await client.query('COMMIT');

    console.log(`✅ Step 1 approved. Moving to ${nextStatus === 'approved' ? 'APPROVED' : `Step ${nextStep}`}`);

    // Log approval to audit trail
    const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'Usuario';
    await logApproval({
      reportId: report.id,
      approvalLevel: 1,
      userId,
      userName,
      sectionName: 'd3'
    });

    // Preparar emailNotification para el siguiente aprobador o el equipo
    let emailNotification = null;
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [reportId]
    );
    const reportInfo = reportInfoResult.rows[0];

    if (nextStatus !== 'approved' && issueUsers[nextStep]) {
      // Notificar al siguiente aprobador
      const nextApproverId = issueUsers[nextStep];
      const nextApproverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (nextApproverResult.rows.length > 0) {
        const nextApprover = nextApproverResult.rows[0];
        emailNotification = {
          type: 'approval_request',
          recipients: [{
            id: nextApprover.id,
            email: nextApprover.email,
            name: `${nextApprover.first_name} ${nextApprover.last_name}`
          }],
          subject: `[8D] Solicitud de Aprobación ${nextStep} - ${reportInfo.report_id}`,
          reportId: reportId,
          reportTitle: reportInfo.title,
          supplierName: reportInfo.supplier_name
        };
      }
    } else if (nextStatus === 'approved' && issueUsers[0]) {
      // Notificar al responsable principal que D1-D2-D3 está aprobado
      const primaryId = issueUsers[0];
      const primaryResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [primaryId]
      );
      if (primaryResult.rows.length > 0) {
        const primary = primaryResult.rows[0];
        emailNotification = {
          type: 'fully_approved',
          recipients: [{
            id: primary.id,
            email: primary.email,
            name: `${primary.first_name} ${primary.last_name}`
          }],
          subject: `[8D] D1-D2-D3 APROBADO - ${reportInfo.report_id}`,
          reportId: reportId,
          reportTitle: reportInfo.title,
          supplierName: reportInfo.supplier_name
        };
      }
    }

    res.json({
      success: true,
      message: nextStatus === 'approved'
        ? '🎉 Aprobación 1 completada. D1-D2-D3 APROBADO (no hay más aprobadores).'
        : `Aprobación 1 completada. Enviado a Aprobador ${nextStep}.`,
      nextStep: nextStep,
      fullyApproved: nextStatus === 'approved',
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in approveStep1:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve Step 2 (Approver 2 approves)
 * POST /8d/reports/:reportId/approve-step-2
 */
async function approveStep2(req, res) {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const userId = req.user ? req.user.id : null;

    console.log(`✅ Approver 2 approving report ${reportId}`);

    await client.query('BEGIN');

    const reportCheck = await client.query(
      'SELECT id, current_approval_step FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    if (report.current_approval_step !== 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Report is not in step 2. Current step: ${report.current_approval_step}`
      });
    }

    // Check if next approver exists
    const escalationCheck = await client.query(
      'SELECT escalation_path FROM eightd_reports WHERE id = $1',
      [reportId]
    );
    const escalationPath = escalationCheck.rows[0]?.escalation_path || {};
    const issueUsers = escalationPath.issue_users || [];

    // Determine next step based on available approvers
    // Index 3 = approver3
    let nextStep = 4; // Default to approved
    let nextStatus = 'approved';

    if (issueUsers[3]) {
      nextStep = 3;
      nextStatus = 'pending_approval_3';
    }

    await client.query(
      `UPDATE eightd_reports
       SET current_approval_step = $1,
           d1_d2_d3_approval_status = $2,
           approval_2_status = 'approved',
           approval_2_by = $3,
           approval_2_at = NOW()
           ${nextStep === 3 ? ", approval_3_status = 'pending'" : ''}
       WHERE id = $4`,
      [nextStep, nextStatus, userId, reportId]
    );

    await client.query('COMMIT');

    console.log(`✅ Step 2 approved. Moving to ${nextStatus === 'approved' ? 'APPROVED' : 'Step 3'}`);

    // Log approval to audit trail
    const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'Usuario';
    await logApproval({
      reportId: report.id,
      approvalLevel: 2,
      userId,
      userName,
      sectionName: 'd3'
    });

    // Preparar emailNotification para el siguiente aprobador o el equipo
    let emailNotification = null;
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [reportId]
    );
    const reportInfo = reportInfoResult.rows[0];

    if (nextStatus !== 'approved' && issueUsers[3]) {
      // Notificar al Aprobador 3
      const nextApproverId = issueUsers[3];
      const nextApproverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (nextApproverResult.rows.length > 0) {
        const nextApprover = nextApproverResult.rows[0];
        emailNotification = {
          type: 'approval_request',
          recipients: [{
            id: nextApprover.id,
            email: nextApprover.email,
            name: `${nextApprover.first_name} ${nextApprover.last_name}`
          }],
          subject: `[8D] Solicitud de Aprobación 3 - ${reportInfo.report_id}`,
          reportId: reportId,
          reportTitle: reportInfo.title,
          supplierName: reportInfo.supplier_name
        };
      }
    } else if (nextStatus === 'approved' && issueUsers[0]) {
      // Notificar al responsable principal que D1-D2-D3 está aprobado
      const primaryId = issueUsers[0];
      const primaryResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [primaryId]
      );
      if (primaryResult.rows.length > 0) {
        const primary = primaryResult.rows[0];
        emailNotification = {
          type: 'fully_approved',
          recipients: [{
            id: primary.id,
            email: primary.email,
            name: `${primary.first_name} ${primary.last_name}`
          }],
          subject: `[8D] D1-D2-D3 APROBADO - ${reportInfo.report_id}`,
          reportId: reportId,
          reportTitle: reportInfo.title,
          supplierName: reportInfo.supplier_name
        };
      }
    }

    res.json({
      success: true,
      message: nextStatus === 'approved'
        ? '🎉 Aprobación 2 completada. D1-D2-D3 APROBADO (no hay más aprobadores).'
        : 'Aprobación 2 completada. Enviado a Aprobador 3.',
      nextStep: nextStep,
      fullyApproved: nextStatus === 'approved',
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in approveStep2:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve Step 3 (Approver 3 approves - FINAL APPROVAL)
 * POST /8d/reports/:reportId/approve-step-3
 */
async function approveStep3(req, res) {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const userId = req.user ? req.user.id : null;

    console.log(`✅ Approver 3 giving FINAL approval for report ${reportId}`);

    await client.query('BEGIN');

    const reportCheck = await client.query(
      'SELECT id, current_approval_step FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    if (report.current_approval_step !== 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Report is not in step 3. Current step: ${report.current_approval_step}`
      });
    }

    await client.query(
      `UPDATE eightd_reports
       SET current_approval_step = 4,
           d1_d2_d3_approval_status = 'approved',
           approval_3_status = 'approved',
           approval_3_by = $1,
           approval_3_at = NOW()
       WHERE id = $2`,
      [userId, reportId]
    );

    await client.query('COMMIT');

    console.log(`🎉 FINAL APPROVAL completed. Report fully approved!`);

    // Log approval to audit trail
    const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'Usuario';
    await logApproval({
      reportId: report.id,
      approvalLevel: 3,
      userId,
      userName,
      sectionName: 'd3'
    });

    // Preparar emailNotification para notificar al responsable principal
    let emailNotification = null;
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [reportId]
    );
    const reportInfo = reportInfoResult.rows[0];
    const escalationPath = reportInfo?.escalation_path || {};
    const issueUsers = escalationPath.issue_users || [];

    if (issueUsers[0]) {
      // Notificar al responsable principal que D1-D2-D3 está aprobado
      const primaryId = issueUsers[0];
      const primaryResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [primaryId]
      );
      if (primaryResult.rows.length > 0) {
        const primary = primaryResult.rows[0];
        emailNotification = {
          type: 'fully_approved',
          recipients: [{
            id: primary.id,
            email: primary.email,
            name: `${primary.first_name} ${primary.last_name}`
          }],
          subject: `[8D] D1-D2-D3 APROBADO - ${reportInfo.report_id}`,
          reportId: reportId,
          reportTitle: reportInfo.title,
          supplierName: reportInfo.supplier_name
        };
      }
    }

    res.json({
      success: true,
      message: '🎉 Aprobación 3 completada. Reporte APROBADO. Puede continuar con D4-D5-D6.',
      nextStep: 'completed',
      fullyApproved: true,
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in approveStep3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Reject Step 1 (Approver 1 rejects - goes back to Emisor)
 * POST /8d/reports/:reportId/reject-step-1
 * Body: { comments: string (required) }
 */
async function rejectStep1(req, res) {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { comments } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!comments || comments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Los comentarios son obligatorios para rechazar'
      });
    }

    console.log(`❌ Approver 1 rejecting report ${reportId}`);

    await client.query('BEGIN');

    const reportCheck = await client.query(
      'SELECT id, current_approval_step FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    if (report.current_approval_step !== 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Report is not in step 1. Current step: ${report.current_approval_step}`
      });
    }

    // Rejected by A1 -> goes back to EMISOR (draft state)
    await client.query(
      `UPDATE eightd_reports
       SET current_approval_step = 0,
           d1_d2_d3_approval_status = 'rejected_by_a1',
           approval_1_status = 'rejected',
           approval_1_by = $1,
           approval_1_at = NOW(),
           approval_1_comments = $2
       WHERE id = $3`,
      [userId, comments.trim(), reportId]
    );

    await client.query('COMMIT');

    console.log(`❌ Step 1 rejected. Returned to Emisor.`);

    // Log rejection to audit trail
    const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'Usuario';
    await logRejection({
      reportId: report.id,
      approvalLevel: 1,
      userId,
      userName,
      comments: comments.trim(),
      sectionName: 'd3'
    });

    // Preparar notificación de rechazo al emisor (issue_users[0])
    let emailNotification = null;
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [reportId]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    const issueUsers = ep.issue_users || [];
    const emisorId = issueUsers[0];

    if (emisorId) {
      const emisorResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [emisorId]
      );
      if (emisorResult.rows.length > 0) {
        const emisor = emisorResult.rows[0];
        emailNotification = {
          type: 'rejection',
          recipients: [{
            id: emisor.id,
            email: emisor.email,
            name: `${emisor.first_name} ${emisor.last_name}`
          }],
          subject: `[8D] ${reportInfo.report_id} - D1-D2-D3 Rechazado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D1-D2-D3',
          rejectionComments: comments.trim(),
          message: `La etapa D1-D2-D3 ha sido rechazada por Aprobador 1. Motivo: ${comments.trim()}`
        };
      }
    }

    res.json({
      success: true,
      message: 'Reporte rechazado. Regresado al Emisor para correcciones.',
      rejectedBy: 'approver_1',
      returnedTo: 'emisor',
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in rejectStep1:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Reject Step 2 (Approver 2 rejects - goes back to Approver 1)
 * POST /8d/reports/:reportId/reject-step-2
 * Body: { comments: string (required) }
 */
async function rejectStep2(req, res) {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { comments } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!comments || comments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Los comentarios son obligatorios para rechazar'
      });
    }

    console.log(`❌ Approver 2 rejecting report ${reportId}`);

    await client.query('BEGIN');

    const reportCheck = await client.query(
      'SELECT id, current_approval_step FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    if (report.current_approval_step !== 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Report is not in step 2. Current step: ${report.current_approval_step}`
      });
    }

    // Rejected by A2 -> goes back to APPROVER 1
    await client.query(
      `UPDATE eightd_reports
       SET current_approval_step = 1,
           d1_d2_d3_approval_status = 'rejected_by_a2',
           approval_2_status = 'rejected',
           approval_2_by = $1,
           approval_2_at = NOW(),
           approval_2_comments = $2,
           approval_1_status = 'pending'
       WHERE id = $3`,
      [userId, comments.trim(), reportId]
    );

    await client.query('COMMIT');

    console.log(`❌ Step 2 rejected. Returned to Approver 1.`);

    // Log rejection to audit trail
    const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'Usuario';
    await logRejection({
      reportId: report.id,
      approvalLevel: 2,
      userId,
      userName,
      comments: comments.trim(),
      sectionName: 'd3'
    });

    // Preparar notificación de rechazo al Aprobador 1 (issue_users[1])
    let emailNotification = null;
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [reportId]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    const issueUsers = ep.issue_users || [];
    const approver1Id = issueUsers[1];

    if (approver1Id) {
      const approver1Result = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [approver1Id]
      );
      if (approver1Result.rows.length > 0) {
        const approver1 = approver1Result.rows[0];
        emailNotification = {
          type: 'rejection',
          recipients: [{
            id: approver1.id,
            email: approver1.email,
            name: `${approver1.first_name} ${approver1.last_name}`
          }],
          subject: `[8D] ${reportInfo.report_id} - D1-D2-D3 Rechazado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D1-D2-D3',
          rejectionComments: comments.trim(),
          message: `La etapa D1-D2-D3 ha sido rechazada por Aprobador 2. Motivo: ${comments.trim()}`
        };
      }
    }

    res.json({
      success: true,
      message: 'Reporte rechazado. Regresado a Aprobador 1 para re-revisión.',
      rejectedBy: 'approver_2',
      returnedTo: 'approver_1',
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in rejectStep2:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Reject Step 3 (Approver 3 rejects - goes back to Approver 2)
 * POST /8d/reports/:reportId/reject-step-3
 * Body: { comments: string (required) }
 */
async function rejectStep3(req, res) {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { comments } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!comments || comments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Los comentarios son obligatorios para rechazar'
      });
    }

    console.log(`❌ Approver 3 rejecting report ${reportId}`);

    await client.query('BEGIN');

    const reportCheck = await client.query(
      'SELECT id, current_approval_step FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    if (report.current_approval_step !== 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Report is not in step 3. Current step: ${report.current_approval_step}`
      });
    }

    // Rejected by A3 -> goes back to APPROVER 2
    await client.query(
      `UPDATE eightd_reports
       SET current_approval_step = 2,
           d1_d2_d3_approval_status = 'rejected_by_a3',
           approval_3_status = 'rejected',
           approval_3_by = $1,
           approval_3_at = NOW(),
           approval_3_comments = $2,
           approval_2_status = 'pending'
       WHERE id = $3`,
      [userId, comments.trim(), reportId]
    );

    await client.query('COMMIT');

    console.log(`❌ Step 3 rejected. Returned to Approver 2.`);

    // Log rejection to audit trail
    const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'Usuario';
    await logRejection({
      reportId: report.id,
      approvalLevel: 3,
      userId,
      userName,
      comments: comments.trim(),
      sectionName: 'd3'
    });

    // Preparar notificación de rechazo al Aprobador 2 (issue_users[2])
    let emailNotification = null;
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [reportId]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    const issueUsers = ep.issue_users || [];
    const approver2Id = issueUsers[2];

    if (approver2Id) {
      const approver2Result = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [approver2Id]
      );
      if (approver2Result.rows.length > 0) {
        const approver2 = approver2Result.rows[0];
        emailNotification = {
          type: 'rejection',
          recipients: [{
            id: approver2.id,
            email: approver2.email,
            name: `${approver2.first_name} ${approver2.last_name}`
          }],
          subject: `[8D] ${reportInfo.report_id} - D1-D2-D3 Rechazado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D1-D2-D3',
          rejectionComments: comments.trim(),
          message: `La etapa D1-D2-D3 ha sido rechazada por Aprobador 3. Motivo: ${comments.trim()}`
        };
      }
    }

    res.json({
      success: true,
      message: 'Reporte rechazado. Regresado a Aprobador 2 para re-revisión.',
      rejectedBy: 'approver_3',
      returnedTo: 'approver_2',
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in rejectStep3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar',
      error: error.message
    });
  } finally {
    client.release();
  }
}

module.exports = {
  approveStep1,
  approveStep2,
  approveStep3,
  rejectStep1,
  rejectStep2,
  rejectStep3
};
