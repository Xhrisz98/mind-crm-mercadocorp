import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { CampanaMetricaDiaria } from '@/lib/types'

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

  const body = await req.json()
  const fecha = body.fecha
  if (!fecha) return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })

  const impresiones = parseInt(body.impresiones) || 0
  const clics = parseInt(body.clics) || 0
  const conversiones = parseInt(body.conversiones) || 0
  const gasto = Number(body.gasto) || 0

  const nueva = await queryOne<{ id: number }>(
    `INSERT INTO public.campanas_metricas
       (campana_id, fecha, impresiones, clics, conversiones, gasto, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [campanaId, fecha, impresiones, clics, conversiones, gasto, parseInt(user.sub)]
  )

  const metrica = await queryOne<CampanaMetricaDiaria>(
    `SELECT cm.*, u.nombre as registrado_por_nombre
     FROM public.campanas_metricas cm
     LEFT JOIN public.usuarios_crm u ON u.id = cm.registrado_por
     WHERE cm.id = $1`,
    [nueva!.id]
  )

  return NextResponse.json({ metrica }, { status: 201 })
}
