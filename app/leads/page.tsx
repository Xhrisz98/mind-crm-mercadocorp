import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import LeadsClient from './LeadsClient'
import type { Rol } from '@/lib/types'

export default async function LeadsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <Suspense fallback={null}>
        <LeadsClient userRol={user.rol as Rol} puedeEliminar={!!user.puede_eliminar} />
      </Suspense>
    </AppLayout>
  )
}
