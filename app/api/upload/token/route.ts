import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

const TOKEN_TTL_MINUTES = 5

// Token de un solo uso que el navegador debe presentar al webhook público de n8n
// (crm-upload-imagen) para poder subir un archivo. Reemplaza la autenticación JWT
// que /api/upload hacía server-to-server, ya que ahora el navegador sube directo
// a n8n sin pasar por esta API (ver LeadDetailClient.tsx).
export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const token = randomBytes(32).toString('hex')

  await query(
    `INSERT INTO public.upload_tokens (token, usuario_id, expira_en)
     VALUES ($1, $2, NOW() + INTERVAL '${TOKEN_TTL_MINUTES} minutes')`,
    [token, parseInt(user.sub)]
  )

  // Limpieza oportunista, sin bloquear la respuesta: purga tokens ya usados
  // (después de 1 día, por si hace falta auditar brevemente) y tokens nunca
  // usados que expiraron hace más de 1 hora, para que la tabla no crezca sin límite.
  query(
    `DELETE FROM public.upload_tokens
     WHERE (usado = TRUE AND creado_en < NOW() - INTERVAL '1 day')
        OR (usado = FALSE AND expira_en < NOW() - INTERVAL '1 hour')`
  ).catch((err) => console.error('[upload/token] error al limpiar tokens vencidos', err))

  return NextResponse.json({ token })
}
