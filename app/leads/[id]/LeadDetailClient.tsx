'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CanalIcon, { CANAL_CONFIG } from '@/components/ui/CanalIcon'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import {
  cn, formatDate, formatDateTime, ESTADO_LABELS, LEAD_SCORE_LABELS, LEAD_SCORE_OPTIONS, getLeadScoreColor, getContrastTextColor,
} from '@/lib/utils'
import type { Contacto, MensajeHistorial, EstadoLead, LeadScore, Rol, UsuarioCRM, Nota, Canal, ContactoVinculado, SugerenciaVinculacion, Etiqueta } from '@/lib/types'
import { ArrowLeft, Phone, Mail, Calendar, Pencil, X, User, Check, ChevronDown, Play, Pause, Plus, Link2, UserCheck, Handshake, CheckCircle, Send, Trash2, Tag, Paperclip } from 'lucide-react'
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa'
import { fetcher } from '@/lib/fetcher'
import Spinner from '@/components/ui/Spinner'

const ESTADOS: EstadoLead[] = [
  'inicial', 'nuevo', 'contactado', 'interesado', 'en_atencion_humana', 'en_negociacion', 'cliente', 'perdido',
]

const ROL_LABELS: Record<Rol, string> = {
  ventas: 'Ventas',
  comercial: 'Comercial',
  admin: 'Admin',
}

const CANAL_ORDER: Canal[] = ['whatsapp', 'telegram', 'messenger', 'instagram', 'web']

export interface CanalRespuestaOpcion {
  label: string
  canal: Canal
  userId: string
}

function formatIdentifierLabel(canal: Canal, identifier: string): string {
  const base = CANAL_CONFIG[canal]?.label ?? canal
  if (!identifier) return base
  const display = /^\d+$/.test(identifier) ? `+${identifier}` : identifier
  return `${base} (${display})`
}

// Canales disponibles para responder: el canal principal del contacto (con su canal_user_id),
// los canales adicionales ya vinculados en el propio registro (whatsapp_number/facebook_id/instagram_id),
// y cada lead vinculado manualmente (tabla leads_vinculados) con su propio canal_user_id.
function getCanalesRespuesta(lead: Contacto, vinculados: ContactoVinculado[]): CanalRespuestaOpcion[] {
  const opciones: CanalRespuestaOpcion[] = []

  if (lead.canal === 'whatsapp') {
    const uid = lead.whatsapp_number || lead.canal_user_id
    opciones.push({ label: formatIdentifierLabel('whatsapp', uid), canal: 'whatsapp', userId: uid })
  } else if (lead.whatsapp_number) {
    opciones.push({ label: formatIdentifierLabel('whatsapp', lead.whatsapp_number), canal: 'whatsapp', userId: lead.whatsapp_number })
  }

  if (lead.canal === 'messenger') {
    const uid = lead.facebook_id || lead.canal_user_id
    opciones.push({ label: formatIdentifierLabel('messenger', uid), canal: 'messenger', userId: uid })
  } else if (lead.facebook_id) {
    opciones.push({ label: formatIdentifierLabel('messenger', lead.facebook_id), canal: 'messenger', userId: lead.facebook_id })
  }

  if (lead.canal === 'instagram') {
    const uid = lead.instagram_id || lead.canal_user_id
    opciones.push({ label: formatIdentifierLabel('instagram', uid), canal: 'instagram', userId: uid })
  } else if (lead.instagram_id) {
    opciones.push({ label: formatIdentifierLabel('instagram', lead.instagram_id), canal: 'instagram', userId: lead.instagram_id })
  }

  if (lead.canal === 'telegram') {
    opciones.push({ label: formatIdentifierLabel('telegram', lead.canal_user_id), canal: 'telegram', userId: lead.canal_user_id })
  }
  if (lead.canal === 'web') {
    opciones.push({ label: formatIdentifierLabel('web', lead.canal_user_id), canal: 'web', userId: lead.canal_user_id })
  }

  for (const v of vinculados) {
    opciones.push({ label: formatIdentifierLabel(v.canal, v.canal_user_id), canal: v.canal, userId: v.canal_user_id })
  }

  return opciones
}

function canalRespuestaKey(o: CanalRespuestaOpcion): string {
  return `${o.canal}|${o.userId}`
}

function CanalRespuestaSelect({
  opciones,
  value,
  onChange,
}: {
  opciones: CanalRespuestaOpcion[]
  value: string
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (opciones.length === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
        Sin canal disponible
      </span>
    )
  }

  const selected = opciones.find((o) => canalRespuestaKey(o) === value) ?? opciones[0]
  const config = CANAL_CONFIG[selected.canal]

  // Un solo canal disponible: badge estático, sin dropdown
  if (opciones.length === 1) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: config.color }}
      >
        <CanalIcon canal={selected.canal} size={12} monochrome />
        <span className="truncate max-w-[160px]">{selected.label}</span>
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
        style={{ backgroundColor: config.color }}
      >
        <CanalIcon canal={selected.canal} size={12} monochrome />
        <span className="truncate max-w-[130px]">{selected.label}</span>
        <ChevronDown size={12} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-20 bottom-full mb-1.5 left-0 min-w-[190px] bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-lg p-1.5 space-y-0.5"
          >
            {opciones.map((o) => {
              const key = canalRespuestaKey(o)
              const active = key === value
              const oConfig = CANAL_CONFIG[o.canal]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onChange(key); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                    active ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                  style={active ? { backgroundColor: oConfig.color } : undefined}
                >
                  <CanalIcon canal={o.canal} size={12} monochrome={active} />
                  <span className="truncate">{o.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const bubbleVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: Math.min(i * 0.03, 0.5), duration: 0.3, ease: 'easeOut' },
  }),
}

function ChatImage({ src, onOpen }: { src: string; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative" style={{ width: 240, maxWidth: '100%' }}>
      {!loaded && (
        <div className="flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" style={{ width: 240, maxWidth: '100%', height: 160 }}>
          <Spinner state="searching" />
        </div>
      )}
      {/* next/image no aplica: la URL viene de historial_conversaciones.imagen_url, servida
          dinámicamente desde el dominio del VPS de n8n (no un dominio propio configurable
          de antemano en remotePatterns), y varía por canal (WhatsApp/Instagram/Messenger). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Imagen adjunta"
        onClick={onOpen}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          'rounded-lg cursor-pointer transition-opacity duration-200',
          loaded ? 'opacity-100 block' : 'opacity-0 absolute inset-0 h-0 overflow-hidden'
        )}
        style={{ maxWidth: 240, width: '100%' }}
      />
    </div>
  )
}

interface Props {
  id: string
  userRol: Rol
  puedeEliminar: boolean
}

const ESTADO_BANNER: Partial<Record<EstadoLead, { className: string; Icon: typeof UserCheck; label: string }>> = {
  en_atencion_humana: {
    className: 'bg-orange-50 dark:bg-orange-500/10 border-orange-500 dark:border-orange-500/40 text-orange-700 dark:text-orange-400',
    Icon: UserCheck,
    label: 'En atención humana — el agente Mind está pausado',
  },
  en_negociacion: {
    className: 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 dark:border-blue-500/40 text-blue-700 dark:text-blue-400',
    Icon: Handshake,
    label: 'En negociación',
  },
  cliente: {
    className: 'bg-green-50 dark:bg-green-500/10 border-green-500 dark:border-green-500/40 text-green-700 dark:text-green-400',
    Icon: CheckCircle,
    label: 'Cliente confirmado',
  },
}

export default function LeadDetailClient({ id, userRol, puedeEliminar }: Props) {
  const router = useRouter()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesWrapperRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const initialScrollDoneRef = useRef(false)
  const etiquetaDropdownRef = useRef<HTMLDivElement>(null)

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ lead: Contacto; historial: MensajeHistorial[]; sugerencias: SugerenciaVinculacion[] }>(
    `/api/leads/${id}`,
    fetcher,
    { refreshInterval: 3000 }
  )

  // Filtro de canal del historial (mensajes ya vienen unificados de todos los canales)
  const historialCompleto = data?.historial ?? []
  const canalesPresentes = Array.from(new Set(historialCompleto.map((m) => m.canal))) as Canal[]
  const [canalFiltro, setCanalFiltro] = useState<Canal | 'todos'>('todos')
  const historialFiltrado = canalFiltro === 'todos'
    ? historialCompleto
    : historialCompleto.filter((m) => m.canal === canalFiltro)

  // Fetch users for vendor selector (only comercial/admin can assign)
  const canAssign = userRol === 'admin' || userRol === 'comercial'
  const { data: usuariosData, error: usuariosError } = useSWR<{ usuarios: UsuarioCRM[] }>(
    canAssign ? '/api/usuarios?activos=1' : null,
    fetcher
  )
  const usuarios = usuariosData?.usuarios ?? []

  // Etiquetas — solo comercial/admin pueden gestionar
  const canManageEtiquetas = canAssign
  const { data: etiquetasContactoData, error: etiquetasContactoError, mutate: mutateEtiquetasContacto } = useSWR<{ etiquetas: Etiqueta[] }>(
    `/api/contactos/${id}/etiquetas`,
    fetcher
  )
  const etiquetasContacto = etiquetasContactoData?.etiquetas ?? []
  const { data: catalogoEtiquetasData, error: catalogoEtiquetasError, mutate: mutateCatalogoEtiquetas } = useSWR<{ etiquetas: Etiqueta[] }>(
    canManageEtiquetas ? '/api/etiquetas' : null,
    fetcher
  )
  const catalogoEtiquetas = catalogoEtiquetasData?.etiquetas ?? []
  const etiquetasDisponibles = catalogoEtiquetas.filter(
    (e) => !etiquetasContacto.some((ec) => ec.id === e.id)
  )
  const [showEtiquetaDropdown, setShowEtiquetaDropdown] = useState(false)
  const [asignandoEtiquetaId, setAsignandoEtiquetaId] = useState<number | null>(null)
  const [quitandoEtiquetaId, setQuitandoEtiquetaId] = useState<number | null>(null)
  const [showNuevaEtiquetaModal, setShowNuevaEtiquetaModal] = useState(false)
  const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('')
  const [nuevaEtiquetaColor, setNuevaEtiquetaColor] = useState('#1B2B8C')
  const [creandoEtiqueta, setCreandoEtiqueta] = useState(false)

  async function asignarEtiqueta(etiquetaId: number) {
    setAsignandoEtiquetaId(etiquetaId)
    try {
      const res = await fetch(`/api/contactos/${id}/etiquetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etiqueta_id: etiquetaId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al asignar etiqueta'); return }
      await mutateEtiquetasContacto()
      setShowEtiquetaDropdown(false)
      toast.success('Etiqueta asignada')
    } catch { toast.error('Error de conexión') }
    finally { setAsignandoEtiquetaId(null) }
  }

  async function quitarEtiqueta(etiquetaId: number) {
    setQuitandoEtiquetaId(etiquetaId)
    try {
      const res = await fetch(`/api/contactos/${id}/etiquetas/${etiquetaId}`, { method: 'DELETE' })
      if (!res.ok) { const json = await res.json().catch(() => ({})); toast.error(json.error || 'Error al quitar etiqueta'); return }
      await mutateEtiquetasContacto()
      toast.success('Etiqueta removida')
    } catch { toast.error('Error de conexión') }
    finally { setQuitandoEtiquetaId(null) }
  }

  useEffect(() => {
    if (!showEtiquetaDropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (etiquetaDropdownRef.current && !etiquetaDropdownRef.current.contains(e.target as Node)) {
        setShowEtiquetaDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEtiquetaDropdown])

  async function crearEtiqueta(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaEtiquetaNombre.trim()) return
    setCreandoEtiqueta(true)
    try {
      const res = await fetch('/api/etiquetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaEtiquetaNombre.trim(), color: nuevaEtiquetaColor }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al crear etiqueta'); return }
      await mutateCatalogoEtiquetas()
      toast.success(`Etiqueta "${nuevaEtiquetaNombre.trim()}" creada`)
      setNuevaEtiquetaNombre('')
      setNuevaEtiquetaColor('#1B2B8C')
      setShowNuevaEtiquetaModal(false)
    } catch { toast.error('Error de conexión') }
    finally { setCreandoEtiqueta(false) }
  }

  // Edición inline de datos de contacto (nombre, teléfono, email) — solo comercial/admin
  const canEditContacto = userRol === 'admin' || userRol === 'comercial'
  const [editingField, setEditingField] = useState<'nombre' | 'telefono' | 'email' | 'whatsapp_number' | 'instagram_id' | 'facebook_id' | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const [savingField, setSavingField] = useState(false)

  // Notas (nueva tabla notas_crm)
  const { data: notasData, error: notasError, mutate: mutateNotas } = useSWR<{ notas: Nota[] }>(
    `/api/contactos/${id}/notas`,
    fetcher
  )
  const notas = notasData?.notas ?? []
  const notasSinRevisar = notas.filter((n) => !n.revisada).length
  const [nuevaNota, setNuevaNota] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [togglingNotaId, setTogglingNotaId] = useState<number | null>(null)

  // Vinculación manual de leads (tabla leads_vinculados) — solo comercial/admin
  const { data: vinculadosData, error: vinculadosError, mutate: mutateVinculados } = useSWR<{ vinculados: ContactoVinculado[] }>(
    canAssign ? `/api/contactos/${id}/vinculados` : null,
    fetcher
  )
  const vinculados = vinculadosData?.vinculados ?? []
  const sugerencias = data?.sugerencias ?? []
  const [showVincularModal, setShowVincularModal] = useState(false)
  const [busquedaVinculo, setBusquedaVinculo] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [desvinculandoId, setDesvinculandoId] = useState<number | null>(null)
  const { data: busquedaData, error: busquedaError } = useSWR<{ leads: Contacto[] }>(
    showVincularModal && busquedaVinculo.trim().length >= 2
      ? `/api/leads?q=${encodeURIComponent(busquedaVinculo.trim())}&limit=10`
      : null,
    fetcher
  )
  const resultadosVinculo = (busquedaData?.leads ?? []).filter(
    (l) => l.id !== Number(id) && !vinculados.some((v) => v.id === l.id)
  )

  // Estado
  const [savingEstado, setSavingEstado] = useState(false)

  // Vendor
  const [savingVendor, setSavingVendor] = useState(false)

  // Agent pause
  const [savingAgente, setSavingAgente] = useState(false)

  // Lead score
  const [savingScore, setSavingScore] = useState(false)

  // Responder como vendedor
  const [mensajeRespuesta, setMensajeRespuesta] = useState('')
  const [canalRespuestaSel, setCanalRespuestaSel] = useState('')
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)
  const [imagenAdjunta, setImagenAdjunta] = useState<File | null>(null)
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState<string | null>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lightbox de imágenes del historial
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  // Eliminar lead — admin o usuarios con permiso puede_eliminar
  const canDelete = userRol === 'admin' || puedeEliminar
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!data?.lead) return
    const l = data.lead
    const opciones = getCanalesRespuesta(l, vinculados)
    const keys = opciones.map(canalRespuestaKey)
    setCanalRespuestaSel((prev) => {
      if (prev && keys.includes(prev)) return prev
      const principal = opciones.find((o) => o.canal === l.canal)
      return principal ? canalRespuestaKey(principal) : (keys[0] ?? '')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.lead?.id, data?.lead?.canal, data?.lead?.whatsapp_number, data?.lead?.facebook_id, data?.lead?.instagram_id, vinculados])

  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current
    if (!el) return
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 100
  }, [])

  useEffect(() => {
    if (historialFiltrado.length === 0) return
    const el = chatContainerRef.current
    if (!el) return
    // Se hace scroll solo dentro del contenedor del chat (nunca window.scrollTo),
    // para que el auto-scroll al llegar mensajes nuevos no mueva la página completa.
    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true
      el.scrollTop = el.scrollHeight
    } else if (isNearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [historialFiltrado.length])

  // Las imágenes adjuntas cargan de forma asíncrona y cambian la altura del contenido
  // después del scroll inicial; mientras el usuario esté cerca del final, se re-ancla
  // el scroll (solo dentro del contenedor) para que no quede "flotando" antes del final.
  useEffect(() => {
    const wrapper = messagesWrapperRef.current
    const container = chatContainerRef.current
    if (!wrapper || !container) return
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) container.scrollTop = container.scrollHeight
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [historialFiltrado.length])

  function startEditField(field: 'nombre' | 'telefono' | 'email' | 'whatsapp_number' | 'instagram_id' | 'facebook_id', currentValue: string) {
    setEditingField(field)
    setFieldDraft(currentValue)
  }

  function cancelFieldEdit() {
    setEditingField(null)
    setFieldDraft('')
  }

  async function saveField() {
    if (!editingField) return
    const value = fieldDraft.trim()
    if (editingField === 'nombre' && !value) {
      toast.error('El nombre no puede estar vacío')
      return
    }
    setSavingField(true)
    try {
      const res = await fetch(`/api/contactos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editingField]: value || null }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Error al guardar'); return }
      await mutate()
      setEditingField(null)
      setFieldDraft('')
      toast.success('Actualizado correctamente')
    } catch { toast.error('Error de conexión') }
    finally { setSavingField(false) }
  }

  async function updateEstado(nuevoEstado: EstadoLead) {
    if (nuevoEstado === data?.lead?.estado_lead) return
    setSavingEstado(true)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_lead: nuevoEstado }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success(`Estado → ${ESTADO_LABELS[nuevoEstado]}`)
    } catch { toast.error('Error al cambiar estado') }
    finally { setSavingEstado(false) }
  }

  async function assignVendor(vendedorId: number | null) {
    setSavingVendor(true)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendedor_asignado_id: vendedorId }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      const nombre = usuarios.find((u) => u.id === vendedorId)?.nombre
      toast.success(nombre ? `Asignado a ${nombre}` : 'Vendedor removido')
    } catch { toast.error('Error al asignar vendedor') }
    finally { setSavingVendor(false) }
  }

  async function toggleAgente() {
    const pausar = !(data?.lead?.agente_pausado ?? false)
    setSavingAgente(true)
    try {
      const body = pausar
        ? { agente_pausado: true, pausa_hasta: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() }
        : { agente_pausado: false, pausa_hasta: null }
      const res = await fetch(`/api/contactos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success(pausar ? 'Agente pausado por 3 horas' : 'Agente reactivado')
    } catch { toast.error('Error al cambiar estado del agente') }
    finally { setSavingAgente(false) }
  }

  async function updateLeadScore(score: LeadScore) {
    if (score === data?.lead?.lead_score) return
    setSavingScore(true)
    try {
      const res = await fetch(`/api/contactos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_score: score }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success(`Score → ${LEAD_SCORE_LABELS[score]}`)
    } catch { toast.error('Error al cambiar el score') }
    finally { setSavingScore(false) }
  }

  async function resetLeadScoreAuto() {
    setSavingScore(true)
    try {
      const res = await fetch(`/api/contactos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_score_manual: false }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success('Score vuelve a calcularse automáticamente')
    } catch { toast.error('Error al restaurar el cálculo automático') }
    finally { setSavingScore(false) }
  }

  async function addNota() {
    const contenido = nuevaNota.trim()
    if (!contenido) return
    setSavingNota(true)
    try {
      const res = await fetch(`/api/contactos/${id}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      })
      if (!res.ok) throw new Error()
      await mutateNotas()
      setNuevaNota('')
      toast.success('Nota agregada')
    } catch { toast.error('Error al agregar nota') }
    finally { setSavingNota(false) }
  }

  async function toggleNotaRevisada(nota: Nota) {
    setTogglingNotaId(nota.id)
    try {
      const res = await fetch(`/api/notas/${nota.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisada: !nota.revisada }),
      })
      if (!res.ok) throw new Error()
      await mutateNotas()
    } catch { toast.error('Error al actualizar nota') }
    finally { setTogglingNotaId(null) }
  }

  async function vincularLead(targetId: number) {
    setVinculando(true)
    try {
      const res = await fetch(`/api/contactos/${id}/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacto_vinculado_id: targetId }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Error al vincular'); return }
      await Promise.all([mutateVinculados(), mutate()])
      setShowVincularModal(false)
      setBusquedaVinculo('')
      toast.success('Lead vinculado')
    } catch { toast.error('Error de conexión') }
    finally { setVinculando(false) }
  }

  async function desvincularLead(vinculadoId: number) {
    setDesvinculandoId(vinculadoId)
    try {
      const res = await fetch(`/api/contactos/${id}/vincular/${vinculadoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await Promise.all([mutateVinculados(), mutate()])
      toast.success('Lead desvinculado')
    } catch { toast.error('Error al desvincular') }
    finally { setDesvinculandoId(null) }
  }

  function handleSeleccionarImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      toast.error('Solo se permiten imágenes JPEG o PNG')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('La imagen no puede superar 15MB')
      return
    }
    if (imagenPreviewUrl) URL.revokeObjectURL(imagenPreviewUrl)
    setImagenAdjunta(file)
    setImagenPreviewUrl(URL.createObjectURL(file))
  }

  function quitarImagenAdjunta() {
    if (imagenPreviewUrl) URL.revokeObjectURL(imagenPreviewUrl)
    setImagenAdjunta(null)
    setImagenPreviewUrl(null)
  }

  async function enviarRespuesta() {
    const mensaje = mensajeRespuesta.trim() || (imagenAdjunta ? '[Imagen]' : '')
    if (!mensaje || !canalRespuestaSel || !data?.lead) return
    const opcion = getCanalesRespuesta(data.lead, vinculados).find((o) => canalRespuestaKey(o) === canalRespuestaSel)
    if (!opcion) return

    setEnviandoRespuesta(true)
    try {
      let imagenUrl: string | null = null

      if (imagenAdjunta) {
        setSubiendoImagen(true)

        // Token de un solo uso: el webhook de n8n es público, así que la autenticación
        // ya no la hace esta API sino un token corto emitido acá y validado en n8n.
        const tokenRes = await fetch('/api/upload/token', { method: 'POST' })
        const tokenJson = await tokenRes.json().catch(() => ({}))
        if (!tokenRes.ok || !tokenJson?.token) {
          setSubiendoImagen(false)
          toast.error(tokenJson?.error || 'No se pudo autorizar la subida de la imagen')
          return
        }

        const formData = new FormData()
        formData.append('file', imagenAdjunta)
        formData.append('upload_token', tokenJson.token)
        // Sube directo a n8n (VPS) evitando el límite de 4.5MB de las funciones serverless de Vercel
        const uploadRes = await fetch(process.env.NEXT_PUBLIC_N8N_UPLOAD_URL!, { method: 'POST', body: formData })
        const uploadJson = await uploadRes.json().catch(() => ({}))
        setSubiendoImagen(false)
        if (!uploadRes.ok || !uploadJson?.url) { toast.error(uploadJson?.error || 'Error al subir la imagen'); return }
        imagenUrl = uploadJson.url
      }

      const res = await fetch(`/api/contactos/${id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, canal: opcion.canal, userId: opcion.userId, imagen_url: imagenUrl }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Error al enviar mensaje'); return }
      setMensajeRespuesta('')
      quitarImagenAdjunta()
      await mutate()
      toast.success('Mensaje enviado')
    } catch { toast.error('Error de conexión') }
    finally { setEnviandoRespuesta(false); setSubiendoImagen(false) }
  }

  async function deleteLead() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al eliminar el lead'); return }
      toast.success('Lead eliminado')
      router.push('/leads')
    } catch { toast.error('Error de conexión') }
    finally { setDeleting(false) }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (error && error.status !== 404) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="No se pudo cargar el lead" onRetry={() => mutate()} />
      </div>
    )
  }

  if (!data?.lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Lead no encontrado</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>Volver</Button>
      </div>
    )
  }

  const { lead } = data
  const canControlAgent = userRol === 'admin' || userRol === 'comercial'
  const canResponder = canControlAgent && (lead.estado_lead === 'en_atencion_humana' || lead.agente_pausado)
  const canalesRespuestaOpciones = getCanalesRespuesta(lead, vinculados)
  const banner = ESTADO_BANNER[lead.estado_lead]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          {editingField === 'nombre' ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={fieldDraft}
                onChange={(e) => setFieldDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') cancelFieldEdit() }}
                className="flex-1 min-w-0 text-xl font-bold text-gray-900 px-2 py-1 border border-[#1B2B8C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={saveField}
                disabled={savingField}
                className="shrink-0 p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg disabled:opacity-50 transition-colors"
              >
                {savingField ? <Spinner state="working" /> : <Check size={16} />}
              </button>
              <button
                onClick={cancelFieldEdit}
                disabled={savingField}
                className="shrink-0 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => canEditContacto && startEditField('nombre', lead.nombre)}
              disabled={!canEditContacto}
              className={cn('group flex items-center gap-2 min-w-0 text-left', canEditContacto && 'cursor-pointer')}
            >
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{lead.nombre}</h1>
              {canEditContacto && (
                <Pencil size={13} className="text-empty opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </button>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <CanalIcon canal={lead.canal} size={14} showLabel />
            <span className="text-empty">•</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Desde {formatDate(lead.fecha_primer_contacto)}</span>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => setShowDeleteModal(true)}
            title="Eliminar lead"
            className="shrink-0 p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-4">

          {/* Datos de contacto */}
          <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Datos de contacto</h3>
            <div className="space-y-4">
              {/* Teléfono */}
              <div className="flex items-start gap-3">
                <Phone size={15} className="text-gray-500 dark:text-gray-400 shrink-0 mt-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Teléfono</p>
                  {editingField === 'telefono' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="tel"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') cancelFieldEdit() }}
                        placeholder="+593 99 123 4567"
                        className="flex-1 text-sm px-2.5 py-1.5 border border-[#1B2B8C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                      />
                      <button onClick={saveField} disabled={savingField} className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg disabled:opacity-50 transition-colors">
                        {savingField ? <Spinner state="working" /> : <Check size={14} />}
                      </button>
                      <button onClick={cancelFieldEdit} disabled={savingField} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : canEditContacto ? (
                    <button onClick={() => startEditField('telefono', lead.telefono ?? '')} className="group flex items-center gap-2 w-full text-left">
                      <span className={cn('text-sm', lead.telefono ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                        {lead.telefono || 'No disponible'}
                      </span>
                      <Pencil size={12} className="text-empty opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ) : (
                    <p className={cn('text-sm', lead.telefono ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                      {lead.telefono || 'No disponible'}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail size={15} className="text-gray-500 dark:text-gray-400 shrink-0 mt-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  {editingField === 'email' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="email"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') cancelFieldEdit() }}
                        placeholder="correo@ejemplo.com"
                        className="flex-1 text-sm px-2.5 py-1.5 border border-[#1B2B8C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                      />
                      <button onClick={saveField} disabled={savingField} className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg disabled:opacity-50 transition-colors">
                        {savingField ? <Spinner state="working" /> : <Check size={14} />}
                      </button>
                      <button onClick={cancelFieldEdit} disabled={savingField} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : canEditContacto ? (
                    <button onClick={() => startEditField('email', lead.email ?? '')} className="group flex items-center gap-2 w-full text-left">
                      <span className={cn('text-sm break-all', lead.email ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                        {lead.email || 'No disponible'}
                      </span>
                      <Pencil size={12} className="text-empty opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ) : (
                    <p className={cn('text-sm break-all', lead.email ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                      {lead.email || 'No disponible'}
                    </p>
                  )}
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3">
                <FaWhatsapp size={15} className="shrink-0 mt-2" style={{ color: '#25D366' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">WhatsApp</p>
                  {editingField === 'whatsapp_number' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="tel"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') cancelFieldEdit() }}
                        placeholder="+593 99 123 4567"
                        className="flex-1 text-sm px-2.5 py-1.5 border border-[#1B2B8C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                      />
                      <button onClick={saveField} disabled={savingField} className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg disabled:opacity-50 transition-colors">
                        {savingField ? <Spinner state="working" /> : <Check size={14} />}
                      </button>
                      <button onClick={cancelFieldEdit} disabled={savingField} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : canEditContacto ? (
                    <button onClick={() => startEditField('whatsapp_number', lead.whatsapp_number ?? '')} className="group flex items-center gap-2 w-full text-left">
                      <span className={cn('text-sm', lead.whatsapp_number ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                        {lead.whatsapp_number || 'No disponible'}
                      </span>
                      <Pencil size={12} className="text-empty opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ) : (
                    <p className={cn('text-sm', lead.whatsapp_number ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                      {lead.whatsapp_number || 'No disponible'}
                    </p>
                  )}
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-start gap-3">
                <FaInstagram size={15} className="shrink-0 mt-2" style={{ color: '#E1306C' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Instagram</p>
                  {editingField === 'instagram_id' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') cancelFieldEdit() }}
                        placeholder="ID o usuario de Instagram"
                        className="flex-1 text-sm px-2.5 py-1.5 border border-[#1B2B8C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                      />
                      <button onClick={saveField} disabled={savingField} className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg disabled:opacity-50 transition-colors">
                        {savingField ? <Spinner state="working" /> : <Check size={14} />}
                      </button>
                      <button onClick={cancelFieldEdit} disabled={savingField} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : canEditContacto ? (
                    <button onClick={() => startEditField('instagram_id', lead.instagram_id ?? '')} className="group flex items-center gap-2 w-full text-left">
                      <span className={cn('text-sm break-all', lead.instagram_id ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                        {lead.instagram_id || 'No disponible'}
                      </span>
                      <Pencil size={12} className="text-empty opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ) : (
                    <p className={cn('text-sm break-all', lead.instagram_id ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                      {lead.instagram_id || 'No disponible'}
                    </p>
                  )}
                </div>
              </div>

              {/* Facebook */}
              <div className="flex items-start gap-3">
                <FaFacebookMessenger size={15} className="shrink-0 mt-2" style={{ color: '#0084ff' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Facebook</p>
                  {editingField === 'facebook_id' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') cancelFieldEdit() }}
                        placeholder="ID de Facebook/Messenger"
                        className="flex-1 text-sm px-2.5 py-1.5 border border-[#1B2B8C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                      />
                      <button onClick={saveField} disabled={savingField} className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg disabled:opacity-50 transition-colors">
                        {savingField ? <Spinner state="working" /> : <Check size={14} />}
                      </button>
                      <button onClick={cancelFieldEdit} disabled={savingField} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : canEditContacto ? (
                    <button onClick={() => startEditField('facebook_id', lead.facebook_id ?? '')} className="group flex items-center gap-2 w-full text-left">
                      <span className={cn('text-sm break-all', lead.facebook_id ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                        {lead.facebook_id || 'No disponible'}
                      </span>
                      <Pencil size={12} className="text-empty opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ) : (
                    <p className={cn('text-sm break-all', lead.facebook_id ? 'text-gray-700 dark:text-gray-300' : 'text-empty italic')}>
                      {lead.facebook_id || 'No disponible'}
                    </p>
                  )}
                </div>
              </div>

              {/* Primer contacto — read-only */}
              <div className="flex items-start gap-3">
                <Calendar size={15} className="text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Primer contacto</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(lead.fecha_primer_contacto)}</p>
                </div>
              </div>
            </div>

            {/* Etiquetas */}
            <div className="pt-4 mt-4 border-t border-gray-50 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Tag size={12} /> Etiquetas
                </p>
                {canManageEtiquetas && (
                  <button
                    onClick={() => setShowNuevaEtiquetaModal(true)}
                    className="text-xs font-medium text-[#1B2B8C] hover:underline"
                  >
                    Nueva etiqueta
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {etiquetasContactoError ? (
                  <p className="text-xs text-red-500 dark:text-red-400">No se pudo cargar</p>
                ) : etiquetasContacto.length === 0 && (
                  <p className="text-sm text-empty italic">Sin etiquetas</p>
                )}
                {etiquetasContacto.map((et) => (
                  <span
                    key={et.id}
                    className="inline-flex items-center gap-1 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
                    style={{ backgroundColor: et.color, color: getContrastTextColor(et.color) }}
                  >
                    {et.nombre}
                    {canManageEtiquetas && (
                      <button
                        onClick={() => quitarEtiqueta(et.id)}
                        disabled={quitandoEtiquetaId === et.id}
                        className="hover:opacity-70 disabled:opacity-50 transition-opacity"
                      >
                        {quitandoEtiquetaId === et.id ? <Spinner state="working" /> : <X size={10} />}
                      </button>
                    )}
                  </span>
                ))}

                {canManageEtiquetas && (
                  <div ref={etiquetaDropdownRef} className="relative">
                    <button
                      onClick={() => setShowEtiquetaDropdown((v) => !v)}
                      title="Agregar etiqueta"
                      className="w-6 h-6 flex items-center justify-center rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] hover:border-[#1B2B8C] dark:hover:border-[#4A9FD8] transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    <AnimatePresence>
                      {showEtiquetaDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-2 z-20 w-48 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-lg py-1"
                        >
                          {catalogoEtiquetasError ? (
                            <p className="px-3 py-2 text-xs text-red-500 dark:text-red-400">No se pudo cargar</p>
                          ) : etiquetasDisponibles.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 italic">No hay más etiquetas disponibles</p>
                          ) : (
                            etiquetasDisponibles.map((et) => (
                              <button
                                key={et.id}
                                onClick={() => asignarEtiqueta(et.id)}
                                disabled={asignandoEtiquetaId === et.id}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                                {et.nombre}
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Canales vinculados — solo comercial/admin */}
            {canAssign && (
              <div className="pt-4 mt-4 border-t border-gray-50 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Canales vinculados</p>
                  <button
                    onClick={() => setShowVincularModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2B8C] hover:underline"
                  >
                    <Link2 size={12} /> Vincular lead
                  </button>
                </div>

                {vinculadosError ? (
                  <p className="text-xs text-red-500 dark:text-red-400">No se pudo cargar</p>
                ) : vinculados.length === 0 ? (
                  <p className="text-sm text-empty italic">Sin leads vinculados</p>
                ) : (
                  <div className="space-y-2">
                    {vinculados.map((v) => (
                      <div key={v.vinculacion_id} className="flex items-center gap-2.5 group">
                        <CanalIcon canal={v.canal} size={14} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{v.nombre}</p>
                          {v.telefono && <p className="text-xs text-gray-500 dark:text-gray-400">{v.telefono}</p>}
                        </div>
                        <button
                          onClick={() => desvincularLead(v.id)}
                          disabled={desvinculandoId === v.id}
                          className="shrink-0 p-1 text-empty hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Desvincular"
                        >
                          {desvinculandoId === v.id ? <Spinner state="working" /> : <X size={13} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {sugerencias.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sugerencias por teléfono</p>
                    <div className="space-y-2">
                      {sugerencias.map((s) => (
                        <div key={s.id} className="flex items-center gap-2.5">
                          <CanalIcon canal={s.canal} size={14} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{s.nombre}</p>
                            {s.telefono && <p className="text-xs text-gray-500 dark:text-gray-400">{s.telefono}</p>}
                          </div>
                          <button
                            onClick={() => vincularLead(s.id)}
                            disabled={vinculando}
                            className="shrink-0 text-xs font-medium text-[#1B2B8C] hover:underline disabled:opacity-50"
                          >
                            Vincular
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Información */}
          <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Información</h3>
            <div className="space-y-3">

              {/* Vendedor asignado */}
              <div className="flex items-start gap-3">
                <User size={15} className="text-gray-500 dark:text-gray-400 shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendedor asignado</p>
                  {canAssign ? (
                    <div className="relative">
                      <select
                        value={lead.vendedor_asignado_id ?? ''}
                        onChange={(e) => assignVendor(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={savingVendor}
                        className={cn(
                          'w-full appearance-none text-sm px-2.5 py-1.5 pr-7 border border-gray-200 dark:border-white/10 rounded-lg',
                          'focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C]',
                          'bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all disabled:opacity-60 cursor-pointer'
                        )}
                      >
                        <option value="">Sin asignar</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} ({ROL_LABELS[u.rol]})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                      {usuariosError && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">No se pudo cargar la lista de vendedores</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {lead.vendedor_nombre ?? <span className="text-empty">Sin asignar</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Lead score */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Lead score</p>
                {canAssign ? (
                  <div className="relative">
                    <select
                      value={lead.lead_score}
                      onChange={(e) => updateLeadScore(e.target.value as LeadScore)}
                      disabled={savingScore}
                      className={cn(
                        'w-full appearance-none text-sm font-medium px-2.5 py-1.5 pr-7 rounded-lg border-0',
                        'focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20',
                        'transition-all disabled:opacity-60 cursor-pointer',
                        getLeadScoreColor(lead.lead_score)
                      )}
                    >
                      {LEAD_SCORE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{LEAD_SCORE_LABELS[opt]}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <span className={cn('inline-flex text-sm font-medium px-2.5 py-1 rounded-lg', getLeadScoreColor(lead.lead_score))}>
                    {LEAD_SCORE_LABELS[lead.lead_score]}
                  </span>
                )}
                {canAssign && lead.lead_score_manual && (
                  <button
                    onClick={resetLeadScoreAuto}
                    disabled={savingScore}
                    className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] transition-colors disabled:opacity-60"
                  >
                    Volver a cálculo automático
                  </button>
                )}
              </div>

              {/* Última interacción */}
              <div className="flex items-start gap-3">
                <Calendar size={15} className="text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Última interacción</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(lead.fecha_ultima_interaccion)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Estado del lead */}
          <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Estado del lead</h3>
            <div className="space-y-1.5">
              {ESTADOS.map((e) => (
                <motion.button
                  key={e}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => updateEstado(e)}
                  disabled={savingEstado}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    lead.estado_lead === e
                      ? e === 'en_atencion_humana'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-[#1B2B8C] text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
  <span>{ESTADO_LABELS[e]}</span>
                  {lead.estado_lead === e && (
                    <motion.div layoutId="estado-indicator" className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Agente Mind — pause/resume */}
          {canControlAgent && (
            <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Agente Mind</h3>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={toggleAgente}
                disabled={savingAgente}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-60',
                  lead.agente_pausado
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                )}
              >
                {lead.agente_pausado ? (
                  <><Play size={14} /> Reactivar agente Mind</>
                ) : (
                  <><Pause size={14} /> Pausar agente Mind</>
                )}
              </motion.button>
              {lead.agente_pausado && lead.pausa_hasta && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Hasta {formatDateTime(lead.pausa_hasta)}
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notas internas</h3>
              {notasSinRevisar > 0 && (
                <span className="text-xs font-medium bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                  {notasSinRevisar} sin revisar
                </span>
              )}
            </div>

            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
              {notasError ? (
                <ErrorState message="No se pudieron cargar las notas" onRetry={() => mutateNotas()} />
              ) : notas.length === 0 ? (
                <p className="text-sm text-empty italic">Sin notas</p>
              ) : (
                notas.map((nota) => (
                  <div key={nota.id} className="flex items-start gap-2.5 group">
                    <button
                      onClick={() => toggleNotaRevisada(nota)}
                      disabled={togglingNotaId === nota.id}
                      className={cn(
                        'mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors disabled:opacity-60',
                        nota.revisada
                          ? 'bg-[#1B2B8C] border-[#1B2B8C]'
                          : 'border-gray-300 dark:border-gray-600 hover:border-[#1B2B8C] dark:hover:border-[#4A9FD8]'
                      )}
                      title={nota.revisada ? 'Marcar como no revisada' : 'Marcar como revisada'}
                    >
                      {nota.revisada && <Check size={11} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm whitespace-pre-wrap',
                        nota.revisada ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {nota.contenido}
                      </p>
                      <p className="text-xs text-empty mt-0.5">
                        {nota.usuario_nombre ? `${nota.usuario_nombre} · ` : ''}{formatDateTime(nota.fecha_creacion)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addNota() }}
                placeholder="Agregar nota…"
                className="flex-1 min-w-0 text-sm px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={addNota}
                disabled={savingNota || !nuevaNota.trim()}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1B2B8C' }}
              >
                {savingNota ? <Spinner state="working" /> : <Plus size={14} />}
                Agregar
              </button>
            </div>
          </div>

        </div>

        {/* Chat history */}
        <div
          className="lg:col-span-2 bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm flex flex-col overflow-hidden"
          style={{ minHeight: 500, maxHeight: 'calc(100vh - 180px)' }}
        >
          <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Historial de conversación</h3>
            <span className="text-xs bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              {historialFiltrado.length} mensajes
            </span>
            {!isLoading && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-500 dark:text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                En vivo
              </span>
            )}
          </div>

          {banner && (
            <div className={cn('flex items-center gap-2.5 px-5 py-2.5 border-b text-sm font-medium', banner.className)}>
              <banner.Icon size={16} className="shrink-0" />
              <span>{banner.label}</span>
            </div>
          )}

          {historialCompleto.length > 0 && (
            <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-gray-50 dark:border-white/5 overflow-x-auto">
              <button
                onClick={() => setCanalFiltro('todos')}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  canalFiltro === 'todos' ? 'text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                )}
                style={canalFiltro === 'todos' ? { backgroundColor: '#1B2B8C' } : undefined}
              >
                Todos
              </button>
              {CANAL_ORDER.filter((c) => canalesPresentes.includes(c)).map((c) => {
                const config = CANAL_CONFIG[c]
                const active = canalFiltro === c
                return (
                  <button
                    key={c}
                    onClick={() => setCanalFiltro(c)}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      active ? 'text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    )}
                    style={active ? { backgroundColor: config.color } : undefined}
                  >
                    <CanalIcon canal={c} size={11} monochrome={active} />
                    {config.label}
                  </button>
                )
              })}
            </div>
          )}

          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-gray-50/50 dark:bg-black/10"
          >
            {historialFiltrado.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {historialCompleto.length === 0 ? 'Sin conversaciones aún' : 'Sin mensajes en este canal'}
                </p>
              </div>
            ) : (
              <div ref={messagesWrapperRef} className="space-y-3">
              {historialFiltrado.map((msg, i) => {
                const isUser = msg.rol === 'user'
                const isAssistant = msg.rol === 'assistant'
                const isVendedor = msg.rol === 'vendedor'
                const isSystem = msg.rol === 'system'
                return (
                  <motion.div
                    key={msg.id}
                    custom={i}
                    variants={bubbleVariants}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      'flex',
                      isSystem ? 'justify-center' : isUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {isSystem ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                        {msg.contenido}
                      </span>
                    ) : (
                      <div className={cn('max-w-[75%] group', isUser ? 'items-end' : 'items-start')}>
                        <div className={cn(
                          'rounded-2xl text-sm leading-relaxed shadow-sm',
                          msg.imagen_url ? 'p-1.5' : 'px-4 py-2.5',
                          isUser
                            ? 'bg-[#1B2B8C] text-white rounded-tr-sm'
                            : 'bg-white dark:bg-midnight-surface text-gray-800 dark:text-gray-200 rounded-tl-sm'
                        )}>
                          {msg.imagen_url && (
                            <ChatImage src={msg.imagen_url} onOpen={() => setLightboxImg(msg.imagen_url as string)} />
                          )}
                          {msg.contenido && msg.contenido !== '[Imagen]' && (
                            <p className={cn(msg.imagen_url && 'px-2 pt-1.5')}>{msg.contenido}</p>
                          )}
                        </div>
                        <p className={cn(
                          'flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
                          isUser ? 'justify-end' : 'justify-start'
                        )}>
                          <CanalIcon canal={msg.canal} size={10} />
                          <span>
                            {formatDateTime(msg.timestamp)}
                            {isAssistant && ' · Mind AI'}
                            {isVendedor && ' · Vendedor'}
                          </span>
                        </p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
              </div>
            )}
          </div>

          {canResponder && (
            <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-midnight-surface">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Responder como vendedor</h4>

              {imagenPreviewUrl && (
                <div className="relative inline-block mb-2">
                  {/* next/image no soporta blob: URLs — imagenPreviewUrl viene de
                      URL.createObjectURL() para previsualizar el archivo antes de subirlo. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagenPreviewUrl}
                    alt="Vista previa"
                    className="w-[60px] h-[60px] object-cover rounded-lg border border-gray-200 dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={quitarImagenAdjunta}
                    title="Quitar imagen"
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-red-600 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              <div className="flex items-start gap-2">
                <textarea
                  value={mensajeRespuesta}
                  onChange={(e) => setMensajeRespuesta(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  rows={2}
                  className="flex-1 min-w-0 text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar imagen"
                  className="shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-[#1B2B8C] dark:hover:text-[#4A9FD8] hover:bg-[#1B2B8C]/5 dark:hover:bg-[#4A9FD8]/10 rounded-lg transition-colors"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleSeleccionarImagen}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <CanalRespuestaSelect
                  opciones={canalesRespuestaOpciones}
                  value={canalRespuestaSel}
                  onChange={setCanalRespuestaSel}
                />
                <button
                  onClick={enviarRespuesta}
                  disabled={enviandoRespuesta || subiendoImagen || (!mensajeRespuesta.trim() && !imagenAdjunta) || !canalRespuestaSel}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#1B2B8C' }}
                >
                  {(enviandoRespuesta || subiendoImagen) ? <Spinner state="working" /> : <Send size={14} />}
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: vincular lead */}
      <AnimatePresence>
        {showVincularModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVincularModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-md p-5 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vincular lead</h3>
                <button onClick={() => setShowVincularModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={16} />
                </button>
              </div>
              <input
                autoFocus
                type="text"
                value={busquedaVinculo}
                onChange={(e) => setBusquedaVinculo(e.target.value)}
                placeholder="Buscar por nombre o teléfono…"
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 mb-3"
              />
              <div className="flex-1 overflow-y-auto space-y-1">
                {busquedaVinculo.trim().length < 2 ? (
                  <p className="text-sm text-empty italic text-center py-4">Escribe al menos 2 caracteres</p>
                ) : busquedaError ? (
                  <p className="text-xs text-red-500 dark:text-red-400 text-center py-4">No se pudo cargar</p>
                ) : resultadosVinculo.length === 0 ? (
                  <p className="text-sm text-empty italic text-center py-4">Sin resultados</p>
                ) : (
                  resultadosVinculo.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => vincularLead(r.id)}
                      disabled={vinculando}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                    >
                      <CanalIcon canal={r.canal} size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{r.nombre}</p>
                        {r.telefono && <p className="text-xs text-gray-500 dark:text-gray-400">{r.telefono}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: eliminar lead */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">¿Eliminar este lead?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Se eliminará todo su historial y notas. Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteLead}
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

      {/* Modal: nueva etiqueta */}
      <AnimatePresence>
        {showNuevaEtiquetaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !creandoEtiqueta && setShowNuevaEtiquetaModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-midnight-surface rounded-xl shadow-lg w-full max-w-sm p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Nueva etiqueta</h3>
              <form onSubmit={crearEtiqueta} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre</label>
                  <input
                    autoFocus
                    required
                    maxLength={50}
                    value={nuevaEtiquetaNombre}
                    onChange={(e) => setNuevaEtiquetaNombre(e.target.value)}
                    placeholder="Ej: VIP"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={nuevaEtiquetaColor}
                      onChange={(e) => setNuevaEtiquetaColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer"
                    />
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: nuevaEtiquetaColor }}
                    >
                      {nuevaEtiquetaNombre.trim() || 'Vista previa'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNuevaEtiquetaModal(false)}
                    disabled={creandoEtiqueta}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <Button type="submit" size="sm" loading={creandoEtiqueta}>
                    Crear etiqueta
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Lightbox: imagen del historial a pantalla completa */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <button
              onClick={() => setLightboxImg(null)}
              title="Cerrar"
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X size={28} />
            </button>
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={lightboxImg}
              alt="Imagen ampliada"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
