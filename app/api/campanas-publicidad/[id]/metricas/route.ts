import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { CampanaMetricaValor } from '@/lib/types'

interface ValorEntrada {
  metrica_definicion_id: number
  valor: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const campanaId = parseInt(params.id)
  if (Number.isNaN(campanaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const campana = await queryOne<{ id: number }>(
    'SELECT id FROM public.campanas_publicidad WHERE id = $1',
    [campanaId]
  )
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const fecha = body.fecha
  if (!fecha) return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })

  if (!Array.isArray(body.valores) || body.valores.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos una métrica para registrar' }, { status: 400 })
  }

  const entradas: ValorEntrada[] = []
  for (const item of body.valores) {
    const metricaId = parseInt(item?.metrica_definicion_id)
    const valor = Number(item?.valor)
    if (Number.isNaN(metricaId) || Number.isNaN(valor)) {
      return NextResponse.json({ error: 'Cada métrica debe tener un id y un valor numérico válidos' }, { status: 400 })
    }
    entradas.push({ metrica_definicion_id: metricaId, valor })
  }

  const metricaIds = entradas.map((e) => e.metrica_definicion_id)
  const existentes = await query<{ id: number }>(
    'SELECT id FROM public.metricas_definiciones WHERE id = ANY($1)',
    [metricaIds]
  )
  if (existentes.length !== new Set(metricaIds).size) {
    return NextResponse.json({ error: 'Una o más métricas seleccionadas no existen en el catálogo' }, { status: 400 })
  }

  // UPSERT: reingresar la misma métrica/fecha corrige el valor en vez de
  // duplicar la fila (a diferencia del antiguo campanas_metricas, que solo
  // permitía insertar y sumaba duplicados).
  const idsActualizados: number[] = []
  for (const entrada of entradas) {
    const fila = await queryOne<{ id: number }>(
      `INSERT INTO public.campanas_metricas_valores
         (campana_id, metrica_definicion_id, fecha, valor, registrado_por)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (campana_id, metrica_definicion_id, fecha)
       DO UPDATE SET valor = EXCLUDED.valor, registrado_por = EXCLUDED.registrado_por, fecha_registro = NOW()
       RETURNING id`,
      [campanaId, entrada.metrica_definicion_id, fecha, entrada.valor, parseInt(user.sub)]
    )
    idsActualizados.push(fila!.id)
  }

  const metricas = await query<CampanaMetricaValor>(
    `SELECT cmv.*, md.clave as metrica_clave, md.nombre as metrica_nombre, md.unidad as metrica_unidad,
        u.nombre as registrado_por_nombre
     FROM public.campanas_metricas_valores cmv
     JOIN public.metricas_definiciones md ON md.id = cmv.metrica_definicion_id
     LEFT JOIN public.usuarios_crm u ON u.id = cmv.registrado_por
     WHERE cmv.id = ANY($1)
     ORDER BY md.clave ASC`,
    [idsActualizados]
  )

  return NextResponse.json({ metricas }, { status: 201 })
}
