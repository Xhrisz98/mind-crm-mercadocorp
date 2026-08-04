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
import NegocioCard from './NegocioCard'
import { cn, formatCurrency } from '@/lib/utils'
import type { Negocio, PipelineEstado } from '@/lib/types'

function DraggableCard({ negocio, index, onClick }: {
  negocio: Negocio
  index: number
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: negocio.id,
    data: { negocio },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.2 }}
    >
      <NegocioCard
        negocio={negocio}
        isDragSource={isDragging}
        setNodeRef={setNodeRef}
        style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
        dragListeners={listeners as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        onClick={onClick}
      />
    </motion.div>
  )
}

function Column({ estado, negocios, activeNegocio, onCardClick }: {
  estado: PipelineEstado
  negocios: Negocio[]
  activeNegocio: Negocio | null
  onCardClick: (negocio: Negocio) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.id })
  const showDropPlaceholder = isOver && activeNegocio !== null && activeNegocio.pipeline_estado_id !== estado.id

  const totalMonto = negocios.reduce((sum, n) => sum + n.monto, 0)
  const totalPonderado = totalMonto * (estado.probabilidad_cierre / 100)

  const bg = estado.es_estado_ganado
    ? 'bg-green-50/50 dark:bg-green-500/5'
    : estado.es_estado_perdido
    ? 'bg-red-50/50 dark:bg-red-500/5'
    : 'bg-gray-50/60 dark:bg-white/[0.03]'

  return (
    <div className="flex-shrink-0 w-64 flex flex-col snap-start">
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-midnight-surface rounded-xl border-l-4 shadow-sm mb-1"
        style={{ borderLeftColor: estado.color }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: estado.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">
          {estado.nombre}
        </span>
        <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full tabular-nums font-medium">
          {negocios.length}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-1 mb-2 text-[11px] tabular-nums">
        <span className="text-gray-500 dark:text-gray-400" title="Subtotal bruto de esta etapa">
          {formatCurrency(totalMonto)}
        </span>
        <span className="text-gray-400 dark:text-gray-500" title={`Ponderado por probabilidad de cierre (${estado.probabilidad_cierre}%)`}>
          ≈ {formatCurrency(totalPonderado)}
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
          {negocios.map((negocio, i) => (
            <DraggableCard
              key={negocio.id}
              negocio={negocio}
              index={i}
              onClick={() => onCardClick(negocio)}
            />
          ))}
        </AnimatePresence>
        {negocios.length === 0 && !showDropPlaceholder && (
          <p className="text-xs text-empty text-center py-6">Sin negocios</p>
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
  negocios: Negocio[]
  estados: PipelineEstado[]
  onNegocioUpdated: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onCardClick: (negocio: Negocio) => void
}

export default function KanbanNegocios({ negocios, estados, onNegocioUpdated, onDragStart, onDragEnd, onCardClick }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [optimisticEstados, setOptimisticEstados] = useState<Record<number, number>>({})

  useEffect(() => {
    setOptimisticEstados((prev) => {
      if (Object.keys(prev).length === 0) return prev
      let changed = false
      const next = { ...prev }
      for (const n of negocios) {
        if (next[n.id] === n.pipeline_estado_id) {
          delete next[n.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [negocios])

  const negociosResolved = negocios.map((n) =>
    optimisticEstados[n.id] ? { ...n, pipeline_estado_id: optimisticEstados[n.id] } : n
  )

  const activeNegocio = negociosResolved.find((n) => n.id === activeId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const negociosPorEstado = estados.reduce((acc, e) => {
    acc[e.id] = negociosResolved.filter((n) => n.pipeline_estado_id === e.id)
    return acc
  }, {} as Record<number, Negocio[]>)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
    onDragStart()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    onDragEnd()

    if (!over) return
    const negocio = negociosResolved.find((n) => n.id === active.id)
    const newEstadoId = over.id as number
    if (!negocio || negocio.pipeline_estado_id === newEstadoId) return

    setOptimisticEstados((prev) => ({ ...prev, [negocio.id]: newEstadoId }))

    try {
      const res = await fetch(`/api/negocios/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_estado_id: newEstadoId }),
      })
      if (!res.ok) throw new Error()
      const nuevoEstado = estados.find((e) => e.id === newEstadoId)
      toast.success(`Negocio movido a ${nuevoEstado?.nombre ?? 'nueva etapa'}`)
      onNegocioUpdated()
    } catch {
      setOptimisticEstados((prev) => {
        const next = { ...prev }
        delete next[negocio.id]
        return next
      })
      toast.error('Error al cambiar de etapa')
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {estados.map((estado) => (
          <Column
            key={estado.id}
            estado={estado}
            negocios={negociosPorEstado[estado.id] ?? []}
            activeNegocio={activeNegocio}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
        {activeNegocio ? <NegocioCard negocio={activeNegocio} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
