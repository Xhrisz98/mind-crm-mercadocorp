import type { FormulaOperacionRatio } from './types'

// Evalúa una fórmula personalizada sobre los totales de una campaña.
// valoresPorMetricaId: suma de cada métrica del catálogo para esa campaña
// (0 si nunca se registró — ver GET /api/campanas-publicidad/[id]).
// Devuelve null si el denominador queda en 0 (no calculable), igual que el
// comportamiento previo de CTR/CPC/CPA en la UI.
export function evaluarFormulaRatio(
  definicion: FormulaOperacionRatio,
  valoresPorMetricaId: Record<number, number>
): number | null {
  const sumar = (ids: number[]) =>
    ids.reduce((acc, id) => acc + (valoresPorMetricaId[id] ?? 0), 0)

  const denominador = sumar(definicion.denominador)
  if (denominador === 0) return null
  return sumar(definicion.numerador) / denominador
}
