/**
 * seed_audit_mock.js — Poblar módulo de auditorías con datos de ejemplo
 * Ejecutar UNA sola vez: node backend/seed_audit_mock.js
 */
const { pool } = require('./config/database');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Programas de auditoría ─────────────────────────────────────────────
    const programs = await client.query(`
      INSERT INTO audit_programs (year, name, description, audit_type, scope, objectives, criteria, frequency_basis, status, created_by, created_at, updated_at)
      VALUES
        (2026, 'Programa IATF 16949 — 2026',
         'Auditorías internas del sistema de gestión de calidad automotriz',
         'system', 'Todo el sistema de gestión de calidad conforme IATF 16949:2016',
         'Verificar conformidad con IATF 16949, identificar oportunidades de mejora, preparar para auditoría de tercera parte',
         'IATF 16949:2016, ISO 9001:2015, Requerimientos específicos de cliente',
         'annual', 'active', 1, NOW(), NOW()),

        (2026, 'Programa Auditorías de Proceso — 2026',
         'Auditorías de procesos productivos y de apoyo',
         'process', 'Líneas de producción, almacén, logística, mantenimiento',
         'Verificar adherencia a instrucciones de trabajo, control de proceso y calidad en punto de uso',
         'Instrucciones de trabajo, planes de control, estándares internos',
         'quarterly', 'active', 1, NOW(), NOW()),

        (2026, 'Programa 5S / Orden y Limpieza — 2026',
         'Auditorías de disciplina 5S en todas las áreas',
         'product', 'Todas las áreas de planta: producción, almacén, oficinas',
         'Mantener y mejorar el nivel de 5S, identificar desviaciones y asegurar acciones correctivas',
         'Estándar 5S interno, criterios de clasificación por área',
         'monthly', 'active', 1, NOW(), NOW())
      RETURNING id, name
    `);
    const [pgIATF, pgProcess, pg5S] = programs.rows;
    console.log('✅ Programas creados:', programs.rows.map(p => p.name));

    // ── 2. Checklists ─────────────────────────────────────────────────────────
    const checklists = await client.query(`
      INSERT INTO audit_checklists (name, description, standard, process, version, is_active, checklist_type, created_by, created_at, updated_at)
      VALUES
        ('Checklist IATF 16949 — Sistema de Calidad',
         'Verificación del sistema de gestión de calidad automotriz',
         'IATF 16949:2016', 'Sistema de Gestión', 'v1.0', true, 'system', 1, NOW(), NOW()),

        ('Checklist Auditoría de Proceso — Ensamble',
         'Verificación de proceso de ensamble y control de calidad en línea',
         'IATF 16949:2016 cl.8.5', 'Ensamble / Producción', 'v1.0', true, 'process', 1, NOW(), NOW()),

        ('Checklist 5S — Área de Producción',
         'Evaluación de 5S: Seiri, Seiton, Seiso, Seiketsu, Shitsuke',
         'Estándar 5S Interno', 'Todas las áreas', 'v2.0', true, 'product', 1, NOW(), NOW()),

        ('Checklist Auditoría de Producto — Inspección Final',
         'Verificación de conformidad del producto terminado vs especificaciones',
         'Plan de Control Rev.3', 'Inspección Final', 'v1.0', true, 'product', 1, NOW(), NOW())
      RETURNING id, name
    `);
    const [clIATF, clProcess, cl5S, clProduct] = checklists.rows;
    console.log('✅ Checklists creados:', checklists.rows.map(c => c.name));

    // ── 3. Ítems de checklist — IATF ─────────────────────────────────────────
    await client.query(`
      INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical, risk_weight)
      VALUES
        ($1, 1,  '4.3',   '¿El alcance del SGC está documentado y disponible?',
         'Revisar documento de alcance, verificar que esté aprobado y publicado.',
         'Documento de alcance SGC firmado', 'Contexto de la Organización', false, 3),
        ($1, 2,  '5.1.1', '¿La alta dirección demuestra liderazgo y compromiso con el SGC?',
         'Verificar objetivos de calidad comunicados, revisión por dirección documentada.',
         'Acta de revisión por dirección, objetivos publicados', 'Liderazgo', true, 5),
        ($1, 3,  '6.1',   '¿Se identifican y gestionan los riesgos y oportunidades?',
         'Revisar matriz de riesgos y oportunidades, acciones planificadas.',
         'Matriz de riesgos actualizada', 'Planificación', true, 4),
        ($1, 4,  '7.2',   '¿El personal que afecta la calidad es competente?',
         'Verificar perfiles de puesto, registros de capacitación y evaluaciones.',
         'Matrices de competencia, registros de capacitación', 'Soporte', false, 3),
        ($1, 5,  '8.4.1', '¿Se controlan los procesos, productos y servicios suministrados externamente?',
         'Revisar lista de proveedores aprobados, criterios de evaluación y re-evaluación.',
         'Lista de proveedores aprobados, evaluaciones de proveedor', 'Operación', true, 5),
        ($1, 6,  '8.5.1', '¿Se controla la producción y la prestación del servicio?',
         'Verificar planes de control, instrucciones de trabajo, parámetros de proceso.',
         'Plan de control, instrucciones de trabajo firmadas', 'Operación', true, 5),
        ($1, 7,  '8.6',   '¿Se realizan las inspecciones y pruebas de producto requeridas?',
         'Verificar registros de inspección, calibración de equipos, criterios de aceptación.',
         'Registros de inspección, certificados de calibración', 'Operación', true, 4),
        ($1, 8,  '9.1.1', '¿Se monitorean y miden los procesos e indicadores del SGC?',
         'Revisar KPIs de calidad, frecuencia de medición, análisis de tendencias.',
         'Tableros de indicadores, reportes de seguimiento', 'Evaluación del Desempeño', false, 3),
        ($1, 9,  '10.2',  '¿Se gestionan adecuadamente las no conformidades y acciones correctivas?',
         'Revisar registro de no conformidades, análisis de causa raíz, cierre de acciones.',
         'Registro NC, acciones correctivas documentadas', 'Mejora', true, 5),
        ($1, 10, '10.3',  '¿Existe un proceso de mejora continua activo y evidenciado?',
         'Verificar proyectos de mejora activos, resultados medibles, benchmarking.',
         'Proyectos de mejora, resultados documentados', 'Mejora', false, 3)
    `, [clIATF.id]);

    // ── Ítems checklist — Proceso Ensamble ───────────────────────────────────
    await client.query(`
      INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical, risk_weight)
      VALUES
        ($1, 1, '8.5.1', '¿El operador conoce y sigue la instrucción de trabajo vigente?',
         'Preguntar al operador pasos críticos. Verificar que la instrucción esté en punto de uso.',
         'Instrucción de trabajo en punto de uso, firma de capacitación', 'Control de Proceso', true, 5),
        ($1, 2, '8.5.1', '¿Los parámetros de proceso están dentro de los límites de control?',
         'Revisar últimas 5 lecturas de parámetros críticos contra límites del plan de control.',
         'Registros de parámetros, plan de control', 'Control de Proceso', true, 5),
        ($1, 3, '8.5.2', '¿La identificación y trazabilidad del producto está asegurada?',
         'Verificar etiquetas, números de parte, lote, fecha en cada estación.',
         'Etiquetas de identificación, registro de trazabilidad', 'Trazabilidad', true, 4),
        ($1, 4, '8.5.3', '¿La propiedad del cliente está identificada y protegida?',
         'Verificar materiales, útiles o herramentales del cliente marcados y almacenados correctamente.',
         'Inventario de propiedad del cliente', 'Propiedad del Cliente', false, 3),
        ($1, 5, '8.5.6', '¿Se controlan los cambios de proceso con AMEF actualizado?',
         'Verificar que cambios recientes tienen aprobación formal y AMEF revisado.',
         'Registro de cambios, AMEF actualizado, aprobación de cliente si aplica', 'Gestión del Cambio', true, 5),
        ($1, 6, '7.1.5', '¿Los equipos de medición están calibrados y son adecuados?',
         'Verificar vigencia de calibración, etiquetas, registros de uso.',
         'Certificados de calibración vigentes', 'Equipos de Medición', true, 4),
        ($1, 7, '8.7',   '¿El producto no conforme está claramente identificado y segregado?',
         'Verificar área de cuarentena, etiquetas de NC, disposición documentada.',
         'Área de cuarentena identificada, registro de NC', 'Control de NC', true, 5),
        ($1, 8, '8.5.1', '¿El Poka-Yoke y controles a prueba de error funcionan correctamente?',
         'Probar dispositivos Poka-Yoke con defecto intencional. Verificar registros de verificación.',
         'Registros de verificación de Poka-Yoke', 'Control de Proceso', true, 5)
    `, [clProcess.id]);

    // ── Ítems checklist — 5S ─────────────────────────────────────────────────
    await client.query(`
      INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical, risk_weight)
      VALUES
        ($1, 1, 'S1', '¿Solo están presentes los elementos necesarios en el área de trabajo?',
         'Verificar que no haya materiales obsoletos, herramientas sin uso, documentos caducos.',
         'Fotografía del área, tarjeta roja si aplica', 'Seiri (Clasificar)', false, 3),
        ($1, 2, 'S1', '¿Los materiales innecesarios tienen tarjeta roja o están en área de disposición?',
         'Revisar zona de tarjetas rojas, verificar fechas y seguimiento.',
         'Registro de tarjetas rojas activas', 'Seiri (Clasificar)', false, 2),
        ($1, 3, 'S2', '¿Cada elemento tiene un lugar definido y etiquetado?',
         'Verificar siluetas, etiquetas de posición, marcas en piso para herramientas y materiales.',
         'Fotografía, etiquetas visibles', 'Seiton (Ordenar)', false, 3),
        ($1, 4, 'S2', '¿Los elementos regresan a su lugar después de ser usados?',
         'Observar durante la auditoría si los operadores reponen materiales y herramientas.',
         'Observación directa', 'Seiton (Ordenar)', false, 2),
        ($1, 5, 'S3', '¿El área de trabajo está limpia y libre de derrames, polvo o suciedad?',
         'Verificar pisos, máquinas, mesas de trabajo. Revisar programa de limpieza.',
         'Programa de limpieza, fotografías', 'Seiso (Limpiar)', false, 3),
        ($1, 6, 'S3', '¿Se identificaron y eliminaron las fuentes de suciedad?',
         'Verificar acciones correctivas sobre fuentes de suciedad identificadas anteriormente.',
         'Acciones correctivas 5S', 'Seiso (Limpiar)', false, 2),
        ($1, 7, 'S4', '¿Existen estándares visuales de 5S publicados y actualizados?',
         'Verificar que los estándares foto-referenciados estén visibles en el área.',
         'Estándares visuales publicados', 'Seiketsu (Estandarizar)', false, 3),
        ($1, 8, 'S5', '¿El personal conoce y practica los estándares 5S del área?',
         'Preguntar a 2 operadores sobre los estándares 5S de su área.',
         'Respuestas correctas de operadores', 'Shitsuke (Disciplina)', false, 3),
        ($1, 9, 'S5', '¿Las acciones correctivas de la auditoría anterior están cerradas?',
         'Revisar plan de acciones de la última auditoría 5S.',
         'Plan de acciones cerrado', 'Shitsuke (Disciplina)', false, 4)
    `, [cl5S.id]);

    // ── Ítems checklist — Producto ────────────────────────────────────────────
    await client.query(`
      INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical, risk_weight)
      VALUES
        ($1, 1, 'PC-1', '¿El producto terminado cumple con las dimensiones críticas del plano?',
         'Medir 3 piezas de lote actual con instrumentos calibrados. Comparar vs tolerancias del plano.',
         'Registros de medición, plano vigente', 'Dimensional', true, 5),
        ($1, 2, 'PC-2', '¿El producto no presenta defectos visuales (burbujas, rebabas, rayaduras)?',
         'Inspeccionar visualmente 5 piezas del lote bajo iluminación adecuada.',
         'Registro de inspección visual', 'Visual', true, 4),
        ($1, 3, 'PC-3', '¿El ensamble cumple con el torque especificado en el plan de control?',
         'Verificar torque de 3 piezas con llave torquímetro calibrada.',
         'Registros de torque, certificado calibración torquímetro', 'Funcional', true, 5),
        ($1, 4, 'PC-4', '¿El etiquetado del producto es correcto y legible?',
         'Verificar número de parte, revisión, código de barras, fecha de fabricación y lote.',
         'Etiqueta del producto vs especificación', 'Trazabilidad', true, 4),
        ($1, 5, 'PC-5', '¿El embalaje protege adecuadamente el producto durante transporte?',
         'Verificar tipo de empaque, cantidad por caja, identificación de caja.',
         'Especificación de empaque, fotografía', 'Embalaje', false, 3)
    `, [clProduct.id]);

    console.log('✅ Ítems de checklist creados');

    // ── 4. Auditorías programadas ─────────────────────────────────────────────
    const schedules = await client.query(`
      INSERT INTO audit_schedules (
        program_id, audit_number, audit_name, description,
        area_process, department, planned_start_date, planned_end_date,
        lead_auditor_id, co_auditors, auditees, checklist_id,
        status, audit_type, planned_hours, created_by, created_at, updated_at
      ) VALUES
        -- IATF pasadas (ya ejecutadas)
        ($1, 'AUD-2026-001', 'Auditoría IATF — Gestión de Calidad Q1',
         'Auditoría interna IATF 16949 primer trimestre — Sistema de Calidad',
         'Sistema de Gestión', 'Calidad', '2026-01-20', '2026-01-21',
         3, ARRAY[6], ARRAY[2,5], $4,
         'completed', 'system', 8, 1, NOW(), NOW()),

        ($1, 'AUD-2026-002', 'Auditoría IATF — Operaciones y Producción Q1',
         'Auditoría interna IATF 16949 — Procesos operativos',
         'Producción', 'Operaciones', '2026-02-10', '2026-02-11',
         6, ARRAY[3], ARRAY[5,4], $4,
         'completed', 'system', 8, 1, NOW(), NOW()),

        -- Proceso pasadas
        ($2, 'AUD-2026-003', 'Auditoría de Proceso — Línea Ensamble A',
         'Verificación de proceso ensamble y controles de calidad en punto de uso',
         'Línea Ensamble A', 'Producción', '2026-02-25', '2026-02-25',
         3, ARRAY[]::integer[], ARRAY[4,5], $5,
         'completed', 'process', 4, 1, NOW(), NOW()),

        ($2, 'AUD-2026-004', 'Auditoría de Proceso — Línea Ensamble B',
         'Verificación de proceso ensamble línea B',
         'Línea Ensamble B', 'Producción', '2026-03-15', '2026-03-15',
         6, ARRAY[]::integer[], ARRAY[4], $5,
         'completed', 'process', 4, 1, NOW(), NOW()),

        -- 5S pasadas
        ($3, 'AUD-2026-005', 'Auditoría 5S — Producción Enero',
         'Evaluación mensual 5S área de producción',
         'Área Producción', 'Producción', '2026-01-31', '2026-01-31',
         6, ARRAY[]::integer[], ARRAY[5], $6,
         'completed', 'product', 2, 1, NOW(), NOW()),

        ($3, 'AUD-2026-006', 'Auditoría 5S — Producción Febrero',
         'Evaluación mensual 5S área de producción',
         'Área Producción', 'Producción', '2026-02-28', '2026-02-28',
         6, ARRAY[]::integer[], ARRAY[5], $6,
         'completed', 'product', 2, 1, NOW(), NOW()),

        -- Próximas programadas
        ($1, 'AUD-2026-007', 'Auditoría IATF — Proveedores y Compras Q2',
         'Auditoría interna IATF 16949 — Control de proveedores externos',
         'Compras / Logística', 'Compras', '2026-05-05', '2026-05-06',
         3, ARRAY[6], ARRAY[2], $4,
         'scheduled', 'system', 8, 1, NOW(), NOW()),

        ($2, 'AUD-2026-008', 'Auditoría de Proceso — Almacén y Logística',
         'Verificación de manejo, almacenamiento y liberación de producto',
         'Almacén / Embarques', 'Logística', '2026-05-20', '2026-05-20',
         6, ARRAY[]::integer[], ARRAY[5], $5,
         'scheduled', 'process', 4, 1, NOW(), NOW()),

        ($3, 'AUD-2026-009', 'Auditoría 5S — Producción Abril',
         'Evaluación mensual 5S área de producción',
         'Área Producción', 'Producción', '2026-04-30', '2026-04-30',
         6, ARRAY[]::integer[], ARRAY[5], $6,
         'scheduled', 'product', 2, 1, NOW(), NOW()),

        ($3, 'AUD-2026-010', 'Auditoría 5S — Almacén Abril',
         'Evaluación mensual 5S área de almacén',
         'Almacén', 'Logística', '2026-04-30', '2026-04-30',
         3, ARRAY[]::integer[], ARRAY[2], $6,
         'scheduled', 'product', 2, 1, NOW(), NOW())

      RETURNING id, audit_number, status
    `, [pgIATF.id, pgProcess.id, pg5S.id, clIATF.id, clProcess.id, cl5S.id]);

    console.log('✅ Auditorías programadas:', schedules.rows.map(s => `${s.audit_number}(${s.status})`));

    const completed = schedules.rows.filter(s => s.status === 'completed');

    // ── 5. Auditorías ejecutadas ──────────────────────────────────────────────
    const audits = await client.query(`
      INSERT INTO audits (
        schedule_id, audit_number, audit_date, lead_auditor_id, co_auditors,
        auditees_present, area_process, total_items,
        conformities, non_conformities_major, non_conformities_minor, observations, opportunities,
        score_percentage, status, created_by, created_at, updated_at
      ) VALUES
        ($1, 'AUD-2026-001', '2026-01-20', 3, ARRAY[6], ARRAY[2,5],
         'Sistema de Gestión', 10, 7, 1, 1, 1, 0, 72.0, 'closed', 1, NOW(), NOW()),

        ($2, 'AUD-2026-002', '2026-02-10', 6, ARRAY[3], ARRAY[5,4],
         'Producción', 10, 8, 0, 1, 1, 0, 85.0, 'closed', 1, NOW(), NOW()),

        ($3, 'AUD-2026-003', '2026-02-25', 3, ARRAY[]::integer[], ARRAY[4,5],
         'Línea Ensamble A', 8, 5, 1, 2, 0, 0, 62.5, 'closed', 1, NOW(), NOW()),

        ($4, 'AUD-2026-004', '2026-03-15', 6, ARRAY[]::integer[], ARRAY[4],
         'Línea Ensamble B', 8, 7, 0, 1, 0, 0, 87.5, 'closed', 1, NOW(), NOW()),

        ($5, 'AUD-2026-005', '2026-01-31', 6, ARRAY[]::integer[], ARRAY[5],
         'Área Producción', 9, 7, 0, 1, 1, 0, 77.8, 'closed', 1, NOW(), NOW()),

        ($6, 'AUD-2026-006', '2026-02-28', 6, ARRAY[]::integer[], ARRAY[5],
         'Área Producción', 9, 8, 0, 0, 1, 0, 88.9, 'closed', 1, NOW(), NOW())

      RETURNING id, audit_number
    `, completed.map(s => s.id));

    console.log('✅ Auditorías ejecutadas:', audits.rows.map(a => a.audit_number));

    // ── 6. Findings representativos ───────────────────────────────────────────
    // AUD-2026-001: NC mayor en gestión de proveedores
    const iatfItems = await client.query(
      'SELECT id, item_order, clause FROM audit_checklist_items WHERE checklist_id=$1 ORDER BY item_order',
      [clIATF.id]
    );
    const processItems = await client.query(
      'SELECT id, item_order, clause FROM audit_checklist_items WHERE checklist_id=$1 ORDER BY item_order',
      [clProcess.id]
    );

    const audit1 = audits.rows[0]; // AUD-001 IATF
    const audit3 = audits.rows[2]; // AUD-003 Proceso Ensamble A

    // Findings AUD-2026-001
    await client.query(`
      INSERT INTO audit_findings (audit_id, checklist_item_id, result, clause, finding_description, objective_evidence, auditor_notes)
      VALUES
        ($1, $2, 'conformity',       '4.3',   'Alcance del SGC documentado y accesible en portal de calidad', 'Documento QMS-001 Rev.5 aprobado 2025-11-01', NULL),
        ($1, $3, 'observation',      '5.1.1', 'Revisión por dirección realizada pero sin evidencia de seguimiento a KPIs de calidad del trimestre anterior', 'Acta de revisión dic-2025 disponible, KPIs sin análisis de tendencia', 'Recomendable agregar análisis de tendencia en próxima revisión'),
        ($1, $4, 'conformity',       '6.1',   'Matriz de riesgos actualizada con 12 riesgos identificados y acciones definidas', 'Matriz RISK-2026 v2', NULL),
        ($1, $5, 'conformity',       '7.2',   'Perfiles de puesto actualizados y matriz de capacitación al día', 'Registros de capacitación 2025-2026', NULL),
        ($1, $6, 'non_conformity',   '8.4.1', 'No se encontró evidencia de re-evaluación de 3 proveedores críticos con desempeño < 85% en 2025', '2 proveedores sin evaluación anual: Proveedor Hernández, Aceros del Norte', 'Requiere acción correctiva inmediata — aplica requisito IATF 8.4.1'),
        ($1, $7, 'conformity',       '8.5.1', 'Planes de control vigentes e instrucciones de trabajo firmadas en todas las líneas auditadas', 'Plan de control PC-2025-003 Rev.2', NULL),
        ($1, $8, 'conformity',       '8.6',   'Inspecciones de producto conforme al plan de control, calibración al día', 'Registros INS-2026-Q1', NULL),
        ($1, $9, 'minor_nc',         '9.1.1', 'KPI de scrap sin actualización desde diciembre 2025, tablero no refleja dato actual', 'Tablero de indicadores con dato dic-2025 en enero 2026', 'Menor — requiere corrección dentro de 30 días'),
        ($1, $10, 'conformity',      '10.2',  'Registro de NCs al día, 6 acciones correctivas activas con responsables y fechas', 'Sistema de NCs actualizado', NULL),
        ($1, $11, 'opportunity',     '10.3',  'Oportunidad de mejora: implementar análisis de tendencia en indicadores clave de proceso', 'Sin análisis de tendencia documentado', 'Considerar para proyecto de mejora 2026')
    `, [
      audit1.id,
      iatfItems.rows[0].id, iatfItems.rows[1].id, iatfItems.rows[2].id, iatfItems.rows[3].id,
      iatfItems.rows[4].id, iatfItems.rows[5].id, iatfItems.rows[6].id, iatfItems.rows[7].id,
      iatfItems.rows[8].id, iatfItems.rows[9].id
    ]);

    // Findings AUD-2026-003 (Proceso Ensamble A — más NCs)
    await client.query(`
      INSERT INTO audit_findings (audit_id, checklist_item_id, result, clause, finding_description, objective_evidence, auditor_notes)
      VALUES
        ($1, $2, 'conformity',     '8.5.1', 'Operadores conocen la instrucción de trabajo y la aplican correctamente', 'Verificación directa con 2 operadores', NULL),
        ($1, $3, 'non_conformity', '8.5.1', 'Parámetro de temperatura de horno fuera de límite de control: registrado 185°C vs límite máx 180°C en 3 registros de turno noche', '3 registros de control de proceso turno noche 2026-02-20 al 22', 'NC Mayor — proceso fuera de control, requiere contención inmediata'),
        ($1, $4, 'conformity',     '8.5.2', 'Trazabilidad de lote asegurada con etiquetas en todas las estaciones', 'Etiquetas verificadas en 5 piezas', NULL),
        ($1, $5, 'minor_nc',      '8.5.3', 'Útiles del cliente sin identificación de propiedad en estación 3', 'Herramental HER-045 sin etiqueta de propiedad cliente', NULL),
        ($1, $6, 'non_conformity', '8.5.6', 'Cambio de material auxiliar realizado sin actualizar AMEF ni notificación a cliente', 'ECO-2026-012 implementado sin AMEF revisado', 'NC Mayor — cambio no gestionado conforme IATF 8.5.6'),
        ($1, $7, 'conformity',     '7.1.5', 'Equipos de medición calibrados, etiquetas vigentes al 2026-06', 'Certificados verificados', NULL),
        ($1, $8, 'non_conformity', '8.7',   'Producto no conforme en área de cuarentena sin disposición documentada — 48 piezas sin etiqueta de disposición', '48 pzas sin forma de disposición, etiquetas solo con "HOLD"', 'NC Menor — requiere disposición formal dentro de 7 días'),
        ($1, $9, 'conformity',     '8.5.1', 'Poka-Yoke verificado con defecto intencional, funcionó correctamente', 'Registro de verificación PY-2026-02-25', NULL)
    `, [
      audit3.id,
      processItems.rows[0].id, processItems.rows[1].id, processItems.rows[2].id,
      processItems.rows[3].id, processItems.rows[4].id, processItems.rows[5].id,
      processItems.rows[6].id, processItems.rows[7].id
    ]);

    console.log('✅ Findings creados');

    // ── 7. No Conformidades ───────────────────────────────────────────────────
    await client.query(`
      INSERT INTO audit_non_conformities (
        audit_id, nc_number, nc_type, clause, description,
        objective_evidence, responsible_id, due_date,
        immediate_action, status, risk_level, created_at, updated_at
      ) VALUES
        -- NCs de AUD-001
        ($1, 'NC-2026-001', 'major', '8.4.1',
         'Falta de re-evaluación anual de proveedores críticos con desempeño inferior al 85%',
         'Proveedores Hernández y Aceros del Norte sin evaluación 2025',
         2, '2026-03-01',
         'Congelar nuevas órdenes a proveedores afectados hasta completar re-evaluación',
         'open', 'high', NOW(), NOW()),

        ($1, 'NC-2026-002', 'minor', '9.1.1',
         'KPI de scrap desactualizado en tablero de indicadores',
         'Dato de diciembre 2025 en tablero revisado en enero 2026',
         6, '2026-02-20',
         'Actualizar tablero de indicadores de forma inmediata',
         'closed', 'low', NOW(), NOW()),

        -- NCs de AUD-003
        ($2, 'NC-2026-003', 'major', '8.5.1',
         'Parámetro de temperatura de horno fuera de límite de control en turno noche',
         'Registros de control de proceso 20-22 feb 2026: 185°C vs máx 180°C',
         5, '2026-03-10',
         'Paro inmediato de horno, revisión y ajuste de control de temperatura, segregar producto del período afectado',
         'open', 'critical', NOW(), NOW()),

        ($2, 'NC-2026-004', 'major', '8.5.6',
         'Cambio de material auxiliar implementado sin actualización de AMEF ni notificación al cliente',
         'ECO-2026-012 sin AMEF revisado, sin evidencia de aprobación de cliente',
         2, '2026-03-25',
         'Congelar uso del material nuevo hasta obtener aprobación formal, preparar AMEF revision',
         'open', 'high', NOW(), NOW()),

        ($2, 'NC-2026-005', 'minor', '8.7',
         'Producto en cuarentena sin disposición formal documentada',
         '48 piezas en área hold sin formulario de disposición',
         4, '2026-03-05',
         'Levantar formularios de disposición para todas las piezas en cuarentena de forma inmediata',
         'closed', 'medium', NOW(), NOW())

      RETURNING id, nc_number
    `, [audit1.id, audit3.id]);

    console.log('✅ No conformidades creadas');

    await client.query('COMMIT');
    console.log('\n🎉 Seed de auditorías completado exitosamente');
    console.log('   Programas: 3 | Checklists: 4 | Auditorías programadas: 10');
    console.log('   Auditorías ejecutadas: 6 | Findings: 18 | NCs: 5 (3 abiertas, 2 cerradas)');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
