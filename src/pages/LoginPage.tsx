import { useState } from 'react'
import { signIn } from '../services/authService'

interface LoginPageProps {
  onSwitchToSignup: () => void
  onLoginSuccess: () => void
}

function LoginPage({
  onSwitchToSignup,
  onLoginSuccess,
}: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    } catch (err: any) {
      setError(err.message || 'Unable to log in.')
    } finally {
      setLoading(false)
    }
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
          <label>Email</label>

          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

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
          Don't have an account?{' '}
          <button onClick={onSwitchToSignup}>
            Create one
          </button>
        </p>
      </section>
    </main>
  )
}

export default LoginPage