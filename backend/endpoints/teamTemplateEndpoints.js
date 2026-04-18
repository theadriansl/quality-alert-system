const { pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// Get all team templates for current user
async function getTeamTemplates(req, res) {
  try {
    const userId = req.user ? req.user.id : null;

    const result = await pool.query(
      `SELECT
        t.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM team_templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.created_by = $1
      ORDER BY t.created_at DESC`,
      [userId]
    );

    const templates = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching team templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team templates',
      error: error.message
    });
  }
}

// Get team template by ID
async function getTeamTemplateById(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM team_templates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team template not found'
      });
    }

    const template = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching team template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team template',
      error: error.message
    });
  }
}

// Create new team template
async function createTeamTemplate(req, res) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      name,
      description,
      reviewBoard,
      validationTeams,
      involvedAreas
    } = req.body;

    const createdBy = req.user ? req.user.id : null;

    // Validation
    if (!name) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    const result = await client.query(
      `INSERT INTO team_templates (
        name,
        description,
        review_board,
        validation_teams,
        involved_areas,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        name,
        description || null,
        JSON.stringify(reviewBoard || { primary: null, members: [] }),
        JSON.stringify(validationTeams || {}),
        JSON.stringify(involvedAreas || []),
        createdBy
      ]
    );

    await client.query('COMMIT');

    const template = transformToCamelCase(result.rows[0]);

    console.log(`✅ Team template created: ${name} (ID: ${template.id})`);

    res.status(201).json({
      success: true,
      message: 'Team template created successfully',
      template
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating team template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team template',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Update team template
async function updateTeamTemplate(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const {
      name,
      description,
      reviewBoard,
      validationTeams,
      involvedAreas
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (reviewBoard !== undefined) {
      updates.push(`review_board = $${paramIndex++}`);
      values.push(JSON.stringify(reviewBoard));
    }
    if (validationTeams !== undefined) {
      updates.push(`validation_teams = $${paramIndex++}`);
      values.push(JSON.stringify(validationTeams));
    }
    if (involvedAreas !== undefined) {
      updates.push(`involved_areas = $${paramIndex++}`);
      values.push(JSON.stringify(involvedAreas));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);
    const updateQuery = `
      UPDATE team_templates
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Team template not found'
      });
    }

    await client.query('COMMIT');

    const template = transformToCamelCase(result.rows[0]);

    console.log(`✅ Team template updated: ID ${id}`);

    res.json({
      success: true,
      message: 'Team template updated successfully',
      template
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating team template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team template',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Delete team template
async function deleteTeamTemplate(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM team_templates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Team template not found'
      });
    }

    await client.query('COMMIT');

    console.log(`✅ Team template deleted: ID ${id}`);

    res.json({
      success: true,
      message: 'Team template deleted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting team template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team template',
      error: error.message
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getTeamTemplates,
  getTeamTemplateById,
  createTeamTemplate,
  updateTeamTemplate,
  deleteTeamTemplate
};
