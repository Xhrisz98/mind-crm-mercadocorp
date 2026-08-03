import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { Etiqueta } from '@/lib/types'

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const etiquetas = await query<Etiqueta>(
    'SELECT * FROM etiquetas ORDER BY nombre ASC'
  )

  return NextResponse.json({ etiquetas })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') {
    return NextResponse.json({ error: 'Sin permiso para crear etiquetas' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const nombre = (body.nombre as string | undefined)?.trim()
  const color = (body.color as string | undefined)?.trim() || '#1B2B8C'

  if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!COLOR_REGEX.test(color)) {
    return NextResponse.json({ error: 'Color inválido, usa formato #RRGGBB' }, { status: 400 })
  }

  const existing = await queryOne('SELECT id FROM etiquetas WHERE nombre = $1', [nombre])
  if (existing) return NextResponse.json({ error: 'Ya existe una etiqueta con ese nombre' }, { status: 409 })

  const nueva = await queryOne<Etiqueta>(
    `INSERT INTO etiquetas (nombre, color, creado_por) VALUES ($1, $2, $3) RETURNING *`,
    [nombre, color, parseInt(user.sub)]
  )

  return NextResponse.json({ etiqueta: nueva }, { status: 201 })
}
