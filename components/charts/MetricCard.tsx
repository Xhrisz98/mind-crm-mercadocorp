import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import { getPaletaGraficos } from '@/lib/theme'

interface Props {
  label: string
  value: string
  highlighted?: boolean
  footnote?: string
}

// Versión reutilizable del KPI card de campañas-publicidad (antes un
// componente local `KpiCard`) — mismo look, pero sin ningún color de marca
// escrito a mano: el acento de "destacado" se deriva de
// getPaletaGraficos().primario (var(--chart-1)) vía color-mix(), así que
// claro/oscuro y un futuro rebranding de esta plantilla solo tocan
// app/globals.css, nunca este componente.
export default function MetricCard({ label, value, highlighted, footnote }: Props) {
  const primario = getPaletaGraficos().primario

  return (
    <div
      className={cn('rounded-xl border p-3', highlighted ? 'ring-1' : 'border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]')}
      style={highlighted ? {
        borderColor: `color-mix(in srgb, ${primario} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${primario} 5%, transparent)`,
        '--tw-ring-color': `color-mix(in srgb, ${primario} 20%, transparent)`,
      } as React.CSSProperties : undefined}
    >
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={cn('text-lg font-bold tabular-nums', !highlighted && 'text-gray-900 dark:text-gray-100')}
        style={highlighted ? { color: primario } : undefined}
      >
        {value}
      </p>
      {footnote && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-start gap-1">
          <Info size={10} className="shrink-0 mt-0.5" />
          {footnote}
        </p>
      )}
    </div>
  )
}
