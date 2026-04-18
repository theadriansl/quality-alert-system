# Resumen de Sesión - 2026-02-08

## Objetivo
Vincular el módulo MRB a QAR o 8D existentes, heredando datos base y agregando campos propios de operación MRB.

---

## Cambios Implementados

### 1. Base de Datos - Migración SQL

**Archivo:** `backend/migrations/017_add_mrb_source_fields.sql`

**Columnas agregadas a `mrb_campaigns`:**
- `source_type` (VARCHAR) - 'QAR' o '8D'
- `source_qar_id` (INTEGER) - FK a `quality_alerts`
- `source_8d_id` (INTEGER) - FK a `eightd_reports`
- `qty_inspected` (INTEGER) - Cantidad inspeccionada
- `qty_ok` (INTEGER) - Cantidad OK
- `qty_nok` (INTEGER) - Cantidad NOK
- `scrap_cost` (DECIMAL) - Costo de scrap
- `labor_cost` (DECIMAL) - Costo de personal
- `inspector_count` (INTEGER) - Número de inspectores
- `supervisor_count` (INTEGER) - Número de supervisores por turno

**Índices creados:**
- `idx_mrb_campaigns_source_type`
- `idx_mrb_campaigns_source_qar_id`
- `idx_mrb_campaigns_source_8d_id`

---

### 2. Backend - Endpoints Modificados

**Archivo:** `backend/endpoints/mrbEndpoints.js`

#### Nuevos Endpoints:
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/mrb/sources` | Lista QARs y 8Ds disponibles para vincular |
| PUT | `/mrb/:id/source` | Cambia el origen de un MRB (solo si status = ABIERTA) |

#### Endpoints Modificados:
| Método | Ruta | Cambios |
|--------|------|---------|
| GET | `/mrb` | Incluye datos del origen (sourceType, sourceFolio) |
| GET | `/mrb/:id` | Incluye datos completos del origen + detección de escalamiento QAR→8D |
| POST | `/mrb` | Acepta sourceType, sourceQarId, source8dId; hereda datos del origen |
| PUT | `/mrb/:id` | Maneja campos de operación MRB |

---

### 3. Frontend - MRBCampaigns.js

**Archivo:** `frontend/src/pages/MRBCampaigns.js`

**Cambios:**
- Nueva columna "Origen" en la tabla
- Badge con tipo (QAR/8D) y folio
- Click en badge navega al detalle del origen

---

### 4. Frontend - MRBCreate.js (Rediseño Mayor)

**Archivo:** `frontend/src/pages/MRBCreate.js`

**Nuevo flujo de 4 pasos:**

1. **Paso 1: Seleccionar Tipo de Origen**
   - Opciones: QAR o 8D
   - Cards visuales para selección

2. **Paso 2: Buscar y Seleccionar Origen**
   - Buscador por folio, título, cliente, parte
   - Lista de resultados con status
   - Indicador si QAR escaló a 8D

3. **Paso 3: Datos Heredados (solo lectura)**
   - Folio origen
   - Cliente
   - Proyecto
   - Parte
   - Departamento responsable
   - Descripción del problema
   - Fecha de creación

4. **Paso 4: Datos de Operación MRB**
   - Título y descripción
   - Cantidad Inspeccionada / OK / NOK
   - Costo de Scrap
   - Costo de Personal
   - # Inspectores
   - # Supervisores por turno
   - Fotos OK/NOK
   - Destinatarios

**Compatibilidad:** Mantiene flujo legacy desde captura de defectos.

---

### 5. Frontend - MRBCampaignDetail.js

**Archivo:** `frontend/src/pages/MRBCampaignDetail.js`

**Cambios:**
- Nueva tarjeta "Origen del MRB" con:
  - Badge clickeable del origen (navega a QAR o 8D)
  - Botón "Cambiar Origen" (solo si status = ABIERTA)
  - Alerta cuando QAR escaló a 8D con botón "Actualizar a 8D"
- Modal para cambiar origen:
  - Selección de tipo (QAR/8D)
  - Buscador
  - Lista de resultados
  - Confirmación de cambio

---

## Reglas de Negocio Implementadas

| Regla | Implementación |
|-------|----------------|
| Un solo origen activo | Cada MRB tiene `source_qar_id` XOR `source_8d_id` |
| Origen editable | Endpoint PUT `/mrb/:id/source` (solo status ABIERTA) |
| Jerarquía 8D > QAR | Frontend muestra alerta y botón para actualizar |
| Cualquier status | Endpoint `/sources` devuelve QARs y 8Ds sin filtrar por status |

---

## Pasos para Aplicar Cambios

### 1. Ejecutar migración SQL
```bash
psql -U usuario -d quality_alert_system -f backend/migrations/017_add_mrb_source_fields.sql
```

### 2. Reiniciar backend
```bash
cd backend && npm start
```

### 3. Verificar en navegador
1. Ir a `http://localhost:3000/mrb-campaigns`
2. Click "Nuevo MRB"
3. Verificar flujo de 4 pasos
4. Seleccionar QAR o 8D como origen
5. Verificar datos heredados
6. Llenar campos de operación
7. Crear y verificar columna "Origen" en lista

---

## Archivos Modificados/Creados

| Archivo | Acción |
|---------|--------|
| `backend/migrations/017_add_mrb_source_fields.sql` | NUEVO |
| `backend/endpoints/mrbEndpoints.js` | MODIFICADO |
| `frontend/src/pages/MRBCampaigns.js` | MODIFICADO |
| `frontend/src/pages/MRBCreate.js` | MODIFICADO (rediseño) |
| `frontend/src/pages/MRBCampaignDetail.js` | MODIFICADO |

---

## Notas Técnicas

- **Convención de nombres:** PostgreSQL usa snake_case, Frontend usa camelCase
- **Transformación automática:** Backend usa `transformToCamelCase()` en respuestas
- **Constraint de origen:** Validación en backend, no en BD para flexibilidad
- **Herencia de datos:** Al seleccionar origen, se heredan client_id, project_id, part_id, etc.

---

## Bug Fixes

### Error 500 en GET /mrb/sources (corregido)

**Problema:** El endpoint `/mrb/sources` fallaba con error 500 al buscar QARs o 8Ds.

**Causa:** La tabla `eightd_reports` no tiene las columnas:
- `source_qar_id`
- `client_id`, `client_name`
- `project_id`, `project_number`, `project_name`

**Solución:**
- Se reemplazó `er.client_name` por `er.supplier_name`
- Se pusieron `NULL` en las columnas inexistentes
- Se eliminaron las subqueries que buscaban escalamiento QAR→8D

**Nota:** La funcionalidad de detectar si un QAR escaló a 8D requeriría agregar una columna `source_qar_id` a la tabla `eightd_reports` o crear una tabla de relación.

### Error de columnas faltantes en mrb_campaigns (corregido)

**Problema:** El endpoint `/mrb/:id` fallaba porque faltaban columnas `validated_by`, `responded_by`, `source_qar_id`, etc.

**Solución:** Se actualizó la migración `017_add_mrb_source_fields.sql` para incluir:
- `responded_by` (INTEGER) - FK a users
- `response_date` (TIMESTAMP)
- `validated_by` (INTEGER) - FK a users
- `validation_date` (TIMESTAMP)
- `validation_status` (VARCHAR)

**Comando ejecutado:**
```bash
PGPASSWORD=postgres psql -U postgres -d apqp_system -f backend/migrations/017_add_mrb_source_fields.sql
```

---

## Tareas Pendientes

### 1. Crear Estación de Captura de Defectos Exclusiva para MRB

**Problema identificado:** La estación de captura de defectos actual (`DefectCapture.js`) está diseñada solo para QAR y no tiene integración directa con MRB.

**Objetivo:** Crear una nueva estación de captura específica para campañas MRB que permita:

1. **Seleccionar campaña MRB activa** antes de capturar defectos
2. **Vincular defectos directamente al MRB** seleccionado
3. **Mostrar contadores en tiempo real:**
   - Cantidad inspeccionada
   - OK / NOK
   - Acumulados del MRB
4. **Actualizar automáticamente** los campos de operación del MRB:
   - `qty_inspected`
   - `qty_ok`
   - `qty_nok`
5. **Interfaz optimizada** para inspección en línea de producción

**Archivos a crear/modificar:**
| Archivo | Acción |
|---------|--------|
| `frontend/src/pages/MRBDefectCapture.js` | NUEVO - Estación de captura MRB |
| `backend/endpoints/mrbEndpoints.js` | Agregar endpoints para captura |
| `frontend/src/App.js` | Agregar ruta `/mrb-capture` |

**Flujo propuesto:**
```
┌─────────────────────────────────────────────────────────────┐
│              CAPTURA DE DEFECTOS MRB                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Campaña MRB: [MRB-2026-0001 ▼]  Estado: ABIERTA           │
│  Origen: QAR-2026-0045 | Cliente: ACME | Parte: XYZ-123    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CONTADORES EN TIEMPO REAL                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ INSPEC.  │  │    OK    │  │   NOK    │          │   │
│  │  │   150    │  │   142    │  │    8     │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Registrar OK]  [+ Registrar NOK con Defecto]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Estado del Sistema

| Componente | Estado | Puerto |
|------------|--------|--------|
| Backend | ✅ Corriendo | 5000 |
| Frontend | ✅ Corriendo | 3000 |
| PostgreSQL | ✅ Corriendo | 5432 |
| Base de datos | `apqp_system` | - |
