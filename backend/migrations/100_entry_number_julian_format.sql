-- Migration 100: Entry number with Julian format
-- Format: DEF-YYYYDDD-NNNNN
-- YYYY = year, DDD = julian day (001-366), NNNNN = daily sequence (00001-99999)
-- Example: DEF-2026182-00001

-- Function to get Julian day (handles leap years via EXTRACT DOY)
CREATE OR REPLACE FUNCTION get_julian_day(d DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(DOY FROM d)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated function to generate entry number with Julian format
CREATE OR REPLACE FUNCTION generate_defect_entry_v2_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_julian TEXT;
  v_seq INTEGER;
  v_today DATE;
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    v_today := CURRENT_DATE;
    v_year := TO_CHAR(v_today, 'YYYY');
    v_julian := LPAD(get_julian_day(v_today)::TEXT, 3, '0');

    -- Count entries from current day + 1
    SELECT COALESCE(MAX(
      CASE
        WHEN entry_number ~ ('^DEF-' || v_year || v_julian || '-[0-9]{5}$')
        THEN SUBSTRING(entry_number FROM '[0-9]{5}$')::INTEGER
        ELSE 0
      END
    ), 0) + 1 INTO v_seq
    FROM defect_entries_v2
    WHERE entry_number LIKE 'DEF-' || v_year || v_julian || '-%';

    NEW.entry_number := 'DEF-' || v_year || v_julian || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on defect_entries_v2
DROP TRIGGER IF EXISTS trigger_defect_entry_v2_number ON defect_entries_v2;
CREATE TRIGGER trigger_defect_entry_v2_number
  BEFORE INSERT ON defect_entries_v2
  FOR EACH ROW
  EXECUTE FUNCTION generate_defect_entry_v2_number();

COMMENT ON FUNCTION generate_defect_entry_v2_number() IS
'Generates Julian format entry number: DEF-YYYYDDD-NNNNN. DDD is day of year (001-366), NNNNN is daily sequence that resets each day. Supports ~36.5M entries/year.';
