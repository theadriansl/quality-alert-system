-- ============================================================================
-- WORKLOAD FEEDBACK - Quarterly Performance Reviews
-- Migration: 006_workload_feedback.sql
-- ============================================================================

-- Quarterly Feedback/Reviews
CREATE TABLE IF NOT EXISTS workload_feedback (
    id SERIAL PRIMARY KEY,

    -- Who is being reviewed
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_level INTEGER DEFAULT 3,  -- 0=Director, 1=Gerente, 2=Supervisor, 3=Staff

    -- Who is reviewing
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Period
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL CHECK (fiscal_quarter BETWEEN 1 AND 4),
    review_date DATE DEFAULT CURRENT_DATE,

    -- FACTORES (Inputs) - Aggregated metrics
    activities_planned INTEGER DEFAULT 0,
    activities_completed INTEGER DEFAULT 0,
    activities_unplanned INTEGER DEFAULT 0,
    hours_available DECIMAL(6,1) DEFAULT 0,
    hours_planned DECIMAL(6,1) DEFAULT 0,
    hours_actual DECIMAL(6,1) DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,  -- % of planned activities completed

    -- RESULTADOS (Outputs) - KPI performance
    kpi_scores JSONB DEFAULT '{}',  -- { "Q": 85, "C": 90, "T": 75, "S": 100, "P": 80 }
    objectives_progress JSONB DEFAULT '[]',  -- Array of { objectiveId, name, targetValue, currentValue, progressPercent }
    overall_score DECIMAL(5,2) DEFAULT 0,  -- Weighted average of KPIs

    -- FEEDBACK (Qualitative)
    strengths TEXT,  -- What went well
    areas_of_improvement TEXT,  -- What to improve
    comments TEXT,  -- General comments
    recognitions TEXT,  -- Special recognitions

    -- COMPROMISOS (Commitments for next quarter)
    commitments JSONB DEFAULT '[]',  -- Array of { description, dueDate, status }
    training_needs TEXT,
    kpi_adjustments TEXT,

    -- Signatures
    employee_signature BOOLEAN DEFAULT FALSE,
    employee_signed_at TIMESTAMP,
    reviewer_signature BOOLEAN DEFAULT FALSE,
    reviewer_signed_at TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'pending_signature', 'completed', 'disputed')),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Unique constraint: one review per employee per quarter
    UNIQUE(employee_id, fiscal_year, fiscal_quarter)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workload_feedback_employee ON workload_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_workload_feedback_reviewer ON workload_feedback(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_workload_feedback_period ON workload_feedback(fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_workload_feedback_status ON workload_feedback(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workload_feedback_updated_at ON workload_feedback;
CREATE TRIGGER update_workload_feedback_updated_at
    BEFORE UPDATE ON workload_feedback
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Workload Feedback table created successfully!';
    RAISE NOTICE '   - workload_feedback (Quarterly reviews)';
END $$;
