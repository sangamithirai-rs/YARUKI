
import { useEffect, useState } from 'react'
import {
  addMark,
  deleteMark,
  getMarks,
  updateMark,
} from '../services/markService'
import type { Mark } from '../services/markService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'

function MarksPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [marks, setMarks] = useState<Mark[]>([])
  const [loading, setLoading] = useState(true)
  const [marksLoading, setMarksLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMark, setEditingMark] = useState<Mark | null>(null)

  const [assessmentName, setAssessmentName] = useState('')
  const [marksObtained, setMarksObtained] = useState('')
  const [maxMarks, setMaxMarks] = useState('')
  const [assessmentDate, setAssessmentDate] = useState('')

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoading(true)
        setError('')
        const data = await getSubjects()
        setSubjects(data)

        if (data.length > 0) {
          setSelectedSubjectId(data[0].id)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load subjects.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadSubjects()
  }, [])

  useEffect(() => {
    if (!selectedSubjectId) {
      setMarks([])
      return
    }

    async function loadSubjectMarks() {
      try {
        setMarksLoading(true)
        setError('')
        const data = await getMarks(selectedSubjectId)
        setMarks(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load marks.'
        )
      } finally {
        setMarksLoading(false)
      }
    }

    loadSubjectMarks()
  }, [selectedSubjectId])

  function resetForm() {
    setAssessmentName('')
    setMarksObtained('')
    setMaxMarks('')
    setAssessmentDate('')
    setEditingMark(null)
    setShowForm(false)
  }

  function openAddForm() {
    setAssessmentName('')
    setMarksObtained('')
    setMaxMarks('')
    setAssessmentDate('')
    setEditingMark(null)
    setError('')
    setShowForm(true)
  }

  function openEditForm(mark: Mark) {
    setEditingMark(mark)
    setAssessmentName(mark.assessment_name)
    setMarksObtained(String(mark.marks_obtained))
    setMaxMarks(String(mark.max_marks))
    setAssessmentDate(mark.assessment_date ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!selectedSubjectId) {
      setError('Please add a subject before recording marks.')
      return
    }

    const trimmedName = assessmentName.trim()
    const obtained = Number(marksObtained)
    const maximum = Number(maxMarks)

    if (!trimmedName) {
      setError('Please enter an assessment name.')
      return
    }

    if (
      marksObtained.trim() === '' ||
      maxMarks.trim() === '' ||
      !Number.isFinite(obtained) ||
      !Number.isFinite(maximum) ||
      obtained < 0 ||
      maximum <= 0
    ) {
      setError('Enter valid marks. Maximum marks must be greater than zero.')
      return
    }

    if (obtained > maximum) {
      setError('Marks obtained cannot exceed maximum marks.')
      return
    }

    try {
      setSaving(true)

      if (editingMark) {
        const updated = await updateMark(editingMark.id, {
          assessment_name: trimmedName,
          marks_obtained: obtained,
          max_marks: maximum,
          assessment_date: assessmentDate || '',
        })

        setMarks((current) =>
          current.map((mark) =>
            mark.id === updated.id ? updated : mark
          )
        )
      } else {
        const created = await addMark(
          selectedSubjectId,
          trimmedName,
          obtained,
          maximum,
          assessmentDate || undefined
        )

        setMarks((current) => [...current, created])
      }

      resetForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save marks.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(mark: Mark) {
    const confirmed = window.confirm(
      `Delete the assessment "${mark.assessment_name}"?`
    )

    if (!confirmed) return

    try {
      setDeletingId(mark.id)
      setError('')
      await deleteMark(mark.id)
      setMarks((current) =>
        current.filter((item) => item.id !== mark.id)
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete assessment.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const totalObtained = marks.reduce(
    (total, mark) => total + mark.marks_obtained,
    0
  )

  const totalMaximum = marks.reduce(
    (total, mark) => total + mark.max_marks,
    0
  )

  const percentage =
    totalMaximum > 0
      ? (totalObtained / totalMaximum) * 100
      : 0

  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId
  )

  return (
    <main className="page-main marks-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">ACADEMIC PERFORMANCE</p>
          <h1>Marks</h1>
          <p className="page-description">
            Track your assessment results and monitor your progress.
          </p>
        </div>

        <button
          type="button"
          className="page-primary-button"
          onClick={openAddForm}
          disabled={!selectedSubjectId || loading}
        >
          <span>+</span> Add marks
        </button>
      </header>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <div className="marks-state-card">
          <div className="state-spinner" />
          <p>Loading your subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="marks-state-card empty-state">
          <div className="empty-state-icon">▤</div>
          <h3>Add a subject first</h3>
          <p>
            Create a subject before recording its assessment marks.
          </p>
        </div>
      ) : (
        <>
          <section className="marks-overview">
            <div className="marks-subject-select">
              <label htmlFor="marks-subject">Selected subject</label>
              <select
                id="marks-subject"
                value={selectedSubjectId}
                onChange={(event) => {
                  setSelectedSubjectId(event.target.value)
                  resetForm()
                }}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.code ? ` (${subject.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="marks-summary">
              <div className="marks-summary-card">
                <span>Assessments</span>
                <strong>{marks.length}</strong>
              </div>

              <div className="marks-summary-card">
                <span>Total marks</span>
                <strong>
                  {totalObtained} / {totalMaximum}
                </strong>
              </div>

              <div className="marks-summary-card">
                <span>Overall percentage</span>
                <strong>
                  {totalMaximum > 0 ? `${percentage.toFixed(1)}%` : '—'}
                </strong>
              </div>
            </div>
          </section>

          {showForm && (
            <section className="subject-form-card marks-form-card">
              <div className="subject-form-header">
                <div>
                  <p className="page-eyebrow">
                    {editingMark ? 'EDIT ASSESSMENT' : 'NEW ASSESSMENT'}
                  </p>
                  <h2>
                    {editingMark ? 'Update marks' : 'Add assessment marks'}
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
                <div className="subject-form-grid marks-form-grid">
                  <div className="form-field form-field-wide">
                    <label htmlFor="assessment-name">Assessment name</label>
                    <input
                      id="assessment-name"
                      value={assessmentName}
                      onChange={(event) =>
                        setAssessmentName(event.target.value)
                      }
                      placeholder="e.g. Internal Assessment 1"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="marks-obtained">Marks obtained</label>
                    <input
                      id="marks-obtained"
                      type="number"
                      min="0"
                      step="any"
                      value={marksObtained}
                      onChange={(event) =>
                        setMarksObtained(event.target.value)
                      }
                      placeholder="e.g. 42"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="max-marks">Maximum marks</label>
                    <input
                      id="max-marks"
                      type="number"
                      min="0.01"
                      step="any"
                      value={maxMarks}
                      onChange={(event) => setMaxMarks(event.target.value)}
                      placeholder="e.g. 50"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="assessment-date">Assessment date</label>
                    <input
                      id="assessment-date"
                      type="date"
                      value={assessmentDate}
                      onChange={(event) =>
                        setAssessmentDate(event.target.value)
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
                      : editingMark
                        ? 'Save changes'
                        : 'Add marks'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="marks-section">
            <div className="section-heading">
              <div>
                <h2>Assessment history</h2>
                <p>
                  {selectedSubject?.name ?? 'Selected subject'}
                </p>
              </div>
            </div>

            {marksLoading ? (
              <div className="marks-state-card">
                <div className="state-spinner" />
                <p>Loading assessment marks...</p>
              </div>
            ) : marks.length === 0 ? (
              <div className="marks-state-card empty-state">
                <div className="empty-state-icon">▤</div>
                <h3>No marks recorded</h3>
                <p>
                  Add your first assessment result for this subject.
                </p>
                <button
                  type="button"
                  className="page-primary-button"
                  onClick={openAddForm}
                >
                  <span>+</span> Add assessment
                </button>
              </div>
            ) : (
              <div className="marks-table-wrap">
                <table className="marks-table">
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {marks.map((mark) => {
                      const score =
                        mark.max_marks > 0
                          ? (mark.marks_obtained / mark.max_marks) * 100
                          : 0

                      return (
                        <tr key={mark.id}>
                          <td>
                            <strong>{mark.assessment_name}</strong>
                          </td>
                          <td>
                            {mark.assessment_date
                              ? new Date(
                                  `${mark.assessment_date}T00:00:00`
                                ).toLocaleDateString()
                              : '—'}
                          </td>
                          <td>
                            {mark.marks_obtained} / {mark.max_marks}
                          </td>
                          <td>
                            <span className="marks-percent">
                              {score.toFixed(1)}%
                            </span>
                          </td>
                          <td>
                            <div className="marks-row-actions">
                              <button
                                type="button"
                                onClick={() => openEditForm(mark)}
                                aria-label={`Edit ${mark.assessment_name}`}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="delete-action"
                                onClick={() => handleDelete(mark)}
                                disabled={deletingId === mark.id}
                                aria-label={`Delete ${mark.assessment_name}`}
                              >
                                {deletingId === mark.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default MarksPage