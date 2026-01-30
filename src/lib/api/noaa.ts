import type { BuoyData } from '../../types'

// Use Vite proxy in development to avoid CORS issues
const NDBC_BASE_URL = '/api/ndbc/data/realtime2'

/**
 * Fetches real-time buoy data from NOAA NDBC
 * Data format: space-delimited text with headers
 *
 * Columns:
 * #YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
 * #yr mo dy hr mn degT m/s  m/s   m  sec sec degT hPa  degC degC degC nmi  hPa   ft
 */
export async function fetchBuoyData(stationId: string): Promise<BuoyData[]> {
  const response = await fetch(`${NDBC_BASE_URL}/${stationId}.txt`)

  if (!response.ok) {
    throw new Error(`Failed to fetch buoy data: ${response.status}`)
  }

  const text = await response.text()
  return parseBuoyData(text)
}

/**
 * Parses NOAA NDBC buoy data text format
 */
function parseBuoyData(text: string): BuoyData[] {
  const lines = text.split('\n').filter((line) => line.trim() && !line.startsWith('#'))

  const results: BuoyData[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)

    // Need at least 15 columns for the data we need
    if (parts.length < 15) continue

    // Parse values, handling 'MM' (missing) values
    const waveHeightM = parseFloat(parts[8]) // WVHT in meters
    const wavePeriod = parseFloat(parts[9]) // DPD in seconds
    const waveDirection = parseInt(parts[11]) // MWD in degrees
    const windSpeedMs = parseFloat(parts[6]) // WSPD in m/s
    const windDirection = parseInt(parts[5]) // WDIR in degrees
    const waterTempC = parseFloat(parts[14]) // WTMP in Celsius
    const airTempC = parseFloat(parts[13]) // ATMP in Celsius

    // Skip rows with missing critical data
    if (isNaN(waveHeightM) || isNaN(wavePeriod)) continue

    // Build timestamp from year, month, day, hour, minute
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    const hour = parseInt(parts[3])
    const minute = parseInt(parts[4])

    // Handle 2-digit year (NOAA uses YY format)
    const fullYear = year < 100 ? 2000 + year : year

    const timestamp = new Date(Date.UTC(fullYear, month - 1, day, hour, minute))

    results.push({
      timestamp,
      waveHeight: metersToFeet(waveHeightM),
      wavePeriod,
      waveDirection: isNaN(waveDirection) ? 0 : waveDirection,
      windSpeed: msToMph(windSpeedMs),
      windDirection: isNaN(windDirection) ? 0 : windDirection,
      waterTemp: celsiusToFahrenheit(waterTempC),
      airTemp: celsiusToFahrenheit(airTempC),
    })
  }

  return results
}

/**
 * Fetches the latest buoy reading (most recent data point)
 */
export async function fetchLatestBuoyData(stationId: string): Promise<BuoyData | null> {
  const data = await fetchBuoyData(stationId)
  return data.length > 0 ? data[0] : null
}

/**
 * Fetches buoy data for multiple stations in parallel
 */
export async function fetchMultipleBuoyData(
  stationIds: string[]
): Promise<Map<string, BuoyData | null>> {
  const results = new Map<string, BuoyData | null>()

  const promises = stationIds.map(async (stationId) => {
    try {
      const data = await fetchLatestBuoyData(stationId)
      results.set(stationId, data)
    } catch (error) {
      console.error(`Failed to fetch buoy ${stationId}:`, error)
      results.set(stationId, null)
    }
  })

  await Promise.all(promises)
  return results
}

// Unit conversion helpers
function metersToFeet(meters: number): number {
  if (isNaN(meters)) return 0
  return Math.round(meters * 3.28084 * 10) / 10 // Round to 1 decimal
}

function msToMph(ms: number): number {
  if (isNaN(ms)) return 0
  return Math.round(ms * 2.237 * 10) / 10 // Round to 1 decimal
}

function celsiusToFahrenheit(celsius: number): number {
  if (isNaN(celsius)) return 0
  return Math.round((celsius * 9) / 5 + 32)
}

/**
 * Gets a human-readable direction label from degrees
 */
export function degreesToDirection(degrees: number): string {
  if (isNaN(degrees)) return 'N/A'

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

/**
 * Formats wave height for display
 */
export function formatWaveHeight(feet: number): string {
  if (feet < 1) return `${Math.round(feet * 12)}"` // inches for small waves
  return `${feet.toFixed(1)}ft`
}

/**
 * Formats wave period for display
 */
export function formatWavePeriod(seconds: number): string {
  return `${seconds.toFixed(1)}s`
}
