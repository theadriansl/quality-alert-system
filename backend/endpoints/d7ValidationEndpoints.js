/**
 * D7 VALIDATION ENDPOINTS
 * Complete CRUD operations for D7 validation including:
 * - Before/After evidence
 * - SPC validation
 * - Document updates
 * - Employee training
 */

const express = require('express');
const { logAction } = require('../utils/auditLog');
const router = express.Router();
const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendAuditNotification } = require('../utils/emailService');

// ============================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/d7-evidence');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf|xlsx|xls|docx|doc|pptx|ppt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Office documents allowed.'));
    }
  }
});


// ============================================
// GET D7 VALIDATION DATA
// ============================================
/**
 * GET /api/8d/reports/:reportId/d7-validation
 * Get complete D7 validation data for a report
 */
router.get('/reports/:reportId/d7-validation', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;

    // Get main validation data
    const validationResult = await client.query(
      `SELECT * FROM d7_validations WHERE report_id = $1`,
      [reportId]
    );

    if (validationResult.rows.length === 0) {
      // Return empty structure if no D7 data exists yet
      return res.json({
        success: true,
        data: {
          validation: null,
          validationFiles: [],
          documentsUpdated: [],
          trainingEmployees: [],
          trainingFiles: [],
          auditItems: [] // NEW: Return empty audit items
        }
      });
    }

    const validation = validationResult.rows[0];
    const validationId = validation.id;

    // Get validation files (before/after photos, SPC charts, evidence)
    const filesResult = await client.query(
      `SELECT vf.*, u.first_name, u.last_name
       FROM d7_validation_files vf
       LEFT JOIN users u ON vf.uploaded_by = u.id
       WHERE vf.d7_validation_id = $1
       ORDER BY vf.file_type, vf.uploaded_at DESC`,
      [validationId]
    );

    // Get documents updated with their files
    const documentsResult = await client.query(
      `SELECT
        du.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', df.id,
              'fileName', df.file_name,
              'fileUrl', df.file_url,
              'uploadedAt', df.uploaded_at,
              'uploadedBy', u.first_name || ' ' || u.last_name
            )
            ORDER BY df.uploaded_at DESC
          ) FILTER (WHERE df.id IS NOT NULL),
          '[]'
        ) as files
       FROM d7_documents_updated du
       LEFT JOIN d7_document_files df ON du.id = df.d7_document_id
       LEFT JOIN users u ON df.uploaded_by = u.id
       WHERE du.d7_validation_id = $1
       GROUP BY du.id
       ORDER BY du.document_type`,
      [validationId]
    );

    // Get training employees
    const employeesResult = await client.query(
      `SELECT * FROM d7_training_employees
       WHERE d7_validation_id = $1
       ORDER BY training_date DESC, employee_name`,
      [validationId]
    );

    // Get training files
    const trainingFilesResult = await client.query(
      `SELECT tf.*, u.first_name, u.last_name
       FROM d7_training_files tf
       LEFT JOIN users u ON tf.uploaded_by = u.id
       WHERE tf.d7_validation_id = $1
       ORDER BY tf.file_type, tf.uploaded_at DESC`,
      [validationId]
    );

    // Get audit items with their files and assigned auditor names
    const auditItemsResult = await client.query(
      `SELECT
        ai.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', aif.id,
              'fileName', aif.file_name,
              'fileUrl', aif.file_url,
              'uploadedAt', aif.uploaded_at,
              'uploadedBy', u.first_name || ' ' || u.last_name
            )
            ORDER BY aif.uploaded_at DESC
          ) FILTER (WHERE aif.id IS NOT NULL),
          '[]'
        ) as files,
        (
          SELECT json_agg(json_build_object('id', au.id, 'name', au.first_name || ' ' || au.last_name, 'email', au.email))
          FROM users au
          WHERE au.id = ANY(ai.assigned_auditors)
        ) as assigned_auditors_info,
        audited_user.first_name || ' ' || audited_user.last_name as audited_by_name
       FROM d7_audit_items ai
       LEFT JOIN d7_audit_item_files aif ON ai.id = aif.d7_audit_item_id
       LEFT JOIN users u ON aif.uploaded_by = u.id
       LEFT JOIN users audited_user ON ai.audited_by = audited_user.id
       WHERE ai.d7_validation_id = $1
       GROUP BY ai.id, audited_user.first_name, audited_user.last_name
       ORDER BY ai.display_order, ai.item_name`,
      [validationId]
    );

    res.json({
      success: true,
      data: {
        validation: validation,
        validationFiles: filesResult.rows,
        documentsUpdated: documentsResult.rows,
        trainingEmployees: employeesResult.rows,
        trainingFiles: trainingFilesResult.rows,
        auditItems: auditItemsResult.rows // NEW: Return audit items
      }
    });

  } catch (error) {
    console.error('❌ Error getting D7 validation:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving D7 validation data',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// SAVE/UPDATE D7 VALIDATION MAIN DATA
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation
 * Create or update main D7 validation data
 */
router.post('/reports/:reportId/d7-validation', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const {
      beforeCondition,
      afterCondition,
      d3Implemented,
      d3Effective,
      d3SpcJudgment,
      d3ClientJudgment,
      d3Comments,
      d3Lesson,
      d5Implemented,
      d5Effective,
      d5SpcJudgment,
      d5ClientJudgment,
      d5Comments,
      d5Lesson,
      spcValidated,
      spcComments,
      spcAuditJudgment,
      trainingCompleted,
      trainingAuditJudgment,
      trainingDates,
      trainingInstructor,
      trainingTopics,
      trainingMethod,
      competencyVerified,
      competencyMethod,
      auditItems // NEW: Array of audit items from frontend
    } = req.body;

    console.log('Body:', JSON.stringify(req.body, null, 2));

    await client.query('BEGIN');

    // Check if D7 validation already exists
    const existingResult = await client.query(
      `SELECT id FROM d7_validations WHERE report_id = $1`,
      [reportId]
    );

    let validationId;

    if (existingResult.rows.length > 0) {
      // UPDATE existing - only update fields that were actually sent (partial update)
      validationId = existingResult.rows[0].id;

      // Build dynamic update query - only include fields that are not undefined
      const updates = [];
      const values = [validationId];
      let paramIndex = 2;

      const fieldMap = {
        before_condition: beforeCondition,
        after_condition: afterCondition,
        d3_implemented: d3Implemented,
        d3_effective: d3Effective,
        d3_spc_judgment: d3SpcJudgment,
        d3_client_judgment: d3ClientJudgment,
        d3_comments: d3Comments,
        d3_lesson: d3Lesson,
        d5_implemented: d5Implemented,
        d5_effective: d5Effective,
        d5_spc_judgment: d5SpcJudgment,
        d5_client_judgment: d5ClientJudgment,
        d5_comments: d5Comments,
        d5_lesson: d5Lesson,
        spc_validated: spcValidated,
        spc_comments: spcComments,
        spc_audit_judgment: spcAuditJudgment,
        training_completed: trainingCompleted,
        training_audit_judgment: trainingAuditJudgment,
        training_dates: trainingDates,
        training_instructor: trainingInstructor,
        training_topics: trainingTopics,
        training_method: trainingMethod,
        competency_verified: competencyVerified,
        competency_method: competencyMethod
      };

      for (const [field, value] of Object.entries(fieldMap)) {
        if (value !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        await client.query(
          `UPDATE d7_validations SET ${updates.join(', ')} WHERE id = $1`,
          values
        );
      }

    } else {
      // INSERT new
      const insertResult = await client.query(
        `INSERT INTO d7_validations (
          report_id, before_condition, after_condition,
          d3_implemented, d3_effective, d3_spc_judgment, d3_client_judgment, d3_comments, d3_lesson,
          d5_implemented, d5_effective, d5_spc_judgment, d5_client_judgment, d5_comments, d5_lesson,
          spc_validated, spc_comments, spc_audit_judgment,
          training_completed, training_audit_judgment, training_dates,
          training_instructor, training_topics, training_method,
          competency_verified, competency_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING id`,
        [
          reportId,
          beforeCondition,
          afterCondition,
          d3Implemented,
          d3Effective,
          d3SpcJudgment,
          d3ClientJudgment,
          d3Comments,
          d3Lesson,
          d5Implemented,
          d5Effective,
          d5SpcJudgment,
          d5ClientJudgment,
          d5Comments,
          d5Lesson,
          spcValidated,
          spcComments,
          spcAuditJudgment,
          trainingCompleted,
          trainingAuditJudgment,
          trainingDates,
          trainingInstructor,
          trainingTopics,
          trainingMethod,
          competencyVerified,
          competencyMethod
        ]
      );

      validationId = insertResult.rows[0].id;
    }

    // ============================================
    // SAVE AUDIT ITEMS
    // ============================================
    // Track items to send email notifications
    const itemsToNotify = [];

    if (auditItems && Array.isArray(auditItems)) {
      console.log(`💾 Saving ${auditItems.length} audit items...`);

      // Get IDs of incoming items (only positive IDs = already in DB)
      const incomingIds = auditItems.filter(item => item.id && item.id > 0).map(item => item.id);

      // PROTECTION: Never delete items that have been audited or sent to audit
      // Only delete items that are:
      // 1. Not in the incoming list
      // 2. Have NOT been sent to audit (sent_to_audit = false or null)
      // 3. Have NO auditor judgment
      if (incomingIds.length > 0) {
        const deleteResult = await client.query(
          `DELETE FROM d7_audit_items
           WHERE d7_validation_id = $1
             AND id NOT IN (${incomingIds.map((_, i) => `$${i + 2}`).join(', ')})
             AND (sent_to_audit IS NULL OR sent_to_audit = false)
             AND auditor_judgment IS NULL
           RETURNING id, item_name`,
          [validationId, ...incomingIds]
        );
        if (deleteResult.rows.length > 0) {
          console.log(`  🗑️ Deleted ${deleteResult.rows.length} unaudited items:`, deleteResult.rows.map(r => r.item_name));
        }
      } else if (auditItems.length === 0) {
        // Only delete all if explicitly sending empty array AND items haven't been audited
        const deleteResult = await client.query(
          `DELETE FROM d7_audit_items
           WHERE d7_validation_id = $1
             AND (sent_to_audit IS NULL OR sent_to_audit = false)
             AND auditor_judgment IS NULL
           RETURNING id, item_name`,
          [validationId]
        );
        if (deleteResult.rows.length > 0) {
          console.log(`  🗑️ Deleted ${deleteResult.rows.length} unaudited items:`, deleteResult.rows.map(r => r.item_name));
        }
      }
      // Note: If incomingIds is empty but auditItems has items, we're inserting new items - don't delete anything

      // Update existing items or insert new ones
      for (let i = 0; i < auditItems.length; i++) {
        const item = auditItems[i];

        // Only UPDATE if ID is a positive number (real DB id)
        if (item.id && item.id > 0) {
          // UPDATE existing item (preserves file associations!)
          // Also update auditor fields if leader is self-auditing (no auditors assigned)
          await client.query(
            `UPDATE d7_audit_items SET
              item_name = $2,
              item_icon = $3,
              comments = $4,
              audit_judgment = $5,
              is_default = $6,
              display_order = $7,
              check_item = $8,
              due_date = $9,
              assigned_auditors = $10,
              auditor_judgment = COALESCE($11, auditor_judgment),
              auditor_comments = COALESCE($12, auditor_comments),
              auditor_completed = COALESCE($13, auditor_completed),
              sent_to_audit = COALESCE($14, sent_to_audit),
              audited_by = COALESCE($15, audited_by),
              verification_date = COALESCE($16, verification_date)
             WHERE id = $1`,
            [
              item.id,
              item.name,
              item.icon || '📎',
              item.comments || '',
              item.auditJudgment || '',
              item.isDefault || false,
              i,
              item.checkItem || '',
              item.dueDate || null,
              item.assignedAuditors || [],
              item.auditorJudgment || null,
              item.auditorComments || null,
              item.auditorCompleted || null,
              item.sentToAudit || null,
              item.auditedById || null,
              item.verificationDate || null
            ]
          );
          console.log(`  ✅ Updated audit item: ${item.name} (ID: ${item.id})`);
        } else {
          // INSERT new item (include auditor fields for self-audit by leader)
          const insertItemResult = await client.query(
            `INSERT INTO d7_audit_items (
              d7_validation_id, item_name, item_icon, comments, audit_judgment, is_default, display_order,
              check_item, due_date, assigned_auditors,
              auditor_judgment, auditor_comments, auditor_completed, sent_to_audit,
              audited_by, verification_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [
              validationId,
              item.name,
              item.icon || '📎',
              item.comments || '',
              item.auditJudgment || '',
              item.isDefault || false,
              i,
              item.checkItem || '',
              item.dueDate || null,
              item.assignedAuditors || [],
              item.auditorJudgment || null,
              item.auditorComments || null,
              item.auditorCompleted || false,
              item.sentToAudit || false,
              item.auditedById || null,
              item.verificationDate || null
            ]
          );
          const auditItemId = insertItemResult.rows[0].id;
          console.log(`  ✅ Inserted new audit item: ${item.name} (ID: ${auditItemId})`);

          // Track for email notification if sent to audit
          if (item.sentToAudit && item.assignedAuditors && item.assignedAuditors.length > 0) {
            itemsToNotify.push({
              ...item,
              id: auditItemId,
              isResend: false
            });
          }
        }

        // Track UPDATE items for email notification if sent to audit
        if (item.id && item.id > 0 && item.sentToAudit && item.assignedAuditors && item.assignedAuditors.length > 0) {
          // Check if this is a resend (needsResend flag from frontend)
          itemsToNotify.push({
            ...item,
            isResend: item.needsResend || false
          });
        }
      }
    }

    // Update d7_completed flag in eightd_reports
    const completed = (d3Implemented !== null && d3Effective !== null) || (d5Implemented !== null && d5Effective !== null);
    await client.query(
      `UPDATE eightd_reports SET d7_completed = $2, updated_at = NOW() WHERE id = $1`,
      [reportId, completed]
    );

    await client.query('COMMIT');
    console.log('✅ D7 validation and audit items saved successfully');

    // Send email notifications for items sent to audit
    let emailsSent = 0;
    if (itemsToNotify.length > 0) {
      // Get report info for email
      const reportResult = await client.query(
        'SELECT report_id, title FROM eightd_reports WHERE id = $1',
        [reportId]
      );
      const reportInfo = reportResult.rows[0];

      for (const item of itemsToNotify) {
        if (item.assignedAuditors && item.assignedAuditors.length > 0) {
          // Get auditor emails
          const auditorsResult = await pool.query(
            'SELECT email, first_name, last_name FROM users WHERE id = ANY($1)',
            [item.assignedAuditors]
          );

          for (const auditor of auditorsResult.rows) {
            try {
              await sendAuditNotification({
                to: auditor.email,
                reportId: reportInfo.report_id,
                reportTitle: reportInfo.title,
                itemName: item.name,
                checkItem: item.checkItem,
                dueDate: item.dueDate,
                round: item.auditRound || 1,
                isResend: item.isResend || false
              });
              emailsSent++;
              console.log(`📧 Email sent to ${auditor.email} for item: ${item.name}`);
            } catch (emailError) {
              console.error(`❌ Error sending email to ${auditor.email}:`, emailError.message);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'D7 validation saved successfully',
      data: { validationId, completed, emailsSent }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving D7 validation:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving D7 validation',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// UPLOAD VALIDATION FILES (before/after photos, SPC, evidence)
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation/upload-file
 * Upload a validation file (before_photo, after_photo, validation_evidence, spc_chart)
 */
router.post('/reports/:reportId/d7-validation/upload-file', upload.single('file'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { fileType } = req.body; // before_photo, after_photo, validation_evidence, spc_chart
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!['before_photo', 'after_photo', 'validation_evidence', 'spc_chart'].includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Must be: before_photo, after_photo, validation_evidence, or spc_chart'
      });
    }

    // Get or create D7 validation using ON CONFLICT to handle concurrent uploads
    const validationResult = await client.query(
      `INSERT INTO d7_validations (report_id)
       VALUES ($1)
       ON CONFLICT (report_id) DO UPDATE SET report_id = EXCLUDED.report_id
       RETURNING id`,
      [reportId]
    );

    const validationId = validationResult.rows[0].id;

    // Insert file record
    const fileUrl = `/uploads/d7-evidence/${req.file.filename}`;
    const fileResult = await client.query(
      `INSERT INTO d7_validation_files (
        d7_validation_id, file_type, file_name, file_url, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [validationId, fileType, req.file.originalname, fileUrl, userId]
    );

    try {
      const userResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const userRow = userResult.rows[0];
      const userName = userRow ? `${userRow.first_name} ${userRow.last_name}`.trim() : 'Sistema';
      await logAction({
        reportId: parseInt(reportId),
        actionType: 'file_uploaded',
        actionCategory: 'section',
        sectionName: 'd7',
        userId,
        userName,
        description: `Archivo subido en D7: ${req.file.originalname}`,
        newValue: { fileName: req.file.originalname, fileType: fileType }
      });
    } catch (auditError) {
      console.error('Error logging D7 file upload:', auditError);
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: fileResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    // Delete uploaded file if database insert failed
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// UPLOAD AUDIT ITEM FILE
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation/audit-item-file
 * Upload file for audit checklist item
 * This endpoint creates/updates the audit item if needed, then links the file
 */
router.post('/reports/:reportId/d7-validation/audit-item-file', upload.single('file'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { itemId, itemName, itemIcon, comments, auditJudgment, isDefault } = req.body;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    await client.query('BEGIN');

    // Get or create D7 validation
    const validationResult = await client.query(
      `INSERT INTO d7_validations (report_id)
       VALUES ($1)
       ON CONFLICT (report_id) DO UPDATE SET report_id = EXCLUDED.report_id
       RETURNING id`,
      [reportId]
    );

    const validationId = validationResult.rows[0].id;

    // Check if audit item exists in database (itemId could be a frontend-only temporary ID)
    let auditItemId = null;

    // Try to find existing item by ID if it looks like a database ID (positive integer)
    if (itemId && parseInt(itemId) > 0) {
      const existingItem = await client.query(
        `SELECT id FROM d7_audit_items WHERE id = $1 AND d7_validation_id = $2`,
        [itemId, validationId]
      );

      if (existingItem.rows.length > 0) {
        auditItemId = existingItem.rows[0].id;

        // Update existing item with latest data
        await client.query(
          `UPDATE d7_audit_items SET
            item_name = $2,
            item_icon = $3,
            comments = $4,
            audit_judgment = $5,
            is_default = $6
           WHERE id = $1`,
          [auditItemId, itemName, itemIcon || '📎', comments || '', auditJudgment || '', isDefault === 'true']
        );
        console.log(`  ✅ Updated existing audit item ID: ${auditItemId}`);
      }
    }

    // If item doesn't exist, create it
    if (!auditItemId) {
      const newItemResult = await client.query(
        `INSERT INTO d7_audit_items (
          d7_validation_id, item_name, item_icon, comments, audit_judgment, is_default, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(display_order), -1) + 1 FROM d7_audit_items WHERE d7_validation_id = $1))
        RETURNING id`,
        [validationId, itemName, itemIcon || '📎', comments || '', auditJudgment || '', isDefault === 'true']
      );

      auditItemId = newItemResult.rows[0].id;
      console.log(`  ✅ Created new audit item ID: ${auditItemId}`);
    }

    // Save file in d7_audit_item_files (linked to specific audit item)
    const fileUrl = `/uploads/d7-evidence/${req.file.filename}`;
    const fileResult = await client.query(
      `INSERT INTO d7_audit_item_files (
        d7_audit_item_id, file_name, file_url, uploaded_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [auditItemId, req.file.originalname, fileUrl, userId]
    );

    await client.query('COMMIT');

    console.log(`  ✅ File linked to audit item ${auditItemId}: ${req.file.originalname}`);

    res.json({
      success: true,
      message: 'Audit item file uploaded successfully',
      data: {
        auditItemId: auditItemId,  // Return the DB ID so frontend can update if needed
        file: fileResult.rows[0]
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error uploading audit item file:', error);
    // Delete uploaded file if database insert failed
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading audit item file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// DELETE VALIDATION FILE
// ============================================
/**
 * DELETE /api/8d/reports/:reportId/d7-validation/files/:fileId
 * Deletes files from either d7_audit_item_files or d7_validation_files
 */
router.delete('/reports/:reportId/d7-validation/files/:fileId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { fileId } = req.params;

    // Try to find file in d7_audit_item_files first (audit item files)
    let fileResult = await client.query(
      `SELECT file_url FROM d7_audit_item_files WHERE id = $1`,
      [fileId]
    );

    let tableName = 'd7_audit_item_files';

    // If not found, try d7_validation_files (training files, before/after photos, etc.)
    if (fileResult.rows.length === 0) {
      fileResult = await client.query(
        `SELECT file_url FROM d7_validation_files WHERE id = $1`,
        [fileId]
      );
      tableName = 'd7_validation_files';
    }

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const fileUrl = fileResult.rows[0].file_url;

    // Delete from database
    await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [fileId]);

    // Delete physical file
    const filePath = path.join(__dirname, '..', fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log(`  ✅ Deleted file from ${tableName}: ${fileUrl}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// ADD/UPDATE DOCUMENT UPDATED
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation/documents
 * Add or update a document update entry
 */
router.post('/reports/:reportId/d7-validation/documents', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { documentType, updated, revisionNumber, notes, modifiedItems } = req.body;

    // Get D7 validation ID
    let validationResult = await client.query(
      `SELECT id FROM d7_validations WHERE report_id = $1`,
      [reportId]
    );

    let validationId;
    if (validationResult.rows.length === 0) {
      const insertResult = await client.query(
        `INSERT INTO d7_validations (report_id) VALUES ($1) RETURNING id`,
        [reportId]
      );
      validationId = insertResult.rows[0].id;
    } else {
      validationId = validationResult.rows[0].id;
    }

    // Check if document entry already exists
    const existingDoc = await client.query(
      `SELECT id FROM d7_documents_updated
       WHERE d7_validation_id = $1 AND document_type = $2`,
      [validationId, documentType]
    );

    let documentId;

    if (existingDoc.rows.length > 0) {
      // UPDATE existing
      documentId = existingDoc.rows[0].id;
      await client.query(
        `UPDATE d7_documents_updated SET
          updated = $2,
          revision_number = $3,
          notes = $4,
          modified_items = $5,
          updated_at = NOW()
         WHERE id = $1`,
        [documentId, updated, revisionNumber, notes, modifiedItems]
      );
    } else {
      // INSERT new
      const insertResult = await client.query(
        `INSERT INTO d7_documents_updated (
          d7_validation_id, document_type, updated, revision_number, notes, modified_items
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [validationId, documentType, updated, revisionNumber, notes, modifiedItems]
      );
      documentId = insertResult.rows[0].id;
    }

    res.json({
      success: true,
      message: 'Document entry saved successfully',
      data: { documentId }
    });

  } catch (error) {
    console.error('❌ Error saving document entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving document entry',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// UPLOAD DOCUMENT FILE
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation/documents/:documentId/upload
 */
router.post('/reports/:reportId/d7-validation/documents/:documentId/upload', upload.single('file'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { documentId } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/d7-evidence/${req.file.filename}`;
    const fileResult = await client.query(
      `INSERT INTO d7_document_files (
        d7_document_id, file_name, file_url, uploaded_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [documentId, req.file.originalname, fileUrl, userId]
    );

    res.json({
      success: true,
      message: 'Document file uploaded successfully',
      data: fileResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error uploading document file:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading document file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// ADD TRAINING EMPLOYEE
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation/training-employees
 */
router.post('/reports/:reportId/d7-validation/training-employees', async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { employeeName, position, area, trainingDate, evidenceFileName, evidenceFileUrl } = req.body;

    // Get D7 validation ID
    let validationResult = await client.query(
      `SELECT id FROM d7_validations WHERE report_id = $1`,
      [reportId]
    );

    let validationId;
    if (validationResult.rows.length === 0) {
      const insertResult = await client.query(
        `INSERT INTO d7_validations (report_id) VALUES ($1) RETURNING id`,
        [reportId]
      );
      validationId = insertResult.rows[0].id;
    } else {
      validationId = validationResult.rows[0].id;
    }

    // Insert employee
    const employeeResult = await client.query(
      `INSERT INTO d7_training_employees (
        d7_validation_id, employee_name, position, area, training_date,
        evidence_file_name, evidence_file_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [validationId, employeeName, position, area, trainingDate, evidenceFileName, evidenceFileUrl]
    );

    res.json({
      success: true,
      message: 'Training employee added successfully',
      data: employeeResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error adding training employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding training employee',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// DELETE TRAINING EMPLOYEE
// ============================================
/**
 * DELETE /api/8d/reports/:reportId/d7-validation/training-employees/:employeeId
 */
router.delete('/reports/:reportId/d7-validation/training-employees/:employeeId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { employeeId } = req.params;

    await client.query(
      `DELETE FROM d7_training_employees WHERE id = $1`,
      [employeeId]
    );

    res.json({
      success: true,
      message: 'Training employee removed successfully'
    });

  } catch (error) {
    console.error('❌ Error removing training employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing training employee',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// UPLOAD TRAINING FILE
// ============================================
/**
 * POST /api/8d/reports/:reportId/d7-validation/training-files
 */
router.post('/reports/:reportId/d7-validation/training-files', upload.single('file'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { reportId } = req.params;
    const { fileType } = req.body; // attendance, material, evaluation, photos, other
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get D7 validation ID
    let validationResult = await client.query(
      `SELECT id FROM d7_validations WHERE report_id = $1`,
      [reportId]
    );

    let validationId;
    if (validationResult.rows.length === 0) {
      const insertResult = await client.query(
        `INSERT INTO d7_validations (report_id) VALUES ($1) RETURNING id`,
        [reportId]
      );
      validationId = insertResult.rows[0].id;
    } else {
      validationId = validationResult.rows[0].id;
    }

    const fileUrl = `/uploads/d7-evidence/${req.file.filename}`;
    const fileResult = await client.query(
      `INSERT INTO d7_training_files (
        d7_validation_id, file_type, file_name, file_url, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [validationId, fileType, req.file.originalname, fileUrl, userId]
    );

    res.json({
      success: true,
      message: 'Training file uploaded successfully',
      data: fileResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error uploading training file:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading training file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// DELETE TRAINING FILE
// ============================================
/**
 * DELETE /api/8d/reports/:reportId/d7-validation/training-files/:fileId
 */
router.delete('/reports/:reportId/d7-validation/training-files/:fileId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { fileId } = req.params;

    // Get file info
    const fileResult = await client.query(
      `SELECT file_url FROM d7_training_files WHERE id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const fileUrl = fileResult.rows[0].file_url;

    // Delete from database
    await client.query(`DELETE FROM d7_training_files WHERE id = $1`, [fileId]);

    // Delete physical file
    const filePath = path.join(__dirname, '..', fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: 'Training file deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting training file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting training file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// DELETE DOCUMENT FILE
// ============================================
/**
 * DELETE /api/8d/reports/:reportId/d7-validation/documents/:documentId/files/:fileId
 */
router.delete('/reports/:reportId/d7-validation/documents/:documentId/files/:fileId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { fileId } = req.params;

    // Get file info
    const fileResult = await client.query(
      `SELECT file_url FROM d7_document_files WHERE id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const fileUrl = fileResult.rows[0].file_url;

    // Delete from database
    await client.query(`DELETE FROM d7_document_files WHERE id = $1`, [fileId]);

    // Delete physical file
    const filePath = path.join(__dirname, '..', fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: 'Document file deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting document file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document file',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// ============================================
// D7 APPROVAL ENDPOINTS
// ============================================
// NOTE: D7 approval endpoints have been moved to approvalEndpoints.js
// for multi-level approval consistency with D4, D5, D6
// See:
//   - POST /api/8d/reports/:id/d7/approve
//   - PUT /api/8d/reports/:id/d7/send-to-approval


module.exports = router;
