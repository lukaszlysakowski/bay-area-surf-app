interface PullToRefreshIndicatorProps {
  isPulling: boolean
  isRefreshing: boolean
  progress: number
  pullDistance: number
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  progress,
  pullDistance,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullDistance - 40, 60)}px)`,
        opacity: Math.min(progress * 2, 1),
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-lg border border-gray-200 dark:border-slate-600">
        {isRefreshing ? (
          <svg
            className="w-6 h-6 text-cyan-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 text-cyan-500 transition-transform"
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
