# Release OK - Estación Final de Liberación

## Fecha: 2026-07-29

## Propósito

Estación mandatoria del sistema que marca el cierre del ciclo de calidad para cada parte/serial.

## Diseño

### Flujo

```
Serial llega a RELEASE_OK
    ↓
Sistema valida automáticamente:
    ├─ ¿Defectos abiertos? → count(repair_status = 'OPEN')
    └─ ¿Specs NOK? → count(result = 'NOK')
    ↓
┌─────────────────────────────────────────────────────┐
│ TODO OK (0 defectos + 0 specs NOK)                  │
│ → Botón verde "Liberar"                             │
│ → Parte queda RELEASED + is_archived = true         │
└─────────────────────────────────────────────────────┘
    ó
┌─────────────────────────────────────────────────────┐
│ BLOQUEO (defectos abiertos o specs NOK)             │
│ → Lista de bloqueos visible                         │
│ → Botón "Ir a Hospital"                             │
│ → NO hay override, NO hay excepciones               │
└─────────────────────────────────────────────────────┘
```

### Principios

1. **Sin fuga de defectos**: No hay override para liberar con defectos
2. **Sin excepciones**: Las desviaciones se manejan en Hospital, no aquí
3. **Trazabilidad completa**: Se registra quién liberó y cuándo
4. **Archivado automático**: Parte liberada pasa a solo lectura

## Implementación

### Base de Datos

**Migración**: `115_release_ok_station.sql`

#### Cambios en `inspection_stations`:
- `is_system BOOLEAN` - Marca estaciones del sistema (no editables)
- Estación RELEASE_OK creada automáticamente (global)
- Trigger protege estaciones del sistema de edición/borrado

#### Cambios en `unit_registry`:
- `is_archived BOOLEAN` - Parte cerró ciclo de calidad
- `archived_at TIMESTAMP` - Cuándo se archivó
- `released_by INTEGER` - Quién liberó

#### Función PostgreSQL:
- `release_unit(unit_id, user_id)` - Ejecuta liberación con validaciones

#### Vista:
- `v_ready_for_release` - Partes listas para liberar

### Backend

**Archivo**: `endpoints/releaseOkEndpoints.js`

#### Endpoints:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/release-ok/station` | Info de estación RELEASE_OK |
| GET | `/release-ok/validate/:serial` | Validar si puede liberar |
| POST | `/release-ok/release` | Ejecutar liberación |
| GET | `/release-ok/pending/:clientId` | Listar unidades pendientes |
| GET | `/release-ok/history/:clientId` | Historial de liberaciones |

### Frontend

**Archivo**: `pages/ReleaseOK.js`

#### Características:
- Input de serial con auto-focus
- Validación automática al buscar
- Semáforo visual (verde=OK, rojo=bloqueado)
- Lista de bloqueos con detalle
- Botón "Ir a Hospital" si hay bloqueos
- Historial de liberaciones recientes
- Stats del día (liberados/bloqueados)

**Ruta**: `/release-ok`

## Estados de Parte

| Estado | Significado |
|--------|-------------|
| `REGISTERED` | Recién registrada |
| `INSPECTING` | En proceso de inspección |
| `OK` | Inspección sin defectos |
| `DEFECTIVE` | Con defectos detectados |
| `IN_REPAIR` | En reparación (Hospital) |
| `REPAIRED` | Reparada, pendiente liberación |
| `RELEASED` | **Liberada en RELEASE_OK** |
| `SCRAPPED` | Desechada |

## Archivado

Cuando una parte se libera:
1. `current_status = 'RELEASED'`
2. `is_archived = true`
3. `archived_at = CURRENT_TIMESTAMP`
4. `released_by = user_id`

Partes archivadas:
- No aparecen en listas activas
- Solo se consultan para trazabilidad/auditoría
- Son de solo lectura

## Validaciones

La liberación SOLO es posible si:
1. `open_defects = 0` (todos los defectos cerrados)
2. `specs_nok = 0` (todas las specs OK)

Si alguna condición falla:
- Se muestra lista de bloqueos
- Se ofrece ir a Hospital
- **NO hay bypass posible**

## Auditoría ISO

Cumple con:
- ISO 9001:2015 - 8.6 (Liberación de productos)
- IATF 16949 - 8.6.1 (Verificación de requisitos)
- Trazabilidad completa de quién/cuándo/qué
