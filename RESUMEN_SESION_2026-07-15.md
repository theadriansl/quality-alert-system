# Resumen de Sesión - 2026-07-15

## Módulo MRB - Identificación de Material Afectado

### Cambios Realizados

#### 1. Modal de Seriales Afectados (MRBCampaignDetail.js)
- **Nuevo modal** con 3 tabs para cargar seriales afectados:
  - **Buscar en Sistema**: Búsqueda por rango de fechas o rango de seriales
  - **Entrada Manual**: Ingresar seriales manualmente con número de parte
  - **Ver Cargados**: Lista de seriales ya agregados a la campaña
- Filtros por partes de la campaña (checkboxes)
- Validación de que seriales pertenezcan a partes de la campaña

#### 2. Endpoints Backend (mrbEndpoints.js)
- `GET /mrb/:id/search-serials` - Búsqueda de seriales en `production_entries`
  - Modos: por fecha (`dateFrom`/`dateTo`) o por serial (`serialFrom`/`serialTo`)
  - Filtrado por partes de la campaña
- `GET /mrb/:id/campaign-parts` - Obtener partes asignadas a campaña
- `POST /mrb/:id/affected-serials/bulk` - Agregar múltiples seriales
- `GET /mrb/:id/available-parts` - Partes disponibles para agregar

#### 3. Migración SQL (110_mrb_affected_serials.sql)
- Nueva tabla `mrb_affected_serials` para seriales que requieren inspección
- Campos: serial_number, part_id, lot_number, inspected, inspection_result
- Índices para búsqueda eficiente

#### 4. Persistencia de Filtros (MRBCampaigns.js)
- Filtros guardados en localStorage
- Se mantienen al navegar y regresar a la lista

#### 5. Datos de Prueba
- 100 seriales de prueba para partes FAU-DP-001 y FAU-DP-002
- Insertados en `production_entries` para testing

### Descubrimiento Arquitectónico

#### Tablas de Producción vs Calidad
```
production_entries  ← CSV/Webhook/API (datos de producción)
       ↓
   [NO HAY SYNC AUTOMÁTICO]
       ↓
unit_registry       ← Solo cuando hay evento de calidad (defecto/inspección)
```

**Problema identificado:**
- MRB buscaba en `unit_registry` pero los seriales de producción están en `production_entries`
- `unit_registry` solo se crea cuando hay defecto, no para seriales OK

**Solución aplicada:**
- Endpoint `search-serials` ahora busca en `production_entries`

### Análisis Pendiente

#### unit_registry - Propósito y Uso
- **Beneficios**: Contadores denormalizados, estado centralizado, workflow enforcement
- **Gap actual**: No se crea para inspecciones OK, no hay link a production_entries
- **Decisión pendiente**: Agregar campo `source` y `production_entry_id` para trazabilidad completa

### Archivos Modificados
- `backend/endpoints/mrbEndpoints.js` (+819 líneas)
- `frontend/src/pages/MRBCampaignDetail.js` (+969 líneas)
- `frontend/src/pages/MRBCampaigns.js` (+24 líneas)
- `frontend/src/pages/MRBDefectCapture.js` (+482 líneas)
- `frontend/src/pages/MRBCreate.js` (+98 líneas)
- `backend/migrations/110_mrb_affected_serials.sql` (nuevo)

### Cambios Adicionales (Sesión Tarde)

#### Migración 111: unit_registry source tracking
```sql
ALTER TABLE unit_registry ADD COLUMN source VARCHAR(20) DEFAULT 'MANUAL';
ALTER TABLE unit_registry ADD COLUMN production_entry_id INTEGER REFERENCES production_entries(id);
```

#### Endpoints Actualizados para Trazabilidad

| Endpoint | Cambio |
|----------|--------|
| defectAdminEndpoints.js | Al crear unit_registry, busca en production_entries y vincula |
| unitRegistryEndpoints.js | Creación manual con source='MANUAL' o 'PRODUCTION' |
| mrbEndpoints.js | capture-ok y capture-nok ahora CREAN unit_registry si no existe |

#### Valores de source
- `PRODUCTION` - Serial existe en production_entries (vinculado)
- `MANUAL` - Creado manualmente sin respaldo de producción
- `INSPECTION` - Creado durante captura de defecto/inspección
- `MRB` - Creado desde campaña MRB (sin respaldo de producción)

#### Flujo Final
```
production_entries ←──── CSV/Webhook/API
       ↓
unit_registry.production_entry_id = pe.id
unit_registry.source = 'PRODUCTION'
       ↓
production_entries.unit_id = ur.id (link bidireccional)
```

### Commits Realizados
1. `209c312` - feat(MRB): Modal de seriales afectados y búsqueda en production_entries
2. `454d062` - feat(unit_registry): Agregar trazabilidad de origen y link a production_entries

### Próximos Pasos
1. Probar flujo completo de trazabilidad en MRB
2. Verificar que inspecciones OK también creen unit_registry (specInspectionEndpoints)
3. Dashboard/reportes que muestren source de unidades
