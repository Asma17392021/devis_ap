import { cn } from '@/lib/utils'

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; labelEn: string; className: string }> = {
  DRAFT:    { label: 'Brouillon', labelEn: 'Draft',    className: 'bg-gray-100 text-gray-700 ring-gray-200' },
  SENT:     { label: 'Envoyé',    labelEn: 'Sent',     className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  ACCEPTED: { label: 'Accepté',   labelEn: 'Accepted', className: 'bg-green-50 text-green-700 ring-green-200' },
  REFUSED:  { label: 'Refusé',    labelEn: 'Refused',  className: 'bg-red-50 text-red-700 ring-red-200' },
  EXPIRED:  { label: 'Expiré',    labelEn: 'Expired',  className: 'bg-orange-50 text-orange-700 ring-orange-200' },
}

interface StatusBadgeProps {
  status: QuoteStatus
  lang?: 'fr' | 'en'
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, lang = 'fr', size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT
  const label = lang === 'en' ? config.labelEn : config.label

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full ring-1',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {label}
    </span>
  )
}
