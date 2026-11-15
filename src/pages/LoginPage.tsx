import { useEffect, useState } from 'react'
import { requestPasswordReset, signIn } from '../services/authService'
import { getErrorMessage } from '../lib/errors'

interface LoginPageProps {
  onSwitchToSignup: () => void
  onLoginSuccess: () => void
}

const RESET_COOLDOWN_SECONDS = 60

// If someone opens an old or already-used reset link, Supabase sends them
// back with an error in the address. Read it once, when the page first loads.
function readResetLinkProblem(): string {
  const params = new URLSearchParams(
    `${window.location.search.replace(/^\?/, '')}&${window.location.hash.replace(/^#/, '')}`
  )

  const code = params.get('error_code') ?? ''
  const error = params.get('error') ?? ''

  if (code === 'otp_expired' || (error === 'access_denied' && code !== '')) {
    return 'That reset link has expired or has already been used. Request a new one below.'
  }

  return ''
}

function LoginPage({
  onSwitchToSignup,
  onLoginSuccess,
}: LoginPageProps) {
  const [linkProblem] = useState(readResetLinkProblem)
  const [view, setView] = useState<'login' | 'forgot'>(
    linkProblem ? 'forgot' : 'login'
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [resetSent, setResetSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const counting = cooldown > 0

  // Counts down after a reset email is sent, to avoid repeated requests
  useEffect(() => {
    if (!counting) return

    const id = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)

    return () => window.clearInterval(id)
  }, [counting])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    try {
      setLoading(true)

      await signIn(email, password)

      onLoginSuccess()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to log in.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const address = email.trim()

    if (!address) {
      setError('Please enter the email address of your account.')
      return
    }

    try {
      setLoading(true)

      await requestPasswordReset(address)

      // The same message is shown whether or not the address has an account,
      // so this form cannot be used to find out who is registered.
      setResetSent(true)
      setCooldown(RESET_COOLDOWN_SECONDS)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to send the reset email. Please try again in a moment.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function showForgot() {
    setError('')
    setResetSent(false)
    setView('forgot')
  }

  function showLogin() {
    setError('')
    setResetSent(false)
    setView('login')
  }

  if (view === 'forgot') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">YARUKI</div>

          <p className="auth-eyebrow">ACCOUNT RECOVERY</p>

          <h1>Reset your password</h1>

          <p className="auth-description">
            Enter the email you signed up with and we will send you a link to
            choose a new password.
          </p>

          <form onSubmit={handleResetSubmit}>
            <label htmlFor="reset-email">Email</label>

            <input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {linkProblem && !resetSent && (
              <div className="auth-error">{linkProblem}</div>
            )}

            {error && <div className="auth-error">{error}</div>}

            {resetSent && (
              <div className="auth-success" role="status">
                If an account exists for {email.trim()}, a reset link is on
                its way. Check your inbox and your spam folder. The link can
                only be used once.
              </div>
            )}

            <button
              type="submit"
              className="auth-primary-button"
              disabled={loading || cooldown > 0}
            >
              {loading
                ? 'Sending...'
                : cooldown > 0
                  ? `Send again in ${cooldown}s`
                  : resetSent
                    ? 'Send the link again'
                    : 'Send reset link'}
            </button>
          </form>

          <p className="auth-switch">
            Remembered it? <button onClick={showLogin}>Back to log in</button>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">YARUKI</div>

        <p className="auth-eyebrow">WELCOME BACK</p>

        <h1>Log in to your workspace</h1>

        <p className="auth-description">
          Continue managing your subjects, marks, exams and study plans.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>

          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="login-password">Password</label>

          <div className="auth-password-field">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="auth-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-primary-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          <button type="button" onClick={showForgot}>
            Forgot your password?
          </button>
        </p>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToSignup}>
            Create one
          </button>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
