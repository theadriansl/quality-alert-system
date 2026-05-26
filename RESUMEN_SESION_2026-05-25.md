# Resumen Sesion 2026-05-25 - Modulo ECR

## Estado General
- **Modulo:** ECR (Engineering Change Request)
- **Estado:** ECR-4 Closure - Flujo "Cerrar como No Adoptable" implementado
- **Servidores:** Backend :5000 / Frontend :3000

---

## AVANCES SESION (25 Mayo)

### 1. Separación ECR-3 y ECR-4
- [x] ECR-3: Aprobación del CAMBIO (¿se adopta o no?)
- [x] ECR-4: Aprobación del CIERRE (¿está todo documentado?)
- [x] Corregido flujo de estados entre ambas etapas

### 2. Persistencia de Campos ECR-4
- [x] `productionJudgment` y `productionComments` ahora se guardan correctamente
- [x] Agregados al payload de `handleSave` en ECRWorkflow.js

### 3. Endpoints Backend para ECR-4 Closure
- [x] `POST /ecr/:id/closure-submit` - Enviar cierre a aprobación
- [x] `POST /ecr/:id/closure-approve` - Aprobar nivel de cierre
- [x] `POST /ecr/:id/closure-reject` - Rechazar cierre (vuelve a draft)
- [x] Movida lógica de frontend a backend para persistencia correcta
- **Archivo:** ecrApprovalEndpoints.js

### 4. Fix Auth Middleware
- [x] Agregados `firstName` y `lastName` a `req.user`
- [x] Ahora el historial muestra nombre completo del usuario
- **Archivo:** auth.js

### 5. NUEVO: Flujo "Cerrar como No Adoptable"

#### Nuevos Status
- [x] `pending_rejected_closure` - Pendiente de firmas para cierre como no adoptable (header rojo)
- [x] `closed_rejected` - ECR cerrado como no adoptable (estado final)

#### Checkbox en Footer ECR-4
- [x] "CERRAR COMO RECHAZADO" aparece solo en draft/pending_closure
- [x] Se guarda automáticamente al marcar
- [x] Requiere motivo de rechazo obligatorio
- **Archivo:** ECRWorkflow.js

#### Panel Visual Diferenciado
- [x] Recuadro rojo "CIERRE COMO NO ADOPTABLE - Pendiente de Firmas"
- [x] Muestra el motivo del rechazo
- [x] Badge rojo en estado de cierre
- **Archivo:** ECRClosure.js

#### Modal de Aprobación Mejorado
- [x] Warning claro cuando es cierre como no adoptable
- [x] Botones descriptivos: "Confirmar Cierre como No Adoptable" / "Devolver - Considerar Adoptar"
- [x] Muestra el motivo del rechazo al aprobador
- **Archivo:** ECRClosure.js (ClosureApprovalModalContent)

#### Historial Diferenciado
- [x] "→ Enviado (No Adoptable)" con estilo rojo
- [x] Notas: "Enviado para CIERRE COMO NO ADOPTABLE. Motivo: [razón]"
- **Archivo:** ECRWorkflow.js

#### Backend Actualizado
- [x] `closure-submit` acepta `closureType` ('approved'|'rejected') y `rejectionReason`
- [x] `closure-approve` cierra como `closed_rejected` cuando corresponde
- [x] `closure-reject` resetea `closure_type` para permitir reconsideración
- **Archivo:** ecrApprovalEndpoints.js

### 6. Migración Base de Datos
- [x] Columna `closure_type` VARCHAR(20) - 'approved' o 'rejected'
- [x] Columna `rejection_reason` TEXT - Motivo del rechazo
- **Archivo:** migrations/057_ecr_closure_type.sql

---

## Archivos Modificados Hoy

### Backend
```
backend/endpoints/
├── ecrApprovalEndpoints.js  # Nuevos endpoints closure-submit/approve/reject
└── ecrEndpoints.js          # Agregados closureType, rejectionReason

backend/middleware/
└── auth.js                  # firstName/lastName en req.user

backend/migrations/
└── 057_ecr_closure_type.sql # Nuevas columnas
```

### Frontend
```
frontend/src/pages/
└── ECRWorkflow.js           # Checkbox "Cerrar como Rechazado", historial, colores status

frontend/src/components/ECR/
└── ECRClosure.js            # Modal mejorado, paneles visuales, flujo no adoptable
```

---

## PENDIENTES (26 Mayo)

### Testing Flujo "No Adoptable"
- [ ] Probar flujo completo: marcar checkbox → escribir motivo → enviar → firmar 3 niveles → closed_rejected
- [ ] Verificar que al rechazar un "no adoptable", vuelve a draft y permite reconsiderar
- [ ] Verificar historial muestra correctamente las acciones

### Pendientes No Iniciados
- [ ] /ecr-config (Revisión de Configuración)
- [ ] /ecr-quality-targets

---

## Diagrama Flujo "Cerrar como No Adoptable"

```
                    ECR en Draft/Pending Closure
                              │
                    ┌─────────┴─────────┐
                    │                   │
            [Normal]                [No Adoptable]
                    │                   │
                    ▼                   ▼
          Enviar a Aprobación    Marcar Checkbox
                    │            "Cerrar como Rechazado"
                    │                   │
                    │            Escribir Motivo
                    │                   │
                    │            Enviar a Aprobación
                    │                   │
                    ▼                   ▼
          pending_approval      pending_rejected_closure
          (amarillo)            (rojo)
                    │                   │
                    ▼                   ▼
          Nivel 1 → 2 → 3       Nivel 1 → 2 → 3
          (Aprobar Cierre)      (Confirmar No Adoptable)
                    │                   │
                    ▼                   ▼
               closed              closed_rejected
               (verde)             (rojo oscuro)
```

---

## Notas Tecnicas

- **DB:** PostgreSQL 17 - apqp_system - localhost:5432 - postgres/postgres
- **ECR 66:** Usado para pruebas, cerrado como APROBADO
- **closureType:** Se guarda en BD, determina el flujo de cierre
- **Al rechazar "No Adoptable":** Se limpia closure_type para permitir cambiar de opinión

---

## URLs de Prueba

| Pagina | URL |
|--------|-----|
| Dashboard | http://localhost:3000/ecr-dashboard |
| ECR-4 Test | http://localhost:3000/ecr-workflow/66 |

---

**Ultima actualizacion:** 2026-05-25 ~22:00
**Proximo:** Testing flujo "No Adoptable" + /ecr-config
