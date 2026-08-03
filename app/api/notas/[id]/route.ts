import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { canAccessLead } from '@/lib/leadAccess'
import type { Nota } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const existing = await queryOne<{ contacto_id: number }>(
    'SELECT contacto_id FROM notas_crm WHERE id = $1',
    [id]
  )
  if (!existing) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

  if (!(await canAccessLead(user, existing.contacto_id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json()
  if (typeof body.revisada !== 'boolean') {
    return NextResponse.json({ error: 'revisada debe ser booleano' }, { status: 400 })
  }

  const nota = await queryOne<Nota>(
    `UPDATE notas_crm SET revisada = $1 WHERE id = $2 RETURNING *`,
    [body.revisada, id]
  )
  if (!nota) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

  return NextResponse.json({ nota })
}
