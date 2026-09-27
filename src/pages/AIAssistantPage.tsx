
import { useState } from 'react'
import '../App.css'

type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'Help me plan my study schedule',
  'Explain a difficult topic',
  'How can I prepare for exams?',
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSend(message = input) {
    const content = message.trim()
    if (!content || loading) return

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', content },
    ])
    setInput('')
    setLoading(true)

    // Temporary frontend response. Connect a real AI service later.
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            'I’m your YARUKI study assistant. AI responses are not connected yet, but this chat interface is ready for integration.',
        },
      ])
      setLoading(false)
    }, 600)
  }

  return (
    <main className="ai-page">
      <header className="ai-header">
        <span className="ai-eyebrow">YARUKI STUDY TOOLS</span>
        <h1>AI Assistant</h1>
        <p>Ask questions, organize your study time, and prepare for exams.</p>
      </header>

      <section className="ai-chat" aria-label="AI Assistant chat">
        <div className="ai-messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="ai-welcome">
              <div className="ai-orb" aria-hidden="true">✦</div>
              <h2>What would you like to work on?</h2>
              <p>Choose a prompt or type your own question below.</p>
              <div className="ai-suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={`ai-message ai-message-${message.role}`}
                key={message.id}
              >
                <span className="ai-message-label">
                  {message.role === 'user' ? 'You' : 'YARUKI AI'}
                </span>
                <p>{message.content}</p>
              </article>
            ))
          )}

          {loading && (
            <div className="ai-typing" role="status">
              YARUKI AI is thinking…
            </div>
          )}
        </div>

        <form
          className="ai-composer"
          onSubmit={(event) => {
            event.preventDefault()
            handleSend()
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask YARUKI anything about studying..."
            aria-label="Your message"
          />
          <button type="submit" disabled={!input.trim() || loading}>
            Send
          </button>
        </form>
        <p className="ai-disclaimer">
          AI responses are a demo placeholder and may not be accurate.
        </p>
      </section>
    </main>
  )
}