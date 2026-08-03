import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import LeadDetailClient from './LeadDetailClient'
import type { Rol } from '@/lib/types'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <LeadDetailClient id={params.id} userRol={user.rol as Rol} puedeEliminar={!!user.puede_eliminar} />
    </AppLayout>
  )
}
