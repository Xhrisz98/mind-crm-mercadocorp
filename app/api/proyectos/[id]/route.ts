import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Proyecto } from '@/lib/types'

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial' || rol === 'ventas'
}

const SELECT_PROYECTO = `
  SELECT p.*,
    c.nombre as cliente_nombre,
    n.nombre as negocio_nombre,
    u.nombre as creado_por_nombre,
    COUNT(t.id) as tareas_total,
    COUNT(t.id) FILTER (WHERE te.es_estado_final) as tareas_completadas,
    COUNT(t.id) FILTER (WHERE t.fecha_limite < CURRENT_DATE AND NOT te.es_estado_final) as tareas_vencidas,
    MIN(t.fecha_limite) FILTER (WHERE t.fecha_limite >= CURRENT_DATE AND NOT te.es_estado_final) as proxima_fecha_limite
  FROM public.proyectos p
  LEFT JOIN public.contactos c ON c.id = p.cliente_id
  LEFT JOIN public.negocios n ON n.id = p.negocio_id
  LEFT JOIN public.usuarios_crm u ON u.id = p.creado_por
  LEFT JOIN public.tareas t ON t.proyecto_id = p.id
  LEFT JOIN public.tareas_estados te ON te.id = t.tarea_estado_id
`
const GROUP_BY = 'GROUP BY p.id, c.nombre, n.nombre, u.nombre'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const proyecto = await queryOne<Proyecto>(`${SELECT_PROYECTO} WHERE p.id = $1 ${GROUP_BY}`, [id])
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  return NextResponse.json({ proyecto })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json()

  // visibilidad_cliente solo lo puede tocar admin/comercial (controla qué ve
  // el cliente en /portal) — ventas puede editar el resto de campos del
  // proyecto bajo la decisión de acceso de portafolio sin filtro.
  if ('visibilidad_cliente' in body && user.rol === 'ventas') {
    return NextResponse.json({ error: 'Solo admin o comercial puede cambiar la visibilidad para el cliente' }, { status: 403 })
  }

  const VISIBILIDADES_VALIDAS = ['ninguna', 'resumen', 'completo']
  if (body.visibilidad_cliente && !VISIBILIDADES_VALIDAS.includes(body.visibilidad_cliente)) {
    return NextResponse.json({ error: 'Visibilidad inválida' }, { status: 400 })
  }
  const ESTADOS_VALIDOS = ['activo', 'pausado', 'completado', 'cancelado']
  if (body.estado && !ESTADOS_VALIDOS.includes(body.estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const allowed = ['nombre', 'negocio_id', 'cliente_id', 'descripcion', 'fecha_inicio', 'fecha_fin_estimada', 'estado', 'visibilidad_cliente']
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
  const result = await query(`UPDATE public.proyectos SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`, values)
  if (result.length === 0) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const proyecto = await queryOne<Proyecto>(`${SELECT_PROYECTO} WHERE p.id = $1 ${GROUP_BY}`, [id])

  return NextResponse.json({ proyecto })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && !user.puede_eliminar) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const result = await query('DELETE FROM public.proyectos WHERE id = $1 RETURNING id', [id])
  if (result.length === 0) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}
