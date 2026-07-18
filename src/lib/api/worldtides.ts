import type { TideData } from '../../types'

// WorldTides is a FALLBACK tide source, used only when NOAA CO-OPS fails.
// Requests go through the Vite dev proxy (/api/worldtides), which injects the
// API key server-side so it never appears in client code. See vite.config.ts.
//
// Credit-frugal by design: the caller (tides.ts) only reaches here after NOAA
// errors, fetches once per unique station, and successful results are persisted
// to localStorage (see main.tsx), so a given station+date is charged at most once.
const WORLDTIDES_BASE_URL = '/api/worldtides/api/v3'

const METERS_TO_FEET = 3.28084

interface WorldTidesHeight {
  dt: number
  date: string // ISO 8601, UTC (e.g. "2026-07-18T14:00+0000")
  height: number // meters, relative to the requested datum
}

interface WorldTidesExtreme extends WorldTidesHeight {
  type: 'High' | 'Low'
}

interface WorldTidesResponse {
  status: number
  error?: string
  heights?: WorldTidesHeight[]
  extremes?: WorldTidesExtreme[]
}

/**
 * Fetches tide data from WorldTides for a coordinate and maps it to the app's
 * TideData shape. Heights come back in meters relative to LAT (lowest
 * astronomical tide); we convert to feet. The absolute datum differs slightly
 * from NOAA's MLLW, but timing and shape — what the chart and scoring rely on —
 * are preserved.
 *
 * @param date - YYYYMMDD
 */
export async function fetchWorldTidesData(
  lat: number,
  lng: number,
  date: string,
  days = 1
): Promise<TideData> {
  const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`

  const params = new URLSearchParams({
    heights: '',
    extremes: '',
    lat: String(lat),
    lon: String(lng),
    date: isoDate,
    days: String(days),
    step: '3600', // hourly heights, to mirror NOAA's hourly series
    datum: 'LAT',
  })

  // URLSearchParams renders valueless flags as "heights=" — WorldTides accepts
  // that, but normalize to bare flags to match its documented format.
  const query = params.toString().replace(/=(&|$)/g, '$1')

  const response = await fetch(`${WORLDTIDES_BASE_URL}?${query}`)

  if (!response.ok) {
    throw new Error(`WorldTides request failed: ${response.status}`)
  }

  const data: WorldTidesResponse = await response.json()

  if (data.error) {
    throw new Error(`WorldTides error: ${data.error}`)
  }

  const heights = data.heights ?? []
  const extremes = data.extremes ?? []

  if (heights.length === 0 && extremes.length === 0) {
    throw new Error('WorldTides returned no tide data')
  }

  return {
    highLow: extremes.map((e) => ({
      time: e.date,
      height: e.height * METERS_TO_FEET,
      type: e.type === 'High' ? 'H' : 'L',
    })),
    hourly: heights.map((h) => ({
      time: h.date,
      height: h.height * METERS_TO_FEET,
      type: null,
    })),
  }
}
