const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// DEFECT CATEGORIES CRUD
// ============================================================================

// GET all categories
router.get('/categories', authenticateToken, async (req, res) => {
  const { includeInactive } = req.query;

  try {
    let sql = 'SELECT * FROM defect_categories';
    if (!includeInactive) {
      sql += ' WHERE is_active = true';
    }
    sql += ' ORDER BY display_order, name';

    const result = await query(sql);
    res.json({
      success: true,
      categories: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

// GET single category
router.get('/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('SELECT * FROM defect_categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({
      success: true,
      category: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, message: 'Error fetching category' });
  }
});

// CREATE category
router.post('/categories', authenticateToken, async (req, res) => {
  const { code, name, description, color, displayOrder } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Código y nombre son requeridos' });
  }

  try {
    const result = await query(
      `INSERT INTO defect_categories (code, name, description, color, display_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code.toUpperCase().replace(/\s+/g, '_'), name, description || null, color || '#6b7280', displayOrder || 0, req.user.id]
    );

    res.json({
      success: true,
      category: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, message: 'Ya existe una categoría con ese código' });
    } else {
      res.status(500).json({ success: false, message: 'Error creating category' });
    }
  }
});

// UPDATE category
router.put('/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, name, description, color, displayOrder, isActive } = req.body;

  try {
    const result = await query(
      `UPDATE defect_categories SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        color = COALESCE($4, color),
        display_order = COALESCE($5, display_order),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [code ? code.toUpperCase().replace(/\s+/g, '_') : null, name, description, color, displayOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      category: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
});

// DELETE category (soft delete or hard delete if no defects)
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;

  try {
    // Check if category has defects
    const usageCheck = await query(
      'SELECT COUNT(*) FROM defect_types WHERE category_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      if (hard === 'true') {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar: la categoría tiene defectos asignados. Mueve los defectos a otra categoría primero.'
        });
      }
      // Soft delete
      await query('UPDATE defect_categories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    } else {
      // Hard delete if no defects
      await query('DELETE FROM defect_categories WHERE id = $1', [id]);
    }

    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

// ============================================================================
// DEFECT TYPES CRUD
// ============================================================================

// GET all defect types (with category info)
router.get('/types', authenticateToken, async (req, res) => {
  const { includeInactive, categoryId } = req.query;

  try {
    let sql = `
      SELECT dt.*, dc.name as category_name, dc.code as category_code, dc.color as category_color
      FROM defect_types dt
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
    `;
    const params = [];
    const conditions = [];

    if (!includeInactive) {
      conditions.push('dt.is_active = true');
    }
    if (categoryId) {
      params.push(categoryId);
      conditions.push(`dt.category_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY dc.display_order, dt.display_order, dt.name';

    const result = await query(sql, params);
    res.json({
      success: true,
      defectTypes: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching defect types:', error);
    res.status(500).json({ success: false, message: 'Error fetching defect types' });
  }
});

// GET single defect type
router.get('/types/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('SELECT * FROM defect_types WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defect type not found' });
    }
    res.json({
      success: true,
      defectType: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching defect type:', error);
    res.status(500).json({ success: false, message: 'Error fetching defect type' });
  }
});

// CREATE defect type
router.post('/types', authenticateToken, async (req, res) => {
  const { code, name, description, color, displayOrder, categoryId } = req.body;

  if (!code || !name || !categoryId) {
    return res.status(400).json({ success: false, message: 'Código, nombre y categoría son requeridos' });
  }

  try {
    const result = await query(
      `INSERT INTO defect_types (code, name, description, color, display_order, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code.toUpperCase().replace(/\s+/g, '_'), name, description, color || '#3b82f6', displayOrder || 0, categoryId]
    );

    res.json({
      success: true,
      defectType: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating defect type:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, message: 'Ya existe un defecto con ese código' });
    } else {
      res.status(500).json({ success: false, message: 'Error creating defect type' });
    }
  }
});

// UPDATE defect type
router.put('/types/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, name, description, color, displayOrder, isActive, categoryId } = req.body;

  try {
    const result = await query(
      `UPDATE defect_types SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        color = COALESCE($4, color),
        display_order = COALESCE($5, display_order),
        is_active = COALESCE($6, is_active),
        category_id = COALESCE($7, category_id),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [code ? code.toUpperCase().replace(/\s+/g, '_') : null, name, description, color, displayOrder, isActive, categoryId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defect type not found' });
    }

    res.json({
      success: true,
      defectType: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating defect type:', error);
    res.status(500).json({ success: false, message: 'Error updating defect type' });
  }
});

// DELETE defect type (soft delete)
router.delete('/types/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;

  try {
    if (hard === 'true') {
      // Check if used in any defect entry
      const usageCheck = await query(
        'SELECT COUNT(*) FROM defect_entries_v2 WHERE defect_type_id = $1',
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar: el tipo de defecto está siendo usado en registros'
        });
      }

      await query('DELETE FROM defect_types WHERE id = $1', [id]);
    } else {
      await query('UPDATE defect_types SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }

    res.json({ success: true, message: 'Defect type deleted' });
  } catch (error) {
    console.error('Error deleting defect type:', error);
    res.status(500).json({ success: false, message: 'Error deleting defect type' });
  }
});

// ============================================================================
// PART DEFECT CONFIG CRUD
// ============================================================================

// GET defect types configured for a specific part
router.get('/parts/:partId/defects', authenticateToken, async (req, res) => {
  const { partId } = req.params;

  try {
    const result = await query(`
      SELECT dt.*, pdc.id as config_id, pdc.is_active as config_active
      FROM defect_types dt
      INNER JOIN part_defect_config pdc ON pdc.defect_type_id = dt.id
      WHERE pdc.part_id = $1 AND pdc.is_active = true AND dt.is_active = true
      ORDER BY dt.display_order, dt.name
    `, [partId]);

    res.json({
      success: true,
      defectTypes: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching part defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching part defects' });
  }
});

// GET defects for capture (simplified format for tablet, grouped by category)
router.get('/parts/:partId/config', authenticateToken, async (req, res) => {
  const { partId } = req.params;

  try {
    const result = await query(`
      SELECT dt.id, dt.code, dt.name, dt.color, dt.description,
             dt.category_id, dc.name as category_name, dc.color as category_color, dc.display_order as category_order
      FROM defect_types dt
      INNER JOIN part_defect_config pdc ON pdc.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE pdc.part_id = $1 AND pdc.is_active = true AND dt.is_active = true
      ORDER BY dc.display_order, dc.name, dt.display_order, dt.name
    `, [partId]);

    res.json({
      success: true,
      defects: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching part config for capture:', error);
    res.status(500).json({ success: false, message: 'Error fetching defects' });
  }
});

// INCREMENT OK counter
router.post('/ok-count', authenticateToken, async (req, res) => {
  const { stationId, shiftId, inspectorId, partId } = req.body;

  try {
    const result = await query(`
      INSERT INTO inspection_ok_counts (station_id, shift_id, inspector_id, part_id, ok_count, inspection_date)
      VALUES ($1, $2, $3, $4, 1, CURRENT_DATE)
      ON CONFLICT (station_id, shift_id, inspector_id, part_id, inspection_date)
      DO UPDATE SET ok_count = inspection_ok_counts.ok_count + 1, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [stationId || null, shiftId || null, inspectorId || req.user.id, partId || null]);

    res.json({
      success: true,
      okCount: result.rows[0].ok_count
    });
  } catch (error) {
    console.error('Error incrementing OK count:', error);
    res.status(500).json({ success: false, message: 'Error incrementing OK count' });
  }
});

// GET all parts with their defect count (for admin list)
router.get('/parts-config', authenticateToken, async (req, res) => {
  const { clientId, letter, search } = req.query;

  try {
    let sql = `
      SELECT cp.id, cp.part_number, cp.part_name, cp.client_id,
             c.name as client_name,
             p.project_number, p.project_name,
             (SELECT COUNT(*) FROM part_defect_config pdc WHERE pdc.part_id = cp.id AND pdc.is_active = true) as defect_count
      FROM client_parts cp
      LEFT JOIN clients c ON cp.client_id = c.id
      LEFT JOIN projects p ON cp.project_id = p.id
      WHERE cp.status = 'active'
    `;
    const params = [];
    let paramIndex = 1;

    if (clientId) {
      sql += ` AND cp.client_id = $${paramIndex++}`;
      params.push(clientId);
    }

    if (letter && letter !== 'ALL') {
      sql += ` AND UPPER(cp.part_number) LIKE $${paramIndex++}`;
      params.push(letter + '%');
    }

    if (search) {
      sql += ` AND (LOWER(cp.part_number) LIKE $${paramIndex} OR LOWER(cp.part_name) LIKE $${paramIndex})`;
      params.push('%' + search.toLowerCase() + '%');
      paramIndex++;
    }

    sql += ' ORDER BY cp.part_number';

    const result = await query(sql, params);

    res.json({
      success: true,
      parts: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching parts config:', error);
    res.status(500).json({ success: false, message: 'Error fetching parts config' });
  }
});

// GET defect configs for multiple parts (bulk query)
router.get('/parts-defects-bulk', authenticateToken, async (req, res) => {
  const { partIds } = req.query;

  if (!partIds) {
    return res.json({ success: true, config: [] });
  }

  try {
    const ids = partIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return res.json({ success: true, config: [] });
    }

    const result = await query(`
      SELECT part_id, defect_type_id
      FROM part_defect_config
      WHERE part_id = ANY($1) AND is_active = true
    `, [ids]);

    res.json({
      success: true,
      config: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching bulk parts config:', error);
    res.status(500).json({ success: false, message: 'Error fetching config' });
  }
});

// GET configuration for a specific part (all defect types with assigned status)
router.get('/parts/:partId/config', authenticateToken, async (req, res) => {
  const { partId } = req.params;

  try {
    // Get part info
    const partResult = await query(`
      SELECT cp.*, c.name as client_name, p.project_number, p.project_name
      FROM client_parts cp
      LEFT JOIN clients c ON cp.client_id = c.id
      LEFT JOIN projects p ON cp.project_id = p.id
      WHERE cp.id = $1
    `, [partId]);

    if (partResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    // Get all defect types with assignment status
    const defectsResult = await query(`
      SELECT dt.*,
             CASE WHEN pdc.id IS NOT NULL AND pdc.is_active = true THEN true ELSE false END as is_assigned,
             pdc.id as config_id
      FROM defect_types dt
      LEFT JOIN part_defect_config pdc ON pdc.defect_type_id = dt.id AND pdc.part_id = $1
      WHERE dt.is_active = true
      ORDER BY dt.display_order, dt.name
    `, [partId]);

    res.json({
      success: true,
      part: transformToCamelCase(partResult.rows[0]),
      defectTypes: transformToCamelCase(defectsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching part config:', error);
    res.status(500).json({ success: false, message: 'Error fetching part config' });
  }
});

// ASSIGN defect type to part
router.post('/parts/:partId/defects/:defectTypeId', authenticateToken, async (req, res) => {
  const { partId, defectTypeId } = req.params;

  try {
    // Check if already exists
    const existing = await query(
      'SELECT id, is_active FROM part_defect_config WHERE part_id = $1 AND defect_type_id = $2',
      [partId, defectTypeId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Reactivate if exists
      result = await query(
        `UPDATE part_defect_config SET is_active = true WHERE id = $1 RETURNING *`,
        [existing.rows[0].id]
      );
    } else {
      // Create new
      result = await query(
        `INSERT INTO part_defect_config (part_id, defect_type_id, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [partId, defectTypeId, req.user.id]
      );
    }

    res.json({
      success: true,
      config: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error assigning defect to part:', error);
    res.status(500).json({ success: false, message: 'Error assigning defect to part' });
  }
});

// REMOVE defect type from part
router.delete('/parts/:partId/defects/:defectTypeId', authenticateToken, async (req, res) => {
  const { partId, defectTypeId } = req.params;

  try {
    await query(
      'UPDATE part_defect_config SET is_active = false WHERE part_id = $1 AND defect_type_id = $2',
      [partId, defectTypeId]
    );

    res.json({ success: true, message: 'Defect removed from part' });
  } catch (error) {
    console.error('Error removing defect from part:', error);
    res.status(500).json({ success: false, message: 'Error removing defect from part' });
  }
});

// BULK assign defects to part
router.post('/parts/:partId/defects-bulk', authenticateToken, async (req, res) => {
  const { partId } = req.params;
  const { defectTypeIds, captureDisplayName } = req.body; // Array of defect type IDs + optional display name

  try {
    // Update capture display name if provided
    if (captureDisplayName !== undefined) {
      await query(
        'UPDATE client_parts SET capture_display_name = $1 WHERE id = $2',
        [captureDisplayName || null, partId]
      );
    }

    // Deactivate all current assignments
    await query(
      'UPDATE part_defect_config SET is_active = false WHERE part_id = $1',
      [partId]
    );

    // Assign new ones
    for (const defectTypeId of defectTypeIds) {
      await query(
        `INSERT INTO part_defect_config (part_id, defect_type_id, created_by, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (part_id, defect_type_id)
         DO UPDATE SET is_active = true`,
        [partId, defectTypeId, req.user.id]
      );
    }

    // Return updated config
    const result = await query(`
      SELECT dt.*
      FROM defect_types dt
      INNER JOIN part_defect_config pdc ON pdc.defect_type_id = dt.id
      WHERE pdc.part_id = $1 AND pdc.is_active = true
      ORDER BY dt.display_order
    `, [partId]);

    res.json({
      success: true,
      assignedDefects: transformToCamelCase(result.rows),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error bulk assigning defects:', error);
    res.status(500).json({ success: false, message: 'Error bulk assigning defects' });
  }
});

// COPY defect config from one part to another
router.post('/parts/:partId/copy-from/:sourcePartId', authenticateToken, async (req, res) => {
  const { partId, sourcePartId } = req.params;

  try {
    // Get source part config
    const sourceConfig = await query(
      'SELECT defect_type_id FROM part_defect_config WHERE part_id = $1 AND is_active = true',
      [sourcePartId]
    );

    if (sourceConfig.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Source part has no defect configuration'
      });
    }

    // Deactivate current config for target
    await query(
      'UPDATE part_defect_config SET is_active = false WHERE part_id = $1',
      [partId]
    );

    // Copy config
    for (const row of sourceConfig.rows) {
      await query(
        `INSERT INTO part_defect_config (part_id, defect_type_id, created_by, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (part_id, defect_type_id)
         DO UPDATE SET is_active = true`,
        [partId, row.defect_type_id, req.user.id]
      );
    }

    res.json({
      success: true,
      message: `Copied ${sourceConfig.rows.length} defect types from source part`,
      count: sourceConfig.rows.length
    });
  } catch (error) {
    console.error('Error copying defect config:', error);
    res.status(500).json({ success: false, message: 'Error copying defect config' });
  }
});

// ============================================================================
// DEFECT ENTRIES V2 CRUD
// ============================================================================

// GET defect entries
router.get('/entries', authenticateToken, async (req, res) => {
  const { partId, clientId, projectId, defectTypeId, categoryId, severityId, stationId, shiftId, departmentId, status, startDate, endDate, sortBy, sortDir, limit = 100, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT de.*,
             cp.part_number, cp.part_name,
             c.name as client_name,
             p.project_number, p.project_name,
             dt.code as defect_code, dt.name as defect_name, dt.color as defect_color,
             dc.name as category_name, dc.code as category_code,
             u.first_name as captured_by_first_name, u.last_name as captured_by_last_name,
             sev.name as severity_name, sev.code as severity_code, sev.color as severity_color,
             st.name as station_name, st.code as station_code,
             sh.name as shift_name, sh.code as shift_code,
             disp.name as disposition_name, disp.code as disposition_code,
             stg.name as stage_name, stg.code as stage_code,
             insp.first_name as inspector_first_name, insp.last_name as inspector_last_name,
             de.qar_id,
             qa.alert_number as qar_number,
             CASE WHEN de.qar_id IS NOT NULL THEN true ELSE false END as has_qar
      FROM defect_entries_v2 de
      LEFT JOIN quality_alerts qa ON de.qar_id = qa.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN projects p ON de.project_id = p.id
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      LEFT JOIN users u ON de.captured_by_user_id = u.id
      LEFT JOIN inspection_severities sev ON de.severity_id = sev.id
      LEFT JOIN inspection_stations st ON de.station_id = st.id
      LEFT JOIN inspection_shifts sh ON de.shift_id = sh.id
      LEFT JOIN inspection_dispositions disp ON de.disposition_id = disp.id
      LEFT JOIN inspection_stages stg ON de.stage_id = stg.id
      LEFT JOIN users insp ON de.inspector_id = insp.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (partId) { sql += ` AND de.part_id = $${paramIndex++}`; params.push(partId); }
    if (clientId) { sql += ` AND de.client_id = $${paramIndex++}`; params.push(clientId); }
    if (projectId) { sql += ` AND de.project_id = $${paramIndex++}`; params.push(projectId); }
    if (defectTypeId) { sql += ` AND de.defect_type_id = $${paramIndex++}`; params.push(defectTypeId); }
    if (categoryId) { sql += ` AND dt.category_id = $${paramIndex++}`; params.push(categoryId); }
    if (severityId) { sql += ` AND de.severity_id = $${paramIndex++}`; params.push(severityId); }
    if (stationId) { sql += ` AND de.station_id = $${paramIndex++}`; params.push(stationId); }
    if (shiftId) { sql += ` AND de.shift_id = $${paramIndex++}`; params.push(shiftId); }
    if (departmentId) { sql += ` AND de.department_id = $${paramIndex++}`; params.push(departmentId); }
    if (status) { sql += ` AND de.status = $${paramIndex++}`; params.push(status); }
    if (startDate) { sql += ` AND de.captured_at >= $${paramIndex++}`; params.push(startDate); }
    if (endDate) { sql += ` AND de.captured_at <= $${paramIndex++}`; params.push(endDate + ' 23:59:59'); }

    // Build WHERE clause for count query (same filters)
    let countSql = 'SELECT COUNT(*) FROM defect_entries_v2 de WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (partId) { countSql += ` AND de.part_id = $${countParamIndex++}`; countParams.push(partId); }
    if (clientId) { countSql += ` AND de.client_id = $${countParamIndex++}`; countParams.push(clientId); }
    if (projectId) { countSql += ` AND de.project_id = $${countParamIndex++}`; countParams.push(projectId); }
    if (defectTypeId) { countSql += ` AND de.defect_type_id = $${countParamIndex++}`; countParams.push(defectTypeId); }
    if (categoryId) { countSql += ` AND de.defect_type_id IN (SELECT id FROM defect_types WHERE category_id = $${countParamIndex++})`; countParams.push(categoryId); }
    if (severityId) { countSql += ` AND de.severity_id = $${countParamIndex++}`; countParams.push(severityId); }
    if (stationId) { countSql += ` AND de.station_id = $${countParamIndex++}`; countParams.push(stationId); }
    if (shiftId) { countSql += ` AND de.shift_id = $${countParamIndex++}`; countParams.push(shiftId); }
    if (departmentId) { countSql += ` AND de.department_id = $${countParamIndex++}`; countParams.push(departmentId); }
    if (status) { countSql += ` AND de.status = $${countParamIndex++}`; countParams.push(status); }
    if (startDate) { countSql += ` AND de.captured_at >= $${countParamIndex++}`; countParams.push(startDate); }
    if (endDate) { countSql += ` AND de.captured_at <= $${countParamIndex++}`; countParams.push(endDate + ' 23:59:59'); }

    // Sorting
    const allowedSortColumns = {
      'folio': 'de.entry_number',
      'date': 'de.captured_at',
      'part': 'cp.part_number',
      'defect': 'dt.name',
      'severity': 'sev.name',
      'station': 'st.name',
      'shift': 'sh.name',
      'department': 'de.department_id',
      'disposition': 'disp.name',
      'inspector': 'insp.first_name'
    };
    const orderCol = allowedSortColumns[sortBy] || 'de.captured_at';
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${orderCol} ${orderDir} NULLS LAST`;

    if (parseInt(limit) > 0) {
      sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);
    }

    const result = await query(sql, params);

    // Get filtered total count
    const countResult = await query(countSql, countParams);

    res.json({
      success: true,
      entries: transformToCamelCase(result.rows),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching defect entries:', error);
    res.status(500).json({ success: false, message: 'Error fetching defect entries' });
  }
});

// GET single defect entry
router.get('/entries/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT de.*,
             cp.part_number, cp.part_name,
             c.name as client_name,
             p.project_number, p.project_name,
             dt.code as defect_code, dt.name as defect_name, dt.color as defect_color,
             u.first_name as captured_by_first_name, u.last_name as captured_by_last_name
      FROM defect_entries_v2 de
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN projects p ON de.project_id = p.id
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN users u ON de.captured_by_user_id = u.id
      WHERE de.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defect entry not found' });
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching defect entry:', error);
    res.status(500).json({ success: false, message: 'Error fetching defect entry' });
  }
});

// CREATE defect entry (tablet capture with inspection fields)
router.post('/entries', authenticateToken, async (req, res) => {
  const {
    partId,
    defectTypeId,
    notes,
    quantity,
    // New inspection fields
    severityId,
    stageId,
    dispositionId,
    stationId,
    shiftId,
    inspectorId,
    departmentId,
    lotNumber,
    downtimeMinutes
  } = req.body;

  try {
    // Get part info for client_id and project_id
    const partResult = await query(
      'SELECT client_id, project_id FROM client_parts WHERE id = $1',
      [partId]
    );

    if (partResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Part not found' });
    }

    const { client_id, project_id } = partResult.rows[0];

    const result = await query(
      `INSERT INTO defect_entries_v2 (
        part_id, client_id, project_id, defect_type_id, notes, quantity,
        severity_id, stage_id, disposition_id, station_id, shift_id,
        inspector_id, department_id, lot_number, downtime_minutes,
        captured_by_user_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        partId, client_id, project_id, defectTypeId, notes, quantity || 1,
        severityId || null, stageId || null, dispositionId || null,
        stationId || null, shiftId || null,
        inspectorId || req.user.id, departmentId || null, lotNumber || null,
        downtimeMinutes || 0, req.user.id
      ]
    );

    // Check QAR threshold if severity is set
    let qarTriggered = false;
    if (severityId) {
      const severityResult = await query(
        'SELECT qar_threshold_count, qar_threshold_hours FROM inspection_severities WHERE id = $1',
        [severityId]
      );

      if (severityResult.rows.length > 0) {
        const { qar_threshold_count, qar_threshold_hours } = severityResult.rows[0];

        // Count defects with same severity in threshold window
        const countResult = await query(
          `SELECT COUNT(*) FROM defect_entries_v2
           WHERE severity_id = $1
           AND captured_at >= NOW() - INTERVAL '${qar_threshold_hours} hours'`,
          [severityId]
        );

        if (parseInt(countResult.rows[0].count) >= qar_threshold_count) {
          qarTriggered = true;
          // TODO: Create QAR automatically
        }
      }
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0]),
      qarTriggered
    });
  } catch (error) {
    console.error('Error creating defect entry:', error);
    res.status(500).json({ success: false, message: 'Error creating defect entry' });
  }
});

// UPDATE defect entry
router.put('/entries/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes, quantity, status, resolutionNotes } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); params.push(notes); }
    if (quantity !== undefined) { updates.push(`quantity = $${paramIndex++}`); params.push(quantity); }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      if (status === 'resolved' || status === 'closed') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        updates.push(`resolved_by_user_id = $${paramIndex++}`);
        params.push(req.user.id);
      }
    }
    if (resolutionNotes !== undefined) { updates.push(`resolution_notes = $${paramIndex++}`); params.push(resolutionNotes); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE defect_entries_v2 SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defect entry not found' });
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating defect entry:', error);
    res.status(500).json({ success: false, message: 'Error updating defect entry' });
  }
});

// DELETE defect entry
router.delete('/entries/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM defect_entries_v2 WHERE id = $1', [id]);
    res.json({ success: true, message: 'Defect entry deleted' });
  } catch (error) {
    console.error('Error deleting defect entry:', error);
    res.status(500).json({ success: false, message: 'Error deleting defect entry' });
  }
});

// ============================================================================
// STATS FOR DASHBOARD
// ============================================================================

router.get('/stats', authenticateToken, async (req, res) => {
  const { clientId, projectId, partId, startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    const params = [];
    let paramIndex = 1;

    if (startDate) { dateFilter += ` AND captured_at >= $${paramIndex++}`; params.push(startDate); }
    if (endDate) { dateFilter += ` AND captured_at <= $${paramIndex++}`; params.push(endDate + ' 23:59:59'); }
    if (clientId) { dateFilter += ` AND client_id = $${paramIndex++}`; params.push(clientId); }
    if (projectId) { dateFilter += ` AND project_id = $${paramIndex++}`; params.push(projectId); }
    if (partId) { dateFilter += ` AND part_id = $${paramIndex++}`; params.push(partId); }

    // Totals
    const totals = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed
      FROM defect_entries_v2 WHERE 1=1 ${dateFilter}
    `, params);

    // By defect type (Pareto)
    const byDefectType = await query(`
      SELECT dt.name, dt.code, dt.color, COUNT(*) as count
      FROM defect_entries_v2 de
      JOIN defect_types dt ON de.defect_type_id = dt.id
      WHERE 1=1 ${dateFilter}
      GROUP BY dt.id, dt.name, dt.code, dt.color
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // By part
    const byPart = await query(`
      SELECT cp.part_number, cp.part_name, COUNT(*) as count
      FROM defect_entries_v2 de
      JOIN client_parts cp ON de.part_id = cp.id
      WHERE 1=1 ${dateFilter}
      GROUP BY cp.id, cp.part_number, cp.part_name
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // Daily trend
    const dailyTrend = await query(`
      SELECT DATE(captured_at) as date, COUNT(*) as count
      FROM defect_entries_v2
      WHERE captured_at >= CURRENT_DATE - INTERVAL '30 days' ${dateFilter}
      GROUP BY DATE(captured_at)
      ORDER BY date
    `, params);

    res.json({
      success: true,
      stats: {
        totals: transformToCamelCase(totals.rows[0]),
        byDefectType: transformToCamelCase(byDefectType.rows),
        byPart: transformToCamelCase(byPart.rows),
        dailyTrend: transformToCamelCase(dailyTrend.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

module.exports = router;
