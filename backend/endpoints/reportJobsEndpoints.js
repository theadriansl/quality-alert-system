/**
 * Report Jobs Endpoints - Async report generation queue
 * Handles heavy report generation in background with status tracking
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const authenticateToken = require('../middleware/auth');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Ensure reports directory exists
const REPORTS_DIR = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ============================================================================
// GET /report-jobs/types - List available report types
// ============================================================================
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM report_types
      WHERE is_active = true
      ORDER BY display_order
    `);
    res.json({ success: true, types: result.rows.map(transformToCamelCase) });
  } catch (error) {
    console.error('Error fetching report types:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tipos de reporte' });
  }
});

// ============================================================================
// GET /report-jobs - List user's report jobs
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;

    let sql = `
      SELECT rj.*, rt.name as report_type_name
      FROM report_jobs rj
      LEFT JOIN report_types rt ON rt.code = rj.report_type
      WHERE rj.created_by = $1
    `;
    const params = [req.user.id];

    if (status) {
      sql += ` AND rj.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY rj.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);
    res.json({ success: true, jobs: result.rows.map(transformToCamelCase) });
  } catch (error) {
    console.error('Error fetching report jobs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener trabajos de reporte' });
  }
});

// ============================================================================
// POST /report-jobs - Create new report job (enqueue)
// ============================================================================
router.post('/', authenticateToken, async (req, res) => {
  const { reportType, params: reportParams, fileFormat = 'xlsx' } = req.body;

  if (!reportType) {
    return res.status(400).json({ success: false, message: 'Tipo de reporte requerido' });
  }

  try {
    // Verify report type exists
    const typeRes = await query('SELECT * FROM report_types WHERE code = $1 AND is_active = true', [reportType]);
    if (typeRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Tipo de reporte no válido' });
    }
    const reportTypeDef = typeRes.rows[0];

    // Create job
    const result = await query(`
      INSERT INTO report_jobs (report_type, report_name, params, file_format, created_by, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING *
    `, [reportType, reportTypeDef.name, JSON.stringify(reportParams || {}), fileFormat, req.user.id]);

    const job = transformToCamelCase(result.rows[0]);

    // Start processing in background (non-blocking)
    setImmediate(() => processReportJob(job.id));

    res.json({ success: true, job, message: 'Reporte encolado, se procesará en segundo plano' });
  } catch (error) {
    console.error('Error creating report job:', error);
    res.status(500).json({ success: false, message: 'Error al crear trabajo de reporte' });
  }
});

// ============================================================================
// GET /report-jobs/:id - Get job status
// ============================================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT rj.*, rt.name as report_type_name
      FROM report_jobs rj
      LEFT JOIN report_types rt ON rt.code = rj.report_type
      WHERE rj.id = $1 AND rj.created_by = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trabajo no encontrado' });
    }

    res.json({ success: true, job: transformToCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error fetching report job:', error);
    res.status(500).json({ success: false, message: 'Error al obtener trabajo de reporte' });
  }
});

// ============================================================================
// GET /report-jobs/:id/download - Download completed report
// ============================================================================
router.get('/:id/download', async (req, res) => {
  try {
    // Accept token from query parameter for window.open() downloads
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    let userId;

    // Check if it's a fake token (for development)
    if (token.startsWith('fake-jwt-token-')) {
      userId = parseInt(token.replace('fake-jwt-token-', ''));
    } else {
      // Verify JWT token
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const result = await query(`
      SELECT * FROM report_jobs
      WHERE id = $1 AND created_by = $2 AND status = 'COMPLETED'
    `, [req.params.id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reporte no disponible' });
    }

    const job = result.rows[0];
    const filePath = job.file_path;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    const fileName = `${job.report_type}_${job.id}.${job.file_format}`;
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ success: false, message: 'Error al descargar reporte' });
  }
});

// ============================================================================
// DELETE /report-jobs/:id - Cancel/delete job
// ============================================================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      DELETE FROM report_jobs
      WHERE id = $1 AND created_by = $2 AND status IN ('PENDING', 'COMPLETED', 'FAILED')
      RETURNING *
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No se puede eliminar este trabajo' });
    }

    // Delete file if exists
    const job = result.rows[0];
    if (job.file_path && fs.existsSync(job.file_path)) {
      fs.unlinkSync(job.file_path);
    }

    res.json({ success: true, message: 'Trabajo eliminado' });
  } catch (error) {
    console.error('Error deleting report job:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar trabajo' });
  }
});

// ============================================================================
// REPORT PROCESSOR - Background job processing
// ============================================================================
async function processReportJob(jobId) {
  console.log(`[ReportJob] Starting job ${jobId}`);

  try {
    // Mark as processing
    await query(`
      UPDATE report_jobs SET status = 'PROCESSING', started_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [jobId]);

    // Get job details
    const jobRes = await query('SELECT * FROM report_jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) return;

    const job = jobRes.rows[0];
    const params = job.params || {};

    // Generate report based on type
    let filePath;
    switch (job.report_type) {
      case 'hospital_defects':
        filePath = await generateHospitalDefectsReport(jobId, params);
        break;
      case 'mrb_campaigns':
        filePath = await generateMRBCampaignsReport(jobId, params);
        break;
      case 'mrb_inspection':
        filePath = await generateMRBInspectionReport(jobId, params);
        break;
      case '8d_reports':
        filePath = await generate8DReport(jobId, params);
        break;
      case 'qar_list':
        filePath = await generateQARReport(jobId, params);
        break;
      case 'production_summary':
        filePath = await generateProductionReport(jobId, params);
        break;
      case 'audit_findings':
        filePath = await generateAuditReport(jobId, params);
        break;
      case 'station_traceability':
        filePath = await generateStationTraceabilityReport(jobId, params);
        break;
      default:
        throw new Error(`Tipo de reporte no soportado: ${job.report_type}`);
    }

    // Get file size
    const stats = fs.statSync(filePath);

    // Mark as completed
    await query(`
      UPDATE report_jobs
      SET status = 'COMPLETED', file_path = $2, file_size = $3, progress = 100, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [jobId, filePath, stats.size]);

    console.log(`[ReportJob] Completed job ${jobId}: ${filePath}`);
  } catch (error) {
    console.error(`[ReportJob] Failed job ${jobId}:`, error);
    await query(`
      UPDATE report_jobs SET status = 'FAILED', error_message = $2, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [jobId, error.message]);
  }
}

// Helper to update progress
async function updateProgress(jobId, progress) {
  await query('UPDATE report_jobs SET progress = $2 WHERE id = $1', [jobId, progress]);
}

// ============================================================================
// REPORT GENERATORS
// ============================================================================

async function generateHospitalDefectsReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Defectos Hospital');

  await updateProgress(jobId, 10);

  // Build query
  let sql = `
    SELECT d.*,
           dt.name as defect_type_name,
           cp.part_number,
           s.name as station_name,
           sh.name as shift_name,
           disp.name as disposition_name,
           CONCAT(u.first_name, ' ', u.last_name) as inspector_name
    FROM defect_entries_v2 d
    LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
    LEFT JOIN client_parts cp ON d.part_id = cp.id
    LEFT JOIN inspection_stations s ON d.station_id = s.id
    LEFT JOIN inspection_shifts sh ON d.shift_id = sh.id
    LEFT JOIN inspection_dispositions disp ON d.disposition_id = disp.id
    LEFT JOIN users u ON d.inspector_id = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND d.created_at >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND d.created_at <= $${queryParams.length}::date + INTERVAL '1 day'`;
  }
  if (params.status) {
    queryParams.push(params.status);
    sql += ` AND d.status = $${queryParams.length}`;
  }

  sql += ' ORDER BY d.created_at DESC LIMIT 10000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  // Headers
  sheet.columns = [
    { header: 'Entry #', key: 'entry_number', width: 18 },
    { header: 'Fecha', key: 'created_at', width: 12 },
    { header: 'Serial', key: 'serial_number', width: 20 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'Defecto', key: 'defect_type_name', width: 20 },
    { header: 'Estación', key: 'station_name', width: 15 },
    { header: 'Turno', key: 'shift_name', width: 10 },
    { header: 'Inspector', key: 'inspector_name', width: 20 },
    { header: 'Disposición', key: 'disposition_name', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notas', key: 'notes', width: 30 }
  ];

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data
  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `hospital_defects_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

async function generateMRBCampaignsReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Campañas MRB');

  await updateProgress(jobId, 10);

  let sql = `
    SELECT mc.*,
           c.name as client_name,
           p.project_name,
           cp.part_number,
           CONCAT(u.first_name, ' ', u.last_name) as created_by_name
    FROM mrb_campaigns mc
    LEFT JOIN clients c ON mc.client_id = c.id
    LEFT JOIN projects p ON mc.project_id = p.id
    LEFT JOIN client_parts cp ON mc.part_id = cp.id
    LEFT JOIN users u ON mc.created_by = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND mc.created_at >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND mc.created_at <= $${queryParams.length}::date + INTERVAL '1 day'`;
  }

  sql += ' ORDER BY mc.created_at DESC LIMIT 5000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  sheet.columns = [
    { header: 'Campaña', key: 'campaign_number', width: 15 },
    { header: 'Título', key: 'title', width: 30 },
    { header: 'Cliente', key: 'client_name', width: 20 },
    { header: 'Proyecto', key: 'project_name', width: 20 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Qty Total', key: 'qty_total', width: 10 },
    { header: 'Inspeccionados', key: 'qty_inspected', width: 12 },
    { header: 'OK', key: 'qty_ok', width: 8 },
    { header: 'NOK', key: 'qty_nok', width: 8 },
    { header: 'Scrap', key: 'qty_scrap', width: 8 },
    { header: 'Rework', key: 'qty_rework', width: 8 },
    { header: 'Creado', key: 'created_at', width: 12 },
    { header: 'Creado por', key: 'created_by_name', width: 18 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `mrb_campaigns_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

async function generateMRBInspectionReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inspección MRB');

  await updateProgress(jobId, 10);

  if (!params.mrbCampaignId) {
    throw new Error('Se requiere ID de campaña MRB');
  }

  // Get campaign info
  const campRes = await query('SELECT * FROM mrb_campaigns WHERE id = $1', [params.mrbCampaignId]);
  if (campRes.rows.length === 0) throw new Error('Campaña no encontrada');
  const campaign = campRes.rows[0];

  await updateProgress(jobId, 20);

  // Get all serials with inspection results
  const sql = `
    SELECT
      mas.serial_number,
      cp.part_number,
      mas.inspected,
      mas.inspection_result,
      mas.inspected_at,
      mas.notes,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'round', x.round,
          'result', x.result,
          'date', x.date,
          'inspector', x.inspector
        ) ORDER BY x.round)
        FROM (
          SELECT
            COALESCE(o.inspection_round, 1) as round,
            'OK' as result,
            o.created_at as date,
            CONCAT(u.first_name, ' ', u.last_name) as inspector
          FROM mrb_ok_entries o
          LEFT JOIN users u ON o.inspector_id = u.id
          WHERE o.mrb_campaign_id = $1 AND UPPER(o.serial_number) = UPPER(mas.serial_number)
          UNION ALL
          SELECT
            COALESCE(d.inspection_round, 1) as round,
            'NOK' as result,
            d.created_at as date,
            CONCAT(u.first_name, ' ', u.last_name) as inspector
          FROM defect_entries_v2 d
          LEFT JOIN users u ON d.inspector_id = u.id
          WHERE d.mrb_campaign_id = $1 AND UPPER(d.serial_number) = UPPER(mas.serial_number)
        ) x),
        '[]'::json
      ) as inspections
    FROM mrb_affected_serials mas
    LEFT JOIN client_parts cp ON mas.part_id = cp.id
    WHERE mas.mrb_campaign_id = $1
    ORDER BY mas.serial_number
  `;

  await updateProgress(jobId, 40);
  const result = await query(sql, [params.mrbCampaignId]);
  await updateProgress(jobId, 60);

  // Add campaign header
  sheet.addRow([`Campaña: ${campaign.campaign_number}`]);
  sheet.addRow([`Título: ${campaign.title || ''}`]);
  sheet.addRow([`Total Seriales: ${result.rows.length}`]);
  sheet.addRow([]);

  sheet.columns = [
    { header: 'Serial', key: 'serial_number', width: 22 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'Inspeccionado', key: 'inspected', width: 12 },
    { header: 'Resultado', key: 'inspection_result', width: 12 },
    { header: 'Fecha Insp.', key: 'inspected_at', width: 12 },
    { header: 'Rondas', key: 'rounds_count', width: 8 },
    { header: 'Último Resultado', key: 'last_result', width: 14 },
    { header: 'Notas', key: 'notes', width: 25 }
  ];

  const headerRow = sheet.getRow(5);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    const inspections = row.inspections || [];
    const lastInsp = inspections.length > 0 ? inspections[inspections.length - 1] : null;

    sheet.addRow({
      serial_number: row.serial_number,
      part_number: row.part_number,
      inspected: row.inspected ? 'Sí' : 'No',
      inspection_result: row.inspection_result || '',
      inspected_at: row.inspected_at ? new Date(row.inspected_at).toLocaleDateString() : '',
      rounds_count: inspections.length,
      last_result: lastInsp ? lastInsp.result : '',
      notes: row.notes || ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `mrb_inspection_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

async function generate8DReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reportes 8D');

  await updateProgress(jobId, 10);

  let sql = `
    SELECT er.*,
           er.supplier_name as client_name,
           CONCAT(u.first_name, ' ', u.last_name) as created_by_name
    FROM eightd_reports er
    LEFT JOIN users u ON er.created_by = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND er.created_at >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND er.created_at <= $${queryParams.length}::date + INTERVAL '1 day'`;
  }

  sql += ' ORDER BY er.created_at DESC LIMIT 5000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  sheet.columns = [
    { header: 'Folio', key: 'report_id', width: 15 },
    { header: 'Título', key: 'title', width: 35 },
    { header: 'Proveedor', key: 'client_name', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Severidad', key: 'severity', width: 12 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'D1', key: 'd1_completed', width: 5 },
    { header: 'D2', key: 'd2_completed', width: 5 },
    { header: 'D3', key: 'd3_completed', width: 5 },
    { header: 'D4', key: 'd4_completed', width: 5 },
    { header: 'D5', key: 'd5_completed', width: 5 },
    { header: 'D6', key: 'd6_completed', width: 5 },
    { header: 'D7', key: 'd7_completed', width: 5 },
    { header: 'D8', key: 'd8_completed', width: 5 },
    { header: 'Creado', key: 'created_at', width: 12 },
    { header: 'Creado por', key: 'created_by_name', width: 18 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      d1_completed: row.d1_completed ? '✓' : '',
      d2_completed: row.d2_completed ? '✓' : '',
      d3_completed: row.d3_completed ? '✓' : '',
      d4_completed: row.d4_completed ? '✓' : '',
      d5_completed: row.d5_completed ? '✓' : '',
      d6_completed: row.d6_completed ? '✓' : '',
      d7_completed: row.d7_completed ? '✓' : '',
      d8_completed: row.d8_completed ? '✓' : '',
      created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `8d_reports_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

async function generateQARReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('QAR');

  await updateProgress(jobId, 10);

  let sql = `
    SELECT q.*,
           c.name as client_name,
           q.reported_by_name
    FROM quality_alerts q
    LEFT JOIN clients c ON q.client_id = c.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND q.created_at >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND q.created_at <= $${queryParams.length}::date + INTERVAL '1 day'`;
  }

  sql += ' ORDER BY q.created_at DESC LIMIT 5000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  sheet.columns = [
    { header: 'Alerta #', key: 'alert_number', width: 15 },
    { header: 'Título', key: 'title', width: 35 },
    { header: 'Cliente', key: 'client_name', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Trigger', key: 'trigger_type', width: 12 },
    { header: 'Creado', key: 'created_at', width: 12 },
    { header: 'Reportado por', key: 'reported_by_name', width: 18 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `qar_list_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

async function generateProductionReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Producción');

  await updateProgress(jobId, 10);

  let sql = `
    SELECT pe.*,
           cp.part_number,
           sh.name as shift_name,
           CONCAT(u.first_name, ' ', u.last_name) as created_by_name
    FROM production_entries pe
    LEFT JOIN client_parts cp ON pe.part_id = cp.id
    LEFT JOIN inspection_shifts sh ON pe.shift_id = sh.id
    LEFT JOIN users u ON pe.created_by = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND pe.registered_at >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND pe.registered_at <= $${queryParams.length}::date + INTERVAL '1 day'`;
  }

  sql += ' ORDER BY pe.registered_at DESC LIMIT 10000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  sheet.columns = [
    { header: 'Serial', key: 'serial_number', width: 22 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'Lote', key: 'lot_number', width: 15 },
    { header: 'Work Order', key: 'work_order', width: 15 },
    { header: 'Turno', key: 'shift_name', width: 12 },
    { header: 'Status Insp.', key: 'inspection_status', width: 12 },
    { header: 'Registrado por', key: 'created_by_name', width: 20 },
    { header: 'Fecha', key: 'registered_at', width: 12 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `production_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

async function generateAuditReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Auditorías');

  await updateProgress(jobId, 10);

  let sql = `
    SELECT a.*,
           a.lead_auditor_name as auditor_name,
           (COALESCE(a.non_conformities_major, 0) + COALESCE(a.non_conformities_minor, 0) + COALESCE(a.observations, 0)) as findings_count
    FROM audits a
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND a.audit_date >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND a.audit_date <= $${queryParams.length}`;
  }

  sql += ' ORDER BY a.audit_date DESC LIMIT 5000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  sheet.columns = [
    { header: 'Auditoría #', key: 'audit_number', width: 15 },
    { header: 'Área/Proceso', key: 'area_process', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Auditor', key: 'auditor_name', width: 20 },
    { header: 'Fecha', key: 'audit_date', width: 12 },
    { header: 'NC Mayor', key: 'non_conformities_major', width: 10 },
    { header: 'NC Menor', key: 'non_conformities_minor', width: 10 },
    { header: 'Observaciones', key: 'observations', width: 12 },
    { header: 'Score %', key: 'score_percentage', width: 10 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      audit_date: row.audit_date ? new Date(row.audit_date).toLocaleDateString() : ''
    });
  });

  await updateProgress(jobId, 80);

  const filePath = path.join(REPORTS_DIR, `audit_findings_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

// ============================================================================
// STATION TRACEABILITY REPORT
// ============================================================================
async function generateStationTraceabilityReport(jobId, params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Trazabilidad');

  await updateProgress(jobId, 10);

  // Build query combining unit_history, defect_entries, and station inspections
  let sql = `
    WITH traceability AS (
      -- Events from unit_history
      SELECT
        ur.serial_number,
        cp.part_number,
        ur.lot_number,
        ist.name AS station_name,
        ist.id AS station_id,
        uh.event_type,
        uh.event_at AS timestamp,
        CASE
          WHEN uh.event_type IN ('SPEC_OK', 'RELEASED', 'RELEASE_OK') THEN 'OK'
          WHEN uh.event_type IN ('SPEC_NOK', 'DEFECT_FOUND') THEN 'NOK'
          WHEN uh.event_type = 'SCRAPPED' THEN 'SCRAP'
          WHEN uh.event_type IN ('REPAIR_COMPLETED', 'REPAIRED') THEN 'REPAIRED'
          ELSE uh.event_type
        END AS result,
        NULL AS defect_code,
        NULL AS defect_name,
        CONCAT(u.first_name, ' ', u.last_name) AS performed_by,
        NULL AS repaired_by,
        NULL AS released_by,
        uh.description AS notes
      FROM unit_history uh
      JOIN unit_registry ur ON uh.unit_id = ur.id
      LEFT JOIN client_parts cp ON ur.part_id = cp.id
      LEFT JOIN inspection_stations ist ON uh.station_id = ist.id
      LEFT JOIN users u ON uh.performed_by = u.id
      WHERE uh.event_at >= $1::date
        AND uh.event_at <= $2::date + INTERVAL '1 day'

      UNION ALL

      -- Defect entries with repair/release info
      SELECT
        de.serial_number,
        cp.part_number,
        ur.lot_number,
        ist.name AS station_name,
        ist.id AS station_id,
        'DEFECT' AS event_type,
        de.created_at AS timestamp,
        de.repair_status AS result,
        dt.code AS defect_code,
        dt.name AS defect_name,
        CONCAT(ui.first_name, ' ', ui.last_name) AS performed_by,
        CONCAT(urep.first_name, ' ', urep.last_name) AS repaired_by,
        CONCAT(urel.first_name, ' ', urel.last_name) AS released_by,
        de.notes
      FROM defect_entries_v2 de
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN unit_registry ur ON de.unit_id = ur.id
      LEFT JOIN inspection_stations ist ON de.station_id = ist.id
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN users ui ON de.inspector_id = ui.id
      LEFT JOIN users urep ON de.repaired_by = urep.id
      LEFT JOIN users urel ON de.released_by = urel.id
      WHERE de.created_at >= $1::date
        AND de.created_at <= $2::date + INTERVAL '1 day'
    )
    SELECT * FROM traceability t
    WHERE 1=1
  `;

  const queryParams = [params.dateFrom || '2020-01-01', params.dateTo || new Date().toISOString().split('T')[0]];

  // Filter by stations if provided
  if (params.stationIds && Array.isArray(params.stationIds) && params.stationIds.length > 0) {
    queryParams.push(params.stationIds);
    sql += ` AND t.station_id = ANY($${queryParams.length}::int[])`;
  }

  // Filter by part
  if (params.partNumber) {
    queryParams.push(`%${params.partNumber}%`);
    sql += ` AND t.part_number ILIKE $${queryParams.length}`;
  }

  // Filter by serial
  if (params.serialNumber) {
    queryParams.push(`%${params.serialNumber}%`);
    sql += ` AND t.serial_number ILIKE $${queryParams.length}`;
  }

  // Filter by lot
  if (params.lotNumber) {
    queryParams.push(`%${params.lotNumber}%`);
    sql += ` AND t.lot_number ILIKE $${queryParams.length}`;
  }

  sql += ' ORDER BY t.serial_number, t.timestamp ASC LIMIT 50000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  // Define columns
  sheet.columns = [
    { header: 'Serial', key: 'serial_number', width: 22 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'Lote', key: 'lot_number', width: 15 },
    { header: 'Estación', key: 'station_name', width: 18 },
    { header: 'Evento', key: 'event_type', width: 18 },
    { header: 'Fecha/Hora', key: 'timestamp', width: 18 },
    { header: 'Resultado', key: 'result', width: 12 },
    { header: 'Cód. Defecto', key: 'defect_code', width: 12 },
    { header: 'Defecto', key: 'defect_name', width: 25 },
    { header: 'Inspector/Operador', key: 'performed_by', width: 20 },
    { header: 'Reparador', key: 'repaired_by', width: 20 },
    { header: 'Liberador', key: 'released_by', width: 20 },
    { header: 'Notas', key: 'notes', width: 35 }
  ];

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data with conditional formatting
  result.rows.forEach(row => {
    const newRow = sheet.addRow({
      ...row,
      timestamp: row.timestamp ? new Date(row.timestamp).toLocaleString('es-MX') : ''
    });

    // Color code results
    const resultCell = newRow.getCell('result');
    if (row.result === 'OK' || row.result === 'RELEASED') {
      resultCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      resultCell.font = { color: { argb: 'FF065F46' } };
    } else if (row.result === 'NOK' || row.result === 'DEFECT') {
      resultCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      resultCell.font = { color: { argb: 'FF991B1B' } };
    } else if (row.result === 'SCRAP' || row.result === 'SCRAPPED') {
      resultCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      resultCell.font = { color: { argb: 'FF92400E' } };
    } else if (row.result === 'REPAIRED') {
      resultCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      resultCell.font = { color: { argb: 'FF1E40AF' } };
    }
  });

  await updateProgress(jobId, 80);

  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 15 }
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const totalRows = result.rows.length;
  const uniqueSerials = new Set(result.rows.map(r => r.serial_number)).size;
  const okCount = result.rows.filter(r => r.result === 'OK' || r.result === 'RELEASED').length;
  const nokCount = result.rows.filter(r => r.result === 'NOK' || r.result === 'DEFECT').length;
  const repairCount = result.rows.filter(r => r.result === 'REPAIRED').length;

  summarySheet.addRow({ metric: 'Total Eventos', value: totalRows });
  summarySheet.addRow({ metric: 'Seriales Únicos', value: uniqueSerials });
  summarySheet.addRow({ metric: 'Eventos OK/Released', value: okCount });
  summarySheet.addRow({ metric: 'Eventos NOK/Defecto', value: nokCount });
  summarySheet.addRow({ metric: 'Reparaciones', value: repairCount });
  summarySheet.addRow({ metric: 'Rango Fechas', value: `${params.dateFrom || 'Inicio'} - ${params.dateTo || 'Hoy'}` });
  if (params.stationIds && params.stationIds.length > 0) {
    summarySheet.addRow({ metric: 'Estaciones Filtradas', value: params.stationIds.length });
  }

  const filePath = path.join(REPORTS_DIR, `station_traceability_${jobId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

// ============================================================================
// CLEANUP - Remove expired reports (called periodically)
// ============================================================================
async function cleanupExpiredReports() {
  try {
    const expired = await query(`
      SELECT id, file_path FROM report_jobs
      WHERE expires_at < CURRENT_TIMESTAMP
    `);

    for (const job of expired.rows) {
      if (job.file_path && fs.existsSync(job.file_path)) {
        fs.unlinkSync(job.file_path);
      }
    }

    await query(`DELETE FROM report_jobs WHERE expires_at < CURRENT_TIMESTAMP`);
    console.log(`[ReportJobs] Cleaned up ${expired.rows.length} expired reports`);
  } catch (error) {
    console.error('[ReportJobs] Cleanup error:', error);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredReports, 60 * 60 * 1000);

module.exports = router;
