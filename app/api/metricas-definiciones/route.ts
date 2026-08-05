import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { MetricaDefinicion } from '@/lib/types'

const UNIDADES_VALIDAS = ['numero', 'usd', 'porcentaje']
const CATEGORIAS_VALIDAS = ['alcance', 'engagement', 'conversion', 'gasto']

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial'
}

function slugificar(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const metricas = await query<MetricaDefinicion>(
    `SELECT md.*, u.nombre as creado_por_nombre,
        EXISTS (SELECT 1 FROM public.campanas_metricas_valores cmv WHERE cmv.metrica_definicion_id = md.id) as tiene_valores
     FROM public.metricas_definiciones md
     LEFT JOIN public.usuarios_crm u ON u.id = md.creado_por
     ORDER BY md.es_default DESC, md.nombre ASC`
  )

  return NextResponse.json({ metricas })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const unidad = body.unidad || 'numero'
  if (!UNIDADES_VALIDAS.includes(unidad)) {
    return NextResponse.json({ error: 'Unidad inválida' }, { status: 400 })
  }

  const categoria = body.categoria || null
  if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const base = slugificar(nombre)
  if (!base) return NextResponse.json({ error: 'El nombre debe incluir letras o números' }, { status: 400 })

  const existentes = await query<{ clave: string }>(
    'SELECT clave FROM public.metricas_definiciones WHERE clave = $1 OR clave ~ $2',
    [base, `^${base}_[0-9]+$`]
  )
  let clave = base
  if (existentes.length > 0) {
    const claves = new Set(existentes.map((r) => r.clave))
    let n = 2
    while (claves.has(`${base}_${n}`)) n++
    clave = `${base}_${n}`
  }

  const nueva = await queryOne<{ id: number }>(
    `INSERT INTO public.metricas_definiciones (clave, nombre, unidad, categoria, es_default, creado_por)
     VALUES ($1, $2, $3, $4, FALSE, $5)
     RETURNING id`,
    [clave, nombre, unidad, categoria, parseInt(user.sub)]
  )

  const metrica = await queryOne<MetricaDefinicion>(
    `SELECT md.*, u.nombre as creado_por_nombre, FALSE as tiene_valores
     FROM public.metricas_definiciones md
     LEFT JOIN public.usuarios_crm u ON u.id = md.creado_por
     WHERE md.id = $1`,
    [nueva!.id]
  )

  return NextResponse.json({ metrica }, { status: 201 })
}
