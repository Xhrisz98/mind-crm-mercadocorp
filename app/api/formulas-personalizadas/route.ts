import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { validarMetricaIds, operacionValida } from '@/lib/formulas'
import type { FormulaPersonalizada, FormulaDefinicion } from '@/lib/types'

const UNIDADES_VALIDAS = ['numero', 'usd', 'porcentaje']

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial'
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const incluirArchivadas = searchParams.get('archivadas') === 'true'

  const formulas = await query<FormulaPersonalizada>(
    `SELECT f.*, u.nombre as creado_por_nombre
     FROM public.formulas_personalizadas f
     LEFT JOIN public.usuarios_crm u ON u.id = f.creado_por
     ${incluirArchivadas ? '' : 'WHERE f.archivada = FALSE'}
     ORDER BY f.es_default DESC, f.fecha_creacion ASC`
  )

  return NextResponse.json({ formulas })
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

  if (!operacionValida(body.operacion)) {
    return NextResponse.json({ error: 'Operación inválida' }, { status: 400 })
  }

  let definicion: FormulaDefinicion
  if (body.operacion === 'ratio') {
    const numerador = await validarMetricaIds(body.numerador)
    if (!numerador) return NextResponse.json({ error: 'Selecciona al menos una métrica válida para el numerador' }, { status: 400 })
    const denominador = await validarMetricaIds(body.denominador)
    if (!denominador) return NextResponse.json({ error: 'Selecciona al menos una métrica válida para el denominador' }, { status: 400 })
    definicion = { operacion: 'ratio', numerador, denominador }
  } else {
    const metricas = await validarMetricaIds(body.metricas, 2)
    if (!metricas) return NextResponse.json({ error: 'Selecciona al menos dos métricas válidas' }, { status: 400 })
    definicion = { operacion: body.operacion, metricas }
  }

  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() || null : null

  const nueva = await queryOne<{ id: number }>(
    `INSERT INTO public.formulas_personalizadas (nombre, descripcion, unidad, definicion, es_default, es_compartida, creado_por)
     VALUES ($1, $2, $3, $4, FALSE, TRUE, $5)
     RETURNING id`,
    [nombre, descripcion, unidad, JSON.stringify(definicion), parseInt(user.sub)]
  )

  const formula = await queryOne<FormulaPersonalizada>(
    `SELECT f.*, u.nombre as creado_por_nombre
     FROM public.formulas_personalizadas f
     LEFT JOIN public.usuarios_crm u ON u.id = f.creado_por
     WHERE f.id = $1`,
    [nueva!.id]
  )

  return NextResponse.json({ formula }, { status: 201 })
}
