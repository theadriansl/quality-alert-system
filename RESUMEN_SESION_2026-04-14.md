# Resumen de Sesión — 2026-04-14

## Fixes Críticos

### `backend/utils/caseTransform.js`
- **Bug**: regex `/_([a-z])/g` no capturaba dígitos, por lo que `source_8d_id` → `source_8dId` (con underscore) en lugar de `source8dId`
- **Fix**: cambiado a `/_([a-z0-9])/g`
- **Impacto**: afectaba TODOS los campos con números en el nombre — el botón de origen del MRB no navegaba ni mostraba folio/título del 8D

### `backend/endpoints/mrbEndpoints.js` — PUT `/:id`
- **Bug 1**: columna `labor_cost` duplicada en el UPDATE → error 500
- **Bug 2**: columnas `resolved_at` y `closed_at` no existen en `mrb_campaigns` → error 500
- **Fix**: eliminadas ambas columnas del UPDATE, `labor_cost` queda como CASE único

### Rutas de navegación al 8D
- **Bug**: `/8d/:id` no existe en el router
- **Fix**: corregido a `/8d-workflow?reportId=:id` en `MRBCampaignDetail.js` y `MRBCampaigns.js`

---

## Funcionalidades Completadas

### Panel de edición inline para campañas publicadas (ABIERTA/EN_PROCESO)
- **Archivo**: `MRBCampaignDetail.js`
- Edición de `inspectionCriteria` y `dispositionInstructions` desde la vista de detalle
- Botón "Sincronizar del 8D" (D3) — re-jala los campos si cambian en el 8D
- Botón "Guardar" con confirmación de éxito

### Panel "Agregar Destinatario" para campañas publicadas
- **Archivo**: `MRBCampaignDetail.js` — componente `AddRecipientPanel`
- Selector de usuario + tipo (Respuesta / Validación / Información)
- Llama `POST /mrb/:id/recipients`

### Emails al publicar MRB
- **Archivo**: `backend/utils/emailService.js` — función `sendMrbNotification` y `sendMrbBulkNotifications`
- Se envían al cambiar status a ABIERTA: desde wizard (POST) y desde borrador (PUT)
- Email incluye: número MRB, título, rol asignado, criterio de inspección, instrucciones de disposición
- Botón con **enlace directo** a `/mrb-campaign/:id`

### Botón "Importar de D4/D6"
- **Archivo**: `MRBCampaignDetail.js` — handler `handleSyncD5D6`
- **Backend**: `POST /mrb/:id/sync-d5d6`
- Jala `d4_root_cause` → campo Causa Raíz y `d6_countermeasure_description` → campo Acción Correctiva
- Solo aparece cuando hay 8D vinculado y el usuario puede registrar disposición
- Si D4/D6 no están completados en el 8D, avisa al usuario

---

## Estado Actual del Módulo MRB

| Etapa | Estado |
|-------|--------|
| Crear MRB (wizard) | ✅ Completo |
| Borrador — editar/eliminar | ✅ Completo |
| Publicar + emails | ✅ Completo |
| Detalle campaña publicada | ✅ Completo |
| Editar método de inspección (inline) | ✅ Completo |
| Agregar destinatarios post-publicación | ✅ Completo |
| Importar D4/D6 del 8D | ✅ Completo |
| **Sección de Disposición** | ⚠️ Pendiente rediseño |
| **App de inspección → alimentar MRB** | ⚠️ PENDIENTE CRÍTICO |

---

## ⚠️ PENDIENTE CRÍTICO — Próxima Sesión

### Plataforma de Inspección → Alimentar MRB Automáticamente

El usuario quiere apegarse al estándar MRB real:

```
ABIERTA → Inspectores inspeccionan material (app de inspección)
        → EN_PROCESO → Resultados poblados automáticamente en MRB
        → Disposición (decisión sobre el material con datos reales)
        → Validación → CERRADA
```

**Lo que falta:**

1. **Revisar** `MRBDefectCapture.js` y esquema de `defect_entries_v2`
2. **Agregar columnas de disposición** si no existen (migración):
   - `disposition_type` — UAI / REWORK / SCRAP / RETURN / CONDITIONAL
   - `disposition_justification`
   - `disposition_responsible`
   - `disposition_due_date`
3. **`MRBDefectCapture.js`**: que los inspectores registren qty inspeccionada, OK, NOK por tipo de defecto
4. **Endpoint de agregación**: que sume resultados al MRB automáticamente (`qty_ok`, `qty_nok`, `qty_inspected`)
5. **Rediseñar sección Disposición** en `MRBCampaignDetail.js`:
   - Mostrar resumen de inspección (datos reales)
   - Capturar decisión por tipo de material
   - Justificación, responsable, fecha compromiso

---

## Otros Pendientes Arrastrando

- **Inicializar repositorio Git + subir a GitHub privado** — para protección de propiedad intelectual con timestamps verificables
- Taguchi: guardar resultados a BD
- PDF/Excel export para Herramientas Estadísticas
- Refinar módulo ECR
- Sistema de notificaciones/bandeja de entrada
- Verificar visualmente MRBDashboard
