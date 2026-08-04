import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import MetricasClient from './MetricasClient'

export default async function MetricasLeadsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <MetricasClient />
    </AppLayout>
  )
}
