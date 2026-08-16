const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// HELPER: GET USER FROZEN NAME
// Para congelar nombres de usuarios en registros históricos
// ============================================================================
const getUserFrozenName = (user) => {
  if (!user) return 'Usuario Desconocido';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`.trim();
  }
  return user.name || user.email || `Usuario ${user.id}`;
};

// ============================================================================
// MULTER CONFIGURATION FOR QAR PHOTOS
// ============================================================================

const qarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/qar');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'qar-' + uniqueSuffix + ext);
  }
});

const qarUpload = multer({
  storage: qarStorage,
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

// ============================================================================
// QAR PHOTO UPLOAD
// ============================================================================

// Upload a photo for QAR (NOK or OK)
router.post('/upload-photo', authenticateToken, qarUpload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const photoUrl = `/uploads/qar/${req.file.filename}`;

    res.json({
      success: true,
      url: photoUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error uploading QAR photo:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// ============================================================================
// QAR THRESHOLD CHECK
// ============================================================================

// Check if QAR threshold is reached for a part/severity/department combination
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
    const thresholdCount = severity.qar_threshold_count || 0;
    const thresholdHours = severity.qar_threshold_hours || 24;

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
               de.lot_number, de.notes
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

      // Get attachments for these defects
      const defectIds = defectsResult.rows.map(d => d.id);
      let attachmentsMap = {};
      if (defectIds.length > 0) {
        const attachResult = await query(`
          SELECT defect_id, file_path, mimetype, original_name
          FROM defect_attachments
          WHERE defect_id = ANY($1)
          ORDER BY uploaded_at ASC
        `, [defectIds]);
        attachResult.rows.forEach(att => {
          if (!attachmentsMap[att.defect_id]) attachmentsMap[att.defect_id] = [];
          attachmentsMap[att.defect_id].push(att);
        });
      }

      // Add attachments to each defect
      const defectsWithAttachments = defectsResult.rows.map(d => ({
        ...d,
        attachments: attachmentsMap[d.id] || []
      }));

      // Find first image attachment for NOK photo
      let firstImagePath = null;
      for (const d of defectsWithAttachments) {
        const img = d.attachments.find(a => a.mimetype?.startsWith('image/'));
        if (img) {
          firstImagePath = img.file_path;
          break;
        }
      }

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
        defects: transformToCamelCase(defectsWithAttachments),
        firstDefectImagePath: firstImagePath,
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
    console.error('Error checking QAR threshold:', error);
    res.status(500).json({ success: false, message: 'Error checking threshold' });
  }
});

// ============================================================================
// QAR CRUD
// ============================================================================

// GET all QARs (with filters)
router.get('/', authenticateToken, async (req, res) => {
  const { clientId, partId, status, limit = 50, offset = 0 } = req.query;

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
             COALESCE(qa.assigned_to_name, u1.first_name || ' ' || u1.last_name) as assigned_to_name,
             COALESCE(qa.reported_by_name, u2.first_name || ' ' || u2.last_name) as reported_by_name,
             (SELECT COUNT(*) FROM qar_defects WHERE qar_id = qa.id) as defect_count
      FROM quality_alerts qa
      LEFT JOIN clients c ON qa.client_id = c.id
      LEFT JOIN projects p ON qa.project_id = p.id
      LEFT JOIN client_parts cp ON qa.part_id = cp.id
      LEFT JOIN inspection_severities s ON qa.severity_id = s.id
      LEFT JOIN users u1 ON qa.assigned_to = u1.id
      LEFT JOIN users u2 ON qa.reported_by = u2.id
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

    sql += ` ORDER BY qa.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Add department name to each row
    const qars = result.rows.map(row => ({
      ...row,
      department_name: deptNames[row.department_id] || 'N/A'
    }));

    res.json({
      success: true,
      qars: transformToCamelCase(qars),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching QARs:', error);
    res.status(500).json({ success: false, message: 'Error fetching QARs' });
  }
});

// ============================================================================
// QAR DASHBOARD STATS - Executive Dashboard
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

    // QAR counts by status
    const qarCounts = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('EMITIDO', 'RESPONDIDO', 'RECHAZADO')) as active,
        COUNT(*) FILTER (WHERE status = 'EMITIDO') as emitido,
        COUNT(*) FILTER (WHERE status = 'RESPONDIDO') as respondido,
        COUNT(*) FILTER (WHERE status = 'RECHAZADO') as rechazado,
        COUNT(*) FILTER (WHERE status = 'CERRADO') as cerrado,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'EMITIDO' AND created_at < NOW() - INTERVAL '1 day') as vencidos
      FROM quality_alerts qa
      WHERE 1=1 ${baseFilter}
    `, params);

    // Average response time (in hours)
    const avgResponseTime = await query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (response_date - created_at)) / 3600) as avg_hours
      FROM quality_alerts qa
      WHERE response_date IS NOT NULL ${dateFilter}
    `, params);

    // Defects with critical severity that don't have QAR
    const criticalWithoutQar = await query(`
      SELECT COUNT(*) as count
      FROM defect_entries_v2 de
      JOIN inspection_severities s ON de.severity_id = s.id
      WHERE de.qar_id IS NULL
        AND LOWER(s.code) IN ('critical', 'critico', 'alta')
        AND de.status NOT IN ('CLOSED', 'CERRADO')
    `);

    // Total downtime from defects linked to QARs
    const downtimeQar = await query(`
      SELECT COALESCE(SUM(de.downtime_minutes), 0) as total_downtime
      FROM defect_entries_v2 de
      WHERE de.qar_id IS NOT NULL
    `);

    // ========== IE-QAR (Índice de Efectividad) POR DEPARTAMENTO ==========
    // Compara defectos 30 días antes vs 30 días después del QAR

    const ieQarByDept = await query(`
      WITH qar_periods AS (
        SELECT
          qa.id as qar_id,
          qa.department_id,
          d.name as department_name,
          qa.part_id,
          qa.created_at as qar_date,
          qa.created_at - INTERVAL '30 days' as pre_start,
          qa.created_at as pre_end,
          qa.created_at as post_start,
          qa.created_at + INTERVAL '30 days' as post_end
        FROM quality_alerts qa
        LEFT JOIN departments d ON qa.department_id = d.id
        WHERE qa.status = 'CERRADO'
      ),
      pre_defects AS (
        SELECT
          qp.qar_id,
          qp.department_id,
          COUNT(de.id) as pre_count
        FROM qar_periods qp
        LEFT JOIN defect_entries_v2 de ON de.part_id = qp.part_id
          AND de.created_at >= qp.pre_start
          AND de.created_at < qp.pre_end
        GROUP BY qp.qar_id, qp.department_id
      ),
      post_defects AS (
        SELECT
          qp.qar_id,
          qp.department_id,
          COUNT(de.id) as post_count
        FROM qar_periods qp
        LEFT JOIN defect_entries_v2 de ON de.part_id = qp.part_id
          AND de.created_at > qp.post_start
          AND de.created_at <= qp.post_end
        GROUP BY qp.qar_id, qp.department_id
      )
      SELECT
        COALESCE(d.name, 'Dept ' || qp.department_id) as department,
        qp.department_id,
        COUNT(DISTINCT qp.qar_id) as qar_count,
        COALESCE(SUM(pre.pre_count), 0) as total_pre,
        COALESCE(SUM(post.post_count), 0) as total_post,
        CASE
          WHEN COALESCE(SUM(pre.pre_count), 0) = 0 THEN 0
          ELSE ROUND(((COALESCE(SUM(post.post_count), 0) - COALESCE(SUM(pre.pre_count), 0))::numeric /
                NULLIF(SUM(pre.pre_count), 0) * 100), 1)
        END as ie_qar
      FROM qar_periods qp
      LEFT JOIN pre_defects pre ON qp.qar_id = pre.qar_id
      LEFT JOIN post_defects post ON qp.qar_id = post.qar_id
      LEFT JOIN departments d ON qp.department_id = d.id
      GROUP BY qp.department_id, d.name
      ORDER BY ie_qar ASC
    `);

    // ========== DEFECTOS SIN QAR QUE ROMPIERON UMBRAL ==========
    // Defectos que debieron disparar QAR pero no se emitió

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
        WHERE de.qar_id IS NULL
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

    // ========== DEFECTOS PRE vs POST QAR POR DEPARTAMENTO ==========

    const preVsPostByDept = await query(`
      WITH dept_stats AS (
        SELECT
          COALESCE(d.name, 'Dept ' || qa.department_id) as department,
          qa.department_id,
          COUNT(DISTINCT CASE WHEN de.created_at < qa.created_at THEN de.id END) as pre_qar,
          COUNT(DISTINCT CASE WHEN de.created_at >= qa.created_at THEN de.id END) as post_qar
        FROM quality_alerts qa
        LEFT JOIN qar_defects qd ON qa.id = qd.qar_id
        LEFT JOIN defect_entries_v2 de ON de.part_id = qa.part_id
          AND de.created_at >= qa.created_at - INTERVAL '30 days'
          AND de.created_at <= qa.created_at + INTERVAL '30 days'
        LEFT JOIN departments d ON qa.department_id = d.id
        WHERE qa.status = 'CERRADO'
        GROUP BY qa.department_id, d.name
      )
      SELECT * FROM dept_stats WHERE department IS NOT NULL
      ORDER BY (pre_qar - post_qar) DESC
      LIMIT 10
    `);

    // ========== DEFECTOS RECURRENTES POST-QAR (Top 5) ==========

    const recurrentDefects = await query(`
      SELECT
        COALESCE(d.name, 'Sin Dept') as department,
        cp.part_number,
        dt.name as defect_type,
        qa.alert_number as qar_number,
        COUNT(de.id) as reincidence_count
      FROM quality_alerts qa
      JOIN qar_defects qd ON qa.id = qd.qar_id
      JOIN defect_entries_v2 orig ON qd.defect_entry_id = orig.id
      JOIN defect_entries_v2 de ON de.part_id = qa.part_id
        AND de.defect_type_id = orig.defect_type_id
        AND de.created_at > qa.created_at
        AND de.id != orig.id
      LEFT JOIN departments d ON qa.department_id = d.id
      LEFT JOIN client_parts cp ON qa.part_id = cp.id
      LEFT JOIN defect_types dt ON orig.defect_type_id = dt.id
      WHERE qa.status = 'CERRADO'
      GROUP BY d.name, cp.part_number, dt.name, qa.alert_number
      HAVING COUNT(de.id) > 0
      ORDER BY reincidence_count DESC
      LIMIT 5
    `);

    // ========== RESPONSABLES EN RIESGO ==========

    const responsablesRiesgo = await query(`
      SELECT
        u.first_name || ' ' || u.last_name as responsable,
        COUNT(*) FILTER (WHERE qa.status = 'EMITIDO' AND qa.created_at < NOW() - INTERVAL '1 day') as qar_vencidos,
        COUNT(*) as total_asignados
      FROM quality_alerts qa
      JOIN users u ON qa.assigned_to = u.id
      WHERE qa.status IN ('EMITIDO', 'RESPONDIDO', 'RECHAZADO')
      GROUP BY u.id, u.first_name, u.last_name
      HAVING COUNT(*) FILTER (WHERE qa.status = 'EMITIDO' AND qa.created_at < NOW() - INTERVAL '1 day') > 0
      ORDER BY qar_vencidos DESC
      LIMIT 5
    `);

    // ========== DEFECTOS CRÍTICOS SIN QAR POR DEPARTAMENTO ==========

    const criticalNoQarByDept = await query(`
      SELECT
        COALESCE(d.name, 'Sin Dept') as department,
        COUNT(de.id) as count
      FROM defect_entries_v2 de
      JOIN inspection_severities s ON de.severity_id = s.id
      LEFT JOIN departments d ON de.department_id = d.id
      WHERE de.qar_id IS NULL
        AND LOWER(s.code) IN ('critical', 'critico', 'alta', 'high')
        AND de.status NOT IN ('CLOSED', 'CERRADO')
      GROUP BY d.name
      ORDER BY count DESC
      LIMIT 10
    `);

    // ========== TENDENCIA DE DEFECTOS CON MARCAS DE QAR ==========

    const defectTrend = await query(`
      SELECT
        DATE(de.created_at) as date,
        COUNT(de.id) as defect_count,
        COUNT(de.qar_id) as with_qar
      FROM defect_entries_v2 de
      WHERE de.created_at >= NOW() - INTERVAL '60 days'
      GROUP BY DATE(de.created_at)
      ORDER BY date
    `);

    const qarEmissions = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as qar_count
      FROM quality_alerts
      WHERE created_at >= NOW() - INTERVAL '60 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // ========== MADUREZ DEL SISTEMA QAR ==========

    const maturityStats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE trigger_type = 'threshold') * 100.0 / NULLIF(COUNT(*), 0) as pct_automatic,
        AVG(EXTRACT(EPOCH FROM (response_date - created_at)) / 3600) as avg_response_hours,
        COUNT(*) FILTER (WHERE status = 'CERRADO') * 100.0 / NULLIF(COUNT(*), 0) as pct_closed
      FROM quality_alerts
      WHERE created_at >= NOW() - INTERVAL '90 days'
    `);

    // ========== PARETO QAR POR ESTACIÓN ==========

    const qarByStation = await query(`
      SELECT
        COALESCE(s.name, de.capture_station, 'Sin Estación') as station,
        COUNT(DISTINCT qa.id) as qar_count
      FROM quality_alerts qa
      JOIN qar_defects qd ON qa.id = qd.qar_id
      JOIN defect_entries_v2 de ON qd.defect_entry_id = de.id
      LEFT JOIN inspection_stations s ON de.station_id = s.id
      GROUP BY COALESCE(s.name, de.capture_station, 'Sin Estación')
      ORDER BY qar_count DESC
      LIMIT 10
    `);

    // ========== PARETO QAR POR DEPARTAMENTO ==========

    const qarByDepartment = await query(`
      SELECT
        COALESCE(d.name, 'Sin Dept') as department,
        COUNT(*) as qar_count,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADO') as cerrados,
        COUNT(*) FILTER (WHERE qa.status IN ('EMITIDO', 'RESPONDIDO', 'RECHAZADO')) as activos
      FROM quality_alerts qa
      LEFT JOIN departments d ON qa.department_id = d.id
      GROUP BY d.name
      ORDER BY qar_count DESC
      LIMIT 10
    `);

    // ========== % QAR EFECTIVOS (IE-QAR < 0) ==========

    const efectividadTotal = await query(`
      WITH qar_effectiveness AS (
        SELECT
          qa.id,
          COUNT(DISTINCT pre.id) as pre_count,
          COUNT(DISTINCT post.id) as post_count
        FROM quality_alerts qa
        LEFT JOIN defect_entries_v2 pre ON pre.part_id = qa.part_id
          AND pre.created_at >= qa.created_at - INTERVAL '30 days'
          AND pre.created_at < qa.created_at
        LEFT JOIN defect_entries_v2 post ON post.part_id = qa.part_id
          AND post.created_at > qa.created_at
          AND post.created_at <= qa.created_at + INTERVAL '30 days'
        WHERE qa.status = 'CERRADO'
        GROUP BY qa.id
      )
      SELECT
        COUNT(*) as total_cerrados,
        COUNT(*) FILTER (WHERE post_count < pre_count) as efectivos,
        ROUND(COUNT(*) FILTER (WHERE post_count < pre_count) * 100.0 / NULLIF(COUNT(*), 0), 1) as pct_efectivos
      FROM qar_effectiveness
    `);

    // Construct response
    const kpis = qarCounts.rows[0];
    const response = {
      success: true,
      kpis: {
        qarActivos: parseInt(kpis.active) || 0,
        qarEmitidos: parseInt(kpis.emitido) || 0,
        qarRespondidos: parseInt(kpis.respondido) || 0,
        qarRechazados: parseInt(kpis.rechazado) || 0,
        qarCerrados: parseInt(kpis.cerrado) || 0,
        qarTotal: parseInt(kpis.total) || 0,
        qarVencidos: parseInt(kpis.vencidos) || 0,
        avgResponseHours: parseFloat(avgResponseTime.rows[0]?.avg_hours) || 0,
        criticalWithoutQar: parseInt(criticalWithoutQar.rows[0]?.count) || 0,
        downtimeMinutes: parseInt(downtimeQar.rows[0]?.total_downtime) || 0,
        pctEfectivos: parseFloat(efectividadTotal.rows[0]?.pct_efectivos) || 0
      },
      ieQarByDepartment: ieQarByDept.rows.map(r => ({
        department: r.department,
        departmentId: r.department_id,
        qarCount: parseInt(r.qar_count),
        preDefects: parseInt(r.total_pre),
        postDefects: parseInt(r.total_post),
        ieQar: parseFloat(r.ie_qar)
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
        preQar: parseInt(r.pre_qar),
        postQar: parseInt(r.post_qar)
      })),
      recurrentDefects: recurrentDefects.rows.map(r => ({
        department: r.department,
        partNumber: r.part_number,
        defectType: r.defect_type,
        qarNumber: r.qar_number,
        reincidenceCount: parseInt(r.reincidence_count)
      })),
      responsablesRiesgo: responsablesRiesgo.rows.map(r => ({
        responsable: r.responsable,
        qarVencidos: parseInt(r.qar_vencidos),
        totalAsignados: parseInt(r.total_asignados)
      })),
      criticalNoQarByDept: criticalNoQarByDept.rows.map(r => ({
        department: r.department,
        count: parseInt(r.count)
      })),
      defectTrend: defectTrend.rows.map(r => ({
        date: r.date,
        defectCount: parseInt(r.defect_count),
        withQar: parseInt(r.with_qar)
      })),
      qarEmissions: qarEmissions.rows.map(r => ({
        date: r.date,
        qarCount: parseInt(r.qar_count)
      })),
      maturity: {
        pctAutomatic: parseFloat(maturityStats.rows[0]?.pct_automatic) || 0,
        avgResponseHours: parseFloat(maturityStats.rows[0]?.avg_response_hours) || 0,
        pctClosed: parseFloat(maturityStats.rows[0]?.pct_closed) || 0
      },
      qarByStation: qarByStation.rows.map(r => ({
        station: r.station,
        qarCount: parseInt(r.qar_count)
      })),
      qarByDepartment: qarByDepartment.rows.map(r => ({
        department: r.department,
        qarCount: parseInt(r.qar_count),
        cerrados: parseInt(r.cerrados),
        activos: parseInt(r.activos)
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching QAR dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats', error: error.message });
  }
});

// ============================================================================
// GET QAR Dashboard — defined before /:id so it takes priority
// ============================================================================
router.get('/dashboard', async (req, res) => {
  try {
    const { start_date, end_date, deptId, clientId, severityId } = req.query;
    const dateFilter = start_date && end_date
      ? `AND qa.created_at BETWEEN '${start_date}' AND '${end_date}'`
      : `AND qa.created_at >= NOW() - INTERVAL '90 days'`;
    const deptFilter   = deptId     ? `AND qa.department_id = ${parseInt(deptId)}`   : '';
    const clientFilter = clientId   ? `AND qa.client_id = ${parseInt(clientId)}`     : '';
    const sevFilter    = severityId ? `AND qa.severity_id = ${parseInt(severityId)}` : '';
    const baseFilter = `${dateFilter} ${deptFilter} ${clientFilter} ${sevFilter}`;

    const topBarResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE TRUE) AS total,
        COUNT(*) FILTER (WHERE status IN ('EMITIDO','RESPONDIDO')) AS activos,
        COUNT(*) FILTER (WHERE status = 'CERRADO') AS cerrados,
        COUNT(*) FILTER (WHERE status = 'RECHAZADO') AS rechazados,
        COUNT(*) FILTER (WHERE is2.name IN ('Crítico','ALTA')) AS alta_severidad,
        COUNT(*) FILTER (WHERE
          qa.response_date IS NOT NULL AND
          EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600 <= sla.response_hours
        ) AS sla_response_ok,
        COUNT(*) FILTER (WHERE qa.response_date IS NOT NULL) AS total_responded,
        COUNT(*) FILTER (WHERE
          qa.closed_at IS NOT NULL AND
          EXTRACT(EPOCH FROM (qa.closed_at - qa.created_at))/3600 <= sla.closure_hours
        ) AS sla_closure_ok,
        COUNT(*) FILTER (WHERE qa.closed_at IS NOT NULL) AS total_closed,
        COUNT(*) FILTER (WHERE
          qa.status = 'EMITIDO' AND qa.response_date IS NULL AND
          EXTRACT(EPOCH FROM (NOW() - qa.created_at))/3600 > sla.response_hours
        ) AS vencidas_sin_respuesta,
        AVG(EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600)
          FILTER (WHERE qa.response_date IS NOT NULL) AS avg_response_hours,
        AVG(EXTRACT(EPOCH FROM (qa.closed_at - qa.created_at))/3600)
          FILTER (WHERE qa.closed_at IS NOT NULL) AS avg_closure_hours,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADO' AND qa.validation_status IS NULL) AS closed_no_validation
      FROM quality_alerts qa
      JOIN inspection_severities is2 ON qa.severity_id = is2.id
      LEFT JOIN qar_sla_config sla ON sla.severity_id = qa.severity_id
      WHERE 1=1 ${baseFilter}
    `);
    const tb = topBarResult.rows[0];
    const slaResponsePct = tb.total_responded > 0 ? Math.round((tb.sla_response_ok / tb.total_responded) * 100) : null;
    const slaClosurePct = tb.total_closed > 0 ? Math.round((tb.sla_closure_ok / tb.total_closed) * 100) : null;

    const volByMonthResult = await query(`
      SELECT TO_CHAR(qa.created_at, 'YYYY-MM') AS month,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADO') AS cerrados,
        COUNT(*) FILTER (WHERE qa.status = 'RECHAZADO') AS rechazados,
        COUNT(*) FILTER (WHERE is2.name IN ('Crítico','ALTA')) AS alta_sev
      FROM quality_alerts qa
      JOIN inspection_severities is2 ON qa.severity_id = is2.id
      WHERE 1=1 ${baseFilter}
      GROUP BY month ORDER BY month
    `);

    const byStatusResult = await query(`
      SELECT status, COUNT(*) AS count FROM quality_alerts qa
      WHERE 1=1 ${baseFilter} GROUP BY status
    `);

    const bySeverityResult = await query(`
      SELECT is2.name AS severity, COUNT(*) AS count
      FROM quality_alerts qa JOIN inspection_severities is2 ON qa.severity_id = is2.id
      WHERE 1=1 ${baseFilter} GROUP BY is2.name, is2.id ORDER BY is2.id DESC
    `);

    const byTriggerResult = await query(`
      SELECT trigger_type, COUNT(*) AS count FROM quality_alerts qa
      WHERE 1=1 ${baseFilter} GROUP BY trigger_type
    `);

    const responseDistResult = await query(`
      SELECT is2.name AS severity,
        ROUND(AVG(EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600)::numeric,1) AS avg_response_h,
        ROUND(AVG(EXTRACT(EPOCH FROM (qa.closed_at - qa.created_at))/3600)::numeric,1) AS avg_closure_h,
        sla.response_hours AS sla_response, sla.closure_hours AS sla_closure,
        COUNT(*) FILTER (WHERE qa.response_date IS NOT NULL) AS total_resp
      FROM quality_alerts qa JOIN inspection_severities is2 ON qa.severity_id = is2.id
      LEFT JOIN qar_sla_config sla ON sla.severity_id = qa.severity_id
      WHERE 1=1 ${baseFilter}
      GROUP BY is2.name, is2.id, sla.response_hours, sla.closure_hours ORDER BY is2.id DESC
    `);

    const slaBySevrityResult = await query(`
      SELECT is2.name AS severity,
        COUNT(*) FILTER (WHERE qa.response_date IS NOT NULL AND
          EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600 <= sla.response_hours) AS resp_ok,
        COUNT(*) FILTER (WHERE qa.response_date IS NOT NULL AND
          EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600 > sla.response_hours) AS resp_late,
        COUNT(*) FILTER (WHERE qa.closed_at IS NOT NULL AND
          EXTRACT(EPOCH FROM (qa.closed_at - qa.created_at))/3600 <= sla.closure_hours) AS close_ok,
        COUNT(*) FILTER (WHERE qa.closed_at IS NOT NULL AND
          EXTRACT(EPOCH FROM (qa.closed_at - qa.created_at))/3600 > sla.closure_hours) AS close_late,
        sla.response_hours, sla.closure_hours
      FROM quality_alerts qa JOIN inspection_severities is2 ON qa.severity_id = is2.id
      LEFT JOIN qar_sla_config sla ON sla.severity_id = qa.severity_id
      WHERE 1=1 ${baseFilter}
      GROUP BY is2.name, is2.id, sla.response_hours, sla.closure_hours ORDER BY is2.id DESC
    `);

    const validationResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE validation_status = 'approved') AS validated_approved,
        COUNT(*) FILTER (WHERE validation_status = 'rejected') AS validated_rejected,
        COUNT(*) FILTER (WHERE status = 'CERRADO' AND validation_status IS NULL) AS closed_no_val,
        COUNT(*) FILTER (WHERE root_cause IS NOT NULL AND root_cause != '') AS with_root_cause,
        COUNT(*) FILTER (WHERE corrective_action IS NOT NULL AND corrective_action != '') AS with_ca,
        COUNT(*) AS total
      FROM quality_alerts qa WHERE 1=1 ${baseFilter}
    `);

    const byDeptResult = await query(`
      SELECT COALESCE(d.name, 'Sin depto') AS department,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADO') AS cerrados,
        COUNT(*) FILTER (WHERE qa.status = 'EMITIDO') AS emitidos,
        COUNT(*) FILTER (WHERE qa.status = 'RESPONDIDO') AS respondidos,
        COUNT(*) FILTER (WHERE is2.name IN ('Crítico','ALTA')) AS alta_sev,
        ROUND(AVG(EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600)
          FILTER (WHERE qa.response_date IS NOT NULL)::numeric,1) AS avg_response_h
      FROM quality_alerts qa LEFT JOIN departments d ON qa.department_id = d.id
      JOIN inspection_severities is2 ON qa.severity_id = is2.id
      WHERE 1=1 ${baseFilter} GROUP BY d.name ORDER BY total DESC
    `);

    const byResponsableResult = await query(`
      SELECT u.first_name || ' ' || u.last_name AS name,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADO') AS cerrados,
        COUNT(*) FILTER (WHERE qa.status IN ('EMITIDO','RESPONDIDO')) AS activos,
        COUNT(*) FILTER (WHERE qa.status = 'EMITIDO' AND
          EXTRACT(EPOCH FROM (NOW() - qa.created_at))/3600 > COALESCE(sla.response_hours, 24)) AS vencidas,
        ROUND(AVG(EXTRACT(EPOCH FROM (qa.response_date - qa.created_at))/3600)
          FILTER (WHERE qa.response_date IS NOT NULL)::numeric,1) AS avg_response_h
      FROM quality_alerts qa LEFT JOIN users u ON qa.assigned_to = u.id
      LEFT JOIN qar_sla_config sla ON sla.severity_id = qa.severity_id
      WHERE 1=1 ${baseFilter} GROUP BY u.first_name, u.last_name ORDER BY total DESC LIMIT 10
    `);

    const byClientResult = await query(`
      SELECT COALESCE(c.name, 'Sin cliente') AS client,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE qa.status = 'CERRADO') AS cerrados,
        COUNT(*) FILTER (WHERE is2.name IN ('Crítico','ALTA')) AS alta_sev,
        ROUND(AVG(EXTRACT(EPOCH FROM (qa.closed_at - qa.created_at))/3600)
          FILTER (WHERE qa.closed_at IS NOT NULL)::numeric,1) AS avg_closure_h
      FROM quality_alerts qa LEFT JOIN clients c ON qa.client_id = c.id
      JOIN inspection_severities is2 ON qa.severity_id = is2.id
      WHERE 1=1 ${baseFilter} GROUP BY c.name ORDER BY total DESC
    `);

    const riskResult = await query(`
      SELECT qa.id, qa.alert_number, qa.title, qa.status, qa.created_at,
        is2.name AS severity,
        COALESCE(u.first_name || ' ' || u.last_name, 'Sin asignar') AS responsable,
        COALESCE(d.name, 'Sin depto') AS department,
        EXTRACT(EPOCH FROM (NOW() - qa.created_at))/3600 AS age_hours,
        sla.response_hours, sla.closure_hours,
        CASE WHEN qa.response_date IS NULL AND
          EXTRACT(EPOCH FROM (NOW() - qa.created_at))/3600 > COALESCE(sla.response_hours, 24)
          THEN true ELSE false END AS overdue_response,
        CASE WHEN qa.status = 'CERRADO' AND qa.validation_status IS NULL
          THEN true ELSE false END AS closed_no_val
      FROM quality_alerts qa
      JOIN inspection_severities is2 ON qa.severity_id = is2.id
      LEFT JOIN users u ON qa.assigned_to = u.id
      LEFT JOIN departments d ON qa.department_id = d.id
      LEFT JOIN qar_sla_config sla ON sla.severity_id = qa.severity_id
      WHERE qa.status IN ('EMITIDO','RESPONDIDO')
        OR (qa.status = 'CERRADO' AND qa.validation_status IS NULL)
      ORDER BY
        CASE is2.name WHEN 'Crítico' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'Mayor' THEN 3 ELSE 4 END,
        qa.created_at ASC
      LIMIT 20
    `);

    const recentResult = await query(`
      SELECT qa.id, qa.alert_number, qa.title, qa.status, qa.created_at,
        qa.response_date, qa.closed_at, qa.validation_status,
        is2.name AS severity,
        COALESCE(u.first_name || ' ' || u.last_name, 'Sin asignar') AS responsable,
        COALESCE(d.name, 'Sin depto') AS department,
        COALESCE(c.name, 'Sin cliente') AS client,
        EXTRACT(EPOCH FROM (NOW() - qa.created_at))/3600 AS age_hours,
        sla.response_hours, sla.closure_hours
      FROM quality_alerts qa
      JOIN inspection_severities is2 ON qa.severity_id = is2.id
      LEFT JOIN users u ON qa.assigned_to = u.id
      LEFT JOIN departments d ON qa.department_id = d.id
      LEFT JOIN clients c ON qa.client_id = c.id
      LEFT JOIN qar_sla_config sla ON sla.severity_id = qa.severity_id
      ORDER BY qa.created_at DESC LIMIT 100
    `);

    const slaConfigResult = await query(`
      SELECT sc.*, is2.name AS severity_name FROM qar_sla_config sc
      JOIN inspection_severities is2 ON sc.severity_id = is2.id ORDER BY is2.id DESC
    `);

    res.json({
      success: true,
      data: {
        topBar: {
          total: parseInt(tb.total), activos: parseInt(tb.activos),
          cerrados: parseInt(tb.cerrados), rechazados: parseInt(tb.rechazados),
          altaSeveridad: parseInt(tb.alta_severidad),
          slaResponsePct, slaClosurePct,
          vencidasSinRespuesta: parseInt(tb.vencidas_sin_respuesta),
          avgResponseHours: tb.avg_response_hours ? parseFloat(parseFloat(tb.avg_response_hours).toFixed(1)) : null,
          avgClosureHours: tb.avg_closure_hours ? parseFloat(parseFloat(tb.avg_closure_hours).toFixed(1)) : null,
          closedNoValidation: parseInt(tb.closed_no_validation)
        },
        volByMonth: volByMonthResult.rows.map(r => ({
          month: r.month, total: parseInt(r.total), cerrados: parseInt(r.cerrados),
          rechazados: parseInt(r.rechazados), altaSev: parseInt(r.alta_sev)
        })),
        byStatus: byStatusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
        bySeverity: bySeverityResult.rows.map(r => ({ severity: r.severity, count: parseInt(r.count) })),
        byTrigger: byTriggerResult.rows.map(r => ({ trigger: r.trigger_type, count: parseInt(r.count) })),
        responseDistribution: responseDistResult.rows.map(r => ({
          severity: r.severity,
          avgResponseH: r.avg_response_h ? parseFloat(r.avg_response_h) : null,
          avgClosureH: r.avg_closure_h ? parseFloat(r.avg_closure_h) : null,
          slaResponse: r.sla_response ? parseInt(r.sla_response) : null,
          slaClosure: r.sla_closure ? parseInt(r.sla_closure) : null,
          totalResp: parseInt(r.total_resp)
        })),
        slaBySeverity: slaBySevrityResult.rows.map(r => ({
          severity: r.severity,
          respOk: parseInt(r.resp_ok), respLate: parseInt(r.resp_late),
          closeOk: parseInt(r.close_ok), closeLate: parseInt(r.close_late),
          slaResponse: r.response_hours ? parseInt(r.response_hours) : null,
          slaClosure: r.closure_hours ? parseInt(r.closure_hours) : null
        })),
        quality: {
          validatedApproved: parseInt(validationResult.rows[0].validated_approved),
          validatedRejected: parseInt(validationResult.rows[0].validated_rejected),
          closedNoVal: parseInt(validationResult.rows[0].closed_no_val),
          withRootCause: parseInt(validationResult.rows[0].with_root_cause),
          withCA: parseInt(validationResult.rows[0].with_ca),
          total: parseInt(validationResult.rows[0].total)
        },
        byDept: byDeptResult.rows.map(r => ({
          department: r.department, total: parseInt(r.total), cerrados: parseInt(r.cerrados),
          emitidos: parseInt(r.emitidos), respondidos: parseInt(r.respondidos),
          altaSev: parseInt(r.alta_sev),
          avgResponseH: r.avg_response_h ? parseFloat(r.avg_response_h) : null
        })),
        byResponsable: byResponsableResult.rows.map(r => ({
          name: r.name || 'Sin asignar', total: parseInt(r.total),
          cerrados: parseInt(r.cerrados), activos: parseInt(r.activos),
          vencidas: parseInt(r.vencidas),
          avgResponseH: r.avg_response_h ? parseFloat(r.avg_response_h) : null
        })),
        byClient: byClientResult.rows.map(r => ({
          client: r.client, total: parseInt(r.total), cerrados: parseInt(r.cerrados),
          altaSev: parseInt(r.alta_sev),
          avgClosureH: r.avg_closure_h ? parseFloat(r.avg_closure_h) : null
        })),
        riskItems: riskResult.rows.map(r => ({
          id: r.id, alertNumber: r.alert_number, title: r.title,
          status: r.status, severity: r.severity, responsable: r.responsable,
          department: r.department,
          ageHours: parseFloat(parseFloat(r.age_hours).toFixed(1)),
          slaResponse: r.response_hours ? parseInt(r.response_hours) : null,
          slaClosure: r.closure_hours ? parseInt(r.closure_hours) : null,
          overdueResponse: r.overdue_response, closedNoVal: r.closed_no_val
        })),
        recentQARs: recentResult.rows.map(r => ({
          id: r.id, alertNumber: r.alert_number, title: r.title,
          status: r.status, severity: r.severity, responsable: r.responsable,
          department: r.department, client: r.client,
          createdAt: r.created_at, responseDate: r.response_date,
          closedAt: r.closed_at, validationStatus: r.validation_status,
          ageHours: parseFloat(parseFloat(r.age_hours).toFixed(1)),
          slaResponse: r.response_hours ? parseInt(r.response_hours) : null,
          slaClosure: r.closure_hours ? parseInt(r.closure_hours) : null
        })),
        slaConfig: slaConfigResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching QAR dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE SLA config (bulk) — must be before /:id
router.put('/sla-config', async (req, res) => {
  try {
    const { configs } = req.body; // [{ severity_id, response_hours, closure_hours }]
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ success: false, message: 'configs array requerido' });
    }
    for (const cfg of configs) {
      await query(
        'UPDATE qar_sla_config SET response_hours = $1, closure_hours = $2 WHERE severity_id = $3',
        [cfg.response_hours, cfg.closure_hours, cfg.severity_id]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating SLA config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single QAR with full details
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Department name helper
    const deptNames = {
      1: 'Producción', 2: 'Calidad', 3: 'Ingeniería',
      4: 'Mantenimiento', 5: 'Logística', 6: 'Proveedor'
    };

    // Get QAR
    const qarResult = await query(`
      SELECT qa.*,
             c.name as client_name,
             p.project_number, p.project_name,
             cp.part_number, cp.part_name, cp.capture_display_name,
             s.name as severity_name, s.code as severity_code, s.color as severity_color,
             COALESCE(qa.assigned_to_name, u1.first_name || ' ' || u1.last_name) as assigned_to_name,
             COALESCE(qa.reported_by_name, u2.first_name || ' ' || u2.last_name) as reported_by_name,
             COALESCE(qa.responded_by_name, u3.first_name || ' ' || u3.last_name) as responded_by_name,
             COALESCE(qa.validated_by_name, u4.first_name || ' ' || u4.last_name) as validated_by_name
      FROM quality_alerts qa
      LEFT JOIN clients c ON qa.client_id = c.id
      LEFT JOIN projects p ON qa.project_id = p.id
      LEFT JOIN client_parts cp ON qa.part_id = cp.id
      LEFT JOIN inspection_severities s ON qa.severity_id = s.id
      LEFT JOIN users u1 ON qa.assigned_to = u1.id
      LEFT JOIN users u2 ON qa.reported_by = u2.id
      LEFT JOIN users u3 ON qa.responded_by = u3.id
      LEFT JOIN users u4 ON qa.validated_by = u4.id
      WHERE qa.id = $1
    `, [id]);

    if (qarResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'QAR not found' });
    }

    const qar = qarResult.rows[0];
    qar.department_name = deptNames[qar.department_id] || 'N/A';

    // Get linked defects with full info
    const defectsResult = await query(`
      SELECT de.*, dt.name as defect_name, dt.code as defect_code,
             st.name as station_name, st.code as station_code,
             u.first_name || ' ' || u.last_name as inspector_name
      FROM qar_defects qd
      JOIN defect_entries_v2 de ON qd.defect_entry_id = de.id
      JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN inspection_stations st ON de.station_id = st.id
      LEFT JOIN users u ON de.inspector_id = u.id
      WHERE qd.qar_id = $1
      ORDER BY de.created_at DESC
    `, [id]);

    // Get attachments for all defects in this QAR
    const defectIds = defectsResult.rows.map(d => d.id);
    let defectAttachments = [];
    if (defectIds.length > 0) {
      const attachResult = await query(`
        SELECT da.*, u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM defect_attachments da
        LEFT JOIN users u ON da.uploaded_by = u.id
        WHERE da.defect_id = ANY($1)
        ORDER BY da.uploaded_at DESC
      `, [defectIds]);
      defectAttachments = attachResult.rows;
    }

    // Attach attachments to each defect
    const defectsWithAttachments = defectsResult.rows.map(d => ({
      ...d,
      attachments: defectAttachments.filter(a => a.defect_id === d.id)
    }));

    // Get recipients with type (use frozen name or fallback to JOIN)
    const recipientsResult = await query(`
      SELECT qr.*,
             COALESCE(qr.user_name, u.first_name || ' ' || u.last_name) as user_name,
             u.first_name, u.last_name, u.email, u.role
      FROM qar_recipients qr
      LEFT JOIN users u ON qr.user_id = u.id
      WHERE qr.qar_id = $1
      ORDER BY qr.recipient_type, COALESCE(qr.user_name, u.first_name)
    `, [id]);

    // Get comments (oldest first for timeline) - use frozen name or fallback to JOIN
    const commentsResult = await query(`
      SELECT qc.*,
             COALESCE(qc.user_name, u.first_name || ' ' || u.last_name) as user_name
      FROM qar_comments qc
      LEFT JOIN users u ON qc.user_id = u.id
      WHERE qc.qar_id = $1
      ORDER BY qc.created_at ASC
    `, [id]);

    res.json({
      success: true,
      qar: transformToCamelCase(qar),
      defects: transformToCamelCase(defectsWithAttachments),
      recipients: transformToCamelCase(recipientsResult.rows),
      comments: transformToCamelCase(commentsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching QAR:', error);
    res.status(500).json({ success: false, message: 'Error fetching QAR' });
  }
});

// CREATE QAR
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
    status = 'EMITIDO'
  } = req.body;

  try {
    // Generate QAR number
    const numberResult = await query('SELECT generate_qar_number() as alert_number');
    const alertNumber = numberResult.rows[0].alert_number;

    // CONGELAMIENTO DE USUARIOS: Obtener nombres para guardar
    const reportedByName = req.user.firstName && req.user.lastName
      ? `${req.user.firstName} ${req.user.lastName}`.trim()
      : req.user.name || req.user.email || `Usuario ${req.user.id}`;

    let assignedToName = null;
    if (assignedTo) {
      const assignedUserResult = await query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [assignedTo]
      );
      if (assignedUserResult.rows.length > 0) {
        const u = assignedUserResult.rows[0];
        assignedToName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `Usuario ${assignedTo}`;
      }
    }

    // Create QAR with frozen names
    const result = await query(`
      INSERT INTO quality_alerts (
        alert_number, client_id, project_id, part_id, title, description,
        severity_id, department_id, trigger_type, trigger_defect_count, trigger_period_hours,
        assigned_to, assigned_to_name, reported_by, reported_by_name,
        photo_ok_path, photo_nok_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      alertNumber, clientId, projectId, partId, title, description,
      severityId, departmentId, triggerType, triggerDefectCount, triggerPeriodHours,
      assignedTo, assignedToName, req.user.id, reportedByName,
      photoOkPath, photoNokPath, status
    ]);

    const qarId = result.rows[0].id;

    // Link defects and update defect_entries with qar_id
    // Also collect unit_ids for traceability
    const affectedUnitIds = new Set();

    for (const defectId of defectIds) {
      await query(
        'INSERT INTO qar_defects (qar_id, defect_entry_id) VALUES ($1, $2)',
        [qarId, defectId]
      );
      // Update defect entry to reference QAR
      await query(
        'UPDATE defect_entries_v2 SET qar_id = $1 WHERE id = $2',
        [qarId, defectId]
      );

      // Get unit_id from defect for traceability
      const defectUnit = await query('SELECT unit_id FROM defect_entries_v2 WHERE id = $1', [defectId]);
      if (defectUnit.rows.length > 0 && defectUnit.rows[0].unit_id) {
        affectedUnitIds.add(defectUnit.rows[0].unit_id);
      }
    }

    // === TRAZABILIDAD: Registrar QAR_CREATED en unit_history ===
    for (const unitId of affectedUnitIds) {
      await query(`
        INSERT INTO unit_history (
          unit_id, event_type, source_table, source_id, description, performed_by, metadata
        ) VALUES ($1, 'QAR_CREATED', 'quality_alerts', $2, $3, $4, $5)
      `, [
        unitId,
        qarId,
        `QAR ${alertNumber} emitido`,
        req.user.id,
        JSON.stringify({ qarId, alertNumber, defectCount: defectIds.length })
      ]);
    }

    // Mark any declined history as now having a QAR
    if (defectIds.length > 0) {
      await query(`
        UPDATE qar_declined_history
        SET qar_created_later = true, qar_id = $1
        WHERE defect_ids ?| $2::text[]
          AND qar_created_later = false
      `, [qarId, defectIds.map(String)]);
    }

    // Add response recipients with frozen names
    for (const userId of responseRecipientIds) {
      const userResult = await query('SELECT first_name, last_name, email FROM users WHERE id = $1', [userId]);
      const userName = userResult.rows.length > 0
        ? `${userResult.rows[0].first_name || ''} ${userResult.rows[0].last_name || ''}`.trim() || userResult.rows[0].email
        : `Usuario ${userId}`;
      await query(
        "INSERT INTO qar_recipients (qar_id, user_id, user_name, recipient_type) VALUES ($1, $2, $3, 'response')",
        [qarId, userId, userName]
      );
    }

    // Add validation recipients with frozen names
    for (const userId of validationRecipientIds) {
      const userResult = await query('SELECT first_name, last_name, email FROM users WHERE id = $1', [userId]);
      const userName = userResult.rows.length > 0
        ? `${userResult.rows[0].first_name || ''} ${userResult.rows[0].last_name || ''}`.trim() || userResult.rows[0].email
        : `Usuario ${userId}`;
      await query(
        "INSERT INTO qar_recipients (qar_id, user_id, user_name, recipient_type) VALUES ($1, $2, $3, 'validation')",
        [qarId, userId, userName]
      );
    }

    // Add creation comment with frozen name
    await query(
      'INSERT INTO qar_comments (qar_id, user_id, user_name, comment, comment_type) VALUES ($1, $2, $3, $4, $5)',
      [qarId, req.user.id, reportedByName, 'QAR emitido', 'status_change']
    );

    res.json({
      success: true,
      qar: transformToCamelCase(result.rows[0]),
      message: `QAR ${alertNumber} emitido exitosamente`
    });
  } catch (error) {
    console.error('Error creating QAR:', error);
    res.status(500).json({ success: false, message: 'Error creating QAR' });
  }
});

// UPDATE QAR
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
    recipientIds
  } = req.body;

  try {
    const oldQar = await query('SELECT status FROM quality_alerts WHERE id = $1', [id]);
    const oldStatus = oldQar.rows[0]?.status;

    const result = await query(`
      UPDATE quality_alerts SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        assigned_to = COALESCE($4, assigned_to),
        photo_ok_path = COALESCE($5, photo_ok_path),
        photo_nok_path = COALESCE($6, photo_nok_path),
        resolution_notes = COALESCE($7, resolution_notes),
        root_cause = COALESCE($8, root_cause),
        corrective_action = COALESCE($9, corrective_action),
        updated_at = CURRENT_TIMESTAMP,
        resolved_at = CASE WHEN $3 = 'RESOLVED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        closed_at = CASE WHEN $3 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE id = $10
      RETURNING *
    `, [title, description, status, assignedTo, photoOkPath, photoNokPath, resolutionNotes, rootCause, correctiveAction, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'QAR not found' });
    }

    // Update recipients if provided
    if (recipientIds) {
      await query('DELETE FROM qar_recipients WHERE qar_id = $1', [id]);
      for (const userId of recipientIds) {
        await query('INSERT INTO qar_recipients (qar_id, user_id) VALUES ($1, $2)', [id, userId]);
      }
    }

    // Log status change with frozen name
    if (status && status !== oldStatus) {
      const userName = getUserFrozenName(req.user);
      await query(
        'INSERT INTO qar_comments (qar_id, user_id, user_name, comment, comment_type) VALUES ($1, $2, $3, $4, $5)',
        [id, req.user.id, userName, `Estado cambiado de ${oldStatus} a ${status}`, 'status_change']
      );
    }

    res.json({
      success: true,
      qar: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating QAR:', error);
    res.status(500).json({ success: false, message: 'Error updating QAR' });
  }
});

// ADD COMMENT to QAR
router.post('/:id/comments', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { comment, commentType = 'note' } = req.body;

  try {
    const userName = getUserFrozenName(req.user);
    const result = await query(`
      INSERT INTO qar_comments (qar_id, user_id, user_name, comment, comment_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, req.user.id, userName, comment, commentType]);

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
// QAR RESPONSE (from response recipients)
// ============================================================================
router.post('/:id/respond', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rootCause, correctiveAction, resolutionNotes } = req.body;

  try {
    // Verify user is a response recipient
    const recipientCheck = await query(`
      SELECT * FROM qar_recipients
      WHERE qar_id = $1 AND user_id = $2 AND recipient_type = 'response'
    `, [id, req.user.id]);

    // Allow response even if not a recipient (admin/assigned user)
    // if (recipientCheck.rows.length === 0) {
    //   return res.status(403).json({ success: false, message: 'No autorizado para responder' });
    // }

    // Update QAR with response
    const result = await query(`
      UPDATE quality_alerts SET
        root_cause = $1,
        corrective_action = $2,
        resolution_notes = $3,
        responded_by = $4,
        response_date = CURRENT_TIMESTAMP,
        status = 'RESPONDIDO',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [rootCause, correctiveAction, resolutionNotes, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'QAR not found' });
    }

    // Add response comment with frozen name
    const responderName = getUserFrozenName(req.user);
    await query(
      'INSERT INTO qar_comments (qar_id, user_id, user_name, comment, comment_type) VALUES ($1, $2, $3, $4, $5)',
      [id, req.user.id, responderName, 'Respuesta enviada - Pendiente de validación', 'response']
    );

    // Update recipient acknowledged time
    await query(`
      UPDATE qar_recipients SET acknowledged_at = CURRENT_TIMESTAMP
      WHERE qar_id = $1 AND user_id = $2
    `, [id, req.user.id]);

    res.json({
      success: true,
      qar: transformToCamelCase(result.rows[0]),
      message: 'Respuesta registrada - Pendiente de validación'
    });
  } catch (error) {
    console.error('Error responding to QAR:', error);
    res.status(500).json({ success: false, message: 'Error al responder QAR' });
  }
});

// ============================================================================
// QAR VALIDATION (from validation recipients)
// ============================================================================
router.post('/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { approved, rejectionReason } = req.body;

  try {
    // Verify user is authorized to validate QARs (admins always can)
    const userCheck = await query('SELECT can_validate_qar, role, system_role FROM users WHERE id = $1', [req.user.id]);
    const user = userCheck.rows[0];
    const isAdmin = user?.role === 'admin' || user?.system_role === 'admin';
    const canValidate = isAdmin || user?.can_validate_qar || false;

    if (!canValidate) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para validar QARs. Contacta a un administrador.'
      });
    }

    // Check if QAR is in RESPONDIDO status
    const qarCheck = await query('SELECT status FROM quality_alerts WHERE id = $1', [id]);
    if (qarCheck.rows[0]?.status !== 'RESPONDIDO') {
      return res.status(400).json({
        success: false,
        message: 'El QAR debe estar en estado RESPONDIDO para validar'
      });
    }

    if (approved) {
      // Approve and close QAR with frozen name
      const validatorName = getUserFrozenName(req.user);
      const result = await query(`
        UPDATE quality_alerts SET
          validated_by = $1,
          validated_by_name = $2,
          validation_date = CURRENT_TIMESTAMP,
          validation_status = 'approved',
          status = 'CERRADO',
          closed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [req.user.id, validatorName, id]);

      // Add approval comment with frozen name
      await query(
        'INSERT INTO qar_comments (qar_id, user_id, user_name, comment, comment_type) VALUES ($1, $2, $3, $4, $5)',
        [id, req.user.id, validatorName, 'QAR validado y cerrado', 'validation']
      );

      res.json({
        success: true,
        qar: transformToCamelCase(result.rows[0]),
        message: 'QAR validado y cerrado exitosamente'
      });
    } else {
      // Reject - send back to response recipients with frozen name
      const validatorName = getUserFrozenName(req.user);
      const result = await query(`
        UPDATE quality_alerts SET
          validated_by = $1,
          validated_by_name = $2,
          validation_date = CURRENT_TIMESTAMP,
          validation_status = 'rejected',
          status = 'RECHAZADO',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [req.user.id, validatorName, id]);

      // Add rejection comment with frozen name
      await query(
        'INSERT INTO qar_comments (qar_id, user_id, user_name, comment, comment_type) VALUES ($1, $2, $3, $4, $5)',
        [id, req.user.id, validatorName, `Rechazado: ${rejectionReason || 'Sin motivo especificado'}`, 'rejection']
      );

      res.json({
        success: true,
        qar: transformToCamelCase(result.rows[0]),
        message: 'QAR rechazado - Devuelto para corrección'
      });
    }
  } catch (error) {
    console.error('Error validating QAR:', error);
    res.status(500).json({ success: false, message: 'Error al validar QAR' });
  }
});

// ============================================================================
// QAR DECLINED TRACKING
// ============================================================================

// Log when user declines to emit a QAR
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
      INSERT INTO qar_declined_history (
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
      message: 'Declined QAR logged successfully'
    });
  } catch (error) {
    console.error('Error logging declined QAR:', error);
    res.status(500).json({ success: false, message: 'Error logging declined QAR' });
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
      FROM qar_declined_history qdh
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

// ============================================================================

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
// QAR RESPONSE FILE ATTACHMENTS
// ============================================================================

const qarResponseStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/qar-response');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'qar-resp-' + uniqueSuffix + ext);
  }
});

const qarResponseUpload = multer({
  storage: qarResponseStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Se aceptan: imágenes, PDF, Word, Excel, txt.'));
    }
  }
});

// POST /qar/:id/response-files  — upload one file
router.post('/:id/response-files', authenticateToken, qarResponseUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
    }

    const { id } = req.params;

    const result = await query(
      `INSERT INTO qar_response_files (qar_id, filename, original_name, mimetype, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id]
    );

    const row = result.rows[0];
    res.json({
      success: true,
      file: {
        id: row.id,
        filename: row.filename,
        originalName: row.original_name,
        mimetype: row.mimetype,
        fileSize: row.file_size,
        url: `/uploads/qar-response/${row.filename}`,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    console.error('Error uploading response file:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al subir archivo' });
  }
});

// GET /qar/:id/response-files  — list files for this QAR response
router.get('/:id/response-files', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT rf.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM qar_response_files rf
       LEFT JOIN users u ON rf.uploaded_by = u.id
       WHERE rf.qar_id = $1
       ORDER BY rf.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      files: result.rows.map(r => ({
        id: r.id,
        filename: r.filename,
        originalName: r.original_name,
        mimetype: r.mimetype,
        fileSize: r.file_size,
        url: `/uploads/qar-response/${r.filename}`,
        uploadedByName: r.uploaded_by_name,
        createdAt: r.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching response files:', error);
    res.status(500).json({ success: false, message: 'Error al obtener archivos' });
  }
});

// DELETE /qar/:id/response-files/:fileId  — remove a file
router.delete('/:id/response-files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const result = await query(
      'SELECT * FROM qar_response_files WHERE id = $1 AND qar_id = $2',
      [fileId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    const row = result.rows[0];
    const filePath = path.join(__dirname, '../uploads/qar-response', row.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await query('DELETE FROM qar_response_files WHERE id = $1', [fileId]);

    res.json({ success: true, message: 'Archivo eliminado' });
  } catch (error) {
    console.error('Error deleting response file:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar archivo' });
  }
});

module.exports = router;
