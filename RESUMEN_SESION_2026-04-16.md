# Resumen Sesión 2026-04-16

## ✅ Lo que se completó hoy

### Reporte de Turno (MRBShiftReport.js)
- ✅ Sección 7 rediseñada: cards de dos columnas (detalle izquierda, foto derecha 300px)
- ✅ PDF export: botones ocultos durante captura, modal expandido para capturar contenido completo
- ✅ PDF paginación inteligente: cada card individual se captura por separado, sin cortes de imagen
- ✅ Tally sheet retroactivo: botón "+ Agregar Tally Sheet" dentro del reporte de turno

### MRBCampaignDetail
- ✅ Botón "Editar Borrador" → entra en paso 3 (no paso 1)
- ✅ Destinatarios: botón "📧 Enviar recordatorio a todos" con log en historial
- ✅ Al agregar nuevo destinatario → abre mailto al usuario agregado
- ✅ Al publicar campaña → abre mailto a todos los destinatarios + log en historial
- ✅ Turnos fantasma: tally sheets huérfanos agrupados con turno del mismo día
- ✅ Reasignación de turno por el supervisor: dropdown en encabezado de fila del día
- ✅ Endpoint `POST /:id/reassign-shift` actualiza defect_entries_v2, mrb_ok_entries y mrb_attachments

### MRBCreate
- ✅ Al editar draft → inicia en paso 3
- ✅ Carga los 4 campos de cuarentena al editar draft
- ✅ Botón "🔄 Sincronizar desde 8D" en paso 3 (modo edición y creación)
- ✅ `draftSourceId` guardado en state para re-sync

### MRBDefectCapture
- ✅ Serial obligatorio para OK y NOK en modo individual
- ✅ `capture-ok` guarda `lot_number` en `mrb_ok_entries`
- ✅ Migración 059: columna `lot_number` en `mrb_ok_entries`
- ✅ Turno manual obligatorio — restaura solo si es el mismo día (localStorage + fecha)
- ✅ Modal de turno pendiente al cambiar de día sin haber registrado el turno anterior
- ✅ Registro retroactivo de turno con nota obligatoria
- ✅ Modal "Registrar Turno": nota obligatoria si 0 piezas, opcional si hay actividad
- ✅ Log en historial al registrar turno: turno, OK, NOK, inspector, nota
- ✅ Botón "Tally Sheet" en barra superior (reemplazó botón "Evidencia" confuso)

### Backend
- ✅ CORS para `/uploads` (html2canvas puede cargar imágenes para PDF)
- ✅ `POST /:id/recipients` acepta `userId` singular o `userIds` array
- ✅ Al publicar (PUT): devuelve `notifyRecipients` para mailto en frontend, log en historial
- ✅ Al crear como ABIERTA (POST): log en historial con destinatarios notificados
- ✅ `sendMrbBulkNotifications` eliminado — 100% mailto client-side
- ✅ `POST /:id/reassign-shift` endpoint nuevo
- ✅ `PATCH /:id/attachments/:attachId` endpoint nuevo

---

## 🧪 Testing MRB — De Alta a Reporte (checklist pendiente de validar)

### 1. Crear campaña (MRBCreate)
- [ ] Paso 1: datos básicos — número campaña, cliente, parte
- [ ] Paso 2: vincular 8D source → verifica autocompleta cuarentena
- [ ] Paso 3: editar manualmente 4 campos de cuarentena (Almacén, Proceso, Tránsito, Cliente)
- [ ] Botón 🔄 Sincronizar desde 8D funciona en paso 3
- [ ] "En Planta" = Almacén + Proceso en el resumen

### 2. Vista de campaña (CampaignDetail)
- [ ] Tab Avance: chips Almacén+Proceso en ámbar, Tránsito+Cliente en gris con ℹ
- [ ] Label "En Planta" muestra la suma correcta
- [ ] Botón "📧 Enviar recordatorio" aparece y abre mailto
- [ ] Agregar destinatario → abre mailto al nuevo usuario
- [ ] Publicar → abre mailto a todos + aparece en historial

### 3. Iniciar turno — Captura Individual
- [ ] Turno NO se selecciona automáticamente (debe ser manual)
- [ ] Mismo turno mismo día → se restaura al recargar
- [ ] Distinto día → pide registrar turno pendiente primero
- [ ] Serial obligatorio para OK y NOK (botón deshabilitado sin serial)
- [ ] Escanear mismo serial → agrega [Reproceso] automáticamente
- [ ] Subir foto de evidencia → aparece thumbnail
- [ ] Eliminar foto → desaparece
- [ ] Registrar defecto → foto y serial se limpian
- [ ] OK se registra con serial en BD

### 4. Captura masiva
- [ ] OK counter incrementa
- [ ] NOK grid registra defectos
- [ ] Botón "Tally Sheet" en barra superior sube correctamente

### 5. Lifecycle de turno
- [ ] Modal "Registrar Turno": nota obligatoria si 0 piezas
- [ ] Confirmar cierre → log en historial con OK/NOK/inspector/nota
- [ ] Abrir nuevo turno mismo día → modal de advertencia
- [ ] Cancelar → datos se mantienen
- [ ] Confirmar → contadores se limpian

### 6. Reporte de turno
- [ ] Botón 📋 Ver Reporte en fila del turno
- [ ] Header: campaña, cliente, parte, turno, fecha correctos
- [ ] KPIs: INSP, OK, NOK, Yield% correctos
- [ ] Avance: barra de progreso vs En Planta
- [ ] Pareto: defectos ordenados por frecuencia
- [ ] Disposición: chips con colores
- [ ] Inspector: OK+NOK por inspector
- [ ] Tally Sheets: aparecen + botón agregar retroactivo funciona
- [ ] Registro Individual: cards con foto grande a la derecha
- [ ] Badge "EN CURSO" visible si es hoy
- [ ] Auto-refresh cada 30s

### 7. Export PDF
- [ ] Botones desaparecen durante generación
- [ ] Reporte completo sin cortes en imágenes
- [ ] Fotos visibles dentro del PDF

### 8. Avance de campaña — Supervisor
- [ ] Filas sin turno → selector rojo "⚠ Asignar turno"
- [ ] Dropdown reasignación → actualiza todos los registros del día
- [ ] Log en historial con el cambio

---

## 📋 Pendientes / Backlog

- [ ] Listado completo OK+NOK en reporte de turno (trazabilidad de piezas dentro de material sospechoso)
- [ ] Shift lifecycle formal: tabla `mrb_shift_reports` con estados draft/registrado/read-only
- [ ] Observation textarea en reporte de turno (guardar en BD)
- [ ] MRBDashboard
- [ ] Git / GitHub setup
- [ ] PDF/Excel para Statistical Tools
- [ ] ECR refinement
- [ ] Notificaciones push
