import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { useSurfData } from './hooks/useSurfData'
import { useAllDriveTimes } from './hooks/useDriveTime'
import { usePreferences } from './hooks/usePreferences'
import { useSpitcastForecasts } from './hooks/useSpitcast'
import { useMarineForecast, getForecastForDate } from './hooks/useMarineForecast'
import { useWeatherForecast, getWeatherForDate } from './hooks/useWeather'
import { WeatherBar } from './components/WeatherBar'
import { useDarkMode } from './hooks/useDarkMode'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { PullToRefreshIndicator } from './components/PullToRefresh'
import { useQueryClient } from '@tanstack/react-query'
import { SpotCard } from './components/SpotCard'
import { MapView, useUserLocation } from './components/MapView'
import { DateTabs, getDateForOption, formatDateDisplay, formatDateForAPI, getDateOptionForDate } from './components/DateTabs'
import { BestTimesGrid } from './components/BestTimesGrid'
import { BestReachableCard } from './components/BestReachableCard'
import { getRatingColor } from './lib/utils'
import { formatDriveTime } from './lib/api/osrm'
import { getConditionsQuality, getIdealWaveRange } from './lib/scoring'
import { SURF_SPOTS } from './lib/spots'

// Lazy load heavy modal components for better initial load
const TideCalendar = lazy(() => import('./components/TideCalendar').then(m => ({ default: m.TideCalendar })))
const WeekForecast = lazy(() => import('./components/WeekForecast').then(m => ({ default: m.WeekForecast })))
const SpotDetails = lazy(() => import('./components/SpotDetails').then(m => ({ default: m.SpotDetails })))

function App() {
  // Persisted preferences
  const {
    surferType,
    skillLevel,
    viewMode,
    sortMode,
    selectedDate,
    searchRadius,
    homeCoordinates,
    isLoaded,
    setSurferType,
    setSkillLevel,
    setViewMode,
    setSortMode,
    setSelectedDate,
    setSearchRadius,
    setHomeLocation,
  } = usePreferences()

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const { isDark, toggleDark } = useDarkMode()
  const queryClient = useQueryClient()

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await queryClient.invalidateQueries()
  }

  const { isPulling, isRefreshing, progress, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  })
  const [showTideCalendar, setShowTideCalendar] = useState(false)
  const [showWeekForecast, setShowWeekForecast] = useState(false)
  const [showSpotDetails, setShowSpotDetails] = useState(false)
  const [forecastSpot, setForecastSpot] = useState<typeof SURF_SPOTS[0] | null>(null)
  const [detailsSpot, setDetailsSpot] = useState<typeof SURF_SPOTS[0] | null>(null)

  // User location
  const {
    location: browserLocation,
    requestLocation,
    loading: locationLoading,
  } = useUserLocation()

  const userLocation = homeCoordinates || browserLocation

  useEffect(() => {
    if (browserLocation && !homeCoordinates) {
      setHomeLocation(browserLocation)
    }
  }, [browserLocation, homeCoordinates, setHomeLocation])

  // Convert selected date to API format (only for non-today dates)
  const dateForAPI = useMemo(() => {
    if (selectedDate === 'today') return undefined
    const date = getDateForOption(selectedDate)
    return formatDateForAPI(date)
  }, [selectedDate])

  // Fetch and score all spots
  const { spots, bestSpot, conditionsMap, tideDataMap, isLoading, isError, errors } = useSurfData({
    surferType,
    skillLevel,
    date: dateForAPI,
  })

  // Fetch drive times
  const { data: driveTimes, isLoading: driveTimesLoading } = useAllDriveTimes({
    userLocation,
  })

  // Fetch Spitcast forecasts for shape ratings
  const spitcastDate = getDateForOption(selectedDate)
  const spotIds = useMemo(() => SURF_SPOTS.map(s => s.id), [])
  const { forecastMap: spitcastMap, isLoading: spitcastLoading } = useSpitcastForecasts(spotIds, spitcastDate)

  // Fetch Open-Meteo marine forecast for wave predictions
  // Use Ocean Beach coordinates as representative for Bay Area
  const { data: marineForecast, isLoading: marineLoading } = useMarineForecast(37.76, -122.51, 7)

  // Get wave forecast for selected date
  const waveForecastForDate = useMemo(() => {
    if (!marineForecast) return null
    return getForecastForDate(marineForecast, spitcastDate)
  }, [marineForecast, spitcastDate])

  // Fetch weather forecast
  const { data: weatherForecast, isLoading: weatherLoading } = useWeatherForecast(37.76, -122.51, 7)
  const weatherForDate = useMemo(() => {
    return getWeatherForDate(weatherForecast, spitcastDate)
  }, [weatherForecast, spitcastDate])

  const idealRange = getIdealWaveRange(surferType, skillLevel)
  const isToday = selectedDate === 'today' || selectedDate === 'now'
  const isForecastLoading = spitcastLoading || marineLoading

  // Sort spots
  const sortedSpots = useMemo(() => {
    if (sortMode === 'distance' && driveTimes && driveTimes.size > 0) {
      return [...spots].sort((a, b) => {
        const aTime = driveTimes.get(a.id)?.minutes ?? Infinity
        const bTime = driveTimes.get(b.id)?.minutes ?? Infinity
        return aTime - bTime
      })
    }
    return spots
  }, [spots, sortMode, driveTimes])

  // Filter spots by search radius
  const filteredSpots = useMemo(() => {
    if (searchRadius === 'all' || !driveTimes || driveTimes.size === 0) {
      return sortedSpots
    }
    const maxMinutes = parseInt(searchRadius)
    return sortedSpots.filter((spot) => {
      const driveTime = driveTimes.get(spot.id)?.minutes
      return driveTime !== undefined && driveTime <= maxMinutes
    })
  }, [sortedSpots, searchRadius, driveTimes])

  // Prepare spots for map
  const mapSpots = useMemo(() => {
    return filteredSpots.map((spot) => ({
      id: spot.id,
      name: spot.name,
      region: spot.region,
      coordinates: spot.coordinates,
      score: spot.score,
      rating: spot.rating,
      waveHeight: conditionsMap.get(spot.id)?.waveHeight,
    }))
  }, [filteredSpots, conditionsMap])

  const handleSpotSelect = (spotId: string) => {
    setSelectedSpotId(spotId)
    if (viewMode === 'split') {
      const element = document.getElementById(`spot-${spotId}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleClearLocation = () => {
    setHomeLocation(undefined)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-[4px] bg-[#1A1C1E] flex items-center justify-center mx-auto wave-animation">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <path d="M0.5,15.5 C2,7 6,2.5 7.75,2.5 C9.5,2.5 11,14 12,14 C13,14 14.5,2.5 16.25,2.5 C18,2.5 22,7 23.5,15.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
              <line x1="0.5" y1="15.5" x2="23.5" y2="15.5" stroke="white" strokeWidth="1"/>
              <rect x="7" y="2.5" width="1.5" height="13" fill="white" rx="0.25"/>
              <rect x="5.25" y="5.5" width="5" height="0.75" fill="white"/>
              <rect x="5.25" y="9.25" width="5" height="0.75" fill="white"/>
              <rect x="15.5" y="2.5" width="1.5" height="13" fill="white" rx="0.25"/>
              <rect x="13.75" y="5.5" width="5" height="0.75" fill="white"/>
              <rect x="13.75" y="9.25" width="5" height="0.75" fill="white"/>
              <rect x="0" y="17" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.4"/>
              <rect x="2" y="19.5" width="20" height="1.25" rx="0.625" fill="white" fillOpacity="0.22"/>
              <rect x="5" y="22" width="14" height="1" rx="0.5" fill="white" fillOpacity="0.12"/>
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors">
      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        progress={progress}
        pullDistance={pullDistance}
      />

      {/* Header */}
      <header className="bg-white border-b border-[#1A1C1E]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-[#1A1C1E] flex items-center justify-center">
                {/* Golden Gate Bridge in fog */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  {/* Suspension cable */}
                  <path
                    d="M0.5,15.5 C2,7 6,2.5 7.75,2.5 C9.5,2.5 11,14 12,14 C13,14 14.5,2.5 16.25,2.5 C18,2.5 22,7 23.5,15.5"
                    stroke="white" strokeWidth="1" strokeLinecap="round"
                  />
                  {/* Road deck */}
                  <line x1="0.5" y1="15.5" x2="23.5" y2="15.5" stroke="white" strokeWidth="1"/>
                  {/* Left tower */}
                  <rect x="7" y="2.5" width="1.5" height="13" fill="white" rx="0.25"/>
                  {/* Left tower portal beams */}
                  <rect x="5.25" y="5.5" width="5" height="0.75" fill="white"/>
                  <rect x="5.25" y="9.25" width="5" height="0.75" fill="white"/>
                  {/* Right tower */}
                  <rect x="15.5" y="2.5" width="1.5" height="13" fill="white" rx="0.25"/>
                  {/* Right tower portal beams */}
                  <rect x="13.75" y="5.5" width="5" height="0.75" fill="white"/>
                  <rect x="13.75" y="9.25" width="5" height="0.75" fill="white"/>
                  {/* Fog wisps */}
                  <rect x="0" y="17" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.4"/>
                  <rect x="2" y="19.5" width="20" height="1.25" rx="0.625" fill="white" fillOpacity="0.22"/>
                  <rect x="5" y="22" width="14" height="1" rx="0.5" fill="white" fillOpacity="0.12"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1C1E]">
                  Bay Area Surf Almanac
                </h1>
                <p className="text-[#6C7278] text-sm mt-0.5 flex items-center gap-2 font-label">
                  {formatDateDisplay(selectedDate)}
                  {isForecastLoading && !isToday && (
                    <span className="inline-flex items-center gap-1 text-indigo-500">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs">forecast</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Date Tabs */}
            <DateTabs selected={selectedDate} onChange={setSelectedDate} />

            {/* View Toggle */}
            <div className="flex bg-[#EDE9E4] rounded-[4px] p-1 gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-[2px] text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-[#1A1C1E]'
                    : 'text-[#6C7278] hover:text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-[2px] text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'map'
                    ? 'bg-white text-[#1A1C1E]'
                    : 'text-[#6C7278] hover:text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-[2px] text-sm font-medium transition-all hidden md:flex items-center gap-1.5 ${
                  viewMode === 'split'
                    ? 'bg-white text-[#1A1C1E]'
                    : 'text-[#6C7278] hover:text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                Split
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-[2px] bg-[#EDE9E4] text-[#6C7278] hover:bg-[#1A1C1E] hover:text-white transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Weather Bar */}
        <WeatherBar
          weather={weatherForecast}
          dayWeather={weatherForDate}
          isLoading={weatherLoading}
        />

        {/* Forecast Notice for Future Dates */}
        {!isToday && (
          <div className="bg-white border border-[#1A1C1E]/10 rounded-[4px] px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-[#B8422E]">📊</span>
            <p className="text-sm text-[#1A1C1E]">
              <strong>Forecast Mode:</strong> Showing predicted waves from Open-Meteo and tide predictions for <strong>{formatDateDisplay(selectedDate)}</strong>.
              {waveForecastForDate && (
                <span className="ml-1 text-[#B8422E]">
                  Expected {waveForecastForDate.minWaveHeight.toFixed(0)}-{waveForecastForDate.maxWaveHeight.toFixed(0)}ft waves.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Preferences Bar */}
        <div className="bg-white rounded-[8px] p-4 mb-6 border border-[#1A1C1E]/10">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-[#6C7278] mb-1 font-label uppercase tracking-widest">
                Board
              </label>
              <select
                value={surferType}
                onChange={(e) => setSurferType(e.target.value as typeof surferType)}
                className="px-3 py-2 border border-[#1A1C1E]/20 rounded-[4px] text-sm bg-white text-[#1A1C1E] focus:outline-none"
              >
                <option value="longboard">Longboard</option>
                <option value="mediumboard">Mid-length</option>
                <option value="shortboard">Shortboard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6C7278] mb-1 font-label uppercase tracking-widest">
                Level
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as typeof skillLevel)}
                className="px-3 py-2 border border-[#1A1C1E]/20 rounded-[4px] text-sm bg-white text-[#1A1C1E] focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="advanced">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Sort Mode */}
            {userLocation && driveTimes && driveTimes.size > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#6C7278] mb-1 font-label uppercase tracking-widest">
                  Sort by
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                  className="px-3 py-2 border border-[#1A1C1E]/20 rounded-[4px] text-sm bg-white text-[#1A1C1E] focus:outline-none"
                >
                  <option value="score">Best Conditions</option>
                  <option value="distance">Nearest</option>
                </select>
              </div>
            )}

            {/* Search Radius Filter */}
            {userLocation && driveTimes && driveTimes.size > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#6C7278] mb-1 font-label uppercase tracking-widest">
                  Max Distance
                </label>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value as typeof searchRadius)}
                  className="px-3 py-2 border border-[#1A1C1E]/20 rounded-[4px] text-sm bg-white text-[#1A1C1E] focus:outline-none"
                >
                  <option value="all">All spots</option>
                  <option value="15">Within 15 min</option>
                  <option value="30">Within 30 min</option>
                  <option value="45">Within 45 min</option>
                  <option value="60">Within 1 hour</option>
                </select>
              </div>
            )}

            {/* Forecast & Calendar Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setForecastSpot(bestSpot ? SURF_SPOTS.find(s => s.id === bestSpot.id) || SURF_SPOTS[0] : SURF_SPOTS[0])
                  setShowWeekForecast(true)
                }}
                className="px-3 py-2 text-sm bg-[#F7F5F2] text-[#1A1C1E] hover:bg-[#EDE9E4] rounded-[4px] transition-colors flex items-center gap-1.5 border border-[#1A1C1E]/15"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                7-Day
              </button>
              <button
                onClick={() => setShowTideCalendar(true)}
                className="px-3 py-2 text-sm bg-[#F7F5F2] text-[#1A1C1E] hover:bg-[#EDE9E4] rounded-[4px] transition-colors flex items-center gap-1.5 border border-[#1A1C1E]/15"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tides
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-[#6C7278] font-label">
                Ideal: {idealRange.min}-{idealRange.max}ft
              </span>
              {userLocation ? (
                <div className="flex items-center gap-1">
                  <span className="px-3 py-2 text-sm bg-[#F7F5F2] text-[#1A1C1E] rounded-[4px] flex items-center gap-1.5 border border-[#1A1C1E]/15">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Location saved
                  </span>
                  <button
                    onClick={handleClearLocation}
                    className="p-2 text-sm text-[#6C7278] hover:text-[#1A1C1E] hover:bg-[#EDE9E4] rounded-[2px] transition-colors"
                    title="Clear saved location"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="px-4 py-2 text-sm text-[#1A1C1E] bg-[#F7F5F2] hover:bg-[#EDE9E4] rounded-[4px] transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-[#1A1C1E]/15"
                >
                  {locationLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Locating...
                    </>
                  ) : driveTimesLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Use my location
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-[4px] bg-[#1A1C1E] flex items-center justify-center mx-auto wave-animation">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M0.5,15.5 C2,7 6,2.5 7.75,2.5 C9.5,2.5 11,14 12,14 C13,14 14.5,2.5 16.25,2.5 C18,2.5 22,7 23.5,15.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                    <line x1="0.5" y1="15.5" x2="23.5" y2="15.5" stroke="white" strokeWidth="1"/>
                    <rect x="7" y="2.5" width="1.5" height="13" fill="white" rx="0.25"/>
                    <rect x="5.25" y="5.5" width="5" height="0.75" fill="white"/>
                    <rect x="5.25" y="9.25" width="5" height="0.75" fill="white"/>
                    <rect x="15.5" y="2.5" width="1.5" height="13" fill="white" rx="0.25"/>
                    <rect x="13.75" y="5.5" width="5" height="0.75" fill="white"/>
                    <rect x="13.75" y="9.25" width="5" height="0.75" fill="white"/>
                    <rect x="0" y="17" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.4"/>
                    <rect x="2" y="19.5" width="20" height="1.25" rx="0.625" fill="white" fillOpacity="0.22"/>
                    <rect x="5" y="22" width="14" height="1" rx="0.5" fill="white" fillOpacity="0.12"/>
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-[#1A1C1E] font-medium">
                {isToday ? 'Checking the waves' : 'Loading forecast'}...
              </p>
              <p className="text-sm text-[#6C7278] mt-1 font-label">
                Fetching buoy & tide data
              </p>
            </div>
          </div>
        ) : isError ? (
          <div className="bg-white border border-[#ef4444]/30 rounded-[8px] p-4">
            <p className="text-red-600 font-medium">Error loading surf data</p>
            {errors.map((err, i) => (
              <p key={i} className="text-red-500 text-sm mt-1">{err?.message}</p>
            ))}
          </div>
        ) : (
          <>
            {/* Best Spot Banner */}
            {bestSpot && viewMode !== 'map' && (
              <div
                className="rounded-[8px] p-5 text-white mb-6 cursor-pointer transition-all duration-300 relative overflow-hidden"
                style={{ backgroundColor: getRatingColor(bestSpot.rating) }}
                onClick={() => handleSpotSelect(bestSpot.id)}
              >
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-sm opacity-80 mb-1 flex items-center gap-2 font-label uppercase tracking-widest">
                      <span className="inline-block w-1.5 h-1.5 bg-white"></span>
                      {isToday ? 'Best spot for you right now' : `Best spot for ${formatDateDisplay(selectedDate)}`}
                    </p>
                    <h2 className="text-2xl font-bold">{bestSpot.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm opacity-90">{bestSpot.region}</span>
                      {driveTimes?.get(bestSpot.id) && (
                        <>
                          <span className="opacity-60">•</span>
                          <span className="text-sm opacity-90">
                            {formatDriveTime(driveTimes.get(bestSpot.id)!.minutes)} drive
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{bestSpot.score}</div>
                    <div className="text-sm opacity-90">{getConditionsQuality(bestSpot.score)}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm opacity-90 line-clamp-2">{bestSpot.breakdown}</p>
              </div>
            )}

            {/* Best spot reachable within a drive-time budget */}
            {viewMode !== 'map' && userLocation && driveTimes && driveTimes.size > 0 && (
              <BestReachableCard
                spots={spots}
                driveTimes={driveTimes}
                onSelect={handleSpotSelect}
              />
            )}

            {/* Best Times Grid - shows optimal surf windows for all locations */}
            {viewMode === 'list' && filteredSpots.length > 0 && (
              <BestTimesGrid
                spots={filteredSpots}
                tideDataMap={tideDataMap}
                driveTimesMap={driveTimes}
                selectedDate={getDateForOption(selectedDate)}
                dateLabel={formatDateDisplay(selectedDate)}
                onSpotClick={handleSpotSelect}
              />
            )}

            {/* Main Content Area */}
            <div className={viewMode === 'split' ? 'grid grid-cols-2 gap-6' : ''}>
              {/* Map View */}
              {(viewMode === 'map' || viewMode === 'split') && (
                <div className={viewMode === 'map' ? 'mb-6' : ''}>
                  <div className="bg-white rounded-[8px] border border-[#1A1C1E]/10 overflow-hidden">
                    <MapView
                      spots={mapSpots}
                      userLocation={userLocation ?? undefined}
                      onSpotClick={handleSpotSelect}
                      selectedSpotId={selectedSpotId ?? undefined}
                      height={viewMode === 'map' ? 500 : 400}
                    />
                  </div>

                  {/* Map Legend */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#6C7278] font-label">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2d9c6e' }}></span> Excellent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Good
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Fair
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Poor
                    </span>
                  </div>
                </div>
              )}

              {/* List View */}
              {(viewMode === 'list' || viewMode === 'split') && (
                <div className={viewMode === 'split' ? 'max-h-[600px] overflow-y-auto pr-2' : ''}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#1A1C1E]">
                      {sortMode === 'distance' ? 'Nearest Spots' : 'All Spots Ranked'}
                      {searchRadius !== 'all' && ` (within ${searchRadius} min)`}
                    </h2>
                    <span className="text-sm text-[#6C7278] font-label">
                      {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {filteredSpots.length === 0 ? (
                      <div className="bg-[#F7F5F2] border border-[#1A1C1E]/10 rounded-[8px] p-6 text-center">
                        <p className="text-[#1A1C1E] font-medium">No spots within {searchRadius} minutes</p>
                        <p className="text-[#6C7278] text-sm mt-1">
                          Try increasing the distance or selecting "All spots"
                        </p>
                        <button
                          onClick={() => setSearchRadius('all')}
                          className="mt-3 px-4 py-2 bg-[#1A1C1E] text-white rounded-[4px] text-sm font-medium hover:bg-[#B8422E] transition-colors"
                        >
                          Show all spots
                        </button>
                      </div>
                    ) : (
                      filteredSpots.map((spot, index) => (
                        <div
                          key={spot.id}
                          id={`spot-${spot.id}`}
                          className={selectedSpotId === spot.id ? 'outline outline-2 outline-[#B8422E] rounded-[8px]' : ''}
                        >
                          <SpotCard
                            spot={spot}
                            rank={index + 1}
                            conditions={conditionsMap.get(spot.id)}
                            tideData={tideDataMap.get(spot.id)}
                            driveTimeMinutes={driveTimes?.get(spot.id)?.minutes}
                            spitcastForecast={spitcastMap.get(spot.id)}
                            waveForecast={!isToday ? waveForecastForDate : null}
                            isForecasting={isForecastLoading}
                            onSelect={() => handleSpotSelect(spot.id)}
                            onViewDetails={() => {
                              const fullSpot = SURF_SPOTS.find(s => s.id === spot.id)
                              if (fullSpot) {
                                setDetailsSpot(fullSpot)
                                setShowSpotDetails(true)
                              }
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Source Attribution */}
            <div className="text-center py-8 mt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#EDE9E4] text-xs text-[#6C7278] font-label">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Waves from NOAA NDBC & Open-Meteo • Tides from NOAA CO-OPS • Shape from Spitcast • Routes from OSRM
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal Loading Fallback */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-[8px] p-6 border border-[#1A1C1E]/10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1C1E] mx-auto"></div>
            <p className="mt-3 text-[#6C7278] text-sm font-label">Loading...</p>
          </div>
        </div>
      }>
        {/* Tide Calendar Modal */}
        {showTideCalendar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <TideCalendar
              stationId="9414290"
              stationName="San Francisco (Fort Point)"
              onClose={() => setShowTideCalendar(false)}
              onSelectDate={(date) => {
                const dateOption = getDateOptionForDate(date)
                if (dateOption) {
                  setSelectedDate(dateOption)
                }
                setShowTideCalendar(false)
              }}
            />
          </div>
        )}

        {/* Week Forecast Modal */}
        {showWeekForecast && forecastSpot && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <WeekForecast
              spot={forecastSpot}
              currentBuoyData={conditionsMap.get(forecastSpot.id) ? {
                timestamp: new Date(),
                waveHeight: conditionsMap.get(forecastSpot.id)!.waveHeight,
                wavePeriod: conditionsMap.get(forecastSpot.id)!.wavePeriod,
                waveDirection: conditionsMap.get(forecastSpot.id)!.swellDirection,
                windSpeed: conditionsMap.get(forecastSpot.id)!.windSpeed,
                windDirection: conditionsMap.get(forecastSpot.id)!.windDirection,
                waterTemp: 55,
                airTemp: 60,
              } : null}
              onClose={() => setShowWeekForecast(false)}
              onSelectDate={(date) => {
                const dateOption = getDateOptionForDate(date)
                if (dateOption) {
                  setSelectedDate(dateOption)
                }
                setShowWeekForecast(false)
              }}
            />
          </div>
        )}

        {/* Spot Details Modal */}
        {showSpotDetails && detailsSpot && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <SpotDetails
              spot={detailsSpot}
              conditions={conditionsMap.get(detailsSpot.id)}
              score={sortedSpots.find(s => s.id === detailsSpot.id)?.score}
              date={getDateForOption(selectedDate)}
              onClose={() => setShowSpotDetails(false)}
            />
          </div>
        )}
      </Suspense>
    </div>
  )
}

export default App
