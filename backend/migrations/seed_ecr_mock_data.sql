-- ============================================================
-- ECR Mock Data Seed — covers all dashboard charts & widgets
-- Run: psql -U postgres -d apqp_system -f seed_ecr_mock_data.sql
-- ============================================================

DO $$ BEGIN

-- ──────────────────────────────────────────────────────────────
-- 1. CERRADOS con CP/CPK/Scrap/Estabilidad — alimentan Calidad & Riesgo
-- ──────────────────────────────────────────────────────────────
INSERT INTO ecr_reports (ecr_number, change_title, change_description, status, current_stage,
  client_id, requestor_department, requestor_name, change_type, change_category, priority,
  risk_assessment, financial_impact, initial_scrap, process_stability,
  cpk_post_change, cp_post_change, ppap_status, impact_analysis,
  created_by, created_at, closed_at)
VALUES
-- Capaz (CPK/CP >= 1.33)
('ECR-2024-001','Cambio de tolerancia en carcasa motor','Ajuste dimensional por reclamación cliente',
 'closed','closed', 1,'Ingeniería','Carlos Mendoza','design','engineering','high',
 '{"severity":8,"occurrence":7,"detection":3}',
 '{"totalCost":45000,"totalSavings":0,"netImpact":45000,"items":[{"type":"scrap","amount":20000,"desc":"Scrap inicial"},{"type":"rework","amount":15000,"desc":"Rework piezas"},{"type":"investment","amount":10000,"desc":"Herramental"}]}',
 3.2, 96.5, 1.45, 1.52, '3', '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Control de Calidad","areaKey":"qc"}]',
 1, NOW() - INTERVAL '14 months', NOW() - INTERVAL '12 months'),

('ECR-2024-002','Nuevo proveedor de materia prima','Cambio proveedor acero por costo',
 'closed','closed', 2,'Compras','Ana Rodríguez','supplier','supplier','medium',
 '{"severity":5,"occurrence":4,"detection":4}',
 '{"totalCost":12000,"totalSavings":25000,"netImpact":-13000,"items":[{"type":"logistics","amount":8000,"desc":"Flete especial"},{"type":"investment","amount":4000,"desc":"Calificación"}]}',
 1.8, 98.0, 1.67, 1.71, '2', '[{"areaName":"Recepción","areaKey":"recv"},{"areaName":"Almacén","areaKey":"alm"}]',
 3, NOW() - INTERVAL '13 months', NOW() - INTERVAL '11 months'),

('ECR-2024-003','Modificación proceso soldadura','Nueva parametría soldadura robótica',
 'closed','closed', 3,'Producción','Miguel Torres','process','production','high',
 '{"severity":7,"occurrence":5,"detection":3}',
 '{"totalCost":67000,"totalSavings":30000,"netImpact":37000,"items":[{"type":"investment","amount":50000,"desc":"Reprogramación robot"},{"type":"overtime","amount":17000,"desc":"Horas extra validación"}]}',
 4.1, 94.2, 1.38, 1.41, '3', '[{"areaName":"Soldadura","areaKey":"sold"},{"areaName":"Ensamble","areaKey":"ens"}]',
 5, NOW() - INTERVAL '12 months', NOW() - INTERVAL '10 months'),

-- Marginal (CPK 1.0-1.33)
('ECR-2024-004','Cambio adhesivo sellante','Reformulación adhesivo de ensamble',
 'closed','closed', 1,'Ingeniería','Laura Sánchez','material','engineering','medium',
 '{"severity":4,"occurrence":3,"detection":5}',
 '{"totalCost":8500,"totalSavings":0,"netImpact":8500,"items":[{"type":"rework","amount":5000,"desc":"Piezas rechazadas"},{"type":"other_expense","amount":3500,"desc":"Pruebas lab"}]}',
 2.5, 91.0, 1.15, 1.22, '2', '[{"areaName":"Ensamble","areaKey":"ens"}]',
 3, NOW() - INTERVAL '11 months', NOW() - INTERVAL '9 months'),

('ECR-2024-005','Rediseño empaque producto terminado','Cambio empaque por daño en transporte',
 'closed','closed', 4,'Logística','Roberto Jiménez','design','logistics','low',
 '{"severity":3,"occurrence":3,"detection":6}',
 '{"totalCost":5200,"totalSavings":15000,"netImpact":-9800,"items":[{"type":"logistics","amount":5200,"desc":"Nuevo empaque"}]}',
 1.2, 99.1, 1.28, 1.30, '1', '[{"areaName":"Logística","areaKey":"log"},{"areaName":"Empaque","areaKey":"emp"}]',
 6, NOW() - INTERVAL '10 months', NOW() - INTERVAL '8 months'),

-- No capaz (CPK < 1.0)
('ECR-2024-006','Ajuste parámetros inyección plástico','Defecto de llenado en cavidad 3',
 'closed','closed', 5,'Producción','Pedro García','process','production','critical',
 '{"severity":9,"occurrence":8,"detection":2}',
 '{"totalCost":95000,"totalSavings":0,"netImpact":95000,"items":[{"type":"scrap","amount":60000,"desc":"Scrap masivo"},{"type":"rework","amount":25000,"desc":"Retrabajo"},{"type":"overtime","amount":10000,"desc":"Tiempo extra"}]}',
 8.7, 82.3, 0.87, 0.91, '3', '[{"areaName":"Inyección","areaKey":"inj"},{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Producción","areaKey":"prod"}]',
 5, NOW() - INTERVAL '9 months', NOW() - INTERVAL '7 months'),

('ECR-2024-007','Cambio especificación rugosidad superficial','Cliente requiere Ra 0.8 en lugar de Ra 1.6',
 'closed','closed', 2,'Ingeniería','Fernando López','design','engineering','high',
 '{"severity":7,"occurrence":6,"detection":3}',
 '{"totalCost":38000,"totalSavings":0,"netImpact":38000,"items":[{"type":"investment","amount":22000,"desc":"Herramental fino"},{"type":"overtime","amount":8000,"desc":"Validación"},{"type":"scrap","amount":8000,"desc":"Piezas piloto"}]}',
 5.5, 88.7, 0.95, 1.02, '3', '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Control de Calidad","areaKey":"qc"}]',
 1, NOW() - INTERVAL '8 months', NOW() - INTERVAL '6 months'),

-- Más cerrados con datos variados
('ECR-2024-008','Incorporación sensor temperatura','Nuevo sensor IATF cliente Faurecia',
 'closed','closed', 1,'Ingeniería','Carlos Mendoza','design','engineering','high',
 '{"severity":6,"occurrence":4,"detection":4}',
 '{"totalCost":28000,"totalSavings":8000,"netImpact":20000,"items":[{"type":"investment","amount":20000,"desc":"Sensor+integración"},{"type":"rework","amount":8000,"desc":"Reworko prototipo"}]}',
 2.1, 95.8, 1.55, 1.60, '2', '[{"areaName":"Ensamble","areaKey":"ens"},{"areaName":"Ingeniería","areaKey":"ing"}]',
 3, NOW() - INTERVAL '7 months', NOW() - INTERVAL '5 months'),

('ECR-2024-009','Actualización FMEA diseño','Revisión AMEF por cambio regulatorio',
 'closed','closed', 3,'Calidad','Sofía Vargas','process','quality','medium',
 '{"severity":5,"occurrence":3,"detection":5}',
 '{"totalCost":4500,"totalSavings":20000,"netImpact":-15500,"items":[{"type":"other_expense","amount":4500,"desc":"Consultoría"}]}',
 0.8, 99.5, 1.72, 1.75, '1', '[{"areaName":"Control de Calidad","areaKey":"qc"}]',
 7, NOW() - INTERVAL '6 months', NOW() - INTERVAL '4 months'),

('ECR-2025-001','Cambio lubricante proceso estampado','Lubricante anterior descontinuado',
 'closed','closed', 6,'Producción','Miguel Torres','material','production','medium',
 '{"severity":4,"occurrence":2,"detection":6}',
 '{"totalCost":6200,"totalSavings":0,"netImpact":6200,"items":[{"type":"logistics","amount":3000,"desc":"Flete urgente"},{"type":"other_expense","amount":3200,"desc":"Pruebas calificación"}]}',
 1.5, 97.3, 1.44, 1.48, '2', '[{"areaName":"Estampado","areaKey":"est"},{"areaName":"Producción","areaKey":"prod"}]',
 9, NOW() - INTERVAL '5 months', NOW() - INTERVAL '3 months'),

-- ──────────────────────────────────────────────────────────────
-- 2. APROBADOS — alimentan tendencias y KPIs
-- ──────────────────────────────────────────────────────────────
('ECR-2025-002','Nuevo proceso pintura catódica','Requerimiento norma ambiental nueva',
 'approved','closure', 2,'Ingeniería','Ana Rodríguez','process','engineering','high',
 '{"severity":6,"occurrence":5,"detection":4}',
 '{"totalCost":120000,"totalSavings":40000,"netImpact":80000,"items":[{"type":"investment","amount":100000,"desc":"Línea pintura"},{"type":"overtime","amount":20000,"desc":"Arranque"}]}',
 NULL, NULL, NULL, NULL, '3', '[{"areaName":"Pintura","areaKey":"pint"},{"areaName":"Ingeniería","areaKey":"ing"}]',
 1, NOW() - INTERVAL '4 months', NULL),

('ECR-2025-003','Cambio proveedor tornillería','Proveedor anterior sin certificación IATF',
 'approved','closure', 1,'Compras','Laura Sánchez','supplier','supplier','medium',
 '{"severity":3,"occurrence":2,"detection":7}',
 '{"totalCost":3500,"totalSavings":12000,"netImpact":-8500,"items":[{"type":"logistics","amount":3500,"desc":"Inspección proveedor"}]}',
 NULL, NULL, NULL, NULL, '1', '[{"areaName":"Compras","areaKey":"comp"},{"areaName":"Recepción","areaKey":"recv"}]',
 6, NOW() - INTERVAL '3 months 20 days', NULL),

('ECR-2025-004','Incorporación código QR rastreabilidad','Requerimiento trazabilidad cliente',
 'approved','closure', 4,'Calidad','Pedro García','design','quality','medium',
 '{"severity":4,"occurrence":2,"detection":5}',
 '{"totalCost":18000,"totalSavings":35000,"netImpact":-17000,"items":[{"type":"investment","amount":18000,"desc":"Lectores + software"}]}',
 NULL, NULL, NULL, NULL, '2', '[{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Logística","areaKey":"log"}]',
 7, NOW() - INTERVAL '3 months 10 days', NULL),

('ECR-2025-005','Rediseño fixture ensamble','Desgaste prematuro fixture actual',
 'approved','closure', 5,'Ingeniería','Fernando López','tooling','engineering','low',
 '{"severity":3,"occurrence":3,"detection":6}',
 '{"totalCost":9500,"totalSavings":0,"netImpact":9500,"items":[{"type":"investment","amount":9500,"desc":"Nuevo fixture"}]}',
 NULL, NULL, NULL, NULL, '2', '[{"areaName":"Ensamble","areaKey":"ens"},{"areaName":"Ingeniería","areaKey":"ing"}]',
 3, NOW() - INTERVAL '2 months 25 days', NULL),

('ECR-2025-006','Cambio dimensiones empaque exportación','Nueva regulación aduanal',
 'approved','closure', 3,'Logística','Roberto Jiménez','design','logistics','low',
 '{"severity":2,"occurrence":2,"detection":7}',
 '{"totalCost":4200,"totalSavings":8000,"netImpact":-3800,"items":[{"type":"logistics","amount":4200,"desc":"Rediseño empaque"}]}',
 NULL, NULL, NULL, NULL, '1', '[{"areaName":"Logística","areaKey":"log"},{"areaName":"Empaque","areaKey":"emp"}]',
 10, NOW() - INTERVAL '2 months 15 days', NULL),

('ECR-2025-007','Actualización especificación material junta','Junta actual con fuga térmica',
 'approved','closure', 2,'Ingeniería','Sofía Vargas','material','engineering','high',
 '{"severity":7,"occurrence":6,"detection":3}',
 '{"totalCost":22000,"totalSavings":0,"netImpact":22000,"items":[{"type":"scrap","amount":12000,"desc":"Devolución cliente"},{"type":"investment","amount":10000,"desc":"Nueva junta + validación"}]}',
 NULL, NULL, NULL, NULL, '3', '[{"areaName":"Ensamble","areaKey":"ens"},{"areaName":"Control de Calidad","areaKey":"qc"}]',
 1, NOW() - INTERVAL '2 months 5 days', NULL),

('ECR-2025-008','Reubicación línea de producción','Expansión planta requiere reubicación',
 'approved','closure', 6,'Producción','Miguel Torres','process','production','critical',
 '{"severity":8,"occurrence":7,"detection":2}',
 '{"totalCost":250000,"totalSavings":80000,"netImpact":170000,"items":[{"type":"investment","amount":200000,"desc":"Reubicación línea"},{"type":"overtime","amount":30000,"desc":"Paros planeados"},{"type":"logistics","amount":20000,"desc":"Transporte equipo"}]}',
 NULL, NULL, NULL, NULL, '3', '[{"areaName":"Producción","areaKey":"prod"},{"areaName":"Ingeniería","areaKey":"ing"},{"areaName":"Mantenimiento","areaKey":"mant"}]',
 5, NOW() - INTERVAL '1 month 20 days', NULL),

('ECR-2025-009','Nueva gama de colores pintura','Marketing requiere 3 nuevos colores',
 'approved','closure', 1,'Ingeniería','Carlos Mendoza','design','engineering','medium',
 '{"severity":4,"occurrence":3,"detection":5}',
 '{"totalCost":15000,"totalSavings":0,"netImpact":15000,"items":[{"type":"investment","amount":15000,"desc":"Colorantes + validación"}]}',
 NULL, NULL, NULL, NULL, '2', '[{"areaName":"Pintura","areaKey":"pint"},{"areaName":"Control de Calidad","areaKey":"qc"}]',
 8, NOW() - INTERVAL '1 month 10 days', NULL),

-- ──────────────────────────────────────────────────────────────
-- 3. RECHAZADOS — alimentan KPIs y tendencias
-- ──────────────────────────────────────────────────────────────
('ECR-2025-010','Cambio polímero base estructura','Propuesta reducción costo no aprobada',
 'rejected','change_request', 5,'Ingeniería','Ana Rodríguez','material','engineering','medium',
 '{"severity":7,"occurrence":5,"detection":3}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Ingeniería","areaKey":"ing"}]',
 3, NOW() - INTERVAL '5 months', NULL),

('ECR-2025-011','Eliminación operación desbabe manual','No cumple especificación superficial',
 'rejected','change_request', 3,'Producción','Pedro García','process','production','high',
 '{"severity":8,"occurrence":6,"detection":3}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Producción","areaKey":"prod"},{"areaName":"Mecanizado","areaKey":"mec"}]',
 9, NOW() - INTERVAL '4 months', NULL),

('ECR-2025-012','Cambio tolerancia posición agujero','Rechazo por impacto funcional no demostrado',
 'rejected','change_request', 1,'Calidad','Fernando López','design','quality','critical',
 '{"severity":9,"occurrence":7,"detection":2}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Control de Calidad","areaKey":"qc"}]',
 7, NOW() - INTERVAL '3 months', NULL),

('ECR-2025-013','Propuesta cambio lubricante soluble','Proveedor no calificado',
 'rejected','change_request', 4,'Compras','Laura Sánchez','supplier','supplier','medium',
 '{"severity":5,"occurrence":4,"detection":5}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Producción","areaKey":"prod"}]',
 6, NOW() - INTERVAL '2 months', NULL),

('ECR-2025-014','Cambio espesor lámina refuerzo','Impacto estructural no validado',
 'rejected','change_request', 2,'Ingeniería','Roberto Jiménez','material','engineering','high',
 '{"severity":8,"occurrence":5,"detection":4}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Estampado","areaKey":"est"},{"areaName":"Ingeniería","areaKey":"ing"}]',
 1, NOW() - INTERVAL '1 month 15 days', NULL),

-- ──────────────────────────────────────────────────────────────
-- 4. SUBMITTED (en revisión) — alimentan ECRs abiertos y aging
-- ──────────────────────────────────────────────────────────────
('ECR-2025-015','Cambio proceso tratamiento térmico','Nueva temperatura normalizado +20°C',
 'submitted','validation_plan', 6,'Ingeniería','Sofía Vargas','process','engineering','high',
 '{"severity":7,"occurrence":5,"detection":3}',
 '{"totalCost":35000,"totalSavings":10000,"netImpact":25000,"items":[{"type":"investment","amount":25000,"desc":"Actualización horno"},{"type":"overtime","amount":10000,"desc":"Validación"}]}',
 NULL, NULL, NULL, NULL, '3', '[{"areaName":"Tratamiento Térmico","areaKey":"tt"},{"areaName":"Ingeniería","areaKey":"ing"}]',
 3, NOW() - INTERVAL '25 days', NULL),

('ECR-2025-016','Nuevo proceso CNC alta velocidad','Reducción tiempo ciclo 30%',
 'submitted','validation_plan', 1,'Producción','Carlos Mendoza','process','production','medium',
 '{"severity":5,"occurrence":4,"detection":4}',
 '{"totalCost":48000,"totalSavings":60000,"netImpact":-12000,"items":[{"type":"investment","amount":48000,"desc":"Insertos especiales"}]}',
 NULL, NULL, NULL, NULL, '2', '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Producción","areaKey":"prod"}]',
 5, NOW() - INTERVAL '20 days', NULL),

('ECR-2025-017','Cambio especificación pintura primer','Compatibilidad con nuevo top coat',
 'submitted','change_request', 3,'Ingeniería','Ana Rodríguez','material','engineering','low',
 '{"severity":3,"occurrence":2,"detection":7}',
 '{"totalCost":8000,"totalSavings":0,"netImpact":8000,"items":[{"type":"other_expense","amount":8000,"desc":"Validación pintura"}]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Pintura","areaKey":"pint"}]',
 8, NOW() - INTERVAL '15 days', NULL),

('ECR-2025-018','Incorporación visión artificial inspection','Sistema cámara para 100% inspección',
 'submitted','validation_plan', 2,'Calidad','Miguel Torres','tooling','quality','high',
 '{"severity":6,"occurrence":5,"detection":2}',
 '{"totalCost":85000,"totalSavings":120000,"netImpact":-35000,"items":[{"type":"investment","amount":85000,"desc":"Sistema visión artificial"}]}',
 NULL, NULL, NULL, NULL, '3', '[{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Producción","areaKey":"prod"}]',
 7, NOW() - INTERVAL '12 days', NULL),

('ECR-2025-019','Cambio proceso marcado láser','Marcado láser en lugar de serigrafía',
 'submitted','change_request', 5,'Producción','Pedro García','process','production','medium',
 '{"severity":4,"occurrence":3,"detection":5}',
 '{"totalCost":22000,"totalSavings":30000,"netImpact":-8000,"items":[{"type":"investment","amount":22000,"desc":"Laser marker"}]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Producción","areaKey":"prod"}]',
 9, NOW() - INTERVAL '10 days', NULL),

('ECR-2025-020','Actualización plano ingeniería nivel B','Revisión por ECN cliente Lucid',
 'submitted','change_request', 3,'Ingeniería','Fernando López','design','engineering','critical',
 '{"severity":8,"occurrence":6,"detection":3}',
 '{"totalCost":15000,"totalSavings":0,"netImpact":15000,"items":[{"type":"investment","amount":15000,"desc":"Implementación cambio"}]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Ingeniería","areaKey":"ing"},{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Mecanizado","areaKey":"mec"}]',
 1, NOW() - INTERVAL '8 days', NULL),

-- Aging > 30 días (para mostrar ECRs vencidos en alertas)
('ECR-2025-021','Cambio sistema de enfriamiento molde','Optimización ciclo inyección',
 'submitted','validation_plan', 6,'Producción','Roberto Jiménez','tooling','production','high',
 '{"severity":6,"occurrence":5,"detection":4}',
 '{"totalCost":55000,"totalSavings":45000,"netImpact":10000,"items":[{"type":"investment","amount":55000,"desc":"Sistema cooling mejorado"}]}',
 NULL, NULL, NULL, NULL, '3', '[{"areaName":"Inyección","areaKey":"inj"},{"areaName":"Producción","areaKey":"prod"}]',
 5, NOW() - INTERVAL '45 days', NULL),

('ECR-2025-022','Revalidación proceso soldadura MIG','Cambio gas protector disponibilidad',
 'submitted','validation_plan', 4,'Producción','Sofía Vargas','process','production','medium',
 '{"severity":5,"occurrence":4,"detection":4}',
 '{"totalCost":12000,"totalSavings":0,"netImpact":12000,"items":[{"type":"other_expense","amount":12000,"desc":"Revalidación proceso"}]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Soldadura","areaKey":"sold"},{"areaName":"Producción","areaKey":"prod"}]',
 3, NOW() - INTERVAL '55 days', NULL),

('ECR-2025-023','Cambio diseño sello porta rodamiento','Fuga de grasa en campo cliente',
 'submitted','change_request', 1,'Ingeniería','Carlos Mendoza','design','engineering','critical',
 '{"severity":9,"occurrence":7,"detection":2}',
 '{"totalCost":75000,"totalSavings":0,"netImpact":75000,"items":[{"type":"scrap","amount":40000,"desc":"Devolución campo"},{"type":"investment","amount":25000,"desc":"Nuevo sello"},{"type":"logistics","amount":10000,"desc":"Retrofit campo"}]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Ingeniería","areaKey":"ing"},{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Logística","areaKey":"log"}]',
 1, NOW() - INTERVAL '95 days', NULL),

-- ──────────────────────────────────────────────────────────────
-- 5. DRAFTS — para KPI de borradores
-- ──────────────────────────────────────────────────────────────
('ECR-2025-024','Propuesta cambio recubrimiento zinc','Evaluación alternativa recubrimiento',
 'draft','change_request', 5,'Calidad','Ana Rodríguez','material','quality','low',
 '{"severity":3,"occurrence":2,"detection":7}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Control de Calidad","areaKey":"qc"}]',
 6, NOW() - INTERVAL '5 days', NULL),

('ECR-2025-025','Nuevo proceso desbarbado automático','Reducción mano de obra operación',
 'draft','change_request', 2,'Producción','Miguel Torres','tooling','production','medium',
 '{"severity":4,"occurrence":3,"detection":5}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Producción","areaKey":"prod"},{"areaName":"Mecanizado","areaKey":"mec"}]',
 9, NOW() - INTERVAL '3 days', NULL),

('ECR-2025-026','Cambio cinta adhesiva ensamble','Proveedor solicita cambio especificación',
 'draft','change_request', 3,'Compras','Laura Sánchez','supplier','supplier','low',
 '{"severity":2,"occurrence":2,"detection":8}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Ensamble","areaKey":"ens"}]',
 10, NOW() - INTERVAL '2 days', NULL),

('ECR-2025-027','Revisión PPAP nivel 3 componente crítico','Actualización PPAP por cambio subproveedor',
 'draft','change_request', 1,'Calidad','Fernando López','process','quality','high',
 '{"severity":6,"occurrence":4,"detection":4}',
 '{"totalCost":0,"totalSavings":0,"netImpact":0,"items":[]}',
 NULL, NULL, NULL, NULL, NULL, '[{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Compras","areaKey":"comp"}]',
 7, NOW() - INTERVAL '1 day', NULL),

-- ──────────────────────────────────────────────────────────────
-- 6. CERRADOS ADICIONALES para tendencias mensuales
-- ──────────────────────────────────────────────────────────────
('ECR-2024-010','Cambio herramienta corte carburo','Desgaste excesivo herramienta actual',
 'closed','closed', 4,'Producción','Pedro García','tooling','production','medium',
 '{"severity":4,"occurrence":4,"detection":5}',
 '{"totalCost":18000,"totalSavings":25000,"netImpact":-7000,"items":[{"type":"investment","amount":18000,"desc":"Insertos carburo"}]}',
 2.8, 93.5, 1.33, 1.37, '2', '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Producción","areaKey":"prod"}]',
 9, NOW() - INTERVAL '15 months', NOW() - INTERVAL '13 months'),

('ECR-2024-011','Actualización plan control proceso','Revisión anual sistema IATF',
 'closed','closed', 6,'Calidad','Sofía Vargas','process','quality','low',
 '{"severity":2,"occurrence":2,"detection":8}',
 '{"totalCost":3000,"totalSavings":10000,"netImpact":-7000,"items":[{"type":"other_expense","amount":3000,"desc":"Consultoría certificación"}]}',
 0.5, 99.8, 1.88, 1.92, '1', '[{"areaName":"Control de Calidad","areaKey":"qc"}]',
 7, NOW() - INTERVAL '16 months', NOW() - INTERVAL '15 months'),

('ECR-2024-012','Cambio velocidad línea ensamble','Balanceo línea por nuevo modelo',
 'closed','closed', 1,'Producción','Carlos Mendoza','process','production','high',
 '{"severity":6,"occupation":5,"detection":3}',
 '{"totalCost":42000,"totalSavings":65000,"netImpact":-23000,"items":[{"type":"investment","amount":30000,"desc":"Rebalanceo"},{"type":"overtime","amount":12000,"desc":"Arranque"}]}',
 3.5, 90.2, 1.21, 1.25, '3', '[{"areaName":"Ensamble","areaKey":"ens"},{"areaName":"Producción","areaKey":"prod"},{"areaName":"Logística","areaKey":"log"}]',
 5, NOW() - INTERVAL '10 months 15 days', NOW() - INTERVAL '8 months 20 days'),

('ECR-2024-013','Cambio material palier transmisión','Mejora resistencia fatiga',
 'closed','closed', 2,'Ingeniería','Ana Rodríguez','material','engineering','critical',
 '{"severity":9,"occurrence":8,"detection":2}',
 '{"totalCost":110000,"totalSavings":200000,"netImpact":-90000,"items":[{"type":"investment","amount":80000,"desc":"Nuevo material"},{"type":"scrap","amount":20000,"desc":"Piezas piloto"},{"type":"overtime","amount":10000,"desc":"Validación"}]}',
 6.2, 86.4, 0.78, 0.83, '3', '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Ingeniería","areaKey":"ing"},{"areaName":"Control de Calidad","areaKey":"qc"},{"areaName":"Ensamble","areaKey":"ens"}]',
 1, NOW() - INTERVAL '17 months', NOW() - INTERVAL '15 months 10 days'),

('ECR-2025-028','Nuevo proceso lavado ultra-sónico','Limpieza interna componentes hidráulicos',
 'closed','closed', 5,'Producción','Roberto Jiménez','process','production','high',
 '{"severity":7,"occurrence":5,"detection":3}',
 '{"totalCost":65000,"totalSavings":30000,"netImpact":35000,"items":[{"type":"investment","amount":55000,"desc":"Equipo ultrasonido"},{"type":"logistics","amount":10000,"desc":"Instalación"}]}',
 4.3, 92.1, 1.41, 1.45, '3', '[{"areaName":"Producción","areaKey":"prod"},{"areaName":"Ensamble","areaKey":"ens"}]',
 3, NOW() - INTERVAL '4 months 10 days', NOW() - INTERVAL '2 months 20 days'),

('ECR-2025-029','Cambio especificación rugosidad bore','Ajuste a estándar nuevo cliente',
 'closed','closed', 3,'Ingeniería','Fernando López','design','engineering','medium',
 '{"severity":5,"occurrence":4,"detection":4}',
 '{"totalCost":9500,"totalSavings":0,"netImpact":9500,"items":[{"type":"rework","amount":6000,"desc":"Reproceso"},{"type":"other_expense","amount":3500,"desc":"Validación"}]}',
 1.9, 97.0, 1.62, 1.65, '2', '[{"areaName":"Mecanizado","areaKey":"mec"},{"areaName":"Control de Calidad","areaKey":"qc"}]',
 8, NOW() - INTERVAL '3 months 5 days', NOW() - INTERVAL '1 month 25 days'),

('ECR-2025-030','Actualización plantilla soldadura','Deformación plantilla por temperatura',
 'closed','closed', 6,'Producción','Sofía Vargas','tooling','production','medium',
 '{"severity":4,"occurrence":3,"detection":5}',
 '{"totalCost":14000,"totalSavings":8000,"netImpact":6000,"items":[{"type":"investment","amount":14000,"desc":"Nueva plantilla Invar"}]}',
 2.2, 95.1, 1.38, 1.42, '2', '[{"areaName":"Soldadura","areaKey":"sold"},{"areaName":"Producción","areaKey":"prod"}]',
 9, NOW() - INTERVAL '2 months 20 days', NOW() - INTERVAL '1 month 10 days');

END $$;

-- Resumen de lo insertado
SELECT status, COUNT(*) FROM ecr_reports GROUP BY status ORDER BY status;
