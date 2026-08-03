import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Contacto } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json()

  const CONTACT_FIELDS = ['nombre', 'telefono', 'email', 'whatsapp_number', 'instagram_id', 'facebook_id'] as const

  const updates: string[] = []
  const values: unknown[] = []
  const contactChanges: { anterior: string | null; nuevo: string | null }[] = []
  let idx = 1

  // Fetch current values for activity_log
  const current = await queryOne<Contacto>(
    'SELECT nombre, telefono, email, whatsapp_number, instagram_id, facebook_id, agente_pausado, lead_score, vendedor_asignado_id FROM contactos WHERE id = $1',
    [id]
  )
  if (!current) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })

  // Contact fields: nombre, telefono, email — solo comercial/admin
  if (CONTACT_FIELDS.some((key) => key in body) && user.rol === 'ventas') {
    return NextResponse.json({ error: 'Sin permiso para editar los datos de contacto' }, { status: 403 })
  }

  for (const key of CONTACT_FIELDS) {
    if (key in body) {
      const nuevo = body[key] as string | null
      const anterior = current[key] ?? null
      if (key === 'nombre' && !nuevo) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      }
      updates.push(`${key} = $${idx++}`)
      values.push(nuevo || null)
      if (String(anterior ?? '') !== String(nuevo ?? '')) {
        contactChanges.push({ anterior, nuevo: nuevo || null })
      }
    }
  }

  // Lead score (manual override) — comercial/admin only
  // Un trigger en la DB (calcular_lead_score) recalcula lead_score en cada UPDATE
  // según estado_lead/tiempo; lead_score_manual=true le indica al trigger que respete el valor manual.
  const LEAD_SCORE_VALUES = ['frio', 'tibio', 'caliente', 'cliente']
  if ('lead_score' in body) {
    if (user.rol === 'ventas') {
      return NextResponse.json({ error: 'Sin permiso para cambiar el score' }, { status: 403 })
    }
    if (!LEAD_SCORE_VALUES.includes(body.lead_score)) {
      return NextResponse.json({ error: 'Valor de lead_score inválido' }, { status: 400 })
    }
    const anterior = current.lead_score ?? null
    updates.push(`lead_score = $${idx++}`)
    values.push(body.lead_score)
    updates.push(`lead_score_manual = $${idx++}`)
    values.push(true)
    if (String(anterior ?? '') !== String(body.lead_score)) {
      contactChanges.push({ anterior, nuevo: body.lead_score })
    }
  } else if ('lead_score_manual' in body) {
    if (user.rol === 'ventas') {
      return NextResponse.json({ error: 'Sin permiso para cambiar el score' }, { status: 403 })
    }
    updates.push(`lead_score_manual = $${idx++}`)
    values.push(!!body.lead_score_manual)
  }

  // Agent fields: agente_pausado, pausa_hasta — ventas solo puede tocar sus propios leads
  if (('agente_pausado' in body || 'pausa_hasta' in body) && user.rol === 'ventas') {
    if (current.vendedor_asignado_id !== parseInt(user.sub)) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    }
  }

  let agentAction: 'pausar_agente' | 'reactivar_agente' | null = null
  if ('agente_pausado' in body) {
    updates.push(`agente_pausado = $${idx++}`)
    values.push(body.agente_pausado)
    agentAction = body.agente_pausado ? 'pausar_agente' : 'reactivar_agente'
  }
  if ('pausa_hasta' in body) {
    updates.push(`pausa_hasta = $${idx++}`)
    values.push(body.pausa_hasta ?? null)
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  values.push(id)
  const updated = await queryOne<Contacto>(
    `UPDATE contactos SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  // Log contact field changes
  for (const change of contactChanges) {
    await query(
      `INSERT INTO activity_log (usuario_id, contacto_id, accion, valor_anterior, valor_nuevo)
       VALUES ($1, $2, $3, $4, $5)`,
      [parseInt(user.sub), id, 'actualizar_contacto', change.anterior, change.nuevo]
    )
  }

  // Log agent pause/resume
  if (agentAction) {
    await query(
      `INSERT INTO activity_log (usuario_id, contacto_id, accion, valor_anterior, valor_nuevo)
       VALUES ($1, $2, $3, $4, $5)`,
      [parseInt(user.sub), id, agentAction, String(current.agente_pausado ?? false), String(body.agente_pausado)]
    )
  }

  return NextResponse.json({ contacto: updated })
}
