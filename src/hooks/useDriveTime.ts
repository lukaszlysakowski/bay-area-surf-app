import { useQuery } from '@tanstack/react-query'
import { getDriveTimesToSpots, getDriveTime } from '../lib/api/osrm'
import { SURF_SPOTS } from '../lib/spots'
import type { DriveTime } from '../types'

interface UseAllDriveTimesOptions {
  userLocation: { lat: number; lng: number } | null
}

/**
 * Fetches drive times from user location to all surf spots
 */
export function useAllDriveTimes({ userLocation }: UseAllDriveTimesOptions) {
  return useQuery<Map<string, DriveTime>, Error>({
    queryKey: ['driveTimes', userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!userLocation) {
        return new Map()
      }

      return getDriveTimesToSpots(
        userLocation.lat,
        userLocation.lng,
        SURF_SPOTS.map((s) => ({ id: s.id, coordinates: s.coordinates }))
      )
    },
    enabled: !!userLocation,
    staleTime: 1000 * 60 * 30, // 30 minutes - routes don't change often
    retry: 1,
  })
}

/**
 * Fetches drive time to a single spot
 */
export function useDriveTime(
  userLocation: { lat: number; lng: number } | null,
  spotCoordinates: { lat: number; lng: number }
) {
  return useQuery<DriveTime, Error>({
    queryKey: [
      'driveTime',
      userLocation?.lat,
      userLocation?.lng,
      spotCoordinates.lat,
      spotCoordinates.lng,
    ],
    queryFn: () => {
      if (!userLocation) {
        throw new Error('No user location')
      }
      return getDriveTime(
        userLocation.lat,
        userLocation.lng,
        spotCoordinates.lat,
        spotCoordinates.lng
      )
    },
    enabled: !!userLocation,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}

/**
 * Sorts spots by drive time (nearest first)
 */
export function sortSpotsByDriveTime<T extends { id: string }>(
  spots: T[],
  driveTimes: Map<string, DriveTime>
): T[] {
  return [...spots].sort((a, b) => {
    const aTime = driveTimes.get(a.id)?.minutes ?? Infinity
    const bTime = driveTimes.get(b.id)?.minutes ?? Infinity
    return aTime - bTime
  })
}

/**
 * Filters spots within a maximum drive time
 */
export function filterSpotsByMaxDriveTime<T extends { id: string }>(
  spots: T[],
  driveTimes: Map<string, DriveTime>,
  maxMinutes: number
): T[] {
  return spots.filter((spot) => {
    const time = driveTimes.get(spot.id)?.minutes
    return time !== undefined && time <= maxMinutes
  })
}
