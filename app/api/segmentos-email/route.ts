import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { countBySegmentoFiltros } from '@/lib/emailSegments'
import type { SegmentoEmail } from '@/lib/types'

function canAccess(rol: string): boolean {
  return rol === 'admin' || rol === 'comercial'
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const segmentos = await query<SegmentoEmail>(
    `SELECT s.*, u.nombre as creado_por_nombre
     FROM public.segmentos_email s
     LEFT JOIN public.usuarios_crm u ON u.id = s.creado_por
     ORDER BY s.fecha_creacion DESC`
  )

  return NextResponse.json({ segmentos })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const filtros = body.filtros && typeof body.filtros === 'object' ? body.filtros : {}

  if (!nombre) return NextResponse.json({ error: 'El nombre del segmento es requerido' }, { status: 400 })

  const count = await countBySegmentoFiltros(filtros)

  const segmento = await queryOne<SegmentoEmail>(
    `INSERT INTO public.segmentos_email (nombre, filtros, creado_por)
     VALUES ($1, $2, $3) RETURNING *`,
    [nombre, JSON.stringify(filtros), parseInt(user.sub)]
  )

  return NextResponse.json({ segmento, count }, { status: 201 })
}
