# PLAN: ECR Dashboard Estilo Power BI

## Objetivo
Transformar el ECRDashboard.js actual en un dashboard empresarial profesional con visualizaciones dinámicas, filtros interactivos y métricas en tiempo real.

---

## FASE 1: Estructura y Filtros Globales

### 1.1 Barra de Filtros Superior
```jsx
// Filtros que afectan todas las visualizaciones
- Período: Hoy | Esta Semana | Este Mes | Este Trimestre | Este Año | Custom
- Cliente: Dropdown con todos los clientes
- Departamento: Dropdown con departamentos únicos de createdBy
- Vista: General | Por Cliente | Por Departamento
```

### 1.2 Backend - Nuevo Endpoint de Estadísticas
```javascript
// GET /ecr/dashboard-stats
// Query params: startDate, endDate, clientId, department

Response:
{
  kpis: {
    total: 47,
    draft: 12,
    pending: 8,
    approved: 25,
    rejected: 2,
    avgApprovalDays: 4.2,
    avgStageTime: 1.1,
    effectivenessRate: 92
  },
  trends: [...],
  byType: [...],
  byCategory: [...],
  byRisk: [...],
  adoption: {...},
  topClients: [...],
  topAreas: [...],
  topResponsibles: [...]
}
```

---

## FASE 2: KPIs Principales (Cards)

### 2.1 Fila de Cards Principales
| Card | Valor | Indicador | Color |
|------|-------|-----------|-------|
| Total ECRs | COUNT(*) | % vs mes anterior | Azul |
| Abiertos | status IN ('draft','pending') | % vs mes anterior | Amarillo |
| En Proceso | status = 'pending_approval' | % vs mes anterior | Naranja |
| Aprobados | status = 'approved' | % vs mes anterior | Verde |
| Rechazados | status = 'rejected' | % vs mes anterior | Rojo |

### 2.2 Fila de Cards Secundarias
| Card | Cálculo |
|------|---------|
| Tiempo Promedio Aprobación | AVG(approved_at - created_at) |
| Tiempo Promedio por Etapa | AVG(stage_time) |
| Tasa de Efectividad | approved / (approved + rejected) * 100 |

---

## FASE 3: Gráficas con Recharts

### 3.1 Tendencia Mensual (LineChart)
```jsx
<LineChart data={monthlyTrends}>
  <Line dataKey="created" stroke="#3b82f6" name="Creados" />
  <Line dataKey="approved" stroke="#10b981" name="Aprobados" />
  <Line dataKey="rejected" stroke="#ef4444" name="Rechazados" />
</LineChart>
```
- Datos: Agrupar por mes (created_at)
- Mostrar últimos 12 meses

### 3.2 Por Tipo de Cambio (PieChart/DonutChart)
```jsx
<PieChart>
  <Pie data={byChangeType} innerRadius={60} outerRadius={100}>
    // Design, Process, Material, Safety, Administrative, Other
  </Pie>
</PieChart>
```
- Colores distintivos por tipo
- Tooltip con cantidad y porcentaje

### 3.3 Por Categoría (BarChart Horizontal)
```jsx
<BarChart layout="vertical" data={byCategory}>
  <Bar dataKey="count" fill={(entry) => categoryColors[entry.name]} />
</BarChart>
```
- Emergency: #ef4444 (rojo)
- Planned: #3b82f6 (azul)
- Continuous Improvement: #10b981 (verde)

### 3.4 Adopción por Etapa (Custom Progress Bars)
```jsx
// Funnel visual o barras de progreso
{stages.map(stage => (
  <div>
    <span>{stage.label}: {stage.percentage}%</span>
    <ProgressBar value={stage.percentage} color={stage.color} />
  </div>
))}
```
- Calcular: COUNT(stage_completion_status->>'ecrX'->>'completed' = true) / total

---

## FASE 4: Matriz de Riesgo (Heat Map)

### 4.1 Componente RiskHeatMap
```jsx
// Grid 3x3 con colores según cantidad
const riskMatrix = [
  [countLowLow, countLowMed, countLowHigh],
  [countMedLow, countMedMed, countMedHigh],
  [countHighLow, countHighMed, countHighHigh]
];

// Colores: verde -> amarillo -> rojo según cantidad
```

### 4.2 Datos necesarios
- Extraer de risk_assessment JSONB
- Severity (1-10) -> Low/Med/High
- Occurrence (1-10) -> Low/Med/High

---

## FASE 5: Rankings (Top Lists)

### 5.1 Top Clientes
```sql
SELECT client_id, client_name, COUNT(*) as count
FROM ecr_reports
GROUP BY client_id, client_name
ORDER BY count DESC
LIMIT 5
```

### 5.2 Top Áreas Impactadas
```sql
SELECT area->>'areaName' as area, COUNT(*) as count
FROM ecr_reports, jsonb_array_elements(impact_analysis) as area
GROUP BY area->>'areaName'
ORDER BY count DESC
LIMIT 5
```

### 5.3 Top Responsables
```sql
SELECT created_by, created_by_name, COUNT(*) as count
FROM ecr_reports
GROUP BY created_by, created_by_name
ORDER BY count DESC
LIMIT 5
```

---

## FASE 6: Tabla Detalle Interactiva

### 6.1 Columnas
| Columna | Campo | Sortable | Filterable |
|---------|-------|----------|------------|
| ECR # | ecr_number | ✅ | ✅ |
| Título | change_title | ✅ | ✅ |
| Cliente | client_name | ✅ | ✅ |
| Tipo | change_type | ✅ | ✅ |
| Prioridad | priority | ✅ | ✅ |
| Status | status | ✅ | ✅ |
| Días | calculated | ✅ | ❌ |
| Etapa Actual | stage_completion | ❌ | ✅ |

### 6.2 Features
- Paginación (10, 25, 50 items)
- Click para abrir ECR
- Export a Excel/CSV
- Búsqueda global

---

## FASE 7: Estilos y UX

### 7.1 Layout Grid
```
┌─────────────────────────────────────────────────────────┐
│                    FILTROS GLOBALES                      │
├─────────┬─────────┬─────────┬─────────┬─────────────────┤
│  KPI 1  │  KPI 2  │  KPI 3  │  KPI 4  │     KPI 5       │
├─────────┴─────────┴─────────┴─────────┴─────────────────┤
│  KPI Sec 1  │  KPI Sec 2  │  KPI Sec 3                  │
├─────────────────────────┬───────────────────────────────┤
│    TENDENCIA MENSUAL    │     POR TIPO DE CAMBIO        │
├─────────────────────────┼───────────────────────────────┤
│    POR CATEGORÍA        │    ADOPCIÓN POR ETAPA         │
├─────────────────────────┴───────────────────────────────┤
│              MATRIZ DE RIESGO (Heat Map)                 │
├───────────────┬───────────────┬─────────────────────────┤
│  TOP CLIENTES │  TOP ÁREAS    │   TOP RESPONSABLES      │
├───────────────┴───────────────┴─────────────────────────┤
│                  TABLA DETALLE                           │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Paleta de Colores
- Primary: #3b82f6 (azul)
- Success: #10b981 (verde)
- Warning: #f59e0b (amarillo)
- Danger: #ef4444 (rojo)
- Neutral: #6b7280 (gris)
- Background: #f3f4f6

### 7.3 Responsive
- Desktop: Grid completo
- Tablet: 2 columnas
- Mobile: 1 columna, cards apiladas

---

## ARCHIVOS A CREAR/MODIFICAR

### Nuevos
1. `frontend/src/pages/ECRDashboard.js` - Reescribir completo
2. `frontend/src/components/ECR/DashboardKPICard.js`
3. `frontend/src/components/ECR/DashboardChart.js`
4. `frontend/src/components/ECR/RiskHeatMap.js`
5. `frontend/src/components/ECR/TopRankingList.js`
6. `frontend/src/components/ECR/ECRDataTable.js`
7. `backend/endpoints/ecrDashboardEndpoints.js`

### Modificar
1. `backend/routes/ecrRoutes.js` - Agregar nuevas rutas
2. `frontend/src/services/ecrService.js` - Nuevos métodos

---

## DEPENDENCIAS
- recharts (ya instalado)
- date-fns (para manejo de fechas)

---

## ESTIMACIÓN POR FASE
| Fase | Descripción |
|------|-------------|
| 1 | Filtros y endpoint backend |
| 2 | KPI Cards |
| 3 | 4 Gráficas principales |
| 4 | Heat Map de riesgo |
| 5 | Top Rankings |
| 6 | Tabla detalle |
| 7 | Estilos y responsive |

---

## QUERIES SQL PRINCIPALES

```sql
-- KPIs básicos
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'draft') as draft,
  COUNT(*) FILTER (WHERE status = 'pending_approval') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM ecr_reports
WHERE created_at BETWEEN $1 AND $2
  AND ($3::int IS NULL OR client_id = $3);

-- Tendencia mensual
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as created,
  COUNT(*) FILTER (WHERE status = 'approved') as approved
FROM ecr_reports
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Adopción por etapa
SELECT
  COUNT(*) FILTER (WHERE stage_completion_status->'ecr1'->>'completed' = 'true') as ecr1,
  COUNT(*) FILTER (WHERE stage_completion_status->'ecr2'->>'completed' = 'true') as ecr2,
  COUNT(*) FILTER (WHERE stage_completion_status->'ecr2b'->>'completed' = 'true') as ecr2b,
  COUNT(*) FILTER (WHERE stage_completion_status->'ecr3'->>'completed' = 'true') as ecr3,
  COUNT(*) FILTER (WHERE stage_completion_status->'ecr4'->>'completed' = 'true') as ecr4,
  COUNT(*) as total
FROM ecr_reports;
```

---

*Creado: 2026-01-22*
*Para implementar en próxima sesión*
