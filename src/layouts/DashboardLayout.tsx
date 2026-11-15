import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { setPageTitle } from '../lib/pageTitle'
import Sidebar from '../components/Sidebar'
import FocusTimerChip from '../components/FocusTimerChip'
import ErrorBoundary from '../components/ErrorBoundary'
import OfflineBanner from '../components/OfflineBanner'
import ConfirmHost from '../components/ConfirmHost'

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
  const contentRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const isFirstRender = useRef(true)

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function handleNavigate(item: string) {
    onNavigate(item)
    setMobileMenuOpen(false)
  }

  // Closing the menu by itself (not by choosing a page) puts focus back on
  // the button that opened it.
  function closeMenu() {
    setMobileMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  // The browser tab shows which page you are on
  useEffect(() => {
    setPageTitle(activeItem)

    return () => setPageTitle('')
  }, [activeItem])

  // A new page starts at the top, and keyboard / screen-reader focus moves to
  // it, instead of staying on the sidebar button that was just pressed.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    window.scrollTo({ top: 0 })
    contentRef.current?.focus({ preventScroll: true })
  }, [activeItem])

  // Phone menu: Escape closes it, the page behind does not scroll, and focus
  // moves into the menu.
  useEffect(() => {
    if (!mobileMenuOpen) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document
      .querySelector<HTMLElement>('.mobile-sidebar-close')
      ?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

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
      <button
        type="button"
        className="skip-link"
        onClick={() => contentRef.current?.focus()}
      >
        Skip to main content
      </button>

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      <Sidebar
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        onClose={closeMenu}
      />

      <div className="dashboard-content" ref={contentRef} tabIndex={-1}>
        <OfflineBanner />

        <div className="mobile-topbar">
          <button
            ref={menuButtonRef}
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

        <ErrorBoundary resetKey={activeItem}>
          <Suspense
            fallback={
              <p className="page-loading" role="status">
                Loading…
              </p>
            }
          >
            {renderPage()}
          </Suspense>
        </ErrorBoundary>
      </div>

      <FocusTimerChip
        hidden={activeItem === 'Study Planner'}
        onOpen={() => handleNavigate('Study Planner')}
      />

      <ConfirmHost />
    </div>
  )
}

export default DashboardLayout
