-- Migration: Add d6_countermeasure_description column
-- Date: 2026-02-13
-- Description: Adds the d6_countermeasure_description column for storing
--              the general countermeasure description text in D6

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd6_countermeasure_description'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d6_countermeasure_description TEXT;
        COMMENT ON COLUMN eightd_reports.d6_countermeasure_description IS 'D6: Descripcion general de la contramedida definitiva';
        RAISE NOTICE 'Column d6_countermeasure_description added successfully';
    ELSE
        RAISE NOTICE 'Column d6_countermeasure_description already exists';
    END IF;
END $$;
