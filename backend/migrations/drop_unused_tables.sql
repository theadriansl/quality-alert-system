-- ============================================================================
-- Migration: Drop Unused Tables
-- Date: 2025-12-02
-- Description: Remove corrective_actions and eightd_comments tables
--              These tables were created but never integrated into the application
-- ============================================================================

-- BACKUP LOCATION: backend/backups_unused_tables/
--
-- Backups include:
-- - corrective_actions_schema.sql (empty table, 0 records)
-- - eightd_comments_schema.sql
-- - eightd_comments_data.sql (8 seed data records)
-- - README.md (full documentation)
--
-- To restore if needed:
--   psql -U postgres -d apqp_system -f backups_unused_tables/corrective_actions_schema.sql
--   psql -U postgres -d apqp_system -f backups_unused_tables/eightd_comments_schema.sql
--   psql -U postgres -d apqp_system -f backups_unused_tables/eightd_comments_data.sql

-- ============================================================================
-- VERIFICATION CHECKS
-- ============================================================================

-- Check if tables exist before dropping
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'corrective_actions') THEN
        RAISE NOTICE 'corrective_actions table exists - will be dropped';
    ELSE
        RAISE NOTICE 'corrective_actions table does not exist - skipping';
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'eightd_comments') THEN
        RAISE NOTICE 'eightd_comments table exists - will be dropped';
    ELSE
        RAISE NOTICE 'eightd_comments table does not exist - skipping';
    END IF;
END $$;

-- ============================================================================
-- DROP TABLES
-- ============================================================================

-- Drop corrective_actions table
-- Reason: Never integrated into frontend or backend
-- Impact: None (table is empty, 0 records)
DROP TABLE IF EXISTS corrective_actions CASCADE;

-- Drop eightd_comments table
-- Reason: No frontend UI or backend endpoints exist to use this table
-- Impact: 8 seed data records will be removed (backed up)
DROP TABLE IF EXISTS eightd_comments CASCADE;

-- ============================================================================
-- POST-DROP VERIFICATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'corrective_actions') THEN
        RAISE NOTICE '✅ corrective_actions table successfully dropped';
    ELSE
        RAISE WARNING '⚠️ corrective_actions table still exists';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'eightd_comments') THEN
        RAISE NOTICE '✅ eightd_comments table successfully dropped';
    ELSE
        RAISE WARNING '⚠️ eightd_comments table still exists';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Removed 2 unused tables
-- ✅ Freed up database resources
-- ✅ Cleaned up schema
-- ✅ Backups created before removal
-- ✅ No application functionality affected

-- Next steps:
-- - Monitor application to ensure no errors
-- - Keep backups for at least 30 days
-- - Update schema documentation
