# Resumen de Sesión — 2026-04-15

## Contexto
Sesión larga (2 contextos compactados). Trabajo enfocado en el módulo MRB: base de datos, backend y plataforma de captura de inspección.

---

## 1. Base de Datos — Migraciones Aplicadas

### `056_mrb_ok_entries.sql`
Nueva tabla para tracking de piezas OK por inspector:
```sql
CREATE TABLE mrb_ok_entries (
  id                SERIAL PRIMARY KEY,
  mrb_campaign_id   INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
  part_id           INTEGER REFERENCES client_parts(id) ON DELETE SET NULL,
  shift_id          INTEGER REFERENCES inspection_shifts(id) ON DELETE SET NULL,
  inspector_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  inspection_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Por qué:** Permite calcular detection capability = NOK/(OK+NOK) por inspector.

### `057_mrb_quarantine_qty.sql`
Columnas de cuarentena en `mrb_campaigns`:
```sql
ALTER TABLE mrb_campaigns
  ADD COLUMN qty_quarantine_total     INTEGER DEFAULT 0,
  ADD COLUMN qty_quarantine_warehouse  INTEGER DEFAULT 0,
  ADD COLUMN qty_quarantine_process    INTEGER DEFAULT 0,
  ADD COLUMN qty_quarantine_transit    INTEGER DEFAULT 0,
  ADD COLUMN qty_quarantine_customer   INTEGER DEFAULT 0,
  ADD COLUMN qty_quarantine_updated_at TIMESTAMP;
```
**Por qué:** No todo 8D lleva MRB. Se sincroniza desde `eightd_parts` cuando `source_8d_id` existe, con posibilidad de actualización manual si aparece más material.

---

## 2. Backend — `backend/endpoints/mrbEndpoints.js`

### Endpoint `POST /:id/capture-ok` (actualizado)
- Inserta en `mrb_ok_entries` con `inspector_id`, `shift_id`, `part_id`
- Actualiza contadores en `mrb_campaigns`

### Endpoint `GET /:id/inspector-performance` (nuevo)
- Agrega OK desde `mrb_ok_entries` + NOK desde `defect_entries_v2` por inspector
- Devuelve: `qtyInspected`, `yieldPct`, `detectionRate`

### Endpoint `PATCH /:id/quarantine` (nuevo)
- `{ syncFrom8D: true }` → JOIN con `eightd_parts` via `source_8d_id`, jala `qty_warehouse/in_process/in_transit/with_customer`
- `{ warehouse, process, transit, customer }` → actualización manual

### Endpoint `GET /:id/shift-defects` (actualizado)
- Nuevo query param `?inspectorId=X` para filtrar por inspector
- Usado en validación de turno duplicado (solo alerta al mismo inspector)

### `active-campaigns` SELECT (actualizado)
Devuelve campos de cuarentena y `source_8d_id`.

---

## 3. Frontend — `MRBDefectCapture.js` (reescrito completo)

### Contexto importante
- Este archivo se había **perdido** en una sesión anterior al fusionar los modos
- Se recuperó del transcript JSONL en `.claude/projects/.../1c3e9cce-f4fa-450b-9e4b-e87e3b29ee6b.jsonl`
- Se reescribió combinando el modo individual recuperado + el nuevo modo masivo

### Estructura actual
**Header:**
- Badge inspector
- Selector de turno (manual, sin auto-detect)
- Contadores: INSP / OK / NOK / RW / SC
- Botón PIEZA OK (individual) + Botón Registrar Turno (ambos modos)
- Toggle de modo: `[Hash Uno a Uno] [Layers Masivo]`
- ThemeSelector + nav buttons

**Modo Individual:**
- Panel izquierdo (240px):
  1. **Escanear / Serie** — PRIMER campo, auto-focus permanente, Enter = OK si sin defecto / NOK si con defecto seleccionado
  2. Disposición
  3. Tiempo de Paro (checkbox + input min)
  4. Severidad (botones)
  5. Comentario
  - Etapa de Afectación **eliminada** (no aplica en MRB)
- Panel derecho: grid de defectos por categoría + submit panel

**Modo Masivo:**
- OK row con ACUM + CAP
- Tabla tally sheet: defectos × disposiciones con ACUM+CAP sticky
- Guardar Avance + Registrar Turno + Upload Tally Sheet

### Comportamiento de turno (cambios de esta sesión)
| Antes | Después |
|---|---|
| Auto-detect por horario (`detectCurrentShift`) | Manual — el usuario elige |
| Sin memoria | Guarda en `localStorage('mrbLastShiftId')` |
| Sin validación de duplicado | Alerta si el MISMO inspector ya capturó en ese turno+fecha+campaña |

**Lógica de alerta duplicado:**
- Llama a `shift-defects?date=hoy&shiftId=X&inspectorId=Y`
- Solo alerta al inspector que ya tiene entradas (no molesta a otros inspectores del mismo turno)

### Comportamiento del scanner (nuevo)
- Campo "Escanear / Serie" siempre con foco
- Enter → if `selectedDefect`: `handleSubmitDefect()`, else `handlePiezaOk()`
- Tras captura exitosa: limpia `lotNumber`, regresa foco al scanner
- Hint dinámico bajo el campo: "Enter → registrar NOK/OK"

---

## 4. Frontend — `MRBCampaignDetail.js`

Panel de cuarentena en tab Progreso:
- Total Hold / Inspeccionado / Restante
- Barra de progreso (amarilla → verde al 100%)
- Chips: Almacén / Proceso / Tránsito / Cliente
- Botón "Sync desde 8D" (visible solo si `source_8d_id`)
- Formulario de edición manual (4 inputs + total auto-calculado)

---

## 5. Errores importantes de la sesión

| Error | Causa | Solución |
|---|---|---|
| MRB button en DefectCapture.js | Me confundí de archivo (QAR vs MRB) | Revertido completamente |
| Individual mode inventado | Intenté reconstruir sin código original | Recuperado del JSONL transcript |
| Python no disponible para extracción | Sistema sin Python | Switched a Node.js |

---

## 6. Pendientes para próxima sesión

### Prioritario
- **Daily Shift Report Modal** — 7 secciones: Header, KPIs, Avance cuarentena, Pareto defectos, Breakdown disposición, Performance por inspector, Tally sheets + notas
  - Disparado desde botón "Registrar Turno"
  - Considerar tabla `mrb_shift_reports` para persistir historial

### Arrastrando
- Git + GitHub privado (protección PI / timestamps)
- Taguchi: guardar resultados a BD
- PDF/Excel export para Herramientas Estadísticas
- Módulo ECR — refinamiento
- Sistema de notificaciones/bandeja de entrada
- MRBDashboard — verificación visual

---

## 7. Archivos tocados esta sesión

```
backend/
  endpoints/mrbEndpoints.js         ← capture-ok, inspector-performance, quarantine, shift-defects
  migrations/056_mrb_ok_entries.sql  ← nuevo
  migrations/057_mrb_quarantine_qty.sql ← nuevo

frontend/src/pages/
  MRBDefectCapture.js    ← reescrito completo + cambios de UX
  MRBCampaignDetail.js   ← panel cuarentena
  DefectCapture.js       ← revertido (no tocar, es QAR)
```

---

## 8. Notas de arquitectura

- `inspection_shifts` es compartida entre QAR y MRB (misma tabla, no hay config UI MRB todavía)
- MRB NO usa auto-detect de turno por horario (QAR sí lo usa en DefectCapture.js)
- `mrb_ok_entries` es independiente de `defect_entries_v2` — permite análisis por inspector sin mezclar fuentes
- El campo `inspector_id` en `defect_entries_v2` ya existía, se usa en el filtro de shift-defects
