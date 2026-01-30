import { useMemo } from 'react'
import { calculateBestTimeWindow } from '../lib/scoring'
import { getSunTimes, formatTime } from '../lib/sun'
import { getRatingColor } from '../lib/utils'
import type { TideData, SpotConfig, ScoreResult } from '../types'

interface BestTimesGridProps {
  spots: Array<SpotConfig & ScoreResult>
  tideDataMap: Map<string, TideData>
  driveTimesMap?: Map<string, { minutes: number }>
  onSpotClick?: (spotId: string) => void
}

export function BestTimesGrid({
  spots,
  tideDataMap,
  driveTimesMap,
  onSpotClick,
}: BestTimesGridProps) {
  // Calculate best times for each spot
  const spotsWithTimes = useMemo(() => {
    return spots.map((spot) => {
      const tideData = tideDataMap.get(spot.id)
      const bestTimeWindow = tideData
        ? calculateBestTimeWindow(tideData, spot.bestTide)
        : null
      const sunTimes = getSunTimes(spot.coordinates.lat, spot.coordinates.lng, new Date())
      const driveTime = driveTimesMap?.get(spot.id)?.minutes

      return {
        ...spot,
        bestTimeWindow,
        sunrise: formatTime(sunTimes.sunrise),
        driveTime,
      }
    })
  }, [spots, tideDataMap, driveTimesMap])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Best Surf Times Today
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {spotsWithTimes.map((spot, index) => (
          <div
            key={spot.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onSpotClick?.(spot.id)}
          >
            {/* Rank */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: getRatingColor(spot.rating) }}
            >
              {index + 1}
            </div>

            {/* Spot name and region */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{spot.name}</p>
              <p className="text-xs text-gray-500">{spot.region}</p>
            </div>

            {/* Best time window */}
            <div className="text-right">
              {spot.bestTimeWindow ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <p className="text-sm font-semibold text-emerald-700">
                    {spot.bestTimeWindow.start} – {spot.bestTimeWindow.end}
                  </p>
                  <p className="text-[10px] text-emerald-600">{spot.bestTimeWindow.reason}</p>
                </div>
              ) : (
                <span className="text-sm text-gray-400">No data</span>
              )}
            </div>

            {/* Drive time if available */}
            {spot.driveTime && (
              <div className="text-xs text-gray-500 w-16 text-right shrink-0">
                {spot.driveTime} min
              </div>
            )}

            {/* Score */}
            <div className="w-12 text-right shrink-0">
              <span className="text-lg font-bold text-gray-700">{spot.score}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
        <span>Based on tide patterns + typical wind conditions</span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
          Early morning typically has the lightest winds
        </span>
      </div>
    </div>
  )
}
