import { useSyncExternalStore } from 'react'

function subscribe(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)

  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}

// Tells people when saving cannot work, instead of leaving them to
// wonder why an action failed.
export default function OfflineBanner() {
  const online = useOnline()

  if (online) {
    return null
  }

  return (
    <div className="offline-banner" role="status">
      You are offline. Changes you make will not be saved until you
      reconnect.
    </div>
  )
}
