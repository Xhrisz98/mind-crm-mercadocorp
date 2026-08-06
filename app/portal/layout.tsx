import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import PortalHeader from '@/components/layout/PortalHeader'

// Layout separado del AppLayout admin (sin Sidebar, sin acceso a nada fuera
// del portal) — el middleware ya redirige aquí a rol='cliente' y bloquea
// cualquier otro rol, esto es solo la cáscara visual.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.rol !== 'cliente') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-midnight-canvas transition-colors duration-200">
      <PortalHeader user={user} />
      <main className="max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
