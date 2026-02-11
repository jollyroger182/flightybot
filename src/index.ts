import { app } from './client'
import { getActiveSubscriptions, updateSubscription } from './database'
import { updateSlackMessage } from './slack'

await app.start()
console.log('flightybot started')

async function updateAllSubscriptions() {
  const subscriptions = await getActiveSubscriptions()
  for (const sub of subscriptions) {
    if (sub.slack_updated_at.getTime() < Date.now() - 300000) {
      ;(async () => {
        await updateSlackMessage(sub)
        sub.slack_updated_at = new Date()
        await updateSubscription(sub)
      })()
    }
  }
}

setInterval(updateAllSubscriptions, 60000)
updateAllSubscriptions()
