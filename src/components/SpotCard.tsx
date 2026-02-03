import { useState, useMemo } from 'react'
import { TideChart, TideSchedule } from './TideChart'
import { degreesToDirection } from '../lib/api/noaa'
import { getRatingColor, getRatingColorClass } from '../lib/utils'
import { calculateBestTimeWindow } from '../lib/scoring'
import { getSunTimes, formatTime, getDawnPatrolStatus } from '../lib/sun'
import { getSwellSource, getHistoricalContext, getHistoricalPercentile } from '../lib/spots'
import { formatShape, getShapeBgClass, type SpitcastDayForecast } from '../lib/api/spitcast'
import type { MarineDayForecast } from '../hooks/useMarineForecast'
import type { SurfConditions, TideData } from '../types'

interface SpotCardProps {
  spot: {
    id: string
    name: string
    description: string
    region: string
    score: number
    rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
    breakdown: string
    coordinates: { lat: number; lng: number }
    bestTide: 'low' | 'mid' | 'high' | 'any'
  }
  rank: number
  conditions?: SurfConditions
  tideData?: TideData
  driveTimeMinutes?: number
  spitcastForecast?: SpitcastDayForecast | null
  waveForecast?: MarineDayForecast | null
  isForecasting?: boolean
  onSelect?: () => void
  onViewDetails?: () => void
}

export function SpotCard({
  spot,
  rank,
  conditions,
  tideData,
  driveTimeMinutes,
  spitcastForecast,
  waveForecast,
  isForecasting,
  onSelect,
  onViewDetails,
}: SpotCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Calculate best time window based on tide and wind patterns
  const bestTimeWindow = useMemo(() => {
    if (!tideData) return null
    return calculateBestTimeWindow(tideData, spot.bestTide)
  }, [tideData, spot.bestTide])

  // Calculate sun times and dawn patrol status
  const sunTimes = useMemo(() => {
    return getSunTimes(spot.coordinates.lat, spot.coordinates.lng, new Date())
  }, [spot.coordinates.lat, spot.coordinates.lng])

  const dawnPatrol = useMemo(() => {
    return getDawnPatrolStatus(sunTimes, driveTimeMinutes)
  }, [sunTimes, driveTimeMinutes])

  // Get swell source info
  const swellInfo = useMemo(() => {
    if (!conditions) return null
    return getSwellSource(conditions.swellDirection)
  }, [conditions])

  // Get historical percentile
  const historicalPercentile = useMemo(() => {
    return getHistoricalPercentile(spot.score)
  }, [spot.score])

  const historicalContext = useMemo(() => {
    return getHistoricalContext(spot.score)
  }, [spot.score])

  // Get glow class based on rating
  const glowClass = {
    Excellent: 'rating-glow-excellent',
    Good: 'rating-glow-good',
    Fair: 'rating-glow-fair',
    Poor: 'rating-glow-poor',
  }[spot.rating]

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden card-hover"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main Content */}
      <div className="p-4 cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Rank Badge */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 transition-shadow ${glowClass}`}
            style={{ backgroundColor: getRatingColor(spot.rating) }}
          >
            {rank}
          </div>

          {/* Spot Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800">{spot.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRatingColorClass(spot.rating)}`}
              >
                {spot.rating}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span>{spot.region}</span>
              {driveTimeMinutes !== undefined && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{driveTimeMinutes} min drive</span>
                </>
              )}
            </div>

            {/* Conditions Summary */}
            {conditions && (
              <div className="flex flex-wrap gap-3 mt-3 relative">
                {/* Loading overlay for forecast data */}
                {isForecasting && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {/* Wave data - use forecast when available for future dates */}
                {waveForecast ? (
                  <ConditionPill
                    label="Waves"
                    value={`${waveForecast.avgWaveHeight.toFixed(1)}ft`}
                    subvalue={`${waveForecast.dominantPeriod.toFixed(0)}s`}
                    forecast
                  />
                ) : (
                  <ConditionPill
                    label="Waves"
                    value={`${conditions.waveHeight.toFixed(1)}ft`}
                    subvalue={`${conditions.wavePeriod.toFixed(0)}s`}
                  />
                )}
                {/* Wind - use forecast when available for future dates */}
                {waveForecast ? (
                  <ConditionPill
                    label="Wind"
                    value={`${waveForecast.avgWindSpeed}mph`}
                    subvalue={degreesToDirection(waveForecast.avgWindDirection)}
                    forecast
                  />
                ) : (
                  <ConditionPill
                    label="Wind"
                    value={`${conditions.windSpeed.toFixed(0)}mph`}
                    subvalue={degreesToDirection(conditions.windDirection)}
                  />
                )}
                {swellInfo && (
                  <ConditionPill
                    label="Swell"
                    value={`${swellInfo.arrow} ${swellInfo.direction}`}
                    subvalue={swellInfo.source.split('/')[0].trim()}
                  />
                )}
                {spitcastForecast && (
                  <SpitcastPill forecast={spitcastForecast} />
                )}
                {conditions.waterTemp && conditions.waterTemp > 0 && (
                  <ConditionPill
                    label="Water"
                    value={`${conditions.waterTemp}°F`}
                  />
                )}
                {bestTimeWindow && (
                  <ConditionPill
                    label="Best"
                    value={`${bestTimeWindow.start}-${bestTimeWindow.end}`}
                    highlight
                  />
                )}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-gray-800">{spot.score}</div>
            <div className="text-xs text-gray-400">/ 100</div>
            {/* Historical Percentile */}
            <div className="mt-1 text-xs text-indigo-600 font-medium">
              Top {100 - historicalPercentile}%
            </div>
          </div>
        </div>

        {/* Historical Context */}
        <div className="mt-2 ml-14">
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {historicalContext}
          </span>
        </div>

        {/* Breakdown Text */}
        <p className="text-sm text-gray-600 mt-2 pl-14">{spot.breakdown}</p>

        {/* Best Time & Dawn Patrol (collapsed view) */}
        <div className="mt-3 ml-14 flex flex-wrap gap-2">
          {/* Best Surf Time */}
          {bestTimeWindow && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-emerald-800">
                Best: {bestTimeWindow.start} – {bestTimeWindow.end}
              </span>
            </div>
          )}

          {/* Dawn Patrol Alert */}
          {dawnPatrol.status === 'leave-now' && dawnPatrol.leaveBy && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-medium text-amber-800">
                Leave by {formatTime(dawnPatrol.leaveBy)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gradient-to-b from-gray-50 to-white" style={{ animation: 'slide-up 0.2s ease-out' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tide Chart & Best Time */}
            {tideData && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Today's Tides
                </h4>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <TideChart tideData={tideData} height={100} />
                </div>
                <div className="mt-2">
                  <TideSchedule tideData={tideData} compact />
                </div>
                {/* Best Time Window */}
                {bestTimeWindow && (
                  <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-600 text-lg">🕐</span>
                      <div>
                        <p className="text-sm font-semibold text-cyan-800">
                          Best surf: {bestTimeWindow.start} - {bestTimeWindow.end}
                        </p>
                        <p className="text-xs text-cyan-600">{bestTimeWindow.reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dawn Patrol Timer */}
                <DawnPatrolTimer
                  sunTimes={sunTimes}
                  dawnPatrol={dawnPatrol}
                  driveTimeMinutes={driveTimeMinutes}
                />
              </div>
            )}

            {/* Detailed Conditions */}
            {conditions && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Current Conditions
                </h4>
                <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-2">
                  <ConditionRow
                    label="Wave Height"
                    value={`${conditions.waveHeight.toFixed(1)} ft`}
                  />
                  <ConditionRow
                    label="Wave Period"
                    value={`${conditions.wavePeriod.toFixed(1)} seconds`}
                    note={conditions.wavePeriod >= 12 ? 'Groundswell' : 'Wind swell'}
                  />
                  <ConditionRow
                    label="Swell Direction"
                    value={`${degreesToDirection(conditions.swellDirection)} (${conditions.swellDirection}°)`}
                  />
                  <ConditionRow
                    label="Wind"
                    value={`${conditions.windSpeed.toFixed(0)} mph ${degreesToDirection(conditions.windDirection)}`}
                    note={conditions.windSpeed < 5 ? 'Glassy' : conditions.windSpeed < 12 ? 'Light' : 'Textured'}
                  />
                  <ConditionRow
                    label="Tide"
                    value={`${conditions.tideHeight.toFixed(1)} ft`}
                    note={conditions.tidePhase}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${spot.coordinates.lat},${spot.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Get Directions
            </a>
            {onSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                View on Map
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewDetails()
                }}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Spot Details
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expand indicator */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-400">
          {expanded ? '▲ Less' : '▼ More details'}
        </span>
      </div>
    </div>
  )
}

function ConditionPill({
  label,
  value,
  subvalue,
  highlight,
  forecast,
}: {
  label: string
  value: string
  subvalue?: string
  highlight?: boolean
  forecast?: boolean
}) {
  const baseClass = forecast
    ? 'bg-indigo-50 border border-indigo-200'
    : highlight
    ? 'bg-cyan-100 border border-cyan-200'
    : 'bg-gray-100'

  const labelClass = forecast ? 'text-indigo-500' : highlight ? 'text-cyan-600' : 'text-gray-500'
  const valueClass = forecast ? 'text-indigo-700' : highlight ? 'text-cyan-700' : 'text-gray-800'
  const subvalueClass = forecast ? 'text-indigo-400' : highlight ? 'text-cyan-500' : 'text-gray-500'

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${baseClass}`}>
      <span className={`text-xs ${labelClass}`}>{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
      {subvalue && (
        <span className={`text-xs ${subvalueClass}`}>{subvalue}</span>
      )}
      {forecast && (
        <span className="text-[9px] text-indigo-400 uppercase tracking-wide">fcst</span>
      )}
    </div>
  )
}

function SpitcastPill({ forecast }: { forecast: SpitcastDayForecast }) {
  const shapeClass = getShapeBgClass(forecast.bestShape)
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${shapeClass}`}>
      <span className="text-xs opacity-80">Shape</span>
      <span className="text-sm font-semibold">{formatShape(forecast.bestShape)}</span>
      <span className="text-xs opacity-70">{forecast.minSize.toFixed(0)}-{forecast.maxSize.toFixed(0)}ft</span>
    </div>
  )
}

function ConditionRow({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-gray-800">{value}</span>
        {note && (
          <span className="text-xs text-gray-400 ml-2">({note})</span>
        )}
      </div>
    </div>
  )
}

// Compact version for list views
interface SpotCardCompactProps {
  spot: {
    id: string
    name: string
    region: string
    score: number
    rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  }
  rank: number
  waveHeight?: number
  onClick?: () => void
}

export function SpotCardCompact({ spot, rank, waveHeight, onClick }: SpotCardCompactProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: getRatingColor(spot.rating) }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate">{spot.name}</div>
        <div className="text-xs text-gray-500">{spot.region}</div>
      </div>
      {waveHeight !== undefined && (
        <div className="text-sm text-gray-600">
          {waveHeight.toFixed(1)}ft
        </div>
      )}
      <div className="text-right">
        <div className="text-xl font-bold text-gray-800">{spot.score}</div>
      </div>
    </div>
  )
}

// Dawn Patrol Timer Component
interface DawnPatrolTimerProps {
  sunTimes: {
    sunrise: Date
    sunset: Date
    firstLight: Date
    lastLight: Date
  }
  dawnPatrol: {
    status: 'too-early' | 'leave-now' | 'on-the-way' | 'surfing' | 'missed'
    message: string
    leaveBy?: Date
  }
  driveTimeMinutes?: number
}

function DawnPatrolTimer({ sunTimes, dawnPatrol, driveTimeMinutes }: DawnPatrolTimerProps) {
  const statusConfig = {
    'too-early': {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: 'text-indigo-500',
      title: 'text-indigo-800',
      text: 'text-indigo-600',
    },
    'leave-now': {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      icon: 'text-amber-500',
      title: 'text-amber-800',
      text: 'text-amber-600',
    },
    'on-the-way': {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      icon: 'text-orange-500',
      title: 'text-orange-800',
      text: 'text-orange-600',
    },
    'surfing': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-500',
      title: 'text-emerald-800',
      text: 'text-emerald-600',
    },
    'missed': {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'text-gray-400',
      title: 'text-gray-600',
      text: 'text-gray-500',
    },
  }

  const config = statusConfig[dawnPatrol.status]

  return (
    <div className={`mt-3 ${config.bg} border ${config.border} rounded-lg p-3`}>
      <div className="flex items-start gap-3">
        {/* Sun Icon */}
        <div className={`${config.icon} mt-0.5`}>
          {dawnPatrol.status === 'missed' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <p className={`text-sm font-semibold ${config.title}`}>
            {dawnPatrol.status === 'leave-now' && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-2"></span>
            )}
            Dawn Patrol
          </p>
          <p className={`text-xs ${config.text} mt-0.5`}>{dawnPatrol.message}</p>

          {/* Sun times detail */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
            <span className={config.text}>
              <span className="opacity-70">First light:</span> {formatTime(sunTimes.firstLight)}
            </span>
            <span className={config.text}>
              <span className="opacity-70">Sunrise:</span> {formatTime(sunTimes.sunrise)}
            </span>
            <span className={config.text}>
              <span className="opacity-70">Sunset:</span> {formatTime(sunTimes.sunset)}
            </span>
          </div>

          {/* Leave by time with drive info */}
          {dawnPatrol.leaveBy && driveTimeMinutes && (
            <div className={`mt-2 pt-2 border-t ${config.border} flex items-center gap-2`}>
              <svg className={`w-4 h-4 ${config.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-xs font-medium ${config.title}`}>
                Leave by {formatTime(dawnPatrol.leaveBy)}
              </span>
              <span className={`text-xs ${config.text}`}>
                ({driveTimeMinutes} min drive + 10 min buffer)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
