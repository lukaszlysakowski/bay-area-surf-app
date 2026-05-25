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

  return (
    <div
      className="bg-white rounded-[8px] border border-[#1A1C1E]/10 overflow-hidden card-hover"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main Content */}
      <div className="p-4 cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Rank Badge */}
          <div
            className="w-10 h-10 rounded-[4px] flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: getRatingColor(spot.rating) }}
          >
            {rank}
          </div>

          {/* Spot Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[#1A1C1E]">{spot.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRatingColorClass(spot.rating)}`}
              >
                {spot.rating}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-[#6C7278] font-label">
              <span>{spot.region}</span>
              {driveTimeMinutes !== undefined && (
                <>
                  <span className="text-[#6C7278]/40">•</span>
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
            <div className="text-3xl font-bold text-[#1A1C1E]">{spot.score}</div>
            <div className="text-xs text-[#6C7278] font-label">/ 100</div>
            <div className="mt-1 text-xs text-[#B8422E] font-label font-medium">
              Top {100 - historicalPercentile}%
            </div>
          </div>
        </div>

        {/* Historical Context */}
        <div className="mt-2 ml-14">
          <span className="inline-flex items-center gap-1.5 text-xs text-[#6C7278] bg-[#EDE9E4] px-2 py-1 rounded-[2px] font-label">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {historicalContext}
          </span>
        </div>

        {/* Breakdown Text */}
        <p className="text-sm text-[#6C7278] mt-2 pl-14">{spot.breakdown}</p>

        {/* Best Time & Dawn Patrol (collapsed view) */}
        <div className="mt-3 ml-14 flex flex-wrap gap-2">
          {/* Best Surf Time */}
          {bestTimeWindow && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F7F5F2] border border-[#1A1C1E]/15 rounded-[4px]">
              <svg className="w-3.5 h-3.5 text-[#1A1C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-[#1A1C1E] font-label">
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
        <div className="border-t border-[#1A1C1E]/10 p-4 bg-[#F7F5F2]" style={{ animation: 'slide-up 0.2s ease-out' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tide Chart & Best Time */}
            {tideData && (
              <div>
                <h4 className="text-sm font-medium text-[#1A1C1E] mb-2">
                  Today's Tides
                </h4>
                <div className="bg-white rounded-[4px] p-3 border border-[#1A1C1E]/10">
                  <TideChart tideData={tideData} height={100} showLabels={false} />
                </div>
                <div className="mt-2">
                  <TideSchedule tideData={tideData} compact />
                </div>
                {/* Best Time Window */}
                {bestTimeWindow && (
                  <div className="mt-3 bg-[#F7F5F2] border border-[#1A1C1E]/10 rounded-[4px] p-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#1A1C1E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1C1E]">
                          Best surf: {bestTimeWindow.start} – {bestTimeWindow.end}
                        </p>
                        <p className="text-xs text-[#6C7278] font-label">{bestTimeWindow.reason}</p>
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
                <h4 className="text-sm font-medium text-[#1A1C1E] mb-2">
                  Current Conditions
                </h4>
                <div className="bg-white rounded-[4px] p-3 border border-[#1A1C1E]/10 space-y-2">
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
              className="px-4 py-2 bg-[#B8422E] text-white rounded-[4px] text-sm font-medium hover:bg-[#A33826] transition-colors"
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
                className="px-4 py-2 bg-[#EDE9E4] text-[#1A1C1E] rounded-[4px] text-sm font-medium hover:bg-[#1A1C1E] hover:text-white transition-colors"
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
                className="px-4 py-2 bg-[#EDE9E4] text-[#1A1C1E] rounded-[4px] text-sm font-medium hover:bg-[#1A1C1E] hover:text-white transition-colors flex items-center gap-1.5"
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
      <div className="px-4 py-2 bg-[#F7F5F2] border-t border-[#1A1C1E]/10 flex items-center justify-center">
        <span className="text-xs text-[#6C7278] font-label">
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
    ? 'bg-[#F7F5F2] border border-[#1A1C1E]/15'
    : highlight
    ? 'bg-white border border-[#B8422E]/25'
    : 'bg-[#F7F5F2]'

  const labelClass = forecast ? 'text-[#6C7278]' : highlight ? 'text-[#B8422E]' : 'text-[#6C7278]'
  const valueClass = forecast ? 'text-[#1A1C1E]' : highlight ? 'text-[#B8422E]' : 'text-[#1A1C1E]'
  const subvalueClass = 'text-[#6C7278]'

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] ${baseClass}`}>
      <span className={`text-xs font-label ${labelClass}`}>{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
      {subvalue && (
        <span className={`text-xs ${subvalueClass}`}>{subvalue}</span>
      )}
      {forecast && (
        <span className="text-[9px] text-[#6C7278] font-label uppercase tracking-wide">fcst</span>
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
      <span className="text-sm text-[#6C7278] font-label">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-[#1A1C1E]">{value}</span>
        {note && (
          <span className="text-xs text-[#6C7278] ml-2">({note})</span>
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
      className="flex items-center gap-3 p-3 bg-white rounded-[4px] border border-[#1A1C1E]/10 cursor-pointer hover:bg-[#F7F5F2] transition-colors"
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: getRatingColor(spot.rating) }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#1A1C1E] truncate">{spot.name}</div>
        <div className="text-xs text-[#6C7278] font-label">{spot.region}</div>
      </div>
      {waveHeight !== undefined && (
        <div className="text-sm text-[#6C7278]">
          {waveHeight.toFixed(1)}ft
        </div>
      )}
      <div className="text-right">
        <div className="text-xl font-bold text-[#1A1C1E]">{spot.score}</div>
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
  // Heritage-aligned status config — neutral base, semantic accents only where needed
  const statusConfig = {
    'too-early': {
      bg: 'bg-[#F7F5F2]',
      border: 'border-[#1A1C1E]/10',
      iconColor: '#6C7278',
      titleColor: '#1A1C1E',
      textColor: '#6C7278',
      pulse: false,
    },
    'leave-now': {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: '#d97706',
      titleColor: '#92400e',
      textColor: '#b45309',
      pulse: true,
    },
    'on-the-way': {
      bg: 'bg-[#F7F5F2]',
      border: 'border-[#1A1C1E]/10',
      iconColor: '#B8422E',
      titleColor: '#1A1C1E',
      textColor: '#6C7278',
      pulse: false,
    },
    'surfing': {
      bg: 'bg-[#F7F5F2]',
      border: 'border-[#1A1C1E]/10',
      iconColor: '#2d9c6e',
      titleColor: '#1A1C1E',
      textColor: '#6C7278',
      pulse: false,
    },
    'missed': {
      bg: 'bg-[#F7F5F2]',
      border: 'border-[#1A1C1E]/8',
      iconColor: '#9ca3af',
      titleColor: '#6C7278',
      textColor: '#9ca3af',
      pulse: false,
    },
  }

  const config = statusConfig[dawnPatrol.status]

  return (
    <div className={`mt-3 ${config.bg} border ${config.border} rounded-[4px] p-3`}>
      <div className="flex items-start gap-3">
        {/* Sun icon */}
        <div className="mt-0.5 shrink-0">
          {dawnPatrol.status === 'missed' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: config.iconColor }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: config.iconColor }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: config.titleColor }}>
            {config.pulse && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            )}
            Dawn Patrol
          </p>
          <p className="text-xs mt-0.5 font-label" style={{ color: config.textColor }}>
            {dawnPatrol.message}
          </p>

          {/* Sun times */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs font-label text-[#6C7278]">
            <span>
              <span className="text-[#9ca3af]">First light: </span>
              {formatTime(sunTimes.firstLight)}
            </span>
            <span>
              <span className="text-[#9ca3af]">Sunrise: </span>
              {formatTime(sunTimes.sunrise)}
            </span>
            <span>
              <span className="text-[#9ca3af]">Sunset: </span>
              {formatTime(sunTimes.sunset)}
            </span>
          </div>

          {/* Leave by */}
          {dawnPatrol.leaveBy && driveTimeMinutes && (
            <div className="mt-2 pt-2 border-t border-[#1A1C1E]/8 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#1A1C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-[#1A1C1E]">
                Leave by {formatTime(dawnPatrol.leaveBy)}
              </span>
              <span className="text-xs text-[#6C7278] font-label">
                ({driveTimeMinutes} min + 10 min buffer)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
