import { useState, type FormEvent } from 'react'

type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const promptSuggestions = [
  'Help me create a study plan',
  'Explain a difficult topic',
  'Give me revision strategies',
  'Help me prepare for an exam',
]

function getDemoResponse(message: string): string {
  const text = message.toLowerCase()

  if (
    text.includes('exam') ||
    text.includes('prepare') ||
    text.includes('revision')
  ) {
    return `Here are some exam preparation tips:

1. List the topics you need to revise.
2. Start with the topics you find most difficult.
3. Study in focused sessions with short breaks.
4. Practise questions without looking at your notes.
5. Review mistakes and get enough sleep before the exam.

Tell me your subject and exam date for a more specific demo plan.`
  }

  if (
    text.includes('schedule') ||
    text.includes('study plan') ||
    text.includes('plan my') ||
    text.includes('timetable')
  ) {
    return `Here is a simple study schedule you can try:

• Choose 2–3 important tasks for today.
• Study your hardest subject first.
• Work for 25 minutes, then take a 5-minute break.
• Review what you learned at the end of the day.

Decide how many hours you can study and which subjects you need to cover to make the plan more specific.`
  }

  if (
    text.includes('focus') ||
    text.includes('concentrate') ||
    text.includes('distract') ||
    text.includes('productivity')
  ) {
    return `Here are a few ways to improve your focus:

1. Put your phone away or enable Do Not Disturb.
2. Choose one small task to work on.
3. Set a 25-minute timer.
4. Take a short break after the session.
5. Write down distracting thoughts and return to your task.

Try one focused session and see whether it helps.`
  }

  if (
    text.includes('explain') ||
    text.includes('difficult topic') ||
    text.includes('understand')
  ) {
    return `I can help you break a difficult topic into smaller steps.

Tell me:
1. Which subject is it?
2. What topic are you studying?
3. Which part is confusing?

Then I can give you a simple explanation and an example.`
  }

  return `Thanks for your question!

I am currently using sample responses, so I can help with general study planning, exam preparation, and focus tips.

Try asking:
• How can I prepare for exams?
• Help me plan my study schedule.
• How can I focus while studying?

Real AI responses are not connected yet.`
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = prompt.trim()

    if (!content || loading) {
      return
    }

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'user',
        content,
      },
    ])

    setPrompt('')
    setNotice('')
    setLoading(true)

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: getDemoResponse(content),
        },
      ])

      setLoading(false)
    }, 600)
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
          Demo mode
        </span>
      </header>

      <section className="ai-chat-panel" aria-label="AI Assistant chat">
        {messages.length === 0 ? (
          <>
            <div className="ai-chat-welcome">
              <div className="ai-assistant-mark" aria-hidden="true">
                ✦
              </div>

              <p className="page-eyebrow">WELCOME TO YARUKI AI</p>
              <h2>What would you like to work on?</h2>
              <p>
                Start with a question or choose one of the suggestions below.
                This preview uses sample responses, not a connected AI service.
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
          </>
        ) : (
          <div className="ai-conversation" aria-live="polite">
            {messages.map((message) => (
              <article
                className={`ai-message ai-message-${message.role}`}
                key={message.id}
              >
                <span className="ai-message-label">
                  {message.role === 'user' ? 'You' : 'YARUKI AI · Demo'}
                </span>
                <p>{message.content}</p>
              </article>
            ))}

            {loading && (
              <p className="ai-typing" role="status">
                YARUKI AI is thinking…
              </p>
            )}
          </div>
        )}

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
            <p>Demo responses only — real AI is not connected.</p>

            <button
              type="submit"
              className="page-primary-button"
              disabled={!prompt.trim() || loading}
            >
              {loading ? 'Thinking…' : 'Send message'}
              {!loading && <span aria-hidden="true"> →</span>}
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