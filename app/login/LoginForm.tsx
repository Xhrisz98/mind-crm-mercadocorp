'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import ClientOnlyBeam from '@/components/ui/ClientOnlyBeam'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

interface LoginFormProps {
  onSubmittingChange?: (submitting: boolean) => void
}

export default function LoginForm({ onSubmittingChange }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const beamTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast.error('Tu sesión ha expirado')
      router.replace('/login')
    }
  }, [searchParams, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    onSubmittingChange?.(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al iniciar sesión')
        return
      }

      toast.success(`Bienvenido, ${data.user.nombre}`)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
      onSubmittingChange?.(false)
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="w-full max-w-md"
    >
      {/* Logo — visible en mobile y desktop; fondo blanco fijo porque el logo usa azul marca sobre transparente */}
      <motion.div variants={fadeUp} custom={0} className="flex flex-col items-center mb-8">
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm dark:shadow-none mb-3">
          <Image
            src="/logo.png"
            alt="Mind CRM"
            width={200}
            height={80}
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 lg:hidden">Bullpadel Ecuador</p>
      </motion.div>

      <motion.h2 variants={fadeUp} custom={1} className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Iniciar sesión
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className="text-gray-500 dark:text-gray-400 text-sm mb-8">
        Ingresa tus credenciales para acceder al CRM
      </motion.p>

      <motion.div variants={fadeUp} custom={3}>
        <div className="bg-white dark:bg-midnight-surface rounded-2xl border border-gray-100 dark:border-midnight-border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="nombre@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/30 focus:border-[#1B2B8C] transition-all duration-150 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/30 focus:border-[#1B2B8C] transition-all duration-150 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <ClientOnlyBeam
                  size="sm"
                  colorVariant="ocean"
                  staticColors
                  theme={beamTheme}
                  strength={0.4}
                  duration={10}
                  active={loading}
                >
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full py-3 text-base"
                  >
                    Entrar al CRM
                  </Button>
                </ClientOnlyBeam>
              </div>
            </form>
        </div>
      </motion.div>

      <motion.p variants={fadeUp} custom={6} className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
        Acceso restringido a personal autorizado de Bullpadel Ecuador
      </motion.p>
    </motion.div>
  )
}
