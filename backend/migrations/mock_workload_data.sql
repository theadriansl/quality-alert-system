-- ============================================================
-- MOCK WORKLOAD DATA - Datos realistas para demo
-- Fecha base: 2026-04-08
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USER CONFIG (horas disponibles por semana)
-- ============================================================
INSERT INTO workload_user_config (user_id, hours_per_week, overtime_threshold)
VALUES
  (1,  45, 50),  -- Adrian Salazar - Director
  (2,  45, 50),  -- Robert - Maintenance
  (3,  45, 48),  -- Quality Engineer
  (4,  40, 45),  -- Quality Technician
  (5,  45, 48),  -- Production Supervisor
  (6,  40, 45),  -- Quality Analyst
  (7,  45, 50),  -- John Quality
  (8,  45, 48),  -- Maria Engineer
  (9,  45, 50),  -- David Supervisor
  (10, 40, 45),  -- Sarah Analyst
  (11, 40, 45),  -- Michael Technician
  (12, 45, 48)   -- Juan Perez
ON CONFLICT (user_id) DO UPDATE
  SET hours_per_week = EXCLUDED.hours_per_week,
      overtime_threshold = EXCLUDED.overtime_threshold;

-- ============================================================
-- 2. PROJECTS
-- ============================================================
INSERT INTO workload_projects (name, description, client, status, start_date, end_date, manager_id, color)
VALUES
  ('Reducción de Scrap Q2', 'Reducir scrap de línea 3 de 4.2% a 2%', 'Interno', 'active', '2026-03-01', '2026-06-30', 1, '#10b981'),
  ('Certificación IATF', 'Preparación y auditoría de certificación IATF 16949', 'Bureau Veritas', 'active', '2026-01-15', '2026-07-31', 1, '#8b5cf6'),
  ('Optimización de Línea 2', 'Mejora de OEE en línea 2 de 68% a 82%', 'Interno', 'active', '2026-02-01', '2026-05-31', 9, '#3b82f6'),
  ('Capacitación MSA', 'Entrenamiento sistema de medición para equipo de calidad', 'Interno', 'active', '2026-04-01', '2026-04-30', 7, '#f59e0b')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. ACTIVITIES - Mix realista de estados, KPIs y fechas
-- ============================================================

-- Adrian Salazar (ID 1) - Director - SOBRECARGADO esta semana
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Revisión de KPIs Q1 2026', 'Análisis y cierre de indicadores del primer trimestre', 'planned', 1, NULL, 1, 1, '2026-03-25', '2026-04-03', 8, 8, 100, 'completed', 'high', 1),
  ('Junta mensual dirección', 'Presentación de resultados mensuales a dirección general', 'recurring', 3, NULL, 1, 1, '2026-04-01', '2026-04-01', 4, 4, 100, 'completed', 'critical', 1),
  ('Aprobación presupuesto mantenimiento', 'Revisión y aprobación de presupuesto Q2', 'assigned', 2, NULL, 1, 1, '2026-04-05', '2026-04-10', 6, 3, 50, 'in_progress', 'high', 1),
  ('Reunión con Bureau Veritas - IATF', 'Pre-auditoría de certificación IATF 16949', 'planned', 1, 5, 1, 1, '2026-04-07', '2026-04-08', 8, 4, 50, 'in_progress', 'critical', 1),
  ('Revisión 8D críticos abiertos', 'Seguimiento a 8Ds con cliente pendientes de cierre', 'planned', 1, NULL, 1, 1, '2026-04-08', '2026-04-09', 6, 0, 0, 'in_progress', 'high', 1),
  ('Plan estratégico calidad H2', 'Definición de objetivos y estrategia calidad segundo semestre', 'planned', 1, NULL, 1, 1, '2026-04-14', '2026-04-25', 20, 0, 0, 'pending', 'high', 1),
  ('Entrevista candidato Ing. Calidad', 'Panel de entrevista para vacante de ingeniería', 'unplanned', 5, NULL, 1, 1, '2026-04-08', '2026-04-08', 3, 0, 0, 'pending', 'medium', 1);

-- Robert (ID 2) - Maintenance - carga normal
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Mantenimiento preventivo prensa 1', 'PM semestral prensa hidráulica línea 1', 'planned', 3, NULL, 2, 1, '2026-03-20', '2026-03-22', 16, 16, 100, 'completed', 'high', 2),
  ('Calibración instrumentos medición', 'Calibración trimestral de micrómetros y vernier', 'recurring', 1, NULL, 2, 2, '2026-04-01', '2026-04-03', 12, 12, 100, 'completed', 'medium', 2),
  ('Reparación compresor línea 2', 'Falla en compresor principal - correctivo urgente', 'unplanned', 4, NULL, 2, 1, '2026-04-06', '2026-04-07', 8, 8, 100, 'completed', 'critical', 2),
  ('Actualización plan de mantenimiento', 'Revisión y actualización de plan PM anual', 'planned', 3, NULL, 2, 2, '2026-04-08', '2026-04-10', 10, 2, 20, 'in_progress', 'medium', 2),
  ('Orden de compra refacciones críticas', 'Gestión de OC para refacciones de alto impacto', 'assigned', 2, NULL, 2, 1, '2026-04-09', '2026-04-12', 6, 0, 0, 'pending', 'high', 2),
  ('Inspección eléctrica panel control', 'Revisión anual de tableros eléctricos', 'planned', 4, NULL, 2, 2, '2026-04-15', '2026-04-17', 14, 0, 0, 'pending', 'high', 2);

-- Quality Engineer (ID 3) - carga normal
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Análisis Cpk línea 3 - parte 4521', 'Estudio de capacidad de proceso mensual', 'planned', 1, 4, 3, 7, '2026-04-01', '2026-04-04', 10, 10, 100, 'completed', 'high', 7),
  ('8D reporte cliente Ford - DR-2026-041', 'Elaboración y seguimiento 8D por rechazo cliente', 'assigned', 1, NULL, 3, 7, '2026-04-03', '2026-04-11', 16, 8, 50, 'in_progress', 'critical', 7),
  ('Auditoría interna proceso soldadura', 'Auditoría de proceso según IATF', 'planned', 1, 5, 3, 3, '2026-04-09', '2026-04-10', 8, 0, 0, 'pending', 'high', 7),
  ('Actualización AMEF proceso inyección', 'Revisión AMEF por cambio de material en P/N 8821', 'planned', 1, NULL, 3, 3, '2026-04-14', '2026-04-18', 20, 0, 0, 'pending', 'medium', 3),
  ('Capacitación MSA Gage R&R', 'Entrenamiento en análisis de sistema de medición', 'planned', 5, 7, 3, 7, '2026-04-22', '2026-04-23', 8, 0, 0, 'pending', 'medium', 7);

-- Quality Technician (ID 4) - SOBRECARGADO
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Inspección de primera pieza turno A', 'First article inspection diaria turno matutino', 'recurring', 1, NULL, 4, 3, '2026-03-31', '2026-04-04', 10, 10, 100, 'completed', 'high', 3),
  ('Muestreo AQL lote 2290 - cliente GM', 'Inspección de aceptación por muestreo lote salida', 'assigned', 1, NULL, 4, 3, '2026-04-07', '2026-04-07', 6, 6, 100, 'completed', 'critical', 3),
  ('Registro de datos SPC línea 1 y 2', 'Captura y graficado de datos de control estadístico', 'recurring', 1, NULL, 4, 3, '2026-04-08', '2026-04-11', 16, 2, 15, 'in_progress', 'high', 3),
  ('Calibración bloques patrón', 'Verificación dimensional de bloques calibración', 'planned', 1, NULL, 4, 3, '2026-04-08', '2026-04-09', 8, 0, 0, 'in_progress', 'medium', 3),
  ('Apoyo auditoría interna proceso', 'Soporte técnico durante auditoría IATF', 'assigned', 1, 5, 4, 3, '2026-04-09', '2026-04-10', 10, 0, 0, 'pending', 'high', 3),
  ('Inspección recibo materiales semana', 'Incoming inspection materiales proveedores', 'recurring', 1, NULL, 4, 4, '2026-04-08', '2026-04-12', 15, 0, 0, 'pending', 'high', 4);

-- Production Supervisor (ID 5) - carga alta
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Reporte OEE semanal líneas 1-3', 'Cálculo y análisis de OEE semanal', 'recurring', 3, 6, 5, 5, '2026-03-31', '2026-04-04', 8, 8, 100, 'completed', 'high', 5),
  ('Implementación SMED prensa 3', 'Reducción de tiempo de cambio de herramental', 'planned', 3, 6, 5, 9, '2026-04-01', '2026-04-15', 24, 12, 50, 'in_progress', 'high', 9),
  ('Investigación rechazo cliente - lote 2287', 'Análisis de causa raíz por devolución', 'unplanned', 1, NULL, 5, 1, '2026-04-07', '2026-04-09', 10, 4, 40, 'in_progress', 'critical', 1),
  ('Capacitación operadores nueva plantilla', 'Entrenamiento en procedimiento actualizado P-014', 'planned', 5, NULL, 5, 5, '2026-04-10', '2026-04-11', 8, 0, 0, 'pending', 'medium', 5),
  ('Balance de línea turno nocturno', 'Análisis y balanceo de carga en turno C', 'planned', 3, 6, 5, 9, '2026-04-14', '2026-04-16', 12, 0, 0, 'pending', 'medium', 9);

-- Quality Analyst (ID 6)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Dashboard métricas calidad Q1', 'Elaboración de reporte ejecutivo Q1', 'planned', 1, NULL, 6, 2, '2026-03-28', '2026-04-04', 16, 16, 100, 'completed', 'high', 2),
  ('Análisis Pareto rechazos marzo', 'Pareto de defectos por familia de producto', 'planned', 1, NULL, 6, 2, '2026-04-07', '2026-04-09', 10, 5, 50, 'in_progress', 'high', 2),
  ('Actualización KPIs tablero visual', 'Actualización de tablero físico y digital', 'recurring', 1, NULL, 6, 6, '2026-04-08', '2026-04-08', 4, 0, 0, 'in_progress', 'medium', 6),
  ('Análisis costo de calidad Q1', 'Cálculo COQ: prevención, evaluación, fallas', 'planned', 2, NULL, 6, 2, '2026-04-13', '2026-04-17', 18, 0, 0, 'pending', 'high', 2),
  ('Reporte PPM cliente mensual', 'Cálculo y envío de PPM a clientes clave', 'recurring', 1, NULL, 6, 6, '2026-04-28', '2026-04-30', 8, 0, 0, 'pending', 'medium', 6);

-- John Quality (ID 7) - SOBRECARGADO
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Plan de control revisión anual', 'Actualización de planes de control familia A', 'planned', 1, 5, 7, 1, '2026-03-24', '2026-04-04', 24, 24, 100, 'completed', 'high', 1),
  ('Auditoría proveedor Metales SA', 'Auditoría de sistema de calidad en planta', 'planned', 1, NULL, 7, 1, '2026-04-02', '2026-04-03', 16, 16, 100, 'completed', 'critical', 1),
  ('PPAP cliente Stellantis - P/N 9934', 'Elaboración y envío de PPAP nivel 3', 'assigned', 1, NULL, 7, 1, '2026-04-07', '2026-04-14', 32, 10, 30, 'in_progress', 'critical', 1),
  ('Revisión estándares de inspección', 'Actualización de criterios visuales línea 2', 'planned', 1, 5, 7, 7, '2026-04-08', '2026-04-11', 16, 2, 10, 'in_progress', 'high', 7),
  ('Entrenamiento MSA equipo calidad', 'Facilitación de curso Gage R&R', 'planned', 5, 7, 7, 1, '2026-04-22', '2026-04-23', 16, 0, 0, 'pending', 'medium', 1),
  ('Respuesta portal cliente GM - DR04', 'Respuesta a discrepancia en portal proveedor', 'unplanned', 1, NULL, 7, 1, '2026-04-08', '2026-04-09', 8, 0, 0, 'in_progress', 'critical', 1);

-- Maria Engineer (ID 8)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Validación DOE reducción variación', 'Diseño y análisis de experimento P/N 4521', 'planned', 1, 4, 8, 7, '2026-03-25', '2026-04-08', 28, 20, 70, 'in_progress', 'high', 7),
  ('Estudio capacidad proceso nuevos moldes', 'Cpk inicial para moldes nuevos inyección', 'planned', 1, NULL, 8, 8, '2026-04-09', '2026-04-14', 16, 0, 0, 'pending', 'high', 8),
  ('Certificación interna auditor IATF', 'Completar certificación como auditor interno', 'planned', 5, 5, 8, 1, '2026-04-15', '2026-04-17', 24, 0, 0, 'pending', 'medium', 1),
  ('Análisis sistema medición CMM', 'Estudio R&R en máquina de medición coordenadas', 'assigned', 1, NULL, 8, 7, '2026-04-22', '2026-04-25', 16, 0, 0, 'pending', 'medium', 7);

-- David Supervisor (ID 9) - Manager Production
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Revisión indicadores producción semana', 'Análisis OEE, scrap, downtime semanal', 'recurring', 3, 6, 9, 9, '2026-03-31', '2026-04-04', 10, 10, 100, 'completed', 'high', 9),
  ('Implementación 5S área soldadura', 'Campaña 5S con seguimiento fotográfico', 'planned', 4, NULL, 9, 1, '2026-04-01', '2026-04-18', 20, 10, 50, 'in_progress', 'medium', 1),
  ('Seguimiento acciones correctivas abiertas', 'Revisión de 12 acciones correctivas pendientes', 'planned', 1, NULL, 9, 1, '2026-04-08', '2026-04-10', 12, 2, 15, 'in_progress', 'high', 1),
  ('Junta operativa diaria - semana', 'Coordinación de turno y resolución de bloqueos', 'recurring', 3, NULL, 9, 9, '2026-04-08', '2026-04-12', 10, 0, 0, 'in_progress', 'high', 9),
  ('Plan de producción mayo', 'Elaboración de plan maestro producción mayo', 'planned', 3, NULL, 9, 9, '2026-04-21', '2026-04-25', 16, 0, 0, 'pending', 'high', 9),
  ('Reducción downtime no programado', 'Análisis y plan de acción para reducir paros', 'planned', 3, 6, 9, 1, '2026-04-14', '2026-04-30', 24, 0, 0, 'pending', 'high', 1);

-- Sarah Analyst (ID 10)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Reporte scrap semanal líneas 1-3', 'Análisis y reporte de desperdicio por turno', 'recurring', 2, NULL, 10, 9, '2026-03-31', '2026-04-04', 8, 8, 100, 'completed', 'high', 9),
  ('Análisis tendencia defectos Q1', 'Tendencias de defectos por familia de parte', 'planned', 1, NULL, 10, 9, '2026-04-07', '2026-04-10', 14, 6, 40, 'in_progress', 'medium', 9),
  ('Actualización base datos proveedores', 'Actualización de scorecard proveedores Q1', 'planned', 1, NULL, 10, 6, '2026-04-08', '2026-04-12', 16, 0, 0, 'in_progress', 'medium', 6),
  ('Indicadores seguridad abril', 'Captura y análisis de KPIs seguridad del mes', 'recurring', 4, NULL, 10, 9, '2026-04-28', '2026-04-30', 6, 0, 0, 'pending', 'medium', 9);

-- Michael Technician (ID 11)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Análisis laboratorio muestras semana 13', 'Ensayos físicos y químicos lotes producción', 'recurring', 1, NULL, 11, 2, '2026-03-31', '2026-04-04', 20, 20, 100, 'completed', 'high', 2),
  ('Calificación proveedor nuevo material', 'Pruebas de calificación material sustituto', 'planned', 1, NULL, 11, 2, '2026-04-07', '2026-04-11', 18, 8, 45, 'in_progress', 'high', 2),
  ('Mantenimiento equipo laboratorio', 'PM mensual equipos de prueba laboratorio', 'recurring', 3, NULL, 11, 11, '2026-04-14', '2026-04-15', 8, 0, 0, 'pending', 'medium', 11),
  ('Correlación métodos prueba cliente', 'Ejercicio de correlación con laboratorio cliente', 'planned', 1, NULL, 11, 2, '2026-04-21', '2026-04-24', 16, 0, 0, 'pending', 'high', 2);

-- Juan Perez (ID 12)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, created_by)
VALUES
  ('Documentación procedimientos actualizados', 'Transcripción y formato de 8 procedimientos', 'assigned', 1, 5, 12, 2, '2026-04-01', '2026-04-08', 20, 16, 80, 'in_progress', 'medium', 2),
  ('Control de documentos mes abril', 'Registro y distribución de documentos nuevos', 'recurring', 1, NULL, 12, 12, '2026-04-08', '2026-04-12', 10, 0, 0, 'in_progress', 'medium', 12),
  ('Apoyo preparación auditoría IATF', 'Soporte en organización de evidencias', 'assigned', 1, 5, 12, 2, '2026-04-13', '2026-04-20', 24, 0, 0, 'pending', 'high', 2),
  ('Actualización matriz de capacitación', 'Actualización de skill matrix toda la planta', 'planned', 5, NULL, 12, 2, '2026-04-21', '2026-04-30', 16, 0, 0, 'pending', 'low', 2);

COMMIT;

SELECT 'Mock data insertado correctamente' as resultado,
       (SELECT COUNT(*) FROM workload_activities) as total_actividades,
       (SELECT COUNT(*) FROM workload_user_config) as usuarios_configurados;
