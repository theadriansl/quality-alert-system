-- ============================================================================
-- Add QAR validator flag to users
-- Migration: 027_qar_validators.sql
-- ============================================================================

-- Add column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_validate_qar BOOLEAN DEFAULT false;

-- Set existing Quality department users as validators
UPDATE users
SET can_validate_qar = true
WHERE LOWER(department) LIKE '%quality%';

SELECT 'Added can_validate_qar column to users' as status;
