import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Tarea } from '@/lib/types'

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial' || rol === 'ventas'
}

// Adjuntos anidados vía json_agg — el volumen por tarea es pequeño (imágenes
// subidas manualmente a una tarjeta de tarea), así que no justifica un
// endpoint aparte para listarlos por separado del tablero.
const SELECT_TAREAS = `
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const proyectoId = parseInt(params.id)
  if (Number.isNaN(proyectoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const tareas = await query<Tarea>(
    `${SELECT_TAREAS} WHERE t.proyecto_id = $1 ORDER BY te.orden ASC, t.fecha_creacion ASC`,
    [proyectoId]
  )

  return NextResponse.json({ tareas })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const proyectoId = parseInt(params.id)
  if (Number.isNaN(proyectoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const proyecto = await queryOne('SELECT id FROM public.proyectos WHERE id = $1', [proyectoId])
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const body = await req.json()
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  if (!titulo) return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })

  let tareaEstadoId = body.tarea_estado_id ? parseInt(body.tarea_estado_id) : null
  if (!tareaEstadoId) {
    const primerEstado = await queryOne<{ id: number }>(
      'SELECT id FROM public.tareas_estados ORDER BY orden ASC LIMIT 1'
    )
    if (!primerEstado) return NextResponse.json({ error: 'No hay estados de tarea configurados' }, { status: 500 })
    tareaEstadoId = primerEstado.id
  }

  const descripcion = body.descripcion || null
  const prioridad = body.prioridad || 'media'
  const asignadoA = body.asignado_a ? parseInt(body.asignado_a) : null
  const fechaLimite = body.fecha_limite || null
  const visibleCliente = body.visible_cliente !== undefined ? !!body.visible_cliente : true

  const nuevo = await queryOne<{ id: number }>(
    `INSERT INTO public.tareas
       (proyecto_id, titulo, descripcion, tarea_estado_id, prioridad, asignado_a, fecha_limite, visible_cliente)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [proyectoId, titulo, descripcion, tareaEstadoId, prioridad, asignadoA, fechaLimite, visibleCliente]
  )

  const tarea = await queryOne<Tarea>(`${SELECT_TAREAS} WHERE t.id = $1`, [nuevo!.id])

  return NextResponse.json({ tarea }, { status: 201 })
}
