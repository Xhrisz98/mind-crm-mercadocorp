import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import CampanasClient from './CampanasClient'
import type { Rol } from '@/lib/types'

export default async function CampanasPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.rol !== 'admin' && user.rol !== 'comercial') redirect('/dashboard')

  return (
    <AppLayout>
      <CampanasClient userRol={user.rol as Rol} />
    </AppLayout>
  )
}
