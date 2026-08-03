'use client'
import { useEffect, useState } from 'react'
import { BorderBeam } from 'border-beam'

type BorderBeamProps = React.ComponentProps<typeof BorderBeam>

// BorderBeam inyecta un <style> con un id generado en cada render; renderizado
// durante SSR, ese id difiere entre el HTML del servidor y el primer render
// del cliente y dispara un hydration mismatch. Se retrasa un tick (post-mount)
// para que la primera pasada de hidratación vea el mismo árbol en ambos lados.
export default function ClientOnlyBeam({ children, ...props }: BorderBeamProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <>{children}</>
  return <BorderBeam {...props}>{children}</BorderBeam>
}
