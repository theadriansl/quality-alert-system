# RESUMEN SESIÓN 2026-04-26

## TRABAJO COMPLETADO

### 1. Documentación Completa de Módulos QMS

Se documentaron los 13 módulos del sistema en formato de diagrama estructurado para análisis ISO:

| # | Módulo | Tablas | Endpoints | Integración Principal |
|---|--------|--------|-----------|----------------------|
| 1 | 8D Problem Solving | 10+ | 50+ | QAR, Audit, Workload |
| 2 | QAR (Quality Action Request) | 7 | 25+ | Defects, 8D, MRB |
| 3 | MRB (Material Review Board) | 6 | 40+ | QAR, 8D, Defects |
| 4 | ECR (Engineering Change Request) | 8 | 30+ | Risk Matrix, Audit |
| 5 | Defectos (Capture & Query) | 8 | 30+ | QAR, MRB, 8D |
| 6 | Auditorías | 12 | 50+ | 8D, ECR, Workload |
| 7 | Workload | 11 | 50+ | 8D, Audit, Mgmt Review |
| 8 | Configuración | 10 | 40+ | All Modules |
| 9 | Clientes | 6 | 30+ | All Modules |
| 10 | Lecciones Aprendidas | 1 | 5 | 8D |
| 11 | Risk Matrix | 1 | 3 | ECR |
| 12 | Statistical Tools | 3 | 15+ | Datasets (standalone) |
| 13 | Management Review | 5 | 12 | All Modules (KPIs) |

### 2. Diagrama Global de Flujos entre Módulos

```
                              ┌─────────────────────┐
                              │   MANAGEMENT REVIEW │
                              │      (9.3 ISO)      │
                              └──────────┬──────────┘
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            │                            │                            │
            ▼                            ▼                            ▼
  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │    AUDITORÍAS   │◄───────►│    WORKLOAD     │         │  CONFIGURACIÓN  │
  └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
           │                           │                           │
           ▼                           ▼                           ▼
  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │       8D        │◄───────►│       ECR       │◄───────►│   RISK MATRIX   │
  └────────┬────────┘         └─────────────────┘         └─────────────────┘
           │
           ▼
  ┌─────────────────┐
  │      QAR        │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │    DEFECTOS     │◄───────►│      MRB        │◄───────►│   STATISTICAL   │
  └────────┬────────┘         └─────────────────┘         │     TOOLS       │
           │                                              └─────────────────┘
           ▼
  ┌─────────────────┐         ┌─────────────────┐
  │    CLIENTES     │◄───────►│    LECCIONES    │
  │   (BOM/Parts)   │         │   APRENDIDAS    │
  └─────────────────┘         └─────────────────┘
```

---

## ÁREA DE OPORTUNIDAD IDENTIFICADA

### Módulo Propuesto: CONFIRMACIÓN DE ESPECIFICACIONES

**Concepto:** Checklist de confirmación de especificaciones por cliente, con catálogo de fotos y características de partes/subpartes. Interfaz tipo DefectCapture para confirmar specs en inspección.

---

## ANÁLISIS DETALLADO

### Información Recopilada

| Pregunta | Respuesta |
|----------|-----------|
| ¿Recepción o Producción? | **AMBAS** - mismos campos obligatorios que inspección uno a uno |
| ¿Tolerancia numérica o visual? | **Cliente lo establece** - fotos son referencia, cada característica lleva check OK/NOK |
| ¿Registro de medición? | **Si lo define el cliente** - puede agregar características, mediciones, valores cualitativos y cuantitativos |
| ¿Frecuencia de inspección? | **Lo define el cliente** |
| ¿QAR automático? | **Configurable por cliente** - por número de casos, evaluar vs plataforma de inspección actual |

---

## PROPUESTA ARQUITECTURA

### Modelo de Datos

```sql
-- ============================================================================
-- TABLA 1: part_specifications (Catálogo de especificaciones por parte)
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
  qar_trigger_count INTEGER DEFAULT 3,        -- Número de NOK para disparar QAR
  qar_trigger_hours INTEGER DEFAULT 8,        -- Ventana de tiempo

  -- Control
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_part_specs_part ON part_specifications(part_id);
CREATE INDEX idx_part_specs_client ON part_specifications(client_id);
CREATE INDEX idx_part_specs_critical ON part_specifications(is_critical);
CREATE UNIQUE INDEX idx_part_specs_number ON part_specifications(part_id, spec_number);


-- ============================================================================
-- TABLA 2: spec_inspection_entries (Capturas de inspección)
-- ============================================================================
CREATE TABLE spec_inspection_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) NOT NULL UNIQUE,   -- "SPEC-INS-2026-00001"

  -- Contexto (mismos campos que defect_entries_v2)
  client_id INTEGER NOT NULL REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  part_id INTEGER NOT NULL REFERENCES client_parts(id),
  spec_id INTEGER NOT NULL REFERENCES part_specifications(id),

  -- Inspección
  lot_number VARCHAR(100),
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
  photo_evidence TEXT,                        -- URL foto evidencia
  notes TEXT,

  -- QAR tracking
  qar_triggered BOOLEAN DEFAULT false,
  qar_id INTEGER REFERENCES quality_alerts(id),

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_spec_entries_client ON spec_inspection_entries(client_id);
CREATE INDEX idx_spec_entries_part ON spec_inspection_entries(part_id);
CREATE INDEX idx_spec_entries_spec ON spec_inspection_entries(spec_id);
CREATE INDEX idx_spec_entries_date ON spec_inspection_entries(inspection_date);
CREATE INDEX idx_spec_entries_result ON spec_inspection_entries(result);
CREATE INDEX idx_spec_entries_inspector ON spec_inspection_entries(inspector_id);


-- ============================================================================
-- TABLA 3: spec_inspection_summary (Resumen por lote - opcional)
-- ============================================================================
CREATE TABLE spec_inspection_summary (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES client_parts(id),
  lot_number VARCHAR(100) NOT NULL,
  inspection_date DATE NOT NULL,
  shift_id INTEGER REFERENCES inspection_shifts(id),

  -- Contadores
  total_specs INTEGER DEFAULT 0,
  specs_ok INTEGER DEFAULT 0,
  specs_nok INTEGER DEFAULT 0,
  specs_conditional INTEGER DEFAULT 0,
  specs_na INTEGER DEFAULT 0,

  -- Resultado general
  lot_status VARCHAR(20),                     -- APPROVED | REJECTED | CONDITIONAL

  -- Auditoría
  inspector_id INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(part_id, lot_number, inspection_date, shift_id)
);
```

---

## PROPUESTA UI

### Pantalla 1: Catálogo de Especificaciones (Admin/Calidad)

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
│  │ 6  │ SPEC-006  │ Acabado superf.  │ VIS   │ Liso     │ Ref    │   │   │ │
│  │ 7  │ SPEC-007  │ Marcaje/Logo     │ VIS   │ Logo OK  │ Ref    │   │   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Leyenda: CTQ = Crítico | Med = Requiere medición                          │
│                                                                             │
│  [📋 Copiar de otra parte]  [📥 Importar Excel]  [📤 Exportar]             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Configuración QAR para esta parte:                                         │
│  [ ] Disparar QAR automático si NOK crítico                                │
│      Después de [3] NOK en [8] horas                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pantalla 2: Modal Agregar/Editar Especificación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Nueva Especificación                                              [X]      │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  Código: [SPEC-008        ]     Nombre: [Peso total              ]         │
│                                                                             │
│  Tipo: [Dimensional ▼]          Unidad: [kg     ]                          │
│                                                                             │
│  ┌─ Valores ──────────────────────────────────────────────────────────────┐│
│  │  Valor Nominal: [2.450    ]                                            ││
│  │  Tolerancia +: [0.050     ]    Tolerancia -: [0.050     ]              ││
│  │                                                                         ││
│  │  [✓] Requiere medición (capturar valor real)                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ Inspección ───────────────────────────────────────────────────────────┐│
│  │  Método: [Báscula digital calibrada                              ]     ││
│  │  Frecuencia: [100% ▼]     Tamaño muestra: [N/A     ]                   ││
│  │  Referencia plano: [DWG-001 Vista general                        ]     ││
│  │                                                                         ││
│  │  [⚠️] Característica CRÍTICA (CTQ/CTC)                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ Fotos de Referencia ──────────────────────────────────────────────────┐│
│  │  ┌──────────────┐    ┌──────────────┐                                  ││
│  │  │  📷 Foto OK  │    │  📷 Foto NOK │                                  ││
│  │  │  [Subir...]  │    │  [Subir...]  │                                  ││
│  │  └──────────────┘    └──────────────┘                                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Notas: [                                                            ]     │
│                                                                             │
│                                      [Cancelar]  [Guardar]                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pantalla 3: Captura de Inspección (Estilo DefectCapture - Tablet)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◀ Spec Confirmation          Station: Incoming    Inspector: Juan   T1     │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  Cliente: [Toyota ▼]   Proyecto: [Camry 2026 ▼]   Parte: [ASM-001 ▼]       │
│  Lote: [LOT-2026-0412        ]                              ✓ OK: 5  ✗ NG: 1│
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
│  │  └─ ○ Marcaje     ✓6 ✗0  │  │  Frecuencia: 100%                      │  │
│  │                          │  │  Ref: DWG-001 Det. A                    │  │
│  │                          │  │                                        │  │
│  │  ─────────────────────── │  │  ┌──────────────────────────────────┐  │  │
│  │  Progreso: 7/7 specs     │  │  │  Valor medido: [10.48        ]   │  │  │
│  │  ████████████████ 100%   │  │  │  Desviación: -0.02 ✓ DENTRO     │  │  │
│  │                          │  │  └──────────────────────────────────┘  │  │
│  │                          │  │                                        │  │
│  │                          │  │  ┌────────┐ ┌────────┐ ┌────────────┐  │  │
│  │                          │  │  │  ✓ OK  │ │  ✗ NOK │ │ ⚡CONDICIONAL│ │  │
│  │                          │  │  └────────┘ └────────┘ └────────────┘  │  │
│  │                          │  │                                        │  │
│  └──────────────────────────┘  └────────────────────────────────────────┘  │
│                                                                             │
│  [📷 Agregar Evidencia]   [💬 Notas]            [Finalizar Inspección ▶]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pantalla 4: Modal NOK con Disposición

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Especificación NO CONFORME                                      [X]     │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  SPEC-001: Diámetro exterior                                               │
│  Nominal: 10.50 mm (±0.05)                                                 │
│  Valor medido: 10.62 mm                                                    │
│  Desviación: +0.12 ❌ FUERA DE TOLERANCIA                                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Disposición: [Seleccionar... ▼]                                           │
│               ├─ Scrap (Desecho)                                           │
│               ├─ Rework (Retrabajo)                                        │
│               ├─ Return to Supplier                                        │
│               ├─ Use As Is (Desviación)                                    │
│               └─ Hold (Retener)                                            │
│                                                                             │
│  Notas: [                                                            ]     │
│                                                                             │
│  [📷 Foto evidencia]                                                       │
│                                                                             │
│  ⚠️ ALERTA: Esta es una característica CRÍTICA (CTQ)                       │
│     NOK #2 de 3 permitidos en 8 horas antes de disparar QAR                │
│                                                                             │
│                                              [Cancelar]  [Confirmar NOK]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## REUTILIZACIÓN DE CÓDIGO EXISTENTE

| Componente Existente | Reutilización para Spec Confirmation |
|---------------------|--------------------------------------|
| `DefectCapture.js` | Layout 2 paneles, cascada client→project→part, theme, counters |
| `inspectionCatalogEndpoints.js` | Stations, Shifts, Stages, Dispositions, Severities |
| `client_parts` + jerarquía | Ya tiene parent-child para subpartes |
| `qarEndpoints.js` threshold logic | Adaptar para trigger QAR por specs NOK |
| Photo upload (QAR/MRB) | Fotos OK/NOK referencia y evidencia |
| `defect_entries_v2` estructura | Base para `spec_inspection_entries` |
| Excel import/export (BOM) | Para importar catálogo de specs |

---

## ARCHIVOS A CREAR

```
BACKEND:
├── migrations/
│   └── 069_spec_confirmation_module.sql
├── endpoints/
│   ├── specCatalogEndpoints.js      (CRUD specs por parte)
│   └── specInspectionEndpoints.js   (Captura inspección)

FRONTEND:
├── pages/
│   ├── SpecCatalog.js               (Admin catálogo por cliente/parte)
│   ├── SpecConfirmation.js          (Captura estilo DefectCapture)
│   └── SpecDashboard.js             (Reportes/KPIs - opcional)
├── components/
│   └── SpecConfirmation/
│       ├── SpecList.js              (Lista specs izquierda)
│       ├── SpecDetail.js            (Detalle derecha con fotos)
│       └── SpecNOKModal.js          (Modal disposición)
└── services/
    └── specService.js
```

---

## PENDIENTES PARA PRÓXIMA SESIÓN

1. **Revisar propuesta de arquitectura** - Validar modelo de datos y UI
2. **Comparar vs DefectCapture** - Identificar qué código reutilizar exactamente
3. **Definir campos obligatorios** - Asegurar paridad con inspección uno a uno
4. **Implementar migración** - `069_spec_confirmation_module.sql`
5. **Crear endpoints backend** - `specCatalogEndpoints.js`, `specInspectionEndpoints.js`
6. **Crear páginas frontend** - `SpecCatalog.js`, `SpecConfirmation.js`
7. **Integrar con QAR** - Lógica de threshold configurable por cliente

---

## NOTAS ADICIONALES

- El módulo debe ser **100% configurable por cliente** (qué specs, tolerancias, frecuencia, QAR trigger)
- Las **fotos de referencia** son auxiliares, el resultado siempre es OK/NOK/CONDITIONAL
- **Valores cualitativos y cuantitativos** según lo defina el cliente por característica
- Reutilizar máximo la infraestructura existente para minimizar desarrollo
- Considerar **copiar specs entre partes** para acelerar configuración

---

*Fin del resumen de sesión 2026-04-26*
