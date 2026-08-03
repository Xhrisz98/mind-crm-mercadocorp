import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { ProgramaCliente } from '@/lib/types'

function canAccess(rol: string): boolean {
  return rol === 'admin' || rol === 'comercial'
}

const EDITABLE_FIELDS = [
  'nombre', 'apellido', 'telefono', 'email', 'activo',
  'opt_in_email', 'opt_in_sms', 'tiene_wallet',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json().catch(() => ({}))

  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const key of EDITABLE_FIELDS) {
    if (key in body) {
      updates.push(`${key} = $${idx++}`)
      const value = body[key]
      values.push(typeof value === 'string' ? (value.trim() || null) : value)
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  values.push(id)
  const cliente = await queryOne<ProgramaCliente>(
    `UPDATE public.programa_clientes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  return NextResponse.json({ cliente })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canAccess(user.rol)) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const result = await query('DELETE FROM public.programa_clientes WHERE id = $1 RETURNING id', [id])
  if (result.length === 0) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
