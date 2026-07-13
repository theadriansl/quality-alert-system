-- ============================================================================
-- Migration 094: Support multiple parts per deviation
-- ============================================================================

-- 1. Create deviation_parts table (N:M relationship)
CREATE TABLE IF NOT EXISTS deviation_parts (
    id SERIAL PRIMARY KEY,
    deviation_id INTEGER NOT NULL REFERENCES deviations(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id),
    UNIQUE(deviation_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_deviation_parts_deviation ON deviation_parts(deviation_id);
CREATE INDEX IF NOT EXISTS idx_deviation_parts_part ON deviation_parts(part_id);

-- 2. Migrate existing part_id data to deviation_parts
INSERT INTO deviation_parts (deviation_id, part_id, added_by)
SELECT id, part_id, created_by
FROM deviations
WHERE part_id IS NOT NULL
ON CONFLICT (deviation_id, part_id) DO NOTHING;

-- 3. Create or replace view to include partIds array
CREATE OR REPLACE VIEW v_deviations AS
SELECT
    d.id,
    d.reference_number,
    d.deviation_type,
    d.description,
    d.client_id,
    c.name AS client_name,
    d.project_id,
    p.name AS project_name,
    d.part_id,
    cp.part_number,
    cp.part_name,
    d.validity_date,
    d.status,
    d.notes,
    d.created_by,
    u.first_name || ' ' || u.last_name AS created_by_name,
    d.created_at,
    d.updated_at,
    -- New: Array of part IDs
    COALESCE(
        (SELECT array_agg(dp.part_id) FROM deviation_parts dp WHERE dp.deviation_id = d.id),
        CASE WHEN d.part_id IS NOT NULL THEN ARRAY[d.part_id] ELSE ARRAY[]::INTEGER[] END
    ) AS part_ids,
    -- New: Array of part numbers for display
    COALESCE(
        (SELECT array_agg(cp2.part_number) FROM deviation_parts dp
         JOIN client_parts cp2 ON dp.part_id = cp2.id
         WHERE dp.deviation_id = d.id),
        CASE WHEN d.part_id IS NOT NULL THEN ARRAY[cp.part_number] ELSE ARRAY[]::VARCHAR[] END
    ) AS part_numbers
FROM deviations d
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN users u ON d.created_by = u.id;

-- 4. Add trigger to log part changes in deviation_history
CREATE OR REPLACE FUNCTION log_deviation_parts_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO deviation_history (deviation_id, action, field_name, new_value, changed_by)
        SELECT NEW.deviation_id, 'PART_ADDED', 'part_id',
               (SELECT part_number FROM client_parts WHERE id = NEW.part_id),
               NEW.added_by;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO deviation_history (deviation_id, action, field_name, old_value, changed_by)
        SELECT OLD.deviation_id, 'PART_REMOVED', 'part_id',
               (SELECT part_number FROM client_parts WHERE id = OLD.part_id),
               (SELECT created_by FROM deviations WHERE id = OLD.deviation_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deviation_parts_change ON deviation_parts;
CREATE TRIGGER trg_deviation_parts_change
AFTER INSERT OR DELETE ON deviation_parts
FOR EACH ROW EXECUTE FUNCTION log_deviation_parts_change();

-- Done
SELECT 'Migration 094 completed: deviation_parts table created' AS status;
