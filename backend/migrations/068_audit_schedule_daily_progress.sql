-- Migration 068: Add daily_progress to audit_schedules
ALTER TABLE audit_schedules
  ADD COLUMN IF NOT EXISTS daily_progress JSONB DEFAULT '[]';
