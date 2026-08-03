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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
