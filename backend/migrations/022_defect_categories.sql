-- ============================================================================
-- Migration: 022_defect_categories.sql
-- Date: 2026-02-05
-- Description: Create defect_categories table, link defect_types to categories,
--              drop defect_shortcuts table
-- ============================================================================

-- ============================================================================
-- 1. CREATE DEFECT CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6b7280',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_defect_categories_active ON defect_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_defect_categories_code ON defect_categories(code);

-- ============================================================================
-- 2. ADD category_id TO defect_types (nullable first for migration)
-- ============================================================================
ALTER TABLE defect_types ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES defect_categories(id);

-- ============================================================================
-- 3. SEED CATEGORIES
-- ============================================================================
INSERT INTO defect_categories (code, name, description, color, display_order) VALUES
  ('APPEARANCE', 'Apariencia', 'Defectos visuales y estéticos', '#f59e0b', 1),
  ('FUNCTIONAL', 'Funcional', 'Defectos que afectan funcionamiento', '#ef4444', 2),
  ('CLIPS_FASTENERS', 'Clips/Sujetadores', 'Clips, tornillos y sujetadores', '#f97316', 3),
  ('ELECTRICAL', 'Eléctrico', 'Defectos eléctricos y conectores', '#8b5cf6', 4),
  ('ASSEMBLY', 'Ensamble', 'Defectos de ensamble y alineación', '#3b82f6', 5),
  ('NVH', 'NVH/Ruido', 'Ruidos, vibraciones y asperezas', '#a855f7', 6),
  ('SEALING', 'Sellado/Fugas', 'Fugas y problemas de sellado', '#0ea5e9', 7),
  ('OTHER', 'Otros', 'Otros tipos de defectos', '#6b7280', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. ASSIGN EXISTING DEFECTS TO CATEGORIES
-- ============================================================================

-- Apariencia
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'APPEARANCE')
WHERE code IN ('SCRATCH', 'DENT', 'DIRTY', 'STAIN', 'DISCOLORATION', 'PAINT_CHIP', 'BURR', 'WAX_STAIN');

-- Funcional
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'FUNCTIONAL')
WHERE code IN ('LOOSE', 'MISSING', 'BROKEN', 'BENT', 'STUCK', 'BINDING', 'INOPERATIVE', 'DAMAGED', 'CRACK', 'MALADJUSTED');

-- Clips/Sujetadores
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'CLIPS_FASTENERS')
WHERE code IN ('CLIP_MISSING', 'CLIP_BROKEN', 'CLIP_LOOSE', 'FASTENER_MISSING', 'FASTENER_LOOSE', 'FASTENER_STRIPPED');

-- Eléctrico
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'ELECTRICAL')
WHERE code IN ('CONNECTOR_LOOSE', 'CONNECTOR_DAMAGED', 'WIRE_EXPOSED', 'WIRE_PINCHED', 'SHORT_CIRCUIT', 'NO_POWER', 'UNPLUGGED');

-- Ensamble
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'ASSEMBLY')
WHERE code IN ('MISALIGNED', 'GAP_EXCESSIVE', 'GAP_INSUFFICIENT', 'INTERFERENCE', 'WRONG_PART', 'REVERSED', 'INCORRECT_ROUTE', 'WRONG_PLACED');

-- NVH/Ruido
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'NVH')
WHERE code IN ('RATTLE', 'SQUEAK', 'BUZZ', 'WIND_NOISE', 'VIBRATION', 'NOISE');

-- Sellado/Fugas
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'SEALING')
WHERE code IN ('WATER_LEAK', 'AIR_LEAK', 'SEAL_DAMAGED', 'SEAL_MISSING');

-- Otros (todos los que no tienen categoría asignada)
UPDATE defect_types SET category_id = (SELECT id FROM defect_categories WHERE code = 'OTHER')
WHERE category_id IS NULL;

-- ============================================================================
-- 5. MAKE category_id NOT NULL (after all defects have a category)
-- ============================================================================
ALTER TABLE defect_types ALTER COLUMN category_id SET NOT NULL;

-- ============================================================================
-- 6. DROP DEFECT_SHORTCUTS TABLE
-- ============================================================================
DROP TABLE IF EXISTS defect_shortcuts;

-- ============================================================================
-- 7. CREATE INDEX FOR category_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_defect_types_category ON defect_types(category_id);

-- ============================================================================
-- 8. ADD TRIGGER FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_defect_categories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_defect_categories_timestamp ON defect_categories;
CREATE TRIGGER trigger_defect_categories_timestamp
BEFORE UPDATE ON defect_categories
FOR EACH ROW
EXECUTE FUNCTION update_defect_categories_timestamp();

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================
COMMENT ON TABLE defect_categories IS 'Categorías de defectos para agrupar tipos de defecto';
COMMENT ON COLUMN defect_types.category_id IS 'FK a defect_categories - cada defecto debe pertenecer a una categoría';
