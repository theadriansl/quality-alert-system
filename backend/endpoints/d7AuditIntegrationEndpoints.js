/**
 * D7 AUDIT INTEGRATION ENDPOINTS
 * Integrates D7 validation with formal audit system
 *
 * Features:
 * - Base checklist (7 fixed items, non-editable)
 * - Multiple auditors assignment
 * - Date range and frequency configuration
 * - Audit sessions tracking
 * - Leader evaluation (EFFECTIVE, PARTIALLY_EFFECTIVE, NOT_EFFECTIVE)
 * - Workload integration for cost tracking
 */

const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================
// GET D7 AUDIT CONFIGURATION
// ============================================
/**
 * GET /api/8d/reports/:reportId/d7-audit
 * Get D7 audit configuration, sessions, and evaluation
 */
router.get('/reports/:reportId/d7-audit', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;

    // Get audit config
    const configResult = await client.query(
      `SELECT dac.*,
              as2.title as audit_title,
              as2.status as audit_schedule_status
       FROM d7_audit_config dac
       LEFT JOIN audit_schedules as2 ON dac.audit_schedule_id = as2.id
       WHERE dac.eight_d_id = $1
       ORDER BY dac.created_at DESC
       LIMIT 1`,
      [reportId]
    );

    if (configResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          config: null,
          auditors: [],
          sessions: [],
          evaluation: null,
          baseChecklist: await getBaseChecklist(client)
        }
      });
    }

    const config = configResult.rows[0];

    // Get assigned auditors
    const auditorsResult = await client.query(
      `SELECT daa.*, u.first_name, u.last_name, u.email
       FROM d7_audit_auditors daa
       JOIN users u ON daa.auditor_id = u.id
       WHERE daa.d7_audit_config_id = $1`,
      [config.id]
    );

    // Get sessions
    const sessionsResult = await client.query(
      `SELECT das.*, u.first_name, u.last_name
       FROM d7_audit_sessions das
       LEFT JOIN users u ON das.auditor_id = u.id
       WHERE das.d7_audit_config_id = $1
       ORDER BY das.scheduled_date, das.shift`,
      [config.id]
    );

    // Get latest evaluation
    const evaluationResult = await client.query(
      `SELECT de.*, u.first_name, u.last_name
       FROM d7_evaluation de
       LEFT JOIN users u ON de.evaluated_by = u.id
       WHERE de.eight_d_id = $1
       ORDER BY de.evaluated_at DESC
       LIMIT 1`,
      [reportId]
    );

    // Get adjustment actions if evaluation is partially effective
    let adjustmentActions = [];
    if (evaluationResult.rows.length > 0 && evaluationResult.rows[0].result === 'PARTIALLY_EFFECTIVE') {
      const actionsResult = await client.query(
        `SELECT daa.*, u.first_name, u.last_name
         FROM d7_adjustment_actions daa
         LEFT JOIN users u ON daa.responsible_id = u.id
         WHERE daa.d7_evaluation_id = $1
         ORDER BY daa.created_at`,
        [evaluationResult.rows[0].id]
      );
      adjustmentActions = actionsResult.rows;
    }

    res.json({
      success: true,
      data: {
        config: transformToCamelCase(config),
        auditors: transformToCamelCase(auditorsResult.rows),
        sessions: transformToCamelCase(sessionsResult.rows),
        evaluation: evaluationResult.rows.length > 0 ? transformToCamelCase(evaluationResult.rows[0]) : null,
        adjustmentActions: transformToCamelCase(adjustmentActions),
        baseChecklist: await getBaseChecklist(client)
      }
    });

  } catch (error) {
    console.error('❌ Error getting D7 audit config:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving D7 audit configuration',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Helper function to get base checklist items
async function getBaseChecklist(client) {
  const result = await client.query(
    `SELECT aci.*
     FROM audit_checklist_items aci
     JOIN audit_checklists ac ON aci.checklist_id = ac.id
     WHERE ac.checklist_type = 'd7_base'
     ORDER BY aci.item_order`
  );
  return transformToCamelCase(result.rows);
}


// ============================================
// CREATE/UPDATE D7 AUDIT CONFIGURATION
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-audit/config
 * Create or update D7 audit configuration
 */
router.post('/reports/:reportId/d7-audit/config', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const {
      startDate,
      endDate,
      frequency,
      shifts,
      auditorIds,
      totalSessionsRequired
    } = req.body;
    const userId = req.user?.id;

    await client.query('BEGIN');

    // Validate required fields
    if (!startDate || !endDate || !auditorIds || auditorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, and at least one auditor are required'
      });
    }

    // Check if config already exists
    const existingConfig = await client.query(
      `SELECT id FROM d7_audit_config WHERE eight_d_id = $1`,
      [reportId]
    );

    let configId;

    if (existingConfig.rows.length > 0) {
      // Update existing config
      configId = existingConfig.rows[0].id;
      await client.query(
        `UPDATE d7_audit_config SET
          start_date = $2,
          end_date = $3,
          frequency = $4,
          shifts = $5,
          total_sessions_required = $6,
          updated_at = NOW()
         WHERE id = $1`,
        [configId, startDate, endDate, frequency || 'once', shifts || [], totalSessionsRequired || 1]
      );

      // Delete existing auditors and re-insert
      await client.query(
        `DELETE FROM d7_audit_auditors WHERE d7_audit_config_id = $1`,
        [configId]
      );
    } else {
      // Insert new config
      const insertResult = await client.query(
        `INSERT INTO d7_audit_config (
          eight_d_id, start_date, end_date, frequency, shifts,
          total_sessions_required, configured_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [reportId, startDate, endDate, frequency || 'once', shifts || [], totalSessionsRequired || 1, userId]
      );
      configId = insertResult.rows[0].id;
    }

    // Insert auditors
    for (const auditorId of auditorIds) {
      await client.query(
        `INSERT INTO d7_audit_auditors (d7_audit_config_id, auditor_id)
         VALUES ($1, $2)
         ON CONFLICT (d7_audit_config_id, auditor_id) DO NOTHING`,
        [configId, auditorId]
      );
    }

    // Generate audit sessions based on frequency
    await generateAuditSessions(client, configId, startDate, endDate, frequency, shifts, auditorIds);

    await client.query('COMMIT');

    console.log(`✅ D7 audit config created/updated for report ${reportId}`);

    res.json({
      success: true,
      message: 'D7 audit configuration saved successfully',
      data: { configId }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving D7 audit config:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving D7 audit configuration',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Helper function to generate audit sessions
async function generateAuditSessions(client, configId, startDate, endDate, frequency, shifts, auditorIds) {
  // Delete existing sessions that are not completed
  await client.query(
    `DELETE FROM d7_audit_sessions
     WHERE d7_audit_config_id = $1 AND status != 'completed'`,
    [configId]
  );

  const start = new Date(startDate);
  const end = new Date(endDate);
  const sessionDates = [];

  if (frequency === 'once') {
    sessionDates.push(start);
  } else if (frequency === 'daily') {
    let current = new Date(start);
    while (current <= end) {
      sessionDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    let current = new Date(start);
    while (current <= end) {
      sessionDates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  }

  // Create sessions for each date and shift combination
  const shiftsToUse = shifts && shifts.length > 0 ? shifts : ['T1'];
  let auditorIndex = 0;

  for (const date of sessionDates) {
    for (const shift of shiftsToUse) {
      const auditorId = auditorIds[auditorIndex % auditorIds.length];
      auditorIndex++;

      await client.query(
        `INSERT INTO d7_audit_sessions (
          d7_audit_config_id, scheduled_date, shift, auditor_id, status
        ) VALUES ($1, $2, $3, $4, 'scheduled')
        ON CONFLICT DO NOTHING`,
        [configId, date.toISOString().split('T')[0], shift, auditorId]
      );
    }
  }

  // Update total sessions required
  const totalSessions = sessionDates.length * shiftsToUse.length;
  await client.query(
    `UPDATE d7_audit_config SET total_sessions_required = $2 WHERE id = $1`,
    [configId, totalSessions]
  );
}


// ============================================
// EXECUTE AUDIT SESSION
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-audit/sessions/:sessionId/execute
 * Execute an audit session with responses
 */
router.post('/reports/:reportId/d7-audit/sessions/:sessionId/execute', async (req, res) => {
  const client = await pool.connect();

  try {
    const { sessionId } = req.params;
    const {
      baseChecklistResponses,
      technicalChecklistResponses,
      findings,
      observations
    } = req.body;

    await client.query('BEGIN');

    // Update session with responses
    await client.query(
      `UPDATE d7_audit_sessions SET
        base_checklist_responses = $2,
        technical_checklist_responses = $3,
        findings = $4,
        observations = $5,
        executed_at = NOW(),
        status = 'completed',
        updated_at = NOW()
       WHERE id = $1`,
      [
        sessionId,
        JSON.stringify(baseChecklistResponses),
        JSON.stringify(technicalChecklistResponses),
        findings,
        observations
      ]
    );

    // The trigger will automatically update sessions_completed in d7_audit_config

    await client.query('COMMIT');

    console.log(`✅ D7 audit session ${sessionId} executed`);

    res.json({
      success: true,
      message: 'Audit session completed successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error executing audit session:', error);
    res.status(500).json({
      success: false,
      message: 'Error executing audit session',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// SUBMIT D7 EVALUATION (LEADER JUDGMENT)
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-audit/evaluate
 * Submit D7 effectiveness evaluation (only leader can do this)
 */
router.post('/reports/:reportId/d7-audit/evaluate', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const {
      result, // 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'NOT_EFFECTIVE'
      justification,
      findingsSummary,
      nextVerificationDate, // if PARTIALLY_EFFECTIVE
      returnToD5Reason, // if NOT_EFFECTIVE
      adjustmentActions // array of actions if PARTIALLY_EFFECTIVE
    } = req.body;
    const userId = req.user?.id;

    // Validate result
    if (!['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'NOT_EFFECTIVE'].includes(result)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result. Must be EFFECTIVE, PARTIALLY_EFFECTIVE, or NOT_EFFECTIVE'
      });
    }

    if (!justification) {
      return res.status(400).json({
        success: false,
        message: 'Justification is required'
      });
    }

    await client.query('BEGIN');

    // Get audit config ID
    const configResult = await client.query(
      `SELECT id FROM d7_audit_config WHERE eight_d_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [reportId]
    );

    if (configResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No D7 audit configuration found for this report'
      });
    }

    const configId = configResult.rows[0].id;

    // Verify all sessions are completed
    const sessionsCheck = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total
       FROM d7_audit_sessions
       WHERE d7_audit_config_id = $1`,
      [configId]
    );

    const { completed, total } = sessionsCheck.rows[0];
    if (parseInt(completed) < parseInt(total)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot evaluate: ${total - completed} audit sessions are still pending`
      });
    }

    // Insert evaluation
    const evalResult = await client.query(
      `INSERT INTO d7_evaluation (
        eight_d_id, d7_audit_config_id, result, justification, findings_summary,
        requires_adjustment, next_verification_date, return_to_d5_reason, evaluated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        reportId,
        configId,
        result,
        justification,
        findingsSummary,
        result === 'PARTIALLY_EFFECTIVE',
        nextVerificationDate || null,
        returnToD5Reason || null,
        userId
      ]
    );

    const evaluationId = evalResult.rows[0].id;

    // Insert adjustment actions if PARTIALLY_EFFECTIVE
    if (result === 'PARTIALLY_EFFECTIVE' && adjustmentActions && adjustmentActions.length > 0) {
      for (const action of adjustmentActions) {
        await client.query(
          `INSERT INTO d7_adjustment_actions (
            d7_evaluation_id, eight_d_id, description, responsible_id, target_date
          ) VALUES ($1, $2, $3, $4, $5)`,
          [evaluationId, reportId, action.description, action.responsibleId, action.targetDate]
        );
      }
    }

    // The trigger will automatically update the 8D status based on result

    await client.query('COMMIT');

    console.log(`✅ D7 evaluation submitted for report ${reportId}: ${result}`);

    let message;
    if (result === 'EFFECTIVE') {
      message = '✅ Contramedida evaluada como EFECTIVA. El reporte puede avanzar a D8.';
    } else if (result === 'PARTIALLY_EFFECTIVE') {
      message = '⚠️ Contramedida PARCIALMENTE EFECTIVA. Se requieren acciones de ajuste.';
    } else {
      message = '❌ Contramedida NO EFECTIVA. El reporte regresa a D5 para nuevo análisis.';
    }

    res.json({
      success: true,
      message,
      data: { evaluationId, result }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error submitting D7 evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting D7 evaluation',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// GET BASE CHECKLIST ITEMS
// ============================================
/**
 * GET /api/8d/d7-audit/base-checklist
 * Get the fixed D7 base checklist items
 */
router.get('/d7-audit/base-checklist', async (req, res) => {
  try {
    const result = await query(
      `SELECT aci.*, ac.name as checklist_name
       FROM audit_checklist_items aci
       JOIN audit_checklists ac ON aci.checklist_id = ac.id
       WHERE ac.checklist_type = 'd7_base'
       ORDER BY aci.item_order`
    );

    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });

  } catch (error) {
    console.error('❌ Error getting base checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving base checklist',
      error: error.message
    });
  }
});


// ============================================
// UPDATE ADJUSTMENT ACTION STATUS
// ============================================
/**
 * PUT /api/8d/d7-audit/adjustment-actions/:actionId
 * Update adjustment action status (complete, add evidence)
 */
router.put('/d7-audit/adjustment-actions/:actionId', async (req, res) => {
  try {
    const { actionId } = req.params;
    const { status, completionEvidence } = req.body;

    await query(
      `UPDATE d7_adjustment_actions SET
        status = $2,
        completion_evidence = $3,
        completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE NULL END
       WHERE id = $1`,
      [actionId, status, completionEvidence]
    );

    res.json({
      success: true,
      message: 'Adjustment action updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating adjustment action:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating adjustment action',
      error: error.message
    });
  }
});


// ============================================
// GET D7 AUDIT DASHBOARD DATA
// ============================================
/**
 * GET /api/8d/d7-audit/dashboard
 * Get dashboard data for D7 audits (for cost of quality tracking)
 */
router.get('/d7-audit/dashboard', async (req, res) => {
  try {
    // Get summary stats
    const statsResult = await query(`
      SELECT
        COUNT(DISTINCT dac.eight_d_id) as total_8d_with_audits,
        COUNT(das.id) as total_sessions,
        COUNT(das.id) FILTER (WHERE das.status = 'completed') as completed_sessions,
        COUNT(das.id) FILTER (WHERE das.status = 'scheduled') as pending_sessions,
        COUNT(de.id) FILTER (WHERE de.result = 'EFFECTIVE') as effective_evaluations,
        COUNT(de.id) FILTER (WHERE de.result = 'PARTIALLY_EFFECTIVE') as partial_evaluations,
        COUNT(de.id) FILTER (WHERE de.result = 'NOT_EFFECTIVE') as not_effective_evaluations
      FROM d7_audit_config dac
      LEFT JOIN d7_audit_sessions das ON das.d7_audit_config_id = dac.id
      LEFT JOIN d7_evaluation de ON de.d7_audit_config_id = dac.id
    `);

    // Get recent audits
    const recentResult = await query(`
      SELECT
        dac.*,
        edr.report_number,
        edr.title as eight_d_title,
        de.result as evaluation_result,
        de.evaluated_at
      FROM d7_audit_config dac
      JOIN eight_d_reports edr ON dac.eight_d_id = edr.id
      LEFT JOIN d7_evaluation de ON de.d7_audit_config_id = dac.id
      ORDER BY dac.created_at DESC
      LIMIT 10
    `);

    // Get workload hours (if sync exists)
    const workloadResult = await query(`
      SELECT
        SUM(wa.actual_hours) as total_hours,
        COUNT(wa.id) as total_activities
      FROM workload_activities wa
      JOIN audit_schedules asch ON wa.audit_schedule_id = asch.id
      WHERE asch.audit_type = 'D7_VERIFICATION'
    `);

    res.json({
      success: true,
      data: {
        stats: transformToCamelCase(statsResult.rows[0]),
        recentAudits: transformToCamelCase(recentResult.rows),
        workloadCost: transformToCamelCase(workloadResult.rows[0] || { totalHours: 0, totalActivities: 0 })
      }
    });

  } catch (error) {
    console.error('❌ Error getting D7 audit dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard data',
      error: error.message
    });
  }
});


module.exports = router;
