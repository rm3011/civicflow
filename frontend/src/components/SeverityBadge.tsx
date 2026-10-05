// src/components/SeverityBadge.tsx
import { cn } from '../lib/utils'
import { useLanguage } from '../hooks/useLanguage'
import type { TranslationKey } from '../lib/i18n'

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | string
  size?: 'sm' | 'md'
}

const STYLES: Record<string, string> = {
  high: 'bg-critical-bg text-critical ring-critical/15',
  medium: 'bg-warning-bg text-warning ring-warning/15',
  low: 'bg-success-bg text-success ring-success/15',
}

const SEVERITY_KEY: Record<string, TranslationKey> = {
  low: 'severity.low',
  medium: 'severity.medium',
  high: 'severity.high',
}

export default function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const { t } = useLanguage()
  const label = t(SEVERITY_KEY[severity] ?? 'severity.low')
  const styles = STYLES[severity] ?? STYLES.low

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        styles
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}