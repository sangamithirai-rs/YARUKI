import { useState, type FormEvent } from 'react'

const promptSuggestions = [
  'Help me create a study plan',
  'Explain a difficult topic',
  'Give me revision strategies',
  'Help me prepare for an exam',
]

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState('')
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!prompt.trim()) {
      return
    }

    setNotice(
      'The AI connection is not configured yet. Your message has not been sent.'
    )
  }

  function chooseSuggestion(suggestion: string) {
    setPrompt(suggestion)
    setNotice('')
  }

  return (
    <main className="page-main ai-assistant-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">YOUR STUDY COMPANION</p>
          <h1>AI Assistant</h1>
          <p className="page-subtitle">
            Get help organizing your learning, understanding topics, and
            preparing for exams.
          </p>
        </div>
        <span className="ai-status-badge">
          <span className="ai-status-dot" />
          Setup in progress
        </span>
      </header>

      <section className="ai-chat-panel">
        <div className="ai-chat-welcome">
          <div className="ai-assistant-mark" aria-hidden="true">
            ✦
          </div>
          <p className="page-eyebrow">WELCOME TO YARUKI AI</p>
          <h2>What would you like to work on?</h2>
          <p>
            Start with a question or choose one of the suggestions below.
            AI responses will be available after the service is connected.
          </p>
        </div>

        <div className="ai-prompt-suggestions">
          {promptSuggestions.map((suggestion) => (
            <button
              className="ai-prompt-suggestion"
              key={suggestion}
              type="button"
              onClick={() => chooseSuggestion(suggestion)}
            >
              <span aria-hidden="true">↗</span>
              {suggestion}
            </button>
          ))}
        </div>

        <form className="ai-chat-composer" onSubmit={handleSubmit}>
          <label className="ai-composer-label" htmlFor="ai-prompt">
            Your message
          </label>
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value)
              setNotice('')
            }}
            placeholder="Ask a study-related question..."
            rows={3}
          />

          <div className="ai-composer-footer">
            <p>AI responses are not connected yet.</p>
            <button
              type="submit"
              className="page-primary-button"
              disabled={!prompt.trim()}
            >
              Send message
              <span aria-hidden="true"> →</span>
            </button>
          </div>

          {notice && (
            <p className="ai-setup-notice" role="status">
              {notice}
            </p>
          )}
        </form>
      </section>

      <section className="ai-capabilities">
        <div>
          <p className="page-eyebrow">DESIGNED FOR STUDENTS</p>
          <h2>Study support, in one place</h2>
        </div>

        <div className="ai-capability-grid">
          <article className="ai-capability-card">
            <span className="ai-capability-icon" aria-hidden="true">
              ✎
            </span>
            <h3>Understand topics</h3>
            <p>
              Get help breaking down concepts into clear, manageable steps.
            </p>
          </article>

          <article className="ai-capability-card">
            <span className="ai-capability-icon" aria-hidden="true">
              ◷
            </span>
            <h3>Plan your study time</h3>
            <p>
              Organize revision tasks and prepare a realistic study routine.
            </p>
          </article>

          <article className="ai-capability-card">
            <span className="ai-capability-icon" aria-hidden="true">
              ✓
            </span>
            <h3>Prepare for exams</h3>
            <p>
              Get support with revision strategies and practice questions.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}