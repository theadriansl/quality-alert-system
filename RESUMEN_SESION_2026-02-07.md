# Resumen de Sesión - 2026-02-07
## Quality Alert System - QAR Dashboard & DefectQuery

---

================================================================================
 PROTOCOLO OBLIGATORIO - LEER ANTES DE ESCRIBIR CÓDIGO
================================================================================

⚠️ IMPORTANTE: Este proyecto usa CONVENCIONES ESPECÍFICAS que DEBES verificar
ANTES de escribir cualquier código. NO asumas nada.

PASO 1 - VERIFICAR CONVENCIONES DEL BACKEND:
---------------------------------------------
✓ El backend usa utils/caseTransform.js
✓ TODOS los datos de PostgreSQL se convierten a camelCase con transformToCamelCase()
✓ PostgreSQL usa snake_case (ej: client_name, part_number)
✓ Backend/Frontend esperan camelCase (ej: clientName, partNumber)

ANTES de escribir código que acceda a datos del backend:
1. Leer backend/utils/caseTransform.js para confirmar la convención
2. Ver un ejemplo de respuesta del API (usar check_report.js o logs)
3. Verificar que estás usando camelCase, NO snake_case

PASO 2 - NO DAR VUELTAS INNECESARIAS:
--------------------------------------
✓ Si un fix falla 2 veces, DETENTE y explica el problema
✓ No consumir tokens en iteraciones infinitas
✓ Pedir ver logs/datos reales ANTES de asumir
✓ Si no estás seguro, pregunta al usuario

PASO 3 - VERIFICACIÓN ANTES DE ESCRIBIR:
-----------------------------------------
Antes de escribir código, pregúntate:
□ ¿He verificado la convención de nombres del proyecto?
□ ¿He visto un ejemplo real de los datos?
□ ¿Estoy seguro de los nombres de campos (camelCase vs snake_case)?
□ ¿He revisado código similar existente para ver el patrón?

Si la respuesta a CUALQUIERA es "no", DETENTE y verifica primero.

PASO 4 - TRANSPARENCIA:
-----------------------
✓ Si cometí un error, admítelo claramente
✓ No hagas que el usuario pague por corregir TUS errores
✓ Si estás dando vueltas, detente y pide ayuda al usuario

📌 ESTE PROTOCOLO DEBE APARECER AL INICIO DE CADA RESUMEN DE SESIÓN

---

## Completado Hoy

### 1. Mejoras en Etiquetas del QAR Dashboard

**Archivo modificado:** `frontend/src/pages/QARDashboard.js`

| Gráfico | Antes | Después |
|---------|-------|---------|
| IE-QAR | "IE-QAR por Departamento" / "Negativo = Efectivo (bajaron defectos)" | "Mejora % Post-QAR" / "Por departamento (↓ mejor)" |
| Madurez | "Índice compuesto de salud" | "20% Automáticos + 40% Respuesta + 40% Cerrados" |

### 2. Fix Crítico en DefectQuery - Gráficos con Datos Completos

**Problema:** Los gráficos (Pareto, Pie de Severidad, Tendencia) solo mostraban los datos de la página actual de la tabla, no todos los datos filtrados.

**Solución implementada:**

```javascript
// Nuevo estado para datos de gráficos
const [allFilteredEntries, setAllFilteredEntries] = useState([]);

// Nuevo useEffect que trae TODOS los datos filtrados (limit=0)
useEffect(() => {
  const fetchAllForCharts = async () => {
    params.set('limit', 0); // Todos los registros
    // ... fetch con mismos filtros
    setAllFilteredEntries(data.entries);
  };
}, [filterClient, filterProject, ...otros filtros]);

// Funciones de gráficos ahora usan allFilteredEntries
const getParetoData = () => {
  allFilteredEntries.forEach(e => { ... });
};
```

**Archivo modificado:** `frontend/src/pages/DefectQuery.js`

**Cambios:**
- Agregado estado `allFilteredEntries` para almacenar todos los datos filtrados
- Agregado estado `loadingCharts` para indicador de carga
- Nuevo `useEffect` que hace fetch con `limit=0` cuando cambian filtros
- Funciones `getParetoData()`, `getSeverityPieData()`, `getDailyTrendData()` ahora usan `allFilteredEntries`
- Agregado indicador visual: "📊 Gráficos basados en X registros filtrados (todas las páginas)"

---

## Estructura Actual del QAR Dashboard

| Fila | Título | Contenido |
|------|--------|-----------|
| **1** | Estado General | KPIs: Activos, Vencidos, Tiempo Respuesta, Críticos sin QAR |
| **2** | Impacto Real | Pre vs Post QAR, QARs No Emitidos, Tendencia 60 días |
| **3** | Accountability | Mejora % Post-QAR, Pareto Estación, Pareto Departamento |
| **4** | Alerta Temprana | Defectos Recurrentes, Responsables en Riesgo, Gauge Madurez |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/QARDashboard.js` | Mejoras en etiquetas de gráficos |
| `frontend/src/pages/DefectQuery.js` | Fix: gráficos muestran todos los datos filtrados |

---

## Fórmulas del Dashboard

### IE-QAR (Mejora % Post-QAR)
```
IE-QAR = ((Defectos POST - Defectos PRE) / Defectos PRE) × 100

Negativo = Bueno (defectos bajaron)
Positivo = Malo (defectos subieron)
```

### Madurez del Sistema
```javascript
maturityScore =
  (pctAutomatic * 0.20) +                    // 20% QARs automáticos
  (100 - avgResponseHours * 4) * 0.40 +      // 40% Velocidad respuesta
  (pctClosed * 0.40)                         // 40% QARs cerrados
```

### QAR Vencido
- Status = 'EMITIDO' y created_at < NOW() - 1 día

---

## Contexto del Sistema QAR

### Estados de QAR
1. **EMITIDO** - Recién creado, esperando respuesta
2. **RESPONDIDO** - Responsable respondió, esperando validación
3. **RECHAZADO** - Calidad rechazó la respuesta
4. **CERRADO** - Validado y cerrado

### Configuración de Validadores
- Solo usuarios con `can_validate_qar = true` pueden validar
- Se configuran en `/defect-config` pestaña "Validadores QAR"
- Solo ADMIN puede agregar/quitar validadores

---

## Notas Técnicas

### DefectQuery - Arquitectura de Datos
```
Filtros → useEffect #1 (tabla paginada) → entries (página actual)
       → useEffect #2 (gráficos)        → allFilteredEntries (todos)
```

- La tabla usa `entries` con paginación normal
- Los gráficos usan `allFilteredEntries` sin límite
- El export a Excel también usa fetch con `limit=0`

---

---

## Módulo MRB - Transformación Completa (Session 2)

### Resumen de Cambios

El módulo MRB (Material Review Board) fue transformado de una copia del sistema QAR a un sistema propio con terminología específica para gestión de material no conforme.

### Cambios de Estados

| Estado Anterior (QAR) | Estado Nuevo (MRB) | Descripción |
|-----------------------|-------------------|-------------|
| EMITIDO | ABIERTA | Caso abierto, pendiente de disposición |
| RESPONDIDO | EN_PROCESO | Disposición registrada, pendiente validación |
| RECHAZADO | CANCELADA | Caso cancelado |
| CERRADO | CERRADA | Caso validado y cerrado |

### Archivos Frontend Modificados

| Archivo | Cambios Principales |
|---------|---------------------|
| `MRBDashboard.js` | Todos los labels QAR → MRB, botones, KPIs, secciones |
| `MRBCreate.js` | `qarNumber` → `mrbNumber`, endpoint `/qar` → `/mrb`, status default `ABIERTA` |
| `MRBCampaigns.js` | `qars` → `mrbs`, estados actualizados, título "Material Review Board" |
| `MRBCampaignDetail.js` | `qar` → `mrbCase`, `loadQar()` → `loadMrb()`, sección "Disposición del Material" |

### Archivos Backend Modificados

| Archivo | Cambios Principales |
|---------|---------------------|
| `mrbEndpoints.js` | Todos los queries con estados actualizados, mensajes en español, respuestas con `mrb` en lugar de `qar` |

### Cambios de Terminología UI

| Concepto QAR | Concepto MRB |
|--------------|--------------|
| "Nuevo QAR" | "Nuevo MRB" |
| "Lista QAR" | "Casos MRB" |
| "QAR Activos" | "MRBs Abiertos" |
| "QAR Vencidos" | "MRBs Vencidos" |
| "Respuesta al QAR" | "Disposición del Material" |
| "Enviar Respuesta" | "Enviar Disposición" |
| "QAR Emitido" | "Caso MRB Abierto" |
| "Responder" | "Disponer" |

### Rutas del Módulo MRB

```
/mrb-dashboard     → Dashboard ejecutivo MRB
/mrb-create        → Crear nuevo caso MRB
/mrb-campaigns     → Lista de casos MRB
/mrb-campaign/:id  → Detalle de caso MRB
```

### API Endpoints MRB

```
GET    /mrb                    → Lista casos
GET    /mrb/dashboard-stats    → Estadísticas dashboard
GET    /mrb/:id                → Detalle de caso
POST   /mrb                    → Crear caso (status: ABIERTA)
PUT    /mrb/:id                → Actualizar caso
POST   /mrb/:id/respond        → Registrar disposición (→ EN_PROCESO)
POST   /mrb/:id/validate       → Validar/Cancelar (→ CERRADA/CANCELADA)
POST   /mrb/:id/comments       → Agregar comentario
POST   /mrb/upload-photo       → Subir foto evidencia
```

---

## Estado del Proyecto

✅ **App lista para uso**
✅ **Módulo MRB transformado completamente**

---

## Próximos Pasos (Pendientes)

### Alta Prioridad
1. **Agregar campos MRB-específicos en DB y UI:**
   - `clean_point_date` - Fecha/hora del Clean Point
   - `disposition_type` - Tipo de disposición (Usar, Retrabajar, Scrap, Devolver)
   - `quantity_on_hold` - Cantidad de piezas retenidas
   - `quantity_affected` - Cantidad afectada total
   - `location` - Ubicación del material

2. **Crear migración SQL para nuevas columnas en `mrb_campaigns`**

3. **Actualizar formulario MRBCreate.js con nuevos campos**

4. **Actualizar MRBCampaignDetail.js para mostrar/editar nuevos campos**

### Media Prioridad
5. **Dashboard MRB específico:**
   - KPI: Material en Hold (cantidad/valor)
   - KPI: Tiempo promedio de disposición
   - Pareto por tipo de disposición
   - Tendencia de Clean Points

6. **Reportes MRB:**
   - Reporte de material retenido por ubicación
   - Reporte de disposiciones por período

### Baja Prioridad
7. **Integración con inventario** (si aplica)
8. **Notificaciones automáticas de MRB vencidos**
9. **Exportar casos MRB a Excel/PDF**

---

## Notas Técnicas MRB

### Diferencia conceptual QAR vs MRB

| Aspecto | QAR | MRB |
|---------|-----|-----|
| Propósito | Alertar sobre defectos recurrentes | Gestionar material no conforme |
| Trigger | Umbral de defectos en período | Detección de material sospechoso |
| Acción | Acción correctiva al proceso | Disposición del material físico |
| Cierre | Validar que acción fue efectiva | Confirmar disposición ejecutada |
| Métrica clave | Reducción de defectos post-QAR | Tiempo de disposición, cantidad resuelta |

### Base de Datos

```sql
-- Tabla principal (ya existe)
mrb_campaigns (
  id, campaign_number, client_id, project_id, part_id,
  title, description, severity_id, department_id,
  status, -- ABIERTA, EN_PROCESO, CERRADA, CANCELADA
  assigned_to, reported_by, responded_by, validated_by,
  root_cause, corrective_action, resolution_notes,
  photo_ok_path, photo_nok_path,
  created_at, response_date, validation_date, closed_at
)

-- Tablas relacionadas
mrb_recipients (mrb_campaign_id, user_id, recipient_type)
mrb_comments (mrb_campaign_id, user_id, comment, comment_type)

-- Defectos vinculados via:
defect_entries_v2.mrb_campaign_id
```

---

## Comandos Útiles

```bash
# Iniciar backend
cd backend && npm start

# Iniciar frontend
cd frontend && npm start

# Ver logs del backend
tail -f backend/logs/combined.log
```
