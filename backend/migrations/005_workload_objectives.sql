-- ============================================================================
-- WORKLOAD OBJECTIVES - Organizational Objectives with Cascading
-- Migration: 005_workload_objectives.sql
-- ============================================================================

-- Organizational Objectives with QCTSP hierarchy and cascading
CREATE TABLE IF NOT EXISTS workload_objectives (
    id SERIAL PRIMARY KEY,

    -- Basic info
    code VARCHAR(10) NOT NULL,  -- Q, C, T, S, P (links to workload_kpis)
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Target and progress
    target_value DECIMAL(10,2),
    target_unit VARCHAR(50) DEFAULT '%',  -- %, hours, count, $, etc.
    current_value DECIMAL(10,2) DEFAULT 0,
    baseline_value DECIMAL(10,2) DEFAULT 0,  -- Starting point

    -- Time period
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER,  -- NULL for annual, 1-4 for quarterly
    start_date DATE,
    end_date DATE,

    -- Ownership and hierarchy
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    owner_level INTEGER DEFAULT 0,  -- 0=Director, 1=Gerente, 2=Supervisor, 3=Staff
    department VARCHAR(100),

    -- Cascading relationship
    parent_objective_id INTEGER REFERENCES workload_objectives(id) ON DELETE SET NULL,
    contribution_percent DECIMAL(5,2) DEFAULT 100,  -- % this contributes to parent

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    progress_percent DECIMAL(5,2) DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workload_objectives_owner ON workload_objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_workload_objectives_parent ON workload_objectives(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_workload_objectives_year ON workload_objectives(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_workload_objectives_code ON workload_objectives(code);
CREATE INDEX IF NOT EXISTS idx_workload_objectives_status ON workload_objectives(status);

-- Link activities to objectives (optional - for tracking)
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS objective_id INTEGER REFERENCES workload_objectives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workload_activities_objective ON workload_activities(objective_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workload_objectives_updated_at ON workload_objectives;
CREATE TRIGGER update_workload_objectives_updated_at
    BEFORE UPDATE ON workload_objectives
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

-- ============================================================================
-- Sample data for testing (commented out for production)
-- ============================================================================
/*
-- Director level objectives (fiscal 2026)
INSERT INTO workload_objectives (code, name, description, target_value, target_unit, fiscal_year, owner_level, department)
VALUES
    ('Q', 'Reducir PPM de cliente', 'Reducir partes por millón defectivas reportadas por cliente', 500, 'PPM', 2026, 0, 'Quality'),
    ('C', 'Reducir costo de scrap', 'Reducir costo de desperdicio interno', 10, '%', 2026, 0, 'Operations'),
    ('T', 'Mejorar OTD', 'Mejorar entregas a tiempo', 98, '%', 2026, 0, 'Operations'),
    ('S', 'Cero accidentes', 'Mantener cero accidentes incapacitantes', 0, 'count', 2026, 0, 'EHS'),
    ('P', 'Capacitación', 'Horas de capacitación por empleado', 40, 'hours', 2026, 0, 'HR');
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Workload Objectives table created successfully!';
    RAISE NOTICE '   - workload_objectives (QCTSP with cascading)';
    RAISE NOTICE '   - Added objective_id to workload_activities';
END $$;
