-- ============================================================================
-- Migration 101: Add alert_user_id and source_8d_id to transfer_packages
-- ============================================================================

-- Usuario que debe recibir la alerta si no se recibe el paquete a tiempo
ALTER TABLE transfer_packages
ADD COLUMN IF NOT EXISTS alert_user_id INTEGER REFERENCES users(id);

-- Referencia al 8D de origen (opcional)
ALTER TABLE transfer_packages
ADD COLUMN IF NOT EXISTS source_8d_id INTEGER REFERENCES eightd_reports(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transfer_packages_alert_user ON transfer_packages(alert_user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_packages_source_8d ON transfer_packages(source_8d_id);

COMMENT ON COLUMN transfer_packages.alert_user_id IS 'Usuario a notificar si el paquete excede el tiempo de alerta';
COMMENT ON COLUMN transfer_packages.source_8d_id IS 'Referencia al 8D de origen (opcional)';
