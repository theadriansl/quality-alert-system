-- ============================================================================
-- Migration: 016_seed_bom_field_config.sql
-- Date: 2026-02-02
-- Description: Seed initial custom fields from existing BOM data
--              These are the 20 configurable fields (admin-managed)
--              Fixed fields (Activo, Cliente, Numero Parte, Nombre, etc.)
--              are NOT included here - they are hardcoded in the system
-- ============================================================================

-- Insert the 20 custom fields found in existing BOM data
INSERT INTO bom_field_config (field_name, field_key, field_type, display_order, description, is_active)
VALUES
  ('ECR Number', 'ECR Number', 'text', 1, 'Engineering Change Request number', true),
  ('ECR#', 'ECR#', 'text', 2, 'ECR reference number (alternate format)', true),
  ('Drawing Number', 'Drawing Number', 'text', 3, 'Drawing document number', true),
  ('Drawing#', 'Drawing#', 'text', 4, 'Drawing reference (alternate format)', true),
  ('Material', 'Material', 'text', 5, 'Material type or specification', true),
  ('Supplier', 'Supplier', 'text', 6, 'Supplier name', true),
  ('Supplier Code', 'Supplier Code', 'text', 7, 'Supplier identification code', true),
  ('Part Type', 'Part Type', 'text', 8, 'Type/category of part', true),
  ('Tool Number', 'Tool Number', 'text', 9, 'Associated tool number', true),
  ('Cavity', 'Cavity', 'number', 10, 'Number of cavities (for molded parts)', true),
  ('Cycle Time (sec)', 'Cycle Time (sec)', 'number', 11, 'Manufacturing cycle time in seconds', true),
  ('Lead Time (weeks)', 'Lead Time (weeks)', 'number', 12, 'Lead time in weeks', true),
  ('MOQ', 'MOQ', 'number', 13, 'Minimum Order Quantity', true),
  ('Finish', 'Finish', 'text', 14, 'Surface finish specification', true),
  ('Surface Treatment', 'Surface Treatment', 'text', 15, 'Surface treatment type', true),
  ('Heat Treatment', 'Heat Treatment', 'text', 16, 'Heat treatment specification', true),
  ('Hardness', 'Hardness', 'text', 17, 'Hardness specification', true),
  ('ROHS Compliant', 'ROHS Compliant', 'boolean', 18, 'ROHS compliance status', true),
  ('LVL BOM', 'LVL BOM', 'number', 19, 'BOM Level (legacy field)', true),
  ('Last Updated', 'Last Updated', 'date', 20, 'Last update date', true)
ON CONFLICT (field_key) DO NOTHING;

-- ============================================================================
-- NOTA: Los campos FIJOS del sistema NO estan aqui:
-- - is_active (Activo)
-- - client_id (Cliente)
-- - part_number (Numero de Parte)
-- - name (Nombre)
-- - description (Descripcion)
-- - revision (Revision)
-- - bom_level (LVL BOM) - campo de tabla, diferente al custom field
-- - unit_cost (Costo)
-- ============================================================================
