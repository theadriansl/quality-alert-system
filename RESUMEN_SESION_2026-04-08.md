# Resumen de Sesión - 8 de Abril 2026

## Completado Hoy

### 1. Módulo QAR Dashboard — Construcción Completa

#### Backend (`backend/endpoints/qarEndpoints.js`)
- Agregado endpoint `GET /qar/dashboard` **antes** de la ruta `/:id` (fix crítico de Express — `/dashboard` era capturado como `id='dashboard'` por `/:id`, disparando `authenticateToken` y devolviendo 401)
- El endpoint computa:
  - **Top Bar KPIs**: total, activos, cerrados, rechazados, alta severidad, SLA resp %, SLA cierre %, vencidas, avg response/closure hours, cerrados sin validación
  - **Gráficas**: volByMonth, byStatus, bySeverity, byTrigger, responseDistribution, slaBySeverity, byDept, byResponsable, byClient
  - **Riesgo**: riskItems (vencidos + alta sev + sin validación), recentQARs (100 registros)
  - **Config**: slaConfig (JOIN con `qar_sla_config` por severity_id)
- Eliminado handler duplicado que quedó en la misma ruta (líneas 1458-1846 removidas con script Node.js)

#### Base de Datos
- Ejecutado SQL de datos mock para QARs (54 registros)
- Sembrada tabla `qar_sla_config` con SLAs por severidad (hours_to_respond, hours_to_close)
- Fixes en datos mock:
  - `assigned_to = NULL` en 50/54 registros → asignados programáticamente usuarios 2-11
  - `closed_at = NULL` en registros CERRADO → calculado como `created_at + hours` dentro del SLA
  - `validation_status = NULL` en cerrados → 9/12 puestos a 'approved', 3 NULL (para KPI "sin validación")

#### Frontend — `QARDashboardComponent.js` (NUEVO, ~1700 líneas)
- **7 tabs**: Volumen & Flujo, Tiempo & Respuesta, Calidad de Respuesta, Operación Interna, Cliente/Proyecto, Riesgo & Alertas, ⚙️ Mi Dashboard
- **Top bar**: 7 KpiTile con métricas clave
- **Tab "Mi Dashboard"**: DnD completo con 26 widgets en 5 categorías
  - `WIDGET_CATALOG` — 26 widgets (KPIs, Gráficas, Riesgo, Calidad, Config)
  - `DEFAULT_WIDGETS` — 8 widgets por defecto
  - `STORAGE_KEY = 'qar-custom-dashboard-v1'`
  - Drag handle `⠿`, remove button `✕`, modo edición, Restablecer / Limpiar todo
- **QARTable**: Tabla siempre visible con 100 registros, filtros search/sev/status/dept, filas vencidas en rojo
- Librerías DnD: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - `PointerSensor` con `activationConstraint: { distance: 5 }` para prevenir drag accidental

#### Frontend — `QARDashboard.js` (REESCRITO)
- Fetch a `GET /qar/dashboard` sin auth token
- Header: logo QAR, ThemeSelector, botones Módulos / 🔍 Inspección (`/defect-capture`) / Lista QARs / + Nueva QAR
- Renderiza `<QARDashboardComponent data={dashData} />`

---

### 2. CustomDashboard — Componente Reutilizable DnD

**Archivo**: `frontend/src/components/CustomDashboard.js` (NUEVO, ~230 líneas)

**Props**: `{ storageKey, catalog, defaultWidgets, renderWidget, data }`

**Internals**:
- `SortableWidget`: usa `useSortable`, drag handle `⠿` izquierdo, botón ✕ en edit mode, KPI sm con `paddingLeft: 20px`
- `DragGhost`: overlay visual durante drag con rotación 2°
- `colSpan(size)`: `lg` → `'span 2'`, otros → `'span 1'`
- Picker agrupado por categoría (`cat`), toggle pills style
- Toolbar: contador de widgets, hint "arrastra ⠿", Restablecer, Limpiar todo, ✏️ Personalizar / ✓ Listo
- Grid: `repeat(4, 1fr)`, `alignItems: 'start'`
- Persistencia en `localStorage` con `storageKey`

---

### 3. "Mi Dashboard" aplicado horizontalmente a 8D Dashboard

**Archivo**: `frontend/src/components/EightDDashboard.js`

**Agregado**:
- `import CustomDashboard from './CustomDashboard'`
- `EIGHTD_CATALOG` — 26 widgets en 4 categorías (KPIs, Gráficas, Riesgo, Calidad)
  - KPIs (12): kpi-total, kpi-activos, kpi-cerrados, kpi-alta-sev, kpi-sla, kpi-vencidos, kpi-sin-d4, kpi-draft, kpi-costo, kpi-vencen7, kpi-estancados, kpi-avance
  - Charts (8): chart-trend, chart-steps, chart-sla, chart-days-dept, chart-cost-dept, chart-cost-sup, chart-progress, chart-pareto
  - Riesgo (3): risk-score, risk-vencidos, risk-alta-d4, risk-estancados
  - Calidad (2): qual-root-causes, vencen-7-list
- `EIGHTD_DEFAULT` — 8 widgets por defecto
- `render8DWidget(id, { data, derived })` — renderiza los 26 widgets usando `KpiTile`, `MiniChartWrapper`, recharts
- `MiniChartWrapper` — wrapper ligero sin `useTheme` (funciona dentro de función plana, no hook)
- Tab `{ id: 'personalizado', label: '⚙️ Mi Dashboard' }` agregado al array `TABS`
- Lógica de render: `activeTab === 'personalizado'` → `<CustomDashboard storageKey="8d-custom-dashboard-v1" ...>`

---

### 4. "Mi Dashboard" aplicado horizontalmente a Workload Manager

**Archivo**: `frontend/src/components/WorkloadDashboard.js`

**Agregado**:
- `import CustomDashboard from './CustomDashboard'`
- `WORKLOAD_CATALOG` — 22 widgets en 6 categorías (KPIs, Carga, Ejecución, Actividades, Riesgo, Proyectos)
  - KPIs (11): kpi-util, kpi-sobrecarga, kpi-planeado, kpi-real-plan, kpi-retrasadas, kpi-cumplimiento, kpi-productividad, kpi-leadtime, kpi-throughput, kpi-avance, kpi-riesgo
  - Carga (2): chart-util-bar, chart-horas
  - Ejecución (2): chart-est-real, chart-productividad
  - Actividades (2): chart-act-pie, chart-flujo
  - Riesgo (3): riesgo-gauge, riesgo-items, riesgo-recomend
  - Proyectos (2): chart-kpi-hrs, chart-dept-eff
- `WORKLOAD_DEFAULT` — 8 widgets por defecto
- `renderWorkloadWidget(id, kpis)` — renderiza los 22 widgets usando los sub-componentes existentes
- `WLCardWrapper` — wrapper ligero con título para widgets de gráficas
- Tab `{ id: 'personalizado', label: '⚙️ Mi Dashboard' }` agregado al array `TABS`
- Lógica de render: `activeTab === 'personalizado'` → `<CustomDashboard storageKey="workload-custom-dashboard-v1" ...>`

---

## Estado de Build

- ✅ `npm run build` — exitoso, sin errores
- ⚠️ Warnings pre-existentes (no nuevos):
  - `import/no-anonymous-default-export` en servicios y utils
  - Bundle size grande (>500 kB) — pre-existente

---

## Archivos Modificados/Creados Esta Sesión

### Nuevos
| Archivo | Descripción |
|---------|-------------|
| `frontend/src/components/QARDashboardComponent.js` | Dashboard QAR completo con 7 tabs, 26 widgets DnD |
| `frontend/src/components/CustomDashboard.js` | Componente reutilizable DnD para cualquier dashboard |

### Modificados
| Archivo | Cambio Principal |
|---------|-----------------|
| `backend/endpoints/qarEndpoints.js` | `GET /qar/dashboard` antes de `/:id`, eliminado duplicado |
| `frontend/src/pages/QARDashboard.js` | Reescrito: fetch dashboard + header completo |
| `frontend/src/components/EightDDashboard.js` | Agregado EIGHTD_CATALOG, render8DWidget, tab ⚙️ Mi Dashboard |
| `frontend/src/components/WorkloadDashboard.js` | Agregado WORKLOAD_CATALOG, renderWorkloadWidget, tab ⚙️ Mi Dashboard |

---

## Arquitectura del Sistema "Mi Dashboard"

```
CustomDashboard (shared)
├── props: storageKey, catalog, defaultWidgets, renderWidget, data
├── SortableWidget (drag handle ⠿, remove ✕, DnD via useSortable)
├── DragGhost (overlay visual durante drag)
├── Picker (agrupado por cat, pills toggleables)
├── Grid 4 columnas (sm=span1, md=span1, lg=span2)
└── localStorage persistence

QARDashboardComponent  →  storageKey: 'qar-custom-dashboard-v1'    (26 widgets)
EightDDashboard        →  storageKey: '8d-custom-dashboard-v1'     (26 widgets)
WorkloadDashboard      →  storageKey: 'workload-custom-dashboard-v1' (22 widgets)
```

**Patrón de integración**:
```javascript
// Cada dashboard define:
const MI_CATALOG = [ { id, cat, label, size, icon }, ... ]
const MI_DEFAULT = [ 'id1', 'id2', ... ]
const renderMiWidget = (id, data) => <ReactNode />

// Y en el JSX del tab:
<CustomDashboard
  storageKey="mi-dashboard-v1"
  catalog={MI_CATALOG}
  defaultWidgets={MI_DEFAULT}
  renderWidget={(id) => renderMiWidget(id, data)}
  data={data}
/>
```

---

## Pendientes

### Prioridad Alta
1. ~~**Sistema de notificaciones por email**~~ — **DESCARTADO** — Solo mailto, no se implementará envío real
2. **Verificar Taguchi save to BD** — Confirmar que datos se guardan correctamente (arrastre de sesión anterior)

### Prioridad Media (UX 8D)
3. ~~Integrar `CollapsibleSection` en componentes 8D~~ — **DESCARTADO** — las Ds ya dividen el formulario, el scrolling está controlado
4. ~~Integrar `useConfirmation()` hook~~ — **YA IMPLEMENTADO**
5. ~~Integrar `DisabledFieldWrapper`~~ — **YA IMPLEMENTADO**
6. ~~Integrar `SectionProgressIndicator`~~ — **YA IMPLEMENTADO** en D3, D4, D5, D5D6D7, D8, TeamAssignmentTab

### Prioridad Media (Dashboard)
7. **Workload — Mi Dashboard datos reales**: `renderWorkloadWidget` usa `kpis._raw?.sumEst` — verificar que `_raw` llega correctamente desde el backend cuando el tab `personalizado` está activo (el `kpis` objeto llega solo cuando `topBar && data` están listos)
8. ~~**QAR SLA config tab**~~ — **COMPLETADO** (sesión 2026-04-09): Modal editable con PUT /qar/sla-config, validación, re-fetch automático. Gráfica SLA reemplazada por barras de progreso con % y conteos ✓/✗.

### Pendientes de Arrastre
9. ~~Correcciones Gantt~~ — **COMPLETADO** (sesión 2026-04-08)
10. Sincronización workload
11. Tema oscuro — ajustes finales

---

## Notas Técnicas

### Fix Express Route Order (QAR)
```javascript
// ❌ INCORRECTO — /:id captura /dashboard como id='dashboard'
router.get('/:id', authenticateToken, handler)
router.get('/dashboard', handler)   // NUNCA llega aquí

// ✅ CORRECTO — /dashboard definido ANTES de /:id
router.get('/dashboard', handler)
router.get('/:id', authenticateToken, handler)
```

### render*Widget — Función plana, no componente
Los renderers (`render8DWidget`, `renderWorkloadWidget`) son funciones planas que retornan JSX — **no pueden usar hooks directamente**. Los sub-componentes que llaman (`KpiTile`, `RiskGauge`, `Card`) sí usan `useTheme()` internamente, por lo que el theming funciona igual.

### PointerSensor con activationConstraint
```javascript
useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
// Previene drag accidental al hacer click en botones dentro del widget
```

### Widget size system
| size | gridColumn | Uso típico |
|------|------------|------------|
| `sm` | `span 1`   | KPI tiles (número grande, sin gráfica) |
| `md` | `span 1`   | Gráficas pequeñas, listas cortas |
| `lg` | `span 2`   | Gráficas wide, tablas, listas largas |
