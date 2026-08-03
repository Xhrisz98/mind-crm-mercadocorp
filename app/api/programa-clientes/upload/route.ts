import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { parseCSV, mapCsvRows } from '@/lib/csv'

const TIPOS_VALIDOS = ['blackbull', 'gift_card']

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 })

  const file = formData.get('file')
  const tipoCliente = String(formData.get('tipo_cliente') || '')
  const mode = String(formData.get('mode') || 'confirm')

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Archivo CSV requerido' }, { status: 400 })
  }
  if (!TIPOS_VALIDOS.includes(tipoCliente)) {
    return NextResponse.json({ error: 'Debes seleccionar el tipo de programa (BlackBull o Gift Card)' }, { status: 400 })
  }

  const text = await file.text()
  const rawRows = parseCSV(text)
  if (rawRows.length < 2) {
    return NextResponse.json({ error: 'El CSV no contiene filas de datos' }, { status: 400 })
  }

  const rows = mapCsvRows(rawRows)

  if (mode === 'preview') {
    return NextResponse.json({
      preview: rows.slice(0, 5),
      totalRows: rows.length,
      tipo_cliente: tipoCliente,
    })
  }

  let insertados = 0
  let actualizados = 0
  let errores = 0

  const filasValidas = rows.filter((row) => {
    if (!row.email) { errores++; return false }
    return true
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const row of filasValidas) {
      const { rows: existingRows } = await client.query<{ id: number }>(
        'SELECT id FROM public.programa_clientes WHERE email = $1 AND tipo_cliente = $2',
        [row.email, tipoCliente]
      )
      const existing = existingRows[0]

      if (existing) {
        await client.query(
          `UPDATE public.programa_clientes SET
             card = $1, activo = $2, customer_id = $3, numero_tarjeta = $4, numero_tarjeta_ext = $5,
             nombre = $6, apellido = $7, telefono = $8, opt_in_email = $9, opt_in_sms = $10,
             tiene_wallet = $11, fecha_signup = $12, fecha_ultima_accion = $13
           WHERE id = $14`,
          [
            row.card, row.activo, row.customer_id, row.numero_tarjeta, row.numero_tarjeta_ext,
            row.nombre, row.apellido, row.telefono, row.opt_in_email, row.opt_in_sms,
            row.tiene_wallet, row.fecha_signup, row.fecha_ultima_accion, existing.id,
          ]
        )
        actualizados++
      } else {
        await client.query(
          `INSERT INTO public.programa_clientes
             (tipo_cliente, card, activo, customer_id, numero_tarjeta, numero_tarjeta_ext,
              nombre, apellido, telefono, email, opt_in_email, opt_in_sms, tiene_wallet,
              fecha_signup, fecha_ultima_accion, cargado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            tipoCliente, row.card, row.activo, row.customer_id, row.numero_tarjeta, row.numero_tarjeta_ext,
            row.nombre, row.apellido, row.telefono, row.email, row.opt_in_email, row.opt_in_sms,
            row.tiene_wallet, row.fecha_signup, row.fecha_ultima_accion, parseInt(user.sub),
          ]
        )
        insertados++
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error en carga de programa_clientes, transacción revertida:', err)
    return NextResponse.json(
      { error: 'No se pudo completar la carga. Ninguna fila fue aplicada — revisa el archivo e intenta de nuevo.' },
      { status: 400 }
    )
  } finally {
    client.release()
  }

  return NextResponse.json({ insertados, actualizados, errores, tipo_cliente: tipoCliente })
}
