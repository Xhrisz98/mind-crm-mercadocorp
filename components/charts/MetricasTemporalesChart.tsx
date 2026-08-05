'use client'
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import { METRICA_COLOR_PALETTE } from '@/lib/utils'
import type { SerieTemporalPunto, UnidadMetrica } from '@/lib/types'

export interface MetricaSerie {
  clave: string
  nombre: string
  unidad: UnidadMetrica
}

interface Props {
  data: SerieTemporalPunto[]
  series: MetricaSerie[]
  loading?: boolean
}

function formatTickDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

function formatFullDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-0.5">
      <p className="text-gray-500 dark:text-gray-400 mb-1">{formatFullDate(label ?? '')}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 tabular-nums" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// Gráfica cualquier combinación de métricas del catálogo (selector en
// PublicidadClient). El eje se asigna por `unidad`, no por nombre de métrica
// fijo: la primera unidad que aparece entre las series seleccionadas va al
// eje izquierdo, cualquier otra unidad distinta comparte el eje derecho —
// así una métrica con escala muy distinta (ej. impresiones vs. gasto) no
// aplasta a las demás en un solo eje.
export default function MetricasTemporalesChart({ data, series, loading }: Props) {
  if (loading) return <Skeleton className="h-56 w-full" />

  if (data.length === 0 || series.length === 0) {
    return (
      <div role="img" aria-label="Gráfico temporal de métricas, sin datos" className="h-56 flex items-center justify-center">
        <p className="text-sm text-empty italic">Sin métricas registradas en este filtro</p>
      </div>
    )
  }

  const chartData = data.map((punto) => ({
    fecha: punto.fecha,
    ...Object.fromEntries(series.map((s) => [s.clave, punto.valores[s.clave] ?? 0])),
  }))

  const unidadEjeIzquierdo = series[0].unidad
  const tieneEjeDerecho = series.some((s) => s.unidad !== unidadEjeIzquierdo)

  return (
    <div
      role="img"
      aria-label={`Gráfico de línea: ${series.map((s) => s.nombre).join(', ')} por fecha, de ${formatFullDate(data[0].fecha)} a ${formatFullDate(data[data.length - 1].fecha)}`}
      className="h-56 w-full text-gray-500 dark:text-gray-400"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.5} className="stroke-gray-100 dark:stroke-white/10" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatTickDate}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="izquierdo"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
          />
          {tieneEjeDerecho && (
            <YAxis yAxisId="derecho" orientation="right" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          )}
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Line
              key={s.clave}
              yAxisId={s.unidad === unidadEjeIzquierdo ? 'izquierdo' : 'derecho'}
              type="monotone"
              dataKey={s.clave}
              name={s.nombre}
              stroke={METRICA_COLOR_PALETTE[i % METRICA_COLOR_PALETTE.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
