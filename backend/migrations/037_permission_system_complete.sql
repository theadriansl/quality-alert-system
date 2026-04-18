-- ============================================================================
-- MIGRATION 037: COMPLETAR SISTEMA DE PERMISOS
-- ============================================================================
-- Fecha: 2026-02-24
-- Descripción: Completa el sistema con herencia, scope, reglas de control
-- ============================================================================

-- ============================================================================
-- PASO 1: Tabla de Organizaciones (para multi-tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    enabled_modules JSONB DEFAULT '["8d", "quality_alert", "mrb", "ecr", "audits", "defects", "clients", "workload"]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar constraint único solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'organizations_code_key' AND table_name = 'organizations'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_code_key UNIQUE(code);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Insertar organización por defecto
INSERT INTO organizations (id, name, code, is_active)
VALUES (1, 'Organización Principal', 'ORG001', TRUE)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE organizations IS 'Organizaciones/empresas cliente del sistema';
COMMENT ON COLUMN organizations.enabled_modules IS 'Módulos habilitados por Super Admin para esta organización';

-- ============================================================================
-- PASO 2: Agregar campo organization_id a users
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE users ADD COLUMN organization_id INTEGER DEFAULT 1;
    END IF;
END $$;

-- ============================================================================
-- PASO 3: Tabla de departamentos (crear estructura básica)
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columnas adicionales si no existen
DO $$
BEGIN
    -- organization_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'departments' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE departments ADD COLUMN organization_id INTEGER DEFAULT 1;
    END IF;

    -- code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'departments' AND column_name = 'code'
    ) THEN
        ALTER TABLE departments ADD COLUMN code VARCHAR(50);
    END IF;

    -- description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'departments' AND column_name = 'description'
    ) THEN
        ALTER TABLE departments ADD COLUMN description TEXT;
    END IF;

    -- parent_id (jerarquía)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'departments' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE departments ADD COLUMN parent_id INTEGER;
    END IF;

    -- manager_id (Admin Gerencia)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'departments' AND column_name = 'manager_id'
    ) THEN
        ALTER TABLE departments ADD COLUMN manager_id INTEGER;
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Agregar FKs a departments
-- ============================================================================
DO $$
BEGIN
    -- FK a organizations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'departments_organization_id_fkey'
    ) THEN
        ALTER TABLE departments
        ADD CONSTRAINT departments_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK departments_organization_id_fkey ya existe o error: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- FK parent_id (self-reference)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'departments_parent_id_fkey'
    ) THEN
        ALTER TABLE departments
        ADD CONSTRAINT departments_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES departments(id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK departments_parent_id_fkey ya existe o error: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- FK manager_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'departments_manager_id_fkey'
    ) THEN
        ALTER TABLE departments
        ADD CONSTRAINT departments_manager_id_fkey
        FOREIGN KEY (manager_id) REFERENCES users(id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK departments_manager_id_fkey ya existe o error: %', SQLERRM;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);

-- Constraint único org + code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'departments_org_code_unique'
    ) THEN
        ALTER TABLE departments ADD CONSTRAINT departments_org_code_unique UNIQUE(organization_id, code);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMENT ON TABLE departments IS 'Departamentos con jerarquía y manager asignado';

-- ============================================================================
-- PASO 5: Agregar department_id a users
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE users ADD COLUMN department_id INTEGER;
    END IF;
END $$;

-- FK de users a organizations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- FK de users a departments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_department_id_fkey'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_department_id_fkey
        FOREIGN KEY (department_id) REFERENCES departments(id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================================
-- PASO 6: Función para verificar herencia de roles
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_assigner_max_clearance INTEGER;
    v_role_clearance INTEGER;
    v_is_super_admin BOOLEAN;
BEGIN
    -- Verificar si es Super Admin
    SELECT user_type = 'super_admin' INTO v_is_super_admin
    FROM users WHERE id = NEW.assigned_by;

    -- Super Admin puede todo
    IF v_is_super_admin THEN
        RETURN NEW;
    END IF;

    -- Obtener clearance máximo del asignador
    SELECT COALESCE(MAX(r.clearance_level), 0)
    INTO v_assigner_max_clearance
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = NEW.assigned_by
      AND ur.is_active = TRUE;

    -- Obtener clearance del rol a asignar
    SELECT clearance_level INTO v_role_clearance
    FROM roles WHERE id = NEW.role_id;

    -- Verificar clearance (no puede asignar nivel mayor al suyo)
    IF v_role_clearance > v_assigner_max_clearance THEN
        RAISE EXCEPTION 'No puedes asignar un rol con nivel de confidencialidad mayor al tuyo (% > %)',
            v_role_clearance, v_assigner_max_clearance;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar asignación
DROP TRIGGER IF EXISTS trg_validate_role_assignment ON user_roles;
CREATE TRIGGER trg_validate_role_assignment
    BEFORE INSERT ON user_roles
    FOR EACH ROW
    WHEN (NEW.assigned_by IS NOT NULL)
    EXECUTE FUNCTION validate_role_assignment();

-- ============================================================================
-- PASO 7: Función para verificar scope de departamento
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_department_scope(p_user_id INTEGER)
RETURNS TABLE(department_id INTEGER) AS $$
DECLARE
    v_user_type VARCHAR(20);
    v_is_admin BOOLEAN;
    v_dept_id INTEGER;
BEGIN
    -- Obtener info del usuario
    SELECT u.user_type, u.system_role = 'admin', u.department_id
    INTO v_user_type, v_is_admin, v_dept_id
    FROM users u
    WHERE u.id = p_user_id;

    -- Super Admin o Admin del sistema ve todo
    IF v_user_type = 'super_admin' OR v_is_admin THEN
        RETURN QUERY SELECT d.id FROM departments d WHERE d.is_active = TRUE;
        RETURN;
    END IF;

    -- Admin Gerencia ve su departamento y subdepartamentos
    IF EXISTS (
        SELECT 1 FROM departments d WHERE d.manager_id = p_user_id
    ) THEN
        RETURN QUERY
        WITH RECURSIVE dept_tree AS (
            -- Departamentos donde es manager
            SELECT d.id FROM departments d WHERE d.manager_id = p_user_id
            UNION ALL
            -- Subdepartamentos
            SELECT d.id FROM departments d
            JOIN dept_tree dt ON d.parent_id = dt.id
        )
        SELECT dt.id FROM dept_tree dt;
        RETURN;
    END IF;

    -- Usuario normal solo ve su departamento
    IF v_dept_id IS NOT NULL THEN
        RETURN QUERY SELECT v_dept_id;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_department_scope IS 'Retorna los IDs de departamentos que un usuario puede ver según su rol';

-- ============================================================================
-- PASO 8: Función para verificar "no aprobar lo propio"
-- ============================================================================
CREATE OR REPLACE FUNCTION check_self_approval(
    p_user_id INTEGER,
    p_record_created_by INTEGER,
    p_action VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Si la acción es aprobar/validar y el usuario es el creador, denegar
    IF p_action IN ('approve', 'validate', 'close') AND p_user_id = p_record_created_by THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_self_approval IS 'Verifica que un usuario no apruebe sus propios registros';

-- ============================================================================
-- PASO 9: Agregar campo created_by a tablas principales si no existe
-- ============================================================================
DO $$
BEGIN
    -- eight_d_reports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eight_d_reports') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'eight_d_reports' AND column_name = 'created_by'
        ) THEN
            ALTER TABLE eight_d_reports ADD COLUMN created_by INTEGER REFERENCES users(id);
        END IF;
    END IF;

    -- qar (quality alerts)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qar') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'qar' AND column_name = 'created_by'
        ) THEN
            ALTER TABLE qar ADD COLUMN created_by INTEGER REFERENCES users(id);
        END IF;
    END IF;

    -- mrb_campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mrb_campaigns') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'mrb_campaigns' AND column_name = 'created_by'
        ) THEN
            ALTER TABLE mrb_campaigns ADD COLUMN created_by INTEGER REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PASO 10: Trigger para validar cierre con evidencias (D8)
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_8d_closure()
RETURNS TRIGGER AS $$
DECLARE
    v_has_evidence BOOLEAN;
BEGIN
    -- Solo validar cuando se intenta cerrar (status contiene D8 o Closed)
    IF NEW.status ILIKE '%D8%' OR NEW.status ILIKE '%closed%' OR NEW.status ILIKE '%cerrado%' THEN

        -- Verificar que hay evidencia en D8 (JSONB o archivos)
        v_has_evidence := FALSE;

        -- Verificar campo d8_evidence
        IF NEW.d8_evidence IS NOT NULL AND
           jsonb_typeof(NEW.d8_evidence) = 'array' AND
           jsonb_array_length(NEW.d8_evidence) > 0 THEN
            v_has_evidence := TRUE;
        END IF;

        -- Verificar archivos adjuntos si existe la tabla
        IF NOT v_has_evidence THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eight_d_attachments') THEN
                SELECT EXISTS(
                    SELECT 1 FROM eight_d_attachments
                    WHERE report_id = NEW.id
                    AND section = 'D8'
                ) INTO v_has_evidence;
            END IF;
        END IF;

        -- Si no hay evidencia, advertir pero permitir (configurable)
        IF NOT v_has_evidence THEN
            RAISE NOTICE 'Advertencia: 8D cerrado sin evidencias en D8 (ID: %)', NEW.id;
        END IF;

        -- Verificar que D7 está completo (si el campo existe)
        IF NEW.d7_validation_status IS NOT NULL AND
           NEW.d7_validation_status NOT IN ('EFFECTIVE', 'approved', 'APPROVED') THEN
            RAISE EXCEPTION 'No se puede cerrar el 8D sin validación D7 aprobada. Estado actual: %', NEW.d7_validation_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Solo crear trigger si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eight_d_reports') THEN
        DROP TRIGGER IF EXISTS trg_validate_8d_closure ON eight_d_reports;
        CREATE TRIGGER trg_validate_8d_closure
            BEFORE UPDATE ON eight_d_reports
            FOR EACH ROW
            WHEN (OLD.status IS DISTINCT FROM NEW.status)
            EXECUTE FUNCTION validate_8d_closure();
    END IF;
END $$;

-- ============================================================================
-- PASO 11: Migrar departamentos existentes desde users.department
-- ============================================================================
DO $$
DECLARE
    v_dept_name TEXT;
    v_dept_code TEXT;
BEGIN
    -- Solo migrar si existe la columna department en users
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        -- Insertar departamentos únicos desde users.department
        FOR v_dept_name IN
            SELECT DISTINCT department
            FROM users
            WHERE department IS NOT NULL AND department != ''
        LOOP
            v_dept_code := UPPER(REGEXP_REPLACE(v_dept_name, '[^A-Za-z0-9]', '_', 'g'));
            v_dept_code := SUBSTRING(v_dept_code, 1, 45);

            INSERT INTO departments (organization_id, name, code, is_active)
            VALUES (1, v_dept_name, v_dept_code, TRUE)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Actualizar users.department_id basado en el nombre
        UPDATE users u
        SET department_id = d.id
        FROM departments d
        WHERE u.department = d.name
        AND u.department_id IS NULL;
    END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
    v_depts INTEGER;
    v_orgs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_depts FROM departments;
    SELECT COUNT(*) INTO v_orgs FROM organizations;
    RAISE NOTICE '✅ Migración 037 completada:';
    RAISE NOTICE '   - Organizaciones: %', v_orgs;
    RAISE NOTICE '   - Departamentos: %', v_depts;
    RAISE NOTICE '   - Funciones de herencia y scope activas';
    RAISE NOTICE '   - Reglas de control implementadas';
END $$;
