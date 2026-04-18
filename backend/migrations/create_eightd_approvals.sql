-- Tabla de aprobaciones para 8D Reports
-- Soporta flujo de aprobación en cascada para Issue, Countermeasure, Confirmation

CREATE TABLE IF NOT EXISTS eightd_approvals (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES eightd_reports(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL CHECK (section IN ('issue', 'countermeasure', 'confirmation')),
  approver_level INTEGER NOT NULL CHECK (approver_level IN (1, 2, 3)),
  user_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_eightd_approvals_report_id ON eightd_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_eightd_approvals_section ON eightd_approvals(section);
CREATE INDEX IF NOT EXISTS idx_eightd_approvals_user_id ON eightd_approvals(user_id);

-- Agregar columna 'status' a la tabla eightd_reports
-- Esta columna manejará los 15 estados del flujo de aprobación
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'
CHECK (status IN (
  'draft',
  'issue_approval_1',
  'issue_approval_2',
  'issue_approval_3',
  'issue_approved',
  'countermeasure_in_progress',
  'countermeasure_approval_1',
  'countermeasure_approval_2',
  'countermeasure_approval_3',
  'countermeasure_approved',
  'confirmation_in_progress',
  'confirmation_approval_1',
  'confirmation_approval_2',
  'confirmation_approval_3',
  'closed'
));

-- Comentarios para documentación
COMMENT ON TABLE eightd_approvals IS 'Historial de aprobaciones/rechazos para cada reporte 8D';
COMMENT ON COLUMN eightd_approvals.section IS 'Sección del 8D: issue, countermeasure, o confirmation';
COMMENT ON COLUMN eightd_approvals.approver_level IS 'Nivel del aprobador: 1, 2, o 3';
COMMENT ON COLUMN eightd_approvals.action IS 'Acción tomada: approved o rejected';
COMMENT ON COLUMN eightd_approvals.comments IS 'Comentarios del aprobador (obligatorio en rechazos)';
