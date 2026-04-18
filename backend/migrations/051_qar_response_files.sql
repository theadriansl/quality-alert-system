-- ============================================================================
-- QAR Response Files
-- Migration: 051_qar_response_files.sql
-- Allows attaching images, PDFs and documents to a QAR response
-- ============================================================================

CREATE TABLE IF NOT EXISTS qar_response_files (
  id            SERIAL PRIMARY KEY,
  qar_id        INTEGER NOT NULL REFERENCES quality_alerts(id) ON DELETE CASCADE,
  filename      VARCHAR(500) NOT NULL,          -- stored filename on disk
  original_name VARCHAR(500) NOT NULL,          -- original upload name
  mimetype      VARCHAR(100),
  file_size     INTEGER,                        -- bytes
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qar_response_files_qar_id ON qar_response_files(qar_id);
