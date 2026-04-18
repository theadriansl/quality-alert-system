const { query } = require('../config/database');

// Get dashboard metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const result = await query('SELECT * FROM dashboard_metrics');
    
    // If no data exists, return default metrics
    if (!result.rows || result.rows.length === 0) {
      return res.json({
        success: true,
        metrics: {
          total_reports: 0,
          open_reports: 0,
          closed_reports: 0,
          overdue_reports: 0,
          total_estimated_cost: 0,
          total_actual_cost: 0,
          avg_progress: 0,
          high_severity: 0,
          medium_severity: 0,
          low_severity: 0
        }
      });
    }

    res.json({
      success: true,
      metrics: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard metrics',
      error: error.message
    });
  }
};

// Get all 8D reports with pagination
const getEightdReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const severity = req.query.severity;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += `WHERE status = $${paramCount}`;
      queryParams.push(status);
    }

    if (severity) {
      paramCount++;
      if (whereClause) {
        whereClause += ` AND severity = $${paramCount}`;
      } else {
        whereClause += `WHERE severity = $${paramCount}`;
      }
      queryParams.push(severity);
    }

    const countQuery = `SELECT COUNT(*) FROM eightd_reports ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const totalReports = parseInt(countResult.rows[0].count);

    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT 
        r.*,
        u1.first_name || ' ' || u1.last_name as issue_assignee_name,
        u2.first_name || ' ' || u2.last_name as countermeasure_assignee_name,
        u3.first_name || ' ' || u3.last_name as confirmation_assignee_name,
        u4.first_name || ' ' || u4.last_name as created_by_name
      FROM eightd_reports r
      LEFT JOIN users u1 ON r.issue_assigned_to = u1.id
      LEFT JOIN users u2 ON r.countermeasure_assigned_to = u2.id
      LEFT JOIN users u3 ON r.confirmation_assigned_to = u3.id
      LEFT JOIN users u4 ON r.created_by = u4.id
      ${whereClause}
      ORDER BY r.updated_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const dataResult = await query(dataQuery, queryParams);

    res.json({
      success: true,
      reports: dataResult.rows,
      pagination: {
        page,
        limit,
        total: totalReports,
        pages: Math.ceil(totalReports / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching 8D reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching 8D reports',
      error: error.message
    });
  }
};

// Get open reports detail
const getOpenReports = async (req, res) => {
  try {
    const result = await query('SELECT * FROM open_reports_detail');
    
    res.json({
      success: true,
      reports: result.rows
    });
  } catch (error) {
    console.error('Error fetching open reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching open reports',
      error: error.message
    });
  }
};

// Create new 8D report
const createEightdReport = async (req, res) => {
  try {
    const {
      title,
      description,
      supplier_name,
      supplier_account,
      part_number,
      part_name,
      problem_type,
      severity,
      tipo_issue,
      tipo_resp,
      timing_occurrence,
      estimated_cost,
      issue_date,
      target_closure_date,
      issue_assigned_to,
      countermeasure_assigned_to,
      confirmation_assigned_to,
      customer_impact
    } = req.body;

    // Generate report ID
    const reportIdResult = await query(
      'SELECT COUNT(*) + 1 as next_id FROM eightd_reports WHERE DATE_PART(\'year\', created_at) = DATE_PART(\'year\', CURRENT_DATE)'
    );
    const nextId = reportIdResult.rows[0].next_id;
    const currentYear = new Date().getFullYear();
    const reportId = `8D-${currentYear}-${String(nextId).padStart(4, '0')}`;

    const insertQuery = `
      INSERT INTO eightd_reports (
        report_id, title, description, supplier_name, supplier_account,
        part_number, part_name, problem_type, severity, tipo_issue,
        tipo_resp, timing_occurrence, estimated_cost, issue_date,
        target_closure_date, issue_assigned_to, countermeasure_assigned_to,
        confirmation_assigned_to, customer_impact, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *
    `;

    const result = await query(insertQuery, [
      reportId, title, description, supplier_name, supplier_account,
      part_number, part_name, problem_type, severity, tipo_issue,
      tipo_resp, timing_occurrence, estimated_cost, issue_date,
      target_closure_date, issue_assigned_to, countermeasure_assigned_to,
      confirmation_assigned_to, customer_impact, req.user.id
    ]);

    res.status(201).json({
      success: true,
      message: '8D report created successfully',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating 8D report',
      error: error.message
    });
  }
};

// Get single 8D report by ID
const getEightdReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        r.*,
        u1.first_name || ' ' || u1.last_name as issue_assignee_name,
        u2.first_name || ' ' || u2.last_name as countermeasure_assignee_name,
        u3.first_name || ' ' || u3.last_name as confirmation_assignee_name,
        u4.first_name || ' ' || u4.last_name as created_by_name
      FROM eightd_reports r
      LEFT JOIN users u1 ON r.issue_assigned_to = u1.id
      LEFT JOIN users u2 ON r.countermeasure_assigned_to = u2.id
      LEFT JOIN users u3 ON r.confirmation_assigned_to = u3.id
      LEFT JOIN users u4 ON r.created_by = u4.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '8D report not found'
      });
    }

    const report = result.rows[0];

    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('Error fetching 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching 8D report',
      error: error.message
    });
  }
};

// Update 8D report
const updateEightdReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    values.push(id);
    
    const updateQuery = `
      UPDATE eightd_reports 
      SET ${setClause}
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
    
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '8D report not found'
      });
    }

    res.json({
      success: true,
      message: '8D report updated successfully',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating 8D report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating 8D report',
      error: error.message
    });
  }
};

// Get reports assigned to current user
const getMyAssignedReports = async (req, res) => {
  try {
    const userId = req.user.id; // Usuario autenticado

    const myReportsQuery = `
      SELECT
        r.id,
        r.report_id,
        r.title,
        r.supplier_name,
        r.severity,
        r.status,
        r.created_at,
        r.updated_at,
        r.d1_d2_d3_approval_status,
        r.current_approval_step,
        r.escalation_path,
        r.estimated_cost,
        creator.first_name || ' ' || creator.last_name as created_by_name
      FROM eightd_reports r
      LEFT JOIN users creator ON r.created_by = creator.id
      WHERE
        r.created_by = $1
        OR r.escalation_path::text LIKE '%' || $1 || '%'
      ORDER BY r.updated_at DESC
    `;

    const result = await query(myReportsQuery, [userId]);

    // Determinar el estado detallado de cada reporte
    const reportsWithStatus = result.rows.map(report => {
      let detailedStatus = 'draft';
      let phase = 'D1-D2-D3';

      // Determinar fase y estado según d1_d2_d3_approval_status
      if (report.d1_d2_d3_approval_status) {
        const approvalStatus = report.d1_d2_d3_approval_status;

        if (approvalStatus === 'draft') {
          detailedStatus = 'Draft';
          phase = 'D1-D2-D3';
        } else if (approvalStatus.startsWith('pending_approval')) {
          detailedStatus = 'Under Approval';
          phase = 'D1-D2-D3';
        } else if (approvalStatus.startsWith('rejected_by')) {
          detailedStatus = 'Rejected - Needs Revision';
          phase = 'D1-D2-D3';
        } else if (approvalStatus === 'approved') {
          // D1-D2-D3 aprobado, ahora está en D4-D5
          detailedStatus = 'Under Countermeasure';
          phase = 'D4-D5';
        }
      }

      // Si status general es 'closed', sobrescribir
      if (report.status === 'closed') {
        detailedStatus = 'Closed';
        phase = 'D8';
      }

      return {
        ...report,
        detailedStatus,
        phase
      };
    });

    res.json({
      success: true,
      reports: reportsWithStatus
    });
  } catch (error) {
    console.error('Error fetching assigned reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned reports',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getEightdReports,
  getOpenReports,
  createEightdReport,
  getEightdReportById,
  updateEightdReport,
  getMyAssignedReports
};