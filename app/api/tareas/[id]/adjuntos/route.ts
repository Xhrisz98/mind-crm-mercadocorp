import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { TareaAdjunto } from '@/lib/types'

// Recibe la URL ya subida a n8n (POST /api/upload/token + subida directa al
// webhook, ver LeadDetailClient.tsx) y solo la persiste — no vuelve a validar
// el archivo ni a tocar el endpoint de token.
//
// Permiso de adjuntar: admin/comercial siempre; ventas solo si es el
// asignado_a de la tarea. No relajamos la restricción de rol='ventas' en
// /api/upload/token (no hay commit ni comentario que explique esa regla, y
// el botón de adjuntar en LeadDetailClient.tsx no la refleja en la UI — no
// hay evidencia de que sea una política genérica), así que el permiso para
// este feature se valida aquí, en el endpoint específico de tareas.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial' && user.rol !== 'ventas') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const tareaId = parseInt(params.id)
  if (Number.isNaN(tareaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const tarea = await queryOne<{ id: number; asignado_a: number | null }>(
    'SELECT id, asignado_a FROM public.tareas WHERE id = $1',
    [tareaId]
  )
  if (!tarea) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })

  if (user.rol === 'ventas' && tarea.asignado_a !== parseInt(user.sub)) {
    return NextResponse.json({ error: 'Solo el asignado a la tarea puede adjuntar imágenes' }, { status: 403 })
  }

  const body = await req.json()
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) return NextResponse.json({ error: 'La url del archivo es requerida' }, { status: 400 })

  const nombreArchivo = body.nombre_archivo || null
  const tipoMime = body.tipo_mime || null

  const adjunto = await queryOne<TareaAdjunto>(
    `INSERT INTO public.tareas_adjuntos (tarea_id, url, nombre_archivo, tipo_mime, subido_por)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tareaId, url, nombreArchivo, tipoMime, parseInt(user.sub)]
  )

  return NextResponse.json({ adjunto }, { status: 201 })
}
