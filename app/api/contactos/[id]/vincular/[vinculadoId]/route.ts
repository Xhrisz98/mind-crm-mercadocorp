import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; vinculadoId: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  const vinculadoId = parseInt(params.vinculadoId)
  if (isNaN(id) || isNaN(vinculadoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await query(
    `DELETE FROM public.leads_vinculados
     WHERE (contacto_principal_id = $1 AND contacto_vinculado_id = $2)
        OR (contacto_principal_id = $2 AND contacto_vinculado_id = $1)`,
    [id, vinculadoId]
  )

  return NextResponse.json({ ok: true })
}
