import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { PipelineEstado } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const estados = await query<PipelineEstado>(
    `SELECT id, nombre, orden, probabilidad_cierre, es_estado_ganado, es_estado_perdido, color
     FROM public.pipeline_estados
     ORDER BY orden ASC`
  )

  return NextResponse.json({ estados })
}
