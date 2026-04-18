const { pool } = require('../config/database');

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
        e.level3_comments
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

    res.json({
      success: true,
      currentStatus: ecr.current_status,
      currentLevel: ecr.current_approval_level,
      createdBy: ecr.created_by,
      pendingApprover,
      approvalHistory
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
      'SELECT created_by, approval_status, level1_approver FROM ecr_reports WHERE id = $1',
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

    // Verify ECR is in draft status
    if (ecr.approval_status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ECR is not in draft status'
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

    // Update status to pending_approval and set current level to 1
    await client.query(
      `UPDATE ecr_reports
       SET approval_status = 'pending_approval',
           current_approval_level = 1,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'ECR submitted for approval successfully'
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

    // Verify user is the assigned approver for this level
    const approverIdField = `level${level}_approver`;
    if (ecr[approverIdField] !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned approver for this level'
      });
    }

    // Update approval for current level
    await client.query(
      `UPDATE ecr_reports
       SET level${level}_status = 'approved',
           level${level}_by = $2,
           level${level}_at = NOW(),
           level${level}_comments = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [id, userId, comments || '']
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

    await client.query(
      `UPDATE ecr_reports
       SET approval_status = $2,
           current_approval_level = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [id, newStatus, newLevel]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'ECR approved successfully',
      newStatus,
      newLevel
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

    // Verify user is the assigned approver for this level
    const approverIdField = `level${level}_approver`;
    if (ecr[approverIdField] !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned approver for this level'
      });
    }

    // Update approval for current level as rejected
    await client.query(
      `UPDATE ecr_reports
       SET level${level}_status = 'rejected',
           level${level}_by = $2,
           level${level}_at = NOW(),
           level${level}_comments = $3,
           approval_status = 'rejected',
           current_approval_level = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [id, userId, comments]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'ECR rejected successfully'
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

module.exports = {
  getECRApprovalStatus,
  submitECRForApproval,
  approveECR,
  rejectECR
};
