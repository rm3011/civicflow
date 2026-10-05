import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowDown, Loader2, MapPin, RefreshCw } from 'lucide-react'
import { listComplaintConflicts, type ComplaintConflict } from '../lib/api'
import { useLanguage } from '../hooks/useLanguage'
import type { TranslationKey } from '../lib/i18n'

interface ComplaintConflictCardProps {
  city: string
  zone: number
  refreshToken: number
}

function formatProblemType(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatStatus(
  value: string,
  completed: boolean,
  translate: (key: TranslationKey) => string
): string {
  if (completed) return translate('gov.completed')
  if (value === 'sanctioned') return translate('gov.sanctioned')
  if (value === 'pending') return translate('gov.pending')
  return value
}

const COORDINATION_LABELS: Record<
  ComplaintConflict['coordination_type'],
  TranslationKey
> = {
  sequence: 'gov.reportConflicts.sequence',
  coordinate: 'gov.reportConflicts.coordinate',
  related_reports: 'gov.reportConflicts.related',
  manual_review: 'gov.reportConflicts.manualReview',
  completed_nearby: 'gov.reportConflicts.completedNearby',
}

const COORDINATION_GUIDANCE: Record<
  ComplaintConflict['coordination_type'],
  TranslationKey
> = {
  sequence: 'gov.reportConflicts.guidance.sequence',
  coordinate: 'gov.reportConflicts.guidance.coordinate',
  related_reports: 'gov.reportConflicts.guidance.related',
  manual_review: 'gov.reportConflicts.guidance.manualReview',
  completed_nearby: 'gov.reportConflicts.guidance.completedNearby',
}

export default function ComplaintConflictCard({
  city,
  zone,
  refreshToken,
}: ComplaintConflictCardProps) {
  const { t } = useLanguage()
  const [conflicts, setConflicts] = useState<ComplaintConflict[]>([])
  const [manualRefreshKey, setManualRefreshKey] = useState(0)
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const requestKey = `${city}:${zone}:${refreshToken}:${manualRefreshKey}`
  const loading = settledRequestKey !== requestKey
  const error = failure?.key === requestKey ? failure.message : null

  const refresh = useCallback(() => {
    setManualRefreshKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    listComplaintConflicts(city, zone)
      .then((result) => {
        if (!cancelled) setConflicts(result.conflicts)
      })
      .catch((err: unknown) => {
        console.error('Failed to load nearby complaint conflicts', err)
        if (!cancelled) {
          setFailure({
            key: requestKey,
            message: err instanceof Error
              ? err.message
              : 'Nearby report conflict analysis is unavailable.',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setSettledRequestKey(requestKey)
      })

    return () => { cancelled = true }
  }, [city, zone, refreshToken, manualRefreshKey, requestKey])

  return (
    <section
      aria-labelledby="complaint-conflicts-title"
      className="mb-6 overflow-hidden rounded-2xl border border-rose-200 bg-surface shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rose-100 bg-rose-50/70 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 id="complaint-conflicts-title" className="text-sm font-bold text-ink-900">
              {t('gov.reportConflicts.title')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              {t('gov.reportConflicts.subtitle')}
            </p>
          </div>
        </div>
        {!loading && !error && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
            {conflicts.length} {t('gov.reportConflicts.count')}
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('gov.reportConflicts.loading')}
          </p>
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-critical">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('gov.conflicts.retry')}
            </button>
          </div>
        ) : conflicts.length === 0 ? (
          <p className="text-sm text-ink-500">{t('gov.reportConflicts.empty')}</p>
        ) : (
          <div className="space-y-3">
            {conflicts.map((conflict) => {
              const hasRecommendedSequence =
                conflict.coordination_type === 'sequence' &&
                conflict.recommended_first_id != null &&
                conflict.recommended_second_id != null
              const firstReportIsA =
                conflict.recommended_first_id === conflict.complaint_a_id
              const firstType = firstReportIsA
                ? conflict.complaint_a_problem_type
                : conflict.complaint_b_problem_type
              const secondType = firstReportIsA
                ? conflict.complaint_b_problem_type
                : conflict.complaint_a_problem_type
              const firstStatus = firstReportIsA
                ? conflict.complaint_a_status
                : conflict.complaint_b_status
              const secondStatus = firstReportIsA
                ? conflict.complaint_b_status
                : conflict.complaint_a_status

              return (
                <article
                  key={`${conflict.complaint_a_id}-${conflict.complaint_b_id}`}
                  className="rounded-xl border border-rose-100 bg-surface px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {t('gov.reportConflicts.pairTitle')}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
                      <MapPin className="h-3.5 w-3.5" />
                      {Math.round(conflict.distance_m)} {t('gov.conflicts.meters')}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:items-stretch">
                    <div className="rounded-lg bg-surface-sunken px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold capitalize text-ink-900">
                          {formatProblemType(conflict.complaint_a_problem_type)} · #{conflict.complaint_a_id}
                        </p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-ink-600">
                          {formatStatus(
                            conflict.complaint_a_status,
                            conflict.complaint_a_completed,
                            t
                          )}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-600">
                        {conflict.complaint_a_description}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-sunken px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold capitalize text-ink-900">
                          {formatProblemType(conflict.complaint_b_problem_type)} · #{conflict.complaint_b_id}
                        </p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-ink-600">
                          {formatStatus(
                            conflict.complaint_b_status,
                            conflict.complaint_b_completed,
                            t
                          )}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-600">
                        {conflict.complaint_b_description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-amber-50 px-3.5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      {t(COORDINATION_LABELS[conflict.coordination_type])}
                    </p>
                    {hasRecommendedSequence && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-800">
                        <span>
                          {formatProblemType(firstType)} · #{conflict.recommended_first_id}
                          {firstStatus === 'sanctioned' && ` (${t('gov.sanctioned')})`}
                        </span>
                        <ArrowDown className="h-3.5 w-3.5 text-amber-700" />
                        <span>
                          {formatProblemType(secondType)} · #{conflict.recommended_second_id}
                          {secondStatus === 'sanctioned' && ` (${t('gov.sanctioned')})`}
                        </span>
                      </p>
                    )}
                    <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
                      {t('gov.conflicts.advisory')}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                      {t(COORDINATION_GUIDANCE[conflict.coordination_type])}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
