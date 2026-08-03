'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Rol } from '@/lib/types'
import EmailMarketingTab from './EmailMarketingTab'

type Tab = 'email' | 'whatsapp'

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'email', label: 'Email Marketing', Icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp Masivo', Icon: MessageCircle },
]

function readTab(searchParams: URLSearchParams): Tab {
  const t = searchParams.get('tab')
  return t === 'whatsapp' ? t : 'email'
}

interface Props {
  userRol: Rol
}

export default function CampanasClient({ userRol }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => readTab(searchParams))

  function switchTab(t: Tab) {
    setTab(t)
    const qs = t === 'email' ? '' : `?tab=${t}`
    router.replace(`/campanas${qs}`, { scroll: false })
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campañas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Email marketing y mensajería masiva</p>
      </div>

      <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-0.5 mb-6 w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150',
              tab === key ? 'bg-white dark:bg-midnight-surface text-[#1B2B8C] dark:text-[#4A9FD8] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'email' && <EmailMarketingTab userRol={userRol} />}
      {tab === 'whatsapp' && (
        <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-10 text-center">
          <MessageCircle size={32} className="mx-auto text-empty mb-3" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">WhatsApp Masivo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Próximamente: requiere aprobación de plantillas de mensaje ante Meta
          </p>
        </div>
      )}
    </div>
  )
}
