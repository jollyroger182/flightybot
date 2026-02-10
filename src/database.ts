import { sql } from 'bun'

interface Subscription {
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
