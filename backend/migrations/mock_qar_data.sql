-- ============================================================================
-- QAR MOCK DATA + SLA CONFIG
-- ============================================================================

-- 1. SLA Config table (per severity)
CREATE TABLE IF NOT EXISTS qar_sla_config (
  id SERIAL PRIMARY KEY,
  severity_id INTEGER REFERENCES inspection_severities(id),
  severity_name VARCHAR(50),
  response_hours INTEGER NOT NULL DEFAULT 24,   -- max hours to respond
  closure_hours INTEGER NOT NULL DEFAULT 72,    -- max hours to close
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed SLA config (editable from UI later)
INSERT INTO qar_sla_config (severity_id, severity_name, response_hours, closure_hours, description) VALUES
  (3, 'Crítico', 4,  24,  'Crítico: respuesta en 4h, cierre en 24h'),
  (4, 'ALTA',    8,  48,  'Alta: respuesta en 8h, cierre en 48h'),
  (2, 'Mayor',   24, 72,  'Mayor: respuesta en 24h, cierre en 72h'),
  (1, 'Menor',   48, 120, 'Menor: respuesta en 48h, cierre en 120h')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Mock QAR data — varied statuses, departments, responsables, dates
-- ============================================================================

-- Clear existing mock data (keep real ones id 1-3)
DELETE FROM qar_comments   WHERE qar_id > 3;
DELETE FROM qar_defects    WHERE qar_id > 3;
DELETE FROM qar_recipients WHERE qar_id > 3;
DELETE FROM quality_alerts WHERE id > 3;

-- Reset sequence to continue from 4
SELECT setval('quality_alerts_id_seq', 3, true);

-- ============================================================================
-- BATCH INSERT: 60 QARs with realistic distribution
-- Users:  1=Adrian(QM), 2=Robert(Mant), 3=Quality Eng(CtrlProd), 4=QC Tech,
--         5=Prod Supervisor(Ing), 6=QA(QE), 7=John(QE), 8=Maria(Prod),
--         9=David(Prod), 10=Sarah(Prod), 11=Michael(Prod)
-- Depts:  1=Producción, 2=Calidad, 3=Ingeniería, 4=Mantenimiento,
--         5=Logística, 6=Proveedor
-- Sevs:   1=Menor, 2=Mayor, 3=Crítico, 4=ALTA
-- ============================================================================

INSERT INTO quality_alerts (
  alert_number, client_id, project_id, part_id, title, description,
  severity_id, trigger_type, trigger_defect_count,
  status, assigned_to, reported_by, department_id,
  root_cause, corrective_action, resolution_notes,
  validation_status, validated_by, validation_date,
  response_date, responded_by, resolved_at, closed_at,
  created_at, updated_at
) VALUES

-- ── CERRADOS con respuesta rápida (SLA cumplido) ──────────────────────────
('QAR-2026-0004', 1, 1, 68, 'Dimensión fuera de tolerancia - FAU-IP-001', 'Dimensión crítica 0.3mm fuera de especificación en ensamble de panel', 3, 'threshold', 3, 'CERRADO', 9, 1, 1, 'Desgaste de herramienta de corte por uso excesivo', 'Reemplazo de herramienta cada 500 piezas, implementar control estadístico', 'Acción correctiva validada en línea', 'approved', 1, NOW() - INTERVAL '25 days', NOW() - INTERVAL '26 days 22 hours', 9, NOW() - INTERVAL '25 days 12 hours', NOW() - INTERVAL '25 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days'),

('QAR-2026-0005', 2, 4, 75, 'Soldadura deficiente - GIS-SB-001', 'Punto de soldadura con penetración insuficiente detectado en QC final', 2, 'manual', 2, 'CERRADO', 5, 3, 3, 'Parámetros de soldadora fuera de rango por fluctuación eléctrica', 'Instalación de regulador de voltaje y calibración semanal', 'Proceso estabilizado, 0 rechazos en 5 días', 'approved', 1, NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days 20 hours', 5, NOW() - INTERVAL '20 days 8 hours', NOW() - INTERVAL '20 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '20 days'),

('QAR-2026-0006', 3, 2, 80, 'Superficie rayada - LUC-EV-001', 'Rayones en superficie de aluminio anodizado detectados en inspección', 1, 'manual', 1, 'CERRADO', 10, 6, 2, 'Contacto con bordes de fixture durante transporte interno', 'Colocación de protectores de espuma en todos los fixtures', 'Sin recurrencia en 10 días de seguimiento', 'approved', 1, NOW() - INTERVAL '18 days', NOW() - INTERVAL '19 days 44 hours', 10, NOW() - INTERVAL '18 days 6 hours', NOW() - INTERVAL '18 days', NOW() - INTERVAL '21 days', NOW() - INTERVAL '18 days'),

('QAR-2026-0007', 4, 6, 86, 'Fuga de sellador - ELK-GS-001', 'Fuga detectada en prueba de hermeticidad línea A', 3, 'threshold', 4, 'CERRADO', 2, 9, 4, 'Desgaste de O-rings por temperatura excesiva en ciclos continuos', 'Cambio de material O-ring a EPDM alta temperatura, PM preventivo cada 200h', 'Prueba de hermeticidad al 100% sin fallas en 7 días', 'approved', 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days 3 hours', 2, NOW() - INTERVAL '15 days 10 hours', NOW() - INTERVAL '15 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '15 days'),

('QAR-2026-0008', 5, 7, 91, 'Dureza fuera de especificación - MUB-CS-001', 'Lote de resortes con dureza Rockwell B inferior al límite inferior', 2, 'threshold', 5, 'CERRADO', 7, 4, 6, 'Variación en lote de materia prima del proveedor', 'Segregación del lote, prueba 100% del material entrante, cambio de proveedor secundario', 'Lote rechazado, nuevo lote aprobado', 'approved', 7, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days 20 hours', 7, NOW() - INTERVAL '12 days 8 hours', NOW() - INTERVAL '12 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days'),

('QAR-2026-0009', 1, 8, 71, 'Torque insuficiente - FAU-DP-001', 'Tornillos de sujeción con torque por debajo del mínimo especificado', 2, 'manual', 3, 'CERRADO', 3, 11, 1, 'Llave de torque descalibrada por caída accidental', 'Recalibración inmediata, calibración mensual obligatoria, registro de calibración', 'Calibración verificada y documentada', 'approved', 3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days 22 hours', 3, NOW() - INTERVAL '10 days 5 hours', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),

('QAR-2026-0010', 6, NULL, 96, 'Contaminación por aceite - TF-GEN-001', 'Manchas de aceite en superficie de componente antes de pintura', 1, 'manual', 1, 'CERRADO', 8, 6, 5, 'Fuga en sistema hidráulico de prensa cercana', 'Reparación de fuga, instalación de tapa protectora, limpieza de área', 'Área sellada, sin recurrencia', 'approved', 8, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days 45 hours', 8, NOW() - INTERVAL '8 days 4 hours', NOW() - INTERVAL '8 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '8 days'),

('QAR-2026-0011', 2, 11, 78, 'Rebaba en zona crítica - GIS-SBA-001', 'Rebaba metálica en zona de contacto con componente electrónico', 3, 'threshold', 3, 'CERRADO', 5, 9, 3, 'Desgaste de punzón de estampado excediendo vida útil', 'Cambio de punzón y ajuste de frecuencia de mantenimiento', 'Control verificado en producción', 'approved', 1, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days 3 hours', 5, NOW() - INTERVAL '6 days 9 hours', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days'),

('QAR-2026-0012', 3, 5, 83, 'Color incorrecto - LUC-MH-002', 'Discrepancia de color Delta-E > 3 en panel exterior', 1, 'manual', 1, 'CERRADO', 6, 7, 2, 'Cambio de lote de pigmento sin notificación a calidad', 'Procedimiento de aprobación de cambios de material actualizado', 'Lote rechazado, reproceso completado', 'approved', 6, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days 46 hours', 6, NOW() - INTERVAL '4 days 3 hours', NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'),

-- ── CERRADOS con respuesta TARDÍA (SLA incumplido) ────────────────────────
('QAR-2026-0013', 4, 14, 89, 'Porosidad en fundición - ELK-GSE-001', 'Porosidad interna detectada por rayos X en lote de fundición', 4, 'threshold', 6, 'CERRADO', 2, 1, 6, 'Temperatura de fundición por encima del rango óptimo', 'Ajuste de parámetros de horno y monitoreo continuo', 'Proceso estabilizado', 'approved', 2, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days 52 hours', 2, NOW() - INTERVAL '30 days 20 hours', NOW() - INTERVAL '30 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days'),

('QAR-2026-0014', 5, 15, 93, 'Longitud incorrecta - MUB-CS-003', 'Longitud de resorte 2mm fuera de tolerancia en 15% del lote', 3, 'manual', 8, 'CERRADO', 7, 4, 6, 'Error en programa CNC por actualización de software no validada', 'Rollback de software, proceso de validación de cambios reforzado', 'Reproceso del lote, validación OK', 'approved', 7, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days 36 hours', 7, NOW() - INTERVAL '22 days 15 hours', NOW() - INTERVAL '22 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '22 days'),

('QAR-2026-0015', 1, 9, 74, 'Adhesivo insuficiente - FAU-DPA-001', 'Fuerza de adhesión por debajo del mínimo en prueba de pelado', 2, 'manual', 2, 'CERRADO', 3, 11, 1, 'Mezcla incorrecta de adhesivo bicomponente, ratio incorrecto', 'Instalación de dispensadora automática con control de ratio', 'Equipo instalado y validado', 'approved', 3, NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days 30 hours', 3, NOW() - INTERVAL '16 days 10 hours', NOW() - INTERVAL '16 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '16 days'),

-- ── RESPONDIDOS (en proceso de cierre) ────────────────────────────────────
('QAR-2026-0016', 2, 4, 77, 'Marcado incorrecto - GIS-SB-003', 'Etiqueta de parte número erróneo aplicada en 30 piezas', 2, 'manual', 1, 'RESPONDIDO', 5, 3, 3, 'Error humano en cambio de modelo sin actualización de orden', 'Implementación de poka-yoke visual en estación de etiquetado', NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days 20 hours', 5, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),

('QAR-2026-0017', 3, 12, 84, 'Daño en anodizado - LUC-BE-001', 'Área sin cobertura de anodizado de 2cm² en zona visible', 3, 'manual', 2, 'RESPONDIDO', 10, 6, 2, 'Contacto con solución ácida durante limpieza por derrame', 'Rediseño de proceso de limpieza, EPP adecuado, capacitación', NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 days 5 hours', 10, NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),

('QAR-2026-0018', 4, 6, 88, 'Rosca dañada - ELK-GS-003', 'Rosca M8 con paso dañado, no acepta tornillo de ensamble', 4, 'threshold', 5, 'RESPONDIDO', 2, 9, 4, 'Mal alineamiento en operación de roscado por vibración de máquina', 'Revisión de fijación de máquina roscadora, verificación 100% con pasador', NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 days 7 hours', 2, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 days'),

('QAR-2026-0019', 5, 7, 92, 'Deformación plástica - MUB-CS-002', 'Resorte presenta deformación permanente antes de prueba de fatiga', 3, 'manual', 4, 'RESPONDIDO', 7, 4, 6, 'Temperatura de recocido insuficiente en tratamiento térmico', 'Ajuste de ciclo térmico, validación metalúrgica del lote', NULL, NULL, NULL, NULL, NOW() - INTERVAL '12 hours', 7, NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours'),

('QAR-2026-0020', 6, NULL, 97, 'Variación dimensional - TF-GEN-002', 'Variación de ±0.5mm en diámetro interior, especificación ±0.1mm', 2, 'manual', 2, 'RESPONDIDO', 8, 6, 5, 'Desgaste de mandril de torno CNC por falta de mantenimiento', 'Reemplazo de mandril, plan de PM preventivo actualizado', NULL, NULL, NULL, NULL, NOW() - INTERVAL '6 hours', 8, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours'),

-- ── EMITIDOS (sin respuesta aún) ──────────────────────────────────────────
-- Críticos sin respuesta — alto riesgo
('QAR-2026-0021', 1, 1, 69, 'Fractura en zona de esfuerzo - FAU-IP-002', 'Grieta detectada en área de concentración de esfuerzos en prueba estática', 4, 'threshold', 7, 'EMITIDO', 9, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

('QAR-2026-0022', 4, 14, 90, 'Falla en ensayo de tracción - ELK-GSE-002', 'Carga de rotura 15% por debajo del mínimo especificado', 4, 'threshold', 4, 'EMITIDO', 2, 1, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

('QAR-2026-0023', 3, 13, 85, 'Desalineación de ensamble - LUC-EMH-001', 'Descentramiento de eje motor > 0.8mm, tolerancia máxima 0.2mm', 3, 'manual', 3, 'EMITIDO', 10, 6, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

('QAR-2026-0024', 2, 11, 79, 'Soldadura porosa - GIS-SBA-002', 'Porosidad visible en cordón de soldadura de soporte estructural', 3, 'manual', 2, 'EMITIDO', 5, 3, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

('QAR-2026-0025', 5, 15, 94, 'Carga libre incorrecta - MUB-CSM-001', 'Longitud libre del resorte 5mm por encima del máximo permitido', 2, 'manual', 1, 'EMITIDO', 7, 4, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

('QAR-2026-0026', 1, 8, 72, 'Deformación de panel - FAU-DP-002', 'Deformación de 3mm en panel de puerta, máximo permitido 1mm', 2, 'manual', 1, 'EMITIDO', 3, 11, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('QAR-2026-0027', 6, NULL, 98, 'Rugosidad excesiva - TF-GEN-003', 'Ra > 3.2μm en zona de sellado, especificación máxima 1.6μm', 1, 'manual', 1, 'EMITIDO', 8, 6, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('QAR-2026-0028', 3, 2, 82, 'Recubrimiento delaminado - LUC-MH-001', 'Delaminación de recubrimiento protector en zona de impacto', 2, 'manual', 2, 'EMITIDO', 6, 7, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),

('QAR-2026-0029', 4, 6, 87, 'Fuga en empaque - ELK-GS-002', 'Fuga de gas en prueba de hermeticidad, presión de prueba 2 bar', 4, 'threshold', 3, 'EMITIDO', 2, 9, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),

('QAR-2026-0030', 2, 4, 76, 'Error de ensamble - GIS-SB-002', 'Componente ensamblado en orientación incorrecta, detectado en prueba funcional', 3, 'manual', 3, 'EMITIDO', 5, 3, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

-- ── RECHAZADOS ────────────────────────────────────────────────────────────
('QAR-2026-0031', 5, 7, 95, 'Longitud de resorte - MUB-CSM-002', 'QAR emitido pero defecto dentro de tolerancia extendida aprobada', 1, 'manual', 1, 'RECHAZADO', 7, 11, 6, NULL, NULL, 'Revisión confirma que la pieza está dentro de tolerancia extendida documentada en ECR-2026-003', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days'),

('QAR-2026-0032', 1, 9, 73, 'Acabado superficial - FAU-DA-001', 'QAR rechazado: el defecto reportado era sombra de iluminación en fotografía', 1, 'manual', 1, 'RECHAZADO', 3, 10, 2, NULL, NULL, 'Inspección física confirma que no existe defecto real, error de captura fotográfica', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

-- ── DATOS HISTÓRICOS (más antiguos, cerrados) ─────────────────────────────
('QAR-2026-0033', 3, 5, 81, 'Concentricidad - LUC-EV-002', 'Concentricidad fuera de tolerancia en eje de transmisión', 3, 'manual', 2, 'CERRADO', 6, 7, 3, 'Desgaste en mandril de torno, no detectado en última calibración', 'Calibración 2x por semana, indicador de desgaste en dashboard', 'Proceso bajo control, Cpk=1.38', 'approved', 6, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days 6 hours', 6, NOW() - INTERVAL '45 days 20 hours', NOW() - INTERVAL '45 days', NOW() - INTERVAL '47 days', NOW() - INTERVAL '45 days'),

('QAR-2026-0034', 4, 14, 86, 'Sellado deficiente - ELK-GS-001', 'Sellador no cubre el 100% del perímetro especificado', 2, 'threshold', 3, 'CERRADO', 2, 1, 4, 'Presión de aplicación del robot de sellado fuera de rango', 'Ajuste de presión y verificación con cámara de visión artificial', 'Implementación exitosa', 'approved', 2, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days 22 hours', 2, NOW() - INTERVAL '50 days 8 hours', NOW() - INTERVAL '50 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '50 days'),

('QAR-2026-0035', 1, 1, 70, 'Peso fuera de especificación - FAU-IP-003', 'Panel 120g por encima del peso máximo permitido', 2, 'manual', 5, 'CERRADO', 9, 9, 1, 'Cambio en espesor de material sin aprobación de ingeniería', 'Revertir a especificación original, proceso de cambio de ingeniería activado', 'Material devuelto al proveedor', 'approved', 1, NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days 18 hours', 9, NOW() - INTERVAL '55 days 6 hours', NOW() - INTERVAL '55 days', NOW() - INTERVAL '58 days', NOW() - INTERVAL '55 days'),

('QAR-2026-0036', 2, 4, 75, 'Resistencia eléctrica alta - GIS-SB-001', 'Resistencia de conexión 3x mayor al máximo permitido en soldadura', 4, 'threshold', 8, 'CERRADO', 5, 3, 3, 'Oxidación en superficies de contacto por humedad excesiva en almacén', 'Control de humedad en almacén, limpieza de piezas antes de soldar', 'Humedad controlada <50%RH', 'approved', 5, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days 5 hours', 5, NOW() - INTERVAL '40 days 16 hours', NOW() - INTERVAL '40 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days'),

('QAR-2026-0037', 3, 2, 80, 'Balanceo incorrecto - LUC-EV-001', 'Desbalance > 50 g·cm en rotación, límite 10 g·cm', 3, 'manual', 3, 'CERRADO', 10, 6, 2, 'Masa de balanceo incorrecta instalada durante ensamble', 'Verificación 100% en banco de balanceo antes de liberación', 'Control implementado', 'approved', 10, NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days 3 hours', 10, NOW() - INTERVAL '38 days 10 hours', NOW() - INTERVAL '38 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days'),

('QAR-2026-0038', 5, 7, 91, 'Tasa de rechazo alta - MUB-CS-001', 'Tasa de rechazo en línea alcanza 8%, límite de alerta 5%', 4, 'threshold', 12, 'CERRADO', 7, 4, 6, 'Variación de dureza en materia prima, proveedor no cumple CP > 1.33', 'Certificado de calidad requerido por lote, prueba entrada reforzada', 'Proveedor certificado nuevamente', 'approved', 7, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days 7 hours', 7, NOW() - INTERVAL '35 days 18 hours', NOW() - INTERVAL '35 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '35 days'),

('QAR-2026-0039', 6, NULL, 96, 'Hermeticidad fallida - TF-GEN-001', 'Falla en prueba de hermeticidad en 3 de 10 muestras', 3, 'threshold', 3, 'CERRADO', 8, 6, 5, 'Empaque o-ring con dureza Shore A incorrecta (40 vs 60 especificado)', 'Cambio de proveedor de o-rings, control de entrada con durometro', 'OK', 'approved', 8, NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days 2 hours', 8, NOW() - INTERVAL '32 days 8 hours', NOW() - INTERVAL '32 days', NOW() - INTERVAL '34 days', NOW() - INTERVAL '32 days'),

('QAR-2026-0040', 1, 8, 71, 'Planicidad fuera de rango - FAU-DP-001', 'Planicidad 0.15mm, máximo permitido 0.08mm en zona de sellado', 3, 'manual', 4, 'CERRADO', 3, 11, 1, 'Distorsión térmica en proceso de soldadura, velocidad de enfriamiento incorrecta', 'Control de velocidad de enfriamiento en CNC, fixture de corrección', 'Cpk=1.25, dentro de objetivo', 'approved', 3, NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days 21 hours', 3, NOW() - INTERVAL '28 days 8 hours', NOW() - INTERVAL '28 days', NOW() - INTERVAL '31 days', NOW() - INTERVAL '28 days'),

-- ── MÁS EMITIDOS RECIENTES (para mostrar backlog) ─────────────────────────
('QAR-2026-0041', 4, 6, 89, 'Rugosidad en asiento de válvula - ELK-GSE-001', 'Ra = 2.1μm, especificación máxima 0.8μm en asiento crítico', 4, 'threshold', 5, 'EMITIDO', 2, 9, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

('QAR-2026-0042', 2, 11, 78, 'Deformación en hebilla - GIS-SBA-001', 'Hebilla de cinturón presenta deformación visible en zona de inserción', 3, 'manual', 2, 'EMITIDO', 5, 3, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

('QAR-2026-0043', 1, 9, 73, 'Acabado interior rugoso - FAU-DA-001', 'Textura interior del panel no cumple con estándar visual cliente', 1, 'manual', 1, 'EMITIDO', 9, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

('QAR-2026-0044', 3, 12, 84, 'Corriente de fuga excesiva - LUC-BE-001', 'Corriente de fuga > 10mA en prueba eléctrica de seguridad', 4, 'threshold', 4, 'EMITIDO', 10, 6, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

('QAR-2026-0045', 5, 15, 92, 'Paso de resorte variable - MUB-CS-002', 'Variación de paso >0.3mm entre espiras, tolerancia ±0.1mm', 2, 'manual', 2, 'EMITIDO', 7, 4, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

('QAR-2026-0046', 1, 1, 68, 'Sellador en zona limpia - FAU-IP-001', 'Contaminación por exceso de sellador en zona eléctrica del panel', 3, 'manual', 3, 'EMITIDO', 3, 11, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

('QAR-2026-0047', 6, NULL, 97, 'Runout excesivo - TF-GEN-002', 'Runout axial 0.12mm, especificación máxima 0.05mm', 3, 'threshold', 3, 'EMITIDO', 8, 6, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- ── CERRADOS SIN VALIDACIÓN (para KPI de alerta) ─────────────────────────
('QAR-2026-0048', 2, 4, 75, 'Grieta superficial - GIS-SB-001', 'Micro grieta en zona de soldadura detectada con líquidos penetrantes', 3, 'manual', 2, 'CERRADO', 5, 3, 3, 'Velocidad de soldadura incorrecta, dilución insuficiente', 'Ajuste de velocidad, inspección LP al 100%', 'Cerrado sin validación formal por urgencia operativa', NULL, NULL, NULL, NOW() - INTERVAL '13 days 20 hours', 5, NOW() - INTERVAL '13 days 8 hours', NOW() - INTERVAL '13 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '13 days'),

('QAR-2026-0049', 4, 6, 87, 'Torque de extracción bajo - ELK-GS-002', 'Torque de extracción de inserto 30% por debajo del mínimo', 2, 'manual', 1, 'CERRADO', 2, 1, 4, 'Adhesivo de inserto incorrecto, especificación actualizada sin comunicar', 'Reentrenamiento, adhesivo correcto identificado con código de color', 'Acción implementada', NULL, NULL, NULL, NOW() - INTERVAL '9 days 18 hours', 2, NOW() - INTERVAL '9 days 5 hours', NOW() - INTERVAL '9 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '9 days'),

('QAR-2026-0050', 3, 2, 82, 'Vibración en ensamble - LUC-MH-001', 'Nivel de vibración 3dB sobre el límite en prueba NVH', 2, 'manual', 2, 'CERRADO', 6, 7, 2, 'Juego excesivo en rodamiento por tolerancia de eje incorrecta', 'Ajuste de tolerancia de eje, rodamiento con mayor precisión', 'NVH dentro de límites', NULL, NULL, NULL, NOW() - INTERVAL '7 days 22 hours', 6, NOW() - INTERVAL '7 days 6 hours', NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'),

-- ── EXTRAS CON MÁS VARIEDAD ───────────────────────────────────────────────
('QAR-2026-0051', 1, 1, 69, 'Espesor de recubrimiento - FAU-IP-002', 'Espesor de pintura 40μm vs mínimo 60μm requerido', 2, 'manual', 1, 'CERRADO', 9, 10, 1, 'Viscosidad de pintura fuera de rango por temperatura ambiente', 'Control automático de temperatura en cabina de pintura', 'OK', 'approved', 1, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days 21 hours', 9, NOW() - INTERVAL '60 days 8 hours', NOW() - INTERVAL '60 days', NOW() - INTERVAL '62 days', NOW() - INTERVAL '60 days'),

('QAR-2026-0052', 5, 7, 93, 'Diámetro exterior fuera de rango - MUB-CS-003', 'De = 28.5mm, tolerancia 27.8-28.2mm en resorte helicoidal', 2, 'threshold', 4, 'CERRADO', 7, 4, 6, 'Desgaste de dados de bobinadora, no contemplado en PM', 'Cambio de dados, inclusión en plan de mantenimiento preventivo', 'OK', 'approved', 7, NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days 20 hours', 7, NOW() - INTERVAL '65 days 6 hours', NOW() - INTERVAL '65 days', NOW() - INTERVAL '67 days', NOW() - INTERVAL '65 days'),

('QAR-2026-0053', 4, 6, 88, 'Marcado láser ilegible - ELK-GS-003', 'Código QR de trazabilidad no legible con escáner estándar', 1, 'manual', 1, 'RESPONDIDO', 2, 1, 4, 'Potencia del láser reducida por contaminación de lente', 'Limpieza de lente y calibración de potencia', NULL, NULL, NULL, NOW() - INTERVAL '1 day 4 hours', 2, NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),

('QAR-2026-0054', 3, 13, 85, 'Presión de arranque alta - LUC-EMH-001', 'Par de arranque 15% sobre el máximo, indica interferencia mecánica', 4, 'manual', 3, 'RESPONDIDO', 10, 6, 2, 'Interferencia entre eje y rodamiento por temperatura de montaje incorrecta', 'Uso de herramienta de calentamiento inductivo, procedimiento actualizado', NULL, NULL, NULL, NOW() - INTERVAL '5 hours', 10, NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 hours'),

('QAR-2026-0055', 2, 4, 76, 'Contaminación magnética - GIS-SB-002', 'Partículas metálicas detectadas con prueba de flujo magnético', 3, 'threshold', 3, 'EMITIDO', 5, 3, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),

('QAR-2026-0056', 6, NULL, 98, 'Pitch de roscado incorrecto - TF-GEN-003', 'Paso de rosca M10 incorrecto, 1.5mm vs 1.25mm especificado', 4, 'threshold', 6, 'EMITIDO', 8, 6, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('QAR-2026-0057', 1, 8, 72, 'Planitud crítica fallida - FAU-DP-002', 'Planitud 0.25mm en zona de interfaz, máximo 0.10mm', 3, 'manual', 3, 'EMITIDO', 3, 11, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

('QAR-2026-0058', 5, 15, 94, 'Fuerza de compresión baja - MUB-CSM-001', 'Fuerza a bloque 10% por debajo del mínimo especificado', 2, 'manual', 2, 'RESPONDIDO', 7, 4, 6, 'Número de espiras incorrecto por error en programa CNC', 'Corrección de programa, verificación 100% en comparador', NULL, NULL, NULL, NOW() - INTERVAL '18 hours', 7, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '18 hours'),

('QAR-2026-0059', 3, 2, 81, 'Pérdida de par - LUC-EV-002', 'Reducción de par motor 8% por debajo del nominal a temperatura operación', 4, 'threshold', 5, 'EMITIDO', 6, 7, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

('QAR-2026-0060', 4, 14, 86, 'Porosidad superficial - ELK-GS-001', 'Poros visibles en zona de pintura, afectan corrosión acelerada', 2, 'manual', 2, 'CERRADO', 2, 9, 4, 'Limpieza insuficiente antes de pintura, presencia de aceite de mecanizado', 'Proceso de desengrase en 2 etapas, verificación con prueba de humectabilidad', 'OK', 'approved', 2, NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days 19 hours', 2, NOW() - INTERVAL '44 days 5 hours', NOW() - INTERVAL '44 days', NOW() - INTERVAL '47 days', NOW() - INTERVAL '44 days');

-- ============================================================================
-- 3. QAR Recipients mock (quién recibió notificación)
-- ============================================================================
INSERT INTO qar_recipients (qar_id, user_id, recipient_type, notified_at, acknowledged_at) VALUES
(4,  1, 'manager',    NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days 2 hours'),
(4,  9, 'assignee',   NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days 1 hour'),
(5,  1, 'manager',    NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days 3 hours'),
(6,  1, 'manager',    NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days 4 hours'),
(7,  1, 'manager',    NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days 1 hour'),
(7,  2, 'assignee',   NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days 30 minutes'),
(8,  1, 'manager',    NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days 2 hours'),
(21, 1, 'manager',    NOW() - INTERVAL '5 days',  NULL),
(21, 9, 'assignee',   NOW() - INTERVAL '5 days',  NULL),
(22, 1, 'manager',    NOW() - INTERVAL '4 days',  NULL),
(29, 1, 'manager',    NOW() - INTERVAL '6 hours', NULL),
(41, 1, 'manager',    NOW() - INTERVAL '7 days',  NULL),
(44, 1, 'manager',    NOW() - INTERVAL '5 days',  NULL);

-- ============================================================================
-- 4. QAR Comments mock
-- ============================================================================
INSERT INTO qar_comments (qar_id, user_id, comment, comment_type, created_at) VALUES
(21, 1, 'QAR crítico sin respuesta. Escalar a supervisor de producción inmediatamente.', 'escalation', NOW() - INTERVAL '4 days'),
(21, 9, 'Revisando el defecto en línea. Requiero soporte de ingeniería.', 'update', NOW() - INTERVAL '3 days 12 hours'),
(22, 1, 'Lote completo en cuarentena hasta resolución.', 'action', NOW() - INTERVAL '3 days'),
(7,  2, 'Acción correctiva implementada. Requiero validación.', 'update', NOW() - INTERVAL '16 days'),
(7,  1, 'Validación programada para mañana.', 'update', NOW() - INTERVAL '15 days 20 hours'),
(41, 1, 'Alta severidad sin respuesta en 7 días. Segundo escalamiento.', 'escalation', NOW() - INTERVAL '1 day');

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'QAR mock data inserted successfully' as result;
SELECT COUNT(*) as total_qars FROM quality_alerts;
SELECT status, COUNT(*) FROM quality_alerts GROUP BY status ORDER BY status;
