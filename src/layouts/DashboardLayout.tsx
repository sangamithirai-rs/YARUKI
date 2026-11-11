import { lazy, Suspense, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const SubjectsPage = lazy(() => import('../pages/SubjectsPage'))
const MarksPage = lazy(() => import('../pages/MarksPage'))
const ExamsPage = lazy(() => import('../pages/ExamsPage'))
const AssignmentsPage = lazy(() => import('../pages/AssignmentsPage'))
const StudyPlannerPage = lazy(() => import('../pages/StudyPlannerPage'))
const MaterialsPage = lazy(() => import('../pages/MaterialsPage'))
const AIAssistantPage = lazy(() => import('../pages/AIAssistantPage'))
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

interface DashboardLayoutProps {
  children: React.ReactNode
  email?: string
  activeItem: string
  onNavigate: (item: string) => void
}

function DashboardLayout({
  children,
  activeItem,
  onNavigate,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function handleNavigate(item: string) {
    onNavigate(item)
    setMobileMenuOpen(false)
  }

  function renderPage() {
    switch (activeItem) {
      case 'Subjects':
        return <SubjectsPage />

      case 'Marks':
        return <MarksPage />

      case 'Exams':
        return <ExamsPage />

      case 'Assignments':
        return <AssignmentsPage />

      case 'Study Planner':
        return <StudyPlannerPage />

      case 'Materials':
        return <MaterialsPage />

      case 'AI Assistant':
        return <AIAssistantPage />

      case 'Analytics':
        return <AnalyticsPage />

      case 'Settings':
        return <SettingsPage />

      case 'Dashboard':
      default:
        return children
    }
  }

  return (
    <div className="dashboard-shell">
      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="dashboard-content">
        <div className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className="mobile-brand">
            <span className="brand-mark">Y</span>
            <span>YARUKI</span>
          </div>
        </div>

        <Suspense
          fallback={<p className="page-loading">Loading…</p>}
        >
          {renderPage()}
        </Suspense>
      </div>
    </div>
  )
}

export default DashboardLayout