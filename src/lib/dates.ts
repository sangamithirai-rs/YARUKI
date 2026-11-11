const MS_PER_DAY = 1000 * 60 * 60 * 24

// Date columns can come back as "2026-12-01" or as a full timestamp such as
// "2026-12-01T00:00:00+00:00". Only the date part is ever used, so the day
// never shifts with the viewer's time zone.
export function toDateKey(value: string): string {
  return value.slice(0, 10)
}

export function parseDay(value: string): Date {
  return new Date(`${toDateKey(value)}T00:00:00`)
}

// Local calendar date as YYYY-MM-DD, `offset` days from today.
export function dateKeyFromToday(offset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function daysFromToday(value: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.round((parseDay(value).getTime() - today.getTime()) / MS_PER_DAY)
}

export function formatShortDate(value: string): string {
  return parseDay(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export function describeDays(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1) return `in ${days} days`

  return `${Math.abs(days)} days ago`
}

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainingMinutes = safeMinutes % 60

  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours} hr`

  return `${hours} hr ${remainingMinutes} min`
}
