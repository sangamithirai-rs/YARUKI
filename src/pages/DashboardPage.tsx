import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHashNavigation } from '../lib/useHashNavigation'
import {
  dateKeyFromToday,
  daysFromToday,
  describeDays,
  formatDuration,
  formatShortDate,
  toDateKey,
} from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import { getSubjects } from '../services/subjectService'
import { getExams } from '../services/examService'
import { getAssignments } from '../services/assignmentService'
import { getStudySessions } from '../services/SessionService'
import { getAllMarks } from '../services/markService'
import { getStudyPlans } from '../services/studyPlanService'
import type { Subject } from '../services/subjectService'
import type { Exam } from '../services/examService'
import type { Assignment } from '../services/assignmentService'
import type { StudySession } from '../services/SessionService'
import type { Mark } from '../services/markService'
import type { StudyPlan } from '../services/studyPlanService'
import DashboardLayout from '../layouts/DashboardLayout'
import Header from '../components/Header'

type DashboardData = {
  subjects: Subject[]
  exams: Exam[]
  assignments: Assignment[]
  sessions: StudySession[]
  marks: Mark[]
  plans: StudyPlan[]
}

type Deadline = {
  id: string
  title: string
  kind: 'Exam' | 'Assignment'
  date: string
  days: number
}

const EMPTY_DATA: DashboardData = {
  subjects: [],
  exams: [],
  assignments: [],
  sessions: [],
  marks: [],
  plans: [],
}

function summarize(data: DashboardData) {
  const { subjects, exams, assignments, sessions, marks, plans } = data

  const today = dateKeyFromToday(0)
  const weekStart = dateKeyFromToday(-6)

  const upcomingExams = exams.filter(
    (exam) => daysFromToday(exam.exam_date) >= 0
  )

  const pendingAssignments = assignments.filter(
    (assignment) => !assignment.completed
  )

  const overdueCount = pendingAssignments.filter(
    (assignment) =>
      assignment.due_date && daysFromToday(assignment.due_date) < 0
  ).length

  // Only finished sessions count as study time (same rule as Analytics)
  const completedSessions = sessions.filter((session) => session.completed)

  const totalMinutes = completedSessions.reduce(
    (total, session) => total + (session.duration_minutes ?? 0),
    0
  )

  const weekMinutes = completedSessions
    .filter((session) => {
      const day = toDateKey(session.session_date)
      return day >= weekStart && day <= today
    })
    .reduce((total, session) => total + (session.duration_minutes ?? 0), 0)

  const todaySessions = sessions.filter(
    (session) => toDateKey(session.session_date) === today
  )

  const todayPlans = plans.filter(
    (plan) => plan.plan_date && toDateKey(plan.plan_date) === today
  )

  const deadlines: Deadline[] = [
    ...upcomingExams.map((exam) => ({
      id: `exam-${exam.id}`,
      title: exam.title,
      kind: 'Exam' as const,
      date: exam.exam_date,
      days: daysFromToday(exam.exam_date),
    })),
    ...pendingAssignments
      .filter((assignment) => assignment.due_date)
      .map((assignment) => ({
        id: `assignment-${assignment.id}`,
        title: assignment.title,
        kind: 'Assignment' as const,
        date: assignment.due_date as string,
        days: daysFromToday(assignment.due_date as string),
      })),
  ]
    .sort((a, b) => a.days - b.days)
    .slice(0, 6)

  const totals = new Map<string, { obtained: number; maximum: number }>()

  for (const mark of marks) {
    const current = totals.get(mark.subject_id) ?? {
      obtained: 0,
      maximum: 0,
    }

    current.obtained += mark.marks_obtained
    current.maximum += mark.max_marks
    totals.set(mark.subject_id, current)
  }

  const subjectScores = subjects
    .map((subject) => {
      const total = totals.get(subject.id)

      return {
        id: subject.id,
        name: subject.name,
        percentage:
          total && total.maximum > 0
            ? (total.obtained / total.maximum) * 100
            : null,
      }
    })
    .filter(
      (item): item is { id: string; name: string; percentage: number } =>
        item.percentage !== null
    )
    .sort((a, b) => b.percentage - a.percentage)

  const overall = Array.from(totals.values()).reduce(
    (sum, item) => ({
      obtained: sum.obtained + item.obtained,
      maximum: sum.maximum + item.maximum,
    }),
    { obtained: 0, maximum: 0 }
  )

  const overallPercentage =
    overall.maximum > 0 ? (overall.obtained / overall.maximum) * 100 : null

  const checklist = [
    {
      label: 'Add your subjects',
      detail: 'List the subjects you study this semester.',
      done: subjects.length > 0,
      page: 'Subjects',
    },
    {
      label: 'Record some marks',
      detail: 'Track assessment results to see your average.',
      done: marks.length > 0,
      page: 'Marks',
    },
    {
      label: 'Schedule an exam',
      detail: 'Add an exam date so you can count down to it.',
      done: exams.length > 0,
      page: 'Exams',
    },
    {
      label: 'Add an assignment',
      detail: 'Keep deadlines in one place.',
      done: assignments.length > 0,
      page: 'Assignments',
    },
    {
      label: 'Plan a study session',
      detail: 'Block out time to study and log your progress.',
      done: sessions.length > 0 || plans.length > 0,
      page: 'Study Planner',
    },
  ]

  return {
    subjectCount: subjects.length,
    upcomingExams,
    pendingCount: pendingAssignments.length,
    overdueCount,
    totalMinutes,
    weekMinutes,
    todaySessions,
    todayPlans,
    deadlines,
    subjectScores,
    overallPercentage,
    checklist,
  }
}

function DashboardPage() {
  const [activeItem, setActiveItem] = useHashNavigation()
  const [email, setEmail] = useState<string>()
  const [name, setName] = useState<string>()
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const results = await Promise.allSettled([
          getSubjects(),
          getExams(),
          getAssignments(),
          getStudySessions(),
          getAllMarks(),
          getStudyPlans(),
        ])

        if (!isMounted) {
          return
        }

        const failures = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )

        // A section that fails to load is shown empty instead of
        // breaking the whole dashboard.
        const [subjects, exams, assignments, sessions, marks, plans] =
          results.map((result) =>
            result.status === 'fulfilled' ? result.value : []
          ) as [
            Subject[],
            Exam[],
            Assignment[],
            StudySession[],
            Mark[],
            StudyPlan[],
          ]

        setEmail(user?.email)
        setName(user?.user_metadata?.full_name as string | undefined)
        setData({ subjects, exams, assignments, sessions, marks, plans })

        if (failures.length > 0) {
          console.error('Dashboard loading errors:', failures)
          setError(
            getErrorMessage(
              failures[0].reason,
              'Some information could not be loaded.'
            )
          )
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Unable to load your dashboard.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  function handleRetry() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  const summary = summarize(data)
  const nextExam = summary.upcomingExams[0]
  const setupComplete = summary.checklist.every((step) => step.done)
  const dash = '—'

  const todayItems = [
    ...summary.todaySessions.map((session) => ({
      id: `session-${session.id}`,
      title: session.topic || 'Study session',
      detail: [
        session.duration_minutes
          ? formatDuration(session.duration_minutes)
          : null,
        session.completed ? 'Done' : 'Planned',
      ]
        .filter(Boolean)
        .join(' · '),
    })),
    ...summary.todayPlans.map((plan) => ({
      id: `plan-${plan.id}`,
      title: plan.title,
      detail: 'Study plan',
    })),
  ]

  return (
    <DashboardLayout
      email={email}
      activeItem={activeItem}
      onNavigate={setActiveItem}
    >
      <main className="dashboard-main">
        <Header email={email} name={name} />

        {error && (
          <div className="page-error dashboard-error">
            <span>
              Some information could not be loaded: {error}
            </span>

            <button type="button" onClick={handleRetry}>
              Try again
            </button>
          </div>
        )}

        {/* STAT CARDS */}
        <section className="stat-grid">
          <button
            type="button"
            className="stat-card stat-card-link"
            onClick={() => setActiveItem('Subjects')}
          >
            <div className="stat-top">
              <span>Subjects</span>
              <span className="stat-icon">◈</span>
            </div>

            <strong>{loading ? dash : summary.subjectCount}</strong>

            <small>Manage your subjects</small>
          </button>

          <button
            type="button"
            className="stat-card stat-card-link"
            onClick={() => setActiveItem('Exams')}
          >
            <div className="stat-top">
              <span>Upcoming exams</span>
              <span className="stat-icon">◷</span>
            </div>

            <strong>{loading ? dash : summary.upcomingExams.length}</strong>

            <small>
              {loading
                ? ' '
                : nextExam
                  ? `Next: ${nextExam.title} · ${describeDays(
                      daysFromToday(nextExam.exam_date)
                    )}`
                  : 'No exams scheduled'}
            </small>
          </button>

          <button
            type="button"
            className="stat-card stat-card-link"
            onClick={() => setActiveItem('Assignments')}
          >
            <div className="stat-top">
              <span>Pending tasks</span>
              <span className="stat-icon">✓</span>
            </div>

            <strong>{loading ? dash : summary.pendingCount}</strong>

            <small
              className={
                summary.overdueCount > 0 ? 'stat-alert' : undefined
              }
            >
              {loading
                ? ' '
                : summary.overdueCount > 0
                  ? `${summary.overdueCount} overdue`
                  : 'Nothing overdue'}
            </small>
          </button>

          <button
            type="button"
            className="stat-card stat-card-link"
            onClick={() => setActiveItem('Analytics')}
          >
            <div className="stat-top">
              <span>Study this week</span>
              <span className="stat-icon">◒</span>
            </div>

            <strong>
              {loading ? dash : formatDuration(summary.weekMinutes)}
            </strong>

            <small>
              {loading
                ? ' '
                : `${formatDuration(summary.totalMinutes)} completed in total`}
            </small>
          </button>
        </section>

        {/* TODAY + PERFORMANCE */}
        <section className="dashboard-grid">
          <div className="dashboard-panel focus-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">TODAY</p>
                <h2>Your day</h2>
              </div>

              <span className="panel-number">
                {loading ? dash : String(todayItems.length).padStart(2, '0')}
              </span>
            </div>

            {loading ? (
              <p className="panel-text">Loading…</p>
            ) : todayItems.length === 0 ? (
              <p className="panel-text">
                Nothing planned for today. Block out a study session to
                stay on track.
              </p>
            ) : (
              <div className="today-list">
                {todayItems.map((item) => (
                  <div className="snapshot-row" key={item.id}>
                    <span>{item.title}</span>
                    <strong>{item.detail}</strong>
                  </div>
                ))}
              </div>
            )}

            <button
              className="dark-action"
              type="button"
              onClick={() => setActiveItem('Study Planner')}
            >
              {todayItems.length === 0 ? 'Start planning' : 'Open planner'}
              <span>→</span>
            </button>
          </div>

          <div className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">PERFORMANCE</p>
                <h2>Marks overview</h2>
              </div>
            </div>

            {loading ? (
              <p className="panel-text">Loading…</p>
            ) : summary.overallPercentage === null ? (
              <p className="panel-text">
                Record your marks and your average will show up here.
              </p>
            ) : (
              <>
                <p className="performance-score">
                  {Math.round(summary.overallPercentage)}%
                  <small>overall average</small>
                </p>

                {summary.subjectScores.slice(0, 4).map((item) => (
                  <div className="snapshot-row" key={item.id}>
                    <span>{item.name}</span>
                    <strong>{Math.round(item.percentage)}%</strong>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* DEADLINES */}
        <section className="dashboard-panel deadlines-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">COMING UP</p>
              <h2>Next deadlines</h2>
            </div>
          </div>

          {loading ? (
            <p className="panel-text">Loading…</p>
          ) : summary.deadlines.length === 0 ? (
            <p className="panel-text">
              Nothing due. Add an exam or an assignment with a due date
              and it will show up here.
            </p>
          ) : (
            summary.deadlines.map((item) => (
              <div className="snapshot-row" key={item.id}>
                <span>
                  {item.title} · {item.kind}
                </span>

                <strong
                  className={item.days < 0 ? 'deadline-overdue' : undefined}
                >
                  {item.days < 0
                    ? `Overdue · ${formatShortDate(item.date)}`
                    : `${formatShortDate(item.date)} · ${describeDays(
                        item.days
                      )}`}
                </strong>
              </div>
            ))
          )}
        </section>

        {/* SET-UP CHECKLIST (hidden once everything is done) */}
        {!loading && !setupComplete && (
          <section className="dashboard-panel progress-panel setup-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">GETTING STARTED</p>
                <h2>Set up your workspace</h2>
              </div>
            </div>

            <div className="journey">
              <div className="journey-line" />

              {summary.checklist.map((step, index) => (
                <button
                  type="button"
                  key={step.label}
                  className={`journey-step journey-step-link ${
                    step.done ? 'active' : ''
                  }`}
                  onClick={() => setActiveItem(step.page)}
                >
                  <span>
                    {step.done ? '✓' : String(index + 1).padStart(2, '0')}
                  </span>

                  <div>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </DashboardLayout>
  )
}

export default DashboardPage
