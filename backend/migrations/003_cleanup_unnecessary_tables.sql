-- ============================================================================
-- MIGRATION 003: Cleanup Unnecessary Tables
-- Date: 2025-11-13
-- Description: Removes tables for modules not part of Quality Alert System:
--              - Quotes (not needed)
--              - Work Instructions (not needed)
--              - Job Services/Timesheets (not needed)
--              - Job Documents (generic, not needed - we use client_documents)
-- ============================================================================

-- Drop Work Instructions related tables
DROP TABLE IF EXISTS work_instruction_timeline CASCADE;
DROP TABLE IF EXISTS work_instruction_process_audits CASCADE;
DROP TABLE IF EXISTS work_instruction_risk_assessments CASCADE;
DROP TABLE IF EXISTS work_instruction_steps CASCADE;
DROP TABLE IF EXISTS work_instructions CASCADE;

-- Drop Quotes table
DROP TABLE IF EXISTS quotes CASCADE;

-- Drop Job Services tables
DROP TABLE IF EXISTS job_timesheets CASCADE;
DROP TABLE IF EXISTS job_team_members CASCADE;

-- Drop generic job documents (we use client_documents instead)
DROP TABLE IF EXISTS job_documents CASCADE;

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN (
--   'quotes', 'work_instructions', 'work_instruction_steps',
--   'work_instruction_risk_assessments', 'work_instruction_process_audits',
--   'work_instruction_timeline', 'job_team_members', 'job_timesheets', 'job_documents'
-- );
-- Should return 0 rows

-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================
