import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { parsePeriodoParam, fechaPeriodoCondicion, buildContactosWhere } from '@/lib/periodo'
import type { JWTPayload, Periodo, NegociosKpis, LeadsDashboardKpis, CampanasKpis, ProyectosKpis } from '@/lib/types'

// pipeline_valor/pipeline_ponderado: foto del pipeline abierto actual (negocios sin estado
// terminal), sin filtro de período. tasa_cierre: histórica completa, ver nota en lib/types.ts.
// ganados_periodo: usa fecha_actualizacion como proxy de fecha de cierre (negocios no tiene
// columna fecha_cierre_real) — puede sobre-contar negocios editados en el período pero ganados
// antes; el KPI correspondiente en la UI lo advierte con un tooltip.
async function getNegociosKpis(user: JWTPayload, periodo: Periodo): Promise<NegociosKpis> {
  const esVentas = user.rol === 'ventas'
  const params: unknown[] = esVentas ? [parseInt(user.sub)] : []
  const where = esVentas ? 'WHERE n.vendedor_asignado_id = $1' : ''

  const ganadosPeriodoCond = fechaPeriodoCondicion('n.fecha_actualizacion', periodo, params)
  const filtroGanadosPeriodo = ganadosPeriodoCond ? `pe.es_estado_ganado AND ${ganadosPeriodoCond}` : 'pe.es_estado_ganado'

  const [row] = await query<{
    pipeline_valor: string
    pipeline_ponderado: string
    ganados_total: string
    perdidos_total: string
    ganados_periodo: string
  }>(
    `SELECT
       COALESCE(SUM(n.monto) FILTER (WHERE NOT pe.es_estado_ganado AND NOT pe.es_estado_perdido), 0) as pipeline_valor,
       COALESCE(SUM(n.monto * pe.probabilidad_cierre / 100.0) FILTER (WHERE NOT pe.es_estado_ganado AND NOT pe.es_estado_perdido), 0) as pipeline_ponderado,
       COUNT(*) FILTER (WHERE pe.es_estado_ganado) as ganados_total,
       COUNT(*) FILTER (WHERE pe.es_estado_perdido) as perdidos_total,
       COUNT(*) FILTER (WHERE ${filtroGanadosPeriodo}) as ganados_periodo
     FROM public.negocios n
     JOIN public.pipeline_estados pe ON pe.id = n.pipeline_estado_id
     ${where}`,
    params
  )

  const ganadosTotal = parseInt(row?.ganados_total || '0')
  const cerrados = ganadosTotal + parseInt(row?.perdidos_total || '0')

  return {
    pipeline_valor: parseFloat(row?.pipeline_valor || '0'),
    pipeline_ponderado: parseFloat(row?.pipeline_ponderado || '0'),
    ganados_periodo: parseInt(row?.ganados_periodo || '0'),
    tasa_cierre: cerrados > 0 ? Math.round((ganadosTotal / cerrados) * 100) : 0,
  }
}

// total_contactos es histórico completo (buildContactosWhere con periodo='total' fuerza el
// filtro de fecha a null, dejando solo el filtro de rol). Los demás campos sí respetan el
// período seleccionado. tasa_conversion_negocio mide contacto→negocio (existe una fila en
// `negocios` con ese contacto_id), distinto del conversion_rate de /api/leads/metricas
// (contacto→estado_lead='cliente').
async function getLeadsKpis(user: JWTPayload, periodo: Periodo): Promise<LeadsDashboardKpis> {
  const esVentas = user.rol === 'ventas'
  const vendedorId = parseInt(user.sub)

  const total = buildContactosWhere('total', esVentas, vendedorId, 'c')
  const [totalRow] = await query<{ count: string }>(`SELECT COUNT(*) as count FROM contactos c ${total.where}`, total.params)

  const enPeriodo = buildContactosWhere(periodo, esVentas, vendedorId, 'c')
  const [periodoRow] = await query<{ total: string; con_negocio: string }>(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.negocios n WHERE n.contacto_id = c.id)) as con_negocio
     FROM contactos c
     ${enPeriodo.where}`,
    enPeriodo.params
  )

  const canalRows = await query<{ canal: string; count: string }>(
    `SELECT c.canal as canal, COUNT(*) as count FROM contactos c ${enPeriodo.where} GROUP BY c.canal`,
    enPeriodo.params
  )

  const nuevosPeriodo = parseInt(periodoRow?.total || '0')
  const conNegocio = parseInt(periodoRow?.con_negocio || '0')

  return {
    total_contactos: parseInt(totalRow?.count || '0'),
    nuevos_contactos_periodo: nuevosPeriodo,
    tasa_conversion_negocio: nuevosPeriodo > 0 ? Math.round((conNegocio / nuevosPeriodo) * 100) : 0,
    leads_por_canal: canalRows.reduce((acc, r) => ({ ...acc, [r.canal]: parseInt(r.count) }), {} as Record<string, number>),
  }
}

// Solo campañas activas, filtradas también por período (campanas_metricas_valores.fecha) —
// 'activa' (estado) y período (fecha) son dimensiones independientes. El caller solo invoca
// esta función para admin/comercial (mismo acceso que /api/campanas-publicidad).
async function getCampanasKpis(periodo: Periodo): Promise<CampanasKpis> {
  const params: unknown[] = []
  const fechaCond = fechaPeriodoCondicion('cmv.fecha', periodo, params)
  const fechaWhere = fechaCond ? `AND ${fechaCond}` : ''

  const [row] = await query<{ gasto: string | null; conversiones: string | null }>(
    `SELECT
       SUM(cmv.valor) FILTER (WHERE md.clave = 'gasto') as gasto,
       SUM(cmv.valor) FILTER (WHERE md.clave = 'conversiones') as conversiones
     FROM public.campanas_metricas_valores cmv
     JOIN public.metricas_definiciones md ON md.id = cmv.metrica_definicion_id
     JOIN public.campanas_publicidad cp ON cp.id = cmv.campana_id
     WHERE cp.estado = 'activa' ${fechaWhere}`,
    params
  )

  return {
    gasto_total: Number(row?.gasto ?? 0),
    conversiones_total: Math.round(Number(row?.conversiones ?? 0)),
  }
}

// Foto del estado actual (sin filtro de período, igual que pipeline_valor de Negocios). Sin
// filtro por vendedor_asignado_id — rol='ventas' ve todos los proyectos (ver CLAUDE.md).
async function getProyectosKpis(): Promise<ProyectosKpis> {
  const [row] = await query<{ activos: string; tareas_vencidas: string }>(
    `SELECT
       COUNT(DISTINCT p.id) FILTER (WHERE p.estado = 'activo') as activos,
       COUNT(t.id) FILTER (WHERE t.fecha_limite < CURRENT_DATE AND NOT te.es_estado_final) as tareas_vencidas
     FROM public.proyectos p
     LEFT JOIN public.tareas t ON t.proyecto_id = p.id
     LEFT JOIN public.tareas_estados te ON te.id = t.tarea_estado_id`
  )

  return {
    proyectos_activos: parseInt(row?.activos || '0'),
    tareas_vencidas: parseInt(row?.tareas_vencidas || '0'),
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodo = parsePeriodoParam(searchParams)
  if (typeof periodo === 'object') return NextResponse.json({ error: periodo.error }, { status: 400 })

  // Mismo acceso que /api/campanas-publicidad: rol='ventas' no ve campañas.
  const puedeVerCampanas = user.rol === 'admin' || user.rol === 'comercial'

  const [negocios, leads, campanas, proyectos] = await Promise.all([
    getNegociosKpis(user, periodo),
    getLeadsKpis(user, periodo),
    puedeVerCampanas ? getCampanasKpis(periodo) : Promise.resolve(null),
    getProyectosKpis(),
  ])

  return NextResponse.json({ periodo, negocios, leads, campanas, proyectos })
}
