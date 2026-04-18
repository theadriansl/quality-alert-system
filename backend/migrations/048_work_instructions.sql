-- Migration 048: Work Instructions Module
-- Complete system for creating and managing work instructions with versioning

-- ============================================================================
-- 1. MAIN TABLE: work_instructions
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instructions (
  id SERIAL PRIMARY KEY,

  -- Client association (single client)
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Basic info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reference_image TEXT,

  -- Validity dates
  valid_from DATE,
  valid_to DATE,

  -- Status and versioning
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  current_revision INTEGER DEFAULT 1,

  -- Audit fields
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_instructions_client ON work_instructions(client_id);
CREATE INDEX IF NOT EXISTS idx_work_instructions_status ON work_instructions(status);
CREATE INDEX IF NOT EXISTS idx_work_instructions_validity ON work_instructions(valid_from, valid_to);

COMMENT ON TABLE work_instructions IS 'Work instructions master table';
COMMENT ON COLUMN work_instructions.current_revision IS 'Current revision number (auto-increments on changes)';

-- ============================================================================
-- 2. PROJECTS LINK: work_instruction_projects (N:N)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_projects (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(work_instruction_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_wi_projects_wi ON work_instruction_projects(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_projects_project ON work_instruction_projects(project_id);

COMMENT ON TABLE work_instruction_projects IS 'Projects linked to a work instruction';

-- ============================================================================
-- 3. PARTS LINK: work_instruction_parts (N:N)
-- Only parts from linked projects are allowed
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_parts (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(work_instruction_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_wi_parts_wi ON work_instruction_parts(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_parts_part ON work_instruction_parts(part_id);

COMMENT ON TABLE work_instruction_parts IS 'Parts linked to a work instruction (must belong to linked projects)';

-- ============================================================================
-- 4. USERS ASSIGNMENT: work_instruction_users
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_users (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_type VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (access_type IN ('viewer', 'editor', 'approver')),
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(work_instruction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wi_users_wi ON work_instruction_users(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_users_user ON work_instruction_users(user_id);
CREATE INDEX IF NOT EXISTS idx_wi_users_access ON work_instruction_users(access_type);

COMMENT ON TABLE work_instruction_users IS 'Users assigned to a work instruction with access type';

-- ============================================================================
-- 5. REVISIONS: work_instruction_revisions (auto-versioning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_revisions (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,

  -- Snapshot of data at this revision
  snapshot JSONB NOT NULL DEFAULT '{}',
  change_summary TEXT,

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Audit
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(work_instruction_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_wi_revisions_wi ON work_instruction_revisions(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_revisions_number ON work_instruction_revisions(work_instruction_id, revision_number);

COMMENT ON TABLE work_instruction_revisions IS 'Revision history with snapshots for audit trail';
COMMENT ON COLUMN work_instruction_revisions.snapshot IS 'JSON snapshot of steps and metadata at this revision';

-- ============================================================================
-- 6. STEPS: work_instruction_steps (ordered, triggers revision on change)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_steps (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  -- Order (for drag & drop)
  step_order INTEGER NOT NULL DEFAULT 0,

  -- Content
  title VARCHAR(255),
  description TEXT,
  image_url TEXT,

  -- Time estimate
  estimated_time_minutes INTEGER DEFAULT 0,

  -- Step classification
  step_type VARCHAR(20) DEFAULT 'regular' CHECK (step_type IN ('regular', 'safety', 'legal', 'warranty', 'quality', 'critical')),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_steps_wi ON work_instruction_steps(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_steps_order ON work_instruction_steps(work_instruction_id, step_order);
CREATE INDEX IF NOT EXISTS idx_wi_steps_type ON work_instruction_steps(step_type);

COMMENT ON TABLE work_instruction_steps IS 'Individual steps of a work instruction';
COMMENT ON COLUMN work_instruction_steps.step_type IS 'Classification: regular, safety, legal, warranty, quality, critical';

-- ============================================================================
-- 7. STEP FILES: work_instruction_step_files (multiple images per step)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_step_files (
  id SERIAL PRIMARY KEY,
  step_id INTEGER NOT NULL REFERENCES work_instruction_steps(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_step_files_step ON work_instruction_step_files(step_id);

COMMENT ON TABLE work_instruction_step_files IS 'Files attached to work instruction steps';

-- ============================================================================
-- 8. RISK ASSESSMENT: work_instruction_risk_assessments (8 criteria)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_risk_assessments (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  -- 8 consolidated criteria (stored as JSONB for flexibility)
  -- Each criterion: { score, actions_recommended, target_date, actions_taken, revised_score }
  criteria JSONB NOT NULL DEFAULT '{
    "inspection_method": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "detection_complexity": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "product_variability": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "visual_aids": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "equipment": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "work_environment": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "process_flow": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null},
    "human_factor": {"score": null, "actions_recommended": "", "target_date": null, "actions_taken": "", "revised_score": null}
  }',

  -- Total scores (calculated)
  total_score INTEGER,
  total_revised_score INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),

  -- Audit
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(work_instruction_id)
);

CREATE INDEX IF NOT EXISTS idx_wi_risk_wi ON work_instruction_risk_assessments(work_instruction_id);
CREATE INDEX IF NOT EXISTS idx_wi_risk_status ON work_instruction_risk_assessments(status);

COMMENT ON TABLE work_instruction_risk_assessments IS 'Risk assessment with 8 consolidated criteria per work instruction';
COMMENT ON COLUMN work_instruction_risk_assessments.criteria IS 'JSON object with 8 criteria: inspection_method, detection_complexity, product_variability, visual_aids, equipment, work_environment, process_flow, human_factor';

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_work_instructions_updated_at ON work_instructions;
CREATE TRIGGER update_work_instructions_updated_at
  BEFORE UPDATE ON work_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wi_steps_updated_at ON work_instruction_steps;
CREATE TRIGGER update_wi_steps_updated_at
  BEFORE UPDATE ON work_instruction_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wi_risk_updated_at ON work_instruction_risk_assessments;
CREATE TRIGGER update_wi_risk_updated_at
  BEFORE UPDATE ON work_instruction_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. ADD MODULE TO PERMISSION SYSTEM
-- ============================================================================
-- Add work_instructions to available modules in roles
DO $$
BEGIN
  -- Update existing admin roles to include work_instructions module
  UPDATE roles
  SET permissions = permissions || '{"work_instructions": {"access": "full", "actions": ["create", "edit", "delete", "approve"]}}'::jsonb
  WHERE name IN ('Super Admin', 'Admin Empresa', 'Gerente de Calidad')
  AND NOT (permissions ? 'work_instructions');

  -- Add view access for other roles
  UPDATE roles
  SET permissions = permissions || '{"work_instructions": {"access": "view", "actions": ["view"]}}'::jsonb
  WHERE name IN ('Ingeniero de Calidad', 'Inspector', 'Auditor', 'Consulta')
  AND NOT (permissions ? 'work_instructions');
END $$;

-- ============================================================================
-- 11. FUNCTION: Create revision snapshot
-- ============================================================================
CREATE OR REPLACE FUNCTION create_wi_revision_snapshot(wi_id INTEGER, change_desc TEXT, user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_revision INTEGER;
  snapshot_data JSONB;
BEGIN
  -- Get next revision number
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO new_revision
  FROM work_instruction_revisions
  WHERE work_instruction_id = wi_id;

  -- Create snapshot of current steps
  SELECT jsonb_build_object(
    'steps', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'step_order', step_order,
          'title', title,
          'description', description,
          'image_url', image_url,
          'estimated_time_minutes', estimated_time_minutes,
          'step_type', step_type
        ) ORDER BY step_order
      )
      FROM work_instruction_steps
      WHERE work_instruction_id = wi_id
    ), '[]'::jsonb),
    'metadata', (
      SELECT jsonb_build_object(
        'title', title,
        'description', description,
        'valid_from', valid_from,
        'valid_to', valid_to
      )
      FROM work_instructions
      WHERE id = wi_id
    )
  ) INTO snapshot_data;

  -- Insert revision
  INSERT INTO work_instruction_revisions (
    work_instruction_id, revision_number, snapshot, change_summary, created_by
  ) VALUES (
    wi_id, new_revision, snapshot_data, change_desc, user_id
  );

  -- Update current revision in main table
  UPDATE work_instructions SET current_revision = new_revision, updated_by = user_id WHERE id = wi_id;

  RETURN new_revision;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_wi_revision_snapshot IS 'Creates a new revision with snapshot of current steps';

-- ============================================================================
-- 12. SEED: Risk Assessment criteria definitions (for UI reference)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_instruction_risk_criteria_definitions (
  id SERIAL PRIMARY KEY,
  criteria_key VARCHAR(50) NOT NULL UNIQUE,
  criteria_name VARCHAR(100) NOT NULL,
  description TEXT,
  score_guide TEXT,
  display_order INTEGER DEFAULT 0
);

INSERT INTO work_instruction_risk_criteria_definitions (criteria_key, criteria_name, description, score_guide, display_order)
VALUES
  ('inspection_method', 'Método de Inspección', 'Tipo de inspección utilizada', 'Visual simple (9-10), Doble visual (6-8), Poka-Yoke (3-5), Auto-reject (1-2)', 1),
  ('detection_complexity', 'Complejidad de Detección', 'Dificultad para detectar defectos y cantidad de puntos a revisar', 'Difícil (8-10), Semi-difícil (5-7), Fácil (2-4), Sin dificultad (1)', 2),
  ('product_variability', 'Variabilidad de Producto', 'Cantidad de part numbers y frecuencia de cambio', 'Alta variación >10 P/N (8-10), Media 5-9 P/N (5-7), Baja 2-4 P/N (3-4), Un solo P/N (1-2)', 3),
  ('visual_aids', 'Ayudas Visuales', 'Disponibilidad de muestras límite, Quality Alerts, WI', 'Sin ayudas (8-10), Parciales (5-7), Disponibles (3-4), Completas y accesibles (1-2)', 4),
  ('equipment', 'Equipamiento', 'Calibración de gauges y control de herramientas', 'Sin calibración (8-10), Parcial (5-7), Calibrado sin control (3-4), Calibrado y controlado (1-2)', 5),
  ('work_environment', 'Ambiente de Trabajo', 'Iluminación, temperatura, ruido, seguridad', 'Deficiente (8-10), Regular (5-7), Bueno (3-4), Óptimo (1-2)', 6),
  ('process_flow', 'Flujo de Proceso', 'Segregación, control post-inspección, manejo de retrabajo', 'Sin control (8-10), Control parcial (5-7), Controlado (3-4), Completamente controlado (1-2)', 7),
  ('human_factor', 'Factor Humano', 'Idioma, entrenamiento, rotación de personal', 'Problemas severos (8-10), Algunos problemas (5-7), Bien manejado (3-4), Sin problemas (1-2)', 8)
ON CONFLICT (criteria_key) DO UPDATE SET
  criteria_name = EXCLUDED.criteria_name,
  description = EXCLUDED.description,
  score_guide = EXCLUDED.score_guide,
  display_order = EXCLUDED.display_order;

COMMENT ON TABLE work_instruction_risk_criteria_definitions IS 'Reference definitions for risk assessment criteria';
