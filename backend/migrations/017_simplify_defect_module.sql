-- ============================================================================
-- Migration: 017_simplify_defect_module.sql
-- Date: 2026-02-04
-- Description: Simplify defect module - Part → Defect Types configuration
-- ============================================================================

-- ============================================================================
-- 1. DEFECT TYPES TABLE (simplified catalog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_defect_types_active ON defect_types(is_active);
CREATE INDEX IF NOT EXISTS idx_defect_types_code ON defect_types(code);

-- ============================================================================
-- 2. PART DEFECT CONFIG (which defects apply to which parts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS part_defect_config (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
  defect_type_id INTEGER NOT NULL REFERENCES defect_types(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(part_id, defect_type_id)
);

CREATE INDEX IF NOT EXISTS idx_part_defect_config_part ON part_defect_config(part_id);
CREATE INDEX IF NOT EXISTS idx_part_defect_config_defect ON part_defect_config(defect_type_id);
CREATE INDEX IF NOT EXISTS idx_part_defect_config_active ON part_defect_config(is_active);

-- ============================================================================
-- 3. DEFECT ENTRIES V2 (simplified)
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_entries_v2 (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) UNIQUE NOT NULL,

  -- Context (from BOM)
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,

  -- Defect type (from simplified catalog)
  defect_type_id INTEGER NOT NULL REFERENCES defect_types(id) ON DELETE CASCADE,

  -- Notes and photos
  notes TEXT,
  photos JSONB DEFAULT '[]',

  -- Quantity
  quantity INTEGER DEFAULT 1,

  -- Capture info
  captured_by_user_id INTEGER NOT NULL REFERENCES users(id),
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  capture_station VARCHAR(100),

  -- Status
  status VARCHAR(50) DEFAULT 'open',
  resolved_at TIMESTAMP,
  resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Quality Alert link
  quality_alert_id INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_part ON defect_entries_v2(part_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_defect_type ON defect_entries_v2(defect_type_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_captured_at ON defect_entries_v2(captured_at);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_status ON defect_entries_v2(status);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_client ON defect_entries_v2(client_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_project ON defect_entries_v2(project_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_defect_entries_v2_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_defect_entries_v2_timestamp ON defect_entries_v2;
CREATE TRIGGER trigger_defect_entries_v2_timestamp
BEFORE UPDATE ON defect_entries_v2
FOR EACH ROW
EXECUTE FUNCTION update_defect_entries_v2_timestamp();

-- Sequence for entry numbers v2
CREATE SEQUENCE IF NOT EXISTS defect_entry_v2_seq START 1;

-- Function to generate entry number
CREATE OR REPLACE FUNCTION generate_defect_entry_v2_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := 'DEF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                        LPAD(nextval('defect_entry_v2_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_defect_entry_v2_number ON defect_entries_v2;
CREATE TRIGGER trigger_defect_entry_v2_number
BEFORE INSERT ON defect_entries_v2
FOR EACH ROW
EXECUTE FUNCTION generate_defect_entry_v2_number();

-- ============================================================================
-- 4. SEED DEFAULT DEFECT TYPES (migrated from old catalog)
-- ============================================================================
INSERT INTO defect_types (code, name, description, color, display_order) VALUES
  ('CLIP_MISSING', 'Clip Missing', 'Clip faltante', '#ef4444', 1),
  ('CLIP_LOOSE', 'Clip Loose', 'Clip flojo o suelto', '#f97316', 2),
  ('LOOSE', 'Loose', 'Componente suelto', '#f59e0b', 3),
  ('DAMAGED', 'Damaged', 'Componente dañado', '#dc2626', 4),
  ('SCRATCH', 'Scratch', 'Rayadura', '#eab308', 5),
  ('DENT', 'Dent', 'Abolladura', '#f59e0b', 6),
  ('DIRTY', 'Dirty', 'Sucio o manchado', '#84cc16', 7),
  ('MISSING', 'Missing', 'Componente faltante', '#ef4444', 8),
  ('INCORRECT_ROUTE', 'Incorrect Route', 'Ruteo incorrecto', '#8b5cf6', 9),
  ('MISALIGNED', 'Misaligned', 'Desalineado', '#6366f1', 10),
  ('WRONG_PART', 'Wrong Part', 'Parte incorrecta', '#dc2626', 11),
  ('BROKEN', 'Broken', 'Roto', '#b91c1c', 12),
  ('CRACK', 'Crack', 'Grieta', '#991b1b', 13),
  ('NOISE', 'Noise', 'Ruido anormal', '#7c3aed', 14),
  ('RATTLE', 'Rattle', 'Vibración/Cascabeleo', '#8b5cf6', 15),
  ('SQUEAK', 'Squeak', 'Rechinido', '#a855f7', 16),
  ('WATER_LEAK', 'Water Leak', 'Fuga de agua', '#0ea5e9', 17),
  ('CONNECTOR_LOOSE', 'Connector Loose', 'Conector suelto', '#f97316', 18),
  ('CONNECTOR_DAMAGED', 'Connector Damaged', 'Conector dañado', '#dc2626', 19),
  ('UNPLUGGED', 'Unplugged', 'Desconectado', '#ef4444', 20),
  ('MALADJUSTED', 'Maladjusted', 'Mal ajustado', '#f59e0b', 21),
  ('WAX_STAIN', 'Wax Stain', 'Mancha de cera', '#a3e635', 22),
  ('WRONG_PLACED', 'Wrong Placed', 'Mal colocado', '#fb923c', 23),
  ('OTHER', 'Other', 'Otro defecto', '#6b7280', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================
COMMENT ON TABLE defect_types IS 'Catálogo simplificado de tipos de defecto';
COMMENT ON TABLE part_defect_config IS 'Configuración: qué defectos aplican a cada parte';
COMMENT ON TABLE defect_entries_v2 IS 'Registros de defectos capturados (versión simplificada)';

COMMENT ON COLUMN part_defect_config.part_id IS 'FK a client_parts (BOM)';
COMMENT ON COLUMN part_defect_config.defect_type_id IS 'FK a defect_types';
COMMENT ON COLUMN defect_entries_v2.notes IS 'Comentario adicional del inspector';
COMMENT ON COLUMN defect_entries_v2.photos IS 'Array JSON de fotos [{id, filename, uploadedAt}]';
