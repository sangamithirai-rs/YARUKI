import { useState } from 'react'
import { getErrorMessage } from '../lib/errors'
import { signUp } from '../services/authService'

interface SignupPageProps {
  onSwitchToLogin: () => void
  onSignupSuccess: () => void
}

const MIN_PASSWORD_LENGTH = 8

// A simple guide, not a rule: length is the only hard requirement.
function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3
  label: string
} {
  if (!password) return { score: 0, label: '' }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { score: 1, label: 'Too short' }
  }

  const variety =
    (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) +
    (/\d/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0) +
    (password.length >= 12 ? 1 : 0)

  if (variety >= 3) return { score: 3, label: 'Strong' }
  if (variety >= 1) return { score: 2, label: 'Okay' }

  return { score: 1, label: 'Weak: try adding numbers or capitals' }
}

function SignupPage({
  onSwitchToLogin,
  onSignupSuccess,
}: SignupPageProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = passwordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setMessage('')

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      )
      return
    }

    try {
      setLoading(true)

      const data = await signUp(
        email.trim(),
        password,
        fullName.trim()
      )

      if (!data.session) {
        setMessage(
          'Account created. Please check your email to confirm your account.'
        )
      } else {
        onSignupSuccess()
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">YARUKI</div>

        <p className="auth-eyebrow">GET STARTED</p>

        <h1>Create your account</h1>

        <p className="auth-description">
          Build a smarter, more organized academic routine.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="signup-name">Full name</label>

          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <label htmlFor="signup-email">Email</label>

          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="signup-password">Password</label>

          <div className="auth-password-field">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
              aria-describedby="signup-password-hint"
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

          <div
            className="auth-strength"
            id="signup-password-hint"
            aria-live="polite"
          >
            <div className={`auth-strength-bar strength-${strength.score}`}>
              <span />
              <span />
              <span />
            </div>

            <small>
              {strength.label ||
                `Use at least ${MIN_PASSWORD_LENGTH} characters.`}
            </small>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="auth-primary-button"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin}>
            Log in
          </button>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
