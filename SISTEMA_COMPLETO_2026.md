================================================================================
                        QUALITY ALERT SYSTEM
              Sistema Integral de Gestión de Calidad Industrial
                         http://localhost:3000/
                         Actualizado: Mayo 2026
================================================================================

                                      |
        +-------+-------+-------+-------+-------+-------+-------+-------+
        |       |       |       |       |       |       |       |       |
        v       v       v       v       v       v       v       v       v
     +-----+ +-----+ +-----+ +-----+ +-----+ +-----+ +-----+ +-----+ +-----+
     | 8D  | | ECR | | QAR | | MRB | |AUDIT| |HOSP | |SKILL| | MGT | |ADMIN|
     +-----+ +-----+ +-----+ +-----+ +-----+ +-----+ +-----+ +-----+ +-----+


================================================================================
                    MODULO 1: 8D REPORTS
        Gestión de No Conformidades con Metodología 8 Disciplinas
================================================================================

8D REPORTS
|
+-- Dashboard (/dashboard)
|   +-- Tab Resumen (NUEVO)
|   |   +-- Índice de Riesgo (gauge)
|   |   +-- KPIs: Por Vencer 7d/30d, Estancados, Throughput, Costo Prom.
|   |   +-- Tendencia Mensual (creados vs cerrados)
|   |   +-- SLA D4 Compliance (gauge)
|   |   +-- Distribución por Fase
|   |   +-- Costo por Severidad (pie)
|   +-- Tab Volumen & Flujo
|   +-- Tab Tiempo & Cumplimiento
|   +-- Tab Impacto Económico
|   +-- Tab Calidad de Análisis
|   +-- Tab Proveedores
|   +-- Tab Operación Interna
|   +-- Tab Riesgo & Alertas
|   +-- Tab Mi Dashboard (personalizable)
|
+-- Workflow 8D (/8d-workflow)
|   +-- D1-D3: Formación de Equipo
|   +-- D4: Análisis de Causa Raíz (5 Porqués, Ishikawa)
|   +-- D5: Acciones Correctivas
|   +-- D5-D6-D7: Contramedidas
|   +-- D8: Cierre y Evidencia
|
+-- Consulta (/8d-consultation)
|   +-- Tabla formato dashboard (ACTUALIZADO)
|   +-- Columnas: ID, Título, Proveedor, Severidad, Estado, Fase, Días, Avance, Vence, Costo
|   +-- Filtros expandidos con iconos
|   +-- Acciones: Editar, Borrar (admin)
|   +-- Footer con costo total y promedio días
|
+-- Lecciones Aprendidas (/lessons-learned)
    +-- Repositorio centralizado
    +-- Búsqueda por texto/cliente
    +-- Filtro por severidad

RUTAS:
  /dashboard              - Dashboard 8D con tabs
  /8d-workflow            - Crear/Editar reportes 8D
  /8d-consultation        - Consulta expandida
  /lessons-learned        - Lecciones aprendidas

NORMAS: ISO 9001:10.2 / IATF 10.2.3


================================================================================
                    MODULO 2: ECR/ECO
        Engineering Change Request / Engineering Change Order
================================================================================

ECR/ECO
|
+-- Dashboard (/ecr-dashboard)
|   +-- Widgets Configurables (Drag & Drop)
|   +-- KPIs con Semáforos
|   +-- Matriz de Riesgo (Severity × Occurrence)
|   +-- Filtro con persistencia localStorage
|   +-- Múltiples Temas Visuales
|
+-- Workflow ECR (/ecr-workflow)
|   +-- ECR-1: Tablero de Cambios
|   +-- ECR-2: Descripción del Cambio
|   +-- ECR-2B: Análisis de Impacto (IATF 8.5.6.1)
|   |   +-- Matriz de riesgos por área
|   |   +-- Severity/Occurrence en cada TFT
|   +-- ECR-3: Plan de Validación
|   +-- ECR-4: Cierre y Confirmación
|       +-- Flujo "Cerrar como No Adoptable"
|       +-- Auditoría de cierre
|
+-- Configuración (/ecr-config)
|   +-- Hub de configuración
|   +-- Navegación a sub-módulos
|
+-- Metas de Calidad (/ecr-quality-targets)
|   +-- Cp mínimo (default 1.33)
|   +-- Cpk mínimo (default 1.33)
|   +-- Estabilidad proceso mínima (95%)
|   +-- Scrap inicial máximo (5%)
|
+-- Dashboard Simple (/ecr-dashboard-simple)
    +-- Vista ejecutiva sin personalización

RUTAS:
  /ecr-dashboard          - Dashboard configurable
  /ecr-dashboard-simple   - Dashboard simplificado
  /ecr-workflow           - Crear/Editar ECR
  /ecr-config             - Hub configuración
  /ecr-quality-targets    - Metas de calidad

NORMAS: IATF 8.5.6.1 / 8.5.6.1.1


================================================================================
                    MODULO 3: QUALITY ALERT (QAR)
        Sistema de Alertas de Calidad y Captura de Defectos
================================================================================

QUALITY ALERT
|
+-- Captura de Defectos (/defect-capture)
|   +-- Interfaz Táctil (Tablets)
|   +-- Inspección Pieza por Pieza
|   +-- Disparo Automático de QAR
|
+-- Crear QAR (/qar-create)
|   +-- Modo Automático (por umbrales)
|   +-- Modo Manual
|   +-- Fotos OK vs NOK
|
+-- Lista de QARs (/qar-list)
|   +-- Estados: EMITIDO -> RESPONDIDO -> CERRADO
|
+-- Detalle QAR (/qar-detail/:id)
|   +-- Respuesta y Validación
|   +-- Hilo de Comentarios
|
+-- Dashboard QAR (/qar-dashboard)
|   +-- Vista Ejecutiva
|   +-- Métricas y Tendencias
|
+-- Consulta Avanzada (/defect-query)
|   +-- Filtros Múltiples
|   +-- Gráficas Dinámicas
|   +-- Exportar a Excel
|
+-- Admin Defectos (/defect-admin)
|   +-- Catálogo de Defectos
|   +-- Categorías
|
+-- Configuración (/defect-config)
    +-- Severidades, Estaciones, Turnos, Disposiciones

RUTAS:
  /defect-capture         - Estación de captura
  /qar-create             - Crear QAR
  /qar-list               - Lista QARs
  /qar-detail/:id         - Detalle QAR
  /qar-dashboard          - Dashboard
  /defect-query           - Consulta avanzada
  /defect-admin           - Admin catálogo
  /defect-config          - Configuración

NORMAS: ISO 9001:8.7 / IATF 8.7.1


================================================================================
                    MODULO 4: MRB
        Material Review Board - Campañas de Inspección
================================================================================

MRB (Material Review Board)
|
+-- Dashboard MRB (/mrb-dashboard)
|   +-- KPIs de Campañas
|   +-- Status: Abiertas/Cerradas/Canceladas
|
+-- Crear MRB (/mrb-create)
|   +-- Vincular a QAR o 8D existente
|   +-- Datos de Operación
|   +-- Fotos OK/NOK
|
+-- Lista de Campañas (/mrb-campaigns)
|   +-- Estados: ABIERTA/EN_PROCESO/CERRADA
|
+-- Detalle Campaña (/mrb-campaign/:id)
|   +-- Tarjeta de Origen (QAR/8D)
|   +-- Lista de Defectos
|
+-- Buffer MRB (/mrb-buffer) [NUEVO]
|   +-- Material en CUARENTENA sin campaña
|   +-- Por área: Proveedor, Producción, MFG, Por Definir
|   +-- Selección múltiple + asignación batch
|   +-- Aging visual: Verde (<30d), Amarillo (30-60), Rojo (>60)
|
+-- Captura MRB (/mrb-defect-capture) [NUEVO]
|   +-- Interfaz de captura específica MRB
|
+-- Reporte de Turno (/mrb-shift-report) [NUEVO]
|   +-- Producción, Disposiciones, Downtime
|   +-- Exportar PDF
|
+-- Configuración MRB (/mrb-config) [NUEVO]
    +-- Validadores MRB (toggle por usuario)
    +-- Catálogo de Defectos MRB

RUTAS:
  /mrb-dashboard          - Dashboard
  /mrb-create             - Crear campaña
  /mrb-campaigns          - Lista campañas
  /mrb-campaign/:id       - Detalle
  /mrb-buffer             - Buffer cuarentena
  /mrb-defect-capture     - Captura MRB
  /mrb-shift-report       - Reporte turno
  /mrb-config             - Configuración

NORMAS: IATF 8.7.1.4 / 8.7.1.5


================================================================================
                    MODULO 5: AUDITORIAS INTERNAS [NUEVO]
        Planificación, Ejecución y Seguimiento de Auditorías
================================================================================

AUDITORIAS
|
+-- Dashboard (/audit-dashboard)
|   +-- KPIs: Total Auditorías, Por Estado, NC Abiertas
|   +-- Gráficos: Auditorías por Estado, NC por Tipo
|   +-- Tabs: Overview, Recientes, NC Abiertas, Solicitudes
|
+-- Programas (/audit-programs)
|   +-- Programas anuales de auditoría
|   +-- Estados: Borrador → Aprobado → En Proceso → Completado
|   +-- Filtros por año/estado
|
+-- Detalle Programa (/audit-program/:id)
|   +-- Cronograma de auditorías
|   +-- Asignación de auditores
|
+-- Calendario (/audit-calendar)
|   +-- Vista calendario mensual/semanal
|   +-- Auditorías programadas
|
+-- Crear Auditoría (/audit-schedule-create)
|   +-- Selección de checklist
|   +-- Asignación de auditores
|   +-- Fecha y alcance
|
+-- Checklists (/audit-checklists)
|   +-- Catálogo de preguntas por norma
|   +-- ISO 9001, IATF 16949, VDA 6.3
|
+-- Detalle Checklist (/audit-checklist/:id)
|   +-- Preguntas y criterios
|   +-- Evidencia requerida
|
+-- Ejecución (/audit-execute/:id)
|   +-- Quick-tap interface
|   +-- 6 opciones: Conformidad, NC Mayor, NC Menor, Observación, Oportunidad, N/A
|   +-- Captura de hallazgos con evidencia
|   +-- Notas del auditor
|
+-- Detalle Auditoría (/audit-detail/:id)
|   +-- Resultados consolidados
|   +-- Hallazgos encontrados
|
+-- No Conformidades (/audit-nc-list)
|   +-- Lista y filtrado por estado/tipo
|   +-- Estados: Abierta → En Proceso → Pendiente Verificación → Cerrada
|   +-- Tipos: NC Mayor, NC Menor
|
+-- Detalle NC (/audit-nc/:id)
|   +-- Información del hallazgo
|   +-- Plan de acción
|   +-- Verificación de efectividad
|   +-- Vinculación a 8D/QAR
|
+-- Auditores (/audit-auditors)
|   +-- Gestión de auditores certificados
|   +-- Competencias y certificaciones
|
+-- Solicitudes (/audit-requests)
    +-- Solicitudes de auditoría ad-hoc
    +-- Aprobación/Rechazo

RUTAS:
  /audit-dashboard        - Dashboard
  /audit-programs         - Programas anuales
  /audit-program/:id      - Detalle programa
  /audit-calendar         - Calendario
  /audit-schedule-create  - Crear auditoría
  /audit-checklists       - Catálogo checklists
  /audit-checklist/:id    - Detalle checklist
  /audit-execute/:id      - Ejecutar auditoría
  /audit-detail/:id       - Detalle auditoría
  /audit-nc-list          - Lista NC
  /audit-nc/:id           - Detalle NC
  /audit-auditors         - Gestión auditores
  /audit-requests         - Solicitudes

NORMAS: ISO 9001:9.2 / IATF 9.2.2.1, 9.2.2.2 / VDA 6.3


================================================================================
                    MODULO 6: HOSPITAL DE DEFECTOS [NUEVO]
        Gestión de Reparación, Liberación y Scrap
================================================================================

HOSPITAL
|
+-- Gestión Operativa (/defect-hospital)
|   +-- Tabs: General, Sin Ubicación, En Reparación, Releases
|   +-- Acciones: Reparación, Liberación, Cuarentena, Rechazo
|   +-- Asignación de estaciones/ubicaciones
|   +-- Modales para cada acción con evidencia
|   +-- Catálogos: Tipos reparación, Razones liberación, Causas raíz
|
+-- Dashboard Hospital (/hospital-dashboard)
    +-- 6 Tabs:
    |   +-- Resumen: KPIs principales
    |   +-- Operativo: Throughput, WIP, Aging
    |   +-- Calidad: Defectos repetitivos, First Pass Yield
    |   +-- Costos: Costo reparación, Scrap, Mano de obra
    |   +-- Personal: Top Reparadores, Top Liberadores
    |   +-- Mi Dashboard: Personalizable
    +-- Métricas de Envejecimiento (Aging)
    +-- Tablas: Por Cliente, Por Defecto, Por Reparador

RUTAS:
  /defect-hospital        - Gestión operativa
  /hospital-dashboard     - Dashboard analítico

NORMAS: ISO 9001:8.7 / IATF 8.7.1.4, 8.7.1.6


================================================================================
                    MODULO 7: SKILLS / COMPETENCIAS [NUEVO]
        Gestión de Competencias y Evaluación de Personal
================================================================================

SKILLS
|
+-- Dashboard (/skills-dashboard)
|   +-- KPIs: Usuarios con perfil, Evaluaciones completadas/borrador
|   +-- Capacitaciones por vencer
|   +-- Gráfico Radar: Promedio por categoría
|   +-- Gráfico Pie: Estado evaluaciones
|   +-- Gráfico Bar: Brechas top (gaps)
|
+-- Equipos (/skills-team)
|   +-- Vista por equipo/departamento
|   +-- Matriz de competencias
|
+-- Evaluación (/skills-evaluate)
|   +-- Evaluación de competencias por usuario
|   +-- Escala configurable
|   +-- Evidencia de competencia
|
+-- Perfil (/skills-profile)
|   +-- Perfil individual de competencias
|   +-- Historial de evaluaciones
|   +-- Brechas identificadas
|
+-- Configuración (/skills-config)
    +-- Escalas de Evaluación
    |   +-- Niveles (1-5, A-E, etc.)
    |   +-- Descripciones por nivel
    +-- Categorías
    |   +-- Nombre, Código, Color
    |   +-- Escala asociada
    +-- Definiciones de Habilidades
    |   +-- Criterios por nivel
    |   +-- Evidencia requerida
    +-- Perfiles de Puesto
        +-- Habilidades requeridas por rol
        +-- Nivel mínimo esperado

RUTAS:
  /skills-dashboard       - Dashboard
  /skills-team            - Vista equipos
  /skills-evaluate        - Evaluación
  /skills-profile         - Perfil individual
  /skills-config          - Configuración

NORMAS: ISO 9001:7.2 / IATF 7.2.1, 7.2.3, 7.2.4


================================================================================
                    MODULO 8: MANAGEMENT REVIEW [NUEVO]
        Revisión por la Dirección
================================================================================

MANAGEMENT REVIEW
|
+-- Crear/Editar Acta (/management-review)
    +-- Información General
    |   +-- Fecha de revisión
    |   +-- Período evaluado
    |   +-- Ubicación
    |   +-- Asistentes
    +-- Tabs:
    |   +-- KPIs (snapshot automático del período)
    |   |   +-- 8D: Total, Cerrados, Costo
    |   |   +-- QAR: Alertas, PPM
    |   |   +-- MRB: Campañas, Scrap
    |   |   +-- ECR: Cambios, Impacto
    |   |   +-- Auditorías: NC abiertas
    |   +-- Checklist ISO/IATF 9.3
    |   |   +-- Inputs requeridos
    |   |   +-- Outputs esperados
    |   +-- Acciones Previas
    |       +-- Seguimiento de compromisos anteriores
    +-- Resumen Ejecutivo
    +-- Aprobación y Cierre

RUTAS:
  /management-review      - Crear/Editar acta

NORMAS: ISO 9001:9.3 / IATF 9.3.1, 9.3.2, 9.3.3


================================================================================
                    MODULO 9: STATISTICAL TOOLS [NUEVO]
        Herramientas Estadísticas de Calidad
================================================================================

STATISTICAL TOOLS
|
+-- Panel Principal (/statistical-tools)
    +-- 8 Pestañas:
    |
    +-- Datasets
    |   +-- Carga de datos
    |   +-- Importar desde Excel
    |
    +-- Histograma
    |   +-- Distribución de frecuencias
    |   +-- Curva normal superpuesta
    |
    +-- Pareto
    |   +-- Análisis 80/20
    |   +-- Identificación de vitales
    |
    +-- Capacidad de Proceso
    |   +-- Cp, Cpk, Pp, Ppk
    |   +-- Interpretación automática
    |   +-- Límites de especificación
    |
    +-- SPC (Cartas de Control)
    |   +-- X-bar R
    |   +-- X-bar S
    |   +-- I-MR
    |   +-- p, np, c, u
    |
    +-- Regresión
    |   +-- Lineal simple
    |   +-- R², coeficientes
    |
    +-- Gage R&R
    |   +-- Estudio de repetibilidad
    |   +-- Reproducibilidad
    |   +-- %GRR, ndc
    |
    +-- Taguchi DOE
        +-- Diseño de experimentos
        +-- Arreglos ortogonales

RUTAS:
  /statistical-tools      - Panel herramientas

NORMAS: IATF 8.5.6.1.1 / MSA 4th Ed / SPC 2nd Ed


================================================================================
                    MODULO 10: UNIT TRACEABILITY [NUEVO]
        Trazabilidad de Unidades Individuales
================================================================================

UNIT TRACEABILITY
|
+-- Búsqueda y Timeline (/unit-traceability)
    +-- Búsqueda por Serial/UnitId
    +-- Timeline de Eventos
    |   +-- REGISTERED: Unidad registrada
    |   +-- SPEC_OK/NOK: Resultado especificación
    |   +-- DEFECT_FOUND: Defecto detectado
    |   +-- STATUS_CHANGE: Cambio de estado
    |   +-- NOTE: Nota agregada
    +-- Estados de Unidad
    |   +-- REGISTERED → INSPECTING
    |   +-- → OK / DEFECTIVE
    |   +-- → IN_REPAIR / REPAIRED
    |   +-- → PENDING_REINSPECTION
    |   +-- → RELEASED / SCRAPPED / SHIPPED
    +-- Tabs:
        +-- Timeline: Historial completo
        +-- Especificaciones: Specs evaluadas
        +-- Inspecciones Estación: Por estación

RUTAS:
  /unit-traceability      - Búsqueda y timeline

NORMAS: IATF 8.5.2.1


================================================================================
                    MODULO 11: CLIENTES
        Gestión de Clientes, Proyectos y Partes
================================================================================

CLIENTES
|
+-- Lista de Clientes (/clients)
|   +-- Búsqueda por Nombre
|   +-- Importar/Exportar Excel
|   +-- BOM Global
|
+-- Crear/Editar Cliente (/clients/new, /clients/:id/edit)
|   +-- Información Básica
|   +-- Facturación
|   +-- Configuración (tiempos D4/D5)
|
+-- Detalle Cliente (/clients/:id)
    +-- Proyectos y Partes
    +-- Contactos
    +-- Documentos
    +-- BOM Global
    +-- Configuración

RUTAS:
  /clients                - Lista
  /clients/new            - Crear
  /clients/:id            - Detalle
  /clients/:id/edit       - Editar


================================================================================
                    MODULO 12: ADMINISTRACION
        Usuarios, Roles, Departamentos y Configuración
================================================================================

ADMINISTRACION
|
+-- Gestión de Usuarios (/user-management)
|   +-- Lista con filtros
|   +-- CRUD usuarios
|   +-- Organigrama Visual
|   +-- Gantt de Carga
|
+-- Gestión de Roles (/roles-management) [NUEVO]
|   +-- CRUD de roles
|   +-- Permisos granulares por módulo
|   +-- Clearance Level
|
+-- Gestión de Departamentos (/departments-management) [NUEVO]
|   +-- Árbol jerárquico expandible
|   +-- Estadísticas por departamento
|   +-- CRUD departamentos
|
+-- Workload Manager (/workload)
|   +-- Organigrama con Niveles
|   +-- Gráfica Gantt
|   +-- KPIs QCTSP
|
+-- Matriz de Riesgos (/risk-matrix-config)
|   +-- Severidad (1-4)
|   +-- Ocurrencia (1-4)
|   +-- Matriz 4x4
|
+-- Análisis de Impacto (/impact-analysis-config)
    +-- Áreas de Impacto
    +-- Subsecciones
    +-- Validadores por Defecto

RUTAS:
  /user-management        - Usuarios
  /roles-management       - Roles
  /departments-management - Departamentos
  /workload               - Carga de trabajo
  /risk-matrix-config     - Matriz riesgos
  /impact-analysis-config - Áreas impacto


================================================================================
                    CARACTERISTICAS TRANSVERSALES
================================================================================

+-- Autenticación (JWT)
+-- Multi-idioma (ES/EN)
+-- Temas Visuales (Dark/Light/Ocean/Cream/Gray)
+-- Gráficas Recharts
+-- Dashboards Drag & Drop
+-- Importar/Exportar Excel
+-- Responsive (Desktop/Tablet/Mobile)
+-- localStorage para persistencia de preferencias


================================================================================
                    MAPA COMPLETO ISO 9001 / IATF 16949
================================================================================

+------------------+-------------------------------------------+------------------+
| CLAUSULA         | REQUISITO                                 | MODULO           |
+------------------+-------------------------------------------+------------------+
| 4.1              | Contexto de la organización               | Risk/Context     |
| 4.2              | Partes interesadas                        | Risk/Context     |
| 5.3              | Roles y responsabilidades                 | Admin/Roles      |
| 6.1              | Riesgos y oportunidades                   | Risk Matrix      |
| 6.1.2.3          | Planes de contingencia                    | ECR              |
| 7.1.2            | Personas                                  | Admin/Workload   |
| 7.1.6            | Conocimiento organizacional               | Lessons Learned  |
| 7.2              | Competencia                               | Skills           |
| 7.2.1            | Competencia (suplemento)                  | Skills           |
| 7.2.3            | Competencia auditor interno               | Audit/Auditors   |
| 7.5              | Información documentada                   | Todos            |
| 8.5.1.1          | Plan de control                           | ECR              |
| 8.5.2.1          | Identificación y trazabilidad             | Unit Traceability|
| 8.5.6            | Control de cambios                        | ECR/ECO          |
| 8.5.6.1          | Control cambios (suplemento)              | ECR/ECO          |
| 8.5.6.1.1        | Cambio temporal control proceso           | ECR + Stats      |
| 8.7              | Control de salidas no conformes           | QAR/MRB/Hospital |
| 8.7.1.1          | Autorización concesión cliente            | QAR              |
| 8.7.1.4          | Control producto retrabajado              | Hospital         |
| 8.7.1.5          | Control producto reparado                 | Hospital         |
| 8.7.1.6          | Notificación al cliente                   | QAR              |
| 9.1.1.1          | Monitoreo y medición procesos MFG         | Stats Tools      |
| 9.1.1.2          | Identificación herramientas estadísticas  | Stats Tools      |
| 9.1.1.3          | Aplicación conceptos estadísticos         | Stats Tools      |
| 9.2              | Auditoría interna                         | Auditorías       |
| 9.2.2.1          | Programa de auditoría interna             | Audit Programs   |
| 9.2.2.2          | Auditoría del sistema de gestión          | Audit Execute    |
| 9.2.2.3          | Auditoría del proceso de manufactura      | Audit Execute    |
| 9.2.2.4          | Auditoría del producto                    | Audit Execute    |
| 9.3              | Revisión por la dirección                 | Management Review|
| 9.3.1            | Generalidades                             | Management Review|
| 9.3.2            | Entradas de la revisión                   | Mgmt Rev/KPIs    |
| 9.3.3            | Salidas de la revisión                    | Mgmt Rev/Acta    |
| 10.2             | No conformidad y acción correctiva        | 8D Reports       |
| 10.2.3           | Solución de problemas                     | 8D Workflow      |
| 10.2.4           | A prueba de error                         | 8D/ECR           |
| 10.3.1           | Mejora continua (suplemento)              | Lessons Learned  |
+------------------+-------------------------------------------+------------------+


================================================================================
                    RUTAS COMPLETAS DEL SISTEMA (ACTUALIZADO)
================================================================================

AUTENTICACION:
  /login                    - Inicio de sesión

HOME:
  /                         - Launcher de aplicaciones

MODULO 8D:
  /dashboard                - Dashboard 8D (con tab Resumen)
  /8d-workflow              - Workflow 8D
  /8d-consultation          - Consulta expandida
  /lessons-learned          - Lecciones aprendidas

MODULO ECR/ECO:
  /ecr-dashboard            - Dashboard configurable
  /ecr-dashboard-simple     - Dashboard simplificado
  /ecr-workflow             - Workflow ECR
  /ecr-config               - Hub configuración
  /ecr-quality-targets      - Metas de calidad

MODULO QUALITY ALERT:
  /qar-dashboard            - Dashboard QAR
  /defect-capture           - Captura defectos
  /defect-admin             - Admin catálogo
  /defect-config            - Configuración
  /defect-query             - Consulta avanzada
  /qar-create               - Crear QAR
  /qar-list                 - Lista QARs
  /qar-detail/:id           - Detalle QAR

MODULO MRB:
  /mrb-dashboard            - Dashboard MRB
  /mrb-create               - Crear campaña
  /mrb-campaigns            - Lista campañas
  /mrb-campaign/:id         - Detalle campaña
  /mrb-buffer               - Buffer cuarentena
  /mrb-defect-capture       - Captura MRB
  /mrb-shift-report         - Reporte turno
  /mrb-config               - Configuración MRB

MODULO AUDITORIAS:
  /audit-dashboard          - Dashboard auditorías
  /audit-programs           - Programas anuales
  /audit-program/:id        - Detalle programa
  /audit-calendar           - Calendario
  /audit-schedule-create    - Crear auditoría
  /audit-checklists         - Catálogo checklists
  /audit-checklist/:id      - Detalle checklist
  /audit-execute/:id        - Ejecutar auditoría
  /audit-detail/:id         - Detalle auditoría
  /audit-nc-list            - Lista NC
  /audit-nc/:id             - Detalle NC
  /audit-auditors           - Gestión auditores
  /audit-requests           - Solicitudes

MODULO HOSPITAL:
  /defect-hospital          - Gestión operativa
  /hospital-dashboard       - Dashboard hospital

MODULO SKILLS:
  /skills-dashboard         - Dashboard competencias
  /skills-team              - Vista equipos
  /skills-evaluate          - Evaluación
  /skills-profile           - Perfil individual
  /skills-config            - Configuración

MODULO MANAGEMENT REVIEW:
  /management-review        - Crear/Editar acta

MODULO STATISTICAL TOOLS:
  /statistical-tools        - Herramientas estadísticas

MODULO TRAZABILIDAD:
  /unit-traceability        - Trazabilidad unidades

MODULO CLIENTES:
  /clients                  - Lista clientes
  /clients/new              - Crear cliente
  /clients/:id              - Detalle cliente
  /clients/:id/edit         - Editar cliente

MODULO ADMINISTRACION:
  /user-management          - Gestión usuarios
  /roles-management         - Gestión roles
  /departments-management   - Gestión departamentos
  /workload                 - Carga de trabajo
  /risk-matrix-config       - Matriz riesgos
  /impact-analysis-config   - Áreas impacto


================================================================================
                    RESUMEN EJECUTIVO PARA VENTA (ACTUALIZADO)
================================================================================

+-------------------+------------------------------------------+----------------------------------+------------+
| MODULO            | PROBLEMA QUE RESUELVE                    | BENEFICIO CLAVE                  | STATUS     |
+-------------------+------------------------------------------+----------------------------------+------------+
| 8D Reports        | No conformidades sin seguimiento         | Metodología + Costos + SLA       | APROBADO   |
| ECR/ECO           | Cambios sin control de impacto           | Trazabilidad + Riesgo + Metas    | ON GOING   |
| Quality Alert     | Detección tardía de defectos             | Tiempo real + PPM + Escalamiento | APROBADO   |
| MRB               | Sorteos sin visibilidad                  | Buffer + Turnos + Aging          | APROBADO   |
| Auditorías        | Auditorías en papel sin seguimiento      | Digital + NC → 8D + Calendario   | APROBADO   |
| Hospital          | Reparaciones sin control                 | Throughput + Costos + Personal   | ON GOING   |
| Skills            | Competencias en Excel                    | Evaluación + Brechas + Perfiles  | ON GOING   |
| Management Review | Reuniones sin datos consolidados         | KPIs auto + Checklist + Acta     | ON GOING   |
| Statistical Tools | Análisis estadístico externo             | SPC + Cpk + GRR integrado        | APROBADO   |
| Trazabilidad      | Serial sin historial                     | Timeline + Estados + Evidencia   | ON GOING   |
| Clientes          | Info dispersa de clientes                | Centralizado + BOM + Config      | ON GOING   |
| Admin             | Organigrama y roles manuales             | Roles + Departamentos + QCTSP    | ON GOING   |
+-------------------+------------------------------------------+----------------------------------+------------+

LEYENDA STATUS:
  APROBADO  = Testing completo, módulo funcional validado en producción
  ON GOING  = En desarrollo activo o testing pendiente


================================================================================
                    PROPUESTA DE VALOR UNICA (ACTUALIZADA)
================================================================================

+-----------------------------------------------------------------------------+
|                                                                             |
|   "Sistema integral que cubre el 95% de los requisitos ISO 9001 e          |
|    IATF 16949 en una sola plataforma: desde captura de defectos en         |
|    piso hasta revisión por la dirección, con trazabilidad completa,        |
|    herramientas estadísticas y gestión de competencias."                   |
|                                                                             |
|   COBERTURA NORMATIVA:                                                      |
|   [✓] ISO 9001:2015    [✓] IATF 16949:2016    [✓] VDA 6.3                  |
|   [✓] Core Tools (SPC, MSA)    [✓] Metodología 8D    [✓] FMEA Support      |
|                                                                             |
|   12 MODULOS INTEGRADOS:                                                    |
|   8D | ECR | QAR | MRB | Auditorías | Hospital | Skills |                  |
|   Management Review | Stats | Trazabilidad | Clientes | Admin              |
|                                                                             |
+-----------------------------------------------------------------------------+


================================================================================
                    FIN DEL DOCUMENTO
                    Quality Alert System v2026.05
================================================================================
