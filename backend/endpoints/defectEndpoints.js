const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');

// ============================================================================
// MULTER CONFIG FOR DEFECT PHOTOS
// ============================================================================
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/defect-photos');
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

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo imágenes.'), false);
    }
  }
});

// ============================================================================
// CATALOG TYPES ENDPOINTS
// ============================================================================

// GET all catalog types
router.get('/catalog-types', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM defect_catalog_types WHERE is_active = true ORDER BY display_order'
    );
    res.json({ success: true, catalogTypes: result.rows });
  } catch (error) {
    console.error('Error fetching catalog types:', error);
    res.status(500).json({ success: false, message: 'Error fetching catalog types' });
  }
});

// ============================================================================
// CATALOG ITEMS ENDPOINTS
// ============================================================================

// GET catalog items by type
router.get('/catalog-items/:typeCode', authenticateToken, async (req, res) => {
  const { typeCode } = req.params;
  const { parentId, includeInactive } = req.query;

  try {
    let sql = `
      SELECT ci.*, ct.code as catalog_type_code, ct.name as catalog_type_name,
             pi.code as parent_code, pi.name as parent_name
      FROM defect_catalog_items ci
      JOIN defect_catalog_types ct ON ci.catalog_type_id = ct.id
      LEFT JOIN defect_catalog_items pi ON ci.parent_item_id = pi.id
      WHERE ct.code = $1
    `;
    const params = [typeCode];

    if (!includeInactive) {
      sql += ' AND ci.is_active = true';
    }

    if (parentId) {
      sql += ` AND ci.parent_item_id = $${params.length + 1}`;
      params.push(parentId);
    }

    sql += ' ORDER BY ci.display_order, ci.name';

    const result = await query(sql, params);
    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error('Error fetching catalog items:', error);
    res.status(500).json({ success: false, message: 'Error fetching catalog items' });
  }
});

// GET all catalog items (for admin)
router.get('/catalog-items', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT ci.*, ct.code as catalog_type_code, ct.name as catalog_type_name,
             pi.code as parent_code, pi.name as parent_name
      FROM defect_catalog_items ci
      JOIN defect_catalog_types ct ON ci.catalog_type_id = ct.id
      LEFT JOIN defect_catalog_items pi ON ci.parent_item_id = pi.id
      ORDER BY ct.display_order, ci.display_order, ci.name
    `);
    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error('Error fetching all catalog items:', error);
    res.status(500).json({ success: false, message: 'Error fetching catalog items' });
  }
});

// CREATE catalog item
router.post('/catalog-items', authenticateToken, async (req, res) => {
  const { catalogTypeCode, code, name, description, color, icon, parentItemId, displayOrder } = req.body;

  try {
    // Get catalog type ID
    const typeResult = await query(
      'SELECT id FROM defect_catalog_types WHERE code = $1',
      [catalogTypeCode]
    );

    if (typeResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Tipo de catálogo no encontrado' });
    }

    const catalogTypeId = typeResult.rows[0].id;

    const result = await query(
      `INSERT INTO defect_catalog_items
       (catalog_type_id, code, name, description, color, icon, parent_item_id, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [catalogTypeId, code, name, description, color, icon, parentItemId || null, displayOrder || 0]
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error creating catalog item:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Ya existe un item con ese código' });
    } else {
      res.status(500).json({ success: false, message: 'Error creating catalog item' });
    }
  }
});

// UPDATE catalog item
router.put('/catalog-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, name, description, color, icon, parentItemId, displayOrder, isActive } = req.body;

  try {
    const result = await query(
      `UPDATE defect_catalog_items SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        color = $4,
        icon = $5,
        parent_item_id = $6,
        display_order = COALESCE($7, display_order),
        is_active = COALESCE($8, is_active)
       WHERE id = $9 RETURNING *`,
      [code, name, description, color, icon, parentItemId, displayOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error updating catalog item:', error);
    res.status(500).json({ success: false, message: 'Error updating catalog item' });
  }
});

// DELETE catalog item (soft delete - set inactive)
router.delete('/catalog-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;

  try {
    if (hard === 'true') {
      // Check if item is used in any defect
      const usageCheck = await query(
        `SELECT COUNT(*) FROM defect_entries WHERE
          main_item_id = $1 OR sub_part_id = $1 OR location_1_id = $1 OR
          location_2_id = $1 OR rank_id = $1 OR defect_type_id = $1 OR
          priority_id = $1 OR capture_station_id = $1`,
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar: el item está siendo usado en defectos registrados'
        });
      }

      await query('DELETE FROM defect_catalog_items WHERE id = $1', [id]);
    } else {
      await query('UPDATE defect_catalog_items SET is_active = false WHERE id = $1', [id]);
    }

    res.json({ success: true, message: 'Item eliminado' });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    res.status(500).json({ success: false, message: 'Error deleting catalog item' });
  }
});

// BULK IMPORT catalog items (from Excel)
router.post('/catalog-items/import', authenticateToken, async (req, res) => {
  const { items } = req.body; // Array of { catalogTypeCode, code, name, parentCode, color, icon }

  try {
    const results = { created: 0, updated: 0, errors: [] };

    for (const item of items) {
      try {
        // Get catalog type ID
        const typeResult = await query(
          'SELECT id FROM defect_catalog_types WHERE code = $1',
          [item.catalogTypeCode || item.catalog_type]
        );

        if (typeResult.rows.length === 0) {
          results.errors.push({ item, error: 'Tipo de catálogo no encontrado' });
          continue;
        }

        const catalogTypeId = typeResult.rows[0].id;

        // Get parent ID if specified
        let parentItemId = null;
        if (item.parentCode || item.parent_code) {
          const parentResult = await query(
            'SELECT id FROM defect_catalog_items WHERE code = $1',
            [item.parentCode || item.parent_code]
          );
          if (parentResult.rows.length > 0) {
            parentItemId = parentResult.rows[0].id;
          }
        }

        // Upsert
        const upsertResult = await query(
          `INSERT INTO defect_catalog_items (catalog_type_id, code, name, description, color, icon, parent_item_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (catalog_type_id, code) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             color = EXCLUDED.color,
             icon = EXCLUDED.icon,
             parent_item_id = EXCLUDED.parent_item_id,
             is_active = true
           RETURNING (xmax = 0) AS inserted`,
          [catalogTypeId, item.code, item.name, item.description, item.color, item.icon, parentItemId]
        );

        if (upsertResult.rows[0].inserted) {
          results.created++;
        } else {
          results.updated++;
        }
      } catch (itemError) {
        results.errors.push({ item, error: itemError.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error importing catalog items:', error);
    res.status(500).json({ success: false, message: 'Error importing catalog items' });
  }
});

// ============================================================================
// DEFECT ENTRIES ENDPOINTS
// ============================================================================

// GET defects with filters
router.get('/entries', authenticateToken, async (req, res) => {
  const {
    clientId, projectId, partId, mainItemId, subPartId,
    location1Id, location2Id, rankId, defectTypeId, priorityId,
    captureStationId, feedbackToUserId, capturedByUserId,
    status, startDate, endDate, limit = 100, offset = 0
  } = req.query;

  try {
    let sql = `
      SELECT de.*,
             c.name as client_name,
             p.project_name, p.project_number,
             cp.part_number, cp.part_name,
             mi.name as main_item_name, mi.code as main_item_code,
             sp.name as sub_part_name, sp.code as sub_part_code,
             l1.name as location_1_name, l1.code as location_1_code,
             l2.name as location_2_name, l2.code as location_2_code,
             rk.name as rank_name, rk.code as rank_code, rk.color as rank_color,
             dt.name as defect_type_name, dt.code as defect_type_code,
             pr.name as priority_name, pr.code as priority_code, pr.color as priority_color,
             cs.name as capture_station_name,
             fu.first_name as feedback_to_first_name, fu.last_name as feedback_to_last_name,
             fu.department as feedback_to_department,
             cu.first_name as captured_by_first_name, cu.last_name as captured_by_last_name
      FROM defect_entries de
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN projects p ON de.project_id = p.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN defect_catalog_items mi ON de.main_item_id = mi.id
      LEFT JOIN defect_catalog_items sp ON de.sub_part_id = sp.id
      LEFT JOIN defect_catalog_items l1 ON de.location_1_id = l1.id
      LEFT JOIN defect_catalog_items l2 ON de.location_2_id = l2.id
      LEFT JOIN defect_catalog_items rk ON de.rank_id = rk.id
      LEFT JOIN defect_catalog_items dt ON de.defect_type_id = dt.id
      LEFT JOIN defect_catalog_items pr ON de.priority_id = pr.id
      LEFT JOIN defect_catalog_items cs ON de.capture_station_id = cs.id
      LEFT JOIN users fu ON de.feedback_to_user_id = fu.id
      LEFT JOIN users cu ON de.captured_by_user_id = cu.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (clientId) { sql += ` AND de.client_id = $${paramIndex++}`; params.push(clientId); }
    if (projectId) { sql += ` AND de.project_id = $${paramIndex++}`; params.push(projectId); }
    if (partId) { sql += ` AND de.part_id = $${paramIndex++}`; params.push(partId); }
    if (mainItemId) { sql += ` AND de.main_item_id = $${paramIndex++}`; params.push(mainItemId); }
    if (subPartId) { sql += ` AND de.sub_part_id = $${paramIndex++}`; params.push(subPartId); }
    if (location1Id) { sql += ` AND de.location_1_id = $${paramIndex++}`; params.push(location1Id); }
    if (location2Id) { sql += ` AND de.location_2_id = $${paramIndex++}`; params.push(location2Id); }
    if (rankId) { sql += ` AND de.rank_id = $${paramIndex++}`; params.push(rankId); }
    if (defectTypeId) { sql += ` AND de.defect_type_id = $${paramIndex++}`; params.push(defectTypeId); }
    if (priorityId) { sql += ` AND de.priority_id = $${paramIndex++}`; params.push(priorityId); }
    if (captureStationId) { sql += ` AND de.capture_station_id = $${paramIndex++}`; params.push(captureStationId); }
    if (feedbackToUserId) { sql += ` AND de.feedback_to_user_id = $${paramIndex++}`; params.push(feedbackToUserId); }
    if (capturedByUserId) { sql += ` AND de.captured_by_user_id = $${paramIndex++}`; params.push(capturedByUserId); }
    if (status) { sql += ` AND de.status = $${paramIndex++}`; params.push(status); }
    if (startDate) { sql += ` AND de.captured_at >= $${paramIndex++}`; params.push(startDate); }
    if (endDate) { sql += ` AND de.captured_at <= $${paramIndex++}`; params.push(endDate + ' 23:59:59'); }

    sql += ` ORDER BY de.captured_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM defect_entries de WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset
    // Rebuild count query conditions...
    const countResult = await query(
      `SELECT COUNT(*) FROM defect_entries de WHERE 1=1
       ${clientId ? 'AND de.client_id = $1' : ''}`,
      clientId ? [clientId] : []
    );

    res.json({
      success: true,
      entries: result.rows,
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
             c.name as client_name,
             p.project_name, p.project_number,
             cp.part_number, cp.part_name,
             mi.name as main_item_name, mi.code as main_item_code,
             sp.name as sub_part_name, sp.code as sub_part_code,
             l1.name as location_1_name, l1.code as location_1_code,
             l2.name as location_2_name, l2.code as location_2_code,
             rk.name as rank_name, rk.code as rank_code, rk.color as rank_color,
             dt.name as defect_type_name, dt.code as defect_type_code,
             pr.name as priority_name, pr.code as priority_code, pr.color as priority_color,
             cs.name as capture_station_name,
             fu.first_name as feedback_to_first_name, fu.last_name as feedback_to_last_name,
             fu.department as feedback_to_department,
             cu.first_name as captured_by_first_name, cu.last_name as captured_by_last_name
      FROM defect_entries de
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN projects p ON de.project_id = p.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN defect_catalog_items mi ON de.main_item_id = mi.id
      LEFT JOIN defect_catalog_items sp ON de.sub_part_id = sp.id
      LEFT JOIN defect_catalog_items l1 ON de.location_1_id = l1.id
      LEFT JOIN defect_catalog_items l2 ON de.location_2_id = l2.id
      LEFT JOIN defect_catalog_items rk ON de.rank_id = rk.id
      LEFT JOIN defect_catalog_items dt ON de.defect_type_id = dt.id
      LEFT JOIN defect_catalog_items pr ON de.priority_id = pr.id
      LEFT JOIN defect_catalog_items cs ON de.capture_station_id = cs.id
      LEFT JOIN users fu ON de.feedback_to_user_id = fu.id
      LEFT JOIN users cu ON de.captured_by_user_id = cu.id
      WHERE de.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error('Error fetching defect entry:', error);
    res.status(500).json({ success: false, message: 'Error fetching defect entry' });
  }
});

// CREATE defect entry
router.post('/entries', authenticateToken, async (req, res) => {
  const {
    clientId, projectId, partId,
    mainItemId, subPartId, location1Id, location2Id,
    rankId, defectTypeId, priorityId, captureStationId,
    feedbackToUserId, manualNotes, odometer, quantity
  } = req.body;

  try {
    // Get user's department for responsible_area if feedbackToUserId provided
    let responsibleArea = null;
    if (feedbackToUserId) {
      const userResult = await query('SELECT department FROM users WHERE id = $1', [feedbackToUserId]);
      if (userResult.rows.length > 0) {
        responsibleArea = userResult.rows[0].department;
      }
    }

    // Build auto_description
    const descParts = [];
    if (mainItemId) {
      const mi = await query('SELECT name FROM defect_catalog_items WHERE id = $1', [mainItemId]);
      if (mi.rows.length > 0) descParts.push(mi.rows[0].name.toUpperCase());
    }
    if (subPartId) {
      const sp = await query('SELECT name FROM defect_catalog_items WHERE id = $1', [subPartId]);
      if (sp.rows.length > 0) descParts.push(sp.rows[0].name);
    }
    if (location1Id) {
      const l1 = await query('SELECT name FROM defect_catalog_items WHERE id = $1', [location1Id]);
      if (l1.rows.length > 0) descParts.push(l1.rows[0].name);
    }
    if (location2Id) {
      const l2 = await query('SELECT name FROM defect_catalog_items WHERE id = $1', [location2Id]);
      if (l2.rows.length > 0) descParts.push('/' + l2.rows[0].name);
    }
    if (defectTypeId) {
      const dt = await query('SELECT name FROM defect_catalog_items WHERE id = $1', [defectTypeId]);
      if (dt.rows.length > 0) descParts.push(dt.rows[0].name.toUpperCase());
    }

    const autoDescription = descParts.join(' ').replace(' /', '/');

    const result = await query(
      `INSERT INTO defect_entries
       (client_id, project_id, part_id, main_item_id, sub_part_id,
        location_1_id, location_2_id, rank_id, defect_type_id, priority_id,
        capture_station_id, feedback_to_user_id, responsible_area,
        captured_by_user_id, auto_description, manual_notes, odometer, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [clientId, projectId, partId, mainItemId, subPartId,
       location1Id, location2Id, rankId, defectTypeId, priorityId,
       captureStationId, feedbackToUserId, responsibleArea,
       req.user.id, autoDescription, manualNotes, odometer, quantity || 1]
    );

    const newEntry = result.rows[0];

    // Check for auto Quality Alert threshold
    await checkAndCreateQualityAlert(newEntry);

    res.json({ success: true, entry: newEntry });
  } catch (error) {
    console.error('Error creating defect entry:', error);
    res.status(500).json({ success: false, message: 'Error creating defect entry' });
  }
});

// UPDATE defect entry
router.put('/entries/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    clientId, projectId, partId,
    mainItemId, subPartId, location1Id, location2Id,
    rankId, defectTypeId, priorityId, captureStationId,
    feedbackToUserId, manualNotes, odometer, quantity, status, resolutionNotes
  } = req.body;

  try {
    // Get user's department for responsible_area if feedbackToUserId changed
    let responsibleArea = undefined;
    if (feedbackToUserId !== undefined) {
      if (feedbackToUserId) {
        const userResult = await query('SELECT department FROM users WHERE id = $1', [feedbackToUserId]);
        responsibleArea = userResult.rows.length > 0 ? userResult.rows[0].department : null;
      } else {
        responsibleArea = null;
      }
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (clientId !== undefined) { updates.push(`client_id = $${paramIndex++}`); params.push(clientId); }
    if (projectId !== undefined) { updates.push(`project_id = $${paramIndex++}`); params.push(projectId); }
    if (partId !== undefined) { updates.push(`part_id = $${paramIndex++}`); params.push(partId); }
    if (mainItemId !== undefined) { updates.push(`main_item_id = $${paramIndex++}`); params.push(mainItemId); }
    if (subPartId !== undefined) { updates.push(`sub_part_id = $${paramIndex++}`); params.push(subPartId); }
    if (location1Id !== undefined) { updates.push(`location_1_id = $${paramIndex++}`); params.push(location1Id); }
    if (location2Id !== undefined) { updates.push(`location_2_id = $${paramIndex++}`); params.push(location2Id); }
    if (rankId !== undefined) { updates.push(`rank_id = $${paramIndex++}`); params.push(rankId); }
    if (defectTypeId !== undefined) { updates.push(`defect_type_id = $${paramIndex++}`); params.push(defectTypeId); }
    if (priorityId !== undefined) { updates.push(`priority_id = $${paramIndex++}`); params.push(priorityId); }
    if (captureStationId !== undefined) { updates.push(`capture_station_id = $${paramIndex++}`); params.push(captureStationId); }
    if (feedbackToUserId !== undefined) { updates.push(`feedback_to_user_id = $${paramIndex++}`); params.push(feedbackToUserId); }
    if (responsibleArea !== undefined) { updates.push(`responsible_area = $${paramIndex++}`); params.push(responsibleArea); }
    if (manualNotes !== undefined) { updates.push(`manual_notes = $${paramIndex++}`); params.push(manualNotes); }
    if (odometer !== undefined) { updates.push(`odometer = $${paramIndex++}`); params.push(odometer); }
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
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    params.push(id);
    const result = await query(
      `UPDATE defect_entries SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error('Error updating defect entry:', error);
    res.status(500).json({ success: false, message: 'Error updating defect entry' });
  }
});

// DELETE defect entry
router.delete('/entries/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Delete photos from disk first
    const entry = await query('SELECT photos FROM defect_entries WHERE id = $1', [id]);
    if (entry.rows.length > 0 && entry.rows[0].photos) {
      const photos = entry.rows[0].photos;
      photos.forEach(photo => {
        const filePath = path.join(__dirname, '../uploads/defect-photos', photo.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await query('DELETE FROM defect_entries WHERE id = $1', [id]);
    res.json({ success: true, message: 'Defecto eliminado' });
  } catch (error) {
    console.error('Error deleting defect entry:', error);
    res.status(500).json({ success: false, message: 'Error deleting defect entry' });
  }
});

// ============================================================================
// PHOTO ENDPOINTS
// ============================================================================

// Upload photo to defect
router.post('/entries/:id/photos', authenticateToken, photoUpload.single('photo'), async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ninguna foto' });
    }

    // Get current photos
    const entry = await query('SELECT photos FROM defect_entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    const photos = entry.rows[0].photos || [];

    // Check max photos limit
    const configResult = await query("SELECT config_value FROM defect_config WHERE config_key = 'photo_config'");
    const photoConfig = configResult.rows.length > 0 ? configResult.rows[0].config_value : { max_photos: 5 };

    if (photos.length >= photoConfig.max_photos) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Máximo ${photoConfig.max_photos} fotos por defecto`
      });
    }

    // Add new photo
    const newPhoto = {
      id: Date.now(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.id
    };

    photos.push(newPhoto);

    await query('UPDATE defect_entries SET photos = $1 WHERE id = $2', [JSON.stringify(photos), id]);

    res.json({ success: true, photo: newPhoto, allPhotos: photos });
  } catch (error) {
    console.error('Error uploading photo:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Error uploading photo' });
  }
});

// Get photo
router.get('/entries/:id/photos/:photoId', authenticateToken, async (req, res) => {
  const { id, photoId } = req.params;

  try {
    const entry = await query('SELECT photos FROM defect_entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    const photos = entry.rows[0].photos || [];
    const photo = photos.find(p => p.id === parseInt(photoId));

    if (!photo) {
      return res.status(404).json({ success: false, message: 'Foto no encontrada' });
    }

    const filePath = path.join(__dirname, '../uploads/defect-photos', photo.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error getting photo:', error);
    res.status(500).json({ success: false, message: 'Error getting photo' });
  }
});

// Delete photo
router.delete('/entries/:id/photos/:photoId', authenticateToken, async (req, res) => {
  const { id, photoId } = req.params;

  try {
    const entry = await query('SELECT photos FROM defect_entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    let photos = entry.rows[0].photos || [];
    const photo = photos.find(p => p.id === parseInt(photoId));

    if (!photo) {
      return res.status(404).json({ success: false, message: 'Foto no encontrada' });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '../uploads/defect-photos', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    photos = photos.filter(p => p.id !== parseInt(photoId));
    await query('UPDATE defect_entries SET photos = $1 WHERE id = $2', [JSON.stringify(photos), id]);

    res.json({ success: true, message: 'Foto eliminada', remainingPhotos: photos });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, message: 'Error deleting photo' });
  }
});

// ============================================================================
// DASHBOARD / STATISTICS ENDPOINTS
// ============================================================================

// Get dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  const { clientId, projectId, startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      dateFilter += ` AND captured_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND captured_at <= $${paramIndex++}`;
      params.push(endDate + ' 23:59:59');
    }
    if (clientId) {
      dateFilter += ` AND client_id = $${paramIndex++}`;
      params.push(clientId);
    }
    if (projectId) {
      dateFilter += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    // Total counts
    const totals = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed
      FROM defect_entries WHERE 1=1 ${dateFilter}
    `, params);

    // By defect type (Pareto)
    const byDefectType = await query(`
      SELECT dt.name, dt.code, COUNT(*) as count
      FROM defect_entries de
      JOIN defect_catalog_items dt ON de.defect_type_id = dt.id
      WHERE 1=1 ${dateFilter}
      GROUP BY dt.id, dt.name, dt.code
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // By area
    const byArea = await query(`
      SELECT responsible_area as area, COUNT(*) as count
      FROM defect_entries
      WHERE responsible_area IS NOT NULL ${dateFilter}
      GROUP BY responsible_area
      ORDER BY count DESC
    `, params);

    // By priority
    const byPriority = await query(`
      SELECT pr.name, pr.code, pr.color, COUNT(*) as count
      FROM defect_entries de
      JOIN defect_catalog_items pr ON de.priority_id = pr.id
      WHERE 1=1 ${dateFilter}
      GROUP BY pr.id, pr.name, pr.code, pr.color
      ORDER BY pr.display_order
    `, params);

    // Daily trend (last 30 days)
    const dailyTrend = await query(`
      SELECT DATE(captured_at) as date, COUNT(*) as count
      FROM defect_entries
      WHERE captured_at >= CURRENT_DATE - INTERVAL '30 days' ${dateFilter}
      GROUP BY DATE(captured_at)
      ORDER BY date
    `, params);

    // By capture station
    const byCaptureStation = await query(`
      SELECT cs.name, COUNT(*) as count
      FROM defect_entries de
      JOIN defect_catalog_items cs ON de.capture_station_id = cs.id
      WHERE 1=1 ${dateFilter}
      GROUP BY cs.id, cs.name
      ORDER BY count DESC
    `, params);

    // By user who captured
    const byCapturedBy = await query(`
      SELECT u.first_name, u.last_name, COUNT(*) as count
      FROM defect_entries de
      JOIN users u ON de.captured_by_user_id = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY count DESC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      stats: {
        totals: totals.rows[0],
        byDefectType: byDefectType.rows,
        byArea: byArea.rows,
        byPriority: byPriority.rows,
        dailyTrend: dailyTrend.rows,
        byCaptureStation: byCaptureStation.rows,
        byCapturedBy: byCapturedBy.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
});

// ============================================================================
// QUALITY ALERT LINKING ENDPOINTS
// ============================================================================

// GET defects by Quality Alert ID
router.get('/by-qa/:qaId', authenticateToken, async (req, res) => {
  const { qaId } = req.params;

  try {
    const result = await query(`
      SELECT de.*,
             c.name as client_name,
             p.project_name, p.project_number,
             cp.part_number, cp.part_name,
             mi.name as main_item_name,
             dt.name as defect_type_name,
             pr.name as priority_name, pr.color as priority_color
      FROM defect_entries de
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN projects p ON de.project_id = p.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN defect_catalog_items mi ON de.main_item_id = mi.id
      LEFT JOIN defect_catalog_items dt ON de.defect_type_id = dt.id
      LEFT JOIN defect_catalog_items pr ON de.priority_id = pr.id
      WHERE de.quality_alert_id = $1
      ORDER BY de.captured_at DESC
    `, [qaId]);

    res.json({ success: true, entries: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching defects by QA:', error);
    res.status(500).json({ success: false, message: 'Error fetching defects' });
  }
});

// Link defect to Quality Alert
router.post('/entries/:id/link-qa', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { qualityAlertId } = req.body;

  try {
    // Verify QA exists
    const qaCheck = await query('SELECT id FROM eightd_reports WHERE id = $1', [qualityAlertId]);
    if (qaCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quality Alert no encontrado' });
    }

    const result = await query(
      'UPDATE defect_entries SET quality_alert_id = $1 WHERE id = $2 RETURNING *',
      [qualityAlertId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error('Error linking defect to QA:', error);
    res.status(500).json({ success: false, message: 'Error linking defect' });
  }
});

// Unlink defect from Quality Alert
router.post('/entries/:id/unlink-qa', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'UPDATE defect_entries SET quality_alert_id = NULL WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error('Error unlinking defect from QA:', error);
    res.status(500).json({ success: false, message: 'Error unlinking defect' });
  }
});

// Get all configs
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM defect_config ORDER BY config_key');
    res.json({ success: true, configs: result.rows });
  } catch (error) {
    console.error('Error fetching all configs:', error);
    res.status(500).json({ success: false, message: 'Error fetching configs' });
  }
});

// ============================================================================
// CONFIG ENDPOINTS
// ============================================================================

// Get config
router.get('/config/:key', authenticateToken, async (req, res) => {
  const { key } = req.params;

  try {
    const result = await query('SELECT * FROM defect_config WHERE config_key = $1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    }
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, message: 'Error fetching config' });
  }
});

// Update config
router.put('/config/:key', authenticateToken, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    const result = await query(
      `UPDATE defect_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE config_key = $3 RETURNING *`,
      [JSON.stringify(value), req.user.id, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ success: false, message: 'Error updating config' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkAndCreateQualityAlert(defectEntry) {
  try {
    // Get config
    const configResult = await query("SELECT config_value FROM defect_config WHERE config_key = 'qa_auto_threshold'");
    if (configResult.rows.length === 0) return null;

    const config = configResult.rows[0].config_value;
    if (!config.enabled) return null;

    const { count: threshold, period_days: periodDays, group_by: groupBy } = config;

    // Build group by clause - filter out null values
    const groupFields = (groupBy || ['defect_type_id', 'part_id']).filter(field => defectEntry[field] != null);

    if (groupFields.length === 0) return null;

    const values = groupFields.map(field => defectEntry[field]);

    // Count similar defects in period (without QA assigned)
    const countResult = await query(`
      SELECT COUNT(*) as count FROM defect_entries
      WHERE ${groupFields.map((f, i) => `${f} = $${i + 1}`).join(' AND ')}
        AND captured_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
        AND quality_alert_id IS NULL
    `, values);

    const similarCount = parseInt(countResult.rows[0].count);

    if (similarCount >= threshold) {
      console.log(`[Auto QA] Threshold reached: ${similarCount} similar defects. Creating QA...`);

      // Get defect details for QA creation
      const defectDetails = await query(`
        SELECT de.*,
               c.name as client_name,
               p.project_name, p.project_number,
               cp.part_number, cp.part_name,
               dt.name as defect_type_name,
               pr.name as priority_name, pr.code as priority_code
        FROM defect_entries de
        LEFT JOIN clients c ON de.client_id = c.id
        LEFT JOIN projects p ON de.project_id = p.id
        LEFT JOIN client_parts cp ON de.part_id = cp.id
        LEFT JOIN defect_catalog_items dt ON de.defect_type_id = dt.id
        LEFT JOIN defect_catalog_items pr ON de.priority_id = pr.id
        WHERE de.id = $1
      `, [defectEntry.id]);

      const defect = defectDetails.rows[0];

      // Generate report ID
      const year = new Date().getFullYear();
      const seqResult = await query(`
        SELECT COUNT(*) + 1 as seq FROM eightd_reports
        WHERE report_id LIKE $1
      `, [`QA-${year}-%`]);
      const seq = String(seqResult.rows[0].seq).padStart(4, '0');
      const reportId = `QA-${year}-${seq}`;

      // Map priority to severity
      const severityMap = {
        'K1': 'critical', 'K2': 'critical', 'K3': 'critical', 'K4': 'critical',
        '1': 'high', '2': 'medium', '3': 'low', '4': 'low'
      };
      const severity = severityMap[defect.priority_code] || 'medium';

      // Create 8D Report
      const qaResult = await query(`
        INSERT INTO eightd_reports (
          report_id, title, description,
          supplier_name, part_number, part_name,
          severity, issue_date, status, current_step,
          d2_problem_description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'in_progress', 'escalation', $8)
        RETURNING id, report_id
      `, [
        reportId,
        `Auto QA: ${defect.defect_type_name || 'Defecto recurrente'} - ${defect.client_name || 'Cliente'}`,
        `Quality Alert generado automáticamente por ${similarCount} defectos similares en los últimos ${periodDays} días.\n\nDescripción: ${defect.auto_description || 'N/A'}`,
        defect.client_name || null,
        defect.part_number || null,
        defect.part_name || null,
        severity,
        defect.auto_description || `Defecto recurrente: ${defect.defect_type_name}`
      ]);

      const newQA = qaResult.rows[0];

      // Link all similar defects to this QA
      await query(`
        UPDATE defect_entries
        SET quality_alert_id = $1
        WHERE ${groupFields.map((f, i) => `${f} = $${i + 2}`).join(' AND ')}
          AND captured_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
          AND quality_alert_id IS NULL
      `, [newQA.id, ...values]);

      // If part exists, create eightd_parts record
      if (defect.part_id) {
        await query(`
          INSERT INTO eightd_parts (
            report_id, client_id, client_name, project_id, project_number, project_name,
            part_id, part_number, part_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          newQA.id,
          defect.client_id, defect.client_name,
          defect.project_id, defect.project_number, defect.project_name,
          defect.part_id, defect.part_number, defect.part_name
        ]);
      }

      console.log(`[Auto QA] Created: ${newQA.report_id} with ${similarCount} linked defects`);
      return newQA;
    }

    return null;
  } catch (error) {
    console.error('Error checking/creating QA threshold:', error);
    return null;
  }
}

module.exports = router;
