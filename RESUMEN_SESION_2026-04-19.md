# Resumen Sesión MRB — 2026-04-19

## Fixes aplicados

### 1. Tabla dedicada `mrb_downtime_entries`
- Migración `063_mrb_downtime_entries.sql` creada y ejecutada
- Columnas reales: `id, mrb_campaign_id, shift_id, inspector_id, lot_number, downtime_minutes, source_type, defect_entry_id, notes, created_at`
- capture-ok y capture-nok insertan en esta tabla cuando `downtimeMinutes > 0`

### 2. Fix stale closure en `handlePiezaOk`
- `hasDowntime`, `downtimeMinutes`, `comment` agregados al array de dependencias del `useCallback`
- Ahora capture-ok envía los valores actuales al backend

### 3. Reset automático tras captura OK
- Después de registrar pieza OK exitosamente, se limpian: `hasDowntime`, `downtimeMinutes`, `comment`
- Evita acumulación accidental de downtime en capturas sucesivas

### 4. Indicador de downtime en header de captura
- Muestra `⏱ X min` en amarillo junto a INSP / OK / NOK / RW / SC
- Carga el total real del turno desde el servidor al seleccionar campaña+turno
- Se actualiza automáticamente tras cada capture-ok y capture-nok (backend devuelve `downtimeTodayMin`)
- Se resetea al cambiar de turno

### 5. Registro de Downtime en Shift Report
- Nueva sección "Registro de Downtime" en `MRBShiftReport.js` después del Pareto
- Columnas: Hora, Serial, Tipo (OK/NOK badge), Minutos, Comentario, Inspector
- Fila de Total al pie de la tabla
- El título de la sección muestra cantidad de entradas y total de minutos

### 6. Editar y borrar entradas de downtime desde el Shift Report
- Backend: `PATCH /mrb/:id/downtime/:entryId` — edita `downtime_minutes` y `notes`
- Backend: `DELETE /mrb/:id/downtime/:entryId` — elimina la entrada
- Frontend: cada fila tiene botón ✏ (edición inline) y ✕ (borrar con confirmación)
- Tras guardar o borrar, el reporte se recarga automáticamente

### 7. Validación backend: MRB sin parte rechazado
- POST /mrb retorna 400 si no viene `partId` ni `partsList` con al menos un elemento

### 8. Email recordatorio: muestra parte correctamente
- Para campañas con `partsList`: muestra `partNumber — partName` de cada parte
- Fallback a `partNumber` individual o `partDescription`

### 9. Fix column names `mrb_downtime_entries`
- Tabla real tiene `inspector_id` y `notes` (no `registered_by`/`comment`)
- Backend inserts y SELECTs corregidos para usar los nombres reales

## Archivos modificados
- `backend/endpoints/mrbEndpoints.js`
- `backend/migrations/063_mrb_downtime_entries.sql` (nueva)
- `frontend/src/pages/MRBDefectCapture.js`
- `frontend/src/pages/MRBShiftReport.js`
- `frontend/src/pages/MRBCampaignDetail.js`

## Estado al cierre (sesión 1)
Módulo MRB funcional con downtime tracking completo:
- Captura ✓
- Visualización en shift report ✓
- Edición y borrado desde shift report ✓
- Indicador en tiempo real en header de captura ✓

---

# Resumen Sesión MRB — 2026-04-19 (tarde/noche)

## Fixes y mejoras aplicados

### 10. Fix costos reales en Dashboard (`GET /mrb/dashboard`)
- Eliminadas queries con `mc.scrap_cost`/`mc.labor_cost` (eran estimados, no acumulados)
- Scrap real: `SUM(qty × unit_cost)` desde `defect_entries_v2 + client_parts`
- Labor real: `SUM(hours × count × rate)` desde `mrb_shift_hours`
- Query separada `openCostsRes` SIN filtro de fecha para campañas ABIERTA/EN_PROCESO
- Frontend usa `data.openCosts[c.id]` para costos en fichas de campañas abiertas

### 11. Severidad en captura masiva (bulk)
- Constante `DISPOSITION_SEVERITY`: SCRAP→CRITICAL, REWORK→MAJOR, RETURN_SUPPLIER→MAJOR, HOLD→MINOR, USE_AS_IS→MINOR
- Individual: `useEffect` auto-llena severidad al cambiar disposición (editable)
- Bulk: `severityId` incluido en cada `capture-nok`, columnas de severidad en grid (auto-calculadas, display-only)
- Migración `064_backfill_mrb_severity.sql` ejecutada: 43 entradas MRB actualizadas

### 12. Dashboard "Por Severidad" corregido
- Query ahora usa `defect_entries_v2.severity_id` (antes usaba `mrb_campaigns.severity_id` = siempre NULL)

### 13. Fichas campañas abiertas en tab Resumen
- Grid 3 columnas `1fr 1fr 1fr`:
  - Col 1: disposiciones (REWORK, SCRAP, RETURN, HOLD, USAR C/ES) + YIELD
  - Col 2: Costo Acumulado horizontal (Scrap | Personal | Total) desde `openCosts`
  - Col 3: EN PLANTA / INSPECCIONADO / RESTANTE + barra de progreso
- Header: número, título, severidad badge, estado, días abierta
- Botón "Casos MRB" en header del dashboard → `/mrb-campaigns`

### 14. Fix Downtime total en tab Operación
- Total: ahora suma desde `byShift` en JS (`downtimeByShiftRes.rows.reduce(...)`)
- Evita doble conteo que ocurría con LEFT JOIN de shift_hours en query 6c
- Tabla "Comentarios de Downtime" agregada al fondo del tab Operación

### 15. Datos mock — 50 campañas
- Script: `backend/seed_mrb_mock_50.js` (ejecutado, NO re-ejecutar)
- Oct 2025–Mar 2026: MRB-2025-0011 a MRB-2025-0035 + MRB-2026-0011 a MRB-2026-0034
- Incluye: defect_entries_v2 (con severity), mrb_shift_hours, mrb_downtime_entries
- Clientes: Faurecia(1), Gissing(2), Lucid(3), ElringKlinger(4)

## Archivos modificados (sesión tarde/noche)
- `backend/endpoints/mrbEndpoints.js`
- `frontend/src/pages/MRBDefectCapture.js`
- `frontend/src/pages/MRBDashboard.js`
- `backend/migrations/064_backfill_mrb_severity.sql` (nueva, ejecutada)
- `backend/seed_mrb_mock_50.js` (nuevo, ejecutado)

## Estado al cierre (sesión tarde/noche)
- Costos reales en dashboard ✓
- Severidad en captura individual y masiva ✓
- Backfill severidad histórica ✓
- Dashboard "Por Severidad" corregido ✓
- Fichas campañas abiertas con 3 columnas ✓
- Downtime total y comentarios en tab Operación ✓
- 50 campañas mock con datos realistas ✓

## Pendiente (post-Beta)
- Email SMTP real (hoy usa mailto:)
- Permisos `can_validate_mrb` gestionables desde UI
- Verificar campañas sin `unit_cost` en client_parts muestren $0 correctamente
- Tab personalizable en Dashboard MRB (igual que QAR — widgets configurables por usuario)
