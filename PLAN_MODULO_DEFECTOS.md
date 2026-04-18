# Plan: Módulo de Defectos / Initial Concerns

**Fecha:** 2026-01-21
**Estado:** En planificación

---

## Resumen

Sistema de captura y seguimiento de defectos estilo "Initial Concerns" con:
- Catálogos personalizables (botones, no texto libre)
- Integración con BOM existente (Cliente → Proyecto → Parte)
- Quality Alert automático por threshold
- Dashboard con estadísticas y gráficas

---

## 1. Estructura de Datos Existente

Ya tenemos en la BD:

```
clients (Clientes)
  └── projects (Proyectos) → client_id
        └── project_parts (Partes/BOM) → project_id

users (Usuarios)
  └── department (Área/Departamento)
```

---

## 2. Tablas Nuevas a Crear

### 2.1 `defect_catalog_types`
Tipos de catálogo del sistema.

```sql
CREATE TABLE defect_catalog_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,  -- 'MAIN_ITEM', 'LOCATION_1', 'DEFECT', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  allows_custom BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Valores iniciales:**
- MAIN_ITEM (Item Principal)
- SUB_PART (Sub-Parte) - dinámico según MAIN_ITEM
- LOCATION_1 (Ubicación 1)
- LOCATION_2 (Ubicación 2)
- RANK (Categoría)
- DEFECT (Tipo de Defecto)
- PRIORITY (Prioridad/Severidad)
- CAPTURE_STATION (Estación de Captura)

### 2.2 `defect_catalog_items`
Items de cada catálogo.

```sql
CREATE TABLE defect_catalog_items (
  id SERIAL PRIMARY KEY,
  catalog_type_id INTEGER NOT NULL REFERENCES defect_catalog_types(id),
  parent_item_id INTEGER REFERENCES defect_catalog_items(id), -- Para SUB_PART → MAIN_ITEM
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20),  -- Para UI (ej: rojo para crítico)
  icon VARCHAR(50),   -- Emoji o icono
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(catalog_type_id, code)
);
```

### 2.3 `defect_entries`
Registros de defectos capturados.

```sql
CREATE TABLE defect_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) UNIQUE NOT NULL,  -- Auto: DEF-2026-0001

  -- Contexto del producto (de BOM existente)
  client_id INTEGER REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  part_id INTEGER REFERENCES project_parts(id),

  -- Clasificación del defecto (de catálogos)
  main_item_id INTEGER REFERENCES defect_catalog_items(id),
  sub_part_id INTEGER REFERENCES defect_catalog_items(id),
  location_1_id INTEGER REFERENCES defect_catalog_items(id),
  location_2_id INTEGER REFERENCES defect_catalog_items(id),
  rank_id INTEGER REFERENCES defect_catalog_items(id),
  defect_type_id INTEGER REFERENCES defect_catalog_items(id),
  priority_id INTEGER REFERENCES defect_catalog_items(id),
  capture_station_id INTEGER REFERENCES defect_catalog_items(id),

  -- Descripción auto-generada
  auto_description TEXT,  -- "BELT: SEAT BELT BUCKLE 2ND ROW /CTR INCORRECT ROUTE"
  manual_notes TEXT,      -- Notas adicionales del usuario

  -- Responsables (ligados a users)
  feedback_to_user_id INTEGER REFERENCES users(id),
  responsible_area VARCHAR(100),  -- Auto-llenado de users.department

  -- Captura
  captured_by_user_id INTEGER NOT NULL REFERENCES users(id),
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Fotos (JSONB array)
  photos JSONB DEFAULT '[]',  -- [{id, filename, url, uploaded_at}]

  -- Datos adicionales
  odometer INTEGER,           -- Kilometraje (si aplica)
  quantity INTEGER DEFAULT 1, -- Cantidad de defectos iguales

  -- Quality Alert vinculado (si se generó)
  quality_alert_id INTEGER,   -- FK a quality_alerts cuando se genere

  -- Estado
  status VARCHAR(50) DEFAULT 'open',  -- open, acknowledged, resolved, closed
  resolved_at TIMESTAMP,
  resolved_by_user_id INTEGER REFERENCES users(id),
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas y dashboard
CREATE INDEX idx_defect_entries_client ON defect_entries(client_id);
CREATE INDEX idx_defect_entries_project ON defect_entries(project_id);
CREATE INDEX idx_defect_entries_captured_at ON defect_entries(captured_at);
CREATE INDEX idx_defect_entries_status ON defect_entries(status);
CREATE INDEX idx_defect_entries_defect_type ON defect_entries(defect_type_id);
CREATE INDEX idx_defect_entries_main_item ON defect_entries(main_item_id);
CREATE INDEX idx_defect_entries_feedback_to ON defect_entries(feedback_to_user_id);
CREATE INDEX idx_defect_entries_capture_station ON defect_entries(capture_station_id);
```

### 2.4 `defect_config`
Configuración del módulo.

```sql
CREATE TABLE defect_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);
```

**Configuraciones:**
- `qa_auto_threshold`: `{ "enabled": true, "count": 3, "period_days": 7, "group_by": ["defect_type_id", "part_id"] }`
- `description_format`: `{ "template": "{MAIN_ITEM}: {SUB_PART} {LOCATION_1} /{LOCATION_2} {DEFECT}" }`

---

## 3. Flujo de Captura de Defecto

### Paso 1: Contexto del Producto
| Campo | Fuente | Cascada |
|-------|--------|---------|
| **Cliente** | `clients` | → Filtra proyectos |
| **Proyecto** | `projects` | → Filtra partes |
| **Parte (BOM)** | `project_parts` | Auto-llena part_number, part_name |

### Paso 2: Ubicación del Defecto (Grid de botones)
| Campo | Ejemplo |
|-------|---------|
| MAIN ITEM | DOOR, BELT, SEAT... |
| Sub-Parte | SEAT BELT BUCKLE... (dinámico según MAIN ITEM) |
| LOCATION 1 | 2ND ROW, FRONT... |
| LOCATION 2 | LH, CTR, INNER... |

### Paso 3: Clasificación
| Campo | Ejemplo |
|-------|---------|
| RANK | Bad Operation, Appearance... |
| DEFECT | CLIP MISSING, LOOSE... |
| PRIO | 1, 2, K-1, K-2... |

### Paso 4: Responsables y Evidencia
| Campo | Fuente |
|-------|--------|
| Estación de Captura | Catálogo |
| **Feedback a** | `users` (selector) |
| **Área Responsable** | Auto de `users.department` |
| Foto | Captura tablet / Upload |
| ODO (km) | Input numérico |
| Cantidad | Input numérico (default 1) |

### Resultado: Descripción Auto-generada
```
"BELT: SEAT BELT BUCKLE 2ND ROW /CTR INCORRECT ROUTE"
```

---

## 4. Quality Alert Automático

### Configuración (Admin)
- **Habilitado:** Sí/No
- **Threshold:** X casos (ej: 3)
- **Período:** últimos N días (ej: 7)
- **Agrupar por:** defect_type + part (configurable)

### Lógica
```
Cada vez que se guarda un defecto:
  1. Contar defectos similares en período
  2. Si count >= threshold:
     - Crear Quality Alert automático
     - Vincular todos los defectos al QA
     - Notificar a responsables
```

### Auto-llenado del QA
| Campo QA | Fuente |
|----------|--------|
| Cliente | defect.client_id |
| Proyecto | defect.project_id |
| Part Number | defect.part.part_number |
| Part Name | defect.part.part_name |
| Descripción | defect.auto_description |
| Severidad | Mapeo de defect.priority |
| Área | defect.responsible_area |
| Cantidad | Conteo de defectos agrupados |
| Evidencia | Fotos de los defectos |

---

## 5. Dashboard y Gráficas

### Filtros (mismos que formulario)
- Cliente, Proyecto, Parte
- MAIN ITEM, Sub-Parte, Location
- RANK, DEFECT, PRIO
- Estación de Captura
- Usuario que captura
- Feedback a (usuario)
- Área Responsable
- Rango de fechas
- Estado

### Gráficas

| Gráfica | Descripción | Tipo |
|---------|-------------|------|
| **Tendencia diaria** | Defectos por día | Line chart |
| **Pareto 80/20** | Top defectos | Bar chart horizontal |
| **Por Área** | Defectos por departamento | Bar chart |
| **Por Estación** | Dónde se detectan | Pie/Bar |
| **Por Capturista** | Quién reporta más | Bar chart |
| **Recurrencia** | Defectos repetidos | Table/Heat map |
| **Por MAIN ITEM** | Distribución por componente | Treemap/Pie |
| **Por Severidad** | Distribución por PRIO | Pie/Donut |

### KPIs principales
- Total defectos (período)
- Defectos abiertos vs cerrados
- Tiempo promedio de resolución
- Top 5 defectos recurrentes
- Áreas con más defectos

---

## 6. Admin de Catálogos

### Funcionalidades
1. **Ver/Editar catálogos** - CRUD de items por tipo
2. **Importar Excel** - Carga masiva de items
3. **Relaciones padre-hijo** - Configurar SUB_PART → MAIN_ITEM
4. **Activar/Desactivar** - Sin eliminar histórico
5. **Ordenar** - Drag & drop para display_order

### Formato Excel para importación
```
| catalog_type | code | name | parent_code | color | icon |
|--------------|------|------|-------------|-------|------|
| MAIN_ITEM | BELT | Belt | | | |
| SUB_PART | SEAT_BELT_BUCKLE | Seat Belt Buckle | BELT | | |
| DEFECT | CLIP_MISSING | Clip Missing | | #ef4444 | |
```

---

## 7. Fases de Implementación

### Fase 1: Base de Datos y Backend
- [ ] Migración SQL con todas las tablas
- [ ] Endpoints CRUD para catálogos
- [ ] Endpoint importación Excel
- [ ] Endpoints CRUD para defectos
- [ ] Lógica de auto-descripción

### Fase 2: Frontend - Admin Catálogos
- [ ] Página de administración de catálogos
- [ ] Importador de Excel
- [ ] Editor de relaciones padre-hijo

### Fase 3: Frontend - Captura de Defectos
- [ ] Formulario con grid de botones
- [ ] Cascada Cliente → Proyecto → Parte
- [ ] Auto-llenado área por usuario
- [ ] Captura/upload de fotos
- [ ] Generación descripción automática

### Fase 4: Quality Alert Automático
- [ ] Configuración de threshold
- [ ] Lógica de detección y agrupación
- [ ] Creación automática de QA
- [ ] Vinculación defectos ↔ QA

### Fase 5: Dashboard
- [ ] Filtros dinámicos
- [ ] Gráfica tendencia diaria
- [ ] Pareto 80/20
- [ ] Gráficas por área, estación, usuario
- [ ] KPIs principales

---

## 8. Archivos a Crear/Modificar

### Backend
```
backend/
├── migrations/
│   └── 009_defect_module.sql          # Migración principal
├── endpoints/
│   └── defectEndpoints.js             # CRUD defectos y catálogos
└── services/
    └── defectService.js               # Lógica de negocio (auto QA, etc.)
```

### Frontend
```
frontend/src/
├── pages/
│   ├── DefectCapture.js               # Formulario de captura
│   ├── DefectDashboard.js             # Dashboard con gráficas
│   └── DefectAdmin.js                 # Admin de catálogos
├── components/
│   └── Defects/
│       ├── CatalogButtonGrid.js       # Grid de botones estilo Excel
│       ├── DefectForm.js              # Formulario completo
│       ├── DefectPhotoCapture.js      # Captura/upload fotos
│       ├── DefectList.js              # Lista de defectos
│       └── DefectCharts.js            # Componentes de gráficas
└── services/
    └── defectService.js               # API calls
```

---

## 9. Notas Técnicas

### Convenciones
- PostgreSQL: `snake_case`
- Frontend/Backend JS: `camelCase`
- Usar `caseTransform.js` para conversión automática

### Fotos
- Almacenar en: `backend/uploads/defect-photos/`
- Formato JSONB en BD: `[{id, filename, url, uploadedAt, uploadedBy}]`
- Compresión/resize en frontend antes de upload

### Performance Dashboard
- Índices en campos de filtro
- Considerar vistas materializadas para agregaciones pesadas
- Caché de gráficas si es necesario

---

## 10. Preguntas Pendientes

1. ¿Límite de fotos por defecto?
2. ¿Notificaciones por email cuando se asigna feedback?
3. ¿Exportar defectos a Excel?
4. ¿Integración con otros módulos (8D, ECR)?

---

**Ruta de este archivo:** `C:\Users\The Eidrian\quality-alert-system\PLAN_MODULO_DEFECTOS.md`
