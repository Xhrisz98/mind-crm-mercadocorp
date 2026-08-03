import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { ProgramaClientesKpis } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const row = await queryOne<{
    total_blackbull_activos: string
    total_gift_card_activos: string
    total_clientes: string
    con_opt_in_email: string
    con_opt_in_sms: string
    con_wallet: string
    nuevos_este_mes: string
    inactivos_90_dias: string
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE tipo_cliente = 'blackbull' AND activo) as total_blackbull_activos,
      COUNT(*) FILTER (WHERE tipo_cliente = 'gift_card' AND activo) as total_gift_card_activos,
      COUNT(*) as total_clientes,
      COUNT(*) FILTER (WHERE opt_in_email) as con_opt_in_email,
      COUNT(*) FILTER (WHERE opt_in_sms) as con_opt_in_sms,
      COUNT(*) FILTER (WHERE tiene_wallet) as con_wallet,
      COUNT(*) FILTER (WHERE date_trunc('month', fecha_signup) = date_trunc('month', CURRENT_DATE)) as nuevos_este_mes,
      COUNT(*) FILTER (WHERE fecha_ultima_accion < CURRENT_DATE - INTERVAL '90 days') as inactivos_90_dias
    FROM public.programa_clientes
  `)

  const total = parseInt(row?.total_clientes || '0')
  const pct = (n: string | undefined) => total > 0 ? Math.round((parseInt(n || '0') / total) * 100) : 0

  const kpis: ProgramaClientesKpis = {
    total_blackbull_activos: parseInt(row?.total_blackbull_activos || '0'),
    total_gift_card_activos: parseInt(row?.total_gift_card_activos || '0'),
    pct_opt_in_email: pct(row?.con_opt_in_email),
    pct_opt_in_sms: pct(row?.con_opt_in_sms),
    pct_wallet: pct(row?.con_wallet),
    nuevos_este_mes: parseInt(row?.nuevos_este_mes || '0'),
    inactivos_90_dias: parseInt(row?.inactivos_90_dias || '0'),
  }

  return NextResponse.json(kpis)
}
