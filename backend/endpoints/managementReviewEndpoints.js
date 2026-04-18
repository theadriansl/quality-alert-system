/**
 * Management Review Endpoints
 * Integration with Workload Manager
 * Covers ISO 9001:9.3 and IATF 16949:9.3
 */

const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

const setupManagementReviewEndpoints = (app) => {

  // ============================================================================
  // CHECKLIST TEMPLATE
  // ============================================================================

  // GET checklist items (ISO/IATF 9.3 template)
  app.get('/management-review/checklist-template', async (req, res) => {
    try {
      const result = await query(`
        SELECT * FROM management_review_checklist_items
        WHERE is_active = true
        ORDER BY item_order
      `);

      // Group by category
      const items = transformToCamelCase(result.rows);
      const grouped = {
        inputs: items.filter(i => i.category === 'input'),
        outputs: items.filter(i => i.category === 'output')
      };

      res.json({ success: true, checklist: grouped, items });
    } catch (error) {
      console.error('Error fetching checklist template:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // KPI AGGREGATION
  // ============================================================================

  // GET aggregated KPIs from all modules
  app.get('/management-review/kpis', async (req, res) => {
    try {
      const { periodStart, periodEnd } = req.query;

      // Get KPI source configuration
      const sourcesResult = await query(`
        SELECT * FROM management_review_kpi_sources
        WHERE is_active = true
        ORDER BY display_order
      `);
      const sources = transformToCamelCase(sourcesResult.rows);

      // Aggregate KPIs from each module
      const kpis = {};

      // 8D Module KPIs
      const eightDResult = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled')) as open_count,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
          ROUND(AVG(EXTRACT(DAY FROM (closed_at - created_at))) FILTER (WHERE status = 'closed'), 1) as avg_days_to_close,
          COUNT(*) FILTER (WHERE status = 'closed' AND closed_at <= target_date) as on_time_count,
          COALESCE(SUM((cost_data->>'totalSavings')::numeric) FILTER (WHERE status = 'closed'), 0) as total_savings
        FROM eight_d_reports
        WHERE created_at BETWEEN COALESCE($1::date, created_at) AND COALESCE($2::date, created_at)
      `, [periodStart || null, periodEnd || null]);

      const eightD = eightDResult.rows[0];
      kpis['8D'] = {
        openCount: parseInt(eightD.open_count) || 0,
        closedCount: parseInt(eightD.closed_count) || 0,
        avgDaysToClose: parseFloat(eightD.avg_days_to_close) || 0,
        onTimeRate: eightD.closed_count > 0
          ? Math.round((eightD.on_time_count / eightD.closed_count) * 100)
          : 0,
        totalSavings: parseFloat(eightD.total_savings) || 0
      };

      // QAR Module KPIs
      const qarResult = await query(`
        SELECT
          COUNT(*) as total_qars,
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE severity = 'major') as major_count,
          COALESCE(SUM(defect_quantity), 0) as total_defects
        FROM qar_reports
        WHERE created_at BETWEEN COALESCE($1::date, created_at) AND COALESCE($2::date, created_at)
      `, [periodStart || null, periodEnd || null]);

      const qar = qarResult.rows[0];
      kpis['QAR'] = {
        totalQars: parseInt(qar.total_qars) || 0,
        openCount: parseInt(qar.open_count) || 0,
        criticalCount: parseInt(qar.critical_count) || 0,
        majorCount: parseInt(qar.major_count) || 0,
        totalDefects: parseInt(qar.total_defects) || 0
      };

      // MRB Module KPIs
      const mrbResult = await query(`
        SELECT
          COUNT(*) as total_campaigns,
          COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
          COALESCE(SUM(scrap_quantity * scrap_unit_cost), 0) as total_scrap_cost,
          COALESCE(SUM(inspection_hours), 0) as total_inspection_hours
        FROM mrb_campaigns
        WHERE created_at BETWEEN COALESCE($1::date, created_at) AND COALESCE($2::date, created_at)
      `, [periodStart || null, periodEnd || null]);

      const mrb = mrbResult.rows[0];
      kpis['MRB'] = {
        totalCampaigns: parseInt(mrb.total_campaigns) || 0,
        activeCampaigns: parseInt(mrb.active_campaigns) || 0,
        totalScrapCost: parseFloat(mrb.total_scrap_cost) || 0,
        totalInspectionHours: parseFloat(mrb.total_inspection_hours) || 0
      };

      // ECR Module KPIs
      const ecrResult = await query(`
        SELECT
          COUNT(*) as total_changes,
          COUNT(*) FILTER (WHERE status = 'approved' OR status = 'closed') as approved_count,
          COUNT(*) FILTER (WHERE risk_level = 'high' OR risk_level = 'critical') as high_risk_count,
          ROUND(AVG(EXTRACT(DAY FROM (updated_at - created_at))) FILTER (WHERE status IN ('approved', 'closed')), 1) as avg_cycle_days
        FROM ecr_reports
        WHERE created_at BETWEEN COALESCE($1::date, created_at) AND COALESCE($2::date, created_at)
      `, [periodStart || null, periodEnd || null]);

      const ecr = ecrResult.rows[0];
      kpis['ECR'] = {
        totalChanges: parseInt(ecr.total_changes) || 0,
        approvedCount: parseInt(ecr.approved_count) || 0,
        highRiskCount: parseInt(ecr.high_risk_count) || 0,
        avgCycleDays: parseFloat(ecr.avg_cycle_days) || 0
      };

      // Audit Module KPIs
      const auditResult = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as completed_audits,
          COUNT(*) FILTER (WHERE status = 'scheduled' OR status = 'in_progress') as pending_audits
        FROM audit_schedules
        WHERE scheduled_date BETWEEN COALESCE($1::date, scheduled_date) AND COALESCE($2::date, scheduled_date)
      `, [periodStart || null, periodEnd || null]);

      const ncResult = await query(`
        SELECT
          COUNT(*) as total_ncs,
          COUNT(*) FILTER (WHERE status = 'open') as open_ncs,
          COUNT(*) FILTER (WHERE nc_type = 'major') as major_ncs,
          COUNT(*) FILTER (WHERE nc_type = 'minor') as minor_ncs
        FROM audit_non_conformities
        WHERE created_at BETWEEN COALESCE($1::date, created_at) AND COALESCE($2::date, created_at)
      `, [periodStart || null, periodEnd || null]);

      const audit = auditResult.rows[0];
      const nc = ncResult.rows[0];
      kpis['AUDIT'] = {
        completedAudits: parseInt(audit.completed_audits) || 0,
        pendingAudits: parseInt(audit.pending_audits) || 0,
        totalNCs: parseInt(nc.total_ncs) || 0,
        openNCs: parseInt(nc.open_ncs) || 0,
        majorNCs: parseInt(nc.major_ncs) || 0,
        minorNCs: parseInt(nc.minor_ncs) || 0,
        ncClosureRate: nc.total_ncs > 0
          ? Math.round(((nc.total_ncs - nc.open_ncs) / nc.total_ncs) * 100)
          : 100
      };

      // Workload KPIs
      const workloadResult = await query(`
        SELECT
          COUNT(*) as total_activities,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          ROUND(AVG(progress), 1) as avg_progress
        FROM workload_activities
        WHERE start_date BETWEEN COALESCE($1::date, start_date) AND COALESCE($2::date, start_date)
      `, [periodStart || null, periodEnd || null]);

      const workload = workloadResult.rows[0];
      kpis['WORKLOAD'] = {
        totalActivities: parseInt(workload.total_activities) || 0,
        completedCount: parseInt(workload.completed_count) || 0,
        completionRate: workload.total_activities > 0
          ? Math.round((workload.completed_count / workload.total_activities) * 100)
          : 0,
        avgProgress: parseFloat(workload.avg_progress) || 0
      };

      res.json({
        success: true,
        kpis,
        sources,
        period: { start: periodStart, end: periodEnd }
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // ACTAS (Meeting Records)
  // ============================================================================

  // GET all actas
  app.get('/management-review/actas', async (req, res) => {
    try {
      const { year, status } = req.query;

      let queryText = `
        SELECT
          mra.*,
          u.first_name || ' ' || u.last_name as created_by_name,
          wa.title as activity_title
        FROM management_review_actas mra
        LEFT JOIN users u ON mra.created_by = u.id
        LEFT JOIN workload_activities wa ON mra.workload_activity_id = wa.id
      `;

      const conditions = [];
      const params = [];

      if (year) {
        params.push(parseInt(year));
        conditions.push(`EXTRACT(YEAR FROM mra.review_date) = $${params.length}`);
      }

      if (status) {
        params.push(status);
        conditions.push(`mra.status = $${params.length}`);
      }

      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      queryText += ' ORDER BY mra.review_date DESC';

      const result = await query(queryText, params);

      res.json({
        success: true,
        actas: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching actas:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET single acta with full details
  app.get('/management-review/actas/:id', async (req, res) => {
    try {
      const actaId = parseInt(req.params.id);

      // Get acta
      const actaResult = await query(`
        SELECT
          mra.*,
          u.first_name || ' ' || u.last_name as created_by_name
        FROM management_review_actas mra
        LEFT JOIN users u ON mra.created_by = u.id
        WHERE mra.id = $1
      `, [actaId]);

      if (actaResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Acta not found' });
      }

      // Get actions
      const actionsResult = await query(`
        SELECT
          mra.*,
          u.first_name || ' ' || u.last_name as responsible_name,
          mci.title as checklist_item_title,
          mci.clause
        FROM management_review_actions mra
        LEFT JOIN users u ON mra.responsible_id = u.id
        LEFT JOIN management_review_checklist_items mci ON mra.source_item_id = mci.id
        WHERE mra.acta_id = $1
        ORDER BY mra.action_number
      `, [actaId]);

      const acta = {
        ...actaResult.rows[0],
        actions: actionsResult.rows
      };

      res.json({
        success: true,
        acta: transformToCamelCase(acta)
      });
    } catch (error) {
      console.error('Error fetching acta:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST create new acta
  app.post('/management-review/actas', async (req, res) => {
    try {
      const data = transformToSnakeCase(req.body);

      // Generate acta number
      const actaNumber = await query(
        'SELECT generate_mr_acta_number($1::date) as acta_number',
        [data.review_date]
      );

      const result = await query(`
        INSERT INTO management_review_actas (
          acta_number, review_date, period_start, period_end,
          location, status, attendees, kpi_snapshot,
          checklist_responses, executive_summary, next_review_date,
          created_by, workload_activity_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        actaNumber.rows[0].acta_number,
        data.review_date,
        data.period_start,
        data.period_end,
        data.location || null,
        data.status || 'draft',
        JSON.stringify(data.attendees || []),
        JSON.stringify(data.kpi_snapshot || {}),
        JSON.stringify(data.checklist_responses || {}),
        data.executive_summary || null,
        data.next_review_date || null,
        data.created_by || null,
        data.workload_activity_id || null
      ]);

      res.json({
        success: true,
        message: 'Acta created successfully',
        acta: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error creating acta:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT update acta
  app.put('/management-review/actas/:id', async (req, res) => {
    try {
      const actaId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        UPDATE management_review_actas
        SET
          review_date = COALESCE($1, review_date),
          period_start = COALESCE($2, period_start),
          period_end = COALESCE($3, period_end),
          location = COALESCE($4, location),
          status = COALESCE($5, status),
          attendees = COALESCE($6, attendees),
          kpi_snapshot = COALESCE($7, kpi_snapshot),
          checklist_responses = COALESCE($8, checklist_responses),
          decisions = COALESCE($9, decisions),
          executive_summary = COALESCE($10, executive_summary),
          next_review_date = COALESCE($11, next_review_date),
          updated_by = $12,
          completed_at = CASE WHEN $5 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $13
        RETURNING *
      `, [
        data.review_date,
        data.period_start,
        data.period_end,
        data.location,
        data.status,
        data.attendees ? JSON.stringify(data.attendees) : null,
        data.kpi_snapshot ? JSON.stringify(data.kpi_snapshot) : null,
        data.checklist_responses ? JSON.stringify(data.checklist_responses) : null,
        data.decisions ? JSON.stringify(data.decisions) : null,
        data.executive_summary,
        data.next_review_date,
        data.updated_by || null,
        actaId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Acta not found' });
      }

      res.json({
        success: true,
        message: 'Acta updated successfully',
        acta: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating acta:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST add signature to acta
  app.post('/management-review/actas/:id/sign', async (req, res) => {
    try {
      const actaId = parseInt(req.params.id);
      const { userId, signature } = req.body;

      // Get current attendees
      const actaResult = await query(
        'SELECT attendees FROM management_review_actas WHERE id = $1',
        [actaId]
      );

      if (actaResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Acta not found' });
      }

      let attendees = actaResult.rows[0].attendees || [];

      // Update signature for user
      attendees = attendees.map(a => {
        if (a.userId === userId) {
          return { ...a, signature, signedAt: new Date().toISOString() };
        }
        return a;
      });

      // Check if all have signed
      const allSigned = attendees.every(a => a.signature);
      const newStatus = allSigned ? 'completed' : 'pending_signatures';

      const result = await query(`
        UPDATE management_review_actas
        SET attendees = $1, status = $2, completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $3
        RETURNING *
      `, [JSON.stringify(attendees), newStatus, actaId]);

      res.json({
        success: true,
        message: 'Signature added',
        acta: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error signing acta:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  // POST add action to acta (creates workload activity)
  app.post('/management-review/actas/:id/actions', async (req, res) => {
    try {
      const actaId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      // Get next action number
      const orderResult = await query(
        'SELECT COALESCE(MAX(action_number), 0) + 1 as next_num FROM management_review_actions WHERE acta_id = $1',
        [actaId]
      );
      const nextNum = orderResult.rows[0].next_num;

      // Create action
      const actionResult = await query(`
        INSERT INTO management_review_actions (
          acta_id, action_number, description, responsible_id,
          due_date, priority, source_clause, source_item_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        actaId,
        nextNum,
        data.description,
        data.responsible_id || null,
        data.due_date || null,
        data.priority || 'medium',
        data.source_clause || null,
        data.source_item_id || null
      ]);

      const action = actionResult.rows[0];

      // Create workload activity if responsible is assigned
      if (data.responsible_id && data.due_date) {
        const actaInfo = await query(
          'SELECT acta_number FROM management_review_actas WHERE id = $1',
          [actaId]
        );

        const workloadResult = await query(`
          INSERT INTO workload_activities (
            title, description, activity_type, status,
            assigned_to, start_date, end_date,
            source_type, source_id, source_discipline,
            priority
          ) VALUES ($1, $2, 'assigned', 'pending', $3, CURRENT_DATE, $4, 'MANAGEMENT_REVIEW', $5, 'ACTION', $6)
          RETURNING id
        `, [
          `MR Action: ${data.description.substring(0, 50)}...`,
          data.description,
          data.responsible_id,
          data.due_date,
          actaInfo.rows[0].acta_number,
          data.priority || 'medium'
        ]);

        // Link activity to action
        await query(
          'UPDATE management_review_actions SET workload_activity_id = $1 WHERE id = $2',
          [workloadResult.rows[0].id, action.id]
        );

        action.workload_activity_id = workloadResult.rows[0].id;
      }

      res.json({
        success: true,
        message: 'Action added',
        action: transformToCamelCase(action)
      });
    } catch (error) {
      console.error('Error adding action:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT update action status
  app.put('/management-review/actions/:id', async (req, res) => {
    try {
      const actionId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        UPDATE management_review_actions
        SET
          description = COALESCE($1, description),
          responsible_id = COALESCE($2, responsible_id),
          due_date = COALESCE($3, due_date),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          completion_date = CASE WHEN $5 = 'completed' THEN CURRENT_DATE ELSE completion_date END,
          completion_notes = COALESCE($6, completion_notes)
        WHERE id = $7
        RETURNING *
      `, [
        data.description,
        data.responsible_id,
        data.due_date,
        data.priority,
        data.status,
        data.completion_notes,
        actionId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Action not found' });
      }

      // Sync to workload activity if exists
      const action = result.rows[0];
      if (action.workload_activity_id) {
        await query(`
          UPDATE workload_activities
          SET status = $1, progress = CASE WHEN $1 = 'completed' THEN 100 ELSE progress END
          WHERE id = $2
        `, [data.status, action.workload_activity_id]);
      }

      res.json({
        success: true,
        message: 'Action updated',
        action: transformToCamelCase(action)
      });
    } catch (error) {
      console.error('Error updating action:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // PREVIOUS REVIEW ACTIONS (for follow-up)
  // ============================================================================

  // GET open actions from previous reviews
  app.get('/management-review/previous-actions', async (req, res) => {
    try {
      const result = await query(`
        SELECT
          mra.*,
          ma.acta_number,
          ma.review_date,
          u.first_name || ' ' || u.last_name as responsible_name
        FROM management_review_actions mra
        JOIN management_review_actas ma ON mra.acta_id = ma.id
        LEFT JOIN users u ON mra.responsible_id = u.id
        WHERE mra.status NOT IN ('completed', 'cancelled')
        ORDER BY mra.due_date ASC NULLS LAST
      `);

      res.json({
        success: true,
        actions: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching previous actions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // WORKLOAD INTEGRATION
  // ============================================================================

  // POST create Management Review as recurring activity in workload
  app.post('/management-review/schedule', async (req, res) => {
    try {
      const data = transformToSnakeCase(req.body);

      // Create recurring activity for Management Review
      const result = await query(`
        INSERT INTO workload_activities (
          title, description, activity_type,
          assigned_to, start_date, end_date,
          source_type, source_discipline,
          is_recurring, frequency, recurring_duration,
          priority, status
        ) VALUES (
          'Revisión por la Dirección',
          'Revisión trimestral del SGC según ISO 9001:9.3 / IATF 16949:9.3',
          'recurring',
          $1, $2, $3,
          'MANAGEMENT_REVIEW', 'REVIEW',
          true, 'quarterly', '2_years',
          'high', 'pending'
        )
        RETURNING *
      `, [
        data.assigned_to,
        data.start_date,
        data.end_date || data.start_date
      ]);

      res.json({
        success: true,
        message: 'Management Review scheduled',
        activity: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error scheduling review:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  console.log('✅ Management Review endpoints registered');
};

module.exports = setupManagementReviewEndpoints;
