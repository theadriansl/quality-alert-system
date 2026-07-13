# RESUMEN SESIÓN 2026-04-27

---
## PARA MAÑANA (2026-04-28) - TESTING

### Iniciar servidores
```bash
# Terminal 1 - Backend
cd quality-alert-system/backend
npm start

# Terminal 2 - Frontend
cd quality-alert-system/frontend
npm start
```

### Tests a realizar

#### 1. Unit Registry Endpoints (Postman o desde frontend)
```
POST http://localhost:5000/unit-registry
Body: { "serialNumber": "TEST-001", "clientId": 1, "partId": 1 }

GET http://localhost:5000/unit-registry/by-serial/TEST-001

PUT http://localhost:5000/unit-registry/{id}/status
Body: { "status": "INSPECTING" }

GET http://localhost:5000/unit-registry/{id}/history

POST http://localhost:5000/unit-registry/{id}/notes
Body: { "note": "Nota de prueba" }
```

#### 2. Spec Inspection Endpoints
```
POST http://localhost:5000/spec-inspection/entries
Body: {
  "unitId": 1,
  "clientId": 1,
  "partId": 1,
  "specId": 1,
  "result": "OK",
  "measuredValue": 10.5
}

POST http://localhost:5000/spec-inspection/bulk
Body: {
  "unitId": 1,
  "clientId": 1,
  "partId": 1,
  "entries": [
    { "specId": 1, "result": "OK", "measuredValue": 10.5 },
    { "specId": 2, "result": "NOK" }
  ]
}
```

#### 3. Frontend - Unit Traceability
1. Ir a http://localhost:3000/unit-traceability
2. Buscar serial "TEST-001"
3. Verificar que muestre:
   - Card con información de la unidad
   - Estado visual (badge con color)
   - Contadores (Specs OK/NOK, Defectos, Inspecciones)
4. Probar las 3 pestañas:
   - Timeline: debe mostrar eventos con íconos
   - Especificaciones: tabla de inspecciones
   - Estaciones: resumen por estación
5. Probar "Agregar Nota" - debe aparecer en timeline

#### 4. Integración DefectCapture con Specs
1. Ir a http://localhost:3000/defect-capture
2. Seleccionar cliente/proyecto/parte/estación
3. Verificar que carguen las specs configuradas
4. Marcar algunas specs como OK/NOK
5. Verificar contadores

### Archivos nuevos creados hoy
```
backend/
  endpoints/
    unitRegistryEndpoints.js      ← NUEVO
    specInspectionEndpoints.js    ← NUEVO

frontend/
  src/
    services/
      unitRegistryService.js      ← NUEVO
      specInspectionService.js    ← NUEVO
    pages/
      UnitTraceability.js         ← NUEVO
```

### Rutas nuevas
- `/unit-traceability` - Consulta de trazabilidad por serial

---

## TRABAJO COMPLETADO HOY

### 1. Migración 069_spec_station_traceability.sql
Tablas creadas:
- `measurement_units` - 37 unidades de medida (LENGTH, MASS, TIME, PRESSURE, CURRENT, VOLTAGE, etc.)
- `part_specifications` - Especificaciones por parte (DIMENSIONAL, QUALITATIVE, BOM_COMPONENT)
- `station_part_config` - Qué partes se checan en cada estación
- `station_inspection_items` - Items específicos (specs/defectos) por estación+parte
- `unit_registry` - Registro central de seriales/lotes para trazabilidad
- `unit_station_inspections` - Registro de inspección por estación (timestamp + inspector)
- `spec_inspection_entries` - Capturas de inspección de specs
- `unit_history` - Historial completo de eventos por serial

Campos agregados:
- `defect_entries_v2.serial_number` - Número de serie separado de lote
- `defect_entries_v2.unit_id` - FK a unit_registry
- `client_parts.inspection_config` - JSONB con configuración de trazabilidad

### 2. Endpoints Backend Creados

#### unitRegistryEndpoints.js - Registro y trazabilidad de seriales/lotes
- POST /unit-registry - Registrar nueva unidad
- GET /unit-registry/by-serial/:serialNumber - Buscar por serial
- GET /unit-registry/search - Búsqueda con filtros
- GET /unit-registry/:id - Obtener unidad por ID
- PUT /unit-registry/:id/status - Cambiar estado
- GET /unit-registry/:id/history - Historial completo
- POST /unit-registry/:id/notes - Agregar nota
- GET /unit-registry/stats/by-status - Estadísticas por estado

#### specInspectionEndpoints.js - Captura de inspección de especificaciones
- POST /spec-inspection/entries - Guardar resultado de spec
- POST /spec-inspection/bulk - Guardar múltiples specs
- GET /spec-inspection/entries - Consultar con filtros
- GET /spec-inspection/stats - Estadísticas por resultado
- GET /spec-inspection/station-inspections/:unitId - Inspecciones de estación

#### stationConfigEndpoints.js - Configuración de estaciones
  - GET /station-config/stations - Listar estaciones con conteo de partes
  - GET /station-config/stations/:id/config - Config completa de estación
  - POST /station-config/stations/:id/parts - Agregar parte a estación
  - DELETE /station-config/stations/:id/parts/:partId - Quitar parte
  - GET /station-config/stations/:id/parts/:partId/available - Items disponibles
  - POST /station-config/stations/:id/parts/:partId/items - Agregar items
  - PUT /station-config/stations/:id/parts/:partId/items - Bulk update items
  - GET /station-config/capture-config/:stationId/:partId - Config para captura

- `specCatalogEndpoints.js` - Catálogo de especificaciones
  - GET /spec-catalog/units - Unidades de medida
  - POST /spec-catalog/units - Crear unidad custom
  - GET /spec-catalog/parts/:partId/specs - Specs de una parte
  - GET /spec-catalog/specs/:specId - Detalle de spec
  - POST /spec-catalog/parts/:partId/specs - Crear spec
  - PUT /spec-catalog/specs/:specId - Actualizar spec
  - DELETE /spec-catalog/specs/:specId - Eliminar spec
  - POST /spec-catalog/parts/:partId/copy-from/:sourcePartId - Copiar specs
  - GET /spec-catalog/parts/:partId/bom-components - Componentes BOM
  - POST /spec-catalog/parts/:partId/bom-components - Agregar componente BOM
  - POST /spec-catalog/upload-photo - Subir foto de referencia

---

## CONTEXTO ORIGINAL

Continuación del análisis iniciado el 2026-04-26. Se identificaron áreas de oportunidad para expandir la plataforma de inspección.

---

## NUEVOS MÓDULOS PROPUESTOS

### Módulo 14: CONFIRMACIÓN DE ESPECIFICACIONES (Spec Confirmation)
### Módulo 15: REPARACIONES (Repairs)

Ambos módulos se integran con un nuevo sistema central de **trazabilidad por serial**.

---

## ARQUITECTURA PROPUESTA: TRAZABILIDAD POR SERIAL

### Concepto Central

El **SERIAL** se convierte en la entidad central de trazabilidad, permitiendo:
- Historial completo por unidad
- Seguimiento de defectos por serial
- Workflow de reparación y liberación
- Auditoría completa para IATF/ISO

```
LIFECYCLE DE UN SERIAL
──────────────────────

Serial SN-12345
    │
    ├─► Registro inicial
    │
    ├─► Inspección Specs ──► OK/NOK
    │
    ├─► Defecto encontrado ──► SCRATCH en zona A
    │       │
    │       └─► Estado: DEFECTIVE
    │
    ├─► Reparación ──► Pulido zona A
    │       │
    │       └─► Estado: REPAIRED
    │
    ├─► Re-inspección ──► OK
    │       │
    │       └─► Estado: RELEASED
    │
    └─► Historial completo consultable
```

---

## MODELO DE DATOS

### Configuración por Parte (client_parts)

```sql
-- Agregar configuración de tracking a client_parts
ALTER TABLE client_parts ADD COLUMN inspection_config JSONB DEFAULT '{
  "tracking_type": "LOT",
  "lot_required": false,
  "lot_persistent": true,
  "serial_required": false,
  "serial_source": "manual",
  "qr_includes_lot": false,
  "qr_includes_serial": false
}';

-- tracking_type opciones:
-- 'LOT'        → Solo lote (batch de N piezas)
-- 'SERIAL'     → Solo número de serie (pieza única)
-- 'LOT_SERIAL' → Ambos (lote + serial dentro del lote)
-- 'NONE'       → Sin trazabilidad unitaria
```

### Tablas Nuevas de Trazabilidad

```sql
-- ============================================================================
-- TABLA 1: unit_registry (Registro central de unidades/seriales)
-- ============================================================================
CREATE TABLE unit_registry (
  id SERIAL PRIMARY KEY,

  -- Identificación
  serial_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),              -- Opcional, lote al que pertenece

  -- Contexto
  client_id INTEGER NOT NULL REFERENCES clients(id),
  part_id INTEGER NOT NULL REFERENCES client_parts(id),
  project_id INTEGER REFERENCES projects(id),

  -- Estado actual
  current_status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
  -- REGISTERED | INSPECTING | DEFECTIVE | IN_REPAIR | REPAIRED |
  -- PENDING_REINSPECTION | RELEASED | SCRAPPED | SHIPPED

  -- Contadores (denormalizados para consulta rápida)
  total_defects INTEGER DEFAULT 0,
  open_defects INTEGER DEFAULT 0,
  total_repairs INTEGER DEFAULT 0,
  total_inspections INTEGER DEFAULT 0,

  -- Fechas clave
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_inspection_at TIMESTAMP,
  last_inspection_at TIMESTAMP,
  released_at TIMESTAMP,
  shipped_at TIMESTAMP,

  -- Metadata
  created_by INTEGER REFERENCES users(id),

  UNIQUE(client_id, part_id, serial_number)
);

CREATE INDEX idx_unit_registry_serial ON unit_registry(serial_number);
CREATE INDEX idx_unit_registry_status ON unit_registry(current_status);
CREATE INDEX idx_unit_registry_lot ON unit_registry(lot_number);
CREATE INDEX idx_unit_registry_part ON unit_registry(part_id);


-- ============================================================================
-- TABLA 2: unit_history (Historial completo por serial)
-- ============================================================================
CREATE TABLE unit_history (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit_registry(id) ON DELETE CASCADE,

  -- Evento
  event_type VARCHAR(30) NOT NULL,
  -- REGISTERED | INSPECTION_SPEC | INSPECTION_DEFECT | DEFECT_FOUND |
  -- REPAIR_STARTED | REPAIR_COMPLETED | REINSPECTION | RELEASED |
  -- SCRAPPED | SHIPPED | STATUS_CHANGE | NOTE

  -- Referencia al registro fuente
  source_table VARCHAR(50),             -- 'defect_entries_v2', 'spec_inspection_entries', 'unit_repairs'
  source_id INTEGER,                    -- ID en la tabla fuente

  -- Detalle del evento
  description TEXT NOT NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30),

  -- Contexto
  station_id INTEGER REFERENCES inspection_stations(id),
  performed_by INTEGER REFERENCES users(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),

  -- Timestamps
  event_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_unit_history_unit ON unit_history(unit_id);
CREATE INDEX idx_unit_history_type ON unit_history(event_type);
CREATE INDEX idx_unit_history_date ON unit_history(event_at);
```

---

## MÓDULO 14: CONFIRMACIÓN DE ESPECIFICACIONES

### Objetivo
Checklist de confirmación de especificaciones por cliente, con catálogo de fotos y características. Interfaz tipo DefectCapture para confirmar specs en inspección (recepción y producción).

### Tablas

```sql
-- ============================================================================
-- TABLA: part_specifications (Catálogo de especificaciones por parte)
-- ============================================================================
CREATE TABLE part_specifications (
  id SERIAL PRIMARY KEY,

  -- Relación con parte
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id),

  -- Identificación
  spec_number VARCHAR(50) NOT NULL,           -- "SPEC-001"
  spec_name VARCHAR(255) NOT NULL,            -- "Diámetro exterior"
  spec_type VARCHAR(50) NOT NULL,             -- dimensional | visual | funcional | material

  -- Valores de especificación (opcional según tipo)
  nominal_value VARCHAR(100),                 -- "10.5" o "RAL7035" o "Liso"
  tolerance_plus DECIMAL(10,4),               -- +0.05
  tolerance_minus DECIMAL(10,4),              -- -0.05
  unit VARCHAR(20),                           -- "mm", "Nm", "HRC", etc.

  -- Configuración de inspección (definido por cliente)
  is_critical BOOLEAN DEFAULT false,          -- CTQ/CTC
  requires_measurement BOOLEAN DEFAULT false, -- ¿Requiere valor medido?
  inspection_method TEXT,                     -- "Calibrador digital", "Visual", etc.
  inspection_frequency VARCHAR(50),           -- "100%", "Muestreo", "AQL 1.0"
  sample_size INTEGER,                        -- Tamaño de muestra si aplica

  -- Fotos de referencia
  photo_ok_url TEXT,                          -- Foto referencia OK
  photo_nok_url TEXT,                         -- Foto referencia NOK

  -- Documentación
  drawing_ref VARCHAR(100),                   -- "DWG-001 Det. A"
  notes TEXT,

  -- QAR Trigger (configurable por cliente)
  qar_trigger_enabled BOOLEAN DEFAULT false,
  qar_trigger_count INTEGER DEFAULT 3,
  qar_trigger_hours INTEGER DEFAULT 8,

  -- Control
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_part_specs_part ON part_specifications(part_id);
CREATE INDEX idx_part_specs_client ON part_specifications(client_id);
CREATE INDEX idx_part_specs_critical ON part_specifications(is_critical);
CREATE UNIQUE INDEX idx_part_specs_number ON part_specifications(part_id, spec_number);


-- ============================================================================
-- TABLA: spec_inspection_entries (Capturas de inspección de specs)
-- ============================================================================
CREATE TABLE spec_inspection_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) NOT NULL UNIQUE,   -- "SPEC-INS-2026-00001"

  -- Trazabilidad
  unit_id INTEGER REFERENCES unit_registry(id), -- Link a serial
  lot_number VARCHAR(100),
  serial_number VARCHAR(100),

  -- Contexto
  client_id INTEGER NOT NULL REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  part_id INTEGER NOT NULL REFERENCES client_parts(id),
  spec_id INTEGER NOT NULL REFERENCES part_specifications(id),

  -- Inspección
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id INTEGER NOT NULL REFERENCES users(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),
  station_id INTEGER REFERENCES inspection_stations(id),
  stage_id INTEGER REFERENCES inspection_stages(id),
  department_id INTEGER REFERENCES departments(id),

  -- Resultado
  result VARCHAR(20) NOT NULL,                -- OK | NOK | CONDITIONAL | NA
  measured_value VARCHAR(100),                -- Valor real medido (si aplica)
  deviation DECIMAL(10,4),                    -- Desviación calculada
  within_tolerance BOOLEAN,                   -- ¿Dentro de tolerancia?

  -- Disposición (si NOK)
  disposition_id INTEGER REFERENCES inspection_dispositions(id),
  disposition_notes TEXT,

  -- Evidencia
  photo_evidence TEXT,
  notes TEXT,

  -- QAR tracking
  qar_triggered BOOLEAN DEFAULT false,
  qar_id INTEGER REFERENCES quality_alerts(id),

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spec_entries_unit ON spec_inspection_entries(unit_id);
CREATE INDEX idx_spec_entries_client ON spec_inspection_entries(client_id);
CREATE INDEX idx_spec_entries_part ON spec_inspection_entries(part_id);
CREATE INDEX idx_spec_entries_date ON spec_inspection_entries(inspection_date);
CREATE INDEX idx_spec_entries_result ON spec_inspection_entries(result);
```

### UI Propuesta

#### Pantalla 1: Catálogo de Especificaciones (Admin/Calidad)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Catálogo de Especificaciones                              [+ Nueva Spec]    │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  Cliente: [Toyota ▼]    Parte: [ASM-001 - Ensamble Principal ▼]            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ #  │ Código    │ Nombre           │ Tipo  │ Nominal  │ Tol    │CTQ│Med│ │
│  │────┼───────────┼──────────────────┼───────┼──────────┼────────┼───┼───│ │
│  │ 1  │ SPEC-001  │ Diámetro ext.    │ DIM   │ 10.50 mm │ ±0.05  │ ⚠️│ ✓ │ │
│  │ 2  │ SPEC-002  │ Torque cierre    │ FUNC  │ 5.0 Nm   │ ±0.3   │ ⚠️│ ✓ │ │
│  │ 3  │ SPEC-003  │ Dureza superfic. │ DIM   │ 58 HRC   │ ±2     │ ⚠️│ ✓ │ │
│  │ 4  │ SPEC-004  │ Largo total      │ DIM   │ 150 mm   │ ±0.5   │   │ ✓ │ │
│  │ 5  │ SPEC-005  │ Color            │ VIS   │ RAL 7035 │ Ref    │   │   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [📋 Copiar de otra parte]  [📥 Importar Excel]  [📤 Exportar]             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Pantalla 2: Captura de Inspección (Tablet - Estilo DefectCapture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◀ Spec Confirmation          Station: Incoming    Inspector: Juan   T1     │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  Cliente: [Toyota ▼]   Proyecto: [Camry 2026 ▼]   Parte: [ASM-001 ▼]       │
│  Lote: [LOT-2026-0412  ] 🔒    Serial: [SN-00123     ]      ✓ OK: 5  ✗ NG: 1│
│─────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │                          │  │                                        │  │
│  │  📋 SPECS DE LA PARTE    │  │  🔍 SPEC-001: Diámetro exterior        │  │
│  │                          │  │  ─────────────────────────────────────  │  │
│  │  [Buscar spec...]        │  │                                        │  │
│  │                          │  │  Tipo: Dimensional     Crítico: ⚠️ SÍ  │  │
│  │  ⚠️ CRÍTICAS (CTQ)       │  │                                        │  │
│  │  ├─ ● Diámetro    ✓5 ✗1  │  │  ┌──────────────────────────────────┐  │  │
│  │  ├─ ● Torque      ✓6 ✗0  │  │  │         NOMINAL: 10.50 mm        │  │  │
│  │  └─ ● Dureza      ✓6 ✗0  │  │  │    Tolerancia: +0.05 / -0.05     │  │  │
│  │                          │  │  │       Rango: 10.45 - 10.55        │  │  │
│  │  📐 DIMENSIONALES        │  │  └──────────────────────────────────┘  │  │
│  │  ├─ ○ Largo       ✓6 ✗0  │  │                                        │  │
│  │  ├─ ○ Ancho       ✓6 ✗0  │  │  ┌────────────────┐ ┌────────────────┐ │  │
│  │  └─ ○ Espesor     ✓6 ✗0  │  │  │   FOTO OK 👍   │ │   FOTO NOK 👎  │ │  │
│  │                          │  │  │   [Imagen]     │ │   [Imagen]     │ │  │
│  │  👁️ VISUALES            │  │  └────────────────┘ └────────────────┘ │  │
│  │  ├─ ○ Color       ✓6 ✗0  │  │                                        │  │
│  │  ├─ ○ Acabado     ✓6 ✗0  │  │  Método: Calibrador digital            │  │
│  │  └─ ○ Marcaje     ✓6 ✗0  │  │                                        │  │
│  │                          │  │  ┌──────────────────────────────────┐  │  │
│  │  ─────────────────────── │  │  │  Valor medido: [10.48        ]   │  │  │
│  │  Progreso: 7/7 specs     │  │  │  Desviación: -0.02 ✓ DENTRO     │  │  │
│  │  ████████████████ 100%   │  │  └──────────────────────────────────┘  │  │
│  │                          │  │                                        │  │
│  │                          │  │  ┌────────┐ ┌────────┐ ┌────────────┐  │  │
│  │                          │  │  │  ✓ OK  │ │  ✗ NOK │ │ ⚡CONDICIONAL│ │  │
│  │                          │  │  └────────┘ └────────┘ └────────────┘  │  │
│  └──────────────────────────┘  └────────────────────────────────────────┘  │
│                                                                             │
│  [📷 Agregar Evidencia]   [💬 Notas]            [Finalizar Inspección ▶]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MÓDULO 15: REPARACIONES

### Objetivo
Gestión de reparaciones de unidades con defectos, incluyendo workflow de reparación, re-inspección y liberación.

### Tabla

```sql
-- ============================================================================
-- TABLA: unit_repairs (Reparaciones por serial)
-- ============================================================================
CREATE TABLE unit_repairs (
  id SERIAL PRIMARY KEY,
  repair_number VARCHAR(50) NOT NULL UNIQUE,  -- REP-2026-00001

  -- Relaciones
  unit_id INTEGER NOT NULL REFERENCES unit_registry(id),
  defect_entry_id INTEGER REFERENCES defect_entries_v2(id),  -- Defecto que se repara

  -- Información de reparación
  repair_type VARCHAR(50),                    -- REWORK | TOUCH_UP | REPLACE_COMPONENT | ADJUSTMENT
  repair_description TEXT NOT NULL,
  repair_method TEXT,                         -- Procedimiento usado
  parts_replaced JSONB,                       -- [{partNumber, qty, reason}]

  -- Tiempos
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  repair_time_minutes INTEGER,

  -- Responsables
  technician_id INTEGER REFERENCES users(id),
  station_id INTEGER REFERENCES inspection_stations(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),

  -- Estado
  repair_status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING | IN_PROGRESS | COMPLETED | FAILED | CANCELLED

  -- Re-inspección
  requires_reinspection BOOLEAN DEFAULT true,
  reinspection_completed BOOLEAN DEFAULT false,
  reinspection_result VARCHAR(10),            -- OK | NOK
  reinspection_date TIMESTAMP,
  reinspected_by INTEGER REFERENCES users(id),
  reinspection_station_id INTEGER REFERENCES inspection_stations(id),

  -- Resultado final
  final_disposition VARCHAR(20),              -- RELEASED | SCRAPPED | HOLD
  final_disposition_date TIMESTAMP,
  final_disposition_by INTEGER REFERENCES users(id),

  -- Notas y evidencia
  notes TEXT,
  photo_before TEXT,
  photo_after TEXT,

  -- Costos (opcional)
  labor_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_unit_repairs_unit ON unit_repairs(unit_id);
CREATE INDEX idx_unit_repairs_defect ON unit_repairs(defect_entry_id);
CREATE INDEX idx_unit_repairs_status ON unit_repairs(repair_status);
CREATE INDEX idx_unit_repairs_technician ON unit_repairs(technician_id);
```

### UI Propuesta

#### Pantalla 1: Lista de Unidades Pendientes de Reparación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Reparaciones                                              [+ Nueva Manual]  │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  Filtros: [Pendientes ▼]  [Todas las partes ▼]  [Hoy ▼]     🔍 [Buscar...] │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Serial      │ Parte     │ Defecto           │ Detectado │ Status    │  │ │
│  │─────────────┼───────────┼───────────────────┼───────────┼───────────┼──│ │
│  │ SN-00123    │ ASM-001   │ SCRATCH zona A    │ Hace 2h   │ 🟡 PENDING│▶ │ │
│  │ SN-00124    │ ASM-001   │ DENT panel B      │ Hace 3h   │ 🔵 IN_PROG│▶ │ │
│  │ SN-00125    │ ASM-002   │ LOOSE connector   │ Hace 1h   │ 🟡 PENDING│▶ │ │
│  │ SN-00126    │ ASM-001   │ COLOR mismatch    │ Ayer      │ 🟢 REPAIRED│▶│ │
│  │ SN-00127    │ ASM-003   │ DIMENSION OOT     │ Ayer      │ ⚫ SCRAPPED│  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Resumen: 🟡 Pendientes: 12  🔵 En proceso: 3  🟢 Reparadas: 45  ⚫ Scrap: 2│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Pantalla 2: Detalle de Reparación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◀ Reparación REP-2026-00123                                    Status: 🔵   │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  ┌─ UNIDAD ─────────────────────────────────────────────────────────────┐  │
│  │  Serial: SN-00123        Parte: ASM-001 - Ensamble Principal         │  │
│  │  Lote: LOT-2026-0412     Cliente: Toyota                             │  │
│  │  Estado actual: 🔵 IN_REPAIR                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ DEFECTO A REPARAR ──────────────────────────────────────────────────┐  │
│  │  Tipo: SCRATCH           Ubicación: Zona A - Panel frontal           │  │
│  │  Severidad: Mayor        Detectado: 2026-04-27 09:15 por Juan Pérez  │  │
│  │  ┌────────────────┐                                                  │  │
│  │  │  [Foto defecto]│                                                  │  │
│  │  └────────────────┘                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ REPARACIÓN ─────────────────────────────────────────────────────────┐  │
│  │  Tipo: [Retrabajo ▼]                                                 │  │
│  │  Descripción: [Pulido y retoque de pintura zona A              ]     │  │
│  │  Método: [Pulido fino + aplicación de primer + pintura base    ]     │  │
│  │                                                                      │  │
│  │  Técnico: [Carlos García ▼]     Estación: [Rework Station 1 ▼]      │  │
│  │  Inicio: 2026-04-27 10:30       Tiempo: [45    ] min                 │  │
│  │                                                                      │  │
│  │  ┌────────────────┐    ┌────────────────┐                           │  │
│  │  │ 📷 Foto ANTES  │    │ 📷 Foto DESPUÉS│                           │  │
│  │  │  [Subir...]    │    │  [Subir...]    │                           │  │
│  │  └────────────────┘    └────────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ RE-INSPECCIÓN ──────────────────────────────────────────────────────┐  │
│  │  [✓] Requiere re-inspección                                          │  │
│  │  Estado: ⏳ Pendiente                                                 │  │
│  │                                                                      │  │
│  │  [Completar Reparación]  →  Envía a re-inspección                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│             [Cancelar]  [Guardar Progreso]  [Completar Reparación ▶]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Pantalla 3: Re-inspección y Liberación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Re-inspección SN-00123                                                      │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  Serial: SN-00123     Parte: ASM-001     Reparación: REP-2026-00123        │
│                                                                             │
│  ┌─ DEFECTO ORIGINAL ───────────┐  ┌─ DESPUÉS DE REPARACIÓN ─────────────┐ │
│  │  ┌────────────────┐          │  │  ┌────────────────┐                 │ │
│  │  │  [Foto ANTES]  │          │  │  │  [Foto DESPUÉS]│                 │ │
│  │  └────────────────┘          │  │  └────────────────┘                 │ │
│  │  SCRATCH zona A              │  │  Pulido + retoque pintura           │ │
│  └──────────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                             │
│  ┌─ RESULTADO RE-INSPECCIÓN ────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │  │
│  │   │                 │    │                 │    │                 │ │  │
│  │   │    ✓ OK         │    │    ✗ NOK        │    │   ⚫ SCRAP      │ │  │
│  │   │    LIBERAR      │    │  VOLVER A       │    │   DESECHAR      │ │  │
│  │   │                 │    │  REPARACIÓN     │    │                 │ │  │
│  │   └─────────────────┘    └─────────────────┘    └─────────────────┘ │  │
│  │                                                                      │  │
│  │  Notas: [                                                      ]     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DIAGRAMA DE FLUJO COMPLETO

```
                              ┌─────────────────────┐
                              │   REGISTRO SERIAL   │
                              │   unit_registry     │
                              └──────────┬──────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
    ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
    │   INSPECCIÓN    │        │   INSPECCIÓN    │        │   DEFECT        │
    │   SPECS         │        │   DEFECTOS      │        │   CAPTURE       │
    │   (Módulo 14)   │        │   (Existente)   │        │   (Existente)   │
    └────────┬────────┘        └────────┬────────┘        └────────┬────────┘
             │                          │                          │
             │         ┌────────────────┴────────────────┐         │
             │         │                                 │         │
             │         ▼                                 ▼         │
             │    ┌─────────┐                      ┌──────────┐    │
             │    │   OK    │                      │   NOK    │    │
             │    └────┬────┘                      └────┬─────┘    │
             │         │                                │         │
             │         │         ┌──────────────────────┘         │
             │         │         │                                │
             │         │         ▼                                │
             │         │    ┌─────────────────┐                   │
             │         │    │   REPARACIÓN    │                   │
             │         │    │   (Módulo 15)   │                   │
             │         │    └────────┬────────┘                   │
             │         │             │                            │
             │         │             ▼                            │
             │         │    ┌─────────────────┐                   │
             │         │    │  RE-INSPECCIÓN  │                   │
             │         │    └────────┬────────┘                   │
             │         │             │                            │
             │         │    ┌────────┴────────┐                   │
             │         │    │                 │                   │
             │         ▼    ▼                 ▼                   │
             │    ┌─────────────┐       ┌──────────┐              │
             │    │  RELEASED   │       │ SCRAPPED │              │
             │    └─────────────┘       └──────────┘              │
             │                                                    │
             └────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │  UNIT_HISTORY   │
                              │  (Trazabilidad) │
                              └─────────────────┘
```

---

## ARCHIVOS A CREAR

```
BACKEND:
├── migrations/
│   └── 069_traceability_and_specs_repairs.sql
├── endpoints/
│   ├── unitRegistryEndpoints.js      (Registro y trazabilidad)
│   ├── specCatalogEndpoints.js       (CRUD specs por parte)
│   ├── specInspectionEndpoints.js    (Captura inspección specs)
│   └── repairEndpoints.js            (Workflow reparaciones)

FRONTEND:
├── pages/
│   ├── SpecCatalog.js                (Admin catálogo)
│   ├── SpecConfirmation.js           (Captura estilo DefectCapture)
│   ├── RepairList.js                 (Lista de reparaciones)
│   ├── RepairDetail.js               (Detalle/ejecución reparación)
│   ├── UnitTraceability.js           (Consulta historial por serial)
│   └── UnitDashboard.js              (KPIs y métricas)
├── components/
│   ├── SpecConfirmation/
│   │   ├── SpecList.js
│   │   ├── SpecDetail.js
│   │   └── SpecNOKModal.js
│   └── Repairs/
│       ├── RepairForm.js
│       ├── ReinspectionModal.js
│       └── UnitTimeline.js
└── services/
    ├── specService.js
    ├── repairService.js
    └── unitRegistryService.js
```

---

## MODIFICACIONES A MÓDULOS EXISTENTES

### DefectCapture.js
- Agregar campo `serial_number` (además de lot_number)
- Comportamiento según `inspection_config` de la parte:
  - `lot_persistent`: Mantener lote hasta que cambie
  - `serial_required`: Obligar serial
  - `qr_includes_*`: Parsear QR automáticamente
- Al registrar defecto con serial → crear/actualizar `unit_registry`
- Registrar evento en `unit_history`

### defect_entries_v2
```sql
ALTER TABLE defect_entries_v2 ADD COLUMN serial_number VARCHAR(100);
ALTER TABLE defect_entries_v2 ADD COLUMN unit_id INTEGER REFERENCES unit_registry(id);
CREATE INDEX idx_defect_entries_serial ON defect_entries_v2(serial_number);
CREATE INDEX idx_defect_entries_unit ON defect_entries_v2(unit_id);
```

### client_parts
```sql
ALTER TABLE client_parts ADD COLUMN inspection_config JSONB DEFAULT '{
  "tracking_type": "LOT",
  "lot_required": false,
  "lot_persistent": true,
  "serial_required": false,
  "serial_source": "manual",
  "qr_includes_lot": false,
  "qr_includes_serial": false
}';
```

---

## CONSIDERACIONES DE FLEXIBILIDAD

### Empresas con Solo Lotes (Sin Serial Unitario)

**Observación del usuario:** "Si la empresa trabaja en lotes sin serial va a poner el lote ahí en lugar de serial, por ejemplo en metal mecánica"

**Implicaciones de diseño:**
- El campo `serial_number` en `unit_registry` funciona como **identificador principal de trazabilidad**
- Para empresas sin serial unitario, pueden usar el número de lote como "serial"
- La configuración `tracking_type` en `inspection_config` define el comportamiento:

```
tracking_type: "LOT"     → serial_number = lot_number (automático)
tracking_type: "SERIAL"  → serial_number = único por pieza
tracking_type: "LOT_SERIAL" → ambos campos independientes
tracking_type: "NONE"    → sin trazabilidad unitaria
```

**UI adaptativa:**
- Si `tracking_type = "LOT"`: Mostrar solo campo "Lote" (se usa internamente como serial)
- Si `tracking_type = "SERIAL"`: Mostrar solo campo "Serial"
- Si `tracking_type = "LOT_SERIAL"`: Mostrar ambos campos

Esto permite que el mismo modelo de datos funcione para:
- ✅ Automotriz (serial por pieza)
- ✅ Metal mecánica (lotes de piezas)
- ✅ Electrónica (serial + lote)
- ✅ Producción continua (sin trazabilidad unitaria)

---

## PLAN DE DESARROLLO (FASES)

### FASE 1: Módulo de Especificaciones (Independiente)
Objetivo: Catálogo de specs por parte + captura de inspección tipo checklist

1. [ ] Crear migración `069_part_specifications.sql`
   - Tabla `part_specifications` (catálogo)
   - Tabla `spec_inspection_entries` (capturas)
2. [ ] Crear `specCatalogEndpoints.js` (CRUD catálogo)
3. [ ] Crear `specInspectionEndpoints.js` (captura inspección)
4. [ ] Crear UI `SpecCatalog.js` (admin catálogo)
5. [ ] Crear UI `SpecConfirmation.js` (captura estilo DefectCapture)
6. [ ] Integrar con QAR (threshold por specs NOK - opcional)

### FASE 2: Módulo de Reparaciones (Independiente)
Objetivo: Workflow de reparación vinculado a defectos existentes

7. [ ] Crear migración `070_unit_repairs.sql`
   - Tabla `unit_repairs`
8. [ ] Crear `repairEndpoints.js` (workflow completo)
9. [ ] Crear UI `RepairList.js` (lista de pendientes)
10. [ ] Crear UI `RepairDetail.js` (ejecución + re-inspección)

### FASE 3: Trazabilidad Unificada (Integración)
Objetivo: Capa central que conecta todos los módulos por serial/lote

11. [ ] Crear migración `071_unit_registry_traceability.sql`
    - Tabla `unit_registry`
    - Tabla `unit_history`
    - Agregar `serial_number` y `unit_id` a `defect_entries_v2`
    - Agregar `unit_id` a `spec_inspection_entries`
    - Agregar `inspection_config` a `client_parts`
12. [ ] Crear `unitRegistryEndpoints.js`
13. [ ] Modificar DefectCapture para soportar serial + unit_registry
14. [ ] Modificar SpecConfirmation para vincular con unit_registry
15. [ ] Crear UI `UnitTraceability.js` (consulta historial)
16. [ ] Dashboard de métricas por serial/lote

---

## VENTAJAS DE ESTE ORDEN

```
FASE 1: Especificaciones        FASE 2: Reparaciones
        (standalone)                   (standalone)
             │                              │
             │      ┌───────────────────────┘
             │      │
             ▼      ▼
        ┌─────────────────┐
        │    FASE 3:      │
        │  Trazabilidad   │
        │  (integración)  │
        └─────────────────┘
```

- ✅ Cada módulo funciona independientemente
- ✅ Se puede probar y liberar por fases
- ✅ Menor riesgo (no hay dependencias cruzadas iniciales)
- ✅ Trazabilidad se agrega sin romper funcionalidad existente

---

## RESUMEN DE MÓDULOS DEL SISTEMA

| # | Módulo | Estado |
|---|--------|--------|
| 1-13 | Módulos existentes (8D, QAR, MRB, etc.) | ✅ Operativos |
| 14 | **Confirmación de Especificaciones** | 🔄 Backend listo, falta UI |
| 15 | **Reparaciones** | 🆕 Por desarrollar |
| -- | **Trazabilidad por Serial** | ✅ Migración completa |

---

## TRABAJO COMPLETADO - SESIÓN 6PM

### 3. Frontend Tab "Estaciones" en DefectAdmin
Archivos creados:
- `frontend/src/services/stationConfigService.js` - Servicio para API de configuración de estaciones
- `frontend/src/components/StationConfigTab.js` - Componente completo para la pestaña

Funcionalidad implementada:
- Lista de estaciones con conteo de partes asignadas
- Selección de estación para ver configuración completa
- Modal para agregar partes a una estación
- Modal para configurar items (defectos/specs) por parte
- Visualización de items asignados con chips
- Eliminación rápida de items individuales
- Indicador visual para specs críticas y dimensionales

### 4. Frontend Tab "Especificaciones" en DefectAdmin
Archivos creados:
- `frontend/src/services/specCatalogService.js` - Servicio para API de catálogo de especificaciones
- `frontend/src/components/SpecCatalogTab.js` - Componente completo para la pestaña

Modificaciones:
- `frontend/src/pages/DefectAdmin.js` - Agregado tab "Especificaciones" (ahora 3 tabs: Catálogos, Estaciones, Especificaciones)

Funcionalidad implementada:
- Sidebar con lista de partes buscable
- Vista de specs agrupadas por tipo (Dimensionales, Cualitativas, BOM)
- Contadores por tipo y críticas
- Modal de alta/edición con campos según tipo:
  - DIMENSIONAL: LI/Nominal/LS con inputs visuales, selector de unidad de medida
  - QUALITATIVE: Campo de valores aceptables
- Checkbox para marcar como CTQ (crítica)
- Checkbox para requerir medición
- Upload de foto de referencia
- Campo de método de inspección y referencia de dibujo
- Notas adicionales

### 5. Modal BOM Checklist en SpecCatalogTab
Funcionalidad agregada a `SpecCatalogTab.js`:
- Botón "+ BOM" que abre modal de componentes
- Carga automática de partes hijas (parent_part_id)
- Tabla con componentes disponibles y su estado (Agregado/Pendiente)
- Upload de foto de referencia opcional por componente
- Campo de notas para el checklist
- Acciones: Agregar al Checklist / Quitar
- Visualización en tabla principal con columna de Componente

### 6. Integración de Specs en DefectCapture
Modificaciones a `DefectCapture.js`:

## TRABAJO COMPLETADO - SESIÓN CONTINUACIÓN

### 7. Endpoints de Trazabilidad de Unidades

#### backend/endpoints/unitRegistryEndpoints.js
Funcionalidad:
- Registro de nuevas unidades (serial/lote)
- Búsqueda por serial con filtros opcionales de cliente/parte
- Búsqueda avanzada con múltiples filtros
- Gestión de estados con historial automático
- Historial completo de eventos por unidad
- Agregar notas al historial
- Estadísticas por estado

Estados soportados:
```
REGISTERED → INSPECTING → OK/DEFECTIVE
DEFECTIVE → IN_REPAIR → REPAIRED → PENDING_REINSPECTION
PENDING_REINSPECTION → OK/DEFECTIVE
OK → RELEASED → SHIPPED
DEFECTIVE → SCRAPPED
```

#### backend/endpoints/specInspectionEndpoints.js
Funcionalidad:
- Guardar resultado individual de spec (OK/NOK/CONDITIONAL/NA)
- Cálculo automático de desviación para dimensionales
- Validación de tolerancias (withinTolerance)
- Guardado bulk de múltiples specs a la vez
- Actualización automática de contadores en unit_registry
- Registro automático en unit_history
- Consulta con filtros y paginación
- Estadísticas por resultado

### 8. Servicios Frontend para Trazabilidad

#### frontend/src/services/unitRegistryService.js
Métodos:
- registerUnit(unitData) - Registrar unidad
- getBySerial(serialNumber, clientId?, partId?) - Buscar por serial
- searchUnits(filters) - Búsqueda con filtros
- getUnit(id) - Obtener por ID
- updateStatus(id, status, notes?, stationId?, shiftId?) - Cambiar estado
- getHistory(id) - Obtener historial
- addNote(id, note, stationId?) - Agregar nota
- getStatsByStatus(filters) - Estadísticas

#### frontend/src/services/specInspectionService.js
Métodos:
- saveEntry(entryData) - Guardar inspección individual
- saveBulk(bulkData) - Guardar múltiples inspecciones
- getEntries(filters) - Consultar con filtros
- getStats(filters) - Estadísticas
- getStationInspections(unitId) - Inspecciones de estación

### 9. Componente UnitTraceability.js

Archivo: `frontend/src/pages/UnitTraceability.js`

Funcionalidad:
- Búsqueda por número de serie
- Card de información de unidad con estado visual
- Contadores: Specs OK, Specs NOK, Defectos, Inspecciones
- 3 pestañas:
  1. **Timeline**: Historial cronológico con íconos por tipo de evento
  2. **Especificaciones**: Tabla de inspecciones de specs con desviaciones
  3. **Estaciones**: Resumen de inspecciones por estación
- Modal para agregar notas
- Soporte para parámetros URL (unitId, serial)

Configuración de estados con colores e íconos:
- REGISTERED (gris), INSPECTING (azul), OK (verde), DEFECTIVE (rojo)
- IN_REPAIR (amarillo), REPAIRED (morado), PENDING_REINSPECTION (naranja)
- RELEASED (verde), SCRAPPED (rojo), SHIPPED (cyan)

### 10. Registro en server.js
Agregados los imports y rutas:
```javascript
const unitRegistryEndpoints = require('./endpoints/unitRegistryEndpoints');
const specInspectionEndpoints = require('./endpoints/specInspectionEndpoints');

app.use('/unit-registry', unitRegistryEndpoints);
app.use('/spec-inspection', specInspectionEndpoints);
```

### 11. Ruta en App.js
```javascript
import UnitTraceability from './pages/UnitTraceability';

<Route path="/unit-traceability" element={
  <ProtectedRoute>
    <UnitTraceability />
  </ProtectedRoute>
} />
```

---

### 6 (Original). Integración de Specs en DefectCapture
Modificaciones a `DefectCapture.js`:
- **Persistencia de estación**: La estación seleccionada ahora se guarda en localStorage junto con cliente/proyecto/parte
- **Carga de specs por estación**: Cuando se selecciona estación + parte, se llama al endpoint `/station-config/capture-config/:stationId/:partId`
- **Sección de especificaciones**: Nueva sección visual arriba de los defectos con:
  - Tarjetas por cada spec configurada
  - Muestra límites LI/Nominal/LS para dimensionales
  - Badge CTQ para specs críticas
  - Botones OK/NOK por spec con toggle visual
  - Contadores de OK/NOK/Pendiente
- **State management**:
  - `stationSpecs`, `stationDefects`, `hasStationConfig` para datos del endpoint
  - `specResults` para trackear resultados OK/NOK por spec

---

## COMPLETADO EN ESTA SESIÓN ✅

### FRONTEND
1. [x] Tab "Estaciones" en DefectAdmin ✅
2. [x] Modal alta Dimensional (LI/Media/LS) en catálogo de specs ✅
3. [x] Modal BOM Checklist ✅
4. [x] Integrar specs en DefectCapture según estación ✅

### BACKEND - TRAZABILIDAD
5. [x] unitRegistryEndpoints.js (registro/consulta de seriales) ✅
6. [x] specInspectionEndpoints.js (captura de inspección de specs) ✅

### FRONTEND - TRAZABILIDAD
7. [x] UnitTraceability.js - consulta historial por serial/lote ✅
8. [x] unitRegistryService.js - Servicio para registro de unidades ✅
9. [x] specInspectionService.js - Servicio para inspección de specs ✅

### RUTAS Y REGISTRO
10. [x] Rutas registradas en server.js ✅
11. [x] Ruta /unit-traceability en App.js ✅

---

## ARCHIVOS CREADOS HOY

```
backend/
├── migrations/
│   └── 069_spec_station_traceability.sql  ✅ EJECUTADA
└── endpoints/
    ├── stationConfigEndpoints.js          ✅ REGISTRADO
    └── specCatalogEndpoints.js            ✅ REGISTRADO

frontend/
├── services/
│   ├── stationConfigService.js            ✅ CREADO
│   └── specCatalogService.js              ✅ CREADO
├── components/
│   ├── StationConfigTab.js                ✅ CREADO
│   └── SpecCatalogTab.js                  ✅ CREADO (con BOM modal)
└── pages/
    ├── DefectAdmin.js                     ✅ MODIFICADO (3 tabs)
    └── DefectCapture.js                   ✅ MODIFICADO (specs + persistencia estación)
```

---

---

## COMPLETADO - ENDPOINTS DE TRAZABILIDAD ✅

### Backend - Endpoints de Trazabilidad ✅ COMPLETADO
1. **unitRegistryEndpoints.js** ✅
2. **specInspectionEndpoints.js** ✅

### Frontend - Trazabilidad ✅ COMPLETADO
3. **UnitTraceability.js** ✅
4. **unitRegistryService.js** ✅
5. **specInspectionService.js** ✅

---

## PRÓXIMOS PASOS (DESPUÉS DEL TESTING)

### Si el testing es exitoso:
1. **Integrar UnitTraceability en Home.js**
   - Agregar tarjeta/botón para acceder a trazabilidad
   - Posiblemente en sección de Inspección/Calidad

2. **Integrar registro de serial en DefectCapture**
   - Al capturar defecto, registrar automáticamente el serial si no existe
   - Vincular defect_entries_v2 con unit_registry

3. **Dashboard de Trazabilidad**
   - KPIs: unidades por estado
   - Gráficas: tendencia de OK/NOK
   - Filtros por cliente/parte/fecha

### Módulos futuros relacionados:
4. **Módulo de Reparaciones**
   - Workflow: DEFECTIVE → IN_REPAIR → REPAIRED → PENDING_REINSPECTION
   - Formulario de reparación con evidencia
   - Asignación de técnico

5. **Módulo de Liberación**
   - Workflow de aprobación para liberar unidades
   - Firma digital del inspector de calidad
   - Generación de certificado

### Tablas ya creadas en migración 069:
- `unit_registry` - serial_number, lot_number, client_id, part_id, current_status, contadores
- `unit_station_inspections` - unit_id, station_id, inspector_id, started_at, completed_at, result
- `spec_inspection_entries` - entry_number, unit_id, spec_id, result, measured_value, deviation
- `unit_history` - unit_id, event_type, source_table, source_id, description, old_status, new_status

### Estados de unit_registry.current_status:
REGISTERED | INSPECTING | OK | DEFECTIVE | IN_REPAIR | REPAIRED | PENDING_REINSPECTION | RELEASED | SCRAPPED | SHIPPED

### Event types para unit_history.event_type:
REGISTERED | STATION_START | STATION_COMPLETE | SPEC_OK | SPEC_NOK | DEFECT_FOUND | REPAIR_STARTED | REPAIR_COMPLETED | REINSPECTION | RELEASED | SCRAPPED | SHIPPED | STATUS_CHANGE | NOTE

---

*Actualizado: 2026-04-27 (sesión continuación)*
*Próxima sesión: Testing de trazabilidad*
