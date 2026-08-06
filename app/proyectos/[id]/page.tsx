import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import ProyectoDetailClient from './ProyectoDetailClient'
import type { Rol } from '@/lib/types'

export default async function ProyectoDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <ProyectoDetailClient proyectoId={parseInt(params.id)} userRol={user.rol as Rol} />
    </AppLayout>
  )
}
