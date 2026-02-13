import { sql } from 'bun'

export interface Subscription {
  id: string
  active: boolean
  flighty_id: string
  flight_number: string
  slack_channel: string
  slack_ts: string
  creator_slack_id: string
  slack_updated_at: Date
  created_at: Date
}

export async function getActiveSubscriptions() {
  return await sql<Subscription[]>`SELECT * FROM subscriptions WHERE active`
}

export async function getActiveSubscriptionsByUser(user: string) {
  return await sql<
    Subscription[]
  >`SELECT * FROM subscriptions WHERE active AND creator_slack_id = ${user} ORDER BY created_at DESC`
}

export async function getSubscriptionByMessage(channel: string, ts: string) {
  return (
    await sql<
      Subscription[]
    >`SELECT * FROM subscriptions WHERE slack_channel = ${channel} AND slack_ts = ${ts}`
  )[0]
}

export async function createSubscription(
  subscription: Omit<Subscription, 'id' | 'created_at' | 'slack_updated_at'>,
) {
  const payload = { ...subscription, created_at: new Date(), slack_updated_at: new Date() }
  return (await sql<[Subscription]>`INSERT INTO subscriptions ${sql(payload)} RETURNING *`)[0]
}

export async function updateSubscription(subscription: Subscription) {
  const payload = { ...subscription, id: undefined }
  await sql`UPDATE subscriptions SET ${sql(payload)} WHERE id = ${subscription.id}`
}

export async function deactivateSubscription(subscription: Subscription) {
  // im lazy
  subscription.active = false
  await updateSubscription(subscription)
}
