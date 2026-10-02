import { useState } from 'react'
import { submitComplaint, type NearbyProject } from '../lib/api'
import Layout from '../components/Layout'

interface PublicPageProps {
  activeTab: 'public' | 'government'
  onTabChange: (tab: 'public' | 'government') => void
}

export default function PublicPage({ activeTab, onTabChange }: PublicPageProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    problem_type: string
    severity: string
    ai_confidence: number
    nearby_projects: NearbyProject[]
    coordination_needed: boolean
  } | null>(null)

  const handleSubmit = async () => {
    if (!description.trim()) return
    setLoading(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      }).catch(() => null)

      const lat = position?.coords.latitude ?? 13.0827
      const lng = position?.coords.longitude ?? 80.2707

      const res = await submitComplaint({
        description,
        latitude: lat,
        longitude: lng,
      })

      setResult({
        problem_type: res.complaint.problem_type,
        severity: res.complaint.severity,
        ai_confidence: res.complaint.ai_confidence,
        nearby_projects: res.nearby_projects,
        coordination_needed: res.coordination_needed,
      })
    } catch (error) {
      console.error('Submission failed:', error)
      alert('Submission failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout activeTab={activeTab} onTabChange={onTabChange}>
      <section className="city-hero">
        <img
          className="city-hero-image"
          src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1800&q=85"
          alt="Active urban infrastructure construction site"
        />
        <div className="city-hero-content">
          <div className="hero-eyebrow">Live infrastructure intelligence</div>
          <h1 className="hero-title">
            Report what needs attention.
            <br />
            <span>We’ll coordinate the response.</span>
          </h1>
          <p className="hero-copy">
            Local reports, project context, and the right city teams brought together in one place.
          </p>
        </div>
      </section>

      <section className="content-shell report-grid">
        <div className="glass-panel report-panel">
          <h2 className="section-heading">Submit a report</h2>
          <p className="section-note">Tell us what is happening and we’ll route it to the right team.</p>
          <label className="field-label" htmlFor="report-description">
            What needs attention?
          </label>
          <textarea
            id="report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="e.g. Large pothole on the main road after heavy rain..."
            className="report-textarea"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
            className="primary-button form-submit"
          >
            {loading ? 'Analyzing report...' : 'Send report'}
          </button>
        </div>

        <div className="glass-panel report-panel analysis-panel">
            {result ? (
              <div className="space-y-6">
                <div>
                  <span className="result-label">AI classification</span>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="result-type">
                      {result.problem_type.replace(/_/g, ' ')}
                    </span>
                    <span className="status-chip">
                      {result.severity}
                    </span>
                  </div>
                  <p className="muted-copy mt-2">
                    Confidence: {(result.ai_confidence * 100).toFixed(0)}%
                  </p>
                </div>

                {result.nearby_projects.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Related Infrastructure Projects
                    </span>
                    <div className="mt-3 space-y-2">
                      {result.nearby_projects.map((p) => (
                        <div
                          key={p.id}
                          className="project-row flex items-center justify-between p-3"
                        >
                          <div>
                            <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {p.name}
                            </div>
                            <div className="muted-copy">
                              {p.authority}
                            </div>
                          </div>
                          <span className="text-xs font-bold" style={{ color: 'var(--color-accent-secondary)' }}>
                            {p.distance_m.toFixed(0)}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.coordination_needed && (
                  <div
                    className="project-row p-4 text-sm"
                    style={{
                      backgroundColor: 'var(--color-accent-glow)',
                      border: '1px solid var(--color-border-hover)',
                      color: 'var(--color-accent-secondary)',
                    }}
                  >
                    Coordination opportunity detected. Government dashboard has been notified.
                  </div>
                )}
              </div>
            ) : (
              <div className="analysis-empty">
                <div className="analysis-mark" aria-hidden="true">AI</div>
                <p>
                  Your report’s classification and nearby project context will appear here.
                </p>
              </div>
            )}
          </div>
      </section>
    </Layout>
  )
}