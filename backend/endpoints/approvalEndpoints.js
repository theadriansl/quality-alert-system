const { pool } = require('../config/database');
const { logAction } = require('../utils/auditLog');

// Helper function to check if user is admin
async function isUserAdmin(client, userId) {
  const result = await client.query(
    'SELECT system_role FROM users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0 && result.rows[0].system_role === 'admin';
}

/**
 * Approve or Reject D3-MFG Section
 * POST /api/8d/reports/:id/d3-mfg/approve
 */
async function approveD3MFG(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const userId = req.user.id;

    // Validate: If rejecting, comments are REQUIRED
    if (action === 'reject' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    // Get current report and escalation path
    const reportResult = await client.query(
      `SELECT escalation_path, d3_mfg_current_approval_step, d3_mfg_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const currentStep = report.d3_mfg_current_approval_step;
    const d3MfgStatus = report.d3_mfg_status;

    // Verify section is in review state
    if (d3MfgStatus !== 'under_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D3-MFG is not in approval stage'
      });
    }

    // Verify user is the correct approver for current step
    const countermeasureUsers = escalationPath.countermeasure_users || [];

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const effectiveStep = (d3MfgStatus === 'under_review' && currentStep === 0) ? 1 : currentStep;

    // Step 1 = Approver 1 (index 1), Step 2 = Approver 2 (index 2), Step 3 = Approver 3 (index 3)
    if (effectiveStep < 1 || effectiveStep > 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D3-MFG is not in approval stage'
      });
    }

    const expectedApproverId = countermeasureUsers[effectiveStep]; // effectiveStep matches array index for approvers

    // Check if user is admin (admins can approve anything)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== expectedApproverId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `You are not authorized to approve this step. Expected approver ${effectiveStep}`
      });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    let newStep = action === 'approve' ? effectiveStep + 1 : 0; // If rejected, return to primary (step 0)

    // Si se aprueba, verificar si existe el siguiente aprobador
    // Si no existe, marcar como completamente aprobado (step 4)
    if (action === 'approve' && newStep < 4) {
      const nextApproverId = countermeasureUsers[newStep];
      if (!nextApproverId) {
        newStep = 4; // No hay más aprobadores, completar aprobación
      }
    }

    // Update approval fields for current step
    await client.query(
      `UPDATE eightd_reports
       SET d3_mfg_approval_${effectiveStep}_status = $1,
           d3_mfg_approval_${effectiveStep}_by = $2,
           d3_mfg_approval_${effectiveStep}_at = NOW(),
           d3_mfg_approval_${effectiveStep}_comments = $3,
           d3_mfg_current_approval_step = $4,
           d3_mfg_status = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        status,
        userId,
        comments || '',
        newStep,
        newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        id
      ]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: action === 'approve' ? 'approved' : 'rejected',
      actionCategory: 'approval',
      sectionName: 'd3_mfg',
      userId,
      userName,
      description: `D3-MFG ${action === 'approve' ? 'Aprobado' : 'Rechazado'} - Paso ${effectiveStep}${comments ? ': ' + comments : ''}`,
      newValue: {
        step: effectiveStep,
        newStep: newStep,
        status: status,
        comments: comments || ''
      }
    });

    await client.query('COMMIT');

    // Preparar notificación por email
    let emailNotification = null;

    // Obtener información del reporte para notificaciones
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path, r.d3_mfg_responsible_user_ids
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};

    if (action === 'approve') {
      if (newStep === 4) {
        // APROBACIÓN COMPLETA - Notificar a TODOS los involucrados (d3MfgResponsibleUserIds)
        const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

        if (involvedUserIds.length > 0) {
          const usersResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
            [involvedUserIds]
          );
          const involvedEmails = usersResult.rows.map(u => ({
            id: u.id,
            email: u.email,
            name: `${u.first_name} ${u.last_name}`
          }));

          emailNotification = {
            type: 'stage_approved',
            recipients: involvedEmails,
            subject: `[8D] ${reportInfo.report_id} - D3-MFG Aprobado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D3-MFG',
            message: 'La etapa D3-MFG (Acciones Inmediatas) ha sido aprobada completamente.'
          };
        }
      } else {
        // Hay siguiente aprobador - Notificar al siguiente
        const countermeasureUsers = ep.countermeasure_users || [];
        const nextApproverId = countermeasureUsers[newStep];

        if (nextApproverId) {
          const approverResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
            [nextApproverId]
          );
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            emailNotification = {
              type: 'approval_request',
              recipients: [{
                id: approver.id,
                email: approver.email,
                name: `${approver.first_name} ${approver.last_name}`
              }],
              subject: `[8D] ${reportInfo.report_id} - Aprobación D3-MFG Requerida (Paso ${newStep})`,
              reportId: reportInfo.report_id,
              title: reportInfo.title,
              supplier: reportInfo.supplier_name,
              stage: 'D3-MFG',
              approvalStep: newStep
            };
          }
        }
      }
    } else if (action === 'reject') {
      // RECHAZO - Notificar al responsable principal con el comentario
      const countermeasureUsers = ep.countermeasure_users || [];
      const primaryUserId = countermeasureUsers[0];

      if (primaryUserId) {
        const primaryUserResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
          [primaryUserId]
        );
        if (primaryUserResult.rows.length > 0) {
          const primaryUser = primaryUserResult.rows[0];
          emailNotification = {
            type: 'rejection',
            recipients: [{
              id: primaryUser.id,
              email: primaryUser.email,
              name: `${primaryUser.first_name} ${primaryUser.last_name}`
            }],
            subject: `[8D] ${reportInfo.report_id} - D3-MFG Rechazado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D3-MFG',
            rejectionComments: comments,
            message: `La etapa D3-MFG ha sido rechazada. Motivo: ${comments}`
          };
        }
      }
    }

    res.json({
      success: true,
      message: `D3-MFG ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        currentStep: newStep,
        status: newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review')
      },
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D3-MFG:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve or Reject D4 Section
 * POST /api/8d/reports/:id/d4/approve
 */
async function approveD4(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const userId = req.user.id;

    // Validate: If rejecting, comments are REQUIRED
    if (action === 'reject' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    // Get current report and escalation path
    const reportResult = await client.query(
      `SELECT escalation_path, d4_current_approval_step
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const currentStep = report.d4_current_approval_step;

    // Verify user is the correct approver for current step
    const countermeasureUsers = escalationPath.countermeasure_users || [];

    if (currentStep < 1 || currentStep > 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D4 is not in approval stage'
      });
    }

    const expectedApproverId = countermeasureUsers[currentStep];

    // Check if user is admin (admins can approve anything)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== expectedApproverId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `You are not authorized to approve this step. Expected approver ${currentStep}`
      });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    let newStep = action === 'approve' ? currentStep + 1 : 0;

    // Si se aprueba, verificar si existe el siguiente aprobador
    if (action === 'approve' && newStep < 4) {
      const nextApproverId = countermeasureUsers[newStep];
      if (!nextApproverId) {
        newStep = 4; // No hay más aprobadores, completar aprobación
      }
    }

    const d4Status = action === 'reject' ? 'draft' : (newStep === 4 ? 'approved' : 'under_review');

    // Update approval fields for current step
    await client.query(
      `UPDATE eightd_reports
       SET d4_approval_${currentStep}_status = $1,
           d4_approval_${currentStep}_by = $2,
           d4_approval_${currentStep}_at = NOW(),
           d4_approval_${currentStep}_comments = $3,
           d4_current_approval_step = $4,
           d4_status = $5,
           d4_completed = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        status,
        userId,
        comments || '',
        newStep,
        d4Status,
        newStep === 4, // d4_completed = true when step 4 (fully approved)
        id
      ]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: action === 'approve' ? 'approved' : 'rejected',
      actionCategory: 'approval',
      sectionName: 'd4',
      userId,
      userName,
      description: `D4 ${action === 'approve' ? 'Aprobado' : 'Rechazado'} - Paso ${currentStep}${comments ? ': ' + comments : ''}`,
      newValue: {
        step: currentStep,
        newStep: newStep,
        status: status,
        comments: comments || ''
      }
    });

    await client.query('COMMIT');

    // Preparar notificación por email
    let emailNotification = null;

    // Obtener información del reporte para notificaciones
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path, r.d3_mfg_responsible_user_ids
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};

    if (action === 'approve') {
      if (newStep === 4) {
        // APROBACIÓN COMPLETA - Notificar a TODOS los involucrados
        const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

        if (involvedUserIds.length > 0) {
          const usersResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
            [involvedUserIds]
          );
          const involvedEmails = usersResult.rows.map(u => ({
            id: u.id,
            email: u.email,
            name: `${u.first_name} ${u.last_name}`
          }));

          emailNotification = {
            type: 'stage_approved',
            recipients: involvedEmails,
            subject: `[8D] ${reportInfo.report_id} - D4 Aprobado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D4',
            message: 'La etapa D4 (Análisis de Causa Raíz) ha sido aprobada completamente.'
          };
        }
      } else {
        // Hay siguiente aprobador - Notificar al siguiente
        const countermeasureUsersForEmail = ep.countermeasure_users || [];
        const nextApproverId = countermeasureUsersForEmail[newStep];

        if (nextApproverId) {
          const approverResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
            [nextApproverId]
          );
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            emailNotification = {
              type: 'approval_request',
              recipients: [{
                id: approver.id,
                email: approver.email,
                name: `${approver.first_name} ${approver.last_name}`
              }],
              subject: `[8D] ${reportInfo.report_id} - Aprobación D4 Requerida (Paso ${newStep})`,
              reportId: reportInfo.report_id,
              title: reportInfo.title,
              supplier: reportInfo.supplier_name,
              stage: 'D4',
              approvalStep: newStep
            };
          }
        }
      }
    } else if (action === 'reject') {
      // RECHAZO - Notificar al responsable principal con el comentario
      const countermeasureUsersForEmail = ep.countermeasure_users || [];
      const primaryUserId = countermeasureUsersForEmail[0];

      if (primaryUserId) {
        const primaryUserResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
          [primaryUserId]
        );
        if (primaryUserResult.rows.length > 0) {
          const primaryUser = primaryUserResult.rows[0];
          emailNotification = {
            type: 'rejection',
            recipients: [{
              id: primaryUser.id,
              email: primaryUser.email,
              name: `${primaryUser.first_name} ${primaryUser.last_name}`
            }],
            subject: `[8D] ${reportInfo.report_id} - D4 Rechazado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D4',
            rejectionComments: comments,
            message: `La etapa D4 ha sido rechazada. Motivo: ${comments}`
          };
        }
      }
    }

    res.json({
      success: true,
      message: `D4 ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        currentStep: newStep,
        completed: newStep === 4
      },
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D4:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve or Reject D5 Section
 * POST /api/8d/reports/:id/d5/approve
 */
async function approveD5(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const userId = req.user.id;

    // Validate: If rejecting, comments are REQUIRED
    if (action === 'reject' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    // Get current report and escalation path
    const reportResult = await client.query(
      `SELECT escalation_path, d5_current_approval_step, d5_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const currentStep = report.d5_current_approval_step;
    const d5Status = report.d5_status;

    // Verify section is in review state
    if (d5Status !== 'under_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D5 is not in approval stage'
      });
    }

    // Verify user is the correct approver for current step
    const countermeasureUsers = escalationPath.countermeasure_users || [];

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const effectiveStep = (d5Status === 'under_review' && currentStep === 0) ? 1 : currentStep;

    // Step 1 = Approver 1 (index 1), Step 2 = Approver 2 (index 2), Step 3 = Approver 3 (index 3)
    if (effectiveStep < 1 || effectiveStep > 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D5 is not in approval stage'
      });
    }

    const expectedApproverId = countermeasureUsers[effectiveStep];

    // Check if user is admin (admins can approve anything)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== expectedApproverId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `You are not authorized to approve this step. Expected approver ${effectiveStep}`
      });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    let newStep = action === 'approve' ? effectiveStep + 1 : 0; // If rejected, return to primary (step 0)

    // Si se aprueba, verificar si existe el siguiente aprobador
    if (action === 'approve' && newStep < 4) {
      const nextApproverId = countermeasureUsers[newStep];
      if (!nextApproverId) {
        newStep = 4; // No hay más aprobadores, completar aprobación
      }
    }

    // Update approval fields for current step
    await client.query(
      `UPDATE eightd_reports
       SET d5_approval_${effectiveStep}_status = $1,
           d5_approval_${effectiveStep}_by = $2,
           d5_approval_${effectiveStep}_at = NOW(),
           d5_approval_${effectiveStep}_comments = $3,
           d5_current_approval_step = $4,
           d5_status = $5,
           d5_completed = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        status,
        userId,
        comments || '',
        newStep,
        newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        newStep === 4, // d5_completed = true when fully approved
        id
      ]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: action === 'approve' ? 'approved' : 'rejected',
      actionCategory: 'approval',
      sectionName: 'd5',
      userId,
      userName,
      description: `D5 ${action === 'approve' ? 'Aprobado' : 'Rechazado'} - Paso ${currentStep}${comments ? ': ' + comments : ''}`,
      newValue: {
        step: currentStep,
        newStep: newStep,
        status: status,
        comments: comments || ''
      }
    });

    await client.query('COMMIT');

    // Preparar notificación por email
    let emailNotification = null;

    // Obtener información del reporte para notificaciones
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path, r.d3_mfg_responsible_user_ids
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};

    if (action === 'approve') {
      if (newStep === 4) {
        const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];
        if (involvedUserIds.length > 0) {
          const usersResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
            [involvedUserIds]
          );
          emailNotification = {
            type: 'stage_approved',
            recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
            subject: `[8D] ${reportInfo.report_id} - D5 Aprobado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D5',
            message: 'La etapa D5 (Acciones Correctivas) ha sido aprobada completamente.'
          };
        }
      } else {
        const nextApproverId = (ep.countermeasure_users || [])[newStep];
        if (nextApproverId) {
          const approverResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
            [nextApproverId]
          );
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            emailNotification = {
              type: 'approval_request',
              recipients: [{ id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` }],
              subject: `[8D] ${reportInfo.report_id} - Aprobación D5 Requerida (Paso ${newStep})`,
              reportId: reportInfo.report_id,
              title: reportInfo.title,
              supplier: reportInfo.supplier_name,
              stage: 'D5',
              approvalStep: newStep
            };
          }
        }
      }
    } else if (action === 'reject') {
      // RECHAZO - Notificar al responsable principal con el comentario
      const primaryUserId = (ep.countermeasure_users || [])[0];
      if (primaryUserId) {
        const primaryUserResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
          [primaryUserId]
        );
        if (primaryUserResult.rows.length > 0) {
          const primaryUser = primaryUserResult.rows[0];
          emailNotification = {
            type: 'rejection',
            recipients: [{ id: primaryUser.id, email: primaryUser.email, name: `${primaryUser.first_name} ${primaryUser.last_name}` }],
            subject: `[8D] ${reportInfo.report_id} - D5 Rechazado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D5',
            rejectionComments: comments,
            message: `La etapa D5 ha sido rechazada. Motivo: ${comments}`
          };
        }
      }
    }

    res.json({
      success: true,
      message: `D5 ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        currentStep: newStep,
        status: newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        completed: newStep === 4
      },
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D5:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Send D5 to Approval (Initialize approval process)
 * PUT /api/8d/reports/:id/d5/send-to-approval
 */
async function sendD5ToApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Verify user is the primary responsible
    const reportResult = await client.query(
      `SELECT escalation_path, d5_status, d5_completed
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const countermeasureUsers = escalationPath.countermeasure_users || [];
    const primaryUserId = countermeasureUsers[0];

    // Verify user is primary responsible (or admin)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== primaryUserId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the primary responsible can send to approval'
      });
    }

    // Verify D5 is marked as completed
    if (!report.d5_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D5 must be marked as completed before sending to approval'
      });
    }

    // Determine which step to start from based on previous rejections
    // If Approver 3 rejected, go back to step 3
    // If Approver 2 rejected, go back to step 2
    // If Approver 1 rejected (or never sent), start at step 1
    const approvalCheckResult = await client.query(
      `SELECT d5_approval_1_status, d5_approval_2_status, d5_approval_3_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    const approvalData = approvalCheckResult.rows[0];
    let startStep = 1; // Default: start from first approver

    // Check who rejected last (priority: 3 > 2 > 1)
    if (approvalData.d5_approval_3_status === 'rejected') {
      startStep = 3;
    } else if (approvalData.d5_approval_2_status === 'rejected') {
      startStep = 2;
    } else if (approvalData.d5_approval_1_status === 'rejected') {
      startStep = 1;
    }

    // Verificar si existe el aprobador para el startStep
    const firstApproverId = countermeasureUsers[startStep];

    // Si no hay aprobador, aprobar automáticamente
    if (!firstApproverId) {
      await client.query(
        `UPDATE eightd_reports
         SET d5_status = 'approved',
             d5_current_approval_step = 4,
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      const reportInfoResult = await client.query(
        `SELECT r.report_id, r.title, r.supplier_name, r.d3_mfg_responsible_user_ids
         FROM eightd_reports r WHERE r.id = $1`,
        [id]
      );
      const reportInfo = reportInfoResult.rows[0];
      const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

      let emailNotification = null;
      if (involvedUserIds.length > 0) {
        const usersResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
          [involvedUserIds]
        );
        emailNotification = {
          type: 'stage_approved',
          recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
          subject: `[8D] ${reportInfo.report_id} - D5 Aprobado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D5',
          message: 'La etapa D5 (Acciones Correctivas) ha sido aprobada automáticamente (sin aprobadores configurados).'
        };
      }

      return res.json({
        success: true,
        message: 'D5 approved automatically (no approvers configured)',
        data: { status: 'approved', currentStep: 4 },
        emailNotification
      });
    }

    // Initialize approval process (hay aprobadores)
    await client.query(
      `UPDATE eightd_reports
       SET d5_status = 'under_review',
           d5_current_approval_step = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startStep]
    );

    // Get user name for audit log
    const userResult = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const userName = userResult.rows[0]
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
      : 'Usuario desconocido';

    await client.query('COMMIT');

    // Log to audit trail
    await logAction({
      reportId: id,
      actionType: 'submitted_for_approval',
      actionCategory: 'approval',
      sectionName: 'd5',
      userId,
      userName,
      description: `D5 enviado a aprobación - Nivel ${startStep}`
    });

    // Obtener información del reporte para notificación por email
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    const countermeasureUsersForEmail = ep.countermeasure_users || [];

    // Obtener SOLO el email del aprobador correspondiente al startStep
    const nextApproverId = countermeasureUsersForEmail[startStep];
    let approverEmail = null;

    if (nextApproverId) {
      const approverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        approverEmail = { id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` };
      }
    }

    res.json({
      success: true,
      message: 'D5 sent to approval successfully',
      data: {
        status: 'under_review',
        currentStep: startStep
      },
      emailNotification: {
        type: 'approval_request',
        recipients: approverEmail ? [approverEmail] : [],
        subject: `[8D] ${reportInfo.report_id} - Aprobación D5 Requerida (Paso ${startStep})`,
        reportId: reportInfo.report_id,
        title: reportInfo.title,
        supplier: reportInfo.supplier_name,
        stage: 'D5',
        approvalStep: startStep
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending D5 to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Send D3-MFG to Approval (Initialize approval process)
 * PUT /api/8d/reports/:id/d3-mfg/send-to-approval
 */
async function sendD3MfgToApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Verify user is the primary responsible
    const reportResult = await client.query(
      `SELECT escalation_path, d3_mfg_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const countermeasureUsers = escalationPath.countermeasure_users || [];
    const primaryUserId = countermeasureUsers[0];

    // Verify user is primary responsible (or admin)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== primaryUserId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the primary responsible can send to approval'
      });
    }

    // Determine which step to start from based on previous rejections
    // If Approver 3 rejected, go back to step 3
    // If Approver 2 rejected, go back to step 2
    // If Approver 1 rejected (or never sent), start at step 1
    const approvalCheckResult = await client.query(
      `SELECT d3_mfg_approval_1_status, d3_mfg_approval_2_status, d3_mfg_approval_3_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    const approvalData = approvalCheckResult.rows[0];
    let startStep = 1; // Default: start from first approver

    // Check who rejected last (priority: 3 > 2 > 1)
    if (approvalData.d3_mfg_approval_3_status === 'rejected') {
      startStep = 3;
    } else if (approvalData.d3_mfg_approval_2_status === 'rejected') {
      startStep = 2;
    } else if (approvalData.d3_mfg_approval_1_status === 'rejected') {
      startStep = 1;
    }

    // Verificar si existe el aprobador para el startStep
    const firstApproverId = countermeasureUsers[startStep];

    // Si no hay aprobador, aprobar automáticamente
    if (!firstApproverId) {
      await client.query(
        `UPDATE eightd_reports
         SET d3_mfg_status = 'approved',
             d3_mfg_current_approval_step = 4,
             d3_mfg_completed = true,
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      // Notificar a involucrados que la etapa fue aprobada automáticamente
      const reportInfoResult = await client.query(
        `SELECT r.report_id, r.title, r.supplier_name, r.d3_mfg_responsible_user_ids
         FROM eightd_reports r WHERE r.id = $1`,
        [id]
      );
      const reportInfo = reportInfoResult.rows[0];
      const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

      let emailNotification = null;
      if (involvedUserIds.length > 0) {
        const usersResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
          [involvedUserIds]
        );
        emailNotification = {
          type: 'stage_approved',
          recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
          subject: `[8D] ${reportInfo.report_id} - D3-MFG Aprobado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D3-MFG',
          message: 'La etapa D3-MFG (Acciones Inmediatas) ha sido aprobada automáticamente (sin aprobadores configurados).'
        };
      }

      return res.json({
        success: true,
        message: 'D3-MFG approved automatically (no approvers configured)',
        data: {
          status: 'approved',
          currentStep: 4
        },
        emailNotification
      });
    }

    // Initialize approval process (hay aprobadores)
    await client.query(
      `UPDATE eightd_reports
       SET d3_mfg_status = 'under_review',
           d3_mfg_current_approval_step = $2,
           d3_mfg_completed = true,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startStep]
    );

    await client.query('COMMIT');

    // Obtener información del reporte para notificación por email y audit log
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path,
              r.d3_mfg_temporary_controls, r.d3_mfg_inspection_points,
              r.d3_mfg_parameters_adjusted, r.d3_mfg_poka_yoke_devices
       FROM eightd_reports r
       WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];

    // Log audit trail for sending to approval
    try {
      const userName = req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email : 'Usuario';
      await logAction({
        reportId: id,
        userId: userId,
        userName,
        actionType: 'submitted_for_approval',
        actionCategory: 'approval',
        sectionName: 'd3_mfg',
        description: `D3-MFG enviado a aprobación (Paso ${startStep})`,
        newValue: { status: 'under_review', step: startStep }
      });
    } catch (auditError) {
      console.error('Error logging audit for D3-MFG send to approval:', auditError);
    }
    const ep = reportInfo.escalation_path || {};
    const countermeasureUsersForEmail = ep.countermeasure_users || [];

    // Obtener SOLO el email del aprobador correspondiente al startStep
    const nextApproverId = countermeasureUsersForEmail[startStep];
    let approverEmail = null;

    if (nextApproverId) {
      const approverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        approverEmail = {
          id: approver.id,
          email: approver.email,
          name: `${approver.first_name} ${approver.last_name}`
        };
      }
    }

    // Preparar resumen de acciones inmediatas
    const actionsSummary = [];
    if (reportInfo.d3_mfg_temporary_controls?.length > 0) {
      actionsSummary.push(`Controles Temporales: ${reportInfo.d3_mfg_temporary_controls.length} acciones`);
    }
    if (reportInfo.d3_mfg_inspection_points?.length > 0) {
      actionsSummary.push(`Puntos de Inspección: ${reportInfo.d3_mfg_inspection_points.length} puntos`);
    }
    if (reportInfo.d3_mfg_parameters_adjusted?.length > 0) {
      actionsSummary.push(`Parámetros Ajustados: ${reportInfo.d3_mfg_parameters_adjusted.length} parámetros`);
    }
    if (reportInfo.d3_mfg_poka_yoke_devices?.length > 0) {
      actionsSummary.push(`Dispositivos Poka-Yoke: ${reportInfo.d3_mfg_poka_yoke_devices.length} dispositivos`);
    }

    res.json({
      success: true,
      message: 'D3-MFG sent to approval successfully',
      data: {
        status: 'under_review',
        currentStep: startStep
      },
      // Datos para mailto - SOLO el siguiente aprobador
      emailNotification: {
        type: 'approval_request',
        recipients: approverEmail ? [approverEmail] : [],
        subject: `[8D] ${reportInfo.report_id} - Aprobación D3-MFG Requerida (Paso ${startStep})`,
        reportId: reportInfo.report_id,
        title: reportInfo.title,
        supplier: reportInfo.supplier_name,
        actionsSummary: actionsSummary,
        stage: 'D3-MFG',
        approvalStep: startStep
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending D3-MFG to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Send D4 to Approval (Initialize approval process)
 * PUT /api/8d/reports/:id/d4/send-to-approval
 */
async function sendD4ToApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Verify user is the primary responsible
    const reportResult = await client.query(
      `SELECT escalation_path, d4_status, d4_completed
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const countermeasureUsers = escalationPath.countermeasure_users || [];
    const primaryUserId = countermeasureUsers[0];

    // Verify user is primary responsible (or admin)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== primaryUserId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the primary responsible can send to approval'
      });
    }

    // Verify D4 is marked as completed
    if (!report.d4_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D4 must be marked as completed before sending to approval'
      });
    }

    // Determine which step to start from based on previous rejections
    // If Approver 3 rejected, go back to step 3
    // If Approver 2 rejected, go back to step 2
    // If Approver 1 rejected (or never sent), start at step 1
    const approvalCheckResult = await client.query(
      `SELECT d4_approval_1_status, d4_approval_2_status, d4_approval_3_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    const approvalData = approvalCheckResult.rows[0];
    let startStep = 1; // Default: start from first approver

    // Check who rejected last (priority: 3 > 2 > 1)
    if (approvalData.d4_approval_3_status === 'rejected') {
      startStep = 3;
    } else if (approvalData.d4_approval_2_status === 'rejected') {
      startStep = 2;
    } else if (approvalData.d4_approval_1_status === 'rejected') {
      startStep = 1;
    }

    // Verificar si existe el aprobador para el startStep
    const firstApproverId = countermeasureUsers[startStep];

    // Si no hay aprobador, aprobar automáticamente
    if (!firstApproverId) {
      await client.query(
        `UPDATE eightd_reports
         SET d4_status = 'approved',
             d4_current_approval_step = 4,
             d4_completed = true,
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      const reportInfoResult = await client.query(
        `SELECT r.report_id, r.title, r.supplier_name, r.d3_mfg_responsible_user_ids
         FROM eightd_reports r WHERE r.id = $1`,
        [id]
      );
      const reportInfo = reportInfoResult.rows[0];
      const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

      let emailNotification = null;
      if (involvedUserIds.length > 0) {
        const usersResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
          [involvedUserIds]
        );
        emailNotification = {
          type: 'stage_approved',
          recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
          subject: `[8D] ${reportInfo.report_id} - D4 Aprobado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D4',
          message: 'La etapa D4 (Análisis de Causa Raíz) ha sido aprobada automáticamente (sin aprobadores configurados).'
        };
      }

      return res.json({
        success: true,
        message: 'D4 approved automatically (no approvers configured)',
        data: { status: 'approved', currentStep: 4 },
        emailNotification
      });
    }

    // Initialize approval process (hay aprobadores)
    await client.query(
      `UPDATE eightd_reports
       SET d4_status = 'under_review',
           d4_current_approval_step = $2,
           d4_completed = true,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startStep]
    );

    // Log to audit trail
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: 'submitted_for_approval',
      actionCategory: 'approval',
      sectionName: 'd4',
      userId: req.user.id,
      userName,
      description: 'D4 enviado a aprobación - Nivel 1'
    });

    await client.query('COMMIT');

    // Obtener información del reporte para notificación por email
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    const countermeasureUsersForEmail = ep.countermeasure_users || [];

    // Obtener SOLO el email del aprobador correspondiente al startStep
    const nextApproverId = countermeasureUsersForEmail[startStep];
    let approverEmail = null;

    if (nextApproverId) {
      const approverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        approverEmail = {
          id: approver.id,
          email: approver.email,
          name: `${approver.first_name} ${approver.last_name}`
        };
      }
    }

    res.json({
      success: true,
      message: 'D4 sent to approval successfully',
      data: {
        status: 'under_review',
        currentStep: startStep
      },
      // Datos para mailto - SOLO el siguiente aprobador
      emailNotification: {
        type: 'approval_request',
        recipients: approverEmail ? [approverEmail] : [],
        subject: `[8D] ${reportInfo.report_id} - Aprobación D4 Requerida (Paso ${startStep})`,
        reportId: reportInfo.report_id,
        title: reportInfo.title,
        supplier: reportInfo.supplier_name,
        stage: 'D4',
        approvalStep: startStep
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending D4 to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve or Reject D6 Section
 * POST /api/8d/reports/:id/d6/approve
 */
async function approveD6(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const userId = req.user.id;

    // Validate: If rejecting, comments are REQUIRED
    if (action === 'reject' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    // Get current report and escalation path
    const reportResult = await client.query(
      `SELECT escalation_path, d6_current_approval_step, d6_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const currentStep = report.d6_current_approval_step;
    const d6Status = report.d6_status;

    // Verify section is in review state
    if (d6Status !== 'under_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D6 is not in approval stage'
      });
    }

    // Verify user is the correct approver for current step
    const countermeasureUsers = escalationPath.countermeasure_users || [];

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const effectiveStep = (d6Status === 'under_review' && currentStep === 0) ? 1 : currentStep;

    // Step 1 = Approver 1 (index 1), Step 2 = Approver 2 (index 2), Step 3 = Approver 3 (index 3)
    if (effectiveStep < 1 || effectiveStep > 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D6 is not in approval stage'
      });
    }

    const expectedApproverId = countermeasureUsers[effectiveStep];

    // Check if user is admin (admins can approve anything)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== expectedApproverId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `You are not authorized to approve this step. Expected approver ${effectiveStep}`
      });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    let newStep = action === 'approve' ? effectiveStep + 1 : 0; // If rejected, return to primary (step 0)

    // Si se aprueba, verificar si existe el siguiente aprobador
    if (action === 'approve' && newStep < 4) {
      const nextApproverId = countermeasureUsers[newStep];
      if (!nextApproverId) {
        newStep = 4; // No hay más aprobadores, completar aprobación
      }
    }

    // Update approval fields for current step
    await client.query(
      `UPDATE eightd_reports
       SET d6_approval_${effectiveStep}_status = $1,
           d6_approval_${effectiveStep}_by = $2,
           d6_approval_${effectiveStep}_at = NOW(),
           d6_approval_${effectiveStep}_comments = $3,
           d6_current_approval_step = $4,
           d6_status = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        status,
        userId,
        comments || '',
        newStep,
        newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        id
      ]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: action === 'approve' ? 'approved' : 'rejected',
      actionCategory: 'approval',
      sectionName: 'd6',
      userId,
      userName,
      description: `D6 ${action === 'approve' ? 'Aprobado' : 'Rechazado'} - Paso ${effectiveStep}${comments ? ': ' + comments : ''}`,
      newValue: {
        step: effectiveStep,
        newStep: newStep,
        status: status,
        comments: comments || ''
      }
    });

    await client.query('COMMIT');

    // Preparar notificación por email
    let emailNotification = null;

    // Obtener información del reporte para notificaciones
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path, r.d3_mfg_responsible_user_ids
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};

    if (action === 'approve') {
      if (newStep === 4) {
        const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];
        if (involvedUserIds.length > 0) {
          const usersResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
            [involvedUserIds]
          );
          emailNotification = {
            type: 'stage_approved',
            recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
            subject: `[8D] ${reportInfo.report_id} - D6 Aprobado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D6',
            message: 'La etapa D6 (Verificación de Acciones) ha sido aprobada completamente.'
          };
        }
      } else {
        const nextApproverId = (ep.countermeasure_users || [])[newStep];
        if (nextApproverId) {
          const approverResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
            [nextApproverId]
          );
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            emailNotification = {
              type: 'approval_request',
              recipients: [{ id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` }],
              subject: `[8D] ${reportInfo.report_id} - Aprobación D6 Requerida (Paso ${newStep})`,
              reportId: reportInfo.report_id,
              title: reportInfo.title,
              supplier: reportInfo.supplier_name,
              stage: 'D6',
              approvalStep: newStep
            };
          }
        }
      }
    } else if (action === 'reject') {
      // RECHAZO - Notificar al responsable principal con el comentario
      const primaryUserId = (ep.countermeasure_users || [])[0];
      if (primaryUserId) {
        const primaryUserResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
          [primaryUserId]
        );
        if (primaryUserResult.rows.length > 0) {
          const primaryUser = primaryUserResult.rows[0];
          emailNotification = {
            type: 'rejection',
            recipients: [{ id: primaryUser.id, email: primaryUser.email, name: `${primaryUser.first_name} ${primaryUser.last_name}` }],
            subject: `[8D] ${reportInfo.report_id} - D6 Rechazado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D6',
            rejectionComments: comments,
            message: `La etapa D6 ha sido rechazada. Motivo: ${comments}`
          };
        }
      }
    }

    res.json({
      success: true,
      message: `D6 ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        currentStep: newStep,
        status: newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        completed: newStep === 4
      },
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D6:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Send D6 to Approval (Initialize approval process)
 * PUT /api/8d/reports/:id/d6/send-to-approval
 */
async function sendD6ToApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Verify user is the primary responsible
    const reportResult = await client.query(
      `SELECT escalation_path, d6_status, d6_completed
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const countermeasureUsers = escalationPath.countermeasure_users || [];
    const primaryUserId = countermeasureUsers[0];

    // Verify user is primary responsible (or admin)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== primaryUserId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the primary responsible can send to approval'
      });
    }

    // Verify D6 is marked as completed
    if (!report.d6_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D6 must be marked as completed before sending to approval'
      });
    }

    // Determine which step to start from based on previous rejections
    // If Approver 3 rejected, go back to step 3
    // If Approver 2 rejected, go back to step 2
    // If Approver 1 rejected (or never sent), start at step 1
    const approvalCheckResult = await client.query(
      `SELECT d6_approval_1_status, d6_approval_2_status, d6_approval_3_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    const approvalData = approvalCheckResult.rows[0];
    let startStep = 1; // Default: start from first approver

    // Check who rejected last (priority: 3 > 2 > 1)
    if (approvalData.d6_approval_3_status === 'rejected') {
      startStep = 3;
    } else if (approvalData.d6_approval_2_status === 'rejected') {
      startStep = 2;
    } else if (approvalData.d6_approval_1_status === 'rejected') {
      startStep = 1;
    }

    // Verificar si existe el aprobador para el startStep
    const firstApproverId = countermeasureUsers[startStep];

    // Si no hay aprobador, aprobar automáticamente
    if (!firstApproverId) {
      await client.query(
        `UPDATE eightd_reports
         SET d6_status = 'approved',
             d6_current_approval_step = 4,
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      const reportInfoResult = await client.query(
        `SELECT r.report_id, r.title, r.supplier_name, r.d3_mfg_responsible_user_ids
         FROM eightd_reports r WHERE r.id = $1`,
        [id]
      );
      const reportInfo = reportInfoResult.rows[0];
      const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

      let emailNotification = null;
      if (involvedUserIds.length > 0) {
        const usersResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
          [involvedUserIds]
        );
        emailNotification = {
          type: 'stage_approved',
          recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
          subject: `[8D] ${reportInfo.report_id} - D6 Aprobado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D6',
          message: 'La etapa D6 (Prevención de Recurrencia) ha sido aprobada automáticamente (sin aprobadores configurados).'
        };
      }

      return res.json({
        success: true,
        message: 'D6 approved automatically (no approvers configured)',
        data: { status: 'approved', currentStep: 4 },
        emailNotification
      });
    }

    // Initialize approval process (hay aprobadores)
    await client.query(
      `UPDATE eightd_reports
       SET d6_status = 'under_review',
           d6_current_approval_step = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startStep]
    );

    // Get user name for audit log
    const userResult = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const userName = userResult.rows[0]
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
      : 'Usuario desconocido';

    await client.query('COMMIT');

    // Log to audit trail
    await logAction({
      reportId: id,
      actionType: 'submitted_for_approval',
      actionCategory: 'approval',
      sectionName: 'd6',
      userId,
      userName,
      description: `D6 enviado a aprobación - Nivel ${startStep}`
    });

    // Obtener información del reporte para notificación por email
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    const countermeasureUsersForEmail = ep.countermeasure_users || [];

    const nextApproverId = countermeasureUsersForEmail[startStep];
    let approverEmail = null;

    if (nextApproverId) {
      const approverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        approverEmail = { id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` };
      }
    }

    res.json({
      success: true,
      message: 'D6 sent to approval successfully',
      data: {
        status: 'under_review',
        currentStep: startStep
      },
      emailNotification: {
        type: 'approval_request',
        recipients: approverEmail ? [approverEmail] : [],
        subject: `[8D] ${reportInfo.report_id} - Aprobación D6 Requerida (Paso ${startStep})`,
        reportId: reportInfo.report_id,
        title: reportInfo.title,
        supplier: reportInfo.supplier_name,
        stage: 'D6',
        approvalStep: startStep
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending D6 to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve or reject D7 (Multi-level approval for Confirmation team)
 * POST /api/8d/reports/:id/d7/approve
 */
async function approveD7(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const userId = req.user.id;

    // Validate: If rejecting, comments are REQUIRED
    if (action === 'reject' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    // Get current report and escalation path
    const reportResult = await client.query(
      `SELECT escalation_path, d7_current_approval_step, d7_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const currentStep = report.d7_current_approval_step;
    const d7Status = report.d7_status;

    // Verify section is in review state
    if (d7Status !== 'under_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D7 is not in approval stage'
      });
    }

    // Verify user is the correct approver for current step
    // D7 uses confirmation_users - Escalation Path D7 (Confirmation Section)
    const confirmationUsers = escalationPath.confirmation_users || [];

    // If status is 'under_review' but step is 0 (corrupted), assume step 1
    const effectiveStep = (d7Status === 'under_review' && currentStep === 0) ? 1 : currentStep;

    // Step 1 = Approver 1 (index 1), Step 2 = Approver 2 (index 2), Step 3 = Approver 3 (index 3)
    if (effectiveStep < 1 || effectiveStep > 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D7 is not in approval stage'
      });
    }

    const expectedApproverId = confirmationUsers[effectiveStep];

    // Check if user is admin (admins can approve anything)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== expectedApproverId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `You are not authorized to approve this step. Expected approver ${effectiveStep}`
      });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    let newStep = action === 'approve' ? effectiveStep + 1 : 0; // If rejected, return to primary (step 0)

    // Si se aprueba, verificar si existe el siguiente aprobador (usando confirmation_users)
    if (action === 'approve' && newStep < 4) {
      const nextApproverId = confirmationUsers[newStep];
      if (!nextApproverId) {
        newStep = 4; // No hay más aprobadores, completar aprobación
      }
    }

    // Update approval fields for current step
    await client.query(
      `UPDATE eightd_reports
       SET d7_approval_${effectiveStep}_status = $1,
           d7_approval_${effectiveStep}_by = $2,
           d7_approval_${effectiveStep}_at = NOW(),
           d7_approval_${effectiveStep}_comments = $3,
           d7_current_approval_step = $4,
           d7_status = $5,
           d7_completed = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        status,
        userId,
        comments || '',
        newStep,
        newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        newStep === 4, // d7_completed = true when fully approved
        id
      ]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: action === 'approve' ? 'approved' : 'rejected',
      actionCategory: 'approval',
      sectionName: 'd7',
      userId,
      userName,
      description: `D7 ${action === 'approve' ? 'Aprobado' : 'Rechazado'} - Paso ${effectiveStep}${comments ? ': ' + comments : ''}`,
      newValue: {
        step: effectiveStep,
        newStep: newStep,
        status: status,
        comments: comments || ''
      }
    });

    await client.query('COMMIT');

    // Preparar notificación por email
    let emailNotification = null;

    // Obtener información del reporte para notificaciones
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path, r.d3_mfg_responsible_user_ids
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};

    if (action === 'approve') {
      if (newStep === 4) {
        const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];
        if (involvedUserIds.length > 0) {
          const usersResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
            [involvedUserIds]
          );
          emailNotification = {
            type: 'stage_approved',
            recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
            subject: `[8D] ${reportInfo.report_id} - D7 Aprobado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D7',
            message: 'La etapa D7 (Acciones Preventivas) ha sido aprobada completamente.'
          };
        }
      } else {
        // D7 usa confirmation_users
        const nextApproverId = (ep.confirmation_users || [])[newStep];
        if (nextApproverId) {
          const approverResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
            [nextApproverId]
          );
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            emailNotification = {
              type: 'approval_request',
              recipients: [{ id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` }],
              subject: `[8D] ${reportInfo.report_id} - Aprobación D7 Requerida (Paso ${newStep})`,
              reportId: reportInfo.report_id,
              title: reportInfo.title,
              supplier: reportInfo.supplier_name,
              stage: 'D7',
              approvalStep: newStep
            };
          }
        }
      }
    } else if (action === 'reject') {
      // RECHAZO D7 - Notificar al responsable principal (confirmation_users[0])
      const primaryUserId = (ep.confirmation_users || [])[0];
      if (primaryUserId) {
        const primaryUserResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
          [primaryUserId]
        );
        if (primaryUserResult.rows.length > 0) {
          const primaryUser = primaryUserResult.rows[0];
          emailNotification = {
            type: 'rejection',
            recipients: [{ id: primaryUser.id, email: primaryUser.email, name: `${primaryUser.first_name} ${primaryUser.last_name}` }],
            subject: `[8D] ${reportInfo.report_id} - D7 Rechazado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D7',
            rejectionComments: comments,
            message: `La etapa D7 ha sido rechazada. Motivo: ${comments}`
          };
        }
      }
    }

    res.json({
      success: true,
      message: `D7 ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        currentStep: newStep,
        status: newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        completed: newStep === 4
      },
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D7:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Send D7 to Approval (Initialize approval process)
 * PUT /api/8d/reports/:id/d7/send-to-approval
 */
async function sendD7ToApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Verify user is the primary responsible
    const reportResult = await client.query(
      `SELECT escalation_path, d7_status, d7_completed
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const confirmationUsers = escalationPath.confirmation_users || [];

    // Verify user is the primary user (index 0) or admin
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== confirmationUsers[0]) {
      // Get primary user name for better error message
      const primaryUserResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [confirmationUsers[0]]
      );
      const primaryUserName = primaryUserResult.rows[0]?.name || 'Unknown';

      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `Solo el usuario primario de Confirmación (${primaryUserName}) puede enviar D7 a aprobación. Verifica la ruta de escalación en D1-D2-D3.`
      });
    }

    // Verify D7 is completed
    if (!report.d7_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D7 must be completed before sending to approval'
      });
    }

    // Determine starting step based on previous rejections
    let startStep = 1;

    // Check if there were previous rejections
    const approvalData = await client.query(
      `SELECT d7_approval_1_status, d7_approval_2_status, d7_approval_3_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    // Check who rejected last (priority: 3 > 2 > 1)
    if (approvalData.rows[0].d7_approval_3_status === 'rejected') {
      startStep = 3;
    } else if (approvalData.rows[0].d7_approval_2_status === 'rejected') {
      startStep = 2;
    } else if (approvalData.rows[0].d7_approval_1_status === 'rejected') {
      startStep = 1;
    }

    // Verificar si existe el aprobador para el startStep
    const firstApproverId = confirmationUsers[startStep];

    // Si no hay aprobador, aprobar automáticamente
    if (!firstApproverId) {
      await client.query(
        `UPDATE eightd_reports
         SET d7_status = 'approved',
             d7_current_approval_step = 4,
             d7_completed = true,
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      const reportInfoResult = await client.query(
        `SELECT r.report_id, r.title, r.supplier_name, r.d3_mfg_responsible_user_ids
         FROM eightd_reports r WHERE r.id = $1`,
        [id]
      );
      const reportInfo = reportInfoResult.rows[0];
      const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

      let emailNotification = null;
      if (involvedUserIds.length > 0) {
        const usersResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
          [involvedUserIds]
        );
        emailNotification = {
          type: 'stage_approved',
          recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
          subject: `[8D] ${reportInfo.report_id} - D7 Aprobado`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D7',
          message: 'La etapa D7 (Verificación de Efectividad) ha sido aprobada automáticamente (sin aprobadores configurados).'
        };
      }

      return res.json({
        success: true,
        message: 'D7 approved automatically (no approvers configured)',
        data: { status: 'approved', currentStep: 4 },
        emailNotification
      });
    }

    // Initialize approval process (hay aprobadores)
    await client.query(
      `UPDATE eightd_reports
       SET d7_status = 'under_review',
           d7_current_approval_step = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startStep]
    );

    // Get user name for audit log
    const userResult = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const userName = userResult.rows[0]
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
      : 'Usuario desconocido';

    await client.query('COMMIT');

    // Log to audit trail
    await logAction({
      reportId: id,
      actionType: 'submitted_for_approval',
      actionCategory: 'approval',
      sectionName: 'd7',
      userId,
      userName,
      description: `D7 enviado a aprobación - Nivel ${startStep}`
    });

    // Obtener información del reporte para notificación por email
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    // D7 usa confirmation_users
    const confirmationUsersForEmail = ep.confirmation_users || [];

    const nextApproverId = confirmationUsersForEmail[startStep];
    let approverEmail = null;

    if (nextApproverId) {
      const approverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        approverEmail = { id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` };
      }
    }

    res.json({
      success: true,
      message: 'D7 sent to approval successfully',
      data: {
        status: 'under_review',
        currentStep: startStep
      },
      emailNotification: {
        type: 'approval_request',
        recipients: approverEmail ? [approverEmail] : [],
        subject: `[8D] ${reportInfo.report_id} - Aprobación D7 Requerida (Paso ${startStep})`,
        reportId: reportInfo.report_id,
        title: reportInfo.title,
        supplier: reportInfo.supplier_name,
        stage: 'D7',
        approvalStep: startStep
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending D7 to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve or reject D8 (Multi-level approval for Confirmation team)
 * POST /api/8d/reports/:id/d8/approve
 */
async function approveD8(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { action, comments } = req.body;
    const userId = req.user.id;

    if (action === 'reject' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    const reportResult = await client.query(
      `SELECT escalation_path, d8_current_approval_step, d8_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const currentStep = report.d8_current_approval_step;
    const d8Status = report.d8_status;

    if (d8Status !== 'under_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D8 is not in approval stage'
      });
    }

    const confirmationUsers = escalationPath.confirmation_users || [];
    const effectiveStep = (d8Status === 'under_review' && currentStep === 0) ? 1 : currentStep;

    if (effectiveStep < 1 || effectiveStep > 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D8 is not in approval stage'
      });
    }

    const expectedApproverId = confirmationUsers[effectiveStep];

    // Check if user is admin (admins can approve anything)
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== expectedApproverId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `You are not authorized to approve this step. Expected approver ${effectiveStep}`
      });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    let newStep = action === 'approve' ? effectiveStep + 1 : 0;

    // Si se aprueba, verificar si existe el siguiente aprobador
    if (action === 'approve' && newStep < 4) {
      const nextApproverId = confirmationUsers[newStep];
      if (!nextApproverId) {
        newStep = 4; // No hay más aprobadores, completar aprobación
      }
    }

    // When D8 is fully approved (newStep === 4), also mark the entire report as completed
    const isFullyApproved = newStep === 4;

    await client.query(
      `UPDATE eightd_reports
       SET d8_approval_${effectiveStep}_status = $1,
           d8_approval_${effectiveStep}_by = $2,
           d8_approval_${effectiveStep}_at = NOW(),
           d8_approval_${effectiveStep}_comments = $3,
           d8_current_approval_step = $4,
           d8_status = $5,
           d8_completed = $6,
           ${isFullyApproved ? "status = 'completed', current_step = 'closed'," : ""}
           updated_at = NOW()
       WHERE id = $7`,
      [
        status,
        userId,
        comments || '',
        newStep,
        newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        newStep === 4,
        id
      ]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: action === 'approve' ? 'approved' : 'rejected',
      actionCategory: 'approval',
      sectionName: 'd8',
      userId,
      userName,
      description: `D8 ${action === 'approve' ? 'Aprobado' : 'Rechazado'} - Paso ${effectiveStep}${comments ? ': ' + comments : ''}`,
      newValue: {
        step: effectiveStep,
        newStep: newStep,
        status: status,
        comments: comments || ''
      }
    });

    await client.query('COMMIT');

    // Preparar notificación por email
    let emailNotification = null;

    // Obtener información del reporte para notificaciones
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path, r.d3_mfg_responsible_user_ids
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};

    if (action === 'approve') {
      if (newStep === 4) {
        // D8 APROBADO = 8D CERRADO - Notificar a TODOS los involucrados
        const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];
        if (involvedUserIds.length > 0) {
          const usersResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
            [involvedUserIds]
          );
          emailNotification = {
            type: 'stage_approved',
            recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
            subject: `[8D] ${reportInfo.report_id} - 8D CERRADO`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D8',
            message: 'El reporte 8D ha sido CERRADO exitosamente. Todas las etapas han sido completadas y aprobadas.'
          };
        }
      } else {
        // D8 usa confirmation_users
        const nextApproverId = (ep.confirmation_users || [])[newStep];
        if (nextApproverId) {
          const approverResult = await client.query(
            `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
            [nextApproverId]
          );
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            emailNotification = {
              type: 'approval_request',
              recipients: [{ id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` }],
              subject: `[8D] ${reportInfo.report_id} - Aprobación D8 Requerida (Paso ${newStep})`,
              reportId: reportInfo.report_id,
              title: reportInfo.title,
              supplier: reportInfo.supplier_name,
              stage: 'D8',
              approvalStep: newStep
            };
          }
        }
      }
    } else if (action === 'reject') {
      // RECHAZO D8 - Notificar al responsable principal (confirmation_users[0])
      const primaryUserId = (ep.confirmation_users || [])[0];
      if (primaryUserId) {
        const primaryUserResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
          [primaryUserId]
        );
        if (primaryUserResult.rows.length > 0) {
          const primaryUser = primaryUserResult.rows[0];
          emailNotification = {
            type: 'rejection',
            recipients: [{ id: primaryUser.id, email: primaryUser.email, name: `${primaryUser.first_name} ${primaryUser.last_name}` }],
            subject: `[8D] ${reportInfo.report_id} - D8 Rechazado`,
            reportId: reportInfo.report_id,
            title: reportInfo.title,
            supplier: reportInfo.supplier_name,
            stage: 'D8',
            rejectionComments: comments,
            message: `La etapa D8 ha sido rechazada. Motivo: ${comments}`
          };
        }
      }
    }

    res.json({
      success: true,
      message: `D8 ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        currentStep: newStep,
        status: newStep === 4 ? 'approved' : (action === 'reject' ? 'draft' : 'under_review'),
        completed: newStep === 4
      },
      emailNotification
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving D8:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Send D8 to Approval (Initialize approval process)
 * PUT /api/8d/reports/:id/d8/send-to-approval
 */
async function sendD8ToApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    const reportResult = await client.query(
      `SELECT escalation_path, d8_status, d8_completed
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const escalationPath = report.escalation_path;
    const confirmationUsers = escalationPath.confirmation_users || [];

    // Verify user is primary or admin
    const isAdmin = await isUserAdmin(client, userId);

    if (!isAdmin && userId !== confirmationUsers[0]) {
      // Get primary user name for better error message
      const primaryUserResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [confirmationUsers[0]]
      );
      const primaryUserName = primaryUserResult.rows[0]?.name || 'Unknown';

      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `Solo el usuario primario de Confirmación (${primaryUserName}) puede enviar D8 a aprobación. Verifica la ruta de escalación en D1-D2-D3.`
      });
    }

    if (!report.d8_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'D8 must be completed before sending to approval'
      });
    }

    let startStep = 1;

    const approvalData = await client.query(
      `SELECT d8_approval_1_status, d8_approval_2_status, d8_approval_3_status
       FROM eightd_reports
       WHERE id = $1`,
      [id]
    );

    if (approvalData.rows[0].d8_approval_3_status === 'rejected') {
      startStep = 3;
    } else if (approvalData.rows[0].d8_approval_2_status === 'rejected') {
      startStep = 2;
    } else if (approvalData.rows[0].d8_approval_1_status === 'rejected') {
      startStep = 1;
    }

    // Verificar si existe el aprobador para el startStep
    const firstApproverId = confirmationUsers[startStep];

    // Si no hay aprobador, aprobar automáticamente y cerrar el 8D
    if (!firstApproverId) {
      await client.query(
        `UPDATE eightd_reports
         SET d8_status = 'approved',
             d8_current_approval_step = 4,
             d8_completed = true,
             status = 'completed',
             current_step = 'closed',
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      const reportInfoResult = await client.query(
        `SELECT r.report_id, r.title, r.supplier_name, r.d3_mfg_responsible_user_ids
         FROM eightd_reports r WHERE r.id = $1`,
        [id]
      );
      const reportInfo = reportInfoResult.rows[0];
      const involvedUserIds = reportInfo.d3_mfg_responsible_user_ids || [];

      let emailNotification = null;
      if (involvedUserIds.length > 0) {
        const usersResult = await client.query(
          `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
          [involvedUserIds]
        );
        emailNotification = {
          type: 'stage_approved',
          recipients: usersResult.rows.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` })),
          subject: `[8D] ${reportInfo.report_id} - D8 Aprobado (8D Cerrado)`,
          reportId: reportInfo.report_id,
          title: reportInfo.title,
          supplier: reportInfo.supplier_name,
          stage: 'D8',
          message: 'El reporte 8D ha sido cerrado exitosamente. Todas las etapas han sido aprobadas.'
        };
      }

      return res.json({
        success: true,
        message: 'D8 approved automatically (no approvers configured) - 8D Report Closed',
        data: { status: 'approved', currentStep: 4 },
        emailNotification
      });
    }

    // Initialize approval process (hay aprobadores)
    await client.query(
      `UPDATE eightd_reports
       SET d8_status = 'under_review',
           d8_current_approval_step = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startStep]
    );

    // Log audit trail - proper format for audit log
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await logAction({
      reportId: id,
      actionType: 'submitted_for_approval',
      actionCategory: 'approval',
      sectionName: 'd8',
      userId,
      userName,
      description: `D8 enviado a aprobación - Nivel ${startStep}`
    });

    await client.query('COMMIT');

    // Obtener información del reporte para notificación por email
    const reportInfoResult = await client.query(
      `SELECT r.report_id, r.title, r.supplier_name, r.escalation_path
       FROM eightd_reports r WHERE r.id = $1`,
      [id]
    );
    const reportInfo = reportInfoResult.rows[0];
    const ep = reportInfo.escalation_path || {};
    // D8 usa confirmation_users
    const confirmationUsersForEmail = ep.confirmation_users || [];

    const nextApproverId = confirmationUsersForEmail[startStep];
    let approverEmail = null;

    if (nextApproverId) {
      const approverResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [nextApproverId]
      );
      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        approverEmail = { id: approver.id, email: approver.email, name: `${approver.first_name} ${approver.last_name}` };
      }
    }

    res.json({
      success: true,
      message: 'D8 sent to approval successfully',
      data: {
        status: 'under_review',
        currentStep: startStep
      },
      emailNotification: {
        type: 'approval_request',
        recipients: approverEmail ? [approverEmail] : [],
        subject: `[8D] ${reportInfo.report_id} - Aprobación D8 (Cierre) Requerida (Paso ${startStep})`,
        reportId: reportInfo.report_id,
        title: reportInfo.title,
        supplier: reportInfo.supplier_name,
        stage: 'D8',
        approvalStep: startStep
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending D8 to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to approval',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Revert entire 8D to draft with versioning (Admin only)
 * PUT /api/8d/reports/:id/revert-to-draft
 *
 * NEW LOGIC (ISO Compliant):
 * 1. Archives current document (is_archived = true, locked)
 * 2. Creates a new revision copy (8D-XXXX-R1, R2, etc.)
 * 3. Copies all attachments
 * 4. New revision starts in draft with all approvals reset
 */
async function revertToDraft(req, res) {
  const client = await pool.connect();
  const fs = require('fs');
  const path = require('path');

  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.id;

    // Validate comments required
    if (!comments || comments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when reverting to draft'
      });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(client, userId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can revert to draft'
      });
    }

    await client.query('BEGIN');

    // Get current report data
    const reportResult = await client.query(
      `SELECT * FROM eightd_reports WHERE id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const originalReport = reportResult.rows[0];

    // Check if already archived
    if (originalReport.is_archived) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This report is already archived and cannot be reverted'
      });
    }

    // Calculate new revision number
    // Find the highest revision number for this report family
    const baseReportId = originalReport.report_id.replace(/-R\d+$/, ''); // Remove existing -R suffix if any
    const revisionResult = await client.query(
      `SELECT COALESCE(MAX(revision_number), 0) as max_revision
       FROM eightd_reports
       WHERE report_id LIKE $1 OR report_id = $2`,
      [`${baseReportId}-R%`, baseReportId]
    );
    const newRevisionNumber = (revisionResult.rows[0].max_revision || originalReport.revision_number || 0) + 1;
    const newReportId = `${baseReportId}-R${newRevisionNumber}`;

    // 1. Archive the current document
    await client.query(
      `UPDATE eightd_reports
       SET is_archived = true,
           archived_at = NOW(),
           archived_by = $1,
           archived_reason = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [userId, comments, id]
    );

    // 2. Create new revision - copy all fields except id, and reset approvals
    const insertResult = await client.query(
      `INSERT INTO eightd_reports (
        report_id, title, description, severity, status, current_step,
        supplier_name, supplier_account, part_number, part_name,
        problem_type, tipo_issue, tipo_resp, timing_occurrence,
        estimated_cost, target_closure_date, customer_impact, issue_date,
        escalation_path, created_by, created_at,

        -- D1-D2-D3 data (copy but reset approval)
        d1_team_members, d2_problem_description, d2_is_or_is_not,
        d3_containment_actions,
        d3_detection_points, d3_non_detection_reasons, d3_suspect_material_disposal,
        d3_conformance_guarantee, d3_requires_rework, d3_rework_unit_cost, d3_real_impact_cost,
        d1_d2_d3_approval_status, current_approval_step,

        -- D3-MFG data (copy but reset approval)
        d3_mfg_temporary_controls, d3_mfg_inspection_points,
        d3_mfg_parameters_adjusted, d3_mfg_poka_yoke_devices,
        d3_mfg_line_modifications, d3_mfg_operator_training,
        d3_mfg_effectiveness_validation, d3_mfg_others,
        d3_mfg_responsible_user_ids, d3_mfg_implementation_date,
        d3_mfg_status, d3_mfg_current_approval_step,

        -- D4 data (copy but reset approval)
        d4_root_causes, d4_five_whys_analysis, d4_fishbone_analysis,
        d4_analysis_technique, d4_potential_causes, d4_root_cause,
        d4_verification_method, d4_verification_evidence,
        d4_temporary_countermeasure, d4_responsible_user_id, d4_implementation_date,
        d4_effectiveness_evaluation, d4_4m_evaluation, d4_5whys_analysis,
        d4_status, d4_current_approval_step,

        -- D5 data (copy but reset approval)
        d5_corrective_actions, d5_final_root_cause, d5_analysis_responsible_user_id,
        d5_status, d5_current_approval_step,

        -- D6 data (copy but reset approval)
        d6_implementation_plan, d6_validation_plan, d6_countermeasure_description,
        d6_definitive_actions,
        d6_status, d6_current_approval_step,

        -- D7 data (copy but reset approval)
        d7_preventive_actions, d7_confirmation_evidence,
        d7_status, d7_current_approval_step,

        -- D8 data (copy but reset approval)
        d8_lessons_learned, d8_team_recognition,
        d8_followup_actions, d8_evidence_documentation, d8_closure_notes,
        d8_status, d8_current_approval_step,

        -- Revision tracking
        revision_number, parent_report_id, is_archived,

        updated_at
      )
      SELECT
        $1, title, description, severity, 'in_progress', 'd1_d2_d3',
        supplier_name, supplier_account, part_number, part_name,
        problem_type, tipo_issue, tipo_resp, timing_occurrence,
        estimated_cost, target_closure_date, customer_impact, COALESCE(issue_date, NOW()),
        escalation_path, $2, NOW(),

        -- D1-D2-D3 data (reset approval)
        d1_team_members, d2_problem_description, d2_is_or_is_not,
        d3_containment_actions,
        d3_detection_points, d3_non_detection_reasons, d3_suspect_material_disposal,
        d3_conformance_guarantee, d3_requires_rework, d3_rework_unit_cost, d3_real_impact_cost,
        'draft', 0,

        -- D3-MFG data (reset approval)
        d3_mfg_temporary_controls, d3_mfg_inspection_points,
        d3_mfg_parameters_adjusted, d3_mfg_poka_yoke_devices,
        d3_mfg_line_modifications, d3_mfg_operator_training,
        d3_mfg_effectiveness_validation, d3_mfg_others,
        d3_mfg_responsible_user_ids, d3_mfg_implementation_date,
        'draft', 0,

        -- D4 data (reset approval)
        d4_root_causes, d4_five_whys_analysis, d4_fishbone_analysis,
        d4_analysis_technique, d4_potential_causes, d4_root_cause,
        d4_verification_method, d4_verification_evidence,
        d4_temporary_countermeasure, d4_responsible_user_id, d4_implementation_date,
        d4_effectiveness_evaluation, d4_4m_evaluation, d4_5whys_analysis,
        'draft', 0,

        -- D5 data (reset approval)
        d5_corrective_actions, d5_final_root_cause, d5_analysis_responsible_user_id,
        'draft', 0,

        -- D6 data (reset approval)
        d6_implementation_plan, d6_validation_plan, d6_countermeasure_description,
        d6_definitive_actions,
        'draft', 0,

        -- D7 data (reset approval)
        d7_preventive_actions, d7_confirmation_evidence,
        'draft', 0,

        -- D8 data (reset approval)
        d8_lessons_learned, d8_team_recognition,
        d8_followup_actions, d8_evidence_documentation, d8_closure_notes,
        'draft', 0,

        -- Revision tracking
        $3, $4, false,

        NOW()
      FROM eightd_reports WHERE id = $4
      RETURNING id`,
      [newReportId, userId, newRevisionNumber, id]
    );

    const newReportDbId = insertResult.rows[0].id;

    // 2b. Reset workloadActivityId in D6 actions — new revision must create new Workload activities
    const d6ActionsRaw = insertResult.rows[0]?.d6_definitive_actions;
    if (d6ActionsRaw) {
      const d6Actions = typeof d6ActionsRaw === 'string' ? JSON.parse(d6ActionsRaw) : d6ActionsRaw;
      if (Array.isArray(d6Actions) && d6Actions.length > 0) {
        const resetActions = d6Actions.map(a => ({ ...a, workloadActivityId: null }));
        await client.query(
          `UPDATE eightd_reports SET d6_definitive_actions = $1 WHERE id = $2`,
          [JSON.stringify(resetActions), newReportDbId]
        );
      }
    }

    // 3. Copy parts from eightd_parts
    await client.query(
      `INSERT INTO eightd_parts (
        report_id, client_id, client_name, project_id, project_number, project_name,
        part_id, part_number, part_name, client_part_number,
        revision, description, unit_cost, currency, specifications,
        qty_warehouse, qty_in_process, qty_in_transit, qty_with_customer,
        total_affected_qty, total_cost_impact, created_at
      )
      SELECT
        $1, client_id, client_name, project_id, project_number, project_name,
        part_id, part_number, part_name, client_part_number,
        revision, description, unit_cost, currency, specifications,
        qty_warehouse, qty_in_process, qty_in_transit, qty_with_customer,
        total_affected_qty, total_cost_impact, NOW()
      FROM eightd_parts WHERE report_id = $2`,
      [newReportDbId, id]
    );

    // 4. Copy attachments (records and files)
    const attachmentsResult = await client.query(
      `SELECT * FROM eightd_attachments WHERE report_id = $1`,
      [id]
    );

    const uploadsDir = path.join(__dirname, '..', 'uploads', '8d');

    for (const attachment of attachmentsResult.rows) {
      // upload_path is the actual column name in eightd_attachments
      const originalPath = attachment.upload_path;
      if (!originalPath) {
        console.warn(`Skipping attachment ${attachment.id} - no upload_path`);
        continue;
      }
      // Generate new filename for the copy
      const fileExt = path.extname(originalPath);
      const newFileName = `${newReportDbId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExt}`;
      const newFilePath = path.join(uploadsDir, newFileName);

      // Copy physical file if it exists
      if (fs.existsSync(originalPath)) {
        try {
          fs.copyFileSync(originalPath, newFilePath);
        } catch (copyError) {
          console.error('Error copying attachment file:', copyError);
        }
      }

      // Insert attachment record for new report
      await client.query(
        `INSERT INTO eightd_attachments (
          report_id, filename, original_filename, file_size, mime_type,
          upload_path, uploaded_by, description, attachment_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newReportDbId,
          attachment.filename,
          attachment.original_filename,
          attachment.file_size,
          attachment.mime_type,
          newFilePath,
          userId,
          attachment.description,
          attachment.attachment_type || 'document'
        ]
      );
    }

    // 4b. Copy D7 validation records and files
    const d7ValidationResult = await client.query(
      `SELECT * FROM d7_validations WHERE report_id = $1`,
      [id]
    );

    if (d7ValidationResult.rows.length > 0) {
      const originalValidation = d7ValidationResult.rows[0];

      // Insert new d7_validations record for new report
      const newValidationResult = await client.query(
        `INSERT INTO d7_validations (
          report_id, before_condition, after_condition,
          spc_validated, spc_comments,
          training_completed, training_dates, training_instructor, training_topics,
          training_method, competency_verified, competency_method,
          d3_implemented, d3_effective, d3_spc_judgment, d3_client_judgment, d3_comments, d3_lesson,
          d5_implemented, d5_effective, d5_spc_judgment, d5_client_judgment, d5_comments, d5_lesson,
          spc_audit_judgment, training_audit_judgment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING id`,
        [
          newReportDbId,
          originalValidation.before_condition,
          originalValidation.after_condition,
          originalValidation.spc_validated,
          originalValidation.spc_comments,
          originalValidation.training_completed,
          originalValidation.training_dates,
          originalValidation.training_instructor,
          originalValidation.training_topics,
          originalValidation.training_method,
          originalValidation.competency_verified,
          originalValidation.competency_method,
          originalValidation.d3_implemented,
          originalValidation.d3_effective,
          originalValidation.d3_spc_judgment,
          originalValidation.d3_client_judgment,
          originalValidation.d3_comments,
          originalValidation.d3_lesson,
          originalValidation.d5_implemented,
          originalValidation.d5_effective,
          originalValidation.d5_spc_judgment,
          originalValidation.d5_client_judgment,
          originalValidation.d5_comments,
          originalValidation.d5_lesson,
          originalValidation.spc_audit_judgment,
          originalValidation.training_audit_judgment
        ]
      );

      const newValidationId = newValidationResult.rows[0].id;
      const d7UploadsDir = path.join(__dirname, '..', 'uploads', 'd7-evidence');

      // Copy d7_validation_files
      const d7FilesResult = await client.query(
        `SELECT * FROM d7_validation_files WHERE d7_validation_id = $1`,
        [originalValidation.id]
      );

      for (const file of d7FilesResult.rows) {
        const fileExt = path.extname(file.file_url || '');
        const newFileName = `${newReportDbId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExt}`;
        const newFileUrl = `/uploads/d7-evidence/${newFileName}`;

        // Copy physical file
        const originalFilePath = path.join(__dirname, '..', file.file_url || '');
        const newFilePath = path.join(d7UploadsDir, newFileName);
        if (fs.existsSync(originalFilePath)) {
          try {
            if (!fs.existsSync(d7UploadsDir)) fs.mkdirSync(d7UploadsDir, { recursive: true });
            fs.copyFileSync(originalFilePath, newFilePath);
          } catch (copyError) {
            console.error('Error copying D7 file:', copyError);
          }
        }

        await client.query(
          `INSERT INTO d7_validation_files (
            d7_validation_id, file_type, file_name, file_url, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5)`,
          [newValidationId, file.file_type, file.file_name, newFileUrl, userId]
        );
      }

      console.log(`✅ Copied ${d7FilesResult.rows.length} D7 validation file(s) to new revision`);

      // Copy d7_audit_items (checklist with audit results)
      const d7AuditItemsResult = await client.query(
        `SELECT * FROM d7_audit_items WHERE d7_validation_id = $1 ORDER BY display_order`,
        [originalValidation.id]
      );

      const d7AuditUploadsDir = path.join(__dirname, '..', 'uploads', 'd7-evidence');

      for (const item of d7AuditItemsResult.rows) {
        const newAuditItemResult = await client.query(
          `INSERT INTO d7_audit_items (
            d7_validation_id, item_name, item_icon, comments, audit_judgment, is_default, display_order,
            check_item, due_date, assigned_auditors,
            auditor_judgment, auditor_comments, auditor_completed, sent_to_audit,
            audited_by, verification_date, audit_round
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id`,
          [
            newValidationId,
            item.item_name,
            item.item_icon,
            item.comments,
            item.audit_judgment,
            item.is_default,
            item.display_order,
            item.check_item,
            item.due_date,
            item.assigned_auditors,
            item.auditor_judgment,
            item.auditor_comments,
            item.auditor_completed,
            false, // reset sent_to_audit for new revision
            null,  // reset audited_by
            null,  // reset verification_date
            (item.audit_round || 1) + 1 // increment round
          ]
        );

        const newAuditItemId = newAuditItemResult.rows[0].id;

        // Copy d7_audit_item_files for this item
        const itemFilesResult = await client.query(
          `SELECT * FROM d7_audit_item_files WHERE d7_audit_item_id = $1`,
          [item.id]
        );

        for (const file of itemFilesResult.rows) {
          const fileExt = path.extname(file.file_url || '');
          const newFileName = `${newReportDbId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExt}`;
          const newFileUrl = `/uploads/d7-evidence/${newFileName}`;
          const originalFilePath = path.join(__dirname, '..', file.file_url || '');
          const newFilePath = path.join(d7AuditUploadsDir, newFileName);

          if (fs.existsSync(originalFilePath)) {
            try {
              if (!fs.existsSync(d7AuditUploadsDir)) fs.mkdirSync(d7AuditUploadsDir, { recursive: true });
              fs.copyFileSync(originalFilePath, newFilePath);
            } catch (copyError) {
              console.error('Error copying D7 audit item file:', copyError);
            }
          }

          await client.query(
            `INSERT INTO d7_audit_item_files (d7_audit_item_id, file_name, file_url, uploaded_by)
             VALUES ($1, $2, $3, $4)`,
            [newAuditItemId, file.file_name, newFileUrl, userId]
          );
        }
      }

      console.log(`✅ Copied ${d7AuditItemsResult.rows.length} D7 audit item(s) to new revision`);
    }

    // 5. Log audit trail for archived document
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;

    await logAction({
      reportId: id,
      actionType: 'archived',
      actionCategory: 'revision',
      userId,
      userName,
      description: `Documento archivado. Nueva revisión creada: ${newReportId}. Motivo: ${comments}`,
      newValue: {
        archivedReportId: originalReport.report_id,
        newRevisionId: newReportId,
        newRevisionDbId: newReportDbId,
        revisionNumber: newRevisionNumber,
        comments: comments,
        archivedBy: userName
      }
    });

    // 6. Log audit trail for new revision
    await logAction({
      reportId: newReportDbId,
      actionType: 'revision_created',
      actionCategory: 'revision',
      userId,
      userName,
      description: `Revisión ${newRevisionNumber} creada a partir de ${originalReport.report_id}. Motivo: ${comments}`,
      newValue: {
        parentReportId: originalReport.report_id,
        parentDbId: id,
        revisionNumber: newRevisionNumber,
        comments: comments,
        createdBy: userName
      }
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Document archived. New revision ${newReportId} created successfully`,
      data: {
        archivedReport: {
          id: id,
          reportId: originalReport.report_id
        },
        newRevision: {
          id: newReportDbId,
          reportId: newReportId,
          revisionNumber: newRevisionNumber
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reverting to draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverting to draft',
      error: error.message
    });
  } finally {
    client.release();
  }
}

module.exports = {
  approveD3MFG,
  approveD4,
  approveD5,
  approveD6,
  approveD7,
  approveD8,
  sendD3MfgToApproval,
  sendD4ToApproval,
  sendD5ToApproval,
  sendD6ToApproval,
  sendD7ToApproval,
  sendD8ToApproval,
  revertToDraft
};
