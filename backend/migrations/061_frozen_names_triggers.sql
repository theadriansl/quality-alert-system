-- ============================================================================
-- FROZEN USER NAMES - Auto-fill Triggers
-- Migration: 061_frozen_names_triggers.sql
-- Purpose: Automatically fill frozen name columns when user IDs are set
-- Date: 2026-06-16
-- ============================================================================

-- Function to get user full name
CREATE OR REPLACE FUNCTION get_user_full_name(user_id INTEGER)
RETURNS VARCHAR(255) AS $$
DECLARE
  full_name VARCHAR(255);
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT first_name || ' ' || last_name INTO full_name FROM users WHERE id = user_id;
  RETURN full_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUDITS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_frozen_names_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_auditor_id IS NOT NULL AND NEW.lead_auditor_name IS NULL THEN
    NEW.lead_auditor_name := get_user_full_name(NEW.lead_auditor_id);
  END IF;
  IF NEW.closed_by IS NOT NULL AND NEW.closed_by_name IS NULL THEN
    NEW.closed_by_name := get_user_full_name(NEW.closed_by);
  END IF;
  IF NEW.created_by IS NOT NULL AND NEW.created_by_name IS NULL THEN
    NEW.created_by_name := get_user_full_name(NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_frozen_names ON audits;
CREATE TRIGGER trg_audit_frozen_names
  BEFORE INSERT OR UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION audit_frozen_names_trigger();

-- ============================================================================
-- AUDIT NON CONFORMITIES TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_nc_frozen_names_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responsible_id IS NOT NULL AND NEW.responsible_name IS NULL THEN
    NEW.responsible_name := get_user_full_name(NEW.responsible_id);
  END IF;
  IF NEW.verified_by IS NOT NULL AND NEW.verified_by_name IS NULL THEN
    NEW.verified_by_name := get_user_full_name(NEW.verified_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_nc_frozen_names ON audit_non_conformities;
CREATE TRIGGER trg_audit_nc_frozen_names
  BEFORE INSERT OR UPDATE ON audit_non_conformities
  FOR EACH ROW EXECUTE FUNCTION audit_nc_frozen_names_trigger();

-- ============================================================================
-- MRB CAMPAIGNS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION mrb_frozen_names_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to_name IS NULL THEN
    NEW.assigned_to_name := get_user_full_name(NEW.assigned_to);
  END IF;
  IF NEW.reported_by IS NOT NULL AND NEW.reported_by_name IS NULL THEN
    NEW.reported_by_name := get_user_full_name(NEW.reported_by);
  END IF;
  IF NEW.responded_by IS NOT NULL AND NEW.responded_by_name IS NULL THEN
    NEW.responded_by_name := get_user_full_name(NEW.responded_by);
  END IF;
  IF NEW.validated_by IS NOT NULL AND NEW.validated_by_name IS NULL THEN
    NEW.validated_by_name := get_user_full_name(NEW.validated_by);
  END IF;
  IF NEW.created_by IS NOT NULL AND NEW.created_by_name IS NULL THEN
    NEW.created_by_name := get_user_full_name(NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mrb_frozen_names ON mrb_campaigns;
CREATE TRIGGER trg_mrb_frozen_names
  BEFORE INSERT OR UPDATE ON mrb_campaigns
  FOR EACH ROW EXECUTE FUNCTION mrb_frozen_names_trigger();

-- ============================================================================
-- MRB COMMENTS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION mrb_comments_frozen_names_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.user_name IS NULL THEN
    NEW.user_name := get_user_full_name(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mrb_comments_frozen_names ON mrb_comments;
CREATE TRIGGER trg_mrb_comments_frozen_names
  BEFORE INSERT OR UPDATE ON mrb_comments
  FOR EACH ROW EXECUTE FUNCTION mrb_comments_frozen_names_trigger();

-- ============================================================================
-- DEFECT ENTRIES V2 (HOSPITAL) TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION defect_frozen_names_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.captured_by_user_id IS NOT NULL AND NEW.captured_by_name IS NULL THEN
    NEW.captured_by_name := get_user_full_name(NEW.captured_by_user_id);
  END IF;
  IF NEW.resolved_by_user_id IS NOT NULL AND NEW.resolved_by_name IS NULL THEN
    NEW.resolved_by_name := get_user_full_name(NEW.resolved_by_user_id);
  END IF;
  IF NEW.inspector_id IS NOT NULL AND NEW.inspector_name IS NULL THEN
    NEW.inspector_name := get_user_full_name(NEW.inspector_id);
  END IF;
  IF NEW.repaired_by IS NOT NULL AND NEW.repaired_by_name IS NULL THEN
    NEW.repaired_by_name := get_user_full_name(NEW.repaired_by);
  END IF;
  IF NEW.released_by IS NOT NULL AND NEW.released_by_name IS NULL THEN
    NEW.released_by_name := get_user_full_name(NEW.released_by);
  END IF;
  IF NEW.approved_by IS NOT NULL AND NEW.approved_by_name IS NULL THEN
    NEW.approved_by_name := get_user_full_name(NEW.approved_by);
  END IF;
  IF NEW.responsible_changed_by IS NOT NULL AND NEW.responsible_changed_by_name IS NULL THEN
    NEW.responsible_changed_by_name := get_user_full_name(NEW.responsible_changed_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defect_frozen_names ON defect_entries_v2;
CREATE TRIGGER trg_defect_frozen_names
  BEFORE INSERT OR UPDATE ON defect_entries_v2
  FOR EACH ROW EXECUTE FUNCTION defect_frozen_names_trigger();
