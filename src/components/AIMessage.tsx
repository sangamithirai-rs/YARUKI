
type AIMessageProps = {
  role: 'user' | 'assistant'
  content: string
}

export default function AIMessage({ role, content }: AIMessageProps) {
  return (
    <article className={`ai-message ai-message-${role}`}>
      <span className="ai-message-label">
        {role === 'user' ? 'You' : 'YARUKI AI'}
      </span>
      <p>{content}</p>
    </article>
  )
}