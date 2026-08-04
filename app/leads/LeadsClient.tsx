'use client'
import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import CanalIcon from '@/components/ui/CanalIcon'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import KanbanByEstado from '@/components/kanban/KanbanByEstado'
import KanbanByScore from '@/components/kanban/KanbanByScore'
import { cn, getLeadScoreDot, getContrastTextColor, LEAD_SCORE_LABELS, formatDate, ESTADO_LABELS } from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type { Contacto, EstadoLead, Canal, Rol, Etiqueta } from '@/lib/types'
import { Search, Filter, ChevronLeft, ChevronRight, Table2, Columns3, BarChart2, PauseCircle, Trash2, Download, Tag, UserPlus, LineChart } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

type Vista = 'tabla' | 'kanban_estado' | 'kanban_score'

const VISTAS: { key: Vista; label: string; Icon: React.ElementType }[] = [
  { key: 'tabla',         label: 'Tabla',             Icon: Table2    },
  { key: 'kanban_estado', label: 'Kanban por Estado', Icon: Columns3  },
  { key: 'kanban_score',  label: 'Kanban por Score',  Icon: BarChart2 },
]

const ESTADOS: EstadoLead[] = [
  'inicial', 'nuevo', 'contactado', 'interesado', 'en_atencion_humana', 'en_negociacion', 'cliente', 'perdido',
]
const CANALES: Canal[] = ['whatsapp', 'telegram', 'messenger', 'instagram', 'web']

const CANAL_ACTIVE_COLORS: Record<Canal, string> = {
  whatsapp: '#25D366',
  telegram: '#229ED9',
  messenger: '#0084FF',
  instagram: '#E1306C',
  web: '#4A9FD8',
  presencial: '#6B7280',
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: 8, transition: { duration: 0.15 } },
}

interface Props {
  userRol: Rol
  puedeEliminar: boolean
}

function readVista(searchParams: URLSearchParams): Vista {
  const v = searchParams.get('view')
  return v === 'kanban_estado' || v === 'kanban_score' ? v : 'tabla'
}

export default function LeadsClient({ userRol, puedeEliminar }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = userRol === 'admin'
  const canDelete = isAdmin || puedeEliminar
  const canExport = userRol === 'admin' || userRol === 'comercial'
  const canCreateManual = userRol === 'admin' || userRol === 'comercial'

  // View — inicializado desde la URL para restaurar la vista al volver del detalle de un lead
  const [vista, setVista] = useState<Vista>(() => readVista(searchParams))

  // Filters (shared across views) — también inicializados desde la URL
  const [q, setQ]           = useState(() => searchParams.get('q') ?? '')
  const [estado, setEstado] = useState(() => searchParams.get('estado') ?? '')
  const [canal, setCanal]   = useState(() => searchParams.get('canal') ?? '')
  const [desde, setDesde]   = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta]   = useState(() => searchParams.get('hasta') ?? '')
  const [etiquetaId, setEtiquetaId] = useState(() => searchParams.get('etiqueta_id') ?? '')
  const [page, setPage]     = useState(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10)
    return Number.isFinite(p) && p > 0 ? p : 1
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: etiquetasData } = useSWR<{ etiquetas: Etiqueta[] }>('/api/etiquetas', fetcher)
  const etiquetasCatalogo = etiquetasData?.etiquetas ?? []

  // Pause polling while drag is active
  const [dragging, setDragging] = useState(false)

  // Selección múltiple / eliminación masiva — solo admin
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Crear lead manualmente — admin y comercial
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCanal, setNewCanal] = useState<string>('whatsapp')

  // Exportar CSV — admin y comercial
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')
  const [exportCanal, setExportCanal] = useState('')
  const [exportEstado, setExportEstado] = useState('')

  useEffect(() => {
    setSelectedIds(new Set())
  }, [q, estado, canal, desde, hasta, etiquetaId, page])

  const isKanban = vista !== 'tabla'

  // Refleja vista y filtros en la URL (sin apilar historial) para que el botón
  // "atrás" del navegador, al volver desde el detalle de un lead, restaure
  // exactamente la vista y los filtros donde estaba el usuario.
  useEffect(() => {
    const params = new URLSearchParams()
    if (vista !== 'tabla') params.set('view', vista)
    if (q)          params.set('q', q)
    if (estado)     params.set('estado', estado)
    if (canal)      params.set('canal', canal)
    if (desde)      params.set('desde', desde)
    if (hasta)      params.set('hasta', hasta)
    if (etiquetaId) params.set('etiqueta_id', etiquetaId)
    if (!isKanban && page > 1) params.set('page', String(page))
    const qs = params.toString()
    router.replace(qs ? `/leads?${qs}` : '/leads', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, q, estado, canal, desde, hasta, etiquetaId, page, isKanban])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (q)     params.set('q',      q)
    if (estado) params.set('estado', estado)
    if (canal)  params.set('canal',  canal)
    if (desde)  params.set('desde',  desde)
    if (hasta)  params.set('hasta',  hasta)
    if (etiquetaId) params.set('etiqueta_id', etiquetaId)
    if (isKanban) {
      params.set('all',   '1')
    } else {
      params.set('page',  String(page))
      params.set('limit', '20')
    }
    return `/api/leads?${params}`
  }, [q, estado, canal, desde, hasta, etiquetaId, page, isKanban])

  const { data, error, isLoading, mutate } = useSWR<{ leads: Contacto[]; total: number }>(
    buildUrl(),
    fetcher,
    { refreshInterval: dragging ? 0 : 3000, keepPreviousData: true }
  )

  const leads      = data?.leads ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  function handleSearch(value: string) { setQ(value); setPage(1) }
  function handleFilter(key: 'estado' | 'canal', value: string) {
    if (key === 'estado') setEstado(value)
    else                  setCanal(value)
    setPage(1)
  }
  function handleDesde(value: string) { setDesde(value); setPage(1) }
  function handleHasta(value: string) { setHasta(value); setPage(1) }
  function handleEtiqueta(value: string) { setEtiquetaId(value); setPage(1) }
  function limpiarFiltros() {
    setEstado('')
    setCanal('')
    setDesde('')
    setHasta('')
    setEtiquetaId('')
    setPage(1)
  }
  function switchVista(v: Vista) {
    setVista(v)
    setPage(1)
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (leads.length > 0 && prev.size === leads.length) return new Set()
      return new Set(leads.map((l) => l.id))
    })
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds)
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar los leads'); return }
      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}`)
      setSelectedIds(new Set())
      setShowBulkDeleteModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setBulkDeleting(false) }
  }

  async function handleCreateLead() {
    const nombre = newNombre.trim()
    if (!nombre) {
      toast.error('El nombre es requerido')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/leads/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono: newTelefono.trim(),
          email: newEmail.trim(),
          canal: newCanal,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al crear el lead'); return }
      toast.success('Lead creado correctamente')
      setShowCreateModal(false)
      setNewNombre('')
      setNewTelefono('')
      setNewEmail('')
      setNewCanal('whatsapp')
      router.push(`/leads/${json.lead.id}`)
    } catch { toast.error('Error de conexión') }
    finally { setCreating(false) }
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (exportDesde)  params.set('desde',  exportDesde)
      if (exportHasta)  params.set('hasta',  exportHasta)
      if (exportCanal)  params.set('canal',  exportCanal)
      if (exportEstado) params.set('estado', exportEstado)

      const res = await fetch(`/api/leads/export?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error || 'Error al generar el CSV')
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `leads_bullpadel_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('CSV descargado')
      setShowExportModal(false)
    } catch { toast.error('Error de conexión') }
    finally { setExporting(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
            {!isLoading && (
              <span className="flex items-center gap-1 text-xs text-green-500 dark:text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                En vivo
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0 ? `${total.toLocaleString()} contacto${total !== 1 ? 's' : ''}` : 'Cargando…'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-0.5">
            {VISTAS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => switchVista(key)}
                title={label}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  vista === key
                    ? 'bg-white dark:bg-midnight-surface text-[#1B2B8C] dark:text-[#4A9FD8] shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
              showFilters
                ? 'bg-[#1B2B8C] text-white border-[#1B2B8C]'
                : 'bg-white dark:bg-midnight-surface text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
            )}
          >
            <Filter size={15} />
            Filtros
            {(estado || canal || desde || hasta || etiquetaId) && (
              <span className="w-2 h-2 rounded-full bg-[#CE142B]" />
            )}
          </button>

          {/* Métricas de leads */}
          <Link
            href="/leads/metricas"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-midnight-surface text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-150"
          >
            <LineChart size={15} />
            <span className="hidden sm:inline">Métricas</span>
          </Link>

          {/* Crear lead manualmente */}
          {canCreateManual && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
            >
              <UserPlus size={15} />
              Crear lead manualmente
            </button>
          )}

          {/* Export CSV button */}
          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-midnight-surface text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-150"
            >
              <Download size={15} />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email…"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all"
        />
      </div>

      {/* ── Filters panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white dark:bg-midnight-surface border border-gray-100 dark:border-midnight-border rounded-xl p-4 grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Estado</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFilter('estado', '')}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      !estado
                        ? 'bg-[#1B2B8C] text-white border-[#1B2B8C]'
                        : 'bg-white dark:bg-midnight-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    )}
                  >
                    Todos
                  </button>
                  {ESTADOS.map((e) => (
                    <button
                      key={e}
                      onClick={() => handleFilter('estado', e)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        estado === e
                          ? 'bg-[#1B2B8C] text-white border-[#1B2B8C]'
                          : 'bg-white dark:bg-midnight-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                      )}
                    >
                      {ESTADO_LABELS[e]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Canal</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFilter('canal', '')}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      !canal
                        ? 'bg-[#1B2B8C] text-white border-[#1B2B8C]'
                        : 'bg-white dark:bg-midnight-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    )}
                  >
                    Todos
                  </button>
                  {CANALES.map((c) => {
                    const active = canal === c
                    return (
                      <button
                        key={c}
                        onClick={() => handleFilter('canal', c)}
                        style={active ? { backgroundColor: CANAL_ACTIVE_COLORS[c] } : undefined}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                          active
                            ? 'text-white border-transparent'
                            : 'bg-white dark:bg-midnight-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        )}
                      >
                        <CanalIcon canal={c} size={13} showLabel monochrome={active} />
                      </button>
                    )
                  })}
                </div>
              </div>
              {etiquetasCatalogo.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Etiqueta</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEtiqueta('')}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        !etiquetaId
                          ? 'bg-[#1B2B8C] text-white border-[#1B2B8C]'
                          : 'bg-white dark:bg-midnight-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                      )}
                    >
                      Todas
                    </button>
                    {etiquetasCatalogo.map((et) => {
                      const active = etiquetaId === String(et.id)
                      return (
                        <button
                          key={et.id}
                          onClick={() => handleEtiqueta(String(et.id))}
                          style={active ? { backgroundColor: et.color, color: getContrastTextColor(et.color) } : undefined}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                            active
                              ? 'border-transparent'
                              : 'bg-white dark:bg-midnight-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                          )}
                        >
                          <Tag size={11} />
                          {et.nombre}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2 pt-3 border-t border-gray-50 dark:border-white/5 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Desde</p>
                  <input
                    type="date"
                    value={desde}
                    max={hasta || undefined}
                    onChange={(e) => handleDesde(e.target.value)}
                    className="text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hasta</p>
                  <input
                    type="date"
                    value={hasta}
                    min={desde || undefined}
                    onChange={(e) => handleHasta(e.target.value)}
                    className="text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                {(estado || canal || desde || hasta || etiquetaId) && (
                  <button
                    onClick={limpiarFiltros}
                    className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kanban por Estado ───────────────────────────────────── */}
      {vista === 'kanban_estado' && (
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="kb-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-64 h-64 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border animate-pulse" />
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div key="kb-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState message="No se pudieron cargar los leads" onRetry={() => mutate()} />
            </motion.div>
          ) : (
            <motion.div key="kb-estado" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <KanbanByEstado
                leads={leads}
                onLeadUpdated={() => mutate()}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Kanban por Score ────────────────────────────────────── */}
      {vista === 'kanban_score' && (
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="ks-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-64 h-64 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border animate-pulse" />
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div key="ks-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState message="No se pudieron cargar los leads" onRetry={() => mutate()} />
            </motion.div>
          ) : (
            <motion.div key="ks-score" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <KanbanByScore
                leads={leads}
                userRol={userRol}
                onLeadUpdated={() => mutate()}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Barra de acciones de selección ─────────────────────── */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-[#1B2B8C]/5 dark:bg-[#4A9FD8]/10 border border-[#1B2B8C]/20 dark:border-[#4A9FD8]/30 rounded-xl">
          <span className="text-sm font-medium text-[#1B2B8C] dark:text-[#4A9FD8]">
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Deseleccionar
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} />
            Eliminar seleccionados
          </button>
        </div>
      )}

      {/* ── Tabla ──────────────────────────────────────────────── */}
      {vista === 'tabla' && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-50 dark:border-white/5">
                  {canDelete && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && selectedIds.size === leads.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-[#1B2B8C] focus:ring-[#1B2B8C]/30 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Canal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Última interacción</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canDelete ? 7 : 6}><TableSkeleton rows={8} /></td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={canDelete ? 7 : 6}>
                      <ErrorState message="No se pudieron cargar los leads" onRetry={() => mutate()} />
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {leads.map((lead, i) => (
                      <motion.tr
                        key={lead.id}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50/70 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        {canDelete && (
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(lead.id)}
                              onChange={() => toggleSelect(lead.id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#1B2B8C] focus:ring-[#1B2B8C]/30 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${getLeadScoreDot(lead.lead_score)}`} />
                            <span className="font-medium">{LEAD_SCORE_LABELS[lead.lead_score]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#1B2B8C] dark:group-hover:text-[#4A9FD8] transition-colors">
                              {lead.nombre}
                            </p>
                            {lead.agente_pausado && (
                              <span title="Agente pausado">
                                <PauseCircle size={13} className="text-orange-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{lead.telefono || lead.email || '—'}</p>
                          {lead.etiquetas && lead.etiquetas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {lead.etiquetas.map((et) => (
                                <span
                                  key={et.id}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                  style={{ backgroundColor: et.color, color: getContrastTextColor(et.color) }}
                                >
                                  {et.nombre}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <CanalIcon canal={lead.canal} size={15} showLabel />
                        </td>
                        <td className="px-6 py-4">
                          <Badge estado={lead.estado_lead} />
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {lead.vendedor_nombre ?? <span className="text-empty">Sin asignar</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                          {formatDate(lead.fecha_ultima_interaccion)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {error ? (
              <ErrorState message="No se pudieron cargar los leads" onRetry={() => mutate()} />
            ) : isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-4 animate-pulse space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
                  </div>
                ))
              : leads.map((lead, i) => (
                  <motion.div
                    key={lead.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-4 cursor-pointer active:bg-gray-50 dark:active:bg-white/5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{lead.nombre}</p>
                          {lead.agente_pausado && (
                            <span title="Agente pausado">
                              <PauseCircle size={13} className="text-orange-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lead.telefono || lead.email || '—'}</p>
                      </div>
                      <Badge estado={lead.estado_lead} size="sm" />
                    </div>
                    {lead.etiquetas && lead.etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {lead.etiquetas.map((et) => (
                          <span
                            key={et.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: et.color, color: getContrastTextColor(et.color) }}
                          >
                            {et.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <CanalIcon canal={lead.canal} size={13} showLabel />
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${getLeadScoreDot(lead.lead_score)}`} />
                        Score: {LEAD_SCORE_LABELS[lead.lead_score]}
                      </span>
                      <span>•</span>
                      <span>{formatDate(lead.fecha_ultima_interaccion)}</span>
                    </div>
                  </motion.div>
                ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: crear lead manualmente */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !creating && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-md p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Crear lead manualmente</h3>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    autoFocus
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    placeholder="+593 99 123 4567"
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Canal principal</label>
                  <select
                    value={newCanal}
                    onChange={(e) => setNewCanal(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="messenger">Messenger</option>
                    <option value="instagram">Instagram</option>
                    <option value="telegram">Telegram</option>
                    <option value="web">Web</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateLead}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? <Spinner state="working" /> : <UserPlus size={14} />}
                  Crear lead
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: exportar leads a CSV */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !exporting && setShowExportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-md p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Exportar leads a CSV</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Desde</p>
                  <input
                    type="date"
                    value={exportDesde}
                    max={exportHasta || undefined}
                    onChange={(e) => setExportDesde(e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hasta</p>
                  <input
                    type="date"
                    value={exportHasta}
                    min={exportDesde || undefined}
                    onChange={(e) => setExportHasta(e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Canal</p>
                  <select
                    value={exportCanal}
                    onChange={(e) => setExportCanal(e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  >
                    <option value="">Todos</option>
                    {CANALES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado</p>
                  <select
                    value={exportEstado}
                    onChange={(e) => setExportEstado(e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
                  >
                    <option value="">Todos</option>
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={exporting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? <Spinner state="working" /> : <Download size={14} />}
                  Descargar CSV
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: eliminar leads seleccionados */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                ¿Eliminar {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''}?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={bulkDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={bulkDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDeleting ? <Spinner state="working" /> : <Trash2 size={14} />}
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
