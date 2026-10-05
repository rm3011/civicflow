import { MapPin, Clock, ChevronRight, ImageOff } from 'lucide-react'
import { useState } from 'react'
import SeverityBadge from './SeverityBadge'
import { useLanguage } from '../hooks/useLanguage'
import type { Complaint } from '../lib/api'
import type { AdministrativeArea } from '../lib/constants'
import { cn } from '../lib/utils'

interface ComplaintCardProps {
  complaint: Complaint
  departmentName?: string
  areaName?: string
  areaType?: AdministrativeArea['areaType']
  onClick?: () => void
  action?: React.ReactNode
}

export default function ComplaintCard({
  complaint,
  departmentName,
  areaName,
  areaType = 'zone',
  onClick,
  action,
}: ComplaintCardProps) {
  const { t } = useLanguage()
  const Wrapper = onClick ? 'button' : 'div'
  const [imgError, setImgError] = useState(false)

  const hasPhoto = !!complaint.photo_url && !imgError

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'group w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-xs transition-all sm:p-5',
        onClick && 'hover:border-border-strong hover:shadow-md cursor-pointer'
      )}
    >
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
        {/* PHOTO — only when present */}
        {complaint.photo_url && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-sunken sm:h-20 sm:w-20">
            {hasPhoto ? (
              <img
                src={complaint.photo_url}
                alt="Complaint"
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-5 w-5 text-ink-300" strokeWidth={2} />
              </div>
            )}
          </div>
        )}

        {/* CONTENT */}
        <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={complaint.severity} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              {departmentName ?? complaint.problem_type.replace(/_/g, ' ')}
            </span>
            <span className="text-[11px] text-ink-400">
              {Math.round((complaint.ai_confidence ?? 0) * 100)}%
            </span>
          </div>

          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-900">
            {complaint.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {areaType === 'revenue_division'
                ? t('report.revenueDivision')
                : `${t('report.zone')} ${complaint.zone_id ?? '—'}`}
              {areaName ? ` · ${areaName}` : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" strokeWidth={2} />
              {new Date(complaint.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ACTION / CHEVRON */}
        {action ? (
          <div className="w-full sm:w-auto sm:shrink-0">
            {action}
          </div>
        ) : (
          onClick && (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
          )
        )}
      </div>
    </Wrapper>
  )
}