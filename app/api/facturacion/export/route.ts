import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { ESTADO_FACTURA_LABELS, MEDIO_PAGO_LABELS } from '@/lib/utils'
import type { EstadoFactura, MedioPago } from '@/lib/types'

const HEADERS = [
  'N° Factura',
  'Cliente',
  'Teléfono',
  'Canal',
  'Producto',
  'Valor',
  'Estado',
  'Medio de pago',
  'Vendedor',
  'Fecha',
]

interface FacturaExportRow {
  numero_factura: string | null
  cliente: string
  telefono: string | null
  canal: string
  producto: string
  precio: number | null
  estado: EstadoFactura
  medio_pago: MedioPago | null
  vendedor_nombre: string | null
  fecha_compra: string
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatFecha(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const estado = searchParams.get('estado')
  const medioPago = searchParams.get('medio_pago')

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (desde) {
    conditions.push(`f.fecha_compra >= $${idx++}`)
    params.push(desde)
  }

  if (hasta) {
    conditions.push(`f.fecha_compra < $${idx++}::date + interval '1 day'`)
    params.push(hasta)
  }

  if (estado) {
    conditions.push(`f.estado = $${idx++}`)
    params.push(estado)
  }

  if (medioPago) {
    conditions.push(`f.medio_pago = $${idx++}`)
    params.push(medioPago)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const facturas = await query<FacturaExportRow>(
    `SELECT f.numero_factura, c.nombre as cliente, c.telefono, c.canal,
            f.producto, f.precio, f.estado, f.medio_pago,
            u.nombre as vendedor_nombre, f.fecha_compra
     FROM public.compras_crm f
     JOIN contactos c ON c.id = f.contacto_id
     LEFT JOIN public.usuarios_crm u ON u.id = f.vendedor_id
     ${where}
     ORDER BY f.fecha_compra DESC`,
    params
  )

  const rows = facturas.map((f) => [
    f.numero_factura ?? '',
    f.cliente,
    f.telefono ?? '',
    f.canal,
    f.producto,
    f.precio ?? '',
    ESTADO_FACTURA_LABELS[f.estado] ?? f.estado,
    f.medio_pago ? (MEDIO_PAGO_LABELS[f.medio_pago] ?? f.medio_pago) : '',
    f.vendedor_nombre ?? '',
    formatFecha(f.fecha_compra),
  ])

  const csvLines = [HEADERS, ...rows].map((row) => row.map(csvEscape).join(','))
  const csv = '﻿' + csvLines.join('\r\n')

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const filename = `facturacion_bullpadel_${yyyy}${mm}${dd}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
