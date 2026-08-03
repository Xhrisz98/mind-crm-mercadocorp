'use client'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import ClientOnlyBeam from '@/components/ui/ClientOnlyBeam'
import Card from '@/components/ui/Card'
import { MetricSkeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import RevenueAreaChart from '@/components/charts/RevenueAreaChart'
import PaymentMethodDonutChart from '@/components/charts/PaymentMethodDonutChart'
import type { DashboardMetrics, EstadoLead, Periodo, Rol } from '@/lib/types'
import { ESTADO_LABELS } from '@/lib/utils'
import { TrendingUp, TrendingDown, Users, CalendarDays, Target, RefreshCw, DollarSign, Receipt, Wallet, Clock, Download } from 'lucide-react'
import CanalIcon from '@/components/ui/CanalIcon'
import { fetcher } from '@/lib/fetcher'
import { toast } from 'sonner'

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`
}

const PERIODO_COMPARATIVO_LABEL: Record<Periodo, string> = {
  hoy: 'vs. ayer',
  semana: 'vs. semana pasada',
  mes: 'vs. mes pasado',
  total: '',
}

/** Mismo cálculo de rango que periodoStartSql() en app/api/dashboard/route.ts, para el export CSV. desde=null cuando periodo='total' (sin límite inferior). */
function periodoToDesdeHasta(periodo: Periodo): { desde: string | null; hasta: string } {
  const hasta = toISODate(new Date())
  const now = new Date()
  if (periodo === 'total') return { desde: null, hasta }
  if (periodo === 'hoy') return { desde: hasta, hasta }
  if (periodo === 'semana') {
    const dow = (now.getDay() + 6) % 7 // lunes = 0
    const desde = new Date(now)
    desde.setDate(now.getDate() - dow)
    return { desde: toISODate(desde), hasta }
  }
  const desde = new Date(now.getFullYear(), now.getMonth(), 1)
  return { desde: toISODate(desde), hasta }
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) return
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(current))
      }
    }, 30)
    return () => clearInterval(timer)
  }, [value])

  return <span>{display.toLocaleString()}</span>
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
}

// Clases completas (no interpoladas) para que Tailwind las detecte al escanear el código.
const GRID_COLS_LG: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

/** Grid de KPIs sin huecos: el número de columnas en desktop se ajusta a la cantidad de tarjetas visibles. */
function kpiGridClass(cardCount: number): string {
  return `grid-cols-2 ${GRID_COLS_LG[cardCount] ?? 'lg:grid-cols-4'} gap-4`
}

const ESTADOS_ORDER: EstadoLead[] = [
  'inicial', 'nuevo', 'contactado', 'interesado', 'en_negociacion', 'cliente', 'perdido',
]
const ESTADO_DOT: Record<EstadoLead, string> = {
  inicial: 'bg-gray-300',
  nuevo: 'bg-gray-400',
  contactado: 'bg-blue-500',
  interesado: 'bg-yellow-500',
  en_atencion_humana: 'bg-orange-500',
  en_negociacion: 'bg-orange-400',
  cliente: 'bg-green-500',
  perdido: 'bg-red-500',
}

const PERIODO_OPTIONS: { key: Periodo; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'total', label: 'Total' },
]

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function DashboardClient({ userRol }: { userRol: Rol }) {
  const canViewFacturacion = userRol !== 'ventas'
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [exportingFacturas, setExportingFacturas] = useState(false)
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const beamTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light'

  async function handleExportFacturasCsv() {
    setExportingFacturas(true)
    try {
      const { desde, hasta } = periodoToDesdeHasta(periodo)
      const params = new URLSearchParams({ hasta })
      if (desde) params.set('desde', desde)
      const res = await fetch(`/api/facturacion/export?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error || 'Error al generar el CSV')
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `facturacion_${desde ?? 'total'}_${hasta}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('CSV descargado')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setExportingFacturas(false)
    }
  }

  const { data, error, isLoading, mutate } = useSWR<DashboardMetrics>(
    `/api/dashboard?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 8000 }
  )

  const esTotal = periodo === 'total'

  const metrics = [
    {
      label: 'Total Leads',
      value: data?.total_leads ?? 0,
      icon: Users,
      color: 'text-[#1B2B8C]',
      bg: 'bg-[#1B2B8C]/5',
      onClick: () => router.push('/leads'),
    },
    {
      label: 'Leads hoy',
      value: data?.leads_hoy ?? 0,
      icon: CalendarDays,
      color: 'text-[#4A9FD8]',
      bg: 'bg-[#4A9FD8]/5',
      hideOnTotal: true,
      onClick: () => {
        const hoy = toISODate(new Date())
        router.push(`/leads?desde=${hoy}&hasta=${hoy}`)
      },
    },
    {
      label: 'Últimos 7 días',
      value: data?.leads_semana ?? 0,
      icon: TrendingUp,
      color: 'text-[#CE142B]',
      bg: 'bg-[#CE142B]/5',
      hideOnTotal: true,
      onClick: () => {
        const hasta = new Date()
        const desde = new Date()
        desde.setDate(desde.getDate() - 7)
        router.push(`/leads?desde=${toISODate(desde)}&hasta=${toISODate(hasta)}`)
      },
    },
    {
      label: 'Tasa de conversión',
      value: data?.conversion_rate ?? 0,
      icon: Target,
      color: 'text-green-600',
      bg: 'bg-green-50',
      suffix: '%',
    },
  ].filter((m) => !esTotal || !m.hideOnTotal)

  const facturacionMetrics = [
    {
      label: esTotal ? 'Ventas totales' : 'Ventas del período',
      value: data?.ventas_periodo ?? 0,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
      format: formatUSD,
      comparativoPct: data?.ventas_comparativo_pct ?? null,
    },
    {
      label: 'Facturas emitidas',
      value: data?.facturas_emitidas ?? 0,
      icon: Receipt,
      color: 'text-[#1B2B8C]',
      bg: 'bg-[#1B2B8C]/5',
      comparativoPct: null as number | null,
    },
    {
      label: 'Ticket promedio',
      value: data?.ticket_promedio ?? 0,
      icon: Wallet,
      color: 'text-[#4A9FD8]',
      bg: 'bg-[#4A9FD8]/5',
      format: formatUSD,
      comparativoPct: null as number | null,
    },
    {
      label: 'Por cobrar',
      value: data?.por_cobrar ?? 0,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      format: formatUSD,
      comparativoPct: null as number | null,
    },
  ]

  // Única señal de atención del dashboard: el monto pendiente de cobro es alto
  // en relación al ticket promedio (equivalente a 3+ tickets sin cobrar).
  const porCobrar = data?.por_cobrar ?? 0
  const ticketPromedio = data?.ticket_promedio ?? 0
  const porCobrarAlto = porCobrar > 0 && ticketPromedio > 0 && porCobrar >= ticketPromedio * 3

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 h-8 bg-gray-100 dark:bg-white/5 rounded-lg w-48 animate-pulse" />
        <MetricSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="No se pudo cargar el dashboard" onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Actualización automática cada 8 segundos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-0.5">
            {PERIODO_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriodo(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  periodo === key ? 'bg-white dark:bg-midnight-surface text-[#1B2B8C] dark:text-[#4A9FD8] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className={`grid ${kpiGridClass(metrics.length)} mb-6`}>
        {metrics.map((m, i) => {
          const card = (
            <Card
              onClick={m.onClick}
              className={`p-5 ${m.onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                <m.icon size={20} className={m.color} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>
                <AnimatedNumber value={m.value} />
                {m.suffix}
              </p>
            </Card>
          )
          return (
            <motion.div
              key={m.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              {card}
            </motion.div>
          )
        })}
      </div>

      {/* Facturación KPIs */}
      {canViewFacturacion && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Facturación</h2>
          <button
            onClick={handleExportFacturasCsv}
            disabled={exportingFacturas}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            {exportingFacturas ? 'Generando…' : 'Exportar CSV'}
          </button>
        </div>
      )}
      {canViewFacturacion && (
        <div className={`grid ${kpiGridClass(facturacionMetrics.length)} mb-8`}>
          {facturacionMetrics.map((m, i) => {
            const destacar = m.label === 'Por cobrar' && porCobrarAlto
            const comparativoPct = m.comparativoPct
            const card = (
              <Card className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                    <m.icon size={20} className={m.color} />
                  </div>
                  {comparativoPct !== null && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        comparativoPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {comparativoPct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {comparativoPct > 0 ? '+' : ''}{comparativoPct}%
                    </span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>
                  {m.format ? m.format(m.value) : <AnimatedNumber value={m.value} />}
                </p>
                {comparativoPct !== null && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{PERIODO_COMPARATIVO_LABEL[periodo]}</p>
                )}
              </Card>
            )
            return (
              <motion.div
                key={m.label}
                custom={i + metrics.length}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                {destacar ? (
                  <ClientOnlyBeam
                    size="pulse-outside"
                    colorVariant="ocean"
                    staticColors
                    theme={beamTheme}
                    strength={0.4}
                    duration={10}
                    borderRadius={12}
                  >
                    {card}
                  </ClientOnlyBeam>
                ) : card}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Facturación charts */}
      {canViewFacturacion && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ventas por día</h3>
              <RevenueAreaChart data={data?.ventas_por_dia ?? []} loading={isLoading} />
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Distribución por medio de pago</h3>
              <PaymentMethodDonutChart data={data?.distribucion_medio_pago ?? []} loading={isLoading} />
            </Card>
          </motion.div>
        </div>
      )}

      {/* Top productos / facturación por vendedor */}
      {canViewFacturacion && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top 5 productos</h3>
              {(data?.top_productos ?? []).length === 0 ? (
                <p className="text-sm text-empty italic text-center py-6">Sin ventas registradas en este período</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-white/5">
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2">Producto</th>
                      <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2">Cant.</th>
                      <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.top_productos ?? []).map((p) => (
                      <tr key={p.producto} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                        <td className="py-2.5 text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{p.producto}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-300 tabular-nums">{p.cantidad}</td>
                        <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatUSD(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Facturación por vendedor</h3>
              {(data?.facturacion_por_vendedor ?? []).length === 0 ? (
                <p className="text-sm text-empty italic text-center py-6">Sin facturas registradas en este período</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-white/5">
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2">Vendedor</th>
                      <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2">N° facturas</th>
                      <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.facturacion_por_vendedor ?? []).map((v) => (
                      <tr key={v.vendedor_nombre} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                        <td className="py-2.5 text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{v.vendedor_nombre}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-300 tabular-nums">{v.cantidad_facturas}</td>
                        <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatUSD(v.monto_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </motion.div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Leads por estado</h3>
            <div className="space-y-3">
              {ESTADOS_ORDER.map((estado) => {
                const count = data?.leads_por_estado?.[estado] ?? 0
                const total = data?.total_leads ?? 1
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={estado}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ESTADO_DOT[estado]}`} />
                        <span className="text-gray-700 dark:text-gray-300">{ESTADO_LABELS[estado]}</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${ESTADO_DOT[estado]}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>

        {/* By channel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Leads por canal</h3>
            <div className="space-y-4">
              {Object.entries(data?.leads_por_canal ?? {}).map(([canal, count]) => (
                <div key={canal} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CanalIcon canal={canal} size={20} />
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{canal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#4A9FD8] rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.round((count / (data?.total_leads || 1)) * 100)}%`,
                        }}
                        transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-6 text-right tabular-nums">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
