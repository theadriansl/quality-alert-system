-- ============================================
-- D7 VALIDATION STRUCTURE - COMPLETE
-- ============================================
-- This migration creates a complete relational structure for D7 validation
-- including before/after evidence, SPC validation, document updates, and employee training

BEGIN;

-- ============================================
-- TABLE 1: d7_validations (Main validation data)
-- ============================================
CREATE TABLE IF NOT EXISTS d7_validations (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES eightd_reports(id) ON DELETE CASCADE,

    -- BEFORE/AFTER EVIDENCE (at the top of D7)
    before_condition TEXT,
    after_condition TEXT,
    -- Photos will be in d7_validation_files with type 'before_photo' and 'after_photo'

    -- EFFECTIVENESS VALIDATION
    is_effective BOOLEAN DEFAULT NULL,
    validation_evidence TEXT,
    validation_date DATE,
    monitoring_period INTEGER DEFAULT 60, -- days (30, 60, 90, etc.)

    -- SPC VALIDATION
    spc_validated BOOLEAN DEFAULT NULL,
    spc_comments TEXT,
    -- SPC files will be in d7_validation_files with type 'spc_chart'

    -- TRAINING
    training_completed BOOLEAN DEFAULT FALSE,
    training_dates TEXT[], -- Array of dates ["2025-01-10", "2025-01-11"]
    training_instructor VARCHAR(255),
    training_topics TEXT,
    training_method VARCHAR(255), -- "Presencial", "Virtual", "Práctica supervisada", etc.
    competency_verified BOOLEAN DEFAULT NULL,
    competency_method TEXT[], -- ["Examen escrito", "Práctica supervisada", etc.]

    -- METADATA
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure one validation per report
    CONSTRAINT unique_report_validation UNIQUE(report_id)
);

COMMENT ON TABLE d7_validations IS 'D7 - Main validation data including effectiveness, SPC, and training';
COMMENT ON COLUMN d7_validations.before_condition IS 'Description of condition BEFORE corrective actions';
COMMENT ON COLUMN d7_validations.after_condition IS 'Description of condition AFTER corrective actions';
COMMENT ON COLUMN d7_validations.is_effective IS 'Were the countermeasures effective? (true/false/null)';
COMMENT ON COLUMN d7_validations.monitoring_period IS 'How many days was the solution monitored (30, 60, 90, etc.)';
COMMENT ON COLUMN d7_validations.spc_validated IS 'Was SPC validation performed?';
COMMENT ON COLUMN d7_validations.competency_verified IS 'Was employee competency verified after training?';


-- ============================================
-- TABLE 2: d7_validation_files (Validation and SPC evidence files)
-- ============================================
CREATE TABLE IF NOT EXISTS d7_validation_files (
    id SERIAL PRIMARY KEY,
    d7_validation_id INTEGER NOT NULL REFERENCES d7_validations(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('before_photo', 'after_photo', 'validation_evidence', 'spc_chart')),
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    uploaded_by INTEGER REFERENCES users(id),

    CONSTRAINT valid_file_type CHECK (file_type IN ('before_photo', 'after_photo', 'validation_evidence', 'spc_chart'))
);

COMMENT ON TABLE d7_validation_files IS 'Files for before/after photos, validation evidence, and SPC charts';
COMMENT ON COLUMN d7_validation_files.file_type IS 'Type: before_photo, after_photo, validation_evidence, spc_chart';


-- ============================================
-- TABLE 3: d7_documents_updated (Document update tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS d7_documents_updated (
    id SERIAL PRIMARY KEY,
    d7_validation_id INTEGER NOT NULL REFERENCES d7_validations(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    updated BOOLEAN DEFAULT NULL, -- true = updated, false = not updated, null = N/A
    revision_number VARCHAR(50),
    notes TEXT,
    modified_items TEXT, -- List of specific items modified (e.g., "IT-001, IT-045")
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_document_type CHECK (document_type IN ('AMEF', 'Control Plan', 'Work Instructions', 'Procedures', 'Specifications'))
);

COMMENT ON TABLE d7_documents_updated IS 'Track which quality documents were updated (AMEF, Control Plan, etc.)';
COMMENT ON COLUMN d7_documents_updated.document_type IS 'Type: AMEF, Control Plan, Work Instructions, Procedures, Specifications';
COMMENT ON COLUMN d7_documents_updated.updated IS 'true=updated, false=not updated, null=N/A';
COMMENT ON COLUMN d7_documents_updated.modified_items IS 'List of specific modified items (e.g., IT-001, IT-045)';


-- ============================================
-- TABLE 4: d7_document_files (Document evidence files)
-- ============================================
CREATE TABLE IF NOT EXISTS d7_document_files (
    id SERIAL PRIMARY KEY,
    d7_document_id INTEGER NOT NULL REFERENCES d7_documents_updated(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    uploaded_by INTEGER REFERENCES users(id)
);

COMMENT ON TABLE d7_document_files IS 'Evidence files for updated documents (AMEF revisions, updated procedures, etc.)';


-- ============================================
-- TABLE 5: d7_training_employees (Trained employees list)
-- ============================================
CREATE TABLE IF NOT EXISTS d7_training_employees (
    id SERIAL PRIMARY KEY,
    d7_validation_id INTEGER NOT NULL REFERENCES d7_validations(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    area VARCHAR(255),
    training_date DATE,
    evidence_file_name VARCHAR(255),
    evidence_file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE d7_training_employees IS 'List of employees trained on corrective actions';
COMMENT ON COLUMN d7_training_employees.evidence_file_name IS 'Individual employee training evidence (signature, certificate, etc.)';


-- ============================================
-- TABLE 6: d7_training_files (Training materials and evidence)
-- ============================================
CREATE TABLE IF NOT EXISTS d7_training_files (
    id SERIAL PRIMARY KEY,
    d7_validation_id INTEGER NOT NULL REFERENCES d7_validations(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    uploaded_by INTEGER REFERENCES users(id),

    CONSTRAINT valid_training_file_type CHECK (file_type IN ('attendance', 'material', 'evaluation', 'photos', 'other'))
);

COMMENT ON TABLE d7_training_files IS 'Training files: attendance lists, materials, evaluations, photos';
COMMENT ON COLUMN d7_training_files.file_type IS 'Type: attendance, material, evaluation, photos, other';


-- ============================================
-- INDEXES for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_d7_validations_report_id ON d7_validations(report_id);
CREATE INDEX IF NOT EXISTS idx_d7_validation_files_validation_id ON d7_validation_files(d7_validation_id);
CREATE INDEX IF NOT EXISTS idx_d7_validation_files_type ON d7_validation_files(file_type);
CREATE INDEX IF NOT EXISTS idx_d7_documents_updated_validation_id ON d7_documents_updated(d7_validation_id);
CREATE INDEX IF NOT EXISTS idx_d7_documents_updated_type ON d7_documents_updated(document_type);
CREATE INDEX IF NOT EXISTS idx_d7_document_files_document_id ON d7_document_files(d7_document_id);
CREATE INDEX IF NOT EXISTS idx_d7_training_employees_validation_id ON d7_training_employees(d7_validation_id);
CREATE INDEX IF NOT EXISTS idx_d7_training_files_validation_id ON d7_training_files(d7_validation_id);
CREATE INDEX IF NOT EXISTS idx_d7_training_files_type ON d7_training_files(file_type);


-- ============================================
-- DROP OLD D7 FIELDS FROM eightd_reports (if they exist)
-- ============================================
-- These simple text fields will be replaced by the new relational structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports' AND column_name = 'd7_temporary_validation') THEN
        ALTER TABLE eightd_reports DROP COLUMN d7_temporary_validation;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports' AND column_name = 'd7_definitive_validation') THEN
        ALTER TABLE eightd_reports DROP COLUMN d7_definitive_validation;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports' AND column_name = 'd7_validation_evidence') THEN
        ALTER TABLE eightd_reports DROP COLUMN d7_validation_evidence;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports' AND column_name = 'd7_is_effective') THEN
        ALTER TABLE eightd_reports DROP COLUMN d7_is_effective;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports' AND column_name = 'd7_validation_date') THEN
        ALTER TABLE eightd_reports DROP COLUMN d7_validation_date;
    END IF;
END $$;

-- Keep d7_completed in eightd_reports for status tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'eightd_reports' AND column_name = 'd7_completed') THEN
        ALTER TABLE eightd_reports ADD COLUMN d7_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

COMMENT ON COLUMN eightd_reports.d7_completed IS 'Is D7 validation section completed?';


-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON d7_validations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON d7_validation_files TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON d7_documents_updated TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON d7_document_files TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON d7_training_employees TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON d7_training_files TO postgres;

GRANT USAGE, SELECT ON SEQUENCE d7_validations_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE d7_validation_files_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE d7_documents_updated_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE d7_document_files_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE d7_training_employees_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE d7_training_files_id_seq TO postgres;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'd7_%';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'd7_validations';
