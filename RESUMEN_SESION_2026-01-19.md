# RESUMEN SESION 2026-01-19
## Workload App - Plan de Mejoras al Formulario de Actividades

---

================================================================================
PROTOCOLO OBLIGATORIO - LEER ANTES DE ESCRIBIR CODIGO
================================================================================

- El backend usa utils/caseTransform.js
- TODOS los datos de PostgreSQL se convierten a camelCase con transformToCamelCase()
- PostgreSQL usa snake_case (ej: client_name, part_number)
- Backend/Frontend esperan camelCase (ej: clientName, partNumber)
- Si un fix falla 2 veces, DETENTE y explica el problema
- Verificar convenciones ANTES de escribir codigo

---

## FUNCIONALIDADES A IMPLEMENTAR

Mejorar el tab "Mis Actividades" para evaluacion de desempeno:

1. **Asignacion a subordinados** - segun organigrama, filtrable por persona
2. **Actividades recurrentes** - semanal/mensual por X meses, edicion individual o en bloque
3. **Cobertura/delegacion** - vacaciones, visible en ambas listas
4. **Vinculacion KPI → Objetivo → Meta** - selector dinamico
5. **Tipo de entregable** - reporte, presentacion, analisis, etc.
6. **Escala MoSCoW** - Must/Should/Could/Won't
7. **Peso/Impacto** - porcentaje para evaluacion
8. **Evidencia requerida** - flag obligatorio
9. **Bitacora de feedback** - log de felicitaciones/llamadas de atencion por actividad

---

## ARCHIVOS A MODIFICAR

| Archivo | Cambios |
|---------|---------|
| `backend/migrations/008_activity_enhancements.sql` | NUEVO - Columnas nuevas + tabla feedback_log + tabla coverage |
| `backend/endpoints/workloadEndpoints.js` | +6 endpoints (subordinates, coverage, objectives-by-kpi, feedback-log) |
| `frontend/src/pages/WorkloadManager.js` | +3 modales, +states, +handlers, +sub-tabs |

---

## FASE 1: BASE DE DATOS

### Modificar tabla workload_activities
```sql
ALTER TABLE workload_activities
ADD COLUMN recurring_group_id UUID,
ADD COLUMN deliverable_type VARCHAR(50),
ADD COLUMN moscow_priority VARCHAR(20) CHECK (moscow_priority IN ('must', 'should', 'could', 'wont')),
ADD COLUMN weight_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN requires_evidence BOOLEAN DEFAULT FALSE;
```

### Nueva tabla workload_activity_coverage
```sql
CREATE TABLE workload_activity_coverage (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES workload_activities(id) ON DELETE CASCADE,
    original_assignee_id INTEGER NOT NULL REFERENCES users(id),
    substitute_id INTEGER NOT NULL REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(50) CHECK (reason IN ('vacation', 'sick_leave', 'training', 'temporary_assignment', 'other')),
    reason_details TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Nueva tabla workload_supervisor_feedback_log
```sql
CREATE TABLE workload_supervisor_feedback_log (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES workload_activities(id) ON DELETE SET NULL,
    employee_id INTEGER NOT NULL REFERENCES users(id),
    supervisor_id INTEGER NOT NULL REFERENCES users(id),
    feedback_type VARCHAR(30) CHECK (feedback_type IN (
        'recognition',      -- Felicitacion
        'warning',          -- Llamada de atencion
        'coaching',         -- Retroalimentacion constructiva
        'achievement',      -- Logro destacado
        'improvement_needed', -- Area de mejora
        'note'              -- Nota general
    )),
    comment TEXT NOT NULL,
    is_visible_to_employee BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## FASE 2: BACKEND ENDPOINTS

### GET /workload/subordinates/:userId
- CTE recursivo para subordinados directos e indirectos
- Retorna: `{ self, subordinates[], total }`
- Pattern existe en `routes/users.js:164-178`

### GET /workload/objectives/by-kpi/:kpiCode
- Filtra objetivos por codigo KPI (Q, C, T, S, P)
- Para dropdown dinamico

### CRUD /workload/coverage
- GET, POST, PUT, DELETE

### CRUD /workload/feedback-log
- GET: por empleado o actividad
- POST: agregar comentario del supervisor

### Modificar POST /workload/activities
- Agregar: objective_id, is_recurring, frequency, frequency_details, recurring_duration
- deliverable_type, moscow_priority, weight_percent, requires_evidence
- Si is_recurring=true: generar multiples instancias con recurring_group_id

---

## FASE 3: FRONTEND

### ActivityFormModal (nuevo componente)
Secciones:
1. Informacion Basica: titulo, tipo entregable, MoSCoW
2. Asignacion: dropdown con "Yo" + subordinados (indentados)
3. KPI y Objetivo: selector KPI → selector objetivo → muestra meta
4. Fechas y Tiempo: inicio, fin, horas, peso%
5. Evidencia: checkbox "requiere evidencia"
6. Recurrente (toggle): frecuencia, dia semana, duracion

### CoverageFormModal (nuevo componente)
- Persona ausente, sustituto, fechas, motivo

### FeedbackLogModal (nuevo componente)
- Tipo feedback, comentario, visible al empleado

### Sub-tabs nuevos en Equipo
- "Coberturas" - lista y CRUD
- "Historial Feedback" - por subordinado

---

## DECISIONES DEL USUARIO

1. **Subordinados**: Todo el arbol con filtro por persona
2. **Recurrentes**: Instancias vinculadas - al editar preguntar "solo esta o todo el bloque"
3. **Cobertura**: Actividades aparecen en ambas listas con indicador

---

## TIPOS DE ENTREGABLE
- Reporte
- Presentacion
- Analisis
- Documento
- Reunion
- Capacitacion
- Auditoria
- Otro

## ESCALA MoSCoW
- **Must** - Obligatorio, critico
- **Should** - Importante, deberia hacerse
- **Could** - Deseable si hay tiempo
- **Won't** - No se hara este periodo (backlog)

## TIPOS DE FEEDBACK
- recognition (Felicitacion)
- warning (Llamada de atencion)
- coaching (Retroalimentacion constructiva)
- achievement (Logro destacado)
- improvement_needed (Area de mejora)
- note (Nota general)

---

## VERIFICACION

1. Login como Adrian (Director), verificar subordinados
2. Crear "Junta Viernes" semanal por 3 meses → ~12 actividades
3. Seleccionar KPI "C" → ver objetivos de costo con metas en $
4. Crear cobertura de vacaciones
5. Agregar feedback a actividad de subordinado

---

## NOTAS TECNICAS

- El campo `objective_id` ya existe en workload_activities (migracion 005) pero no se usa en frontend
- Pattern CTE recursivo existe en `routes/users.js:164-178`
- Usar camelCase en frontend, snake_case en BD

---

## ESTADO DE IMPLEMENTACION

### PLAN DETALLADO CON PROGRESO:
**`C:\Users\The Eidrian\.claude\plans\mighty-bubbling-manatee.md`**

Este archivo contiene:
- Plan original completo
- Estado actualizado de implementacion
- Lista de pendientes especificos
- Ubicacion de codigo clave (lineas aproximadas)

**LEER ESE ARCHIVO ANTES DE CONTINUAR IMPLEMENTACION**

---

### COMPLETADO EN ESTA SESION:

1. **Migracion SQL** - `backend/migrations/008_activity_enhancements.sql` ✅
2. **Backend endpoints** - `backend/endpoints/workloadEndpoints.js` ✅
   - /subordinates, /coverage, /supervisor-feedback, /deliverable-types, /activities/recurring
3. **Frontend** - `frontend/src/pages/WorkloadManager.js` ✅
   - ActivityFormModal, CoverageFormModal, SupervisorFeedbackModal
   - Sub-tab "Coberturas", botones avanzados, badges MoSCoW

### PENDIENTE:

1. Ejecutar migracion SQL en PostgreSQL
2. Indicador cobertura en lista actividades
3. Probar compilacion React
4. Testing funcional completo

---

**Sesion**: 2026-01-19
**Estado**: IMPLEMENTACION ~90% COMPLETA - PENDIENTE TESTING
