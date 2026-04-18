# 📋 Sistema de Aprobación 8D - Documentación de Workflow

**Fecha de creación:** 2025-01-22
**Sistema:** Quality Alert System - 8D Methodology
**Alcance:** D1-D2-D3 (Calidad)

---

## 📊 1. Diagrama de Estados (State Machine) - FLUJO SECUENCIAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ESTADOS DEL REPORTE D1-D2-D3 (Aprobación Secuencial)           │
│  TODOS los aprobadores deben aprobar en ORDEN (1 → 2 → 3)                  │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   DRAFT      │
                         │  (Borrador)  │
                         └──────┬───────┘
                                │
                                │ [Emisor: "Mandar a Aprobación"]
                                ▼
                    ┌──────────────────────┐
                    │ PENDING_APPROVAL_1   │
                    │ (Esperando Aprobador 1)│
                    └──────┬──────────┬────┘
                           │          │
         [Aprobador 1      │          │      [Aprobador 1
          Aprueba]         │          │       Rechaza + Comentario]
                           │          │
                           ▼          ▼
              ┌──────────────────┐  ┌────────────────┐
              │PENDING_APPROVAL_2│  │ REJECTED_BY_A1 │
              │(Esperando        │  │ (Emisor debe   │
              │ Aprobador 2)     │  │  corregir)     │
              └──────┬─────┬─────┘  └────────┬───────┘
                     │     │                 │
    [Aprobador 2     │     │   [Aprobador 2  │ [Emisor corrige]
     Aprueba]        │     │    Rechaza +    │
                     │     │    Comentario]  │
                     │     │                 │
                     ▼     ▼                 ▼
        ┌──────────────┐ ┌─────────────┐  ┌──────────────────┐
        │PENDING_      │ │REJECTED_BY_A2│ │PENDING_APPROVAL_1│
        │APPROVAL_3    │ │(Vuelve a A1) │ │ (Re-envío)       │
        │(Esperando    │ └──────┬──────┘  └──────────────────┘
        │ Aprobador 3) │        │
        └──────┬───┬───┘        │ [Aprobador 1
               │   │            │  re-revisa]
[Aprobador 3   │   │  [Aprobador│
 Aprueba]      │   │   3 Rechaza│
               │   │   +Comentario]
               │   │            │
               ▼   ▼            ▼
        ┌──────────┐  ┌─────────────────┐
        │ APPROVED │  │ REJECTED_BY_A3  │
        │(Aprobado │  │ (Vuelve a A2)   │
        │  Final)  │  └────────┬────────┘
        └────┬─────┘           │
             │                 │ [Aprobador 2
             │                 │  re-revisa]
             ▼                 │
    [FIN - Pasa a D4-D5-D6]    │
                               └─────[Ciclo continúa]
```

### Reglas del Flujo Secuencial:
1. **Orden estricto**: Aprobador 1 → Aprobador 2 → Aprobador 3
2. **Rechazo regresa al anterior**:
   - A1 rechaza → Emisor
   - A2 rechaza → Aprobador 1
   - A3 rechaza → Aprobador 2
3. **Comentario obligatorio** en cada rechazo
4. **Todos deben aprobar** para estado final APPROVED

---

## 🔐 2. Matriz de Permisos por Rol

| Estado | Emisor (Creador) | Aprobadores (Issue Card) | Administrador del Sistema | Otros Usuarios |
|--------|------------------|--------------------------|---------------------------|----------------|
| **DRAFT** | ✏️ **Editar Todo** | 👁️ Solo Visualizar | ✏️ **Editar Todo** | 👁️ Solo Visualizar |
| **PENDING_APPROVAL** | 👁️ **Solo Visualizar** | ✏️ **Editar + Aprobar/Rechazar** | ✏️ **Editar Todo** | 👁️ Solo Visualizar |
| **APPROVED** | 👁️ Solo Visualizar | 👁️ Solo Visualizar | ✏️ **Editar Todo** | 👁️ Solo Visualizar |
| **REJECTED** | ✏️ **Editar Todo** | 👁️ Solo Visualizar | ✏️ **Editar Todo** | 👁️ Solo Visualizar |

### Leyenda:
- ✏️ **Editar**: Puede modificar campos de D1, D2, D3
- 👁️ **Visualizar**: Solo puede ver, campos bloqueados
- **Aprobar/Rechazar**: Puede cambiar el estado del reporte

---

## 👥 3. Roles y Propiedades de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROLES DEL SISTEMA                          │
└─────────────────────────────────────────────────────────────────┘

1. EMISOR (Creator/Issuer)
   ├── Propiedades:
   │   └── user_id === report.created_by
   ├── Permisos Especiales:
   │   ├── Crear reportes 8D
   │   ├── Editar en estado DRAFT
   │   └── Editar en estado REJECTED
   └── Restricciones:
       └── NO puede editar en PENDING_APPROVAL o APPROVED

2. APROBADOR (Approver) - Issue Card
   ├── Identificación:
   │   ├── User está en: escalationData.issueSection.approvers[]
   │   └── O User es: escalationData.issueSection.primary
   ├── Permisos Especiales:
   │   ├── Editar D1-D2-D3 en estado PENDING_APPROVAL
   │   ├── Aprobar reporte → Estado: APPROVED
   │   └── Rechazar reporte → Estado: REJECTED (con comentarios)
   └── Restricciones:
       └── Solo puede actuar cuando estado === PENDING_APPROVAL

3. ADMINISTRADOR DEL SISTEMA (System Admin)
   ├── Identificación:
   │   └── user.role === 'Administrador' || 'Admin'
   ├── Permisos Especiales:
   │   ├── **EDITAR TODO EN CUALQUIER ESTADO** (Override total)
   │   ├── Modificar estados manualmente
   │   └── Acceso sin restricciones
   └── Uso Recomendado:
       └── Solo para correcciones de emergencia o auditorías

4. OTROS USUARIOS (Viewers)
   ├── Permisos:
   │   └── Solo visualización (lectura)
   └── Restricciones:
       └── No pueden editar ni aprobar nunca
```

---

## 🔄 4. Diagrama de Secuencia - Flujo Completo

```
EMISOR          SISTEMA              APROBADOR           BASE DE DATOS
  │                │                     │                     │
  │─────1.Crear───▶│                     │                     │
  │    Reporte     │                     │                     │
  │                │─────INSERT──────────│────────────────────▶│
  │                │  (estado: draft)    │                     │
  │                │◀────Confirmación────────────────────────◀─│
  │◀───Formulario──│                     │                     │
  │   D1-D2-D3     │                     │                     │
  │                │                     │                     │
  │─────2.Llenar───│                     │                     │
  │    Campos      │                     │                     │
  │                │                     │                     │
  │──3.Presionar───│                     │                     │
  │  "Mandar a     │                     │                     │
  │   Aprobación"  │                     │                     │
  │                │─────UPDATE──────────│────────────────────▶│
  │                │  (estado:           │                     │
  │                │  pending_approval)  │                     │
  │                │                     │                     │
  │                │─────Notificación────▶│                     │
  │                │  "Nuevo reporte     │                     │
  │                │   por aprobar"      │                     │
  │                │                     │                     │
  │                │                     │──4.Revisar D1-D2-D3─│
  │                │                     │   (puede editar)    │
  │                │                     │                     │
  │                │                     │──5a.APROBAR?        │
  │                │                     │                     │
  │                │                     │─────UPDATE─────────▶│
  │                │                     │  (estado: approved) │
  │                │◀────Confirmación────────────────────────◀─│
  │◀───Notificación│                     │                     │
  │  "Aprobado"    │                     │                     │
  │                │                     │                     │
  │──6.Continuar───│                     │                     │
  │   con D4-D5-D6 │                     │                     │
  │                │                     │                     │
  │                │                     │──5b.RECHAZAR?       │
  │                │                     │  (+ comentarios)    │
  │                │                     │                     │
  │                │                     │─────UPDATE─────────▶│
  │                │                     │  (estado: rejected) │
  │                │◀────Confirmación────────────────────────◀─│
  │◀───Notificación│                     │                     │
  │  "Rechazado -  │                     │                     │
  │   ver comentarios"│                  │                     │
  │                │                     │                     │
  │──7.Corregir────│                     │                     │
  │   y Re-enviar  │                     │                     │
  │                │                     │                     │
  └────[Volver a paso 3]─────────────────┘                     │
```

---

## 🔧 5. Reglas de Negocio (Business Rules)

### 5.1 Transiciones de Estado PERMITIDAS

```
DRAFT             → PENDING_APPROVAL  ✅ (Emisor presiona botón)
PENDING_APPROVAL  → APPROVED          ✅ (Aprobador aprueba)
PENDING_APPROVAL  → REJECTED          ✅ (Aprobador rechaza)
REJECTED          → PENDING_APPROVAL  ✅ (Emisor corrige y re-envía)

DRAFT             → APPROVED          ❌ (Saltar aprobación)
APPROVED          → PENDING_APPROVAL  ❌ (Re-abrir aprobado)
APPROVED          → REJECTED          ❌ (Cambiar a rechazado)
REJECTED          → APPROVED          ❌ (Aprobar sin revisar)
```

### 5.2 Campos Bloqueados por Estado

#### Estado: DRAFT
```
✅ Emisor puede editar:
   - D1: Asignación de equipo (Issue, Countermeasure, Confirmation)
   - D2: Cliente, Proyecto, Partes, Descripción, Fotos, Documentos
   - D3: Detección, 5 Whys, Material sospechoso, Retrabajo
```

#### Estado: PENDING_APPROVAL
```
✅ Aprobadores pueden editar:
   - D1: Asignación de equipo (excepto Issue Primary - trazabilidad)
   - D2: Cliente, Proyecto, Partes, Descripción, Fotos, Documentos
   - D3: Detección, 5 Whys, Material sospechoso, Retrabajo

❌ Emisor: SOLO VISUALIZACIÓN (todos los campos bloqueados)
```

#### Estado: APPROVED
```
❌ Todos los campos BLOQUEADOS para todos
✅ Solo Administradores pueden editar (override)
```

#### Estado: REJECTED
```
✅ Emisor puede editar TODO nuevamente
❌ Aprobadores: Solo visualización
```

---

## 💾 6. Estructura de Datos - APROBACIÓN SECUENCIAL

### 6.1 Tabla: `eightd_reports` (ACTUALIZADA)

```sql
-- Campos relevantes para el sistema de aprobación SECUENCIAL
CREATE TABLE eightd_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) UNIQUE,
  created_by INTEGER REFERENCES users(id),

  -- Estado de aprobación D1-D2-D3 (General)
  d1_d2_d3_approval_status VARCHAR(50) DEFAULT 'draft',
    -- Valores: 'draft', 'pending_approval_1', 'pending_approval_2',
    --          'pending_approval_3', 'approved', 'rejected_by_a1',
    --          'rejected_by_a2', 'rejected_by_a3'

  -- Step actual en el flujo de aprobación
  current_approval_step INTEGER DEFAULT 0,
    -- 0 = draft, 1 = esperando A1, 2 = esperando A2, 3 = esperando A3,
    -- 4 = aprobado final

  -- Aprobación 1 (Aprobador 1)
  approval_1_status VARCHAR(20),     -- 'pending', 'approved', 'rejected'
  approval_1_by INTEGER REFERENCES users(id),
  approval_1_at TIMESTAMP,
  approval_1_comments TEXT,          -- Obligatorio si rejected

  -- Aprobación 2 (Aprobador 2)
  approval_2_status VARCHAR(20),     -- 'pending', 'approved', 'rejected'
  approval_2_by INTEGER REFERENCES users(id),
  approval_2_at TIMESTAMP,
  approval_2_comments TEXT,          -- Obligatorio si rejected

  -- Aprobación 3 (Aprobador 3)
  approval_3_status VARCHAR(20),     -- 'pending', 'approved', 'rejected'
  approval_3_by INTEGER REFERENCES users(id),
  approval_3_at TIMESTAMP,
  approval_3_comments TEXT,          -- Obligatorio si rejected

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Otros campos D1, D2, D3...
);
```

### 6.2 Script de Migración

```sql
-- Agregar columnas para aprobación secuencial
ALTER TABLE eightd_reports
  ADD COLUMN IF NOT EXISTS current_approval_step INTEGER DEFAULT 0,

  ADD COLUMN IF NOT EXISTS approval_1_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS approval_1_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_1_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approval_1_comments TEXT,

  ADD COLUMN IF NOT EXISTS approval_2_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS approval_2_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_2_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approval_2_comments TEXT,

  ADD COLUMN IF NOT EXISTS approval_3_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS approval_3_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_3_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approval_3_comments TEXT;

-- Comentarios explicativos
COMMENT ON COLUMN eightd_reports.current_approval_step IS
  '0=draft, 1=waiting A1, 2=waiting A2, 3=waiting A3, 4=fully approved';

COMMENT ON COLUMN eightd_reports.approval_1_comments IS
  'Required if approval_1_status = rejected';
COMMENT ON COLUMN eightd_reports.approval_2_comments IS
  'Required if approval_2_status = rejected';
COMMENT ON COLUMN eightd_reports.approval_3_comments IS
  'Required if approval_3_status = rejected';
```

### 6.2 Tabla: `users`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50), -- 'Administrador', 'Calidad', 'Ingeniero', etc.
  department VARCHAR(100),
  position VARCHAR(100)
);
```

### 6.3 Estructura JSON: Escalation Data

```javascript
{
  "issueSection": {
    "primary": {
      "id": 1,
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "Calidad",
      "department": "Quality Assurance"
    },
    "approvers": [
      { "id": 5, "firstName": "Ana", ... },  // Aprobador 1
      { "id": 8, "firstName": "Luis", ... }, // Aprobador 2
      null  // Aprobador 3 (opcional)
    ]
  },
  "countermeasureSection": { ... },
  "confirmationSection": { ... }
}
```

---

## 🎯 7. Casos de Uso Detallados

### Caso 1: Flujo Normal (Aprobación)
```
1. Emisor crea reporte → estado: DRAFT
2. Emisor llena D1-D2-D3
3. Emisor presiona "Mandar a Aprobación" → estado: PENDING_APPROVAL
4. Sistema notifica a aprobadores del Issue Card
5. Aprobador revisa, puede editar si necesita correcciones menores
6. Aprobador presiona "Aprobar" → estado: APPROVED
7. Emisor recibe notificación "Aprobado"
8. Emisor continúa con D4-D5-D6
```

### Caso 2: Flujo con Rechazo
```
1-4. (Igual que Caso 1)
5. Aprobador encuentra problemas serios
6. Aprobador ingresa comentarios explicando el rechazo
7. Aprobador presiona "Rechazar" → estado: REJECTED
8. Emisor recibe notificación "Rechazado - ver comentarios"
9. Emisor lee comentarios
10. Emisor edita D1-D2-D3 para corregir
11. Emisor presiona "Mandar a Aprobación" nuevamente → PENDING_APPROVAL
12. (Volver al paso 5 del Caso 1)
```

### Caso 3: Intervención de Administrador
```
1. Reporte está en estado APPROVED
2. Cliente solicita cambio urgente en datos
3. Administrador del sistema ingresa al reporte
4. Administrador tiene permiso para editar (override)
5. Administrador realiza el cambio
6. Sistema registra el cambio con usuario_id del admin
7. Estado permanece APPROVED (o admin puede cambiarlo si es necesario)
```

---

## ⚠️ 8. Validaciones del Sistema

### Frontend (TeamAssignmentTab.js)
```javascript
// Función de validación de bloqueo
const isD123Locked = () => {
  // 1. Administrador SIEMPRE puede editar
  if (currentUser?.role === 'Administrador') return false;

  // 2. Verificar estado de aprobación
  const status = data.d1D2D3ApprovalStatus;

  // 3. Aplicar reglas por estado
  switch(status) {
    case 'draft':
      return currentUserId !== reportCreatorId;

    case 'pending_approval':
      const isApprover = /* check if user in Issue Card */;
      return !isApprover; // Bloquear si NO es aprobador

    case 'approved':
      return true; // Todos bloqueados (excepto admins ya checados)

    case 'rejected':
      return currentUserId !== reportCreatorId;

    default:
      return false;
  }
};
```

### Backend (eightDEndpoints.js)
```javascript
// TODO: Implementar validación en el backend
async function updateEightDReport(req, res) {
  // 1. Obtener reporte actual de la BD
  const report = await getReport(reportId);

  // 2. Validar permisos según estado
  const canEdit = validateEditPermission(
    req.user,
    report.d1_d2_d3_approval_status,
    report.created_by
  );

  if (!canEdit) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para editar este reporte en su estado actual'
    });
  }

  // 3. Proceder con actualización...
}
```

---

## 📝 9. Pendientes de Implementación

### ✅ Completado
- [x] Columna `d1_d2_d3_approval_status` en BD
- [x] Función `isD123Locked()` en frontend
- [x] Aplicar `disabled` a todos los campos D1-D2-D3
- [x] Botón "Mandar a Aprobación" cambia estado a `pending_approval`
- [x] Lógica de permisos para Administrador

### 🔄 En Proceso / Pendientes
- [ ] **Sistema de Aprobación/Rechazo para Aprobadores**
  - [ ] Botones "Aprobar" y "Rechazar" (solo visibles para aprobadores)
  - [ ] Campo de comentarios para rechazo
  - [ ] Endpoint backend: `POST /8d/reports/:id/approve`
  - [ ] Endpoint backend: `POST /8d/reports/:id/reject`

- [ ] **Sistema de Notificaciones**
  - [ ] Notificar aprobadores cuando estado → `pending_approval`
  - [ ] Notificar emisor cuando estado → `approved`
  - [ ] Notificar emisor cuando estado → `rejected`

- [ ] **Historial de Aprobaciones**
  - [ ] Tabla `approval_history`
  - [ ] Registrar quién aprobó/rechazó y cuándo
  - [ ] Mostrar historial en el reporte

- [ ] **Validaciones Backend**
  - [ ] Validar permisos antes de permitir UPDATE
  - [ ] Validar transiciones de estado válidas
  - [ ] Evitar bypass de frontend

---

## 📧 10. Sistema de Notificaciones (Email + In-App)

### 10.1 Eventos que Disparan Notificaciones

| Evento | Destinatario | Tipo | Contenido |
|--------|--------------|------|-----------|
| **Emisor envía a aprobación** | Aprobador 1 | Email + In-App | "Nuevo reporte 8D #{id} requiere tu aprobación" |
| **Aprobador 1 aprueba** | Aprobador 2 | Email + In-App | "Reporte 8D #{id} aprobado por A1, requiere tu revisión" |
| **Aprobador 2 aprueba** | Aprobador 3 | Email + In-App | "Reporte 8D #{id} aprobado por A1 y A2, requiere tu aprobación final" |
| **Aprobador 3 aprueba** | Emisor | Email + In-App | "✅ Reporte 8D #{id} APROBADO - Puedes continuar con D4-D5-D6" |
| **Aprobador 1 rechaza** | Emisor | Email + In-App | "❌ Reporte 8D #{id} rechazado - Ver comentarios y corregir" |
| **Aprobador 2 rechaza** | Aprobador 1 | Email + In-App | "❌ Reporte 8D #{id} rechazado por A2 - Re-revisar" |
| **Aprobador 3 rechaza** | Aprobador 2 | Email + In-App | "❌ Reporte 8D #{id} rechazado por A3 - Re-revisar" |

### 10.2 Estructura de Tabla `notifications`

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),        -- A quién va dirigida
  report_id INTEGER REFERENCES eightd_reports(id),
  type VARCHAR(50),                            -- 'approval_request', 'approved', 'rejected'
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(255),                           -- URL al reporte
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 10.3 Template de Email

```html
<!-- Ejemplo: Solicitud de Aprobación -->
Subject: [8D] Reporte #{report_id} requiere tu aprobación

Hola {approver_name},

Se te ha asignado un nuevo reporte 8D para aprobar:

📋 Reporte: {report_id}
📝 Título: {problem_title}
⚠️ Severidad: {severity}
👤 Emisor: {creator_name}
📅 Fecha: {issue_date}

Eres el Aprobador {step} en la cadena de aprobación.

[VER Y APROBAR REPORTE]

---
Quality Alert System
```

## 🔍 11. Preguntas de Diseño RESUELTAS ✅

### 11.1 Aprobación
- ✅ **¿Se requiere aprobación de TODOS los aprobadores o solo uno?**
  - **RESPUESTA**: TODOS los aprobadores deben aprobar (más seguro)

- ✅ **¿Qué pasa si hay múltiples aprobadores y uno aprueba pero otro rechaza?**
  - **RESPUESTA**: Flujo secuencial 1→2→3. No puede haber conflicto.

- ✅ **Orden de aprobación**
  - **RESPUESTA**: Izquierda a derecha (Aprobador 1 → 2 → 3)

- ✅ **¿Qué pasa cuando se rechaza?**
  - **RESPUESTA**: Regresa al ANTERIOR con comentario obligatorio
    - A1 rechaza → Emisor
    - A2 rechaza → Aprobador 1
    - A3 rechaza → Aprobador 2

### 11.2 Notificaciones
- ✅ **¿Cómo notificar?**
  - **RESPUESTA**: Email + In-App (ambos)

### 11.3 Auditoría
- ⏳ **Pendiente**: Definir si se requiere audit log completo de cambios

---

## 📚 Referencias

- **Código fuente:**
  - `frontend/src/components/8D/TeamAssignmentTab.js` (líneas 114-163)
  - `backend/endpoints/eightDEndpoints.js`
  - `backend/add_d123_approval_status.js`

- **Metodología 8D:**
  - D1-D2-D3: Fase de Calidad (Issue Card)
  - D4-D5-D6: Fase de Responsable (Countermeasure Card)
  - D7-D8: Fase de Auditoría (Confirmation Card)

---

**Última actualización:** 2025-01-22
**Autor:** Sistema de Documentación 8D
**Versión:** 1.0
