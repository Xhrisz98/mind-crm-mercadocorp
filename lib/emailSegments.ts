import { query, queryOne } from '@/lib/db'
import type { SegmentoFiltros } from '@/lib/types'

export interface DestinatarioEmail {
  id: number
  nombre: string | null
  email: string
}

// MercadoCorp opera hoy sin un gate de opt-in explícito: los contactos son
// leads/clientes B2B gestionados activamente por un vendedor (outbound), no
// una base de suscriptores que se auto-registró. El único requisito es tener
// email. TODO: si esta plantilla se reutiliza con un cliente que sí necesite
// exigir opt-in (ej. un negocio con marketing masivo B2C), agregar una
// columna `opt_in_email` a `contactos` y sumarla aquí como condición fija,
// igual que hacía `programa_clientes.opt_in_email` en el CRM de Bullpadel.
function buildFiltrosWhere(filtros: SegmentoFiltros): { where: string; params: unknown[] } {
  const conditions: string[] = ['email IS NOT NULL']
  const params: unknown[] = []
  let idx = 1

  if (filtros.estado_lead) { conditions.push(`estado_lead = $${idx++}`); params.push(filtros.estado_lead) }
  if (filtros.canal) { conditions.push(`canal = $${idx++}`); params.push(filtros.canal) }
  if (filtros.lead_score) { conditions.push(`lead_score = $${idx++}`); params.push(filtros.lead_score) }
  if (filtros.vendedor_asignado_id !== undefined) { conditions.push(`vendedor_asignado_id = $${idx++}`); params.push(filtros.vendedor_asignado_id) }
  if (filtros.contacto_desde) { conditions.push(`fecha_primer_contacto >= $${idx++}`); params.push(filtros.contacto_desde) }
  if (filtros.contacto_hasta) { conditions.push(`fecha_primer_contacto <= $${idx++}`); params.push(filtros.contacto_hasta) }

  return { where: `WHERE ${conditions.join(' AND ')}`, params }
}

export async function countBySegmentoFiltros(filtros: SegmentoFiltros): Promise<number> {
  const { where, params } = buildFiltrosWhere(filtros)
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM public.contactos ${where}`,
    params
  )
  return parseInt(row?.count || '0')
}

export async function resolveRecipientsBySegmentoFiltros(filtros: SegmentoFiltros): Promise<DestinatarioEmail[]> {
  const { where, params } = buildFiltrosWhere(filtros)
  return query<DestinatarioEmail>(
    `SELECT id, nombre, email FROM public.contactos ${where}`,
    params
  )
}

export async function resolveRecipientsByIds(ids: number[]): Promise<DestinatarioEmail[]> {
  if (ids.length === 0) return []
  return query<DestinatarioEmail>(
    `SELECT id, nombre, email FROM public.contactos WHERE id = ANY($1) AND email IS NOT NULL`,
    [ids]
  )
}
