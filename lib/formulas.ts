import { query } from './db'
import type { FormulaDefinicion } from './types'

// Catálogo de operaciones soportadas — extensible por diseño. Agregar una
// operación futura (ej. "promedio") toca exactamente 3 lugares: 1) una
// interfaz FormulaOperacionX en lib/types.ts sumada a la unión
// FormulaDefinicion, 2) un nuevo case en evaluarFormula abajo, 3) el nombre
// agregado a OPERACIONES. El esquema de `definicion` en la BD es JSONB
// libre — no hay migración de columna que hacer.
const OPERACIONES = ['ratio', 'suma', 'resta', 'multiplicacion'] as const

export function operacionValida(op: unknown): op is FormulaDefinicion['operacion'] {
  return (OPERACIONES as readonly string[]).includes(op as string)
}

// Evalúa una fórmula personalizada sobre los totales de una campaña.
// valoresPorMetricaId: suma de cada métrica del catálogo para esa campaña
// (0 si nunca se registró — ver GET /api/campanas-publicidad/[id]).
export function evaluarFormula(
  definicion: FormulaDefinicion,
  valoresPorMetricaId: Record<number, number>
): number | null {
  const sumar = (ids: number[]) =>
    ids.reduce((acc, id) => acc + (valoresPorMetricaId[id] ?? 0), 0)

  switch (definicion.operacion) {
    case 'ratio': {
      // null si el denominador queda en 0 (no calculable), igual que el
      // comportamiento previo de CTR/CPC/CPA en la UI.
      const denominador = sumar(definicion.denominador)
      if (denominador === 0) return null
      return sumar(definicion.numerador) / denominador
    }
    case 'suma':
      return sumar(definicion.metricas)
    case 'resta': {
      const [base, ...resto] = definicion.metricas
      return (valoresPorMetricaId[base] ?? 0) - sumar(resto)
    }
    case 'multiplicacion':
      return definicion.metricas.reduce((acc, id) => acc * (valoresPorMetricaId[id] ?? 0), 1)
  }
}

// Valida una lista de IDs de metricas_definiciones recibida del cliente: un
// array de al menos `minimo` enteros que existan en el catálogo. Compartida
// por POST y PATCH de /api/formulas-personalizadas para no duplicar la
// validación por cada operación.
export async function validarMetricaIds(ids: unknown, minimo = 1): Promise<number[] | null> {
  if (!Array.isArray(ids) || ids.length < minimo) return null
  const parsed = ids.map((v) => parseInt(v))
  if (parsed.some((n) => Number.isNaN(n))) return null

  const existentes = await query<{ id: number }>(
    'SELECT id FROM public.metricas_definiciones WHERE id = ANY($1)',
    [parsed]
  )
  if (existentes.length !== new Set(parsed).size) return null
  return parsed
}
