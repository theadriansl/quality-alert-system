# Dependencias BOM ↔ 8D (D2 - Describir el Problema)

**Fecha:** 2026-01-08
**Análisis:** Campos del BOM requeridos por el módulo 8D

---

## Resumen Ejecutivo

El módulo 8D en la disciplina **D2 (Describir el Problema)** depende directamente de los datos del BOM (Bill of Materials). Esta integración permite calcular el impacto económico de los problemas de calidad usando información de partes existente.

---

## Arquitectura del Flujo de Datos

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   Cliente   │  →   │   Proyecto   │  →   │  Partes (BOM)   │  →   │  8D Report (D2)  │
└─────────────┘      └──────────────┘      └─────────────────┘      └──────────────────┘
                                                   ↓
                                          ┌─────────────────┐
                                          │ Inventario 8D   │
                                          │ + Cantidades    │
                                          │ + Costo Total   │
                                          └─────────────────┘
```

---

## 1. Campos Críticos del BOM en D2

### 1.1 Campos OBLIGATORIOS (Usados en Cálculos)

| Campo BOM | Tipo | Uso en D2 | Importancia |
|-----------|------|-----------|-------------|
| `partNumber` | String | Identificación única de la parte | ⚠️ CRÍTICO |
| `partName` | String | Descripción de la parte | ⚠️ CRÍTICO |
| `unitCost` | Float | Cálculo de impacto de costo total | ⚠️ CRÍTICO |

**Fórmula de Cálculo de Impacto:**
```javascript
totalAffectedQty = qtyWarehouse + qtyInProcess + qtyInTransit + qtyWithCustomer
totalCostImpact = totalAffectedQty × unitCost  // ← unitCost viene del BOM
```

### 1.2 Campos OPCIONALES (Usados en Display)

| Campo BOM | Tipo | Uso en D2 | Importancia |
|-----------|------|-----------|-------------|
| `clientPartNumber` | String | Mostrar número de parte del cliente | 🟡 Recomendado |
| `customFields` | JSON Object | Información adicional de la parte | 🟢 Opcional |
| `description` | String | Descripción extendida | 🟢 Opcional |
| `revision` | String | Revisión de la parte | 🟢 Opcional |

---

## 2. Componentes y Archivos Clave

### 2.1 Backend - Endpoints de BOM

**Archivo:** `backend/endpoints/clientPartsEndpoints.js:7-98`

**Endpoint Crítico:**
```
GET /clients/:clientId/parts?activeOnly=true
```

**Respuesta:**
```json
{
  "success": true,
  "projectGroups": [
    {
      "projectId": 123,
      "projectNumber": "P-2024-001",
      "projectName": "Proyecto X",
      "parts": [
        {
          "id": 456,
          "partNumber": "PN-12345",
          "partName": "Bracket Assembly",
          "clientPartNumber": "CUST-XYZ-001",
          "unitCost": 12.50,
          "customFields": {
            "Supplier": "ACME Corp",
            "Material": "Steel"
          }
        }
      ]
    }
  ]
}
```

### 2.2 Frontend - Componentes de D2

#### A. TeamAssignmentTab.js (D1-D2-D3)

**Archivo:** `frontend/src/components/8D/TeamAssignmentTab.js`

**Secciones Clave de D2:**

1. **Selección de Cliente/Proyecto/Partes** (líneas 2288-2440)
   - Cliente → carga proyectos y partes activas del BOM
   - Proyecto → filtra partes por proyecto
   - Partes → multi-selección con checkboxes

2. **Inventario de Partes Afectadas** (líneas 2487-2497)
   - Usa el componente `PartsInventoryTable`
   - Pasa `selectedParts` del BOM
   - Agrega cantidades por ubicación

3. **Descripción del Problema** (líneas 2543-2567)
   - Descripción textual del problema
   - Tipo de problema (Nuevo/Repetitivo)
   - Fotos de evidencia (No Good y OK)

**Handlers de Datos:**

```javascript
// Línea 658: Cuando se selecciona un cliente
const handleClientChange = async (clientId) => {
  // 1. Cargar proyectos del cliente
  const projectsResponse = await fetch(`/clients/${clientId}/projects`);

  // 2. Cargar TODAS las partes ACTIVAS del cliente
  const partsResponse = await fetch(`/clients/${clientId}/parts?activeOnly=true`);

  setAvailableParts(partsData.parts); // ← Partes del BOM disponibles
};

// Línea 682: Cuando se selecciona un proyecto
const handleProjectChange = async (projectId) => {
  // Cargar partes específicas del proyecto
  const response = await fetch(`/projects/${projectId}/parts`);
  setAvailableParts(data.parts);
};

// Línea 701: Toggle de selección de partes
const handlePartToggle = (part) => {
  setSelectedParts(prev => {
    const isSelected = prev.some(p => p.id === part.id);
    return isSelected
      ? prev.filter(p => p.id !== part.id)
      : [...prev, part]; // ← Parte completa del BOM con todos sus campos
  });
};
```

**Guardado de Datos (línea 1645-1659):**
```javascript
onDataUpdate({
  ...escalationData,
  selectedClient,    // ← Del BOM
  selectedProject,   // ← Del BOM
  selectedParts,     // ← Del BOM (con unitCost, partNumber, etc.)
  photoNoGood,
  photoOK,
  attachedDocuments,
  d3Data
});
```

#### B. PartsInventoryTable.js

**Archivo:** `frontend/src/components/8D/PartsInventoryTable.js`

**Dependencias del BOM:**

```javascript
// Línea 286-290: Renderizar datos del BOM
<td>{part.partNumber || part.part_number || 'N/A'}</td>  // ← Del BOM
<td>{part.partName || part.part_name || 'Sin descripción'}</td>  // ← Del BOM

// Línea 346-348: Costo unitario (read-only del BOM)
<td>${(parseFloat(part.unitCost) || 0).toFixed(2)}</td>  // ← Del BOM

// Línea 31-32: Cálculo de impacto usando unitCost del BOM
const unitCost = parseFloat(part.unitCost) || 0;
part.totalCostImpact = part.totalAffectedQty * unitCost;  // ← DEPENDE DEL BOM
```

**Campos que el 8D AGREGA (NO del BOM):**
- `qtyWarehouse` - Cantidad en almacén
- `qtyInProcess` - Cantidad en proceso
- `qtyInTransit` - Cantidad en tránsito
- `qtyWithCustomer` - Cantidad con cliente
- `totalAffectedQty` - Total calculado
- `totalCostImpact` - Impacto calculado usando `unitCost` del BOM

**Custom Fields en 8D vs BOM:**

El módulo 8D tiene su PROPIO sistema de columnas personalizadas, SEPARADO del BOM:

```javascript
// Línea 38-50: Handler de campos personalizados 8D
const handleCustomFieldChange = (partIndex, fieldName, value) => {
  part.customFields[fieldName] = value;  // ← Mismo formato que BOM
};

// Los custom fields de 8D se almacenan en: part.customFields[columnId]
// Los custom fields del BOM también usan: part.customFields[fieldName]
// COMPATIBILIDAD: Ambos usan la misma estructura JSON
```

**Estructura de Custom Columns 8D:**
```javascript
{
  id: "custom_1234567890",
  name: "ECR Number",
  type: "text" | "number" | "date"
}
```

---

## 3. Flujo de Datos Completo

### 3.1 Carga Inicial (D2 - Selección de Partes)

```
1. Usuario selecciona CLIENTE
   └─→ Fetch: GET /clients/{id}/projects
   └─→ Fetch: GET /clients/{id}/parts?activeOnly=true
       └─→ Devuelve: projectGroups con todas las partes activas

2. Usuario selecciona PROYECTO
   └─→ Fetch: GET /projects/{id}/parts
       └─→ Filtra partes por proyecto específico

3. Usuario selecciona PARTES (checkboxes)
   └─→ Estado: selectedParts[] con objetos completos del BOM
   └─→ Incluye: partNumber, partName, unitCost, customFields, etc.
```

### 3.2 Tabla de Inventario (D2 - Partes Afectadas)

```
1. Componente PartsInventoryTable recibe:
   └─→ parts={selectedParts}  // Del BOM
   └─→ customColumns={customColumns}  // Del 8D

2. Por cada parte del BOM:
   ├─→ Display: partNumber, partName (del BOM)
   ├─→ Display: unitCost (read-only del BOM)
   ├─→ Input: qtyWarehouse, qtyInProcess, qtyInTransit, qtyWithCustomer
   ├─→ Cálculo: totalAffectedQty = suma de cantidades
   └─→ Cálculo: totalCostImpact = totalAffectedQty × unitCost (BOM)

3. Campos personalizados 8D:
   └─→ Renderiza columnas adicionales si existen
```

### 3.3 Guardado del Reporte 8D

```
1. Click en "Guardar" o "Enviar a Aprobación"
   └─→ onDataUpdate() con:
       ├─→ selectedClient (del BOM)
       ├─→ selectedProject (del BOM)
       ├─→ selectedParts[] (del BOM + datos de inventario 8D)
       ├─→ customColumns[] (definiciones de columnas 8D)
       └─→ Otros datos de D2 (descripción, fotos, etc.)

2. Backend guarda:
   └─→ Tabla: 8d_reports
       ├─→ client_id
       ├─→ project_id
       ├─→ project_number
       ├─→ project_name
       └─→ selected_parts (JSON con datos completos)
```

---

## 4. Puntos Críticos de Integración

### 4.1 ¿Qué pasa si falta `unitCost` en el BOM?

**Impacto:**
```javascript
// PartsInventoryTable.js línea 31
const unitCost = parseFloat(part.unitCost) || 0;  // ← Default 0
part.totalCostImpact = part.totalAffectedQty * 0;  // ← Impacto = $0
```

**Resultado:** El reporte 8D mostrará impacto de costo $0, perdiendo información crítica para el análisis.

**Solución:** Validar que todas las partes activas en el BOM tengan `unitCost` > 0.

### 4.2 ¿Qué pasa si se actualiza `unitCost` en el BOM después de crear el reporte 8D?

**Problema:** Los reportes 8D guardan una COPIA de los datos del BOM en el momento de creación.

**Implicación:** Si el `unitCost` cambia en el BOM, los reportes 8D históricos NO se actualizan.

**Comportamiento Actual:** Correcto para auditoría (mantiene snapshot histórico).

### 4.3 Custom Fields: BOM vs 8D

| Aspecto | BOM Custom Fields | 8D Custom Columns |
|---------|-------------------|-------------------|
| **Definición** | Dinámicos por parte | Definidos por usuario en D2 |
| **Persistencia** | En tabla `client_parts.custom_fields` | En reporte 8D `selected_parts[].customFields` |
| **Compatibilidad** | Estructura JSON idéntica | ✅ Compatible |
| **Uso** | Info de parte (Material, Supplier, etc.) | Info adicional 8D (ECR#, Drawing#, etc.) |
| **Herencia** | 8D puede leer custom fields del BOM | BOM no lee custom fields de 8D |

**Ejemplo de Herencia:**
```javascript
// BOM tiene:
part.customFields = { "Supplier": "ACME Corp", "Material": "Steel" }

// 8D hereda estos campos Y puede agregar más:
part.customFields = {
  "Supplier": "ACME Corp",      // ← Del BOM
  "Material": "Steel",           // ← Del BOM
  "custom_8d_ecr": "ECR-2024-05" // ← Agregado en 8D
}
```

---

## 5. Recomendaciones

### 5.1 Validaciones en el BOM

**Campos Obligatorios para 8D:**
```sql
-- Al insertar/actualizar client_parts
ALTER TABLE client_parts
  ADD CONSTRAINT check_unit_cost_positive
  CHECK (unit_cost > 0);

-- Validar que partes activas tengan costo
SELECT id, part_number, part_name, unit_cost
FROM client_parts
WHERE active = true AND (unit_cost IS NULL OR unit_cost = 0);
```

### 5.2 UI/UX en BOM

**Indicador Visual:**
- Agregar badge "🔗 Usado en 8D Reports" a partes referenciadas
- Mostrar alerta al intentar desactivar partes usadas en reportes 8D activos

### 5.3 Integración Futura

**Posibles Mejoras:**
1. **Sincronización Opcional:** Permitir actualizar `unitCost` en reportes 8D no finalizados
2. **Validación de Integridad:** Endpoint para verificar si partes del BOM están completas antes de crear 8D
3. **Reportes de Uso:** Dashboard mostrando qué partes del BOM se usan más frecuentemente en 8D

---

## 6. Checklist de Validación

Antes de crear un reporte 8D, verificar:

- [ ] Cliente tiene al menos 1 proyecto activo
- [ ] Proyecto tiene al menos 1 parte activa
- [ ] Todas las partes activas tienen:
  - [ ] `partNumber` único y no nulo
  - [ ] `partName` no vacío
  - [ ] `unitCost` > 0
- [ ] Custom fields del BOM (si existen) son válidos JSON
- [ ] Backend devuelve partes con estructura completa

---

## 7. Endpoints de Referencia

| Endpoint | Método | Propósito | Campos BOM Devueltos |
|----------|--------|-----------|----------------------|
| `/clients/:id/parts?activeOnly=true` | GET | Listar partes activas del cliente | projectGroups[].parts[] |
| `/projects/:id/parts` | GET | Listar partes de un proyecto | parts[] |
| `/8d/reports/:id` | GET | Obtener reporte 8D | selected_parts[] (snapshot) |
| `/8d/reports/:id` | PUT | Actualizar reporte 8D | Acepta selected_parts[] actualizado |

---

## 8. Conclusión

El módulo 8D depende **críticamente** de tres campos del BOM:

1. **`partNumber`** - Identificación única
2. **`partName`** - Descripción legible
3. **`unitCost`** - Cálculos de impacto económico

**Dependencia Unidireccional:**
```
BOM → 8D (snapshot al crear reporte)
```

Los reportes 8D guardan una copia de los datos del BOM al momento de creación, garantizando integridad histórica pero sin sincronización automática.
