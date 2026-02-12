import { app } from './client'
import type { ConversationsInfoResponse } from '@slack/web-api'
import { getFlightDetails, type FlightDetails } from './flighty'
import { createSubscription } from './database'
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
      slack_channel: message.channel!,
      slack_ts: message.ts!,
      creator_slack_id: payload.user_id,
    })
  })
}
