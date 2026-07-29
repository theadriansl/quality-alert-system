const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// UNIT REGISTRY - Registro y consulta de seriales/lotes
// ============================================================================

// POST - Registrar nueva unidad (serial/lote)
router.post('/', authenticateToken, async (req, res) => {
  const {
    serialNumber,
    lotNumber,
    clientId,
    partId,
    projectId
  } = req.body;

  if (!serialNumber || !clientId || !partId) {
    return res.status(400).json({
      success: false,
      message: 'serialNumber, clientId y partId son requeridos'
    });
  }

  try {
    // Check if already exists - get latest cycle
    const existing = await query(
      `SELECT id, current_status, is_archived, cycle_number
       FROM unit_registry
       WHERE serial_number = $1
       ORDER BY cycle_number DESC
       LIMIT 1`,
      [serialNumber]
    );

    if (existing.rows.length > 0) {
      const existingUnit = existing.rows[0];

      // Si está archivado, es un re-ingreso - crear nuevo ciclo
      if (existingUnit.is_archived) {
        const returnReason = req.body.returnReason || 'RMA';
        const returnNotes = req.body.returnNotes || null;

        // Usar función de BD para crear nuevo ciclo
        const newCycleResult = await query(
          'SELECT * FROM create_new_cycle($1, $2, $3, $4, $5)',
          [serialNumber, partId, returnReason, returnNotes, req.user?.id]
        );

        const newCycle = newCycleResult.rows[0];

        // Obtener el unit completo
        const newUnit = await query('SELECT * FROM unit_registry WHERE id = $1', [newCycle.new_unit_id]);

        return res.json({
          success: true,
          unit: transformToCamelCase(newUnit.rows[0]),
          message: `Nuevo ciclo ${newCycle.new_cycle_number} creado (${returnReason})`,
          isNew: true,
          isReentry: true,
          previousCycleId: newCycle.previous_cycle_id,
          cycleNumber: newCycle.new_cycle_number
        });
      }

      // Si no está archivado, retornar el existente
      return res.json({
        success: true,
        unit: transformToCamelCase(existingUnit),
        message: 'Unidad ya registrada',
        isNew: false
      });
    }

    // Buscar si existe en production_entries para vincular
    let productionEntryId = null;
    let source = 'MANUAL';
    try {
      const prodEntry = await query(`
        SELECT id FROM production_entries
        WHERE serial_number = $1 AND part_id = $2 AND client_id = $3
        LIMIT 1
      `, [serialNumber, partId, clientId]);
      if (prodEntry.rows.length > 0) {
        productionEntryId = prodEntry.rows[0].id;
        source = 'PRODUCTION';
      }
    } catch (prodErr) {
      console.log('Production entries check skipped:', prodErr.message);
    }

    // Create new unit (cycle 1)
    const result = await query(`
      INSERT INTO unit_registry (
        serial_number, lot_number, client_id, part_id, project_id,
        current_status, created_by, source, production_entry_id, cycle_number
      ) VALUES ($1, $2, $3, $4, $5, 'REGISTERED', $6, $7, $8, 1)
      RETURNING *
    `, [serialNumber, lotNumber, clientId, partId, projectId, req.user.id, source, productionEntryId]);

    const unit = result.rows[0];

    // Log to history
    await query(`
      INSERT INTO unit_history (
        unit_id, event_type, description, new_status, performed_by
      ) VALUES ($1, 'REGISTERED', $2, 'REGISTERED', $3)
    `, [unit.id, `Unidad registrada: ${serialNumber} (${source})`, req.user.id]);

    // Actualizar production_entries con unit_id si existe link
    if (productionEntryId) {
      await query('UPDATE production_entries SET unit_id = $1 WHERE id = $2', [unit.id, productionEntryId]);
    }

    res.json({
      success: true,
      unit: transformToCamelCase(unit),
      message: 'Unidad registrada',
      isNew: true,
      productionLinked: !!productionEntryId,
      source
    });
  } catch (error) {
    console.error('Error registering unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /capture-ok - Registrar pieza OK (sin specs, crea unit_registry y vincula production)
router.post('/capture-ok', authenticateToken, async (req, res) => {
  const { serialNumber, clientId, partId, projectId, stationId, shiftId } = req.body;

  if (!serialNumber || !clientId || !partId) {
    return res.status(400).json({
      success: false,
      message: 'serialNumber, clientId y partId son requeridos'
    });
  }

  try {
    // Verificar si ya existe unit_registry
    const existing = await query(
      'SELECT id, current_status FROM unit_registry WHERE client_id = $1 AND part_id = $2 AND serial_number = $3',
      [clientId, partId, serialNumber.trim()]
    );

    let unitId;
    let isNew = false;

    if (existing.rows.length > 0) {
      unitId = existing.rows[0].id;
      // Actualizar status a OK si no está SCRAPPED
      if (existing.rows[0].current_status !== 'SCRAPPED') {
        await query(
          'UPDATE unit_registry SET current_status = $1, total_inspections = total_inspections + 1, last_inspection_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['OK', unitId]
        );
      }
    } else {
      // Buscar si existe en production_entries para vincular
      const prodEntry = await query(
        'SELECT id FROM production_entries WHERE serial_number = $1 AND part_id = $2 LIMIT 1',
        [serialNumber.trim(), partId]
      );
      const productionEntryId = prodEntry.rows.length > 0 ? prodEntry.rows[0].id : null;
      const source = productionEntryId ? 'PRODUCTION' : 'INSPECTION';

      // Crear unit_registry (cycle 1)
      const newUnit = await query(`
        INSERT INTO unit_registry (
          serial_number, client_id, part_id, project_id,
          current_status, total_inspections, created_by, source, production_entry_id, cycle_number
        ) VALUES ($1, $2, $3, $4, 'OK', 1, $5, $6, $7, 1)
        RETURNING id
      `, [serialNumber.trim(), clientId, partId, projectId, req.user.id, source, productionEntryId]);

      unitId = newUnit.rows[0].id;
      isNew = true;

      // Actualizar production_entries con unit_id si existe link
      if (productionEntryId) {
        await query('UPDATE production_entries SET unit_id = $1 WHERE id = $2', [unitId, productionEntryId]);
      }
    }

    // Registrar en unit_history
    await query(`
      INSERT INTO unit_history (unit_id, event_type, description, station_id, shift_id, performed_by)
      VALUES ($1, 'INSPECTION_OK', 'Pieza marcada como OK', $2, $3, $4)
    `, [unitId, stationId || null, shiftId || null, req.user.id]);

    res.json({
      success: true,
      unitId,
      isNew,
      message: 'Pieza OK registrada'
    });
  } catch (error) {
    console.error('Error en capture-ok:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Buscar unidad por serial o entry number
router.get('/by-serial/:serialNumber', authenticateToken, async (req, res) => {
  const { serialNumber } = req.params;
  const { clientId, partId } = req.query;

  try {
    let searchSerial = serialNumber;

    // Si parece un entry number (DEF-XXXX), buscar el serial del defecto
    if (serialNumber.toUpperCase().startsWith('DEF-')) {
      const defectResult = await query(
        `SELECT serial_number FROM defect_entries_v2 WHERE UPPER(entry_number) = $1 LIMIT 1`,
        [serialNumber.toUpperCase()]
      );
      if (defectResult.rows.length > 0 && defectResult.rows[0].serial_number) {
        searchSerial = defectResult.rows[0].serial_number;
      }
    }

    let sql = `
      SELECT ur.*,
             c.name as client_name,
             cp.part_number, cp.part_name,
             p.project_number, p.project_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM unit_registry ur
      JOIN clients c ON ur.client_id = c.id
      JOIN client_parts cp ON ur.part_id = cp.id
      LEFT JOIN projects p ON ur.project_id = p.id
      LEFT JOIN users u ON ur.created_by = u.id
      WHERE ur.serial_number = $1
    `;
    const params = [searchSerial];

    if (clientId) {
      params.push(clientId);
      sql += ` AND ur.client_id = $${params.length}`;
    }
    if (partId) {
      params.push(partId);
      sql += ` AND ur.part_id = $${params.length}`;
    }

    sql += ' ORDER BY ur.registered_at DESC LIMIT 1';

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Unidad no encontrada' });
    }

    res.json({
      success: true,
      unit: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Buscar unidades con filtros
router.get('/search', authenticateToken, async (req, res) => {
  const {
    serialNumber, lotNumber, clientId, partId,
    status, dateFrom, dateTo, limit = 50, offset = 0
  } = req.query;

  try {
    let sql = `
      SELECT ur.*,
             c.name as client_name,
             cp.part_number, cp.part_name
      FROM unit_registry ur
      JOIN clients c ON ur.client_id = c.id
      JOIN client_parts cp ON ur.part_id = cp.id
      WHERE 1=1
    `;
    const params = [];

    if (serialNumber) {
      params.push(`%${serialNumber}%`);
      sql += ` AND ur.serial_number ILIKE $${params.length}`;
    }
    if (lotNumber) {
      params.push(`%${lotNumber}%`);
      sql += ` AND ur.lot_number ILIKE $${params.length}`;
    }
    if (clientId) {
      params.push(clientId);
      sql += ` AND ur.client_id = $${params.length}`;
    }
    if (partId) {
      params.push(partId);
      sql += ` AND ur.part_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND ur.current_status = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND ur.registered_at >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND ur.registered_at <= $${params.length}`;
    }

    // Count total
    const countResult = await query(
      sql.replace('SELECT ur.*, c.name as client_name, cp.part_number, cp.part_name', 'SELECT COUNT(*) as total'),
      params
    );

    // Add pagination
    sql += ` ORDER BY ur.registered_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      success: true,
      units: transformToCamelCase(result.rows),
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error searching units:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener unidad por ID con detalles
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT ur.*,
             c.name as client_name,
             cp.part_number, cp.part_name, cp.capture_display_name,
             p.project_number, p.project_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM unit_registry ur
      JOIN clients c ON ur.client_id = c.id
      JOIN client_parts cp ON ur.part_id = cp.id
      LEFT JOIN projects p ON ur.project_id = p.id
      LEFT JOIN users u ON ur.created_by = u.id
      WHERE ur.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Unidad no encontrada' });
    }

    res.json({
      success: true,
      unit: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Cambiar estado de unidad
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, notes, stationId, shiftId } = req.body;

  const validStatuses = [
    'REGISTERED', 'INSPECTING', 'OK', 'DEFECTIVE', 'IN_REPAIR',
    'REPAIRED', 'PENDING_REINSPECTION', 'RELEASED', 'SCRAPPED', 'SHIPPED'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}`
    });
  }

  try {
    // Get current status
    const current = await query('SELECT current_status FROM unit_registry WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Unidad no encontrada' });
    }
    const oldStatus = current.rows[0].current_status;

    // Update status
    let updateSql = 'UPDATE unit_registry SET current_status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status, id];

    // Set special timestamps based on status
    if (status === 'RELEASED') {
      updateSql = updateSql.replace('updated_at', 'released_at = CURRENT_TIMESTAMP, updated_at');
    } else if (status === 'SHIPPED') {
      updateSql = updateSql.replace('updated_at', 'shipped_at = CURRENT_TIMESTAMP, updated_at');
    } else if (status === 'INSPECTING' && !current.rows[0].first_inspection_at) {
      updateSql = updateSql.replace('updated_at', 'first_inspection_at = CURRENT_TIMESTAMP, updated_at');
    }

    updateSql += ' WHERE id = $2 RETURNING *';
    const result = await query(updateSql, params);

    // Log to history
    await query(`
      INSERT INTO unit_history (
        unit_id, event_type, description, old_status, new_status,
        station_id, shift_id, performed_by, metadata
      ) VALUES ($1, 'STATUS_CHANGE', $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      `Estado cambiado: ${oldStatus} → ${status}${notes ? '. ' + notes : ''}`,
      oldStatus,
      status,
      stationId || null,
      shiftId || null,
      req.user.id,
      notes ? JSON.stringify({ notes }) : null
    ]);

    res.json({
      success: true,
      unit: transformToCamelCase(result.rows[0]),
      message: `Estado actualizado a ${status}`
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Historial de unidad
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT uh.*,
             s.name as station_name, s.code as station_code,
             sh.name as shift_name,
             u.first_name || ' ' || u.last_name as performed_by_name
      FROM unit_history uh
      LEFT JOIN inspection_stations s ON uh.station_id = s.id
      LEFT JOIN inspection_shifts sh ON uh.shift_id = sh.id
      LEFT JOIN users u ON uh.performed_by = u.id
      WHERE uh.unit_id = $1
      ORDER BY uh.event_at DESC
    `, [id]);

    res.json({
      success: true,
      history: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Agregar nota al historial
router.post('/:id/notes', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { note, stationId } = req.body;

  if (!note) {
    return res.status(400).json({ success: false, message: 'Nota requerida' });
  }

  try {
    await query(`
      INSERT INTO unit_history (
        unit_id, event_type, description, station_id, performed_by
      ) VALUES ($1, 'NOTE', $2, $3, $4)
    `, [id, note, stationId || null, req.user.id]);

    res.json({ success: true, message: 'Nota agregada' });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Estadísticas por status
router.get('/stats/by-status', authenticateToken, async (req, res) => {
  const { clientId, partId, dateFrom, dateTo } = req.query;

  try {
    let sql = `
      SELECT current_status, COUNT(*) as count
      FROM unit_registry
      WHERE 1=1
    `;
    const params = [];

    if (clientId) {
      params.push(clientId);
      sql += ` AND client_id = $${params.length}`;
    }
    if (partId) {
      params.push(partId);
      sql += ` AND part_id = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND registered_at >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND registered_at <= $${params.length}`;
    }

    sql += ' GROUP BY current_status ORDER BY current_status';

    const result = await query(sql, params);

    res.json({
      success: true,
      stats: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
