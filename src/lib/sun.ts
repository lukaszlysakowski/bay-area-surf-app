/**
 * Calculate sunrise and sunset times for a given location and date
 * Uses the standard astronomical algorithm
 */

interface SunTimes {
  sunrise: Date
  sunset: Date
  firstLight: Date // Civil twilight start (good light for surfing)
  lastLight: Date  // Civil twilight end
}

/**
 * Calculate sun times for a location
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees
 * @param date Date to calculate for
 */
export function getSunTimes(lat: number, lng: number, date: Date): SunTimes {
  const dayOfYear = getDayOfYear(date)

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (12 - 12) / 24)

  // Equation of time (minutes)
  const eqtime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  )

  // Solar declination (radians)
  const decl = (
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  )

  const latRad = lat * Math.PI / 180

  // Hour angle for sunrise/sunset (sun at horizon)
  const ha = calculateHourAngle(latRad, decl, -0.833)

  // Hour angle for civil twilight (sun 6° below horizon)
  const haCivil = calculateHourAngle(latRad, decl, -6)

  // Calculate times
  const sunrise = calculateSunTime(date, lng, eqtime, ha, true)
  const sunset = calculateSunTime(date, lng, eqtime, ha, false)
  const firstLight = calculateSunTime(date, lng, eqtime, haCivil, true)
  const lastLight = calculateSunTime(date, lng, eqtime, haCivil, false)

  return { sunrise, sunset, firstLight, lastLight }
}

function calculateHourAngle(latRad: number, decl: number, angle: number): number {
  const angleRad = angle * Math.PI / 180
  const cosHa = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decl)) /
                (Math.cos(latRad) * Math.cos(decl))

  // Clamp to valid range
  const clampedCosHa = Math.max(-1, Math.min(1, cosHa))
  return Math.acos(clampedCosHa) * 180 / Math.PI
}

function calculateSunTime(
  date: Date,
  lng: number,
  eqtime: number,
  ha: number,
  isRise: boolean
): Date {
  // Time offset from UTC in minutes
  const tzOffset = -date.getTimezoneOffset()

  // Solar noon in minutes from midnight
  const snoon = 720 - 4 * lng - eqtime + tzOffset

  // Sunrise/sunset time in minutes from midnight
  const time = isRise ? snoon - ha * 4 : snoon + ha * 4

  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setMinutes(Math.round(time))

  return result
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

/**
 * Format time as "6:45 AM"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Calculate what time to leave to arrive by a target time
 * @param targetTime When you want to arrive
 * @param driveMinutes How long the drive takes
 * @param bufferMinutes Extra buffer time (default 10 min for parking, etc)
 */
export function calculateLeaveBy(
  targetTime: Date,
  driveMinutes: number,
  bufferMinutes: number = 10
): Date {
  const leaveBy = new Date(targetTime)
  leaveBy.setMinutes(leaveBy.getMinutes() - driveMinutes - bufferMinutes)
  return leaveBy
}

/**
 * Get a description of how soon a time is
 */
export function getTimeUntil(targetTime: Date): string {
  const now = new Date()
  const diffMs = targetTime.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 1000 / 60)

  if (diffMins < 0) {
    return 'passed'
  }
  if (diffMins < 60) {
    return `in ${diffMins} min`
  }
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  if (mins === 0) {
    return `in ${hours}h`
  }
  return `in ${hours}h ${mins}m`
}

/**
 * Check if current time is during good surf light (first light to last light)
 */
export function isDaylightHours(sunTimes: SunTimes): boolean {
  const now = new Date()
  return now >= sunTimes.firstLight && now <= sunTimes.lastLight
}

/**
 * Get dawn patrol status
 */
export function getDawnPatrolStatus(
  sunTimes: SunTimes,
  driveMinutes?: number
): {
  status: 'too-early' | 'leave-now' | 'on-the-way' | 'surfing' | 'missed'
  message: string
  leaveBy?: Date
} {
  const now = new Date()
  const targetArrival = sunTimes.firstLight

  if (!driveMinutes) {
    if (now < sunTimes.firstLight) {
      return { status: 'too-early', message: `First light at ${formatTime(sunTimes.firstLight)}` }
    }
    if (now < sunTimes.sunrise) {
      return { status: 'surfing', message: `Sunrise at ${formatTime(sunTimes.sunrise)}` }
    }
    return { status: 'surfing', message: `Sun is up until ${formatTime(sunTimes.sunset)}` }
  }

  const leaveBy = calculateLeaveBy(targetArrival, driveMinutes)
  const arriveBy = new Date(leaveBy)
  arriveBy.setMinutes(arriveBy.getMinutes() + driveMinutes + 10)

  // More than 30 min before needing to leave
  if (now < new Date(leaveBy.getTime() - 30 * 60 * 1000)) {
    return {
      status: 'too-early',
      message: `Leave by ${formatTime(leaveBy)} for first light`,
      leaveBy
    }
  }

  // Within 30 min of needing to leave
  if (now < leaveBy) {
    const minsUntilLeave = Math.round((leaveBy.getTime() - now.getTime()) / 1000 / 60)
    return {
      status: 'leave-now',
      message: `Leave in ${minsUntilLeave} min for dawn patrol!`,
      leaveBy
    }
  }

  // After leave time but before arrival
  if (now < arriveBy) {
    return {
      status: 'on-the-way',
      message: `Go now to catch first light!`,
      leaveBy
    }
  }

  // After first light
  if (now < sunTimes.sunset) {
    return { status: 'surfing', message: `Sun up until ${formatTime(sunTimes.sunset)}` }
  }

  return { status: 'missed', message: 'Sun has set' }
}
