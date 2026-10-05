// src/App.tsx
import { useState } from 'react'
import PublicPage from './pages/PublicPage'
import GovernmentPage from './pages/GovernmentPage'
import { LanguageProvider } from './contexts/LanguageProvider'

export default function App() {
  const [view, setView] = useState<'public' | 'government'>('public')

  return (
    <LanguageProvider>
      {view === 'public' ? (
        <PublicPage activeTab={view} onTabChange={setView} />
      ) : (
        <GovernmentPage activeTab={view} onTabChange={setView} />
      )}
    </LanguageProvider>
  )
}