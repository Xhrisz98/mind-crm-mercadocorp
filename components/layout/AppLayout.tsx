import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import NotificationToast from '@/components/ui/NotificationToast'
import NotificationPermissionBanner from '@/components/ui/NotificationPermissionBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-midnight-canvas transition-colors duration-200">
      <Sidebar user={user} />
      <main className="flex-1 lg:ml-64 min-h-screen">
        {children}
      </main>
      <NotificationToast />
      <NotificationPermissionBanner />
    </div>
  )
}
