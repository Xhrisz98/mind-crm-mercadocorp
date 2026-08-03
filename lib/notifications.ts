export const NOTIF_PREF_KEY = 'mind_crm_notif_pref'
export const NOTIF_BANNER_DISMISSED_KEY = 'mind_crm_notif_banner_dismissed'
export const PUSH_ENABLED_KEY = 'mw_push_enabled'

export type NotifPermission = NotificationPermission | 'unsupported'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotifPermission {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

function savePreference(permission: NotifPermission) {
  try {
    localStorage.setItem(NOTIF_PREF_KEY, permission)
  } catch { /* localStorage might not be available */ }
}

export function getPushEnabledPreference(): boolean {
  try {
    return localStorage.getItem(PUSH_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function savePushEnabledPreference(enabled: boolean) {
  try {
    localStorage.setItem(PUSH_ENABLED_KEY, String(enabled))
  } catch { /* localStorage might not be available */ }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  console.log('Registrando SW...')
  try {
    const existingRegistrations = await navigator.serviceWorker.getRegistrations()
    for (const existing of existingRegistrations) {
      const scriptUrl =
        existing.active?.scriptURL || existing.installing?.scriptURL || existing.waiting?.scriptURL || ''
      if (!scriptUrl.endsWith('/sw.js')) {
        console.log('Desregistrando SW anterior:', scriptUrl)
        await existing.unregister()
      }
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('SW registrado:', registration)
    return registration
  } catch (error) {
    console.error('Error SW:', error)
    return null
  }
}

export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    savePreference(result)
    return result
  } catch {
    return getNotificationPermission()
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) return false

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    console.log('applicationServerKey length:', applicationServerKey.length)
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    })
  }

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  })

  savePushEnabledPreference(true)
  return true
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false

  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint
  if (subscription) {
    await subscription.unsubscribe()
  }

  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })

  savePushEnabledPreference(false)
  return true
}

export async function showNativeNotification(title: string, body: string, url: string, tag?: string) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
  if (reg) {
    reg.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: tag || 'mind-crm-notification',
      data: { url },
    })
    return
  }

  try {
    const n = new Notification(title, { body, icon: '/logo.png' })
    n.onclick = () => {
      window.focus()
      window.location.href = url
    }
  } catch { /* browser may reject notification creation */ }
}
