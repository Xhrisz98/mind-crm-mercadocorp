import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { activo, rol, puede_eliminar } = await req.json()

  const updated = await queryOne(
    `UPDATE usuarios_crm SET
       activo = COALESCE($1, activo),
       rol = COALESCE($2, rol),
       puede_eliminar = COALESCE($3, puede_eliminar)
     WHERE id = $4
     RETURNING id, nombre, email, rol, activo, puede_eliminar`,
    [activo ?? null, rol ?? null, puede_eliminar ?? null, id]
  )

  if (!updated) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json({ usuario: updated })
}
