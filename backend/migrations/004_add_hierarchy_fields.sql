-- ============================================================================
-- ADD ORGANIZATIONAL HIERARCHY FIELDS TO USERS TABLE
-- ============================================================================

-- Add new columns for organizational hierarchy
ALTER TABLE users
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS location VARCHAR(200),
ADD COLUMN IF NOT EXISTS extension VARCHAR(20);

-- Create index for manager lookups
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_hierarchy_level ON users(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- Add comments
COMMENT ON COLUMN users.position IS 'Job title/position (e.g., Quality Engineer, Quality Manager)';
COMMENT ON COLUMN users.manager_id IS 'Reference to direct manager/supervisor';
COMMENT ON COLUMN users.hierarchy_level IS 'Organizational level: 0=Director, 1=Manager, 2=Supervisor, 3=Engineer, 4=Technician';
COMMENT ON COLUMN users.location IS 'Physical location (office, plant, building)';
COMMENT ON COLUMN users.extension IS 'Phone extension';

-- Update existing users with hierarchy levels based on role
UPDATE users SET hierarchy_level = CASE
  WHEN role ILIKE '%director%' OR role = 'Champion' THEN 0
  WHEN role ILIKE '%manager%' OR role = 'Manager' THEN 1
  WHEN role ILIKE '%supervisor%' THEN 2
  WHEN role ILIKE '%engineer%' OR role = 'Engineer' OR role ILIKE '%analyst%' THEN 3
  WHEN role ILIKE '%technician%' OR role = 'Technician' THEN 4
  ELSE 3
END;

-- Set position from role if position is null
UPDATE users SET position = role WHERE position IS NULL OR position = '';
