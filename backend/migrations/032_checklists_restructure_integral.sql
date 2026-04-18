-- Migration: 032_checklists_restructure_integral.sql
-- Reestructuración de checklists: de 4 fragmentados a 3 integrales
-- Enfoque: Riesgo → Detección → Efectividad

-- ============================================
-- PASO 1: Limpiar datos existentes
-- ============================================

-- Eliminar items de checklists anteriores
DELETE FROM audit_checklist_items WHERE checklist_id IN (1, 2, 3, 4);

-- Eliminar checklists anteriores
DELETE FROM audit_checklists WHERE id IN (1, 2, 3, 4);

-- Resetear secuencia
SELECT setval('audit_checklists_id_seq', 1, false);
SELECT setval('audit_checklist_items_id_seq', 1, false);

-- ============================================
-- PASO 2: Crear nuevos checklists integrales
-- ============================================

INSERT INTO audit_checklists (name, description, version, is_active) VALUES
(
  'Evaluación de Riesgos del Proceso / Operación',
  'Identificar dónde puede fallar el proceso y qué tan crítico sería el impacto. Define QUÉ debe controlarse. Aplica a procesos productivos, administrativos y servicios. Cubre ISO 9001: 6.1 (Riesgos y oportunidades) y 4.4 (Enfoque basado en procesos).',
  '1.0',
  true
),
(
  'Evaluación de Riesgos de Inspección / Control',
  'Evaluar si los métodos de inspección y control detectan los riesgos del proceso. Define CÓMO se detectan las fallas. Aplica a inspecciones, pruebas, controles de calidad y auditorías. Cubre ISO 9001: 8.6 (Liberación de productos) y 9.1 (Seguimiento y medición).',
  '1.0',
  true
),
(
  'Evaluación de Efectividad del Sistema',
  'Verificar si el sistema aprende y mejora o si repite los mismos problemas. Define SI el sistema funciona. Aplica a auditorías internas, acciones correctivas, revisión del sistema y resultados operativos. Cubre ISO 9001: 9.2 (Auditoría interna) y 10.2 (No conformidad y acción correctiva).',
  '1.0',
  true
);

-- ============================================
-- CHECKLIST 1: RIESGOS DEL PROCESO / OPERACIÓN
-- ============================================

INSERT INTO audit_checklist_items (checklist_id, clause, question, category, guidance, is_critical, risk_weight, item_order) VALUES
-- Checklist 1 = ID 1 (después del reset)
(1, '1.1', '¿El proceso está claramente definido y estandarizado?', 'Definición del Proceso',
 'Verificar existencia de procedimientos, diagramas de flujo o instrucciones de trabajo que definan el proceso de forma clara.',
 false, 3, 1),

(1, '1.2', '¿Las entradas y salidas del proceso están identificadas?', 'Definición del Proceso',
 'Confirmar que se conocen los insumos requeridos y los resultados esperados del proceso.',
 false, 3, 2),

(1, '1.3', '¿Existen actividades críticas donde un error impacta directamente al cliente?', 'Riesgos Operativos',
 'Identificar puntos del proceso donde una falla afectaría calidad, entrega o satisfacción del cliente.',
 true, 5, 3),

(1, '1.4', '¿Se han identificado riesgos de calidad, seguridad, entrega o cumplimiento?', 'Riesgos Operativos',
 'Revisar si existe un análisis de riesgos documentado (AMEF, matriz de riesgos, etc.).',
 true, 5, 4),

(1, '1.5', '¿Los riesgos están priorizados por severidad e impacto?', 'Riesgos Operativos',
 'Verificar que los riesgos tengan clasificación de severidad, ocurrencia e impacto.',
 false, 4, 5),

(1, '1.6', '¿Existen controles actuales para los riesgos identificados?', 'Controles del Proceso',
 'Confirmar que cada riesgo crítico tiene al menos un control preventivo o detectivo.',
 true, 5, 6),

(1, '1.7', '¿El personal conoce los riesgos del proceso en el que trabaja?', 'Operadores y Factor Humano',
 'Entrevistar operadores para verificar conocimiento de riesgos y controles de su área.',
 false, 4, 7),

(1, '1.8', '¿Los cambios recientes al proceso han sido evaluados por riesgo?', 'Controles del Proceso',
 'Revisar si cambios de método, material, máquina o personal fueron analizados por impacto.',
 false, 4, 8),

(1, '1.9', '¿El proceso depende excesivamente de personas y no de controles sistemáticos?', 'Operadores y Factor Humano',
 'Evaluar si la calidad del proceso depende de la habilidad individual más que de controles robustos.',
 true, 5, 9),

(1, '1.10', '¿Existen fallas históricas relacionadas con este proceso?', 'Riesgos Operativos',
 'Revisar historial de no conformidades, quejas o incidentes asociados a este proceso.',
 false, 4, 10);

-- ============================================
-- CHECKLIST 2: RIESGOS DE INSPECCIÓN / CONTROL
-- ============================================

INSERT INTO audit_checklist_items (checklist_id, clause, question, category, guidance, is_critical, risk_weight, item_order) VALUES
(2, '2.1', '¿Las inspecciones están alineadas a los riesgos del proceso?', 'Diseño del Sistema de Inspección',
 'Verificar que los puntos de inspección correspondan a los riesgos identificados en el Checklist 1.',
 true, 5, 1),

(2, '2.2', '¿Los puntos críticos del proceso tienen controles definidos?', 'Diseño del Sistema de Inspección',
 'Confirmar que cada punto crítico tiene un método de verificación establecido.',
 false, 4, 2),

(2, '2.3', '¿Los criterios de aceptación son claros y no ambiguos?', 'Métodos y Criterios',
 'Revisar si los límites de aceptación son específicos, medibles y entendidos por todos.',
 true, 5, 3),

(2, '2.4', '¿La inspección es repetible entre diferentes personas?', 'Inspectores y Competencia',
 'Evaluar si dos inspectores diferentes llegarían al mismo resultado con el mismo producto.',
 false, 4, 4),

(2, '2.5', '¿Existe dependencia excesiva de inspección visual sin criterios objetivos?', 'Métodos y Criterios',
 'Identificar inspecciones subjetivas que dependen de la percepción individual del inspector.',
 false, 4, 5),

(2, '2.6', '¿Los métodos de inspección han demostrado detectar fallas reales?', 'Efectividad de Detección',
 'Revisar si las inspecciones actuales han detectado defectos antes de llegar al cliente.',
 true, 5, 6),

(2, '2.7', '¿Existen defectos históricos que no fueron detectados por la inspección?', 'Efectividad de Detección',
 'Analizar escapes de calidad y reclamaciones donde la inspección falló en detectar el problema.',
 true, 5, 7),

(2, '2.8', '¿La frecuencia de inspección es adecuada al nivel de riesgo?', 'Diseño del Sistema de Inspección',
 'Verificar que procesos de alto riesgo tengan mayor frecuencia de control.',
 false, 4, 8),

(2, '2.9', '¿Los registros de inspección permiten análisis posterior?', 'Métodos y Criterios',
 'Confirmar que los datos capturados son suficientes para tendencias y análisis de causa raíz.',
 false, 3, 9),

(2, '2.10', '¿El sistema de inspección se revisa y mejora periódicamente?', 'Efectividad de Detección',
 'Verificar si se evalúa la efectividad de la inspección y se ajustan los métodos cuando falla.',
 false, 4, 10);

-- ============================================
-- CHECKLIST 3: EFECTIVIDAD DEL SISTEMA
-- ============================================

INSERT INTO audit_checklist_items (checklist_id, clause, question, category, guidance, is_critical, risk_weight, item_order) VALUES
(3, '3.1', '¿Los mismos hallazgos se repiten en auditorías o en el tiempo?', 'Auditorías y Resultados',
 'Revisar historial de hallazgos para identificar patrones de recurrencia.',
 true, 5, 1),

(3, '3.2', '¿Las acciones correctivas eliminan causas raíz y no solo síntomas?', 'Acciones Correctivas',
 'Evaluar si las acciones tomadas atacan el origen del problema o solo lo contienen temporalmente.',
 true, 5, 2),

(3, '3.3', '¿Existen procesos que pasan auditorías pero siguen generando defectos?', 'Auditorías y Resultados',
 'Identificar desconexión entre resultados de auditoría y desempeño real del proceso.',
 true, 5, 3),

(3, '3.4', '¿Los riesgos identificados disminuyen con el tiempo?', 'Mejora Continua',
 'Verificar tendencia de reducción de riesgos como evidencia de mejora del sistema.',
 false, 4, 4),

(3, '3.5', '¿Las auditorías detectan problemas antes de que ocurran fallas mayores?', 'Auditorías y Resultados',
 'Evaluar si el sistema de auditoría es preventivo o solo reactivo a incidentes.',
 false, 4, 5),

(3, '3.6', '¿Las no conformidades recurrentes son tratadas como fallas sistémicas?', 'Acciones Correctivas',
 'Verificar si problemas repetitivos escalan a análisis de sistema y no solo a corrección local.',
 true, 5, 6),

(3, '3.7', '¿Los indicadores reflejan mejora real y no solo cumplimiento de actividades?', 'Mejora Continua',
 'Distinguir entre métricas de resultado (defectos, escapes) vs métricas de actividad (auditorías hechas).',
 false, 4, 7),

(3, '3.8', '¿El sistema reacciona oportunamente a señales tempranas de falla?', 'Personas y Cultura',
 'Evaluar velocidad de respuesta ante alertas, tendencias negativas o retroalimentación del piso.',
 false, 4, 8),

(3, '3.9', '¿Se ajustan los controles cuando el sistema falla?', 'Acciones Correctivas',
 'Verificar si después de una falla se fortalecen los controles o se mantienen igual.',
 false, 4, 9),

(3, '3.10', '¿La información de auditorías se usa para toma de decisiones gerenciales?', 'Personas y Cultura',
 'Confirmar que los resultados de auditoría informan decisiones de inversión, priorización y recursos.',
 false, 3, 10);

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  checklist_count INTEGER;
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO checklist_count FROM audit_checklists WHERE is_active = true;
  SELECT COUNT(*) INTO item_count FROM audit_checklist_items;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'REESTRUCTURACIÓN COMPLETADA';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Checklists activos: %', checklist_count;
  RAISE NOTICE 'Items totales: %', item_count;
  RAISE NOTICE '----------------------------------------------';
  RAISE NOTICE 'Checklist 1: Riesgos del Proceso (10 items)';
  RAISE NOTICE 'Checklist 2: Riesgos de Inspección (10 items)';
  RAISE NOTICE 'Checklist 3: Efectividad del Sistema (10 items)';
  RAISE NOTICE '==============================================';
END $$;
