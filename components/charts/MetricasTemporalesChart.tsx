'use client'
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import type { CampanaMetricaPorFecha } from '@/lib/types'

interface Props {
  data: CampanaMetricaPorFecha[]
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

// Impresiones vive en un eje aparte (izquierda) de clics/conversiones
// (derecha) porque su escala suele ser 10-100x mayor — en un solo eje, clics
// y conversiones quedarían aplanados casi en cero.
export default function MetricasTemporalesChart({ data, loading }: Props) {
  if (loading) return <Skeleton className="h-56 w-full" />

  if (data.length === 0) {
    return (
      <div role="img" aria-label="Gráfico temporal de impresiones, clics y conversiones, sin datos" className="h-56 flex items-center justify-center">
        <p className="text-sm text-empty italic">Sin métricas registradas en este filtro</p>
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={`Gráfico de línea: impresiones, clics y conversiones por fecha, de ${formatFullDate(data[0].fecha)} a ${formatFullDate(data[data.length - 1].fecha)}`}
      className="h-56 w-full text-gray-500 dark:text-gray-400"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            yAxisId="impresiones"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
          />
          <YAxis yAxisId="clics" orientation="right" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="impresiones" type="monotone" dataKey="impresiones" name="Impresiones" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          <Line yAxisId="clics" type="monotone" dataKey="clics" name="Clics" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
          <Line yAxisId="clics" type="monotone" dataKey="conversiones" name="Conversiones" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
