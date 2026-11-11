
import { useEffect, useState, type FormEvent } from 'react'
import {
  addExam,
  deleteExam,
  getExams,
  updateExam,
} from '../services/examService'
import type { Exam } from '../services/examService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'

function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)

  const [title, setTitle] = useState('')
  const [examDate, setExamDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [syllabus, setSyllabus] = useState('')

  useEffect(() => {
    async function loadPageData() {
      try {
        setLoading(true)
        setError('')

        const [examData, subjectData] = await Promise.all([
          getExams(),
          getSubjects(),
        ])

        setExams(examData)
        setSubjects(subjectData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load exams.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadPageData()
  }, [])

  function resetForm() {
    setTitle('')
    setExamDate('')
    setSubjectId('')
    setSyllabus('')
    setEditingExam(null)
    setShowForm(false)
  }

  function openAddForm() {
    setTitle('')
    setExamDate('')
    setSubjectId('')
    setSyllabus('')
    setEditingExam(null)
    setError('')
    setShowForm(true)
  }

  function openEditForm(exam: Exam) {
    setEditingExam(exam)
    setTitle(exam.title)
    setExamDate(exam.exam_date)
    setSubjectId(exam.subject_id ?? '')
    setSyllabus(exam.syllabus ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    const trimmedSyllabus = syllabus.trim()

    if (!trimmedTitle) {
      setError('Please enter an exam title.')
      return
    }

    if (!examDate) {
      setError('Please select an exam date.')
      return
    }

    try {
      setSaving(true)

      if (editingExam) {
        const updated = await updateExam(editingExam.id, {
          title: trimmedTitle,
          exam_date: examDate,
          subject_id: subjectId || null,
          syllabus: trimmedSyllabus || null,
        })

        setExams((current) =>
          current
            .map((exam) => (exam.id === updated.id ? updated : exam))
            .sort(
              (a, b) =>
                new Date(a.exam_date).getTime() -
                new Date(b.exam_date).getTime()
            )
        )
      } else {
        const created = await addExam(
          trimmedTitle,
          examDate,
          subjectId || undefined,
          trimmedSyllabus || undefined
        )

        setExams((current) =>
          [...current, created].sort(
            (a, b) =>
              new Date(a.exam_date).getTime() -
              new Date(b.exam_date).getTime()
          )
        )
      }

      resetForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save exam.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(exam: Exam) {
    const confirmed = window.confirm(
      `Delete the exam "${exam.title}"?`
    )

    if (!confirmed) return

    try {
      setDeletingId(exam.id)
      setError('')

      await deleteExam(exam.id)

      setExams((current) =>
        current.filter((item) => item.id !== exam.id)
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete exam.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  function getSubjectName(id: string | null) {
    if (!id) return 'General exam'

    return subjects.find((subject) => subject.id === id)?.name
      ?? 'Subject unavailable'
  }

  function formatExamDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      undefined,
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  function getDaysUntilExam(date: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const examDay = new Date(`${date}T00:00:00`)
    const difference = examDay.getTime() - today.getTime()

    return Math.round(difference / (1000 * 60 * 60 * 24))
  }

  const upcomingExams = exams.filter(
    (exam) => getDaysUntilExam(exam.exam_date) >= 0
  )

  const pastExams = exams.filter(
    (exam) => getDaysUntilExam(exam.exam_date) < 0
  )

  return (
    <main className="page-main exams-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">EXAM PREPARATION</p>
          <h1>Exams</h1>
          <p className="page-description">
            Keep track of exam dates and organize your preparation.
          </p>
        </div>

        <button
          type="button"
          className="page-primary-button"
          onClick={openAddForm}
        >
          <span>+</span> Add exam
        </button>
      </header>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <section className="subject-form-card exams-form-card">
          <div className="subject-form-header">
            <div>
              <p className="page-eyebrow">
                {editingExam ? 'EDIT EXAM' : 'NEW EXAM'}
              </p>
              <h2>{editingExam ? 'Update exam' : 'Add an exam'}</h2>
            </div>

            <button
              type="button"
              className="form-close-button"
              onClick={resetForm}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form className="subject-form" onSubmit={handleSubmit}>
            <div className="subject-form-grid exams-form-grid">
              <div className="form-field form-field-wide">
                <label htmlFor="exam-title">Exam title</label>
                <input
                  id="exam-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Data Structures Final"
                  disabled={saving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="exam-date">Exam date</label>
                <input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="exam-subject">Subject (optional)</label>
                <select
                  id="exam-subject"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  disabled={saving}
                >
                  <option value="">General / no subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                      {subject.code ? ` (${subject.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field form-field-wide">
                <label htmlFor="exam-syllabus">Syllabus / notes (optional)</label>
                <textarea
                  id="exam-syllabus"
                  value={syllabus}
                  onChange={(event) => setSyllabus(event.target.value)}
                  placeholder="Topics to revise, chapters, or other notes..."
                  rows={4}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="subject-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="page-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingExam
                    ? 'Save changes'
                    : 'Add exam'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="exams-state-card">
          <div className="state-spinner" />
          <p>Loading your exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <section className="exams-state-card empty-state">
          <div className="empty-state-icon">◷</div>
          <h3>No exams scheduled</h3>
          <p>
            Add an exam date to keep your preparation organized.
          </p>
          <button
            type="button"
            className="page-primary-button"
            onClick={openAddForm}
          >
            <span>+</span> Add your first exam
          </button>
        </section>
      ) : (
        <>
          <section className="exams-overview">
            <div className="exam-summary-card">
              <span>Upcoming exams</span>
              <strong>{upcomingExams.length}</strong>
            </div>

            <div className="exam-summary-card">
              <span>Past exams</span>
              <strong>{pastExams.length}</strong>
            </div>
          </section>

          {upcomingExams.length > 0 && (
            <section className="exams-section">
              <div className="section-heading">
                <div>
                  <h2>Upcoming exams</h2>
                  <p>Prepare for what’s next.</p>
                </div>
              </div>

              <div className="exams-grid">
                {upcomingExams.map((exam) => {
                  const daysUntil = getDaysUntilExam(exam.exam_date)

                  return (
                    <article className="exam-card" key={exam.id}>
                      <div className="exam-card-top">
                        <span className="exam-date-badge">
                          {formatExamDate(exam.exam_date)}
                        </span>

                        <span
                          className={`exam-countdown ${
                            daysUntil === 0 ? 'exam-countdown-today' : ''
                          }`}
                        >
                          {daysUntil === 0
                            ? 'Today'
                            : daysUntil === 1
                              ? 'Tomorrow'
                              : `${daysUntil} days left`}
                        </span>
                      </div>

                      <div className="exam-card-content">
                        <span className="exam-subject">
                          {getSubjectName(exam.subject_id)}
                        </span>

                        <h3>{exam.title}</h3>

                        {exam.syllabus && (
                          <p className="exam-syllabus">
                            {exam.syllabus}
                          </p>
                        )}
                      </div>

                      <div className="exam-card-actions">
                        <button
                          type="button"
                          onClick={() => openEditForm(exam)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-action"
                          onClick={() => handleDelete(exam)}
                          disabled={deletingId === exam.id}
                        >
                          {deletingId === exam.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {pastExams.length > 0 && (
            <section className="exams-section past-exams-section">
              <div className="section-heading">
                <div>
                  <h2>Past exams</h2>
                  <p>Previously scheduled assessments.</p>
                </div>
              </div>

              <div className="past-exams-list">
                {pastExams.map((exam) => (
                  <article className="past-exam-row" key={exam.id}>
                    <div className="past-exam-date">
                      {formatExamDate(exam.exam_date)}
                    </div>

                    <div className="past-exam-details">
                      <h3>{exam.title}</h3>
                      <p>{getSubjectName(exam.subject_id)}</p>
                    </div>

                    <div className="exam-card-actions">
                      <button
                        type="button"
                        onClick={() => openEditForm(exam)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-action"
                        onClick={() => handleDelete(exam)}
                        disabled={deletingId === exam.id}
                      >
                        {deletingId === exam.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default ExamsPage