-- Migration: Fix UTF-8 encoding issues in Spanish text
-- This fixes double-encoded UTF-8 characters (stored as Latin-1)

-- Fix repair_types table
UPDATE repair_types SET name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE name ~ '[Ã]';

UPDATE repair_types SET description = CONVERT_FROM(CONVERT_TO(description, 'LATIN1'), 'UTF8')
WHERE description ~ '[Ã]';

-- Fix root_causes table
UPDATE root_causes SET name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE name ~ '[Ã]';

UPDATE root_causes SET description = CONVERT_FROM(CONVERT_TO(description, 'LATIN1'), 'UTF8')
WHERE description ~ '[Ã]';

-- Fix release_reasons table
UPDATE release_reasons SET name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE name ~ '[Ã]';

UPDATE release_reasons SET description = CONVERT_FROM(CONVERT_TO(description, 'LATIN1'), 'UTF8')
WHERE description ~ '[Ã]';

-- Fix defect_types table
UPDATE defect_types SET name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE name ~ '[Ã]';

UPDATE defect_types SET description = CONVERT_FROM(CONVERT_TO(description, 'LATIN1'), 'UTF8')
WHERE description ~ '[Ã]';

-- Fix defect_categories table
UPDATE defect_categories SET name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE name ~ '[Ã]';

UPDATE defect_categories SET description = CONVERT_FROM(CONVERT_TO(description, 'LATIN1'), 'UTF8')
WHERE description ~ '[Ã]';

-- Fix deviations table
UPDATE deviations SET description = CONVERT_FROM(CONVERT_TO(description, 'LATIN1'), 'UTF8')
WHERE description ~ '[Ã]';

UPDATE deviations SET notes = CONVERT_FROM(CONVERT_TO(notes, 'LATIN1'), 'UTF8')
WHERE notes ~ '[Ã]';
