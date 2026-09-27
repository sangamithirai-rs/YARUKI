
import AIMessage from './AIMessage'

type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

type AIChatProps = {
  messages: Message[]
  loading: boolean
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
}

export default function AIChat({
  messages,
  loading,
  suggestions,
  onSuggestionClick,
}: AIChatProps) {
  return (
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
                onClick={() => onSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <AIMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))
      )}

      {loading && (
        <div className="ai-typing" role="status">
          YARUKI AI is thinking…
        </div>
      )}
    </div>
  )
}