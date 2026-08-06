'use client'
import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import ErrorState from '@/components/ui/ErrorState'
import Spinner from '@/components/ui/Spinner'
import KanbanTareas from '@/components/kanban/KanbanTareas'
import { fetcher } from '@/lib/fetcher'
import {
  cn, formatDate, ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, VISIBILIDAD_CLIENTE_LABELS,
  PRIORIDAD_TAREA_LABELS,
} from '@/lib/utils'
import type { Proyecto, Tarea, TareaEstado, UsuarioCRM, PrioridadTarea, VisibilidadCliente, EstadoProyecto, Rol } from '@/lib/types'
import { ArrowLeft, Plus, Trash2, Paperclip, ListChecks, AlertTriangle, CalendarClock } from 'lucide-react'

interface Props {
  proyectoId: number
  userRol: Rol
}

interface TareaFormState {
  titulo: string
  descripcion: string
  prioridad: PrioridadTarea
  asignado_a: number | null
  fecha_limite: string
  visible_cliente: boolean
}

const EMPTY_TAREA: TareaFormState = {
  titulo: '', descripcion: '', prioridad: 'media', asignado_a: null, fecha_limite: '', visible_cliente: true,
}

const PRIORIDAD_OPTIONS: PrioridadTarea[] = ['baja', 'media', 'alta', 'urgente']

function TareaModal({
  form, setForm, usuarios, canSetVisibilidad, canDelete, isEdit, saving, adjuntos, subiendoImagen,
  onClose, onSave, onDelete, onUploadImagen,
}: {
  form: TareaFormState
  setForm: React.Dispatch<React.SetStateAction<TareaFormState>>
  usuarios: UsuarioCRM[]
  canSetVisibilidad: boolean
  canDelete: boolean
  isEdit: boolean
  saving: boolean
  adjuntos: Tarea['adjuntos']
  subiendoImagen: boolean
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
  onUploadImagen: (file: File) => void
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
          {isEdit ? 'Editar tarea' : 'Nueva tarea'}
        </h3>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Título *</label>
            <input
              type="text"
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ej. Diseñar mockups de landing"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value as PrioridadTarea }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              >
                {PRIORIDAD_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PRIORIDAD_TAREA_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fecha límite</label>
              <input
                type="date"
                value={form.fecha_limite}
                onChange={(e) => setForm((f) => ({ ...f, fecha_limite: e.target.value }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Asignado a</label>
            <select
              value={form.asignado_a ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, asignado_a: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            >
              <option value="">Sin asignar</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          {canSetVisibilidad && (
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.visible_cliente}
                onChange={(e) => setForm((f) => ({ ...f, visible_cliente: e.target.checked }))}
                className="rounded border-gray-300 dark:border-white/20 text-[#1B2B8C] focus:ring-[#1B2B8C]/20"
              />
              Visible para el cliente en el portal
            </label>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Detalle de la tarea…"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all resize-none"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Adjuntos</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(adjuntos ?? []).map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                    {/* next/image no aplica: la URL viene de tareas_adjuntos.url, servida
                        dinámicamente desde el dominio del VPS de n8n (no configurable de
                        antemano en remotePatterns) — mismo caso que LeadDetailClient.tsx. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.nombre_archivo ?? 'Adjunto'} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B2B8C] dark:text-[#4A9FD8] cursor-pointer hover:underline">
                {subiendoImagen ? <Spinner state="working" /> : <Paperclip size={13} />}
                {subiendoImagen ? 'Subiendo…' : 'Adjuntar imagen'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  disabled={subiendoImagen}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onUploadImagen(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          )}
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
              {isEdit ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ProyectoDetailClient({ proyectoId, userRol }: Props) {
  const canSetVisibilidad = userRol === 'admin' || userRol === 'comercial'
  const canDeleteTarea = userRol === 'admin' || userRol === 'comercial'

  const [dragging, setDragging] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TareaFormState>(EMPTY_TAREA)
  const [saving, setSaving] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: proyectoData, error: proyectoError, mutate: mutateProyecto } = useSWR<{ proyecto: Proyecto }>(
    `/api/proyectos/${proyectoId}`, fetcher
  )
  const proyecto = proyectoData?.proyecto

  const { data: estadosData } = useSWR<{ estados: TareaEstado[] }>('/api/tareas-estados', fetcher)
  const estados = estadosData?.estados ?? []

  const { data: usuariosData } = useSWR<{ usuarios: UsuarioCRM[] }>('/api/usuarios?activos=1', fetcher)
  const usuarios = (usuariosData?.usuarios ?? []).filter((u) => u.rol !== 'cliente')

  const { data: tareasData, error: tareasError, isLoading: tareasLoading, mutate: mutateTareas } = useSWR<{ tareas: Tarea[] }>(
    `/api/proyectos/${proyectoId}/tareas`, fetcher, { refreshInterval: dragging ? 0 : 8000, keepPreviousData: true }
  )
  const tareas = tareasData?.tareas ?? []

  function refreshAll() {
    mutateTareas()
    mutateProyecto()
  }

  function openCreate() {
    setForm(EMPTY_TAREA)
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(tarea: Tarea) {
    setForm({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion ?? '',
      prioridad: tarea.prioridad,
      asignado_a: tarea.asignado_a,
      fecha_limite: tarea.fecha_limite ? tarea.fecha_limite.slice(0, 10) : '',
      visible_cliente: tarea.visible_cliente,
    })
    setEditingId(tarea.id)
    setShowModal(true)
  }

  const tareaEnEdicion = tareas.find((t) => t.id === editingId) ?? null

  async function handleSave() {
    const titulo = form.titulo.trim()
    if (!titulo) { toast.error('El título de la tarea es requerido'); return }
    setSaving(true)
    try {
      const payload = {
        titulo,
        descripcion: form.descripcion.trim() || null,
        prioridad: form.prioridad,
        asignado_a: form.asignado_a,
        fecha_limite: form.fecha_limite || null,
        ...(canSetVisibilidad ? { visible_cliente: form.visible_cliente } : {}),
      }
      const url = editingId ? `/api/tareas/${editingId}` : `/api/proyectos/${proyectoId}/tareas`
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar la tarea'); return }
      toast.success(editingId ? 'Tarea actualizada' : 'Tarea creada')
      setShowModal(false)
      refreshAll()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tareas/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar la tarea'); return }
      toast.success('Tarea eliminada')
      setDeleteTarget(null)
      setShowModal(false)
      refreshAll()
    } catch { toast.error('Error de conexión') }
    finally { setDeleting(false) }
  }

  // Mismo flujo que el chat de leads (LeadDetailClient.tsx): token de un solo
  // uso + subida directa al webhook público de n8n, sin pasar por una función
  // serverless de Vercel. No se toca /api/upload/token; el permiso de quién
  // puede adjuntar se valida en /api/tareas/[id]/adjuntos.
  async function handleUploadImagen(file: File) {
    if (!editingId) return
    setSubiendoImagen(true)
    try {
      const tokenRes = await fetch('/api/upload/token', { method: 'POST' })
      const tokenJson = await tokenRes.json().catch(() => ({}))
      if (!tokenRes.ok) { toast.error(tokenJson.error || 'No se pudo autorizar la subida'); return }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_token', tokenJson.token)
      const uploadRes = await fetch(process.env.NEXT_PUBLIC_N8N_UPLOAD_URL!, { method: 'POST', body: formData })
      const uploadJson = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok || !uploadJson.url) { toast.error('Error al subir la imagen'); return }

      const adjRes = await fetch(`/api/tareas/${editingId}/adjuntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uploadJson.url, nombre_archivo: file.name, tipo_mime: file.type }),
      })
      const adjJson = await adjRes.json().catch(() => ({}))
      if (!adjRes.ok) { toast.error(adjJson.error || 'Error al registrar el adjunto'); return }
      toast.success('Imagen adjuntada')
      refreshAll()
    } catch { toast.error('Error de conexión') }
    finally { setSubiendoImagen(false) }
  }

  async function handleUpdateProyecto(patch: Partial<Pick<Proyecto, 'estado' | 'visibilidad_cliente'>>) {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al actualizar el proyecto'); return }
      toast.success('Proyecto actualizado')
      mutateProyecto()
    } catch { toast.error('Error de conexión') }
  }

  if (proyectoError) {
    return <div className="p-6 lg:p-8"><ErrorState message="No se pudo cargar el proyecto" onRetry={() => mutateProyecto()} /></div>
  }

  return (
    <div className="p-6 lg:p-8">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors mb-3"
      >
        <ArrowLeft size={13} />
        Volver a Proyectos
      </Link>

      {proyecto && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{proyecto.nombre}</h1>
                <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', ESTADO_PROYECTO_COLORS[proyecto.estado])}>
                  {ESTADO_PROYECTO_LABELS[proyecto.estado]}
                </span>
              </div>
              {proyecto.cliente_nombre && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{proyecto.cliente_nombre}</p>
              )}
              {proyecto.descripcion && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{proyecto.descripcion}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <select
                value={proyecto.estado}
                onChange={(e) => handleUpdateProyecto({ estado: e.target.value as EstadoProyecto })}
                className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
              >
                {(['activo', 'pausado', 'completado', 'cancelado'] as EstadoProyecto[]).map((e) => (
                  <option key={e} value={e}>{ESTADO_PROYECTO_LABELS[e]}</option>
                ))}
              </select>
              {canSetVisibilidad && (
                <select
                  value={proyecto.visibilidad_cliente}
                  onChange={(e) => handleUpdateProyecto({ visibilidad_cliente: e.target.value as VisibilidadCliente })}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                >
                  {(['ninguna', 'resumen', 'completo'] as VisibilidadCliente[]).map((v) => (
                    <option key={v} value={v}>{VISIBILIDAD_CLIENTE_LABELS[v]}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <ListChecks size={15} className="text-[#1B2B8C] dark:text-[#4A9FD8]" />
              {proyecto.tareas_completadas ?? 0}/{proyecto.tareas_total ?? 0} tareas completadas
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <AlertTriangle size={15} className={(proyecto.tareas_vencidas ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'} />
              {proyecto.tareas_vencidas ?? 0} vencidas
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <CalendarClock size={15} className="text-gray-400" />
              {proyecto.proxima_fecha_limite ? `Próxima: ${formatDate(proyecto.proxima_fecha_limite)}` : 'Sin fechas próximas'}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          disabled={estados.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50"
        >
          <Plus size={15} />
          Nueva tarea
        </button>
      </div>

      {tareasError ? (
        <ErrorState message="No se pudieron cargar las tareas" onRetry={() => mutateTareas()} />
      ) : tareasLoading || estados.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-64 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border animate-pulse" />
          ))}
        </div>
      ) : (
        <KanbanTareas
          tareas={tareas}
          estados={estados}
          onTareaUpdated={refreshAll}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          onCardClick={openEdit}
        />
      )}

      <AnimatePresence>
        {showModal && (
          <TareaModal
            form={form}
            setForm={setForm}
            usuarios={usuarios}
            canSetVisibilidad={canSetVisibilidad}
            canDelete={canDeleteTarea}
            isEdit={editingId !== null}
            saving={saving}
            adjuntos={tareaEnEdicion?.adjuntos}
            subiendoImagen={subiendoImagen}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
            onDelete={() => tareaEnEdicion && setDeleteTarget(tareaEnEdicion)}
            onUploadImagen={handleUploadImagen}
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
                ¿Eliminar &ldquo;{deleteTarget.titulo}&rdquo;?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta acción no se puede deshacer.</p>
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
