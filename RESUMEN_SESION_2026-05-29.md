# Resumen de Sesión - 29 de Mayo 2026

## LOGROS PRINCIPALES

### 1. Congelamiento de Nombres de Usuario en ECR

**Problema identificado**: Cuando un ECR se cierra, los nombres de usuarios (TFT, Review Board) se obtenían dinámicamente de la base de datos. Si un usuario cambiaba de departamento o era eliminado, los ECRs cerrados perdían la información histórica de quién participó.

**Solución implementada**: Los nombres de usuario ahora se guardan congelados junto con el ID al momento de asignar el equipo.

#### Cambios en `ECRTeamTab.js`:

1. **`handlePrimaryChange`**: Ahora guarda objeto `{id, name}` en lugar de solo ID
2. **`handleMemberToggle`**: Guarda miembros como `{id: X, name: "Nombre Completo"}`
3. **`handleTeamMemberToggle`**: Ya estaba corregido para `validationTeams`
4. **Helper `isReviewBoardMember()`**: Verifica membresía compatible con ambos formatos
5. **Select de Primary**: Compatible con formato antiguo (ID) y nuevo (objeto)
6. **Grid de checkboxes**: Usa helper para verificar selección

### 2. Modo Solo Lectura para Registros Cerrados

**Implementado en**: ECR, 8D, QAR

Cuando un registro está cerrado:
- Se muestra banner amarillo "🔒 Este [módulo] está cerrado y es de solo lectura"
- Todos los inputs/botones se deshabilitan (`pointerEvents: 'none'`, `opacity: 0.7`)
- Navegación entre secciones/etapas sigue funcionando
- Los modales siguen siendo interactivos (para cerrarlos)

#### Archivos modificados - ECR:
| Archivo | Cambios |
|---------|---------|
| `pages/ECRWorkflow.js` | `isReadOnly` prop, navegación libre cuando cerrado, `isECRLocked()` incluye closed/closed_rejected |
| `components/ECR/ECRTeamTab.js` | Banner + wrapper read-only |
| `components/ECR/ECRChangeRequest.js` | Banner + wrapper read-only |
| `components/ECR/ECRImpactAnalysis.js` | Banner + wrapper read-only |
| `components/ECR/ECRValidationPlan.js` | Banner + wrapper read-only |
| `components/ECR/ECRClosure.js` | Banner + wrapper read-only |

#### Archivos modificados - 8D:
| Archivo | Cambios |
|---------|---------|
| `pages/8DWorkflow.js` | `isReadOnly` prop, navegación libre cuando cerrado |
| `components/8D/TeamAssignmentTab.js` | Banner + wrapper read-only |
| `components/8D/D3MFG.js` | Banner + wrapper read-only |
| `components/8D/D4ContainmentRootCause.js` | Banner + wrapper read-only |
| `components/8D/D5CorrectiveActions.js` | Banner + wrapper read-only |
| `components/8D/D5D6D7Countermeasures.js` | Banner + wrapper read-only |
| `components/8D/D8FollowUpEvidence.js` | Banner + wrapper read-only |

#### Archivos modificados - QAR:
| Archivo | Cambios |
|---------|---------|
| `pages/QARDetail.js` | Banner read-only (las secciones ya se ocultan por status) |

### 3. Scripts de Migración

- `backend/scripts/migrate_team_names.js` - Migra `review_board` y `validation_teams`
- `backend/scripts/migrate_validation_teams.js` - Migra solo `validation_teams`

---

## ESTRUCTURA DE DATOS CONGELADOS

### Ejemplo ECR con datos congelados:
```javascript
{
  reviewBoard: {
    primary: { id: 1, name: "Adrian Salazar" },
    members: [
      { id: 7, name: "John Quality" },
      { id: 2, name: "Robert Robert" }
    ]
  },
  validationTeams: {
    "Design/Engineering": [
      { id: 2, name: "Robert Robert" }
    ],
    "Quality": [
      { id: 7, name: "John Quality" }
    ]
  }
}
```

---

## REGLA DE NEGOCIO: CONGELAMIENTO DE USUARIOS

**Todos los campos que referencian usuarios deben guardar tanto el ID como el nombre** para preservar la información histórica.

### Compatibilidad hacia atrás
- **Formato antiguo**: `[1, 2, 3]` (solo IDs)
- **Formato nuevo**: `[{id: 1, name: "..."}, {id: 2, name: "..."}]`

---

## CONGELAMIENTO DE USUARIOS EN 8D (IMPLEMENTADO)

### Archivos modificados:

| Archivo | Cambios |
|---------|---------|
| `pages/8DWorkflow.js` | `getSectionUserData()` retorna `{id, name}`, actualizado `handleDataUpdate` para guardar nombres congelados, `isCountermeasureResponsible()` compatible con ambos formatos |
| `components/8D/TeamAssignmentTab.js` | `findUserById()` compatible con objetos y IDs |
| `components/8D/D3MFG.js` | `addResponsibleUser()`, `loadDistributionList()` guardan objetos con nombres, display compatible |
| `components/8D/D4ContainmentRootCause.js` | `isCurrentApprover()`, `isPrimaryUser()`, `currentUserInProcess`, `getUserInfo()` compatibles |
| `components/8D/D5CorrectiveActions.js` | `isCurrentApprover()`, `isPrimaryUser()`, `currentUserInProcess` compatibles |
| `components/8D/D5D6D7Countermeasures.js` | `isCurrentApproverD6()`, `isPrimaryUserD6()`, `isAuthorizedForD7()` compatibles |
| `components/8D/D8FollowUpEvidence.js` | `getUserInfo()` compatible con ambos formatos |

### Estructura del escalation_path congelado:
```javascript
{
  issue_users: [
    { id: 1, name: "Adrian Salazar" },
    { id: 2, name: "John Quality" }
  ],
  countermeasure_users: [
    { id: 3, name: "Maria Eng" },
    { id: 4, name: "Carlos Prod" }
  ],
  confirmation_users: [
    { id: 5, name: "Luis QA" },
    { id: 6, name: "Ana Audit" }
  ]
}
```

---

## CONGELAMIENTO DE USUARIOS EN QAR (IMPLEMENTADO)

### Migración creada:
- `backend/migrations/030_qar_frozen_names.sql`

### Columnas agregadas:
| Tabla | Columnas |
|-------|----------|
| `quality_alerts` | `reported_by_name`, `assigned_to_name`, `responded_by_name`, `validated_by_name` |
| `qar_recipients` | `user_name` |
| `qar_comments` | `user_name` |

### Backend actualizado:
- `backend/endpoints/qarEndpoints.js`:
  - Helper `getUserFrozenName()` agregado
  - CREATE QAR guarda nombres congelados
  - Recipients guardan `user_name`
  - Comentarios guardan `user_name`
  - Validación guarda `validated_by_name`
  - Consultas usan `COALESCE(frozen_name, joined_name)`

---

## PENDIENTES: APLICAR CONGELAMIENTO EN OTROS MÓDULOS

| Módulo | Campos con usuarios |
|--------|---------------------|
| **Auditorías** | Auditores, auditados, testigos, responsables de acciones |
| **MRB** | Review board members, inspectors, disposition approvers |
| **Hospital de Defectos** | Reportador, técnico asignado, supervisor, QA |

**Patrón a seguir**:
1. Al asignar usuario: guardar `{id: X, name: "Nombre Completo"}`
2. Al mostrar: usar `member.name` si es objeto, o buscar en users si es ID legacy
3. Scripts de migración para datos existentes

---

## COMPLETADOS HOY

- [x] Congelamiento de nombres TFT en ECR
- [x] Modo solo lectura ECR cerrados
- [x] Modo solo lectura 8D cerrados
- [x] Modo solo lectura QAR cerrados
- [x] Navegación libre en registros cerrados
- [x] **Congelamiento de usuarios en 8D** (escalation_path, D3-MFG responsible users)
- [x] **Congelamiento de usuarios en QAR** (reported_by, assigned_to, validated_by, recipients, comments)
- [x] **Sistema de traducción para ECR** (inglés/español)

---

## PENDIENTES PARA PRÓXIMAS SESIONES

### Alta Prioridad
- [ ] Aplicar congelamiento de usuarios en **Auditorías**
- [ ] Aplicar congelamiento de usuarios en **MRB**
- [ ] Aplicar congelamiento de usuarios en **Hospital de Defectos**
- [ ] **Ejecutar migración 030_qar_frozen_names.sql** en base de datos
- [ ] Script de migración para 8D existentes

### Otros Módulos
- [ ] Statistical Tools
- [ ] Work Instructions
- [ ] Management Review

---

## NOTAS TÉCNICAS

### Status que activan modo solo lectura:
- **ECR**: `closed`, `closed_rejected`
- **8D**: `closed`
- **QAR**: `CERRADO`

### Patrón de implementación read-only:
```javascript
// En el componente principal (Workflow)
isReadOnly={workflowData?.status === 'closed'}

// En cada componente hijo
{isReadOnly && (
  <div style={{ backgroundColor: '#fef3c7', ... }}>
    🔒 Este [módulo] está cerrado y es de solo lectura
  </div>
)}

<div style={{
  pointerEvents: isReadOnly ? 'none' : 'auto',
  opacity: isReadOnly ? 0.7 : 1
}}>
  {/* Contenido del formulario */}
</div>
```

### Puertos
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

---

## RESUMEN EJECUTIVO

Sesión enfocada en dos mejoras principales:

1. **Congelamiento de nombres de usuario** en ECR para preservar datos históricos
2. **Modo solo lectura** para ECR, 8D y QAR cerrados

Los registros cerrados ahora muestran un banner amarillo y deshabilitan todas las interacciones mientras permiten navegar libremente para consulta.

**Regla crítica pendiente**: Aplicar congelamiento de usuarios en 8D, Auditorías, MRB y Hospital de Defectos.
