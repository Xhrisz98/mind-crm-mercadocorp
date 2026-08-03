import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/auth'
import { getBrevoConfig } from '@/lib/brevo'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const config = await getBrevoConfig()
  return NextResponse.json({ configurado: !!config })
}
