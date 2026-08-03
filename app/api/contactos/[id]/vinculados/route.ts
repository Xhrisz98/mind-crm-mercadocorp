import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { ContactoVinculado } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol === 'ventas') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const vinculados = await query<ContactoVinculado>(
    `SELECT lv.id as vinculacion_id, lv.fecha_vinculacion, c.id, c.nombre, c.canal, c.telefono, c.canal_user_id
     FROM public.leads_vinculados lv
     JOIN public.contactos c
       ON c.id = CASE WHEN lv.contacto_principal_id = $1 THEN lv.contacto_vinculado_id ELSE lv.contacto_principal_id END
     WHERE lv.contacto_principal_id = $1 OR lv.contacto_vinculado_id = $1
     ORDER BY lv.fecha_vinculacion DESC`,
    [id]
  )

  return NextResponse.json({ vinculados })
}
