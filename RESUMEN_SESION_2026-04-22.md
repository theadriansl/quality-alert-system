# Resumen de Sesión — 2026-04-22

## Completado hoy

### Mi Dashboard (Modal de personalización)
- **8D**: Implementado modal 2-pasos (catálogo multi-select → size picker) con DnD — confirmado OK
- **QAR**: Mismo modal — confirmado OK
- **MRB**: Mismo modal — confirmado OK
- Las 3 vistas ahora usan el mismo patrón que ECR

### Módulo Auditorías — Datos de prueba
- Creado `backend/seed_audit_mock.js`: 3 programas, 4 checklists, 10 schedules, 6 audits ejecutadas, 18 hallazgos, 5 NCs
- Migración ejecutada y seed cargado correctamente

### Módulo Auditorías — Calendario y Gantt
- Endpoint `GET /audit/auditors` — unificado: devuelve todos los usuarios activos (se eliminó ruta duplicada que solo devolvía `is_auditor = true`)
- Crash `scorePercentage.toFixed` — corregido con `parseFloat()`
- Gantt "Sin asignar" — corregido: se agrega `firstName` y `lastName` a `ganttUsers`
- Columna Co-Auditores — agregada en vista lista del calendario
- Comparación de IDs en Gantt — corregida con `Number()` (type mismatch int vs string)

### AUDREQ — Numeración de solicitudes de auditoría (desde 8D)
- Migración `067_audit_request_number.sql`: columna `audit_number VARCHAR(30)` en `audit_requests`
- Backfill de registros existentes con formato `AUDREQ-2026-NNN`
- Auto-generación al crear nuevas solicitudes desde 8D
- Serie separada: `AUDREQ-YYYY-NNN` (desde 8D) vs `AUD-YYYY-NNN` (schedules programados)

### ECR vinculado a auditoría
- Al seleccionar un ECR al crear auditoría, se auto-llena el nombre con `ECR-2026-XXX — Change Title`

### Formulario Crear Auditoría — Correcciones
- **Auditor líder desplazado**: al cambiar el lead, se elimina automáticamente de `coAuditors` si estaba ahí
- **Type mismatch**: `toggleCoAuditor` y la selección visual usan `Number()` en comparaciones
- **Frecuencia requerida**: si `isRecurring = true`, el select de frecuencia muestra borde rojo y valida antes de guardar

### Gantt — Cálculo de días / ocurrencias
- `countBusinessDays` — corregido con parse local para evitar UTC offset (timezone México)
- `countOccurrences` — nueva función: para recurrentes usa la frecuencia (weekly=semanas, monthly=meses, etc.) en lugar de días hábiles totales
- Si `frequency = null` y `isRecurring = true` → no se muestra límite (en vez de calcular mal)
- Mensaje del popup actualizado: "ocurrencias" en lugar de "días hábiles"

### Gantt — Guardado de progreso para auditorías
- Migración `068_audit_schedule_daily_progress.sql`: columna `daily_progress JSONB` en `audit_schedules`
- Endpoint `GET /audit/schedules/gantt` — incluye `daily_progress` en respuesta
- Endpoint `PUT /audit/schedules/:id` — acepta `dailyProgress` y lo guarda ($23/$24 parámetros)
- `AuditCalendar.js` — pasa `dailyProgress` al Gantt y lo envía al guardar

---

## Pendientes

### Alta prioridad
- [ ] **Gantt progreso no actualiza visualmente**: el popup guarda (llega al backend) pero la barra de avance real no se refleja en pantalla después de guardar — necesita depuración del flujo `onTaskUpdate → loadData → ganttTasks → GanttRow`
- [ ] **AUD-2026-011 "ECR test"**: `frequency = NULL` en DB (se creó sin seleccionar frecuencia). Editar el audit y seleccionar "Semanal". El auditor líder también aparece "Sin asignar" en Gantt (se creó antes del fix de auditores)

### Media prioridad
- [ ] **Ejecución de auditorías**: flujo `/audit-execute/:scheduleId` — pendiente pruebas end-to-end (hallazgos, NCs, firma de cierre)
- [ ] **Módulo MRB — Daily Shift Report modal**: pendiente desde sesión anterior

### Baja prioridad / Post-Beta
- [ ] **Cross-module tasks**: idea de tareas entre módulos (8D ↔ QAR ↔ MRB) — descartado para Beta, retomar después del lanzamiento
- [ ] **11 días en Gantt workload**: verificar si actividades del WorkloadManager con frecuencia también se benefician del `countOccurrences` fix

---

## Sesión tarde 2026-04-22 (continuación)

### QAR Dashboard — Filtro de fechas + Tab Resumen
- **Filter bar completa**: presets Hoy/Semana/Mes actual/Trimestre/Año/Todo, date pickers, dropdowns Departamento/Cliente/Severidad, botón Reset — idéntica a MRB Dashboard
- **Backend `/qar/dashboard`**: acepta `start_date`, `end_date`, `deptId`, `clientId`, `severityId` — todos los queries internos usan `baseFilter` (antes sólo `dateFilter`). `volByMonth` también respeta el filtro activo
- **Tab Resumen**: agregado como primera pestaña en `QARDashboardComponent.js` — muestra donut severidad + donut estado + tendencia mensual + tabla top departamentos. Default tab cambiado a `'resumen'`
- **Fix 401**: los fetches de dropdowns necesitaban `Authorization: Bearer ${token}` + `?flat=true` en `/departments` (para lista plana, no árbol jerárquico)

---

## Contexto técnico clave

| Concepto | Valor |
|---|---|
| Numeración schedules | `AUD-YYYY-NNN` (auto, `generateAuditNumber()`) |
| Numeración requests 8D | `AUDREQ-YYYY-NNN` (auto, al crear desde 8D) |
| Tabla progreso diario audits | `audit_schedules.daily_progress JSONB` |
| Endpoint auditores | `GET /audit/auditors` → todos los usuarios activos |
| Gantt frecuencia → ocurrencias | `weekly=/7`, `monthly=/30`, `quarterly=/90`, `yearly=/365` |
| Backend port | 5000 |
| Frontend port | 3000 |
