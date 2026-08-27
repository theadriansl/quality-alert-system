-- Migration 172: Station Traceability Report Type
-- Adds new report type for multi-station traceability with full event history

INSERT INTO report_types (code, name, description, available_formats, requires_params, display_order) VALUES
  ('station_traceability', 'Trazabilidad por Estaciones', 'Historial completo por serial: inspecciones, defectos, reparaciones, liberaciones. Multi-estación seleccionable.', ARRAY['xlsx'], ARRAY['dateFrom', 'dateTo'], 8)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

COMMENT ON TABLE report_types IS 'Catálogo de tipos de reportes disponibles en ReportCenter';
