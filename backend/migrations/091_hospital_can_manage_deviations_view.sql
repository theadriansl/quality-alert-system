-- =====================================================
-- Actualizar vista v_hospital_users para incluir can_manage_deviations
-- =====================================================

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
    ) as can_manage_deviations
FROM users u
WHERE u.is_active = true
ORDER BY u.first_name, u.last_name;
