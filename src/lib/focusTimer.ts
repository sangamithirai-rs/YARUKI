import { useSyncExternalStore } from 'react'

// A study countdown that lives outside any page. Its state is kept in
// localStorage, so it keeps running when you switch pages, refresh, or
// reopen the tab. Remaining time is always worked out from a fixed end
// time, so it stays accurate even if the browser slows the tab down.

const STORAGE_KEY = 'yaruki.focusTimer.v1'

export const MIN_FOCUS_MINUTES = 1
export const MAX_FOCUS_MINUTES = 240

export type TimerState =
  | { status: 'idle' }
  | {
      status: 'running'
      endsAt: number
      targetMs: number
      topic: string
      subjectId: string
    }
  | {
      status: 'paused'
      remainingMs: number
      targetMs: number
      topic: string
      subjectId: string
    }

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

const IDLE: TimerState = { status: 'idle' }

const listeners = new Set<() => void>()

let memoryRaw: string | null = null
let cachedRaw: string | null | undefined
let cachedState: TimerState = IDLE

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked (private mode); fall back to memory
    return memoryRaw
  }
}

function writeRaw(raw: string | null) {
  memoryRaw = raw

  try {
    if (raw === null) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, raw)
    }
  } catch {
    // keep the in-memory copy
  }

  listeners.forEach((listener) => listener())
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseState(raw: string | null): TimerState {
  if (!raw) return IDLE

  try {
    const value = JSON.parse(raw) as Record<string, unknown>

    if (
      !isFiniteNumber(value.targetMs) ||
      typeof value.topic !== 'string' ||
      typeof value.subjectId !== 'string'
    ) {
      return IDLE
    }

    if (value.status === 'running' && isFiniteNumber(value.endsAt)) {
      return {
        status: 'running',
        endsAt: value.endsAt,
        targetMs: value.targetMs,
        topic: value.topic,
        subjectId: value.subjectId,
      }
    }

    if (value.status === 'paused' && isFiniteNumber(value.remainingMs)) {
      return {
        status: 'paused',
        remainingMs: value.remainingMs,
        targetMs: value.targetMs,
        topic: value.topic,
        subjectId: value.subjectId,
      }
    }
  } catch {
    // fall through
  }

  return IDLE
}

function getSnapshot(): TimerState {
  const raw = readRaw()

  // Return the same object until the stored value really changes
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedState = parseState(raw)
  }

  return cachedState
}

function getServerSnapshot(): TimerState {
  return IDLE
}

let storageListening = false

function handleStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    listeners.forEach((listener) => listener())
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  if (!storageListening) {
    window.addEventListener('storage', handleStorage)
    storageListening = true
  }

  return () => {
    listeners.delete(listener)
  }
}

// Once-a-second heartbeat, only while a timer is actually running
function subscribeTick(listener: () => void) {
  const id = window.setInterval(listener, 1000)

  return () => window.clearInterval(id)
}

function getTickSnapshot(): number {
  return getSnapshot().status === 'running'
    ? Math.floor(Date.now() / 1000)
    : 0
}

function setState(next: TimerState) {
  writeRaw(next.status === 'idle' ? null : JSON.stringify(next))
}

// ---- actions ---------------------------------------------------------------

export function startFocusTimer(options: {
  minutes: number
  topic: string
  subjectId: string
}) {
  const minutes = Math.min(
    MAX_FOCUS_MINUTES,
    Math.max(MIN_FOCUS_MINUTES, Math.round(options.minutes))
  )

  const targetMs = minutes * 60_000

  setState({
    status: 'running',
    endsAt: Date.now() + targetMs,
    targetMs,
    topic: options.topic,
    subjectId: options.subjectId,
  })
}

export function pauseFocusTimer() {
  const state = getSnapshot()

  if (state.status !== 'running') return

  setState({
    status: 'paused',
    remainingMs: Math.max(0, state.endsAt - Date.now()),
    targetMs: state.targetMs,
    topic: state.topic,
    subjectId: state.subjectId,
  })
}

export function resumeFocusTimer() {
  const state = getSnapshot()

  if (state.status !== 'paused') return

  setState({
    status: 'running',
    endsAt: Date.now() + state.remainingMs,
    targetMs: state.targetMs,
    topic: state.topic,
    subjectId: state.subjectId,
  })
}

export function cancelFocusTimer() {
  setState(IDLE)
}

// ---- helpers -----------------------------------------------------------------

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

export function useFocusTimer() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const tick = useSyncExternalStore(subscribeTick, getTickSnapshot, () => 0)

  let remainingMs = 0
  let status: TimerStatus = 'idle'

  if (state.status === 'running') {
    remainingMs = Math.max(0, state.endsAt - tick * 1000)
    status = remainingMs === 0 ? 'finished' : 'running'
  } else if (state.status === 'paused') {
    remainingMs = state.remainingMs
    status = 'paused'
  }

  const targetMs = state.status === 'idle' ? 0 : state.targetMs
  const elapsedMs = state.status === 'idle' ? 0 : targetMs - remainingMs

  return {
    status,
    remainingMs,
    elapsedMs,
    targetMs,
    topic: state.status === 'idle' ? '' : state.topic,
    subjectId: state.status === 'idle' ? '' : state.subjectId,
    endsAt: state.status === 'running' ? state.endsAt : null,
  }
}
