const { query, pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const path = require('path');
const fs = require('fs');

/**
 * Upload a file (photo or document) for an 8D report
 * POST /8d/reports/:reportId/attachments
 */
async function uploadAttachment(req, res) {
  try {
    const { reportId } = req.params;
    const { attachmentType, description } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate attachment type
    const validTypes = ['photo_no_good', 'photo_ok', 'document'];
    if (attachmentType && !validTypes.includes(attachmentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid attachment type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Get user ID from authenticated user
    const uploadedBy = req.user ? req.user.id : 1;

    // Verify report exists
    const reportCheck = await query(
      'SELECT id FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      // Delete uploaded file if report doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Insert attachment record
    const insertQuery = `
      INSERT INTO eightd_attachments (
        report_id,
        filename,
        original_filename,
        file_size,
        mime_type,
        upload_path,
        uploaded_by,
        description,
        attachment_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      reportId,
      req.file.filename,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      req.file.path,
      uploadedBy,
      description || null,
      attachmentType || 'document'
    ]);

    console.log(`✅ File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

    // Log audit trail para subida de archivo
    try {
      const { logAction } = require('../utils/auditLog');
      const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Usuario';
      await logAction({
        reportId: parseInt(reportId),
        userId: uploadedBy,
        userName,
        actionType: 'file_uploaded',
        actionCategory: 'attachment',
        description: `Archivo subido: ${req.file.originalname} (${attachmentType || 'document'})`,
        newValue: { filename: req.file.originalname, type: attachmentType || 'document', size: req.file.size }
      });
    } catch (auditError) {
      console.error('Error logging file upload:', auditError);
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      attachment: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('❌ Error uploading attachment:', error);

    // Delete uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
}

/**
 * Get all attachments for an 8D report
 * GET /8d/reports/:reportId/attachments
 */
async function getAttachments(req, res) {
  try {
    const { reportId } = req.params;
    const { type } = req.query; // Optional filter by attachment_type

    // First, get the numeric ID from the report_id string
    let reportNumericId = reportId;

    // If reportId is a string format like "8D-2025-0316", get the numeric ID
    if (isNaN(reportId)) {
      const reportQuery = await query('SELECT id FROM eightd_reports WHERE report_id = $1', [reportId]);
      if (reportQuery.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      reportNumericId = reportQuery.rows[0].id;
    }

    let queryText = `
      SELECT
        a.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM eightd_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.report_id = $1
    `;

    const params = [reportNumericId];

    // Add type filter if provided
    if (type) {
      queryText += ' AND a.attachment_type = $2';
      params.push(type);
    }

    queryText += ' ORDER BY a.upload_date DESC';

    const result = await query(queryText, params);

    // Add full URL for each attachment
    const attachments = result.rows.map(att => {
      const camelCased = transformToCamelCase(att);
      // Generate URL relative to backend server
      camelCased.url = `/uploads/${att.filename}`;
      return camelCased;
    });

    res.json({
      success: true,
      count: attachments.length,
      attachments
    });

  } catch (error) {
    console.error('❌ Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attachments',
      error: error.message
    });
  }
}

/**
 * Delete an attachment
 * DELETE /8d/reports/:reportId/attachments/:attachmentId
 */
async function deleteAttachment(req, res) {
  try {
    const { reportId, attachmentId } = req.params;

    // Get attachment info
    const result = await query(
      'SELECT * FROM eightd_attachments WHERE id = $1 AND report_id = $2',
      [attachmentId, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    const attachment = result.rows[0];

    // Delete file from filesystem
    if (attachment.upload_path && fs.existsSync(attachment.upload_path)) {
      try {
        fs.unlinkSync(attachment.upload_path);
        console.log(`✅ File deleted: ${attachment.upload_path}`);
      } catch (fileError) {
        console.error('Error deleting file from disk:', fileError);
        // Continue anyway to delete DB record
      }
    }

    // Delete database record
    await query(
      'DELETE FROM eightd_attachments WHERE id = $1',
      [attachmentId]
    );

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attachment',
      error: error.message
    });
  }
}

/**
 * Update attachment metadata (description, type)
 * PUT /8d/reports/:reportId/attachments/:attachmentId
 */
async function updateAttachment(req, res) {
  try {
    const { reportId, attachmentId } = req.params;
    const { description, attachmentType } = req.body;

    // Validate attachment type if provided
    if (attachmentType) {
      const validTypes = ['photo_no_good', 'photo_ok', 'document'];
      if (!validTypes.includes(attachmentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid attachment type. Must be one of: ${validTypes.join(', ')}`
        });
      }
    }

    // Check if attachment exists
    const checkResult = await query(
      'SELECT id FROM eightd_attachments WHERE id = $1 AND report_id = $2',
      [attachmentId, reportId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (attachmentType !== undefined) {
      updates.push(`attachment_type = $${paramIndex++}`);
      values.push(attachmentType);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(attachmentId);
    const updateQuery = `
      UPDATE eightd_attachments
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      message: 'Attachment updated successfully',
      attachment: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('❌ Error updating attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attachment',
      error: error.message
    });
  }
}

module.exports = {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  updateAttachment
};
