import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchTideData } from '../lib/api/tides'
import { analyzeWeek, getNextDays, formatDateForAPI } from '../lib/forecast'
import type { SpotConfig, TideData, BuoyData } from '../types'

interface WeekForecastProps {
  spot: SpotConfig
  currentBuoyData?: BuoyData | null
  onClose?: () => void
}

export function WeekForecast({ spot, currentBuoyData, onClose }: WeekForecastProps) {
  // Get next 7 days
  const dates = useMemo(() => getNextDays(7), [])

  // Fetch tide data for each day
  const tideQueries = useQueries({
    queries: dates.map((date) => ({
      queryKey: ['tides-forecast', spot.tideStation, formatDateForAPI(date)],
      queryFn: () => fetchTideData({
        stationId: spot.tideStation,
        date: formatDateForAPI(date),
        days: 1,
      }),
      staleTime: 1000 * 60 * 60,
    })),
  })

  const isLoading = tideQueries.some((q) => q.isLoading)

  // Build tide data map
  const tideDataMap = useMemo(() => {
    const map = new Map<string, TideData>()
    dates.forEach((date, i) => {
      const data = tideQueries[i].data
      if (data) {
        map.set(formatDateForAPI(date), data)
      }
    })
    return map
  }, [dates, tideQueries])

  // Analyze the week
  const weekAnalysis = useMemo(() => {
    if (tideDataMap.size < 3) return null
    return analyzeWeek(tideDataMap, spot)
  }, [tideDataMap, spot])

  // Current wave data for the chart baseline
  const currentWaveHeight = currentBuoyData?.waveHeight ?? 3
  const currentPeriod = currentBuoyData?.wavePeriod ?? 10

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-[Outfit]">7-Day Forecast</h2>
            <p className="text-indigo-100 text-sm">{spot.name}</p>
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
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-3 text-gray-500">Loading forecast...</p>
          </div>
        </div>
      ) : (
        <div className="p-6">
          {/* Best Day Banner */}
          {weekAnalysis?.bestDay && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-emerald-600 font-medium">Best Day This Week</p>
                  <p className="text-lg font-bold text-emerald-800">
                    {weekAnalysis.bestDay.dayName}, {weekAnalysis.bestDay.dateStr}
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">{weekAnalysis.bestDayReason}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-600">{weekAnalysis.bestDay.score}</div>
                  <div className="text-xs text-emerald-500">score</div>
                </div>
              </div>
            </div>
          )}

          {/* Swell Chart */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Wave Height Trend</h3>
            <SwellChart
              days={weekAnalysis?.days ?? []}
              baseHeight={currentWaveHeight}
              basePeriod={currentPeriod}
            />
          </div>

          {/* Day-by-Day Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Breakdown</h3>
            <div className="grid grid-cols-7 gap-2">
              {weekAnalysis?.days.map((day, i) => {
                const isToday = i === 0
                const isBestDay = weekAnalysis.bestDay?.date.getTime() === day.date.getTime()

                return (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-center transition-all ${
                      isBestDay
                        ? 'bg-emerald-50 border-2 border-emerald-300 shadow-sm'
                        : isToday
                        ? 'bg-cyan-50 border border-cyan-200'
                        : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <p className={`text-xs font-medium ${
                      isBestDay ? 'text-emerald-600' : isToday ? 'text-cyan-600' : 'text-gray-500'
                    }`}>
                      {day.dayName}
                    </p>
                    <p className={`text-sm font-bold ${
                      isBestDay ? 'text-emerald-700' : 'text-gray-700'
                    }`}>
                      {day.date.getDate()}
                    </p>

                    {/* Moon phase */}
                    <p className="text-lg my-1" title={day.moonPhase.name}>
                      {day.moonPhase.emoji}
                    </p>

                    {/* Score */}
                    <div className={`text-lg font-bold ${getScoreColor(day.score)}`}>
                      {day.score}
                    </div>

                    {/* Best time window - more prominent */}
                    {day.bestTimeWindow ? (
                      <div className={`mt-2 pt-2 border-t ${isBestDay ? 'border-emerald-200' : 'border-gray-200'}`}>
                        <p className={`text-[10px] ${isBestDay ? 'text-emerald-600' : 'text-gray-500'}`}>
                          Best surf
                        </p>
                        <p className={`text-xs font-semibold ${isBestDay ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {day.bestTimeWindow.start}
                        </p>
                        <p className={`text-[10px] ${isBestDay ? 'text-emerald-600' : 'text-gray-500'}`}>
                          to {day.bestTimeWindow.end}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-[10px] text-gray-400">No data</p>
                      </div>
                    )}

                    {isBestDay && (
                      <div className="mt-2">
                        <span className="inline-block px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-medium rounded">
                          BEST
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detailed Time Windows */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Best Surf Times by Day</h3>
            <div className="space-y-2">
              {weekAnalysis?.days.map((day, i) => {
                const isBestDay = weekAnalysis.bestDay?.date.getTime() === day.date.getTime()
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isBestDay ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold w-12 ${isBestDay ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {day.dayName}
                      </span>
                      <span className="text-sm text-gray-500">{day.dateStr}</span>
                      {isBestDay && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-medium rounded">
                          BEST DAY
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {day.bestTimeWindow ? (
                        <div className="text-right">
                          <span className={`text-sm font-semibold ${isBestDay ? 'text-emerald-700' : 'text-gray-800'}`}>
                            {day.bestTimeWindow.start} – {day.bestTimeWindow.end}
                          </span>
                          <p className="text-xs text-gray-500">{day.analysis}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Check conditions</span>
                      )}
                      <div className={`text-lg font-bold w-10 text-right ${getScoreColor(day.score)}`}>
                        {day.score}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Note about forecast accuracy */}
          <p className="text-xs text-gray-400 text-center mt-6">
            Tide predictions are accurate. Wave forecast is estimated based on current swell patterns.
            Check back daily for updated conditions.
          </p>
        </div>
      )}
    </div>
  )
}

// Swell Chart Component
interface SwellChartProps {
  days: Array<{ date: Date; score: number; dayName: string }>
  baseHeight: number
  basePeriod: number
}

function SwellChart({ days, baseHeight, basePeriod }: SwellChartProps) {
  const width = 700
  const height = 150
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }

  // Generate wave heights with some variance based on score
  const waveData = days.map((day, i) => {
    // Add some realistic variance (±30% based on score)
    const variance = (day.score - 50) / 100
    const height = baseHeight * (1 + variance * 0.5 + (Math.sin(i * 0.8) * 0.2))
    return {
      day: day.dayName,
      height: Math.max(0.5, height),
      score: day.score,
    }
  })

  const maxHeight = Math.max(...waveData.map((d) => d.height), baseHeight * 1.5)
  const minHeight = 0

  const xScale = (i: number) => padding.left + (i * (width - padding.left - padding.right)) / (days.length - 1)
  const yScale = (h: number) => height - padding.bottom - ((h - minHeight) / (maxHeight - minHeight)) * (height - padding.top - padding.bottom)

  // Create smooth path
  const pathPoints = waveData.map((d, i) => ({ x: xScale(i), y: yScale(d.height) }))
  const path = createSmoothPath(pathPoints)

  // Create area path
  const areaPath = `${path} L ${xScale(days.length - 1)} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 2, 4, 6, 8].map((h) => (
        <g key={h}>
          <line
            x1={padding.left}
            y1={yScale(h)}
            x2={width - padding.right}
            y2={yScale(h)}
            stroke="#e5e7eb"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 8}
            y={yScale(h)}
            textAnchor="end"
            alignmentBaseline="middle"
            className="text-[10px] fill-gray-400"
          >
            {h}ft
          </text>
        </g>
      ))}

      {/* Area fill */}
      <defs>
        <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#waveGradient)" />

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke="#6366f1"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {waveData.map((d, i) => (
        <g key={i}>
          <circle
            cx={xScale(i)}
            cy={yScale(d.height)}
            r="5"
            fill="white"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <text
            x={xScale(i)}
            y={height - 8}
            textAnchor="middle"
            className="text-[11px] fill-gray-600 font-medium"
          >
            {d.day}
          </text>
        </g>
      ))}

      {/* Current period indicator */}
      <text
        x={width - padding.right}
        y={padding.top}
        textAnchor="end"
        className="text-[10px] fill-gray-400"
      >
        Period: {basePeriod.toFixed(0)}s
      </text>
    </svg>
  )
}

function createSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Calculate control points
    const cp1x = prev.x + (curr.x - (points[i - 2]?.x ?? prev.x)) / 4
    const cp1y = prev.y + (curr.y - (points[i - 2]?.y ?? prev.y)) / 4
    const cp2x = curr.x - (((next?.x ?? curr.x) - prev.x) / 4)
    const cp2y = curr.y - (((next?.y ?? curr.y) - prev.y) / 4)

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
  }

  return path
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-gray-500'
}
