# WORKLOAD APP - ESPECIFICACIÓN COMPLETA
## Sistema de Gestión de Objetivos y Carga de Trabajo

---

## JERARQUÍA ORGANIZACIONAL

```
  ┌─────────────────────────────────────────────────────────┐
  │                    DIRECCIÓN                            │
  │         Objetivos Estratégicos QCTSP Anuales            │
  │    "Reducir costo operativo 10% a nivel empresa"        │
  └────────────────────────┬────────────────────────────────┘
                           ▼ (Cascadeo)
  ┌─────────────────────────────────────────────────────────┐
  │                    GERENCIA                             │
  │         Objetivos por Área/Departamento                 │
  │   "Reducir scrap 15% en Planta 1" (contribuye al 10%)   │
  └────────────────────────┬────────────────────────────────┘
                           ▼ (Cascadeo)
  ┌─────────────────────────────────────────────────────────┐
  │                   SUPERVISIÓN                           │
  │              Objetivos por Equipo                       │
  │  "Reducir defectivo línea A 5%" (contribuye al 15%)     │
  └────────────────────────┬────────────────────────────────┘
                           ▼ (Cascadeo)
  ┌─────────────────────────────────────────────────────────┐
  │                      STAFF                              │
  │            KPIs y Actividades Individuales              │
  │ "Auditorías diarias de calidad" (contribuye al 5%)      │
  └─────────────────────────────────────────────────────────┘

                           ▲
                           │ (Resultados suben)
                           │
```

---

## ESTRUCTURA DEL SISTEMA

```
├── 🏢 OBJETIVOS ORGANIZACIONALES (Dirección)
│   ├── Objetivos Estratégicos QCTSP
│   │   ├── Q - Quality: Meta anual de calidad
│   │   ├── C - Cost: Meta anual de costos
│   │   ├── T - Time: Meta anual de entregas
│   │   ├── S - Safety: Meta anual de seguridad
│   │   └── P - People: Meta anual de desarrollo
│   ├── Período fiscal (anual)
│   ├── Responsable (Director)
│   └── Cascadeo a Gerencias
│
├── 🏭 OBJETIVOS POR ÁREA (Gerencia)
│   ├── Heredados de Dirección (con % de contribución)
│   ├── Objetivos específicos del área
│   ├── Responsable (Gerente)
│   ├── Cascadeo a Supervisores
│   └── Vista de contribución al objetivo superior
│
├── 👔 OBJETIVOS DE EQUIPO (Supervisión)
│   ├── Heredados de Gerencia (con % de contribución)
│   ├── Objetivos específicos del equipo
│   ├── Responsable (Supervisor)
│   ├── Cascadeo a Staff (KPIs individuales)
│   └── Vista de contribución al objetivo superior
│
├── 📊 DASHBOARD (Adaptable por rol)
│   │
│   ├── VISTA DIRECCIÓN
│   │   ├── Scorecard QCTSP global
│   │   ├── Progreso por Gerencia
│   │   ├── Semáforo de objetivos estratégicos
│   │   └── Drill-down a cualquier nivel
│   │
│   ├── VISTA GERENCIA
│   │   ├── Scorecard QCTSP del área
│   │   ├── Progreso por Supervisor/Equipo
│   │   ├── Contribución a objetivos de Dirección
│   │   └── Drill-down a equipos
│   │
│   ├── VISTA SUPERVISIÓN
│   │   ├── Scorecard KANBAN del equipo
│   │   ├── Columnas: En riesgo / Atención / En meta / Superado
│   │   ├── Cards por persona con semáforo de KPIs
│   │   ├── Contribución a objetivos de Gerencia
│   │   └── Drill-down a persona
│   │
│   └── VISTA STAFF
│       ├── Mis KPIs y progreso
│       ├── Mis actividades pendientes
│       └── Mi contribución al equipo
│
├── 👥 GESTIÓN DE EQUIPOS (Por nivel)
│   ├── Dirección → asigna Gerentes
│   ├── Gerencia → asigna Supervisores
│   ├── Supervisión → asigna Staff
│   ├── Capacidad por persona (horas disponibles)
│   ├── KPIs POR PERSONA
│   │   ├── Categoría QCTSP
│   │   ├── Objetivo específico
│   │   ├── Vinculación a objetivo superior
│   │   ├── % de contribución al objetivo padre
│   │   ├── Métrica / Indicador
│   │   ├── Valor actual (baseline)
│   │   ├── Valor meta
│   │   └── Peso del KPI en evaluación total
│   └── DELEGACIÓN/COBERTURA
│       ├── Cobertura temporal (vacaciones/incapacidad)
│       ├── Persona que cubre
│       └── Trazabilidad
│
├── 📋 ACTIVIDADES
│   ├── Planeadas (asignadas por nivel superior)
│   │   ├── Descripción
│   │   ├── Asignado a
│   │   ├── Tiempo disponible (estimado)
│   │   ├── Fecha inicio/fin
│   │   ├── Recurrencia
│   │   │   ├── Tipo: única / semanal / mensual / personalizada
│   │   │   ├── Configuración de días
│   │   │   └── Fecha fin de recurrencia
│   │   ├── Alineación a KPI
│   │   ├── Alineación a Objetivo (cascadeo visible)
│   │   └── Estado
│   │
│   ├── No Planeadas (agregadas por el ejecutor)
│   │   ├── Descripción
│   │   ├── Tiempo real consumido
│   │   ├── Justificación
│   │   └── Alineación a KPI (opcional)
│   │
│   └── TEMPLATES DE ACTIVIDADES
│       ├── Por nivel organizacional
│       ├── Configuración guardada
│       └── Aplicar a nuevos miembros
│
├── 📈 VISTA DE CAPACIDAD
│   ├── Por persona
│   ├── Por equipo
│   ├── Por área
│   ├── Horas asignadas vs disponibles
│   └── Alerta de sobrecarga
│
├── 📈 GANTT (Vista de ejecución)          ♻️ RECICLAR de ECR
│   ├── Por persona
│   ├── Por equipo
│   ├── Por área (Gerencia)
│   ├── Progreso diario
│   └── Evidencias adjuntas
│
├── 📁 EVIDENCIAS                          ♻️ RECICLAR de ECR
│   ├── Por actividad
│   ├── Por persona
│   └── Por objetivo
│
├── 🔔 NOTIFICACIONES/ALERTAS
│   ├── Actividades recurrentes próximas
│   ├── KPI en riesgo (tendencia negativa)
│   ├── Objetivo organizacional en riesgo (escala a Dirección)
│   ├── Revisión trimestral próxima
│   ├── Actividades vencidas
│   └── Configuración por rol y canal
│
├── 📝 FEEDBACK / REVISIÓN (Trimestral)
│   ├── Aplica en todos los niveles
│   │   ├── Dirección → Gerencia
│   │   ├── Gerencia → Supervisión
│   │   └── Supervisión → Staff
│   ├── Período (Q1, Q2, Q3, Q4)
│   ├── FACTORES (Inputs)
│   │   ├── Actividades completadas vs planeadas
│   │   ├── Tiempo real vs disponible
│   │   └── Actividades no planeadas
│   ├── RESULTADOS (Outputs)
│   │   ├── Progreso de KPIs vs meta
│   │   ├── Contribución a objetivo superior
│   │   └── Tendencia
│   ├── FEEDBACK
│   │   ├── Comentarios
│   │   ├── Fortalezas
│   │   ├── Áreas de mejora
│   │   └── Reconocimientos
│   ├── COMPROMISOS
│   │   ├── Acciones correctivas
│   │   ├── Capacitación
│   │   └── Ajuste de KPIs
│   └── Firma/Aceptación
│
└── 📊 REPORTES
    ├── VISTA EJECUTIVA (Dirección)
    │   ├── Scorecard QCTSP consolidado
    │   ├── Progreso por área
    │   ├── Objetivos en riesgo
    │   └── Comparativo períodos anteriores
    │
    ├── VISTA ÁREA (Gerencia)
    │   ├── Desempeño del área
    │   ├── Contribución a objetivos globales
    │   └── Detalle por equipo
    │
    ├── VISTA EQUIPO (Supervisión)
    │   ├── Evaluación de desempeño
    │   ├── Cumplimiento de actividades
    │   └── Histórico de feedback
    │
    └── EXPORTACIÓN
        ├── PDF evaluación (cualquier nivel)
        ├── Excel de actividades
        ├── Reporte de KPIs
        └── Reporte de cascadeo de objetivos
```

---

## CICLO DE GESTIÓN

```
  ┌─────────────┐
  │ Definir     │ (Inicio de año - Dirección hacia abajo)
  │ Objetivos   │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Cascadear  │ (Gerencia → Supervisión → Staff)
  │    KPIs     │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Asignar    │
  │ Actividades │ (Continuo)
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Ejecución  │ ♻️ Gantt + Evidencias
  │   Diaria    │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Feedback   │ (Trimestral - todos los niveles)
  │ Trimestral  │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ Evaluación  │ (Fin de año)
  │   Anual     │
  └─────────────┘
```

---

## ROLES Y PERMISOS

### DIRECCIÓN
- ✓ Definir objetivos estratégicos QCTSP
- ✓ Ver toda la organización
- ✓ Asignar objetivos a Gerencias
- ✓ Feedback a Gerentes
- ✓ Reportes ejecutivos
- ✓ Drill-down a cualquier nivel

### GERENCIA
- ✓ Recibir objetivos de Dirección
- ✓ Definir objetivos de área
- ✓ Asignar a Supervisores
- ✓ Ver su área completa
- ✓ Feedback a Supervisores
- ✓ Reportes de área

### SUPERVISIÓN
- ✓ Recibir objetivos de Gerencia
- ✓ Definir KPIs de equipo
- ✓ Asignar actividades a Staff
- ✓ Ver su equipo
- ✓ Crear templates
- ✓ Feedback a Staff
- ✓ Configurar delegaciones

### STAFF
- ✓ Recibir KPIs y actividades
- ✓ Llenar progreso en Gantt
- ✓ Subir evidencias
- ✓ Agregar actividades no planeadas
- ✓ Ver su progreso personal
- ✓ Firmar feedback

---

## COMPONENTES A RECICLAR DE ECR

| Componente | Uso |
|------------|-----|
| `GanttChart.js` | Vista Gantt completa |
| `dailyProgress` | Estructura de progreso diario |
| `ValidationEvidence` | Upload y gestión de evidencias |
| Tabla de actividades | Lista con progreso y fechas |
| `handleAddDailyProgress` | Lógica de agregar avance |
| Validación duplicados | Ya implementada |

---

## NOTAS DE IMPLEMENTACIÓN

- Reutilizar componentes existentes de ECR para acelerar desarrollo
- Base de datos nueva para objetivos, KPIs y actividades de workload
- Sistema de permisos basado en jerarquía organizacional
- Notificaciones configurables por rol

---

**Documento creado**: 2026-01-17
**Próxima sesión**: Inicio de desarrollo
