'use client'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import { CardSkeleton } from '@/components/ui/SkeletonLoader'
import { fetcher } from '@/lib/fetcher'
import { formatDate, ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS } from '@/lib/utils'
import type { Proyecto } from '@/lib/types'
import { FolderKanban, CalendarClock } from 'lucide-react'

export default function PortalClient() {
  const { data, error, isLoading, mutate } = useSWR<{ proyectos: Proyecto[] }>('/api/portal/proyectos', fetcher)
  const proyectos = data?.proyectos ?? []

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tus proyectos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {proyectos.length > 0
            ? `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''}`
            : 'Cargando…'}
        </p>
      </div>

      {error ? (
        <ErrorState message="No se pudieron cargar tus proyectos" onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : proyectos.length === 0 ? (
        <Card className="p-10 text-center">
          <FolderKanban className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
          <p className="text-sm text-gray-500 dark:text-gray-400">Aún no tienes proyectos visibles.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {proyectos.map((p, i) => {
            const total = p.tareas_total ?? 0
            const completadas = p.tareas_completadas ?? 0
            const avance = total > 0 ? Math.round((completadas / total) * 100) : 0
            const esCompleto = p.visibilidad_cliente === 'completo'
            const contenido = (
              <Card hover={esCompleto} className="p-5 h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{p.nombre}</h3>
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${ESTADO_PROYECTO_COLORS[p.estado]}`}>
                    {ESTADO_PROYECTO_LABELS[p.estado]}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Avance</span>
                    <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">{avance}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#1B2B8C] rounded-full transition-all duration-300" style={{ width: `${avance}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <CalendarClock size={13} />
                  {p.proxima_fecha_limite ? `Próxima fecha límite: ${formatDate(p.proxima_fecha_limite)}` : 'Sin fechas límite próximas'}
                </div>

                {p.fecha_fin_estimada && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Estimado de finalización: {formatDate(p.fecha_fin_estimada)}
                  </p>
                )}

                {!esCompleto && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 italic">Vista resumen</p>
                )}
              </Card>
            )
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}>
                {esCompleto ? <Link href={`/portal/proyectos/${p.id}`}>{contenido}</Link> : contenido}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
