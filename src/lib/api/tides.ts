import type { TideData, TidePrediction, NOAATideResponse } from '../../types'

// Use Vite proxy in development to avoid CORS issues
const COOPS_BASE_URL = '/api/coops/api/prod/datagetter'

interface FetchTideOptions {
  stationId: string
  date: string // YYYYMMDD format
  days?: number // Number of days to fetch (default: 1)
}

/**
 * Fetches tide predictions from NOAA CO-OPS API
 * Returns both high/low tide events and hourly predictions for charting
 */
export async function fetchTideData(options: FetchTideOptions): Promise<TideData> {
  const { stationId, date, days = 1 } = options

  // Calculate end date
  const startDate = new Date(
    parseInt(date.slice(0, 4)),
    parseInt(date.slice(4, 6)) - 1,
    parseInt(date.slice(6, 8))
  )
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + days - 1)

  const endDateStr = formatDateForAPI(endDate)

  // Fetch high/low tides and hourly data in parallel
  const [hiloData, hourlyData] = await Promise.all([
    fetchTidePredictions(stationId, date, endDateStr, 'hilo'),
    fetchTidePredictions(stationId, date, endDateStr, 'h'),
  ])

  return {
    highLow: hiloData.predictions.map((p) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: p.type || null,
    })),
    hourly: hourlyData.predictions.map((p) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: null,
    })),
  }
}

/**
 * Internal function to fetch tide predictions with specific interval
 */
async function fetchTidePredictions(
  stationId: string,
  beginDate: string,
  endDate: string,
  interval: 'hilo' | 'h' | '6'
): Promise<NOAATideResponse> {
  const params = new URLSearchParams({
    station: stationId,
    product: 'predictions',
    datum: 'MLLW', // Mean Lower Low Water
    time_zone: 'lst_ldt', // Local with daylight saving
    units: 'english', // Feet
    interval,
    format: 'json',
    begin_date: beginDate,
    end_date: endDate,
    application: 'BayAreaSurfAlmanac',
  })

  const response = await fetch(`${COOPS_BASE_URL}?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch tide data: ${response.status}`)
  }

  const data = await response.json()

  // Handle API errors
  if (data.error) {
    throw new Error(`NOAA API error: ${data.error.message}`)
  }

  return data
}

/**
 * Fetches tide data for today
 */
export async function fetchTodayTides(stationId: string): Promise<TideData> {
  const today = formatDateForAPI(new Date())
  return fetchTideData({ stationId, date: today })
}

/**
 * Fetches tide data for a specific date range
 */
export async function fetchTideRange(
  stationId: string,
  startDate: Date,
  endDate: Date
): Promise<TideData> {
  const start = formatDateForAPI(startDate)
  const end = formatDateForAPI(endDate)

  const [hiloData, hourlyData] = await Promise.all([
    fetchTidePredictions(stationId, start, end, 'hilo'),
    fetchTidePredictions(stationId, start, end, 'h'),
  ])

  return {
    highLow: hiloData.predictions.map((p) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: p.type || null,
    })),
    hourly: hourlyData.predictions.map((p) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: null,
    })),
  }
}

/**
 * Gets the current tide height by interpolating between hourly predictions
 */
export function getCurrentTideHeight(tideData: TideData): number {
  const now = new Date()
  const hourly = tideData.hourly

  // Find the two hourly readings that bracket the current time
  for (let i = 0; i < hourly.length - 1; i++) {
    const current = new Date(hourly[i].time)
    const next = new Date(hourly[i + 1].time)

    if (now >= current && now < next) {
      // Linear interpolation
      const progress = (now.getTime() - current.getTime()) / (next.getTime() - current.getTime())
      return hourly[i].height + progress * (hourly[i + 1].height - hourly[i].height)
    }
  }

  // Fallback to first or last reading
  return hourly.length > 0 ? hourly[0].height : 0
}

/**
 * Determines the current tide phase
 */
export function getTidePhase(
  tideData: TideData
): 'rising' | 'falling' | 'high' | 'low' {
  const now = new Date()
  const highLow = tideData.highLow

  // Find the previous and next high/low
  let prevTide: TidePrediction | null = null
  let nextTide: TidePrediction | null = null

  for (let i = 0; i < highLow.length; i++) {
    const tideTime = new Date(highLow[i].time)
    if (tideTime <= now) {
      prevTide = highLow[i]
    } else if (!nextTide) {
      nextTide = highLow[i]
      break
    }
  }

  // If we're within 30 minutes of a high/low, return that
  if (nextTide) {
    const nextTime = new Date(nextTide.time)
    const minutesToNext = (nextTime.getTime() - now.getTime()) / 1000 / 60
    if (minutesToNext < 30) {
      return nextTide.type === 'H' ? 'high' : 'low'
    }
  }

  if (prevTide) {
    const prevTime = new Date(prevTide.time)
    const minutesSincePrev = (now.getTime() - prevTime.getTime()) / 1000 / 60
    if (minutesSincePrev < 30) {
      return prevTide.type === 'H' ? 'high' : 'low'
    }

    // Determine if rising or falling based on previous tide
    return prevTide.type === 'L' ? 'rising' : 'falling'
  }

  return 'rising' // Default fallback
}

/**
 * Gets the next high and low tide times
 */
export function getNextTides(tideData: TideData): {
  nextHigh: TidePrediction | null
  nextLow: TidePrediction | null
} {
  const now = new Date()
  let nextHigh: TidePrediction | null = null
  let nextLow: TidePrediction | null = null

  for (const tide of tideData.highLow) {
    const tideTime = new Date(tide.time)
    if (tideTime > now) {
      if (tide.type === 'H' && !nextHigh) {
        nextHigh = tide
      } else if (tide.type === 'L' && !nextLow) {
        nextLow = tide
      }
      if (nextHigh && nextLow) break
    }
  }

  return { nextHigh, nextLow }
}

/**
 * Formats a Date to YYYYMMDD for the API
 */
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Formats tide time for display (e.g., "2:30 PM")
 */
export function formatTideTime(timeStr: string): string {
  const date = new Date(timeStr)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats tide height for display
 */
export function formatTideHeight(height: number): string {
  return `${height.toFixed(1)}ft`
}
