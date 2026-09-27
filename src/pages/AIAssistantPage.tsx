
import { useState } from 'react'
import AIChat from '../components/AIChat'
import AIInput from '../components/AIInput'
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
        <AIChat
          messages={messages}
          loading={loading}
          suggestions={suggestions}
          onSuggestionClick={handleSend}
        />

        <AIInput
          value={input}
          loading={loading}
          onChange={setInput}
          onSend={() => handleSend()}
        />

        <p className="ai-disclaimer">
          AI responses are a demo placeholder and may not be accurate.
        </p>
      </section>
    </main>
  )
}