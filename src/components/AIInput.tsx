
import type { FormEvent } from 'react'

type AIInputProps = {
  value: string
  loading: boolean
  onChange: (value: string) => void
  onSend: () => void
}

export default function AIInput({
  value,
  loading,
  onChange,
  onSend,
}: AIInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!value.trim() || loading) return
    onSend()
  }

  return (
    <form className="ai-composer" onSubmit={handleSubmit}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask YARUKI anything about studying..."
        aria-label="Your message"
      />
      <button type="submit" disabled={!value.trim() || loading}>
        Send
      </button>
    </form>
  )
}