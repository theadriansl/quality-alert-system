-- ============================================================================
-- MIGRACION 086: Work Instructions - Sistema ILUO de Certificacion
-- Fecha: 2026-05-06
-- Descripcion: Agrega sistema de certificacion de operadores en Work Instructions
--              con niveles ILUO (1-5), historial y metricas de cobertura
-- ============================================================================

-- ============================================================================
-- PARTE 1: MODIFICAR TABLA WORK_INSTRUCTIONS
-- ============================================================================

-- Tipo de WI: BASIC (general para todos) o EXCLUSIVE (cliente especifico)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_instructions' AND column_name = 'wi_type') THEN
    ALTER TABLE work_instructions ADD COLUMN wi_type VARCHAR(20) DEFAULT 'EXCLUSIVE';
  END IF;
END $$;

-- Dias para recertificacion (configurable por WI)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_instructions' AND column_name = 'recertification_days') THEN
    ALTER TABLE work_instructions ADD COLUMN recertification_days INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Codigo de operacion (para matriz ILUO)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_instructions' AND column_name = 'operation_code') THEN
    ALTER TABLE work_instructions ADD COLUMN operation_code VARCHAR(20);
  END IF;
END $$;

-- Comentario sobre campos
COMMENT ON COLUMN work_instructions.wi_type IS 'BASIC = general para todos los clientes, EXCLUSIVE = especifico de cliente';
COMMENT ON COLUMN work_instructions.recertification_days IS 'Dias para recertificacion. NULL = sin vencimiento';
COMMENT ON COLUMN work_instructions.operation_code IS 'Codigo corto para matriz ILUO (ej: EL-005, WA-007)';

-- ============================================================================
-- PARTE 2: TABLA DE CERTIFICACIONES DE OPERADORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS wi_operator_certifications (
  id SERIAL PRIMARY KEY,

  -- Relaciones
  operator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  -- Nivel de certificacion (1-5, donde 1=I, 3=L, 5=U)
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  level_code VARCHAR(1) GENERATED ALWAYS AS (
    CASE
      WHEN level = 1 THEN 'I'
      WHEN level = 2 THEN 'I'
      WHEN level = 3 THEN 'L'
      WHEN level = 4 THEN 'L'
      WHEN level = 5 THEN 'U'
    END
  ) STORED,

  -- Fechas
  certified_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE, -- Calculado por trigger si hay recertification_days

  -- Quien certifico
  certified_by INTEGER REFERENCES users(id),

  -- Tipo de capacitacion
  training_type VARCHAR(20) CHECK (training_type IN ('INTERNAL', 'EXTERNAL')),

  -- Evidencia
  evidence_path VARCHAR(500),
  evidence_filename VARCHAR(255),

  -- Notas y estado
  notes TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Solo una certificacion activa por operador/WI
  UNIQUE(operator_id, work_instruction_id)
);

-- Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_wi_cert_operator ON wi_operator_certifications(operator_id);
CREATE INDEX IF NOT EXISTS idx_wi_cert_wi ON wi_operator_certifications(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_cert_status ON wi_operator_certifications(status);
CREATE INDEX IF NOT EXISTS idx_wi_cert_expires ON wi_operator_certifications(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE wi_operator_certifications IS 'Certificaciones ILUO de operadores en Work Instructions';

-- ============================================================================
-- PARTE 3: HISTORIAL DE CERTIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS wi_certification_history (
  id SERIAL PRIMARY KEY,

  -- Referencias
  certification_id INTEGER REFERENCES wi_operator_certifications(id) ON DELETE SET NULL,
  operator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  -- Cambio de nivel
  previous_level INTEGER,
  new_level INTEGER NOT NULL CHECK (new_level BETWEEN 1 AND 5),
  level_code VARCHAR(1),

  -- Fechas
  change_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Quien hizo el cambio
  changed_by INTEGER REFERENCES users(id),

  -- Detalles
  training_type VARCHAR(20) CHECK (training_type IN ('INTERNAL', 'EXTERNAL')),
  evidence_path VARCHAR(500),
  evidence_filename VARCHAR(255),
  notes TEXT,
  change_reason VARCHAR(50), -- 'INITIAL', 'UPGRADE', 'DOWNGRADE', 'RECERTIFICATION', 'REVOKE'

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_cert_hist_operator ON wi_certification_history(operator_id);
CREATE INDEX IF NOT EXISTS idx_wi_cert_hist_wi ON wi_certification_history(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_cert_hist_date ON wi_certification_history(change_date DESC);

COMMENT ON TABLE wi_certification_history IS 'Historial de cambios en certificaciones ILUO';

-- ============================================================================
-- PARTE 4: TRIGGER PARA CALCULAR FECHA DE EXPIRACION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_wi_cert_expiry()
RETURNS TRIGGER AS $$
DECLARE
  retraining_days INTEGER;
BEGIN
  -- Obtener dias de recertificacion de la WI
  SELECT recertification_days INTO retraining_days
  FROM work_instructions
  WHERE id = NEW.work_instruction_id;

  -- Calcular fecha de expiracion si aplica
  IF retraining_days IS NOT NULL AND retraining_days > 0 THEN
    NEW.expires_at := NEW.certified_date + (retraining_days || ' days')::INTERVAL;
  ELSE
    NEW.expires_at := NULL;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wi_cert_expiry ON wi_operator_certifications;
CREATE TRIGGER trg_wi_cert_expiry
  BEFORE INSERT OR UPDATE OF certified_date, work_instruction_id
  ON wi_operator_certifications
  FOR EACH ROW
  EXECUTE FUNCTION calculate_wi_cert_expiry();

-- ============================================================================
-- PARTE 5: TRIGGER PARA HISTORIAL AUTOMATICO
-- ============================================================================

CREATE OR REPLACE FUNCTION log_wi_certification_change()
RETURNS TRIGGER AS $$
DECLARE
  prev_level INTEGER;
  change_type VARCHAR(50);
BEGIN
  -- Determinar nivel anterior y tipo de cambio
  IF TG_OP = 'INSERT' THEN
    prev_level := NULL;
    change_type := 'INITIAL';
  ELSIF TG_OP = 'UPDATE' THEN
    prev_level := OLD.level;
    IF NEW.level > OLD.level THEN
      change_type := 'UPGRADE';
    ELSIF NEW.level < OLD.level THEN
      change_type := 'DOWNGRADE';
    ELSIF NEW.certified_date != OLD.certified_date THEN
      change_type := 'RECERTIFICATION';
    ELSE
      -- Sin cambio significativo, no registrar
      RETURN NEW;
    END IF;
  END IF;

  -- Insertar en historial
  INSERT INTO wi_certification_history (
    certification_id, operator_id, work_instruction_id,
    previous_level, new_level, level_code,
    change_date, changed_by, training_type,
    evidence_path, evidence_filename, notes, change_reason
  ) VALUES (
    NEW.id, NEW.operator_id, NEW.work_instruction_id,
    prev_level, NEW.level,
    CASE WHEN NEW.level <= 2 THEN 'I' WHEN NEW.level <= 4 THEN 'L' ELSE 'U' END,
    NEW.certified_date, NEW.certified_by, NEW.training_type,
    NEW.evidence_path, NEW.evidence_filename, NEW.notes, change_type
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wi_cert_history ON wi_operator_certifications;
CREATE TRIGGER trg_wi_cert_history
  AFTER INSERT OR UPDATE OF level, certified_date
  ON wi_operator_certifications
  FOR EACH ROW
  EXECUTE FUNCTION log_wi_certification_change();

-- ============================================================================
-- PARTE 6: VISTAS PARA DASHBOARD Y REPORTES
-- ============================================================================

-- Vista: Certificaciones actuales con info completa
CREATE OR REPLACE VIEW v_wi_certifications AS
SELECT
  woc.id,
  woc.operator_id,
  u.first_name || ' ' || u.last_name AS operator_name,
  woc.work_instruction_id,
  wi.title AS wi_title,
  wi.operation_code,
  wi.wi_type,
  c.name AS client_name,
  woc.level,
  woc.level_code,
  woc.certified_date,
  woc.expires_at,
  woc.training_type,
  woc.status,
  woc.evidence_path IS NOT NULL AS has_evidence,
  cb.first_name || ' ' || cb.last_name AS certified_by_name,
  CASE
    WHEN woc.status = 'REVOKED' THEN 'REVOKED'
    WHEN woc.expires_at IS NULL THEN 'ACTIVE'
    WHEN woc.expires_at < CURRENT_DATE THEN 'EXPIRED'
    WHEN woc.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END AS certification_status
FROM wi_operator_certifications woc
JOIN users u ON woc.operator_id = u.id
JOIN work_instructions wi ON woc.work_instruction_id = wi.id
LEFT JOIN clients c ON wi.client_id = c.id
LEFT JOIN users cb ON woc.certified_by = cb.id;

-- Vista: Matriz ILUO (para generar la tabla pivote)
CREATE OR REPLACE VIEW v_wi_iluo_matrix AS
SELECT
  wi.id AS wi_id,
  wi.title AS wi_title,
  wi.operation_code,
  wi.wi_type,
  wi.client_id,
  c.name AS client_name,
  wl.id AS line_id,
  wl.name AS line_name,
  wa.id AS area_id,
  wa.name AS area_name,
  u.id AS operator_id,
  u.first_name || ' ' || u.last_name AS operator_name,
  COALESCE(woc.level, 0) AS level,
  COALESCE(woc.level_code, '') AS level_code,
  woc.certified_date,
  woc.expires_at,
  woc.status AS cert_status,
  CASE
    WHEN woc.id IS NULL THEN 'NOT_CERTIFIED'
    WHEN woc.status = 'REVOKED' THEN 'REVOKED'
    WHEN woc.expires_at IS NOT NULL AND woc.expires_at < CURRENT_DATE THEN 'EXPIRED'
    ELSE 'CERTIFIED'
  END AS effective_status
FROM work_instructions wi
LEFT JOIN clients c ON wi.client_id = c.id
-- Unir con estaciones para obtener linea/area
LEFT JOIN work_instruction_steps wis ON wi.id = wis.work_instruction_id
LEFT JOIN wi_stations ws ON wis.station_id = ws.id
LEFT JOIN wi_lines wl ON ws.line_id = wl.id
LEFT JOIN wi_areas wa ON wl.area_id = wa.id
-- Cross join con operadores para tener todas las combinaciones
CROSS JOIN users u
LEFT JOIN wi_operator_certifications woc ON woc.work_instruction_id = wi.id
  AND woc.operator_id = u.id
  AND woc.status = 'ACTIVE'
WHERE wi.status = 'active'
  AND u.is_active = TRUE;

-- Vista: Metricas de cobertura por linea
CREATE OR REPLACE VIEW v_wi_coverage_metrics AS
WITH wi_operators AS (
  SELECT
    wi.id AS wi_id,
    wi.title,
    COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level >= 1) AS operators_i,
    COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level >= 3) AS operators_l,
    COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.level >= 5) AS operators_u,
    COUNT(DISTINCT woc.operator_id) FILTER (WHERE woc.status = 'ACTIVE') AS total_certified
  FROM work_instructions wi
  LEFT JOIN wi_operator_certifications woc ON wi.id = woc.work_instruction_id
  WHERE wi.status = 'active'
  GROUP BY wi.id, wi.title
),
operator_wis AS (
  SELECT
    woc.operator_id,
    u.first_name || ' ' || u.last_name AS operator_name,
    COUNT(DISTINCT woc.work_instruction_id) AS wis_certified
  FROM wi_operator_certifications woc
  JOIN users u ON woc.operator_id = u.id
  WHERE woc.status = 'ACTIVE'
  GROUP BY woc.operator_id, u.first_name, u.last_name
)
SELECT
  'COVERAGE_3X1' AS metric_type,
  wo.wi_id,
  wo.title AS wi_title,
  wo.total_certified,
  CASE WHEN wo.total_certified >= 3 THEN TRUE ELSE FALSE END AS meets_3x1,
  ROUND(wo.total_certified * 100.0 / NULLIF(3, 0), 1) AS coverage_pct
FROM wi_operators wo
UNION ALL
SELECT
  'COVERAGE_1X3' AS metric_type,
  ow.operator_id AS id,
  ow.operator_name AS title,
  ow.wis_certified AS total,
  CASE WHEN ow.wis_certified >= 3 THEN TRUE ELSE FALSE END AS meets_1x3,
  ROUND(ow.wis_certified * 100.0 / NULLIF(3, 0), 1) AS coverage_pct
FROM operator_wis ow;

-- Vista: Resumen por operador (similar a Skills)
CREATE OR REPLACE VIEW v_operator_wi_summary AS
SELECT
  u.id AS operator_id,
  u.first_name || ' ' || u.last_name AS operator_name,
  u.position,
  d.name AS department_name,
  COUNT(DISTINCT woc.work_instruction_id) AS total_certifications,
  COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level >= 5) AS level_u_count,
  COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level >= 3 AND woc.level < 5) AS level_l_count,
  COUNT(DISTINCT woc.work_instruction_id) FILTER (WHERE woc.level < 3) AS level_i_count,
  ROUND(AVG(woc.level)::numeric, 2) AS avg_level,
  COUNT(DISTINCT woc.work_instruction_id) FILTER (
    WHERE woc.expires_at IS NOT NULL AND woc.expires_at < CURRENT_DATE
  ) AS expired_count,
  COUNT(DISTINCT woc.work_instruction_id) FILTER (
    WHERE woc.expires_at IS NOT NULL
      AND woc.expires_at >= CURRENT_DATE
      AND woc.expires_at < CURRENT_DATE + INTERVAL '30 days'
  ) AS expiring_soon_count
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN wi_operator_certifications woc ON u.id = woc.operator_id AND woc.status = 'ACTIVE'
WHERE u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.position, d.name;

-- ============================================================================
-- PARTE 7: DATOS DE EJEMPLO (OPCIONAL)
-- ============================================================================

-- Actualizar algunas WIs existentes como BASIC (si existen)
UPDATE work_instructions
SET wi_type = 'BASIC', operation_code = 'SEG-001'
WHERE id = (
  SELECT id FROM work_instructions
  WHERE title ILIKE '%seguridad%' OR title ILIKE '%safety%'
  LIMIT 1
);

UPDATE work_instructions
SET wi_type = 'BASIC', operation_code = '5S-001'
WHERE id = (
  SELECT id FROM work_instructions
  WHERE title ILIKE '%5s%' OR title ILIKE '%limpieza%'
  LIMIT 1
);

-- ============================================================================
-- FIN DE MIGRACION 086
-- ============================================================================
