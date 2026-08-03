'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Rol } from '@/lib/types'
import BaseClientesTab from './BaseClientesTab'
import EmailMarketingTab from './EmailMarketingTab'

type Tab = 'clientes' | 'email' | 'whatsapp'

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'clientes', label: 'Base de Clientes', Icon: Users },
  { key: 'email', label: 'Email Marketing', Icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp Masivo', Icon: MessageCircle },
]

function readTab(searchParams: URLSearchParams): Tab {
  const t = searchParams.get('tab')
  return t === 'email' || t === 'whatsapp' ? t : 'clientes'
}

interface Props {
  userRol: Rol
}

export default function CampanasClient({ userRol }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => readTab(searchParams))

  // Selección de clientes en la tabla de "Base de Clientes" — se reutiliza en el
  // composer de Email Marketing para armar listas de destinatarios manuales.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  function switchTab(t: Tab) {
    setTab(t)
    const qs = t === 'clientes' ? '' : `?tab=${t}`
    router.replace(`/campanas${qs}`, { scroll: false })
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campañas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Base de clientes, email marketing y mensajería masiva</p>
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

      {tab === 'clientes' && (
        <BaseClientesTab
          userRol={userRol}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
      )}
      {tab === 'email' && (
        <EmailMarketingTab
          userRol={userRol}
          selectedIds={selectedIds}
        />
      )}
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
