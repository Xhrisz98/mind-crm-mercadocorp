import { BrevoClient } from '@getbrevo/brevo'
import { query } from '@/lib/db'
import type { DestinatarioEmail } from '@/lib/emailSegments'

export interface BrevoConfig {
  apiKey: string
  senderEmail: string
  senderName: string
}

const CONFIG_KEYS = ['brevo_api_key', 'brevo_sender_email', 'brevo_sender_name'] as const

export async function getBrevoConfig(): Promise<BrevoConfig | null> {
  const rows = await query<{ clave: string; valor: string | null }>(
    `SELECT clave, valor FROM public.configuracion_integraciones WHERE clave = ANY($1)`,
    [CONFIG_KEYS]
  )
  const stored = Object.fromEntries(rows.map((r) => [r.clave, r.valor || '']))

  const apiKey = stored.brevo_api_key || process.env.BREVO_API_KEY || ''
  const senderEmail = stored.brevo_sender_email || process.env.BREVO_SENDER_EMAIL || ''
  const senderName = stored.brevo_sender_name || process.env.BREVO_SENDER_NAME || ''

  if (!apiKey || !senderEmail) return null
  return { apiKey, senderEmail, senderName: senderName || senderEmail }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// El unsubscribe nativo de Brevo (blocklist + link automático en la plantilla transaccional)
// se gestiona enteramente del lado de Brevo; esta función no implementa lógica de baja manual.
export async function sendCampaignEmails(
  config: BrevoConfig,
  recipients: DestinatarioEmail[],
  subject: string,
  htmlContent: string
): Promise<{ enviados: number; fallidos: number }> {
  const client = new BrevoClient({ apiKey: config.apiKey })
  let enviados = 0
  let fallidos = 0

  async function sendOne(r: DestinatarioEmail): Promise<boolean> {
    try {
      await client.transactionalEmails.sendTransacEmail({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: r.email, name: [r.nombre, r.apellido].filter(Boolean).join(' ') || r.email }],
        subject,
        htmlContent,
      })
      return true
    } catch {
      return false
    }
  }

  for (const lote of chunk(recipients, 50)) {
    const results = await Promise.all(lote.map((r) => sendOne(r)))
    const fallidosLote = lote.filter((_, i) => !results[i])

    // Reintento simple: un segundo intento para los fallos del lote
    let retryResults: boolean[] = []
    if (fallidosLote.length > 0) {
      retryResults = await Promise.all(fallidosLote.map((r) => sendOne(r)))
    }

    enviados += results.filter(Boolean).length + retryResults.filter(Boolean).length
    fallidos += retryResults.filter((ok) => !ok).length
  }

  return { enviados, fallidos }
}
