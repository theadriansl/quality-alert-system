-- Migration 113: Add affected_status column to track if serial was in affected list
-- Values: 'IN_LIST', 'OUT_OF_LIST', 'NO_LIST_DEFINED'

-- Add to defect_entries_v2 (NOK entries)
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS affected_status VARCHAR(20) DEFAULT NULL;

-- Add to mrb_ok_entries (OK entries)
ALTER TABLE mrb_ok_entries
ADD COLUMN IF NOT EXISTS affected_status VARCHAR(20) DEFAULT NULL;

-- Add check constraints
ALTER TABLE defect_entries_v2
ADD CONSTRAINT chk_defect_affected_status
CHECK (affected_status IS NULL OR affected_status IN ('IN_LIST', 'OUT_OF_LIST', 'NO_LIST_DEFINED'));

ALTER TABLE mrb_ok_entries
ADD CONSTRAINT chk_ok_affected_status
CHECK (affected_status IS NULL OR affected_status IN ('IN_LIST', 'OUT_OF_LIST', 'NO_LIST_DEFINED'));

COMMENT ON COLUMN defect_entries_v2.affected_status IS 'IN_LIST=serial en lista afectados, OUT_OF_LIST=serial no en lista, NO_LIST_DEFINED=campaña sin seriales definidos';
COMMENT ON COLUMN mrb_ok_entries.affected_status IS 'IN_LIST=serial en lista afectados, OUT_OF_LIST=serial no en lista, NO_LIST_DEFINED=campaña sin seriales definidos';
