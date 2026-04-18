-- ============================================================================
-- Migration: 020_inspection_catalogs_global.sql
-- Date: 2026-02-04
-- Description: Convertir catálogos de inspección de per-client a GLOBALES
-- ============================================================================

-- ============================================================================
-- 1. SEVERIDADES - Hacer global
-- ============================================================================
-- Eliminar duplicados (mantener solo uno de cada code)
DELETE FROM inspection_severities a
USING inspection_severities b
WHERE a.id > b.id AND a.code = b.code;

-- Eliminar constraint único anterior
ALTER TABLE inspection_severities DROP CONSTRAINT IF EXISTS inspection_severities_client_id_code_key;

-- Agregar nuevo constraint único solo por code
ALTER TABLE inspection_severities ADD CONSTRAINT inspection_severities_code_key UNIQUE (code);

-- Eliminar columna client_id
ALTER TABLE inspection_severities DROP COLUMN IF EXISTS client_id;

-- ============================================================================
-- 2. ESTACIONES - Hacer global
-- ============================================================================
DELETE FROM inspection_stations a
USING inspection_stations b
WHERE a.id > b.id AND a.code = b.code;

ALTER TABLE inspection_stations DROP CONSTRAINT IF EXISTS inspection_stations_client_id_code_key;
ALTER TABLE inspection_stations ADD CONSTRAINT inspection_stations_code_key UNIQUE (code);
ALTER TABLE inspection_stations DROP COLUMN IF EXISTS client_id;

-- ============================================================================
-- 3. ETAPAS - Hacer global
-- ============================================================================
DELETE FROM inspection_stages a
USING inspection_stages b
WHERE a.id > b.id AND a.code = b.code;

ALTER TABLE inspection_stages DROP CONSTRAINT IF EXISTS inspection_stages_client_id_code_key;
ALTER TABLE inspection_stages ADD CONSTRAINT inspection_stages_code_key UNIQUE (code);
ALTER TABLE inspection_stages DROP COLUMN IF EXISTS client_id;

-- ============================================================================
-- 4. TURNOS - Hacer global
-- ============================================================================
DELETE FROM inspection_shifts a
USING inspection_shifts b
WHERE a.id > b.id AND a.code = b.code;

ALTER TABLE inspection_shifts DROP CONSTRAINT IF EXISTS inspection_shifts_client_id_code_key;
ALTER TABLE inspection_shifts ADD CONSTRAINT inspection_shifts_code_key UNIQUE (code);
ALTER TABLE inspection_shifts DROP COLUMN IF EXISTS client_id;

-- ============================================================================
-- 5. DISPOSICIONES - Hacer global
-- ============================================================================
DELETE FROM inspection_dispositions a
USING inspection_dispositions b
WHERE a.id > b.id AND a.code = b.code;

ALTER TABLE inspection_dispositions DROP CONSTRAINT IF EXISTS inspection_dispositions_client_id_code_key;
ALTER TABLE inspection_dispositions ADD CONSTRAINT inspection_dispositions_code_key UNIQUE (code);
ALTER TABLE inspection_dispositions DROP COLUMN IF EXISTS client_id;

-- ============================================================================
-- 6. ELIMINAR ÍNDICES OBSOLETOS
-- ============================================================================
DROP INDEX IF EXISTS idx_inspection_severities_client;
DROP INDEX IF EXISTS idx_inspection_stations_client;
DROP INDEX IF EXISTS idx_inspection_stages_client;
DROP INDEX IF EXISTS idx_inspection_shifts_client;
DROP INDEX IF EXISTS idx_inspection_dispositions_client;

-- ============================================================================
-- 7. ACTUALIZAR COMENTARIOS
-- ============================================================================
COMMENT ON TABLE inspection_severities IS 'Niveles de severidad GLOBALES de la compañía';
COMMENT ON TABLE inspection_stations IS 'Estaciones de inspección GLOBALES de la compañía';
COMMENT ON TABLE inspection_stages IS 'Etapas de afectación GLOBALES de la compañía';
COMMENT ON TABLE inspection_shifts IS 'Turnos de trabajo GLOBALES de la compañía';
COMMENT ON TABLE inspection_dispositions IS 'Disposiciones GLOBALES de la compañía';
