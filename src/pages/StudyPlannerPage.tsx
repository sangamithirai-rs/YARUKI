import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addStudyPlan,
  deleteStudyPlan,
  getStudyPlans,
  updateStudyPlan,
  type StudyPlan,
} from '../services/studyPlanService'

type PlanForm = {
  title: string
  planDate: string
  description: string
}

const initialForm: PlanForm = {
  title: '',
  planDate: '',
  description: '',
}

function formatPlanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) {
    return date
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function StudyPlannerPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [form, setForm] = useState<PlanForm>(initialForm)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPlans() {
      try {
        setLoading(true)
        setError('')

        const data = await getStudyPlans()

        if (isMounted) {
          setPlans(data)
        }
      } catch (err) {
        console.error('Unable to load study plans:', err)

        if (isMounted) {
          setError('Unable to load your study plans. Please try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPlans()

    return () => {
      isMounted = false
    }
  }, [])

  const today = getToday()

  const upcomingPlans = useMemo(
    () => plans.filter((plan) => plan.plan_date >= today),
    [plans, today]
  )

  const pastPlans = useMemo(
    () => plans.filter((plan) => plan.plan_date < today),
    [plans, today]
  )

  function resetForm() {
    setForm(initialForm)
    setEditingPlanId(null)
    setError('')
  }

  function handleEdit(plan: StudyPlan) {
    setEditingPlanId(plan.id)
    setForm({
      title: plan.title,
      planDate: plan.plan_date,
      description: plan.description ?? '',
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = form.title.trim()
    const description = form.description.trim()

    if (!title || !form.planDate) {
      setError('Please enter a title and choose a date.')
      return
    }

    try {
      setSaving(true)
      setError('')

      if (editingPlanId) {
        const updatedPlan = await updateStudyPlan(editingPlanId, {
          title,
          plan_date: form.planDate,
          description: description || null,
        })

        setPlans((currentPlans) =>
          currentPlans
            .map((plan) =>
              plan.id === editingPlanId ? updatedPlan : plan
            )
            .sort((a, b) => a.plan_date.localeCompare(b.plan_date))
        )
      } else {
        const newPlan = await addStudyPlan(
          title,
          form.planDate,
          description || undefined
        )

        setPlans((currentPlans) =>
          [...currentPlans, newPlan].sort((a, b) =>
            a.plan_date.localeCompare(b.plan_date)
          )
        )
      }

      resetForm()
    } catch (err) {
      console.error('Unable to save study plan:', err)
      setError('Unable to save this study plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(plan: StudyPlan) {
    const confirmed = window.confirm(
      `Delete the study plan "${plan.title}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingPlanId(plan.id)
      setError('')

      await deleteStudyPlan(plan.id)

      setPlans((currentPlans) =>
        currentPlans.filter((item) => item.id !== plan.id)
      )

      if (editingPlanId === plan.id) {
        resetForm()
      }
    } catch (err) {
      console.error('Unable to delete study plan:', err)
      setError('Unable to delete this study plan. Please try again.')
    } finally {
      setDeletingPlanId(null)
    }
  }

  function renderPlanCard(plan: StudyPlan) {
    return (
      <article className="study-plan-card" key={plan.id}>
        <div className="study-plan-card-top">
          <div className="study-plan-date">
            <span className="study-plan-date-label">Study date</span>
            <strong>{formatPlanDate(plan.plan_date)}</strong>
          </div>

          {plan.ai_generated && (
            <span className="study-plan-ai-badge">AI generated</span>
          )}
        </div>

        <div className="study-plan-card-content">
          <h3>{plan.title}</h3>

          {plan.description ? (
            <p>{plan.description}</p>
          ) : (
            <p className="study-plan-no-description">
              No description added.
            </p>
          )}
        </div>

        <div className="study-plan-card-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => handleEdit(plan)}
          >
            Edit
          </button>

          <button
            type="button"
            className="secondary-button study-plan-delete-button"
            onClick={() => handleDelete(plan)}
            disabled={deletingPlanId === plan.id}
          >
            {deletingPlanId === plan.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <main className="page-main study-planner-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">PLAN WITH PURPOSE</p>
          <h1>Study Planner</h1>
          <p className="page-subtitle">
            Organize your study sessions and keep your learning on track.
          </p>
        </div>
      </header>

      <section className="study-planner-overview">
        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">Total plans</span>
          <strong>{plans.length}</strong>
          <span className="study-planner-summary-note">
            All your saved study plans
          </span>
        </article>

        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">Upcoming</span>
          <strong>{upcomingPlans.length}</strong>
          <span className="study-planner-summary-note">
            Plans for today and later
          </span>
        </article>

        <article className="study-planner-summary-card">
          <span className="study-planner-summary-label">Past plans</span>
          <strong>{pastPlans.length}</strong>
          <span className="study-planner-summary-note">
            Plans dated before today
          </span>
        </article>
      </section>

      <section className="subject-form-card study-planner-form-card">
        <div className="subject-form-header">
          <div>
            <p className="page-eyebrow">
              {editingPlanId ? 'UPDATE YOUR PLAN' : 'MAKE A PLAN'}
            </p>
            <h2>{editingPlanId ? 'Edit study plan' : 'Create a study plan'}</h2>
          </div>
        </div>

        <form className="subject-form" onSubmit={handleSubmit}>
          <div className="study-planner-form-grid">
            <div className="form-field">
              <label htmlFor="study-plan-title">Plan title</label>
              <input
                id="study-plan-title"
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Revise Biology chapter 3"
                maxLength={120}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="study-plan-date">Study date</label>
              <input
                id="study-plan-date"
                type="date"
                value={form.planDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    planDate: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="form-field study-planner-description-field">
              <label htmlFor="study-plan-description">
                Description <span>(optional)</span>
              </label>
              <textarea
                id="study-plan-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Add topics, goals, or notes for this study plan..."
                rows={3}
              />
            </div>
          </div>

          {error && <p className="page-error">{error}</p>}

          <div className="subject-form-actions">
            {editingPlanId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="page-primary-button"
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : editingPlanId
                  ? 'Save changes'
                  : 'Add study plan'}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="study-planner-state-card">
          <span className="state-spinner" />
          <p>Loading your study plans...</p>
        </div>
      ) : (
        <>
          <section className="study-planner-section">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">YOUR SCHEDULE</p>
                <h2>Upcoming study plans</h2>
              </div>
              <span className="study-planner-count">
                {upcomingPlans.length}
              </span>
            </div>

            {upcomingPlans.length > 0 ? (
              <div className="study-plans-grid">
                {upcomingPlans.map(renderPlanCard)}
              </div>
            ) : (
              <div className="study-planner-state-card">
                <h3>No upcoming plans yet</h3>
                <p>
                  Add a study plan above to organize what you want to work on.
                </p>
              </div>
            )}
          </section>

          {pastPlans.length > 0 && (
            <section className="study-planner-section">
              <div className="section-heading">
                <div>
                  <p className="page-eyebrow">PREVIOUS DATES</p>
                  <h2>Past study plans</h2>
                </div>
                <span className="study-planner-count">
                  {pastPlans.length}
                </span>
              </div>

              <div className="study-plans-grid">
                {pastPlans.map(renderPlanCard)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}