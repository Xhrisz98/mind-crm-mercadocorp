'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Layers, FileText, Send, History, Plus, Pencil, Trash2, Users, ShieldCheck,
  Eye, X, Mail,
} from 'lucide-react'
import { cn, formatDate, formatDateTime, ESTADO_LABELS, LEAD_SCORE_LABELS, LEAD_SCORE_OPTIONS } from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type {
  Rol, SegmentoEmail, SegmentoFiltros, PlantillaEmail, CampanaEmail, EstadoCampanaEmail,
  EstadoLead, Canal, UsuarioCRM,
} from '@/lib/types'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'
import Spinner from '@/components/ui/Spinner'
import ErrorState from '@/components/ui/ErrorState'

const CANAL_OPTIONS: Canal[] = ['whatsapp', 'telegram', 'messenger', 'instagram', 'web', 'presencial']
const CANAL_LABELS: Record<Canal, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', messenger: 'Messenger',
  instagram: 'Instagram', web: 'Web', presencial: 'Presencial',
}
const ESTADO_LEAD_OPTIONS = Object.keys(ESTADO_LABELS) as EstadoLead[]

const ESTADO_CAMPANA_LABELS: Record<EstadoCampanaEmail, string> = {
  borrador: 'Borrador',
  enviando: 'Enviando…',
  enviada: 'Enviada',
  error: 'Error',
}
const ESTADO_CAMPANA_COLORS: Record<EstadoCampanaEmail, string> = {
  borrador: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300',
  enviando: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  enviada: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  error: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
}

type SubTab = 'componer' | 'segmentos' | 'plantillas' | 'historial'

const SUBTABS: { key: SubTab; label: string; Icon: React.ElementType }[] = [
  { key: 'componer', label: 'Componer', Icon: Send },
  { key: 'segmentos', label: 'Segmentos', Icon: Layers },
  { key: 'plantillas', label: 'Plantillas', Icon: FileText },
  { key: 'historial', label: 'Historial', Icon: History },
]

const EMPTY_FILTROS: SegmentoFiltros = {}

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Filtros de segmento (compartido crear/editar) ─────────────────────────
function FiltrosForm({ filtros, onChange }: { filtros: SegmentoFiltros; onChange: (f: SegmentoFiltros) => void }) {
  const { data: usuariosData } = useSWR<{ usuarios: UsuarioCRM[] }>('/api/usuarios', fetcher)
  const vendedores = usuariosData?.usuarios ?? []

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado del lead</label>
        <select
          value={filtros.estado_lead ?? ''}
          onChange={(e) => onChange({ ...filtros, estado_lead: (e.target.value || undefined) as EstadoLead | undefined })}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos</option>
          {ESTADO_LEAD_OPTIONS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Canal</label>
        <select
          value={filtros.canal ?? ''}
          onChange={(e) => onChange({ ...filtros, canal: (e.target.value || undefined) as Canal | undefined })}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos</option>
          {CANAL_OPTIONS.map((c) => <option key={c} value={c}>{CANAL_LABELS[c]}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Lead score</label>
        <select
          value={filtros.lead_score ?? ''}
          onChange={(e) => onChange({ ...filtros, lead_score: (e.target.value || undefined) as SegmentoFiltros['lead_score'] })}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos</option>
          {LEAD_SCORE_OPTIONS.map((s) => <option key={s} value={s}>{LEAD_SCORE_LABELS[s]}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Vendedor asignado</label>
        <select
          value={filtros.vendedor_asignado_id ?? ''}
          onChange={(e) => onChange({ ...filtros, vendedor_asignado_id: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Primer contacto desde</label>
        <input type="date" value={filtros.contacto_desde ?? ''} onChange={(e) => onChange({ ...filtros, contacto_desde: e.target.value || undefined })} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Primer contacto hasta</label>
        <input type="date" value={filtros.contacto_hasta ?? ''} onChange={(e) => onChange({ ...filtros, contacto_hasta: e.target.value || undefined })} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
      </div>
    </div>
  )
}

// ── Sección: Segmentos ─────────────────────────────────────────────────────
function SegmentosSection() {
  const { data, error, isLoading, mutate } = useSWR<{ segmentos: SegmentoEmail[] }>('/api/segmentos-email', fetcher)
  const segmentos = data?.segmentos ?? []

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SegmentoEmail | null>(null)
  const [nombre, setNombre] = useState('')
  const [filtros, setFiltros] = useState<SegmentoFiltros>(EMPTY_FILTROS)
  const [saving, setSaving] = useState(false)
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const [countingLive, setCountingLive] = useState(false)
  const debouncedFiltros = useDebounced(filtros, 400)

  useEffect(() => {
    if (!showModal) return
    setCountingLive(true)
    fetch('/api/segmentos-email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filtros: debouncedFiltros }),
    })
      .then((r) => r.json())
      .then((json) => setLiveCount(json.count ?? 0))
      .catch(() => setLiveCount(null))
      .finally(() => setCountingLive(false))
  }, [debouncedFiltros, showModal])

  function openCreate() {
    setEditing(null)
    setNombre('')
    setFiltros(EMPTY_FILTROS)
    setLiveCount(null)
    setShowModal(true)
  }

  function openEdit(s: SegmentoEmail) {
    setEditing(s)
    setNombre(s.nombre)
    setFiltros(s.filtros)
    setLiveCount(null)
    setShowModal(true)
  }

  async function save() {
    if (!nombre.trim()) { toast.error('El nombre del segmento es requerido'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/segmentos-email/${editing.id}` : '/api/segmentos-email'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), filtros }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar segmento'); return }
      toast.success(editing ? 'Segmento actualizado' : 'Segmento creado')
      setShowModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  const [deleting, setDeleting] = useState<SegmentoEmail | null>(null)
  async function confirmDelete() {
    if (!deleting) return
    try {
      const res = await fetch(`/api/segmentos-email/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) { const json = await res.json().catch(() => ({})); toast.error(json.error || 'Error al eliminar'); return }
      toast.success('Segmento eliminado')
      setDeleting(null)
      await mutate()
    } catch { toast.error('Error de conexión') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Listas guardadas de contactos con email, reutilizables en campañas.</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0">
          <Plus size={15} /> Crear segmento
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : error ? (
        <ErrorState message="No se pudieron cargar los segmentos" onRetry={() => mutate()} />
      ) : segmentos.length === 0 ? (
        <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No hay segmentos guardados todavía
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segmentos.map((s) => (
            <div key={s.id} className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{s.nombre}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] rounded-lg transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setDeleting(s)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {s.filtros.estado_lead && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">{ESTADO_LABELS[s.filtros.estado_lead]}</span>}
                {s.filtros.canal && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">{CANAL_LABELS[s.filtros.canal]}</span>}
                {s.filtros.lead_score && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">{LEAD_SCORE_LABELS[s.filtros.lead_score]}</span>}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <ShieldCheck size={11} /> Con email registrado · creado {formatDate(s.fecha_creacion)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar segmento */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Editar segmento' : 'Crear segmento'}</h3>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre del segmento *</label>
                <input type="text" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. BlackBull activos con wallet" className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filtros (solo contactos con email registrado)</p>
              <FiltrosForm filtros={filtros} onChange={setFiltros} />

              <div className="flex items-center gap-2 mt-4 mb-5 px-3 py-2 bg-[#1B2B8C]/5 dark:bg-[#4A9FD8]/10 rounded-lg">
                <Users size={14} className="text-[#1B2B8C] dark:text-[#4A9FD8]" />
                <span className="text-sm text-[#1B2B8C] dark:text-[#4A9FD8] font-medium">
                  {countingLive ? 'Calculando…' : `${liveCount ?? 0} contactos cumplen estos filtros`}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">Cancelar</button>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50">
                  {saving ? <Spinner state="working" /> : null}
                  {editing ? 'Guardar cambios' : 'Crear segmento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal eliminar segmento */}
      <AnimatePresence>
        {deleting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">¿Eliminar segmento?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">&quot;{deleting.nombre}&quot; será eliminado permanentemente.</p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setDeleting(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                <button onClick={confirmDelete} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"><Trash2 size={14} />Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sección: Plantillas ─────────────────────────────────────────────────────
function PlantillasSection() {
  const { data, error, isLoading, mutate } = useSWR<{ plantillas: PlantillaEmail[] }>('/api/plantillas-email', fetcher)
  const plantillas = data?.plantillas ?? []

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PlantillaEmail | null>(null)
  const [nombre, setNombre] = useState('')
  const [asunto, setAsunto] = useState('')
  const [contenido, setContenido] = useState('')
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null); setNombre(''); setAsunto(''); setContenido(''); setShowModal(true)
  }
  function openEdit(p: PlantillaEmail) {
    setEditing(p); setNombre(p.nombre); setAsunto(p.asunto ?? ''); setContenido(p.contenido_html); setShowModal(true)
  }

  async function save() {
    if (!nombre.trim()) { toast.error('El nombre es requerido'); return }
    if (!contenido.trim()) { toast.error('El contenido HTML es requerido'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/plantillas-email/${editing.id}` : '/api/plantillas-email'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), asunto: asunto.trim(), contenido_html: contenido }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar plantilla'); return }
      toast.success(editing ? 'Plantilla actualizada' : 'Plantilla creada')
      setShowModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  const [deleting, setDeleting] = useState<PlantillaEmail | null>(null)
  async function confirmDelete() {
    if (!deleting) return
    try {
      const res = await fetch(`/api/plantillas-email/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) { const json = await res.json().catch(() => ({})); toast.error(json.error || 'Error al eliminar'); return }
      toast.success('Plantilla eliminada')
      setDeleting(null)
      await mutate()
    } catch { toast.error('Error de conexión') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Plantillas reutilizables de asunto + contenido HTML.</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0">
          <Plus size={15} /> Nueva plantilla
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : error ? (
        <ErrorState message="No se pudieron cargar las plantillas" onRetry={() => mutate()} />
      ) : plantillas.length === 0 ? (
        <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-10 text-center text-sm text-gray-500 dark:text-gray-400">No hay plantillas todavía</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map((p) => (
            <div key={p.id} className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{p.nombre}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] rounded-lg transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setDeleting(p)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{p.asunto || 'Sin asunto'}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Creada {formatDate(p.fecha_creacion)}</p>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre *</label>
                  <input type="text" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Asunto</label>
                  <input type="text" value={asunto} onChange={(e) => setAsunto(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Contenido HTML *</label>
                    <textarea rows={10} value={contenido} onChange={(e) => setContenido(e.target.value)} className="w-full text-xs font-mono px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Vista previa</label>
                    <iframe title="preview" sandbox="" srcDoc={contenido} className="w-full h-[236px] border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">Cancelar</button>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50">
                  {saving ? <Spinner state="working" /> : null}
                  {editing ? 'Guardar cambios' : 'Crear plantilla'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">¿Eliminar plantilla?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">&quot;{deleting.nombre}&quot; será eliminada permanentemente.</p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setDeleting(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                <button onClick={confirmDelete} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"><Trash2 size={14} />Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sección: Historial ──────────────────────────────────────────────────────
function HistorialSection({ brevoConfigurado, onEnviar }: { brevoConfigurado: boolean; onEnviar: (id: number) => Promise<void> }) {
  const { data, error, isLoading, mutate } = useSWR<{ campanas: CampanaEmail[] }>('/api/campanas-email', fetcher, { refreshInterval: 5000 })
  const campanas = data?.campanas ?? []
  const [enviandoId, setEnviandoId] = useState<number | null>(null)

  async function handleEnviar(id: number) {
    setEnviandoId(id)
    try { await onEnviar(id) }
    finally { setEnviandoId(null) }
  }

  if (isLoading) return <TableSkeleton rows={4} />
  if (error) return <ErrorState message="No se pudo cargar el historial de campañas" onRetry={() => mutate()} />
  if (campanas.length === 0) {
    return <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-10 text-center text-sm text-gray-500 dark:text-gray-400">Aún no se han creado campañas</div>
  }

  return (
    <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="border-b border-gray-50 dark:border-white/5">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campaña</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Destinatarios</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Enviados</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fallidos</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha</th>
            <th className="px-4 py-3 w-24" />
          </tr>
        </thead>
        <tbody>
          {campanas.map((c) => (
            <tr key={c.id} className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{c.nombre}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{c.asunto}</p>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.destinatarios_count}</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{c.enviados_count}</td>
              <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium">{c.fallidos_count}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', ESTADO_CAMPANA_COLORS[c.estado])}>
                  {ESTADO_CAMPANA_LABELS[c.estado]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                {c.fecha_envio ? formatDateTime(c.fecha_envio) : formatDateTime(c.fecha_creacion)}
              </td>
              <td className="px-4 py-3">
                {(c.estado === 'borrador' || c.estado === 'error') && (
                  <button
                    onClick={() => handleEnviar(c.id)}
                    disabled={!brevoConfigurado || enviandoId === c.id}
                    title={!brevoConfigurado ? 'Configura tu clave de Brevo en Configuración → Integraciones antes de enviar campañas' : undefined}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2B8C] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    {enviandoId === c.id ? <Spinner state="working" /> : <Send size={12} />}
                    Enviar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Sección: Componer ────────────────────────────────────────────────────────
function ComponerSection({ brevoConfigurado, onSent }: { brevoConfigurado: boolean; onSent: () => void }) {
  const { data: segmentosData } = useSWR<{ segmentos: SegmentoEmail[] }>('/api/segmentos-email', fetcher)
  const segmentos = segmentosData?.segmentos ?? []
  const { data: plantillasData } = useSWR<{ plantillas: PlantillaEmail[] }>('/api/plantillas-email', fetcher)
  const plantillas = plantillasData?.plantillas ?? []

  const [nombre, setNombre] = useState('')
  const [asunto, setAsunto] = useState('')
  const [contenido, setContenido] = useState('')
  const [segmentoId, setSegmentoId] = useState<string>('')

  const [showConfirm, setShowConfirm] = useState(false)
  const [resolviendo, setResolviendo] = useState(false)
  const [previewData, setPreviewData] = useState<{ count: number; sample: { nombre: string | null; email: string }[] } | null>(null)
  const [enviando, setEnviando] = useState(false)

  function usarPlantilla(id: string) {
    if (!id) return
    const p = plantillas.find((pl) => pl.id === Number(id))
    if (!p) return
    setAsunto(p.asunto ?? '')
    setContenido(p.contenido_html)
    toast.success(`Plantilla "${p.nombre}" cargada`)
  }

  function resetForm() {
    setNombre(''); setAsunto(''); setContenido(''); setSegmentoId('')
  }

  async function handleRevisar() {
    if (!nombre.trim()) { toast.error('El nombre interno es requerido'); return }
    if (!asunto.trim()) { toast.error('El asunto es requerido'); return }
    if (!contenido.trim()) { toast.error('El contenido es requerido'); return }
    if (!segmentoId) { toast.error('Selecciona un segmento'); return }

    setResolviendo(true)
    try {
      const res = await fetch('/api/campanas-email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmento_id: Number(segmentoId) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al resolver destinatarios'); return }
      setPreviewData(json)
      setShowConfirm(true)
    } catch { toast.error('Error de conexión') }
    finally { setResolviendo(false) }
  }

  async function handleConfirmarEnvio() {
    setEnviando(true)
    try {
      const body = { nombre: nombre.trim(), asunto: asunto.trim(), contenido_html: contenido, segmento_id: Number(segmentoId) }

      const createRes = await fetch('/api/campanas-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) { toast.error(createJson.error || 'Error al crear la campaña'); return }

      const enviarRes = await fetch('/api/campanas/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana_id: createJson.campana.id }),
      })
      const enviarJson = await enviarRes.json().catch(() => ({}))
      if (!enviarRes.ok) { toast.error(enviarJson.error || 'Error al enviar la campaña'); return }

      toast.success(`Campaña enviada: ${enviarJson.enviados} enviados, ${enviarJson.fallidos} fallidos`)
      setShowConfirm(false)
      resetForm()
      onSent()
    } catch { toast.error('Error de conexión') }
    finally { setEnviando(false) }
  }

  return (
    <div>
      {!brevoConfigurado && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl text-sm text-yellow-800 dark:text-yellow-400">
          Configura tu clave de Brevo en Configuración → Integraciones antes de enviar campañas
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre interno *</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Promo aniversario julio" className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Usar plantilla</label>
            <select onChange={(e) => usarPlantilla(e.target.value)} defaultValue="" className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100">
              <option value="">— Empezar desde cero —</option>
              {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Asunto *</label>
            <input type="text" value={asunto} onChange={(e) => setAsunto(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Contenido HTML *</label>
            <textarea rows={10} value={contenido} onChange={(e) => setContenido(e.target.value)} className="w-full text-xs font-mono px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Eye size={12} /> Vista previa</label>
          <iframe title="preview-composer" sandbox="" srcDoc={contenido} className="w-full h-[300px] border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 mb-4" />

          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Destinatarios</label>
          <select value={segmentoId} onChange={(e) => setSegmentoId(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 mb-3">
            <option value="">Selecciona un segmento…</option>
            {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
            <ShieldCheck size={12} /> Solo se envía a contactos con email registrado
          </p>

          <button
            onClick={handleRevisar}
            disabled={resolviendo || !brevoConfigurado}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resolviendo ? <Spinner state="searching" /> : <Send size={14} />}
            Revisar destinatarios y enviar
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && previewData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !enviando && setShowConfirm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-md p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Confirmar envío</h3>
                <button onClick={() => setShowConfirm(false)} disabled={enviando} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={16} /></button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Se enviará <strong>&quot;{asunto}&quot;</strong> a <strong>{previewData.count}</strong> destinatario{previewData.count !== 1 ? 's' : ''} con opt-in de email.
              </p>
              {previewData.sample.length > 0 && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto space-y-1">
                  {previewData.sample.map((d, i) => (
                    <p key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><Mail size={11} className="text-gray-500 dark:text-gray-400" />{d.nombre || d.email} {d.nombre && <span className="text-gray-500 dark:text-gray-400">({d.email})</span>}</p>
                  ))}
                  {previewData.count > previewData.sample.length && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">y {previewData.count - previewData.sample.length} más…</p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowConfirm(false)} disabled={enviando} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">Cancelar</button>
                <button onClick={handleConfirmarEnvio} disabled={enviando || previewData.count === 0} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50">
                  {enviando ? <Spinner state="working" /> : <Send size={14} />}
                  Confirmar y enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────
interface Props {
  userRol: Rol
}

export default function EmailMarketingTab(_props: Props) {
  const [subTab, setSubTab] = useState<SubTab>('componer')
  const { data: estadoData, mutate: mutateEstado } = useSWR<{ configurado: boolean }>('/api/configuracion/integraciones/estado', fetcher)
  const brevoConfigurado = estadoData?.configurado ?? false

  async function enviarCampanaExistente(id: number) {
    try {
      const res = await fetch('/api/campanas/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana_id: id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al enviar la campaña'); return }
      toast.success(`Campaña enviada: ${json.enviados} enviados, ${json.fallidos} fallidos`)
    } catch { toast.error('Error de conexión') }
  }

  return (
    <div>
      <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-0.5 mb-5 w-fit overflow-x-auto">
        {SUBTABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150',
              subTab === key ? 'bg-white dark:bg-midnight-surface text-[#1B2B8C] dark:text-[#4A9FD8] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {subTab === 'componer' && (
        <ComponerSection
          brevoConfigurado={brevoConfigurado}
          onSent={() => mutateEstado()}
        />
      )}
      {subTab === 'segmentos' && <SegmentosSection />}
      {subTab === 'plantillas' && <PlantillasSection />}
      {subTab === 'historial' && (
        <HistorialSection brevoConfigurado={brevoConfigurado} onEnviar={enviarCampanaExistente} />
      )}
    </div>
  )
}
