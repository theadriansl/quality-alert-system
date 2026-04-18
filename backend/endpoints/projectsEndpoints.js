/**
 * Projects Endpoints - PostgreSQL Implementation with CRUD
 * Handles projects and project parts management
 */

const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// ============================================================================
// TIMELINE HELPER
// ============================================================================

async function addClientTimelineEvent(clientId, eventType, description, userName) {
  try {
    await query(`
      INSERT INTO client_timeline (client_id, event_type, event_category, description, user_name)
      VALUES ($1, $2, $3, $4, $5)
    `, [clientId, eventType, 'projects', description, userName || 'System']);
  } catch (error) {
    console.error('Error adding timeline event:', error);
  }
}

// ============================================================================
// PROJECTS ENDPOINTS
// ============================================================================

const setupProjectsEndpoints = (app) => {

  // ==========================================================================
  // GET /projects/list - Get all projects
  // ==========================================================================
  app.get('/projects/list', async (req, res) => {
    try {
      let queryText = `
        SELECT p.*, COUNT(cp.id) as total_parts
        FROM projects p
        LEFT JOIN client_parts cp ON p.id = cp.project_id
      `;

      const conditions = [];
      const params = [];
      let paramCount = 0;

      // Filter by client
      if (req.query.clientId) {
        paramCount++;
        conditions.push(`p.client_id = $${paramCount}`);
        params.push(parseInt(req.query.clientId));
      }

      // Filter by status
      if (req.query.status) {
        paramCount++;
        conditions.push(`p.status = $${paramCount}`);
        params.push(req.query.status);
      }

      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      queryText += ' GROUP BY p.id ORDER BY p.created_at DESC';

      const result = await query(queryText, params);

      res.json({
        success: true,
        projects: transformToCamelCase(result.rows),
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching projects',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /projects/:id - Get single project with parts
  // ==========================================================================
  app.get('/projects/:id', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);

      const projectResult = await query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const partsResult = await query(
        'SELECT * FROM client_parts WHERE project_id = $1 ORDER BY created_at',
        [projectId]
      );

      const project = {
        ...projectResult.rows[0],
        parts: partsResult.rows,
        total_parts: partsResult.rows.length
      };

      res.json({
        success: true,
        project: transformToCamelCase(project)
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching project',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /projects/create - Create new project
  // ==========================================================================
  app.post('/projects/create', async (req, res) => {
    try {
      const data = transformToSnakeCase(req.body);

      // Validation
      if (!data.project_number || !data.project_name || !data.client_id) {
        return res.status(400).json({
          success: false,
          message: 'project_number, project_name, and client_id are required'
        });
      }

      // Get client name
      const clientResult = await query(
        'SELECT name FROM clients WHERE id = $1',
        [data.client_id]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Insert project
      const result = await query(`
        INSERT INTO projects (
          project_number, project_name, client_id, client_name,
          description, status, start_date, target_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        data.project_number,
        data.project_name,
        data.client_id,
        clientResult.rows[0].name,
        data.description || '',
        data.status || 'Planning',
        data.start_date || null,
        data.target_end_date || null
      ]);

      const project = result.rows[0];

      // Create parts in client_parts (BOM Global) if provided
      const parts = req.body.parts || [];
      const createdParts = [];

      for (const part of parts) {
        try {
          const partResult = await query(`
            INSERT INTO client_parts (
              client_id, project_id, part_number, client_part_number, part_name,
              description, revision, specifications, weight, snp_quantity, snp_volume,
              unit_cost, currency, active, custom_fields, parent_part_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (client_id, part_number) DO UPDATE SET
              project_id = EXCLUDED.project_id,
              part_name = EXCLUDED.part_name,
              description = EXCLUDED.description,
              revision = EXCLUDED.revision,
              specifications = EXCLUDED.specifications,
              weight = EXCLUDED.weight,
              snp_quantity = EXCLUDED.snp_quantity,
              snp_volume = EXCLUDED.snp_volume,
              unit_cost = EXCLUDED.unit_cost,
              currency = EXCLUDED.currency,
              custom_fields = EXCLUDED.custom_fields
            RETURNING *
          `, [
            data.client_id,
            project.id,
            part.partNumber,
            part.clientPartNumber || null,
            part.partName,
            part.description || null,
            part.revision || null,
            part.specifications || null,
            part.weight || null,
            part.snpQuantity || null,
            part.snpVolume || null,
            part.unitCost || null,
            part.currency || 'USD',
            true,
            JSON.stringify(part.customFields || {}),
            part.parentPartId || null
          ]);
          createdParts.push(partResult.rows[0]);
        } catch (partError) {
          console.error('Error creating part:', part.partNumber, partError.message);
        }
      }

      console.log(`✅ Project created with ${createdParts.length} parts in BOM Global`);

      // Add timeline event
      await addClientTimelineEvent(
        data.client_id,
        'project_created',
        `Project "${project.project_name}" created with ${createdParts.length} parts`,
        req.body.createdBy
      );

      res.json({
        success: true,
        message: 'Project created successfully',
        project: transformToCamelCase(project),
        partsCreated: createdParts.length
      });

    } catch (error) {
      console.error('Error creating project:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A project with this project_number already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating project',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // PUT /projects/:id - Update project
  // ==========================================================================
  app.put('/projects/:id', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updates = transformToSnakeCase(req.body);

      // Build dynamic UPDATE query
      const allowedFields = [
        'project_number', 'project_name', 'description',
        'status', 'start_date', 'target_end_date'
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

      // Add updated_at
      setClause.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(projectId);

      const result = await query(`
        UPDATE projects
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const project = result.rows[0];

      // Add timeline event
      await addClientTimelineEvent(
        project.client_id,
        'project_updated',
        `Project "${project.project_name}" updated`,
        req.body.updatedBy
      );

      res.json({
        success: true,
        message: 'Project updated successfully',
        project: transformToCamelCase(project)
      });

    } catch (error) {
      console.error('Error updating project:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A project with this project_number already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating project',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // DELETE /projects/:id - Delete project
  // ==========================================================================
  app.delete('/projects/:id', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);

      // Get project info before deleting
      const result = await query(`
        DELETE FROM projects
        WHERE id = $1
        RETURNING *
      `, [projectId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const project = result.rows[0];

      // Add timeline event
      await addClientTimelineEvent(
        project.client_id,
        'project_deleted',
        `Project "${project.project_name}" deleted`,
        req.body.deletedBy || req.query.deletedBy
      );

      res.json({
        success: true,
        message: 'Project deleted successfully (parts were also deleted due to CASCADE)',
        project: transformToCamelCase(project)
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting project',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /projects/:projectId/parts - Get parts for a project
  // ==========================================================================
  app.get('/projects/:projectId/parts', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const projectResult = await query(
        'SELECT project_number, project_name FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const partsResult = await query(
        'SELECT * FROM client_parts WHERE project_id = $1 ORDER BY created_at',
        [projectId]
      );

      res.json({
        success: true,
        projectNumber: projectResult.rows[0].project_number,
        projectName: projectResult.rows[0].project_name,
        parts: transformToCamelCase(partsResult.rows),
        stats: {
          totalParts: partsResult.rows.length
        }
      });
    } catch (error) {
      console.error('Error fetching project parts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching project parts',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /projects/:projectId/parts - Add part to project (uses client_parts)
  // ==========================================================================
  app.post('/projects/:projectId/parts', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const data = transformToSnakeCase(req.body);

      // Validation
      if (!data.part_number || !data.part_name) {
        return res.status(400).json({
          success: false,
          message: 'part_number and part_name are required'
        });
      }

      // Verify project exists and get client_id
      const projectResult = await query(
        'SELECT id, project_name, client_id FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const clientId = projectResult.rows[0].client_id;

      // Insert part into client_parts with project_id
      const result = await query(`
        INSERT INTO client_parts (
          client_id, project_id, part_number, client_part_number, part_name,
          description, revision, specifications, weight,
          snp_quantity, snp_volume, unit_cost, currency, active, custom_fields, bom_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, '{}', 1)
        RETURNING *
      `, [
        clientId,
        projectId,
        data.part_number,
        data.client_part_number || '',
        data.part_name,
        data.description || '',
        data.revision || '',
        data.specifications || null,
        data.weight || null,
        data.snp_quantity || null,
        data.snp_volume || null,
        data.unit_cost || null,
        data.currency || 'USD'
      ]);

      res.json({
        success: true,
        message: 'Part added successfully',
        part: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error adding part:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A part with this part_number already exists for this client'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error adding part',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // PUT /projects/:projectId/parts/:partId - Update part
  // ==========================================================================
  app.put('/projects/:projectId/parts/:partId', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const partId = parseInt(req.params.partId);
      const updates = transformToSnakeCase(req.body);

      // Build dynamic UPDATE query
      const allowedFields = [
        'part_number', 'client_part_number', 'part_name', 'description',
        'revision', 'specifications', 'weight', 'snp_quantity',
        'snp_volume', 'unit_cost', 'currency'
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

      // Add updated_at
      setClause.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(partId, projectId);

      const result = await query(`
        UPDATE client_parts
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount} AND project_id = $${paramCount + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      res.json({
        success: true,
        message: 'Part updated successfully',
        part: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error updating part:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A part with this part_number already exists in this project'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating part',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // DELETE /projects/:projectId/parts/:partId - Delete part
  // ==========================================================================
  app.delete('/projects/:projectId/parts/:partId', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const partId = parseInt(req.params.partId);

      const result = await query(`
        DELETE FROM client_parts
        WHERE id = $1 AND project_id = $2
        RETURNING *
      `, [partId, projectId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      res.json({
        success: true,
        message: 'Part deleted successfully',
        part: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error deleting part:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting part',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /clients/:clientId/projects - Get projects for a client
  // ==========================================================================
  app.get('/clients/:clientId/projects', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const clientResult = await query(
        'SELECT id, name, alias FROM clients WHERE id = $1',
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const projectsResult = await query(`
        SELECT p.*, COUNT(cp.id) as total_parts
        FROM projects p
        LEFT JOIN client_parts cp ON p.id = cp.project_id
        WHERE p.client_id = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `, [clientId]);

      res.json({
        success: true,
        client: transformToCamelCase(clientResult.rows[0]),
        projects: transformToCamelCase(projectsResult.rows),
        count: projectsResult.rows.length
      });
    } catch (error) {
      console.error('Error fetching client projects:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching client projects',
        error: error.message
      });
    }
  });

};

module.exports = setupProjectsEndpoints;
