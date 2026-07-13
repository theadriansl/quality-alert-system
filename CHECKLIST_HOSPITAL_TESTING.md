# CHECKLIST TESTING - Hospital de Defectos v2.0
## Con Separación por Roles (Reparación / Liberación / Admin)

---

## 1. ACCESO Y NAVEGACIÓN POR ROLES

### 1.1 Hospital Dashboard - Acceso por Rol
- [ ] Botón "🔧 Reparación" abre modal de selección de estación de reparación
- [ ] Botón "✅ Liberación" abre modal de selección de estación de liberación
- [ ] Botón "⚙️ Admin" navega directo a `/defect-hospital?mode=admin`
- [ ] Modal muestra lista de estaciones correctas según tipo (REPAIR/RELEASE)
- [ ] Seleccionar estación guarda en localStorage y navega correctamente
- [ ] Cancelar modal cierra sin navegar

### 1.2 Modo Reparación (`?mode=repair`)
- [ ] Título muestra badge "Reparadores"
- [ ] Barra de modo muestra "🔧 Modo Reparación" con fondo amarillo
- [ ] Solo muestra estación de reparación (no liberación)
- [ ] Tabs visibles: General, Pendientes, En Reparación, WIP
- [ ] Tab "Liberaciones" NO visible
- [ ] Stats: Pendientes Reparación, En Reparación (no Pendientes Liberación)
- [ ] Botón "Entregar a QA" visible
- [ ] Botón "Cambiar modo" visible y funcional

### 1.3 Modo Liberación (`?mode=release`)
- [ ] Título muestra badge "Calidad"
- [ ] Barra de modo muestra "✅ Modo Liberación" con fondo verde
- [ ] Solo muestra estación de liberación (no reparación)
- [ ] Tabs visibles: General, Liberaciones, WIP
- [ ] Tabs "Pendientes" y "En Reparación" NO visibles
- [ ] Stats: Pendientes Liberación (no stats de reparación)
- [ ] Botón "Entregar a QA" NO visible
- [ ] Botón "Asignar Ubicación" SÍ visible
- [ ] Botón "Cambiar modo" visible y funcional

### 1.4 Modo Admin (`?mode=admin` o sin parámetro)
- [ ] Sin badge en título
- [ ] Barra de modo muestra "⚙️ Modo Admin" con fondo gris
- [ ] Muestra AMBAS estaciones (reparación y liberación)
- [ ] TODOS los tabs visibles
- [ ] TODOS los stats visibles
- [ ] TODOS los botones de acción visibles
- [ ] Sin botón "Cambiar modo"

---

## 2. ACCIONES POR ESTADO Y MODO

### 2.1 Estado OPEN (Sin iniciar)
| Acción | Reparación | Liberación | Admin |
|--------|------------|------------|-------|
| Asignar Ubicación (si no tiene) | ✅ | ✅ | ✅ |
| Iniciar Reparación | ✅ | ❌ | ✅ |

- [ ] Sin ubicación: solo muestra "📍 Asignar" en todos los modos
- [ ] Con ubicación + Modo Reparación: muestra "Iniciar"
- [ ] Con ubicación + Modo Liberación: NO muestra acciones
- [ ] Con ubicación + Modo Admin: muestra "Iniciar"

### 2.2 Estado IN_REPAIR (En reparación)
| Acción | Reparación | Liberación | Admin |
|--------|------------|------------|-------|
| Completar | ✅ | ❌ | ✅ |
| Cuarentena | ✅ | ❌ | ✅ |

- [ ] Modo Reparación: muestra "Completar" y "Cuarentena"
- [ ] Modo Liberación: NO muestra acciones
- [ ] Modo Admin: muestra "Completar" y "Cuarentena"

### 2.3 Estado REPAIRED/IN_VALIDATION (Pendiente liberación)
| Acción | Reparación | Liberación | Admin |
|--------|------------|------------|-------|
| Liberar | ❌ | ✅ | ✅ |
| Rechazar | ❌ | ✅ | ✅ |

- [ ] Modo Reparación: muestra badge "En QA" (sin acciones)
- [ ] Modo Liberación: muestra "Liberar" y "Rechazar"
- [ ] Modo Admin: muestra "Liberar" y "Rechazar"

### 2.4 Estado QUARANTINE (Cuarentena)
| Acción | Reparación | Liberación | Admin |
|--------|------------|------------|-------|
| Reintentar | ✅ | ❌ | ✅ |
| Scrap | ❌ | ✅ | ✅ |

- [ ] Modo Reparación: muestra "Reintentar"
- [ ] Modo Liberación: muestra "Scrap"
- [ ] Modo Admin: muestra "Reintentar" y "Scrap"

### 2.5 Estado REJECTED (Rechazado)
- [ ] Modo Reparación: muestra "Reiniciar" y "Cuarentena"
- [ ] Modo Liberación: sin acciones
- [ ] Modo Admin: muestra "Reiniciar" y "Cuarentena"

---

## 3. FUNCIONALIDAD OPERATIVA

### 3.1 Tab Pendientes (Modo Reparación/Admin)
- [ ] Sub-tab "Sin Ubicación" muestra piezas sin `current_location_id`
- [ ] Sub-tab "En Cola" muestra piezas CON ubicación asignada
- [ ] Contadores en sub-tabs son correctos
- [ ] Mensaje contextual cambia según sub-tab

### 3.2 Asignar Ubicación (Modal)
- [ ] Escanear/escribir código de ubicación
- [ ] Validación en tiempo real del código
- [ ] Lista de ubicaciones disponibles para seleccionar
- [ ] Agregar seriales a la lista
- [ ] Ejecutar asignación batch
- [ ] Resultados: asignados, no encontrados, errores
- [ ] Actualiza TODOS los defectos del serial (no solo uno)

### 3.3 Iniciar Reparación
- [ ] Doble-click inicia reparación rápida
- [ ] Pieza pasa a estado IN_REPAIR
- [ ] Aparece en tab "En Reparación"
- [ ] Se registra `repair_started_at`

### 3.4 Completar Reparación
- [ ] Modal solicita: Tipo reparación, Tiempo, Notas
- [ ] Validación de campos requeridos
- [ ] Pieza pasa a estado REPAIRED
- [ ] Aparece en tab "Liberaciones"
- [ ] Se registra `repaired_at`, `repair_type_id`, `repair_time_minutes`

### 3.5 Entregar a QA (Modal Batch)
- [ ] Escanear código de ubicación de liberación
- [ ] Solo acepta ubicaciones tipo RELEASE
- [ ] Escanear seriales a entregar
- [ ] Ejecutar entrega batch
- [ ] Actualiza `release_station_id` y ubicación

### 3.6 Liberar Defecto
- [ ] Modal solicita: Razón liberación, Causa raíz, Tiempo, Notas
- [ ] Validación de campos requeridos
- [ ] Pieza pasa a estado RELEASED/CLOSED
- [ ] Desaparece de listados activos

### 3.7 Rechazar Defecto
- [ ] Modal solicita: Notas de rechazo
- [ ] Opción de reasignar departamento responsable
- [ ] Pieza regresa a estado REJECTED
- [ ] Incrementa `repair_attempts`
- [ ] Aparece nuevamente en pendientes de reparación

### 3.8 Cuarentena
- [ ] Pieza pasa a estado QUARANTINE
- [ ] Se puede reintentar o enviar a scrap

### 3.9 Scrap
- [ ] Pieza pasa a estado SCRAPPED
- [ ] Desaparece de listados activos

---

## 4. VISUALIZACIÓN Y DATOS

### 4.1 Tabla de Defectos
- [ ] Columnas: Tiempo, Entry#, Serial, Parte, Ubicación, Defecto, Depto, Estado, Acciones
- [ ] Ubicación muestra código con badge azul o "—" si no tiene
- [ ] Tabla usa ancho completo (100%)
- [ ] Columnas con ancho fijo (tableLayout: fixed)

### 4.2 Indicadores de Tiempo
- [ ] Verde: < 24 horas
- [ ] Amarillo: 24-48 horas
- [ ] Rojo: > 48 horas

### 4.3 Tab General (Historial)
- [ ] Muestra todos los defectos del sistema
- [ ] Incluye columna de ubicación
- [ ] Agrupado por serial

### 4.4 Tab WIP
- [ ] Muestra WIP por ubicación física
- [ ] Conteo de piezas por ubicación
- [ ] Promedio de horas en espera

---

## 5. PERSISTENCIA Y SESIÓN

### 5.1 Estaciones de Sesión
- [ ] Estación de reparación se guarda en localStorage (`hospital_repair_station`)
- [ ] Estación de liberación se guarda en localStorage (`hospital_release_station`)
- [ ] Al recargar página en modo específico, recupera estación guardada
- [ ] Botón X limpia estación de sesión

### 5.2 Modo de Acceso
- [ ] URL con `?mode=repair` activa modo reparación
- [ ] URL con `?mode=release` activa modo liberación
- [ ] URL con `?mode=admin` o sin parámetro activa modo admin
- [ ] Navegación entre modos mantiene consistencia

---

## 6. FLUJOS E2E

### 6.1 Flujo Reparador
1. [ ] Acceder desde Dashboard → "🔧 Reparación"
2. [ ] Seleccionar estación de reparación
3. [ ] Ver piezas en "Sin Ubicación"
4. [ ] Asignar ubicación a pieza
5. [ ] Ver pieza en "En Cola"
6. [ ] Iniciar reparación (doble-click)
7. [ ] Ver pieza en "En Reparación"
8. [ ] Completar reparación
9. [ ] Entregar a QA (batch)
10. [ ] Verificar que pieza aparece en Liberaciones (cambiar a admin para verificar)

### 6.2 Flujo Calidad
1. [ ] Acceder desde Dashboard → "✅ Liberación"
2. [ ] Seleccionar estación de liberación
3. [ ] Ver piezas pendientes de liberación
4. [ ] Liberar pieza (con razón y causa raíz)
5. [ ] Verificar que pieza desaparece del listado
6. [ ] Alternativamente: Rechazar pieza
7. [ ] Verificar que pieza regresa a reparación (cambiar a admin para verificar)

### 6.3 Flujo Admin Completo
1. [ ] Acceder desde Dashboard → "⚙️ Admin"
2. [ ] Verificar acceso a todos los tabs
3. [ ] Verificar ambas estaciones visibles
4. [ ] Ejecutar acción de reparación
5. [ ] Ejecutar acción de liberación
6. [ ] Verificar flujo completo en una sola sesión

---

## 7. MANEJO DE ERRORES

- [ ] Error de red muestra mensaje apropiado
- [ ] Validaciones de formulario funcionan
- [ ] Estación no seleccionada muestra indicador visual
- [ ] Código de ubicación inválido muestra error
- [ ] Serial no encontrado aparece en lista de errores

---

## 8. TESTING POR USUARIOS

### 8.1 Usuarios de Prueba

| Usuario | Email | Password | Rol Sistema | Rol Hospital |
|---------|-------|----------|-------------|--------------|
| Admin | admin@8dsystem.com | admin123 | Admin | admin |
| Técnico | technician@8dsystem.com | password123 | Technician | repairer |
| Ingeniero | engineer@8dsystem.com | password123 | Engineer | inspector |
| Analista | analyst@8dsystem.com | password123 | Analyst | - |

### 8.2 Usuario Admin (admin@8dsystem.com)
- [ ] Login exitoso
- [ ] Hospital Dashboard: ve botones Reparación, Liberación, Admin
- [ ] Puede acceder a `/defect-hospital?mode=admin`
- [ ] Puede acceder a `/defect-hospital?mode=repair`
- [ ] Puede acceder a `/defect-hospital?mode=release`
- [ ] Puede acceder a `/defect-admin`
- [ ] Ve tab "Roles Hospital" en DefectAdmin
- [ ] Puede asignar/quitar roles hospital a usuarios
- [ ] Ve TODOS los tabs en DefectHospital
- [ ] Puede ejecutar TODAS las acciones

### 8.3 Usuario Técnico/Reparador (technician@8dsystem.com)
- [ ] Login exitoso
- [ ] Hospital Dashboard: solo ve botón "Reparación"
- [ ] NO ve botón "Liberación"
- [ ] NO ve botón "Admin"
- [ ] Puede acceder a `/defect-hospital?mode=repair`
- [ ] NO puede acceder a `/defect-admin` (redirige a Home)
- [ ] Tabs visibles: General, Pendientes, En Reparación, WIP
- [ ] Tab "Liberaciones" NO visible
- [ ] Puede: Iniciar, Completar, Cuarentena, Reiniciar
- [ ] NO puede: Liberar, Rechazar, Scrap

### 8.4 Usuario Ingeniero/Inspector (engineer@8dsystem.com)
- [ ] Login exitoso
- [ ] Hospital Dashboard: solo ve botón "Liberación"
- [ ] NO ve botón "Reparación"
- [ ] NO ve botón "Admin"
- [ ] Puede acceder a `/defect-hospital?mode=release`
- [ ] NO puede acceder a `/defect-admin` (redirige a Home)
- [ ] Tabs visibles: General, Liberaciones, WIP
- [ ] Tabs "Pendientes" y "En Reparación" NO visibles
- [ ] Puede: Liberar, Rechazar, Scrap
- [ ] NO puede: Iniciar, Completar, Cuarentena

### 8.5 Usuario Analista sin rol hospital (analyst@8dsystem.com)
- [ ] Login exitoso
- [ ] Hospital Dashboard: NO ve ningún botón de acceso
- [ ] NO puede acceder a ningún modo de hospital
- [ ] NO puede acceder a `/defect-admin`
- [ ] Mensaje informativo de "Sin permisos asignados"

### 8.6 Cambio de Roles en Tiempo Real
- [ ] Admin asigna rol `repairer` a Analista
- [ ] Analista cierra sesión y vuelve a entrar
- [ ] Analista ahora ve botón "Reparación"
- [ ] Admin quita rol a Analista
- [ ] Analista cierra sesión y vuelve a entrar
- [ ] Analista ya NO ve botón "Reparación"

### 8.7 Protección de Rutas Directas
- [ ] Técnico intenta navegar directo a `?mode=release` → Sin acceso/tabs limitados
- [ ] Ingeniero intenta navegar directo a `?mode=repair` → Sin acceso/tabs limitados
- [ ] Usuario sin rol intenta navegar a cualquier modo → Sin acceso

---

## NOTAS DE TESTING

**Fecha:** _______________
**Tester:** _______________
**Ambiente:** _______________

**Observaciones:**
```




```

**Bugs encontrados:**
```




```
