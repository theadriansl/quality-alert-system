-- ============================================================================
-- MIGRACIÓN: Agregar Tiempos de Respuesta para D4 y D5 en Clientes
-- Fecha: 27 de Noviembre de 2025
-- ============================================================================
--
-- Agrega campos para definir tiempos estándar de respuesta por cliente:
-- - d4_response_time_hours: Tiempo para D4 (Contención y Análisis) - Default: 24 horas
-- - d5_response_time_hours: Tiempo para D5-D6-D7 (Contramedidas) - Default: 48 horas
--
-- Estos tiempos son editables y permiten personalizar SLAs por cliente
-- ============================================================================

-- Agregar columna para tiempo de respuesta D4 (default 24 horas)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS d4_response_time_hours INTEGER DEFAULT 24;

-- Agregar columna para tiempo de respuesta D5 (default 48 horas)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS d5_response_time_hours INTEGER DEFAULT 48;

-- Agregar comentarios
COMMENT ON COLUMN clients.d4_response_time_hours
  IS 'Tiempo estándar de respuesta para D4 (Contención y Análisis de Causa Raíz) en horas';

COMMENT ON COLUMN clients.d5_response_time_hours
  IS 'Tiempo estándar de respuesta para D5-D6-D7 (Contramedidas y Confirmación) en horas';

-- Actualizar clientes existentes con valores por defecto si son NULL
UPDATE clients
SET d4_response_time_hours = 24
WHERE d4_response_time_hours IS NULL;

UPDATE clients
SET d5_response_time_hours = 48
WHERE d5_response_time_hours IS NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las columnas se agregaron correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
      AND column_name IN ('d4_response_time_hours', 'd5_response_time_hours')
  ) THEN
    RAISE NOTICE '✅ Columnas de tiempo de respuesta agregadas exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Columnas no se agregaron correctamente';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (en caso de necesitar revertir)
-- ============================================================================
--
-- Para revertir esta migración, ejecutar:
--
-- ALTER TABLE clients DROP COLUMN IF EXISTS d4_response_time_hours;
-- ALTER TABLE clients DROP COLUMN IF EXISTS d5_response_time_hours;
--
-- ============================================================================
