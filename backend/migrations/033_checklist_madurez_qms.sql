-- Migration: 033_checklist_madurez_qms.sql
-- Checklist 4: Madurez y Efectividad del Sistema de Gestión (QMS)
-- Uso: Revisión por Dirección, Auditoría anual, Diagnóstico pre-certificación

-- ============================================
-- CHECKLIST 4: MADUREZ DEL QMS
-- ============================================

INSERT INTO audit_checklists (name, description, version, is_active) VALUES
(
  'Madurez y Efectividad del Sistema de Gestión',
  'Evalúa si el sistema de gestión funciona, aprende y mejora, no solo si cumple formalmente. USO: Revisión por Dirección, auditoría anual, diagnóstico pre-certificación, evaluación de proveedores estratégicos. FRECUENCIA: Anual o semestral. NO usar en auditorías de piso. NO genera No Conformidades directas, genera señales estratégicas. Referencia: ISO 9001:2015.',
  '1.0',
  true
);

-- Obtener el ID del checklist recién creado
DO $$
DECLARE
  v_checklist_id INTEGER;
BEGIN
  SELECT id INTO v_checklist_id FROM audit_checklists
  WHERE name = 'Madurez y Efectividad del Sistema de Gestión';

  -- ============================================
  -- 1. GOBERNANZA Y LIDERAZGO DEL SISTEMA
  -- ============================================

  INSERT INTO audit_checklist_items (checklist_id, clause, question, category, guidance, is_critical, risk_weight, item_order) VALUES
  (v_checklist_id, '1.1',
   '¿La alta dirección revisa periódicamente el desempeño del sistema de gestión utilizando datos reales y tendencias, no solo reportes formales?',
   'Gobernanza y Liderazgo',
   'ISO 5.1 / 9.3. Si la dirección solo aprueba documentos pero no toma decisiones basadas en el sistema, el sistema se considera inmaduro.',
   true, 4, 1),

  (v_checklist_id, '1.2',
   '¿Las decisiones estratégicas consideran resultados de auditorías, no conformidades y riesgos operativos?',
   'Gobernanza y Liderazgo',
   'ISO 5.1.1 / 6.1. Verificar actas de revisión por dirección y decisiones tomadas.',
   true, 4, 2),

  (v_checklist_id, '1.3',
   '¿Existen objetivos de calidad vinculados a resultados del negocio y no solo a métricas internas?',
   'Gobernanza y Liderazgo',
   'ISO 6.2. Objetivos deben conectar con satisfacción cliente, reducción de costos de no calidad, etc.',
   false, 3, 3),

  -- ============================================
  -- 2. EFECTIVIDAD DE LAS AUDITORÍAS INTERNAS
  -- ============================================

  (v_checklist_id, '2.1',
   '¿Las auditorías internas detectan riesgos antes de que ocurran fallas al cliente?',
   'Efectividad de Auditorías',
   'ISO 9.2. Una auditoría que no incomoda ni genera decisiones es una auditoría decorativa.',
   true, 5, 4),

  (v_checklist_id, '2.2',
   '¿Los mismos hallazgos se repiten en auditorías consecutivas o en diferentes áreas?',
   'Efectividad de Auditorías',
   'ISO 10.2. Recurrencia indica falla sistémica, no local.',
   true, 5, 5),

  (v_checklist_id, '2.3',
   '¿Los auditores distinguen claramente entre incumplimientos menores y riesgos reales para el proceso o el cliente?',
   'Efectividad de Auditorías',
   'ISO 7.2 / 9.2.2. Evaluar competencia de auditores para priorizar hallazgos.',
   false, 3, 6),

  -- ============================================
  -- 3. GESTIÓN DE NO CONFORMIDADES Y ACCIONES
  -- ============================================

  (v_checklist_id, '3.1',
   '¿Las causas raíz identificadas van más allá del error humano o la falta de atención?',
   'Gestión de No Conformidades',
   'ISO 10.2.1. Si más del 50% de las acciones correctivas son "reentrenamiento", el sistema es reactivo.',
   true, 5, 7),

  (v_checklist_id, '3.2',
   '¿Se verifica la efectividad de las acciones correctivas después de un periodo razonable?',
   'Gestión de No Conformidades',
   'ISO 10.2.1 e). Debe existir evidencia de verificación, no solo cierre administrativo.',
   true, 4, 8),

  (v_checklist_id, '3.3',
   '¿Las acciones correctivas modifican procesos, métodos o controles, y no solo documentación o capacitación?',
   'Gestión de No Conformidades',
   'ISO 8.1 / 10.2. Acciones deben cambiar el sistema, no solo los papeles.',
   true, 5, 9),

  -- ============================================
  -- 4. GESTIÓN DE RIESGOS A NIVEL SISTEMA
  -- ============================================

  (v_checklist_id, '4.1',
   '¿La organización mantiene un enfoque sistemático para identificar riesgos operativos, humanos y de proceso?',
   'Gestión de Riesgos',
   'ISO 6.1. Riesgos documentados sin acciones asociadas indican un sistema inerte.',
   true, 4, 10),

  (v_checklist_id, '4.2',
   '¿Los resultados de auditorías influyen en la priorización de riesgos?',
   'Gestión de Riesgos',
   'ISO 6.1 / 9.1. Auditorías deben alimentar el análisis de riesgos.',
   false, 3, 11),

  (v_checklist_id, '4.3',
   '¿Los riesgos identificados generan cambios reales en controles, recursos o métodos de trabajo?',
   'Gestión de Riesgos',
   'ISO 8.1. Si los riesgos no generan acciones, el análisis es decorativo.',
   true, 5, 12),

  -- ============================================
  -- 5. APRENDIZAJE ORGANIZACIONAL Y MEJORA CONTINUA
  -- ============================================

  (v_checklist_id, '5.1',
   '¿Las lecciones aprendidas de auditorías y no conformidades se comparten entre áreas o proyectos?',
   'Aprendizaje y Mejora',
   'ISO 7.1.6 / 10.3. Conocimiento debe fluir horizontalmente en la organización.',
   false, 3, 13),

  (v_checklist_id, '5.2',
   '¿Se observan mejoras sostenidas en indicadores clave derivadas de auditorías?',
   'Aprendizaje y Mejora',
   'ISO 9.1 / 10.3. Tendencias positivas = sistema que aprende.',
   true, 4, 14),

  (v_checklist_id, '5.3',
   '¿El sistema de gestión se ajusta cuando cambian procesos, clientes o el contexto externo?',
   'Aprendizaje y Mejora',
   'ISO 4.1 / 6.3. Si el sistema no cambia con el tiempo, no está vivo.',
   true, 4, 15);

  RAISE NOTICE 'Checklist 4 creado con ID: %', v_checklist_id;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT
  c.id,
  c.name,
  COUNT(i.id) as items,
  SUM(CASE WHEN i.is_critical THEN 1 ELSE 0 END) as criticos
FROM audit_checklists c
LEFT JOIN audit_checklist_items i ON i.checklist_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.name
ORDER BY c.id;
