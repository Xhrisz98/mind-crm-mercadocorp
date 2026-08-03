'use client'
import { useEffect } from 'react'
import { registerServiceWorker, subscribeToPush } from '@/lib/notifications'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker().then(() => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        subscribeToPush().catch((error) => console.error('Error en subscribeToPush:', error))
      }
    })
  }, [])

  return null
}
