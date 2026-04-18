-- ============================================================================
-- MIGRACIÓN: Reorganización de D4-D7
-- Fecha: 27 de Noviembre de 2025
-- ============================================================================
--
-- NUEVA ESTRUCTURA:
-- D4: Contención y Análisis de Causa Raíz
-- D5: Contramedida Temporal
-- D6: Contramedida Definitiva
-- D7: Confirmación de Contramedidas
--
-- ============================================================================

-- Renombrar columnas existentes para preservar datos
-- D4 actual (Root Cause Analysis) → Nueva D4 (Contención + Root Cause)
ALTER TABLE eightd_reports
  RENAME COLUMN d4_root_causes TO d4_root_causes_analysis;

ALTER TABLE eightd_reports
  RENAME COLUMN d4_five_whys TO d4_five_whys_analysis;

ALTER TABLE eightd_reports
  RENAME COLUMN d4_fishbone_data TO d4_fishbone_analysis;

-- Agregar nuevas columnas para D4 - Contención
ALTER TABLE eightd_reports
  ADD COLUMN IF NOT EXISTS d4_containment_actions JSONB DEFAULT '[]';

-- D5 actual (Permanent Corrective Actions) → Nueva D5 (Contramedida Temporal)
ALTER TABLE eightd_reports
  RENAME COLUMN d5_corrective_actions TO d5_temporary_countermeasures;

-- D6 actual (Implement and Validate) → Nueva D6 (Contramedida Definitiva)
ALTER TABLE eightd_reports
  RENAME COLUMN d6_implementation_plan TO d6_definitive_countermeasures;

ALTER TABLE eightd_reports
  RENAME COLUMN d6_validation_results TO d6_validation_plan;

-- D7 actual (Prevent Recurrence) → Nueva D7 (Confirmación de Contramedidas)
ALTER TABLE eightd_reports
  RENAME COLUMN d7_preventive_actions TO d7_confirmation_actions;

ALTER TABLE eightd_reports
  RENAME COLUMN d7_system_improvements TO d7_confirmation_evidence;

-- ============================================================================
-- COMENTARIOS EN COLUMNAS
-- ============================================================================

COMMENT ON COLUMN eightd_reports.d4_containment_actions IS 'D4: Acciones de contención implementadas';
COMMENT ON COLUMN eightd_reports.d4_root_causes_analysis IS 'D4: Análisis de causas raíz';
COMMENT ON COLUMN eightd_reports.d4_five_whys_analysis IS 'D4: Análisis de 5 Porqués';
COMMENT ON COLUMN eightd_reports.d4_fishbone_analysis IS 'D4: Diagrama de Ishikawa (Fishbone)';

COMMENT ON COLUMN eightd_reports.d5_temporary_countermeasures IS 'D5: Contramedidas temporales implementadas';

COMMENT ON COLUMN eightd_reports.d6_definitive_countermeasures IS 'D6: Contramedidas definitivas';
COMMENT ON COLUMN eightd_reports.d6_validation_plan IS 'D6: Plan de validación de contramedidas';

COMMENT ON COLUMN eightd_reports.d7_confirmation_actions IS 'D7: Acciones de confirmación de efectividad';
COMMENT ON COLUMN eightd_reports.d7_confirmation_evidence IS 'D7: Evidencia de confirmación';

-- ============================================================================
-- DATOS DE EJEMPLO (Para testing)
-- ============================================================================

-- Actualizar report de prueba existente (8D-2025-0316) si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM eightd_reports WHERE report_id = '8D-2025-0316') THEN
    UPDATE eightd_reports
    SET
      d4_containment_actions = '[]'::jsonb,
      d4_completed = false
    WHERE report_id = '8D-2025-0316';

    RAISE NOTICE 'Report 8D-2025-0316 actualizado con nueva estructura D4-D7';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (en caso de necesitar revertir)
-- ============================================================================
--
-- Para revertir esta migración, ejecutar:
--
-- ALTER TABLE eightd_reports RENAME COLUMN d4_root_causes_analysis TO d4_root_causes;
-- ALTER TABLE eightd_reports RENAME COLUMN d4_five_whys_analysis TO d4_five_whys;
-- ALTER TABLE eightd_reports RENAME COLUMN d4_fishbone_analysis TO d4_fishbone_data;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d4_containment_actions;
-- ALTER TABLE eightd_reports RENAME COLUMN d5_temporary_countermeasures TO d5_corrective_actions;
-- ALTER TABLE eightd_reports RENAME COLUMN d6_definitive_countermeasures TO d6_implementation_plan;
-- ALTER TABLE eightd_reports RENAME COLUMN d6_validation_plan TO d6_validation_results;
-- ALTER TABLE eightd_reports RENAME COLUMN d7_confirmation_actions TO d7_preventive_actions;
-- ALTER TABLE eightd_reports RENAME COLUMN d7_confirmation_evidence TO d7_system_improvements;
--
-- ============================================================================
