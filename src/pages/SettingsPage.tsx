import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  changePassword,
  getCurrentUser,
  signOut,
  updateDisplayName,
} from '../services/authService'
import { collectUserData } from '../services/exportService'
import { getErrorMessage } from '../lib/errors'
import { dateKeyFromToday } from '../lib/dates'
import {
  MAX_FOCUS_MINUTES,
  MAX_WEEKLY_GOAL_MINUTES,
  MIN_FOCUS_MINUTES,
  setPreferences,
  usePreferences,
} from '../lib/preferences'
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from '../lib/theme'
import '../settingsAnalytics.css'

const MAX_NAME_LENGTH = 80
const MIN_PASSWORD_LENGTH = 8

type Notice = { kind: 'success' | 'error'; text: string } | null

const THEMES: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Warm and bright' },
  { value: 'dark', label: 'Dark', hint: 'Easy on the eyes' },
  { value: 'system', label: 'System', hint: 'Match your device' },
]

function formatHours(minutes: number): string {
  return minutes > 0 ? String(Number((minutes / 60).toFixed(2))) : ''
}

function formatDate(value?: string): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null

  return (
    <p
      className={`settings-notice settings-notice-${notice.kind}`}
      role={notice.kind === 'error' ? 'alert' : 'status'}
    >
      {notice.text}
    </p>
  )
}

export default function SettingsPage() {
  const theme = useThemePreference()
  const preferences = usePreferences()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [fullName, setFullName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameNotice, setNameNotice] = useState<Notice>(null)

  const [goalHours, setGoalHours] = useState(
    formatHours(preferences.weeklyGoalMinutes)
  )
  const [focusMinutes, setFocusMinutes] = useState(
    String(preferences.focusMinutes)
  )
  const [prefsNotice, setPrefsNotice] = useState<Notice>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null)

  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState<Notice>(null)

  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadAccount() {
      try {
        const current = await getCurrentUser()

        if (isMounted) {
          setUser(current)
          setFullName(
            (current?.user_metadata?.full_name as string | undefined) ?? ''
          )
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(
            getErrorMessage(err, 'Unable to load your account information.')
          )
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

  const email = user?.email ?? ''
  const savedName = (user?.user_metadata?.full_name as string | undefined) ?? ''

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameNotice(null)

    const name = fullName.trim()

    if (!name) {
      setNameNotice({ kind: 'error', text: 'Please enter your name.' })
      return
    }

    if (name.length > MAX_NAME_LENGTH) {
      setNameNotice({
        kind: 'error',
        text: `Your name can be up to ${MAX_NAME_LENGTH} characters.`,
      })
      return
    }

    try {
      setSavingName(true)

      const updated = await updateDisplayName(name)

      if (updated) setUser(updated)
      setFullName(name)
      setNameNotice({ kind: 'success', text: 'Your name has been updated.' })
    } catch (err) {
      setNameNotice({
        kind: 'error',
        text: getErrorMessage(err, 'Unable to update your name.'),
      })
    } finally {
      setSavingName(false)
    }
  }

  function handlePrefsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPrefsNotice(null)

    const hours = goalHours.trim() === '' ? 0 : Number(goalHours)
    const minutes = Number(focusMinutes)

    if (
      !Number.isFinite(hours) ||
      hours < 0 ||
      hours * 60 > MAX_WEEKLY_GOAL_MINUTES
    ) {
      setPrefsNotice({
        kind: 'error',
        text: `Enter a weekly goal between 0 and ${MAX_WEEKLY_GOAL_MINUTES / 60} hours (leave it empty for no goal).`,
      })
      return
    }

    if (
      !Number.isInteger(minutes) ||
      minutes < MIN_FOCUS_MINUTES ||
      minutes > MAX_FOCUS_MINUTES
    ) {
      setPrefsNotice({
        kind: 'error',
        text: `Focus sessions can be ${MIN_FOCUS_MINUTES} to ${MAX_FOCUS_MINUTES} minutes long.`,
      })
      return
    }

    setPreferences({
      weeklyGoalMinutes: Math.round(hours * 60),
      focusMinutes: minutes,
    })

    setPrefsNotice({
      kind: 'success',
      text: 'Preferences saved on this device.',
    })
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordNotice(null)

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordNotice({
        kind: 'error',
        text: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({
        kind: 'error',
        text: 'The two passwords do not match.',
      })
      return
    }

    try {
      setSavingPassword(true)

      await changePassword(newPassword)

      setNewPassword('')
      setConfirmPassword('')
      setPasswordNotice({
        kind: 'success',
        text: 'Your password has been changed.',
      })
    } catch (err) {
      setPasswordNotice({
        kind: 'error',
        text: getErrorMessage(err, 'Unable to change your password.'),
      })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleExport() {
    setExportNotice(null)

    try {
      setExporting(true)

      const exported = await collectUserData()
      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `yaruki-export-${dateKeyFromToday(0)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setExportNotice({
        kind: 'success',
        text: `Exported ${exported.itemCount} records.`,
      })
    } catch (err) {
      setExportNotice({
        kind: 'error',
        text: getErrorMessage(err, 'Unable to export your data.'),
      })
    } finally {
      setExporting(false)
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true)
      await signOut()
    } catch (err) {
      console.error('Unable to sign out:', err)
      setSigningOut(false)
    }
  }

  return (
    <main className="page-main settings-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">YOUR WORKSPACE</p>
          <h1>Settings</h1>
          <p>Manage your account, appearance and study preferences.</p>
        </div>
      </header>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div>
            <h2>Account</h2>
            <p>Your profile and sign-in details.</p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-account-row">
            <div className="settings-avatar" aria-hidden="true">
              {(savedName || email || '?').charAt(0).toUpperCase()}
            </div>

            <div className="settings-account-info">
              <strong>
                {loading
                  ? 'Loading account…'
                  : savedName || email || 'Account unavailable'}
              </strong>
              <span>{email}</span>
            </div>
          </div>

          {loadError && <p className="settings-error">{loadError}</p>}

          <dl className="settings-facts">
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(user?.created_at)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatDate(user?.last_sign_in_at)}</dd>
            </div>
          </dl>

          <form className="settings-form" onSubmit={handleNameSubmit}>
            <div className="form-field">
              <label htmlFor="settings-name">Display name</label>
              <input
                id="settings-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder="Your name"
                disabled={loading || savingName}
              />
            </div>

            <button
              type="submit"
              className="page-primary-button"
              disabled={
                loading || savingName || fullName.trim() === savedName.trim()
              }
            >
              {savingName ? 'Saving…' : 'Save name'}
            </button>
          </form>

          <NoticeLine notice={nameNotice} />
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div>
            <h2>Appearance</h2>
            <p>Choose how YARUKI looks. This applies on this device.</p>
          </div>
        </div>

        <div className="settings-card">
          <div className="theme-options" role="radiogroup" aria-label="Theme">
            {THEMES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={theme === option.value}
                className={`theme-option ${
                  theme === option.value ? 'active' : ''
                }`}
                onClick={() => setThemePreference(option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div>
            <h2>Study preferences</h2>
            <p>Targets and defaults for your study sessions.</p>
          </div>
        </div>

        <div className="settings-card">
          <form className="settings-form" onSubmit={handlePrefsSubmit}>
            <div className="settings-form-grid">
              <div className="form-field">
                <label htmlFor="settings-goal">Weekly study goal (hours)</label>
                <input
                  id="settings-goal"
                  type="number"
                  min="0"
                  max={MAX_WEEKLY_GOAL_MINUTES / 60}
                  step="0.5"
                  value={goalHours}
                  onChange={(event) => setGoalHours(event.target.value)}
                  placeholder="e.g. 10 (empty = no goal)"
                />
              </div>

              <div className="form-field">
                <label htmlFor="settings-focus">
                  Default focus timer (minutes)
                </label>
                <input
                  id="settings-focus"
                  type="number"
                  min={MIN_FOCUS_MINUTES}
                  max={MAX_FOCUS_MINUTES}
                  step="1"
                  value={focusMinutes}
                  onChange={(event) => setFocusMinutes(event.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="page-primary-button">
              Save preferences
            </button>
          </form>

          <NoticeLine notice={prefsNotice} />
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div>
            <h2>Security</h2>
            <p>Change the password you use to sign in.</p>
          </div>
        </div>

        <div className="settings-card">
          <form className="settings-form" onSubmit={handlePasswordSubmit}>
            <div className="settings-form-grid">
              <div className="form-field">
                <label htmlFor="settings-new-password">New password</label>
                <input
                  id="settings-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  disabled={savingPassword}
                />
              </div>

              <div className="form-field">
                <label htmlFor="settings-confirm-password">
                  Confirm new password
                </label>
                <input
                  id="settings-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={savingPassword}
                />
              </div>
            </div>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show passwords</span>
            </label>

            <button
              type="submit"
              className="page-primary-button"
              disabled={savingPassword || newPassword === ''}
            >
              {savingPassword ? 'Updating…' : 'Change password'}
            </button>
          </form>

          <NoticeLine notice={passwordNotice} />
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <div>
            <h2>Your data</h2>
            <p>
              Download a copy of everything stored in your account: subjects,
              marks, exams, assignments, study sessions, plans and material
              details. Uploaded files are not included.
            </p>
          </div>
        </div>

        <div className="settings-card settings-card-row">
          <div>
            <strong>Export as JSON</strong>
            <p>A single file you can keep as a backup.</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Preparing…' : 'Download my data'}
          </button>
        </div>

        <NoticeLine notice={exportNotice} />
      </section>

      <section className="settings-section">
        <div className="settings-card settings-card-row">
          <div>
            <strong>Sign out</strong>
            <p>End your session on this device.</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>
    </main>
  )
}
