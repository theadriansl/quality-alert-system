// ============================================================================
// LOCATION CODES ENDPOINTS - Trazabilidad física Hospital
// ============================================================================
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { socketEvents } = require('../config/socket');

// GET /location-codes - Listar todos los códigos de ubicación
router.get('/', authenticateToken, async (req, res) => {
  const { type, stationId, activeOnly } = req.query;

  try {
    let sql = `
      SELECT
        lc.*,
        s.name as station_name,
        s.station_type,
        (SELECT COUNT(*) FROM defect_entries_v2 de
         WHERE de.current_location_id = lc.id
         AND de.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')) as wip_count
      FROM location_codes lc
      LEFT JOIN inspection_stations s ON lc.station_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (type) {
      sql += ` AND lc.location_type = $${paramIndex++}`;
      params.push(type);
    }

    if (stationId) {
      sql += ` AND lc.station_id = $${paramIndex++}`;
      params.push(stationId);
    }

    if (activeOnly === 'true') {
      sql += ' AND lc.is_active = true';
    }

    sql += ' ORDER BY lc.location_type, lc.code';

    const result = await query(sql, params);

    res.json({
      success: true,
      locations: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        stationId: row.station_id,
        stationName: row.station_name,
        stationType: row.station_type,
        locationType: row.location_type,
        description: row.description,
        isActive: row.is_active,
        wipCount: parseInt(row.wip_count) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching location codes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /location-codes/wip - WIP por ubicación (dashboard)
router.get('/wip', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_hospital_wip_by_location');

    res.json({
      success: true,
      wip: result.rows.map(row => ({
        locationId: row.location_id,
        locationCode: row.location_code,
        locationDescription: row.location_description,
        locationType: row.location_type,
        stationId: row.station_id,
        stationName: row.station_name,
        wipCount: parseInt(row.wip_count) || 0,
        pendingRepair: parseInt(row.pending_repair) || 0,
        inRepair: parseInt(row.in_repair) || 0,
        pendingQa: parseInt(row.pending_qa) || 0,
        inValidation: parseInt(row.in_validation) || 0,
        quarantine: parseInt(row.quarantine) || 0,
        avgHoursWaiting: parseFloat(row.avg_hours_waiting) || 0,
        oldestEntry: row.oldest_entry,
        newestEntry: row.newest_entry,
        agingGreen: parseInt(row.aging_green) || 0,
        agingYellow: parseInt(row.aging_yellow) || 0,
        agingRed: parseInt(row.aging_red) || 0
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching WIP by location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /location-codes/lookup/:code - Buscar ubicación por código (escaneo)
router.get('/lookup/:code', authenticateToken, async (req, res) => {
  const { code } = req.params;

  try {
    const result = await query(`
      SELECT
        lc.*,
        s.name as station_name,
        s.station_type
      FROM location_codes lc
      LEFT JOIN inspection_stations s ON lc.station_id = s.id
      WHERE UPPER(lc.code) = UPPER($1) AND lc.is_active = true
    `, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Código de ubicación no encontrado'
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      location: {
        id: row.id,
        code: row.code,
        stationId: row.station_id,
        stationName: row.station_name,
        stationType: row.station_type,
        locationType: row.location_type,
        description: row.description
      }
    });
  } catch (error) {
    console.error('❌ Error looking up location code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /location-codes - Crear código de ubicación
router.post('/', authenticateToken, async (req, res) => {
  const { code, stationId, locationType, description } = req.body;

  if (!code || !locationType) {
    return res.status(400).json({
      success: false,
      error: 'code y locationType son requeridos'
    });
  }

  try {
    // Verificar código único
    const existing = await query(
      'SELECT id FROM location_codes WHERE UPPER(code) = UPPER($1)',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'El código ya existe'
      });
    }

    const result = await query(`
      INSERT INTO location_codes (code, station_id, location_type, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [code.toUpperCase(), stationId || null, locationType, description || null]);

    const row = result.rows[0];
    console.log('✅ Location code created:', row.code);

    res.status(201).json({
      success: true,
      location: {
        id: row.id,
        code: row.code,
        stationId: row.station_id,
        locationType: row.location_type,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating location code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /location-codes/:id - Actualizar código de ubicación
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, stationId, locationType, description, isActive } = req.body;

  try {
    // Verificar que existe
    const existing = await query('SELECT * FROM location_codes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });
    }

    // Si cambia el código, verificar que no existe otro con ese código
    if (code && code.toUpperCase() !== existing.rows[0].code) {
      const duplicate = await query(
        'SELECT id FROM location_codes WHERE UPPER(code) = UPPER($1) AND id != $2',
        [code, id]
      );
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'El código ya existe' });
      }
    }

    const result = await query(`
      UPDATE location_codes SET
        code = COALESCE($1, code),
        station_id = $2,
        location_type = COALESCE($3, location_type),
        description = $4,
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      code ? code.toUpperCase() : null,
      stationId,
      locationType,
      description,
      isActive,
      id
    ]);

    const row = result.rows[0];
    console.log('✅ Location code updated:', row.code);

    res.json({
      success: true,
      location: {
        id: row.id,
        code: row.code,
        stationId: row.station_id,
        locationType: row.location_type,
        description: row.description,
        isActive: row.is_active,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error updating location code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /location-codes/:id - Eliminar código de ubicación
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si hay defectos asignados
    const inUse = await query(
      'SELECT COUNT(*) as count FROM defect_entries_v2 WHERE current_location_id = $1',
      [id]
    );

    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar: ${inUse.rows[0].count} defectos asignados a esta ubicación`
      });
    }

    await query('DELETE FROM location_codes WHERE id = $1', [id]);
    console.log('✅ Location code deleted:', id);

    res.json({ success: true, message: 'Ubicación eliminada' });
  } catch (error) {
    console.error('❌ Error deleting location code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /location-codes/assign - Asignar seriales a ubicación (escaneo batch)
router.post('/assign', authenticateToken, async (req, res) => {
  const { locationCode, serials } = req.body;

  if (!locationCode || !serials || !Array.isArray(serials) || serials.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'locationCode y serials[] son requeridos'
    });
  }

  try {
    // Buscar ubicación
    const location = await query(`
      SELECT id, code, location_type, station_id
      FROM location_codes
      WHERE UPPER(code) = UPPER($1) AND is_active = true
    `, [locationCode]);

    if (location.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Código de ubicación no encontrado'
      });
    }

    const loc = location.rows[0];
    const results = { assigned: [], notFound: [], errors: [] };

    for (const serial of serials) {
      try {
        // Buscar TODOS los defectos activos de este serial (una pieza = una ubicación)
        // Incluye NULL para defectos recién capturados y excluye los ya cerrados
        const defects = await query(`
          SELECT id, serial_number, repair_status
          FROM defect_entries_v2
          WHERE serial_number = $1
            AND (
              repair_status IS NULL
              OR repair_status IN ('OPEN', 'PENDING_REPAIR', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'PENDING_RELEASE')
            )
          ORDER BY captured_at DESC
        `, [serial.trim()]);

        if (defects.rows.length === 0) {
          results.notFound.push(serial);
          continue;
        }

        // Construir campos de actualización según tipo de ubicación
        let updateFields = `
          current_location_id = $1,
          location_assigned_at = CURRENT_TIMESTAMP
        `;

        // Si es intake a hospital (primera vez)
        if (loc.location_type === 'REPAIR') {
          updateFields += `,
            hospital_intake_at = COALESCE(hospital_intake_at, CURRENT_TIMESTAMP),
            intake_station_id = COALESCE(intake_station_id, $2)
          `;
        }

        // Si es entrega a liberación
        if (loc.location_type === 'RELEASE') {
          updateFields += `,
            received_at_release_station = COALESCE(received_at_release_station, CURRENT_TIMESTAMP)
          `;
        }

        // Actualizar TODOS los defectos de este serial (la pieza física es una sola)
        const defectIds = defects.rows.map(d => d.id);
        await query(`
          UPDATE defect_entries_v2 SET ${updateFields}
          WHERE id = ANY($3)
        `, [loc.id, loc.station_id, defectIds]);

        results.assigned.push({
          serial: serial,
          defectCount: defects.rows.length,
          defectIds: defectIds,
          status: defects.rows[0].repair_status
        });

      } catch (err) {
        results.errors.push({ serial, error: err.message });
      }
    }

    console.log(`✅ Location assign: ${results.assigned.length} assigned, ${results.notFound.length} not found`);

    // Emitir evento WebSocket para actualización en tiempo real
    if (results.assigned.length > 0) {
      console.log('🔌 Emitting hospital:location-assigned event');
      socketEvents.broadcast('hospital:location-assigned', {
        locationId: loc.id,
        locationCode: loc.code,
        locationType: loc.location_type,
        assignedCount: results.assigned.length,
        assigned: results.assigned,
        assignedBy: req.user.id
      });
    }

    res.json({
      success: true,
      location: {
        id: loc.id,
        code: loc.code,
        type: loc.location_type
      },
      results
    });
  } catch (error) {
    console.error('❌ Error assigning to location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /location-codes/:id/defects - Listar defectos en una ubicación
router.get('/:id/defects', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT
        de.id,
        de.serial_number,
        de.repair_status,
        de.location_assigned_at,
        cp.part_number,
        cp.part_name,
        dt.name as defect_type,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - de.location_assigned_at))/3600 as hours_waiting
      FROM defect_entries_v2 de
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      WHERE de.current_location_id = $1
        AND de.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')
      ORDER BY de.location_assigned_at ASC
    `, [id]);

    res.json({
      success: true,
      defects: result.rows.map(row => ({
        id: row.id,
        serialNumber: row.serial_number,
        repairStatus: row.repair_status,
        locationAssignedAt: row.location_assigned_at,
        partNumber: row.part_number,
        partName: row.part_name,
        defectType: row.defect_type,
        hoursWaiting: parseFloat(row.hours_waiting) || 0
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching defects by location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
