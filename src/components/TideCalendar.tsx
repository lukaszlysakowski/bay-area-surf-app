import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTideRange } from '../lib/api/tides'
import { getMonthMoonPhases, isSignificantPhase } from '../lib/moon'
import type { TideData } from '../types'

interface TideCalendarProps {
  stationId: string
  stationName?: string
  onClose?: () => void
}

export function TideCalendar({ stationId, stationName, onClose }: TideCalendarProps) {
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

  // Group tide data by day
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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-4">
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
      <div className="p-4">
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
              const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year
              const moonInfo = moonPhases.get(day)
              const tides = tidesByDay.get(day)
              const isWeekend = (firstDayOfWeek + i) % 7 === 0 || (firstDayOfWeek + i) % 7 === 6

              return (
                <div
                  key={day}
                  className={`h-24 rounded-lg p-1.5 border transition-colors ${
                    isToday
                      ? 'bg-cyan-50 border-cyan-300'
                      : isWeekend
                      ? 'bg-blue-50/50 border-gray-100'
                      : 'bg-white border-gray-100 hover:border-gray-200'
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

                  {/* Tide info */}
                  {tides && (
                    <div className="mt-1 space-y-0.5">
                      {tides.highs.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-blue-600">▲</span>
                          <span className="text-[10px] text-gray-600">
                            {Math.max(...tides.highs).toFixed(1)}ft
                          </span>
                        </div>
                      )}
                      {tides.lows.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-orange-500">▼</span>
                          <span className="text-[10px] text-gray-600">
                            {Math.min(...tides.lows).toFixed(1)}ft
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
