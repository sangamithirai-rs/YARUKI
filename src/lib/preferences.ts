import { useSyncExternalStore } from 'react'

// Small personal settings, kept on this device in localStorage.

export type Preferences = {
  weeklyGoalMinutes: number // 0 means "no goal"
  focusMinutes: number
}

export const MAX_WEEKLY_GOAL_MINUTES = 100 * 60
export const MIN_FOCUS_MINUTES = 1
export const MAX_FOCUS_MINUTES = 240

const STORAGE_KEY = 'yaruki.prefs.v1'

const DEFAULTS: Preferences = { weeklyGoalMinutes: 0, focusMinutes: 25 }

const listeners = new Set<() => void>()

let memoryRaw: string | null = null
let cachedRaw: string | null | undefined
let cached: Preferences = DEFAULTS

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return memoryRaw
  }
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback
}

function parse(raw: string | null): Preferences {
  if (!raw) return DEFAULTS

  try {
    const value = JSON.parse(raw) as Record<string, unknown>

    return {
      weeklyGoalMinutes: clamp(
        value.weeklyGoalMinutes,
        0,
        MAX_WEEKLY_GOAL_MINUTES,
        DEFAULTS.weeklyGoalMinutes
      ),
      focusMinutes: clamp(
        value.focusMinutes,
        MIN_FOCUS_MINUTES,
        MAX_FOCUS_MINUTES,
        DEFAULTS.focusMinutes
      ),
    }
  } catch {
    return DEFAULTS
  }
}

export function getPreferences(): Preferences {
  const raw = readRaw()

  // Same object until the stored value changes
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = parse(raw)
  }

  return cached
}

export function setPreferences(update: Partial<Preferences>) {
  const next = parse(JSON.stringify({ ...getPreferences(), ...update }))
  const raw = JSON.stringify(next)

  memoryRaw = raw

  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
  } catch {
    // kept in memory for this visit
  }

  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, () => DEFAULTS)
}
