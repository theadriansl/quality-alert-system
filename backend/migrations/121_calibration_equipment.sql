-- ============================================================================
-- Migration: 121_calibration_equipment.sql
-- Date: 2026-08-15
-- Description: Modulo de Equipos de Calibracion para cumplimiento ISO/IATF
-- ISO 9001:2015 §7.1.5.2 + IATF 16949 §7.1.5.2.1
-- ============================================================================

-- Tabla principal de equipos de calibracion
CREATE TABLE IF NOT EXISTS calibration_equipment (
  id SERIAL PRIMARY KEY,

  -- Identificacion
  code VARCHAR(50) NOT NULL UNIQUE,           -- CAL-001, GAGE-015, CMM-001
  name VARCHAR(255) NOT NULL,                 -- Nombre descriptivo
  description TEXT,                           -- Descripcion detallada

  -- Datos del equipo
  brand VARCHAR(100),                         -- Marca
  model VARCHAR(100),                         -- Modelo
  serial_number VARCHAR(100),                 -- Numero de serie
  equipment_type VARCHAR(50),                 -- CALIPER, MICROMETER, GAGE, CMM, TORQUE_WRENCH, etc.

  -- Calibracion
  last_calibration_date DATE,                 -- Fecha ultima calibracion
  calibration_due_date DATE,                  -- Fecha vencimiento
  calibration_interval_days INTEGER DEFAULT 365,  -- Intervalo en dias
  calibration_provider VARCHAR(255),          -- Proveedor de calibracion
  certificate_number VARCHAR(100),            -- Numero de certificado
  certificate_url TEXT,                       -- URL/Path al certificado PDF

  -- Estado
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, CALIBRATING, EXPIRED, OUT_OF_SERVICE, SCRAPPED

  -- Ubicacion y asignacion
  location VARCHAR(255),                      -- Ubicacion fisica
  assigned_department_id INTEGER REFERENCES departments(id),
  responsible_user_id INTEGER REFERENCES users(id),

  -- Rango y precision (para registros MSA)
  measurement_range VARCHAR(100),             -- Ej: "0-150mm", "0-25mm"
  resolution VARCHAR(50),                     -- Ej: "0.01mm", "0.001mm"
  accuracy VARCHAR(50),                       -- Ej: "±0.02mm"

  -- Costo (opcional, para control financiero)
  acquisition_cost DECIMAL(12,2),
  acquisition_date DATE,

  -- Notas
  notes TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_calibration_equipment_code ON calibration_equipment(code);
CREATE INDEX IF NOT EXISTS idx_calibration_equipment_status ON calibration_equipment(status);
CREATE INDEX IF NOT EXISTS idx_calibration_equipment_due_date ON calibration_equipment(calibration_due_date);
CREATE INDEX IF NOT EXISTS idx_calibration_equipment_type ON calibration_equipment(equipment_type);

-- Tabla de asignacion equipo-estacion (muchos a muchos)
CREATE TABLE IF NOT EXISTS equipment_station_assignment (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES calibration_equipment(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES inspection_stations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,           -- Estacion principal del equipo
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(equipment_id, station_id)
);

CREATE INDEX IF NOT EXISTS idx_equip_station_equipment ON equipment_station_assignment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_station_station ON equipment_station_assignment(station_id);

-- Historial de calibraciones
CREATE TABLE IF NOT EXISTS calibration_history (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES calibration_equipment(id) ON DELETE CASCADE,

  calibration_date DATE NOT NULL,
  due_date DATE NOT NULL,
  provider VARCHAR(255),
  certificate_number VARCHAR(100),
  certificate_url TEXT,

  -- Resultado
  result VARCHAR(20) NOT NULL,                -- PASS, FAIL, ADJUSTED
  deviation_found TEXT,                       -- Desviacion encontrada
  adjustment_made TEXT,                       -- Ajuste realizado

  -- Costos
  cost DECIMAL(12,2),

  notes TEXT,
  performed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calibration_history_equipment ON calibration_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_calibration_history_date ON calibration_history(calibration_date);

-- Tipos de equipo predefinidos
CREATE TABLE IF NOT EXISTS equipment_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),                       -- DIMENSIONAL, ELECTRICAL, TORQUE, PRESSURE, TEMPERATURE, OTHER
  requires_calibration BOOLEAN DEFAULT true,
  default_interval_days INTEGER DEFAULT 365,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Seed tipos de equipo comunes
INSERT INTO equipment_types (code, name, category, default_interval_days, display_order) VALUES
  ('CALIPER', 'Calibrador Vernier', 'DIMENSIONAL', 365, 1),
  ('MICROMETER', 'Micrómetro', 'DIMENSIONAL', 365, 2),
  ('HEIGHT_GAUGE', 'Medidor de Altura', 'DIMENSIONAL', 365, 3),
  ('DIAL_INDICATOR', 'Indicador de Carátula', 'DIMENSIONAL', 365, 4),
  ('BORE_GAUGE', 'Medidor de Interiores', 'DIMENSIONAL', 365, 5),
  ('THREAD_GAUGE', 'Calibrador de Roscas', 'DIMENSIONAL', 365, 6),
  ('PIN_GAUGE', 'Calibrador de Pines', 'DIMENSIONAL', 365, 7),
  ('RING_GAUGE', 'Calibrador de Anillos', 'DIMENSIONAL', 365, 8),
  ('GO_NOGO', 'Gage Go/NoGo', 'DIMENSIONAL', 365, 9),
  ('CMM', 'Máquina de Medición por Coordenadas', 'DIMENSIONAL', 365, 10),
  ('PROFILE_PROJECTOR', 'Proyector de Perfiles', 'DIMENSIONAL', 365, 11),
  ('TORQUE_WRENCH', 'Torquímetro', 'TORQUE', 180, 20),
  ('TORQUE_ANALYZER', 'Analizador de Torque', 'TORQUE', 365, 21),
  ('MULTIMETER', 'Multímetro', 'ELECTRICAL', 365, 30),
  ('HIPOT_TESTER', 'Probador Hi-Pot', 'ELECTRICAL', 365, 31),
  ('PRESSURE_GAUGE', 'Manómetro', 'PRESSURE', 365, 40),
  ('THERMOMETER', 'Termómetro', 'TEMPERATURE', 365, 50),
  ('SCALE', 'Báscula/Balanza', 'MASS', 365, 60),
  ('FIXTURE', 'Fixture de Verificación', 'OTHER', 730, 70),
  ('TEMPLATE', 'Template/Plantilla', 'OTHER', 730, 71),
  ('OTHER', 'Otro', 'OTHER', 365, 99)
ON CONFLICT (code) DO NOTHING;

-- Vista para equipos con dias restantes y estado
CREATE OR REPLACE VIEW v_equipment_calibration_status AS
SELECT
  ce.*,
  et.name as equipment_type_name,
  et.category as equipment_category,
  d.name as department_name,
  u.first_name || ' ' || u.last_name as responsible_name,
  ce.calibration_due_date - CURRENT_DATE as days_until_due,
  CASE
    WHEN ce.status = 'OUT_OF_SERVICE' THEN 'OUT_OF_SERVICE'
    WHEN ce.status = 'SCRAPPED' THEN 'SCRAPPED'
    WHEN ce.status = 'CALIBRATING' THEN 'CALIBRATING'
    WHEN ce.calibration_due_date IS NULL THEN 'NO_DATE'
    WHEN ce.calibration_due_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN ce.calibration_due_date <= CURRENT_DATE + 30 THEN 'WARNING'
    ELSE 'OK'
  END as calibration_status
FROM calibration_equipment ce
LEFT JOIN equipment_types et ON ce.equipment_type = et.code
LEFT JOIN departments d ON ce.assigned_department_id = d.id
LEFT JOIN users u ON ce.responsible_user_id = u.id
WHERE ce.is_active = true;

-- Comentarios
COMMENT ON TABLE calibration_equipment IS 'Equipos de medicion y verificacion sujetos a calibracion (ISO 9001:2015 §7.1.5.2)';
COMMENT ON TABLE calibration_history IS 'Historial de calibraciones realizadas a cada equipo';
COMMENT ON TABLE equipment_types IS 'Catalogo de tipos de equipos de medicion';
COMMENT ON VIEW v_equipment_calibration_status IS 'Vista de equipos con estado de calibracion calculado';

SELECT 'Migration 121_calibration_equipment.sql completed successfully' as status;
