-- ============================================================================
-- MIGRACIÓN: Agregar Email Corporativo a Clientes
-- Fecha: 27 de Noviembre de 2025
-- ============================================================================
--
-- Agrega campo de email corporativo a la tabla clients
-- ============================================================================

-- Agregar columna email
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Agregar comentario
COMMENT ON COLUMN clients.email
  IS 'Email corporativo principal del cliente';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la columna se agregó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
      AND column_name = 'email'
  ) THEN
    RAISE NOTICE '✅ Columna email agregada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Columna email no se agregó correctamente';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (en caso de necesitar revertir)
-- ============================================================================
--
-- Para revertir esta migración, ejecutar:
--
-- ALTER TABLE clients DROP COLUMN IF EXISTS email;
--
-- ============================================================================
