import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Tarea } from '@/lib/types'

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial' || rol === 'ventas'
}

const SELECT_TAREA = `
  SELECT t.*,
    te.nombre as tarea_estado_nombre,
    te.color as tarea_estado_color,
    te.orden as tarea_estado_orden,
    te.es_estado_final,
    u.nombre as asignado_a_nombre,
    COALESCE(
      (SELECT json_agg(a.* ORDER BY a.fecha_creacion ASC)
       FROM public.tareas_adjuntos a WHERE a.tarea_id = t.id),
      '[]'
    ) as adjuntos
  FROM public.tareas t
  JOIN public.tareas_estados te ON te.id = t.tarea_estado_id
  LEFT JOIN public.usuarios_crm u ON u.id = t.asignado_a
`

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json()

  // visible_cliente solo lo puede tocar admin/comercial, igual que
  // proyectos.visibilidad_cliente (ver app/api/proyectos/[id]/route.ts).
  if ('visible_cliente' in body && user.rol === 'ventas') {
    return NextResponse.json({ error: 'Solo admin o comercial puede cambiar la visibilidad para el cliente' }, { status: 403 })
  }

  const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'urgente']
  if (body.prioridad && !PRIORIDADES_VALIDAS.includes(body.prioridad)) {
    return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 })
  }

  const allowed = ['titulo', 'descripcion', 'tarea_estado_id', 'prioridad', 'asignado_a', 'fecha_limite', 'visible_cliente']
  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = $${idx++}`)
      values.push(body[key])
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  values.push(id)
  const result = await query(`UPDATE public.tareas SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`, values)
  if (result.length === 0) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })

  const tarea = await queryOne<Tarea>(`${SELECT_TAREA} WHERE t.id = $1`, [id])

  return NextResponse.json({ tarea })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const result = await query('DELETE FROM public.tareas WHERE id = $1 RETURNING id', [id])
  if (result.length === 0) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })

  return NextResponse.json({ success: true })
}
