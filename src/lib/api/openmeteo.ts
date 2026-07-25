/**
 * Open-Meteo Marine API Integration
 * Free, no API key needed - provides multi-day wave forecasts
 * https://open-meteo.com/en/docs/marine-weather-api
 */

export interface MarineForecastHour {
  time: Date
  waveHeight: number        // meters
  waveHeightFt: number      // feet
  wavePeriod: number        // seconds
  waveDirection: number     // degrees
  swellHeight: number       // meters
  swellHeightFt: number     // feet
  swellPeriod: number       // seconds
  swellDirection: number    // degrees
  windWaveHeight: number    // meters
  windWaveHeightFt: number  // feet
  // Wind data
  windSpeed: number         // m/s
  windSpeedMph: number      // mph
  windDirection: number     // degrees
  windGusts: number         // m/s
  windGustsMph: number      // mph
}

export interface MarineDayForecast {
  date: Date
  hourly: MarineForecastHour[]
  // Aggregated stats for the day (6am-8pm)
  minWaveHeight: number     // feet
  maxWaveHeight: number     // feet
  avgWaveHeight: number     // feet
  dominantPeriod: number    // seconds
  dominantDirection: number // degrees
  bestHour: MarineForecastHour | null
  // Wind aggregates
  avgWindSpeed: number      // mph
  maxWindSpeed: number      // mph
  avgWindDirection: number  // degrees
}

export interface MarineForecast {
  latitude: number
  longitude: number
  days: MarineDayForecast[]
  generatedAt: Date
}

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  hourly_units: {
    time: string
    wave_height: string
    wave_period: string
    wave_direction: string
    swell_wave_height: string
    swell_wave_period: string
    swell_wave_direction: string
    wind_wave_height: string
    wind_speed_10m: string
    wind_direction_10m: string
    wind_gusts_10m: string
  }
  hourly: {
    time: string[]
    wave_height: (number | null)[]
    wave_period: (number | null)[]
    wave_direction: (number | null)[]
    swell_wave_height: (number | null)[]
    swell_wave_period: (number | null)[]
    swell_wave_direction: (number | null)[]
    wind_wave_height: (number | null)[]
    wind_speed_10m: (number | null)[]
    wind_direction_10m: (number | null)[]
    wind_gusts_10m: (number | null)[]
  }
}

const METERS_TO_FEET = 3.28084

/**
 * Fetch marine forecast from Open-Meteo
 * Returns hourly data for the next 7 days
 */
export async function fetchMarineForecast(
  lat: number,
  lng: number,
  days: number = 7
): Promise<MarineForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: [
      'wave_height',
      'wave_period',
      'wave_direction',
      'swell_wave_height',
      'swell_wave_period',
      'swell_wave_direction',
      'wind_wave_height',
    ].join(','),
    forecast_days: days.toString(),
    timezone: 'America/Los_Angeles',
  })

  const url = `https://marine-api.open-meteo.com/v1/marine?${params}`

  try {
    // The marine endpoint does NOT carry 10m wind (it returns nulls), so wind
    // is fetched from the weather forecast endpoint and merged in by timestamp.
    const [response, windByHour] = await Promise.all([
      fetch(url),
      fetchWindByHour(lat, lng, days),
    ])

    if (!response.ok) {
      console.warn(`Open-Meteo API error: ${response.status}`)
      throw new Error(`Open-Meteo API error: ${response.status}`)
    }

    const data: OpenMeteoResponse = await response.json()
    return parseMarineResponse(data, windByHour)
  } catch (error) {
    console.error('Error fetching Open-Meteo marine data:', error)
    throw error
  }
}

interface HourWind {
  speedMs: number
  dir: number
  gustMs: number
}

/**
 * Fetches 10m wind from the weather forecast endpoint (the marine endpoint
 * returns null wind). Keyed by the hourly timestamp string so it can be merged
 * into the marine hours. Returns an empty map on failure — wind then reads 0.
 */
async function fetchWindByHour(
  lat: number,
  lng: number,
  days: number
): Promise<Map<string, HourWind>> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'ms',
    forecast_days: days.toString(),
    timezone: 'America/Los_Angeles',
  })

  const map = new Map<string, HourWind>()
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) return map
    const data = await res.json()
    const h = data?.hourly
    if (!h?.time) return map
    for (let i = 0; i < h.time.length; i++) {
      map.set(h.time[i], {
        speedMs: h.wind_speed_10m?.[i] ?? 0,
        dir: h.wind_direction_10m?.[i] ?? 0,
        gustMs: h.wind_gusts_10m?.[i] ?? 0,
      })
    }
  } catch (error) {
    console.warn('Wind fetch failed; wind will be unavailable', error)
  }
  return map
}

/**
 * Parse Open-Meteo response into our format
 */
function parseMarineResponse(
  data: OpenMeteoResponse,
  windByHour: Map<string, HourWind> = new Map()
): MarineForecast {
  const hourlyData: MarineForecastHour[] = []

  for (let i = 0; i < data.hourly.time.length; i++) {
    const waveHeight = data.hourly.wave_height[i] ?? 0
    const swellHeight = data.hourly.swell_wave_height[i] ?? 0
    const windWaveHeight = data.hourly.wind_wave_height[i] ?? 0

    // Wind is merged from the weather endpoint (marine endpoint returns null).
    const wind = windByHour.get(data.hourly.time[i])
    const windSpeed = wind?.speedMs ?? 0
    const windGusts = wind?.gustMs ?? 0

    hourlyData.push({
      time: new Date(data.hourly.time[i]),
      waveHeight,
      waveHeightFt: waveHeight * METERS_TO_FEET,
      wavePeriod: data.hourly.wave_period[i] ?? 0,
      waveDirection: data.hourly.wave_direction[i] ?? 0,
      swellHeight,
      swellHeightFt: swellHeight * METERS_TO_FEET,
      swellPeriod: data.hourly.swell_wave_period[i] ?? 0,
      swellDirection: data.hourly.swell_wave_direction[i] ?? 0,
      windWaveHeight,
      windWaveHeightFt: windWaveHeight * METERS_TO_FEET,
      windSpeed,
      windSpeedMph: windSpeed * 2.237, // m/s to mph
      windDirection: wind?.dir ?? 0,
      windGusts,
      windGustsMph: windGusts * 2.237,
    })
  }

  // Group by day
  const dayMap = new Map<string, MarineForecastHour[]>()
  for (const hour of hourlyData) {
    const dateKey = hour.time.toDateString()
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, [])
    }
    dayMap.get(dateKey)!.push(hour)
  }

  // Build day forecasts
  const days: MarineDayForecast[] = []
  for (const [dateKey, hours] of dayMap) {
    days.push(aggregateDayForecast(new Date(dateKey), hours))
  }

  // Sort by date
  days.sort((a, b) => a.date.getTime() - b.date.getTime())

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    days,
    generatedAt: new Date(),
  }
}

/**
 * Aggregate hourly data into a day forecast
 * Focuses on daylight surfable hours (6am - 8pm)
 */
function aggregateDayForecast(date: Date, hours: MarineForecastHour[]): MarineDayForecast {
  // Filter to daylight hours (6am - 8pm)
  const daylightHours = hours.filter((h) => {
    const hour = h.time.getHours()
    return hour >= 6 && hour <= 20
  })

  const surfHours = daylightHours.length > 0 ? daylightHours : hours

  if (surfHours.length === 0) {
    return {
      date,
      hourly: hours,
      minWaveHeight: 0,
      maxWaveHeight: 0,
      avgWaveHeight: 0,
      dominantPeriod: 0,
      dominantDirection: 0,
      bestHour: null,
      avgWindSpeed: 0,
      maxWindSpeed: 0,
      avgWindDirection: 0,
    }
  }

  const heights = surfHours.map((h) => h.waveHeightFt)
  const periods = surfHours.map((h) => h.wavePeriod)
  const directions = surfHours.map((h) => h.waveDirection)
  const windSpeeds = surfHours.map((h) => h.windSpeedMph)
  const windDirections = surfHours.map((h) => h.windDirection)

  // Find best hour (highest swell with good period)
  let bestHour = surfHours[0]
  let bestScore = 0
  for (const hour of surfHours) {
    // Score: wave height * period factor (longer period = better)
    const periodFactor = Math.min(hour.swellPeriod / 10, 1.5)
    const score = hour.swellHeightFt * periodFactor
    if (score > bestScore) {
      bestScore = score
      bestHour = hour
    }
  }

  return {
    date,
    hourly: hours,
    minWaveHeight: Math.min(...heights),
    maxWaveHeight: Math.max(...heights),
    avgWaveHeight: heights.reduce((a, b) => a + b, 0) / heights.length,
    dominantPeriod: periods.reduce((a, b) => a + b, 0) / periods.length,
    dominantDirection: Math.round(directions.reduce((a, b) => a + b, 0) / directions.length),
    bestHour,
    avgWindSpeed: Math.round(windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length),
    maxWindSpeed: Math.round(Math.max(...windSpeeds)),
    avgWindDirection: Math.round(windDirections.reduce((a, b) => a + b, 0) / windDirections.length),
  }
}

/**
 * Get forecast for a specific spot using its coordinates
 */
export async function fetchMarineForecastForSpot(
  spotCoordinates: { lat: number; lng: number },
  days: number = 7
): Promise<MarineForecast> {
  return fetchMarineForecast(spotCoordinates.lat, spotCoordinates.lng, days)
}

/**
 * Get wave quality description based on conditions
 */
export function getWaveQuality(
  waveHeight: number,
  period: number,
  windWaveRatio: number = 0
): { label: string; color: string } {
  // Factor in period (longer = better quality)
  const periodQuality = period >= 14 ? 'excellent' : period >= 10 ? 'good' : period >= 7 ? 'fair' : 'poor'

  // Factor in wind wave contribution (less = cleaner)
  const isClean = windWaveRatio < 0.3

  if (periodQuality === 'excellent' && isClean && waveHeight >= 3) {
    return { label: 'Excellent', color: '#10b981' }
  }
  if (periodQuality === 'good' && waveHeight >= 2) {
    return { label: 'Good', color: '#3b82f6' }
  }
  if (waveHeight >= 1.5) {
    return { label: 'Fair', color: '#f59e0b' }
  }
  return { label: 'Poor', color: '#6b7280' }
}

/**
 * Format wave direction as compass direction
 */
export function formatWaveDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}
