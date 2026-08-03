import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EstadoLead, LeadScore, EstadoFactura, MedioPago } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export const ESTADO_FACTURA_LABELS: Record<EstadoFactura, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  anulado: 'Anulado',
}

export const ESTADO_FACTURA_COLORS: Record<EstadoFactura, string> = {
  pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
  pagado: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  anulado: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
}

export const ESTADO_FACTURA_OPTIONS: EstadoFactura[] = ['pendiente', 'pagado', 'anulado']

export const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  canje: 'Canje',
}

export const MEDIO_PAGO_OPTIONS: MedioPago[] = [
  'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'efectivo', 'canje',
]

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
