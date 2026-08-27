# PENDIENTES MASTER - Quality Alert System
> Este archivo NUNCA se borra. Se actualiza al final de cada sesión.
> Última actualización: 2026-08-27

---

## Prioridad Alta (Bugs / Críticos)
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~BUG: Defectos de Spec NOK no se crean~~ | 04-Jul | ✅ 14-Ago |
| 2 | ~~Test flujo re-verificación completo~~ | 04-Jul | ✅ 14-Ago |
| 3 | ~~Integrar check-can-dispose en UI Hospital~~ | 23-Jul | ✅ 16-Ago |
| 4 | ~~Test end-to-end Hospital → MRB → Hospital~~ | 23-Jul | ✅ 18-Ago |
| 5 | ~~MRBDashboard no refleja partes en MRB~~ | 26-Jul | ✅ 18-Ago (Tab Inventario) |
| 6 | ~~Estaciones MRB mal configuradas~~ | 26-Jul | ✅ 19-Ago (MRB01/MRB02 existen) |
| 7 | ~~Módulo Reportes Masivos (async servidor + UI)~~ | 16-Ago | ✅ 21-Ago |
| 8 | ~~BUG: Error 500 en capture-nok (falta part_id + trigger entry_number)~~ | 19-Ago | ✅ 21-Ago |
| 9 | ~~BUG: repair_status NULL en defectos MRB (4 INSERTs faltaban repair_status)~~ | 27-Ago | ✅ 27-Ago |
| 10 | ~~WebSocket no actualiza tiempo real entre ventanas (Hospital)~~ | 27-Ago | ✅ 27-Ago (era servidores viejos) |

---

## Prioridad Media - Testing
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~Testing flujo reparador completo~~ | 26-Jun | ✅ 16-Ago |
| 2 | ~~Testing flujo liberador completo~~ | 26-Jun | ✅ 16-Ago |
| 3 | ~~Dashboard Hospital pruebas~~ | 30-Jun | ✅ 16-Ago |
| 4 | Testing formal Auditorías | Arrastrado | ⏳ |
| 5 | Testing Reportes/Dashboard | Arrastrado | ⏳ |
| 6 | ~~Control 360° MRB (ubicaciones)~~ | 26-Jul | ✅ 23-Ago |
| 7 | Probar Módulo Reportes Hospital | 05-Ago | ⏳ |
| 8 | **Testing Tab Inventario MRBCampaignDetail** | 18-Ago | ⏳ |
| 9 | ~~Testing Modal Multi-Campaña MRB (inspección individual)~~ | 19-Ago | ✅ 23-Ago |
| 10 | ~~Verificar partes "omitidas" en import-mass~~ | 20-Ago | ✅ 21-Ago (discrepancias claras) |

---

## Prioridad Media - Funcionalidades
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~PDF Export con fotos verificar~~ | 01-Jul | ✅ 15-Ago |
| 2 | ~~Export Excel MRB Campaigns + Filtros~~ | 27-Jun | ✅ 16-Ago |
| 3 | ~~Export Excel 8D Consultation~~ | 27-Jun | ✅ 16-Ago |
| 4 | ~~PRINT_LABELS (Kanban)~~ | 02-Jul | ❌ Descartado |
| 5 | ~~8D generación PDF refactorizada~~ | Arrastrado | ✅ 15-Ago |
| 6 | ~~ECR pruebas aprobaciones (ECR-3 ✅, ECR-4 ciclo OK ✅, ECR-4 NO ADOPTABLE ✅)~~ | Arrastrado | ✅ 26-Ago |
| 7 | ~~Módulo Outgoing (envíos)~~ | 16-Jul | ❌ Fuera de alcance (ReleaseOK cierra ciclo) |
| 8 | ~~Archivo datos históricos~~ | 16-Jul | ❌ No aplica (automotriz retiene 7+ años, particionamiento cubre performance) |
| 9 | ~~**ARQUITECTURA: Particionamiento PostgreSQL por mes**~~ | 16-Ago | ✅ 17-Ago |
| ~~10~~ | ~~ARQUITECTURA: Módulo Reportes Masivos~~ | 16-Ago | ↑ Movido a Alta |
| 9 | ~~Vista inventario WIP por ubicación~~ | 26-Jul | ✅ 17-Ago |
| 10 | ~~Alertas paquetes no recibidos~~ | 26-Jul | ✅ 18-Ago |
| 11 | ~~**WebSockets tiempo real (socket.io)** - Notificaciones push~~ | 18-Ago | ✅ 26-Ago (completo: defectos, QAR, 8D, ECR, MRB) |
| 12 | ~~**Reporte Trazabilidad por Estaciones** - Multi-estación seleccionable, serial, timestamp, defecto, resultado, usuario, info completa~~ | 26-Ago | ✅ 26-Ago |

---

## Prioridad Baja / Tech Debt
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~Traducciones pendientes (i18n)~~ | 26-Jun | ✅ 17-Ago |
| 2 | ~~Limpieza ESLint warnings (parcial: 536→497)~~ | Arrastrado | ✅ 17-Ago |
| 3 | ~~UX modal desviación~~ | Arrastrado | ✅ 17-Ago |
| 4 | ~~Historial desviaciones (migración)~~ | Arrastrado | ✅ 17-Ago |
| 5 | ~~Refactor temas (WorkloadManager)~~ | Arrastrado | ✅ 27-Ago |
| 6 | Skills/Training certificaciones ILUO | Arrastrado | ⏳ |
| 7 | Work Instructions versionamiento | Arrastrado | ⏳ |
| 8 | ~~Performance Hospital volumen alto~~ | 05-Ago | ✅ 17-Ago |
| 9 | ~~Review permisos Hospital~~ | 05-Ago | ✅ 17-Ago |
| 10 | ~~Cache de imágenes (código visible)~~ | 05-Ago | ✅ Cerrado |
| 11 | ~~Attachments asociación correcta~~ | 05-Ago | ✅ Cerrado |
| 12 | ~~Paginación server-side Hospital~~ | 05-Ago | ✅ 17-Ago |

---

## Completados
| Tarea | Fecha |
|-------|-------|
| ✅ Marcadores diarios Gantt: Restaurados (5px, t.accent, hoy t.primary, tooltip detalle) | 27-Ago |
| ✅ Fix línea HOY Gantt: z-index 1, 1px, t.textMuted, etiqueta solo en header | 27-Ago |
| ✅ Fix porcentaje barra Gantt: Fuera de barra (6px derecha), mono 10.5px | 27-Ago |
| ✅ Fix botones toolbar Gantt: "Hoy" t.primary, resto borde neutro | 27-Ago |
| ✅ Rediseño Vista Lista WorkloadManager: Tabla 44px, StatusChip, ProgressBar, 2 columnas expandida | 27-Ago |
| ✅ GanttChart responsive: Panel colapsa columnas (1280px/1024px breakpoints) | 27-Ago |
| ✅ Rediseño GanttChart: Header 2 niveles, agrupamiento, barras duales, panel 5 columnas, leyenda | 27-Ago |
| ✅ Fix: repair_status NULL en defectos creados desde MRB (4 INSERT statements + 2 seeds) | 27-Ago |
| ✅ Fix: Query location-codes/assign incluye repair_status IS NULL (defectos recién capturados) | 27-Ago |
| ✅ Fix: Open Items filter excluye 'closed_rejected' y 'closed_not_adopted' para ECRs | 27-Ago |
| ✅ WebSocket listeners agregados: HospitalDashboard (10 eventos), HospitalTransferPackages (3), MRBCampaigns (6), MRBCampaignDetail (5) | 27-Ago |
| ✅ WebSocket events backend: mrb:created, mrb:updated, mrb:closed en mrbEndpoints.js | 27-Ago |
| ✅ WebSocket event: hospital:location-assigned en locationCodesEndpoints.js | 27-Ago |
| ✅ WebSockets: Eventos completos (defect:*, qar:*, 8d:*, ecr:*, mrb:*, package:*, spec:*, release:*, production:*, deviation:*) | 26-Ago |
| ✅ ECR: Exportar PDF completo (captura todas las etapas + historial) | 26-Ago |
| ✅ ECR: Modal centrado para confirmación de envío a aprobación | 26-Ago |
| ✅ ECR: Ciclo completo con 1 solo aprobador (sin errores) | 26-Ago |
| ✅ ECR-4: Cierre NO ADOPTABLE probado y funcionando | 26-Ago |
| ✅ ECR: Scroll memory persistente por tab (sessionStorage) | 26-Ago |
| ✅ ECR: Fix dropdown validación TFT (maneja objetos user vs IDs) | 26-Ago |
| ✅ ECR: Auto-save y delete de actividades en Master Plan | 26-Ago |
| ✅ ECR: Mensaje "Guarda como Draft para avanzar" en ECR-1 | 26-Ago |
| ✅ FIX: Bug levelnull_approver en queries de aprobación | 26-Ago |
| ✅ ECR-4: Ciclo aprobación OK completo (nivel 1→2→3, cierre, solo lectura) | 25-Ago |
| ✅ ECR-4: Acceso permitido a admin/emisor/aprobadores durante pending_approval | 25-Ago |
| ✅ ECR-4: Retención datos auditor (nombres, judgment, deadlines, verified by) | 25-Ago |
| ✅ ECR-4: Validación campos obligatorios (fecha efectiva, lote adopción) | 25-Ago |
| ✅ FIX: Mailto separador cambiado de coma a semicolon (;) en todo el sistema | 25-Ago |
| ✅ FIX: "Verified by" muestra auditor correcto (no líder) | 25-Ago |
| ✅ FIX: QARCreate mailto en emisión inicial | 25-Ago |
| ✅ ECR-3: Testing completo (firmas validación, log sin falsos positivos) | 25-Ago |
| ✅ Fix: Open Items muestra ECRs pendientes de aprobación (query corregido) | 25-Ago |
| ✅ ECR: Flujo aprobaciones nivel 1→2→3 funcionando | 25-Ago |
| ✅ ECR: Rechazar y devolver a creator funciona | 25-Ago |
| ✅ ECR: Validación TFT muestra equipo default | 25-Ago |
| ✅ ECR: Prevención bypass ECR-3 sin aprobación | 25-Ago |
| ✅ ECR: Mensaje mejorado para "Consulta" en aprobaciones | 25-Ago |
| ✅ ECR: Validation Evidence se desbloquea al rechazar | 25-Ago |
| ✅ ECR: Firma de validación guarda inmediatamente en backend | 25-Ago |
| ✅ ECR: Log auditoría para firmas de validación | 25-Ago |
| ✅ ECR: Fix log falsos positivos (NaN, objetos vacíos) | 25-Ago |
| ✅ ECR: Backend limpia firma al rechazar (permite re-firmar) | 25-Ago |
| ✅ Home: Widget OPEN ITEMS (QAR/8D/ECR abiertos del usuario) | 24-Ago |
| ✅ Home: Checkbox funcional con persistencia localStorage (7 días auto-limpieza) | 24-Ago |
| ✅ Home: Links correctos a qar-detail, 8d-workflow, ecr-workflow | 24-Ago |
| ✅ Backend: Endpoint /notifications/my-pending (QAR assigned/created, 8D responsible/created, ECR created/approver) | 24-Ago |
| ✅ Home: ACCESOS DIRECTOS con label posición absoluta (INS, EST, REL, MRB) | 24-Ago |
| ✅ Home: Badges con color primario t.primary (azul QMS) | 24-Ago |
| ✅ Home: Rediseño 4 grupos fijos (PROCESO/DOCUMENTACIÓN/ADMINISTRACIÓN/SISTEMA) | 24-Ago |
| ✅ Home: HomeReminders "MI WORKLOAD" + HomeNotifications "OPEN ITEMS" columna izquierda | 24-Ago |
| ✅ Home: Layout alineado (gaps 8px, padding 16px, soporte bilingüe ES/EN) | 24-Ago |
| ✅ Home: Widget HomeReminders con actividades pendientes (columna izquierda) | 23-Ago |
| ✅ MRB Capture: Auto-selección de campañas donde serial está IN_LIST o NO_LIST_DEFINED | 23-Ago |
| ✅ MRB Capture: Registro simultáneo en múltiples campañas seleccionadas | 23-Ago |
| ✅ MRB Capture: Serial se agrega a inventario incluso sin lista predefinida (NO_LIST_DEFINED) | 23-Ago |
| ✅ MRB Capture: Validación serial/lote antes de submit con mensaje claro | 23-Ago |
| ✅ MRB Capture: Reset estados multi-campaña al cambiar campaña/parte/serial | 23-Ago |
| ✅ Módulo Reportes Masivos: Backend async + UI ReportCenter (7 tipos de reporte) | 21-Ago |
| ✅ Reportes: Schema fixes (projects.project_name, 8D supplier_name, audits area_process) | 21-Ago |
| ✅ Reportes: Download con query param token + soporte fake tokens | 21-Ago |
| ✅ Fix capture-nok/ok: Validación part_id obligatorio en campañas multi-parte | 21-Ago |
| ✅ Fix capture-nok/ok: Seriales adicionales (OUT_OF_LIST) se agregan a inventario campaña | 21-Ago |
| ✅ Tab Inventario: Separador visual "— Adicionales (N) —" para seriales fuera de lista | 21-Ago |
| ✅ Modal import-mass: Sección discrepancias compacta expandible (Serial/Excel/Inventario) | 21-Ago |
| ✅ Modal import-mass: Fix doble modal de confirmación | 21-Ago |
| ✅ Modal import-mass: Fix input comment lag (useRef vs useState) | 21-Ago |
| ✅ Modal import-mass: Matemáticas correctas (reprocesos vs adicionales) | 21-Ago |
| ✅ Modal import-mass: Lista completa seriales con status OK/NOK expandible | 20-Ago |
| ✅ Modal import-mass: Lista reprocesos expandible (sin límite de 10) | 20-Ago |
| ✅ Seriales "adicionales" (fuera de inventario) se agregan automáticamente a campaña | 20-Ago |
| ✅ Terminología: "omitidos" → "adicionales (fuera de campaña)" + "omitidos (parte no existe)" | 20-Ago |
| ✅ Modal import-mass: Siempre muestra preview/confirmación antes de importar (R1+) | 20-Ago |
| ✅ Modal import-mass: Validación serial vs parte en inventario con warning expandible | 20-Ago |
| ✅ Tab Inventario: Columnas sticky (Serial/Parte/Fecha) con scroll horizontal (una tabla) | 20-Ago |
| ✅ Fix import-mass: Ahora actualiza mrb_affected_serials (inspected, result) | 20-Ago |
| ✅ Tab Inventario: Columnas dinámicas por ronda (R1-R7) con resultado + inspector | 20-Ago |
| ✅ Sincronización retroactiva de seriales ya inspeccionados | 20-Ago |
| ✅ Modal Multi-Campaña: Endpoint `campaigns-by-part` busca en parts_list JSONB | 19-Ago |
| ✅ Modal Multi-Campaña: Pre-carga resultados anteriores (OK pre-marcado, NOK sin marcar) | 19-Ago |
| ✅ Modal Multi-Campaña: Badge visual "↻ Previo: OK/NOK" en campañas ya inspeccionadas | 19-Ago |
| ✅ Fix reproceso: Quitado `AND NOT inspected` en capture-ok/nok | 19-Ago |
| ✅ Fix serial en modal: Envía `serialNumber` explícito en llamadas | 19-Ago |
| ✅ Fix importación masiva MRB: Query incluye parts_list JSONB + validación filas sin parte | 19-Ago |
| ✅ MRBCampaignDetail: Tab "Inventario" con seriales afectados (planeados vs inspeccionados) | 18-Ago |
| ✅ Flujo bidireccional Hospital ↔ MRB completo y funcional | 18-Ago |
| ✅ Modal recepción estilo "hover" (cierra con overlay click + botón X) | 18-Ago |
| ✅ Filtro ubicaciones por contexto (Hospital: REPAIR/RELEASE, MRB: MRB/QUARANTINE) | 18-Ago |
| ✅ Fix 500 error recepción paquetes (parseInt para params PostgreSQL) | 18-Ago |
| ✅ Botón "Crear Paquete" sticky arriba con lista scrollable | 18-Ago |
| ✅ Removido QAR/8D selectors de modal envío MRB (info ya en campaña) | 18-Ago |
| ✅ Ubicación destino pre-seleccionada en modal recepción | 18-Ago |
| ✅ HospitalTransferPackages: Nueva página /hospital-packages (espejo de MRB) | 18-Ago |
| ✅ Tab Alertas en Hospital y MRB con tiempos Target/Transcurrido/Excedido | 18-Ago |
| ✅ Click en alerta navega directo al paquete para recibir/ver detalle | 18-Ago |
| ✅ Backend: alertHours → alertMinutes (industria requiere precisión en minutos) | 18-Ago |
| ✅ Filtros Excel multi-select en DefectHospital (todas las columnas, todos los tabs) | 18-Ago |
| ✅ DefectHospital: Banner link a Transferencias Hospital en tab MRB | 18-Ago |
| ✅ Fix bug: contenido SEND se mostraba al refrescar en otros tabs MRBTransferPackages | 18-Ago |
| ✅ Home: Rediseño treemap heatmap estilo bolsa de valores | 17-Ago |
| ✅ Home: Soporte temas claro/oscuro en treemap | 17-Ago |
| ✅ Vista inventario WIP por ubicación (dashboard compacto + desglose status) | 17-Ago |
| ✅ WIP: Categoría "EN PROCESO" para defectos sin ubicación asignada | 17-Ago |
| ✅ Hospital: Vistas restauradas (v_defects_all, pending_repair, pending_release, etc.) | 17-Ago |
| ✅ Hospital: Migración 098 (v_defects_all) + 170 (v_hospital_wip_by_location) | 17-Ago |
| ✅ Paginación server-side Hospital (cubierto por particiones + archivado + límites) | 17-Ago |
| ✅ Review permisos Hospital (pulido con habilidades de user) | 17-Ago |
| ✅ UX modal desviación (funciona bien, sencillo) | 17-Ago |
| ✅ Historial desviaciones (no necesario, módulo funcional) | 17-Ago |
| ✅ Performance Hospital volumen alto (particiones + límite RepairStation) | 17-Ago |
| ✅ Cache de imágenes (arrastrado, ya estaba resuelto) | 17-Ago |
| ✅ Attachments asociación correcta (arrastrado, ya estaba resuelto) | 17-Ago |
| ✅ Traducciones i18n: EN/ES sincronizados (912 keys cada uno) | 17-Ago |
| ✅ ESLint cleanup parcial: 536→497 warnings (-39) | 17-Ago |
| ✅ Fix error parsing ApprovalTimeline.js (tr duplicado) | 17-Ago |
| ✅ Limpieza imports no usados en 12+ componentes 8D | 17-Ago |
| ✅ Auto-partitioning: Funciones PostgreSQL + Scheduler server.js | 17-Ago |
| ✅ Migraciones 166 + 167 + 168: 4 tablas particionadas | 17-Ago |
| ✅ RepairStation: Optimización carga (límite 100 + búsqueda backend) | 16-Ago |
| ✅ MRBCampaigns: Export Excel + Filtros inline estilo Excel + Periodo | 16-Ago |
| ✅ QARList: Export Excel + Filtros inline estilo Excel en headers | 16-Ago |
| ✅ QARList: Filtros de periodo (Semana/Mes/Trimestre/Año/Todos) + rango fechas | 16-Ago |
| ✅ 8DConsultation: Export Excel (ya existía, verificado) | 16-Ago |
| ✅ RepairStation: Auto-scroll navegación teclado | 16-Ago |
| ✅ RepairStation: Check MRB antes de reparar/liberar/scrap | 16-Ago |
| ✅ RepairStation: Modal cuarentena para campañas pendientes | 16-Ago |
| ✅ RepairStation: Tracking ubicación reparación/liberación | 16-Ago |
| ✅ RepairStation: Contadores pre-calculados (pending/repaired/released/quarantine) | 16-Ago |
| ✅ Hospital: Lista cuarentena muestra campañas MRB pendientes | 16-Ago |
| ✅ Hospital: Return-to-repair permite salir con campañas pendientes | 16-Ago |
| ✅ Testing flujo reparador completo | 16-Ago |
| ✅ Testing flujo liberador completo | 16-Ago |
| ✅ Dashboard Hospital pruebas | 16-Ago |
| ✅ 8D: Generación PDF mejorada y refactorizada | 15-Ago |
| ✅ 8D: Workflow expandido con funcionalidad adicional | 15-Ago |
| ✅ 8D: D5D6D7Countermeasures componente mejorado | 15-Ago |
| ✅ RepairStation: Vista simplificada 3 columnas (Partes/Defectos/Detalle) | 15-Ago |
| ✅ RepairStation: Selector ubicación persistente por turno | 15-Ago |
| ✅ RepairStation: Badge tipo estación (REPARACIÓN/LIBERACIÓN) en header | 15-Ago |
| ✅ RepairStation: Resumen defectos abiertos/cerrados por serial | 15-Ago |
| ✅ RepairStation: Detalle estilo InlineDefectDetailModal con secciones | 15-Ago |
| ✅ RepairStation: Lightbox para fotos (navegación teclado + descarga) | 15-Ago |
| ✅ RepairStation: Botones acción Reparar/Liberar/Cuarentena/Scrap | 15-Ago |
| ✅ RepairStation: Navegación por teclado entre columnas | 15-Ago |
| ✅ Módulo Calibración: Gestión equipos CRUD + estados | 15-Ago |
| ✅ Módulo Calibración: Historial calibraciones con certificados | 15-Ago |
| ✅ Módulo Calibración: Correlación con specs vía instrument_code | 15-Ago |
| ✅ Módulo Calibración: Derivación estaciones desde specs | 15-Ago |
| ✅ Módulo Calibración: Tab Costos con filtros y gráfica | 15-Ago |
| ✅ ISO 9001:2015 §7.1.5.2 / IATF 16949 §7.1.5.2.1 compliance | 15-Ago |
| ✅ Spec Checklist: Acumulación resultados entre estaciones | 14-Ago |
| ✅ Spec Checklist: Layout dos columnas (evaluar izq + resumen der) | 14-Ago |
| ✅ Spec Checklist: Botón N/A para omitir specs individuales | 14-Ago |
| ✅ Spec Checklist: Input comentario rápido en NOK/N/A | 14-Ago |
| ✅ Spec Checklist: Prevención de defectos duplicados | 14-Ago |
| ✅ Spec Checklist: Liberación automática al cambiar NOK→OK | 14-Ago |
| ✅ Spec Checklist: Warnings redundantes eliminados | 14-Ago |
| ✅ UI: Colores corporativos B2B (azul/gris sobrio) | 14-Ago |
| ✅ UI: Overlay modales menos intenso (opacity 0.4) | 14-Ago |
| ✅ Serial defects: No mostrar "0 defectos" (solo si hay) | 14-Ago |
| ✅ BUG: Defectos de Spec NOK no se crean (query usaba client_id inexistente en production_entries) | 14-Ago |
| ✅ Reproceso: validación serial liberado + modal + flag is_reprocess | 05-Ago |
| ✅ Historial estaciones en trazabilidad Hospital | 05-Ago |
| ✅ Módulo Reportes Hospital (preview + export) | 05-Ago |
| ✅ Fix uppercase en trazabilidad | 05-Ago |
| ✅ Control 360° MRB ubicaciones (implementado) | 26-Jul |
| ✅ Matriz asignación de campañas | 24-Jul |
| ✅ Asignación bulk seriales a campañas | 24-Jul |
| ✅ MRB Inventory columnas dinámicas por campaña | 23-Jul |
| ✅ Selector ubicación Hospital y MRB | 23-Jul |
| ✅ Control inspección por campaña | 23-Jul |
| ✅ Location Codes funcionando | 23-Jul |
| ✅ Inspección masiva MRB (950 OK, 50 NOK) | 17-Jul |
| ✅ Grid configuración defectos | 06-Jul |
| ✅ MRB: Ligar seriales a campaña desde listado | 11-Jul |

---

## Notas Sesión 27-Ago-2026

### Completado hoy:
1. **FIX repair_status NULL**: 4 INSERT en mrbEndpoints.js + 2 seed scripts no tenían repair_status. Corregidos + query para actualizar 59 registros existentes.
2. **FIX location-codes/assign**: Query ahora incluye `repair_status IS NULL` para encontrar defectos recién capturados.
3. **FIX Open Items ECR**: Filter ahora excluye 'closed_rejected' y 'closed_not_adopted'.
4. **WebSocket listeners agregados**: HospitalDashboard, HospitalTransferPackages, MRBCampaigns, MRBCampaignDetail.
5. **WebSocket events backend**: mrb:created, mrb:updated, mrb:closed, hospital:location-assigned.

### Resuelto (continuación 27-Ago):
6. **WebSocket Hospital**: Funcionando correctamente. El problema era servidores desactualizados.
7. **WebSocket MRB**: Funcionando correctamente entre ventanas.
8. **Fix MRBDefectCapture**: Alerta "PARTE INCORRECTA" persistía al cambiar campaña. Agregado reset de estados de validación en `selectCampaign()`.
9. **Refactor temas WorkloadManager**: 260→1 colores hardcodeados. Estandarizado a `{ theme: t }` y variables del tema.
10. **Rediseño completo GanttChart** (WorkloadManager):
    - Header de dos niveles (banda mes + banda día con letra/número)
    - Agrupamiento automático de tareas (Recurrentes > 8D/CAPA > Proyectos > Actividades)
    - Panel izquierdo compacto 470px con 5 columnas (prioridad, actividad, fechas, %, estado)
    - Barras duales: plan arriba (7px gris), real abajo (9px color según estado)
    - Leyenda al pie con todos los estados
    - Componentes memoizados: TimelineHeader, GroupBand, GanttLegend
    - Helpers puros: getTaskGroup(), calcCompliance()
    - Filas compactas de 40px
    - Removida columna ComplianceCell (ahora integrada en panel izquierdo)
11. **GanttChart responsive**: Panel izquierdo colapsa columnas según ancho de ventana (≥1280px todas, ≥1024px sin fechas/estado, <1024px solo actividad).
12. **Rediseño Vista Lista WorkloadManager**:
    - Nuevo archivo `ListViewComponents.js` con componentes puros de presentación
    - De tarjetas a tabla con filas 44px
    - Header de columnas: Actividad · Inicio·Fin · Avance · Real/Esp · Estado
    - StatusChip discreto (punto 5px + texto)
    - ProgressBar con marca de esperado
    - Fila expandida en dos columnas (Meta + Historial/Evidencia)
    - Tabs con subrayado 2px (no pastillas)
    - Fix "undefined undefined" en archivos de evidencia
13. **Fix línea HOY en Gantt**: z-index 1 (detrás de barras), 1px, color t.textMuted, etiqueta solo en header.
14. **Fix porcentaje barra Gantt**: Movido fuera de la barra (6px a la derecha), mono 10.5px, t.textMuted.
15. **Fix botones toolbar Gantt**: "Hoy" primario (t.primary), resto secundarios (borde neutro).
16. **Marcadores diarios Gantt**: Restaurados debajo de barra real (5px alto), color t.accent (hoy t.primary), tooltip con detalle.

---

> Para marcar como completado: cambiar ⏳ por ✅ y mover a sección Completados
