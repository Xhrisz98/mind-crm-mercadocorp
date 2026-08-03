import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json()
  const vinculadoId = parseInt(body.contacto_vinculado_id)
  if (isNaN(vinculadoId)) return NextResponse.json({ error: 'contacto_vinculado_id inválido' }, { status: 400 })
  if (vinculadoId === id) return NextResponse.json({ error: 'No puedes vincular un lead consigo mismo' }, { status: 400 })

  const target = await queryOne('SELECT id FROM public.contactos WHERE id = $1', [vinculadoId])
  if (!target) return NextResponse.json({ error: 'Lead a vincular no encontrado' }, { status: 404 })

  const existente = await queryOne(
    `SELECT id FROM public.leads_vinculados
     WHERE (contacto_principal_id = $1 AND contacto_vinculado_id = $2)
        OR (contacto_principal_id = $2 AND contacto_vinculado_id = $1)`,
    [id, vinculadoId]
  )
  if (existente) return NextResponse.json({ error: 'Estos leads ya están vinculados' }, { status: 409 })

  await query(
    `INSERT INTO public.leads_vinculados (contacto_principal_id, contacto_vinculado_id, vinculado_por)
     VALUES ($1, $2, $3)`,
    [id, vinculadoId, parseInt(user.sub)]
  )

  return NextResponse.json({ ok: true }, { status: 201 })
}
