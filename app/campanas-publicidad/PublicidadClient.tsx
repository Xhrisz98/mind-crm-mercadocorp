'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import ContactoSearch from '@/components/ui/ContactoSearch'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import ChartCard from '@/components/charts/ChartCard'
import MetricCard from '@/components/charts/MetricCard'
import MetricasCatalogoModal from '@/components/campanas-publicidad/MetricasCatalogoModal'
import FormulaBuilderModal from '@/components/campanas-publicidad/FormulaBuilderModal'
import {
  cn, formatDate, formatValorMetrica, formatValorFormula,
  PLATAFORMA_ADS_LABELS, ESTADO_CAMPANA_PUBLICIDAD_LABELS, ESTADO_CAMPANA_PUBLICIDAD_COLORS,
  OBJETIVO_CAMPANA_LABELS, OBJETIVO_KPI_DESTACADO,
} from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type {
  CampanaPublicidad, CampanaMetricaValor, SerieTemporalPunto, MetricaDefinicion,
  PlataformaAds, EstadoCampanaPublicidad, ObjetivoCampana, Rol,
} from '@/lib/types'
import { Plus, Search, Pencil, Trash2, BarChart3, X, Settings2, SlidersHorizontal, Sigma, Check } from 'lucide-react'

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
const TEMPORAL_DEFAULT = ['impresiones', 'clics', 'conversiones']
const MAX_SERIES_TEMPORAL = 4
const MAX_CAMPANAS_GRAFICO = 12

function formatTickDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

function formatFullDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}

function useMetricasCatalogo() {
  const { data, mutate } = useSWR<{ metricas: MetricaDefinicion[] }>('/api/metricas-definiciones', fetcher)
  return { metricas: data?.metricas ?? [], mutateMetricas: mutate }
}

function CampanaModal({ form, setForm, isEdit, saving, campanaExito, onClose, onSave, onRegistrarMetricas }: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  isEdit: boolean
  saving: boolean
  campanaExito: CampanaPublicidad | null
  onClose: () => void
  onSave: () => void
  onRegistrarMetricas: () => void
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
        {campanaExito ? (
          <div className="py-2 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
              <Check size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Campaña creada</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              &ldquo;{campanaExito.nombre}&rdquo; ya está lista. El siguiente paso es registrar sus primeras métricas.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Ahora no
              </button>
              <button
                onClick={onRegistrarMetricas}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B8C] rounded-lg hover:bg-[#1B2B8C]/90 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <BarChart3 size={14} /> Registrar primeras métricas
              </button>
            </div>
          </div>
        ) : (
        <>
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
              allowCreate
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
        </>
        )}
      </motion.div>
    </motion.div>
  )
}

interface FilaRegistro { id: string; metricaId: number | ''; valor: string }

function nuevaFila(): FilaRegistro {
  return { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, metricaId: '', valor: '' }
}

function MetricasModal({ campana, metricasCatalogo, onClose }: {
  campana: CampanaPublicidad
  metricasCatalogo: MetricaDefinicion[]
  onClose: () => void
}) {
  const { data, mutate } = useSWR<{ campana: CampanaPublicidad; metricas: CampanaMetricaValor[] }>(
    `/api/campanas-publicidad/${campana.id}`,
    fetcher
  )
  const metricas = data?.metricas ?? []
  const c = data?.campana ?? campana
  const metricasActivas = metricasCatalogo.filter((m) => m.activo)

  const destacados = c.objetivo ? OBJETIVO_KPI_DESTACADO[c.objetivo] : []
  const roi = c.roi_estimado_pct != null ? `${c.roi_estimado_pct > 0 ? '+' : ''}${c.roi_estimado_pct}%` : 'Sin cliente vinculado'

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [filas, setFilas] = useState<FilaRegistro[]>([nuevaFila()])
  const [saving, setSaving] = useState(false)

  const porFecha = useMemo(() => {
    const map = new Map<string, CampanaMetricaValor[]>()
    for (const m of data?.metricas ?? []) {
      const arr = map.get(m.fecha) ?? []
      arr.push(m)
      map.set(m.fecha, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [data?.metricas])

  function actualizarFila(id: string, cambios: Partial<FilaRegistro>) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambios } : f)))
  }

  function agregarFila() {
    setFilas((fs) => [...fs, nuevaFila()])
  }

  function quitarFila(id: string) {
    setFilas((fs) => (fs.length > 1 ? fs.filter((f) => f.id !== id) : fs))
  }

  async function handleAgregar() {
    const valores = filas
      .filter((f) => f.metricaId !== '' && f.valor.trim() !== '')
      .map((f) => ({ metrica_definicion_id: Number(f.metricaId), valor: Number(f.valor) }))

    if (valores.length === 0) { toast.error('Selecciona al menos una métrica con su valor'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/campanas-publicidad/${campana.id}/metricas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, valores }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al registrar las métricas'); return }
      toast.success('Métricas registradas')
      setFilas([nuevaFila()])
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
          {(c.formulas ?? []).map((f) => (
            <MetricCard
              key={f.id}
              label={f.nombre}
              value={formatValorFormula(f.valor, f.unidad)}
              highlighted={f.clave != null && destacados.includes(f.clave)}
            />
          ))}
          <MetricCard
            label="ROI estimado"
            value={roi}
            highlighted={destacados.includes('roi')}
            footnote="Estimado por rango de fechas y cliente vinculado — no es atribución exacta por campaña."
          />
        </div>

        <div className="mb-5 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-[11px] text-gray-500 dark:text-gray-400">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100" />
          </div>

          <div className="space-y-2">
            {filas.map((fila) => {
              const opciones = metricasActivas.filter((m) => m.id === fila.metricaId || !filas.some((f) => f.id !== fila.id && f.metricaId === m.id))
              return (
                <div key={fila.id} className="flex items-center gap-2">
                  <select
                    value={fila.metricaId}
                    onChange={(e) => actualizarFila(fila.id, { metricaId: e.target.value ? Number(e.target.value) : '' })}
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Selecciona una métrica…</option>
                    {opciones.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={fila.valor}
                    onChange={(e) => actualizarFila(fila.id, { valor: e.target.value })}
                    placeholder="Valor"
                    className="w-28 text-xs px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => quitarFila(fila.id)}
                    disabled={filas.length === 1}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={agregarFila}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2B8C] dark:text-[#4A9FD8] hover:underline"
            >
              <Plus size={12} /> Agregar métrica
            </button>
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

        {porFecha.length === 0 ? (
          <p className="text-xs text-empty text-center py-8">Aún no hay métricas registradas para esta campaña</p>
        ) : (
          <div className="space-y-2">
            {porFecha.map(([fechaGrupo, valores]) => (
              <div key={fechaGrupo} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-0.5 w-20">{formatDate(fechaGrupo)}</span>
                <div className="flex flex-wrap gap-1.5">
                  {valores.map((v) => (
                    <span key={v.id} className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                      {v.metrica_nombre}: <span className="font-medium tabular-nums">{formatValorMetrica(v.valor, v.metrica_unidad ?? 'numero')}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
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
  const [campanaExito, setCampanaExito] = useState<CampanaPublicidad | null>(null)

  const [metricasCampana, setMetricasCampana] = useState<CampanaPublicidad | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CampanaPublicidad | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showCatalogo, setShowCatalogo] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)

  const { metricas: metricasCatalogo, mutateMetricas } = useMetricasCatalogo()
  const [graficoGastoMetrica, setGraficoGastoMetrica] = useState('gasto')
  const [graficoTemporalMetricas, setGraficoTemporalMetricas] = useState<string[]>(TEMPORAL_DEFAULT)

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (estadoFiltro) params.set('estado', estadoFiltro)
  if (plataformaFiltro) params.set('plataforma', plataformaFiltro)

  const { data, error, isLoading, mutate } = useSWR<{ campanas: CampanaPublicidad[]; serie_temporal: SerieTemporalPunto[] }>(
    `/api/campanas-publicidad?${params}`,
    fetcher
  )
  const campanas = data?.campanas ?? []
  const serieTemporal = data?.serie_temporal ?? []

  const metricaGastoInfo = metricasCatalogo.find((m) => m.clave === graficoGastoMetrica)
  const seriesTemporales = graficoTemporalMetricas
    .map((clave) => metricasCatalogo.find((m) => m.clave === clave))
    .filter((m): m is MetricaDefinicion => !!m)
    .map((m) => ({ clave: m.clave, nombre: m.nombre, unidad: m.unidad }))

  // Solo campañas con datos para la métrica elegida — una campaña en 0 no
  // aporta nada visible a esta comparación y su banda vacía se lee como
  // "el gráfico no llena el ancho" en vez de "sin datos" (ver discusión de
  // layout). Ordenadas de mayor a menor, igual que el chart anterior.
  const datosGastoOrdenados = campanas
    .map((c) => ({ nombre: c.nombre, valor: c.metricas_totales[graficoGastoMetrica] ?? 0 }))
    .filter((d) => d.valor > 0)
    .sort((a, b) => b.valor - a.valor)
  const campanasSinDatos = campanas.length - datosGastoOrdenados.length
  const datosGastoVisibles = datosGastoOrdenados.slice(0, MAX_CAMPANAS_GRAFICO)
  const campanasOcultasPorLimite = Math.max(0, datosGastoOrdenados.length - MAX_CAMPANAS_GRAFICO)
  const notaGasto = [
    campanasSinDatos > 0 ? `${campanasSinDatos} sin datos para esta métrica` : null,
    campanasOcultasPorLimite > 0 ? `mostrando las ${MAX_CAMPANAS_GRAFICO} con mayor valor de ${datosGastoOrdenados.length}` : null,
  ].filter(Boolean).join(' · ')

  const datosTemporal = serieTemporal.map((punto) => ({
    fecha: punto.fecha,
    ...Object.fromEntries(seriesTemporales.map((s) => [s.clave, punto.valores[s.clave] ?? 0])),
  }))

  function toggleSerieTemporal(clave: string) {
    setGraficoTemporalMetricas((actuales) => {
      if (actuales.includes(clave)) return actuales.filter((c) => c !== clave)
      if (actuales.length >= MAX_SERIES_TEMPORAL) return actuales
      return [...actuales, clave]
    })
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setCampanaExito(null)
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
    setCampanaExito(null)
    setShowModal(true)
  }

  function closeCampanaModal() {
    setShowModal(false)
    setCampanaExito(null)
  }

  function irARegistrarMetricas() {
    if (campanaExito) setMetricasCampana(campanaExito)
    setShowModal(false)
    setCampanaExito(null)
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
      await mutate()
      if (editingId) {
        toast.success('Campaña actualizada')
        setShowModal(false)
      } else {
        toast.success('Campaña creada')
        setCampanaExito(json.campana)
      }
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campañas de Publicidad</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Registro manual de campañas en Google Ads y Meta Ads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatalogo(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <Settings2 size={14} /> Catálogo de métricas
          </button>
          <button
            onClick={() => setShowFormulas(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <Sigma size={14} /> Fórmulas personalizadas
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Métrica por campaña</h3>
            <select
              value={graficoGastoMetrica}
              onChange={(e) => setGraficoGastoMetrica(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            >
              {metricasCatalogo.map((m) => <option key={m.clave} value={m.clave}>{m.nombre}</option>)}
            </select>
          </div>
          <ChartCard
            tipo="column"
            data={datosGastoVisibles}
            categoryKey="nombre"
            series={[{ clave: 'valor', nombre: metricaGastoInfo?.nombre ?? 'Valor', unidad: metricaGastoInfo?.unidad ?? 'numero' }]}
            loading={isLoading}
            ariaLabel={`Gráfico de barras: ${metricaGastoInfo?.nombre ?? 'métrica'} por campaña`}
          />
          {notaGasto && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1">{notaGasto}</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Métricas en el tiempo</h3>
            <div className="flex items-center gap-1 flex-wrap">
              <SlidersHorizontal size={12} className="text-gray-400" />
              {metricasCatalogo.map((m) => (
                <button
                  key={m.clave}
                  onClick={() => toggleSerieTemporal(m.clave)}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                    graficoTemporalMetricas.includes(m.clave)
                      ? 'bg-[#1B2B8C]/10 dark:bg-[#4A9FD8]/10 border-[#1B2B8C]/30 dark:border-[#4A9FD8]/30 text-[#1B2B8C] dark:text-[#4A9FD8]'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          </div>
          <ChartCard
            tipo="line"
            data={datosTemporal}
            categoryKey="fecha"
            series={seriesTemporales}
            loading={isLoading}
            ariaLabel={`Gráfico de línea: ${seriesTemporales.map((s) => s.nombre).join(', ')} por fecha`}
            emptyMessage="Sin métricas registradas en este filtro"
            formatCategoria={formatTickDate}
            formatCategoriaTooltip={formatFullDate}
          />
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
                const gasto = c.metricas_totales['gasto'] ?? 0
                const clics = c.metricas_totales['clics'] ?? 0
                const impresiones = c.metricas_totales['impresiones'] ?? 0
                const ctr = impresiones > 0 ? ((clics / impresiones) * 100).toFixed(1) : '0.0'
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
                      {formatValorMetrica(gasto, 'usd')}{c.presupuesto != null && ` / ${formatValorMetrica(c.presupuesto, 'usd')}`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {clics.toLocaleString()} · {ctr}%
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
            campanaExito={campanaExito}
            onClose={closeCampanaModal}
            onSave={handleSave}
            onRegistrarMetricas={irARegistrarMetricas}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {metricasCampana && (
          <MetricasModal campana={metricasCampana} metricasCatalogo={metricasCatalogo} onClose={() => setMetricasCampana(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCatalogo && (
          <MetricasCatalogoModal onClose={() => setShowCatalogo(false)} onChanged={() => { mutateMetricas(); mutate() }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFormulas && (
          <FormulaBuilderModal onClose={() => setShowFormulas(false)} />
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
