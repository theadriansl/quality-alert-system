-- ============================================================================
-- Migration: 116_hospital_can_scrap.sql
-- Date: 2026-07-29
-- Description: Agregar permiso can_scrap a hospital_user_roles
-- Uso: Controla quién puede marcar partes como SCRAP en Hospital y DefectCapture
-- ============================================================================

-- 1. Agregar columna can_scrap
ALTER TABLE hospital_user_roles
ADD COLUMN IF NOT EXISTS can_scrap BOOLEAN DEFAULT false;

COMMENT ON COLUMN hospital_user_roles.can_scrap IS 'Si puede marcar partes/defectos como SCRAP';

-- 2. Por defecto, admin tiene permiso de scrap
UPDATE hospital_user_roles
SET can_scrap = true
WHERE hospital_role = 'admin';

-- 3. Actualizar vista v_hospital_users para incluir can_scrap
CREATE OR REPLACE VIEW v_hospital_users AS
SELECT
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.first_name || ' ' || u.last_name as full_name,
    u.role as system_role,
    u.department,
    u.is_active as user_active,
    COALESCE(
        (SELECT array_agg(hr.hospital_role)
         FROM hospital_user_roles hr
         WHERE hr.user_id = u.id AND hr.is_active = true),
        ARRAY[]::varchar[]
    ) as hospital_roles,
    EXISTS(
        SELECT 1 FROM hospital_user_roles hr
        WHERE hr.user_id = u.id AND hr.hospital_role = 'repairer' AND hr.is_active = true
    ) as can_repair,
    EXISTS(
        SELECT 1 FROM hospital_user_roles hr
        WHERE hr.user_id = u.id AND hr.hospital_role = 'inspector' AND hr.is_active = true
    ) as can_release,
    EXISTS(
        SELECT 1 FROM hospital_user_roles hr
        WHERE hr.user_id = u.id AND hr.hospital_role = 'admin' AND hr.is_active = true
    ) as is_hospital_admin,
    EXISTS(
        SELECT 1 FROM hospital_user_roles hr
        WHERE hr.user_id = u.id AND hr.can_manage_roles = true AND hr.is_active = true
    ) as can_manage_hospital_roles,
    EXISTS(
        SELECT 1 FROM hospital_user_roles hr
        WHERE hr.user_id = u.id AND hr.can_manage_deviations = true AND hr.is_active = true
    ) as can_manage_deviations,
    EXISTS(
        SELECT 1 FROM hospital_user_roles hr
        WHERE hr.user_id = u.id AND (hr.can_scrap = true OR hr.hospital_role = 'admin') AND hr.is_active = true
    ) as can_scrap
FROM users u
WHERE u.is_active = true
ORDER BY u.first_name, u.last_name;

COMMENT ON VIEW v_hospital_users IS 'Vista de usuarios con roles de hospital incluyendo can_scrap';

SELECT 'Migration 116_hospital_can_scrap.sql completed successfully' as status;
