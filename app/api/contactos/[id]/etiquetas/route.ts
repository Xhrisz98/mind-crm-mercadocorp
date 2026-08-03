import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { canAccessLead } from '@/lib/leadAccess'
import type { Etiqueta } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const etiquetas = await query<Etiqueta>(
    `SELECT e.* FROM etiquetas e
     JOIN contacto_etiquetas ce ON ce.etiqueta_id = e.id
     WHERE ce.contacto_id = $1
     ORDER BY e.nombre ASC`,
    [id]
  )

  return NextResponse.json({ etiquetas })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') {
    return NextResponse.json({ error: 'Sin permiso para gestionar etiquetas' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const etiquetaId = parseInt(String(body.etiqueta_id))
  if (Number.isNaN(etiquetaId)) {
    return NextResponse.json({ error: 'etiqueta_id inválido' }, { status: 400 })
  }

  const contacto = await queryOne('SELECT id FROM contactos WHERE id = $1', [id])
  if (!contacto) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })

  const etiqueta = await queryOne<Etiqueta>('SELECT * FROM etiquetas WHERE id = $1', [etiquetaId])
  if (!etiqueta) return NextResponse.json({ error: 'Etiqueta no encontrada' }, { status: 404 })

  await query(
    `INSERT INTO contacto_etiquetas (contacto_id, etiqueta_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id, etiquetaId]
  )

  return NextResponse.json({ etiqueta }, { status: 201 })
}
