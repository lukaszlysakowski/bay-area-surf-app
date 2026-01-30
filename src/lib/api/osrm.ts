import type { DriveTime, OSRMRouteResponse } from '../../types'

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving'

/**
 * Calculates driving time and distance between two points using OSRM
 * Free, no API key required
 */
export async function getDriveTime(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<DriveTime> {
  const url = `${OSRM_BASE_URL}/${startLng},${startLat};${endLng},${endLat}?overview=false`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`)
  }

  const data: OSRMRouteResponse = await response.json()

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found')
  }

  const route = data.routes[0]

  return {
    minutes: Math.round(route.duration / 60),
    miles: Math.round((route.distance / 1609.34) * 10) / 10, // meters to miles, 1 decimal
  }
}

/**
 * Calculates drive times to multiple destinations in parallel
 */
export async function getDriveTimesToSpots(
  startLat: number,
  startLng: number,
  spots: Array<{ id: string; coordinates: { lat: number; lng: number } }>
): Promise<Map<string, DriveTime>> {
  const results = new Map<string, DriveTime>()

  // Batch requests to avoid overwhelming the server
  const batchSize = 5
  for (let i = 0; i < spots.length; i += batchSize) {
    const batch = spots.slice(i, i + batchSize)

    const promises = batch.map(async (spot) => {
      try {
        const driveTime = await getDriveTime(
          startLat,
          startLng,
          spot.coordinates.lat,
          spot.coordinates.lng
        )
        results.set(spot.id, driveTime)
      } catch (error) {
        console.error(`Failed to get drive time to ${spot.id}:`, error)
        // Don't set anything - the spot will just not have drive time
      }
    })

    await Promise.all(promises)

    // Small delay between batches to be respectful to the free API
    if (i + batchSize < spots.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Formats drive time for display
 */
export function formatDriveTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hr`
  }
  return `${hours} hr ${mins} min`
}

/**
 * Formats distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`
  }
  return `${Math.round(miles)} mi`
}

/**
 * Gets a drive time category for filtering/sorting
 */
export function getDriveTimeCategory(minutes: number): 'nearby' | 'moderate' | 'far' {
  if (minutes <= 30) return 'nearby'
  if (minutes <= 60) return 'moderate'
  return 'far'
}
