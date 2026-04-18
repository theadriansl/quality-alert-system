-- ============================================================================
-- Fix qar_defects foreign key to reference defect_entries_v2
-- Migration: 026_fix_qar_defects_fk.sql
-- ============================================================================

-- Drop the old foreign key constraint
ALTER TABLE qar_defects
DROP CONSTRAINT IF EXISTS qar_defects_defect_entry_id_fkey;

-- Add the correct foreign key to defect_entries_v2
ALTER TABLE qar_defects
ADD CONSTRAINT qar_defects_defect_entry_id_fkey
FOREIGN KEY (defect_entry_id) REFERENCES defect_entries_v2(id);

SELECT 'Fixed qar_defects foreign key to reference defect_entries_v2' as status;
