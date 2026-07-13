# Resumen Sesión 2026-05-04

## Módulo: Defect Hospital + MRB + Skills (quality-alert-system)

---

## CONFIGURACIÓN POSTGRESQL

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

## MIGRACIONES EJECUTADAS

| # | Archivo | Fecha | Estado |
|---|---------|-------|--------|
| 077 | `077_add_location_to_pending_view.sql` | 2026-05-01 | ✅ |
| 078 | `078_seed_location_codes.sql` | 2026-05-01 | ✅ |
| 079 | `079_mrb_campaign_parts_pivot.sql` | 2026-05-01 | ✅ |
| 080 | `080_mrb_buffer_fields.sql` | 2026-05-04 | ✅ |
| 081 | `081_hospital_dashboard_views.sql` | 2026-05-04 | ✅ |
| 082 | `082_skills_training_module.sql` | 2026-05-05 | ✅ |

---

## FUNCIONALIDADES COMPLETADAS

### 1. Modal "Asignar Ubicación" (Intake Hospital)
- Botón "📍 Asignar Ubicación" en barra superior de DefectHospital
- Flujo: Escanear código ubicación → Validar tipo REPAIR → Escanear seriales batch → Asignar
- Endpoint: `POST /location-codes/assign`
- Timestamps: `hospital_intake_at`, `current_location_id`, `location_assigned_at`

### 2. Subtabs en Tab "Pendientes"
- "Sin Ubicación": Defectos sin `current_location_id`
- "En Cola": Defectos con ubicación asignada, listos para reparación
- Bloqueo: No se puede iniciar reparación sin ubicación física

### 3. Modal "Entregar a QA" (Handoff)
- Botón "🔄 Entregar a QA" en barra superior
- Validación: Solo acepta ubicaciones tipo RELEASE
- Timestamp: `received_at_release_station`

### 4. Vista WIP en Tiempo Real
- Tab "📊 WIP" en DefectHospital
- Resumen: Total WIP, En Reparación, En Liberación
- Por ubicación: Barra proporcional, conteo, tiempo promedio
- Colores aging: Verde ≤2h, Amarillo ≤8h, Rojo >8h

### 5. Ubicaciones de Prueba
| Código | Tipo | Descripción |
|--------|------|-------------|
| `HOSP-001` | REPAIR | Mesa reparación 1 |
| `HOSP-002` | REPAIR | Mesa reparación 2 |
| `HOSP-003` | REPAIR | Mesa reparación 3 |
| `REL-A1` | RELEASE | Estación liberación A1 |
| `REL-A2` | RELEASE | Estación liberación A2 |
| `BUFF-01` | BUFFER | Buffer temporal |
| `MRB-01` | MRB | Área MRB |

### 6. Tabla Pivote MRB Multi-Campaña
- Tabla `mrb_campaign_parts` (relación muchos-a-muchos)
- 46 relaciones migradas desde `parts_list` JSONB
- Vistas: `v_campaigns_by_part`, `v_parts_multi_campaign`

### 7. Endpoints Multi-Campaña MRB
| Endpoint | Descripción |
|----------|-------------|
| `GET /mrb/campaigns-by-part/:partId` | Campañas activas por part_id |
| `GET /mrb/campaigns-by-part-number/:partNumber` | Campañas por P/N |
| `GET /mrb/parts-multi-campaign` | Partes con múltiples campañas |
| `POST /mrb/:id/add-part` | Agregar parte a campaña |
| `DELETE /mrb/:id/remove-part/:partId` | Quitar parte de campaña |

### 8. UI Inspección Multi-Campaña MRB
- Detección automática de parte por serial
- Multi-select de campañas (checkboxes)
- OK/NOK por cada campaña individualmente
- Mantiene selección mientras parte no cambie

### 9. Buffer MRB (NUEVO - 2026-05-04)
**Campos en `defect_entries_v2`:**
- `mrb_received_at` - Timestamp entrada al buffer
- `mrb_responsible_area` - SUPPLIER | PRODUCTION | MFG | UNKNOWN

**Vistas:**
- `v_mrb_buffer` - Defectos QUARANTINE sin campaña
- `v_mrb_buffer_summary` - Resumen por área responsable

**Endpoints:**
| Endpoint | Descripción |
|----------|-------------|
| `GET /mrb/buffer` | Lista buffer completo |
| `GET /mrb/buffer/summary` | Resumen por área |
| `PATCH /mrb/buffer/:id/assign-area` | Asignar área responsable |
| `PATCH /mrb/buffer/:id/assign-campaign` | Asignar a campaña |
| `POST /mrb/buffer/batch-assign-campaign` | Asignación batch |

**Frontend:** `/mrb-buffer`
- Filtros por área responsable
- Selección múltiple de defectos
- Modal asignar a campaña MRB
- Indicador de aging (colores)

### 10. Dashboard Hospital (NUEVO - 2026-05-04)
**9 Vistas SQL:**
| Vista | Propósito |
|-------|-----------|
| `v_hospital_dashboard_summary` | KPIs generales |
| `v_hospital_by_repairer` | Stats por técnico |
| `v_hospital_by_releaser` | Stats por inspector QA |
| `v_hospital_repeat_defects` | Seriales con defectos repetidos |
| `v_hospital_by_client` | Desglose por cliente/proyecto |
| `v_hospital_costs` | Costos y tendencias |
| `v_hospital_top_defect_types` | Ranking tipos de defecto |
| `v_hospital_top_parts` | Ranking partes con defectos |
| `v_hospital_throughput` | Throughput diario |

**Endpoints:** `hospitalDashboardEndpoints.js` (10 endpoints)

**Frontend:** `/hospital-dashboard` con 6 tabs:
| Tab | Contenido |
|-----|-----------|
| 📋 Resumen | KPIs + Aging semáforo + Estado WIP |
| 🏭 Operativo | WIP por ubicación + Throughput diario |
| ✅ Calidad | Top defectos/partes + Repetidos + Por cliente |
| 💰 Costos | Scrap + WIP + Tendencias mensuales |
| 👥 Personal | Reparadores + Liberadores (FPY, tiempos) |
| ⚙️ Mi Dashboard | Placeholder configurable |

### 11. Skills & Training Module (NUEVO - 2026-05-05)

**Migración 082 - Esquema completo (12+ tablas):**
- `skill_scales` - Escalas configurables (1-5, ILUO, etc.)
- `skill_scale_levels` - Niveles con colores
- `skill_categories` - Categorías de habilidades
- `skill_definitions` - Definiciones individuales
- `skill_profiles` - Perfiles de puesto
- `skill_profile_skills` - Habilidades por perfil con target
- `user_skill_assignments` - Asignaciones a usuarios
- `skill_evaluations` - Evaluaciones
- `skill_evaluation_scores` - Scores por habilidad
- `training_courses` - Cursos de capacitación
- `user_training_records` - Registros de capacitación

**Escala por defecto (1-5):**
| Nivel | Label | Descripción |
|-------|-------|-------------|
| 1 | Bajo Supervisión | Realiza tareas bajo supervisión |
| 2 | Independiente | Realiza tareas de forma independiente |
| 3 | Líder | Puede liderar grupo |
| 4 | Instructor Interno | Puede instruir personal interno |
| 5 | Experto | Puede entrenar y desarrollar nuevos métodos |

**Endpoints:** `skillsEndpoints.js`
- Escalas, Categorías, Habilidades, Perfiles (CRUD completo)
- Usuarios: team, assignments, photo upload
- Evaluaciones: create, complete, history
- Dashboard: KPIs gerenciales

**Frontend - 5 Páginas:**
| Página | Ruta | Descripción |
|--------|------|-------------|
| SkillsConfig | `/skills/config` | Admin: categorías, habilidades, perfiles |
| SkillsTeam | `/skills/team` | Supervisores: gestionar equipo |
| SkillsProfile | `/skills/profile/:userId` | Perfil con radar chart |
| SkillsEvaluate | `/skills/evaluate/:userId` | Formulario evaluación |
| SkillsDashboard | `/skills/dashboard` | Dashboard gerencial |

**Características:**
- Radar chart (Recharts) para competencias
- Fotos de usuario con upload
- Gap analysis (target vs actual)
- Capacitaciones con vencimiento
- Vista equipo basada en `manager_id`

### 12. Sistema de Permisos Actualizado (2026-05-05)

**Backend - Módulos agregados en `rolesEndpoints.js`:**
- `skills` - Skills & Training (con secciones: config, team, evaluate, dashboard)
- `hospital` - Hospital Dashboard
- `management_review` - Management Review

**Frontend - Home.js - Nuevas tarjetas:**
| Código | Nombre | Ruta |
|--------|--------|------|
| SKL | Skills & Training | /skills/dashboard |
| HOS | Hospital Dashboard | /hospital-dashboard |
| MGT | Management Review | /management-review |

**Frontend - ConfigurationPage.js - Modal roles:**
- Agregados: `hospital`, `skills`, `users`
- Corregido: `audit` → `audits`
- Nueva categoría: "Recursos Humanos"

---

## ARCHIVOS CREADOS/MODIFICADOS (2026-05-04 y 2026-05-05)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `backend/migrations/080_mrb_buffer_fields.sql` | NUEVO | Campos buffer + vistas |
| `backend/migrations/081_hospital_dashboard_views.sql` | NUEVO | 9 vistas dashboard |
| `backend/endpoints/hospitalDashboardEndpoints.js` | NUEVO | 10 endpoints |
| `backend/endpoints/mrbEndpoints.js` | MODIFICADO | +5 endpoints buffer |
| `backend/server.js` | MODIFICADO | Registro hospitalDashboardEndpoints |
| `frontend/src/services/hospitalDashboardService.js` | NUEVO | API calls |
| `frontend/src/pages/HospitalDashboard.js` | NUEVO | Dashboard 6 tabs |
| `frontend/src/pages/MRBBuffer.js` | NUEVO | Gestión buffer MRB |
| `frontend/src/pages/DefectHospital.js` | MODIFICADO | Botón Dashboard |
| `frontend/src/pages/MRBDashboard.js` | MODIFICADO | Botón Buffer |
| `frontend/src/App.js` | MODIFICADO | Rutas nuevas |
| `backend/migrations/082_skills_training_module.sql` | NUEVO | Esquema Skills completo |
| `backend/endpoints/skillsEndpoints.js` | NUEVO | Endpoints Skills |
| `backend/endpoints/rolesEndpoints.js` | MODIFICADO | +3 módulos permisos |
| `frontend/src/services/skillsService.js` | NUEVO | API calls Skills |
| `frontend/src/pages/SkillsConfig.js` | NUEVO | Configuración admin |
| `frontend/src/pages/SkillsTeam.js` | NUEVO | Vista equipo |
| `frontend/src/pages/SkillsProfile.js` | NUEVO | Perfil con radar |
| `frontend/src/pages/SkillsEvaluate.js` | NUEVO | Formulario evaluación |
| `frontend/src/pages/SkillsDashboard.js` | NUEVO | Dashboard gerencial |
| `frontend/src/pages/Home.js` | MODIFICADO | +3 módulos (SKL, HOS, MGT) |
| `frontend/src/pages/ConfigurationPage.js` | MODIFICADO | Módulos en modal roles |

---

## RUTAS DISPONIBLES

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/defect-hospital` | DefectHospital | Gestión reparación/liberación |
| `/hospital-dashboard` | HospitalDashboard | **NUEVO** - Analytics 6 tabs |
| `/mrb-dashboard` | MRBDashboard | Dashboard MRB |
| `/mrb-buffer` | MRBBuffer | **NUEVO** - Buffer QUARANTINE |
| `/mrb-capture` | MRBDefectCapture | Inspección multi-campaña |
| `/mrb-campaigns` | MRBCampaigns | Lista campañas |
| `/skills/dashboard` | SkillsDashboard | **NUEVO** - Dashboard gerencial Skills |
| `/skills/config` | SkillsConfig | **NUEVO** - Configuración admin |
| `/skills/team` | SkillsTeam | **NUEVO** - Vista equipo |
| `/skills/profile/:userId` | SkillsProfile | **NUEVO** - Perfil con radar |
| `/skills/evaluate/:userId` | SkillsEvaluate | **NUEVO** - Formulario evaluación |

---

## ESTADOS DEL SISTEMA

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| **OPEN** | Defecto capturado | Asignar ubicación → Iniciar |
| **IN_REPAIR** | Técnico trabajando | Completar / Cuarentena / Scrap |
| **REPAIRED** | Reparación completa | Entregar a QA |
| **IN_VALIDATION** | En cola de QA | Liberar / Rechazar |
| **REJECTED** | QA rechazó | Vuelve a OPEN |
| **QUARANTINE** | Pendiente MRB | Buffer → Asignar Campaña |
| **SCRAPPED** | Desechado | FIN (con costo) |
| **CLOSED** | Liberado | FIN |

---

## DIAGRAMA DE FLUJO COMPLETO

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
               └─────────────────┘             │                          │
               hospital_intake_at              ▼                          │
                                      ┌─────────────────┐                 │
                                      │     OPEN        │                 │
                                      │   (En Cola)     │                 │
                                      └────────┬────────┘                 │
                                               │ Iniciar                  │
                                               ▼                          │
                                      ┌─────────────────┐                 │
                                      │   IN_REPAIR     │                 │
                                      └────────┬────────┘                 │
                                               │                          │
                       ┌───────────────────────┼───────────────────────┐  │
                       ▼                       ▼                       ▼  │
              ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
              │  QUARANTINE  │        │   REPAIRED   │        │   SCRAPPED   │
              └──────┬───────┘        └──────┬───────┘        └──────────────┘
                     │                       │                        │
                     ▼                       ▼                       FIN
              ┌──────────────┐       ┌─────────────────┐
              │ 📦 BUFFER    │       │ 🔄 ENTREGAR    │
              │    MRB       │       │    A QA        │
              └──────┬───────┘       └────────┬───────┘
                     │                        │
                     ▼                        ▼
              Asignar a               ┌─────────────────┐
              Campaña MRB             │ IN_VALIDATION   │
                     │                └────────┬────────┘
                     ▼                         │
              Inspección              ┌────────┴────────┐
              MRB                     ▼                 ▼
                                ┌──────────┐     ┌──────────┐
                                │ REJECTED │     │  CLOSED  │
                                └────┬─────┘     └──────────┘
                                     │                 FIN
                                     └──► Vuelve a OPEN
```

---

## PENDIENTES (Prioridad)

### Alta - Testing Hospital
- [ ] Probar flujo completo: Captura → Ubicación → Reparar → QA → Liberar
- [ ] Validar subtabs Sin Ubicación / En Cola
- [ ] Probar Dashboard Hospital: Verificar datos en 6 tabs
- [ ] Probar Buffer MRB: QUARANTINE → Asignar área → Asignar campaña

### Alta - Testing MRB Multi-Campaña
- [ ] Detección automática de parte por serial
- [ ] Multi-select de campañas (checkboxes)
- [ ] OK/NOK por cada campaña individualmente
- [ ] Mantiene selección mientras parte no cambie

### Alta - Testing Skills & Training (NUEVO)
- [ ] Crear categorías de habilidades en Config
- [ ] Crear habilidades dentro de cada categoría
- [ ] Crear perfiles de puesto con habilidades
- [ ] Asignar perfil a usuario
- [ ] Realizar evaluación con scores
- [ ] Verificar radar chart en perfil de usuario
- [ ] Probar upload de foto usuario
- [ ] Verificar Dashboard gerencial con KPIs

### Media - Mejoras
- [ ] Tab "Mi Dashboard" en Hospital Dashboard - Widgets arrastrables
- [ ] Auto-refresh en WIP y Buffer (polling cada 30s)
- [ ] Notificaciones de aging crítico (>72h)
- [ ] Alertas de capacitaciones por vencer (Skills)

### Baja - Opcional
- [ ] Campo `shipped_to_logistics_at` (salida de Hospital)
- [ ] Exportar datos de dashboard a Excel
- [ ] Gráficos adicionales de tendencia

---

## NOTAS TÉCNICAS

- Backend usa `transformToCamelCase()` - campos llegan como camelCase al frontend
- Escaneo batch en modales acepta Enter para agregar seriales
- Validación de tipo ubicación: REPAIR para intake, RELEASE para handoff
- Colores aging: Verde ≤2h (Hospital) / ≤24h (Buffer), Amarillo ≤8h / ≤72h, Rojo >8h / >72h
- `unit_cost` se copia de BOM al capturar defecto (histórico)
- Una parte puede tener múltiples campañas MRB (tabla `mrb_campaign_parts`)
- Buffer MRB: Defectos en QUARANTINE sin `mrb_campaign_id`
- **Skills**: Jerarquía de equipo basada en `manager_id` en tabla `users`
- **Skills**: Radar chart usa Recharts con PolarGrid
- **Skills**: Escalas configurables con niveles y colores personalizados

---

## COMANDOS ÚTILES

```bash
# Iniciar backend
cd C:\Users\The Eidrian\quality-alert-system\backend && npm start

# Iniciar frontend
cd C:\Users\The Eidrian\quality-alert-system\frontend && npm start

# Ejecutar migración
node migrations/run_single_migration.js <archivo.sql>

# Ver logs PostgreSQL
# Ubicación: C:\Program Files\PostgreSQL\17\data\log
```

---

*Última actualización: 2026-05-05 - Skills & Training Module + Permisos actualizados*

---

## CONTINUACIÓN SESIÓN 2026-05-05 (Mejoras Skills)

### Migración 083 - Multi-Perfil y Criterios por Nivel

**Archivo:** `backend/migrations/083_skills_enhancements.sql`

**Tabla nueva - Multi-perfil por usuario:**
```sql
CREATE TABLE user_skill_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  profile_id INTEGER REFERENCES skill_profiles(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  UNIQUE(user_id, profile_id, start_date)
);
```

**Campos nuevos en `skill_definitions` - Matriz de competencias:**
| Campo | Descripción |
|-------|-------------|
| `level_1_criteria` | Criterios para alcanzar nivel 1 |
| `level_2_criteria` | Criterios para alcanzar nivel 2 |
| `level_3_criteria` | Criterios para alcanzar nivel 3 |
| `level_4_criteria` | Criterios para alcanzar nivel 4 |
| `level_5_criteria` | Criterios para alcanzar nivel 5 |

**Vista:** `v_user_all_profiles` - Historial de perfiles del usuario

**Vista:** `v_user_evaluation_history` - Historial de evaluaciones para gráfica

### Nuevos Endpoints Skills

| Endpoint | Descripción |
|----------|-------------|
| `GET /skills/users/:userId/profiles` | Todos los perfiles del usuario |
| `POST /skills/users/:userId/profiles` | Agregar perfil |
| `DELETE /skills/users/:userId/profiles/:profileId` | Quitar perfil |
| `GET /skills/users/:userId/history-chart` | Datos para LineChart evolución |

### Cambios Frontend Skills

| Archivo | Cambio |
|---------|--------|
| `SkillsConfig.js` | Selector RGB en lugar de colores limitados |
| `SkillsConfig.js` | Campos level_1-5_criteria en modal habilidad |
| `SkillsConfig.js` | Botón "Mostrar Criterios por Nivel" toggle |
| `SkillsEvaluate.js` | Renombrado a "Evidencia de Capacitación" |
| `SkillsEvaluate.js` | Skills opcionales con checkbox (seleccionar cuáles evaluar) |
| `SkillsProfile.js` | LineChart de evolución histórica |
| `SkillsProfile.js` | Sección multi-perfiles del usuario |
| `SkillsTeam.js` | Badges múltiples perfiles por usuario |
| `SkillsDashboard.js` | Emojis decorativos eliminados |
| `skillsService.js` | +4 funciones para multi-perfil e historial |

### Emojis Removidos (Módulo Skills)

Solo se conservan: ✏️ (editar), 🗑️ (eliminar), 💾 (guardar)

Eliminados de todos los archivos Skills:
- Títulos de secciones (🎯📋⚠️📅📊)
- Headers de navegación
- Estados vacíos (✅)
- Iconos de categoría dinámicos (`{cat.icon}`)

### ThemeSelector Agregado (5 Temas Disponibles)

Se importó `ThemeSelector` de `ThemeContext` y se agregó al header de cada página:

| Archivo | Ubicación |
|---------|-----------|
| `SkillsDashboard.js` | Después de botón "Actualizar" |
| `SkillsTeam.js` | Después de botón "Configuración" |
| `SkillsConfig.js` | Después de botón "Mi Equipo" |
| `SkillsProfile.js` | Junto a botón "Nueva Evidencia" |
| `SkillsEvaluate.js` | Después de botón "Guardar y Completar" |

**Temas disponibles (ThemeContext.js):**
| Tema | Descripción |
|------|-------------|
| `industrial` | Fondo gris claro, tonos azul corporativo (default) |
| `dark` | Modo oscuro con fondos slate |
| `white` | Fondo blanco puro |
| `cream` | Tonos crema/beige cálidos |
| `ocean` | Tonos azul océano |

El tema seleccionado se guarda en `localStorage` como `qms_global_theme`.

### Migración 084 - Reentrenamiento y Simplificación

**Archivo:** `backend/migrations/084_skills_retraining.sql`

**Campo nuevo en `skill_definitions`:**
- `retraining_days` INTEGER - Días para reentrenamiento (NULL = no expira)

**Campo nuevo en `skill_evaluation_scores`:**
- `expires_at` DATE - Fecha de vencimiento (calculada automáticamente por trigger)

**Vistas creadas:**
| Vista | Propósito |
|-------|-----------|
| `v_user_training_history` | Historial completo de capacitaciones (CV) |
| `v_user_current_skills` | Última evaluación de cada habilidad por usuario |
| `v_expiring_training` | Capacitaciones vencidas o por vencer |

**Trigger:** `trg_set_skill_expiry` - Auto-calcula `expires_at` al insertar score

### Modelo Simplificado de Perfiles

- **1 perfil activo** por usuario (`users.skill_profile_id`)
- **Historial de evaluaciones** vinculado a `user_id` (no a perfil)
- Si cambia de perfil, conserva scores históricos de habilidades previas
- El radar chart usa `v_user_current_skills` para mostrar TODAS las habilidades evaluadas

### Campo Reentrenamiento en UI

En SkillsConfig.js → Modal de Habilidad:
- Campo "Reentrenamiento (días)" junto a "Target por defecto"
- Vacío = no expira
- Configurable por habilidad

### Endpoint Actualizado

`GET /skills/profile/:userId` ahora incluye:
- `currentSkills` - Lista de habilidades con vigencia y días restantes
- `radarData` - Usa historial completo (no solo última evaluación)

### Corrección Asignación de Perfiles

**Problema:** El perfil asignado no se mostraba en la página de perfil del usuario.

**Causa:** El endpoint `assignUserProfile` no insertaba en `user_skill_profiles` correctamente.

**Solución:**
1. Desactivar perfiles anteriores antes de asignar nuevo
2. Insertar nuevo registro en `user_skill_profiles`
3. Agregar fallback en `/skills/profile/:userId` para usar `users.skill_profile_id` si no hay registros en `user_skill_profiles`

### Próximos Pendientes

**Skills & Training:**
- [ ] Mostrar tabla de CV/historial de capacitaciones en SkillsProfile.js
- [ ] Indicadores visuales de vencimiento en UI
- [ ] Actualización automática de gráfica al asignar habilidades

**Work Instructions (Nuevo módulo - operadores/inspectores):**
- [ ] Crear módulo similar a Skills pero enfocado en instrucciones de trabajo
- [ ] Control de operaciones y certificaciones de operadores
- [ ] Diferenciarlo de Skills (Staff/Supervisores) vs Work Instructions (Piso)

---

*Última actualización: 2026-05-05 (final) - Reentrenamiento, historial como CV, perfil único, fix asignación*
