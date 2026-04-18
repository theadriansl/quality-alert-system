# Resumen de Sesión — 2026-04-11

## Contexto del Proyecto
QMS (Quality Management System) comercial — React + Node.js/Express + PostgreSQL.
Objetivo de la sesión: Continuar con Dark Mode completo en todos los módulos.

---

## Trabajo Completado Hoy

### 1. Fix de Errores de Compilación (Build Errors)
- **GanttChart.js** — `EditDayPopup` sub-componente usaba `t.xxx` sin llamar `useTheme()` → agregado `const { theme: t } = useTheme()` dentro del componente.
- Build quedó limpio (0 errores).

### 2. Dark Mode — Lote 1 (8 módulos)

| Archivo | Alias | Notas |
|---|---|---|
| `components/8D/D3MFG.js` | `themeColors` | ~13 reemplazos |
| `components/ECR/ECRClosure.js` | `t` | ~79 reemplazos |
| `components/ECR/ECRValidationPlan.js` | `t` | ~22 reemplazos |
| `components/StatTools/ControlChartsTab.js` | `t` | Agregado `useTheme`, convertido `labelStyle/selectStyle/inputStyle/btnStyle` de módulo a dentro del componente |
| `pages/StatisticalTools.js` | `t` | Agregado `useTheme`, ~10 reemplazos |
| `pages/ConfigurationPage.js` | `t` | ~133 colores; sub-componentes `LoadingSpinner`/`Modal` convertidos a function body |
| `pages/UserManagement.js` | `t` | ~5 reemplazos (archivo ya estaba parcialmente hecho) |
| `components/WorkloadDashboard.js` | `t` | ~15 reemplazos incluyendo `RiskGauge`, `renderWorkloadWidget` |

### 3. Dark Mode — Lote 2 (7 módulos)

| Archivo | Alias | Notas |
|---|---|---|
| `components/StatTools/TaguchiTab.js` | `theme` | Reemplazos de `#e5e7eb` en chart grids, botones prev/next, row activo |
| `components/EightDDashboard.js` | `t` | `statusColor` helper actualizado para aceptar `t`; ~20 reemplazos |
| `pages/WorkloadManager.js` | `theme`/`t` | ~267 colores restantes; inputs de proyectos y jerarquía; ExportActivitiesModal |
| `pages/ClientDetail.js` | `theme` | ~34 reemplazos incluyendo `getEventColor`, disabled buttons |
| `pages/MRBCampaignDetail.js` | `t` | Botón secundario, folio color, timeline dots, modal cancelar/confirmar |
| `pages/ClientsList.js` | `t` | Todos los `#0072CE` → `t.accent`, `#9ca3af` → `t.textDim` |
| `pages/MRBCreate.js` | `t` | Step indicators, step labels, source cards, user lists |

### 4. Dark Mode — Lote 3 (13 módulos/grupos)

| Archivo | Alias | Notas |
|---|---|---|
| `pages/MRBCampaigns.js` | `currentTheme` | Hook no se estaba llamando — agregado; ~10 reemplazos |
| `pages/MRBDefectCapture.js` | `currentTheme` | Botón config, boxShadow accent, disabled button |
| `pages/AuditDashboard.js` | `t` | Cards y tooltips `white` → `t.bgCard` |
| `pages/ManagementReview.js` | `themeColors` | Textareas, selects, tabla asistentes, headings |
| `pages/DefectCapture.js` | `currentTheme` | boxShadow, department select, config button |
| `pages/MRBDashboard.js` | `t` | Card y tooltip backgrounds |
| `components/ECR/Dashboard/ChartWidget.js` | `t` | Chart grid strokes, axis lines |
| `components/ECR/Dashboard/ECRTableWidget.js` | `t` | Row hover, stage dots |
| `components/ECR/Dashboard/RiskHeatmapWidget.js` | `t` | Sin cambios (ya estaba hecho) |
| `pages/AuditRequests.js` | `t` | Sin cambios necesarios (ya estaba hecho) |
| `pages/8DWorkflow.js` | `t` | Banner revisión, badge REV |
| `pages/8DConsultation.js` | `themeColors` | Status badge in_progress |
| `components/8D/ProcessFlowBuilder.js` | `t` | Connection lines, arrowhead SVG, banner flotante |

### 5. Dark Mode — Lote 4 (archivos menores + verificaciones)

| Archivo | Alias | Resultado |
|---|---|---|
| `pages/RiskMatrixConfig.js` | `t` | `const styles` movido al interior del componente; 47 reemplazos (fondos, bordes, textos, spinner) |
| `pages/QARCreate.js` | `t` | 27 reemplazos (botones, iconos, user cards, modal) |
| `components/StatTools/GageRRTab.js` | `theme` | `btnStyle` movido dentro del componente; `#3b82f6` → `theme.accent` |
| `components/QARDashboardComponent.js` | `t` | Sin cambios — ya estaba completamente migrado |
| `pages/Home.js` | `t` | Sin cambios — ya completamente migrado |
| `pages/DepartmentsManagement.js` | `t` | Sin cambios — ya completamente migrado |
| `pages/QARList.js` | `t` | Sin cambios — ya completamente migrado |
| Audit pages (11 archivos) | `t` | Sin cambios — los únicos colores restantes son semánticos (`#8b5cf6` observaciones, amarillos warning) |

### 6. Fix GanttChart.js — Vista Gantt blanca en dark mode

**Problema reportado:** La vista Gantt en WorkloadManager aparecía blanca aunque estuviera activo el dark mode.

**Causa:** El objeto `getStyles(t)` tenía todos los fondos hardcodeados como `'white'` o `'#FAFBFC'` y los bordes como `'#E6EAEE'` / `'#d1d5db'`.

**Correcciones aplicadas:**
| Propiedad | Antes | Después |
|---|---|---|
| `container.background` | `'white'` | `t.bgCard` |
| `container.border` | `'1px solid #E6EAEE'` | `t.border` |
| `header.background` | `'#FAFBFC'` | `t.bgPanel` |
| `header.borderBottom` | `'2px solid #E6EAEE'` | `t.border` |
| `taskHeader.background` | `'#FAFBFC'` | `t.bgPanel` |
| `taskHeader.borderRight` | `'2px solid #E6EAEE'` | `t.border` |
| `timelineHeader.background` | `'#FAFBFC'` | `t.bgPanel` |
| `grid.background` | `'white'` | `t.bgCard` |
| `row.borderBottom` | `'1px solid #E6EAEE'` | `t.border` |
| `taskName.background` | `'white'` | `t.bgCard` |
| `taskName.borderRight` | `'2px solid #E6EAEE'` | `t.border` |
| `gridCell.borderRight` | `'1px solid #F4F6F8'` | `t.bgPanel` |
| `complianceColumn.background` | `'white'` | `t.bgCard` |
| `complianceColumn.borderLeft` | `'2px solid #E6EAEE'` | `t.border` |
| Celda sticky taskName | `'white'` | `t.bgCard` |
| Celda sticky compliance | `'white'` | `t.bgCard` |
| Header compliance | `'#FAFBFC'` | `t.bgPanel` |
| Celda alternada (% 7) | `'#FAFBFC'` / `'white'` | `t.bgPanel` / `t.bgCard` |
| Botón "Ir a hoy" | `'#0072CE'` / `'#E6EAEE'` | `t.accent` / `t.bgPanel` |
| Border foco celda | `'#0072CE'` | `t.accent` |
| Border progreso celda | `'#d1d5db'` | `t.border` |
| ComplianceCell borderBottom | `'1px solid #E6EAEE'` | `t.border` |
| Controls bar border | `'1px solid #E6EAEE'` | `t.border` |
| Modal EditDayPopup background | `'white'` | `t.bgCard` |
| Modal EditDayPopup border | `'2px solid #0072CE'` | `t.accent` |
| Inputs del modal (textarea, number) | sin bg/color | `t.bgCard` / `t.text` |

---

## Estado del Build
✅ Build de producción limpio en todos los lotes — 0 errores de compilación.

---

## Pendientes de Dark Mode

El dark mode está esencialmente **completo** en toda la aplicación. Los colores hardcodeados restantes en cualquier archivo son intencionales:
- Colores de estado semánticos: rojo (error/danger), verde (success), amarillo (warning), naranja, púrpura (observaciones)
- Tints de estado: `#dcfce7`, `#fee2e2`, `#dbeafe`, `#fef3c7`, etc.
- Colores de series de charts/gráficas

---

## Sesión 2026-04-12 — Trabajo adicional

### Gage R&R Wizard (`components/StatTools/GageRRTab.js`)
Reescrito completamente con UI wizard de 4 pasos:
| Paso | Contenido |
|---|---|
| 1 · Datos | Selector de dataset + info (filas/columnas) + vista previa de 5 filas |
| 2 · Columnas | Mapeo de Part / Operator / Measurement con filtro anti-duplicados |
| 3 · Opciones | Tolerancia opcional + selector k=6 / k=5.15 + resumen de config |
| 4 · Resultados | KPIs, badge %GRR semántico, NDC, tabla de componentes, tabla ANOVA |
- Botón "▶ Ejecutar Análisis" en paso 3 llama al backend y avanza automáticamente al paso 4
- Botón "🔄 Nuevo Análisis" reinicia desde paso 1
- Build limpio ✅

### Tooltips + Modal informativo (`pages/StatisticalTools.js`)
- Agregado botón **"ℹ️ ¿Cómo usar?"** en la barra de cada tab
- Modal `InfoModal` con contenido por tab: descripción, cuándo usarlo, cómo interpretar, criterios de referencia
- Tabs cubiertos: Datasets, Histogram, Pareto, Capability, Control Charts, Regression, Gage R&R, Taguchi DOE
- Build limpio ✅

### QAR — Navegación desde Dashboard (`components/QARDashboardComponent.js`)
- `QARTable`: filas y botón de acción contextual clickeables → `qar-detail/:id`
- Widgets `risk-vencidas` y `risk-alta-sev`: cada card clickeable → `qar-detail/:id`
- Tab Riesgo → `RiskRow`: clickeable → `qar-detail/:id`
- Build limpio ✅

### QAR — Archivos adjuntos en respuesta
- **Backend**: tabla `qar_response_files` (migration `051`), multer para imágenes/PDF/Word/Excel/txt (10 MB máx), endpoints `POST/GET/DELETE /qar/:id/response-files`, archivos en `uploads/qar-response/`
- **Frontend** (`pages/QARDetail.js`): zona drag & drop + clic en formulario de respuesta; lista con nombre/tamaño/descarga/eliminar; vista solo lectura cuando la respuesta ya fue enviada
- Build limpio ✅

---

## Otros Pendientes del Proyecto (no dark mode)

1. **Taguchi save to BD** — Diferido explícitamente por el usuario.
2. ~~**Gage R&R Wizard**~~ — ✅ Completado 2026-04-12.
3. ~~**Tooltips + Modal informativo**~~ — ✅ Completado 2026-04-12.
4. **Exportación PDF/Excel** para Statistical Tools.
5. ~~**Integrar CollapsibleSection** en componentes 8D~~ — Cancelado: ya está integrado donde corresponde.
6. **Migrar forms** a componentes `FormField / FormSection / FormGrid`.
7. **Refinar módulo MRB** — flujo y UI pendientes de revisión/mejora.
8. **Refinar módulo ECR** — flujo y UI pendientes de revisión/mejora.
9. **Sistema de pendientes por usuario (Bandeja / Notificaciones)**
   - Agregador de acciones requeridas de todos los módulos por usuario autenticado
   - Endpoint único: `GET /notifications/pending` — devuelve ítems agrupados por módulo
   - Módulos incluidos: QAR, 8D, ECR, MRB, Auditorías, Workload
   - Acciones mapeadas por módulo:
     | Módulo | Pendiente |
     |---|---|
     | QAR | QARs asignados a responder · QARs pendientes de validación |
     | 8D | Disciplinas asignadas sin completar · Secciones en espera de aprobación |
     | ECR | ECRs activos donde el usuario es responsable de una etapa |
     | MRB | Campañas activas con captura pendiente · MRBs por cerrar |
     | Auditorías | Auditorías próximas · Hallazgos sin plan de acción · Evidencias por subir |
     | Workload | Actividades vencidas o por vencer asignadas al usuario |
   - Widget "Tu bandeja de hoy" en `Home.js` con link directo a cada ítem
   - **Estado: pendiente — implementar cuando MRB y ECR estén refinados**

---

## Patrones de Alias useTheme por Archivo
| Alias | Archivos que lo usan |
|---|---|
| `t` | GanttChart, ECRClosure, ECRValidationPlan, ECRImpactAnalysis, ECRTeamTab, StatisticalTools, ConfigurationPage, UserManagement, WorkloadDashboard, EightDDashboard, MRBCreate, ClientsList, AuditDashboard, MRBDashboard, 8DWorkflow, ProcessFlowBuilder, ControlChartsTab, ECR Dashboard widgets, RiskMatrixConfig, QARCreate, Home, DepartmentsManagement, QARList, y la mayoría de Audit pages |
| `theme` | TaguchiTab, WorkloadManager (componentes 1-7), GageRRTab |
| `themeColors` | D3MFG, D4ContainmentRootCause, D5CorrectiveActions, D5D6D7Countermeasures, TeamAssignmentTab, D8FollowUpEvidence, 8DConsultation, ManagementReview |
| `currentTheme` | MRBCampaigns, MRBDefectCapture, DefectCapture |
| `t` (scope local) | WorkloadManager componentes desde línea 2448+ |

---

## Patrón Técnico Clave: getStyles(t)
Cuando un `const styles = {}` está FUERA del componente pero referencia `t` (de useTheme hook):
- ❌ **Incorrecto:** `const styles = { color: t.text }` — fuera del componente
- ✅ **Correcto:** `const getStyles = (t) => ({ color: t.text })` — función que recibe `t`
- ✅ **Dentro del componente:** `const styles = getStyles(t)` — llamada después del hook

Archivos corregidos con este patrón: GanttChart.js, ECRImpactAnalysis.js, ECRTeamTab.js, ECRClosure.js, HistoryTab.js, ConfigurationPage.js, ECRValidationPlan.js, RiskMatrixConfig.js, GageRRTab.js.
