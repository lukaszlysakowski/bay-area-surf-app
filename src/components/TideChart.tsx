import { useMemo } from 'react'
import type { TideData } from '../types'
import { formatTideTime, formatTideHeight } from '../lib/api/tides'

interface TideChartProps {
  tideData: TideData
  height?: number
  showLabels?: boolean
}

// Tufte tokens — aligned with Heritage palette
const T = {
  ink: '#1A1C1E',
  muted: '#6C7278',
  rule: '#C8C3BC',
  fill: 'rgba(237, 233, 228, 0.6)',
  accent: '#B8422E',
  labelFont: '"JetBrains Mono", ui-monospace, monospace',
}

export function TideChart({ tideData, height = 140, showLabels = true }: TideChartProps) {
  const { hourly, highLow } = tideData

  const chartData = useMemo(() => {
    if (hourly.length === 0) return null

    const heights = hourly.map((t) => t.height)
    const dataMin = Math.min(...heights)
    const dataMax = Math.max(...heights)
    // Range frame: domain spans actual data with a small natural margin
    const margin = (dataMax - dataMin) * 0.06
    const domainMin = dataMin - margin
    const domainMax = dataMax + margin
    const range = domainMax - domainMin || 1

    // Dimensions: generous top padding for above-dot labels on high tides
    const width = 400
    const paddingTop = showLabels ? 30 : 8
    const paddingBottom = showLabels ? 22 : 8
    const paddingLeft = 10
    const paddingRight = 10
    const chartHeight = height - paddingTop - paddingBottom
    const chartWidth = width - paddingLeft - paddingRight

    const toX = (hours: number) => paddingLeft + (chartWidth * hours) / 24
    const toY = (h: number) =>
      paddingTop + chartHeight - ((h - domainMin) / range) * chartHeight

    // Position each point by its actual clock time (via toX), not its array
    // index — so the curve shares one x-scale with the markers, the "now"
    // indicator, and the axis labels, and stays correct for any point count.
    const hoursOf = (time: string) => {
      const t = new Date(time)
      return t.getHours() + t.getMinutes() / 60
    }
    const points = hourly.map((tide) => ({
      x: toX(hoursOf(tide.time)),
      y: toY(tide.height),
      height: tide.height,
      time: tide.time,
    }))

    const pathD = createSmoothPath(points)
    const baselineY = height - paddingBottom
    const fillPath = `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`

    // Current time
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const hoursElapsed = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60)
    const nowX = toX(hoursElapsed)
    // Interpolate the current height by bracketing "now" between the two
    // surrounding hourly points by clock time — robust to gaps or a series
    // that doesn't start at midnight.
    let currentHeight = hourly[0].height
    for (let i = 0; i < hourly.length - 1; i++) {
      const h1 = hoursOf(hourly[i].time)
      const h2 = hoursOf(hourly[i + 1].time)
      if (hoursElapsed >= h1 && hoursElapsed <= h2 && h2 > h1) {
        currentHeight =
          hourly[i].height +
          (hourly[i + 1].height - hourly[i].height) * ((hoursElapsed - h1) / (h2 - h1))
        break
      }
    }
    const nowY = toY(currentHeight)

    // High/low markers
    const markers = highLow.map((tide) => {
      const tideTime = new Date(tide.time)
      const tideHours = tideTime.getHours() + tideTime.getMinutes() / 60
      const hours = tideTime.getHours()
      const minutes = tideTime.getMinutes()
      const ampm = hours >= 12 ? 'pm' : 'am'
      const hour12 = hours % 12 || 12
      const timeStr =
        minutes === 0
          ? `${hour12}${ampm}`
          : `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`

      return {
        x: toX(tideHours),
        y: toY(tide.height),
        type: tide.type,
        height: tide.height,
        timeStr,
        isHigh: tide.type === 'H',
      }
    })

    return {
      points, pathD, fillPath,
      baselineY,
      nowX, nowY, currentHeight,
      markers,
      chartHeight, chartWidth,
      paddingTop, paddingBottom, paddingLeft, paddingRight,
      width,
    }
  }, [hourly, highLow, height, showLabels])

  if (!chartData) {
    return (
      <div className="h-20 flex items-center justify-center text-[#6C7278] text-sm font-label">
        No tide data
      </div>
    )
  }

  // Sparse time labels — range frame endpoints + midpoints only
  const timeLabels = [
    { hour: 0, label: '12a' },
    { hour: 6, label: '6am' },
    { hour: 12, label: 'Noon' },
    { hour: 18, label: '6pm' },
    { hour: 24, label: '12a' },
  ]

  return (
    <div className="relative">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartData.width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* Area fill — flat limestone, no gradient (Tufte: no decorative fill) */}
        <path d={chartData.fillPath} fill={T.fill} />

        {/* Tide curve — thin, solid ink (Tufte: data-ink, single stroke) */}
        <path
          d={chartData.pathD}
          fill="none"
          stroke={T.ink}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Range frame: x-axis baseline only — no box, no gridlines */}
        <line
          x1={chartData.paddingLeft}
          y1={chartData.baselineY}
          x2={chartData.width - chartData.paddingRight}
          y2={chartData.baselineY}
          stroke={T.rule}
          strokeWidth="0.75"
        />

        {/* X-axis time labels — sparse, no tick marks (Tufte: erase non-data-ink) */}
        {showLabels &&
          timeLabels.map(({ hour, label }) => {
            const x =
              chartData.paddingLeft + (chartData.chartWidth * hour) / 24
            return (
              <text
                key={hour}
                x={x}
                y={height - 5}
                textAnchor="middle"
                fontSize="9"
                fill={T.muted}
                fontFamily={T.labelFont}
                letterSpacing="0.03em"
              >
                {label}
              </text>
            )
          })}

        {/* High/Low markers — always visible; labels only when showLabels */}
        {chartData.markers.map((marker, i) => {
          const isHigh = marker.isHigh
          const dotR = 4

          // Label: "7:19am · 3.8ft" above high tides, below low tides
          const labelY = isHigh
            ? marker.y - dotR - 5    // above the dot
            : marker.y + dotR + 11   // below the dot

          return (
            <g key={i}>
              {/* Dot — filled with H or L letter inside */}
              <circle
                cx={marker.x}
                cy={marker.y}
                r={dotR}
                fill={isHigh ? T.ink : T.muted}
              />
              <text
                x={marker.x}
                y={marker.y + 3.5}
                textAnchor="middle"
                fontSize="6"
                fontWeight="700"
                fill="white"
                fontFamily={T.labelFont}
              >
                {isHigh ? 'H' : 'L'}
              </text>

              {/* Direct label: time · height — only when showLabels */}
              {showLabels && (
                <text
                  x={marker.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={isHigh ? T.ink : T.muted}
                  fontFamily={T.labelFont}
                  fontWeight="500"
                >
                  {marker.timeStr}
                  {' · '}
                  {marker.height.toFixed(1)}ft
                </text>
              )}
            </g>
          )
        })}

        {/* NOW — single accent color (Tufte: one accent for focal data only) */}
        {/* Thin vertical rule */}
        <line
          x1={chartData.nowX}
          y1={chartData.paddingTop}
          x2={chartData.nowX}
          y2={chartData.baselineY}
          stroke={T.accent}
          strokeWidth="0.75"
          strokeDasharray="2,3"
          strokeOpacity="0.7"
        />
        {/* Current tide dot */}
        <circle
          cx={chartData.nowX}
          cy={chartData.nowY}
          r="3.5"
          fill={T.accent}
        />
        {/* "now · Xft" — direct label, no badge/pill (Tufte: word-data integration) */}
        {showLabels && (
          <text
            x={chartData.nowX}
            y={chartData.paddingTop - 4}
            textAnchor="middle"
            fontSize="9"
            fill={T.accent}
            fontFamily={T.labelFont}
            fontWeight="500"
            letterSpacing="0.04em"
          >
            {`now · ${chartData.currentHeight.toFixed(1)}ft`}
          </text>
        )}
      </svg>
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
  const tension = 0.3

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const prevPrev = points[i - 2]

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

interface TideScheduleProps {
  tideData: TideData
  compact?: boolean
}

export function TideSchedule({ tideData, compact = false }: TideScheduleProps) {
  const { highLow } = tideData
  const todayTides = highLow.slice(0, 4)

  if (compact) {
    return (
      <div className="flex gap-2 text-xs font-label">
        {todayTides.map((tide, i) => (
          <span
            key={i}
            className={`px-2 py-0.5 rounded-[2px] ${
              tide.type === 'H'
                ? 'bg-[#EDE9E4] text-[#1A1C1E]'
                : 'bg-[#F7F5F2] text-[#6C7278]'
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
          className={`p-2 rounded-[4px] text-center border ${
            tide.type === 'H'
              ? 'bg-[#F7F5F2] border-[#1A1C1E]/10'
              : 'bg-white border-[#1A1C1E]/8'
          }`}
        >
          <div className="text-xs text-[#6C7278] font-label">
            {tide.type === 'H' ? 'High' : 'Low'}
          </div>
          <div className="font-semibold text-sm text-[#1A1C1E]">
            {formatTideTime(tide.time)}
          </div>
          <div className="text-xs text-[#6C7278] font-label">
            {formatTideHeight(tide.height)}
          </div>
        </div>
      ))}
    </div>
  )
}
