import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const subscription = body?.subscription

  if (!subscription || typeof subscription !== 'object' || !subscription.endpoint) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  const usuarioId = parseInt(user.sub)
  const endpoint = subscription.endpoint as string

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM push_subscriptions WHERE usuario_id = $1 AND subscription->>'endpoint' = $2",
    [usuarioId, endpoint]
  )

  if (existing) {
    await query(
      'UPDATE push_subscriptions SET subscription = $1 WHERE id = $2',
      [JSON.stringify(subscription), existing.id]
    )
  } else {
    await query(
      'INSERT INTO push_subscriptions (usuario_id, subscription) VALUES ($1, $2)',
      [usuarioId, JSON.stringify(subscription)]
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const endpoint = body?.endpoint

  const usuarioId = parseInt(user.sub)

  if (endpoint) {
    await query(
      "DELETE FROM push_subscriptions WHERE usuario_id = $1 AND subscription->>'endpoint' = $2",
      [usuarioId, endpoint]
    )
  } else {
    await query('DELETE FROM push_subscriptions WHERE usuario_id = $1', [usuarioId])
  }

  return NextResponse.json({ success: true })
}
