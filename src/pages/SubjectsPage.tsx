import { useEffect, useState } from 'react'
import {
  addSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from '../services/subjectService'
import type { Subject } from '../types/database'
import { getErrorMessage } from '../lib/errors'
import { daysFromToday } from '../lib/dates'
import { getAllMarks } from '../services/markService'
import { getExams } from '../services/examService'
import { getAssignments } from '../services/assignmentService'
import { getMaterials } from '../services/materialService'
import { getStudySessions } from '../services/SessionService'

const MAX_NAME_LENGTH = 100
const MAX_CODE_LENGTH = 20
const MAX_CREDITS = 40

type SortMode = 'added' | 'name' | 'credits' | 'average'

type SubjectStats = {
  marks: number
  obtained: number
  maximum: number
  exams: number
  upcomingExams: number
  assignments: number
  pendingAssignments: number
  sessions: number
  materials: number
}

function emptyStats(): SubjectStats {
  return {
    marks: 0,
    obtained: 0,
    maximum: 0,
    exams: 0,
    upcomingExams: 0,
    assignments: 0,
    pendingAssignments: 0,
    sessions: 0,
    materials: 0,
  }
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function getAverage(stats?: SubjectStats): number | null {
  return stats && stats.maximum > 0
    ? (stats.obtained / stats.maximum) * 100
    : null
}

// Gives each subject its own soft colour, always the same for the same name.
function getSubjectHue(name: string): number {
  let hue = 0

  for (const character of name) {
    hue = (hue * 31 + character.charCodeAt(0)) % 360
  }

  return hue
}

function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingSubject, setEditingSubject] =
    useState<Subject | null>(null)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [credits, setCredits] = useState('')

  const [saving, setSaving] = useState(false)

  const [stats, setStats] = useState<Record<string, SubjectStats>>({})
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('added')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadSubjects() {
      try {
        const data = await getSubjects()

        if (isMounted) {
          setSubjects(data)
          setLoading(false)
        }

        // Related data only feeds the little stats on each card, so a
        // failure here must not break the page.
        const [marks, exams, assignments, sessions, materials] =
          await Promise.allSettled([
            getAllMarks(),
            getExams(),
            getAssignments(),
            getStudySessions(),
            getMaterials(),
          ])

        if (!isMounted) {
          return
        }

        const next: Record<string, SubjectStats> = {}

        function entry(subjectId: string | null): SubjectStats | null {
          if (!subjectId) return null

          next[subjectId] ??= emptyStats()

          return next[subjectId]
        }

        if (marks.status === 'fulfilled') {
          for (const mark of marks.value) {
            const item = entry(mark.subject_id)

            if (item) {
              item.marks += 1
              item.obtained += mark.marks_obtained
              item.maximum += mark.max_marks
            }
          }
        }

        if (exams.status === 'fulfilled') {
          for (const exam of exams.value) {
            const item = entry(exam.subject_id)

            if (item) {
              item.exams += 1

              if (daysFromToday(exam.exam_date) >= 0) {
                item.upcomingExams += 1
              }
            }
          }
        }

        if (assignments.status === 'fulfilled') {
          for (const assignment of assignments.value) {
            const item = entry(assignment.subject_id)

            if (item) {
              item.assignments += 1

              if (!assignment.completed) {
                item.pendingAssignments += 1
              }
            }
          }
        }

        if (sessions.status === 'fulfilled') {
          for (const session of sessions.value) {
            const item = entry(session.subject_id)

            if (item) {
              item.sessions += 1
            }
          }
        }

        if (materials.status === 'fulfilled') {
          for (const material of materials.value) {
            const item = entry(material.subject_id)

            if (item) {
              item.materials += 1
            }
          }
        }

        setStats(next)
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Unable to load subjects.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadSubjects()

    return () => {
      isMounted = false
    }
  }, [])

  function resetForm() {
    setName('')
    setCode('')
    setCredits('')
    setEditingSubject(null)
    setShowForm(false)
  }

  function openAddForm() {
    setName('')
    setCode('')
    setCredits('')
    setEditingSubject(null)
    setShowForm(true)
    setError('')
  }

  function openEditForm(subject: Subject) {
    setEditingSubject(subject)
    setName(subject.name)
    setCode(subject.code ?? '')
    setCredits(
      subject.credits !== null
        ? String(subject.credits)
        : ''
    )
    setShowForm(true)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')

    const trimmedName = name.trim()
    const trimmedCode = code.trim()

    if (!trimmedName) {
      setError('Please enter a subject name.')
      return
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Subject name must be ${MAX_NAME_LENGTH} characters or fewer.`)
      return
    }

    if (trimmedCode.length > MAX_CODE_LENGTH) {
      setError(`Subject code must be ${MAX_CODE_LENGTH} characters or fewer.`)
      return
    }

    const others = subjects.filter(
      (subject) => subject.id !== editingSubject?.id
    )

    if (
      others.some(
        (subject) =>
          subject.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError(`You already have a subject named "${trimmedName}".`)
      return
    }

    if (
      trimmedCode &&
      others.some(
        (subject) =>
          subject.code?.trim().toLowerCase() === trimmedCode.toLowerCase()
      )
    ) {
      setError(`Another subject already uses the code "${trimmedCode}".`)
      return
    }

    let parsedCredits: number | undefined

    if (credits.trim()) {
      parsedCredits = Number(credits)

      if (
        !Number.isFinite(parsedCredits) ||
        parsedCredits < 0 ||
        parsedCredits > MAX_CREDITS
      ) {
        setError(`Credits must be a number between 0 and ${MAX_CREDITS}.`)
        return
      }
    }

    try {
      setSaving(true)

      if (editingSubject) {
        const updated = await updateSubject(
          editingSubject.id,
          {
            name: trimmedName,
            // null clears the field; undefined would silently keep the old value
            code: trimmedCode || null,
            credits: parsedCredits ?? null,
          }
        )

        setSubjects((current) =>
          current.map((subject) =>
            subject.id === updated.id
              ? updated
              : subject
          )
        )
      } else {
        const created = await addSubject(
          trimmedName,
          trimmedCode || undefined,
          parsedCredits
        )

        setSubjects((current) => [
          ...current,
          created,
        ])
      }

      resetForm()
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          `Unable to ${
            editingSubject
              ? 'update'
              : 'create'
          } subject.`
        )
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(subject: Subject) {
    const item = stats[subject.id]

    const linked = item
      ? [
          item.marks > 0 ? plural(item.marks, 'mark') : '',
          item.exams > 0 ? plural(item.exams, 'exam') : '',
          item.assignments > 0
            ? plural(item.assignments, 'assignment')
            : '',
          item.sessions > 0
            ? plural(item.sessions, 'study session')
            : '',
          item.materials > 0 ? plural(item.materials, 'material') : '',
        ].filter(Boolean)
      : []

    const confirmed = window.confirm(
      `Delete "${subject.name}"?` +
        (linked.length > 0
          ? `\n\nIt has ${linked.join(', ')} linked to it. ` +
            'Deleting the subject may remove or unlink them.'
          : '')
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(subject.id)
      setError('')

      await deleteSubject(subject.id)

      setSubjects((current) =>
        current.filter(
          (item) => item.id !== subject.id
        )
      )
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to delete subject.')
      )
    } finally {
      setDeletingId(null)
    }
  }

  const query = search.trim().toLowerCase()

  const visibleSubjects = subjects
    .filter(
      (subject) =>
        !query ||
        `${subject.name} ${subject.code ?? ''}`
          .toLowerCase()
          .includes(query)
    )
    .sort((a, b) => {
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sortMode === 'credits') {
        return (b.credits ?? -1) - (a.credits ?? -1)
      }

      if (sortMode === 'average') {
        return (
          (getAverage(stats[b.id]) ?? -1) -
          (getAverage(stats[a.id]) ?? -1)
        )
      }

      return 0
    })

  const totalCredits = subjects.reduce(
    (total, subject) => total + (subject.credits ?? 0),
    0
  )

  return (
    <main className="page-main subjects-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">
            ACADEMIC ORGANIZATION
          </p>

          <h1>Subjects</h1>

          <p className="page-description">
            Keep all your subjects organized in one
            place.
          </p>
        </div>

        <button
          type="button"
          className="page-primary-button"
          onClick={openAddForm}
        >
          <span>+</span>
          Add subject
        </button>
      </header>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {showForm && (
        <section className="subject-form-card">
          <div className="subject-form-header">
            <div>
              <p className="page-eyebrow">
                {editingSubject
                  ? 'EDIT SUBJECT'
                  : 'NEW SUBJECT'}
              </p>

              <h2>
                {editingSubject
                  ? 'Update subject'
                  : 'Add a subject'}
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

          <form
            className="subject-form"
            onSubmit={handleSubmit}
          >
            <div className="subject-form-grid">
              <div className="form-field form-field-wide">
                <label htmlFor="subject-name">
                  Subject name
                </label>

                <input
                  id="subject-name"
                  type="text"
                  placeholder="e.g. Database Management Systems"
                  maxLength={MAX_NAME_LENGTH}
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  disabled={saving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="subject-code">
                  Subject code
                </label>

                <input
                  id="subject-code"
                  type="text"
                  placeholder="e.g. CS301"
                  maxLength={MAX_CODE_LENGTH}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value)
                  }
                  disabled={saving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="subject-credits">
                  Credits
                </label>

                <input
                  id="subject-credits"
                  type="number"
                  min="0"
                  max={MAX_CREDITS}
                  step="0.5"
                  placeholder="e.g. 4"
                  value={credits}
                  onChange={(e) =>
                    setCredits(e.target.value)
                  }
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
                  : editingSubject
                    ? 'Save changes'
                    : 'Add subject'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="subjects-section">
        <div className="section-heading">
          <div>
            <h2>Your subjects</h2>

            {!loading && (
              <p>
                {subjects.length === 0
                  ? 'No subjects added yet.'
                  : `${plural(subjects.length, 'subject')}${
                      totalCredits > 0
                        ? ` · ${totalCredits} credits in total`
                        : ''
                    }`}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="subjects-state-card">
            <div className="state-spinner" />
            <p>Loading your subjects...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="subjects-state-card empty-state">
            <div className="empty-state-icon">
              ◈
            </div>

            <h3>No subjects yet</h3>

            <p>
              Add your first subject to start
              organizing your academic workspace.
            </p>

            <button
              type="button"
              className="page-primary-button"
              onClick={openAddForm}
            >
              <span>+</span>
              Add your first subject
            </button>
          </div>
        ) : (
          <>
          {subjects.length > 1 && (
            <div className="subjects-toolbar">
              <div className="form-field">
                <label htmlFor="subjects-search">Search subjects</label>
                <input
                  id="subjects-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or code"
                />
              </div>

              <div className="form-field">
                <label htmlFor="subjects-sort">Sort by</label>
                <select
                  id="subjects-sort"
                  value={sortMode}
                  onChange={(e) =>
                    setSortMode(e.target.value as SortMode)
                  }
                >
                  <option value="added">Order added</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="credits">Credits (high to low)</option>
                  <option value="average">Average mark (high to low)</option>
                </select>
              </div>
            </div>
          )}

          {visibleSubjects.length === 0 && (
            <div className="subjects-state-card empty-state">
              <h3>No subjects match “{search.trim()}”</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            </div>
          )}

          <div className="subjects-grid">
            {visibleSubjects.map((subject) => (
              <article
                key={subject.id}
                className="subject-card"
              >
                <div className="subject-card-top">
                  <div
                    className="subject-symbol"
                    style={{
                      background: `hsl(${getSubjectHue(subject.name)} 40% 92%)`,
                      color: `hsl(${getSubjectHue(subject.name)} 35% 32%)`,
                    }}
                  >
                    {subject.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="subject-actions">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(subject)
                      }
                      aria-label={`Edit ${subject.name}`}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-action"
                      onClick={() =>
                        handleDelete(subject)
                      }
                      disabled={
                        deletingId === subject.id
                      }
                      aria-label={`Delete ${subject.name}`}
                    >
                      {deletingId === subject.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="subject-card-content">
                  <h3>{subject.name}</h3>

                  <div className="subject-meta">
                    {subject.code && (
                      <span>
                        {subject.code}
                      </span>
                    )}

                    {subject.credits !== null && (
                      <span>
                        {subject.credits}{' '}
                        {subject.credits === 1
                          ? 'credit'
                          : 'credits'}
                      </span>
                    )}
                  </div>

                  <div className="subject-stats">
                    {(() => {
                      const item = stats[subject.id]
                      const average = getAverage(item)
                      const chips = [
                        average !== null
                          ? `${Math.round(average)}% average`
                          : '',
                        item?.upcomingExams
                          ? plural(item.upcomingExams, 'upcoming exam')
                          : '',
                        item?.pendingAssignments
                          ? plural(item.pendingAssignments, 'pending task')
                          : '',
                        item?.materials
                          ? plural(item.materials, 'material')
                          : '',
                      ].filter(Boolean)

                      return chips.length > 0 ? (
                        chips.map((chip) => (
                          <span key={chip}>{chip}</span>
                        ))
                      ) : (
                        <small>Nothing linked yet</small>
                      )
                    })()}
                  </div>
                </div>
              </article>
            ))}
          </div>
          </>
        )}
      </section>
    </main>
  )
}

export default SubjectsPage