import { sql } from 'bun'

export interface Subscription {
  id: string
  active: boolean
  flighty_id: string
  slack_channel: string
  slack_ts: string
  slack_updated_at: Date
  created_at: Date
}

export async function getActiveSubscriptions() {
  return await sql<Subscription[]>`SELECT * FROM subscriptions WHERE active`
}

export async function updateSubscription(subscription: Subscription) {
  const payload = { ...subscription, id: undefined }
  await sql`UPDATE subscriptions SET ${sql(payload)} WHERE id = ${subscription.id}`
}
