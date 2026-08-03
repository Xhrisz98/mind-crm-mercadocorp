import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

const PERIODOS = ['hoy', 'semana', 'mes', 'total'] as const
type Periodo = (typeof PERIODOS)[number]
type PeriodoConUnidad = Exclude<Periodo, 'total'>

// Unidad para date_trunc($1, CURRENT_DATE) — equivalente a CURRENT_DATE cuando unit='day'.
const PERIOD_UNIT: Record<PeriodoConUnidad, string> = { hoy: 'day', semana: 'week', mes: 'month' }
// Duración del período, para calcular el rango anterior de igual duración (comparativo).
const PERIOD_INTERVAL: Record<PeriodoConUnidad, string> = { hoy: '1 day', semana: '7 days', mes: '1 month' }

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodoParam = searchParams.get('periodo')
  // Whitelist explícita: si viene un valor y no es exactamente uno de los 4 permitidos, se rechaza
  // antes de tocar la base de datos (evita que un valor arbitrario llegue a construir la query).
  if (periodoParam !== null && !(PERIODOS as readonly string[]).includes(periodoParam)) {
    return NextResponse.json({ error: 'Parámetro periodo inválido' }, { status: 400 })
  }
  const periodo: Periodo = (periodoParam as Periodo | null) ?? 'mes'
  // periodo='total' => sin filtro de fecha en ninguna query (histórico completo).
  const esTotal = periodo === 'total'
  const unit = esTotal ? null : PERIOD_UNIT[periodo as PeriodoConUnidad]
  const interval = esTotal ? null : PERIOD_INTERVAL[periodo as PeriodoConUnidad]

  const esVentas = user.rol === 'ventas'
  const vendedorId = parseInt(user.sub)

  // Filtro de período para contactos — se omite por completo cuando periodo='total'.
  const contactosParams: (string | number)[] = esVentas ? [vendedorId] : []
  let contactosWhere = esVentas ? 'WHERE vendedor_asignado_id = $1' : ''
  if (!esTotal) {
    contactosParams.push(unit as string)
    const cond = `fecha_primer_contacto >= date_trunc($${contactosParams.length}, CURRENT_DATE)`
    contactosWhere = contactosWhere ? `${contactosWhere} AND ${cond}` : `WHERE ${cond}`
  }
  const contactosWhereAnd = contactosWhere ? `${contactosWhere} AND` : 'WHERE'

  const [totalRow] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM contactos ${contactosWhere}`,
    contactosParams
  )

  // Período-independientes: siempre se calculan sobre hoy / últimos 7 días real, sin importar el filtro de período.
  const [hoyRow] = await query<{ count: string }>(
    esVentas
      ? `SELECT COUNT(*) as count FROM contactos WHERE vendedor_asignado_id = $1 AND DATE(fecha_primer_contacto) = CURRENT_DATE`
      : `SELECT COUNT(*) as count FROM contactos WHERE DATE(fecha_primer_contacto) = CURRENT_DATE`,
    esVentas ? [vendedorId] : []
  )

  const [semanaRow] = await query<{ count: string }>(
    esVentas
      ? `SELECT COUNT(*) as count FROM contactos WHERE vendedor_asignado_id = $1 AND fecha_primer_contacto >= NOW() - INTERVAL '7 days'`
      : `SELECT COUNT(*) as count FROM contactos WHERE fecha_primer_contacto >= NOW() - INTERVAL '7 days'`,
    esVentas ? [vendedorId] : []
  )

  const estadoRows = await query<{ estado_lead: string; count: string }>(
    `SELECT estado_lead, COUNT(*) as count FROM contactos ${contactosWhere} GROUP BY estado_lead`,
    contactosParams
  )

  const canalRows = await query<{ canal: string; count: string }>(
    `SELECT canal, COUNT(*) as count FROM contactos ${contactosWhere} GROUP BY canal`,
    contactosParams
  )

  const [clientesRow] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM contactos ${contactosWhereAnd} estado_lead = 'cliente'`,
    contactosParams
  )

  const total = parseInt(totalRow?.count || '0')
  const clientes = parseInt(clientesRow?.count || '0')

  const leads_por_estado = estadoRows.reduce(
    (acc, r) => ({ ...acc, [r.estado_lead]: parseInt(r.count) }),
    {} as Record<string, number>
  )

  const leads_por_canal = canalRows.reduce(
    (acc, r) => ({ ...acc, [r.canal]: parseInt(r.count) }),
    {} as Record<string, number>
  )

  const base = {
    periodo,
    total_leads: total,
    leads_hoy: parseInt(hoyRow?.count || '0'),
    leads_semana: parseInt(semanaRow?.count || '0'),
    leads_por_estado,
    leads_por_canal,
    conversion_rate: total > 0 ? Math.round((clientes / total) * 100) : 0,
  }

  // Facturación — solo comercial/admin (compras_crm no es visible para ventas)
  if (esVentas) {
    return NextResponse.json({
      ...base,
      ventas_periodo: 0,
      facturas_emitidas: 0,
      ticket_promedio: 0,
      por_cobrar: 0,
      ventas_comparativo_pct: null,
      ventas_por_dia: [],
      distribucion_medio_pago: [],
      top_productos: [],
      facturacion_por_vendedor: [],
    })
  }

  // Filtro de período para compras_crm — se omite por completo cuando periodo='total'.
  const comprasParams: string[] = esTotal ? [] : [unit as string]
  const comprasDateCond = esTotal ? '' : `fecha_compra >= date_trunc($1, CURRENT_DATE)`

  const ventasWhere = comprasDateCond ? `WHERE estado = 'pagado' AND ${comprasDateCond}` : `WHERE estado = 'pagado'`
  const facturasWhere = comprasDateCond ? `WHERE ${comprasDateCond}` : ''
  const porCobrarWhere = comprasDateCond ? `WHERE estado = 'pendiente' AND ${comprasDateCond}` : `WHERE estado = 'pendiente'`
  // Igual condición que ventasWhere, pero para la tabla con alias f (porVendedorRows).
  const porVendedorWhere = comprasDateCond ? `WHERE f.${comprasDateCond}` : ''

  const [ventasRow] = await query<{ total: string | null }>(
    `SELECT SUM(precio) as total FROM public.compras_crm ${ventasWhere}`,
    comprasParams
  )

  const [facturasRow] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM public.compras_crm ${facturasWhere}`,
    comprasParams
  )

  const [ticketRow] = await query<{ promedio: string | null }>(
    `SELECT AVG(precio) as promedio FROM public.compras_crm ${ventasWhere}`,
    comprasParams
  )

  const [porCobrarRow] = await query<{ total: string | null }>(
    `SELECT SUM(precio) as total FROM public.compras_crm ${porCobrarWhere}`,
    comprasParams
  )

  const ventasPorDiaRows = await query<{ dia: string; total: string }>(
    `SELECT DATE(fecha_compra) as dia, SUM(precio) as total FROM public.compras_crm
     ${ventasWhere}
     GROUP BY DATE(fecha_compra)
     ORDER BY dia ASC`,
    comprasParams
  )

  const medioPagoRows = await query<{ medio_pago: string | null; total: string }>(
    `SELECT medio_pago, SUM(precio) as total FROM public.compras_crm
     ${ventasWhere}
     GROUP BY medio_pago`,
    comprasParams
  )

  // Comparativo vs. rango anterior de igual duración: no aplica cuando periodo='total' (no hay "período anterior").
  let ventasComparativoPct: number | null = null
  if (!esTotal) {
    const [ventasPrevRow] = await query<{ total: string | null }>(
      `SELECT SUM(precio) as total FROM public.compras_crm
       WHERE estado = 'pagado'
         AND fecha_compra >= date_trunc($1, CURRENT_DATE) - $2::interval
         AND fecha_compra < date_trunc($1, CURRENT_DATE)`,
      [unit, interval]
    )
    const ventasPeriodo = parseFloat(ventasRow?.total || '0')
    const ventasPrev = parseFloat(ventasPrevRow?.total || '0')
    ventasComparativoPct = ventasPrev > 0 ? Math.round(((ventasPeriodo - ventasPrev) / ventasPrev) * 100) : null
  }

  const topProductosRows = await query<{ producto: string; cantidad: string; monto: string }>(
    `SELECT producto, COUNT(*) as cantidad, SUM(precio) as monto FROM public.compras_crm
     ${ventasWhere}
     GROUP BY producto
     ORDER BY monto DESC
     LIMIT 5`,
    comprasParams
  )

  // cantidad_facturas cuenta todas las facturas del período (cualquier estado, como
  // facturas_emitidas); monto_total solo las pagadas (como ventas_periodo).
  const porVendedorRows = await query<{ vendedor_nombre: string; cantidad_facturas: string; monto_total: string | null }>(
    `SELECT COALESCE(u.nombre, 'Sin asignar') as vendedor_nombre,
            COUNT(f.*) as cantidad_facturas,
            SUM(f.precio) FILTER (WHERE f.estado = 'pagado') as monto_total
     FROM public.compras_crm f
     LEFT JOIN public.usuarios_crm u ON u.id = f.vendedor_id
     ${porVendedorWhere}
     GROUP BY COALESCE(u.nombre, 'Sin asignar')
     ORDER BY monto_total DESC NULLS LAST`,
    comprasParams
  )

  return NextResponse.json({
    ...base,
    ventas_periodo: parseFloat(ventasRow?.total || '0'),
    facturas_emitidas: parseInt(facturasRow?.count || '0'),
    ticket_promedio: parseFloat(ticketRow?.promedio || '0'),
    por_cobrar: parseFloat(porCobrarRow?.total || '0'),
    ventas_comparativo_pct: ventasComparativoPct,
    ventas_por_dia: ventasPorDiaRows.map((r) => ({ fecha: r.dia, total: parseFloat(r.total) })),
    distribucion_medio_pago: medioPagoRows.map((r) => ({
      medio_pago: r.medio_pago,
      total: parseFloat(r.total),
    })),
    top_productos: topProductosRows.map((r) => ({
      producto: r.producto,
      cantidad: parseInt(r.cantidad),
      monto: parseFloat(r.monto),
    })),
    facturacion_por_vendedor: porVendedorRows.map((r) => ({
      vendedor_nombre: r.vendedor_nombre,
      cantidad_facturas: parseInt(r.cantidad_facturas),
      monto_total: parseFloat(r.monto_total || '0'),
    })),
  })
}
