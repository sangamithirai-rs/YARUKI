import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import './App.css'
type AuthMode = 'login' | 'signup'

function App() {
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
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