import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'cliente') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  // admin/comercial/ventas leen la lista (selector de vendedor, selector de
  // asignado_a en tareas de Proyectos — ventas ve/edita todo el portafolio,
  // ver decisión de producto en scripts/004_proyectos_portal_cliente.sql).
  // Full management (create/toggle) sigue siendo admin-only. rol='cliente'
  // nunca llega aquí (bloqueado arriba explícitamente, no por un else implícito).
  const { searchParams } = new URL(req.url)
  const soloActivos = searchParams.get('activos') === '1'
  const rolFiltro = searchParams.get('rol')

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (soloActivos) conditions.push('u.activo = true')
  if (rolFiltro) {
    conditions.push(`u.rol = $${idx++}`)
    params.push(rolFiltro)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const usuarios = await query(
    `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.puede_eliminar, u.contacto_id,
       c.nombre as contacto_nombre
     FROM usuarios_crm u
     LEFT JOIN contactos c ON c.id = u.contacto_id
     ${where} ORDER BY u.nombre ASC`,
    params
  )

  return NextResponse.json({ usuarios })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede crear usuarios' }, { status: 403 })
  }

  const { nombre, email, password, rol, contacto_id } = await req.json()

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
  }

  let contactoId: number | null = null
  if (rol === 'cliente') {
    contactoId = parseInt(contacto_id)
    if (!contactoId || isNaN(contactoId)) {
      return NextResponse.json({ error: 'Un acceso de cliente requiere seleccionar un contacto' }, { status: 400 })
    }
    const contacto = await queryOne('SELECT id FROM contactos WHERE id = $1', [contactoId])
    if (!contacto) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })
    }
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
    `INSERT INTO usuarios_crm (nombre, email, password_hash, rol, activo, puede_eliminar, contacto_id)
     VALUES ($1, $2, $3, $4, true, $5, $6) RETURNING id, nombre, email, rol, activo, puede_eliminar, contacto_id`,
    [nombre, email.toLowerCase(), password_hash, rol, puede_eliminar, contactoId]
  )

  return NextResponse.json({ usuario: nuevo }, { status: 201 })
}
