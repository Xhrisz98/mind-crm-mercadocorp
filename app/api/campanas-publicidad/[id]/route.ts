import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { CampanaPublicidad, CampanaMetricaDiaria } from '@/lib/types'

const SELECT_CAMPANA = `
  SELECT cp.*,
    c.nombre as cliente_nombre,
    u.nombre as creado_por_nombre,
    COALESCE(SUM(cm.impresiones), 0)::int as impresiones_total,
    COALESCE(SUM(cm.clics), 0)::int as clics_total,
    COALESCE(SUM(cm.conversiones), 0)::int as conversiones_total,
    COALESCE(SUM(cm.gasto), 0) as gasto_total
  FROM public.campanas_publicidad cp
  LEFT JOIN public.contactos c ON c.id = cp.cliente_id
  LEFT JOIN public.usuarios_crm u ON u.id = cp.creado_por
  LEFT JOIN public.campanas_metricas cm ON cm.campana_id = cp.id
`
const GROUP_BY_CAMPANA = 'GROUP BY cp.id, c.nombre, u.nombre'

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

  const campana = await queryOne<CampanaPublicidad>(
    `${SELECT_CAMPANA} WHERE cp.id = $1 ${GROUP_BY_CAMPANA}`,
    [id]
  )
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

  const metricas = await query<CampanaMetricaDiaria>(
    `SELECT cm.*, u.nombre as registrado_por_nombre
     FROM public.campanas_metricas cm
     LEFT JOIN public.usuarios_crm u ON u.id = cm.registrado_por
     WHERE cm.campana_id = $1
     ORDER BY cm.fecha DESC`,
    [id]
  )

  // ROI estimado: negocios ganados del cliente vinculado a la campaña dentro
  // de su rango de fechas. Es una aproximación por rango+cliente, no
  // atribución exacta por campaña (un negocio ganado podría no venir de esta
  // campaña específica) — de ahí el disclaimer que muestra la UI.
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
    ingreso_estimado != null && campana.gasto_total > 0
      ? Math.round(((ingreso_estimado - campana.gasto_total) / campana.gasto_total) * 100)
      : null

  return NextResponse.json({
    campana: { ...campana, ingreso_estimado, roi_estimado_pct },
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

  const campana = await queryOne<CampanaPublicidad>(
    `${SELECT_CAMPANA} WHERE cp.id = $1 ${GROUP_BY_CAMPANA}`,
    [id]
  )

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
