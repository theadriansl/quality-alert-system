# PENDIENTES MASTER - Quality Alert System
> Este archivo NUNCA se borra. Se actualiza al final de cada sesión.
> Última actualización: 2026-08-16 (Sesión 4)

---

## Prioridad Alta (Bugs / Críticos)
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | ~~BUG: Defectos de Spec NOK no se crean~~ | 04-Jul | ✅ 14-Ago |
| 2 | ~~Test flujo re-verificación completo~~ | 04-Jul | ✅ 14-Ago |
| 3 | ~~Integrar check-can-dispose en UI Hospital~~ | 23-Jul | ✅ 16-Ago |
| 4 | Test end-to-end Hospital → MRB → Hospital | 23-Jul | ⏳ |
| 5 | MRBDashboard no refleja partes en MRB | 26-Jul | ⏳ |
| 6 | Estaciones MRB mal configuradas | 26-Jul | ⏳ |

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
| 9 | **ARQUITECTURA: Particionamiento PostgreSQL por mes** | 16-Ago | ⏳ Planear |
| 10 | **ARQUITECTURA: Módulo Reportes Masivos (async servidor)** | 16-Ago | ⏳ Planear |
| 9 | Vista inventario WIP por ubicación | 26-Jul | ⏳ |
| 10 | Alertas paquetes no recibidos | 26-Jul | ⏳ |

---

## Prioridad Baja / Tech Debt
| # | Tarea | Origen | Estado |
|---|-------|--------|--------|
| 1 | Traducciones pendientes (i18n) | 26-Jun | ⏳ |
| 2 | Limpieza ESLint warnings | Arrastrado | ⏳ |
| 3 | UX modal desviación | Arrastrado | ⏳ |
| 4 | Historial desviaciones (migración) | Arrastrado | ⏳ |
| 5 | Refactor temas (WorkloadManager) | Arrastrado | ⏳ |
| 6 | Skills/Training certificaciones ILUO | Arrastrado | ⏳ |
| 7 | Work Instructions versionamiento | Arrastrado | ⏳ |
| 8 | Performance Hospital volumen alto | 05-Ago | ⏳ |
| 9 | Review permisos Hospital | 05-Ago | ⏳ |
| 10 | Cache de imágenes (código visible) | 05-Ago | ⏳ |
| 11 | Attachments asociación correcta | 05-Ago | ⏳ |
| 12 | Paginación server-side Hospital | 05-Ago | ⏳ |

---

## Completados
| Tarea | Fecha |
|-------|-------|
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
