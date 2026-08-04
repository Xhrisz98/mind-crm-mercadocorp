'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import ContactoSearch from '@/components/ui/ContactoSearch'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import GastoPorCampanaBarChart from '@/components/charts/GastoPorCampanaBarChart'
import MetricasTemporalesChart from '@/components/charts/MetricasTemporalesChart'
import {
  cn, formatCurrency, formatDate,
  PLATAFORMA_ADS_LABELS, ESTADO_CAMPANA_PUBLICIDAD_LABELS, ESTADO_CAMPANA_PUBLICIDAD_COLORS,
  OBJETIVO_CAMPANA_LABELS, OBJETIVO_KPI_DESTACADO,
} from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type {
  CampanaPublicidad, CampanaMetricaDiaria, CampanaMetricaPorFecha,
  PlataformaAds, EstadoCampanaPublicidad, ObjetivoCampana, Rol,
} from '@/lib/types'
import { Plus, Search, Pencil, Trash2, BarChart3, X, Info } from 'lucide-react'

interface Props {
  userRol: Rol
  puedeEliminar: boolean
}

interface FormState {
  nombre: string
  plataforma: PlataformaAds
  cliente_id: number | null
  cliente_nombre: string
  objetivo: ObjetivoCampana | ''
  presupuesto: string
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoCampanaPublicidad
}

const EMPTY_FORM: FormState = {
  nombre: '',
  plataforma: 'google',
  cliente_id: null,
  cliente_nombre: '',
  objetivo: '',
  presupuesto: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'activa',
}

const ESTADO_OPTIONS: EstadoCampanaPublicidad[] = ['activa', 'pausada', 'finalizada']
const PLATAFORMA_OPTIONS: PlataformaAds[] = ['google', 'meta']
const OBJETIVO_OPTIONS: ObjetivoCampana[] = ['reconocimiento', 'trafico', 'conversion']

function CampanaModal({ form, setForm, isEdit, saving, onClose, onSave }: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  isEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: () => void
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
          {isEdit ? 'Editar campaña de publicidad' : 'Nueva campaña de publicidad'}
        </h3>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre *</label>
            <input
              type="text"
              autoFocus
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Lanzamiento Q3 - Instagram Ads"
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Plataforma</label>
              <select
                value={form.plataforma}
                onChange={(e) => setForm((f) => ({ ...f, plataforma: e.target.value as PlataformaAds }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              >
                {PLATAFORMA_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PLATAFORMA_ADS_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Presupuesto (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.presupuesto}
                onChange={(e) => setForm((f) => ({ ...f, presupuesto: e.target.value }))}
                placeholder="0.00"
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Cliente</label>
            <ContactoSearch
              value={form.cliente_nombre}
              onSelect={(c) => setForm((f) => ({ ...f, cliente_id: c?.id ?? null, cliente_nombre: c?.nombre ?? '' }))}
            />
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
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fecha de fin</label>
              <input
                type="date"
                value={form.fecha_fin}
                min={form.fecha_inicio || undefined}
                onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoCampanaPublicidad }))}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
              >
                {ESTADO_OPTIONS.map((e) => (
                  <option key={e} value={e}>{ESTADO_CAMPANA_PUBLICIDAD_LABELS[e]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Objetivo</label>
            <select
              value={form.objetivo}
              onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value as ObjetivoCampana | '' }))}
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
            >
              <option value="">Sin objetivo definido</option>
              {OBJETIVO_OPTIONS.map((o) => (
                <option key={o} value={o}>{OBJETIVO_CAMPANA_LABELS[o]}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Determina qué KPI se destaca en el detalle de la campaña.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
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
            {isEdit ? 'Guardar cambios' : 'Crear campaña'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function KpiCard({ label, value, highlighted, footnote }: {
  label: string
  value: string
  highlighted: boolean
  footnote?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        highlighted
          ? 'border-[#1B2B8C]/30 dark:border-[#4A9FD8]/40 bg-[#1B2B8C]/5 dark:bg-[#4A9FD8]/10 ring-1 ring-[#1B2B8C]/20 dark:ring-[#4A9FD8]/30'
          : 'border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]'
      )}
    >
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', highlighted ? 'text-[#1B2B8C] dark:text-[#4A9FD8]' : 'text-gray-900 dark:text-gray-100')}>
        {value}
      </p>
      {footnote && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-start gap-1">
          <Info size={10} className="shrink-0 mt-0.5" />
          {footnote}
        </p>
      )}
    </div>
  )
}

function MetricasModal({ campana, onClose }: { campana: CampanaPublicidad; onClose: () => void }) {
  const { data, mutate } = useSWR<{ campana: CampanaPublicidad; metricas: CampanaMetricaDiaria[] }>(
    `/api/campanas-publicidad/${campana.id}`,
    fetcher
  )
  const metricas = data?.metricas ?? []
  const c = data?.campana ?? campana

  const destacados = c.objetivo ? OBJETIVO_KPI_DESTACADO[c.objetivo] : []
  const ctr = c.impresiones_total > 0 ? `${((c.clics_total / c.impresiones_total) * 100).toFixed(1)}%` : '—'
  const cpc = c.clics_total > 0 ? formatCurrency(c.gasto_total / c.clics_total) : '—'
  const cpa = c.conversiones_total > 0 ? formatCurrency(c.gasto_total / c.conversiones_total) : '—'
  const roi = c.roi_estimado_pct != null ? `${c.roi_estimado_pct > 0 ? '+' : ''}${c.roi_estimado_pct}%` : 'Sin cliente vinculado'

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [impresiones, setImpresiones] = useState('')
  const [clics, setClics] = useState('')
  const [conversiones, setConversiones] = useState('')
  const [gasto, setGasto] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAgregar() {
    setSaving(true)
    try {
      const res = await fetch(`/api/campanas-publicidad/${campana.id}/metricas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          impresiones: impresiones || 0,
          clics: clics || 0,
          conversiones: conversiones || 0,
          gasto: gasto || 0,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al registrar la métrica'); return }
      toast.success('Métrica registrada')
      setImpresiones(''); setClics(''); setConversiones(''); setGasto('')
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
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
        className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Métricas — {campana.nombre}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        {c.objetivo && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Objetivo: <span className="font-medium">{OBJETIVO_CAMPANA_LABELS[c.objetivo]}</span> — se destaca el KPI relevante para ese objetivo
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <KpiCard label="CTR" value={ctr} highlighted={destacados.includes('ctr')} />
          <KpiCard label="CPC" value={cpc} highlighted={destacados.includes('cpc')} />
          <KpiCard label="Costo por conversión" value={cpa} highlighted={destacados.includes('cpa')} />
          <KpiCard
            label="ROI estimado"
            value={roi}
            highlighted={destacados.includes('roi')}
            footnote="Estimado por rango de fechas y cliente vinculado — no es atribución exacta por campaña."
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Impresiones</label>
            <input type="number" min="0" value={impresiones} onChange={(e) => setImpresiones(e.target.value)} placeholder="0" className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Clics</label>
            <input type="number" min="0" value={clics} onChange={(e) => setClics(e.target.value)} placeholder="0" className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Conversiones</label>
            <input type="number" min="0" value={conversiones} onChange={(e) => setConversiones(e.target.value)} placeholder="0" className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Gasto (USD)</label>
            <input type="number" min="0" step="0.01" value={gasto} onChange={(e) => setGasto(e.target.value)} placeholder="0.00" className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="col-span-2 sm:col-span-5 flex justify-end">
            <button
              onClick={handleAgregar}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Spinner state="working" /> : <Plus size={12} />}
              Registrar día
            </button>
          </div>
        </div>

        {metricas.length === 0 ? (
          <p className="text-xs text-empty text-center py-8">Aún no hay métricas registradas para esta campaña</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-50 dark:border-white/5">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Impresiones</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Clics</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Conversiones</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gasto</th>
                </tr>
              </thead>
              <tbody>
                {metricas.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDate(m.fecha)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{m.impresiones.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{m.clics.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{m.conversiones.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{formatCurrency(m.gasto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function PublicidadClient({ userRol, puedeEliminar }: Props) {
  const canDelete = userRol === 'admin' || puedeEliminar
  const [q, setQ] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [plataformaFiltro, setPlataformaFiltro] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [metricasCampana, setMetricasCampana] = useState<CampanaPublicidad | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CampanaPublicidad | null>(null)
  const [deleting, setDeleting] = useState(false)

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (estadoFiltro) params.set('estado', estadoFiltro)
  if (plataformaFiltro) params.set('plataforma', plataformaFiltro)

  const { data, error, isLoading, mutate } = useSWR<{ campanas: CampanaPublicidad[]; serie_temporal: CampanaMetricaPorFecha[] }>(
    `/api/campanas-publicidad?${params}`,
    fetcher
  )
  const campanas = data?.campanas ?? []
  const serieTemporal = data?.serie_temporal ?? []

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(c: CampanaPublicidad) {
    setForm({
      nombre: c.nombre,
      plataforma: c.plataforma,
      cliente_id: c.cliente_id,
      cliente_nombre: c.cliente_nombre ?? '',
      objetivo: c.objetivo ?? '',
      presupuesto: c.presupuesto != null ? String(c.presupuesto) : '',
      fecha_inicio: c.fecha_inicio ? c.fecha_inicio.slice(0, 10) : '',
      fecha_fin: c.fecha_fin ? c.fecha_fin.slice(0, 10) : '',
      estado: c.estado,
    })
    setEditingId(c.id)
    setShowModal(true)
  }

  async function handleSave() {
    const nombre = form.nombre.trim()
    if (!nombre) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nombre,
        plataforma: form.plataforma,
        cliente_id: form.cliente_id,
        objetivo: form.objetivo || null,
        presupuesto: form.presupuesto || null,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      }
      if (editingId) payload.estado = form.estado

      const url = editingId ? `/api/campanas-publicidad/${editingId}` : '/api/campanas-publicidad'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar la campaña'); return }
      toast.success(editingId ? 'Campaña actualizada' : 'Campaña creada')
      setShowModal(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/campanas-publicidad/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar la campaña'); return }
      toast.success('Campaña eliminada')
      setDeleteTarget(null)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campañas de Publicidad</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Registro manual de campañas en Google Ads y Meta Ads</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Gasto por campaña</h3>
          <GastoPorCampanaBarChart
            data={campanas.map((c) => ({ nombre: c.nombre, gasto: c.gasto_total }))}
            loading={isLoading}
          />
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Impresiones, clics y conversiones</h3>
          <MetricasTemporalesChart data={serieTemporal} loading={isLoading} />
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={plataformaFiltro}
            onChange={(e) => setPlataformaFiltro(e.target.value)}
            className="text-sm px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todas las plataformas</option>
            {PLATAFORMA_OPTIONS.map((p) => <option key={p} value={p}>{PLATAFORMA_ADS_LABELS[p]}</option>)}
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="text-sm px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS.map((e) => <option key={e} value={e}>{ESTADO_CAMPANA_PUBLICIDAD_LABELS[e]}</option>)}
          </select>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-[#1B2B8C] text-white hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nueva campaña</span>
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message="No se pudieron cargar las campañas de publicidad" onRetry={() => mutate()} />
      ) : isLoading ? (
        <TableSkeleton rows={5} />
      ) : campanas.length === 0 ? (
        <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Aún no se han registrado campañas de publicidad
        </div>
      ) : (
        <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-50 dark:border-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campaña</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gasto / Presupuesto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Clics / CTR</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {campanas.map((c) => {
                const ctr = c.impresiones_total > 0 ? ((c.clics_total / c.impresiones_total) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{c.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {PLATAFORMA_ADS_LABELS[c.plataforma]}
                        {c.objetivo && ` · ${OBJETIVO_CAMPANA_LABELS[c.objetivo]}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c.cliente_nombre ?? <span className="text-empty">Sin cliente</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', ESTADO_CAMPANA_PUBLICIDAD_COLORS[c.estado])}>
                        {ESTADO_CAMPANA_PUBLICIDAD_LABELS[c.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {formatCurrency(c.gasto_total)}{c.presupuesto != null && ` / ${formatCurrency(c.presupuesto)}`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {c.clics_total.toLocaleString()} · {ctr}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setMetricasCampana(c)} title="Métricas" className="p-1.5 text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors">
                          <BarChart3 size={15} />
                        </button>
                        <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors">
                          <Pencil size={15} />
                        </button>
                        {canDelete && (
                          <button onClick={() => setDeleteTarget(c)} title="Eliminar" className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <CampanaModal
            form={form}
            setForm={setForm}
            isEdit={editingId !== null}
            saving={saving}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {metricasCampana && (
          <MetricasModal campana={metricasCampana} onClose={() => setMetricasCampana(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
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
                Se eliminarán también todas sus métricas registradas. Esta acción no se puede deshacer.
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
