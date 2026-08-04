import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import PublicidadClient from './PublicidadClient'
import type { Rol } from '@/lib/types'

export default async function CampanasPublicidadPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.rol !== 'admin' && user.rol !== 'comercial') redirect('/dashboard')

  return (
    <AppLayout>
      <PublicidadClient userRol={user.rol as Rol} puedeEliminar={!!user.puede_eliminar} />
    </AppLayout>
  )
}
