/**
 * Audit Log Utility
 *
 * Provides functions to log all actions and changes on 8D reports
 * for complete traceability and audit trail
 */

const { pool } = require('../config/database');

/**
 * Log an action to the audit log
 *
 * @param {Object} params - Action parameters
 * @param {number} params.reportId - The 8D report ID
 * @param {string} params.actionType - Type of action (created, updated, approved, rejected, etc.)
 * @param {string} params.actionCategory - Category (report, approval, section, status)
 * @param {string} params.sectionName - Section affected (d1, d2, d3, etc.)
 * @param {number} params.userId - User who performed the action
 * @param {string} params.userName - User's full name
 * @param {string} params.description - Human-readable description
 * @param {any} params.oldValue - Previous value (optional)
 * @param {any} params.newValue - New value (optional)
 * @param {string} params.ipAddress - IP address (optional)
 * @param {string} params.userAgent - User agent (optional)
 */
async function logAction({
  reportId,
  actionType,
  actionCategory = 'report',
  sectionName = null,
  userId = null,
  userName = 'Sistema',
  description,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    const query = `
      INSERT INTO eightd_audit_log (
        report_id,
        action_type,
        action_category,
        section_name,
        user_id,
        user_name,
        description,
        old_value,
        new_value,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const values = [
      reportId,
      actionType,
      actionCategory,
      sectionName,
      userId,
      userName,
      description,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress,
      userAgent
    ];

    const result = await pool.query(query, values);
    console.log(`📝 Audit log created: ${actionType} - ${description}`);
    return result.rows[0].id;

  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw - audit log errors shouldn't break the main operation
    return null;
  }
}

/**
 * Get audit log for a specific report
 *
 * @param {number} reportId - The 8D report ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of entries to return
 * @param {number} options.offset - Number of entries to skip
 * @param {string} options.actionCategory - Filter by action category
 * @param {string} options.sectionName - Filter by section name
 * @returns {Promise<Array>} Array of audit log entries
 */
async function getAuditLog(reportId, options = {}) {
  try {
    const {
      limit = 100,
      offset = 0,
      actionCategory = null,
      sectionName = null,
      userId = null,
      startDate = null,
      endDate = null
    } = options;

    let query = `
      SELECT
        id,
        action_type,
        action_category,
        section_name,
        user_id,
        user_name,
        description,
        old_value,
        new_value,
        ip_address,
        created_at
      FROM eightd_audit_log
      WHERE report_id = $1
    `;

    const params = [reportId];
    let paramIndex = 2;

    if (actionCategory) {
      query += ` AND action_category = $${paramIndex}`;
      params.push(actionCategory);
      paramIndex++;
    }

    if (sectionName) {
      query += ` AND section_name = $${paramIndex}`;
      params.push(sectionName);
      paramIndex++;
    }

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;

  } catch (error) {
    console.error('❌ Error fetching audit log:', error);
    return [];
  }
}

/**
 * Helper: Log report creation
 */
async function logReportCreated({ reportId, userId, userName, reportData }) {
  return logAction({
    reportId,
    actionType: 'created',
    actionCategory: 'report',
    userId,
    userName,
    description: `Reporte 8D creado: ${reportData.title || 'Sin título'}`,
    newValue: {
      title: reportData.title,
      severity: reportData.severity,
      status: reportData.status
    }
  });
}

/**
 * Helper: Log section update
 */
async function logSectionUpdate({ reportId, sectionName, userId, userName, description, oldValue, newValue }) {
  return logAction({
    reportId,
    actionType: 'section_updated',
    actionCategory: 'section',
    sectionName,
    userId,
    userName,
    description: description || `Sección ${sectionName.toUpperCase()} actualizada`,
    oldValue,
    newValue
  });
}

/**
 * Helper: Log approval
 */
async function logApproval({ reportId, approvalLevel, userId, userName, comments = null, sectionName = null }) {
  return logAction({
    reportId,
    actionType: 'approved',
    actionCategory: 'approval',
    sectionName,
    userId,
    userName,
    description: `${sectionName ? sectionName.toUpperCase() + ' - ' : ''}Aprobado por Aprobador ${approvalLevel}`,
    newValue: {
      level: approvalLevel,
      status: 'approved',
      comments
    }
  });
}

/**
 * Helper: Log rejection
 */
async function logRejection({ reportId, approvalLevel, userId, userName, comments, sectionName = null }) {
  return logAction({
    reportId,
    actionType: 'rejected',
    actionCategory: 'approval',
    sectionName,
    userId,
    userName,
    description: `${sectionName ? sectionName.toUpperCase() + ' - ' : ''}Rechazado por Aprobador ${approvalLevel}: ${comments}`,
    newValue: {
      level: approvalLevel,
      status: 'rejected',
      comments
    }
  });
}

/**
 * Helper: Log status change
 */
async function logStatusChange({ reportId, userId, userName, oldStatus, newStatus }) {
  return logAction({
    reportId,
    actionType: 'status_changed',
    actionCategory: 'status',
    userId,
    userName,
    description: `Estado cambiado de "${oldStatus}" a "${newStatus}"`,
    oldValue: oldStatus,
    newValue: newStatus
  });
}

/**
 * Helper: Log draft save
 */
async function logDraftSaved({ reportId, userId, userName, sectionName = null }) {
  return logAction({
    reportId,
    actionType: 'draft_saved',
    actionCategory: 'report',
    sectionName,
    userId,
    userName,
    description: sectionName
      ? `Borrador guardado en sección ${sectionName.toUpperCase()}`
      : 'Borrador guardado'
  });
}

/**
 * Helper: Log sent to approval
 */
async function logSentToApproval({ reportId, sectionName, userId, userName, step }) {
  return logAction({
    reportId,
    actionType: 'submitted_for_approval',
    actionCategory: 'approval',
    sectionName,
    userId,
    userName,
    description: `${sectionName ? sectionName.toUpperCase() + ' - ' : ''}Enviado a aprobación (Paso ${step})`,
    newValue: {
      step,
      status: 'pending'
    }
  });
}

module.exports = {
  logAction,
  getAuditLog,

  // Helper functions
  logReportCreated,
  logSectionUpdate,
  logApproval,
  logRejection,
  logStatusChange,
  logDraftSaved,
  logSentToApproval
};
