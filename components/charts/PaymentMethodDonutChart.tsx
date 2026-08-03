'use client'
import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import { MEDIO_PAGO_LABELS } from '@/lib/utils'
import type { MedioPago } from '@/lib/types'

export interface PaymentMethodDatum {
  medio_pago: string | null
  total: number
}

interface PaymentMethodDonutChartProps {
  data: PaymentMethodDatum[]
  loading?: boolean
}

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`
}

// Un solo ramp tonal de marca (navy → azul claro) en vez de colores dispares
// por medio de pago — mismo orden que MEDIO_PAGO_OPTIONS en lib/utils.
const MEDIO_PAGO_CHART_COLOR: Record<MedioPago, string> = {
  tarjeta_debito: 'var(--chart-1)',
  tarjeta_credito: 'var(--chart-2)',
  transferencia: 'var(--chart-3)',
  efectivo: 'var(--chart-4)',
  canje: 'var(--chart-5)',
}
const FALLBACK_COLOR = '#9CA3AF'

interface Segment {
  key: string
  label: string
  color: string
  total: number
  pct: number
}

function renderPercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) {
  if (pct < 0.06) return null // segmentos muy pequeños: el % se ve mejor solo en la leyenda/tooltip
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) / 2
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {Math.round(pct * 100)}%
    </text>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Segment }[] }) {
  if (!active || !payload?.length) return null
  const s = payload[0].payload
  return (
    <div className="bg-white dark:bg-midnight-surface border border-gray-200 dark:border-midnight-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-0.5">{s.label}</p>
      <p className="text-gray-900 dark:text-white font-semibold tabular-nums">{formatUSD(s.total)} USD · {Math.round(s.pct * 100)}%</p>
    </div>
  )
}

export default function PaymentMethodDonutChart({ data, loading }: PaymentMethodDonutChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center gap-6">
        <Skeleton className="h-32 w-32 rounded-full shrink-0" />
        <div className="flex-1 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.total, 0)

  if (total <= 0) {
    return (
      <div role="img" aria-label="Gráfico de distribución por medio de pago: sin datos en el período seleccionado" className="py-10 text-center">
        <p className="text-sm text-empty italic">Sin ventas registradas en este período</p>
      </div>
    )
  }

  const segments: Segment[] = data
    .filter((d) => d.total > 0)
    .map((d) => {
      const key = d.medio_pago ?? 'sin_medio'
      const label = (d.medio_pago && MEDIO_PAGO_LABELS[d.medio_pago as MedioPago]) ?? 'Sin medio'
      const color = (d.medio_pago && MEDIO_PAGO_CHART_COLOR[d.medio_pago as MedioPago]) || FALLBACK_COLOR
      return { key, label, color, total: d.total, pct: d.total / total }
    })
    .sort((a, b) => b.total - a.total)

  const summary = segments.map((s) => `${s.label} ${Math.round(s.pct * 100)}%`).join(', ')

  return (
    <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
      <div
        role="img"
        aria-label={`Gráfico de dona: distribución de ventas por medio de pago — ${summary}`}
        className="h-40 w-40 shrink-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="total"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              label={renderPercentLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {segments.map((s) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  opacity={activeKey && activeKey !== s.key ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            onMouseEnter={() => setActiveKey(s.key)}
            onMouseLeave={() => setActiveKey(null)}
            onFocus={() => setActiveKey(s.key)}
            onBlur={() => setActiveKey(null)}
            className={`w-full flex items-center gap-2 text-sm rounded-md px-1 -mx-1 transition-opacity duration-150 ${
              activeKey && activeKey !== s.key ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate flex-1 text-left">{s.label}</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium tabular-nums">{Math.round(s.pct * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}
