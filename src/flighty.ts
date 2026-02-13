export async function getFlightDetails(id: string): Promise<FlightDetails> {
  let resp: Response
  try {
    resp = await fetch(`https://live.flighty.app/${id}/data`)
  } catch (e) {
    console.error('failed fetching flighty url', e)
    throw new Error('Failed to get flight details: Failed to fetch')
  }

  if (resp.status === 404) {
    // sometimes /data is just 404 idk why
    return getFlightDetailsFromPage(id)
  }

  if (resp.status !== 200) {
    console.error(`status code ${resp.status} getting flight`, await resp.text())
    throw new Error(
      `Failed to get flight details: Received status code ${resp.status} ${resp.statusText}`,
    )
  }

  try {
    return (await resp.json()) as FlightDetails
  } catch (e) {
    console.error('cannot json parse response')
    throw new Error(`Failed to get flight details: Failed to parse flight data`)
  }
}

async function getFlightDetailsFromPage(id: string): Promise<FlightDetails> {
  let resp: Response
  try {
    resp = await fetch(`https://live.flighty.app/${id}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0',
      },
      redirect: 'manual',
    })
  } catch (e) {
    console.error('failed fetching flighty url', e)
    throw new Error('Failed to get flight details: Failed to fetch')
  }

  if (resp.status !== 200) {
    console.error(`status code ${resp.status} getting flight`, await resp.text())
    throw new Error(
      `Failed to get flight details: Received status code ${resp.status} ${resp.statusText}`,
    )
  }

  const html = await resp.text()
  const flightData = html.match(/var flight = (.+);\n/)
  if (!flightData) {
    console.error(`no flight data found in response`, html)
    throw new Error(`Failed to get flight details: No flight data found in page`)
  }

  try {
    return JSON.parse(flightData[1]!)
  } catch (e) {
    console.error('cannot json parse flight data', flightData[1])
    throw new Error(`Failed to get flight details: Failed to parse flight data`)
  }
}

export type TimeComponents = [number, number, number, number, number]
export type TimeComponentsSecond = [number, number, number, number, number, number]

export interface FlightDetails {
  flight: {
    id: string
    departure: {
      airport: Airport
      terminal: string
      gate?: string
      schedule: Schedule
      airportDelays: AirportDelays
      checkInSchedule: { open: TimeComponents; close: TimeComponents }
      weather: Weather
      notams: unknown[] // TODO
    }
    arrival: {
      scheduled_airport: Airport
      actual_airport: Airport
      terminal: string
      baggage_belt?: string
      schedule: Schedule
      weather: Weather
      airportDelays: AirportDelays
      notams: unknown[] // TODO
    }
    airline: Airline
    flight_number: string
    status:
      | 'SCHEDULED'
      | 'DEPARTURE_TAXIING'
      | 'EN_ROUTE'
      | 'ARRIVAL_TAXIING'
      | 'LANDED'
      | 'CANCELLED'
    equipment: Equipment
    distance: number
  }
  flightPosition: { latitude: number; longitude: number; heading: number }[]
  route: { latitude: number; longitude: number }[]
  update: string
  deeplink: string
}

interface Equipment {
  modelId: string
  tail_number: string
  model_name: string
  stats_model_name: string
  features: unknown[] // TODO
  range: number
  cruising_speed: number
  model_iata: string
  model_icao: string
  first_flight: number
  age: number
  countryCode: string
  manufacturer: string
}

interface Airline {
  id: string
  name: string
  iata: string
  icao: string
  website: string
  twitter: string
  callsign: string
  phone: string
  facebook: string
  alliance: string
  active: boolean
  relevance: number
  created: TimeComponentsSecond
  last_updated: TimeComponentsSecond
  content_type: 'AIRLINE'
}

interface AirportDelays {
  averageDelayMinutes: number
  lastUpdated: TimeComponentsSecond
  expirationTime: TimeComponentsSecond
  trend?: 'INCREASING' | 'DECREASING'
}

interface Schedule {
  gate: ScheduleItem
  runway: ScheduleItem
  initialGateTime: TimeComponents
}

interface Weather {
  temperature: number
  condition: number
  night: boolean
  conditionName: string
  conditionIcon: string
  warnings: unknown[] // TODO
  source: string
  lastUpdated: TimeComponents
}

interface ScheduleItem {
  original: TimeComponents
  actual: TimeComponents | null
  estimated: TimeComponents
  predicted: TimeComponents | null
}

interface Airport {
  id: string
  name: string
  full_name: string
  iata: string
  icao: string
  timezone: string
  location: Location
  city: string
  country: string
  countryCode: string
  region: string
  relevance: number
  website?: string
  cityCode?: string
  created: TimeComponentsSecond
  last_updated: TimeComponentsSecond
  content_type: 'AIRPORT'
}

interface Location {
  latitude: number
  longitude: number
}
