import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { CampanaPublicidad, SerieTemporalPunto } from '@/lib/types'

// metricas_totales se agrega en una subquery aparte (no con GROUP BY sobre
// cp.*) para no tener que listar cada columna de campanas_publicidad en el
// GROUP BY — así agregar una columna a esa tabla no puede volver a romper
// esta query en silencio, como pasaba con el patrón anterior.
const SELECT_CAMPANA = `
  SELECT cp.*,
    c.nombre as cliente_nombre,
    u.nombre as creado_por_nombre,
    COALESCE(mv.metricas_totales, '{}'::jsonb) as metricas_totales
  FROM public.campanas_publicidad cp
  LEFT JOIN public.contactos c ON c.id = cp.cliente_id
  LEFT JOIN public.usuarios_crm u ON u.id = cp.creado_por
  LEFT JOIN (
    SELECT sub.campana_id, jsonb_object_agg(md.clave, sub.total) as metricas_totales
    FROM (
      SELECT campana_id, metrica_definicion_id, SUM(valor) as total
      FROM public.campanas_metricas_valores
      GROUP BY campana_id, metrica_definicion_id
    ) sub
    JOIN public.metricas_definiciones md ON md.id = sub.metrica_definicion_id
    GROUP BY sub.campana_id
  ) mv ON mv.campana_id = cp.id
`

function conMetricasTotales(campana: CampanaPublicidad & { metricas_totales: Record<string, string> }): CampanaPublicidad {
  const metricas_totales: Record<string, number> = {}
  for (const [clave, valor] of Object.entries(campana.metricas_totales ?? {})) {
    metricas_totales[clave] = Number(valor)
  }
  return { ...campana, metricas_totales }
}

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

  const campanasRaw = await query<CampanaPublicidad & { metricas_totales: Record<string, string> }>(
    `${SELECT_CAMPANA} ${where} ORDER BY cp.fecha_creacion DESC`,
    params
  )
  const campanas = campanasRaw.map(conMetricasTotales)

  // Serie temporal agregada (mismos filtros), genérica para cualquier métrica
  // del catálogo — se pivotea a { fecha, valores: { [clave]: total } } para
  // que el selector de métricas del gráfico pueda graficar cualquier serie.
  const serieRaw = await query<{ fecha: string; metrica_clave: string; total: string }>(
    `SELECT cmv.fecha, md.clave as metrica_clave, SUM(cmv.valor) as total
     FROM public.campanas_metricas_valores cmv
     JOIN public.metricas_definiciones md ON md.id = cmv.metrica_definicion_id
     JOIN public.campanas_publicidad cp ON cp.id = cmv.campana_id
     LEFT JOIN public.contactos c ON c.id = cp.cliente_id
     ${where}
     GROUP BY cmv.fecha, md.clave
     ORDER BY cmv.fecha ASC`,
    params
  )
  const porFecha = new Map<string, Record<string, number>>()
  for (const row of serieRaw) {
    const valores = porFecha.get(row.fecha) ?? {}
    valores[row.metrica_clave] = Number(row.total)
    porFecha.set(row.fecha, valores)
  }
  const serie_temporal: SerieTemporalPunto[] = Array.from(porFecha.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fecha, valores]) => ({ fecha, valores }))

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

  const campanaRaw = await queryOne<CampanaPublicidad & { metricas_totales: Record<string, string> }>(
    `${SELECT_CAMPANA} WHERE cp.id = $1`,
    [nuevo!.id]
  )
  const campana = campanaRaw ? conMetricasTotales(campanaRaw) : null

  return NextResponse.json({ campana }, { status: 201 })
}
