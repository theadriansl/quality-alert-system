-- ============================================================================
-- WORKLOAD & KPI MANAGEMENT SYSTEM
-- Migration: create_workload_tables.sql
-- Description: Tables for team activity management, KPIs, and time tracking
-- ============================================================================

-- KPI Categories (QCTSP - Quality, Cost, Time, Safety, People)
CREATE TABLE IF NOT EXISTS workload_kpis (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,  -- Q, C, T, S, P
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6',  -- Hex color for UI
    icon VARCHAR(10),  -- Emoji or icon code
    weight INTEGER DEFAULT 1,  -- For weighted calculations
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default KPIs
INSERT INTO workload_kpis (code, name, description, color, icon) VALUES
    ('Q', 'Quality', 'Actividades relacionadas con calidad del producto y proceso', '#10b981', '🎯'),
    ('C', 'Cost', 'Actividades relacionadas con reducción de costos y eficiencia', '#f59e0b', '💰'),
    ('T', 'Time', 'Actividades relacionadas con tiempos de entrega y eficiencia', '#3b82f6', '⏱️'),
    ('S', 'Safety', 'Actividades relacionadas con seguridad industrial', '#ef4444', '🛡️'),
    ('P', 'People', 'Actividades relacionadas con desarrollo del personal', '#8b5cf6', '👥')
ON CONFLICT (code) DO NOTHING;

-- Projects for grouping activities
CREATE TABLE IF NOT EXISTS workload_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    manager_id INTEGER REFERENCES users(id),
    color VARCHAR(7) DEFAULT '#6b7280',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User workload configuration
CREATE TABLE IF NOT EXISTS workload_user_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    hours_per_week DECIMAL(4,1) DEFAULT 45.0,  -- Available hours per week
    work_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
    start_time TIME DEFAULT '08:00',
    end_time TIME DEFAULT '17:00',
    overtime_threshold DECIMAL(4,1) DEFAULT 45.0,  -- Hours after which is overtime
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Recurring activity templates (activities that repeat automatically)
CREATE TABLE IF NOT EXISTS workload_recurring_activities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    kpi_id INTEGER REFERENCES workload_kpis(id),
    project_id INTEGER REFERENCES workload_projects(id),
    assigned_to INTEGER REFERENCES users(id),
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    frequency_details JSONB,  -- e.g., {"day_of_week": "monday"} or {"day_of_month": 15}
    estimated_hours DECIMAL(4,1) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMP,
    next_generation_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Main activities table
CREATE TABLE IF NOT EXISTS workload_activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('planned', 'assigned', 'unplanned', 'recurring')),
    kpi_id INTEGER REFERENCES workload_kpis(id),
    project_id INTEGER REFERENCES workload_projects(id),
    recurring_id INTEGER REFERENCES workload_recurring_activities(id),  -- If generated from recurring
    assigned_to INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_date DATE,
    completed_at TIMESTAMP,

    -- Time tracking
    estimated_hours DECIMAL(5,1),
    actual_hours DECIMAL(5,1) DEFAULT 0,

    -- Progress
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),

    -- Priority
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- Additional data
    tags JSONB DEFAULT '[]',
    notes TEXT,
    evidence_files JSONB DEFAULT '[]',
    daily_progress JSONB DEFAULT '[]',  -- Array of daily entries like in ECR

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Time entries for detailed time tracking
CREATE TABLE IF NOT EXISTS workload_time_entries (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES workload_activities(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    entry_date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL,
    description TEXT,
    entry_type VARCHAR(50) DEFAULT 'work' CHECK (entry_type IN ('work', 'overtime', 'training', 'meeting', 'other')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly summaries (cached for dashboard performance)
CREATE TABLE IF NOT EXISTS workload_weekly_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,  -- Monday of the week
    week_number INTEGER,
    year INTEGER,

    -- Hours
    hours_available DECIMAL(5,1),
    hours_planned DECIMAL(5,1) DEFAULT 0,
    hours_actual DECIMAL(5,1) DEFAULT 0,
    hours_overtime DECIMAL(5,1) DEFAULT 0,

    -- KPI distribution (JSON with hours per KPI)
    kpi_distribution JSONB DEFAULT '{}',

    -- Activity counts
    activities_total INTEGER DEFAULT 0,
    activities_completed INTEGER DEFAULT 0,
    activities_pending INTEGER DEFAULT 0,
    activities_unplanned INTEGER DEFAULT 0,

    -- Calculated metrics
    utilization_percent DECIMAL(5,2) DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workload_activities_assigned_to ON workload_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workload_activities_dates ON workload_activities(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_workload_activities_status ON workload_activities(status);
CREATE INDEX IF NOT EXISTS idx_workload_activities_kpi ON workload_activities(kpi_id);
CREATE INDEX IF NOT EXISTS idx_workload_time_entries_date ON workload_time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_workload_time_entries_user ON workload_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_workload_recurring_next ON workload_recurring_activities(next_generation_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workload_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_workload_kpis_updated_at ON workload_kpis;
CREATE TRIGGER update_workload_kpis_updated_at
    BEFORE UPDATE ON workload_kpis
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

DROP TRIGGER IF EXISTS update_workload_projects_updated_at ON workload_projects;
CREATE TRIGGER update_workload_projects_updated_at
    BEFORE UPDATE ON workload_projects
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

DROP TRIGGER IF EXISTS update_workload_activities_updated_at ON workload_activities;
CREATE TRIGGER update_workload_activities_updated_at
    BEFORE UPDATE ON workload_activities
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

DROP TRIGGER IF EXISTS update_workload_user_config_updated_at ON workload_user_config;
CREATE TRIGGER update_workload_user_config_updated_at
    BEFORE UPDATE ON workload_user_config
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

DROP TRIGGER IF EXISTS update_workload_recurring_updated_at ON workload_recurring_activities;
CREATE TRIGGER update_workload_recurring_updated_at
    BEFORE UPDATE ON workload_recurring_activities
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Workload Management tables created successfully!';
    RAISE NOTICE '   - workload_kpis (QCTSP categories)';
    RAISE NOTICE '   - workload_projects';
    RAISE NOTICE '   - workload_user_config';
    RAISE NOTICE '   - workload_recurring_activities';
    RAISE NOTICE '   - workload_activities';
    RAISE NOTICE '   - workload_time_entries';
    RAISE NOTICE '   - workload_weekly_summaries';
END $$;
