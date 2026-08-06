'use client'
import {
  ComposedChart, PieChart, Pie, Cell, Bar, Line, Area, Rectangle,
  CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import { formatValorMetrica } from '@/lib/utils'
import { getPaletaGraficos } from '@/lib/theme'
import type { TipoGrafico } from '@/lib/chartTypes'
import type { UnidadMetrica } from '@/lib/types'

export interface ChartCardSerie {
  clave: string
  nombre: string
  unidad?: UnidadMetrica
  // Solo aplica cuando tipo === 'combo': qué mark dibuja esta serie
  // específica sobre el mismo eje de categorías. Si se omite, 'line'.
  tipoCombo?: 'bar' | 'line' | 'area'
}

interface Props {
  tipo: TipoGrafico
  data: Record<string, unknown>[]
  categoryKey: string
  series: ChartCardSerie[]
  loading?: boolean
  ariaLabel: string
  emptyMessage?: string
  height?: number
  // Formato del valor de categoría en el eje X y en el encabezado del
  // tooltip (ej. fechas: "28 jul" en el eje, "28 de julio de 2026" en el
  // tooltip). Sin esto, ambos usan el valor crudo truncado — suficiente
  // para categorías tipo nombre (campaña, canal, etc.).
  formatCategoria?: (v: string) => string
  formatCategoriaTooltip?: (v: string) => string
}

// Ver lib/theme.ts: el validador de paletas categóricas del skill dataviz
// solo certifica separación "todos-contra-todos" (cualquier par de gajos
// puede quedar contiguo en un pie) para los primeros slots de la paleta —
// más allá de eso, dos hues empiezan a confundirse bajo daltonismo. El resto
// de categorías se agrupa en "Otros" en vez de asignarles un hue que ya no
// se distingue de forma fiable.
const MAX_PIE_SLICES = 4

function truncar(nombre: string, max = 16): string {
  return nombre.length > max ? `${nombre.slice(0, max)}…` : nombre
}

function formatEje(v: number, unidad: UnidadMetrica): string {
  if (unidad === 'usd') return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
  if (unidad === 'porcentaje') return `${v}%`
  return v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
}

function CartesianTooltip({ active, payload, label, series, formatLabel }: {
  active?: boolean
  payload?: { value: number; name: string; color: string; dataKey: string | number }[]
  label?: string | number
  series: ChartCardSerie[]
  formatLabel?: (v: string) => string
}) {
  if (!active || !payload?.length) return null
  const labelFormateado = label != null ? (formatLabel ? formatLabel(String(label)) : label) : null
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-0.5">
      {labelFormateado != null && <p className="text-gray-500 dark:text-gray-400 mb-1">{labelFormateado}</p>}
      {payload.map((p) => {
        const serie = series.find((s) => s.clave === p.dataKey)
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-1.5 tabular-nums" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}: {formatValorMetrica(p.value, serie?.unidad ?? 'numero')}
          </p>
        )
      })}
    </div>
  )
}

function PieTooltip({ active, payload, unidad, total }: {
  active?: boolean
  payload?: { name: string; value: number }[]
  unidad: UnidadMetrica
  total: number
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0'
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-0.5">{p.name}</p>
      <p className="text-gray-900 dark:text-white font-semibold tabular-nums">
        {formatValorMetrica(p.value, unidad)} ({pct}%)
      </p>
    </div>
  )
}

function EmptyState({ ariaLabel, mensaje, height }: { ariaLabel: string; mensaje: string; height: number }) {
  return (
    <div role="img" aria-label={ariaLabel} className="flex items-center justify-center" style={{ height }}>
      <p className="text-sm text-empty italic">{mensaje}</p>
    </div>
  )
}

function renderPie(data: Record<string, unknown>[], categoryKey: string, series: ChartCardSerie[], colores: string[], height: number) {
  const serie = series[0]
  const unidad = serie.unidad ?? 'numero'
  const ordenado = [...data]
    .map((d) => ({ nombre: String(d[categoryKey]), valor: Number(d[serie.clave]) || 0 }))
    .sort((a, b) => b.valor - a.valor)

  const visibles = ordenado.slice(0, MAX_PIE_SLICES)
  const restoTotal = ordenado.slice(MAX_PIE_SLICES).reduce((acc, r) => acc + r.valor, 0)
  const slices = restoTotal > 0 ? [...visibles, { nombre: 'Otros', valor: restoTotal }] : visibles
  const total = slices.reduce((acc, s) => acc + s.valor, 0)

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<PieTooltip unidad={unidad} total={total} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Pie
            data={slices}
            dataKey="valor"
            nameKey="nombre"
            outerRadius="75%"
            label={(props: { name?: string; percent?: number }) => `${truncar(props.name ?? '', 12)} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
          >
            {slices.map((s, i) => <Cell key={s.nombre} fill={colores[i % colores.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function renderCartesian(
  tipo: TipoGrafico,
  data: Record<string, unknown>[],
  categoryKey: string,
  series: ChartCardSerie[],
  colores: string[],
  height: number,
  formatCategoria?: (v: string) => string,
  formatCategoriaTooltip?: (v: string) => string
) {
  const horizontal = tipo === 'bar'
  const unidadEjeIzquierdo = series[0].unidad ?? 'numero'
  const tieneEjeDerecho = series.some((s) => (s.unidad ?? 'numero') !== unidadEjeIzquierdo)

  function renderSerie(s: ChartCardSerie, i: number) {
    const color = colores[i % colores.length]
    const yAxisId = (s.unidad ?? 'numero') === unidadEjeIzquierdo ? 'izquierdo' : 'derecho'
    const markTipo = tipo === 'combo' ? (s.tipoCombo ?? 'line') : tipo === 'line' ? 'line' : tipo === 'area' ? 'area' : 'bar'

    if (markTipo === 'line') {
      return <Line key={s.clave} yAxisId={horizontal ? undefined : yAxisId} type="monotone" dataKey={s.clave} name={s.nombre} stroke={color} strokeWidth={2} dot={false} />
    }
    if (markTipo === 'area') {
      return <Area key={s.clave} yAxisId={horizontal ? undefined : yAxisId} type="monotone" dataKey={s.clave} name={s.nombre} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
    }
    return <Bar key={s.clave} yAxisId={horizontal ? undefined : yAxisId} dataKey={s.clave} name={s.nombre} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
  }

  return (
    <div style={{ height }} className="w-full text-gray-500 dark:text-gray-400">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={horizontal} horizontal={!horizontal} strokeOpacity={0.5} className="stroke-gray-100 dark:stroke-white/10" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatEje(v, unidadEjeIzquierdo)} />
              <YAxis type="category" dataKey={categoryKey} tickFormatter={(v: string) => truncar(v)} tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
            </>
          ) : (
            <>
              <XAxis dataKey={categoryKey} tickFormatter={(v: string) => (formatCategoria ?? truncar)(v)} tick={{ fill: 'currentColor', fontSize: tipo === 'column' ? 10 : 11 }} tickLine={false} axisLine={false} interval={tipo === 'column' ? 0 : 'preserveEnd'} angle={tipo === 'column' ? -25 : 0} textAnchor={tipo === 'column' ? 'end' : 'middle'} height={tipo === 'column' ? 50 : 30} minTickGap={24} />
              <YAxis yAxisId="izquierdo" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatEje(v, unidadEjeIzquierdo)} />
              {tieneEjeDerecho && <YAxis yAxisId="derecho" orientation="right" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={32} />}
            </>
          )}
          <Tooltip
            content={<CartesianTooltip series={series} formatLabel={formatCategoriaTooltip ?? formatCategoria} />}
            cursor={
              tipo === 'column' || tipo === 'bar'
                ? <Rectangle fill={colores[0]} fillOpacity={0.08} stroke="none" radius={4} />
                : { stroke: 'currentColor', strokeOpacity: 0.2 }
            }
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map(renderSerie)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente genérico de gráfico: recibe datos + tipo + config de series y
// renderiza cualquiera de los tipos de lib/chartTypes.ts. Es la pieza que
// consumen tanto la vista agregada de /campanas-publicidad como el detalle
// de cada campaña — y cualquier módulo futuro (Dashboard, portal de
// cliente) que necesite graficar sin reimplementar tooltip/leyenda/estado
// vacío/loading ni tocar colores a mano.
export default function ChartCard({ tipo, data, categoryKey, series, loading, ariaLabel, emptyMessage, height = 224, formatCategoria, formatCategoriaTooltip }: Props) {
  const colores = getPaletaGraficos().categorico

  if (loading) return <div style={{ height }}><Skeleton className="w-full h-full" /></div>
  if (data.length === 0 || series.length === 0) {
    return <EmptyState ariaLabel={ariaLabel} mensaje={emptyMessage ?? 'Sin datos registrados en este filtro'} height={height} />
  }

  return (
    <div role="img" aria-label={ariaLabel}>
      {tipo === 'pie'
        ? renderPie(data, categoryKey, series, colores, height)
        : renderCartesian(tipo, data, categoryKey, series, colores, height, formatCategoria, formatCategoriaTooltip)}
    </div>
  )
}
