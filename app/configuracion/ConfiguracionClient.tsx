'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import ErrorState from '@/components/ui/ErrorState'
import ContactoSearch from '@/components/ui/ContactoSearch'
import { cn } from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'
import type { UsuarioCRM, Rol, ConfiguracionIntegracionesView } from '@/lib/types'
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushEnabledPreference,
  savePushEnabledPreference,
  type NotifPermission,
} from '@/lib/notifications'
import { Plus, UserCheck, UserX, Edit2, Trash2, ShieldOff, Bell, BellOff, BellRing, Mail, Save, KeyRound, Building2 } from 'lucide-react'

function NotificacionesCard() {
  const [permission, setPermission] = useState<NotifPermission>('default')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [disabling, setDisabling] = useState(false)

  useEffect(() => {
    const perm = getNotificationPermission()
    setPermission(perm)

    if (perm === 'granted' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const subscription = await reg?.pushManager.getSubscription()
        const enabled = !!subscription
        setPushEnabled(enabled)
        savePushEnabledPreference(enabled)
      })
    } else {
      setPushEnabled(getPushEnabledPreference())
    }
  }, [])

  async function handleActivar() {
    setRequesting(true)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
      console.log('Permiso actual:', Notification.permission)

      if (result === 'granted') {
        toast.success('Notificaciones activadas')
        console.log('VAPID KEY:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 10))
        console.log('Llamando subscribeToPush...')
        try {
          const subResult = await subscribeToPush()
          console.log('Suscripción completada:', subResult)
          setPushEnabled(subResult)
        } catch (error) {
          console.error('Error en subscribeToPush:', error)
          toast.error('No se pudo completar la suscripción push')
        }
      } else if (result === 'denied') {
        toast.error('El navegador bloqueó el permiso. Actívalo desde los ajustes del sitio.')
      }
    } finally {
      setRequesting(false)
    }
  }

  async function handleDesactivar() {
    setDisabling(true)
    try {
      await unsubscribeFromPush()
      setPushEnabled(false)
      toast.success('Notificaciones desactivadas')
    } catch (error) {
      console.error('Error en subscribeToPush:', error)
      toast.error('Error al desactivar notificaciones')
    } finally {
      setDisabling(false)
    }
  }

  return (
    <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notificaciones</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Recibe alertas nativas del sistema operativo cuando lleguen leads o mensajes nuevos.
      </p>

      {permission === 'unsupported' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Tu navegador no soporta notificaciones.</p>
      )}

      {permission === 'granted' && pushEnabled && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-3 py-2 rounded-lg">
            <BellRing size={15} />
            Notificaciones activas
          </div>
          <Button size="sm" variant="secondary" onClick={handleDesactivar} loading={disabling}>
            <BellOff size={15} />
            Desactivar
          </Button>
        </div>
      )}

      {permission === 'granted' && !pushEnabled && (
        <Button size="sm" onClick={handleActivar} loading={requesting}>
          <Bell size={15} />
          Activar notificaciones
        </Button>
      )}

      {permission === 'default' && (
        <Button size="sm" onClick={handleActivar} loading={requesting}>
          <Bell size={15} />
          Activar notificaciones
        </Button>
      )}

      {permission === 'denied' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
            <BellOff size={15} />
            Notificaciones bloqueadas
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tu navegador bloqueó este permiso. Actívalo manualmente desde el ícono de información/candado
            junto a la URL, en la sección de notificaciones del sitio.
          </p>
        </div>
      )}
    </div>
  )
}

function IntegracionesCard() {
  const { data, error, isLoading, mutate } = useSWR<ConfiguracionIntegracionesView>(
    '/api/configuracion/integraciones',
    fetcher
  )

  const [apiKey, setApiKey] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [replacingKey, setReplacingKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data) return
    setSenderEmail(data.brevo_sender_email)
    setSenderName(data.brevo_sender_name)
  }, [data])

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, string> = {
        brevo_sender_email: senderEmail.trim(),
        brevo_sender_name: senderName.trim(),
      }
      if (replacingKey && apiKey.trim()) body.brevo_api_key = apiKey.trim()

      const res = await fetch('/api/configuracion/integraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error || 'Error al guardar la configuración'); return }
      toast.success('Integración de Brevo actualizada')
      setApiKey('')
      setReplacingKey(false)
      await mutate()
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
        <Mail size={15} /> Integraciones — Brevo (Email Marketing)
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Configura las credenciales para enviar campañas de email desde el módulo de Campañas.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : error ? (
        <ErrorState message="No se pudo cargar la integración de Brevo" onRetry={() => mutate()} />
      ) : (
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Brevo API Key</label>
            {!replacingKey ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400">
                  <KeyRound size={13} />
                  {data?.brevo_api_key_mask || 'No configurada'}
                </span>
                <Button size="sm" variant="secondary" onClick={() => setReplacingKey(true)}>
                  Reemplazar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  autoFocus
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="xkeysib-…"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                />
                <Button size="sm" variant="secondary" onClick={() => { setReplacingKey(false); setApiKey('') }}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Email remitente</label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="noticias@bullpadel.ec"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre remitente</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Bullpadel Ecuador"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
            />
          </div>
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={14} />
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}

const ROL_LABELS: Record<Rol, string> = {
  ventas: 'Ventas',
  comercial: 'Comercial',
  admin: 'Admin',
  cliente: 'Cliente',
}

const ROL_COLORS: Record<Rol, string> = {
  ventas: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  comercial: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  admin: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  cliente: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
}

interface NewUserForm {
  nombre: string
  email: string
  password: string
  rol: Exclude<Rol, 'cliente'>
}

interface NewClienteForm {
  nombre: string
  email: string
  password: string
  contacto_id: number | null
  contacto_nombre: string
}

const EMPTY_CLIENTE_FORM: NewClienteForm = { nombre: '', email: '', password: '', contacto_id: null, contacto_nombre: '' }

interface ConfiguracionClientProps {
  rol: Rol
}

export default function ConfiguracionClient({ rol }: ConfiguracionClientProps) {
  const isAdmin = rol === 'admin'

  const { data, error, isLoading, mutate } = useSWR<{ usuarios: UsuarioCRM[] }>(
    isAdmin ? '/api/usuarios' : null,
    fetcher
  )

  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<NewUserForm>({
    nombre: '',
    email: '',
    password: '',
    rol: 'ventas',
  })

  const [showClienteForm, setShowClienteForm] = useState(false)
  const [creatingCliente, setCreatingCliente] = useState(false)
  const [clienteForm, setClienteForm] = useState<NewClienteForm>(EMPTY_CLIENTE_FORM)

  async function handleCreateCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteForm.contacto_id) {
      toast.error('Selecciona un contacto para este acceso de cliente')
      return
    }
    setCreatingCliente(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: clienteForm.nombre,
          email: clienteForm.email,
          password: clienteForm.password,
          rol: 'cliente',
          contacto_id: clienteForm.contacto_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al crear el acceso de cliente')
        return
      }
      toast.success(`Acceso de cliente creado para ${clienteForm.nombre}`)
      setClienteForm(EMPTY_CLIENTE_FORM)
      setShowClienteForm(false)
      mutate()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCreatingCliente(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al crear usuario')
        return
      }
      toast.success(`Usuario ${form.nombre} creado`)
      setForm({ nombre: '', email: '', password: '', rol: 'ventas' })
      setShowForm(false)
      mutate()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActivo(usuario: UsuarioCRM) {
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !usuario.activo }),
      })
      if (!res.ok) throw new Error()
      mutate()
      toast.success(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`)
    } catch {
      toast.error('Error al actualizar usuario')
    }
  }

  async function togglePuedeEliminar(usuario: UsuarioCRM) {
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puede_eliminar: !usuario.puede_eliminar }),
      })
      if (!res.ok) throw new Error()
      mutate()
      toast.success(
        usuario.puede_eliminar
          ? `${usuario.nombre} ya no puede eliminar leads`
          : `${usuario.nombre} ahora puede eliminar leads`
      )
    } catch {
      toast.error('Error al actualizar usuario')
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAdmin ? 'Gestión de usuarios del CRM' : 'Preferencias de tu cuenta'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowClienteForm(!showClienteForm)} size="sm">
              <Building2 size={16} />
              Crear acceso de cliente
            </Button>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus size={16} />
              Nuevo usuario
            </Button>
          </div>
        )}
      </div>

      <NotificacionesCard />

      {!isAdmin ? null : (
        <>
      <IntegracionesCard />

      {/* Crear acceso de cliente — flujo separado del alta de usuarios internos:
          busca un contacto existente (mismo ContactoSearch de Negocios/Campañas)
          en vez de un selector de rol libre, porque un acceso de cliente siempre
          necesita un contacto_id. Solo admin puede crear/desactivar estos accesos
          (gate ya aplicado arriba con isAdmin). */}
      <AnimatePresence>
        {showClienteForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Crear acceso de cliente</h3>
              <form onSubmit={handleCreateCliente} className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Contacto</label>
                  <ContactoSearch
                    value={clienteForm.contacto_nombre}
                    placeholder="Buscar contacto existente…"
                    onSelect={(c) => setClienteForm((f) => ({ ...f, contacto_id: c?.id ?? null, contacto_nombre: c?.nombre ?? '' }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre del contacto de acceso</label>
                  <input
                    required
                    value={clienteForm.nombre}
                    onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })}
                    placeholder="Nombre de quien inicia sesión"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={clienteForm.email}
                    onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                    placeholder="cliente@empresa.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={clienteForm.password}
                    onChange={(e) => setClienteForm({ ...clienteForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-3 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowClienteForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" loading={creatingCliente}>
                    Crear acceso
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Crear nuevo usuario</h3>
              <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre completo</label>
                  <input
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ana García"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ana@bullpadel.ec"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Rol</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value as Exclude<Rol, 'cliente'> })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B2B8C]/20 focus:border-[#1B2B8C] transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ventas">Ventas</option>
                    <option value="comercial">Comercial</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" loading={creating}>
                    Crear usuario
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users list */}
      <div className="bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 dark:border-white/5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Usuarios registrados
            {data && <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">({data.usuarios.length})</span>}
          </h3>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message="No se pudo cargar la lista de usuarios" onRetry={() => mutate()} />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {(data?.usuarios ?? []).map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                  u.activo ? 'bg-[#1B2B8C]/10 text-[#1B2B8C] dark:bg-[#4A9FD8]/10 dark:text-[#4A9FD8]' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                )}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium text-gray-900 dark:text-gray-100', !u.activo && 'text-gray-500 dark:text-gray-400 line-through')}>
                    {u.nombre}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {u.email}
                    {u.rol === 'cliente' && u.contacto_nombre && ` · Acceso de ${u.contacto_nombre}`}
                  </p>
                </div>
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full', ROL_COLORS[u.rol])}>
                  {ROL_LABELS[u.rol]}
                </span>
                {u.rol !== 'cliente' && (
                  <button
                    onClick={() => togglePuedeEliminar(u)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors',
                      u.puede_eliminar
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20'
                        : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                    )}
                    title="Alternar permiso para eliminar leads"
                  >
                    {u.puede_eliminar ? <Trash2 size={12} /> : <ShieldOff size={12} />}
                    Puede eliminar leads
                  </button>
                )}
                <button
                  onClick={() => toggleActivo(u)}
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    u.activo
                      ? 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                      : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'
                  )}
                  title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                >
                  {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
