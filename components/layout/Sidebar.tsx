'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import type { JWTPayload } from '@/lib/types'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Megaphone,
  Sun,
  Moon,
} from 'lucide-react'
import { useState, useEffect } from 'react'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150 w-full"
    >
      <span className="t-icon-swap" data-state={isDark ? 'b' : 'a'}>
        <Sun size={18} className="t-icon" data-icon="a" />
        <Moon size={18} className="t-icon" data-icon="b" style={{ gridArea: '1 / 1' }} />
      </span>
      {mounted ? (isDark ? 'Modo claro' : 'Modo oscuro') : 'Apariencia'}
    </button>
  )
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/campanas', label: 'Campañas', icon: Megaphone, roles: ['admin', 'comercial'] },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  user: JWTPayload
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Sesión cerrada')
    router.push('/login')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.rol)
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo header — white card on dark background */}
      <div className="flex items-center justify-center px-5 py-5 border-b border-white/10">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <Image
            src="/logo.png"
            alt="Mind CRM"
            width={140}
            height={56}
            className="object-contain block"
            unoptimized
            priority
          />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon size={18} />
              {item.label}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4A9FD8]"
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#4A9FD8] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.nombre}</p>
            <p className="text-blue-200 text-xs capitalize">{user.rol}</p>
          </div>
        </div>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150 w-full"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
        <a
          href="mailto:it@mercadocorp.ec"
          className="block text-center text-[11px] text-blue-300/60 hover:text-blue-200 transition-colors mt-3"
        >
          Soporte: it@mercadocorp.ec
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#1A1F3A] flex-col fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 bg-[#1A1F3A] text-white rounded-xl flex items-center justify-center shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-64 bg-[#1A1F3A] z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-blue-200 hover:text-white"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
