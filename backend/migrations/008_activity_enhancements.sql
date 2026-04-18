-- ============================================================================
-- ACTIVITY ENHANCEMENTS - Coverage, Recurring, Feedback Log
-- Migration: 008_activity_enhancements.sql
-- ============================================================================

-- ============================================================================
-- 1. NEW COLUMNS FOR workload_activities
-- ============================================================================

-- Recurring group ID - to link instances of recurring activities
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS recurring_group_id UUID;

-- Deliverable type - what kind of output is expected
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS deliverable_type VARCHAR(50);

-- MoSCoW priority - replaces/extends current priority
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS moscow_priority VARCHAR(20) CHECK (moscow_priority IN ('must', 'should', 'could', 'wont'));

-- Weight/Impact - percentage weight for evaluation
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS weight_percent DECIMAL(5,2) DEFAULT 0;

-- Evidence required flag
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS requires_evidence BOOLEAN DEFAULT FALSE;

-- Recurring activity details
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly'));

ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS frequency_details JSONB DEFAULT '{}';

ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS recurring_duration VARCHAR(20) CHECK (recurring_duration IN ('3_months', '6_months', '1_year', '2_years'));

-- Index for recurring group lookups
CREATE INDEX IF NOT EXISTS idx_workload_activities_recurring_group
ON workload_activities(recurring_group_id) WHERE recurring_group_id IS NOT NULL;

-- Index for moscow priority filtering
CREATE INDEX IF NOT EXISTS idx_workload_activities_moscow ON workload_activities(moscow_priority);

-- ============================================================================
-- 2. COVERAGE TABLE - Vacation/Sick Leave Coverage
-- ============================================================================

CREATE TABLE IF NOT EXISTS workload_activity_coverage (
    id SERIAL PRIMARY KEY,

    -- Activity link (NULL = all activities for this person)
    activity_id INTEGER REFERENCES workload_activities(id) ON DELETE CASCADE,

    -- Coverage participants
    original_assignee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    substitute_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Coverage period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Reason for coverage
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'vacation',
        'sick_leave',
        'training',
        'temporary_assignment',
        'maternity_leave',
        'paternity_leave',
        'other'
    )),
    reason_notes TEXT,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),

    -- Approval
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,

    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_coverage_dates CHECK (end_date >= start_date),
    CONSTRAINT check_different_users CHECK (original_assignee_id != substitute_id)
);

-- Indexes for coverage queries
CREATE INDEX IF NOT EXISTS idx_coverage_original ON workload_activity_coverage(original_assignee_id);
CREATE INDEX IF NOT EXISTS idx_coverage_substitute ON workload_activity_coverage(substitute_id);
CREATE INDEX IF NOT EXISTS idx_coverage_dates ON workload_activity_coverage(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_coverage_status ON workload_activity_coverage(status);
CREATE INDEX IF NOT EXISTS idx_coverage_activity ON workload_activity_coverage(activity_id) WHERE activity_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_coverage_updated_at ON workload_activity_coverage;
CREATE TRIGGER update_coverage_updated_at
    BEFORE UPDATE ON workload_activity_coverage
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

-- ============================================================================
-- 3. SUPERVISOR FEEDBACK LOG - Recognition and Warnings
-- ============================================================================

CREATE TABLE IF NOT EXISTS workload_supervisor_feedback_log (
    id SERIAL PRIMARY KEY,

    -- Context
    activity_id INTEGER REFERENCES workload_activities(id) ON DELETE SET NULL,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Feedback type
    feedback_type VARCHAR(30) NOT NULL CHECK (feedback_type IN (
        'recognition',           -- Felicitacion
        'warning',               -- Llamada de atencion
        'coaching',              -- Retroalimentacion constructiva
        'achievement',           -- Logro destacado
        'improvement_needed',    -- Area de mejora
        'note'                   -- Nota general
    )),

    -- Content
    title VARCHAR(255),
    comment TEXT NOT NULL,

    -- Visibility
    is_visible_to_employee BOOLEAN DEFAULT TRUE,

    -- Severity/Impact (for warnings and improvements)
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),

    -- Follow-up tracking
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_date DATE,
    followup_completed BOOLEAN DEFAULT FALSE,
    followup_notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_log_employee ON workload_supervisor_feedback_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_log_supervisor ON workload_supervisor_feedback_log(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_log_activity ON workload_supervisor_feedback_log(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_log_type ON workload_supervisor_feedback_log(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_log_date ON workload_supervisor_feedback_log(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_log_followup ON workload_supervisor_feedback_log(requires_followup, followup_completed)
    WHERE requires_followup = TRUE;

-- ============================================================================
-- 4. DELIVERABLE TYPES REFERENCE (Optional - for dropdown population)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workload_deliverable_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default deliverable types
INSERT INTO workload_deliverable_types (code, name, icon, display_order) VALUES
    ('report', 'Reporte', '📄', 1),
    ('presentation', 'Presentacion', '📊', 2),
    ('analysis', 'Analisis', '📈', 3),
    ('document', 'Documento', '📝', 4),
    ('meeting', 'Reunion', '👥', 5),
    ('training', 'Capacitacion', '🎓', 6),
    ('audit', 'Auditoria', '🔍', 7),
    ('process', 'Proceso', '⚙️', 8),
    ('code', 'Codigo/Software', '💻', 9),
    ('data', 'Datos/Base de datos', '🗃️', 10),
    ('other', 'Otro', '📦', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 5. UPDATE FUNCTION FOR ACTIVATING COVERAGES
-- ============================================================================

-- Function to auto-activate coverages based on date
CREATE OR REPLACE FUNCTION activate_pending_coverages()
RETURNS void AS $$
BEGIN
    UPDATE workload_activity_coverage
    SET status = 'active'
    WHERE status = 'pending'
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE;

    UPDATE workload_activity_coverage
    SET status = 'completed'
    WHERE status = 'active'
      AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 008_activity_enhancements.sql';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added to workload_activities:';
    RAISE NOTICE '  - recurring_group_id (UUID)';
    RAISE NOTICE '  - deliverable_type (VARCHAR)';
    RAISE NOTICE '  - moscow_priority (must/should/could/wont)';
    RAISE NOTICE '  - weight_percent (DECIMAL)';
    RAISE NOTICE '  - requires_evidence (BOOLEAN)';
    RAISE NOTICE '  - is_recurring, frequency, frequency_details, recurring_duration';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - workload_activity_coverage';
    RAISE NOTICE '  - workload_supervisor_feedback_log';
    RAISE NOTICE '  - workload_deliverable_types';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed successfully!';
END $$;
