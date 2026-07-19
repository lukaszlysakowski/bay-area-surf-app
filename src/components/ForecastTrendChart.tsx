import { useMemo } from 'react'
import type { MarineForecastHour } from '../lib/api/openmeteo'

interface ForecastTrendChartProps {
  hourly: MarineForecastHour[]
  isToday?: boolean
}

// Tufte tokens — aligned with the Heritage palette (mirrors TideChart).
const T = {
  ink: '#1A1C1E',
  muted: '#6C7278',
  rule: '#C8C3BC',
  fill: 'rgba(237, 233, 228, 0.7)',
  accent: '#B8422E',
  calm: '#2d9c6e',
  labelFont: '"JetBrains Mono", ui-monospace, monospace',
}

const hoursOf = (d: Date) => d.getHours() + d.getMinutes() / 60

/**
 * Two stacked small multiples sharing one time axis: swell height (ft) and
 * wind speed (mph) across the day. Answers "when is it worth paddling out?"
 * without the dual-axis confusion Tufte warns against.
 */
export function ForecastTrendChart({ hourly, isToday = false }: ForecastTrendChartProps) {
  const chart = useMemo(() => {
    if (hourly.length < 2) return null

    const width = 400
    const padL = 8
    const padR = 8
    const panelH = 46
    const gap = 20 // room for the panel's value label
    const axisH = 14
    const top = 6
    const chartW = width - padL - padR

    const swellTop = top
    const windTop = top + panelH + gap
    const height = windTop + panelH + axisH

    const toX = (h: number) => padL + (chartW * h) / 24

    // Build a panel: area under a line, scaled to its own min/max.
    const buildPanel = (
      values: number[],
      panelTop: number,
      { fill }: { fill: boolean }
    ) => {
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 1
      const toY = (v: number) => panelTop + panelH - ((v - min) / range) * panelH
      const pts = hourly.map((h, i) => ({ x: toX(hoursOf(h.time)), y: toY(values[i]) }))
      const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      const area = `${line} L ${pts[pts.length - 1].x} ${panelTop + panelH} L ${pts[0].x} ${panelTop + panelH} Z`
      return { toY, line, area: fill ? area : '', min, max }
    }

    const swell = buildPanel(hourly.map((h) => h.swellHeightFt), swellTop, { fill: true })
    const wind = buildPanel(hourly.map((h) => h.windSpeedMph), windTop, { fill: false })

    // "Now" marker for today.
    const now = new Date()
    const nowH = now.getHours() + now.getMinutes() / 60
    const showNow = isToday && nowH >= hoursOf(hourly[0].time) && nowH <= hoursOf(hourly[hourly.length - 1].time)

    return { width, height, padL, padR, chartW, toX, swell, wind, swellTop, windTop, panelH, showNow, nowX: toX(nowH) }
  }, [hourly, isToday])

  if (!chart) {
    return (
      <div className="h-24 flex items-center justify-center text-[#6C7278] text-sm font-label">
        No forecast data
      </div>
    )
  }

  const timeTicks = [
    { h: 6, label: '6a' },
    { h: 12, label: 'Noon' },
    { h: 18, label: '6p' },
  ]

  const peakSwell = chart.swell.max
  const minWind = chart.wind.min

  return (
    <svg
      width="100%"
      height={chart.height}
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="overflow-visible"
    >
      {/* Swell panel */}
      <text x={chart.padL} y={chart.swellTop - 2} fontSize="8.5" fill={T.muted} fontFamily={T.labelFont} letterSpacing="0.04em">
        SWELL · peak {peakSwell.toFixed(1)}ft
      </text>
      <path d={chart.swell.area} fill={T.fill} />
      <path d={chart.swell.line} fill="none" stroke={T.ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Wind panel */}
      <text x={chart.padL} y={chart.windTop - 2} fontSize="8.5" fill={T.muted} fontFamily={T.labelFont} letterSpacing="0.04em">
        WIND · low {minWind.toFixed(0)}mph
      </text>
      <path
        d={chart.wind.line}
        fill="none"
        stroke={minWind < 10 ? T.calm : T.ink}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Shared x-axis */}
      <line
        x1={chart.padL}
        y1={chart.windTop + chart.panelH}
        x2={chart.width - chart.padR}
        y2={chart.windTop + chart.panelH}
        stroke={T.rule}
        strokeWidth="0.75"
      />
      {timeTicks.map(({ h, label }) => (
        <text
          key={h}
          x={chart.toX(h)}
          y={chart.height - 3}
          textAnchor="middle"
          fontSize="8.5"
          fill={T.muted}
          fontFamily={T.labelFont}
        >
          {label}
        </text>
      ))}

      {/* Now marker spanning both panels */}
      {chart.showNow && (
        <line
          x1={chart.nowX}
          y1={chart.swellTop}
          x2={chart.nowX}
          y2={chart.windTop + chart.panelH}
          stroke={T.accent}
          strokeWidth="0.75"
          strokeDasharray="2,3"
          strokeOpacity="0.7"
        />
      )}
    </svg>
  )
}
