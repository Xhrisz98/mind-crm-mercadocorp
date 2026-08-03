import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { canAccessLead } from '@/lib/leadAccess'
import type { Compra, EstadoFactura, MedioPago } from '@/lib/types'

const ESTADOS_VALIDOS: EstadoFactura[] = ['pendiente', 'pagado', 'anulado']
const MEDIOS_PAGO_VALIDOS: MedioPago[] = [
  'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'efectivo', 'canje',
]

function normalizeCompra(c: Compra): Compra {
  return { ...c, precio: c.precio != null ? Number(c.precio) : null }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const compras = await query<Compra>(
    `SELECT c.id, c.contacto_id, c.producto, c.precio, c.canal, c.notas, c.vendedor_id, c.fecha_compra,
            c.numero_factura, c.estado, c.medio_pago,
            u.nombre as vendedor_nombre
     FROM public.compras_crm c
     LEFT JOIN public.usuarios_crm u ON u.id = c.vendedor_id
     WHERE c.contacto_id = $1
     ORDER BY c.fecha_compra DESC`,
    [id]
  )

  return NextResponse.json({ compras: compras.map(normalizeCompra) })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json()

  const numeroFactura = (body.numero_factura as string | undefined)?.trim() || null
  if (!numeroFactura) {
    return NextResponse.json({ error: 'N° Factura requerido' }, { status: 400 })
  }

  const producto = (body.producto as string | undefined)?.trim()
  if (!producto) return NextResponse.json({ error: 'Producto requerido' }, { status: 400 })

  const precio = body.precio === null || body.precio === undefined || body.precio === ''
    ? null
    : Number(body.precio)
  if (precio !== null && isNaN(precio)) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })

  const canal = (body.canal as string | undefined)?.trim() || null
  const notas = (body.notas as string | undefined)?.trim() || null

  const estado = (body.estado as string | undefined) || 'pendiente'
  if (!ESTADOS_VALIDOS.includes(estado as EstadoFactura)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const medioPago = (body.medio_pago as string | undefined) || null
  if (medioPago !== null && !MEDIOS_PAGO_VALIDOS.includes(medioPago as MedioPago)) {
    return NextResponse.json({ error: 'Medio de pago inválido' }, { status: 400 })
  }

  const compra = await query<Compra>(
    `INSERT INTO public.compras_crm (contacto_id, producto, precio, canal, notas, vendedor_id, numero_factura, estado, medio_pago)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [id, producto, precio, canal, notas, parseInt(user.sub), numeroFactura, estado, medioPago]
  )

  return NextResponse.json({ compra: { ...normalizeCompra(compra[0]), vendedor_nombre: user.nombre } }, { status: 201 })
}
