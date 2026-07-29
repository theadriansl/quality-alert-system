-- ============================================================================
-- Migration 117: Agregar permiso canUploadProduction a hospital_user_roles
-- Controla quién puede subir datos de producción (seriales, lotes, etc.)
-- ============================================================================

-- Agregar columna can_upload_production
ALTER TABLE hospital_user_roles
ADD COLUMN IF NOT EXISTS can_upload_production BOOLEAN DEFAULT false;

-- Comentario descriptivo
COMMENT ON COLUMN hospital_user_roles.can_upload_production IS 'Permiso para subir datos de producción (seriales, lotes, work orders)';

-- Actualizar vista v_hospital_users para incluir el nuevo permiso
CREATE OR REPLACE VIEW v_hospital_users AS
SELECT
  u.id as user_id,
  u.first_name || ' ' || u.last_name as full_name,
  u.email,
  u.system_role,
  u.user_type,
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
GROUP BY u.id, u.first_name, u.last_name, u.email, u.system_role, u.user_type
HAVING COUNT(hr.id) > 0 OR u.system_role = 'admin' OR u.user_type = 'super_admin'
ORDER BY u.first_name, u.last_name;

-- Dar permiso automáticamente a admins existentes de hospital
UPDATE hospital_user_roles
SET can_upload_production = true
WHERE hospital_role = 'admin';

SELECT 'Migration 117 completed: can_upload_production added to hospital_user_roles' as status;
