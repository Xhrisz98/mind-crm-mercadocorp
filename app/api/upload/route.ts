// DEPRECADO: el frontend ahora sube directo a n8n (NEXT_PUBLIC_N8N_UPLOAD_URL) para
// evitar el límite de 4.5MB del body en las funciones serverless de Vercel.
// Se mantiene como fallback/compatibilidad, no se usa desde LeadDetailClient.tsx.
import { NextRequest, NextResponse } from 'next/server'
import fetch, { FormData as NodeFormData, File as NodeFile } from 'node-fetch'
import https from 'https'
import { getSessionUserFromRequest } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_SIZE = 15 * 1024 * 1024

// En desarrollo local el certificado de n8n falla la verificación de cadena
// (UNABLE_TO_VERIFY_LEAF_SIGNATURE). node-fetch sí respeta el Agent de Node,
// a diferencia del fetch nativo de Next.js (basado en undici), que ignora `agent`.
const insecureAgent = process.env.NODE_ENV === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes JPEG o PNG' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'La imagen no puede superar 15MB' }, { status: 400 })
  }

  const n8nUploadUrl = process.env.N8N_UPLOAD_URL
  if (!n8nUploadUrl) {
    console.error('[upload] N8N_UPLOAD_URL no configurada')
    return NextResponse.json({ error: 'Servicio de imágenes no configurado' }, { status: 500 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const forwardData = new NodeFormData()
    forwardData.append('file', new NodeFile([arrayBuffer], file.name, { type: file.type }), file.name)

    const webhookRes = await fetch(n8nUploadUrl, {
      method: 'POST',
      body: forwardData,
      agent: insecureAgent,
    })

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '')
      console.error(`[upload] webhook n8n respondió ${webhookRes.status}: ${text}`)
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 502 })
    }

    const json = (await webhookRes.json().catch(() => null)) as { url?: string } | null
    if (!json?.url) {
      console.error('[upload] respuesta del webhook sin url:', json)
      return NextResponse.json({ error: 'Respuesta inválida del servicio de imágenes' }, { status: 502 })
    }

    return NextResponse.json({ url: json.url })
  } catch (err) {
    console.error('[upload] error de red al llamar al webhook de n8n', err)
    return NextResponse.json({ error: 'Error de conexión con el servicio de imágenes' }, { status: 502 })
  }
}
