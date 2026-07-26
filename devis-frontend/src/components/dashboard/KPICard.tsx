import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'purple'
  trend?: { value: number; label: string }
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'ring-blue-100'   },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'ring-green-100'  },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-500', ring: 'ring-orange-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-100' },
}

export function KPICard({ title, value, subtitle, icon: Icon, color = 'blue', trend }: KPICardProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1', c.bg, c.ring)}>
        <Icon className={cn('w-5 h-5', c.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        {trend && (
          <p className={cn('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}

// Skeleton variant
export function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="h-7 bg-gray-100 rounded w-32" />
        <div className="h-2.5 bg-gray-100 rounded w-20" />
      </div>
    </div>
  )
}
