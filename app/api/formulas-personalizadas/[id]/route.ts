import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { validarMetricaIds } from '@/lib/formulas'
import type { FormulaPersonalizada, FormulaDefinicion, FormulaOperacionRatio } from '@/lib/types'

const UNIDADES_VALIDAS = ['numero', 'usd', 'porcentaje']

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const existente = await queryOne<{ es_default: boolean }>(
    'SELECT es_default FROM public.formulas_personalizadas WHERE id = $1',
    [id]
  )
  if (!existente) return NextResponse.json({ error: 'Fórmula no encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  // El tipo de operación de una fórmula no se puede cambiar después de
  // creada (crear una fórmula nueva es el camino para eso) — la UI nunca
  // envía este campo en un PATCH, pero lo rechazamos igual por si acaso.
  if ('operacion' in body) {
    return NextResponse.json({ error: 'La operación de una fórmula no se puede modificar' }, { status: 400 })
  }

  // Las fórmulas del sistema (CTR/CPC/costo por conversión) no se pueden
  // editar ni archivar: su `clave` es referenciada por código (ver
  // OBJETIVO_KPI_DESTACADO en lib/utils.ts) y siempre deben aparecer en el
  // dashboard de campaña. Solo se admite ajustar la descripción.
  if (existente.es_default) {
    if ('nombre' in body || 'unidad' in body || 'numerador' in body || 'denominador' in body || 'metricas' in body || 'archivada' in body) {
      return NextResponse.json({ error: 'No se puede modificar una fórmula del sistema' }, { status: 400 })
    }
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() || null : null
    await query('UPDATE public.formulas_personalizadas SET descripcion = $1 WHERE id = $2', [descripcion, id])
  } else {
    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if ('nombre' in body) {
      const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
      if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
      updates.push(`nombre = $${idx++}`)
      values.push(nombre)
    }
    if ('descripcion' in body) {
      updates.push(`descripcion = $${idx++}`)
      values.push(typeof body.descripcion === 'string' ? body.descripcion.trim() || null : null)
    }
    if ('unidad' in body) {
      if (!UNIDADES_VALIDAS.includes(body.unidad)) return NextResponse.json({ error: 'Unidad inválida' }, { status: 400 })
      updates.push(`unidad = $${idx++}`)
      values.push(body.unidad)
    }
    if ('archivada' in body) {
      if (typeof body.archivada !== 'boolean') return NextResponse.json({ error: 'archivada debe ser booleano' }, { status: 400 })
      updates.push(`archivada = $${idx++}`)
      values.push(body.archivada)
    }
    if ('numerador' in body || 'denominador' in body || 'metricas' in body) {
      const actual = await queryOne<{ definicion: FormulaDefinicion }>(
        'SELECT definicion FROM public.formulas_personalizadas WHERE id = $1',
        [id]
      )
      const definicionActual = actual!.definicion
      let definicion: FormulaDefinicion

      if (definicionActual.operacion === 'ratio') {
        const numerador = 'numerador' in body ? await validarMetricaIds(body.numerador) : (definicionActual as FormulaOperacionRatio).numerador
        const denominador = 'denominador' in body ? await validarMetricaIds(body.denominador) : (definicionActual as FormulaOperacionRatio).denominador
        if (!numerador) return NextResponse.json({ error: 'Selecciona al menos una métrica válida para el numerador' }, { status: 400 })
        if (!denominador) return NextResponse.json({ error: 'Selecciona al menos una métrica válida para el denominador' }, { status: 400 })
        definicion = { operacion: 'ratio', numerador, denominador }
      } else {
        const metricas = 'metricas' in body ? await validarMetricaIds(body.metricas, 2) : definicionActual.metricas
        if (!metricas) return NextResponse.json({ error: 'Selecciona al menos dos métricas válidas' }, { status: 400 })
        definicion = { operacion: definicionActual.operacion, metricas }
      }

      updates.push(`definicion = $${idx++}`)
      values.push(JSON.stringify(definicion))
    }

    if (updates.length > 0) {
      values.push(id)
      await query(`UPDATE public.formulas_personalizadas SET ${updates.join(', ')} WHERE id = $${idx}`, values)
    }
  }

  const formula = await queryOne<FormulaPersonalizada>(
    `SELECT f.*, u.nombre as creado_por_nombre
     FROM public.formulas_personalizadas f
     LEFT JOIN public.usuarios_crm u ON u.id = f.creado_por
     WHERE f.id = $1`,
    [id]
  )

  return NextResponse.json({ formula })
}
