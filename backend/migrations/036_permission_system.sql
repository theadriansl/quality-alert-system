-- ============================================================================
-- MIGRATION 036: SISTEMA DE PERMISOS Y ROLES
-- ============================================================================
-- Fecha: 2026-02-24
-- Descripción: Implementa sistema de roles heredables con permisos por módulo
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar campo user_type a users (sin romper lo existente)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'client';
        COMMENT ON COLUMN users.user_type IS 'Tipo de usuario: super_admin (proveedor), client (empresa cliente)';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: Tabla de Roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Tipo de rol
    is_system BOOLEAN DEFAULT FALSE,      -- Rol del sistema (no editable, no eliminable)
    is_custom BOOLEAN DEFAULT FALSE,      -- Rol personalizado (creado por admin empresa)

    -- Permisos por módulo (JSONB flexible)
    permissions JSONB DEFAULT '{}',

    -- Nivel de clearance (confidencialidad)
    clearance_level INTEGER DEFAULT 1 CHECK (clearance_level BETWEEN 1 AND 4),

    -- Organización (NULL = rol del sistema, ID = rol de empresa específica)
    organization_id INTEGER,

    -- Auditoría
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Restricción de nombre único por organización
    UNIQUE(name, organization_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_roles_organization ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);

-- Comentarios
COMMENT ON TABLE roles IS 'Roles del sistema y personalizados con permisos por módulo';
COMMENT ON COLUMN roles.permissions IS 'JSON con permisos: {"8d": {"access": "full", "sections": {...}}, ...}';
COMMENT ON COLUMN roles.clearance_level IS '1=Público interno, 2=Restringido, 3=Confidencial, 4=Alta dirección';

-- ============================================================================
-- PASO 3: Tabla de asignación Usuario-Roles (muchos a muchos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Quién asignó y cuándo
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de expiración (opcional, para roles temporales)
    expires_at TIMESTAMP,

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,

    -- Evitar duplicados
    UNIQUE(user_id, role_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

COMMENT ON TABLE user_roles IS 'Asignación de roles a usuarios (un usuario puede tener múltiples roles)';

-- ============================================================================
-- PASO 4: Log de auditoría de permisos
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id SERIAL PRIMARY KEY,

    -- Quién hizo la acción
    actor_user_id INTEGER REFERENCES users(id),

    -- Qué acción
    action VARCHAR(50) NOT NULL,  -- 'role_created', 'role_updated', 'role_deleted', 'role_assigned', 'role_revoked', 'permission_changed'

    -- Sobre quién (si aplica)
    target_user_id INTEGER REFERENCES users(id),
    target_role_id INTEGER REFERENCES roles(id),

    -- Detalles del cambio
    old_value JSONB,
    new_value JSONB,
    details TEXT,

    -- Información de contexto
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_permission_audit_actor ON permission_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_target_user ON permission_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_date ON permission_audit_log(created_at);

COMMENT ON TABLE permission_audit_log IS 'Registro de todas las acciones relacionadas con permisos y roles';

-- ============================================================================
-- PASO 5: Insertar ROLES BASE DEL SISTEMA
-- ============================================================================

-- Rol: Super Admin (solo para proveedores del sistema)
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Super Admin',
    'Administrador global del sistema (proveedor). Acceso total a configuración.',
    TRUE,
    '{
        "system": {"admin": true, "modules": true, "templates": true},
        "all_modules": {"access": "full"}
    }',
    4
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Admin Empresa
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Admin Empresa',
    'Administrador de la empresa. Gestiona usuarios, roles y configuración interna.',
    TRUE,
    '{
        "users": {"access": "full", "actions": ["create", "edit", "delete", "assign_roles"]},
        "roles": {"access": "full", "actions": ["create", "edit", "delete"]},
        "departments": {"access": "full"},
        "8d": {"access": "full", "sections": {"creation": true, "analysis": true, "closure": true}},
        "quality_alert": {"access": "full", "actions": ["create", "respond", "validate"]},
        "mrb": {"access": "full", "actions": ["create", "execute", "validate"]},
        "ecr": {"access": "full", "sections": {"request": true, "analysis": true, "closure": true}},
        "audits": {"access": "full", "sections": {"programs": true, "checklists": true, "execution": true, "nc": true}},
        "defects": {"access": "full", "sections": {"capture": true, "query": true, "catalogs": true}},
        "clients": {"access": "full"},
        "workload": {"access": "full"}
    }',
    4
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Gerente de Calidad
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Gerente de Calidad',
    'Gerente del área de calidad. Acceso completo a módulos de calidad, puede aprobar.',
    TRUE,
    '{
        "users": {"access": "partial", "actions": ["view", "assign_roles"], "scope": "department"},
        "8d": {"access": "full", "sections": {"creation": true, "analysis": true, "closure": true}},
        "quality_alert": {"access": "full", "actions": ["create", "respond", "validate"]},
        "mrb": {"access": "full", "actions": ["create", "execute", "validate"]},
        "ecr": {"access": "partial", "sections": {"request": true, "analysis": true, "closure": false}},
        "audits": {"access": "full", "sections": {"programs": true, "checklists": true, "execution": true, "nc": true}},
        "defects": {"access": "full", "sections": {"capture": true, "query": true, "catalogs": true}},
        "clients": {"access": "view"},
        "workload": {"access": "full", "scope": "department"}
    }',
    3
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Líder 8D
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Líder 8D',
    'Líder de resolución de problemas 8D. Acceso completo al módulo 8D.',
    TRUE,
    '{
        "8d": {"access": "full", "sections": {"creation": true, "analysis": true, "closure": true}},
        "quality_alert": {"access": "view"},
        "mrb": {"access": "view"},
        "defects": {"access": "partial", "sections": {"capture": false, "query": true, "catalogs": false}},
        "workload": {"access": "view", "scope": "self"}
    }',
    2
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Ingeniero de Calidad
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Ingeniero de Calidad',
    'Ingeniero de calidad. Participa en 8D, QAR, MRB.',
    TRUE,
    '{
        "8d": {"access": "partial", "sections": {"creation": true, "analysis": true, "closure": false}},
        "quality_alert": {"access": "full", "actions": ["create", "respond"]},
        "mrb": {"access": "partial", "actions": ["create", "execute"]},
        "ecr": {"access": "partial", "sections": {"request": true, "analysis": false, "closure": false}},
        "audits": {"access": "partial", "sections": {"programs": false, "checklists": false, "execution": true, "nc": true}},
        "defects": {"access": "full", "sections": {"capture": true, "query": true, "catalogs": false}},
        "workload": {"access": "view", "scope": "self"}
    }',
    2
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Inspector
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Inspector',
    'Inspector de calidad. Captura defectos y ejecuta auditorías.',
    TRUE,
    '{
        "8d": {"access": "none"},
        "quality_alert": {"access": "full", "actions": ["create"]},
        "mrb": {"access": "partial", "actions": ["capture"]},
        "ecr": {"access": "none"},
        "audits": {"access": "partial", "sections": {"programs": false, "checklists": false, "execution": true, "nc": false}},
        "defects": {"access": "full", "sections": {"capture": true, "query": true, "catalogs": false}},
        "workload": {"access": "none"}
    }',
    1
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Auditor
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Auditor',
    'Auditor interno. Ejecuta auditorías y genera NCs.',
    TRUE,
    '{
        "8d": {"access": "view"},
        "quality_alert": {"access": "view"},
        "mrb": {"access": "view"},
        "ecr": {"access": "none"},
        "audits": {"access": "full", "sections": {"programs": false, "checklists": true, "execution": true, "nc": true}},
        "defects": {"access": "partial", "sections": {"capture": false, "query": true, "catalogs": false}},
        "workload": {"access": "view", "scope": "self"}
    }',
    2
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Aprobador
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Aprobador',
    'Rol para aprobar documentos y acciones. Puede validar y aprobar.',
    TRUE,
    '{
        "8d": {"access": "partial", "actions": ["approve", "reject", "comment"], "sections": {"creation": false, "analysis": false, "closure": true}},
        "quality_alert": {"access": "partial", "actions": ["validate"]},
        "mrb": {"access": "partial", "actions": ["validate"]},
        "ecr": {"access": "partial", "actions": ["approve", "reject"]},
        "audits": {"access": "partial", "actions": ["approve_nc"]},
        "workload": {"access": "view"}
    }',
    3
) ON CONFLICT (name, organization_id) DO NOTHING;

-- Rol: Consulta (Solo lectura)
INSERT INTO roles (name, description, is_system, permissions, clearance_level)
VALUES (
    'Consulta',
    'Acceso de solo lectura a todos los módulos.',
    TRUE,
    '{
        "8d": {"access": "view"},
        "quality_alert": {"access": "view"},
        "mrb": {"access": "view"},
        "ecr": {"access": "view"},
        "audits": {"access": "view"},
        "defects": {"access": "view"},
        "clients": {"access": "view"},
        "workload": {"access": "view"}
    }',
    1
) ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================================================
-- PASO 6: Función para verificar permisos (usada por middleware)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id INTEGER,
    p_module VARCHAR(50),
    p_action VARCHAR(50) DEFAULT NULL,
    p_section VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_module_perms JSONB;
    v_access VARCHAR(20);
BEGIN
    -- Obtener permisos combinados de todos los roles del usuario
    SELECT jsonb_agg(r.permissions)
    INTO v_permissions
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

    -- Si no tiene roles, denegar
    IF v_permissions IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Buscar permisos del módulo en cualquiera de sus roles
    FOR v_module_perms IN SELECT jsonb_array_elements(v_permissions)->p_module
    LOOP
        IF v_module_perms IS NOT NULL THEN
            v_access := v_module_perms->>'access';

            -- Si tiene acceso 'full', aprobar
            IF v_access = 'full' THEN
                RETURN TRUE;
            END IF;

            -- Si tiene acceso 'view' y solo quiere ver
            IF v_access = 'view' AND (p_action IS NULL OR p_action = 'view') THEN
                RETURN TRUE;
            END IF;

            -- Si tiene acceso 'partial', verificar acción específica
            IF v_access = 'partial' THEN
                -- Verificar sección si se especificó
                IF p_section IS NOT NULL THEN
                    IF (v_module_perms->'sections'->>p_section)::boolean = TRUE THEN
                        RETURN TRUE;
                    END IF;
                END IF;

                -- Verificar acción si se especificó
                IF p_action IS NOT NULL THEN
                    IF v_module_perms->'actions' ? p_action THEN
                        RETURN TRUE;
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_permission IS 'Verifica si un usuario tiene permiso para una acción en un módulo';

-- ============================================================================
-- PASO 7: Función para verificar herencia de permisos
-- ============================================================================
CREATE OR REPLACE FUNCTION can_assign_permission(
    p_assigner_id INTEGER,
    p_module VARCHAR(50),
    p_access VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_assigner_access VARCHAR(20);
    v_access_levels TEXT[] := ARRAY['none', 'view', 'partial', 'full'];
    v_assigner_level INTEGER;
    v_target_level INTEGER;
BEGIN
    -- Obtener el nivel de acceso máximo del asignador para este módulo
    SELECT MAX(
        CASE
            WHEN (r.permissions->p_module->>'access') = 'full' THEN 4
            WHEN (r.permissions->p_module->>'access') = 'partial' THEN 3
            WHEN (r.permissions->p_module->>'access') = 'view' THEN 2
            ELSE 1
        END
    )
    INTO v_assigner_level
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_assigner_id
      AND ur.is_active = TRUE;

    -- Determinar nivel del acceso que quiere asignar
    v_target_level := CASE p_access
        WHEN 'full' THEN 4
        WHEN 'partial' THEN 3
        WHEN 'view' THEN 2
        ELSE 1
    END;

    -- Solo puede asignar si su nivel es >= al que quiere dar
    RETURN v_assigner_level >= v_target_level;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_assign_permission IS 'Verifica que un usuario solo pueda asignar permisos que él mismo tiene (herencia)';

-- ============================================================================
-- PASO 8: Trigger para auditar cambios en roles
-- ============================================================================
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO permission_audit_log (actor_user_id, action, target_role_id, new_value, details)
        VALUES (NEW.created_by, 'role_created', NEW.id, to_jsonb(NEW), 'Rol creado: ' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO permission_audit_log (actor_user_id, action, target_role_id, old_value, new_value, details)
        VALUES (NEW.created_by, 'role_updated', NEW.id, to_jsonb(OLD), to_jsonb(NEW), 'Rol actualizado: ' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO permission_audit_log (action, target_role_id, old_value, details)
        VALUES ('role_deleted', OLD.id, to_jsonb(OLD), 'Rol eliminado: ' || OLD.name);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_role_changes ON roles;
CREATE TRIGGER trg_log_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION log_role_changes();

-- ============================================================================
-- PASO 9: Trigger para auditar asignación de roles
-- ============================================================================
CREATE OR REPLACE FUNCTION log_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO permission_audit_log (actor_user_id, action, target_user_id, target_role_id, details)
        VALUES (NEW.assigned_by, 'role_assigned', NEW.user_id, NEW.role_id, 'Rol asignado');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO permission_audit_log (action, target_user_id, target_role_id, details)
        VALUES ('role_revoked', OLD.user_id, OLD.role_id, 'Rol revocado');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_role_assignment ON user_roles;
CREATE TRIGGER trg_log_role_assignment
    AFTER INSERT OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION log_role_assignment();

-- ============================================================================
-- PASO 10: Proteger roles del sistema
-- ============================================================================
CREATE OR REPLACE FUNCTION protect_system_roles()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_system = TRUE THEN
        RAISE EXCEPTION 'No se pueden modificar ni eliminar roles del sistema';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_system_roles ON roles;
CREATE TRIGGER trg_protect_system_roles
    BEFORE UPDATE OR DELETE ON roles
    FOR EACH ROW
    WHEN (OLD.is_system = TRUE)
    EXECUTE FUNCTION protect_system_roles();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
    v_roles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_roles_count FROM roles WHERE is_system = TRUE;
    RAISE NOTICE '✅ Migración 036 completada: % roles base creados', v_roles_count;
END $$;
