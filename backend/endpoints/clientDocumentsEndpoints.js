/**
 * Client Documents Endpoints - PostgreSQL Implementation
 * Handles file uploads, downloads, and document management for clients
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/client-documents');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, sanitized + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, Word, Excel, PowerPoint, Images, Text, CSV, ZIP'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// ============================================================================
// TIMELINE HELPER
// ============================================================================

async function addTimelineEvent(clientId, eventType, description, userName) {
  try {
    await query(`
      INSERT INTO client_timeline (client_id, event_type, event_category, description, user_name)
      VALUES ($1, $2, $3, $4, $5)
    `, [clientId, eventType, 'documents', description, userName || 'System']);
  } catch (error) {
    console.error('Error adding timeline event:', error);
    // Don't fail the main operation if timeline fails
  }
}

// ============================================================================
// ENDPOINTS
// ============================================================================

const setupClientDocumentsEndpoints = (app) => {

  // ==========================================================================
  // GET /clients/:clientId/documents - List all documents for a client
  // ==========================================================================
  app.get('/clients/:clientId/documents', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const result = await query(`
        SELECT
          id, client_id, file_name, title, file_size, file_type,
          file_path, server_file_name, uploaded_by, description, uploaded_at
        FROM client_documents
        WHERE client_id = $1
        ORDER BY uploaded_at DESC
      `, [clientId]);

      res.json({
        success: true,
        documents: transformToCamelCase(result.rows),
        total: result.rows.length
      });

    } catch (error) {
      console.error('Error fetching client documents:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching documents',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /clients/:clientId/documents/upload - Upload a document
  // ==========================================================================
  app.post('/clients/:clientId/documents/upload', upload.single('file'), async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Insert document record into database
      const result = await query(`
        INSERT INTO client_documents (
          client_id, file_name, title, file_size, file_type,
          file_path, server_file_name, uploaded_by, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        clientId,
        req.file.originalname,
        req.body.title || req.file.originalname,
        req.file.size,
        req.file.mimetype,
        `/uploads/client-documents/${req.file.filename}`,
        req.file.filename,
        req.body.uploadedBy || 'System',
        req.body.description || ''
      ]);

      const document = result.rows[0];

      // Add timeline event
      await addTimelineEvent(
        clientId,
        'document_uploaded',
        `Document "${document.title}" uploaded`,
        req.body.uploadedBy
      );

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        document: transformToCamelCase(document)
      });

    } catch (error) {
      console.error('Error uploading document:', error);

      // Clean up uploaded file if database insert failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Error uploading document',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /clients/:clientId/documents/:documentId - Get document metadata
  // ==========================================================================
  app.get('/clients/:clientId/documents/:documentId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const documentId = parseInt(req.params.documentId);

      const result = await query(`
        SELECT * FROM client_documents
        WHERE id = $1 AND client_id = $2
      `, [documentId, clientId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      res.json({
        success: true,
        document: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching document',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /clients/:clientId/documents/:documentId/download - Download file
  // ==========================================================================
  app.get('/clients/:clientId/documents/:documentId/download', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const documentId = parseInt(req.params.documentId);

      const result = await query(`
        SELECT * FROM client_documents
        WHERE id = $1 AND client_id = $2
      `, [documentId, clientId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      const document = result.rows[0];
      const filePath = path.join(__dirname, '..', 'uploads', 'client-documents', document.server_file_name);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      // Send file for download
      res.download(filePath, document.file_name, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error downloading file'
            });
          }
        }
      });

    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading document',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // PUT /clients/:clientId/documents/:documentId - Update document metadata
  // ==========================================================================
  app.put('/clients/:clientId/documents/:documentId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const documentId = parseInt(req.params.documentId);

      // Convert camelCase to snake_case for database
      const updates = transformToSnakeCase(req.body);

      // Build dynamic UPDATE query
      const allowedFields = ['title', 'description'];
      const setClause = [];
      const values = [];
      let paramCount = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      values.push(documentId, clientId);

      const result = await query(`
        UPDATE client_documents
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount} AND client_id = $${paramCount + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      const document = result.rows[0];

      // Add timeline event
      await addTimelineEvent(
        clientId,
        'document_updated',
        `Document "${document.title}" updated`,
        req.body.updatedBy
      );

      res.json({
        success: true,
        message: 'Document updated successfully',
        document: transformToCamelCase(document)
      });

    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating document',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // DELETE /clients/:clientId/documents/:documentId - Delete document
  // ==========================================================================
  app.delete('/clients/:clientId/documents/:documentId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const documentId = parseInt(req.params.documentId);

      // Get document info before deleting
      const result = await query(`
        SELECT * FROM client_documents
        WHERE id = $1 AND client_id = $2
      `, [documentId, clientId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      const document = result.rows[0];

      // Delete from database
      await query(`
        DELETE FROM client_documents
        WHERE id = $1 AND client_id = $2
      `, [documentId, clientId]);

      // Delete physical file
      const filePath = path.join(__dirname, '..', 'uploads', 'client-documents', document.server_file_name);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('Error deleting physical file:', error);
          // Continue anyway, database record is deleted
        }
      }

      // Add timeline event
      await addTimelineEvent(
        clientId,
        'document_deleted',
        `Document "${document.title}" deleted`,
        req.body.deletedBy || req.query.deletedBy
      );

      res.json({
        success: true,
        message: 'Document deleted successfully',
        document: transformToCamelCase(document)
      });

    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting document',
        error: error.message
      });
    }
  });

};

module.exports = setupClientDocumentsEndpoints;
