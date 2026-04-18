-- ============================================
-- FIX: Add 'audit_item' to d7_validation_files constraint
-- Date: 2025-12-29
-- ============================================

BEGIN;

-- Drop existing constraints
ALTER TABLE d7_validation_files
DROP CONSTRAINT IF EXISTS d7_validation_files_file_type_check;

ALTER TABLE d7_validation_files
DROP CONSTRAINT IF EXISTS valid_file_type;

-- Add new constraint with 'audit_item' included
ALTER TABLE d7_validation_files
ADD CONSTRAINT d7_validation_files_file_type_check
CHECK (file_type IN ('before_photo', 'after_photo', 'validation_evidence', 'spc_chart', 'audit_item'));

COMMIT;

-- Verification
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'd7_validation_files'::regclass
  AND conname = 'd7_validation_files_file_type_check';
