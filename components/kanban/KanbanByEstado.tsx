'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import KanbanCard from './KanbanCard'
import { cn, ESTADO_LABELS } from '@/lib/utils'
import type { Contacto, EstadoLead } from '@/lib/types'

const COLUMNAS: {
  key: EstadoLead
  dot: string
  border: string
  bg: string
}[] = [
  { key: 'inicial',             dot: 'bg-gray-300',   border: 'border-l-gray-200',    bg: 'bg-gray-50/60 dark:bg-white/[0.03]'      },
  { key: 'nuevo',               dot: 'bg-gray-400',   border: 'border-l-gray-300',    bg: 'bg-gray-50/80 dark:bg-white/[0.04]'      },
  { key: 'contactado',          dot: 'bg-blue-500',   border: 'border-l-blue-400',    bg: 'bg-blue-50/50 dark:bg-blue-500/5'        },
  { key: 'interesado',          dot: 'bg-yellow-500', border: 'border-l-yellow-400',  bg: 'bg-yellow-50/50 dark:bg-yellow-500/5'    },
  { key: 'en_atencion_humana',  dot: 'bg-orange-500', border: 'border-l-orange-500',  bg: 'bg-orange-50/60 dark:bg-orange-500/5'    },
  { key: 'en_negociacion',      dot: 'bg-orange-400', border: 'border-l-orange-300',  bg: 'bg-orange-50/30 dark:bg-orange-500/5'    },
  { key: 'cliente',             dot: 'bg-green-500',  border: 'border-l-green-400',   bg: 'bg-green-50/50 dark:bg-green-500/5'      },
  { key: 'perdido',             dot: 'bg-red-500',    border: 'border-l-red-400',     bg: 'bg-red-50/50 dark:bg-red-500/5'          },
]

// ── Draggable item ──────────────────────────────────────────────
function DraggableCard({ lead, index }: {
  lead: Contacto
  index: number
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.2 }}
    >
      <KanbanCard
        lead={lead}
        isDragSource={isDragging}
        setNodeRef={setNodeRef}
        style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
        dragListeners={listeners as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
      />
    </motion.div>
  )
}

// ── Droppable column ────────────────────────────────────────────
function Column({ colKey, dot, border, bg, leads, activeLead }: {
  colKey: EstadoLead
  dot: string
  border: string
  bg: string
  leads: Contacto[]
  activeLead: Contacto | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey })
  const showDropPlaceholder = isOver && activeLead !== null && activeLead.estado_lead !== colKey

  return (
    <div className="flex-shrink-0 w-64 flex flex-col snap-start">
      <div className={`flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-midnight-surface rounded-xl border-l-4 ${border} shadow-sm mb-3`}>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">
          {ESTADO_LABELS[colKey]}
        </span>
        <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full tabular-nums font-medium">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-32 rounded-xl p-2 space-y-2 border-2 transition-all duration-150',
          isOver ? 'border-[#1B2B8C] bg-[#1B2B8C]/5' : cn('border-transparent', bg)
        )}
      >
        <AnimatePresence initial={false}>
          {leads.map((lead, i) => (
            <DraggableCard
              key={lead.id}
              lead={lead}
              index={i}
            />
          ))}
        </AnimatePresence>
        {leads.length === 0 && !showDropPlaceholder && (
          <p className="text-xs text-empty text-center py-6">Sin leads</p>
        )}
        {showDropPlaceholder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="h-20 rounded-xl border-2 border-dashed border-[#1B2B8C]/40 bg-[#1B2B8C]/5"
          />
        )}
      </div>
    </div>
  )
}

// ── Board ───────────────────────────────────────────────────────
interface Props {
  leads: Contacto[]
  onLeadUpdated: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

export default function KanbanByEstado({ leads, onLeadUpdated, onDragStart, onDragEnd }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [optimisticEstados, setOptimisticEstados] = useState<Record<number, EstadoLead>>({})

  // Una vez que los datos del servidor reflejan el nuevo estado, se limpia el override local
  useEffect(() => {
    setOptimisticEstados((prev) => {
      if (Object.keys(prev).length === 0) return prev
      let changed = false
      const next = { ...prev }
      for (const l of leads) {
        if (next[l.id] === l.estado_lead) {
          delete next[l.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [leads])

  const leadsResolved = leads.map((l) =>
    optimisticEstados[l.id] ? { ...l, estado_lead: optimisticEstados[l.id] } : l
  )

  const activeLead = leadsResolved.find((l) => l.id === activeId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const leadsByEstado = COLUMNAS.reduce((acc, col) => {
    acc[col.key] = leadsResolved.filter((l) => l.estado_lead === col.key)
    return acc
  }, {} as Record<EstadoLead, Contacto[]>)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
    onDragStart()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    onDragEnd()

    if (!over) return
    const lead = leadsResolved.find((l) => l.id === active.id)
    const newEstado = over.id as EstadoLead
    if (!lead || lead.estado_lead === newEstado) return

    setOptimisticEstados((prev) => ({ ...prev, [lead.id]: newEstado }))

    try {
      const res = await fetch(`/api/leads/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_lead: newEstado }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Lead movido a ${ESTADO_LABELS[newEstado]}`)
      onLeadUpdated()
    } catch {
      setOptimisticEstados((prev) => {
        const next = { ...prev }
        delete next[lead.id]
        return next
      })
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {COLUMNAS.map((col) => (
          <Column
            key={col.key}
            colKey={col.key}
            dot={col.dot}
            border={col.border}
            bg={col.bg}
            leads={leadsByEstado[col.key] ?? []}
            activeLead={activeLead}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
        {activeLead ? <KanbanCard lead={activeLead} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
