import { useCallback, useEffect, useState } from 'react'

export const PAGES = [
  'Dashboard',
  'Subjects',
  'Marks',
  'Exams',
  'Assignments',
  'Study Planner',
  'Materials',
  'Analytics',
  'AI Assistant',
  'Settings',
] as const

function toSlug(page: string): string {
  return page.toLowerCase().replace(/\s+/g, '-')
}

function readPage(): string {
  const slug = window.location.hash.replace(/^#\/?/, '')

  return PAGES.find((page) => toSlug(page) === slug) ?? 'Dashboard'
}

// Keeps the active page in the URL hash (e.g. #marks) so refresh,
// the back button and bookmarks all work.
export function useHashNavigation() {
  const [page, setPage] = useState(readPage)

  useEffect(() => {
    function handleHashChange() {
      setPage(readPage())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const navigate = useCallback((nextPage: string) => {
    window.location.hash = toSlug(nextPage)
  }, [])

  return [page, navigate] as const
}
