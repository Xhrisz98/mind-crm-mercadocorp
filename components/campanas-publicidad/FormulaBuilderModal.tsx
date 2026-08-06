'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'
import { cn } from '@/lib/utils'
import type { FormulaPersonalizada, FormulaDefinicion, MetricaDefinicion, UnidadMetrica } from '@/lib/types'
import Spinner from '@/components/ui/Spinner'
import { Plus, X, Pencil, Archive, ArchiveRestore, Lock } from 'lucide-react'

interface Props {
  onClose: () => void
  onChanged?: () => void
}

type Operacion = FormulaDefinicion['operacion']

const UNIDAD_OPTIONS: { value: UnidadMetrica; label: string }[] = [
  { value: 'numero', label: 'Número' },
  { value: 'usd', label: 'USD' },
  { value: 'porcentaje', label: 'Porcentaje' },
]

const OPERACION_OPTIONS: { value: Operacion; label: string }[] = [
  { value: 'ratio', label: 'Razón (A / B)' },
  { value: 'suma', label: 'Suma' },
  { value: 'resta', label: 'Resta' },
  { value: 'multiplicacion', label: 'Multiplicación' },
]

const FORM_VACIO = {
  operacion: 'ratio' as Operacion,
  nombre: '',
  descripcion: '',
  unidad: 'numero' as UnidadMetrica,
  numerador: [] as number[],
  denominador: [] as number[],
  metricas: [] as number[],
  restaBase: null as number | null,
  restaResto: [] as number[],
}

function nombresDeMetricas(ids: number[], metricas: MetricaDefinicion[], sep = ' + '): string {
  return ids.map((id) => metricas.find((m) => m.id === id)?.nombre ?? `#${id}`).join(sep)
}

function resumenFormula(d: FormulaDefinicion, metricas: MetricaDefinicion[]): string {
  switch (d.operacion) {
    case 'ratio':
      return `${nombresDeMetricas(d.numerador, metricas)} / ${nombresDeMetricas(d.denominador, metricas)}`
    case 'suma':
      return nombresDeMetricas(d.metricas, metricas, ' + ')
    case 'multiplicacion':
      return nombresDeMetricas(d.metricas, metricas, ' × ')
    case 'resta': {
      const [base, ...resto] = d.metricas
      const nombreBase = nombresDeMetricas([base], metricas)
      return resto.length > 0 ? `${nombreBase} - ${nombresDeMetricas(resto, metricas, ' - ')}` : nombreBase
    }
  }
}

export default function FormulaBuilderModal({ onClose, onChanged }: Props) {
  const { data: dataFormulas, mutate: mutateFormulas } = useSWR<{ formulas: FormulaPersonalizada[] }>(
    '/api/formulas-personalizadas?archivadas=true', fetcher
  )
  const { data: dataMetricas } = useSWR<{ metricas: MetricaDefinicion[] }>('/api/metricas-definiciones', fetcher)
  const formulas = dataFormulas?.formulas ?? []
  const metricas = dataMetricas?.metricas ?? []
  const defaults = formulas.filter((f) => f.es_default)
  const personalizadas = formulas.filter((f) => !f.es_default)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  function openCreate() {
    setForm(FORM_VACIO)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(f: FormulaPersonalizada) {
    const d = f.definicion
    setForm({
      ...FORM_VACIO,
      operacion: d.operacion,
      nombre: f.nombre,
      descripcion: f.descripcion ?? '',
      unidad: f.unidad,
      numerador: d.operacion === 'ratio' ? d.numerador : [],
      denominador: d.operacion === 'ratio' ? d.denominador : [],
      metricas: d.operacion === 'suma' || d.operacion === 'multiplicacion' ? d.metricas : [],
      restaBase: d.operacion === 'resta' ? d.metricas[0] ?? null : null,
      restaResto: d.operacion === 'resta' ? d.metricas.slice(1) : [],
    })
    setEditingId(f.id)
    setShowForm(true)
  }

  function cambiarOperacion(operacion: Operacion) {
    setForm((f) => ({ ...FORM_VACIO, operacion, nombre: f.nombre, descripcion: f.descripcion, unidad: f.unidad }))
  }

  function toggleMetrica(lista: 'numerador' | 'denominador' | 'metricas', id: number) {
    setForm((f) => {
      const actual = f[lista]
      const nuevo = actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]
      return { ...f, [lista]: nuevo }
    })
  }

  function elegirBaseResta(id: number) {
    setForm((f) => ({ ...f, restaBase: id, restaResto: f.restaResto.filter((x) => x !== id) }))
  }

  function toggleRestaResto(id: number) {
    setForm((f) => ({
      ...f,
      restaResto: f.restaResto.includes(id) ? f.restaResto.filter((x) => x !== id) : [...f.restaResto, id],
    }))
  }

  async function handleGuardar() {
    const nombre = form.nombre.trim()
    if (!nombre) { toast.error('El nombre es requerido'); return }

    const payload: Record<string, unknown> = {
      nombre,
      descripcion: form.descripcion.trim() || null,
      unidad: form.unidad,
      operacion: form.operacion,
    }

    if (form.operacion === 'ratio') {
      if (form.numerador.length === 0) { toast.error('Selecciona al menos una métrica para el numerador'); return }
      if (form.denominador.length === 0) { toast.error('Selecciona al menos una métrica para el denominador'); return }
      payload.numerador = form.numerador
      payload.denominador = form.denominador
    } else if (form.operacion === 'resta') {
      if (form.restaBase == null) { toast.error('Selecciona la métrica base'); return }
      if (form.restaResto.length === 0) { toast.error('Selecciona al menos una métrica para restar'); return }
      payload.metricas = [form.restaBase, ...form.restaResto]
    } else {
      if (form.metricas.length < 2) { toast.error('Selecciona al menos dos métricas'); return }
      payload.metricas = form.metricas
    }

    setSaving(true)
    try {
      const url = editingId ? `/api/formulas-personalizadas/${editingId}` : '/api/formulas-personalizadas'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar la fórmula'); return }
      toast.success(editingId ? 'Fórmula actualizada' : 'Fórmula creada')
      setShowForm(false)
      await mutateFormulas()
      onChanged?.()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleArchivar(f: FormulaPersonalizada) {
    setBusyId(f.id)
    try {
      const res = await fetch(`/api/formulas-personalizadas/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivada: !f.archivada }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al actualizar la fórmula'); return }
      await mutateFormulas()
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Conversiones especializadas</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Fórmulas del sistema</p>
        <div className="space-y-1.5 mb-4">
          {defaults.map((f) => (
            <div key={f.id} className="px-2.5 py-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
              <p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Lock size={11} className="text-gray-400" /> {f.nombre}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {resumenFormula(f.definicion, metricas)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tus fórmulas</p>
          {!showForm && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2B8C] dark:text-[#4A9FD8] hover:underline"
            >
              <Plus size={12} /> Nueva fórmula
            </button>
          )}
        </div>

        {personalizadas.length === 0 && !showForm && (
          <p className="text-xs text-empty text-center py-4">Aún no has creado ninguna fórmula personalizada</p>
        )}

        <div className="space-y-1.5 mb-4">
          {personalizadas.map((f) => (
            <div
              key={f.id}
              className={cn(
                'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border',
                f.archivada
                  ? 'bg-gray-50/30 dark:bg-white/[0.01] border-gray-100 dark:border-white/5 opacity-60'
                  : 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5'
              )}
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{f.nombre}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {resumenFormula(f.definicion, metricas)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => openEdit(f)} title="Editar" className="p-1.5 text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors">
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleArchivar(f)}
                  disabled={busyId === f.id}
                  title={f.archivada ? 'Desarchivar' : 'Archivar'}
                  className="p-1.5 text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors disabled:opacity-50"
                >
                  {f.archivada ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg space-y-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{editingId ? 'Editar fórmula' : 'Nueva fórmula'}</p>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Costo por seguidor nuevo"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción (opcional)"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            />
            <div>
              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Operación</label>
              <select
                value={form.operacion}
                onChange={(e) => cambiarOperacion(e.target.value as Operacion)}
                disabled={editingId !== null}
                className="w-full text-sm px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 disabled:opacity-60"
              >
                {OPERACION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {editingId !== null && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  La operación no se puede cambiar al editar — crea una fórmula nueva si necesitas otra.
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Unidad del resultado</label>
              <select
                value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value as UnidadMetrica }))}
                className="w-full text-sm px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
              >
                {UNIDAD_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            {form.operacion === 'ratio' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Numerador</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1.5 bg-white dark:bg-white/5">
                  {metricas.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={form.numerador.includes(m.id)} onChange={() => toggleMetrica('numerador', m.id)} />
                      {m.nombre}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Denominador</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1.5 bg-white dark:bg-white/5">
                  {metricas.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={form.denominador.includes(m.id)} onChange={() => toggleMetrica('denominador', m.id)} />
                      {m.nombre}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            )}

            {(form.operacion === 'suma' || form.operacion === 'multiplicacion') && (
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Métricas</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1.5 bg-white dark:bg-white/5">
                  {metricas.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={form.metricas.includes(m.id)} onChange={() => toggleMetrica('metricas', m.id)} />
                      {m.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.operacion === 'resta' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Métrica base</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1.5 bg-white dark:bg-white/5">
                    {metricas.map((m) => (
                      <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="radio" name="resta-base" checked={form.restaBase === m.id} onChange={() => elegirBaseResta(m.id)} />
                        {m.nombre}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Restar estas métricas</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1.5 bg-white dark:bg-white/5">
                    {metricas.filter((m) => m.id !== form.restaBase).map((m) => (
                      <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={form.restaResto.includes(m.id)} onChange={() => toggleRestaResto(m.id)} />
                        {m.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Spinner state="working" /> : <Plus size={12} />}
                {editingId ? 'Guardar cambios' : 'Crear fórmula'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
