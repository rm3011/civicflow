import { useEffect, useState, useCallback } from 'react'
import { listComplaints, listProjects, listConflicts, type Complaint, type Conflict } from '../lib/api'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'

interface GovernmentPageProps {
  activeTab: 'public' | 'government'
  onTabChange: (tab: 'public' | 'government') => void
}

export default function GovernmentPage({ activeTab, onTabChange }: GovernmentPageProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [projectCount, setProjectCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [c, p, cf] = await Promise.all([listComplaints(), listProjects(), listConflicts()])
      setComplaints(c)
      setProjectCount(p.length)
      setConflicts(cf.conflicts)
    } catch (error) {
      console.error('Failed to load data', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) await load()
    }
    run()
    const interval = setInterval(run, 10000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [load])

  if (loading) {
    return (
      <Layout activeTab={activeTab} onTabChange={onTabChange}>
        <div className="loading-state">
          Loading city intelligence...
        </div>
      </Layout>
    )
  }

  return (
    <Layout activeTab={activeTab} onTabChange={onTabChange}>
      <section className="content-shell dashboard-shell">
        <div className="dashboard-heading">
          <div>
            <div className="panel-kicker">CivicFlow operations</div>
            <h1 className="dashboard-title">City infrastructure</h1>
          </div>
          <div className="live-indicator">Live command center</div>
        </div>

        <div className="stats-grid">
          <StatCard label="Active Complaints" value={complaints.length} />
          <StatCard label="Infrastructure Projects" value={projectCount} />
          <StatCard label="Project Conflicts" value={conflicts.length} accent={conflicts.length > 0} />
          <StatCard
            label="Coordination Alerts"
            value={complaints.filter((c) => c.severity === 'high').length}
            accent
          />
        </div>

        <div className="dashboard-grid">
          <div className="data-panel">
            <div className="data-panel-header">
              <h2 className="data-panel-title">Project conflicts</h2>
            </div>
            <div className="data-panel-body">
              {conflicts.length === 0 ? (
                <div className="data-row muted-copy">
                  No conflicts detected.
                </div>
              ) : (
                conflicts.map((c, i) => (
                  <div key={i} className="data-row">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {c.project_a_name} + {c.project_b_name}
                      </span>
                      <span className="status-chip" style={{ color: 'var(--color-critical)', borderColor: 'rgba(184, 61, 54, .2)', background: 'rgba(184, 61, 54, .08)' }}>
                        {c.distance_m.toFixed(0)}m
                      </span>
                    </div>
                    <div className="muted-copy">
                      {c.authority_a} / {c.authority_b}
                    </div>
                    <div className="muted-copy mt-1" style={{ color: 'var(--color-accent-secondary)' }}>
                      Overlap: {c.start_date} to {c.end_date}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="data-panel">
            <div className="data-panel-header">
              <h2 className="data-panel-title">Recent complaints</h2>
            </div>
            <div className="data-panel-body max-h-125 overflow-y-auto">
              {complaints.length === 0 ? (
                <div className="data-row muted-copy">
                  No complaints yet.
                </div>
              ) : (
                complaints.map((c) => (
                  <div key={c.id} className="data-row">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {c.description.slice(0, 80)}
                        {c.description.length > 80 ? '...' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className="status-chip"
                        style={{
                          background: c.severity === 'high' ? 'rgba(184, 61, 54, .08)' : undefined,
                          borderColor: c.severity === 'high' ? 'rgba(184, 61, 54, .2)' : undefined,
                          color: c.severity === 'high' ? 'var(--color-critical)' : undefined,
                        }}
                      >
                        {c.problem_type.replace(/_/g, ' ')}
                      </span>
                      <span className="muted-copy">
                        {c.severity}
                      </span>
                      <span className="muted-copy">
                        {(c.ai_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}