/**
 * Work Instructions Endpoints - PostgreSQL Implementation
 * Complete CRUD with versioning, steps, risk assessment
 */

const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

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

};

module.exports = setupWorkInstructionsEndpoints;
