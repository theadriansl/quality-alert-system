# Sesión de Desarrollo — 17 de Abril 2026
**Proyecto:** Quality Alert System — Módulo MRB  
**Duración estimada:** ~6 horas

---

## ✅ Lo que hicimos hoy

### Bugs críticos resueltos
1. **`lot_number = null` en piezas OK individuales** — `lotNumber` faltaba en el array de dependencias del `useCallback` en `handlePiezaOk` → stale closure. Agregado a deps.
2. **Inputs de cuarentena congelados** — Variables locales `qWarehouse/qProcess/qTransit/qCustomer` dentro del render shadowing los states del componente. Renombradas a `dispWarehouse` etc. para el display; el form ya usa los states correctamente.
3. **`POST /respond` 500** — Columnas `root_cause`, `corrective_action`, `resolution_notes` faltaban en `mrb_campaigns`. Ejecutada migration 061.
4. **`POST /validate` 500** — Columna `can_validate_mrb` faltaba en `users`. Agregada con `ALTER TABLE`, activada para todos los admins.
5. **Números de parte en header del Shift Report** — Campaña multi-parte usa `parts_list` JSONB, no `part_id`. Agregado `mc.parts_list` al SELECT del header y mapeado en la respuesta.
6. **Fecha `Invalid Date` en tabla de personal** — Fecha de PostgreSQL viene como ISO string; `fmtDate` corregida con `.substring(0, 10)` antes de parsear.
7. **Fecha UTC vs local en registro de turno** — `new Date().toISOString()` daba fecha incorrecta después de las 6pm. Cambiado a `toLocaleDateString('en-CA')`.

### Funcionalidades nuevas

#### Daily Shift Report
- **Resumen de Captura Masiva** — Nueva sección entre "Desempeño por Inspector" y "Tally Sheets": cross-tab de defectos × disposición con totales, colores por disposición, solo filas con datos.
- **Piezas OK con serial** — Ya funcionaba; confirmado después del fix de stale closure.

#### Carátula de Campaña (MRBCampaignDetail)
- **Tabla Pareto de Defectos** — Reemplaza la lista "Defectos Asociados (24)". Agrupa por tipo de defecto, suma cantidades, muestra % del total y barra. Columnas: Defecto | Piezas NOK | % del Total | Barra.
- **Botón Exportar Excel** — Descarga `MRB_XXXX_defectos.xlsx` con dos hojas:
  - **Individual** — Entradas con serial (`lot_number IS NOT NULL`): Fecha, Serial, Parte, Defecto, Disposición, Turno, Inspector, Cantidad, Notas.
  - **Masivo** — Entradas sin serial (`lot_number IS NULL`): mismos campos sin serial.
- **`USE_AS_IS` en banner de KPIs** — Aparece "Usar c/es: 302" cuando hay piezas con esa disposición; los totales cuadran.
- **Costos de Campaña** — Dos tablas al final de la info del caso:
  - **Scrap por parte**: Parte | Qty Scrap | Costo Unitario | Total (usa `client_parts.unit_cost`).
  - **Personal por turno/día**: Fecha | Turno | Horas Trabajadas | Recursos (editable: insp + sup) | Costo. Botón ✎ para editar horas, inspectores y supervisores inline.
  - **Total general de campaña** en rojo al final.

#### Flujo de Validación / Respuesta
- **Rechazar respuesta** — Ya NO cancela la campaña. Regresa a `EN_PROCESO`, limpia `responded_by`/`response_date`, agrega comentario en historial, abre `mailto:` a todos los destinatarios de tipo RESPUESTA con asunto + motivo + link directo al MRB.
- **Link directo en email** — `window.location.origin/mrb-campaign/:id` pre-llenado en el cuerpo del correo.
- **Status CANCELADA revertido** — Campaña 10 regresada manualmente a `EN_PROCESO` via SQL.

#### Plataforma de Inspección (MRBDefectCapture)
- **Campo "Horas trabajadas"** en modal de Registrar Turno (default 8hrs, pasos de 0.5, máx 24). Se guarda a `mrb_shift_hours` al confirmar.
- **Disposición por defecto OnHold** — Backend: si `capture-nok` llega sin `dispositionId`, busca HOLD y lo asigna. Frontend: selector muestra "Sin especificar (On Hold)" y aviso "→ On Hold por defecto". Mensaje de confirmación al capturar sin disposición.

#### Base de datos
- **Nueva tabla `mrb_shift_hours`** — `(mrb_campaign_id, shift_id, inspection_date, inspector_count, supervisor_count, hours_worked, notes, registered_by)` con UNIQUE constraint por campaña+turno+fecha.
- **Nuevos endpoints:**
  - `GET /:id/shift-hours` — Lista horas registradas por turno.
  - `PUT /:id/shift-hours` — Upsert por (campaña, turno, fecha). Defaultea inspector/supervisor counts a los configurados en la campaña si no se envían.
  - `GET /:id/cost-summary` — Scrap por parte + personal por turno con totales. UNION en `known_shifts` incluye `defect_entries_v2` + `mrb_ok_entries` + `mrb_shift_hours` para no perder turnos con fecha desincronizada.
- **Columna `can_validate_mrb`** en `users` (BOOLEAN DEFAULT false).
- **Columna `scrap_unit_cost`** en `mrb_campaigns` (preparada, no usada aún).
- **Query de defectos enriquecida** en `GET /:id` — Ahora incluye `disposition_name/code`, `shift_name/code`, `part_number/name` para el Excel.

---

## 🔲 Checklist pendiente para mañana

### Pruebas que quedaron sin verificar
- [ ] **Fin de Campaña** — Flujo completo: cerrar con inventario 100%, y cierre anticipado con motivo (debe quedar en historial como `closure_reason`).
- [ ] **POST /respond end-to-end** — Enviar los 3 campos (causa raíz, acción correctiva, notas) y que quede guardado.
- [ ] **Flujo rechazar → corregir → aprobar** — Ciclo completo: respuesta → rechazo con mailto → responsable corrige → validador aprueba → CERRADA.
- [ ] **Export Excel** — Verificar que ambas hojas (Individual/Masivo) descarguen con datos correctos.
- [ ] **Costo de personal completo** — Registrar un turno nuevo y confirmar que horas + inspector_count + supervisor_count se guardan bien automáticamente.

### Funcionalidades pendientes de implementar
- [ ] **Git + GitHub backup** — El proyecto no está en control de versiones todavía. Riesgo alto de pérdida.
- [ ] **MRBDashboard** — Verificación general del dashboard (contadores, estados, filtros).
- [ ] **Shift lifecycle formal** — Una vez registrado el turno, bloquear re-edición de entradas (read-only).
- [ ] **Observaciones del turno guardadas a DB** — El textarea de notas en el Shift Report actualmente no persiste.
- [ ] **Scrap unit cost desde partes** — La columna `scrap_unit_cost` en `mrb_campaigns` fue agregada pero no se usa; los costos de scrap ya usan `client_parts.unit_cost` directamente.
- [ ] **Permisos `can_validate_mrb`** — Actualmente solo el admin Adrian Salazar lo tiene. Definir si otros roles deben tenerlo y cómo se gestiona desde UI.
- [ ] **Email real (SMTP)** — El mailto abre el cliente de correo local. Para producción se necesita configurar nodemailer con credenciales reales en `.env`.

### Deuda técnica identificada
- [ ] Entradas con `lot_number = null` de sesiones anteriores (IDs 33-38) — ya corregida la causa, los datos históricos quedan como están.
- [ ] Campaña 10 tiene 1 entrada sin disposición (`NULL`) de antes del fix. No afecta funcionalidad pero queda en "Sin clasificar" en el Pareto.

---

## Notas de arquitectura importantes
- **Timezone**: Backend usa `toLocaleDateString('en-CA')` en `capture-ok` y frontend usa el mismo en `handleRegistrarTurno`. PostgreSQL almacena las fechas en UTC; `DATE(created_at)` puede dar la fecha siguiente después de las 18:00 hora México (UTC-6). El campo `inspection_date` explícito resuelve esto.
- **Disposición OnHold por defecto**: Solo aplica en captura individual. En masivo es imposible no tener disposición (las columnas del tally grid SON las disposiciones).
- **`mrb_shift_hours` vs `defect_entries_v2` fechas**: El UNION en `cost-summary` garantiza que aunque haya desincronización de fechas, ambas filas aparecen. Si se guardan con fechas distintas, aparecen como dos filas separadas — corrección manual vía SQL o editar con el botón ✎.
