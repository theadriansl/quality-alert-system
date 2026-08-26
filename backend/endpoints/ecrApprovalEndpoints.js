const { pool } = require('../config/database');
const { logECRAction } = require('../utils/ecrAuditLog');
const { sendEcrNotificationToReviewBoard, sendEcrPendingApprovalNotification } = require('../utils/emailService');

/**
 * Get approval status for an ECR
 * GET /ecr/:id/approval-status
 */
async function getECRApprovalStatus(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        e.id,
        e.approval_status as current_status,
        e.current_approval_level,
        e.created_by,
        e.level1_approver,
        e.level2_approver,
        e.level3_approver,
        e.level1_status,
        e.level1_by,
        e.level1_at,
        e.level1_comments,
        e.level2_status,
        e.level2_by,
        e.level2_at,
        e.level2_comments,
        e.level3_status,
        e.level3_by,
        e.level3_at,
        e.level3_comments,
        e.approval_history
      FROM ecr_reports e
      WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ECR not found'
      });
    }

    const ecr = result.rows[0];

    // Get pending approver info
    let pendingApprover = null;
    if (ecr.current_status === 'pending_approval' && ecr.current_approval_level) {
      const approverIdField = `level${ecr.current_approval_level}_approver`;
      const approverId = ecr[approverIdField];

      if (approverId) {
        const approverResult = await pool.query(
          'SELECT id, first_name, last_name, position FROM users WHERE id = $1',
          [approverId]
        );

        if (approverResult.rows.length > 0) {
          const approver = approverResult.rows[0];
          pendingApprover = {
            level: ecr.current_approval_level,
            approverId: approver.id,
            approverName: `${approver.first_name} ${approver.last_name}`,
            approverPosition: approver.position
          };
        }
      }
    }

    // Build approval history
    const approvalHistory = [];
    for (let level = 1; level <= 3; level++) {
      const status = ecr[`level${level}_status`];
      const by = ecr[`level${level}_by`];
      const at = ecr[`level${level}_at`];
      const comments = ecr[`level${level}_comments`];

      if (status && by) {
        const userResult = await pool.query(
          'SELECT first_name, last_name, position FROM users WHERE id = $1',
          [by]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          approvalHistory.push({
            id: `${id}-level${level}`,
            level,
            action: status,
            approverName: `${user.first_name} ${user.last_name}`,
            approverPosition: user.position,
            comments,
            createdAt: at
          });
        }
      }
    }

    // Build complete approval chain (all levels with their status)
    const approvalChain = [];
    for (let level = 1; level <= 3; level++) {
      const approverId = ecr[`level${level}_approver`];
      if (approverId) {
        const userResult = await pool.query(
          'SELECT id, first_name, last_name, position FROM users WHERE id = $1',
          [approverId]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const status = ecr[`level${level}_status`];
          const at = ecr[`level${level}_at`];
          const comments = ecr[`level${level}_comments`];

          let displayStatus = 'not_started'; // No iniciado
          if (status === 'approved') displayStatus = 'approved';
          else if (status === 'rejected') displayStatus = 'rejected';
          else if (ecr.current_approval_level === level && ecr.current_status === 'pending_approval') displayStatus = 'pending';

          approvalChain.push({
            level,
            approverId: user.id,
            approverName: `${user.first_name} ${user.last_name}`,
            approverPosition: user.position,
            status: displayStatus,
            approvedAt: at,
            comments
          });
        }
      }
    }

    res.json({
      success: true,
      currentStatus: ecr.current_status,
      currentLevel: ecr.current_approval_level,
      createdBy: ecr.created_by,
      pendingApprover,
      approvalHistory,
      approvalChain,
      fullApprovalHistory: ecr.approval_history || []
    });
  } catch (error) {
    console.error('Error getting ECR approval status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Submit ECR for approval
 * POST /ecr/:id/submit-for-approval
 */
async function submitECRForApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Get ECR and verify creator
    const ecrResult = await client.query(
      'SELECT created_by, approval_status, level1_approver, rejected_at_level, validation_actions, validation_evidence FROM ecr_reports WHERE id = $1',
      [id]
    );

    if (ecrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'ECR not found'
      });
    }

    const ecr = ecrResult.rows[0];

    // Verify user is creator
    if (ecr.created_by !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the ECR creator can submit for approval'
      });
    }

    // Verify ECR is in draft or rejected status (allow resubmit after rejection)
    if (ecr.approval_status !== 'draft' && ecr.approval_status !== 'rejected') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR must be in draft or rejected status to submit'
      });
    }

    // Verify at least level 1 approver is assigned
    if (!ecr.level1_approver) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'At least one approver must be assigned before submitting'
      });
    }

    // Verify all validation actions (Master Plan) are completed at 100%
    const validationActions = ecr.validation_actions || [];
    if (validationActions.length > 0) {
      const incompleteActions = validationActions.filter(action =>
        (action.actualProgress || 0) < 100
      );
      if (incompleteActions.length > 0) {
        await client.query('ROLLBACK');
        const incompleteNames = incompleteActions.map(a => `${a.action} (${a.actualProgress || 0}%)`).join(', ');
        return res.status(400).json({
          success: false,
          message: `Todas las actividades del Master Plan deben estar completadas al 100%. Actividades pendientes: ${incompleteNames}`
        });
      }
    }

    // Verify Validation Evidence is signed if it was required
    const validationEvidence = ecr.validation_evidence || {};
    if (validationEvidence.requiresValidation === true && !validationEvidence.isLocked) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'La Evidencia de Validación debe estar firmada antes de enviar a aprobación'
      });
    }

    // Determine starting level: use rejected_at_level if resubmitting, otherwise level 1
    const startLevel = ecr.rejected_at_level || 1;

    const submitterName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    const isResubmit = ecr.rejected_at_level !== null;

    // Update status to pending_approval and set current level
    // Also add to approval_history
    await client.query(
      `UPDATE ecr_reports
       SET approval_status = 'pending_approval',
           current_approval_level = $2,
           rejected_at_level = NULL,
           approval_history = COALESCE(approval_history, '[]'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [id, startLevel, JSON.stringify({
        action: isResubmit ? 'resubmitted' : 'submitted',
        level: startLevel,
        userId,
        userName: submitterName,
        timestamp: new Date().toISOString()
      })]
    );

    await client.query('COMMIT');
    logECRAction({ ecrId: parseInt(id), actionType: 'submitted_approval', actionCategory: 'approval', userId: req.user?.id, userName: submitterName, description: isResubmit ? `ECR re-enviado a aprobación (Nivel ${startLevel})` : 'ECR enviado a aprobación' });

    // Send email notification to approver at startLevel
    try {
      const ecrData = await pool.query(
        `SELECT ecr_number, change_title, level${startLevel}_approver as approver_id FROM ecr_reports WHERE id = $1`,
        [id]
      );
      if (ecrData.rows[0]?.approver_id) {
        const approverResult = await pool.query(
          'SELECT first_name, last_name, email FROM users WHERE id = $1',
          [ecrData.rows[0].approver_id]
        );
        if (approverResult.rows[0]?.email) {
          const approver = approverResult.rows[0];
          sendEcrPendingApprovalNotification({
            to: approver.email,
            approverName: `${approver.first_name || ''} ${approver.last_name || ''}`.trim(),
            ecrNumber: ecrData.rows[0].ecr_number,
            ecrTitle: ecrData.rows[0].change_title,
            submitterName,
            level: startLevel
          }).catch(err => console.error('Error sending ECR pending approval email:', err));
        }
      }
    } catch (emailErr) {
      console.error('Error preparing ECR pending approval email:', emailErr);
    }

    // Prepare mailto data for frontend
    let mailtoData = null;
    try {
      const mailtoResult = await pool.query(
        `SELECT e.ecr_number, e.change_title,
                u.email as approver_email, u.first_name as approver_first_name, u.last_name as approver_last_name
         FROM ecr_reports e
         LEFT JOIN users u ON e.level${startLevel}_approver = u.id
         WHERE e.id = $1`,
        [id]
      );

      if (mailtoResult.rows[0]) {
        const data = mailtoResult.rows[0];
        mailtoData = {
          ecrNumber: data.ecr_number,
          changeTitle: data.change_title,
          approverEmail: data.approver_email,
          approverName: `${data.approver_first_name || ''} ${data.approver_last_name || ''}`.trim(),
          level: startLevel,
          submitterName
        };
      }
    } catch (mailtoErr) {
      console.error('Error preparing mailto data:', mailtoErr);
    }

    res.json({
      success: true,
      message: 'ECR submitted for approval successfully',
      mailtoData
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting ECR for approval:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve ECR at current level
 * POST /ecr/:id/approve
 */
async function approveECR(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Get ECR
    const ecrResult = await client.query(
      `SELECT current_approval_level, approval_status,
              level1_approver, level2_approver, level3_approver
       FROM ecr_reports WHERE id = $1`,
      [id]
    );

    if (ecrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'ECR not found'
      });
    }

    const ecr = ecrResult.rows[0];

    // Verify ECR is pending approval
    if (ecr.approval_status !== 'pending_approval') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR is not pending approval'
      });
    }

    // Verify level matches current approval level
    if (ecr.current_approval_level !== level) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid approval level'
      });
    }

    // Verify user is the assigned approver for this level (or admin)
    const approverIdField = `level${level}_approver`;
    const isAdmin = req.user?.systemRole === 'admin' || req.user?.role === 'admin';
    if (ecr[approverIdField] !== userId && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned approver for this level'
      });
    }

    // Update approval for current level
    const approverName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    await client.query(
      `UPDATE ecr_reports
       SET level${level}_status = 'approved',
           level${level}_by = $2,
           level${level}_at = NOW(),
           level${level}_comments = $3,
           approval_history = COALESCE(approval_history, '[]'::jsonb) || $4::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [id, userId, comments || '', JSON.stringify({
        action: 'approved',
        level,
        userId,
        userName: approverName,
        comments: comments || '',
        timestamp: new Date().toISOString()
      })]
    );

    // Determine next level or mark as approved
    let newStatus = 'pending_approval';
    let newLevel = level + 1;

    // Check if there's a next level approver
    const nextApproverField = `level${newLevel}_approver`;
    if (!ecr[nextApproverField] || newLevel > 3) {
      // No more approvers, mark as fully approved
      newStatus = 'approved';
      newLevel = null;
    }

    // When fully approved in ECR-3, change general status to pending_closure (ready for ECR-4)
    const generalStatus = newStatus === 'approved' ? 'pending_closure' : null;

    await client.query(
      `UPDATE ecr_reports
       SET approval_status = $2,
           current_approval_level = $3,
           ${generalStatus ? 'status = $4,' : ''}
           updated_at = NOW()
       WHERE id = $1`,
      generalStatus ? [id, newStatus, newLevel, generalStatus] : [id, newStatus, newLevel]
    );

    await client.query('COMMIT');

    const fullyApproved = newStatus === 'approved';
    logECRAction({ ecrId: parseInt(id), actionType: 'approved', actionCategory: 'approval', userId: req.user?.id, userName: approverName, description: fullyApproved ? `ECR aprobado completamente (Nivel ${level})` : `ECR aprobado — Nivel ${level}, pendiente Nivel ${newLevel}`, newValue: { level, comments: comments || '', newStatus } });

    // Get ECR data for mailto (no SMTP)
    let ecrData = null;
    try {
      const nextApproverColumn = newLevel ? `, level${newLevel}_approver as next_approver` : '';
      const result = await pool.query(
        `SELECT ecr_number, change_title, review_board${nextApproverColumn} FROM ecr_reports WHERE id = $1`,
        [id]
      );
      ecrData = result.rows[0];
    } catch (queryErr) {
      console.error('Error fetching ECR data for mailto:', queryErr);
    }

    // Prepare mailto data for frontend
    let mailtoData = null;
    try {
      const mailtoResult = await pool.query(
        `SELECT e.ecr_number, e.change_title, e.created_by, e.review_board,
                e.level1_approver, e.level2_approver, e.level3_approver,
                u.email as creator_email, u.first_name as creator_first_name, u.last_name as creator_last_name
         FROM ecr_reports e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = $1`,
        [id]
      );

      if (mailtoResult.rows[0]) {
        const data = mailtoResult.rows[0];
        mailtoData = {
          ecrNumber: data.ecr_number,
          changeTitle: data.change_title,
          creatorEmail: data.creator_email,
          creatorName: `${data.creator_first_name || ''} ${data.creator_last_name || ''}`.trim(),
          isFullyApproved: newStatus === 'approved'
        };

        // If there's a next approver, get their info
        if (newLevel) {
          const nextApproverResult = await pool.query(
            `SELECT u.email, u.first_name, u.last_name
             FROM ecr_reports e
             JOIN users u ON e.level${newLevel}_approver = u.id
             WHERE e.id = $1`,
            [id]
          );
          if (nextApproverResult.rows[0]) {
            mailtoData.nextApproverEmail = nextApproverResult.rows[0].email;
            mailtoData.nextApproverName = `${nextApproverResult.rows[0].first_name || ''} ${nextApproverResult.rows[0].last_name || ''}`.trim();
          }
        }

        // If fully approved, include Review Board + all approvers
        if (newStatus === 'approved') {
          const allRecipientIds = [];

          // Add Review Board members
          if (data.review_board?.members) {
            allRecipientIds.push(...data.review_board.members);
          }

          // Add all approvers
          if (data.level1_approver) allRecipientIds.push(data.level1_approver);
          if (data.level2_approver) allRecipientIds.push(data.level2_approver);
          if (data.level3_approver) allRecipientIds.push(data.level3_approver);

          // Get unique IDs and fetch emails
          const uniqueIds = [...new Set(allRecipientIds)];
          if (uniqueIds.length > 0) {
            const recipientsResult = await pool.query(
              'SELECT email FROM users WHERE id = ANY($1)',
              [uniqueIds]
            );
            mailtoData.allRecipientsEmails = recipientsResult.rows.map(r => r.email).filter(Boolean);
          }
        }
      }
    } catch (mailtoErr) {
      console.error('Error preparing mailto data:', mailtoErr);
    }

    res.json({
      success: true,
      message: 'ECR approved successfully',
      newStatus,
      newLevel,
      mailtoData
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving ECR:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Reject ECR at current level
 * POST /ecr/:id/reject
 */
async function rejectECR(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const userId = req.user.id;

    // Validate comments are provided
    if (!comments || comments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting'
      });
    }

    await client.query('BEGIN');

    // Get ECR
    const ecrResult = await client.query(
      `SELECT current_approval_level, approval_status,
              level${level}_approver
       FROM ecr_reports WHERE id = $1`,
      [id]
    );

    if (ecrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'ECR not found'
      });
    }

    const ecr = ecrResult.rows[0];

    // Verify ECR is pending approval
    if (ecr.approval_status !== 'pending_approval') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR is not pending approval'
      });
    }

    // Verify level matches current approval level
    if (ecr.current_approval_level !== level) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid approval level'
      });
    }

    // Verify user is the assigned approver for this level (or admin)
    const approverIdField = `level${level}_approver`;
    const isAdmin = req.user?.systemRole === 'admin' || req.user?.role === 'admin';
    if (ecr[approverIdField] !== userId && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned approver for this level'
      });
    }

    // Update approval for current level as rejected
    // Save rejected_at_level so resubmit goes directly to this level
    // Also set status = 'rejected' so frontend can unlock sections for corrections
    // Clear validation_evidence signature so user can re-sign after making corrections
    const rejecterName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Sistema';
    await client.query(
      `UPDATE ecr_reports
       SET level${level}_status = 'rejected',
           level${level}_by = $2,
           level${level}_at = NOW(),
           level${level}_comments = $3,
           status = 'rejected',
           approval_status = 'rejected',
           current_approval_level = NULL,
           rejected_at_level = $4,
           approval_history = COALESCE(approval_history, '[]'::jsonb) || $5::jsonb,
           validation_evidence = (COALESCE(validation_evidence, '{}'::jsonb) - 'signedBy' - 'signedByName' - 'signedAt') || '{"isLocked": false}'::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [id, userId, comments, level, JSON.stringify({
        action: 'rejected',
        level,
        userId,
        userName: rejecterName,
        comments: comments || '',
        timestamp: new Date().toISOString()
      })]
    );

    await client.query('COMMIT');
    logECRAction({ ecrId: parseInt(id), actionType: 'rejected', actionCategory: 'approval', userId: req.user?.id, userName: rejecterName, description: `ECR rechazado — Nivel ${level}. Comentario: ${comments}`, newValue: { level, comments } });

    // Send email notification to Review Board
    try {
      const ecrData = await pool.query(
        'SELECT ecr_number, change_title, review_board FROM ecr_reports WHERE id = $1',
        [id]
      );
      if (ecrData.rows[0]?.review_board?.members) {
        const memberIds = ecrData.rows[0].review_board.members;
        const membersResult = await pool.query(
          'SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1)',
          [memberIds]
        );
        const members = membersResult.rows.map(m => ({
          firstName: m.first_name,
          lastName: m.last_name,
          email: m.email
        }));
        sendEcrNotificationToReviewBoard(members, {
          ecrNumber: ecrData.rows[0].ecr_number,
          title: ecrData.rows[0].change_title,
          action: 'rejected',
          approverName: rejecterName,
          level,
          comments
        }).catch(err => console.error('Error sending ECR rejection emails:', err));
      }
    } catch (emailErr) {
      console.error('Error preparing ECR rejection email:', emailErr);
    }

    // Prepare mailto data for frontend - include Review Board members
    let mailtoData = null;
    try {
      const mailtoResult = await pool.query(
        `SELECT e.ecr_number, e.change_title, e.created_by, e.review_board,
                u.email as creator_email, u.first_name as creator_first_name, u.last_name as creator_last_name
         FROM ecr_reports e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = $1`,
        [id]
      );

      if (mailtoResult.rows[0]) {
        const data = mailtoResult.rows[0];
        mailtoData = {
          ecrNumber: data.ecr_number,
          changeTitle: data.change_title,
          creatorEmail: data.creator_email,
          creatorName: `${data.creator_first_name || ''} ${data.creator_last_name || ''}`.trim(),
          rejectionComments: comments,
          reviewBoardEmails: []
        };

        // Get Review Board member emails
        if (data.review_board?.members && data.review_board.members.length > 0) {
          const membersResult = await pool.query(
            'SELECT email FROM users WHERE id = ANY($1)',
            [data.review_board.members]
          );
          mailtoData.reviewBoardEmails = membersResult.rows.map(m => m.email).filter(Boolean);
        }
      }
    } catch (mailtoErr) {
      console.error('Error preparing mailto data:', mailtoErr);
    }

    res.json({
      success: true,
      message: 'ECR rejected successfully',
      mailtoData
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting ECR:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve ECR Closure at a specific level
 * POST /ecr/:id/closure-approve
 */
async function approveClosureECR(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const userId = req.user.id;
    const approverName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();

    await client.query('BEGIN');

    // Get ECR current state
    const ecrResult = await client.query(
      `SELECT status, closure_approval_status, closure_signatures, closure_approval_history,
              level1_approver, level2_approver, level3_approver, closure_type
       FROM ecr_reports WHERE id = $1`,
      [id]
    );

    if (ecrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'ECR not found' });
    }

    const ecr = ecrResult.rows[0];
    // Build approvers object from individual columns
    const approvers = {
      level1: ecr.level1_approver,
      level2: ecr.level2_approver,
      level3: ecr.level3_approver
    };
    const closureSignatures = ecr.closure_signatures || {};
    const closureApprovalHistory = ecr.closure_approval_history || [];
    const closureType = ecr.closure_type || 'approved';

    // Verify ECR is in pending_approval or pending_rejected_closure status
    if (ecr.status !== 'pending_approval' && ecr.status !== 'pending_rejected_closure') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR no está en estado de aprobación de cierre'
      });
    }

    // Verify closure_approval_status is pending
    if (ecr.closure_approval_status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'El cierre no está pendiente de aprobación'
      });
    }

    // Verify user is the assigned approver for this level (or admin)
    const assignedApproverId = approvers[level];
    const isAdmin = req.user.systemRole === 'admin' || req.user.role === 'admin';

    if (assignedApproverId !== userId && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'No eres el aprobador asignado para este nivel'
      });
    }

    // Add signature for this level
    const now = new Date().toISOString();
    const newSignatures = {
      ...closureSignatures,
      [level]: {
        signedBy: userId,
        signedByName: approverName,
        signedAt: now,
        action: 'approved'
      }
    };

    // Add to history
    const historyEntry = {
      action: 'approved',
      level,
      userId,
      userName: approverName,
      timestamp: now,
      notes: comments || `Nivel ${level.replace('level', '')} aprobado` // Frontend expects 'notes' field
    };
    const newHistory = [...closureApprovalHistory, historyEntry];

    // Check if all levels are now signed
    const approverLevels = Object.keys(approvers).filter(k => k.startsWith('level') && approvers[k]);
    const allSigned = approverLevels.every(lvl => newSignatures[lvl]?.signedBy);

    // Determine new statuses based on closureType
    let newStatus = closureType === 'rejected' ? 'pending_rejected_closure' : 'pending_approval';
    let newClosureApprovalStatus = 'pending';

    if (allSigned) {
      // Final status depends on closureType
      newStatus = closureType === 'rejected' ? 'closed_rejected' : 'closed';
      newClosureApprovalStatus = 'approved';
    }

    // Update database
    await client.query(
      `UPDATE ecr_reports
       SET closure_signatures = $2,
           closure_approval_history = $3,
           closure_approval_status = $4,
           status = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(newSignatures), JSON.stringify(newHistory), newClosureApprovalStatus, newStatus]
    );

    await client.query('COMMIT');

    // Log action
    const closureTypeLabel = closureType === 'rejected' ? 'como RECHAZADO' : '';
    logECRAction({
      ecrId: parseInt(id),
      actionType: closureType === 'rejected' ? 'closure_rejected_approved' : 'closure_approved',
      actionCategory: 'closure',
      userId,
      userName: approverName,
      description: allSigned
        ? `ECR cerrado ${closureTypeLabel} completamente (Nivel ${level.replace('level', '')})`
        : `Cierre ${closureTypeLabel} aprobado — Nivel ${level.replace('level', '')}`,
      newValue: { level, comments, allSigned, closureType }
    });

    res.json({
      success: true,
      message: allSigned
        ? (closureType === 'rejected' ? 'ECR cerrado como RECHAZADO' : 'ECR cerrado completamente')
        : 'Nivel aprobado exitosamente',
      closureSignatures: newSignatures,
      closureApprovalHistory: newHistory,
      closureApprovalStatus: newClosureApprovalStatus,
      closureType,
      status: newStatus,
      allSigned
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving ECR closure:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

/**
 * Reject ECR Closure
 * POST /ecr/:id/closure-reject
 */
async function rejectClosureECR(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const userId = req.user.id;
    const rejecterName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();

    if (!comments || !comments.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Los comentarios son obligatorios al rechazar'
      });
    }

    await client.query('BEGIN');

    // Get ECR current state
    const ecrResult = await client.query(
      `SELECT status, closure_approval_status, closure_signatures, closure_approval_history,
              level1_approver, level2_approver, level3_approver, closure_type
       FROM ecr_reports WHERE id = $1`,
      [id]
    );

    if (ecrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'ECR not found' });
    }

    const ecr = ecrResult.rows[0];
    // Build approvers object from individual columns
    const approvers = {
      level1: ecr.level1_approver,
      level2: ecr.level2_approver,
      level3: ecr.level3_approver
    };
    const closureSignatures = ecr.closure_signatures || {};
    const closureApprovalHistory = ecr.closure_approval_history || [];
    const previousClosureType = ecr.closure_type;

    // Verify ECR is in pending_approval or pending_rejected_closure status
    if (ecr.status !== 'pending_approval' && ecr.status !== 'pending_rejected_closure') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR no está en estado de aprobación de cierre'
      });
    }

    // Verify user is the assigned approver for this level (or admin)
    const assignedApproverId = approvers[level];
    const isAdmin = req.user.systemRole === 'admin' || req.user.role === 'admin';

    if (assignedApproverId !== userId && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'No eres el aprobador asignado para este nivel'
      });
    }

    // Preserve signatures from levels BEFORE the rejecting level
    const approverLevels = Object.keys(approvers)
      .filter(k => k.startsWith('level') && approvers[k])
      .sort();
    const levelIndex = approverLevels.indexOf(level);

    const preservedSignatures = {};
    for (let i = 0; i < levelIndex; i++) {
      const prevKey = approverLevels[i];
      if (closureSignatures[prevKey]) {
        preservedSignatures[prevKey] = closureSignatures[prevKey];
      }
    }

    // Add rejection to history
    const now = new Date().toISOString();
    const historyEntry = {
      action: 'rejected',
      level,
      userId,
      userName: rejecterName,
      timestamp: now,
      notes: comments // Frontend expects 'notes' field
    };
    const newHistory = [...closureApprovalHistory, historyEntry];

    // Update database - reset to draft for corrections, clear closureType
    await client.query(
      `UPDATE ecr_reports
       SET closure_signatures = $2,
           closure_approval_history = $3,
           closure_approval_status = 'draft',
           closure_type = NULL,
           rejection_reason = NULL,
           status = 'pending_closure',
           updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(preservedSignatures), JSON.stringify(newHistory)]
    );

    await client.query('COMMIT');

    // Log action
    const wasRejectedClosure = previousClosureType === 'rejected';
    logECRAction({
      ecrId: parseInt(id),
      actionType: 'closure_rejected',
      actionCategory: 'closure',
      userId,
      userName: rejecterName,
      description: wasRejectedClosure
        ? `Cierre como rechazado devuelto a revisión — Nivel ${level.replace('level', '')}. Motivo: ${comments}`
        : `Cierre rechazado — Nivel ${level.replace('level', '')}. Motivo: ${comments}`,
      newValue: { level, comments, previousClosureType }
    });

    res.json({
      success: true,
      message: `Cierre rechazado por Nivel ${level.replace('level', '')}`,
      closureSignatures: preservedSignatures,
      closureApprovalHistory: newHistory,
      closureApprovalStatus: 'draft',
      closureType: null,
      status: 'pending_closure'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting ECR closure:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

/**
 * Submit ECR Closure for approval
 * POST /ecr/:id/closure-submit
 * Body: { closureType: 'approved' | 'rejected', rejectionReason?: string }
 */
async function submitClosureForApproval(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { closureType = 'approved', rejectionReason = '' } = req.body;
    const userId = req.user.id;
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();

    // Validate closureType
    if (!['approved', 'rejected'].includes(closureType)) {
      return res.status(400).json({
        success: false,
        message: 'closureType debe ser "approved" o "rejected"'
      });
    }

    // If closing as rejected, require rejection reason
    if (closureType === 'rejected' && !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El motivo de rechazo es obligatorio para cerrar como rechazado'
      });
    }

    await client.query('BEGIN');

    // Get ECR current state (including closure_type for comparison)
    const ecrResult = await client.query(
      `SELECT status, closure_approval_status, closure_approval_history, closure_type, closure_signatures
       FROM ecr_reports WHERE id = $1`,
      [id]
    );

    if (ecrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'ECR not found' });
    }

    const ecr = ecrResult.rows[0];
    const closureApprovalHistory = ecr.closure_approval_history || [];
    const previousClosureType = ecr.closure_type;

    // Rule 3: If closure type CHANGES, clear signatures (start from level 1)
    const closureTypeChanged = (previousClosureType === 'rejected' && closureType !== 'rejected') ||
                               (previousClosureType !== 'rejected' && closureType === 'rejected');
    const newSignatures = closureTypeChanged ? {} : (ecr.closure_signatures || {});

    // Verify ECR is in a valid status for closure submission
    // Include pending_approval for re-submission cases where closure_approval_status may be inconsistent
    const validStatuses = ['pending_closure', 'draft', 'rejected', 'pending_approval', 'pending_rejected_closure'];
    if (!validStatuses.includes(ecr.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR debe estar en estado pendiente de cierre, borrador o devuelto para enviar a aprobación'
      });
    }

    // Determine new status based on closureType
    const newStatus = closureType === 'rejected' ? 'pending_rejected_closure' : 'pending_approval';
    const actionDescription = closureType === 'rejected'
      ? `Cierre como RECHAZADO enviado a aprobación. Motivo: ${rejectionReason}`
      : 'Cierre enviado a aprobación';

    // Add submission to history
    const now = new Date().toISOString();
    const historyEntry = {
      action: closureType === 'rejected' ? 'submitted_rejected' : 'submitted',
      userId,
      userName,
      timestamp: now,
      notes: closureType === 'rejected'
        ? `Enviado para CIERRE COMO NO ADOPTABLE. Motivo: ${rejectionReason}`
        : 'Enviado para cierre',
      closureType,
      rejectionReason: closureType === 'rejected' ? rejectionReason : undefined
    };
    const newHistory = [...closureApprovalHistory, historyEntry];

    // Update database (clear signatures if closure type changed per Rule 3)
    await client.query(
      `UPDATE ecr_reports
       SET closure_approval_history = $2,
           closure_approval_status = 'pending',
           closure_type = $3,
           rejection_reason = $4,
           status = $5,
           closure_signatures = $6,
           updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(newHistory), closureType, closureType === 'rejected' ? rejectionReason : null, newStatus, JSON.stringify(newSignatures)]
    );

    await client.query('COMMIT');

    // Log action
    logECRAction({
      ecrId: parseInt(id),
      actionType: closureType === 'rejected' ? 'closure_rejected_submitted' : 'closure_submitted',
      actionCategory: 'closure',
      userId,
      userName,
      description: actionDescription,
      newValue: { closureType, rejectionReason }
    });

    res.json({
      success: true,
      message: closureType === 'rejected' ? 'Cierre como rechazado enviado a aprobación' : 'Cierre enviado a aprobación',
      closureApprovalHistory: newHistory,
      closureApprovalStatus: 'pending',
      closureType,
      closureSignatures: newSignatures,
      status: newStatus
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting closure for approval:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

module.exports = {
  getECRApprovalStatus,
  submitECRForApproval,
  approveECR,
  rejectECR,
  approveClosureECR,
  rejectClosureECR,
  submitClosureForApproval
};
