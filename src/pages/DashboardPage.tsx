import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getSubjects } from '../services/subjectService'
import { getExams } from '../services/examService'
import { getAssignments } from '../services/assignmentService'
import { getStudySessions } from '../services/SessionService'
import DashboardLayout from '../layouts/DashboardLayout'
import Header from '../components/Header'

function DashboardPage() {
  const [email, setEmail] = useState<string>()
  const [subjectCount, setSubjectCount] = useState(0)
  const [examCount, setExamCount] = useState(0)
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [studyMinutes, setStudyMinutes] = useState(0)
  const [activeItem, setActiveItem] = useState('Dashboard')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      setEmail(user?.email)

      const [
        subjects,
        exams,
        assignments,
        sessions,
      ] = await Promise.all([
        getSubjects(),
        getExams(),
        getAssignments(),
        getStudySessions(),
      ])

      setSubjectCount(subjects.length)

      const now = new Date()

      const upcomingExams = exams.filter(
        (exam) => new Date(exam.exam_date) >= now
      )

      const pendingAssignments =
        assignments.filter(
          (assignment) => !assignment.completed
        )

      const totalStudyMinutes =
        sessions.reduce(
          (total, session) =>
            total + (session.duration_minutes ?? 0),
          0
        )

      setExamCount(upcomingExams.length)

      setAssignmentCount(
        pendingAssignments.length
      )

      setStudyMinutes(totalStudyMinutes)
    } catch (error) {
      console.error(
        'Dashboard loading error:',
        error
      )
    } finally {
      setLoading(false)
    }
  }

  function formatStudyTime(minutes: number): string {
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

  return (
    <DashboardLayout
  email={email}
  activeItem={activeItem}
  onNavigate={setActiveItem}
>
      <main className="dashboard-main">

        <Header email={email} />

        {/* STAT CARDS */}
        <section className="stat-grid">

          <div className="stat-card">
            <div className="stat-top">
              <span>Subjects</span>
              <span className="stat-icon">
                ◈
              </span>
            </div>

            <strong>
              {loading
                ? '—'
                : subjectCount}
            </strong>

            <small>
              Active this semester
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Upcoming exams</span>
              <span className="stat-icon">
                ◷
              </span>
            </div>

            <strong>
              {loading
                ? '—'
                : examCount}
            </strong>

            <small>
              Still to prepare for
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Pending tasks</span>
              <span className="stat-icon">
                ✓
              </span>
            </div>

            <strong>
              {loading
                ? '—'
                : assignmentCount}
            </strong>

            <small>
              Assignments remaining
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Study time</span>
              <span className="stat-icon">
                ◒
              </span>
            </div>

            <strong>
              {loading
                ? '—'
                : formatStudyTime(studyMinutes)}
            </strong>

            <small>
              Recorded study sessions
            </small>
          </div>

        </section>

        {/* MAIN DASHBOARD */}
        <section className="dashboard-grid">

          <div className="dashboard-panel focus-panel">

            <div className="panel-heading">
              <div>
                <p className="panel-kicker">
                  TODAY
                </p>

                <h2>
                  Focus on what matters.
                </h2>
              </div>

              <span className="panel-number">
                01
              </span>
            </div>

            <p className="panel-text">
              Your academic workspace brings
              subjects, marks, exams,
              assignments and study progress
              into one place.
            </p>

            <button
              className="dark-action"
              type="button"
              onClick={() => setActiveItem('Study Planner')}
            >
              Start planning
              <span>→</span>
            </button>

          </div>

          <div className="dashboard-panel">

            <div className="panel-heading">

              <div>
                <p className="panel-kicker">
                  QUICK VIEW
                </p>

                <h2>
                  Academic snapshot
                </h2>
              </div>

            </div>

            <div className="snapshot-row">
              <span>
                Subjects tracked
              </span>

              <strong>
                {loading
                  ? '—'
                  : subjectCount}
              </strong>
            </div>

            <div className="snapshot-row">
              <span>
                Upcoming exams
              </span>

              <strong>
                {loading
                  ? '—'
                  : examCount}
              </strong>
            </div>

            <div className="snapshot-row">
              <span>
                Pending assignments
              </span>

              <strong>
                {loading
                  ? '—'
                  : assignmentCount}
              </strong>
            </div>

            <div className="snapshot-row">
              <span>
                Recorded study hours
              </span>

              <strong>
                {loading
                  ? '—'
                  : formatStudyTime(studyMinutes)}
              </strong>
            </div>

          </div>

        </section>

        {/* JOURNEY */}
        <section className="dashboard-panel progress-panel">

          <div className="panel-heading">

            <div>
              <p className="panel-kicker">
                YARUKI
              </p>

              <h2>
                Your academic journey
              </h2>
            </div>

          </div>

          <div className="journey">

            <div className="journey-line" />

            <div className="journey-step active">
              <span>01</span>

              <div>
                <strong>
                  Workspace connected
                </strong>

                <small>
                  Your Supabase account is active.
                </small>
              </div>
            </div>

            <div className="journey-step">
              <span>02</span>

              <div>
                <strong>
                  Build your subjects
                </strong>

                <small>
                  Add your semester subjects
                  and credits.
                </small>
              </div>
            </div>

            <div className="journey-step">
              <span>03</span>

              <div>
                <strong>
                  Track your progress
                </strong>

                <small>
                  Monitor marks, exams and
                  study sessions.
                </small>
              </div>
            </div>

          </div>

        </section>

      </main>
    </DashboardLayout>
  )
}

export default DashboardPage