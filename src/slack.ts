import type { KnownBlock, RichTextBlock, TableBlock } from '@slack/web-api'
import { app } from './client'
import type { Subscription } from './database'
import { getFlightDetails, type FlightDetails } from './flighty'
import {
  formatDateDiffSuffix,
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
  formatTimeInTimeZone,
} from './utils/formatting'

export async function updateSlackMessage(subscription: Subscription) {
  let data: FlightDetails
  try {
    data = await getFlightDetails(subscription.flighty_id)
  } catch {
    return
  }
  const message = await generateSlackMessage(data)
  await app.client.chat.update({
    channel: subscription.slack_channel,
    ts: subscription.slack_ts,
    ...message,
  })
}

export async function generateSlackMessage(flight: FlightDetails) {
  const statusBlocks: KnownBlock[] = []
  if (flight.flight.status === 'SCHEDULED') {
    const isOverdue = Date.now() / 1000 > flight.flight.departure.schedule.initialGateTime
    statusBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Scheduled | Departure${isOverdue ? ' due' : ''} *<!date^${flight.flight.departure.schedule.initialGateTime}^ {ago}|${formatDateTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)} in ${flight.flight.departure.airport.timezone}}>*`,
      },
    })
  } else if (flight.flight.status === 'DEPARTURE_TAXIING') {
    const isOverdue = Date.now() / 1000 > flight.flight.departure.schedule.runway.original
    statusBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Taxiing | Take off${isOverdue ? ' due' : ''} *<!date^${flight.flight.departure.schedule.runway.original}^ {ago}|${formatDateTimeInTimeZone(flight.flight.departure.schedule.runway.original, flight.flight.departure.airport.timezone)} in ${flight.flight.departure.airport.timezone}}>*`,
      },
    })
  } else if (flight.flight.status === 'EN_ROUTE') {
    statusBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `En route | Lands *<!date^${flight.flight.arrival.schedule.initialGateTime}^ {ago}|${formatDateTimeInTimeZone(flight.flight.arrival.schedule.initialGateTime, flight.flight.arrival.scheduled_airport.timezone)} in ${flight.flight.arrival.scheduled_airport.timezone}}>*`,
      },
    })
  } else if (flight.flight.status === 'ARRIVAL_TAXIING') {
    const isOverdue = Date.now() / 1000 > flight.flight.arrival.schedule.gate.original
    statusBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Taxiing | Gate arrival${isOverdue ? ' due' : ''} *<!date^${flight.flight.arrival.schedule.gate.original}^ {ago}|${formatDateTimeInTimeZone(flight.flight.arrival.schedule.gate.original, flight.flight.arrival.actual_airport.timezone)} in ${flight.flight.arrival.actual_airport.timezone}}>*`,
      },
    })
  } else if (flight.flight.status === 'LANDED') {
    statusBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Landed *<!date^${flight.flight.arrival.schedule.initialGateTime}^ {ago}|${formatDateTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)} in ${flight.flight.departure.airport.timezone}}>*`,
      },
    })
  }

  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `:airplane: ${flight.flight.airline.iata} ${flight.flight.flight_number} | ${flight.flight.departure.airport.city} to ${flight.flight.arrival.scheduled_airport.city}`,
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'plain_text',
          text: formatDateInTimeZone(
            flight.flight.departure.schedule.initialGateTime,
            flight.flight.departure.airport.timezone,
          ),
        },
        {
          type: 'plain_text',
          text: `${formatTimeInTimeZone(
            flight.flight.departure.schedule.initialGateTime,
            flight.flight.departure.airport.timezone,
          )} - ${formatTimeInTimeZone(
            flight.flight.arrival.schedule.initialGateTime,
            flight.flight.arrival.scheduled_airport.timezone,
          )}${formatDateDiffSuffix(
            flight.flight.departure.schedule.initialGateTime,
            flight.flight.departure.airport.timezone,
            flight.flight.arrival.schedule.initialGateTime,
            flight.flight.arrival.scheduled_airport.timezone,
          )}`,
        },
      ],
    },
    ...statusBlocks,
    { type: 'divider' },
    {
      type: 'table',
      rows: [
        [
          generatePlainRichText('Schedule'),
          generateBoldRichText('Scheduled'),
          generateBoldRichText('Estimated'),
          generateBoldRichText('Actual'),
        ],
        [
          generatePlainRichText('-'),
          generatePlainRichText('-'),
          generatePlainRichText('-'),
          generatePlainRichText('-'),
        ],
        [
          generateBoldRichText('Departure'),
          formatScheduleValue(
            flight.flight.departure.schedule.initialGateTime,
            flight.flight.departure.airport.timezone,
          ),
          generatePlainRichText('-'),
          generatePlainRichText('-'),
        ],
        [
          generateBoldRichText('Gate departure'),
          formatScheduleValue(
            flight.flight.departure.schedule.gate.original,
            flight.flight.departure.airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.departure.schedule.gate.estimated,
            flight.flight.departure.airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.departure.schedule.gate.actual,
            flight.flight.departure.airport.timezone,
          ),
        ],
        [
          generateBoldRichText('Take off'),
          formatScheduleValue(
            flight.flight.departure.schedule.runway.original,
            flight.flight.departure.airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.departure.schedule.runway.estimated,
            flight.flight.departure.airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.departure.schedule.runway.actual,
            flight.flight.departure.airport.timezone,
          ),
        ],
        [
          generatePlainRichText('-'),
          generatePlainRichText('-'),
          generatePlainRichText('-'),
          generatePlainRichText('-'),
        ],
        [
          generateBoldRichText('Land'),
          formatScheduleValue(
            flight.flight.arrival.schedule.runway.original,
            flight.flight.arrival.actual_airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.arrival.schedule.runway.estimated,
            flight.flight.arrival.actual_airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.arrival.schedule.runway.actual,
            flight.flight.arrival.actual_airport.timezone,
          ),
        ],
        [
          generateBoldRichText('Gate arrival'),
          formatScheduleValue(
            flight.flight.arrival.schedule.gate.original,
            flight.flight.arrival.actual_airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.arrival.schedule.gate.estimated,
            flight.flight.arrival.actual_airport.timezone,
          ),
          formatScheduleValue(
            flight.flight.arrival.schedule.gate.actual,
            flight.flight.arrival.actual_airport.timezone,
          ),
        ],
        [
          generateBoldRichText('Arrival'),
          formatScheduleValue(
            flight.flight.arrival.schedule.initialGateTime,
            flight.flight.arrival.actual_airport.timezone,
          ),
          generatePlainRichText('-'),
          generatePlainRichText('-'),
        ],
      ],
    },
  ]

  return {
    text: `Flight ${flight.flight.airline.iata} ${flight.flight.flight_number} (${flight.flight.status})`,
    blocks,
  }
}

function generatePlainRichText(text: string): RichTextBlock {
  return {
    type: 'rich_text',
    elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text }] }],
  }
}

function generateBoldRichText(text: string): RichTextBlock {
  return {
    type: 'rich_text',
    elements: [
      { type: 'rich_text_section', elements: [{ type: 'text', text, style: { bold: true } }] },
    ],
  }
}

function formatScheduleValue(
  timestamp: number | undefined,
  tz: string,
): TableBlock['rows'][number][number] {
  if (!timestamp) return { type: 'raw_text', text: '-' }
  return {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          { type: 'text', text: `${formatTimeInTimeZone(timestamp, tz)} ` },
          {
            type: 'date',
            timestamp,
            format: '({ago})',
            fallback: `(${formatDateTimeInTimeZone(timestamp, tz)} in ${tz})`,
          },
        ],
      },
    ],
  }
}
