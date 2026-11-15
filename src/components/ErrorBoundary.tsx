import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  // When this value changes (for example, a different page is opened) the
  // error is cleared and the content is tried again.
  resetKey?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

// After a new version is deployed, a tab that was left open can fail to load
// a page's code. That is fixed by reloading, so it gets its own message.
function isOutdatedAppError(error: Error): boolean {
  return /dynamically imported module|loading chunk|importing a module script|error loading dynamically/i.test(
    error.message
  )
}

// Stops one broken page from turning the whole app into a blank screen.
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A page crashed:', error, info.componentStack)
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    const outdated = isOutdatedAppError(error)

    return (
      <main className="page-main error-fallback" role="alert">
        <div className="error-fallback-card">
          <h1>
            {outdated ? 'A newer version is available' : 'Something went wrong'}
          </h1>

          <p>
            {outdated
              ? 'YARUKI was updated while this tab was open. Reload to continue.'
              : 'This page ran into a problem. Your data is safe. Try again, or go back to the dashboard.'}
          </p>

          <div className="error-fallback-actions">
            {!outdated && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </button>
            )}

            {!outdated && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  window.location.hash = 'dashboard'
                  this.setState({ error: null })
                }}
              >
                Go to dashboard
              </button>
            )}

            <button
              type="button"
              className="page-primary-button"
              onClick={() => window.location.reload()}
            >
              Reload YARUKI
            </button>
          </div>
        </div>
      </main>
    )
  }
}
