# Resumen de Sesión - 9 de Abril 2026

## Completado Hoy

### 1. Fix revert-to-draft 500 Error
**Archivo**: `backend/endpoints/approvalEndpoints.js`
- Error: `column "is_effective" of relation "d7_validations" does not exist`
- Causa: migración `update_d7_countermeasures_validation.sql` eliminó `is_effective`, `validation_evidence`, `validation_date`, `monitoring_period` pero el INSERT en `revertToDraft` no se actualizó
- Fix: actualizado INSERT para usar columnas actuales: `d3_implemented`, `d3_effective`, `d3_spc_judgment`, `d3_client_judgment`, `d3_comments`, `d3_lesson`, `d5_implemented`, `d5_effective`, `d5_spc_judgment`, `d5_client_judgment`, `d5_comments`, `d5_lesson`, `spc_audit_judgment`, `training_audit_judgment`

### 2. Fix revert-to-draft: Archivos D2 no se copiaban
**Archivo**: `backend/endpoints/approvalEndpoints.js`
- Causa: el código leía `attachment.file_path` y usaba columnas `section`, `file_name`, `file_type` que no existen en `eightd_attachments`
- Columnas reales: `upload_path`, `filename`, `original_filename`, `mime_type`, `attachment_type`
- Fix: corregido el SELECT y el INSERT para usar los nombres de columna correctos

### 3. Fix revert-to-draft: D7 Audit Items no se copiaban
**Archivo**: `backend/endpoints/approvalEndpoints.js`
- Agregado copiado de `d7_audit_items` al nuevo borrador, incluyendo:
  - `audit_judgment`, `auditor_judgment`, `auditor_comments` — resultados de auditoría
  - `audit_round` incrementado (round N → round N+1)
  - `sent_to_audit` reseteado a false para nueva revisión
- Agregado copiado de `d7_audit_item_files` (archivos adjuntos por item)

### 4. Fix Workload Sync: Actividades D6 no aparecían
**Archivo**: `backend/endpoints/workloadEndpoints.js`
- Causa: `assigned_to` llegaba null cuando la acción no tenía responsable asignado
- Fix: fallback a `req.user.id` cuando `assigned_to` es null
- Resultado: la actividad ahora siempre aparece asignada a alguien

### 5. Fix Gantt: No llegaba al día de hoy
**Archivo**: `frontend/src/components/8D/GanttChart.js`
- Causa: el rango de fechas se calculaba solo con fechas de tareas — si todas eran pasadas, hoy quedaba fuera del rango
- Fix 1: `today` siempre se incluye en el array de fechas para el cálculo de rango
- Fix 2: límite de días aumentado de 90 a 180
- Fix 3: padding del maxDate aumentado de 7 a 14 días

### 6. ThemeSelector agregado a módulos faltantes
**Archivos modificados**:
- `frontend/src/pages/WorkloadManager.js` — agregado ThemeSelector en header
- `frontend/src/pages/ClientsList.js` — agregado ThemeSelector en header
- `frontend/src/pages/ConfigurationPage.js` — agregado ThemeSelector en sidebar header
- `frontend/src/pages/StatisticalTools.js` — agregado ThemeSelector + botón Módulos en header
- `frontend/src/components/WorkInstructions/WorkInstructionsList.js` — agregado ThemeSelector en header

### 7. Fix Workload Dashboard: Gráficas con nombres incompletos
**Archivo**: `frontend/src/components/WorkloadDashboard.js`
- Causa: `height` fijo (200px/280px) insuficiente para muchos usuarios; recharts saltaba ticks
- Fix: altura dinámica `Math.max(X, users.length * 28)` en todas las gráficas de barras horizontales
- Fix: `interval={0}` en YAxis para forzar mostrar todos los nombres

### 8. Fix Workload Mi Dashboard: Horas siempre en 0
**Archivo**: `frontend/src/components/WorkloadDashboard.js`
- Causa: `kpis._raw?.sumEst` y `kpis._raw?.sumRealAll` no existen en el response del backend
- Fix: `sumEst` → `carga.totalAssignedHrs`; `sumReal` → `(compliancePercent/100) * sumEst`
- Afectaba: widget `chart-est-real` en Mi Dashboard Y el tab Ejecución

### 9. Fix D7: Item de auto-evaluación desaparecía al enviar a auditoría
**Archivo**: `frontend/src/components/8D/D7Validation.js`
- Causa: items con ID negativo (no guardados) se perdían al recargar desde DB después del send
- Fix: auto-save antes de enviar → recarga desde DB para obtener IDs reales → luego filtra y envía
- Usa `currentItems` (datos frescos del reload) en lugar de `auditItems` (estado React potencialmente stale)

### 10. Fix Módulo Inspección en página de Módulos
**Archivo**: `frontend/src/pages/Home.js`
- Agregado entry `Inspección de Defectos` apuntando a `/defect-capture`
- Usa `moduleId: 'quality_alert'` para heredar permisos de QAR

### 11. QAR SLA Config — Modal editable
**Archivos**: `backend/endpoints/qarEndpoints.js`, `frontend/src/components/QARDashboardComponent.js`, `frontend/src/pages/QARDashboard.js`
- Endpoint `PUT /qar/sla-config` (antes de `/:id` para evitar captura por Express)
- Modal pop-up con tabla editable de `response_hours` y `closure_hours` por severidad
- Validación: números positivos, respuesta < cierre
- Al guardar: cierra modal y re-fetcha dashboard
- Gráfica SLA reemplazada por barras de progreso con ✓/✗ conteos y % en color

### 12. Tab Memory en los 3 Dashboards
- `QARDashboardComponent.js`: `localStorage.getItem('qar-dashboard-tab')`
- `EightDDashboard.js`: `localStorage.getItem('8d-dashboard-tab')`
- `WorkloadDashboard.js`: `localStorage.getItem('workload-dashboard-tab')`

---

## Archivos Modificados Esta Sesión

| Archivo | Cambio |
|---------|--------|
| `backend/endpoints/approvalEndpoints.js` | Fix revert-to-draft: is_effective, attachments, d7_audit_items, d7_audit_item_files |
| `backend/endpoints/workloadEndpoints.js` | Fix assigned_to fallback en sync-8d |
| `frontend/src/components/8D/GanttChart.js` | Fix rango de fechas — incluir hoy, 180 días |
| `frontend/src/components/WorkloadDashboard.js` | Gráficas altura dinámica, interval=0, fix _raw |
| `frontend/src/components/8D/D7Validation.js` | Auto-save antes de enviar a auditoría |
| `frontend/src/pages/WorkloadManager.js` | ThemeSelector |
| `frontend/src/pages/ClientsList.js` | ThemeSelector |
| `frontend/src/pages/ConfigurationPage.js` | ThemeSelector |
| `frontend/src/pages/StatisticalTools.js` | ThemeSelector + botón Módulos |
| `frontend/src/components/WorkInstructions/WorkInstructionsList.js` | ThemeSelector |
| `backend/endpoints/qarEndpoints.js` | PUT /qar/sla-config |
| `frontend/src/components/QARDashboardComponent.js` | SlaConfigModal, tab memory, SLA progress bars |
| `frontend/src/pages/QARDashboard.js` | onRefresh callback |
| `frontend/src/pages/Home.js` | Inspección de Defectos shortcut |

---

## Pendientes

### Prioridad Alta
1. **Taguchi save to BD** — verificar que los datos del DOE se guarden correctamente en la base de datos

### Prioridad Media
2. **Tema oscuro ajustes finales** — colores hardcodeados en módulos (StatisticalTools, ClientsList, ConfigurationPage, etc.) — **POSTERGADO** para siguiente versión

### Pendientes de Arrastre
3. **Sincronización workload** — confirmado implementado en D6 (`syncActionToWorkload`), verificar que funcione correctamente para todos los casos
4. **Verificar Taguchi save to BD** — arrastre de sesiones anteriores

---

## Notas Técnicas

### revert-to-draft — Qué se copia ahora
```
eightd_reports          → nuevo registro con status 'in_progress'
eightd_parts            → copia directa
eightd_attachments      → copia física de archivos (upload_path, filename, etc.)
d7_validations          → columnas actuales (sin is_effective)
d7_validation_files     → copia física de archivos
d7_audit_items          → con audit_round + 1, sent_to_audit = false
d7_audit_item_files     → copia física de archivos
```

### D7 Auto-save antes de enviar a auditoría
```javascript
// Flujo corregido:
1. hasUnsavedItems = auditItems.some(item => item.id < 0)
2. Si hay → POST /d7-validation (guarda en BD)
3. GET /d7-validation → obtiene items con IDs reales
4. currentItems = items actualizados
5. Filter itemsToSend de currentItems (no de auditItems stale)
6. POST /audit/requests con currentItems
```

### Workload sync assigned_to
```javascript
// Antes: toNullIfEmpty(assigned_to) → podía ser null
// Ahora: toNullIfEmpty(assigned_to) || req.user.id
// Si no hay responsable asignado, se asigna al usuario que hace el request
```
