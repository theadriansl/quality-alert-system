const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');
const { sendAuditNotification } = require('../utils/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for audit evidence uploads
const auditEvidenceDir = path.join(__dirname, '../uploads/audit-evidence');
if (!fs.existsSync(auditEvidenceDir)) {
  fs.mkdirSync(auditEvidenceDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, auditEvidenceDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audit-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen, PDF y documentos de Office'));
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate audit number
const generateAuditNumber = async () => {
  const currentYear = new Date().getFullYear();
  const result = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(audit_number FROM 'AUD-\\d{4}-(\\d+)') AS INTEGER)
    ), 0) + 1 as next_seq
    FROM audit_schedules
    WHERE audit_number LIKE 'AUD-' || $1 || '-%'
  `, [currentYear]);

  const nextSeq = result.rows[0].next_seq;
  return `AUD-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
};

// Generate NC number
const generateNCNumber = async () => {
  const currentYear = new Date().getFullYear();
  const result = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(nc_number FROM 'NC-AUD-\\d{4}-(\\d+)') AS INTEGER)
    ), 0) + 1 as next_seq
    FROM audit_non_conformities
    WHERE nc_number LIKE 'NC-AUD-' || $1 || '-%'
  `, [currentYear]);

  const nextSeq = result.rows[0].next_seq;
  return `NC-AUD-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
};

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

// GET /audit/dashboard-stats - Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const [totalResult, statusResult, ncsResult] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM audit_schedules`),
      query(`SELECT status, COUNT(*) as count FROM audit_schedules GROUP BY status`),
      query(`SELECT
        CASE
          WHEN nc_type = 'major' THEN 'major'
          WHEN nc_type = 'minor' THEN 'minor'
          ELSE 'observation'
        END as type,
        COUNT(*) as count
        FROM audit_non_conformities
        GROUP BY 1`)
    ]);

    const byStatus = statusResult.rows;
    const totalAudits = parseInt(totalResult.rows[0]?.total) || 0;
    const completedAudits = byStatus.find(s => s.status === 'completed')?.count || 0;
    const inProgressAudits = byStatus.find(s => s.status === 'in_progress')?.count || 0;
    const plannedAudits = byStatus.find(s => s.status === 'planned')?.count || 0;

    res.json({
      success: true,
      stats: {
        totalAudits,
        completedAudits: parseInt(completedAudits),
        inProgressAudits: parseInt(inProgressAudits),
        plannedAudits: parseInt(plannedAudits),
        byStatus,
        ncsByType: ncsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

// GET /audit/recent - Get recent audits
router.get('/recent', authenticateToken, async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await query(`
      SELECT
        a.id,
        a.audit_number as audit_id,
        s.audit_name,
        s.area_process as area,
        s.status,
        s.planned_start_date as scheduled_date,
        u.first_name || ' ' || u.last_name as lead_auditor_name,
        p.name as program_name
      FROM audits a
      LEFT JOIN audit_schedules s ON a.schedule_id = s.id
      LEFT JOIN users u ON s.lead_auditor_id = u.id
      LEFT JOIN audit_programs p ON s.program_id = p.id
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      success: true,
      audits: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching recent audits:', error);
    res.status(500).json({ success: false, message: 'Error fetching audits' });
  }
});

// ============================================================================
// AUDIT PROGRAMS ENDPOINTS
// ============================================================================

// GET /audit/programs - List all programs
router.get('/programs', authenticateToken, async (req, res) => {
  const { year, status } = req.query;

  try {
    let sql = `
      SELECT
        ap.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        au.first_name || ' ' || au.last_name as approved_by_name,
        (SELECT COUNT(*) FROM audit_schedules WHERE program_id = ap.id) as total_audits,
        (SELECT COUNT(*) FROM audit_schedules WHERE program_id = ap.id AND status = 'completed') as completed_audits
      FROM audit_programs ap
      LEFT JOIN users u ON ap.created_by = u.id
      LEFT JOIN users au ON ap.approved_by = au.id
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      params.push(year);
      sql += ` AND ap.year = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND ap.status = $${params.length}`;
    }

    sql += ` ORDER BY ap.year DESC, ap.created_at DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      programs: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching audit programs:', error);
    res.status(500).json({ success: false, message: 'Error fetching programs' });
  }
});

// GET /audit/programs/:id - Get program by ID
router.get('/programs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT
        ap.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        au.first_name || ' ' || au.last_name as approved_by_name
      FROM audit_programs ap
      LEFT JOIN users u ON ap.created_by = u.id
      LEFT JOIN users au ON ap.approved_by = au.id
      WHERE ap.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    // Get associated schedules
    const schedules = await query(`
      SELECT
        s.*,
        u.first_name || ' ' || u.last_name as lead_auditor_name
      FROM audit_schedules s
      LEFT JOIN users u ON s.lead_auditor_id = u.id
      WHERE s.program_id = $1
      ORDER BY s.planned_start_date
    `, [id]);

    res.json({
      success: true,
      program: transformToCamelCase(result.rows[0]),
      schedules: transformToCamelCase(schedules.rows)
    });
  } catch (error) {
    console.error('Error fetching audit program:', error);
    res.status(500).json({ success: false, message: 'Error fetching program' });
  }
});

// POST /audit/programs - Create program
router.post('/programs', authenticateToken, async (req, res) => {
  const {
    year, name, description, auditType, scope,
    objectives, criteria, frequencyBasis
  } = req.body;

  try {
    const result = await query(`
      INSERT INTO audit_programs (
        year, name, description, audit_type, scope,
        objectives, criteria, frequency_basis, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [year, name, description, auditType, scope, objectives, criteria, frequencyBasis, req.user.id]);

    res.status(201).json({
      success: true,
      program: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating audit program:', error);
    res.status(500).json({ success: false, message: 'Error creating program' });
  }
});

// PUT /audit/programs/:id - Update program
router.put('/programs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    year, name, description, auditType, scope,
    objectives, criteria, frequencyBasis, status
  } = req.body;

  try {
    // If approving, set approved_by and approved_at
    let approvalFields = '';
    const params = [year, name, description, auditType, scope, objectives, criteria, frequencyBasis, status, id];

    if (status === 'approved') {
      approvalFields = ', approved_by = $11, approved_at = CURRENT_TIMESTAMP';
      params.push(req.user.id);
    }

    const result = await query(`
      UPDATE audit_programs SET
        year = $1, name = $2, description = $3, audit_type = $4, scope = $5,
        objectives = $6, criteria = $7, frequency_basis = $8, status = $9
        ${approvalFields}
      WHERE id = $10
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    res.json({
      success: true,
      program: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating audit program:', error);
    res.status(500).json({ success: false, message: 'Error updating program' });
  }
});

// DELETE /audit/programs/:id - Delete program
router.delete('/programs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM audit_programs WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    res.json({ success: true, message: 'Program deleted' });
  } catch (error) {
    console.error('Error deleting audit program:', error);
    res.status(500).json({ success: false, message: 'Error deleting program' });
  }
});

// ============================================================================
// AUDIT SCHEDULES ENDPOINTS
// ============================================================================

// GET /audit/schedules - List schedules
router.get('/schedules', authenticateToken, async (req, res) => {
  const { programId, status, auditorId, startDate, endDate } = req.query;

  try {
    let sql = `
      SELECT
        s.*,
        p.name as program_name,
        p.year as program_year,
        u.first_name || ' ' || u.last_name as lead_auditor_name,
        c.name as checklist_name,
        (SELECT COUNT(*) FROM audits WHERE schedule_id = s.id) as execution_count
      FROM audit_schedules s
      LEFT JOIN audit_programs p ON s.program_id = p.id
      LEFT JOIN users u ON s.lead_auditor_id = u.id
      LEFT JOIN audit_checklists c ON s.checklist_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (programId) {
      params.push(programId);
      sql += ` AND s.program_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND s.status = $${params.length}`;
    }

    if (auditorId) {
      params.push(auditorId);
      sql += ` AND (s.lead_auditor_id = $${params.length} OR $${params.length} = ANY(s.co_auditors))`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND s.planned_start_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND s.planned_end_date <= $${params.length}`;
    }

    sql += ` ORDER BY s.planned_start_date`;

    const result = await query(sql, params);

    res.json({
      success: true,
      schedules: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching audit schedules:', error);
    res.status(500).json({ success: false, message: 'Error fetching schedules' });
  }
});

// GET /audit/schedules/gantt - Get schedules formatted for Gantt chart
router.get('/schedules/gantt', authenticateToken, async (req, res) => {
  const { year, programId } = req.query;

  try {
    let sql = `
      SELECT
        s.id,
        s.audit_number,
        s.audit_name,
        s.area_process,
        s.department,
        s.planned_start_date,
        s.planned_end_date,
        s.actual_start_date,
        s.actual_end_date,
        s.status,
        s.is_recurring,
        s.frequency,
        s.frequency_details,
        s.lead_auditor_id,
        u.first_name || ' ' || u.last_name as lead_auditor_name,
        p.name as program_name
      FROM audit_schedules s
      LEFT JOIN users u ON s.lead_auditor_id = u.id
      LEFT JOIN audit_programs p ON s.program_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      params.push(year);
      sql += ` AND EXTRACT(YEAR FROM s.planned_start_date) = $${params.length}`;
    }

    if (programId) {
      params.push(programId);
      sql += ` AND s.program_id = $${params.length}`;
    }

    sql += ` ORDER BY s.planned_start_date`;

    const result = await query(sql, params);

    // Transform scheduled audits to Gantt format
    const ganttTasks = result.rows.map(s => ({
      id: `audit-${s.id}`,
      scheduleId: s.id,
      action: s.audit_name,
      result: s.area_process,
      area: s.department || 'General',
      responsible: s.lead_auditor_id,
      responsibleName: s.lead_auditor_name,
      startDate: s.planned_start_date,
      endDate: s.planned_end_date,
      actualStartDate: s.actual_start_date,
      actualEndDate: s.actual_end_date,
      status: mapAuditStatusToGantt(s.status),
      auditStatus: s.status,
      priority: 'media',
      isRecurring: s.is_recurring,
      frequency: s.frequency,
      frequencyDetails: s.frequency_details,
      programName: s.program_name,
      auditNumber: s.audit_number,
      sourceType: 'scheduled'
    }));

    // Also fetch audit requests from 8D/ECR
    let requestsSql = `
      SELECT
        ar.id,
        ar.source_type,
        ar.source_id,
        ar.source_number,
        ar.item_name,
        ar.due_date,
        ar.audit_status,
        ar.created_at,
        ar.assigned_auditors,
        CASE
          WHEN ar.source_type = '8D' THEN r.report_id
          WHEN ar.source_type = 'ECR' THEN ecr.ecr_number
          ELSE ar.source_number
        END as display_number,
        CASE
          WHEN ar.source_type = '8D' THEN r.title
          WHEN ar.source_type = 'ECR' THEN ecr.change_title
          ELSE ar.item_name
        END as display_title,
        (SELECT string_agg(u.first_name || ' ' || u.last_name, ', ')
         FROM users u WHERE u.id = ANY(ar.assigned_auditors)) as auditor_names
      FROM audit_requests ar
      LEFT JOIN eightd_reports r ON ar.source_id = r.id AND ar.source_type = '8D'
      LEFT JOIN ecr_reports ecr ON ar.source_id = ecr.id AND ar.source_type = 'ECR'
      WHERE 1=1
    `;
    const requestParams = [];

    if (year) {
      requestParams.push(year);
      requestsSql += ` AND EXTRACT(YEAR FROM COALESCE(ar.due_date, ar.created_at)) = $${requestParams.length}`;
    }

    requestsSql += ` ORDER BY ar.due_date NULLS LAST, ar.created_at`;

    const requestsResult = await query(requestsSql, requestParams);

    // Transform audit requests to Gantt format
    const requestTasks = requestsResult.rows.map(r => ({
      id: `request-${r.id}`,
      requestId: r.id,
      action: `[${r.source_type}] ${r.display_number || r.source_number}`,
      result: r.item_name || r.display_title,
      area: r.source_type,
      responsible: r.assigned_auditors?.[0] || null,
      responsibleName: r.auditor_names || 'Sin asignar',
      startDate: r.due_date || r.created_at,
      endDate: r.due_date || r.created_at,
      status: mapRequestStatusToGantt(r.audit_status),
      auditStatus: r.audit_status || 'pending',
      priority: 'alta',
      sourceType: r.source_type,
      sourceId: r.source_id,
      sourceNumber: r.display_number || r.source_number
    }));

    res.json({
      success: true,
      tasks: [...ganttTasks, ...requestTasks]
    });
  } catch (error) {
    console.error('Error fetching Gantt data:', error);
    res.status(500).json({ success: false, message: 'Error fetching Gantt data' });
  }
});

function mapAuditStatusToGantt(status) {
  const map = {
    'planned': 'pending',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'postponed': 'blocked'
  };
  return map[status] || 'pending';
}

function mapRequestStatusToGantt(status) {
  const map = {
    'pending': 'pending',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'approved': 'completed',
    'rejected': 'blocked'
  };
  return map[status] || 'pending';
}

// GET /audit/schedules/:id - Get schedule by ID
router.get('/schedules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT
        s.*,
        p.name as program_name,
        p.year as program_year,
        u.first_name || ' ' || u.last_name as lead_auditor_name,
        c.name as checklist_name,
        c.standard as checklist_standard
      FROM audit_schedules s
      LEFT JOIN audit_programs p ON s.program_id = p.id
      LEFT JOIN users u ON s.lead_auditor_id = u.id
      LEFT JOIN audit_checklists c ON s.checklist_id = c.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Get co-auditors info
    const schedule = result.rows[0];
    let coAuditorsInfo = [];
    if (schedule.co_auditors && schedule.co_auditors.length > 0) {
      const coResult = await query(`
        SELECT id, first_name, last_name, email
        FROM users WHERE id = ANY($1)
      `, [schedule.co_auditors]);
      coAuditorsInfo = coResult.rows;
    }

    // Get linked ECR info if exists
    let linkedEcr = null;
    if (schedule.linked_ecr_id) {
      const ecrResult = await query(`
        SELECT id, ecr_number, change_title as title, approval_status as status FROM ecr_reports WHERE id = $1
      `, [schedule.linked_ecr_id]);
      linkedEcr = ecrResult.rows[0] || null;
    }

    res.json({
      success: true,
      schedule: transformToCamelCase(schedule),
      coAuditors: transformToCamelCase(coAuditorsInfo),
      linkedEcr: linkedEcr ? transformToCamelCase(linkedEcr) : null
    });
  } catch (error) {
    console.error('Error fetching audit schedule:', error);
    res.status(500).json({ success: false, message: 'Error fetching schedule' });
  }
});

// POST /audit/schedules - Create schedule
router.post('/schedules', authenticateToken, async (req, res) => {
  const {
    programId, auditName, description, areaProcess, department,
    plannedStartDate, plannedEndDate, isRecurring, frequency, frequencyDetails,
    leadAuditorId, coAuditors, auditees, checklistId,
    linkedEcrId, linked8dId, linkedQarId,
    plannedHours, syncToWorkload
  } = req.body;

  try {
    const auditNumber = await generateAuditNumber();

    const result = await query(`
      INSERT INTO audit_schedules (
        program_id, audit_number, audit_name, description, area_process, department,
        planned_start_date, planned_end_date, is_recurring, frequency, frequency_details,
        lead_auditor_id, co_auditors, auditees, checklist_id,
        linked_ecr_id, linked_8d_id, linked_qar_id, planned_hours, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      programId, auditNumber, auditName, description, areaProcess, department,
      plannedStartDate, plannedEndDate, isRecurring || false, frequency,
      frequencyDetails ? JSON.stringify(frequencyDetails) : null,
      leadAuditorId, coAuditors || [], auditees || [], checklistId,
      linkedEcrId || null, linked8dId || null, linkedQarId || null,
      plannedHours || null, req.user.id
    ]);

    const schedule = result.rows[0];

    // Sync to Workload if requested
    let workloadActivityId = null;
    if (syncToWorkload) {
      try {
        const syncResult = await query(
          'SELECT sync_audit_schedule_to_workload($1, $2) as activity_id',
          [schedule.id, req.user.id]
        );
        workloadActivityId = syncResult.rows[0]?.activity_id;
      } catch (syncError) {
        console.error('Error syncing to workload:', syncError);
        // Don't fail the schedule creation, just log the error
      }
    }

    res.status(201).json({
      success: true,
      schedule: transformToCamelCase(schedule),
      workloadActivityId
    });
  } catch (error) {
    console.error('Error creating audit schedule:', error);
    res.status(500).json({ success: false, message: 'Error creating schedule' });
  }
});

// PUT /audit/schedules/:id - Update schedule
router.put('/schedules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    programId, auditName, description, areaProcess, department,
    plannedStartDate, plannedEndDate, actualStartDate, actualEndDate,
    isRecurring, frequency, frequencyDetails,
    leadAuditorId, coAuditors, auditees, checklistId,
    linkedEcrId, linked8dId, linkedQarId, status,
    plannedHours, actualHours, syncToWorkload
  } = req.body;

  try {
    const result = await query(`
      UPDATE audit_schedules SET
        program_id = COALESCE($1, program_id),
        audit_name = COALESCE($2, audit_name),
        description = COALESCE($3, description),
        area_process = COALESCE($4, area_process),
        department = COALESCE($5, department),
        planned_start_date = COALESCE($6, planned_start_date),
        planned_end_date = COALESCE($7, planned_end_date),
        actual_start_date = $8,
        actual_end_date = $9,
        is_recurring = COALESCE($10, is_recurring),
        frequency = $11,
        frequency_details = $12,
        lead_auditor_id = $13,
        co_auditors = COALESCE($14, co_auditors),
        auditees = COALESCE($15, auditees),
        checklist_id = $16,
        linked_ecr_id = $17,
        linked_8d_id = $18,
        linked_qar_id = $19,
        status = COALESCE($20, status),
        planned_hours = COALESCE($21, planned_hours),
        actual_hours = COALESCE($22, actual_hours)
      WHERE id = $23
      RETURNING *
    `, [
      programId, auditName, description, areaProcess, department,
      plannedStartDate, plannedEndDate, actualStartDate || null, actualEndDate || null,
      isRecurring, frequency || null, frequencyDetails ? JSON.stringify(frequencyDetails) : null,
      leadAuditorId || null, coAuditors, auditees, checklistId || null,
      linkedEcrId || null, linked8dId || null, linkedQarId || null, status,
      plannedHours, actualHours, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const schedule = result.rows[0];

    // Sync to Workload if requested or if already linked
    let workloadActivityId = schedule.workload_activity_id;
    if (syncToWorkload || workloadActivityId) {
      try {
        const syncResult = await query(
          'SELECT sync_audit_schedule_to_workload($1, $2) as activity_id',
          [schedule.id, req.user.id]
        );
        workloadActivityId = syncResult.rows[0]?.activity_id;
      } catch (syncError) {
        console.error('Error syncing to workload:', syncError);
      }
    }

    res.json({
      success: true,
      schedule: transformToCamelCase(schedule),
      workloadActivityId
    });
  } catch (error) {
    console.error('Error updating audit schedule:', error);
    res.status(500).json({ success: false, message: 'Error updating schedule' });
  }
});

// DELETE /audit/schedules/:id - Delete schedule
router.delete('/schedules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM audit_schedules WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    console.error('Error deleting audit schedule:', error);
    res.status(500).json({ success: false, message: 'Error deleting schedule' });
  }
});

// POST /audit/schedules/:id/generate-recurring - Generate recurring instances
router.post('/schedules/:id/generate-recurring', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { count = 12 } = req.body; // Generate up to 12 instances by default

  try {
    const parent = await query('SELECT * FROM audit_schedules WHERE id = $1', [id]);

    if (parent.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent schedule not found' });
    }

    const p = parent.rows[0];
    if (!p.is_recurring || !p.frequency) {
      return res.status(400).json({ success: false, message: 'Schedule is not recurring' });
    }

    const instances = [];
    let currentStart = new Date(p.planned_start_date);
    let currentEnd = new Date(p.planned_end_date);
    const duration = currentEnd - currentStart;

    for (let i = 0; i < count; i++) {
      // Advance dates based on frequency
      switch (p.frequency) {
        case 'weekly':
          currentStart.setDate(currentStart.getDate() + 7);
          break;
        case 'monthly':
          currentStart.setMonth(currentStart.getMonth() + 1);
          break;
        case 'quarterly':
          currentStart.setMonth(currentStart.getMonth() + 3);
          break;
        case 'yearly':
          currentStart.setFullYear(currentStart.getFullYear() + 1);
          break;
      }
      currentEnd = new Date(currentStart.getTime() + duration);

      const auditNumber = await generateAuditNumber();

      const result = await query(`
        INSERT INTO audit_schedules (
          program_id, audit_number, audit_name, description, area_process, department,
          planned_start_date, planned_end_date, is_recurring, frequency, frequency_details,
          lead_auditor_id, co_auditors, auditees, checklist_id, parent_schedule_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        p.program_id, auditNumber, p.audit_name, p.description, p.area_process, p.department,
        currentStart.toISOString().split('T')[0], currentEnd.toISOString().split('T')[0],
        false, null, null, // Child instances are not recurring themselves
        p.lead_auditor_id, p.co_auditors, p.auditees, p.checklist_id, id, req.user.id
      ]);

      instances.push(result.rows[0]);
    }

    res.json({
      success: true,
      message: `Generated ${instances.length} recurring instances`,
      instances: transformToCamelCase(instances)
    });
  } catch (error) {
    console.error('Error generating recurring instances:', error);
    res.status(500).json({ success: false, message: 'Error generating instances' });
  }
});

// ============================================================================
// AUDIT CHECKLISTS ENDPOINTS
// ============================================================================

// GET /audit/checklists - List checklists
router.get('/checklists', authenticateToken, async (req, res) => {
  const { standard, process, active } = req.query;

  try {
    let sql = `
      SELECT
        c.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT COUNT(*) FROM audit_checklist_items WHERE checklist_id = c.id) as item_count
      FROM audit_checklists c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (standard) {
      params.push(`%${standard}%`);
      sql += ` AND c.standard ILIKE $${params.length}`;
    }

    if (process) {
      params.push(`%${process}%`);
      sql += ` AND c.process ILIKE $${params.length}`;
    }

    if (active !== undefined) {
      params.push(active === 'true');
      sql += ` AND c.is_active = $${params.length}`;
    }

    sql += ` ORDER BY c.name`;

    const result = await query(sql, params);

    res.json({
      success: true,
      checklists: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ success: false, message: 'Error fetching checklists' });
  }
});

// GET /audit/checklists/:id - Get checklist with items
router.get('/checklists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const checklistResult = await query(`
      SELECT
        c.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        au.first_name || ' ' || au.last_name as approved_by_name
      FROM audit_checklists c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN users au ON c.approved_by = au.id
      WHERE c.id = $1
    `, [id]);

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }

    const itemsResult = await query(`
      SELECT * FROM audit_checklist_items
      WHERE checklist_id = $1
      ORDER BY item_order
    `, [id]);

    res.json({
      success: true,
      checklist: transformToCamelCase(checklistResult.rows[0]),
      items: transformToCamelCase(itemsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ success: false, message: 'Error fetching checklist' });
  }
});

// POST /audit/checklists - Create checklist
router.post('/checklists', authenticateToken, async (req, res) => {
  const { name, description, standard, process, version } = req.body;

  try {
    const result = await query(`
      INSERT INTO audit_checklists (name, description, standard, process, version, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, standard, process, version || '1.0', req.user.id]);

    res.status(201).json({
      success: true,
      checklist: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({ success: false, message: 'Error creating checklist' });
  }
});

// PUT /audit/checklists/:id - Update checklist
router.put('/checklists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, standard, process, version, isActive } = req.body;

  try {
    const result = await query(`
      UPDATE audit_checklists SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        standard = COALESCE($3, standard),
        process = COALESCE($4, process),
        version = COALESCE($5, version),
        is_active = COALESCE($6, is_active)
      WHERE id = $7
      RETURNING *
    `, [name, description, standard, process, version, isActive, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }

    res.json({
      success: true,
      checklist: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ success: false, message: 'Error updating checklist' });
  }
});

// DELETE /audit/checklists/:id - Delete checklist
router.delete('/checklists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM audit_checklists WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }

    res.json({ success: true, message: 'Checklist deleted' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ success: false, message: 'Error deleting checklist' });
  }
});

// POST /audit/checklists/:id/clone - Clone checklist
router.post('/checklists/:id/clone', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { newName, newVersion } = req.body;

  try {
    // Get original checklist
    const original = await query('SELECT * FROM audit_checklists WHERE id = $1', [id]);
    if (original.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }

    const o = original.rows[0];

    // Create new checklist
    const newChecklist = await query(`
      INSERT INTO audit_checklists (name, description, standard, process, version, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      newName || `${o.name} (Copia)`,
      o.description,
      o.standard,
      o.process,
      newVersion || '1.0',
      req.user.id
    ]);

    const newId = newChecklist.rows[0].id;

    // Clone items
    await query(`
      INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical)
      SELECT $1, item_order, clause, question, guidance, evidence_required, category, is_critical
      FROM audit_checklist_items
      WHERE checklist_id = $2
    `, [newId, id]);

    res.status(201).json({
      success: true,
      checklist: transformToCamelCase(newChecklist.rows[0])
    });
  } catch (error) {
    console.error('Error cloning checklist:', error);
    res.status(500).json({ success: false, message: 'Error cloning checklist' });
  }
});

// ============================================================================
// CHECKLIST ITEMS ENDPOINTS
// ============================================================================

// POST /audit/checklists/:id/items - Add item
router.post('/checklists/:id/items', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { itemOrder, clause, question, guidance, evidenceRequired, category, isCritical } = req.body;

  try {
    // Get next order if not provided
    let order = itemOrder;
    if (!order) {
      const maxOrder = await query(
        'SELECT COALESCE(MAX(item_order), 0) + 1 as next_order FROM audit_checklist_items WHERE checklist_id = $1',
        [id]
      );
      order = maxOrder.rows[0].next_order;
    }

    const result = await query(`
      INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, order, clause, question, guidance, evidenceRequired, category, isCritical || false]);

    res.status(201).json({
      success: true,
      item: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error adding checklist item:', error);
    res.status(500).json({ success: false, message: 'Error adding item' });
  }
});

// PUT /audit/checklists/:id/items/:itemId - Update item
router.put('/checklists/:id/items/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const { itemOrder, clause, question, guidance, evidenceRequired, category, isCritical } = req.body;

  try {
    const result = await query(`
      UPDATE audit_checklist_items SET
        item_order = COALESCE($1, item_order),
        clause = COALESCE($2, clause),
        question = COALESCE($3, question),
        guidance = COALESCE($4, guidance),
        evidence_required = COALESCE($5, evidence_required),
        category = COALESCE($6, category),
        is_critical = COALESCE($7, is_critical)
      WHERE id = $8
      RETURNING *
    `, [itemOrder, clause, question, guidance, evidenceRequired, category, isCritical, itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({
      success: true,
      item: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ success: false, message: 'Error updating item' });
  }
});

// DELETE /audit/checklists/:id/items/:itemId - Delete item
router.delete('/checklists/:id/items/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    const result = await query('DELETE FROM audit_checklist_items WHERE id = $1 RETURNING id', [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ success: false, message: 'Error deleting item' });
  }
});

// PUT /audit/checklists/:id/items/reorder - Reorder items
router.put('/checklists/:id/items/reorder', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // Array of { id, itemOrder }

  try {
    for (const item of items) {
      await query(
        'UPDATE audit_checklist_items SET item_order = $1 WHERE id = $2 AND checklist_id = $3',
        [item.itemOrder, item.id, id]
      );
    }

    res.json({ success: true, message: 'Items reordered' });
  } catch (error) {
    console.error('Error reordering items:', error);
    res.status(500).json({ success: false, message: 'Error reordering items' });
  }
});

// ============================================================================
// AUDIT EXECUTION ENDPOINTS
// ============================================================================

// GET /audit/audits - List executed audits
router.get('/audits', authenticateToken, async (req, res) => {
  const { scheduleId, status, startDate, endDate } = req.query;

  try {
    let sql = `
      SELECT
        a.*,
        s.audit_number as schedule_audit_number,
        s.audit_name as schedule_audit_name,
        u.first_name || ' ' || u.last_name as lead_auditor_name,
        (SELECT COUNT(*) FROM audit_non_conformities WHERE audit_id = a.id AND status != 'closed') as open_ncs
      FROM audits a
      LEFT JOIN audit_schedules s ON a.schedule_id = s.id
      LEFT JOIN users u ON a.lead_auditor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (scheduleId) {
      params.push(scheduleId);
      sql += ` AND a.schedule_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND a.audit_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND a.audit_date <= $${params.length}`;
    }

    sql += ` ORDER BY a.audit_date DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      audits: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({ success: false, message: 'Error fetching audits' });
  }
});

// GET /audit/audits/:id - Get audit with findings
router.get('/audits/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const auditResult = await query(`
      SELECT
        a.*,
        s.audit_name as schedule_audit_name,
        s.checklist_id,
        u.first_name || ' ' || u.last_name as lead_auditor_name,
        cu.first_name || ' ' || cu.last_name as closed_by_name
      FROM audits a
      LEFT JOIN audit_schedules s ON a.schedule_id = s.id
      LEFT JOIN users u ON a.lead_auditor_id = u.id
      LEFT JOIN users cu ON a.closed_by = cu.id
      WHERE a.id = $1
    `, [id]);

    if (auditResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    // Get findings
    const findingsResult = await query(`
      SELECT
        f.*,
        ci.clause as item_clause,
        ci.question as item_question,
        ci.category as item_category
      FROM audit_findings f
      LEFT JOIN audit_checklist_items ci ON f.checklist_item_id = ci.id
      WHERE f.audit_id = $1
      ORDER BY ci.item_order
    `, [id]);

    // Get NCs
    const ncsResult = await query(`
      SELECT
        nc.*,
        u.first_name || ' ' || u.last_name as responsible_name
      FROM audit_non_conformities nc
      LEFT JOIN users u ON nc.responsible_id = u.id
      WHERE nc.audit_id = $1
      ORDER BY nc.created_at
    `, [id]);

    res.json({
      success: true,
      audit: transformToCamelCase(auditResult.rows[0]),
      findings: transformToCamelCase(findingsResult.rows),
      nonConformities: transformToCamelCase(ncsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching audit:', error);
    res.status(500).json({ success: false, message: 'Error fetching audit' });
  }
});

// POST /audit/audits - Start audit execution from schedule
router.post('/audits', authenticateToken, async (req, res) => {
  const { scheduleId, auditDate, auditeesPresent } = req.body;

  try {
    // Get schedule info
    const scheduleResult = await query('SELECT * FROM audit_schedules WHERE id = $1', [scheduleId]);
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const schedule = scheduleResult.rows[0];

    // Get checklist items count
    let totalItems = 0;
    if (schedule.checklist_id) {
      const itemsCount = await query(
        'SELECT COUNT(*) FROM audit_checklist_items WHERE checklist_id = $1',
        [schedule.checklist_id]
      );
      totalItems = parseInt(itemsCount.rows[0].count);
    }

    // Create audit execution
    const result = await query(`
      INSERT INTO audits (
        schedule_id, audit_number, audit_date, lead_auditor_id, co_auditors,
        auditees_present, area_process, total_items, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      scheduleId,
      schedule.audit_number,
      auditDate || new Date().toISOString().split('T')[0],
      schedule.lead_auditor_id,
      schedule.co_auditors,
      auditeesPresent || schedule.auditees,
      schedule.area_process,
      totalItems,
      req.user.id
    ]);

    // Update schedule status
    await query(`
      UPDATE audit_schedules SET
        status = 'in_progress',
        actual_start_date = COALESCE(actual_start_date, $1)
      WHERE id = $2
    `, [auditDate || new Date().toISOString().split('T')[0], scheduleId]);

    res.status(201).json({
      success: true,
      audit: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating audit execution:', error);
    res.status(500).json({ success: false, message: 'Error creating audit' });
  }
});

// PUT /audit/audits/:id - Update audit
router.put('/audits/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { auditDate, auditeesPresent, evidenceFiles } = req.body;

  try {
    const result = await query(`
      UPDATE audits SET
        audit_date = COALESCE($1, audit_date),
        auditees_present = COALESCE($2, auditees_present),
        evidence_files = COALESCE($3, evidence_files)
      WHERE id = $4
      RETURNING *
    `, [auditDate, auditeesPresent, evidenceFiles ? JSON.stringify(evidenceFiles) : null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    res.json({
      success: true,
      audit: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating audit:', error);
    res.status(500).json({ success: false, message: 'Error updating audit' });
  }
});

// POST /audit/audits/:id/findings - Register finding
router.post('/audits/:id/findings', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    checklistItemId, result: findingResult, clause, findingDescription,
    objectiveEvidence, auditorNotes, evidenceFiles
  } = req.body;

  try {
    // Get audit info for recurrence detection
    const auditInfo = await query(
      'SELECT area_process FROM audits WHERE id = $1',
      [id]
    );
    const areaProcess = auditInfo.rows[0]?.area_process || '';

    // Detect recurrence if it's a non-conformity or observation
    let recurrenceData = null;
    if (['nc_major', 'nc_minor', 'observation'].includes(findingResult)) {
      try {
        const recurrenceResult = await query(
          'SELECT * FROM detect_finding_recurrence($1, $2, $3, $4)',
          [clause, areaProcess, findingResult, id]
        );
        recurrenceData = recurrenceResult.rows[0];
      } catch (recErr) {
        console.error('Error detecting recurrence:', recErr);
      }
    }

    // Create finding with recurrence data
    const findingData = await query(`
      INSERT INTO audit_findings (
        audit_id, checklist_item_id, result, clause, finding_description,
        objective_evidence, auditor_notes, evidence_files,
        is_repeat, repeat_source_id, repeat_count, is_systemic, risk_signal_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id, checklistItemId, findingResult, clause, findingDescription,
      objectiveEvidence, auditorNotes,
      evidenceFiles ? JSON.stringify(evidenceFiles) : '[]',
      recurrenceData?.is_repeat || false,
      recurrenceData?.repeat_source_id || null,
      recurrenceData?.repeat_count || 0,
      recurrenceData?.is_systemic || false,
      recurrenceData?.risk_signal_level || 'low'
    ]);

    // If it's a NC, create NC record with recurrence detection
    let ncRecord = null;
    if (findingResult === 'nc_major' || findingResult === 'nc_minor') {
      const ncNumber = await generateNCNumber();
      const ncType = findingResult === 'nc_major' ? 'major' : 'minor';

      // Detect NC recurrence
      let ncRecurrenceData = null;
      try {
        const ncRecResult = await query(
          'SELECT * FROM detect_nc_recurrence($1, $2, $3)',
          [clause, ncType, id]
        );
        ncRecurrenceData = ncRecResult.rows[0];
      } catch (ncRecErr) {
        console.error('Error detecting NC recurrence:', ncRecErr);
      }

      const ncResult = await query(`
        INSERT INTO audit_non_conformities (
          audit_id, nc_number, nc_type, clause, description, objective_evidence,
          evidence_files, is_recurrent, recurrence_count, related_nc_ids,
          systemic_indicator, risk_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        id, ncNumber, ncType, clause, findingDescription, objectiveEvidence,
        evidenceFiles ? JSON.stringify(evidenceFiles) : '[]',
        ncRecurrenceData?.is_recurrent || false,
        ncRecurrenceData?.recurrence_count || 0,
        ncRecurrenceData?.related_nc_ids || [],
        ncRecurrenceData?.systemic_indicator || false,
        ncRecurrenceData?.risk_level || 'medium'
      ]);
      ncRecord = ncResult.rows[0];

      // Update finding with NC reference
      await query('UPDATE audit_findings SET nc_id = $1 WHERE id = $2', [ncRecord.id, findingData.rows[0].id]);
    }

    // Update audit counters
    const counterField = {
      'conformity': 'conformities',
      'nc_major': 'non_conformities_major',
      'nc_minor': 'non_conformities_minor',
      'observation': 'observations',
      'opportunity': 'opportunities'
    }[findingResult];

    if (counterField) {
      await query(`UPDATE audits SET ${counterField} = ${counterField} + 1 WHERE id = $1`, [id]);
    }

    // Recalculate score
    await recalculateAuditScore(id);

    res.status(201).json({
      success: true,
      finding: transformToCamelCase(findingData.rows[0]),
      nonConformity: ncRecord ? transformToCamelCase(ncRecord) : null,
      recurrence: recurrenceData ? {
        isRepeat: recurrenceData.is_repeat,
        repeatCount: recurrenceData.repeat_count,
        isSystemic: recurrenceData.is_systemic,
        riskLevel: recurrenceData.risk_signal_level
      } : null
    });
  } catch (error) {
    console.error('Error registering finding:', error);
    res.status(500).json({ success: false, message: 'Error registering finding' });
  }
});

// PUT /audit/audits/:id/findings/:findingId - Update finding
router.put('/audits/:id/findings/:findingId', authenticateToken, async (req, res) => {
  const { findingId } = req.params;
  const { result: findingResult, findingDescription, objectiveEvidence, auditorNotes } = req.body;

  try {
    const result = await query(`
      UPDATE audit_findings SET
        result = COALESCE($1, result),
        finding_description = COALESCE($2, finding_description),
        objective_evidence = COALESCE($3, objective_evidence),
        auditor_notes = COALESCE($4, auditor_notes)
      WHERE id = $5
      RETURNING *
    `, [findingResult, findingDescription, objectiveEvidence, auditorNotes, findingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Finding not found' });
    }

    res.json({
      success: true,
      finding: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating finding:', error);
    res.status(500).json({ success: false, message: 'Error updating finding' });
  }
});

// POST /audit/audits/:id/close - Close audit
router.post('/audits/:id/close', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Check for open NCs
    const openNCs = await query(
      'SELECT COUNT(*) FROM audit_non_conformities WHERE audit_id = $1 AND status != $2',
      [id, 'closed']
    );

    const hasOpenNCs = parseInt(openNCs.rows[0].count) > 0;
    const newStatus = hasOpenNCs ? 'pending_actions' : 'closed';

    const result = await query(`
      UPDATE audits SET
        status = $1,
        closed_by = $2,
        closed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [newStatus, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    // Update schedule
    const audit = result.rows[0];
    await query(`
      UPDATE audit_schedules SET
        status = 'completed',
        actual_end_date = $1
      WHERE id = $2
    `, [new Date().toISOString().split('T')[0], audit.schedule_id]);

    res.json({
      success: true,
      audit: transformToCamelCase(result.rows[0]),
      message: hasOpenNCs ? 'Audit closed with pending actions' : 'Audit closed successfully'
    });
  } catch (error) {
    console.error('Error closing audit:', error);
    res.status(500).json({ success: false, message: 'Error closing audit' });
  }
});

// Helper to recalculate audit score
async function recalculateAuditScore(auditId) {
  const result = await query(`
    SELECT
      total_items,
      conformities,
      non_conformities_major,
      non_conformities_minor,
      observations,
      opportunities
    FROM audits WHERE id = $1
  `, [auditId]);

  if (result.rows.length === 0) return;

  const a = result.rows[0];
  const evaluated = a.conformities + a.non_conformities_major + a.non_conformities_minor;

  if (evaluated === 0) return;

  // Score calculation: 100 - (major * 10 + minor * 5) / evaluated * 100
  const deductions = (a.non_conformities_major * 10 + a.non_conformities_minor * 5);
  const score = Math.max(0, 100 - (deductions / evaluated * 10));

  await query('UPDATE audits SET score_percentage = $1 WHERE id = $2', [score, auditId]);
}

// ============================================================================
// NON-CONFORMITIES ENDPOINTS
// ============================================================================

// GET /audit/ncs - List NCs
router.get('/ncs', authenticateToken, async (req, res) => {
  const { status, auditId, responsible, ncType, limit } = req.query;

  try {
    let sql = `
      SELECT
        nc.*,
        nc.nc_number as nc_id,
        nc.nc_type as type,
        a.audit_number,
        a.area_process as area,
        u.first_name || ' ' || u.last_name as responsible_name,
        vu.first_name || ' ' || vu.last_name as verified_by_name
      FROM audit_non_conformities nc
      LEFT JOIN audits a ON nc.audit_id = a.id
      LEFT JOIN users u ON nc.responsible_id = u.id
      LEFT JOIN users vu ON nc.verified_by = vu.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND nc.status = $${params.length}`;
    }

    if (auditId) {
      params.push(auditId);
      sql += ` AND nc.audit_id = $${params.length}`;
    }

    if (responsible) {
      params.push(responsible);
      sql += ` AND nc.responsible_id = $${params.length}`;
    }

    if (ncType) {
      params.push(ncType);
      sql += ` AND nc.nc_type = $${params.length}`;
    }

    sql += ` ORDER BY nc.created_at DESC`;

    if (limit) {
      params.push(parseInt(limit));
      sql += ` LIMIT $${params.length}`;
    }

    const result = await query(sql, params);

    res.json({
      success: true,
      ncs: transformToCamelCase(result.rows),
      nonConformities: transformToCamelCase(result.rows) // backward compatibility
    });
  } catch (error) {
    console.error('Error fetching NCs:', error);
    res.status(500).json({ success: false, message: 'Error fetching NCs' });
  }
});

// GET /audit/ncs/:id - Get NC detail
router.get('/ncs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT
        nc.*,
        a.audit_number,
        a.area_process,
        a.audit_date,
        u.first_name || ' ' || u.last_name as responsible_name,
        vu.first_name || ' ' || vu.last_name as verified_by_name
      FROM audit_non_conformities nc
      LEFT JOIN audits a ON nc.audit_id = a.id
      LEFT JOIN users u ON nc.responsible_id = u.id
      LEFT JOIN users vu ON nc.verified_by = vu.id
      WHERE nc.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NC not found' });
    }

    // Get linked 8D if exists
    let linked8D = null;
    if (result.rows[0].linked_8d_id) {
      const eightdResult = await query(
        'SELECT id, report_id, title, status FROM eightd_reports WHERE id = $1',
        [result.rows[0].linked_8d_id]
      );
      linked8D = eightdResult.rows[0] || null;
    }

    res.json({
      success: true,
      nonConformity: transformToCamelCase(result.rows[0]),
      linked8D: linked8D ? transformToCamelCase(linked8D) : null
    });
  } catch (error) {
    console.error('Error fetching NC:', error);
    res.status(500).json({ success: false, message: 'Error fetching NC' });
  }
});

// PUT /audit/ncs/:id - Update NC
router.put('/ncs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    responsibleId, dueDate, immediateAction, rootCauseAnalysis,
    correctiveAction, preventiveAction, status, plannedHours, syncToWorkload
  } = req.body;

  try {
    const result = await query(`
      UPDATE audit_non_conformities SET
        responsible_id = COALESCE($1, responsible_id),
        due_date = COALESCE($2, due_date),
        immediate_action = COALESCE($3, immediate_action),
        root_cause_analysis = COALESCE($4, root_cause_analysis),
        corrective_action = COALESCE($5, corrective_action),
        preventive_action = COALESCE($6, preventive_action),
        status = COALESCE($7, status),
        planned_hours = COALESCE($8, planned_hours)
      WHERE id = $9
      RETURNING *
    `, [responsibleId, dueDate, immediateAction, rootCauseAnalysis, correctiveAction, preventiveAction, status, plannedHours, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NC not found' });
    }

    const nc = result.rows[0];

    // Sync to Workload if requested or if already linked
    let workloadActivityId = nc.workload_activity_id;
    if (syncToWorkload || workloadActivityId) {
      try {
        const syncResult = await query(
          'SELECT sync_nc_to_workload($1, $2) as activity_id',
          [nc.id, req.user.id]
        );
        workloadActivityId = syncResult.rows[0]?.activity_id;
      } catch (syncError) {
        console.error('Error syncing NC to workload:', syncError);
      }
    }

    res.json({
      success: true,
      nonConformity: transformToCamelCase(nc),
      workloadActivityId
    });
  } catch (error) {
    console.error('Error updating NC:', error);
    res.status(500).json({ success: false, message: 'Error updating NC' });
  }
});

// POST /audit/ncs/:id/verify - Verify NC effectiveness
router.post('/ncs/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { verificationResult, verificationEvidence } = req.body;

  try {
    const newStatus = verificationResult === 'effective' ? 'closed' : 'open';

    const result = await query(`
      UPDATE audit_non_conformities SET
        verification_date = CURRENT_DATE,
        verification_result = $1,
        verification_evidence = $2,
        verified_by = $3,
        status = $4
      WHERE id = $5
      RETURNING *
    `, [verificationResult, verificationEvidence, req.user.id, newStatus, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NC not found' });
    }

    // Check if all NCs are closed for the audit
    const audit = result.rows[0];
    if (newStatus === 'closed') {
      const openNCs = await query(
        'SELECT COUNT(*) FROM audit_non_conformities WHERE audit_id = $1 AND status != $2',
        [audit.audit_id, 'closed']
      );

      if (parseInt(openNCs.rows[0].count) === 0) {
        await query("UPDATE audits SET status = 'closed' WHERE id = $1", [audit.audit_id]);
      }
    }

    res.json({
      success: true,
      nonConformity: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error verifying NC:', error);
    res.status(500).json({ success: false, message: 'Error verifying NC' });
  }
});

// POST /audit/ncs/:id/link-8d - Link to existing 8D
router.post('/ncs/:id/link-8d', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { eightdId } = req.body;

  try {
    const result = await query(`
      UPDATE audit_non_conformities SET linked_8d_id = $1 WHERE id = $2 RETURNING *
    `, [eightdId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NC not found' });
    }

    res.json({
      success: true,
      nonConformity: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error linking 8D:', error);
    res.status(500).json({ success: false, message: 'Error linking 8D' });
  }
});

// ============================================================================
// EVIDENCE UPLOAD ENDPOINTS
// ============================================================================

// POST /audit/findings/:id/evidence - Add evidence to finding
router.post('/findings/:id/evidence', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { evidence } = req.body;
  // evidence: { fileName, fileUrl, fileType, isPhoto, capturedAt }

  try {
    const findingResult = await query('SELECT evidence_files FROM audit_findings WHERE id = $1', [id]);
    if (findingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Finding not found' });
    }

    const existingFiles = findingResult.rows[0].evidence_files || [];
    const newEvidence = {
      id: Date.now().toString(),
      ...evidence,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    const updatedFiles = [...existingFiles, newEvidence];

    const result = await query(`
      UPDATE audit_findings SET evidence_files = $1 WHERE id = $2 RETURNING *
    `, [JSON.stringify(updatedFiles), id]);

    res.json({
      success: true,
      finding: transformToCamelCase(result.rows[0]),
      evidence: newEvidence
    });
  } catch (error) {
    console.error('Error adding evidence to finding:', error);
    res.status(500).json({ success: false, message: 'Error adding evidence' });
  }
});

// DELETE /audit/findings/:id/evidence/:evidenceId - Remove evidence from finding
router.delete('/findings/:id/evidence/:evidenceId', authenticateToken, async (req, res) => {
  const { id, evidenceId } = req.params;

  try {
    const findingResult = await query('SELECT evidence_files FROM audit_findings WHERE id = $1', [id]);
    if (findingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Finding not found' });
    }

    const existingFiles = findingResult.rows[0].evidence_files || [];
    const updatedFiles = existingFiles.filter(f => f.id !== evidenceId);

    const result = await query(`
      UPDATE audit_findings SET evidence_files = $1 WHERE id = $2 RETURNING *
    `, [JSON.stringify(updatedFiles), id]);

    res.json({
      success: true,
      finding: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error removing evidence from finding:', error);
    res.status(500).json({ success: false, message: 'Error removing evidence' });
  }
});

// POST /audit/ncs/:id/evidence - Add evidence to NC
router.post('/ncs/:id/evidence', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { evidence } = req.body;

  try {
    const ncResult = await query('SELECT evidence_files FROM audit_non_conformities WHERE id = $1', [id]);
    if (ncResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NC not found' });
    }

    const existingFiles = ncResult.rows[0].evidence_files || [];
    const newEvidence = {
      id: Date.now().toString(),
      ...evidence,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    const updatedFiles = [...existingFiles, newEvidence];

    const result = await query(`
      UPDATE audit_non_conformities SET evidence_files = $1 WHERE id = $2 RETURNING *
    `, [JSON.stringify(updatedFiles), id]);

    res.json({
      success: true,
      nonConformity: transformToCamelCase(result.rows[0]),
      evidence: newEvidence
    });
  } catch (error) {
    console.error('Error adding evidence to NC:', error);
    res.status(500).json({ success: false, message: 'Error adding evidence' });
  }
});

// DELETE /audit/ncs/:id/evidence/:evidenceId - Remove evidence from NC
router.delete('/ncs/:id/evidence/:evidenceId', authenticateToken, async (req, res) => {
  const { id, evidenceId } = req.params;

  try {
    const ncResult = await query('SELECT evidence_files FROM audit_non_conformities WHERE id = $1', [id]);
    if (ncResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NC not found' });
    }

    const existingFiles = ncResult.rows[0].evidence_files || [];
    const updatedFiles = existingFiles.filter(f => f.id !== evidenceId);

    const result = await query(`
      UPDATE audit_non_conformities SET evidence_files = $1 WHERE id = $2 RETURNING *
    `, [JSON.stringify(updatedFiles), id]);

    res.json({
      success: true,
      nonConformity: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error removing evidence from NC:', error);
    res.status(500).json({ success: false, message: 'Error removing evidence' });
  }
});

// ============================================================================
// AUDITORS ENDPOINTS (Simplified - uses users table)
// ============================================================================

// GET /audit/auditors - List auditors (manual + role-based)
router.get('/auditors', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT
        u.id, u.first_name, u.last_name, u.email, u.department, u.role,
        u.is_auditor, u.auditor_areas, u.auditor_certifications,
        CASE WHEN u.is_auditor = true THEN false
             ELSE true END as from_role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.is_auditor = true
         OR r.name = 'Auditor'
      ORDER BY u.first_name, u.last_name
    `);

    res.json({
      success: true,
      auditors: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching auditors:', error);
    res.status(500).json({ success: false, message: 'Error fetching auditors' });
  }
});

// GET /audit/auditors/available - Get available auditors
router.get('/auditors/available', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id, first_name, last_name, email, department, role,
        is_auditor, auditor_areas, auditor_certifications
      FROM users
      WHERE is_auditor = true AND (availability = 'available' OR availability IS NULL)
      ORDER BY first_name, last_name
    `);

    res.json({
      success: true,
      auditors: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching available auditors:', error);
    res.status(500).json({ success: false, message: 'Error fetching auditors' });
  }
});

// PUT /audit/auditors/:userId - Update auditor fields
router.put('/auditors/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { isAuditor, auditorAreas, auditorCertifications } = req.body;

  try {
    const result = await query(`
      UPDATE users SET
        is_auditor = COALESCE($1, is_auditor),
        auditor_areas = COALESCE($2, auditor_areas),
        auditor_certifications = COALESCE($3, auditor_certifications)
      WHERE id = $4
      RETURNING id, first_name, last_name, email, is_auditor, auditor_areas, auditor_certifications
    `, [isAuditor, auditorAreas, auditorCertifications, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      auditor: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating auditor:', error);
    res.status(500).json({ success: false, message: 'Error updating auditor' });
  }
});

// GET /audit/auditors/matrix - Auditor matrix
router.get('/auditors/matrix', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        first_name || ' ' || last_name as name,
        department,
        auditor_areas,
        auditor_certifications
      FROM users
      WHERE is_auditor = true
      ORDER BY first_name, last_name
    `);

    // Build matrix structure
    const areas = ['proceso', 'sistema', 'producto', 'proveedor'];
    const certifications = ['ISO 9001', 'IATF 16949', 'VDA 6.3', 'ISO 14001', 'ISO 45001'];

    const matrix = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      department: row.department,
      areas: areas.map(area => ({
        area,
        qualified: (row.auditor_areas || []).includes(area)
      })),
      certifications: certifications.map(cert => ({
        certification: cert,
        has: (row.auditor_certifications || []).includes(cert)
      }))
    }));

    res.json({
      success: true,
      matrix,
      availableAreas: areas,
      availableCertifications: certifications
    });
  } catch (error) {
    console.error('Error fetching auditor matrix:', error);
    res.status(500).json({ success: false, message: 'Error fetching matrix' });
  }
});

// ============================================================================
// ECR SEARCH FOR LINKING
// ============================================================================

// GET /audit/search-ecr - Search ECRs for linking
router.get('/search-ecr', authenticateToken, async (req, res) => {
  const { search } = req.query;

  try {
    let sql = `
      SELECT id, ecr_number, title, status, created_at
      FROM ecr_reports
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (ecr_number ILIKE $${params.length} OR title ILIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await query(sql, params);

    res.json({
      success: true,
      ecrs: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error searching ECRs:', error);
    res.status(500).json({ success: false, message: 'Error searching ECRs' });
  }
});

// GET /audit/ecr/:ecrId/summary - Get ECR summary
router.get('/ecr/:ecrId/summary', authenticateToken, async (req, res) => {
  const { ecrId } = req.params;

  try {
    const result = await query(`
      SELECT id, ecr_number, title, description, status,
             change_type, priority, created_at
      FROM ecr_reports WHERE id = $1
    `, [ecrId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ECR not found' });
    }

    res.json({
      success: true,
      ecr: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching ECR summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching ECR' });
  }
});

// ============================================================================
// DASHBOARD / KPIs ENDPOINTS
// ============================================================================

// GET /audit/dashboard - Dashboard KPIs
router.get('/dashboard', authenticateToken, async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  try {
    // Programs stats
    const programsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' OR status = 'in_progress' OR status = 'completed' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM audit_programs WHERE year = $1
    `, [targetYear]);

    // Schedules stats
    const schedulesResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN s.status = 'planned' THEN 1 END) as planned,
        COUNT(CASE WHEN s.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN s.status = 'postponed' THEN 1 END) as postponed
      FROM audit_schedules s
      JOIN audit_programs p ON s.program_id = p.id
      WHERE p.year = $1
    `, [targetYear]);

    // NC stats
    const ncsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN nc.status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN nc.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN nc.status = 'pending_verification' THEN 1 END) as pending_verification,
        COUNT(CASE WHEN nc.status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN nc.nc_type = 'major' THEN 1 END) as major,
        COUNT(CASE WHEN nc.nc_type = 'minor' THEN 1 END) as minor
      FROM audit_non_conformities nc
      JOIN audits a ON nc.audit_id = a.id
      WHERE EXTRACT(YEAR FROM a.audit_date) = $1
    `, [targetYear]);

    // Average closure time
    const avgClosureResult = await query(`
      SELECT AVG(EXTRACT(DAY FROM (
        CASE WHEN status = 'closed' THEN updated_at ELSE CURRENT_TIMESTAMP END
      ) - created_at)) as avg_days
      FROM audit_non_conformities
      WHERE status = 'closed'
    `);

    // Compliance rate
    const schedules = schedulesResult.rows[0];
    const complianceRate = schedules.total > 0
      ? ((parseInt(schedules.completed) / parseInt(schedules.total)) * 100).toFixed(1)
      : 0;

    // NCs by area
    const ncsByAreaResult = await query(`
      SELECT
        a.area_process,
        COUNT(*) as count,
        COUNT(CASE WHEN nc.nc_type = 'major' THEN 1 END) as major,
        COUNT(CASE WHEN nc.nc_type = 'minor' THEN 1 END) as minor
      FROM audit_non_conformities nc
      JOIN audits a ON nc.audit_id = a.id
      WHERE EXTRACT(YEAR FROM a.audit_date) = $1
      GROUP BY a.area_process
      ORDER BY count DESC
      LIMIT 10
    `, [targetYear]);

    // Monthly trend
    const monthlyTrendResult = await query(`
      SELECT
        TO_CHAR(a.audit_date, 'YYYY-MM') as month,
        COUNT(DISTINCT a.id) as audits,
        COUNT(nc.id) as ncs,
        AVG(a.score_percentage) as avg_score
      FROM audits a
      LEFT JOIN audit_non_conformities nc ON nc.audit_id = a.id
      WHERE EXTRACT(YEAR FROM a.audit_date) = $1
      GROUP BY TO_CHAR(a.audit_date, 'YYYY-MM')
      ORDER BY month
    `, [targetYear]);

    // Upcoming audits
    const upcomingResult = await query(`
      SELECT
        s.id, s.audit_number, s.audit_name, s.area_process,
        s.planned_start_date, s.planned_end_date,
        u.first_name || ' ' || u.last_name as lead_auditor_name
      FROM audit_schedules s
      LEFT JOIN users u ON s.lead_auditor_id = u.id
      WHERE s.status = 'planned' AND s.planned_start_date >= CURRENT_DATE
      ORDER BY s.planned_start_date
      LIMIT 5
    `);

    // Overdue NCs
    const overdueNcsResult = await query(`
      SELECT
        nc.id, nc.nc_number, nc.nc_type, nc.description, nc.due_date,
        a.audit_number, a.area_process,
        u.first_name || ' ' || u.last_name as responsible_name
      FROM audit_non_conformities nc
      JOIN audits a ON nc.audit_id = a.id
      LEFT JOIN users u ON nc.responsible_id = u.id
      WHERE nc.status NOT IN ('closed') AND nc.due_date < CURRENT_DATE
      ORDER BY nc.due_date
      LIMIT 10
    `);

    res.json({
      success: true,
      year: targetYear,
      programs: transformToCamelCase(programsResult.rows[0]),
      schedules: transformToCamelCase(schedulesResult.rows[0]),
      nonConformities: transformToCamelCase(ncsResult.rows[0]),
      averageClosureDays: parseFloat(avgClosureResult.rows[0].avg_days) || 0,
      complianceRate: parseFloat(complianceRate),
      ncsByArea: transformToCamelCase(ncsByAreaResult.rows),
      monthlyTrend: transformToCamelCase(monthlyTrendResult.rows),
      upcomingAudits: transformToCamelCase(upcomingResult.rows),
      overdueNcs: transformToCamelCase(overdueNcsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
});

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================

// GET /audit/reports/:auditId/pdf - Generate PDF (placeholder)
router.get('/reports/:auditId/pdf', authenticateToken, async (req, res) => {
  const { auditId } = req.params;

  try {
    // For now, return audit data for PDF generation on frontend
    const auditResult = await query(`
      SELECT
        a.*,
        s.audit_name, s.area_process, s.department,
        p.name as program_name, p.year as program_year,
        u.first_name || ' ' || u.last_name as lead_auditor_name
      FROM audits a
      LEFT JOIN audit_schedules s ON a.schedule_id = s.id
      LEFT JOIN audit_programs p ON s.program_id = p.id
      LEFT JOIN users u ON a.lead_auditor_id = u.id
      WHERE a.id = $1
    `, [auditId]);

    if (auditResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    const findingsResult = await query(`
      SELECT f.*, ci.clause, ci.question, ci.category
      FROM audit_findings f
      LEFT JOIN audit_checklist_items ci ON f.checklist_item_id = ci.id
      WHERE f.audit_id = $1
      ORDER BY ci.item_order
    `, [auditId]);

    const ncsResult = await query(`
      SELECT nc.*, u.first_name || ' ' || u.last_name as responsible_name
      FROM audit_non_conformities nc
      LEFT JOIN users u ON nc.responsible_id = u.id
      WHERE nc.audit_id = $1
    `, [auditId]);

    res.json({
      success: true,
      audit: transformToCamelCase(auditResult.rows[0]),
      findings: transformToCamelCase(findingsResult.rows),
      nonConformities: transformToCamelCase(ncsResult.rows)
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Error generating report' });
  }
});

// GET /audit/reports/history/:areaProcess - History by area
router.get('/reports/history/:areaProcess', authenticateToken, async (req, res) => {
  const { areaProcess } = req.params;

  try {
    const result = await query(`
      SELECT
        a.id, a.audit_number, a.audit_date, a.score_percentage,
        a.conformities, a.non_conformities_major, a.non_conformities_minor,
        a.observations, a.opportunities, a.status,
        s.audit_name,
        u.first_name || ' ' || u.last_name as lead_auditor_name
      FROM audits a
      JOIN audit_schedules s ON a.schedule_id = s.id
      LEFT JOIN users u ON a.lead_auditor_id = u.id
      WHERE s.area_process ILIKE $1
      ORDER BY a.audit_date DESC
      LIMIT 20
    `, [`%${areaProcess}%`]);

    res.json({
      success: true,
      history: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, message: 'Error fetching history' });
  }
});

// ============================================================================
// AUDIT REQUESTS (8D & ECR Items for Auditor Validation)
// ============================================================================

// GET /audit/requests - List all audit requests with scorecard data
router.get('/requests', authenticateToken, async (req, res) => {
  const { sourceType, status } = req.query;

  try {
    // Get unique source combinations with scorecard data
    let sql = `
      WITH report_data AS (
        SELECT
          ar.source_type,
          ar.source_id,
          MAX(ar.source_number) as source_number,
          MIN(ar.created_at) as created_at,
          -- 8D Report info
          MAX(r.report_id) as report_id,
          MAX(r.title) as report_title,
          MAX(r.severity) as severity,
          MAX(r.issue_date) as issue_date,
          EXTRACT(DAY FROM NOW() - MIN(r.created_at))::integer as days_open,
          -- Client & Project (from first part)
          (SELECT c.name FROM eightd_parts p
           LEFT JOIN clients c ON p.client_id = c.id
           WHERE p.report_id = ar.source_id LIMIT 1) as client_name,
          (SELECT p.project_number FROM eightd_parts p
           WHERE p.report_id = ar.source_id LIMIT 1) as project_number
        FROM audit_requests ar
        LEFT JOIN eightd_reports r ON ar.source_id = r.id AND ar.source_type = '8D'
        WHERE 1=1
        ${sourceType ? `AND ar.source_type = $1` : ''}
        GROUP BY ar.source_type, ar.source_id
      ),
      checklist_stats AS (
        SELECT
          dv.report_id as source_id,
          COUNT(dai.id) as total_items,
          COUNT(CASE WHEN dai.auditor_completed = true THEN 1 END) as completed_items,
          COUNT(CASE WHEN dai.auditor_judgment = 'OK' THEN 1 END) as ok_items,
          COUNT(CASE WHEN dai.auditor_judgment = 'NOK' THEN 1 END) as nok_items,
          COUNT(CASE WHEN dai.auditor_judgment = 'OBS' THEN 1 END) as obs_items,
          COUNT(CASE WHEN dai.due_date < CURRENT_DATE AND dai.auditor_completed != true THEN 1 END) as overdue_items,
          MIN(CASE WHEN dai.auditor_completed != true AND dai.due_date IS NOT NULL THEN dai.due_date END) as next_due_date,
          -- Total rejections (re-audits from history)
          (SELECT COUNT(*) FROM d7_audit_history dah
           WHERE dah.d7_audit_item_id IN (SELECT di2.id FROM d7_audit_items di2 WHERE di2.d7_validation_id = dv.id)
          ) as total_rejections,
          -- Unique auditors assigned
          (SELECT json_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name))
           FROM d7_audit_items di
           LEFT JOIN users u ON u.id = ANY(di.assigned_auditors)
           WHERE di.d7_validation_id = dv.id AND u.id IS NOT NULL) as assigned_auditors,
          -- Auditors who have responded
          (SELECT json_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name))
           FROM d7_audit_items di
           LEFT JOIN users u ON di.audited_by = u.id
           WHERE di.d7_validation_id = dv.id AND di.audited_by IS NOT NULL) as responded_auditors
        FROM d7_validations dv
        LEFT JOIN d7_audit_items dai ON dai.d7_validation_id = dv.id
        GROUP BY dv.id, dv.report_id
      )
      SELECT
        rd.*,
        COALESCE(cs.total_items, 0) as total_items,
        COALESCE(cs.completed_items, 0) as completed_items,
        COALESCE(cs.ok_items, 0) as ok_items,
        COALESCE(cs.nok_items, 0) as nok_items,
        COALESCE(cs.obs_items, 0) as obs_items,
        COALESCE(cs.overdue_items, 0) as overdue_items,
        COALESCE(cs.total_rejections, 0) as total_rejections,
        cs.next_due_date,
        cs.assigned_auditors,
        cs.responded_auditors
      FROM report_data rd
      LEFT JOIN checklist_stats cs ON cs.source_id = rd.source_id
      ORDER BY rd.created_at DESC
    `;

    const params = sourceType ? [sourceType] : [];
    const result = await query(sql, params);

    res.json({
      success: true,
      requests: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching audit requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
});

// POST /audit/requests - Create audit request(s)
router.post('/requests', authenticateToken, async (req, res) => {
  const { sourceType, sourceId, sourceNumber, items } = req.body;
  const userId = req.user.id;

  try {
    const createdIds = [];

    for (const item of items) {
      const result = await query(`
        INSERT INTO audit_requests (
          source_type, source_id, source_number,
          item_name, item_comments, original_judgment,
          check_item, due_date, assigned_auditors, d7_audit_item_id, ecr_closure_audit_item_id,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        sourceType,
        sourceId,
        sourceNumber,
        item.name,
        item.comments || '',
        item.judgment || '',
        item.checkItem || '',
        item.dueDate || null,
        item.assignedAuditors || [],
        item.d7AuditItemId || null,
        item.ecrClosureAuditItemId || null,
        userId
      ]);

      const requestId = result.rows[0].id;
      createdIds.push(requestId);

      // Update d7_audit_items with sent_to_audit flag and audit_request_id
      if (item.d7AuditItemId) {
        await query(`
          UPDATE d7_audit_items SET
            sent_to_audit = true,
            audit_request_id = $1
          WHERE id = $2
        `, [requestId, item.d7AuditItemId]);
      }

      // Update ecr_closure_audit_items with sent_to_audit flag and audit_request_id
      if (item.ecrClosureAuditItemId) {
        await query(`
          UPDATE ecr_closure_audit_items SET
            sent_to_audit = true,
            audit_request_id = $1
          WHERE id = $2
        `, [requestId, item.ecrClosureAuditItemId]);
      }
    }

    res.json({
      success: true,
      message: `${createdIds.length} solicitud(es) de auditoría creada(s)`,
      ids: createdIds
    });
  } catch (error) {
    console.error('Error creating audit request:', error);
    res.status(500).json({ success: false, message: 'Error creating request' });
  }
});

// GET /audit/requests/summary - Get summary counts (MUST be before :id routes)
router.get('/requests/summary', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        source_type,
        audit_status,
        COUNT(*) as count
      FROM audit_requests
      GROUP BY source_type, audit_status
    `);

    const summary = {
      '8D': { pending: 0, OK: 0, NOK: 0, rejected: 0, total: 0 },
      'ECR': { pending: 0, OK: 0, NOK: 0, rejected: 0, total: 0 }
    };

    result.rows.forEach(row => {
      if (summary[row.source_type]) {
        summary[row.source_type][row.audit_status] = parseInt(row.count);
        summary[row.source_type].total += parseInt(row.count);
      }
    });

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching summary' });
  }
});

// PUT /audit/requests/:id - Update audit request (validation)
router.put('/requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { auditStatus, auditJudgment, auditFindings, auditorCompleted } = req.body;
  const userId = req.user.id;

  try {
    // Get auditor name
    const userResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const auditorName = userResult.rows[0]
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
      : 'Unknown';

    const result = await query(`
      UPDATE audit_requests SET
        audit_status = COALESCE($1, audit_status),
        audit_judgment = COALESCE($2, audit_judgment),
        audit_findings = COALESCE($3, audit_findings),
        auditor_id = $4,
        auditor_name = $5,
        audited_at = CASE WHEN $1 IS NOT NULL AND $1 != 'pending' THEN CURRENT_TIMESTAMP ELSE audited_at END,
        auditor_completed = COALESCE($7, auditor_completed),
        verification_date = CASE WHEN $7 = true THEN CURRENT_TIMESTAMP ELSE verification_date END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [auditStatus, auditJudgment, auditFindings, userId, auditorName, id, auditorCompleted]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const updatedRequest = result.rows[0];

    // Sync back to d7_audit_items if linked
    if (updatedRequest.d7_audit_item_id) {
      await query(`
        UPDATE d7_audit_items SET
          auditor_comments = $1,
          auditor_judgment = $2,
          auditor_completed = $3,
          verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END,
          audited_by = $4
        WHERE id = $5
      `, [
        auditFindings || updatedRequest.audit_findings,
        auditStatus || updatedRequest.audit_status,
        auditorCompleted || updatedRequest.auditor_completed,
        userId,
        updatedRequest.d7_audit_item_id
      ]);
    }

    // Sync back to ecr_closure_audit_items if linked
    if (updatedRequest.ecr_closure_audit_item_id) {
      await query(`
        UPDATE ecr_closure_audit_items SET
          auditor_comments = $1,
          auditor_judgment = $2,
          auditor_completed = $3,
          verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END,
          audited_by = $4,
          audited_by_name = $5
        WHERE id = $6
      `, [
        auditFindings || updatedRequest.audit_findings,
        auditJudgment || updatedRequest.audit_judgment,
        auditorCompleted || updatedRequest.auditor_completed,
        userId,
        auditorName,
        updatedRequest.ecr_closure_audit_item_id
      ]);
    }

    res.json({
      success: true,
      request: transformToCamelCase(updatedRequest)
    });
  } catch (error) {
    console.error('Error updating audit request:', error);
    res.status(500).json({ success: false, message: 'Error updating request' });
  }
});

// POST /audit/requests/:id/evidence - Upload evidence file
router.post('/requests/:id/evidence', authenticateToken, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const result = await query(`
      INSERT INTO audit_request_files (
        audit_request_id, file_name, file_url, file_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, req.file.originalname, fileUrl, req.file.mimetype, userId]);

    res.json({
      success: true,
      file: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ success: false, message: 'Error uploading file' });
  }
});

// DELETE /audit/requests/:id/evidence/:fileId - Delete evidence file
router.delete('/requests/:id/evidence/:fileId', authenticateToken, async (req, res) => {
  const { fileId } = req.params;

  try {
    await query('DELETE FROM audit_request_files WHERE id = $1', [fileId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ success: false, message: 'Error deleting file' });
  }
});

// ============================================================================
// D7 CHECKLIST DIRECT ACCESS FOR AUDITORS
// ============================================================================

// GET /audit/d7-checklist/:reportId - Get D7 checklist items for a report
router.get('/d7-checklist/:reportId', authenticateToken, async (req, res) => {
  const { reportId } = req.params;

  try {
    // First get the validation ID
    const validationResult = await query(
      'SELECT id FROM d7_validations WHERE report_id = $1',
      [reportId]
    );

    if (validationResult.rows.length === 0) {
      return res.json({ success: true, items: [], reportInfo: null });
    }

    const validationId = validationResult.rows[0].id;

    // Get report info with client and project details
    const reportResult = await query(`
      SELECT
        r.report_id,
        r.title,
        r.description,
        r.severity,
        r.issue_date,
        r.created_at,
        EXTRACT(DAY FROM NOW() - r.created_at)::integer as days_open,
        (
          SELECT json_agg(json_build_object(
            'clientName', c.name,
            'projectNumber', p.project_number
          ))
          FROM eightd_parts p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.report_id = r.id
          LIMIT 1
        ) as parts_info
      FROM eightd_reports r
      WHERE r.id = $1
    `, [reportId]);

    // Get all audit items with auditor info
    const itemsResult = await query(`
      SELECT
        ai.*,
        (
          SELECT json_agg(json_build_object('id', au.id, 'name', au.first_name || ' ' || au.last_name, 'email', au.email))
          FROM users au
          WHERE au.id = ANY(ai.assigned_auditors)
        ) as assigned_auditors_info,
        audited_user.first_name || ' ' || audited_user.last_name as audited_by_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', aif.id,
            'fileName', aif.file_name,
            'fileUrl', aif.file_url
          )) FROM d7_audit_item_files aif WHERE aif.d7_audit_item_id = ai.id),
          '[]'
        ) as files
      FROM d7_audit_items ai
      LEFT JOIN users audited_user ON ai.audited_by = audited_user.id
      WHERE ai.d7_validation_id = $1
      ORDER BY ai.display_order, ai.item_name
    `, [validationId]);

    res.json({
      success: true,
      reportInfo: reportResult.rows[0] ? transformToCamelCase(reportResult.rows[0]) : null,
      items: transformToCamelCase(itemsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching D7 checklist:', error);
    res.status(500).json({ success: false, message: 'Error fetching checklist' });
  }
});

// PUT /audit/d7-checklist/item/:itemId - Auditor updates a single item
router.put('/d7-checklist/item/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const { auditorComments, auditorJudgment, auditorCompleted } = req.body;
  const userId = req.user.id;

  try {
    const result = await query(`
      UPDATE d7_audit_items SET
        auditor_comments = COALESCE($1, auditor_comments),
        auditor_judgment = COALESCE($2, auditor_judgment),
        auditor_completed = COALESCE($3, auditor_completed),
        audited_by = $4,
        verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [auditorComments, auditorJudgment, auditorCompleted, userId, itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Get auditor name for response
    const userResult = await query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const auditorName = userResult.rows[0]
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
      : 'Unknown';

    res.json({
      success: true,
      item: {
        ...transformToCamelCase(result.rows[0]),
        auditedByName: auditorName
      }
    });
  } catch (error) {
    console.error('Error updating audit item:', error);
    res.status(500).json({ success: false, message: 'Error updating item' });
  }
});

// PUT /audit/d7-checklist/items - Auditor updates multiple items (save progress)
router.put('/d7-checklist/items', authenticateToken, async (req, res) => {
  const { items } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is Admin (can edit any item without being assigned)
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    const updatedItems = [];
    const skippedItems = [];

    for (const item of items) {
      if (!item.id || item.id <= 0) continue; // Skip items without valid DB id

      let result;
      if (isAdmin) {
        // Admin can update any item without being assigned
        result = await query(`
          UPDATE d7_audit_items SET
            auditor_comments = COALESCE($1, auditor_comments),
            auditor_judgment = COALESCE($2, auditor_judgment),
            auditor_completed = COALESCE($3, auditor_completed),
            audited_by = CASE WHEN $1 IS NOT NULL OR $2 IS NOT NULL THEN $4 ELSE audited_by END,
            verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING id
        `, [
          item.auditorComments || null,
          item.auditorJudgment || null,
          item.auditorCompleted || false,
          userId,
          item.id
        ]);
      } else {
        // Regular users must be assigned auditors
        result = await query(`
          UPDATE d7_audit_items SET
            auditor_comments = COALESCE($1, auditor_comments),
            auditor_judgment = COALESCE($2, auditor_judgment),
            auditor_completed = COALESCE($3, auditor_completed),
            audited_by = CASE WHEN $1 IS NOT NULL OR $2 IS NOT NULL THEN $4 ELSE audited_by END,
            verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
            AND $4 = ANY(assigned_auditors)
          RETURNING id
        `, [
          item.auditorComments || null,
          item.auditorJudgment || null,
          item.auditorCompleted || false,
          userId,
          item.id
        ]);
      }

      if (result.rows.length > 0) {
        updatedItems.push(result.rows[0].id);
      } else {
        skippedItems.push(item.id);
      }
    }

    res.json({
      success: true,
      message: `${updatedItems.length} item(s) actualizado(s)${skippedItems.length > 0 ? ` (${skippedItems.length} omitido(s) - no eres auditor asignado)` : ''}`,
      updatedIds: updatedItems,
      skippedIds: skippedItems
    });
  } catch (error) {
    console.error('Error updating audit items:', error);
    res.status(500).json({ success: false, message: 'Error updating items' });
  }
});

// ============================================================================
// AUDIT ROUNDS & HISTORY (ISO Compliance)
// ============================================================================

// POST /audit/d7-item/:itemId/resend - Re-send item to audit (increment round)
router.post('/d7-item/:itemId/resend', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const { closureNotes } = req.body;
  const userId = req.user.id;

  try {
    // Get current item data with report info and auditors
    const itemResult = await query(`
      SELECT
        ai.*,
        dv.report_id,
        r.report_id as report_number,
        r.title as report_title
      FROM d7_audit_items ai
      JOIN d7_validations dv ON ai.d7_validation_id = dv.id
      JOIN eightd_reports r ON dv.report_id = r.id
      WHERE ai.id = $1
    `, [itemId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = itemResult.rows[0];
    const currentRound = item.audit_round || 1;
    const newRound = currentRound + 1;

    // Save current state to history before resetting
    await query(`
      INSERT INTO d7_audit_history (
        d7_audit_item_id, audit_round,
        auditor_judgment, auditor_comments, audited_by, verification_date,
        check_item, leader_comments, due_date,
        closed_at, closed_by, closure_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11)
    `, [
      itemId,
      currentRound,
      item.auditor_judgment,
      item.auditor_comments,
      item.audited_by,
      item.verification_date,
      item.check_item,
      item.comments,
      item.due_date,
      userId,
      closureNotes || 'Re-enviado a auditoría'
    ]);

    // Reset auditor fields and increment round
    const updateResult = await query(`
      UPDATE d7_audit_items SET
        audit_round = $1,
        auditor_judgment = NULL,
        auditor_comments = NULL,
        auditor_completed = false,
        audited_by = NULL,
        verification_date = NULL,
        sent_to_audit = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [newRound, itemId]);

    // Get assigned auditors emails
    if (item.assigned_auditors && item.assigned_auditors.length > 0) {
      const auditorsResult = await query(
        'SELECT email, first_name, last_name FROM users WHERE id = ANY($1)',
        [item.assigned_auditors]
      );

      // Send email notifications to all assigned auditors
      for (const auditor of auditorsResult.rows) {
        try {
          await sendAuditNotification({
            to: auditor.email,
            subject: `[RE-ENVIADO] Auditoría D7 - ${item.report_number}`,
            reportId: item.report_number,
            reportTitle: item.report_title,
            itemName: item.item_name,
            checkItem: item.check_item,
            dueDate: item.due_date,
            round: newRound,
            isResend: true
          });
          console.log(`Email sent to auditor: ${auditor.email}`);
        } catch (emailError) {
          console.error(`Error sending email to ${auditor.email}:`, emailError);
        }
      }
    }

    res.json({
      success: true,
      message: `Item re-enviado a auditoría (Ronda ${newRound})`,
      item: transformToCamelCase(updateResult.rows[0]),
      previousRound: currentRound,
      newRound: newRound,
      emailsSent: item.assigned_auditors?.length || 0
    });
  } catch (error) {
    console.error('Error resending item to audit:', error);
    res.status(500).json({ success: false, message: 'Error al re-enviar a auditoría' });
  }
});

// GET /audit/d7-item/:itemId/history - Get audit history for an item
router.get('/d7-item/:itemId/history', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    const result = await query(`
      SELECT
        h.*,
        u.first_name || ' ' || u.last_name as auditor_name,
        closer.first_name || ' ' || closer.last_name as closed_by_name
      FROM d7_audit_history h
      LEFT JOIN users u ON h.audited_by = u.id
      LEFT JOIN users closer ON h.closed_by = closer.id
      WHERE h.d7_audit_item_id = $1
      ORDER BY h.audit_round DESC
    `, [itemId]);

    // Also get current round info
    const currentResult = await query(`
      SELECT
        dai.*,
        u.first_name || ' ' || u.last_name as auditor_name
      FROM d7_audit_items dai
      LEFT JOIN users u ON dai.audited_by = u.id
      WHERE dai.id = $1
    `, [itemId]);

    res.json({
      success: true,
      history: transformToCamelCase(result.rows),
      currentRound: currentResult.rows[0] ? transformToCamelCase(currentResult.rows[0]) : null
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial' });
  }
});

module.exports = router;
