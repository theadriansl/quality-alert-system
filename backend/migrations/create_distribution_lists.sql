-- Migration: Create distribution lists table for email notifications
-- This table stores reusable distribution lists for D3-MFG notifications

CREATE TABLE IF NOT EXISTS distribution_lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE, -- Nombre de la lista (ej: "Jefes de Turno A", "Equipo Calidad")
  description TEXT, -- Descripción opcional de para qué se usa la lista
  user_ids INTEGER[] NOT NULL DEFAULT '{}', -- Array de IDs de usuarios del sistema
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por nombre
CREATE INDEX IF NOT EXISTS idx_distribution_lists_name ON distribution_lists(name);

-- Índice para buscar listas creadas por un usuario específico
CREATE INDEX IF NOT EXISTS idx_distribution_lists_created_by ON distribution_lists(created_by);

-- Agregar columna a eightd_reports para almacenar la lista de distribución seleccionada
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d3_mfg_distribution_list_id INTEGER REFERENCES distribution_lists(id) ON DELETE SET NULL;

-- Comentarios para documentación
COMMENT ON TABLE distribution_lists IS 'Listas de distribución reutilizables para notificaciones de D3-MFG';
COMMENT ON COLUMN distribution_lists.name IS 'Nombre único de la lista de distribución';
COMMENT ON COLUMN distribution_lists.user_ids IS 'Array de IDs de usuarios que recibirán notificaciones';
COMMENT ON COLUMN eightd_reports.d3_mfg_distribution_list_id IS 'ID de la lista de distribución para notificaciones de D3-MFG';
