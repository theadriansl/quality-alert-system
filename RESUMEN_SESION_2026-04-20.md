# Resumen Sesión — 2026-04-20 (continuación del 19)

## Completado en esta sesión

### 1. Gestión de validadores MRB desde UI
- Endpoint `GET /users/mrb-validators` — lista todos los usuarios con flag `can_validate_mrb`
- Endpoint `PUT /users/:id/mrb-validator` — toggle Sí/No (solo admin)
- Página nueva `MRBConfig.js` en `/mrb-config`:
  - Tab "Validadores MRB": tabla de usuarios con botón toggle por fila
  - Tab "Catálogo de Defectos": enlace a `/defect-admin`
- Botón ⚙ Configuración en header de MRBDashboard (solo admin, usa `isUserAdmin()`)
- Ruta agregada en `App.js`

### 2. Botones admin QAR movidos a QARDashboard
- `Admin Defectos` y `⚙ Config QAR` movidos de `DefectCapture.js` → `QARDashboard.js`
- Solo visibles para admin (`isUserAdmin(user)`)
- Eliminados completamente de `DefectCapture.js`

### 3. Tab "⚙️ Mi Dashboard" en MRBDashboard
- 42 widgets organizados en 6 categorías: Resumen, Material, Tiempo & Flujo, Costo & Impacto, Defectos & Causa, Operación
- Componentes: `MrbWidgetRenderer`, `MrbSortableWidget`, `MrbDragGhost`, `MrbTabPersonalizado`
- Drag & drop con `@dnd-kit/core` + `@dnd-kit/sortable`
- Seleccionables por checkbox, arrastrables para reordenar
- Persistencia en `localStorage` key `'mrb-custom-dashboard-v1'`
- 8 widgets por default

### 4. Tab "Turnos sin registrar" en `/mrb-campaigns`
- Endpoint `GET /mrb/unregistered-shifts`: campañas ABIERTA/EN_PROCESO con `defect_entries_v2` en fechas pasadas sin `mrb_shift_hours` matching
- Query usa `captured_at::date` (no `inspection_date` — columna no existe en `defect_entries_v2`)
- Backend retorna: campaign_id, campaign_number, title, shift_id, shift_name, shift_code, inspection_date, inspector_count, supervisor_count, inspector_unit_cost, supervisor_unit_cost
- UI: tabla idéntica a `PersonnelRow` de MRBCampaignDetail
  - Checkboxes por fila (todos seleccionados por default) + checkbox "Select All" en header
  - Edición inline de hrs/insp/sup por fila antes de registrar
  - Botón "✓ Registrar seleccionados (N)" — bulk: `PUT /mrb/:id/shift-hours` + `POST /mrb/:id/comments` en paralelo
  - Comment automático con nombre de usuario, turno, fecha y recursos
- Confirmado funcional: registro individual y masivo, log en cada campaña ✓

### 5. Columnas ordenables en tabla de campañas
- Componente `SortTh` — click alterna asc/desc, columna activa resaltada en color del tema con ▲/▼
- Columnas ordenables: Número, Origen, Título, Cliente, Parte, Depto, Sev, Estado, Fecha

### 6. Limpieza QAR como origen de MRB
- Eliminada opción "QAR" del modal "Cambiar Origen" en `MRBCampaignDetail.js`
- `openSourceModal` ahora siempre abre con 8D preseleccionado
- Textos de hint actualizados (ya no mencionan QAR)
- Eliminadas 17 campañas mock con `source_type = 'QAR'` de la DB (con todos sus registros relacionados en transacción)
- Razón de negocio: QAR es para no conformidades light, no debe detonar MRB

## Archivos modificados
- `backend/endpoints/mrbEndpoints.js` (nuevo endpoint unregistered-shifts, limpieza)
- `backend/endpoints/usersEndpoints.js` (getMrbValidators, toggleMrbValidator)
- `backend/server.js` (2 rutas nuevas usuarios)
- `frontend/src/pages/MRBConfig.js` (nuevo)
- `frontend/src/pages/MRBDashboard.js` (⚙ config button, tab Mi Dashboard completo)
- `frontend/src/pages/MRBCampaigns.js` (tabs, turnos sin registrar, sort)
- `frontend/src/pages/MRBCampaignDetail.js` (limpieza QAR modal)
- `frontend/src/pages/QARDashboard.js` (botones admin)
- `frontend/src/pages/DefectCapture.js` (botones admin eliminados)
- `frontend/src/App.js` (ruta /mrb-config)

## Estado del módulo MRB al cierre
- Creación desde 8D e INCOMING ✓
- Inspección individual + masiva con severidad ✓
- Downtime tracking completo ✓
- Shift report con todas las secciones ✓
- Emails (apertura, recordatorio, rechazo) ✓
- Dashboard 6 tabs con costos reales ✓
- Tab Mi Dashboard personalizable (42 widgets, drag & drop) ✓
- Gestión validadores desde UI ✓
- Turnos sin registrar: visibles y registrables desde lista de campañas ✓
- Columnas ordenables en lista ✓
- **MÓDULO MRB COMPLETO — LISTO PARA BETA / VIDEO PROMOCIONAL**

## Pendiente próxima sesión
- Continuar con módulo **ECR** (Engineering Change Request)
- Ver archivos de referencia: `ECR-COMPLETO-IMPLEMENTADO.md`, `PLAN_ECR_DASHBOARD_POWERBI.md`, `IATF-ECR-IMPLEMENTATION-ROADMAP.md`
