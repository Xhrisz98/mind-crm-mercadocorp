import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/auth'
import { countBySegmentoFiltros } from '@/lib/emailSegments'

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const filtros = body.filtros && typeof body.filtros === 'object' ? body.filtros : {}

  const count = await countBySegmentoFiltros(filtros)
  return NextResponse.json({ count })
}
