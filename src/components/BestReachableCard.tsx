import { useState } from 'react'
import { getBestReachableSpot } from '../lib/reachable'
import { getRatingColor } from '../lib/utils'
import { formatDriveTime } from '../lib/api/osrm'

interface ReachableSpot {
  id: string
  name: string
  region: string
  score: number
  rating: string
}

interface DriveTime {
  minutes: number
}

interface BestReachableCardProps {
  spots: ReachableSpot[]
  driveTimes: Map<string, DriveTime>
  onSelect: (id: string) => void
}

const BUDGETS = [15, 30, 45, 60] as const

/**
 * "Best spot I can actually get to soon" — the highest-scored spot within a
 * chosen drive-time budget. Complements the overall best-spot banner, which
 * ignores travel time.
 */
export function BestReachableCard({ spots, driveTimes, onSelect }: BestReachableCardProps) {
  const [maxMinutes, setMaxMinutes] = useState(30)
  const best = getBestReachableSpot(spots, driveTimes, maxMinutes)
  const minutes = best ? driveTimes.get(best.id)?.minutes : undefined

  return (
    <div className="bg-white border border-[#1A1C1E]/10 rounded-[8px] p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-label uppercase tracking-widest text-xs text-[#6C7278]">
          Best within a drive
        </p>
        <div className="flex gap-1 bg-[#EDE9E4] rounded-[4px] p-0.5">
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => setMaxMinutes(b)}
              className={`px-2.5 py-1 rounded-[2px] text-xs font-medium transition-colors ${
                maxMinutes === b
                  ? 'bg-white text-[#1A1C1E]'
                  : 'text-[#6C7278] hover:text-[#1A1C1E]'
              }`}
            >
              {b}m
            </button>
          ))}
        </div>
      </div>

      {best ? (
        <button
          onClick={() => onSelect(best.id)}
          className="w-full flex items-center justify-between gap-3 text-left group"
        >
          <div className="min-w-0">
            <h3 className="font-[Fraunces,serif] text-xl text-[#1A1C1E] truncate group-hover:text-[#B8422E] transition-colors">
              {best.name}
            </h3>
            <p className="text-sm text-[#6C7278] font-label">
              {best.region}
              {minutes !== undefined && (
                <>
                  {' · '}
                  <span className="text-[#1A1C1E]">{formatDriveTime(minutes)} away</span>
                </>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold" style={{ color: getRatingColor(best.rating) }}>
              {best.score}
            </div>
            <div className="text-xs text-[#6C7278] font-label">{best.rating}</div>
          </div>
        </button>
      ) : (
        <p className="text-sm text-[#6C7278]">
          No spots within a {maxMinutes}-minute drive — try a longer budget.
        </p>
      )}
    </div>
  )
}
