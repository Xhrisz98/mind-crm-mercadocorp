'use client'
import { ThinkingOrb, type OrbState } from 'thinking-orbs'

interface SpinnerProps {
  /** Verbo que mejor describe la acción en curso. @default 'working' */
  state?: OrbState
  className?: string
  'aria-label'?: string
}

// Envoltorio delgado sobre ThinkingOrb para estandarizar los indicadores de
// carga inline (tamaño 20px, tema auto) en toda la app.
export default function Spinner({ state = 'working', className, 'aria-label': ariaLabel }: SpinnerProps) {
  return <ThinkingOrb state={state} size={20} theme="auto" className={className} aria-label={ariaLabel} />
}
