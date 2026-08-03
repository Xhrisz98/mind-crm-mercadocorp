import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; compraId: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  const compraId = parseInt(params.compraId)
  if (isNaN(id) || isNaN(compraId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM public.compras_crm WHERE id = $1 AND contacto_id = $2',
    [compraId, id]
  )
  if (!existing) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })

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

  const notas = (body.notas as string | undefined)?.trim() || null

  const estado = (body.estado as string | undefined) || 'pendiente'
  if (!ESTADOS_VALIDOS.includes(estado as EstadoFactura)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const medioPago = (body.medio_pago as string | undefined) || null
  if (medioPago !== null && !MEDIOS_PAGO_VALIDOS.includes(medioPago as MedioPago)) {
    return NextResponse.json({ error: 'Medio de pago inválido' }, { status: 400 })
  }

  const updated = await query<Compra>(
    `UPDATE public.compras_crm
     SET numero_factura = $1, producto = $2, precio = $3, notas = $4, estado = $5, medio_pago = $6
     WHERE id = $7
     RETURNING *`,
    [numeroFactura, producto, precio, notas, estado, medioPago, compraId]
  )

  const [vendedor] = await query<{ nombre: string }>(
    'SELECT nombre FROM public.usuarios_crm WHERE id = $1',
    [updated[0].vendedor_id]
  )

  return NextResponse.json({
    compra: { ...normalizeCompra(updated[0]), vendedor_nombre: vendedor?.nombre },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; compraId: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  const compraId = parseInt(params.compraId)
  if (isNaN(id) || isNaN(compraId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  if (!(await canAccessLead(user, id))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const result = await query<{ id: number }>(
    'DELETE FROM public.compras_crm WHERE id = $1 AND contacto_id = $2 RETURNING id',
    [compraId, id]
  )

  if (result.length === 0) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
