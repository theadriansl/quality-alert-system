const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// HOSPITAL DASHBOARD ENDPOINTS
// ============================================================================

// GET /hospital-dashboard/summary - KPIs generales (Tab Resumen)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;
    const result = await query(
      'SELECT * FROM fn_hospital_dashboard_summary($1, $2, $3)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows[0] || {})
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard summary' });
  }
});

// GET /hospital-dashboard/repairers - Estadisticas por tecnico (Tab Personal)
router.get('/repairers', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;
    const result = await query(
      'SELECT * FROM fn_hospital_by_repairer($1, $2, $3)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching repairer stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching repairer stats' });
  }
});

// GET /hospital-dashboard/releasers - Estadisticas por inspector QA (Tab Personal)
router.get('/releasers', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;
    const result = await query(
      'SELECT * FROM fn_hospital_by_releaser($1, $2, $3)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching releaser stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching releaser stats' });
  }
});

// GET /hospital-dashboard/repeat-defects - Defectos repetidos (Tab Calidad)
router.get('/repeat-defects', authenticateToken, async (req, res) => {
  const { start_date, end_date, client_id, limit = 50 } = req.query;
  try {
    const result = await query(
      'SELECT * FROM fn_hospital_repeat_defects($1, $2, $3, $4)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null, parseInt(limit)]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching repeat defects:', error);
    res.status(500).json({ success: false, message: 'Error fetching repeat defects' });
  }
});

// GET /hospital-dashboard/by-client - Desglose por cliente (Tab Calidad)
router.get('/by-client', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;
    const result = await query(
      'SELECT * FROM fn_hospital_by_client($1, $2, $3)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching client stats' });
  }
});

// GET /hospital-dashboard/costs - Costos y tendencias (Tab Costos)
router.get('/costs', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;
    const result = await query(
      'SELECT * FROM fn_hospital_costs($1, $2, $3)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null]
    );

    // Separar por tipo de registro
    const summary = result.rows.find(r => r.record_type === 'summary') || {};
    const daily = result.rows.filter(r => r.record_type === 'daily');
    const monthly = result.rows.filter(r => r.record_type === 'monthly');

    res.json({
      success: true,
      data: {
        summary: transformToCamelCase(summary),
        daily: transformToCamelCase(daily),
        monthly: transformToCamelCase(monthly)
      }
    });
  } catch (error) {
    console.error('Error fetching cost data:', error);
    res.status(500).json({ success: false, message: 'Error fetching cost data' });
  }
});

// GET /hospital-dashboard/top-defect-types - Top tipos de defecto (Tab Calidad)
router.get('/top-defect-types', authenticateToken, async (req, res) => {
  const { start_date, end_date, client_id, limit = 10 } = req.query;
  try {
    const result = await query(
      'SELECT * FROM fn_hospital_top_defect_types($1, $2, $3, $4)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null, parseInt(limit)]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching top defect types:', error);
    res.status(500).json({ success: false, message: 'Error fetching top defect types' });
  }
});

// GET /hospital-dashboard/top-parts - Top partes con defectos (Tab Calidad)
router.get('/top-parts', authenticateToken, async (req, res) => {
  const { start_date, end_date, client_id, limit = 10 } = req.query;
  try {
    const result = await query(
      'SELECT * FROM fn_hospital_top_parts($1, $2, $3, $4)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null, parseInt(limit)]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching top parts:', error);
    res.status(500).json({ success: false, message: 'Error fetching top parts' });
  }
});

// GET /hospital-dashboard/throughput - Throughput diario (Tab Operativo)
router.get('/throughput', authenticateToken, async (req, res) => {
  const { start_date, end_date, client_id, days = 30 } = req.query;
  try {
    const result = await query(
      'SELECT * FROM fn_hospital_throughput($1, $2, $3, $4)',
      [start_date || null, end_date || null, client_id ? parseInt(client_id) : null, parseInt(days)]
    );
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching throughput:', error);
    res.status(500).json({ success: false, message: 'Error fetching throughput' });
  }
});

// GET /hospital-dashboard/wip-by-location - WIP por ubicacion (Tab Operativo)
router.get('/wip-by-location', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_hospital_wip_by_location');
    res.json({
      success: true,
      data: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching WIP by location:', error);
    res.status(500).json({ success: false, message: 'Error fetching WIP by location' });
  }
});

// GET /hospital-dashboard/export - Datos completos para exportación Excel
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;

    // Construir condiciones de filtro
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      conditions.push(`d.captured_at >= $${paramIndex}::date`);
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      conditions.push(`d.captured_at <= ($${paramIndex}::date + interval '1 day')`);
      params.push(end_date);
      paramIndex++;
    }
    if (client_id) {
      conditions.push(`d.client_id = $${paramIndex}`);
      params.push(parseInt(client_id));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 1. Todos los defectos con información completa
    const defectsQuery = `
      SELECT
        d.entry_number,
        d.serial_number,
        d.lot_number,
        d.quantity,
        c.name AS client_name,
        cp.part_number,
        cp.part_name,
        dt.name AS defect_type,
        dt.code AS defect_code,
        dep.name AS department,
        sev.name AS severity,
        dis.name AS disposition,
        d.repair_status,
        d.notes,
        d.captured_at,
        CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by,
        st.name AS capture_station,
        d.repair_started_at,
        d.repaired_at,
        d.repair_time_minutes,
        rt.name AS repair_type,
        d.repair_notes,
        CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by,
        d.released_at,
        CONCAT(ul.first_name, ' ', ul.last_name) AS released_by,
        lc.code AS current_location,
        CASE WHEN d.repair_status = 'SCRAPPED' THEN COALESCE(cp.unit_cost, 0) ELSE 0 END AS scrap_cost,
        d.created_at
      FROM defect_entries_v2 d
      LEFT JOIN clients c ON d.client_id = c.id
      LEFT JOIN client_parts cp ON d.part_id = cp.id
      LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
      LEFT JOIN departments dep ON d.department_id = dep.id
      LEFT JOIN inspection_severities sev ON d.severity_id = sev.id
      LEFT JOIN inspection_dispositions dis ON d.disposition_id = dis.id
      LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
      LEFT JOIN inspection_stations st ON d.station_id = st.id
      LEFT JOIN location_codes lc ON d.current_location_id = lc.id
      LEFT JOIN users uc ON d.captured_by_user_id = uc.id
      LEFT JOIN users ur ON d.repaired_by = ur.id
      LEFT JOIN users ul ON d.released_by = ul.id
      ${whereClause}
      ORDER BY d.captured_at DESC
    `;

    // 2. Resumen por tipo de defecto
    const byDefectTypeQuery = `
      SELECT
        dt.name AS defect_type,
        dt.code AS code,
        COUNT(*) AS total,
        SUM(CASE WHEN d.repair_status = 'RELEASED' THEN 1 ELSE 0 END) AS released,
        SUM(CASE WHEN d.repair_status = 'SCRAPPED' THEN 1 ELSE 0 END) AS scrapped,
        SUM(CASE WHEN d.repair_status IN ('OPEN','PENDING_REPAIR','IN_REPAIR','REPAIRED') THEN 1 ELSE 0 END) AS in_process,
        ROUND(AVG(d.repair_time_minutes)::numeric, 1) AS avg_repair_time,
        SUM(CASE WHEN d.repair_status = 'SCRAPPED' THEN COALESCE(cp.unit_cost, 0) ELSE 0 END) AS scrap_cost
      FROM defect_entries_v2 d
      LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
      LEFT JOIN client_parts cp ON d.part_id = cp.id
      ${whereClause}
      GROUP BY dt.id, dt.name, dt.code
      ORDER BY total DESC
    `;

    // 3. Resumen por parte
    const byPartQuery = `
      SELECT
        cp.part_number,
        cp.part_name,
        c.name AS client,
        COUNT(*) AS total_defects,
        SUM(CASE WHEN d.repair_status = 'RELEASED' THEN 1 ELSE 0 END) AS released,
        SUM(CASE WHEN d.repair_status = 'SCRAPPED' THEN 1 ELSE 0 END) AS scrapped,
        SUM(CASE WHEN d.repair_status = 'SCRAPPED' THEN COALESCE(cp.unit_cost, 0) ELSE 0 END) AS scrap_cost
      FROM defect_entries_v2 d
      LEFT JOIN client_parts cp ON d.part_id = cp.id
      LEFT JOIN clients c ON d.client_id = c.id
      ${whereClause}
      GROUP BY cp.id, cp.part_number, cp.part_name, c.name
      ORDER BY total_defects DESC
    `;

    // 4. Resumen por reparador
    const byRepairerQuery = `
      SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS repairer,
        COUNT(*) AS total_repairs,
        SUM(COALESCE(d.repair_time_minutes, 0)) AS total_minutes,
        ROUND(AVG(d.repair_time_minutes)::numeric, 1) AS avg_minutes,
        MIN(d.repaired_at) AS first_repair,
        MAX(d.repaired_at) AS last_repair
      FROM defect_entries_v2 d
      JOIN users u ON d.repaired_by = u.id
      ${whereClause ? whereClause + ' AND d.repaired_by IS NOT NULL' : 'WHERE d.repaired_by IS NOT NULL'}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_repairs DESC
    `;

    // 5. Resumen por liberador
    const byReleaserQuery = `
      SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS releaser,
        COUNT(*) AS total_releases,
        MIN(d.released_at) AS first_release,
        MAX(d.released_at) AS last_release
      FROM defect_entries_v2 d
      JOIN users u ON d.released_by = u.id
      ${whereClause ? whereClause + ' AND d.released_by IS NOT NULL' : 'WHERE d.released_by IS NOT NULL'}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_releases DESC
    `;

    // 6. Resumen por departamento
    const byDepartmentQuery = `
      SELECT
        dep.name AS department,
        COUNT(*) AS total,
        SUM(CASE WHEN d.repair_status = 'RELEASED' THEN 1 ELSE 0 END) AS released,
        SUM(CASE WHEN d.repair_status = 'SCRAPPED' THEN 1 ELSE 0 END) AS scrapped,
        SUM(CASE WHEN d.repair_status = 'SCRAPPED' THEN COALESCE(cp.unit_cost, 0) ELSE 0 END) AS scrap_cost
      FROM defect_entries_v2 d
      LEFT JOIN departments dep ON d.department_id = dep.id
      LEFT JOIN client_parts cp ON d.part_id = cp.id
      ${whereClause}
      GROUP BY dep.id, dep.name
      ORDER BY total DESC
    `;

    // Ejecutar todas las consultas en paralelo
    const [defects, byDefectType, byPart, byRepairer, byReleaser, byDepartment] = await Promise.all([
      query(defectsQuery, params),
      query(byDefectTypeQuery, params),
      query(byPartQuery, params),
      query(byRepairerQuery, params),
      query(byReleaserQuery, params),
      query(byDepartmentQuery, params)
    ]);

    res.json({
      success: true,
      data: {
        defects: transformToCamelCase(defects.rows),
        byDefectType: transformToCamelCase(byDefectType.rows),
        byPart: transformToCamelCase(byPart.rows),
        byRepairer: transformToCamelCase(byRepairer.rows),
        byReleaser: transformToCamelCase(byReleaser.rows),
        byDepartment: transformToCamelCase(byDepartment.rows)
      },
      filters: {
        startDate: start_date || null,
        endDate: end_date || null,
        clientId: client_id || null
      }
    });
  } catch (error) {
    console.error('Error fetching export data:', error);
    res.status(500).json({ success: false, message: 'Error fetching export data' });
  }
});

module.exports = router;
