import { query, queryOne } from '@/lib/db'
import type { SegmentoFiltros } from '@/lib/types'

export interface DestinatarioEmail {
  id: number
  nombre: string | null
  apellido: string | null
  email: string
}

// opt_in_email = true se fuerza siempre — es la regla de compliance de la sección 7.3/7.1:
// nunca se envía correo a un cliente sin consentimiento, sin excepción.
function buildFiltrosWhere(filtros: SegmentoFiltros): { where: string; params: unknown[] } {
  const conditions: string[] = ['opt_in_email = true', 'email IS NOT NULL']
  const params: unknown[] = []
  let idx = 1

  if (filtros.tipo_cliente) { conditions.push(`tipo_cliente = $${idx++}`); params.push(filtros.tipo_cliente) }
  if (filtros.activo !== undefined) { conditions.push(`activo = $${idx++}`); params.push(filtros.activo) }
  if (filtros.tiene_wallet !== undefined) { conditions.push(`tiene_wallet = $${idx++}`); params.push(filtros.tiene_wallet) }
  if (filtros.signup_desde) { conditions.push(`fecha_signup >= $${idx++}`); params.push(filtros.signup_desde) }
  if (filtros.signup_hasta) { conditions.push(`fecha_signup <= $${idx++}`); params.push(filtros.signup_hasta) }
  if (filtros.accion_desde) { conditions.push(`fecha_ultima_accion >= $${idx++}`); params.push(filtros.accion_desde) }
  if (filtros.accion_hasta) { conditions.push(`fecha_ultima_accion <= $${idx++}`); params.push(filtros.accion_hasta) }

  return { where: `WHERE ${conditions.join(' AND ')}`, params }
}

export async function countBySegmentoFiltros(filtros: SegmentoFiltros): Promise<number> {
  const { where, params } = buildFiltrosWhere(filtros)
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM public.programa_clientes ${where}`,
    params
  )
  return parseInt(row?.count || '0')
}

export async function resolveRecipientsBySegmentoFiltros(filtros: SegmentoFiltros): Promise<DestinatarioEmail[]> {
  const { where, params } = buildFiltrosWhere(filtros)
  return query<DestinatarioEmail>(
    `SELECT id, nombre, apellido, email FROM public.programa_clientes ${where}`,
    params
  )
}

export async function resolveRecipientsByIds(ids: number[]): Promise<DestinatarioEmail[]> {
  if (ids.length === 0) return []
  return query<DestinatarioEmail>(
    `SELECT id, nombre, apellido, email FROM public.programa_clientes
     WHERE id = ANY($1) AND opt_in_email = true AND email IS NOT NULL`,
    [ids]
  )
}
