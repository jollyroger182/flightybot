// add flight_number column and populate from Flighty

import { sql } from 'bun'
import { getFlightDetails } from '../src/flighty'
import type { Subscription } from '../src/database'

const subscriptions = await sql<Omit<Subscription, 'flight_number'>[]>`SELECT * FROM subscriptions`

await sql.begin(async (sql) => {
  await sql`ALTER TABLE subscriptions ADD COLUMN flight_number TEXT`

  for (const s of subscriptions) {
    let num = 'UNKNOWN 0'
    try {
      const data = await getFlightDetails(s.flighty_id)
      num = `${data.flight.airline.iata} ${data.flight.flight_number}`
    } catch {
      console.warn('Failed to fetch flight for subscription', s.id)
    }

    const newSub: Subscription = { ...s, flight_number: num }
    const payload = { ...newSub, id: undefined }
    await sql`UPDATE subscriptions SET ${sql(payload)} WHERE id = ${s.id}`
  }

  await sql`ALTER TABLE subscriptions ALTER COLUMN flight_number SET NOT NULL`
})
