-- ============================================================================
-- AUDIT - WORKLOAD INTEGRATION
-- Migration 030
-- Description: Bidirectional sync between Audit schedules/NCs and Workload
-- ============================================================================

-- ============================================================================
-- 1. CREATE AUDIT PROJECT IN WORKLOAD
-- ============================================================================

INSERT INTO workload_projects (name, description, client, status, color)
SELECT
  'AUDIT_SYSTEM',
  'Actividades de auditoría - Ejecución de auditorías programadas y cierre de No Conformidades',
  'Sistema de Calidad',
  'active',
  '#8b5cf6'
WHERE NOT EXISTS (
  SELECT 1 FROM workload_projects WHERE name = 'AUDIT_SYSTEM'
);

-- ============================================================================
-- 2. AUDIT_SCHEDULES - Workload Integration Fields
-- ============================================================================

-- Link to workload activity
ALTER TABLE audit_schedules
ADD COLUMN IF NOT EXISTS workload_activity_id INTEGER REFERENCES workload_activities(id);

-- Time tracking
ALTER TABLE audit_schedules
ADD COLUMN IF NOT EXISTS planned_hours DECIMAL(5,1);

ALTER TABLE audit_schedules
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,1) DEFAULT 0;

COMMENT ON COLUMN audit_schedules.workload_activity_id IS 'FK to workload_activities for sync';
COMMENT ON COLUMN audit_schedules.planned_hours IS 'Estimated hours for audit execution';
COMMENT ON COLUMN audit_schedules.actual_hours IS 'Actual hours (synced from Workload)';

-- ============================================================================
-- 3. AUDIT_NON_CONFORMITIES - Workload Integration Fields
-- ============================================================================

-- Link to workload activity (for action tracking)
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS workload_activity_id INTEGER REFERENCES workload_activities(id);

-- Time tracking for NC closure
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS planned_hours DECIMAL(5,1);

ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,1) DEFAULT 0;

-- Verification activity (separate from action activity)
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS verification_workload_id INTEGER REFERENCES workload_activities(id);

COMMENT ON COLUMN audit_non_conformities.workload_activity_id IS 'FK to workload activity for NC actions';
COMMENT ON COLUMN audit_non_conformities.planned_hours IS 'Estimated hours for NC closure';
COMMENT ON COLUMN audit_non_conformities.actual_hours IS 'Actual hours (synced from Workload)';
COMMENT ON COLUMN audit_non_conformities.verification_workload_id IS 'FK to workload activity for verification';

-- ============================================================================
-- 4. INDEXES FOR WORKLOAD SYNC
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_schedules_workload
ON audit_schedules(workload_activity_id) WHERE workload_activity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_ncs_workload
ON audit_non_conformities(workload_activity_id) WHERE workload_activity_id IS NOT NULL;

-- ============================================================================
-- 5. FUNCTION: Sync Audit Schedule to Workload
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_audit_schedule_to_workload(
  p_schedule_id INTEGER,
  p_created_by INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_schedule RECORD;
  v_project_id INTEGER;
  v_kpi_id INTEGER;
  v_activity_id INTEGER;
BEGIN
  -- Get schedule data
  SELECT * INTO v_schedule FROM audit_schedules WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found: %', p_schedule_id;
  END IF;

  -- Get AUDIT_SYSTEM project
  SELECT id INTO v_project_id FROM workload_projects WHERE name = 'AUDIT_SYSTEM';

  -- Get Quality KPI
  SELECT id INTO v_kpi_id FROM workload_kpis WHERE code = 'Q';

  -- Check if activity already exists
  IF v_schedule.workload_activity_id IS NOT NULL THEN
    -- Update existing activity
    UPDATE workload_activities SET
      title = 'Auditoría: ' || v_schedule.audit_name,
      description = COALESCE(v_schedule.description, 'Ejecución de auditoría programada'),
      assigned_to = v_schedule.lead_auditor_id,
      start_date = v_schedule.planned_start_date,
      end_date = v_schedule.planned_end_date,
      due_date = v_schedule.planned_end_date,
      estimated_hours = v_schedule.planned_hours,
      status = CASE v_schedule.status
        WHEN 'planned' THEN 'pending'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE id = v_schedule.workload_activity_id;

    RETURN v_schedule.workload_activity_id;
  ELSE
    -- Create new activity
    INSERT INTO workload_activities (
      title, description, activity_type, kpi_id, project_id,
      assigned_to, assigned_by, start_date, end_date, due_date,
      estimated_hours, status, priority,
      source_type, source_id, source_discipline,
      created_by, created_at
    ) VALUES (
      'Auditoría: ' || v_schedule.audit_name,
      COALESCE(v_schedule.description, 'Ejecución de auditoría programada'),
      'assigned',
      v_kpi_id,
      v_project_id,
      v_schedule.lead_auditor_id,
      p_created_by,
      v_schedule.planned_start_date,
      v_schedule.planned_end_date,
      v_schedule.planned_end_date,
      COALESCE(v_schedule.planned_hours, 8),
      'pending',
      'high',
      'AUDIT',
      v_schedule.audit_number,
      'SCHEDULE',
      p_created_by,
      NOW()
    ) RETURNING id INTO v_activity_id;

    -- Update schedule with activity reference
    UPDATE audit_schedules
    SET workload_activity_id = v_activity_id
    WHERE id = p_schedule_id;

    RETURN v_activity_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION: Sync NC to Workload
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_nc_to_workload(
  p_nc_id INTEGER,
  p_created_by INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_nc RECORD;
  v_audit RECORD;
  v_project_id INTEGER;
  v_kpi_id INTEGER;
  v_activity_id INTEGER;
  v_priority VARCHAR(20);
BEGIN
  -- Get NC data
  SELECT nc.*, a.area_process, a.audit_number
  INTO v_nc
  FROM audit_non_conformities nc
  JOIN audits a ON nc.audit_id = a.id
  WHERE nc.id = p_nc_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NC not found: %', p_nc_id;
  END IF;

  -- Get AUDIT_SYSTEM project
  SELECT id INTO v_project_id FROM workload_projects WHERE name = 'AUDIT_SYSTEM';

  -- Get Quality KPI
  SELECT id INTO v_kpi_id FROM workload_kpis WHERE code = 'Q';

  -- Determine priority based on risk
  v_priority := CASE COALESCE(v_nc.risk_level, 'medium')
    WHEN 'high' THEN 'critical'
    WHEN 'medium' THEN 'high'
    ELSE 'medium'
  END;

  -- Check if activity already exists
  IF v_nc.workload_activity_id IS NOT NULL THEN
    -- Update existing activity
    UPDATE workload_activities SET
      title = v_nc.nc_number || ' - Acción Correctiva',
      description = v_nc.description,
      assigned_to = v_nc.responsible_id,
      due_date = v_nc.due_date,
      estimated_hours = v_nc.planned_hours,
      priority = v_priority,
      status = CASE v_nc.status
        WHEN 'open' THEN 'pending'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'pending_verification' THEN 'in_progress'
        WHEN 'closed' THEN 'completed'
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE id = v_nc.workload_activity_id;

    RETURN v_nc.workload_activity_id;
  ELSE
    -- Create new activity
    INSERT INTO workload_activities (
      title, description, activity_type, kpi_id, project_id,
      assigned_to, assigned_by, start_date, end_date, due_date,
      estimated_hours, status, priority,
      source_type, source_id, source_discipline,
      created_by, created_at
    ) VALUES (
      v_nc.nc_number || ' - Acción Correctiva',
      v_nc.description,
      'assigned',
      v_kpi_id,
      v_project_id,
      v_nc.responsible_id,
      p_created_by,
      CURRENT_DATE,
      v_nc.due_date,
      v_nc.due_date,
      COALESCE(v_nc.planned_hours, 4),
      'pending',
      v_priority,
      'AUDIT',
      v_nc.nc_number,
      'NC_ACTION',
      p_created_by,
      NOW()
    ) RETURNING id INTO v_activity_id;

    -- Update NC with activity reference
    UPDATE audit_non_conformities
    SET workload_activity_id = v_activity_id
    WHERE id = p_nc_id;

    RETURN v_activity_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION: Sync Workload Progress back to Audit
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_workload_to_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process AUDIT source types
  IF NEW.source_type != 'AUDIT' THEN
    RETURN NEW;
  END IF;

  -- Sync to Schedule
  IF NEW.source_discipline = 'SCHEDULE' THEN
    UPDATE audit_schedules SET
      actual_hours = NEW.actual_hours,
      status = CASE NEW.status
        WHEN 'completed' THEN 'completed'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE status
      END,
      actual_start_date = CASE
        WHEN NEW.status = 'in_progress' AND actual_start_date IS NULL THEN CURRENT_DATE
        ELSE actual_start_date
      END,
      actual_end_date = CASE
        WHEN NEW.status = 'completed' THEN CURRENT_DATE
        ELSE actual_end_date
      END,
      updated_at = NOW()
    WHERE workload_activity_id = NEW.id;
  END IF;

  -- Sync to NC
  IF NEW.source_discipline = 'NC_ACTION' THEN
    UPDATE audit_non_conformities SET
      actual_hours = NEW.actual_hours,
      status = CASE NEW.status
        WHEN 'completed' THEN 'pending_verification'
        WHEN 'in_progress' THEN 'in_progress'
        ELSE status
      END,
      updated_at = NOW()
    WHERE workload_activity_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bidirectional sync
DROP TRIGGER IF EXISTS sync_workload_audit_trigger ON workload_activities;
CREATE TRIGGER sync_workload_audit_trigger
  AFTER UPDATE ON workload_activities
  FOR EACH ROW
  WHEN (NEW.source_type = 'AUDIT')
  EXECUTE FUNCTION sync_workload_to_audit();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 030: Audit-Workload Integration completed!';
  RAISE NOTICE '   - Created AUDIT_SYSTEM project';
  RAISE NOTICE '   - audit_schedules: workload_activity_id, planned_hours, actual_hours';
  RAISE NOTICE '   - audit_non_conformities: workload_activity_id, planned_hours, actual_hours, verification_workload_id';
  RAISE NOTICE '   - Functions: sync_audit_schedule_to_workload(), sync_nc_to_workload()';
  RAISE NOTICE '   - Trigger: sync_workload_audit_trigger (bidirectional sync)';
END $$;
