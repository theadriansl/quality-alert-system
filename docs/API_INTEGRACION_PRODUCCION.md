# API de Integración con Control de Producción

## Guía para Integradores (SAP, MES, EPICOR, etc.)

---

## Resumen

Esta API permite enviar datos de producción desde sistemas externos para:
- Registrar unidades producidas
- Consultar estado de inspección
- Obtener estadísticas de cobertura

---

## Autenticación

### API Key
Todas las llamadas requieren autenticación mediante API Key.

**Header requerido:**
```
X-API-Key: pk_XXXXXXXX_your_secret_key
```

**Alternativa:**
```
Authorization: Bearer pk_XXXXXXXX_your_secret_key
```

### Obtener API Key
Contactar al administrador del sistema para generar una API Key para su sistema.

---

## Endpoints

### 1. Enviar Datos de Producción

**POST** `/webhook/production`

Registra una o múltiples unidades producidas.

#### Request - Entrada Individual
```json
{
  "serial_number": "SN-2026-0001",
  "part_number": "ABC-123",
  "lot_number": "LOT-2026-001",
  "work_order": "WO-50001",
  "produced_at": "2026-07-06T08:00:00Z",
  "shift": "SHIFT_1"
}
```

#### Request - Batch (múltiples entradas)
```json
{
  "entries": [
    {
      "serial_number": "SN-2026-0001",
      "part_number": "ABC-123",
      "lot_number": "LOT-2026-001",
      "work_order": "WO-50001",
      "produced_at": "2026-07-06T08:00:00Z",
      "shift": "SHIFT_1"
    },
    {
      "serial_number": "SN-2026-0002",
      "part_number": "ABC-123",
      "lot_number": "LOT-2026-001",
      "work_order": "WO-50001",
      "produced_at": "2026-07-06T08:01:00Z",
      "shift": "SHIFT_1"
    }
  ]
}
```

#### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| serial_number | string | **Sí** | Número de serie único de la pieza |
| part_number | string | **Sí** | Número de parte del catálogo |
| lot_number | string | No | Número de lote |
| work_order | string | No | Orden de trabajo |
| produced_at | ISO 8601 | No | Fecha/hora de producción. Default: ahora |
| shift | string | No | Código de turno (SHIFT_1, SHIFT_2, SHIFT_3) |

#### Response - Éxito (200)
```json
{
  "success": true,
  "results": {
    "received": 2,
    "inserted": 2,
    "duplicates": 0,
    "unmatched": 0,
    "errors": []
  },
  "warnings": []
}
```

#### Response - Con Warnings
```json
{
  "success": true,
  "results": {
    "received": 3,
    "inserted": 3,
    "duplicates": 0,
    "unmatched": 1,
    "errors": []
  },
  "warnings": [
    {
      "code": "UNMATCHED_PARTS",
      "message": "1 número(s) de parte no configurado(s)",
      "parts": ["NEW-PART-999"]
    }
  ]
}
```

> **Nota:** Las partes no configuradas se guardan igualmente y pueden vincularse después desde la UI.

---

### 2. Consultar Estado de un Serial

**GET** `/webhook/production/status/{serial}`

#### Response
```json
{
  "success": true,
  "entry": {
    "id": 123,
    "serialNumber": "SN-2026-0001",
    "partNumber": "ABC-123",
    "partName": "Component ABC",
    "inspectionStatus": "PENDING",
    "partStatus": "CONFIGURED",
    "producedAt": "2026-07-06T08:00:00Z",
    "inspectedAt": null,
    "workOrder": "WO-50001",
    "lotNumber": "LOT-2026-001"
  }
}
```

#### Valores de inspectionStatus

| Valor | Descripción |
|-------|-------------|
| PENDING | Pendiente de inspección |
| INSPECTED | Inspeccionado completamente |
| PARTIAL | Inspección parcial |
| SKIPPED | Omitido |

---

### 3. Consultar Estado de Múltiples Seriales

**POST** `/webhook/production/batch-status`

#### Request
```json
{
  "serials": ["SN-2026-0001", "SN-2026-0002", "SN-2026-0003"]
}
```

#### Response
```json
{
  "success": true,
  "results": {
    "SN-2026-0001": {
      "inspectionStatus": "INSPECTED",
      "partStatus": "CONFIGURED",
      "inspectedAt": "2026-07-06T10:30:00Z",
      "partNumber": "ABC-123"
    },
    "SN-2026-0002": {
      "inspectionStatus": "PENDING",
      "partStatus": "CONFIGURED",
      "inspectedAt": null,
      "partNumber": "ABC-123"
    }
  },
  "notFound": ["SN-2026-0003"],
  "summary": {
    "found": 2,
    "notFound": 1,
    "inspected": 1,
    "pending": 1
  }
}
```

---

## Códigos de Error

| Código HTTP | Código | Descripción |
|-------------|--------|-------------|
| 400 | INVALID_FORMAT | Formato de request inválido |
| 400 | EMPTY_PAYLOAD | No se enviaron datos |
| 400 | BATCH_LIMIT_EXCEEDED | Más de 1000 entries en batch |
| 401 | MISSING_API_KEY | No se envió API Key |
| 401 | INVALID_API_KEY | API Key inválida |
| 401 | DISABLED_API_KEY | API Key desactivada |
| 401 | EXPIRED_API_KEY | API Key expirada |
| 403 | FORBIDDEN_IP | IP no autorizada |
| 403 | INSUFFICIENT_PERMISSIONS | Sin permisos para la operación |
| 404 | NOT_FOUND | Serial no encontrado |
| 500 | PROCESSING_ERROR | Error interno |

---

## Límites

| Límite | Valor |
|--------|-------|
| Batch máximo | 1000 entries por llamada |
| Consulta batch máximo | 500 seriales por llamada |
| Rate limit default | 100 requests/minuto |

---

## Ejemplos de Integración

### cURL - Enviar producción
```bash
curl -X POST https://your-server.com/webhook/production \
  -H "Content-Type: application/json" \
  -H "X-API-Key: pk_a1b2c3d4_your_secret_key" \
  -d '{
    "serial_number": "SN-2026-0001",
    "part_number": "ABC-123",
    "work_order": "WO-50001"
  }'
```

### cURL - Batch
```bash
curl -X POST https://your-server.com/webhook/production \
  -H "Content-Type: application/json" \
  -H "X-API-Key: pk_a1b2c3d4_your_secret_key" \
  -d '{
    "entries": [
      {"serial_number": "SN-001", "part_number": "ABC-123"},
      {"serial_number": "SN-002", "part_number": "ABC-123"}
    ]
  }'
```

### Python
```python
import requests

API_KEY = "pk_a1b2c3d4_your_secret_key"
BASE_URL = "https://your-server.com"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

# Enviar producción
data = {
    "entries": [
        {
            "serial_number": "SN-2026-0001",
            "part_number": "ABC-123",
            "work_order": "WO-50001",
            "produced_at": "2026-07-06T08:00:00Z"
        }
    ]
}

response = requests.post(
    f"{BASE_URL}/webhook/production",
    json=data,
    headers=headers
)

print(response.json())
```

### C# (.NET)
```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-API-Key", "pk_a1b2c3d4_your_secret_key");

var data = new {
    entries = new[] {
        new {
            serial_number = "SN-2026-0001",
            part_number = "ABC-123",
            work_order = "WO-50001"
        }
    }
};

var json = JsonSerializer.Serialize(data);
var content = new StringContent(json, Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://your-server.com/webhook/production",
    content
);

var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);
```

### SAP ABAP (Ejemplo conceptual)
```abap
DATA: lv_json TYPE string,
      lo_client TYPE REF TO if_http_client.

" Crear JSON
lv_json = '{"serial_number":"SN-001","part_number":"ABC-123"}'.

" Crear HTTP client
cl_http_client=>create_by_url(
  EXPORTING url = 'https://your-server.com/webhook/production'
  IMPORTING client = lo_client
).

" Headers
lo_client->request->set_header_field(
  name = 'X-API-Key'
  value = 'pk_a1b2c3d4_your_secret_key'
).
lo_client->request->set_header_field(
  name = 'Content-Type'
  value = 'application/json'
).

" Body
lo_client->request->set_cdata( lv_json ).

" Enviar
lo_client->send( ).
lo_client->receive( ).
```

---

## Flujo Recomendado

```
┌─────────────────┐     POST /webhook/production      ┌──────────────────┐
│  Sistema MES/   │ ───────────────────────────────►  │   Quality Alert  │
│  SAP/EPICOR     │     (cada pieza producida)        │     System       │
└─────────────────┘                                   └──────────────────┘
        │                                                      │
        │                                                      │
        │     GET /webhook/production/batch-status             │
        │ ◄─────────────────────────────────────────────────── │
        │     (consulta periódica de estados)                  │
        │                                                      │
        ▼                                                      ▼
┌─────────────────┐                                   ┌──────────────────┐
│   Dashboard     │                                   │   Inspectores    │
│   Producción    │                                   │   (DefectCapture)│
└─────────────────┘                                   └──────────────────┘
```

---

## Soporte

Para solicitar API Key o soporte técnico:
- Email: soporte@empresa.com
- Interno: Ext. 1234

---

*Versión del documento: 1.0*
*Última actualización: 6 de Julio 2026*
