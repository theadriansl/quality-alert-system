/**
 * Team Presets Endpoints
 * Manages user-specific team configuration presets for 8D workflow
 */

const { query } = require('../config/database');

/**
 * Helper function to check if user is admin
 */
async function isUserAdmin(userId) {
  const result = await query(
    'SELECT system_role FROM users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0 && result.rows[0].system_role === 'admin';
}

/**
 * GET /users/:id/team-presets
 * Get all team presets for a specific user
 */
async function getUserTeamPresets(req, res) {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const result = await query(
      `SELECT id, user_id, preset_name, issue_user_ids, countermeasure_user_ids,
              confirmation_user_ids, created_at, updated_at
       FROM team_presets
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      presets: result.rows.map(preset => ({
        id: preset.id,
        userId: preset.user_id,  // Include creator's user_id
        name: preset.preset_name,
        issueUserIds: preset.issue_user_ids || [],
        countermeasureUserIds: preset.countermeasure_user_ids || [],
        confirmationUserIds: preset.confirmation_user_ids || [],
        createdAt: preset.created_at,
        updatedAt: preset.updated_at
      })),
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching team presets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener presets',
      error: error.message
    });
  }
}

/**
 * POST /users/:id/team-presets
 * Create a new team preset for a user
 */
async function createTeamPreset(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const { name, issueUserIds, countermeasureUserIds, confirmationUserIds } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del preset es requerido'
      });
    }

    // Validate arrays (can be empty but must be arrays)
    if (!Array.isArray(issueUserIds) || !Array.isArray(countermeasureUserIds) || !Array.isArray(confirmationUserIds)) {
      return res.status(400).json({
        success: false,
        message: 'Los 3 arrays de userIds (Issue, Countermeasure, Confirmation) son requeridos'
      });
    }

    // Check if user already has 12 presets
    const countResult = await query(
      'SELECT COUNT(*) as count FROM team_presets WHERE user_id = $1',
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 12) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 12 atajos permitidos por usuario'
      });
    }

    // Check if preset name already exists for this user
    const existingResult = await query(
      'SELECT id FROM team_presets WHERE user_id = $1 AND preset_name = $2',
      [userId, name]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un preset con ese nombre'
      });
    }

    // Insert new preset (convert arrays to JSON strings for PostgreSQL)
    const result = await query(
      `INSERT INTO team_presets
       (user_id, preset_name, issue_user_ids, countermeasure_user_ids, confirmation_user_ids)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, preset_name, issue_user_ids, countermeasure_user_ids,
                 confirmation_user_ids, created_at, updated_at`,
      [userId, name, JSON.stringify(issueUserIds), JSON.stringify(countermeasureUserIds), JSON.stringify(confirmationUserIds)]
    );

    const newPreset = result.rows[0];

    res.status(201).json({
      success: true,
      preset: {
        id: newPreset.id,
        name: newPreset.preset_name,
        issueUserIds: newPreset.issue_user_ids || [],
        countermeasureUserIds: newPreset.countermeasure_user_ids || [],
        confirmationUserIds: newPreset.confirmation_user_ids || [],
        createdAt: newPreset.created_at,
        updatedAt: newPreset.updated_at
      },
      message: `Preset "${name}" creado exitosamente`
    });

  } catch (error) {
    console.error('Error creating team preset:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un preset con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear preset',
      error: error.message
    });
  }
}

/**
 * PUT /users/:userId/team-presets/:presetId
 * Update an existing team preset
 */
async function updateTeamPreset(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    const presetId = parseInt(req.params.presetId);
    const { name, issueUserIds, countermeasureUserIds, confirmationUserIds } = req.body;

    if (isNaN(userId) || isNaN(presetId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs inválidos'
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`preset_name = $${paramCount++}`);
      values.push(name);
    }

    if (Array.isArray(issueUserIds)) {
      updates.push(`issue_user_ids = $${paramCount++}`);
      values.push(JSON.stringify(issueUserIds));
    }

    if (Array.isArray(countermeasureUserIds)) {
      updates.push(`countermeasure_user_ids = $${paramCount++}`);
      values.push(JSON.stringify(countermeasureUserIds));
    }

    if (Array.isArray(confirmationUserIds)) {
      updates.push(`confirmation_user_ids = $${paramCount++}`);
      values.push(JSON.stringify(confirmationUserIds));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    // Add WHERE clause parameters
    values.push(presetId, userId);

    const updateQuery = `
      UPDATE team_presets
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING id, user_id, preset_name, issue_user_ids, countermeasure_user_ids,
                confirmation_user_ids, created_at, updated_at
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Preset no encontrado'
      });
    }

    const updatedPreset = result.rows[0];

    res.json({
      success: true,
      preset: {
        id: updatedPreset.id,
        name: updatedPreset.preset_name,
        issueUserIds: updatedPreset.issue_user_ids || [],
        countermeasureUserIds: updatedPreset.countermeasure_user_ids || [],
        confirmationUserIds: updatedPreset.confirmation_user_ids || [],
        createdAt: updatedPreset.created_at,
        updatedAt: updatedPreset.updated_at
      },
      message: 'Preset actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating team preset:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un preset con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar preset',
      error: error.message
    });
  }
}

/**
 * DELETE /users/:userId/team-presets/:presetId
 * Delete a team preset
 * Admins can delete any preset, users can only delete their own
 */
async function deleteTeamPreset(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    const presetId = parseInt(req.params.presetId);

    if (isNaN(userId) || isNaN(presetId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs inválidos'
      });
    }

    // Check if user is admin
    const userIsAdmin = await isUserAdmin(userId);

    let result;
    if (userIsAdmin) {
      // Admins can delete any preset
      result = await query(
        'DELETE FROM team_presets WHERE id = $1 RETURNING preset_name',
        [presetId]
      );
    } else {
      // Regular users can only delete their own presets
      result = await query(
        'DELETE FROM team_presets WHERE id = $1 AND user_id = $2 RETURNING preset_name',
        [presetId, userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: userIsAdmin ? 'Preset no encontrado' : 'Preset no encontrado o no tienes permisos para eliminarlo'
      });
    }

    res.json({
      success: true,
      message: `Preset "${result.rows[0].preset_name}" eliminado exitosamente`
    });

  } catch (error) {
    console.error('Error deleting team preset:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar preset',
      error: error.message
    });
  }
}

module.exports = {
  getUserTeamPresets,
  createTeamPreset,
  updateTeamPreset,
  deleteTeamPreset
};
