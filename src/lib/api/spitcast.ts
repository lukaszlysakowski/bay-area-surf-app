/**
 * Spitcast API Integration
 * California-specific surf forecasts with shape ratings
 * https://api.spitcast.com
 */

// Spitcast spot ID mappings for our surf spots
export const SPITCAST_SPOT_IDS: Record<string, number> = {
  'half-moon-bay': 122,      // Mavericks
  'pacifica-linda-mar': 120, // Linda Mar
  'ocean-beach-sf': 114,     // Ocean Beach VFW
  'fort-point': 113,         // Fort Point
  'bolinas': 110,            // Bolinas
  'stinson-beach': 111,      // Stinson Beach
  'rodeo-beach': 112,        // Fort Cronkhite (closest to Rodeo)
  'muir-beach': 112,         // Fort Cronkhite (closest)
  'dillon-beach': 106,       // Russian Rivermouth (closest)
  'salmon-creek': 694,       // Goat Rock (closest)
}

// Shape quality labels
export const SHAPE_LABELS: Record<string, string> = {
  'poor': 'Poor',
  'poor-fair': 'Poor-Fair',
  'fair': 'Fair',
  'good': 'Good',
  'good-epic': 'Good-Epic',
  'epic': 'Epic',
}

export interface SpitcastForecast {
  spotId: number
  timestamp: number
  dateLocal: {
    year: number
    month: number
    day: number
    hour: number
  }
  sizeFt: number
  sizeMeters: number
  shape: number
  shapeLabel: string
  shapeBreakdown: {
    swell: number
    wind: number
    tide: number
  }
  warnings: string[]
}

export interface SpitcastDayForecast {
  spotId: number
  date: Date
  hourly: SpitcastForecast[]
  // Aggregated stats
  minSize: number
  maxSize: number
  avgSize: number
  bestShape: number
  bestShapeLabel: string
  bestHour: number
  warnings: string[]
}

interface SpitcastApiResponse {
  _id: string
  spot_id: number
  timestamp: number
  date_local: {
    yy: number
    mm: number
    dd: number
    hh: number
  }
  size: number
  size_ft: number
  shape: number
  shape_list: Array<{
    source: string
    value: number
    influence: number
  }>
  warnings: string[]
}

/**
 * Convert shape number to label
 */
function getShapeLabel(shape: number): string {
  if (shape <= 0) return 'poor'
  if (shape <= 0.5) return 'poor-fair'
  if (shape <= 1.0) return 'fair'
  if (shape <= 1.5) return 'good'
  if (shape <= 2.0) return 'good-epic'
  return 'epic'
}

/**
 * Fetch surf forecast for a specific spot and date from Spitcast
 */
export async function fetchSpitcastForecast(
  spotId: number,
  date: Date
): Promise<SpitcastForecast[]> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const url = `https://api.spitcast.com/api/spot_forecast/${spotId}/${year}/${month}/${day}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`Spitcast API error: ${response.status}`)
      return []
    }

    const data: SpitcastApiResponse[] = await response.json()

    return data.map((item) => {
      // Extract shape breakdown
      const shapeBreakdown = {
        swell: 0,
        wind: 0,
        tide: 0,
      }
      item.shape_list?.forEach((s) => {
        if (s.source === 'swell') shapeBreakdown.swell = s.value
        if (s.source === 'wind') shapeBreakdown.wind = s.value
        if (s.source === 'tide') shapeBreakdown.tide = s.value
      })

      return {
        spotId: item.spot_id,
        timestamp: item.timestamp,
        dateLocal: {
          year: item.date_local.yy,
          month: item.date_local.mm,
          day: item.date_local.dd,
          hour: item.date_local.hh,
        },
        sizeFt: item.size_ft,
        sizeMeters: item.size,
        shape: item.shape,
        shapeLabel: getShapeLabel(item.shape),
        shapeBreakdown,
        warnings: item.warnings || [],
      }
    })
  } catch (error) {
    console.error('Error fetching Spitcast data:', error)
    return []
  }
}

/**
 * Fetch forecast for a spot using our spot ID
 */
export async function fetchSpitcastForSpot(
  ourSpotId: string,
  date: Date
): Promise<SpitcastForecast[]> {
  const spitcastId = SPITCAST_SPOT_IDS[ourSpotId]
  if (!spitcastId) {
    console.warn(`No Spitcast mapping for spot: ${ourSpotId}`)
    return []
  }
  return fetchSpitcastForecast(spitcastId, date)
}

/**
 * Get aggregated day forecast for a spot
 */
export async function fetchSpitcastDayForecast(
  ourSpotId: string,
  date: Date
): Promise<SpitcastDayForecast | null> {
  const hourly = await fetchSpitcastForSpot(ourSpotId, date)

  if (hourly.length === 0) return null

  const spitcastId = SPITCAST_SPOT_IDS[ourSpotId]
  if (!spitcastId) return null

  // Filter to daylight hours (6am - 8pm)
  const daylightHours = hourly.filter(
    (h) => h.dateLocal.hour >= 6 && h.dateLocal.hour <= 20
  )

  const forecastHours = daylightHours.length > 0 ? daylightHours : hourly

  const sizes = forecastHours.map((h) => h.sizeFt)
  const shapes = forecastHours.map((h) => h.shape)

  // Find the best hour (highest shape during daylight)
  let bestHour = forecastHours[0]
  for (const h of forecastHours) {
    if (h.shape > bestHour.shape || (h.shape === bestHour.shape && h.sizeFt > bestHour.sizeFt)) {
      bestHour = h
    }
  }

  // Collect all warnings
  const allWarnings = new Set<string>()
  hourly.forEach((h) => h.warnings.forEach((w) => allWarnings.add(w)))

  return {
    spotId: spitcastId,
    date,
    hourly,
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
    avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    bestShape: Math.max(...shapes),
    bestShapeLabel: getShapeLabel(Math.max(...shapes)),
    bestHour: bestHour.dateLocal.hour,
    warnings: Array.from(allWarnings),
  }
}

/**
 * Get shape color for UI
 */
export function getShapeColor(shape: number): string {
  if (shape <= 0) return '#ef4444'      // red - poor
  if (shape <= 0.5) return '#f97316'    // orange - poor-fair
  if (shape <= 1.0) return '#eab308'    // yellow - fair
  if (shape <= 1.5) return '#22c55e'    // green - good
  return '#06b6d4'                       // cyan - epic
}

/**
 * Get shape background class for UI
 */
export function getShapeBgClass(shape: number): string {
  if (shape <= 0) return 'bg-red-100 text-red-700'
  if (shape <= 0.5) return 'bg-orange-100 text-orange-700'
  if (shape <= 1.0) return 'bg-yellow-100 text-yellow-700'
  if (shape <= 1.5) return 'bg-green-100 text-green-700'
  return 'bg-cyan-100 text-cyan-700'
}

/**
 * Format shape as display text
 */
export function formatShape(shape: number): string {
  const label = getShapeLabel(shape)
  return SHAPE_LABELS[label] || 'Unknown'
}
