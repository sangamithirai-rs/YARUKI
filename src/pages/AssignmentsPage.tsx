
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addAssignment,
  deleteAssignment,
  getAssignments,
  updateAssignment,
} from '../services/assignmentService'
import type { Assignment } from '../services/assignmentService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'

type AssignmentFilter = 'all' | 'pending' | 'completed'

function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingAssignment, setEditingAssignment] =
    useState<Assignment | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [filter, setFilter] = useState<AssignmentFilter>('all')

  useEffect(() => {
    async function loadPageData() {
      try {
        setLoading(true)
        setError('')

        const [assignmentData, subjectData] = await Promise.all([
          getAssignments(),
          getSubjects(),
        ])

        setAssignments(assignmentData)
        setSubjects(subjectData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load assignments.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadPageData()
  }, [])

  function resetForm() {
    setTitle('')
    setDescription('')
    setDueDate('')
    setSubjectId('')
    setEditingAssignment(null)
    setShowForm(false)
  }

  function openAddForm() {
    setTitle('')
    setDescription('')
    setDueDate('')
    setSubjectId('')
    setEditingAssignment(null)
    setError('')
    setShowForm(true)
  }

  function openEditForm(assignment: Assignment) {
    setEditingAssignment(assignment)
    setTitle(assignment.title)
    setDescription(assignment.description ?? '')
    setDueDate(assignment.due_date ?? '')
    setSubjectId(assignment.subject_id ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle) {
      setError('Please enter an assignment title.')
      return
    }

    try {
      setSaving(true)

      if (editingAssignment) {
        const updated = await updateAssignment(editingAssignment.id, {
          title: trimmedTitle,
          description: trimmedDescription || null,
          due_date: dueDate || null,
          subject_id: subjectId || null,
        })

        setAssignments((current) =>
          current.map((assignment) =>
            assignment.id === updated.id ? updated : assignment
          )
        )
      } else {
        const created = await addAssignment(
          trimmedTitle,
          trimmedDescription || undefined,
          dueDate || undefined,
          subjectId || undefined
        )

        setAssignments((current) => [...current, created])
      }

      resetForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save assignment.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleCompleted(assignment: Assignment) {
    try {
      setTogglingId(assignment.id)
      setError('')

      const updated = await updateAssignment(assignment.id, {
        completed: !assignment.completed,
      })

      setAssignments((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update assignment status.'
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(assignment: Assignment) {
    const confirmed = window.confirm(
      `Delete the assignment "${assignment.title}"?`
    )

    if (!confirmed) return

    try {
      setDeletingId(assignment.id)
      setError('')

      await deleteAssignment(assignment.id)

      setAssignments((current) =>
        current.filter((item) => item.id !== assignment.id)
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete assignment.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  function getSubjectName(id: string | null) {
    if (!id) return 'No subject'

    return (
      subjects.find((subject) => subject.id === id)?.name ??
      'Subject unavailable'
    )
  }

  function formatDueDate(date: string | null) {
    if (!date) return 'No due date'

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      undefined,
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  function getDaysUntilDue(date: string | null) {
    if (!date) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDay = new Date(`${date}T00:00:00`)
    return Math.round(
      (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  function getDueLabel(assignment: Assignment) {
    if (assignment.completed) return 'Completed'

    const days = getDaysUntilDue(assignment.due_date)

    if (days === null) return 'No due date'
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'

    return `${days} days left`
  }

  const pendingCount = assignments.filter(
    (assignment) => !assignment.completed
  ).length

  const completedCount = assignments.filter(
    (assignment) => assignment.completed
  ).length

  const overdueCount = assignments.filter((assignment) => {
    const days = getDaysUntilDue(assignment.due_date)
    return !assignment.completed && days !== null && days < 0
  }).length

  const filteredAssignments = useMemo(() => {
    const filtered = assignments.filter((assignment) => {
      if (filter === 'pending') return !assignment.completed
      if (filter === 'completed') return assignment.completed
      return true
    })

    return filtered.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
  }, [assignments, filter])

  return (
    <main className="page-main assignments-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">TASK MANAGEMENT</p>
          <h1>Assignments</h1>
          <p className="page-description">
            Organize your coursework and keep track of due dates.
          </p>
        </div>

        <button
          type="button"
          className="page-primary-button"
          onClick={openAddForm}
        >
          <span>+</span> Add assignment
        </button>
      </header>

      {error && <div className="page-error">{error}</div>}

      <section className="assignments-overview">
        <div className="assignment-summary-card">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="assignment-summary-card">
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </div>

        <div className="assignment-summary-card">
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
        </div>
      </section>

      {showForm && (
        <section className="subject-form-card assignment-form-card">
          <div className="subject-form-header">
            <div>
              <p className="page-eyebrow">
                {editingAssignment ? 'EDIT ASSIGNMENT' : 'NEW ASSIGNMENT'}
              </p>
              <h2>
                {editingAssignment
                  ? 'Update assignment'
                  : 'Add an assignment'}
              </h2>
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
            <div className="subject-form-grid assignment-form-grid">
              <div className="form-field form-field-wide">
                <label htmlFor="assignment-title">Assignment title</label>
                <input
                  id="assignment-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Database normalization report"
                  disabled={saving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="assignment-due-date">Due date (optional)</label>
                <input
                  id="assignment-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="assignment-subject">Subject (optional)</label>
                <select
                  id="assignment-subject"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  disabled={saving}
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

              <div className="form-field form-field-wide">
                <label htmlFor="assignment-description">
                  Description (optional)
                </label>
                <textarea
                  id="assignment-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add instructions, requirements, or notes..."
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
                  : editingAssignment
                    ? 'Save changes'
                    : 'Add assignment'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="assignments-section">
        <div className="assignments-toolbar">
          <div className="section-heading">
            <div>
              <h2>Your assignments</h2>
              <p>
                {loading
                  ? 'Loading your coursework...'
                  : `${filteredAssignments.length} ${
                      filteredAssignments.length === 1
                        ? 'assignment'
                        : 'assignments'
                    }`}
              </p>
            </div>
          </div>

          <div className="assignment-filters" aria-label="Filter assignments">
            <button
              type="button"
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={filter === 'pending' ? 'active' : ''}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              type="button"
              className={filter === 'completed' ? 'active' : ''}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
          </div>
        </div>

        {loading ? (
          <div className="assignments-state-card">
            <div className="state-spinner" />
            <p>Loading your assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="assignments-state-card empty-state">
            <div className="empty-state-icon">✓</div>
            <h3>No assignments yet</h3>
            <p>
              Add an assignment to keep your coursework and deadlines organized.
            </p>
            <button
              type="button"
              className="page-primary-button"
              onClick={openAddForm}
            >
              <span>+</span> Add your first assignment
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="assignments-state-card empty-state">
            <div className="empty-state-icon">✓</div>
            <h3>No matching assignments</h3>
            <p>Try selecting a different filter.</p>
          </div>
        ) : (
          <div className="assignments-list">
            {filteredAssignments.map((assignment) => {
              const daysUntil = getDaysUntilDue(assignment.due_date)
              const overdue =
                !assignment.completed &&
                daysUntil !== null &&
                daysUntil < 0

              return (
                <article
                  key={assignment.id}
                  className={`assignment-card ${
                    assignment.completed ? 'assignment-completed' : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`assignment-check ${
                      assignment.completed ? 'checked' : ''
                    }`}
                    onClick={() => handleToggleCompleted(assignment)}
                    disabled={togglingId === assignment.id}
                    aria-label={
                      assignment.completed
                        ? `Mark ${assignment.title} as pending`
                        : `Mark ${assignment.title} as completed`
                    }
                    aria-pressed={assignment.completed}
                  >
                    {assignment.completed ? '✓' : ''}
                  </button>

                  <div className="assignment-card-content">
                    <div className="assignment-card-heading">
                      <h3>{assignment.title}</h3>
                      <span
                        className={`assignment-due-label ${
                          overdue ? 'assignment-overdue' : ''
                        } ${
                          assignment.completed
                            ? 'assignment-done-label'
                            : ''
                        }`}
                      >
                        {getDueLabel(assignment)}
                      </span>
                    </div>

                    <p className="assignment-subject">
                      {getSubjectName(assignment.subject_id)}
                    </p>

                    {assignment.description && (
                      <p className="assignment-description">
                        {assignment.description}
                      </p>
                    )}

                    <div className="assignment-card-footer">
                      <span>{formatDueDate(assignment.due_date)}</span>

                      <div className="assignment-actions">
                        <button
                          type="button"
                          onClick={() => openEditForm(assignment)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-action"
                          onClick={() => handleDelete(assignment)}
                          disabled={deletingId === assignment.id}
                        >
                          {deletingId === assignment.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default AssignmentsPage