'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import { formatCurrency } from '@/lib/utils'

export interface GastoPorCampanaPoint {
  nombre: string
  gasto: number
}

interface Props {
  data: GastoPorCampanaPoint[]
  loading?: boolean
}

const MAX_CAMPANAS = 12

function truncar(nombre: string): string {
  return nombre.length > 16 ? `${nombre.slice(0, 16)}…` : nombre
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: GastoPorCampanaPoint }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-0.5">{point.nombre}</p>
      <p className="text-gray-900 dark:text-white font-semibold tabular-nums">{formatCurrency(point.gasto)}</p>
    </div>
  )
}

export default function GastoPorCampanaBarChart({ data, loading }: Props) {
  if (loading) return <Skeleton className="h-56 w-full" />

  if (data.length === 0) {
    return (
      <div role="img" aria-label="Gráfico de barras: gasto por campaña, sin datos" className="h-56 flex items-center justify-center">
        <p className="text-sm text-empty italic">Sin gasto registrado en este filtro</p>
      </div>
    )
  }

  const top = [...data].sort((a, b) => b.gasto - a.gasto).slice(0, MAX_CAMPANAS)

  return (
    <div>
      <div role="img" aria-label={`Gráfico de barras: gasto por campaña, ${top.length} de ${data.length} campañas`} className="h-56 w-full text-gray-500 dark:text-gray-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.5} className="stroke-gray-100 dark:stroke-white/10" />
            <XAxis
              dataKey="nombre"
              tickFormatter={truncar}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: 'currentColor', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-1)', fillOpacity: 0.08 }} />
            <Bar dataKey="gasto" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.length > MAX_CAMPANAS && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1">
          Mostrando las {MAX_CAMPANAS} campañas con mayor gasto de {data.length}
        </p>
      )}
    </div>
  )
}
