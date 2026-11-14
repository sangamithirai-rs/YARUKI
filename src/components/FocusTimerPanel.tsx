import { useState, type FormEvent } from 'react'
import {
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  cancelFocusTimer,
  formatClock,
  pauseFocusTimer,
  resumeFocusTimer,
  startFocusTimer,
  useFocusTimer,
} from '../lib/focusTimer'
import { addStudySession } from '../services/SessionService'
import type { StudySession } from '../services/SessionService'
import type { Subject } from '../types/database'
import { dateKeyFromToday } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import { usePreferences } from '../lib/preferences'
import '../focusTimer.css'

const PRESETS = [15, 25, 45, 60]
const MAX_TOPIC_LENGTH = 120

interface FocusTimerPanelProps {
  subjects: Subject[]
  onSaved: (session: StudySession) => void
}

export default function FocusTimerPanel({
  subjects,
  onSaved,
}: FocusTimerPanelProps) {
  const timer = useFocusTimer()

  const [topic, setTopic] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const preferences = usePreferences()
  const [minutes, setMinutes] = useState(String(preferences.focusMinutes))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const subjectName = subjects.find(
    (subject) => subject.id === timer.subjectId
  )?.name

  const elapsedMinutes = Math.round(timer.elapsedMs / 60_000)
  const canSave = timer.status === 'finished' || elapsedMinutes >= 1
  const progress =
    timer.targetMs > 0
      ? Math.min(100, Math.round((timer.elapsedMs / timer.targetMs) * 100))
      : 0

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    const value = Number(minutes)

    if (
      !Number.isInteger(value) ||
      value < MIN_FOCUS_MINUTES ||
      value > MAX_FOCUS_MINUTES
    ) {
      setError(
        `Choose a whole number of minutes between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES}.`
      )
      return
    }

    startFocusTimer({
      minutes: value,
      topic: topic.trim().slice(0, MAX_TOPIC_LENGTH),
      subjectId,
    })
  }

  async function handleSave() {
    // A finished timer logs its full length; stopping early logs the time
    // actually studied (rounded to the nearest minute).
    const logged =
      timer.status === 'finished'
        ? Math.round(timer.targetMs / 60_000)
        : elapsedMinutes

    if (logged < 1) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const created = await addStudySession(
        dateKeyFromToday(0),
        timer.topic || undefined,
        logged,
        timer.subjectId || undefined,
        true
      )

      onSaved(created)
      cancelFocusTimer()
      setNotice(`Saved ${logged} ${logged === 1 ? 'minute' : 'minutes'} of study time. Nice work!`)
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to save this session. Your timer is still here, so you can try again.')
      )
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    const confirmed =
      elapsedMinutes < 1 ||
      window.confirm('Discard this focus session without saving it?')

    if (confirmed) {
      cancelFocusTimer()
      setError('')
      setNotice('')
    }
  }

  if (timer.status === 'idle') {
    return (
      <section className="focus-panel" aria-label="Focus timer">
        <div className="focus-panel-header">
          <div>
            <p className="page-eyebrow">STAY IN THE ZONE</p>
            <h2>Focus timer</h2>
          </div>
        </div>

        {notice && <p className="focus-notice">{notice}</p>}

        <form className="focus-start-form" onSubmit={handleStart}>
          <div className="form-field">
            <label htmlFor="focus-topic">What will you study?</label>
            <input
              id="focus-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Chapter 4 practice problems"
              maxLength={MAX_TOPIC_LENGTH}
            />
          </div>

          <div className="form-field">
            <label htmlFor="focus-subject">Subject (optional)</label>
            <select
              id="focus-subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="focus-minutes">Length (minutes)</label>
            <input
              id="focus-minutes"
              type="number"
              min={MIN_FOCUS_MINUTES}
              max={MAX_FOCUS_MINUTES}
              step="1"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />

            <div className="assignment-quick-dates">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(String(preset))}
                >
                  {preset} min
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="page-primary-button focus-start">
            ▶ Start focus session
          </button>
        </form>

        {error && <p className="page-error">{error}</p>}
      </section>
    )
  }

  const finished = timer.status === 'finished'

  return (
    <section
      className={`focus-panel focus-panel-active ${
        finished ? 'focus-panel-finished' : ''
      }`}
      aria-label="Focus timer"
    >
      <div className="focus-panel-header">
        <div>
          <p className="page-eyebrow">
            {finished
              ? "TIME'S UP"
              : timer.status === 'paused'
                ? 'PAUSED'
                : 'FOCUSING'}
          </p>
          <h2>{timer.topic || 'Focus session'}</h2>
          {subjectName && <p className="focus-subject">{subjectName}</p>}
        </div>
      </div>

      <p className="focus-clock" role="timer" aria-live="off">
        {finished ? '00:00' : formatClock(timer.remainingMs)}
      </p>

      <div className="focus-progress" aria-hidden="true">
        <span style={{ width: `${finished ? 100 : progress}%` }} />
      </div>

      <p className="focus-hint">
        {finished
          ? `Great work. You focused for ${Math.round(timer.targetMs / 60_000)} minutes.`
          : `${elapsedMinutes} of ${Math.round(timer.targetMs / 60_000)} min done. You can leave this page; the timer keeps running.`}
      </p>

      {error && <p className="page-error">{error}</p>}

      <div className="focus-actions">
        {!finished &&
          (timer.status === 'paused' ? (
            <button
              type="button"
              className="page-primary-button"
              onClick={resumeFocusTimer}
            >
              ▶ Resume
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              onClick={pauseFocusTimer}
            >
              ⏸ Pause
            </button>
          ))}

        <button
          type="button"
          className={finished ? 'page-primary-button' : 'secondary-button'}
          onClick={handleSave}
          disabled={saving || !canSave}
          title={
            canSave
              ? undefined
              : 'Study for at least a minute to save this session'
          }
        >
          {saving
            ? 'Saving…'
            : finished
              ? `Save ${Math.round(timer.targetMs / 60_000)}-minute session`
              : 'Finish & save'}
        </button>

        <button
          type="button"
          className="secondary-button focus-discard"
          onClick={handleDiscard}
          disabled={saving}
        >
          Discard
        </button>
      </div>
    </section>
  )
}
