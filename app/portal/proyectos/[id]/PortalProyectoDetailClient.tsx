'use client'
import Link from 'next/link'
import useSWR from 'swr'
import ErrorState from '@/components/ui/ErrorState'
import TareaCard from '@/components/kanban/TareaCard'
import { fetcher } from '@/lib/fetcher'
import { cn, formatDate, ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS } from '@/lib/utils'
import type { Proyecto, Tarea } from '@/lib/types'
import { ArrowLeft, ListChecks, CalendarClock } from 'lucide-react'

interface Props {
  proyectoId: number
}

export default function PortalProyectoDetailClient({ proyectoId }: Props) {
  const { data, error, isLoading, mutate } = useSWR<{ proyecto: Proyecto; tareas: Tarea[] }>(
    `/api/portal/proyectos/${proyectoId}`, fetcher
  )

  if (error) {
    // 404 (proyecto ajeno o inexistente) y cualquier otro error se muestran
    // igual, sin distinguir — el backend ya decide qué caso es cuál.
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="No se pudo cargar este proyecto" onRetry={() => mutate()} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-64 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const { proyecto, tareas } = data

  // Columnas derivadas de las tareas visibles (no se expone /api/tareas-estados
  // al rol cliente) — agrupa por tarea_estado_id, ordenado por `orden`.
  const columnasMap = new Map<number, { nombre: string; color: string; orden: number; tareas: Tarea[] }>()
  for (const t of tareas) {
    if (!columnasMap.has(t.tarea_estado_id)) {
      columnasMap.set(t.tarea_estado_id, {
        nombre: t.tarea_estado_nombre!, color: t.tarea_estado_color!, orden: t.tarea_estado_orden!, tareas: [],
      })
    }
    columnasMap.get(t.tarea_estado_id)!.tareas.push(t)
  }
  const columnas = Array.from(columnasMap.values()).sort((a, b) => a.orden - b.orden)

  return (
    <div className="p-6 lg:p-8">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors mb-3"
      >
        <ArrowLeft size={13} />
        Volver a tus proyectos
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{proyecto.nombre}</h1>
        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', ESTADO_PROYECTO_COLORS[proyecto.estado])}>
          {ESTADO_PROYECTO_LABELS[proyecto.estado]}
        </span>
      </div>
      {proyecto.descripcion && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl mb-4">{proyecto.descripcion}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <ListChecks size={15} className="text-[#1B2B8C] dark:text-[#4A9FD8]" />
          {proyecto.tareas_completadas ?? 0}/{proyecto.tareas_total ?? 0} tareas completadas
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <CalendarClock size={15} className="text-gray-400" />
          {proyecto.proxima_fecha_limite ? `Próxima fecha límite: ${formatDate(proyecto.proxima_fecha_limite)}` : 'Sin fechas próximas'}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {columnas.map((col) => (
          <div key={col.nombre} className="flex-shrink-0 w-64 flex flex-col snap-start">
            <div
              className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-midnight-surface rounded-xl border-l-4 shadow-sm mb-2"
              style={{ borderLeftColor: col.color }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">{col.nombre}</span>
              <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full tabular-nums font-medium">
                {col.tareas.length}
              </span>
            </div>
            <div className="flex-1 min-h-32 rounded-xl p-2 space-y-2 bg-gray-50/60 dark:bg-white/[0.03]">
              {col.tareas.map((t) => (
                <TareaCard key={t.id} tarea={t} mostrarImagenesAdjuntos />
              ))}
            </div>
          </div>
        ))}
        {columnas.length === 0 && (
          <p className="text-sm text-empty italic py-10 text-center w-full">Sin tareas visibles en este proyecto todavía.</p>
        )}
      </div>
    </div>
  )
}
