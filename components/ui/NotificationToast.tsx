'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, UserCheck, PauseCircle } from 'lucide-react'
import CanalIcon from './CanalIcon'
import { timeAgo } from '@/lib/utils'
import { redirectToLoginExpired } from '@/lib/fetcher'
import { requestNotificationPermission, showNativeNotification } from '@/lib/notifications'
import type { NotifLead, NotifType } from '@/app/api/notificaciones/route'

interface Notification {
  key: string
  leadId: number
  type: NotifType
  nombre: string
  canal: string
  lead_score: string
  fecha: string
  addedAt: number
}

const SEEN_LS_KEY = 'mind_crm_notif_seen'
const PERMISSION_ASKED_LS_KEY = 'mind_crm_notif_permission_asked'
const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 8000

function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  try {
    if (localStorage.getItem(PERMISSION_ASKED_LS_KEY)) return
    localStorage.setItem(PERMISSION_ASKED_LS_KEY, '1')
  } catch { /* localStorage might not be available */ }
  if (window.Notification.permission === 'default') {
    requestNotificationPermission()
  }
}

function notifyBrowser(leadId: number, nombre: string, canal: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (!document.hidden) return
  showNativeNotification(
    'Mind CRM — Bullpadel Ecuador',
    `Nuevo mensaje de ${nombre} por ${canal}`,
    `/leads/${leadId}`,
    `lead-${leadId}`
  )
}

const TYPE_CONFIG: Record<NotifType, {
  icon: React.ElementType
  color: string
  borderColor: string
  title: string
}> = {
  lead_caliente: { icon: Flame,        color: '#CE142B', borderColor: 'border-l-[#CE142B]', title: 'Lead caliente'     },
  asignacion:    { icon: UserCheck,    color: '#1B2B8C', borderColor: 'border-l-[#1B2B8C]', title: 'Lead asignado'     },
  pausa:         { icon: PauseCircle,  color: '#F97316', borderColor: 'border-l-[#F97316]', title: 'En atención humana' },
}

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_LS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function markSeen(key: string) {
  try {
    const seen = getSeenIds()
    seen.add(key)
    // Cap at 500 to avoid unbounded growth
    const arr = Array.from(seen).slice(-500)
    localStorage.setItem(SEEN_LS_KEY, JSON.stringify(arr))
  } catch { /* localStorage might not be available */ }
}

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => {
      if (r.status === 401) {
        redirectToLoginExpired()
        return { notifications: [] }
      }
      return r.ok ? r.json() : { notifications: [] }
    })
    .catch(() => ({ notifications: [] }))

// ── Individual card ─────────────────────────────────────────────
function NotifCard({
  notif,
  onDismiss,
  onClick,
}: {
  notif: Notification
  onDismiss: (key: string) => void
  onClick: (leadId: number) => void
}) {
  const cfg = TYPE_CONFIG[notif.type]
  const Icon = cfg.icon

  useEffect(() => {
    const t = setTimeout(() => onDismiss(notif.key), AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [notif.key, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className={`relative pointer-events-auto w-80 bg-white dark:bg-midnight-surface rounded-xl shadow-lg border border-gray-100 dark:border-midnight-border border-l-4 ${cfg.borderColor} overflow-hidden`}
    >
      <div
        className="flex items-start gap-3 p-4 pr-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        onClick={() => onClick(notif.leadId)}
      >
        {/* Icon */}
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${cfg.color}15` }}
        >
          <Icon size={16} style={{ color: cfg.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{cfg.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{notif.nombre}</p>
            <span className="text-empty">·</span>
            <CanalIcon canal={notif.canal} size={12} showLabel />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo(notif.fecha)}</p>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notif.key) }}
        className="absolute top-3 right-3 p-1 text-empty hover:text-gray-500 dark:hover:text-gray-400 transition-colors rounded"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

// ── Main component ──────────────────────────────────────────────
export default function NotificationToast() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const { data } = useSWR<{ notifications: NotifLead[] }>(
    '/api/notificaciones',
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    ensureNotificationPermission()
  }, [])

  // Clic en la notificación nativa (mostrada vía Service Worker) navega al lead correspondiente
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
        router.push(event.data.url)
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [router])

  useEffect(() => {
    if (!data?.notifications?.length) return
    const seen = getSeenIds()
    const fresh: Notification[] = []

    for (const n of data.notifications) {
      const key = `${n.id}_${n.type}`
      if (seen.has(key)) continue
      markSeen(key)
      fresh.push({
        key,
        leadId: n.id,
        type: n.type,
        nombre: n.nombre,
        canal: n.canal,
        lead_score: n.lead_score,
        fecha: n.fecha_ultima_interaccion,
        addedAt: Date.now(),
      })
    }

    if (fresh.length > 0) {
      setNotifications((prev) => [...fresh, ...prev].slice(0, MAX_VISIBLE))
      for (const n of fresh) {
        notifyBrowser(n.leadId, n.nombre, n.canal)
      }
    }
  }, [data])

  const dismiss = useCallback((key: string) => {
    setNotifications((prev) => prev.filter((n) => n.key !== key))
  }, [])

  const navigate = useCallback((leadId: number) => {
    router.push(`/leads/${leadId}`)
  }, [router])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <NotifCard key={n.key} notif={n} onDismiss={dismiss} onClick={navigate} />
        ))}
      </AnimatePresence>
    </div>
  )
}
