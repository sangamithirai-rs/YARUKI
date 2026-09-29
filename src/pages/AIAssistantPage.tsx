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

You can tell me your subject and exam date for a more specific demo plan.`
  }

  if (
    text.includes('schedule') ||
    text.includes('study plan') ||
    text.includes('plan my') ||
    text.includes('timetable')
  ) {
    return `Here’s a simple study schedule you can try:

• Choose 2–3 important tasks for today.
• Study your hardest subject first.
• Work for 25 minutes, then take a 5-minute break.
• Review what you learned at the end of the day.

For a more personalized plan, decide how many hours you can study and which subjects you need to cover.`
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

I’m currently using sample responses, so I can help with general study planning, exam preparation, and focus tips.

Try asking:
• How can I prepare for exams?
• Help me plan my study schedule.
• How can I focus while studying?

Real AI responses are not connected yet.`
}

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

    // Temporary frontend demo response. Connect a real AI service later.
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
          AI responses are demo examples and may not be accurate.
        </p>
      </section>
    </main>
  )
}