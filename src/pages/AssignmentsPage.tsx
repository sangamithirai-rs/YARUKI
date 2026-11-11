import { useEffect, useState, type FormEvent } from 'react'
import {
  addAssignment,
  deleteAssignment,
  getAssignments,
  updateAssignment,
} from '../services/assignmentService'
import type { Assignment } from '../services/assignmentService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'
import { getErrorMessage } from '../lib/errors'
import {
  dateKeyFromToday,
  daysFromToday,
  parseDay,
  toDateKey,
} from '../lib/dates'

const MAX_TITLE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 1000

type AssignmentFilter = 'all' | 'pending' | 'overdue' | 'completed'

type AssignmentGroup = {
  key: string
  label: string
  items: Assignment[]
}

function getDays(assignment: Assignment): number | null {
  return assignment.due_date ? daysFromToday(assignment.due_date) : null
}

function isOverdue(assignment: Assignment): boolean {
  const days = getDays(assignment)

  return !assignment.completed && days !== null && days < 0
}

function formatDueDate(date: string | null): string {
  if (!date) return 'No due date'

  return parseDay(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getDueLabel(assignment: Assignment): string {
  if (assignment.completed) return 'Completed'

  const days = getDays(assignment)

  if (days === null) return 'No due date'

  if (days < 0) {
    const late = Math.abs(days)

    return `${late} ${late === 1 ? 'day' : 'days'} overdue`
  }

  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'

  return `${days} days left`
}

// Earliest due date first; assignments without a date go last.
function byDueDate(a: Assignment, b: Assignment): number {
  if (!a.due_date && !b.due_date) return 0
  if (!a.due_date) return 1
  if (!b.due_date) return -1

  return toDateKey(a.due_date).localeCompare(toDateKey(b.due_date))
}

function buildGroups(items: Assignment[]): AssignmentGroup[] {
  const pending = items.filter((assignment) => !assignment.completed)

  const overdue = pending.filter(isOverdue).sort(byDueDate)

  const soon = pending
    .filter((assignment) => {
      const days = getDays(assignment)

      return days !== null && days >= 0 && days <= 7
    })
    .sort(byDueDate)

  const later = pending
    .filter((assignment) => {
      const days = getDays(assignment)

      return days !== null && days > 7
    })
    .sort(byDueDate)

  const undated = pending.filter((assignment) => !assignment.due_date)

  const done = items
    .filter((assignment) => assignment.completed)
    .sort((a, b) => byDueDate(b, a))

  return [
    { key: 'overdue', label: 'Overdue', items: overdue },
    { key: 'soon', label: 'Due in the next 7 days', items: soon },
    { key: 'later', label: 'Later', items: later },
    { key: 'undated', label: 'No due date', items: undated },
    { key: 'done', label: 'Completed', items: done },
  ].filter((group) => group.items.length > 0)
}

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
  const [completed, setCompleted] = useState(false)

  const [filter, setFilter] = useState<AssignmentFilter>('all')
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPageData() {
      try {
        const [assignmentData, subjectData] = await Promise.all([
          getAssignments(),
          getSubjects(),
        ])

        if (isMounted) {
          setAssignments(assignmentData)
          setSubjects(subjectData)
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Unable to load assignments.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadPageData()

    return () => {
      isMounted = false
    }
  }, [])

  function resetForm() {
    setTitle('')
    setDescription('')
    setDueDate('')
    setSubjectId('')
    setCompleted(false)
    setEditingAssignment(null)
    setShowForm(false)
  }

  function openAddForm() {
    setTitle('')
    setDescription('')
    setDueDate('')
    setSubjectId('')
    setCompleted(false)
    setEditingAssignment(null)
    setError('')
    setShowForm(true)
  }

  function openEditForm(assignment: Assignment) {
    setEditingAssignment(assignment)
    setTitle(assignment.title)
    setDescription(assignment.description ?? '')
    setDueDate(assignment.due_date ? toDateKey(assignment.due_date) : '')
    setSubjectId(assignment.subject_id ?? '')
    setCompleted(assignment.completed)
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

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
      return
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
      )
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
          completed,
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
          subjectId || undefined,
          completed
        )

        setAssignments((current) => [...current, created])
      }

      resetForm()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save assignment.'))
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
        current.map((item) => (item.id === updated.id ? updated : item))
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update assignment status.'))
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
      setError(getErrorMessage(err, 'Unable to delete assignment.'))
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

  const pendingCount = assignments.filter(
    (assignment) => !assignment.completed
  ).length

  const completedCount = assignments.length - pendingCount
  const overdueCount = assignments.filter(isOverdue).length

  const completionRate =
    assignments.length > 0
      ? Math.round((completedCount / assignments.length) * 100)
      : 0

  const query = search.trim().toLowerCase()

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'pending' && assignment.completed) return false
    if (filter === 'completed' && !assignment.completed) return false
    if (filter === 'overdue' && !isOverdue(assignment)) return false

    if (subjectFilter === 'none' && assignment.subject_id) return false

    if (
      subjectFilter &&
      subjectFilter !== 'none' &&
      assignment.subject_id !== subjectFilter
    ) {
      return false
    }

    if (
      query &&
      !`${assignment.title} ${assignment.description ?? ''}`
        .toLowerCase()
        .includes(query)
    ) {
      return false
    }

    return true
  })

  const groups = buildGroups(filteredAssignments)
  const filtersActive =
    filter !== 'all' || query !== '' || subjectFilter !== ''

  function clearFilters() {
    setFilter('all')
    setSearch('')
    setSubjectFilter('')
  }

  const dueDays = dueDate ? daysFromToday(dueDate) : null

  const filterOptions: { value: AssignmentFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: assignments.length },
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'overdue', label: 'Overdue', count: overdueCount },
    { value: 'completed', label: 'Completed', count: completedCount },
  ]

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
          <strong className={overdueCount > 0 ? 'assignment-alert' : undefined}>
            {overdueCount}
          </strong>
        </div>
      </section>

      {assignments.length > 0 && (
        <div className="assignment-progress">
          <div className="assignment-progress-text">
            <span>
              {completedCount} of {assignments.length} completed
            </span>
            <strong>{completionRate}%</strong>
          </div>

          <div className="assignment-progress-bar" aria-hidden="true">
            <span style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      )}

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
                  maxLength={MAX_TITLE_LENGTH}
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
                        setDueDate(dateKeyFromToday(option.offset))
                      }
                      disabled={saving}
                    >
                      {option.label}
                    </button>
                  ))}

                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      disabled={saving}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {dueDays !== null &&
                  dueDays < 0 &&
                  !completed && (
                    <p className="assignment-date-hint">
                      This date has already passed, so the assignment will
                      show as overdue.
                    </p>
                  )}
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
                <label
                  className="assignment-completed-field"
                  htmlFor="assignment-completed"
                >
                  <input
                    id="assignment-completed"
                    type="checkbox"
                    checked={completed}
                    onChange={(event) => setCompleted(event.target.checked)}
                    disabled={saving}
                  />
                  <span>Mark as completed</span>
                </label>
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
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  disabled={saving}
                />
                <p className="assignment-date-hint">
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </p>
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
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filter === option.value ? 'active' : ''}
                onClick={() => setFilter(option.value)}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>

        {!loading && assignments.length > 1 && (
          <div className="assignments-controls">
            <div className="form-field">
              <label htmlFor="assignments-search">Search</label>
              <input
                id="assignments-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or description"
              />
            </div>

            <div className="form-field">
              <label htmlFor="assignments-subject-filter">Subject</label>
              <select
                id="assignments-subject-filter"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                <option value="">All subjects</option>
                <option value="none">No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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
            <p>Try a different search or filter.</p>
            {filtersActive && (
              <button
                type="button"
                className="secondary-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <div className="assignment-group" key={group.key}>
              <h3 className="assignment-group-title">
                {group.label} <span>{group.items.length}</span>
              </h3>

              <div className="assignments-list">
                {group.items.map((assignment) => {
                  const days = getDays(assignment)
                  const overdue = isOverdue(assignment)
                  const soon =
                    !assignment.completed &&
                    days !== null &&
                    days >= 0 &&
                    days <= 2

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
                            } ${soon ? 'assignment-soon' : ''} ${
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
                              className={
                                assignment.completed
                                  ? 'reopen-action'
                                  : 'complete-action'
                              }
                              onClick={() => handleToggleCompleted(assignment)}
                              disabled={togglingId === assignment.id}
                            >
                              {togglingId === assignment.id
                                ? 'Updating...'
                                : assignment.completed
                                  ? '↺ Reopen'
                                  : '✓ Mark complete'}
                            </button>

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
            </div>
          ))
        )}
      </section>
    </main>
  )
}

export default AssignmentsPage
