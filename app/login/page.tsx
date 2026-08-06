'use client'
import { Suspense, useState } from 'react'
import Image from 'next/image'
import { ThinkingOrb } from 'thinking-orbs'
import LoginForm from './LoginForm'
import { MessageCircle, Send, MessageSquare, Instagram } from 'lucide-react'

const CHANNELS = [
  { label: 'WhatsApp',  Icon: MessageCircle },
  { label: 'Telegram',  Icon: Send          },
  { label: 'Messenger', Icon: MessageSquare },
  { label: 'Instagram', Icon: Instagram     },
]

export default function LoginPage() {
  const [authenticating, setAuthenticating] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1B2B8C] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#4A9FD8] blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#CE142B] blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="flex justify-center mb-6">
            <ThinkingOrb
              state={authenticating ? 'solving' : 'composing'}
              size={64}
              theme="dark"
              aria-label={authenticating ? 'Verificando credenciales' : 'Mind, siempre en marcha'}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Mind CRM</h1>
          <p className="text-blue-200 text-lg mb-2">Mercadocorp</p>
          <p className="text-blue-300 text-sm leading-relaxed">
            Gestión inteligente de leads captados por el agente Mind en WhatsApp, Telegram, Messenger e Instagram.
          </p>
          <div className="flex justify-center gap-3 mt-8">
            {CHANNELS.map(({ label, Icon }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs bg-white/10 text-blue-200 px-2.5 py-1.5 rounded-full">
                <Icon size={12} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <a
          href="https://mercadocorp.ec/mind-ld/"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 text-center text-xs text-blue-300/70 hover:text-blue-200 transition-colors mt-10"
        >
          © Mind by MercadoCorp
        </a>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-midnight-canvas transition-colors duration-200">
        <Suspense fallback={null}>
          <LoginForm onSubmittingChange={setAuthenticating} />
        </Suspense>
      </div>
    </div>
  )
}
