import { DateTime } from 'luxon'
import type { TimeComponents, TimeComponentsSecond } from '../flighty'

export function convertComponentsToTimestamp(time: TimeComponents | TimeComponentsSecond | number) {
  if (typeof time === 'number') return time
  const [year, month, day, hour, minute, second] = time
  return DateTime.fromObject(
    { year, month, day, hour, minute, second },
    { zone: 'UTC' },
  ).toSeconds()
}
