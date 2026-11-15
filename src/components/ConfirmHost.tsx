import { useEffect, useRef } from 'react'
import {
  registerConfirmHost,
  resolveConfirm,
  useConfirmRequest,
} from '../lib/confirm'

// Draws the confirmation dialog. Mount it once, near the root of the app.
export default function ConfirmHost() {
  const request = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => registerConfirmHost(), [])

  const requestId = request?.id
  const destructive = request?.destructive

  useEffect(() => {
    if (requestId === undefined) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    // For risky questions the safe answer ("Cancel") is focused first
    ;(destructive ? cancelRef : confirmRef).current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        resolveConfirm(false)
        return
      }

      if (event.key === 'Tab') {
        // keep keyboard focus inside the dialog
        const buttons = [cancelRef.current, confirmRef.current].filter(
          (button): button is HTMLButtonElement => button !== null
        )
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement
        )
        const next = event.shiftKey
          ? index <= 0
            ? buttons.length - 1
            : index - 1
          : index === buttons.length - 1
            ? 0
            : index + 1

        event.preventDefault()
        buttons[next]?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [requestId, destructive])

  if (!request) {
    return null
  }

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resolveConfirm(false)
        }
      }}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title">{request.title}</h2>

        <p id="confirm-message">{request.message}</p>

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary-button"
            onClick={() => resolveConfirm(false)}
          >
            {request.cancelLabel}
          </button>

          <button
            ref={confirmRef}
            type="button"
            className={
              request.destructive ? 'confirm-danger' : 'page-primary-button'
            }
            onClick={() => resolveConfirm(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
