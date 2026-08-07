import type { Periodo } from '@/lib/types'

export const PERIODOS = ['hoy', 'semana', 'mes', 'total'] as const
export type PeriodoConUnidad = Exclude<Periodo, 'total'>

// Unidad para date_trunc($1, CURRENT_DATE) — equivalente a CURRENT_DATE cuando unit='day'.
export const PERIOD_UNIT: Record<PeriodoConUnidad, string> = { hoy: 'day', semana: 'week', mes: 'month' }
// Duración del período, para calcular el rango anterior de igual duración (comparativo).
export const PERIOD_INTERVAL: Record<PeriodoConUnidad, string> = { hoy: '1 day', semana: '7 days', mes: '1 month' }

// Whitelist explícita: si viene un valor y no es exactamente uno de los 4 permitidos, se rechaza
// antes de tocar la base de datos (evita que un valor arbitrario llegue a construir una query).
export function parsePeriodoParam(searchParams: URLSearchParams): Periodo | { error: string } {
  const periodoParam = searchParams.get('periodo')
  if (periodoParam !== null && !(PERIODOS as readonly string[]).includes(periodoParam)) {
    return { error: 'Parámetro periodo inválido' }
  }
  return (periodoParam as Periodo | null) ?? 'mes'
}

// Construye "columna >= date_trunc($N, CURRENT_DATE)", agregando el parámetro de unidad a
// `params`. Devuelve null si periodo='total' (histórico completo, sin filtro de fecha).
export function fechaPeriodoCondicion(columna: string, periodo: Periodo, params: unknown[]): string | null {
  if (periodo === 'total') return null
  params.push(PERIOD_UNIT[periodo as PeriodoConUnidad])
  return `${columna} >= date_trunc($${params.length}, CURRENT_DATE)`
}

// WHERE compartido por los endpoints que filtran `contactos` por rol (ventas ve solo lo suyo)
// y por período (fecha_primer_contacto) — usado por /api/leads/metricas y /api/dashboard para
// no duplicar esta construcción en cada endpoint. `alias` califica las columnas (ej. 'c') cuando
// la query hace JOIN con otras tablas.
export function buildContactosWhere(
  periodo: Periodo,
  esVentas: boolean,
  vendedorId: number,
  alias?: string
): { where: string; whereAnd: string; params: unknown[] } {
  const prefix = alias ? `${alias}.` : ''
  const params: unknown[] = esVentas ? [vendedorId] : []
  let where = esVentas ? `WHERE ${prefix}vendedor_asignado_id = $1` : ''
  const cond = fechaPeriodoCondicion(`${prefix}fecha_primer_contacto`, periodo, params)
  if (cond) where = where ? `${where} AND ${cond}` : `WHERE ${cond}`
  const whereAnd = where ? `${where} AND` : 'WHERE'
  return { where, whereAnd, params }
}
