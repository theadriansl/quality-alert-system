# Reglas del rediseño visual — Quality Alert System

## Alcance permitido (lista blanca)
Solo estas propiedades pueden cambiar, nunca nada más:
- `color`
- `backgroundColor`
- `border` / `borderColor` / `borderLeft` / `borderRight` / `borderBottom` (solo el color dentro del shorthand)
- `fontWeight` (700/800/900 → 600; nunca por encima de 600 en ningún archivo)
- `fontFamily` (solo cuando ya existía `monospace` → `'IBM Plex Mono', monospace`)

## Prohibido siempre
- Layout: `display`, `flex*`, `grid*`, `gap`, `width/height`, `padding/margin`, `position`, `overflow`, `borderRadius`, `fontSize`, `lineHeight`.
- Estructura JSX: no agregar, quitar, mover ni envolver elementos.
- Lógica: handlers, useState/useEffect, endpoints, validaciones, traducciones, localStorage.
- Nada de refactor no pedido (no extraer componentes, no crear archivos nuevos sin permiso).

## Paleta / tokens (ThemeContext.js)
5 temas: industrial, dark, white, cream, ocean.
Tokens base: `t.primary`, `t.accent`, `t.success`, `t.warning`, `t.error`, `t.bg`, `t.bgCard`, `t.bgPanel`, `t.border`, `t.text`, `t.textMuted`, `t.textDim`.
Derivados semánticos (ya existen, calculados por luminancia — no crear más sin necesidad real):
`successBg/successBorder/successFg`, `warningBg/warningBorder/warningFg`, `errorBg/errorBorder/errorFg`, `accentBg/accentBorder/accentFg`, más `field`, `hover`, `line`, `isDark`, y `errorDark` (variante ~30% más oscura de error).

Regla de uso: fondo/borde → token base o `*Bg`/`*Border`. Texto → variante `*Fg` (se aclara en tema oscuro). Nunca `backgroundColor` con un token `*Fg`.

Literal sin mapeo claro → NO inventar el token. Reportar y esperar decisión. Preferir mapear a un token existente (ej. púrpura → accent) antes que crear un token nuevo — solo se agrega token nuevo si el matiz es realmente necesario y no hay equivalente.

Colores que son DATOS (severidad de catálogo, colores de etapa, colores financieros/capacidad) no se tocan — son fallbacks o configuración, no estilo de UI.

## Verificación obligatoria antes de cada commit (6 puntos)
1. `git diff --stat`: confirmar qué archivo(s) se tocaron, nada fuera de lo esperado.
2. Cada línea modificada usa solo una propiedad de la lista blanca.
3. El diff no contiene `display|flex|grid|gap|padding|margin|width|height|position|overflow|borderRadius|fontSize` ni etiquetas JSX abiertas/cerradas.
4. Ningún `backgroundColor` con variante `*Fg`.
5. Conteo de elementos JSX idéntico antes/después.
6. Compila sin errores nuevos.

Reportar al final: diff, literales sin mapear, confirmación de los 6 puntos.

## Estilo visual ya establecido (para mockups nuevos)
- Filas de tabla: 44px. Encabezado de columnas: 30-34px. Header de página: 56px.
- Chips de estado: punto de 5px + texto, fondo tinte suave + borde, radio píldora (20px o similar). Nunca fondo saturado en toda la fila/celda.
- Tarjetas: `bgCard`, borde 1px `border`, radio 8px, sombra mínima (`0 1px 2px`). Sin bordes de color de 2px+, sin cajas anidadas.
- Micro-títulos: mayúsculas, 10.5-11px, `letter-spacing: 0.05-0.07em`, color `textDim`.
- Tipografía: una sans para UI; monoespaciada solo en fechas, %, IDs, cantidades. Peso máximo 600 en toda la app.
- Sin emoji en ningún lado (tabs, catálogos de widgets, estados). Un semáforo de color en una cifra grande se evita: la cifra va en `text`, la alerta es un punto de 5px junto a la etiqueta.
- Botones: un primario (`t.primary`) por zona; el resto secundario con borde neutro. Nunca 2+ botones rellenos de colores distintos compitiendo.

## Módulos ya rediseñados (ver github.md para detalle y commits)
8D completo (10 tabs + header + dashboard), QAR completo (lista, detalle, crear, config, dashboard + modales), Workload Manager (Gantt + Lista), Inspección (DefectCapture, DefectHospital, MRBDefectCapture), ECR completo, Home.

## Componentes compartidos reutilizables
- `frontend/src/components/8D/D6Components.js`: StatusChip, ProgressBar, PriorityBar, WorkloadBadge, SectionTitle, ActionTableHeader/Row, ExpandedRowContent, RootCauseCard, CountermeasureCard.
- `frontend/src/components/8D/ApprovalComponents.js`: pasos de aprobación, historial, modal de revertir (compartido entre D3/D4/D5).
- `frontend/src/components/shared/SharedComponents.js`: KpiTile, Card, SectionTitle, RiskScoreCard, AlertCountChip, HBar.

Antes de crear un componente nuevo, revisar si ya existe uno de estos con la firma adecuada.
