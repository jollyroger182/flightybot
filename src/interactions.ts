import { type BlockAction, type OverflowAction } from '@slack/bolt'
import { app } from './client'
import { getSubscriptionByMessage, updateSubscription } from './database'
import { updateSlackMessage } from './slack'

export function registerInteractions() {
  app.action<BlockAction<OverflowAction>>(
    'track_overflow',
    async ({ ack, respond, body, payload }) => {
      ack()

      switch (payload.selected_option.value) {
        case 'flighty':
          break

        // @ts-expect-error fallthrough case
        case 'delete':
          await respond({ delete_original: true })

        case 'deactivate':
          const subscription = await getSubscriptionByMessage(body.channel!.id, body.message!.ts)
          if (!subscription) return
          subscription.active = false
          await updateSubscription(subscription)
          await updateSlackMessage(subscription)
      }
    },
  )
}
