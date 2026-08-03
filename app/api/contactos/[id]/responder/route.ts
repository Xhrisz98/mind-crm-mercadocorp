import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'
import https from 'https'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

// En desarrollo local el certificado de n8n falla la verificación de cadena
// (UNABLE_TO_VERIFY_LEAF_SIGNATURE). node-fetch sí respeta el Agent de Node,
// a diferencia del fetch nativo de Next.js (basado en undici), que ignora `agent`.
const insecureAgent = process.env.NODE_ENV === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch (err) {
    console.error('[contactos/responder] JSON inválido en el body de la request', err)
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const mensaje = (body.mensaje as string | undefined)?.trim()
  const canal = body.canal as string | undefined
  const userId = body.userId as string | undefined
  const imagenUrl = (body.imagen_url as string | null | undefined) ?? null
  if (!mensaje) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
  if (!canal) return NextResponse.json({ error: 'Canal requerido' }, { status: 400 })
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nWebhookUrl) {
    console.error('[contactos/responder] N8N_WEBHOOK_URL no configurada')
    return NextResponse.json({ error: 'Servicio de mensajería no configurado' }, { status: 500 })
  }

  let webhookOk = true
  try {
    const webhookRes = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactoId: id,
        canal,
        userId,
        mensaje,
        vendedor: user.nombre,
        imagen_url: imagenUrl,
      }),
      agent: insecureAgent,
    })
    if (!webhookRes.ok) {
      webhookOk = false
      const text = await webhookRes.text().catch(() => '')
      console.error(`[contactos/responder] webhook n8n respondió ${webhookRes.status}: ${text}`)
    }
  } catch (err) {
    webhookOk = false
    console.error('[contactos/responder] error de red al llamar al webhook de n8n', err)
  }

  // El mensaje se guarda en el historial aunque el webhook falle, para no perder el registro
  // de lo que el vendedor intentó enviar.
  try {
    await query(
      `INSERT INTO historial_conversaciones (id_contacto, canal, rol, contenido, imagen_url, timestamp)
       VALUES ($1, $2, 'vendedor', $3, $4, NOW())`,
      [id, canal, mensaje, imagenUrl]
    )
  } catch (err) {
    console.error('[contactos/responder] error al insertar en historial_conversaciones', err)
    return NextResponse.json({ error: 'Error al guardar el mensaje' }, { status: 500 })
  }

  if (!webhookOk) {
    return NextResponse.json({ error: 'El mensaje se guardó pero no se pudo enviar por el canal' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
