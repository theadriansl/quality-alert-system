const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// MULTER CONFIGURATION FOR CERTIFICATES
// ============================================================================

const certStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cert-' + uniqueSuffix + ext);
  }
});

const certUpload = multer({
  storage: certStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten PDF o imágenes'));
    }
  }
});

// Upload certificate
router.post('/upload-certificate', authenticateToken, certUpload.single('certificate'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    res.json({
      success: true,
      url: `/uploads/certificates/${req.file.filename}`,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({ error: 'Error al subir certificado' });
  }
});

// ============================================================================
// EQUIPMENT TYPES
// ============================================================================

router.get('/types', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM equipment_types
      WHERE is_active = true
      ORDER BY category, display_order, name
    `);

    // Group by category
    const byCategory = result.rows.reduce((acc, type) => {
      if (!acc[type.category]) acc[type.category] = [];
      acc[type.category].push(type);
      return acc;
    }, {});

    res.json({
      success: true,
      types: transformToCamelCase(result.rows),
      byCategory: Object.keys(byCategory).map(cat => ({
        category: cat,
        types: transformToCamelCase(byCategory[cat])
      }))
    });
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// EQUIPMENT CRUD
// ============================================================================

// GET all equipment with calibration status
router.get('/', authenticateToken, async (req, res) => {
  const { status, type, department, search, dueSoon } = req.query;

  try {
    let sql = `
      SELECT v.*,
        (SELECT json_agg(DISTINCT jsonb_build_object('id', ist.id, 'name', ist.name, 'code', ist.code))
         FROM part_specifications ps
         JOIN station_inspection_items sii ON sii.spec_id = ps.id AND sii.is_active = true
         JOIN station_part_config spc ON sii.station_part_config_id = spc.id AND spc.is_active = true
         JOIN inspection_stations ist ON spc.station_id = ist.id
         WHERE ps.instrument_code = v.code AND ps.is_active = true) as stations,
        (SELECT COUNT(DISTINCT ps.id)
         FROM part_specifications ps
         WHERE ps.instrument_code = v.code AND ps.is_active = true) as specs_count
      FROM v_equipment_calibration_status v
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND v.calibration_status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      sql += ` AND v.equipment_type = $${params.length}`;
    }

    if (department) {
      params.push(parseInt(department));
      sql += ` AND v.assigned_department_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (v.code ILIKE $${params.length} OR v.name ILIKE $${params.length} OR v.serial_number ILIKE $${params.length})`;
    }

    if (dueSoon === 'true') {
      sql += ` AND v.days_until_due <= 30`;
    }

    sql += ` ORDER BY v.calibration_due_date NULLS LAST, v.code`;

    const result = await query(sql, params);

    // Count by status
    const countResult = await query(`
      SELECT calibration_status, COUNT(*) as count
      FROM v_equipment_calibration_status
      GROUP BY calibration_status
    `);
    const counts = countResult.rows.reduce((acc, r) => {
      acc[r.calibration_status] = parseInt(r.count);
      return acc;
    }, {});

    res.json({
      success: true,
      equipment: transformToCamelCase(result.rows),
      counts: {
        total: result.rows.length,
        ok: counts.OK || 0,
        warning: counts.WARNING || 0,
        expired: counts.EXPIRED || 0,
        calibrating: counts.CALIBRATING || 0,
        outOfService: counts.OUT_OF_SERVICE || 0
      }
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single equipment with history
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const equipResult = await query(`
      SELECT v.*,
        (SELECT json_agg(DISTINCT jsonb_build_object('id', ist.id, 'name', ist.name, 'code', ist.code))
         FROM part_specifications ps
         JOIN station_inspection_items sii ON sii.spec_id = ps.id AND sii.is_active = true
         JOIN station_part_config spc ON sii.station_part_config_id = spc.id AND spc.is_active = true
         JOIN inspection_stations ist ON spc.station_id = ist.id
         WHERE ps.instrument_code = v.code AND ps.is_active = true) as stations
      FROM v_equipment_calibration_status v
      WHERE v.id = $1
    `, [id]);

    if (equipResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }

    // Get calibration history
    const historyResult = await query(`
      SELECT ch.*, u.first_name || ' ' || u.last_name as performed_by_name
      FROM calibration_history ch
      LEFT JOIN users u ON ch.performed_by = u.id
      WHERE ch.equipment_id = $1
      ORDER BY ch.calibration_date DESC
      LIMIT 10
    `, [id]);

    // Get specs using this equipment
    const specsResult = await query(`
      SELECT ps.id, ps.spec_number, ps.spec_name, ps.spec_type,
             cp.part_number, cp.part_name
      FROM part_specifications ps
      JOIN client_parts cp ON ps.part_id = cp.id
      WHERE ps.instrument_code = $1 AND ps.is_active = true
      ORDER BY cp.part_number, ps.spec_number
    `, [equipResult.rows[0].code]);

    res.json({
      success: true,
      equipment: transformToCamelCase(equipResult.rows[0]),
      history: transformToCamelCase(historyResult.rows),
      linkedSpecs: transformToCamelCase(specsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE equipment
router.post('/', authenticateToken, async (req, res) => {
  const {
    code, name, description, brand, model, serialNumber, equipmentType,
    lastCalibrationDate, calibrationDueDate, calibrationIntervalDays,
    calibrationProvider, certificateNumber, certificateUrl,
    status, location, assignedDepartmentId, responsibleUserId,
    measurementRange, resolution, accuracy,
    acquisitionCost, acquisitionDate, notes, stationIds
  } = req.body;

  try {
    const result = await query(`
      INSERT INTO calibration_equipment (
        code, name, description, brand, model, serial_number, equipment_type,
        last_calibration_date, calibration_due_date, calibration_interval_days,
        calibration_provider, certificate_number, certificate_url,
        status, location, assigned_department_id, responsible_user_id,
        measurement_range, resolution, accuracy,
        acquisition_cost, acquisition_date, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *
    `, [
      code, name, description, brand, model, serialNumber, equipmentType,
      lastCalibrationDate || null, calibrationDueDate || null, calibrationIntervalDays || 365,
      calibrationProvider, certificateNumber, certificateUrl,
      status || 'ACTIVE', location, assignedDepartmentId || null, responsibleUserId || null,
      measurementRange, resolution, accuracy,
      acquisitionCost || null, acquisitionDate || null, notes, req.user.id
    ]);

    const equipmentId = result.rows[0].id;

    // Assign stations if provided
    if (stationIds && stationIds.length > 0) {
      for (const stationId of stationIds) {
        await query(`
          INSERT INTO equipment_station_assignment (equipment_id, station_id)
          VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [equipmentId, stationId]);
      }
    }

    res.json({
      success: true,
      equipment: transformToCamelCase(result.rows[0]),
      message: 'Equipo creado correctamente'
    });
  } catch (error) {
    console.error('Error creating equipment:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'El código ya existe' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE equipment
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    code, name, description, brand, model, serialNumber, equipmentType,
    lastCalibrationDate, calibrationDueDate, calibrationIntervalDays,
    calibrationProvider, certificateNumber, certificateUrl,
    status, location, assignedDepartmentId, responsibleUserId,
    measurementRange, resolution, accuracy,
    acquisitionCost, acquisitionDate, notes, stationIds
  } = req.body;

  try {
    const result = await query(`
      UPDATE calibration_equipment SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        brand = $4,
        model = $5,
        serial_number = $6,
        equipment_type = $7,
        last_calibration_date = $8,
        calibration_due_date = $9,
        calibration_interval_days = COALESCE($10, calibration_interval_days),
        calibration_provider = $11,
        certificate_number = $12,
        certificate_url = $13,
        status = COALESCE($14, status),
        location = $15,
        assigned_department_id = $16,
        responsible_user_id = $17,
        measurement_range = $18,
        resolution = $19,
        accuracy = $20,
        acquisition_cost = $21,
        acquisition_date = $22,
        notes = $23,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
      RETURNING *
    `, [
      code, name, description, brand, model, serialNumber, equipmentType,
      lastCalibrationDate, calibrationDueDate, calibrationIntervalDays,
      calibrationProvider, certificateNumber, certificateUrl,
      status, location, assignedDepartmentId, responsibleUserId,
      measurementRange, resolution, accuracy,
      acquisitionCost, acquisitionDate, notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }

    // Update station assignments if provided
    if (stationIds !== undefined) {
      await query('DELETE FROM equipment_station_assignment WHERE equipment_id = $1', [id]);
      for (const stationId of (stationIds || [])) {
        await query(`
          INSERT INTO equipment_station_assignment (equipment_id, station_id)
          VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [id, stationId]);
      }
    }

    res.json({
      success: true,
      equipment: transformToCamelCase(result.rows[0]),
      message: 'Equipo actualizado'
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE equipment (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query(`
      UPDATE calibration_equipment SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    res.json({ success: true, message: 'Equipo eliminado' });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// CALIBRATION HISTORY
// ============================================================================

// Add calibration record
router.post('/:id/calibration', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    calibrationDate, dueDate, provider, certificateNumber, certificateUrl,
    result: calibResult, deviationFound, adjustmentMade, cost, notes
  } = req.body;

  try {
    // Insert history record
    await query(`
      INSERT INTO calibration_history (
        equipment_id, calibration_date, due_date, provider,
        certificate_number, certificate_url, result,
        deviation_found, adjustment_made, cost, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      id, calibrationDate, dueDate, provider,
      certificateNumber, certificateUrl, calibResult,
      deviationFound, adjustmentMade, cost, notes, req.user.id
    ]);

    // Update equipment dates
    await query(`
      UPDATE calibration_equipment SET
        last_calibration_date = $1,
        calibration_due_date = $2,
        calibration_provider = $3,
        certificate_number = $4,
        certificate_url = COALESCE($5, certificate_url),
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [calibrationDate, dueDate, provider, certificateNumber, certificateUrl, id]);

    res.json({
      success: true,
      message: 'Calibración registrada correctamente'
    });
  } catch (error) {
    console.error('Error adding calibration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get calibration history for equipment
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT ch.*, u.first_name || ' ' || u.last_name as performed_by_name
      FROM calibration_history ch
      LEFT JOIN users u ON ch.performed_by = u.id
      WHERE ch.equipment_id = $1
      ORDER BY ch.calibration_date DESC
    `, [id]);

    res.json({
      success: true,
      history: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching calibration history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// DASHBOARD / ALERTS
// ============================================================================

// Get equipment due for calibration (alerts)
router.get('/alerts/due-soon', authenticateToken, async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const result = await query(`
      SELECT v.*
      FROM v_equipment_calibration_status v
      WHERE v.days_until_due <= $1
        AND v.status NOT IN ('OUT_OF_SERVICE', 'SCRAPPED', 'CALIBRATING')
      ORDER BY v.days_until_due ASC
    `, [parseInt(days)]);

    res.json({
      success: true,
      equipment: transformToCamelCase(result.rows),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching due equipment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dashboard summary
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const statusResult = await query(`
      SELECT calibration_status, COUNT(*) as count
      FROM v_equipment_calibration_status
      GROUP BY calibration_status
    `);

    const typeResult = await query(`
      SELECT equipment_type, equipment_type_name, COUNT(*) as count
      FROM v_equipment_calibration_status
      GROUP BY equipment_type, equipment_type_name
      ORDER BY count DESC
    `);

    const dueSoonResult = await query(`
      SELECT COUNT(*) as count
      FROM v_equipment_calibration_status
      WHERE days_until_due <= 30 AND days_until_due > 0
    `);

    const expiredResult = await query(`
      SELECT COUNT(*) as count
      FROM v_equipment_calibration_status
      WHERE calibration_status = 'EXPIRED'
    `);

    res.json({
      success: true,
      summary: {
        byStatus: transformToCamelCase(statusResult.rows),
        byType: transformToCamelCase(typeResult.rows),
        dueSoon: parseInt(dueSoonResult.rows[0]?.count || 0),
        expired: parseInt(expiredResult.rows[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// EQUIPMENT SEARCH (for spec linking)
// ============================================================================

router.get('/search/active', authenticateToken, async (req, res) => {
  const { search, type } = req.query;

  try {
    let sql = `
      SELECT id, code, name, equipment_type, brand, model,
             calibration_status, days_until_due
      FROM v_equipment_calibration_status
      WHERE calibration_status IN ('OK', 'WARNING')
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (code ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }

    if (type) {
      params.push(type);
      sql += ` AND equipment_type = $${params.length}`;
    }

    sql += ` ORDER BY code LIMIT 50`;

    const result = await query(sql, params);

    res.json({
      success: true,
      equipment: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error searching equipment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// COSTS REPORT
// ============================================================================

// Get calibration costs summary
router.get('/reports/costs', authenticateToken, async (req, res) => {
  const { startDate, endDate, equipmentType } = req.query;

  try {
    let params = [];
    let dateFilter = '';
    let typeFilter = '';

    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND ch.calibration_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND ch.calibration_date <= $${params.length}`;
    }
    if (equipmentType) {
      params.push(equipmentType);
      typeFilter = ` AND ce.equipment_type = $${params.length}`;
    }

    // Summary by equipment
    const byEquipment = await query(`
      SELECT
        ce.id,
        ce.code,
        ce.name,
        ce.equipment_type,
        et.name as equipment_type_name,
        COUNT(ch.id) as calibration_count,
        COALESCE(SUM(ch.cost), 0) as total_cost,
        MAX(ch.calibration_date) as last_calibration,
        AVG(ch.cost) as avg_cost
      FROM calibration_equipment ce
      LEFT JOIN calibration_history ch ON ch.equipment_id = ce.id ${dateFilter}
      LEFT JOIN equipment_types et ON ce.equipment_type = et.code
      WHERE ce.is_active = true ${typeFilter}
      GROUP BY ce.id, ce.code, ce.name, ce.equipment_type, et.name
      HAVING COUNT(ch.id) > 0 OR 1=1
      ORDER BY total_cost DESC NULLS LAST
    `, params);

    // Summary by type
    const byType = await query(`
      SELECT
        ce.equipment_type,
        et.name as equipment_type_name,
        COUNT(DISTINCT ce.id) as equipment_count,
        COUNT(ch.id) as calibration_count,
        COALESCE(SUM(ch.cost), 0) as total_cost
      FROM calibration_equipment ce
      LEFT JOIN calibration_history ch ON ch.equipment_id = ce.id ${dateFilter}
      LEFT JOIN equipment_types et ON ce.equipment_type = et.code
      WHERE ce.is_active = true ${typeFilter}
      GROUP BY ce.equipment_type, et.name
      ORDER BY total_cost DESC
    `, params);

    // Recent calibrations with cost
    const recentWithCost = await query(`
      SELECT
        ch.id,
        ch.calibration_date,
        ch.cost,
        ch.provider,
        ch.certificate_number,
        ce.code as equipment_code,
        ce.name as equipment_name,
        ce.equipment_type
      FROM calibration_history ch
      JOIN calibration_equipment ce ON ch.equipment_id = ce.id
      WHERE ch.cost IS NOT NULL AND ch.cost > 0 ${dateFilter} ${typeFilter}
      ORDER BY ch.calibration_date DESC
      LIMIT 50
    `, params);

    // Totals
    const totals = await query(`
      SELECT
        COUNT(DISTINCT ce.id) as total_equipment,
        COUNT(ch.id) as total_calibrations,
        COALESCE(SUM(ch.cost), 0) as total_cost,
        COALESCE(AVG(ch.cost), 0) as avg_cost
      FROM calibration_equipment ce
      LEFT JOIN calibration_history ch ON ch.equipment_id = ce.id ${dateFilter}
      WHERE ce.is_active = true ${typeFilter}
    `, params);

    res.json({
      success: true,
      byEquipment: transformToCamelCase(byEquipment.rows),
      byType: transformToCamelCase(byType.rows),
      recentWithCost: transformToCamelCase(recentWithCost.rows),
      totals: transformToCamelCase(totals.rows[0] || {})
    });
  } catch (error) {
    console.error('Error fetching costs report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
