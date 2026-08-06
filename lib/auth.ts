import { SignJWT, jwtVerify, errors } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { JWTPayload, UsuarioCRM } from './types'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set')
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

const COOKIE_NAME = 'mind_crm_token'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function signToken(user: UsuarioCRM): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    puede_eliminar: user.puede_eliminar,
    contacto_id: user.contacto_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export type TokenVerifyResult =
  | { status: 'valid'; user: JWTPayload }
  | { status: 'expired' }
  | { status: 'invalid' }

// Variante usada por el middleware para distinguir "sesión expirada" de un token
// simplemente inválido/ausente, y así mostrar el mensaje correcto al usuario.
export async function verifyTokenDetailed(token: string): Promise<TokenVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { status: 'valid', user: payload as unknown as JWTPayload }
  } catch (err) {
    if (err instanceof errors.JWTExpired) return { status: 'expired' }
    return { status: 'invalid' }
  }
}

export async function getSessionUser(): Promise<JWTPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionUserFromRequest(
  req: NextRequest
): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export { COOKIE_NAME, COOKIE_MAX_AGE }
