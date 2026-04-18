-- Agregar campos de inventario a la tabla eightd_parts
-- Para rastrear cantidades afectadas en diferentes ubicaciones

ALTER TABLE eightd_parts
ADD COLUMN IF NOT EXISTS qty_warehouse INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_in_process INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_in_transit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_with_customer INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_affected_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_impact DECIMAL(12, 2) DEFAULT 0.00;

-- Comentarios para documentación
COMMENT ON COLUMN eightd_parts.qty_warehouse IS 'Cantidad de partes afectadas en almacén';
COMMENT ON COLUMN eightd_parts.qty_in_process IS 'Cantidad de partes afectadas en proceso de manufactura';
COMMENT ON COLUMN eightd_parts.qty_in_transit IS 'Cantidad de partes afectadas en tránsito';
COMMENT ON COLUMN eightd_parts.qty_with_customer IS 'Cantidad de partes afectadas con el cliente';
COMMENT ON COLUMN eightd_parts.total_affected_qty IS 'Total de partes afectadas (suma de todas las ubicaciones)';
COMMENT ON COLUMN eightd_parts.total_cost_impact IS 'Impacto total de costo (total_affected_qty * unit_cost)';
