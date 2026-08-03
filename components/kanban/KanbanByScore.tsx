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
import { Info } from 'lucide-react'
import KanbanCard from './KanbanCard'
import { cn, LEAD_SCORE_LABELS } from '@/lib/utils'
import type { Contacto, LeadScore, Rol } from '@/lib/types'

const COLUMNAS: {
  key: LeadScore
  label: string
  dot: string
  border: string
  bg: string
  badge: string
  filter: (l: Contacto) => boolean
}[] = [
  {
    key: 'frio',
    label: 'Frío',
    dot: 'bg-red-500',
    border: 'border-l-red-400',
    bg: 'bg-red-50/50 dark:bg-red-500/5',
    badge: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    filter: (l) => l.estado_lead !== 'cliente' && l.lead_score === 'frio',
  },
  {
    key: 'tibio',
    label: 'Tibio',
    dot: 'bg-yellow-500',
    border: 'border-l-yellow-400',
    bg: 'bg-yellow-50/50 dark:bg-yellow-500/5',
    badge: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400',
    filter: (l) => l.estado_lead !== 'cliente' && l.lead_score === 'tibio',
  },
  {
    key: 'caliente',
    label: 'Caliente',
    dot: 'bg-green-500',
    border: 'border-l-green-400',
    bg: 'bg-green-50/50 dark:bg-green-500/5',
    badge: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
    filter: (l) => l.estado_lead !== 'cliente' && l.lead_score === 'caliente',
  },
  {
    key: 'cliente',
    label: 'Cliente',
    dot: 'bg-blue-500',
    border: 'border-l-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-500/5',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    filter: (l) => l.estado_lead === 'cliente' || l.lead_score === 'cliente',
  },
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
function Column({ col, leads, activeLead, draggable }: {
  col: typeof COLUMNAS[number]
  leads: Contacto[]
  activeLead: Contacto | null
  draggable: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key, disabled: !draggable })
  const showDropPlaceholder = draggable && isOver && activeLead !== null && activeLead.lead_score !== col.key

  return (
    <div className="flex-shrink-0 w-64 flex flex-col snap-start">
      <div className={`flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-midnight-surface rounded-xl border-l-4 ${col.border} shadow-sm mb-3`}>
        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">{col.label}</span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full tabular-nums font-medium', col.badge)}>
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-32 rounded-xl p-2 space-y-2 border-2 transition-all duration-150',
          draggable && isOver ? 'border-[#1B2B8C] bg-[#1B2B8C]/5' : cn('border-transparent', col.bg)
        )}
      >
        <AnimatePresence initial={false}>
          {leads.map((lead, i) => (
            draggable ? (
              <DraggableCard key={lead.id} lead={lead} index={i} />
            ) : (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.2 }}
              >
                <KanbanCard lead={lead} />
              </motion.div>
            )
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
  userRol: Rol
  onLeadUpdated: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

export default function KanbanByScore({ leads, userRol, onLeadUpdated, onDragStart, onDragEnd }: Props) {
  const draggable = userRol === 'admin' || userRol === 'comercial'
  const [activeId, setActiveId] = useState<number | null>(null)
  const [optimisticScores, setOptimisticScores] = useState<Record<number, LeadScore>>({})

  // Una vez que los datos del servidor reflejan el nuevo score, se limpia el override local
  useEffect(() => {
    setOptimisticScores((prev) => {
      if (Object.keys(prev).length === 0) return prev
      let changed = false
      const next = { ...prev }
      for (const l of leads) {
        if (next[l.id] === l.lead_score) {
          delete next[l.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [leads])

  const leadsResolved = leads.map((l) =>
    optimisticScores[l.id] ? { ...l, lead_score: optimisticScores[l.id] } : l
  )

  const activeLead = leadsResolved.find((l) => l.id === activeId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const leadsByCol = COLUMNAS.reduce((acc, col) => {
    acc[col.key] = leadsResolved.filter(col.filter)
    return acc
  }, {} as Record<LeadScore, Contacto[]>)

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
    const newScore = over.id as LeadScore
    if (!lead || lead.lead_score === newScore) return

    setOptimisticScores((prev) => ({ ...prev, [lead.id]: newScore }))

    try {
      const res = await fetch(`/api/contactos/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_score: newScore }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Lead movido a ${LEAD_SCORE_LABELS[newScore]}`)
      onLeadUpdated()
    } catch {
      setOptimisticScores((prev) => {
        const next = { ...prev }
        delete next[lead.id]
        return next
      })
      toast.error('Error al cambiar el score')
    }
  }

  const board = (
    <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
      {COLUMNAS.map((col) => (
        <Column
          key={col.key}
          col={col}
          leads={leadsByCol[col.key] ?? []}
          activeLead={activeLead}
          draggable={draggable}
        />
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-sm text-amber-700 dark:text-amber-400">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>
          {draggable
            ? 'El score se calcula automáticamente, pero puedes arrastrar un lead a otra columna para ajustarlo manualmente.'
            : 'El score se calcula automáticamente según el estado y el tiempo.'}
        </span>
      </div>

      {draggable ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {board}
          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
            {activeLead ? <KanbanCard lead={activeLead} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        board
      )}
    </div>
  )
}
