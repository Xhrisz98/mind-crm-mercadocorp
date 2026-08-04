import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import NegociosClient from './NegociosClient'
import type { Rol } from '@/lib/types'

export default async function NegociosPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <NegociosClient userRol={user.rol as Rol} puedeEliminar={!!user.puede_eliminar} />
    </AppLayout>
  )
}
