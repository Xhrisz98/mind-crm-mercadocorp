import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  // Solo admin/comercial leen la lista de usuarios (selector de vendedor, gestión de cuentas).
  // Full management (create/toggle) sigue siendo admin-only.
  const soloActivos = new URL(req.url).searchParams.get('activos') === '1'
  const where = soloActivos ? 'WHERE activo = true' : ''

  const usuarios = await query(
    `SELECT id, nombre, email, rol, activo, puede_eliminar FROM usuarios_crm ${where} ORDER BY nombre ASC`
  )

  return NextResponse.json({ usuarios })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede crear usuarios' }, { status: 403 })
  }

  const { nombre, email, password, rol } = await req.json()

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
  }

  const existing = await queryOne(
    'SELECT id FROM usuarios_crm WHERE email = $1',
    [email.toLowerCase()]
  )

  if (existing) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  const puede_eliminar = rol === 'admin'

  const nuevo = await queryOne(
    `INSERT INTO usuarios_crm (nombre, email, password_hash, rol, activo, puede_eliminar)
     VALUES ($1, $2, $3, $4, true, $5) RETURNING id, nombre, email, rol, activo, puede_eliminar`,
    [nombre, email.toLowerCase(), password_hash, rol, puede_eliminar]
  )

  return NextResponse.json({ usuario: nuevo }, { status: 201 })
}
