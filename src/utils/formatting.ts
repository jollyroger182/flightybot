import { DateTime } from 'luxon'

export function formatTimeInTimeZone(timestamp: number, tz: string) {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    timeZone: tz,
    timeStyle: 'short',
    hour12: false,
  })
}

export function formatDateInTimeZone(timestamp: number, tz: string) {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTimeInTimeZone(timestamp: number, tz: string) {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDateDiffSuffix(start: number, startTz: string, end: number, endTz: string) {
  const a = DateTime.fromSeconds(start, { zone: startTz })
  const b = DateTime.fromSeconds(end, { zone: endTz }).startOf('day')
  const utcA = DateTime.fromObject({ year: a.year, month: a.month, day: a.day }, { zone: 'UTC' })
  const utcB = DateTime.fromObject({ year: b.year, month: b.month, day: b.day }, { zone: 'UTC' })
  const diff = utcB.diff(utcA, 'days').toObject().days!
  if (diff > 0) return ` (+${diff})`
  if (diff < 0) return ` (${diff})`
  return ''
}
