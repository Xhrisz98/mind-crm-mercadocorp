import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { PlantillaEmail } from '@/lib/types'

function canAccess(rol: string): boolean {
  return rol === 'admin' || rol === 'comercial'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (typeof body.nombre === 'string') {
    if (!body.nombre.trim()) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    updates.push(`nombre = $${idx++}`); values.push(body.nombre.trim())
  }
  if (typeof body.asunto === 'string') {
    updates.push(`asunto = $${idx++}`); values.push(body.asunto.trim() || null)
  }
  if (typeof body.contenido_html === 'string') {
    if (!body.contenido_html.trim()) return NextResponse.json({ error: 'El contenido HTML no puede estar vacío' }, { status: 400 })
    updates.push(`contenido_html = $${idx++}`); values.push(body.contenido_html)
  }

  if (updates.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  values.push(id)
  const plantilla = await queryOne<PlantillaEmail>(
    `UPDATE public.plantillas_email SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  if (!plantilla) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  return NextResponse.json({ plantilla })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const result = await query('DELETE FROM public.plantillas_email WHERE id = $1 RETURNING id', [id])
  if (result.length === 0) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
