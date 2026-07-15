-- ============================================================================
-- Migration: 110_mrb_affected_serials.sql
-- Date: 2026-07-15
-- Description: Tabla para seriales afectados por campaña MRB (lista de piezas
--              a inspeccionar, no confundir con resultados de inspección)
-- ============================================================================

-- Tabla para almacenar seriales afectados que necesitan ser inspeccionados
CREATE TABLE IF NOT EXISTS mrb_affected_serials (
    id SERIAL PRIMARY KEY,
    mrb_campaign_id INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    part_id INTEGER REFERENCES client_parts(id),
    lot_number VARCHAR(100),
    notes VARCHAR(500),
    inspected BOOLEAN DEFAULT FALSE,
    inspected_at TIMESTAMP,
    inspection_result VARCHAR(20), -- OK, NOK, SCRAP, REWORK, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    UNIQUE(mrb_campaign_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_mrb_affected_serials_campaign ON mrb_affected_serials(mrb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_mrb_affected_serials_serial ON mrb_affected_serials(serial_number);
CREATE INDEX IF NOT EXISTS idx_mrb_affected_serials_inspected ON mrb_affected_serials(mrb_campaign_id, inspected);

COMMENT ON TABLE mrb_affected_serials IS 'Lista de seriales afectados que requieren inspección en una campaña MRB';
COMMENT ON COLUMN mrb_affected_serials.inspected IS 'true cuando el serial ya fue inspeccionado';
COMMENT ON COLUMN mrb_affected_serials.inspection_result IS 'Resultado de la inspección: OK, NOK, SCRAP, REWORK, HOLD, USE_AS_IS';

SELECT 'Migration 110_mrb_affected_serials.sql completed successfully' as status;
