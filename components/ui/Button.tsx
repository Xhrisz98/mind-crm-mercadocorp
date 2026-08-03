'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary: 'bg-[#1B2B8C] text-white hover:bg-[#1a277a] focus:ring-[#1B2B8C] dark:focus:ring-offset-midnight-canvas',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200 dark:bg-midnight-surface dark:text-gray-200 dark:border-midnight-border dark:hover:bg-white/5 dark:focus:ring-offset-midnight-canvas',
  danger: 'bg-[#CE142B] text-white hover:bg-[#b01224] focus:ring-[#CE142B] dark:focus:ring-offset-midnight-canvas',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-200 dark:text-gray-300 dark:hover:bg-white/10 dark:focus:ring-offset-midnight-canvas',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
}
