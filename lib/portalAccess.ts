import { queryOne } from './db'
import type { JWTPayload } from './types'

// Nunca confiar en el frontend para decidir qué proyecto ve un rol='cliente'.
// Devuelve false también si el proyecto no existe, para que el caller responda
// 404 sin distinguir "no existe" de "no es tuyo" (evita enumeración de IDs).
export async function canAccessProyectoPortal(user: JWTPayload, proyectoId: number): Promise<boolean> {
  if (user.rol !== 'cliente' || !user.contacto_id) return false
  const proyecto = await queryOne<{ cliente_id: number | null; visibilidad_cliente: string }>(
    'SELECT cliente_id, visibilidad_cliente FROM proyectos WHERE id = $1',
    [proyectoId]
  )
  if (!proyecto || proyecto.visibilidad_cliente === 'ninguna') return false
  return proyecto.cliente_id === user.contacto_id
}
