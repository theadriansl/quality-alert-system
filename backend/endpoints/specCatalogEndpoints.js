const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// MULTER CONFIGURATION FOR SPEC PHOTOS
// ============================================================================

const specStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/specs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'spec-' + uniqueSuffix + ext);
  }
});

const specUpload = multer({
  storage: specStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP)'));
    }
  }
});

// Upload spec reference photo
router.post('/upload-photo', authenticateToken, specUpload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }
    res.json({
      success: true,
      url: `/uploads/specs/${req.file.filename}`,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading spec photo:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// ============================================================================
// MEASUREMENT UNITS
// ============================================================================

// GET all measurement units grouped by category
router.get('/units', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM measurement_units
      WHERE is_active = true
      ORDER BY category, display_order, name
    `);

    // Group by category
    const grouped = result.rows.reduce((acc, unit) => {
      if (!acc[unit.category]) {
        acc[unit.category] = [];
      }
      acc[unit.category].push(unit);
      return acc;
    }, {});

    res.json({
      success: true,
      units: transformToCamelCase(result.rows),
      unitsByCategory: Object.keys(grouped).map(cat => ({
        category: cat,
        units: transformToCamelCase(grouped[cat])
      }))
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE custom unit
router.post('/units', authenticateToken, async (req, res) => {
  const { category, name, symbol } = req.body;

  try {
    const result = await query(`
      INSERT INTO measurement_units (category, name, symbol, is_default, display_order)
      VALUES ($1, $2, $3, false, 99)
      RETURNING *
    `, [category, name, symbol]);

    res.json({
      success: true,
      unit: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// SPECIFICATIONS CRUD
// ============================================================================

// GET specifications for a part
router.get('/parts/:partId/specs', authenticateToken, async (req, res) => {
  const { partId } = req.params;
  const { specType } = req.query;

  try {
    let sql = `
      SELECT ps.*, mu.symbol as unit_symbol, mu.name as unit_name, mu.category as unit_category,
             u.first_name || ' ' || u.last_name as created_by_name,
             bp.part_number as bom_part_number, bp.part_name as bom_part_name
      FROM part_specifications ps
      LEFT JOIN measurement_units mu ON ps.unit_id = mu.id
      LEFT JOIN users u ON ps.created_by = u.id
      LEFT JOIN client_parts bp ON ps.bom_part_id = bp.id
      WHERE ps.part_id = $1 AND ps.is_active = true
    `;
    const params = [partId];

    if (specType) {
      params.push(specType);
      sql += ` AND ps.spec_type = $${params.length}`;
    }

    sql += ` ORDER BY ps.spec_type, ps.display_order, ps.spec_number`;

    const result = await query(sql, params);

    // Group by type
    const grouped = {
      DIMENSIONAL: [],
      QUALITATIVE: [],
      BOM_COMPONENT: []
    };

    result.rows.forEach(spec => {
      if (grouped[spec.spec_type]) {
        grouped[spec.spec_type].push(spec);
      }
    });

    res.json({
      success: true,
      specs: transformToCamelCase(result.rows),
      specsByType: {
        dimensional: transformToCamelCase(grouped.DIMENSIONAL),
        qualitative: transformToCamelCase(grouped.QUALITATIVE),
        bomComponent: transformToCamelCase(grouped.BOM_COMPONENT)
      },
      counts: {
        total: result.rows.length,
        dimensional: grouped.DIMENSIONAL.length,
        qualitative: grouped.QUALITATIVE.length,
        bomComponent: grouped.BOM_COMPONENT.length,
        critical: result.rows.filter(s => s.is_critical).length
      }
    });
  } catch (error) {
    console.error('Error fetching specs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single specification
router.get('/specs/:specId', authenticateToken, async (req, res) => {
  const { specId } = req.params;

  try {
    const result = await query(`
      SELECT ps.*, mu.symbol as unit_symbol, mu.name as unit_name,
             cp.part_number, cp.part_name,
             bp.part_number as bom_part_number, bp.part_name as bom_part_name
      FROM part_specifications ps
      LEFT JOIN measurement_units mu ON ps.unit_id = mu.id
      LEFT JOIN client_parts cp ON ps.part_id = cp.id
      LEFT JOIN client_parts bp ON ps.bom_part_id = bp.id
      WHERE ps.id = $1
    `, [specId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Especificación no encontrada' });
    }

    res.json({
      success: true,
      spec: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching spec:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE specification
router.post('/parts/:partId/specs', authenticateToken, async (req, res) => {
  const { partId } = req.params;
  const {
    specNumber,
    specName,
    specType,
    lowerLimit,
    nominalValue,
    upperLimit,
    unitId,
    acceptableValues,
    bomPartId,
    isCritical,
    requiresMeasurement,
    inspectionMethod,
    inspectionFrequency,
    sampleSize,
    photoOkUrl,
    photoNokUrl,
    referencePhotoUrl,
    drawingRef,
    notes,
    qarTriggerEnabled,
    qarTriggerCount,
    qarTriggerHours
  } = req.body;

  try {
    // Get client_id from part
    const partResult = await query('SELECT client_id FROM client_parts WHERE id = $1', [partId]);
    if (partResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parte no encontrada' });
    }
    const clientId = partResult.rows[0].client_id;

    // Get next display order
    const maxOrder = await query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM part_specifications WHERE part_id = $1',
      [partId]
    );

    const result = await query(`
      INSERT INTO part_specifications (
        part_id, client_id, spec_number, spec_name, spec_type,
        lower_limit, nominal_value, upper_limit, unit_id,
        acceptable_values, bom_part_id,
        is_critical, requires_measurement, inspection_method, inspection_frequency, sample_size,
        photo_ok_url, photo_nok_url, reference_photo_url, drawing_ref, notes,
        qar_trigger_enabled, qar_trigger_count, qar_trigger_hours,
        display_order, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *
    `, [
      partId, clientId, specNumber, specName, specType,
      lowerLimit, nominalValue, upperLimit, unitId,
      acceptableValues, bomPartId,
      isCritical || false, requiresMeasurement || false, inspectionMethod, inspectionFrequency, sampleSize,
      photoOkUrl, photoNokUrl, referencePhotoUrl, drawingRef, notes,
      qarTriggerEnabled || false, qarTriggerCount || 3, qarTriggerHours || 8,
      maxOrder.rows[0].next_order, req.user.id
    ]);

    res.json({
      success: true,
      spec: transformToCamelCase(result.rows[0]),
      message: 'Especificación creada'
    });
  } catch (error) {
    console.error('Error creating spec:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE specification
router.put('/specs/:specId', authenticateToken, async (req, res) => {
  const { specId } = req.params;
  const {
    specNumber,
    specName,
    specType,
    lowerLimit,
    nominalValue,
    upperLimit,
    unitId,
    acceptableValues,
    bomPartId,
    isCritical,
    requiresMeasurement,
    inspectionMethod,
    inspectionFrequency,
    sampleSize,
    photoOkUrl,
    photoNokUrl,
    referencePhotoUrl,
    drawingRef,
    notes,
    qarTriggerEnabled,
    qarTriggerCount,
    qarTriggerHours,
    displayOrder
  } = req.body;

  try {
    const result = await query(`
      UPDATE part_specifications SET
        spec_number = COALESCE($1, spec_number),
        spec_name = COALESCE($2, spec_name),
        spec_type = COALESCE($3, spec_type),
        lower_limit = $4,
        nominal_value = $5,
        upper_limit = $6,
        unit_id = $7,
        acceptable_values = $8,
        bom_part_id = $9,
        is_critical = COALESCE($10, is_critical),
        requires_measurement = COALESCE($11, requires_measurement),
        inspection_method = $12,
        inspection_frequency = $13,
        sample_size = $14,
        photo_ok_url = COALESCE($15, photo_ok_url),
        photo_nok_url = COALESCE($16, photo_nok_url),
        reference_photo_url = COALESCE($17, reference_photo_url),
        drawing_ref = $18,
        notes = $19,
        qar_trigger_enabled = COALESCE($20, qar_trigger_enabled),
        qar_trigger_count = COALESCE($21, qar_trigger_count),
        qar_trigger_hours = COALESCE($22, qar_trigger_hours),
        display_order = COALESCE($23, display_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
      RETURNING *
    `, [
      specNumber, specName, specType,
      lowerLimit, nominalValue, upperLimit, unitId,
      acceptableValues, bomPartId,
      isCritical, requiresMeasurement, inspectionMethod, inspectionFrequency, sampleSize,
      photoOkUrl, photoNokUrl, referencePhotoUrl, drawingRef, notes,
      qarTriggerEnabled, qarTriggerCount, qarTriggerHours, displayOrder,
      specId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Especificación no encontrada' });
    }

    res.json({
      success: true,
      spec: transformToCamelCase(result.rows[0]),
      message: 'Especificación actualizada'
    });
  } catch (error) {
    console.error('Error updating spec:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE specification (soft delete)
router.delete('/specs/:specId', authenticateToken, async (req, res) => {
  const { specId } = req.params;

  try {
    await query(
      'UPDATE part_specifications SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [specId]
    );

    res.json({ success: true, message: 'Especificación eliminada' });
  } catch (error) {
    console.error('Error deleting spec:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// COPY SPECS FROM ANOTHER PART
// ============================================================================

router.post('/parts/:partId/copy-from/:sourcePartId', authenticateToken, async (req, res) => {
  const { partId, sourcePartId } = req.params;

  try {
    // Get client_id
    const partResult = await query('SELECT client_id FROM client_parts WHERE id = $1', [partId]);
    if (partResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parte destino no encontrada' });
    }
    const clientId = partResult.rows[0].client_id;

    // Copy specs
    const result = await query(`
      INSERT INTO part_specifications (
        part_id, client_id, spec_number, spec_name, spec_type,
        lower_limit, nominal_value, upper_limit, unit_id,
        acceptable_values,
        is_critical, requires_measurement, inspection_method, inspection_frequency, sample_size,
        photo_ok_url, photo_nok_url, reference_photo_url, drawing_ref, notes,
        qar_trigger_enabled, qar_trigger_count, qar_trigger_hours,
        display_order, created_by
      )
      SELECT
        $1, $2, spec_number, spec_name, spec_type,
        lower_limit, nominal_value, upper_limit, unit_id,
        acceptable_values,
        is_critical, requires_measurement, inspection_method, inspection_frequency, sample_size,
        photo_ok_url, photo_nok_url, reference_photo_url, drawing_ref, notes,
        qar_trigger_enabled, qar_trigger_count, qar_trigger_hours,
        display_order, $3
      FROM part_specifications
      WHERE part_id = $4 AND is_active = true
      RETURNING id
    `, [partId, clientId, req.user.id, sourcePartId]);

    res.json({
      success: true,
      copied: result.rows.length,
      message: `${result.rows.length} especificaciones copiadas`
    });
  } catch (error) {
    console.error('Error copying specs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// BOM COMPONENTS (Auto-populate from client_parts hierarchy)
// ============================================================================

// GET BOM components for a part (ALL descendants - children, grandchildren, etc.)
router.get('/parts/:partId/bom-components', authenticateToken, async (req, res) => {
  const { partId } = req.params;

  try {
    // Use recursive CTE to get ALL descendants (not just direct children)
    const result = await query(`
      WITH RECURSIVE descendants AS (
        -- Base case: direct children of the selected part
        SELECT cp.id, cp.part_number, cp.part_name, cp.capture_display_name,
               cp.parent_part_id, 1 as depth
        FROM client_parts cp
        WHERE cp.parent_part_id = $1 AND cp.active = true

        UNION ALL

        -- Recursive case: children of children
        SELECT cp.id, cp.part_number, cp.part_name, cp.capture_display_name,
               cp.parent_part_id, d.depth + 1
        FROM client_parts cp
        INNER JOIN descendants d ON cp.parent_part_id = d.id
        WHERE cp.active = true
      )
      SELECT d.id, d.part_number, d.part_name, d.capture_display_name, d.depth,
             ps.id as spec_id, ps.spec_number, ps.photo_ok_url, ps.reference_photo_url,
             ps.notes as spec_notes
      FROM descendants d
      LEFT JOIN part_specifications ps ON ps.bom_part_id = d.id
        AND ps.part_id = $1 AND ps.spec_type = 'BOM_COMPONENT' AND ps.is_active = true
      ORDER BY d.depth, d.part_number
    `, [partId]);

    res.json({
      success: true,
      components: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching BOM components:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADD BOM component spec (creates spec for a child part)
router.post('/parts/:partId/bom-components', authenticateToken, async (req, res) => {
  const { partId } = req.params;
  const { bomPartId, referencePhotoUrl, notes } = req.body;

  try {
    // Get part info
    const partResult = await query(
      'SELECT client_id FROM client_parts WHERE id = $1',
      [partId]
    );
    const bomPartResult = await query(
      'SELECT part_number, part_name FROM client_parts WHERE id = $1',
      [bomPartId]
    );

    if (partResult.rows.length === 0 || bomPartResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parte no encontrada' });
    }

    const clientId = partResult.rows[0].client_id;
    const bomPart = bomPartResult.rows[0];

    // Generate spec number
    const countResult = await query(
      "SELECT COUNT(*) as count FROM part_specifications WHERE part_id = $1 AND spec_type = 'BOM_COMPONENT'",
      [partId]
    );
    const specNumber = `BOM-${String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0')}`;

    const result = await query(`
      INSERT INTO part_specifications (
        part_id, client_id, spec_number, spec_name, spec_type,
        bom_part_id, reference_photo_url, notes, created_by
      ) VALUES ($1, $2, $3, $4, 'BOM_COMPONENT', $5, $6, $7, $8)
      RETURNING *
    `, [
      partId, clientId, specNumber, `${bomPart.part_number} - ${bomPart.part_name}`,
      bomPartId, referencePhotoUrl, notes, req.user.id
    ]);

    res.json({
      success: true,
      spec: transformToCamelCase(result.rows[0]),
      message: 'Componente BOM agregado'
    });
  } catch (error) {
    console.error('Error adding BOM component:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
