// Fuente central de la paleta de gráficos — todo componente de chart nuevo
// debe consultar esta función, nunca escribir un color a mano. Los valores
// reales viven como variables CSS en app/globals.css (:root / html.dark)
// porque Recharts consume props de presentación SVG directamente
// (fill="var(--chart-1)"), donde las clases dark: de Tailwind no aplican —
// así claro/oscuro se resuelve gratis en el navegador, sin lógica de tema
// en JS.
//
// Migrar esto a configuración por cliente (multi-tenant / Bloque futuro) es
// un cambio de una sola función: leer los valores desde
// configuracion_integraciones o una tabla de branding y escribirlos en estas
// mismas variables CSS en el layout raíz — ningún componente de gráfico
// cambia.
export interface PaletaGraficos {
  // Slot 1 de `categorico` — expuesto aparte para los casos de una sola
  // serie (ej. GastoPorCampanaBarChart) que no necesitan la escala completa.
  primario: string
  // Hues fijos en orden fijo (nunca se reasignan por rank) — ver
  // references/color-formula.md del skill dataviz. No ciclar más allá de su
  // longitud en un mismo gráfico; con más categorías, agrupar en "Otros".
  categorico: string[]
}

export function getPaletaGraficos(): PaletaGraficos {
  const categorico = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6'].map(
    (v) => `var(${v})`
  )
  return { primario: categorico[0], categorico }
}

// Hex real de cada slot, sincronizado a mano con app/globals.css — solo para
// los casos donde JS necesita un color computable y no puede usar
// var(--chart-N) directamente (ej. calcular contraste de un texto sobre un
// color de serie, exportar un gráfico a PDF/canvas). Ningún componente de
// chart de este módulo lo necesita hoy; se documenta como salida de escape.
const HEX_POR_MODO = {
  light: ['#2d44a6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  dark: ['#4662c7', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
} as const

export function getPaletaGraficosHex(modo: 'light' | 'dark'): readonly string[] {
  return HEX_POR_MODO[modo]
}
