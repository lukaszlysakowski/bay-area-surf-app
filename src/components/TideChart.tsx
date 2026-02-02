import { useMemo } from 'react'
import type { TideData } from '../types'
import { formatTideTime, formatTideHeight } from '../lib/api/tides'

interface TideChartProps {
  tideData: TideData
  height?: number
  showLabels?: boolean
}

export function TideChart({ tideData, height = 140, showLabels = true }: TideChartProps) {
  const { hourly, highLow } = tideData

  const chartData = useMemo(() => {
    if (hourly.length === 0) return null

    const heights = hourly.map((t) => t.height)
    const minHeight = Math.min(...heights) - 0.5
    const maxHeight = Math.max(...heights) + 0.5
    const range = maxHeight - minHeight || 1

    // Chart dimensions
    const width = 400
    const paddingTop = 35
    const paddingBottom = showLabels ? 28 : 15
    const paddingLeft = 10
    const paddingRight = 10
    const chartHeight = height - paddingTop - paddingBottom
    const chartWidth = width - paddingLeft - paddingRight

    // Convert tide data to SVG points
    const points = hourly.map((tide, index) => {
      const x = paddingLeft + (chartWidth * index) / (hourly.length - 1)
      const y = paddingTop + chartHeight - ((tide.height - minHeight) / range) * chartHeight
      return { x, y, height: tide.height, time: tide.time }
    })

    // Create smooth cubic bezier curve
    const pathD = createSmoothPath(points)

    // Create fill path (area under curve)
    const fillPath = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`

    // Current time indicator
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const hoursElapsed = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60)
    const nowX = paddingLeft + (chartWidth * hoursElapsed) / 24

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

    // High/low markers with proper positioning
    const markers = highLow.map((tide) => {
      const tideTime = new Date(tide.time)
      const tideHours = tideTime.getHours() + tideTime.getMinutes() / 60
      const x = paddingLeft + (chartWidth * tideHours) / 24
      const y = paddingTop + chartHeight - ((tide.height - minHeight) / range) * chartHeight

      // Format time nicely
      const hours = tideTime.getHours()
      const minutes = tideTime.getMinutes()
      const ampm = hours >= 12 ? 'pm' : 'am'
      const hour12 = hours % 12 || 12
      const timeStr = minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`

      return {
        x,
        y,
        type: tide.type,
        height: tide.height,
        time: tide.time,
        timeStr,
        isHigh: tide.type === 'H'
      }
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
      chartWidth,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      width,
    }
  }, [hourly, highLow, height, showLabels])

  if (!chartData) {
    return (
      <div className="h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
        No tide data
      </div>
    )
  }

  // Time labels for x-axis
  const timeLabels = [
    { hour: 0, label: '12am' },
    { hour: 6, label: '6am' },
    { hour: 12, label: 'Noon' },
    { hour: 18, label: '6pm' },
    { hour: 24, label: '12am' },
  ]

  return (
    <div className="relative bg-gradient-to-b from-slate-50 to-white rounded-xl p-3 border border-slate-100">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartData.width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="tideGradientFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="tideLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Subtle horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={chartData.paddingLeft}
            y1={chartData.paddingTop + chartData.chartHeight * ratio}
            x2={chartData.width - chartData.paddingRight}
            y2={chartData.paddingTop + chartData.chartHeight * ratio}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Baseline */}
        <line
          x1={chartData.paddingLeft}
          y1={height - chartData.paddingBottom}
          x2={chartData.width - chartData.paddingRight}
          y2={height - chartData.paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* Fill area under curve */}
        <path
          d={chartData.fillPath}
          fill="url(#tideGradientFill)"
        />

        {/* Main tide curve */}
        <path
          d={chartData.pathD}
          fill="none"
          stroke="url(#tideLineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Time labels on x-axis */}
        {showLabels && timeLabels.map(({ hour, label }) => {
          const x = chartData.paddingLeft + (chartData.chartWidth * hour) / 24
          return (
            <g key={hour}>
              <line
                x1={x}
                y1={height - chartData.paddingBottom}
                x2={x}
                y2={height - chartData.paddingBottom + 4}
                stroke="#94a3b8"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* High/Low markers with labels */}
        {chartData.markers.map((marker, i) => {
          const isHigh = marker.isHigh
          const labelY = isHigh ? marker.y - 12 : marker.y + 18
          const heightLabelY = isHigh ? marker.y - 24 : marker.y + 6

          return (
            <g key={i}>
              {/* Marker dot */}
              <circle
                cx={marker.x}
                cy={marker.y}
                r="6"
                fill={isHigh ? '#3b82f6' : '#f97316'}
                stroke="white"
                strokeWidth="2"
              />

              {/* Label background for better readability */}
              <rect
                x={marker.x - 24}
                y={isHigh ? marker.y - 32 : marker.y + 8}
                width="48"
                height="28"
                rx="4"
                fill="white"
                fillOpacity="0.9"
              />

              {/* Time label */}
              <text
                x={marker.x}
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={isHigh ? '#2563eb' : '#ea580c'}
                fontFamily="system-ui, sans-serif"
              >
                {marker.timeStr}
              </text>

              {/* Height label */}
              <text
                x={marker.x}
                y={heightLabelY}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                fontFamily="system-ui, sans-serif"
              >
                {marker.height.toFixed(1)}ft
              </text>
            </g>
          )
        })}

        {/* Current time indicator */}
        <line
          x1={chartData.nowX}
          y1={chartData.paddingTop - 5}
          x2={chartData.nowX}
          y2={height - chartData.paddingBottom}
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="4,3"
        />

        {/* Current time dot */}
        <circle
          cx={chartData.nowX}
          cy={chartData.nowY}
          r="5"
          fill="#ef4444"
          stroke="white"
          strokeWidth="2"
        />

        {/* "Now" label */}
        <g>
          <rect
            x={chartData.nowX - 18}
            y={chartData.paddingTop - 18}
            width="36"
            height="16"
            rx="8"
            fill="#ef4444"
          />
          <text
            x={chartData.nowX}
            y={chartData.paddingTop - 7}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="white"
            fontFamily="system-ui, sans-serif"
          >
            NOW
          </text>
        </g>
      </svg>

      {/* Legend */}
      {showLabels && (
        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span>
            High Tide
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></span>
            Low Tide
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
            Now ({chartData.currentHeight.toFixed(1)}ft)
          </span>
        </div>
      )}
    </div>
  )
}

// Create smooth cubic bezier path through points
function createSmoothPath(points: Array<{ x: number; y: number }>): string {
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

    // Calculate control points for smooth curve
    const tension = 0.3

    // Control point 1
    let cp1x: number, cp1y: number
    if (prevPrev) {
      cp1x = prev.x + (curr.x - prevPrev.x) * tension
      cp1y = prev.y + (curr.y - prevPrev.y) * tension
    } else {
      cp1x = prev.x + (curr.x - prev.x) * tension
      cp1y = prev.y
    }

    // Control point 2
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
