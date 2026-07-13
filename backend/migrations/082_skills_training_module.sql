-- ============================================================================
-- Migration: 082_skills_training_module.sql
-- Date: 2026-05-04
-- Description: Módulo de Capacitación y Evaluación de Habilidades
-- ============================================================================

-- ============================================================================
-- 1. ESCALAS DE EVALUACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_scales (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  min_value INTEGER NOT NULL DEFAULT 1,
  max_value INTEGER NOT NULL DEFAULT 5,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_scale_levels (
  id SERIAL PRIMARY KEY,
  scale_id INTEGER NOT NULL REFERENCES skill_scales(id) ON DELETE CASCADE,
  level_value INTEGER NOT NULL,
  code VARCHAR(20),
  label VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6b7280',
  UNIQUE(scale_id, level_value)
);

CREATE INDEX IF NOT EXISTS idx_scale_levels_scale ON skill_scale_levels(scale_id);

-- ============================================================================
-- 2. CATEGORÍAS DE HABILIDADES
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(10) DEFAULT '📋',
  color VARCHAR(20) DEFAULT '#3b82f6',
  scale_id INTEGER REFERENCES skill_scales(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. DEFINICIÓN DE HABILIDADES
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_definitions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  default_target INTEGER DEFAULT 3,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_definitions_category ON skill_definitions(category_id);

-- ============================================================================
-- 4. PERFILES DE PUESTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  description TEXT,
  department_id INTEGER REFERENCES departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habilidades que aplican a cada perfil
CREATE TABLE IF NOT EXISTS skill_profile_items (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES skill_profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  target_level INTEGER NOT NULL DEFAULT 3,
  is_required BOOLEAN DEFAULT TRUE,
  UNIQUE(profile_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_items_profile ON skill_profile_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_items_skill ON skill_profile_items(skill_id);

-- ============================================================================
-- 5. ASIGNACIÓN DE HABILIDADES A USUARIOS
-- ============================================================================

-- Perfil asignado al usuario (opcional, puede tener asignaciones individuales)
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_profile_id INTEGER REFERENCES skill_profiles(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_path VARCHAR(500);

-- Asignaciones individuales de habilidades (override o adicionales al perfil)
CREATE TABLE IF NOT EXISTS user_skill_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  target_level INTEGER NOT NULL,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_user ON user_skill_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_skill ON user_skill_assignments(skill_id);

-- ============================================================================
-- 6. EVALUACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_evaluations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluated_by INTEGER NOT NULL REFERENCES users(id),
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period VARCHAR(50), -- Ej: "2026-Q1", "2026-H1", "Anual 2026"
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, COMPLETED, APPROVED
  overall_score DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluations_user ON skill_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON skill_evaluations(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON skill_evaluations(evaluation_date);

-- Scores individuales por habilidad
CREATE TABLE IF NOT EXISTS skill_evaluation_scores (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER NOT NULL REFERENCES skill_evaluations(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  target INTEGER NOT NULL,
  gap INTEGER GENERATED ALWAYS AS (target - score) STORED,
  notes TEXT,
  evidence_path VARCHAR(500),
  UNIQUE(evaluation_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_scores_evaluation ON skill_evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_scores_skill ON skill_evaluation_scores(skill_id);

-- ============================================================================
-- 7. CAPACITACIONES / CURSOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  category_id INTEGER REFERENCES skill_categories(id),
  duration_hours DECIMAL(5,1),
  is_mandatory BOOLEAN DEFAULT FALSE,
  validity_months INTEGER, -- NULL = no expira
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cursos requeridos por perfil
CREATE TABLE IF NOT EXISTS skill_profile_courses (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES skill_profiles(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT TRUE,
  UNIQUE(profile_id, course_id)
);

-- Cursos completados por usuario
CREATE TABLE IF NOT EXISTS user_training_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  expiry_date DATE,
  score DECIMAL(5,2),
  certificate_path VARCHAR(500),
  trainer_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_records_user ON user_training_records(user_id);
CREATE INDEX IF NOT EXISTS idx_training_records_course ON user_training_records(course_id);
CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON user_training_records(expiry_date);

-- ============================================================================
-- 8. VISTAS ÚTILES
-- ============================================================================

-- Vista: Habilidades de un usuario (combinando perfil + asignaciones individuales)
CREATE OR REPLACE VIEW v_user_skills AS
SELECT
  u.id as user_id,
  u.first_name || ' ' || u.last_name as user_name,
  u.email,
  u.photo_path,
  u.skill_profile_id,
  sp.name as profile_name,
  sd.id as skill_id,
  sd.name as skill_name,
  sd.code as skill_code,
  sc.id as category_id,
  sc.name as category_name,
  sc.icon as category_icon,
  sc.color as category_color,
  COALESCE(usa.target_level, spi.target_level, sd.default_target) as target_level,
  CASE WHEN usa.id IS NOT NULL THEN 'INDIVIDUAL' ELSE 'PROFILE' END as assignment_type
FROM users u
LEFT JOIN skill_profiles sp ON u.skill_profile_id = sp.id
LEFT JOIN skill_profile_items spi ON sp.id = spi.profile_id
LEFT JOIN user_skill_assignments usa ON u.id = usa.user_id
JOIN skill_definitions sd ON sd.id = COALESCE(usa.skill_id, spi.skill_id)
JOIN skill_categories sc ON sd.category_id = sc.id
WHERE sd.is_active = TRUE;

-- Vista: Última evaluación por usuario
CREATE OR REPLACE VIEW v_user_latest_evaluation AS
SELECT DISTINCT ON (se.user_id)
  se.user_id,
  se.id as evaluation_id,
  se.evaluation_date,
  se.status,
  se.overall_score,
  se.evaluated_by,
  CONCAT(ev.first_name, ' ', ev.last_name) as evaluator_name
FROM skill_evaluations se
JOIN users ev ON se.evaluated_by = ev.id
ORDER BY se.user_id, se.evaluation_date DESC;

-- Vista: Scores por categoría (para radar chart)
CREATE OR REPLACE VIEW v_evaluation_by_category AS
SELECT
  se.id as evaluation_id,
  se.user_id,
  sc.id as category_id,
  sc.name as category_name,
  sc.icon,
  sc.color,
  ROUND(AVG(ses.score), 2) as avg_score,
  ROUND(AVG(ses.target), 2) as avg_target,
  COUNT(ses.id) as skill_count
FROM skill_evaluations se
JOIN skill_evaluation_scores ses ON se.id = ses.evaluation_id
JOIN skill_definitions sd ON ses.skill_id = sd.id
JOIN skill_categories sc ON sd.category_id = sc.id
GROUP BY se.id, se.user_id, sc.id, sc.name, sc.icon, sc.color;

-- Vista: Equipo de un supervisor
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
  u.skill_profile_id,
  sp.name as profile_name,
  ule.evaluation_date as last_evaluation_date,
  ule.overall_score as last_score
FROM users u
JOIN users m ON u.manager_id = m.id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN skill_profiles sp ON u.skill_profile_id = sp.id
LEFT JOIN v_user_latest_evaluation ule ON u.id = ule.user_id
WHERE u.is_active = TRUE;

-- Vista: Capacitaciones por vencer
CREATE OR REPLACE VIEW v_training_expiring AS
SELECT
  utr.id,
  utr.user_id,
  u.first_name || ' ' || u.last_name as user_name,
  tc.id as course_id,
  tc.name as course_name,
  tc.code as course_code,
  utr.completion_date,
  utr.expiry_date,
  CASE
    WHEN utr.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN utr.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END as status,
  utr.expiry_date - CURRENT_DATE as days_until_expiry
FROM user_training_records utr
JOIN users u ON utr.user_id = u.id
JOIN training_courses tc ON utr.course_id = tc.id
WHERE utr.expiry_date IS NOT NULL
ORDER BY utr.expiry_date ASC;

-- ============================================================================
-- 9. SEEDS - ESCALA POR DEFECTO
-- ============================================================================

INSERT INTO skill_scales (name, code, description, min_value, max_value, is_default)
VALUES (
  'Escala Estándar 1-5',
  'STANDARD_1_5',
  'Escala de 5 niveles basada en autonomía y capacidad de instrucción',
  1, 5, TRUE
) ON CONFLICT (code) DO NOTHING;

INSERT INTO skill_scale_levels (scale_id, level_value, code, label, description, color)
SELECT s.id, v.level_value, v.code, v.label, v.description, v.color
FROM skill_scales s,
(VALUES
  (1, 'L1', 'Bajo Supervisión', 'Realiza tareas bajo supervisión de un líder', '#ef4444'),
  (2, 'L2', 'Independiente', 'Realiza tareas de forma independiente', '#f97316'),
  (3, 'L3', 'Líder', 'Puede liderar grupo', '#f59e0b'),
  (4, 'L4', 'Instructor Interno', 'Puede instruir personal interno', '#22c55e'),
  (5, 'L5', 'Experto', 'Puede entrenar a otros y desarrollar nuevos métodos', '#0ea5e9')
) AS v(level_value, code, label, description, color)
WHERE s.code = 'STANDARD_1_5'
ON CONFLICT (scale_id, level_value) DO NOTHING;

-- Escala ILUO
INSERT INTO skill_scales (name, code, description, min_value, max_value, is_default)
VALUES (
  'Escala ILUO',
  'ILUO',
  'Escala de 4 niveles para operaciones (Observador, Bajo supervisión, Libre, Instructor)',
  1, 4, FALSE
) ON CONFLICT (code) DO NOTHING;

INSERT INTO skill_scale_levels (scale_id, level_value, code, label, description, color)
SELECT s.id, v.level_value, v.code, v.label, v.description, v.color
FROM skill_scales s,
(VALUES
  (1, 'I', 'Observador', 'Solo puede observar, no ejecutar', '#ef4444'),
  (2, 'L', 'Bajo Supervisión', 'Puede ejecutar bajo supervisión directa', '#f59e0b'),
  (3, 'U', 'Libre', 'Puede ejecutar de forma autónoma', '#22c55e'),
  (4, 'O', 'Instructor', 'Puede instruir y certificar a otros', '#0ea5e9')
) AS v(level_value, code, label, description, color)
WHERE s.code = 'ILUO'
ON CONFLICT (scale_id, level_value) DO NOTHING;

-- ============================================================================
-- 10. SEEDS - CATEGORÍAS BASE
-- ============================================================================

INSERT INTO skill_categories (name, code, description, icon, color, display_order, scale_id)
SELECT v.name, v.code, v.description, v.icon, v.color, v.display_order, s.id
FROM (VALUES
  ('Inducción', 'INDUCTION', 'Capacitación inicial y onboarding', '📚', '#8b5cf6', 1),
  ('Operaciones', 'OPERATIONS', 'Conocimientos y habilidades del puesto', '🏭', '#0ea5e9', 2),
  ('Técnicas', 'TECHNICAL', 'Habilidades técnicas especializadas', '🔧', '#f59e0b', 3),
  ('Soft Skills', 'SOFT_SKILLS', 'Habilidades blandas e interpersonales', '🤝', '#22c55e', 4),
  ('Gestión', 'MANAGEMENT', 'Habilidades de supervisión y liderazgo', '📊', '#ef4444', 5)
) AS v(name, code, description, icon, color, display_order)
CROSS JOIN skill_scales s
WHERE s.code = 'STANDARD_1_5'
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 11. SEEDS - HABILIDADES EJEMPLO
-- ============================================================================

-- Inducción
INSERT INTO skill_definitions (category_id, name, code, description, default_target, display_order)
SELECT c.id, v.name, v.code, v.description, v.default_target, v.display_order
FROM skill_categories c,
(VALUES
  ('Políticas de la empresa', 'IND_POLICIES', 'Conocimiento de políticas internas', 3, 1),
  ('Seguridad e higiene', 'IND_SAFETY', 'Normas de seguridad y protocolos', 3, 2),
  ('Sistemas básicos', 'IND_SYSTEMS', 'Uso de sistemas internos (ERP, correo, etc.)', 3, 3),
  ('Cultura organizacional', 'IND_CULTURE', 'Valores y cultura de la empresa', 3, 4)
) AS v(name, code, description, default_target, display_order)
WHERE c.code = 'INDUCTION'
ON CONFLICT DO NOTHING;

-- Operaciones
INSERT INTO skill_definitions (category_id, name, code, description, default_target, display_order)
SELECT c.id, v.name, v.code, v.description, v.default_target, v.display_order
FROM skill_categories c,
(VALUES
  ('Procesos del área', 'OPS_PROCESSES', 'Conocimiento de procesos operativos', 3, 1),
  ('Equipos y herramientas', 'OPS_EQUIPMENT', 'Manejo de equipos del área', 3, 2),
  ('Procedimientos de calidad', 'OPS_QUALITY', 'Procedimientos de control de calidad', 3, 3),
  ('Documentación', 'OPS_DOCS', 'Llenado de formatos y registros', 3, 4)
) AS v(name, code, description, default_target, display_order)
WHERE c.code = 'OPERATIONS'
ON CONFLICT DO NOTHING;

-- Técnicas
INSERT INTO skill_definitions (category_id, name, code, description, default_target, display_order)
SELECT c.id, v.name, v.code, v.description, v.default_target, v.display_order
FROM skill_categories c,
(VALUES
  ('Lectura de planos', 'TECH_BLUEPRINTS', 'Interpretación de dibujos técnicos', 3, 1),
  ('Instrumentos de medición', 'TECH_MEASUREMENT', 'Uso de instrumentos de medición', 3, 2),
  ('Análisis de datos', 'TECH_DATA', 'Análisis estadístico básico', 3, 3),
  ('Resolución de problemas', 'TECH_PROBLEM', 'Metodologías de solución (8D, 5 Why)', 4, 4)
) AS v(name, code, description, default_target, display_order)
WHERE c.code = 'TECHNICAL'
ON CONFLICT DO NOTHING;

-- Soft Skills
INSERT INTO skill_definitions (category_id, name, code, description, default_target, display_order)
SELECT c.id, v.name, v.code, v.description, v.default_target, v.display_order
FROM skill_categories c,
(VALUES
  ('Comunicación', 'SOFT_COMM', 'Comunicación efectiva oral y escrita', 3, 1),
  ('Trabajo en equipo', 'SOFT_TEAM', 'Colaboración y trabajo en equipo', 3, 2),
  ('Adaptabilidad', 'SOFT_ADAPT', 'Flexibilidad ante cambios', 3, 3),
  ('Orientación a resultados', 'SOFT_RESULTS', 'Enfoque en objetivos y metas', 3, 4)
) AS v(name, code, description, default_target, display_order)
WHERE c.code = 'SOFT_SKILLS'
ON CONFLICT DO NOTHING;

-- Gestión
INSERT INTO skill_definitions (category_id, name, code, description, default_target, display_order)
SELECT c.id, v.name, v.code, v.description, v.default_target, v.display_order
FROM skill_categories c,
(VALUES
  ('Planeación', 'MGT_PLANNING', 'Planeación y organización de actividades', 4, 1),
  ('Gestión de KPIs', 'MGT_KPIS', 'Seguimiento y análisis de indicadores', 4, 2),
  ('Desarrollo de personal', 'MGT_PEOPLE', 'Coaching y desarrollo de equipo', 4, 3),
  ('Mejora continua', 'MGT_IMPROVE', 'Implementación de mejoras (Kaizen, Lean)', 4, 4)
) AS v(name, code, description, default_target, display_order)
WHERE c.code = 'MANAGEMENT'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. SEEDS - PERFILES EJEMPLO
-- ============================================================================

INSERT INTO skill_profiles (name, code, description)
VALUES
  ('Operador', 'OPERATOR', 'Perfil para operadores de línea'),
  ('Inspector de Calidad', 'INSPECTOR', 'Perfil para inspectores de calidad'),
  ('Técnico de Reparación', 'REPAIR_TECH', 'Perfil para técnicos de reparación'),
  ('Supervisor', 'SUPERVISOR', 'Perfil para supervisores de área')
ON CONFLICT (code) DO NOTHING;

SELECT 'Migration 082_skills_training_module.sql completed successfully' as status;
