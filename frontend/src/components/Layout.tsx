interface LayoutProps {
  children: React.ReactNode
  activeTab: 'public' | 'government'
  onTabChange: (tab: 'public' | 'government') => void
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true" />
            <span>CIVICFLOW</span>
          </div>

          <nav className="site-nav" aria-label="Workspace">
            <button
              onClick={() => onTabChange('public')}
              className="site-nav-button"
              aria-current={activeTab === 'public' ? 'page' : undefined}
            >
              Public
            </button>
            <button
              onClick={() => onTabChange('government')}
              className="site-nav-button"
              aria-current={activeTab === 'government' ? 'page' : undefined}
            >
              Government
            </button>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>
            CIVICFLOW — Urban Infrastructure Coordination
          </span>
          <span>
            Powered by AI · GIS · Real-time Data
          </span>
        </div>
      </footer>
    </div>
  )
}