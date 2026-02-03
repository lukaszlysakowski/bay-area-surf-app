import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
  }, [disabled])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 0) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Apply resistance (gets harder to pull as you go)
      const distance = Math.min(diff * 0.5, threshold * 1.5)
      setPullDistance(distance)
      setIsPulling(true)

      // Prevent default scroll when pulling down
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }, [disabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPulling) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setIsPulling(false)
    setPullDistance(0)
  }, [disabled, isPulling, pullDistance, threshold, onRefresh])

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: false }

    document.addEventListener('touchstart', handleTouchStart, options)
    document.addEventListener('touchmove', handleTouchMove, options)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(pullDistance / threshold, 1)

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
  }
}
