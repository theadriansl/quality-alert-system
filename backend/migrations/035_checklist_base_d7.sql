-- Migration: 035_checklist_base_d7.sql
-- Checklist 5: Auditoría de Efectividad D7 - Base (NO EDITABLE)
-- ============================================

-- ============================================
-- AGREGAR CAMPO is_editable A CHECKLISTS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_checklists' AND column_name = 'is_editable'
  ) THEN
    ALTER TABLE audit_checklists ADD COLUMN is_editable BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_checklists' AND column_name = 'checklist_type'
  ) THEN
    ALTER TABLE audit_checklists ADD COLUMN checklist_type VARCHAR(30) DEFAULT 'standard';
    -- Tipos: 'standard', 'd7_base', 'strategic'
  END IF;
END $$;

-- ============================================
-- CHECKLIST 5: BASE D7 (NO EDITABLE)
-- ============================================

INSERT INTO audit_checklists (name, description, version, is_active, is_editable, checklist_type) VALUES
(
  'Auditoría de Efectividad D7 - Base',
  'Checklist FIJO para verificación de efectividad de contramedidas 8D. NO EDITABLE, NO ELIMINABLE. Se aplica en TODAS las auditorías D7 junto con el checklist técnico dinámico. Evalúa implementación, integración y sostenibilidad de la contramedida.',
  '1.0',
  true,
  false,  -- NO EDITABLE
  'd7_base'
);

-- Obtener el ID del checklist recién creado
DO $$
DECLARE
  v_checklist_id INTEGER;
BEGIN
  SELECT id INTO v_checklist_id FROM audit_checklists
  WHERE name = 'Auditoría de Efectividad D7 - Base';

  -- ============================================
  -- 7 ITEMS FIJOS - NO EDITABLES
  -- ============================================

  INSERT INTO audit_checklist_items (checklist_id, clause, question, category, guidance, is_critical, risk_weight, item_order) VALUES

  (v_checklist_id, 'D7.1',
   '¿La contramedida fue implementada según lo definido en D5/D6?',
   'Implementación',
   'Verificar que la acción correctiva se ejecutó exactamente como fue planeada, sin desviaciones ni simplificaciones.',
   true, 5, 1),

  (v_checklist_id, 'D7.2',
   '¿La contramedida ataca directamente la causa raíz identificada en D4?',
   'Implementación',
   'Confirmar que existe conexión lógica entre la causa raíz y la contramedida. Si la causa raíz fue "falta de poka-yoke", la contramedida debe ser un poka-yoke.',
   true, 5, 2),

  (v_checklist_id, 'D7.3',
   '¿Existe evidencia objetiva de implementación?',
   'Evidencia',
   'Documentos, fotos, registros, cambios en sistema que demuestren que la contramedida existe y está funcionando.',
   true, 5, 3),

  (v_checklist_id, 'D7.4',
   '¿La contramedida está integrada al proceso estándar?',
   'Integración',
   'Verificar que la contramedida no es temporal ni paralela. Debe ser parte del proceso normal de producción.',
   true, 4, 4),

  (v_checklist_id, 'D7.5',
   '¿Existen controles que aseguren su uso sostenido?',
   'Sostenibilidad',
   'Verificar que hay mecanismos para mantener la contramedida en el tiempo: auditorías periódicas, checkpoints, poka-yokes.',
   true, 4, 5),

  (v_checklist_id, 'D7.6',
   '¿Se observaron desviaciones o bypass de la contramedida?',
   'Riesgo de Bypass',
   'CRÍTICO: Si el operador puede saltarse la contramedida, esta no es efectiva. Observar el proceso real, no solo documentos.',
   true, 5, 6),

  (v_checklist_id, 'D7.7',
   '¿La contramedida reduce el riesgo original identificado?',
   'Efectividad',
   'Verificar con datos: ¿Disminuyeron los defectos? ¿El NPR bajó? ¿No hay recurrencia del problema? Usar evidencia objetiva.',
   true, 5, 7);

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CHECKLIST D7 BASE CREADO';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'ID: %', v_checklist_id;
  RAISE NOTICE 'Items: 7 (todos críticos)';
  RAISE NOTICE 'Editable: NO';
  RAISE NOTICE 'Tipo: d7_base';
  RAISE NOTICE '==============================================';
END $$;

-- ============================================
-- REGLA: PROTEGER CHECKLIST D7 BASE
-- ============================================

CREATE OR REPLACE FUNCTION protect_d7_base_checklist()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevenir eliminación de checklist D7 base
  IF TG_OP = 'DELETE' THEN
    IF OLD.checklist_type = 'd7_base' THEN
      RAISE EXCEPTION 'No se puede eliminar el checklist base D7. Es un checklist protegido del sistema.';
    END IF;
    RETURN OLD;
  END IF;

  -- Prevenir modificación de checklist D7 base
  IF TG_OP = 'UPDATE' THEN
    IF OLD.checklist_type = 'd7_base' THEN
      IF NEW.is_editable != OLD.is_editable OR
         NEW.checklist_type != OLD.checklist_type OR
         NEW.is_active = false THEN
        RAISE EXCEPTION 'No se puede modificar la configuración del checklist base D7. Es un checklist protegido del sistema.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_d7_base_checklist ON audit_checklists;
CREATE TRIGGER trg_protect_d7_base_checklist
BEFORE UPDATE OR DELETE ON audit_checklists
FOR EACH ROW
EXECUTE FUNCTION protect_d7_base_checklist();

-- ============================================
-- REGLA: PROTEGER ITEMS DEL CHECKLIST D7 BASE
-- ============================================

CREATE OR REPLACE FUNCTION protect_d7_base_items()
RETURNS TRIGGER AS $$
DECLARE
  v_checklist_type VARCHAR(30);
BEGIN
  -- Obtener tipo de checklist
  IF TG_OP = 'DELETE' THEN
    SELECT checklist_type INTO v_checklist_type
    FROM audit_checklists WHERE id = OLD.checklist_id;

    IF v_checklist_type = 'd7_base' THEN
      RAISE EXCEPTION 'No se pueden eliminar items del checklist base D7. Es un checklist protegido del sistema.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT checklist_type INTO v_checklist_type
    FROM audit_checklists WHERE id = OLD.checklist_id;

    IF v_checklist_type = 'd7_base' THEN
      RAISE EXCEPTION 'No se pueden modificar items del checklist base D7. Es un checklist protegido del sistema.';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_d7_base_items ON audit_checklist_items;
CREATE TRIGGER trg_protect_d7_base_items
BEFORE UPDATE OR DELETE ON audit_checklist_items
FOR EACH ROW
EXECUTE FUNCTION protect_d7_base_items();

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT
  c.id,
  c.name,
  c.checklist_type,
  c.is_editable,
  COUNT(i.id) as items,
  SUM(CASE WHEN i.is_critical THEN 1 ELSE 0 END) as criticos
FROM audit_checklists c
LEFT JOIN audit_checklist_items i ON i.checklist_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.checklist_type, c.is_editable
ORDER BY c.id;
