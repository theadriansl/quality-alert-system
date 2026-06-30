const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// MULTER CONFIG FOR DEFECT ATTACHMENTS
// ============================================================================
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/defect-attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'defect-' + uniqueSuffix + ext);
  }
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    // Permitir imágenes, PDFs, y archivos comunes
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed'
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

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
    lotNumber,      // Funciona como serial en escaneo 1 a 1
    serialNumber,   // Campo alternativo para serial explicito
    downtimeMinutes
  } = req.body;

  try {
    // Get part info for client_id, project_id, and unit_cost
    const partResult = await query(
      'SELECT client_id, project_id, unit_cost, currency FROM client_parts WHERE id = $1',
      [partId]
    );

    if (partResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Part not found' });
    }

    const { client_id, project_id, unit_cost, currency } = partResult.rows[0];

    // === DETERMINAR repair_status SEGÚN DISPOSICIÓN (antes de unit_registry) ===
    let initialRepairStatus = 'OPEN'; // Default: va a Hospital de Defectos
    let dispositionCode = null;
    let isDefectClosed = false; // Si el defecto NO va a reparación (scrap, released, quarantine)

    if (dispositionId) {
      const dispResult = await query('SELECT code FROM inspection_dispositions WHERE id = $1', [dispositionId]);
      if (dispResult.rows.length > 0) {
        dispositionCode = dispResult.rows[0].code;
        switch (dispositionCode) {
          case 'SCRAP':
            initialRepairStatus = 'SCRAPPED';
            isDefectClosed = true;
            break;
          case 'USE_AS_IS':
            initialRepairStatus = 'RELEASED';
            isDefectClosed = true;
            break;
          case 'RETURN_SUPPLIER':
          case 'HOLD':
            initialRepairStatus = 'QUARANTINE';
            isDefectClosed = true; // No cuenta como open_defects
            break;
          case 'REWORK':
          default:
            initialRepairStatus = 'OPEN'; // Va a Hospital
            break;
        }
      }
    }

    // === TRAZABILIDAD: Buscar o crear unit_registry ===
    let unitId = null;
    const serial = serialNumber || lotNumber; // Usar serialNumber si existe, sino lotNumber

    if (serial && serial.trim()) {
      // CANDADO: Verificar si el serial ya existe con OTRA parte
      const serialCheck = await query(
        'SELECT id, part_id, serial_number FROM unit_registry WHERE client_id = $1 AND serial_number = $2',
        [client_id, serial.trim()]
      );

      if (serialCheck.rows.length > 0 && serialCheck.rows[0].part_id !== partId) {
        // Serial ya existe con otra parte - RECHAZAR
        const conflictPart = await query('SELECT part_number FROM client_parts WHERE id = $1', [serialCheck.rows[0].part_id]);
        const conflictPartNumber = conflictPart.rows[0]?.part_number || 'desconocido';
        return res.status(400).json({
          success: false,
          message: `El serial "${serial.trim()}" ya está registrado con la parte ${conflictPartNumber}. No se puede asignar a otra parte.`,
          conflictPartId: serialCheck.rows[0].part_id,
          conflictPartNumber
        });
      }

      // Buscar si ya existe la unidad (mismo cliente, parte y serial)
      const existingUnit = await query(
        'SELECT id, current_status FROM unit_registry WHERE client_id = $1 AND part_id = $2 AND serial_number = $3',
        [client_id, partId, serial.trim()]
      );

      if (existingUnit.rows.length > 0) {
        // Unidad existe, actualizar contadores
        unitId = existingUnit.rows[0].id;
        // Si el defecto está cerrado (scrap/released/quarantine), no incrementar open_defects
        const openIncrement = isDefectClosed ? 0 : 1;
        const newStatus = isDefectClosed
          ? (dispositionCode === 'SCRAP' ? 'SCRAPPED' : existingUnit.rows[0].current_status)
          : 'DEFECTIVE';
        await query(`
          UPDATE unit_registry SET
            total_defects = total_defects + 1,
            open_defects = open_defects + $2,
            current_status = CASE
              WHEN $3 = 'SCRAPPED' THEN 'SCRAPPED'
              WHEN current_status IN ('REGISTERED', 'INSPECTING', 'OK') AND $2 > 0 THEN 'DEFECTIVE'
              ELSE current_status
            END,
            last_inspection_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [unitId, openIncrement, newStatus]);
      } else {
        // Crear nueva unidad - determinar status inicial según disposición
        const unitStatus = dispositionCode === 'SCRAP' ? 'SCRAPPED'
          : (isDefectClosed ? 'REGISTERED' : 'DEFECTIVE');
        const openCount = isDefectClosed ? 0 : 1;
        const newUnit = await query(`
          INSERT INTO unit_registry (
            serial_number, lot_number, client_id, part_id, project_id,
            current_status, total_defects, open_defects, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
          RETURNING id
        `, [serial.trim(), lotNumber || null, client_id, partId, project_id, unitStatus, openCount, req.user.id]);
        unitId = newUnit.rows[0].id;

        // Registrar evento de registro
        await query(`
          INSERT INTO unit_history (unit_id, event_type, description, performed_by)
          VALUES ($1, 'REGISTERED', $2, $3)
        `, [unitId, `Unidad registrada: ${serial.trim()}`, req.user.id]);
      }
    }

    // Insertar defecto con unit_id, serial_number, unit_cost y repair_status según disposición
    const result = await query(
      `INSERT INTO defect_entries_v2 (
        part_id, client_id, project_id, defect_type_id, notes, quantity,
        severity_id, stage_id, disposition_id, station_id, shift_id,
        inspector_id, department_id, lot_number, serial_number, unit_id, downtime_minutes,
        captured_by_user_id, unit_cost, currency, repair_status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [
        partId, client_id, project_id, defectTypeId, notes, quantity || 1,
        severityId || null, stageId || null, dispositionId || null,
        stationId || null, shiftId || null,
        inspectorId || req.user.id, departmentId || null, lotNumber || null,
        serial || null, unitId, downtimeMinutes || 0, req.user.id,
        unit_cost || null, currency || 'USD', initialRepairStatus
      ]
    );

    const defectEntry = result.rows[0];

    // === TRAZABILIDAD: Registrar en unit_history ===
    if (unitId) {
      // Obtener nombre del tipo de defecto
      let defectName = 'Defecto';
      if (defectTypeId) {
        const dtResult = await query('SELECT name FROM defect_types WHERE id = $1', [defectTypeId]);
        if (dtResult.rows.length > 0) defectName = dtResult.rows[0].name;
      }

      await query(`
        INSERT INTO unit_history (
          unit_id, event_type, source_table, source_id, description,
          station_id, shift_id, performed_by, metadata
        ) VALUES ($1, 'DEFECT_FOUND', 'defect_entries_v2', $2, $3, $4, $5, $6, $7)
      `, [
        unitId,
        defectEntry.id,
        `Defecto detectado: ${defectName}${notes ? ' - ' + notes.substring(0, 50) : ''}`,
        stationId || null,
        shiftId || null,
        req.user.id,
        JSON.stringify({ defectTypeId, severityId, quantity: quantity || 1 })
      ]);
    }

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

          // === TRAZABILIDAD: Registrar QAR triggered en history ===
          if (unitId) {
            await query(`
              INSERT INTO unit_history (unit_id, event_type, description, station_id, performed_by)
              VALUES ($1, 'QAR_TRIGGERED', 'Umbral QAR alcanzado por severidad', $2, $3)
            `, [unitId, stationId || null, req.user.id]);
          }
        }
      }
    }

    // Determinar mensaje de ruteo
    let routingMessage = 'Enviado a Hospital de Defectos';
    if (dispositionCode === 'SCRAP') routingMessage = 'Marcado como SCRAP';
    else if (dispositionCode === 'USE_AS_IS') routingMessage = 'Liberado (Usar como está)';
    else if (dispositionCode === 'RETURN_SUPPLIER') routingMessage = 'Enviado a Cuarentena (Devolver a Proveedor)';
    else if (dispositionCode === 'HOLD') routingMessage = 'Enviado a Cuarentena (En Hold)';

    res.json({
      success: true,
      entry: transformToCamelCase(defectEntry),
      unitId,
      qarTriggered,
      routing: {
        status: initialRepairStatus,
        disposition: dispositionCode,
        message: routingMessage
      }
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

// ============================================================================
// DEFECT REPAIR & RELEASE SYSTEM
// ============================================================================

// GET defects by serial/lot for consultation tab
router.get('/by-serial/:serial', authenticateToken, async (req, res) => {
  const { serial } = req.params;
  const { clientId, partId, includeHistory } = req.query;

  try {
    // Build query for defects
    let sql = `
      SELECT de.*,
             dt.code as defect_code, dt.name as defect_name, dt.color as defect_color,
             cp.part_number, cp.part_name,
             c.name as client_name,
             sev.name as severity_name, sev.code as severity_code, sev.color as severity_color,
             dep.name as department_name,
             st.name as station_name,
             CONCAT(u_cap.first_name, ' ', u_cap.last_name) as captured_by_name,
             CONCAT(u_rep.first_name, ' ', u_rep.last_name) as repaired_by_name,
             CONCAT(u_rel.first_name, ' ', u_rel.last_name) as released_by_name,
             rt.name as repair_type_name,
             rr.name as release_reason_name,
             rc.name as root_cause_name,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - de.created_at))/3600 as hours_open,
             CASE
               WHEN de.repair_status = 'CLOSED' THEN 'GREEN'
               WHEN de.repair_status IN ('REPAIRED', 'IN_VALIDATION') THEN 'YELLOW'
               ELSE CASE
                 WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - de.created_at))/3600 <= 24 THEN 'GREEN'
                 WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - de.created_at))/3600 <= 48 THEN 'YELLOW'
                 ELSE 'RED'
               END
             END as time_color
      FROM defect_entries_v2 de
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN inspection_severities sev ON de.severity_id = sev.id
      LEFT JOIN departments dep ON de.department_id = dep.id
      LEFT JOIN inspection_stations st ON de.station_id = st.id
      LEFT JOIN users u_cap ON de.captured_by_user_id = u_cap.id
      LEFT JOIN users u_rep ON de.repaired_by = u_rep.id
      LEFT JOIN users u_rel ON de.released_by = u_rel.id
      LEFT JOIN repair_types rt ON de.repair_type_id = rt.id
      LEFT JOIN release_reasons rr ON de.release_reason_id = rr.id
      LEFT JOIN root_causes rc ON de.root_cause_id = rc.id
      WHERE (de.serial_number = $1 OR de.lot_number = $1)
    `;
    const params = [serial];
    let paramIndex = 2;

    if (clientId) {
      sql += ` AND de.client_id = $${paramIndex++}`;
      params.push(clientId);
    }
    if (partId) {
      sql += ` AND de.part_id = $${paramIndex++}`;
      params.push(partId);
    }

    sql += ` ORDER BY de.created_at DESC`;

    const result = await query(sql, params);

    // Get counts
    const counts = {
      total: result.rows.length,
      open: result.rows.filter(r => r.repair_status === 'OPEN').length,
      inRepair: result.rows.filter(r => r.repair_status === 'IN_REPAIR').length,
      repaired: result.rows.filter(r => r.repair_status === 'REPAIRED').length,
      inValidation: result.rows.filter(r => r.repair_status === 'IN_VALIDATION').length,
      closed: result.rows.filter(r => r.repair_status === 'CLOSED').length,
      rejected: result.rows.filter(r => r.repair_status === 'REJECTED').length
    };

    // Get unit info if exists
    let unit = null;
    if (result.rows.length > 0 && result.rows[0].unit_id) {
      const unitResult = await query(`
        SELECT ur.*, cp.part_number, cp.part_name, c.name as client_name
        FROM unit_registry ur
        LEFT JOIN client_parts cp ON ur.part_id = cp.id
        LEFT JOIN clients c ON ur.client_id = c.id
        WHERE ur.id = $1
      `, [result.rows[0].unit_id]);
      if (unitResult.rows.length > 0) {
        unit = transformToCamelCase(unitResult.rows[0]);
      }
    }

    // Get history if requested
    let history = [];
    if (includeHistory === 'true' && result.rows.length > 0) {
      const defectIds = result.rows.map(r => r.id);
      const historyResult = await query(`
        SELECT de.*, CONCAT(u.first_name, ' ', u.last_name) as performed_by_name,
               rt.name as repair_type_name, rr.name as release_reason_name
        FROM defect_events de
        LEFT JOIN users u ON de.performed_by = u.id
        LEFT JOIN repair_types rt ON de.repair_type_id = rt.id
        LEFT JOIN release_reasons rr ON de.release_reason_id = rr.id
        WHERE de.defect_id = ANY($1)
        ORDER BY de.event_at DESC
      `, [defectIds]);
      history = transformToCamelCase(historyResult.rows);
    }

    res.json({
      success: true,
      defects: transformToCamelCase(result.rows),
      counts,
      unit,
      history
    });
  } catch (error) {
    console.error('Error fetching defects by serial:', error);
    res.status(500).json({ success: false, message: 'Error fetching defects' });
  }
});

// SERIAL LOOKUP - Buscar información del serial para auto-rellenar campos
router.get('/serial-lookup/:serial', authenticateToken, async (req, res) => {
  const { serial } = req.params;

  try {
    // Buscar en unit_registry primero (seriales registrados)
    let unitResult = await query(`
      SELECT ur.id, ur.serial_number, ur.part_id, ur.client_id,
             cp.part_number, cp.part_name, cp.project_id,
             c.name as client_name
      FROM unit_registry ur
      LEFT JOIN client_parts cp ON ur.part_id = cp.id
      LEFT JOIN clients c ON ur.client_id = c.id
      WHERE ur.serial_number = $1
      LIMIT 1
    `, [serial.trim()]);

    if (unitResult.rows.length > 0) {
      return res.json({
        success: true,
        unit: transformToCamelCase(unitResult.rows[0])
      });
    }

    // Si no está en unit_registry, buscar en defect_entries_v2
    const defectResult = await query(`
      SELECT de.part_id, de.client_id,
             cp.part_number, cp.part_name, cp.project_id,
             c.name as client_name
      FROM defect_entries_v2 de
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN clients c ON de.client_id = c.id
      WHERE de.serial_number = $1 OR de.lot_number = $1
      ORDER BY de.created_at DESC
      LIMIT 1
    `, [serial.trim()]);

    if (defectResult.rows.length > 0) {
      return res.json({
        success: true,
        unit: transformToCamelCase(defectResult.rows[0])
      });
    }

    // No encontrado
    res.json({
      success: false,
      message: 'Serial no encontrado'
    });
  } catch (error) {
    console.error('Error looking up serial:', error);
    res.status(500).json({ success: false, message: 'Error looking up serial' });
  }
});

// START REPAIR - Reparador inicia reparación
router.post('/entries/:id/repair/start', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { repairStationId } = req.body;

  try {
    // Verify user can repair
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    if (!['OPEN', 'REJECTED', 'QUARANTINE'].includes(defect.rows[0].repair_status)) {
      return res.status(400).json({ success: false, message: 'El defecto no está disponible para reparación' });
    }

    // Update status with station and start time
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'IN_REPAIR',
        repair_station_id = $2,
        repair_started_at = CURRENT_TIMESTAMP,
        repaired_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, repairStationId || null, req.user.id]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, performed_by, comments)
      VALUES ($1, 'REPAIR_STARTED', $2, 'IN_REPAIR', $3, 'Reparación iniciada')
    `, [id, defect.rows[0].repair_status, req.user.id]);

    // Update unit_history if unit exists
    if (defect.rows[0].unit_id) {
      await query(`
        INSERT INTO unit_history (unit_id, event_type, source_table, source_id, description, performed_by)
        VALUES ($1, 'REPAIR_STARTED', 'defect_entries_v2', $2, 'Reparación iniciada', $3)
      `, [defect.rows[0].unit_id, id, req.user.id]);
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error starting repair:', error);
    res.status(500).json({ success: false, message: 'Error al iniciar reparación' });
  }
});

// COMPLETE REPAIR - Reparador completa reparación
router.post('/entries/:id/repair/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { repairTypeId, repairTimeMinutes, rootCauseId, notes, newDepartmentId, deviationId } = req.body;

  try {
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    const currentStatus = defect.rows[0].repair_status;

    // Si tiene deviationId, permitir reparar desde OPEN, IN_REPAIR o estados pendientes
    if (deviationId) {
      const allowedStatuses = ['OPEN', 'IN_REPAIR', 'IN_VALIDATION', 'PENDING_RELEASE_APPROVAL'];
      if (!allowedStatuses.includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          message: `No se puede reparar un defecto en estado ${currentStatus}`
        });
      }
    } else {
      // Flujo normal: debe estar en IN_REPAIR
      if (currentStatus !== 'IN_REPAIR') {
        return res.status(400).json({ success: false, message: 'El defecto no está en reparación' });
      }
    }

    // Check if requires approval
    let newStatus = 'REPAIRED';
    let requiresApproval = false;

    const configResult = await query(`
      SELECT dtc.requires_repair_approval
      FROM defect_type_config dtc
      WHERE dtc.defect_type_id = $1 AND dtc.client_id = $2
    `, [defect.rows[0].defect_type_id, defect.rows[0].client_id]);

    if (configResult.rows.length > 0 && configResult.rows[0].requires_repair_approval) {
      newStatus = 'PENDING_APPROVAL';
      requiresApproval = true;
    }

    // Handle department change if provided
    let responsibleChanged = false;
    if (newDepartmentId && newDepartmentId !== defect.rows[0].department_id) {
      responsibleChanged = true;
    }

    // Update defect
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = $1,
        repair_type_id = $2,
        repair_time_minutes = $3,
        root_cause_id = $4,
        repair_notes = $5,
        repaired_by = $6,
        repaired_at = CURRENT_TIMESTAMP,
        requires_approval = $7,
        original_department_id = CASE WHEN $8 THEN department_id ELSE original_department_id END,
        department_id = COALESCE($9, department_id),
        responsible_changed_by = CASE WHEN $8 THEN $6 ELSE responsible_changed_by END,
        responsible_changed_at = CASE WHEN $8 THEN CURRENT_TIMESTAMP ELSE responsible_changed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [newStatus, repairTypeId, repairTimeMinutes || 5, rootCauseId, notes, req.user.id, requiresApproval, responsibleChanged, newDepartmentId, id]);

    // Log repair event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, repair_type_id, root_cause_id, time_minutes, performed_by, comments)
      VALUES ($1, 'REPAIRED', 'IN_REPAIR', $2, $3, $4, $5, $6, $7)
    `, [id, newStatus, repairTypeId, rootCauseId, repairTimeMinutes, req.user.id, notes]);

    // Log department change if applicable
    if (responsibleChanged) {
      await query(`
        INSERT INTO defect_events (defect_id, event_type, old_department_id, new_department_id, performed_by, comments)
        VALUES ($1, 'RESPONSIBLE_CHANGED', $2, $3, $4, 'Cambio de responsable por reparador')
      `, [id, defect.rows[0].department_id, newDepartmentId, req.user.id]);
    }

    // Update unit_history and unit_registry
    if (defect.rows[0].unit_id) {
      await query(`
        INSERT INTO unit_history (unit_id, event_type, source_table, source_id, description, performed_by, metadata)
        VALUES ($1, 'REPAIR_COMPLETED', 'defect_entries_v2', $2, $3, $4, $5)
      `, [
        defect.rows[0].unit_id, id,
        `Reparación completada - Tiempo: ${repairTimeMinutes || 5} min`,
        req.user.id,
        JSON.stringify({ repairTypeId, repairTimeMinutes, rootCauseId })
      ]);

      // Update unit status
      await query(`
        UPDATE unit_registry SET
          current_status = 'PENDING_REINSPECTION',
          total_repairs = total_repairs + 1
        WHERE id = $1
      `, [defect.rows[0].unit_id]);
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0]),
      requiresApproval
    });
  } catch (error) {
    console.error('Error completing repair:', error);
    res.status(500).json({ success: false, message: 'Error al completar reparación' });
  }
});

// RELEASE DEFECT - Inspector libera defecto
router.post('/entries/:id/release', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { releaseReasonId, releaseTimeMinutes, notes, releaseStationId, newDepartmentId, deviationId } = req.body;

  try {
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    // Validate release reason allows without repair
    const reasonResult = await query('SELECT * FROM release_reasons WHERE id = $1', [releaseReasonId]);
    if (reasonResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Motivo de liberación no válido' });
    }

    const reason = reasonResult.rows[0];

    // Check if requires comment
    if (reason.requires_comment && (!notes || notes.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Este motivo requiere comentarios' });
    }

    // Check if can release without repair
    if (!reason.allows_without_repair && defect.rows[0].repair_status !== 'REPAIRED') {
      return res.status(400).json({ success: false, message: 'El defecto debe estar reparado para usar este motivo' });
    }

    // Check if requires approval
    let newStatus = 'CLOSED';
    let requiresApproval = false;

    const configResult = await query(`
      SELECT dtc.requires_release_approval
      FROM defect_type_config dtc
      WHERE dtc.defect_type_id = $1 AND dtc.client_id = $2
    `, [defect.rows[0].defect_type_id, defect.rows[0].client_id]);

    if (configResult.rows.length > 0 && configResult.rows[0].requires_release_approval) {
      newStatus = 'PENDING_APPROVAL';
      requiresApproval = true;
    }

    // Store original department for event logging
    const originalDepartmentId = defect.rows[0].department_id;

    // Update defect (including department if provided)
    const parsedNewDeptId = newDepartmentId ? parseInt(newDepartmentId) : null;
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = $1::varchar,
        release_reason_id = $2,
        release_time_minutes = $3,
        release_notes = $4,
        released_by = $5,
        released_at = CURRENT_TIMESTAMP,
        release_station_id = $6,
        requires_approval = $7,
        status = CASE WHEN $1::varchar = 'CLOSED' THEN 'closed' ELSE status END,
        resolved_at = CASE WHEN $1::varchar = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        resolved_by_user_id = CASE WHEN $1::varchar = 'CLOSED' THEN $5 ELSE resolved_by_user_id END,
        department_id = COALESCE($9::integer, department_id),
        responsible_changed_by = CASE WHEN $9::integer IS NOT NULL THEN $5 ELSE responsible_changed_by END,
        responsible_changed_at = CASE WHEN $9::integer IS NOT NULL THEN CURRENT_TIMESTAMP ELSE responsible_changed_at END,
        original_department_id = CASE WHEN $9::integer IS NOT NULL AND original_department_id IS NULL THEN department_id ELSE original_department_id END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [newStatus, releaseReasonId, releaseTimeMinutes || 1, notes, req.user.id, releaseStationId || null, requiresApproval, id, parsedNewDeptId]);

    // Log release event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, release_reason_id, time_minutes, performed_by, comments)
      VALUES ($1, 'RELEASED', $2, $3, $4, $5, $6, $7)
    `, [id, defect.rows[0].repair_status, newStatus, releaseReasonId, releaseTimeMinutes, req.user.id, notes]);

    // Log department reassignment event if changed
    if (newDepartmentId && parseInt(newDepartmentId) !== originalDepartmentId) {
      await query(`
        INSERT INTO defect_events (defect_id, event_type, performed_by, comments, metadata)
        VALUES ($1, 'DEPARTMENT_REASSIGNED', $2, $3, $4)
      `, [id, req.user.id, notes || 'Área reasignada al liberar', JSON.stringify({
        oldDepartmentId: originalDepartmentId,
        newDepartmentId: parseInt(newDepartmentId)
      })]);
    }

    // Link deviation if provided
    if (deviationId) {
      await query(`
        INSERT INTO defect_deviations (defect_id, deviation_id, linked_by, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (defect_id, deviation_id) DO NOTHING
      `, [id, deviationId, req.user.id, notes || 'Vinculado al liberar']);
    }

    // Update unit_history and unit_registry
    if (defect.rows[0].unit_id) {
      await query(`
        INSERT INTO unit_history (unit_id, event_type, source_table, source_id, description, performed_by, metadata)
        VALUES ($1, 'RELEASED', 'defect_entries_v2', $2, $3, $4, $5)
      `, [
        defect.rows[0].unit_id, id,
        `Defecto liberado: ${reason.name}`,
        req.user.id,
        JSON.stringify({ releaseReasonId, releaseTimeMinutes })
      ]);

      // Update unit counters
      await query(`
        UPDATE unit_registry SET
          open_defects = GREATEST(0, open_defects - 1),
          current_status = CASE
            WHEN open_defects - 1 <= 0 THEN 'RELEASED'
            ELSE current_status
          END,
          released_at = CASE WHEN open_defects - 1 <= 0 THEN CURRENT_TIMESTAMP ELSE released_at END
        WHERE id = $1
      `, [defect.rows[0].unit_id]);
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0]),
      requiresApproval
    });
  } catch (error) {
    console.error('Error releasing defect:', error);
    res.status(500).json({ success: false, message: 'Error al liberar defecto' });
  }
});

// BULK REASSIGN - Cambio masivo de área responsable
router.post('/bulk-reassign', authenticateToken, async (req, res) => {
  const { defectIds, newDepartmentId, notes } = req.body;

  if (!defectIds || !Array.isArray(defectIds) || defectIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Se requiere una lista de defectos' });
  }

  if (!newDepartmentId) {
    return res.status(400).json({ success: false, message: 'Se requiere el nuevo departamento' });
  }

  try {
    // Verify department exists
    const deptCheck = await query('SELECT id, name FROM departments WHERE id = $1', [newDepartmentId]);
    if (deptCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Departamento no válido' });
    }
    const deptName = deptCheck.rows[0].name;

    let updatedCount = 0;

    for (const defectId of defectIds) {
      try {
        // Get current defect
        const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [defectId]);
        if (defect.rows.length === 0) continue;

        const oldDeptId = defect.rows[0].department_id;

        // Skip if same department
        if (oldDeptId === parseInt(newDepartmentId)) continue;

        // Update defect
        await query(`
          UPDATE defect_entries_v2 SET
            department_id = $1,
            original_department_id = CASE WHEN original_department_id IS NULL THEN department_id ELSE original_department_id END,
            responsible_changed_by = $2,
            responsible_changed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [newDepartmentId, req.user.id, defectId]);

        // Log event
        await query(`
          INSERT INTO defect_events (defect_id, event_type, performed_by, comments, metadata)
          VALUES ($1, 'DEPARTMENT_REASSIGNED', $2, $3, $4)
        `, [defectId, req.user.id, notes || 'Reasignación masiva', JSON.stringify({
          oldDepartmentId: oldDeptId,
          newDepartmentId: parseInt(newDepartmentId),
          bulk: true
        })]);

        updatedCount++;
      } catch (err) {
        console.error(`Error updating defect ${defectId}:`, err);
      }
    }

    res.json({
      success: true,
      updated: updatedCount,
      total: defectIds.length,
      newDepartment: deptName
    });
  } catch (error) {
    console.error('Error in bulk reassign:', error);
    res.status(500).json({ success: false, message: 'Error en la reasignación masiva' });
  }
});

// REJECT RELEASE - Inspector rechaza y envía a reparación, scrap o cuarentena
router.post('/entries/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes, destination = 'REPAIR', repairStationId } = req.body;

  try {
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    if (!['REPAIRED', 'IN_VALIDATION', 'PENDING_APPROVAL'].includes(defect.rows[0].repair_status)) {
      return res.status(400).json({ success: false, message: 'El defecto no puede ser rechazado en este estado' });
    }

    // Validar destination
    const validDestinations = ['REPAIR', 'SCRAP', 'QUARANTINE'];
    if (!validDestinations.includes(destination)) {
      return res.status(400).json({ success: false, message: 'Destino inválido. Valores permitidos: REPAIR, SCRAP, QUARANTINE' });
    }

    // Determinar nuevo status según destino
    let newStatus;
    let eventType;
    switch (destination) {
      case 'REPAIR':
        newStatus = 'REJECTED';
        eventType = 'REJECT_TO_REPAIR';
        break;
      case 'SCRAP':
        newStatus = 'SCRAPPED';
        eventType = 'REJECT_TO_SCRAP';
        break;
      case 'QUARANTINE':
        newStatus = 'QUARANTINE';
        eventType = 'REJECT_TO_MRB';
        break;
    }

    // Update defect
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = $1,
        repair_station_id = $2,
        repair_attempts = repair_attempts + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [newStatus, destination === 'REPAIR' ? (repairStationId || null) : null, id]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, performed_by, comments)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, eventType, defect.rows[0].repair_status, newStatus, req.user.id, notes || `Rechazado → ${destination}`]);

    // Update unit_history
    if (defect.rows[0].unit_id) {
      const historyDescription = destination === 'REPAIR'
        ? 'Reparación rechazada - requiere re-trabajo'
        : destination === 'SCRAP'
          ? 'Rechazado a Scrap'
          : 'Rechazado a Cuarentena (MRB)';

      await query(`
        INSERT INTO unit_history (unit_id, event_type, source_table, source_id, description, performed_by)
        VALUES ($1, $2, 'defect_entries_v2', $3, $4, $5)
      `, [
        defect.rows[0].unit_id,
        destination === 'REPAIR' ? 'REINSPECTION_NOK' : (destination === 'SCRAP' ? 'SCRAPPED' : 'QUARANTINE'),
        id,
        historyDescription,
        req.user.id
      ]);

      // Update unit status
      const unitStatus = destination === 'REPAIR' ? 'DEFECTIVE' : (destination === 'SCRAP' ? 'SCRAPPED' : 'QUARANTINE');
      await query(`
        UPDATE unit_registry SET current_status = $1 WHERE id = $2
      `, [unitStatus, defect.rows[0].unit_id]);
    }

    // Si es SCRAP o QUARANTINE, actualizar contadores
    if (destination === 'SCRAP' || destination === 'QUARANTINE') {
      const d = defect.rows[0];
      if (d.serial_number || d.lot_number) {
        await query(`
          UPDATE unit_registry
          SET open_defects = GREATEST(0, open_defects - 1),
              updated_at = CURRENT_TIMESTAMP
          WHERE client_id = $1 AND part_id = $2
          AND (serial_number = $3 OR lot_number = $4)
        `, [d.client_id, d.part_id, d.serial_number, d.lot_number]);
      }
    }

    res.json({
      success: true,
      destination,
      newStatus,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error rejecting defect:', error);
    res.status(500).json({ success: false, message: 'Error al rechazar defecto' });
  }
});

// APPROVE - Supervisor aprueba reparación/liberación
router.post('/entries/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { approved, notes } = req.body;

  try {
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    if (defect.rows[0].repair_status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'El defecto no está pendiente de aprobación' });
    }

    let newStatus;
    if (approved) {
      // Determine next status based on whether it was repaired or released
      newStatus = defect.rows[0].released_at ? 'CLOSED' : 'REPAIRED';
    } else {
      newStatus = 'REJECTED';
    }

    // Update defect
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = $1,
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP,
        approval_notes = $3,
        requires_approval = false,
        status = CASE WHEN $1 = 'CLOSED' THEN 'closed' ELSE status END,
        resolved_at = CASE WHEN $1 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        repair_attempts = CASE WHEN $1 = 'REJECTED' THEN repair_attempts + 1 ELSE repair_attempts END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [newStatus, req.user.id, notes, id]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, performed_by, comments)
      VALUES ($1, $2, 'PENDING_APPROVAL', $3, $4, $5)
    `, [id, approved ? 'APPROVED' : 'REJECTED', newStatus, req.user.id, notes]);

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error approving defect:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar defecto' });
  }
});

// QUARANTINE - No se puede reparar, pendiente decisión
router.post('/entries/:id/quarantine', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    if (!['IN_REPAIR', 'REJECTED', 'OPEN'].includes(defect.rows[0].repair_status)) {
      return res.status(400).json({ success: false, message: 'El defecto no puede enviarse a cuarentena en este estado' });
    }

    const oldStatus = defect.rows[0].repair_status;

    // Update defect
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'QUARANTINE',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, performed_by, comments)
      VALUES ($1, 'QUARANTINE', $2, 'QUARANTINE', $3, $4)
    `, [id, oldStatus, req.user.id, notes || 'Enviado a cuarentena - no se puede reparar']);

    // Update unit_history
    if (defect.rows[0].unit_id) {
      await query(`
        INSERT INTO unit_history (unit_id, event_type, source_table, source_id, description, performed_by)
        VALUES ($1, 'QUARANTINE', 'defect_entries_v2', $2, $3, $4)
      `, [defect.rows[0].unit_id, id, notes || 'Pieza en cuarentena - no se puede reparar', req.user.id]);

      // Update unit status
      await query(`
        UPDATE unit_registry SET current_status = 'QUARANTINE' WHERE id = $1
      `, [defect.rows[0].unit_id]);
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error quarantining defect:', error);
    res.status(500).json({ success: false, message: 'Error al enviar a cuarentena' });
  }
});

// SCRAP - Descartar pieza
router.post('/entries/:id/scrap', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    if (!['IN_REPAIR', 'REJECTED', 'QUARANTINE', 'OPEN'].includes(defect.rows[0].repair_status)) {
      return res.status(400).json({ success: false, message: 'El defecto no puede enviarse a scrap en este estado' });
    }

    const oldStatus = defect.rows[0].repair_status;

    // Update defect - SCRAPPED is a final state
    const result = await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'SCRAPPED',
        status = 'closed',
        scrapped_at = CURRENT_TIMESTAMP,
        scrapped_by = $2,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, req.user.id]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, old_status, new_status, performed_by, comments)
      VALUES ($1, 'SCRAPPED', $2, 'SCRAPPED', $3, $4)
    `, [id, oldStatus, req.user.id, notes || 'Pieza descartada - scrap']);

    // Update unit_history
    if (defect.rows[0].unit_id) {
      await query(`
        INSERT INTO unit_history (unit_id, event_type, source_table, source_id, description, performed_by)
        VALUES ($1, 'SCRAPPED', 'defect_entries_v2', $2, $3, $4)
      `, [defect.rows[0].unit_id, id, notes || 'Pieza descartada - scrap', req.user.id]);

      // Update unit status
      await query(`
        UPDATE unit_registry SET current_status = 'SCRAPPED' WHERE id = $1
      `, [defect.rows[0].unit_id]);
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error scrapping defect:', error);
    res.status(500).json({ success: false, message: 'Error al enviar a scrap' });
  }
});

// GET defect events/history
router.get('/entries/:id/events', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT de.*,
             CONCAT(u.first_name, ' ', u.last_name) as performed_by_name,
             rt.name as repair_type_name,
             rr.name as release_reason_name,
             rc.name as root_cause_name,
             dep_old.name as old_department_name,
             dep_new.name as new_department_name
      FROM defect_events de
      LEFT JOIN users u ON de.performed_by = u.id
      LEFT JOIN repair_types rt ON de.repair_type_id = rt.id
      LEFT JOIN release_reasons rr ON de.release_reason_id = rr.id
      LEFT JOIN root_causes rc ON de.root_cause_id = rc.id
      LEFT JOIN departments dep_old ON de.old_department_id = dep_old.id
      LEFT JOIN departments dep_new ON de.new_department_id = dep_new.id
      WHERE de.defect_id = $1
      ORDER BY de.event_at DESC
    `, [id]);

    res.json({
      success: true,
      events: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching defect events:', error);
    res.status(500).json({ success: false, message: 'Error fetching events' });
  }
});

// ============================================================================
// CATALOGS FOR REPAIR/RELEASE
// ============================================================================

// GET repair types
router.get('/repair-types', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM repair_types WHERE is_active = true ORDER BY display_order, name');
    res.json({ success: true, repairTypes: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching repair types:', error);
    res.status(500).json({ success: false, message: 'Error fetching repair types' });
  }
});

// GET release reasons
router.get('/release-reasons', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM release_reasons WHERE is_active = true ORDER BY display_order, name');
    res.json({ success: true, releaseReasons: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching release reasons:', error);
    res.status(500).json({ success: false, message: 'Error fetching release reasons' });
  }
});

// GET root causes
router.get('/root-causes', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM root_causes WHERE is_active = true ORDER BY display_order, name');
    res.json({ success: true, rootCauses: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching root causes:', error);
    res.status(500).json({ success: false, message: 'Error fetching root causes' });
  }
});

// ============================================================================
// AUTHORIZED USERS CRUD
// ============================================================================

// GET authorized users (global - sin cliente)
router.get('/authorized-users', authenticateToken, async (req, res) => {
  try {
    // Obtener permisos globales (client_id IS NULL)
    const sql = `
      SELECT dau.*,
             u.first_name, u.last_name, u.email, u.department
      FROM defect_authorized_users dau
      JOIN users u ON dau.user_id = u.id
      WHERE dau.is_active = true AND dau.client_id IS NULL
      ORDER BY u.first_name, u.last_name
    `;

    const result = await query(sql);
    res.json({ success: true, users: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching authorized users:', error);
    res.status(500).json({ success: false, message: 'Error fetching authorized users' });
  }
});

// CREATE/UPDATE authorized user (global - sin cliente)
router.post('/authorized-users', authenticateToken, async (req, res) => {
  const { userId, canRepair, canRelease, canApproveRepair, canApproveRelease } = req.body;

  try {
    // Verificar si ya existe un registro global para este usuario
    const existing = await query(
      'SELECT id FROM defect_authorized_users WHERE user_id = $1 AND client_id IS NULL',
      [userId]
    );

    let result;
    if (existing.rows.length > 0) {
      // UPDATE existente
      result = await query(`
        UPDATE defect_authorized_users SET
          can_repair = $1,
          can_release = $2,
          can_approve_repair = $3,
          can_approve_release = $4,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [canRepair || false, canRelease || false, canApproveRepair || false, canApproveRelease || false, existing.rows[0].id]);
    } else {
      // INSERT nuevo (client_id = NULL para global)
      result = await query(`
        INSERT INTO defect_authorized_users (user_id, client_id, can_repair, can_release, can_approve_repair, can_approve_release, created_by)
        VALUES ($1, NULL, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, canRepair || false, canRelease || false, canApproveRepair || false, canApproveRelease || false, req.user.id]);
    }

    res.json({ success: true, authorizedUser: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error saving authorized user:', error);
    res.status(500).json({ success: false, message: 'Error saving authorized user' });
  }
});

// DELETE authorized user (soft delete)
router.delete('/authorized-users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query('UPDATE defect_authorized_users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    res.json({ success: true, message: 'Usuario desautorizado' });
  } catch (error) {
    console.error('Error deleting authorized user:', error);
    res.status(500).json({ success: false, message: 'Error deleting authorized user' });
  }
});

// CHECK user permissions for repair/release (global permissions)
router.get('/check-permissions', authenticateToken, async (req, res) => {
  try {
    // Buscar permisos globales (client_id IS NULL)
    const result = await query(`
      SELECT can_repair, can_release, can_approve_repair, can_approve_release
      FROM defect_authorized_users
      WHERE user_id = $1 AND client_id IS NULL AND is_active = true
    `, [req.user.id]);

    if (result.rows.length === 0) {
      res.json({
        success: true,
        permissions: { canRepair: false, canRelease: false, canApproveRepair: false, canApproveRelease: false }
      });
    } else {
      res.json({
        success: true,
        permissions: transformToCamelCase(result.rows[0])
      });
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    res.status(500).json({ success: false, message: 'Error checking permissions' });
  }
});

// ============================================================================
// DEFECT TYPE CONFIG CRUD
// ============================================================================

// GET config for defect types
router.get('/type-config', authenticateToken, async (req, res) => {
  const { clientId } = req.query;

  try {
    let sql = `
      SELECT dtc.*, dt.name as defect_type_name, dt.code as defect_type_code,
             CONCAT(u.first_name, ' ', u.last_name) as escalate_to_name
      FROM defect_type_config dtc
      JOIN defect_types dt ON dtc.defect_type_id = dt.id
      LEFT JOIN users u ON dtc.escalate_to_user_id = u.id
    `;
    const params = [];

    if (clientId) {
      sql += ' WHERE dtc.client_id = $1';
      params.push(clientId);
    }

    sql += ' ORDER BY dt.name';

    const result = await query(sql, params);
    res.json({ success: true, configs: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching type configs:', error);
    res.status(500).json({ success: false, message: 'Error fetching configs' });
  }
});

// CREATE/UPDATE defect type config
router.post('/type-config', authenticateToken, async (req, res) => {
  const {
    defectTypeId, clientId, requiresRepairApproval, requiresReleaseApproval,
    maxRepairAttempts, autoEscalate, escalateToUserId, slaHoursYellow, slaHoursRed, requiresRootCause
  } = req.body;

  try {
    const result = await query(`
      INSERT INTO defect_type_config (
        defect_type_id, client_id, requires_repair_approval, requires_release_approval,
        max_repair_attempts, auto_escalate, escalate_to_user_id, sla_hours_yellow, sla_hours_red,
        requires_root_cause, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (defect_type_id, client_id) DO UPDATE SET
        requires_repair_approval = $3,
        requires_release_approval = $4,
        max_repair_attempts = $5,
        auto_escalate = $6,
        escalate_to_user_id = $7,
        sla_hours_yellow = $8,
        sla_hours_red = $9,
        requires_root_cause = $10,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      defectTypeId, clientId, requiresRepairApproval || false, requiresReleaseApproval || false,
      maxRepairAttempts || 3, autoEscalate || false, escalateToUserId,
      slaHoursYellow || 24, slaHoursRed || 48, requiresRootCause || false, req.user.id
    ]);

    res.json({ success: true, config: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error saving type config:', error);
    res.status(500).json({ success: false, message: 'Error saving config' });
  }
});

// ============================================================================
// REPAIR/RELEASE GENERAL CONFIG
// ============================================================================

// GET general config for client
router.get('/repair-config/:clientId', authenticateToken, async (req, res) => {
  const { clientId } = req.params;

  try {
    const result = await query('SELECT * FROM repair_release_config WHERE client_id = $1', [clientId]);

    if (result.rows.length === 0) {
      // Return defaults
      res.json({
        success: true,
        config: {
          clientId: parseInt(clientId),
          defaultRepairTime: 5,
          defaultReleaseTime: 1,
          colorGreenMaxHours: 24,
          colorYellowMaxHours: 48
        }
      });
    } else {
      res.json({ success: true, config: transformToCamelCase(result.rows[0]) });
    }
  } catch (error) {
    console.error('Error fetching repair config:', error);
    res.status(500).json({ success: false, message: 'Error fetching config' });
  }
});

// SAVE general config
router.post('/repair-config', authenticateToken, async (req, res) => {
  const { clientId, defaultRepairTime, defaultReleaseTime, colorGreenMaxHours, colorYellowMaxHours } = req.body;

  try {
    const result = await query(`
      INSERT INTO repair_release_config (client_id, default_repair_time, default_release_time, color_green_max_hours, color_yellow_max_hours, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (client_id) DO UPDATE SET
        default_repair_time = $2,
        default_release_time = $3,
        color_green_max_hours = $4,
        color_yellow_max_hours = $5,
        updated_by = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [clientId, defaultRepairTime || 5, defaultReleaseTime || 1, colorGreenMaxHours || 24, colorYellowMaxHours || 48, req.user.id]);

    res.json({ success: true, config: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error saving repair config:', error);
    res.status(500).json({ success: false, message: 'Error saving config' });
  }
});

// ============================================================================
// DASHBOARD VIEWS
// ============================================================================

// GET ALL defects (General tab - no status filter) with pagination
router.get('/all', authenticateToken, async (req, res) => {
  const { clientId, status, page = 1, pageSize = 100 } = req.query;
  const currentPage = Math.max(1, parseInt(page));
  const limit = Math.min(500, Math.max(10, parseInt(pageSize)));
  const offset = (currentPage - 1) * limit;

  try {
    let baseSql = 'FROM v_defects_all';
    const params = [];
    const conditions = [];

    if (clientId) {
      conditions.push(`client_name = (SELECT name FROM clients WHERE id = $${params.length + 1})`);
      params.push(clientId);
    }

    if (status) {
      conditions.push(`repair_status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) ${baseSql}`, params);
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const dataParams = [...params, limit, offset];
    const dataSql = `SELECT * ${baseSql} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const result = await query(dataSql, dataParams);

    res.json({
      success: true,
      defects: transformToCamelCase(result.rows),
      pagination: {
        page: currentPage,
        pageSize: limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching all defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching all defects' });
  }
});

// GET pending repairs (hospital dashboard)
router.get('/pending-repairs', authenticateToken, async (req, res) => {
  const { clientId } = req.query;

  try {
    let sql = 'SELECT * FROM v_defects_pending_repair';
    const params = [];

    if (clientId) {
      sql = `
        SELECT * FROM v_defects_pending_repair
        WHERE client_name = (SELECT name FROM clients WHERE id = $1)
      `;
      params.push(clientId);
    }

    const result = await query(sql, params);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching pending repairs:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending repairs' });
  }
});

// GET pending releases
router.get('/pending-releases', authenticateToken, async (req, res) => {
  const { clientId } = req.query;

  try {
    let sql = 'SELECT * FROM v_defects_pending_release';
    const params = [];

    if (clientId) {
      sql = `
        SELECT * FROM v_defects_pending_release
        WHERE client_name = (SELECT name FROM clients WHERE id = $1)
      `;
      params.push(clientId);
    }

    const result = await query(sql, params);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching pending releases:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending releases' });
  }
});

// GET defects pending handoff (REPAIRED status only - ready to send to QA/SCRAP/MRB)
router.get('/pending-handoff', authenticateToken, async (req, res) => {
  const { clientId } = req.query;

  try {
    let sql = `
      SELECT * FROM v_defects_pending_release
      WHERE repair_status = 'REPAIRED'
    `;
    const params = [];

    if (clientId) {
      sql = `
        SELECT * FROM v_defects_pending_release
        WHERE repair_status = 'REPAIRED'
        AND client_name = (SELECT name FROM clients WHERE id = $1)
      `;
      params.push(clientId);
    }

    sql += ' ORDER BY repaired_at';

    const result = await query(sql, params);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching pending handoff defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending handoff defects' });
  }
});

// POST handoff - Send repaired defects to QA, SCRAP, or Quarantine (MRB)
router.post('/handoff', authenticateToken, async (req, res) => {
  const { defectIds, destination, notes, releaseStationId, mrbLocationId, mrbCampaignId } = req.body;
  const userId = req.user.id;

  if (!defectIds || !Array.isArray(defectIds) || defectIds.length === 0) {
    return res.status(400).json({ success: false, message: 'defectIds array is required' });
  }

  if (!destination || !['QA', 'SCRAP', 'QUARANTINE'].includes(destination)) {
    return res.status(400).json({ success: false, message: 'destination must be QA, SCRAP, or QUARANTINE' });
  }

  try {
    const results = [];

    for (const defectId of defectIds) {
      // Verify defect exists and is in REPAIRED status
      const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [defectId]);

      if (!defect.rows[0]) {
        results.push({ defectId, success: false, message: 'Defect not found' });
        continue;
      }

      if (defect.rows[0].repair_status !== 'REPAIRED') {
        results.push({ defectId, success: false, message: 'Defect is not in REPAIRED status' });
        continue;
      }

      let newStatus;
      let eventType;

      switch (destination) {
        case 'QA':
          newStatus = 'IN_VALIDATION';
          eventType = 'HANDOFF_QA';
          break;
        case 'SCRAP':
          newStatus = 'SCRAPPED';
          eventType = 'HANDOFF_SCRAP';
          break;
        case 'QUARANTINE':
          newStatus = 'QUARANTINE';
          eventType = 'HANDOFF_MRB';
          break;
      }

      // Update defect status and MRB location/campaign if applicable
      if (destination === 'SCRAP') {
        // SCRAP: guardar quién lo scrapeó
        await query(`
          UPDATE defect_entries_v2
          SET repair_status = $1,
              current_location_id = $2,
              mrb_campaign_id = $3,
              scrapped_at = CURRENT_TIMESTAMP,
              scrapped_by = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newStatus, mrbLocationId || null, mrbCampaignId || null, defectId, userId]);
      } else if (destination === 'QUARANTINE') {
        await query(`
          UPDATE defect_entries_v2
          SET repair_status = $1,
              current_location_id = $2,
              mrb_campaign_id = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newStatus, mrbLocationId || null, mrbCampaignId || null, defectId]);
      } else {
        // QA destination
        await query(`
          UPDATE defect_entries_v2
          SET repair_status = $1,
              release_station_id = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [newStatus, releaseStationId || null, defectId]);
      }

      // Log event with location info
      const locationInfo = mrbLocationId ? ` [Location: ${mrbLocationId}]` : '';
      const campaignInfo = mrbCampaignId ? ` [Campaign: ${mrbCampaignId}]` : '';
      const fullNotes = (notes || '') + locationInfo + campaignInfo;

      await query(`
        INSERT INTO defect_events (defect_id, event_type, old_status, new_status, performed_by, comments)
        VALUES ($1, $2, 'REPAIRED', $3, $4, $5)
      `, [defectId, eventType, newStatus, userId, fullNotes || null]);

      // If SCRAP or QUARANTINE, update unit_registry
      if (destination === 'SCRAP' || destination === 'QUARANTINE') {
        const d = defect.rows[0];
        if (d.serial_number || d.lot_number) {
          await query(`
            UPDATE unit_registry
            SET open_defects = GREATEST(0, open_defects - 1)
            WHERE client_id = $1 AND part_id = $2
            AND (serial_number = $3 OR lot_number = $4)
          `, [d.client_id, d.part_id, d.serial_number, d.lot_number]);
        }
      }

      results.push({ defectId, success: true, newStatus });
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: true,
      message: `${successCount} of ${defectIds.length} defects processed`,
      results
    });
  } catch (error) {
    console.error('Error processing handoff:', error);
    res.status(500).json({ success: false, message: 'Error processing handoff' });
  }
});

// GET defects in repair (IN_REPAIR status only)
router.get('/in-repair', authenticateToken, async (req, res) => {
  const { clientId } = req.query;

  try {
    let sql = 'SELECT * FROM v_defects_in_repair';
    const params = [];

    if (clientId) {
      sql = `
        SELECT * FROM v_defects_in_repair
        WHERE client_name = (SELECT name FROM clients WHERE id = $1)
      `;
      params.push(clientId);
    }

    const result = await query(sql, params);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching in-repair defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching in-repair defects' });
  }
});

// GET serial/lot history (all defects grouped by serial with complete history)
router.get('/serial-history', authenticateToken, async (req, res) => {
  const { clientId, serial } = req.query;

  try {
    let sql = 'SELECT * FROM v_defect_serial_history';
    const params = [];
    const conditions = [];

    if (clientId) {
      conditions.push(`client_name = (SELECT name FROM clients WHERE id = $${params.length + 1})`);
      params.push(clientId);
    }

    if (serial) {
      conditions.push(`(serial_number ILIKE $${params.length + 1} OR lot_number ILIKE $${params.length + 1})`);
      params.push(`%${serial}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY serial_group, captured_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching serial history:', error);
    res.status(500).json({ success: false, message: 'Error fetching serial history' });
  }
});

// ============================================================================
// GET /search - Search defects by serial/part/defect type (for deviation linking)
// Supports bulk serial search (comma or newline separated)
// ============================================================================
router.get('/search', authenticateToken, async (req, res) => {
  const { serial, serials, partNumber, defectTypeId, status } = req.query;

  // Allow search by serials (bulk), single serial, part number, or defect type
  if (!serial && !serials && !partNumber && !defectTypeId) {
    return res.status(400).json({
      success: false,
      message: 'At least one search parameter required (serial, serials, partNumber, or defectTypeId)'
    });
  }

  try {
    let sql = `
      SELECT
        de.id, de.entry_number, de.serial_number, de.lot_number, de.status, de.repair_status,
        de.captured_at, de.repaired_at, de.released_at,
        dt.id as defect_type_id, dt.name as defect_type_name, dt.code as defect_type_code,
        cp.part_number, cp.part_name, c.name as client_name,
        de.notes
      FROM defect_entries_v2 de
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN clients c ON de.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Bulk serial search (comma, newline, or space separated)
    if (serials) {
      const serialList = serials.split(/[,\n\r\s]+/)
        .map(s => s.trim())
        .filter(s => s.length >= 2);
      if (serialList.length > 0) {
        // Use exact match for bulk - busca en serial_number Y lot_number
        sql += ` AND (de.serial_number = ANY($${paramIndex}::text[]) OR de.lot_number = ANY($${paramIndex}::text[]))`;
        params.push(serialList);
        paramIndex++;
      }
    } else if (serial && serial.trim().length >= 2) {
      // Single serial partial match - busca en serial_number Y lot_number
      sql += ` AND (de.serial_number ILIKE $${paramIndex} OR de.lot_number ILIKE $${paramIndex})`;
      params.push(`%${serial.trim()}%`);
      paramIndex++;
    }

    // Part number filter
    if (partNumber && partNumber.trim().length >= 2) {
      sql += ` AND cp.part_number ILIKE $${paramIndex}`;
      params.push(`%${partNumber.trim()}%`);
      paramIndex++;
    }

    // Defect type filter
    if (defectTypeId) {
      sql += ` AND de.defect_type_id = $${paramIndex}`;
      params.push(parseInt(defectTypeId));
      paramIndex++;
    }

    // Filter by repair_status if provided (comma-separated)
    if (status) {
      const statuses = status.split(',').map(s => s.trim().toUpperCase());
      sql += ` AND de.repair_status = ANY($${paramIndex}::text[])`;
      params.push(statuses);
      paramIndex++;
    }

    sql += ' ORDER BY de.captured_at DESC LIMIT 200';

    const result = await query(sql, params);
    res.json({
      success: true,
      defects: transformToCamelCase(result.rows),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error searching defects:', error);
    res.status(500).json({ success: false, message: 'Error searching defects' });
  }
});

// ============================================================================
// POST /search-bulk - Bulk search defects (for large serial lists)
// ============================================================================
router.post('/search-bulk', authenticateToken, async (req, res) => {
  const { serials, partNumber, partId, partIds, defectTypeId, status, clientId, entryFrom, entryTo, dateFrom, dateTo } = req.body;

  // Allow search by serials (bulk), part number, defect type, or client
  if ((!serials || serials.length === 0) && !partNumber && !partIds && !partId && !defectTypeId && !clientId) {
    return res.status(400).json({
      success: false,
      message: 'At least one search parameter required (serials, partNumber, partIds, defectTypeId, or clientId)'
    });
  }

  try {
    let sql = `
      SELECT
        de.id, de.entry_number, de.serial_number, de.lot_number, de.status, de.repair_status,
        de.captured_at, de.repaired_at, de.released_at,
        COALESCE(de.department_name, dept.name) as department_name,
        dt.id as defect_type_id, dt.name as defect_type_name, dt.code as defect_type_code,
        cp.part_number, cp.part_name, c.name as client_name,
        de.notes
      FROM defect_entries_v2 de
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN departments dept ON de.department_id = dept.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Bulk serial search (array) - busca en serial_number Y lot_number
    if (serials && Array.isArray(serials) && serials.length > 0) {
      const cleanSerials = serials.map(s => s.trim()).filter(s => s.length >= 2);
      if (cleanSerials.length > 0) {
        sql += ` AND (de.serial_number = ANY($${paramIndex}::text[]) OR de.lot_number = ANY($${paramIndex}::text[]))`;
        params.push(cleanSerials);
        paramIndex++;
      }
    }

    // Client filter (auto from deviation context)
    if (clientId) {
      sql += ` AND de.client_id = $${paramIndex}`;
      params.push(parseInt(clientId));
      paramIndex++;
    }

    // Part IDs filter (multiple selection)
    if (partIds && Array.isArray(partIds) && partIds.length > 0) {
      sql += ` AND de.part_id = ANY($${paramIndex}::int[])`;
      params.push(partIds.map(id => parseInt(id)));
      paramIndex++;
    }
    // Single Part ID filter (backward compatibility)
    else if (partId) {
      sql += ` AND de.part_id = $${paramIndex}`;
      params.push(parseInt(partId));
      paramIndex++;
    }

    // Part number filter (text search fallback)
    if (!partIds && !partId && partNumber && partNumber.trim().length >= 2) {
      sql += ` AND cp.part_number ILIKE $${paramIndex}`;
      params.push(`%${partNumber.trim()}%`);
      paramIndex++;
    }

    // Defect type filter
    if (defectTypeId) {
      sql += ` AND de.defect_type_id = $${paramIndex}`;
      params.push(parseInt(defectTypeId));
      paramIndex++;
    }

    // Filter by repair_status if provided (comma-separated string or array)
    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',').map(s => s.trim().toUpperCase());
      sql += ` AND de.repair_status = ANY($${paramIndex}::text[])`;
      params.push(statuses);
      paramIndex++;
    }

    // Entry number range filter (extract only trailing sequential number, e.g., DEF-2026-00607 -> 607)
    if (entryFrom) {
      sql += ` AND CAST(SUBSTRING(de.entry_number FROM '([0-9]+)$') AS INTEGER) >= $${paramIndex}`;
      params.push(parseInt(entryFrom));
      paramIndex++;
    }
    if (entryTo) {
      sql += ` AND CAST(SUBSTRING(de.entry_number FROM '([0-9]+)$') AS INTEGER) <= $${paramIndex}`;
      params.push(parseInt(entryTo));
      paramIndex++;
    }

    // Date range filter (captured_at)
    if (dateFrom) {
      sql += ` AND de.captured_at >= $${paramIndex}::date`;
      params.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      sql += ` AND de.captured_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(dateTo);
      paramIndex++;
    }

    sql += ' ORDER BY de.captured_at DESC LIMIT 500';

    const result = await query(sql, params);
    res.json({
      success: true,
      defects: transformToCamelCase(result.rows),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error bulk searching defects:', error);
    res.status(500).json({ success: false, message: 'Error searching defects' });
  }
});

// ============================================================================
// DEFECT ATTACHMENTS ENDPOINTS
// ============================================================================

// GET attachments for a defect
router.get('/entries/:id/attachments', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT da.*,
              COALESCE(u.first_name || ' ' || u.last_name, u.email) as uploaded_by_name
       FROM defect_attachments da
       LEFT JOIN users u ON da.uploaded_by = u.id
       WHERE da.defect_id = $1
       ORDER BY da.uploaded_at DESC`,
      [id]
    );

    res.json({
      success: true,
      attachments: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ success: false, message: 'Error fetching attachments' });
  }
});

// POST upload attachment
router.post('/entries/:id/attachments', authenticateToken, attachmentUpload.single('file'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    // Verificar que el defecto existe
    const defect = await query('SELECT id FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    // Insertar registro en DB
    const result = await query(
      `INSERT INTO defect_attachments
       (defect_id, filename, original_name, file_path, mimetype, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        req.file.filename,
        req.file.originalname,
        'defect-attachments/' + req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.user.id
      ]
    );

    res.json({
      success: true,
      attachment: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Error uploading attachment' });
  }
});

// GET download/view attachment
router.get('/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
  const { attachmentId } = req.params;

  try {
    const result = await query(
      'SELECT * FROM defect_attachments WHERE id = $1',
      [attachmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = result.rows[0];
    const filePath = path.join(__dirname, '../uploads', attachment.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }

    // Para imágenes, permitir visualización inline
    if (attachment.mimetype.startsWith('image/')) {
      res.setHeader('Content-Type', attachment.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ success: false, message: 'Error downloading attachment' });
  }
});

// DELETE attachment
router.delete('/attachments/:attachmentId', authenticateToken, async (req, res) => {
  const { attachmentId } = req.params;

  try {
    // Obtener info del attachment
    const result = await query(
      'SELECT * FROM defect_attachments WHERE id = $1',
      [attachmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = result.rows[0];
    const filePath = path.join(__dirname, '../uploads', attachment.file_path);

    // Eliminar archivo del disco
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de DB
    await query('DELETE FROM defect_attachments WHERE id = $1', [attachmentId]);

    res.json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ success: false, message: 'Error deleting attachment' });
  }
});

// ============================================================================
// MRB SECTION - Quarantine and Scrap management
// ============================================================================

// GET defects in QUARANTINE status
router.get('/quarantine', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT
        d.id, d.entry_number, d.lot_number, d.serial_number, d.quantity,
        d.repair_status, d.repair_attempts,
        d.department_id, dep.name AS department_name,
        d.part_id, cp.part_number, cp.part_name,
        d.client_id, c.name AS client_name,
        d.defect_type_id, dt.name AS defect_type_name,
        d.notes, d.captured_at, d.created_at, d.updated_at,
        d.captured_by_user_id,
        CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
        d.repaired_by,
        CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by_name,
        d.released_by,
        CONCAT(urel.first_name, ' ', urel.last_name) AS released_by_name,
        d.current_location_id, lc.code AS location_code, lc.description AS location_description,
        (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.updated_at)) / 3600 AS hours_in_quarantine
      FROM defect_entries_v2 d
      LEFT JOIN users uc ON d.captured_by_user_id = uc.id
      LEFT JOIN users ur ON d.repaired_by = ur.id
      LEFT JOIN users urel ON d.released_by = urel.id
      LEFT JOIN departments dep ON d.department_id = dep.id
      LEFT JOIN client_parts cp ON d.part_id = cp.id
      LEFT JOIN clients c ON d.client_id = c.id
      LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
      LEFT JOIN location_codes lc ON d.current_location_id = lc.id
      WHERE d.repair_status = 'QUARANTINE'
      ORDER BY d.updated_at DESC
    `;
    const result = await query(sql);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching quarantine defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching quarantine defects' });
  }
});

// GET defects in SCRAPPED status (pending final confirmation)
router.get('/scrapped', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT
        d.id, d.entry_number, d.lot_number, d.serial_number, d.quantity,
        d.repair_status, d.repair_attempts,
        d.department_id, dep.name AS department_name,
        d.part_id, cp.part_number, cp.part_name,
        d.client_id, c.name AS client_name,
        d.defect_type_id, dt.name AS defect_type_name,
        d.notes, d.captured_at, d.created_at, d.updated_at,
        d.captured_by_user_id,
        CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
        d.repaired_by,
        CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by_name,
        d.scrapped_at, d.scrapped_by,
        CONCAT(us.first_name, ' ', us.last_name) AS scrapped_by_name,
        d.current_location_id, lc.code AS location_code, lc.description AS location_description,
        (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.scrapped_at, d.updated_at))) / 3600 AS hours_in_scrap
      FROM defect_entries_v2 d
      LEFT JOIN users uc ON d.captured_by_user_id = uc.id
      LEFT JOIN users ur ON d.repaired_by = ur.id
      LEFT JOIN users us ON d.scrapped_by = us.id
      LEFT JOIN departments dep ON d.department_id = dep.id
      LEFT JOIN client_parts cp ON d.part_id = cp.id
      LEFT JOIN clients c ON d.client_id = c.id
      LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
      LEFT JOIN location_codes lc ON d.current_location_id = lc.id
      WHERE d.repair_status = 'SCRAPPED' AND (d.scrap_confirmed IS NULL OR d.scrap_confirmed = false)
      ORDER BY d.updated_at DESC
    `;
    const result = await query(sql);
    res.json({ success: true, defects: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching scrapped defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching scrapped defects' });
  }
});

// POST return defect from quarantine to repair
router.post('/quarantine/:id/return-to-repair', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes, repairStationId } = req.body;
  const userId = req.user.id;

  try {
    // Verify defect is in QUARANTINE
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }
    if (defect.rows[0].repair_status !== 'QUARANTINE') {
      return res.status(400).json({ success: false, message: 'El defecto no está en cuarentena' });
    }

    // Update defect status
    await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'PENDING_REPAIR',
        repair_station_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, repairStationId || null]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments, created_at)
      VALUES ($1, 'MRB_RETURN_TO_REPAIR', $2, $3, CURRENT_TIMESTAMP)
    `, [id, userId, notes || 'Devuelto a reparación desde MRB']);

    // Update unit_registry if exists
    await query(`
      UPDATE unit_registry SET current_status = 'DEFECTIVE'
      WHERE serial_number = $1 OR lot_number = $1
    `, [defect.rows[0].serial_number || defect.rows[0].lot_number]);

    res.json({ success: true, message: 'Defecto devuelto a reparación' });
  } catch (error) {
    console.error('Error returning to repair:', error);
    res.status(500).json({ success: false, message: 'Error al devolver a reparación' });
  }
});

// POST send defect from quarantine to scrap
router.post('/quarantine/:id/to-scrap', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.id;

  try {
    // Verify defect is in QUARANTINE
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }
    if (defect.rows[0].repair_status !== 'QUARANTINE') {
      return res.status(400).json({ success: false, message: 'El defecto no está en cuarentena' });
    }

    // Update defect status
    await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'SCRAPPED',
        scrapped_at = CURRENT_TIMESTAMP,
        scrapped_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, userId]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments, created_at)
      VALUES ($1, 'MRB_TO_SCRAP', $2, $3, CURRENT_TIMESTAMP)
    `, [id, userId, notes || 'Enviado a scrap desde MRB']);

    // Update unit_registry
    await query(`
      UPDATE unit_registry SET current_status = 'SCRAPPED'
      WHERE serial_number = $1 OR lot_number = $1
    `, [defect.rows[0].serial_number || defect.rows[0].lot_number]);

    res.json({ success: true, message: 'Defecto enviado a scrap' });
  } catch (error) {
    console.error('Error sending to scrap:', error);
    res.status(500).json({ success: false, message: 'Error al enviar a scrap' });
  }
});

// POST release defect from quarantine with deviation
router.post('/quarantine/:id/release-with-deviation', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes, deviationId, releaseStationId } = req.body;
  const userId = req.user.id;

  if (!deviationId) {
    return res.status(400).json({ success: false, message: 'Se requiere una desviación para liberar' });
  }

  try {
    // Verify defect is in QUARANTINE
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }
    if (defect.rows[0].repair_status !== 'QUARANTINE') {
      return res.status(400).json({ success: false, message: 'El defecto no está en cuarentena' });
    }

    // Update defect status
    await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'RELEASED',
        status = 'CLOSED',
        released_at = CURRENT_TIMESTAMP,
        released_by = $2,
        release_station_id = $3,
        deviation_id = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, userId, releaseStationId || null, deviationId]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments, created_at)
      VALUES ($1, 'MRB_RELEASE_WITH_DEVIATION', $2, $3, CURRENT_TIMESTAMP)
    `, [id, userId, notes || `Liberado con desviación #${deviationId} desde MRB`]);

    // Link defect to deviation
    await query(`
      INSERT INTO deviation_defects (deviation_id, defect_id, linked_at, linked_by)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      ON CONFLICT (deviation_id, defect_id) DO NOTHING
    `, [deviationId, id, userId]);

    // Update unit_registry
    await query(`
      UPDATE unit_registry SET current_status = 'RELEASED'
      WHERE serial_number = $1 OR lot_number = $1
    `, [defect.rows[0].serial_number || defect.rows[0].lot_number]);

    res.json({ success: true, message: 'Defecto liberado con desviación' });
  } catch (error) {
    console.error('Error releasing with deviation:', error);
    res.status(500).json({ success: false, message: 'Error al liberar con desviación' });
  }
});

// POST confirm scrap (final disposition)
router.post('/scrapped/:id/confirm', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.id;

  try {
    // Verify defect is SCRAPPED
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }
    if (defect.rows[0].repair_status !== 'SCRAPPED') {
      return res.status(400).json({ success: false, message: 'El defecto no está marcado como scrap' });
    }

    // Update defect - mark as confirmed
    await query(`
      UPDATE defect_entries_v2 SET
        status = 'CLOSED',
        scrap_confirmed = true,
        scrap_confirmed_at = CURRENT_TIMESTAMP,
        scrap_confirmed_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, userId]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments, created_at)
      VALUES ($1, 'SCRAP_CONFIRMED', $2, $3, CURRENT_TIMESTAMP)
    `, [id, userId, notes || 'Scrap confirmado - disposición final']);

    res.json({ success: true, message: 'Scrap confirmado' });
  } catch (error) {
    console.error('Error confirming scrap:', error);
    res.status(500).json({ success: false, message: 'Error al confirmar scrap' });
  }
});

// POST return defect from scrap to quarantine
router.post('/scrapped/:id/return-to-quarantine', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.id;

  try {
    // Verify defect is SCRAPPED and not confirmed
    const defect = await query('SELECT * FROM defect_entries_v2 WHERE id = $1', [id]);
    if (defect.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }
    if (defect.rows[0].repair_status !== 'SCRAPPED') {
      return res.status(400).json({ success: false, message: 'El defecto no está marcado como scrap' });
    }
    if (defect.rows[0].scrap_confirmed) {
      return res.status(400).json({ success: false, message: 'El scrap ya fue confirmado, no se puede revertir' });
    }

    // Update defect status
    await query(`
      UPDATE defect_entries_v2 SET
        repair_status = 'QUARANTINE',
        scrapped_at = NULL,
        scrapped_by = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Log event
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments, created_at)
      VALUES ($1, 'SCRAP_RETURN_TO_QUARANTINE', $2, $3, CURRENT_TIMESTAMP)
    `, [id, userId, notes || 'Devuelto a cuarentena desde scrap']);

    // Update unit_registry
    await query(`
      UPDATE unit_registry SET current_status = 'QUARANTINE'
      WHERE serial_number = $1 OR lot_number = $1
    `, [defect.rows[0].serial_number || defect.rows[0].lot_number]);

    res.json({ success: true, message: 'Defecto devuelto a cuarentena' });
  } catch (error) {
    console.error('Error returning to quarantine:', error);
    res.status(500).json({ success: false, message: 'Error al devolver a cuarentena' });
  }
});

module.exports = router;
