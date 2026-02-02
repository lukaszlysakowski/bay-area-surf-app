import type { SpotConfig, SurfConditions } from '../types'
import { getSwellSource, getHistoricalContext, getHistoricalPercentile } from '../lib/spots'

interface SpotDetailsProps {
  spot: SpotConfig
  conditions?: SurfConditions | null
  score?: number
  onClose: () => void
}

export function SpotDetails({ spot, conditions, score, onClose }: SpotDetailsProps) {
  const swellInfo = conditions ? getSwellSource(conditions.swellDirection) : null
  const percentile = score ? getHistoricalPercentile(score) : null
  const historicalContext = score ? getHistoricalContext(score) : null

  const breakTypeLabels: Record<string, string> = {
    beach: 'Beach Break',
    point: 'Point Break',
    reef: 'Reef Break',
    rivermouth: 'Rivermouth',
  }

  const skillLevelColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700',
  }

  const crowdLabels: Record<string, { label: string; color: string }> = {
    empty: { label: 'Usually Empty', color: 'text-green-600' },
    light: { label: 'Light Crowds', color: 'text-green-600' },
    moderate: { label: 'Moderate Crowds', color: 'text-amber-600' },
    crowded: { label: 'Often Crowded', color: 'text-red-600' },
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-[Outfit]">{spot.name}</h2>
            <p className="text-blue-100 text-sm">{spot.region}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Break Type</p>
            <p className="font-semibold text-gray-800">{breakTypeLabels[spot.breakType]}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Skill Level</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium ${skillLevelColors[spot.skillLevel]}`}>
              {spot.skillLevel.charAt(0).toUpperCase() + spot.skillLevel.slice(1)}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Best Tide</p>
            <p className="font-semibold text-gray-800 capitalize">{spot.bestTide}</p>
          </div>
        </div>

        {/* Historical Comparison */}
        {score && percentile && historicalContext && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800">{historicalContext}</p>
                <p className="text-xs text-indigo-600 mt-0.5">Based on typical {new Date().toLocaleDateString('en-US', { month: 'long' })} conditions</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">{percentile}%</div>
                <p className="text-xs text-indigo-500">percentile</p>
              </div>
            </div>
            {/* Percentile bar */}
            <div className="mt-3 h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all"
                style={{ width: `${percentile}%` }}
              />
            </div>
          </div>
        )}

        {/* Swell Source */}
        {swellInfo && conditions && (
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Swell Source
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{swellInfo.arrow}</div>
              <div>
                <p className="font-semibold text-gray-800">
                  {conditions.swellDirection}° ({swellInfo.direction})
                </p>
                <p className="text-sm text-gray-600">{swellInfo.source}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {conditions.waveHeight.toFixed(1)}ft @ {conditions.wavePeriod.toFixed(0)}s
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
          <p className="text-gray-600">{spot.description}</p>
        </div>

        {/* Hazards */}
        {spot.hazards && spot.hazards.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Hazards
            </h3>
            <div className="flex flex-wrap gap-2">
              {spot.hazards.map((hazard, i) => (
                <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
                  {hazard}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Best Swell Direction */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Optimal Swell</h3>
          <p className="text-gray-600">
            {spot.optimalSwellDirections.map(d => `${d}°`).join(' - ')} (
            {spot.optimalSwellDirections.map(d => {
              const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
              return dirs[Math.round(d / 22.5) % 16]
            }).filter((v, i, a) => a.indexOf(v) === i).join(' to ')}
            )
          </p>
        </div>

        {/* Season */}
        {spot.bestSeason && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Best Season
            </h3>
            <p className="text-gray-600">{spot.bestSeason}</p>
          </div>
        )}

        {/* Crowd Level */}
        {spot.typicalCrowd && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Typical Crowd
            </h3>
            <p className={crowdLabels[spot.typicalCrowd].color}>
              {crowdLabels[spot.typicalCrowd].label}
            </p>
          </div>
        )}

        {/* Parking */}
        {spot.parking && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Parking
            </h3>
            <p className="text-gray-600">{spot.parking}</p>
          </div>
        )}

        {/* Facilities */}
        {spot.facilities && spot.facilities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Facilities</h3>
            <div className="flex flex-wrap gap-2">
              {spot.facilities.map((facility, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg">
                  {facility}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
