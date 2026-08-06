// Única fuente de verdad de "qué gráficos tienen sentido para qué dato" —
// reutilizable en el Dashboard general, el portal de cliente, o cualquier
// módulo nuevo, sin duplicar la regla. El selector de tipo de gráfico en la
// UI debe listar únicamente lo que esta función devuelve para la forma de
// dato en cuestión — nunca las 5 opciones siempre.
//
// Reglas de coherencia:
// - serie_temporal (valores por fecha): line, area, combo — nunca pie (una
//   serie de tiempo no es un todo que suma 100%).
// - comparacion (valores entre entidades, ej. gasto por campaña): column o
//   bar — nunca pie, salvo que la forma de dato sea explícitamente
//   composicion.
// - composicion (las partes suman un total con sentido, ej. distribución de
//   gasto entre campañas activas): column, bar o pie.
export type FormaDato = 'serie_temporal' | 'comparacion' | 'composicion'
export type TipoGrafico = 'line' | 'area' | 'combo' | 'column' | 'bar' | 'pie'

export function getTiposGraficoValidos(formaDato: FormaDato): TipoGrafico[] {
  switch (formaDato) {
    case 'serie_temporal':
      return ['line', 'area', 'combo']
    case 'comparacion':
      return ['column', 'bar']
    case 'composicion':
      return ['column', 'bar', 'pie']
  }
}
