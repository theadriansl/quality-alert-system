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
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM report_jobs
      WHERE id = $1 AND created_by = $2 AND status = 'COMPLETED'
    `, [req.params.id, req.user.id]);

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
           u.full_name as inspector_name
    FROM defect_entries_v2 d
    LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
    LEFT JOIN client_parts cp ON d.part_id = cp.id
    LEFT JOIN stations s ON d.station_id = s.id
    LEFT JOIN shifts sh ON d.shift_id = sh.id
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
           p.name as project_name,
           cp.part_number,
           u.full_name as created_by_name
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
            u.full_name as inspector
          FROM mrb_ok_entries o
          LEFT JOIN users u ON o.inspector_id = u.id
          WHERE o.mrb_campaign_id = $1 AND UPPER(o.serial_number) = UPPER(mas.serial_number)
          UNION ALL
          SELECT
            COALESCE(d.inspection_round, 1) as round,
            'NOK' as result,
            d.created_at as date,
            u.full_name as inspector
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
           c.name as client_name,
           u.full_name as created_by_name
    FROM eightd_reports er
    LEFT JOIN clients c ON er.client_id = c.id
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
    { header: 'Cliente', key: 'client_name', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Severidad', key: 'severity', width: 12 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'D1', key: 'd1_complete', width: 5 },
    { header: 'D2', key: 'd2_complete', width: 5 },
    { header: 'D3', key: 'd3_complete', width: 5 },
    { header: 'D4', key: 'd4_complete', width: 5 },
    { header: 'D5', key: 'd5_complete', width: 5 },
    { header: 'D6', key: 'd6_complete', width: 5 },
    { header: 'D7', key: 'd7_complete', width: 5 },
    { header: 'D8', key: 'd8_complete', width: 5 },
    { header: 'Creado', key: 'created_at', width: 12 },
    { header: 'Creado por', key: 'created_by_name', width: 18 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  result.rows.forEach(row => {
    sheet.addRow({
      ...row,
      d1_complete: row.d1_complete ? '✓' : '',
      d2_complete: row.d2_complete ? '✓' : '',
      d3_complete: row.d3_complete ? '✓' : '',
      d4_complete: row.d4_complete ? '✓' : '',
      d5_complete: row.d5_complete ? '✓' : '',
      d6_complete: row.d6_complete ? '✓' : '',
      d7_complete: row.d7_complete ? '✓' : '',
      d8_complete: row.d8_complete ? '✓' : '',
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
           u.full_name as created_by_name
    FROM qars q
    LEFT JOIN clients c ON q.client_id = c.id
    LEFT JOIN users u ON q.created_by = u.id
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
    { header: 'QAR #', key: 'qar_number', width: 15 },
    { header: 'Título', key: 'title', width: 35 },
    { header: 'Cliente', key: 'client_name', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Tipo', key: 'alert_type', width: 12 },
    { header: 'Severidad', key: 'severity', width: 12 },
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
           s.name as station_name,
           u.full_name as operator_name
    FROM production_entries pe
    LEFT JOIN client_parts cp ON pe.part_id = cp.id
    LEFT JOIN stations s ON pe.station_id = s.id
    LEFT JOIN users u ON pe.operator_id = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params.dateFrom) {
    queryParams.push(params.dateFrom);
    sql += ` AND pe.created_at >= $${queryParams.length}`;
  }
  if (params.dateTo) {
    queryParams.push(params.dateTo);
    sql += ` AND pe.created_at <= $${queryParams.length}::date + INTERVAL '1 day'`;
  }

  sql += ' ORDER BY pe.created_at DESC LIMIT 10000';

  await updateProgress(jobId, 30);
  const result = await query(sql, queryParams);
  await updateProgress(jobId, 50);

  sheet.columns = [
    { header: 'Serial', key: 'serial_number', width: 22 },
    { header: 'Parte', key: 'part_number', width: 15 },
    { header: 'Estación', key: 'station_name', width: 15 },
    { header: 'Operador', key: 'operator_name', width: 20 },
    { header: 'Status Insp.', key: 'inspection_status', width: 12 },
    { header: 'Fecha', key: 'created_at', width: 12 }
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
           u.full_name as auditor_name
    FROM audits a
    LEFT JOIN users u ON a.auditor_id = u.id
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
    { header: 'Título', key: 'title', width: 35 },
    { header: 'Tipo', key: 'audit_type', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Auditor', key: 'auditor_name', width: 20 },
    { header: 'Fecha', key: 'audit_date', width: 12 },
    { header: 'Hallazgos', key: 'findings_count', width: 10 }
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
