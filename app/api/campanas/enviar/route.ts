import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { getBrevoConfig, sendCampaignEmails } from '@/lib/brevo'
import { resolveRecipientsBySegmentoFiltros, resolveRecipientsByIds } from '@/lib/emailSegments'
import type { CampanaEmail, SegmentoEmail } from '@/lib/types'

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const campanaId = parseInt(body.campana_id)
  if (isNaN(campanaId)) return NextResponse.json({ error: 'ID de campaña inválido' }, { status: 400 })

  const campana = await queryOne<CampanaEmail>('SELECT * FROM public.campanas_email WHERE id = $1', [campanaId])
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
  if (campana.estado === 'enviada' || campana.estado === 'enviando') {
    return NextResponse.json({ error: 'Esta campaña ya fue enviada' }, { status: 400 })
  }

  const config = await getBrevoConfig()
  if (!config) {
    return NextResponse.json(
      { error: 'Configura tu clave de Brevo en Configuración → Integraciones antes de enviar campañas' },
      { status: 400 }
    )
  }

  let destinatarios
  if (campana.segmento_id) {
    const segmento = await queryOne<SegmentoEmail>('SELECT * FROM public.segmentos_email WHERE id = $1', [campana.segmento_id])
    destinatarios = segmento ? await resolveRecipientsBySegmentoFiltros(segmento.filtros) : []
  } else {
    destinatarios = await resolveRecipientsByIds(campana.destinatarios_manual_ids || [])
  }

  if (destinatarios.length === 0) {
    return NextResponse.json({ error: 'No hay destinatarios con opt-in de email para esta campaña' }, { status: 400 })
  }

  await query(
    `UPDATE public.campanas_email SET estado = 'enviando', destinatarios_count = $1 WHERE id = $2`,
    [destinatarios.length, campanaId]
  )

  const { enviados, fallidos } = await sendCampaignEmails(config, destinatarios, campana.asunto, campana.contenido_html)

  const estadoFinal = enviados === 0 ? 'error' : 'enviada'

  const actualizada = await queryOne<CampanaEmail>(
    `UPDATE public.campanas_email
     SET enviados_count = $1, fallidos_count = $2, estado = $3, fecha_envio = NOW()
     WHERE id = $4
     RETURNING *`,
    [enviados, fallidos, estadoFinal, campanaId]
  )

  return NextResponse.json({ campana: actualizada, enviados, fallidos })
}
