import { useState } from 'react'
import PublicPage from './pages/PublicPage'
import GovernmentPage from './pages/GovernmentPage'

export default function App() {
  const [view, setView] = useState<'public' | 'government'>('public')

  return view === 'public' ? (
    <PublicPage activeTab={view} onTabChange={setView} />
  ) : (
    <GovernmentPage activeTab={view} onTabChange={setView} />
  )
}