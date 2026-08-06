import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { TareaEstado } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const estados = await query<TareaEstado>(
    `SELECT id, nombre, orden, color, es_estado_final
     FROM public.tareas_estados
     ORDER BY orden ASC`
  )

  return NextResponse.json({ estados })
}
