import { NextRequest, NextResponse } from 'next/server'
import pool, { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Contacto, MensajeHistorial, SugerenciaVinculacion } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const lead = await queryOne<Contacto>(
    `SELECT c.*, u.nombre as vendedor_nombre
     FROM contactos c
     LEFT JOIN usuarios_crm u ON c.vendedor_asignado_id = u.id
     WHERE c.id = $1`,
    [id]
  )

  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

  if (user.rol === 'ventas' && lead.vendedor_asignado_id !== parseInt(user.sub)) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  // Historial unificado: mensajes del contacto principal + de los contactos vinculados manualmente
  const historial = await query<MensajeHistorial>(
    `SELECT * FROM historial_conversaciones WHERE id_contacto = $1
     UNION
     SELECT h.* FROM historial_conversaciones h
     JOIN public.leads_vinculados lv
       ON h.id_contacto = CASE WHEN lv.contacto_principal_id = $1 THEN lv.contacto_vinculado_id ELSE lv.contacto_principal_id END
     WHERE lv.contacto_principal_id = $1 OR lv.contacto_vinculado_id = $1
     ORDER BY timestamp ASC`,
    [id]
  )

  // Sugerencias de vinculación: otros contactos con el mismo teléfono (normalizado), aún no vinculados
  let sugerencias: SugerenciaVinculacion[] = []
  if (user.rol !== 'ventas' && lead.telefono) {
    sugerencias = await query<SugerenciaVinculacion>(
      `SELECT id, nombre, canal, telefono
       FROM public.contactos
       WHERE id != $1
         AND telefono IS NOT NULL
         AND REPLACE(telefono, ' ', '') = REPLACE($2, ' ', '')
         AND id NOT IN (
           SELECT CASE WHEN lv.contacto_principal_id = $1 THEN lv.contacto_vinculado_id ELSE lv.contacto_principal_id END
           FROM public.leads_vinculados lv
           WHERE lv.contacto_principal_id = $1 OR lv.contacto_vinculado_id = $1
         )
       LIMIT 10`,
      [id, lead.telefono]
    )
  }

  return NextResponse.json({ lead, historial, sugerencias })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json()

  if (user.rol === 'ventas') {
    const lead = await queryOne<Contacto>(
      'SELECT vendedor_asignado_id FROM contactos WHERE id = $1',
      [id]
    )
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    if (lead.vendedor_asignado_id !== parseInt(user.sub)) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    }
  }

  const allowed = ['estado_lead', 'notas_internas', 'vendedor_asignado_id']
  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const key of allowed) {
    if (key in body) {
      if (key === 'vendedor_asignado_id' && user.rol === 'ventas') continue
      updates.push(`${key} = $${idx++}`)
      values.push(body[key])
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  if (body.estado_lead) {
    updates.push(`fecha_cambio_estado = NOW()`)
  }

  values.push(id)

  const updated = await queryOne<Contacto>(
    `UPDATE contactos SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  if (body.estado_lead || body.vendedor_asignado_id !== undefined) {
    await query(
      `INSERT INTO activity_log (usuario_id, contacto_id, accion, valor_anterior, valor_nuevo)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        parseInt(user.sub),
        id,
        body.estado_lead ? 'cambio_estado' : 'asignar_vendedor',
        null,
        body.estado_lead || String(body.vendedor_asignado_id),
      ]
    )
  }

  return NextResponse.json({ lead: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && !user.puede_eliminar) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM historial_conversaciones WHERE id_contacto = $1', [id])
    await client.query('DELETE FROM notas_crm WHERE contacto_id = $1', [id])
    await client.query('DELETE FROM compras_crm WHERE contacto_id = $1', [id])
    await client.query(
      'DELETE FROM leads_vinculados WHERE contacto_principal_id = $1 OR contacto_vinculado_id = $1',
      [id]
    )
    await client.query('DELETE FROM activity_log WHERE contacto_id = $1', [id])
    const result = await client.query('DELETE FROM contactos WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return NextResponse.json({ success: true })
}
