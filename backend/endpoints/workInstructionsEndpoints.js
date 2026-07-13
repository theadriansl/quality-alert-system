/**
 * Work Instructions Endpoints - PostgreSQL Implementation
 * Complete CRUD with versioning, steps, risk assessment
 */

const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// MULTER - EVIDENCIAS DE CERTIFICACIONES ILUO
// ============================================================================

const wiEvidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/wi-evidence');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `wi-cert-${Date.now()}-${safeFilename}`);
  }
});

const wiEvidenceUpload = multer({
  storage: wiEvidenceStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createRevisionSnapshot(workInstructionId, changeSummary, userId) {
  try {
    const result = await query(
      'SELECT create_wi_revision_snapshot($1, $2, $3) as revision_number',
      [workInstructionId, changeSummary, userId]
    );
    return result.rows[0].revision_number;
  } catch (error) {
    console.error('Error creating revision snapshot:', error);
    return null;
  }
}

// ============================================================================
// WORK INSTRUCTIONS ENDPOINTS
// ============================================================================

const setupWorkInstructionsEndpoints = (app) => {

  // ==========================================================================
  // GET /work-instructions/list - Get all work instructions
  // ==========================================================================
  app.get('/work-instructions/list', async (req, res) => {
    try {
      let queryText = `
        SELECT
          wi.*,
          c.name as client_name,
          c.alias as client_alias,
          u.first_name || ' ' || u.last_name as created_by_name,
          (SELECT COUNT(*) FROM work_instruction_steps WHERE work_instruction_id = wi.id) as total_steps,
          (SELECT COUNT(*) FROM work_instruction_projects WHERE work_instruction_id = wi.id) as total_projects,
          (SELECT COUNT(*) FROM work_instruction_parts WHERE work_instruction_id = wi.id) as total_parts,
          (SELECT COUNT(*) FROM work_instruction_users WHERE work_instruction_id = wi.id) as total_users
        FROM work_instructions wi
        LEFT JOIN clients c ON wi.client_id = c.id
        LEFT JOIN users u ON wi.created_by = u.id
      `;

      const conditions = [];
      const params = [];
      let paramCount = 0;

      // Filter by client
      if (req.query.clientId) {
        paramCount++;
        conditions.push(`wi.client_id = $${paramCount}`);
        params.push(parseInt(req.query.clientId));
      }

      // Filter by status
      if (req.query.status) {
        paramCount++;
        conditions.push(`wi.status = $${paramCount}`);
        params.push(req.query.status);
      }

      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      queryText += ' ORDER BY wi.created_at DESC';

      const result = await query(queryText, params);

      res.json({
        success: true,
        workInstructions: transformToCamelCase(result.rows),
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching work instructions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching work instructions',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /work-instructions/:id - Get single work instruction with all relations
  // ==========================================================================
  app.get('/work-instructions/:id', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      // Main work instruction
      const wiResult = await query(`
        SELECT
          wi.*,
          c.name as client_name,
          c.alias as client_alias,
          u1.first_name || ' ' || u1.last_name as created_by_name,
          u2.first_name || ' ' || u2.last_name as updated_by_name
        FROM work_instructions wi
        LEFT JOIN clients c ON wi.client_id = c.id
        LEFT JOIN users u1 ON wi.created_by = u1.id
        LEFT JOIN users u2 ON wi.updated_by = u2.id
        WHERE wi.id = $1
      `, [wiId]);

      if (wiResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Work instruction not found'
        });
      }

      // Get linked projects
      const projectsResult = await query(`
        SELECT p.id, p.project_number, p.project_name, p.status
        FROM work_instruction_projects wip
        JOIN projects p ON wip.project_id = p.id
        WHERE wip.work_instruction_id = $1
        ORDER BY p.project_name
      `, [wiId]);

      // Get linked parts
      const partsResult = await query(`
        SELECT cp.id, cp.part_number, cp.client_part_number, cp.part_name, cp.revision, p.project_name
        FROM work_instruction_parts wiprt
        JOIN client_parts cp ON wiprt.part_id = cp.id
        LEFT JOIN projects p ON cp.project_id = p.id
        WHERE wiprt.work_instruction_id = $1
        ORDER BY cp.part_number
      `, [wiId]);

      // Get assigned users
      const usersResult = await query(`
        SELECT
          wiu.id as assignment_id,
          wiu.access_type,
          wiu.assigned_at,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.position,
          u2.first_name || ' ' || u2.last_name as assigned_by_name
        FROM work_instruction_users wiu
        JOIN users u ON wiu.user_id = u.id
        LEFT JOIN users u2 ON wiu.assigned_by = u2.id
        WHERE wiu.work_instruction_id = $1
        ORDER BY wiu.access_type, u.first_name
      `, [wiId]);

      // Get steps with station info
      const stepsResult = await query(`
        SELECT
          wis.*,
          s.name as station_name,
          s.code as station_code,
          s.station_type,
          sh.full_path as station_full_path
        FROM work_instruction_steps wis
        LEFT JOIN wi_stations s ON wis.station_id = s.id
        LEFT JOIN wi_station_hierarchy sh ON wis.station_id = sh.station_id
        WHERE wis.work_instruction_id = $1
        ORDER BY wis.step_order
      `, [wiId]);

      // Get risk assessment
      const riskResult = await query(`
        SELECT wira.*, wirc.criteria_name, wirc.description as criteria_description, wirc.score_guide
        FROM work_instruction_risk_assessments wira
        LEFT JOIN work_instruction_risk_criteria_definitions wirc ON true
        WHERE wira.work_instruction_id = $1
      `, [wiId]);

      // Get revisions (last 10)
      const revisionsResult = await query(`
        SELECT
          wir.*,
          u.first_name || ' ' || u.last_name as created_by_name,
          u2.first_name || ' ' || u2.last_name as approved_by_name
        FROM work_instruction_revisions wir
        LEFT JOIN users u ON wir.created_by = u.id
        LEFT JOIN users u2 ON wir.approved_by = u2.id
        WHERE wir.work_instruction_id = $1
        ORDER BY wir.revision_number DESC
        LIMIT 10
      `, [wiId]);

      const workInstruction = {
        ...wiResult.rows[0],
        projects: projectsResult.rows,
        parts: partsResult.rows,
        assignedUsers: usersResult.rows,
        steps: stepsResult.rows,
        riskAssessment: riskResult.rows[0] || null,
        revisions: revisionsResult.rows
      };

      res.json({
        success: true,
        workInstruction: transformToCamelCase(workInstruction)
      });
    } catch (error) {
      console.error('Error fetching work instruction:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching work instruction',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /work-instructions - Create new work instruction
  // ==========================================================================
  app.post('/work-instructions', async (req, res) => {
    try {
      const data = transformToSnakeCase(req.body);

      // Validation
      if (!data.title || !data.client_id) {
        return res.status(400).json({
          success: false,
          message: 'title and client_id are required'
        });
      }

      // Verify client exists
      const clientResult = await query(
        'SELECT id, name FROM clients WHERE id = $1',
        [data.client_id]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Create work instruction
      const result = await query(`
        INSERT INTO work_instructions (
          client_id, title, description, reference_image,
          valid_from, valid_to, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        data.client_id,
        data.title,
        data.description || '',
        data.reference_image || null,
        data.valid_from || null,
        data.valid_to || null,
        data.status || 'draft',
        data.created_by || null
      ]);

      const workInstruction = result.rows[0];

      // Create initial risk assessment record
      await query(`
        INSERT INTO work_instruction_risk_assessments (work_instruction_id, created_by)
        VALUES ($1, $2)
      `, [workInstruction.id, data.created_by || null]);

      // Create initial revision
      await createRevisionSnapshot(workInstruction.id, 'Initial creation', data.created_by);

      res.json({
        success: true,
        message: 'Work instruction created successfully',
        workInstruction: transformToCamelCase(workInstruction)
      });

    } catch (error) {
      console.error('Error creating work instruction:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating work instruction',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // PUT /work-instructions/:id - Update work instruction
  // ==========================================================================
  app.put('/work-instructions/:id', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const updates = transformToSnakeCase(req.body);

      const allowedFields = [
        'title', 'description', 'reference_image',
        'valid_from', 'valid_to', 'status'
      ];

      const setClause = [];
      const values = [];
      let paramCount = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      // Add updated_by
      if (updates.updated_by) {
        setClause.push(`updated_by = $${paramCount}`);
        values.push(updates.updated_by);
        paramCount++;
      }

      values.push(wiId);

      const result = await query(`
        UPDATE work_instructions
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Work instruction not found'
        });
      }

      // Create revision for metadata changes
      await createRevisionSnapshot(wiId, 'Metadata updated', updates.updated_by);

      res.json({
        success: true,
        message: 'Work instruction updated successfully',
        workInstruction: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error updating work instruction:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating work instruction',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // DELETE /work-instructions/:id - Delete work instruction
  // ==========================================================================
  app.delete('/work-instructions/:id', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        DELETE FROM work_instructions
        WHERE id = $1
        RETURNING *
      `, [wiId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Work instruction not found'
        });
      }

      res.json({
        success: true,
        message: 'Work instruction deleted successfully',
        workInstruction: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error deleting work instruction:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting work instruction',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // PROJECTS MANAGEMENT
  // ==========================================================================

  // GET available projects for a WI (same client)
  app.get('/work-instructions/:id/available-projects', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      // Get client_id from WI
      const wiResult = await query(
        'SELECT client_id FROM work_instructions WHERE id = $1',
        [wiId]
      );

      if (wiResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Work instruction not found' });
      }

      const clientId = wiResult.rows[0].client_id;

      // Get projects not already linked
      const result = await query(`
        SELECT p.id, p.project_number, p.project_name, p.status
        FROM projects p
        WHERE p.client_id = $1
        AND p.id NOT IN (
          SELECT project_id FROM work_instruction_projects WHERE work_instruction_id = $2
        )
        ORDER BY p.project_name
      `, [clientId, wiId]);

      res.json({
        success: true,
        projects: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching available projects:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST - Link project to WI
  app.post('/work-instructions/:id/projects', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const { projectId } = req.body;

      await query(`
        INSERT INTO work_instruction_projects (work_instruction_id, project_id)
        VALUES ($1, $2)
        ON CONFLICT (work_instruction_id, project_id) DO NOTHING
      `, [wiId, projectId]);

      res.json({ success: true, message: 'Project linked successfully' });
    } catch (error) {
      console.error('Error linking project:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE - Unlink project from WI
  app.delete('/work-instructions/:id/projects/:projectId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const projectId = parseInt(req.params.projectId);

      // Also remove parts that belong to this project
      await query(`
        DELETE FROM work_instruction_parts
        WHERE work_instruction_id = $1
        AND part_id IN (SELECT id FROM client_parts WHERE project_id = $2)
      `, [wiId, projectId]);

      await query(`
        DELETE FROM work_instruction_projects
        WHERE work_instruction_id = $1 AND project_id = $2
      `, [wiId, projectId]);

      res.json({ success: true, message: 'Project unlinked successfully' });
    } catch (error) {
      console.error('Error unlinking project:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // PARTS MANAGEMENT
  // ==========================================================================

  // GET available parts for a WI (from linked projects only)
  app.get('/work-instructions/:id/available-parts', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT cp.id, cp.part_number, cp.client_part_number, cp.part_name, cp.revision, p.project_name
        FROM client_parts cp
        JOIN projects p ON cp.project_id = p.id
        WHERE cp.project_id IN (
          SELECT project_id FROM work_instruction_projects WHERE work_instruction_id = $1
        )
        AND cp.id NOT IN (
          SELECT part_id FROM work_instruction_parts WHERE work_instruction_id = $1
        )
        ORDER BY p.project_name, cp.part_number
      `, [wiId]);

      res.json({
        success: true,
        parts: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching available parts:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST - Link part to WI
  app.post('/work-instructions/:id/parts', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const { partId } = req.body;

      await query(`
        INSERT INTO work_instruction_parts (work_instruction_id, part_id)
        VALUES ($1, $2)
        ON CONFLICT (work_instruction_id, part_id) DO NOTHING
      `, [wiId, partId]);

      res.json({ success: true, message: 'Part linked successfully' });
    } catch (error) {
      console.error('Error linking part:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE - Unlink part from WI
  app.delete('/work-instructions/:id/parts/:partId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const partId = parseInt(req.params.partId);

      await query(`
        DELETE FROM work_instruction_parts
        WHERE work_instruction_id = $1 AND part_id = $2
      `, [wiId, partId]);

      res.json({ success: true, message: 'Part unlinked successfully' });
    } catch (error) {
      console.error('Error unlinking part:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // USERS MANAGEMENT
  // ==========================================================================

  // GET available users (all active users not already assigned)
  app.get('/work-instructions/:id/available-users', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT u.id, u.first_name, u.last_name, u.email, u.position
        FROM users u
        WHERE u.id NOT IN (
          SELECT user_id FROM work_instruction_users WHERE work_instruction_id = $1
        )
        ORDER BY u.first_name, u.last_name
      `, [wiId]);

      res.json({
        success: true,
        users: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching available users:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST - Assign user to WI
  app.post('/work-instructions/:id/users', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const { userId, accessType, assignedBy } = req.body;

      await query(`
        INSERT INTO work_instruction_users (work_instruction_id, user_id, access_type, assigned_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (work_instruction_id, user_id) DO UPDATE SET
          access_type = EXCLUDED.access_type
      `, [wiId, userId, accessType || 'viewer', assignedBy || null]);

      res.json({ success: true, message: 'User assigned successfully' });
    } catch (error) {
      console.error('Error assigning user:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT - Update user access type
  app.put('/work-instructions/:id/users/:userId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { accessType } = req.body;

      await query(`
        UPDATE work_instruction_users
        SET access_type = $3
        WHERE work_instruction_id = $1 AND user_id = $2
      `, [wiId, userId, accessType]);

      res.json({ success: true, message: 'User access updated successfully' });
    } catch (error) {
      console.error('Error updating user access:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE - Remove user from WI
  app.delete('/work-instructions/:id/users/:userId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      await query(`
        DELETE FROM work_instruction_users
        WHERE work_instruction_id = $1 AND user_id = $2
      `, [wiId, userId]);

      res.json({ success: true, message: 'User removed successfully' });
    } catch (error) {
      console.error('Error removing user:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // STEPS MANAGEMENT
  // ==========================================================================

  // GET all steps for a WI
  app.get('/work-instructions/:id/steps', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT
          wis.*,
          s.name as station_name,
          s.code as station_code,
          s.station_type,
          sh.full_path as station_full_path
        FROM work_instruction_steps wis
        LEFT JOIN wi_stations s ON wis.station_id = s.id
        LEFT JOIN wi_station_hierarchy sh ON wis.station_id = sh.station_id
        WHERE wis.work_instruction_id = $1
        ORDER BY wis.step_order
      `, [wiId]);

      res.json({
        success: true,
        steps: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching steps:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST - Add new step (creates revision)
  app.post('/work-instructions/:id/steps', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      // Get next step order
      const orderResult = await query(`
        SELECT COALESCE(MAX(step_order), 0) + 1 as next_order
        FROM work_instruction_steps
        WHERE work_instruction_id = $1
      `, [wiId]);

      const nextOrder = orderResult.rows[0].next_order;

      const result = await query(`
        INSERT INTO work_instruction_steps (
          work_instruction_id, step_order, title, description,
          image_url, estimated_time_minutes, step_type, station_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        wiId,
        data.step_order || nextOrder,
        data.title || '',
        data.description || '',
        data.image_url || null,
        data.estimated_time_minutes || 0,
        data.step_type || 'regular',
        data.station_id || null
      ]);

      // Create revision
      await createRevisionSnapshot(wiId, `Step ${nextOrder} added`, data.created_by);

      res.json({
        success: true,
        message: 'Step added successfully',
        step: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error adding step:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT - Update step (creates revision)
  app.put('/work-instructions/:id/steps/:stepId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const stepId = parseInt(req.params.stepId);
      const updates = transformToSnakeCase(req.body);

      const allowedFields = [
        'step_order', 'title', 'description', 'image_url',
        'estimated_time_minutes', 'step_type'
      ];

      const setClause = [];
      const values = [];
      let paramCount = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }

      values.push(stepId, wiId);

      const result = await query(`
        UPDATE work_instruction_steps
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount} AND work_instruction_id = $${paramCount + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Step not found' });
      }

      // Create revision
      await createRevisionSnapshot(wiId, `Step ${result.rows[0].step_order} updated`, updates.updated_by);

      res.json({
        success: true,
        message: 'Step updated successfully',
        step: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating step:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT - Reorder steps (drag & drop)
  app.put('/work-instructions/:id/steps/reorder', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const { stepOrders } = req.body; // [{id: 1, order: 0}, {id: 2, order: 1}, ...]

      for (const item of stepOrders) {
        await query(`
          UPDATE work_instruction_steps
          SET step_order = $1
          WHERE id = $2 AND work_instruction_id = $3
        `, [item.order, item.id, wiId]);
      }

      // Create revision
      await createRevisionSnapshot(wiId, 'Steps reordered', req.body.updatedBy);

      res.json({ success: true, message: 'Steps reordered successfully' });
    } catch (error) {
      console.error('Error reordering steps:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE - Remove step (creates revision)
  app.delete('/work-instructions/:id/steps/:stepId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const stepId = parseInt(req.params.stepId);

      const result = await query(`
        DELETE FROM work_instruction_steps
        WHERE id = $1 AND work_instruction_id = $2
        RETURNING *
      `, [stepId, wiId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Step not found' });
      }

      // Create revision
      await createRevisionSnapshot(wiId, `Step deleted`, req.query.deletedBy);

      res.json({
        success: true,
        message: 'Step deleted successfully',
        step: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error deleting step:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  // GET risk assessment for WI
  app.get('/work-instructions/:id/risk-assessment', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT * FROM work_instruction_risk_assessments
        WHERE work_instruction_id = $1
      `, [wiId]);

      // Get criteria definitions
      const criteriaResult = await query(`
        SELECT * FROM work_instruction_risk_criteria_definitions
        ORDER BY display_order
      `);

      res.json({
        success: true,
        riskAssessment: transformToCamelCase(result.rows[0] || null),
        criteriaDefinitions: transformToCamelCase(criteriaResult.rows)
      });
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT - Update risk assessment
  app.put('/work-instructions/:id/risk-assessment', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const { criteria, status, updatedBy } = req.body;

      // Calculate total scores
      let totalScore = 0;
      let totalRevisedScore = 0;
      let criteriaCount = 0;

      if (criteria) {
        for (const key of Object.keys(criteria)) {
          if (criteria[key].score !== null) {
            totalScore += criteria[key].score;
            criteriaCount++;
          }
          if (criteria[key].revised_score !== null) {
            totalRevisedScore += criteria[key].revised_score;
          }
        }
      }

      const result = await query(`
        UPDATE work_instruction_risk_assessments
        SET
          criteria = $1,
          total_score = $2,
          total_revised_score = $3,
          status = COALESCE($4, status),
          updated_by = $5
        WHERE work_instruction_id = $6
        RETURNING *
      `, [
        JSON.stringify(criteria),
        criteriaCount > 0 ? totalScore : null,
        totalRevisedScore > 0 ? totalRevisedScore : null,
        status,
        updatedBy,
        wiId
      ]);

      if (result.rows.length === 0) {
        // Create if not exists
        await query(`
          INSERT INTO work_instruction_risk_assessments (
            work_instruction_id, criteria, total_score, total_revised_score, status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [wiId, JSON.stringify(criteria), totalScore, totalRevisedScore, status || 'pending', updatedBy]);
      }

      res.json({
        success: true,
        message: 'Risk assessment updated successfully'
      });
    } catch (error) {
      console.error('Error updating risk assessment:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // REVISIONS
  // ==========================================================================

  // GET all revisions for a WI
  app.get('/work-instructions/:id/revisions', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT
          wir.*,
          u.first_name || ' ' || u.last_name as created_by_name,
          u2.first_name || ' ' || u2.last_name as approved_by_name
        FROM work_instruction_revisions wir
        LEFT JOIN users u ON wir.created_by = u.id
        LEFT JOIN users u2 ON wir.approved_by = u2.id
        WHERE wir.work_instruction_id = $1
        ORDER BY wir.revision_number DESC
      `, [wiId]);

      res.json({
        success: true,
        revisions: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching revisions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET specific revision snapshot
  app.get('/work-instructions/:id/revisions/:revisionNumber', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const revisionNumber = parseInt(req.params.revisionNumber);

      const result = await query(`
        SELECT * FROM work_instruction_revisions
        WHERE work_instruction_id = $1 AND revision_number = $2
      `, [wiId, revisionNumber]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Revision not found' });
      }

      res.json({
        success: true,
        revision: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error fetching revision:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // ILUO CERTIFICATIONS - Operator certifications for Work Instructions
  // ==========================================================================

  // GET certifications for a specific WI
  app.get('/work-instructions/:id/certifications', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT
          woc.*,
          u.first_name || ' ' || u.last_name AS operator_name,
          u.position,
          cb.first_name || ' ' || cb.last_name AS certified_by_name,
          CASE
            WHEN woc.status = 'REVOKED' THEN 'REVOKED'
            WHEN woc.expires_at IS NULL THEN 'ACTIVE'
            WHEN woc.expires_at < CURRENT_DATE THEN 'EXPIRED'
            WHEN woc.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
            ELSE 'ACTIVE'
          END AS effective_status
        FROM wi_operator_certifications woc
        JOIN users u ON woc.operator_id = u.id
        LEFT JOIN users cb ON woc.certified_by = cb.id
        WHERE woc.work_instruction_id = $1
        ORDER BY woc.level DESC, u.first_name
      `, [wiId]);

      res.json({
        success: true,
        certifications: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching WI certifications:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET available operators for certification (not yet certified in this WI)
  app.get('/work-instructions/:id/certifications/available-operators', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);

      const result = await query(`
        SELECT u.id, u.first_name, u.last_name, u.position
        FROM users u
        WHERE u.is_active = TRUE
        AND u.id NOT IN (
          SELECT operator_id FROM wi_operator_certifications
          WHERE work_instruction_id = $1 AND status = 'ACTIVE'
        )
        ORDER BY u.first_name, u.last_name
      `, [wiId]);

      res.json({
        success: true,
        operators: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching available operators:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST - Create/update certification for an operator
  app.post('/work-instructions/:id/certifications', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      if (!data.operator_id || !data.level) {
        return res.status(400).json({
          success: false,
          message: 'operator_id and level are required'
        });
      }

      // Validate level
      const level = parseInt(data.level);
      if (level < 1 || level > 5) {
        return res.status(400).json({
          success: false,
          message: 'Level must be between 1 and 5'
        });
      }

      // Upsert certification
      const result = await query(`
        INSERT INTO wi_operator_certifications (
          operator_id, work_instruction_id, level,
          certified_date, certified_by, training_type,
          evidence_path, evidence_filename, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
        ON CONFLICT (operator_id, work_instruction_id)
        DO UPDATE SET
          level = EXCLUDED.level,
          certified_date = EXCLUDED.certified_date,
          certified_by = EXCLUDED.certified_by,
          training_type = EXCLUDED.training_type,
          evidence_path = EXCLUDED.evidence_path,
          evidence_filename = EXCLUDED.evidence_filename,
          notes = EXCLUDED.notes,
          status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        data.operator_id,
        wiId,
        level,
        data.certified_date || new Date().toISOString().split('T')[0],
        data.certified_by || null,
        data.training_type || 'INTERNAL',
        data.evidence_path || null,
        data.evidence_filename || null,
        data.notes || null
      ]);

      res.json({
        success: true,
        message: 'Certification saved successfully',
        certification: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error saving certification:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT - Update certification level or details
  app.put('/work-instructions/:id/certifications/:certId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const certId = parseInt(req.params.certId);
      const data = transformToSnakeCase(req.body);

      const allowedFields = ['level', 'certified_date', 'certified_by', 'training_type',
                            'evidence_path', 'evidence_filename', 'notes', 'status'];

      const setClause = [];
      const values = [];
      let paramCount = 1;

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          setClause.push(`${field} = $${paramCount}`);
          values.push(data[field]);
          paramCount++;
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');
      values.push(certId, wiId);

      const result = await query(`
        UPDATE wi_operator_certifications
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount} AND work_instruction_id = $${paramCount + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Certification not found' });
      }

      res.json({
        success: true,
        message: 'Certification updated successfully',
        certification: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating certification:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE - Revoke certification (soft delete - sets status to REVOKED)
  app.delete('/work-instructions/:id/certifications/:certId', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const certId = parseInt(req.params.certId);
      const { revokedBy, reason } = req.query;

      // Update status to REVOKED and log in history
      const result = await query(`
        UPDATE wi_operator_certifications
        SET status = 'REVOKED', notes = COALESCE(notes, '') || E'\n[REVOKED] ' || COALESCE($3, 'No reason provided'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND work_instruction_id = $2
        RETURNING *
      `, [certId, wiId, reason]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Certification not found' });
      }

      // Log in history
      const cert = result.rows[0];
      await query(`
        INSERT INTO wi_certification_history (
          certification_id, operator_id, work_instruction_id,
          previous_level, new_level, level_code,
          change_date, changed_by, notes, change_reason
        ) VALUES ($1, $2, $3, $4, 0, '', CURRENT_DATE, $5, $6, 'REVOKE')
      `, [certId, cert.operator_id, wiId, cert.level, revokedBy || null, reason || 'Certificate revoked']);

      res.json({
        success: true,
        message: 'Certification revoked successfully'
      });
    } catch (error) {
      console.error('Error revoking certification:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET certification history for a WI
  app.get('/work-instructions/:id/certifications/history', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit) || 50;

      const result = await query(`
        SELECT
          wch.*,
          u.first_name || ' ' || u.last_name AS operator_name,
          cb.first_name || ' ' || cb.last_name AS changed_by_name
        FROM wi_certification_history wch
        JOIN users u ON wch.operator_id = u.id
        LEFT JOIN users cb ON wch.changed_by = cb.id
        WHERE wch.work_instruction_id = $1
        ORDER BY wch.created_at DESC
        LIMIT $2
      `, [wiId, limit]);

      res.json({
        success: true,
        history: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching certification history:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // CERTIFICATION EVIDENCE - Upload and download evidence files
  // ==========================================================================

  // POST - Upload evidence to a certification
  app.post('/work-instructions/:id/certifications/:certId/evidence', wiEvidenceUpload.single('evidence'), async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const certId = parseInt(req.params.certId);

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se proporciono archivo' });
      }

      const evidencePath = `/uploads/wi-evidence/${req.file.filename}`;
      const originalFilename = req.file.originalname;

      const result = await query(`
        UPDATE wi_operator_certifications
        SET evidence_path = $1, evidence_filename = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND work_instruction_id = $4
        RETURNING *
      `, [evidencePath, originalFilename, certId, wiId]);

      if (result.rows.length === 0) {
        // Delete uploaded file if cert not found
        fs.unlinkSync(path.join(__dirname, '..', evidencePath));
        return res.status(404).json({ success: false, message: 'Certificacion no encontrada' });
      }

      res.json({
        success: true,
        message: 'Evidencia subida correctamente',
        evidencePath,
        filename: originalFilename
      });
    } catch (error) {
      console.error('Error uploading certification evidence:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET - Download evidence from a certification
  app.get('/work-instructions/:id/certifications/:certId/evidence', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const certId = parseInt(req.params.certId);

      const result = await query(`
        SELECT evidence_path, evidence_filename
        FROM wi_operator_certifications
        WHERE id = $1 AND work_instruction_id = $2
      `, [certId, wiId]);

      if (result.rows.length === 0 || !result.rows[0].evidence_path) {
        return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
      }

      const filePath = path.join(__dirname, '..', result.rows[0].evidence_path);
      const filename = result.rows[0].evidence_filename || 'evidence';

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado en servidor' });
      }

      res.download(filePath, filename);
    } catch (error) {
      console.error('Error downloading certification evidence:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE - Remove evidence from a certification
  app.delete('/work-instructions/:id/certifications/:certId/evidence', async (req, res) => {
    try {
      const wiId = parseInt(req.params.id);
      const certId = parseInt(req.params.certId);

      // Get current evidence path
      const current = await query(`
        SELECT evidence_path FROM wi_operator_certifications
        WHERE id = $1 AND work_instruction_id = $2
      `, [certId, wiId]);

      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Certificacion no encontrada' });
      }

      // Delete file if exists
      if (current.rows[0].evidence_path) {
        const filePath = path.join(__dirname, '..', current.rows[0].evidence_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Clear evidence fields
      await query(`
        UPDATE wi_operator_certifications
        SET evidence_path = NULL, evidence_filename = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND work_instruction_id = $2
      `, [certId, wiId]);

      res.json({ success: true, message: 'Evidencia eliminada' });
    } catch (error) {
      console.error('Error deleting certification evidence:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // OPERATOR WI CERTIFICATIONS - Certifications from operator perspective
  // ==========================================================================

  // GET all WI certifications for an operator
  app.get('/operators/:operatorId/wi-certifications', async (req, res) => {
    try {
      const operatorId = parseInt(req.params.operatorId);
      const includeExpired = req.query.includeExpired === 'true';

      let whereClause = 'woc.operator_id = $1';
      if (!includeExpired) {
        whereClause += " AND woc.status = 'ACTIVE'";
      }

      const result = await query(`
        SELECT
          woc.*,
          wi.title AS wi_title,
          wi.operation_code,
          wi.wi_type,
          c.name AS client_name,
          cb.first_name || ' ' || cb.last_name AS certified_by_name,
          CASE
            WHEN woc.status = 'REVOKED' THEN 'REVOKED'
            WHEN woc.expires_at IS NULL THEN 'ACTIVE'
            WHEN woc.expires_at < CURRENT_DATE THEN 'EXPIRED'
            WHEN woc.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
            ELSE 'ACTIVE'
          END AS effective_status
        FROM wi_operator_certifications woc
        JOIN work_instructions wi ON woc.work_instruction_id = wi.id
        LEFT JOIN clients c ON wi.client_id = c.id
        LEFT JOIN users cb ON woc.certified_by = cb.id
        WHERE ${whereClause}
        ORDER BY wi.wi_type, c.name, wi.title
      `, [operatorId]);

      // Group by client for UI
      const byClient = {};
      for (const cert of result.rows) {
        const clientName = cert.client_name || 'General (BASIC)';
        if (!byClient[clientName]) {
          byClient[clientName] = [];
        }
        byClient[clientName].push(cert);
      }

      // Calculate summary - ILUO: O(1), U(2), L(3), I(4)
      const summary = {
        totalCertifications: result.rows.length,
        levelO: result.rows.filter(c => c.level === 1).length,
        levelU: result.rows.filter(c => c.level === 2).length,
        levelL: result.rows.filter(c => c.level === 3).length,
        levelI: result.rows.filter(c => c.level === 4).length,
        expiringSoon: result.rows.filter(c => c.effective_status === 'EXPIRING_SOON').length,
        expired: result.rows.filter(c => c.effective_status === 'EXPIRED').length
      };

      res.json({
        success: true,
        certifications: transformToCamelCase(result.rows),
        byClient: transformToCamelCase(byClient),
        summary
      });
    } catch (error) {
      console.error('Error fetching operator WI certifications:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET certification history for an operator
  app.get('/operators/:operatorId/wi-certifications/history', async (req, res) => {
    try {
      const operatorId = parseInt(req.params.operatorId);
      const limit = parseInt(req.query.limit) || 50;

      const result = await query(`
        SELECT
          wch.*,
          wi.title AS wi_title,
          wi.operation_code,
          cb.first_name || ' ' || cb.last_name AS changed_by_name
        FROM wi_certification_history wch
        JOIN work_instructions wi ON wch.work_instruction_id = wi.id
        LEFT JOIN users cb ON wch.changed_by = cb.id
        WHERE wch.operator_id = $1
        ORDER BY wch.created_at DESC
        LIMIT $2
      `, [operatorId, limit]);

      res.json({
        success: true,
        history: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching operator certification history:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // ILUO MATRIX & COVERAGE REPORTS
  // ==========================================================================

  // GET ILUO Matrix data (for dashboard)
  app.get('/wi-certifications/matrix', async (req, res) => {
    try {
      const { clientId, lineId, areaId } = req.query;

      let whereClause = "wi.status = 'active'";
      const params = [];
      let paramCount = 0;

      if (clientId) {
        paramCount++;
        whereClause += ` AND wi.client_id = $${paramCount}`;
        params.push(parseInt(clientId));
      }

      // Get WIs with certification counts
      const wiResult = await query(`
        SELECT
          wi.id,
          wi.title,
          wi.operation_code,
          wi.wi_type,
          c.name AS client_name,
          COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.status = 'ACTIVE') AS certified_count,
          COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level = 1 AND woc.status = 'ACTIVE') AS level_o_count,
          COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level = 2 AND woc.status = 'ACTIVE') AS level_u_count,
          COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level = 3 AND woc.status = 'ACTIVE') AS level_l_count,
          COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level = 4 AND woc.status = 'ACTIVE') AS level_i_count
        FROM work_instructions wi
        LEFT JOIN clients c ON wi.client_id = c.id
        LEFT JOIN wi_operator_certifications woc ON wi.id = woc.work_instruction_id
        WHERE ${whereClause}
        GROUP BY wi.id, wi.title, wi.operation_code, wi.wi_type, c.name
        ORDER BY c.name, wi.title
      `, params);

      // Get operators with their certification counts
      const opResult = await query(`
        SELECT
          u.id,
          u.first_name || ' ' || u.last_name AS name,
          u.position,
          COUNT(DISTINCT woc.work_instruction_id) AS total_certifications,
          COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level = 1) AS level_o_count,
          COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level = 2) AS level_u_count,
          COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level = 3) AS level_l_count,
          COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level = 4) AS level_i_count
        FROM users u
        LEFT JOIN wi_operator_certifications woc ON u.id = woc.operator_id AND woc.status = 'ACTIVE'
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.first_name, u.last_name, u.position
        HAVING COUNT(woc.id) > 0
        ORDER BY total_certifications DESC
      `);

      // Get all active certifications to build matrix
      const certResult = await query(`
        SELECT operator_id, work_instruction_id, level
        FROM wi_operator_certifications
        WHERE status = 'ACTIVE'
      `);

      // Build operator objects with wi_X properties for matrix
      const operators = opResult.rows.map(op => {
        const opData = {
          id: op.id,
          name: op.name,
          position: op.position,
          totalCertifications: parseInt(op.total_certifications) || 0,
          levelOCount: parseInt(op.level_o_count) || 0,
          levelUCount: parseInt(op.level_u_count) || 0,
          levelLCount: parseInt(op.level_l_count) || 0,
          levelICount: parseInt(op.level_i_count) || 0
        };
        // Add wi_X properties for each WI
        for (const cert of certResult.rows) {
          if (cert.operator_id === op.id) {
            opData[`wi_${cert.work_instruction_id}`] = cert.level;
          }
        }
        return opData;
      });

      // Coverage metrics
      const coverage = {
        totalWIs: wiResult.rows.length,
        wisWithAtLeast3Ops: wiResult.rows.filter(w => parseInt(w.certified_count) >= 3).length,
        opsWithAtLeast3WIs: opResult.rows.filter(o => parseInt(o.total_certifications) >= 3).length,
        totalOperators: opResult.rows.length
      };

      res.json({
        success: true,
        workInstructions: transformToCamelCase(wiResult.rows),
        operators,
        coverage
      });
    } catch (error) {
      console.error('Error fetching ILUO matrix:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET expiring certifications (alerts)
  app.get('/wi-certifications/expiring', async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days) || 30;

      const result = await query(`
        SELECT
          woc.*,
          u.first_name || ' ' || u.last_name AS operator_name,
          wi.title AS wi_title,
          wi.operation_code,
          c.name AS client_name,
          woc.expires_at - CURRENT_DATE AS days_until_expiry
        FROM wi_operator_certifications woc
        JOIN users u ON woc.operator_id = u.id
        JOIN work_instructions wi ON woc.work_instruction_id = wi.id
        LEFT JOIN clients c ON wi.client_id = c.id
        WHERE woc.status = 'ACTIVE'
        AND woc.expires_at IS NOT NULL
        AND woc.expires_at <= CURRENT_DATE + ($1 || ' days')::INTERVAL
        ORDER BY woc.expires_at ASC
      `, [daysAhead]);

      res.json({
        success: true,
        expiringCertifications: transformToCamelCase(result.rows),
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching expiring certifications:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET certification pivot for an operator (historical table like Skills)
  app.get('/operators/:operatorId/wi-certifications/pivot', async (req, res) => {
    try {
      const operatorId = parseInt(req.params.operatorId);
      const limit = parseInt(req.query.limit) || 20;

      // 1. Get operator info
      const operatorResult = await query(`
        SELECT u.id, u.first_name, u.last_name, u.position, u.email, u.photo_path,
               d.name AS department_name,
               m.first_name || ' ' || m.last_name AS manager_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN users m ON u.manager_id = m.id
        WHERE u.id = $1
      `, [operatorId]);

      if (operatorResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Operator not found' });
      }

      // 2. Get distinct dates from certification history (most recent first)
      const datesResult = await query(`
        SELECT DISTINCT ON (change_date)
          id AS history_id,
          change_date AS date,
          created_at
        FROM wi_certification_history
        WHERE operator_id = $1
        ORDER BY change_date DESC, created_at DESC
        LIMIT $2
      `, [operatorId, limit]);

      const dates = datesResult.rows;

      // 3. Get all WIs where operator has/had certifications
      const wisResult = await query(`
        SELECT DISTINCT
          wi.id AS wi_id,
          wi.title AS wi_title,
          wi.operation_code,
          wi.wi_type,
          c.name AS client_name,
          woc.level AS current_level,
          woc.level_code AS current_level_code,
          woc.certified_date AS current_certified_date,
          woc.expires_at,
          woc.status AS current_status
        FROM wi_operator_certifications woc
        JOIN work_instructions wi ON woc.work_instruction_id = wi.id
        LEFT JOIN clients c ON wi.client_id = c.id
        WHERE woc.operator_id = $1
        ORDER BY wi.wi_type, c.name, wi.title
      `, [operatorId]);

      // 4. Get all history entries for this operator
      const historyResult = await query(`
        SELECT
          wch.id,
          wch.work_instruction_id,
          wch.change_date,
          wch.new_level,
          wch.level_code,
          wch.training_type,
          wch.evidence_path IS NOT NULL AS has_evidence,
          wch.change_reason
        FROM wi_certification_history wch
        WHERE wch.operator_id = $1
        ORDER BY wch.change_date DESC, wch.created_at DESC
      `, [operatorId]);

      // 5. Build pivot structure
      const workInstructions = wisResult.rows.map(wi => {
        // Find certifications for each date
        const certifications = dates.map(d => {
          // Find history entry for this WI on this date
          const histEntry = historyResult.rows.find(h =>
            h.work_instruction_id === wi.wi_id &&
            new Date(h.change_date).toISOString().split('T')[0] === new Date(d.date).toISOString().split('T')[0]
          );

          return {
            historyId: histEntry?.id || null,
            date: d.date,
            level: histEntry?.new_level || null,
            levelCode: histEntry?.level_code || null,
            trainingType: histEntry?.training_type || null,
            hasEvidence: histEntry?.has_evidence || false,
            changeReason: histEntry?.change_reason || null
          };
        });

        return {
          wiId: wi.wi_id,
          wiTitle: wi.wi_title,
          operationCode: wi.operation_code,
          wiType: wi.wi_type,
          clientName: wi.client_name,
          currentLevel: wi.current_level,
          currentLevelCode: wi.current_level_code,
          currentCertifiedDate: wi.current_certified_date,
          expiresAt: wi.expires_at,
          currentStatus: wi.current_status,
          certifications
        };
      });

      // 6. Calculate summary - ILUO (1=O, 2=U, 3=L, 4=I)
      const activeCerts = wisResult.rows.filter(w => w.current_status === 'ACTIVE');
      const summary = {
        totalCertifications: activeCerts.length,
        levelO: activeCerts.filter(w => w.current_level === 1).length,
        levelU: activeCerts.filter(w => w.current_level === 2).length,
        levelL: activeCerts.filter(w => w.current_level === 3).length,
        levelI: activeCerts.filter(w => w.current_level === 4).length,
        avgLevel: activeCerts.length > 0
          ? parseFloat((activeCerts.reduce((sum, w) => sum + w.current_level, 0) / activeCerts.length).toFixed(2))
          : 0,
        expiringSoon: wisResult.rows.filter(w =>
          w.expires_at && new Date(w.expires_at) >= new Date() &&
          new Date(w.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ).length,
        expired: wisResult.rows.filter(w =>
          w.expires_at && new Date(w.expires_at) < new Date()
        ).length
      };

      res.json({
        success: true,
        operator: transformToCamelCase(operatorResult.rows[0]),
        dates: transformToCamelCase(dates),
        workInstructions,
        summary
      });
    } catch (error) {
      console.error('Error fetching operator certification pivot:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET WI summary (for dashboard card)
  app.get('/wi-certifications/summary', async (req, res) => {
    try {
      // Total active WIs
      const wiCount = await query(`
        SELECT COUNT(*) AS total FROM work_instructions WHERE status = 'active'
      `);

      // Total certifications - ILUO (1=O, 2=U, 3=L, 4=I)
      const certCount = await query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE level = 1) AS level_o,
          COUNT(*) FILTER (WHERE level = 2) AS level_u,
          COUNT(*) FILTER (WHERE level = 3) AS level_l,
          COUNT(*) FILTER (WHERE level = 4) AS level_i,
          COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < CURRENT_DATE) AS expired,
          COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at >= CURRENT_DATE AND expires_at < CURRENT_DATE + INTERVAL '30 days') AS expiring_soon
        FROM wi_operator_certifications
        WHERE status = 'ACTIVE'
      `);

      // Coverage 3x1
      const coverage3x1 = await query(`
        SELECT COUNT(*) AS meets_target
        FROM (
          SELECT work_instruction_id
          FROM wi_operator_certifications
          WHERE status = 'ACTIVE'
          GROUP BY work_instruction_id
          HAVING COUNT(DISTINCT operator_id) >= 3
        ) sub
      `);

      // Coverage 1x3
      const coverage1x3 = await query(`
        SELECT COUNT(*) AS meets_target
        FROM (
          SELECT operator_id
          FROM wi_operator_certifications
          WHERE status = 'ACTIVE'
          GROUP BY operator_id
          HAVING COUNT(DISTINCT work_instruction_id) >= 3
        ) sub
      `);

      res.json({
        success: true,
        summary: {
          totalWorkInstructions: parseInt(wiCount.rows[0].total),
          totalCertifications: parseInt(certCount.rows[0].total),
          byLevel: {
            o: parseInt(certCount.rows[0].level_o),
            u: parseInt(certCount.rows[0].level_u),
            l: parseInt(certCount.rows[0].level_l),
            i: parseInt(certCount.rows[0].level_i)
          },
          expired: parseInt(certCount.rows[0].expired),
          expiringSoon: parseInt(certCount.rows[0].expiring_soon),
          coverage3x1: parseInt(coverage3x1.rows[0].meets_target),
          coverage1x3: parseInt(coverage1x3.rows[0].meets_target)
        }
      });
    } catch (error) {
      console.error('Error fetching WI certification summary:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================================================
  // CERTIFICATION SCALES - Configuración de escalas (ILUO, 1-5, etc.)
  // ==========================================================================

  // GET all certification scales
  app.get('/wi-certification-scales', async (req, res) => {
    try {
      const scalesResult = await query(`
        SELECT * FROM wi_certification_scales
        WHERE is_active = true
        ORDER BY is_default DESC, name
      `);

      // Get levels for each scale
      const scales = [];
      for (const scale of scalesResult.rows) {
        const levelsResult = await query(`
          SELECT * FROM wi_certification_scale_levels
          WHERE scale_id = $1
          ORDER BY level_value
        `, [scale.id]);

        scales.push({
          ...transformToCamelCase(scale),
          levels: transformToCamelCase(levelsResult.rows)
        });
      }

      res.json({ success: true, scales });
    } catch (error) {
      console.error('Error fetching certification scales:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET single scale with levels
  app.get('/wi-certification-scales/:id', async (req, res) => {
    try {
      const scaleId = parseInt(req.params.id);

      const scaleResult = await query(`
        SELECT * FROM wi_certification_scales WHERE id = $1
      `, [scaleId]);

      if (scaleResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Scale not found' });
      }

      const levelsResult = await query(`
        SELECT * FROM wi_certification_scale_levels
        WHERE scale_id = $1
        ORDER BY level_value
      `, [scaleId]);

      res.json({
        success: true,
        scale: {
          ...transformToCamelCase(scaleResult.rows[0]),
          levels: transformToCamelCase(levelsResult.rows)
        }
      });
    } catch (error) {
      console.error('Error fetching certification scale:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET default scale
  app.get('/wi-certification-scales/default', async (req, res) => {
    try {
      const scaleResult = await query(`
        SELECT * FROM wi_certification_scales
        WHERE is_default = true AND is_active = true
        LIMIT 1
      `);

      if (scaleResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'No default scale configured' });
      }

      const levelsResult = await query(`
        SELECT * FROM wi_certification_scale_levels
        WHERE scale_id = $1
        ORDER BY level_value
      `, [scaleResult.rows[0].id]);

      res.json({
        success: true,
        scale: {
          ...transformToCamelCase(scaleResult.rows[0]),
          levels: transformToCamelCase(levelsResult.rows)
        }
      });
    } catch (error) {
      console.error('Error fetching default scale:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

};

module.exports = setupWorkInstructionsEndpoints;
