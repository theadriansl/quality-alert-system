-- Migration 085: Skills Evidence Upload & Training Type
-- Fecha: 2026-05-06
-- Descripción: Agregar tipo de capacitación y mejorar soporte de evidencias

-- ============================================================================
-- 1. AGREGAR TIPO DE CAPACITACIÓN A SCORES
-- ============================================================================

-- Tipo de capacitación: INTERNAL (empresa) o EXTERNAL (proveedor)
ALTER TABLE skill_evaluation_scores
ADD COLUMN IF NOT EXISTS training_type VARCHAR(20) DEFAULT NULL;

-- Comentario
COMMENT ON COLUMN skill_evaluation_scores.training_type IS 'Tipo de capacitación: INTERNAL o EXTERNAL (opcional)';

-- ============================================================================
-- 2. AGREGAR NOMBRE ORIGINAL DEL ARCHIVO
-- ============================================================================

ALTER TABLE skill_evaluation_scores
ADD COLUMN IF NOT EXISTS evidence_filename VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN skill_evaluation_scores.evidence_filename IS 'Nombre original del archivo de evidencia';

-- ============================================================================
-- 3. QUITAR CAMPO PERIOD DE EVALUACIONES (hacerlo opcional)
-- ============================================================================

-- No eliminamos el campo, solo lo hacemos nullable si no lo es
ALTER TABLE skill_evaluations
ALTER COLUMN period DROP NOT NULL;

-- ============================================================================
-- 4. VISTA MEJORADA DE HISTORIAL PARA TABLA PIVOTE
-- ============================================================================

CREATE OR REPLACE VIEW v_user_skill_history_pivot AS
SELECT
  se.user_id,
  sd.id as skill_id,
  sd.name as skill_name,
  sd.code as skill_code,
  sc.name as category_name,
  sc.color as category_color,
  se.evaluation_date,
  ses.score,
  ses.target,
  ses.training_type,
  ses.evidence_path,
  ses.evidence_filename,
  ses.notes as score_notes
FROM skill_evaluation_scores ses
JOIN skill_evaluations se ON ses.evaluation_id = se.id
JOIN skill_definitions sd ON ses.skill_id = sd.id
JOIN skill_categories sc ON sd.category_id = sc.id
WHERE se.status = 'COMPLETED'
ORDER BY se.user_id, sd.name, se.evaluation_date DESC;

-- ============================================================================
-- 5. VISTA DE FECHAS DE EVALUACIÓN POR USUARIO
-- ============================================================================

CREATE OR REPLACE VIEW v_user_evaluation_dates AS
SELECT DISTINCT
  se.user_id,
  se.id as evaluation_id,
  se.evaluation_date,
  COUNT(ses.id) as skills_evaluated,
  ROUND(AVG(ses.score)::numeric, 2) as avg_score
FROM skill_evaluations se
JOIN skill_evaluation_scores ses ON se.id = ses.evaluation_id
WHERE se.status = 'COMPLETED'
GROUP BY se.user_id, se.id, se.evaluation_date
ORDER BY se.user_id, se.evaluation_date DESC;

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
