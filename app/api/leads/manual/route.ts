import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Contacto } from '@/lib/types'

const CANALES_VALIDOS = ['whatsapp', 'messenger', 'instagram', 'telegram', 'web', 'presencial']

function generarCanalUserId(): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `manual_${Date.now()}_${random}`
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin permiso para crear leads manualmente' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const canal = typeof body.canal === 'string' ? body.canal : ''

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!CANALES_VALIDOS.includes(canal)) {
    return NextResponse.json({ error: 'Canal principal inválido' }, { status: 400 })
  }

  const canalUserId = generarCanalUserId()

  const contacto = await queryOne<Contacto>(
    `INSERT INTO contactos (canal_user_id, canal, nombre, telefono, email, estado_lead, origen)
     VALUES ($1, $2, $3, $4, $5, 'inicial', 'manual')
     RETURNING *`,
    [canalUserId, canal, nombre, telefono || null, email || null]
  )

  return NextResponse.json({ lead: contacto }, { status: 201 })
}
