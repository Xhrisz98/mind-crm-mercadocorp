import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Negocio } from '@/lib/types'
import { Building2, Calendar } from 'lucide-react'

interface NegocioCardProps {
  negocio: Negocio
  isOverlay?: boolean
  isDragSource?: boolean
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  onClick?: () => void
}

export default function NegocioCard({
  negocio,
  isOverlay,
  isDragSource,
  dragListeners,
  dragAttributes,
  setNodeRef,
  style,
  onClick,
}: NegocioCardProps) {
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
          : 'shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing'
      )}
    >
      <div {...dragListeners} {...dragAttributes} className="touch-none">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 mb-1.5">
          {negocio.nombre}
        </p>

        <p className="text-sm font-bold text-[#1B2B8C] dark:text-[#4A9FD8] tabular-nums mb-2">
          {formatCurrency(negocio.monto)}
        </p>

        {negocio.contacto_nombre && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <Building2 size={12} className="shrink-0" />
            <span className="truncate">{negocio.contacto_nombre}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          {negocio.fecha_cierre_estimada ? (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <Calendar size={11} className="shrink-0" />
              <span className="tabular-nums">{formatDate(negocio.fecha_cierre_estimada)}</span>
            </div>
          ) : (
            <span />
          )}
          {negocio.vendedor_nombre && (
            <div
              className="w-5 h-5 rounded-full bg-[#1B2B8C]/10 text-[#1B2B8C] flex items-center justify-center text-[10px] font-bold shrink-0"
              title={negocio.vendedor_nombre}
            >
              {negocio.vendedor_nombre.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
