/**
 * Release OK Endpoints
 * Estación final de liberación - Cierre de ciclo de calidad
 *
 * Flujo:
 *   1. GET /release-ok/validate/:serial - Valida si puede liberar
 *   2. POST /release-ok/release - Ejecuta liberación
 *   3. GET /release-ok/station/:clientId - Info de estación RELEASE_OK
 */

const { query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// HELPER: Obtener información completa de validación
// ============================================================================
async function getSerialValidationInfo(serialNumber, clientId) {
  // 1. Buscar en unit_registry
  const unitResult = await query(`
    SELECT
      ur.id,
      ur.serial_number,
      ur.lot_number,
      ur.client_id,
      ur.part_id,
      ur.current_status,
      ur.open_defects,
      ur.specs_ok,
      ur.specs_nok,
      ur.total_inspections,
      ur.is_archived,
      ur.registered_at,
      ur.last_inspection_at,
      cp.part_number,
      cp.part_name
    FROM unit_registry ur
    JOIN client_parts cp ON ur.part_id = cp.id
    WHERE ur.serial_number = $1
      AND ur.client_id = $2
  `, [serialNumber.trim(), clientId]);

  if (unitResult.rows.length === 0) {
    return { found: false, unit: null, defects: [], specsNok: [] };
  }

  const unit = transformToCamelCase(unitResult.rows[0]);

  // 2. Obtener defectos abiertos
  const defectsResult = await query(`
    SELECT
      de.id,
      de.serial_number,
      de.repair_status,
      de.created_at,
      d.code as defect_code,
      d.description as defect_name,
      s.name as station_name
    FROM defect_entries_v2 de
    LEFT JOIN defects d ON de.defect_id = d.id
    LEFT JOIN stations s ON de.station_id = s.id
    WHERE de.serial_number = $1
      AND de.repair_status = 'OPEN'
    ORDER BY de.created_at DESC
  `, [serialNumber.trim()]);

  const defects = defectsResult.rows.map(row => transformToCamelCase(row));

  // 3. Obtener specs NOK
  const specsResult = await query(`
    SELECT
      usi.id,
      usi.spec_id,
      sc.spec_name,
      sc.spec_type,
      usi.result,
      usi.measured_value,
      usi.inspected_at,
      ist.name as station_name
    FROM unit_spec_inspections usi
    JOIN spec_catalog sc ON usi.spec_id = sc.id
    LEFT JOIN inspection_stations ist ON usi.station_id = ist.id
    WHERE usi.unit_id = $1
      AND usi.result = 'NOK'
    ORDER BY usi.inspected_at DESC
  `, [unit.id]);

  const specsNok = specsResult.rows.map(row => transformToCamelCase(row));

  return { found: true, unit, defects, specsNok };
}

// ============================================================================
// SETUP ENDPOINTS
// ============================================================================
const setupReleaseOkEndpoints = (app) => {

  // ==========================================================================
  // GET /release-ok/station - Info de estación RELEASE_OK (global)
  // ==========================================================================
  app.get('/release-ok/station', async (req, res) => {
    try {
      const stationResult = await query(`
        SELECT id, code, name, description, display_order, is_system
        FROM inspection_stations
        WHERE code = 'RELEASE_OK'
      `);

      if (stationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Estación RELEASE_OK no encontrada'
        });
      }

      res.json({
        success: true,
        station: transformToCamelCase(stationResult.rows[0])
      });
    } catch (error) {
      console.error('Error fetching RELEASE_OK station:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estación',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /release-ok/validate/:serial - Validar si puede liberar
  // ==========================================================================
  app.get('/release-ok/validate/:serial', async (req, res) => {
    try {
      const serialNumber = req.params.serial;
      const clientId = parseInt(req.query.clientId);

      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: 'clientId es requerido'
        });
      }

      const validation = await getSerialValidationInfo(serialNumber, clientId);

      if (!validation.found) {
        return res.status(404).json({
          success: false,
          message: 'Serial no encontrado en el registro',
          canRelease: false
        });
      }

      const { unit, defects, specsNok } = validation;

      // Validar si ya está archivada
      if (unit.isArchived) {
        return res.json({
          success: true,
          canRelease: false,
          alreadyReleased: true,
          message: 'Esta unidad ya fue liberada',
          unit
        });
      }

      // Determinar si puede liberar
      const canRelease = defects.length === 0 && specsNok.length === 0;

      // Construir lista de bloqueos
      const blockers = [];
      if (defects.length > 0) {
        blockers.push({
          type: 'DEFECTS',
          count: defects.length,
          message: `${defects.length} defecto(s) abierto(s)`,
          items: defects,
          action: 'Ir a Hospital para resolver'
        });
      }
      if (specsNok.length > 0) {
        blockers.push({
          type: 'SPECS',
          count: specsNok.length,
          message: `${specsNok.length} spec(s) NOK`,
          items: specsNok,
          action: 'Revisar especificaciones'
        });
      }

      res.json({
        success: true,
        canRelease,
        unit,
        blockers,
        message: canRelease
          ? 'Unidad lista para liberar'
          : 'No se puede liberar - hay bloqueos pendientes'
      });

    } catch (error) {
      console.error('Error validating release:', error);
      res.status(500).json({
        success: false,
        message: 'Error validando liberación',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /release-ok/release - Ejecutar liberación
  // ==========================================================================
  app.post('/release-ok/release', async (req, res) => {
    try {
      const { serialNumber, clientId, userId } = req.body;

      if (!serialNumber || !clientId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'serialNumber, clientId y userId son requeridos'
        });
      }

      // Primero validar
      const validation = await getSerialValidationInfo(serialNumber, parseInt(clientId));

      if (!validation.found) {
        return res.status(404).json({
          success: false,
          message: 'Serial no encontrado'
        });
      }

      const { unit, defects, specsNok } = validation;

      // Verificar que no esté archivada
      if (unit.isArchived) {
        return res.status(400).json({
          success: false,
          message: 'Esta unidad ya fue liberada'
        });
      }

      // Verificar que puede liberar
      if (defects.length > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede liberar: ${defects.length} defecto(s) abierto(s)`,
          blockers: defects
        });
      }

      if (specsNok.length > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede liberar: ${specsNok.length} spec(s) NOK`,
          blockers: specsNok
        });
      }

      // Ejecutar liberación usando la función de PostgreSQL
      const releaseResult = await query(`
        SELECT * FROM release_unit($1, $2)
      `, [unit.id, parseInt(userId)]);

      const result = releaseResult.rows[0];

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      // Registrar en serial_station_scans
      const stationResult = await query(`
        SELECT id FROM inspection_stations
        WHERE code = 'RELEASE_OK'
      `);

      if (stationResult.rows.length > 0) {
        await query(`
          INSERT INTO serial_station_scans
            (serial_number, station_id, part_id, user_id, has_defect, defect_count)
          VALUES ($1, $2, $3, $4, false, 0)
        `, [serialNumber.trim(), stationResult.rows[0].id, unit.partId, parseInt(userId)]);
      }

      res.json({
        success: true,
        message: 'Unidad liberada exitosamente',
        unit: {
          ...unit,
          currentStatus: 'RELEASED',
          isArchived: true
        }
      });

    } catch (error) {
      console.error('Error releasing unit:', error);
      res.status(500).json({
        success: false,
        message: 'Error liberando unidad',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /release-ok/pending/:clientId - Listar unidades pendientes de liberación
  // ==========================================================================
  app.get('/release-ok/pending/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const result = await query(`
        SELECT
          ur.id,
          ur.serial_number,
          ur.lot_number,
          ur.current_status,
          ur.open_defects,
          ur.specs_nok,
          ur.registered_at,
          ur.last_inspection_at,
          cp.part_number,
          cp.part_name,
          CASE
            WHEN ur.open_defects = 0 AND ur.specs_nok = 0 THEN true
            ELSE false
          END as can_release
        FROM unit_registry ur
        JOIN client_parts cp ON ur.part_id = cp.id
        WHERE ur.client_id = $1
          AND ur.is_archived = false
          AND ur.current_status NOT IN ('SCRAPPED')
        ORDER BY
          CASE WHEN ur.open_defects = 0 AND ur.specs_nok = 0 THEN 0 ELSE 1 END,
          ur.last_inspection_at DESC NULLS LAST
        LIMIT $2 OFFSET $3
      `, [clientId, limit, offset]);

      // Count total
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM unit_registry
        WHERE client_id = $1
          AND is_archived = false
          AND current_status NOT IN ('SCRAPPED')
      `, [clientId]);

      res.json({
        success: true,
        units: result.rows.map(row => transformToCamelCase(row)),
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      });

    } catch (error) {
      console.error('Error fetching pending units:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo unidades pendientes',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /release-ok/history/:clientId - Historial de liberaciones
  // ==========================================================================
  app.get('/release-ok/history/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;

      let whereClause = 'ur.client_id = $1 AND ur.is_archived = true';
      const params = [clientId];
      let paramCount = 1;

      if (dateFrom) {
        paramCount++;
        whereClause += ` AND ur.archived_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        whereClause += ` AND ur.archived_at <= $${paramCount}`;
        params.push(dateTo);
      }

      params.push(limit, offset);

      const result = await query(`
        SELECT
          ur.id,
          ur.serial_number,
          ur.lot_number,
          ur.current_status,
          ur.archived_at,
          ur.released_at,
          cp.part_number,
          cp.part_name,
          CONCAT(u.first_name, ' ', u.last_name) as released_by_name
        FROM unit_registry ur
        JOIN client_parts cp ON ur.part_id = cp.id
        LEFT JOIN users u ON ur.released_by = u.id
        WHERE ${whereClause}
        ORDER BY ur.archived_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, params);

      res.json({
        success: true,
        units: result.rows.map(row => transformToCamelCase(row)),
        limit,
        offset
      });

    } catch (error) {
      console.error('Error fetching release history:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo historial',
        error: error.message
      });
    }
  });

  console.log('✅ Release OK endpoints registered');
};

module.exports = { setupReleaseOkEndpoints };
