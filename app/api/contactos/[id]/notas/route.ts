import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { canAccessLead } from '@/lib/leadAccess'
import type { Nota } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const notas = await query<Nota>(
    `SELECT n.id, n.contenido, n.revisada, n.fecha_creacion, u.nombre as usuario_nombre
     FROM public.notas_crm n
     LEFT JOIN public.usuarios_crm u ON u.id = n.usuario_id
     WHERE n.contacto_id = $1
     ORDER BY n.fecha_creacion DESC`,
    [id]
  )

  return NextResponse.json({ notas })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json()
  const contenido = (body.contenido as string | undefined)?.trim()
  if (!contenido) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })

  const nota = await query<Nota>(
    `INSERT INTO notas_crm (contacto_id, contenido, usuario_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [id, contenido, parseInt(user.sub)]
  )

  return NextResponse.json({ nota: { ...nota[0], usuario_nombre: user.nombre } }, { status: 201 })
}
