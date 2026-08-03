import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { ProgramaCliente } from '@/lib/types'

const TIPOS_VALIDOS = ['blackbull', 'gift_card']

function canAccess(rol: string): boolean {
  return rol === 'admin' || rol === 'comercial'
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const tipoCliente = searchParams.get('tipo_cliente')
  const activo = searchParams.get('activo')
  const optInEmail = searchParams.get('opt_in_email')
  const optInSms = searchParams.get('opt_in_sms')
  const tieneWallet = searchParams.get('tiene_wallet')
  const signupDesde = searchParams.get('signup_desde')
  const signupHasta = searchParams.get('signup_hasta')
  const accionDesde = searchParams.get('accion_desde')
  const accionHasta = searchParams.get('accion_hasta')
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (q) {
    conditions.push(`(nombre ILIKE $${idx} OR apellido ILIKE $${idx} OR email ILIKE $${idx})`)
    params.push(`%${q}%`)
    idx++
  }
  if (tipoCliente && TIPOS_VALIDOS.includes(tipoCliente)) {
    conditions.push(`tipo_cliente = $${idx++}`)
    params.push(tipoCliente)
  }
  if (activo === '1' || activo === '0') {
    conditions.push(`activo = $${idx++}`)
    params.push(activo === '1')
  }
  if (optInEmail === '1' || optInEmail === '0') {
    conditions.push(`opt_in_email = $${idx++}`)
    params.push(optInEmail === '1')
  }
  if (optInSms === '1' || optInSms === '0') {
    conditions.push(`opt_in_sms = $${idx++}`)
    params.push(optInSms === '1')
  }
  if (tieneWallet === '1' || tieneWallet === '0') {
    conditions.push(`tiene_wallet = $${idx++}`)
    params.push(tieneWallet === '1')
  }
  if (signupDesde) { conditions.push(`fecha_signup >= $${idx++}`); params.push(signupDesde) }
  if (signupHasta) { conditions.push(`fecha_signup <= $${idx++}`); params.push(signupHasta) }
  if (accionDesde) { conditions.push(`fecha_ultima_accion >= $${idx++}`); params.push(accionDesde) }
  if (accionHasta) { conditions.push(`fecha_ultima_accion <= $${idx++}`); params.push(accionHasta) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const clientes = await query<ProgramaCliente>(
    `SELECT * FROM public.programa_clientes ${where}
     ORDER BY fecha_carga DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  )

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM public.programa_clientes ${where}`,
    params
  )

  return NextResponse.json({ clientes, total: parseInt(count), page, limit })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const tipoCliente = body.tipo_cliente
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!TIPOS_VALIDOS.includes(tipoCliente)) {
    return NextResponse.json({ error: 'Tipo de cliente inválido' }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
  }

  const cliente = await queryOne<ProgramaCliente>(
    `INSERT INTO public.programa_clientes
       (tipo_cliente, nombre, apellido, telefono, email, opt_in_email, opt_in_sms, tiene_wallet, cargado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      tipoCliente,
      (body.nombre || '').trim() || null,
      (body.apellido || '').trim() || null,
      (body.telefono || '').trim() || null,
      email,
      !!body.opt_in_email,
      !!body.opt_in_sms,
      !!body.tiene_wallet,
      parseInt(user.sub),
    ]
  )

  return NextResponse.json({ cliente }, { status: 201 })
}
