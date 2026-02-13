import { app } from './client'
import type { ConversationsInfoResponse } from '@slack/web-api'
import { getFlightDetails, type FlightDetails } from './flighty'
import { createSubscription, getActiveSubscriptionsByUser } from './database'
import { generateSlackMessage } from './slack'

export function registerCommands() {
  app.command(/.*-track$/, async ({ payload, ack, respond }) => {
    const text = payload.text
    const match = text.match(/^https?:\/\/live\.flighty\.app\/([a-zA-Z0-9-]+)$/)
    if (!match) {
      return ack('Please provide a single, valid Flighty Live Share URL!')
    }
    const id = match[1]!
    await ack()

    let channel: ConversationsInfoResponse
    try {
      channel = await app.client.conversations.info({ channel: payload.channel_id })
    } catch (e) {
      if (e instanceof Error && (e as any)?.data?.error === 'channel_not_found') {
        return respond(
          'This seems to be a private channel. Please invite me to the channel, then try again!',
        )
      }
      throw e
    }

    if (!channel.channel?.is_member) {
      await app.client.conversations.join({ channel: payload.channel_id })
    }

    let data: FlightDetails
    try {
      data = await getFlightDetails(id)
    } catch (e) {
      console.error('invalid flight?', e)
      return respond('The Flighty link does not seem to be valid. Please try again!')
    }

    const message = await app.client.chat.postMessage({
      channel: payload.channel_id,
      ...(await generateSlackMessage(data, {
        active: true,
        creator_slack_id: payload.user_id,
        created_at: new Date(),
      })),
    })

    await createSubscription({
      active: true,
      flighty_id: id,
      flight_number: `${data.flight.airline.iata} ${data.flight.flight_number}`,
      slack_channel: message.channel!,
      slack_ts: message.ts!,
      creator_slack_id: payload.user_id,
    })
  })

  app.command(/.*-list/, async ({ payload, ack, respond }) => {
    await ack()

    const allSubscriptions = await getActiveSubscriptionsByUser(payload.user_id)
    const subscriptions = allSubscriptions.slice(0, 10)

    if (!subscriptions.length) {
      const name = payload.command.replace('-list', '-track')
      return respond(
        `:airplane: No active flights tracked. Get started with \`${name} <flighty-url>\`!`,
      )
    }

    const subscriptionsText = (
      await Promise.all(
        subscriptions.map(
          async (s) =>
            `- <${(await app.client.chat.getPermalink({ channel: s.slack_channel, message_ts: s.slack_ts })).permalink}|${s.flight_number}> (in <#${s.slack_channel}>, tracked <!date^${Math.round(s.created_at.getTime() / 1000)}^{date_short_pretty} at {time}|${s.created_at.toLocaleString('en-US', { timeZone: 'UTC' })} UTC>)`,
        ),
      )
    ).join('\n')
    const overflowText =
      allSubscriptions.length > subscriptions.length
        ? ` (only the latest ${subscriptions.length} of ${allSubscriptions.length} shown)`
        : ''
    const text = `:airplane: Here are your active tracked flights${overflowText}:\n${subscriptionsText}`

    await respond(text)
  })
}
