import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import ConfiguracionClient from './ConfiguracionClient'

export default async function ConfiguracionPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <ConfiguracionClient rol={user.rol} />
    </AppLayout>
  )
}
