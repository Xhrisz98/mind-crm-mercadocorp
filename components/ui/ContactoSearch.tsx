'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'
import type { Contacto } from '@/lib/types'
import { Search, Plus } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

interface ContactoSearchProps {
  value: string
  placeholder?: string
  onSelect: (contacto: { id: number; nombre: string } | null) => void
  // Si el nombre escrito no coincide con ningún contacto existente, muestra
  // "Crear contacto '[nombre]'" al final de los resultados. Al crearlo, hace
  // POST /api/leads/manual (canal='web', origen='manual') y lo selecciona.
  // Opt-in porque este componente también se usa en NegociosClient.tsx, donde
  // no se pidió esta opción.
  allowCreate?: boolean
}

// Combobox de búsqueda de contactos — reutiliza /api/leads (mismo endpoint
// que alimenta la vista de Leads) en vez de duplicar lógica de búsqueda.
export default function ContactoSearch({ value, placeholder, onSelect, allowCreate }: ContactoSearchProps) {
  const [q, setQ] = useState(value)
  const [open, setOpen] = useState(false)
  const [creando, setCreando] = useState(false)
  const { data } = useSWR<{ leads: Contacto[] }>(
    q.trim().length >= 2 ? `/api/leads?q=${encodeURIComponent(q.trim())}&page=1&limit=6` : null,
    fetcher
  )

  useEffect(() => setQ(value), [value])

  const leads = data?.leads ?? []
  const nombreBuscado = q.trim()
  const hayCoincidenciaExacta = leads.some((l) => l.nombre.trim().toLowerCase() === nombreBuscado.toLowerCase())
  const mostrarCrear = allowCreate && nombreBuscado.length >= 2 && !hayCoincidenciaExacta && !creando

  async function handleCrear() {
    setCreando(true)
    try {
      const res = await fetch('/api/leads/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreBuscado, canal: 'web' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al crear el contacto'); return }
      toast.success('Contacto creado')
      setQ(json.lead.nombre)
      onSelect({ id: json.lead.id, nombre: json.lead.nombre })
      setOpen(false)
    } catch { toast.error('Error de conexión') }
    finally { setCreando(false) }
  }

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
      {open && (leads.length > 0 || mostrarCrear) && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-midnight-surface border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {leads.map((lead) => (
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
          {mostrarCrear && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCrear}
              disabled={creando}
              className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-sm text-[#1B2B8C] dark:text-[#4A9FD8] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/5 disabled:opacity-50"
            >
              {creando ? <Spinner state="working" /> : <Plus size={14} />}
              Crear contacto &ldquo;{nombreBuscado}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
