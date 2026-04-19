# Sesión de Desarrollo — 18 de Abril 2026
**Proyecto:** Quality Alert System — Módulo MRB  
**Duración estimada:** ~6 horas

---

## ✅ Lo que hicimos hoy

### Infraestructura
1. **CLAUDE.md global** — Creado en `C:\Users\The Eidrian\.claude\CLAUDE.md` con el Protocolo Estricto de Eficiencia y Precisión. Se carga automáticamente en todas las sesiones.
2. **Git + GitHub** — Instalado `gh` CLI via winget, inicializado repositorio git, creado repo privado en GitHub: `https://github.com/theadriansl/quality-alert-system`. Primer commit: "Initial commit — Quality Alert System MRB Module". Archivo `backend/nul` y `frontend/nul` excluidos por ser nombres reservados en Windows.

### Bugs corregidos
3. **Serial (lot_number) no se guardaba en piezas OK** — Causa raíz: el scanner dispara `onChange` y `Enter` en el mismo tick; el `useCallback` tenía el valor viejo de `lotNumber`. Fix: agregar `lotNumberRef = useRef('')` y actualizar la ref en `handleSerialChange`. `handlePiezaOk` ahora lee `lotNumberRef.current` en vez del estado.
4. **Historial sin nombre de usuario en entradas automáticas** — El `POST /mrb/:id/comments` retornaba solo el row de DB sin JOIN al nombre. Fix: agregar subquery `(SELECT first_name || ' ' || last_name FROM users WHERE id = $2) as user_name` en el RETURNING del INSERT.

### Funcionalidades nuevas

#### Historial con audit log automático
- **Helper `logHistory`** en `MRBCampaignDetail.js` — función reutilizable que llama `POST /mrb/:id/comments` y actualiza el estado local.
- **Acciones que ahora quedan en historial:**
  - Cuarentena editada (con valores nuevos)
  - Cuarentena sincronizada desde 8D
  - Archivo adjuntado (con nombre)
  - Archivo eliminado (con nombre)
- **Historial con scroll** — `maxHeight: 400px` + `overflow-y: auto` en el timeline, ya no crece infinito.

#### Restricciones de acceso por rol
- **Helper `isMrbAuthorized(userId, userRole, campaignId, recipientType)`** en backend — verifica si el usuario es admin (`system_role = 'admin'`) o destinatario del MRB.
- **Endpoints protegidos:**
  - `PATCH /:id/quarantine` → admin + cualquier destinatario
  - `POST /:id/attachments` → admin + cualquier destinatario
  - `DELETE /:id/attachments/:attachId` → admin + cualquier destinatario
  - `POST /:id/respond` → admin + destinatarios de RESPUESTA (check que estaba comentado, ahora activo)
  - `POST /:id/validate` → solo `can_validate_mrb` (ya existía)

#### Campaña CERRADA — botones bloqueados
- Variable `isClosed = selectedCampaign?.status === 'CERRADA'` en `MRBDefectCapture.js`.
- Botones deshabilitados cuando CERRADA: **PIEZA OK**, **AGREGAR DEFECTO NOK**, **REGISTRAR TURNO** (individual y bulk).
- Botones de consulta y exportar no se tocan.

#### Post-cierre de turno en historial
- Al aceptar el warning "Turno duplicado" → se guarda en historial: *"Inspector continuó capturando en turno X después de haberlo registrado formalmente."*
- Endpoint: `POST /mrb/:id/comments` con `type: 'post_shift_capture'`.

#### Modal Vincular / Cambiar Origen 8D — rediseñado
- **Badges de campañas MRB existentes** por cada 8D en la lista (colores por status: verde=CERRADA, gris=BORRADOR, naranja=activa).
- **Panel "Adoptar datos de X"** con checkboxes — aparece al seleccionar cualquier 8D, tanto en "Vincular 8D" (INCOMING sin 8D) como en "Cambiar Origen" (con o sin 8D previo).
- **Campos adoptables:** Título, Cliente/Proyecto, Número(s) de Parte, Descripción del Problema, Cantidades de Cuarentena, Fotos NOK/OK, Criterio de Inspección (D3), Instrucciones de Disposición (D3).
- **Warning de campos vacíos** — antes de adoptar, si algún campo seleccionado está vacío en el 8D, pregunta si limpiar o revisar.
- **Backend `link-8d` extendido** — ahora recibe `adoptFields` + `source` y aplica dinámicamente los campos seleccionados en un solo UPDATE. Registra en historial qué campos se adoptaron.
- **`effectiveType`** — cuando la campaña es INCOMING, usa el tipo de la fuente seleccionada (`selectedNewSource.sourceType`) en vez del tipo del MRB para el endpoint `/source`.

---

## 🔲 Pendientes identificados hoy (no implementados)

- [ ] **UI para gestionar `can_validate_mrb`** — actualmente solo Adrian Salazar lo tiene. Falta interfaz para asignarlo a otros usuarios desde admin.
- [ ] **Git commits continuos** — hacer commit después de cada sesión de trabajo para mantener historial limpio en GitHub.
- [ ] **Email real (SMTP)** — definido como mailto permanente, no aplica.

---

## Estado del checklist al cierre de sesión

| # | Ítem | Estado |
|---|------|--------|
| 1 | Fin de Campaña (cierre normal + anticipado) | ✅ |
| 2 | POST /respond end-to-end | ✅ |
| 3 | Rechazar → corregir → aprobar | ✅ |
| 4 | Export Excel (Individual + Masivo) | ✅ |
| 5 | Costo de personal completo | ✅ |
| 6 | Git + GitHub backup | ✅ |
| 7 | MRBDashboard | ✅ |
| 8 | Shift lifecycle (post-cierre en historial) | ✅ |
| 9 | Notas turno a DB | ✅ |
| 10 | Restricciones por rol | ✅ |
| 11 | Email (mailto, diseño final) | ✅ |

---

## Notas de arquitectura importantes
- **`isMrbAuthorized`** — helper en `mrbEndpoints.js` línea ~11. Admin = `system_role = 'admin'` en tabla `users`. Recipient = fila en `mrb_recipients` para ese campaignId.
- **`logHistory`** — helper en `MRBCampaignDetail.js`, actualiza estado local `comments` sin recargar la página.
- **`lotNumberRef`** — patrón useRef para valores que se leen en callbacks disparados por scanner (evita stale closure con barcode scanners).
- **Modal de origen** — `isLinking8d` controla si es vinculación nueva; `selectedNewSource.sourceType === '8D'` controla si mostrar panel de adopción (independiente de `isLinking8d`).
- **`effectiveType`** — en `handleChangeSource`, siempre usar `selectedNewSource?.sourceType || sourceType` para el tipo de origen real al llamar `/source`.
