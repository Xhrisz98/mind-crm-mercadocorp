import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { resolveRecipientsBySegmentoFiltros, resolveRecipientsByIds } from '@/lib/emailSegments'
import type { CampanaEmail, SegmentoEmail } from '@/lib/types'

function canAccess(rol: string): boolean {
  return rol === 'admin' || rol === 'comercial'
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const campanas = await query<CampanaEmail>(
    `SELECT c.*, s.nombre as segmento_nombre
     FROM public.campanas_email c
     LEFT JOIN public.segmentos_email s ON s.id = c.segmento_id
     ORDER BY c.fecha_creacion DESC`
  )

  return NextResponse.json({ campanas })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const asunto = typeof body.asunto === 'string' ? body.asunto.trim() : ''
  const contenidoHtml = typeof body.contenido_html === 'string' ? body.contenido_html : ''
  const segmentoId = body.segmento_id ? parseInt(body.segmento_id) : null
  const manualIds: number[] = Array.isArray(body.manual_ids) ? body.manual_ids.map(Number).filter((n: number) => !isNaN(n)) : []

  if (!nombre) return NextResponse.json({ error: 'El nombre de la campaña es requerido' }, { status: 400 })
  if (!asunto) return NextResponse.json({ error: 'El asunto es requerido' }, { status: 400 })
  if (!contenidoHtml.trim()) return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 })
  if (!segmentoId && manualIds.length === 0) {
    return NextResponse.json({ error: 'Debes seleccionar un segmento o clientes manualmente' }, { status: 400 })
  }

  let destinatariosCount: number
  if (segmentoId) {
    const segmento = await queryOne<SegmentoEmail>('SELECT * FROM public.segmentos_email WHERE id = $1', [segmentoId])
    if (!segmento) return NextResponse.json({ error: 'Segmento no encontrado' }, { status: 404 })
    destinatariosCount = (await resolveRecipientsBySegmentoFiltros(segmento.filtros)).length
  } else {
    destinatariosCount = (await resolveRecipientsByIds(manualIds)).length
  }

  const campana = await queryOne<CampanaEmail>(
    `INSERT INTO public.campanas_email
       (nombre, asunto, contenido_html, segmento_id, destinatarios_manual_ids, destinatarios_count, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      nombre, asunto, contenidoHtml, segmentoId,
      manualIds.length > 0 ? manualIds : null,
      destinatariosCount, parseInt(user.sub),
    ]
  )

  return NextResponse.json({ campana }, { status: 201 })
}
