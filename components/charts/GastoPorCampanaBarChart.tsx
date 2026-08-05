'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import { formatValorMetrica } from '@/lib/utils'
import type { UnidadMetrica } from '@/lib/types'

export interface CampanaMetricaPoint {
  nombre: string
  valor: number
}

interface Props {
  data: CampanaMetricaPoint[]
  unidad: UnidadMetrica
  loading?: boolean
}

const MAX_CAMPANAS = 12

function truncar(nombre: string): string {
  return nombre.length > 16 ? `${nombre.slice(0, 16)}…` : nombre
}

function formatEje(v: number, unidad: UnidadMetrica): string {
  if (unidad === 'usd') return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
  if (unidad === 'porcentaje') return `${v}%`
  return v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
}

function ChartTooltip({ active, payload, unidad }: { active?: boolean; payload?: { payload: CampanaMetricaPoint }[]; unidad: UnidadMetrica }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-0.5">{point.nombre}</p>
      <p className="text-gray-900 dark:text-white font-semibold tabular-nums">{formatValorMetrica(point.valor, unidad)}</p>
    </div>
  )
}

export default function GastoPorCampanaBarChart({ data, unidad, loading }: Props) {
  if (loading) return <Skeleton className="h-56 w-full" />

  if (data.length === 0) {
    return (
      <div role="img" aria-label="Gráfico de barras: métrica por campaña, sin datos" className="h-56 flex items-center justify-center">
        <p className="text-sm text-empty italic">Sin datos registrados en este filtro</p>
      </div>
    )
  }

  const top = [...data].sort((a, b) => b.valor - a.valor).slice(0, MAX_CAMPANAS)

  return (
    <div>
      <div role="img" aria-label={`Gráfico de barras: métrica por campaña, ${top.length} de ${data.length} campañas`} className="h-56 w-full text-gray-500 dark:text-gray-400">
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
              tickFormatter={(v: number) => formatEje(v, unidad)}
            />
            <Tooltip content={<ChartTooltip unidad={unidad} />} cursor={{ fill: 'var(--chart-1)', fillOpacity: 0.08 }} />
            <Bar dataKey="valor" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.length > MAX_CAMPANAS && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1">
          Mostrando las {MAX_CAMPANAS} campañas con mayor valor de {data.length}
        </p>
      )}
    </div>
  )
}
