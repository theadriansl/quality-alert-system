-- ============================================================================
-- Migration 167: Convertir tablas de alto volumen a particionadas
-- ============================================================================
-- Convierte las siguientes tablas a particionadas por RANGE mensual:
-- - serial_station_scans (por scanned_at)
-- - production_entries (por produced_at)
-- - spec_inspection_entries (por created_at)
-- ============================================================================

-- ============================================================================
-- 1. SERIAL_STATION_SCANS
-- ============================================================================
DO $$
BEGIN
  -- Verificar si ya está particionada
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'serial_station_scans' AND c.relkind = 'p' AND n.nspname = 'public'
  ) THEN
    -- Renombrar tabla original
    ALTER TABLE IF EXISTS serial_station_scans RENAME TO serial_station_scans_old;

    -- Crear tabla particionada
    CREATE TABLE serial_station_scans (
      id SERIAL,
      serial_number VARCHAR(100) NOT NULL,
      station_id INTEGER NOT NULL,
      part_id INTEGER,
      shift_id INTEGER,
      work_order VARCHAR(100),
      has_defect BOOLEAN DEFAULT FALSE,
      defect_count INTEGER DEFAULT 0,
      user_id INTEGER NOT NULL,
      scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, scanned_at)
    ) PARTITION BY RANGE (scanned_at);

    -- Crear partición default para datos históricos
    CREATE TABLE serial_station_scans_default PARTITION OF serial_station_scans DEFAULT;

    -- Crear particiones desde Oct 2025 hasta Dic 2027
    CREATE TABLE serial_station_scans_2025_10 PARTITION OF serial_station_scans FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
    CREATE TABLE serial_station_scans_2025_11 PARTITION OF serial_station_scans FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
    CREATE TABLE serial_station_scans_2025_12 PARTITION OF serial_station_scans FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
    CREATE TABLE serial_station_scans_2026_01 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    CREATE TABLE serial_station_scans_2026_02 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
    CREATE TABLE serial_station_scans_2026_03 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
    CREATE TABLE serial_station_scans_2026_04 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
    CREATE TABLE serial_station_scans_2026_05 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
    CREATE TABLE serial_station_scans_2026_06 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
    CREATE TABLE serial_station_scans_2026_07 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    CREATE TABLE serial_station_scans_2026_08 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE serial_station_scans_2026_09 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE serial_station_scans_2026_10 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    CREATE TABLE serial_station_scans_2026_11 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
    CREATE TABLE serial_station_scans_2026_12 PARTITION OF serial_station_scans FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
    CREATE TABLE serial_station_scans_2027_01 PARTITION OF serial_station_scans FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
    CREATE TABLE serial_station_scans_2027_06 PARTITION OF serial_station_scans FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
    CREATE TABLE serial_station_scans_2027_12 PARTITION OF serial_station_scans FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

    -- Migrar datos
    INSERT INTO serial_station_scans SELECT * FROM serial_station_scans_old;

    -- Crear índices
    CREATE INDEX idx_sss_serial ON serial_station_scans(serial_number);
    CREATE INDEX idx_sss_station ON serial_station_scans(station_id);
    CREATE INDEX idx_sss_scanned_at ON serial_station_scans(scanned_at);

    -- Eliminar tabla old (comentado por seguridad, descomentar después de verificar)
    -- DROP TABLE serial_station_scans_old;

    RAISE NOTICE 'serial_station_scans: Convertida a particionada';
  ELSE
    RAISE NOTICE 'serial_station_scans: Ya está particionada';
  END IF;
END $$;

-- ============================================================================
-- 2. PRODUCTION_ENTRIES
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'production_entries' AND c.relkind = 'p' AND n.nspname = 'public'
  ) THEN
    -- Renombrar tabla original
    ALTER TABLE IF EXISTS production_entries RENAME TO production_entries_old;

    -- Crear tabla particionada (necesitamos la estructura exacta)
    CREATE TABLE production_entries (
      id SERIAL,
      part_id INTEGER,
      serial_number VARCHAR(100),
      lot_number VARCHAR(100),
      work_order VARCHAR(100),
      quantity INTEGER DEFAULT 1,
      station_id INTEGER,
      shift_id INTEGER,
      user_id INTEGER,
      status VARCHAR(50) DEFAULT 'PRODUCED',
      produced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      inspected_at TIMESTAMP,
      notes TEXT,
      PRIMARY KEY (id, produced_at)
    ) PARTITION BY RANGE (produced_at);

    -- Partición default
    CREATE TABLE production_entries_default PARTITION OF production_entries DEFAULT;

    -- Crear particiones
    CREATE TABLE production_entries_2025_10 PARTITION OF production_entries FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
    CREATE TABLE production_entries_2025_11 PARTITION OF production_entries FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
    CREATE TABLE production_entries_2025_12 PARTITION OF production_entries FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
    CREATE TABLE production_entries_2026_01 PARTITION OF production_entries FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    CREATE TABLE production_entries_2026_02 PARTITION OF production_entries FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
    CREATE TABLE production_entries_2026_03 PARTITION OF production_entries FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
    CREATE TABLE production_entries_2026_04 PARTITION OF production_entries FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
    CREATE TABLE production_entries_2026_05 PARTITION OF production_entries FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
    CREATE TABLE production_entries_2026_06 PARTITION OF production_entries FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
    CREATE TABLE production_entries_2026_07 PARTITION OF production_entries FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    CREATE TABLE production_entries_2026_08 PARTITION OF production_entries FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE production_entries_2026_09 PARTITION OF production_entries FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE production_entries_2026_10 PARTITION OF production_entries FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    CREATE TABLE production_entries_2026_11 PARTITION OF production_entries FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
    CREATE TABLE production_entries_2026_12 PARTITION OF production_entries FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
    CREATE TABLE production_entries_2027_01 PARTITION OF production_entries FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
    CREATE TABLE production_entries_2027_06 PARTITION OF production_entries FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
    CREATE TABLE production_entries_2027_12 PARTITION OF production_entries FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

    -- Migrar datos (solo columnas que existen en ambas)
    INSERT INTO production_entries (
      id, part_id, serial_number, lot_number, work_order, quantity,
      station_id, shift_id, user_id, status, produced_at, registered_at, inspected_at, notes
    )
    SELECT
      id, part_id, serial_number, lot_number, work_order, quantity,
      station_id, shift_id, user_id, status, produced_at, registered_at, inspected_at, notes
    FROM production_entries_old;

    -- Índices
    CREATE INDEX idx_pe_serial ON production_entries(serial_number);
    CREATE INDEX idx_pe_part ON production_entries(part_id);
    CREATE INDEX idx_pe_produced_at ON production_entries(produced_at);

    RAISE NOTICE 'production_entries: Convertida a particionada';
  ELSE
    RAISE NOTICE 'production_entries: Ya está particionada';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'production_entries: Error - %, usando estructura existente', SQLERRM;
END $$;

-- ============================================================================
-- 3. SPEC_INSPECTION_ENTRIES
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'spec_inspection_entries' AND c.relkind = 'p' AND n.nspname = 'public'
  ) THEN
    ALTER TABLE IF EXISTS spec_inspection_entries RENAME TO spec_inspection_entries_old;

    CREATE TABLE spec_inspection_entries (
      id SERIAL,
      spec_id INTEGER,
      serial_number VARCHAR(100),
      part_id INTEGER,
      station_id INTEGER,
      user_id INTEGER,
      result VARCHAR(20) DEFAULT 'PENDING',
      measured_value DECIMAL(15,4),
      notes TEXT,
      inspection_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);

    CREATE TABLE spec_inspection_entries_default PARTITION OF spec_inspection_entries DEFAULT;

    -- Particiones
    CREATE TABLE spec_inspection_entries_2025_10 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
    CREATE TABLE spec_inspection_entries_2025_11 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
    CREATE TABLE spec_inspection_entries_2025_12 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
    CREATE TABLE spec_inspection_entries_2026_01 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    CREATE TABLE spec_inspection_entries_2026_02 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
    CREATE TABLE spec_inspection_entries_2026_03 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
    CREATE TABLE spec_inspection_entries_2026_04 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
    CREATE TABLE spec_inspection_entries_2026_05 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
    CREATE TABLE spec_inspection_entries_2026_06 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
    CREATE TABLE spec_inspection_entries_2026_07 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    CREATE TABLE spec_inspection_entries_2026_08 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE spec_inspection_entries_2026_09 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE spec_inspection_entries_2026_10 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    CREATE TABLE spec_inspection_entries_2026_11 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
    CREATE TABLE spec_inspection_entries_2026_12 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
    CREATE TABLE spec_inspection_entries_2027_01 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
    CREATE TABLE spec_inspection_entries_2027_06 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
    CREATE TABLE spec_inspection_entries_2027_12 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

    -- Migrar datos
    INSERT INTO spec_inspection_entries (
      id, spec_id, serial_number, part_id, station_id, user_id,
      result, measured_value, notes, inspection_date, created_at, updated_at
    )
    SELECT
      id, spec_id, serial_number, part_id, station_id, user_id,
      result, measured_value, notes, inspection_date, created_at, updated_at
    FROM spec_inspection_entries_old;

    -- Índices
    CREATE INDEX idx_sie_serial ON spec_inspection_entries(serial_number);
    CREATE INDEX idx_sie_spec ON spec_inspection_entries(spec_id);
    CREATE INDEX idx_sie_created_at ON spec_inspection_entries(created_at);

    RAISE NOTICE 'spec_inspection_entries: Convertida a particionada';
  ELSE
    RAISE NOTICE 'spec_inspection_entries: Ya está particionada';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'spec_inspection_entries: Error - %, usando estructura existente', SQLERRM;
END $$;

-- ============================================================================
-- Verificar resultado
-- ============================================================================
SELECT 'Migration 167 completed. Run get_partition_status() to verify.' as status;
