-- ============================================================================
-- Migration 168: Convertir production_entries y spec_inspection_entries
-- ============================================================================
-- Estructura corregida basada en tablas reales
-- ============================================================================

-- ============================================================================
-- 1. PRODUCTION_ENTRIES
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

    -- Crear tabla particionada con estructura REAL
    CREATE TABLE production_entries (
      id SERIAL,
      serial_number VARCHAR(100),
      part_id INTEGER,
      part_number_raw VARCHAR(100),
      lot_number VARCHAR(100),
      work_order VARCHAR(100),
      line_id INTEGER,
      shift_id INTEGER,
      inspection_status VARCHAR(50),
      part_status VARCHAR(50),
      unit_id INTEGER,
      produced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      inspected_at TIMESTAMP,
      source VARCHAR(50),
      source_reference VARCHAR(100),
      created_by INTEGER,
      mrb_campaign_id INTEGER,
      PRIMARY KEY (id, produced_at)
    ) PARTITION BY RANGE (produced_at);

    -- Partición default para datos sin fecha o fuera de rango
    CREATE TABLE production_entries_default PARTITION OF production_entries DEFAULT;

    -- Crear particiones Oct 2025 - Dic 2027
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
    CREATE TABLE production_entries_2027_02 PARTITION OF production_entries FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
    CREATE TABLE production_entries_2027_03 PARTITION OF production_entries FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
    CREATE TABLE production_entries_2027_04 PARTITION OF production_entries FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
    CREATE TABLE production_entries_2027_05 PARTITION OF production_entries FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
    CREATE TABLE production_entries_2027_06 PARTITION OF production_entries FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
    CREATE TABLE production_entries_2027_07 PARTITION OF production_entries FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
    CREATE TABLE production_entries_2027_08 PARTITION OF production_entries FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
    CREATE TABLE production_entries_2027_09 PARTITION OF production_entries FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
    CREATE TABLE production_entries_2027_10 PARTITION OF production_entries FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
    CREATE TABLE production_entries_2027_11 PARTITION OF production_entries FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
    CREATE TABLE production_entries_2027_12 PARTITION OF production_entries FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

    -- Migrar datos
    INSERT INTO production_entries SELECT * FROM production_entries_old;

    -- Índices
    CREATE INDEX idx_pe_serial ON production_entries(serial_number);
    CREATE INDEX idx_pe_part ON production_entries(part_id);
    CREATE INDEX idx_pe_produced_at ON production_entries(produced_at);
    CREATE INDEX idx_pe_lot ON production_entries(lot_number);

    RAISE NOTICE 'production_entries: Convertida a particionada';
  ELSE
    RAISE NOTICE 'production_entries: Ya está particionada';
  END IF;
END $$;

-- ============================================================================
-- 2. SPEC_INSPECTION_ENTRIES
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'spec_inspection_entries' AND c.relkind = 'p' AND n.nspname = 'public'
  ) THEN
    ALTER TABLE IF EXISTS spec_inspection_entries RENAME TO spec_inspection_entries_old;

    -- Crear tabla particionada con estructura REAL
    CREATE TABLE spec_inspection_entries (
      id SERIAL,
      entry_number VARCHAR(50),
      unit_id INTEGER,
      unit_station_inspection_id INTEGER,
      lot_number VARCHAR(100),
      serial_number VARCHAR(100),
      client_id INTEGER,
      project_id INTEGER,
      part_id INTEGER,
      spec_id INTEGER,
      inspection_date DATE DEFAULT CURRENT_DATE,
      inspector_id INTEGER,
      shift_id INTEGER,
      station_id INTEGER,
      stage_id INTEGER,
      department_id INTEGER,
      result VARCHAR(20) DEFAULT 'PENDING',
      measured_value NUMERIC(15,4),
      deviation NUMERIC(15,4),
      within_tolerance BOOLEAN,
      qualitative_value VARCHAR(100),
      disposition_id INTEGER,
      disposition_notes TEXT,
      photo_evidence TEXT,
      notes TEXT,
      qar_triggered BOOLEAN DEFAULT FALSE,
      qar_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);

    -- Partición default
    CREATE TABLE spec_inspection_entries_default PARTITION OF spec_inspection_entries DEFAULT;

    -- Crear particiones Oct 2025 - Dic 2027
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
    CREATE TABLE spec_inspection_entries_2027_02 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
    CREATE TABLE spec_inspection_entries_2027_03 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
    CREATE TABLE spec_inspection_entries_2027_04 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
    CREATE TABLE spec_inspection_entries_2027_05 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
    CREATE TABLE spec_inspection_entries_2027_06 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
    CREATE TABLE spec_inspection_entries_2027_07 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
    CREATE TABLE spec_inspection_entries_2027_08 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
    CREATE TABLE spec_inspection_entries_2027_09 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
    CREATE TABLE spec_inspection_entries_2027_10 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
    CREATE TABLE spec_inspection_entries_2027_11 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
    CREATE TABLE spec_inspection_entries_2027_12 PARTITION OF spec_inspection_entries FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

    -- Migrar datos
    INSERT INTO spec_inspection_entries SELECT * FROM spec_inspection_entries_old;

    -- Índices
    CREATE INDEX idx_sie_serial ON spec_inspection_entries(serial_number);
    CREATE INDEX idx_sie_spec ON spec_inspection_entries(spec_id);
    CREATE INDEX idx_sie_created_at ON spec_inspection_entries(created_at);
    CREATE INDEX idx_sie_part ON spec_inspection_entries(part_id);

    RAISE NOTICE 'spec_inspection_entries: Convertida a particionada';
  ELSE
    RAISE NOTICE 'spec_inspection_entries: Ya está particionada';
  END IF;
END $$;

SELECT 'Migration 168 completed' as status;
