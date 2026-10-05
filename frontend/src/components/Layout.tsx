import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, ChevronDown } from 'lucide-react'
import BrandMark from './BrandMark'
import { useLanguage } from '../hooks/useLanguage'
import { cn } from '../lib/utils'
import type { Language } from '../lib/constants'

interface LayoutProps {
  children: ReactNode
  activeTab: 'public' | 'government'
  onTabChange: (tab: 'public' | 'government') => void
}

const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
]

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { lang, setLang, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)

  const navItems: { key: 'public' | 'government'; label: string }[] = [
    { key: 'public', label: t('nav.public') },
    { key: 'government', label: t('nav.government') },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <button
            onClick={() => onTabChange('public')}
            className="flex items-center gap-3 shrink-0"
            aria-label={t('brand.name')}
          >
            <BrandMark size={36} />
            <div className="hidden sm:block text-left">
              <div className="text-[15px] font-semibold leading-none tracking-tight text-ink-900">
                {t('brand.name')}
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
                {t('brand.tagline')}
              </div>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav
            aria-label="Main navigation"
            className="hidden w-72 grid-cols-2 items-center gap-1 rounded-full border border-border bg-surface-elevated p-1 md:grid"
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={cn(
                  'relative flex min-h-10 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors active:scale-[0.98]',
                  activeTab === item.key
                    ? 'text-white'
                    : 'text-ink-700 hover:text-ink-900'
                )}
                aria-current={activeTab === item.key ? 'page' : undefined}
                type="button"
              >
                {activeTab === item.key && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-brand-900"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                onBlur={() => setTimeout(() => setLangOpen(false), 150)}
                className="flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-ink-700 transition-colors hover:border-border-strong active:scale-[0.98]"
                aria-label="Change language"
                aria-expanded={langOpen}
              >
                <Globe className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{LANGUAGES.find((l) => l.code === lang)?.short}</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', langOpen && 'rotate-180')} strokeWidth={2.5} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setLang(l.code)
                          setLangOpen(false)
                        }}
                        className={cn(
                          'flex min-h-11 w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors',
                          lang === l.code
                            ? 'bg-brand-100 text-brand-700 font-semibold'
                            : 'text-ink-700 hover:bg-surface-elevated'
                        )}
                      >
                        <span>{l.label}</span>
                        <span className="text-[10px] font-bold tracking-wider text-ink-400">
                          {l.short}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="mx-4 mb-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-surface-elevated p-1 md:hidden"
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                'relative flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors active:scale-[0.98]',
                activeTab === item.key
                  ? 'text-white'
                  : 'text-ink-700 hover:text-ink-900'
              )}
              aria-current={activeTab === item.key ? 'page' : undefined}
              type="button"
            >
              {activeTab === item.key && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 rounded-full bg-brand-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t border-border bg-surface sm:mt-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark size={24} />
            <span className="font-medium">
              {t('brand.name')} · {t('brand.tagline')}
            </span>
          </div>
          <span className="text-ink-400">
            {t('footer.disclaimer')}
          </span>
        </div>
      </footer>
    </div>
  )
}