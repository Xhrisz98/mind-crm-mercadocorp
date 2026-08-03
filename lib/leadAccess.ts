import { queryOne } from './db'
import type { JWTPayload } from './types'

// Mismo criterio que /api/leads/[id]: comercial/admin ven todo, ventas solo sus leads asignados.
export async function canAccessLead(user: JWTPayload, contactoId: number): Promise<boolean> {
  if (user.rol !== 'ventas') return true
  const lead = await queryOne<{ vendedor_asignado_id: number | null }>(
    'SELECT vendedor_asignado_id FROM contactos WHERE id = $1',
    [contactoId]
  )
  return !!lead && lead.vendedor_asignado_id === parseInt(user.sub)
}
