# Resumen Sesión 2026-05-01

## Módulo: Defect Hospital + MRB (quality-alert-system)

---

## CONFIGURACIÓN POSTGRESQL (LEER SIEMPRE PRIMERO)

| Campo | Valor |
|-------|-------|
| **Ruta instalación** | `C:\Program Files\PostgreSQL\17` |
| **Host** | `localhost` |
| **Puerto** | `5432` |
| **Base de datos** | `apqp_system` |
| **Usuario** | `postgres` |
| **Password** | `postgres` |
| **Servicio Windows** | `postgresql-x64-17` |

**Ejecutar migración individual:**
```bash
cd C:\Users\The Eidrian\quality-alert-system\backend
node migrations/run_single_migration.js <archivo.sql>
```

---

## CAMBIOS COMPLETADOS (Sesión Anterior)

### 1. Modal "Asignar Ubicación" (Intake Hospital)
- **Botón** "📍 Asignar Ubicación" en barra superior de DefectHospital
- **Flujo**: Escanear código ubicación → Validar tipo REPAIR → Escanear seriales batch → Asignar
- **Endpoint usado**: `POST /location-codes/assign`
- **Timestamps actualizados**: `hospital_intake_at`, `current_location_id`, `location_assigned_at`

### 2. Subtabs en Tab "Pendientes"
- **"Sin Ubicación"**: Defectos sin `current_location_id` - requieren escaneo antes de reparar
- **"En Cola"**: Defectos con ubicación asignada - listos para iniciar reparación
- **Bloqueo**: No se puede iniciar reparación sin ubicación física asignada

### 3. Modal "Entregar a QA" (Handoff)
- **Botón** "🔄 Entregar a QA" en barra superior
- **Flujo**: Escanear estación RELEASE → Escanear seriales reparados batch → Entregar
- **Validación**: Solo acepta ubicaciones tipo RELEASE
- **Timestamp actualizado**: `received_at_release_station`

### 4. Vista WIP en Tiempo Real
- **Nuevo tab** "📊 WIP" en DefectHospital
- **Resumen general**: Total WIP, En Reparación, En Liberación, # Ubicaciones
- **Por ubicación**: Barra proporcional, conteo piezas, tiempo promedio, entrada más antigua
- **Colores aging**: Verde ≤2h, Amarillo ≤8h, Rojo >8h

---

## CAMBIOS COMPLETADOS (Sesión Actual - 2026-05-01 noche)

### 5. Ubicaciones de Prueba (Migración 078)
- **7 ubicaciones creadas** en tabla `location_codes`:

| Código | Tipo | Descripción |
|--------|------|-------------|
| `HOSP-001` | REPAIR | Mesa reparación 1 |
| `HOSP-002` | REPAIR | Mesa reparación 2 |
| `HOSP-003` | REPAIR | Mesa reparación 3 |
| `REL-A1` | RELEASE | Estación liberación A1 |
| `REL-A2` | RELEASE | Estación liberación A2 |
| `BUFF-01` | BUFFER | Buffer temporal |
| `MRB-01` | MRB | Área MRB |

### 6. Tabla Pivote MRB Campaña-Partes (Migración 079)
- **Problema resuelto**: Una parte puede tener MÚLTIPLES campañas activas
- **Tabla**: `mrb_campaign_parts` (relación muchos-a-muchos)
- **46 relaciones migradas** desde `parts_list` JSONB
- **Vistas creadas**:
  - `v_campaigns_by_part` - Campañas activas por número de parte
  - `v_parts_multi_campaign` - Partes con múltiples campañas

### 7. Endpoints Multi-Campaña MRB
Nuevos endpoints en `backend/endpoints/mrbEndpoints.js`:

| Endpoint | Descripción |
|----------|-------------|
| `GET /mrb/campaigns-by-part/:partId` | Campañas activas por part_id |
| `GET /mrb/campaigns-by-part-number/:partNumber` | Campañas por P/N (para escaneo) |
| `GET /mrb/parts-multi-campaign` | Partes con múltiples campañas |
| `POST /mrb/:id/add-part` | Agregar parte a campaña |
| `DELETE /mrb/:id/remove-part/:partId` | Quitar parte de campaña |

### 8. UI Inspección Multi-Campaña MRB
Modificaciones en `frontend/src/pages/MRBDefectCapture.js`:

**Nuevos estados:**
- `detectedPart` - Parte detectada automáticamente por serial
- `availableCampaigns` - Campañas activas para la parte
- `selectedCampaigns` - Campañas seleccionadas (multi-select)
- `campaignResults` - OK/NOK por cada campaña
- `lastDetectedPartId` - Para mantener selección por lote

**Flujo implementado:**
```
1. Escanear SERIAL
       ↓
2. Auto-detecta PARTE (busca en unit_registry)
       ↓
3. Busca CAMPAÑAS activas para esa parte
       ↓
4. Multi-select de campañas (checkboxes)
       ↓
5. Marcar OK/NOK por cada campaña individualmente
       ↓
6. Botón "Registrar X resultado(s)" → envía a todas
       ↓
7. Si siguiente serial = misma parte → MANTIENE selección
```

**Nueva función:** `handleMultiCampaignSubmit()` - Envía resultados a múltiples campañas

---

## ARCHIVOS MODIFICADOS (Esta sesión)

| Archivo | Cambios |
|---------|---------|
| `backend/migrations/078_seed_location_codes.sql` | 7 ubicaciones de prueba |
| `backend/migrations/079_mrb_campaign_parts_pivot.sql` | Tabla pivote + vistas |
| `backend/endpoints/mrbEndpoints.js` | +5 endpoints multi-campaña |
| `frontend/src/pages/MRBDefectCapture.js` | Estados y UI multi-campaña |

---

## DIAGRAMA DE FLUJO HOSPITAL

```
INSPECCIÓN          LOGÍSTICA              REPARACIÓN                    QA
    │                   │                      │                          │
    ▼                   │                      │                          │
┌─────────┐             │                      │                          │
│ CAPTURA │             │                      │                          │
│ DEFECTO │────────────►│                      │                          │
└─────────┘             │                      │                          │
captured_at             ▼                      │                          │
               ┌─────────────────┐             │                          │
               │ 📍 ASIGNAR      │             │                          │
               │    UBICACIÓN    │────────────►│                          │
               │    (REPAIR)     │             │                          │
               └─────────────────┘             │                          │
               hospital_intake_at              ▼                          │
               current_location_id    ┌─────────────────┐                 │
                                      │     OPEN        │                 │
                                      │   (En Cola)     │                 │
                                      └────────┬────────┘                 │
                                               │ Iniciar                  │
                                               ▼                          │
                                      ┌─────────────────┐                 │
                                      │   IN_REPAIR     │                 │
                                      │  (Reparando)    │                 │
                                      └────────┬────────┘                 │
                                      repair_started_at                   │
                                               │                          │
                       ┌───────────────────────┼───────────────────────┐  │
                       │                       │                       │  │
                       ▼                       ▼                       ▼  │
              ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
              │  QUARANTINE  │        │   REPAIRED   │        │   SCRAPPED   │
              │  (No repair) │        │ (Completado) │        │  (Desecho)   │
              └──────┬───────┘        └──────┬───────┘        └──────────────┘
                     │                repaired_at                unit_cost $$
                     │                       │                        │
                     ▼                       ▼                       FIN
              ┌──────────────┐       ┌─────────────────┐
              │     MRB      │       │ 🔄 ENTREGAR    │
              │  (Análisis)  │       │    A QA        │
              └──────────────┘       └────────┬───────┘
                     │               received_at_release_station
                     │                       │
                     ▼                       ▼
              Buffer MRB             ┌─────────────────┐
              (sin campaña)          │ IN_VALIDATION   │
                     │               │   (Cola QA)     │
                     ▼               └────────┬────────┘
              Asignar a                       │
              Campaña MRB            ┌────────┴────────┐
                     │               ▼                 ▼
                     │        ┌──────────────┐  ┌──────────────┐
                     │        │   REJECTED   │  │   CLOSED     │
                     │        │ (Rechazado)  │  │ (Liberado)   │
                     │        └──────┬───────┘  └──────────────┘
                     │               │          released_at
                     └───────────────┘               FIN
```

---

## FLUJO MRB (Definido en esta sesión)

```
DEFECTO DETECTADO
       │
       ▼ (sospecha responsable)
┌─────────────────────────────┐
│  📋 CUARENTENA ANÁLISIS     │ ← Buffer mientras se investiga
│  (Asignar área/liaison)     │
└───────────┬─────────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
Causa raíz       Sin definir
confirmada       (pendiente)
    │               │
    ▼               └──► Permanece en Buffer
┌──────────────┐
│ CREAR/ASIGNAR│
│ CAMPAÑA MRB  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│  🏭 CAMPAÑA ACTIVA          │
│  • Recolectar TODO material │
│    - Piso / Almacén / Proceso│
│  • Inspeccionar en MRB      │
│  • Una PARTE puede tener    │
│    MÚLTIPLES campañas       │
│  • Aplicar contramedida:    │
│    RW / SCRAP / USE AS IS   │
└─────────────────────────────┘
```

---

## ESTADOS DEL SISTEMA

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| **OPEN** | Defecto capturado, pendiente reparación | Asignar ubicación → Iniciar |
| **IN_REPAIR** | Técnico trabajando | Completar / Cuarentena / Scrap |
| **REPAIRED** | Reparación completa | Entregar a QA |
| **IN_VALIDATION** | En cola de QA | Liberar / Rechazar |
| **REJECTED** | QA rechazó | Vuelve a OPEN (sin ubicación) |
| **QUARANTINE** | No reparable, pendiente MRB | Buffer MRB → Campaña |
| **SCRAPPED** | Desechado (con costo) | **FIN** |
| **CLOSED** | Liberado exitosamente | **FIN** |

---

## TIMESTAMPS CAPTURADOS

| Timestamp | Momento | Quién |
|-----------|---------|-------|
| `captured_at` | Detección del defecto | Inspección |
| `hospital_intake_at` | Entrega a Hospital | Logística |
| `location_assigned_at` | Asignación de ubicación | Sistema |
| `repair_started_at` | Inicio de reparación | Reparador |
| `repaired_at` | Fin de reparación | Reparador |
| `received_at_release_station` | Entrega a QA | Reparador |
| `released_at` | Liberación | QA |
| `shipped_to_logistics_at` | Salida de Hospital | Opcional |

---

## MÉTRICAS HABILITADAS

| Métrica | Fórmula |
|---------|---------|
| Queue time (Reparación) | `repair_started_at - hospital_intake_at` |
| Repair time | `repaired_at - repair_started_at` |
| Handoff time | `received_at_release_station - repaired_at` |
| QA total time | `released_at - received_at_release_station` |
| Total cycle time | `released_at - captured_at` |
| **Scrap cost** | `SUM(unit_cost) WHERE status = SCRAPPED` |
| **WIP cost** | `SUM(unit_cost) WHERE status IN (OPEN, IN_REPAIR, ...)` |

---

## MIGRACIONES EJECUTADAS

| # | Archivo | Fecha | Estado |
|---|---------|-------|--------|
| 077 | `077_add_location_to_pending_view.sql` | 2026-05-01 | ✅ |
| 078 | `078_seed_location_codes.sql` | 2026-05-01 | ✅ |
| 079 | `079_mrb_campaign_parts_pivot.sql` | 2026-05-01 | ✅ |

---

## PENDIENTES

### Testing Hospital (Prioridad Alta)
- [ ] Probar flujo completo: Captura → Asignar Ubicación → Reparar → Entregar QA → Liberar
- [ ] Validar subtabs Sin Ubicación / En Cola
- [ ] Probar modal Asignar Ubicación con escaneo batch
- [ ] Probar modal Entregar a QA con validación de tipo RELEASE
- [ ] Verificar tab WIP con datos reales

### Testing MRB Multi-Campaña (Prioridad Alta)
- [ ] Probar detección automática de parte por serial
- [ ] Verificar que muestre campañas activas correctas
- [ ] Probar multi-select de campañas
- [ ] Probar checklist OK/NOK por campaña
- [ ] Verificar que mantenga selección mientras parte no cambie
- [ ] Probar `handleMultiCampaignSubmit` con múltiples campañas

### Buffer MRB (Prioridad Media) - NO INICIADO
- [ ] **Tab Buffer MRB**: Material en QUARANTINE sin campaña asignada
- [ ] Campos: `mrb_received_at`, tiempo en espera
- [ ] Asignar área responsable (Proveedor/Producción/Mfg)
- [ ] Crear/vincular a campaña cuando se define causa raíz
- [ ] Vista `v_mrb_buffer` con aging

### Dashboard Hospital (Prioridad Media)
**Estructura FINAL: 6 Tabs**

| # | Tab | Contenido | Audiencia |
|---|-----|-----------|-----------|
| 1 | 📋 **Resumen** | KPIs top + Tendencia + Aging semáforo + Pareto origen | Gerencia |
| 2 | 🏭 **Operativo** | WIP por estación + Tiempos (MTTR, Queue, Cycle) + Throughput | Supervisores |
| 3 | ✅ **Calidad** | FPY + Repeat defects + Top 5 partes + Por cliente/programa | Ingeniería |
| 4 | 💰 **Costos** | Scrap cost + WIP cost + Labor cost + Tendencia mensual | Finanzas |
| 5 | 👥 **Personal** | Reparadores + Liberadores (combinado) | RRHH/Mejora |
| 6 | ⚙️ **Mi Dashboard** | Todos los widgets disponibles, arrastrable, configurable | Usuario |

**Vistas SQL a crear:**
- `v_hospital_dashboard_summary` - KPIs generales
- `v_hospital_by_repairer` - Estadísticas por técnico
- `v_hospital_by_releaser` - Estadísticas por inspector QA
- `v_hospital_repeat_defects` - Seriales con múltiples defectos
- `v_hospital_by_client` - Desglose por cliente/programa
- `v_hospital_costs` - Scrap + WIP + tendencias

### Opcional
- [ ] Auto-refresh en tab WIP (polling cada 30s)
- [ ] Notificaciones de aging crítico
- [ ] Campo `shipped_to_logistics_at` (salida de Hospital)

---

## NOTAS TÉCNICAS

- Backend usa `transformToCamelCase()` - campos llegan como camelCase al frontend
- Escaneo batch en modales acepta Enter para agregar seriales
- Validación de tipo ubicación: REPAIR para intake, RELEASE para handoff
- WIP se calcula desde vista `v_hospital_wip_by_location`
- Colores aging: Verde ≤2h, Amarillo ≤8h, Rojo >8h
- `unit_cost` se copia de BOM al capturar defecto (histórico)
- Piezas SCRAPPED conservan `unit_cost` para cálculo de pérdida
- **MRB**: Una parte puede tener múltiples campañas (relación en `mrb_campaign_parts`)
- **MRB**: Al escanear serial → detecta parte → busca campañas → mantiene selección por lote

---

*Última actualización: 2026-05-01 (noche) - Multi-campaña MRB + Ubicaciones Hospital*
