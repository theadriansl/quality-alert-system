# IxT-QMS - Modulos del Sistema

## Modulos Principales

### 1. Hospital de Defectos
- Captura de defectos en linea
- Flujo: Captura → Reparacion → Liberacion
- Trazabilidad completa por serial
- Fotos y evidencias
- Reportes y exportacion Excel

### 2. MRB (Material Review Board)
- Gestion de campanas
- Inspeccion masiva
- Asignacion de seriales a campanas
- Dashboard de inventario
- Control de ubicaciones

### 3. 8D Reports
- Metodologia 8D completa (D0-D8)
- Workflow de aprobaciones multinivel
- Generacion de PDF
- Integracion con QAR
- Lessons Learned

### 4. QAR (Quality Alert Reports)
- Alertas de calidad
- Dashboard con graficas
- Filtros por periodo
- Exportacion Excel
- Historial completo

### 5. Auditorias
- Programacion de auditorias
- Checklists personalizables
- Hallazgos y acciones
- Reportes automaticos

### 6. ECR (Engineering Change Request)
- Solicitudes de cambio
- Workflow de aprobaciones
- Impacto en productos
- Historial de versiones

### 7. Calibracion
- Inventario de equipos
- Programacion de calibraciones
- Certificados y evidencias
- Alertas de vencimiento
- Cumplimiento ISO 9001/IATF 16949

### 8. Work Instructions
- Instrucciones de trabajo
- Versionamiento
- Aprobaciones
- Asociacion a estaciones

### 9. Configuracion
- Usuarios y roles
- Estaciones de inspeccion
- Catalogos de defectos
- Tipos de reparacion
- Causas raiz
- Ubicaciones (Location Codes)

---

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| Admin | Acceso total, configuracion |
| Quality Manager | 8D, QAR, Auditorias |
| Quality Engineer | Hospital, MRB, reportes |
| Inspector | Captura defectos, inspecciones |
| Repair Tech | Reparaciones, liberaciones |
| Viewer | Solo lectura |

---

## Flujos Principales

### Flujo Hospital
```
Produccion → Inspeccion → Defecto? → Hospital → Reparacion → Liberacion
                             ↓
                            OK → Continua
```

### Flujo MRB
```
Campana creada → Seriales asignados → Inspeccion → Disposicion
                                                        ↓
                                            Scrap / Rework / Use-as-is
```

### Flujo 8D
```
Problema → D0 (Alerta) → D1 (Equipo) → D2 (Descripcion) → D3 (Contencion)
    → D4 (Root Cause) → D5 (Acciones) → D6 (Implementacion)
    → D7 (Prevencion) → D8 (Cierre)
```

---

## Integraciones

- **Excel:** Exportacion de todos los reportes
- **PDF:** Generacion de reportes 8D
- **Email:** Notificaciones (configurar SMTP)

---

## Base de Datos

### Tablas de Alto Volumen (Particionadas)
- `defect_entries_v2` - Defectos
- `production_entries` - Produccion
- `serial_station_scans` - Trazabilidad
- `spec_inspection_entries` - Inspecciones

### Particionamiento
- Por mes (RANGE en columna de fecha)
- Auto-creacion de particiones futuras
- Scheduler cada 24 horas
