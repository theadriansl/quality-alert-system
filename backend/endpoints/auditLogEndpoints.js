const { getAuditLog, logAction } = require('../utils/auditLog');
const { transformToCamelCase } = require('../utils/caseTransform');
const { pool } = require('../config/database');

/**
 * Get audit log for a specific 8D report
 * GET /8d/reports/:reportId/audit-log
 */
async function getReportAuditLog(req, res) {
  try {
    const { reportId } = req.params;
    const {
      limit = 100,
      offset = 0,
      actionCategory = null,
      sectionName = null,
      userId = null,
      startDate = null,
      endDate = null
    } = req.query;

    console.log(`📜 Fetching audit log for report ${reportId} with filters:`, {
      userId, startDate, endDate, actionCategory, sectionName
    });

    // Get audit log entries with filters
    const auditEntries = await getAuditLog(reportId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      actionCategory,
      sectionName,
      userId: userId ? parseInt(userId) : null,
      startDate,
      endDate
    });

    res.json({
      success: true,
      auditLog: transformToCamelCase(auditEntries),
      total: auditEntries.length
    });

  } catch (error) {
    console.error('❌ Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit log',
      error: error.message
    });
  }
}

/**
 * Log an action for a specific 8D report
 * POST /8d/reports/:reportId/audit-log
 */
async function postReportAuditLog(req, res) {
  try {
    const { reportId } = req.params;
    const { actionType, actionCategory, sectionName, userName, description, newValue } = req.body;
    const userId = req.user?.id || null;

    await logAction({
      reportId: parseInt(reportId),
      actionType,
      actionCategory: actionCategory || 'report',
      sectionName: sectionName || null,
      userId,
      userName: userName || 'Sistema',
      description,
      newValue: newValue || null
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error posting audit log:', error);
    res.status(500).json({ success: false, message: 'Error posting audit log', error: error.message });
  }
}

/**
 * Get all revisions in the same 8D family
 * GET /8d/reports/:reportId/revisions
 */
async function getReportRevisions(req, res) {
  try {
    const { reportId } = req.params;

    // Get current report to find its report_id string
    const currentResult = await pool.query(
      `SELECT id, report_id, revision_number, is_archived, archived_reason, archived_at, created_at
       FROM eightd_reports WHERE id = $1`,
      [reportId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const current = currentResult.rows[0];
    const baseReportId = current.report_id.replace(/-R\d+$/, '');

    // Find all reports in the same family
    const familyResult = await pool.query(
      `SELECT id, report_id, revision_number, is_archived, archived_reason, archived_at, created_at
       FROM eightd_reports
       WHERE report_id = $1 OR report_id LIKE $2
       ORDER BY revision_number ASC NULLS FIRST, created_at ASC`,
      [baseReportId, `${baseReportId}-R%`]
    );

    res.json({
      success: true,
      revisions: transformToCamelCase(familyResult.rows),
      currentId: parseInt(reportId)
    });

  } catch (error) {
    console.error('❌ Error fetching revisions:', error);
    res.status(500).json({ success: false, message: 'Error fetching revisions', error: error.message });
  }
}

module.exports = {
  getReportAuditLog,
  postReportAuditLog,
  getReportRevisions
};
