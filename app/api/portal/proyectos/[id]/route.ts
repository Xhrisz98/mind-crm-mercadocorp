import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { canAccessProyectoPortal } from '@/lib/portalAccess'
import type { Proyecto, Tarea } from '@/lib/types'

// 404 (no 403, no array vacío) cuando el proyecto no es del contacto de la
// sesión — así un cliente que adivina un ID ajeno no puede distinguir "no
// existe" de "no es tuyo". canAccessProyectoPortal valida contacto_id
// server-side siempre, nunca a partir de lo que mande el frontend.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'cliente' || !user.contacto_id) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const puedeAcceder = await canAccessProyectoPortal(user, id)
  if (!puedeAcceder) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const proyecto = await queryOne<Proyecto>(
    `SELECT p.*,
        COUNT(t.id) FILTER (WHERE t.visible_cliente) as tareas_total,
        COUNT(t.id) FILTER (WHERE t.visible_cliente AND te.es_estado_final) as tareas_completadas,
        MIN(t.fecha_limite) FILTER (WHERE t.visible_cliente AND t.fecha_limite >= CURRENT_DATE AND NOT te.es_estado_final) as proxima_fecha_limite
     FROM public.proyectos p
     LEFT JOIN public.tareas t ON t.proyecto_id = p.id
     LEFT JOIN public.tareas_estados te ON te.id = t.tarea_estado_id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  )
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  // Modo 'resumen': solo KPIs, sin tablero (ver spec de /portal).
  if (proyecto.visibilidad_cliente === 'resumen') {
    return NextResponse.json({ proyecto, tareas: [] })
  }

  // Modo 'completo': tablero de solo lectura, filtrado a tareas visibles al
  // cliente, con sus adjuntos de imagen.
  const tareas = await query<Tarea>(
    `SELECT t.*,
        te.nombre as tarea_estado_nombre,
        te.color as tarea_estado_color,
        te.orden as tarea_estado_orden,
        te.es_estado_final,
        COALESCE(
          (SELECT json_agg(a.* ORDER BY a.fecha_creacion ASC)
           FROM public.tareas_adjuntos a WHERE a.tarea_id = t.id),
          '[]'
        ) as adjuntos
     FROM public.tareas t
     JOIN public.tareas_estados te ON te.id = t.tarea_estado_id
     WHERE t.proyecto_id = $1 AND t.visible_cliente = true
     ORDER BY te.orden ASC, t.fecha_creacion ASC`,
    [id]
  )

  return NextResponse.json({ proyecto, tareas })
}
