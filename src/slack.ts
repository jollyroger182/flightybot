import type { ContextBlockElement, KnownBlock } from '@slack/web-api'
import type { Subscription } from './database'
import { getFlightDetails, type FlightDetails } from './flighty'
import { app } from './client'
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
  // if (flight.flight.status === 'SCHEDULED') {
  //   contextElements.push(
  //     {
  //       type: 'mrkdwn',
  //       text: `Departs ${formatTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)}`,
  //     },
  //     {
  //       type: 'mrkdwn',
  //       text: `Arrives ${formatTimeInTimeZone(flight.flight.arrival.schedule.initialGateTime, flight.flight.arrival.scheduled_airport.timezone)}`,
  //     },
  //   )
  // } else if (flight.flight.status === 'EN_ROUTE') {
  //   contextElements.push(
  //     {
  //       type: 'mrkdwn',
  //       text: `Departed ${formatTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)}`,
  //     },
  //     {
  //       type: 'mrkdwn',
  //       text: `Arrives ${formatTimeInTimeZone(flight.flight.arrival.schedule.initialGateTime, flight.flight.arrival.scheduled_airport.timezone)}`,
  //     },
  //   )
  // } else if (flight.flight.status === 'LANDED') {
  //   contextElements.push(
  //     {
  //       type: 'mrkdwn',
  //       text: `Departed ${formatTimeInTimeZone(flight.flight.departure.schedule.initialGateTime, flight.flight.departure.airport.timezone)}`,
  //     },
  //     {
  //       type: 'mrkdwn',
  //       text: `Arrived ${formatTimeInTimeZone(flight.flight.arrival.schedule.initialGateTime, flight.flight.arrival.scheduled_airport.timezone)}`,
  //     },
  //   )
  // }

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
  ]

  return {
    text: `Flight ${flight.flight.airline.iata} ${flight.flight.flight_number} (${flight.flight.status})`,
    blocks,
  }
}
