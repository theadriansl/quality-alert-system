-- ============================================================================
-- HIERARCHY LEVELS - Configurable organizational levels
-- Migration: 007_hierarchy_levels.sql
-- ============================================================================

-- Custom hierarchy levels (allows adding more than the default 5)
CREATE TABLE IF NOT EXISTS workload_hierarchy_levels (
    id SERIAL PRIMARY KEY,
    level_order INTEGER NOT NULL UNIQUE,  -- 0, 1, 2, 3, 4, 5, etc.
    name VARCHAR(100) NOT NULL,  -- Director, Gerente, Supervisor, etc.
    color VARCHAR(7) DEFAULT '#6b7280',  -- Hex color
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default hierarchy levels
INSERT INTO workload_hierarchy_levels (level_order, name, color, description) VALUES
    (0, 'Director', '#8b5cf6', 'Nivel ejecutivo / Dirección general'),
    (1, 'Gerente', '#3b82f6', 'Gerencia de área o departamento'),
    (2, 'Supervisor', '#10b981', 'Supervisión de equipos'),
    (3, 'Ingeniero', '#f59e0b', 'Personal técnico especializado'),
    (4, 'Staff', '#6b7280', 'Personal operativo')
ON CONFLICT (level_order) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_hierarchy_levels_order ON workload_hierarchy_levels(level_order);

-- Trigger
DROP TRIGGER IF EXISTS update_hierarchy_levels_updated_at ON workload_hierarchy_levels;
CREATE TRIGGER update_hierarchy_levels_updated_at
    BEFORE UPDATE ON workload_hierarchy_levels
    FOR EACH ROW EXECUTE FUNCTION update_workload_updated_at();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Hierarchy levels table created successfully!';
END $$;
