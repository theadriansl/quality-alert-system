const express = require('express');
const router = express.Router();
const { query, pool } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// MULTER CONFIGURATION FOR ACTIVITY EVIDENCE
// ============================================================================

const evidenceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/activity-evidence');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, sanitized + '-' + uniqueSuffix + ext);
  }
});

const evidenceFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Permitidos: PDF, Word, Excel, Imágenes, Texto, CSV'), false);
  }
};

const evidenceUpload = multer({
  storage: evidenceStorage,
  fileFilter: evidenceFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  }
});

// ============================================================================
// KPIs ENDPOINTS
// ============================================================================

// Get all KPIs
router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM workload_kpis WHERE is_active = true ORDER BY code'
    );
    res.json({ success: true, kpis: result.rows });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ success: false, message: 'Error fetching KPIs' });
  }
});

// Create/Update KPI
router.post('/kpis', authenticateToken, async (req, res) => {
  const { id, code, name, description, color, icon, weight } = req.body;

  try {
    let result;
    if (id) {
      result = await query(
        `UPDATE workload_kpis
         SET code = $1, name = $2, description = $3, color = $4, icon = $5, weight = $6
         WHERE id = $7 RETURNING *`,
        [code, name, description, color, icon, weight, id]
      );
    } else {
      result = await query(
        `INSERT INTO workload_kpis (code, name, description, color, icon, weight)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [code, name, description, color, icon, weight || 1]
      );
    }
    res.json({ success: true, kpi: result.rows[0] });
  } catch (error) {
    console.error('Error saving KPI:', error);
    res.status(500).json({ success: false, message: 'Error saving KPI' });
  }
});

// ============================================================================
// PROJECTS ENDPOINTS
// ============================================================================

// Get all projects
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*,
             u.first_name || ' ' || u.last_name as manager_name,
             (SELECT COUNT(*) FROM workload_activities WHERE project_id = p.id) as activity_count
      FROM workload_projects p
      LEFT JOIN users u ON p.manager_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, projects: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: 'Error fetching projects' });
  }
});

// Create/Update project
router.post('/projects', authenticateToken, async (req, res) => {
  const { id, name, description, client, status, start_date, end_date, manager_id, color } = req.body;

  try {
    let result;
    if (id) {
      result = await query(
        `UPDATE workload_projects
         SET name = $1, description = $2, client = $3, status = $4,
             start_date = $5, end_date = $6, manager_id = $7, color = $8
         WHERE id = $9 RETURNING *`,
        [name, description, client, status, start_date, end_date, manager_id, color, id]
      );
    } else {
      result = await query(
        `INSERT INTO workload_projects (name, description, client, status, start_date, end_date, manager_id, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, description, client, status || 'active', start_date, end_date, manager_id, color]
      );
    }
    res.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ success: false, message: 'Error saving project' });
  }
});

// Delete project
router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM workload_projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Error deleting project' });
  }
});

// ============================================================================
// USER CONFIG ENDPOINTS
// ============================================================================

// Get user config
router.get('/user-config/:userId', authenticateToken, async (req, res) => {
  try {
    let result = await query(
      'SELECT * FROM workload_user_config WHERE user_id = $1',
      [req.params.userId]
    );

    // If no config exists, create default
    if (result.rows.length === 0) {
      result = await query(
        `INSERT INTO workload_user_config (user_id) VALUES ($1) RETURNING *`,
        [req.params.userId]
      );
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user config:', error);
    res.status(500).json({ success: false, message: 'Error fetching user config' });
  }
});

// Update user config
router.put('/user-config/:userId', authenticateToken, async (req, res) => {
  const { hours_per_week, work_days, start_time, end_time, overtime_threshold, notes } = req.body;

  try {
    const result = await query(
      `INSERT INTO workload_user_config (user_id, hours_per_week, work_days, start_time, end_time, overtime_threshold, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         hours_per_week = EXCLUDED.hours_per_week,
         work_days = EXCLUDED.work_days,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         overtime_threshold = EXCLUDED.overtime_threshold,
         notes = EXCLUDED.notes
       RETURNING *`,
      [req.params.userId, hours_per_week, JSON.stringify(work_days), start_time, end_time, overtime_threshold, notes]
    );
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error updating user config:', error);
    res.status(500).json({ success: false, message: 'Error updating user config' });
  }
});

// ============================================================================
// RECURRING ACTIVITIES ENDPOINTS
// ============================================================================

// Get all recurring activities
router.get('/recurring', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*,
             k.code as kpi_code, k.name as kpi_name, k.color as kpi_color,
             p.name as project_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM workload_recurring_activities r
      LEFT JOIN workload_kpis k ON r.kpi_id = k.id
      LEFT JOIN workload_projects p ON r.project_id = p.id
      LEFT JOIN users u ON r.assigned_to = u.id
      ORDER BY r.name
    `);
    res.json({ success: true, recurring: result.rows });
  } catch (error) {
    console.error('Error fetching recurring activities:', error);
    res.status(500).json({ success: false, message: 'Error fetching recurring activities' });
  }
});

// Create/Update recurring activity
router.post('/recurring', authenticateToken, async (req, res) => {
  const {
    id, name, description, kpi_id, project_id, assigned_to,
    frequency, frequency_details, estimated_hours, priority, is_active
  } = req.body;

  try {
    let result;
    if (id) {
      result = await query(
        `UPDATE workload_recurring_activities
         SET name = $1, description = $2, kpi_id = $3, project_id = $4, assigned_to = $5,
             frequency = $6, frequency_details = $7, estimated_hours = $8, priority = $9, is_active = $10
         WHERE id = $11 RETURNING *`,
        [name, description, kpi_id, project_id, assigned_to, frequency,
         JSON.stringify(frequency_details), estimated_hours, priority, is_active, id]
      );
    } else {
      result = await query(
        `INSERT INTO workload_recurring_activities
         (name, description, kpi_id, project_id, assigned_to, frequency, frequency_details, estimated_hours, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [name, description, kpi_id, project_id, assigned_to, frequency,
         JSON.stringify(frequency_details), estimated_hours, priority || 'medium', req.user.id]
      );
    }
    res.json({ success: true, recurring: result.rows[0] });
  } catch (error) {
    console.error('Error saving recurring activity:', error);
    res.status(500).json({ success: false, message: 'Error saving recurring activity' });
  }
});

// Delete recurring activity
router.delete('/recurring/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM workload_recurring_activities WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring activity:', error);
    res.status(500).json({ success: false, message: 'Error deleting recurring activity' });
  }
});

// Generate activities from recurring templates
router.post('/recurring/generate', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.body;

    // Get all active recurring activities
    const recurring = await query(
      'SELECT * FROM workload_recurring_activities WHERE is_active = true'
    );

    let generated = 0;

    for (const template of recurring.rows) {
      // Generate activity based on frequency
      const result = await query(
        `INSERT INTO workload_activities
         (title, description, activity_type, kpi_id, project_id, recurring_id, assigned_to,
          start_date, end_date, estimated_hours, priority, created_by)
         VALUES ($1, $2, 'recurring', $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [template.name, template.description, template.kpi_id, template.project_id,
         template.id, template.assigned_to, start_date, end_date,
         template.estimated_hours, template.priority, req.user.id]
      );
      generated++;
    }

    res.json({ success: true, generated });
  } catch (error) {
    console.error('Error generating activities:', error);
    res.status(500).json({ success: false, message: 'Error generating activities' });
  }
});

// ============================================================================
// ACTIVITIES ENDPOINTS
// ============================================================================

// Get activities with filters
router.get('/activities', authenticateToken, async (req, res) => {
  const { user_id, project_id, kpi_id, status, start_date, end_date, type } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (user_id) {
      whereConditions.push(`a.assigned_to = $${paramIndex++}`);
      params.push(user_id);
    }
    if (project_id) {
      whereConditions.push(`a.project_id = $${paramIndex++}`);
      params.push(project_id);
    }
    if (kpi_id) {
      whereConditions.push(`a.kpi_id = $${paramIndex++}`);
      params.push(kpi_id);
    }
    if (status) {
      whereConditions.push(`a.status = $${paramIndex++}`);
      params.push(status);
    }
    if (type) {
      whereConditions.push(`a.activity_type = $${paramIndex++}`);
      params.push(type);
    }
    if (start_date) {
      whereConditions.push(`a.end_date >= $${paramIndex++}`);
      params.push(start_date);
    }
    if (end_date) {
      whereConditions.push(`a.start_date <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT a.*,
             k.code as kpi_code, k.name as kpi_name, k.color as kpi_color, k.icon as kpi_icon,
             p.name as project_name, p.color as project_color,
             u.first_name || ' ' || u.last_name as assigned_to_name,
             ab.first_name || ' ' || ab.last_name as assigned_by_name
      FROM workload_activities a
      LEFT JOIN workload_kpis k ON a.kpi_id = k.id
      LEFT JOIN workload_projects p ON a.project_id = p.id
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN users ab ON a.assigned_by = ab.id
      ${whereClause}
      ORDER BY a.start_date, a.priority DESC
    `, params);

    res.json({ success: true, activities: result.rows });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, message: 'Error fetching activities' });
  }
});

// Export activities for multiple users with date range
// GET /workload/activities/export?user_ids=1,2,3&start_date=X&end_date=Y
router.get('/activities/export', authenticateToken, async (req, res) => {
  const { user_ids, start_date, end_date } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (user_ids) {
      const ids = user_ids.split(',').map(id => parseInt(id)).filter(Boolean);
      if (ids.length > 0) {
        whereConditions.push(`a.assigned_to = ANY($${paramIndex++})`);
        params.push(ids);
      }
    }

    if (start_date) {
      whereConditions.push(`a.end_date >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push(`a.start_date <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT
        u.first_name || ' ' || u.last_name AS assigned_to_name,
        u.position,
        COALESCE(d.name, u.department) AS department,
        a.title,
        a.description,
        a.activity_type,
        k.name AS kpi_name,
        p.name AS project_name,
        p.client AS project_client,
        a.priority,
        a.status,
        a.start_date,
        a.end_date,
        a.estimated_hours,
        a.actual_hours,
        a.progress,
        ROUND((COALESCE(a.actual_hours,0) - COALESCE(a.estimated_hours,0))::numeric, 1) AS hours_diff,
        ab.first_name || ' ' || ab.last_name AS assigned_by_name,
        a.created_at
      FROM workload_activities a
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN workload_kpis k ON a.kpi_id = k.id
      LEFT JOIN workload_projects p ON a.project_id = p.id
      LEFT JOIN users ab ON a.assigned_by = ab.id
      ${whereClause}
      ORDER BY u.first_name, u.last_name, a.start_date
    `, params);

    res.json({ success: true, activities: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error exporting activities:', error);
    res.status(500).json({ success: false, message: 'Error exporting activities' });
  }
});

// Get activities for user AND their team (subordinates)
router.get('/activities/team', authenticateToken, async (req, res) => {
  const { user_id, include_subordinates } = req.query;
  const userId = user_id || req.user.id;

  try {
    // Get user and all subordinates using recursive CTE
    const teamQuery = `
      WITH RECURSIVE team_hierarchy AS (
        -- Base: the selected user
        SELECT id FROM users WHERE id = $1
        UNION ALL
        -- Recursive: all subordinates
        SELECT u.id FROM users u
        INNER JOIN team_hierarchy th ON u.manager_id = th.id
      )
      SELECT id FROM team_hierarchy
    `;

    const teamResult = await query(teamQuery, [userId]);
    const teamIds = teamResult.rows.map(r => r.id);

    // Get activities for all team members
    const result = await query(`
      SELECT a.*,
             k.code as kpi_code, k.name as kpi_name, k.color as kpi_color, k.icon as kpi_icon,
             p.name as project_name, p.color as project_color, p.client as project_client,
             u.first_name || ' ' || u.last_name as assigned_to_name,
             ab.first_name || ' ' || ab.last_name as assigned_by_name
      FROM workload_activities a
      LEFT JOIN workload_kpis k ON a.kpi_id = k.id
      LEFT JOIN workload_projects p ON a.project_id = p.id
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN users ab ON a.assigned_by = ab.id
      WHERE a.assigned_to = ANY($1)
      ORDER BY a.start_date DESC, a.priority DESC
    `, [teamIds]);

    res.json({
      success: true,
      activities: result.rows,
      teamIds: teamIds,
      teamSize: teamIds.length
    });
  } catch (error) {
    console.error('Error fetching team activities:', error);
    res.status(500).json({ success: false, message: 'Error fetching team activities' });
  }
});

// Get single activity
router.get('/activities/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*,
             k.code as kpi_code, k.name as kpi_name, k.color as kpi_color,
             p.name as project_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM workload_activities a
      LEFT JOIN workload_kpis k ON a.kpi_id = k.id
      LEFT JOIN workload_projects p ON a.project_id = p.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    res.json({ success: true, activity: result.rows[0] });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, message: 'Error fetching activity' });
  }
});

// Create activity
router.post('/activities', authenticateToken, async (req, res) => {
  const {
    title, description, activity_type, kpi_id, project_id, assigned_to,
    start_date, end_date, due_date, estimated_hours, priority, tags, notes,
    // Source tracking fields for 8D, Audits, etc.
    source_type, source_id, source_discipline
  } = req.body;

  // Helper to convert empty strings to null for integer fields
  const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;

  try {
    // If source_type is '8D' and no project_id provided, use 8D_EXECUTION project
    let finalProjectId = toNullIfEmpty(project_id);
    if (source_type === '8D' && !finalProjectId) {
      const projectResult = await query(
        "SELECT id FROM workload_projects WHERE name = '8D_EXECUTION' LIMIT 1"
      );
      if (projectResult.rows.length > 0) {
        finalProjectId = projectResult.rows[0].id;
      }
    }

    // If source_type is '8D', default KPI to Quality (Q)
    let finalKpiId = toNullIfEmpty(kpi_id);
    if (source_type === '8D' && !finalKpiId) {
      const kpiResult = await query(
        "SELECT id FROM workload_kpis WHERE code = 'Q' LIMIT 1"
      );
      if (kpiResult.rows.length > 0) {
        finalKpiId = kpiResult.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO workload_activities
       (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by,
        start_date, end_date, due_date, estimated_hours, priority, tags, notes, created_by,
        source_type, source_id, source_discipline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [title, description, activity_type || 'assigned', finalKpiId, finalProjectId, toNullIfEmpty(assigned_to),
       req.user.id, toNullIfEmpty(start_date), toNullIfEmpty(end_date), toNullIfEmpty(due_date), toNullIfEmpty(estimated_hours), priority || 'medium',
       JSON.stringify(tags || []), notes, req.user.id,
       source_type || null, source_id || null, source_discipline || null]
    );
    res.json({ success: true, activity: result.rows[0] });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ success: false, message: 'Error creating activity' });
  }
});

// Cancel activity (from 8D delete action)
router.patch('/activities/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `UPDATE workload_activities SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id, title, status`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    res.json({ success: true, activity: result.rows[0] });
  } catch (error) {
    console.error('Error cancelling workload activity:', error);
    res.status(500).json({ success: false, message: 'Error cancelling activity' });
  }
});

// Update activity
router.put('/activities/:id', authenticateToken, async (req, res) => {
  const {
    title, description, kpi_id, project_id, assigned_to,
    start_date, end_date, due_date, estimated_hours, actual_hours,
    progress, status, priority, tags, notes, daily_progress, evidence_files
  } = req.body;

  // Helper to convert empty strings to null for integer fields
  const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;

  try {
    const result = await query(
      `UPDATE workload_activities SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        kpi_id = COALESCE($3, kpi_id),
        project_id = COALESCE($4, project_id),
        assigned_to = COALESCE($5, assigned_to),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        due_date = COALESCE($8, due_date),
        estimated_hours = COALESCE($9, estimated_hours),
        actual_hours = COALESCE($10, actual_hours),
        progress = COALESCE($11, progress),
        status = COALESCE($12, status),
        priority = COALESCE($13, priority),
        tags = COALESCE($14, tags),
        notes = COALESCE($15, notes),
        daily_progress = COALESCE($16, daily_progress),
        evidence_files = COALESCE($17, evidence_files),
        completed_at = CASE WHEN $12 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $18 RETURNING *`,
      [title, description, toNullIfEmpty(kpi_id), toNullIfEmpty(project_id), toNullIfEmpty(assigned_to),
       toNullIfEmpty(start_date), toNullIfEmpty(end_date), toNullIfEmpty(due_date),
       toNullIfEmpty(estimated_hours), toNullIfEmpty(actual_hours), toNullIfEmpty(progress),
       status, priority, tags ? JSON.stringify(tags) : null, notes,
       daily_progress ? JSON.stringify(daily_progress) : null,
       evidence_files ? JSON.stringify(evidence_files) : null,
       req.params.id]
    );

    res.json({ success: true, activity: result.rows[0] });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ success: false, message: 'Error updating activity' });
  }
});

// ============================================================================
// 8D SYNC ENDPOINTS - Bidirectional sync between D6 actions and Workload
// ============================================================================

// Sync D6 action to Workload (create or update)
router.post('/activities/sync-8d', authenticateToken, async (req, res) => {
  console.log('🔄 Received sync-8d request:', JSON.stringify(req.body, null, 2));

  const {
    workload_activity_id, // If exists, update; if not, create
    report_id,
    discipline, // 'D6'
    action_id, // ID of the action in 8D (e.g., "d6-1")
    title,
    description,
    assigned_to,
    start_date,
    end_date,
    priority,
    progress,
    daily_progress,
    estimated_hours,
    actual_hours,
    evidence_files // Array of evidence files from 8D
  } = req.body;

  const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;

  try {
    // Get 8D_EXECUTION project
    let projectId = null;
    const projectResult = await query(
      "SELECT id FROM workload_projects WHERE name = '8D_EXECUTION' LIMIT 1"
    );
    if (projectResult.rows.length > 0) {
      projectId = projectResult.rows[0].id;
    }

    // Get Quality KPI
    let kpiId = null;
    const kpiResult = await query(
      "SELECT id FROM workload_kpis WHERE code = 'Q' LIMIT 1"
    );
    if (kpiResult.rows.length > 0) {
      kpiId = kpiResult.rows[0].id;
    }

    // Map priority: alta->high, media->medium, baja->low
    const mappedPriority = priority === 'alta' ? 'high' : priority === 'baja' ? 'low' : 'medium';

    let result;
    if (workload_activity_id) {
      // UPDATE existing activity - merge evidence files
      // First get existing evidence to merge with new ones
      const existingActivity = await query(
        'SELECT evidence_files FROM workload_activities WHERE id = $1',
        [workload_activity_id]
      );
      const existingEvidence = existingActivity.rows[0]?.evidence_files || [];
      const newEvidence = evidence_files || [];

      // Merge evidence, avoiding duplicates
      const mergedEvidence = [...existingEvidence];
      newEvidence.forEach(newFile => {
        const exists = existingEvidence.some(ef =>
          ef.filename === newFile.filename || ef.file_url === newFile.file_url
        );
        if (!exists) {
          mergedEvidence.push(newFile);
        }
      });

      result = await query(
        `UPDATE workload_activities SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          assigned_to = COALESCE($3, assigned_to),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          priority = COALESCE($6, priority),
          progress = COALESCE($7, progress),
          daily_progress = COALESCE($8, daily_progress),
          estimated_hours = COALESCE($9, estimated_hours),
          actual_hours = COALESCE($10, actual_hours),
          source_id = COALESCE($11, source_id),
          source_discipline = COALESCE($12, source_discipline),
          evidence_files = $13
         WHERE id = $14 RETURNING *`,
        [
          title,
          description,
          toNullIfEmpty(assigned_to),
          toNullIfEmpty(start_date),
          toNullIfEmpty(end_date),
          mappedPriority,
          toNullIfEmpty(progress),
          daily_progress ? JSON.stringify(daily_progress) : null,
          toNullIfEmpty(estimated_hours),
          toNullIfEmpty(actual_hours),
          report_id,
          `${discipline}:${action_id}`,
          JSON.stringify(mergedEvidence),
          workload_activity_id
        ]
      );

      // Si el UPDATE no encontró la actividad (fue borrada manualmente), crear una nueva
      if (result.rows.length === 0) {
        console.log(`⚠️ Workload activity ${workload_activity_id} not found — creating new one`);
        workload_activity_id = null; // forzar rama CREATE
      }
    }

    if (!workload_activity_id) {
      // CREATE new activity
      // Default dates if not provided (required by database)
      const today = new Date();
      const defaultStartDate = start_date || today.toISOString().split('T')[0];
      const defaultEndDate = end_date || new Date(today.setDate(today.getDate() + 30)).toISOString().split('T')[0];

      // If no responsible assigned, default to the user making the request
      const resolvedAssignedTo = toNullIfEmpty(assigned_to) || req.user.id;
      console.log('📝 Creating 8D activity:', { title, report_id, discipline, action_id, assigned_to: resolvedAssignedTo, defaultStartDate, defaultEndDate });

      result = await query(
        `INSERT INTO workload_activities
         (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by,
          start_date, end_date, priority, progress, daily_progress, estimated_hours, actual_hours,
          source_type, source_id, source_discipline, created_by, evidence_files)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [
          title,
          description,
          'assigned',
          kpiId,
          projectId,
          resolvedAssignedTo,
          req.user.id,
          defaultStartDate,
          defaultEndDate,
          mappedPriority,
          toNullIfEmpty(progress) || 0,
          daily_progress ? JSON.stringify(daily_progress) : '[]',
          toNullIfEmpty(estimated_hours),
          toNullIfEmpty(actual_hours),
          '8D',
          report_id,
          `${discipline}:${action_id}`,
          req.user.id,
          evidence_files ? JSON.stringify(evidence_files) : '[]'
        ]
      );

      console.log('✅ 8D activity created with ID:', result.rows[0]?.id);
    }

    res.json({
      success: true,
      activity: result.rows[0],
      workload_activity_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error syncing 8D action to workload:', error);
    res.status(500).json({ success: false, message: 'Error syncing activity' });
  }
});

// Get workload activity by 8D source (to check if already synced)
router.get('/activities/by-8d-source/:reportId/:discipline/:actionId', authenticateToken, async (req, res) => {
  try {
    const { reportId, discipline, actionId } = req.params;
    const result = await query(
      `SELECT * FROM workload_activities
       WHERE source_type = '8D'
       AND source_id = $1
       AND source_discipline = $2`,
      [reportId, `${discipline}:${actionId}`]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, activity: result.rows[0], exists: true });
    } else {
      res.json({ success: true, activity: null, exists: false });
    }
  } catch (error) {
    console.error('Error checking 8D source:', error);
    res.status(500).json({ success: false, message: 'Error checking activity' });
  }
});

// Sync workload activity back to 8D (called when workload is updated)
router.post('/activities/:id/notify-8d-update', authenticateToken, async (req, res) => {
  try {
    // Get the activity with source info
    const actResult = await query(
      `SELECT * FROM workload_activities WHERE id = $1`,
      [req.params.id]
    );

    if (actResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const activity = actResult.rows[0];

    // Only process if it's an 8D activity
    if (activity.source_type !== '8D') {
      return res.json({ success: true, message: 'Not an 8D activity, skipping' });
    }

    // Return the data that should be synced back to 8D
    res.json({
      success: true,
      syncData: {
        reportId: activity.source_id,
        discipline: activity.source_discipline?.split(':')[0], // 'D6'
        actionId: activity.source_discipline?.split(':')[1], // action id
        progress: activity.progress,
        dailyProgress: activity.daily_progress,
        actualHours: activity.actual_hours
      }
    });
  } catch (error) {
    console.error('Error preparing 8D sync data:', error);
    res.status(500).json({ success: false, message: 'Error preparing sync data' });
  }
});

// Delete activity
router.delete('/activities/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM workload_activities WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ success: false, message: 'Error deleting activity' });
  }
});

// ============================================================================
// ACTIVITY EVIDENCE ENDPOINTS
// ============================================================================

// Upload evidence for an activity
router.post('/activities/:id/evidence', authenticateToken, evidenceUpload.single('file'), async (req, res) => {
  try {
    const activityId = req.params.id;
    const file = req.file;
    const { description } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
    }

    // Get current evidence_files from activity
    const activityResult = await query(
      'SELECT evidence_files FROM workload_activities WHERE id = $1',
      [activityId]
    );

    if (activityResult.rows.length === 0) {
      // Delete uploaded file since activity doesn't exist
      fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
    }

    // Parse existing evidence files or initialize empty array
    let evidenceFiles = activityResult.rows[0].evidence_files || [];
    if (typeof evidenceFiles === 'string') {
      evidenceFiles = JSON.parse(evidenceFiles);
    }

    // Add new file to the array
    const newEvidence = {
      id: Date.now(),
      originalName: file.originalname,
      serverName: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      description: description || '',
      uploadedBy: req.user.id,
      uploadedByName: req.user.firstName + ' ' + req.user.lastName,
      uploadedAt: new Date().toISOString()
    };

    evidenceFiles.push(newEvidence);

    // Update activity with new evidence files
    await query(
      'UPDATE workload_activities SET evidence_files = $1 WHERE id = $2',
      [JSON.stringify(evidenceFiles), activityId]
    );

    res.json({
      success: true,
      message: 'Evidencia subida exitosamente',
      evidence: newEvidence,
      allEvidence: evidenceFiles
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    // Clean up file if it was uploaded
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: 'Error al subir evidencia' });
  }
});

// Get evidence files for an activity
router.get('/activities/:id/evidence', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT evidence_files FROM workload_activities WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
    }

    let evidenceFiles = result.rows[0].evidence_files || [];
    if (typeof evidenceFiles === 'string') {
      evidenceFiles = JSON.parse(evidenceFiles);
    }

    res.json({ success: true, evidence: evidenceFiles });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ success: false, message: 'Error al obtener evidencia' });
  }
});

// Download evidence file
router.get('/activities/:id/evidence/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const result = await query(
      'SELECT evidence_files FROM workload_activities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
    }

    let evidenceFiles = result.rows[0].evidence_files || [];
    if (typeof evidenceFiles === 'string') {
      evidenceFiles = JSON.parse(evidenceFiles);
    }

    const file = evidenceFiles.find(f => f.id === parseInt(fileId));
    if (!file) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    const filePath = path.join(__dirname, '../uploads/activity-evidence', file.serverName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado en el servidor' });
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({ success: false, message: 'Error al descargar evidencia' });
  }
});

// Delete evidence file
router.delete('/activities/:id/evidence/:fileId', authenticateToken, async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const result = await query(
      'SELECT evidence_files FROM workload_activities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
    }

    let evidenceFiles = result.rows[0].evidence_files || [];
    if (typeof evidenceFiles === 'string') {
      evidenceFiles = JSON.parse(evidenceFiles);
    }

    const fileIndex = evidenceFiles.findIndex(f => f.id === parseInt(fileId));
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    const file = evidenceFiles[fileIndex];

    // Delete file from disk
    const filePath = path.join(__dirname, '../uploads/activity-evidence', file.serverName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    evidenceFiles.splice(fileIndex, 1);

    // Update activity
    await query(
      'UPDATE workload_activities SET evidence_files = $1 WHERE id = $2',
      [JSON.stringify(evidenceFiles), id]
    );

    res.json({ success: true, message: 'Evidencia eliminada', evidence: evidenceFiles });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar evidencia' });
  }
});

// ============================================================================
// TIME ENTRIES ENDPOINTS
// ============================================================================

// Get time entries for activity
router.get('/time-entries/:activityId', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT te.*, u.first_name || ' ' || u.last_name as user_name
       FROM workload_time_entries te
       LEFT JOIN users u ON te.user_id = u.id
       WHERE te.activity_id = $1
       ORDER BY te.entry_date DESC`,
      [req.params.activityId]
    );
    res.json({ success: true, entries: result.rows });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ success: false, message: 'Error fetching time entries' });
  }
});

// Add time entry
router.post('/time-entries', authenticateToken, async (req, res) => {
  const { activity_id, entry_date, hours, description, entry_type } = req.body;

  try {
    const result = await query(
      `INSERT INTO workload_time_entries (activity_id, user_id, entry_date, hours, description, entry_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [activity_id, req.user.id, entry_date, hours, description, entry_type || 'work']
    );

    // Update actual_hours in activity
    await query(
      `UPDATE workload_activities
       SET actual_hours = (SELECT COALESCE(SUM(hours), 0) FROM workload_time_entries WHERE activity_id = $1)
       WHERE id = $1`,
      [activity_id]
    );

    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error('Error adding time entry:', error);
    res.status(500).json({ success: false, message: 'Error adding time entry' });
  }
});

// ============================================================================
// DASHBOARD / SUMMARY ENDPOINTS
// ============================================================================

// Get weekly summary for user
router.get('/summary/weekly/:userId', authenticateToken, async (req, res) => {
  const { week_start } = req.query;

  try {
    // Get user config
    const configResult = await query(
      'SELECT hours_per_week, overtime_threshold FROM workload_user_config WHERE user_id = $1',
      [req.params.userId]
    );
    const hoursAvailable = configResult.rows[0]?.hours_per_week || 45;
    const overtimeThreshold = configResult.rows[0]?.overtime_threshold || 45;

    // Calculate week boundaries
    const startDate = week_start || getMonday(new Date()).toISOString().split('T')[0];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get activities for the week
    const activitiesResult = await query(`
      SELECT a.*, k.code as kpi_code, k.color as kpi_color
      FROM workload_activities a
      LEFT JOIN workload_kpis k ON a.kpi_id = k.id
      WHERE a.assigned_to = $1
        AND a.start_date <= $3
        AND a.end_date >= $2
    `, [req.params.userId, startDate, endDateStr]);

    // Calculate metrics
    let hoursPlanned = 0;
    let hoursActual = 0;
    let activitiesTotal = activitiesResult.rows.length;
    let activitiesCompleted = 0;
    let activitiesUnplanned = 0;
    const kpiDistribution = {};

    for (const activity of activitiesResult.rows) {
      hoursPlanned += parseFloat(activity.estimated_hours) || 0;
      hoursActual += parseFloat(activity.actual_hours) || 0;

      if (activity.status === 'completed') activitiesCompleted++;
      if (activity.activity_type === 'unplanned') activitiesUnplanned++;

      if (activity.kpi_code) {
        kpiDistribution[activity.kpi_code] = (kpiDistribution[activity.kpi_code] || 0) +
          (parseFloat(activity.actual_hours) || parseFloat(activity.estimated_hours) || 0);
      }
    }

    const hoursOvertime = Math.max(0, hoursActual - overtimeThreshold);
    const utilizationPercent = hoursAvailable > 0 ? (hoursActual / hoursAvailable) * 100 : 0;
    const completionRate = activitiesTotal > 0 ? (activitiesCompleted / activitiesTotal) * 100 : 0;

    res.json({
      success: true,
      summary: {
        week_start: startDate,
        hours_available: hoursAvailable,
        hours_planned: hoursPlanned,
        hours_actual: hoursActual,
        hours_overtime: hoursOvertime,
        kpi_distribution: kpiDistribution,
        activities_total: activitiesTotal,
        activities_completed: activitiesCompleted,
        activities_pending: activitiesTotal - activitiesCompleted,
        activities_unplanned: activitiesUnplanned,
        utilization_percent: Math.round(utilizationPercent * 10) / 10,
        completion_rate: Math.round(completionRate * 10) / 10
      },
      activities: activitiesResult.rows
    });
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching weekly summary' });
  }
});

// Get team overview
router.get('/summary/team', authenticateToken, async (req, res) => {
  const { week_start } = req.query;

  try {
    const startDate = week_start || getMonday(new Date()).toISOString().split('T')[0];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all users with their workload
    const result = await query(`
      SELECT
        u.id, u.first_name, u.last_name, u.position, u.department,
        u.department_id, d.name as department_name,
        COALESCE(wc.hours_per_week, 45) as hours_available,
        COALESCE(SUM(a.estimated_hours), 0) as hours_planned,
        COALESCE(SUM(a.actual_hours), 0) as hours_actual,
        COUNT(a.id) as activities_count,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN workload_user_config wc ON u.id = wc.user_id
      LEFT JOIN workload_activities a ON u.id = a.assigned_to
        AND a.start_date <= $2 AND a.end_date >= $1
      GROUP BY u.id, u.first_name, u.last_name, u.position, u.department, u.department_id, d.name, wc.hours_per_week
      ORDER BY u.first_name
    `, [startDate, endDateStr]);

    const teamMembers = result.rows.map(member => ({
      ...member,
      utilization_percent: member.hours_available > 0
        ? Math.round((member.hours_actual / member.hours_available) * 1000) / 10
        : 0,
      is_overloaded: member.hours_actual > member.hours_available
    }));

    res.json({ success: true, team: teamMembers, week_start: startDate });
  } catch (error) {
    console.error('Error fetching team overview:', error);
    res.status(500).json({ success: false, message: 'Error fetching team overview' });
  }
});

// Helper function to get Monday of current week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ============================================================================
// OBJECTIVES ENDPOINTS (Organizational goals with cascading)
// ============================================================================

// Get all objectives with hierarchy
router.get('/objectives', authenticateToken, async (req, res) => {
  const { fiscal_year, owner_id, code, status } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (fiscal_year) {
      whereConditions.push(`o.fiscal_year = $${paramIndex++}`);
      params.push(fiscal_year);
    }
    if (owner_id) {
      whereConditions.push(`o.owner_id = $${paramIndex++}`);
      params.push(owner_id);
    }
    if (code) {
      whereConditions.push(`o.code = $${paramIndex++}`);
      params.push(code);
    }
    if (status) {
      whereConditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT o.*,
             u.first_name as owner_first_name,
             u.last_name as owner_last_name,
             u.position as owner_position,
             u.department as owner_department,
             p.name as parent_name,
             p.code as parent_code,
             k.name as kpi_name,
             k.color as kpi_color,
             k.icon as kpi_icon
      FROM workload_objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN workload_objectives p ON o.parent_objective_id = p.id
      LEFT JOIN workload_kpis k ON o.code = k.code
      ${whereClause}
      ORDER BY o.owner_level, o.code, o.fiscal_year DESC
    `, params);

    // Transform to camelCase and build hierarchy info
    const objectives = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      targetValue: parseFloat(row.target_value) || 0,
      targetUnit: row.target_unit,
      currentValue: parseFloat(row.current_value) || 0,
      baselineValue: parseFloat(row.baseline_value) || 0,
      fiscalYear: row.fiscal_year,
      fiscalQuarter: row.fiscal_quarter,
      startDate: row.start_date,
      endDate: row.end_date,
      ownerId: row.owner_id,
      ownerLevel: row.owner_level,
      department: row.department,
      parentObjectiveId: row.parent_objective_id,
      contributionPercent: parseFloat(row.contribution_percent) || 100,
      status: row.status,
      progressPercent: parseFloat(row.progress_percent) || 0,
      notes: row.notes,
      createdAt: row.created_at,
      // Related info
      owner: row.owner_first_name ? {
        id: row.owner_id,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        name: `${row.owner_first_name} ${row.owner_last_name}`,
        position: row.owner_position,
        department: row.owner_department
      } : null,
      parent: row.parent_name ? {
        id: row.parent_objective_id,
        name: row.parent_name,
        code: row.parent_code
      } : null,
      kpi: {
        code: row.code,
        name: row.kpi_name,
        color: row.kpi_color,
        icon: row.kpi_icon
      }
    }));

    res.json({ success: true, objectives });
  } catch (error) {
    console.error('Error fetching objectives:', error);
    res.status(500).json({ success: false, message: 'Error fetching objectives' });
  }
});

// Get objective by ID with children
router.get('/objectives/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT o.*,
             u.first_name as owner_first_name,
             u.last_name as owner_last_name,
             u.position as owner_position,
             k.name as kpi_name,
             k.color as kpi_color,
             k.icon as kpi_icon
      FROM workload_objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN workload_kpis k ON o.code = k.code
      WHERE o.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Objective not found' });
    }

    // Get children objectives
    const childrenResult = await query(`
      SELECT id, code, name, contribution_percent, progress_percent, status,
             owner_id, owner_level
      FROM workload_objectives
      WHERE parent_objective_id = $1
      ORDER BY code
    `, [req.params.id]);

    const row = result.rows[0];
    const objective = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      targetValue: parseFloat(row.target_value) || 0,
      targetUnit: row.target_unit,
      currentValue: parseFloat(row.current_value) || 0,
      baselineValue: parseFloat(row.baseline_value) || 0,
      fiscalYear: row.fiscal_year,
      fiscalQuarter: row.fiscal_quarter,
      startDate: row.start_date,
      endDate: row.end_date,
      ownerId: row.owner_id,
      ownerLevel: row.owner_level,
      department: row.department,
      parentObjectiveId: row.parent_objective_id,
      contributionPercent: parseFloat(row.contribution_percent) || 100,
      status: row.status,
      progressPercent: parseFloat(row.progress_percent) || 0,
      notes: row.notes,
      owner: row.owner_first_name ? {
        id: row.owner_id,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        name: `${row.owner_first_name} ${row.owner_last_name}`,
        position: row.owner_position
      } : null,
      kpi: {
        code: row.code,
        name: row.kpi_name,
        color: row.kpi_color,
        icon: row.kpi_icon
      },
      children: childrenResult.rows.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        contributionPercent: parseFloat(c.contribution_percent) || 0,
        progressPercent: parseFloat(c.progress_percent) || 0,
        status: c.status,
        ownerId: c.owner_id,
        ownerLevel: c.owner_level
      }))
    };

    res.json({ success: true, objective });
  } catch (error) {
    console.error('Error fetching objective:', error);
    res.status(500).json({ success: false, message: 'Error fetching objective' });
  }
});

// Create objective
router.post('/objectives', authenticateToken, async (req, res) => {
  const {
    code, name, description, targetValue, targetUnit, baselineValue,
    fiscalYear, fiscalQuarter, startDate, endDate,
    ownerId, ownerLevel, department,
    parentObjectiveId, contributionPercent, status, notes
  } = req.body;

  try {
    // Convert empty strings to null for integer fields
    const safeInt = (val) => (val === '' || val === undefined || val === null) ? null : parseInt(val);
    const safeStr = (val) => (val === '' || val === undefined) ? null : val;

    const result = await query(
      `INSERT INTO workload_objectives
       (code, name, description, target_value, target_unit, baseline_value,
        fiscal_year, fiscal_quarter, start_date, end_date,
        owner_id, owner_level, department,
        parent_objective_id, contribution_percent, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [code, name, safeStr(description), safeInt(targetValue), targetUnit || '%', safeInt(baselineValue) || 0,
       fiscalYear, safeStr(fiscalQuarter), safeStr(startDate), safeStr(endDate),
       safeInt(ownerId), safeInt(ownerLevel) ?? 0, safeStr(department),
       safeInt(parentObjectiveId), safeInt(contributionPercent) || 100, status || 'active', safeStr(notes), req.user.id]
    );

    res.json({ success: true, objective: result.rows[0], message: 'Objetivo creado' });
  } catch (error) {
    console.error('Error creating objective:', error);
    res.status(500).json({ success: false, message: 'Error creating objective' });
  }
});

// Update objective
router.put('/objectives/:id', authenticateToken, async (req, res) => {
  const {
    name, description, targetValue, targetUnit, currentValue, baselineValue,
    fiscalQuarter, startDate, endDate,
    ownerId, ownerLevel, department,
    parentObjectiveId, contributionPercent, status, progressPercent, notes
  } = req.body;

  try {
    // Convert empty strings to null for integer fields, preserve non-empty values
    const safeInt = (val) => (val === '' || val === undefined) ? null : val;
    const safeStr = (val) => (val === '' || val === undefined) ? null : val;

    const result = await query(
      `UPDATE workload_objectives SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        target_value = COALESCE($3, target_value),
        target_unit = COALESCE($4, target_unit),
        current_value = COALESCE($5, current_value),
        baseline_value = COALESCE($6, baseline_value),
        fiscal_quarter = COALESCE($7, fiscal_quarter),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        owner_id = COALESCE($10, owner_id),
        owner_level = COALESCE($11, owner_level),
        department = COALESCE($12, department),
        parent_objective_id = COALESCE($13, parent_objective_id),
        contribution_percent = COALESCE($14, contribution_percent),
        status = COALESCE($15, status),
        progress_percent = COALESCE($16, progress_percent),
        notes = COALESCE($17, notes)
       WHERE id = $18 RETURNING *`,
      [safeStr(name), safeStr(description), safeInt(targetValue), safeStr(targetUnit), safeInt(currentValue), safeInt(baselineValue),
       safeStr(fiscalQuarter), safeStr(startDate), safeStr(endDate),
       safeInt(ownerId), safeInt(ownerLevel), safeStr(department),
       safeInt(parentObjectiveId), safeInt(contributionPercent), safeStr(status), safeInt(progressPercent), safeStr(notes),
       req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Objective not found' });
    }

    res.json({ success: true, objective: result.rows[0], message: 'Objetivo actualizado' });
  } catch (error) {
    console.error('Error updating objective:', error);
    res.status(500).json({ success: false, message: 'Error updating objective' });
  }
});

// Delete objective
router.delete('/objectives/:id', authenticateToken, async (req, res) => {
  try {
    // Get objective info
    const objectiveResult = await query(
      'SELECT owner_id FROM workload_objectives WHERE id = $1',
      [req.params.id]
    );

    if (objectiveResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Objetivo no encontrado' });
    }

    const objective = objectiveResult.rows[0];
    const userId = req.user.id;
    const userRole = req.user.role || req.user.systemRole;

    // Check permissions: admin, own objective, or subordinate's objective
    let canDelete = false;

    // Admin can delete anything
    if (userRole === 'admin' || userRole === 'champion') {
      canDelete = true;
    }
    // Owner can delete their own
    else if (objective.owner_id === userId) {
      canDelete = true;
    }
    // Check if objective owner is a subordinate
    else {
      const subordinateCheck = await query(`
        WITH RECURSIVE subordinate_hierarchy AS (
          SELECT id FROM users WHERE manager_id = $1
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN subordinate_hierarchy h ON u.manager_id = h.id
        )
        SELECT 1 FROM subordinate_hierarchy WHERE id = $2
      `, [userId, objective.owner_id]);

      if (subordinateCheck.rows.length > 0) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este objetivo'
      });
    }

    // Check if has children
    const childCheck = await query(
      'SELECT COUNT(*) as count FROM workload_objectives WHERE parent_objective_id = $1',
      [req.params.id]
    );

    if (parseInt(childCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar: tiene objetivos hijos vinculados'
      });
    }

    await query('DELETE FROM workload_objectives WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Objetivo eliminado' });
  } catch (error) {
    console.error('Error deleting objective:', error);
    res.status(500).json({ success: false, message: 'Error deleting objective' });
  }
});

// Get objectives hierarchy tree
router.get('/objectives-tree', authenticateToken, async (req, res) => {
  const { fiscal_year } = req.query;

  try {
    const year = fiscal_year || new Date().getFullYear();

    const result = await query(`
      SELECT o.id, o.code, o.name, o.target_value, o.target_unit,
             o.current_value, o.progress_percent, o.status,
             o.owner_id, o.owner_level, o.parent_objective_id,
             o.contribution_percent,
             u.first_name as owner_first_name,
             u.last_name as owner_last_name,
             k.color as kpi_color, k.icon as kpi_icon
      FROM workload_objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN workload_kpis k ON o.code = k.code
      WHERE o.fiscal_year = $1
      ORDER BY o.owner_level, o.code
    `, [year]);

    // Build tree structure
    const objectives = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      targetValue: parseFloat(row.target_value) || 0,
      targetUnit: row.target_unit,
      currentValue: parseFloat(row.current_value) || 0,
      progressPercent: parseFloat(row.progress_percent) || 0,
      status: row.status,
      ownerId: row.owner_id,
      ownerLevel: row.owner_level,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name}` : null,
      parentObjectiveId: row.parent_objective_id,
      contributionPercent: parseFloat(row.contribution_percent) || 100,
      kpiColor: row.kpi_color,
      kpiIcon: row.kpi_icon,
      children: []
    }));

    // Build hierarchy
    const objectiveMap = {};
    const roots = [];

    objectives.forEach(obj => {
      objectiveMap[obj.id] = obj;
    });

    objectives.forEach(obj => {
      if (obj.parentObjectiveId && objectiveMap[obj.parentObjectiveId]) {
        objectiveMap[obj.parentObjectiveId].children.push(obj);
      } else {
        roots.push(obj);
      }
    });

    res.json({ success: true, tree: roots, fiscalYear: parseInt(year) });
  } catch (error) {
    console.error('Error fetching objectives tree:', error);
    res.status(500).json({ success: false, message: 'Error fetching objectives tree' });
  }
});

// ============================================================================
// FEEDBACK ENDPOINTS (Quarterly Performance Reviews)
// ============================================================================

// Get all feedback reviews with filters
router.get('/feedback', authenticateToken, async (req, res) => {
  const { employee_id, reviewer_id, fiscal_year, fiscal_quarter, status } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (employee_id) {
      whereConditions.push(`f.employee_id = $${paramIndex++}`);
      params.push(employee_id);
    }
    if (reviewer_id) {
      whereConditions.push(`f.reviewer_id = $${paramIndex++}`);
      params.push(reviewer_id);
    }
    if (fiscal_year) {
      whereConditions.push(`f.fiscal_year = $${paramIndex++}`);
      params.push(fiscal_year);
    }
    if (fiscal_quarter) {
      whereConditions.push(`f.fiscal_quarter = $${paramIndex++}`);
      params.push(fiscal_quarter);
    }
    if (status) {
      whereConditions.push(`f.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT f.*,
             e.first_name as employee_first_name,
             e.last_name as employee_last_name,
             e.position as employee_position,
             e.department as employee_department,
             r.first_name as reviewer_first_name,
             r.last_name as reviewer_last_name,
             r.position as reviewer_position
      FROM workload_feedback f
      LEFT JOIN users e ON f.employee_id = e.id
      LEFT JOIN users r ON f.reviewer_id = r.id
      ${whereClause}
      ORDER BY f.fiscal_year DESC, f.fiscal_quarter DESC, e.last_name
    `, params);

    const feedback = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeLevel: row.employee_level,
      reviewerId: row.reviewer_id,
      fiscalYear: row.fiscal_year,
      fiscalQuarter: row.fiscal_quarter,
      reviewDate: row.review_date,
      // Factors
      activitiesPlanned: row.activities_planned,
      activitiesCompleted: row.activities_completed,
      activitiesUnplanned: row.activities_unplanned,
      hoursAvailable: parseFloat(row.hours_available) || 0,
      hoursPlanned: parseFloat(row.hours_planned) || 0,
      hoursActual: parseFloat(row.hours_actual) || 0,
      completionRate: parseFloat(row.completion_rate) || 0,
      // Results
      kpiScores: row.kpi_scores,
      objectivesProgress: row.objectives_progress,
      overallScore: parseFloat(row.overall_score) || 0,
      // Feedback
      strengths: row.strengths,
      areasOfImprovement: row.areas_of_improvement,
      comments: row.comments,
      recognitions: row.recognitions,
      // Commitments
      commitments: row.commitments,
      trainingNeeds: row.training_needs,
      kpiAdjustments: row.kpi_adjustments,
      // Signatures
      employeeSignature: row.employee_signature,
      employeeSignedAt: row.employee_signed_at,
      reviewerSignature: row.reviewer_signature,
      reviewerSignedAt: row.reviewer_signed_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Related
      employee: {
        id: row.employee_id,
        firstName: row.employee_first_name,
        lastName: row.employee_last_name,
        name: `${row.employee_first_name} ${row.employee_last_name}`,
        position: row.employee_position,
        department: row.employee_department
      },
      reviewer: row.reviewer_first_name ? {
        id: row.reviewer_id,
        firstName: row.reviewer_first_name,
        lastName: row.reviewer_last_name,
        name: `${row.reviewer_first_name} ${row.reviewer_last_name}`,
        position: row.reviewer_position
      } : null
    }));

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, message: 'Error fetching feedback' });
  }
});

// Get single feedback by ID
router.get('/feedback/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*,
             e.first_name as employee_first_name,
             e.last_name as employee_last_name,
             e.position as employee_position,
             e.department as employee_department,
             r.first_name as reviewer_first_name,
             r.last_name as reviewer_last_name
      FROM workload_feedback f
      LEFT JOIN users e ON f.employee_id = e.id
      LEFT JOIN users r ON f.reviewer_id = r.id
      WHERE f.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      feedback: {
        id: row.id,
        employeeId: row.employee_id,
        employeeLevel: row.employee_level,
        reviewerId: row.reviewer_id,
        fiscalYear: row.fiscal_year,
        fiscalQuarter: row.fiscal_quarter,
        reviewDate: row.review_date,
        activitiesPlanned: row.activities_planned,
        activitiesCompleted: row.activities_completed,
        activitiesUnplanned: row.activities_unplanned,
        hoursAvailable: parseFloat(row.hours_available) || 0,
        hoursPlanned: parseFloat(row.hours_planned) || 0,
        hoursActual: parseFloat(row.hours_actual) || 0,
        completionRate: parseFloat(row.completion_rate) || 0,
        kpiScores: row.kpi_scores,
        objectivesProgress: row.objectives_progress,
        overallScore: parseFloat(row.overall_score) || 0,
        strengths: row.strengths,
        areasOfImprovement: row.areas_of_improvement,
        comments: row.comments,
        recognitions: row.recognitions,
        commitments: row.commitments,
        trainingNeeds: row.training_needs,
        kpiAdjustments: row.kpi_adjustments,
        employeeSignature: row.employee_signature,
        employeeSignedAt: row.employee_signed_at,
        reviewerSignature: row.reviewer_signature,
        reviewerSignedAt: row.reviewer_signed_at,
        status: row.status,
        employee: {
          id: row.employee_id,
          firstName: row.employee_first_name,
          lastName: row.employee_last_name,
          name: `${row.employee_first_name} ${row.employee_last_name}`,
          position: row.employee_position,
          department: row.employee_department
        },
        reviewer: row.reviewer_first_name ? {
          id: row.reviewer_id,
          firstName: row.reviewer_first_name,
          lastName: row.reviewer_last_name,
          name: `${row.reviewer_first_name} ${row.reviewer_last_name}`
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, message: 'Error fetching feedback' });
  }
});

// Create feedback (initiate a review)
router.post('/feedback', authenticateToken, async (req, res) => {
  const {
    employeeId, employeeLevel, fiscalYear, fiscalQuarter
  } = req.body;

  try {
    // Check if already exists
    const existing = await query(
      'SELECT id FROM workload_feedback WHERE employee_id = $1 AND fiscal_year = $2 AND fiscal_quarter = $3',
      [employeeId, fiscalYear, fiscalQuarter]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una evaluación para Q${fiscalQuarter} ${fiscalYear}`
      });
    }

    const result = await query(
      `INSERT INTO workload_feedback
       (employee_id, employee_level, reviewer_id, fiscal_year, fiscal_quarter, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
      [employeeId, employeeLevel || 3, req.user.id, fiscalYear, fiscalQuarter]
    );

    res.json({
      success: true,
      feedback: result.rows[0],
      message: 'Evaluación iniciada'
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ success: false, message: 'Error creating feedback' });
  }
});

// Update feedback
router.put('/feedback/:id', authenticateToken, async (req, res) => {
  const {
    activitiesPlanned, activitiesCompleted, activitiesUnplanned,
    hoursAvailable, hoursPlanned, hoursActual, completionRate,
    kpiScores, objectivesProgress, overallScore,
    strengths, areasOfImprovement, comments, recognitions,
    commitments, trainingNeeds, kpiAdjustments,
    status
  } = req.body;

  try {
    const result = await query(
      `UPDATE workload_feedback SET
        activities_planned = COALESCE($1, activities_planned),
        activities_completed = COALESCE($2, activities_completed),
        activities_unplanned = COALESCE($3, activities_unplanned),
        hours_available = COALESCE($4, hours_available),
        hours_planned = COALESCE($5, hours_planned),
        hours_actual = COALESCE($6, hours_actual),
        completion_rate = COALESCE($7, completion_rate),
        kpi_scores = COALESCE($8, kpi_scores),
        objectives_progress = COALESCE($9, objectives_progress),
        overall_score = COALESCE($10, overall_score),
        strengths = $11,
        areas_of_improvement = $12,
        comments = $13,
        recognitions = $14,
        commitments = COALESCE($15, commitments),
        training_needs = $16,
        kpi_adjustments = $17,
        status = COALESCE($18, status)
       WHERE id = $19 RETURNING *`,
      [
        activitiesPlanned, activitiesCompleted, activitiesUnplanned,
        hoursAvailable, hoursPlanned, hoursActual, completionRate,
        kpiScores ? JSON.stringify(kpiScores) : null,
        objectivesProgress ? JSON.stringify(objectivesProgress) : null,
        overallScore,
        strengths, areasOfImprovement, comments, recognitions,
        commitments ? JSON.stringify(commitments) : null,
        trainingNeeds, kpiAdjustments,
        status,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ success: true, feedback: result.rows[0], message: 'Evaluación actualizada' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ success: false, message: 'Error updating feedback' });
  }
});

// Sign feedback (employee or reviewer)
router.post('/feedback/:id/sign', authenticateToken, async (req, res) => {
  const { signatureType } = req.body; // 'employee' or 'reviewer'

  try {
    const field = signatureType === 'employee' ? 'employee_signature' : 'reviewer_signature';
    const dateField = signatureType === 'employee' ? 'employee_signed_at' : 'reviewer_signed_at';

    const result = await query(
      `UPDATE workload_feedback
       SET ${field} = TRUE, ${dateField} = NOW(),
           status = CASE
             WHEN employee_signature = TRUE AND reviewer_signature = TRUE THEN 'completed'
             WHEN ${field} = TRUE THEN 'pending_signature'
             ELSE status
           END
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({
      success: true,
      feedback: result.rows[0],
      message: `Firma de ${signatureType === 'employee' ? 'empleado' : 'evaluador'} registrada`
    });
  } catch (error) {
    console.error('Error signing feedback:', error);
    res.status(500).json({ success: false, message: 'Error signing feedback' });
  }
});

// Delete feedback
router.delete('/feedback/:id', authenticateToken, async (req, res) => {
  try {
    // Only allow deleting drafts
    const check = await query(
      'SELECT status FROM workload_feedback WHERE id = $1',
      [req.params.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (check.rows[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar evaluaciones en estado borrador'
      });
    }

    await query('DELETE FROM workload_feedback WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Evaluación eliminada' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ success: false, message: 'Error deleting feedback' });
  }
});

// Get quarterly periods for dropdown
router.get('/feedback/periods/available', authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);

    const periods = [];
    // Last year and current year
    for (let year = currentYear - 1; year <= currentYear; year++) {
      for (let q = 1; q <= 4; q++) {
        // Only show past/current quarters
        if (year < currentYear || (year === currentYear && q <= currentQuarter)) {
          periods.push({
            year,
            quarter: q,
            label: `Q${q} ${year}`,
            isCurrent: year === currentYear && q === currentQuarter
          });
        }
      }
    }

    res.json({ success: true, periods: periods.reverse() });
  } catch (error) {
    console.error('Error getting periods:', error);
    res.status(500).json({ success: false, message: 'Error getting periods' });
  }
});

// ============================================================================
// HIERARCHY LEVELS ENDPOINTS (Configurable org levels)
// ============================================================================

// Get all hierarchy levels
router.get('/hierarchy-levels', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM workload_hierarchy_levels WHERE is_active = true ORDER BY level_order'
    );

    const levels = result.rows.map(row => ({
      id: row.id,
      value: row.level_order,
      label: row.name,
      name: row.name,
      color: row.color,
      description: row.description
    }));

    res.json({ success: true, levels });
  } catch (error) {
    console.error('Error fetching hierarchy levels:', error);
    res.status(500).json({ success: false, message: 'Error fetching hierarchy levels' });
  }
});

// Create hierarchy level
router.post('/hierarchy-levels', authenticateToken, async (req, res) => {
  const { name, color, description } = req.body;

  try {
    // Get next level order
    const maxResult = await query(
      'SELECT COALESCE(MAX(level_order), -1) + 1 as next_order FROM workload_hierarchy_levels'
    );
    const nextOrder = maxResult.rows[0].next_order;

    const result = await query(
      `INSERT INTO workload_hierarchy_levels (level_order, name, color, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nextOrder, name, color || '#6b7280', description]
    );

    res.json({
      success: true,
      level: {
        id: result.rows[0].id,
        value: result.rows[0].level_order,
        label: result.rows[0].name,
        name: result.rows[0].name,
        color: result.rows[0].color,
        description: result.rows[0].description
      },
      message: 'Nivel creado'
    });
  } catch (error) {
    console.error('Error creating hierarchy level:', error);
    res.status(500).json({ success: false, message: 'Error creating hierarchy level' });
  }
});

// Update hierarchy level
router.put('/hierarchy-levels/:id', authenticateToken, async (req, res) => {
  const { name, color, description } = req.body;

  try {
    const result = await query(
      `UPDATE workload_hierarchy_levels
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           description = $3
       WHERE id = $4 RETURNING *`,
      [name, color, description, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }

    res.json({
      success: true,
      level: {
        id: result.rows[0].id,
        value: result.rows[0].level_order,
        label: result.rows[0].name,
        name: result.rows[0].name,
        color: result.rows[0].color,
        description: result.rows[0].description
      },
      message: 'Nivel actualizado'
    });
  } catch (error) {
    console.error('Error updating hierarchy level:', error);
    res.status(500).json({ success: false, message: 'Error updating hierarchy level' });
  }
});

// Delete hierarchy level (soft delete)
router.delete('/hierarchy-levels/:id', authenticateToken, async (req, res) => {
  try {
    // Check if any users have this level
    const levelResult = await query(
      'SELECT level_order FROM workload_hierarchy_levels WHERE id = $1',
      [req.params.id]
    );

    if (levelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }

    const levelOrder = levelResult.rows[0].level_order;

    const usersCheck = await query(
      'SELECT COUNT(*) as count FROM users WHERE hierarchy_level = $1',
      [levelOrder]
    );

    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar: hay ${usersCheck.rows[0].count} usuario(s) con este nivel`
      });
    }

    await query(
      'UPDATE workload_hierarchy_levels SET is_active = false WHERE id = $1',
      [req.params.id]
    );

    res.json({ success: true, message: 'Nivel eliminado' });
  } catch (error) {
    console.error('Error deleting hierarchy level:', error);
    res.status(500).json({ success: false, message: 'Error deleting hierarchy level' });
  }
});

// Reorder hierarchy levels
router.post('/hierarchy-levels/reorder', authenticateToken, async (req, res) => {
  const { orderedIds } = req.body; // Array of IDs in new order

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await query(
        'UPDATE workload_hierarchy_levels SET level_order = $1 WHERE id = $2',
        [i, orderedIds[i]]
      );
    }

    res.json({ success: true, message: 'Orden actualizado' });
  } catch (error) {
    console.error('Error reordering hierarchy levels:', error);
    res.status(500).json({ success: false, message: 'Error reordering hierarchy levels' });
  }
});

// ============================================================================
// SUBORDINATES ENDPOINTS (Hierarchical team structure)
// ============================================================================

// Get subordinates for a user (recursive CTE)
router.get('/subordinates/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { includeInactive } = req.query;

  try {
    // Get the user themselves first
    const selfResult = await query(
      `SELECT id, first_name, last_name, position, department, hierarchy_level, manager_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (selfResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const self = {
      id: selfResult.rows[0].id,
      firstName: selfResult.rows[0].first_name,
      lastName: selfResult.rows[0].last_name,
      name: `${selfResult.rows[0].first_name} ${selfResult.rows[0].last_name}`,
      position: selfResult.rows[0].position,
      department: selfResult.rows[0].department,
      hierarchyLevel: selfResult.rows[0].hierarchy_level,
      managerId: selfResult.rows[0].manager_id
    };

    // Get all subordinates using recursive CTE
    const activeFilter = includeInactive === 'true' ? '' : 'AND u.is_active = true';

    const subordinatesResult = await query(`
      WITH RECURSIVE subordinate_hierarchy AS (
        -- Base case: direct reports of the user
        SELECT id, email, first_name, last_name, position, department,
               hierarchy_level, manager_id, 1 as depth
        FROM users
        WHERE manager_id = $1 ${activeFilter.replace('u.', '')}

        UNION ALL

        -- Recursive case: reports of reports
        SELECT u.id, u.email, u.first_name, u.last_name, u.position, u.department,
               u.hierarchy_level, u.manager_id, h.depth + 1
        FROM users u
        INNER JOIN subordinate_hierarchy h ON u.manager_id = h.id
        WHERE 1=1 ${activeFilter}
      )
      SELECT * FROM subordinate_hierarchy
      ORDER BY depth, hierarchy_level, last_name
    `, [userId]);

    const subordinates = subordinatesResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      name: `${row.first_name} ${row.last_name}`,
      position: row.position,
      department: row.department,
      hierarchyLevel: row.hierarchy_level,
      managerId: row.manager_id,
      depth: row.depth
    }));

    res.json({
      success: true,
      self,
      subordinates,
      total: subordinates.length
    });
  } catch (error) {
    console.error('Error fetching subordinates:', error);
    res.status(500).json({ success: false, message: 'Error fetching subordinates' });
  }
});

// ============================================================================
// OBJECTIVES BY KPI ENDPOINTS
// ============================================================================

// Get objectives filtered by KPI code
router.get('/objectives/by-kpi/:kpiCode', authenticateToken, async (req, res) => {
  const { kpiCode } = req.params;
  const { fiscal_year, status, owner_id } = req.query;

  try {
    let whereConditions = ['o.code = $1'];
    let params = [kpiCode];
    let paramIndex = 2;

    if (fiscal_year) {
      whereConditions.push(`o.fiscal_year = $${paramIndex++}`);
      params.push(fiscal_year);
    }
    if (status) {
      whereConditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }
    if (owner_id) {
      whereConditions.push(`o.owner_id = $${paramIndex++}`);
      params.push(owner_id);
    }

    const result = await query(`
      SELECT o.id, o.code, o.name, o.description,
             o.target_value, o.target_unit, o.current_value,
             o.fiscal_year, o.fiscal_quarter,
             o.owner_id, o.owner_level, o.status, o.progress_percent,
             u.first_name as owner_first_name,
             u.last_name as owner_last_name,
             k.name as kpi_name, k.color as kpi_color, k.icon as kpi_icon
      FROM workload_objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN workload_kpis k ON o.code = k.code
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY o.owner_level, o.name
    `, params);

    const objectives = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      targetValue: parseFloat(row.target_value) || 0,
      targetUnit: row.target_unit,
      currentValue: parseFloat(row.current_value) || 0,
      fiscalYear: row.fiscal_year,
      fiscalQuarter: row.fiscal_quarter,
      ownerId: row.owner_id,
      ownerLevel: row.owner_level,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name}` : null,
      status: row.status,
      progressPercent: parseFloat(row.progress_percent) || 0,
      kpi: {
        name: row.kpi_name,
        color: row.kpi_color,
        icon: row.kpi_icon
      }
    }));

    res.json({ success: true, objectives });
  } catch (error) {
    console.error('Error fetching objectives by KPI:', error);
    res.status(500).json({ success: false, message: 'Error fetching objectives by KPI' });
  }
});

// ============================================================================
// COVERAGE ENDPOINTS (Vacation/Delegation)
// ============================================================================

// Get coverage list for a user (as original or substitute)
router.get('/coverage', authenticateToken, async (req, res) => {
  const { user_id, role, status, include_past } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (user_id) {
      if (role === 'substitute') {
        whereConditions.push(`c.substitute_id = $${paramIndex++}`);
      } else if (role === 'original') {
        whereConditions.push(`c.original_assignee_id = $${paramIndex++}`);
      } else {
        // Both roles
        whereConditions.push(`(c.original_assignee_id = $${paramIndex} OR c.substitute_id = $${paramIndex})`);
        paramIndex++;
      }
      params.push(user_id);
    }

    if (status) {
      whereConditions.push(`c.status = $${paramIndex++}`);
      params.push(status);
    }

    if (include_past !== 'true') {
      whereConditions.push(`c.end_date >= CURRENT_DATE`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT c.*,
             orig.first_name as original_first_name,
             orig.last_name as original_last_name,
             orig.position as original_position,
             sub.first_name as substitute_first_name,
             sub.last_name as substitute_last_name,
             sub.position as substitute_position,
             a.title as activity_title,
             approver.first_name as approver_first_name,
             approver.last_name as approver_last_name
      FROM workload_activity_coverage c
      LEFT JOIN users orig ON c.original_assignee_id = orig.id
      LEFT JOIN users sub ON c.substitute_id = sub.id
      LEFT JOIN users approver ON c.approved_by = approver.id
      LEFT JOIN workload_activities a ON c.activity_id = a.id
      ${whereClause}
      ORDER BY c.start_date DESC
    `, params);

    const coverages = result.rows.map(row => ({
      id: row.id,
      activityId: row.activity_id,
      activityTitle: row.activity_title,
      originalAssigneeId: row.original_assignee_id,
      originalAssignee: {
        id: row.original_assignee_id,
        firstName: row.original_first_name,
        lastName: row.original_last_name,
        name: `${row.original_first_name} ${row.original_last_name}`,
        position: row.original_position
      },
      substituteId: row.substitute_id,
      substitute: {
        id: row.substitute_id,
        firstName: row.substitute_first_name,
        lastName: row.substitute_last_name,
        name: `${row.substitute_first_name} ${row.substitute_last_name}`,
        position: row.substitute_position
      },
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      reasonNotes: row.reason_notes,
      status: row.status,
      approvedBy: row.approved_by,
      approverName: row.approver_first_name ? `${row.approver_first_name} ${row.approver_last_name}` : null,
      approvedAt: row.approved_at,
      createdAt: row.created_at
    }));

    res.json({ success: true, coverages });
  } catch (error) {
    console.error('Error fetching coverages:', error);
    res.status(500).json({ success: false, message: 'Error fetching coverages' });
  }
});

// Get active coverages affecting a user's activities
router.get('/coverage/active/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    // Coverages where this user is the original (someone is covering for them)
    const asOriginalResult = await query(`
      SELECT c.*, sub.first_name, sub.last_name
      FROM workload_activity_coverage c
      JOIN users sub ON c.substitute_id = sub.id
      WHERE c.original_assignee_id = $1
        AND c.status = 'active'
        AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
    `, [userId]);

    // Coverages where this user is the substitute (they are covering for someone)
    const asSubstituteResult = await query(`
      SELECT c.*, orig.first_name, orig.last_name
      FROM workload_activity_coverage c
      JOIN users orig ON c.original_assignee_id = orig.id
      WHERE c.substitute_id = $1
        AND c.status = 'active'
        AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
    `, [userId]);

    res.json({
      success: true,
      coveringForMe: asOriginalResult.rows.map(r => ({
        id: r.id,
        substituteId: r.substitute_id,
        substituteName: `${r.first_name} ${r.last_name}`,
        startDate: r.start_date,
        endDate: r.end_date,
        reason: r.reason,
        activityId: r.activity_id
      })),
      iAmCovering: asSubstituteResult.rows.map(r => ({
        id: r.id,
        originalAssigneeId: r.original_assignee_id,
        originalAssigneeName: `${r.first_name} ${r.last_name}`,
        startDate: r.start_date,
        endDate: r.end_date,
        reason: r.reason,
        activityId: r.activity_id
      }))
    });
  } catch (error) {
    console.error('Error fetching active coverages:', error);
    res.status(500).json({ success: false, message: 'Error fetching active coverages' });
  }
});

// Create coverage
router.post('/coverage', authenticateToken, async (req, res) => {
  const {
    activityId, originalAssigneeId, substituteId,
    startDate, endDate, reason, reasonNotes
  } = req.body;

  try {
    // Validate different users
    if (originalAssigneeId === substituteId) {
      return res.status(400).json({
        success: false,
        message: 'El sustituto debe ser diferente al empleado original'
      });
    }

    // Determine initial status
    const today = new Date().toISOString().split('T')[0];
    let status = 'pending';
    if (startDate <= today && endDate >= today) {
      status = 'active';
    }

    const result = await query(
      `INSERT INTO workload_activity_coverage
       (activity_id, original_assignee_id, substitute_id, start_date, end_date, reason, reason_notes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [activityId || null, originalAssigneeId, substituteId, startDate, endDate, reason, reasonNotes, status, req.user.id]
    );

    res.json({
      success: true,
      coverage: result.rows[0],
      message: 'Cobertura creada correctamente'
    });
  } catch (error) {
    console.error('Error creating coverage:', error);
    res.status(500).json({ success: false, message: 'Error creating coverage' });
  }
});

// Update coverage
router.put('/coverage/:id', authenticateToken, async (req, res) => {
  const {
    substituteId, startDate, endDate, reason, reasonNotes, status
  } = req.body;

  try {
    const result = await query(
      `UPDATE workload_activity_coverage SET
        substitute_id = COALESCE($1, substitute_id),
        start_date = COALESCE($2, start_date),
        end_date = COALESCE($3, end_date),
        reason = COALESCE($4, reason),
        reason_notes = $5,
        status = COALESCE($6, status)
       WHERE id = $7 RETURNING *`,
      [substituteId, startDate, endDate, reason, reasonNotes, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Coverage not found' });
    }

    res.json({ success: true, coverage: result.rows[0], message: 'Cobertura actualizada' });
  } catch (error) {
    console.error('Error updating coverage:', error);
    res.status(500).json({ success: false, message: 'Error updating coverage' });
  }
});

// Delete coverage
router.delete('/coverage/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM workload_activity_coverage WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Cobertura eliminada' });
  } catch (error) {
    console.error('Error deleting coverage:', error);
    res.status(500).json({ success: false, message: 'Error deleting coverage' });
  }
});

// Approve coverage
router.post('/coverage/:id/approve', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `UPDATE workload_activity_coverage
       SET approved_by = $1, approved_at = NOW(),
           status = CASE
             WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 'active'
             WHEN CURRENT_DATE < start_date THEN 'pending'
             ELSE 'completed'
           END
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Coverage not found' });
    }

    res.json({ success: true, coverage: result.rows[0], message: 'Cobertura aprobada' });
  } catch (error) {
    console.error('Error approving coverage:', error);
    res.status(500).json({ success: false, message: 'Error approving coverage' });
  }
});

// ============================================================================
// SUPERVISOR FEEDBACK LOG ENDPOINTS
// ============================================================================

// Get feedback log for an employee
router.get('/supervisor-feedback', authenticateToken, async (req, res) => {
  const { employee_id, supervisor_id, activity_id, feedback_type, start_date, end_date } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (employee_id) {
      whereConditions.push(`f.employee_id = $${paramIndex++}`);
      params.push(employee_id);
    }
    if (supervisor_id) {
      whereConditions.push(`f.supervisor_id = $${paramIndex++}`);
      params.push(supervisor_id);
    }
    if (activity_id) {
      whereConditions.push(`f.activity_id = $${paramIndex++}`);
      params.push(activity_id);
    }
    if (feedback_type) {
      whereConditions.push(`f.feedback_type = $${paramIndex++}`);
      params.push(feedback_type);
    }
    if (start_date) {
      whereConditions.push(`f.created_at >= $${paramIndex++}`);
      params.push(start_date);
    }
    if (end_date) {
      whereConditions.push(`f.created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT f.*,
             e.first_name as employee_first_name,
             e.last_name as employee_last_name,
             s.first_name as supervisor_first_name,
             s.last_name as supervisor_last_name,
             a.title as activity_title
      FROM workload_supervisor_feedback_log f
      LEFT JOIN users e ON f.employee_id = e.id
      LEFT JOIN users s ON f.supervisor_id = s.id
      LEFT JOIN workload_activities a ON f.activity_id = a.id
      ${whereClause}
      ORDER BY f.created_at DESC
    `, params);

    const feedbackLog = result.rows.map(row => ({
      id: row.id,
      activityId: row.activity_id,
      activityTitle: row.activity_title,
      employeeId: row.employee_id,
      employee: {
        id: row.employee_id,
        firstName: row.employee_first_name,
        lastName: row.employee_last_name,
        name: `${row.employee_first_name} ${row.employee_last_name}`
      },
      supervisorId: row.supervisor_id,
      supervisor: {
        id: row.supervisor_id,
        firstName: row.supervisor_first_name,
        lastName: row.supervisor_last_name,
        name: `${row.supervisor_first_name} ${row.supervisor_last_name}`
      },
      feedbackType: row.feedback_type,
      title: row.title,
      comment: row.comment,
      isVisibleToEmployee: row.is_visible_to_employee,
      severity: row.severity,
      requiresFollowup: row.requires_followup,
      followupDate: row.followup_date,
      followupCompleted: row.followup_completed,
      followupNotes: row.followup_notes,
      createdAt: row.created_at
    }));

    res.json({ success: true, feedbackLog });
  } catch (error) {
    console.error('Error fetching supervisor feedback:', error);
    res.status(500).json({ success: false, message: 'Error fetching supervisor feedback' });
  }
});

// Get feedback summary/stats for an employee
router.get('/supervisor-feedback/summary/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  const { fiscal_year } = req.query;

  try {
    const yearFilter = fiscal_year
      ? `AND EXTRACT(YEAR FROM created_at) = ${parseInt(fiscal_year)}`
      : '';

    const result = await query(`
      SELECT
        feedback_type,
        COUNT(*) as count
      FROM workload_supervisor_feedback_log
      WHERE employee_id = $1 ${yearFilter}
      GROUP BY feedback_type
    `, [employeeId]);

    const summary = {
      total: 0,
      recognition: 0,
      warning: 0,
      coaching: 0,
      achievement: 0,
      improvement_needed: 0,
      note: 0
    };

    result.rows.forEach(row => {
      summary[row.feedback_type] = parseInt(row.count);
      summary.total += parseInt(row.count);
    });

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error fetching feedback summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching feedback summary' });
  }
});

// Create supervisor feedback
router.post('/supervisor-feedback', authenticateToken, async (req, res) => {
  const {
    activityId, employeeId, feedbackType, title, comment,
    isVisibleToEmployee, severity, requiresFollowup, followupDate
  } = req.body;

  try {
    if (!employeeId || !feedbackType || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Empleado, tipo de feedback y comentario son requeridos'
      });
    }

    const result = await query(
      `INSERT INTO workload_supervisor_feedback_log
       (activity_id, employee_id, supervisor_id, feedback_type, title, comment,
        is_visible_to_employee, severity, requires_followup, followup_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [activityId || null, employeeId, req.user.id, feedbackType, title, comment,
       isVisibleToEmployee !== false, severity || null, requiresFollowup || false, followupDate || null]
    );

    res.json({
      success: true,
      feedback: result.rows[0],
      message: 'Feedback registrado correctamente'
    });
  } catch (error) {
    console.error('Error creating supervisor feedback:', error);
    res.status(500).json({ success: false, message: 'Error creating supervisor feedback' });
  }
});

// Update supervisor feedback (for follow-up completion)
router.put('/supervisor-feedback/:id', authenticateToken, async (req, res) => {
  const {
    title, comment, isVisibleToEmployee, severity,
    requiresFollowup, followupDate, followupCompleted, followupNotes
  } = req.body;

  try {
    const result = await query(
      `UPDATE workload_supervisor_feedback_log SET
        title = COALESCE($1, title),
        comment = COALESCE($2, comment),
        is_visible_to_employee = COALESCE($3, is_visible_to_employee),
        severity = $4,
        requires_followup = COALESCE($5, requires_followup),
        followup_date = $6,
        followup_completed = COALESCE($7, followup_completed),
        followup_notes = $8
       WHERE id = $9 RETURNING *`,
      [title, comment, isVisibleToEmployee, severity,
       requiresFollowup, followupDate, followupCompleted, followupNotes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ success: true, feedback: result.rows[0], message: 'Feedback actualizado' });
  } catch (error) {
    console.error('Error updating supervisor feedback:', error);
    res.status(500).json({ success: false, message: 'Error updating supervisor feedback' });
  }
});

// Delete supervisor feedback
router.delete('/supervisor-feedback/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM workload_supervisor_feedback_log WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Feedback eliminado' });
  } catch (error) {
    console.error('Error deleting supervisor feedback:', error);
    res.status(500).json({ success: false, message: 'Error deleting supervisor feedback' });
  }
});

// ============================================================================
// DELIVERABLE TYPES ENDPOINTS
// ============================================================================

// Get all deliverable types
router.get('/deliverable-types', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM workload_deliverable_types
       WHERE is_active = true
       ORDER BY display_order, name`
    );

    const types = result.rows.map(row => ({
      code: row.code,
      name: row.name,
      description: row.description,
      icon: row.icon
    }));

    res.json({ success: true, deliverableTypes: types });
  } catch (error) {
    console.error('Error fetching deliverable types:', error);
    res.status(500).json({ success: false, message: 'Error fetching deliverable types' });
  }
});

// ============================================================================
// ENHANCED ACTIVITIES - RECURRING GENERATION
// ============================================================================

// Create recurring activity (SINGLE activity with recurrence metadata)
router.post('/activities/recurring', authenticateToken, async (req, res) => {
  const {
    title, description, activity_type, kpi_id, project_id, assigned_to,
    start_date, estimated_hours, priority, tags, notes,
    frequency, frequency_details, recurring_duration, recurring_days, objective_id,
    deliverable_type, moscow_priority, weight_percent, requires_evidence
  } = req.body;

  try {
    // Generate a unique group ID for this recurring activity
    const { v4: uuidv4 } = require('uuid');
    const recurringGroupId = uuidv4();

    // Calculate end date based on duration
    const durationMonths = {
      '3_months': 3,
      '6_months': 6,
      '1_year': 12,
      '2_years': 24
    };
    const months = durationMonths[recurring_duration] || 3;

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + months);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Merge recurring_days into frequency_details
    const fullFrequencyDetails = {
      ...(frequency_details || {}),
      recurring_days: recurring_days || []
    };

    // Create a SINGLE activity with recurrence metadata
    const result = await query(
      `INSERT INTO workload_activities
       (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by,
        start_date, end_date, estimated_hours, priority, tags, notes, created_by,
        is_recurring, frequency, frequency_details, recurring_duration, recurring_group_id,
        objective_id, deliverable_type, moscow_priority, weight_percent, requires_evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               TRUE, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING *`,
      [title, description, activity_type || 'recurring',
       kpi_id || null, project_id || null, assigned_to || req.user.id,
       req.user.id, start_date, endDate, estimated_hours || null, priority || 'medium',
       JSON.stringify(tags || []), notes || null, req.user.id,
       frequency, JSON.stringify(fullFrequencyDetails), recurring_duration, recurringGroupId,
       objective_id || null, deliverable_type || null, moscow_priority || null,
       weight_percent || 0, requires_evidence || false]
    );

    const frequencyLabels = {
      'weekly': 'semanal',
      'biweekly': 'quincenal',
      'monthly': 'mensual',
      'quarterly': 'trimestral'
    };

    res.json({
      success: true,
      message: `Actividad recurrente ${frequencyLabels[frequency] || frequency} creada (${recurring_duration.replace('_', ' ')})`,
      activity: result.rows[0],
      recurringGroupId
    });
  } catch (error) {
    console.error('Error creating recurring activity:', error);
    res.status(500).json({ success: false, message: 'Error creating recurring activity' });
  }
});

// Update recurring activities (single or all future)
router.put('/activities/recurring/:id', authenticateToken, async (req, res) => {
  const { updateScope } = req.query; // 'single' or 'all_future'
  const {
    title, description, kpi_id, project_id, assigned_to,
    estimated_hours, priority, notes, objective_id,
    deliverable_type, moscow_priority, weight_percent, requires_evidence,
    frequency, recurring_days, recurring_duration
  } = req.body;

  // Helper to convert empty strings to null for integer fields
  const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;

  // Build frequency_details with recurring_days
  const frequencyDetails = recurring_days ? { recurring_days } : null;

  try {
    if (updateScope === 'all_future') {
      // Get the recurring_group_id and start_date of this activity
      const activityResult = await query(
        'SELECT recurring_group_id, start_date FROM workload_activities WHERE id = $1',
        [req.params.id]
      );

      if (activityResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      const { recurring_group_id, start_date } = activityResult.rows[0];

      if (!recurring_group_id) {
        return res.status(400).json({
          success: false,
          message: 'Esta actividad no es parte de una serie recurrente'
        });
      }

      // Update all future activities in the group
      const result = await query(
        `UPDATE workload_activities SET
          title = COALESCE($1, title),
          description = $2,
          kpi_id = COALESCE($3, kpi_id),
          project_id = $4,
          assigned_to = COALESCE($5, assigned_to),
          estimated_hours = COALESCE($6, estimated_hours),
          priority = COALESCE($7, priority),
          notes = $8,
          objective_id = $9,
          deliverable_type = $10,
          moscow_priority = $11,
          weight_percent = COALESCE($12, weight_percent),
          requires_evidence = COALESCE($13, requires_evidence),
          frequency = COALESCE($16, frequency),
          frequency_details = COALESCE($17, frequency_details),
          recurring_duration = COALESCE($18, recurring_duration)
         WHERE recurring_group_id = $14
           AND start_date >= $15
           AND status != 'completed'
         RETURNING id`,
        [title, description, toNullIfEmpty(kpi_id), toNullIfEmpty(project_id), toNullIfEmpty(assigned_to),
         toNullIfEmpty(estimated_hours), priority, notes, toNullIfEmpty(objective_id),
         deliverable_type, moscow_priority, toNullIfEmpty(weight_percent), requires_evidence,
         recurring_group_id, start_date,
         frequency, frequencyDetails ? JSON.stringify(frequencyDetails) : null, recurring_duration]
      );

      res.json({
        success: true,
        message: `Se actualizaron ${result.rows.length} actividades`,
        updatedCount: result.rows.length
      });
    } else {
      // Update single activity
      const result = await query(
        `UPDATE workload_activities SET
          title = COALESCE($1, title),
          description = $2,
          kpi_id = COALESCE($3, kpi_id),
          project_id = $4,
          assigned_to = COALESCE($5, assigned_to),
          estimated_hours = COALESCE($6, estimated_hours),
          priority = COALESCE($7, priority),
          notes = $8,
          objective_id = $9,
          deliverable_type = $10,
          moscow_priority = $11,
          weight_percent = COALESCE($12, weight_percent),
          requires_evidence = COALESCE($13, requires_evidence),
          frequency = COALESCE($15, frequency),
          frequency_details = COALESCE($16, frequency_details),
          recurring_duration = COALESCE($17, recurring_duration)
         WHERE id = $14 RETURNING *`,
        [title, description, toNullIfEmpty(kpi_id), toNullIfEmpty(project_id), toNullIfEmpty(assigned_to),
         toNullIfEmpty(estimated_hours), priority, notes, toNullIfEmpty(objective_id),
         deliverable_type, moscow_priority, toNullIfEmpty(weight_percent), requires_evidence,
         req.params.id,
         frequency, frequencyDetails ? JSON.stringify(frequencyDetails) : null, recurring_duration]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      res.json({ success: true, activity: result.rows[0], message: 'Actividad actualizada' });
    }
  } catch (error) {
    console.error('Error updating recurring activities:', error);
    res.status(500).json({ success: false, message: 'Error updating recurring activities' });
  }
});

// Delete recurring activities (single or all future)
router.delete('/activities/recurring/:id', authenticateToken, async (req, res) => {
  const { deleteScope } = req.query; // 'single' or 'all_future'

  try {
    if (deleteScope === 'all_future') {
      // Get the recurring_group_id and start_date of this activity
      const activityResult = await query(
        'SELECT recurring_group_id, start_date FROM workload_activities WHERE id = $1',
        [req.params.id]
      );

      if (activityResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      const { recurring_group_id, start_date } = activityResult.rows[0];

      if (!recurring_group_id) {
        return res.status(400).json({
          success: false,
          message: 'Esta actividad no es parte de una serie recurrente'
        });
      }

      // Delete all future activities in the group
      const result = await query(
        `DELETE FROM workload_activities
         WHERE recurring_group_id = $1
           AND start_date >= $2
           AND status != 'completed'`,
        [recurring_group_id, start_date]
      );

      res.json({
        success: true,
        message: `Se eliminaron ${result.rowCount} actividades`
      });
    } else {
      // Delete single activity
      await query('DELETE FROM workload_activities WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Actividad eliminada' });
    }
  } catch (error) {
    console.error('Error deleting recurring activities:', error);
    res.status(500).json({ success: false, message: 'Error deleting recurring activities' });
  }
});

// ============================================================================
// WORKLOAD DASHBOARD KPI ENDPOINT
// GET /workload/dashboard?user_ids=1,2,3&start_date=X&end_date=Y
// Returns all KPI groups for the workload dashboard
// ============================================================================
router.get('/dashboard', authenticateToken, async (req, res) => {
  const { user_ids, start_date, end_date } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const sd = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const ed = end_date || today;

  try {
    // Parse user IDs
    let userIds = [];
    if (user_ids) {
      userIds = user_ids.split(',').map(id => parseInt(id)).filter(Boolean);
    }
    if (userIds.length === 0) {
      return res.json({ success: true, kpis: {}, message: 'No users specified' });
    }

    // ── 1. User capacities ──────────────────────────────────────────────────
    const usersResult = await query(`
      SELECT u.id, u.first_name, u.last_name, u.position, u.department,
             COALESCE(d.name, u.department) AS department_name,
             COALESCE(wc.hours_per_week, 45) AS hours_per_week
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN workload_user_config wc ON u.id = wc.user_id
      WHERE u.id = ANY($1)
    `, [userIds]);
    const userRows = usersResult.rows;

    // Days in period (for prorating weekly capacity)
    const periodDays = Math.max(1, Math.round((new Date(ed) - new Date(sd)) / 86400000) + 1);
    const periodWeeks = periodDays / 7;

    const totalAvailableHrs = userRows.reduce((sum, u) =>
      sum + parseFloat(u.hours_per_week) * periodWeeks, 0);

    // ── 2. Activities in period ─────────────────────────────────────────────
    const actResult = await query(`
      SELECT
        a.id, a.title, a.status, a.activity_type, a.priority,
        a.start_date, a.end_date, a.estimated_hours, a.actual_hours, a.progress,
        a.assigned_to, a.project_id, a.kpi_id,
        a.created_at, a.updated_at,
        u.first_name || ' ' || u.last_name AS assigned_to_name,
        COALESCE(d.name, u.department) AS department_name,
        u.position,
        k.name AS kpi_name, k.code AS kpi_code, k.color AS kpi_color,
        p.name AS project_name, p.client AS project_client
      FROM workload_activities a
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN workload_kpis k ON a.kpi_id = k.id
      LEFT JOIN workload_projects p ON a.project_id = p.id
      WHERE a.assigned_to = ANY($1)
        AND a.start_date <= $3 AND a.end_date >= $2
    `, [userIds, sd, ed]);
    const acts = actResult.rows;

    const totalActs = acts.length;
    const completed = acts.filter(a => a.status === 'completed');
    const inProgress = acts.filter(a => a.status === 'in_progress');
    const pending = acts.filter(a => a.status === 'pending');
    const cancelled = acts.filter(a => a.status === 'cancelled');
    const unplanned = acts.filter(a => a.activity_type === 'unplanned');
    const delayed = acts.filter(a =>
      a.status !== 'completed' && a.status !== 'cancelled' && a.end_date < today
    );
    const criticalDelayed = delayed.filter(a =>
      a.priority === 'high' || a.priority === 'critical'
    );

    const sumEst = acts.reduce((s, a) => s + parseFloat(a.estimated_hours || 0), 0);
    const sumReal = completed.reduce((s, a) => s + parseFloat(a.actual_hours || 0), 0);
    const sumRealAll = acts.reduce((s, a) => s + parseFloat(a.actual_hours || 0), 0);
    const avgProgress = totalActs > 0
      ? acts.reduce((s, a) => s + (parseFloat(a.progress) || 0), 0) / totalActs
      : 0;

    // Utilization per user
    const userUtilMap = {};
    userRows.forEach(u => {
      const userActs = acts.filter(a => a.assigned_to === u.id);
      const usrReal = userActs.reduce((s, a) => s + parseFloat(a.actual_hours || 0), 0);
      const usrAvail = parseFloat(u.hours_per_week) * periodWeeks;
      userUtilMap[u.id] = {
        ...u,
        hoursAssigned: userActs.reduce((s, a) => s + parseFloat(a.estimated_hours || 0), 0),
        hoursReal: usrReal,
        hoursAvailable: usrAvail,
        utilization: usrAvail > 0 ? Math.round((usrReal / usrAvail) * 1000) / 10 : 0,
        activitiesCount: userActs.length,
        completedCount: userActs.filter(a => a.status === 'completed').length,
        delayedCount: userActs.filter(a =>
          a.status !== 'completed' && a.status !== 'cancelled' && a.end_date < today
        ).length
      };
    });
    const userUtilList = Object.values(userUtilMap);
    const overloaded = userUtilList.filter(u => u.utilization > 110);
    const underutilized = userUtilList.filter(u => u.utilization < 70);
    const utilValues = userUtilList.map(u => u.utilization);
    const maxUtil = utilValues.length ? Math.max(...utilValues) : 0;
    const minUtil = utilValues.length ? Math.min(...utilValues) : 0;
    const avgUtil = utilValues.length
      ? Math.round(utilValues.reduce((s, v) => s + v, 0) / utilValues.length * 10) / 10
      : 0;

    // ── 3. Execution KPIs ───────────────────────────────────────────────────
    const compliance = sumEst > 0 ? Math.round((sumRealAll / sumEst) * 1000) / 10 : 0;
    const estimationDeviation = sumEst > 0
      ? Math.round(((sumRealAll - sumEst) / sumEst) * 1000) / 10
      : 0;
    const productivity = sumRealAll > 0 ? Math.round((sumEst / sumRealAll) * 100) / 100 : 1;

    // Lead time: avg days from created_at to updated_at for completed tasks
    const leadTimes = completed
      .map(a => (new Date(a.updated_at) - new Date(a.created_at)) / 86400000)
      .filter(d => d > 0);
    const avgLeadTime = leadTimes.length
      ? Math.round(leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length * 10) / 10
      : 0;
    const throughput = completed.length; // tasks completed in period

    // Deviation >20%
    const actsWithBothHours = acts.filter(a =>
      parseFloat(a.estimated_hours) > 0 && parseFloat(a.actual_hours) > 0
    );
    const bigDeviation = actsWithBothHours.filter(a => {
      const dev = Math.abs((parseFloat(a.actual_hours) - parseFloat(a.estimated_hours)) / parseFloat(a.estimated_hours));
      return dev > 0.2;
    });

    // ── 4. Risk KPI: Operational Risk Index (0-100) ─────────────────────────
    // Weighted: overload(30) + delays(30) + critical delayed(20) + unplanned(20)
    const overloadScore = userRows.length > 0
      ? Math.min(30, (overloaded.length / userRows.length) * 30) : 0;
    const delayScore = totalActs > 0
      ? Math.min(30, (delayed.length / totalActs) * 30) : 0;
    const criticalScore = totalActs > 0
      ? Math.min(20, (criticalDelayed.length / Math.max(1, totalActs * 0.1)) * 20) : 0;
    const unplannedScore = totalActs > 0
      ? Math.min(20, (unplanned.length / totalActs) * 20) : 0;
    const riskIndex = Math.round(overloadScore + delayScore + criticalScore + unplannedScore);

    // Work at risk: delayed or blocked
    const blocked = acts.filter(a => a.status === 'blocked');
    const atRisk = [...new Set([...delayed, ...blocked].map(a => a.id))];

    // ── 5. KPI distribution ─────────────────────────────────────────────────
    const kpiMap = {};
    acts.forEach(a => {
      if (!a.kpi_id) return;
      if (!kpiMap[a.kpi_id]) {
        kpiMap[a.kpi_id] = {
          kpi_id: a.kpi_id, name: a.kpi_name, code: a.kpi_code, color: a.kpi_color,
          estimated: 0, actual: 0, count: 0, completed: 0, avgProgress: 0, progressSum: 0
        };
      }
      kpiMap[a.kpi_id].estimated += parseFloat(a.estimated_hours || 0);
      kpiMap[a.kpi_id].actual += parseFloat(a.actual_hours || 0);
      kpiMap[a.kpi_id].count++;
      kpiMap[a.kpi_id].progressSum += parseFloat(a.progress || 0);
      if (a.status === 'completed') kpiMap[a.kpi_id].completed++;
    });
    const kpiDistribution = Object.values(kpiMap).map(k => ({
      ...k,
      avgProgress: k.count > 0 ? Math.round(k.progressSum / k.count) : 0,
      efficiency: k.actual > 0 ? Math.round((k.estimated / k.actual) * 100) / 100 : null,
      hoursShare: sumEst > 0 ? Math.round((k.estimated / sumEst) * 1000) / 10 : 0
    })).sort((a, b) => b.estimated - a.estimated);

    // ── 6. Project distribution ─────────────────────────────────────────────
    const projMap = {};
    acts.forEach(a => {
      const key = a.project_id || '__none__';
      if (!projMap[key]) {
        projMap[key] = {
          project_id: a.project_id,
          name: a.project_name || 'Sin Proyecto',
          client: a.project_client || '-',
          estimated: 0, actual: 0, count: 0, completed: 0, progressSum: 0
        };
      }
      projMap[key].estimated += parseFloat(a.estimated_hours || 0);
      projMap[key].actual += parseFloat(a.actual_hours || 0);
      projMap[key].count++;
      projMap[key].progressSum += parseFloat(a.progress || 0);
      if (a.status === 'completed') projMap[key].completed++;
    });
    const projectDistribution = Object.values(projMap).map(p => ({
      ...p,
      avgProgress: p.count > 0 ? Math.round(p.progressSum / p.count) : 0,
      deviation: p.estimated > 0
        ? Math.round(((p.actual - p.estimated) / p.estimated) * 1000) / 10
        : 0
    })).sort((a, b) => b.estimated - a.estimated);

    // ── 7. Department efficiency ─────────────────────────────────────────────
    const deptMap = {};
    acts.forEach(a => {
      const key = a.department_name || 'Sin Depto';
      if (!deptMap[key]) {
        deptMap[key] = { department: key, estimated: 0, actual: 0, count: 0, completed: 0 };
      }
      deptMap[key].estimated += parseFloat(a.estimated_hours || 0);
      deptMap[key].actual += parseFloat(a.actual_hours || 0);
      deptMap[key].count++;
      if (a.status === 'completed') deptMap[key].completed++;
    });
    const departmentEfficiency = Object.values(deptMap).map(d => ({
      ...d,
      efficiency: d.actual > 0 ? Math.round((d.estimated / d.actual) * 100) / 100 : null,
      completionRate: d.count > 0 ? Math.round((d.completed / d.count) * 1000) / 10 : 0
    })).sort((a, b) => b.estimated - a.estimated);

    // ── Response ─────────────────────────────────────────────────────────────
    res.json({
      success: true,
      period: { start: sd, end: ed, days: periodDays },
      kpis: {
        // Top Bar
        topBar: {
          avgUtilization: avgUtil,
          overloadedPercent: userRows.length > 0
            ? Math.round((overloaded.length / userRows.length) * 1000) / 10 : 0,
          plannedVsAvailable: totalAvailableHrs > 0
            ? Math.round((sumEst / totalAvailableHrs) * 1000) / 10 : 0,
          realVsPlanned: sumEst > 0
            ? Math.round((sumRealAll / sumEst) * 1000) / 10 : 0,
          delayedPercent: totalActs > 0
            ? Math.round((delayed.length / totalActs) * 1000) / 10 : 0
        },
        // Carga
        carga: {
          userLoad: userUtilList,
          totalAvailableHrs: Math.round(totalAvailableHrs * 10) / 10,
          totalAssignedHrs: Math.round(sumEst * 10) / 10,
          loadImbalance: Math.round((maxUtil - minUtil) * 10) / 10,
          underutilizedPercent: userRows.length > 0
            ? Math.round((underutilized.length / userRows.length) * 1000) / 10 : 0,
          overloadedCount: overloaded.length,
          underutilizedCount: underutilized.length
        },
        // Ejecución
        ejecucion: {
          compliancePercent: compliance,
          estimationDeviation,
          productivity,
          avgLeadTimeDays: avgLeadTime,
          throughput,
          bigDeviationCount: bigDeviation.length,
          bigDeviationPercent: actsWithBothHours.length > 0
            ? Math.round((bigDeviation.length / actsWithBothHours.length) * 1000) / 10 : 0
        },
        // Actividades
        actividades: {
          total: totalActs,
          avgProgress: Math.round(avgProgress * 10) / 10,
          completedPercent: totalActs > 0
            ? Math.round((completed.length / totalActs) * 1000) / 10 : 0,
          pendingPercent: totalActs > 0
            ? Math.round((pending.length / totalActs) * 1000) / 10 : 0,
          unplannedPercent: totalActs > 0
            ? Math.round((unplanned.length / totalActs) * 1000) / 10 : 0,
          wipPercent: totalActs > 0
            ? Math.round((inProgress.length / totalActs) * 1000) / 10 : 0,
          completedCount: completed.length,
          inProgressCount: inProgress.length,
          pendingCount: pending.length,
          cancelledCount: cancelled.length
        },
        // Riesgo
        riesgo: {
          riskIndex,
          criticalDelayedCount: criticalDelayed.length,
          atRiskPercent: totalActs > 0
            ? Math.round((atRisk.length / totalActs) * 1000) / 10 : 0,
          bigDeviationPercent: actsWithBothHours.length > 0
            ? Math.round((bigDeviation.length / actsWithBothHours.length) * 1000) / 10 : 0,
          delayedCount: delayed.length,
          blockedCount: blocked.length,
          overloadedCount: overloaded.length
        },
        // Proyectos / KPI
        proyectos: {
          kpiDistribution,
          projectDistribution,
          departmentEfficiency
        }
      }
    });
  } catch (error) {
    console.error('Error generating workload dashboard:', error);
    res.status(500).json({ success: false, message: 'Error generating dashboard' });
  }
});

module.exports = router;

