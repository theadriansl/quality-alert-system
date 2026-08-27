-- ============================================================================
-- Migration 162: Fix v_hospital_users view - add department and computed permissions
-- ============================================================================

DROP VIEW IF EXISTS v_hospital_users;

CREATE VIEW v_hospital_users AS
SELECT
  u.id as user_id,
  u.first_name || ' ' || u.last_name as full_name,
  u.email,
  u.department,
  u.system_role,
  u.user_type,
  -- Permisos calculados basados en roles
  COALESCE(bool_or(hr.hospital_role IN ('repairer', 'admin')), false) as can_repair,
  COALESCE(bool_or(hr.hospital_role IN ('inspector', 'admin')), false) as can_release,
  COALESCE(bool_or(hr.can_manage_roles), false) as can_manage_hospital_roles,
  COALESCE(bool_or(hr.can_manage_deviations), false) as can_manage_deviations,
  COALESCE(bool_or(hr.can_scrap), false) as can_scrap,
  COALESCE(bool_or(hr.can_upload_production), false) as can_upload_production,
  -- Array de roles
  COALESCE(
    json_agg(
      json_build_object(
        'id', hr.id,
        'role', hr.hospital_role,
        'assignedStations', hr.assigned_stations,
        'canManageRoles', hr.can_manage_roles,
        'canManageDeviations', hr.can_manage_deviations,
        'canScrap', hr.can_scrap,
        'canUploadProduction', hr.can_upload_production,
        'isActive', hr.is_active,
        'notes', hr.notes
      )
    ) FILTER (WHERE hr.id IS NOT NULL),
    '[]'
  ) as hospital_roles
FROM users u
LEFT JOIN hospital_user_roles hr ON u.id = hr.user_id AND hr.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.email, u.department, u.system_role, u.user_type
HAVING COUNT(hr.id) > 0 OR u.system_role = 'admin' OR u.user_type = 'super_admin'
ORDER BY u.first_name, u.last_name;

SELECT 'Migration 162 completed: v_hospital_users view updated with department and computed permissions' as status;
