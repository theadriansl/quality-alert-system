# DECLARACIÓN DE PROPIEDAD INTELECTUAL Y AUTORÍA
## Sistema de Gestión de Calidad - Quality Alert System

---

## INFORMACIÓN DEL AUTOR Y PROPIETARIO

**Autor y Propietario:** The Eidrian
**Fecha de Inicio del Proyecto:** 2025
**Última Actualización Documentada:** 28 de Noviembre, 2025
**Ubicación del Código Fuente:** C:\Users\The Eidrian\quality-alert-system

---

## DECLARACIÓN DE PROPIEDAD

Yo, **The Eidrian**, declaro ser el autor original y propietario único de todos los derechos de propiedad intelectual del sistema de software denominado "Quality Alert System" (Sistema de Alertas de Calidad), desarrollado de manera **completamente independiente** y **previo a cualquier relación laboral** con empresas del sector automotriz o de calidad.

Este documento sirve como evidencia verificable de:

1. **Autoría Original**: Todo el código, arquitectura, diseño y documentación fue creado por mí
2. **Desarrollo Independiente**: Realizado en mi tiempo personal, con mis recursos personales
3. **Fecha de Creación**: Iniciado y desarrollado durante el año 2025, previo a cualquier empleo futuro
4. **Propiedad Exclusiva**: Ninguna empresa, organización o tercero tiene derechos sobre este trabajo

---

## DESCRIPCIÓN DEL SISTEMA

### Información General

**Nombre del Sistema:** Quality Alert System
**Tipo:** Aplicación Web Full-Stack
**Propósito:** Sistema integral de gestión de calidad basado en metodología 8D (Eight Disciplines)
**Industria Objetivo:** Sector Automotriz y Manufactura

### Stack Tecnológico

**Backend:**
- Node.js + Express.js
- PostgreSQL (Base de datos relacional)
- JWT para autenticación
- Arquitectura RESTful API

**Frontend:**
- React 19.x
- React Router para navegación
- Axios para comunicación HTTP
- Diseño responsive sin frameworks CSS

**Infraestructura:**
- Sistema de archivos local para uploads
- Migración de base de datos con scripts personalizados
- Transformación automática de convenciones snake_case/camelCase

---

## MÓDULOS Y FUNCIONALIDADES DESARROLLADAS

### 1. Sistema de Autenticación y Usuarios
- Registro y login de usuarios
- Gestión de roles (Administrador, Quality, Engineering, Manufacturing)
- Sistema de permisos por rol
- Jerarquía organizacional con campos de manager, posición y ubicación
- Perfiles de usuario completos

### 2. Gestión de Clientes
**Desarrollado:** Noviembre 2025
- CRUD completo de clientes
- Sistema de timeline con trazabilidad de cambios
- Gestión de contactos por cliente
- Sistema de documentos adjuntos por cliente
- SLA configurable (D4/D5 response times)
- Auditoría de todas las modificaciones con usuario y timestamp

### 3. Gestión de Proyectos y Partes
- CRUD de proyectos vinculados a clientes
- Gestión de partes afectadas
- Sistema de inventario (qty_warehouse, qty_in_process, qty_suspect)
- Cálculo automático de impacto de costos
- Vinculación múltiple de partes a reportes 8D

### 4. Sistema 8D Completo (Eight Disciplines)

#### D0 - Escalation & Team Assignment
- Asignación de equipos multidisciplinarios
- Ruta de escalación configurable (Issue → Countermeasure → Confirmation)
- Presets de equipos reutilizables
- Selección de múltiples responsables por fase

#### D1 - Formación del Equipo
- Asignación de roles específicos
- Emisor y hasta 3 aprobadores por sección
- Sistema de aprobación secuencial

#### D2 - Definición del Problema
- Descripción detallada del problema
- Clasificación por severidad (Low, Medium, High)
- Tipo de problema (Nuevo, Repetitivo)
- Impacto al cliente calculado automáticamente
- Process Flow Builder con drag-and-drop

#### D3 - Acciones de Contención
**D3-MFG (Manufacturing - Desarrollado Noviembre 2025):**
- Múltiples usuarios involucrados en el evento
- Controles temporales del proceso
- Puntos de inspección agregados (ubicación, qué, frecuencia)
- Parámetros del proceso ajustados (de → a, razón)
- Dispositivos Poka-Yoke implementados
- Campos de comentarios y evidencia por cada acción
- Layout en dos columnas optimizado
- Sistema de carga de evidencias fotográficas y documentales
- Migración de datos de usuario singular a múltiples usuarios

**D3-Quality:**
- Detección de puntos de falla
- 5 Why's para análisis de no-detección
- Disposición de material sospechoso
- Garantía de material conforme
- Requerimientos de retrabajo con costos

#### D4 - Análisis de Causa Raíz
- Técnicas de análisis (5 Whys, Fishbone)
- Diagrama de Ishikawa (6M: Man, Machine, Method, Material, Measurement, Environment)
- 5 Why's interactivo (5 niveles de análisis)
- Identificación de causa raíz verificada
- Método y evidencia de verificación

#### D5 - Acciones Correctivas
- Definición de acciones permanentes
- Plan de implementación con fechas
- Responsables asignados
- Validación de efectividad

#### D6 - Implementación y Validación
- Plan de implementación detallado
- Resultados de validación
- Aprobación de Quality (opcional)
- Sistema de aprobación con comentarios de rechazo

#### D7 - Acciones Preventivas
- Mejoras al sistema de calidad
- Lecciones aprendidas documentadas

#### D8 - Cierre y Reconocimiento
- Reconocimiento del equipo
- Lecciones aprendidas
- Documentación final
- Follow-up actions

### 5. Sistema de Aprobaciones
**Desarrollado:** Noviembre 2025

#### Aprobación Secuencial D1-D2-D3
- Workflow de 3 niveles de aprobación
- Estados: draft → pending_approval_1 → pending_approval_2 → pending_approval_3 → approved
- Rechazo con comentarios obligatorios
- Regreso a etapa anterior en caso de rechazo
- Auditoría completa de aprobaciones (quién, cuándo, comentarios)
- Bloqueo de campos durante aprobación
- Solo el aprobador actual puede aprobar/rechazar
- Solo el emisor puede editar después de rechazo

#### Aprobación por Secciones D4-D8
- Aprobación independiente por disciplina
- Campos bloqueables por sección
- Estados independientes por cada D

### 6. Sistema de Attachments
- Subida de archivos (fotos y documentos)
- Tipos diferenciados: photo_no_good, photo_ok, document
- Almacenamiento en filesystem
- Metadata completa (filename, size, mime_type, upload_path)
- Vinculación a reportes 8D
- Preview y descarga de archivos

### 7. Sistema de Auditoría (Audit Log)
- Registro completo de todas las acciones
- Campos auditados:
  - Quién realizó la acción (user_id, user_name)
  - Qué acción se realizó (action_type, action_description)
  - Cuándo se realizó (timestamp)
  - Qué cambió (old_value, new_value)
  - En qué reporte (report_id)
  - Sección afectada (section)
- Tipos de acciones: created, updated, status_changed, approved, rejected, submitted
- Timeline completa de cada reporte 8D

### 8. Dashboard y Reportes
- Estadísticas en tiempo real:
  - Total de reportes 8D
  - Reportes activos vs cerrados
  - Distribución por severidad
  - Costo estimado total
- Reportes recientes (últimos 20)
- Reportes asignados a usuario actual
- Filtros y búsqueda

### 9. Utilitarios y Transformaciones
- **caseTransform.js**: Conversión automática snake_case ↔ camelCase
  - transformToCamelCase(): PostgreSQL → JavaScript
  - transformToSnakeCase(): JavaScript → PostgreSQL
  - Manejo de objetos anidados
  - Preservación de tipos de datos
- Sistema de migración de base de datos con scripts reutilizables
- Validación de datos con express-validator
- Manejo de errores centralizado

---

## ARQUITECTURA Y DISEÑO TÉCNICO

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ 8D Flow  │  │ Clients  │  │ Projects │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│        │              │              │              │       │
│        └──────────────┴──────────────┴──────────────┘       │
│                           │                                 │
│                    Services Layer                           │
│         (eightDService, clientService, etc.)               │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js/Express)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │    8D    │  │ Clients  │  │ Projects │   │
│  │Endpoints │  │Endpoints │  │Endpoints │  │Endpoints │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│        │              │              │              │       │
│        └──────────────┴──────────────┴──────────────┘       │
│                           │                                 │
│                  ┌────────┴────────┐                       │
│                  │ Case Transform  │                       │
│                  │   Middleware    │                       │
│                  └────────┬────────┘                       │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  users   │  │ eightd_  │  │ clients  │  │ projects │   │
│  │          │  │ reports  │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ eightd_  │  │ eightd_  │  │ client_  │  │ project_ │   │
│  │ parts    │  │attachmts │  │ contacts │  │ parts    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                │
│  │  audit_  │  │  team_   │                                │
│  │   log    │  │ presets  │                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Base de Datos

**Tablas Principales:**
1. `users` - Usuarios del sistema con roles y jerarquía
2. `clients` - Clientes con SLA y configuración
3. `client_contacts` - Contactos por cliente
4. `client_documents` - Documentos por cliente
5. `client_timeline` - Historial de cambios de clientes
6. `projects` - Proyectos vinculados a clientes
7. `project_parts` - Catálogo de partes por proyecto
8. `eightd_reports` - Reportes 8D principales
9. `eightd_parts` - Partes afectadas en reportes 8D
10. `eightd_attachments` - Archivos adjuntos
11. `audit_log` - Registro de auditoría
12. `team_presets` - Equipos predefinidos reutilizables

**Campos JSONB (Estructuras Complejas):**
- `escalation_path` - Ruta de usuarios por fase
- `process_flow` - Diagrama de proceso
- `d3_detection_points` - Puntos de detección
- `d3_mfg_temporary_controls` - Controles temporales
- `d3_mfg_inspection_points` - Puntos de inspección
- `d3_mfg_parameters_adjusted` - Parámetros ajustados
- `d3_mfg_poka_yoke_devices` - Dispositivos Poka-Yoke
- `d4_five_whys` - Análisis 5 Why's
- `d4_fishbone_data` - Diagrama Ishikawa
- `d5_corrective_actions` - Acciones correctivas
- `d6_implementation_plan` - Plan de implementación

### Convenciones de Código

**Nomenclatura:**
- Base de datos: `snake_case` (PostgreSQL estándar)
- Backend/Frontend: `camelCase` (JavaScript estándar)
- Transformación automática bidireccional

**Estructura de Archivos:**
```
quality-alert-system/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── endpoints/
│   │   ├── authEndpoints.js
│   │   ├── eightDEndpoints.js
│   │   ├── clientsEndpoints.js
│   │   └── ...
│   ├── utils/
│   │   └── caseTransform.js
│   ├── migrations/
│   │   └── [múltiples archivos SQL]
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── 8D/
│   │   │       ├── D3MFG.js
│   │   │       ├── TeamAssignmentTab.js
│   │   │       └── ...
│   │   ├── pages/
│   │   │   ├── 8DWorkflow.js
│   │   │   ├── ClientManagement.js
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── eightDService.js
│   │   │   ├── clientService.js
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   └── App.js
│   └── package.json
└── README.md
```

---

## INNOVACIONES Y CARACTERÍSTICAS ÚNICAS

### 1. Sistema de Transformación Automática de Casos
- Conversión transparente snake_case ↔ camelCase
- Permite que PostgreSQL y JavaScript usen sus convenciones nativas
- Sin necesidad de mapeo manual en cada endpoint

### 2. Aprobación Secuencial con Trazabilidad
- Sistema de 3 niveles de aprobación completamente auditable
- Bloqueo inteligente de campos según estado
- Solo el aprobador actual puede actuar
- Historial completo de aprobaciones/rechazos

### 3. Timeline de Clientes con Auditoría
- Registro automático de TODOS los cambios
- Comparación old_value vs new_value
- Usuario y timestamp de cada modificación
- Reconstrucción histórica completa

### 4. D3-MFG Multi-Usuario
- Cambio de paradigma: de un responsable a equipo completo
- Migración automática de datos existentes
- Backward compatibility garantizada
- Estructura de datos en dos columnas optimizada

### 5. Process Flow Builder Visual
- Interfaz drag-and-drop para diagrama de proceso
- Almacenamiento eficiente en JSONB
- Reconstrucción del flujo en frontend

### 6. Sistema de Evidencias Integrado
- Evidencias por cada acción individual
- Tipos diferenciados (fotos de problema, fotos OK, documentos)
- Metadata completa de archivos
- Preview integrado en UI

---

## HISTORIAL DE DESARROLLO DOCUMENTADO

### Sesión 1 - Timeline de Clientes (28 Nov 2025)
- Implementación de client_timeline
- Sistema de trazabilidad de cambios
- Auditoría de modificaciones

### Sesión 2 - D3-MFG Multi-Usuario (28 Nov 2025)
- Migración de responsable singular a múltiples usuarios
- Reorganización de layout en dos columnas
- Campos de comentarios y evidencia
- Backward compatibility

### Sesión 3 - Análisis de Inconsistencias (28 Nov 2025)
- Auditoría completa del sistema
- Identificación de 25 inconsistencias
- Documentación de áreas de mejora
- Recomendaciones técnicas

**Evidencia de Fechas:**
- Archivos de resumen: `Resumen.11.28.2025.txt`
- Timestamps en commits de código
- Logs de migraciones de base de datos
- Audit log del sistema

---

## PROPIEDAD INTELECTUAL

### Derechos de Autor

**Titular de Derechos:** The Eidrian
**Fecha de Creación:** 2025
**Tipo de Obra:** Software de aplicación (código fuente + documentación)

### Alcance de los Derechos

Este trabajo incluye pero no se limita a:
- Todo el código fuente (frontend y backend)
- Arquitectura del sistema
- Diseño de base de datos
- Algoritmos y lógica de negocio
- Documentación técnica
- Interfaz de usuario y diseño UX
- Configuraciones y scripts de despliegue

### Restricciones de Uso

Este software fue desarrollado **exclusivamente** por The Eidrian de forma independiente. Cualquier uso, reproducción, distribución o modificación sin autorización expresa constituye una violación de derechos de autor.

---

## EVIDENCIA VERIFICABLE

### Archivos de Evidencia en el Sistema

1. **Código Fuente Completo:**
   - Ubicación: `C:\Users\The Eidrian\quality-alert-system`
   - Frontend: 50+ componentes React
   - Backend: 15+ archivos de endpoints
   - Migraciones: 20+ scripts SQL

2. **Documentación:**
   - `Resumen.11.28.2025.txt` - 1,323 líneas de documentación detallada
   - `EVIDENCIA_PROPIEDAD_INTELECTUAL.md` - Este documento
   - Múltiples archivos .md con especificaciones técnicas

3. **Base de Datos:**
   - Nombre: `apqp_system`
   - 15+ tablas con estructura compleja
   - Datos de prueba y desarrollo

4. **Timestamps del Sistema:**
   - Fechas de creación de archivos
   - Logs de compilación
   - Historial de migraciones ejecutadas

### Información de Contacto del Autor

**Autor:** The Eidrian
**Sistema:** Quality Alert System
**Versión Actual:** 2.0
**Fecha de este Documento:** 28 de Noviembre, 2025

---

## DECLARACIÓN FINAL

Declaro bajo protesta de decir verdad que:

1. Soy el único autor y creador del sistema "Quality Alert System"
2. El desarrollo fue realizado completamente de forma independiente
3. No he utilizado código, arquitectura o diseños de propiedad de terceros sin autorización
4. Este trabajo fue realizado ANTES de cualquier relación laboral futura
5. Mantengo todos los derechos de propiedad intelectual sobre este trabajo
6. Este documento sirve como evidencia de autoría previa a cualquier empleo

Este sistema representa mi trabajo original y creativo en el área de desarrollo de software para gestión de calidad en el sector automotriz.

---

**Fecha de Emisión de este Documento:** 28 de Noviembre, 2025
**Ubicación:** México
**Versión del Documento:** 1.0

---

## ANEXOS

### A. Tecnologías Utilizadas (Detalle)

**Backend:**
- Node.js v18+
- Express.js 4.18.2
- PostgreSQL 16.3
- pg (node-postgres) 8.16.3
- bcryptjs 2.4.3
- jsonwebtoken 9.0.2
- multer 2.0.2
- cors 2.8.5
- dotenv 16.3.1
- express-validator 7.0.1
- helmet 7.0.0

**Frontend:**
- React 19.1.1
- React DOM 19.1.1
- React Router DOM 7.8.2
- Axios 1.11.0
- Lucide React 0.543.0 (iconos)
- @dnd-kit/core 6.3.1 (drag-and-drop)
- ExcelJS 4.4.0
- @react-pdf/renderer 4.3.1

### B. Estadísticas del Proyecto

**Líneas de Código (estimado):**
- Backend: ~5,000 líneas
- Frontend: ~15,000 líneas
- SQL/Migraciones: ~3,000 líneas
- **Total: ~23,000 líneas de código**

**Archivos:**
- Backend: 25+ archivos
- Frontend: 50+ archivos
- SQL: 20+ archivos
- **Total: 95+ archivos**

**Componentes React:** 30+
**Endpoints API:** 40+
**Tablas de Base de Datos:** 15+

### C. Funcionalidades por Módulo (Resumen)

| Módulo | Componentes | Endpoints | Estado |
|--------|-------------|-----------|--------|
| Autenticación | 2 | 2 | ✅ Completo |
| Usuarios | 4 | 3 | ✅ Completo |
| Clientes | 8 | 12 | ✅ Completo |
| Proyectos | 5 | 8 | ✅ Completo |
| 8D Reports | 15+ | 20+ | ✅ Completo |
| Aprobaciones | 3 | 6 | ✅ Completo |
| Attachments | 2 | 4 | ✅ Completo |
| Audit Log | 1 | 1 | ✅ Completo |
| Dashboard | 3 | 2 | ✅ Completo |

---

**FIN DEL DOCUMENTO**

Este documento establece de manera inequívoca la autoría y propiedad intelectual de The Eidrian sobre el "Quality Alert System", desarrollado de forma completamente independiente durante el año 2025, previo a cualquier relación laboral con empresas del sector.

Para cualquier verificación o consulta sobre este trabajo, contactar directamente al autor.
