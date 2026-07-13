# Propuesta Dashboard - Hospital de Defectos

## Contexto del Sistema

El "Hospital de Defectos" es un módulo donde:
- Se reciben piezas defectuosas detectadas en inspección
- Técnicos las reparan en estaciones de reparación (tipo REPAIR)
- QA las libera en estaciones de liberación (tipo RELEASE)
- Se rastrea el área responsable del defecto

### Estados del flujo:
```
OPEN → IN_REPAIR → REPAIRED → IN_VALIDATION → CLOSED/RELEASED
         ↓
      REJECTED (regresa a reparación)
         ↓
      QUARANTINE / SCRAPPED (casos especiales)
```

---

## ESTRUCTURA DE TABS (Basada en QAR Dashboard)

| Tab | Descripción | Enfoque |
|-----|-------------|---------|
| **📋 Resumen** | Vista ejecutiva con KPIs principales y gráficos clave | Gerencia |
| **⏱️ Tiempos** | Análisis de tiempos de cola, reparación y liberación | Eficiencia |
| **👨‍🔧 Reparadores** | Estadísticas individuales de técnicos | Productividad |
| **✅ Liberadores** | Estadísticas de inspectores QA | Calidad |
| **🏭 Estaciones** | Throughput y utilización por estación | Capacidad |
| **📊 Departamentos** | Pareto de responsabilidad por área | Responsabilidad |
| **🚨 Aging** | Defectos envejecidos y alertas | Riesgo |
| **⚙️ Mi Dashboard** | Widgets configurables arrastrables | Personalizado |

---

## TAB 1: RESUMEN (Vista Ejecutiva)

### Top Bar KPIs (siempre visible)
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Pendientes │ │ En Reparac. │ │  Por Liberar│ │  Cerrados   │ │  Rechazados │ │ MTTR (min)  │ │ Tasa Éxito  │
│     45      │ │     12      │ │      8      │ │    127      │ │      3      │ │   12.5      │ │   94.2%     │
│   ↑ 5%      │ │   ↓ 10%    │ │   = 0%      │ │   ↑ 15%     │ │   ↓ 2%     │ │   ↓ 8%      │ │   ↑ 1.2%   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Gráficos del Resumen
1. **Tendencia Semanal** (Line Chart): Ingresados vs Reparados vs Liberados
2. **Distribución por Estado** (Pie): OPEN, IN_REPAIR, REPAIRED, CLOSED, etc.
3. **Top 5 Tipos de Defecto** (Horizontal Bar)
4. **Semáforo de Aging** (Heatmap mini)

---

## TAB 2: TIEMPOS ⏱️

### KPIs de Tiempo
| Métrica | Fórmula | Descripción |
|---------|---------|-------------|
| **Tiempo en Cola** | `AVG(repair_started_at - captured_at)` | Espera antes de iniciar reparación |
| **MTTR** | `AVG(repair_time_minutes)` | Mean Time To Repair |
| **Tiempo de Validación** | `AVG(released_at - repaired_at)` | Espera para liberación |
| **Cycle Time Total** | `AVG(released_at - captured_at)` | Tiempo total en hospital |

### Visualizaciones
1. **Distribución de Tiempos** (Box Plot o Histogram)
   - Tiempo en cola
   - Tiempo de reparación
   - Tiempo de liberación

2. **Tendencia de MTTR** (Line Chart por día/semana)

3. **Tiempos por Tipo de Defecto** (Bar Chart)
   - ¿Qué defectos toman más tiempo?

4. **Tiempos por Turno** (Grouped Bar)
   - Comparar eficiencia por turno

### Cálculos SQL
```sql
-- Tiempos promedio
SELECT
  AVG(EXTRACT(EPOCH FROM (repair_started_at - captured_at))/60) as avg_queue_minutes,
  AVG(repair_time_minutes) as avg_repair_minutes,
  AVG(EXTRACT(EPOCH FROM (released_at - repaired_at))/60) as avg_release_minutes,
  AVG(EXTRACT(EPOCH FROM (released_at - captured_at))/60) as avg_cycle_minutes,

  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY repair_time_minutes) as median_repair,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY repair_time_minutes) as p90_repair
FROM defect_entries_v2
WHERE repair_status = 'CLOSED'
  AND captured_at > CURRENT_TIMESTAMP - INTERVAL '30 days';
```

---

## TAB 3: REPARADORES 👨‍🔧

### KPIs por Reparador
| Métrica | Descripción |
|---------|-------------|
| **Defectos Reparados** | Total completados |
| **MTTR Personal** | Tiempo promedio del técnico |
| **Tasa de Rechazo** | % rechazados de sus reparaciones |
| **Defectos/Hora** | Throughput personal |
| **Tiempo Activo** | Horas con reparaciones asignadas |

### Visualizaciones
1. **Ranking de Reparadores** (Horizontal Bar)
   - Ordenado por volumen o eficiencia (configurable)

2. **Comparativa de MTTR** (Bar Chart)
   - Benchmark vs promedio del equipo

3. **Tendencia Individual** (Sparklines)
   - Mini gráficos de productividad semanal

4. **Distribución de Carga** (Pie)
   - ¿Quién tiene más carga?

### Tabla Detallada
| Reparador | Reparados | En Proceso | MTTR | Rechazos | Tasa Éxito | Trend |
|-----------|-----------|------------|------|----------|------------|-------|
| Juan Pérez | 45 | 3 | 10.2 min | 2 | 95.6% | ↑ |
| María López | 38 | 2 | 12.1 min | 1 | 97.4% | → |
| ... | ... | ... | ... | ... | ... | ... |

### Cálculos SQL
```sql
-- Estadísticas por reparador
SELECT
  u.id as user_id,
  CONCAT(u.first_name, ' ', u.last_name) as repairer_name,
  COUNT(*) FILTER (WHERE d.repair_status IN ('CLOSED', 'REPAIRED')) as completed,
  COUNT(*) FILTER (WHERE d.repair_status = 'IN_REPAIR') as in_progress,
  AVG(d.repair_time_minutes) FILTER (WHERE d.repair_status = 'CLOSED') as avg_mttr,
  COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') as rejected_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') /
    NULLIF(COUNT(*) FILTER (WHERE d.repair_status IN ('CLOSED', 'REJECTED')), 0)
  , 1) as success_rate
FROM users u
JOIN defect_entries_v2 d ON d.repaired_by = u.id
WHERE d.captured_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY completed DESC;
```

---

## TAB 4: LIBERADORES ✅

### KPIs por Inspector QA
| Métrica | Descripción |
|---------|-------------|
| **Defectos Liberados** | Total aprobados |
| **Defectos Rechazados** | Devueltos a reparación |
| **Tasa de Rechazo** | % que rechaza (indicador de rigurosidad) |
| **Tiempo Promedio Validación** | Qué tan rápido libera |
| **Defectos Pendientes** | Cola actual asignada |

### Visualizaciones
1. **Ranking de Liberadores** (Horizontal Bar)

2. **Tasa de Rechazo por Inspector** (Bar Chart)
   - ¿Quién es más estricto?

3. **Volumen Diario** (Stacked Bar por inspector)

4. **Distribución de Motivos de Liberación** (Donut)

### Cálculos SQL
```sql
-- Estadísticas por liberador
SELECT
  u.id as user_id,
  CONCAT(u.first_name, ' ', u.last_name) as releaser_name,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as released,
  COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') as rejected,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') /
    NULLIF(COUNT(*), 0)
  , 1) as rejection_rate,
  AVG(d.release_time_minutes) as avg_release_time
FROM users u
JOIN defect_entries_v2 d ON d.released_by = u.id
WHERE d.released_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY released DESC;
```

---

## TAB 5: ESTACIONES 🏭

### KPIs por Estación
| Métrica | Descripción |
|---------|-------------|
| **Throughput Diario** | Defectos procesados por día |
| **Utilización** | % tiempo ocupada |
| **WIP** | Work In Progress actual |
| **Tiempo Promedio** | En esa estación |

### Visualizaciones
1. **Comparativa de Estaciones** (Grouped Bar)
   - Repair vs Release

2. **Heatmap de Actividad** (Matrix)
   - Estación x Hora del día

3. **WIP por Estación** (Horizontal Bar con semáforo)

### Cálculos SQL
```sql
-- Por estación de reparación
SELECT
  s.id, s.name, s.station_type,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as completed,
  COUNT(*) FILTER (WHERE d.repair_status = 'IN_REPAIR') as wip,
  AVG(d.repair_time_minutes) as avg_time
FROM inspection_stations s
LEFT JOIN defect_entries_v2 d ON d.repair_station_id = s.id
WHERE s.station_type = 'REPAIR'
GROUP BY s.id, s.name, s.station_type;
```

---

## TAB 6: DEPARTAMENTOS 📊

### Pareto de Responsabilidad
1. **Defectos por Departamento** (Pareto Chart)
   - Barras + línea acumulada 80/20

2. **Reasignaciones** (Sankey o Chord Diagram)
   - De dónde a dónde se reasignan

3. **Costo Estimado por Área** (Treemap)
   - `SUM(repair_time_minutes) * costo_minuto`

4. **Tendencia por Departamento** (Small Multiples)

### Cálculos SQL
```sql
SELECT
  dep.name,
  COUNT(*) as total,
  SUM(repair_time_minutes) as total_minutes,
  COUNT(*) FILTER (WHERE original_department_id IS NOT NULL
    AND original_department_id != department_id) as received_reassignments,
  COUNT(*) FILTER (WHERE original_department_id = dep.id
    AND department_id != dep.id) as sent_reassignments
FROM defect_entries_v2 d
JOIN departments dep ON d.department_id = dep.id
GROUP BY dep.id, dep.name
ORDER BY total DESC;
```

---

## TAB 7: AGING 🚨

### Semáforos de Envejecimiento
| Bucket | Condición | Color |
|--------|-----------|-------|
| 0-4 horas | Normal | 🟢 Verde |
| 4-8 horas | Atención | 🟡 Amarillo |
| 8-24 horas | Alerta | 🟠 Naranja |
| 24-48 horas | Crítico | 🔴 Rojo |
| >48 horas | Escalamiento | ⚫ Negro |

### Visualizaciones
1. **Heatmap de Aging** (Matrix)
```
              0-4h   4-8h   8-24h  24-48h  >48h
Pendientes    [12]   [8]    [15]   [7]     [3]
En Reparación [5]    [4]    [2]    [1]     [0]
Por Liberar   [6]    [2]    [0]    [0]     [0]
```

2. **Lista de Críticos** (Table)
   - Defectos > 24h sin resolver

3. **Tendencia de Aging** (Area Chart)
   - ¿Estamos mejorando o empeorando?

---

## TAB 8: MI DASHBOARD ⚙️ (Configurable)

### Catálogo de Widgets Disponibles

#### Categoría: KPIs
| Widget ID | Label | Tamaño Default |
|-----------|-------|----------------|
| `kpi-pendientes` | Pendientes de Reparación | sm |
| `kpi-in-repair` | En Reparación | sm |
| `kpi-por-liberar` | Por Liberar | sm |
| `kpi-cerrados` | Cerrados (período) | sm |
| `kpi-mttr` | MTTR Promedio | sm |
| `kpi-queue-time` | Tiempo en Cola | sm |
| `kpi-release-time` | Tiempo de Liberación | sm |
| `kpi-success-rate` | Tasa de Éxito | sm |
| `kpi-rejection-rate` | Tasa de Rechazo | sm |
| `kpi-aging-24h` | Aging > 24h | sm |

#### Categoría: Gráficas
| Widget ID | Label | Tamaño Default |
|-----------|-------|----------------|
| `chart-trend-week` | Tendencia Semanal | lg |
| `chart-by-status` | Pie por Estado | md |
| `chart-by-defect-type` | Top Tipos Defecto | lg |
| `chart-by-department` | Pareto Departamentos | lg |
| `chart-mttr-trend` | Tendencia MTTR | lg |
| `chart-by-repairer` | Ranking Reparadores | lg |
| `chart-by-releaser` | Ranking Liberadores | lg |
| `chart-by-station` | Por Estación | lg |

#### Categoría: Riesgo
| Widget ID | Label | Tamaño Default |
|-----------|-------|----------------|
| `risk-aging-heatmap` | Heatmap Aging | lg |
| `risk-critical-list` | Lista Críticos | lg |
| `risk-score` | Índice de Riesgo | md |

#### Categoría: Personal
| Widget ID | Label | Tamaño Default |
|-----------|-------|----------------|
| `my-repairs` | Mis Reparaciones | md |
| `my-releases` | Mis Liberaciones | md |
| `my-pending` | Mi Cola Pendiente | md |

### Funcionalidad
- **Drag & Drop** para reordenar
- **Tamaños**: sm (1 col), md (2 col), lg (3 col), xl (4 col)
- **Persistencia**: localStorage
- **Botones**: Personalizar, Restablecer, Limpiar

---

## FILTROS GLOBALES

| Filtro | Tipo | Opciones |
|--------|------|----------|
| Período | Preset + Custom | Hoy, Semana, Mes, Trimestre, Año, Todo |
| Cliente | Multi-select | Lista de clientes |
| Proyecto | Multi-select | Filtrado por cliente |
| Estación | Multi-select | REPAIR / RELEASE |
| Departamento | Multi-select | Lista de áreas |
| Turno | Multi-select | 1, 2, 3 |
| Reparador | Multi-select | Lista de técnicos |
| Liberador | Multi-select | Lista de QA |

---

## VISTAS SQL NECESARIAS

### v_hospital_dashboard_summary
```sql
CREATE VIEW v_hospital_dashboard_summary AS
SELECT
  -- Conteos por estado
  COUNT(*) FILTER (WHERE repair_status = 'OPEN') as pending_count,
  COUNT(*) FILTER (WHERE repair_status = 'IN_REPAIR') as in_repair_count,
  COUNT(*) FILTER (WHERE repair_status IN ('REPAIRED', 'IN_VALIDATION')) as pending_release_count,
  COUNT(*) FILTER (WHERE repair_status = 'CLOSED') as closed_count,
  COUNT(*) FILTER (WHERE repair_status = 'REJECTED') as rejected_count,

  -- Tiempos promedio
  AVG(repair_time_minutes) FILTER (WHERE repair_status = 'CLOSED') as avg_mttr,
  AVG(EXTRACT(EPOCH FROM (repair_started_at - captured_at))/60) as avg_queue_minutes,
  AVG(EXTRACT(EPOCH FROM (released_at - repaired_at))/60) as avg_release_minutes,

  -- Tasas
  ROUND(100.0 * COUNT(*) FILTER (WHERE repair_status = 'CLOSED') /
    NULLIF(COUNT(*) FILTER (WHERE repair_status IN ('CLOSED', 'REJECTED')), 0), 1) as success_rate,

  -- Aging
  COUNT(*) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR')
    AND captured_at < CURRENT_TIMESTAMP - INTERVAL '24 hours') as aging_24h

FROM defect_entries_v2
WHERE captured_at > CURRENT_TIMESTAMP - INTERVAL '30 days';
```

### v_hospital_by_repairer
```sql
CREATE VIEW v_hospital_by_repairer AS
SELECT
  u.id as user_id,
  CONCAT(u.first_name, ' ', u.last_name) as name,
  COUNT(*) FILTER (WHERE d.repair_status IN ('CLOSED', 'REPAIRED')) as completed,
  COUNT(*) FILTER (WHERE d.repair_status = 'IN_REPAIR') as in_progress,
  AVG(d.repair_time_minutes) as avg_mttr,
  COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') as rejected,
  COUNT(*) / NULLIF(COUNT(DISTINCT DATE(d.repaired_at)), 0)::decimal as daily_avg
FROM users u
JOIN defect_entries_v2 d ON d.repaired_by = u.id
WHERE d.captured_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id;
```

### v_hospital_by_releaser
```sql
CREATE VIEW v_hospital_by_releaser AS
SELECT
  u.id as user_id,
  CONCAT(u.first_name, ' ', u.last_name) as name,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as released,
  COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') as rejected,
  AVG(d.release_time_minutes) as avg_release_time,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') /
    NULLIF(COUNT(*), 0), 1) as rejection_rate
FROM users u
JOIN defect_entries_v2 d ON d.released_by = u.id
WHERE d.released_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id;
```

---

## PREGUNTAS PARA CONTRAPROPUESTA

1. ¿Qué métricas adicionales de tiempo son críticas en manufactura?
2. ¿Cómo balancear transparencia vs presión en métricas individuales?
3. ¿Qué alertas automáticas deberían enviarse por email/notificación?
4. ¿Cómo calcular un "índice de riesgo" compuesto del hospital?
5. ¿Qué benchmarks de industria existen para MTTR y tasa de rechazo?
6. ¿Debería incluirse gamificación (rankings, badges) para motivar?
7. ¿Cómo manejar la comparación entre turnos de forma justa?
8. ¿Qué exportaciones (Excel, PDF) son necesarias?

---

## NOTAS DE IMPLEMENTACIÓN

- Usar `recharts` para gráficos (ya instalado)
- Usar `@dnd-kit` para drag & drop (ya instalado)
- Estructura de componentes similar a QARDashboardComponent
- Filtros globales con presets de período
- Refresh automático cada 5 minutos (configurable)
- Exportar a Excel/PDF por tab

---

*Documento preparado para revisión y contrapropuesta con ChatGPT*
