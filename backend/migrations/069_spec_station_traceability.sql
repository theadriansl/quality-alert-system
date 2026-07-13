-- ============================================================================
-- Migration: 069_spec_station_traceability.sql
-- Date: 2026-04-27
-- Description: Sistema de especificaciones, configuración de estaciones y trazabilidad
-- ============================================================================

-- ============================================================================
-- 1. MEASUREMENT UNITS (Catálogo de unidades de medida)
-- ============================================================================
CREATE TABLE IF NOT EXISTS measurement_units (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,        -- LENGTH, MASS, TIME, PRESSURE, CURRENT, VOLTAGE, TEMPERATURE, FORCE, TORQUE, OTHER
  name VARCHAR(100) NOT NULL,           -- "Milímetros", "Kilogramos", etc.
  symbol VARCHAR(20) NOT NULL,          -- "mm", "kg", "A", "V", "PSI", etc.
  is_default BOOLEAN DEFAULT false,     -- Default unit for category
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed common measurement units
INSERT INTO measurement_units (category, name, symbol, is_default, display_order) VALUES
  -- LENGTH
  ('LENGTH', 'Milímetros', 'mm', true, 1),
  ('LENGTH', 'Centímetros', 'cm', false, 2),
  ('LENGTH', 'Metros', 'm', false, 3),
  ('LENGTH', 'Pulgadas', 'in', false, 4),
  ('LENGTH', 'Pies', 'ft', false, 5),
  -- MASS
  ('MASS', 'Gramos', 'g', false, 1),
  ('MASS', 'Kilogramos', 'kg', true, 2),
  ('MASS', 'Libras', 'lb', false, 3),
  ('MASS', 'Onzas', 'oz', false, 4),
  -- TIME
  ('TIME', 'Segundos', 's', true, 1),
  ('TIME', 'Minutos', 'min', false, 2),
  ('TIME', 'Horas', 'h', false, 3),
  -- PRESSURE
  ('PRESSURE', 'PSI', 'PSI', true, 1),
  ('PRESSURE', 'Bar', 'bar', false, 2),
  ('PRESSURE', 'Pascales', 'Pa', false, 3),
  ('PRESSURE', 'kPa', 'kPa', false, 4),
  -- CURRENT
  ('CURRENT', 'Amperios', 'A', true, 1),
  ('CURRENT', 'Miliamperios', 'mA', false, 2),
  -- VOLTAGE
  ('VOLTAGE', 'Voltios', 'V', true, 1),
  ('VOLTAGE', 'Milivoltios', 'mV', false, 2),
  -- TEMPERATURE
  ('TEMPERATURE', 'Celsius', '°C', true, 1),
  ('TEMPERATURE', 'Fahrenheit', '°F', false, 2),
  ('TEMPERATURE', 'Kelvin', 'K', false, 3),
  -- FORCE
  ('FORCE', 'Newtons', 'N', true, 1),
  ('FORCE', 'Kilonewtons', 'kN', false, 2),
  ('FORCE', 'Libras-fuerza', 'lbf', false, 3),
  -- TORQUE
  ('TORQUE', 'Newton-metro', 'Nm', true, 1),
  ('TORQUE', 'Kilogramo-metro', 'kgm', false, 2),
  ('TORQUE', 'Libra-pie', 'lb-ft', false, 3),
  ('TORQUE', 'Libra-pulgada', 'lb-in', false, 4),
  -- ANGLE
  ('ANGLE', 'Grados', '°', true, 1),
  ('ANGLE', 'Radianes', 'rad', false, 2),
  -- FREQUENCY
  ('FREQUENCY', 'Hertz', 'Hz', true, 1),
  ('FREQUENCY', 'RPM', 'RPM', false, 2),
  -- OTHER
  ('OTHER', 'Porcentaje', '%', false, 1),
  ('OTHER', 'Partes por millón', 'ppm', false, 2),
  ('OTHER', 'Unidades', 'u', false, 3)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_measurement_units_category ON measurement_units(category);
CREATE INDEX IF NOT EXISTS idx_measurement_units_symbol ON measurement_units(symbol);

-- ============================================================================
-- 2. PART SPECIFICATIONS (Catálogo de especificaciones por parte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS part_specifications (
  id SERIAL PRIMARY KEY,

  -- Relación con parte
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id),

  -- Identificación
  spec_number VARCHAR(50) NOT NULL,           -- "SPEC-001", "DIM-001", "BOM-001"
  spec_name VARCHAR(255) NOT NULL,            -- "Diámetro exterior", "Torque de cierre"
  spec_type VARCHAR(50) NOT NULL,             -- QUALITATIVE | DIMENSIONAL | BOM_COMPONENT

  -- Para DIMENSIONAL: Límites de control
  lower_limit DECIMAL(15,6),                  -- Límite Inferior (LI)
  nominal_value DECIMAL(15,6),                -- Valor Nominal (Media)
  upper_limit DECIMAL(15,6),                  -- Límite Superior (LS)
  unit_id INTEGER REFERENCES measurement_units(id),

  -- Para QUALITATIVE: Valores aceptables
  acceptable_values TEXT,                     -- "OK,PASS,GOOD" o descripción

  -- Para BOM_COMPONENT: Referencia a subparte
  bom_part_id INTEGER REFERENCES client_parts(id),  -- Componente del BOM

  -- Configuración de inspección
  is_critical BOOLEAN DEFAULT false,          -- CTQ/CTC (Critical To Quality)
  requires_measurement BOOLEAN DEFAULT false, -- ¿Capturar valor medido?
  inspection_method TEXT,                     -- "Calibrador digital", "Visual", "Torquímetro"
  inspection_frequency VARCHAR(50),           -- "100%", "Muestreo", "AQL 1.0"
  sample_size INTEGER,                        -- Tamaño de muestra si aplica

  -- Fotos de referencia
  photo_ok_url TEXT,                          -- Foto referencia OK
  photo_nok_url TEXT,                         -- Foto referencia NOK (opcional)
  reference_photo_url TEXT,                   -- Foto de referencia general (qué medir/verificar)

  -- Documentación
  drawing_ref VARCHAR(100),                   -- "DWG-001 Det. A"
  notes TEXT,

  -- QAR Trigger (configurable)
  qar_trigger_enabled BOOLEAN DEFAULT false,
  qar_trigger_count INTEGER DEFAULT 3,
  qar_trigger_hours INTEGER DEFAULT 8,

  -- Control
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part_specs_part ON part_specifications(part_id);
CREATE INDEX IF NOT EXISTS idx_part_specs_client ON part_specifications(client_id);
CREATE INDEX IF NOT EXISTS idx_part_specs_type ON part_specifications(spec_type);
CREATE INDEX IF NOT EXISTS idx_part_specs_critical ON part_specifications(is_critical);
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_specs_number ON part_specifications(part_id, spec_number);

-- ============================================================================
-- 3. STATION PART CONFIG (Qué partes se checan en cada estación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS station_part_config (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES inspection_stations(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,

  -- Configuración
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Auditoría
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(station_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_station_part_config_station ON station_part_config(station_id);
CREATE INDEX IF NOT EXISTS idx_station_part_config_part ON station_part_config(part_id);

-- ============================================================================
-- 4. STATION INSPECTION ITEMS (Qué specs/defectos se checan por estación+parte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS station_inspection_items (
  id SERIAL PRIMARY KEY,
  station_part_config_id INTEGER NOT NULL REFERENCES station_part_config(id) ON DELETE CASCADE,

  -- Puede ser spec o defect type
  item_type VARCHAR(20) NOT NULL,             -- 'SPEC' | 'DEFECT'
  spec_id INTEGER REFERENCES part_specifications(id) ON DELETE CASCADE,
  defect_type_id INTEGER REFERENCES defect_types(id) ON DELETE CASCADE,

  -- Configuración
  is_required BOOLEAN DEFAULT false,          -- ¿Obligatorio en esta estación?
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: debe tener spec_id O defect_type_id, no ambos
  CONSTRAINT chk_item_type CHECK (
    (item_type = 'SPEC' AND spec_id IS NOT NULL AND defect_type_id IS NULL) OR
    (item_type = 'DEFECT' AND defect_type_id IS NOT NULL AND spec_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_station_items_config ON station_inspection_items(station_part_config_id);
CREATE INDEX IF NOT EXISTS idx_station_items_spec ON station_inspection_items(spec_id);
CREATE INDEX IF NOT EXISTS idx_station_items_defect ON station_inspection_items(defect_type_id);

-- ============================================================================
-- 5. UNIT REGISTRY (Registro central de seriales/lotes - Trazabilidad)
-- ============================================================================
CREATE TABLE IF NOT EXISTS unit_registry (
  id SERIAL PRIMARY KEY,

  -- Identificación
  serial_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),                    -- Opcional, lote al que pertenece

  -- Contexto
  client_id INTEGER NOT NULL REFERENCES clients(id),
  part_id INTEGER NOT NULL REFERENCES client_parts(id),
  project_id INTEGER REFERENCES projects(id),

  -- Estado actual
  current_status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
  -- REGISTERED | INSPECTING | OK | DEFECTIVE | IN_REPAIR | REPAIRED |
  -- PENDING_REINSPECTION | RELEASED | SCRAPPED | SHIPPED

  -- Contadores (denormalizados para consulta rápida)
  total_inspections INTEGER DEFAULT 0,
  total_defects INTEGER DEFAULT 0,
  open_defects INTEGER DEFAULT 0,
  total_repairs INTEGER DEFAULT 0,
  specs_ok INTEGER DEFAULT 0,
  specs_nok INTEGER DEFAULT 0,

  -- Fechas clave
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_inspection_at TIMESTAMP,
  last_inspection_at TIMESTAMP,
  released_at TIMESTAMP,
  shipped_at TIMESTAMP,

  -- Metadata
  created_by INTEGER REFERENCES users(id),

  UNIQUE(client_id, part_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_unit_registry_serial ON unit_registry(serial_number);
CREATE INDEX IF NOT EXISTS idx_unit_registry_lot ON unit_registry(lot_number);
CREATE INDEX IF NOT EXISTS idx_unit_registry_status ON unit_registry(current_status);
CREATE INDEX IF NOT EXISTS idx_unit_registry_part ON unit_registry(part_id);
CREATE INDEX IF NOT EXISTS idx_unit_registry_client ON unit_registry(client_id);

-- ============================================================================
-- 6. UNIT STATION INSPECTIONS (Registro de inspección por estación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS unit_station_inspections (
  id SERIAL PRIMARY KEY,

  -- Referencias
  unit_id INTEGER NOT NULL REFERENCES unit_registry(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES inspection_stations(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),

  -- Inspector
  inspector_id INTEGER NOT NULL REFERENCES users(id),

  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Resultado general de la estación
  result VARCHAR(20),                         -- OK | NOK | PARTIAL | IN_PROGRESS

  -- Contadores de esta inspección
  specs_checked INTEGER DEFAULT 0,
  specs_ok INTEGER DEFAULT 0,
  specs_nok INTEGER DEFAULT 0,
  defects_found INTEGER DEFAULT 0,

  -- Notas
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unit_station_insp_unit ON unit_station_inspections(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_station_insp_station ON unit_station_inspections(station_id);
CREATE INDEX IF NOT EXISTS idx_unit_station_insp_inspector ON unit_station_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_unit_station_insp_date ON unit_station_inspections(started_at);

-- ============================================================================
-- 7. SPEC INSPECTION ENTRIES (Capturas de inspección de specs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS spec_inspection_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) NOT NULL UNIQUE,   -- "SPEC-INS-2026-00001"

  -- Trazabilidad
  unit_id INTEGER REFERENCES unit_registry(id),
  unit_station_inspection_id INTEGER REFERENCES unit_station_inspections(id),
  lot_number VARCHAR(100),
  serial_number VARCHAR(100),

  -- Contexto
  client_id INTEGER NOT NULL REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  part_id INTEGER NOT NULL REFERENCES client_parts(id),
  spec_id INTEGER NOT NULL REFERENCES part_specifications(id),

  -- Inspección
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id INTEGER NOT NULL REFERENCES users(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),
  station_id INTEGER REFERENCES inspection_stations(id),
  stage_id INTEGER REFERENCES inspection_stages(id),
  department_id INTEGER REFERENCES departments(id),

  -- Resultado
  result VARCHAR(20) NOT NULL,                -- OK | NOK | CONDITIONAL | NA

  -- Para DIMENSIONAL: Valor medido
  measured_value DECIMAL(15,6),               -- Valor real medido
  deviation DECIMAL(15,6),                    -- Desviación del nominal (calculado)
  within_tolerance BOOLEAN,                   -- ¿Dentro de tolerancia? (calculado)

  -- Para QUALITATIVE: Valor capturado
  qualitative_value VARCHAR(255),             -- Valor cualitativo capturado

  -- Disposición (si NOK)
  disposition_id INTEGER REFERENCES inspection_dispositions(id),
  disposition_notes TEXT,

  -- Evidencia
  photo_evidence TEXT,
  notes TEXT,

  -- QAR tracking
  qar_triggered BOOLEAN DEFAULT false,
  qar_id INTEGER REFERENCES quality_alerts(id),

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spec_entries_unit ON spec_inspection_entries(unit_id);
CREATE INDEX IF NOT EXISTS idx_spec_entries_client ON spec_inspection_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_spec_entries_part ON spec_inspection_entries(part_id);
CREATE INDEX IF NOT EXISTS idx_spec_entries_spec ON spec_inspection_entries(spec_id);
CREATE INDEX IF NOT EXISTS idx_spec_entries_date ON spec_inspection_entries(inspection_date);
CREATE INDEX IF NOT EXISTS idx_spec_entries_result ON spec_inspection_entries(result);
CREATE INDEX IF NOT EXISTS idx_spec_entries_station ON spec_inspection_entries(station_id);

-- Function to generate spec inspection entry number
CREATE OR REPLACE FUNCTION generate_spec_entry_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_number FROM 'SPEC-INS-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM spec_inspection_entries
  WHERE entry_number LIKE 'SPEC-INS-' || year_part || '-%';

  new_number := 'SPEC-INS-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. UNIT HISTORY (Historial completo por serial - Auditoría)
-- ============================================================================
CREATE TABLE IF NOT EXISTS unit_history (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit_registry(id) ON DELETE CASCADE,

  -- Evento
  event_type VARCHAR(50) NOT NULL,
  -- REGISTERED | STATION_START | STATION_COMPLETE | SPEC_OK | SPEC_NOK |
  -- DEFECT_FOUND | REPAIR_STARTED | REPAIR_COMPLETED | REINSPECTION |
  -- RELEASED | SCRAPPED | SHIPPED | STATUS_CHANGE | NOTE

  -- Referencia al registro fuente
  source_table VARCHAR(50),                   -- 'spec_inspection_entries', 'defect_entries_v2', 'unit_repairs', etc.
  source_id INTEGER,                          -- ID en la tabla fuente

  -- Detalle del evento
  description TEXT NOT NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30),

  -- Contexto
  station_id INTEGER REFERENCES inspection_stations(id),
  performed_by INTEGER REFERENCES users(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),

  -- Metadata
  metadata JSONB,                             -- Datos adicionales del evento

  -- Timestamps
  event_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unit_history_unit ON unit_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_type ON unit_history(event_type);
CREATE INDEX IF NOT EXISTS idx_unit_history_date ON unit_history(event_at);
CREATE INDEX IF NOT EXISTS idx_unit_history_station ON unit_history(station_id);

-- ============================================================================
-- 9. ADD FIELDS TO EXISTING TABLES
-- ============================================================================

-- Add serial_number and unit_id to defect_entries_v2
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unit_registry(id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_serial ON defect_entries_v2(serial_number);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_unit ON defect_entries_v2(unit_id);

-- Add inspection_config to client_parts
ALTER TABLE client_parts ADD COLUMN IF NOT EXISTS inspection_config JSONB DEFAULT '{
  "tracking_type": "LOT",
  "lot_required": false,
  "lot_persistent": true,
  "serial_required": false,
  "serial_source": "manual",
  "qr_includes_lot": false,
  "qr_includes_serial": false
}'::jsonb;

COMMENT ON COLUMN client_parts.inspection_config IS 'Configuración de trazabilidad: tracking_type (LOT|SERIAL|LOT_SERIAL|NONE), requisitos de lote/serial';

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================
COMMENT ON TABLE measurement_units IS 'Catálogo de unidades de medida para especificaciones dimensionales';
COMMENT ON TABLE part_specifications IS 'Especificaciones por parte: dimensionales, cualitativas y componentes BOM';
COMMENT ON TABLE station_part_config IS 'Configuración de qué partes se inspeccionan en cada estación';
COMMENT ON TABLE station_inspection_items IS 'Items específicos (specs/defectos) a inspeccionar por estación+parte';
COMMENT ON TABLE unit_registry IS 'Registro central de unidades/seriales para trazabilidad';
COMMENT ON TABLE unit_station_inspections IS 'Registro de cada inspección por estación con timestamp e inspector';
COMMENT ON TABLE spec_inspection_entries IS 'Capturas individuales de inspección de especificaciones';
COMMENT ON TABLE unit_history IS 'Historial completo de eventos por serial/unidad';

SELECT 'Migration 069_spec_station_traceability.sql completed successfully' as status;
