-- ============================================================
-- MOCK WORKLOAD DATA - Agosto 2026
-- Fecha: 02-Sep-2026
-- Datos adicionales para alimentar dashboard con todos los estados
-- Resultado positivo (tareas completadas a tiempo o adelantadas)
-- ============================================================

BEGIN;

-- ============================================================
-- ACTIVITIES - Agosto 2026 - Todos los estados, resultado positivo
-- ============================================================

-- Adrian Salazar (ID 1) - Director
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Revisión presupuesto Q3', 'Análisis y aprobación de presupuesto tercer trimestre', 'planned', 1, NULL, 1, 1, '2026-08-01', '2026-08-05', 12, 10, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":25},{"date":"2026-08-03","progress":60},{"date":"2026-08-05","progress":100}]', 1, '2026-08-01'),
  ('Junta directiva mensual agosto', 'Presentación resultados julio a dirección', 'recurring', 3, NULL, 1, 1, '2026-08-10', '2026-08-10', 4, 4, 100, 'completed', 'critical', '[{"date":"2026-08-10","progress":100}]', 1, '2026-08-08'),
  ('Auditoría sorpresa línea 2', 'Auditoría no programada por incidente cliente', 'unplanned', 1, NULL, 1, 1, '2026-08-12', '2026-08-14', 8, 7, 100, 'completed', 'critical', '[{"date":"2026-08-12","progress":40},{"date":"2026-08-14","progress":100}]', 1, '2026-08-12'),
  ('Plan estratégico H2 finalización', 'Cierre de plan estratégico segundo semestre', 'planned', 1, NULL, 1, 1, '2026-08-18', '2026-08-25', 16, 14, 100, 'completed', 'high', '[{"date":"2026-08-18","progress":20},{"date":"2026-08-20","progress":50},{"date":"2026-08-23","progress":80},{"date":"2026-08-25","progress":100}]', 1, '2026-08-15'),
  ('Revisión 8D críticos agosto', 'Seguimiento 8Ds abiertos con clientes', 'planned', 1, NULL, 1, 1, '2026-08-26', '2026-08-28', 6, 5, 100, 'completed', 'high', '[{"date":"2026-08-26","progress":50},{"date":"2026-08-28","progress":100}]', 1, '2026-08-24');

-- Robert (ID 2) - Maintenance
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('PM trimestral prensa 2', 'Mantenimiento preventivo prensa hidráulica 2', 'planned', 3, NULL, 2, 1, '2026-08-03', '2026-08-06', 20, 18, 100, 'completed', 'high', '[{"date":"2026-08-03","progress":30},{"date":"2026-08-05","progress":70},{"date":"2026-08-06","progress":100}]', 2, '2026-08-01'),
  ('Calibración agosto instrumentos', 'Calibración mensual de equipos de medición', 'recurring', 1, NULL, 2, 2, '2026-08-10', '2026-08-12', 10, 9, 100, 'completed', 'medium', '[{"date":"2026-08-10","progress":40},{"date":"2026-08-12","progress":100}]', 2, '2026-08-08'),
  ('Reparación urgente CNC', 'Falla en husillo CNC línea 1 - correctivo', 'unplanned', 4, NULL, 2, 1, '2026-08-15', '2026-08-16', 12, 11, 100, 'completed', 'critical', '[{"date":"2026-08-15","progress":60},{"date":"2026-08-16","progress":100}]', 2, '2026-08-15'),
  ('Actualización inventario refacciones', 'Conteo físico y actualización sistema', 'planned', 3, NULL, 2, 2, '2026-08-20', '2026-08-23', 14, 12, 100, 'completed', 'medium', '[{"date":"2026-08-20","progress":30},{"date":"2026-08-22","progress":70},{"date":"2026-08-23","progress":100}]', 2, '2026-08-18'),
  ('Capacitación operadores mantto básico', 'TPM nivel 1 para operadores', 'planned', 5, NULL, 2, 1, '2026-08-27', '2026-08-29', 8, 8, 100, 'completed', 'medium', '[{"date":"2026-08-27","progress":40},{"date":"2026-08-29","progress":100}]', 2, '2026-08-25');

-- Quality Engineer (ID 3)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Estudio Cpk agosto línea 3', 'Análisis capacidad proceso mensual', 'recurring', 1, NULL, 3, 7, '2026-08-01', '2026-08-04', 10, 9, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":25},{"date":"2026-08-03","progress":70},{"date":"2026-08-04","progress":100}]', 7, '2026-08-01'),
  ('8D cliente Stellantis DR-08-01', 'Respuesta 8D por rechazo dimensional', 'assigned', 1, NULL, 3, 7, '2026-08-05', '2026-08-12', 20, 18, 100, 'completed', 'critical', '[{"date":"2026-08-05","progress":15},{"date":"2026-08-08","progress":50},{"date":"2026-08-10","progress":80},{"date":"2026-08-12","progress":100}]', 7, '2026-08-05'),
  ('Auditoría proceso pintura', 'Auditoría interna IATF proceso pintura', 'planned', 1, NULL, 3, 3, '2026-08-14', '2026-08-15', 12, 11, 100, 'completed', 'high', '[{"date":"2026-08-14","progress":50},{"date":"2026-08-15","progress":100}]', 3, '2026-08-12'),
  ('AMEF actualización proceso soldadura', 'Revisión AMEF por nuevo equipo', 'planned', 1, NULL, 3, 3, '2026-08-19', '2026-08-26', 24, 22, 100, 'completed', 'high', '[{"date":"2026-08-19","progress":15},{"date":"2026-08-22","progress":45},{"date":"2026-08-24","progress":75},{"date":"2026-08-26","progress":100}]', 3, '2026-08-18'),
  ('Validación equipo medición nuevo', 'GRR equipo CMM actualizado', 'planned', 1, NULL, 3, 7, '2026-08-28', '2026-08-30', 10, 9, 100, 'completed', 'medium', '[{"date":"2026-08-28","progress":40},{"date":"2026-08-30","progress":100}]', 7, '2026-08-26');

-- Quality Technician (ID 4)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Inspección primera pieza agosto S1', 'FAI semana 1 agosto todos turnos', 'recurring', 1, NULL, 4, 3, '2026-08-01', '2026-08-07', 14, 14, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":15},{"date":"2026-08-04","progress":60},{"date":"2026-08-07","progress":100}]', 3, '2026-08-01'),
  ('Inspección primera pieza agosto S2', 'FAI semana 2 agosto todos turnos', 'recurring', 1, NULL, 4, 3, '2026-08-08', '2026-08-14', 14, 13, 100, 'completed', 'high', '[{"date":"2026-08-08","progress":15},{"date":"2026-08-11","progress":60},{"date":"2026-08-14","progress":100}]', 3, '2026-08-08'),
  ('Muestreo AQL lotes GM semana 3', 'Inspección aceptación lotes cliente GM', 'assigned', 1, NULL, 4, 3, '2026-08-18', '2026-08-22', 12, 11, 100, 'completed', 'critical', '[{"date":"2026-08-18","progress":20},{"date":"2026-08-20","progress":60},{"date":"2026-08-22","progress":100}]', 3, '2026-08-18'),
  ('Registro SPC agosto completo', 'Captura datos control estadístico mes', 'recurring', 1, NULL, 4, 3, '2026-08-25', '2026-08-30', 16, 15, 100, 'completed', 'high', '[{"date":"2026-08-25","progress":20},{"date":"2026-08-27","progress":55},{"date":"2026-08-30","progress":100}]', 3, '2026-08-25');

-- Production Supervisor (ID 5)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('OEE análisis julio cierre', 'Reporte OEE julio todas líneas', 'recurring', 3, NULL, 5, 5, '2026-08-01', '2026-08-04', 8, 7, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":30},{"date":"2026-08-03","progress":70},{"date":"2026-08-04","progress":100}]', 5, '2026-08-01'),
  ('SMED implementación prensa 4', 'Reducción setup prensa 4 de 45 a 20 min', 'planned', 3, NULL, 5, 9, '2026-08-05', '2026-08-18', 28, 25, 100, 'completed', 'high', '[{"date":"2026-08-05","progress":10},{"date":"2026-08-09","progress":35},{"date":"2026-08-13","progress":65},{"date":"2026-08-18","progress":100}]', 9, '2026-08-04'),
  ('Balanceo línea 3 turno B', 'Optimización carga trabajo turno vespertino', 'planned', 3, NULL, 5, 9, '2026-08-20', '2026-08-23', 12, 10, 100, 'completed', 'medium', '[{"date":"2026-08-20","progress":30},{"date":"2026-08-22","progress":70},{"date":"2026-08-23","progress":100}]', 9, '2026-08-19'),
  ('Reducción scrap inyección agosto', 'Plan de reducción scrap de 3.5% a 2%', 'planned', 2, NULL, 5, 1, '2026-08-25', '2026-08-30', 16, 14, 100, 'completed', 'high', '[{"date":"2026-08-25","progress":20},{"date":"2026-08-27","progress":55},{"date":"2026-08-30","progress":100}]', 1, '2026-08-24');

-- Quality Analyst (ID 6)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Dashboard calidad julio', 'Reporte ejecutivo métricas julio', 'planned', 1, NULL, 6, 2, '2026-08-01', '2026-08-06', 14, 12, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":20},{"date":"2026-08-04","progress":60},{"date":"2026-08-06","progress":100}]', 2, '2026-08-01'),
  ('Pareto rechazos julio análisis', 'Análisis Pareto defectos mes anterior', 'planned', 1, NULL, 6, 2, '2026-08-08', '2026-08-11', 10, 9, 100, 'completed', 'high', '[{"date":"2026-08-08","progress":35},{"date":"2026-08-10","progress":75},{"date":"2026-08-11","progress":100}]', 2, '2026-08-07'),
  ('Tablero visual actualización agosto', 'Actualización KPIs tablero planta', 'recurring', 1, NULL, 6, 6, '2026-08-14', '2026-08-15', 6, 5, 100, 'completed', 'medium', '[{"date":"2026-08-14","progress":50},{"date":"2026-08-15","progress":100}]', 6, '2026-08-13'),
  ('Costo calidad Q2 análisis', 'Reporte COQ segundo trimestre', 'planned', 2, NULL, 6, 2, '2026-08-18', '2026-08-25', 20, 18, 100, 'completed', 'high', '[{"date":"2026-08-18","progress":15},{"date":"2026-08-21","progress":45},{"date":"2026-08-23","progress":75},{"date":"2026-08-25","progress":100}]', 2, '2026-08-17'),
  ('PPM reporte agosto clientes', 'Cálculo PPM mensual clientes clave', 'recurring', 1, NULL, 6, 6, '2026-08-28', '2026-08-30', 8, 7, 100, 'completed', 'medium', '[{"date":"2026-08-28","progress":40},{"date":"2026-08-30","progress":100}]', 6, '2026-08-27');

-- John Quality (ID 7)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('PPAP cliente Ford P/N 1122', 'Elaboración PPAP nivel 3 parte nueva', 'assigned', 1, NULL, 7, 1, '2026-08-01', '2026-08-12', 36, 32, 100, 'completed', 'critical', '[{"date":"2026-08-01","progress":10},{"date":"2026-08-05","progress":35},{"date":"2026-08-08","progress":65},{"date":"2026-08-12","progress":100}]', 1, '2026-08-01'),
  ('Auditoría proveedor Aceros MX', 'Auditoría sistema calidad proveedor', 'planned', 1, NULL, 7, 1, '2026-08-14', '2026-08-15', 14, 13, 100, 'completed', 'high', '[{"date":"2026-08-14","progress":50},{"date":"2026-08-15","progress":100}]', 1, '2026-08-12'),
  ('Plan control actualización familia B', 'Revisión planes control productos B', 'planned', 1, NULL, 7, 7, '2026-08-18', '2026-08-23', 18, 16, 100, 'completed', 'high', '[{"date":"2026-08-18","progress":20},{"date":"2026-08-20","progress":55},{"date":"2026-08-23","progress":100}]', 7, '2026-08-17'),
  ('Estándar inspección visual nuevo', 'Desarrollo estándar visual defectos', 'planned', 1, NULL, 7, 7, '2026-08-25', '2026-08-29', 14, 12, 100, 'completed', 'medium', '[{"date":"2026-08-25","progress":25},{"date":"2026-08-27","progress":65},{"date":"2026-08-29","progress":100}]', 7, '2026-08-24');

-- Maria Engineer (ID 8)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('DOE optimización proceso agosto', 'Diseño experimento reducción variación', 'planned', 1, NULL, 8, 7, '2026-08-01', '2026-08-10', 24, 22, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":15},{"date":"2026-08-05","progress":50},{"date":"2026-08-08","progress":80},{"date":"2026-08-10","progress":100}]', 7, '2026-08-01'),
  ('Cpk inicial moldes nuevos', 'Estudio capacidad moldes agosto', 'planned', 1, NULL, 8, 8, '2026-08-12', '2026-08-18', 18, 16, 100, 'completed', 'high', '[{"date":"2026-08-12","progress":20},{"date":"2026-08-15","progress":60},{"date":"2026-08-18","progress":100}]', 8, '2026-08-11'),
  ('Certificación auditor interno', 'Examen certificación auditor IATF', 'planned', 5, NULL, 8, 1, '2026-08-20', '2026-08-22', 20, 18, 100, 'completed', 'medium', '[{"date":"2026-08-20","progress":30},{"date":"2026-08-21","progress":70},{"date":"2026-08-22","progress":100}]', 1, '2026-08-19'),
  ('MSA sistema medición óptico', 'Estudio R&R sistema visión', 'assigned', 1, NULL, 8, 7, '2026-08-25', '2026-08-30', 16, 14, 100, 'completed', 'medium', '[{"date":"2026-08-25","progress":25},{"date":"2026-08-28","progress":65},{"date":"2026-08-30","progress":100}]', 7, '2026-08-24');

-- David Supervisor (ID 9)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('KPIs producción julio cierre', 'Análisis indicadores julio completo', 'recurring', 3, NULL, 9, 9, '2026-08-01', '2026-08-04', 10, 9, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":30},{"date":"2026-08-03","progress":70},{"date":"2026-08-04","progress":100}]', 9, '2026-08-01'),
  ('5S auditoría agosto', 'Auditoría 5S mensual todas áreas', 'recurring', 4, NULL, 9, 1, '2026-08-08', '2026-08-10', 12, 11, 100, 'completed', 'medium', '[{"date":"2026-08-08","progress":35},{"date":"2026-08-09","progress":70},{"date":"2026-08-10","progress":100}]', 1, '2026-08-07'),
  ('Acciones correctivas seguimiento', 'Revisión CAPAs abiertas agosto', 'planned', 1, NULL, 9, 1, '2026-08-14', '2026-08-18', 14, 12, 100, 'completed', 'high', '[{"date":"2026-08-14","progress":25},{"date":"2026-08-16","progress":65},{"date":"2026-08-18","progress":100}]', 1, '2026-08-13'),
  ('Plan producción septiembre', 'Elaboración plan maestro septiembre', 'planned', 3, NULL, 9, 9, '2026-08-22', '2026-08-27', 18, 16, 100, 'completed', 'high', '[{"date":"2026-08-22","progress":20},{"date":"2026-08-25","progress":60},{"date":"2026-08-27","progress":100}]', 9, '2026-08-21'),
  ('Proyecto reducción downtime', 'Análisis y plan paros no programados', 'planned', 3, NULL, 9, 1, '2026-08-28', '2026-08-30', 10, 9, 100, 'completed', 'high', '[{"date":"2026-08-28","progress":35},{"date":"2026-08-29","progress":70},{"date":"2026-08-30","progress":100}]', 1, '2026-08-27');

-- Sarah Analyst (ID 10)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Scrap reporte semanal S1 agosto', 'Análisis scrap semana 1 agosto', 'recurring', 2, NULL, 10, 9, '2026-08-01', '2026-08-04', 8, 7, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":30},{"date":"2026-08-03","progress":70},{"date":"2026-08-04","progress":100}]', 9, '2026-08-01'),
  ('Tendencias defectos H1 2026', 'Análisis tendencias primer semestre', 'planned', 1, NULL, 10, 9, '2026-08-07', '2026-08-12', 16, 14, 100, 'completed', 'high', '[{"date":"2026-08-07","progress":20},{"date":"2026-08-09","progress":55},{"date":"2026-08-12","progress":100}]', 9, '2026-08-06'),
  ('Scorecard proveedores Q2', 'Actualización evaluación proveedores', 'planned', 1, NULL, 10, 6, '2026-08-14', '2026-08-20', 18, 16, 100, 'completed', 'medium', '[{"date":"2026-08-14","progress":20},{"date":"2026-08-17","progress":55},{"date":"2026-08-20","progress":100}]', 6, '2026-08-13'),
  ('KPIs seguridad agosto', 'Captura indicadores seguridad', 'recurring', 4, NULL, 10, 9, '2026-08-26', '2026-08-30', 8, 7, 100, 'completed', 'medium', '[{"date":"2026-08-26","progress":30},{"date":"2026-08-28","progress":70},{"date":"2026-08-30","progress":100}]', 9, '2026-08-25');

-- Michael Technician (ID 11)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Ensayos laboratorio S1 agosto', 'Pruebas físicas y químicas semana 1', 'recurring', 1, NULL, 11, 2, '2026-08-01', '2026-08-07', 22, 20, 100, 'completed', 'high', '[{"date":"2026-08-01","progress":15},{"date":"2026-08-04","progress":55},{"date":"2026-08-07","progress":100}]', 2, '2026-08-01'),
  ('Calificación material alternativo', 'Pruebas material sustituto proveedor B', 'planned', 1, NULL, 11, 2, '2026-08-10', '2026-08-16', 20, 18, 100, 'completed', 'high', '[{"date":"2026-08-10","progress":20},{"date":"2026-08-13","progress":60},{"date":"2026-08-16","progress":100}]', 2, '2026-08-09'),
  ('PM equipos laboratorio agosto', 'Mantenimiento preventivo equipos', 'recurring', 3, NULL, 11, 11, '2026-08-18', '2026-08-20', 10, 9, 100, 'completed', 'medium', '[{"date":"2026-08-18","progress":35},{"date":"2026-08-19","progress":70},{"date":"2026-08-20","progress":100}]', 11, '2026-08-17'),
  ('Correlación laboratorio cliente', 'Ejercicio correlación resultados', 'planned', 1, NULL, 11, 2, '2026-08-24', '2026-08-29', 18, 16, 100, 'completed', 'high', '[{"date":"2026-08-24","progress":20},{"date":"2026-08-26","progress":55},{"date":"2026-08-29","progress":100}]', 2, '2026-08-23');

-- Juan Perez (ID 12)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Documentación procedimientos agosto', 'Actualización 5 procedimientos calidad', 'assigned', 1, NULL, 12, 2, '2026-08-01', '2026-08-10', 22, 20, 100, 'completed', 'medium', '[{"date":"2026-08-01","progress":15},{"date":"2026-08-05","progress":50},{"date":"2026-08-08","progress":80},{"date":"2026-08-10","progress":100}]', 2, '2026-08-01'),
  ('Control documentos agosto', 'Registro distribución documentos mes', 'recurring', 1, NULL, 12, 12, '2026-08-12', '2026-08-16', 12, 11, 100, 'completed', 'medium', '[{"date":"2026-08-12","progress":25},{"date":"2026-08-14","progress":65},{"date":"2026-08-16","progress":100}]', 12, '2026-08-11'),
  ('Evidencias auditoría IATF', 'Organización evidencias para auditoría', 'assigned', 1, NULL, 12, 2, '2026-08-18', '2026-08-25', 26, 24, 100, 'completed', 'high', '[{"date":"2026-08-18","progress":15},{"date":"2026-08-21","progress":45},{"date":"2026-08-23","progress":75},{"date":"2026-08-25","progress":100}]', 2, '2026-08-17'),
  ('Skill matrix actualización', 'Actualización matriz capacitación', 'planned', 5, NULL, 12, 2, '2026-08-27', '2026-08-30', 14, 12, 100, 'completed', 'medium', '[{"date":"2026-08-27","progress":30},{"date":"2026-08-29","progress":70},{"date":"2026-08-30","progress":100}]', 2, '2026-08-26');

-- ============================================================
-- ALGUNAS ACTIVIDADES CON OTROS ESTADOS (in_progress, pending, cancelled)
-- para completar el dashboard
-- ============================================================

-- In Progress (iniciadas en agosto, siguen en septiembre)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Proyecto mejora continua Q3', 'Implementación mejoras identificadas', 'planned', 1, NULL, 1, 1, '2026-08-25', '2026-09-15', 40, 20, 50, 'in_progress', 'high', '[{"date":"2026-08-25","progress":10},{"date":"2026-08-28","progress":25},{"date":"2026-09-01","progress":50}]', 1, '2026-08-24'),
  ('Capacitación lean manufacturing', 'Curso lean para supervisores', 'planned', 5, NULL, 9, 1, '2026-08-28', '2026-09-10', 24, 10, 40, 'in_progress', 'medium', '[{"date":"2026-08-28","progress":15},{"date":"2026-09-01","progress":40}]', 1, '2026-08-27'),
  ('Actualización sistema calidad', 'Mejoras al sistema gestión calidad', 'planned', 1, NULL, 7, 1, '2026-08-26', '2026-09-08', 32, 18, 55, 'in_progress', 'high', '[{"date":"2026-08-26","progress":15},{"date":"2026-08-30","progress":35},{"date":"2026-09-02","progress":55}]', 1, '2026-08-25');

-- Pending (programadas para septiembre)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Auditoría externa IATF', 'Auditoría certificación tercera parte', 'planned', 1, NULL, 1, 1, '2026-09-15', '2026-09-18', 32, 0, 0, 'pending', 'critical', NULL, 1, '2026-08-20'),
  ('Revisión objetivos anuales', 'Mid-year review objetivos calidad', 'planned', 1, NULL, 1, 1, '2026-09-08', '2026-09-12', 16, 0, 0, 'pending', 'high', NULL, 1, '2026-08-25'),
  ('PPAP nuevo producto cliente GM', 'Preparación PPAP producto nuevo', 'assigned', 1, NULL, 7, 1, '2026-09-10', '2026-09-25', 40, 0, 0, 'pending', 'critical', NULL, 1, '2026-08-28');

-- Cancelled (canceladas pero registradas)
INSERT INTO workload_activities (title, description, activity_type, kpi_id, project_id, assigned_to, assigned_by, start_date, end_date, estimated_hours, actual_hours, progress, status, priority, daily_progress, created_by, created_at)
VALUES
  ('Visita planta proveedor China', 'Auditoría proveedor cancelada por restricciones', 'planned', 1, NULL, 7, 1, '2026-08-20', '2026-08-25', 40, 0, 0, 'cancelled', 'high', NULL, 1, '2026-08-10'),
  ('Proyecto automatización cancelado', 'Proyecto pospuesto por presupuesto', 'planned', 3, NULL, 5, 1, '2026-08-15', '2026-08-30', 60, 8, 10, 'cancelled', 'medium', '[{"date":"2026-08-15","progress":10}]', 1, '2026-08-12');

COMMIT;

SELECT 'Mock data agosto 2026 insertado' as resultado,
       (SELECT COUNT(*) FROM workload_activities WHERE start_date >= '2026-08-01') as actividades_agosto;
