'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BellOff, X } from 'lucide-react'
import { getNotificationPermission, NOTIF_BANNER_DISMISSED_KEY } from '@/lib/notifications'

export default function NotificationPermissionBanner() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getNotificationPermission() !== 'denied') return
    try {
      if (localStorage.getItem(NOTIF_BANNER_DISMISSED_KEY)) return
    } catch { /* localStorage might not be available */ }
    setVisible(true)
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(NOTIF_BANNER_DISMISSED_KEY, '1')
    } catch { /* localStorage might not be available */ }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed bottom-4 left-4 lg:left-[280px] z-40 flex items-center gap-3 bg-white dark:bg-midnight-surface rounded-xl border border-gray-200 dark:border-midnight-border shadow-lg px-4 py-3 max-w-sm"
        >
          <BellOff size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
          <p className="text-xs text-gray-600 dark:text-gray-300 flex-1">
            Las notificaciones del navegador están desactivadas.{' '}
            <button
              onClick={() => { router.push('/configuracion'); dismiss() }}
              className="font-medium text-[#1B2B8C] dark:text-[#4A9FD8] hover:underline"
            >
              Activar en Configuración
            </button>
          </p>
          <button onClick={dismiss} className="shrink-0 p-1 text-empty hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
