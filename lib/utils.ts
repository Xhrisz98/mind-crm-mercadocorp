import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EstadoLead, LeadScore, MedioPago, PlataformaAds, EstadoCampanaPublicidad, ObjetivoCampana, UnidadMetrica, EstadoProyecto, PrioridadTarea, VisibilidadCliente } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Proyectos (Bloque 6)
export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

export const ESTADO_PROYECTO_COLORS: Record<EstadoProyecto, string> = {
  activo: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  pausado: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
  completado: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  cancelado: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
}

export const PRIORIDAD_TAREA_LABELS: Record<PrioridadTarea, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORIDAD_TAREA_COLORS: Record<PrioridadTarea, string> = {
  baja: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
  media: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  alta: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  urgente: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
}

export const VISIBILIDAD_CLIENTE_LABELS: Record<VisibilidadCliente, string> = {
  ninguna: 'Sin acceso al cliente',
  resumen: 'Resumen (solo KPIs)',
  completo: 'Completo (tablero de solo lectura)',
}

export const ESTADO_LABELS: Record<EstadoLead, string> = {
  inicial: 'Inicial',
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  en_atencion_humana: 'En atención humana',
  en_negociacion: 'En negociación',
  cliente: 'Cliente',
  perdido: 'Perdido',
}

export const ESTADO_COLORS: Record<EstadoLead, string> = {
  inicial: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
  nuevo: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10',
  contactado: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  interesado: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
  en_atencion_humana: 'bg-orange-500 text-white border-orange-500 dark:bg-orange-500/90 dark:border-orange-500/90',
  en_negociacion: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  cliente: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  perdido: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
}

export const LEAD_SCORE_LABELS: Record<LeadScore, string> = {
  frio: 'Frío',
  tibio: 'Tibio',
  caliente: 'Caliente',
  cliente: 'Cliente',
}

export const LEAD_SCORE_OPTIONS: LeadScore[] = ['frio', 'tibio', 'caliente', 'cliente']

// Orden canónico del funnel de leads en /leads/metricas. 'perdido' se excluye
// del cuerpo del funnel (es una salida, no una etapa de avance) y se reporta
// aparte como conteo de leads perdidos.
export const ESTADO_FUNNEL_ORDEN: EstadoLead[] = [
  'inicial', 'nuevo', 'contactado', 'interesado', 'en_atencion_humana', 'en_negociacion', 'cliente',
]

export const PLATAFORMA_ADS_LABELS: Record<PlataformaAds, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads',
}

export const ESTADO_CAMPANA_PUBLICIDAD_LABELS: Record<EstadoCampanaPublicidad, string> = {
  activa: 'Activa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
}

export const ESTADO_CAMPANA_PUBLICIDAD_COLORS: Record<EstadoCampanaPublicidad, string> = {
  activa: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  pausada: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  finalizada: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300',
}

export const OBJETIVO_CAMPANA_LABELS: Record<ObjetivoCampana, string> = {
  reconocimiento: 'Reconocimiento',
  trafico: 'Tráfico',
  conversion: 'Conversión',
}

// Qué tarjetas de KPI se destacan en el detalle de una campaña según su
// objetivo — taxonomía estándar Google/Meta Ads (awareness→CTR,
// traffic→CPC, conversion→costo por conversión + ROI). Referencia por
// `clave` de fórmula (ver formulas_personalizadas.clave) en vez de un enum
// fijo, ya que las fórmulas ahora son filas de datos. 'roi' no es una fórmula
// real — es el sentinel que la UI usa para destacar la KpiCard de ROI, que
// se calcula aparte (ver CampanaPublicidad.roi_estimado_pct).
export const OBJETIVO_KPI_DESTACADO: Record<ObjetivoCampana, string[]> = {
  reconocimiento: ['ctr'],
  trafico: ['cpc'],
  conversion: ['costo_por_conversion', 'roi'],
}

// Paleta cíclica para series de métricas arbitrarias en gráficos (cuando hay
// más series que colores fijos definidos en variables --chart-N).
export const METRICA_COLOR_PALETTE = ['var(--chart-1)', 'var(--chart-3)', '#22c55e', '#f59e0b', '#a855f7', '#ec4899']

// Formatea el valor tal como fue registrado para una métrica del catálogo
// (tabla de histórico, chips de registro diario, ejes de gráficos). Para
// unidad='porcentaje' asume que el usuario registró directamente el número
// en escala 0-100 (ej. 45 → "45%"), a diferencia de formatValorFormula.
export function formatValorMetrica(valor: number | null, unidad: UnidadMetrica): string {
  if (valor == null) return '—'
  if (unidad === 'usd') return formatCurrency(valor)
  if (unidad === 'porcentaje') return `${valor.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%`
  return valor.toLocaleString('es-EC', { maximumFractionDigits: 2 })
}

// Formatea el resultado de una fórmula (KPI card). A diferencia de
// formatValorMetrica, un ratio con unidad='porcentaje' viene en escala 0-1
// (ej. clics/impresiones = 0.045) y necesita *100 para mostrarse como "4.5%".
export function formatValorFormula(valor: number | null, unidad: UnidadMetrica): string {
  if (valor == null) return '—'
  if (unidad === 'usd') return formatCurrency(valor)
  if (unidad === 'porcentaje') return `${(valor * 100).toFixed(1)}%`
  return valor.toLocaleString('es-EC', { maximumFractionDigits: 2 })
}

// Ligado a compras_crm (descartada) — ver nota en lib/types.ts sobre MedioPago.
export const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  canje: 'Canje',
}

export function getLeadScoreColor(score: LeadScore): string {
  if (score === 'caliente') return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10'
  if (score === 'tibio') return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10'
  if (score === 'cliente') return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10'
  return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
}

/**
 * Color de texto (negro o blanco) con mejor contraste sobre un color de fondo
 * arbitrario elegido por el usuario (ej. color de etiqueta vía <input type="color">).
 * Sin esto, un texto blanco fijo sobre un color pastel/claro elegido libremente
 * puede caer muy por debajo de WCAG AA.
 */
export function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  const contrastWithWhite = 1.05 / (luminance + 0.05)
  const contrastWithBlack = (luminance + 0.05) / 0.05
  return contrastWithBlack > contrastWithWhite ? '#111827' : '#ffffff'
}

export function getLeadScoreDot(score: LeadScore): string {
  if (score === 'caliente') return 'bg-green-500'
  if (score === 'tibio') return 'bg-yellow-500'
  if (score === 'cliente') return 'bg-blue-500'
  return 'bg-red-500'
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const CANAL_ICONS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  messenger: '📱',
  instagram: '📸',
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days}d`
  return formatDate(dateStr)
}
