'use client'
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'

export interface TareaEstadoPoint {
  id: number
  nombre: string
  color: string
  total: number
}

interface Props {
  data: TareaEstadoPoint[]
  loading?: boolean
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: TareaEstadoPoint }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-0.5">{point.nombre}</p>
      <p className="text-gray-900 dark:text-white font-semibold tabular-nums">{point.total} tarea{point.total !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function TareasPorEstadoBarChart({ data, loading }: Props) {
  if (loading) return <Skeleton className="h-56 w-full" />

  const total = data.reduce((sum, d) => sum + d.total, 0)
  if (total === 0) {
    return (
      <div role="img" aria-label="Gráfico de barras: tareas por estado, sin datos" className="h-56 flex items-center justify-center">
        <p className="text-sm text-empty italic">Sin tareas en los proyectos filtrados</p>
      </div>
    )
  }

  return (
    <div role="img" aria-label={`Gráfico de barras: tareas por estado, ${total} tareas en total`} className="h-56 w-full text-gray-500 dark:text-gray-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.5} className="stroke-gray-100 dark:stroke-white/10" />
          <XAxis
            dataKey="nombre"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
