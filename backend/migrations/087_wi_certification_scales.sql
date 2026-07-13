-- ============================================================================
-- Migration: 087_wi_certification_scales.sql
-- Date: 2026-05-07
-- Description: Escalas configurables para certificaciones WI (ILUO y Estándar 1-5)
-- ============================================================================

-- ============================================================================
-- 1. ESCALAS DE CERTIFICACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS wi_certification_scales (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  min_value INTEGER NOT NULL DEFAULT 1,
  max_value INTEGER NOT NULL DEFAULT 4,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wi_certification_scale_levels (
  id SERIAL PRIMARY KEY,
  scale_id INTEGER NOT NULL REFERENCES wi_certification_scales(id) ON DELETE CASCADE,
  level_value INTEGER NOT NULL,
  code VARCHAR(20),
  label VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6b7280',
  can_train_others BOOLEAN DEFAULT FALSE,
  UNIQUE(scale_id, level_value)
);

CREATE INDEX IF NOT EXISTS idx_wi_scale_levels_scale ON wi_certification_scale_levels(scale_id);

-- ============================================================================
-- 2. AGREGAR SCALE_ID A CERTIFICACIONES EXISTENTES
-- ============================================================================

ALTER TABLE wi_operator_certifications
ADD COLUMN IF NOT EXISTS scale_id INTEGER REFERENCES wi_certification_scales(id);

-- ============================================================================
-- 3. INSERTAR ESCALAS - ILUO (4 niveles) y Estándar (5 niveles)
-- ============================================================================

-- Escala ILUO (por defecto para Work Instructions)
INSERT INTO wi_certification_scales (name, code, description, min_value, max_value, is_default)
VALUES (
  'Escala ILUO',
  'ILUO',
  'Escala de 4 niveles para operaciones (Observador, Bajo supervisión, Libre, Instructor)',
  1, 4, TRUE
) ON CONFLICT (code) DO NOTHING;

-- Escala Estándar 1-5
INSERT INTO wi_certification_scales (name, code, description, min_value, max_value, is_default)
VALUES (
  'Escala Estándar 1-5',
  'STANDARD_1_5',
  'Escala de 5 niveles basada en autonomía y capacidad de instrucción',
  1, 5, FALSE
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. INSERTAR NIVELES PARA ESCALA ILUO (1-4: O, U, L, I)
-- ============================================================================

INSERT INTO wi_certification_scale_levels (scale_id, level_value, code, label, description, color, can_train_others)
SELECT s.id, v.level_value, v.code, v.label, v.description, v.color, v.can_train
FROM wi_certification_scales s,
(VALUES
  (1, 'O', 'Observador', 'Solo puede observar, no ejecutar', '#ef4444', false),
  (2, 'U', 'Bajo Supervisión', 'Puede ejecutar bajo supervisión directa', '#f59e0b', false),
  (3, 'L', 'Libre', 'Puede ejecutar de forma autónoma', '#22c55e', false),
  (4, 'I', 'Instructor', 'Puede instruir y certificar a otros', '#0ea5e9', true)
) AS v(level_value, code, label, description, color, can_train)
WHERE s.code = 'ILUO'
ON CONFLICT (scale_id, level_value) DO NOTHING;

-- ============================================================================
-- 5. INSERTAR NIVELES PARA ESCALA ESTÁNDAR 1-5 (L1-L5)
-- ============================================================================

INSERT INTO wi_certification_scale_levels (scale_id, level_value, code, label, description, color, can_train_others)
SELECT s.id, v.level_value, v.code, v.label, v.description, v.color, v.can_train
FROM wi_certification_scales s,
(VALUES
  (1, 'L1', 'Bajo Supervisión', 'Realiza tareas bajo supervisión de un líder', '#ef4444', false),
  (2, 'L2', 'Independiente', 'Realiza tareas de forma independiente', '#f97316', false),
  (3, 'L3', 'Líder', 'Puede liderar grupo', '#f59e0b', false),
  (4, 'L4', 'Instructor Interno', 'Puede instruir personal interno', '#22c55e', true),
  (5, 'L5', 'Experto', 'Puede entrenar a otros y desarrollar nuevos métodos', '#0ea5e9', true)
) AS v(level_value, code, label, description, color, can_train)
WHERE s.code = 'STANDARD_1_5'
ON CONFLICT (scale_id, level_value) DO NOTHING;

-- ============================================================================
-- 6. ACTUALIZAR CERTIFICACIONES EXISTENTES CON ESCALA DEFAULT (ILUO)
-- ============================================================================

UPDATE wi_operator_certifications
SET scale_id = (SELECT id FROM wi_certification_scales WHERE is_default = true LIMIT 1)
WHERE scale_id IS NULL;

-- ============================================================================
-- 7. VISTA PARA NIVELES CON INFO DE ESCALA
-- ============================================================================

CREATE OR REPLACE VIEW v_wi_certification_scale_levels AS
SELECT
  sl.id,
  sl.scale_id,
  s.name AS scale_name,
  s.code AS scale_code,
  s.min_value,
  s.max_value,
  sl.level_value,
  sl.code AS level_code,
  sl.label,
  sl.description,
  sl.color,
  sl.can_train_others
FROM wi_certification_scale_levels sl
JOIN wi_certification_scales s ON sl.scale_id = s.id
WHERE s.is_active = true
ORDER BY s.name, sl.level_value;
