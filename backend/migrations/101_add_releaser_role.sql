-- Migration 101: Add releaser role to hospital_user_roles
-- Adds the 'releaser' role for users who can release defects

-- Drop existing constraint
ALTER TABLE hospital_user_roles
DROP CONSTRAINT IF EXISTS hospital_user_roles_hospital_role_check;

-- Add new constraint with releaser role
ALTER TABLE hospital_user_roles
ADD CONSTRAINT hospital_user_roles_hospital_role_check
CHECK (hospital_role IN ('repairer', 'inspector', 'releaser', 'admin'));

-- Comment
COMMENT ON COLUMN hospital_user_roles.hospital_role IS
'Hospital role: inspector (capture defects), repairer (repair defects), releaser (release defects), admin (all permissions)';
