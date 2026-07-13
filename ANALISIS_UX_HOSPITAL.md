# Análisis UX - Hospital de Defectos
## Estructura Actual vs Propuesta de Mejora

---

## DIAGRAMA DE ESCALERA - ESTRUCTURA ACTUAL

```
HOSPITAL DE DEFECTOS (DefectHospital.js)
│
├── TAB: General (527)
│   ├── Vista: TODOS los defectos sin filtro de status
│   ├── Paginación: 50/100/200/500 por página
│   ├── Filtros: búsqueda, status, tipo, fecha
│   └── Acciones: Ninguna directa (solo visualización)
│
├── TAB: To Repair (146)
│   ├── SUB-TAB: Need Location (sin ubicación asignada)
│   │   ├── Acciones por defecto:
│   │   │   ├── [Asignar Location] → Modal selector de ubicación
│   │   │   └── [Cuarentena] → Envía a MRB directo (sin location)
│   │   └── Acción masiva: Asignar ubicación a múltiples
│   │
│   └── SUB-TAB: Ready to Repair (con ubicación)
│       └── Acciones por defecto:
│           ├── [Iniciar Reparación] → Cambia status a IN_REPAIR
│           └── [Cuarentena] → Envía a MRB
│
├── TAB: In Repair (96)
│   ├── Vista: Defectos en status IN_REPAIR
│   └── Acciones por defecto:
│       ├── [Completar] → Modal con Root Cause, acción, notas
│       │   ├── Opción: Reparado → Status REPAIRED
│       │   ├── Opción: Vincular Desviación
│       │   └── Opción: Reasignar área
│       ├── [Scrap] → Envía directo a SCRAPPED
│       └── [Iniciar] (si no iniciado) → Inicia timer
│
├── TAB: Pending Handoff (106) ⚠️ CONFUSO
│   ├── Vista: Defectos en status REPAIRED
│   ├── Problema: Usuario debe elegir destino aquí
│   └── Acciones MASIVAS (botones arriba):
│       ├── [Calidad (QA)] → Modal selector estación QA
│       ├── [Scrap] → Modal (NUEVO: selector location MRB)
│       └── [Cuarentena (MRB)] → Modal (NUEVO: selector location MRB)
│
├── TAB: Releases (25) - Solo modo liberador
│   ├── Vista: Defectos en IN_VALIDATION
│   └── Acciones por defecto:
│       ├── [Liberar] → Cambia a RELEASED/CLOSED
│       └── [Rechazar] → Modal con destino:
│           ├── Regresar a Reparación
│           ├── Enviar a Scrap
│           └── Enviar a Cuarentena
│
├── TAB: MRB (99) ⚠️ DUPLICADO/CONFUSO
│   ├── SUB-TAB: Quarantine (35)
│   │   ├── Vista: Defectos en QUARANTINE
│   │   └── Acciones masivas:
│   │       ├── [Return to Repair] → Regresa a OPEN
│   │       ├── [Send to Scrap] → Cambia a SCRAPPED
│   │       └── [Release with Deviation] → Libera con desviación
│   │
│   └── SUB-TAB: Scrap (64)
│       ├── Vista: Defectos en SCRAPPED (no confirmados)
│       └── Acciones masivas:
│           ├── [Confirm Scrap] → Confirma definitivamente
│           └── [Return to Quarantine] → Regresa a QUARANTINE
│
├── TAB: WIP (0)
│   └── Vista: Work In Progress por ubicación física
│
├── TAB: Traceability
│   └── Vista: Historial de un serial específico
│
└── TAB: Deviations (2) - Solo si tiene permisos
    └── Gestión de desviaciones activas/cerradas
```

---

## PROBLEMAS IDENTIFICADOS

### 1. DUPLICACIÓN DE FUNCIONES
| Función | Ubicación 1 | Ubicación 2 | Ubicación 3 |
|---------|-------------|-------------|-------------|
| Enviar a Scrap | In Repair (botón) | Pending Handoff (masivo) | MRB > Quarantine |
| Enviar a Cuarentena | To Repair | Pending Handoff | Releases > Reject |
| Regresar a Reparación | MRB > Quarantine | - | - |

### 2. FLUJO NO LINEAL
El usuario debe "adivinar" en qué tab está cada acción:
- ¿Dónde envío a Scrap? → 3 lugares diferentes
- ¿Dónde mando a MRB? → 2 lugares diferentes
- ¿Dónde confirmo Scrap? → Solo en MRB > Scrap

### 3. PENDING HANDOFF ES CONFUSO
- Nombre poco claro ("Handoff" no es intuitivo)
- Es un paso intermedio obligatorio antes de QA/Scrap/MRB
- Rompe el flujo de trabajo

### 4. TAB MRB AISLADO
- Las funciones de MRB están separadas del flujo principal
- El usuario debe cambiar de tab para gestionar cuarentena/scrap
- No hay visibilidad de MRB desde otros tabs

---

## FLUJO DE ESTADOS (Referencia)

```
┌──────────────────────────────────────────────────────────────────┐
│                         FLUJO PRINCIPAL                          │
└──────────────────────────────────────────────────────────────────┘

  OPEN ──────► IN_REPAIR ──────► REPAIRED ──────► IN_VALIDATION ──────► RELEASED/CLOSED
    │              │                 │                  │
    │              │                 │                  │
    ▼              ▼                 ▼                  ▼
QUARANTINE ◄───────┴─────────────────┴──────────────────┘
    │                                                   (Reject)
    │
    ▼
 SCRAPPED ──────► SCRAP_CONFIRMED (final)
```

---

## PROPUESTA A: FLUJO LINEAL SIMPLIFICADO

```
HOSPITAL DE DEFECTOS (Propuesta A)
│
├── TAB: Dashboard
│   └── Vista general con métricas y accesos rápidos
│
├── TAB: Pendientes (OPEN + sin ubicación)
│   └── Acción: Asignar ubicación → pasa a "Listos"
│
├── TAB: Listos para Reparar (con ubicación)
│   └── Acción: Iniciar reparación → pasa a "En Reparación"
│
├── TAB: En Reparación (IN_REPAIR)
│   └── Acciones:
│       ├── Completar → pasa a "Para Validar"
│       ├── Scrap → pasa a "MRB/Scrap"
│       └── Cuarentena → pasa a "MRB/Scrap"
│
├── TAB: Para Validar (REPAIRED + IN_VALIDATION)
│   ├── REPAIRED: Acciones de handoff integradas aquí
│   │   └── [Enviar a QA] / [Enviar a MRB] / [Enviar a Scrap]
│   └── IN_VALIDATION: Acciones de liberador
│       └── [Liberar] / [Rechazar]
│
├── TAB: MRB & Scrap (QUARANTINE + SCRAPPED)
│   ├── Vista unificada con filtro de status
│   └── Todas las acciones de MRB en un solo lugar
│
└── TAB: Historial / Trazabilidad
    └── Búsqueda y consulta
```

---

## PROPUESTA B: VISTA UNIFICADA CON FILTROS

```
HOSPITAL DE DEFECTOS (Propuesta B)
│
├── BARRA LATERAL: Filtros de Status (como checkboxes)
│   ├── □ OPEN (133)
│   ├── □ IN_REPAIR (96)
│   ├── □ REPAIRED (106)
│   ├── □ IN_VALIDATION (25)
│   ├── □ QUARANTINE (35)
│   ├── □ SCRAPPED (64)
│   ├── □ RELEASED (60)
│   └── □ CLOSED (2)
│
├── VISTA PRINCIPAL: Tabla de defectos filtrados
│   └── Acciones contextuales según status del defecto
│
├── PANEL LATERAL: Detalle del defecto seleccionado
│   └── Todas las acciones disponibles para ese defecto
│
└── MODALES: Para acciones que requieren input adicional
```

---

## COMPARACIÓN

| Aspecto | Actual | Propuesta A | Propuesta B |
|---------|--------|-------------|-------------|
| Tabs | 9 tabs + sub-tabs | 6 tabs simples | 1 vista + filtros |
| Curva aprendizaje | Alta | Media | Baja |
| Clicks para acción | 3-5 | 2-3 | 1-2 |
| Duplicación funciones | Alta | Ninguna | Ninguna |
| Complejidad código | Alta | Media | Media-Alta |
| Refactor necesario | - | Moderado | Significativo |

---

## RECOMENDACIÓN

**Propuesta A** es más práctica porque:
1. Mantiene la estructura de tabs (familiar para usuarios)
2. Reduce de 9 a 6 tabs
3. Elimina duplicación de funciones
4. Flujo más lineal e intuitivo
5. Refactor moderado (no reescritura total)

**Propuesta B** es ideal a largo plazo pero requiere:
1. Rediseño completo de UI
2. Mayor tiempo de desarrollo
3. Reentrenamiento de usuarios

---

## ACCIONES INMEDIATAS SUGERIDAS

1. **Renombrar "Pending Handoff" → "Para Validar"** (o "Reparados")
2. **Integrar acciones de handoff en el mismo tab** (no modal separado)
3. **Unificar MRB & Scrap** en un solo tab con filtro
4. **Eliminar botón Scrap de "In Repair"** (redundante)
5. **Agregar breadcrumb visual** del flujo de estados

---

*Documento generado para análisis UX - Junio 2026*


PROPUESTA CHAT GTP:
# PROPUESTA UX - HOSPITAL DE DEFECTOS (V2)

OBJETIVO

Mantener el flujo operativo actual del Hospital de Defectos, pero eliminar la dispersión de acciones entre diferentes tabs.

Actualmente el usuario debe recordar en qué tab existe cada acción, cuando en realidad debería poder realizar cualquier acción válida desde cualquier vista.

El Hospital debe organizar el trabajo, no esconder las funciones.

--------------------------------------------------------------------------------

PROBLEMA ACTUAL

La navegación está basada en estados.

OPEN
IN_REPAIR
REPAIRED
IN_VALIDATION
MRB
SCRAP

Pero las acciones quedaron repartidas.

Ejemplo:

- Cambiar Responsable → solo en algunos tabs
- Asignar Desviación → solo en algunos tabs
- Scrap → aparece en varios lugares
- MRB → aparece en varios lugares
- Assign Location → únicamente en ciertos estados

El usuario termina preguntándose:

"¿Dónde estaba ese botón?"

Eso genera carga cognitiva innecesaria.

--------------------------------------------------------------------------------

PROPUESTA

Mantener los tabs para separar el trabajo.

Pero TODAS las acciones vivirán siempre en la misma Action Bar.

La Action Bar será inteligente.

No depende del tab.

Depende de:

• Estado
• Permisos
• Tipo de defecto
• Selección realizada
• Reglas del negocio

--------------------------------------------------------------------------------

DIAGRAMA DE ESCALERA PROPUESTO

HOSPITAL DE DEFECTOS

│
├── Dashboard
│     ├── KPIs
│     ├── Carga por área
│     ├── Aging
│     ├── Prioridades
│     └── Accesos rápidos
│
├── General
│     └── Todos los defectos
│
├── To Repair
│     └── Defectos pendientes de reparación
│
├── In Repair
│     └── Defectos en reparación
│
├── Ready for Validation
│     └── Esperando QA / Liberación
│
├── MRB
│     ├── Quarantine
│     └── Scrap
│
├── Traceability
│
└── Deviations

================================================================================

AL SELECCIONAR UNO O MÁS REGISTROS

                ▼

┌───────────────────────────────────────────────────────────────┐
│                                                               │
│          15 Defects Selected                                  │
│                                                               │
│  Workflow ▼     Management ▼      Tools ▼                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

================================================================================

WORKFLOW

Acciones que modifican el flujo del defecto.

El sistema únicamente muestra las acciones válidas.

Ejemplos:

• Start Repair
• Complete Repair
• Send to QA
• Release
• Release with Deviation
• Send to MRB
• Send to Scrap
• Confirm Scrap
• Return to Repair

Ejemplo:

OPEN

↓

Acciones disponibles

✓ Start Repair

✓ Send to MRB

✓ Release with Deviation

✓ Send to Scrap

No aparece Confirm Scrap porque no aplica.

--------------------------------------------------------------------------------

SCRAPPED

↓

Acciones disponibles

✓ Confirm Scrap

✓ Return to MRB

No aparece Start Repair porque no aplica.

================================================================================

MANAGEMENT

Acciones administrativas.

Estas deberían estar disponibles prácticamente desde cualquier tab.

• Assign Area
• Assign Location
• Change Responsible
• Assign Deviation
• Assign Priority
• Print Labels
• Add Comments
• Attach Evidence

Estas acciones NO cambian el flujo.

Únicamente administran la pieza.

================================================================================

TOOLS

Herramientas de consulta.

• Open Traceability
• View Pictures
• View Specifications
• Open ECR
• Open 8D
• Cost Analysis

================================================================================

OPERACIONES MASIVAS

Las operaciones Batch son una de las mayores fortalezas del sistema.

Se recomienda mantenerlas para:

✓ Assign Area

✓ Assign Location

✓ Change Responsible

✓ Assign Deviation

✓ Send to QA

✓ Send to MRB

✓ Release

✓ Print Labels

================================================================================

BENEFICIOS

ANTES

Tab

↓

Buscar botón

↓

Cambiar de Tab

↓

Buscar otro botón

↓

Realizar acción

================================================================================

PROPUESTA

Entrar a cualquier Tab

↓

Seleccionar piezas

↓

Action Bar

↓

Workflow / Management / Tools

↓

Ejecutar acción

================================================================================

FILOSOFÍA

Los Tabs representan el trabajo.

La Action Bar representa las acciones.

Los estados siguen existiendo para la lógica del sistema.

El usuario únicamente ve las acciones que puede ejecutar.

No necesita aprender dónde vive cada botón.

El sistema decide automáticamente qué acciones mostrar según las reglas del negocio.

Esto hace que el Hospital sea mucho más intuitivo, reduce la curva de aprendizaje y facilita agregar nuevos procesos en el futuro sin modificar la navegación.
Hay una idea adicional que considero muy potente para un software de manufactura: cuando el usuario seleccione registros, la Action Bar podría cambiar dinámicamente y mostrar únicamente las acciones válidas. Esto hace que la interfaz "guíe" al usuario. Si selecciona piezas OPEN, verá "Start Repair", "Release with Deviation", "Send to MRB". Si selecciona piezas SCRAPPED, automáticamente cambiará a "Confirm Scrap" o "Return to MRB". El usuario deja de pensar "¿qué puedo hacer aquí?" y el sistema se lo indica. Creo que ese comportamiento le daría a tu plataforma una sensación muy profesional y coherente.
