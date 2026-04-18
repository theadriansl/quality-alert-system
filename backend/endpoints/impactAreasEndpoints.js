const { query, pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// IMPACT AREAS CONFIGURATION ENDPOINTS
// ============================================================================

// Get all impact areas (active only by default)
async function getAllImpactAreas(req, res) {
  try {
    const { includeInactive } = req.query;
    console.log('🔄 Fetching impact areas configuration...');

    let queryText = `
      SELECT *
      FROM impact_areas_config
    `;

    if (!includeInactive || includeInactive === 'false') {
      queryText += ' WHERE is_active = true';
    }

    queryText += ' ORDER BY display_order, area_name';

    const result = await query(queryText);

    const areas = result.rows.map(row => transformToCamelCase(row));

    console.log(`✅ Found ${areas.length} impact areas`);

    res.json({
      success: true,
      areas,
      total: areas.length
    });

  } catch (error) {
    console.error('❌ Error fetching impact areas:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching impact areas configuration',
      error: error.message
    });
  }
}

// Get single impact area by ID
async function getImpactAreaById(req, res) {
  try {
    const { id } = req.params;
    console.log(`🔄 Fetching impact area ID: ${id}`);

    const result = await query(
      'SELECT * FROM impact_areas_config WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Impact area with ID ${id} not found`
      });
    }

    const area = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      area
    });

  } catch (error) {
    console.error(`❌ Error fetching impact area ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching impact area',
      error: error.message
    });
  }
}

// Create new impact area
async function createImpactArea(req, res) {
  const client = await pool.connect();

  try {
    const {
      areaKey,
      areaName,
      icon,
      color,
      description,
      subsections,
      defaultValidators,
      isActive,
      displayOrder
    } = req.body;

    console.log('🔄 Creating new impact area...');

    // Validation
    if (!areaKey || !areaName) {
      return res.status(400).json({
        success: false,
        message: 'Area key and name are required'
      });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO impact_areas_config (
        area_key,
        area_name,
        icon,
        color,
        description,
        subsections,
        default_validators,
        is_active,
        display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      areaKey,
      areaName,
      icon || '📋',
      color || '#6b7280',
      description || '',
      JSON.stringify(subsections || []),
      JSON.stringify(defaultValidators || []),
      isActive !== undefined ? isActive : true,
      displayOrder || 999
    ]);

    await client.query('COMMIT');

    const newArea = transformToCamelCase(result.rows[0]);

    console.log(`✅ Impact area created: ${newArea.areaName}`);

    res.status(201).json({
      success: true,
      message: 'Impact area created successfully',
      area: newArea
    });

  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'An impact area with this key already exists'
      });
    }

    console.error('❌ Error creating impact area:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating impact area',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Update impact area
async function updateImpactArea(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      areaKey,
      areaName,
      icon,
      color,
      description,
      subsections,
      defaultValidators,
      isActive,
      displayOrder
    } = req.body;

    console.log(`🔄 Updating impact area ID: ${id}`);

    await client.query('BEGIN');

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (areaKey !== undefined) {
      updates.push(`area_key = $${paramIndex++}`);
      values.push(areaKey);
    }
    if (areaName !== undefined) {
      updates.push(`area_name = $${paramIndex++}`);
      values.push(areaName);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(icon);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (subsections !== undefined) {
      updates.push(`subsections = $${paramIndex++}`);
      values.push(JSON.stringify(subsections));
    }
    if (defaultValidators !== undefined) {
      updates.push(`default_validators = $${paramIndex++}`);
      values.push(JSON.stringify(defaultValidators));
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    if (displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(displayOrder);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE impact_areas_config
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: `Impact area with ID ${id} not found`
      });
    }

    await client.query('COMMIT');

    const updatedArea = transformToCamelCase(result.rows[0]);

    console.log(`✅ Impact area updated: ${updatedArea.areaName}`);

    res.json({
      success: true,
      message: 'Impact area updated successfully',
      area: updatedArea
    });

  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'An impact area with this key already exists'
      });
    }

    console.error(`❌ Error updating impact area ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error updating impact area',
      error: error.message
    });
  } finally {
    client.release();
  }
}

// Delete impact area (soft delete - just set inactive)
async function deleteImpactArea(req, res) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    console.log(`🔄 Deleting impact area ID: ${id}`);

    let result;

    if (permanent === 'true') {
      // Permanent delete
      result = await query(`
        DELETE FROM impact_areas_config
        WHERE id = $1
        RETURNING area_name
      `, [id]);
    } else {
      // Soft delete (set inactive)
      result = await query(`
        UPDATE impact_areas_config
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING area_name
      `, [id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Impact area with ID ${id} not found`
      });
    }

    console.log(`✅ Impact area deleted: ${result.rows[0].area_name}`);

    res.json({
      success: true,
      message: permanent === 'true'
        ? 'Impact area permanently deleted'
        : 'Impact area deactivated successfully'
    });

  } catch (error) {
    console.error(`❌ Error deleting impact area ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error deleting impact area',
      error: error.message
    });
  }
}

// Reorder impact areas
async function reorderImpactAreas(req, res) {
  const client = await pool.connect();

  try {
    const { orderedIds } = req.body; // Array of IDs in new order

    console.log('🔄 Reordering impact areas...');

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be a non-empty array'
      });
    }

    await client.query('BEGIN');

    // Update display_order for each area
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE impact_areas_config SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [i + 1, orderedIds[i]]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ Reordered ${orderedIds.length} impact areas`);

    res.json({
      success: true,
      message: 'Impact areas reordered successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reordering impact areas:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering impact areas',
      error: error.message
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getAllImpactAreas,
  getImpactAreaById,
  createImpactArea,
  updateImpactArea,
  deleteImpactArea,
  reorderImpactAreas
};
