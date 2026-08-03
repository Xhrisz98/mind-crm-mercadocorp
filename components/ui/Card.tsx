'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export default function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-midnight-surface rounded-xl border border-gray-100 dark:border-midnight-border shadow-sm transition-colors duration-200',
        hover && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  )
}
