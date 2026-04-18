-- ============================================================================
-- Migration: 014_defect_stations_suppliers.sql
-- Date: 2026-02-02
-- Description: Add Suppliers catalog and link stations/suppliers to BOM parts
--              for tablet-friendly defect capture
-- ============================================================================

-- ============================================================================
-- 1. ADD SUPPLIER CATALOG TYPE
-- ============================================================================
INSERT INTO defect_catalog_types (code, name, description, display_order) VALUES
  ('SUPPLIER', 'Proveedor', 'Proveedor de la parte/componente', 9)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. ADD bom_level AND supplier_id TO client_parts (BOM Global)
-- ============================================================================
ALTER TABLE client_parts
ADD COLUMN IF NOT EXISTS bom_level INTEGER DEFAULT 1 CHECK (bom_level >= 1 AND bom_level <= 10);

ALTER TABLE client_parts
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_parts_supplier ON client_parts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_client_parts_bom_level ON client_parts(bom_level);

COMMENT ON COLUMN client_parts.bom_level IS 'Nivel de BOM (1-10) para jerarquia de ensamble';
COMMENT ON COLUMN client_parts.supplier_id IS 'Proveedor de la parte (referencia a defect_catalog_items tipo SUPPLIER)';

-- ============================================================================
-- 3. STATION_PARTS - Link capture stations to BOM parts
-- ============================================================================
CREATE TABLE IF NOT EXISTS station_parts (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES defect_catalog_items(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(station_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_station_parts_station ON station_parts(station_id);
CREATE INDEX IF NOT EXISTS idx_station_parts_part ON station_parts(part_id);

COMMENT ON TABLE station_parts IS 'Relacion entre estaciones de captura y partes del BOM. Define que partes se muestran en cada estacion.';

-- ============================================================================
-- 4. STATION_SUPPLIERS - Link capture stations to suppliers (what suppliers are inspected at each station)
-- ============================================================================
CREATE TABLE IF NOT EXISTS station_suppliers (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES defect_catalog_items(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES defect_catalog_items(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(station_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_station_suppliers_station ON station_suppliers(station_id);
CREATE INDEX IF NOT EXISTS idx_station_suppliers_supplier ON station_suppliers(supplier_id);

COMMENT ON TABLE station_suppliers IS 'Relacion entre estaciones de captura y proveedores. Define que proveedores se inspeccionan en cada estacion.';

-- ============================================================================
-- 5. ADD supplier_id TO defect_entries
-- ============================================================================
ALTER TABLE defect_entries
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES defect_catalog_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_defect_entries_supplier ON defect_entries(supplier_id);

COMMENT ON COLUMN defect_entries.supplier_id IS 'Proveedor responsable del defecto';

-- ============================================================================
-- 6. SEED SOME DEFAULT SUPPLIERS (examples)
-- ============================================================================
INSERT INTO defect_catalog_items (catalog_type_id, code, name, display_order)
SELECT ct.id, v.item_code, v.item_name, v.ord FROM defect_catalog_types ct,
(VALUES
  ('SUPPLIER_A', 'Supplier A (Example)', 1),
  ('SUPPLIER_B', 'Supplier B (Example)', 2),
  ('SUPPLIER_C', 'Supplier C (Example)', 3),
  ('INTERNAL', 'Internal / In-House', 4)
) AS v(item_code, item_name, ord)
WHERE ct.code = 'SUPPLIER'
ON CONFLICT (catalog_type_id, code) DO NOTHING;

-- ============================================================================
-- 7. ADD part_id to defect_entries referencing client_parts (BOM Global)
-- ============================================================================
-- Note: defect_entries.part_id currently references project_parts which is deprecated
-- We add a new column for client_parts

ALTER TABLE defect_entries
ADD COLUMN IF NOT EXISTS bom_part_id INTEGER REFERENCES client_parts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_defect_entries_bom_part ON defect_entries(bom_part_id);

COMMENT ON COLUMN defect_entries.bom_part_id IS 'Parte del BOM Global (client_parts) asociada al defecto';

-- ============================================================================
-- 8. VIEW for station parts with full info
-- ============================================================================
CREATE OR REPLACE VIEW v_station_parts AS
SELECT
  sp.id,
  sp.station_id,
  st.code AS station_code,
  st.name AS station_name,
  sp.part_id,
  cp.part_number,
  cp.part_name,
  cp.client_part_number,
  cp.bom_level,
  cp.supplier_id,
  sup.name AS supplier_name,
  cp.client_id,
  c.name AS client_name,
  cp.project_id,
  p.project_name,
  sp.display_order,
  sp.is_active
FROM station_parts sp
JOIN defect_catalog_items st ON sp.station_id = st.id
JOIN client_parts cp ON sp.part_id = cp.id
LEFT JOIN defect_catalog_items sup ON cp.supplier_id = sup.id
LEFT JOIN clients c ON cp.client_id = c.id
LEFT JOIN projects p ON cp.project_id = p.id
WHERE st.is_active = true;

COMMENT ON VIEW v_station_parts IS 'Vista de partes por estacion con informacion completa del BOM';
