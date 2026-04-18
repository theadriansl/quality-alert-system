-- ============================================================================
-- MIGRACIÓN SIMPLE: Agregar columna de contención a D4
-- Fecha: 27 de Noviembre de 2025
-- ============================================================================
--
-- La estructura actual ya tiene la mayoría de las columnas necesarias.
-- Solo agregamos lo que falta para la reorganización.
--
-- ============================================================================

-- Agregar columna de acciones de contención a D4 (si no existe)
ALTER TABLE eightd_reports
  ADD COLUMN IF NOT EXISTS d4_containment_actions JSONB DEFAULT '[]';

-- Agregar comentario
COMMENT ON COLUMN eightd_reports.d4_containment_actions IS 'D4: Acciones de contención implementadas';

-- ============================================================================
-- MAPEO DE COLUMNAS EXISTENTES A NUEVA ESTRUCTURA
-- ============================================================================
--
-- D4: Contención y Análisis de Causa Raíz
--   - d4_containment_actions (nueva)
--   - d4_root_cause
--   - d4_root_causes
--   - d4_potential_causes
--   - d4_five_whys_analysis
--   - d4_fishbone_analysis
--
-- D5: Contramedida Temporal
--   - d4_temporary_countermeasure (se usará en frontend D5)
--   - d4_implementation_date
--   - d4_effectiveness_evaluation
--   - d4_verification_method
--   - d4_verification_evidence
--
-- D6: Contramedida Definitiva
--   - d6_definitive_actions
--   - d6_implementation_plan
--   - d6_validation_plan
--   - d6_quality_approval_*
--
-- D7: Confirmación de Contramedidas
--   - d7_temporary_validation
--   - d7_definitive_validation
--   - d7_validation_evidence
--   - d7_is_effective
--   - d7_validation_date
--
-- ============================================================================
