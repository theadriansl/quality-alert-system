# IxT-QMS - Requisitos del Sistema

## Version del Sistema
- **Version:** 2.0
- **Fecha:** Agosto 2026
- **Ultima actualizacion:** 17-Ago-2026

---

## Software Requerido

### Node.js
- **Version minima:** 18.x
- **Version recomendada:** 20.x LTS
- **Descarga:** https://nodejs.org

### PostgreSQL
- **Version minima:** 15.x
- **Version recomendada:** 17.x
- **Descarga:** https://www.postgresql.org/download
- **Nota:** Asegurar que el servicio este corriendo al iniciar Windows

### Git (opcional, para actualizaciones)
- **Version:** 2.x o superior
- **Descarga:** https://git-scm.com

---

## Hardware Minimo

| Componente | Minimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disco | 20 GB | 50 GB |
| Red | 10 Mbps | 100 Mbps |

---

## Puertos de Red

| Puerto | Servicio | Requerido |
|--------|----------|-----------|
| 3000 | Frontend React | Si |
| 3001 | Backend API | Si |
| 5432 | PostgreSQL | Si |

**Nota:** Si estos puertos estan ocupados, se pueden cambiar en los archivos `.env`

---

## Sistemas Operativos Compatibles

- Windows 10/11
- Windows Server 2019/2022
- Ubuntu 20.04/22.04 LTS
- macOS 12+

---

## Navegadores Compatibles

| Navegador | Version minima |
|-----------|----------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Edge | 90+ |
| Safari | 14+ |

**Nota:** Internet Explorer NO es compatible.

---

## Dependencias del Backend

Estas se instalan automaticamente con `npm install`:

```
express: ^4.18.2
pg: ^8.16.3
bcryptjs: ^2.4.3
jsonwebtoken: ^9.0.2
cors: ^2.8.5
multer: ^2.0.2
helmet: ^7.0.0
xlsx: ^0.18.5
uuid: ^13.0.0
nodemailer: ^8.0.2
```

---

## Dependencias del Frontend

Estas se instalan automaticamente con `npm install`:

```
react: ^18.2.0
react-router-dom: ^6.x
axios: ^1.x
framer-motion: ^10.x
lucide-react: ^0.x
recharts: ^2.x
xlsx: ^0.18.5
```

---

## Estructura de Base de Datos

### Tablas Principales
- `users` - Usuarios del sistema
- `clients` - Clientes/empresas
- `client_parts` - Partes/productos
- `defect_entries_v2` - Registro de defectos (particionada)
- `production_entries` - Registro de produccion (particionada)
- `eightd_reports` - Reportes 8D
- `mrb_campaigns` - Campanas MRB
- `qar_reports` - Reportes QAR

### Tablas Particionadas (alto volumen)
| Tabla | Columna de particion | Particiones |
|-------|---------------------|-------------|
| defect_entries_v2 | created_at | Mensual |
| serial_station_scans | scanned_at | Mensual |
| production_entries | produced_at | Mensual |
| spec_inspection_entries | created_at | Mensual |

---

## Backup Recomendado

### Base de Datos
```bash
pg_dump -U postgres apqp_system > backup_$(date +%Y%m%d).sql
```

### Archivos adjuntos
- Carpeta: `backend/uploads/`
- Frecuencia recomendada: Diario

---

## Contacto Tecnico

Para soporte de instalacion contactar a: [configurar email]
