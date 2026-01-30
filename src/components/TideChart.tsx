import { useMemo } from 'react'
import type { TideData } from '../types'
import { formatTideTime, formatTideHeight } from '../lib/api/tides'

interface TideChartProps {
  tideData: TideData
  height?: number
  showLabels?: boolean
}

export function TideChart({ tideData, height = 80, showLabels = true }: TideChartProps) {
  const { hourly, highLow } = tideData

  // Calculate chart dimensions and data
  const chartData = useMemo(() => {
    if (hourly.length === 0) return null

    const heights = hourly.map((t) => t.height)
    const minHeight = Math.min(...heights)
    const maxHeight = Math.max(...heights)
    const range = maxHeight - minHeight || 1

    // Padding for the chart
    const paddingTop = 10
    const paddingBottom = showLabels ? 24 : 10
    const paddingX = 8
    const chartHeight = height - paddingTop - paddingBottom
    const chartWidth = 100 // percentage

    // Convert tide data to SVG points
    const points = hourly.map((tide, index) => {
      const x = paddingX + ((chartWidth - paddingX * 2) * index) / (hourly.length - 1)
      const y = paddingTop + chartHeight - ((tide.height - minHeight) / range) * chartHeight
      return { x, y, height: tide.height, time: tide.time }
    })

    // Create smooth curve path
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`

      // Use quadratic bezier for smoother curve
      const prev = points[i - 1]
      const cpX = (prev.x + point.x) / 2
      return `${acc} Q ${cpX} ${prev.y}, ${point.x} ${point.y}`
    }, '')

    // Create fill path (area under curve)
    const fillPath = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`

    // Current time indicator
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const hoursElapsed = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60)
    const nowX = paddingX + ((chartWidth - paddingX * 2) * hoursElapsed) / 24

    // Find current tide height by interpolation
    const hourIndex = Math.floor(hoursElapsed)
    const hourFraction = hoursElapsed - hourIndex
    let currentHeight = minHeight
    if (hourIndex < hourly.length - 1) {
      const h1 = hourly[hourIndex]?.height ?? minHeight
      const h2 = hourly[hourIndex + 1]?.height ?? minHeight
      currentHeight = h1 + (h2 - h1) * hourFraction
    }
    const nowY = paddingTop + chartHeight - ((currentHeight - minHeight) / range) * chartHeight

    // High/low markers
    const markers = highLow.map((tide) => {
      const tideTime = new Date(tide.time)
      const tideHours = tideTime.getHours() + tideTime.getMinutes() / 60
      const x = paddingX + ((chartWidth - paddingX * 2) * tideHours) / 24
      const y = paddingTop + chartHeight - ((tide.height - minHeight) / range) * chartHeight
      return { x, y, type: tide.type, height: tide.height, time: tide.time }
    })

    return {
      points,
      pathD,
      fillPath,
      minHeight,
      maxHeight,
      nowX,
      nowY,
      currentHeight,
      markers,
      chartHeight,
      paddingTop,
      paddingBottom,
    }
  }, [hourly, highLow, height, showLabels])

  if (!chartData) {
    return (
      <div className="h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
        No tide data
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Grid lines */}
        <line
          x1="8"
          y1={chartData.paddingTop}
          x2="92"
          y2={chartData.paddingTop}
          stroke="#e5e7eb"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
        <line
          x1="8"
          y1={chartData.paddingTop + chartData.chartHeight / 2}
          x2="92"
          y2={chartData.paddingTop + chartData.chartHeight / 2}
          stroke="#e5e7eb"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
        <line
          x1="8"
          y1={height - chartData.paddingBottom}
          x2="92"
          y2={height - chartData.paddingBottom}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />

        {/* Fill area */}
        <path
          d={chartData.fillPath}
          fill="url(#tideGradient)"
          opacity="0.3"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Tide curve */}
        <path
          d={chartData.pathD}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* High/Low markers */}
        {chartData.markers.map((marker, i) => (
          <g key={i}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r="2"
              fill={marker.type === 'H' ? '#3b82f6' : '#f97316'}
              stroke="white"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}

        {/* Current time indicator */}
        <line
          x1={chartData.nowX}
          y1={chartData.paddingTop}
          x2={chartData.nowX}
          y2={height - chartData.paddingBottom}
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="2,2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={chartData.nowX}
          cy={chartData.nowY}
          r="3"
          fill="#ef4444"
          stroke="white"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        {/* Time labels */}
        {showLabels && (
          <>
            <text x="8" y={height - 6} fontSize="7" fill="#9ca3af" textAnchor="start">
              12am
            </text>
            <text x="50" y={height - 6} fontSize="7" fill="#9ca3af" textAnchor="middle">
              12pm
            </text>
            <text x="92" y={height - 6} fontSize="7" fill="#9ca3af" textAnchor="end">
              12am
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      {showLabels && (
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Now ({chartData.currentHeight.toFixed(1)}ft)
          </span>
        </div>
      )}
    </div>
  )
}

interface TideScheduleProps {
  tideData: TideData
  compact?: boolean
}

export function TideSchedule({ tideData, compact = false }: TideScheduleProps) {
  const { highLow } = tideData

  // Filter to today's tides only (first 4 typically)
  const todayTides = highLow.slice(0, 4)

  if (compact) {
    return (
      <div className="flex gap-2 text-xs">
        {todayTides.map((tide, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded ${
              tide.type === 'H'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-orange-50 text-orange-700'
            }`}
          >
            {tide.type === 'H' ? 'H' : 'L'} {formatTideTime(tide.time)}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {todayTides.map((tide, i) => (
        <div
          key={i}
          className={`p-2 rounded-lg text-center ${
            tide.type === 'H'
              ? 'bg-blue-50 border border-blue-100'
              : 'bg-orange-50 border border-orange-100'
          }`}
        >
          <div className="text-xs text-gray-500">
            {tide.type === 'H' ? 'High' : 'Low'}
          </div>
          <div className="font-semibold text-sm">
            {formatTideTime(tide.time)}
          </div>
          <div className="text-xs text-gray-600">
            {formatTideHeight(tide.height)}
          </div>
        </div>
      ))}
    </div>
  )
}
