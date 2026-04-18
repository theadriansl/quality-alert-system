-- ============================================================================
-- CHECKLISTS DE AUDITORÍA
-- Migration 031
-- Description: Checklists para Evaluación de Riesgos, Proceso y Desempeño/QMS
-- ============================================================================

-- ============================================================================
-- 1. CHECKLIST: EVALUACIÓN DE RIESGOS DE INSPECCIÓN
-- ============================================================================

INSERT INTO audit_checklists (name, description, standard, process, version, is_active, created_by)
VALUES (
  'Evaluación de Riesgos de Inspección',
  'Checklist para evaluar los riesgos asociados a las operaciones de inspección visual y control de calidad en estaciones de trabajo',
  'Interno',
  'Inspección',
  '1.0',
  true,
  1
) ON CONFLICT DO NOTHING;

-- Get the checklist ID
DO $$
DECLARE
  v_checklist_id INTEGER;
BEGIN
  SELECT id INTO v_checklist_id FROM audit_checklists WHERE name = 'Evaluación de Riesgos de Inspección' LIMIT 1;

  -- Insert items only if checklist exists and has no items
  IF v_checklist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_checklist_items WHERE checklist_id = v_checklist_id) THEN

    INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, category, is_critical, risk_weight) VALUES
    (v_checklist_id, 1, '1.1', '¿Cuál es el tipo de inspección realizada?',
     'Inspección Visual Simple o Muestreo/Auditoría (9-10); Inspección Visual Doble (6-8); Detención Poka-Yoke (3-5); Rechazo Automático con Dispositivos a Prueba de Error (1-2)',
     'Método de Inspección', true, 3),

    (v_checklist_id, 2, '1.2', '¿Se evalúa la capacidad del operador para detectar el defecto?',
     'Difícil (8-10); Semi-Difícil (5-7); Dificultad Leve (2-4); Sin Dificultad (1)',
     'Método de Inspección', true, 3),

    (v_checklist_id, 3, '1.3', '¿Cuántos puntos de inspección tiene cada pieza por operador?',
     '10 o más por operador (9-10); 7-9 por operador (5-8); 3-6 por operador (3-4); 1-2 por operador (1-2)',
     'Método de Inspección', false, 2),

    (v_checklist_id, 4, '1.4', '¿Cuántos números de parte diferentes están listados en la instrucción de trabajo?',
     '10 o más números de parte (9-10); 7-9 números de parte (5-8); 3-6 números de parte (3-4); 1-2 números de parte (1-2)',
     'Método de Inspección', false, 2),

    (v_checklist_id, 5, '1.5', '¿Cuál es la frecuencia de cambio entre diferentes números de parte?',
     'Más de 3 veces por hora (8-10); Solo una vez por hora (6-9); Una vez por turno (3-5); Menos de 1 por semana (1-2)',
     'Método de Inspección', false, 2),

    (v_checklist_id, 6, '1.6', '¿Las muestras límite, fotos, alertas de calidad, etc. están publicadas, entendidas y accesibles para los operadores?',
     'No (5-10); Sí (1-4)',
     'Ayudas Visuales', true, 3),

    (v_checklist_id, 7, '1.7', '¿Si hay múltiples etiquetas en el área de contención, están bien identificadas y segregadas?',
     'Múltiples etiquetas sin segregar (8-10); Más de 2 etiquetas pero segregadas bien (5-7); Solo 2 etiquetas y segregadas bien (4-3); 1 etiqueta (1-2); Sin etiquetas (0)',
     'Área de Contención', false, 2),

    (v_checklist_id, 8, '1.8', '¿Si se usa equipo de medición, hay evidencia de calibración y control adecuado de los equipos?',
     'Sin evidencia de calibración (8-10); Calibrado pero sin control/manejo adecuado (5-7); Equipos en uso, calibrados, controlados y manejados correctamente (1-4); Sin equipos (0)',
     'Equipos', true, 3),

    (v_checklist_id, 9, '1.9', '¿Los productos están controlados después de cualquier procesamiento posterior a nuestra inspección?',
     'Producto/partes individuales son manejados después de la inspección (8-10); Contenedores son manejados después de la inspección (5-7); Las partes van directamente al muelle, almacén o centro de distribución y están bien identificadas como certificadas (1-4)',
     'Control de Producto', true, 3),

    (v_checklist_id, 10, '1.10', '¿El área de inspección está cerca de los procesos del cliente? ¿Los asociados del cliente entran y salen del área de inspección o retiran producto del stock certificado?',
     'Las inspecciones están en línea con el flujo de producción/el cliente retira el producto (8-10); La inspección está segregada/tiene interrupciones del cliente (5-7); Inspección segregada sin interrupciones (2-4); Área de inspección en instalación propia sin interrupciones (0-1)',
     'Ubicación', false, 2),

    (v_checklist_id, 11, '1.11', '¿Hay retrabajo ocurriendo en el área de inspección? ¿El producto es reintroducido al proceso de inspección después del retrabajo?',
     'Retrabajo en área de inspección/partes no reinspeccionadas después del retrabajo (5-10); Retrabajo en área de inspección/partes son reinspeccionadas después del retrabajo (1-4); Sin retrabajo (0)',
     'Retrabajo', true, 3),

    (v_checklist_id, 12, '1.12', '¿Existen instrucciones de trabajo estandarizadas relacionadas con el proyecto?',
     'No existen ITs (10); Pobremente escritas/sin ayudas/no entendidas/entrenamiento no documentado (8-9); Bien escritas/sin ayudas visuales/entrenamiento documentado (5-7); Detalladas con ayudas visuales/bien escritas/fácilmente entendidas/entrenamiento documentado (1-4)',
     'Documentación', true, 3),

    (v_checklist_id, 13, '1.13', '¿La iluminación en el área de inspección es apropiada para que los operadores detecten productos no conformes?',
     'Iluminación pobre (9-10); Iluminación promedio (5-8); Buena iluminación/inspección difícil (2-4); Iluminación excelente en área de inspección y defectos fácilmente reconocibles (0-1)',
     'Ambiente', false, 2),

    (v_checklist_id, 14, '1.14', '¿La temperatura, ruido, presencia de químicos peligrosos, limpieza y calidad del aire en el área de inspección están a un nivel seguro para que los operadores realicen sus funciones?',
     'Ambiente muy inseguro (9-10); Preocupaciones de seguridad (5-8); Alguna incomodidad ambiental pero sin daño a operadores (3-4); Sin preocupaciones con el ambiente de trabajo (1-2)',
     'Ambiente', false, 2),

    (v_checklist_id, 15, '1.15', '¿El área de trabajo presenta un ambiente hostil?',
     'Sí (1-10 basado en niveles de confort del inspector); Sin ambiente hostil (0)',
     'Ambiente', false, 1),

    (v_checklist_id, 16, '1.16', '¿Existen barreras de idioma que afectarían el desempeño de los operadores? (Verbal/Escrito)',
     'Sí (5-10); No (1-4)',
     'Comunicación', false, 2);

  END IF;
END $$;

-- ============================================================================
-- 2. CHECKLIST: AUDITORÍA DE PROCESO
-- ============================================================================

INSERT INTO audit_checklists (name, description, standard, process, version, is_active, created_by)
VALUES (
  'Auditoría de Proceso',
  'Checklist para auditoría de proceso de inspección, verificación de cumplimiento de instrucciones de trabajo, uso de herramientas y control documental',
  'Interno',
  'Proceso',
  '1.0',
  true,
  1
) ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_checklist_id INTEGER;
BEGIN
  SELECT id INTO v_checklist_id FROM audit_checklists WHERE name = 'Auditoría de Proceso' LIMIT 1;

  IF v_checklist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_checklist_items WHERE checklist_id = v_checklist_id) THEN

    -- OBSERVACIÓN DEL MIEMBRO DEL EQUIPO
    INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, category, is_critical, risk_weight) VALUES
    (v_checklist_id, 1, '2.1', '¿El miembro del equipo se encuentra en la estación correcta?',
     'Verificar que el operador esté asignado a la estación donde está trabajando',
     'Observación del Personal', false, 1),

    (v_checklist_id, 2, '2.2', '¿El miembro del equipo porta el código de vestimenta apropiado?',
     'Pantalón de trabajo, camisa de la empresa, chaleco de seguridad, gorra de la empresa si aplica',
     'Observación del Personal', false, 1),

    (v_checklist_id, 3, '2.3', '¿El miembro del equipo tiene puesto el EPP adecuado?',
     'Verificar uso de equipo de protección personal requerido para la operación',
     'Observación del Personal', true, 2),

    (v_checklist_id, 4, '2.4', '¿El miembro del equipo está distraído de sus funciones?',
     'Verificar que el operador esté enfocado en la tarea de inspección',
     'Observación del Personal', false, 1),

    (v_checklist_id, 5, '2.5', '¿El miembro del equipo está recargado o sentado en su estación de trabajo?',
     'Verificar postura ergonómica y que no afecte la calidad de la inspección',
     'Observación del Personal', false, 1),

    (v_checklist_id, 6, '2.6', '¿El miembro del equipo conoce la Política de Calidad o dónde está ubicada?',
     'El operador debe conocer los principios básicos de la política de calidad',
     'Observación del Personal', false, 1),

    -- OBSERVACIÓN DEL SISTEMA DE GESTIÓN DE CALIDAD (QMS)
    (v_checklist_id, 7, '2.7', '¿Existe un método de identificación claro disponible para verificar las piezas que se inspeccionan?',
     'Debe existir un método para identificar claramente el producto',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 8, '2.8', '¿La etiqueta con número de parte, nombre, color, descripción y cantidad coincide con el producto/empaque?',
     'Verificar que toda la información de identificación sea correcta',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 9, '2.9', '¿Todos los materiales dentro del área de inspección están correctamente etiquetados e identificados?',
     'No debe haber material sin identificación en el área',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 10, '2.10', '¿La instrucción de trabajo define un flujo de proceso claro, incluyendo uso de letreros de identificación?',
     'El flujo de proceso debe ser claro y estar documentado',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 11, '2.11', '¿Las instrucciones de trabajo en el libro del proyecto o en el escáner reflejan el nivel de revisión actual en el sistema?',
     'Verificar que la documentación esté actualizada',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 12, '2.12', '¿El miembro del equipo sigue las instrucciones de trabajo y/o alerta de calidad paso a paso como está escrito?',
     'El operador debe seguir el procedimiento documentado',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 13, '2.13', '¿La marca de testigo se coloca en la ubicación correcta según las instrucciones de trabajo?',
     'Verificar ubicación correcta de marcas de inspección',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 14, '2.14', '¿Las piezas certificadas se reempaquetan correctamente según lo recibido y las instrucciones de trabajo?',
     'Verificar que el empaque cumpla con las especificaciones',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 15, '2.15', '¿Las piezas no conformes se empaquetan correctamente según lo recibido y las instrucciones de trabajo?',
     'Verificar segregación y empaque de material no conforme',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 16, '2.16', '¿Las piezas rechazadas han sido correctamente etiquetadas y segregadas como material no conforme?',
     'Verificar identificación clara de material rechazado',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 17, '2.17', '¿La instrucción de trabajo define una ruta de escalamiento clara?',
     'Debe existir un procedimiento documentado de escalamiento',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 18, '2.18', '¿Se colocan etiquetas certificadas (verde) o letreros de colores (rojo, amarillo, verde) en el producto después de la inspección?',
     'Verificar sistema de identificación visual post-inspección',
     'Sistema de Gestión de Calidad', true, 2),

    -- OBSERVACIONES DE REQUERIMIENTOS/HERRAMIENTAS/ACTIVOS
    (v_checklist_id, 19, '2.19', '¿Se ha proporcionado una muestra límite para piezas conformes y no conformes, y está disponible para uso durante la inspección?',
     'Las muestras de referencia deben estar accesibles',
     'Herramientas y Activos', true, 2),

    (v_checklist_id, 20, '2.20', '¿Se utilizan los dispositivos de marcado adecuados y el color correcto según las instrucciones de trabajo?',
     'Verificar uso correcto de marcadores',
     'Herramientas y Activos', false, 1),

    (v_checklist_id, 21, '2.21', '¿El miembro del equipo usa un escáner? Si es así, ¿está el escáner sujeto con cordón y unido al miembro del equipo?',
     'Verificar seguridad del equipo electrónico',
     'Herramientas y Activos', false, 1),

    (v_checklist_id, 22, '2.22', '¿Se requieren herramientas y/o calibradores para este trabajo? Si es así, ¿los calibradores tienen evidencia de calibración?',
     'Verificar estado de calibración de instrumentos',
     'Herramientas y Activos', true, 3),

    (v_checklist_id, 23, '2.23', '¿Se utilizan las herramientas adecuadas según las instrucciones de trabajo?',
     'Verificar uso de herramientas especificadas',
     'Herramientas y Activos', false, 2),

    (v_checklist_id, 24, '2.24', '¿Las herramientas están en condiciones de trabajo adecuadas?',
     'Verificar estado físico de las herramientas',
     'Herramientas y Activos', false, 2),

    (v_checklist_id, 25, '2.25', '¿El manual del Programa de Prevención de Lesiones y Enfermedades está accesible para los miembros del equipo?',
     'Verificar disponibilidad de documentación de seguridad',
     'Herramientas y Activos', false, 1),

    -- OBSERVACIONES DEL ÁREA DE TRABAJO
    (v_checklist_id, 26, '2.26', '¿El área de trabajo está libre de: objetos que caen, resbalones, tropiezos o caídas, riesgos de maquinaria o riesgos eléctricos?',
     'Verificar condiciones de seguridad del área',
     'Área de Trabajo', true, 2),

    (v_checklist_id, 27, '2.27', '¿El área de trabajo cumple con los estándares de 5S?',
     'Verificar orden, limpieza y organización',
     'Área de Trabajo', false, 1),

    (v_checklist_id, 28, '2.28', '¿La iluminación es suficiente para realizar actividades de inspección?',
     'Verificar niveles de iluminación adecuados',
     'Área de Trabajo', false, 2),

    (v_checklist_id, 29, '2.29', '¿El área de trabajo permite el desempeño cómodo de las funciones?',
     'Verificar ergonomía y comodidad del puesto',
     'Área de Trabajo', false, 1),

    -- OBSERVACIONES DE CONTROL DOCUMENTAL
    (v_checklist_id, 30, '2.30', '¿Si el miembro del equipo usa un escáner, está registrado con el número de proyecto y turno correcto?',
     'Verificar registro correcto en el sistema',
     'Control Documental', false, 2),

    (v_checklist_id, 31, '2.31', '¿Si no se usa escáner, el miembro del equipo está usando la revisión correcta de la hoja de conteo para el proyecto asignado?',
     'Verificar uso de documentación actualizada',
     'Control Documental', false, 2),

    (v_checklist_id, 32, '2.32', '¿El miembro del equipo llena la hoja de conteo correctamente con número de proyecto, número de parte, defecto(s), nombre, fecha y turno?',
     'Verificar registro completo de información',
     'Control Documental', false, 2),

    (v_checklist_id, 33, '2.33', '¿El miembro del equipo completa el registro cronológico por día por turno?',
     'Verificar actualización del registro cronológico',
     'Control Documental', false, 2),

    (v_checklist_id, 34, '2.34', '¿El registro cronológico se actualiza en el sistema bajo Resumen del Trabajo diariamente?',
     'Verificar sincronización con sistema',
     'Control Documental', false, 2),

    (v_checklist_id, 35, '2.35', '¿El miembro del equipo firma el checklist diario del inspector en el sistema diariamente por turno?',
     'Verificar firma diaria del checklist',
     'Control Documental', false, 2),

    (v_checklist_id, 36, '2.36', '¿Todos los documentos son legibles y fáciles de leer?',
     'Verificar legibilidad de documentos',
     'Control Documental', false, 1),

    (v_checklist_id, 37, '2.37', '¿Se ha completado una evaluación de riesgos del lugar de trabajo en el sistema para la ubicación?',
     'Verificar existencia de evaluación de riesgos',
     'Control Documental', true, 2),

    (v_checklist_id, 38, '2.38', '¿Se ha realizado una evaluación de riesgos para este proyecto?',
     'Verificar evaluación de riesgos del proyecto',
     'Control Documental', true, 2),

    (v_checklist_id, 39, '2.39', '¿El miembro del equipo ha leído, sido entrenado, entiende y ha firmado las instrucciones de trabajo y/o alerta de calidad?',
     'Verificar entrenamiento documentado',
     'Control Documental', true, 3),

    (v_checklist_id, 40, '2.40', '¿Las instrucciones de trabajo han sido firmadas por el contacto de aprobación de instrucciones de trabajo en el sistema?',
     'Verificar aprobación de documentos',
     'Control Documental', true, 2),

    (v_checklist_id, 41, '2.41', '¿El reconocimiento de entrenamiento de la instrucción de trabajo ha sido firmado por todo el liderazgo y miembros del equipo?',
     'Verificar firmas de reconocimiento de entrenamiento',
     'Control Documental', true, 2),

    (v_checklist_id, 42, '2.42', '¿Se completan las auditorías diarias de trabajo para el proyecto en cada turno que se ejecuta?',
     'Verificar ejecución de auditorías diarias',
     'Control Documental', false, 2),

    (v_checklist_id, 43, '2.43', '¿El cliente ha firmado el WIRF para la revisión actual cargada en los documentos del proyecto?',
     'Verificar aprobación del cliente',
     'Control Documental', false, 2),

    (v_checklist_id, 44, '2.44', '¿Se realiza la junta de pre-turno para cada turno de trabajo?',
     'Verificar realización de juntas de pre-turno',
     'Control Documental', false, 1),

    (v_checklist_id, 45, '2.45', '¿El proyecto ha sido añadido al sistema de archivo de la ubicación?',
     'Verificar registro en sistema de archivos',
     'Control Documental', false, 1),

    (v_checklist_id, 46, '2.46', '¿Los documentos del proyecto están almacenados correctamente en el sistema de archivo de la ubicación?',
     'Verificar almacenamiento correcto de documentos',
     'Control Documental', false, 1);

  END IF;
END $$;

-- ============================================================================
-- 3. CHECKLIST: AUDITORÍA DE DESEMPEÑO Y QMS
-- ============================================================================

INSERT INTO audit_checklists (name, description, standard, process, version, is_active, created_by)
VALUES (
  'Auditoría de Desempeño y QMS',
  'Checklist combinado para evaluar el desempeño del personal y el cumplimiento del Sistema de Gestión de Calidad en operaciones de inspección',
  'Interno',
  'Desempeño/QMS',
  '1.0',
  true,
  1
) ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_checklist_id INTEGER;
BEGIN
  SELECT id INTO v_checklist_id FROM audit_checklists WHERE name = 'Auditoría de Desempeño y QMS' LIMIT 1;

  IF v_checklist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_checklist_items WHERE checklist_id = v_checklist_id) THEN

    -- OBSERVACIÓN DEL MIEMBRO DEL EQUIPO
    INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, category, is_critical, risk_weight) VALUES
    (v_checklist_id, 1, '3.1', '¿El miembro del equipo ha registrado entrada en el sistema de registro de tiempo?',
     'Verificar que el operador haya registrado su entrada al turno',
     'Observación del Personal', false, 1),

    (v_checklist_id, 2, '3.2', '¿El miembro del equipo se encuentra en la estación correcta?',
     'Verificar asignación correcta del operador',
     'Observación del Personal', false, 1),

    (v_checklist_id, 3, '3.3', '¿El miembro del equipo porta el código de vestimenta apropiado?',
     'Pantalón de trabajo, camisa, chaleco de seguridad',
     'Observación del Personal', false, 1),

    (v_checklist_id, 4, '3.4', '¿El miembro del equipo usa gorra si así se requiere?',
     'Verificar uso de gorra cuando aplique',
     'Observación del Personal', false, 1),

    (v_checklist_id, 5, '3.5', '¿El miembro del equipo tiene puesto el EPP adecuado?',
     'Verificar equipo de protección personal completo',
     'Observación del Personal', true, 2),

    (v_checklist_id, 6, '3.6', '¿El miembro del equipo muestra comportamiento profesional sin socialización excesiva con empleados de la ubicación del cliente?',
     'Verificar conducta profesional',
     'Observación del Personal', false, 1),

    (v_checklist_id, 7, '3.7', '¿El miembro del equipo está recargado o sentado en su estación de trabajo?',
     'Verificar postura adecuada de trabajo',
     'Observación del Personal', false, 1),

    (v_checklist_id, 8, '3.8', '¿El miembro del equipo conoce la Política de Calidad o dónde está ubicada?',
     'Verificar conocimiento de política de calidad',
     'Observación del Personal', false, 1),

    -- OBSERVACIÓN DEL PROCESO QMS
    (v_checklist_id, 9, '3.9', '¿Se ha proporcionado una muestra límite para piezas conformes y no conformes, disponible para uso durante la inspección?',
     'Verificar disponibilidad de muestras de referencia',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 10, '3.10', '¿Existe un método de identificación claro disponible para verificar las piezas que se inspeccionan?',
     'Verificar método de identificación del producto',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 11, '3.11', '¿La etiqueta con número de parte, nombre, color, descripción y cantidad coincide con el producto/empaque?',
     'Verificar concordancia de identificación',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 12, '3.12', '¿Todas las instrucciones de trabajo y/o alertas de calidad están ubicadas en la estación de trabajo del inspector?',
     'Verificar disponibilidad de documentación en estación',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 13, '3.13', '¿La instrucción de trabajo define un flujo de proceso claro, incluyendo uso de letreros de identificación?',
     'Verificar claridad del flujo de proceso',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 14, '3.14', '¿Las instrucciones de trabajo en uso están en el nivel de revisión actual?',
     'Verificar versión actualizada de documentos',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 15, '3.15', '¿El miembro del equipo puede entender las instrucciones de trabajo y demuestra cumplimiento según están escritas?',
     'Verificar comprensión y aplicación de instrucciones',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 16, '3.16', '¿El miembro del equipo sigue las instrucciones de trabajo y/o alerta de calidad paso a paso como está escrito?',
     'Verificar seguimiento del procedimiento',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 17, '3.17', '¿El miembro del equipo ha leído, sido entrenado, entiende y ha firmado las instrucciones de trabajo y/o alerta de calidad?',
     'Verificar entrenamiento documentado del operador',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 18, '3.18', '¿Las instrucciones de trabajo han sido firmadas por el contacto de aprobación en el sistema?',
     'Verificar aprobación formal de documentos',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 19, '3.19', '¿El reconocimiento de entrenamiento ha sido firmado por todo el liderazgo y miembros del equipo?',
     'Verificar firmas completas de entrenamiento',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 20, '3.20', '¿La marca de testigo se coloca en el producto después de la inspección?',
     'Verificar aplicación de marca de inspección',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 21, '3.21', '¿Se utilizan los dispositivos de marcado adecuados y el color correcto según las instrucciones de trabajo?',
     'Verificar uso correcto de marcadores',
     'Sistema de Gestión de Calidad', false, 1),

    (v_checklist_id, 22, '3.22', '¿La marca de testigo se coloca en la ubicación correcta según las instrucciones de trabajo?',
     'Verificar ubicación correcta de marca',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 23, '3.23', '¿Las piezas certificadas se reempaquetan correctamente según lo recibido y las instrucciones de trabajo?',
     'Verificar empaque correcto de producto conforme',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 24, '3.24', '¿Las piezas no conformes se empaquetan correctamente según lo recibido y las instrucciones de trabajo?',
     'Verificar manejo de producto no conforme',
     'Sistema de Gestión de Calidad', true, 2),

    (v_checklist_id, 25, '3.25', '¿Las piezas rechazadas han sido correctamente etiquetadas y segregadas como material no conforme?',
     'Verificar segregación de rechazos',
     'Sistema de Gestión de Calidad', true, 3),

    (v_checklist_id, 26, '3.26', '¿La instrucción de trabajo define una ruta de escalamiento clara?',
     'Verificar procedimiento de escalamiento',
     'Sistema de Gestión de Calidad', false, 2),

    (v_checklist_id, 27, '3.27', '¿Se colocan etiquetas certificadas o letreros de colores en el producto después de la inspección?',
     'Verificar identificación visual post-inspección',
     'Sistema de Gestión de Calidad', true, 2),

    -- HERRAMIENTAS Y ACTIVOS
    (v_checklist_id, 28, '3.28', '¿El miembro del equipo usa un escáner? Si es así, ¿está sujeto con cordón y unido al miembro del equipo?',
     'Verificar seguridad del escáner',
     'Herramientas y Activos', false, 1),

    (v_checklist_id, 29, '3.29', '¿Se requieren herramientas y/o calibradores? Si es así, ¿tienen evidencia de calibración?',
     'Verificar calibración de instrumentos',
     'Herramientas y Activos', true, 3),

    (v_checklist_id, 30, '3.30', '¿Se utilizan las herramientas adecuadas según las instrucciones de trabajo?',
     'Verificar uso de herramientas correctas',
     'Herramientas y Activos', false, 2),

    (v_checklist_id, 31, '3.31', '¿Las herramientas están en condiciones de trabajo adecuadas?',
     'Verificar estado de herramientas',
     'Herramientas y Activos', false, 2),

    -- ÁREA DE TRABAJO
    (v_checklist_id, 32, '3.32', '¿El área de trabajo está libre de riesgos de objetos que caen, resbalones, tropiezos, caídas, maquinaria o eléctricos?',
     'Verificar seguridad del área',
     'Área de Trabajo', true, 2),

    (v_checklist_id, 33, '3.33', '¿El área de trabajo cumple con los estándares de 5S?',
     'Verificar orden y limpieza',
     'Área de Trabajo', false, 1),

    (v_checklist_id, 34, '3.34', '¿La iluminación es suficiente para realizar actividades de inspección?',
     'Verificar iluminación adecuada',
     'Área de Trabajo', false, 2),

    (v_checklist_id, 35, '3.35', '¿El área de trabajo permite el desempeño cómodo de las funciones?',
     'Verificar ergonomía del puesto',
     'Área de Trabajo', false, 1),

    -- CONTROL DOCUMENTAL
    (v_checklist_id, 36, '3.36', '¿Si usa escáner, el miembro del equipo está registrado con el número de proyecto y turno correcto?',
     'Verificar registro en sistema',
     'Control Documental', false, 2),

    (v_checklist_id, 37, '3.37', '¿Si no usa escáner, el miembro del equipo usa la revisión correcta de la hoja de conteo?',
     'Verificar documentación manual actualizada',
     'Control Documental', false, 2),

    (v_checklist_id, 38, '3.38', '¿El miembro del equipo llena la hoja de conteo correctamente con toda la información requerida?',
     'Verificar registro completo',
     'Control Documental', false, 2),

    (v_checklist_id, 39, '3.39', '¿El miembro del equipo completa el registro cronológico por día por turno?',
     'Verificar actualización de registros',
     'Control Documental', false, 2),

    (v_checklist_id, 40, '3.40', '¿El registro cronológico se actualiza en el sistema bajo Resumen del Trabajo diariamente?',
     'Verificar sincronización con sistema',
     'Control Documental', false, 2),

    (v_checklist_id, 41, '3.41', '¿El miembro del equipo firma el checklist diario del inspector en el sistema por turno?',
     'Verificar firma de checklist diario',
     'Control Documental', false, 2),

    (v_checklist_id, 42, '3.42', '¿Todos los documentos son legibles y fáciles de leer?',
     'Verificar legibilidad de documentación',
     'Control Documental', false, 1);

  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 031: Checklists de Auditoría completados!';
  RAISE NOTICE '   - Evaluación de Riesgos de Inspección: 16 ítems';
  RAISE NOTICE '   - Auditoría de Proceso: 46 ítems';
  RAISE NOTICE '   - Auditoría de Desempeño y QMS: 42 ítems';
END $$;
