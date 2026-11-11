import { useEffect, useState } from 'react'
import {
  addSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from '../services/subjectService'
import type { Subject } from '../types/database'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadSubjects() {
    try {
      setLoading(true)
      setError('')

      const data = await getSubjects()
      setSubjects(data)
    } catch (err: any) {
      setError(err.message || 'Unable to load subjects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
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

    let parsedCredits: number | undefined

    if (credits.trim()) {
      parsedCredits = Number(credits)

      if (
        !Number.isFinite(parsedCredits) ||
        parsedCredits < 0
      ) {
        setError('Credits must be a valid positive number.')
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
            code: trimmedCode || undefined,
            credits: parsedCredits,
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
    } catch (err: any) {
      setError(
        err.message ||
          `Unable to ${
            editingSubject
              ? 'update'
              : 'create'
          } subject.`
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(subject: Subject) {
    const confirmed = window.confirm(
      `Delete "${subject.name}"?`
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
    } catch (err: any) {
      setError(
        err.message || 'Unable to delete subject.'
      )
    } finally {
      setDeletingId(null)
    }
  }

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
                  step="1"
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
                  : `${subjects.length} ${
                      subjects.length === 1
                        ? 'subject'
                        : 'subjects'
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
          <div className="subjects-grid">
            {subjects.map((subject) => (
              <article
                key={subject.id}
                className="subject-card"
              >
                <div className="subject-card-top">
                  <div className="subject-symbol">
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default SubjectsPage