import { cn } from '@/lib/utils'
import type { EstadoLead } from '@/lib/types'
import { ESTADO_COLORS, ESTADO_LABELS } from '@/lib/utils'
import { UserCheck } from 'lucide-react'

interface BadgeProps {
  estado: EstadoLead
  size?: 'sm' | 'md'
}

export default function Badge({ estado, size = 'md' }: BadgeProps) {
  const iconSize = size === 'sm' ? 11 : 12
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        ESTADO_COLORS[estado]
      )}
    >
      {estado === 'en_atencion_humana' && <UserCheck size={iconSize} />}
      {ESTADO_LABELS[estado]}
    </span>
  )
}
