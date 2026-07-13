-- Migration 084: Skills Retraining & Simplification
-- Fecha: 2026-05-05
-- Descripción: Agregar campo de reentrenamiento y simplificar modelo de perfiles

-- ============================================================================
-- 1. AGREGAR CAMPO DE REENTRENAMIENTO A HABILIDADES
-- ============================================================================

-- Días para reentrenamiento (NULL = no requiere reentrenamiento periódico)
ALTER TABLE skill_definitions
ADD COLUMN IF NOT EXISTS retraining_days INTEGER DEFAULT NULL;

-- Comentario para documentación
COMMENT ON COLUMN skill_definitions.retraining_days IS 'Días después de los cuales se requiere reentrenamiento. NULL = no expira';

-- ============================================================================
-- 2. AGREGAR CAMPOS DE VIGENCIA A EVALUACIONES
-- ============================================================================

-- Fecha de vencimiento calculada al momento de evaluar
ALTER TABLE skill_evaluation_scores
ADD COLUMN IF NOT EXISTS expires_at DATE DEFAULT NULL;

-- ============================================================================
-- 3. VISTA DE HISTORIAL COMPLETO DE CAPACITACIONES (CV)
-- ============================================================================

CREATE OR REPLACE VIEW v_user_training_history AS
SELECT
  ses.id as score_id,
  se.user_id,
  se.id as evaluation_id,
  se.evaluation_date,
  se.period,
  se.status as evaluation_status,
  ses.skill_id,
  sd.name as skill_name,
  sd.code as skill_code,
  sd.retraining_days,
  sc.name as category_name,
  sc.color as category_color,
  ses.score,
  ses.target,
  ses.notes as score_notes,
  ses.expires_at,
  -- Calcular si está vencido o por vencer
  CASE
    WHEN ses.expires_at IS NULL THEN 'VIGENTE'
    WHEN ses.expires_at < CURRENT_DATE THEN 'VENCIDO'
    WHEN ses.expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'POR_VENCER'
    ELSE 'VIGENTE'
  END as validity_status,
  -- Días restantes (negativo si vencido)
  CASE
    WHEN ses.expires_at IS NULL THEN NULL
    ELSE (ses.expires_at - CURRENT_DATE)
  END as days_remaining,
  CONCAT(ev.first_name, ' ', ev.last_name) as evaluator_name
FROM skill_evaluation_scores ses
JOIN skill_evaluations se ON ses.evaluation_id = se.id
JOIN skill_definitions sd ON ses.skill_id = sd.id
JOIN skill_categories sc ON sd.category_id = sc.id
JOIN users ev ON se.evaluated_by = ev.id
WHERE se.status = 'COMPLETED'
ORDER BY se.user_id, se.evaluation_date DESC;

-- ============================================================================
-- 4. VISTA DE ÚLTIMA CAPACITACIÓN POR HABILIDAD (para saber vigencia actual)
-- ============================================================================

CREATE OR REPLACE VIEW v_user_current_skills AS
SELECT DISTINCT ON (user_id, skill_id)
  user_id,
  skill_id,
  skill_name,
  skill_code,
  category_name,
  category_color,
  score,
  target,
  evaluation_date as last_training_date,
  retraining_days,
  expires_at,
  validity_status,
  days_remaining,
  evaluator_name
FROM v_user_training_history
ORDER BY user_id, skill_id, evaluation_date DESC;

-- ============================================================================
-- 5. VISTA DE CAPACITACIONES POR VENCER (para dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW v_expiring_training AS
SELECT
  vcs.*,
  u.first_name,
  u.last_name,
  CONCAT(u.first_name, ' ', u.last_name) as user_name,
  d.name as department_name,
  u.manager_id
FROM v_user_current_skills vcs
JOIN users u ON vcs.user_id = u.id
LEFT JOIN departments d ON u.department_id = d.id
WHERE vcs.validity_status IN ('VENCIDO', 'POR_VENCER')
ORDER BY vcs.days_remaining ASC NULLS LAST;

-- ============================================================================
-- 6. FUNCIÓN PARA CALCULAR FECHA DE VENCIMIENTO
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_skill_expiry(
  p_evaluation_date DATE,
  p_retraining_days INTEGER
) RETURNS DATE AS $$
BEGIN
  IF p_retraining_days IS NULL OR p_retraining_days <= 0 THEN
    RETURN NULL;
  END IF;
  RETURN p_evaluation_date + (p_retraining_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. TRIGGER PARA AUTO-CALCULAR FECHA DE VENCIMIENTO
-- ============================================================================

CREATE OR REPLACE FUNCTION set_skill_expiry() RETURNS TRIGGER AS $$
DECLARE
  v_retraining_days INTEGER;
  v_evaluation_date DATE;
BEGIN
  -- Obtener días de reentrenamiento de la habilidad
  SELECT retraining_days INTO v_retraining_days
  FROM skill_definitions WHERE id = NEW.skill_id;

  -- Obtener fecha de evaluación
  SELECT evaluation_date INTO v_evaluation_date
  FROM skill_evaluations WHERE id = NEW.evaluation_id;

  -- Calcular fecha de vencimiento
  NEW.expires_at := calculate_skill_expiry(v_evaluation_date, v_retraining_days);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (drop si existe)
DROP TRIGGER IF EXISTS trg_set_skill_expiry ON skill_evaluation_scores;
CREATE TRIGGER trg_set_skill_expiry
  BEFORE INSERT ON skill_evaluation_scores
  FOR EACH ROW
  EXECUTE FUNCTION set_skill_expiry();

-- ============================================================================
-- 8. MANTENER user_skill_profiles COMO HISTORIAL
-- ============================================================================

-- La tabla user_skill_profiles ya existe, la usamos como historial
-- El perfil activo sigue siendo skill_profile_id en users

-- Agregar campo para indicar razón del cambio
ALTER TABLE user_skill_profiles
ADD COLUMN IF NOT EXISTS change_reason TEXT DEFAULT NULL;

COMMENT ON TABLE user_skill_profiles IS 'Historial de perfiles asignados al usuario. El perfil activo está en users.skill_profile_id';

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
