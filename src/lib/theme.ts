import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

// "theme" is the key the original toggle already used ("dark" / "light"),
// so people who picked dark before keep their choice.
const STORAGE_KEY = 'theme'

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function prefersDark(): boolean {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

export function getThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)

    if (value === 'dark' || value === 'system') {
      return value
    }
  } catch {
    // storage blocked: fall back to light
  }

  return 'light'
}

export function applyTheme(preference: ThemePreference = getThemePreference()) {
  const dark =
    preference === 'dark' || (preference === 'system' && prefersDark())

  document.documentElement.classList.toggle('theme-dark', dark)
}

export function setThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // the theme still changes for this visit
  }

  applyTheme(preference)
  notify()
}

// Light <-> dark switch used by the header button
export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('theme-dark')

  setThemePreference(isDark ? 'light' : 'dark')
}

// Call once at start-up, before the app renders, so there is no flash
export function initTheme() {
  applyTheme()

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.(
    'change',
    () => {
      if (getThemePreference() === 'system') {
        applyTheme('system')
      }
    }
  )

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      applyTheme()
      notify()
    }
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, () => 'light')
}
