import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  )
}
