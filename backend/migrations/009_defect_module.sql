-- ============================================================================
-- Migration: 009_defect_module.sql
-- Date: 2026-01-21
-- Description: Create tables for Defect/Initial Concerns module
-- ============================================================================

-- ============================================================================
-- 1. CATALOG TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_catalog_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  allows_custom BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default catalog types
INSERT INTO defect_catalog_types (code, name, description, display_order) VALUES
  ('MAIN_ITEM', 'Item Principal', 'Componente principal del vehículo/producto', 1),
  ('SUB_PART', 'Sub-Parte', 'Sub-componente (depende de MAIN_ITEM)', 2),
  ('LOCATION_1', 'Ubicación 1', 'Ubicación primaria (fila, posición general)', 3),
  ('LOCATION_2', 'Ubicación 2', 'Ubicación secundaria (lado, interior/exterior)', 4),
  ('RANK', 'Categoría', 'Categoría del defecto (funcional, apariencia, etc.)', 5),
  ('DEFECT', 'Tipo de Defecto', 'Tipo específico de defecto encontrado', 6),
  ('PRIORITY', 'Prioridad', 'Severidad/Prioridad del defecto', 7),
  ('CAPTURE_STATION', 'Estación de Captura', 'Punto donde se detectó el defecto', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. CATALOG ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_catalog_items (
  id SERIAL PRIMARY KEY,
  catalog_type_id INTEGER NOT NULL REFERENCES defect_catalog_types(id) ON DELETE CASCADE,
  parent_item_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(catalog_type_id, code)
);

CREATE INDEX IF NOT EXISTS idx_defect_catalog_items_type ON defect_catalog_items(catalog_type_id);
CREATE INDEX IF NOT EXISTS idx_defect_catalog_items_parent ON defect_catalog_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_defect_catalog_items_active ON defect_catalog_items(is_active);

-- ============================================================================
-- 3. SEED DEFAULT CATALOG ITEMS
-- ============================================================================

-- MAIN_ITEM (Item Principal)
INSERT INTO defect_catalog_items (catalog_type_id, code, name, display_order)
SELECT ct.id, v.item_code, v.item_name, v.ord FROM defect_catalog_types ct,
(VALUES
  ('BELT', 'Belt', 1), ('AUDIO', 'Audio', 2), ('BACK_DOOR', 'Back Door', 3),
  ('BRAKE', 'Brake', 4), ('BUMPER', 'Bumper', 5), ('BUMPER_FR', 'Bumper FR', 6),
  ('BUMPER_RR', 'Bumper RR', 7), ('CENTER_CONSOLE', 'Center Console', 8),
  ('CPM', 'CPM', 9), ('DOOR', 'Door', 10), ('ELECTRIC', 'Electric', 11),
  ('ENGINE', 'Engine', 12), ('EXT', 'Exterior', 13), ('FENDER', 'Fender', 14),
  ('FLOOR', 'Floor', 15), ('FUEL', 'Fuel', 16), ('HEAD_LAMP', 'Head Lamp', 17),
  ('HEADLINER', 'Headliner', 18), ('HOOD', 'Hood', 19), ('KEY', 'Key', 20),
  ('LABEL', 'Label', 21), ('LUGGAGE', 'Luggage', 22), ('PILLAR', 'Pillar', 23),
  ('PWT', 'PWT', 24), ('REAR_LAMP', 'Rear Lamp', 25), ('ROOF', 'Roof', 26),
  ('SEAT', 'Seat', 27), ('STEERING', 'Steering', 28), ('TIRE', 'Tire', 29),
  ('UNDER_BODY', 'Under Body', 30), ('WINDSHIELD', 'Windshield', 31)
) AS v(item_code, item_name, ord)
WHERE ct.code = 'MAIN_ITEM'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- SUB_PART for BELT
INSERT INTO defect_catalog_items (catalog_type_id, parent_item_id, code, name, display_order)
SELECT
  (SELECT id FROM defect_catalog_types WHERE code = 'SUB_PART'),
  (SELECT id FROM defect_catalog_items WHERE code = 'BELT' AND catalog_type_id = (SELECT id FROM defect_catalog_types WHERE code = 'MAIN_ITEM')),
  code, name, ord
FROM (VALUES
  ('SEAT_BELT', 'Seat Belt', 1),
  ('SEAT_BELT_ADJUSTER', 'Seat Belt Adjuster', 2),
  ('SEAT_BELT_BUCKLE', 'Seat Belt Buckle', 3),
  ('SEAT_BELT_LATCH', 'Seat Belt Latch', 4)
) AS v(code, name, ord)
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- LOCATION_1
INSERT INTO defect_catalog_items (catalog_type_id, code, name, display_order)
SELECT ct.id, v.item_code, v.item_name, v.ord FROM defect_catalog_types ct,
(VALUES
  ('ALL', 'All', 1), ('1ST_ROW', '1st Row', 2), ('2ND_ROW', '2nd Row', 3),
  ('3RD_ROW', '3rd Row', 4), ('COVER', 'Cover', 5), ('CTR', 'Center', 6),
  ('FL', 'FL', 7), ('FR', 'FR', 8), ('FRONT', 'Front', 9),
  ('LH', 'LH', 10), ('LH_RH', 'LH & RH', 11), ('PILLAR_A', 'Pillar A', 12),
  ('PILLAR_B', 'Pillar B', 13), ('PILLAR_C', 'Pillar C', 14), ('REAR', 'Rear', 15)
) AS v(item_code, item_name, ord)
WHERE ct.code = 'LOCATION_1'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- LOCATION_2
INSERT INTO defect_catalog_items (catalog_type_id, code, name, display_order)
SELECT ct.id, v.item_code, v.item_name, v.ord FROM defect_catalog_types ct,
(VALUES
  ('ALL', 'All', 1), ('CORNER_LH', 'Corner LH', 2), ('CORNER_RH', 'Corner RH', 3),
  ('CTR', 'Center', 4), ('FL', 'FL', 5), ('FR', 'FR', 6),
  ('FRONT', 'Front', 7), ('INNER', 'Inner', 8), ('INT', 'Interior', 9),
  ('LH', 'LH', 10), ('LH_RH', 'LH & RH', 11), ('LOWER', 'Lower', 12),
  ('OUTER', 'Outer', 13), ('UPPER', 'Upper', 14)
) AS v(item_code, item_name, ord)
WHERE ct.code = 'LOCATION_2'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- RANK (Categoría)
INSERT INTO defect_catalog_items (catalog_type_id, code, name, color, display_order)
SELECT ct.id, v.item_code, v.item_name, v.item_color, v.ord FROM defect_catalog_types ct,
(VALUES
  ('BAD_OPERATION', 'Bad Operation', '#ef4444', 1),
  ('APPEARANCE', 'Appearance', '#f59e0b', 2),
  ('DAMAGE', 'Damage', '#dc2626', 3),
  ('ENGINE', 'Engine', '#7c3aed', 4),
  ('FLUSH_GAP', 'Flush & Gap', '#3b82f6', 5),
  ('FUNCTIONAL', 'Functional', '#ef4444', 6),
  ('LEGAL', 'Legal', '#dc2626', 7),
  ('NOISE', 'Noise', '#6366f1', 8),
  ('NVH', 'NVH', '#8b5cf6', 9),
  ('WATER_LEAK', 'Water Leak', '#0ea5e9', 10)
) AS v(item_code, item_name, item_color, ord)
WHERE ct.code = 'RANK'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- DEFECT (Tipo de Defecto)
INSERT INTO defect_catalog_items (catalog_type_id, code, name, display_order)
SELECT ct.id, v.item_code, v.item_name, v.ord FROM defect_catalog_types ct,
(VALUES
  ('CLIP_MISSING', 'Clip Missing', 1), ('CLIP_POPS_UP', 'Clip Pops Up', 2),
  ('CLIP_UNFIXED', 'Clip Unfixed', 3), ('COVER_MISSING', 'Cover Missing', 4),
  ('DAMAGED_CONNECTOR', 'Damaged Connector', 5), ('DIRTY', 'Dirty', 6),
  ('INCORRECT_ROUTE', 'Incorrect Route', 7), ('LOOSE', 'Loose', 8),
  ('LOOSE_CONNECTOR', 'Loose Connector', 9), ('MALADJUSTED', 'Maladjusted', 10),
  ('MISALIGNED', 'Misaligned', 11), ('MISSING', 'Missing', 12),
  ('MISSING_BUTTON', 'Missing Button', 13), ('MISSING_NUT', 'Missing Nut', 14),
  ('POPS_UP', 'Pops Up', 15), ('UNPLUGGED', 'Unplugged', 16),
  ('WAX_STAIN', 'Wax Stain', 17), ('WRONG_PART', 'Wrong Part', 18),
  ('WRONG_PLACED', 'Wrong Placed', 19), ('SCRATCH', 'Scratch', 20),
  ('DENT', 'Dent', 21), ('CRACK', 'Crack', 22), ('BROKEN', 'Broken', 23),
  ('NOISE', 'Noise', 24), ('RATTLE', 'Rattle', 25), ('SQUEAK', 'Squeak', 26)
) AS v(item_code, item_name, ord)
WHERE ct.code = 'DEFECT'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- PRIORITY (Prioridad/Severidad)
INSERT INTO defect_catalog_items (catalog_type_id, code, name, color, icon, display_order)
SELECT ct.id, v.item_code, v.item_name, v.item_color, v.item_icon, v.ord FROM defect_catalog_types ct,
(VALUES
  ('1', 'Prioridad 1', '#22c55e', '1', 1),
  ('2', 'Prioridad 2', '#84cc16', '2', 2),
  ('3', 'Prioridad 3', '#f59e0b', '3', 3),
  ('4', 'Prioridad 4', '#f97316', '4', 4),
  ('K1', 'Critico K-1', '#dc2626', 'K1', 5),
  ('K2', 'Critico K-2', '#dc2626', 'K2', 6),
  ('K3', 'Critico K-3', '#b91c1c', 'K3', 7),
  ('K4', 'Critico K-4', '#991b1b', 'K4', 8)
) AS v(item_code, item_name, item_color, item_icon, ord)
WHERE ct.code = 'PRIORITY'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- CAPTURE_STATION (Estación de Captura) - Ejemplos genéricos
INSERT INTO defect_catalog_items (catalog_type_id, code, name, display_order)
SELECT ct.id, v.item_code, v.item_name, v.ord FROM defect_catalog_types ct,
(VALUES
  ('INCOMING', 'Incoming Inspection', 1),
  ('ASSEMBLY_1', 'Assembly Line 1', 2),
  ('ASSEMBLY_2', 'Assembly Line 2', 3),
  ('QUALITY_GATE', 'Quality Gate', 4),
  ('FINAL_INSPECTION', 'Final Inspection', 5),
  ('SHIPPING', 'Shipping', 6),
  ('CUSTOMER', 'Customer', 7)
) AS v(item_code, item_name, ord)
WHERE ct.code = 'CAPTURE_STATION'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- ============================================================================
-- 4. DEFECT ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) UNIQUE NOT NULL,

  -- Contexto del producto (de BOM existente)
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  part_id INTEGER REFERENCES project_parts(id) ON DELETE SET NULL,

  -- Clasificación del defecto (de catálogos)
  main_item_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  sub_part_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  location_1_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  location_2_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  rank_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  defect_type_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  priority_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,
  capture_station_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL,

  -- Descripción auto-generada
  auto_description TEXT,
  manual_notes TEXT,

  -- Responsables (ligados a users)
  feedback_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  responsible_area VARCHAR(100),

  -- Captura
  captured_by_user_id INTEGER NOT NULL REFERENCES users(id),
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Fotos (JSONB array)
  photos JSONB DEFAULT '[]',

  -- Datos adicionales
  odometer INTEGER,
  quantity INTEGER DEFAULT 1,

  -- Quality Alert vinculado
  quality_alert_id INTEGER,

  -- Estado
  status VARCHAR(50) DEFAULT 'open',
  resolved_at TIMESTAMP,
  resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas y dashboard
CREATE INDEX IF NOT EXISTS idx_defect_entries_client ON defect_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_project ON defect_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_part ON defect_entries(part_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_captured_at ON defect_entries(captured_at);
CREATE INDEX IF NOT EXISTS idx_defect_entries_status ON defect_entries(status);
CREATE INDEX IF NOT EXISTS idx_defect_entries_defect_type ON defect_entries(defect_type_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_main_item ON defect_entries(main_item_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_priority ON defect_entries(priority_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_feedback_to ON defect_entries(feedback_to_user_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_capture_station ON defect_entries(capture_station_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_rank ON defect_entries(rank_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_defect_entries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_defect_entries_timestamp ON defect_entries;
CREATE TRIGGER trigger_defect_entries_timestamp
BEFORE UPDATE ON defect_entries
FOR EACH ROW
EXECUTE FUNCTION update_defect_entries_timestamp();

-- ============================================================================
-- 5. DEFECT CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default config
INSERT INTO defect_config (config_key, config_value, description) VALUES
  ('qa_auto_threshold', '{"enabled": true, "count": 3, "period_days": 7, "group_by": ["defect_type_id", "part_id"]}',
   'Configuración para generación automática de Quality Alert'),
  ('description_format', '{"template": "{MAIN_ITEM}: {SUB_PART} {LOCATION_1} /{LOCATION_2} {DEFECT}", "separator": " "}',
   'Formato para descripción auto-generada del defecto'),
  ('photo_config', '{"max_photos": 5, "max_size_mb": 10, "allowed_types": ["image/jpeg", "image/png", "image/webp"]}',
   'Configuración para fotos de defectos')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 6. SEQUENCE FOR ENTRY NUMBERS
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS defect_entry_number_seq START 1;

-- Function to generate entry number
CREATE OR REPLACE FUNCTION generate_defect_entry_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := 'DEF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                        LPAD(nextval('defect_entry_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_defect_entry_number ON defect_entries;
CREATE TRIGGER trigger_defect_entry_number
BEFORE INSERT ON defect_entries
FOR EACH ROW
EXECUTE FUNCTION generate_defect_entry_number();

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================
COMMENT ON TABLE defect_catalog_types IS 'Tipos de catálogo para el módulo de defectos';
COMMENT ON TABLE defect_catalog_items IS 'Items de cada catálogo (MAIN_ITEM, DEFECT, etc.)';
COMMENT ON TABLE defect_entries IS 'Registros de defectos capturados';
COMMENT ON TABLE defect_config IS 'Configuración del módulo de defectos';

COMMENT ON COLUMN defect_catalog_items.parent_item_id IS 'Para relaciones jerárquicas (ej: SUB_PART depende de MAIN_ITEM)';
COMMENT ON COLUMN defect_entries.auto_description IS 'Descripción generada automáticamente de las selecciones';
COMMENT ON COLUMN defect_entries.photos IS 'Array JSON de fotos [{id, filename, url, uploadedAt, uploadedBy}]';
COMMENT ON COLUMN defect_entries.quality_alert_id IS 'ID del Quality Alert generado automáticamente (si aplica)';
