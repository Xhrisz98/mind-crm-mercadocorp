import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Contacto } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const canal = searchParams.get('canal')
  const search = searchParams.get('q')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const etiquetaId = searchParams.get('etiqueta_id')
  const all = searchParams.get('all') === '1'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = all ? 500 : parseInt(searchParams.get('limit') || '25')
  const offset = all ? 0 : (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (user.rol === 'ventas') {
    conditions.push(`c.vendedor_asignado_id = $${idx++}`)
    params.push(parseInt(user.sub))
  }

  if (estado) {
    conditions.push(`c.estado_lead = $${idx++}`)
    params.push(estado)
  }

  if (canal) {
    conditions.push(`c.canal = $${idx++}`)
    params.push(canal)
  }

  if (search) {
    conditions.push(`(c.nombre ILIKE $${idx} OR c.telefono ILIKE $${idx} OR c.email ILIKE $${idx})`)
    params.push(`%${search}%`)
    idx++
  }

  if (desde) {
    conditions.push(`c.fecha_primer_contacto >= $${idx++}`)
    params.push(desde)
  }

  if (hasta) {
    conditions.push(`c.fecha_primer_contacto < $${idx++}::date + interval '1 day'`)
    params.push(hasta)
  }

  if (etiquetaId) {
    conditions.push(
      `EXISTS (SELECT 1 FROM contacto_etiquetas ce WHERE ce.contacto_id = c.id AND ce.etiqueta_id = $${idx++})`
    )
    params.push(parseInt(etiquetaId))
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<Contacto>(
    `SELECT c.*, u.nombre as vendedor_nombre,
       COALESCE(
         (SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre, 'color', e.color) ORDER BY e.nombre)
          FROM contacto_etiquetas ce
          JOIN etiquetas e ON e.id = ce.etiqueta_id
          WHERE ce.contacto_id = c.id),
         '[]'
       ) as etiquetas
     FROM contactos c
     LEFT JOIN usuarios_crm u ON c.vendedor_asignado_id = u.id
     ${where}
     ORDER BY c.fecha_ultima_interaccion DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  )

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM contactos c ${where}`,
    params
  )

  return NextResponse.json({ leads: rows, total: parseInt(count), page, limit })
}
