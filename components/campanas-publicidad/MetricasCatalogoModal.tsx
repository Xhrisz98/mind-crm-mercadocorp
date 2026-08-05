'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'
import { cn } from '@/lib/utils'
import type { MetricaDefinicion, UnidadMetrica } from '@/lib/types'
import Spinner from '@/components/ui/Spinner'
import { Plus, X, Trash2, Lock } from 'lucide-react'

interface Props {
  onClose: () => void
  onChanged?: () => void
}

const UNIDAD_OPTIONS: { value: UnidadMetrica; label: string }[] = [
  { value: 'numero', label: 'Número' },
  { value: 'usd', label: 'USD' },
  { value: 'porcentaje', label: 'Porcentaje' },
]

const CATEGORIA_OPTIONS = [
  { value: 'alcance', label: 'Alcance' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversion', label: 'Conversión' },
  { value: 'gasto', label: 'Gasto' },
]

export default function MetricasCatalogoModal({ onClose, onChanged }: Props) {
  const { data, mutate } = useSWR<{ metricas: MetricaDefinicion[] }>('/api/metricas-definiciones', fetcher)
  const metricas = data?.metricas ?? []

  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState<UnidadMetrica>('numero')
  const [categoria, setCategoria] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function handleCrear() {
    const nombreTrim = nombre.trim()
    if (!nombreTrim) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/metricas-definiciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreTrim, unidad, categoria: categoria || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al crear la métrica'); return }
      toast.success('Métrica creada')
      setNombre(''); setUnidad('numero'); setCategoria('')
      await mutate()
      onChanged?.()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleToggleActivo(m: MetricaDefinicion) {
    setBusyId(m.id)
    try {
      const res = await fetch(`/api/metricas-definiciones/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !m.activo }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al actualizar la métrica'); return }
      await mutate()
      onChanged?.()
    } catch { toast.error('Error de conexión') }
    finally { setBusyId(null) }
  }

  async function handleEliminar(m: MetricaDefinicion) {
    if (m.es_default || m.tiene_valores) return
    setBusyId(m.id)
    try {
      const res = await fetch(`/api/metricas-definiciones/${m.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar la métrica'); return }
      toast.success('Métrica eliminada')
      await mutate()
      onChanged?.()
    } catch { toast.error('Error de conexión') }
    finally { setBusyId(null) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Catálogo de métricas</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5 mb-5 max-h-64 overflow-y-auto">
          {metricas.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                  {m.nombre}
                  {m.es_default && <Lock size={11} className="text-gray-400 shrink-0" />}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {UNIDAD_OPTIONS.find((u) => u.value === m.unidad)?.label}
                  {m.categoria && ` · ${CATEGORIA_OPTIONS.find((c) => c.value === m.categoria)?.label ?? m.categoria}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActivo(m)}
                  disabled={busyId === m.id}
                  className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium transition-colors disabled:opacity-50',
                    m.activo
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {m.activo ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEliminar(m)}
                  disabled={m.es_default || m.tiene_valores || busyId === m.id}
                  title={m.es_default ? 'No se puede eliminar una métrica del sistema' : m.tiene_valores ? 'Ya tiene valores registrados — desactívala en su lugar' : 'Eliminar'}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Nueva métrica</p>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Tasa de apertura"
            className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as UnidadMetrica)}
              className="text-sm px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            >
              {UNIDAD_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="text-sm px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            >
              <option value="">Sin categoría</option>
              {CATEGORIA_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCrear}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Spinner state="working" /> : <Plus size={12} />}
              Agregar métrica
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
