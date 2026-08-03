'use client'
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'

export interface RevenueAreaChartPoint {
  fecha: string
  total: number
}

interface RevenueAreaChartProps {
  data: RevenueAreaChartPoint[]
  loading?: boolean
}

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`
}

function formatTickDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

function formatFullDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: RevenueAreaChartPoint }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-0.5">{formatFullDate(point.fecha)}</p>
      <p className="text-gray-900 dark:text-white font-semibold tabular-nums">{formatUSD(point.total)} USD</p>
    </div>
  )
}

export default function RevenueAreaChart({ data, loading }: RevenueAreaChartProps) {
  const isMobile = useIsMobile()

  if (loading) {
    return <Skeleton className="h-48 sm:h-64 w-full" />
  }

  if (data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Gráfico de ventas por día: sin datos en el período seleccionado"
        className="h-48 sm:h-64 flex items-center justify-center"
      >
        <p className="text-sm text-empty italic">Sin ventas registradas en este período</p>
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={`Gráfico de área: ventas por día del período, de ${formatFullDate(data[0].fecha)} a ${formatFullDate(data[data.length - 1].fecha)}`}
      className="h-48 sm:h-64 w-full text-gray-500 dark:text-gray-400"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeOpacity={0.5} className="stroke-gray-100 dark:stroke-white/10" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatTickDate}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={isMobile ? 'preserveStartEnd' : 'preserveEnd'}
            minTickGap={isMobile ? 24 : 8}
          />
          <YAxis
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 0 : 44}
            hide={isMobile}
            tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--chart-1)', strokeOpacity: 0.2, strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            activeDot={{ r: 4, fill: 'var(--chart-1)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
