const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// SPEC INSPECTION - Captura de inspección de especificaciones
// ============================================================================

// POST - Guardar resultado de una spec
router.post('/entries', authenticateToken, async (req, res) => {
  const {
    unitId,
    serialNumber,
    lotNumber,
    clientId,
    projectId,
    partId,
    specId,
    stationId,
    shiftId,
    stageId,
    departmentId,
    result,          // OK | NOK | CONDITIONAL | NA
    measuredValue,
    qualitativeValue,
    dispositionId,
    dispositionNotes,
    photoEvidence,
    notes
  } = req.body;

  if (!clientId || !partId || !specId || !result) {
    return res.status(400).json({
      success: false,
      message: 'clientId, partId, specId y result son requeridos'
    });
  }

  try {
    // Generate entry number
    const entryNumberResult = await query('SELECT generate_spec_entry_number() as entry_number');
    const entryNumber = entryNumberResult.rows[0].entry_number;

    // Get spec info for deviation calculation
    let deviation = null;
    let withinTolerance = null;

    if (measuredValue !== null && measuredValue !== undefined) {
      const specInfo = await query(
        'SELECT nominal_value, lower_limit, upper_limit FROM part_specifications WHERE id = $1',
        [specId]
      );

      if (specInfo.rows.length > 0 && specInfo.rows[0].nominal_value) {
        const spec = specInfo.rows[0];
        deviation = measuredValue - parseFloat(spec.nominal_value);

        if (spec.lower_limit !== null && spec.upper_limit !== null) {
          withinTolerance = measuredValue >= parseFloat(spec.lower_limit) &&
                           measuredValue <= parseFloat(spec.upper_limit);
        }
      }
    }

    // Insert entry
    const insertResult = await query(`
      INSERT INTO spec_inspection_entries (
        entry_number, unit_id, lot_number, serial_number,
        client_id, project_id, part_id, spec_id,
        station_id, shift_id, stage_id, department_id,
        inspector_id, result, measured_value, deviation, within_tolerance,
        qualitative_value, disposition_id, disposition_notes,
        photo_evidence, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *
    `, [
      entryNumber, unitId, lotNumber, serialNumber,
      clientId, projectId, partId, specId,
      stationId, shiftId, stageId, departmentId,
      req.user.id, result, measuredValue, deviation, withinTolerance,
      qualitativeValue, dispositionId, dispositionNotes,
      photoEvidence, notes
    ]);

    const entry = insertResult.rows[0];

    // If we have a unit, update counters and log history
    if (unitId) {
      // Update unit counters
      if (result === 'OK') {
        await query(
          'UPDATE unit_registry SET specs_ok = specs_ok + 1, last_inspection_at = CURRENT_TIMESTAMP WHERE id = $1',
          [unitId]
        );
      } else if (result === 'NOK') {
        await query(
          'UPDATE unit_registry SET specs_nok = specs_nok + 1, last_inspection_at = CURRENT_TIMESTAMP WHERE id = $1',
          [unitId]
        );
      }

      // Log to unit history
      const specName = await query('SELECT spec_name, spec_number FROM part_specifications WHERE id = $1', [specId]);
      const specInfo = specName.rows[0] || { spec_number: specId, spec_name: '' };

      await query(`
        INSERT INTO unit_history (
          unit_id, event_type, source_table, source_id, description,
          station_id, shift_id, performed_by, metadata
        ) VALUES ($1, $2, 'spec_inspection_entries', $3, $4, $5, $6, $7, $8)
      `, [
        unitId,
        result === 'OK' ? 'SPEC_OK' : 'SPEC_NOK',
        entry.id,
        `Spec ${specInfo.spec_number}: ${result}${measuredValue ? ' (Medido: ' + measuredValue + ')' : ''}`,
        stationId,
        shiftId,
        req.user.id,
        JSON.stringify({ specId, result, measuredValue, deviation })
      ]);
    }

    res.json({
      success: true,
      entry: transformToCamelCase(entry),
      message: `Inspección ${entryNumber} registrada`
    });
  } catch (error) {
    console.error('Error saving spec inspection:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Guardar múltiples specs de una vez (bulk)
router.post('/bulk', authenticateToken, async (req, res) => {
  const {
    unitId,
    serialNumber,
    lotNumber,
    clientId,
    projectId,
    partId,
    stationId,
    shiftId,
    entries  // Array of { specId, result, measuredValue?, qualitativeValue?, notes? }
  } = req.body;

  if (!clientId || !partId || !entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'clientId, partId y entries[] son requeridos'
    });
  }

  try {
    const savedEntries = [];
    let okCount = 0;
    let nokCount = 0;

    for (const item of entries) {
      // Generate entry number
      const entryNumberResult = await query('SELECT generate_spec_entry_number() as entry_number');
      const entryNumber = entryNumberResult.rows[0].entry_number;

      // Calculate deviation if needed
      let deviation = null;
      let withinTolerance = null;

      if (item.measuredValue !== null && item.measuredValue !== undefined) {
        const specInfo = await query(
          'SELECT nominal_value, lower_limit, upper_limit FROM part_specifications WHERE id = $1',
          [item.specId]
        );

        if (specInfo.rows.length > 0 && specInfo.rows[0].nominal_value) {
          const spec = specInfo.rows[0];
          deviation = item.measuredValue - parseFloat(spec.nominal_value);

          if (spec.lower_limit !== null && spec.upper_limit !== null) {
            withinTolerance = item.measuredValue >= parseFloat(spec.lower_limit) &&
                             item.measuredValue <= parseFloat(spec.upper_limit);
          }
        }
      }

      // Insert entry
      const insertResult = await query(`
        INSERT INTO spec_inspection_entries (
          entry_number, unit_id, lot_number, serial_number,
          client_id, project_id, part_id, spec_id,
          station_id, shift_id, inspector_id,
          result, measured_value, deviation, within_tolerance,
          qualitative_value, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING id
      `, [
        entryNumber, unitId, lotNumber, serialNumber,
        clientId, projectId, partId, item.specId,
        stationId, shiftId, req.user.id,
        item.result, item.measuredValue, deviation, withinTolerance,
        item.qualitativeValue, item.notes
      ]);

      savedEntries.push({
        id: insertResult.rows[0].id,
        entryNumber,
        specId: item.specId,
        result: item.result
      });

      if (item.result === 'OK') okCount++;
      else if (item.result === 'NOK') nokCount++;
    }

    // Update unit counters if we have a unit
    if (unitId) {
      await query(`
        UPDATE unit_registry SET
          specs_ok = specs_ok + $1,
          specs_nok = specs_nok + $2,
          total_inspections = total_inspections + 1,
          last_inspection_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [okCount, nokCount, unitId]);

      // Log summary to history
      await query(`
        INSERT INTO unit_history (
          unit_id, event_type, description, station_id, shift_id, performed_by, metadata
        ) VALUES ($1, 'STATION_COMPLETE', $2, $3, $4, $5, $6)
      `, [
        unitId,
        `Inspección completada: ${okCount} OK, ${nokCount} NOK de ${entries.length} specs`,
        stationId,
        shiftId,
        req.user.id,
        JSON.stringify({ okCount, nokCount, total: entries.length, entries: savedEntries })
      ]);
    }

    res.json({
      success: true,
      entries: savedEntries,
      summary: { ok: okCount, nok: nokCount, total: entries.length },
      message: `${entries.length} inspecciones registradas`
    });
  } catch (error) {
    console.error('Error saving bulk spec inspections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Consultar capturas con filtros
router.get('/entries', authenticateToken, async (req, res) => {
  const {
    unitId, serialNumber, lotNumber, clientId, partId, specId,
    stationId, result, dateFrom, dateTo, limit = 50, offset = 0
  } = req.query;

  try {
    let sql = `
      SELECT sie.*,
             ps.spec_number, ps.spec_name, ps.spec_type,
             ps.lower_limit, ps.nominal_value, ps.upper_limit,
             mu.symbol as unit_symbol,
             cp.part_number, cp.part_name,
             c.name as client_name,
             s.name as station_name,
             u.first_name || ' ' || u.last_name as inspector_name
      FROM spec_inspection_entries sie
      JOIN part_specifications ps ON sie.spec_id = ps.id
      LEFT JOIN measurement_units mu ON ps.unit_id = mu.id
      JOIN client_parts cp ON sie.part_id = cp.id
      JOIN clients c ON sie.client_id = c.id
      LEFT JOIN inspection_stations s ON sie.station_id = s.id
      JOIN users u ON sie.inspector_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (unitId) {
      params.push(unitId);
      sql += ` AND sie.unit_id = $${params.length}`;
    }
    if (serialNumber) {
      params.push(`%${serialNumber}%`);
      sql += ` AND sie.serial_number ILIKE $${params.length}`;
    }
    if (lotNumber) {
      params.push(`%${lotNumber}%`);
      sql += ` AND sie.lot_number ILIKE $${params.length}`;
    }
    if (clientId) {
      params.push(clientId);
      sql += ` AND sie.client_id = $${params.length}`;
    }
    if (partId) {
      params.push(partId);
      sql += ` AND sie.part_id = $${params.length}`;
    }
    if (specId) {
      params.push(specId);
      sql += ` AND sie.spec_id = $${params.length}`;
    }
    if (stationId) {
      params.push(stationId);
      sql += ` AND sie.station_id = $${params.length}`;
    }
    if (result) {
      params.push(result);
      sql += ` AND sie.result = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND sie.inspection_date >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND sie.inspection_date <= $${params.length}`;
    }

    // Count
    const countResult = await query(
      sql.replace(/SELECT sie\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM'),
      params
    );

    // Paginate
    sql += ` ORDER BY sie.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result2 = await query(sql, params);

    res.json({
      success: true,
      entries: transformToCamelCase(result2.rows),
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching spec entries:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Estadísticas de specs por resultado
router.get('/stats', authenticateToken, async (req, res) => {
  const { clientId, partId, specId, stationId, dateFrom, dateTo } = req.query;

  try {
    let sql = `
      SELECT
        result,
        COUNT(*) as count,
        COUNT(DISTINCT spec_id) as specs_count,
        COUNT(DISTINCT unit_id) as units_count
      FROM spec_inspection_entries
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
    if (specId) {
      params.push(specId);
      sql += ` AND spec_id = $${params.length}`;
    }
    if (stationId) {
      params.push(stationId);
      sql += ` AND station_id = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND inspection_date >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND inspection_date <= $${params.length}`;
    }

    sql += ' GROUP BY result ORDER BY result';

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

// GET - Inspecciones de estación para una unidad
router.get('/station-inspections/:unitId', authenticateToken, async (req, res) => {
  const { unitId } = req.params;

  try {
    const result = await query(`
      SELECT usi.*,
             s.name as station_name, s.code as station_code,
             sh.name as shift_name,
             u.first_name || ' ' || u.last_name as inspector_name
      FROM unit_station_inspections usi
      JOIN inspection_stations s ON usi.station_id = s.id
      LEFT JOIN inspection_shifts sh ON usi.shift_id = sh.id
      JOIN users u ON usi.inspector_id = u.id
      WHERE usi.unit_id = $1
      ORDER BY usi.started_at DESC
    `, [unitId]);

    res.json({
      success: true,
      inspections: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching station inspections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
