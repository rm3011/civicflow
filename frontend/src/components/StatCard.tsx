interface StatCardProps {
  label: string
  value: string | number
  accent?: boolean
}

export default function StatCard({ label, value, accent = false }: StatCardProps) {
  return (
    <div className="stat-card" data-accent={accent}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
      </div>
    </div>
  )
}