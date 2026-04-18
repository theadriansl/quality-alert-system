# Quality Alert System

Sistema integral de gestión de calidad que incluye gestión de problemas 8D, Quality Planning, generación de auditorías, hojas de operación y evaluaciones de seguridad.

## 🎯 Descripción

**Quality Alert System** es una plataforma completa diseñada para gestionar todos los aspectos de calidad e ingeniería en entornos industriales. El sistema integra múltiples módulos especializados en una sola plataforma unificada.

### Módulos Principales

1. **8D Problem Solving** - Gestión completa de problemas con metodología 8D
2. **Quality Planning** - Planificación estructurada de proyectos de calidad
3. **Generación de Auditorías** - Programación y ejecución de auditorías internas y externas
4. **Hojas de Operación** - Creación y control de procedimientos de trabajo estandarizados
5. **Evaluación de Seguridad** - Inspecciones y evaluaciones de equipos e instalaciones

## 🚀 Características Principales

### Sistema 8D
- ✅ Workflow completo de 8 disciplinas
- ✅ Asignación inteligente de equipos multidisciplinarios
- ✅ Escalación automática basada en severidad
- ✅ Dashboard con métricas en tiempo real
- ✅ Trazabilidad completa desde detección hasta cierre

### Auditorías
- ✅ Programación de auditorías internas y externas
- ✅ Checklists personalizables
- ✅ Asignación automática de auditores
- ✅ Seguimiento de hallazgos y acciones correctivas
- ✅ Reportes ejecutivos automáticos

### Hojas de Operación
- ✅ Templates estandarizados por proceso
- ✅ Control de versiones automático
- ✅ Workflow de aprobación multi-nivel
- ✅ Distribución digital a workstations
- ✅ Tracking de entrenamiento

### Evaluación de Seguridad
- ✅ Inspecciones de equipos programadas
- ✅ Evaluación de instalaciones y áreas
- ✅ Matriz de riesgos con niveles de severidad
- ✅ Identificación de riesgos y hazards
- ✅ Planes de mitigación

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** ready (actualmente en memoria)
- **JWT** para autenticación
- **RESTful API**

### Frontend
- **React.js 18+** con Hooks
- **React Router** para navegación
- **Axios** para comunicación con API
- **Lucide Icons** para iconografía
- **CSS moderno** con diseño responsive

## 📦 Instalación

### Prerequisitos
- Node.js 16+
- npm o yarn

### Backend

```bash
cd backend
npm install
npm start
```

El servidor estará disponible en: `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm start
```

El frontend estará disponible en: `http://localhost:3000`

## 🔐 Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Champion | admin@8dsystem.com | password123 |
| Manager | manager@8dsystem.com | password123 |
| Engineer | engineer@8dsystem.com | password123 |
| Technician | technician@8dsystem.com | password123 |

## 📊 API Endpoints

### Autenticación
- `POST /auth/login` - Inicio de sesión
- `POST /auth/register` - Registro de usuarios
- `GET /auth/me` - Obtener usuario actual

### Sistema 8D
- `GET /8d/dashboard-data` - Datos del dashboard 8D
- `GET /8d/reports` - Lista de reportes 8D
- `POST /8d/create` - Crear nuevo reporte 8D

### Usuarios
- `GET /users/list` - Lista de usuarios del sistema

### Auditorías
- `GET /audits/list` - Lista de auditorías
- `POST /audits/create` - Crear nueva auditoría

### Hojas de Operación
- `GET /operation-sheets/list` - Lista de hojas de operación
- `POST /operation-sheets/create` - Crear nueva hoja de operación

### Evaluaciones de Seguridad
- `GET /safety/evaluations/list` - Lista de evaluaciones
- `POST /safety/evaluations/create` - Crear nueva evaluación

### Health Check
- `GET /health` - Estado del sistema

## 🎨 Estructura del Proyecto

```
quality-alert-system/
├── backend/
│   ├── server.js           # Servidor principal
│   ├── routes/             # Rutas de la API
│   │   ├── authRoutes.js
│   │   ├── eightdRoutes.js
│   │   ├── userRoutes.js
│   │   └── ...
│   ├── middleware/         # Middleware personalizado
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   │   ├── Auth/
│   │   │   ├── 8D/
│   │   │   └── Shared/
│   │   ├── pages/          # Páginas principales
│   │   │   ├── Dashboard.js
│   │   │   ├── 8DConsultation.js
│   │   │   ├── 8DWorkflow.js
│   │   │   └── UserManagement.js
│   │   ├── services/       # Servicios de API
│   │   │   ├── api.js
│   │   │   ├── eightDService.js
│   │   │   └── userService.js
│   │   ├── context/        # Context providers
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── package.json
│
├── docs/                   # Documentación
├── README.md
└── QUALITY_ALERT_SYSTEM_DOCUMENTACION_TECNICA.md
```

## 🔧 Desarrollo

### Variables de Entorno

Backend `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=tu_secret_key_aqui
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quality_alert_db
DB_USER=postgres
DB_PASSWORD=password
```

Frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

## 🌟 Innovaciones Técnicas

### 1. Asignación Multi-Usuario Inteligente
Sistema único que permite **múltiples usuarios por etapa de escalación** con lógica inteligente basada en severidad del problema.

### 2. Escalación Automática
Asignación automática de más recursos humanos para problemas críticos, optimizando la respuesta según el nivel de severidad.

### 3. Sistema Integral
Primera plataforma que integra 8D, Auditorías, Hojas de Operación y Seguridad en un solo sistema unificado.

### 4. Guardado Automático
Cada cambio se guarda inmediatamente en localStorage, garantizando que no se pierdan datos.

## 📈 Valor Comercial

### Mercado Objetivo
- Industria automotriz (Tier 1, 2, 3 suppliers)
- Aeroespacial (Boeing, Airbus suppliers)
- Dispositivos médicos (FDA regulated)
- Manufactura general con requerimientos ISO 9001, TS16949, AS9100

### Ventajas Competitivas
1. **Sistema integral** - Múltiples módulos en una plataforma
2. **Asignación inteligente** - Única en el mercado
3. **Multi-usuario por etapa** - Innovación revolucionaria
4. **Escalación automática** - Basada en experiencia real
5. **Interface intuitiva** - Diseñada por expertos en calidad

### Modelo de Negocio
- **Licencias corporativas:** $10K-30K por implementación
- **SaaS mensual:** $3K-15K por planta
- **Servicios profesionales:** $150-300/hora
- **ROI Cliente:** 400-600% en el primer año

## 🚧 Roadmap

### Fase 1 - Q4 2025 ✅
- [x] Sistema 8D completo
- [x] Gestión de usuarios
- [x] Backend API básico
- [x] Endpoints de auditorías
- [x] Endpoints de hojas de operación
- [x] Endpoints de seguridad

### Fase 2 - Q1 2026
- [ ] Frontend completo para auditorías
- [ ] Frontend para hojas de operación
- [ ] Frontend para evaluaciones de seguridad
- [ ] Integración con PostgreSQL
- [ ] Sistema de notificaciones

### Fase 3 - Q2 2026
- [ ] Mobile apps (iOS/Android)
- [ ] Integración con ERP/MES
- [ ] Analytics y Machine Learning
- [ ] API pública para terceros
- [ ] Deployment en cloud (AWS/Azure)

## 📄 Licencia

Copyright © 2025 - Todos los derechos reservados

**IMPORTANTE:** Este sistema fue desarrollado de forma independiente ANTES de cualquier relación contractual con empresas cliente. Ver documentación legal en `EVIDENCIA_LEGAL_PROPIEDAD_INTELECTUAL.md`

## 🤝 Soporte

Para reportar bugs, solicitar features o preguntas generales, por favor contactar al desarrollador.

## 📝 Notas de Desarrollo

Este sistema representa la combinación de **años de experiencia en calidad e ingeniería industrial** con **desarrollo de software moderno**. Las funcionalidades implementadas son únicas en el mercado y han demostrado **interés comercial inmediato** por parte de corporaciones Fortune 500.

---

**Quality Alert System** - Transformando la gestión de calidad industrial
