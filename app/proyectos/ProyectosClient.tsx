'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import { CardSkeleton, MetricSkeleton } from '@/components/ui/SkeletonLoader'
import Spinner from '@/components/ui/Spinner'
import ContactoSearch from '@/components/ui/ContactoSearch'
import TareasPorEstadoBarChart from '@/components/charts/TareasPorEstadoBarChart'
import { fetcher } from '@/lib/fetcher'
import { formatDate, cn, ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, VISIBILIDAD_CLIENTE_LABELS } from '@/lib/utils'
import type { Proyecto, EstadoProyecto, VisibilidadCliente, Negocio, Rol } from '@/lib/types'
import { Plus, FolderKanban, ListChecks, AlertTriangle, TrendingUp, Trash2 } from 'lucide-react'

interface Props {
  userRol: Rol
  puedeEliminar: boolean
}

interface FormState {
  nombre: string
  cliente_id: number | null
  cliente_nombre: string
  negocio_id: number | null
  descripcion: string
  fecha_inicio: string
  fecha_fin_estimada: string
  estado: EstadoProyecto
  visibilidad_cliente: VisibilidadCliente
}

const EMPTY_FORM: FormState = {
  nombre: '',
  cliente_id: null,
  cliente_nombre: '',
  negocio_id: null,
  descripcion: '',
  fecha_inicio: '',
  fecha_fin_estimada: '',
  estado: 'activo',
  visibilidad_cliente: 'ninguna',
}

const ESTADO_OPTIONS: EstadoProyecto[] = ['activo', 'pausado', 'completado', 'cancelado']
const VISIBILIDAD_OPTIONS: VisibilidadCliente[] = ['ninguna', 'resumen', 'completo']

function KpiCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <Card className="p-5">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} ${color} mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </Card>
  )
}

function ProyectoModal({ form, setForm, negocios, canSetVisibilidad, isEdit, saving, onClose, onSave, onDelete, canDelete }: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  negocios: Negocio[]
  canSetVisibilidad: boolean
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
          {isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
        </h3>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre *</label>
            <input
              type="text"
              autoFocus
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Rediseño de identidad de marca"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Cliente</label>
            <ContactoSearch
              value={form.cliente_nombre}
              onSelect={(c) => setForm((f) => ({ ...f, cliente_id: c?.id ?? null, cliente_nombre: c?.nombre ?? '' }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Negocio vinculado</label>
            <select
              value={form.negocio_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, negocio_id: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            >
              <option value="">Sin negocio vinculado</option>
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fecha de inicio</label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fin estimado</label>
              <input
                type="date"
                value={form.fecha_fin_estimada}
                onChange={(e) => setForm((f) => ({ ...f, fecha_fin_estimada: e.target.value }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoProyecto }))}
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            >
              {ESTADO_OPTIONS.map((e) => (
                <option key={e} value={e}>{ESTADO_PROYECTO_LABELS[e]}</option>
              ))}
            </select>
          </div>

          {canSetVisibilidad && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Visibilidad en el portal de cliente</label>
              <select
                value={form.visibilidad_cliente}
                onChange={(e) => setForm((f) => ({ ...f, visibilidad_cliente: e.target.value as VisibilidadCliente }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              >
                {VISIBILIDAD_OPTIONS.map((v) => (
                  <option key={v} value={v}>{VISIBILIDAD_CLIENTE_LABELS[v]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Alcance del proyecto…"
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
              {isEdit ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ProyectosClient({ userRol, puedeEliminar }: Props) {
  const canSetVisibilidad = userRol === 'admin' || userRol === 'comercial'
  const canDelete = userRol === 'admin' || puedeEliminar

  const [clienteFiltro, setClienteFiltro] = useState<{ id: number; nombre: string } | null>(null)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoProyecto | ''>('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Proyecto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: negociosData } = useSWR<{ negocios: Negocio[] }>('/api/negocios', fetcher)
  const negocios = negociosData?.negocios ?? []

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (clienteFiltro) params.set('cliente_id', String(clienteFiltro.id))
    if (estadoFiltro) params.set('estado', estadoFiltro)
    return `/api/proyectos?${params}`
  }, [clienteFiltro, estadoFiltro])

  const { data, error, isLoading, mutate } = useSWR<{ proyectos: Proyecto[]; tareasPorEstado: { id: number; nombre: string; color: string; total: number }[] }>(
    buildUrl(),
    fetcher,
    { refreshInterval: 10000, keepPreviousData: true }
  )

  const proyectos = data?.proyectos ?? []
  const tareasPorEstado = data?.tareasPorEstado ?? []

  const proyectosActivos = proyectos.filter((p) => p.estado === 'activo').length
  const tareasVencidas = proyectos.reduce((sum, p) => sum + (p.tareas_vencidas ?? 0), 0)
  const avancesConTareas = proyectos.filter((p) => (p.tareas_total ?? 0) > 0)
  const avancePromedio = avancesConTareas.length > 0
    ? Math.round(
        avancesConTareas.reduce((sum, p) => sum + ((p.tareas_completadas ?? 0) / (p.tareas_total ?? 1)) * 100, 0) / avancesConTareas.length
      )
    : 0

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(proyecto: Proyecto) {
    setForm({
      nombre: proyecto.nombre,
      cliente_id: proyecto.cliente_id,
      cliente_nombre: proyecto.cliente_nombre ?? '',
      negocio_id: proyecto.negocio_id,
      descripcion: proyecto.descripcion ?? '',
      fecha_inicio: proyecto.fecha_inicio ? proyecto.fecha_inicio.slice(0, 10) : '',
      fecha_fin_estimada: proyecto.fecha_fin_estimada ? proyecto.fecha_fin_estimada.slice(0, 10) : '',
      estado: proyecto.estado,
      visibilidad_cliente: proyecto.visibilidad_cliente,
    })
    setEditingId(proyecto.id)
    setShowModal(true)
  }

  async function handleSave() {
    const nombre = form.nombre.trim()
    if (!nombre) { toast.error('El nombre del proyecto es requerido'); return }
    setSaving(true)
    try {
      const payload = {
        nombre,
        cliente_id: form.cliente_id,
        negocio_id: form.negocio_id,
        descripcion: form.descripcion.trim() || null,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin_estimada: form.fecha_fin_estimada || null,
        estado: form.estado,
        ...(canSetVisibilidad ? { visibilidad_cliente: form.visibilidad_cliente } : {}),
      }
      const url = editingId ? `/api/proyectos/${editingId}` : '/api/proyectos'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar el proyecto'); return }
      toast.success(editingId ? 'Proyecto actualizado' : 'Proyecto creado')
      setShowModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/proyectos/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar el proyecto'); return }
      toast.success('Proyecto eliminado')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proyectos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {proyectos.length > 0 ? `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''}` : 'Cargando…'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <Plus size={15} />
          Nuevo proyecto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <ContactoSearch
            value={clienteFiltro?.nombre ?? ''}
            placeholder="Filtrar por cliente…"
            onSelect={setClienteFiltro}
          />
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoProyecto | '')}
          className="text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
        >
          <option value="">Todos los estados</option>
          {ESTADO_OPTIONS.map((e) => (
            <option key={e} value={e}>{ESTADO_PROYECTO_LABELS[e]}</option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message="No se pudieron cargar los proyectos" onRetry={() => mutate()} />
      ) : isLoading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => <MetricSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <KpiCard icon={FolderKanban} label="Proyectos activos" value={String(proyectosActivos)} color="text-[#1B2B8C]" bg="bg-[#1B2B8C]/5" />
            <KpiCard icon={AlertTriangle} label="Tareas vencidas" value={String(tareasVencidas)} color="text-red-600" bg="bg-red-50 dark:bg-red-500/10" />
            <KpiCard icon={TrendingUp} label="Avance promedio" value={`${avancePromedio}%`} color="text-green-600" bg="bg-green-50 dark:bg-green-500/10" />
          </div>

          <Card className="p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              <ListChecks size={15} />
              Tareas por estado
            </h3>
            <TareasPorEstadoBarChart data={tareasPorEstado} />
          </Card>

          <AnimatePresence mode="wait">
            {proyectos.length === 0 ? (
              <Card className="p-10 text-center">
                <FolderKanban className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay proyectos con este filtro.</p>
              </Card>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {proyectos.map((p) => {
                  const total = p.tareas_total ?? 0
                  const completadas = p.tareas_completadas ?? 0
                  const avance = total > 0 ? Math.round((completadas / total) * 100) : 0
                  return (
                    <Card key={p.id} hover className="p-5">
                      <div onClick={() => openEdit(p)} className="cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{p.nombre}</h3>
                          <span className={cn('shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border', ESTADO_PROYECTO_COLORS[p.estado])}>
                            {ESTADO_PROYECTO_LABELS[p.estado]}
                          </span>
                        </div>
                        {p.cliente_nombre && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">{p.cliente_nombre}</p>
                        )}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>{completadas}/{total} tareas</span>
                            <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">{avance}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div className="h-full bg-[#1B2B8C] rounded-full transition-all duration-300" style={{ width: `${avance}%` }} />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {p.proxima_fecha_limite ? `Próxima fecha límite: ${formatDate(p.proxima_fecha_limite)}` : 'Sin fechas límite próximas'}
                        </p>
                      </div>
                      <Link
                        href={`/proyectos/${p.id}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#1B2B8C] dark:text-[#4A9FD8] hover:underline"
                      >
                        Ver tablero de tareas →
                      </Link>
                    </Card>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <ProyectoModal
            form={form}
            setForm={setForm}
            negocios={negocios}
            canSetVisibilidad={canSetVisibilidad}
            isEdit={editingId !== null}
            saving={saving}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
            onDelete={() => {
              const target = proyectos.find((p) => p.id === editingId)
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
