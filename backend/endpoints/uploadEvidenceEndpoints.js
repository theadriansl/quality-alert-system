/**
 * Upload Evidence Endpoints
 * Handles file uploads for D3-MFG evidence (photos, documents, etc.)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// MULTER CONFIGURATION FOR EVIDENCE
// ============================================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/evidence');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo imágenes y documentos.'));
    }
  }
});

// ============================================================================
// ROUTES
// ============================================================================

module.exports = (app) => {

  /**
   * POST /upload/evidence
   * Upload a single evidence file
   */
  app.post('/upload/evidence', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      // Return file information
      const fileInfo = {
        name: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        url: `/uploads/evidence/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      };

      res.json({
        message: 'Evidencia subida exitosamente',
        ...fileInfo
      });

    } catch (error) {
      console.error('Error uploading evidence:', error);
      res.status(500).json({ error: 'Error al subir evidencia' });
    }
  });

  /**
   * DELETE /upload/evidence/:filename
   * Delete an evidence file
   */
  app.delete('/upload/evidence/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads/evidence', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      // Delete file
      fs.unlinkSync(filePath);

      res.json({ message: 'Evidencia eliminada exitosamente' });

    } catch (error) {
      console.error('Error deleting evidence:', error);
      res.status(500).json({ error: 'Error al eliminar evidencia' });
    }
  });

};
