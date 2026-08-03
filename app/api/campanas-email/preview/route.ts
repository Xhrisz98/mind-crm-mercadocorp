import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { resolveRecipientsBySegmentoFiltros, resolveRecipientsByIds } from '@/lib/emailSegments'
import type { SegmentoEmail } from '@/lib/types'

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const segmentoId = body.segmento_id ? parseInt(body.segmento_id) : null
  const manualIds: number[] = Array.isArray(body.manual_ids) ? body.manual_ids.map(Number).filter((n: number) => !isNaN(n)) : []

  let destinatarios
  if (segmentoId) {
    const segmento = await queryOne<SegmentoEmail>('SELECT * FROM public.segmentos_email WHERE id = $1', [segmentoId])
    if (!segmento) return NextResponse.json({ error: 'Segmento no encontrado' }, { status: 404 })
    destinatarios = await resolveRecipientsBySegmentoFiltros(segmento.filtros)
  } else if (manualIds.length > 0) {
    destinatarios = await resolveRecipientsByIds(manualIds)
  } else {
    return NextResponse.json({ error: 'Debes seleccionar un segmento o clientes manualmente' }, { status: 400 })
  }

  return NextResponse.json({
    count: destinatarios.length,
    sample: destinatarios.slice(0, 8).map((d) => ({
      nombre: [d.nombre, d.apellido].filter(Boolean).join(' ') || null,
      email: d.email,
    })),
  })
}
