const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// STATION PART CONFIGURATION
// ============================================================================

// GET all stations with their assigned parts count
// Optional query param: ?type=INSPECTION|REPAIR|RELEASE|MRB
router.get('/stations', authenticateToken, async (req, res) => {
  const { type } = req.query;

  try {
    let whereClause = 's.is_active = true';
    const params = [];

    if (type) {
      const validTypes = ['INSPECTION', 'REPAIR', 'RELEASE', 'MRB'];
      if (validTypes.includes(type.toUpperCase())) {
        whereClause += ' AND s.station_type = $1';
        params.push(type.toUpperCase());
      }
    }

    const result = await query(`
      SELECT s.*,
             COUNT(DISTINCT spc.part_id) as assigned_parts_count,
             COUNT(DISTINCT sii.id) as total_items_count
      FROM inspection_stations s
      LEFT JOIN station_part_config spc ON s.id = spc.station_id AND spc.is_active = true
      LEFT JOIN station_inspection_items sii ON spc.id = sii.station_part_config_id AND sii.is_active = true
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY s.display_order, s.name
    `, params);

    res.json({
      success: true,
      stations: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET station configuration (parts and items assigned)
router.get('/stations/:stationId/config', authenticateToken, async (req, res) => {
  const { stationId } = req.params;

  try {
    // Get station info
    const stationResult = await query(
      'SELECT * FROM inspection_stations WHERE id = $1',
      [stationId]
    );

    if (stationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Estación no encontrada' });
    }

    // Get assigned parts with their items
    const partsResult = await query(`
      SELECT
        spc.id as config_id,
        spc.part_id,
        spc.is_active,
        spc.display_order,
        cp.part_number,
        cp.part_name,
        cp.capture_display_name,
        c.name as client_name,
        c.id as client_id,
        (
          SELECT COUNT(*) FROM station_inspection_items sii
          WHERE sii.station_part_config_id = spc.id AND sii.item_type = 'DEFECT' AND sii.is_active = true
        ) as defects_count,
        (
          SELECT COUNT(*) FROM station_inspection_items sii
          WHERE sii.station_part_config_id = spc.id AND sii.item_type = 'SPEC' AND sii.is_active = true
        ) as specs_count
      FROM station_part_config spc
      JOIN client_parts cp ON spc.part_id = cp.id
      JOIN clients c ON cp.client_id = c.id
      WHERE spc.station_id = $1
      ORDER BY spc.display_order, cp.part_number
    `, [stationId]);

    // Get items for each part
    const partsWithItems = await Promise.all(
      partsResult.rows.map(async (part) => {
        const itemsResult = await query(`
          SELECT
            sii.*,
            CASE
              WHEN sii.item_type = 'DEFECT' THEN dt.name
              WHEN sii.item_type = 'SPEC' THEN ps.spec_name
            END as item_name,
            CASE
              WHEN sii.item_type = 'DEFECT' THEN dt.code
              WHEN sii.item_type = 'SPEC' THEN ps.spec_number
            END as item_code,
            CASE
              WHEN sii.item_type = 'SPEC' THEN ps.spec_type
              ELSE NULL
            END as spec_type,
            CASE
              WHEN sii.item_type = 'SPEC' THEN ps.is_critical
              ELSE false
            END as is_critical
          FROM station_inspection_items sii
          LEFT JOIN defect_types dt ON sii.defect_type_id = dt.id
          LEFT JOIN part_specifications ps ON sii.spec_id = ps.id
          WHERE sii.station_part_config_id = $1 AND sii.is_active = true
          ORDER BY sii.item_type, sii.display_order
        `, [part.config_id]);

        return {
          ...transformToCamelCase(part),
          items: transformToCamelCase(itemsResult.rows)
        };
      })
    );

    res.json({
      success: true,
      station: transformToCamelCase(stationResult.rows[0]),
      parts: partsWithItems
    });
  } catch (error) {
    console.error('Error fetching station config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADD part to station
router.post('/stations/:stationId/parts', authenticateToken, async (req, res) => {
  const { stationId } = req.params;
  const { partId } = req.body;

  try {
    // Check if already exists
    const existing = await query(
      'SELECT id FROM station_part_config WHERE station_id = $1 AND part_id = $2',
      [stationId, partId]
    );

    if (existing.rows.length > 0) {
      // Reactivate if inactive
      await query(
        'UPDATE station_part_config SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [existing.rows[0].id]
      );
      return res.json({ success: true, configId: existing.rows[0].id, message: 'Parte reactivada' });
    }

    // Get max display order
    const maxOrder = await query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM station_part_config WHERE station_id = $1',
      [stationId]
    );

    const result = await query(`
      INSERT INTO station_part_config (station_id, part_id, display_order, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [stationId, partId, maxOrder.rows[0].next_order, req.user.id]);

    res.json({
      success: true,
      config: transformToCamelCase(result.rows[0]),
      message: 'Parte agregada a la estación'
    });
  } catch (error) {
    console.error('Error adding part to station:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// REMOVE part from station (soft delete)
router.delete('/stations/:stationId/parts/:partId', authenticateToken, async (req, res) => {
  const { stationId, partId } = req.params;

  try {
    await query(
      'UPDATE station_part_config SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE station_id = $1 AND part_id = $2',
      [stationId, partId]
    );

    res.json({ success: true, message: 'Parte removida de la estación' });
  } catch (error) {
    console.error('Error removing part from station:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// STATION INSPECTION ITEMS (Defects and Specs per station+part)
// ============================================================================

// GET available items for a part (defects and specs not yet assigned to this station)
router.get('/stations/:stationId/parts/:partId/available', authenticateToken, async (req, res) => {
  const { stationId, partId } = req.params;

  try {
    // Get config id
    const configResult = await query(
      'SELECT id FROM station_part_config WHERE station_id = $1 AND part_id = $2',
      [stationId, partId]
    );

    const configId = configResult.rows[0]?.id;

    // Get available defects (assigned to part but not to this station)
    const defectsResult = await query(`
      SELECT dt.id, dt.code, dt.name, dc.name as category_name, dc.color as category_color
      FROM part_defect_config pdc
      JOIN defect_types dt ON pdc.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE pdc.part_id = $1 AND pdc.is_active = true
        AND dt.id NOT IN (
          SELECT defect_type_id FROM station_inspection_items
          WHERE station_part_config_id = $2 AND item_type = 'DEFECT' AND is_active = true
        )
      ORDER BY dc.name, dt.name
    `, [partId, configId || 0]);

    // Get available specs
    const specsResult = await query(`
      SELECT ps.id, ps.spec_number as code, ps.spec_name as name, ps.spec_type, ps.is_critical,
             mu.symbol as unit_symbol
      FROM part_specifications ps
      LEFT JOIN measurement_units mu ON ps.unit_id = mu.id
      WHERE ps.part_id = $1 AND ps.is_active = true
        AND ps.id NOT IN (
          SELECT spec_id FROM station_inspection_items
          WHERE station_part_config_id = $2 AND item_type = 'SPEC' AND is_active = true
        )
      ORDER BY ps.spec_type, ps.display_order
    `, [partId, configId || 0]);

    res.json({
      success: true,
      availableDefects: transformToCamelCase(defectsResult.rows),
      availableSpecs: transformToCamelCase(specsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching available items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADD items to station+part
router.post('/stations/:stationId/parts/:partId/items', authenticateToken, async (req, res) => {
  const { stationId, partId } = req.params;
  const { defectIds = [], specIds = [] } = req.body;

  try {
    // Get or create config
    let configResult = await query(
      'SELECT id FROM station_part_config WHERE station_id = $1 AND part_id = $2',
      [stationId, partId]
    );

    let configId;
    if (configResult.rows.length === 0) {
      const newConfig = await query(
        'INSERT INTO station_part_config (station_id, part_id, created_by) VALUES ($1, $2, $3) RETURNING id',
        [stationId, partId, req.user.id]
      );
      configId = newConfig.rows[0].id;
    } else {
      configId = configResult.rows[0].id;
      // Reactivate if needed
      await query(
        'UPDATE station_part_config SET is_active = true WHERE id = $1',
        [configId]
      );
    }

    let added = 0;

    // Add defects
    for (const defectId of defectIds) {
      try {
        await query(`
          INSERT INTO station_inspection_items (station_part_config_id, item_type, defect_type_id)
          VALUES ($1, 'DEFECT', $2)
          ON CONFLICT DO NOTHING
        `, [configId, defectId]);
        added++;
      } catch (e) {
        // Skip duplicates
      }
    }

    // Add specs
    for (const specId of specIds) {
      try {
        await query(`
          INSERT INTO station_inspection_items (station_part_config_id, item_type, spec_id)
          VALUES ($1, 'SPEC', $2)
          ON CONFLICT DO NOTHING
        `, [configId, specId]);
        added++;
      } catch (e) {
        // Skip duplicates
      }
    }

    res.json({
      success: true,
      added,
      message: `${added} items agregados`
    });
  } catch (error) {
    console.error('Error adding items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// REMOVE item from station+part
router.delete('/stations/:stationId/items/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    await query(
      'UPDATE station_inspection_items SET is_active = false WHERE id = $1',
      [itemId]
    );

    res.json({ success: true, message: 'Item removido' });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// BULK update items for station+part
router.put('/stations/:stationId/parts/:partId/items', authenticateToken, async (req, res) => {
  const { stationId, partId } = req.params;
  const { defectIds = [], specIds = [] } = req.body;

  try {
    // Get config id
    let configResult = await query(
      'SELECT id FROM station_part_config WHERE station_id = $1 AND part_id = $2',
      [stationId, partId]
    );

    if (configResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    }

    const configId = configResult.rows[0].id;

    // Deactivate all current items
    await query(
      'UPDATE station_inspection_items SET is_active = false WHERE station_part_config_id = $1',
      [configId]
    );

    // Add/reactivate defects
    for (const defectId of defectIds) {
      await query(`
        INSERT INTO station_inspection_items (station_part_config_id, item_type, defect_type_id, is_active)
        VALUES ($1, 'DEFECT', $2, true)
        ON CONFLICT (station_part_config_id, defect_type_id)
        WHERE item_type = 'DEFECT'
        DO UPDATE SET is_active = true
      `, [configId, defectId]);
    }

    // Add/reactivate specs
    for (const specId of specIds) {
      await query(`
        INSERT INTO station_inspection_items (station_part_config_id, item_type, spec_id, is_active)
        VALUES ($1, 'SPEC', $2, true)
        ON CONFLICT (station_part_config_id, spec_id)
        WHERE item_type = 'SPEC'
        DO UPDATE SET is_active = true
      `, [configId, specId]);
    }

    res.json({
      success: true,
      defectsCount: defectIds.length,
      specsCount: specIds.length,
      message: 'Configuración actualizada'
    });
  } catch (error) {
    console.error('Error updating items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// GET inspection config for DefectCapture (what to show for a station+part)
// ============================================================================

router.get('/capture-config/:stationId/:partId', authenticateToken, async (req, res) => {
  const { stationId, partId } = req.params;

  try {
    // Get config
    const configResult = await query(`
      SELECT spc.id as config_id
      FROM station_part_config spc
      WHERE spc.station_id = $1 AND spc.part_id = $2 AND spc.is_active = true
    `, [stationId, partId]);

    if (configResult.rows.length === 0) {
      // No specific config, return all defects for the part
      const defectsResult = await query(`
        SELECT dt.id, dt.code, dt.name, dc.name as category_name, dc.color as category_color
        FROM part_defect_config pdc
        JOIN defect_types dt ON pdc.defect_type_id = dt.id
        LEFT JOIN defect_categories dc ON dt.category_id = dc.id
        WHERE pdc.part_id = $1 AND pdc.is_active = true
        ORDER BY dc.name, dt.name
      `, [partId]);

      return res.json({
        success: true,
        hasStationConfig: false,
        defects: transformToCamelCase(defectsResult.rows),
        specs: []
      });
    }

    const configId = configResult.rows[0].config_id;

    // Get assigned defects
    const defectsResult = await query(`
      SELECT dt.id, dt.code, dt.name, dc.name as category_name, dc.color as category_color,
             sii.is_required
      FROM station_inspection_items sii
      JOIN defect_types dt ON sii.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE sii.station_part_config_id = $1 AND sii.item_type = 'DEFECT' AND sii.is_active = true
      ORDER BY sii.display_order, dc.name, dt.name
    `, [configId]);

    // Get assigned specs
    const specsResult = await query(`
      SELECT ps.*, mu.symbol as unit_symbol, mu.name as unit_name,
             sii.is_required
      FROM station_inspection_items sii
      JOIN part_specifications ps ON sii.spec_id = ps.id
      LEFT JOIN measurement_units mu ON ps.unit_id = mu.id
      WHERE sii.station_part_config_id = $1 AND sii.item_type = 'SPEC' AND sii.is_active = true
      ORDER BY sii.display_order, ps.spec_type, ps.display_order
    `, [configId]);

    res.json({
      success: true,
      hasStationConfig: true,
      defects: transformToCamelCase(defectsResult.rows),
      specs: transformToCamelCase(specsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching capture config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// STATIONS BY TYPE (for Hospital module)
// ============================================================================

// GET stations by type (INSPECTION, REPAIR, RELEASE, MRB)
router.get('/stations/by-type/:type', authenticateToken, async (req, res) => {
  const { type } = req.params;
  const validTypes = ['INSPECTION', 'REPAIR', 'RELEASE', 'MRB'];

  if (!validTypes.includes(type.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Valores permitidos: ${validTypes.join(', ')}`
    });
  }

  try {
    const result = await query(`
      SELECT id, code, name, description, station_type, station_type_note, display_order
      FROM inspection_stations
      WHERE station_type = $1 AND is_active = true
      ORDER BY display_order, name
    `, [type.toUpperCase()]);

    res.json({
      success: true,
      stationType: type.toUpperCase(),
      stations: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching stations by type:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all station types summary (count by type)
router.get('/stations/types/summary', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        station_type,
        COUNT(*) as count,
        array_agg(json_build_object('id', id, 'code', code, 'name', name) ORDER BY display_order, name) as stations
      FROM inspection_stations
      WHERE is_active = true
      GROUP BY station_type
      ORDER BY station_type
    `);

    res.json({
      success: true,
      types: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching station types summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE station type
router.patch('/stations/:stationId/type', authenticateToken, async (req, res) => {
  const { stationId } = req.params;
  const { stationType, stationTypeNote } = req.body;

  const validTypes = ['INSPECTION', 'REPAIR', 'RELEASE', 'MRB'];
  if (!validTypes.includes(stationType)) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Valores permitidos: ${validTypes.join(', ')}`
    });
  }

  try {
    const result = await query(`
      UPDATE inspection_stations
      SET station_type = $1,
          station_type_note = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [stationType, stationTypeNote || null, stationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Estación no encontrada' });
    }

    res.json({
      success: true,
      message: 'Tipo de estación actualizado',
      station: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating station type:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
