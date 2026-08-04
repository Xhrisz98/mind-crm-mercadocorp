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

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q')
  const pipelineEstadoId = searchParams.get('pipeline_estado_id')

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (user.rol === 'ventas') {
    conditions.push(`n.vendedor_asignado_id = $${idx++}`)
    params.push(parseInt(user.sub))
  }

  if (search) {
    conditions.push(`(n.nombre ILIKE $${idx} OR c.nombre ILIKE $${idx})`)
    params.push(`%${search}%`)
    idx++
  }

  if (pipelineEstadoId) {
    conditions.push(`n.pipeline_estado_id = $${idx++}`)
    params.push(parseInt(pipelineEstadoId))
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const negocios = await query<Negocio>(
    `${SELECT_NEGOCIO} ${where} ORDER BY n.fecha_actualizacion DESC`,
    params
  )

  return NextResponse.json({ negocios })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const monto = Number(body.monto) || 0
  const contactoId = body.contacto_id ? parseInt(body.contacto_id) : null
  const descripcionServicio = body.descripcion_servicio || null
  const fechaCierreEstimada = body.fecha_cierre_estimada || null

  let pipelineEstadoId = body.pipeline_estado_id ? parseInt(body.pipeline_estado_id) : null
  if (!pipelineEstadoId) {
    const primerEstado = await queryOne<{ id: number }>(
      'SELECT id FROM public.pipeline_estados ORDER BY orden ASC LIMIT 1'
    )
    if (!primerEstado) return NextResponse.json({ error: 'No hay etapas de pipeline configuradas' }, { status: 500 })
    pipelineEstadoId = primerEstado.id
  }

  // ventas solo puede crear negocios asignados a sí mismo
  const vendedorAsignadoId =
    user.rol === 'ventas'
      ? parseInt(user.sub)
      : body.vendedor_asignado_id
      ? parseInt(body.vendedor_asignado_id)
      : null

  const nuevo = await queryOne<{ id: number }>(
    `INSERT INTO public.negocios
       (contacto_id, nombre, monto, pipeline_estado_id, descripcion_servicio, fecha_cierre_estimada, vendedor_asignado_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [contactoId, nombre, monto, pipelineEstadoId, descripcionServicio, fechaCierreEstimada, vendedorAsignadoId]
  )

  const negocio = await queryOne<Negocio>(`${SELECT_NEGOCIO} WHERE n.id = $1`, [nuevo!.id])

  return NextResponse.json({ negocio }, { status: 201 })
}
