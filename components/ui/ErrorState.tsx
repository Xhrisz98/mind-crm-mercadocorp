'use client'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

interface ErrorStateProps {
  message?: string
  onRetry: () => void
  className?: string
}

export default function ErrorState({
  message = 'No se pudo cargar la información',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className ?? ''}`}>
      <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
