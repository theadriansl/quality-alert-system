-- ============================================================================
-- Migration: 015_bom_field_config.sql
-- Date: 2026-02-02
-- Description: Global configuration for BOM custom fields
--              System-wide fields that appear in all BOM operations
--              ONLY ADMINS can create/edit/delete field configurations
-- ============================================================================

-- ============================================================================
-- 1. BOM FIELD CONFIGURATION TABLE (GLOBAL - NO CLIENT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bom_field_config (
  id SERIAL PRIMARY KEY,

  -- Field definition
  field_name VARCHAR(100) NOT NULL UNIQUE,    -- Display name (e.g., "ECR Number")
  field_key VARCHAR(100) NOT NULL UNIQUE,     -- Internal key for custom_fields JSON
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',  -- text, number, date, select, boolean

  -- Validation
  is_required BOOLEAN DEFAULT false,
  min_value NUMERIC,                          -- For number type
  max_value NUMERIC,                          -- For number type
  max_length INTEGER,                         -- For text type
  options JSONB,                              -- For select type: ["Option1", "Option2"]
  default_value TEXT,                         -- Default value for new parts

  -- Display
  display_order INTEGER DEFAULT 0,
  description TEXT,                           -- Help text shown in form
  show_in_table BOOLEAN DEFAULT true,         -- Show as column in BOM table
  show_in_form BOOLEAN DEFAULT true,          -- Show in Add/Edit Part form
  show_in_template BOOLEAN DEFAULT true,      -- Include in Excel template

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bom_field_config_active ON bom_field_config(is_active);
CREATE INDEX IF NOT EXISTS idx_bom_field_config_order ON bom_field_config(display_order);

-- ============================================================================
-- 2. TRIGGER FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_bom_field_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bom_field_config_timestamp ON bom_field_config;
CREATE TRIGGER trigger_bom_field_config_timestamp
BEFORE UPDATE ON bom_field_config
FOR EACH ROW
EXECUTE FUNCTION update_bom_field_config_timestamp();

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================
COMMENT ON TABLE bom_field_config IS 'Configuracion global de campos personalizados del BOM';
COMMENT ON COLUMN bom_field_config.field_name IS 'Nombre visible del campo (ej: ECR Number)';
COMMENT ON COLUMN bom_field_config.field_key IS 'Clave interna usada en custom_fields JSON';
COMMENT ON COLUMN bom_field_config.field_type IS 'Tipo: text, number, date, select, boolean';
COMMENT ON COLUMN bom_field_config.options IS 'Para select: ["Opcion1", "Opcion2"]';
COMMENT ON COLUMN bom_field_config.show_in_table IS 'Mostrar como columna en tabla BOM';
COMMENT ON COLUMN bom_field_config.show_in_form IS 'Mostrar en formulario de partes';
COMMENT ON COLUMN bom_field_config.show_in_template IS 'Incluir en plantilla Excel';
