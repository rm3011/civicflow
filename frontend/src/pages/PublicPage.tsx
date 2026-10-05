// src/pages/PublicPage.tsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Camera, Send, Loader2, Sparkles, AlertCircle, CheckCircle2,
  Building2, Route, Info, MapPinned, X, ClipboardList, ShieldCheck
} from 'lucide-react'
import Layout from '../components/Layout'
import SeverityBadge from '../components/SeverityBadge'
import {
  listDepartments,
  listAdministrativeAreas,
  listDistricts,
  submitComplaint,
  uploadPhoto,
  type NearbyProject,
} from '../lib/api'
import { useLanguage } from '../hooks/useLanguage'
import type { AdministrativeArea, Department, District } from '../lib/constants'
import { cn } from '../lib/utils'

interface PublicPageProps {
  activeTab: 'public' | 'government'
  onTabChange: (tab: 'public' | 'government') => void
}

type LocationState = 'idle' | 'pending' | 'acquired' | 'denied'

interface ClassificationResult {
  problem_type: string
  department_id?: string
  severity: string
  ai_confidence: number
  ai_reasoning: string
  nearby_projects: NearbyProject[]
  coordination_needed: boolean
}

export default function PublicPage({ activeTab, onTabChange }: PublicPageProps) {
  const { t, lang } = useLanguage()
  const [description, setDescription] = useState('')
  const [districts, setDistricts] = useState<District[]>([])
  const [selectedDistrict, setSelectedDistrict] = useState('chennai')
  const [departments, setDepartments] = useState<Department[]>([])
  const [areas, setAreas] = useState<AdministrativeArea[]>([])
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [configDistrict, setConfigDistrict] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // NEW: photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    listDistricts()
      .then((items) => {
        if (!cancelled) setDistricts(items)
      })
      .catch((e: unknown) => {
        console.error(e)
        if (!cancelled) setError('Could not load districts. Please refresh and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
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
      .catch((e: unknown) => {
        console.error(e)
        if (!cancelled) {
          setError('Could not load departments and reporting areas. Please try again.')
          setConfigDistrict(selectedDistrict)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedDistrict])

  // NEW: handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type + size
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }

    setError(null)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const captureLocation = async () => {
    setLocationState('pending')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 6000,
          enableHighAccuracy: true,
        })
      )
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setLocationState('acquired')
    } catch {
      setLocationState('denied')
    }
  }

  const handleSubmit = async () => {
    if (!description.trim()) return
    if (selectedArea == null) {
      setError('Select the reporting area where the issue is located.')
      return
    }
    setLoading(true)
    setError(null)

    // 1. Get location before uploading so denied reports do not leave orphaned photos.
    let lat = coords?.lat
    let lng = coords?.lng
    if (lat == null || lng == null) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        setCoords({ lat, lng })
        setLocationState('acquired')
      } catch {
        setLocationState('denied')
        setError('Location permission is required to submit a report.')
        setLoading(false)
        return
      }
    }

    // 2. Upload photo if provided.
    let photoUrl: string | undefined
    if (photoFile) {
      setUploading(true)
      try {
        const up = await uploadPhoto(photoFile)
        photoUrl = up.photo_url
      } catch (e) {
        console.error(e)
        const reason = e instanceof Error ? ` ${e.message}` : ''
        setError(`Photo upload failed. Submitting without photo.${reason}`)
      } finally {
        setUploading(false)
      }
    }

    // 3. Submit complaint.
    try {
      const res = await submitComplaint({
        description,
        latitude: lat,
        longitude: lng,
        city: selectedDistrict,
        zone_id: selectedArea,
        photo_url: photoUrl,
      })
      setResult({
        problem_type: res.complaint.problem_type,
        department_id: res.complaint.department_id ?? undefined,
        severity: res.complaint.severity,
        ai_confidence: res.complaint.ai_confidence,
        ai_reasoning: res.complaint.ai_reasoning,
        nearby_projects: res.nearby_projects,
        coordination_needed: res.coordination_needed,
      })
      // Reset
      setDescription('')
      removePhoto()
    } catch (e) {
      console.error(e)
      setError(
        e instanceof Error
          ? e.message
          : 'Submission failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const dept = result?.department_id
    ? departments.find((d) => d.id === result.department_id)
    : null
  const areaLabel = areas[0]?.areaType === 'revenue_division'
    ? t('report.revenueDivision')
    : t('report.zone')
  const configLoading = configDistrict !== selectedDistrict
  const canSubmit =
    !loading &&
    !uploading &&
    !!description.trim() &&
    selectedArea != null &&
    !configLoading
  const submitGuidance = configLoading
    ? t('report.requirement.loading')
    : !selectedArea && !description.trim()
      ? t('report.requirement.both')
      : selectedArea == null
        ? t('report.requirement.area')
        : !description.trim()
          ? t('report.requirement.description')
          : t('report.requirement.location')

  return (
    <Layout activeTab={activeTab} onTabChange={onTabChange}>
      <section className="relative overflow-hidden border-b border-brand-900 bg-brand-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 78% 12%, rgba(201,162,39,0.32), transparent 28%), radial-gradient(circle at 92% 88%, rgba(40,119,168,0.5), transparent 38%)',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-18">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              {t('hero.eyebrow')}
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              {t('hero.subtitle')}
            </p>
          </motion.div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-white shadow-lg backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-500">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">{t('hero.workflow.title')}</h2>
                <p className="mt-0.5 text-xs text-white/80">{t('hero.workflow.subtitle')}</p>
              </div>
            </div>
            <ol className="mt-4 space-y-3">
              {([
                t('hero.workflow.area'),
                t('hero.workflow.report'),
                t('hero.workflow.review'),
              ]).map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-xs text-white/85">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-gold-500">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/80">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/80" />
              {t('hero.workflow.privacy')}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Report form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl border border-border bg-surface p-4 shadow-md sm:p-8"
          >
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900">
                {t('report.heading')}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t('report.subheading')}</p>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                {t('report.district')}
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value)
                    setDepartments([])
                    setAreas([])
                    setSelectedArea(null)
                    setError(null)
                  }}
                  disabled={districts.length === 0 || loading}
                  className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-sm font-normal normal-case tracking-normal text-ink-900 transition-colors focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-wait disabled:text-ink-500"
                >
                  {districts.length === 0 ? (
                    <option value="chennai">{t('report.selectDistrict')}</option>
                  ) : (
                    districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name[lang]}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                {areaLabel}
                <select
                  value={selectedArea ?? ''}
                  onChange={(e) => {
                    setSelectedArea(e.target.value ? Number(e.target.value) : null)
                    setError(null)
                  }}
                  disabled={configLoading || areas.length === 0 || loading}
                  className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-sm font-normal normal-case tracking-normal text-ink-900 transition-colors focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-wait disabled:text-ink-500"
                >
                  <option value="">
                    {configLoading ? t('report.loadingAreas') : t('report.selectArea')}
                  </option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name[lang]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="-mt-2 mb-5 text-[11px] leading-relaxed text-ink-400">
              {t('report.areaHelp')}
            </p>

            <label
              htmlFor="description"
              className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-ink-500"
            >
              {t('report.description')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={t('report.descriptionPlaceholder')}
              className="min-h-32 w-full resize-y rounded-xl border border-border bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />

            {/* --- PHOTO + LOCATION --- */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Photo button / preview */}
              {photoPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-brand-500 bg-brand-100/30">
                  <img
                    src={photoPreview}
                    alt="Attachment preview"
                    className="h-20 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/70 text-white transition-colors hover:bg-critical"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-ink-900/80 to-transparent px-3 py-1.5">
                    <span className="text-[10px] font-semibold text-white">
                      {photoFile?.name.slice(0, 24)}
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-12 items-center gap-2.5 rounded-xl border border-dashed border-border bg-surface-sunken px-4 py-3 text-left transition-colors hover:border-brand-500 hover:bg-brand-100/30 active:scale-[0.99]"
                >
                  <Camera className="h-4 w-4 text-ink-500" strokeWidth={2} />
                  <span className="text-[12px] font-medium text-ink-700">
                    {t('report.photo')}
                  </span>
                </button>
              )}

              {/* Location button */}
              <button
                type="button"
                onClick={captureLocation}
                disabled={locationState === 'pending' || loading}
                className={cn(
                  'flex min-h-12 items-center gap-2.5 rounded-xl border border-dashed border-border bg-surface-sunken px-4 py-3 text-left transition-colors hover:border-brand-500 hover:bg-brand-100/30 active:scale-[0.99] disabled:cursor-wait disabled:text-ink-500',
                  locationState === 'acquired' && 'border-solid border-success bg-success-bg'
                )}
              >
                {locationState === 'acquired' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} />
                ) : (
                  <MapPinned className="h-4 w-4 text-ink-500" strokeWidth={2} />
                )}
                <span className="text-[12px] font-medium text-ink-700">
                  {locationState === 'acquired' && t('report.locationAcquired')}
                  {locationState === 'pending' && t('report.locationPending')}
                  {locationState === 'denied' && t('report.locationDenied')}
                  {locationState === 'idle' && t('report.location')}
                </span>
              </button>
            </div>

            {coords && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
                <MapPin className="h-3 w-3" strokeWidth={2} />
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-critical-bg p-3 text-[12px] text-critical">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-describedby="submit-guidance"
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand-700 bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:border-brand-600 hover:bg-brand-600 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface-sunken disabled:text-ink-600 disabled:shadow-none disabled:opacity-100"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                  Uploading photo…
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                  {t('report.submitting')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" strokeWidth={2.5} />
                  {t('report.submit')}
                </>
              )}
            </button>
            <p
              id="submit-guidance"
              className={cn(
                'mt-2.5 flex items-start gap-2 text-xs leading-relaxed',
                canSubmit ? 'text-ink-500' : 'text-ink-600'
              )}
              aria-live="polite"
            >
              {canSubmit && <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />}
              <span>{submitGuidance}</span>
            </p>
          </motion.div>

          {/* Result panel — unchanged from before */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
          >
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-90 flex-col items-center justify-center text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
                    <Sparkles className="h-6 w-6 text-brand-700" strokeWidth={2} />
                  </div>
                  <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-500">
                    {t('result.empty')}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      {t('result.heading')}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <SeverityBadge severity={result.severity} size="md" />
                      <span className="text-[12px] text-ink-500">
                        {t('result.confidence')}: {Math.round(result.ai_confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {dept && (
                    <div className="rounded-xl border border-border bg-surface-sunken p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        {t('result.department')}
                      </div>
                      <div className="mt-2 flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
                          <Building2 className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-semibold text-ink-900">
                          {dept.name.en}
                        </span>
                      </div>
                    </div>
                  )}

                  {result.ai_reasoning && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        <Info className="h-3 w-3" strokeWidth={2.5} />
                        {t('result.reasoning')}
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-700 italic">
                        "{result.ai_reasoning}"
                      </p>
                    </div>
                  )}

                  {result.nearby_projects.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        {t('result.nearby')}
                      </div>
                      <div className="mt-3 space-y-2">
                        {result.nearby_projects.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-ink-900">
                                {p.name}
                              </div>
                              <div className="mt-0.5 text-[11px] text-ink-400">
                                {p.authority}
                              </div>
                            </div>
                            <div className="ml-3 flex shrink-0 items-center gap-1 text-[11px] font-bold text-brand-700">
                              <Route className="h-3 w-3" strokeWidth={2.5} />
                              {p.distance_m.toFixed(0)}m
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.coordination_needed && (
                    <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-100 p-4">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" strokeWidth={2.5} />
                      <div>
                        <div className="text-[12px] font-bold text-gold-700">
                          {t('result.coordination')}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gold-700/80">
                          The government dashboard has been notified.
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </Layout>
  )
}