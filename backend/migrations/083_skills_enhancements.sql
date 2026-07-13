-- ============================================================================
-- Migration: 083_skills_enhancements.sql
-- Date: 2026-05-05
-- Description: Mejoras al módulo Skills:
--   1. Multi-perfil por usuario (hoja de vida)
--   2. Criterios de nivel 1-5 por habilidad (matriz de competencias)
--   3. Vista para historial de evaluaciones (curva de desarrollo)
-- ============================================================================

-- ============================================================================
-- 1. MULTI-PERFIL POR USUARIO
-- ============================================================================

-- Tabla de relación muchos-a-muchos: usuario puede tener varios perfiles
CREATE TABLE IF NOT EXISTS user_skill_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES skill_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = perfil activo actual
  notes TEXT,
  UNIQUE(user_id, profile_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_skill_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile ON user_skill_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_skill_profiles(is_active);

-- Migrar perfiles existentes de users.skill_profile_id a la nueva tabla
INSERT INTO user_skill_profiles (user_id, profile_id, assigned_at, is_active)
SELECT id, skill_profile_id, CURRENT_TIMESTAMP, TRUE
FROM users
WHERE skill_profile_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. CRITERIOS DE NIVEL POR HABILIDAD (MATRIZ DE COMPETENCIAS)
-- ============================================================================

-- Agregar campos para describir qué se necesita para cada nivel
ALTER TABLE skill_definitions ADD COLUMN IF NOT EXISTS level_1_criteria TEXT;
ALTER TABLE skill_definitions ADD COLUMN IF NOT EXISTS level_2_criteria TEXT;
ALTER TABLE skill_definitions ADD COLUMN IF NOT EXISTS level_3_criteria TEXT;
ALTER TABLE skill_definitions ADD COLUMN IF NOT EXISTS level_4_criteria TEXT;
ALTER TABLE skill_definitions ADD COLUMN IF NOT EXISTS level_5_criteria TEXT;

-- ============================================================================
-- 3. QUITAR ICONOS DE CATEGORÍAS (OPCIONAL - MANTENER CAMPO PERO NO USAR)
-- ============================================================================
-- No eliminamos el campo icon, solo lo dejamos de usar en frontend

-- ============================================================================
-- 4. VISTA PARA HISTORIAL DE EVALUACIONES (CURVA DE DESARROLLO)
-- ============================================================================

-- Vista: Historial de scores por evaluación para gráfica de evolución
CREATE OR REPLACE VIEW v_user_evaluation_history AS
SELECT
  se.user_id,
  se.id as evaluation_id,
  se.evaluation_date,
  se.period,
  se.overall_score,
  se.status,
  CONCAT(ev.first_name, ' ', ev.last_name) as evaluator_name
FROM skill_evaluations se
JOIN users ev ON se.evaluated_by = ev.id
WHERE se.status = 'COMPLETED'
ORDER BY se.user_id, se.evaluation_date ASC;

-- Vista: Perfiles del usuario (todos, histórico)
CREATE OR REPLACE VIEW v_user_all_profiles AS
SELECT
  usp.id,
  usp.user_id,
  u.first_name || ' ' || u.last_name as user_name,
  usp.profile_id,
  sp.name as profile_name,
  sp.code as profile_code,
  sp.description as profile_description,
  usp.assigned_at,
  usp.start_date,
  usp.end_date,
  usp.is_active,
  usp.notes,
  CONCAT(ab.first_name, ' ', ab.last_name) as assigned_by_name,
  (SELECT COUNT(*) FROM skill_profile_items WHERE profile_id = sp.id) as skill_count
FROM user_skill_profiles usp
JOIN users u ON usp.user_id = u.id
JOIN skill_profiles sp ON usp.profile_id = sp.id
LEFT JOIN users ab ON usp.assigned_by = ab.id
ORDER BY usp.user_id, usp.start_date DESC;

-- Vista actualizada: Habilidades de un usuario (combina TODOS sus perfiles + individuales)
DROP VIEW IF EXISTS v_user_skills CASCADE;
CREATE OR REPLACE VIEW v_user_skills AS
SELECT DISTINCT ON (u.id, sd.id)
  u.id as user_id,
  u.first_name || ' ' || u.last_name as user_name,
  u.email,
  u.photo_path,
  sd.id as skill_id,
  sd.name as skill_name,
  sd.code as skill_code,
  sd.level_1_criteria,
  sd.level_2_criteria,
  sd.level_3_criteria,
  sd.level_4_criteria,
  sd.level_5_criteria,
  sc.id as category_id,
  sc.name as category_name,
  sc.icon as category_icon,
  sc.color as category_color,
  COALESCE(usa.target_level, spi.target_level, sd.default_target) as target_level,
  CASE
    WHEN usa.id IS NOT NULL THEN 'INDIVIDUAL'
    WHEN usp.id IS NOT NULL THEN 'PROFILE'
    ELSE 'DEFAULT'
  END as assignment_type,
  COALESCE(sp.id, 0) as profile_id,
  sp.name as profile_name
FROM users u
LEFT JOIN user_skill_profiles usp ON u.id = usp.user_id AND usp.is_active = TRUE
LEFT JOIN skill_profiles sp ON usp.profile_id = sp.id
LEFT JOIN skill_profile_items spi ON sp.id = spi.profile_id
LEFT JOIN user_skill_assignments usa ON u.id = usa.user_id
JOIN skill_definitions sd ON sd.id = COALESCE(usa.skill_id, spi.skill_id)
JOIN skill_categories sc ON sd.category_id = sc.id
WHERE sd.is_active = TRUE;

-- Recrear vista de equipo
DROP VIEW IF EXISTS v_team_members CASCADE;
CREATE OR REPLACE VIEW v_team_members AS
SELECT
  m.id as manager_id,
  u.id as user_id,
  u.first_name || ' ' || u.last_name as user_name,
  u.email,
  u.photo_path,
  u.position,
  u.department_id,
  d.name as department_name,
  (SELECT string_agg(sp.name, ', ')
   FROM user_skill_profiles usp
   JOIN skill_profiles sp ON usp.profile_id = sp.id
   WHERE usp.user_id = u.id AND usp.is_active = TRUE) as profile_names,
  (SELECT COUNT(*) FROM user_skill_profiles WHERE user_id = u.id AND is_active = TRUE) as profile_count,
  ule.evaluation_date as last_evaluation_date,
  ule.overall_score as last_score
FROM users u
JOIN users m ON u.manager_id = m.id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN v_user_latest_evaluation ule ON u.id = ule.user_id
WHERE u.is_active = TRUE;

-- ============================================================================
-- 5. RENOMBRAR CONCEPTO: Evaluaciones → Evidencias de Capacitación
-- ============================================================================
-- Solo cambio conceptual en frontend, las tablas mantienen sus nombres

-- Agregar campo para indicar qué habilidades fueron evaluadas (opcional)
ALTER TABLE skill_evaluations ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(50) DEFAULT 'FULL';
-- FULL = todas las habilidades, PARTIAL = solo algunas seleccionadas

COMMENT ON COLUMN skill_evaluations.evaluation_type IS 'FULL=todas las habilidades, PARTIAL=habilidades seleccionadas';

SELECT 'Migration 083_skills_enhancements.sql completed successfully' as status;
