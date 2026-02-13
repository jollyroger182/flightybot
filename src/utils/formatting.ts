import { DateTime } from 'luxon'
import type { TimeComponents, TimeComponentsSecond } from '../flighty'
import { convertComponentsToTimestamp } from './convert'

export function formatTimeInTimeZone(
  timestamp: number | TimeComponents | TimeComponentsSecond,
  tz: string,
) {
  timestamp = convertComponentsToTimestamp(timestamp)
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    timeZone: tz,
    timeStyle: 'short',
    hour12: false,
  })
}

export function formatDateInTimeZone(
  timestamp: number | TimeComponents | TimeComponentsSecond,
  tz: string,
) {
  timestamp = convertComponentsToTimestamp(timestamp)
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTimeInTimeZone(
  timestamp: number | TimeComponents | TimeComponentsSecond,
  tz: string,
) {
  timestamp = convertComponentsToTimestamp(timestamp)
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

export function formatDateDiffSuffix(
  start: number | TimeComponents | TimeComponentsSecond,
  startTz: string,
  end: number | TimeComponents | TimeComponentsSecond,
  endTz: string,
) {
  const a = DateTime.fromSeconds(convertComponentsToTimestamp(start), { zone: startTz })
  const b = DateTime.fromSeconds(convertComponentsToTimestamp(end), { zone: endTz }).startOf('day')
  const utcA = DateTime.fromObject({ year: a.year, month: a.month, day: a.day }, { zone: 'UTC' })
  const utcB = DateTime.fromObject({ year: b.year, month: b.month, day: b.day }, { zone: 'UTC' })
  const diff = utcB.diff(utcA, 'days').toObject().days!
  if (diff > 0) return ` (+${diff})`
  if (diff < 0) return ` (${diff})`
  return ''
}
