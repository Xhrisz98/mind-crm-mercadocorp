'use client'
import { useRouter } from 'next/navigation'
import CanalIcon from '@/components/ui/CanalIcon'
import { cn, getLeadScoreColor, LEAD_SCORE_LABELS, timeAgo } from '@/lib/utils'
import type { Contacto } from '@/lib/types'

interface KanbanCardProps {
  lead: Contacto
  isOverlay?: boolean
  isDragSource?: boolean
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
}

export default function KanbanCard({
  lead,
  isOverlay,
  isDragSource,
  dragListeners,
  dragAttributes,
  setNodeRef,
  style,
}: KanbanCardProps) {
  const router = useRouter()

  function handleClick() {
    if (!isOverlay) router.push(`/leads/${lead.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        'bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-3 select-none transition-shadow duration-150',
        isOverlay
          ? 'shadow-2xl rotate-1 scale-105 cursor-grabbing border-[#1B2B8C]/20'
          : isDragSource
          ? 'opacity-40 shadow-lg cursor-grabbing'
          : 'shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing'
      )}
    >
      {/* Drag handle area — covers the whole card */}
      <div {...dragListeners} {...dragAttributes} className="touch-none">
        {/* Top row: name + score */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 flex-1">
            {lead.nombre}
          </p>
          <span className={cn(
            'text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums',
            getLeadScoreColor(lead.lead_score)
          )}>
            {LEAD_SCORE_LABELS[lead.lead_score]}
          </span>
        </div>

        {/* Bottom row: canal + vendedor + time */}
        <div className="flex items-center justify-between gap-1">
          <CanalIcon canal={lead.canal} size={13} showLabel />
          <div className="flex items-center gap-1.5">
            {lead.vendedor_nombre && (
              <div
                className="w-5 h-5 rounded-full bg-[#1B2B8C]/10 text-[#1B2B8C] flex items-center justify-center text-[10px] font-bold shrink-0"
                title={lead.vendedor_nombre}
              >
                {lead.vendedor_nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
              {timeAgo(lead.fecha_ultima_interaccion)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
