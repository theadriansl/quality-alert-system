# Guía de Usuario - Gestión de Contactos del Cliente

## Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Acceso a los Contactos](#acceso-a-los-contactos)
3. [Visualizar Contactos](#visualizar-contactos)
4. [Agregar Contactos Manualmente](#agregar-contactos-manualmente)
5. [Editar Contactos](#editar-contactos)
6. [Eliminar Contactos](#eliminar-contactos)
7. [Descargar Plantilla Excel](#descargar-plantilla-excel)
8. [Importar Contactos desde Excel](#importar-contactos-desde-excel)
9. [Exportar Contactos a Excel](#exportar-contactos-a-excel)
10. [Validaciones y Reglas](#validaciones-y-reglas)
11. [Mensajes de Error](#mensajes-de-error)

---

## Descripción General

El módulo de gestión de contactos permite administrar la información de las personas de contacto asociadas a cada cliente del sistema. Los contactos pertenecen al cliente y no a proyectos individuales.

### Características Principales:
- ✅ Agregar contactos manualmente mediante formulario
- ✅ Editar contactos existentes sin eliminar y recrear
- ✅ Eliminar contactos con confirmación de seguridad
- ✅ Importar múltiples contactos desde archivos Excel
- ✅ Exportar contactos actuales a Excel
- ✅ Descargar plantilla Excel pre-configurada
- ✅ Validación automática de campos requeridos
- ✅ Validación de formato de email
- ✅ Prevención de contactos duplicados por email
- ✅ Notificaciones visuales (toasts) en lugar de alertas

---

## Acceso a los Contactos

1. Navegue al módulo de **Clientes**
2. Haga click en un cliente para ver sus detalles
3. Seleccione el tab **"Contactos"** en la barra de navegación

---

##  Visualizar Contactos

En el tab de Contactos verá:

### Encabezado de Sección
- **Título**: "Contactos del Cliente" con contador de contactos totales
- **Botones de acción**:
  - 🟢 **Plantilla**: Descarga plantilla Excel
  - 🟣 **Importar**: Importa contactos desde Excel
  - 🔵 **Exportar**: Exporta contactos a Excel

### Lista de Contactos
Cada contacto muestra:
- **Avatar circular** con inicial del nombre
- **Nombre completo** (texto en negrita)
- **Cargo/Puesto** (debajo del nombre)
- **Email** con ícono de correo
- **Teléfono** con ícono (si está disponible)
- **Botones de acción**:
  - 🔵 **Editar**: Activa modo edición
  - 🔴 **Eliminar**: Elimina el contacto

### Sin Contactos
Si no hay contactos, se muestra:
- Ícono de usuarios en gris
- Mensaje: "No hay contactos disponibles"
- Sugerencia: "Agregue contactos manualmente o importe desde un archivo Excel"

---

## Agregar Contactos Manualmente

### Pasos:

1. **Localice el formulario** con fondo azul claro y título "➕ Agregar Nuevo Contacto"

2. **Complete los campos**:

   | Campo | Tipo | Requerido | Ejemplo |
   |-------|------|-----------|---------|
   | **Nombre** | Texto | ✅ Sí | Juan Pérez García |
   | **Título/Cargo** | Texto | ❌ No | Quality Manager |
   | **Email** | Email | ✅ Sí | juan.perez@example.com |
   | **Teléfono** | Texto | ❌ No | +52 442 123 4567 |

3. **Haga click en "Agregar Contacto"**

4. **Resultado**:
   - ✅ Toast verde: "Contacto agregado exitosamente"
   - El contacto aparece en la lista inmediatamente
   - El formulario se limpia automáticamente
   - Los cambios se guardan en el backend

### Validaciones Automáticas:
- ❌ Si falta nombre: "Nombre y email son obligatorios"
- ❌ Si falta email: "Nombre y email son obligatorios"
- ❌ Si email inválido: "Email inválido"
- ⚠️ Si email duplicado: "Ya existe un contacto con este email"

---

## Editar Contactos

### Pasos:

1. **Localice el contacto** en la lista
2. **Haga click en "Editar"** (botón azul claro)
3. **El contacto cambiará a modo edición** con fondo amarillo claro
4. **Modifique los campos** deseados
5. **Opciones**:
   - 🟢 **Guardar**: Guarda los cambios
   - ⚪ **Cancelar**: Descarta los cambios

### Características del Modo Edición:
- **Fondo amarillo** (#fef3c7) para identificar fácilmente
- **Título**: "✏️ Editar Contacto"
- **Todos los campos editables** en formulario de 2 columnas
- **Botones grandes** al final del formulario
- **Solo un contacto** puede estar en modo edición a la vez

### Validaciones:
- Mismas validaciones que al agregar
- **Previene duplicados** excluyendo el contacto actual
- ✅ Toast verde: "Contacto actualizado exitosamente"

---

## Eliminar Contactos

### Pasos:

1. **Localice el contacto** en la lista
2. **Haga click en "Eliminar"** (botón rojo claro)
3. **Confirme la eliminación** en el diálogo:
   - Mensaje: "¿Estás seguro de que deseas eliminar este contacto?"
   - **Aceptar**: Elimina el contacto
   - **Cancelar**: No hace nada

4. **Resultado** (si acepta):
   - ✅ Toast verde: "Contacto eliminado exitosamente"
   - El contacto desaparece de la lista inmediatamente
   - Los cambios se guardan en el backend

### Importante:
- ⚠️ **Esta acción NO se puede deshacer**
- La confirmación previene eliminaciones accidentales

---

## Descargar Plantilla Excel

### Pasos:

1. **Haga click en "Plantilla"** (botón verde en el encabezado)
2. **Se descargará** automáticamente: `Plantilla_Contactos.xlsx`

### Contenido de la Plantilla:

La plantilla incluye:
- **Encabezados**: Nombre, Cargo/Puesto, Email, Teléfono
- **Fila de ejemplo** con datos de muestra
- **Fila vacía** para agregar el primer contacto
- **Columnas ajustadas** automáticamente

### Ejemplo de Contenido:

| Nombre | Cargo/Puesto | Email | Teléfono |
|--------|--------------|-------|----------|
| Juan Pérez | Quality Manager | juan.perez@example.com | +52-442-123-4567 |
| | | | |

---

## Importar Contactos desde Excel

### Pasos:

1. **Prepare su archivo Excel**:
   - Use la plantilla descargada o cree uno similar
   - Asegúrese de tener las columnas correctas

2. **Haga click en "Importar"** (botón púrpura)

3. **Seleccione el archivo** Excel (.xlsx o .xls)

4. **El sistema procesará el archivo**:
   - Validará cada fila
   - Importará solo filas válidas
   - Omitirá filas con errores
   - Mostrará resultado al finalizar

### Formato del Archivo Excel:

| Columna | Requerido | Validación |
|---------|-----------|------------|
| **Nombre** | ✅ Sí | No vacío |
| **Cargo/Puesto** | ❌ No | Opcional |
| **Email** | ✅ Sí | Formato email válido |
| **Teléfono** | ❌ No | Opcional |

### Resultados Posibles:

#### ✅ Importación Exitosa
- Toast verde: "Se importaron X contactos exitosamente"
- Todos los contactos válidos se agregan a la lista

#### ⚠️ Importación con Errores
- Toast verde: "Se importaron X contactos exitosamente (Y filas con errores fueron omitidas)"
- Solo contactos válidos se importan
- Filas con errores se reportan en toast adicional

#### ❌ Sin Contactos Válidos
- Toast rojo: "No se pudo importar ningún contacto debido a errores de validación"
- Ningún contacto se agrega

#### ⚠️ Archivo Vacío
- Toast naranja: "No se encontraron contactos válidos en el archivo"

### Ejemplos de Errores:

El sistema reporta hasta 5 errores con número de fila:

```
Errores encontrados:
- Fila 2: Falta nombre requerido
- Fila 3: Email inválido (invalid-email)
- Fila 5: Falta email requerido
```

---

## Exportar Contactos a Excel

### Pasos:

1. **Haga click en "Exportar"** (botón azul)
   - Si no hay contactos, se mostrará: ⚠️ "No hay contactos para exportar"

2. **Se descargará** automáticamente un archivo:
   - Nombre: `Contactos_Exportados_YYYY-MM-DD.xlsx`
   - Ejemplo: `Contactos_Exportados_2025-11-08.xlsx`

### Contenido del Archivo:

- **Todos los contactos** del cliente actual
- **Columnas**: Nombre, Cargo/Puesto, Email, Teléfono
- **Formato** compatible para re-importación
- **Columnas ajustadas** automáticamente

### Casos de Uso:
- 📋 **Backup** de contactos
- 📊 **Análisis** en Excel
- 📤 **Compartir** con otros sistemas
- 🔄 **Migración** de datos
- ✏️ **Edición masiva** (exportar, editar, re-importar)

---

## Validaciones y Reglas

### Campos Requeridos

| Campo | Requerido | Mensaje de Error |
|-------|-----------|------------------|
| Nombre | ✅ Sí | "Nombre y email son obligatorios" |
| Email | ✅ Sí | "Nombre y email son obligatorios" |
| Cargo | ❌ No | - |
| Teléfono | ❌ No | - |

### Validación de Email

**Formato esperado**: `usuario@dominio.com`

**Regex utilizado**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

#### ✅ Emails Válidos:
- juan.perez@example.com
- maria_garcia@company.mx
- carlos+work@test.co.uk

#### ❌ Emails Inválidos:
- invalid-email (falta @)
- carlos@ (falta dominio)
- @example.com (falta usuario)
- user@domain (falta extensión)

### Prevención de Duplicados

**Criterio**: Email (sin importar mayúsculas/minúsculas)

#### Comportamiento:
- Al agregar: Verifica contra todos los contactos existentes
- Al editar: Verifica contra todos excepto el contacto actual
- Mensaje: ⚠️ "Ya existe un contacto con este email"

#### Ejemplo:
```
Contacto existente: Juan.Perez@Example.com
Intento agregar: juan.perez@example.com
Resultado: ❌ Rechazado (mismo email)
```

### Límites y Restricciones

- **Máximo contactos**: Sin límite técnico
- **Tamaño archivo Excel**: Depende del navegador (~10MB recomendado)
- **Filas por importación**: Sin límite (recomendado <1000 para rendimiento)

---

## Mensajes de Error

### Errores de Validación

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "Nombre y email son obligatorios" | Falta nombre o email | Complete ambos campos |
| "Email inválido" | Formato de email incorrecto | Use formato usuario@dominio.com |
| "Ya existe un contacto con este email" | Email duplicado | Use otro email o edite contacto existente |

### Errores de Importación

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "No se encontraron contactos válidos en el archivo" | Archivo vacío o sin datos | Agregue contactos al archivo Excel |
| "No se pudo importar ningún contacto debido a errores de validación" | Todos los contactos tienen errores | Revise y corrija el archivo Excel |
| "Error al importar archivo: [detalle]" | Error técnico | Verifique el formato del archivo |

### Errores del Sistema

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "Error al agregar contacto: [detalle]" | Fallo en comunicación con backend | Intente nuevamente o contacte soporte |
| "Error al eliminar contacto: [detalle]" | Fallo en comunicación con backend | Intente nuevamente o contacte soporte |
| "Error al actualizar contacto: [detalle]" | Fallo en comunicación con backend | Intente nuevamente o contacte soporte |

---

## Tips y Mejores Prácticas

### ✅ Recomendaciones:

1. **Use la plantilla Excel** para evitar errores de formato
2. **Valide emails** antes de importar archivos grandes
3. **Haga backup** exportando contactos periódicamente
4. **Agregue cargos** para identificar roles rápidamente
5. **Use formato internacional** para teléfonos (+52 442 123 4567)
6. **Revise duplicados** antes de importar

### ⚠️ Evite:

1. **No importe archivos** con formato incorrecto
2. **No elimine contactos** sin confirmar primero
3. **No deje campos vacíos** en campos requeridos
4. **No use emails genéricos** (info@, admin@) cuando sea posible

---

## Preguntas Frecuentes (FAQ)

### ¿Los contactos se comparten entre proyectos?
No, los contactos pertenecen al **cliente**, no a proyectos individuales. Todos los proyectos del cliente tienen acceso a los mismos contactos.

### ¿Puedo importar contactos de otros sistemas?
Sí, siempre que el archivo Excel tenga las columnas correctas: Nombre, Cargo/Puesto, Email, Teléfono.

### ¿Qué pasa con las filas con errores al importar?
Se omiten automáticamente. Solo se importan las filas válidas. Los errores se reportan en un mensaje detallado.

### ¿Puedo editar múltiples contactos a la vez?
No directamente en la interfaz. Puede exportar, editar en Excel, y re-importar para edición masiva.

### ¿Se guardan los cambios automáticamente?
Sí, todos los cambios (agregar, editar, eliminar, importar) se guardan inmediatamente en el backend.

### ¿Puedo deshacer una eliminación?
No, las eliminaciones son permanentes. Por eso se solicita confirmación antes de eliminar.

### ¿Cuántos contactos puedo tener por cliente?
No hay límite técnico, pero se recomienda mantener solo contactos activos y relevantes.

---

## Soporte Técnico

Para asistencia adicional:
- Consulte la documentación del sistema
- Contacte al administrador del sistema
- Revise los logs del navegador (F12 → Console) para errores técnicos

---

**Última actualización**: Noviembre 2025
**Versión del documento**: 1.0
**Sistema**: Quality Alert System - Módulo de Gestión de Contactos
