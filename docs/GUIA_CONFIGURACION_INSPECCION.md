# Guía de Configuración de Inspección y Ubicaciones

## Conceptos Clave

### 1. Estaciones de Inspección (`inspection_stations`)

Son **puntos físicos** donde se realiza inspección de calidad.

| Tipo | Propósito | Ejemplos |
|------|-----------|----------|
| `INSPECTION` | Puntos de inspección en línea | Inspección de Recibo, Inspección Final, GP12 |
| `REPAIR` | Estaciones de reparación en Hospital | Apariencia, Funcional Repair |
| `RELEASE` | Estaciones de liberación en Hospital | Hospital Liberación |
| `MRB` | Material Review Board | MRB |

### 2. Etapas del Proceso (`inspection_stages`)

Son **fases del proceso productivo** donde puede encontrarse una pieza.

| Ejemplos |
|----------|
| Recepción, Almacén, Ensamble, Pruebas, Empaque, Embarque |

### 3. Ubicaciones (`location_codes`)

Son **códigos de ubicación física** para rastrear dónde está el material en Hospital.

| Tipo | Uso | Requiere Estación |
|------|-----|-------------------|
| `REPAIR` | Mesa/área de reparación | ✅ Sí (tipo REPAIR) |
| `RELEASE` | Área de liberación | ✅ Sí (tipo RELEASE) |
| `BUFFER` | Almacenamiento temporal | ❌ No |
| `MRB` | Material en revisión | ❌ No |

---

## Flujo de Configuración

### A. Configurar Especificaciones (Checklist)

**Ruta:** `Defect Admin → Especificaciones`

1. Seleccionar **Cliente** y **Parte**
2. Crear especificaciones:
   - **Dimensionales:** Con límites (LI, Nominal, LS) y unidad
   - **Cualitativas:** Con valores aceptables
   - **BOM:** Componentes del ensamble

3. **IMPORTANTE:** Asignar estaciones de inspección
   - El checklist solo aparece si la spec está asignada a la estación actual
   - Sin estación asignada = la spec NO aparece en ningún checklist

### B. Configurar Ubicaciones

**Ruta:** `Defect Admin → Ubicaciones`

1. Crear código único (ej: `HOSP-001`, `REL-A1`)
2. Seleccionar tipo:
   - **Reparación:** Para mesas de reparación → requiere estación tipo REPAIR
   - **Liberación:** Para áreas de liberación → requiere estación tipo RELEASE
   - **Buffer:** Almacenamiento temporal → no requiere estación
   - **MRB:** Material en revisión → no requiere estación

---

## Flujo de Captura de Defectos

```
┌─────────────────────────────────────────────────────────────────┐
│ DefectCapture                                                    │
│                                                                  │
│ 1. Seleccionar: Cliente → Proyecto → Parte                      │
│ 2. Seleccionar: Estación (donde está el inspector)              │
│ 3. Seleccionar: Inspector, Turno                                │
│ 4. Escanear/ingresar Serial                                     │
│                                                                  │
│ Si la parte tiene specs asignadas a esta estación:              │
│   → Aparece botón "Checklist"                                   │
│   → Completar verificación de specs                             │
│   → Si hay NOK → se crea defecto automáticamente                │
│                                                                  │
│ Si no hay specs o ya se verificaron:                            │
│   → Capturar defectos manualmente                               │
│   → O marcar "Pieza OK"                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Hospital

```
┌─────────────────────────────────────────────────────────────────┐
│ Hospital de Defectos                                             │
│                                                                  │
│ 1. Defecto llega a Hospital (status: OPEN)                      │
│                                                                  │
│ 2. Asignar ubicación:                                           │
│    - Escanear código de ubicación (ej: HOSP-001)                │
│    - Sistema valida tipo de ubicación vs estación               │
│                                                                  │
│ 3. Reparar:                                                      │
│    - Tomar defecto en estación REPAIR                           │
│    - Documentar reparación                                       │
│    - Si es defecto de SPEC: re-verificar especificación         │
│                                                                  │
│ 4. Liberar:                                                      │
│    - Solo en estación RELEASE                                   │
│    - Si es defecto de SPEC: debe pasar re-verificación OK       │
│    - Cambiar status a RELEASED                                  │
│                                                                  │
│ Alternativas:                                                    │
│    - SCRAP: Desechar pieza                                      │
│    - MRB: Enviar a Material Review Board                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Defectos de Especificación (SPEC)

Cuando una spec falla (NOK) en el checklist:

1. Se registra en `spec_inspection_entries`
2. Se crea automáticamente defecto tipo `SPEC_FAILURE`
3. El defecto tiene `spec_id` vinculado
4. En Hospital, para liberar:
   - Debe re-verificarse la spec
   - Solo se libera si re-verificación = OK

---

## Troubleshooting

### El checklist no aparece
- Verificar que la parte tenga specs configuradas
- Verificar que las specs estén asignadas a la estación actual

### Defecto de spec no se crea
- Revisar consola del navegador (F12) para logs `[Checklist]`
- Verificar que exista tipo `SPEC_FAILURE` en defect_types

### No aparecen todas las estaciones en Ubicaciones
- Es correcto: solo muestra estaciones tipo REPAIR/RELEASE
- Las estaciones tipo INSPECTION son para captura, no para Hospital

---

*Última actualización: 26 de Julio 2026*
