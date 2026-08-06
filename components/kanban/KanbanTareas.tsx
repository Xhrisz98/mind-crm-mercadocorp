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
import TareaCard from './TareaCard'
import { cn } from '@/lib/utils'
import type { Tarea, TareaEstado } from '@/lib/types'

function DraggableCard({ tarea, index, onClick }: { tarea: Tarea; index: number; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarea.id,
    data: { tarea },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.2 }}
    >
      <TareaCard
        tarea={tarea}
        isDragSource={isDragging}
        setNodeRef={setNodeRef}
        style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
        dragListeners={listeners as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        onClick={onClick}
        mostrarIndicadorVisibilidad
      />
    </motion.div>
  )
}

function Column({ estado, tareas, activeTarea, onCardClick }: {
  estado: TareaEstado
  tareas: Tarea[]
  activeTarea: Tarea | null
  onCardClick: (tarea: Tarea) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.id })
  const showDropPlaceholder = isOver && activeTarea !== null && activeTarea.tarea_estado_id !== estado.id

  return (
    <div className="flex-shrink-0 w-64 flex flex-col snap-start">
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-midnight-surface rounded-xl border-l-4 shadow-sm mb-2"
        style={{ borderLeftColor: estado.color }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: estado.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">{estado.nombre}</span>
        <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full tabular-nums font-medium">
          {tareas.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-32 rounded-xl p-2 space-y-2 border-2 transition-all duration-150',
          isOver ? 'border-[#1B2B8C] bg-[#1B2B8C]/5' : 'border-transparent bg-gray-50/60 dark:bg-white/[0.03]'
        )}
      >
        <AnimatePresence initial={false}>
          {tareas.map((tarea, i) => (
            <DraggableCard key={tarea.id} tarea={tarea} index={i} onClick={() => onCardClick(tarea)} />
          ))}
        </AnimatePresence>
        {tareas.length === 0 && !showDropPlaceholder && (
          <p className="text-xs text-empty text-center py-6">Sin tareas</p>
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

interface Props {
  tareas: Tarea[]
  estados: TareaEstado[]
  onTareaUpdated: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onCardClick: (tarea: Tarea) => void
}

export default function KanbanTareas({ tareas, estados, onTareaUpdated, onDragStart, onDragEnd, onCardClick }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [optimisticEstados, setOptimisticEstados] = useState<Record<number, number>>({})

  useEffect(() => {
    setOptimisticEstados((prev) => {
      if (Object.keys(prev).length === 0) return prev
      let changed = false
      const next = { ...prev }
      for (const t of tareas) {
        if (next[t.id] === t.tarea_estado_id) {
          delete next[t.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tareas])

  const tareasResolved = tareas.map((t) =>
    optimisticEstados[t.id] ? { ...t, tarea_estado_id: optimisticEstados[t.id] } : t
  )

  const activeTarea = tareasResolved.find((t) => t.id === activeId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const tareasPorEstado = estados.reduce((acc, e) => {
    acc[e.id] = tareasResolved.filter((t) => t.tarea_estado_id === e.id)
    return acc
  }, {} as Record<number, Tarea[]>)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
    onDragStart()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    onDragEnd()

    if (!over) return
    const tarea = tareasResolved.find((t) => t.id === active.id)
    const newEstadoId = over.id as number
    if (!tarea || tarea.tarea_estado_id === newEstadoId) return

    setOptimisticEstados((prev) => ({ ...prev, [tarea.id]: newEstadoId }))

    try {
      const res = await fetch(`/api/tareas/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea_estado_id: newEstadoId }),
      })
      if (!res.ok) throw new Error()
      const nuevoEstado = estados.find((e) => e.id === newEstadoId)
      toast.success(`Tarea movida a ${nuevoEstado?.nombre ?? 'nuevo estado'}`)
      onTareaUpdated()
    } catch {
      setOptimisticEstados((prev) => {
        const next = { ...prev }
        delete next[tarea.id]
        return next
      })
      toast.error('Error al cambiar de estado')
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {estados.map((estado) => (
          <Column
            key={estado.id}
            estado={estado}
            tareas={tareasPorEstado[estado.id] ?? []}
            activeTarea={activeTarea}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
        {activeTarea ? <TareaCard tarea={activeTarea} isOverlay mostrarIndicadorVisibilidad /> : null}
      </DragOverlay>
    </DndContext>
  )
}
