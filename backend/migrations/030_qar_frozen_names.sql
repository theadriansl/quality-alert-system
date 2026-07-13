-- ============================================================================
-- QAR Frozen User Names
-- Migration: 030_qar_frozen_names.sql
-- Purpose: Add frozen name columns to preserve historical user data
-- ============================================================================

-- Add frozen name columns to quality_alerts
ALTER TABLE quality_alerts
ADD COLUMN IF NOT EXISTS reported_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS responded_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS responded_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS validated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS validated_by_name VARCHAR(255);

-- Add frozen name column to qar_recipients
ALTER TABLE qar_recipients
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- Add frozen name column to qar_comments
ALTER TABLE qar_comments
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- ============================================================================
-- Migrate existing data: Copy current user names to frozen columns
-- ============================================================================

-- Update quality_alerts with current user names
UPDATE quality_alerts qa
SET
  reported_by_name = COALESCE(qa.reported_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE qa.reported_by = u.id AND qa.reported_by_name IS NULL;

UPDATE quality_alerts qa
SET
  assigned_to_name = COALESCE(qa.assigned_to_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE qa.assigned_to = u.id AND qa.assigned_to_name IS NULL;

UPDATE quality_alerts qa
SET
  responded_by_name = COALESCE(qa.responded_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE qa.responded_by = u.id AND qa.responded_by_name IS NULL;

UPDATE quality_alerts qa
SET
  validated_by_name = COALESCE(qa.validated_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE qa.validated_by = u.id AND qa.validated_by_name IS NULL;

-- Update qar_recipients with current user names
UPDATE qar_recipients qr
SET
  user_name = COALESCE(qr.user_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE qr.user_id = u.id AND qr.user_name IS NULL;

-- Update qar_comments with current user names
UPDATE qar_comments qc
SET
  user_name = COALESCE(qc.user_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE qc.user_id = u.id AND qc.user_name IS NULL;

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quality_alerts_reported_by ON quality_alerts(reported_by);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_assigned_to ON quality_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_responded_by ON quality_alerts(responded_by);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_validated_by ON quality_alerts(validated_by);
