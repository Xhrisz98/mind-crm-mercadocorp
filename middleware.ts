import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/push/send']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Allow static public files (images, fonts, service worker, etc.)
  if (/\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|js)$/i.test(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('mind_crm_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = await verifyToken(token)
  if (!user) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('mind_crm_token')
    return response
  }

  // Aislamiento de portal de cliente: 'cliente' no debe llegar a ninguna
  // ruta ni endpoint del layout admin (Sidebar, /negocios, /leads,
  // /configuracion, etc.), y ningún rol interno debe entrar a /portal.
  // El matcher de este middleware cubre /api/** también, así que esto
  // bloquea tanto páginas como llamadas API antes de llegar al handler.
  const isPortalPath = pathname.startsWith('/portal') || pathname.startsWith('/api/portal')
  const isApiPath = pathname.startsWith('/api/')

  if (user.rol === 'cliente' && !isPortalPath) {
    if (isApiPath) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    return NextResponse.redirect(new URL('/portal', request.url))
  }
  if (user.rol !== 'cliente' && isPortalPath) {
    if (isApiPath) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
