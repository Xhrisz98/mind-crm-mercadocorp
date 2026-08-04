'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import { MetricSkeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import CanalIcon from '@/components/ui/CanalIcon'
import { fetcher } from '@/lib/fetcher'
import type { LeadsMetricas, Periodo, EstadoLead } from '@/lib/types'
import { ESTADO_LABELS } from '@/lib/utils'
import { ArrowLeft, Users, Target, XCircle } from 'lucide-react'

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

function KpiCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <Card className="p-5">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} ${color} mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </Card>
  )
}

export default function MetricasClient() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const { data, error, isLoading, mutate } = useSWR<LeadsMetricas>(
    `/api/leads/metricas?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 15000 }
  )

  const total = data?.total_leads ?? 0
  const maxFunnel = Math.max(1, ...(data?.funnel.map((f) => f.count) ?? [1]))

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors mb-1.5"
          >
            <ArrowLeft size={13} />
            Volver a Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Métricas de Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total.toLocaleString()} lead${total !== 1 ? 's' : ''} en el período` : 'Cargando…'}
          </p>
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-0.5">
          {PERIODO_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                periodo === key
                  ? 'bg-white dark:bg-midnight-surface text-[#1B2B8C] dark:text-[#4A9FD8] shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState message="No se pudieron cargar las métricas" onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <KpiCard icon={Users} label="Total de leads" value={total.toLocaleString()} color="text-[#1B2B8C]" bg="bg-[#1B2B8C]/5" />
            <KpiCard icon={Target} label="Tasa de conversión" value={`${data?.conversion_rate ?? 0}%`} color="text-green-600" bg="bg-green-50 dark:bg-green-500/10" />
            <KpiCard
              icon={XCircle}
              label="Leads perdidos"
              value={`${data?.perdidos ?? 0} (${total > 0 ? Math.round(((data?.perdidos ?? 0) / total) * 100) : 0}%)`}
              color="text-red-600"
              bg="bg-red-50 dark:bg-red-500/10"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Funnel de leads</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Distribución actual por etapa (no es un análisis de cohorte)
                </p>
                <div className="space-y-3">
                  {data?.funnel.map((etapa, i) => {
                    const widthPct = Math.round((etapa.count / maxFunnel) * 100)
                    const pctTotal = total > 0 ? Math.round((etapa.count / total) * 100) : 0
                    return (
                      <div key={etapa.estado}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${ESTADO_DOT[etapa.estado]}`} />
                            <span className="text-gray-700 dark:text-gray-300">{ESTADO_LABELS[etapa.estado]}</span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                            {etapa.count} <span className="text-gray-400 dark:text-gray-500">({pctTotal}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${ESTADO_DOT[etapa.estado]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPct}%` }}
                            transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
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
                            animate={{ width: `${Math.round((count / (total || 1)) * 100)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(data?.leads_por_canal ?? {}).length === 0 && (
                    <p className="text-xs text-empty text-center py-6">Sin leads en este período</p>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Conversión por canal</h3>
                <div className="space-y-3">
                  {data?.conversion_por_canal.map((c) => (
                    <div key={c.canal} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <CanalIcon canal={c.canal} size={18} />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{c.canal}</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-green-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${c.tasa}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums w-28 text-right">
                        {c.clientes}/{c.total} · {c.tasa}%
                      </span>
                    </div>
                  ))}
                  {(data?.conversion_por_canal.length ?? 0) === 0 && (
                    <p className="text-xs text-empty text-center py-6">Sin leads en este período</p>
                  )}
                </div>
              </Card>
            </motion.div>

            {(data?.leads_por_vendedor.length ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="lg:col-span-2"
              >
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Leads por vendedor</h3>
                  <div className="space-y-3">
                    {(() => {
                      const maxVendedor = Math.max(1, ...(data?.leads_por_vendedor.map((v) => v.count) ?? [1]))
                      return data?.leads_por_vendedor.map((v) => (
                        <div key={v.vendedor_nombre} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300 w-40 shrink-0 truncate">{v.vendedor_nombre}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[#1B2B8C] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round((v.count / maxVendedor) * 100)}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums w-10 text-right">{v.count}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
