import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTideRange } from '../lib/api/tides'
import { getMonthMoonPhases, isSignificantPhase } from '../lib/moon'
import type { TideData } from '../types'

interface TideCalendarProps {
  stationId: string
  stationName?: string
  onClose?: () => void
  onSelectDate?: (date: Date) => void
}

export function TideCalendar({ stationId, stationName, onClose, onSelectDate }: TideCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Fetch tide data for the month
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  const { data: tideData, isLoading } = useQuery<TideData>({
    queryKey: ['tides-calendar', stationId, year, month],
    queryFn: () => fetchTideRange(stationId, startDate, endDate),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  // Get moon phases for the month
  const moonPhases = useMemo(() => getMonthMoonPhases(year, month), [year, month])

  // Group tide data by day (high/low points)
  const tidesByDay = useMemo(() => {
    if (!tideData) return new Map<number, { highs: number[]; lows: number[] }>()

    const grouped = new Map<number, { highs: number[]; lows: number[] }>()

    for (const tide of tideData.highLow) {
      const date = new Date(tide.time)
      if (date.getMonth() !== month) continue

      const day = date.getDate()
      if (!grouped.has(day)) {
        grouped.set(day, { highs: [], lows: [] })
      }

      const dayData = grouped.get(day)!
      if (tide.type === 'H') {
        dayData.highs.push(tide.height)
      } else {
        dayData.lows.push(tide.height)
      }
    }

    return grouped
  }, [tideData, month])

  // Group hourly tide data by day for sparklines
  const hourlyByDay = useMemo(() => {
    if (!tideData?.hourly) return new Map<number, number[]>()

    const grouped = new Map<number, number[]>()

    for (const tide of tideData.hourly) {
      const date = new Date(tide.time)
      if (date.getMonth() !== month) continue

      const day = date.getDate()
      if (!grouped.has(day)) {
        grouped.set(day, [])
      }
      grouped.get(day)!.push(tide.height)
    }

    return grouped
  }, [tideData, month])

  // Calculate global min/max for consistent sparkline scaling
  const { globalMin, globalMax } = useMemo(() => {
    if (!tideData?.hourly || tideData.hourly.length === 0) {
      return { globalMin: 0, globalMax: 6 }
    }
    const heights = tideData.hourly.map(t => t.height)
    return {
      globalMin: Math.min(...heights) - 0.5,
      globalMax: Math.max(...heights) + 0.5
    }
  }, [tideData])

  // Calendar grid setup
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const today = new Date()

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-[Outfit]">Tide Calendar</h2>
            {stationName && (
              <p className="text-cyan-100 text-sm">{stationName}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-semibold">{monthName}</span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 overflow-y-auto flex-1">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg"></div>
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const cellDate = new Date(year, month, day)
              const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year
              const moonInfo = moonPhases.get(day)
              const tides = tidesByDay.get(day)
              const hourlyData = hourlyByDay.get(day)
              const isWeekend = (firstDayOfWeek + i) % 7 === 0 || (firstDayOfWeek + i) % 7 === 6
              const isPast = cellDate < today && !isToday

              return (
                <button
                  key={day}
                  onClick={() => !isPast && onSelectDate?.(cellDate)}
                  disabled={isPast}
                  className={`h-24 rounded-lg p-1.5 border transition-all text-left ${
                    isPast
                      ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                      : isToday
                      ? 'bg-cyan-50 border-cyan-300 cursor-pointer hover:shadow-md'
                      : isWeekend
                      ? 'bg-blue-50/50 border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-sm'
                      : 'bg-white border-gray-100 cursor-pointer hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {/* Day number and moon */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        isToday ? 'text-cyan-700' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {moonInfo && isSignificantPhase(moonInfo.phase) && (
                      <span className="text-xs" title={moonInfo.name}>
                        {moonInfo.emoji}
                      </span>
                    )}
                  </div>

                  {/* Sparkline tide chart */}
                  {hourlyData && hourlyData.length > 0 && (
                    <div className="mt-1">
                      <TideSparkline
                        data={hourlyData}
                        minValue={globalMin}
                        maxValue={globalMax}
                        isToday={isToday}
                      />
                    </div>
                  )}

                  {/* Tide high/low values */}
                  {tides && (
                    <div className="flex items-center justify-between mt-0.5 px-0.5">
                      {tides.highs.length > 0 && (
                        <span className="text-[9px] text-blue-600 font-medium">
                          ▲{Math.max(...tides.highs).toFixed(1)}
                        </span>
                      )}
                      {tides.lows.length > 0 && (
                        <span className="text-[9px] text-orange-500 font-medium">
                          ▼{Math.min(...tides.lows).toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="text-blue-600">▲</span> High tide
          </span>
          <span className="flex items-center gap-1">
            <span className="text-orange-500">▼</span> Low tide
          </span>
          <span className="flex items-center gap-1">
            🌑🌓🌕🌗 Moon phases
          </span>
        </div>
      </div>
    </div>
  )
}

// Sparkline component for mini tide chart
interface TideSparklineProps {
  data: number[]
  minValue: number
  maxValue: number
  isToday?: boolean
}

function TideSparkline({ data, minValue, maxValue, isToday }: TideSparklineProps) {
  const width = 80
  const height = 28
  const padding = 2

  const range = maxValue - minValue || 1
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Create points for the sparkline
  const points = data.map((value, index) => {
    const x = padding + (chartWidth * index) / (data.length - 1)
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight
    return { x, y }
  })

  // Create smooth path
  const pathD = createSparklinePath(points)

  // Create fill path
  const fillPath = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  // Colors based on isToday
  const lineColor = isToday ? '#0891b2' : '#94a3b8'
  const fillColor = isToday ? '#0891b2' : '#94a3b8'
  const fillOpacity = isToday ? 0.2 : 0.1

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="overflow-visible"
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`sparkGradient-${isToday ? 'today' : 'default'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path
        d={fillPath}
        fill={`url(#sparkGradient-${isToday ? 'today' : 'default'})`}
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Create smooth bezier path for sparkline
function createSparklinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const prevPrev = points[i - 2]

    const tension = 0.25

    let cp1x: number, cp1y: number
    if (prevPrev) {
      cp1x = prev.x + (curr.x - prevPrev.x) * tension
      cp1y = prev.y + (curr.y - prevPrev.y) * tension
    } else {
      cp1x = prev.x + (curr.x - prev.x) * tension
      cp1y = prev.y
    }

    let cp2x: number, cp2y: number
    if (next) {
      cp2x = curr.x - (next.x - prev.x) * tension
      cp2y = curr.y - (next.y - prev.y) * tension
    } else {
      cp2x = curr.x - (curr.x - prev.x) * tension
      cp2y = curr.y
    }

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
  }

  return path
}
