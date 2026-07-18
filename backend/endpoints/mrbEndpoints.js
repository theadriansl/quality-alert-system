const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');
const { sendMrbBulkNotifications } = require('../utils/emailService');

// Helper: check if user is admin or recipient of an MRB campaign
async function isMrbAuthorized(userId, userRole, campaignId, recipientType = null) {
  if (userRole === 'admin') return true;
  const typeFilter = recipientType ? `AND recipient_type = '${recipientType}'` : '';
  const result = await query(
    `SELECT 1 FROM mrb_recipients WHERE mrb_campaign_id = $1 AND user_id = $2 ${typeFilter} LIMIT 1`,
    [campaignId, userId]
  );
  return result.rows.length > 0;
}

// Helper: Get frozen user name by ID
async function getUserFrozenName(userId) {
  if (!userId) return null;
  const result = await query(
    `SELECT first_name || ' ' || last_name as full_name FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.full_name || null;
}

// ============================================================================
// MULTER CONFIGURATION FOR MRB Campaign PHOTOS
// ============================================================================

const mrbStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/mrb');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'mrb-' + uniqueSuffix + ext);
  }
});

const mrbUpload = multer({
  storage: mrbStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP)'));
    }
  }
});

// Multer for additional attachments (images + PDF + office docs)
const mrbAttachStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/mrb');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'mrb-attach-' + uniqueSuffix + ext);
  }
});

const mrbAttachUpload = multer({
  storage: mrbAttachStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — sin restricción de tipo
});

// ============================================================================
// MRB Campaign PHOTO UPLOAD
// ============================================================================

// Upload a photo for MRB Campaign (NOK or OK)
router.post('/upload-photo', authenticateToken, mrbUpload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const photoUrl = `/uploads/mrb/${req.file.filename}`;

    res.json({
      success: true,
      url: photoUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error uploading MRB Campaign photo:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// ============================================================================
// MRB Campaign THRESHOLD CHECK
// ============================================================================

// Check if MRB Campaign threshold is reached for a part/severity/department combination
router.post('/check-threshold', authenticateToken, async (req, res) => {
  const { partId, severityId, departmentId } = req.body;

  try {
    // Get severity threshold settings
    const severityResult = await query(
      'SELECT * FROM inspection_severities WHERE id = $1',
      [severityId]
    );

    if (severityResult.rows.length === 0) {
      return res.json({ triggered: false, message: 'Severity not found' });
    }

    const severity = severityResult.rows[0];
    const thresholdCount = severity.mrb_threshold_count || 0;
    const thresholdHours = severity.mrb_threshold_hours || 24;

    if (thresholdCount === 0) {
      return res.json({ triggered: false, message: 'No threshold configured' });
    }

    // Count defects in the threshold period, filtered by department (responsible)
    const countResult = await query(`
      SELECT COUNT(*) as defect_count
      FROM defect_entries_v2 de
      WHERE de.part_id = $1
        AND de.severity_id = $2
        AND de.department_id = $3
        AND de.created_at >= NOW() - INTERVAL '${thresholdHours} hours'
    `, [partId, severityId, departmentId]);

    const defectCount = parseInt(countResult.rows[0].defect_count);

    // Get department name
    const deptNames = {
      1: 'Producción', 2: 'Calidad', 3: 'Ingeniería',
      4: 'Mantenimiento', 5: 'Logística', 6: 'Proveedor'
    };
    const departmentName = deptNames[departmentId] || 'Desconocido';

    if (defectCount >= thresholdCount) {
      // Get the defects that triggered this (with station and inspector info)
      const defectsResult = await query(`
        SELECT de.id, de.entry_number, dt.name as defect_name, de.created_at,
               st.code as station_code, st.name as station_name,
               u.first_name || ' ' || u.last_name as inspector_name,
               de.lot_number
        FROM defect_entries_v2 de
        JOIN defect_types dt ON de.defect_type_id = dt.id
        LEFT JOIN inspection_stations st ON de.station_id = st.id
        LEFT JOIN users u ON de.inspector_id = u.id
        WHERE de.part_id = $1
          AND de.severity_id = $2
          AND de.department_id = $3
          AND de.created_at >= NOW() - INTERVAL '${thresholdHours} hours'
        ORDER BY de.created_at DESC
      `, [partId, severityId, departmentId]);

      return res.json({
        triggered: true,
        defectCount,
        thresholdCount,
        thresholdHours,
        severityName: severity.name,
        severityCode: severity.code,
        severityColor: severity.color,
        departmentId,
        departmentName,
        defects: transformToCamelCase(defectsResult.rows),
        message: `Se alcanzó el umbral: ${defectCount} defectos ${severity.name} de ${departmentName} en ${thresholdHours}h (límite: ${thresholdCount})`
      });
    }

    return res.json({
      triggered: false,
      defectCount,
      thresholdCount,
      thresholdHours,
      departmentName,
      remaining: thresholdCount - defectCount
    });

  } catch (error) {
    console.error('Error checking MRB Campaign threshold:', error);
    res.status(500).json({ success: false, message: 'Error checking threshold' });
  }
});

// ============================================================================
// MRB ACTIVE CAMPAIGNS - For Defect Capture Station
// ============================================================================

// GET /mrb/active-campaigns - List active MRB campaigns for capture station
router.get('/active-campaigns', authenticateToken, async (req, res) => {
  const { search } = req.query;

  try {
    let sql = `
      SELECT
        mc.id,
        mc.campaign_number as folio,
        mc.title,
        mc.status,
        mc.qty_inspected,
        mc.qty_ok,
        mc.qty_nok,
        mc.qty_use_as_is,
        mc.qty_rework,
        mc.qty_scrap,
        mc.qty_return,
        mc.qty_hold,
        mc.inspection_criteria,
        mc.disposition_instructions,
        mc.photo_ok_path,
        mc.photo_nok_path,
        mc.lot_number,
        mc.created_at,
        mc.qty_quarantine_total,
        mc.qty_quarantine_warehouse,
        mc.qty_quarantine_process,
        mc.qty_quarantine_transit,
        mc.qty_quarantine_customer,
        mc.qty_quarantine_updated_at,
        c.id as client_id,
        c.name as client_name,
        p.id as project_id,
        p.project_number,
        p.project_name,
        cp.id as part_id,
        cp.part_number,
        cp.part_name,
        cp.capture_display_name,
        s.name as severity_name,
        s.color as severity_color,
        mc.source_type,
        mc.source_8d_id,
        COALESCE(qar.alert_number, eightd.report_id) as source_folio
      FROM mrb_campaigns mc
      LEFT JOIN clients c ON mc.client_id = c.id
      LEFT JOIN projects p ON mc.project_id = p.id
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      LEFT JOIN inspection_severities s ON mc.severity_id = s.id
      LEFT JOIN quality_alerts qar ON mc.source_qar_id = qar.id
      LEFT JOIN eightd_reports eightd ON mc.source_8d_id = eightd.id
      WHERE mc.status IN ('ABIERTA', 'EN_PROCESO')
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (
        mc.campaign_number ILIKE $${params.length} OR
        mc.title ILIKE $${params.length} OR
        c.name ILIKE $${params.length} OR
        cp.part_number ILIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY mc.created_at DESC LIMIT 50`;

    const result = await query(sql, params);

    res.json({
      success: true,
      campaigns: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching active MRB campaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching active campaigns' });
  }
});

// GET /mrb/:id/parts - Parts linked to the MRB campaign only
router.get('/:id/parts', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const mcRes = await query(`SELECT part_id, parts_list FROM mrb_campaigns WHERE id = $1`, [id]);
    if (!mcRes.rows.length) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    const { part_id, parts_list } = mcRes.rows[0];
    const partIds = Array.isArray(parts_list) && parts_list.length > 0
      ? parts_list.map(p => p.partId).filter(Boolean)
      : part_id ? [part_id] : [];

    let result;
    if (partIds.length > 0) {
      result = await query(`
        SELECT cp.id, cp.part_number, cp.part_name, cp.capture_display_name
        FROM client_parts cp
        WHERE cp.id = ANY($1::int[]) AND cp.active = true
        ORDER BY cp.part_number
      `, [partIds]);
    } else {
      // Fallback: campaña sin partes vinculadas — mostrar todas del proyecto
      result = await query(`
        SELECT cp.id, cp.part_number, cp.part_name, cp.capture_display_name
        FROM client_parts cp
        JOIN mrb_campaigns mc ON mc.id = $1
        WHERE cp.project_id = mc.project_id AND cp.active = true
        ORDER BY cp.part_number
      `, [id]);
    }

    res.json({ success: true, parts: transformToCamelCase(result.rows) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching MRB parts' });
  }
});

// ============================================================================
// PATCH /mrb/:id/quarantine - Update quarantine quantities (manual or sync from 8D)
// ============================================================================
router.patch('/:id/quarantine', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { syncFrom8D, warehouse, process, transit, customer } = req.body;

  try {
    if (!await isMrbAuthorized(req.user.id, req.user.role, id)) {
      return res.status(403).json({ success: false, message: 'No autorizado para modificar este MRB' });
    }
    let qWarehouse = parseInt(warehouse) || 0;
    let qProcess   = parseInt(process)   || 0;
    let qTransit   = parseInt(transit)   || 0;
    let qCustomer  = parseInt(customer)  || 0;

    // Auto-sync from linked 8D
    if (syncFrom8D) {
      const eightdRes = await query(`
        SELECT
          COALESCE(SUM(ep.qty_warehouse),     0) AS warehouse,
          COALESCE(SUM(ep.qty_in_process),    0) AS process,
          COALESCE(SUM(ep.qty_in_transit),    0) AS transit,
          COALESCE(SUM(ep.qty_with_customer), 0) AS customer
        FROM mrb_campaigns mc
        JOIN eightd_parts ep ON ep.report_id = mc.source_8d_id
        WHERE mc.id = $1
          AND mc.source_8d_id IS NOT NULL
      `, [id]);

      if (eightdRes.rows.length === 0 || !eightdRes.rows[0].warehouse) {
        return res.status(400).json({ success: false, message: 'Esta campaña no tiene un 8D vinculado con cantidades capturadas en D2' });
      }
      const row = eightdRes.rows[0];
      qWarehouse = parseInt(row.warehouse) || 0;
      qProcess   = parseInt(row.process)   || 0;
      qTransit   = parseInt(row.transit)   || 0;
      qCustomer  = parseInt(row.customer)  || 0;
    }

    const total = qWarehouse + qProcess; // Solo en planta — tránsito y cliente son informativos

    const result = await query(`
      UPDATE mrb_campaigns SET
        qty_quarantine_total    = $1,
        qty_quarantine_warehouse = $2,
        qty_quarantine_process   = $3,
        qty_quarantine_transit   = $4,
        qty_quarantine_customer  = $5,
        qty_quarantine_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, qty_quarantine_total, qty_quarantine_warehouse,
                qty_quarantine_process, qty_quarantine_transit,
                qty_quarantine_customer, qty_quarantine_updated_at
    `, [total, qWarehouse, qProcess, qTransit, qCustomer, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    res.json({ success: true, quarantine: transformToCamelCase(result.rows[0]), syncedFrom8D: !!syncFrom8D });
  } catch (error) {
    console.error('Error updating quarantine:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar cuarentena' });
  }
});

// POST /mrb/:id/capture-ok - Register OK piece for MRB campaign
router.post('/:id/capture-ok', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { quantity = 1, shiftId, partId, notes, lotNumber, serialNumber, inspectionDate, downtimeMinutes = 0 } = req.body;
  const inspectorId = req.user.id;
  const today = inspectionDate || new Date().toLocaleDateString('en-CA');
  const serial = serialNumber || lotNumber; // Usar serialNumber si existe, sino lotNumber

  try {
    // 1. Update MRB campaign counters
    const result = await query(`
      UPDATE mrb_campaigns SET
        qty_inspected = COALESCE(qty_inspected, 0) + $1,
        qty_ok = COALESCE(qty_ok, 0) + $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status IN ('ABIERTA', 'EN_PROCESO')
      RETURNING id, campaign_number, qty_inspected, qty_ok, qty_nok,
                qty_use_as_is, qty_rework, qty_scrap, qty_return, qty_hold,
                client_id, part_id, project_id
    `, [quantity, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaña MRB no encontrada o no está activa'
      });
    }

    const mrb = result.rows[0];
    const effectivePartId = partId || mrb.part_id;

    // === AFFECTED STATUS: Verificar si serial está en lista de afectados ===
    let affectedStatus = null;
    if (serial && serial.trim()) {
      const affectedCount = await query(
        'SELECT COUNT(*)::int as count FROM mrb_affected_serials WHERE mrb_campaign_id = $1',
        [id]
      );
      if (affectedCount.rows[0].count === 0) {
        affectedStatus = 'NO_LIST_DEFINED';
      } else {
        const inList = await query(
          'SELECT id FROM mrb_affected_serials WHERE mrb_campaign_id = $1 AND serial_number = $2',
          [id, serial.trim()]
        );
        affectedStatus = inList.rows.length > 0 ? 'IN_LIST' : 'OUT_OF_LIST';
      }
    }

    // === TRAZABILIDAD: Buscar o crear unit_registry ===
    let unitId = null;
    if (serial && serial.trim()) {
      const existingUnit = await query(
        'SELECT id, current_status FROM unit_registry WHERE client_id = $1 AND part_id = $2 AND serial_number = $3',
        [mrb.client_id, effectivePartId, serial.trim()]
      );

      if (existingUnit.rows.length > 0) {
        unitId = existingUnit.rows[0].id;
        const oldStatus = existingUnit.rows[0].current_status;

        // Actualizar status a OK si estaba DEFECTIVE o PENDING_REINSPECTION
        if (['DEFECTIVE', 'PENDING_REINSPECTION', 'INSPECTING'].includes(oldStatus)) {
          await query(`
            UPDATE unit_registry SET
              current_status = 'OK',
              open_defects = 0,
              last_inspection_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [unitId]);
        }
      } else {
        // Crear unit_registry - buscar si viene de production_entries
        const prodEntry = await query(`
          SELECT id FROM production_entries
          WHERE serial_number = $1 AND part_id = $2 AND client_id = $3
          LIMIT 1
        `, [serial.trim(), effectivePartId, mrb.client_id]);

        const productionEntryId = prodEntry.rows.length > 0 ? prodEntry.rows[0].id : null;
        const source = productionEntryId ? 'PRODUCTION' : 'MRB';

        const newUnit = await query(`
          INSERT INTO unit_registry (
            serial_number, lot_number, client_id, part_id, project_id,
            current_status, total_inspections, created_by, source, production_entry_id
          ) VALUES ($1, $2, $3, $4, $5, 'OK', 1, $6, $7, $8)
          RETURNING id
        `, [serial.trim(), lotNumber || null, mrb.client_id, effectivePartId, mrb.project_id, inspectorId, source, productionEntryId]);
        unitId = newUnit.rows[0].id;

        // Actualizar production_entries con unit_id si existe link
        if (productionEntryId) {
          await query('UPDATE production_entries SET unit_id = $1 WHERE id = $2', [unitId, productionEntryId]);
        }

        // Registrar evento de registro
        await query(`
          INSERT INTO unit_history (unit_id, event_type, description, performed_by)
          VALUES ($1, 'REGISTERED', $2, $3)
        `, [unitId, `Unidad registrada desde MRB OK: ${serial.trim()} (${source})`, inspectorId]);
      }
    }

    // 2. Insert into mrb_ok_entries with unit_id and serial_number
    await query(`
      INSERT INTO mrb_ok_entries
        (mrb_campaign_id, part_id, shift_id, inspector_id, quantity, inspection_date, notes, lot_number, unit_id, serial_number, affected_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [id, effectivePartId, shiftId || null, inspectorId, quantity, today, notes || null, lotNumber || null, unitId, serial || null, affectedStatus]);

    // === TRAZABILIDAD: Registrar en unit_history ===
    if (unitId) {
      await query(`
        INSERT INTO unit_history (
          unit_id, event_type, source_table, source_id, description,
          station_id, shift_id, performed_by, metadata
        ) VALUES ($1, 'MRB_OK', 'mrb_campaigns', $2, $3, $4, $5, $6, $7)
      `, [
        unitId,
        id,
        `Pieza OK en MRB ${mrb.campaign_number}`,
        null,
        shiftId || null,
        inspectorId,
        JSON.stringify({ mrbCampaignId: id, campaignNumber: mrb.campaign_number, quantity })
      ]);
    }

    // 3. Register downtime entry if applicable
    if (parseInt(downtimeMinutes) > 0) {
      await query(`
        INSERT INTO mrb_downtime_entries
          (mrb_campaign_id, shift_id, inspector_id, lot_number, downtime_minutes, source_type, notes)
        VALUES ($1, $2, $3, $4, $5, 'OK', $6)
      `, [id, shiftId || null, inspectorId, lotNumber || null, parseInt(downtimeMinutes), notes || null]);
    }

    const downtimeRes = await query(
      `SELECT COALESCE(SUM(downtime_minutes),0) AS total FROM mrb_downtime_entries
       WHERE mrb_campaign_id = $1 AND DATE(created_at) = CURRENT_DATE
       ${shiftId ? 'AND shift_id = $2' : ''}`,
      shiftId ? [id, shiftId] : [id]
    );

    res.json({
      success: true,
      mrb: transformToCamelCase(result.rows[0]),
      unitId,
      downtimeTodayMin: parseInt(downtimeRes.rows[0].total) || 0,
      message: `${quantity} pieza(s) OK registrada(s)`
    });
  } catch (error) {
    console.error('Error capturing OK piece:', error);
    res.status(500).json({ success: false, message: 'Error al registrar pieza OK' });
  }
});

// POST /mrb/:id/capture-nok - Register NOK piece with defect for MRB campaign
router.post('/:id/capture-nok', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    defectTypeId,
    severityId,
    stageId,
    dispositionId,
    stationId,
    shiftId,
    departmentId,
    lotNumber,
    serialNumber,
    downtimeMinutes = 0,
    notes,
    quantity = 1,
    partId
  } = req.body;

  const serial = serialNumber || lotNumber; // Usar serialNumber si existe, sino lotNumber

  if (!serial || !String(serial).trim()) {
    return res.status(400).json({ success: false, message: 'El número de serie / lote es requerido' });
  }

  try {
    // Get MRB campaign info
    const mrbResult = await query(`
      SELECT mc.*, cp.part_number
      FROM mrb_campaigns mc
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      WHERE mc.id = $1 AND mc.status IN ('ABIERTA', 'EN_PROCESO')
    `, [id]);

    if (mrbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaña MRB no encontrada o no está activa'
      });
    }

    const mrb = mrbResult.rows[0];
    const effectivePartId = partId || mrb.part_id;

    // === AFFECTED STATUS: Verificar si serial está en lista de afectados ===
    let affectedStatus = null;
    const affectedCount = await query(
      'SELECT COUNT(*)::int as count FROM mrb_affected_serials WHERE mrb_campaign_id = $1',
      [id]
    );
    if (affectedCount.rows[0].count === 0) {
      affectedStatus = 'NO_LIST_DEFINED';
    } else {
      const inList = await query(
        'SELECT id FROM mrb_affected_serials WHERE mrb_campaign_id = $1 AND serial_number = $2',
        [id, serial.trim()]
      );
      affectedStatus = inList.rows.length > 0 ? 'IN_LIST' : 'OUT_OF_LIST';
    }

    // === TRAZABILIDAD: Buscar o crear unit_registry ===
    let unitId = null;
    const existingUnit = await query(
      'SELECT id, current_status FROM unit_registry WHERE client_id = $1 AND part_id = $2 AND serial_number = $3',
      [mrb.client_id, effectivePartId, serial.trim()]
    );

    if (existingUnit.rows.length > 0) {
      unitId = existingUnit.rows[0].id;
      // Incrementar contador de defectos
      await query(`
        UPDATE unit_registry SET
          total_defects = total_defects + 1,
          open_defects = open_defects + 1,
          current_status = 'DEFECTIVE',
          last_inspection_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [unitId]);
    } else {
      // Crear unit_registry - buscar si viene de production_entries
      const prodEntry = await query(`
        SELECT id FROM production_entries
        WHERE serial_number = $1 AND part_id = $2 AND client_id = $3
        LIMIT 1
      `, [serial.trim(), effectivePartId, mrb.client_id]);

      const productionEntryId = prodEntry.rows.length > 0 ? prodEntry.rows[0].id : null;
      const source = productionEntryId ? 'PRODUCTION' : 'MRB';

      const newUnit = await query(`
        INSERT INTO unit_registry (
          serial_number, lot_number, client_id, part_id, project_id,
          current_status, total_defects, open_defects, created_by, source, production_entry_id
        ) VALUES ($1, $2, $3, $4, $5, 'DEFECTIVE', 1, 1, $6, $7, $8)
        RETURNING id
      `, [serial.trim(), lotNumber || null, mrb.client_id, effectivePartId, mrb.project_id, req.user.id, source, productionEntryId]);
      unitId = newUnit.rows[0].id;

      // Actualizar production_entries con unit_id si existe link
      if (productionEntryId) {
        await query('UPDATE production_entries SET unit_id = $1 WHERE id = $2', [unitId, productionEntryId]);
      }

      // Registrar evento de registro
      await query(`
        INSERT INTO unit_history (unit_id, event_type, description, performed_by)
        VALUES ($1, 'REGISTERED', $2, $3)
      `, [unitId, `Unidad registrada desde MRB NOK: ${serial.trim()} (${source})`, req.user.id]);
    }

    // Default to HOLD if no disposition provided
    let resolvedDispositionId = dispositionId || null;
    if (!resolvedDispositionId) {
      const holdRes = await query(`SELECT id FROM inspection_dispositions WHERE code = 'HOLD' LIMIT 1`);
      resolvedDispositionId = holdRes.rows[0]?.id || null;
    }

    // Create defect entry linked to MRB with unit_id
    const defectResult = await query(`
      INSERT INTO defect_entries_v2 (
        part_id, defect_type_id, severity_id, stage_id, disposition_id,
        station_id, shift_id, inspector_id, captured_by_user_id, department_id,
        lot_number, serial_number, unit_id, downtime_minutes, notes, quantity,
        mrb_campaign_id, status, affected_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'OPEN', $17)
      RETURNING *
    `, [
      effectivePartId,
      defectTypeId,
      severityId || mrb.severity_id,
      stageId,
      resolvedDispositionId,
      stationId,
      shiftId,
      req.user.id,
      departmentId || mrb.department_id,
      lotNumber || null,
      serial.trim(),
      unitId,
      downtimeMinutes,
      notes,
      quantity,
      id,
      affectedStatus
    ]);

    const defectEntry = defectResult.rows[0];

    // === TRAZABILIDAD: Registrar en unit_history ===
    if (unitId) {
      let defectName = 'Defecto';
      if (defectTypeId) {
        const dtResult = await query('SELECT name FROM defect_types WHERE id = $1', [defectTypeId]);
        if (dtResult.rows.length > 0) defectName = dtResult.rows[0].name;
      }

      await query(`
        INSERT INTO unit_history (
          unit_id, event_type, source_table, source_id, description,
          station_id, shift_id, performed_by, metadata
        ) VALUES ($1, 'MRB_NOK', 'defect_entries_v2', $2, $3, $4, $5, $6, $7)
      `, [
        unitId,
        defectEntry.id,
        `NOK en MRB ${mrb.campaign_number}: ${defectName}`,
        stationId || null,
        shiftId || null,
        req.user.id,
        JSON.stringify({ mrbCampaignId: id, campaignNumber: mrb.campaign_number, defectTypeId, quantity })
      ]);
    }

    // Resolve disposition code to know which counter to increment
    let dispositionCode = null;
    if (resolvedDispositionId) {
      const dispRes = await query('SELECT code FROM inspection_dispositions WHERE id = $1', [resolvedDispositionId]);
      dispositionCode = dispRes.rows[0]?.code || null;
    }

    const dispositionColumn = {
      'USE_AS_IS':        'qty_use_as_is',
      'REWORK':           'qty_rework',
      'SCRAP':            'qty_scrap',
      'RETURN_SUPPLIER':  'qty_return',
      'HOLD':             'qty_hold'
    }[dispositionCode] || null;

    const dispIncrement = dispositionColumn
      ? `, ${dispositionColumn} = COALESCE(${dispositionColumn}, 0) + $1`
      : '';

    // Update MRB campaign counters
    const updateResult = await query(`
      UPDATE mrb_campaigns SET
        qty_inspected = COALESCE(qty_inspected, 0) + $1,
        qty_nok = COALESCE(qty_nok, 0) + $1
        ${dispIncrement},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, campaign_number, qty_inspected, qty_ok, qty_nok,
                qty_use_as_is, qty_rework, qty_scrap, qty_return, qty_hold
    `, [quantity, id]);

    // Register downtime entry if applicable
    if (parseInt(downtimeMinutes) > 0) {
      await query(`
        INSERT INTO mrb_downtime_entries
          (mrb_campaign_id, shift_id, inspector_id, lot_number, downtime_minutes, source_type, defect_entry_id, notes)
        VALUES ($1, $2, $3, $4, $5, 'NOK', $6, $7)
      `, [id, shiftId || null, req.user.id, lotNumber, parseInt(downtimeMinutes), defectResult.rows[0].id, notes || null]);
    }

    const downtimeRes = await query(
      `SELECT COALESCE(SUM(downtime_minutes),0) AS total FROM mrb_downtime_entries
       WHERE mrb_campaign_id = $1 AND DATE(created_at) = CURRENT_DATE
       ${shiftId ? 'AND shift_id = $2' : ''}`,
      shiftId ? [id, shiftId] : [id]
    );

    res.json({
      success: true,
      mrb: transformToCamelCase(updateResult.rows[0]),
      defect: transformToCamelCase(defectResult.rows[0]),
      unitId,
      downtimeTodayMin: parseInt(downtimeRes.rows[0].total) || 0,
      message: `Defecto registrado - ${quantity} pieza(s) NOK`
    });
  } catch (error) {
    console.error('Error capturing NOK piece:', error);
    res.status(500).json({ success: false, message: 'Error al registrar defecto' });
  }
});

// ============================================================================
// MRB SOURCES - List 8Ds available for linking
// ============================================================================

// GET /mrb/sources - List 8Ds for selection (with existing MRB campaign status)
router.get('/sources', authenticateToken, async (req, res) => {
  const { search } = req.query;

  try {
    const toWebUrl = (absPath) => {
      if (!absPath) return null;
      if (absPath.startsWith('/uploads/')) return absPath;
      const normalized = absPath.replace(/\\/g, '/');
      const idx = normalized.indexOf('uploads/');
      if (idx !== -1) return '/' + normalized.substring(idx);
      return null;
    };

    let eightdSql = `
      SELECT
        er.id,
        er.report_id as folio,
        '8D' as source_type,
        er.title,
        er.status,
        er.created_at,
        COALESCE((SELECT ep.client_name FROM eightd_parts ep WHERE ep.report_id = er.id LIMIT 1), er.supplier_name) as client_name,
        (SELECT ep.client_id FROM eightd_parts ep WHERE ep.report_id = er.id LIMIT 1) as client_id,
        (SELECT ep.project_number FROM eightd_parts ep WHERE ep.report_id = er.id LIMIT 1) as project_number,
        (SELECT ep.project_name FROM eightd_parts ep WHERE ep.report_id = er.id LIMIT 1) as project_name,
        (SELECT ep.project_id FROM eightd_parts ep WHERE ep.report_id = er.id LIMIT 1) as project_id,
        er.part_number,
        er.part_name,
        NULL as part_id,
        er.severity as severity_name,
        CASE
          WHEN LOWER(er.severity) IN ('critical', 'critico', 'alta') THEN '#dc2626'
          WHEN LOWER(er.severity) IN ('mayor', 'high') THEN '#f59e0b'
          ELSE '#3b82f6'
        END as severity_color,
        NULL as severity_id,
        er.department_id,
        NULL as department_text,
        COALESCE(er.d2_problem_description, er.description) as defect_description,
        er.part_name as part_description,
        er.d3_conformance_guarantee as inspection_criteria,
        er.d3_suspect_material_disposal as disposition_instructions,
        (SELECT ea.upload_path FROM eightd_attachments ea WHERE ea.report_id = er.id AND ea.attachment_type = 'photo_no_good' ORDER BY ea.upload_date DESC LIMIT 1) as photo_nok_path,
        (SELECT ea.upload_path FROM eightd_attachments ea WHERE ea.report_id = er.id AND ea.attachment_type = 'photo_ok' ORDER BY ea.upload_date DESC LIMIT 1) as photo_ok_path,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'partId', ep.part_id,
            'partNumber', ep.part_number,
            'partName', ep.part_name,
            'clientName', ep.client_name
          ))
          FROM eightd_parts ep
          WHERE ep.report_id = er.id AND ep.part_number IS NOT NULL),
          '[]'::json
        ) as parts_list,
        COALESCE((SELECT SUM(ep.qty_warehouse)     FROM eightd_parts ep WHERE ep.report_id = er.id), 0) as qty_warehouse,
        COALESCE((SELECT SUM(ep.qty_in_process)    FROM eightd_parts ep WHERE ep.report_id = er.id), 0) as qty_in_process,
        COALESCE((SELECT SUM(ep.qty_in_transit)    FROM eightd_parts ep WHERE ep.report_id = er.id), 0) as qty_in_transit,
        COALESCE((SELECT SUM(ep.qty_with_customer) FROM eightd_parts ep WHERE ep.report_id = er.id), 0) as qty_with_customer,
        (
          SELECT json_agg(json_build_object(
            'id', mc.id,
            'campaignNumber', mc.campaign_number,
            'status', mc.status,
            'title', mc.title
          ) ORDER BY mc.created_at ASC)
          FROM mrb_campaigns mc
          WHERE mc.source_8d_id = er.id
        ) as mrb_campaigns
      FROM eightd_reports er
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      eightdSql += ` AND (
        er.report_id ILIKE $${params.length} OR
        er.title ILIKE $${params.length} OR
        er.supplier_name ILIKE $${params.length} OR
        er.part_number ILIKE $${params.length}
      )`;
    }

    eightdSql += ` ORDER BY er.created_at DESC LIMIT 100`;

    const result = await query(eightdSql, params);

    const mappedSources = result.rows.map(s => ({
      ...s,
      photo_nok_path: toWebUrl(s.photo_nok_path),
      photo_ok_path: toWebUrl(s.photo_ok_path)
    }));

    res.json({
      success: true,
      sources: transformToCamelCase(mappedSources)
    });
  } catch (error) {
    console.error('Error fetching MRB sources:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB sources' });
  }
});

// ============================================================================
// MRB Campaign CRUD
// ============================================================================

// GET all MRB Campaigns (with filters)
router.get('/', authenticateToken, async (req, res) => {
  const { clientId, partId, status, source8dId, sourceQarId, limit = 50, offset = 0 } = req.query;

  // Department name helper
  const deptNames = {
    1: 'Producción', 2: 'Calidad', 3: 'Ingeniería',
    4: 'Mantenimiento', 5: 'Logística', 6: 'Proveedor'
  };

  try {
    let sql = `
      SELECT qa.*,
             c.name as client_name,
             p.project_number, p.project_name,
             cp.part_number, cp.part_name,
             s.name as severity_name, s.code as severity_code, s.color as severity_color,
             u1.first_name || ' ' || u1.last_name as assigned_to_name,
             u2.first_name || ' ' || u2.last_name as reported_by_name,
             (SELECT COUNT(*) FROM defect_entries_v2 WHERE mrb_campaign_id = qa.id) as defect_count,
             -- Source QAR data
             qar.alert_number as source_qar_folio,
             qar.title as source_qar_title,
             -- Source 8D data
             eightd.report_id as source_8d_folio,
             eightd.title as source_8d_title
      FROM mrb_campaigns qa
      LEFT JOIN clients c ON qa.client_id = c.id
      LEFT JOIN projects p ON qa.project_id = p.id
      LEFT JOIN client_parts cp ON qa.part_id = cp.id
      LEFT JOIN inspection_severities s ON qa.severity_id = s.id
      LEFT JOIN users u1 ON qa.assigned_to = u1.id
      LEFT JOIN users u2 ON qa.reported_by = u2.id
      LEFT JOIN quality_alerts qar ON qa.source_qar_id = qar.id
      LEFT JOIN eightd_reports eightd ON qa.source_8d_id = eightd.id
      WHERE 1=1
    `;
    const params = [];

    if (clientId) {
      params.push(clientId);
      sql += ` AND qa.client_id = $${params.length}`;
    }
    if (partId) {
      params.push(partId);
      sql += ` AND qa.part_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND qa.status = $${params.length}`;
    }
    if (source8dId) {
      params.push(source8dId);
      sql += ` AND qa.source_8d_id = $${params.length}`;
    }
    if (sourceQarId) {
      params.push(sourceQarId);
      sql += ` AND qa.source_qar_id = $${params.length}`;
    }

    sql += ` ORDER BY qa.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Add department name and source folio to each row
    const mrbs = result.rows.map(row => ({
      ...row,
      department_name: deptNames[row.department_id] || 'N/A',
      source_folio: row.source_type === 'QAR' ? row.source_qar_folio :
                    row.source_type === '8D' ? row.source_8d_folio : null
    }));

    res.json({
      success: true,
      mrbs: transformToCamelCase(mrbs),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching MRB Campaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB Campaigns' });
  }
});

// ============================================================================
// MRB DASHBOARD v2 — 6-section executive dashboard with dept breakdown
// IMPORTANT: Must be before /:id routes
// ============================================================================
router.get('/dashboard', authenticateToken, async (req, res) => {
  const { dateFrom, dateTo, departmentId, clientId, severityId } = req.query;

  // Build parameterized filter for mrb_campaigns (alias mc)
  const p = [];
  const mcWhere = () => {
    let w = 'WHERE 1=1';
    if (dateFrom)      { p.push(dateFrom);       w += ` AND mc.created_at >= $${p.length}`; }
    if (dateTo)        { p.push(dateTo + ' 23:59:59'); w += ` AND mc.created_at <= $${p.length}`; }
    if (departmentId)  { p.push(departmentId);   w += ` AND mc.department_id = $${p.length}`; }
    if (clientId)      { p.push(clientId);        w += ` AND mc.client_id = $${p.length}`; }
    if (severityId)    { p.push(severityId);      w += ` AND mc.severity_id = $${p.length}`; }
    return w;
  };

  try {
    const f = mcWhere(); // build once, p[] populated

    // Pre-compute real costs per campaign (scrap = qty*unit_cost, labor = hours*count*rate)
    const realCostsRes = await query(`
      SELECT mc.id,
        COALESCE(d.name,'Sin depto') AS dept,
        TO_CHAR(mc.created_at,'YYYY-MM') AS month,
        mc.campaign_number, mc.title,
        COALESCE(scrap_agg.scrap_cost,0)::numeric AS scrap_cost,
        COALESCE(labor_agg.labor_cost,0)::numeric AS labor_cost
      FROM mrb_campaigns mc
      LEFT JOIN departments d ON mc.department_id = d.id
      LEFT JOIN (
        SELECT de.mrb_campaign_id,
          SUM(de.quantity * COALESCE(cp.unit_cost,0)) AS scrap_cost
        FROM defect_entries_v2 de
        JOIN inspection_dispositions disp ON de.disposition_id = disp.id AND disp.code = 'SCRAP'
        LEFT JOIN client_parts cp ON de.part_id = cp.id
        GROUP BY de.mrb_campaign_id
      ) scrap_agg ON scrap_agg.mrb_campaign_id = mc.id
      LEFT JOIN (
        SELECT sh.mrb_campaign_id,
          SUM(sh.hours_worked * sh.inspector_count * mc2.inspector_unit_cost
            + sh.hours_worked * sh.supervisor_count * mc2.supervisor_unit_cost) AS labor_cost
        FROM mrb_shift_hours sh
        JOIN mrb_campaigns mc2 ON mc2.id = sh.mrb_campaign_id
        GROUP BY sh.mrb_campaign_id
      ) labor_agg ON labor_agg.mrb_campaign_id = mc.id
      ${f}
    `, p);

    // Costs for ALL open campaigns (no date filter)
    const openCostsRes = await query(`
      SELECT mc.id,
        COALESCE(scrap_agg.scrap_cost,0)::numeric AS scrap_cost,
        COALESCE(labor_agg.labor_cost,0)::numeric AS labor_cost
      FROM mrb_campaigns mc
      LEFT JOIN (
        SELECT de.mrb_campaign_id,
          SUM(de.quantity * COALESCE(cp.unit_cost,0)) AS scrap_cost
        FROM defect_entries_v2 de
        JOIN inspection_dispositions disp ON de.disposition_id = disp.id AND disp.code = 'SCRAP'
        LEFT JOIN client_parts cp ON de.part_id = cp.id
        GROUP BY de.mrb_campaign_id
      ) scrap_agg ON scrap_agg.mrb_campaign_id = mc.id
      LEFT JOIN (
        SELECT sh.mrb_campaign_id,
          SUM(sh.hours_worked * sh.inspector_count * mc2.inspector_unit_cost
            + sh.hours_worked * sh.supervisor_count * mc2.supervisor_unit_cost) AS labor_cost
        FROM mrb_shift_hours sh
        JOIN mrb_campaigns mc2 ON mc2.id = sh.mrb_campaign_id
        GROUP BY sh.mrb_campaign_id
      ) labor_agg ON labor_agg.mrb_campaign_id = mc.id
      WHERE mc.status IN ('ABIERTA','EN_PROCESO')
    `, []);

    const openCosts = {};
    openCostsRes.rows.forEach(r => {
      openCosts[r.id] = { scrap: parseFloat(r.scrap_cost)||0, labor: parseFloat(r.labor_cost)||0 };
    });

    // Build per-campaign cost lookup for JS aggregation
    const realCosts = realCostsRes.rows.map(r => ({
      id: r.id, dept: r.dept, month: r.month,
      campaignNumber: r.campaign_number, title: r.title,
      scrap: parseFloat(r.scrap_cost) || 0,
      labor: parseFloat(r.labor_cost) || 0,
      total: (parseFloat(r.scrap_cost) || 0) + (parseFloat(r.labor_cost) || 0)
    }));

    const [
      summaryRes, byMonthDeptRes, deptSummaryRes,
      dispositionRes, disposByDeptRes, disposByMonthRes,
      timingRes, agingRes,
      topDefectsRes, defectsByDeptRes, defectsBySeverityRes, defectsByStageRes,
      downtimeByShiftRes, downtimeByDeptRes, opsRes, downtimeCommentsRes
    ] = await Promise.all([

      // 1a. Summary KPIs
      query(`SELECT
        COALESCE(SUM(mc.qty_inspected),0)::int AS total_insp,
        COALESCE(SUM(mc.qty_ok),0)::int AS total_ok,
        COALESCE(SUM(mc.qty_nok),0)::int AS total_nok,
        COALESCE(SUM(mc.scrap_cost),0)::numeric AS scrap_cost,
        COALESCE(SUM(mc.labor_cost),0)::numeric AS labor_cost,
        COUNT(*) FILTER (WHERE mc.status IN ('ABIERTA','EN_PROCESO'))::int AS backlog,
        COUNT(*) FILTER (WHERE mc.status = 'CERRADA')::int AS closed,
        COUNT(*)::int AS total
        FROM mrb_campaigns mc ${f}`, p),

      // 1b. Campaigns by month + dept (for stacked bar)
      query(`SELECT TO_CHAR(mc.created_at,'YYYY-MM') AS month,
        COALESCE(d.name,'Sin depto') AS dept, COUNT(*)::int AS count
        FROM mrb_campaigns mc LEFT JOIN departments d ON mc.department_id = d.id
        ${f} GROUP BY month, d.name ORDER BY month, d.name`, p),

      // 1c. Dept summary (backlog + closed)
      query(`SELECT COALESCE(d.name,'Sin depto') AS dept,
        COUNT(*) FILTER (WHERE mc.status IN ('ABIERTA','EN_PROCESO'))::int AS backlog,
        COUNT(*) FILTER (WHERE mc.status = 'CERRADA')::int AS closed,
        COUNT(*)::int AS total
        FROM mrb_campaigns mc LEFT JOIN departments d ON mc.department_id = d.id
        ${f} GROUP BY d.name ORDER BY total DESC`, p),

      // 2a. Disposition totals
      query(`SELECT
        COALESCE(SUM(mc.qty_scrap),0)::int AS scrap,
        COALESCE(SUM(mc.qty_rework),0)::int AS rework,
        COALESCE(SUM(mc.qty_use_as_is),0)::int AS use_as_is,
        COALESCE(SUM(mc.qty_return),0)::int AS return_sup,
        COALESCE(SUM(mc.qty_hold),0)::int AS hold
        FROM mrb_campaigns mc ${f}`, p),

      // 2b. Disposition by dept
      query(`SELECT COALESCE(d.name,'Sin depto') AS dept,
        COALESCE(SUM(mc.qty_scrap),0)::int AS scrap,
        COALESCE(SUM(mc.qty_rework),0)::int AS rework,
        COALESCE(SUM(mc.qty_use_as_is),0)::int AS use_as_is,
        COALESCE(SUM(mc.qty_return),0)::int AS return_sup,
        COALESCE(SUM(mc.qty_hold),0)::int AS hold
        FROM mrb_campaigns mc LEFT JOIN departments d ON mc.department_id = d.id
        ${f} GROUP BY d.name ORDER BY scrap DESC`, p),

      // 2c. Scrap trend by month
      query(`SELECT TO_CHAR(mc.created_at,'YYYY-MM') AS month,
        COALESCE(SUM(mc.qty_scrap),0)::int AS scrap,
        COALESCE(SUM(mc.qty_rework),0)::int AS rework
        FROM mrb_campaigns mc ${f} GROUP BY month ORDER BY month`, p),

      // 3. Timing
      query(`SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (mc.response_date - mc.created_at))/86400)::numeric,1) AS avg_response_days,
        ROUND(AVG(EXTRACT(EPOCH FROM (mc.closed_at - mc.created_at))/86400)::numeric,1) AS avg_close_days,
        ROUND(AVG(CASE WHEN mc.status='CERRADA' THEN EXTRACT(EPOCH FROM (mc.closed_at - mc.created_at))/86400 END)::numeric,1) AS avg_lead_days,
        COUNT(*) FILTER (WHERE mc.status IN ('ABIERTA','EN_PROCESO') AND mc.created_at < NOW() - INTERVAL '7 days')::int AS aging_7,
        COUNT(*) FILTER (WHERE mc.status IN ('ABIERTA','EN_PROCESO') AND mc.created_at < NOW() - INTERVAL '14 days')::int AS aging_14,
        COUNT(*) FILTER (WHERE mc.status IN ('ABIERTA','EN_PROCESO') AND mc.created_at < NOW() - INTERVAL '30 days')::int AS aging_30
        FROM mrb_campaigns mc ${f}`, p),

      // 3b. Aging detail (open campaigns)
      query(`SELECT mc.id, mc.campaign_number, mc.title,
        COALESCE(d.name,'Sin depto') AS dept,
        mc.status,
        ROUND(EXTRACT(EPOCH FROM (NOW() - mc.created_at))/86400)::int AS age_days
        FROM mrb_campaigns mc LEFT JOIN departments d ON mc.department_id = d.id
        WHERE mc.status IN ('ABIERTA','EN_PROCESO')
        ORDER BY age_days DESC LIMIT 20`, []),

      // 5a. Top defects
      query(`SELECT dt.name AS defect, dt.code,
        SUM(de.quantity)::int AS qty
        FROM defect_entries_v2 de
        JOIN mrb_campaigns mc ON de.mrb_campaign_id = mc.id
        LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
        ${f.replace('WHERE','WHERE de.mrb_campaign_id IS NOT NULL AND')}
        GROUP BY dt.name, dt.code ORDER BY qty DESC LIMIT 10`, p),

      // 5b. Defects by dept
      query(`SELECT COALESCE(d.name,'Sin depto') AS dept,
        SUM(de.quantity)::int AS qty
        FROM defect_entries_v2 de
        JOIN mrb_campaigns mc ON de.mrb_campaign_id = mc.id
        LEFT JOIN departments d ON mc.department_id = d.id
        ${f.replace('WHERE','WHERE de.mrb_campaign_id IS NOT NULL AND')}
        GROUP BY d.name ORDER BY qty DESC`, p),

      // 5c. By severity (from defect entries)
      query(`SELECT COALESCE(s.name,'Sin severidad') AS severity, s.color,
        COALESCE(SUM(de.quantity),0)::int AS qty_nok
        FROM defect_entries_v2 de
        JOIN mrb_campaigns mc ON de.mrb_campaign_id = mc.id
        LEFT JOIN inspection_severities s ON de.severity_id = s.id
        ${f.replace('WHERE','WHERE de.mrb_campaign_id IS NOT NULL AND')}
        GROUP BY s.name, s.color ORDER BY qty_nok DESC`, p),

      // 5d. By stage
      query(`SELECT COALESCE(st.name,'Sin etapa') AS stage,
        SUM(de.quantity)::int AS qty
        FROM defect_entries_v2 de
        JOIN mrb_campaigns mc ON de.mrb_campaign_id = mc.id
        LEFT JOIN inspection_stages st ON de.stage_id = st.id
        ${f.replace('WHERE','WHERE de.mrb_campaign_id IS NOT NULL AND')}
        GROUP BY st.name ORDER BY qty DESC`, p),

      // 6a. Downtime by shift
      query(`SELECT COALESCE(ins.name,'Sin turno') AS shift,
        COALESCE(SUM(dt.downtime_minutes),0)::int AS minutes, COUNT(*)::int AS entries
        FROM mrb_downtime_entries dt
        JOIN mrb_campaigns mc ON dt.mrb_campaign_id = mc.id
        LEFT JOIN inspection_shifts ins ON dt.shift_id = ins.id
        ${f.replace('WHERE','WHERE')} GROUP BY ins.name ORDER BY minutes DESC`, p),

      // 6b. Downtime by dept
      query(`SELECT COALESCE(d.name,'Sin depto') AS dept,
        COALESCE(SUM(dt.downtime_minutes),0)::int AS minutes
        FROM mrb_downtime_entries dt
        JOIN mrb_campaigns mc ON dt.mrb_campaign_id = mc.id
        LEFT JOIN departments d ON mc.department_id = d.id
        ${f.replace('WHERE','WHERE')} GROUP BY d.name ORDER BY minutes DESC`, p),

      // 6c. Ops — piezas/hora
      query(`SELECT
        COALESCE(SUM(sh.hours_worked * sh.inspector_count),0)::numeric AS total_inspector_hours,
        COALESCE(SUM(mc.qty_inspected),0)::int AS total_insp,
        COALESCE(SUM(mc.qty_nok),0)::int AS total_nok
        FROM mrb_campaigns mc
        LEFT JOIN mrb_shift_hours sh ON sh.mrb_campaign_id = mc.id
        ${f}`, p),

      // 6d. Downtime comments
      query(`SELECT dt.id, dt.lot_number, dt.downtime_minutes, dt.source_type, dt.notes,
        dt.created_at,
        COALESCE(ins.name,'Sin turno') AS shift,
        mc.campaign_number
        FROM mrb_downtime_entries dt
        JOIN mrb_campaigns mc ON dt.mrb_campaign_id = mc.id
        LEFT JOIN inspection_shifts ins ON dt.shift_id = ins.id
        WHERE dt.notes IS NOT NULL AND dt.notes <> ''
        ${f.replace('WHERE', 'AND')}
        ORDER BY dt.created_at DESC LIMIT 100`, p)
    ]);

    const s = summaryRes.rows[0] || {};
    const totalInsp = parseInt(s.total_insp) || 0;
    const totalNok  = parseInt(s.total_nok)  || 0;
    const ops       = opsRes.rows[0] || {};
    const inspHours = parseFloat(ops.total_inspector_hours) || 0;

    // JS aggregation from realCosts (real accumulated costs)
    const totalScrap = realCosts.reduce((a, r) => a + r.scrap, 0);
    const totalLabor = realCosts.reduce((a, r) => a + r.labor, 0);

    // costByMonth: group by month, sum scrap + labor
    const costByMonthMap = {};
    for (const r of realCosts) {
      if (!costByMonthMap[r.month]) costByMonthMap[r.month] = { month: r.month, scrap: 0, labor: 0 };
      costByMonthMap[r.month].scrap += r.scrap;
      costByMonthMap[r.month].labor += r.labor;
    }
    const costByMonth = Object.values(costByMonthMap).sort((a, b) => a.month.localeCompare(b.month));

    // costByCampaign: top 10 by total cost
    const costByCampaign = [...realCosts]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(r => ({ id: r.id, campaign_number: r.campaignNumber, title: r.title, dept: r.dept, scrap_cost: r.scrap, labor_cost: r.labor, total_cost: r.total }));

    // costByDept: group by dept
    const costByDeptMap = {};
    for (const r of realCosts) {
      if (!costByDeptMap[r.dept]) costByDeptMap[r.dept] = { dept: r.dept, scrap_cost: 0, labor_cost: 0, total_cost: 0 };
      costByDeptMap[r.dept].scrap_cost += r.scrap;
      costByDeptMap[r.dept].labor_cost += r.labor;
      costByDeptMap[r.dept].total_cost += r.total;
    }
    const costByDept = Object.values(costByDeptMap).sort((a, b) => b.total_cost - a.total_cost);

    res.json({
      success: true,
      filters: { dateFrom, dateTo, departmentId, clientId, severityId },
      openCosts,

      summary: {
        totalInsp, totalOk: parseInt(s.total_ok) || 0, totalNok,
        yieldPct:   totalInsp > 0 ? ((parseInt(s.total_ok)/totalInsp)*100).toFixed(1) : null,
        ppm:        totalInsp > 0 ? Math.round((totalNok/totalInsp)*1_000_000) : null,
        scrapCost:  totalScrap,
        laborCost:  totalLabor,
        totalCost:  totalScrap + totalLabor,
        backlog:    parseInt(s.backlog) || 0,
        closed:     parseInt(s.closed) || 0,
        total:      parseInt(s.total)  || 0,
        byMonthDept: byMonthDeptRes.rows,
        costByMonth,
        byDept: deptSummaryRes.rows.map(r => ({
          ...r,
          total_cost: costByDeptMap[r.dept]?.total_cost || 0
        }))
      },

      disposition: {
        ...(dispositionRes.rows[0] || {}),
        byDept:    disposByDeptRes.rows,
        byMonth:   disposByMonthRes.rows
      },

      timing: {
        ...(timingRes.rows[0] || {}),
        aging: agingRes.rows
      },

      cost: {
        scrapCost:  totalScrap,
        laborCost:  totalLabor,
        totalCost:  totalScrap + totalLabor,
        byCampaign: costByCampaign,
        byDept:     costByDept
      },

      defects: {
        top:        topDefectsRes.rows,
        byDept:     defectsByDeptRes.rows,
        bySeverity: defectsBySeverityRes.rows,
        byStage:    defectsByStageRes.rows
      },

      ops: {
        totalDowntime:  downtimeByShiftRes.rows.reduce((s, r) => s + (parseInt(r.minutes) || 0), 0),
        inspectorHours: inspHours,
        piecesPerHour:  inspHours > 0 ? ((parseInt(ops.total_insp)||0)/inspHours).toFixed(1) : null,
        defectsPerHour: inspHours > 0 ? ((parseInt(ops.total_nok)||0)/inspHours).toFixed(1) : null,
        byShift:   downtimeByShiftRes.rows,
        byDept:    downtimeByDeptRes.rows,
        comments:  downtimeCommentsRes.rows
      }
    });
  } catch (error) {
    console.error('Error MRB dashboard:', error);
    res.status(500).json({ success: false, message: 'Error al generar dashboard' });
  }
});

// ============================================================================
// GET /unregistered-shifts — Campañas activas con turnos sin registrar en mrb_shift_hours
// IMPORTANT: Must be before /:id routes
// Includes both defect_entries_v2 (NOK) and mrb_ok_entries (OK) activity
// ============================================================================
router.get('/unregistered-shifts', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      WITH all_activity AS (
        -- Defects (NOK entries)
        SELECT mrb_campaign_id, shift_id, captured_at::date AS inspection_date
        FROM defect_entries_v2
        WHERE mrb_campaign_id IS NOT NULL
        UNION
        -- OK entries
        SELECT mrb_campaign_id, shift_id, inspection_date
        FROM mrb_ok_entries
      )
      SELECT DISTINCT
        mc.id                    AS campaign_id,
        mc.campaign_number,
        mc.title,
        mc.inspector_count,
        mc.supervisor_count,
        mc.inspector_unit_cost,
        mc.supervisor_unit_cost,
        act.shift_id,
        ins.name                 AS shift_name,
        ins.code                 AS shift_code,
        act.inspection_date
      FROM all_activity act
      JOIN mrb_campaigns mc ON mc.id = act.mrb_campaign_id
      LEFT JOIN inspection_shifts ins ON ins.id = act.shift_id
      LEFT JOIN mrb_shift_hours sh
        ON sh.mrb_campaign_id = act.mrb_campaign_id
        AND (sh.shift_id = act.shift_id OR (sh.shift_id IS NULL AND act.shift_id IS NULL))
        AND sh.inspection_date = act.inspection_date
      WHERE mc.status IN ('ABIERTA', 'EN_PROCESO')
        AND act.inspection_date < CURRENT_DATE
        AND sh.id IS NULL
      ORDER BY act.inspection_date DESC, mc.campaign_number
    `);
    res.json({ success: true, unregistered: result.rows.map(r => transformToCamelCase(r)) });
  } catch (e) {
    console.error('Error unregistered-shifts:', e);
    res.status(500).json({ success: false, message: 'Error al detectar turnos sin registrar' });
  }
});

// ============================================================================
// MRB Campaign DASHBOARD STATS - Executive Dashboard
// IMPORTANT: This route MUST be before /:id to avoid route conflict
// ============================================================================

router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const { clientId, departmentId, startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      dateFilter += ` AND qa.created_at >= $${paramCount}`;
      params.push(startDate);
    }
    if (endDate) {
      paramCount++;
      dateFilter += ` AND qa.created_at <= $${paramCount}`;
      params.push(endDate + ' 23:59:59');
    }
    if (clientId) {
      paramCount++;
      dateFilter += ` AND qa.client_id = $${paramCount}`;
      params.push(clientId);
    }
    if (departmentId) {
      paramCount++;
      dateFilter += ` AND qa.department_id = $${paramCount}`;
      params.push(departmentId);
    }

    // ========== KPIs PRINCIPALES ==========

    // MRB Campaign counts by status
    const mrbCounts = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('ABIERTA', 'EN_PROCESO')) as active,
        COUNT(*) FILTER (WHERE status = 'ABIERTA') as abierta,
        COUNT(*) FILTER (WHERE status = 'EN_PROCESO') as en_proceso,
        COUNT(*) FILTER (WHERE status = 'CANCELADA') as cancelada,
        COUNT(*) FILTER (WHERE status = 'CERRADA') as cerrada,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABIERTA' AND created_at < NOW() - INTERVAL '1 day') as vencidos
      FROM mrb_campaigns qa
      WHERE 1=1 ${dateFilter}
    `, params);

    // Average response time (in hours)
    const avgResponseTime = await query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (response_date - created_at)) / 3600) as avg_hours
      FROM mrb_campaigns qa
      WHERE response_date IS NOT NULL ${dateFilter}
    `, params);

    // Defects with critical severity that don't have MRB Campaign
    const criticalWithoutQar = await query(`
      SELECT COUNT(*) as count
      FROM defect_entries_v2 de
      JOIN inspection_severities s ON de.severity_id = s.id
      WHERE de.mrb_campaign_id IS NULL
        AND LOWER(s.code) IN ('critical', 'critico', 'alta')
        AND de.status NOT IN ('CLOSED', 'CERRADO')
    `);

    // Total downtime from defects linked to MRB Campaigns
    const downtimeQar = await query(`
      SELECT COALESCE(SUM(de.downtime_minutes), 0) as total_downtime
      FROM defect_entries_v2 de
      WHERE de.mrb_campaign_id IS NOT NULL
    `);

    // ========== IE-MRB Campaign (Índice de Efectividad) POR DEPARTAMENTO ==========
    // Compara defectos 30 días antes vs 30 días después del MRB Campaign

    const ieQarByDept = await query(`
      WITH mrb_periods AS (
        SELECT
          qa.id as mrb_campaign_id,
          qa.department_id,
          d.name as department_name,
          qa.part_id,
          qa.created_at as mrb_date,
          qa.created_at - INTERVAL '30 days' as pre_start,
          qa.created_at as pre_end,
          qa.created_at as post_start,
          qa.created_at + INTERVAL '30 days' as post_end
        FROM mrb_campaigns qa
        LEFT JOIN departments d ON qa.department_id = d.id
        WHERE qa.status = 'CERRADA'
      ),
      pre_defects AS (
        SELECT
          qp.mrb_campaign_id,
          qp.department_id,
          COUNT(de.id) as pre_count
        FROM mrb_periods qp
        LEFT JOIN defect_entries_v2 de ON de.part_id = qp.part_id
          AND de.created_at >= qp.pre_start
          AND de.created_at < qp.pre_end
        GROUP BY qp.mrb_campaign_id, qp.department_id
      ),
      post_defects AS (
        SELECT
          qp.mrb_campaign_id,
          qp.department_id,
          COUNT(de.id) as post_count
        FROM mrb_periods qp
        LEFT JOIN defect_entries_v2 de ON de.part_id = qp.part_id
          AND de.created_at > qp.post_start
          AND de.created_at <= qp.post_end
        GROUP BY qp.mrb_campaign_id, qp.department_id
      )
      SELECT
        COALESCE(d.name, 'Dept ' || qp.department_id) as department,
        qp.department_id,
        COUNT(DISTINCT qp.mrb_campaign_id) as mrb_count,
        COALESCE(SUM(pre.pre_count), 0) as total_pre,
        COALESCE(SUM(post.post_count), 0) as total_post,
        CASE
          WHEN COALESCE(SUM(pre.pre_count), 0) = 0 THEN 0
          ELSE ROUND(((COALESCE(SUM(post.post_count), 0) - COALESCE(SUM(pre.pre_count), 0))::numeric /
                NULLIF(SUM(pre.pre_count), 0) * 100), 1)
        END as ie_mrb
      FROM mrb_periods qp
      LEFT JOIN pre_defects pre ON qp.mrb_campaign_id = pre.mrb_campaign_id
      LEFT JOIN post_defects post ON qp.mrb_campaign_id = post.mrb_campaign_id
      LEFT JOIN departments d ON qp.department_id = d.id
      GROUP BY qp.department_id, d.name
      ORDER BY ie_mrb ASC
    `);

    // ========== DEFECTOS SIN MRB Campaign QUE ROMPIERON UMBRAL ==========
    // Defectos que debieron disparar MRB Campaign pero no se emitió

    const missedQarAlerts = await query(`
      WITH threshold_breaches AS (
        SELECT
          de.part_id,
          de.severity_id,
          de.department_id,
          s.qar_threshold_count,
          s.qar_threshold_hours,
          cp.part_number,
          s.name as severity_name,
          s.code as severity_code,
          COALESCE(dept.name, 'Dept ' || de.department_id) as department_name,
          COUNT(de.id) as defect_count,
          MAX(de.created_at) as last_defect_date
        FROM defect_entries_v2 de
        JOIN inspection_severities s ON de.severity_id = s.id
        LEFT JOIN client_parts cp ON de.part_id = cp.id
        LEFT JOIN departments dept ON de.department_id = dept.id
        WHERE de.mrb_campaign_id IS NULL
          AND s.qar_threshold_count > 0
          AND de.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY de.part_id, de.severity_id, de.department_id,
                 s.qar_threshold_count, s.qar_threshold_hours,
                 cp.part_number, s.name, s.code, dept.name
        HAVING COUNT(de.id) >= s.qar_threshold_count
      )
      SELECT
        part_number,
        severity_name,
        severity_code,
        department_name,
        defect_count,
        qar_threshold_count as threshold,
        last_defect_date
      FROM threshold_breaches
      ORDER BY defect_count DESC, last_defect_date DESC
      LIMIT 10
    `);

    // ========== DEFECTOS PRE vs POST MRB Campaign POR DEPARTAMENTO ==========

    const preVsPostByDept = await query(`
      WITH dept_stats AS (
        SELECT
          COALESCE(d.name, 'Dept ' || qa.department_id) as department,
          qa.department_id,
          COUNT(DISTINCT CASE WHEN de.created_at < qa.created_at THEN de.id END) as pre_mrb,
          COUNT(DISTINCT CASE WHEN de.created_at >= qa.created_at THEN de.id END) as post_mrb
        FROM mrb_campaigns qa
        LEFT JOIN defect_entries_v2 de ON de.part_id = qa.part_id
          AND de.created_at >= qa.created_at - INTERVAL '30 days'
          AND de.created_at <= qa.created_at + INTERVAL '30 days'
        LEFT JOIN departments d ON qa.department_id = d.id
        WHERE qa.status = 'CERRADA'
        GROUP BY qa.department_id, d.name
      )
      SELECT * FROM dept_stats WHERE department IS NOT NULL
      ORDER BY (pre_mrb - post_mrb) DESC
      LIMIT 10
    `);

    // ========== DEFECTOS RECURRENTES POST-MRB Campaign (Top 5) ==========

    const recurrentDefects = await query(`
      SELECT
        COALESCE(d.name, 'Sin Dept') as department,
        cp.part_number,
        dt.name as defect_type,
        qa.campaign_number as mrb_number,
        COUNT(de.id) as reincidence_count
      FROM mrb_campaigns qa
      JOIN defect_entries_v2 orig ON orig.mrb_campaign_id = qa.id
      JOIN defect_entries_v2 de ON de.part_id = qa.part_id
        AND de.defect_type_id = orig.defect_type_id
        AND de.created_at > qa.created_at
        AND de.id != orig.id
      LEFT JOIN departments d ON qa.department_id = d.id
      LEFT JOIN client_parts cp ON qa.part_id = cp.id
      LEFT JOIN defect_types dt ON orig.defect_type_id = dt.id
      WHERE qa.status = 'CERRADA'
      GROUP BY d.name, cp.part_number, dt.name, qa.campaign_number
      HAVING COUNT(de.id) > 0
      ORDER BY reincidence_count DESC
      LIMIT 5
    `);

    // ========== RESPONSABLES EN RIESGO ==========

    const responsablesRiesgo = await query(`
      SELECT
        u.first_name || ' ' || u.last_name as responsable,
        COUNT(*) FILTER (WHERE qa.status = 'ABIERTA' AND qa.created_at < NOW() - INTERVAL '1 day') as mrb_vencidos,
        COUNT(*) as total_asignados
      FROM mrb_campaigns qa
      JOIN users u ON qa.assigned_to = u.id
      WHERE qa.status IN ('ABIERTA', 'EN_PROCESO')
      GROUP BY u.id, u.first_name, u.last_name
      HAVING COUNT(*) FILTER (WHERE qa.status = 'ABIERTA' AND qa.created_at < NOW() - INTERVAL '1 day') > 0
      ORDER BY mrb_vencidos DESC
      LIMIT 5
    `);

    // ========== DEFECTOS CRÍTICOS SIN MRB Campaign POR DEPARTAMENTO ==========

    const criticalNoQarByDept = await query(`
      SELECT
        COALESCE(d.name, 'Sin Dept') as department,
        COUNT(de.id) as count
      FROM defect_entries_v2 de
      JOIN inspection_severities s ON de.severity_id = s.id
      LEFT JOIN departments d ON de.department_id = d.id
      WHERE de.mrb_campaign_id IS NULL
        AND LOWER(s.code) IN ('critical', 'critico', 'alta', 'high')
        AND de.status NOT IN ('CLOSED', 'CERRADO')
      GROUP BY d.name
      ORDER BY count DESC
      LIMIT 10
    `);

    // ========== TENDENCIA DE DEFECTOS CON MARCAS DE MRB Campaign ==========

    const defectTrend = await query(`
      SELECT
        DATE(de.created_at) as date,
        COUNT(de.id) as defect_count,
        COUNT(de.mrb_campaign_id) as with_mrb
      FROM defect_entries_v2 de
      WHERE de.created_at >= NOW() - INTERVAL '60 days'
      GROUP BY DATE(de.created_at)
      ORDER BY date
    `);

    const mrbEmissions = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as mrb_count
      FROM mrb_campaigns
      WHERE created_at >= NOW() - INTERVAL '60 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // ========== MADUREZ DEL SISTEMA MRB Campaign ==========

    const maturityStats = await query(`
      SELECT
        0 as pct_automatic,
        AVG(EXTRACT(EPOCH FROM (response_date - created_at)) / 3600) as avg_response_hours,
        COUNT(*) FILTER (WHERE status = 'CERRADA') * 100.0 / NULLIF(COUNT(*), 0) as pct_closed
      FROM mrb_campaigns
      WHERE created_at >= NOW() - INTERVAL '90 days'
    `);

    // ========== PARETO MRB Campaign POR ESTACIÓN ==========

    const mrbByStation = await query(`
      SELECT
        COALESCE(s.name, de.capture_station, 'Sin Estación') as station,
        COUNT(DISTINCT qa.id) as mrb_count
      FROM mrb_campaigns qa
      JOIN defect_entries_v2 de ON de.mrb_campaign_id = qa.id
      LEFT JOIN inspection_stations s ON de.station_id = s.id
      GROUP BY COALESCE(s.name, de.capture_station, 'Sin Estación')
      ORDER BY mrb_count DESC
      LIMIT 10
    `);

    // ========== PARETO MRB Campaign POR DEPARTAMENTO ==========

    const mrbByDepartment = await query(`
      SELECT
        COALESCE(d.name, 'Sin Dept') as department,
        COUNT(*) as mrb_count,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADA') as cerrados,
        COUNT(*) FILTER (WHERE qa.status IN ('ABIERTA', 'EN_PROCESO')) as activos
      FROM mrb_campaigns qa
      LEFT JOIN departments d ON qa.department_id = d.id
      GROUP BY d.name
      ORDER BY mrb_count DESC
      LIMIT 10
    `);

    // ========== % MRB Campaign EFECTIVOS (IE-MRB Campaign < 0) ==========

    const efectividadTotal = await query(`
      WITH mrb_effectiveness AS (
        SELECT
          qa.id,
          COUNT(DISTINCT pre.id) as pre_count,
          COUNT(DISTINCT post.id) as post_count
        FROM mrb_campaigns qa
        LEFT JOIN defect_entries_v2 pre ON pre.part_id = qa.part_id
          AND pre.created_at >= qa.created_at - INTERVAL '30 days'
          AND pre.created_at < qa.created_at
        LEFT JOIN defect_entries_v2 post ON post.part_id = qa.part_id
          AND post.created_at > qa.created_at
          AND post.created_at <= qa.created_at + INTERVAL '30 days'
        WHERE qa.status = 'CERRADA'
        GROUP BY qa.id
      )
      SELECT
        COUNT(*) as total_cerrados,
        COUNT(*) FILTER (WHERE post_count < pre_count) as efectivos,
        ROUND(COUNT(*) FILTER (WHERE post_count < pre_count) * 100.0 / NULLIF(COUNT(*), 0), 1) as pct_efectivos
      FROM mrb_effectiveness
    `);

    // Construct response
    const kpis = mrbCounts.rows[0];
    const response = {
      success: true,
      kpis: {
        qarActivos: parseInt(kpis.active) || 0,
        mrbAbiertos: parseInt(kpis.abierta) || 0,
        mrbEnProceso: parseInt(kpis.en_proceso) || 0,
        mrbCancelados: parseInt(kpis.cancelada) || 0,
        mrbCerrados: parseInt(kpis.cerrada) || 0,
        mrbTotal: parseInt(kpis.total) || 0,
        qarVencidos: parseInt(kpis.vencidos) || 0,
        avgResponseHours: parseFloat(avgResponseTime.rows[0]?.avg_hours) || 0,
        criticalWithoutQar: parseInt(criticalWithoutQar.rows[0]?.count) || 0,
        downtimeMinutes: parseInt(downtimeQar.rows[0]?.total_downtime) || 0,
        pctEfectivos: parseFloat(efectividadTotal.rows[0]?.pct_efectivos) || 0
      },
      ieQarByDepartment: ieQarByDept.rows.map(r => ({
        department: r.department,
        departmentId: r.department_id,
        mrbCount: parseInt(r.mrb_count),
        preDefects: parseInt(r.total_pre),
        postDefects: parseInt(r.total_post),
        ieQar: parseFloat(r.ie_mrb)
      })),
      missedQarAlerts: missedQarAlerts.rows.map(r => ({
        partNumber: r.part_number,
        severityName: r.severity_name,
        severityCode: r.severity_code,
        department: r.department_name,
        defectCount: parseInt(r.defect_count),
        threshold: parseInt(r.threshold),
        lastDefectDate: r.last_defect_date
      })),
      preVsPostByDept: preVsPostByDept.rows.map(r => ({
        department: r.department,
        preQar: parseInt(r.pre_mrb),
        postQar: parseInt(r.post_mrb)
      })),
      recurrentDefects: recurrentDefects.rows.map(r => ({
        department: r.department,
        partNumber: r.part_number,
        defectType: r.defect_type,
        mrbNumber: r.mrb_number,
        reincidenceCount: parseInt(r.reincidence_count)
      })),
      responsablesRiesgo: responsablesRiesgo.rows.map(r => ({
        responsable: r.responsable,
        mrbVencidos: parseInt(r.mrb_vencidos),
        totalAsignados: parseInt(r.total_asignados)
      })),
      criticalNoQarByDept: criticalNoQarByDept.rows.map(r => ({
        department: r.department,
        count: parseInt(r.count)
      })),
      defectTrend: defectTrend.rows.map(r => ({
        date: r.date,
        defectCount: parseInt(r.defect_count),
        withQar: parseInt(r.with_mrb)
      })),
      mrbEmissions: mrbEmissions.rows.map(r => ({
        date: r.date,
        mrbCount: parseInt(r.mrb_count)
      })),
      maturity: {
        pctAutomatic: parseFloat(maturityStats.rows[0]?.pct_automatic) || 0,
        avgResponseHours: parseFloat(maturityStats.rows[0]?.avg_response_hours) || 0,
        pctClosed: parseFloat(maturityStats.rows[0]?.pct_closed) || 0
      },
      mrbByStation: mrbByStation.rows.map(r => ({
        station: r.station,
        mrbCount: parseInt(r.mrb_count)
      })),
      mrbByDepartment: mrbByDepartment.rows.map(r => ({
        department: r.department,
        mrbCount: parseInt(r.mrb_count),
        cerrados: parseInt(r.cerrados),
        activos: parseInt(r.activos)
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching MRB Campaign dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats', error: error.message });
  }
});

// ============================================================================
// GET /:id/check-serial — Check if a serial/lot already has entries today
// ============================================================================
router.get('/:id/check-serial', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lotNumber, date } = req.query;
  if (!lotNumber) return res.json({ success: true, exists: false });
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const result = await query(`
      SELECT 1 FROM defect_entries_v2
      WHERE mrb_campaign_id = $1
        AND lot_number = $2
        AND DATE(created_at) = $3
      LIMIT 1
    `, [id, lotNumber, targetDate]);
    res.json({ success: true, exists: result.rows.length > 0 });
  } catch (error) {
    res.json({ success: true, exists: false });
  }
});

// ============================================================================
// GET /:id/shift-defects — Accumulated by defect×disposition for current shift/day
// ============================================================================
router.get('/:id/shift-defects', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { shiftId, partId, date, inspectorId } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const params = [id, targetDate];
    let extraWhere = '';
    if (shiftId)     { params.push(shiftId);     extraWhere += ` AND dev.shift_id              = $${params.length}`; }
    if (partId)      { params.push(partId);       extraWhere += ` AND dev.part_id               = $${params.length}`; }
    if (inspectorId) { params.push(inspectorId);  extraWhere += ` AND dev.captured_by_user_id   = $${params.length}`; }

    const result = await query(`
      SELECT
        dev.defect_type_id,
        disp.code         AS disposition_code,
        SUM(dev.quantity) AS total
      FROM defect_entries_v2 dev
      LEFT JOIN inspection_dispositions disp ON dev.disposition_id = disp.id
      WHERE dev.mrb_campaign_id = $1
        AND DATE(dev.created_at) = $2
        ${extraWhere}
      GROUP BY dev.defect_type_id, disp.code
    `, params);

    // Build map: { defectTypeId: { REWORK: N, SCRAP: N, ... } }
    const accumulated = {};
    result.rows.forEach(r => {
      if (!accumulated[r.defect_type_id]) accumulated[r.defect_type_id] = {};
      accumulated[r.defect_type_id][r.disposition_code] = parseInt(r.total) || 0;
    });

    // OK count from mrb_ok_entries
    const okParams = [id, targetDate];
    let okWhere = '';
    if (shiftId)     { okParams.push(shiftId);     okWhere += ` AND shift_id     = $${okParams.length}`; }
    if (partId)      { okParams.push(partId);       okWhere += ` AND part_id      = $${okParams.length}`; }
    if (inspectorId) { okParams.push(inspectorId);  okWhere += ` AND inspector_id = $${okParams.length}`; }

    const okResult = await query(`
      SELECT COALESCE(SUM(quantity), 0) AS total_ok
      FROM mrb_ok_entries
      WHERE mrb_campaign_id = $1
        AND inspection_date = $2::date
        ${okWhere}
    `, okParams);

    const totalOk = parseInt(okResult.rows[0]?.total_ok) || 0;

    res.json({ success: true, accumulated, totalOk });
  } catch (error) {
    console.error('Error fetching shift defects:', error);
    res.status(500).json({ success: false, message: 'Error al obtener acumulados' });
  }
});

// ============================================================================
// GET /:id/inspector-performance — OK + NOK por inspector (detection capability)
// Query params: date (YYYY-MM-DD), shiftId, partId
// ============================================================================
router.get('/:id/inspector-performance', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { date, shiftId, partId } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // 1. OK per inspector from mrb_ok_entries
    const okParams = [id, targetDate];
    let okWhere = '';
    if (shiftId) { okParams.push(shiftId); okWhere += ` AND ok.shift_id = $${okParams.length}`; }
    if (partId)  { okParams.push(partId);  okWhere += ` AND ok.part_id  = $${okParams.length}`; }

    const okResult = await query(`
      SELECT
        ok.inspector_id,
        u.first_name, u.last_name,
        SUM(ok.quantity) AS qty_ok
      FROM mrb_ok_entries ok
      JOIN users u ON ok.inspector_id = u.id
      WHERE ok.mrb_campaign_id = $1
        AND ok.inspection_date = $2
        ${okWhere}
      GROUP BY ok.inspector_id, u.first_name, u.last_name
    `, okParams);

    // 2. NOK per inspector from defect_entries_v2
    const nokParams = [id, targetDate];
    let nokWhere = '';
    if (shiftId) { nokParams.push(shiftId); nokWhere += ` AND de.shift_id = $${nokParams.length}`; }
    if (partId)  { nokParams.push(partId);  nokWhere += ` AND de.part_id  = $${nokParams.length}`; }

    const nokResult = await query(`
      SELECT
        de.captured_by_user_id AS inspector_id,
        u.first_name, u.last_name,
        SUM(de.quantity) AS qty_nok,
        json_agg(json_build_object(
          'defectName', dt.name,
          'defectCode', dt.code,
          'disposition', disp.code,
          'qty', de.quantity
        ) ORDER BY dt.name) AS defects
      FROM defect_entries_v2 de
      JOIN users u ON de.captured_by_user_id = u.id
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN inspection_dispositions disp ON de.disposition_id = disp.id
      WHERE de.mrb_campaign_id = $1
        AND DATE(de.created_at) = $2
        ${nokWhere}
      GROUP BY de.captured_by_user_id, u.first_name, u.last_name
    `, nokParams);

    // 3. Merge into inspector map
    const inspectorMap = {};

    okResult.rows.forEach(r => {
      const key = r.inspector_id;
      if (!inspectorMap[key]) inspectorMap[key] = {
        inspectorId: key,
        firstName: r.first_name,
        lastName: r.last_name,
        qtyOk: 0, qtyNok: 0, defects: []
      };
      inspectorMap[key].qtyOk += parseInt(r.qty_ok) || 0;
    });

    nokResult.rows.forEach(r => {
      const key = r.inspector_id;
      if (!inspectorMap[key]) inspectorMap[key] = {
        inspectorId: key,
        firstName: r.first_name,
        lastName: r.last_name,
        qtyOk: 0, qtyNok: 0, defects: []
      };
      inspectorMap[key].qtyNok += parseInt(r.qty_nok) || 0;
      inspectorMap[key].defects = r.defects || [];
    });

    // 4. Calculate detection capability per inspector
    const inspectors = Object.values(inspectorMap).map(ins => ({
      ...ins,
      qtyInspected: ins.qtyOk + ins.qtyNok,
      yieldPct: ins.qtyOk + ins.qtyNok > 0
        ? ((ins.qtyOk / (ins.qtyOk + ins.qtyNok)) * 100).toFixed(1)
        : null,
      detectionRate: ins.qtyNok + ins.qtyOk > 0
        ? ((ins.qtyNok / (ins.qtyOk + ins.qtyNok)) * 100).toFixed(1)
        : null
    }));

    res.json({ success: true, inspectors, date: targetDate });
  } catch (error) {
    console.error('Error fetching inspector performance:', error);
    res.status(500).json({ success: false, message: 'Error al obtener desempeño por inspector' });
  }
});

// ============================================================================
// GET /:id/campaign-progress — Avance de Campaña por turno/día
// ============================================================================
router.get('/:id/campaign-progress', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Base: all registered shifts (includes days with OK-only, no NOK)
    const shiftRows = await query(`
      SELECT
        sh.inspection_date,
        sh.shift_id,
        ins.name AS shift_name,
        ins.code AS shift_code
      FROM mrb_shift_hours sh
      LEFT JOIN inspection_shifts ins ON sh.shift_id = ins.id
      WHERE sh.mrb_campaign_id = $1
    `, [id]);

    // NOK entries grouped by date + shift
    const nokRows = await query(`
      SELECT
        DATE(dev.created_at)            AS inspection_date,
        dev.shift_id,
        ins.name                        AS shift_name,
        ins.code                        AS shift_code,
        SUM(dev.quantity)               AS total_nok,
        SUM(CASE WHEN disp.code = 'USE_AS_IS'       THEN dev.quantity ELSE 0 END) AS use_as_is,
        SUM(CASE WHEN disp.code = 'REWORK'          THEN dev.quantity ELSE 0 END) AS rework,
        SUM(CASE WHEN disp.code = 'SCRAP'           THEN dev.quantity ELSE 0 END) AS scrap,
        SUM(CASE WHEN disp.code = 'RETURN_SUPPLIER' THEN dev.quantity ELSE 0 END) AS return_supplier,
        SUM(CASE WHEN disp.code = 'HOLD'            THEN dev.quantity ELSE 0 END) AS hold
      FROM defect_entries_v2 dev
      LEFT JOIN inspection_shifts ins   ON dev.shift_id     = ins.id
      LEFT JOIN inspection_dispositions disp ON dev.disposition_id = disp.id
      WHERE dev.mrb_campaign_id = $1
      GROUP BY DATE(dev.created_at), dev.shift_id, ins.name, ins.code
      ORDER BY inspection_date DESC, shift_code
    `, [id]);

    // Tally sheet attachments grouped by date + shift
    const tallyRows = await query(`
      SELECT
        a.id, a.filename, a.file_path, a.attachment_type,
        a.shift_id, a.inspection_date,
        a.upload_date,
        ins.name AS shift_name,
        ins.code AS shift_code
      FROM mrb_attachments a
      LEFT JOIN inspection_shifts ins ON a.shift_id = ins.id
      WHERE a.mrb_id = $1 AND a.attachment_type = 'tally_sheet'
      ORDER BY a.inspection_date DESC, a.upload_date DESC
    `, [id]);

    // Attach tally sheets to their matching date+shift row; also build a date-only list for days with no NOK entries
    const shiftData = shiftRows.rows.map(r => transformToCamelCase(r));
    const nokData = nokRows.rows.map(r => transformToCamelCase(r));
    const tallyData = tallyRows.rows.map(r => transformToCamelCase(r));

    // Build a merged set of date/shift keys — base from registered shifts
    const keyMap = {};
    shiftData.forEach(row => {
      const k = `${row.inspectionDate}_${row.shiftId || 'none'}`;
      if (!keyMap[k]) keyMap[k] = {
        inspectionDate: row.inspectionDate,
        shiftId: row.shiftId,
        shiftName: row.shiftName,
        shiftCode: row.shiftCode,
        totalNok: 0, useAsIs: 0, rework: 0, scrap: 0, returnSupplier: 0, hold: 0,
        tallies: []
      };
    });
    nokData.forEach(row => {
      const k = `${row.inspectionDate}_${row.shiftId || 'none'}`;
      if (!keyMap[k]) keyMap[k] = { ...row, tallies: [] };
      else Object.assign(keyMap[k], row);
    });
    tallyData.forEach(t => {
      let k = `${t.inspectionDate}_${t.shiftId || 'none'}`;
      // Si el tally no tiene turno, intentar agruparlo con el primer turno del mismo día
      if (!t.shiftId) {
        const sameDayKey = Object.keys(keyMap).find(key => key.startsWith(`${t.inspectionDate}_`) && key !== `${t.inspectionDate}_none`);
        if (sameDayKey) k = sameDayKey;
      }
      if (!keyMap[k]) {
        keyMap[k] = {
          inspectionDate: t.inspectionDate,
          shiftId: t.shiftId,
          shiftName: t.shiftName,
          shiftCode: t.shiftCode,
          totalNok: 0, useAsIs: 0, rework: 0, scrap: 0, returnSupplier: 0, hold: 0,
          tallies: []
        };
      }
      keyMap[k].tallies.push(t);
    });

    const rows = Object.values(keyMap).sort((a, b) => {
      if (b.inspectionDate > a.inspectionDate) return 1;
      if (b.inspectionDate < a.inspectionDate) return -1;
      return (a.shiftCode || '').localeCompare(b.shiftCode || '');
    });

    res.json({ success: true, rows });
  } catch (error) {
    console.error('Error fetching campaign progress:', error);
    res.status(500).json({ success: false, message: 'Error al obtener avance de campaña' });
  }
});

// GET single MRB Campaign with full details
router.get('/:id', authenticateToken, async (req, res, next) => {
  const { id } = req.params;

  // Skip if id is not a number (let other routes handle it)
  if (isNaN(parseInt(id))) {
    return next('route');
  }

  try {
    // Department name helper
    const deptNames = {
      1: 'Producción', 2: 'Calidad', 3: 'Ingeniería',
      4: 'Mantenimiento', 5: 'Logística', 6: 'Proveedor'
    };

    // Get MRB Campaign with source data
    const mrbResult = await query(`
      SELECT qa.*,
             c.name as client_name,
             p.project_number, p.project_name,
             cp.part_number, cp.part_name, cp.capture_display_name,
             s.name as severity_name, s.code as severity_code, s.color as severity_color,
             u1.first_name || ' ' || u1.last_name as assigned_to_name,
             u2.first_name || ' ' || u2.last_name as reported_by_name,
             u3.first_name || ' ' || u3.last_name as responded_by_name,
             u4.first_name || ' ' || u4.last_name as validated_by_name,
             -- Source QAR full data
             qar.id as source_qar_id_ref,
             qar.alert_number as source_qar_folio,
             qar.title as source_qar_title,
             qar.status as source_qar_status,
             qar.created_at as source_qar_created_at,
             qar.description as source_qar_description,
             -- Note: QAR to 8D escalation tracking would need a separate table or column
             NULL as qar_linked_8d_id,
             NULL as qar_linked_8d_folio,
             -- Source 8D full data
             eightd.id as source_8d_id_ref,
             eightd.report_id as source_8d_folio,
             eightd.title as source_8d_title,
             eightd.status as source_8d_status,
             eightd.created_at as source_8d_created_at,
             eightd.description as source_8d_description,
             NULL as eightd_source_qar_id,
             dept.name as department_name
      FROM mrb_campaigns qa
      LEFT JOIN clients c ON qa.client_id = c.id
      LEFT JOIN projects p ON qa.project_id = p.id
      LEFT JOIN client_parts cp ON qa.part_id = cp.id
      LEFT JOIN inspection_severities s ON qa.severity_id = s.id
      LEFT JOIN users u1 ON qa.assigned_to = u1.id
      LEFT JOIN users u2 ON qa.reported_by = u2.id
      LEFT JOIN users u3 ON qa.responded_by = u3.id
      LEFT JOIN users u4 ON qa.validated_by = u4.id
      LEFT JOIN quality_alerts qar ON qa.source_qar_id = qar.id
      LEFT JOIN eightd_reports eightd ON qa.source_8d_id = eightd.id
      LEFT JOIN departments dept ON qa.department_id = dept.id
      WHERE qa.id = $1
    `, [id]);

    if (mrbResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'MRB Campaign not found' });
    }

    const mrb = mrbResult.rows[0];
    // department_name now comes from the JOIN above

    // Get linked defects with full info
    const defectsResult = await query(`
      SELECT de.id, de.lot_number, de.quantity, de.notes, de.created_at, de.captured_at,
             de.mrb_campaign_id,
             dt.name as defect_name, dt.code as defect_code,
             st.name as station_name, st.code as station_code,
             disp.name as disposition_name, disp.code as disposition_code,
             sh.name as shift_name, sh.code as shift_code,
             cp.part_number, cp.part_name,
             ub.first_name || ' ' || ub.last_name as inspector_name
      FROM defect_entries_v2 de
      JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN inspection_stations st ON de.station_id = st.id
      LEFT JOIN inspection_dispositions disp ON de.disposition_id = disp.id
      LEFT JOIN inspection_shifts sh ON de.shift_id = sh.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN users ub ON de.captured_by_user_id = ub.id
      WHERE de.mrb_campaign_id = $1
      ORDER BY de.created_at DESC
    `, [id]);

    // Get recipients with type
    const recipientsResult = await query(`
      SELECT qr.*, u.first_name, u.last_name, u.email, u.role
      FROM mrb_recipients qr
      JOIN users u ON qr.user_id = u.id
      WHERE qr.mrb_campaign_id = $1
      ORDER BY qr.recipient_type, u.first_name
    `, [id]);

    // Get comments (oldest first for timeline)
    const commentsResult = await query(`
      SELECT qc.*, u.first_name || ' ' || u.last_name as user_name
      FROM mrb_comments qc
      JOIN users u ON qc.user_id = u.id
      WHERE qc.mrb_campaign_id = $1
      ORDER BY qc.created_at ASC
    `, [id]);

    // Get additional attachments
    const attachmentsResult = await query(`
      SELECT ma.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM mrb_attachments ma
      LEFT JOIN users u ON ma.uploaded_by = u.id
      WHERE ma.mrb_id = $1
      ORDER BY ma.upload_date ASC
    `, [id]);

    // Convert file_path to web URL for attachments
    const toWebUrl = (absPath) => {
      if (!absPath) return null;
      if (absPath.startsWith('/uploads/')) return absPath;
      const normalized = absPath.replace(/\\/g, '/');
      const idx = normalized.indexOf('uploads/');
      return idx !== -1 ? '/' + normalized.substring(idx) : absPath;
    };

    const attachments = attachmentsResult.rows.map(a => ({
      ...a,
      file_path: toWebUrl(a.file_path)
    }));

    res.json({
      success: true,
      mrb: transformToCamelCase(mrb),
      defects: transformToCamelCase(defectsResult.rows),
      recipients: transformToCamelCase(recipientsResult.rows),
      comments: transformToCamelCase(commentsResult.rows),
      attachments: transformToCamelCase(attachments)
    });
  } catch (error) {
    console.error('Error fetching MRB Campaign:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB Campaign' });
  }
});

// ============================================================================
// GET /:id/shift-report — Live Daily Shift Report (all sections)
// ============================================================================
router.get('/:id/shift-report', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { shiftId, date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const [headerRes, kpiRes, paretoRes, dispositionRes, inspectorOkRes, inspectorNokRes, talliesRes, defectDetailRes, okEntriesRes, downtimeEntriesRes] = await Promise.all([
      // 1. Header — campaign + shift info
      query(`
        SELECT mc.campaign_number, mc.title, mc.lot_number,
               mc.inspection_criteria, mc.disposition_instructions,
               mc.qty_inspected, mc.qty_ok, mc.qty_nok,
               mc.qty_quarantine_warehouse, mc.qty_quarantine_process,
               mc.parts_list,
               c.name AS client_name, cp.part_number, cp.part_name,
               ins.name AS shift_name, ins.code AS shift_code
        FROM mrb_campaigns mc
        LEFT JOIN clients c ON mc.client_id = c.id
        LEFT JOIN client_parts cp ON mc.part_id = cp.id
        LEFT JOIN inspection_shifts ins ON ins.id = $2
        WHERE mc.id = $1
      `, [id, shiftId || null]),

      // 2. KPIs for this shift+date
      query(`
        SELECT
          COALESCE((SELECT SUM(quantity) FROM mrb_ok_entries
                    WHERE mrb_campaign_id = $1 AND inspection_date = $2::date
                    ${shiftId ? 'AND shift_id = $3' : ''}), 0) AS qty_ok,
          COALESCE(SUM(de.quantity), 0) AS qty_nok,
          COALESCE(SUM(CASE WHEN disp.code = 'SCRAP' THEN de.quantity ELSE 0 END), 0) AS qty_scrap,
          COALESCE((SELECT SUM(dt.downtime_minutes) FROM mrb_downtime_entries dt
                    WHERE dt.mrb_campaign_id = $1 AND DATE(dt.created_at) = $2
                    ${shiftId ? 'AND dt.shift_id = $3' : ''}), 0) AS downtime_min
        FROM defect_entries_v2 de
        LEFT JOIN inspection_dispositions disp ON de.disposition_id = disp.id
        WHERE de.mrb_campaign_id = $1 AND DATE(de.created_at) = $2
        ${shiftId ? 'AND de.shift_id = $3' : ''}
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 3. Pareto by defect type
      query(`
        SELECT dt.name AS defect_name, dt.code AS defect_code,
               SUM(de.quantity) AS qty
        FROM defect_entries_v2 de
        LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
        WHERE de.mrb_campaign_id = $1 AND DATE(de.created_at) = $2
        ${shiftId ? 'AND de.shift_id = $3' : ''}
        GROUP BY dt.name, dt.code
        ORDER BY qty DESC
        LIMIT 10
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 4. Disposition breakdown
      query(`
        SELECT disp.code, disp.name, SUM(de.quantity) AS qty
        FROM defect_entries_v2 de
        LEFT JOIN inspection_dispositions disp ON de.disposition_id = disp.id
        WHERE de.mrb_campaign_id = $1 AND DATE(de.created_at) = $2
        ${shiftId ? 'AND de.shift_id = $3' : ''}
        GROUP BY disp.code, disp.name
        ORDER BY qty DESC
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 5a. Inspector OK
      query(`
        SELECT ok.inspector_id, u.first_name, u.last_name, SUM(ok.quantity) AS qty_ok
        FROM mrb_ok_entries ok JOIN users u ON ok.inspector_id = u.id
        WHERE ok.mrb_campaign_id = $1 AND ok.inspection_date = $2::date
        ${shiftId ? 'AND ok.shift_id = $3' : ''}
        GROUP BY ok.inspector_id, u.first_name, u.last_name
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 5b. Inspector NOK
      query(`
        SELECT de.captured_by_user_id AS inspector_id, u.first_name, u.last_name,
               SUM(de.quantity) AS qty_nok
        FROM defect_entries_v2 de JOIN users u ON de.captured_by_user_id = u.id
        WHERE de.mrb_campaign_id = $1 AND DATE(de.created_at) = $2
        ${shiftId ? 'AND de.shift_id = $3' : ''}
        GROUP BY de.captured_by_user_id, u.first_name, u.last_name
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 6. Tally sheets
      query(`
        SELECT a.id, a.filename, a.file_path
        FROM mrb_attachments a
        WHERE a.mrb_id = $1 AND a.attachment_type = 'tally_sheet'
          AND a.inspection_date = $2::date
          ${shiftId ? 'AND a.shift_id = $3' : ''}
        ORDER BY a.upload_date DESC
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 7. Individual defect entries with timestamp + photos
      query(`
        SELECT de.id, de.lot_number, de.quantity, de.notes,
               de.created_at,
               dt.name AS defect_name, dt.code AS defect_code,
               disp.code AS disposition_code, disp.name AS disposition_name,
               cp.part_number, cp.part_name,
               u.first_name, u.last_name,
               COALESCE(
                 (SELECT json_agg(json_build_object('id', a.id, 'filePath', a.file_path, 'filename', a.filename))
                  FROM mrb_attachments a
                  WHERE a.mrb_id = de.mrb_campaign_id
                    AND a.lot_number = de.lot_number
                    AND a.attachment_type = 'defect_evidence'),
                 '[]'::json
               ) AS evidence
        FROM defect_entries_v2 de
        LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
        LEFT JOIN inspection_dispositions disp ON de.disposition_id = disp.id
        LEFT JOIN client_parts cp ON de.part_id = cp.id
        LEFT JOIN users u ON de.captured_by_user_id = u.id
        WHERE de.mrb_campaign_id = $1 AND DATE(de.created_at) = $2
        ${shiftId ? 'AND de.shift_id = $3' : ''}
        ORDER BY de.created_at ASC
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 8. Individual OK entries with serials
      query(`
        SELECT ok.id, ok.lot_number, ok.quantity, ok.created_at,
               cp.part_number, cp.part_name,
               u.first_name, u.last_name
        FROM mrb_ok_entries ok
        LEFT JOIN client_parts cp ON ok.part_id = cp.id
        LEFT JOIN users u ON ok.inspector_id = u.id
        WHERE ok.mrb_campaign_id = $1 AND ok.inspection_date = $2::date
        ${shiftId ? 'AND ok.shift_id = $3' : ''}
        ORDER BY ok.created_at ASC
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate]),

      // 9. Downtime entries log
      query(`
        SELECT dt.id, dt.lot_number, dt.downtime_minutes, dt.source_type, dt.notes,
               dt.created_at,
               u.first_name, u.last_name
        FROM mrb_downtime_entries dt
        LEFT JOIN users u ON dt.inspector_id = u.id
        WHERE dt.mrb_campaign_id = $1 AND DATE(dt.created_at) = $2
        ${shiftId ? 'AND dt.shift_id = $3' : ''}
        ORDER BY dt.created_at ASC
      `, shiftId ? [id, targetDate, shiftId] : [id, targetDate])
    ]);

    const h = headerRes.rows[0] || {};
    const kpi = kpiRes.rows[0] || {};
    const qtyOk = parseInt(kpi.qty_ok) || 0;
    const qtyNok = parseInt(kpi.qty_nok) || 0;
    const qtyInsp = qtyOk + qtyNok;

    // Pareto with cumulative %
    const paretoTotal = paretoRes.rows.reduce((s, r) => s + parseInt(r.qty), 0);
    let cumQty = 0;
    const pareto = paretoRes.rows.map(r => {
      cumQty += parseInt(r.qty);
      return {
        defectName: r.defect_name || 'Sin clasificar',
        defectCode: r.defect_code,
        qty: parseInt(r.qty),
        pctNok: paretoTotal > 0 ? ((parseInt(r.qty) / paretoTotal) * 100).toFixed(1) : '0',
        pctCumulative: paretoTotal > 0 ? ((cumQty / paretoTotal) * 100).toFixed(1) : '0'
      };
    });

    // Inspector merge
    const inspMap = {};
    inspectorOkRes.rows.forEach(r => {
      const k = r.inspector_id;
      if (!inspMap[k]) inspMap[k] = { name: `${r.first_name} ${r.last_name}`, qtyOk: 0, qtyNok: 0 };
      inspMap[k].qtyOk += parseInt(r.qty_ok) || 0;
    });
    inspectorNokRes.rows.forEach(r => {
      const k = r.inspector_id;
      if (!inspMap[k]) inspMap[k] = { name: `${r.first_name} ${r.last_name}`, qtyOk: 0, qtyNok: 0 };
      inspMap[k].qtyNok += parseInt(r.qty_nok) || 0;
    });
    const inspectors = Object.values(inspMap).map(ins => ({
      ...ins,
      qtyInspected: ins.qtyOk + ins.qtyNok,
      yieldPct: ins.qtyOk + ins.qtyNok > 0 ? ((ins.qtyOk / (ins.qtyOk + ins.qtyNok)) * 100).toFixed(1) : null,
      detectionRate: ins.qtyOk + ins.qtyNok > 0 ? ((ins.qtyNok / (ins.qtyOk + ins.qtyNok)) * 100).toFixed(1) : null
    }));

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      header: {
        campaignNumber: h.campaign_number,
        title: h.title,
        lotNumber: h.lot_number,
        clientName: h.client_name,
        partNumber: h.part_number || (Array.isArray(h.parts_list) && h.parts_list.length > 0
          ? h.parts_list.map(p => p.partNumber).filter(Boolean).join(', ')
          : null),
        partName: h.part_name,
        shiftCode: h.shift_code,
        shiftName: h.shift_name,
        date: targetDate
      },
      kpis: {
        qtyInspected: qtyInsp,
        qtyOk,
        qtyNok,
        yieldPct: qtyInsp > 0 ? ((qtyOk / qtyInsp) * 100).toFixed(1) : null,
        qtyScrap: parseInt(kpi.qty_scrap) || 0,
        downtimeMin: parseInt(kpi.downtime_min) || 0
      },
      avance: {
        qtyEnPlanta: (parseInt(h.qty_quarantine_warehouse) || 0) + (parseInt(h.qty_quarantine_process) || 0),
        qtyInspected: parseInt(h.qty_inspected) || 0
      },
      pareto,
      disposition: dispositionRes.rows.map(r => ({
        code: r.code, name: r.name || r.code,
        qty: parseInt(r.qty),
        pct: qtyNok > 0 ? ((parseInt(r.qty) / qtyNok) * 100).toFixed(1) : '0'
      })),
      inspectors,
      tallies: talliesRes.rows.map(r => transformToCamelCase(r)),
      defectEntries: defectDetailRes.rows.map(r => ({
        id: r.id,
        lotNumber: r.lot_number,
        quantity: r.quantity,
        notes: r.notes,
        createdAt: r.created_at,
        defectName: r.defect_name,
        defectCode: r.defect_code,
        dispositionCode: r.disposition_code,
        dispositionName: r.disposition_name,
        partNumber: r.part_number,
        partName: r.part_name,
        inspector: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        evidence: r.evidence || []
      })),
      okEntries: okEntriesRes.rows.map(r => ({
        id: r.id,
        lotNumber: r.lot_number,
        quantity: r.quantity,
        createdAt: r.created_at,
        partNumber: r.part_number,
        partName: r.part_name,
        inspector: `${r.first_name || ''} ${r.last_name || ''}`.trim()
      })),
      downtimeLog: downtimeEntriesRes.rows.map(r => ({
        id: r.id,
        lotNumber: r.lot_number,
        downtimeMinutes: parseInt(r.downtime_minutes) || 0,
        sourceType: r.source_type,
        notes: r.notes,
        createdAt: r.created_at,
        inspector: `${r.first_name || ''} ${r.last_name || ''}`.trim()
      }))
    });
  } catch (error) {
    console.error('Error fetching shift report:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte' });
  }
});

// ============================================================================
// DOWNTIME ENTRIES — PATCH + DELETE
// ============================================================================
router.patch('/:id/downtime/:entryId', authenticateToken, async (req, res) => {
  const { id, entryId } = req.params;
  const { downtimeMinutes, notes } = req.body;
  if (downtimeMinutes === undefined || parseInt(downtimeMinutes) < 0) {
    return res.status(400).json({ success: false, message: 'Minutos inválidos' });
  }
  try {
    const result = await query(
      `UPDATE mrb_downtime_entries SET downtime_minutes = $1, notes = $2
       WHERE id = $3 AND mrb_campaign_id = $4 RETURNING id`,
      [parseInt(downtimeMinutes), notes || null, entryId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Entrada no encontrada' });
    res.json({ success: true });
  } catch (e) {
    console.error('Error updating downtime entry:', e);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

router.delete('/:id/downtime/:entryId', authenticateToken, async (req, res) => {
  const { id, entryId } = req.params;
  try {
    const result = await query(
      `DELETE FROM mrb_downtime_entries WHERE id = $1 AND mrb_campaign_id = $2 RETURNING id`,
      [entryId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Entrada no encontrada' });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting downtime entry:', e);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
});

// ============================================================================
// MRB SHIFT HOURS — GET + UPSERT (for cost tracking)
// ============================================================================
router.get('/:id/shift-hours', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT sh.*, ins.code AS shift_code, ins.name AS shift_name,
             u.first_name || ' ' || u.last_name AS registered_by_name
      FROM mrb_shift_hours sh
      LEFT JOIN inspection_shifts ins ON sh.shift_id = ins.id
      LEFT JOIN users u ON sh.registered_by = u.id
      WHERE sh.mrb_campaign_id = $1
      ORDER BY sh.inspection_date ASC, ins.code ASC
    `, [id]);
    res.json({ success: true, shiftHours: result.rows.map(r => transformToCamelCase(r)) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al obtener horas de turno' });
  }
});

router.put('/:id/shift-hours', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { shiftId, inspectionDate, inspectorCount, supervisorCount, hoursWorked, notes } = req.body;
  try {
    // Fall back to campaign configured counts if not provided
    let resolvedInspCount = inspectorCount;
    let resolvedSupCount  = supervisorCount;
    if (resolvedInspCount == null || resolvedSupCount == null) {
      const mc = await query('SELECT inspector_count, supervisor_count FROM mrb_campaigns WHERE id = $1', [id]);
      if (resolvedInspCount == null) resolvedInspCount = mc.rows[0]?.inspector_count || 1;
      if (resolvedSupCount  == null) resolvedSupCount  = mc.rows[0]?.supervisor_count || 0;
    }
    const result = await query(`
      INSERT INTO mrb_shift_hours
        (mrb_campaign_id, shift_id, inspection_date, inspector_count, supervisor_count, hours_worked, notes, registered_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (mrb_campaign_id, shift_id, inspection_date)
      DO UPDATE SET
        inspector_count = EXCLUDED.inspector_count,
        supervisor_count = EXCLUDED.supervisor_count,
        hours_worked = EXCLUDED.hours_worked,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [id, shiftId || null, inspectionDate, resolvedInspCount, resolvedSupCount, hoursWorked || 8, notes || null, req.user.id]);
    res.json({ success: true, shiftHour: transformToCamelCase(result.rows[0]) });
  } catch (e) {
    console.error('Error upserting shift hours:', e);
    res.status(500).json({ success: false, message: 'Error al guardar horas de turno' });
  }
});

// GET /:id/cost-summary — Scrap cost by part + personnel cost by shift/day
router.get('/:id/cost-summary', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const mc = await query(
      'SELECT inspector_unit_cost, supervisor_unit_cost, inspector_count, supervisor_count FROM mrb_campaigns WHERE id = $1', [id]
    );
    const { inspector_unit_cost, supervisor_unit_cost } = mc.rows[0] || {};
    const inspRate = parseFloat(inspector_unit_cost) || 0;
    const supRate  = parseFloat(supervisor_unit_cost) || 0;

    // Scrap by part
    const scrapRes = await query(`
      SELECT cp.part_number, cp.part_name, cp.unit_cost,
             SUM(de.quantity) AS qty_scrap
      FROM defect_entries_v2 de
      JOIN inspection_dispositions disp ON de.disposition_id = disp.id
      JOIN client_parts cp ON de.part_id = cp.id
      WHERE de.mrb_campaign_id = $1 AND disp.code = 'SCRAP'
      GROUP BY cp.part_number, cp.part_name, cp.unit_cost
      ORDER BY qty_scrap DESC
    `, [id]);

    // Personnel: mrb_shift_hours UNION shifts inferred from defect_entries (not yet registered)
    const hoursRes = await query(`
      WITH known_shifts AS (
        SELECT DISTINCT shift_id, DATE(created_at) AS inspection_date
        FROM defect_entries_v2 WHERE mrb_campaign_id = $1
        UNION
        SELECT DISTINCT shift_id, inspection_date
        FROM mrb_ok_entries WHERE mrb_campaign_id = $1
        UNION
        SELECT shift_id, inspection_date
        FROM mrb_shift_hours WHERE mrb_campaign_id = $1
      )
      SELECT
        msh.id,
        COALESCE(msh.inspection_date, ks.inspection_date) AS inspection_date,
        COALESCE(msh.shift_id, ks.shift_id) AS shift_id,
        COALESCE(msh.inspector_count, $2) AS inspector_count,
        COALESCE(msh.supervisor_count, $3) AS supervisor_count,
        COALESCE(msh.hours_worked, 0) AS hours_worked,
        msh.notes,
        ins.code AS shift_code, ins.name AS shift_name
      FROM known_shifts ks
      LEFT JOIN mrb_shift_hours msh
        ON msh.mrb_campaign_id = $1
        AND msh.shift_id = ks.shift_id
        AND msh.inspection_date = ks.inspection_date
      LEFT JOIN inspection_shifts ins ON ins.id = COALESCE(msh.shift_id, ks.shift_id)
      ORDER BY inspection_date ASC, ins.code ASC
    `, [id, mc.rows[0]?.inspector_count || 1, mc.rows[0]?.supervisor_count || 0]);

    const scrapRows = scrapRes.rows.map(r => ({
      partNumber: r.part_number,
      partName:   r.part_name,
      unitCost:   parseFloat(r.unit_cost) || 0,
      qtyScrap:   parseInt(r.qty_scrap)   || 0,
      totalCost:  (parseFloat(r.unit_cost) || 0) * (parseInt(r.qty_scrap) || 0)
    }));

    const personnelRows = hoursRes.rows.map(r => {
      const hrs      = parseFloat(r.hours_worked) || 0;
      const inspCnt  = parseFloat(r.inspector_count)  || 0;
      const supCnt   = parseFloat(r.supervisor_count) || 0;
      const laborCost = (inspCnt * hrs * inspRate) + (supCnt * hrs * supRate);
      return {
        id:             r.id,
        inspectionDate: r.inspection_date,
        shiftId:        r.shift_id,
        shiftCode:      r.shift_code,
        shiftName:      r.shift_name,
        inspectorCount: inspCnt,
        supervisorCount: supCnt,
        hoursWorked:    hrs,
        inspectorRate:  inspRate,
        supervisorRate: supRate,
        laborCost,
        notes: r.notes
      };
    });

    const totalScrap     = scrapRows.reduce((s, r) => s + r.totalCost, 0);
    const totalPersonnel = personnelRows.reduce((s, r) => s + r.laborCost, 0);

    res.json({
      success: true,
      scrap: scrapRows,
      personnel: personnelRows,
      totals: { scrap: totalScrap, personnel: totalPersonnel, grand: totalScrap + totalPersonnel }
    });
  } catch (e) {
    console.error('Error fetching cost summary:', e);
    res.status(500).json({ success: false, message: 'Error al calcular costos' });
  }
});

// ============================================================================
// MRB ADDITIONAL ATTACHMENTS
// ============================================================================

// Upload additional attachment to an existing MRB
router.post('/:id/attachments', authenticateToken, mrbAttachUpload.single('file'), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    if (!await isMrbAuthorized(userId, req.user.role, id)) {
      return res.status(403).json({ success: false, message: 'No autorizado para modificar este MRB' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo' });
    }

    const filePath = `/uploads/mrb/${req.file.filename}`;
    const attachmentType = req.body.attachmentType || 'additional';
    const shiftId = req.body.shiftId ? parseInt(req.body.shiftId) : null;
    const inspectionDate = req.body.inspectionDate || new Date().toISOString().split('T')[0];
    const lotNumber = req.body.lotNumber || null;

    const result = await query(
      `INSERT INTO mrb_attachments (mrb_id, filename, file_path, attachment_type, uploaded_by, shift_id, inspection_date, lot_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, req.file.originalname, filePath, attachmentType, userId, shiftId, inspectionDate, lotNumber]
    );

    const row = transformToCamelCase(result.rows[0]);
    res.json({ success: true, attachment: row });
  } catch (error) {
    console.error('Error uploading MRB attachment:', error);
    res.status(500).json({ success: false, message: 'Error al subir archivo' });
  }
});

// Delete an attachment
// POST /:id/reassign-shift — reasignar turno de todos los registros de un día
router.post('/:id/reassign-shift', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { date, oldShiftId, newShiftId } = req.body;
  if (!date || !newShiftId) return res.status(400).json({ success: false, message: 'date y newShiftId requeridos' });
  try {
    const oldCond = oldShiftId ? `AND shift_id = ${parseInt(oldShiftId)}` : 'AND shift_id IS NULL';
    const oldCondOk = oldShiftId ? `AND shift_id = ${parseInt(oldShiftId)}` : 'AND (shift_id IS NULL OR shift_id IS NOT NULL)'; // ok entries: update all of that date
    // defect_entries_v2
    await query(
      `UPDATE defect_entries_v2 SET shift_id = $1 WHERE mrb_campaign_id = $2 AND DATE(created_at) = $3 ${oldCond}`,
      [newShiftId, id, date]
    );
    // mrb_ok_entries
    await query(
      `UPDATE mrb_ok_entries SET shift_id = $1 WHERE mrb_campaign_id = $2 AND inspection_date = $3 ${oldShiftId ? `AND shift_id = ${parseInt(oldShiftId)}` : ''}`,
      [newShiftId, id, date]
    );
    // mrb_attachments
    await query(
      `UPDATE mrb_attachments SET shift_id = $1 WHERE mrb_id = $2 AND inspection_date::date = $3 ${oldCond}`,
      [newShiftId, id, date]
    );
    // Log en historial
    const oldShiftRes = oldShiftId ? await query('SELECT code, name FROM inspection_shifts WHERE id = $1', [oldShiftId]) : null;
    const newShiftRes = await query('SELECT code, name FROM inspection_shifts WHERE id = $1', [newShiftId]);
    const oldName = oldShiftRes?.rows[0] ? `${oldShiftRes.rows[0].code} — ${oldShiftRes.rows[0].name}` : 'Sin turno';
    const newName = newShiftRes?.rows[0] ? `${newShiftRes.rows[0].code} — ${newShiftRes.rows[0].name}` : newShiftId;
    await query(
      'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, `🔄 Turno reasignado: ${date} de "${oldName}" → "${newName}"`, 'system']
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Error reassigning shift:', e);
    res.status(500).json({ success: false, message: 'Error al reasignar turno' });
  }
});

// PATCH /:id/attachments/:attachId — reasignar turno de un tally sheet
router.patch('/:id/attachments/:attachId', authenticateToken, async (req, res) => {
  const { id, attachId } = req.params;
  const { shiftId } = req.body;
  try {
    await query(
      `UPDATE mrb_attachments SET shift_id = $1 WHERE id = $2 AND mrb_id = $3`,
      [shiftId || null, attachId, id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Error updating attachment shift:', e);
    res.status(500).json({ success: false, message: 'Error al actualizar turno' });
  }
});

router.delete('/:id/attachments/:attachId', authenticateToken, async (req, res) => {
  const { id, attachId } = req.params;

  try {
    if (!await isMrbAuthorized(req.user.id, req.user.role, id)) {
      return res.status(403).json({ success: false, message: 'No autorizado para modificar este MRB' });
    }
    const result = await query(
      'DELETE FROM mrb_attachments WHERE id = $1 AND mrb_id = $2 RETURNING file_path',
      [attachId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Try to delete physical file
    const filePath = result.rows[0].file_path;
    if (filePath && filePath.startsWith('/uploads/mrb/')) {
      const absPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(absPath)) {
        try { fs.unlinkSync(absPath); } catch (e) { /* ignore */ }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting MRB attachment:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar archivo' });
  }
});

// CREATE MRB Campaign
router.post('/', authenticateToken, async (req, res) => {
  const {
    clientId,
    projectId,
    partId,
    title,
    description,
    severityId,
    departmentId,
    triggerType = 'threshold',
    triggerDefectCount,
    triggerPeriodHours,
    defectIds = [],
    responseRecipientIds = [],
    validationRecipientIds = [],
    assignedTo,
    photoOkPath,
    photoNokPath,
    status = 'ABIERTA',
    // New source fields
    sourceType,
    sourceQarId,
    source8dId,
    // New MRB operation fields
    qtyInspected = 0,
    qtyOk = 0,
    qtyNok = 0,
    scrapCost = 0,
    laborCost = 0,
    inspectorCount = 0,
    supervisorCount = 0,
    inspectorUnitCost = 0,
    supervisorUnitCost = 0,
    lotNumber,
    partDescription,
    inspectionCriteria,
    dispositionInstructions,
    qtyQuarantineWarehouse = 0,
    qtyQuarantineProcess   = 0,
    qtyQuarantineTransit   = 0,
    qtyQuarantineCustomer  = 0,
    partsList = [],
    campaignDefectIds = [] // Selected defects for this campaign (from part_defect_config)
  } = req.body;

  // Require at least one part
  const hasPartId = !!partId;
  const hasPartsList = Array.isArray(partsList) && partsList.length > 0;
  if (!hasPartId && !hasPartsList) {
    return res.status(400).json({ success: false, message: 'Se requiere al menos un número de parte para crear una campaña MRB.' });
  }

  try {
    // If source is provided, inherit data from it
    let inheritedData = {
      clientId,
      projectId,
      partId,
      severityId,
      departmentId,
      title,
      description
    };

    if (sourceType === 'QAR' && sourceQarId) {
      const qarResult = await query(`
        SELECT qa.*, c.name as client_name, p.project_number, p.project_name,
               cp.part_number, cp.part_name, s.name as severity_name
        FROM quality_alerts qa
        LEFT JOIN clients c ON qa.client_id = c.id
        LEFT JOIN projects p ON qa.project_id = p.id
        LEFT JOIN client_parts cp ON qa.part_id = cp.id
        LEFT JOIN inspection_severities s ON qa.severity_id = s.id
        WHERE qa.id = $1
      `, [sourceQarId]);

      if (qarResult.rows.length > 0) {
        const qar = qarResult.rows[0];
        inheritedData = {
          clientId: clientId || qar.client_id,
          projectId: projectId || qar.project_id,
          partId: partId || qar.part_id,
          severityId: severityId || qar.severity_id,
          departmentId: departmentId || qar.department_id,
          title: title || `MRB - ${qar.alert_number} - ${qar.title}`,
          description: description || `Campaña MRB originada del QAR ${qar.alert_number}.\n\n${qar.description || ''}`
        };
      }
    } else if (sourceType === '8D' && source8dId) {
      const eightdResult = await query(`
        SELECT er.*
        FROM eightd_reports er
        WHERE er.id = $1
      `, [source8dId]);

      if (eightdResult.rows.length > 0) {
        const eightd = eightdResult.rows[0];
        inheritedData = {
          clientId: clientId || eightd.client_id,
          projectId: projectId || eightd.project_id,
          partId: partId || null,
          severityId: severityId || null,
          departmentId: departmentId || null,
          title: title || `MRB - ${eightd.report_id} - ${eightd.title}`,
          description: description || `Campaña MRB originada del 8D ${eightd.report_id}.\n\n${eightd.description || ''}`
        };
      }
    } else if (sourceType === 'INCOMING' && source8dId) {
      const eightdResult = await query(`
        SELECT er.report_id
        FROM eightd_reports er
        WHERE er.id = $1
      `, [source8dId]);

      if (eightdResult.rows.length > 0) {
        const eightd = eightdResult.rows[0];
        const clientRes = clientId ? await query('SELECT name FROM clients WHERE id = $1', [clientId]) : { rows: [] };
        const clientName = clientRes.rows[0]?.name || eightd.client_name || '';
        const partsStr = Array.isArray(partsList) && partsList.length > 0
          ? partsList.map(p => p.partNumber).join(', ')
          : '';
        const prefix = `Campaña MRB originada del 8D ${eightd.report_id}.\n\nCliente: ${clientName}\nParte(s): ${partsStr}`;
        inheritedData = {
          ...inheritedData,
          description: prefix + (description ? `\n\n${description}` : '')
        };
      }
    }

    // Copy photos from source (absolute paths) to MRB uploads folder
    const mrbUploadsDir = path.join(__dirname, '../uploads/mrb');
    if (!fs.existsSync(mrbUploadsDir)) fs.mkdirSync(mrbUploadsDir, { recursive: true });

    const copyPhotoToMrb = (srcPath) => {
      if (!srcPath) return null;
      // If already a relative web path, return as-is
      if (srcPath.startsWith('/uploads/')) return srcPath;
      // Absolute path — copy file to mrb folder
      if (fs.existsSync(srcPath)) {
        const ext = path.extname(srcPath);
        const newFileName = `mrb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
        const destPath = path.join(mrbUploadsDir, newFileName);
        try {
          fs.copyFileSync(srcPath, destPath);
          return `/uploads/mrb/${newFileName}`;
        } catch (e) {
          console.error('Error copying photo to MRB:', e);
          return null;
        }
      }
      return null;
    };

    const finalPhotoNokPath = copyPhotoToMrb(photoNokPath);
    const finalPhotoOkPath = copyPhotoToMrb(photoOkPath);

    // Generate MRB Campaign number — reuse base folio with suffix if 8D has closed campaigns
    let alertNumber;
    if (source8dId) {
      const existingRes = await query(
        `SELECT campaign_number, status FROM mrb_campaigns WHERE source_8d_id = $1 ORDER BY created_at ASC`,
        [source8dId]
      );
      const hasClosed = existingRes.rows.some(r => r.status === 'CERRADA');
      if (hasClosed && existingRes.rows.length > 0) {
        const baseNumber = existingRes.rows[0].campaign_number.replace(/-\d+$/, '');
        alertNumber = `${baseNumber}-${existingRes.rows.length}`;
      }
    }
    if (!alertNumber) {
      const numberResult = await query('SELECT generate_mrb_number() as campaign_number');
      alertNumber = numberResult.rows[0].campaign_number;
    }

    // Get frozen names
    const assignedToName = await getUserFrozenName(assignedTo);
    const reportedByName = await getUserFrozenName(req.user.id);

    // Create MRB Campaign with source and operation fields
    const result = await query(`
      INSERT INTO mrb_campaigns (
        campaign_number, client_id, project_id, part_id, title, description,
        severity_id, department_id,
        assigned_to, assigned_to_name, reported_by, reported_by_name,
        photo_ok_path, photo_nok_path, status,
        source_type, source_qar_id, source_8d_id,
        qty_inspected, qty_ok, qty_nok, scrap_cost, labor_cost,
        inspector_count, supervisor_count, inspector_unit_cost, supervisor_unit_cost,
        lot_number, part_description, inspection_criteria, disposition_instructions,
        qty_quarantine_warehouse, qty_quarantine_process, qty_quarantine_transit, qty_quarantine_customer,
        qty_quarantine_total, qty_quarantine_updated_at, parts_list
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
        CASE WHEN $36 > 0 THEN CURRENT_TIMESTAMP ELSE NULL END, $37)
      RETURNING *
    `, [
      alertNumber,
      inheritedData.clientId, inheritedData.projectId, inheritedData.partId,
      inheritedData.title, inheritedData.description,
      inheritedData.severityId, inheritedData.departmentId,
      assignedTo, assignedToName, req.user.id, reportedByName,
      finalPhotoOkPath, finalPhotoNokPath,
      status,
      sourceType || null, sourceQarId || null, source8dId || null,
      qtyInspected, qtyOk, qtyNok, scrapCost,
      (inspectorCount * inspectorUnitCost) + (supervisorCount * supervisorUnitCost),
      inspectorCount, supervisorCount, inspectorUnitCost, supervisorUnitCost,
      lotNumber || null, partDescription || null, inspectionCriteria || null, dispositionInstructions || null,
      parseInt(qtyQuarantineWarehouse) || 0,
      parseInt(qtyQuarantineProcess)   || 0,
      parseInt(qtyQuarantineTransit)   || 0,
      parseInt(qtyQuarantineCustomer)  || 0,
      (parseInt(qtyQuarantineWarehouse)||0) + (parseInt(qtyQuarantineProcess)||0) + (parseInt(qtyQuarantineTransit)||0) + (parseInt(qtyQuarantineCustomer)||0),
      JSON.stringify(Array.isArray(partsList) ? partsList : [])
    ]);

    const mrbId = result.rows[0].id;

    // Link defects by updating defect_entries with mrb_campaign_id
    for (const defectId of defectIds) {
      await query(
        'UPDATE defect_entries_v2 SET mrb_campaign_id = $1 WHERE id = $2',
        [mrbId, defectId]
      );
    }

    // Mark any declined history as now having a MRB Campaign
    if (defectIds.length > 0) {
      await query(`
        UPDATE mrb_declined_history
        SET mrb_created_later = true, mrb_campaign_id = $1
        WHERE defect_ids ?| $2::text[]
          AND mrb_created_later = false
      `, [mrbId, defectIds.map(String)]);
    }

    // Insert selected campaign defects (for import/capture filtering)
    if (Array.isArray(campaignDefectIds) && campaignDefectIds.length > 0) {
      for (const defectTypeId of campaignDefectIds) {
        await query(
          'INSERT INTO mrb_campaign_defects (mrb_campaign_id, defect_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [mrbId, defectTypeId]
        );
      }
    }

    // Add response recipients
    for (const userId of responseRecipientIds) {
      await query(
        "INSERT INTO mrb_recipients (mrb_campaign_id, user_id, recipient_type) VALUES ($1, $2, 'response')",
        [mrbId, userId]
      );
    }

    // Add validation recipients
    for (const userId of validationRecipientIds) {
      await query(
        "INSERT INTO mrb_recipients (mrb_campaign_id, user_id, recipient_type) VALUES ($1, $2, 'validation')",
        [mrbId, userId]
      );
    }

    // Add creation comment
    await query(
      'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
      [mrbId, req.user.id, 'Caso MRB abierto', 'status_change']
    );

    // Log notification in history when publishing
    if (status === 'ABIERTA' && (responseRecipientIds.length > 0 || validationRecipientIds.length > 0)) {
      const allIds = [...new Set([...responseRecipientIds, ...validationRecipientIds])];
      const userRes = await query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)`,
        [allIds]
      );
      const recipRows = userRes.rows;
      if (recipRows.length > 0) {
        const names = recipRows.map(r => `${r.first_name} ${r.last_name}`).join(', ');
        await query(
          'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
          [mrbId, req.user.id, `📧 Notificación enviada a ${recipRows.length} destinatario(s): ${names}`, 'system']
        );
      }
    }

    res.json({
      success: true,
      mrb: transformToCamelCase(result.rows[0]),
      message: `Caso MRB ${alertNumber} abierto exitosamente`
    });
  } catch (error) {
    console.error('Error creating MRB Campaign:', error);
    res.status(500).json({ success: false, message: 'Error creating MRB Campaign' });
  }
});

// UPDATE MRB Campaign
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    status,
    assignedTo,
    photoOkPath,
    photoNokPath,
    resolutionNotes,
    rootCause,
    correctiveAction,
    recipientIds,
    // MRB operation fields
    qtyInspected,
    qtyOk,
    qtyNok,
    scrapCost,
    laborCost,
    inspectorCount,
    supervisorCount,
    inspectorUnitCost,
    supervisorUnitCost,
    lotNumber,
    partDescription,
    inspectionCriteria,
    dispositionInstructions,
    // INCOMING campaign editable fields
    clientId,
    projectId,
    partId,
    departmentId,
    sourceType: newSourceType,
    source8dId,
    partsList,
    // Quarantine fields (for draft edits)
    qtyQuarantineWarehouse,
    qtyQuarantineProcess,
    qtyQuarantineTransit,
    qtyQuarantineCustomer
  } = req.body;

  try {
    const oldQar = await query('SELECT status FROM mrb_campaigns WHERE id = $1', [id]);
    const oldStatus = oldQar.rows[0]?.status;

    const result = await query(`
      UPDATE mrb_campaigns SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        assigned_to = COALESCE($4, assigned_to),
        photo_ok_path = COALESCE($5, photo_ok_path),
        photo_nok_path = COALESCE($6, photo_nok_path),
        resolution_notes = COALESCE($7, resolution_notes),
        root_cause = COALESCE($8, root_cause),
        corrective_action = COALESCE($9, corrective_action),
        qty_inspected = COALESCE($10, qty_inspected),
        qty_ok = COALESCE($11, qty_ok),
        qty_nok = COALESCE($12, qty_nok),
        scrap_cost = COALESCE($13, scrap_cost),
        inspector_count = COALESCE($15, inspector_count),
        supervisor_count = COALESCE($16, supervisor_count),
        inspector_unit_cost = COALESCE($18, inspector_unit_cost),
        supervisor_unit_cost = COALESCE($19, supervisor_unit_cost),
        labor_cost = CASE
          WHEN $15 IS NOT NULL OR $16 IS NOT NULL OR $18 IS NOT NULL OR $19 IS NOT NULL
          THEN (COALESCE($15, inspector_count) * COALESCE($18, inspector_unit_cost)) +
               (COALESCE($16, supervisor_count) * COALESCE($19, supervisor_unit_cost))
          ELSE COALESCE($14, labor_cost) END,
        lot_number = COALESCE(NULLIF($20, ''), lot_number),
        part_description = COALESCE(NULLIF($21, ''), part_description),
        inspection_criteria = COALESCE(NULLIF($22, ''), inspection_criteria),
        disposition_instructions = COALESCE(NULLIF($23, ''), disposition_instructions),
        client_id = COALESCE($24, client_id),
        project_id = COALESCE($25, project_id),
        part_id = COALESCE($26, part_id),
        department_id = COALESCE($27, department_id),
        source_type = COALESCE($28, source_type),
        source_8d_id = COALESCE($29, source_8d_id),
        parts_list = COALESCE($30, parts_list),
        qty_quarantine_warehouse = COALESCE($31, qty_quarantine_warehouse),
        qty_quarantine_process   = COALESCE($32, qty_quarantine_process),
        qty_quarantine_transit   = COALESCE($33, qty_quarantine_transit),
        qty_quarantine_customer  = COALESCE($34, qty_quarantine_customer),
        qty_quarantine_total = CASE
          WHEN $31 IS NOT NULL OR $32 IS NOT NULL OR $33 IS NOT NULL OR $34 IS NOT NULL
            THEN COALESCE($31, qty_quarantine_warehouse) + COALESCE($32, qty_quarantine_process) +
                 COALESCE($33, qty_quarantine_transit)   + COALESCE($34, qty_quarantine_customer)
          ELSE qty_quarantine_total END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *
    `, [
      title, description, status, assignedTo, photoOkPath, photoNokPath,       // $1–$6
      resolutionNotes, rootCause, correctiveAction,                              // $7–$9
      qtyInspected, qtyOk, qtyNok, scrapCost, laborCost,                        // $10–$14
      inspectorCount, supervisorCount,                                           // $15–$16
      id,                                                                        // $17
      inspectorUnitCost, supervisorUnitCost,                                     // $18–$19
      lotNumber, partDescription, inspectionCriteria, dispositionInstructions,  // $20–$23
      clientId || null, projectId || null, partId || null, departmentId || null, // $24–$27
      newSourceType || null, source8dId || null,                                 // $28–$29
      Array.isArray(partsList) ? JSON.stringify(partsList) : null,               // $30
      qtyQuarantineWarehouse != null ? parseInt(qtyQuarantineWarehouse) : null,  // $31
      qtyQuarantineProcess   != null ? parseInt(qtyQuarantineProcess)   : null,  // $32
      qtyQuarantineTransit   != null ? parseInt(qtyQuarantineTransit)   : null,  // $33
      qtyQuarantineCustomer  != null ? parseInt(qtyQuarantineCustomer)  : null   // $34
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'MRB Campaign not found' });
    }

    // Update recipients if provided
    if (recipientIds) {
      await query('DELETE FROM mrb_recipients WHERE mrb_campaign_id = $1', [id]);
      for (const userId of recipientIds) {
        await query('INSERT INTO mrb_recipients (mrb_campaign_id, user_id) VALUES ($1, $2)', [id, userId]);
      }
    }

    // Log status change
    if (status && status !== oldStatus) {
      await query(
        'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
        [id, req.user.id, `Estado cambiado de ${oldStatus} a ${status}`, 'status_change']
      );

      // On publish: fetch recipients and log notification in history
      if (status === 'ABIERTA' && oldStatus === 'BORRADOR') {
        const recipientsRes = await query(
          `SELECT u.id, u.email, u.first_name, u.last_name, mr.recipient_type
           FROM mrb_recipients mr
           JOIN users u ON mr.user_id = u.id
           WHERE mr.mrb_campaign_id = $1`,
          [id]
        );
        const recipRows = recipientsRes.rows;

        if (recipRows.length > 0) {
          // Log notification in history
          const names = recipRows.map(r => `${r.first_name} ${r.last_name}`).join(', ');
          await query(
            'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
            [id, req.user.id, `📧 Notificación enviada a ${recipRows.length} destinatario(s): ${names}`, 'system']
          );
        }

        // Return recipients for client-side mailto fallback
        return res.json({
          success: true,
          mrb: transformToCamelCase(result.rows[0]),
          published: true,
          notifyRecipients: recipRows.map(r => ({
            email: r.email,
            name: `${r.first_name} ${r.last_name}`,
            type: r.recipient_type
          }))
        });
      }
    }

    res.json({
      success: true,
      mrb: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating MRB Campaign:', error);
    res.status(500).json({ success: false, message: 'Error updating MRB Campaign' });
  }
});

// SYNC MRB from 8D source (refresh D3 fields)
router.post('/:id/sync-from-source', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Get the MRB's linked 8D
    const mrbResult = await query(
      'SELECT source_type, source_8d_id FROM mrb_campaigns WHERE id = $1',
      [id]
    );
    if (!mrbResult.rows.length) {
      return res.status(404).json({ success: false, message: 'MRB no encontrado' });
    }
    const { source_8d_id } = mrbResult.rows[0];

    if (!source_8d_id) {
      return res.status(400).json({ success: false, message: 'Este MRB no tiene un 8D vinculado' });
    }

    // Fetch D3 fields from the 8D
    const eightdResult = await query(
      `SELECT part_name, d3_conformance_guarantee, d3_suspect_material_disposal
       FROM eightd_reports WHERE id = $1`,
      [source_8d_id]
    );
    if (!eightdResult.rows.length) {
      return res.status(404).json({ success: false, message: '8D vinculado no encontrado' });
    }
    const eightd = eightdResult.rows[0];

    // Update the MRB fields from 8D
    const updated = await query(
      `UPDATE mrb_campaigns SET
        part_description = COALESCE($1, part_description),
        inspection_criteria = COALESCE($2, inspection_criteria),
        disposition_instructions = COALESCE($3, disposition_instructions),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [
        eightd.part_name || null,
        eightd.d3_conformance_guarantee || null,
        eightd.d3_suspect_material_disposal || null,
        id
      ]
    );

    res.json({
      success: true,
      mrb: transformToCamelCase(updated.rows[0]),
      synced: {
        partDescription: eightd.part_name,
        inspectionCriteria: eightd.d3_conformance_guarantee,
        dispositionInstructions: eightd.d3_suspect_material_disposal
      }
    });
  } catch (error) {
    console.error('Error syncing MRB from source:', error);
    res.status(500).json({ success: false, message: 'Error al sincronizar' });
  }
});

// SYNC root cause & corrective action from 8D D5/D6
router.post('/:id/sync-d5d6', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const mrbResult = await query(
      'SELECT source_type, source_8d_id FROM mrb_campaigns WHERE id = $1', [id]
    );
    if (!mrbResult.rows.length) return res.status(404).json({ success: false, message: 'MRB no encontrado' });
    const { source_8d_id } = mrbResult.rows[0];
    if (!source_8d_id) {
      return res.status(400).json({ success: false, message: 'Este MRB no tiene un 8D vinculado' });
    }

    const eightdResult = await query(
      `SELECT d4_root_cause, d6_countermeasure_description FROM eightd_reports WHERE id = $1`,
      [source_8d_id]
    );
    if (!eightdResult.rows.length) return res.status(404).json({ success: false, message: '8D vinculado no encontrado' });
    const eightd = eightdResult.rows[0];

    const updated = await query(
      `UPDATE mrb_campaigns SET
        root_cause = COALESCE($1, root_cause),
        corrective_action = COALESCE($2, corrective_action),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [eightd.d4_root_cause || null, eightd.d6_countermeasure_description || null, id]
    );

    res.json({
      success: true,
      mrb: transformToCamelCase(updated.rows[0]),
      synced: {
        rootCause: eightd.d4_root_cause,
        correctiveAction: eightd.d6_countermeasure_description
      }
    });
  } catch (error) {
    console.error('Error syncing D5/D6:', error);
    res.status(500).json({ success: false, message: 'Error al sincronizar D5/D6' });
  }
});

// DELETE MRB Campaign (only BORRADOR)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await query('SELECT status FROM mrb_campaigns WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'MRB no encontrado' });
    if (check.rows[0].status !== 'BORRADOR') {
      return res.status(400).json({ success: false, message: 'Solo se pueden eliminar campañas en estado Borrador' });
    }
    await query('DELETE FROM mrb_campaigns WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting MRB:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
});

// ADD recipients to published MRB
router.post('/:id/recipients', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId, userIds, recipientType = 'response' } = req.body;
  const ids = userIds ?? (userId ? [userId] : []);
  try {
    const check = await query('SELECT status FROM mrb_campaigns WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'MRB no encontrado' });

    for (const userId of ids) {
      await query(
        `INSERT INTO mrb_recipients (mrb_campaign_id, user_id, recipient_type)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [id, userId, recipientType]
      ).catch(() => {
        return query(
          `INSERT INTO mrb_recipients (mrb_campaign_id, user_id, recipient_type) VALUES ($1, $2, $3)`,
          [id, userId, recipientType]
        );
      });
    }
    const updated = await query(
      `SELECT mr.*, u.first_name, u.last_name, u.role
       FROM mrb_recipients mr JOIN users u ON mr.user_id = u.id
       WHERE mr.mrb_campaign_id = $1 ORDER BY mr.recipient_type, u.first_name`,
      [id]
    );
    res.json({ success: true, recipients: transformToCamelCase(updated.rows) });
  } catch (error) {
    console.error('Error adding recipients:', error);
    res.status(500).json({ success: false, message: 'Error al agregar destinatarios' });
  }
});

// DELETE a recipient from MRB
router.delete('/:id/recipients/:recipientId', authenticateToken, async (req, res) => {
  const { id, recipientId } = req.params;
  try {
    const check = await query('SELECT status FROM mrb_campaigns WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'MRB no encontrado' });

    await query('DELETE FROM mrb_recipients WHERE id = $1 AND mrb_campaign_id = $2', [recipientId, id]);

    const updated = await query(
      `SELECT mr.*, u.first_name, u.last_name, u.email, u.role
       FROM mrb_recipients mr JOIN users u ON mr.user_id = u.id
       WHERE mr.mrb_campaign_id = $1 ORDER BY mr.recipient_type, u.first_name`,
      [id]
    );
    res.json({ success: true, recipients: transformToCamelCase(updated.rows) });
  } catch (error) {
    console.error('Error removing recipient:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar destinatario' });
  }
});

// UPDATE MRB Campaign Source (change origin from QAR to 8D or vice versa)
router.put('/:id/source', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { sourceType, sourceQarId, source8dId } = req.body;

  try {
    // Verify MRB exists and is in ABIERTA status
    const mrbCheck = await query('SELECT status, source_type, source_qar_id, source_8d_id FROM mrb_campaigns WHERE id = $1', [id]);

    if (mrbCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Caso MRB no encontrado' });
    }

    if (!['ABIERTA', 'BORRADOR'].includes(mrbCheck.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede cambiar el origen de un MRB en estado ABIERTA o BORRADOR'
      });
    }

    const oldSourceType = mrbCheck.rows[0].source_type;
    const oldSourceQarId = mrbCheck.rows[0].source_qar_id;
    const oldSource8dId = mrbCheck.rows[0].source_8d_id;

    // Validate the new source exists
    if (sourceType === 'QAR' && sourceQarId) {
      const qarCheck = await query('SELECT id, alert_number FROM quality_alerts WHERE id = $1', [sourceQarId]);
      if (qarCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'QAR origen no encontrado' });
      }
    } else if (sourceType === '8D' && source8dId) {
      const eightdCheck = await query('SELECT id, report_id FROM eightd_reports WHERE id = $1', [source8dId]);
      if (eightdCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: '8D origen no encontrado' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Debe especificar un origen válido (QAR o 8D)' });
    }

    // Update the source
    const result = await query(`
      UPDATE mrb_campaigns SET
        source_type = $1,
        source_qar_id = $2,
        source_8d_id = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [
      sourceType,
      sourceType === 'QAR' ? sourceQarId : null,
      sourceType === '8D' ? source8dId : null,
      id
    ]);

    // Log the change
    let changeMessage = `Origen cambiado de ${oldSourceType || 'ninguno'} a ${sourceType}`;
    await query(
      'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, changeMessage, 'status_change']
    );

    res.json({
      success: true,
      mrb: transformToCamelCase(result.rows[0]),
      message: 'Origen actualizado correctamente'
    });
  } catch (error) {
    console.error('Error updating MRB source:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar origen del MRB' });
  }
});

// LINK 8D to an INCOMING campaign (only sets source_8d_id, preserves source_type)
router.patch('/:id/link-8d', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { source8dId, adoptFields = {}, source = {} } = req.body;

  if (!source8dId) {
    return res.status(400).json({ success: false, message: 'source8dId es requerido' });
  }

  try {
    const mrbCheck = await query(
      'SELECT status, source_type, campaign_number FROM mrb_campaigns WHERE id = $1',
      [id]
    );
    if (mrbCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Caso MRB no encontrado' });
    }
    if (!['ABIERTA', 'BORRADOR'].includes(mrbCheck.rows[0].status)) {
      return res.status(400).json({ success: false, message: 'Solo se puede vincular un 8D a un MRB en estado ABIERTA o BORRADOR' });
    }

    const eightdCheck = await query(
      'SELECT id, report_id FROM eightd_reports WHERE id = $1',
      [source8dId]
    );
    if (eightdCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: '8D no encontrado' });
    }

    // Build dynamic SET clause for adopted fields
    const sets = ['source_8d_id = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [source8dId];
    const addParam = (val) => { params.push(val); return `$${params.length}`; };

    if (adoptFields.title && source.title)                           sets.push(`title = ${addParam(`MRB - ${source.folio} - ${source.title}`)}`);
    if (adoptFields.client && source.clientId)                       sets.push(`client_id = ${addParam(source.clientId)}`);
    if (adoptFields.parts  && source.partId)                         sets.push(`part_id = ${addParam(source.partId)}`);
    if (adoptFields.parts  && source.partsList)                      sets.push(`parts_list = ${addParam(JSON.stringify(source.partsList))}`);
    if (adoptFields.defectDescription && source.defectDescription)   sets.push(`description = ${addParam(source.defectDescription)}`);
    if (adoptFields.criteria && source.inspectionCriteria)           sets.push(`inspection_criteria = ${addParam(source.inspectionCriteria)}`);
    if (adoptFields.disposition && source.dispositionInstructions)   sets.push(`disposition_instructions = ${addParam(source.dispositionInstructions)}`);
    if (adoptFields.quarantine) {
      if (source.qtyWarehouse != null)  sets.push(`qty_quarantine_warehouse = ${addParam(source.qtyWarehouse)}`);
      if (source.qtyInProcess != null)  sets.push(`qty_quarantine_process = ${addParam(source.qtyInProcess)}`);
      if (source.qtyInTransit != null)  sets.push(`qty_quarantine_transit = ${addParam(source.qtyInTransit)}`);
      if (source.qtyWithCustomer != null) sets.push(`qty_quarantine_customer = ${addParam(source.qtyWithCustomer)}`);
    }

    params.push(id);
    const result = await query(
      `UPDATE mrb_campaigns SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    const adoptedList = Object.entries(adoptFields).filter(([,v]) => v).map(([k]) => k).join(', ');
    await query(
      'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, `8D ${eightdCheck.rows[0].report_id} vinculado — campos adoptados: ${adoptedList}`, 'status_change']
    );

    res.json({ success: true, mrb: transformToCamelCase(result.rows[0]), message: '8D vinculado correctamente' });
  } catch (error) {
    console.error('Error linking 8D:', error);
    res.status(500).json({ success: false, message: 'Error al vincular 8D' });
  }
});

// ADD COMMENT to MRB Campaign
router.post('/:id/comments', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { comment, commentType = 'note' } = req.body;

  try {
    const result = await query(`
      INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *,
        (SELECT first_name || ' ' || last_name FROM users WHERE id = $2) as user_name
    `, [id, req.user.id, comment, commentType]);

    res.json({
      success: true,
      comment: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});

// ============================================================================
// MRB Campaign RESPONSE (from response recipients)
// ============================================================================
router.post('/:id/respond', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rootCause, correctiveAction, resolutionNotes } = req.body;

  try {
    if (!await isMrbAuthorized(req.user.id, req.user.role, id, 'response')) {
      return res.status(403).json({ success: false, message: 'No autorizado para responder este MRB' });
    }

    // Update MRB Campaign with disposition
    const result = await query(`
      UPDATE mrb_campaigns SET
        root_cause = $1,
        corrective_action = $2,
        resolution_notes = $3,
        responded_by = $4,
        response_date = CURRENT_TIMESTAMP,
        status = 'EN_PROCESO',
        validation_status = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [rootCause, correctiveAction, resolutionNotes, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Caso MRB no encontrado' });
    }

    // Add response comment
    await query(
      'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Disposición registrada - Pendiente de validación', 'response']
    );

    // Update recipient acknowledged time
    await query(`
      UPDATE mrb_recipients SET acknowledged_at = CURRENT_TIMESTAMP
      WHERE mrb_campaign_id = $1 AND user_id = $2
    `, [id, req.user.id]);

    // Get validation recipients for mailto notification
    const validationRecipientsRes = await query(`
      SELECT u.email, u.first_name, u.last_name
      FROM mrb_recipients r JOIN users u ON r.user_id = u.id
      WHERE r.mrb_campaign_id = $1 AND r.recipient_type = 'validation'
    `, [id]);

    res.json({
      success: true,
      mrb: transformToCamelCase(result.rows[0]),
      message: 'Disposición registrada - Pendiente de validación',
      validationEmails: validationRecipientsRes.rows.map(r => r.email),
      validationNames: validationRecipientsRes.rows.map(r => `${r.first_name} ${r.last_name}`)
    });
  } catch (error) {
    console.error('Error responding to MRB Campaign:', error);
    res.status(500).json({ success: false, message: 'Error al registrar disposición' });
  }
});

// ============================================================================
// MRB Campaign VALIDATION (from validation recipients)
// ============================================================================
router.post('/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { approved, rejectionReason, earlyCloseReason } = req.body;

  try {
    // Verify user is authorized to validate MRB Campaigns
    const userCheck = await query('SELECT can_validate_mrb FROM users WHERE id = $1', [req.user.id]);
    const canValidate = userCheck.rows[0]?.can_validate_mrb || false;

    if (!canValidate) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para validar MRB Campaigns. Contacta a un administrador.'
      });
    }

    // Check if MRB Campaign is in EN_PROCESO status
    const mrbCheck = await query(
      'SELECT status, qty_inspected, qty_quarantine_warehouse, qty_quarantine_process, responded_by, campaign_number FROM mrb_campaigns WHERE id = $1', [id]
    );
    if (mrbCheck.rows[0]?.status !== 'EN_PROCESO') {
      return res.status(400).json({
        success: false,
        message: 'El caso MRB debe estar en estado EN_PROCESO para validar'
      });
    }

    if (approved) {
      const { qty_inspected, qty_quarantine_warehouse, qty_quarantine_process } = mrbCheck.rows[0];
      const inspected = parseInt(qty_inspected) || 0;
      const total = (parseInt(qty_quarantine_warehouse) || 0) + (parseInt(qty_quarantine_process) || 0);
      const inventoryComplete = total === 0 || inspected >= total;

      // If inventory incomplete, require a reason
      if (!inventoryComplete && !earlyCloseReason?.trim()) {
        return res.status(400).json({
          success: false,
          requiresReason: true,
          message: `Inventario incompleto: ${inspected} / ${total} piezas inspeccionadas. Proporciona un motivo para cerrar anticipadamente.`
        });
      }

      // Approve and close MRB Campaign
      const result = await query(`
        UPDATE mrb_campaigns SET
          validated_by = $1,
          validation_date = CURRENT_TIMESTAMP,
          validation_status = 'approved',
          status = 'CERRADA',
          closed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [req.user.id, id]);

      // Add approval comment
      await query(
        'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
        [id, req.user.id, 'Caso MRB validado y cerrado', 'validation']
      );

      // Log early close reason if inventory was incomplete
      if (!inventoryComplete && earlyCloseReason?.trim()) {
        await query(
          'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
          [id, req.user.id, `Cierre anticipado (${inspected}/${total} piezas): ${earlyCloseReason.trim()}`, 'closure_reason']
        );
      }

      res.json({
        success: true,
        mrb: transformToCamelCase(result.rows[0]),
        message: 'Caso MRB validado y cerrado exitosamente'
      });
    } else {
      // Reject response — return to EN_PROCESO so responsible can re-submit
      // Get response recipients emails
      const responseRecipientsRes = await query(`
        SELECT u.email, u.first_name, u.last_name
        FROM mrb_recipients r JOIN users u ON r.user_id = u.id
        WHERE r.mrb_campaign_id = $1 AND r.recipient_type = 'response'
      `, [id]);

      const result = await query(`
        UPDATE mrb_campaigns SET
          validation_status = 'rejected',
          validated_by = $1,
          validation_date = CURRENT_TIMESTAMP,
          responded_by = NULL,
          response_date = NULL,
          status = 'EN_PROCESO',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [req.user.id, id]);

      await query(
        'INSERT INTO mrb_comments (mrb_campaign_id, user_id, comment, comment_type) VALUES ($1, $2, $3, $4)',
        [id, req.user.id, `Respuesta rechazada: ${rejectionReason || 'Sin motivo especificado'}`, 'rejection']
      );

      res.json({
        success: true,
        mrb: transformToCamelCase(result.rows[0]),
        message: 'Respuesta rechazada — el responsable debe corregir y reenviar',
        responsibleEmails: responseRecipientsRes.rows.map(r => r.email),
        responsibleNames: responseRecipientsRes.rows.map(r => `${r.first_name} ${r.last_name}`)
      });
    }
  } catch (error) {
    console.error('Error validating MRB Campaign:', error);
    res.status(500).json({ success: false, message: 'Error al validar MRB Campaign' });
  }
});

// ============================================================================
// MRB Campaign DECLINED TRACKING
// ============================================================================

// Log when user declines to emit a MRB Campaign
router.post('/decline', authenticateToken, async (req, res) => {
  const {
    partId,
    severityId,
    departmentId,
    defectCount,
    thresholdCount,
    thresholdHours,
    defectIds = [],
    reason
  } = req.body;

  try {
    const result = await query(`
      INSERT INTO mrb_declined_history (
        part_id, severity_id, department_id,
        defect_count, threshold_count, threshold_hours,
        declined_by, defect_ids, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      partId, severityId, departmentId,
      defectCount, thresholdCount, thresholdHours,
      req.user.id, JSON.stringify(defectIds), reason
    ]);

    res.json({
      success: true,
      declined: transformToCamelCase(result.rows[0]),
      message: 'Declined MRB Campaign logged successfully'
    });
  } catch (error) {
    console.error('Error logging declined MRB Campaign:', error);
    res.status(500).json({ success: false, message: 'Error logging declined MRB Campaign' });
  }
});

// Get declined history (for admin/reporting)
router.get('/declined-history', authenticateToken, async (req, res) => {
  const { partId, limit = 50 } = req.query;

  try {
    let sql = `
      SELECT qdh.*,
             cp.part_number, cp.part_name,
             s.name as severity_name,
             u.first_name || ' ' || u.last_name as declined_by_name
      FROM mrb_declined_history qdh
      LEFT JOIN client_parts cp ON qdh.part_id = cp.id
      LEFT JOIN inspection_severities s ON qdh.severity_id = s.id
      LEFT JOIN users u ON qdh.declined_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (partId) {
      params.push(partId);
      sql += ` AND qdh.part_id = $${params.length}`;
    }

    sql += ` ORDER BY qdh.declined_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);

    res.json({
      success: true,
      history: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching declined history:', error);
    res.status(500).json({ success: false, message: 'Error fetching declined history' });
  }
});

// GET users for recipient selection
router.get('/users/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, role
      FROM users
      WHERE active = true
      ORDER BY first_name, last_name
    `);

    res.json({
      success: true,
      users: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// ============================================================================
// CAMPAIGN-PART RELATIONSHIP ENDPOINTS (Multi-campaign inspection)
// ============================================================================

// Get active campaigns for a part by part_id
router.get('/campaigns-by-part/:partId', authenticateToken, async (req, res) => {
  const { partId } = req.params;
  try {
    const result = await query(`
      SELECT
        mc.id as campaign_id,
        mc.campaign_number,
        mc.title,
        mc.status,
        mc.disposition,
        mc.description,
        sev.name as severity_name,
        sev.color as severity_color,
        mc.qty_inspected,
        mc.qty_ok,
        mc.qty_nok,
        mc.qty_scrap,
        mc.qty_rework,
        mc.qty_use_as_is,
        mc.qty_return,
        mc.created_at
      FROM mrb_campaign_parts mcp
      JOIN mrb_campaigns mc ON mcp.mrb_campaign_id = mc.id
      LEFT JOIN inspection_severities sev ON mc.severity_id = sev.id
      WHERE mcp.part_id = $1
        AND mc.status IN ('ABIERTA', 'EN_PROCESO')
      ORDER BY mc.campaign_number
    `, [partId]);

    res.json({
      success: true,
      partId: parseInt(partId),
      campaigns: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching campaigns by part:', error);
    res.status(500).json({ success: false, message: 'Error fetching campaigns' });
  }
});

// Get active campaigns by part_number (for scanning)
router.get('/campaigns-by-part-number/:partNumber', authenticateToken, async (req, res) => {
  const { partNumber } = req.params;
  try {
    // First find the part
    const partResult = await query(`
      SELECT cp.id, cp.part_number, cp.part_name, c.name as client_name
      FROM client_parts cp
      LEFT JOIN clients c ON cp.client_id = c.id
      WHERE UPPER(cp.part_number) = UPPER($1)
    `, [partNumber]);

    if (partResult.rows.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: 'Número de parte no encontrado',
        campaigns: []
      });
    }

    const part = partResult.rows[0];

    // Get active campaigns for this part
    const campaignsResult = await query(`
      SELECT
        mc.id as campaign_id,
        mc.campaign_number,
        mc.title,
        mc.status,
        mc.disposition,
        mc.description,
        dt.name as defect_name,
        dt.code as defect_code,
        sev.name as severity_name,
        sev.color as severity_color,
        mc.qty_inspected,
        mc.qty_ok,
        mc.qty_nok,
        mc.qty_scrap,
        mc.qty_rework,
        mc.qty_use_as_is,
        mc.qty_return,
        mc.created_at
      FROM mrb_campaign_parts mcp
      JOIN mrb_campaigns mc ON mcp.mrb_campaign_id = mc.id
      LEFT JOIN defect_types dt ON mc.severity_id = dt.id
      LEFT JOIN inspection_severities sev ON mc.severity_id = sev.id
      WHERE mcp.part_id = $1
        AND mc.status IN ('ABIERTA', 'EN_PROCESO')
      ORDER BY sev.level DESC NULLS LAST, mc.campaign_number
    `, [part.id]);

    res.json({
      success: true,
      found: true,
      part: transformToCamelCase(part),
      campaigns: transformToCamelCase(campaignsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching campaigns by part number:', error);
    res.status(500).json({ success: false, message: 'Error fetching campaigns' });
  }
});

// Get parts with multiple active campaigns
router.get('/parts-multi-campaign', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM v_parts_multi_campaign
      WHERE active_campaigns_count > 0
      ORDER BY active_campaigns_count DESC, part_number
    `);

    res.json({
      success: true,
      parts: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching parts with multi campaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching parts' });
  }
});

// Add part to campaign (for linking existing parts to campaigns)
router.post('/:id/add-part', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { partId } = req.body;

  try {
    // Check if already linked
    const existing = await query(
      'SELECT 1 FROM mrb_campaign_parts WHERE mrb_campaign_id = $1 AND part_id = $2',
      [id, partId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, message: 'Parte ya vinculada a esta campaña' });
    }

    // Add the link
    await query(
      'INSERT INTO mrb_campaign_parts (mrb_campaign_id, part_id) VALUES ($1, $2)',
      [id, partId]
    );

    // Also update parts_list JSONB for backwards compatibility
    const partInfo = await query(
      'SELECT id, part_number, part_name FROM client_parts WHERE id = $1',
      [partId]
    );

    if (partInfo.rows.length > 0) {
      const part = partInfo.rows[0];
      await query(`
        UPDATE mrb_campaigns
        SET parts_list = COALESCE(parts_list, '[]'::jsonb) || $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id, JSON.stringify([{
        partId: part.id,
        partNumber: part.part_number,
        partName: part.part_name
      }])]);
    }

    res.json({ success: true, message: 'Parte agregada a la campaña' });
  } catch (error) {
    console.error('Error adding part to campaign:', error);
    res.status(500).json({ success: false, message: 'Error adding part' });
  }
});

// Remove part from campaign
router.delete('/:id/remove-part/:partId', authenticateToken, async (req, res) => {
  const { id, partId } = req.params;

  try {
    await query(
      'DELETE FROM mrb_campaign_parts WHERE mrb_campaign_id = $1 AND part_id = $2',
      [id, partId]
    );

    // Also update parts_list JSONB
    await query(`
      UPDATE mrb_campaigns
      SET parts_list = (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(parts_list) elem
        WHERE (elem->>'partId')::int != $2
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, partId]);

    res.json({ success: true, message: 'Parte removida de la campaña' });
  } catch (error) {
    console.error('Error removing part from campaign:', error);
    res.status(500).json({ success: false, message: 'Error removing part' });
  }
});

// ============================================================================
// MRB AFFECTED SERIALS ENDPOINTS (Seriales a inspeccionar)
// ============================================================================

// GET /mrb/:id/affected-serials - List affected serials for a campaign
router.get('/:id/affected-serials', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT
        mas.id, mas.serial_number, mas.lot_number, mas.notes,
        mas.inspected, mas.inspected_at, mas.inspection_result,
        mas.created_at,
        cp.part_number, cp.part_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM mrb_affected_serials mas
      LEFT JOIN client_parts cp ON mas.part_id = cp.id
      LEFT JOIN users u ON mas.created_by = u.id
      WHERE mas.mrb_campaign_id = $1
      ORDER BY mas.inspected ASC, mas.created_at DESC
    `, [id]);

    const inspectedCount = result.rows.filter(r => r.inspected).length;
    const pendingCount = result.rows.filter(r => !r.inspected).length;

    res.json({
      success: true,
      serials: transformToCamelCase(result.rows),
      summary: {
        total: result.rows.length,
        inspected: inspectedCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching affected serials:', error);
    res.status(500).json({ success: false, message: 'Error fetching affected serials' });
  }
});

// POST /mrb/:id/affected-serials - Add affected serials (single or bulk)
router.post('/:id/affected-serials', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { serials, partId, lotNumber } = req.body;
  // serials can be: string (single), array of strings, or array of objects {serialNumber, partId?, lotNumber?, notes?}

  try {
    // Obtener info de la campaña para el client_id
    const campaignRes = await query('SELECT client_id, part_id FROM mrb_campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }
    const campaignClientId = campaignRes.rows[0].client_id;
    const campaignPartId = campaignRes.rows[0].part_id;

    if (!serials || (Array.isArray(serials) && serials.length === 0)) {
      return res.status(400).json({ success: false, message: 'Se requiere al menos un serial' });
    }

    // Normalize input to array of objects
    let serialList = [];
    if (typeof serials === 'string') {
      // Single serial or newline/comma separated
      const parsed = serials.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
      serialList = parsed.map(s => ({ serialNumber: s, partId, lotNumber }));
    } else if (Array.isArray(serials)) {
      serialList = serials.map(s => {
        if (typeof s === 'string') {
          return { serialNumber: s.trim(), partId, lotNumber };
        }
        return { serialNumber: s.serialNumber?.trim(), partId: s.partId || partId, lotNumber: s.lotNumber || lotNumber, notes: s.notes };
      }).filter(s => s.serialNumber);
    }

    if (serialList.length === 0) {
      return res.status(400).json({ success: false, message: 'No se encontraron seriales válidos' });
    }

    let inserted = 0;
    let duplicates = 0;

    for (const serial of serialList) {
      try {
        await query(`
          INSERT INTO mrb_affected_serials (mrb_campaign_id, serial_number, part_id, lot_number, notes, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, serial.serialNumber, serial.partId || null, serial.lotNumber || null, serial.notes || null, req.user.id]);
        inserted++;

        // Actualizar unit_registry a QUARANTINE si existe
        const effectivePartId = serial.partId || campaignPartId;
        if (effectivePartId && campaignClientId) {
          await query(`
            UPDATE unit_registry
            SET current_status = 'QUARANTINE',
                updated_at = CURRENT_TIMESTAMP
            WHERE serial_number = $1
              AND client_id = $2
              AND part_id = $3
              AND current_status NOT IN ('SCRAPPED', 'SHIPPED')
          `, [serial.serialNumber, campaignClientId, effectivePartId]);
        }
      } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
          duplicates++;
        } else {
          throw err;
        }
      }
    }

    res.json({
      success: true,
      message: `${inserted} serial(es) agregado(s)${duplicates > 0 ? `, ${duplicates} duplicado(s) omitido(s)` : ''}`,
      inserted,
      duplicates
    });
  } catch (error) {
    console.error('Error adding affected serials:', error);
    res.status(500).json({ success: false, message: 'Error adding affected serials' });
  }
});

// DELETE /mrb/:id/affected-serials/:serialId - Remove an affected serial
router.delete('/:id/affected-serials/:serialId', authenticateToken, async (req, res) => {
  const { id, serialId } = req.params;
  try {
    const result = await query(
      'DELETE FROM mrb_affected_serials WHERE id = $1 AND mrb_campaign_id = $2 RETURNING id',
      [serialId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Serial no encontrado' });
    }
    res.json({ success: true, message: 'Serial eliminado' });
  } catch (error) {
    console.error('Error deleting affected serial:', error);
    res.status(500).json({ success: false, message: 'Error deleting serial' });
  }
});

// DELETE /mrb/:id/affected-serials - Clear all affected serials
router.delete('/:id/affected-serials', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM mrb_affected_serials WHERE mrb_campaign_id = $1 RETURNING id',
      [id]
    );
    res.json({ success: true, message: `${result.rows.length} serial(es) eliminado(s)`, deleted: result.rows.length });
  } catch (error) {
    console.error('Error clearing affected serials:', error);
    res.status(500).json({ success: false, message: 'Error clearing serials' });
  }
});

// PATCH /mrb/:id/affected-serials/:serialId/inspect - Mark serial as inspected
router.patch('/:id/affected-serials/:serialId/inspect', authenticateToken, async (req, res) => {
  const { id, serialId } = req.params;
  const { result: inspectionResult } = req.body;
  try {
    const qResult = await query(`
      UPDATE mrb_affected_serials
      SET inspected = true, inspected_at = CURRENT_TIMESTAMP, inspection_result = $1
      WHERE id = $2 AND mrb_campaign_id = $3
      RETURNING *
    `, [inspectionResult || 'OK', serialId, id]);

    if (qResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Serial no encontrado' });
    }
    res.json({ success: true, serial: transformToCamelCase(qResult.rows[0]) });
  } catch (error) {
    console.error('Error marking serial as inspected:', error);
    res.status(500).json({ success: false, message: 'Error updating serial' });
  }
});

// GET /mrb/:id/search-serials - Search serials from production_entries for affected serials loading
router.get('/:id/search-serials', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { mode, dateFrom, dateTo, serialFrom, serialTo, partIds } = req.query;
  // mode: 'date' or 'serial'
  // partIds: comma-separated list of part IDs to filter

  try {
    // Get campaign parts
    const campaignRes = await query(`
      SELECT mc.client_id, mc.part_id, mc.parts_list
      FROM mrb_campaigns mc
      WHERE mc.id = $1
    `, [id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    const campaign = campaignRes.rows[0];

    // Get valid part IDs from campaign
    let campaignPartIds = [];
    if (campaign.parts_list && Array.isArray(campaign.parts_list)) {
      campaignPartIds = campaign.parts_list.map(p => p.partId).filter(Boolean);
    }
    if (campaign.part_id && !campaignPartIds.includes(campaign.part_id)) {
      campaignPartIds.push(campaign.part_id);
    }

    if (campaignPartIds.length === 0) {
      return res.json({ success: true, serials: [], message: 'La campaña no tiene partes asignadas' });
    }

    // Filter by selected parts (if provided)
    let filterPartIds = campaignPartIds;
    if (partIds) {
      const requestedParts = partIds.split(',').map(p => parseInt(p)).filter(Boolean);
      filterPartIds = requestedParts.filter(p => campaignPartIds.includes(p));
      if (filterPartIds.length === 0) {
        return res.json({ success: true, serials: [], message: 'Las partes seleccionadas no pertenecen a la campaña' });
      }
    }

    // Search in production_entries (source of production data) - usa unit_id para status
    let sql = `
      SELECT
        pe.id, pe.serial_number, pe.part_id, pe.produced_at,
        pe.unit_id, pe.lot_number,
        cp.part_number, cp.part_name
      FROM production_entries pe
      JOIN client_parts cp ON pe.part_id = cp.id
      WHERE pe.part_id = ANY($1::int[])
    `;
    const params = [filterPartIds];

    if (mode === 'date' && dateFrom && dateTo) {
      params.push(dateFrom, dateTo);
      sql += ` AND pe.produced_at >= $${params.length - 1}::timestamp AND pe.produced_at <= $${params.length}::timestamp`;
    } else if (mode === 'serial' && serialFrom && serialTo) {
      params.push(serialFrom, serialTo);
      sql += ` AND pe.serial_number >= $${params.length - 1} AND pe.serial_number <= $${params.length}`;
    } else {
      return res.status(400).json({ success: false, message: 'Especifica rango de fechas o rango de seriales' });
    }

    sql += ` ORDER BY pe.serial_number LIMIT 5000`;

    const result = await query(sql, params);

    // Transform to match expected format (registeredAt -> producedAt)
    const serials = result.rows.map(r => ({
      id: r.id,
      serialNumber: r.serial_number,
      partId: r.part_id,
      registeredAt: r.produced_at, // Use producedAt as registeredAt for frontend compatibility
      currentStatus: r.unit_id ? 'INSPECTED' : 'PENDING', // usa unit_id para determinar si fue inspeccionado
      lotNumber: r.lot_number,
      partNumber: r.part_number,
      partName: r.part_name
    }));

    res.json({
      success: true,
      serials,
      count: result.rows.length,
      truncated: result.rows.length >= 5000
    });
  } catch (error) {
    console.error('Error searching serials:', error);
    res.status(500).json({ success: false, message: 'Error searching serials' });
  }
});

// GET /mrb/:id/check-affected/:serial - Check if serial is in affected list
router.get('/:id/check-affected/:serial', authenticateToken, async (req, res) => {
  const { id, serial } = req.params;
  try {
    // Check if campaign has any affected serials defined
    const countRes = await query(
      'SELECT COUNT(*)::int as count FROM mrb_affected_serials WHERE mrb_campaign_id = $1',
      [id]
    );

    if (countRes.rows[0].count === 0) {
      return res.json({ success: true, affectedStatus: 'NO_LIST_DEFINED', hasAffectedList: false });
    }

    // Check if this serial is in the list
    const inListRes = await query(
      'SELECT id, inspected, inspection_result FROM mrb_affected_serials WHERE mrb_campaign_id = $1 AND serial_number = $2',
      [id, serial.trim()]
    );

    if (inListRes.rows.length > 0) {
      const row = inListRes.rows[0];
      return res.json({
        success: true,
        affectedStatus: 'IN_LIST',
        hasAffectedList: true,
        affectedSerial: {
          id: row.id,
          inspected: row.inspected,
          inspectionResult: row.inspection_result
        }
      });
    }

    return res.json({ success: true, affectedStatus: 'OUT_OF_LIST', hasAffectedList: true });
  } catch (error) {
    console.error('Error checking affected serial:', error);
    res.status(500).json({ success: false, message: 'Error verificando serial' });
  }
});

// GET /mrb/:id/campaign-defects - Get configured defects for this campaign
router.get('/:id/campaign-defects', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Get defects configured for this campaign
    const defectsRes = await query(`
      SELECT mcd.id, mcd.defect_type_id, dt.name, dt.code, dt.category_id, dc.name as category_name, dc.color as category_color
      FROM mrb_campaign_defects mcd
      JOIN defect_types dt ON mcd.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE mcd.mrb_campaign_id = $1
      ORDER BY dc.name, dt.name
    `, [id]);

    res.json({ success: true, defects: defectsRes.rows.map(r => transformToCamelCase(r)) });
  } catch (error) {
    console.error('Error getting campaign defects:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo defectos de campaña' });
  }
});

// PUT /mrb/:id/campaign-defects - Update configured defects for this campaign
router.put('/:id/campaign-defects', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { defectTypeIds } = req.body; // Array of defect_type_id

  if (!Array.isArray(defectTypeIds)) {
    return res.status(400).json({ success: false, message: 'defectTypeIds debe ser un array' });
  }

  try {
    // Verify campaign exists
    const campaignRes = await query('SELECT id, status FROM mrb_campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    // Delete existing and insert new
    await query('DELETE FROM mrb_campaign_defects WHERE mrb_campaign_id = $1', [id]);

    if (defectTypeIds.length > 0) {
      const values = defectTypeIds.map((dtId, i) => `($1, $${i + 2})`).join(', ');
      await query(
        `INSERT INTO mrb_campaign_defects (mrb_campaign_id, defect_type_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [id, ...defectTypeIds]
      );
    }

    res.json({ success: true, message: `${defectTypeIds.length} defecto(s) configurado(s)` });
  } catch (error) {
    console.error('Error updating campaign defects:', error);
    res.status(500).json({ success: false, message: 'Error actualizando defectos de campaña' });
  }
});

// GET /mrb/:id/available-defects - Get all defects available for campaign parts
router.get('/:id/available-defects', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Get campaign parts
    const campaignRes = await query(`
      SELECT mc.part_id, mc.parts_list
      FROM mrb_campaigns mc
      WHERE mc.id = $1
    `, [id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    const campaign = campaignRes.rows[0];
    let partIds = [];
    if (campaign.parts_list && Array.isArray(campaign.parts_list)) {
      partIds = campaign.parts_list.map(p => p.partId).filter(Boolean);
    }
    if (campaign.part_id && !partIds.includes(campaign.part_id)) {
      partIds.push(campaign.part_id);
    }

    if (partIds.length === 0) {
      return res.json({ success: true, defects: [] });
    }

    // Get defects for these parts
    const defectsRes = await query(`
      SELECT DISTINCT dt.id as defect_type_id, dt.name, dt.code, dc.name as category_name, dc.color as category_color
      FROM part_defect_config pdc
      JOIN defect_types dt ON pdc.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE pdc.part_id = ANY($1::int[]) AND pdc.is_active = true AND dt.is_active = true
      ORDER BY dc.name, dt.name
    `, [partIds]);

    res.json({ success: true, defects: defectsRes.rows.map(r => transformToCamelCase(r)) });
  } catch (error) {
    console.error('Error getting available defects:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo defectos disponibles' });
  }
});

// GET /mrb/:id/campaign-parts - Get parts assigned to this campaign (for filter checkboxes)
router.get('/:id/campaign-parts', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const campaignRes = await query(`
      SELECT mc.part_id, mc.parts_list
      FROM mrb_campaigns mc
      WHERE mc.id = $1
    `, [id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    const campaign = campaignRes.rows[0];
    let partIds = [];
    if (campaign.parts_list && Array.isArray(campaign.parts_list)) {
      partIds = campaign.parts_list.map(p => p.partId).filter(Boolean);
    }
    if (campaign.part_id && !partIds.includes(campaign.part_id)) {
      partIds.push(campaign.part_id);
    }

    if (partIds.length === 0) {
      return res.json({ success: true, parts: [] });
    }

    const partsRes = await query(`
      SELECT id, part_number, part_name
      FROM client_parts
      WHERE id = ANY($1::int[])
      ORDER BY part_number
    `, [partIds]);

    res.json({ success: true, parts: transformToCamelCase(partsRes.rows) });
  } catch (error) {
    console.error('Error fetching campaign parts:', error);
    res.status(500).json({ success: false, message: 'Error fetching parts' });
  }
});

// POST /mrb/:id/affected-serials/bulk - Add multiple serials from search results
router.post('/:id/affected-serials/bulk', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { serials } = req.body;
  // serials: array of { serialNumber, partId }

  try {
    // Obtener client_id de la campaña
    const campaignRes = await query('SELECT client_id FROM mrb_campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }
    const campaignClientId = campaignRes.rows[0].client_id;

    if (!serials || !Array.isArray(serials) || serials.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere lista de seriales' });
    }

    let inserted = 0;
    let duplicates = 0;

    for (const serial of serials) {
      try {
        await query(`
          INSERT INTO mrb_affected_serials (mrb_campaign_id, serial_number, part_id, created_by)
          VALUES ($1, $2, $3, $4)
        `, [id, serial.serialNumber, serial.partId, req.user.id]);
        inserted++;

        // Actualizar unit_registry a QUARANTINE si existe
        if (serial.partId && campaignClientId) {
          await query(`
            UPDATE unit_registry
            SET current_status = 'QUARANTINE'
            WHERE serial_number = $1
              AND client_id = $2
              AND part_id = $3
              AND current_status NOT IN ('SCRAPPED', 'SHIPPED')
          `, [serial.serialNumber, campaignClientId, serial.partId]);
        }
      } catch (err) {
        if (err.code === '23505') {
          duplicates++;
        } else {
          throw err;
        }
      }
    }

    res.json({
      success: true,
      message: `${inserted} serial(es) agregado(s)${duplicates > 0 ? `, ${duplicates} duplicado(s) omitido(s)` : ''}`,
      inserted,
      duplicates
    });
  } catch (error) {
    console.error('Error adding bulk affected serials:', error);
    res.status(500).json({ success: false, message: 'Error adding serials' });
  }
});

// GET /mrb/:id/available-parts - Get parts from project that are NOT yet in campaign
router.get('/:id/available-parts', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT cp.id, cp.part_number, cp.part_name, cp.capture_display_name
      FROM client_parts cp
      JOIN mrb_campaigns mc ON mc.project_id = cp.project_id
      WHERE mc.id = $1
        AND cp.active = true
        AND cp.id NOT IN (
          SELECT part_id FROM mrb_campaign_parts WHERE mrb_campaign_id = $1
        )
        AND cp.id NOT IN (
          SELECT (elem->>'partId')::int
          FROM mrb_campaigns mc2, jsonb_array_elements(mc2.parts_list) elem
          WHERE mc2.id = $1 AND mc2.parts_list IS NOT NULL
        )
        AND (mc.part_id IS NULL OR cp.id != mc.part_id)
      ORDER BY cp.part_number
    `, [id]);

    res.json({ success: true, parts: transformToCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching available parts:', error);
    res.status(500).json({ success: false, message: 'Error fetching available parts' });
  }
});

// ============================================================================
// MRB BUFFER ENDPOINTS (Material QUARANTINE sin campaña)
// ============================================================================

// GET /mrb/buffer - Lista de defectos en buffer MRB
router.get('/buffer', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_mrb_buffer');
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching MRB buffer:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB buffer' });
  }
});

// GET /mrb/buffer/summary - Resumen de buffer por área responsable
router.get('/buffer/summary', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_mrb_buffer_summary');
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching MRB buffer summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB buffer summary' });
  }
});

// PATCH /mrb/buffer/:id/assign-department - Asignar departamento responsable
router.patch('/buffer/:id/assign-department', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { departmentId } = req.body;

  try {
    // Validar que el departamento existe
    if (departmentId) {
      const deptCheck = await query('SELECT id FROM departments WHERE id = $1', [departmentId]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Departamento no encontrado' });
      }
    }

    const result = await query(`
      UPDATE defect_entries_v2
      SET department_id = $1,
          mrb_received_at = COALESCE(mrb_received_at, CURRENT_TIMESTAMP)
      WHERE id = $2 AND repair_status = 'QUARANTINE'
      RETURNING id
    `, [departmentId || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Defecto no encontrado o no está en QUARANTINE'
      });
    }

    res.json({ success: true, message: 'Departamento asignado correctamente' });
  } catch (error) {
    console.error('Error assigning department:', error);
    res.status(500).json({ success: false, message: 'Error al asignar departamento' });
  }
});

// PATCH /mrb/buffer/:id/assign-area - DEPRECATED, usar assign-department
router.patch('/buffer/:id/assign-area', authenticateToken, async (req, res) => {
  res.status(410).json({ success: false, message: 'Endpoint deprecated. Use /assign-department instead' });
});

// PATCH /mrb/buffer/:id/assign-campaign - Asignar defecto a campaña MRB
router.patch('/buffer/:id/assign-campaign', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { campaignId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ success: false, message: 'campaignId es requerido' });
  }

  try {
    // Verificar que la campaña existe y está activa
    const campaign = await query(
      `SELECT id, status FROM mrb_campaigns WHERE id = $1`,
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    if (!['ABIERTA', 'EN_PROCESO'].includes(campaign.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'La campaña no está activa'
      });
    }

    // Asignar defecto a la campaña
    const result = await query(`
      UPDATE defect_entries_v2
      SET mrb_campaign_id = $1,
          mrb_received_at = COALESCE(mrb_received_at, CURRENT_TIMESTAMP)
      WHERE id = $2 AND repair_status = 'QUARANTINE'
      RETURNING id
    `, [campaignId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Defecto no encontrado o no está en QUARANTINE'
      });
    }

    res.json({ success: true, message: 'Defecto asignado a campaña MRB' });
  } catch (error) {
    console.error('Error assigning campaign:', error);
    res.status(500).json({ success: false, message: 'Error assigning campaign' });
  }
});

// POST /mrb/buffer/batch-assign-campaign - Asignar múltiples defectos a campaña
router.post('/buffer/batch-assign-campaign', authenticateToken, async (req, res) => {
  const { defectIds, campaignId } = req.body;

  if (!defectIds || !Array.isArray(defectIds) || defectIds.length === 0) {
    return res.status(400).json({ success: false, message: 'defectIds es requerido' });
  }

  if (!campaignId) {
    return res.status(400).json({ success: false, message: 'campaignId es requerido' });
  }

  try {
    const result = await query(`
      UPDATE defect_entries_v2
      SET mrb_campaign_id = $1,
          mrb_received_at = COALESCE(mrb_received_at, CURRENT_TIMESTAMP)
      WHERE id = ANY($2::int[]) AND repair_status = 'QUARANTINE'
      RETURNING id
    `, [campaignId, defectIds]);

    res.json({
      success: true,
      message: `${result.rows.length} defecto(s) asignado(s) a campaña`,
      assignedCount: result.rows.length
    });
  } catch (error) {
    console.error('Error batch assigning campaign:', error);
    res.status(500).json({ success: false, message: 'Error batch assigning campaign' });
  }
});

// ============================================================================
// MRB EXPORT ENDPOINT - Datos completos para Excel
// ============================================================================

router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, department_id, status } = req.query;

    // Construir condiciones de filtro
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      conditions.push(`mc.created_at >= $${paramIndex}::date`);
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      conditions.push(`mc.created_at <= ($${paramIndex}::date + interval '1 day')`);
      params.push(end_date);
      paramIndex++;
    }
    if (department_id) {
      conditions.push(`mc.department_id = $${paramIndex}`);
      params.push(parseInt(department_id));
      paramIndex++;
    }
    if (status) {
      conditions.push(`mc.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 1. Todas las campañas MRB con información completa
    const campaignsQuery = `
      SELECT
        mc.campaign_number,
        mc.title,
        mc.status,
        c.name AS client_name,
        p.project_number,
        p.project_name,
        cp.part_number,
        cp.part_name,
        dep.name AS department,
        sev.name AS severity,
        mc.defect_description,
        mc.source_type,
        mc.qty_nok,
        mc.qty_scrap,
        mc.qty_rework,
        mc.qty_use_as_is,
        mc.qty_return,
        mc.qty_hold,
        mc.scrap_cost,
        mc.labor_cost,
        mc.downtime_minutes,
        mc.root_cause,
        mc.immediate_action,
        mc.containment_action,
        mc.created_at,
        mc.closed_at,
        CONCAT(uc.first_name, ' ', uc.last_name) AS created_by,
        CONCAT(ucl.first_name, ' ', ucl.last_name) AS closed_by,
        CASE WHEN mc.closed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (mc.closed_at - mc.created_at)) / 86400
          ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mc.created_at)) / 86400
        END AS days_open
      FROM mrb_campaigns mc
      LEFT JOIN clients c ON mc.client_id = c.id
      LEFT JOIN projects p ON mc.project_id = p.id
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      LEFT JOIN departments dep ON mc.department_id = dep.id
      LEFT JOIN inspection_severities sev ON mc.severity_id = sev.id
      LEFT JOIN users uc ON mc.created_by = uc.id
      LEFT JOIN users ucl ON mc.closed_by = ucl.id
      ${whereClause}
      ORDER BY mc.created_at DESC
    `;

    // 2. Resumen por departamento
    const byDepartmentQuery = `
      SELECT
        dep.name AS department,
        COUNT(*) AS total_campaigns,
        SUM(CASE WHEN mc.status = 'CERRADA' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN mc.status IN ('ABIERTA', 'EN_PROCESO') THEN 1 ELSE 0 END) AS open,
        SUM(COALESCE(mc.qty_nok, 0)) AS total_nok,
        SUM(COALESCE(mc.qty_scrap, 0)) AS total_scrap,
        SUM(COALESCE(mc.qty_rework, 0)) AS total_rework,
        SUM(COALESCE(mc.scrap_cost, 0)) AS scrap_cost,
        SUM(COALESCE(mc.labor_cost, 0)) AS labor_cost,
        SUM(COALESCE(mc.downtime_minutes, 0)) AS total_downtime
      FROM mrb_campaigns mc
      LEFT JOIN departments dep ON mc.department_id = dep.id
      ${whereClause}
      GROUP BY dep.id, dep.name
      ORDER BY total_campaigns DESC
    `;

    // 3. Resumen por severidad
    const bySeverityQuery = `
      SELECT
        sev.name AS severity,
        sev.code AS severity_code,
        COUNT(*) AS total_campaigns,
        SUM(COALESCE(mc.qty_nok, 0)) AS total_nok,
        SUM(COALESCE(mc.qty_scrap, 0)) AS total_scrap,
        SUM(COALESCE(mc.scrap_cost, 0)) AS scrap_cost
      FROM mrb_campaigns mc
      LEFT JOIN inspection_severities sev ON mc.severity_id = sev.id
      ${whereClause}
      GROUP BY sev.id, sev.name, sev.code
      ORDER BY total_campaigns DESC
    `;

    // 4. Resumen por cliente
    const byClientQuery = `
      SELECT
        c.name AS client,
        COUNT(*) AS total_campaigns,
        SUM(CASE WHEN mc.status = 'CERRADA' THEN 1 ELSE 0 END) AS closed,
        SUM(COALESCE(mc.qty_nok, 0)) AS total_nok,
        SUM(COALESCE(mc.qty_scrap, 0)) AS total_scrap,
        SUM(COALESCE(mc.scrap_cost, 0) + COALESCE(mc.labor_cost, 0)) AS total_cost
      FROM mrb_campaigns mc
      LEFT JOIN clients c ON mc.client_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY total_campaigns DESC
    `;

    // 5. Resumen por parte
    const byPartQuery = `
      SELECT
        cp.part_number,
        cp.part_name,
        c.name AS client,
        COUNT(*) AS total_campaigns,
        SUM(COALESCE(mc.qty_nok, 0)) AS total_nok,
        SUM(COALESCE(mc.qty_scrap, 0)) AS total_scrap,
        SUM(COALESCE(mc.scrap_cost, 0)) AS scrap_cost
      FROM mrb_campaigns mc
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      LEFT JOIN clients c ON mc.client_id = c.id
      ${whereClause}
      GROUP BY cp.id, cp.part_number, cp.part_name, c.name
      ORDER BY total_campaigns DESC
    `;

    // 6. Tendencia mensual
    const monthlyTrendQuery = `
      SELECT
        TO_CHAR(mc.created_at, 'YYYY-MM') AS month,
        COUNT(*) AS campaigns,
        SUM(COALESCE(mc.qty_nok, 0)) AS nok,
        SUM(COALESCE(mc.qty_scrap, 0)) AS scrap,
        SUM(COALESCE(mc.scrap_cost, 0) + COALESCE(mc.labor_cost, 0)) AS total_cost
      FROM mrb_campaigns mc
      ${whereClause}
      GROUP BY TO_CHAR(mc.created_at, 'YYYY-MM')
      ORDER BY month DESC
    `;

    // Ejecutar todas las consultas en paralelo
    const [campaigns, byDepartment, bySeverity, byClient, byPart, monthlyTrend] = await Promise.all([
      query(campaignsQuery, params),
      query(byDepartmentQuery, params),
      query(bySeverityQuery, params),
      query(byClientQuery, params),
      query(byPartQuery, params),
      query(monthlyTrendQuery, params)
    ]);

    res.json({
      success: true,
      data: {
        campaigns: transformToCamelCase(campaigns.rows),
        byDepartment: transformToCamelCase(byDepartment.rows),
        bySeverity: transformToCamelCase(bySeverity.rows),
        byClient: transformToCamelCase(byClient.rows),
        byPart: transformToCamelCase(byPart.rows),
        monthlyTrend: transformToCamelCase(monthlyTrend.rows)
      },
      filters: {
        startDate: start_date || null,
        endDate: end_date || null,
        departmentId: department_id || null,
        status: status || null
      }
    });
  } catch (error) {
    console.error('Error fetching MRB export data:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB export data' });
  }
});

// ============================================================================
// GET /mrb/:id/tally-template - Descargar template Excel simplificado (SERIAL | PARTE)
// ============================================================================
router.get('/:id/tally-template', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener info de la campaña
    const campaignRes = await query(`
      SELECT mc.*,
             c.name as client_name,
             p.project_number, p.project_name,
             cp.part_number, cp.part_name,
             s.name as severity_name,
             dep.name as department_name,
             u.first_name || ' ' || u.last_name as reported_by_name
      FROM mrb_campaigns mc
      LEFT JOIN clients c ON mc.client_id = c.id
      LEFT JOIN projects p ON mc.project_id = p.id
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      LEFT JOIN inspection_severities s ON mc.severity_id = s.id
      LEFT JOIN departments dep ON mc.department_id = dep.id
      LEFT JOIN users u ON mc.reported_by = u.id
      WHERE mc.id = $1
    `, [id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }

    const campaign = campaignRes.rows[0];

    // 2. Obtener partes de la campaña
    const partsRes = await query(`
      SELECT DISTINCT cp.id as part_id, cp.part_number, cp.part_name FROM (
        SELECT part_id FROM mrb_campaign_parts WHERE mrb_campaign_id = $1
        UNION
        SELECT part_id FROM mrb_campaigns WHERE id = $1 AND part_id IS NOT NULL
      ) parts
      JOIN client_parts cp ON cp.id = parts.part_id
    `, [id]);
    const partNumbers = partsRes.rows.map(r => r.part_number).join(', ');

    // 3. Crear workbook simplificado
    const wb = XLSX.utils.book_new();

    // ========== HOJA ÚNICA: LISTADO DE SERIALES ==========
    const sheetData = [];

    // Header con info de campaña
    sheetData.push(['TEMPLATE IMPORT MASIVO - MRB']);
    sheetData.push([]);
    sheetData.push(['Campaña:', campaign.campaign_number]);
    sheetData.push(['Título:', campaign.title]);
    sheetData.push(['Cliente:', campaign.client_name || '-']);
    sheetData.push(['Proyecto:', campaign.project_name || '-']);
    sheetData.push(['No. de Parte:', partNumbers || campaign.part_number || '-']);
    sheetData.push(['Lote / Batch:', campaign.lot_number || 'N/A']);
    sheetData.push([]);
    sheetData.push(['INSTRUCCIONES:']);
    sheetData.push(['1. Llena las columnas SERIAL y PARTE con los datos a importar']);
    sheetData.push(['2. En la aplicación, selecciona el tipo de registro (OK o Defecto)']);
    sheetData.push(['3. Si es Defecto, selecciona el defecto y la disposición']);
    sheetData.push(['4. Sube este archivo para importar todos los registros']);
    sheetData.push([]);

    // Header de tabla simplificado: solo SERIAL y PARTE
    sheetData.push(['SERIAL', 'PARTE']);

    // Agregar filas vacías para llenar (500 filas)
    for (let i = 0; i < 500; i++) {
      sheetData.push(['', '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 25 }, // Serial
      { wch: 20 }  // Parte
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Seriales');

    // 4. Generar buffer y enviar
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ImportTemplate_${campaign.campaign_number}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error generating import template:', error);
    res.status(500).json({ success: false, message: 'Error generando template' });
  }
});

// ============================================================================
// GET /mrb/:id/defects - Obtener defectos configurados para la campaña
// ============================================================================
router.get('/:id/defects', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Primero intentar obtener de mrb_campaign_defects (nuevos)
    let defectsRes = await query(`
      SELECT mcd.defect_type_id, dt.code, dt.name, pdc.display_name,
             dc.name as category_name
      FROM mrb_campaign_defects mcd
      JOIN defect_types dt ON mcd.defect_type_id = dt.id
      LEFT JOIN part_defect_config pdc ON pdc.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE mcd.mrb_campaign_id = $1 AND dt.is_active = true
      ORDER BY dc.display_order, dt.display_order, dt.name
    `, [id]);

    // Si no hay defectos en mrb_campaign_defects, obtener de las partes de la campaña
    if (defectsRes.rows.length === 0) {
      defectsRes = await query(`
        SELECT DISTINCT dt.id as defect_type_id, dt.code, dt.name, pdc.display_name,
               dc.name as category_name,
               dc.display_order as category_display_order,
               dt.display_order as defect_display_order
        FROM mrb_campaigns mc
        LEFT JOIN mrb_campaign_parts mcp ON mc.id = mcp.mrb_campaign_id
        JOIN client_parts cp ON cp.id = COALESCE(mcp.part_id, mc.part_id)
        JOIN part_defect_config pdc ON pdc.part_id = cp.id AND pdc.is_active = true
        JOIN defect_types dt ON pdc.defect_type_id = dt.id AND dt.is_active = true
        LEFT JOIN defect_categories dc ON dt.category_id = dc.id
        WHERE mc.id = $1
        ORDER BY dc.display_order, dt.display_order, dt.name
      `, [id]);
    }

    // Eliminar duplicados por defect_type_id
    const seen = new Set();
    const defects = defectsRes.rows.filter(d => {
      if (seen.has(d.defect_type_id)) return false;
      seen.add(d.defect_type_id);
      return true;
    }).map(row => ({
      defectTypeId: row.defect_type_id,
      code: row.code,
      name: row.name,
      displayName: row.display_name,
      categoryName: row.category_name
    }));

    res.json({ success: true, defects });
  } catch (error) {
    console.error('Error fetching campaign defects:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo defectos' });
  }
});

// ============================================================================
// POST /mrb/:id/import-mass - Import masivo simplificado (OK o con defecto)
// ============================================================================
router.post('/:id/import-mass', authenticateToken, multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  const { id } = req.params;
  const { importType, shiftId, defectTypeId, disposition } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Archivo requerido' });
  }

  if (!shiftId) {
    return res.status(400).json({ success: false, message: 'Turno requerido' });
  }

  if (importType === 'DEFECT' && !defectTypeId) {
    return res.status(400).json({ success: false, message: 'Defecto requerido para tipo DEFECT' });
  }

  try {
    // 1. Verificar campaña activa
    const campaignRes = await query('SELECT * FROM mrb_campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    }
    const campaign = campaignRes.rows[0];

    if (campaign.status === 'CERRADA') {
      return res.status(400).json({ success: false, message: 'La campaña está cerrada' });
    }

    // 2. Leer archivo Excel/CSV
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // 3. Buscar fila de header (SERIAL, PARTE)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (row && row[0] && String(row[0]).toUpperCase().includes('SERIAL')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex < 0) {
      return res.status(400).json({ success: false, message: 'No se encontró header SERIAL en el archivo' });
    }

    // 4. Obtener partes válidas de la campaña
    const partsRes = await query(`
      SELECT DISTINCT cp.id as part_id, cp.part_number FROM (
        SELECT part_id FROM mrb_campaign_parts WHERE mrb_campaign_id = $1
        UNION
        SELECT part_id FROM mrb_campaigns WHERE id = $1 AND part_id IS NOT NULL
      ) parts
      JOIN client_parts cp ON cp.id = parts.part_id
    `, [id]);
    const validParts = new Map(partsRes.rows.map(r => [r.part_number.trim().toUpperCase(), r.part_id]));

    // 5. Procesar filas de datos
    let imported = 0;
    let skipped = 0;
    const inspectorId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Obtener nombre del defecto si aplica
    let defectName = null;
    if (importType === 'DEFECT' && defectTypeId) {
      const dtRes = await query('SELECT code, name FROM defect_types WHERE id = $1', [defectTypeId]);
      if (dtRes.rows.length > 0) defectName = dtRes.rows[0].code || dtRes.rows[0].name;
    }

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue; // Skip empty rows

      const serial = String(row[0]).trim();
      const partNumber = row[1] ? String(row[1]).trim().toUpperCase() : null;

      if (!serial) continue;

      // Validar parte si se proporciona
      let partId = null;
      if (partNumber) {
        partId = validParts.get(partNumber);
        if (!partId) {
          skipped++;
          continue; // Parte no válida para esta campaña
        }
      } else if (validParts.size === 1) {
        // Si solo hay una parte en la campaña, usarla por defecto
        partId = validParts.values().next().value;
      }

      if (importType === 'OK') {
        // Insertar en mrb_ok_entries
        await query(`
          INSERT INTO mrb_ok_entries (mrb_campaign_id, shift_id, inspector_id, part_id, quantity, lot_number, serial_number, inspection_date)
          VALUES ($1, $2, $3, $4, 1, $5, $6, $7)
        `, [id, shiftId, inspectorId, partId, campaign.lot_number || null, serial, today]);
        imported++;
      } else {
        // Insertar en defect_entries_v2
        const entryNumRes = await query('SELECT generate_defect_entry_number() as entry_number');
        const entryNumber = entryNumRes.rows[0].entry_number;

        await query(`
          INSERT INTO defect_entries_v2 (
            entry_number, part_id, defect_type_id, disposition, quantity,
            lot_number, serial_number, shift_id, inspector_id, mrb_campaign_id, inspection_date
          ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10)
        `, [
          entryNumber, partId, defectTypeId, disposition || 'REWORK',
          campaign.lot_number || null, serial, shiftId, inspectorId, id, today
        ]);
        imported++;
      }
    }

    // 6. Actualizar contadores de campaña
    if (imported > 0) {
      if (importType === 'OK') {
        await query('UPDATE mrb_campaigns SET qty_ok = qty_ok + $2, qty_inspected = qty_inspected + $2 WHERE id = $1', [id, imported]);
      } else {
        await query('UPDATE mrb_campaigns SET qty_nok = qty_nok + $2, qty_inspected = qty_inspected + $2 WHERE id = $1', [id, imported]);
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      importType,
      defectName,
      disposition: importType === 'DEFECT' ? disposition : null,
      message: `Importados ${imported} registros${skipped > 0 ? `, ${skipped} omitidos (parte inválida)` : ''}`
    });

  } catch (error) {
    console.error('Error in mass import:', error);
    res.status(500).json({ success: false, message: 'Error en importación masiva: ' + error.message });
  }
});

// ============================================================================
// POST /mrb/:id/import-tally/preview - Preview antes de importar
// ============================================================================
router.post('/:id/import-tally/preview', authenticateToken, multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Archivo requerido' });
  }

  try {
    // 1. Verificar campaña activa
    const campaignRes = await query(`
      SELECT mc.*, cp.part_number
      FROM mrb_campaigns mc
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      WHERE mc.id = $1 AND mc.status IN ('ABIERTA', 'EN_PROCESO')
    `, [id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada o no activa' });
    }

    const campaign = campaignRes.rows[0];

    // 2. Obtener partes válidas de la campaña (de mrb_campaign_parts)
    const validPartsRes = await query(`
      SELECT cp.part_number FROM mrb_campaign_parts mcp
      JOIN client_parts cp ON mcp.part_id = cp.id
      WHERE mcp.mrb_campaign_id = $1
      UNION
      SELECT cp.part_number FROM mrb_campaigns mc
      JOIN client_parts cp ON mc.part_id = cp.id
      WHERE mc.id = $1 AND mc.part_id IS NOT NULL
    `, [id]);
    const validPartNumbers = validPartsRes.rows.map(r => r.part_number);

    // 3. Obtener seriales ya registrados (para detectar duplicados)
    const existingRes = await query(`
      SELECT serial_number FROM mrb_ok_entries WHERE mrb_campaign_id = $1
    `, [id]);
    const existingSerials = new Set(existingRes.rows.map(r => r.serial_number));

    // 4. Leer Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 5. Leer hoja _meta para obtener mapping de defectos
    let defectMapping = [];
    const metaSheet = workbook.Sheets['_meta'];
    if (metaSheet) {
      const metaData = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
      // Skip header rows, leer desde fila 3
      for (let i = 2; i < metaData.length; i++) {
        const row = metaData[i];
        if (row[1]) {
          defectMapping.push({
            index: row[0],
            defect_type_id: row[1],
            code: row[2],
            name: row[3]
          });
        }
      }
    }

    // 6. Procesar Hoja 2: Seriales
    const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
    if (!sheet2) {
      return res.status(400).json({ success: false, message: 'El archivo debe tener 2 hojas (Conteo Defectos y Seriales)' });
    }
    const data2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });

    // Buscar fila de header (SERIAL, PARTE, ...)
    let headerRowIndex = -1;
    let headerRow = [];
    for (let i = 0; i < data2.length; i++) {
      if (data2[i][0] === 'SERIAL' && data2[i][1] === 'PARTE') {
        headerRowIndex = i;
        headerRow = data2[i];
        break;
      }
    }

    if (headerRowIndex < 0) {
      return res.status(400).json({ success: false, message: 'No se encontró header de seriales (SERIAL, PARTE, ...)' });
    }

    // Identificar columnas: 0=SERIAL, 1=PARTE, 2..n-1=defectos, n=OK
    const okColIndex = headerRow.length - 1;
    const defectColStart = 2;
    const defectColEnd = okColIndex; // exclusive

    const preview = {
      total: 0,
      ok: 0,
      nok: 0,
      defectCounts: {}, // { defectCode: count }
      invalidParts: {},
      duplicates: [],
      entries: []
    };

    // Procesar filas de datos
    for (let i = headerRowIndex + 1; i < data2.length; i++) {
      const row = data2[i];
      const serial = String(row[0] || '').trim();
      const partNumber = String(row[1] || '').trim();

      if (!serial) continue;
      preview.total++;

      // Verificar duplicado
      if (existingSerials.has(serial)) {
        preview.duplicates.push({ serial, partNumber });
        continue;
      }

      // Verificar parte válida
      const isValidPart = validPartNumbers.length === 0 || validPartNumbers.includes(partNumber);
      if (!isValidPart && partNumber) {
        preview.invalidParts[partNumber] = (preview.invalidParts[partNumber] || 0) + 1;
        continue;
      }

      // Verificar OK
      const isOk = String(row[okColIndex] || '').toUpperCase().trim() === 'X';

      // Recoger defectos marcados
      const defectsMarked = [];
      for (let col = defectColStart; col < defectColEnd; col++) {
        const cellValue = String(row[col] || '').toUpperCase().trim();
        if (cellValue === 'X' || cellValue === 'O') {
          const defectCode = headerRow[col];
          defectsMarked.push({
            column: col,
            code: defectCode,
            defect_type_id: defectMapping[col - defectColStart]?.defect_type_id || null
          });
          preview.defectCounts[defectCode] = (preview.defectCounts[defectCode] || 0) + 1;
        }
      }

      if (isOk) {
        preview.ok++;
        preview.entries.push({ serial, partNumber, isOk: true, defects: [] });
      } else if (defectsMarked.length > 0) {
        preview.nok++;
        preview.entries.push({ serial, partNumber, isOk: false, defects: defectsMarked });
      }
      // Si no tiene OK ni defectos, se ignora
    }

    res.json({
      success: true,
      preview: {
        total: preview.total,
        validOk: preview.ok,
        validNok: preview.nok,
        validTotal: preview.ok + preview.nok,
        defectCounts: Object.entries(preview.defectCounts).map(([code, count]) => ({ code, count })),
        totalDefects: Object.values(preview.defectCounts).reduce((a, b) => a + b, 0),
        invalidParts: Object.entries(preview.invalidParts).map(([part, count]) => ({ partNumber: part, count })),
        invalidPartsTotal: Object.values(preview.invalidParts).reduce((a, b) => a + b, 0),
        duplicates: preview.duplicates,
        duplicatesCount: preview.duplicates.length,
        campaignParts: validPartNumbers,
        defectMapping: defectMapping
      }
    });

  } catch (error) {
    console.error('Error preview tally:', error);
    res.status(500).json({ success: false, message: 'Error analizando archivo' });
  }
});

// ============================================================================
// POST /mrb/:id/import-tally - Importar Tally Sheet completado
// ============================================================================
router.post('/:id/import-tally', authenticateToken, multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  const { id } = req.params;
  const { shiftId } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Archivo requerido' });
  }

  try {
    // 1. Verificar campaña activa
    const campaignRes = await query(`
      SELECT mc.*, cp.part_number, cp.id as main_part_id
      FROM mrb_campaigns mc
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      WHERE mc.id = $1 AND mc.status IN ('ABIERTA', 'EN_PROCESO')
    `, [id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaña no encontrada o no activa' });
    }

    const campaign = campaignRes.rows[0];

    // 2. Obtener partes válidas de la campaña
    const validPartsRes = await query(`
      SELECT cp.id, cp.part_number FROM mrb_campaign_parts mcp
      JOIN client_parts cp ON mcp.part_id = cp.id
      WHERE mcp.mrb_campaign_id = $1
      UNION
      SELECT cp.id, cp.part_number FROM mrb_campaigns mc
      JOIN client_parts cp ON mc.part_id = cp.id
      WHERE mc.id = $1 AND mc.part_id IS NOT NULL
    `, [id]);
    const validParts = {};
    validPartsRes.rows.forEach(r => { validParts[r.part_number] = r.id; });

    // 3. Obtener seriales ya registrados
    const existingRes = await query(`
      SELECT serial_number FROM mrb_ok_entries WHERE mrb_campaign_id = $1
      UNION
      SELECT serial_number FROM defect_entries_v2 WHERE mrb_campaign_id = $1
    `, [id]);
    const existingSerials = new Set(existingRes.rows.map(r => r.serial_number));

    // 4. Leer Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 5. Leer hoja _meta para mapping de defectos
    let defectMapping = [];
    const metaSheet = workbook.Sheets['_meta'];
    if (metaSheet) {
      const metaData = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
      for (let i = 2; i < metaData.length; i++) {
        const row = metaData[i];
        if (row[1]) {
          defectMapping.push({
            index: row[0],
            defect_type_id: parseInt(row[1]),
            code: row[2],
            name: row[3]
          });
        }
      }
    }

    // 6. Procesar Hoja 2: Seriales
    const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
    const data2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });

    // Buscar fila de header
    let headerRowIndex = -1;
    let headerRow = [];
    for (let i = 0; i < data2.length; i++) {
      if (data2[i][0] === 'SERIAL' && data2[i][1] === 'PARTE') {
        headerRowIndex = i;
        headerRow = data2[i];
        break;
      }
    }

    if (headerRowIndex < 0) {
      return res.status(400).json({ success: false, message: 'No se encontró header de seriales' });
    }

    const okColIndex = headerRow.length - 1;
    const defectColStart = 2;
    const defectColEnd = okColIndex;

    const results = {
      ok: [],
      nok: [],
      defectEntries: [],
      skipped: { duplicates: 0, invalidParts: 0 }
    };

    // Generar entry_number base
    const entryPrefix = `MRB${id}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    let entryCounter = 1;

    // Procesar filas
    for (let i = headerRowIndex + 1; i < data2.length; i++) {
      const row = data2[i];
      const serial = String(row[0] || '').trim();
      const partNumber = String(row[1] || '').trim();

      if (!serial) continue;

      // Skip duplicados
      if (existingSerials.has(serial)) {
        results.skipped.duplicates++;
        continue;
      }

      // Skip partes inválidas
      const partId = validParts[partNumber] || campaign.main_part_id;
      if (!partId) {
        results.skipped.invalidParts++;
        continue;
      }

      // Verificar OK
      const isOk = String(row[okColIndex] || '').toUpperCase().trim() === 'X';

      // Recoger defectos marcados
      const defectsMarked = [];
      for (let col = defectColStart; col < defectColEnd; col++) {
        const cellValue = String(row[col] || '').toUpperCase().trim();
        if (cellValue === 'X' || cellValue === 'O') {
          const mapping = defectMapping[col - defectColStart];
          if (mapping && mapping.defect_type_id) {
            defectsMarked.push({
              defect_type_id: mapping.defect_type_id,
              code: mapping.code
            });
          }
        }
      }

      if (isOk && defectsMarked.length === 0) {
        results.ok.push({ serial, partNumber, partId });
        existingSerials.add(serial);
      } else if (defectsMarked.length > 0) {
        results.nok.push({ serial, partNumber, partId });
        existingSerials.add(serial);
        // Crear entrada de defecto por cada defecto marcado
        for (const defect of defectsMarked) {
          results.defectEntries.push({
            serial,
            partId,
            defect_type_id: defect.defect_type_id,
            entry_number: `${entryPrefix}-${String(entryCounter++).padStart(4, '0')}`
          });
        }
      }
    }

    // 7. Insertar OK entries
    for (const item of results.ok) {
      await query(`
        INSERT INTO mrb_ok_entries (mrb_campaign_id, part_id, shift_id, inspector_id, quantity, serial_number, inspection_date)
        VALUES ($1, $2, $3, $4, 1, $5, CURRENT_DATE)
        ON CONFLICT DO NOTHING
      `, [id, item.partId, shiftId || null, req.user.id, item.serial]);
    }

    // 8. Insertar defect_entries_v2 para cada defecto
    for (const entry of results.defectEntries) {
      await query(`
        INSERT INTO defect_entries_v2 (
          entry_number, client_id, project_id, part_id, defect_type_id,
          serial_number, mrb_campaign_id, quantity, captured_by_user_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, 'open')
        ON CONFLICT DO NOTHING
      `, [
        entry.entry_number,
        campaign.client_id,
        campaign.project_id,
        entry.partId,
        entry.defect_type_id,
        entry.serial,
        id,
        req.user.id
      ]);
    }

    // 9. Actualizar contadores de campaña
    const totalOk = results.ok.length;
    const totalNok = results.nok.length;
    const totalInspected = totalOk + totalNok;

    await query(`
      UPDATE mrb_campaigns SET
        qty_inspected = COALESCE(qty_inspected, 0) + $1,
        qty_ok = COALESCE(qty_ok, 0) + $2,
        qty_nok = COALESCE(qty_nok, 0) + $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [totalInspected, totalOk, totalNok, id]);

    res.json({
      success: true,
      message: 'Tally importado correctamente',
      summary: {
        totalOk,
        totalNok,
        totalDefects: results.defectEntries.length,
        skipped: results.skipped
      }
    });

  } catch (error) {
    console.error('Error importing tally:', error);
    res.status(500).json({ success: false, message: 'Error importando tally: ' + error.message });
  }
});

module.exports = router;
