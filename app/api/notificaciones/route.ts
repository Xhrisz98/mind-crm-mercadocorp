import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export type NotifType = 'lead_caliente' | 'asignacion' | 'pausa'

export interface NotifLead {
  id: number
  nombre: string
  canal: string
  estado_lead: string
  lead_score: string
  fecha_ultima_interaccion: string
  type: NotifType
}

const COLS = 'id, nombre, canal, estado_lead, lead_score, fecha_ultima_interaccion'
const INTERVAL = `NOW() - INTERVAL '5 minutes'`

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const userId = parseInt(user.sub)
  const isVentas = user.rol === 'ventas'

  const [pausados, asignados, calientes] = await Promise.all([
    // 1. en_atencion_humana changed in last 5 min
    isVentas
      ? query<NotifLead>(
          `SELECT ${COLS}, 'pausa'::text AS type FROM contactos
           WHERE estado_lead = 'en_atencion_humana'
             AND fecha_cambio_estado >= ${INTERVAL}
             AND vendedor_asignado_id = $1`,
          [userId]
        )
      : query<NotifLead>(
          `SELECT ${COLS}, 'pausa'::text AS type FROM contactos
           WHERE estado_lead = 'en_atencion_humana'
             AND fecha_cambio_estado >= ${INTERVAL}`,
          []
        ),

    // 2. Recently assigned leads
    isVentas
      ? query<NotifLead>(
          `SELECT DISTINCT c.id, c.nombre, c.canal, c.estado_lead, c.lead_score,
                  c.fecha_ultima_interaccion, 'asignacion'::text AS type
           FROM contactos c
           JOIN activity_log al ON al.contacto_id = c.id
           WHERE c.vendedor_asignado_id = $1
             AND al.accion = 'asignar_vendedor'
             AND al.timestamp >= ${INTERVAL}`,
          [userId]
        )
      : query<NotifLead>(
          `SELECT DISTINCT c.id, c.nombre, c.canal, c.estado_lead, c.lead_score,
                  c.fecha_ultima_interaccion, 'asignacion'::text AS type
           FROM contactos c
           JOIN activity_log al ON al.contacto_id = c.id
           WHERE al.accion = 'asignar_vendedor'
             AND al.timestamp >= ${INTERVAL}`,
          []
        ),

    // 3. Hot leads (lead_score = 'caliente') with recent interaction
    isVentas
      ? query<NotifLead>(
          `SELECT ${COLS}, 'lead_caliente'::text AS type FROM contactos
           WHERE lead_score = 'caliente'
             AND fecha_ultima_interaccion >= ${INTERVAL}
             AND vendedor_asignado_id = $1`,
          [userId]
        )
      : query<NotifLead>(
          `SELECT ${COLS}, 'lead_caliente'::text AS type FROM contactos
           WHERE lead_score = 'caliente'
             AND fecha_ultima_interaccion >= ${INTERVAL}`,
          []
        ),
  ])

  // Merge and deduplicate by id+type
  const seen = new Set<string>()
  const notifications = [...pausados, ...asignados, ...calientes].filter((n) => {
    const key = `${n.id}_${n.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ notifications })
}
