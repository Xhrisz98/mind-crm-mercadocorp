'use client'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import MetricCard from '@/components/charts/MetricCard'
import ChartCard from '@/components/charts/ChartCard'
import { MetricSkeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import type { DashboardMetrics, Periodo } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'

const PERIODO_OPTIONS: { key: Periodo; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'total', label: 'Total' },
]

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

function Seccion({ titulo, index, children }: { titulo: string; index: number; children: React.ReactNode }) {
  return (
    <motion.div custom={index} variants={sectionVariants} initial="hidden" animate="visible" className="mb-8">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{titulo}</h2>
      {children}
    </motion.div>
  )
}

export default function DashboardClient() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const { data, error, isLoading, mutate } = useSWR<DashboardMetrics>(
    `/api/dashboard?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 8000 }
  )

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 h-8 bg-gray-100 dark:bg-white/5 rounded-lg w-48 animate-pulse" />
        <MetricSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="No se pudo cargar el dashboard" onRetry={() => mutate()} />
      </div>
    )
  }

  const canalData = Object.entries(data.leads.leads_por_canal).map(([canal, count]) => ({ canal, count }))

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Resumen unificado — actualización automática cada 8 segundos</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <Seccion titulo="Negocios" index={0}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Valor del pipeline" value={formatCurrency(data.negocios.pipeline_valor)} />
          <MetricCard label="Valor ponderado" value={formatCurrency(data.negocios.pipeline_ponderado)} />
          <MetricCard
            label="Ganados en el período"
            value={data.negocios.ganados_periodo.toLocaleString()}
            footnote="Aproximado: basado en la última actualización del negocio, no en una fecha exacta de cierre"
          />
          <MetricCard
            label="Tasa de cierre"
            value={`${data.negocios.tasa_cierre}%`}
            highlighted
            footnote="Histórico completo — no varía con el período seleccionado"
          />
        </div>
      </Seccion>

      <Seccion titulo="Leads" index={1}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <MetricCard label="Total de contactos" value={data.leads.total_contactos.toLocaleString()} />
          <MetricCard label="Nuevos en el período" value={data.leads.nuevos_contactos_periodo.toLocaleString()} />
          <MetricCard label="Conversión a negocio" value={`${data.leads.tasa_conversion_negocio}%`} highlighted />
        </div>
        <Card className="p-4">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Distribución por canal</p>
          <ChartCard
            tipo="pie"
            data={canalData}
            categoryKey="canal"
            series={[{ clave: 'count', nombre: 'Contactos', unidad: 'numero' }]}
            ariaLabel="Distribución de contactos por canal"
            height={200}
          />
        </Card>
      </Seccion>

      {data.campanas && (
        <Seccion titulo="Campañas de publicidad activas" index={2}>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Gasto total" value={formatCurrency(data.campanas.gasto_total)} />
            <MetricCard label="Conversiones totales" value={data.campanas.conversiones_total.toLocaleString()} highlighted />
          </div>
        </Seccion>
      )}

      <Seccion titulo="Proyectos" index={3}>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Proyectos activos" value={data.proyectos.proyectos_activos.toLocaleString()} />
          <MetricCard
            label="Tareas vencidas"
            value={data.proyectos.tareas_vencidas.toLocaleString()}
            highlighted={data.proyectos.tareas_vencidas > 0}
          />
        </div>
      </Seccion>
    </div>
  )
}
