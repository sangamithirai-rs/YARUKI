import { useSyncExternalStore } from 'react'

// A friendlier replacement for window.confirm. Call sites barely change:
//   const confirmed = await confirmDialog('Delete "Maths"?')
// The dialog itself is drawn by <ConfirmHost /> (see components/ConfirmHost).

export type ConfirmOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export type ConfirmRequest = {
  id: number
  message: string
  title: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
  resolve: (confirmed: boolean) => void
}

const queue: ConfirmRequest[] = []
let snapshot: ConfirmRequest | null = null
let hostCount = 0
let nextId = 1

const listeners = new Set<() => void>()

function emit() {
  snapshot = queue[0] ?? null
  listeners.forEach((listener) => listener())
}

// Works out sensible wording from the question, e.g. "Delete ..." gets a
// red "Delete" button and "Discard ..." gets a "Discard" button.
function describe(message: string, options: ConfirmOptions = {}) {
  const firstWord = message.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  const verbs: Record<string, string> = {
    delete: 'Delete',
    discard: 'Discard',
    remove: 'Remove',
  }
  const destructive = options.destructive ?? firstWord in verbs

  return {
    title:
      options.title ?? (destructive ? 'This can’t be undone' : 'Please confirm'),
    confirmLabel: options.confirmLabel ?? verbs[firstWord] ?? 'Confirm',
    cancelLabel: options.cancelLabel ?? 'Cancel',
    destructive,
  }
}

export function confirmDialog(
  message: string,
  options?: ConfirmOptions
): Promise<boolean> {
  // With no dialog on screen, use the browser's own prompt so that a
  // request can never be left waiting forever.
  if (hostCount === 0) {
    return Promise.resolve(window.confirm(message))
  }

  return new Promise((resolve) => {
    queue.push({
      id: nextId++,
      message,
      resolve,
      ...describe(message, options),
    })
    emit()
  })
}

export function resolveConfirm(confirmed: boolean) {
  const current = queue.shift()

  if (current) {
    current.resolve(confirmed)
    emit()
  }
}

export function registerConfirmHost() {
  hostCount += 1

  return () => {
    hostCount -= 1

    if (hostCount === 0) {
      // the dialog is going away: treat anything still waiting as "no"
      queue.splice(0).forEach((request) => request.resolve(false))
      emit()
    }
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(subscribe, () => snapshot, () => null)
}
