'use client'
import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import ErrorState from '@/components/ui/ErrorState'
import ContactoSearch from '@/components/ui/ContactoSearch'
import KanbanNegocios from '@/components/kanban/KanbanNegocios'
import { formatCurrency } from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type { Negocio, PipelineEstado, Rol, UsuarioCRM } from '@/lib/types'
import { Search, Plus, Trash2 } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

interface Props {
  userRol: Rol
  puedeEliminar: boolean
}

interface FormState {
  nombre: string
  monto: string
  contacto_id: number | null
  contacto_nombre: string
  descripcion_servicio: string
  fecha_cierre_estimada: string
  pipeline_estado_id: number | null
  vendedor_asignado_id: number | null
}

const EMPTY_FORM: FormState = {
  nombre: '',
  monto: '',
  contacto_id: null,
  contacto_nombre: '',
  descripcion_servicio: '',
  fecha_cierre_estimada: '',
  pipeline_estado_id: null,
  vendedor_asignado_id: null,
}

function NegocioModal({
  form, setForm, estados, vendedores, canAssignVendedor, isEdit, saving, onClose, onSave, onDelete, canDelete,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  estados: PipelineEstado[]
  vendedores: UsuarioCRM[]
  canAssignVendedor: boolean
  isEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
  canDelete: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          {isEdit ? 'Editar negocio' : 'Nuevo negocio'}
        </h3>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre del negocio *</label>
            <input
              type="text"
              autoFocus
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Campaña de rebranding Q3"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Monto (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                placeholder="0.00"
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fecha de cierre estimada</label>
              <input
                type="date"
                value={form.fecha_cierre_estimada}
                onChange={(e) => setForm((f) => ({ ...f, fecha_cierre_estimada: e.target.value }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Cliente</label>
            <ContactoSearch
              value={form.contacto_nombre}
              onSelect={(c) => setForm((f) => ({ ...f, contacto_id: c?.id ?? null, contacto_nombre: c?.nombre ?? '' }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Etapa del pipeline</label>
            <select
              value={form.pipeline_estado_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pipeline_estado_id: parseInt(e.target.value) }))}
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            >
              {estados.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          {canAssignVendedor && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Vendedor asignado</label>
              <select
                value={form.vendedor_asignado_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, vendedor_asignado_id: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              >
                <option value="">Sin asignar</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Descripción del servicio</label>
            <textarea
              value={form.descripcion_servicio}
              onChange={(e) => setForm((f) => ({ ...f, descripcion_servicio: e.target.value }))}
              rows={3}
              placeholder="Detalle del servicio a ofrecer…"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {isEdit && canDelete ? (
            <button
              onClick={onDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Spinner state="working" /> : <Plus size={14} />}
              {isEdit ? 'Guardar cambios' : 'Crear negocio'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function NegociosClient({ userRol, puedeEliminar }: Props) {
  const isAdmin = userRol === 'admin'
  const canDelete = isAdmin || puedeEliminar
  const canAssignVendedor = userRol === 'admin' || userRol === 'comercial'

  const [q, setQ] = useState('')
  const [dragging, setDragging] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Negocio | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: estadosData } = useSWR<{ estados: PipelineEstado[] }>('/api/pipeline-estados', fetcher)
  const estados = estadosData?.estados ?? []

  const { data: vendedoresData } = useSWR<{ usuarios: UsuarioCRM[] }>(
    canAssignVendedor ? '/api/usuarios?activos=1' : null,
    fetcher
  )
  const vendedores = vendedoresData?.usuarios ?? []

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    return `/api/negocios?${params}`
  }, [q])

  const { data, error, isLoading, mutate } = useSWR<{ negocios: Negocio[] }>(
    buildUrl(),
    fetcher,
    { refreshInterval: dragging ? 0 : 5000, keepPreviousData: true }
  )

  const negocios = data?.negocios ?? []
  const totalPipeline = negocios.reduce((sum, n) => sum + n.monto, 0)

  function openCreate() {
    setForm({ ...EMPTY_FORM, pipeline_estado_id: estados[0]?.id ?? null })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(negocio: Negocio) {
    setForm({
      nombre: negocio.nombre,
      monto: String(negocio.monto),
      contacto_id: negocio.contacto_id,
      contacto_nombre: negocio.contacto_nombre ?? '',
      descripcion_servicio: negocio.descripcion_servicio ?? '',
      fecha_cierre_estimada: negocio.fecha_cierre_estimada ? negocio.fecha_cierre_estimada.slice(0, 10) : '',
      pipeline_estado_id: negocio.pipeline_estado_id,
      vendedor_asignado_id: negocio.vendedor_asignado_id,
    })
    setEditingId(negocio.id)
    setShowModal(true)
  }

  async function handleSave() {
    const nombre = form.nombre.trim()
    if (!nombre) {
      toast.error('El nombre del negocio es requerido')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nombre,
        monto: form.monto ? parseFloat(form.monto) : 0,
        contacto_id: form.contacto_id,
        descripcion_servicio: form.descripcion_servicio.trim() || null,
        fecha_cierre_estimada: form.fecha_cierre_estimada || null,
        pipeline_estado_id: form.pipeline_estado_id,
        ...(canAssignVendedor ? { vendedor_asignado_id: form.vendedor_asignado_id } : {}),
      }
      const url = editingId ? `/api/negocios/${editingId}` : '/api/negocios'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar el negocio'); return }
      toast.success(editingId ? 'Negocio actualizado' : 'Negocio creado')
      setShowModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/negocios/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar el negocio'); return }
      toast.success('Negocio eliminado')
      setDeleteTarget(null)
      setShowModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Negocios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {negocios.length > 0
              ? `${negocios.length} negocio${negocios.length !== 1 ? 's' : ''} · ${formatCurrency(totalPipeline)} en pipeline`
              : 'Cargando…'}
          </p>
        </div>

        <button
          onClick={openCreate}
          disabled={estados.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50"
        >
          <Plus size={15} />
          Nuevo negocio
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          type="text"
          placeholder="Buscar negocio por nombre o cliente…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all"
        />
      </div>

      <AnimatePresence mode="wait">
        {isLoading || estados.length === 0 ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-64 h-64 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border animate-pulse" />
              ))}
            </div>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorState message="No se pudieron cargar los negocios" onRetry={() => mutate()} />
          </motion.div>
        ) : (
          <motion.div key="board" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <KanbanNegocios
              negocios={negocios}
              estados={estados}
              onNegocioUpdated={() => mutate()}
              onDragStart={() => setDragging(true)}
              onDragEnd={() => setDragging(false)}
              onCardClick={openEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <NegocioModal
            form={form}
            setForm={setForm}
            estados={estados}
            vendedores={vendedores}
            canAssignVendedor={canAssignVendedor}
            isEdit={editingId !== null}
            saving={saving}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
            onDelete={() => {
              const target = negocios.find((n) => n.id === editingId)
              if (target) setDeleteTarget(target)
            }}
            canDelete={canDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                ¿Eliminar &ldquo;{deleteTarget.nombre}&rdquo;?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? <Spinner state="working" /> : <Trash2 size={14} />}
                  Eliminar permanentemente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
