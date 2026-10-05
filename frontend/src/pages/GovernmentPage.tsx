import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Shield, Droplets, Route, Zap, Trash2, Building2, Columns3,
  HeartPulse, Trees, Hammer, GraduationCap, BatteryCharging, TrafficCone,
  Stethoscope, Loader2, Inbox, BadgeCheck, LogIn, Search, RefreshCw,
  CheckCircle2, Clock3, ClipboardCheck, XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Layout from '../components/Layout'
import ComplaintCard from '../components/ComplaintCard'
import ComplaintConflictCard from '../components/ComplaintConflictCard'
import StatCard from '../components/StatCard'
import {
  listComplaints,
  listDepartments,
  listDistricts,
  listAdministrativeAreas,
  sanctionComplaint,
  setComplaintCompleted,
  type Complaint,
} from '../lib/api'
import type { AdministrativeArea, Department, District } from '../lib/constants'
import { useLanguage } from '../hooks/useLanguage'
import { cn } from '../lib/utils'
import type { TranslationKey } from '../lib/i18n'

interface GovernmentPageProps {
  activeTab: 'public' | 'government'
  onTabChange: (tab: 'public' | 'government') => void
}

type Step = 'login' | 'district' | 'department' | 'zone' | 'feed'
type ComplaintFilter = 'all' | 'pending' | 'sanctioned' | 'completed' | 'rejected'

const DEPT_ICONS: Record<string, LucideIcon> = {
  storm_water: Droplets,
  bus_roads: Route,
  metro_water: Droplets,
  electrical: Zap,
  swm: Trash2,
  buildings: Building2,
  bridges: Columns3,
  public_health: HeartPulse,
  parks: Trees,
  works: Hammer,
  education: GraduationCap,
  tangedco: BatteryCharging,
  highways: TrafficCone,
  health: Stethoscope,
}

export default function GovernmentPage({ activeTab, onTabChange }: GovernmentPageProps) {
  const { t, lang } = useLanguage()
  const [step, setStep] = useState<Step>('login')
  const [districts, setDistricts] = useState<District[]>([])
  const [districtsLoaded, setDistrictsLoaded] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [areas, setAreas] = useState<AdministrativeArea[]>([])
  const [configDistrict, setConfigDistrict] = useState<string | null>(null)
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [conflictRefreshToken, setConflictRefreshToken] = useState(0)
  const [complaintRefreshToken, setComplaintRefreshToken] = useState(0)
  const [complaintFilter, setComplaintFilter] = useState<ComplaintFilter>('all')
  const [complaintSearch, setComplaintSearch] = useState('')
  const [updatingComplaintId, setUpdatingComplaintId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listDistricts()
      .then((items) => {
        if (!cancelled) {
          setDistricts(items)
          setDistrictsLoaded(true)
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load districts', err)
        if (!cancelled) {
          setError('Could not load districts. Please refresh and try again.')
          setDistrictsLoaded(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedDistrict) return
    let cancelled = false
    Promise.all([
      listDepartments(selectedDistrict),
      listAdministrativeAreas(selectedDistrict),
    ])
      .then(([departmentItems, areaItems]) => {
        if (cancelled) return
        setDepartments(departmentItems)
        setAreas(areaItems)
        setConfigDistrict(selectedDistrict)
      })
      .catch((err: unknown) => {
        console.error('Failed to load district configuration', err)
        if (!cancelled) {
          setError('Could not load departments and reporting areas for this district.')
          setConfigDistrict(selectedDistrict)
        }
      })
    return () => { cancelled = true }
  }, [selectedDistrict])

  useEffect(() => {
    if (step !== 'feed' || !selectedDept || !selectedArea || !selectedDistrict) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await listComplaints({
          department: selectedDept,
          areaId: selectedArea,
          city: selectedDistrict,
        })
        if (!cancelled) setComplaints(data)
      } catch (err) {
        console.error('Failed to load complaints', err)
        if (!cancelled) setError('Could not load complaints for this district and zone.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [step, selectedDept, selectedArea, selectedDistrict, complaintRefreshToken])

  const handleSanction = useCallback(async (id: number, sanctioned: boolean) => {
    setUpdatingComplaintId(id)
    try {
      const updated = await sanctionComplaint(id, sanctioned)
      setComplaints((prev) =>
        prev.map((complaint) => (complaint.id === id ? updated : complaint))
      )
      setConflictRefreshToken((token) => token + 1)
    } catch (err) {
      console.error('Sanction failed', err)
      setError(err instanceof Error ? err.message : 'Could not update the complaint status.')
    } finally {
      setUpdatingComplaintId(null)
    }
  }, [])

  const handleCompletion = useCallback(async (id: number, completed: boolean) => {
    setUpdatingComplaintId(id)
    try {
      const updated = await setComplaintCompleted(id, completed)
      setComplaints((prev) =>
        prev.map((complaint) => (complaint.id === id ? updated : complaint))
      )
      setConflictRefreshToken((token) => token + 1)
    } catch (err) {
      console.error('Completion update failed', err)
      setError(err instanceof Error ? err.message : 'Could not update completion status.')
    } finally {
      setUpdatingComplaintId(null)
    }
  }, [])

  const activeDistrict = districts.find((d) => d.id === selectedDistrict)
  const activeDept = departments.find((d) => d.id === selectedDept)
  const activeArea = areas.find((area) => area.id === selectedArea)
  const areaType = areas[0]?.areaType
  const configLoading = configDistrict !== selectedDistrict
  const completedCount = complaints.filter((complaint) => complaint.completed).length
  const sanctionedCount = complaints.filter(
    (complaint) => complaint.status === 'sanctioned' && !complaint.completed
  ).length
  const pendingCount = complaints.filter((complaint) => complaint.status === 'pending').length
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesFilter =
      complaintFilter === 'all' ||
      (complaintFilter === 'completed' && complaint.completed) ||
      (complaintFilter === 'sanctioned' &&
        complaint.status === 'sanctioned' &&
        !complaint.completed) ||
      (complaintFilter === 'pending' && complaint.status === 'pending') ||
      (complaintFilter === 'rejected' && complaint.status === 'rejected')
    const query = complaintSearch.trim().toLocaleLowerCase()
    const matchesSearch =
      !query ||
      complaint.description.toLocaleLowerCase().includes(query) ||
      String(complaint.id).includes(query)
    return matchesFilter && matchesSearch
  })

  // --- LOGIN ---
  if (step === 'login') {
    return (
      <Layout activeTab={activeTab} onTabChange={onTabChange}>
        <div className="mx-auto grid min-h-[calc(100vh-12rem)] max-w-5xl items-center gap-7 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/15 bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
              <Shield className="h-3.5 w-3.5" />
              {t('gov.workspaceLabel')}
            </div>
            <h1 className="mt-5 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              {t('gov.login')}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-ink-500 sm:text-base">
              {t('gov.loginSub')}
            </p>
            <div className="mt-7 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-bg p-4">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-xs leading-relaxed text-ink-700">
                {t('gov.demoNotice')}
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-surface p-5 shadow-md sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 text-white">
              <ClipboardCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink-900">
              {t('gov.demoWorkspace')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              {t('gov.demoWorkspaceSub')}
            </p>
            <button
              onClick={() => setStep('district')}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md active:scale-[0.99]"
            >
              <LogIn className="h-4 w-4" strokeWidth={2.5} />
              {t('gov.demo')}
            </button>
          </motion.div>
        </div>
      </Layout>
    )
  }

  // --- DISTRICT SELECT ---
  if (step === 'district') {
    return (
      <Layout activeTab={activeTab} onTabChange={onTabChange}>
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
          <BackButton onClick={() => setStep('login')} label={t('gov.back')} />
          <PageHeader
            title={t('gov.selectDistrict')}
            subtitle={t('gov.selectDistrictSub')}
          />
          {error && <ErrorMessage message={error} />}
          {!districtsLoaded ? (
            <LoadingMessage label={t('gov.loadingDistricts')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {districts.map((district, index) => (
                <motion.button
                  key={district.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  onClick={() => {
                    if (district.id !== selectedDistrict) {
                      setDepartments([])
                      setAreas([])
                    }
                    setSelectedDistrict(district.id)
                    setSelectedDept(null)
                    setSelectedArea(null)
                    setError(null)
                    setStep('department')
                  }}
                  className="group min-h-16 rounded-2xl border border-border bg-surface p-4 text-left shadow-xs transition-all hover:border-brand-500 hover:shadow-md active:scale-[0.99] sm:p-5"
                >
                  <div className="text-[14px] font-semibold text-ink-900">
                    {district.name[lang]}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // --- DEPARTMENT SELECT ---
  if (step === 'department') {
    return (
      <Layout activeTab={activeTab} onTabChange={onTabChange}>
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
          <BackButton onClick={() => setStep('district')} label={t('gov.back')} />
          <PageHeader
            title={`${activeDistrict?.name[lang]} · ${t('gov.selectDepartment')}`}
            subtitle={t('gov.selectDepartmentSub')}
          />

          {error && <ErrorMessage message={error} />}
          {configLoading ? (
            <LoadingMessage label={t('gov.loadingConfiguration')} />
          ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept, i) => {
              const Icon = DEPT_ICONS[dept.id] ?? Building2
              return (
                <motion.button
                  key={dept.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => {
                    setSelectedDept(dept.id)
                    setStep('zone')
                  }}
                  className="group flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-xs transition-all hover:border-brand-500 hover:shadow-md active:scale-[0.99] sm:gap-4 sm:p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold leading-snug text-ink-900">
                      {dept.name[lang]}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
          )}
        </div>
      </Layout>
    )
  }

  // --- ZONE SELECT ---
  if (step === 'zone') {
    return (
      <Layout activeTab={activeTab} onTabChange={onTabChange}>
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
          <BackButton onClick={() => setStep('department')} label={t('gov.backDepartments')} />
          <PageHeader
            title={`${activeDistrict?.name[lang]} · ${
              areaType === 'revenue_division'
                ? t('gov.selectRevenueDivision')
                : t('gov.selectZone')
            }`}
            subtitle={`${activeDept?.name[lang]} · ${
              areaType === 'revenue_division'
                ? t('gov.selectRevenueDivisionSub')
                : t('gov.selectZoneSub')
            }`}
          />

          {error && <ErrorMessage message={error} />}
          {configLoading ? (
            <LoadingMessage label={t('gov.loadingConfiguration')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((area, index) => (
                <ZoneButton
                  key={area.id}
                  area={area}
                  lang={lang}
                  delay={index * 0.03}
                  onClick={() => {
                    setSelectedArea(area.id)
                    setComplaints([])
                    setStep('feed')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // --- FEED ---
  return (
    <Layout activeTab={activeTab} onTabChange={onTabChange}>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <BackButton onClick={() => setStep('zone')} label={t('gov.backZones')} />

        <div className="mb-5 rounded-2xl bg-brand-900 px-4 py-4 text-white shadow-md sm:mb-6 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                {activeDistrict?.name[lang]} · {activeArea?.name[lang]}
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {activeDept?.name[lang]}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                {t('gov.feed.workspaceSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComplaintRefreshToken((token) => token + 1)}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-wait disabled:bg-white/10 disabled:text-white/90"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              {t('gov.feed.refresh')}
            </button>
          </div>
        </div>

        {selectedDistrict && selectedArea != null && (
          <ComplaintConflictCard
            city={selectedDistrict}
            zone={selectedArea}
            refreshToken={conflictRefreshToken}
          />
        )}

        <div className="mb-5 grid grid-cols-2 gap-2 sm:mb-7 sm:gap-3 lg:grid-cols-4">
          <StatCard label={t('gov.metrics.total')} value={complaints.length} icon={Inbox} />
          <StatCard label={t('gov.metrics.review')} value={pendingCount} icon={Clock3} tone="warning" />
          <StatCard label={t('gov.metrics.inProgress')} value={sanctionedCount} icon={BadgeCheck} tone="gold" />
          <StatCard label={t('gov.metrics.completed')} value={completedCount} icon={CheckCircle2} tone="success" />
        </div>

        {error && <ErrorMessage message={error} />}

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" strokeWidth={2.5} />
            <p className="mt-3 text-sm text-ink-500">{t('gov.feed.loading')}</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-sunken">
              <Inbox className="h-5 w-5 text-ink-400" strokeWidth={2} />
            </div>
            <p className="mt-4 text-sm text-ink-500">{t('gov.feed.empty')}</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">{t('gov.feed.caseRegister')}</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {filteredComplaints.length} {t('gov.feed.of')} {complaints.length} {t('gov.feed.complaints')}
                  </p>
                </div>
                <label className="relative block w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    value={complaintSearch}
                    onChange={(event) => setComplaintSearch(event.target.value)}
                    placeholder={t('gov.feed.search')}
                    aria-label={t('gov.feed.search')}
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={t('gov.feed.filter')}>
                {([
                  ['all', t('gov.filter.all')],
                  ['pending', t('gov.filter.pending')],
                  ['sanctioned', t('gov.filter.inProgress')],
                  ['completed', t('gov.filter.completed')],
                  ['rejected', t('gov.filter.rejected')],
                ] as const).map(([filter, label]) => (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={complaintFilter === filter}
                    onClick={() => setComplaintFilter(filter)}
                    className={cn(
                      'min-h-11 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.98]',
                      complaintFilter === filter
                        ? 'bg-brand-900 text-white'
                        : 'text-ink-700 hover:bg-surface-elevated hover:text-ink-900'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filteredComplaints.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <Search className="h-5 w-5 text-ink-300" />
                <p className="mt-3 text-sm font-medium text-ink-700">{t('gov.feed.noMatches')}</p>
                <p className="mt-1 text-xs text-ink-500">{t('gov.feed.noMatchesSub')}</p>
              </div>
            ) : (
            <div className="space-y-3 p-4 sm:p-5">
              <AnimatePresence>
              {filteredComplaints.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <ComplaintCard
                    complaint={c}
                    departmentName={activeDept?.name[lang]}
                    areaName={activeArea?.name[lang]}
                    areaType={activeArea?.areaType}
                    action={
                      <CaseWorkflowActions
                        complaint={c}
                        busy={updatingComplaintId === c.id}
                        onSanction={(sanctioned) => handleSanction(c.id, sanctioned)}
                        onCompletion={(completed) => handleCompletion(c.id, completed)}
                        t={t}
                      />
                    }
                  />
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  )
}

/* --- Sub-components --- */

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-ink-700 transition-colors hover:bg-surface-elevated hover:text-ink-900 active:scale-[0.98] sm:mb-6"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
    </button>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
    </div>
  )
}

function ZoneButton({
  area, lang, delay, onClick,
}: {
  area: AdministrativeArea
  lang: 'en' | 'ta' | 'hi'
  delay: number
  onClick: () => void
}) {
  const { t } = useLanguage()
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className="group min-h-16 rounded-2xl border border-border bg-surface p-4 text-left shadow-xs transition-all hover:border-brand-500 hover:shadow-md active:scale-[0.99] sm:p-5"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
        {area.areaType === 'revenue_division'
          ? t('report.revenueDivision')
          : `${t('report.zone')} ${area.id}`}
      </div>
      <div className="mt-1.5 text-[14px] font-semibold text-ink-900">
        {area.name[lang]}
      </div>
    </motion.button>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-5 rounded-lg bg-critical-bg p-3 text-[12px] text-critical">
      {message}
    </div>
  )
}

function LoadingMessage({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-12 text-sm text-ink-500">
      <Loader2 className="h-4 w-4 animate-spin text-brand-700" strokeWidth={2.5} />
      {label}
    </div>
  )
}

function CaseWorkflowActions({
  complaint,
  busy,
  onSanction,
  onCompletion,
  t,
}: {
  complaint: Complaint
  busy: boolean
  onSanction: (sanctioned: boolean) => void
  onCompletion: (completed: boolean) => void
  t: (key: TranslationKey) => string
}) {
  if (complaint.status === 'pending') {
    return (
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onSanction(true)}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 active:scale-[0.98] disabled:cursor-wait disabled:bg-brand-100 disabled:text-brand-700"
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {t('gov.sanction')}
        </button>
        <button
          type="button"
          onClick={() => onSanction(false)}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-critical/30 hover:bg-critical-bg hover:text-critical active:scale-[0.98] disabled:cursor-wait disabled:border-border-strong disabled:bg-surface-sunken disabled:text-ink-600"
        >
          <XCircle className="h-3.5 w-3.5" />
          {t('gov.reject')}
        </button>
      </div>
    )
  }

  if (complaint.status === 'rejected') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-critical-bg px-3 py-1.5 text-xs font-semibold text-critical">
        <XCircle className="h-3.5 w-3.5" />
        {t('gov.rejected')}
      </span>
    )
  }

  const completed = complaint.completed === true
  return (
    <div className="flex min-w-40 shrink-0 flex-col items-start gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
        <BadgeCheck className="h-3.5 w-3.5" />
        {t('gov.sanctioned')}
      </span>
      <label className={cn(
        'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
        completed
          ? 'border-success/20 bg-success-bg text-success'
          : 'border-border bg-surface text-ink-700 hover:border-success/40',
        busy && 'cursor-wait'
      )}>
        <input
          type="checkbox"
          checked={completed}
          disabled={busy}
          onChange={(event) => onCompletion(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-success"
          aria-label={t('gov.markCompleted')}
        />
        <span>
          <span className="block font-semibold">
            {completed ? t('gov.completed') : t('gov.markCompleted')}
          </span>
          {completed && complaint.completed_at && (
            <span className="mt-0.5 block text-[10px] text-success/80">
              {new Date(complaint.completed_at).toLocaleDateString()}
            </span>
          )}
        </span>
      </label>
    </div>
  )
}