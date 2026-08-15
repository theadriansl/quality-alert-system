-- ============================================================================
-- Migration: 120_spec_measurement_instrument.sql
-- Date: 2026-08-15
-- Description: Agregar campos de instrumento de medicion para cumplimiento ISO/IATF
-- ISO 9001:2015 §7.1.5 + IATF 16949 §7.1.5.1
-- ============================================================================

-- Agregar campos a part_specifications
ALTER TABLE part_specifications
  ADD COLUMN IF NOT EXISTS measurement_instrument TEXT,
  ADD COLUMN IF NOT EXISTS instrument_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS requires_calibration BOOLEAN DEFAULT false;

-- Comentarios para documentacion
COMMENT ON COLUMN part_specifications.measurement_instrument IS 'Instrumento de medicion/verificacion: Calibrador, Micrometro, Gage Go/NoGo, etc.';
COMMENT ON COLUMN part_specifications.instrument_code IS 'Codigo de identificacion del instrumento para trazabilidad y sistema de calibracion';
COMMENT ON COLUMN part_specifications.requires_calibration IS 'Indica si el instrumento requiere certificado de calibracion vigente';

-- Indice para busquedas por codigo de instrumento
CREATE INDEX IF NOT EXISTS idx_part_specs_instrument_code ON part_specifications(instrument_code);

SELECT 'Migration 120_spec_measurement_instrument.sql completed successfully' as status;
