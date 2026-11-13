import { useEffect, useState, type FormEvent } from 'react'
import {
  addStudyPlan,
  deleteStudyPlan,
  getStudyPlans,
  updateStudyPlan,
  type StudyPlan,
} from '../services/studyPlanService'
import {
  addStudySession,
  deleteStudySession,
  getStudySessions,
  updateStudySession,
  type StudySession,
} from '../services/SessionService'
import { getSubjects } from '../services/subjectService'
import FocusTimerPanel from '../components/FocusTimerPanel'
import type { Subject } from '../types/database'
import { getErrorMessage } from '../lib/errors'
import {
  dateKeyFromToday,
  daysFromToday,
  describeDays,
  formatDuration,
  parseDay,
  toDateKey,
} from '../lib/dates'

const MAX_TITLE_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_MINUTES = 720
const DURATION_PRESETS = [25, 45, 60, 90]
const EARLIER_PAGE_SIZE = 8

type Tab = 'sessions' | 'plans'

type PlanForm = {
  title: string
  planDate: string
  description: string
}

type SessionForm = {
  topic: string
  subjectId: string
  date: string
  minutes: string
  completed: boolean
}

const initialPlanForm: PlanForm = {
  title: '',
  planDate: '',
  description: '',
}

function emptySessionForm(): SessionForm {
  return {
    topic: '',
    subjectId: '',
    date: dateKeyFromToday(0),
    minutes: '',
    completed: false,
  }
}

function formatDay(value: string): string {
  return parseDay(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function StudyPlannerPage() {
  const [tab, setTab] = useState<Tab>('sessions')

  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [planForm, setPlanForm] = useState<PlanForm>(initialPlanForm)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [planError, setPlanError] = useState('')

  const [sessionForm, setSessionForm] =
    useState<SessionForm>(emptySessionForm)
  const [editingSessionId, setEditingSessionId] =
    useState<string | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [deletingSessionId, setDeletingSessionId] =
    useState<string | null>(null)
  const [togglingSessionId, setTogglingSessionId] =
    useState<string | null>(null)
  const [sessionError, setSessionError] = useState('')
  const [showAllEarlier, setShowAllEarlier] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      const [planResult, sessionResult, subjectResult] =
        await Promise.allSettled([
          getStudyPlans(),
          getStudySessions(),
          getSubjects(),
        ])

      if (!isMounted) {
        return
      }

      const failures: string[] = []

      if (planResult.status === 'fulfilled') {
        setPlans(planResult.value)
      } else {
        failures.push('study plans')
        console.error('Unable to load study plans:', planResult.reason)
      }

      if (sessionResult.status === 'fulfilled') {
        setSessions(sessionResult.value)
      } else {
        failures.push('study sessions')
        console.error('Unable to load study sessions:', sessionResult.reason)
      }

      if (subjectResult.status === 'fulfilled') {
        setSubjects(subjectResult.value)
      }

      if (failures.length > 0) {
        setLoadError(
          `Unable to load your ${failures.join(' and ')}. Please refresh and try again.`
        )
      }

      setLoading(false)
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [])

  // ---- derived numbers ---------------------------------------------------

  const today = dateKeyFromToday(0)
  const weekStart = dateKeyFromToday(-6)

  const sessionDay = (session: StudySession) =>
    toDateKey(session.session_date)

  const completedSessions = sessions.filter((session) => session.completed)

  const totalMinutes = completedSessions.reduce(
    (total, session) => total + (session.duration_minutes ?? 0),
    0
  )

  const weekMinutes = completedSessions
    .filter(
      (session) =>
        sessionDay(session) >= weekStart && sessionDay(session) <= today
    )
    .reduce((total, session) => total + (session.duration_minutes ?? 0), 0)

  const todaySessions = sessions
    .filter((session) => sessionDay(session) === today)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const todayDone = todaySessions.filter((session) => session.completed).length

  const upcomingSessions = sessions
    .filter((session) => sessionDay(session) > today)
    .sort((a, b) => sessionDay(a).localeCompare(sessionDay(b)))

  const earlierSessions = sessions
    .filter((session) => sessionDay(session) < today)
    .sort((a, b) => sessionDay(b).localeCompare(sessionDay(a)))

  const visibleEarlier = showAllEarlier
    ? earlierSessions
    : earlierSessions.slice(0, EARLIER_PAGE_SIZE)

  const planDay = (plan: StudyPlan) => toDateKey(plan.plan_date)

  const upcomingPlans = plans.filter((plan) => planDay(plan) >= today)
  const pastPlans = plans
    .filter((plan) => planDay(plan) < today)
    .sort((a, b) => planDay(b).localeCompare(planDay(a)))

  function getSubjectName(id: string | null): string | null {
    if (!id) return null

    return subjects.find((subject) => subject.id === id)?.name ?? null
  }

  // ---- sessions ----------------------------------------------------------

  function resetSessionForm() {
    setSessionForm(emptySessionForm())
    setEditingSessionId(null)
    setSessionError('')
  }

  function handleEditSession(session: StudySession) {
    setEditingSessionId(session.id)
    setSessionForm({
      topic: session.topic ?? '',
      subjectId: session.subject_id ?? '',
      date: sessionDay(session),
      minutes:
        session.duration_minutes !== null
          ? String(session.duration_minutes)
          : '',
      completed: session.completed,
    })
    setSessionError('')
    setTab('sessions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSessionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSessionError('')

    const topic = sessionForm.topic.trim()

    if (!sessionForm.date) {
      setSessionError('Please choose a date for this session.')
      return
    }

    if (topic.length > MAX_TITLE_LENGTH) {
      setSessionError(`Topic must be ${MAX_TITLE_LENGTH} characters or fewer.`)
      return
    }

    let minutes: number | undefined

    if (sessionForm.minutes.trim() !== '') {
      minutes = Number(sessionForm.minutes)

      if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > MAX_MINUTES
      ) {
        setSessionError(
          `Duration must be a whole number of minutes between 1 and ${MAX_MINUTES}.`
        )
        return
      }
    }

    try {
      setSavingSession(true)

      if (editingSessionId) {
        const updated = await updateStudySession(editingSessionId, {
          topic: topic || null,
          duration_minutes: minutes ?? null,
          session_date: sessionForm.date,
          subject_id: sessionForm.subjectId || null,
          completed: sessionForm.completed,
        })

        setSessions((current) =>
          current.map((session) =>
            session.id === updated.id ? updated : session
          )
        )
      } else {
        const created = await addStudySession(
          sessionForm.date,
          topic || undefined,
          minutes,
          sessionForm.subjectId || undefined,
          sessionForm.completed
        )

        setSessions((current) => [...current, created])
      }

      resetSessionForm()
    } catch (err) {
      setSessionError(getErrorMessage(err, 'Unable to save this session.'))
    } finally {
      setSavingSession(false)
    }
  }

  async function handleToggleSession(session: StudySession) {
    try {
      setTogglingSessionId(session.id)
      setSessionError('')

      const updated = await updateStudySession(session.id, {
        completed: !session.completed,
      })

      setSessions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      )
    } catch (err) {
      setSessionError(getErrorMessage(err, 'Unable to update this session.'))
    } finally {
      setTogglingSessionId(null)
    }
  }

  async function handleDeleteSession(session: StudySession) {
    const confirmed = window.confirm(
      `Delete the study session "${session.topic || 'Study session'}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingSessionId(session.id)
      setSessionError('')

      await deleteStudySession(session.id)

      setSessions((current) =>
        current.filter((item) => item.id !== session.id)
      )

      if (editingSessionId === session.id) {
        resetSessionForm()
      }
    } catch (err) {
      setSessionError(getErrorMessage(err, 'Unable to delete this session.'))
    } finally {
      setDeletingSessionId(null)
    }
  }

  function startSessionFromPlan(plan: StudyPlan) {
    setSessionForm({
      topic: plan.title.slice(0, MAX_TITLE_LENGTH),
      subjectId: '',
      date: planDay(plan),
      minutes: '',
      completed: false,
    })
    setEditingSessionId(null)
    setSessionError('')
    setTab('sessions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---- plans -------------------------------------------------------------

  function resetPlanForm() {
    setPlanForm(initialPlanForm)
    setEditingPlanId(null)
    setPlanError('')
  }

  function handleEditPlan(plan: StudyPlan) {
    setEditingPlanId(plan.id)
    setPlanForm({
      title: plan.title,
      planDate: planDay(plan),
      description: plan.description ?? '',
    })
    setPlanError('')
    setTab('plans')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = planForm.title.trim()
    const description = planForm.description.trim()

    if (!title || !planForm.planDate) {
      setPlanError('Please enter a title and choose a date.')
      return
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setPlanError(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
      )
      return
    }

    try {
      setSavingPlan(true)
      setPlanError('')

      if (editingPlanId) {
        const updatedPlan = await updateStudyPlan(editingPlanId, {
          title,
          plan_date: planForm.planDate,
          description: description || null,
        })

        setPlans((current) =>
          current.map((plan) =>
            plan.id === editingPlanId ? updatedPlan : plan
          )
        )
      } else {
        const newPlan = await addStudyPlan(
          title,
          planForm.planDate,
          description || undefined
        )

        setPlans((current) => [...current, newPlan])
      }

      resetPlanForm()
    } catch (err) {
      setPlanError(getErrorMessage(err, 'Unable to save this study plan.'))
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleDeletePlan(plan: StudyPlan) {
    const confirmed = window.confirm(
      `Delete the study plan "${plan.title}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingPlanId(plan.id)
      setPlanError('')

      await deleteStudyPlan(plan.id)

      setPlans((current) => current.filter((item) => item.id !== plan.id))

      if (editingPlanId === plan.id) {
        resetPlanForm()
      }
    } catch (err) {
      setPlanError(getErrorMessage(err, 'Unable to delete this study plan.'))
    } finally {
      setDeletingPlanId(null)
    }
  }

  // ---- rendering helpers ---------------------------------------------------

  function renderSessionRow(session: StudySession) {
    const subjectName = getSubjectName(session.subject_id)

    return (
      <article
        key={session.id}
        className={`study-session-row ${
          session.completed ? 'study-session-done' : ''
        }`}
      >
        <div className="study-session-main">
          <h3>{session.topic || 'Study session'}</h3>

          <p>
            {subjectName ? `${subjectName} · ` : ''}
            {formatDay(session.session_date)}
          </p>
        </div>

        <div className="study-session-meta">
          {session.duration_minutes ? (
            <span className="study-session-duration">
              {formatDuration(session.duration_minutes)}
            </span>
          ) : null}

          <span
            className={`study-session-status ${
              session.completed ? 'done' : ''
            }`}
          >
            {session.completed ? 'Completed' : 'Planned'}
          </span>
        </div>

        <div className="study-session-actions">
          <button
            type="button"
            className={
              session.completed ? 'reopen-action' : 'complete-action'
            }
            onClick={() => handleToggleSession(session)}
            disabled={togglingSessionId === session.id}
          >
            {togglingSessionId === session.id
              ? 'Updating...'
              : session.completed
                ? '↺ Reopen'
                : '✓ Mark done'}
          </button>

          <button type="button" onClick={() => handleEditSession(session)}>
            Edit
          </button>

          <button
            type="button"
            className="delete-action"
            onClick={() => handleDeleteSession(session)}
            disabled={deletingSessionId === session.id}
          >
            {deletingSessionId === session.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </article>
    )
  }

  function renderSessionGroup(
    label: string,
    items: StudySession[],
    footer?: React.ReactNode
  ) {
    if (items.length === 0) {
      return null
    }

    return (
      <div className="assignment-group">
        <h3 className="assignment-group-title">
          {label} <span>{items.length}</span>
        </h3>

        <div className="study-sessions-list">
          {items.map(renderSessionRow)}
        </div>

        {footer}
      </div>
    )
  }

  function renderPlanCard(plan: StudyPlan) {
    const days = daysFromToday(plan.plan_date)

    return (
      <article className="study-plan-card" key={plan.id}>
        <div className="study-plan-card-top">
          <div className="study-plan-date">
            <span className="study-plan-date-label">Study date</span>
            <strong>{formatDay(plan.plan_date)}</strong>
          </div>

          <div className="study-plan-badges">
            {days === 0 || days === 1 ? (
              <span className="study-plan-when-badge">
                {describeDays(days)}
              </span>
            ) : null}

            {plan.ai_generated && (
              <span className="study-plan-ai-badge">AI generated</span>
            )}
          </div>
        </div>

        <div className="study-plan-card-content">
          <h3>{plan.title}</h3>

          {plan.description ? (
            <p>{plan.description}</p>
          ) : (
            <p className="study-plan-no-description">
              No description added.
            </p>
          )}
        </div>

        <div className="study-plan-card-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => startSessionFromPlan(plan)}
          >
            Log session
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => handleEditPlan(plan)}
          >
            Edit
          </button>

          <button
            type="button"
            className="secondary-button study-plan-delete-button"
            onClick={() => handleDeletePlan(plan)}
            disabled={deletingPlanId === plan.id}
          >
            {deletingPlanId === plan.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </article>
    )
  }

  const planDateDays = planForm.planDate
    ? daysFromToday(planForm.planDate)
    : null

  return (
    <main className="page-main study-planner-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">PLAN WITH PURPOSE</p>
          <h1>Study Planner</h1>
          <p className="page-subtitle">
            Log your study sessions and plan what to work on next.
          </p>
        </div>
      </header>

      {loadError && <div className="page-error">{loadError}</div>}

      <section className="study-planner-overview study-planner-overview-4">
        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">
            Studied this week
          </span>
          <strong>{loading ? '—' : formatDuration(weekMinutes)}</strong>
          <span className="study-planner-summary-note">
            Completed sessions, last 7 days
          </span>
        </article>

        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">Today</span>
          <strong>
            {loading ? '—' : `${todayDone}/${todaySessions.length}`}
          </strong>
          <span className="study-planner-summary-note">
            Sessions completed today
          </span>
        </article>

        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">Upcoming plans</span>
          <strong>{loading ? '—' : upcomingPlans.length}</strong>
          <span className="study-planner-summary-note">
            Plans for today and later
          </span>
        </article>

        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">Total studied</span>
          <strong>{loading ? '—' : formatDuration(totalMinutes)}</strong>
          <span className="study-planner-summary-note">
            All completed sessions
          </span>
        </article>
      </section>

      <div className="study-tabs" role="tablist" aria-label="Study planner">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sessions'}
          className={tab === 'sessions' ? 'active' : ''}
          onClick={() => setTab('sessions')}
        >
          Study sessions ({sessions.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plans'}
          className={tab === 'plans' ? 'active' : ''}
          onClick={() => setTab('plans')}
        >
          Study plans ({plans.length})
        </button>
      </div>

      {tab === 'sessions' ? (
        <>
          <FocusTimerPanel
            subjects={subjects}
            onSaved={(created) =>
              setSessions((current) => [...current, created])
            }
          />

          <section className="subject-form-card study-planner-form-card">
            <div className="subject-form-header">
              <div>
                <p className="page-eyebrow">
                  {editingSessionId ? 'UPDATE SESSION' : 'LOG YOUR STUDY TIME'}
                </p>
                <h2>
                  {editingSessionId
                    ? 'Edit study session'
                    : 'Add a study session'}
                </h2>
              </div>
            </div>

            <form className="subject-form" onSubmit={handleSessionSubmit}>
              <div className="study-planner-form-grid">
                <div className="form-field">
                  <label htmlFor="session-topic">Topic (optional)</label>
                  <input
                    id="session-topic"
                    type="text"
                    value={sessionForm.topic}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        topic: event.target.value,
                      }))
                    }
                    placeholder="e.g. Normalization practice problems"
                    maxLength={MAX_TITLE_LENGTH}
                    disabled={savingSession}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="session-subject">Subject (optional)</label>
                  <select
                    id="session-subject"
                    value={sessionForm.subjectId}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        subjectId: event.target.value,
                      }))
                    }
                    disabled={savingSession}
                  >
                    <option value="">No subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.code ? ` (${subject.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="session-date">Date</label>
                  <input
                    id="session-date"
                    type="date"
                    value={sessionForm.date}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    disabled={savingSession}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="session-minutes">Duration (minutes)</label>
                  <input
                    id="session-minutes"
                    type="number"
                    min="1"
                    max={MAX_MINUTES}
                    step="1"
                    value={sessionForm.minutes}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        minutes: event.target.value,
                      }))
                    }
                    placeholder="e.g. 45"
                    disabled={savingSession}
                  />

                  <div className="assignment-quick-dates">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setSessionForm((current) => ({
                            ...current,
                            minutes: String(preset),
                          }))
                        }
                        disabled={savingSession}
                      >
                        {formatDuration(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field study-planner-description-field">
                  <label
                    className="assignment-completed-field"
                    htmlFor="session-completed"
                  >
                    <input
                      id="session-completed"
                      type="checkbox"
                      checked={sessionForm.completed}
                      onChange={(event) =>
                        setSessionForm((current) => ({
                          ...current,
                          completed: event.target.checked,
                        }))
                      }
                      disabled={savingSession}
                    />
                    <span>I have completed this session</span>
                  </label>

                  {sessionForm.completed &&
                    sessionForm.minutes.trim() === '' && (
                      <p className="assignment-date-hint">
                        Add a duration so this session counts toward your
                        study time.
                      </p>
                    )}
                </div>
              </div>

              {sessionError && <p className="page-error">{sessionError}</p>}

              <div className="subject-form-actions">
                {editingSessionId && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetSessionForm}
                    disabled={savingSession}
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  className="page-primary-button"
                  disabled={savingSession}
                >
                  {savingSession
                    ? 'Saving…'
                    : editingSessionId
                      ? 'Save changes'
                      : 'Add session'}
                </button>
              </div>
            </form>
          </section>

          {loading ? (
            <div className="study-planner-state-card">
              <span className="state-spinner" />
              <p>Loading your study sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="study-planner-state-card">
              <h3>No study sessions yet</h3>
              <p>
                Log your first session above. Completed sessions feed the
                study time on your Dashboard and Analytics.
              </p>
            </div>
          ) : (
            <section className="study-planner-section">
              {renderSessionGroup('Today', todaySessions)}
              {renderSessionGroup('Upcoming', upcomingSessions)}
              {renderSessionGroup(
                'Earlier',
                visibleEarlier,
                earlierSessions.length > EARLIER_PAGE_SIZE ? (
                  <button
                    type="button"
                    className="secondary-button study-show-more"
                    onClick={() => setShowAllEarlier((value) => !value)}
                  >
                    {showAllEarlier
                      ? 'Show fewer'
                      : `Show all ${earlierSessions.length}`}
                  </button>
                ) : null
              )}
            </section>
          )}
        </>
      ) : (
        <>
          <section className="subject-form-card study-planner-form-card">
            <div className="subject-form-header">
              <div>
                <p className="page-eyebrow">
                  {editingPlanId ? 'UPDATE YOUR PLAN' : 'MAKE A PLAN'}
                </p>
                <h2>
                  {editingPlanId ? 'Edit study plan' : 'Create a study plan'}
                </h2>
              </div>
            </div>

            <form className="subject-form" onSubmit={handlePlanSubmit}>
              <div className="study-planner-form-grid">
                <div className="form-field">
                  <label htmlFor="study-plan-title">Plan title</label>
                  <input
                    id="study-plan-title"
                    type="text"
                    value={planForm.title}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="e.g. Revise Biology chapter 3"
                    maxLength={MAX_TITLE_LENGTH}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="study-plan-date">Study date</label>
                  <input
                    id="study-plan-date"
                    type="date"
                    value={planForm.planDate}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        planDate: event.target.value,
                      }))
                    }
                    required
                  />

                  <div className="assignment-quick-dates">
                    {[
                      { label: 'Today', offset: 0 },
                      { label: 'Tomorrow', offset: 1 },
                      { label: 'In a week', offset: 7 },
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          setPlanForm((current) => ({
                            ...current,
                            planDate: dateKeyFromToday(option.offset),
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {planDateDays !== null && planDateDays < 0 && (
                    <p className="assignment-date-hint">
                      This date has already passed, so the plan will be
                      listed under past plans.
                    </p>
                  )}
                </div>

                <div className="form-field study-planner-description-field">
                  <label htmlFor="study-plan-description">
                    Description <span>(optional)</span>
                  </label>
                  <textarea
                    id="study-plan-description"
                    value={planForm.description}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Add topics, goals, or notes for this study plan..."
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    rows={3}
                  />
                  <p className="assignment-date-hint">
                    {planForm.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </p>
                </div>
              </div>

              {planError && <p className="page-error">{planError}</p>}

              <div className="subject-form-actions">
                {editingPlanId && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetPlanForm}
                    disabled={savingPlan}
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  className="page-primary-button"
                  disabled={savingPlan}
                >
                  {savingPlan
                    ? 'Saving…'
                    : editingPlanId
                      ? 'Save changes'
                      : 'Add study plan'}
                </button>
              </div>
            </form>
          </section>

          {loading ? (
            <div className="study-planner-state-card">
              <span className="state-spinner" />
              <p>Loading your study plans...</p>
            </div>
          ) : (
            <>
              <section className="study-planner-section">
                <div className="section-heading">
                  <div>
                    <p className="page-eyebrow">YOUR SCHEDULE</p>
                    <h2>Upcoming study plans</h2>
                  </div>
                  <span className="study-planner-count">
                    {upcomingPlans.length}
                  </span>
                </div>

                {upcomingPlans.length > 0 ? (
                  <div className="study-plans-grid">
                    {upcomingPlans.map(renderPlanCard)}
                  </div>
                ) : (
                  <div className="study-planner-state-card">
                    <h3>No upcoming plans yet</h3>
                    <p>
                      Add a study plan above to organize what you want to
                      work on.
                    </p>
                  </div>
                )}
              </section>

              {pastPlans.length > 0 && (
                <section className="study-planner-section">
                  <div className="section-heading">
                    <div>
                      <p className="page-eyebrow">PREVIOUS DATES</p>
                      <h2>Past study plans</h2>
                    </div>
                    <span className="study-planner-count">
                      {pastPlans.length}
                    </span>
                  </div>

                  <div className="study-plans-grid">
                    {pastPlans.map(renderPlanCard)}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
