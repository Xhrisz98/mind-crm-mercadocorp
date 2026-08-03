import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { query } from '@/lib/db'

interface WebPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface PushSubscriptionRow {
  id: number
  usuario_id: number
  subscription: WebPushSubscription
}

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL

  if (!publicKey || !privateKey || !email) {
    throw new Error('Faltan variables VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_EMAIL')
  }

  const subject = email.startsWith('mailto:') ? email : `mailto:${email}`
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export async function POST(req: NextRequest) {
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (!internalSecret || req.headers.get('x-internal-secret') !== internalSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    ensureVapidConfigured()
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const titulo = body?.titulo
  const bodyText = body?.body
  const url = body?.url
  const usuarioIds: number[] = Array.isArray(body?.usuario_ids) ? body.usuario_ids : []

  if (!titulo || !bodyText) {
    return NextResponse.json({ error: 'Faltan campos titulo o body' }, { status: 400 })
  }

  const rows =
    usuarioIds.length > 0
      ? await query<PushSubscriptionRow>(
          'SELECT id, usuario_id, subscription FROM push_subscriptions WHERE usuario_id = ANY($1)',
          [usuarioIds]
        )
      : await query<PushSubscriptionRow>('SELECT id, usuario_id, subscription FROM push_subscriptions')

  const payload = JSON.stringify({ title: titulo, body: bodyText, url: url || '/' })

  let enviados = 0
  let errores = 0

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload)
        enviados++
      } catch (err) {
        errores++
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]).catch(() => {})
        }
      }
    })
  )

  return NextResponse.json({ enviados, errores })
}
