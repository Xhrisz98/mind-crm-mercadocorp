import { cn, formatDate, PRIORIDAD_TAREA_LABELS, PRIORIDAD_TAREA_COLORS } from '@/lib/utils'
import type { Tarea } from '@/lib/types'
import { Calendar, Paperclip, EyeOff } from 'lucide-react'

interface TareaCardProps {
  tarea: Tarea
  isOverlay?: boolean
  isDragSource?: boolean
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  onClick?: () => void
  // Oculta el indicador "no visible al cliente" — no aplica en el tablero de
  // solo lectura del portal, donde por definición solo llegan tareas visibles.
  mostrarIndicadorVisibilidad?: boolean
  // Miniaturas de imagen en vez del badge de conteo — el portal de cliente
  // (spec: "mostrando también los adjuntos de imagen de cada tarea") las
  // necesita visibles sin un segundo clic; el tablero interno solo muestra
  // el conteo y deja el detalle para el modal de edición de la tarea.
  mostrarImagenesAdjuntos?: boolean
}

export default function TareaCard({
  tarea, isOverlay, isDragSource, dragListeners, dragAttributes, setNodeRef, style, onClick,
  mostrarIndicadorVisibilidad, mostrarImagenesAdjuntos,
}: TareaCardProps) {
  const vencida = !!tarea.fecha_limite && !tarea.es_estado_final && new Date(tarea.fecha_limite) < new Date(new Date().toDateString())

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isOverlay && onClick?.()}
      className={cn(
        'bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-3 select-none transition-shadow duration-150',
        isOverlay
          ? 'shadow-2xl rotate-1 scale-105 cursor-grabbing border-[#1B2B8C]/20'
          : isDragSource
          ? 'opacity-40 shadow-lg cursor-grabbing'
          : dragListeners
          ? 'shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing'
          : 'shadow-sm hover:shadow-md cursor-pointer'
      )}
    >
      <div {...dragListeners} {...dragAttributes} className="touch-none">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
            {tarea.titulo}
          </p>
          {mostrarIndicadorVisibilidad && !tarea.visible_cliente && (
            <EyeOff size={13} className="shrink-0 text-gray-400 dark:text-gray-500 mt-0.5" aria-label="No visible al cliente" />
          )}
        </div>

        <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-2', PRIORIDAD_TAREA_COLORS[tarea.prioridad])}>
          {PRIORIDAD_TAREA_LABELS[tarea.prioridad]}
        </span>

        {mostrarImagenesAdjuntos && (tarea.adjuntos?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tarea.adjuntos!.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0"
              >
                {/* next/image no aplica: URL dinámica del VPS de n8n, no configurable
                    de antemano en remotePatterns — mismo caso que LeadDetailClient.tsx. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.nombre_archivo ?? 'Adjunto'} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            {tarea.fecha_limite && (
              <div className={cn('flex items-center gap-1 text-[11px]', vencida ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400')}>
                <Calendar size={11} className="shrink-0" />
                <span className="tabular-nums">{formatDate(tarea.fecha_limite)}</span>
              </div>
            )}
            {(tarea.adjuntos?.length ?? 0) > 0 && (
              <div className="flex items-center gap-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <Paperclip size={11} />
                <span className="tabular-nums">{tarea.adjuntos!.length}</span>
              </div>
            )}
          </div>
          {tarea.asignado_a_nombre && (
            <div
              className="w-5 h-5 rounded-full bg-[#1B2B8C]/10 text-[#1B2B8C] flex items-center justify-center text-[10px] font-bold shrink-0"
              title={tarea.asignado_a_nombre}
            >
              {tarea.asignado_a_nombre.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
