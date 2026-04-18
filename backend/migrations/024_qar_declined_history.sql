-- Migration: QAR Declined History
-- Track when users decline to emit a QAR after threshold is triggered

-- Table to store declined QAR history
CREATE TABLE IF NOT EXISTS qar_declined_history (
    id SERIAL PRIMARY KEY,

    -- Context of the decline
    part_id INTEGER REFERENCES client_parts(id),
    severity_id INTEGER REFERENCES inspection_severities(id),
    department_id INTEGER REFERENCES departments(id),

    -- Threshold info at time of decline
    defect_count INTEGER NOT NULL,
    threshold_count INTEGER NOT NULL,
    threshold_hours INTEGER NOT NULL,

    -- User who declined
    declined_by INTEGER REFERENCES users(id),
    declined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Defects that triggered the alert (stored as JSON array of IDs)
    defect_ids JSONB DEFAULT '[]',

    -- Optional reason (for future use)
    reason TEXT,

    -- Was a QAR eventually created for these defects?
    qar_created_later BOOLEAN DEFAULT FALSE,
    qar_id INTEGER REFERENCES quality_alerts(id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_qar_declined_part ON qar_declined_history(part_id);
CREATE INDEX IF NOT EXISTS idx_qar_declined_at ON qar_declined_history(declined_at);
CREATE INDEX IF NOT EXISTS idx_qar_declined_by ON qar_declined_history(declined_by);

-- Add column to defect_entries_v2 to track if linked to a QAR
-- This makes it easy to show "has QAR" in searches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'defect_entries_v2' AND column_name = 'qar_id'
    ) THEN
        ALTER TABLE defect_entries_v2 ADD COLUMN qar_id INTEGER REFERENCES quality_alerts(id);
        CREATE INDEX idx_defect_entries_v2_qar ON defect_entries_v2(qar_id);
    END IF;
END $$;

COMMENT ON TABLE qar_declined_history IS 'Tracks when users decline to emit a QAR after threshold is triggered';
COMMENT ON COLUMN qar_declined_history.defect_ids IS 'JSON array of defect IDs that triggered the alert';
