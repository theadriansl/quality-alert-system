# Resumen Sesion 2026-05-23 - Modulo ECR

## Estado General
- **Modulo:** ECR (Engineering Change Request)
- **Estado:** ECR-4 Closure en testing
- **Servidores:** Backend :5000 / Frontend :3000

---

## CORRECCIONES SESION NOCHE (24 Mayo ~05:30)

### 11. ECR-4: UI Igual a ECR-3
- [x] Panel de Estado de Aprobación de Cierre (badge + mensajes informativos)
- [x] Estados: Borrador, Pendiente, Aprobado, Rechazado, Cerrado como Rechazado
- [x] Flujo horizontal de aprobadores (ya existía)
- [x] Modal de 2 pasos igual que ECR-3:
  - Paso 1: Aprobar/Rechazar/Cancelar
  - Paso 2: Comentarios + Confirmar/Atrás
- [x] Comentarios obligatorios al rechazar

### 12. ECR-4: Botón Re-enviar a Aprobación
- [x] Footer de ECRWorkflow maneja `status === 'rejected'`
- [x] Muestra "↻ Re-enviar a Aprobación" con estilo naranja (#C77700)
- [x] Mismo comportamiento que ECR-3

### 13. ECR-4: Historial Separado
- [x] Nueva columna `closure_approval_history` JSONB
- [x] Historial de firmas de cierre independiente del de ECR-3
- [x] Tabla de historial debajo del footer en ECR-4

### 14. ECR-4: handleSignClosure Mejorado
- [x] Acepta comentarios como parámetro (ya no usa window.prompt)
- [x] Eliminado window.confirm (modal lo reemplaza)
- [x] Status cambia a 'rejected' (no 'draft') para que Re-enviar funcione

---

## CORRECCIONES SESION TARDE (Anteriores)

### 1. ECR-1: Change Category Fix
- [x] `changeCategories` no persistia al recargar
- [x] Agregado useEffect para sincronizar cuando data cambia

### 2. ECR-2: Persistencia de Partes Seleccionadas
- [x] `selectedParts` y `selectedProjects` se borraban
- [x] Agregados a campos JSONB preservados en backend
- [x] Auto-expansion de seccion si hay cliente/proyectos/partes
- [x] Auto-expansion al seleccionar cliente

### 3. ECR-2B: Separacion Notificacion al Cliente
- [x] TFT "Cliente" ahora muestra campos estandar (riesgo, subsecciones)
- [x] Seccion "Notificacion al Cliente" es FIJA y siempre visible
- [x] Removido badge "ISO/IATF"

### 4. ECR-2B: Bloqueo por Riesgo Incompleto
- [x] Validacion en `handleNextStage` (boton Siguiente)
- [x] Validacion en `handleStageChange` (click en tabs)
- [x] Validacion en `handleStageCompletion` (checkbox completado)
- [x] Mensaje: "Completa la evaluacion de riesgo. TFT pendientes: [nombres]"

### 5. ECR-3: Auto-guardado de Actividades
- [x] Auto-guardado con debounce 1.5s al cambiar progreso/estado
- [x] Auto-guardado 0.5s al agregar nueva actividad
- [x] Prop `onSaveDraft` pasado desde ECRWorkflow

### 6. ECR-3: Fix Estado de Actividades
- [x] Actividades con 100% mostraban "Pendiente"
- [x] useEffect corrige estados inconsistentes automaticamente

### 7. Sistema de Aprobaciones: Historial Persistente
- [x] Nueva columna `approval_history` JSONB
- [x] Cada aprobacion/rechazo se ACUMULA (nunca se sobrescribe)
- [x] Frontend usa `fullApprovalHistory`
- [x] Ordenado por fecha (mas reciente primero)

### 8. Emails: Fix Certificado SSL
- [x] Error "self-signed certificate in certificate chain"
- [x] Agregado `rejectUnauthorized: false` en TLS config

### 9. Mailto: Generación al Aprobar/Rechazar/Enviar
- [x] Backend retorna `mailtoData` en endpoints de aprobación
- [x] ECRApprovalModal.js genera mailto: al aprobar/rechazar
- [x] ECRApprovalPanel.js genera mailto: al enviar a aprobación
- [x] Patrón: `window.open(mailto:, '_blank')` como QAR
- [x] Rechazo: CC a todos los miembros del Review Board
- [x] Aprobación completa: mailto a Review Board + todos los aprobadores

### 10. ECR-1: Fix Fecha Planeada Adopción
- [x] Formato de fecha preservado como YYYY-MM-DD para input type="date"
- [x] Campo añadido a preservedFields en getECRById
- [x] Sincronización solo cuando data.id existe (evita race condition)

---

## Correcciones Realizadas (Mañana)

### Dashboard Avanzado (`/ecr-dashboard`)
- [x] ThemeSelector agregado a ECRDashboardPowerBI.js
- [x] Memoria de preset de periodo (localStorage)
- [x] Renombrado ECRDashboardPowerBI -> ECRDashboardAdvanced
- [x] Widgets PPAP y Auditoria agregados a renderContent
- [x] Auto-save en Mi Dashboard
- [x] Corregido "TFT" -> "Areas" en etiquetas

### ECRWorkflow
- [x] Nuevo ECR siempre inicia en ECR-1 (stage 0)
- [x] Scroll al top cuando cambias de stage manualmente
- [x] Memoria de scroll cuando cargas ECR existente

### ECR-1: Team Assignment
- [x] Sincronizacion de changeInfo (fecha plannedAdoptionDate persiste)

### ECR-2: Change Description
- [x] Sincronizacion de selectedClient, selectedProjects, selectedParts

### ECR-3: Validation Plan
- [x] Horas invertidas en vista Tabla
- [x] Horas en historial con badge morado
- [x] Gantt - Responsables fix
- [x] Gantt - Escala aumentada a 400 dias
- [x] Cadena de Aprobaciones en backend
- [x] UI Cadena de Aprobaciones con estatus por nivel

---

## Archivos Modificados Hoy

### Backend
```
backend/endpoints/
├── ecrEndpoints.js          # Preservar selectedParts/selectedProjects, closureApprovalHistory
├── ecrApprovalEndpoints.js  # Historial acumulado, approvalChain, mailtoData
backend/utils/
└── emailService.js          # Fix certificado SSL
```

### Frontend
```
frontend/src/pages/
├── ECRDashboardAdvanced.js
├── ECRWorkflow.js           # Validacion riesgo, onSaveDraft, Re-enviar a Aprobación
└── App.js

frontend/src/components/ECR/
├── ECRTeamTab.js            # Sync changeCategories
├── ECRChangeRequest.js      # Auto-expansion partes
├── ECRImpactAnalysis.js     # Separar notificacion cliente
├── ECRValidationPlan.js     # Auto-guardado, fix estados
├── ECRApprovalPanel.js      # Usar fullApprovalHistory, mailto submit
├── ECRApprovalModal.js      # Mailto approve/reject
├── ECRApprovalTimeline.js   # Renderizar historial completo
└── ECRClosure.js            # Panel estado, modal 2 pasos, handleSignClosure mejorado

frontend/src/components/8D/
└── GanttChart.js
```

### Base de Datos
```sql
ALTER TABLE ecr_reports ADD COLUMN approval_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ecr_reports ADD COLUMN closure_approval_history JSONB DEFAULT '[]'::jsonb;
```

---

## Testing Checklist

### Completados
- [x] Dashboard Avanzado
- [x] Crear ECR
- [x] ECR-1: Team Assignment
- [x] ECR-2: Change Description
- [x] ECR-2B: Impact Analysis
- [x] ECR-3: Validation Plan (con auto-guardado)
- [x] Sistema de Aprobaciones ECR-3

### En Progreso - ECR-4 Closure
- [x] Panel de estado igual a ECR-3
- [x] Modal de firma igual a ECR-3
- [x] Botón Re-enviar a Aprobación
- [x] Historial separado
- [ ] **PENDIENTE PROBAR:** Flujo completo de firmas de cierre
- [ ] **PENDIENTE PROBAR:** Mailto al aprobar/rechazar cierre
- [ ] **PENDIENTE PROBAR:** Re-envío tras rechazo en cierre

### Pendientes (No iniciados)
- [ ] /ecr-config
- [ ] /ecr-quality-targets

---

## URLs de Prueba

| Pagina | URL |
|--------|-----|
| Dashboard | http://localhost:3000/ecr-dashboard |
| Nuevo ECR | http://localhost:3000/ecr-workflow |
| ECR existente | http://localhost:3000/ecr-workflow/:id |
| **ECR-4 Test** | http://localhost:3000/ecr-workflow/66 |
| Configuracion | http://localhost:3000/ecr-config |
| Quality Targets | http://localhost:3000/ecr-quality-targets |

---

## Notas Tecnicas

- **DB:** PostgreSQL 17 - apqp_system - localhost:5432 - postgres/postgres
- **Convenciones:** Backend snake_case / Frontend camelCase (transformToCamelCase)
- **Campos JSONB preservados:** impactAnalysis, validationEvidence, selectedParts, selectedProjects, approvalHistory, closureApprovalHistory
- **Auto-guardado:** Debounce 1.5s progreso, 0.5s nuevas acciones
- **Emails:** nodemailer con TLS flexible

---

## Resumen Final - Estado Actual

| Feature | Estado |
|---------|--------|
| Change Categories persistencia | OK |
| Selected Parts/Projects persistencia | OK |
| Auto-expansion partes al seleccionar cliente | OK |
| Validación riesgo ECR-2B | OK |
| Auto-guardado actividades ECR-3 | OK |
| Fix estado actividades 100% | OK |
| Historial aprobaciones acumulado | OK |
| SSL email fix | OK |
| Mailto al aprobar/rechazar/enviar | OK |
| Fecha Planeada Adopción persistencia | OK |
| ECR-4 Panel Estado igual ECR-3 | OK |
| ECR-4 Modal 2 pasos | OK |
| ECR-4 Botón Re-enviar | OK |
| ECR-4 Historial separado | OK |

---

## Próximos Pasos

1. **Probar ECR-4 Closure:**
   - Flujo completo de firmas (nivel 1 → nivel 2 → nivel 3)
   - Rechazo y re-envío
   - Mailto al firmar/rechazar

2. **Después de ECR-4:**
   - /ecr-config
   - /ecr-quality-targets

---

**Ultima actualizacion:** 2026-05-24 05:30 (Sesion noche)
**Proximo:** Probar ECR-4 Closure completo

