import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import SubjectsPage from '../pages/SubjectsPage'
import MarksPage from '../pages/MarksPage'
import ExamsPage from '../pages/ExamsPage'
import AssignmentsPage from '../pages/AssignmentsPage'
import StudyPlannerPage from '../pages/StudyPlannerPage'
import MaterialsPage from '../pages/MaterialsPage'
import AIAssistantPage from '../pages/AIAssistantPage'
import AnalyticsPage from '../pages/AnalyticsPage'
import SettingsPage from '../pages/SettingsPage'

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

        {renderPage()}
      </div>
    </div>
  )
}

export default DashboardLayout