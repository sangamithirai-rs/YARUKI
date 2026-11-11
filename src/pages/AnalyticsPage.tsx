import { useEffect, useMemo, useState } from 'react'
import { getMarks } from '../services/markService'
import { getStudySessions } from '../services/SessionService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import type { Mark } from '../services/markService'
import type { StudySession } from '../services/SessionService'

type SubjectPerformance = {
  subject: Subject
  markCount: number
  obtained: number
  maximum: number
  percentage: number | null
}

type WeeklyStudyDay = {
  label: string
  dateKey: string
  minutes: number
}

function getDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainingMinutes = safeMinutes % 60

  if (hours === 0) {
    return `${remainingMinutes} min`
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${remainingMinutes} min`
}

function formatPercentage(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`
}

function getFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong while loading analytics.'
}

export default function AnalyticsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setLoading(true)
      setError('')

      try {
        const [subjectData, sessionData] = await Promise.all([
          getSubjects(),
          getStudySessions(),
        ])

        const marksBySubject = await Promise.all(
          subjectData.map((subject) => getMarks(subject.id))
        )

        const allMarks = marksBySubject.flat()

        if (!isMounted) return

        setSubjects(subjectData)
        setSessions(sessionData)
        setMarks(allMarks)
      } catch (loadError) {
        if (isMounted) {
          setError(getFriendlyError(loadError))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [])

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.completed),
    [sessions]
  )

  const totalStudyMinutes = useMemo(
    () =>
      completedSessions.reduce(
        (total, session) => total + (session.duration_minutes ?? 0),
        0
      ),
    [completedSessions]
  )

  const overallPerformance = useMemo(() => {
    const validMarks = marks.filter(
      (mark) => mark.max_marks > 0 && mark.marks_obtained >= 0
    )

    const obtained = validMarks.reduce(
      (total, mark) => total + mark.marks_obtained,
      0
    )
    const maximum = validMarks.reduce(
      (total, mark) => total + mark.max_marks,
      0
    )

    return maximum > 0 ? (obtained / maximum) * 100 : null
  }, [marks])

  const subjectPerformance = useMemo<SubjectPerformance[]>(() => {
    return subjects.map((subject) => {
      const subjectMarks = marks.filter(
        (mark) => mark.subject_id === subject.id
      )

      const validMarks = subjectMarks.filter(
        (mark) => mark.max_marks > 0 && mark.marks_obtained >= 0
      )

      const obtained = validMarks.reduce(
        (total, mark) => total + mark.marks_obtained,
        0
      )
      const maximum = validMarks.reduce(
        (total, mark) => total + mark.max_marks,
        0
      )

      return {
        subject,
        markCount: subjectMarks.length,
        obtained,
        maximum,
        percentage: maximum > 0 ? (obtained / maximum) * 100 : null,
      }
    })
  }, [subjects, marks])

  const weeklyStudy = useMemo<WeeklyStudyDay[]>(() => {
    const today = new Date()
    const days: WeeklyStudyDay[] = []

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(today.getDate() - offset)

      const dateKey = getDateKey(date)
      const minutes = completedSessions.reduce((total, session) => {
        return session.session_date === dateKey
          ? total + (session.duration_minutes ?? 0)
          : total
      }, 0)

      days.push({
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dateKey,
        minutes,
      })
    }

    return days
  }, [completedSessions])

  const weeklyTotal = weeklyStudy.reduce(
    (total, day) => total + day.minutes,
    0
  )

  const maxDailyMinutes = Math.max(
    ...weeklyStudy.map((day) => day.minutes),
    1
  )

  if (loading) {
    return (
      <main className="page-main analytics-page">
        <div className="analytics-state-card">
          <span className="state-spinner" aria-hidden="true" />
          <p>Preparing your analytics...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page-main analytics-page">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">YOUR PROGRESS</p>
            <h1>Analytics</h1>
            <p>Understand your study habits and academic progress.</p>
          </div>
        </div>

        <div className="analytics-state-card analytics-error">
          <h2>Analytics could not load</h2>
          <p>{error}</p>
          <button
            type="button"
            className="page-primary-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-main analytics-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">YOUR PROGRESS</p>
          <h1>Analytics</h1>
          <p>
            A clear view of your study activity and recorded assessment
            results.
          </p>
        </div>
      </header>

      <section className="analytics-summary-grid" aria-label="Study summary">
        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Subjects</span>
          <strong>{subjects.length}</strong>
          <span className="analytics-summary-note">
            Subjects in your workspace
          </span>
        </article>

        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Recorded assessments</span>
          <strong>{marks.length}</strong>
          <span className="analytics-summary-note">
            Marks entered across subjects
          </span>
        </article>

        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Overall marks</span>
          <strong>{formatPercentage(overallPerformance)}</strong>
          <span className="analytics-summary-note">
            Based on total marks obtained ÷ total possible marks
          </span>
        </article>

        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Completed study time</span>
          <strong>{formatDuration(totalStudyMinutes)}</strong>
          <span className="analytics-summary-note">
            {completedSessions.length} completed sessions
          </span>
        </article>
      </section>

      <section className="analytics-content-grid">
        <article className="analytics-panel analytics-study-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="page-eyebrow">LAST 7 DAYS</p>
              <h2>Study activity</h2>
            </div>
            <strong>{formatDuration(weeklyTotal)}</strong>
          </div>

          {weeklyTotal === 0 ? (
            <div className="analytics-chart-empty">
              <p>No completed study time recorded this week yet.</p>
              <span>Completed sessions will appear here.</span>
            </div>
          ) : (
            <div className="analytics-week-chart">
              {weeklyStudy.map((day) => {
                const height =
                  day.minutes === 0
                    ? 0
                    : Math.max((day.minutes / maxDailyMinutes) * 100, 8)

                return (
                  <div className="analytics-week-column" key={day.dateKey}>
                    <span className="analytics-bar-value">
                      {day.minutes > 0 ? formatDuration(day.minutes) : ''}
                    </span>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar"
                        style={{ height: `${height}%` }}
                        title={`${day.label}: ${formatDuration(day.minutes)}`}
                      />
                    </div>
                    <span className="analytics-week-label">{day.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="analytics-panel analytics-subject-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="page-eyebrow">ASSESSMENT BREAKDOWN</p>
              <h2>Subject performance</h2>
            </div>
          </div>

          {subjectPerformance.length === 0 ? (
            <div className="analytics-chart-empty">
              <p>No subjects added yet.</p>
              <span>Add subjects to see your assessment breakdown.</span>
            </div>
          ) : (
            <div className="analytics-subject-list">
              {subjectPerformance.map((item) => {
                const progress = Math.min(
                  Math.max(item.percentage ?? 0, 0),
                  100
                )

                return (
                  <div className="analytics-subject-row" key={item.subject.id}>
                    <div className="analytics-subject-row-heading">
                      <div>
                        <strong>{item.subject.name}</strong>
                        <span>
                          {item.markCount}{' '}
                          {item.markCount === 1
                            ? 'assessment'
                            : 'assessments'}
                        </span>
                      </div>
                      <strong>{formatPercentage(item.percentage)}</strong>
                    </div>

                    <div
                      className="analytics-progress-track"
                      role="progressbar"
                      aria-label={`${item.subject.name} marks percentage`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress)}
                    >
                      <div
                        className="analytics-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {item.maximum > 0 && (
                      <span className="analytics-subject-detail">
                        {item.obtained} of {item.maximum} marks
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </section>

      <section className="analytics-panel analytics-insights-panel">
        <div className="analytics-panel-heading">
          <div>
            <p className="page-eyebrow">YOUR RECORDS</p>
            <h2>Activity overview</h2>
          </div>
        </div>

        <div className="analytics-activity-grid">
          <div>
            <span>All study sessions</span>
            <strong>{sessions.length}</strong>
          </div>
          <div>
            <span>Completed sessions</span>
            <strong>{completedSessions.length}</strong>
          </div>
          <div>
            <span>Subjects with marks</span>
            <strong>
              {
                subjectPerformance.filter((item) => item.markCount > 0)
                  .length
              }
            </strong>
          </div>
        </div>
      </section>
    </main>
  )
}