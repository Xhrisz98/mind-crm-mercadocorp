import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export async function DELETE(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && !user.puede_eliminar) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.map((v) => parseInt(String(v))).filter((n) => !Number.isNaN(n))
    : []

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Debes indicar al menos un id' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM historial_conversaciones WHERE id_contacto = ANY($1::int[])', [ids])
    await client.query('DELETE FROM notas_crm WHERE contacto_id = ANY($1::int[])', [ids])
    await client.query(
      'DELETE FROM leads_vinculados WHERE contacto_principal_id = ANY($1::int[]) OR contacto_vinculado_id = ANY($1::int[])',
      [ids]
    )
    await client.query('DELETE FROM activity_log WHERE contacto_id = ANY($1::int[])', [ids])
    const result = await client.query('DELETE FROM contactos WHERE id = ANY($1::int[]) RETURNING id', [ids])
    await client.query('COMMIT')

    return NextResponse.json({ success: true, deleted: result.rowCount })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
