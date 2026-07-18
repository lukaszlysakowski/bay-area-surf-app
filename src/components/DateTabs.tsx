import { useMemo } from 'react'

export type DateOption = 'now' | 'today' | 'tomorrow' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface DateTabsProps {
  selected: DateOption
  onChange: (date: DateOption) => void
}

export function DateTabs({ selected, onChange }: DateTabsProps) {
  const tabs = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday

    const options: Array<{ id: DateOption; label: string; date: Date; available: boolean; isLive?: boolean }> = []

    // Current conditions (live)
    options.push({
      id: 'now',
      label: 'Now',
      date: today,
      available: true,
      isLive: true,
    })

    // Today is always available
    options.push({
      id: 'today',
      label: 'Today',
      date: today,
      available: true,
    })

    // Tomorrow
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    options.push({
      id: 'tomorrow',
      label: 'Tomorrow',
      date: tomorrow,
      available: true,
    })

    // Find next Thursday, Friday, Saturday, Sunday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7
    const daysUntilSunday = (0 - dayOfWeek + 7) % 7 || 7

    // Only show days if they're not today or tomorrow
    if (daysUntilThursday > 1) {
      const thursday = new Date(today)
      thursday.setDate(thursday.getDate() + daysUntilThursday)
      options.push({
        id: 'thursday',
        label: 'Thu',
        date: thursday,
        available: true,
      })
    }

    if (daysUntilFriday > 1) {
      const friday = new Date(today)
      friday.setDate(friday.getDate() + daysUntilFriday)
      options.push({
        id: 'friday',
        label: 'Fri',
        date: friday,
        available: true,
      })
    }

    if (daysUntilSaturday > 1) {
      const saturday = new Date(today)
      saturday.setDate(saturday.getDate() + daysUntilSaturday)
      options.push({
        id: 'saturday',
        label: 'Sat',
        date: saturday,
        available: true,
      })
    }

    if (daysUntilSunday > 1) {
      const sunday = new Date(today)
      sunday.setDate(sunday.getDate() + daysUntilSunday)
      options.push({
        id: 'sunday',
        label: 'Sun',
        date: sunday,
        available: true,
      })
    }

    return options
  }, [])

  return (
    <div className="flex gap-1 bg-[#EDE9E4] rounded-[4px] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 rounded-[2px] text-sm font-medium transition-colors flex items-center gap-1.5 ${
            selected === tab.id
              ? tab.isLive
                ? 'bg-[#B8422E] text-white'
                : 'bg-white text-[#1A1C1E]'
              : 'text-[#6C7278] hover:text-[#1A1C1E]'
          }`}
        >
          {tab.isLive && (
            <span className={`w-1.5 h-1.5 ${selected === tab.id ? 'bg-white' : 'bg-[#B8422E]'} animate-pulse`}></span>
          )}
          <span>{tab.label}</span>
          {!tab.isLive && (
            <span className="text-xs text-[#6C7278] font-label">
              {formatShortDate(tab.date)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * Gets the actual Date object for a DateOption
 */
export function getDateForOption(option: DateOption): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (option) {
    case 'now':
    case 'today':
      return today

    case 'tomorrow': {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }

    case 'thursday': {
      const dayOfWeek = today.getDay()
      const daysUntil = (4 - dayOfWeek + 7) % 7 || 7
      const thursday = new Date(today)
      thursday.setDate(thursday.getDate() + daysUntil)
      return thursday
    }

    case 'friday': {
      const dayOfWeek = today.getDay()
      const daysUntil = (5 - dayOfWeek + 7) % 7 || 7
      const friday = new Date(today)
      friday.setDate(friday.getDate() + daysUntil)
      return friday
    }

    case 'saturday': {
      const dayOfWeek = today.getDay()
      const daysUntil = (6 - dayOfWeek + 7) % 7 || 7
      const saturday = new Date(today)
      saturday.setDate(saturday.getDate() + daysUntil)
      return saturday
    }

    case 'sunday': {
      const dayOfWeek = today.getDay()
      const daysUntil = (0 - dayOfWeek + 7) % 7 || 7
      const sunday = new Date(today)
      sunday.setDate(sunday.getDate() + daysUntil)
      return sunday
    }

    default:
      return today
  }
}

/**
 * Formats a date for display in the UI
 */
export function formatDateDisplay(option: DateOption): string {
  const date = getDateForOption(option)

  if (option === 'now') {
    return 'Current Conditions'
  }

  if (option === 'today') {
    return 'Today, ' + date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  }

  if (option === 'tomorrow') {
    return 'Tomorrow, ' + date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Formats date to YYYYMMDD for NOAA API
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Converts a Date to a DateOption if it matches today, tomorrow, or this weekend
 * Returns null if the date doesn't match any available option
 */
export function getDateOptionForDate(date: Date): DateOption | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Check if it's today
  if (diffDays === 0) return 'today'

  // Check if it's tomorrow
  if (diffDays === 1) return 'tomorrow'

  // Check if it matches upcoming weekend days (within 7 days)
  if (diffDays > 1 && diffDays <= 7) {
    const todayDow = today.getDay()

    // Check Thursday
    const daysUntilThursday = (4 - todayDow + 7) % 7 || 7
    if (daysUntilThursday > 1 && diffDays === daysUntilThursday) return 'thursday'

    // Check Friday
    const daysUntilFriday = (5 - todayDow + 7) % 7 || 7
    if (daysUntilFriday > 1 && diffDays === daysUntilFriday) return 'friday'

    // Check Saturday
    const daysUntilSaturday = (6 - todayDow + 7) % 7 || 7
    if (daysUntilSaturday > 1 && diffDays === daysUntilSaturday) return 'saturday'

    // Check Sunday
    const daysUntilSunday = (0 - todayDow + 7) % 7 || 7
    if (daysUntilSunday > 1 && diffDays === daysUntilSunday) return 'sunday'
  }

  return null
}
