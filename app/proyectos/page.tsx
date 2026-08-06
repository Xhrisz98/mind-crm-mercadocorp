import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import ProyectosClient from './ProyectosClient'
import type { Rol } from '@/lib/types'

export default async function ProyectosPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <ProyectosClient userRol={user.rol as Rol} puedeEliminar={!!user.puede_eliminar} />
    </AppLayout>
  )
}
