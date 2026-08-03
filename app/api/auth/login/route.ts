import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne, query } from '@/lib/db'
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth'
import type { UsuarioCRM } from '@/lib/types'

const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_MAX_ATTEMPTS = 5

interface LoginAttemptRow {
  id: number
  intentos: number
  bloqueado_hasta: string | null
  ultimo_intento: string
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.ip ?? 'unknown'
}

// El bloqueo se rige únicamente por bloqueado_hasta, sin importar cuándo fue el primer intento.
async function isBlocked(ip: string): Promise<boolean> {
  const row = await queryOne<LoginAttemptRow>(
    `SELECT bloqueado_hasta FROM public.login_attempts WHERE ip = $1 ORDER BY id DESC LIMIT 1`,
    [ip]
  )
  return !!row?.bloqueado_hasta && new Date(row.bloqueado_hasta) > new Date()
}

async function registerFailedAttempt(ip: string): Promise<void> {
  const row = await queryOne<LoginAttemptRow>(
    `SELECT id, intentos, bloqueado_hasta, ultimo_intento FROM public.login_attempts
     WHERE ip = $1 ORDER BY id DESC LIMIT 1`,
    [ip]
  )

  // Ventana deslizante basada en el intento MÁS RECIENTE: solo resetea el contador
  // si pasaron más de 15 minutos sin ningún intento nuevo.
  const withinSlidingWindow =
    !!row && new Date(row.ultimo_intento).getTime() >= Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000

  if (!row || !withinSlidingWindow) {
    await query(
      `INSERT INTO public.login_attempts (ip, intentos, primer_intento, ultimo_intento) VALUES ($1, 1, NOW(), NOW())`,
      [ip]
    )
    return
  }

  const intentos = row.intentos + 1
  const bloqueadoHasta = intentos >= RATE_LIMIT_MAX_ATTEMPTS
    ? `NOW() + INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'`
    : 'bloqueado_hasta'

  await query(
    `UPDATE public.login_attempts SET intentos = $1, ultimo_intento = NOW(), bloqueado_hasta = ${bloqueadoHasta} WHERE id = $2`,
    [intentos, row.id]
  )
}

async function clearAttempts(ip: string): Promise<void> {
  await query('DELETE FROM public.login_attempts WHERE ip = $1', [ip])
}

// Limpieza oportunista de filas viejas e inactivas (no borra bloqueos aún vigentes)
async function cleanupOldAttempts(): Promise<void> {
  await query(
    `DELETE FROM public.login_attempts
     WHERE ultimo_intento < NOW() - INTERVAL '1 hour'
       AND (bloqueado_hasta IS NULL OR bloqueado_hasta < NOW())`
  )
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  try {
    await cleanupOldAttempts().catch(() => {})

    if (await isBlocked(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera 15 minutos.' },
        { status: 429 }
      )
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const user = await queryOne<UsuarioCRM & { password_hash: string }>(
      'SELECT id, nombre, email, rol, activo, puede_eliminar, password_hash FROM usuarios_crm WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (!user || !user.activo) {
      await registerFailedAttempt(ip)
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await registerFailedAttempt(ip)
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    await clearAttempts(ip)

    const token = await signToken(user)

    const response = NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
