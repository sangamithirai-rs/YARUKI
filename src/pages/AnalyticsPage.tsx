import { useEffect, useMemo, useState } from 'react'
import { getAllMarks } from '../services/markService'
import { getStudySessions } from '../services/SessionService'
import { getSubjects } from '../services/subjectService'
import { getAssignments } from '../services/assignmentService'
import { getExams } from '../services/examService'
import type { Subject } from '../services/subjectService'
import type { Mark } from '../services/markService'
import type { StudySession } from '../services/SessionService'
import type { Assignment } from '../services/assignmentService'
import type { Exam } from '../services/examService'
import { getErrorMessage } from '../lib/errors'
import { usePreferences } from '../lib/preferences'
import { formatDuration, formatShortDate } from '../lib/dates'
import {
  buildMarkTrend,
  buildStudyBuckets,
  computeStreaks,
  scoreSubjects,
  studyBySubject,
  summarizeWork,
  type RangeDays,
} from '../lib/analytics'
import '../settingsAnalytics.css'

const RANGES: RangeDays[] = [7, 30, 90]

type AnalyticsData = {
  subjects: Subject[]
  marks: Mark[]
  sessions: StudySession[]
  assignments: Assignment[]
  exams: Exam[]
}

const EMPTY: AnalyticsData = {
  subjects: [],
  marks: [],
  sessions: [],
  assignments: [],
  exams: [],
}

function formatPercentage(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`
}

function getPercentClass(percent: number): string {
  if (percent >= 75) return 'analytics-good'
  if (percent >= 50) return 'analytics-ok'

  return 'analytics-low'
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export default function AnalyticsPage() {
  const preferences = usePreferences()

  const [data, setData] = useState<AnalyticsData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [fatal, setFatal] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [range, setRange] = useState<RangeDays>(7)
  const [trendSubject, setTrendSubject] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      const results = await Promise.allSettled([
        getSubjects(),
        getAllMarks(),
        getStudySessions(),
        getAssignments(),
        getExams(),
      ])

      if (!isMounted) return

      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )

      const [subjects, marks, sessions, assignments, exams] = results.map(
        (result) => (result.status === 'fulfilled' ? result.value : [])
      ) as [Subject[], Mark[], StudySession[], Assignment[], Exam[]]

      setData({ subjects, marks, sessions, assignments, exams })

      if (failures.length > 0) {
        console.error('Analytics loading errors:', failures)
        setLoadError(
          getErrorMessage(
            failures[0].reason,
            'Some of your information could not be loaded.'
          )
        )
        setFatal(failures.length === results.length)
      }

      setLoading(false)
    }

    void loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  function handleRetry() {
    setLoading(true)
    setLoadError('')
    setFatal(false)
    setReloadKey((key) => key + 1)
  }

  const { subjects, marks, sessions, assignments, exams } = data

  const study = useMemo(
    () => buildStudyBuckets(sessions, range),
    [sessions, range]
  )

  const lastSevenDays = useMemo(
    () => buildStudyBuckets(sessions, 7).total,
    [sessions]
  )

  const streaks = useMemo(() => computeStreaks(sessions), [sessions])

  const bySubject = useMemo(
    () => studyBySubject(sessions, subjects, range),
    [sessions, subjects, range]
  )

  const subjectScores = useMemo(
    () => scoreSubjects(subjects, marks),
    [subjects, marks]
  )

  const trend = useMemo(
    () => buildMarkTrend(marks, trendSubject),
    [marks, trendSubject]
  )

  const work = useMemo(
    () => summarizeWork(assignments, exams),
    [assignments, exams]
  )

  const scored = subjectScores.filter((item) => item.percentage !== null)
  const overall = (() => {
    const valid = marks.filter(
      (mark) => mark.max_marks > 0 && mark.marks_obtained >= 0
    )
    const maximum = valid.reduce((sum, mark) => sum + mark.max_marks, 0)

    return maximum > 0
      ? (valid.reduce((sum, mark) => sum + mark.marks_obtained, 0) /
          maximum) *
          100
      : null
  })()

  const subjectsWithMarks = subjects.filter((subject) =>
    marks.some((mark) => mark.subject_id === subject.id)
  )

  const maxBucket = Math.max(...study.buckets.map((bucket) => bucket.minutes), 1)
  const maxSubjectMinutes = Math.max(...bySubject.map((row) => row.minutes), 1)

  let changeText = 'No study time yet'

  if (study.total > 0 && study.previousTotal === 0) {
    changeText = 'First period with study time'
  } else if (study.previousTotal > 0) {
    const change = Math.round(
      ((study.total - study.previousTotal) / study.previousTotal) * 100
    )

    changeText =
      change === 0
        ? `Same as the previous ${range} days`
        : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs previous ${range} days`
  }

  const goal = preferences.weeklyGoalMinutes
  const goalProgress =
    goal > 0 ? Math.min(100, Math.round((lastSevenDays / goal) * 100)) : 0

  // trend chart geometry
  const chartWidth = 300
  const chartHeight = 100
  const chartPoints = trend.map((point, index) => ({
    ...point,
    x:
      trend.length === 1
        ? chartWidth / 2
        : 12 + (index / (trend.length - 1)) * (chartWidth - 24),
    y: 8 + (1 - Math.min(100, point.percent) / 100) * (chartHeight - 16),
  }))

  const trendAverage =
    trend.length > 0
      ? trend.reduce((sum, point) => sum + point.percent, 0) / trend.length
      : null

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

  if (fatal) {
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
          <p>{loadError}</p>
          <button
            type="button"
            className="page-primary-button"
            onClick={handleRetry}
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
            A clear view of your study activity, marks and workload.
          </p>
        </div>
      </header>

      {loadError && (
        <div className="page-error analytics-banner">
          <span>Some information could not be loaded: {loadError}</span>
          <button type="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}

      <section className="analytics-summary-grid" aria-label="Study summary">
        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Overall marks</span>
          <strong>{formatPercentage(overall)}</strong>
          <span className="analytics-summary-note">
            {marks.length === 0
              ? 'No assessments recorded yet'
              : `${plural(marks.length, 'assessment')} in ${plural(
                  scored.length,
                  'subject'
                )}`}
          </span>
        </article>

        <article className="analytics-summary-card">
          <span className="analytics-summary-label">
            Study time · last {range} days
          </span>
          <strong>{formatDuration(study.total)}</strong>
          <span className="analytics-summary-note">{changeText}</span>
        </article>

        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Study streak</span>
          <strong>{plural(streaks.current, 'day')}</strong>
          <span className="analytics-summary-note">
            Best streak: {plural(streaks.best, 'day')}
          </span>
        </article>

        <article className="analytics-summary-card">
          <span className="analytics-summary-label">Assignments done</span>
          <strong>
            {work.completionRate === null ? '—' : `${work.completionRate}%`}
          </strong>
          <span className="analytics-summary-note">
            {work.total === 0
              ? 'No assignments yet'
              : `${work.completed} of ${work.total} completed`}
          </span>
        </article>
      </section>

      <section className="analytics-goal" aria-label="Weekly study goal">
        {goal > 0 ? (
          <>
            <div className="analytics-goal-text">
              <strong>Weekly goal</strong>
              <span>
                {formatDuration(lastSevenDays)} of {formatDuration(goal)} in
                the last 7 days
                {goalProgress >= 100 ? ' · Goal reached! 🎉' : ''}
              </span>
            </div>

            <div className="analytics-goal-bar" aria-hidden="true">
              <span
                className={goalProgress >= 100 ? 'reached' : ''}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </>
        ) : (
          <p className="analytics-goal-empty">
            Want a target to aim for?{' '}
            <a href="#settings">Set a weekly study goal in Settings</a>.
          </p>
        )}
      </section>

      <section className="analytics-content-grid">
        <article className="analytics-panel analytics-study-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="page-eyebrow">STUDY ACTIVITY</p>
              <h2>Time studied</h2>
            </div>

            <div className="analytics-range" role="group" aria-label="Time range">
              {RANGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={range === option ? 'active' : ''}
                  aria-pressed={range === option}
                  onClick={() => setRange(option)}
                >
                  {option} days
                </button>
              ))}
            </div>
          </div>

          {study.total === 0 ? (
            <div className="analytics-chart-empty">
              <p>No completed study time in the last {range} days.</p>
              <span>
                Log a session or use the focus timer in the Study Planner and
                it will appear here.
              </span>
            </div>
          ) : (
            <div
              className="analytics-week-chart"
              style={{
                gridTemplateColumns: `repeat(${study.buckets.length}, minmax(0, 1fr))`,
                gap: range === 30 ? '4px' : '10px',
              }}
              aria-label={
                range === 90 ? 'Study time per week' : 'Study time per day'
              }
            >
              {study.buckets.map((bucket, index) => {
                const height =
                  bucket.minutes === 0
                    ? 0
                    : Math.max((bucket.minutes / maxBucket) * 100, 8)

                const showLabel =
                  range !== 30 ||
                  index % 5 === 0 ||
                  index === study.buckets.length - 1

                return (
                  <div className="analytics-week-column" key={bucket.key}>
                    <span className="analytics-bar-value">
                      {range !== 30 && bucket.minutes > 0
                        ? formatDuration(bucket.minutes)
                        : ''}
                    </span>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar"
                        style={{ height: `${height}%` }}
                        title={`${
                          range === 90 ? 'Week of ' : ''
                        }${bucket.label}: ${formatDuration(bucket.minutes)}`}
                      />
                    </div>
                    <span className="analytics-week-label">
                      {showLabel ? bucket.label : ''}
                    </span>
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

          {subjectScores.length === 0 ? (
            <div className="analytics-chart-empty">
              <p>No subjects added yet.</p>
              <span>Add subjects to see your assessment breakdown.</span>
            </div>
          ) : (
            <>
              {scored.length >= 2 && (
                <p className="analytics-callout">
                  <span>
                    Strongest: <strong>{scored[0].subject.name}</strong> (
                    {formatPercentage(scored[0].percentage)})
                  </span>
                  <span>
                    Needs attention:{' '}
                    <strong>{scored[scored.length - 1].subject.name}</strong> (
                    {formatPercentage(scored[scored.length - 1].percentage)})
                  </span>
                </p>
              )}

              <div className="analytics-subject-list">
                {subjectScores.map((item) => {
                  const progress = Math.min(
                    Math.max(item.percentage ?? 0, 0),
                    100
                  )

                  return (
                    <div className="analytics-subject-row" key={item.subject.id}>
                      <div className="analytics-subject-row-heading">
                        <div>
                          <strong>{item.subject.name}</strong>
                          <span>{plural(item.markCount, 'assessment')}</span>
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
                          className={`analytics-progress-fill ${
                            item.percentage === null
                              ? ''
                              : getPercentClass(item.percentage)
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {item.maximum > 0 && (
                        <span className="analytics-subject-detail">
                          {Math.round(item.obtained * 100) / 100} of{' '}
                          {Math.round(item.maximum * 100) / 100} marks
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="analytics-content-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="page-eyebrow">WHERE YOUR TIME GOES</p>
              <h2>Study time by subject</h2>
            </div>
            <strong>Last {range} days</strong>
          </div>

          {bySubject.length === 0 ? (
            <div className="analytics-chart-empty">
              <p>No completed study time to break down.</p>
              <span>Choose a subject when you log a session.</span>
            </div>
          ) : (
            <div className="analytics-time-list">
              {bySubject.map((row) => (
                <div className="analytics-time-row" key={row.id || 'none'}>
                  <div className="analytics-time-heading">
                    <span>{row.name}</span>
                    <strong>{formatDuration(row.minutes)}</strong>
                  </div>

                  <div className="analytics-progress-track" aria-hidden="true">
                    <div
                      className="analytics-progress-fill"
                      style={{
                        width: `${Math.round(
                          (row.minutes / maxSubjectMinutes) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="page-eyebrow">OVER TIME</p>
              <h2>Marks trend</h2>
            </div>

            {subjectsWithMarks.length > 1 && (
              <select
                className="analytics-select"
                aria-label="Marks trend subject"
                value={trendSubject}
                onChange={(event) => setTrendSubject(event.target.value)}
              >
                <option value="">All subjects</option>
                {subjectsWithMarks.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {trend.length < 2 ? (
            <div className="analytics-chart-empty">
              <p>Not enough marks to show a trend.</p>
              <span>Record at least two assessments to see how you are moving.</span>
            </div>
          ) : (
            <>
              <svg
                className="analytics-trend"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Assessment percentages in date order"
              >
                <line
                  className="analytics-trend-guide"
                  x1="0"
                  x2={chartWidth}
                  y1={8 + (chartHeight - 16) / 2}
                  y2={8 + (chartHeight - 16) / 2}
                />
                <polyline
                  className="analytics-trend-line"
                  points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                />
                {chartPoints.map((point) => (
                  <circle
                    key={point.id}
                    className="analytics-trend-dot"
                    cx={point.x}
                    cy={point.y}
                    r="3.5"
                  >
                    <title>{`${point.name}: ${point.percent.toFixed(1)}%`}</title>
                  </circle>
                ))}
              </svg>

              <p className="analytics-trend-note">
                {plural(trend.length, 'assessment')} · average{' '}
                {formatPercentage(trendAverage)} · latest{' '}
                {formatPercentage(trend[trend.length - 1].percent)}. The dashed
                line marks 50%.
              </p>
            </>
          )}
        </article>
      </section>

      <section className="analytics-panel analytics-insights-panel">
        <div className="analytics-panel-heading">
          <div>
            <p className="page-eyebrow">YOUR WORKLOAD</p>
            <h2>Assignments and exams</h2>
          </div>
        </div>

        <div className="analytics-activity-grid analytics-workload-grid">
          <div>
            <span>Pending assignments</span>
            <strong>{work.pending}</strong>
          </div>
          <div>
            <span>Overdue</span>
            <strong className={work.overdue > 0 ? 'analytics-alert' : undefined}>
              {work.overdue}
            </strong>
          </div>
          <div>
            <span>Exams in next 14 days</span>
            <strong>{work.examsInTwoWeeks}</strong>
          </div>
        </div>

        <p className="analytics-next-exam">
          {work.nextExam
            ? `Next exam: ${work.nextExam.title} on ${formatShortDate(
                work.nextExam.exam_date
              )}.`
            : 'No upcoming exams scheduled.'}
        </p>
      </section>
    </main>
  )
}
