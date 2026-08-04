import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { CampanaPublicidad, CampanaMetricaPorFecha } from '@/lib/types'

const SELECT_CAMPANA = `
  SELECT cp.*,
    c.nombre as cliente_nombre,
    u.nombre as creado_por_nombre,
    COALESCE(SUM(cm.impresiones), 0)::int as impresiones_total,
    COALESCE(SUM(cm.clics), 0)::int as clics_total,
    COALESCE(SUM(cm.conversiones), 0)::int as conversiones_total,
    COALESCE(SUM(cm.gasto), 0) as gasto_total
  FROM public.campanas_publicidad cp
  LEFT JOIN public.contactos c ON c.id = cp.cliente_id
  LEFT JOIN public.usuarios_crm u ON u.id = cp.creado_por
  LEFT JOIN public.campanas_metricas cm ON cm.campana_id = cp.id
`
const GROUP_BY_CAMPANA = 'GROUP BY cp.id, c.nombre, u.nombre'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q')
  const estado = searchParams.get('estado')
  const plataforma = searchParams.get('plataforma')

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (search) {
    conditions.push(`(cp.nombre ILIKE $${idx} OR c.nombre ILIKE $${idx})`)
    params.push(`%${search}%`)
    idx++
  }
  if (estado) {
    conditions.push(`cp.estado = $${idx++}`)
    params.push(estado)
  }
  if (plataforma) {
    conditions.push(`cp.plataforma = $${idx++}`)
    params.push(plataforma)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const campanas = await query<CampanaPublicidad>(
    `${SELECT_CAMPANA} ${where} ${GROUP_BY_CAMPANA} ORDER BY cp.fecha_creacion DESC`,
    params
  )

  // Serie temporal agregada (mismos filtros) para el gráfico de línea/área de
  // impresiones/clics/conversiones por fecha en la vista general.
  const serie_temporal = await query<CampanaMetricaPorFecha>(
    `SELECT cm.fecha,
        SUM(cm.impresiones)::int as impresiones,
        SUM(cm.clics)::int as clics,
        SUM(cm.conversiones)::int as conversiones
     FROM public.campanas_metricas cm
     JOIN public.campanas_publicidad cp ON cp.id = cm.campana_id
     LEFT JOIN public.contactos c ON c.id = cp.cliente_id
     ${where}
     GROUP BY cm.fecha
     ORDER BY cm.fecha ASC`,
    params
  )

  return NextResponse.json({ campanas, serie_temporal })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  if (body.plataforma !== 'google' && body.plataforma !== 'meta') {
    return NextResponse.json({ error: 'Plataforma inválida' }, { status: 400 })
  }

  const OBJETIVOS_VALIDOS = ['reconocimiento', 'trafico', 'conversion']
  if (body.objetivo && !OBJETIVOS_VALIDOS.includes(body.objetivo)) {
    return NextResponse.json({ error: 'Objetivo inválido' }, { status: 400 })
  }

  const clienteId = body.cliente_id ? parseInt(body.cliente_id) : null
  const objetivo = body.objetivo || null
  const presupuesto = body.presupuesto != null && body.presupuesto !== '' ? Number(body.presupuesto) : null
  const fechaInicio = body.fecha_inicio || null
  const fechaFin = body.fecha_fin || null

  const nuevo = await queryOne<{ id: number }>(
    `INSERT INTO public.campanas_publicidad
       (nombre, plataforma, cliente_id, objetivo, presupuesto, fecha_inicio, fecha_fin, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [nombre, body.plataforma, clienteId, objetivo, presupuesto, fechaInicio, fechaFin, parseInt(user.sub)]
  )

  const campana = await queryOne<CampanaPublicidad>(
    `${SELECT_CAMPANA} WHERE cp.id = $1 ${GROUP_BY_CAMPANA}`,
    [nuevo!.id]
  )

  return NextResponse.json({ campana }, { status: 201 })
}
