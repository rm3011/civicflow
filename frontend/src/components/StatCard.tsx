import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'gold'
}

const TONES = {
  default: { fg: 'text-brand-700', bg: 'bg-brand-100', ring: 'ring-brand-500/10' },
  critical: { fg: 'text-critical', bg: 'bg-critical-bg', ring: 'ring-critical/10' },
  warning: { fg: 'text-warning', bg: 'bg-warning-bg', ring: 'ring-warning/10' },
  success: { fg: 'text-success', bg: 'bg-success-bg', ring: 'ring-success/10' },
  gold: { fg: 'text-gold-700', bg: 'bg-gold-100', ring: 'ring-gold-500/20' },
}

export default function StatCard({ label, value, icon: Icon, tone = 'default' }: StatCardProps) {
  const c = TONES[tone]
  return (
    <div className="group rounded-2xl border border-border bg-surface p-3.5 shadow-xs transition-all hover:border-border-strong hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500 sm:text-[11px] sm:tracking-wider">
          {label}
        </span>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-8 sm:w-8', c.bg, c.fg, c.ring)}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:mt-4 sm:text-3xl">
        {value}
      </div>
    </div>
  )
}