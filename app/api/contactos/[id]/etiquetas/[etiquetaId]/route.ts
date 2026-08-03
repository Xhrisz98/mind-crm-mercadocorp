import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; etiquetaId: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') {
    return NextResponse.json({ error: 'Sin permiso para gestionar etiquetas' }, { status: 403 })
  }

  const id = parseInt(params.id)
  const etiquetaId = parseInt(params.etiquetaId)
  if (Number.isNaN(id) || Number.isNaN(etiquetaId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  await query(
    'DELETE FROM contacto_etiquetas WHERE contacto_id = $1 AND etiqueta_id = $2',
    [id, etiquetaId]
  )

  return NextResponse.json({ success: true })
}
