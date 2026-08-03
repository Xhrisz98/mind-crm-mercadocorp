import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { PlantillaEmail } from '@/lib/types'

function canAccess(rol: string): boolean {
  return rol === 'admin' || rol === 'comercial'
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const plantillas = await query<PlantillaEmail>(
    'SELECT * FROM public.plantillas_email ORDER BY fecha_creacion DESC'
  )
  return NextResponse.json({ plantillas })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const asunto = typeof body.asunto === 'string' ? body.asunto.trim() : ''
  const contenidoHtml = typeof body.contenido_html === 'string' ? body.contenido_html : ''

  if (!nombre) return NextResponse.json({ error: 'El nombre de la plantilla es requerido' }, { status: 400 })
  if (!contenidoHtml.trim()) return NextResponse.json({ error: 'El contenido HTML es requerido' }, { status: 400 })

  const plantilla = await queryOne<PlantillaEmail>(
    `INSERT INTO public.plantillas_email (nombre, asunto, contenido_html, creado_por)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [nombre, asunto || null, contenidoHtml, parseInt(user.sub)]
  )

  return NextResponse.json({ plantilla }, { status: 201 })
}
