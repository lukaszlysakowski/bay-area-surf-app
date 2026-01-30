/**
 * Normalizes an angle to be within -180 to 180 degrees
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle
  while (normalized < -180) normalized += 360
  while (normalized > 180) normalized -= 360
  return normalized
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats a date and time for display
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * Gets the day of week name
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Gets a date string in YYYYMMDD format
 */
export function toYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Clamps a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Rounds a number to a specified number of decimal places
 */
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Returns a CSS class name based on surf rating
 */
export function getRatingColorClass(rating: string): string {
  switch (rating) {
    case 'Excellent':
      return 'bg-emerald-500 text-white'
    case 'Good':
      return 'bg-blue-500 text-white'
    case 'Fair':
      return 'bg-amber-500 text-white'
    case 'Poor':
      return 'bg-red-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

/**
 * Returns a hex color based on surf rating
 */
export function getRatingColor(rating: string): string {
  switch (rating) {
    case 'Excellent':
      return '#10b981'
    case 'Good':
      return '#3b82f6'
    case 'Fair':
      return '#f59e0b'
    case 'Poor':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}
