import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { ConfiguracionIntegracionesView } from '@/lib/types'

const KEYS = ['brevo_api_key', 'brevo_sender_email', 'brevo_sender_name'] as const

function maskApiKey(value: string): string {
  if (value.length <= 4) return '••••'
  return `${'•'.repeat(8)}${value.slice(-4)}`
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const rows = await query<{ clave: string; valor: string | null }>(
    `SELECT clave, valor FROM public.configuracion_integraciones WHERE clave = ANY($1)`,
    [KEYS]
  )
  const stored = Object.fromEntries(rows.map((r) => [r.clave, r.valor || '']))
  const apiKey = stored.brevo_api_key || ''

  const view: ConfiguracionIntegracionesView = {
    brevo_api_key_mask: apiKey ? maskApiKey(apiKey) : (process.env.BREVO_API_KEY ? 'Configurado vía variable de entorno' : null),
    brevo_sender_email: stored.brevo_sender_email || process.env.BREVO_SENDER_EMAIL || '',
    brevo_sender_name: stored.brevo_sender_name || process.env.BREVO_SENDER_NAME || '',
    configurado: !!(apiKey || process.env.BREVO_API_KEY),
  }

  return NextResponse.json(view)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const userId = parseInt(user.sub)

  const updates: { clave: string; valor: string }[] = []
  if (typeof body.brevo_api_key === 'string' && body.brevo_api_key.trim()) {
    updates.push({ clave: 'brevo_api_key', valor: body.brevo_api_key.trim() })
  }
  if (typeof body.brevo_sender_email === 'string') {
    updates.push({ clave: 'brevo_sender_email', valor: body.brevo_sender_email.trim() })
  }
  if (typeof body.brevo_sender_name === 'string') {
    updates.push({ clave: 'brevo_sender_name', valor: body.brevo_sender_name.trim() })
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que guardar' }, { status: 400 })
  }

  for (const { clave, valor } of updates) {
    await query(
      `INSERT INTO public.configuracion_integraciones (clave, valor, actualizado_por)
       VALUES ($1, $2, $3)
       ON CONFLICT (clave) DO UPDATE SET valor = $2, actualizado_por = $3, fecha_actualizacion = NOW()`,
      [clave, valor, userId]
    )
  }

  return NextResponse.json({ ok: true })
}
