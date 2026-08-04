'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import type { Contacto } from '@/lib/types'
import { Search } from 'lucide-react'

interface ContactoSearchProps {
  value: string
  placeholder?: string
  onSelect: (contacto: { id: number; nombre: string } | null) => void
}

// Combobox de búsqueda de contactos — reutiliza /api/leads (mismo endpoint
// que alimenta la vista de Leads) en vez de duplicar lógica de búsqueda.
export default function ContactoSearch({ value, placeholder, onSelect }: ContactoSearchProps) {
  const [q, setQ] = useState(value)
  const [open, setOpen] = useState(false)
  const { data } = useSWR<{ leads: Contacto[] }>(
    q.trim().length >= 2 ? `/api/leads?q=${encodeURIComponent(q.trim())}&page=1&limit=6` : null,
    fetcher
  )

  useEffect(() => setQ(value), [value])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); if (!e.target.value) onSelect(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Buscar cliente por nombre, teléfono o email…'}
          className="w-full text-sm pl-8 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 transition-all"
        />
      </div>
      {open && data?.leads && data.leads.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-midnight-surface border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {data.leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => {
                setQ(lead.nombre)
                onSelect({ id: lead.id, nombre: lead.nombre })
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">{lead.nombre}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{lead.telefono || lead.email || '—'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
