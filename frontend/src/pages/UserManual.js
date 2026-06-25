/**
 * User Manual - Sistema de Gestión de Calidad
 * Manual integrado en el sistema con navegación por módulos
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Book, ChevronRight, ChevronDown, Search, Home,
  FileText, AlertTriangle, ClipboardList, Shield,
  Users, Settings, Layers, Target,
  CheckCircle, Clock, ArrowRight, Info, Lightbulb,
  UserCheck, Wrench, TrendingUp
} from 'lucide-react';

// ============================================
// CONTENIDO DEL MANUAL POR MÓDULO
// ============================================

const MANUAL_CONTENT = {
  ecr: {
    id: 'ecr',
    title: 'ECR - Engineering Change Request',
    icon: FileText,
    description: 'Gestión de Solicitudes de Cambio de Ingeniería',
    sections: [
      {
        id: 'ecr-intro',
        title: 'Introducción',
        content: `
## ¿Qué es un ECR?

Un **ECR (Engineering Change Request)** es una solicitud formal para modificar un producto, proceso o sistema. El módulo ECR permite gestionar todo el ciclo de vida de un cambio de ingeniería, desde la solicitud inicial hasta la implementación y cierre.

### Normas que cumple
- **IATF 16949:2016** - Cláusula 8.5.6 (Control de cambios)
- **IATF 16949:2016** - Cláusula 8.5.6.1 (Control de cambios - Suplemento)

### Beneficios
- Trazabilidad completa de cambios
- Análisis de impacto estructurado
- Aprobaciones multinivel
- Evidencia de validación
- Historial auditable
        `
      },
      {
        id: 'ecr-access',
        title: 'Acceso al Módulo',
        content: `
## Cómo acceder

### Desde el Home
1. Inicia sesión en el sistema
2. En la pantalla principal (Home), busca la tarjeta **"ECR/ECO"**
3. Haz clic en la tarjeta para acceder al Dashboard

### URLs directas
| Página | URL | Descripción |
|--------|-----|-------------|
| Dashboard | \`/ecr-dashboard\` | Vista ejecutiva con KPIs |
| Crear ECR | \`/ecr-workflow\` | Iniciar nuevo ECR |
| Configuración | \`/ecr-config\` | Ajustes del módulo |

### Permisos requeridos
- **Usuario básico**: Puede crear y editar ECRs asignados
- **Aprobador**: Puede aprobar/rechazar etapas
- **Administrador**: Acceso completo + configuración
        `
      },
      {
        id: 'ecr-dashboard',
        title: 'Dashboard ECR',
        content: `
## Dashboard ECR

El dashboard proporciona una vista ejecutiva del estado de todos los ECRs.

### KPIs principales
- **Total ECRs**: Cantidad total en el período
- **Abiertos**: ECRs en proceso
- **Cerrados**: ECRs completados
- **No Adoptables**: ECRs que no se implementarán

### Widgets disponibles
Los widgets son configurables mediante drag & drop:

| Widget | Descripción |
|--------|-------------|
| Semáforo de Estados | Distribución por estado actual |
| Matriz de Riesgo | Severidad × Ocurrencia |
| Tendencia Mensual | ECRs creados/cerrados por mes |
| Por Departamento | Distribución por área |
| Tiempo Promedio | Días promedio de cierre |
| Top Razones | Motivos más frecuentes de cambio |

### Filtros
- **Período**: Mes actual, trimestre, año, todos
- **Estado**: Draft, En aprobación, Aprobado, Cerrado
- **Departamento**: Filtrar por área responsable

### Personalización
1. Haz clic en el ícono de engranaje
2. Arrastra los widgets para reordenar
3. Activa/desactiva widgets según necesites
4. Los cambios se guardan automáticamente
        `
      },
      {
        id: 'ecr-workflow',
        title: 'Flujo de Trabajo (Workflow)',
        content: `
## Etapas del ECR

El ECR se divide en 4 etapas principales:

### ECR-1: Tablero de Cambios
**Objetivo**: Registrar la solicitud inicial

Campos requeridos:
- Título del cambio
- Tipo de cambio (Diseño, Proceso, Material, etc.)
- Motivo del cambio
- Urgencia
- Responsable

**Acciones disponibles**:
- Guardar borrador
- Enviar a aprobación

---

### ECR-2: Descripción del Cambio
**Objetivo**: Detallar el cambio propuesto

#### ECR-2A: Información General
- Cliente afectado
- Proyectos impactados
- Números de parte
- Descripción detallada del cambio
- Condición actual vs propuesta

#### ECR-2B: Análisis de Impacto
- Áreas afectadas (Producción, Calidad, Logística, etc.)
- Severidad por área (1-4)
- Ocurrencia por área (1-4)
- Responsable de validación por área (TFT)

**Importante**: Cada área marcada genera una tarea de validación (TFT).

---

### ECR-3: Plan de Validación
**Objetivo**: Documentar las pruebas y validaciones

Secciones:
- Plan de pruebas
- Resultados de validación
- Evidencia fotográfica
- Criterios de aceptación
- Firma de validadores

**Aprobaciones**:
- Nivel 1: Responsable directo
- Nivel 2: Gerente de área
- Nivel 3: Director/Gerente General

---

### ECR-4: Cierre y Confirmación
**Objetivo**: Cerrar formalmente el ECR

#### Checklist de Auditoría
- [ ] Documentación actualizada
- [ ] Personal capacitado
- [ ] Materiales actualizados
- [ ] Herramentales modificados
- [ ] Sistema ERP actualizado

#### Resultados de Producción
- ISIR completado
- Cp ≥ 1.0
- Cpk ≥ 1.0

#### Cierre Normal vs No Adoptable
- **Normal**: El cambio se implementa
- **No Adoptable**: El cambio se rechaza (requiere motivo)
        `
      },
      {
        id: 'ecr-create',
        title: 'Crear un ECR',
        userType: 'operator',
        content: `
## Cómo crear un nuevo ECR

### Paso 1: Acceder al formulario
1. Ve a \`/ecr-workflow\` o haz clic en "Nuevo ECR" desde el dashboard
2. Se abrirá el formulario en la etapa ECR-1

### Paso 2: Completar ECR-1
1. **Título**: Describe brevemente el cambio (máx. 100 caracteres)
2. **Tipo de cambio**: Selecciona de la lista
   - Diseño de producto
   - Proceso de manufactura
   - Material/Proveedor
   - Herramental
   - Empaque
3. **Motivo**: Explica por qué se necesita el cambio
4. **Urgencia**: Normal, Alta, Crítica
5. **Responsable**: Selecciona al líder del cambio

### Paso 3: Guardar
- **Guardar borrador**: Guarda sin enviar (puedes editar después)
- **Enviar a aprobación**: Inicia el flujo de aprobaciones

### Paso 4: Completar ECR-2
Una vez aprobado ECR-1:
1. Selecciona cliente y proyectos afectados
2. Indica los números de parte impactados
3. Describe la condición actual
4. Describe la condición propuesta
5. Completa el análisis de impacto por área

### Paso 5: Seguimiento
- El sistema notifica a los aprobadores
- Puedes ver el estado en el dashboard
- Recibirás notificaciones de aprobación/rechazo
        `
      },
      {
        id: 'ecr-approve',
        title: 'Aprobar un ECR',
        userType: 'approver',
        content: `
## Proceso de Aprobación

### Notificaciones
Cuando un ECR requiere tu aprobación:
1. Recibirás un correo electrónico
2. El ECR aparecerá en tu bandeja de pendientes
3. El dashboard mostrará el contador de pendientes

### Revisar el ECR
1. Abre el ECR desde el enlace del correo o el dashboard
2. Revisa toda la información de las etapas anteriores
3. Verifica:
   - ¿La información está completa?
   - ¿El análisis de impacto es correcto?
   - ¿Los responsables están asignados?

### Acciones disponibles

#### Aprobar
1. Haz clic en "Aprobar"
2. Opcionalmente agrega comentarios
3. Confirma la acción
4. El ECR avanza al siguiente nivel o etapa

#### Rechazar
1. Haz clic en "Rechazar"
2. **Obligatorio**: Escribe el motivo del rechazo
3. Confirma la acción
4. El ECR regresa al responsable para corrección

### Niveles de aprobación
Cada etapa tiene hasta 3 niveles:
- **Nivel 1**: Aprobación técnica/operativa
- **Nivel 2**: Aprobación gerencial
- **Nivel 3**: Aprobación directiva (si aplica)

### Historial
Todas las acciones quedan registradas:
- Quién aprobó/rechazó
- Fecha y hora
- Comentarios
        `
      },
      {
        id: 'ecr-tft',
        title: 'Tareas de Validación (TFT)',
        content: `
## Cross-Functional Team (TFT)

### ¿Qué es el TFT?
El TFT (Team Funcional Transversal) son las validaciones que cada área afectada debe completar antes de aprobar el cambio.

### Cómo funciona
1. En ECR-2B se marcan las áreas afectadas
2. Se asigna un responsable por área
3. Cada responsable recibe una tarea de validación
4. Deben confirmar:
   - Impacto revisado
   - Acciones necesarias identificadas
   - Recursos disponibles

### Completar una validación TFT
1. Accede al ECR asignado
2. Ve a la sección ECR-2B
3. Encuentra tu área en la lista
4. Completa los campos:
   - Severidad del impacto (1-4)
   - Ocurrencia esperada (1-4)
   - Comentarios de validación
5. Marca como "Validado"

### Estados de TFT
| Estado | Descripción |
|--------|-------------|
| Pendiente | Esperando validación |
| En revisión | El responsable está evaluando |
| Validado | Área confirmó el impacto |
| Requiere acción | Se identificaron acciones previas |

### Matriz de Riesgo
La severidad × ocurrencia genera un nivel de riesgo:
- **Verde (1-4)**: Riesgo bajo
- **Amarillo (5-9)**: Riesgo medio
- **Rojo (10-16)**: Riesgo alto
        `
      },
      {
        id: 'ecr-close',
        title: 'Cerrar un ECR',
        content: `
## Proceso de Cierre (ECR-4)

### Requisitos previos
Antes de cerrar, verifica que:
- [x] ECR-1, ECR-2, ECR-3 estén aprobados
- [x] Todas las validaciones TFT completadas
- [x] Evidencia de validación cargada

### Checklist de Auditoría
Completa cada ítem del checklist:

1. **Documentación**
   - Dibujos actualizados
   - Especificaciones revisadas
   - Instrucciones de trabajo modificadas

2. **Capacitación**
   - Personal notificado
   - Entrenamiento completado (si aplica)

3. **Materiales**
   - BOM actualizado
   - Inventario verificado

4. **Producción**
   - ISIR completado
   - Resultados Cp/Cpk satisfactorios

### Tipos de cierre

#### Cierre Normal (Aprobado)
El cambio se implementa exitosamente:
1. Completa el checklist
2. Ingresa resultados de producción
3. Envía a aprobación de cierre
4. 3 niveles firman
5. Estado final: **CERRADO**

#### Cierre como No Adoptable
El cambio no se implementará:
1. Marca "Cerrar como No Adoptable"
2. **Obligatorio**: Escribe el motivo
3. Envía a aprobación
4. 3 niveles confirman la no adopción
5. Estado final: **CERRADO (No Adoptable)**

### Historial de cierre
El sistema registra:
- Fecha de cierre
- Quién cerró
- Tipo de cierre
- Motivo (si no adoptable)
        `
      },
      {
        id: 'ecr-config',
        title: 'Configuración',
        userType: 'admin',
        content: `
## Configuración del Módulo ECR

**Acceso**: Solo administradores

### Metas de Calidad (/ecr-quality-targets)
Define los criterios mínimos de aceptación:

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| Cp mínimo | 1.33 | Capacidad de proceso |
| Cpk mínimo | 1.33 | Capacidad centrada |
| Estabilidad | 95% | % mínimo de estabilidad |
| Scrap máximo | 5% | % máximo de scrap inicial |

### Áreas de Impacto
Configura las áreas disponibles para análisis TFT:
1. Ve a \`/impact-analysis-config\`
2. Agrega/edita áreas
3. Define subsecciones por área
4. Asigna validadores por defecto

### Matriz de Riesgo
Personaliza la matriz de severidad × ocurrencia:
1. Ve a \`/risk-matrix-config\`
2. Define niveles de severidad (1-4)
3. Define niveles de ocurrencia (1-4)
4. Configura colores y umbrales

### Aprobadores
Los aprobadores se configuran en:
1. \`/user-management\` - Asignar roles
2. \`/roles-management\` - Definir permisos

### Notificaciones
El sistema envía correos automáticos:
- Al crear un ECR
- Al enviar a aprobación
- Al aprobar/rechazar
- Al cerrar
        `
      },
      {
        id: 'ecr-tips',
        title: 'Tips y Mejores Prácticas',
        content: `
## Consejos para un ECR exitoso

### Al crear el ECR
- **Título claro**: "Cambio de proveedor de resina X" es mejor que "Cambio material"
- **Motivo específico**: Explica el problema o la oportunidad
- **Evidencia**: Adjunta datos que soporten la necesidad del cambio

### Durante el análisis de impacto
- Involucra a todas las áreas desde el inicio
- No subestimes los impactos
- Documenta las acciones de mitigación

### En la validación
- Completa las pruebas antes de solicitar aprobación
- Guarda evidencia fotográfica
- Registra todos los resultados, incluso los negativos

### Para aprobadores
- Revisa el historial de comentarios
- Verifica que las correcciones anteriores se hayan atendido
- Usa el rechazo como herramienta de mejora, no de castigo

### Errores comunes a evitar
- Crear ECR sin análisis de impacto completo
- Omitir áreas afectadas
- No documentar la validación
- Cerrar sin completar el checklist
- No capacitar al personal antes de implementar

### Métricas de éxito
Un buen proceso de ECR se mide por:
- Tiempo promedio de cierre < 30 días
- % de rechazos en primera revisión < 20%
- % de ECRs cerrados como "No Adoptable" < 10%
        `
      }
    ]
  },
  '8d': {
    id: '8d',
    title: '8D Reports - Problem Solving',
    icon: AlertTriangle,
    description: 'Metodología estructurada de resolución de problemas',
    sections: [
      {
        id: '8d-intro',
        title: 'Introducción',
        content: `
## ¿Qué es la Metodología 8D?

La metodología **8D (Eight Disciplines)** es un proceso estructurado de resolución de problemas desarrollado originalmente por Ford Motor Company. Consiste en 8 disciplinas o pasos diseñados para identificar, corregir y eliminar problemas recurrentes.

### Normas que cumple
- **IATF 16949:2016** - Cláusula 10.2.3 (Solución de problemas)
- **IATF 16949:2016** - Cláusula 10.2.4 (A prueba de error)
- **IATF 16949:2016** - Cláusula 10.2.5 (Sistemas de garantía)
- **ISO 9001:2015** - Cláusula 10.2 (No conformidad y acción correctiva)

### Las 8 Disciplinas
| Disciplina | Nombre | Objetivo |
|------------|--------|----------|
| D1 | Formar Equipo | Establecer equipo multifuncional |
| D2 | Describir Problema | Definir el problema claramente |
| D3 | Acciones de Contención | Proteger al cliente inmediatamente |
| D4 | Causa Raíz | Identificar la causa raíz del problema |
| D5 | Acciones Correctivas | Seleccionar acciones permanentes |
| D6 | Implementar | Verificar efectividad de las acciones |
| D7 | Prevenir Recurrencia | Actualizar sistemas para evitar repetición |
| D8 | Cierre | Reconocer al equipo y cerrar formalmente |

### Beneficios
- Resolución sistemática de problemas
- Identificación de causa raíz real
- Prevención de recurrencia
- Mejora continua documentada
- Satisfacción del cliente
        `
      },
      {
        id: '8d-access',
        title: 'Acceso al Módulo',
        content: `
## Cómo acceder

### Desde el Home
1. Inicia sesión en el sistema
2. En la pantalla principal (Home), busca la tarjeta **"8D Reports"**
3. Haz clic en la tarjeta para acceder al Dashboard

### URLs directas
| Página | URL | Descripción |
|--------|-----|-------------|
| Dashboard | \`/dashboard\` | Vista ejecutiva con KPIs |
| Consulta | \`/8d-consultation\` | Lista de todos los 8Ds |
| Crear 8D | \`/8d-workflow\` | Iniciar nuevo reporte |
| Editar 8D | \`/8d-workflow?reportId=X\` | Editar reporte existente |

### Permisos requeridos
- **Usuario básico**: Puede crear y editar 8Ds asignados
- **Aprobador**: Puede aprobar/rechazar etapas D1-D2-D3 y D8
- **Administrador**: Acceso completo + configuración
        `
      },
      {
        id: '8d-dashboard',
        title: 'Dashboard y Consulta',
        content: `
## Dashboard 8D

El dashboard proporciona una vista ejecutiva del estado de todos los reportes 8D.

### KPIs principales
- **Total 8Ds**: Cantidad total en el período
- **En Progreso**: 8Ds activos
- **Cerrados**: 8Ds completados
- **Por Etapa**: Distribución actual por disciplina

### Filtros de búsqueda
La pantalla de consulta permite filtrar por:
- **Búsqueda**: Por número de reporte, título o proveedor
- **Severidad**: Alta, Media, Baja
- **Estado**: Borrador, En progreso, Cerrado
- **Etapa actual**: D1, D2, D3, D4, D5, D6, D7, D8
- **Departamento**: Área que creó el reporte
- **Proveedor**: Proveedor relacionado

### Código de colores por etapa
| Etapa | Color | Significado |
|-------|-------|-------------|
| D1-D3 | Gris | Etapas iniciales |
| D4 | Azul oscuro | Análisis de causa raíz |
| D5 | Azul | Acciones correctivas |
| D6 | Morado | Implementación |
| D7 | Naranja | Prevención |
| D8 | Verde | Cierre |

### Acciones disponibles
- **Ver**: Consultar detalles del 8D
- **Editar**: Modificar el reporte (si tienes permisos)
- **Eliminar**: Solo administradores
        `
      },
      {
        id: '8d-workflow',
        title: 'Flujo de Trabajo',
        content: `
## Etapas del 8D

El proceso 8D se divide en 8 disciplinas principales más una etapa especial de manufactura:

### D1: Formar Equipo
**Objetivo**: Establecer el equipo multifuncional

Secciones:
- **Escalation Path**: Cadena de aprobación (3 niveles)
- **Containment Path**: Responsables de contención
- **Corrective Path**: Responsables de acciones correctivas
- **Validation Path**: Responsables de validación

**Importante**: Cada sección tiene un responsable primario + hasta 3 aprobadores.

---

### D2: Describir el Problema
**Objetivo**: Definir el problema claramente

Campos requeridos:
- Título del problema
- Descripción detallada
- Síntomas observados
- Impacto en el cliente
- Cliente afectado
- Proyecto relacionado
- Números de parte

**Evidencia visual**:
- Fotografías del defecto
- Documentos de soporte

---

### D3: Acciones de Contención
**Objetivo**: Proteger al cliente inmediatamente

Secciones:
- **Sort Actions**: Acciones de clasificación
- **Containment Actions**: Acciones de contención
- **Quantities Table**: Tabla de inventarios
  - Partes OK
  - Partes NG (No Good)
  - Scrap
  - Contención

---

### D3-MFG: Manufactura
**Objetivo**: Documentar acciones específicas de manufactura

Secciones:
- **Customer Notification**: Notificación al cliente
- **Process Flow Update**: Actualización de flujo de proceso
- **Parts Status**: Estado de las partes afectadas

---

### D4: Causa Raíz
**Objetivo**: Identificar la verdadera causa raíz

Herramientas disponibles:
- **Diagrama Ishikawa** (Causa-Efecto)
  - Hombre (Mano de obra)
  - Máquina
  - Material
  - Método
  - Medición
  - Medio ambiente
- **5 Porqués**: Análisis iterativo

**Diferenciación**:
- Causa de Detección: Por qué no se detectó
- Causa de Ocurrencia: Por qué ocurrió

---

### D5: Acciones Correctivas
**Objetivo**: Seleccionar acciones permanentes

Campos por acción:
- Descripción de la acción
- Responsable
- Fecha compromiso
- Fecha cierre
- Estado (Pendiente/En progreso/Completado)

---

### D6: Implementar Acciones
**Objetivo**: Verificar efectividad

Secciones:
- Lista de acciones con seguimiento
- Registro de progreso diario
- Diagrama Gantt para visualización
- Evidencia de implementación

---

### D7: Prevenir Recurrencia
**Objetivo**: Actualizar sistemas

Documentos a actualizar:
- PFMEA (Process FMEA)
- Control Plan
- Instrucciones de trabajo
- Procedimientos
- Capacitación

---

### D8: Cierre
**Objetivo**: Cerrar formalmente el 8D

Secciones:
- **Follow-up Actions**: Acciones de seguimiento
- **Evidence Documentation**: Evidencia de cierre
- **Lessons Learned**: Lecciones aprendidas
- **Closure Notes**: Notas de cierre
- **Approvals**: 3 niveles de aprobación

**Estados de aprobación**:
- Borrador → Pendiente Nivel 1 → Pendiente Nivel 2 → Pendiente Nivel 3 → Cerrado
        `
      },
      {
        id: '8d-create',
        title: 'Crear un 8D',
        userType: 'operator',
        content: `
## Cómo crear un nuevo 8D

### Paso 1: Acceder al formulario
1. Ve a \`/8d-workflow\` o haz clic en "Nuevo 8D" desde el dashboard
2. Se abrirá el formulario en la etapa D1

### Paso 2: Completar D1 (Equipo)
1. **Escalation Path**: Define quién aprobará el 8D
   - Primary: Responsable principal
   - Approvers: Hasta 3 niveles de aprobación
2. **Containment Path**: Quién ejecutará la contención
3. **Corrective Path**: Quién definirá acciones correctivas
4. **Validation Path**: Quién validará la efectividad

### Paso 3: Completar D2 (Problema)
1. Ingresa el título descriptivo del problema
2. Describe el problema en detalle
3. Selecciona el cliente afectado
4. Selecciona el proyecto
5. Indica los números de parte impactados
6. Sube evidencia fotográfica

### Paso 4: Completar D3 (Contención)
1. Define las acciones de clasificación (Sort)
2. Define las acciones de contención
3. Completa la tabla de inventarios afectados

### Paso 5: Guardar y enviar
- **Guardar Borrador**: Guarda sin enviar a aprobación
- **Enviar a Aprobación**: Inicia el flujo D1-D2-D3

### Paso 6: Esperar aprobación
- El sistema notifica a los aprobadores
- Una vez aprobado D1-D2-D3, se habilitan D4-D8
- Puedes ver el estado en el dashboard

### Tips para D1-D2-D3
- Sé específico en la descripción del problema
- Incluye todas las partes afectadas
- Selecciona el equipo correcto desde el inicio
- La contención debe ser inmediata
        `
      },
      {
        id: '8d-approve',
        title: 'Aprobar un 8D',
        userType: 'approver',
        content: `
## Proceso de Aprobación

### Flujo de aprobación D1-D2-D3
El 8D tiene un sistema de aprobación de 3 niveles:

1. **Nivel 1**: Supervisor/Responsable directo
2. **Nivel 2**: Gerente de área
3. **Nivel 3**: Director/Gerente General

### Estados del flujo
| Estado | Descripción |
|--------|-------------|
| draft | Borrador, aún editando |
| pending_approval_1 | Esperando aprobación nivel 1 |
| pending_approval_2 | Esperando aprobación nivel 2 |
| pending_approval_3 | Esperando aprobación nivel 3 |
| approved | D1-D2-D3 aprobados, continuar a D4 |
| rejected_by_a1/a2/a3 | Rechazado por nivel X |

### Cómo aprobar
1. Accede al 8D desde el enlace o dashboard
2. Revisa la información de D1, D2 y D3
3. Verifica:
   - ¿El equipo está completo?
   - ¿El problema está bien descrito?
   - ¿Las acciones de contención son adecuadas?
4. Haz clic en **"Aprobar"** o **"Rechazar"**

### Al rechazar
- **Obligatorio**: Escribe el motivo del rechazo
- El 8D regresa al responsable para corrección
- Se notifica al equipo

### Aprobación de D8 (Cierre)
El cierre también requiere 3 niveles:
1. Revisa que todas las acciones estén completadas
2. Verifica la evidencia de cierre
3. Confirma las lecciones aprendidas
4. Aprueba o rechaza el cierre

### Historial de aprobaciones
Todas las acciones quedan registradas con:
- Quién aprobó/rechazó
- Fecha y hora
- Comentarios
- Nivel de aprobación
        `
      },
      {
        id: '8d-d4',
        title: 'D4 - Causa Raíz',
        content: `
## Análisis de Causa Raíz (D4)

### Requisito previo
D4 solo se habilita cuando D1-D2-D3 están **aprobados**.

### Herramienta: Diagrama Ishikawa
También conocido como diagrama de espina de pescado o causa-efecto.

**Categorías (6M)**:
| Categoría | Ejemplos |
|-----------|----------|
| Mano de obra | Capacitación, experiencia, fatiga |
| Máquina | Mantenimiento, calibración, desgaste |
| Material | Especificación, proveedor, calidad |
| Método | Procedimiento, secuencia, estándar |
| Medición | Instrumento, método de medición |
| Medio ambiente | Temperatura, humedad, iluminación |

**Cómo usar**:
1. El problema (efecto) está al centro derecho
2. Las 6M son las ramas principales
3. Para cada M, identifica posibles causas
4. Marca las causas más probables

### Herramienta: 5 Porqués
Técnica iterativa para llegar a la causa raíz.

**Ejemplo**:
- ¿Por qué falló la pieza? → El material estaba fuera de especificación
- ¿Por qué estaba fuera de especificación? → No se inspeccionó al recibir
- ¿Por qué no se inspeccionó? → No hay instrucción de inspección
- ¿Por qué no hay instrucción? → No se actualizó el proceso
- ¿Por qué no se actualizó? → No hay proceso de gestión de cambios

**Causa raíz**: Falta de proceso de gestión de cambios

### Dos tipos de causa raíz
1. **Causa de Ocurrencia**: Por qué sucedió el problema
2. **Causa de Detección**: Por qué no se detectó antes

### Tips para D4
- No te detengas en la primera respuesta
- Usa datos, no suposiciones
- Involucra al equipo multifuncional
- Valida las causas con evidencia
        `
      },
      {
        id: '8d-d5d6d7',
        title: 'D5-D6-D7 Acciones',
        content: `
## Acciones Correctivas y Prevención

### D5: Seleccionar Acciones Correctivas
**Objetivo**: Definir las acciones permanentes

Para cada acción:
1. Describe la acción específica
2. Asigna un responsable
3. Define fecha compromiso
4. Relaciona con la causa raíz que ataca

**Tipos de acciones**:
- Acciones para eliminar causa de ocurrencia
- Acciones para eliminar causa de detección

**Criterios de una buena acción**:
- Específica y medible
- Ataca la causa raíz, no el síntoma
- Tiene responsable claro
- Tiene fecha definida

---

### D6: Implementar y Verificar
**Objetivo**: Ejecutar las acciones y verificar efectividad

**Seguimiento de progreso**:
1. Marca el estado de cada acción:
   - Pendiente
   - En progreso
   - Completado
2. Registra progreso diario (%)
3. Documenta actividades realizadas
4. Adjunta evidencia

**Diagrama Gantt**:
- Vista visual del timeline de acciones
- Comparación planeado vs real
- Identificación de retrasos

**Verificación de efectividad**:
- ¿El problema se eliminó?
- ¿Los datos confirman la mejora?
- ¿Se cumplieron los objetivos?

---

### D7: Prevenir Recurrencia
**Objetivo**: Actualizar sistemas para evitar que vuelva a ocurrir

**Documentos a actualizar**:
| Documento | Propósito |
|-----------|-----------|
| PFMEA | Agregar modo de falla y controles |
| Control Plan | Actualizar frecuencia/método de inspección |
| Work Instructions | Modificar instrucciones de trabajo |
| Training | Capacitar al personal |
| Poka-Yoke | Implementar a prueba de error |

**Checklist D7**:
- [ ] FMEA actualizado
- [ ] Control Plan actualizado
- [ ] Instrucciones de trabajo revisadas
- [ ] Personal capacitado
- [ ] Poka-Yoke implementado (si aplica)
- [ ] Lecciones aprendidas documentadas

### Tips para D5-D6-D7
- Cada acción debe atacar una causa raíz específica
- Documenta todo con evidencia
- No cierres D6 sin verificar efectividad
- D7 es clave para evitar recurrencia
        `
      },
      {
        id: '8d-close',
        title: 'D8 - Cierre',
        content: `
## Proceso de Cierre (D8)

### Requisitos previos
Antes de cerrar, verifica que:
- [x] D1-D2-D3 aprobados
- [x] D4 completado (causa raíz identificada)
- [x] D5 completado (acciones definidas)
- [x] D6 completado (acciones implementadas)
- [x] D7 completado (prevención actualizada)

### Secciones de D8

#### 1. Follow-up Actions
Acciones de seguimiento post-cierre:
- Monitoreo de efectividad (30/60/90 días)
- Verificación de no recurrencia
- Auditorías de seguimiento

#### 2. Evidence Documentation
Tipos de evidencia:
- Actualización de proceso
- Instrucciones de trabajo
- Capacitación
- Control Plan
- FMEA
- Cambio de diseño
- Especificación
- Otros

#### 3. Closure Notes
Resumen ejecutivo del 8D:
- Problema original
- Causa raíz encontrada
- Acciones implementadas
- Resultados obtenidos

#### 4. Lessons Learned
Documentar para referencia futura:
- Qué funcionó bien
- Qué se podría mejorar
- Recomendaciones para casos similares

### Flujo de aprobación de cierre
Similar a D1-D2-D3, el cierre requiere 3 niveles:

1. **Nivel 1**: Verifica completitud
2. **Nivel 2**: Valida efectividad
3. **Nivel 3**: Aprueba cierre formal

### Estados finales
- **Cerrado**: 8D completado exitosamente
- **Cerrado (con observaciones)**: Completado con notas

### Historial
El sistema registra:
- Fecha de cada aprobación de cierre
- Quién aprobó cada nivel
- Comentarios de cierre
- Fecha de cierre final
        `
      },
      {
        id: '8d-config',
        title: 'Configuración',
        userType: 'admin',
        content: `
## Configuración del Módulo 8D

**Acceso**: Solo administradores

### Roles y Permisos
Configura quién puede hacer qué:

| Acción | Usuario | Aprobador | Admin |
|--------|---------|-----------|-------|
| Crear 8D | ✓ | ✓ | ✓ |
| Editar 8D propio | ✓ | ✓ | ✓ |
| Editar cualquier 8D | ✗ | ✗ | ✓ |
| Aprobar D1-D2-D3 | ✗ | ✓ | ✓ |
| Aprobar D8 | ✗ | ✓ | ✓ |
| Eliminar 8D | ✗ | ✗ | ✓ |
| Ver reportes | ✓ | ✓ | ✓ |

### Configuración de aprobadores
Los aprobadores se asignan en:
1. \`/user-management\` - Gestión de usuarios
2. \`/roles-management\` - Definición de roles

### Notificaciones
El sistema envía correos automáticos:
- Al crear un 8D
- Al enviar a aprobación
- Al aprobar/rechazar cada nivel
- Al completar cada disciplina
- Al cerrar el 8D

### Campos personalizables
- Categorías de severidad
- Tipos de problema
- Plantillas de 8D
- Textos de ayuda
        `
      },
      {
        id: '8d-tips',
        title: 'Tips y Mejores Prácticas',
        content: `
## Consejos para un 8D exitoso

### Al formar el equipo (D1)
- Incluye representantes de todas las áreas afectadas
- El líder del equipo debe tener autoridad para implementar cambios
- Mantén el equipo pequeño pero efectivo (5-7 personas)

### Al describir el problema (D2)
- Usa datos, no opiniones
- Responde: ¿Qué? ¿Dónde? ¿Cuándo? ¿Cuánto?
- Incluye evidencia fotográfica
- Cuantifica el impacto (PPM, costo, unidades)

### En la contención (D3)
- La velocidad es crítica
- Protege al cliente primero
- Documenta todas las acciones
- Notifica a los afectados

### En el análisis de causa raíz (D4)
- No te detengas en síntomas
- Usa múltiples herramientas (Ishikawa + 5 Porqués)
- Valida las causas con datos
- Considera tanto ocurrencia como detección

### En acciones correctivas (D5-D6-D7)
- Cada acción debe atacar una causa raíz específica
- Verifica efectividad antes de cerrar
- Actualiza todos los documentos afectados
- Capacita al personal

### Al cerrar (D8)
- Documenta lecciones aprendidas
- Planifica seguimiento post-cierre
- Celebra el éxito del equipo
- Comparte aprendizajes con la organización

### Errores comunes a evitar
- Saltar directamente a soluciones sin análisis
- No involucrar a las áreas correctas
- Atacar síntomas en lugar de causas raíz
- No verificar efectividad
- Cerrar sin actualizar documentación
- No dar seguimiento post-cierre

### Métricas de éxito
Un buen proceso 8D se mide por:
- Tiempo promedio de cierre < 30 días
- % de recurrencia < 5%
- % de 8Ds cerrados en tiempo < 80%
- Satisfacción del cliente con la respuesta
        `
      }
    ]
  },
  'qar': {
    id: 'qar',
    title: 'QAR - Quality Alert Report',
    icon: Shield,
    description: 'Gestión de Alertas de Calidad',
    sections: [
      {
        id: 'qar-intro',
        title: 'Introducción',
        content: `
## ¿Qué es un QAR?

Un **QAR (Quality Alert Report)** es una alerta formal de calidad emitida cuando se detecta un problema que requiere atención inmediata. El módulo QAR permite gestionar el ciclo completo de alertas de calidad, desde la emisión hasta el cierre.

### Normas que cumple
- **IATF 16949:2016** - Cláusula 8.7 (Control de salidas no conformes)
- **IATF 16949:2016** - Cláusula 10.2.1 (Reacción a no conformidades)
- **ISO 9001:2015** - Cláusula 8.7 (Control de salidas no conformes)

### Características principales
- Emisión automática o manual de alertas
- Asignación de responsables de respuesta y validación
- Seguimiento de causa raíz y acciones correctivas
- Validación y cierre formal
- Historial completo de comentarios
- Adjuntos y evidencia fotográfica

### Estados del QAR
| Estado | Color | Descripción |
|--------|-------|-------------|
| EMITIDO | Amarillo | QAR creado, esperando respuesta |
| RESPONDIDO | Azul | Se ha dado respuesta, esperando validación |
| RECHAZADO | Rojo | Validación rechazada, requiere corrección |
| CERRADO | Verde | QAR validado y cerrado formalmente |
        `
      },
      {
        id: 'qar-access',
        title: 'Acceso al Módulo',
        content: `
## Cómo acceder

### Desde el Home
1. Inicia sesión en el sistema
2. En la pantalla principal (Home), busca la tarjeta **"Quality Alert (QAR)"**
3. Haz clic en la tarjeta para acceder al Dashboard

### URLs directas
| Página | URL | Descripción |
|--------|-----|-------------|
| Dashboard | \`/qar-dashboard\` | Vista ejecutiva con KPIs |
| Lista QARs | \`/qar-list\` | Lista de todas las alertas |
| Crear QAR | \`/qar-create\` | Emitir nueva alerta |
| Detalle QAR | \`/qar/:id\` | Ver, responder, validar |

### Permisos requeridos
- **Usuario básico**: Puede emitir QARs y responder si está asignado
- **Validador**: Puede aprobar/rechazar respuestas
- **Administrador**: Acceso completo
        `
      },
      {
        id: 'qar-dashboard',
        title: 'Dashboard QAR',
        content: `
## Dashboard QAR

El dashboard proporciona una vista ejecutiva del estado de todas las alertas de calidad.

### KPIs principales
- **Total QARs**: Cantidad total en el período
- **Emitidos**: QARs esperando respuesta
- **Respondidos**: QARs con respuesta, esperando validación
- **Cerrados**: QARs completados

### Filtros disponibles
- **Período**: Hoy, Semana, Mes, Trimestre, Año, Todo
- **Fechas**: Rango de fechas personalizado
- **Departamento**: Filtrar por área responsable
- **Cliente**: Filtrar por cliente
- **Severidad**: Filtrar por nivel de severidad

### Widgets del dashboard
| Widget | Descripción |
|--------|-------------|
| Distribución por Estado | Gráfico de estados actuales |
| Tendencia Mensual | QARs por mes |
| Por Severidad | Distribución por nivel de severidad |
| Por Departamento | QARs por área |
| Tiempo de Respuesta | Promedio de días para responder |
| Top Defectos | Defectos más frecuentes |

### Acciones rápidas
- **Nuevo QAR**: Crear alerta manualmente
- **Ver Lista**: Ir a la lista completa
- **Exportar**: Descargar reporte
        `
      },
      {
        id: 'qar-workflow',
        title: 'Flujo de Trabajo',
        content: `
## Flujo del QAR

El QAR sigue un flujo de 4 etapas:

### 1. Emisión (EMITIDO)
**Quién**: Cualquier usuario autorizado

El QAR se puede emitir de dos formas:
- **Automático**: Cuando los defectos capturados superan un umbral definido
- **Manual**: El usuario selecciona defectos y emite la alerta

**Información requerida**:
- Número de QAR (generado automáticamente)
- Título descriptivo
- Descripción del problema
- Cliente, proyecto, número de parte
- Severidad
- Departamento responsable
- Defectos asociados
- Foto NOK (estado incorrecto)
- Foto OK (referencia correcta)
- Destinatarios de respuesta
- Destinatarios de validación

---

### 2. Respuesta (RESPONDIDO)
**Quién**: Responsable asignado en destinatarios de respuesta

El responsable debe proporcionar:
- **Causa raíz**: Por qué ocurrió el problema
- **Acción correctiva**: Qué se hará para corregirlo
- **Notas de resolución**: Información adicional (opcional)
- **Archivos adjuntos**: Evidencia de soporte

**Acciones**:
- Guardar borrador
- Enviar respuesta

---

### 3. Validación
**Quién**: Responsable asignado en destinatarios de validación

El validador revisa la respuesta y decide:

#### Aprobar
- La respuesta es satisfactoria
- Las acciones correctivas son adecuadas
- El QAR pasa a estado CERRADO

#### Rechazar
- La respuesta no es satisfactoria
- **Obligatorio**: Indicar motivo del rechazo
- El QAR regresa a estado EMITIDO para corrección

---

### 4. Cierre (CERRADO)
**Estado final**: QAR completado exitosamente

El sistema registra:
- Fecha de cierre
- Quién validó
- Historial completo
        `
      },
      {
        id: 'qar-create',
        title: 'Emitir un QAR',
        userType: 'operator',
        content: `
## Cómo emitir un QAR

### Modo 1: Desde defectos capturados
1. El sistema detecta defectos que superan el umbral
2. Se pre-llena la información del defecto
3. Completa los campos adicionales
4. Envía el QAR

### Modo 2: Manual
1. Ve a \`/qar-create\` o haz clic en "Nuevo QAR"
2. Selecciona el cliente
3. Selecciona el proyecto
4. Selecciona el número de parte
5. Selecciona la severidad
6. Selecciona el departamento responsable

### Buscar defectos (modo manual)
1. Haz clic en "Buscar Defectos"
2. Filtra por:
   - Cliente
   - Proyecto
   - Parte
   - Rango de fechas
3. Selecciona los defectos a incluir
4. Confirma la selección

### Completar información
1. **Título**: Descripción breve del problema
2. **Descripción**: Detalle del problema detectado
3. **Foto NOK**: Sube imagen del defecto
4. **Foto OK**: Sube imagen de referencia correcta

### Asignar destinatarios
1. **Destinatarios de respuesta**: Quiénes deben responder
2. **Destinatarios de validación**: Quiénes validarán la respuesta

### Enviar
- Haz clic en "Emitir QAR"
- Se genera el número QAR-YYYY-XXXX
- Se notifica a los destinatarios

### Tips
- Incluye fotos claras del defecto
- Sé específico en la descripción
- Asigna a las personas correctas
        `
      },
      {
        id: 'qar-respond',
        title: 'Responder un QAR',
        content: `
## Proceso de Respuesta

### Cuándo responder
Debes responder si:
- Estás en la lista de destinatarios de respuesta
- El QAR está en estado EMITIDO

### Acceder al QAR
1. Desde el correo de notificación
2. Desde la lista de QARs (\`/qar-list\`)
3. Filtrar por estado "Emitido"

### Formulario de respuesta
Completa los campos requeridos:

#### Causa Raíz (requerido)
Explica por qué ocurrió el problema:
- Sé específico
- Usa datos cuando sea posible
- Ejemplo: "El operador no siguió la instrucción de trabajo IT-PRO-045 paso 3.2"

#### Acción Correctiva (requerido)
Describe qué se hará para corregir:
- Acciones inmediatas
- Acciones a mediano plazo
- Ejemplo: "Re-capacitación del personal en IT-PRO-045, verificación diaria por supervisor"

#### Notas de Resolución (opcional)
Información adicional:
- Contexto del problema
- Acciones ya tomadas
- Recomendaciones

#### Archivos adjuntos
Sube evidencia de soporte:
- Fotos de la corrección
- Documentos actualizados
- Registros de capacitación

### Enviar respuesta
1. Revisa toda la información
2. Haz clic en "Enviar Respuesta"
3. El QAR cambia a estado RESPONDIDO
4. Se notifica a los validadores
        `
      },
      {
        id: 'qar-validate',
        title: 'Validar un QAR',
        userType: 'approver',
        content: `
## Proceso de Validación

### Cuándo validar
Debes validar si:
- Estás en la lista de destinatarios de validación
- El QAR está en estado RESPONDIDO

### Revisar la respuesta
1. Abre el QAR desde el dashboard o lista
2. Revisa la información original
3. Revisa la respuesta proporcionada:
   - ¿La causa raíz es correcta?
   - ¿La acción correctiva es suficiente?
   - ¿La evidencia es adecuada?

### Aprobar
Si la respuesta es satisfactoria:
1. Haz clic en "Aprobar"
2. Opcionalmente agrega comentarios
3. Confirma la acción
4. El QAR se cierra automáticamente

### Rechazar
Si la respuesta no es satisfactoria:
1. Haz clic en "Rechazar"
2. **Obligatorio**: Escribe el motivo del rechazo
   - Sé específico sobre qué falta o qué está mal
   - Indica qué esperas en la nueva respuesta
3. Confirma la acción
4. El QAR regresa a EMITIDO
5. Se notifica al responsable

### Buenas prácticas
- No demores la validación
- Sé claro en los rechazos
- Verifica que las acciones sean reales
- Solicita evidencia cuando sea necesario
        `
      },
      {
        id: 'qar-comments',
        title: 'Comentarios y Seguimiento',
        content: `
## Sistema de Comentarios

### Agregar comentarios
En cualquier momento puedes agregar comentarios al QAR:

1. Abre el detalle del QAR
2. Ve a la sección "Comentarios"
3. Escribe tu comentario
4. Haz clic en "Agregar"

### Tipos de comentarios
- **Información adicional**: Datos complementarios
- **Preguntas**: Solicitar aclaraciones
- **Actualizaciones**: Estado de las acciones
- **Observaciones**: Notas para el historial

### Historial
El sistema registra automáticamente:
- Cambios de estado
- Quién realizó cada acción
- Fecha y hora
- Comentarios

### Notificaciones
Los participantes del QAR reciben notificaciones:
- Al emitir el QAR
- Al agregar comentarios
- Al enviar respuesta
- Al aprobar/rechazar
- Al cerrar

### Archivos adjuntos
En la respuesta puedes adjuntar:
- Imágenes (JPG, PNG)
- Documentos (PDF, Word, Excel)
- Otros archivos de soporte

**Acciones**:
- Subir archivo
- Ver archivo
- Descargar archivo
- Eliminar archivo (solo quien subió)
        `
      },
      {
        id: 'qar-list',
        title: 'Lista de QARs',
        content: `
## Consulta de QARs

### Acceder a la lista
Ve a \`/qar-list\` desde el menú o dashboard

### Filtros disponibles
| Filtro | Opciones |
|--------|----------|
| Estado | Emitido, Respondido, Rechazado, Cerrado |
| Cliente | Lista de clientes |
| Búsqueda | Por número QAR, título, descripción |

### Contadores de estado
En la parte superior se muestran contadores:
- **Emitidos**: Alertas pendientes de respuesta
- **Respondidos**: Esperando validación
- **Rechazados**: Requieren corrección
- **Cerrados**: Completados

### Columnas de la tabla
| Columna | Descripción |
|---------|-------------|
| QAR # | Número de alerta |
| Título | Descripción breve |
| Cliente | Cliente afectado |
| Parte | Número de parte |
| Severidad | Nivel de severidad |
| Estado | Estado actual |
| Fecha | Fecha de emisión |
| Acciones | Ver detalle |

### Acciones por fila
- **Ver**: Abre el detalle del QAR
- **Estado**: Badge visual del estado actual

### Ordenamiento
Haz clic en los encabezados para ordenar por esa columna
        `
      },
      {
        id: 'qar-config',
        title: 'Configuración',
        userType: 'admin',
        content: `
## Configuración del Módulo QAR

**Acceso**: Solo administradores

### Umbrales de alerta automática
Configura cuándo se dispara un QAR automático:

| Parámetro | Descripción |
|-----------|-------------|
| Cantidad de defectos | Número mínimo para disparar |
| Período de tiempo | Ventana de tiempo (horas) |
| Por severidad | Umbrales diferentes por severidad |

### Severidades
Configura los niveles de severidad:
- Nombre
- Color
- Umbrales asociados
- Prioridad

### Departamentos
Define los departamentos responsables:
- Producción
- Calidad
- Ingeniería
- Mantenimiento
- Logística
- Proveedor

### Roles y Permisos
| Acción | Usuario | Validador | Admin |
|--------|---------|-----------|-------|
| Emitir QAR | ✓ | ✓ | ✓ |
| Responder QAR | Asignado | ✓ | ✓ |
| Validar QAR | ✗ | Asignado | ✓ |
| Configurar | ✗ | ✗ | ✓ |

### Notificaciones
Configura correos automáticos para:
- Emisión de QAR
- Asignación como responsable
- Respuesta enviada
- Aprobación/Rechazo
- Cierre
        `
      },
      {
        id: 'qar-tips',
        title: 'Tips y Mejores Prácticas',
        content: `
## Consejos para un QAR efectivo

### Al emitir un QAR
- **Título claro**: "Rayado en superficie de pieza ABC-123" es mejor que "Defecto"
- **Fotos de calidad**: Buena iluminación, enfoque claro, incluye referencia de tamaño
- **Descripción completa**: Qué, dónde, cuándo, cuántas unidades
- **Defectos correctos**: Selecciona solo los defectos relacionados
- **Destinatarios correctos**: Asigna a quien realmente puede resolver

### Al responder un QAR
- **No culpes**: Enfócate en el proceso, no en las personas
- **Sé específico**: "Re-capacitación" es vago, "Re-capacitación en IT-PRO-045" es específico
- **Incluye fechas**: Cuándo se implementará cada acción
- **Adjunta evidencia**: Fotos, documentos, registros
- **Responde rápido**: El cliente espera una respuesta ágil

### Al validar un QAR
- **Verifica la causa raíz**: ¿Es la verdadera causa o solo un síntoma?
- **Evalúa las acciones**: ¿Son suficientes para evitar recurrencia?
- **Solicita evidencia**: No apruebes sin ver pruebas
- **Sé justo en rechazos**: Explica claramente qué falta
- **No demores**: La validación rápida mejora el proceso

### Errores comunes
- Emitir QARs sin información completa
- Responder con acciones genéricas
- Aprobar sin verificar implementación
- No dar seguimiento a rechazos
- Ignorar QARs antiguos

### Métricas de éxito
Un buen proceso de QAR se mide por:
- Tiempo promedio de respuesta < 24 horas
- Tiempo promedio de cierre < 72 horas
- % de rechazos < 15%
- % de QARs cerrados en tiempo < 90%
- Recurrencia de defectos < 5%
        `
      }
    ]
  },
  'mrb': {
    id: 'mrb',
    title: 'MRB - Material Review Board',
    icon: ClipboardList,
    description: 'Gestión de Campañas de Revisión de Material',
    sections: [
      {
        id: 'mrb-intro',
        title: 'Introducción',
        content: `
## ¿Qué es MRB?

**MRB (Material Review Board)** es un proceso formal para la revisión y disposición de material no conforme. El módulo MRB permite gestionar campañas de inspección, capturar resultados, calcular costos y dar disposición al material.

### Normas que cumple
- **IATF 16949:2016** - Cláusula 8.7.1 (Control de salidas no conformes)
- **IATF 16949:2016** - Cláusula 8.7.1.1 (Autorización del cliente para concesión)
- **IATF 16949:2016** - Cláusula 8.7.1.2 (Control de producto no conforme)
- **ISO 9001:2015** - Cláusula 8.7 (Control de salidas no conformes)

### Conceptos clave
| Término | Descripción |
|---------|-------------|
| Campaña | Evento de inspección de material sospechoso |
| Cuarentena | Material separado pendiente de revisión |
| Disposición | Decisión sobre el destino del material |
| Buffer | Área temporal de inspección |
| Turno | Registro de horas y personal asignado |

### Tipos de disposición
| Disposición | Descripción |
|-------------|-------------|
| Scrap | Material de desecho, no recuperable |
| Rework | Retrabajo para corregir defecto |
| Use As-Is | Usar tal cual (con concesión) |
| Return | Devolver a proveedor |
| Hold | Retener para análisis posterior |

### Estados de la campaña
| Estado | Color | Descripción |
|--------|-------|-------------|
| Draft | Gris | Borrador, aún editando |
| Open | Amarillo | Publicado, pendiente disposición |
| In Process | Azul | Disposición en curso, pendiente validación |
| Cancelled | Rojo | Campaña cancelada |
| Closed | Verde | Campaña cerrada formalmente |
        `
      },
      {
        id: 'mrb-access',
        title: 'Acceso al Módulo',
        content: `
## Cómo acceder

### Desde el Home
1. Inicia sesión en el sistema
2. En la pantalla principal (Home), busca la tarjeta **"MRB"**
3. Haz clic en la tarjeta para acceder al Dashboard

### URLs directas
| Página | URL | Descripción |
|--------|-----|-------------|
| Dashboard | \`/mrb-dashboard\` | Vista ejecutiva con KPIs |
| Campañas | \`/mrb-campaigns\` | Lista de campañas |
| Crear MRB | \`/mrb-create\` | Iniciar nueva campaña |
| Detalle | \`/mrb/:id\` | Ver/editar campaña |
| Buffer | \`/mrb-buffer\` | Área de inspección temporal |
| Configuración | \`/mrb-config\` | Ajustes del módulo |

### Permisos requeridos
- **Operador**: Puede capturar defectos en campañas asignadas
- **Inspector**: Puede crear campañas y dar disposición
- **Validador**: Puede aprobar/rechazar disposiciones
- **Administrador**: Acceso completo + configuración
        `
      },
      {
        id: 'mrb-dashboard',
        title: 'Dashboard MRB',
        content: `
## Dashboard MRB

El dashboard proporciona una vista ejecutiva del estado de todas las campañas MRB.

### KPIs principales
| KPI | Descripción |
|-----|-------------|
| Yield % | Porcentaje de material OK |
| PPM | Partes por millón defectuosas |
| Costo Total | Costo acumulado (scrap + mano de obra) |
| Backlog | Campañas abiertas |
| Cerradas | Campañas completadas |

### Widgets de Material
- **Scrap (pzas)**: Piezas desechadas
- **Rework (pzas)**: Piezas retrabajadas
- **Use As-Is (pzas)**: Piezas usadas con concesión
- **Return (pzas)**: Piezas devueltas
- **Hold (pzas)**: Piezas en espera

### Widgets de Tiempo
- **Avg Respuesta**: Días promedio para dar disposición
- **Avg Cierre**: Días promedio para cerrar
- **Lead Time**: Tiempo total promedio
- **>14 días**: Campañas abiertas más de 14 días
- **>30 días**: Campañas abiertas más de 30 días

### Widgets de Costo
- **Scrap Cost**: Costo de material desechado
- **Mano de Obra**: Costo de personal
- **Costo Total**: Suma total

### Gráficas disponibles
- Campañas por Mes / Departamento
- Costo por Mes
- Distribución por Disposición
- Scrap/Rework por Mes
- Top Defectos
- Por Severidad

### Personalización
1. Haz clic en el ícono de engranaje
2. Arrastra los widgets para reordenar
3. Activa/desactiva widgets según necesites
4. Los cambios se guardan automáticamente
        `
      },
      {
        id: 'mrb-workflow',
        title: 'Flujo de Trabajo',
        content: `
## Flujo de una Campaña MRB

### 1. Creación (Draft)
**Opciones de origen**:
- **Desde 8D**: Hereda datos del reporte 8D vinculado
- **Incoming**: Crear manualmente sin vínculo

**Datos a capturar**:
- Título de la campaña
- Cliente y proyecto
- Números de parte afectados
- Descripción del problema
- Departamento responsable
- Criterio de inspección
- Instrucciones de disposición
- Fotos NOK/OK
- Material en cuarentena por ubicación

---

### 2. Publicación (Open)
Al publicar:
- Se genera el número de campaña (MRB-YYYY-XXXX)
- Se notifica a los responsables
- Se habilita la captura de defectos
- Se inicia el registro de turnos

---

### 3. Captura de Defectos
Durante la campaña:
- Captura piezas inspeccionadas
- Registra OK y NOK
- Clasifica NOK por disposición
- Registra horas trabajadas por turno
- Personal asignado (inspectores, supervisores)

---

### 4. Disposición (In Process)
Al completar la captura:
- Define disposición final
- Envía a validación
- Estado cambia a "In Process"

---

### 5. Validación
El validador revisa:
- Cantidades inspeccionadas
- Disposiciones asignadas
- Costos calculados
- Evidencia documentada

**Acciones**:
- **Aprobar**: Cierra la campaña
- **Rechazar**: Regresa para corrección

---

### 6. Cierre (Closed)
Campaña completada:
- Costos finales calculados
- Historial completo
- Disponible para reportes
        `
      },
      {
        id: 'mrb-create',
        title: 'Crear Campaña MRB',
        userType: 'operator',
        content: `
## Cómo crear una campaña MRB

### Paso 1: Seleccionar origen
Elige el tipo de origen:

#### Opción A: Desde 8D
1. Selecciona "8D" como origen
2. Busca el 8D por número o título
3. Selecciona el 8D de la lista
4. Los datos se heredan automáticamente:
   - Título
   - Cliente/Proyecto
   - Partes
   - Descripción del problema
   - Fotos
   - Cantidades de cuarentena

#### Opción B: Incoming (Manual)
1. Selecciona "Incoming" como origen
2. Selecciona el cliente
3. Selecciona el proyecto
4. Selecciona las partes afectadas
5. Selecciona el departamento responsable
6. Completa la información manualmente

---

### Paso 2: Verificar datos heredados
Si vienes de 8D:
1. Revisa los datos heredados
2. Puedes vincular otro 8D si es necesario
3. Puedes editar campos específicos

---

### Paso 3: Completar información
1. **Título**: Descripción de la campaña
2. **Descripción del problema**: Detalle del defecto
3. **Criterio de inspección**: Cómo inspeccionar
4. **Instrucciones de disposición**: Qué hacer con material NOK
5. **Fotos**: NOK y OK de referencia

---

### Paso 4: Cuarentena
Define cantidades por ubicación:
| Ubicación | Descripción |
|-----------|-------------|
| Almacén | Material en bodega |
| Proceso | Material en línea |
| Tránsito | Material en camino |
| Cliente | Material en sitio del cliente |

---

### Paso 5: Guardar o Publicar
- **Guardar Borrador**: Guarda sin publicar
- **Publicar Campaña**: Activa la campaña para inspección
        `
      },
      {
        id: 'mrb-capture',
        title: 'Captura de Defectos',
        content: `
## Captura durante la Campaña

### Acceder a la campaña
1. Ve a la lista de campañas
2. Selecciona la campaña activa
3. Ve a la pestaña "Avance de Campaña"

### Registrar resultados
Por cada turno de inspección:

#### Cantidades
| Campo | Descripción |
|-------|-------------|
| Inspeccionadas | Total de piezas revisadas |
| OK | Piezas sin defecto |
| NOK | Piezas con defecto |

#### Disposición de NOK
| Campo | Descripción |
|-------|-------------|
| Scrap | Piezas a desechar |
| Rework | Piezas a retrabajar |
| Use As-Is | Piezas a usar con concesión |
| Return | Piezas a devolver |
| Hold | Piezas a retener |

### Registrar horas
Para cada turno:
1. Selecciona la fecha
2. Selecciona el turno (1°, 2°, 3°)
3. Registra horas trabajadas
4. Indica cantidad de inspectores
5. Indica cantidad de supervisores

### Cálculo de costos
El sistema calcula automáticamente:
- **Costo de scrap**: Qty × Costo unitario de la parte
- **Costo de mano de obra**: (Inspectores × Hrs × Rate) + (Supervisores × Hrs × Rate)
- **Costo total**: Scrap + Mano de obra

### Buffer de inspección
Para captura rápida:
1. Ve a \`/mrb-buffer\`
2. Selecciona la campaña
3. Captura resultados rápidamente
4. Los datos se sincronizan automáticamente
        `
      },
      {
        id: 'mrb-disposition',
        title: 'Disposición y Validación',
        userType: 'approver',
        content: `
## Proceso de Disposición

### Completar inspección
Antes de enviar a validación:
- [x] Todas las piezas en cuarentena inspeccionadas
- [x] Disposición asignada a cada pieza NOK
- [x] Horas de trabajo registradas
- [x] Evidencia documentada

### Enviar a validación
1. Abre la campaña
2. Verifica los totales
3. Haz clic en "Enviar a Validación"
4. El estado cambia a "In Process"

---

## Proceso de Validación

### Revisar la campaña
Como validador, verifica:
- Cantidades inspeccionadas vs cuarentena
- Disposiciones asignadas correctamente
- Costos calculados
- Evidencia de inspección
- Causa raíz documentada

### Aprobar
Si todo está correcto:
1. Haz clic en "Aprobar"
2. Opcionalmente agrega comentarios
3. La campaña se cierra automáticamente

### Rechazar
Si hay problemas:
1. Haz clic en "Rechazar"
2. Indica el motivo del rechazo
3. La campaña regresa a "Open"
4. El responsable debe corregir

### Cierre anticipado
En casos especiales:
1. Selecciona "Cerrar Anticipadamente"
2. Proporciona el motivo
3. La campaña se cierra sin completar inspección

### Cancelar campaña
Si la campaña no procede:
1. Selecciona "Cancelar"
2. Indica el motivo
3. La campaña queda como "Cancelled"
        `
      },
      {
        id: 'mrb-shifts',
        title: 'Reporte de Turnos',
        content: `
## Gestión de Turnos

### Acceder al reporte
Ve a \`/mrb-shift-report\` o desde el detalle de la campaña.

### Registrar turno
Para cada día de inspección:

1. **Fecha**: Día de la inspección
2. **Turno**: 1°, 2° o 3° turno
3. **Horas trabajadas**: Total de horas del turno
4. **Inspectores**: Cantidad de inspectores
5. **Supervisores**: Cantidad de supervisores

### Cálculo de costo de turno
\`\`\`
Costo = (Inspectores × Horas × Tarifa Inspector) + (Supervisores × Horas × Tarifa Supervisor)
\`\`\`

### Turnos sin registrar
El sistema identifica:
- Días con campaña activa sin registro de horas
- Se muestran como "Turnos sin registrar"
- Puedes registrarlos desde la lista

### Editar turnos
1. Haz clic en "Editar" en la fila del turno
2. Modifica horas, inspectores o supervisores
3. Haz clic en "Guardar"
4. El costo se recalcula automáticamente

### Resumen de costos
El sistema muestra:
- Costo por día
- Costo acumulado
- Costo promedio por turno
        `
      },
      {
        id: 'mrb-campaigns',
        title: 'Lista de Campañas',
        content: `
## Consulta de Campañas

### Acceder a la lista
Ve a \`/mrb-campaigns\` desde el menú o dashboard.

### Pestañas de estado
| Pestaña | Descripción |
|---------|-------------|
| Borradores | Campañas sin publicar |
| Abiertos | Campañas activas |
| En Proceso | Pendientes de validación |
| Cancelados | Campañas canceladas |
| Cerrados | Campañas completadas |

### Contadores
Cada pestaña muestra el total de campañas en ese estado.

### Información por campaña
| Campo | Descripción |
|-------|-------------|
| Número | MRB-YYYY-XXXX |
| Título | Descripción de la campaña |
| Cliente | Cliente afectado |
| Estado | Estado actual |
| Fecha | Fecha de creación |
| Yield | Porcentaje OK |
| Costo | Costo total |

### Acciones
- **Ver**: Abre el detalle
- **Completar**: Continuar captura
- **Disponer**: Enviar a validación
- **Validar**: Aprobar/rechazar

### Turnos sin registrar
En la parte inferior se muestran:
- Campañas con días sin registro de horas
- Puedes registrar las horas directamente
        `
      },
      {
        id: 'mrb-config',
        title: 'Configuración',
        userType: 'admin',
        content: `
## Configuración del Módulo MRB

**Acceso**: Solo administradores (\`/mrb-config\`)

### Tarifas de personal
Configura los costos por hora:
| Rol | Descripción |
|-----|-------------|
| Tarifa Inspector | Costo por hora de inspector |
| Tarifa Supervisor | Costo por hora de supervisor |

### Turnos
Define los turnos disponibles:
- Código (1, 2, 3)
- Nombre (Primer turno, Segundo turno, etc.)
- Horario de inicio/fin

### Ubicaciones de cuarentena
Configura las ubicaciones:
- Almacén
- Proceso
- Tránsito
- Cliente
- Otras personalizadas

### Disposiciones
Define los tipos de disposición:
- Código
- Nombre
- Descripción
- Color

### Roles y Permisos
| Acción | Operador | Inspector | Validador | Admin |
|--------|----------|-----------|-----------|-------|
| Ver campañas | ✓ | ✓ | ✓ | ✓ |
| Crear campaña | ✗ | ✓ | ✓ | ✓ |
| Capturar | ✓ | ✓ | ✓ | ✓ |
| Dar disposición | ✗ | ✓ | ✓ | ✓ |
| Validar | ✗ | ✗ | ✓ | ✓ |
| Configurar | ✗ | ✗ | ✗ | ✓ |

### Notificaciones
Configura correos automáticos:
- Al crear campaña
- Al publicar
- Al enviar a validación
- Al aprobar/rechazar
- Al cerrar
        `
      },
      {
        id: 'mrb-tips',
        title: 'Tips y Mejores Prácticas',
        content: `
## Consejos para un MRB efectivo

### Al crear la campaña
- Vincula al 8D cuando exista para heredar datos
- Define claramente el criterio de inspección
- Incluye fotos de referencia OK y NOK
- Captura todas las ubicaciones de cuarentena

### Durante la inspección
- Registra resultados diariamente
- No acumules turnos sin registrar
- Documenta disposiciones al momento
- Toma fotos de evidencia

### En la disposición
- Verifica que las cantidades cuadren
- Justifica cada tipo de disposición
- Documenta casos especiales
- Revisa costos antes de enviar

### En la validación
- Verifica cuarentena vs inspeccionado
- Revisa costos calculados
- Solicita evidencia si es necesario
- No demores la aprobación

### Errores comunes a evitar
- No vincular al 8D relacionado
- Olvidar registrar horas de trabajo
- Disposiciones sin justificación
- Cerrar sin completar inspección
- No actualizar cuarentena

### Métricas de éxito
Un buen proceso MRB se mide por:
- Yield % > 90%
- Tiempo de cierre < 7 días
- Costo de scrap minimizado
- Turnos sin registrar = 0
- 100% de campañas cerradas formalmente
        `
      }
    ]
  }
};

// ============================================
// ÍNDICE DE MÓDULOS
// ============================================

const MODULE_INDEX = [
  { id: 'ecr', title: 'ECR - Engineering Change Request', icon: FileText, ready: true },
  { id: '8d', title: '8D Reports', icon: AlertTriangle, ready: true },
  { id: 'qar', title: 'Quality Alert (QAR)', icon: Shield, ready: true },
  { id: 'mrb', title: 'MRB - Material Review Board', icon: ClipboardList, ready: true },
  { id: 'audit', title: 'Auditorías Internas', icon: CheckCircle, ready: false },
  { id: 'hospital', title: 'Hospital de Defectos', icon: Wrench, ready: false },
  { id: 'skills', title: 'Skills / Competencias', icon: UserCheck, ready: false },
  { id: 'mgmt-review', title: 'Management Review', icon: TrendingUp, ready: false },
  { id: 'traceability', title: 'Unit Traceability', icon: Layers, ready: false },
  { id: 'clients', title: 'Clientes', icon: Users, ready: false },
  { id: 'admin', title: 'Administración', icon: Settings, ready: false }
];

// ============================================
// COMPONENTES
// ============================================

const MarkdownRenderer = ({ content, theme }) => {
  // Simple markdown parser
  const parseMarkdown = (text) => {
    const lines = text.trim().split('\n');
    const elements = [];
    let inTable = false;
    let tableRows = [];
    let inList = false;
    let listItems = [];
    let listType = 'ul';

    const flushList = () => {
      if (listItems.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag key={`list-${elements.length}`} style={{
            margin: '12px 0',
            paddingLeft: '24px',
            color: theme.text
          }}>
            {listItems.map((item, i) => (
              <li key={i} style={{ marginBottom: '6px', lineHeight: '1.6' }}>{item}</li>
            ))}
          </ListTag>
        );
        listItems = [];
        inList = false;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const rows = tableRows.slice(2); // Skip header separator
        elements.push(
          <div key={`table-${elements.length}`} style={{ overflowX: 'auto', margin: '16px 0' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: theme.bgPanel,
                      borderBottom: `2px solid ${theme.border}`,
                      fontWeight: '600',
                      color: theme.text
                    }}>{h.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: '10px 12px',
                        borderBottom: `1px solid ${theme.border}`,
                        color: theme.text
                      }}>{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      // Table detection
      if (line.startsWith('|')) {
        flushList();
        inTable = true;
        const cells = line.split('|').filter(c => c.trim() !== '');
        if (!line.includes('---')) {
          tableRows.push(cells);
        } else {
          tableRows.push(null); // Separator
        }
        return;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} style={{
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text,
            marginTop: '24px',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: `2px solid ${theme.primary}`
          }}>{line.replace('## ', '')}</h2>
        );
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} style={{
            fontSize: '16px',
            fontWeight: '600',
            color: theme.text,
            marginTop: '20px',
            marginBottom: '8px'
          }}>{line.replace('### ', '')}</h3>
        );
      } else if (line.startsWith('#### ')) {
        flushList();
        elements.push(
          <h4 key={index} style={{
            fontSize: '14px',
            fontWeight: '600',
            color: theme.textMuted,
            marginTop: '16px',
            marginBottom: '6px'
          }}>{line.replace('#### ', '')}</h4>
        );
      }
      // Horizontal rule
      else if (line.startsWith('---')) {
        flushList();
        elements.push(
          <hr key={index} style={{
            border: 'none',
            borderTop: `1px solid ${theme.border}`,
            margin: '24px 0'
          }} />
        );
      }
      // Checkbox list
      else if (line.match(/^- \[[ x]\]/)) {
        flushList();
        const checked = line.includes('[x]');
        const text = line.replace(/^- \[[ x]\] /, '');
        elements.push(
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
            color: theme.text
          }}>
            <input type="checkbox" checked={checked} readOnly style={{ margin: 0 }} />
            <span>{text}</span>
          </div>
        );
      }
      // Unordered list
      else if (line.match(/^- /)) {
        inList = true;
        listType = 'ul';
        listItems.push(line.replace(/^- /, ''));
      }
      // Ordered list
      else if (line.match(/^\d+\. /)) {
        inList = true;
        listType = 'ol';
        listItems.push(line.replace(/^\d+\. /, ''));
      }
      // Code block (inline)
      else if (line.includes('`')) {
        flushList();
        const parts = line.split(/(`[^`]+`)/);
        elements.push(
          <p key={index} style={{ margin: '8px 0', lineHeight: '1.6', color: theme.text }}>
            {parts.map((part, i) => {
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code key={i} style={{
                    backgroundColor: theme.bgPanel,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}>{part.slice(1, -1)}</code>
                );
              }
              // Bold
              if (part.includes('**')) {
                const boldParts = part.split(/(\*\*[^*]+\*\*)/);
                return boldParts.map((bp, j) => {
                  if (bp.startsWith('**') && bp.endsWith('**')) {
                    return <strong key={j}>{bp.slice(2, -2)}</strong>;
                  }
                  return bp;
                });
              }
              return part;
            })}
          </p>
        );
      }
      // Bold text
      else if (line.includes('**')) {
        flushList();
        const parts = line.split(/(\*\*[^*]+\*\*)/);
        elements.push(
          <p key={index} style={{ margin: '8px 0', lineHeight: '1.6', color: theme.text }}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      }
      // Regular paragraph
      else if (line.trim()) {
        flushList();
        elements.push(
          <p key={index} style={{ margin: '8px 0', lineHeight: '1.6', color: theme.text }}>
            {line}
          </p>
        );
      }
    });

    flushList();
    flushTable();

    return elements;
  };

  return <div>{parseMarkdown(content)}</div>;
};

// ============================================
// PÁGINA PRINCIPAL
// ============================================

const UserManual = () => {
  const { theme } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [selectedModule, setSelectedModule] = useState('ecr');
  const [selectedSection, setSelectedSection] = useState(null);
  const [expandedModules, setExpandedModules] = useState({ ecr: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // all, operator, approver, admin

  const moduleData = MANUAL_CONTENT[selectedModule];

  useEffect(() => {
    if (moduleData && moduleData.sections.length > 0 && !selectedSection) {
      setSelectedSection(moduleData.sections[0].id);
    }
  }, [selectedModule, moduleData, selectedSection]);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const filteredSections = moduleData?.sections.filter(section => {
    if (userFilter === 'all') return true;
    if (!section.userType) return true;
    return section.userType === userFilter;
  }) || [];

  const currentSection = moduleData?.sections.find(s => s.id === selectedSection);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      display: 'flex'
    }}>
      {/* Sidebar */}
      <div style={{
        width: '300px',
        backgroundColor: theme.bgCard,
        borderRight: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Book size={24} color={theme.primary} />
              <h1 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: theme.text,
                margin: 0
              }}>Manual de Usuario</h1>
            </div>
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: theme.bgPanel, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
          </div>

          {/* Search */}
          <div style={{
            position: 'relative'
          }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme.textMuted
            }} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* User Filter */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'operator', label: 'Usuario' },
            { id: 'approver', label: 'Aprobador' },
            { id: 'admin', label: 'Admin' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setUserFilter(filter.id)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: userFilter === filter.id ? theme.primary : theme.bgPanel,
                color: userFilter === filter.id ? 'white' : theme.textMuted
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Module List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {MODULE_INDEX.map(module => {
            const Icon = module.icon;
            const isExpanded = expandedModules[module.id];
            const isSelected = selectedModule === module.id;
            const content = MANUAL_CONTENT[module.id];

            return (
              <div key={module.id} style={{ marginBottom: '4px' }}>
                <button
                  onClick={() => {
                    if (module.ready) {
                      setSelectedModule(module.id);
                      toggleModule(module.id);
                      if (content?.sections[0]) {
                        setSelectedSection(content.sections[0].id);
                      }
                    }
                  }}
                  disabled={!module.ready}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: module.ready ? 'pointer' : 'not-allowed',
                    backgroundColor: isSelected ? `${theme.primary}15` : 'transparent',
                    color: module.ready ? theme.text : theme.textMuted,
                    opacity: module.ready ? 1 : 0.5,
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                >
                  {module.ready && (
                    isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                  {!module.ready && <span style={{ width: 16 }} />}
                  <Icon size={18} color={isSelected ? theme.primary : theme.textMuted} />
                  <span style={{ flex: 1 }}>{module.title}</span>
                  {!module.ready && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: theme.bgPanel,
                      borderRadius: '4px'
                    }}>Próximamente</span>
                  )}
                </button>

                {/* Sections */}
                {isExpanded && content && (
                  <div style={{ marginLeft: '26px', marginTop: '4px' }}>
                    {filteredSections.map(section => (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSection(section.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: selectedSection === section.id ? theme.bgPanel : 'transparent',
                          color: selectedSection === section.id ? theme.primary : theme.textMuted,
                          textAlign: 'left',
                          fontSize: '13px'
                        }}
                      >
                        <ArrowRight size={14} />
                        {section.title}
                        {section.userType && (
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 4px',
                            backgroundColor: section.userType === 'admin' ? '#ef444420' :
                                           section.userType === 'approver' ? '#f59e0b20' : '#22c55e20',
                            color: section.userType === 'admin' ? '#ef4444' :
                                   section.userType === 'approver' ? '#f59e0b' : '#22c55e',
                            borderRadius: '3px'
                          }}>
                            {section.userType === 'admin' ? 'Admin' :
                             section.userType === 'approver' ? 'Aprob.' : 'Usuario'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${theme.border}`,
          fontSize: '12px',
          color: theme.textMuted
        }}>
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: theme.primary,
              textDecoration: 'none'
            }}
          >
            <Home size={14} />
            Volver al sistema
          </a>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        marginLeft: '300px',
        padding: '40px 60px',
        maxWidth: '900px'
      }}>
        {moduleData && currentSection ? (
          <>
            {/* Breadcrumb */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              color: theme.textMuted
            }}>
              <span>{moduleData.title}</span>
              <ChevronRight size={14} />
              <span style={{ color: theme.text }}>{currentSection.title}</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '8px'
            }}>{currentSection.title}</h1>

            {/* User type badge */}
            {currentSection.userType && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: currentSection.userType === 'admin' ? '#ef444420' :
                               currentSection.userType === 'approver' ? '#f59e0b20' : '#22c55e20',
                color: currentSection.userType === 'admin' ? '#ef4444' :
                       currentSection.userType === 'approver' ? '#f59e0b' : '#22c55e',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '24px'
              }}>
                <Info size={14} />
                {currentSection.userType === 'admin' ? 'Sección para Administradores' :
                 currentSection.userType === 'approver' ? 'Sección para Aprobadores' :
                 'Sección para Usuarios'}
              </div>
            )}

            {/* Content */}
            <div style={{
              backgroundColor: theme.bgCard,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              padding: '32px'
            }}>
              <MarkdownRenderer content={currentSection.content} theme={theme} />
            </div>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: `1px solid ${theme.border}`
            }}>
              {(() => {
                const currentIndex = filteredSections.findIndex(s => s.id === selectedSection);
                const prevSection = currentIndex > 0 ? filteredSections[currentIndex - 1] : null;
                const nextSection = currentIndex < filteredSections.length - 1 ? filteredSections[currentIndex + 1] : null;

                return (
                  <>
                    {prevSection ? (
                      <button
                        onClick={() => setSelectedSection(prevSection.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          backgroundColor: theme.bgCard,
                          color: theme.text,
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                        {prevSection.title}
                      </button>
                    ) : <div />}

                    {nextSection ? (
                      <button
                        onClick={() => setSelectedSection(nextSection.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          backgroundColor: theme.primary,
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {nextSection.title}
                        <ChevronRight size={16} />
                      </button>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            color: theme.textMuted
          }}>
            <Book size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Selecciona un módulo del menú lateral</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManual;
