import { useState } from 'react'
import { changePassword, signOut } from '../services/authService'
import { getErrorMessage } from '../lib/errors'

const MIN_PASSWORD_LENGTH = 8

interface ResetPasswordPageProps {
  // Called once the new password is saved and the person chooses to continue
  onDone: () => void
  // Called when they back out; the temporary session is signed out first
  onCancel: () => void
}

// Shown after someone opens the link from the "reset your password" email.
// Supabase has already signed them in with a short-lived session, so the app
// must ask for a new password here instead of going straight to the dashboard.
function ResetPasswordPage({ onDone, onCancel }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      )
      return
    }

    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    try {
      setSaving(true)

      await changePassword(password)

      setPassword('')
      setConfirm('')
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to set your new password.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    try {
      await signOut()
    } catch (err) {
      console.error('Unable to sign out:', err)
    }

    onCancel()
  }

  if (done) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">YARUKI</div>

          <p className="auth-eyebrow">ALL SET</p>

          <h1>Password updated</h1>

          <div className="auth-success" role="status">
            Your new password is saved. You are signed in and ready to go.
          </div>

          <button
            type="button"
            className="auth-primary-button"
            onClick={onDone}
          >
            Continue to YARUKI
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">YARUKI</div>

        <p className="auth-eyebrow">ACCOUNT RECOVERY</p>

        <h1>Choose a new password</h1>

        <p className="auth-description">
          Pick a password you have not used before. You will use it the next
          time you log in.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="new-password">New password</label>

          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={saving}
          />

          <label htmlFor="confirm-password">Confirm new password</label>

          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={saving}
          />

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="auth-primary-button"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save new password'}
          </button>
        </form>

        <p className="auth-switch">
          Changed your mind?{' '}
          <button type="button" onClick={handleCancel}>
            Cancel and log out
          </button>
        </p>
      </section>
    </main>
  )
}

export default ResetPasswordPage
