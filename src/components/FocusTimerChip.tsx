import { useEffect } from 'react'
import { formatClock, useFocusTimer } from '../lib/focusTimer'
import '../focusTimer.css'

const ALERTED_KEY = 'yaruki.focusTimer.alerted'

// A short three-note chime. Browsers may block sound until you have
// interacted with the page; in that case it simply stays silent.
function playChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!AudioContextClass) return

    const context = new AudioContextClass()

    ;[660, 880, 990].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + index * 0.28

      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.27)
    })

    window.setTimeout(() => void context.close(), 1500)
  } catch {
    // sound is optional
  }
}

interface FocusTimerChipProps {
  hidden?: boolean
  onOpen: () => void
}

// Always mounted in the app layout, so the countdown stays visible (and the
// end-of-session chime still plays) on every page.
export default function FocusTimerChip({
  hidden = false,
  onOpen,
}: FocusTimerChipProps) {
  const timer = useFocusTimer()
  const clock = formatClock(timer.remainingMs)
  const finished = timer.status === 'finished'
  const active = timer.status !== 'idle'

  // Show the countdown in the browser tab title
  useEffect(() => {
    if (!active) return

    const original = document.title

    document.title = finished
      ? "⏱ Time's up · YARUKI"
      : `⏱ ${clock} · YARUKI`

    return () => {
      document.title = original
    }
  }, [active, finished, clock])

  // Chime once when a session ends
  useEffect(() => {
    if (!finished || timer.endsAt === null) return

    const marker = String(timer.endsAt)

    try {
      if (window.sessionStorage.getItem(ALERTED_KEY) === marker) return

      window.sessionStorage.setItem(ALERTED_KEY, marker)
    } catch {
      // if storage is blocked the chime may repeat after a refresh; harmless
    }

    playChime()
  }, [finished, timer.endsAt])

  if (!active || hidden) {
    return null
  }

  return (
    <button
      type="button"
      className={`focus-chip ${finished ? 'focus-chip-finished' : ''} ${
        timer.status === 'paused' ? 'focus-chip-paused' : ''
      }`}
      onClick={onOpen}
      aria-label={
        finished
          ? 'Focus session finished. Open the study planner to save it.'
          : `Focus timer ${clock}${
              timer.status === 'paused' ? ' (paused)' : ''
            }. Open the study planner.`
      }
    >
      <span className="focus-chip-clock">
        {finished ? "Time's up" : clock}
      </span>

      <span className="focus-chip-label">
        {finished
          ? 'Tap to save'
          : timer.status === 'paused'
            ? 'Paused'
            : timer.topic || 'Focus session'}
      </span>
    </button>
  )
}
