import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { MetricaDefinicion } from '@/lib/types'

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  if (typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'Solo se puede actualizar el campo activo' }, { status: 400 })
  }

  const result = await query(
    'UPDATE public.metricas_definiciones SET activo = $1 WHERE id = $2 RETURNING id',
    [body.activo, id]
  )
  if (result.length === 0) return NextResponse.json({ error: 'Métrica no encontrada' }, { status: 404 })

  const metrica = await queryOne<MetricaDefinicion>(
    `SELECT md.*, u.nombre as creado_por_nombre,
        EXISTS (SELECT 1 FROM public.campanas_metricas_valores cmv WHERE cmv.metrica_definicion_id = md.id) as tiene_valores
     FROM public.metricas_definiciones md
     LEFT JOIN public.usuarios_crm u ON u.id = md.creado_por
     WHERE md.id = $1`,
    [id]
  )

  return NextResponse.json({ metrica })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const metrica = await queryOne<{ es_default: boolean }>(
    'SELECT es_default FROM public.metricas_definiciones WHERE id = $1',
    [id]
  )
  if (!metrica) return NextResponse.json({ error: 'Métrica no encontrada' }, { status: 404 })
  if (metrica.es_default) {
    return NextResponse.json({ error: 'No se puede eliminar una métrica del sistema. Desactívala en su lugar.' }, { status: 400 })
  }

  const [{ n: tieneValores }] = await query<{ n: string }>(
    'SELECT COUNT(*) as n FROM public.campanas_metricas_valores WHERE metrica_definicion_id = $1',
    [id]
  )
  if (Number(tieneValores) > 0) {
    return NextResponse.json({ error: 'Esta métrica ya tiene valores registrados. Desactívala en lugar de eliminarla.' }, { status: 400 })
  }

  await query('DELETE FROM public.metricas_definiciones WHERE id = $1', [id])
  return NextResponse.json({ success: true })
}
