import { useState } from 'react'
import { signUp } from '../services/authService'

interface SignupPageProps {
  onSwitchToLogin: () => void
  onSignupSuccess: () => void
}

function SignupPage({
  onSwitchToLogin,
  onSignupSuccess,
}: SignupPageProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setMessage('')

    if (!fullName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setLoading(true)

      const data = await signUp(
        email,
        password,
        fullName
      )

      if (!data.session) {
        setMessage(
          'Account created. Please check your email to confirm your account.'
        )
      } else {
        onSignupSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Unable to create account.')
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
          <label>Full name</label>

          <input
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

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
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

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
          <button onClick={onSwitchToLogin}>
            Log in
          </button>
        </p>
      </section>
    </main>
  )
}

export default SignupPage