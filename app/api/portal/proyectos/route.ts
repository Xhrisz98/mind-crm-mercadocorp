import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Proyecto } from '@/lib/types'

// Endpoint SEPARADO del /api/proyectos interno (no el mismo con un if) para
// que sea trivial auditar qué expone el rol 'cliente'. El middleware ya
// bloquea /api/portal/** a quien no sea 'cliente', pero igual se valida
// server-side aquí: nunca se confía en el frontend para decidir qué
// contacto_id representa la sesión.
export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'cliente' || !user.contacto_id) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const proyectos = await query<Proyecto>(
    `SELECT p.*,
        COUNT(t.id) FILTER (WHERE t.visible_cliente) as tareas_total,
        COUNT(t.id) FILTER (WHERE t.visible_cliente AND te.es_estado_final) as tareas_completadas,
        MIN(t.fecha_limite) FILTER (WHERE t.visible_cliente AND t.fecha_limite >= CURRENT_DATE AND NOT te.es_estado_final) as proxima_fecha_limite
     FROM public.proyectos p
     LEFT JOIN public.tareas t ON t.proyecto_id = p.id
     LEFT JOIN public.tareas_estados te ON te.id = t.tarea_estado_id
     WHERE p.cliente_id = $1 AND p.visibilidad_cliente != 'ninguna'
     GROUP BY p.id
     ORDER BY p.fecha_creacion DESC`,
    [user.contacto_id]
  )

  return NextResponse.json({ proyectos })
}
