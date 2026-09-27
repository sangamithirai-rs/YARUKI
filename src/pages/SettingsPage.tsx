import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAccount() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (isMounted) {
          setEmail(user?.email ?? '')
        }
      } catch {
        if (isMounted) {
          setError('Unable to load your account information.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadAccount()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="page-main settings-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">YOUR WORKSPACE</p>
          <h1>Settings</h1>
          <p>Manage your account and review your workspace preferences.</p>
        </div>
      </header>

      <section className="settings-section">
        <div className="settings-section-heading">
          <span className="settings-section-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </span>

          <div>
            <h2>Account</h2>
            <p>Your signed-in account information.</p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-account-row">
            <div className="settings-avatar" aria-hidden="true">
              {email ? email.charAt(0).toUpperCase() : '?'}
            </div>

            <div className="settings-account-info">
              <strong>{loading ? 'Loading account…' : email || 'Account email unavailable'}</strong>
              <span>Signed-in email address</span>
            </div>

            <span className="settings-readonly-badge">Read only</span>
          </div>

          {error && <p className="settings-error">{error}</p>}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <span className="settings-section-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.6-1.1 1.7 1.7 0 0 0-1.1.4l-.2.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 1.1-1.6 1.7 1.7 0 0 0-.4-1.1l-.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.6 1.1 1.7 1.7 0 0 0 1.1-.4l.2-.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1v3.4Z" />
            </svg>
          </span>

          <div>
            <h2>Workspace preferences</h2>
            <p>Current interface and personalization status.</p>
          </div>
        </div>

        <div className="settings-card settings-preferences-card">
          <div className="settings-preference-row">
            <div>
              <strong>Interface theme</strong>
              <p>YARUKI currently uses its warm, light interface.</p>
            </div>
            <span className="settings-status-badge">Light</span>
          </div>

          <div className="settings-preference-row">
            <div>
              <strong>Study reminders</strong>
              <p>Reminder preferences are not configured yet.</p>
            </div>
            <span className="settings-status-badge settings-status-muted">
              Not set up
            </span>
          </div>

          <div className="settings-preference-row">
            <div>
              <strong>Data and privacy</strong>
              <p>
                Your academic records are managed through your signed-in
                account and existing database policies.
              </p>
            </div>
            <span className="settings-status-badge settings-status-muted">
              Account data
            </span>
          </div>
        </div>
      </section>

      <div className="settings-note">
        <strong>More settings are coming later.</strong>
        <p>
          Editable profile details, saved theme preferences, and study
          reminders can be added when their storage and behavior are defined.
        </p>
      </div>
    </main>
  )
}