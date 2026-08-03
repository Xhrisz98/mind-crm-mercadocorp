import { FaWhatsapp, FaTelegram, FaFacebookMessenger, FaInstagram } from 'react-icons/fa'
import { Globe, HelpCircle, Store } from 'lucide-react'
import type { ComponentType } from 'react'

interface CanalIconProps {
  canal: string | null | undefined
  size?: number
  showLabel?: boolean
  className?: string
  /** Render icon + label in the current text color instead of the channel's brand color */
  monochrome?: boolean
}

type IconProps = { size?: number; style?: React.CSSProperties; className?: string }

export const CANAL_CONFIG: Record<string, { Icon: ComponentType<IconProps>; color: string; label: string }> = {
  whatsapp:  { Icon: FaWhatsapp as ComponentType<IconProps>,          color: '#25D366', label: 'WhatsApp'  },
  telegram:  { Icon: FaTelegram as ComponentType<IconProps>,          color: '#0088cc', label: 'Telegram'  },
  messenger: { Icon: FaFacebookMessenger as ComponentType<IconProps>, color: '#0084ff', label: 'Messenger' },
  instagram: { Icon: FaInstagram as ComponentType<IconProps>,         color: '#E1306C', label: 'Instagram' },
  web:       { Icon: Globe as ComponentType<IconProps>,               color: '#4A9FD8', label: 'Web'       },
  presencial: { Icon: Store as ComponentType<IconProps>,              color: '#6B7280', label: 'Presencial' },
}

export default function CanalIcon({ canal, size = 16, showLabel = false, className, monochrome = false }: CanalIconProps) {
  const key = canal?.toLowerCase?.()
  const config = key ? CANAL_CONFIG[key] : null

  if (!config) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 ${className ?? ''}`}>
        <HelpCircle size={size} />
        {showLabel && <span className="text-xs">Sin canal</span>}
      </span>
    )
  }

  const { Icon, color, label } = config

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <Icon size={size} style={monochrome ? undefined : { color }} />
      {showLabel && (
        <span className={`text-xs capitalize ${monochrome ? '' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
      )}
    </span>
  )
}
