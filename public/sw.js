const NOTIFICATION_ICON = '/logo.png'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// El cliente (polling de SWR) pide mostrar una notificación nativa vía postMessage
// porque no hay un backend de Web Push — esto sigue funcionando con la pestaña en
// segundo plano y en PWAs instaladas (Android/iOS 16.4+), aunque no con el sitio
// totalmente cerrado (eso requeriría VAPID + push server).
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'SHOW_NOTIFICATION') return

  const { title, body, url, tag } = data
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: tag || 'mind-crm-notification',
      data: { url: url || '/' },
    })
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Mind CRM'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'mind-crm-push',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'NOTIFICATION_CLICK', url })
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
