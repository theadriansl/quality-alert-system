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

### Próximos Pasos
1. Definir si unificar `unit_registry` con `production_entries`
2. Agregar campos `source` y `production_entry_id` a `unit_registry`
3. Crear `unit_registry` también para inspecciones OK
4. Implementar link bidireccional producción ↔ calidad
