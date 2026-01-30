import { useState, useEffect, useCallback } from 'react'
import type { SurfPreferences } from '../types'

const STORAGE_KEY = 'surfPreferences'

type DateOption = 'today' | 'tomorrow' | 'friday' | 'saturday' | 'sunday'

type RadiusOption = 'all' | '15' | '30' | '45' | '60'

type StoredPreferences = {
  surferType: SurfPreferences['surferType']
  skillLevel: SurfPreferences['skillLevel']
  homeCoordinates?: { lat: number; lng: number }
  viewMode: 'list' | 'map' | 'split'
  sortMode: 'score' | 'distance'
  selectedDate: DateOption
  searchRadius: RadiusOption
}

const DEFAULT_PREFERENCES: StoredPreferences = {
  surferType: 'mediumboard',
  skillLevel: 'advanced',
  viewMode: 'list',
  sortMode: 'score',
  selectedDate: 'today',
  searchRadius: 'all',
}

/**
 * Hook for persisting user preferences to localStorage
 */
export function usePreferences() {
  const [preferences, setPreferencesState] = useState<StoredPreferences>(() => {
    // Load from localStorage on initial render
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_PREFERENCES, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load preferences:', e)
    }
    return DEFAULT_PREFERENCES
  })

  const [isLoaded, setIsLoaded] = useState(false)

  // Mark as loaded after hydration
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever preferences change
  useEffect(() => {
    if (!isLoaded) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (e) {
      console.error('Failed to save preferences:', e)
    }
  }, [preferences, isLoaded])

  // Update a single preference
  const setPreference = useCallback(<K extends keyof StoredPreferences>(
    key: K,
    value: StoredPreferences[K]
  ) => {
    setPreferencesState((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Update multiple preferences at once
  const setPreferences = useCallback((updates: Partial<StoredPreferences>) => {
    setPreferencesState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear preferences:', e)
    }
  }, [])

  // Save home location
  const setHomeLocation = useCallback((coords: { lat: number; lng: number } | undefined) => {
    setPreferencesState((prev) => ({ ...prev, homeCoordinates: coords }))
  }, [])

  return {
    ...preferences,
    isLoaded,
    setPreference,
    setPreferences,
    resetPreferences,
    setHomeLocation,

    // Convenience setters
    setSurferType: (value: SurfPreferences['surferType']) => setPreference('surferType', value),
    setSkillLevel: (value: SurfPreferences['skillLevel']) => setPreference('skillLevel', value),
    setViewMode: (value: 'list' | 'map' | 'split') => setPreference('viewMode', value),
    setSortMode: (value: 'score' | 'distance') => setPreference('sortMode', value),
    setSelectedDate: (value: DateOption) => setPreference('selectedDate', value),
    setSearchRadius: (value: RadiusOption) => setPreference('searchRadius', value),
  }
}

export type { DateOption, RadiusOption }

/**
 * Hook for persisting a single value to localStorage
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue

    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error(`Failed to load ${key}:`, e)
    }
    return defaultValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error(`Failed to save ${key}:`, e)
    }
  }, [key, value])

  return [value, setValue]
}
