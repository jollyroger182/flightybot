import type {
  KnownBlock,
  PlainTextElement,
  PlainTextOption,
  RichTextBlock,
  TableBlock,
} from '@slack/web-api'
import { app } from './client'
import { deactivateSubscription, type Subscription } from './database'
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
    console.warn('deactivating because flighty invalid for subscription', subscription.id)
    await deactivateSubscription(subscription)
    return
  }

  if (data.flight.status === 'LANDED') {
    console.debug('deactivating because flight landed for subscription', subscription.id)
    await deactivateSubscription(subscription)
  }

  const message = await generateSlackMessage(data, subscription)

  try {
    await app.client.chat.update({
      channel: subscription.slack_channel,
      ts: subscription.slack_ts,
      ...message,
    })
  } catch (e) {
    if (
      e instanceof Error &&
      ((e as any)?.data?.error === 'message_not_found' ||
        (e as any)?.data?.error === 'channel_not_found')
    ) {
      console.warn('deactivating because message not found for subscription', subscription.id)
      await deactivateSubscription(subscription)
      return
    }
    throw e
  }
}

export async function generateSlackMessage(
  flight: FlightDetails,
  subscription: Pick<Subscription, 'active' | 'creator_slack_id' | 'created_at'>,
) {
  let statusText: string = `Unknown status (${flight.flight.status})`
  if (flight.flight.status === 'SCHEDULED') {
    const isOverdue = Date.now() / 1000 > flight.flight.departure.schedule.initialGateTime
    statusText = `Scheduled | Departure${isOverdue ? ' due' : ''} *<!date^${flight.flight.departure.schedule.initialGateTime}^ {ago}|${formatDateTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)} in ${flight.flight.departure.airport.timezone}}>*`
  } else if (flight.flight.status === 'DEPARTURE_TAXIING') {
    const isOverdue = Date.now() / 1000 > flight.flight.departure.schedule.runway.original
    statusText = `Taxiing | Take off${isOverdue ? ' due' : ''} *<!date^${flight.flight.departure.schedule.runway.original}^ {ago}|${formatDateTimeInTimeZone(flight.flight.departure.schedule.runway.original, flight.flight.departure.airport.timezone)} in ${flight.flight.departure.airport.timezone}}>*`
  } else if (flight.flight.status === 'EN_ROUTE') {
    statusText = `En route | Lands *<!date^${flight.flight.arrival.schedule.initialGateTime}^ {ago}|${formatDateTimeInTimeZone(flight.flight.arrival.schedule.initialGateTime, flight.flight.arrival.scheduled_airport.timezone)} in ${flight.flight.arrival.scheduled_airport.timezone}}>*`
  } else if (flight.flight.status === 'ARRIVAL_TAXIING') {
    const isOverdue = Date.now() / 1000 > flight.flight.arrival.schedule.gate.original
    statusText = `Taxiing | Gate arrival${isOverdue ? ' due' : ''} *<!date^${flight.flight.arrival.schedule.gate.original}^ {ago}|${formatDateTimeInTimeZone(flight.flight.arrival.schedule.gate.original, flight.flight.arrival.actual_airport.timezone)} in ${flight.flight.arrival.actual_airport.timezone}}>*`
  } else if (flight.flight.status === 'LANDED') {
    statusText = `Landed *<!date^${flight.flight.arrival.schedule.initialGateTime}^ {ago}|${formatDateTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)} in ${flight.flight.departure.airport.timezone}}>*`
  }

  const deactivateOptions: PlainTextOption[] = subscription.active
    ? [
        {
          text: {
            type: 'plain_text',
            text: ':x: Stop updating',
            emoji: true,
          },
          description: {
            type: 'plain_text',
            text: 'Creator only',
          },
          value: 'deactivate',
        },
      ]
    : []

  const deactivatedElements: PlainTextElement[] = subscription.active
    ? []
    : [
        {
          type: 'plain_text',
          text: 'Creator stopped updating',
        },
      ]

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
        {
          type: 'plain_text',
          text: `${flight.flight.departure.airport.iata} - ${flight.flight.arrival.scheduled_airport.iata}${flight.flight.arrival.scheduled_airport.iata !== flight.flight.arrival.actual_airport.iata ? ` (actual ${flight.flight.arrival.actual_airport.iata})` : ''}`,
        },
        {
          type: 'mrkdwn',
          text: `<!date^${Math.round(Date.now() / 1000)}^Last updated {ago}|Last updated at ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC>`,
        },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: statusText },
      accessory: {
        type: 'overflow',
        action_id: 'track_overflow',
        options: [
          {
            text: {
              type: 'plain_text',
              text: ':flighty: Open in Flighty',
              emoji: true,
            },
            url: `https://live.flighty.app/${flight.flight.id}`,
            value: 'flighty',
          },
          {
            text: {
              type: 'plain_text',
              text: ':wastebasket: Delete message',
              emoji: true,
            },
            description: {
              type: 'plain_text',
              text: 'Creator only',
            },
            value: 'delete',
          },
          ...deactivateOptions,
        ],
      },
    },
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
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Tracked by <@${subscription.creator_slack_id}>` },
        {
          type: 'mrkdwn',
          text: `<!date^${Math.round(subscription.created_at.getTime() / 1000)}^{date_short_pretty} at {time}|${subscription.created_at.toLocaleString('en-US')}>`,
        },
        ...deactivatedElements,
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
          { type: 'text', text: `${formatTimeInTimeZone(timestamp, tz)} (` },
          {
            type: 'date',
            timestamp,
            format: '{ago}',
            fallback: `${formatDateTimeInTimeZone(timestamp, tz)} in ${tz}`,
          },
          { type: 'text', text: ')' },
        ],
      },
    ],
  }
}
