import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { ESTADO_FUNNEL_ORDEN } from '@/lib/utils'
import { parsePeriodoParam, buildContactosWhere } from '@/lib/periodo'
import type { LeadsMetricas, ConversionCanal } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodo = parsePeriodoParam(searchParams)
  if (typeof periodo === 'object') return NextResponse.json({ error: periodo.error }, { status: 400 })

  const esVentas = user.rol === 'ventas'
  const vendedorId = parseInt(user.sub)

  const { where: contactosWhere, whereAnd: contactosWhereAnd, params: contactosParams } = buildContactosWhere(
    periodo,
    esVentas,
    vendedorId
  )

  const [totalRow] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM contactos ${contactosWhere}`,
    contactosParams
  )
  const total = parseInt(totalRow?.count || '0')

  const estadoRows = await query<{ estado_lead: string; count: string }>(
    `SELECT estado_lead, COUNT(*) as count FROM contactos ${contactosWhere} GROUP BY estado_lead`,
    contactosParams
  )
  const countsPorEstado = estadoRows.reduce(
    (acc, r) => ({ ...acc, [r.estado_lead]: parseInt(r.count) }),
    {} as Record<string, number>
  )

  const funnel = ESTADO_FUNNEL_ORDEN.map((estado) => ({ estado, count: countsPorEstado[estado] ?? 0 }))
  const perdidos = countsPorEstado['perdido'] ?? 0

  const canalRows = await query<{ canal: string; count: string }>(
    `SELECT canal, COUNT(*) as count FROM contactos ${contactosWhere} GROUP BY canal`,
    contactosParams
  )
  const leads_por_canal = canalRows.reduce(
    (acc, r) => ({ ...acc, [r.canal]: parseInt(r.count) }),
    {} as Record<string, number>
  )

  const [clientesRow] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM contactos ${contactosWhereAnd} estado_lead = 'cliente'`,
    contactosParams
  )
  const clientes = parseInt(clientesRow?.count || '0')

  const conversionCanalRows = await query<{ canal: string; total: string; clientes: string }>(
    `SELECT canal, COUNT(*) as total, COUNT(*) FILTER (WHERE estado_lead = 'cliente') as clientes
     FROM contactos ${contactosWhere}
     GROUP BY canal`,
    contactosParams
  )
  const conversion_por_canal: ConversionCanal[] = conversionCanalRows.map((r) => {
    const t = parseInt(r.total)
    const c = parseInt(r.clientes)
    return { canal: r.canal as ConversionCanal['canal'], total: t, clientes: c, tasa: t > 0 ? Math.round((c / t) * 100) : 0 }
  })

  // Leads por vendedor asignado — solo tiene sentido para comercial/admin
  // (un usuario 'ventas' ya ve únicamente sus propios leads en todo lo demás,
  // así que el desglose sería siempre "100% él mismo").
  let leads_por_vendedor: { vendedor_nombre: string; count: number }[] = []
  if (!esVentas) {
    const porVendedorWhere = buildContactosWhere(periodo, esVentas, vendedorId, 'c').where
    const vendedorRows = await query<{ vendedor_nombre: string; count: string }>(
      `SELECT COALESCE(u.nombre, 'Sin asignar') as vendedor_nombre, COUNT(*) as count
       FROM contactos c
       LEFT JOIN usuarios_crm u ON u.id = c.vendedor_asignado_id
       ${porVendedorWhere}
       GROUP BY COALESCE(u.nombre, 'Sin asignar')
       ORDER BY count DESC`,
      contactosParams
    )
    leads_por_vendedor = vendedorRows.map((r) => ({ vendedor_nombre: r.vendedor_nombre, count: parseInt(r.count) }))
  }

  const metricas: LeadsMetricas = {
    periodo,
    total_leads: total,
    funnel,
    perdidos,
    leads_por_canal,
    conversion_rate: total > 0 ? Math.round((clientes / total) * 100) : 0,
    conversion_por_canal,
    leads_por_vendedor,
  }

  return NextResponse.json(metricas)
}
