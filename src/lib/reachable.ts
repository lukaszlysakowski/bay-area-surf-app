interface HasScore {
  id: string
  score: number
}

interface DriveMinutes {
  minutes: number
}

/**
 * Finds the highest-scored spot reachable within a drive-time budget.
 *
 * Answers "if I want to surf soon, where's the best spot I can actually get
 * to?" — distinct from the overall best spot, which ignores travel time.
 *
 * @param spots       Candidate spots (any order — sorted by score internally).
 * @param driveTimes  Map of spot id -> drive time; spots absent from the map,
 *                    or beyond the budget, are excluded.
 * @param maxMinutes  Drive-time budget in minutes.
 * @returns The best in-budget spot, or null if none are reachable.
 */
export function getBestReachableSpot<T extends HasScore>(
  spots: T[],
  driveTimes: Map<string, DriveMinutes>,
  maxMinutes: number
): T | null {
  const byScore = [...spots].sort((a, b) => b.score - a.score)

  for (const spot of byScore) {
    const minutes = driveTimes.get(spot.id)?.minutes
    if (minutes !== undefined && minutes <= maxMinutes) {
      return spot
    }
  }

  return null
}
