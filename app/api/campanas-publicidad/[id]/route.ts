import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { evaluarFormulaRatio } from '@/lib/formulas'
import type { CampanaPublicidad, CampanaMetricaValor, FormulaPersonalizada, FormulaValor } from '@/lib/types'

const SELECT_CAMPANA = `
  SELECT cp.*,
    c.nombre as cliente_nombre,
    u.nombre as creado_por_nombre
  FROM public.campanas_publicidad cp
  LEFT JOIN public.contactos c ON c.id = cp.cliente_id
  LEFT JOIN public.usuarios_crm u ON u.id = cp.creado_por
`

function checkAcceso(rol: string) {
  return rol === 'admin' || rol === 'comercial'
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!checkAcceso(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const campana = await queryOne<CampanaPublicidad>(`${SELECT_CAMPANA} WHERE cp.id = $1`, [id])
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

  const metricas = await query<CampanaMetricaValor>(
    `SELECT cmv.*, md.clave as metrica_clave, md.nombre as metrica_nombre, md.unidad as metrica_unidad,
        u.nombre as registrado_por_nombre
     FROM public.campanas_metricas_valores cmv
     JOIN public.metricas_definiciones md ON md.id = cmv.metrica_definicion_id
     LEFT JOIN public.usuarios_crm u ON u.id = cmv.registrado_por
     WHERE cmv.campana_id = $1
     ORDER BY cmv.fecha DESC, md.clave ASC`,
    [id]
  )

  // Totales de TODAS las métricas del catálogo para esta campaña (0 si nunca
  // se registró) — alimenta tanto metricas_totales como la evaluación de
  // fórmulas en TypeScript (más simple de mantener que interpretar el JSONB
  // en SQL, suficientemente rápido para este volumen de datos).
  const totalesRaw = await query<{ metrica_definicion_id: number; clave: string; total: string }>(
    `SELECT md.id as metrica_definicion_id, md.clave, COALESCE(SUM(cmv.valor), 0) as total
     FROM public.metricas_definiciones md
     LEFT JOIN public.campanas_metricas_valores cmv ON cmv.metrica_definicion_id = md.id AND cmv.campana_id = $1
     GROUP BY md.id, md.clave`,
    [id]
  )
  const metricas_totales: Record<string, number> = {}
  const valoresPorMetricaId: Record<number, number> = {}
  for (const row of totalesRaw) {
    const total = Number(row.total)
    metricas_totales[row.clave] = total
    valoresPorMetricaId[row.metrica_definicion_id] = total
  }

  const formulasDefinidas = await query<FormulaPersonalizada>(
    `SELECT * FROM public.formulas_personalizadas WHERE es_default = TRUE OR archivada = FALSE ORDER BY es_default DESC, fecha_creacion ASC`
  )
  const formulas: FormulaValor[] = formulasDefinidas.map((f) => ({
    id: f.id,
    clave: f.clave,
    nombre: f.nombre,
    unidad: f.unidad,
    es_default: f.es_default,
    valor: evaluarFormulaRatio(f.definicion, valoresPorMetricaId),
  }))

  // ROI estimado: negocios ganados del cliente vinculado a la campaña dentro
  // de su rango de fechas. Es una aproximación por rango+cliente, no
  // atribución exacta por campaña (un negocio ganado podría no venir de esta
  // campaña específica) — de ahí el disclaimer que muestra la UI. Caso
  // especial fuera del catálogo de fórmulas: depende de `negocios`, no de
  // valores registrados en campanas_metricas_valores.
  const gastoTotal = metricas_totales['gasto'] ?? 0
  let ingreso_estimado: number | null = null
  if (campana.cliente_id) {
    const desde = campana.fecha_inicio ?? campana.fecha_creacion
    const [roiRow] = await query<{ ingreso: string | null }>(
      `SELECT SUM(n.monto) as ingreso
       FROM public.negocios n
       JOIN public.pipeline_estados pe ON pe.id = n.pipeline_estado_id
       WHERE n.contacto_id = $1
         AND pe.es_estado_ganado = true
         AND n.fecha_actualizacion >= $2
         AND n.fecha_actualizacion <= COALESCE($3::timestamptz, NOW())`,
      [campana.cliente_id, desde, campana.fecha_fin]
    )
    ingreso_estimado = roiRow?.ingreso != null ? Number(roiRow.ingreso) : 0
  }
  const roi_estimado_pct =
    ingreso_estimado != null && gastoTotal > 0
      ? Math.round(((ingreso_estimado - gastoTotal) / gastoTotal) * 100)
      : null

  return NextResponse.json({
    campana: { ...campana, metricas_totales, formulas, ingreso_estimado, roi_estimado_pct },
    metricas,
  })
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

  const body = await req.json()

  const OBJETIVOS_VALIDOS = ['reconocimiento', 'trafico', 'conversion']
  if (body.objetivo && !OBJETIVOS_VALIDOS.includes(body.objetivo)) {
    return NextResponse.json({ error: 'Objetivo inválido' }, { status: 400 })
  }

  const allowed = ['nombre', 'plataforma', 'cliente_id', 'objetivo', 'presupuesto', 'fecha_inicio', 'fecha_fin', 'estado']
  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = $${idx++}`)
      values.push(body[key])
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  values.push(id)
  const result = await query(
    `UPDATE public.campanas_publicidad SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`,
    values
  )
  if (result.length === 0) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

  const campanaRow = await queryOne<Omit<CampanaPublicidad, 'metricas_totales'>>(
    `${SELECT_CAMPANA} WHERE cp.id = $1`,
    [id]
  )
  const campana: CampanaPublicidad | null = campanaRow ? { ...campanaRow, metricas_totales: {} } : null

  return NextResponse.json({ campana })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && !user.puede_eliminar) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const result = await query('DELETE FROM public.campanas_publicidad WHERE id = $1 RETURNING id', [id])
  if (result.length === 0) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

  return NextResponse.json({ success: true })
}
