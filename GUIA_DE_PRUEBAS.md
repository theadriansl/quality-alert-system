# GUÍA DE PRUEBAS - Sistema de Gestión de Partes

## Archivos de Prueba Generados

Se han creado 2 archivos Excel de prueba en la carpeta `frontend/`:

### 1. TEST_Partes_VALIDAS.xlsx
**Propósito:** Validar que el sistema importa correctamente datos válidos

**Contenido:**
- ✅ **TEST-001**: Valores normales (peso: 5.5 kg, cantidad: 100, volumen: 0.15 m³)
- ✅ **TEST-002**: Valores mínimos (peso: 0, cantidad: 0, volumen: 0)
- ✅ **TEST-003**: Valores máximos (peso: 10000 kg, cantidad: 1000000, volumen: 1000 m³)
- ✅ **TEST-004**: Campos opcionales vacíos
- ✅ **TEST-005**: Valores decimales de precisión

**Resultado Esperado:** 5 partes importadas exitosamente, sin errores

---

### 2. TEST_Partes_CON_ERRORES.xlsx
**Propósito:** Validar que el sistema detecta y reporta errores correctamente

**Contenido:**

#### Errores que deben ser detectados (5 filas):
- ❌ **ERROR-001** (Fila 2): Peso excede máximo (15000 kg > 10000 kg)
- ❌ **ERROR-002** (Fila 3): Peso negativo (-5 kg < 0)
- ❌ **ERROR-003** (Fila 5): Cantidad excede máximo (2000000 > 1000000)
- ❌ **ERROR-004** (Fila 6): Volumen excede máximo (1500 m³ > 1000 m³)
- ❌ **ERROR-005** (Fila 7): Texto en campo numérico ("NOT_A_NUMBER")

#### Filas que deben ser omitidas (2 filas):
- ⚠️ **Fila 8**: Falta número de parte (campo requerido vacío)
- ⚠️ **Fila 9**: Falta nombre de parte (campo requerido vacío)

#### Datos válidos que deben importarse (2 filas):
- ✅ **VALID-001** (Fila 4): Todos los valores correctos
- ✅ **VALID-002** (Fila 10): Todos los valores correctos

**Resultado Esperado:**
- 2 partes importadas exitosamente
- 7 errores reportados (5 validaciones + 2 omisiones)
- Mensaje: "Se importaron 2 partes exitosamente (7 filas con errores fueron omitidas)"

---

## Cómo Realizar las Pruebas

### Pre-requisitos
- Backend corriendo en http://localhost:5000
- Frontend corriendo en http://localhost:3000
- Usuario logueado en el sistema

### Paso 1: Acceder a la Funcionalidad
1. Navegar a **Clientes** desde el dashboard
2. Seleccionar un cliente existente (ej: Faurecia)
3. Ir a la pestaña **"Proyectos y Partes"**
4. Click en **"Agregar Proyecto"**
5. Llenar los datos básicos del proyecto:
   - Número de Proyecto: TEST-IMPORT-001
   - Nombre: Prueba de Importación
   - Descripción: Prueba de funcionalidad Excel

### Paso 2: Probar Descarga de Plantilla
1. Click en el botón **"Plantilla"** (verde)
2. Verificar que se descarga "Plantilla_Partes.xlsx"
3. Abrir el archivo y verificar:
   - Fila 1: Encabezados en español
   - Fila 2: Ejemplo de datos
   - Fila 3: Fila vacía para ingreso
   - Columnas bien dimensionadas

**Resultado Esperado:** ✅ Plantilla descargada correctamente

### Paso 3: Probar Importación de Datos Válidos
1. Click en el botón **"Importar"** (púrpura)
2. Seleccionar el archivo **TEST_Partes_VALIDAS.xlsx** desde la carpeta frontend
3. Esperar el mensaje de confirmación

**Resultado Esperado:**
- ✅ Alerta: "Se importaron 5 partes exitosamente"
- ✅ 5 partes visibles en la lista
- ✅ Todos los campos correctamente poblados

### Paso 4: Probar Validación de Errores
1. Click en el botón **"Importar"** nuevamente
2. Seleccionar el archivo **TEST_Partes_CON_ERRORES.xlsx**
3. Observar los mensajes de error

**Resultado Esperado:**
- ✅ Primera alerta mostrando los primeros 5 errores:
  ```
  Se encontraron 7 error(es):

  Fila 2: Peso excede el máximo permitido (10000 kg)
  Fila 3: Peso debe ser mayor o igual a 0
  Fila 5: Cantidad SNP excede el máximo permitido (1,000,000)
  Fila 6: Volumen SNP excede el máximo permitido (1000 m³)
  Fila 7: Peso inválido

  ...y 2 más
  ```
- ✅ Segunda alerta: "Se importaron 2 partes exitosamente (7 filas con errores fueron omitidas)"
- ✅ Solo 2 partes nuevas agregadas (VALID-001, VALID-002)
- ✅ Total ahora: 7 partes (5 anteriores + 2 nuevas)

### Paso 5: Probar Validación en Entrada Manual
1. En el formulario de "Agregar Parte", llenar:
   - Número de Parte: MANUAL-001
   - Nombre: Prueba Manual
   - Peso: **-5** (negativo)
2. Click en "Agregar Parte"

**Resultado Esperado:**
- ❌ Alerta: "Peso debe ser un número mayor o igual a 0"
- ❌ Parte NO se agrega a la lista

3. Corregir peso a: **5**
4. Click en "Agregar Parte"

**Resultado Esperado:**
- ✅ Parte agregada exitosamente
- ✅ Visible en la lista

### Paso 6: Probar Exportación
1. Con las 8 partes en la lista (5 + 2 + 1), click en botón **"Exportar"** (azul)
2. Verificar que se descarga archivo con nombre: **Partes_Exportadas_YYYY-MM-DD.xlsx**
3. Abrir el archivo descargado

**Resultado Esperado:**
- ✅ Archivo contiene las 8 partes
- ✅ Formato idéntico a la plantilla
- ✅ Todos los datos preservados correctamente
- ✅ Se puede editar y reimportar

### Paso 7: Probar Ciclo Completo (Exportar → Editar → Reimportar)
1. Abrir el archivo exportado en Excel
2. Modificar una parte existente (ej: cambiar peso de TEST-001)
3. Agregar una nueva fila con datos válidos
4. Guardar el archivo
5. Importar el archivo modificado

**Resultado Esperado:**
- ✅ Todas las partes importadas correctamente
- ✅ Modificaciones reflejadas
- ✅ Nueva parte agregada

### Paso 8: Verificar Persistencia en Backend
1. Click en "Crear Proyecto" (botón de submit del formulario)
2. Esperar mensaje de confirmación
3. Verificar que el proyecto aparece en la lista
4. Recargar la página (F5)
5. Volver a abrir el proyecto

**Resultado Esperado:**
- ✅ Todas las partes se guardaron en el backend
- ✅ Datos persisten después de recargar
- ✅ Números decimales preservan precisión

---

## Validaciones a Verificar

### Rangos Numéricos

| Campo | Mínimo | Máximo | Mensaje de Error |
|-------|--------|--------|------------------|
| Peso (kg) | 0 | 10,000 | "Peso debe ser mayor o igual a 0" / "Peso excede el máximo permitido (10000 kg)" |
| Cantidad SNP | 0 | 1,000,000 | "Cantidad SNP debe ser un número entero mayor o igual a 0" / "Cantidad SNP excede el máximo permitido (1,000,000)" |
| Volumen SNP (m³) | 0 | 1,000 | "Volumen SNP debe ser mayor o igual a 0" / "Volumen SNP excede el máximo permitido (1000 m³)" |

### Campos Requeridos

| Campo | Comportamiento si Falta |
|-------|------------------------|
| Número de Parte | Fila omitida (no importada) |
| Nombre de Parte | Fila omitida (no importada) |

### Conversión de Tipos

| Campo | Tipo Esperado | Conversión |
|-------|---------------|------------|
| Peso | Decimal | parseFloat() |
| Cantidad SNP | Entero | parseInt() |
| Volumen SNP | Decimal | parseFloat() |
| Todos los textos | String | String().trim() |

---

## Casos Extremos a Probar

### 1. Archivo Excel Vacío
- **Acción:** Importar un Excel solo con encabezados
- **Esperado:** "No se encontraron partes válidas en el archivo"

### 2. Archivo con Solo Errores
- **Acción:** Importar un Excel donde todas las filas tienen errores
- **Esperado:** "No se pudo importar ninguna parte debido a errores de validación"

### 3. Valores en los Límites
- **Acción:** Probar exactamente los valores límite (0, 10000, 1000000, 1000)
- **Esperado:** Todos deben ser aceptados

### 4. Valores Justo Fuera de Límites
- **Acción:** Probar 10000.01, 1000000.01, 1000.01, -0.01
- **Esperado:** Todos deben ser rechazados

### 5. Decimales con Muchos Lugares
- **Acción:** Probar 5.123456789
- **Esperado:** Aceptado y almacenado con precisión

### 6. Botón Exportar Deshabilitado
- **Acción:** Con 0 partes, intentar click en "Exportar"
- **Esperado:** Botón deshabilitado (gris), no hace nada

### 7. Importar Mientras Hay Importación en Curso
- **Acción:** Durante importación, el botón debe estar deshabilitado
- **Esperado:** No se puede iniciar segunda importación

---

## Checklist de Funcionalidad Completa

### Descarga de Plantilla
- [ ] Botón visible y accesible
- [ ] Color verde distintivo
- [ ] Descarga archivo correcto
- [ ] Plantilla tiene estructura correcta
- [ ] Ejemplo incluido ayuda al usuario

### Importación
- [ ] Botón visible y accesible
- [ ] Color púrpura distintivo
- [ ] Acepta archivos .xlsx y .xls
- [ ] Valida campos requeridos
- [ ] Convierte tipos correctamente
- [ ] Valida rangos numéricos
- [ ] Reporta errores con número de fila
- [ ] Muestra hasta 5 errores
- [ ] Indica cuántos errores adicionales hay
- [ ] Importa filas válidas aunque haya errores
- [ ] Muestra estado "Importando..."
- [ ] Limpia input después de importar

### Exportación
- [ ] Botón visible y accesible
- [ ] Color azul distintivo
- [ ] Deshabilitado cuando no hay partes
- [ ] Descarga archivo con timestamp
- [ ] Formato compatible con importación
- [ ] Todos los campos exportados
- [ ] Valores numéricos preservados
- [ ] Archivo puede editarse y reimportarse

### Validación Manual
- [ ] Peso validado en tiempo real
- [ ] Cantidad validada en tiempo real
- [ ] Volumen validado en tiempo real
- [ ] Mensajes de error claros
- [ ] Conversión de tipos automática

### Persistencia
- [ ] Datos se guardan en backend
- [ ] Datos persisten después de recargar
- [ ] Precisión numérica preservada

---

## Problemas Conocidos y Soluciones

### Problema: "Cannot find module 'xlsx'"
**Solución:** El módulo xlsx debe estar instalado en frontend. Verificar con:
```bash
cd frontend
npm list xlsx
```

### Problema: Archivo no se descarga
**Solución:** Verificar que el navegador no está bloqueando descargas. Revisar configuración de seguridad.

### Problema: Importación no responde
**Solución:**
1. Verificar que el archivo Excel no está corrupto
2. Abrir el archivo en Excel para confirmar formato
3. Revisar consola del navegador para errores

### Problema: Datos no persisten
**Solución:**
1. Verificar que el backend está corriendo
2. Confirmar que se hizo click en "Crear Proyecto"
3. Revisar consola del backend para errores

---

## Resultados Esperados de la Sesión de Pruebas

Al finalizar todas las pruebas, deberías tener:

1. ✅ **Plantilla descargada** y verificada
2. ✅ **5 partes válidas** importadas sin errores
3. ✅ **Validación de errores** funcionando (7 errores detectados, 2 partes válidas)
4. ✅ **Validación manual** rechazando valores inválidos
5. ✅ **1 parte manual** agregada correctamente
6. ✅ **8 partes exportadas** a Excel
7. ✅ **Ciclo completo** de exportar → editar → importar
8. ✅ **Proyecto creado** con todas las partes persistidas

Total de partes en el proyecto final: 8+ partes (depende de cuántas veces importaste)

---

## Próximos Pasos Después de las Pruebas

Si todas las pruebas pasan:
- ✅ Sistema listo para uso en producción
- ✅ Documentar cualquier comportamiento inesperado
- ✅ Crear guía de usuario final
- ✅ Entrenar a usuarios en el uso de la funcionalidad

Si encuentras errores:
- ❌ Documentar el error específico
- ❌ Incluir pasos para reproducir
- ❌ Captura de pantalla si es posible
- ❌ Mensajes de error de la consola
