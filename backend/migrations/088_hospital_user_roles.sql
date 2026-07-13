-- =====================================================
-- HOSPITAL USER ROLES
-- Sistema de roles secundarios para Hospital de Defectos
-- =====================================================

-- Tabla de roles de Hospital
CREATE TABLE IF NOT EXISTS hospital_user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_role VARCHAR(20) NOT NULL CHECK (hospital_role IN ('repairer', 'inspector', 'admin')),
    assigned_stations INTEGER[], -- IDs de estaciones permitidas (opcional)
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, hospital_role)
);

-- Indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_hospital_user_roles_user_id ON hospital_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_user_roles_role ON hospital_user_roles(hospital_role);
CREATE INDEX IF NOT EXISTS idx_hospital_user_roles_active ON hospital_user_roles(is_active);

-- Comentarios
COMMENT ON TABLE hospital_user_roles IS 'Roles secundarios para el modulo Hospital de Defectos';
COMMENT ON COLUMN hospital_user_roles.hospital_role IS 'Rol: repairer (reparador), inspector (QA/liberacion), admin (ambos)';
COMMENT ON COLUMN hospital_user_roles.assigned_stations IS 'Array de IDs de estaciones donde puede operar (null = todas)';

-- Vista para consulta rapida de usuarios con roles de hospital
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
    ) as is_hospital_admin
FROM users u
WHERE u.is_active = true
ORDER BY u.first_name, u.last_name;

-- Funcion para verificar permiso de hospital
CREATE OR REPLACE FUNCTION check_hospital_permission(
    p_user_id INTEGER,
    p_required_role VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Admin del sistema siempre tiene permiso
    IF EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id
        AND (system_role = 'admin' OR user_type = 'super_admin')
    ) THEN
        RETURN true;
    END IF;

    -- Verificar rol de hospital admin (tiene todos los permisos)
    IF EXISTS (
        SELECT 1 FROM hospital_user_roles
        WHERE user_id = p_user_id
        AND hospital_role = 'admin'
        AND is_active = true
    ) THEN
        RETURN true;
    END IF;

    -- Verificar rol especifico
    SELECT EXISTS (
        SELECT 1 FROM hospital_user_roles
        WHERE user_id = p_user_id
        AND hospital_role = p_required_role
        AND is_active = true
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_hospital_user_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospital_user_roles_updated ON hospital_user_roles;
CREATE TRIGGER trg_hospital_user_roles_updated
    BEFORE UPDATE ON hospital_user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_hospital_user_roles_timestamp();
