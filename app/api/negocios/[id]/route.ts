import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Negocio } from '@/lib/types'

const SELECT_NEGOCIO = `
  SELECT n.*,
    c.nombre as contacto_nombre,
    u.nombre as vendedor_nombre,
    pe.nombre as pipeline_estado_nombre,
    pe.color as pipeline_estado_color,
    pe.orden as pipeline_estado_orden,
    pe.es_estado_ganado,
    pe.es_estado_perdido
  FROM public.negocios n
  LEFT JOIN public.contactos c ON c.id = n.contacto_id
  LEFT JOIN public.usuarios_crm u ON u.id = n.vendedor_asignado_id
  JOIN public.pipeline_estados pe ON pe.id = n.pipeline_estado_id
`

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const negocioActual = await queryOne<{ vendedor_asignado_id: number | null }>(
    'SELECT vendedor_asignado_id FROM public.negocios WHERE id = $1',
    [id]
  )
  if (!negocioActual) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  if (user.rol === 'ventas' && negocioActual.vendedor_asignado_id !== parseInt(user.sub)) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json()

  const allowed = ['nombre', 'monto', 'pipeline_estado_id', 'contacto_id', 'descripcion_servicio', 'fecha_cierre_estimada', 'vendedor_asignado_id']
  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const key of allowed) {
    if (key in body) {
      if (key === 'vendedor_asignado_id' && user.rol === 'ventas') continue
      updates.push(`${key} = $${idx++}`)
      values.push(body[key])
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  updates.push('fecha_actualizacion = NOW()')
  values.push(id)

  await query(
    `UPDATE public.negocios SET ${updates.join(', ')} WHERE id = $${idx}`,
    values
  )

  const negocio = await queryOne<Negocio>(`${SELECT_NEGOCIO} WHERE n.id = $1`, [id])

  return NextResponse.json({ negocio })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && !user.puede_eliminar) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const result = await query('DELETE FROM public.negocios WHERE id = $1 RETURNING id', [id])
    if (result.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }
  } catch {
    return NextResponse.json(
      { error: 'No se puede eliminar: hay proyectos vinculados a este negocio' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true })
}
