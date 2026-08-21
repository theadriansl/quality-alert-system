# PENDIENTES MASTER - Quality Alert System
> Este archivo NUNCA se borra. Se actualiza al final de cada sesión.
> Última actualización: 2026-08-21

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
| 7 | **Módulo Reportes Masivos (async servidor + UI)** | 16-Ago | ⏳ Depende cierre módulos |
| 8 | ~~BUG: Error 500 en capture-nok (falta part_id + trigger entry_number)~~ | 19-Ago | ✅ 21-Ago |

---

## Prioridad Media - Testing
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~Testing flujo reparador completo~~ | 26-Jun | ✅ 16-Ago |
| 2 | ~~Testing flujo liberador completo~~ | 26-Jun | ✅ 16-Ago |
| 3 | ~~Dashboard Hospital pruebas~~ | 30-Jun | ✅ 16-Ago |
| 4 | Testing formal Auditorías | Arrastrado | ⏳ |
| 5 | Testing Reportes/Dashboard | Arrastrado | ⏳ |
| 6 | Control 360° MRB (ubicaciones) - SIN PROBAR | 26-Jul | ⏳ |
| 7 | Probar Módulo Reportes Hospital | 05-Ago | ⏳ |
| 8 | **Testing Tab Inventario MRBCampaignDetail** | 18-Ago | ⏳ |
| 9 | **Testing Modal Multi-Campaña MRB (inspección individual)** | 19-Ago | ⏳ |
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
| 6 | ECR pruebas aprobaciones | Arrastrado | ⏳ |
| 7 | Módulo Outgoing (envíos) | 16-Jul | ⏳ |
| 8 | Archivo datos históricos | 16-Jul | ⏳ Depende servidor |
| 9 | ~~**ARQUITECTURA: Particionamiento PostgreSQL por mes**~~ | 16-Ago | ✅ 17-Ago |
| ~~10~~ | ~~ARQUITECTURA: Módulo Reportes Masivos~~ | 16-Ago | ↑ Movido a Alta |
| 9 | ~~Vista inventario WIP por ubicación~~ | 26-Jul | ✅ 17-Ago |
| 10 | ~~Alertas paquetes no recibidos~~ | 26-Jul | ✅ 18-Ago |
| 11 | **WebSockets tiempo real (socket.io)** - Notificaciones push | 18-Ago | ⏳ |

---

## Prioridad Baja / Tech Debt
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~Traducciones pendientes (i18n)~~ | 26-Jun | ✅ 17-Ago |
| 2 | ~~Limpieza ESLint warnings (parcial: 536→497)~~ | Arrastrado | ✅ 17-Ago |
| 3 | ~~UX modal desviación~~ | Arrastrado | ✅ 17-Ago |
| 4 | ~~Historial desviaciones (migración)~~ | Arrastrado | ✅ 17-Ago |
| 5 | Refactor temas (WorkloadManager) | Arrastrado | ⏳ |
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

> Para marcar como completado: cambiar ⏳ por ✅ y mover a sección Completados
