import { useState, useMemo, useEffect } from 'react'
import { useSurfData } from './hooks/useSurfData'
import { useAllDriveTimes } from './hooks/useDriveTime'
import { usePreferences } from './hooks/usePreferences'
import { SpotCard } from './components/SpotCard'
import { MapView, useUserLocation } from './components/MapView'
import { DateTabs, getDateForOption, formatDateDisplay, formatDateForAPI } from './components/DateTabs'
import { TideCalendar } from './components/TideCalendar'
import { WeekForecast } from './components/WeekForecast'
import { getRatingColor } from './lib/utils'
import { formatDriveTime } from './lib/api/osrm'
import { getConditionsQuality, getIdealWaveRange } from './lib/scoring'
import { SURF_SPOTS } from './lib/spots'

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
  const [showTideCalendar, setShowTideCalendar] = useState(false)
  const [showWeekForecast, setShowWeekForecast] = useState(false)
  const [forecastSpot, setForecastSpot] = useState<typeof SURF_SPOTS[0] | null>(null)

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

  const idealRange = getIdealWaveRange(surferType, skillLevel)
  const isToday = selectedDate === 'today'

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
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mx-auto wave-animation">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-cyan-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent font-[Outfit]">
                  Bay Area Surf Almanac
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {formatDateDisplay(selectedDate)}
                </p>
              </div>
            </div>

            {/* Date Tabs */}
            <DateTabs selected={selectedDate} onChange={setSelectedDate} />

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all hidden md:flex items-center gap-1.5 ${
                  viewMode === 'split'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                Split
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Forecast Notice for Future Dates */}
        {!isToday && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-amber-600">⚠️</span>
            <p className="text-sm text-amber-800">
              <strong>Forecast:</strong> Wave data is current (real-time from buoys).
              Tide predictions shown are for <strong>{formatDateDisplay(selectedDate)}</strong>.
            </p>
          </div>
        )}

        {/* Preferences Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100/80">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Board
              </label>
              <select
                value={surferType}
                onChange={(e) => setSurferType(e.target.value as typeof surferType)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="longboard">Longboard</option>
                <option value="mediumboard">Mid-length</option>
                <option value="shortboard">Shortboard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Level
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as typeof skillLevel)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="beginner">Beginner</option>
                <option value="advanced">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Sort Mode */}
            {userLocation && driveTimes && driveTimes.size > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Sort by
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="score">Best Conditions</option>
                  <option value="distance">Nearest</option>
                </select>
              </div>
            )}

            {/* Search Radius Filter */}
            {userLocation && driveTimes && driveTimes.size > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Max Distance
                </label>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value as typeof searchRadius)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 border border-indigo-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                7-Day
              </button>
              <button
                onClick={() => setShowTideCalendar(true)}
                className="px-3 py-2 text-sm bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg transition-colors flex items-center gap-1.5 border border-cyan-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tides
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">
                Ideal: {idealRange.min}-{idealRange.max}ft
              </span>
              {userLocation ? (
                <div className="flex items-center gap-1">
                  <span className="px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-1.5 border border-emerald-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Location saved
                  </span>
                  <button
                    onClick={handleClearLocation}
                    className="p-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="px-4 py-2 text-sm text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-cyan-100"
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mx-auto">
                  <svg className="w-8 h-8 text-white wave-animation" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">
                {isToday ? 'Checking the waves' : 'Loading forecast'}...
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Fetching buoy & tide data
              </p>
            </div>
          </div>
        ) : isError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
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
                className="rounded-2xl p-5 text-white mb-6 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${getRatingColor(bestSpot.rating)} 0%, ${getRatingColor(bestSpot.rating)}dd 100%)`,
                }}
                onClick={() => handleSpotSelect(bestSpot.id)}
              >
                {/* Decorative wave pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <path d="M0,100 Q50,50 100,100 T200,100 T300,100" fill="none" stroke="white" strokeWidth="40" />
                    <path d="M0,150 Q50,100 100,150 T200,150 T300,150" fill="none" stroke="white" strokeWidth="30" />
                  </svg>
                </div>
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-sm opacity-90 mb-1 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      {isToday ? 'Best spot for you right now' : `Best spot for ${formatDateDisplay(selectedDate)}`}
                    </p>
                    <h2 className="text-2xl font-bold font-[Outfit] drop-shadow-sm">{bestSpot.name}</h2>
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

            {/* Main Content Area */}
            <div className={viewMode === 'split' ? 'grid grid-cols-2 gap-6' : ''}>
              {/* Map View */}
              {(viewMode === 'map' || viewMode === 'split') && (
                <div className={viewMode === 'map' ? 'mb-6' : ''}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <MapView
                      spots={mapSpots}
                      userLocation={userLocation ?? undefined}
                      onSpotClick={handleSpotSelect}
                      selectedSpotId={selectedSpotId ?? undefined}
                      height={viewMode === 'map' ? 500 : 400}
                    />
                  </div>

                  {/* Map Legend */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Excellent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span> Good
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span> Fair
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span> Poor
                    </span>
                  </div>
                </div>
              )}

              {/* List View */}
              {(viewMode === 'list' || viewMode === 'split') && (
                <div className={viewMode === 'split' ? 'max-h-[600px] overflow-y-auto pr-2' : ''}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {sortMode === 'distance' ? 'Nearest Spots' : 'All Spots Ranked'}
                      {searchRadius !== 'all' && ` (within ${searchRadius} min)`}
                    </h2>
                    <span className="text-sm text-gray-500">
                      {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {filteredSpots.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                        <p className="text-gray-600 font-medium">No spots within {searchRadius} minutes</p>
                        <p className="text-gray-500 text-sm mt-1">
                          Try increasing the distance or selecting "All spots"
                        </p>
                        <button
                          onClick={() => setSearchRadius('all')}
                          className="mt-3 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors"
                        >
                          Show all spots
                        </button>
                      </div>
                    ) : (
                      filteredSpots.map((spot, index) => (
                        <div
                          key={spot.id}
                          id={`spot-${spot.id}`}
                          className={selectedSpotId === spot.id ? 'ring-2 ring-cyan-500 rounded-xl' : ''}
                        >
                          <SpotCard
                            spot={spot}
                            rank={index + 1}
                            conditions={conditionsMap.get(spot.id)}
                            tideData={tideDataMap.get(spot.id)}
                            driveTimeMinutes={driveTimes?.get(spot.id)?.minutes}
                            onSelect={() => handleSpotSelect(spot.id)}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100/80 text-xs text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wave data from NOAA NDBC • Tides from NOAA CO-OPS • Routes from OSRM
              </div>
            </div>
          </>
        )}
      </main>

      {/* Tide Calendar Modal */}
      {showTideCalendar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <TideCalendar
            stationId="9414290"
            stationName="San Francisco (Fort Point)"
            onClose={() => setShowTideCalendar(false)}
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
          />
        </div>
      )}
    </div>
  )
}

export default App
