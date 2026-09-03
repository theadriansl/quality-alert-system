# Reglas para llevar un dashboard al nivel de 8D Dashboard

Objetivo: que QAR Dashboard, MRB Dashboard y Workload Dashboard queden al mismo nivel visual que `EightDDashboard.js` (ya rediseñado, referencia canónica). Solo presentación — no tocar lógica, cálculos, endpoints ni props. Ver `REGLAS_DISENO.md` para el marco general (lista blanca, tokens, verificación de 6 puntos); este archivo es el complemento específico para pantallas tipo dashboard.

## Diagnóstico típico de un dashboard "de becario"
- Emoji como iconos en KPIs, tabs o catálogo de widgets.
- Cifras grandes que cambian de color por umbral (semáforo en el número).
- KpiTile / SectionTitle / Card definidos localmente en vez de importar `SharedComponents.js`.
- Colores de gráficas fuera del tema (morados, verdes, azules que no existen en `ThemeContext`).
- Pesos de fuente 700/800/900.
- Filtros que no tienen el mismo trato visual que el resto del sistema (selects con borde default del navegador, botones de color saturado).
- Tabs con pastillas rellenas de color en vez del patrón identificador + subtítulo + subrayado.
- Tablas con filas de más de 44px o encabezados sin el tratamiento de micro-título.

## Checklist de conversión (aplícalo en este orden)

**1. Componentes compartidos primero.**
Importar de `frontend/src/components/shared/SharedComponents.js`: `KpiTile`, `Card`, `SectionTitle`, `RiskScoreCard`, `AlertCountChip`, `HBar`. Borrar cualquier definición local equivalente. Si el dashboard necesita algo que no existe ahí, verificar también `frontend/src/components/8D/D6Components.js` antes de crear algo nuevo.

**2. KPIs.**
- Sin emoji, sin ícono decorativo.
- Cifra en `t.text`, monoespaciada, tamaño 22px, peso 500 (nunca 700+).
- Alerta = punto de 5px junto a la etiqueta (`alertType`/`alertDot`), no la cifra pintada de color.
- Umbral de "alto riesgo" consistente con `RiskScoreCard` (60/35), no un umbral distinto inventado para ese dashboard.

**3. Índice de riesgo (si aplica).**
Usar `RiskScoreCard` directamente, no recalcular inline. Etiquetas `Alto / Moderado / Bajo` (nunca mayúsculas tipo `ALTO`).

**4. Gráficas.**
- Paleta derivada del tema: `t.accent`, `t.success`, `t.warning`, `t.error`, y si se necesitan más series, derivar variantes (mezclas con negro/blanco), nunca colores hardcodeados sin relación al tema.
- Si hay pastel/dona con 5+ series, verificar que ningún color se repita.
- Barras con radio 2px arriba, sin gradientes ni sombras.
- Rejilla en tono derivado del borde, no ejes dibujados a mano.

**5. Filtros (periodo, departamento, cliente, severidad).**
- Presets como segmentado: contenedor `t.bgPanel`, pastilla activa `t.bgCard` + sombra mínima (no relleno de color).
- Fechas en monoespaciada.
- Selects con borde `t.border`, sin estilos default del navegador.
- "Restablecer"/"Limpiar filtros" como enlace de texto en `t.accent`, no botón.
- Mientras carga tras cambiar un filtro: mantener datos anteriores con `opacity: 0.6`, no vaciar la pantalla.
- Sin resultados: renglón sobrio con texto + enlace de restablecer, nunca KPIs en cero (se lee como dato real, no como ausencia de datos).

**6. Tabs internos del dashboard.**
Mismo patrón que 8D: identificador en 13px, subtítulo real debajo en 11px `t.textDim`, subrayado de 2px `t.primary` en el activo, `t.textMuted` en los inactivos. Sin pastillas rellenas, sin emoji.

**7. Tablas dentro del dashboard** (top proveedores, alertas, etc.)
Filas 44px, encabezado 30-34px con fondo `t.field`, separador `t.line`, `overflow-x: auto` + `min-width` si hay muchas columnas. Chips de estado con el patrón de punto + texto ya establecido.

**8. Tipografía.**
Una sola sans para UI. Monoespaciada solo en fechas, %, IDs, montos. Peso máximo 600 en todo el archivo — buscar y eliminar cualquier `fontWeight: '700'` o superior.

## Verificación antes de reportar terminado
1. Captura en Industrial y en Oscuro — ningún texto invisible, ningún panel blanco fijo en tema oscuro.
2. Buscar en el archivo: emoji, `fontWeight` > 600, hex literales fuera de los reportados como "dato de catálogo".
3. Confirmar que `KpiTile`/`SectionTitle`/`Card` importados son los de `SharedComponents.js`, no definiciones locales.
4. Los filtros siguen funcionando exactamente igual (mismos endpoints, mismos parámetros) — solo cambió el estilo.
5. Aplicar la verificación de 6 puntos de `REGLAS_DISENO.md` (diff de un solo archivo, solo propiedades de lista blanca, etc.) si el cambio es puramente estético; si además hay que tocar estructura de KPIs o agregar RiskScoreCard, avisar que ese cambio sí toca JSX y no solo estilo.

## Referencia de archivos
- Patrón a igualar: `frontend/src/components/EightDDashboard.js` (ya cerrado).
- Pendientes con este checklist: `QARDashboard.js` + `QARDashboardComponent.js` (dashboard general ya se hizo — confirmar si falta algo del checklist), `MRBDashboard`/equivalente en `MRBDefectCapture.js`, `WorkloadDashboard.js`.
- Tokens: `frontend/src/context/ThemeContext.js`.
- Componentes compartidos: `frontend/src/components/shared/SharedComponents.js`.
