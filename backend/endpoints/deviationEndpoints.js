const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');
const { socketEvents } = require('../config/socket');

// ============================================================================
// FILE UPLOAD CONFIGURATION FOR DEVIATIONS
// ============================================================================
const uploadsDir = path.join(__dirname, '../uploads/deviations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'message/rfc822', 'application/vnd.ms-outlook'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// ============================================================================
// MIDDLEWARE: CHECK DEVIATION PERMISSION
// ============================================================================
const checkDeviationPermission = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT can_manage_deviations FROM hospital_user_roles
       WHERE user_id = $1 AND is_active = true AND can_manage_deviations = true
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Check if user is admin
      const adminCheck = await query(
        `SELECT hospital_role FROM hospital_user_roles
         WHERE user_id = $1 AND is_active = true AND hospital_role = 'admin'
         LIMIT 1`,
        [req.user.id]
      );

      if (adminCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para gestionar desviaciones'
        });
      }
    }
    next();
  } catch (error) {
    console.error('Error checking deviation permission:', error);
    res.status(500).json({ success: false, message: 'Error verificando permisos' });
  }
};

// ============================================================================
// GET /deviations - List all deviations with filters
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  const { clientId, status, type, search, projectId, partId } = req.query;

  try {
    let sql = `SELECT * FROM v_deviations WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (clientId) {
      paramCount++;
      sql += ` AND client_id = $${paramCount}`;
      params.push(clientId);
    }

    if (status) {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (type) {
      paramCount++;
      sql += ` AND deviation_type = $${paramCount}`;
      params.push(type);
    }

    if (projectId) {
      paramCount++;
      sql += ` AND project_id = $${paramCount}`;
      params.push(projectId);
    }

    if (partId) {
      paramCount++;
      // Incluir desviaciones que tengan esta parte en deviation_parts O desviaciones sin partes asignadas
      sql += ` AND (id IN (SELECT deviation_id FROM deviation_parts WHERE part_id = $${paramCount}) OR id NOT IN (SELECT deviation_id FROM deviation_parts))`;
      params.push(partId);
    }

    if (search) {
      paramCount++;
      sql += ` AND (reference_number ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      deviations: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching deviations:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo desviaciones' });
  }
});

// ============================================================================
// GET /deviations/:id - Get single deviation with attachments
// ============================================================================
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deviationResult = await query(`SELECT * FROM v_deviations WHERE id = $1`, [id]);

    if (deviationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Desviación no encontrada' });
    }

    const attachmentsResult = await query(
      `SELECT da.*, COALESCE(u.first_name || ' ' || u.last_name, u.email) as uploaded_by_name
       FROM deviation_attachments da
       LEFT JOIN users u ON da.uploaded_by = u.id
       WHERE da.deviation_id = $1
       ORDER BY da.uploaded_at DESC`,
      [id]
    );

    const linkedDefectsResult = await query(
      `SELECT dd.*, de.entry_number, de.repair_status as defect_status,
              de.serial_number, de.lot_number, de.department_name,
              dt.name as defect_type_name,
              COALESCE(u.first_name || ' ' || u.last_name, u.email) as linked_by_name
       FROM defect_deviations dd
       JOIN defect_entries_v2 de ON dd.defect_id = de.id
       LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
       LEFT JOIN users u ON dd.linked_by = u.id
       WHERE dd.deviation_id = $1
       ORDER BY dd.linked_at DESC`,
      [id]
    );

    res.json({
      success: true,
      deviation: transformToCamelCase(deviationResult.rows[0]),
      attachments: transformToCamelCase(attachmentsResult.rows),
      linkedDefects: transformToCamelCase(linkedDefectsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching deviation:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo desviación' });
  }
});

// ============================================================================
// POST /deviations - Create new deviation
// ============================================================================
router.post('/', authenticateToken, checkDeviationPermission, async (req, res) => {
  const {
    deviationType, description, clientId, projectId, partId, partIds,
    validityDate, notes
  } = req.body;

  if (!deviationType || !description || !clientId) {
    return res.status(400).json({
      success: false,
      message: 'Tipo, descripción y cliente son requeridos'
    });
  }

  try {
    // Create deviation (part_id kept for backwards compatibility)
    const result = await query(
      `INSERT INTO deviations (
        deviation_type, description, client_id, project_id, part_id,
        validity_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        deviationType, description, clientId,
        projectId || null, null, // part_id now managed via deviation_parts
        validityDate || null, notes || null, req.user.id
      ]
    );

    const deviationId = result.rows[0].id;

    // Insert multiple parts if provided
    const partsToInsert = partIds && partIds.length > 0 ? partIds : (partId ? [partId] : []);
    for (const pId of partsToInsert) {
      await query(
        `INSERT INTO deviation_parts (deviation_id, part_id, added_by)
         VALUES ($1, $2, $3) ON CONFLICT (deviation_id, part_id) DO NOTHING`,
        [deviationId, pId, req.user.id]
      );
    }

    // Fetch complete data with joins
    const fullResult = await query(`SELECT * FROM v_deviations WHERE id = $1`, [deviationId]);

    // Emit WebSocket event
    socketEvents.broadcast('deviation:created', {
      id: deviationId,
      deviationNumber: fullResult.rows[0].deviation_number,
      deviationType,
      clientId,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      deviation: transformToCamelCase(fullResult.rows[0]),
      message: 'Desviación creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating deviation:', error);
    res.status(500).json({ success: false, message: 'Error creando desviación' });
  }
});

// ============================================================================
// PUT /deviations/:id - Update deviation
// ============================================================================
router.put('/:id', authenticateToken, checkDeviationPermission, async (req, res) => {
  const { id } = req.params;
  const {
    deviationType, description, projectId, partId, partIds,
    validityDate, status, notes
  } = req.body;

  console.log('PUT /deviations/:id - Body:', { deviationType, projectId, partId, partIds, validityDate, status });

  try {
    const result = await query(
      `UPDATE deviations SET
        deviation_type = COALESCE($1, deviation_type),
        description = COALESCE($2, description),
        project_id = $3,
        part_id = NULL,
        validity_date = $4,
        status = COALESCE($5, status),
        notes = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        deviationType,
        description,
        projectId || null,
        validityDate || null,
        status,
        notes || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Desviación no encontrada' });
    }

    // Sync deviation_parts: delete all and re-insert
    const rawParts = partIds && partIds.length > 0 ? partIds : (partId ? [partId] : []);
    // Convert to integers and filter out invalid values
    const partsToSync = rawParts.map(p => parseInt(p, 10)).filter(p => !isNaN(p) && p > 0);

    console.log('Parts to sync:', partsToSync);

    // Delete existing parts
    await query(`DELETE FROM deviation_parts WHERE deviation_id = $1`, [id]);

    // Insert new parts (only valid ones that exist in client_parts)
    for (const pId of partsToSync) {
      try {
        await query(
          `INSERT INTO deviation_parts (deviation_id, part_id, added_by)
           VALUES ($1, $2, $3) ON CONFLICT (deviation_id, part_id) DO NOTHING`,
          [id, pId, req.user.id]
        );
      } catch (partErr) {
        console.warn(`Could not insert part ${pId}:`, partErr.message);
      }
    }

    const fullResult = await query(`SELECT * FROM v_deviations WHERE id = $1`, [id]);

    // Emit WebSocket event
    socketEvents.broadcast('deviation:updated', {
      id: parseInt(id),
      deviationNumber: fullResult.rows[0].deviation_number,
      status,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      deviation: transformToCamelCase(fullResult.rows[0]),
      message: 'Desviación actualizada'
    });
  } catch (error) {
    console.error('Error updating deviation:', error);
    res.status(500).json({ success: false, message: 'Error actualizando desviación: ' + error.message });
  }
});

// ============================================================================
// POST /deviations/:id/attachments - Upload files
// ============================================================================
router.post('/:id/attachments', authenticateToken, checkDeviationPermission, upload.array('files', 10), async (req, res) => {
  const { id } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No se enviaron archivos' });
  }

  try {
    // Verify deviation exists
    const devCheck = await query('SELECT id FROM deviations WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      // Delete uploaded files
      req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(404).json({ success: false, message: 'Desviación no encontrada' });
    }

    const insertedFiles = [];
    for (const file of req.files) {
      const result = await query(
        `INSERT INTO deviation_attachments
         (deviation_id, filename, original_name, file_path, mimetype, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, file.filename, file.originalname, `/uploads/deviations/${file.filename}`, file.mimetype, file.size, req.user.id]
      );
      insertedFiles.push(result.rows[0]);
    }

    res.json({
      success: true,
      attachments: transformToCamelCase(insertedFiles),
      message: `${insertedFiles.length} archivo(s) subido(s)`
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    // Cleanup uploaded files on error
    req.files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    res.status(500).json({ success: false, message: 'Error subiendo archivos' });
  }
});

// ============================================================================
// DELETE /deviations/:id/attachments/:attachmentId - Delete attachment
// ============================================================================
router.delete('/:id/attachments/:attachmentId', authenticateToken, checkDeviationPermission, async (req, res) => {
  const { id, attachmentId } = req.params;

  try {
    const result = await query(
      `DELETE FROM deviation_attachments WHERE id = $1 AND deviation_id = $2 RETURNING *`,
      [attachmentId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '..', result.rows[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Archivo eliminado' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ success: false, message: 'Error eliminando archivo' });
  }
});

// ============================================================================
// POST /deviations/:id/link-defect - Link deviation to defect
// ============================================================================
router.post('/:id/link-defect', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { defectId, notes, departmentId } = req.body;

  if (!defectId) {
    return res.status(400).json({ success: false, message: 'defectId es requerido' });
  }

  try {
    // Validar que el defecto sea de una parte que esté en la desviación
    const validationResult = await query(`
      SELECT
        de.part_id as defect_part_id,
        cp_def.part_number as defect_part_number,
        dp.part_id as deviation_part_id
      FROM defect_entries_v2 de
      LEFT JOIN client_parts cp_def ON de.part_id = cp_def.id
      LEFT JOIN deviation_parts dp ON dp.deviation_id = $1 AND dp.part_id = de.part_id
      WHERE de.id = $2
    `, [id, defectId]);

    if (validationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Defecto no encontrado' });
    }

    const { defect_part_id, defect_part_number, deviation_part_id } = validationResult.rows[0];

    // Si la desviación tiene partes asignadas, verificar que el defecto sea de una de ellas
    const deviationPartsResult = await query(
      'SELECT COUNT(*) as count FROM deviation_parts WHERE deviation_id = $1',
      [id]
    );
    const hasDeviationParts = parseInt(deviationPartsResult.rows[0].count) > 0;

    if (hasDeviationParts && !deviation_part_id) {
      // La desviación tiene partes pero el defecto no es de ninguna de ellas
      const allowedParts = await query(`
        SELECT cp.part_number FROM deviation_parts dp
        JOIN client_parts cp ON dp.part_id = cp.id
        WHERE dp.deviation_id = $1
      `, [id]);
      const partsList = allowedParts.rows.map(r => r.part_number).join(', ');

      return res.status(400).json({
        success: false,
        message: `No se puede vincular: el defecto es de parte ${defect_part_number || defect_part_id} pero la desviación solo aplica a: ${partsList}`
      });
    }

    const result = await query(
      `INSERT INTO defect_deviations (defect_id, deviation_id, linked_by, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (defect_id, deviation_id) DO NOTHING
       RETURNING *`,
      [defectId, id, req.user.id, notes || null]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'El defecto ya está asociado a esta desviación' });
    }

    // Si se proporcionó departmentId, actualizar el área responsable del defecto
    if (departmentId) {
      // Obtener nombre del departamento
      const deptResult = await query('SELECT name FROM departments WHERE id = $1', [departmentId]);
      const deptName = deptResult.rows[0]?.name || null;

      await query(
        `UPDATE defect_entries_v2
         SET department_id = $1, department_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [departmentId, deptName, defectId]
      );
    }

    res.json({
      success: true,
      link: transformToCamelCase(result.rows[0]),
      message: departmentId
        ? 'Desviación asociada y área actualizada'
        : 'Desviación asociada al defecto'
    });
  } catch (error) {
    console.error('Error linking deviation:', error);
    if (error.code === '23503') {
      res.status(404).json({ success: false, message: 'Defecto o desviación no encontrada' });
    } else {
      res.status(500).json({ success: false, message: 'Error asociando desviación' });
    }
  }
});

// ============================================================================
// DELETE /deviations/:id/unlink-defect/:defectId - Unlink deviation from defect
// ============================================================================
router.delete('/:id/unlink-defect/:defectId', authenticateToken, async (req, res) => {
  const { id, defectId } = req.params;

  try {
    const result = await query(
      `DELETE FROM defect_deviations WHERE deviation_id = $1 AND defect_id = $2 RETURNING *`,
      [id, defectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asociación no encontrada' });
    }

    res.json({ success: true, message: 'Asociación eliminada' });
  } catch (error) {
    console.error('Error unlinking deviation:', error);
    res.status(500).json({ success: false, message: 'Error eliminando asociación' });
  }
});

// ============================================================================
// GET /deviations/by-defect/:defectId - Get deviations linked to a defect
// ============================================================================
router.get('/by-defect/:defectId', authenticateToken, async (req, res) => {
  const { defectId } = req.params;

  try {
    const result = await query(
      `SELECT d.*, dd.linked_at, dd.notes as link_notes,
              COALESCE(u.first_name || ' ' || u.last_name, u.email) as linked_by_name
       FROM v_deviations d
       JOIN defect_deviations dd ON d.id = dd.deviation_id
       LEFT JOIN users u ON dd.linked_by = u.id
       WHERE dd.defect_id = $1
       ORDER BY dd.linked_at DESC`,
      [defectId]
    );

    res.json({
      success: true,
      deviations: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching defect deviations:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo desviaciones del defecto' });
  }
});

// ============================================================================
// GET /deviations/types - Get deviation types for dropdown
// ============================================================================
router.get('/types/list', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    types: [
      { value: 'SAE', label: 'SAE' },
      { value: 'WAIVER', label: 'Waiver' },
      { value: 'CLIENT', label: 'Cliente' },
      { value: 'ENGINEERING', label: 'Ingeniería' },
      { value: 'OTHER', label: 'Otro' }
    ]
  });
});

// ============================================================================
// GET /deviations/:id/history - Get deviation change history
// ============================================================================
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT
        dh.id,
        dh.deviation_id,
        dh.action,
        dh.field_changed,
        dh.old_value,
        dh.new_value,
        dh.performed_by,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) AS performed_by_name,
        dh.performed_at,
        dh.notes
       FROM deviation_history dh
       LEFT JOIN users u ON dh.performed_by = u.id
       WHERE dh.deviation_id = $1
       ORDER BY dh.performed_at DESC`,
      [id]
    );

    res.json({
      success: true,
      history: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching deviation history:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo historial' });
  }
});

// ============================================================================
// POST /deviations/:id/history - Add manual history entry (for notes/comments)
// ============================================================================
router.post('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;

  if (!notes) {
    return res.status(400).json({ success: false, message: 'Notas requeridas' });
  }

  try {
    const result = await query(
      `INSERT INTO deviation_history (deviation_id, action, performed_by, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, action || 'COMMENT', req.user.id, notes]
    );

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0]),
      message: 'Entrada agregada al historial'
    });
  } catch (error) {
    console.error('Error adding history entry:', error);
    res.status(500).json({ success: false, message: 'Error agregando entrada al historial' });
  }
});

module.exports = router;
