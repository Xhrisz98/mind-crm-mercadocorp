'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search, Filter, ChevronLeft, ChevronRight, Check, X, Wallet, Plus, Upload,
  Pencil, Trash2, UserCircle2,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type { ProgramaCliente, ProgramaClientesKpis, Rol, TipoCliente } from '@/lib/types'
import { MetricSkeleton, TableSkeleton } from '@/components/ui/SkeletonLoader'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import ErrorState from '@/components/ui/ErrorState'

const TIPO_LABELS: Record<TipoCliente, string> = {
  blackbull: 'BlackBull',
  gift_card: 'Gift Card',
}

function BoolIcon({ value }: { value: boolean }) {
  return value
    ? <Check size={15} className="text-green-600 dark:text-green-400" />
    : <X size={15} className="text-empty" />
}

interface Props {
  userRol: Rol
  selectedIds: Set<number>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>
}

interface ClienteFormState {
  tipo_cliente: TipoCliente
  nombre: string
  apellido: string
  telefono: string
  email: string
  opt_in_email: boolean
  opt_in_sms: boolean
  tiene_wallet: boolean
}

const EMPTY_FORM: ClienteFormState = {
  tipo_cliente: 'blackbull',
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
  opt_in_email: false,
  opt_in_sms: false,
  tiene_wallet: false,
}

export default function BaseClientesTab({ selectedIds, setSelectedIds }: Props) {
  const [tipoFiltro, setTipoFiltro] = useState<'' | TipoCliente>('')
  const [q, setQ] = useState('')
  const [activo, setActivo] = useState<'' | '1' | '0'>('')
  const [optInEmail, setOptInEmail] = useState<'' | '1' | '0'>('')
  const [tieneWallet, setTieneWallet] = useState<'' | '1' | '0'>('')
  const [signupDesde, setSignupDesde] = useState('')
  const [signupHasta, setSignupHasta] = useState('')
  const [accionDesde, setAccionDesde] = useState('')
  const [accionHasta, setAccionHasta] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [tipoFiltro, q, activo, optInEmail, tieneWallet, signupDesde, signupHasta, accionDesde, accionHasta])

  const { data: kpis, error: kpisError, isLoading: kpisLoading, mutate: mutateKpis } = useSWR<ProgramaClientesKpis>(
    '/api/programa-clientes/kpis',
    fetcher,
    { refreshInterval: 15000 }
  )

  function buildQuery() {
    const params = new URLSearchParams()
    if (tipoFiltro) params.set('tipo_cliente', tipoFiltro)
    if (q) params.set('q', q)
    if (activo) params.set('activo', activo)
    if (optInEmail) params.set('opt_in_email', optInEmail)
    if (tieneWallet) params.set('tiene_wallet', tieneWallet)
    if (signupDesde) params.set('signup_desde', signupDesde)
    if (signupHasta) params.set('signup_hasta', signupHasta)
    if (accionDesde) params.set('accion_desde', accionDesde)
    if (accionHasta) params.set('accion_hasta', accionHasta)
    params.set('page', String(page))
    params.set('limit', '20')
    return `/api/programa-clientes?${params}`
  }

  const { data, error, isLoading, mutate } = useSWR<{ clientes: ProgramaCliente[]; total: number }>(
    buildQuery(),
    fetcher,
    { keepPreviousData: true }
  )

  const clientes = data?.clientes ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const hayFiltros = !!(tipoFiltro || activo || optInEmail || tieneWallet || signupDesde || signupHasta || accionDesde || accionHasta)

  function limpiarFiltros() {
    setTipoFiltro('')
    setActivo('')
    setOptInEmail('')
    setTieneWallet('')
    setSignupDesde('')
    setSignupHasta('')
    setAccionDesde('')
    setAccionHasta('')
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
      if (clientes.length > 0 && clientes.every((c) => prev.has(c.id))) {
        const next = new Set(prev)
        clientes.forEach((c) => next.delete(c.id))
        return next
      }
      const next = new Set(prev)
      clientes.forEach((c) => next.add(c.id))
      return next
    })
  }

  // Agregar / editar cliente
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<ProgramaCliente | null>(null)
  const [form, setForm] = useState<ClienteFormState>(EMPTY_FORM)
  const [savingForm, setSavingForm] = useState(false)

  function openCreateModal() {
    setEditingCliente(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  function openEditModal(cliente: ProgramaCliente) {
    setEditingCliente(cliente)
    setForm({
      tipo_cliente: cliente.tipo_cliente,
      nombre: cliente.nombre ?? '',
      apellido: cliente.apellido ?? '',
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      opt_in_email: cliente.opt_in_email,
      opt_in_sms: cliente.opt_in_sms,
      tiene_wallet: cliente.tiene_wallet,
    })
    setShowFormModal(true)
  }

  async function saveForm() {
    if (!form.email.trim()) { toast.error('El email es requerido'); return }
    setSavingForm(true)
    try {
      const url = editingCliente ? `/api/programa-clientes/${editingCliente.id}` : '/api/programa-clientes'
      const method = editingCliente ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar cliente'); return }
      toast.success(editingCliente ? 'Cliente actualizado' : 'Cliente agregado')
      setShowFormModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSavingForm(false) }
  }

  // Eliminar cliente
  const [deletingCliente, setDeletingCliente] = useState<ProgramaCliente | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!deletingCliente) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/programa-clientes/${deletingCliente.id}`, { method: 'DELETE' })
      if (!res.ok) { const json = await res.json().catch(() => ({})); toast.error(json.error || 'Error al eliminar'); return }
      toast.success('Cliente eliminado')
      setDeletingCliente(null)
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deletingCliente.id); return next })
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setDeleting(false) }
  }

  // Carga de CSV
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadTipo, setUploadTipo] = useState<TipoCliente>('blackbull')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<{ rows: Record<string, unknown>[]; totalRows: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ insertados: number; actualizados: number; errores: number } | null>(null)

  function resetUploadModal() {
    setUploadFile(null)
    setPreview(null)
    setUploadResult(null)
    setUploadTipo('blackbull')
  }

  async function handlePreview() {
    if (!uploadFile) { toast.error('Selecciona un archivo CSV'); return }
    setPreviewing(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('tipo_cliente', uploadTipo)
      fd.append('mode', 'preview')
      const res = await fetch('/api/programa-clientes/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al leer el CSV'); return }
      setPreview({ rows: json.preview, totalRows: json.totalRows })
    } catch { toast.error('Error de conexión') }
    finally { setPreviewing(false) }
  }

  async function handleConfirmUpload() {
    if (!uploadFile) return
    setConfirming(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('tipo_cliente', uploadTipo)
      fd.append('mode', 'confirm')
      const res = await fetch('/api/programa-clientes/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al cargar el CSV'); return }
      setUploadResult({ insertados: json.insertados, actualizados: json.actualizados, errores: json.errores })
      toast.success('Carga completada')
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setConfirming(false) }
  }

  const kpiCards = [
    { label: 'BlackBull activos', value: kpis?.total_blackbull_activos ?? 0, suffix: '' },
    { label: 'Gift Card activos', value: kpis?.total_gift_card_activos ?? 0, suffix: '' },
    { label: 'Opt-in Email', value: kpis?.pct_opt_in_email ?? 0, suffix: '%' },
    { label: 'Opt-in SMS', value: kpis?.pct_opt_in_sms ?? 0, suffix: '%' },
    { label: 'Con Wallet', value: kpis?.pct_wallet ?? 0, suffix: '%' },
    { label: 'Nuevos este mes', value: kpis?.nuevos_este_mes ?? 0, suffix: '' },
    { label: 'Inactivos +90 días', value: kpis?.inactivos_90_dias ?? 0, suffix: '' },
  ]

  return (
    <div>
      {/* KPIs */}
      {kpisLoading ? (
        <div className="mb-6"><MetricSkeleton /></div>
      ) : kpisError ? (
        <div className="mb-6"><ErrorState message="No se pudieron cargar los KPIs" onRetry={() => mutateKpis()} /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
          {kpiCards.map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">{k.label}</p>
              <p className="text-xl font-bold text-[#1B2B8C]">{k.value}{k.suffix}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-0.5 w-fit">
          {(['', 'blackbull', 'gift_card'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                tipoFiltro === t ? 'bg-white dark:bg-midnight-surface text-[#1B2B8C] dark:text-[#4A9FD8] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {t === '' ? 'Todos' : TIPO_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
              showFilters ? 'bg-[#1B2B8C] text-white border-[#1B2B8C]' : 'bg-white dark:bg-midnight-surface text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
            )}
          >
            <Filter size={15} />
            Filtros
            {hayFiltros && <span className="w-2 h-2 rounded-full bg-[#CE142B]" />}
          </button>
          <button
            onClick={() => { resetUploadModal(); setShowUploadModal(true) }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-midnight-surface text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-150"
          >
            <Upload size={15} />
            Cargar CSV
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <Plus size={15} />
            Agregar cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all"
        />
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white dark:bg-midnight-surface border border-gray-100 dark:border-midnight-border rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Activo</p>
                <select value={activo} onChange={(e) => setActivo(e.target.value as '' | '1' | '0')} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100">
                  <option value="">Todos</option>
                  <option value="1">Activos</option>
                  <option value="0">Inactivos</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Opt-in Email</p>
                <select value={optInEmail} onChange={(e) => setOptInEmail(e.target.value as '' | '1' | '0')} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100">
                  <option value="">Todos</option>
                  <option value="1">Con opt-in</option>
                  <option value="0">Sin opt-in</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Wallet</p>
                <select value={tieneWallet} onChange={(e) => setTieneWallet(e.target.value as '' | '1' | '0')} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100">
                  <option value="">Todos</option>
                  <option value="1">Con wallet</option>
                  <option value="0">Sin wallet</option>
                </select>
              </div>
              <div />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Registro desde</p>
                <input type="date" value={signupDesde} onChange={(e) => setSignupDesde(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Registro hasta</p>
                <input type="date" value={signupHasta} onChange={(e) => setSignupHasta(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Última actividad desde</p>
                <input type="date" value={accionDesde} onChange={(e) => setAccionDesde(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Última actividad hasta</p>
                <input type="date" value={accionHasta} onChange={(e) => setAccionHasta(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
              </div>
              {hayFiltros && (
                <div className="lg:col-span-4">
                  <button onClick={limpiarFiltros} className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selección */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-[#1B2B8C]/5 dark:bg-[#4A9FD8]/10 border border-[#1B2B8C]/20 dark:border-[#4A9FD8]/30 rounded-xl">
          <span className="text-sm font-medium text-[#1B2B8C] dark:text-[#4A9FD8]">
            {selectedIds.size} cliente{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Disponibles para Email Marketing</span>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="hidden md:block bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-50 dark:border-white/5">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={clientes.length > 0 && clientes.every((c) => selectedIds.has(c.id))}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#1B2B8C] focus:ring-[#1B2B8C]/30 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Activo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SMS</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wallet</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Últ. actividad</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={12}><TableSkeleton rows={8} /></td></tr>
            ) : error ? (
              <tr><td colSpan={12}><ErrorState message="No se pudo cargar la base de clientes" onRetry={() => mutate()} /></td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Sin clientes registrados</td></tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#1B2B8C] focus:ring-[#1B2B8C]/30 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {[c.nombre, c.apellido].filter(Boolean).join(' ') || <span className="text-empty italic font-normal">Sin nombre</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.telefono || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">
                      {TIPO_LABELS[c.tipo_cliente]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                      c.activo ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                    )}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><div className="flex justify-center"><BoolIcon value={c.opt_in_email} /></div></td>
                  <td className="px-4 py-3"><div className="flex justify-center"><BoolIcon value={c.opt_in_sms} /></div></td>
                  <td className="px-4 py-3"><div className="flex justify-center">{c.tiene_wallet ? <Wallet size={15} className="text-[#1B2B8C] dark:text-[#4A9FD8]" /> : <X size={15} className="text-empty" />}</div></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(c.fecha_signup)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(c.fecha_ultima_accion)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(c)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] hover:bg-[#1B2B8C]/5 dark:hover:bg-[#4A9FD8]/10 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeletingCliente(c)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-4 animate-pulse space-y-2">
              <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
              <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
            </div>
          ))
        ) : error ? (
          <ErrorState message="No se pudo cargar la base de clientes" onRetry={() => mutate()} />
        ) : clientes.length === 0 ? (
          <p className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Sin clientes registrados</p>
        ) : (
          clientes.map((c) => (
            <div key={c.id} className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-[#1B2B8C] focus:ring-[#1B2B8C]/30 cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {[c.nombre, c.apellido].filter(Boolean).join(' ') || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.email || c.telefono || '—'}</p>
                  </div>
                </div>
                <span className={cn(
                  'inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                  c.activo ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                )}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">{TIPO_LABELS[c.tipo_cliente]}</span>
                <span>Email {c.opt_in_email ? '✓' : '✗'}</span>
                <span>SMS {c.opt_in_sms ? '✓' : '✗'}</span>
                <span>Wallet {c.tiene_wallet ? '✓' : '✗'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Registro: {formatDate(c.fecha_signup)}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(c)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setDeletingCliente(c)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Página {page} de {totalPages} · {total} clientes</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: agregar/editar cliente */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !savingForm && setShowFormModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {editingCliente ? 'Editar cliente' : 'Agregar cliente'}
              </h3>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tipo de cliente *</label>
                  <select
                    value={form.tipo_cliente}
                    onChange={(e) => setForm({ ...form, tipo_cliente: e.target.value as TipoCliente })}
                    disabled={!!editingCliente}
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-gray-500"
                  >
                    <option value="blackbull">BlackBull</option>
                    <option value="gift_card">Gift Card</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre</label>
                    <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Apellido</label>
                    <input type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.opt_in_email} onChange={(e) => setForm({ ...form, opt_in_email: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-[#1B2B8C]" />
                    Opt-in Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.opt_in_sms} onChange={(e) => setForm({ ...form, opt_in_sms: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-[#1B2B8C]" />
                    Opt-in SMS
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.tiene_wallet} onChange={(e) => setForm({ ...form, tiene_wallet: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-[#1B2B8C]" />
                    Tiene Wallet
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowFormModal(false)} disabled={savingForm} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={saveForm} disabled={savingForm} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50">
                  {savingForm ? <Spinner state="working" /> : <UserCircle2 size={14} />}
                  {editingCliente ? 'Guardar cambios' : 'Agregar cliente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: eliminar cliente */}
      <AnimatePresence>
        {deletingCliente && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !deleting && setDeletingCliente(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">¿Eliminar cliente?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {deletingCliente.nombre || deletingCliente.email} será eliminado permanentemente.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setDeletingCliente(null)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={confirmDelete} disabled={deleting} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleting ? <Spinner state="working" /> : <Trash2 size={14} />}
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: cargar CSV */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !previewing && !confirming && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Cargar clientes desde CSV</h3>

              {!uploadResult ? (
                <>
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tipo de programa para este lote *</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="radio" name="upload-tipo" checked={uploadTipo === 'blackbull'} onChange={() => setUploadTipo('blackbull')} className="text-[#1B2B8C]" />
                        BlackBull
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="radio" name="upload-tipo" checked={uploadTipo === 'gift_card'} onChange={() => setUploadTipo('gift_card')} className="text-[#1B2B8C]" />
                        Gift Card
                      </label>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Archivo CSV *</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => { setUploadFile(e.target.files?.[0] ?? null); setPreview(null) }}
                      className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-white/10 file:text-sm file:font-medium file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-white/20"
                    />
                  </div>

                  {preview && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Vista previa (primeras {preview.rows.length} de {preview.totalRows} filas)
                      </p>
                      <div className="overflow-x-auto border border-gray-100 dark:border-white/10 rounded-lg">
                        <table className="w-full text-xs min-w-[600px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-white/5">
                              <th className="px-2 py-1.5 text-left">Nombre</th>
                              <th className="px-2 py-1.5 text-left">Email</th>
                              <th className="px-2 py-1.5 text-left">Teléfono</th>
                              <th className="px-2 py-1.5 text-left">Opt-in Email</th>
                              <th className="px-2 py-1.5 text-left">Wallet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.map((r, i) => (
                              <tr key={i} className="border-t border-gray-50 dark:border-white/5">
                                <td className="px-2 py-1.5">{[r.nombre, r.apellido].filter(Boolean).join(' ') || '—'}</td>
                                <td className="px-2 py-1.5">{String(r.email ?? '—')}</td>
                                <td className="px-2 py-1.5">{String(r.telefono ?? '—')}</td>
                                <td className="px-2 py-1.5">{r.opt_in_email ? 'Sí' : 'No'}</td>
                                <td className="px-2 py-1.5">{r.tiene_wallet ? 'Sí' : 'No'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setShowUploadModal(false)} disabled={previewing || confirming} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
                      Cancelar
                    </button>
                    {!preview ? (
                      <button onClick={handlePreview} disabled={!uploadFile || previewing} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50">
                        {previewing ? <Spinner state="searching" /> : null}
                        Vista previa
                      </button>
                    ) : (
                      <button onClick={handleConfirmUpload} disabled={confirming} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50">
                        {confirming ? <Spinner state="working" /> : <Upload size={14} />}
                        Confirmar carga ({preview.totalRows} filas)
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{uploadResult.insertados}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Insertados</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{uploadResult.actualizados}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">Actualizados</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{uploadResult.errores}</p>
                      <p className="text-xs text-red-600 dark:text-red-500">Errores</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => { setShowUploadModal(false); resetUploadModal() }} className="px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]">
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
