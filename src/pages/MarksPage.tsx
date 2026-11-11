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
import { getErrorMessage } from '../lib/errors'
import { parseDay, toDateKey } from '../lib/dates'

const MAX_NAME_LENGTH = 100

type SortMode = 'oldest' | 'newest' | 'highest' | 'lowest'

// Avoids long floating-point tails such as 0.30000000000000004
function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}

function percentOf(mark: Mark): number {
  return mark.max_marks > 0
    ? (mark.marks_obtained / mark.max_marks) * 100
    : 0
}

function getPercentClass(percent: number): string {
  if (percent >= 75) return 'marks-percent-good'
  if (percent >= 50) return 'marks-percent-ok'

  return 'marks-percent-low'
}

// Oldest first; undated assessments go last, in the order they were added.
function compareChronological(a: Mark, b: Mark): number {
  if (a.assessment_date && b.assessment_date) {
    const byDate = toDateKey(a.assessment_date).localeCompare(
      toDateKey(b.assessment_date)
    )

    if (byDate !== 0) return byDate
  } else if (a.assessment_date) {
    return -1
  } else if (b.assessment_date) {
    return 1
  }

  return a.created_at.localeCompare(b.created_at)
}

function MarksPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [loaded, setLoaded] = useState<{
    subjectId: string
    marks: Mark[]
  }>({ subjectId: '', marks: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMark, setEditingMark] = useState<Mark | null>(null)

  const [assessmentName, setAssessmentName] = useState('')
  const [marksObtained, setMarksObtained] = useState('')
  const [maxMarks, setMaxMarks] = useState('')
  const [assessmentDate, setAssessmentDate] = useState('')

  const [sortMode, setSortMode] = useState<SortMode>('oldest')
  const [targetPercent, setTargetPercent] = useState('75')
  const [nextMax, setNextMax] = useState('50')

  useEffect(() => {
    let isMounted = true

    async function loadSubjects() {
      try {
        const data = await getSubjects()

        if (!isMounted) return

        setSubjects(data)

        if (data.length > 0) {
          setSelectedSubjectId(data[0].id)
        }
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

  useEffect(() => {
    if (!selectedSubjectId) {
      return
    }

    // The flag stops a slow response for a previous subject from
    // overwriting the marks of the subject now on screen.
    let isCurrent = true

    async function loadSubjectMarks() {
      try {
        const data = await getMarks(selectedSubjectId)

        if (isCurrent) {
          setLoaded({ subjectId: selectedSubjectId, marks: data })
        }
      } catch (err) {
        if (isCurrent) {
          setError(getErrorMessage(err, 'Unable to load marks.'))
          setLoaded({ subjectId: selectedSubjectId, marks: [] })
        }
      }
    }

    void loadSubjectMarks()

    return () => {
      isCurrent = false
    }
  }, [selectedSubjectId])

  const marks =
    selectedSubjectId && loaded.subjectId === selectedSubjectId
      ? loaded.marks
      : []

  const marksLoading =
    Boolean(selectedSubjectId) && loaded.subjectId !== selectedSubjectId

  function setMarks(updater: (current: Mark[]) => Mark[]) {
    setLoaded((current) => ({
      subjectId: current.subjectId,
      marks: updater(current.marks),
    }))
  }

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
    setAssessmentDate(
      mark.assessment_date ? toDateKey(mark.assessment_date) : ''
    )
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

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(
        `Assessment name must be ${MAX_NAME_LENGTH} characters or fewer.`
      )
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
          // null clears the date; an empty string would be rejected by the database
          assessment_date: assessmentDate || null,
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
      setError(getErrorMessage(err, 'Unable to save marks.'))
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
      setError(getErrorMessage(err, 'Unable to delete assessment.'))
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

  // ---- insights -------------------------------------------------------

  const chronological = [...marks].sort(compareChronological)

  const best = chronological.reduce<Mark | null>(
    (top, mark) => (!top || percentOf(mark) > percentOf(top) ? mark : top),
    null
  )

  const lowest = chronological.reduce<Mark | null>(
    (low, mark) => (!low || percentOf(mark) < percentOf(low) ? mark : low),
    null
  )

  const latest = chronological[chronological.length - 1]

  let trendPoints: number | null = null

  if (chronological.length >= 2) {
    const earlier = chronological.slice(0, -1)
    const earlierAverage =
      earlier.reduce((sum, mark) => sum + percentOf(mark), 0) /
      earlier.length

    trendPoints = percentOf(latest) - earlierAverage
  }

  const visibleMarks = [...marks].sort((a, b) => {
    if (sortMode === 'newest') return compareChronological(b, a)
    if (sortMode === 'highest') return percentOf(b) - percentOf(a)
    if (sortMode === 'lowest') return percentOf(a) - percentOf(b)

    return compareChronological(a, b)
  })

  // ---- target calculator ------------------------------------------------

  const target = Number(targetPercent)
  const nextMaxMarks = Number(nextMax)
  const targetValid =
    targetPercent.trim() !== '' &&
    nextMax.trim() !== '' &&
    Number.isFinite(target) &&
    target > 0 &&
    target <= 100 &&
    Number.isFinite(nextMaxMarks) &&
    nextMaxMarks > 0

  let targetMessage = 'Enter a target between 1 and 100, and the marks of the next assessment.'

  if (targetValid) {
    const required =
      (target / 100) * (totalMaximum + nextMaxMarks) - totalObtained

    if (required <= 0) {
      targetMessage = `You are already at or above ${target}% overall. Even a zero on the next assessment would keep you there.`
    } else if (required > nextMaxMarks) {
      targetMessage = `Even full marks on a ${formatNumber(nextMaxMarks)}-mark assessment would not reach ${target}% overall. You would need more assessments.`
    } else {
      const needed = Math.ceil(required * 100) / 100

      targetMessage = `You need ${formatNumber(needed)} out of ${formatNumber(nextMaxMarks)} (${((needed / nextMaxMarks) * 100).toFixed(1)}%) on the next assessment to reach ${target}% overall.`
    }
  }

  // ---- progress chart ---------------------------------------------------

  const chartWidth = 300
  const chartHeight = 90
  const chartPoints = chronological.map((mark, index) => ({
    id: mark.id,
    label: `${mark.assessment_name}: ${percentOf(mark).toFixed(1)}%`,
    x:
      chronological.length === 1
        ? chartWidth / 2
        : 12 + (index / (chronological.length - 1)) * (chartWidth - 24),
    y: 8 + (1 - Math.min(100, percentOf(mark)) / 100) * (chartHeight - 16),
  }))

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
                  {formatNumber(totalObtained)} / {formatNumber(totalMaximum)}
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

          {marks.length > 0 && best && lowest && latest && (
            <>
              <section className="marks-summary marks-insights">
                <div className="marks-summary-card">
                  <span>Highest</span>
                  <strong>{percentOf(best).toFixed(1)}%</strong>
                  <small>{best.assessment_name}</small>
                </div>

                <div className="marks-summary-card">
                  <span>Lowest</span>
                  <strong>{percentOf(lowest).toFixed(1)}%</strong>
                  <small>{lowest.assessment_name}</small>
                </div>

                <div className="marks-summary-card">
                  <span>Latest</span>
                  <strong>{percentOf(latest).toFixed(1)}%</strong>
                  <small
                    className={
                      trendPoints === null
                        ? undefined
                        : trendPoints >= 0
                          ? 'marks-trend-up'
                          : 'marks-trend-down'
                    }
                  >
                    {trendPoints === null
                      ? latest.assessment_name
                      : `${trendPoints >= 0 ? '▲' : '▼'} ${Math.abs(
                          trendPoints
                        ).toFixed(1)} pts vs earlier average`}
                  </small>
                </div>
              </section>

              {chronological.length >= 2 && (
                <section className="marks-chart-card">
                  <h2>Progress over time</h2>

                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    role="img"
                    aria-label="Assessment percentages in date order"
                    preserveAspectRatio="none"
                  >
                    <line
                      className="marks-chart-guide"
                      x1="0"
                      x2={chartWidth}
                      y1={8 + (chartHeight - 16) / 2}
                      y2={8 + (chartHeight - 16) / 2}
                    />

                    <polyline
                      className="marks-chart-line"
                      points={chartPoints
                        .map((point) => `${point.x},${point.y}`)
                        .join(' ')}
                    />

                    {chartPoints.map((point) => (
                      <circle
                        key={point.id}
                        className="marks-chart-dot"
                        cx={point.x}
                        cy={point.y}
                        r="3.5"
                      >
                        <title>{point.label}</title>
                      </circle>
                    ))}
                  </svg>

                  <p className="marks-chart-note">
                    Each dot is one assessment, oldest on the left. The
                    dashed line marks 50%.
                  </p>
                </section>
              )}
            </>
          )}

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
                      maxLength={MAX_NAME_LENGTH}
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

              {marks.length > 1 && (
                <div className="marks-sort">
                  <label htmlFor="marks-sort">Sort by</label>
                  <select
                    id="marks-sort"
                    value={sortMode}
                    onChange={(event) =>
                      setSortMode(event.target.value as SortMode)
                    }
                  >
                    <option value="oldest">Date (oldest first)</option>
                    <option value="newest">Date (newest first)</option>
                    <option value="highest">Percentage (high to low)</option>
                    <option value="lowest">Percentage (low to high)</option>
                  </select>
                </div>
              )}
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
                    {visibleMarks.map((mark) => {
                      const score = percentOf(mark)

                      return (
                        <tr key={mark.id}>
                          <td>
                            <strong>{mark.assessment_name}</strong>
                          </td>
                          <td>
                            {mark.assessment_date
                              ? parseDay(
                                  mark.assessment_date
                                ).toLocaleDateString()
                              : '—'}
                          </td>
                          <td>
                            {formatNumber(mark.marks_obtained)} /{' '}
                            {formatNumber(mark.max_marks)}
                          </td>
                          <td>
                            <span
                              className={`marks-percent ${getPercentClass(
                                score
                              )}`}
                            >
                              {score.toFixed(1)}%
                            </span>

                            <div className="marks-bar" aria-hidden="true">
                              <span
                                className={getPercentClass(score)}
                                style={{
                                  width: `${Math.min(100, score)}%`,
                                }}
                              />
                            </div>
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

          {marks.length > 0 && (
            <section className="marks-target-card">
              <h2>Target planner</h2>

              <p className="marks-target-intro">
                Find out what you need on the next assessment to reach a
                goal for {selectedSubject?.name ?? 'this subject'}.
              </p>

              <div className="marks-target-fields">
                <div className="form-field">
                  <label htmlFor="target-percent">Target overall (%)</label>
                  <input
                    id="target-percent"
                    type="number"
                    min="1"
                    max="100"
                    step="any"
                    value={targetPercent}
                    onChange={(event) => setTargetPercent(event.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="target-next-max">
                    Next assessment is out of
                  </label>
                  <input
                    id="target-next-max"
                    type="number"
                    min="1"
                    step="any"
                    value={nextMax}
                    onChange={(event) => setNextMax(event.target.value)}
                  />
                </div>
              </div>

              <p className="marks-target-result">{targetMessage}</p>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default MarksPage
