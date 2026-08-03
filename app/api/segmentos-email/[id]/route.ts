import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { countBySegmentoFiltros } from '@/lib/emailSegments'
import type { SegmentoEmail } from '@/lib/types'

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
    updates.push(`nombre = $${idx++}`)
    values.push(body.nombre.trim())
  }
  if (body.filtros && typeof body.filtros === 'object') {
    updates.push(`filtros = $${idx++}`)
    values.push(JSON.stringify(body.filtros))
  }

  if (updates.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  values.push(id)
  const segmento = await queryOne<SegmentoEmail>(
    `UPDATE public.segmentos_email SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  if (!segmento) return NextResponse.json({ error: 'Segmento no encontrado' }, { status: 404 })

  const count = await countBySegmentoFiltros(segmento.filtros)
  return NextResponse.json({ segmento, count })
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

  try {
    const result = await query('DELETE FROM public.segmentos_email WHERE id = $1 RETURNING id', [id])
    if (result.length === 0) return NextResponse.json({ error: 'Segmento no encontrado' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar este segmento porque está siendo usado por una o más campañas.' },
        { status: 409 }
      )
    }
    throw err
  }
}
