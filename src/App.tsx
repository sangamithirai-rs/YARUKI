import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import './App.css'
type AuthMode = 'login' | 'signup'

// The link in a password-reset email returns here with "type=recovery" in the
// address. It is read on the first render, before Supabase tidies the address.
function openedFromRecoveryLink(): boolean {
  return /type=recovery/.test(
    `${window.location.search}${window.location.hash}`
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(openedFromRecoveryLink)

  useEffect(() => {
    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)

        // Opening the emailed reset link signs the person in; hold them on
        // the "choose a new password" screen until they have set one.
        if (event === 'PASSWORD_RECOVERY') {
          setRecovering(true)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    setUser(session?.user ?? null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-logo">YARUKI</div>
        <p>Loading your workspace...</p>
      </div>
    )
  }

  if (user && recovering) {
    return (
      <ResetPasswordPage
        onDone={() => setRecovering(false)}
        onCancel={() => setRecovering(false)}
      />
    )
  }

  if (user) {
    return <DashboardPage />
  }

  if (authMode === 'login') {
    return (
      <LoginPage
        onSwitchToSignup={() => setAuthMode('signup')}
        onLoginSuccess={checkSession}
      />
    )
  }

  return (
    <SignupPage
      onSwitchToLogin={() => setAuthMode('login')}
      onSignupSuccess={checkSession}
    />
  )
}

export default App