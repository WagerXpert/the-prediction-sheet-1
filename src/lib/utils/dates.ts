/**
 * Format a date string for display.
 * e.g. "Sep 5, 2026"
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date with time for game kickoffs.
 * e.g. "Sat, Sep 5 · 3:30 PM ET"
 */
export function formatGameTime(date: string | Date): string {
  const d = new Date(date)
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  })
  return `${day} · ${time}`
}

/**
 * Returns true if the given date is in the past (game has kicked off / locked).
 */
export function isInPast(date: string | Date): boolean {
  return new Date(date) < new Date()
}

/**
 * Returns a human-readable countdown.
 * e.g. "in 3 days", "in 5 hours", "in 20 minutes"
 */
export function timeUntil(date: string | Date): string {
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 0) return `in ${hours} hour${hours === 1 ? '' : 's'}`
  const mins = Math.floor(diff / (1000 * 60))
  return `in ${mins} minute${mins === 1 ? '' : 's'}`
}
