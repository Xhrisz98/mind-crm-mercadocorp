import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Proyecto } from '@/lib/types'

// DECISIÓN DE PRODUCTO: rol='ventas' ve/edita todos los proyectos, sin filtro
// por vendedor_asignado_id (a diferencia de Negocios/Leads) — ver
// scripts/004_proyectos_portal_cliente.sql y CLAUDE.md para el porqué y la
// migración a aislamiento estricto si un futuro cliente la necesita.
function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial' || rol === 'ventas'
}

// % de avance y "próxima fecha límite" en una sola query por agregación
// (COUNT/MIN con FILTER), no subconsultas por proyecto ni cálculo en
// frontend con el detalle completo de tareas de cada proyecto.
const SELECT_PROYECTOS = `
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

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('cliente_id')
  const estado = searchParams.get('estado')

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (clienteId) {
    conditions.push(`p.cliente_id = $${idx++}`)
    params.push(parseInt(clienteId))
  }
  if (estado) {
    conditions.push(`p.estado = $${idx++}`)
    params.push(estado)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const proyectos = await query<Proyecto>(
    `${SELECT_PROYECTOS} ${where} GROUP BY p.id, c.nombre, n.nombre, u.nombre ORDER BY p.fecha_creacion DESC`,
    params
  )

  // Tareas por estado agregadas sobre los mismos proyectos filtrados
  // (alimenta el gráfico de barras del portafolio) — segunda query porque
  // tareas_estados es dinámico (personalizable vía datos), no una columna fija.
  const proyectoIds = proyectos.map((p) => p.id)
  const tareasPorEstado = proyectoIds.length
    ? await query<{ id: number; nombre: string; color: string; orden: number; total: number }>(
        `SELECT te.id, te.nombre, te.color, te.orden, COUNT(t.id) as total
         FROM public.tareas_estados te
         LEFT JOIN public.tareas t ON t.tarea_estado_id = te.id AND t.proyecto_id = ANY($1::int[])
         GROUP BY te.id
         ORDER BY te.orden ASC`,
        [proyectoIds]
      )
    : []

  return NextResponse.json({ proyectos, tareasPorEstado })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const negocioId = body.negocio_id ? parseInt(body.negocio_id) : null
  const clienteId = body.cliente_id ? parseInt(body.cliente_id) : null
  const descripcion = body.descripcion || null
  const fechaInicio = body.fecha_inicio || null
  const fechaFinEstimada = body.fecha_fin_estimada || null
  const estado = body.estado || 'activo'

  const nuevo = await queryOne<{ id: number }>(
    `INSERT INTO public.proyectos
       (nombre, negocio_id, cliente_id, descripcion, fecha_inicio, fecha_fin_estimada, estado, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [nombre, negocioId, clienteId, descripcion, fechaInicio, fechaFinEstimada, estado, parseInt(user.sub)]
  )

  const proyecto = await queryOne<Proyecto>(
    `${SELECT_PROYECTOS} WHERE p.id = $1 GROUP BY p.id, c.nombre, n.nombre, u.nombre`,
    [nuevo!.id]
  )

  return NextResponse.json({ proyecto }, { status: 201 })
}
